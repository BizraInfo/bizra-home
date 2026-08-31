/**
 * BIZRA Node0 — Traces and the Admissibility Gate.
 * Every trace is potential evidence, but evidence has scope, completeness, and
 * correlation limits. A trace outside its scope never becomes a conclusion.
 * Inadmissible traces are RECORDED with their reason — never silently dropped.
 * The gate is deterministic: same trace, same verdict, forever.
 */
import { all, one, run } from "./store";
import { nowIso, sha256obj } from "./hash";

const KNOWN_SOURCES = new Set(["runtime", "mission", "cycle", "dema", "operator", "browser"]);
const KNOWN_KINDS = new Set(["receipt", "metric", "refusal", "observation", "heartbeat", "signal"]);
const CORRELATION_RE = /^[A-Z0-9._-]{1,64}$/;
const PAYLOAD_CAP = 4096;

export interface IngestResult {
  id: number | null;
  admissible: boolean;
  reason: string;
  sha256: string;
}

export function ingestTrace(input: {
  source: string;
  kind: string;
  payload: string;
  correlation?: string | null;
  ts?: string;
  external?: boolean;
}): IngestResult {
  const ts = input.ts ?? nowIso();
  const scopeFailures: string[] = [];
  const completenessFailures: string[] = [];

  // SCOPE — who may speak, and about what
  if (!KNOWN_SOURCES.has(input.source)) scopeFailures.push(`unknown source '${input.source}'`);
  if (!KNOWN_KINDS.has(input.kind)) scopeFailures.push(`unknown kind '${input.kind}'`);
  if (typeof input.payload !== "string") scopeFailures.push("payload must be a string");

  // COMPLETENESS — a trace that cannot be re-verified is not evidence
  if (!input.payload || input.payload.length === 0) completenessFailures.push("empty payload");
  if (input.payload.length > PAYLOAD_CAP) completenessFailures.push(`payload over ${PAYLOAD_CAP}B cap`);

  // CORRELATION LIMITS — correlation ids are namespaced identifiers, not free text
  if (input.correlation != null && !CORRELATION_RE.test(input.correlation)) {
    completenessFailures.push(`correlation '${input.correlation.slice(0, 32)}' violates namespace law`);
  }
  // External traces may not claim runtime authority
  if (input.external && input.source === "runtime") {
    scopeFailures.push("external ingest cannot speak as 'runtime' — provenance forgery refused");
  }

  const admissible = scopeFailures.length === 0 && completenessFailures.length === 0;
  const reason = admissible
    ? "scope, completeness, correlation limits satisfied"
    : [...scopeFailures, ...completenessFailures].join("; ");
  const sha256 = sha256obj({ ts, source: input.source, kind: input.kind, correlation: input.correlation ?? null, payload: input.payload });
  run(
    "INSERT INTO traces (ts, source, kind, correlation, payload, sha256, admissible, gate_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ts, input.source, input.kind, input.correlation ?? null, input.payload, sha256, admissible ? 1 : 0, reason,
  );
  const id = one<{ id: number }>("SELECT id FROM traces WHERE sha256 = ?", sha256)!.id;
  return { id, admissible, reason, sha256 };
}

export function traceStats() {
  const row = one<any>(
    "SELECT COUNT(*) AS total, SUM(admissible) AS admissible FROM traces",
  );
  return { total: row?.total ?? 0, admissible: row?.admissible ?? 0, inadmissible: (row?.total ?? 0) - (row?.admissible ?? 0) };
}

export function lastTraces(limit = 12, onlyAdmissible = false) {
  return all<any>(
    onlyAdmissible
      ? "SELECT id, ts, source, kind, correlation, admissible, gate_reason, substr(payload, 1, 160) AS payload, sha256 FROM traces WHERE admissible = 1 ORDER BY id DESC LIMIT ?"
      : "SELECT id, ts, source, kind, correlation, admissible, gate_reason, substr(payload, 1, 160) as payload, sha256 FROM traces ORDER BY id DESC LIMIT ?",
    limit,
  );
}

export function recentAdmissible(limit: number) {
  return all<any>(
    "SELECT id, ts, source, kind, correlation, payload FROM traces WHERE admissible = 1 ORDER BY id DESC LIMIT ?",
    limit,
  ).reverse();
}
