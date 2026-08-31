/**
 * BIZRA Node0 — Dema, the status relay.
 * Every event of consequence reports exactly one of:
 *   DONE | REFUSED | UNKNOWN
 * Dema never fakes, never upgrades, never hides. It is the voice of the system.
 */
import { all, run } from "./store";
import { nowIso } from "./hash";

export type DemaStatus = "DONE" | "REFUSED" | "UNKNOWN";

export function relay(
  status: DemaStatus,
  subject: string,
  reason?: string,
  receiptDigest?: string,
): void {
  run(
    "INSERT INTO dema (ts, subject, status, reason, receipt_digest) VALUES (?, ?, ?, ?, ?)",
    nowIso(), subject, status, reason ?? null, receiptDigest ?? null,
  );
}

export function demaLog(limit = 20) {
  return all<any>(
    "SELECT id, ts, subject, status, reason, receipt_digest FROM dema ORDER BY id DESC LIMIT ?",
    limit,
  );
}
