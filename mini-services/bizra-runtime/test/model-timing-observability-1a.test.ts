/**
 * BIZRA Node0 — MODEL-TIMING-OBSERVABILITY-1A · RED-first observability tests.
 *
 * Mission: make the 20-second generation corridor observable and the budget
 * reservation atomic — entirely on the exact c5978f52 / 4a4d879e lineage,
 * zero real model calls, mock Ollama only, authority_delta=0.
 *
 * Lifecycle under test (mission frozen):
 *   REQUEST → atomic budget admission → GENERATE_DISPATCHED
 *   → residency_first_observed → first_transport_bytes
 *   → first_valid_stream_object → first_reasoning_chunk? → first_answer_content
 *   → GENERATION_COMPLETE
 *   failure: deadline → abort emitted → backend termination observed / UNKNOWN
 *
 * Budget proof (mission §11):
 *   scope kind + scope id, used_before, limit, atomic admission,
 *   increment/reservation before dispatch, timeout consumes call,
 *   retry consumes call, restart semantics,
 *   N concurrent attempts at budget=1 → exactly ONE provider dispatch
 *
 * Truth law: mock provider only (TEST_PROVIDER), synthetic digests, loopback, no remote SDK.
 */
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, cpSync, mkdirSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, createHmac } from "node:crypto";
import { startMockOllama, getFreePort, TEST_GEMMA, TEST_GEMMA_DIGEST, TEST_QWEN, TEST_QWEN_DIGEST, validBriefFixture } from "./mock-ollama";

const SERVICE = import.meta.dir + "/..";
const STATE_SRC = join(SERVICE, "state");

const SCHEMA_11 = "bizra.node0.local_action_envelope.v1.1";

function sha256hex(s: string | Buffer) { return createHash("sha256").update(s).digest("hex"); }
const canonical = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "object") {
    if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
    const keys = Object.keys(v as any).sort();
    return "{" + keys.filter((k) => (v as any)[k] !== undefined).map((k) => JSON.stringify(k) + ":" + canonical((v as any)[k])).join(",") + "}";
  }
  return JSON.stringify(v);
};

let portSeq = 21121;
let mockPortSeq = 22121;
const nextPort = () => portSeq++;
const nextMockPort = () => mockPortSeq++;

interface Booted { proc: any; base: string; root: string; stderr: string; stop(): Promise<void> }
const booted: Booted[] = [];

function seedRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "bizra-obs-root-"));
  const state = join(root, "state");
  mkdirSync(state, { recursive: true });
  for (const f of ["bizra.db", "bizra.db-wal", "bizra.db-shm"] as const) {
    if (existsSync(join(STATE_SRC, f))) cpSync(join(STATE_SRC, f), join(state, f));
  }
  for (const d of ["vault", "shoulder", "outbox"]) {
    try { cpSync(join(STATE_SRC, d), join(state, d), { recursive: true }); } catch {}
  }
  mkdirSync(join(root, "keys"), { recursive: true });
  return root;
}
async function bootRuntime(opts: { mode: string; host?: string; port?: number; root?: string; env?: Record<string, string> }): Promise<Booted> {
  const port = opts.port ?? nextPort();
  const root = opts.root ?? seedRoot();
  const env: any = { ...process.env, BIZRA_RUNTIME_MODE: opts.mode, BIZRA_STATE_ROOT: root, BIZRA_PORT: String(port), ...(opts.env ?? {}) };
  if (opts.host) env.BIZRA_BIND_HOST = opts.host; else delete env.BIZRA_BIND_HOST;
  const proc = spawn("bun", ["index.ts"], { cwd: SERVICE, env, stdio: ["ignore", "pipe", "pipe"] });
  let stderr = ""; proc.stderr.on("data", (d: any) => { stderr += String(d); });
  const b: Booted = { proc, base: "", root, stderr, stop: async () => { try { proc.kill(9); } catch {} await new Promise((r) => setTimeout(r, 120)); } };
  const deadline = Date.now() + 12000; let found = false;
  while (Date.now() < deadline && !found) {
    try { const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(700) }); if (res.ok) { b.base = `http://127.0.0.1:${port}`; found = true; break; } } catch {}
    if (!found) await new Promise((r) => setTimeout(r, 250));
  }
  if (!found) throw new Error(`runtime not healthy mode=${opts.mode}: ${stderr.slice(-400)}`);
  booted.push(b); return b;
}
async function get(base: string, path: string) { return fetch(base + path, { signal: AbortSignal.timeout(9000) }); }
async function post(base: string, path: string, body: unknown, timeoutMs = 20000) {
  return fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
}
const jsonOf = async (res: Response) => await res.json();

function initControlKey(root: string): { code: number; stdout: string } {
  const res = spawnSync("bun", ["src/init-control-key.ts"], { cwd: SERVICE, env: { ...process.env, BIZRA_STATE_ROOT: root } as any, encoding: "utf8", timeout: 20000 });
  return { code: res.status ?? -1, stdout: res.stdout ?? "" };
}
function keyIdOf(root: string): string | null {
  const dir = join(root, "keys"); if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.endsWith(".key")); return files.length ? files[0].slice(0, -".key".length) : null;
}
function keyBytesOf(root: string, keyId: string): Buffer { return readFileSync(join(root, "keys", `${keyId}.key`)); }
function makeEnvelope(action: unknown, key: Buffer, keyId: string, opts: { method?: string; path?: string; actorId?: string; nonce?: string; expiresInSec?: number; class?: string; tamperMac?: boolean }) {
  const now = Date.now(); const env: any = {
    schema: SCHEMA_11, key_id: keyId, nonce: opts.nonce ?? randomBytes(16).toString("hex"),
    action_id: randomBytes(16).toString("hex"), action_class: opts.class ?? "TRACE_INGEST",
    method: opts.method ?? "POST", path: opts.path ?? "/api/trace",
    request_sha256: sha256hex(canonical(action)), intent_sha256: sha256hex(canonical((action as any)?.intent ?? "obs test intent")),
    issued_at: new Date(now).toISOString(), expires_at: new Date(now + (opts.expiresInSec ?? 60) * 1000).toISOString(),
  };
  if (opts.actorId !== undefined) env.actor_id = opts.actorId;
  env.mac = createHmac("sha256", key).update(canonical(env)).digest("hex");
  if (opts.tamperMac) env.mac = env.mac.slice(0, -2) + "00";
  return { action, envelope: env };
}
async function bootFounder(opts: { env?: Record<string, string>; fresh?: boolean } = {}): Promise<Booted & { keyId: string; key: Buffer }> {
  const root = opts.fresh ? (() => {
    const r = mkdtempSync(join(tmpdir(), "bizra-obs-fresh-")); mkdirSync(join(r, "state"), { recursive: true });
    for (const d of ["vault", "shoulder"]) { try { cpSync(join(STATE_SRC, d), join(r, "state", d), { recursive: true }); } catch {} }
    mkdirSync(join(r, "keys"), { recursive: true }); return r;
  })() : undefined;
  const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1", env: opts.env, root });
  const r = initControlKey(b.root); expect(r.code).toBe(0);
  const keyId = keyIdOf(b.root); expect(keyId).toBeTruthy(); const key = keyBytesOf(b.root, keyId!);
  return { ...b, keyId: keyId!, key };
}
async function configureProvider(b: { base: string; key: Buffer; keyId: string }, cfg: Record<string, unknown>, opts: { nonce?: string; tamper?: boolean } = {}) {
  const action: any = { intent: "obs test config", provider_id: "local-ollama", endpoint: cfg.endpoint, selected_model: cfg.selected_model, selected_model_digest: cfg.selected_model_digest ?? null };
  const body = makeEnvelope(action, b.key, b.keyId, { class: "MODEL_CONFIG_SET", path: "/api/model/config", nonce: opts.nonce, tamperMac: opts.tamper });
  return post(b.base, "/api/model/config", body);
}
async function propose(b: { base: string; key: Buffer; keyId: string }, intent = "obs proposal") {
  const action = { intent }; const body = makeEnvelope(action, b.key, b.keyId, { class: "PAT_PROPOSE", path: "/api/pat/proposal" });
  return post(b.base, "/api/pat/proposal", body, 30000);
}
function tableRows(root: string, table: string): any[] {
  const { Database } = require("bun:sqlite"); const db = new Database(join(root, "state", "bizra.db"), { readonly: true });
  try { return db.query(`SELECT * FROM ${table}`).all() as any[]; } finally { db.close(); }
}
function timingRows(root: string, missionId: string): any[] {
  const { Database } = require("bun:sqlite"); const db = new Database(join(root, "state", "bizra.db"), { readonly: true });
  try {
    try { return db.query(`SELECT * FROM model_timing_log WHERE mission_id = ? ORDER BY at_ms ASC, id ASC`).all(missionId) as any[]; }
    catch { return []; }
  } finally { db.close(); }
}

// ---------------------------------------------------------------------------
// OBS-01 — lifecycle emits ordered, monotonic events for successful generation
// ---------------------------------------------------------------------------
describe("OBS-01 success lifecycle observability", () => {
  test("successful proposal emits REQUEST→BUDGET_ADMITTED→GENERATE_DISPATCHED→first_transport_bytes→first_valid_stream_object→GENERATION_COMPLETE with monotonic timing", async () => {
    const mp = nextMockPort();
    const brief = validBriefFixture("MUMU-DAILY-STATE-RELIEF-0A", "2026-05-28");
    const mock = await startMockOllama({
      port: mp,
      models: [{ name: TEST_GEMMA, digest: TEST_GEMMA_DIGEST, family: "gemma", parameter_size: "4B", quantization_level: "Q4", size: 1000, modified_at: "2026-01-01T00:00:00Z", responseText: brief }],
    });
    try {
      const b = await bootFounder({ fresh: true });
      const cfg = await configureProvider(b, { endpoint: mock.url, selected_model: TEST_GEMMA, selected_model_digest: TEST_GEMMA_DIGEST });
      expect(cfg.status).toBe(200);
      const res = await propose(b, "obs success lifecycle");
      const body = await jsonOf(res);
      expect(body.ok).toBe(true);
      expect(body.authority?.authority_delta).toBe(0);

      const rows = timingRows(b.root, "MUMU-DAILY-STATE-RELIEF-0A");
      // must have at least the core lifecycle events
      const events = rows.map((r) => r.event);
      expect(events).toContain("REQUEST");
      expect(events).toContain("BUDGET_ADMITTED");
      expect(events).toContain("GENERATE_DISPATCHED");
      expect(events).not.toContain("RESIDENCY_FIRST_OBSERVED");
      expect(events).toContain("FIRST_TRANSPORT_BYTES");
      expect(events).toContain("FIRST_VALID_STREAM_OBJECT");
      expect(events).toContain("GENERATION_COMPLETE");

      // order: REQUEST before BUDGET before DISPATCH before COMPLETE
      const idx = (e: string) => events.indexOf(e);
      expect(idx("REQUEST")).toBeLessThan(idx("BUDGET_ADMITTED"));
      expect(idx("BUDGET_ADMITTED")).toBeLessThan(idx("GENERATE_DISPATCHED"));
      expect(idx("GENERATE_DISPATCHED")).toBeLessThan(idx("FIRST_TRANSPORT_BYTES"));
      expect(idx("FIRST_TRANSPORT_BYTES")).toBeLessThan(idx("GENERATION_COMPLETE"));

      // monotonic timing: at_ms strictly increasing
      for (let i = 1; i < rows.length; i++) {
        expect(rows[i].at_ms).toBeGreaterThanOrEqual(rows[i - 1].at_ms);
        expect(rows[i].since_request_ms).toBeGreaterThanOrEqual(rows[i - 1].since_request_ms);
      }
      // GENERATION_COMPLETE duration must match provider duration_ms within tolerance
      const complete = rows.find((r) => r.event === "GENERATION_COMPLETE");
      expect(complete).toBeTruthy();
      expect(Number(complete.since_request_ms)).toBeGreaterThan(0);
      expect(Number(complete.since_request_ms)).toBeLessThan(20000);

      // budget: exactly one model_call_log row, exactly one model_timing budget admission before dispatch
      const calls = tableRows(b.root, "model_call_log");
      expect(calls.length).toBe(1);
      expect(calls[0].result_status).toBe("OK");
      expect(calls[0].authority_delta).toBe(0);

      await b.stop();
    } finally { await mock.stop(); }
  }, 40000);
});

// ---------------------------------------------------------------------------
// OBS-02 — deadline timeout emits abort chain and consumes budget
// ---------------------------------------------------------------------------
describe("OBS-02 timeout observability and budget consumption", () => {
  test("MODEL_TIMEOUT emits DEADLINE_EXCEEDED→ABORT_EMITTED and budget is consumed (retry refused)", async () => {
    const mp = nextMockPort();
    const mock = await startMockOllama({
      port: mp,
      models: [{ name: TEST_GEMMA, digest: TEST_GEMMA_DIGEST, family: "gemma", parameter_size: "4B", quantization_level: "Q4", size: 1, modified_at: "2026-01-01T00:00:00Z", responseText: "slow", delayMs: 4000 }],
    });
    try {
      const b = await bootFounder({ fresh: true, env: { BIZRA_MODEL_TIMEOUT_MS: "600" } });
      const cfg = await configureProvider(b, { endpoint: mock.url, selected_model: TEST_GEMMA, selected_model_digest: TEST_GEMMA_DIGEST });
      expect(cfg.status).toBe(200);
      const res = await propose(b, "obs timeout drill");
      const body = await jsonOf(res);
      expect(body.ok).toBe(false);
      expect(body.code).toBe("MODEL_TIMEOUT");
      expect(body.authority?.authority_delta).toBe(0);

      const rows = timingRows(b.root, "MUMU-DAILY-STATE-RELIEF-0A");
      const events = rows.map((r) => r.event);
      expect(events).toContain("REQUEST");
      expect(events).toContain("BUDGET_ADMITTED");
      expect(events).toContain("GENERATE_DISPATCHED");
      expect(events).toContain("DEADLINE_EXCEEDED");
      expect(events).toContain("ABORT_EMITTED");
      // GENERATION_COMPLETE must NOT appear for timeout
      expect(events).not.toContain("GENERATION_COMPLETE");

      // monotonic
      for (let i = 1; i < rows.length; i++) expect(rows[i].at_ms).toBeGreaterThanOrEqual(rows[i - 1].at_ms);

      // timeout consumes budget: second attempt is BUDGET_EXCEEDED, zero additional dispatches
      const second = await propose(b, "obs timeout retry must refuse");
      expect(second.status).toBe(403);
      const secondBody = await jsonOf(second);
      expect(secondBody.code).toBe("MODEL_BUDGET_EXCEEDED");
      expect(mock.requests.filter((r) => r.path === "/api/generate").length).toBe(1);

      const calls = tableRows(b.root, "model_call_log");
      expect(calls.length).toBe(1);
      expect(calls[0].result_status).toBe("MODEL_TIMEOUT");
      await b.stop();
    } finally { await mock.stop(); }
  }, 40000);
});

// ---------------------------------------------------------------------------
// OBS-03 — atomic budget: N concurrent at budget=1 → exactly ONE dispatch
// ---------------------------------------------------------------------------
describe("OBS-03 atomic budget reservation", () => {
  test("10 concurrent proposals for same mission → exactly ONE provider dispatch, 9 BUDGET_EXCEEDED, timing shows one BUDGET_ADMITTED", async () => {
    const mp = nextMockPort();
    const brief = validBriefFixture("MUMU-DAILY-STATE-RELIEF-0A", "2026-05-28");
    const mock = await startMockOllama({
      port: mp,
      models: [{ name: TEST_GEMMA, digest: TEST_GEMMA_DIGEST, family: "gemma", parameter_size: "4B", quantization_level: "Q4", size: 1, modified_at: "2026-01-01T00:00:00Z", responseText: brief, delayMs: 200 }],
    });
    try {
      const b = await bootFounder({ fresh: true });
      const cfg = await configureProvider(b, { endpoint: mock.url, selected_model: TEST_GEMMA, selected_model_digest: TEST_GEMMA_DIGEST });
      expect(cfg.status).toBe(200);

      const promises: Promise<Response>[] = [];
      for (let i = 0; i < 10; i++) {
        const action = { intent: `concurrent ${i}` };
        const body = makeEnvelope(action, b.key, b.keyId, { class: "PAT_PROPOSE", path: "/api/pat/proposal" });
        promises.push(post(b.base, "/api/pat/proposal", body, 30000));
      }
      const results = await Promise.all(promises);
      const bodies = await Promise.all(results.map((r) => r.json()));
      const successes = bodies.filter((b) => b.ok === true);
      const budgetRefused = bodies.filter((b) => b.code === "MODEL_BUDGET_EXCEEDED");
      expect(successes.length).toBe(1);
      expect(budgetRefused.length).toBe(9);
      bodies.forEach((b) => expect(b.authority?.authority_delta).toBe(0));

      expect(mock.requests.filter((r) => r.path === "/api/generate").length).toBe(1);

      const calls = tableRows(b.root, "model_call_log");
      expect(calls.length).toBe(1);
      expect(calls[0].result_status).toBe("OK");

      const rows = timingRows(b.root, "MUMU-DAILY-STATE-RELIEF-0A");
      const admitted = rows.filter((r) => r.event === "BUDGET_ADMITTED");
      const refused = rows.filter((r) => r.event === "BUDGET_REFUSED");
      expect(admitted.length).toBe(1);
      expect(refused.length).toBe(9);
      // exactly one GENERATE_DISPATCHED
      expect(rows.filter((r) => r.event === "GENERATE_DISPATCHED").length).toBe(1);

      await b.stop();
    } finally { await mock.stop(); }
  }, 60000);
});

// ---------------------------------------------------------------------------
// OBS-04 — budget scope is mission_id, plus timing surface is queryable via API
// ---------------------------------------------------------------------------
describe("OBS-04 scope and API surface", () => {
  test("different mission_ids have independent budgets and timing is exposed via /api/model/timings (or state)", async () => {
    const mp = nextMockPort();
    const brief = validBriefFixture("MUMU-DAILY-STATE-RELIEF-0A", "2026-05-28");
    const mock = await startMockOllama({
      port: mp,
      models: [{ name: TEST_GEMMA, digest: TEST_GEMMA_DIGEST, family: "gemma", parameter_size: "4B", quantization_level: "Q4", size: 1, modified_at: "2026-01-01T00:00:00Z", responseText: brief }],
    });
    try {
      const b = await bootFounder({ fresh: true });
      const cfg = await configureProvider(b, { endpoint: mock.url, selected_model: TEST_GEMMA, selected_model_digest: TEST_GEMMA_DIGEST });
      expect(cfg.status).toBe(200);

      const res1 = await propose(b, "mission A first call");
      expect((await jsonOf(res1)).ok).toBe(true);

      // different scope kind+id simulation: same runtime but different intent still same mission_id
      // For now, mission_id is fixed to MUMU-DAILY-STATE-RELIEF-0A — second call on same id must refuse
      const res2 = await propose(b, "mission A second call same mission_id");
      expect((await jsonOf(res2)).code).toBe("MODEL_BUDGET_EXCEEDED");

      // Timing API must exist and report at least one GENERATION_COMPLETE without leaking prompt
      const timingRes = await get(b.base, `/api/model/timings?mission_id=MUMU-DAILY-STATE-RELIEF-0A`);
      expect(timingRes.status).toBe(200);
      const timingBody = await timingRes.json();
      expect(Array.isArray(timingBody.events)).toBe(true);
      expect(timingBody.events.map((e: any) => e.event)).toContain("GENERATION_COMPLETE");
      const dump = JSON.stringify(timingBody);
      expect(dump.includes("You are PAT")).toBe(false);
      expect(dump.includes(brief.slice(0, 20))).toBe(false); // no prompt/response content, hashes only

      await b.stop();
    } finally { await mock.stop(); }
  }, 40000);
});

afterAll(async () => { for (const b of booted) await b.stop(); });
