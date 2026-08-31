/**
 * BIZRA Node0 — durable store (SQLite, WAL).
 * Everything that must survive process death lives here:
 * the receipt chain, the lease registry, the constitution manifest,
 * the engine contracts, traces, hypotheses, transitions, missions, Dema.
 * The chain is the durable truth; SQLite is its home.
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

const ROOT = dirname(import.meta.dir); // mini-services/bizra-runtime
export const STATE_DIR = join(ROOT, "state");
export const VAULT_DIR = join(STATE_DIR, "vault");
export const OUTBOX_DIR = join(STATE_DIR, "outbox");
export const DB_PATH = join(STATE_DIR, "bizra.db");
export const ROOT_DIR = ROOT;

mkdirSync(STATE_DIR, { recursive: true });
mkdirSync(OUTBOX_DIR, { recursive: true });

export const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = FULL;");

db.exec(`
CREATE TABLE IF NOT EXISTS node0 (
  key TEXT PRIMARY KEY, value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS constitution (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, role TEXT NOT NULL, path TEXT NOT NULL,
  bytes INTEGER NOT NULL, sha256 TEXT NOT NULL, sealed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS receipts (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, kind TEXT NOT NULL, subject TEXT NOT NULL,
  payload TEXT NOT NULL, prev TEXT NOT NULL, digest TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS contracts (
  key TEXT PRIMARY KEY, value TEXT NOT NULL,
  min TEXT NOT NULL, max TEXT NOT NULL,
  updated_at TEXT, updated_by TEXT
);
CREATE TABLE IF NOT EXISTS leases (
  id TEXT PRIMARY KEY, ts TEXT NOT NULL, subject TEXT NOT NULL,
  purpose TEXT NOT NULL, network INTEGER NOT NULL, fs_scope TEXT NOT NULL,
  ttl_ms INTEGER NOT NULL, expires_at INTEGER NOT NULL,
  single_use INTEGER NOT NULL, consumed_at INTEGER, status TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS traces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, source TEXT NOT NULL, kind TEXT NOT NULL,
  correlation TEXT, payload TEXT NOT NULL, sha256 TEXT NOT NULL,
  admissible INTEGER NOT NULL, gate_reason TEXT
);
CREATE TABLE IF NOT EXISTS hypotheses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, cycle_id TEXT NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL,
  hypothesis TEXT, target_contract TEXT, before_value TEXT, after_value TEXT,
  dod TEXT, cited_traces TEXT, proposal_sha256 TEXT, detail TEXT,
  model_calls INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS transitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, cycle_id TEXT NOT NULL, contract_key TEXT NOT NULL,
  before_value TEXT NOT NULL, after_value TEXT NOT NULL,
  hypothesis_id INTEGER, receipt_seq INTEGER,
  reverted INTEGER NOT NULL DEFAULT 0, reverted_at TEXT, revert_receipt_seq INTEGER
);
CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY, attempt_id TEXT NOT NULL, status TEXT NOT NULL,
  effect_path TEXT, effect_sha256 TEXT, receipt_seq INTEGER,
  ladder TEXT, started_at TEXT, finished_at TEXT, result TEXT,
  effect_writes INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS dema (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, subject TEXT NOT NULL, status TEXT NOT NULL,
  reason TEXT, receipt_digest TEXT
);
CREATE TABLE IF NOT EXISTS pat_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, subject TEXT NOT NULL, purpose TEXT NOT NULL,
  mode TEXT NOT NULL, status TEXT NOT NULL, calls INTEGER NOT NULL, detail TEXT
);
CREATE TABLE IF NOT EXISTS sat_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, subject TEXT NOT NULL, verdict TEXT NOT NULL,
  clauses TEXT, reason TEXT
);
CREATE TABLE IF NOT EXISTS cycles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL, cycle_id TEXT NOT NULL, status TEXT NOT NULL, detail TEXT
);
`);

export function one<T = any>(sql: string, ...params: unknown[]): T | null {
  return (db.query(sql).get(...params) as T) ?? null;
}
export function all<T = any>(sql: string, ...params: unknown[]): T[] {
  return db.query(sql).all(...params) as T[];
}
export function run(sql: string, ...params: unknown[]): void {
  db.query(sql).run(...params);
}
export function kv(key: string, value?: string): string | null {
  if (value !== undefined) {
    run(
      "INSERT INTO node0 (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key, value,
    );
    return value;
  }
  return one<{ value: string }>("SELECT value FROM node0 WHERE key = ?", key)?.value ?? null;
}
