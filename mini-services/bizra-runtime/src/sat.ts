/**
 * BIZRA Node0 — SAT, the Deterministic Verifier.
 * No model. No memory of praise. Nothing to reward-hack.
 * SAT checks FORM, PROVENANCE, CLAMPS, and CORROBORATION — the complete diagnostic
 * contract. A trace-derived conclusion is promoted to an authoritative insight ONLY
 * after all four clauses pass. SAT never checks semantics; semantic risk is carried
 * honestly by reversibility, not by pretending a grader understands intent.
 */
import { all, one, run } from "./store";
import { sha256obj, nowIso } from "./hash";

const URL_OR_IP = /(https?:\/\/|ftp:\/\/|(\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b)|[A-Za-z0-9+/]{80,}={0,2})/;

export interface SatVerdict {
  status: "PASS" | "FAIL";
  subject: string;
  reason: string;
  clauses?: Record<string, { pass: boolean; detail: string }>;
  sat_verdict_sha256: string;
}

function logSat(verdict: SatVerdict) {
  run(
    "INSERT INTO sat_log (ts, subject, verdict, clauses, reason) VALUES (?, ?, ?, ?, ?)",
    nowIso(), verdict.subject, verdict.status,
    verdict.clauses ? JSON.stringify(verdict.clauses) : null,
    verdict.reason,
  );
}

export function lastSat() {
  return one<any>("SELECT ts, subject, verdict, clauses, reason FROM sat_log ORDER BY id DESC LIMIT 1");
}

// ---------------------------------------------------------------------------
// Mission proposal — the form law.
// ---------------------------------------------------------------------------

export function verifyMissionProposal(
  missionId: string,
  text: string,
  anchors: string[],
  opts: { minBytes: number; maxBytes: number },
): SatVerdict {
  const reasons: string[] = [];
  const trimmed = text.trim();
  if (Buffer.byteLength(trimmed, "utf8") < opts.minBytes) reasons.push(`too_short (${opts.minBytes}B min)`);
  if (Buffer.byteLength(trimmed, "utf8") > opts.maxBytes) reasons.push(`too_long (${opts.maxBytes}B cap)`);
  const missing = anchors.filter((a) => !trimmed.includes(a));
  if (missing.length > 0) reasons.push(`missing_anchors: ${missing.map((m) => JSON.stringify(m)).join(", ")}`);
  const forbidden = trimmed.match(URL_OR_IP);
  if (forbidden) reasons.push(`forbidden_channel_risk: ${JSON.stringify(forbidden[0].slice(0, 40))}`);
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0E-\x1F\x7F]/.test(trimmed)) reasons.push("control_characters_present (hidden-channel law)");
  const status = reasons.length === 0 ? "PASS" : "FAIL";
  const verdict: SatVerdict = {
    status,
    subject: missionId,
    reason: status === "PASS" ? "form law satisfied: anchors, caps, no hidden channels" : reasons.join("; "),
    sat_verdict_sha256: "",
  };
  verdict.sat_verdict_sha256 = sha256obj({ mission: missionId, status, reasons, text_sha256: sha256obj(text) });
  logSat(verdict);
  return verdict;
}

// ---------------------------------------------------------------------------
// Cycle hypothesis — the complete diagnostic contract.
// provenance / consistency / disambiguation / corroboration
// ---------------------------------------------------------------------------

export interface DiagnosticInput {
  cycleId: string;
  hypothesis: string;
  targetContract: string;
  beforeValue: number;
  afterValue: number;
  dod: string;
  citedTraces: number[];
  catalog: { key: string; value: number; min: number; max: number }[];
  corroborationMin: number;
}

export function verifyDiagnosticContract(input: DiagnosticInput): SatVerdict {
  const clauses: Record<string, { pass: boolean; detail: string }> = {};

  // 1. PROVENANCE — every cited trace exists, was admitted, and its seal is intact.
  const provenanceDetails: string[] = [];
  const citedRows: { id: number; source: string; sha256: string; admissible: number; ts: string; source2: string; kind: string; correlation: string | null; payload: string }[] = [];
  let provenancePass = input.citedTraces.length > 0;
  const seen = new Set<number>();
  for (const id of input.citedTraces) {
    if (seen.has(id)) { provenancePass = false; provenanceDetails.push(`#${id} duplicated`); continue; }
    seen.add(id);
    const row = one<any>("SELECT id, ts, source, kind, correlation, payload, sha256, admissible FROM traces WHERE id = ?", id);
    if (!row) { provenancePass = false; provenanceDetails.push(`#${id} does not exist (invented citation)`); continue; }
    const recompute = sha256obj({ ts: row.ts, source: row.source, kind: row.kind, correlation: row.correlation, payload: row.payload });
    if (recompute !== row.sha256) { provenancePass = false; provenanceDetails.push(`#${id} seal mismatch`); continue; }
    if (!row.admissible) { provenancePass = false; provenanceDetails.push(`#${id} is inadmissible evidence`); continue; }
    citedRows.push(row);
  }
  if (input.citedTraces.length === 0) provenanceDetails.push("no citations");
  clauses.provenance = { pass: provenancePass, detail: provenanceDetails.length ? provenanceDetails.join("; ") : `${citedRows.length} cited traces verified against their seals` };

  // 2. CONSISTENCY — the proposal does not contradict sealed state.
  const consistencyDetails: string[] = [];
  const cat = input.catalog.find((c) => c.key === input.targetContract);
  let consistencyPass = !!cat;
  if (!cat) {
    consistencyDetails.push("target not in catalog");
  } else {
    if (cat.value !== input.beforeValue) { consistencyPass = false; consistencyDetails.push(`claimed before ${input.beforeValue} != sealed value ${cat.value}`); }
    if (input.afterValue === input.beforeValue) { consistencyPass = false; consistencyDetails.push("no-op change"); }
    if (input.afterValue < cat.min || input.afterValue > cat.max) { consistencyPass = false; consistencyDetails.push(`after ${input.afterValue} outside constitutional clamp [${cat.min},${cat.max}]`); }
    if (input.targetContract === "SAT_CORROBORATION_MIN" && input.afterValue < 2) { consistencyPass = false; consistencyDetails.push("corroboration floor of 2 is constitutional — no one may lower it, including the system"); }
    if (!input.dod.includes(input.targetContract)) { consistencyPass = false; consistencyDetails.push("DoD does not name its target"); }
    if (input.hypothesis.length === 0 || input.hypothesis.length > 500) { consistencyPass = false; consistencyDetails.push("hypothesis empty or >500 chars"); }
  }
  clauses.consistency = { pass: consistencyPass, detail: consistencyDetails.length ? consistencyDetails.join("; ") : "before/after/clamp/DoD consistent with sealed state" };

  // 3. DISAMBIGUATION — exactly one target, uniquely identified, typed.
  const disDetails: string[] = [];
  let disambiguationPass = !!cat && Number.isFinite(input.afterValue) && Number.isFinite(input.beforeValue);
  if (!cat) disDetails.push("target contract unresolved");
  if (!Number.isFinite(input.afterValue)) disDetails.push("after_value not a finite number");
  if (cat && input.catalog.filter((c) => c.key === input.targetContract).length !== 1) { disambiguationPass = false; disDetails.push("ambiguous catalog resolution"); }
  clauses.disambiguation = { pass: disambiguationPass, detail: disDetails.length ? disDetails.join("; ") : `unique target ${input.targetContract}, typed numeric transition` };

  // 4. CORROBORATION — independent sources, not volume.
  const sources = new Set(citedRows.map((r) => r.source));
  const corroborationPass = sources.size >= input.corroborationMin;
  clauses.corroboration = {
    pass: corroborationPass,
    detail: corroborationPass
      ? `${sources.size} distinct sources (${[...sources].join(", ")}) >= floor ${input.corroborationMin}`
      : `only ${sources.size} distinct source(s) — floor is ${input.corroborationMin}; volume is not independence`,
  };

  const failed = Object.entries(clauses).filter(([, v]) => !v.pass).map(([k]) => k);
  const status: "PASS" | "FAIL" = failed.length === 0 ? "PASS" : "FAIL";
  const verdict: SatVerdict = {
    status,
    subject: input.cycleId,
    reason: status === "PASS"
      ? "diagnostic contract complete: provenance+consistency+disambiguation+corroboration — promoted to authoritative insight"
      : `contract failed at: ${failed.join(", ")}`,
    clauses,
    sat_verdict_sha256: "",
  };
  verdict.sat_verdict_sha256 = sha256obj({ cycle: input.cycleId, status, clauses, target: input.targetContract, after: input.afterValue });
  logSat(verdict);
  return verdict;
}

export function satLog(limit = 8) {
  return all<any>("SELECT ts, subject, verdict, clauses, reason FROM sat_log ORDER BY id DESC LIMIT ?", limit);
}
