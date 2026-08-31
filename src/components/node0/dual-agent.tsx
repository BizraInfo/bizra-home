"use client";

import * as React from "react";
import { Brain, ScanSearch } from "lucide-react";
import type { Node0State, SatClauses } from "./types";
import { FeedEmpty, fmtDubai, PassFailChip, parseJson, Section, StatTile, StatusChip } from "./shared";

const CLAUSE_ORDER: (keyof SatClauses)[] = [
  "provenance",
  "consistency",
  "disambiguation",
  "corroboration",
];

function SatClauseList({ clausesRaw }: { clausesRaw: string }) {
  const clauses = parseJson<SatClauses>(clausesRaw, {});
  const entries = CLAUSE_ORDER.filter((k) => clauses[k]).map((k) => ({
    name: k,
    clause: clauses[k]!,
  }));
  if (entries.length === 0) {
    return <FeedEmpty>no clause detail recorded</FeedEmpty>;
  }
  return (
    <ul className="flex flex-col divide-y divide-zinc-800/70 rounded-md border border-zinc-800 bg-zinc-950/40">
      {entries.map(({ name, clause }) => (
        <li key={name} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:w-40">
            <PassFailChip pass={clause.pass} />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-400">{name}</span>
          </div>
          <p className="break-words text-xs leading-relaxed text-zinc-500">{clause.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export function DualAgent({ state }: { state: Node0State }) {
  const { pat, sat } = state;

  return (
    <Section
      id="agents"
      kicker="III · Dual Agent"
      title="PAT | SAT"
      description="One mind proposes, another verifies — and they can never be the same agent. PAT touches a live model; SAT is deterministic and model-blind, so there is nothing to reward-hack."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* PAT — the proposer */}
        <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-amber-600/30 bg-gradient-to-b from-amber-500/[0.06] to-transparent p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-sm border border-amber-600/40 bg-amber-500/10">
                  <Brain className="size-4 text-amber-400" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold tracking-tight text-amber-200">PAT</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">proposer</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                Proposes — never executes, never verifies, never seals.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap gap-2">
            <span className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-400">
              live model
            </span>
            <span className="rounded-sm border border-zinc-700 bg-zinc-800/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-400">
              {pat.mode}
            </span>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-3">
            <StatTile label="model calls" value={pat.model_calls} tone="amber" />
            <StatTile
              label="model failures"
              value={pat.model_failures}
              tone={pat.model_failures > 0 ? "red" : "emerald"}
              sub="failure ⇒ refusal, never fallback"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2 rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">last proposal</div>
            {pat.last ? (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={pat.last.status} />
                  <span className="font-mono text-zinc-500">{fmtDubai(pat.last.ts)}</span>
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 font-mono text-[11px] text-zinc-500">
                  <dt>subject</dt>
                  <dd className="text-zinc-300">{pat.last.subject}</dd>
                  <dt>purpose</dt>
                  <dd>{pat.last.purpose}</dd>
                  <dt>mode</dt>
                  <dd className="text-amber-400">{pat.last.mode}</dd>
                  <dt>calls</dt>
                  <dd>{pat.last.calls}</dd>
                </dl>
                <p className="break-words text-zinc-500">{pat.last.detail}</p>
              </div>
            ) : (
              <FeedEmpty>no proposal recorded yet</FeedEmpty>
            )}
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-zinc-600">
            PAT keeps its latest proposal on the record — one bounded SDK call, 45s timeout,
            8KB cap; failure means REFUSAL, never a fabricated value.
          </p>
        </div>

        {/* SAT — the verifier */}
        <div className="flex min-w-0 flex-col gap-4 rounded-lg border border-emerald-600/30 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-sm border border-emerald-600/40 bg-emerald-500/10">
                  <ScanSearch className="size-4 text-emerald-400" aria-hidden="true" />
                </span>
                <h3 className="text-lg font-semibold tracking-tight text-emerald-200">SAT</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">verifier</span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                Deterministic verifier — no model, nothing to reward-hack.
              </p>
            </div>
            {sat.deterministic ? (
              <span className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-400">
                deterministic · model-blind
              </span>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-3 rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">last verdict</div>
              {sat.last ? (
                <div className="flex items-center gap-2">
                  <StatusChip status={sat.last.verdict} />
                  <span className="font-mono text-[11px] text-zinc-500">{fmtDubai(sat.last.ts)}</span>
                </div>
              ) : null}
            </div>
            {sat.last ? (
              <div className="flex min-w-0 flex-col gap-3">
                <SatClauseList clausesRaw={sat.last.clauses} />
                <p className="break-words text-xs leading-relaxed text-zinc-400">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                    subject {sat.last.subject} ·{" "}
                  </span>
                  {sat.last.reason}
                </p>
              </div>
            ) : (
              <FeedEmpty>no verdict recorded yet</FeedEmpty>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              recent verdicts
            </div>
            <ul className="node0-scroll flex max-h-64 flex-col divide-y divide-zinc-800/70 overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950/40">
              {sat.log.length === 0 ? (
                <FeedEmpty>no verdicts yet</FeedEmpty>
              ) : (
                sat.log.map((entry, i) => (
                  <li key={`${entry.subject}-${entry.ts}-${i}`} className="flex items-center gap-3 p-2.5">
                    <StatusChip status={entry.verdict} className="shrink-0" />
                    <span className="shrink-0 font-mono text-[11px] text-zinc-400">{entry.subject}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-600">{entry.reason}</span>
                    <span className="shrink-0 font-mono text-[10px] text-zinc-600">{fmtDubai(entry.ts)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}
