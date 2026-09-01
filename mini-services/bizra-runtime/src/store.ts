/**
 * BIZRA Node0 — durable store (SQLite, WAL) with the LOCAL-SOVEREIGN boundary.
 *
 * BIZRA_STATE_ROOT rules (BOUNDARY-1A §2.2):
 *   - PUBLIC_REFERENCE (safe default): the archive state dir (or BIZRA_STATE_ROOT)
 *     is READ-ONLY historical evidence. The DB triple (db, -wal, -shm) is
 *     snapshotted to an ephemeral temp dir at open; the runtime serves state
 *     from the snapshot. Original archive bytes are never opened for write.
 *     No schema DDL runs in this mode. Nothing is ever appended.
 *   - LOCAL_FOUNDER: an explicit root OUTSIDE the source tree, opened live.
 *     Schema DDL (including action_nonces + traces.actor_id) runs here only.
 *   - Tests provide unique temp roots; the recovered archive is never migrated
 *     silently or at all.
 */
import { Database } from "bun:sqlite";
import { mkdirSync, cpSync, existsSync, mkdtempSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { resolveMode } from "./mode";

const ROOT = dirname(import.meta.dir); // mini-services/bizra-runtime

const RESOLVED = resolveMode(ROOT);

export const RUNTIME_MODE = RESOLVED.mode;
/** The state directory: <state-root>/state when a root is given, else the service's own archive dir. */
export const STATE_DIR = RESOLVED.stateRoot ? join(RESOLVED.stateRoot, "state") : join(ROOT, "state");
export const VAULT_DIR = join(STATE_DIR, "vault");
export const OUTBOX_DIR = join(STATE_DIR, "outbox");
/** Local control keys live at the state ROOT (outside the state dir), never in the repo. */
export const KEYS_DIR = RESOLVED.stateRoot ? join(RESOLVED.stateRoot, "keys") : join(STATE_DIR, "keys");
export const ROOT_DIR = ROOT;

let SNAPSHOT_DIR: string | null = null;
let DB_PATH: string;

if (RESOLVED.mode === "PUBLIC_REFERENCE") {
  // The archive is presented through an ephemeral sealed snapshot.
  const archiveDb = join(STATE_DIR, "bizra.db");
  if (!existsSync(archiveDb)) {
    console.error(`[BOUNDARY-1A][RED] PUBLIC_ARCHIVE_MISSING: no sealed archive db at ${archiveDb} — PUBLIC_REFERENCE presents the recovered state and refuses to invent one`);
    process.exit(1);
  }
  SNAPSHOT_DIR = mkdtempSync(join(tmpdir(), "bizra-node0-snapshot-"));
  for (const f of ["bizra.db", "bizra.db-wal", "bizra.db-shm"]) {
    if (existsSync(join(STATE_DIR, f))) cpSync(join(STATE_DIR, f), join(SNAPSHOT_DIR, f));
  }
  DB_PATH = join(SNAPSHOT_DIR, "bizra.db");
} else {
  // LOCAL_FOUNDER: live root, writable, outside the source tree (mode.ts enforced).
  mkdirSync(STATE_DIR, { recursive: true });
  mkdirSync(OUTBOX_DIR, { recursive: true });
  DB_PATH = join(STATE_DIR, "bizra.db");
}

export const ARCHIVE_SNAPSHOT_DIR = SNAPSHOT_DIR;

export const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA synchronous = FULL;");

// Schema DDL — LOCAL_FOUNDER roots only. PUBLIC snapshots are never altered.
if (RESOLVED.mode === "LOCAL_FOUNDER") {
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
      admissible INTEGER NOT NULL, gate_reason TEXT, actor_id TEXT
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
    CREATE TABLE IF NOT EXISTS action_nonces (
      nonce TEXT PRIMARY KEY,
      action_id TEXT NOT NULL,
      action_class TEXT NOT NULL,
      request_sha256 TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      consumed_at TEXT NOT NULL
    );
  `);
  // migration for pre-boundary roots that predate the principal column (LOCAL roots only)
  try {
    db.exec("ALTER TABLE traces ADD COLUMN actor_id TEXT");
  } catch {
    // column already exists — no migration needed
  }
}

/** Does the opened db carry the traces.actor_id column? (public snapshots of the archive do not) */
export const HAS_ACTOR_COLUMN = (() => {
  try {
    const cols = (db.query("PRAGMA table_info(traces)").all() as Array<{ name: string }>).map((c) => c.name);
    return cols.includes("actor_id");
  } catch {
    return false;
  }
})();

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
