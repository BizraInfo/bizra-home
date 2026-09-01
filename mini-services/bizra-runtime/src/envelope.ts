/**
 * BIZRA Node0 — local action envelope (LOCAL-SOVEREIGN-BOUNDARY-1A §2.4–2.5).
 *
 * schema bizra.node0.local_action_envelope.v1
 *
 * An HMAC-SHA256 local capability that proves possession of the local control
 * key. It is NOT a sovereign signature and must never be labeled one. The key:
 *   - generated only by the local installer / dedicated local init command
 *   - lives OUTSIDE the repository (state root keys/ dir), mode 0600
 *   - never printed, returned to the browser, committed, or written to receipts
 *   - identified only by key_id (fingerprint prefix)
 *
 * Nonces are claimed atomically via a single INSERT on the PRIMARY KEY —
 * exactly one winner per nonce, ever (R6). A consumed or expired nonce is
 * never renewed (R5 replay refusal).
 */
import { createHmac, createHash, timingSafeEqual, randomBytes } from "node:crypto";
import { canonical, sha256hex } from "./hash";

export const ENVELOPE_SCHEMA = "bizra.node0.local_action_envelope.v1";
export const MAX_ENVELOPE_WINDOW_MS = 600_000; // 10 minutes

export interface ActionEnvelope {
  schema: string;
  action_id: string;
  action_class: string;
  actor_id: string;
  request_sha256: string;
  intent_sha256: string;
  nonce: string;
  issued_at: string;
  expires_at: string;
  key_id: string;
  mac: string;
}

export const ACTION_CLASSES = new Set(["TRACE_INGEST", "MISSION_RUN", "CYCLE_RUN", "TRANSITION_REVERT"]);

export function keyIdFor(key: Uint8Array): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export interface VerifiedEnvelope {
  ok: true;
  envelope: ActionEnvelope;
}
export type EnvelopeRefusal =
  | { ok: false; reason: string };

function hexBuffer(hex: string): Buffer | null {
  return /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hex, "hex") : null;
}

/**
 * Verify an action envelope against the loaded local keys.
 * Fail-closed on: schema mismatch, missing/mistyped fields, unknown key,
 * expiry window violations, request-hash mismatch, MAC mismatch.
 * Uses timing-safe comparison for the MAC.
 */
export function verifyActionEnvelope(
  body: { action?: unknown; envelope?: unknown },
  opts: { keys: Map<string, Uint8Array>; now: number },
): VerifiedEnvelope | EnvelopeRefusal {
  const env = body?.envelope as Record<string, unknown> | undefined;
  if (!env || typeof env !== "object") return { ok: false, reason: "ENVELOPE_MISSING: consequential actions require an action envelope" };
  if (env.schema !== ENVELOPE_SCHEMA) return { ok: false, reason: `ENVELOPE_SCHEMA_MISMATCH: expected ${ENVELOPE_SCHEMA}` };
  const required: Array<keyof ActionEnvelope> = [
    "action_id", "action_class", "actor_id", "request_sha256", "intent_sha256",
    "nonce", "issued_at", "expires_at", "key_id", "mac",
  ];
  for (const f of required) {
    const v = env[f];
    if (typeof v !== "string" || v.length === 0) return { ok: false, reason: `ENVELOPE_MALFORMED: field '${f}' must be a non-empty string` };
  }
  if (!ACTION_CLASSES.has(env.action_class as string)) {
    return { ok: false, reason: `ENVELOPE_ACTION_CLASS_UNKNOWN: '${env.action_class}' is not a leasable action class` };
  }
  if (!/^[0-9a-f]{32,}$/i.test(env.nonce as string)) return { ok: false, reason: "ENVELOPE_NONCE_MALFORMED: nonce must be >= 32 hex chars of cryptographic randomness" };

  const key = opts.keys.get(env.key_id as string);
  if (!key) return { ok: false, reason: `ENVELOPE_UNKNOWN_KEY: key_id '${env.key_id}' is not a loaded local control key` };

  const issued = Date.parse(env.issued_at as string);
  const expires = Date.parse(env.expires_at as string);
  if (!Number.isFinite(issued) || !Number.isFinite(expires)) return { ok: false, reason: "ENVELOPE_TIME_MALFORMED: issued_at/expires_at must be ISO timestamps" };
  if (expires - issued > MAX_ENVELOPE_WINDOW_MS) return { ok: false, reason: `ENVELOPE_WINDOW_TOO_WIDE: max ${MAX_ENVELOPE_WINDOW_MS}ms` };
  if (opts.now < issued) return { ok: false, reason: "ENVELOPE_NOT_YET_VALID: issued_at is in the future" };
  if (opts.now >= expires) return { ok: false, reason: "ENVELOPE_EXPIRED: expires_at has elapsed — envelopes are never renewed" };

  // request binding: the MAC'd request payload must hash to request_sha256
  if (sha256hex(canonical(body.action)) !== env.request_sha256) {
    return { ok: false, reason: "ENVELOPE_REQUEST_HASH_MISMATCH: the action payload does not match the envelope's request_sha256" };
  }

  // MAC over the canonical envelope WITHOUT the mac field, timing-safe compare
  const { mac, ...envWithoutMac } = env as ActionEnvelope & Record<string, unknown>;
  const expected = createHmac("sha256", key as Buffer).update(canonical(envWithoutMac)).digest();
  const provided = hexBuffer(mac as string);
  if (!provided || provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "ENVELOPE_MAC_INVALID: HMAC verification failed — fail closed" };
  }

  return { ok: true, envelope: env as unknown as ActionEnvelope };
}

/** Claim a nonce atomically: single INSERT on the PRIMARY KEY. Exactly one winner (R6). */
export function claimNonceSql(): [string, unknown[]] {
  return [
    "INSERT INTO action_nonces (nonce, action_id, action_class, request_sha256, actor_id, expires_at, consumed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [], // params filled by the caller with the verified envelope
  ];
}

export function newNonce(): string {
  return randomBytes(16).toString("hex");
}
