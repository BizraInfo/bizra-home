/**
 * BIZRA Node0 — the Autopoietic Cycle.
 * An event-driven state machine in which traces produce hypotheses, hypotheses
 * produce bounded proposals, and proposals become system changes ONLY through
 * independently verified, constitutionally authorized, reversible transitions.
 *
 *   ingest traces -> admissibility gate -> signals (deterministic)
 *   -> PAT hypothesis (live model, one bounded call — or an honest PAT-0 trigger)
 *   -> SAT diagnostic contract (provenance, consistency, disambiguation, corroboration)
 *   -> FATE lease -> TRANSITION (before-snapshot) -> sealed receipt -> REVERTIBLE
 *
 * The only mutable surface is the engine's own contracts, clamped. The system
 * builds the system — and can always undo what it built.
 */
import { one, run, all } from "./store";
import { nowIso, sha256hex, sha256obj } from "./hash";
import { appendReceipt } from "./chain";
import { relay } from "./dema";
import { ingestTrace, recentAdmissible } from "./traces";
import { proposeCycleHypothesis, patStats } from "./pat";
import { verifyDiagnosticContract } from "./sat";
import { issueLease, consumeLease, leaseDecisionHash } from "./fate";
import { contractsSnapshot, contractValue, setContractValue, CONTRACT_CATALOG } from "./contracts";

export interface CycleStep {
  stage: string;
  status: "DONE" | "REFUSED" | "UNKNOWN" | "SKIPPED";
  detail: string;
}

export interface CycleReport {
  cycle_id: string;
  status: "DONE" | "REFUSED" | "UNKNOWN";
  reason: string;
  steps: CycleStep[];
  ingested: { id: number | null; admissible: boolean; reason: string }[];
  signals: Record<string, number>;
  hypothesis?: {
    id: number;
    mode: string;
    status: string;
    hypothesis?: string;
    target_contract?: string;
    after_value?: number;
    cited_traces?: number[];
  };
  sat?: { verdict: "PASS" | "FAIL"; reason: string; clauses?: any };
  transition?: { id: number; contract_key: string; before: number; after: number; receipt_seq: number; receipt_digest: string };
}

function nextCycleId(): string {
  const n = (one<{ n: number }>("SELECT COUNT(*) AS n FROM cycles")?.n ?? 0) + 1;
  return `CYCLE-${String(n).padStart(3, "0")}`;
}

/** Deterministic signals — recomputed from sealed state. SAT re-derives these; PAT may not contradict them. */
export function computeSignals() {
  const missions = one<any>("SELECT COUNT(*) AS n FROM missions WHERE status = 'SEALED'")?.n ?? 0;
  const refusals = all<any>("SELECT reason FROM dema WHERE status = 'REFUSED'");
  const leaseExpired = one<any>("SELECT COUNT(*) AS n FROM leases WHERE consumed_at IS NULL AND expires_at < ?") ?? { n: 0 };
  const tracesAdmitted = one<any>("SELECT COUNT(*) AS n FROM traces WHERE admissible = 1")?.n ?? 0;
  const distinctSources = one<any>("SELECT COUNT(DISTINCT source) AS n FROM traces WHERE admissible = 1")?.n ?? 0;
  const chainLen = one<any>("SELECT COUNT(*) AS n FROM receipts")?.n ?? 0;
  const transitions = one<any>("SELECT COUNT(*) AS n FROM transitions WHERE reverted = 0")?.n ?? 0;
  const window = contractValue("HYPOTHESIS_WINDOW");
  return {
    missions_sealed: missions,
    refusal_events: refusals.length,
    refusals_cited_ttl: refusals.filter((r: any) => String(r.reason ?? "").includes("TTL") || String(r.reason ?? "").includes("EXPIRED")).length,
    leases_expired_unconsumed: leaseExpired.n ?? 0,
    traces_admitted: tracesAdmitted,
    distinct_sources: distinctSources,
    chain_len: chainLen,
    transitions_live: transitions,
    hypothesis_window: window,
    window_utilization: tracesAdmitted / window,
    pat_model_calls: patStats().model_calls,
    pat_model_failures: patStats().model_failures,
  };
}

/** PAT-0: deterministic triggers. Pure code, honestly labeled, same gate downstream. */
function deterministicTrigger(signals: Record<string, number>): {
  fires: boolean;
  hypothesis: string;
  target: string;
  after: number;
  dod: string;
} | null {
  // Trigger 1: evidence starvation — the window dwarfs real volume; shrink toward the truth (floor 10).
  if (signals.hypothesis_window > 10 && signals.traces_admitted > 0 && signals.traces_admitted <= Math.ceil(signals.hypothesis_window / 4)) {
    const after = Math.max(10, Math.ceil(signals.traces_admitted * 1.25));
    if (after < signals.hypothesis_window) {
      return {
        fires: true,
        hypothesis: `Evidence scarcity: ${signals.traces_admitted} admitted traces against a window of ${signals.hypothesis_window} — the context is starved; shrink the window toward the measured volume.`,
        target: "HYPOTHESIS_WINDOW",
        after,
        dod: "HYPOTHESIS_WINDOW matches measured evidence volume; next cycle reads a tight, honest context.",
      };
    }
  }
  // Trigger 2: saturation — admitted traces reached the window; grow it (ceiling 200).
  if (signals.traces_admitted >= signals.hypothesis_window && signals.hypothesis_window < 200) {
    return {
      fires: true,
      hypothesis: `Evidence saturation: ${signals.traces_admitted} admitted traces have filled the ${signals.hypothesis_window}-trace window — PAT's context is truncated; grow the window.`,
      target: "HYPOTHESIS_WINDOW",
      after: Math.min(200, Math.ceil(signals.hypothesis_window * 1.5)),
      dod: "HYPOTHESIS_WINDOW exceeds admitted evidence; no truncation in the next cycle's context.",
    };
  }
  // Trigger 3: lease expiry observed — the TTL is shorter than real mission latency; widen it (ceiling 120s).
  if (signals.leases_expired_unconsumed > 0) {
    const current = contractValue("FATE_TTL_MS");
    const after = Math.min(120000, Math.ceil(current * 1.5));
    if (after > current) {
      return {
        fires: true,
        hypothesis: `Lease expiry observed (${signals.leases_expired_unconsumed} unconsumed expired): FATE's TTL is shorter than real bounded-mission latency; widen the TTL within its clamp.`,
        target: "FATE_TTL_MS",
        after,
        dod: "FATE_TTL_MS exceeds the slowest measured bounded mission; no lease expires before its effect.",
      };
    }
  }
  return null;
}

export async function runCycle(): Promise<CycleReport> {
  const cycleId = nextCycleId();
  const steps: CycleStep[] = [];
  const ingested: CycleReport["ingested"] = [];
  const signals = computeSignals();

  run("INSERT INTO cycles (ts, cycle_id, status, detail) VALUES (?, ?, 'RUNNING', ?)", nowIso(), cycleId, "autopoietic cycle open");
  ingestTrace({ source: "cycle", kind: "heartbeat", correlation: cycleId, payload: JSON.stringify({ event: "CYCLE_OPEN", signals }) });

  // ------------------------------------------------------------------
  // STAGE 1 — INGEST: the runtime observes itself (real measured traces)
  // ------------------------------------------------------------------
  const runtimeTrace = ingestTrace({
    source: "runtime",
    kind: "metric",
    correlation: cycleId,
    payload: JSON.stringify({ uptime_boot: one<any>("SELECT value FROM node0 WHERE key = 'boot_count'")?.value ?? "1", chain_len: signals.chain_len, missions_sealed: signals.missions_sealed, refusals: signals.refusal_events }),
  });
  ingested.push(runtimeTrace);
  steps.push({ stage: "INGEST", status: runtimeTrace.admissible ? "DONE" : "REFUSED", detail: `self-observation trace #${runtimeTrace.id}: ${runtimeTrace.reason}` });

  const window = contractValue("HYPOTHESIS_WINDOW");
  const evidence = recentAdmissible(window);
  steps.push({ stage: "EVIDENCE", status: "DONE", detail: `${evidence.length} admissible traces in window (of ${signals.traces_admitted} total, ${signals.distinct_sources} distinct sources)` });

  // ------------------------------------------------------------------
  // STAGE 2 — HYPOTHESIS: PAT proposes (PAT-0 trigger or one live model call)
  // ------------------------------------------------------------------
  const catalog = contractsSnapshot();
  const corroborationMin = contractValue("SAT_CORROBORATION_MIN");
  const budget = contractValue("PAT_MODEL_BUDGET");

  const trigger = deterministicTrigger(signals);
  let hypothesisRow: { id: number; mode: string; proposal: any; cited: number[]; model_calls: number };

  if (trigger?.fires) {
    const cited = evidence.slice(-Math.max(corroborationMin, 2)).map((t: any) => t.id);
    const proposal = {
      proposal: "YES",
      hypothesis: trigger.hypothesis,
      target_contract: trigger.target,
      after_value: trigger.after,
      dod: trigger.dod,
      cited_traces: cited,
    };
    const proposalSha = sha256obj({ cycle: cycleId, mode: "DETERMINISTIC", proposal });
    run(
      "INSERT INTO hypotheses (ts, cycle_id, mode, status, hypothesis, target_contract, before_value, after_value, dod, cited_traces, proposal_sha256, detail, model_calls) VALUES (?, ?, 'DETERMINISTIC', 'PROPOSED', ?, ?, ?, ?, ?, ?, ?, ?, 0)",
      nowIso(), cycleId, trigger.hypothesis, trigger.target, String(contractValue(trigger.target)), String(trigger.after), trigger.dod, JSON.stringify(cited), proposalSha, "PAT-0 deterministic trigger — no model call spent",
    );
    const id = one<{ id: number }>("SELECT id FROM hypotheses WHERE proposal_sha256 = ?", proposalSha)!.id;
    hypothesisRow = { id, mode: "DETERMINISTIC", proposal, cited, model_calls: 0 };
    steps.push({ stage: "HYPOTHESIS", status: "DONE", detail: `PAT-0 deterministic trigger fired (${trigger.target}); 0 model calls spent — same gate applies downstream` });
  } else {
    if (evidence.length < 2) {
      const reason = "PAT_NO_EVIDENCE: fewer than 2 admissible traces in window — refusing to hallucinate a hypothesis";
      run("UPDATE cycles SET status = 'REFUSED', detail = ? WHERE cycle_id = ?", reason, cycleId);
      relay("REFUSED", cycleId, reason);
      ingestTrace({ source: "cycle", kind: "refusal", correlation: cycleId, payload: JSON.stringify({ reason }) });
      return { cycle_id: cycleId, status: "REFUSED", reason, steps, ingested, signals: signals as any };
    }
    const pat = await proposeCycleHypothesis(
      cycleId,
      signals,
      catalog.map((c) => ({ key: c.key, label: c.label, value: c.value, min: c.min, max: c.max, unit: c.unit, description: c.description })),
      evidence.map((t: any) => ({ id: t.id, source: t.source, kind: t.kind, payload: t.payload })),
      corroborationMin,
    );
    if (!pat.ok) {
      run("INSERT INTO hypotheses (ts, cycle_id, mode, status, detail, model_calls) VALUES (?, ?, 'LIVE_MODEL', 'REFUSED', ?, ?)", nowIso(), cycleId, pat.reason, 1);
      run("UPDATE cycles SET status = 'REFUSED', detail = ? WHERE cycle_id = ?", pat.reason, cycleId);
      relay("REFUSED", cycleId, pat.reason);
      ingestTrace({ source: "cycle", kind: "refusal", correlation: cycleId, payload: JSON.stringify({ reason: pat.reason }) });
      return { cycle_id: cycleId, status: "REFUSED", reason: pat.reason, steps, ingested, signals: signals as any };
    }
    if (pat.hypothesis.proposal === "NO") {
      const proposalSha = sha256obj({ cycle: cycleId, mode: "LIVE_MODEL", proposal: pat.hypothesis });
      run(
        "INSERT INTO hypotheses (ts, cycle_id, mode, status, hypothesis, target_contract, before_value, after_value, dod, cited_traces, proposal_sha256, detail, model_calls) VALUES (?, ?, 'LIVE_MODEL', 'NO_PROPOSAL', ?, NULL, NULL, NULL, ?, ?, ?, ?, ?)",
        nowIso(), cycleId, pat.hypothesis.hypothesis ?? "model judged the evidence supports no change", JSON.stringify(pat.hypothesis.cited_traces ?? []), JSON.stringify(pat.hypothesis.dod ?? ""), "LIVE_MODEL examined the evidence and declined to propose — an honest null", 1,
      );
      const reason = "PAT (LIVE_MODEL) examined the evidence and proposed NO change — stability is a result, not a failure";
      run("UPDATE cycles SET status = 'DONE', detail = ? WHERE cycle_id = ?", reason, cycleId);
      relay("DONE", cycleId, reason);
      ingestTrace({ source: "cycle", kind: "receipt", correlation: cycleId, payload: JSON.stringify({ event: "NO_PROPOSAL", cited: pat.hypothesis.cited_traces }) });
      return { cycle_id: cycleId, status: "DONE", reason, steps, ingested, signals: signals as any };
    }
    const proposalSha = sha256obj({ cycle: cycleId, mode: "LIVE_MODEL", proposal: pat.hypothesis });
    run(
      "INSERT INTO hypotheses (ts, cycle_id, mode, status, hypothesis, target_contract, before_value, after_value, dod, cited_traces, proposal_sha256, detail, model_calls) VALUES (?, ?, 'LIVE_MODEL', 'PROPOSED', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      nowIso(), cycleId, pat.hypothesis.hypothesis, pat.hypothesis.target_contract, String(contractValue(pat.hypothesis.target_contract)), String(pat.hypothesis.after_value), pat.hypothesis.dod, JSON.stringify(pat.hypothesis.cited_traces), proposalSha, `one bounded live-model call, ${pat.raw.length}B raw`, pat.model_calls,
    );
    const id = one<{ id: number }>("SELECT id FROM hypotheses WHERE proposal_sha256 = ?", proposalSha)!.id;
    hypothesisRow = { id, mode: "LIVE_MODEL", proposal: pat.hypothesis, cited: pat.hypothesis.cited_traces, model_calls: pat.model_calls };
    steps.push({ stage: "HYPOTHESIS", status: "DONE", detail: `PAT (LIVE_MODEL) proposed: ${pat.hypothesis.target_contract} -> ${pat.hypothesis.after_value} (1 bounded call)` });
  }

  // ------------------------------------------------------------------
  // STAGE 3 — SAT: the complete diagnostic contract
  // ------------------------------------------------------------------
  const target = hypothesisRow.proposal.target_contract;
  const before = contractValue(target);
  const verdict = verifyDiagnosticContract({
    cycleId,
    hypothesis: hypothesisRow.proposal.hypothesis,
    targetContract: target,
    beforeValue: before,
    afterValue: Number(hypothesisRow.proposal.after_value),
    dod: hypothesisRow.proposal.dod,
    citedTraces: hypothesisRow.cited,
    catalog: catalog.map((c) => ({ key: c.key, value: c.value, min: c.min, max: c.max })),
    corroborationMin,
  });
  if (verdict.status !== "PASS") {
    run("UPDATE hypotheses SET status = 'REFUSED' WHERE id = ?", hypothesisRow.id);
    const reason = `SAT: ${verdict.reason}`;
    run("UPDATE cycles SET status = 'REFUSED', detail = ? WHERE cycle_id = ?", reason, cycleId);
    relay("REFUSED", cycleId, reason);
    ingestTrace({ source: "cycle", kind: "refusal", correlation: cycleId, payload: JSON.stringify({ reason }) });
    return { cycle_id: cycleId, status: "REFUSED", reason, steps, ingested, signals: signals as any, hypothesis: { id: hypothesisRow.id, mode: hypothesisRow.mode, status: "REFUSED" }, sat: { verdict: "FAIL", reason: verdict.reason, clauses: verdict.clauses } };
  }
  run("UPDATE hypotheses SET status = 'SAT_PASS_PROMOTED' WHERE id = ?", hypothesisRow.id);
  steps.push({ stage: "SAT", status: "DONE", detail: `diagnostic contract complete — promoted to authoritative insight (verdict ${verdict.sat_verdict_sha256.slice(0, 12)}…)` });

  // ------------------------------------------------------------------
  // STAGE 4 — FATE: a single-use lease for the transition
  // ------------------------------------------------------------------
  const leaseRes = issueLease(`${cycleId}:${target}`, "CONTRACT_TRANSITION", { ttlMs: contractValue("FATE_TTL_MS"), effectClass: "CONTRACT_TRANSITION" });
  if (!leaseRes.ok) {
    const reason = `FATE: ${leaseRes.reason}`;
    run("UPDATE cycles SET status = 'REFUSED', detail = ? WHERE cycle_id = ?", reason, cycleId);
    relay("REFUSED", cycleId, reason);
    return { cycle_id: cycleId, status: "REFUSED", reason, steps, ingested, signals: signals as any };
  }
  const consumed = consumeLease(leaseRes.lease.id);
  if (!consumed.ok) {
    const reason = `FATE: ${consumed.reason}`;
    relay("REFUSED", cycleId, reason);
    return { cycle_id: cycleId, status: "REFUSED", reason, steps, ingested, signals: signals as any };
  }
  steps.push({ stage: "FATE", status: "DONE", detail: `transition lease ${leaseRes.lease.id} issued and consumed (single-use)` });

  // ------------------------------------------------------------------
  // STAGE 5 — TRANSITION: apply the change, snapshot the before, seal 8 hashes
  // ------------------------------------------------------------------
  const after = Number(hypothesisRow.proposal.after_value);
  try {
    setContractValue(target, after, `AUTO:${cycleId}`);
  } catch (e: any) {
    const reason = `TRANSITION_CLAMP: ${e?.message}`;
    relay("REFUSED", cycleId, reason);
    return { cycle_id: cycleId, status: "REFUSED", reason, steps, ingested, signals: signals as any };
  }
  const catalogHash = sha256hex(CONTRACT_CATALOG.map((c) => `${c.key}:${c.key === target ? after : contractValue(c.key)}[${c.min},${c.max}]`).join("|"));
  const eight = {
    cycle_hash: sha256hex(cycleId),
    contract_hash: catalogHash,
    hypothesis_hash: sha256hex(String(hypothesisRow.id)),
    proposal_hash: sha256obj(hypothesisRow.proposal),
    sat_verdict_hash: verdict.sat_verdict_sha256,
    fate_decision_hash: leaseDecisionHash(leaseRes.lease),
    before_hash: sha256hex(String(before)),
    after_hash: sha256hex(String(after)),
  };
  const receipt = appendReceipt("TRANSITION_RECEIPT", `${cycleId}:${target}`, { ...eight, target, before, after, reversible: true, hypothesis_id: hypothesisRow.id });
  run(
    "INSERT INTO transitions (ts, cycle_id, contract_key, before_value, after_value, hypothesis_id, receipt_seq) VALUES (?, ?, ?, ?, ?, ?, ?)",
    nowIso(), cycleId, target, String(before), String(after), hypothesisRow.id, receipt.seq,
  );
  const transitionId = one<{ id: number }>("SELECT id FROM transitions WHERE cycle_id = ? AND contract_key = ?", cycleId, target)!.id;
  steps.push({ stage: "TRANSITION", status: "DONE", detail: `${target}: ${before} -> ${after} applied; before-snapshot sealed; one-click REVERT armed` });

  const reason = `autopoietic transition sealed: ${target} ${before} -> ${after} (receipt #${receipt.seq}, 8 hashes, reversible)`;
  run("UPDATE cycles SET status = 'DONE', detail = ? WHERE cycle_id = ?", reason, cycleId);
  relay("DONE", cycleId, reason, receipt.digest);
  ingestTrace({ source: "cycle", kind: "receipt", correlation: cycleId, payload: JSON.stringify({ event: "TRANSITION", target, before, after, receipt: receipt.seq }) });

  return {
    cycle_id: cycleId,
    status: "DONE",
    reason,
    steps,
    ingested,
    signals: signals as any,
    hypothesis: {
      id: hypothesisRow.id,
      mode: hypothesisRow.mode,
      status: "SAT_PASS_PROMOTED",
      hypothesis: hypothesisRow.proposal.hypothesis,
      target_contract: target,
      after_value: after,
      cited_traces: hypothesisRow.cited,
    },
    sat: { verdict: "PASS", reason: verdict.reason, clauses: verdict.clauses },
    transition: { id: transitionId, contract_key: target, before, after, receipt_seq: receipt.seq, receipt_digest: receipt.digest },
  };
}

/** Revert a transition. Human authority, sealed, never silent. The before-snapshot is restored. */
export function revertTransition(transitionId: number): { ok: true; receipt: any; restored: number } | { ok: false; reason: string } {
  const t = one<any>("SELECT * FROM transitions WHERE id = ?", transitionId);
  if (!t) return { ok: false, reason: `transition ${transitionId} not found` };
  if (t.reverted) return { ok: false, reason: `transition ${transitionId} already reverted at ${t.reverted_at}` };
  const before = Number(t.before_value);
  const current = contractValue(t.contract_key);
  setContractValue(t.contract_key, before, `REVERT:${transitionId}`);
  const leaseRes = issueLease(`REVERT-${transitionId}`, "CONTRACT_TRANSITION", { ttlMs: contractValue("FATE_TTL_MS"), effectClass: "CONTRACT_TRANSITION" });
  const lease = leaseRes.ok ? leaseRes.lease : null;
  if (lease) consumeLease(lease.id);
  const receipt = appendReceipt("TRANSITION_REVERT", `REVERT-${transitionId}`, {
    reverted_transition: transitionId,
    contract_key: t.contract_key,
    from: current,
    restored: before,
    authority: "HUMAN",
    fate_decision_hash: lease ? leaseDecisionHash(lease) : null,
  });
  run("UPDATE transitions SET reverted = 1, reverted_at = ?, revert_receipt_seq = ? WHERE id = ?", nowIso(), receipt.seq, transitionId);
  relay("DONE", `REVERT-${transitionId}`, `human reverted transition ${transitionId}: ${t.contract_key} restored to ${before}`, receipt.digest);
  ingestTrace({ source: "operator", kind: "receipt", correlation: `REVERT-${transitionId}`, payload: JSON.stringify({ event: "REVERT", transition: transitionId, restored: before }) });
  return { ok: true, receipt, restored: before };
}
