/**
 * BIZRA Node0 — nonce race stress (CONTROL-PLANE-SEAL-1B, Phase 4).
 *
 * Boots a LOCAL_FOUNDER runtime on an isolated temp root, then runs
 * REPEATED two-request same-nonce races. Every race must have EXACTLY ONE
 * winner (HTTP 200) and one loser (HTTP 403 NONCE_REPLAY) — the atomic
 * single-INSERT primary-key law, exercised under real concurrency.
 *
 * Usage: bun scripts/nonce-race.ts [races]   (default 100)
 */
import { mkdtempSync, cpSync, mkdirSync, rmSync, existsSync, readFileSync, readdirSync, writeFileSync, chmodSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SERVICE = import.meta.dir + "/..";
const STATE_SRC = join(SERVICE, "state");
const RACES = Number(process.argv[2] ?? 100);
const PORT = 19421;

const root = mkdtempSync(join(tmpdir(), "bizra-1b-race-"));
const state = join(root, "state");
mkdirSync(state, { recursive: true });
for (const f of ["bizra.db", "bizra.db-wal", "bizra.db-shm"]) {
  if (existsSync(join(STATE_SRC, f))) cpSync(join(STATE_SRC, f), join(state, f));
}
for (const d of ["vault", "shoulder", "outbox"]) {
  try { cpSync(join(STATE_SRC, d), join(state, d), { recursive: true }); } catch { /* optional */ }
}
mkdirSync(join(root, "keys"), { recursive: true });

// initializer: the real command
const init = spawn("bun", ["src/init-control-key.ts"], {
  cwd: SERVICE, env: { ...process.env, BIZRA_STATE_ROOT: root }, stdio: ["ignore", "pipe", "pipe"],
});
await new Promise((res) => init.on("exit", res));
const keyFile = readdirSync(join(root, "keys")).find((f) => f.endsWith(".key"))!;
const keyId = keyFile.slice(0, -".key".length);
const key = readFileSync(join(root, "keys", keyFile));

const proc = spawn("bun", ["index.ts"], {
  cwd: SERVICE,
  env: { ...process.env, BIZRA_RUNTIME_MODE: "LOCAL_FOUNDER", BIZRA_STATE_ROOT: root, BIZRA_BIND_HOST: "127.0.0.1", BIZRA_PORT: String(PORT) },
  stdio: ["ignore", "pipe", "pipe"],
});
const base = `http://127.0.0.1:${PORT}`;
const deadline = Date.now() + 15000;
for (;;) {
  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(700) });
    if (res.ok) break;
  } catch { /* not up yet */ }
  if (Date.now() > deadline) { console.error("runtime did not become healthy"); process.exit(1); }
  await new Promise((r) => setTimeout(r, 250));
}

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

function raceEnvelope(nonce: string) {
  const action = { intent: `race`, kind: "observation", payload: `race-${nonce.slice(0, 8)}` };
  const env: any = {
    schema: "bizra.node0.local_action_envelope.v1.1",
    key_id: keyId,
    nonce,
    action_id: randomBytes(16).toString("hex"),
    action_class: "TRACE_INGEST",
    method: "POST",
    path: "/api/trace",
    request_sha256: sha256hex(canonical(action)),
    intent_sha256: sha256hex(canonical(action.intent)),
    issued_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60_000).toISOString(),
  };
  env.mac = createHmac("sha256", key).update(canonical(env)).digest("hex");
  return { action, envelope: env };
}

const failures: string[] = [];
let totalWinners = 0;
for (let i = 0; i < RACES; i++) {
  const nonce = randomBytes(16).toString("hex");
  const body = raceEnvelope(nonce);
  const payload = JSON.stringify(body);
  const [r1, r2] = await Promise.all([
    fetch(`${base}/api/trace`, { method: "POST", headers: { "content-type": "application/json" }, body: payload, signal: AbortSignal.timeout(15000) }),
    fetch(`${base}/api/trace`, { method: "POST", headers: { "content-type": "application/json" }, body: payload, signal: AbortSignal.timeout(15000) }),
  ]);
  const winners = [r1.status, r2.status].filter((s) => s === 200).length;
  const losers = [r1.status, r2.status].filter((s) => s === 403).length;
  if (winners !== 1 || losers !== 1) {
    const loserBody = losers > 0 ? await (r1.status === 403 ? r1 : r2).text() : "";
    failures.push(`race #${i + 1}: statuses [${r1.status}, ${r2.status}] — expected exactly one 200 and one 403 (${loserBody.slice(0, 120)})`);
  } else {
    totalWinners++;
  }
}

proc.kill(9);
await new Promise((r) => setTimeout(r, 200));

console.log(
  JSON.stringify({
    ok: failures.length === 0,
    races: RACES,
    exactly_one_winner: totalWinners,
    failed_races: failures.length,
    failures: failures.slice(0, 10),
    law: "one INSERT on the nonce PRIMARY KEY — exactly one winner per nonce, ever",
  }),
);
rmSync(root, { recursive: true, force: true });
process.exit(failures.length === 0 ? 0 : 1);
