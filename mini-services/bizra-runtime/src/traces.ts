/**
 * BIZRA Node0 — Traces and the Admissibility Gate.
 * Every trace is potential evidence, but evidence has scope, completeness, and
 * correlation limits. A trace outside its scope never becomes a conclusion.
 * Inadmissible traces are RECORDED with their reason — never silently dropped.
 * The gate is deterministic: same trace, same verdict, forever.
 *
 * BOUNDARY-1A §2.7 — trace provenance:
 *   - an EXTERNAL trace's source is DERIVED by the server: "external_operator".
 *     Caller-supplied source labels are presentation metadata, ignored as
 *     authority — an external actor cannot claim internal labels.
 *   - external traces REQUIRE an actor_id (the authenticated principal).
 *   - internal source labels (runtime, mission, cycle, dema, operator, browser)
 *     are reserved to internal call sites.
 *   - corroboration counts principals (actor_id), not source strings (sat.ts).
 */
import { all, one, run, HAS_ACTOR_COLUMN } from "./store";
import { nowIso, sha256obj } from "./hash";

const KNOWN_SOURCES = new Set(["runtime", "mission", "cycle", "dema", "operator", "browser", "external_operator"]);
const KNOWN_KINDS = new Set(["receipt", "metric", "refusal", "observation", "heartbeat", "signal"]);
const CORRELATION_RE = /^[A-Z0-9._-]{1,64}$/;
const PAYLOAD_CAP = 4096;

export const EXTERNAL_SOURCE = "external_operator";

export interface IngestResult {
  id: number | null;
  admissible: boolean;
  reason: string;
  sha256: string;
  stored_source: string;
  actor_id: string | null;
}

export function ingestTrace(input: {
  source: string;
  kind: string;
  payload: string;
  correlation?: string | null;
  ts?: string;
  external?: boolean;
  actor_id?: string | null;
}): IngestResult {
  const ts = input.ts ?? nowIso();
  const scopeFailures: string[] = [];
  const completenessFailures: string[] = [];

  // PROVENANCE — the server derives the source for external traces; callers never choose labels
  let storedSource = input.source;
  let actorId = input.actor_id ?? null;
  if (input.external) {
    if (!actorId) {
      scopeFailures.push("EXTERNAL_TRACE_REQUIRES_ACTOR: an external trace must carry its authenticated principal");
    }
    storedSource = EXTERNAL_SOURCE; // derived, never accepted from the request
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
  const sha256 = sha256obj({ ts, source: storedSource, kind: input.kind, correlation: input.correlation ?? null, payload: input.payload });
  if (HAS_ACTOR_COLUMN) {
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
  return { id, admissible, reason, sha256, stored_source: storedSource, actor_id: actorId };
}

export function traceStats() {
  const row = one<any>(
    "SELECT COUNT(*) AS total, SUM(admissible) AS admissible FROM traces",
  );
  return { total: row?.total ?? 0, admissible: row?.admissible ?? 0, inadmissible: (row?.total ?? 0) - (row?.admissible ?? 0) };
}

export function lastTraces(limit = 12, onlyAdmissible = false) {
  const actorSel = HAS_ACTOR_COLUMN ? ", actor_id" : ", NULL AS actor_id";
  return all<any>(
    onlyAdmissible
      ? `SELECT id, ts, source, kind, correlation, admissible, gate_reason${actorSel}, substr(payload, 1, 160) AS payload, sha256 FROM traces WHERE admissible = 1 ORDER BY id DESC LIMIT ?`
      : `SELECT id, ts, source, kind, correlation, admissible, gate_reason${actorSel}, substr(payload, 1, 160) as payload, sha256 FROM traces ORDER BY id DESC LIMIT ?`,
    limit,
  );
}

export function recentAdmissible(limit: number) {
  return all<any>(
    "SELECT id, ts, source, kind, correlation, payload FROM traces WHERE admissible = 1 ORDER BY id DESC LIMIT ?",
    limit,
  ).reverse();
}
