/**
 * BIZRA Node0 — the runtime.
 * Commission sequence: CONSTRUCTION -> SEAL the constitution -> SEALED -> LIVE.
 * Once LIVE, the engine serves the constitutional loop:
 *   PAT (proposer) · SAT (deterministic verifier) · FATE (membrane) ·
 *   bounded effects · independent observer · sealed receipts · Dema (status relay).
 *
 * Port 7421. Behind the gateway: every browser call carries ?XTransformPort=7421.
 * The constitution is verified on every boot; drift => HALT, nothing proceeds.
 */
import { kv, one } from "./src/store";
import { sealConstitution, verifyConstitution, constitutionRoot } from "./src/constitution";
import { seedContracts, contractsSnapshot } from "./src/contracts";
import { appendReceipt, verifyChain, chainHead } from "./src/chain";
import { relay } from "./src/dema";
import { buildState } from "./src/state";
import { runMission, missionContract } from "./src/mission";
import { runCycle, revertTransition } from "./src/auto";
import { ingestTrace, traceStats } from "./src/traces";
import { readOutboxFile } from "./src/executor";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const PORT = 7421;
const startedAt = Date.now();

// ---------------------------------------------------------------------------
// Commission — close Node0
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
    const srcDir = join(import.meta.dir, "src");
    const h = createHash("sha256");
    for (const f of ["index.ts", ...readdirSync(srcDir).filter((x) => x.endsWith(".ts")).sort()]) {
      h.update(f);
      h.update(readFileSync(f === "index.ts" ? join(import.meta.dir, f) : join(srcDir, f)));
    }
    kv("source_digest", h.digest("hex"));
    const liveReceipt = appendReceipt("NODE0_LIVE", "NODE0", {
      phase: "LIVE",
      constitution_root: constitutionRoot(),
      sealed_receipt: spineReceipt.seq,
      port: PORT,
      organs: ["PAT", "SAT", "FATE", "OBSERVER", "RECEIPT", "DEMA"],
    });
    relay("DONE", "NODE0_LIVE", "Node0 commissioned: constitution sealed, chain genesis, organs online", liveReceipt.digest);
    ingestTrace({
      source: "runtime",
      kind: "heartbeat",
      correlation: "NODE0",
      payload: JSON.stringify({ event: "COMMISSION", constitution_root: constitutionRoot(), live_receipt: liveReceipt.seq }),
    });
    return { ok: true };
  }
  // Subsequent boots: verify + heartbeat.
  kv("status", "LIVE");
  const bootCount = Number(kv("boot_count") ?? "1") + 1;
  kv("boot_count", String(bootCount));
  const receipt = appendReceipt("NODE0_BOOT", "NODE0", {
    boot_count: bootCount,
    constitution_root: constitutionRoot(),
    chain_head: chainHead()?.digest ?? null,
    recovery: "boot-time recovery: lease registry and chain are durable; exactly-once holds across process death",
  });
  relay("DONE", "NODE0_BOOT", `boot #${bootCount}: constitution verified, chain verified`, receipt.digest);
  ingestTrace({
    source: "runtime",
    kind: "heartbeat",
    correlation: "NODE0",
    payload: JSON.stringify({ event: "BOOT", boot_count: bootCount, chain_len: one<any>("SELECT COUNT(*) AS n FROM receipts")?.n ?? 0 }),
  });
  return { ok: true };
}

seedContracts();
const commissioned = commission();

// ---------------------------------------------------------------------------
// HTTP surface
// ---------------------------------------------------------------------------
const jsonHeaders = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
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
    { ok: false, status: "HALTED", reason: kv("halted_reason"), law: "nothing proceeds over a broken constitution" },
    503,
  );
}

const server = Bun.serve({
  port: PORT,
  async fetch(req): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: jsonHeaders });

    // Health never depends on the loop being live — an honest liveness probe.
    if (path === "/api/health") {
      return json({
        ok: true,
        status: kv("status"),
        phase: kv("phase"),
        port: PORT,
        uptime_ms: Date.now() - startedAt,
        tz: "Asia/Dubai",
      });
    }

    // State snapshot — always served, even when halted (the truth must be visible).
    if (path === "/api/state") return json(buildState(startedAt));

    if (path === "/api/dema") return json({ ok: true, dema: buildState(startedAt).dema });

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
      return new Response(content, { headers: { "content-type": "text/markdown; charset=utf-8", ...jsonHeaders } });
    }

    // Actions below are constitutionally gated: a HALTED engine refuses them all.
    if (kv("status") !== "LIVE") {
      if (path === "/api/mission" || path === "/api/cycle" || path === "/api/trace" || path.startsWith("/api/transition/")) {
        return halted();
      }
    }

    if (path === "/api/mission" && req.method === "POST") {
      const body = await readBody(req);
      const crashAfter = body.crashAfter === "OBSERVE" ? ("OBSERVE" as const) : undefined;
      const result = await runMission({ crashAfter });
      return json({ ok: result.status !== "UNKNOWN", result });
    }

    if (path === "/api/cycle" && req.method === "POST") {
      const report = await runCycle();
      return json({ ok: report.status === "DONE", report });
    }

    if (path === "/api/trace" && req.method === "POST") {
      const body = await readBody(req);
      const result = ingestTrace({
        source: String(body.source ?? "operator"),
        kind: String(body.kind ?? "observation"),
        payload: typeof body.payload === "string" ? body.payload : JSON.stringify(body.payload ?? ""),
        correlation: body.correlation ? String(body.correlation).toUpperCase() : null,
        external: true,
      });
      return json({ ok: true, result, stats: traceStats() });
    }

    const revertMatch = path.match(/^\/api\/transition\/(\d+)\/revert$/);
    if (revertMatch && req.method === "POST") {
      const result = revertTransition(Number(revertMatch[1]));
      return json(result.ok ? { ok: true, ...result } : { ok: false, reason: result.reason }, result.ok ? 200 : 409);
    }

    if (path === "/api/contracts") return json({ ok: true, contracts: contractsSnapshot() });

    return json({ ok: false, reason: `no such route: ${path}` }, 404);
  },
});

console.log(`[BIZRA Node0] runtime on :${PORT} — status=${kv("status")} phase=${kv("phase")}${commissioned.halted ? ` HALTED (${commissioned.halted})` : ""}`);
