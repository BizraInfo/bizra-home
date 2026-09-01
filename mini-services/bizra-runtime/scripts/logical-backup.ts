/**
 * BIZRA Node0 — logical SQLite backup (CONTROL-PLANE-SEAL-1B §3.9).
 *
 * Corrects the 1A backup-byte overclaim: the -shm file is MUTABLE SQLite
 * coordination state and is NOT an immutable backup identity. The correct
 * proof of a backup is:
 *   1. create a logically consistent snapshot with a supported SQLite backup
 *      mechanism (VACUUM INTO) from a DISPOSABLE COPY of the archive triple
 *      (originals are never opened for write);
 *   2. re-open the produced backup independently and WALK the receipt chain
 *      (digest = sha256(prev|kind|subject|payload), links verified, exact head).
 *
 * Usage: bun scripts/logical-backup.ts --source <dir with the db triple> --out <backup.db path>
 * Prints one JSON line: { receipts, links_ok, head, shm_policy, ... }
 */
import { cpSync, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const source = arg("source");
const out = arg("out");
if (!source || !out) {
  console.error("logical-backup: --source <db-triple-dir> --out <backup.db> are required");
  process.exit(1);
}

const SRC = resolve(source);
const OUT = resolve(out);

// 1. disposable copy of the triple — originals never opened for write
const tmp = mkdtempSync(join(tmpdir(), "bizra-1b-backup-"));
for (const f of ["bizra.db", "bizra.db-wal", "bizra.db-shm"]) {
  if (existsSync(join(SRC, f))) cpSync(join(SRC, f), join(tmp, f));
}

const { Database } = await import("bun:sqlite");
const live = new Database(join(tmp, "bizra.db"));
live.exec(`VACUUM INTO '${OUT.replace(/'/g, "''")}'`);
live.close();
rmSync(tmp, { recursive: true, force: true });

// 2. independent verification: open the backup fresh and walk the chain
const backup = new Database(OUT, { readonly: true });
const rows = backup.query("SELECT seq, kind, subject, payload, prev, digest FROM receipts ORDER BY seq ASC").all() as any[];
let prev = "GENESIS-0";
let linksOk = 0;
let brokenAt: number | null = null;
for (const r of rows) {
  const expect = createHash("sha256").update(`${prev}|${r.kind}|${r.subject}|${r.payload}`).digest("hex");
  if (r.prev !== prev || r.digest !== expect) { brokenAt = r.seq; break; }
  prev = r.digest;
  linksOk++;
}
const head = rows.length ? rows[rows.length - 1].digest : null;
backup.close();

const st = statSync(OUT);
console.log(
  JSON.stringify({
    ok: brokenAt === null && rows.length > 0,
    mechanism: "sqlite VACUUM INTO from a disposable copy of the triple (originals untouched)",
    backup_path: OUT,
    backup_bytes: st.size,
    receipts: rows.length,
    links_ok: linksOk,
    broken_at: brokenAt,
    head,
    shm_policy: {
      excluded: true,
      reason: "the -shm file is ephemeral SQLite coordination state — mutable at every open; byte-equality of a live -shm is not a backup identity (the 1A receipt's -shm mismatch is recorded honestly, not repeated here)",
    },
    law: "a backup is proven by logical consistency and a successful chain walk, never by -shm byte equality",
  }),
);
process.exit(brokenAt === null ? 0 : 1);
