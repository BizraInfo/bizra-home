"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Orbit, Rocket, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Node0State } from "./types";
import { fmtDubaiDate, fmtUptime, HashChip, StatTile, statusTone } from "./shared";

export type BusyKey = "mission" | "cycle" | "crash" | "trace" | "revert";

const PHASES = ["CONSTRUCTION", "SEALED", "LIVE"] as const;

function PhaseJourney({ phase, sealedAt, reference }: { phase: string; sealedAt: string | null; reference: boolean }) {
  // In reference mode the phase journey describes the ARCHIVED system's sealed
  // history — labeled as such, never presented as a currently-active Node0.
  const effective = reference ? "LIVE" : phase;
  const current = Math.max(0, PHASES.indexOf(effective.toUpperCase() as (typeof PHASES)[number]));
  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label={reference ? "Archived Node0 phase journey (reference presentation — Node0 not active)" : "Node0 phase journey"}>
      {reference ? (
        <li className="flex items-center gap-2 rounded-sm border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300">
          <span className="size-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          ARCHIVED JOURNEY · REFERENCE
        </li>
      ) : null}
      {PHASES.map((p, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={p}>
            {i > 0 ? (
              <ArrowRight className="size-3.5 text-zinc-700" aria-hidden="true" />
            ) : null}
            <li
              className={cn(
                "flex items-center gap-2 rounded-sm border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em]",
                active
                  ? p === "LIVE"
                    ? "node0-glow border-amber-500/60 bg-amber-500/10 text-amber-300"
                    : "border-amber-500/50 bg-amber-500/10 text-amber-300"
                  : done
                    ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-400/90"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-600",
              )}
            >
              {done ? (
                <Check className="size-3" aria-hidden="true" />
              ) : (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    active ? "bg-amber-400" : "bg-zinc-600",
                  )}
                  aria-hidden="true"
                />
              )}
              {p}
              {active && p === "SEALED" && sealedAt ? (
                <span className="hidden font-mono text-[9px] normal-case tracking-normal text-zinc-500 sm:inline">
                  {fmtDubaiDate(sealedAt)}
                </span>
              ) : null}
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}

export function Hero({
  state,
  busy,
  onRunMission,
  onRunCycle,
  onCrashDrill,
}: {
  state: Node0State;
  busy: Record<string, boolean>;
  onRunMission: () => void;
  onRunCycle: () => void;
  onCrashDrill: () => void;
}) {
  const { runtime, constitution, chain, signals, pat, dema } = state;
  const demaLast = dema[0];
  const missionBusy = busy.mission;
  const cycleBusy = busy.cycle;
  const crashBusy = busy.crash;

  return (
    <section id="deck" aria-labelledby="deck-title" className="scroll-mt-24">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-500/90">
          Constitutional runtime · port {runtime.port} · {runtime.tz}
        </div>
        <h1
          id="deck-title"
          className="mt-4 max-w-4xl text-2xl font-semibold leading-tight tracking-tight text-zinc-50 sm:text-4xl sm:leading-[1.15]"
        >
          The system that builds the system —{" "}
          <span className="text-amber-400">under constitution.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
          Constitution &gt; Intelligence. The root is sealed, the loop is live, and every
          consequential act is a receipt. {constitution.law}.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
          <PhaseJourney phase={runtime.phase} sealedAt={runtime.sealed_at} reference={runtime.mode === "PUBLIC_REFERENCE" || runtime.status === "REFERENCE_ONLINE"} />
          <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
            <span>
              uptime <span className="text-zinc-200">{fmtUptime(runtime.uptime_ms)}</span>
            </span>
            <span className="text-zinc-800">·</span>
            <span>
              boot <span className="text-zinc-200">#{runtime.boot_count}</span>
            </span>
            <span className="text-zinc-800">·</span>
            <span>
              dema last{" "}
              <span
                className={
                  demaLast
                    ? statusTone(demaLast.status) === "emerald"
                      ? "text-emerald-400"
                      : statusTone(demaLast.status) === "red"
                        ? "text-red-400"
                        : "text-amber-400"
                    : "text-zinc-600"
                }
              >
                {demaLast?.status ?? "—"}
              </span>
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <HashChip label="constitution root" value={constitution.root_hash} head={12} tail={10} />
          <HashChip label="chain head" value={chain.head} head={10} tail={8} />
        </div>

        {/* Command buttons */}
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            onClick={onRunMission}
            disabled={missionBusy || cycleBusy || crashBusy}
            className="h-11 border border-amber-400/40 bg-amber-500 font-semibold tracking-wide text-amber-950 hover:bg-amber-400"
          >
            {missionBusy ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <Rocket aria-hidden="true" />
            )}
            RUN MISSION
          </Button>
          <Button
            onClick={onRunCycle}
            disabled={missionBusy || cycleBusy || crashBusy}
            variant="outline"
            className="h-11 border-zinc-700 bg-transparent text-zinc-200 hover:border-amber-600/50 hover:bg-amber-500/10 hover:text-amber-200"
          >
            {cycleBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Orbit aria-hidden="true" />}
            RUN CYCLE
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onCrashDrill}
                disabled={missionBusy || cycleBusy || crashBusy}
                variant="ghost"
                className="h-11 border border-zinc-800 text-zinc-400 hover:border-amber-600/50 hover:bg-amber-500/10 hover:text-amber-300"
              >
                {crashBusy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ZapOff aria-hidden="true" />}
                CRASH DRILL
              </Button>
            </TooltipTrigger>
            <TooltipContent className="border border-amber-600/40 bg-zinc-950 text-amber-200">
              Drills the exactly-once recovery path — crashes after OBSERVE, restarts sealed
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Stat tiles */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="missions sealed" value={signals.missions_sealed} tone="emerald" />
          <StatTile
            label="transitions live"
            value={signals.transitions_live}
            sub={`of ${state.transitions.length} sealed`}
          />
          <StatTile label="traces admitted" value={signals.traces_admitted} tone="emerald" />
          <StatTile label="distinct sources" value={signals.distinct_sources} />
          <StatTile label="chain receipts" value={chain.len} />
          <StatTile
            label="model calls"
            value={pat.model_calls}
            sub={`${pat.model_failures} failure${pat.model_failures === 1 ? "" : "s"}`}
            tone={pat.model_failures > 0 ? "red" : "amber"}
          />
        </div>
      </motion.div>
    </section>
  );
}
