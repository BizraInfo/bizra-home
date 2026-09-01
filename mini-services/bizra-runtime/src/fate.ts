/**
 * BIZRA Node0 — FATE, the membrane.
 * Ambient authority is impossible here by structure:
 *   - every effect needs a single-use lease, issued once, consumed once
 *   - network scope is false — there is NO code path that performs network egress
 *   - filesystem scope is outbox_only — the executor can write nowhere else
 *   - leases expire; expiry is refused, never silently renewed
 *   - the lease registry is durable (SQLite) — it survives process death
 * This is the structural answer to the OpenAI incident's root vulnerability.
 */
import { all, one, run } from "./store";
import { nowIso, sha256hex, sha256obj } from "./hash";
import { randomBytes } from "node:crypto";

export interface Lease {
  id: string;
  ts: string;
  subject: string;
  purpose: string;
  network: boolean;
  fs_scope: string;
  ttl_ms: number;
  expires_at: number;
  single_use: boolean;
  consumed_at: string | null;
  status: "ACTIVE" | "CONSUMED" | "EXPIRED";
}

const EFFECT_CLASSES = new Set(["BOUNDED_LOCAL_WRITE", "CONTRACT_TRANSITION"]);

export function issueLease(
  subject: string,
  purpose: string,
  opts: { ttlMs: number; effectClass: string },
): { ok: true; lease: Lease } | { ok: false; reason: string } {
  if (!EFFECT_CLASSES.has(opts.effectClass)) {
    return { ok: false, reason: `FATE_SCOPE: effect class '${opts.effectClass}' is not leasable` };
  }
  // single-use per subject+purpose: a live or consumed lease for the same subject/purpose is never re-issued
  const existing = one<{ id: string }>(
    "SELECT id FROM leases WHERE subject = ? AND purpose = ?",
    subject, purpose,
  );
  if (existing) {
    return { ok: false, reason: `FATE_SINGLE_USE: lease ${existing.id} already bound to ${subject}/${purpose} — never re-issued` };
  }
  const id = `LEASE-${sha256hex(`${subject}|${purpose}|${nowIso()}|${randomBytes(8).toString("hex")}`).slice(0, 16).toUpperCase()}`;
  const ttl = Math.max(1000, Math.floor(opts.ttlMs));
  run(
    "INSERT INTO leases (id, ts, subject, purpose, network, fs_scope, ttl_ms, expires_at, single_use, status) VALUES (?, ?, ?, ?, 0, 'outbox_only', ?, ?, 1, 'ACTIVE')",
    id, nowIso(), subject, purpose, ttl, Date.now() + ttl,
  );
  return { ok: true, lease: getLease(id)! };
}

function computeStatus(row: any): Lease {
  const status: Lease["status"] =
    row.consumed_at ? "CONSUMED" : Date.now() > row.expires_at ? "EXPIRED" : "ACTIVE";
  return { ...row, network: false, single_use: true, status };
}

export function getLease(id: string): Lease | null {
  const row = one<any>("SELECT * FROM leases WHERE id = ?", id);
  return row ? computeStatus(row) : null;
}

export function consumeLease(id: string): { ok: true } | { ok: false; reason: string } {
  const lease = getLease(id);
  if (!lease) return { ok: false, reason: `FATE_UNKNOWN_LEASE: ${id}` };
  if (lease.status === "CONSUMED") return { ok: false, reason: `FATE_SINGLE_USE: lease ${id} already consumed — this is the ambient-authority kill switch` };
  if (lease.status === "EXPIRED") return { ok: false, reason: `FATE_LEASE_EXPIRED: lease ${id} TTL elapsed — refused, never renewed` };
  run("UPDATE leases SET consumed_at = ?, status = 'CONSUMED' WHERE id = ?", nowIso(), id);
  return { ok: true };
}

export function leaseDecisionHash(lease: Lease): string {
  return sha256obj({
    id: lease.id, subject: lease.subject, purpose: lease.purpose,
    network: false, fs_scope: "outbox_only", ttl_ms: lease.ttl_ms,
    single_use: true, issued_at: lease.ts,
  });
}

export function leaseRegistry() {
  const rows = all<any>("SELECT * FROM leases ORDER BY id DESC LIMIT 50");
  return rows.map(computeStatus);
}

export function fateStats() {
  const rows = all<any>("SELECT consumed_at, expires_at, status FROM leases");
  const consumed = rows.filter((r) => r.consumed_at).length;
  const active = rows.filter((r) => !r.consumed_at && Date.now() <= r.expires_at).length;
  const expired = rows.filter((r) => !r.consumed_at && Date.now() > r.expires_at).length;
  return { total: rows.length, active, consumed, expired_ever: expired };
}
