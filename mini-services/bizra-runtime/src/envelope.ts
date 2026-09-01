/**
 * BIZRA Node0 — local action envelope, revision v1.1 (CONTROL-PLANE-SEAL-1B §3.3).
 *
 * schema bizra.node0.local_action_envelope.v1.1
 *
 * Upgrades over v1 (LOCAL-SOVEREIGN-BOUNDARY-1A):
 *   - the MAC binds method AND exact route path as well as the action payload;
 *   - caller-supplied actor_id is DESCRIPTIVE-ONLY metadata — never authority.
 *     Reserved/internal labels (runtime, SAT-*, another registered principal,
 *     local:/internal: claims) are REFUSED outright;
 *   - after HMAC verification the authoritative identity is resolved
 *     SERVER-SIDE: key_id -> local_control_principal_id (principal-registry).
 *
 * It is still an HMAC-SHA256 local capability — NOT a sovereign signature and
 * never labeled one. The key: generated only by src/init-control-key.ts,
 * lives OUTSIDE the repo (state-root keys/ dir), mode 0600, never printed,
 * never returned to the browser, never committed, never written to receipts.
 *
 * Nonces are claimed atomically via a single INSERT on the PRIMARY KEY —
 * exactly one winner per nonce, ever (R6). A consumed or expired nonce is
 * never renewed (R5 replay refusal). v1 envelopes are REFUSED on this
 * surface: the schema migration is explicit, never silent.
 */
import { createHmac, createHash, timingSafeEqual, randomBytes } from "node:crypto";
import { canonical, sha256hex } from "./hash";

export const ENVELOPE_SCHEMA = "bizra.node0.local_action_envelope.v1.1";
export const MAX_ENVELOPE_WINDOW_MS = 600_000; // 10 minutes

export interface ActionEnvelope {
  schema: string;
  key_id: string;
  nonce: string;
  action_id: string;
  action_class: string;
  method: string;
  path: string;
  request_sha256: string;
  intent_sha256: string;
  issued_at: string;
  expires_at: string;
  mac: string;
  /** Descriptive-only. Never authority — the principal comes from the registry. */
  actor_id?: string;
}

export const ACTION_CLASSES = new Set(["TRACE_INGEST", "MISSION_RUN", "CYCLE_RUN", "TRANSITION_REVERT", "MODEL_CONFIG_SET", "PAT_PROPOSE"]);

/** Labels a caller actor_id may never claim — internal organs and authority namespaces. */
const RESERVED_ACTOR_LABELS = new Set([
  "runtime", "mission", "cycle", "dema", "operator", "browser", "node0", "sat", "pat", "fate",
]);
const RESERVED_ACTOR_PREFIXES = ["SAT-", "PAT-", "FATE-", "NODE0-", "internal:", "local:"];

export function isReservedActorLabel(actorId: string, knownPrincipalIds: Set<string>): boolean {
  const a = actorId.trim();
  if (RESERVED_ACTOR_LABELS.has(a.toLowerCase())) return true;
  for (const p of RESERVED_ACTOR_PREFIXES) if (a.toLowerCase().startsWith(p.toLowerCase())) return true;
  if (knownPrincipalIds.has(a)) return true;
  return false;
}

export function keyIdFor(key: Uint8Array): string {
  return createHash("sha256").update(key).digest("hex").slice(0, 16);
}

export interface VerifiedEnvelope {
  ok: true;
  envelope: ActionEnvelope;
  /** Server-side authority resolution — never the caller's actor string. */
  principal: {
    key_id: string;
    local_control_principal_id: string;
    authority_class: string;
    canonical_principal_status: string;
  };
}
export type EnvelopeRefusal = { ok: false; reason: string };

function hexBuffer(hex: string): Buffer | null {
  return /^[0-9a-f]{64}$/i.test(hex) ? Buffer.from(hex, "hex") : null;
}

/**
 * Verify a v1.1 action envelope against the loaded local keys.
 * Fail-closed on: schema mismatch (incl. v1), missing/mistyped fields, unknown
 * key, unregistered principal, reserved actor-label claims, method/path
 * mismatch, expiry window violations, request-hash mismatch, MAC mismatch.
 * Timing-safe comparison for the MAC.
 */
export function verifyActionEnvelope(
  body: { action?: unknown; envelope?: unknown },
  opts: {
    keys: Map<string, Uint8Array>;
    now: number;
    /** The ACTUAL request method and exact path — the MAC is route-bound. */
    method: string;
    path: string;
    /** Server-side registry resolution: key_id -> principal record (or null = unregistered). */
    resolvePrincipal: (keyId: string) => { local_control_principal_id: string; authority_class: string; canonical_principal_status: string; status: string } | null;
    /** All registered principal ids — for reserved-label defense. */
    knownPrincipalIds: Set<string>;
  },
): VerifiedEnvelope | EnvelopeRefusal {
  const env = body?.envelope as Record<string, unknown> | undefined;
  if (!env || typeof env !== "object") return { ok: false, reason: "ENVELOPE_MISSING: consequential actions require an action envelope" };
  if (env.schema !== ENVELOPE_SCHEMA) {
    if (env.schema === "bizra.node0.local_action_envelope.v1") {
      return { ok: false, reason: `ENVELOPE_SCHEMA_SUPERSEDED: v1 envelopes are refused on this surface — migrate to ${ENVELOPE_SCHEMA} (method+path-bound, principal resolved server-side)` };
    }
    return { ok: false, reason: `ENVELOPE_SCHEMA_MISMATCH: expected ${ENVELOPE_SCHEMA}` };
  }
  const required: Array<keyof ActionEnvelope> = [
    "key_id", "nonce", "action_id", "action_class", "method", "path",
    "request_sha256", "intent_sha256", "issued_at", "expires_at", "mac",
  ];
  for (const f of required) {
    const v = env[f];
    if (typeof v !== "string" || v.length === 0) return { ok: false, reason: `ENVELOPE_MALFORMED: field '${f}' must be a non-empty string` };
  }
  if (!ACTION_CLASSES.has(env.action_class as string)) {
    return { ok: false, reason: `ENVELOPE_ACTION_CLASS_UNKNOWN: '${env.action_class}' is not a leasable action class` };
  }
  if (!/^[0-9a-f]{32,}$/i.test(env.nonce as string)) return { ok: false, reason: "ENVELOPE_NONCE_MALFORMED: nonce must be >= 32 hex chars of cryptographic randomness" };

  // ROUTE BINDING — the MAC covers the method and the exact path of the request it authorizes
  if ((env.method as string).toUpperCase() !== opts.method.toUpperCase()) {
    return { ok: false, reason: `ENVELOPE_METHOD_MISMATCH: envelope is bound to '${env.method}' but the request is '${opts.method}' — the MAC is route-bound` };
  }
  if (env.path !== opts.path) {
    return { ok: false, reason: `ENVELOPE_PATH_MISMATCH: envelope is bound to '${env.path}' but the request targets '${opts.path}' — the MAC is route-bound` };
  }

  const key = opts.keys.get(env.key_id as string);
  if (!key) return { ok: false, reason: `ENVELOPE_UNKNOWN_KEY: key_id '${env.key_id}' is not a loaded local control key` };

  const principal = opts.resolvePrincipal(env.key_id as string);
  if (!principal || principal.status !== "ACTIVE") {
    return { ok: false, reason: `ENVELOPE_PRINCIPAL_UNRESOLVED: key_id '${env.key_id}' has no ACTIVE server-side principal registration — the registry is the only authority resolution path` };
  }

  // ACTOR LABEL POLICY — descriptive-only; reserved/authority claims are refused
  if (typeof env.actor_id === "string" && env.actor_id.length > 0) {
    if (isReservedActorLabel(env.actor_id, opts.knownPrincipalIds)) {
      return { ok: false, reason: `ENVELOPE_ACTOR_LABEL_REFUSED: actor_id '${String(env.actor_id).slice(0, 40)}' claims a reserved or registered identity — caller actor strings are descriptive metadata, never authority` };
    }
  }

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

  return {
    ok: true,
    envelope: env as unknown as ActionEnvelope,
    principal: {
      key_id: env.key_id as string,
      local_control_principal_id: principal.local_control_principal_id,
      authority_class: principal.authority_class,
      canonical_principal_status: principal.canonical_principal_status,
    },
  };
}

export function newNonce(): string {
  return randomBytes(16).toString("hex");
}
