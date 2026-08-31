"use client";

import * as React from "react";
import { Check, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node0State } from "./types";
import { FeedEmpty, fmtDubai, LawLine, parseJson, Section, sourceTone, StatusChip } from "./shared";

function SourceChip({ source }: { source: string }) {
  const tone = sourceTone(source);
  const cls: Record<string, string> = {
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    red: "border-red-500/30 bg-red-500/10 text-red-400",
    zinc: "border-zinc-700 bg-zinc-800/40 text-zinc-400",
  };
  return (
    <span
      className={cn("rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em]", cls[tone])}
      title={`trace source: ${source}`}
    >
      {source}
    </span>
  );
}

function CitedTraceChips({ citedRaw, traces }: { citedRaw: string; traces: Node0State["traces"]["last"] }) {
  const cited = parseJson<number[]>(citedRaw, []);
  if (cited.length === 0) {
    return <span className="font-mono text-[10px] text-zinc-600">cited: —</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">cited</span>
      {cited.map((id) => {
        const trace = traces.find((t) => t.id === id);
        const tone = trace ? sourceTone(trace.source) : "zinc";
        const cls: Record<string, string> = {
          amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
          emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
          red: "border-red-500/30 bg-red-500/10 text-red-400",
          zinc: "border-zinc-700 bg-zinc-800/40 text-zinc-400",
        };
        return (
          <span
            key={id}
            className={cn("rounded-sm border px-1.5 py-0.5 font-mono text-[10px]", cls[tone])}
            title={trace ? `trace #${id} · source ${trace.source} · ${trace.kind}` : `trace #${id} · outside recent window`}
          >
            #{id}
          </span>
        );
      })}
    </div>
  );
}

export function Evidence({ state }: { state: Node0State }) {
  const { traces, hypotheses } = state;

  return (
    <Section
      id="evidence"
      kicker="VI · Evidence"
      title="Evidence & the Diagnostic Contract"
      description="Inadmissible traces are recorded, never dropped. A trace-derived conclusion promotes to an authoritative insight only after the complete diagnostic contract has passed."
    >
      <LawLine className="mb-6">
        A trace-derived conclusion promotes to an authoritative insight only after the complete
        diagnostic contract — provenance, consistency, disambiguation, corroboration — has passed.
      </LawLine>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT — the gate + trace feed */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">total traces</div>
              <div className="mt-1 font-mono text-xl text-zinc-200">{traces.stats.total}</div>
            </div>
            <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-500/80">admissible</div>
              <div className="mt-1 font-mono text-xl text-emerald-300">{traces.stats.admissible}</div>
            </div>
            <div className="rounded-lg border border-red-500/25 bg-red-500/5 px-4 py-3">
              <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-red-500/80">inadmissible</div>
              <div className="mt-1 font-mono text-xl text-red-300">{traces.stats.inadmissible}</div>
            </div>
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-zinc-500">
            gate: {traces.gate}
          </p>

          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/50 px-4 py-2.5">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400">
                Trace feed · newest first
              </h3>
              <span className="font-mono text-[10px] text-zinc-600">{traces.last.length} recent</span>
            </div>
            <ul className="node0-scroll max-h-80 divide-y divide-zinc-800/70 overflow-y-auto">
              {traces.last.length === 0 ? (
                <FeedEmpty>no traces yet</FeedEmpty>
              ) : (
                traces.last.map((t) => (
                  <li
                    key={t.id}
                    className={cn(
                      "flex flex-col gap-1.5 p-3",
                      t.admissible === 1 ? "bg-transparent" : "bg-red-500/[0.06]",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-amber-300/90">#{t.id}</span>
                      <SourceChip source={t.source} />
                      <span className="font-mono text-[10px] text-zinc-500">{t.kind}</span>
                      {t.admissible === 1 ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-400">
                          <Check className="size-3" aria-hidden="true" />
                          admissible
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-red-400">
                          <X className="size-3" aria-hidden="true" />
                          inadmissible
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[10px] text-zinc-600">{fmtDubai(t.ts)}</span>
                    </div>
                    {t.admissible === 0 ? (
                      <p className="font-mono text-[10px] leading-relaxed text-red-400/90">
                        gate: {t.gate_reason}
                      </p>
                    ) : (
                      <p className="truncate font-mono text-[10px] text-zinc-600" title={t.payload}>
                        {t.payload || "—"}
                      </p>
                    )}
                    <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-700">
                      <span className="truncate">corr {t.correlation}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* RIGHT — the promotion ladder */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/50 px-4 py-2.5">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400">
                Promotion ladder · hypotheses
              </h3>
              <span className="font-mono text-[10px] text-zinc-600">{hypotheses.length} records</span>
            </div>
            <ul className="node0-scroll max-h-96 divide-y divide-zinc-800/70 overflow-y-auto">
              {hypotheses.length === 0 ? (
                <FeedEmpty>no hypotheses yet</FeedEmpty>
              ) : (
                hypotheses.map((h) => (
                  <li key={h.id} className="flex flex-col gap-2 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip
                        status={h.status}
                        title={
                          h.status === "SAT_PASS_PROMOTED"
                            ? "promoted to authoritative insight"
                            : h.status === "REFUSED"
                              ? "refused by the diagnostic contract"
                              : "no proposal made"
                        }
                      />
                      <span
                        className={cn(
                          "rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
                          h.mode === "LIVE_MODEL"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                            : "border-zinc-700 bg-zinc-800/40 text-zinc-400",
                        )}
                      >
                        {h.mode}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-600">{h.cycle_id}</span>
                      <span className="ml-auto font-mono text-[10px] text-zinc-600">{fmtDubai(h.ts)}</span>
                    </div>
                    <p className="break-words text-xs leading-relaxed text-zinc-300">{h.hypothesis}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px]">
                      <span className="text-zinc-500">
                        {h.target_contract}{" "}
                        <span className="text-zinc-600">{h.before_value}</span>
                        <span className="text-amber-500"> → </span>
                        <span className="text-amber-300">{h.after_value}</span>
                      </span>
                      <span className="text-zinc-600">model calls {h.model_calls}</span>
                    </div>
                    <CitedTraceChips citedRaw={h.cited_traces} traces={traces.last} />
                    <p className="break-words font-mono text-[10px] leading-relaxed text-zinc-600">{h.detail}</p>
                    <p className="break-words text-[10px] leading-relaxed text-zinc-600">
                      <span className="font-mono uppercase tracking-[0.14em] text-zinc-700">dod · </span>
                      {h.dod}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </div>
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-600">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-500/70" aria-hidden="true" />
            Evidence becomes insight only through the ladder: each hypothesis must cite real,
            admissible, seal-matching traces from at least two distinct sources.
          </p>
        </div>
      </div>
    </Section>
  );
}
