/**
 * BIZRA Node0 — the tamper-evident receipt chain.
 * Append-only. Every receipt's digest = SHA-256(prev | kind | subject | canonical payload).
 * To forge one entry you must forge the entire suffix. To hide one, you must break the link.
 * This is the structural answer to the "bulletin board" and "hidden messages" failure modes.
 */
import { all, one, run } from "./store";
import { nowIso, sha256hex, canonical } from "./hash";

export interface Receipt {
  seq: number;
  ts: string;
  kind: string;
  subject: string;
  payload: string;
  prev: string;
  digest: string;
}

export function appendReceipt(kind: string, subject: string, payload: unknown) {
  const last = one<{ digest: string }>("SELECT digest FROM receipts ORDER BY seq DESC LIMIT 1");
  const prev = last?.digest ?? "GENESIS-0";
  const body = canonical(payload);
  const digest = sha256hex(`${prev}|${kind}|${subject}|${body}`);
  const ts = nowIso();
  run(
    "INSERT INTO receipts (ts, kind, subject, payload, prev, digest) VALUES (?, ?, ?, ?, ?, ?)",
    ts, kind, subject, body, prev, digest,
  );
  const seq = one<{ seq: number }>("SELECT seq FROM receipts WHERE digest = ?", digest)!.seq;
  return { seq, ts, kind, subject, digest, prev };
}

export function chainHead() {
  return one<{ seq: number; digest: string; kind: string; subject: string; ts: string }>(
    "SELECT seq, digest, kind, subject, ts FROM receipts ORDER BY seq DESC LIMIT 1",
  );
}

export function chainLength(): number {
  return one<{ n: number }>("SELECT COUNT(*) AS n FROM receipts")!.n;
}

export function verifyChain(): { ok: boolean; len: number; head: string | null; brokenAt: number | null } {
  const rows = all<Receipt>("SELECT seq, ts, kind, subject, payload, prev, digest FROM receipts ORDER BY seq ASC");
  let prev = "GENESIS-0";
  for (const r of rows) {
    const expect = sha256hex(`${prev}|${r.kind}|${r.subject}|${r.payload}`);
    if (r.prev !== prev || r.digest !== expect) {
      return { ok: false, len: rows.length, head: chainHead()?.digest ?? null, brokenAt: r.seq };
    }
    prev = r.digest;
  }
  return { ok: true, len: rows.length, head: chainHead()?.digest ?? null, brokenAt: null };
}

export function lastReceipts(limit = 12) {
  return all<any>(
    "SELECT seq, ts, kind, subject, digest, prev FROM receipts ORDER BY seq DESC LIMIT ?",
    limit,
  );
}
