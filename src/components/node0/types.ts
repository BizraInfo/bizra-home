/**
 * BIZRA Node0 — API shape of the live constitutional runtime on :7421.
 * Mirrors mini-services/bizra-runtime/src/state.ts (buildState).
 * Everything displayed in the console comes from these fields — no mocks.
 */

export interface RuntimeInfo {
  name: string;
  port: number;
  status: "LIVE" | "HALTED" | string;
  halted_reason: string | null;
  phase: string;
  sealed_at: string | null;
  live_at: string | null;
  boot_count: number;
  started_at: string;
  uptime_ms: number;
  tz: string;
  now: string;
}

export interface ConstitutionFile {
  name: string;
  role: string;
  bytes: number;
  sha256: string;
  verified: boolean;
}

export interface ConstitutionInfo {
  verified: boolean;
  root_hash: string;
  drift: string[];
  files: ConstitutionFile[];
  law: string;
}

export interface SpineInfo {
  sealed_source_digest: string;
  current_source_digest: string;
  source_drift: boolean;
  drift_note: string;
}

export interface Node0Info {
  phase: string;
  spine: SpineInfo;
}

export interface Receipt {
  seq: number;
  ts: string;
  kind: string;
  subject: string;
  digest: string;
  prev: string;
}

export interface ChainInfo {
  ok: boolean;
  len: number;
  head: string;
  brokenAt: number | null;
  last: Receipt[];
}

export interface Contract {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  description: string;
  updated_at: string;
  updated_by: string;
}

export interface PatEntry {
  ts: string;
  subject: string;
  purpose: string;
  mode: string;
  status: string;
  calls: number;
  detail: string;
}

export interface Pat {
  organs: string;
  mode: string;
  model_calls: number;
  model_failures: number;
  last: PatEntry | null;
}

export interface SatClause {
  pass: boolean;
  detail: string;
}

export interface SatClauses {
  provenance?: SatClause;
  consistency?: SatClause;
  disambiguation?: SatClause;
  corroboration?: SatClause;
}

export interface SatEntry {
  ts: string;
  subject: string;
  verdict: "PASS" | "FAIL" | string;
  clauses: string; // JSON string — parsed defensively
  reason: string;
}

export interface Sat {
  organs: string;
  deterministic: boolean;
  last: SatEntry | null;
  log: SatEntry[];
}

export interface FateLease {
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
  status: "CONSUMED" | "ACTIVE" | "EXPIRED" | string;
}

export interface Fate {
  organs: string;
  stats: {
    total: number;
    active: number;
    consumed: number;
    expired_ever: number;
  };
  registry: FateLease[];
  ambient_authority: string;
}

export interface TraceEntry {
  id: number;
  ts: string;
  source: string;
  kind: string;
  correlation: string;
  admissible: 0 | 1;
  gate_reason: string;
  payload: string;
  sha256: string;
}

export interface Traces {
  gate: string;
  stats: {
    total: number;
    admissible: number;
    inadmissible: number;
  };
  last: TraceEntry[];
}

export interface Hypothesis {
  id: number;
  ts: string;
  cycle_id: string;
  mode: "LIVE_MODEL" | "DETERMINISTIC" | string;
  status: string;
  hypothesis: string;
  target_contract: string;
  before_value: string;
  after_value: string;
  dod: string;
  cited_traces: string; // JSON array string — parsed defensively
  detail: string;
  model_calls: number;
}

export interface Transition {
  id: number;
  ts: string;
  cycle_id: string;
  contract_key: string;
  before_value: string;
  after_value: string;
  hypothesis_id: number | null;
  receipt_seq: number | null;
  reverted: 0 | 1;
  reverted_at: string | null;
  receipt_digest: string;
}

export interface LadderStep {
  step: string;
  status: string;
  detail: string;
  hash: string;
}

export interface EightHashes {
  mission_hash: string;
  contract_hash: string;
  attempt_hash: string;
  proposal_hash: string;
  sat_verdict_hash: string;
  fate_decision_hash: string;
  effect_hash: string;
  observer_hash: string;
}

export interface MissionReceipt {
  seq: number;
  digest: string;
  eight_hashes: EightHashes;
}

export interface Mission {
  id: string;
  attempt_id: string;
  status: string;
  effect_path: string;
  effect_sha256: string;
  receipt_seq: number | null;
  effect_writes: number;
  started_at: string;
  finished_at: string | null;
  ladder: LadderStep[];
  receipt: MissionReceipt | null;
  reason: string | null;
  recovered: boolean;
}

export interface CycleEntry {
  ts: string;
  cycle_id: string;
  status: string;
  detail: string;
}

export interface DemaEntry {
  id: number;
  ts: string;
  subject: string;
  status: "DONE" | "REFUSED" | "UNKNOWN" | string;
  reason: string;
  receipt_digest: string;
}

export interface Signals {
  missions_sealed: number;
  refusal_events: number;
  refusals_cited_ttl: number;
  leases_expired_unconsumed: number;
  traces_admitted: number;
  distinct_sources: number;
  chain_len: number;
  transitions_live: number;
  hypothesis_window: number;
  window_utilization: number;
  pat_model_calls: number;
  pat_model_failures: number;
}

export interface OutboxFile {
  name: string;
  bytes: number;
  sha256: string;
  preview: string;
}

export interface Node0State {
  ok: boolean;
  runtime: RuntimeInfo;
  constitution: ConstitutionInfo;
  node0: Node0Info;
  chain: ChainInfo;
  contracts: Contract[];
  pat: Pat;
  sat: Sat;
  fate: Fate;
  traces: Traces;
  hypotheses: Hypothesis[];
  transitions: Transition[];
  missions: Mission[];
  cycles: CycleEntry[];
  dema: DemaEntry[];
  signals: Signals;
  outbox: OutboxFile[];
}

/* ------------------------------------------------------------------ */
/* Action responses                                                    */
/* ------------------------------------------------------------------ */

export interface MissionActionResult {
  status: string;
  reason: string | null;
  ladder?: LadderStep[];
  receipt?: MissionReceipt | null;
  effect_writes_total?: number;
  effect_writes?: number;
  recovered?: boolean;
}

export interface CycleStepResult {
  stage: string;
  status: string;
  detail: string;
}

export interface CycleActionResult {
  cycle_id: string;
  status: string;
  reason: string;
  steps: CycleStepResult[];
}

export interface TraceActionResult {
  id: number;
  admissible: boolean;
  reason: string;
  sha256?: string;
}

export interface RevertActionResult {
  ok: boolean;
  receipt?: Receipt;
  restored?: number;
  reason?: string;
}
