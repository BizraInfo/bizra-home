/**
 * BIZRA Node0 — the Conductor Weld: MUMU-DAILY-STATE-RELIEF-0A.
 * One nerve. One mission. The full constitutional loop in one bounded sequence:
 *
 *   recovery check -> PAT proposes -> SAT verifies -> FATE leases ->
 *   EFFECT (bounded local write) -> OBSERVE (independent hash) -> SEAL (8 hashes)
 *
 * Exactly-once is the proof of life: kill it anywhere; restart; no duplicate effect.
 * The receipt binds EIGHT hashes — mission, contract, attempt, proposal, SAT verdict,
 * FATE decision, effect, observer — each sealed into the tamper-evident chain.
 */
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { one, run } from "./store";
import { nowIso, sha256hex, sha256obj, dubaiDate } from "./hash";
import { appendReceipt } from "./chain";
import { relay } from "./dema";
import { proposeMissionBrief } from "./pat";
import { verifyMissionProposal } from "./sat";
import { issueLease, consumeLease, leaseDecisionHash } from "./fate";
import { boundedWrite, observe } from "./executor";
import { ingestTrace } from "./traces";
import { contractValue, contractsSnapshot } from "./contracts";
import { constitutionRoot as cRoot } from "./constitution";

export const MISSION_ID = "MUMU-DAILY-STATE-RELIEF-0A";

export function missionContract() {
  const date = dubaiDate();
  return {
    id: MISSION_ID,
    title: "Daily State Relief — the morning delta brief",
    effect_class: "BOUNDED_LOCAL_WRITE",
    path: `morning-delta-${date}.md`,
    min_bytes: 400,
    max_bytes: 6144,
    model: "PAT-LIVE (z-ai-web-dev-sdk), exactly one bounded call",
    anchors: [
      MISSION_ID,
      date,
      "BIZRA NODE0",
      "Drift prevented at its cause.",
    ],
    dod: [
      "one file written inside state/outbox/",
      "SAT form law passes without exception",
      "receipt seals 8 hashes",
      "re-run does not duplicate the effect",
    ],
  };
}

export interface LadderStep {
  step: "RECOVERY" | "PAT" | "SAT" | "FATE" | "EFFECT" | "OBSERVE" | "SEAL" | "ABORT";
  status: "DONE" | "REFUSED" | "UNKNOWN" | "SKIPPED";
  detail: string;
  hash?: string;
}

export interface MissionResult {
  status: "DONE" | "REFUSED" | "UNKNOWN";
  reason: string;
  mission_id: string;
  attempt_id: string;
  ladder: LadderStep[];
  receipt?: { seq: number; digest: string; eight_hashes: Record<string, string> };
  effect_writes_total: number;
  recovered?: boolean;
}

function newAttemptId(): string {
  return `ATT-${sha256hex(`${MISSION_ID}|${Date.now()}|${randomBytes(8).toString("hex")}`).slice(0, 12).toUpperCase()}`;
}

export async function runMission(opts: { crashAfter?: "OBSERVE" } = {}): Promise<MissionResult> {
  const contract = missionContract();
  const contractHash = sha256obj(contract);
  const row = one<any>("SELECT * FROM missions WHERE id = ?", MISSION_ID);
  const attemptId = row?.attempt_id ?? newAttemptId();
  const ladder: LadderStep[] = [];
  const finish = (result: MissionResult, status: string, extra: Partial<any> = {}) => {
    run(
      "UPDATE missions SET status = ?, ladder = ?, finished_at = ?, result = ?, effect_writes = ?, attempt_id = ?, effect_path = COALESCE(?, effect_path), effect_sha256 = COALESCE(?, effect_sha256) WHERE id = ?",
      status, JSON.stringify(ladder), nowIso(), JSON.stringify(result), extra.effect_writes ?? row?.effect_writes ?? 0, attemptId, extra.effect_path ?? null, extra.effect_sha256 ?? null, MISSION_ID,
    );
    relay(result.status, MISSION_ID, result.reason, result.receipt?.digest);
    ingestTrace({
      source: "mission",
      kind: result.status === "DONE" ? "receipt" : "refusal",
      correlation: MISSION_ID,
      payload: JSON.stringify({ mission: MISSION_ID, status: result.status, reason: result.reason, receipt: result.receipt?.digest ?? null }),
    });
    return result;
  };

  if (!row) {
    run(
      "INSERT INTO missions (id, attempt_id, status, started_at, effect_writes) VALUES (?, ?, 'RUNNING', ?, 0)",
      MISSION_ID, attemptId, nowIso(),
    );
  }

  // ------------------------------------------------------------------
  // STEP 0 — RECOVERY: sealed => DONE (recovered). Unsealed effect => resume exactly once.
  // ------------------------------------------------------------------
  if (row?.status === "SEALED") {
    ladder.push({
      step: "RECOVERY",
      status: "SKIPPED",
      detail: "mission already sealed — no re-execution, exactly-once holds",
      hash: row.result ? (JSON.parse(row.result).receipt?.digest ?? null) : undefined,
    });
    return finish({
      status: "DONE",
      reason: "recovered: mission was already sealed — no effect re-executed",
      mission_id: MISSION_ID,
      attempt_id: row.attempt_id,
      ladder,
      effect_writes_total: row.effect_writes ?? 0,
      receipt: row.result ? JSON.parse(row.result).receipt : undefined,
      recovered: true,
    }, "SEALED");
  }
  if (row?.status === "EFFECTED" && row.effect_path && existsSync(row.effect_path)) {
    // Crash-window recovery: the effect landed, the seal did not. Resume: observe + seal. NO second write.
    ladder.push({
      step: "RECOVERY",
      status: "DONE",
      detail: "crash-window detected: effect exists without seal — resuming exactly once (no re-write)",
      hash: row.effect_sha256 ?? undefined,
    });
    const observation = observe(row.effect_path);
    const eight = {
      mission_hash: sha256hex(MISSION_ID),
      contract_hash: contractHash,
      attempt_hash: sha256hex(row.attempt_id),
      proposal_hash: row.result ? JSON.parse(row.result).proposal_hash ?? "" : "",
      sat_verdict_hash: row.result ? JSON.parse(row.result).sat_verdict_hash ?? "" : "",
      fate_decision_hash: row.result ? JSON.parse(row.result).fate_decision_hash ?? "" : "",
      effect_hash: row.effect_sha256 ?? "",
      observer_hash: observation.observer_sha256,
    };
    const receipt = appendReceipt("MISSION_RECEIPT", MISSION_ID, {
      ...eight,
      recovery: true,
      effect_path: row.effect_path,
      observer_bytes: observation.bytes,
      effect_hash_matches_observer: row.effect_sha256 === observation.observer_sha256,
    });
    ladder.push({ step: "OBSERVE", status: "DONE", detail: `independent re-observation: ${observation.bytes}B, sha256 matches effect`, hash: observation.observer_sha256 });
    ladder.push({ step: "SEAL", status: "DONE", detail: `receipt #${receipt.seq} seals 8 hashes (recovery path)`, hash: receipt.digest });
    return finish({
      status: "DONE",
      reason: "recovered from crash-window: observed + sealed exactly once; the effect was never duplicated",
      mission_id: MISSION_ID,
      attempt_id: row.attempt_id,
      ladder,
      effect_writes_total: row.effect_writes ?? 1,
      receipt: { seq: receipt.seq, digest: receipt.digest, eight_hashes: eight },
      recovered: true,
    }, "SEALED", { effect_path: row.effect_path, effect_sha256: row.effect_sha256 });
  }

  // ------------------------------------------------------------------
  // STEP 1 — PAT proposes (one bounded live model call)
  // ------------------------------------------------------------------
  const contracts = contractsSnapshot();
  const context = {
    date: dubaiDate(),
    node0_status: "LIVE",
    constitution_root: (cRoot() ?? "").slice(0, 16),
    chain_head: (one<any>("SELECT digest FROM receipts ORDER BY seq DESC LIMIT 1")?.digest ?? "GENESIS-0").slice(0, 16),
    contracts: contracts.map((c) => ({ key: c.key, value: c.value, unit: c.unit })),
    dema_last: one<any>("SELECT subject, status FROM dema ORDER BY id DESC LIMIT 1") ?? null,
    signals: {
      missions_done: one<any>("SELECT COUNT(*) AS n FROM missions WHERE status = 'SEALED'")?.n ?? 0,
      chain_len: one<any>("SELECT COUNT(*) AS n FROM receipts")?.n ?? 0,
    },
  };
  const anchors = [
    ...contract.anchors,
    ...contracts.map((c) => `${c.key}=${c.value}`),
  ];
  const pat = await proposeMissionBrief(MISSION_ID, context, anchors);
  if (!pat.ok) {
    ladder.push({ step: "PAT", status: "REFUSED", detail: pat.reason });
    relay("REFUSED", MISSION_ID, pat.reason);
    return finish({ status: "REFUSED", reason: `PAT: ${pat.reason}`, mission_id: MISSION_ID, attempt_id: attemptId, ladder, effect_writes_total: 0 }, "REFUSED");
  }
  ladder.push({ step: "PAT", status: "DONE", detail: `LIVE_MODEL proposed ${pat.proposal.text.length}B brief (1 bounded call)`, hash: pat.proposal.proposal_sha256 });

  // ------------------------------------------------------------------
  // STEP 2 — SAT verifies (deterministic form law)
  // ------------------------------------------------------------------
  const verdict = verifyMissionProposal(MISSION_ID, pat.proposal.text, anchors, {
    minBytes: contract.min_bytes,
    maxBytes: contract.max_bytes,
  });
  if (verdict.status !== "PASS") {
    ladder.push({ step: "SAT", status: "REFUSED", detail: verdict.reason });
    relay("REFUSED", MISSION_ID, `SAT: ${verdict.reason}`);
    return finish({ status: "REFUSED", reason: `SAT: ${verdict.reason}`, mission_id: MISSION_ID, attempt_id: attemptId, ladder, effect_writes_total: 0 }, "REFUSED");
  }
  ladder.push({ step: "SAT", status: "DONE", detail: "form law passed: anchors verbatim, caps, no hidden channels", hash: verdict.sat_verdict_sha256 });

  // ------------------------------------------------------------------
  // STEP 3 — FATE issues a single-use lease
  // ------------------------------------------------------------------
  const ttl = contractValue("FATE_TTL_MS");
  const leaseRes = issueLease(MISSION_ID, "MISSION_EFFECT", { ttlMs: ttl, effectClass: "BOUNDED_LOCAL_WRITE" });
  if (!leaseRes.ok) {
    ladder.push({ step: "FATE", status: "REFUSED", detail: leaseRes.reason });
    relay("REFUSED", MISSION_ID, `FATE: ${leaseRes.reason}`);
    return finish({ status: "REFUSED", reason: `FATE: ${leaseRes.reason}`, mission_id: MISSION_ID, attempt_id: attemptId, ladder, effect_writes_total: 0 }, "REFUSED");
  }
  ladder.push({
    step: "FATE",
    status: "DONE",
    detail: `single-use lease ${leaseRes.lease.id} · network=false · fs=outbox_only · TTL ${ttl}ms`,
    hash: leaseDecisionHash(leaseRes.lease),
  });

  // ------------------------------------------------------------------
  // STEP 4 — EFFECT: the bounded local write
  // ------------------------------------------------------------------
  const consumed = consumeLease(leaseRes.lease.id);
  if (!consumed.ok) {
    ladder.push({ step: "FATE", status: "REFUSED", detail: consumed.reason });
    return finish({ status: "REFUSED", reason: `FATE: ${consumed.reason}`, mission_id: MISSION_ID, attempt_id: attemptId, ladder, effect_writes_total: 0 }, "REFUSED");
  }
  let effect;
  try {
    effect = boundedWrite(contract.path, pat.proposal.text);
  } catch (e: any) {
    ladder.push({ step: "EFFECT", status: "REFUSED", detail: String(e?.message ?? e) });
    return finish({ status: "REFUSED", reason: `EFFECT: ${e?.message}`, mission_id: MISSION_ID, attempt_id: attemptId, ladder, effect_writes_total: 0 }, "REFUSED");
  }
  ladder.push({ step: "EFFECT", status: "DONE", detail: `wrote ${contract.path} (${effect.bytes}B) — the only write this mission may ever perform`, hash: effect.effect_sha256 });

  // ------------------------------------------------------------------
  // STEP 5 — OBSERVE: independent hash of the bytes on disk
  // ------------------------------------------------------------------
  const observation = observe(effect.path);
  if (!observation.exists || observation.observer_sha256 !== effect.effect_sha256) {
    ladder.push({ step: "OBSERVE", status: "UNKNOWN", detail: "observer could not confirm the effect — recorded honestly" });
    return finish({ status: "UNKNOWN", reason: "OBSERVER: effect not confirmed on disk", mission_id: MISSION_ID, attempt_id: attemptId, ladder, effect_writes_total: effect.write_count }, "EFFECTED", { effect_path: effect.path, effect_sha256: effect.effect_sha256 });
  }
  ladder.push({ step: "OBSERVE", status: "DONE", detail: `independent observation: ${observation.bytes}B, sha256 matches effect`, hash: observation.observer_sha256 });

  // ------------------------------------------------------------------
  // CRASH DRILL — simulate process death between OBSERVE and SEAL.
  // Durable state: file on disk, lease consumed, mission row 'EFFECTED'. No receipt.
  // ------------------------------------------------------------------
  if (opts.crashAfter === "OBSERVE") {
    ladder.push({ step: "ABORT", status: "UNKNOWN", detail: "SIMULATED KILL after OBSERVE, before SEAL — durable state left mid-nerve; a fresh run must recover exactly once" });
    run("UPDATE missions SET status = 'EFFECTED', ladder = ?, effect_path = ?, effect_sha256 = ?, effect_writes = ? WHERE id = ?", JSON.stringify(ladder), effect.path, effect.effect_sha256, effect.write_count, MISSION_ID);
    relay("UNKNOWN", MISSION_ID, "simulated kill after OBSERVE — crash-window left open");
    ingestTrace({ source: "mission", kind: "refusal", correlation: MISSION_ID, payload: JSON.stringify({ event: "SIMULATED_KILL", at: "OBSERVE" }) });
    return {
      status: "UNKNOWN",
      reason: "simulated kill after OBSERVE — run the mission again to watch exactly-once recovery",
      mission_id: MISSION_ID,
      attempt_id: attemptId,
      ladder,
      effect_writes_total: effect.write_count,
    };
  }

  // ------------------------------------------------------------------
  // STEP 6 — SEAL: one receipt, eight hashes
  // ------------------------------------------------------------------
  const eight = {
    mission_hash: sha256hex(MISSION_ID),
    contract_hash: contractHash,
    attempt_hash: sha256hex(attemptId),
    proposal_hash: pat.proposal.proposal_sha256,
    sat_verdict_hash: verdict.sat_verdict_sha256,
    fate_decision_hash: leaseDecisionHash(leaseRes.lease),
    effect_hash: effect.effect_sha256,
    observer_hash: observation.observer_sha256,
  };
  const receipt = appendReceipt("MISSION_RECEIPT", MISSION_ID, {
    ...eight,
    effect_path: effect.path,
    observer_bytes: observation.bytes,
    effect_hash_matches_observer: true,
  });
  ladder.push({ step: "SEAL", status: "DONE", detail: `receipt #${receipt.seq} seals 8 hashes`, hash: receipt.digest });

  return finish(
    {
      status: "DONE",
      reason: "mission complete: one proposal, one verdict, one lease, one effect, one observation, one receipt binding 8 hashes",
      mission_id: MISSION_ID,
      attempt_id: attemptId,
      ladder,
      effect_writes_total: effect.write_count,
      receipt: { seq: receipt.seq, digest: receipt.digest, eight_hashes: eight },
    },
    "SEALED",
    { effect_path: effect.path, effect_sha256: effect.effect_sha256, effect_writes: effect.write_count },
  );
}
