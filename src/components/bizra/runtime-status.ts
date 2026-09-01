/**
 * BIZRA — runtime truth classification (CONTROL-PLANE-SEAL-1B, TODO 3.7).
 *
 * The single source of truth for what the public face may say about the
 * runtime's state. The law encoded here:
 *
 *   1. PUBLIC_REFERENCE NEVER displays NODE0 LIVE — regardless of any status
 *      string. Reference mode is a read-only archive presentation.
 *   2. NODE0 LIVE is displayed ONLY when mode === LOCAL_FOUNDER AND the
 *      server-verified node0_active flag is true (bind + commission proven).
 *   3. A tampered status string can never upgrade reference mode to live.
 *
 * Every component that renders a runtime badge or status line renders it
 * THROUGH this module — the "NODE0 LIVE" literal exists nowhere else in the
 * component tree.
 */

export const LIVE_LABEL = "NODE0 LIVE";
export const REFERENCE_LABEL = "REFERENCE ARCHIVE ONLINE";
export const NODE0_ACTIVE_FALSE_LABEL = "NODE0 ACTIVE = FALSE";
export const HALTED_LABEL = "NODE0 HALTED";
export const SIGNAL_LOST_LABEL = "RUNTIME SIGNAL LOST — RETRYING, NOTHING INVENTED";
export const READING_LABEL = "READING THE RUNTIME — NOTHING INVENTED";

export type RuntimeKind = "LIVE" | "REFERENCE" | "HALTED" | "LOST" | "READING";

export interface RuntimeLike {
  mode?: string;
  status?: string;
  node0_active?: boolean;
  actions_enabled?: boolean;
  halted_reason?: string | null;
}

/**
 * Classify a runtime snapshot.
 * @param runtime  the runtime block from /api/state (or null when unread)
 * @param reachable whether the runtime answered the last poll (default true —
 *                  an explicit false is required to classify as LOST)
 */
export function classifyRuntime(runtime: RuntimeLike | null | undefined, reachable = true): RuntimeKind {
  if (!runtime) return "READING";
  const halted = runtime.halted_reason != null || runtime.status === "HALTED";
  if (halted) return "HALTED";
  if (!reachable) return "LOST";
  // THE law: only LOCAL_FOUNDER + server-verified node0_active may say LIVE.
  // Mode is authoritative — a tampered status string cannot upgrade reference mode.
  if (runtime.mode === "LOCAL_FOUNDER" && runtime.status === "LIVE" && runtime.node0_active === true) {
    return "LIVE";
  }
  return "REFERENCE";
}

/** The hero/status-line label for a classified runtime. */
export function runtimeLabel(kind: RuntimeKind): string {
  switch (kind) {
    case "LIVE":
      return LIVE_LABEL;
    case "REFERENCE":
      return REFERENCE_LABEL;
    case "HALTED":
      return HALTED_LABEL;
    case "LOST":
      return SIGNAL_LOST_LABEL;
    default:
      return READING_LABEL;
  }
}

/** Short pill label for the masthead. */
export function runtimeBadge(kind: RuntimeKind): string {
  switch (kind) {
    case "LIVE":
      return "LIVE";
    case "REFERENCE":
      return "REFERENCE";
    case "HALTED":
      return "HALTED";
    case "LOST":
      return "SIGNAL LOST";
    default:
      return "READING";
  }
}

/** Tone for the status dot — reference uses gold, never the live-green. */
export function runtimeDotTone(kind: RuntimeKind): "verdant" | "solar" | "ember" | "gold" {
  switch (kind) {
    case "LIVE":
      return "verdant";
    case "REFERENCE":
      return "gold";
    case "HALTED":
      return "ember";
    case "LOST":
      return "solar";
    default:
      return "solar";
  }
}
