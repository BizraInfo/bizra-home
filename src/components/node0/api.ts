/**
 * BIZRA Node0 — browser → runtime transport.
 * ALL calls are RELATIVE and carry ?XTransformPort=7421; the Caddy gateway
 * (:81) forwards them by port to the mini-service on 7421.
 * Never an absolute host: the console must work behind any gateway host.
 */

const X_TRANSFORM_PORT = "XTransformPort=7421";

export function stateUrl(): string {
  return `/api/state?${X_TRANSFORM_PORT}`;
}

async function post<T>(path: string, body: Record<string, unknown>): Promise<{ httpOk: boolean; data: T | null }> {
  try {
    const res = await fetch(`${path}?${X_TRANSFORM_PORT}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    try {
      return { httpOk: res.ok, data: (await res.json()) as T };
    } catch {
      return { httpOk: false, data: null };
    }
  } catch {
    // network-level failure — honest unreachable, never invented values
    return { httpOk: false, data: null };
  }
}

async function get<T>(path: string): Promise<{ httpOk: boolean; data: T | null }> {
  try {
    const res = await fetch(`${path}?${X_TRANSFORM_PORT}`, { cache: "no-store" });
    try {
      return { httpOk: res.ok, data: (await res.json()) as T };
    } catch {
      return { httpOk: false, data: null };
    }
  } catch {
    // network-level failure — honest unreachable, never invented values
    return { httpOk: false, data: null };
  }
}

export interface MissionEnvelope {
  ok: boolean;
  result?: {
    status: string;
    reason: string | null;
    effect_writes_total?: number;
    effect_writes?: number;
    recovered?: boolean;
  };
}

export interface CycleEnvelope {
  ok: boolean;
  report?: {
    cycle_id: string;
    status: string;
    reason: string;
  };
}

export interface TraceEnvelope {
  ok: boolean;
  result?: {
    id: number;
    admissible: boolean;
    reason: string;
  };
}

export interface RevertEnvelope {
  ok: boolean;
  restored?: number;
  reason?: string;
  receipt?: { seq: number; digest: string };
}

export interface ShoulderCorpusEnvelope {
  ok: boolean;
  corpus: string;
  corpus_sha256: string;
}

export const api = {
  /** Run (or drill) mission MUMU-DAILY-STATE-RELIEF-0A. */
  runMission(crashAfter?: "OBSERVE"): Promise<{ httpOk: boolean; data: MissionEnvelope | null }> {
    return post<MissionEnvelope>("/api/mission", crashAfter ? { crashAfter } : {});
  },

  /** Run one autopoietic cycle (30–60s of real constitutional work). */
  runCycle(): Promise<{ httpOk: boolean; data: CycleEnvelope | null }> {
    return post<CycleEnvelope>("/api/cycle", {});
  },

  /** Ingest operator evidence through the admissibility gate. */
  submitTrace(input: {
    source: string;
    kind: string;
    payload: string;
    correlation?: string;
  }): Promise<{ httpOk: boolean; data: TraceEnvelope | null }> {
    return post<TraceEnvelope>("/api/trace", {
      source: input.source,
      kind: input.kind,
      payload: input.payload,
      correlation: input.correlation || undefined,
    });
  },

  /** Revert an autopoietic transition — human authority, sealed. */
  revertTransition(id: number): Promise<{ httpOk: boolean; data: RevertEnvelope | null }> {
    return post<RevertEnvelope>(`/api/transition/${id}/revert`, {});
  },

  /** Fetch the full sealed corpus (THE_SHOULDER.md) — on demand, for the reader. */
  fetchShoulder(): Promise<{ httpOk: boolean; data: ShoulderCorpusEnvelope | null }> {
    return get<ShoulderCorpusEnvelope>("/api/shoulder");
  },
};
