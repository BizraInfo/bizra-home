/**
 * BIZRA Node0 — LOCAL-CONTROL-PLANE-SEAL-1B · RED-first control-plane tests.
 *
 * Mission: BIZRA-HOME-LOCAL-CONTROL-PLANE-SEAL-1B (the last control-plane seal
 * before LOCAL-MODEL-PROVIDER-1A). These tests are the SPECIFICATION of:
 *   RF-* reproducibility of the 1A proof at the exact committed head
 *   PB-*  server-side local-control principal binding (key -> principal)
 *   EV-*  evidence schema v2 (digest binds every decision-bearing field)
 *   CO-*  corroboration by trusted producer/domain, not caller strings
 *   TL-*  truthful status projection (reference mode never says NODE0 LIVE)
 *   BK-*  backup semantics (logical SQLite backup; -shm is ephemeral)
 *
 * Safety laws (inherited from the 1A suite):
 *   1. Unique temp state root per test (mkdtemp). The recovered archive is
 *      only ever READ (cp) for seeding — never opened read-write by a test.
 *   2. No model invocation — ever.
 *   3. Kernel-level scenarios run in an ISOLATED SUBPROCESS (scripts/kernel-probe.ts)
 *      so no module state is shared with other test files in combined runs.
 */
import { describe, test, expect, afterAll, afterEach } from "bun:test";
import { mkdtempSync, cpSync, mkdirSync, rmSync, readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, createHmac } from "node:crypto";

const SERVICE = import.meta.dir + "/..";
const REPO = join(SERVICE, "..", "..");
const STATE_SRC = join(SERVICE, "state");
const EVIDENCE = join(REPO, "evidence", "local-control-plane-seal-1b");
const APP_SRC = join(REPO, "src");

const SCHEMA_11 = "bizra.node0.local_action_envelope.v1.1";
const IMPL_COMMIT_1A = "4a72e29c50424cecb33cbac08b5a3ee581674464";
const EXPECTED_ARCHIVE = {
  "bizra.db": "40cf07c52bfaa52b334ef341456f970787f6dc701ffe18ad3c572cb5056dbd70",
  "bizra.db-wal": "bbd11a3539d7551606e2ae8316f05cfc8704d2599bd6b0f0639dd7a1afa3689a",
  "bizra.db-shm": "1b5d645d7fbc135969e55af2ad6abe9f24b4fd34004753bb9e56c2af8120ff2a",
};
const EXPECTED_CHAIN = {
  len: 33,
  head: "a1c441c3a5421805aff2028d4d624b5aafcde3955835aae54db925d477040875",
};

/** Seed an isolated temp state root from the archive bytes (read-only cp). */
function seedRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "bizra-1b-root-"));
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

let portSeq = 18421;
function nextPort() { return portSeq++; }

interface Booted { proc: any; base: string; root: string; stop(): Promise<void> }
const booted: Booted[] = [];

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
  // CONTROL-PLANE-1B hermeticity: poll ONLY this boot's own port (never a
  // fallback port — a live runtime there must never be adopted as our base)
  const deadline = Date.now() + 12000;
  let found = false;
  while (Date.now() < deadline && !found) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(700) });
      if (res.ok) { b.base = `http://127.0.0.1:${port}`; found = true; break; }
    } catch { /* not up yet */ }
    if (!found) await new Promise((r) => setTimeout(r, 250));
  }
  if (!found) throw new Error(`runtime did not become healthy (mode=${opts.mode}): ${stderr.slice(-400)}`);
  booted.push(b);
  return b;
}

async function get(base: string, path: string) {
  return fetch(base + path, { signal: AbortSignal.timeout(6000) });
}
async function post(base: string, path: string, body: unknown) {
  return fetch(base + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
}
const jsonOf = async (res: Response) => await res.json();
const stateOf = async (base: string) => await jsonOf(await get(base, "/api/state"));

const canonical = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "object") {
    if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
    const keys = Object.keys(v as any).sort();
    return "{" + keys.filter((k) => (v as any)[k] !== undefined).map((k) => JSON.stringify(k) + ":" + canonical((v as any)[k])).join(",") + "}";
  }
  return JSON.stringify(v);
};
const sha256hex = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");

/** Run the REAL initializer command against a temp root. Returns non-secret identifiers. */
function initControlKey(root: string, extra: string[] = []): { code: number; stdout: string; stderr: string } {
  const res = spawnSync("bun", ["src/init-control-key.ts", ...extra], {
    cwd: SERVICE,
    env: { ...process.env, BIZRA_STATE_ROOT: root } as any,
    encoding: "utf8",
    timeout: 20000,
  });
  return { code: res.status ?? -1, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

interface RegistryFile { entries: Array<Record<string, unknown>> }
function readRegistry(root: string): RegistryFile | null {
  const p = join(root, "keys", "principals.json");
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")) as RegistryFile;
}

function keyIdOf(root: string): string | null {
  const dir = join(root, "keys");
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.endsWith(".key"));
  return files.length ? files[0].slice(0, -".key".length) : null;
}
function keyBytesOf(root: string, keyId: string): Buffer {
  return readFileSync(join(root, "keys", `${keyId}.key`));
}

/** Build a v1.1 envelope. MAC binds method + path + request hash + all fields. */
function makeEnvelope11(
  action: unknown,
  key: Buffer,
  keyId: string,
  opts: { method?: string; path?: string; actorId?: string; nonce?: string; expiresInSec?: number; class?: string },
) {
  const now = Date.now();
  const env: any = {
    schema: SCHEMA_11,
    key_id: keyId,
    nonce: opts.nonce ?? randomBytes(16).toString("hex"),
    action_id: randomBytes(16).toString("hex"),
    action_class: opts.class ?? "TRACE_INGEST",
    method: opts.method ?? "POST",
    path: opts.path ?? "/api/trace",
    request_sha256: sha256hex(canonical(action)),
    intent_sha256: sha256hex(canonical((action as any)?.intent ?? "1b test intent")),
    issued_at: new Date(now).toISOString(),
    expires_at: new Date(now + (opts.expiresInSec ?? 60) * 1000).toISOString(),
  };
  if (opts.actorId !== undefined) env.actor_id = opts.actorId; // descriptive only
  env.mac = createHmac("sha256", key).update(canonical(env)).digest("hex");
  return { action, envelope: env };
}

/** Run a kernel scenario in an isolated subprocess over a temp root. */
function kernelProbe(root: string, scenario: string): any {
  const res = spawnSync("bun", ["scripts/kernel-probe.ts", scenario], {
    cwd: SERVICE,
    env: { ...process.env, BIZRA_STATE_ROOT: root, BIZRA_RUNTIME_MODE: "LOCAL_FOUNDER", BIZRA_BIND_HOST: "127.0.0.1", BIZRA_PORT: String(nextPort()) } as any,
    encoding: "utf8",
    timeout: 40000,
  });
  if (res.status !== 0) throw new Error(`kernel-probe ${scenario} failed: ${(res.stderr || res.stdout || "").slice(-500)}`);
  const out = (res.stdout ?? "").trim().split("\n").filter((l) => l.startsWith("{"));
  return JSON.parse(out[out.length - 1]);
}

/** Walk a receipt chain on a db file (readonly, independent of runtime code). */
function walkChain(dbPath: string): { len: number; ok: boolean; head: string | null; brokenAt: number | null } {
  const { Database } = require("bun:sqlite");
  const db = new Database(dbPath, { readonly: true });
  const rows = db.query("SELECT seq, kind, subject, payload, prev, digest FROM receipts ORDER BY seq ASC").all() as any[];
  let prev = "GENESIS-0";
  let brokenAt: number | null = null;
  for (const r of rows) {
    const expect = sha256hex(`${prev}|${r.kind}|${r.subject}|${r.payload}`);
    if (r.prev !== prev || r.digest !== expect) { brokenAt = r.seq; break; }
    prev = r.digest;
  }
  const head = rows.length ? rows[rows.length - 1].digest : null;
  db.close();
  return { len: rows.length, ok: brokenAt === null, head, brokenAt };
}

afterAll(async () => { for (const b of booted) await b.stop(); });
afterEach(async () => { for (const b of booted) await b.stop(); booted.length = 0; });

// ---------------------------------------------------------------------------
// RF — REPRODUCIBILITY
// ---------------------------------------------------------------------------
describe("RF reproducibility of the 1A proof", () => {
  test("RF-01 every path in the 1A receipt manifest resolves and hashes correctly (at the 1A implementation commit, missing entry superseded)", () => {
    const res = spawnSync("bun", ["scripts/verify-receipt-manifest.ts", "--at-commit", IMPL_COMMIT_1A, "--supersede", join(EVIDENCE, "SUPERSEDE_1A.json")], {
      cwd: SERVICE, encoding: "utf8", timeout: 30000,
    });
    expect(res.status).toBe(0);
    const out = res.stdout ?? "";
    expect(out).toMatch(/19 MATCH/);
    expect(out).toMatch(/1 SUPERSEDED/);
    expect(out).not.toMatch(/^\s*(MISSING|MISMATCH)/m); // no per-path MISSING/MISMATCH verdict lines
  }, 40000);

  test("RF-02 the local control-key initializer is tracked by Git and not ignored", () => {
    const path = "mini-services/bizra-runtime/src/init-control-key.ts";
    const ignored = spawnSync("git", ["-C", REPO, "check-ignore", path], { encoding: "utf8" });
    expect(ignored.status).not.toBe(0); // not ignored
    expect((ignored.stdout ?? "").trim()).toBe("");
    const tracked = spawnSync("git", ["-C", REPO, "ls-files", "--error-unmatch", path], { encoding: "utf8" });
    expect(tracked.status).toBe(0); // in the index/committed
    expect(existsSync(join(REPO, path))).toBe(true);
  }, 20000);

  test("RF-03 preserved test outputs contain full pass/fail bodies, not only a tool banner", () => {
    const repro = readFileSync(join(EVIDENCE, "BOUNDARY_1A_REPRO_RED.txt"), "utf8");
    expect(repro.length).toBeGreaterThan(500);
    expect(repro).toMatch(/\(fail\)/);
    expect(repro).toMatch(/\(pass\)/);
    expect(repro).toMatch(/local-init/);
    const red = readFileSync(join(EVIDENCE, "CONTROL_PLANE_1B_RED.txt"), "utf8");
    expect(red.length).toBeGreaterThan(500);
    expect(red).toMatch(/fail/i);
  }, 20000);
});

// ---------------------------------------------------------------------------
// PB — LOCAL CONTROL PRINCIPAL BINDING
// ---------------------------------------------------------------------------
describe("PB local control principal binding", () => {
  test("PB-01 one key signing actor_id 'alice' and 'bob' resolves to ONE authoritative local-control principal", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    const init = initControlKey(b.root);
    expect(init.code).toBe(0);
    const keyId = keyIdOf(b.root)!;
    const key = keyBytesOf(b.root, keyId);
    const reg = readRegistry(b.root)!;
    const rec: any = reg.entries.find((e: any) => e.key_id === keyId)!;
    const principal = rec.local_control_principal_id;

    const r1 = await post(b.base, "/api/trace", makeEnvelope11({ intent: "pb1", kind: "observation", payload: "alice-label" }, key, keyId, { actorId: "alice" }));
    expect(r1.status).toBe(200);
    const b1 = await jsonOf(r1);
    expect(b1.principal.local_control_principal_id).toBe(principal);
    expect(b1.principal.local_control_principal_id).not.toBe("alice");

    const r2 = await post(b.base, "/api/trace", makeEnvelope11({ intent: "pb1", kind: "observation", payload: "bob-label" }, key, keyId, { actorId: "bob" }));
    expect(r2.status).toBe(200);
    const b2 = await jsonOf(r2);
    expect(b2.principal.local_control_principal_id).toBe(principal);

    const st = await stateOf(b.base);
    const tA = st.traces.last.find((t: any) => t.actor_id === "alice");
    const tB = st.traces.last.find((t: any) => t.actor_id === "bob");
    expect(tA.local_control_principal_id).toBe(principal);
    expect(tB.local_control_principal_id).toBe(principal);
    expect(tA.actor_id).toBe("alice"); // descriptive metadata only
    expect(tB.actor_id).toBe("bob");
  }, 40000);

  test("PB-02 one key cannot claim SAT-1, runtime, DEMA, another registered principal, or reserved labels", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    initControlKey(b.root);
    const keyId = keyIdOf(b.root)!;
    const key = keyBytesOf(b.root, keyId);
    // register a second principal so 'another registered principal' is a real target
    const reg = readRegistry(b.root)!;
    reg.entries.push({ key_id: "observerkey00000000", local_control_principal_id: "local:mumu:observer", authority_class: "LOCAL_CAPABILITY_ONLY", canonical_principal_status: "ABSENT", created_at: new Date().toISOString(), status: "ACTIVE" });
    const regPath = join(b.root, "keys", "principals.json");
    require("node:fs").writeFileSync(regPath, JSON.stringify(reg, null, 2));

    const before = await stateOf(b.base);
    const claims = ["SAT-1", "runtime", "DEMA", "mission", "NODE0", "FATE", "operator", "local:mumu:founder-control", "local:mumu:observer", "internal:runtime"];
    for (const claim of claims) {
      const r = await post(b.base, "/api/trace", makeEnvelope11({ intent: "pb2", kind: "observation", payload: `claim-${claim}` }, key, keyId, { actorId: claim }));
      expect([403, 401]).toContain(r.status);
      const body = await jsonOf(r);
      expect(String(body.reason ?? "")).toMatch(/ACTOR_LABEL|RESERVED|REFUSED/i);
    }
    const after = await stateOf(b.base);
    expect(after.traces.stats.total).toBe(before.traces.stats.total);
    expect(after.chain.len).toBe(before.chain.len);
    // zero nonces burned by refusals
    const { Database } = require("bun:sqlite");
    const db = new Database(join(b.root, "state", "bizra.db"), { readonly: true });
    const n = (db.query("SELECT COUNT(*) AS n FROM action_nonces").get() as any).n;
    db.close();
    expect(n).toBe(0);
  }, 40000);

  test("PB-03 unknown key_id refuses with ZERO mutation (nonce, trace, receipt, mission, state)", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    initControlKey(b.root);
    const realKey = keyBytesOf(b.root, keyIdOf(b.root)!);
    const fakeKeyId = "00000000deadbeef";
    const before = await stateOf(b.base);
    const r = await post(b.base, "/api/trace", makeEnvelope11({ intent: "pb3", kind: "observation", payload: "unknown-key" }, realKey, fakeKeyId, {}));
    expect([403, 401]).toContain(r.status);
    const body = await jsonOf(r);
    expect(String(body.reason ?? "")).toMatch(/UNKNOWN_KEY/i);
    const after = await stateOf(b.base);
    expect(after.traces.stats.total).toBe(before.traces.stats.total);
    expect(after.chain.len).toBe(before.chain.len);
    expect(after.missions.length).toBe(before.missions.length);
    const { Database } = require("bun:sqlite");
    const db = new Database(join(b.root, "state", "bizra.db"), { readonly: true });
    const n = (db.query("SELECT COUNT(*) AS n FROM action_nonces").get() as any).n;
    db.close();
    expect(n).toBe(0);
  }, 40000);

  test("PB-04 the browser never receives the HMAC secret; no generic sign-arbitrary-payload endpoint exists", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    initControlKey(b.root);
    const keyId = keyIdOf(b.root)!;
    const key = keyBytesOf(b.root, keyId);
    const keyHex = key.toString("hex");

    for (const path of ["/api/state", "/api/health", "/api/verify", "/api/dema", "/api/contracts"]) {
      const res = await get(b.base, path);
      const text = await res.text();
      expect(text).not.toContain(keyHex);
    }
    const r = await post(b.base, "/api/trace", makeEnvelope11({ intent: "pb4", kind: "observation", payload: "no-secret-leak" }, key, keyId, {}));
    expect(r.status).toBe(200);
    expect(await r.text()).not.toContain(keyHex);

    // no generic signing oracle on the surface
    for (const path of ["/api/sign", "/api/envelope", "/api/mac", "/api/keys", "/api/hmac"]) {
      for (const method of ["GET", "POST"]) {
        const res = method === "GET" ? await get(b.base, path) : await post(b.base, path, { payload: "sign this" });
        expect(res.status).toBe(404);
      }
    }
    // source-level: the HTTP surface never computes a MAC over caller input
    const serverSrc = readFileSync(join(SERVICE, "src", "server.ts"), "utf8");
    expect(serverSrc).not.toContain("createHmac");
    expect(serverSrc).not.toContain("/api/sign");
  }, 40000);

  test("PB-05 local-control identity is explicitly LOCAL_CAPABILITY_ONLY — never the canonical principal", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    initControlKey(b.root);
    const keyId = keyIdOf(b.root)!;
    const rec: any = readRegistry(b.root)!.entries.find((e: any) => e.key_id === keyId)!;
    expect(rec.authority_class).toBe("LOCAL_CAPABILITY_ONLY");
    expect(rec.canonical_principal_status).toBe("ABSENT");

    const key = keyBytesOf(b.root, keyId);
    const r = await post(b.base, "/api/trace", makeEnvelope11({ intent: "pb5", kind: "observation", payload: "labels" }, key, keyId, {}));
    const body = await jsonOf(r);
    expect(body.principal.authority_class).toBe("LOCAL_CAPABILITY_ONLY");
    expect(body.principal.canonical_principal_status).toBe("ABSENT");

    // the registry code never names itself sovereign/canonical
    const regSrc = readFileSync(join(SERVICE, "src", "principal-registry.ts"), "utf8");
    expect(regSrc).not.toMatch(/sovereign|canonical activation|PrincipalActivation/i);
  }, 40000);
});

// ---------------------------------------------------------------------------
// EV — EVIDENCE SCHEMA V2
// ---------------------------------------------------------------------------
describe("EV evidence binding", () => {
  test("EV-01 the trace digest binds ALL decision-bearing fields — tampering any one breaks verification", () => {
    const root = seedRoot();
    const probe = kernelProbe(root, "ev01_tamper");
    const fields = ["ts", "source", "kind", "correlation", "payload", "local_control_principal_id", "producer_id", "evidence_domain", "artifact_hash", "evidence_version"];
    for (const f of fields) {
      expect(probe.fields[f]?.digest_changed).toBe(true);
      expect(probe.fields[f]?.provenance_failed).toBe(true);
    }
    rmSync(root, { recursive: true, force: true });
  }, 60000);

  test("EV-02 archived v1 traces are readable history but cannot satisfy a v2 corroboration decision", () => {
    const root = seedRoot();
    const probe = kernelProbe(root, "ev02_legacy");
    expect(probe.provenance_pass).toBe(true);   // readable historical records
    expect(probe.corroboration_pass).toBe(false); // not eligible for v2 decisions
    expect(String(prove_reason(probe))).toMatch(/v1|legacy|ineligible/i);
    rmSync(root, { recursive: true, force: true });
  }, 60000);

  test("EV-03 caller-supplied source/producer/domain/principal/actor/role/agent fields are descriptive-only or refused", async () => {
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    initControlKey(b.root);
    const keyId = keyIdOf(b.root)!;
    const key = keyBytesOf(b.root, keyId);
    const rec: any = readRegistry(b.root)!.entries.find((e: any) => e.key_id === keyId)!;
    const action = {
      intent: "ev3",
      kind: "observation",
      payload: "spoof-attempt",
      source: "runtime",
      producer_id: "receipt_chain_observer",
      evidence_domain: "RECEIPT_STATE",
      principal_id: "local:evil:spoof",
      actor_id: "somebody-else",
      role: "SAT",
      agent_id: "NODE0",
    };
    const r = await post(b.base, "/api/trace", makeEnvelope11(action, key, keyId, { actorId: "somebody-else" }));
    expect(r.status).toBe(200);
    const st = await stateOf(b.base);
    const t = st.traces.last[0];
    expect(t.source).toBe("external_operator");                       // derived
    expect(t.producer_id).toBe("operator_input_adapter");             // derived
    expect(t.evidence_domain).toBe("OPERATOR_STATEMENT");             // derived
    expect(t.local_control_principal_id).toBe(rec.local_control_principal_id); // server-resolved
    expect(t.producer_id).not.toBe("receipt_chain_observer");
    expect(t.evidence_domain).not.toBe("RECEIPT_STATE");
    expect(t.local_control_principal_id).not.toBe("local:evil:spoof");
  }, 40000);
});
function prove_reason(p: any): string { return (p.detail ?? p.reason ?? "") as string; }

// ---------------------------------------------------------------------------
// CO — CORROBORATION
// ---------------------------------------------------------------------------
describe("CO corroboration by trusted producer/domain", () => {
  test("CO-01 one bound local principal under ten labels counts as ONE operator evidence domain", () => {
    const root = seedRoot();
    const probe = kernelProbe(root, "co01_labels");
    expect(probe.corroboration_pass).toBe(false);
    expect(probe.domain_count).toBe(1);
    rmSync(root, { recursive: true, force: true });
  }, 60000);

  test("CO-02 the same artifact hash resubmitted under different labels or nonces adds no corroboration weight", () => {
    const root = seedRoot();
    const probe = kernelProbe(root, "co02_same_artifact");
    expect(probe.corroboration_pass).toBe(false);
    expect(probe.domain_count).toBe(1);
    rmSync(root, { recursive: true, force: true });
  }, 60000);

  test("CO-03 repeated observations from the same producer/domain count once for independence", () => {
    const root = seedRoot();
    const probe = kernelProbe(root, "co03_repeat_domain");
    expect(probe.corroboration_pass).toBe(false);
    expect(probe.domain_count).toBe(1);
    rmSync(root, { recursive: true, force: true });
  }, 60000);

  test("CO-04 two distinct trusted producer/domains with distinct artifact hashes satisfy a two-source rule", () => {
    const root = seedRoot();
    const probe = kernelProbe(root, "co04_two_domains");
    expect(probe.corroboration_pass).toBe(true);
    expect(probe.domain_count).toBe(2);
    rmSync(root, { recursive: true, force: true });
  }, 60000);

  test("CO-05 Node0/N=1 never pretends one HMAC key represents multiple humans", () => {
    const root = seedRoot();
    const probe = kernelProbe(root, "co05_n1");
    expect(probe.all_principals_identical).toBe(true);
    expect(probe.corroboration_pass).toBe(false);
    expect(probe.domain_count).toBe(1);
    rmSync(root, { recursive: true, force: true });
  }, 60000);
});

// ---------------------------------------------------------------------------
// TL — TRUTH PROJECTION
// ---------------------------------------------------------------------------
describe("TL truthful status projection", () => {
  test("TL-01 PUBLIC_REFERENCE health/state: REFERENCE_ONLINE · node0_active=false · actions_enabled=false — never LIVE", async () => {
    const b = await bootRuntime({ mode: "PUBLIC_REFERENCE" });
    const health = await jsonOf(await get(b.base, "/api/health"));
    expect(health.mode).toBe("PUBLIC_REFERENCE");
    expect(health.status).toBe("REFERENCE_ONLINE");
    expect(health.node0_active).toBe(false);
    expect(health.actions_enabled).toBe(false);
    expect(health.phase).toBe("PUBLIC_REFERENCE");
    expect(health.status).not.toBe("LIVE");

    const st = await stateOf(b.base);
    expect(st.runtime.status).toBe("REFERENCE_ONLINE");
    expect(st.runtime.node0_active).toBe(false);
    expect(st.runtime.actions_enabled).toBe(false);
    expect(st.runtime.mode).toBe("PUBLIC_REFERENCE");
  }, 40000);

  test("TL-02 public Home displays REFERENCE ARCHIVE ONLINE — never NODE0 LIVE in reference mode", async () => {
    const mod: any = await import("../../../src/components/bizra/runtime-status").catch(() => null);
    expect(mod).not.toBeNull();
    expect(mod.REFERENCE_LABEL).toMatch(/REFERENCE ARCHIVE ONLINE/i);
    expect(mod.NODE0_ACTIVE_FALSE_LABEL).toMatch(/NODE0 ACTIVE = FALSE/i);
    expect(mod.LIVE_LABEL).toBe("NODE0 LIVE");
    // reference mode classifies as REFERENCE — never LIVE
    expect(mod.classifyRuntime({ mode: "PUBLIC_REFERENCE", status: "REFERENCE_ONLINE", node0_active: false })).toBe("REFERENCE");
    // a tampered status string must NOT upgrade reference mode to LIVE
    expect(mod.classifyRuntime({ mode: "PUBLIC_REFERENCE", status: "LIVE", node0_active: true })).toBe("REFERENCE");
    // components render the label from the helper: the literal exists ONLY there
    const offenders: string[] = [];
    const dirs = [join(APP_SRC, "components", "bizra"), join(APP_SRC, "components", "node0")];
    for (const dir of dirs) {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".tsx") && !f.endsWith(".ts")) continue;
        const p = join(dir, f);
        if (p.endsWith("runtime-status.ts")) continue;
        const text = readFileSync(p, "utf8");
        if (text.includes("NODE0 LIVE")) offenders.push(`'NODE0 LIVE' literal in ${p}`);
      }
    }
    expect(offenders).toEqual([]);
  }, 20000);

  test("TL-03 only LOCAL_FOUNDER + bound + commissioned (node0_active=true) displays NODE0 LIVE", async () => {
    const mod: any = await import("../../../src/components/bizra/runtime-status").catch(() => null);
    expect(mod).not.toBeNull();
    expect(mod.classifyRuntime({ mode: "LOCAL_FOUNDER", status: "LIVE", node0_active: true })).toBe("LIVE");
    expect(mod.classifyRuntime({ mode: "LOCAL_FOUNDER", status: "LIVE", node0_active: false })).not.toBe("LIVE");
    expect(mod.classifyRuntime({ mode: "LOCAL_FOUNDER", status: "HALTED", node0_active: true })).not.toBe("LIVE");
    // runtime side: a LOCAL_FOUNDER boot (bound + commissioned) reports node0_active=true
    const b = await bootRuntime({ mode: "LOCAL_FOUNDER", host: "127.0.0.1" });
    const health = await jsonOf(await get(b.base, "/api/health"));
    expect(health.mode).toBe("LOCAL_FOUNDER");
    expect(health.node0_active).toBe(true);
    expect(health.actions_enabled).toBe(true);
    expect(health.status).toBe("LIVE");
  }, 40000);

  test("TL-04 constitutional copy claims hash-sealing and drift detection — no physical immutability claim", async () => {
    const b = await bootRuntime({ mode: "PUBLIC_REFERENCE" });
    const st = await stateOf(b.base);
    expect(st.constitution.law).toMatch(/hash-sealed/i);
    expect(st.constitution.law).toMatch(/drift/i);
    expect(st.constitution.law).not.toMatch(/unchangeable|immutable/i);
    // app surfaces: the 1A-era immutability wordings are gone
    const offenders: string[] = [];
    const checks: Array<[string, RegExp]> = [
      [join(APP_SRC, "components", "bizra", "proof.tsx"), /chip="Immutable"|unchangeable/i],
      [join(APP_SRC, "components", "node0", "shoulder.tsx"), /immutable even by/i],
      [join(APP_SRC, "components", "node0", "vault.tsx"), /unchangeable|immutable even/i],
    ];
    for (const [p, re] of checks) {
      if (!existsSync(p)) { offenders.push(`missing ${p}`); continue; }
      const text = readFileSync(p, "utf8");
      if (re.test(text)) offenders.push(`immutability claim in ${p}`);
    }
    expect(offenders).toEqual([]);
  }, 40000);
});

// ---------------------------------------------------------------------------
// BK — BACKUP SEMANTICS
// ---------------------------------------------------------------------------
describe("BK backup semantics", () => {
  test("BK-01 a logically consistent SQLite backup restores 33/33 chain records and the exact chain head", () => {
    const root = seedRoot();
    const out = join(root, "logical-backup.db");
    const res = spawnSync("bun", ["scripts/logical-backup.ts", "--source", join(root, "state"), "--out", out], {
      cwd: SERVICE, encoding: "utf8", timeout: 60000,
    });
    expect(res.status).toBe(0);
    const report = JSON.parse((res.stdout ?? "").trim().split("\n").filter((l) => l.startsWith("{")).pop()!);
    expect(report.receipts).toBe(EXPECTED_CHAIN.len);
    expect(report.links_ok).toBe(EXPECTED_CHAIN.len);
    expect(report.head).toBe(EXPECTED_CHAIN.head);
    // independent in-test walk of the produced backup
    const walk = walkChain(out);
    expect(walk.len).toBe(EXPECTED_CHAIN.len);
    expect(walk.ok).toBe(true);
    expect(walk.head).toBe(EXPECTED_CHAIN.head);
    rmSync(root, { recursive: true, force: true });
  }, 90000);

  test("BK-02 -shm is recorded as ephemeral coordination state and excluded from immutable backup identity", () => {
    const root = seedRoot();
    const out = join(root, "logical-backup.db");
    const res = spawnSync("bun", ["scripts/logical-backup.ts", "--source", join(root, "state"), "--out", out], {
      cwd: SERVICE, encoding: "utf8", timeout: 60000,
    });
    expect(res.status).toBe(0);
    const report = JSON.parse((res.stdout ?? "").trim().split("\n").filter((l) => l.startsWith("{")).pop()!);
    expect(report.shm_policy.excluded).toBe(true);
    expect(String(report.shm_policy.reason)).toMatch(/ephemeral|coordination/i);
    // the backup artifact set contains no -shm file
    expect(existsSync(out)).toBe(true);
    expect(existsSync(out + "-shm")).toBe(false);
    expect(existsSync(out + "-wal")).toBe(false);
    rmSync(root, { recursive: true, force: true });
  }, 90000);

  test("BK-03 the original archive db, wal, and shm hashes remain unchanged", () => {
    for (const [f, expected] of Object.entries(EXPECTED_ARCHIVE)) {
      const p = join(STATE_SRC, f);
      expect(existsSync(p)).toBe(true);
      expect(sha256hex(readFileSync(p))).toBe(expected);
    }
  }, 20000);
});
