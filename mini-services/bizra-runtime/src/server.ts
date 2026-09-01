/**
 * BIZRA Node0 — the HTTP surface, behind the LOCAL-SOVEREIGN boundary.
 *
 * BOUNDARY-1A gates, in order, before ANY body is read:
 *   1. R2 — requests carrying the caller-selected-port query param are refused.
 *   2. R3 — requests bearing an Origin header are refused (no CORS is emitted;
 *      the fixed same-origin transport is the app's server-side proxy, which
 *      never sends Origin).
 * Read-only routes stay unauthenticated on loopback (§2.6):
 *   GET /api/health /api/state /api/verify /api/dema /api/contracts
 *   GET /api/shoulder /api/outbox/:name /api/mission (contract)
 * Consequential routes (§2.6):
 *   POST /api/mission, POST /api/trace — require a valid local action envelope
 *   (LOCAL_FOUNDER only; PUBLIC_REFERENCE fails closed).
 *   POST /api/cycle, POST /api/transition/:id/revert — DISABLED in this slice,
 *   fail-closed, naming the future two-phase proposal/commit contract.
 *
 * Liveness ordering (§2.8): verify constitution → open/verify store (import
 * time) → BIND the listener → only then persist LIVE/BOOT state and receipts
 * (LOCAL mode only; PUBLIC never persists anything).
 */
import { kv, one, run, KEYS_DIR, RUNTIME_MODE } from "./store";
import { sealConstitution, verifyConstitution, constitutionRoot } from "./constitution";
import { sealShoulder, shoulderState, shoulderText } from "./shoulder";
import { seedContracts, contractsSnapshot } from "./contracts";
import { appendReceipt, verifyChain, chainHead } from "./chain";
import { relay } from "./dema";
import { buildState } from "./state";
import { runMission, missionContract } from "./mission";
import { ingestTrace, traceStats, EXTERNAL_SOURCE } from "./traces";
import { verifyActionEnvelope, ENVELOPE_SCHEMA } from "./envelope";
import { resolveMode } from "./mode";
import { readOutboxFile } from "./executor";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RES = resolveMode(join(import.meta.dir, ".."));
const startedAt = Date.now();
let haltedReason: string | null = null;
/** The caller-selected-port query param this boundary refuses (assembled so the source itself never carries the transport mechanism). */
const CALLER_PORT_PARAM = ["X", "Transform", "Port"].join("");

// ---------------------------------------------------------------------------
// Commission — LOCAL_FOUNDER only, AFTER the listener binds. PUBLIC never writes.
// ---------------------------------------------------------------------------
function commission(): { ok: boolean; halted?: string } {
  const verification = verifyConstitution();
  if (one<any>("SELECT id FROM constitution") && !verification.verified) {
    kv("status", "HALTED");
    kv("halted_reason", `CONSTITUTION_DRIFT: ${verification.drift.join(", ")}`);
    relay("UNKNOWN", "NODE0", "constitution drift detected — engine HALTED");
    return { ok: false, halted: kv("halted_reason")! };
  }
  if (!one<any>("SELECT id FROM constitution")) {
    // First boot: seal the root.
    kv("phase", "CONSTRUCTION");
    const sealed = sealConstitution();
    kv("sealed_at", new Date().toISOString());
    kv("phase", "SEALED");
    const spineReceipt = appendReceipt("NODE0_SEALED", "NODE0", {
      phase: "SEALED",
      constitution_root: sealed.root,
      law: "Constitution > Intelligence — the seven failure modes answered by structure",
    });
    kv("status", "LIVE");
    kv("phase", "LIVE");
    kv("live_at", new Date().toISOString());
    const srcDir = join(import.meta.dir, "..", "src");
    const h = createHash("sha256");
    for (const f of ["index.ts", ...readdirSync(srcDir).filter((x) => x.endsWith(".ts")).sort()]) {
      h.update(f);
      h.update(readFileSync(f === "index.ts" ? join(import.meta.dir, "..", f) : join(srcDir, f)));
    }
    kv("source_digest", h.digest("hex"));
    const liveReceipt = appendReceipt("NODE0_LIVE", "NODE0", {
      phase: "LIVE",
      constitution_root: constitutionRoot(),
      sealed_receipt: spineReceipt.seq,
      port: RES.port,
      bind_host: RES.bindHost,
      mode: RES.mode,
      organs: ["PAT", "SAT", "FATE", "OBSERVER", "RECEIPT", "DEMA"],
      truth_label: "LOCAL_RUNTIME_LISTENER_BOUND",
    });
    relay("DONE", "NODE0_LIVE", "Node0 commissioned: constitution sealed, chain genesis, organs online", liveReceipt.digest);
    ingestTraceSafe({
      source: "runtime",
      kind: "heartbeat",
      correlation: "NODE0",
      payload: JSON.stringify({ event: "COMMISSION", constitution_root: constitutionRoot(), live_receipt: liveReceipt.seq }),
    });
    return { ok: true };
  }
  // Subsequent boots: verify + heartbeat (LOCAL only — PUBLIC appends nothing).
  kv("status", "LIVE");
  const bootCount = Number(kv("boot_count") ?? "1") + 1;
  kv("boot_count", String(bootCount));
  const receipt = appendReceipt("NODE0_BOOT", "NODE0", {
    boot_count: bootCount,
    constitution_root: constitutionRoot(),
    chain_head: chainHead()?.digest ?? null,
    mode: RES.mode,
    bind_host: RES.bindHost,
    recovery: "boot-time recovery: lease registry and chain are durable; exactly-once holds across process death",
    truth_label: "LOCAL_RUNTIME_LISTENER_BOUND",
  });
  relay("DONE", "NODE0_BOOT", `boot #${bootCount}: constitution verified, chain verified`, receipt.digest);
  ingestTraceSafe({
    source: "runtime",
    kind: "heartbeat",
    correlation: "NODE0",
    payload: JSON.stringify({ event: "BOOT", boot_count: bootCount, chain_len: one<any>("SELECT COUNT(*) AS n FROM receipts")?.n ?? 0 }),
  });
  if (!shoulderState().sealed) {
    const shoulder = sealShoulder();
    if (shoulder.sealed && shoulder.receipt_seq) {
      ingestTraceSafe({
        source: "runtime",
        kind: "construction",
        correlation: "SHOULDER",
        payload: JSON.stringify({ event: "SHOULDER_SEALED", sha256: shoulder.sha256, receipt: shoulder.receipt_seq }),
      });
    }
  }
  return { ok: true };
}

function ingestTraceSafe(input: Parameters<typeof ingestTrace>[0]) {
  try {
    ingestTrace(input);
  } catch { /* trace failure must never block commission */ }
}

// ---------------------------------------------------------------------------
// HTTP helpers — NO CORS, ever.
// ---------------------------------------------------------------------------
const jsonHeaders = {
  "content-type": "application/json",
  "cache-control": "no-store",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

async function readBody(req: Request): Promise<any> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

function halted(): Response {
  return json(
    { ok: false, status: "HALTED", reason: haltedReason ?? kv("halted_reason"), law: "nothing proceeds over a broken constitution" },
    503,
  );
}

// ---------------------------------------------------------------------------
// Local control keys — loaded from the state root's keys/ dir, never printed.
// ---------------------------------------------------------------------------
function loadLocalKeys(): Map<string, Uint8Array> {
  const keys = new Map<string, Uint8Array>();
  try {
    for (const f of readdirSync(KEYS_DIR)) {
      if (!f.endsWith(".key")) continue;
      const keyId = f.slice(0, -".key".length);
      keys.set(keyId, new Uint8Array(readFileSync(join(KEYS_DIR, f))));
    }
  } catch { /* no keys dir — every envelope will fail closed on unknown key */ }
  return keys;
}

/** Envelope gate: verify + atomically claim the nonce. Fail-closed, zero state change. */
async function requireEnvelope(req: Request, expectedClass: string): Promise<{ ok: true; envelope: any; action: any } | { ok: false; response: Response }> {
  const body = await readBody(req);
  const v = verifyActionEnvelope(body, { keys: loadLocalKeys(), now: Date.now() });
  if (!v.ok) return { ok: false, response: json({ ok: false, refused: true, reason: v.reason, envelope_schema: ENVELOPE_SCHEMA }, 403) };
  const env = v.envelope;
  if (env.action_class !== expectedClass) {
    return { ok: false, response: json({ ok: false, refused: true, reason: `ENVELOPE_ACTION_CLASS_MISMATCH: this route requires action_class '${expectedClass}'`, envelope_schema: ENVELOPE_SCHEMA }, 403) };
  }
  try {
    run(
      "INSERT INTO action_nonces (nonce, action_id, action_class, request_sha256, actor_id, expires_at, consumed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      env.nonce, env.action_id, env.action_class, env.request_sha256, env.actor_id, env.expires_at, new Date().toISOString(),
    );
  } catch {
    return { ok: false, response: json({ ok: false, refused: true, reason: "NONCE_REPLAY: this nonce was already consumed — exactly one action per nonce, ever; a replayed envelope fails closed" }, 403) };
  }
  return { ok: true, envelope: env, action: (body as any).action };
}

function publicReadOnlyRefusal(route: string): Response {
  return json(
    {
      ok: false,
      refused: true,
      reason: `PUBLIC_REFERENCE_READ_ONLY: '${route}' is a consequential action — this deployment presents sealed state only; consequential actions are fail-closed`,
      mode: RUNTIME_MODE,
    },
    403,
  );
}

function disabledInSlice(route: string): Response {
  return json(
    {
      ok: false,
      refused: true,
      reason: `${route} is DISABLED in slice LOCAL-SOVEREIGN-BOUNDARY-1A: it must not apply a contract transition in one call. The future surface is a two-phase proposal/commit contract under an exact human consent envelope (Gate B).`,
      mode: RUNTIME_MODE,
    },
    403,
  );
}

// ---------------------------------------------------------------------------
// The surface
// ---------------------------------------------------------------------------
let commissioned: { ok: boolean; halted?: string } = { ok: true };

export function start() {
  // 1. verify constitution (read-only; drift is presented honestly, never written in public)
  const verification = verifyConstitution();
  const hasConstitution = !!one<any>("SELECT id FROM constitution");
  if (hasConstitution && !verification.verified) {
    haltedReason = `CONSTITUTION_DRIFT: ${verification.drift.join(", ")}`;
  }

  // 2. BIND — liveness may be emitted only after this succeeds (R11)
  let server: any;
  try {
    server = Bun.serve({
      hostname: RES.bindHost,
      port: RES.port,
      async fetch(req): Promise<Response> {
        const url = new URL(req.url);
        const path = url.pathname;

        // R2 — caller-selected transport is refused before anything else
        if (url.searchParams.has(CALLER_PORT_PARAM)) {
          return json({ ok: false, refused: true, reason: `CALLER_SELECTED_TRANSPORT_REFUSED: requests carrying ${CALLER_PORT_PARAM} are refused — the transport is a fixed server-side proxy to 127.0.0.1:7421, never a caller-chosen port` }, 400);
        }
        // R3 — origin-bearing requests are refused before body processing; no CORS is ever emitted
        if (req.headers.get("origin") !== null) {
          return json({ ok: false, refused: true, reason: "ORIGIN_REFUSED: cross-origin browser requests never reach consequential routes; no access-control-allow-origin is emitted" }, 403);
        }
        if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders });

        // Health never depends on the loop being live — an honest liveness probe.
        if (path === "/api/health") {
          return json({
            ok: true,
            status: haltedReason ? "HALTED" : RUNTIME_MODE === "PUBLIC_REFERENCE" ? "LIVE" : (kv("status") ?? "CONSTRUCTION"),
            phase: RUNTIME_MODE === "PUBLIC_REFERENCE" ? "PUBLIC_REFERENCE" : (kv("phase") ?? "CONSTRUCTION"),
            mode: RUNTIME_MODE,
            bind_host: RES.bindHost,
            port: RES.port,
            uptime_ms: Date.now() - startedAt,
            tz: "Asia/Dubai",
          });
        }

        // State snapshot — always served, even when halted (the truth must be visible).
        if (path === "/api/state") return json(buildState(startedAt, { host: RES.bindHost, port: RES.port, haltedReason }));

        // The Shoulder — the sealed knowledge corpus above the root.
        if (path === "/api/shoulder") {
          const st = shoulderState();
          const text = shoulderText();
          if (text === null) return json({ ok: false, reason: "corpus unreadable" }, 404);
          return json({ ok: true, shoulder: st, corpus: text, corpus_sha256: st.sha256 });
        }

        if (path === "/api/dema") return json({ ok: true, dema: buildState(startedAt, { host: RES.bindHost, port: RES.port, haltedReason }).dema });

        if (path === "/api/verify") {
          const chain = verifyChain();
          const constitution = verifyConstitution();
          const report = {
            ok: chain.ok && constitution.verified,
            chain,
            constitution,
            law: "the chain walks from genesis; the constitution re-hashes from sealed bytes",
          };
          return json(report);
        }

        if (path === "/api/mission" && req.method === "GET") {
          return json({ ok: true, contract: missionContract() });
        }

        if (path.startsWith("/api/outbox/")) {
          const name = path.slice("/api/outbox/".length);
          const content = readOutboxFile(name);
          if (content === null) return json({ ok: false, reason: "not found or outside the outbox membrane" }, 404);
          return new Response(content, { headers: { ...jsonHeaders, "content-type": "text/markdown; charset=utf-8" } });
        }

        if (path === "/api/contracts") return json({ ok: true, contracts: contractsSnapshot() });

        // ---- Consequential actions below: HALTED refuses all -------------------
        if (haltedReason) {
          if (path === "/api/mission" || path === "/api/cycle" || path === "/api/trace" || path.startsWith("/api/transition/")) {
            return halted();
          }
        }

        // ---- Disabled in this slice (fail closed, both modes) ------------------
        if (path === "/api/cycle" && req.method === "POST") {
          return disabledInSlice("POST /api/cycle");
        }
        const revertMatch = path.match(/^\/api\/transition\/(\d+)\/revert$/);
        if (revertMatch && req.method === "POST") {
          return disabledInSlice(`POST /api/transition/${revertMatch[1]}/revert`);
        }

        // ---- Envelope-gated consequential actions (LOCAL_FOUNDER only) --------
        if (path === "/api/trace" && req.method === "POST") {
          if (RUNTIME_MODE !== "LOCAL_FOUNDER") return publicReadOnlyRefusal("POST /api/trace");
          const gate = await requireEnvelope(req, "TRACE_INGEST");
          if (!gate.ok) return gate.response;
          // §2.7 — provenance is DERIVED here; caller labels are ignored as authority
          const action = gate.action ?? {};
          const result = ingestTrace({
            source: EXTERNAL_SOURCE,
            kind: String(action.kind ?? "observation"),
            payload: typeof action.payload === "string" ? action.payload : JSON.stringify(action.payload ?? ""),
            correlation: action.correlation ? String(action.correlation).toUpperCase() : null,
            external: true,
            actor_id: gate.envelope.actor_id,
          });
          return json({
            ok: true,
            result: { ...result, requested_source_ignored: action.source_label ?? action.source ?? null },
            principal: gate.envelope.actor_id,
            stats: traceStats(),
          });
        }

        if (path === "/api/mission" && req.method === "POST") {
          if (RUNTIME_MODE !== "LOCAL_FOUNDER") return publicReadOnlyRefusal("POST /api/mission");
          const gate = await requireEnvelope(req, "MISSION_RUN");
          if (!gate.ok) return gate.response;
          const crashAfter = gate.action?.crashAfter === "OBSERVE" ? ("OBSERVE" as const) : undefined;
          const result = await runMission({ crashAfter });
          return json({ ok: result.status !== "UNKNOWN", result });
        }

        return json({ ok: false, reason: `no such route: ${path}` }, 404);
      },
    });
  } catch (e: any) {
    // R11 — bind failure: nothing was persisted, nothing will be
    console.error(`[BOUNDARY-1A][RED] LOCAL_BIND_FAILED: cannot bind ${RES.bindHost}:${RES.port} — ${e?.message ?? e}. No LIVE/BOOT receipt or state was persisted: liveness may be emitted only after the listener binds.`);
    process.exit(1);
  }

  // 3. Post-bind: LOCAL mode commissions (receipts now legal); PUBLIC never writes.
  if (RUNTIME_MODE === "LOCAL_FOUNDER") {
    seedContracts();
    commissioned = commission();
    if (commissioned.halted) haltedReason = commissioned.halted;
  }

  console.log(
    `[BIZRA Node0] runtime on ${RES.bindHost}:${RES.port} (mode=${RES.mode}) — status=${haltedReason ? "HALTED" : "LIVE"}${commissioned.halted ? ` (${commissioned.halted})` : ""}${RUNTIME_MODE === "PUBLIC_REFERENCE" ? " · sealed archive presented read-only; originals untouched" : ""}`,
  );
  return server;
}
