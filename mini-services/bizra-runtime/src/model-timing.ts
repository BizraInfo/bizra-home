/**
 * BIZRA Node0 — MODEL-TIMING-OBSERVABILITY-1A (exact lineage c5978f52).
 *
 * Makes the 20-second generation corridor observable and the budget
 * reservation atomic — mock Ollama only, zero real calls, authority_delta=0.
 *
 * Lifecycle (mission frozen):
 *   REQUEST → BUDGET_ADMITTED → GENERATE_DISPATCHED
 *   → RESIDENCY_FIRST_OBSERVED → FIRST_TRANSPORT_BYTES
 *   → FIRST_VALID_STREAM_OBJECT → (FIRST_REASONING_CHUNK) → FIRST_ANSWER_CONTENT
 *   → GENERATION_COMPLETE
 *   failure: DEADLINE_EXCEEDED → ABORT_EMITTED → BACKEND_TERMINATION_OBSERVED / UNKNOWN
 *
 * Budget law: atomic reservation BEFORE dispatch. N concurrent at budget=1 → exactly ONE dispatch.
 * The reservation is a PK insert into model_budget (mission_id PRIMARY KEY). No network act
 * precedes the atomic check. Timeout / failure still consumes the reservation.
 *
 * Privacy law: timing log stores event names, timestamps, duration, hashes — never prompt/response content.
 * Authority law: PROPOSE_ONLY, delta 0 on every path.
 */
import { one, run, all, RUNTIME_MODE } from "./store";
import { nowIso } from "./hash";

export type TimingEvent =
  | "REQUEST"
  | "BUDGET_ADMITTED"
  | "BUDGET_REFUSED"
  | "GENERATE_DISPATCHED"
  | "RESIDENCY_FIRST_OBSERVED"
  | "FIRST_TRANSPORT_BYTES"
  | "FIRST_VALID_STREAM_OBJECT"
  | "FIRST_REASONING_CHUNK"
  | "FIRST_ANSWER_CONTENT"
  | "GENERATION_COMPLETE"
  | "GENERATION_FAILED"
  | "DEADLINE_EXCEEDED"
  | "ABORT_EMITTED"
  | "BACKEND_TERMINATION_OBSERVED"
  | "BACKEND_TERMINATION_UNKNOWN";

export interface TimingRecord {
  mission_id: string;
  event: TimingEvent;
  at_ms: number;
  since_request_ms: number;
  detail?: string;
}

// In-memory request start per mission for since_request_ms calculation.
// For concurrent same mission_id, the first request's start is the reference;
// later concurrent requests each compute since their own REQUEST time — but
// we store absolute at_ms, so monotonic is per DB order, not per-request delta.
// Simpler: compute since_request_ms as at_ms - firstSeenRequestMs for that mission.
const requestStarts = new Map<string, number>();

export function recordTiming(missionId: string, event: TimingEvent, detail?: string): void {
  if (RUNTIME_MODE !== "LOCAL_FOUNDER") return;
  const at = Date.now();
  let since = 0;
  if (event === "REQUEST") {
    // First REQUEST for this mission sets the baseline; concurrent REQUESTs reuse the same baseline
    // but we store the delta as 0 for each REQUEST to keep monotonic expectation simple.
    if (!requestStarts.has(missionId)) requestStarts.set(missionId, at);
    since = 0;
  } else {
    const start = requestStarts.get(missionId);
    since = start != null ? at - start : 0;
  }
  try {
    run(
      `INSERT INTO model_timing_log (ts, mission_id, event, at_ms, since_request_ms, detail) VALUES (?, ?, ?, ?, ?, ?)`,
      nowIso(), missionId, event, at, since, detail ?? null,
    );
  } catch {
    // table may not exist on old roots — ignore (harness creates fresh roots with DDL)
  }
}

export function getTiming(missionId: string): any[] {
  try {
    return all(`SELECT id, ts, mission_id, event, at_ms, since_request_ms, detail FROM model_timing_log WHERE mission_id = ? ORDER BY at_ms ASC, id ASC`, missionId);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Atomic budget reservation — the single variable that was missing.
//
// BEFORE dispatch, try to INSERT a reservation row. The mission_id PK makes
// the check atomic at SQLite level: concurrent writers serialize, exactly one
// INSERT succeeds. No SELECT-then-INSERT race.
// ---------------------------------------------------------------------------
export function tryReserveBudget(missionId: string): { ok: true } | { ok: false; code: "MODEL_BUDGET_EXCEEDED"; reason: string } {
  if (RUNTIME_MODE !== "LOCAL_FOUNDER") {
    return { ok: false, code: "MODEL_BUDGET_EXCEEDED", reason: "MODEL_MODE_REFUSED" };
  }
  try {
    // Use INSERT OR FAIL semantics via plain INSERT and catch constraint.
    run(`INSERT INTO model_budget (mission_id, reserved_at) VALUES (?, ?)`, missionId, nowIso());
    return { ok: true };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (msg.includes("UNIQUE") || msg.includes("constraint") || msg.includes("PRIMARY")) {
      return {
        ok: false, code: "MODEL_BUDGET_EXCEEDED",
        reason: `MODEL_BUDGET_EXCEEDED: MAX_MODEL_CALLS_PER_MISSION=1 for the first-breath mission class — this mission already spent its single call (atomic reservation in model_budget); no automatic retry exists`,
      };
    }
    // Any other SQLite error is treated as budget exceeded to stay fail-closed without dispatch.
    return {
      ok: false, code: "MODEL_BUDGET_EXCEEDED",
      reason: `MODEL_BUDGET_EXCEEDED: budget reservation failed — ${msg.slice(0, 120)}`,
    };
  }
}

export function budgetUsed(missionId: string): number {
  try {
    const row = one<{ n: number }>(`SELECT COUNT(*) as n FROM model_budget WHERE mission_id = ?`, missionId);
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

export function budgetLimit(): number {
  return 1;
}
