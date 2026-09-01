/**
 * BIZRA Node0 — Traces and the Admissibility Gate (CONTROL-PLANE-SEAL-1B §3.5).
 * Every trace is potential evidence, but evidence has scope, completeness, and
 * correlation limits. A trace outside its scope never becomes a conclusion.
 * Inadmissible traces are RECORDED with their reason — never silently dropped.
 * The gate is deterministic: same trace, same verdict, forever.
 *
 * EVIDENCE SCHEMA v2 (this seal):
 *   A trace that participates in an AUTHORITATIVE decision carries
 *   server-derived evidence binding:
 *     local_control_principal_id  — resolved from the key registry, never a caller string
 *     producer_id                 — the trusted adapter that produced the evidence
 *     evidence_domain             — the trusted domain the adapter speaks for
 *     artifact_hash               — sha256 of the artifact bytes the evidence is about
 *     evidence_version            — 2
 *   The v2 digest binds ALL decision-bearing fields: ts, source, kind,
 *   correlation, payload, local_control_principal_id, producer_id,
 *   evidence_domain, artifact_hash, evidence_version. Changing any one
 *   breaks the seal (EV-01).
 *
 *   Legacy v1 traces (the recovered archive) remain readable historical
 *   records — their digests verify under the v1 formula (5 fields) — but they
 *   are NOT eligible to satisfy a v2 corroboration decision (EV-02).
 *
 * Provenance law (BOUNDARY-1A §2.7, unchanged): an EXTERNAL trace's source is
 * DERIVED by the server ("external_operator"); caller-supplied source labels
 * are presentation metadata, ignored as authority. producer_id and
 * evidence_domain are likewise server-derived — callers cannot select
 * trusted producer/domain identity (EV-03).
 */
import { all, one, run, HAS_ACTOR_COLUMN, HAS_EVIDENCE_V2 } from "./store";
import { nowIso, sha256obj } from "./hash";

const KNOWN_SOURCES = new Set(["runtime", "mission", "cycle", "dema", "operator", "browser", "external_operator"]);
const KNOWN_KINDS = new Set(["receipt", "metric", "refusal", "observation", "heartbeat", "signal", "construction"]);
const CORRELATION_RE = /^[A-Z0-9._-]{1,64}$/;
const PAYLOAD_CAP = 4096;

export const EXTERNAL_SOURCE = "external_operator";

/** The four trusted evidence producers (server-side identities; callers never choose). */
export const TRUSTED_PRODUCERS = {
  OPERATOR_INPUT: { producer_id: "operator_input_adapter", evidence_domain: "OPERATOR_STATEMENT" },
  RUNTIME_STATE: { producer_id: "runtime_state_observer", evidence_domain: "RUNTIME_STATE" },
  RECEIPT_STATE: { producer_id: "receipt_chain_observer", evidence_domain: "RECEIPT_STATE" },
  GIT_STATE: { producer_id: "git_state_observer", evidence_domain: "GIT_STATE" },
} as const;

export interface EvidenceV2 {
  local_control_principal_id: string | null;
  producer_id: string;
  evidence_domain: string;
  artifact_hash: string;
}

export interface IngestResult {
  id: number | null;
  admissible: boolean;
  reason: string;
  sha256: string;
  stored_source: string;
  actor_id: string | null;
  evidence: { version: 1 | 2; producer_id: string | null; evidence_domain: string | null; artifact_hash: string | null; local_control_principal_id: string | null };
}

/** v1 digest — the 5-field historical formula (readable legacy archive evidence). */
export function traceDigestV1(row: { ts: string; source: string; kind: string; correlation: string | null; payload: string }): string {
  return sha256obj({ ts: row.ts, source: row.source, kind: row.kind, correlation: row.correlation ?? null, payload: row.payload });
}

/** v2 digest — binds EVERY decision-bearing field (EV-01). */
export function traceDigestV2(row: {
  ts: string; source: string; kind: string; correlation: string | null; payload: string;
  local_control_principal_id: string | null; producer_id: string | null;
  evidence_domain: string | null; artifact_hash: string | null; evidence_version: number;
}): string {
  return sha256obj({
    ts: row.ts,
    source: row.source,
    kind: row.kind,
    correlation: row.correlation ?? null,
    payload: row.payload,
    local_control_principal_id: row.local_control_principal_id ?? null,
    producer_id: row.producer_id ?? null,
    evidence_domain: row.evidence_domain ?? null,
    artifact_hash: row.artifact_hash ?? null,
    evidence_version: row.evidence_version,
  });
}

/** Version-aware seal verification: v2 rows verify with the 10-field formula, v1 rows with the 5-field formula. */
export function verifyTraceSeal(row: {
  ts: string; source: string; kind: string; correlation: string | null; payload: string; sha256: string;
  local_control_principal_id?: string | null; producer_id?: string | null;
  evidence_domain?: string | null; artifact_hash?: string | null; evidence_version?: number | null;
}): boolean {
  if ((row.evidence_version ?? 1) >= 2) {
    return traceDigestV2({
      ts: row.ts, source: row.source, kind: row.kind, correlation: row.correlation ?? null, payload: row.payload,
      local_control_principal_id: row.local_control_principal_id ?? null,
      producer_id: row.producer_id ?? null,
      evidence_domain: row.evidence_domain ?? null,
      artifact_hash: row.artifact_hash ?? null,
      evidence_version: row.evidence_version ?? 2,
    }) === row.sha256;
  }
  return traceDigestV1(row) === row.sha256;
}

export function ingestTrace(input: {
  source: string;
  kind: string;
  payload: string;
  correlation?: string | null;
  ts?: string;
  external?: boolean;
  /** Descriptive-only, never authority (the principal comes from evidence binding / the registry). */
  actor_id?: string | null;
  /**
   * v2 server-derived evidence binding. External routes ALWAYS pass this
   * (operator_input_adapter / OPERATOR_STATEMENT, principal from the registry).
   * Internal call sites may omit it — the runtime then binds its own
   * observation identity (runtime_state_observer / RUNTIME_STATE), because an
   * internal trace IS a runtime observation. Callers can never select a
   * trusted producer/domain identity.
   */
  evidence?: EvidenceV2;
}): IngestResult {
  const ts = input.ts ?? nowIso();
  const scopeFailures: string[] = [];
  const completenessFailures: string[] = [];

  // PROVENANCE — the server derives the source for external traces; callers never choose labels
  let storedSource = input.source;
  let actorId = input.actor_id ?? null;
  if (input.external) {
    if (!actorId && !input.evidence?.local_control_principal_id) {
      scopeFailures.push("EXTERNAL_TRACE_REQUIRES_PRINCIPAL: an external trace must carry its server-resolved principal binding");
    }
    storedSource = EXTERNAL_SOURCE; // derived, never accepted from the request
  }

  // EVIDENCE v2 — explicit binding, or the runtime's own observer identity for internal traces
  const evidence: EvidenceV2 | undefined = input.evidence
    ?? (input.external ? undefined : { local_control_principal_id: null, ...TRUSTED_PRODUCERS.RUNTIME_STATE, artifact_hash: sha256obj(input.payload ?? "") });
  if (input.evidence && !TRUSTED_PRODUCER_LIST.has(`${input.evidence.producer_id}:${input.evidence.evidence_domain}`)) {
    scopeFailures.push(
      `UNTRUSTED_PRODUCER_DOMAIN: '${input.evidence.producer_id}:${input.evidence.evidence_domain}' is not a trusted server-side adapter identity`,
    );
  }

  // SCOPE — who may speak, and about what
  if (!KNOWN_SOURCES.has(storedSource)) scopeFailures.push(`unknown source '${storedSource}'`);
  if (!KNOWN_KINDS.has(input.kind)) scopeFailures.push(`unknown kind '${input.kind}'`);
  if (typeof input.payload !== "string") scopeFailures.push("payload must be a string");

  // COMPLETENESS — a trace that cannot be re-verified is not evidence
  if (!input.payload || input.payload.length === 0) completenessFailures.push("empty payload");
  if (input.payload.length > PAYLOAD_CAP) completenessFailures.push(`payload over ${PAYLOAD_CAP}B cap`);

  // CORRELATION LIMITS — correlation ids are namespaced identifiers, not free text
  if (input.correlation != null && !CORRELATION_RE.test(input.correlation)) {
    completenessFailures.push(`correlation '${input.correlation.slice(0, 32)}' violates namespace law`);
  }
  // Defense in depth: an external ingest may never speak as an internal label even if reached internally
  if (input.external && input.source === "runtime") {
    scopeFailures.push("external ingest cannot speak as 'runtime' — provenance forgery refused");
  }

  const admissible = scopeFailures.length === 0 && completenessFailures.length === 0;
  const reason = admissible
    ? "scope, completeness, correlation limits satisfied"
    : [...scopeFailures, ...completenessFailures].join("; ");

  const useV2 = !!evidence && HAS_EVIDENCE_V2;
  const principalId = useV2 ? evidence!.local_control_principal_id : null;
  const producerId = useV2 ? evidence!.producer_id : null;
  const domain = useV2 ? evidence!.evidence_domain : null;
  const artifactHash = useV2 ? evidence!.artifact_hash : null;

  const sha256 = useV2
    ? traceDigestV2({
        ts, source: storedSource, kind: input.kind, correlation: input.correlation ?? null, payload: input.payload,
        local_control_principal_id: principalId, producer_id: producerId,
        evidence_domain: domain, artifact_hash: artifactHash, evidence_version: 2,
      })
    : traceDigestV1({ ts, source: storedSource, kind: input.kind, correlation: input.correlation ?? null, payload: input.payload });

  if (useV2) {
    run(
      "INSERT INTO traces (ts, source, kind, correlation, payload, sha256, admissible, gate_reason, actor_id, local_control_principal_id, producer_id, evidence_domain, artifact_hash, evidence_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ts, storedSource, input.kind, input.correlation ?? null, input.payload, sha256, admissible ? 1 : 0, reason, actorId, principalId, producerId, domain, artifactHash, 2,
    );
  } else if (HAS_ACTOR_COLUMN) {
    run(
      "INSERT INTO traces (ts, source, kind, correlation, payload, sha256, admissible, gate_reason, actor_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ts, storedSource, input.kind, input.correlation ?? null, input.payload, sha256, admissible ? 1 : 0, reason, actorId,
    );
  } else {
    run(
      "INSERT INTO traces (ts, source, kind, correlation, payload, sha256, admissible, gate_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      ts, storedSource, input.kind, input.correlation ?? null, input.payload, sha256, admissible ? 1 : 0, reason,
    );
  }
  const id = one<{ id: number }>("SELECT id FROM traces WHERE sha256 = ?", sha256)!.id;
  return {
    id, admissible, reason, sha256, stored_source: storedSource, actor_id: actorId,
    evidence: { version: useV2 ? 2 : 1, producer_id: producerId, evidence_domain: domain, artifact_hash: artifactHash, local_control_principal_id: principalId },
  };
}

const TRUSTED_PRODUCER_LIST = new Set<string>(
  Object.values(TRUSTED_PRODUCERS).map((p) => `${p.producer_id}:${p.evidence_domain}`),
);

export function traceStats() {
  const row = one<any>(
    "SELECT COUNT(*) AS total, SUM(admissible) AS admissible FROM traces",
  );
  return { total: row?.total ?? 0, admissible: row?.admissible ?? 0, inadmissible: (row?.total ?? 0) - (row?.admissible ?? 0) };
}

const V2_COLS = ", local_control_principal_id, producer_id, evidence_domain, artifact_hash, evidence_version";
const V2_NULLS = ", NULL AS local_control_principal_id, NULL AS producer_id, NULL AS evidence_domain, NULL AS artifact_hash, NULL AS evidence_version";

export function lastTraces(limit = 12, onlyAdmissible = false) {
  const v2 = HAS_EVIDENCE_V2 ? V2_COLS : V2_NULLS;
  const actorSel = HAS_ACTOR_COLUMN ? ", actor_id" : ", NULL AS actor_id";
  return all<any>(
    onlyAdmissible
      ? `SELECT id, ts, source, kind, correlation, admissible, gate_reason${actorSel}${v2}, substr(payload, 1, 160) AS payload, sha256 FROM traces WHERE admissible = 1 ORDER BY id DESC LIMIT ?`
      : `SELECT id, ts, source, kind, correlation, admissible, gate_reason${actorSel}${v2}, substr(payload, 1, 160) as payload, sha256 FROM traces ORDER BY id DESC LIMIT ?`,
    limit,
  );
}

export function recentAdmissible(limit: number) {
  return all<any>(
    "SELECT id, ts, source, kind, correlation, payload FROM traces WHERE admissible = 1 ORDER BY id DESC LIMIT ?",
    limit,
  ).reverse();
}
