/**
 * BIZRA Node0 — LOCAL-SOVEREIGN-BOUNDARY-1A · RED-first boundary tests.
 *
 * Mission: BIZRA-HOME-LOCAL-SOVEREIGN-BOUNDARY-1A (evidence-bound spearpoint).
 * These tests are the SPECIFICATION of the local sovereign boundary. They were
 * written BEFORE implementation and observed failing (RED) — see
 * evidence/local-sovereign-boundary-1a/RED_TESTS.json.
 *
 * Safety laws for every test:
 *   1. Unique temp state root per test (mkdtemp). The recovered archive is
 *      only ever READ (cp) for seeding — never opened read-write by a test.
 *   2. No runtime PAT/model call is ever exercised (mission boundary).
 *   3. The red run executes in an isolated copy of this service; the live
 *      archive is never booted against pre-boundary source.
 */
import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { mkdtempSync, cpSync, mkdirSync, rmSync, readFileSync, readdirSync, writeFileSync, chmodSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, createHmac } from "node:crypto";

const SERVICE = import.meta.dir + "/..";
const STATE_SRC = join(SERVICE, "state");

/** Seed an isolated temp state root from the archive bytes (read-only cp). */
function seedRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "bizra-boundary-root-"));
  const state = join(root, "state");
  mkdirSync(state, { recursive: true });
  for (const f of ["bizra.db", "bizra.db-wal", "bizra.db-shm"]) {
    if (existsSync(join(STATE_SRC, f))) cpSync(join(STATE_SRC, f), join(state, f));
  }
  for (const d of ["vault", "shoulder", "outbox"]) {
    try { cpSync(join(STATE_SRC, d), join(state, d), { recursive: true }); } catch { /* optional */ }
  }
  mkdirSync(join(root, "keys"), { recursive: true });
  return root;
}

let portSeq = 17421;
function nextPort() { return portSeq++; }

interface Booted { proc: any; base: string; root: string; stop(): Promise<void> }
const booted: Booted[] = [];

/** Boot the runtime as a subprocess with an isolated state root. */
async function bootRuntime(opts: { mode: string; host?: string; port?: number; root?: string }): Promise<Booted> {
  const port = opts.port ?? nextPort();
  const root = opts.root ?? seedRoot();
  const env: any = {
    ...process.env,
    BIZRA_RUNTIME_MODE: opts.mode,
    BIZRA_STATE_ROOT: root,
    BIZRA_PORT: String(port),
  };
  if (opts.host) env.BIZRA_BIND_HOST = opts.host;
  else delete env.BIZRA_BIND_HOST;
  const proc = spawn("bun", ["index.ts"], { cwd: SERVICE, env, stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  proc.stderr.on("data", (d: any) => { stderr += String(d); });
  (proc as any).__stderr = stderr;
  const b: Booted = {
    proc, base: "", root,
    stop: async () => { try { proc.kill(9); } catch {} await new Promise((r) => setTimeout(r, 150)); },
  };
  const candidates = [port, 7421].filter((p, i, a) => a.indexOf(p) === i);
  const deadline = Date.now() + 12000;
  let found = false;
  while (Date.now() < deadline && !found) {
    for (const p of candidates) {
      try {
        const res = await fetch(`http://127.0.0.1:${p}/api/health`, { signal: AbortSignal.timeout(700) });
        if (res.ok) { b.base = `http://127.0.0.1:${p}`; found = true; break; }
      } catch { /* not up yet */ }
    }
    if (!found) await new Promise((r) => setTimeout(r, 250));
  }
  if (!found) throw new Error(`runtime did not become healthy (mode=${opts.mode} host=${opts.host ?? "absent"}): ${stderr.slice(-400)}`);
  booted.push(b);
  return b;
}

async function get(base: string, path: string, init?: RequestInit) {
  return fetch(base + path, { ...init, signal: AbortSignal.timeout(6000) });
}
async function post(base: string, path: string, body: unknown, headers?: Record<string, string>) {
  return fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(headers ?? {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
}

// ---------------------------------------------------------------------------
// Envelope construction helpers (mirror bizra.node0.local_action_envelope.v1)
// ---------------------------------------------------------------------------
const SCHEMA = "bizra.node0.local_action_envelope.v1";
const canonical = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "object") {
    if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
    const keys = Object.keys(v as any).sort();
    return "{" + keys.filter((k) => (v as any)[k] !== undefined).map((k) => JSON.stringify(k) + ":" + canonical((v as any)[k])).join(",") + "}";
  }
  return JSON.stringify(v);
};
const sha256hex = (s: string) => createHash("sha256").update(s).digest("hex");

function makeKey(root: string): { keyId: string; key: Buffer } {
  const key = randomBytes(32);
  const keyId = sha256hex(String(key)).slice(0, 16);
  const dir = join(root, "keys");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${keyId}.key`), key);
  chmodSync(join(dir, `${keyId}.key`), 0o600);
  return { keyId, key };
}

function makeEnvelope(action: unknown, key: Buffer, keyId: string, opts?: { expiresInSec?: number; issuedBackdateSec?: number; nonce?: string; tamperMac?: boolean }): { action: any; envelope: any } {
  const now = Date.now();
  const env: any = {
    schema: SCHEMA,
    action_id: randomBytes(16).toString("hex"),
    action_class: "TRACE_INGEST",
    actor_id: "TEST-ACTOR-1",
    request_sha256: sha256hex(canonical(action)),
    intent_sha256: sha256hex(canonical((action as any).intent ?? "test intent")),
    nonce: opts?.nonce ?? randomBytes(16).toString("hex"),
    issued_at: new Date(now - (opts?.issuedBackdateSec ?? 0) * 1000).toISOString(),
    expires_at: new Date(now + (opts?.expiresInSec ?? 60) * 1000).toISOString(),
    key_id: keyId,
  };
  env.mac = createHmac("sha256", key).update(canonical(env)).digest("hex");
  if (opts?.tamperMac) env.mac = env.mac.slice(0, -1) + (env.mac.endsWith("0") ? "1" : "0");
  return { action, envelope: env };
}

afterAll(async () => { for (const b of booted) await b.stop(); });
afterEach(async () => { for (const b of booted) await b.stop(); booted.length = 0; });

const jsonOf = async (res: Response) => await res.json();
const stateOf = async (base: string) => await jsonOf(await get(base, "/api/state"));

// R1 — LOOPBACK BINDING ------------------------------------------------------
describe("R1 loopback binding", () => {
  test("LOCAL mode with 0.0.0.0 must refuse to run", async () => {
    const root = seedRoot();
    const proc = spawn("bun", ["index.ts"], {
      cwd: SERVICE,
      env: { ...process.env, BIZRA_RUNTIME_MODE: "LOCAL_FOUNDER", BIZRA_STATE_ROOT: root, BIZRA_BIND_HOST: "0.0.0.0", BIZRA_PORT: String(nextPort()) } as any,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    proc.stderr.on("data", (d: any) => { stderr += String(d); });
    const code = await new Promise<number | null>((resolve) => {
      const t = setTimeout(() => resolve(null), 9000);
      proc.on("exit", (c: any) => { clearTimeout(t); resolve(c); });
    });
    if (code === null) { try { proc.kill(9); } catch {} }
    expect(code).not.toBeNull();
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/LOOPBACK|LOCAL_BIND|127\.0\.0\.1|::1/i);
    rmSync(root, { recursive: true, force: true });
  }, 30000);

  test("LOCAL mode with ABSENT host must refuse (explicit loopback policy required)", async () => {
    const root = seedRoot();
    const env: any = { ...process.env, BIZRA_RUNTIME_MODE: "LOCAL_FOUNDER", BIZRA_STATE_ROOT: root, BIZRA_PORT: String(nextPort()) };
    delete env.BIZRA_BIND_HOST;
    const proc = spawn("bun", ["index.ts"], { cwd: SERVICE, env, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d: any) => { stderr += String(d); });
    const code = await new Promise<number | null>((resolve) => {
      const t = setTimeout(() => resolve(null), 9000);
      proc.on("exit", (c: any) => { clearTimeout(t); resolve(c); });
    });
    if (code === null) { try { proc.kill(9); } catch {} }
    expect(code).not.toBeNull();
    expect(code).not.toBe(0);
    expect(stderr).toMatch(/LOOPBACK|LOCAL_BIND|explicit/i);
    rmSync(root, { recursive: true, force: true });
  }, 30000);

  test("PUBLIC mode defaults to an explicit loopback bind and reports it", async () => {
    const b = await bootRuntime({ mode: "PUBLIC_REFERENCE" });
    const res = await get(b.base, "/api/health");
    expect(res.status).toBe(200);
    const health = await jsonOf(res);
    expect(health.mode).toBe("PUBLIC_REFERENCE");
    expect(health.bind_host).toBe("127.0.0.1");
  }, 30000);
});

// R2 — NO CALLER-SELECTED TRANSPORT ------------------------------------------
describe("R2 caller-selected transport refused", () => {
  test("runtime refuses any request carrying XTransformPort", async () => {
    const b = await bootRuntime({ mode: "PUBLIC_REFERENCE" });
    const res = await get(b.base, "/api/state?XTransformPort=7421");
    expect(res.status).toBe(400);
    const body = await jsonOf(res);
    expect(body.ok).toBe(false);
    expect(String(body.reason)).toMatch(/XTransformPort|caller|transport/i);
  }, 30000);
});

// R3 — NO WILDCARD CORS -------------------------------------------------------
describe("R3 no wildcard CORS, foreign origin refused", () => {
  test("no access-control-allow-origin is ever emitted", async () => {
    const b = await bootRuntime({ mode: "PUBLIC_REFERENCE" });
    const res = await get(b.base, "/api/health");
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
    const opt = await fetch(b.base + "/api/health", { method: "OPTIONS" });
    expect(opt.headers.get("access-control-allow-origin")).toBeNull();
  }, 30000);

  test("a request bearing a foreign Origin is refused before body processing", async () => {
    const b = await bootRuntime({ mode: "PUBLIC_REFERENCE" });
    const before = await stateOf(b.base);
    const res = await post(b.base, "/api/trace", { source: "operator", kind: "observation", payload: "evil origin probe" }, { origin: "https://evil.example" });
    expect(res.status).toBe(403);
    const after = await stateOf(b.base);
    expect(after.traces.stats.total).toBe(before.traces.stats.total);
  }, 30000);
});

// R4 — READ-ONLY DEFAULT ------------------------------------------------------
describe("R4 read-only default in PUBLIC mode", () => {
  test("unauthenticated POST /api/trace fails closed with zero state change", async () => {
    const b = await bootRuntime({ mode: "PUBLIC_REFERENCE" });
    const before = await stateOf(b.base);
    const res = await post(b.base, "/api/trace", { source: "operator", kind: "observation", payload: "should be refused" });
    expect(res.status).toBe(403);
    const after = await stateOf(b.base);
    expect(after.traces.stats.total).toBe(before.traces.stats.total);
    expect(after.chain.len).toBe(before.chain.len);
  }, 30000);

  test("unauthenticated POST /api/mission fails closed (no model call spent)", async () => {
    const b = await bootRuntime({ mode: "PUBLIC_REFERENCE" });
    const health = await jsonOf(await get(b.base, "/api/health"));
    if (!health.mode) {
      throw new Error("RED (static): runtime exposes no mode field — POST /api/mission is unauthenticated (source: no envelope gate). Executing it against pre-boundary source would spend a live model call, forbidden this slice; observed by source inspection.");
    }
    const before = await stateOf(b.base);
    const res = await post(b.base, "/api/mission", {});
    expect(res.status).toBe(403);
    const after = await stateOf(b.base);
    expect(after.chain.len).toBe(before.chain.len);
    expect(after.missions.length).toBe(before.missions.length);
  }, 30000);
});

// R5 — ACTION ENVELOPE REQUIRED ------------------------------------------------
describe("R5 action envelope required and fail-closed", () => {
  test("envelope module implements bizra.node0.local_action_envelope.v1", async () => {
    const envelopeModule: any = await import("../src/envelope");
    expect(typeof envelopeModule.verifyActionEnvelope).toBe("function");
    const key = randomBytes(32);
    const keyId = envelopeModule.keyIdFor(key);
    const action = { intent: "envelope battery", kind: "observation", payload: "x" };
    const env = makeEnvelope(action, key, keyId);
    const good = envelopeModule.verifyActionEnvelope({ action, envelope: env.envelope }, { keys: new Map([[keyId, key]]), now: Date.now() });
    expect(good.ok).toBe(true);
    const bad: Array<[string, any]> = [
      ["wrong mac", { action, envelope: makeEnvelope(action, key, keyId, { tamperMac: true }).envelope }],
      ["expired", { action, envelope: makeEnvelope(action, key, keyId, { expiresInSec: -10, issuedBackdateSec: 120 }).envelope }],
      ["wrong request hash", { action: { intent: "envelope battery", kind: "observation", payload: "mutated" }, envelope: env.envelope }],
      ["unknown key", { action, envelope: { ...env.envelope, key_id: "deadbeefdeadbeef" } }],
      ["malformed (no nonce)", { action, envelope: (() => { const e = { ...env.envelope }; delete e.nonce; return e; })() }],
      ["wrong schema", { action, envelope: { ...env.envelope, schema: "evil.v9" } }],
    ];
    for (const [name, body] of bad) {
      const v = envelopeModule.verifyActionEnvelope(body, { keys: new Map([[keyId, key]]), now: Date.now() });
      expect(v.ok).toBe(false);
      if (!v.ok) expect(String(v.reason)).toMatch(/[A-Z_]{4,}/);
    }
  }, 20000);

  test("route refuses missing/invalid/replayed envelopes; exactly one ingestion per nonce", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    const health = await jsonOf(await get(b.base, "/api/health"));
    if (!health.mode) {
      throw new Error("RED (static): no envelope gate exists — POST /api/trace is unauthenticated; observed by source inspection (index.ts).");
    }
    const { keyId, key } = makeKey(b.root);
    const action = { intent: "r5 route battery", kind: "observation", payload: "r5" };
    const before = await stateOf(b.base);
    const cases: Array<[string, any]> = [
      ["no envelope", { action }],
      ["wrong mac", { action, envelope: makeEnvelope(action, key, keyId, { tamperMac: true }).envelope }],
      ["expired", { action, envelope: makeEnvelope(action, key, keyId, { expiresInSec: -5, issuedBackdateSec: 60 }).envelope }],
      ["unknown key", { action, envelope: { ...makeEnvelope(action, key, keyId).envelope, key_id: "0000000000000000" } }],
    ];
    for (const [, body] of cases) {
      const res = await post(b.base, "/api/trace", body);
      expect([401, 403]).toContain(res.status);
    }
    // replay: first accepted, then the SAME envelope refused
    const e = makeEnvelope(action, key, keyId);
    const first = await post(b.base, "/api/trace", { action, envelope: e.envelope });
    expect(first.status).toBe(200);
    const replay = await post(b.base, "/api/trace", { action, envelope: e.envelope });
    expect([401, 403]).toContain(replay.status);
    const after = await stateOf(b.base);
    expect(after.traces.stats.total).toBe(before.traces.stats.total + 1);
  }, 30000);
});

// R6 — NONCE ATOMICITY ----------------------------------------------------------
describe("R6 nonce atomicity under concurrency", () => {
  test("two concurrent attempts with the same nonce yield exactly one winner", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    const health = await jsonOf(await get(b.base, "/api/health"));
    if (!health.mode) {
      throw new Error("RED (static): no nonce store exists — replay/concurrency control absent; observed by source inspection (index.ts /api/trace).");
    }
    const { keyId, key } = makeKey(b.root);
    const action = { intent: "race", kind: "observation", payload: "race-payload" };
    const e = makeEnvelope(action, key, keyId);
    const body = { action, envelope: e.envelope };
    const [r1, r2] = await Promise.all([post(b.base, "/api/trace", body), post(b.base, "/api/trace", body)]);
    const statuses = [r1.status, r2.status].sort();
    expect(statuses).toEqual([200, 403]);
  }, 30000);
});

// R7 — TRACE PROVENANCE CANNOT BE CHOSEN BY CALLER -------------------------------
describe("R7 trace provenance derived by server", () => {
  test("external trace cannot claim internal labels; principal is the actor", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    const health = await jsonOf(await get(b.base, "/api/health"));
    if (!health.mode) {
      throw new Error("RED (static): trace source is taken from the request body (index.ts /api/trace reads body.source); observed by source inspection.");
    }
    const { keyId, key } = makeKey(b.root);
    for (const label of ["runtime", "mission", "cycle", "dema", "operator", "browser"]) {
      const action = { intent: `label probe ${label}`, kind: "observation", payload: `probe-${label}`, source_label: label };
      const e = makeEnvelope(action, key, keyId);
      const res = await post(b.base, "/api/trace", { action, envelope: e.envelope });
      expect(res.status).toBe(200);
      const body = await jsonOf(res);
      expect(body.result.stored_source).toBe("external_operator");
    }
    const state = await stateOf(b.base);
    const last = state.traces.last[0];
    expect(last.source).toBe("external_operator");
    expect(last.actor_id).toBe("TEST-ACTOR-1");
  }, 30000);
});

// R8 — CORROBORATION IS PRINCIPAL-BOUND (in-process, isolated root) ---------------
describe("R8 corroboration counts principals, not strings (in-process)", () => {
  let traces: any; let sat: any; let auto: any;
  beforeAll(async () => {
    process.env.BIZRA_STATE_ROOT = seedRoot();
    process.env.BIZRA_RUNTIME_MODE = "LOCAL_FOUNDER";
    process.env.BIZRA_BIND_HOST = "127.0.0.1";
    traces = await import("../src/traces");
    sat = await import("../src/sat");
    auto = await import("../src/auto");
  });
  test("one actor under two labels is one corroborating principal", async () => {
    const t1 = traces.ingestTrace({ source: "browser", kind: "observation", payload: "same actor trace A", external: true, actor_id: "TEST-ACTOR-1" });
    const t2 = traces.ingestTrace({ source: "mission", kind: "observation", payload: "same actor trace B", external: true, actor_id: "TEST-ACTOR-1" });
    expect(t1.admissible).toBe(true);
    expect(t2.admissible).toBe(true);
    const catalog = [{ key: "TEST_CONTRACT", value: 1, min: 0, max: 10 }];
    const verdict = sat.verifyDiagnosticContract({
      cycleId: "CYCLE-R8",
      hypothesis: "R8 probe: same principal must not satisfy the independence floor",
      targetContract: "TEST_CONTRACT",
      beforeValue: 1,
      afterValue: 2,
      dod: "TEST_CONTRACT probe",
      citedTraces: [t1.id, t2.id],
      catalog,
      corroborationMin: 2,
    });
    expect(verdict.clauses.corroboration.pass).toBe(false);
    expect(verdict.status).toBe("FAIL");
    const t3 = traces.ingestTrace({ source: "runtime", kind: "observation", payload: "internal trace C" });
    const verdict2 = sat.verifyDiagnosticContract({
      cycleId: "CYCLE-R8",
      hypothesis: "R8 probe: two distinct principals satisfy the floor",
      targetContract: "TEST_CONTRACT",
      beforeValue: 1,
      afterValue: 2,
      dod: "TEST_CONTRACT probe",
      citedTraces: [t1.id, t3.id],
      catalog,
      corroborationMin: 2,
    });
    expect(verdict2.clauses.corroboration.pass).toBe(true);
  }, 20000);
  test("kernel revert without authority mutates NOTHING (R10 kernel)", async () => {
    const store: any = await import("../src/store");
    const live = store.one("SELECT id, contract_key FROM transitions WHERE reverted = 0 ORDER BY id LIMIT 1");
    expect(live).not.toBeNull();
    const valueBefore = store.one("SELECT value FROM contracts WHERE key = ?", live.contract_key)?.value;
    const receiptsBefore = store.one("SELECT COUNT(*) AS n FROM receipts")?.n;
    const demaBefore = store.one("SELECT COUNT(*) AS n FROM dema")?.n;
    const result = auto.revertTransition(live.id, undefined as any);
    expect(result.ok).toBe(false);
    expect(String((result as any).reason ?? "")).toMatch(/AUTHORITY/i);
    expect(store.one("SELECT value FROM contracts WHERE key = ?", live.contract_key)?.value).toBe(valueBefore);
    expect(store.one("SELECT COUNT(*) AS n FROM receipts")?.n).toBe(receiptsBefore);
    expect(store.one("SELECT COUNT(*) AS n FROM dema")?.n).toBe(demaBefore);
    expect(store.one("SELECT reverted FROM transitions WHERE id = ?", live.id)?.reverted).toBe(0);
  }, 20000);
});

// R9 — AUTOPOIETIC MUTATION DISABLED ---------------------------------------------
describe("R9 /api/cycle cannot apply a transition in this slice", () => {
  test("cycle POST fails closed; zero leases, transitions, receipts", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    const health = await jsonOf(await get(b.base, "/api/health"));
    if (!health.mode) {
      throw new Error("RED (static): /api/cycle is unauthenticated and applies transitions in one call (index.ts -> runCycle -> setContractValue); executing it would spend a model call — forbidden this slice; observed by source inspection.");
    }
    const before = await stateOf(b.base);
    const { keyId, key } = makeKey(b.root);
    const action = { intent: "cycle probe" };
    const e = makeEnvelope(action, key, keyId);
    e.envelope.action_class = "CYCLE_RUN";
    e.envelope.mac = createHmac("sha256", key).update(canonical(e.envelope)).digest("hex");
    const res = await post(b.base, "/api/cycle", { action, envelope: e.envelope });
    expect(res.status).toBe(403);
    const body = await jsonOf(res);
    expect(String(body.reason ?? "")).toMatch(/DISABLED|two-phase|proposal\/commit/i);
    const after = await stateOf(b.base);
    expect(after.chain.len).toBe(before.chain.len);
    expect(after.fate.stats.total).toBe(before.fate.stats.total);
    expect(after.transitions.length).toBe(before.transitions.length);
  }, 30000);
});

// R10 — REVERT CANNOT PRECEDE AUTHORITY -------------------------------------------
describe("R10 HTTP revert disabled this slice", () => {
  test("HTTP revert refuses; zero state change", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    const health = await jsonOf(await get(b.base, "/api/health"));
    if (!health.mode) {
      throw new Error("RED (static): /api/transition/:id/revert is unauthenticated and mutates contract state (index.ts -> revertTransition); observed by source inspection.");
    }
    const before = await stateOf(b.base);
    const res = await post(b.base, "/api/transition/1/revert", {});
    expect(res.status).toBe(403);
    const after = await stateOf(b.base);
    expect(after.chain.len).toBe(before.chain.len);
    expect(after.transitions.length).toBe(before.transitions.length);
  }, 30000);
});

// R11 — LIVE MEANS LISTENER BOUND ---------------------------------------------------
describe("R11 liveness is emitted only after the listener binds", () => {
  test("bind failure persists no BOOT/LIVE receipt in the state root", async () => {
    const blocker = Bun.serve({ port: 7421, fetch: () => new Response("occupied") });
    const port = nextPort();
    const blocker2 = Bun.serve({ port, fetch: () => new Response("occupied") });
    const root = seedRoot();
    const env: any = { ...process.env, BIZRA_RUNTIME_MODE: "LOCAL_FOUNDER", BIZRA_STATE_ROOT: root, BIZRA_BIND_HOST: "127.0.0.1", BIZRA_PORT: String(port) };
    const proc = spawn("bun", ["index.ts"], { cwd: SERVICE, env, stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (d: any) => { stderr += String(d); });
    const code = await new Promise<number | null>((resolve) => {
      const t = setTimeout(() => resolve(null), 9000);
      proc.on("exit", (c: any) => { clearTimeout(t); resolve(c); });
    });
    if (code === null) { try { proc.kill(9); } catch {} }
    blocker.stop(true);
    blocker2.stop(true);
    expect(code).not.toBeNull();
    expect(code).not.toBe(0);
    // the refusal must be NAMED — a bare EADDRINUSE stack trace is not a boundary
    expect(stderr).toMatch(/BIND_FAILED|\[RED\]|LOCAL_BIND|LOOPBACK_POLICY/i);
    const dbFile = join(root, "state", "bizra.db");
    if (existsSync(dbFile)) {
      const { Database } = await import("bun:sqlite");
      const ro = new Database(dbFile, { readonly: true });
      const n = ro.query("SELECT COUNT(*) AS n FROM receipts").get() as any;
      ro.close();
      expect(n.n).toBe(33);
    }
    rmSync(root, { recursive: true, force: true });
  }, 30000);
});

// LOCAL-INIT — the dedicated local key command ---------------------------------------
describe("local-init command", () => {
  test("generates a 0600 key outside the repo and prints only the key_id", () => {
    const root = mkdtempSync(join(tmpdir(), "bizra-local-init-"));
    const res = spawnSync("bun", ["src/local-init.ts"], {
      cwd: SERVICE,
      env: { ...process.env, BIZRA_STATE_ROOT: root } as any,
      encoding: "utf8",
    });
    expect(res.status).toBe(0);
    expect(res.stdout ?? "").toMatch(/[0-9a-f]{16}/);
    const keysDir = join(root, "keys");
    expect(existsSync(keysDir)).toBe(true);
    const files = readdirSync(keysDir);
    expect(files.length).toBe(1);
    const keyPath = join(keysDir, files[0]);
    expect(statSync(keyPath).size).toBe(32);
    expect(statSync(keyPath).mode & 0o777).toBe(0o600);
    const keyHex = readFileSync(keyPath).toString("hex");
    expect(res.stdout).not.toContain(keyHex);
    rmSync(root, { recursive: true, force: true });
  }, 20000);
});

// SOURCE SCAN — static boundary invariants -------------------------------------------
describe("source scan", () => {
  test("no XTransformPort, no CORS wildcard, no Math.random in authority paths", () => {
    const offenders: string[] = [];
    const appSrc = join(SERVICE, "..", "..", "src");
    const scanDirs: Array<[string, boolean]> = [];
    if (existsSync(appSrc)) scanDirs.push([appSrc, false]);
    scanDirs.push([join(SERVICE, "src"), true]);
    for (const [dir, authority] of scanDirs) {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".ts") && !f.endsWith(".tsx")) continue;
        const p = join(dir, f);
        try {
          const text = readFileSync(p, "utf8");
          if (text.includes("XTransformPort")) offenders.push(`XTransformPort in ${p}`);
          if (/access-control-allow-origin["']?\s*[:,]\s*["']\*/i.test(text)) offenders.push(`CORS wildcard in ${p}`);
          if (authority && text.includes("Math.random")) offenders.push(`Math.random in ${p}`);
        } catch { /* skip */ }
      }
    }
    expect(offenders).toEqual([]);
  }, 10000);
});
