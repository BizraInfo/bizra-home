"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Node0State } from "./types";
import { stateUrl } from "./api";
import { PUBLIC_REFERENCE_MODE } from "../bizra/runtime-status";

const POLL_MS = 2500;

export interface Node0Snapshot {
  /** Last successfully fetched live state (null until first success). */
  data: Node0State | null;
  /** Set when the last poll failed (runtime unreachable / not-ok). Data above is then stale. */
  error: string | null;
  /** True only during the very first load (drives skeletons). */
  loading: boolean;
  /** Epoch ms of the last successful poll. */
  updatedAt: number | null;
  /** Immediate re-fetch — also aborts any in-flight poll. */
  refresh: () => Promise<void>;
}

/**
 * Polls the FIXED same-origin transport /api/node0/state every 2.5s.
 * Honest failure model: on error we keep the last real data (marked stale)
 * and never substitute invented values.
 */
export function useNode0State(): Node0Snapshot {
  const [data, setData] = useState<Node0State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (PUBLIC_REFERENCE_MODE) return;
    inFlight.current?.abort();
    const ac = new AbortController();
    inFlight.current = ac;
    try {
      const res = await fetch(stateUrl(), { signal: ac.signal, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as Node0State;
      if (!json || json.ok !== true) throw new Error("runtime reported not-ok");
      setData(json);
      setError(null);
      setUpdatedAt(Date.now());
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "runtime unreachable");
    } finally {
      if (inFlight.current === ac) inFlight.current = null;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (PUBLIC_REFERENCE_MODE) {
      setLoading(false);
      return;
    }
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearInterval(id);
      inFlight.current?.abort();
    };
  }, [refresh]);

  return { data, error, loading, updatedAt, refresh };
}
