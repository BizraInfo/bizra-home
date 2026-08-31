"use client";

import * as React from "react";
import { ArrowRight, History, Loader2, Undo2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Node0State } from "./types";
import { fmtDubai, HashChip, Section, StatTile, StatusChip } from "./shared";

function clampPercent(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  const pct = ((value - min) / (max - min)) * 100;
  return Math.min(100, Math.max(0, pct));
}

function ContractCard({
  contract,
}: {
  contract: Node0State["contracts"][number];
}) {
  const pct = clampPercent(contract.value, contract.min, contract.max);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs font-medium text-zinc-200">{contract.label}</div>
        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-600">
          {contract.key}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-2xl leading-none text-amber-300">{contract.value}</span>
        <span className="font-mono text-[11px] text-zinc-500">{contract.unit}</span>
      </div>
      {/* clamp bar */}
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-zinc-800"
        role="img"
        aria-label={`${contract.key}: ${contract.value} of clamp ${contract.min}–${contract.max} ${contract.unit}`}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-zinc-600">
        <span>min {contract.min}</span>
        <span>max {contract.max}</span>
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-500">{contract.description}</p>
      <div className="font-mono text-[10px] text-zinc-600">
        set by <span className="text-zinc-400">{contract.updated_by}</span> · {fmtDubai(contract.updated_at)}
      </div>
    </div>
  );
}

export function Transitions({
  state,
  onRevert,
  revertingId,
}: {
  state: Node0State;
  onRevert: (id: number) => void;
  revertingId: number | null;
}) {
  const { contracts, transitions, hypotheses } = state;
  const modeOf = React.useCallback(
    (hypothesisId: number | null): string | null => {
      if (hypothesisId == null) return null;
      const h = hypotheses.find((x) => x.id === hypothesisId);
      return h ? h.mode : null;
    },
    [hypotheses],
  );

  return (
    <Section
      id="transitions"
      kicker="V · Autopoiesis"
      title="Autopoietic transitions"
      description="The system building the system: proposals that survive the diagnostic contract move a contract value — inside its clamp, with a before-snapshot, sealed as an 8-hash receipt, and reversible by human authority."
    >
      {/* Current contract values */}
      <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Live contract values · clamped
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {contracts.map((c) => (
          <ContractCard key={c.key} contract={c} />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="hypothesis window" value={state.signals.hypothesis_window} sub="traces in context" />
        <StatTile
          label="window utilization"
          value={`${Math.round(state.signals.window_utilization * 100)}%`}
          tone={state.signals.window_utilization > 0.9 ? "amber" : "zinc"}
          sub="saturation grows the window"
        />
        <StatTile label="transitions live" value={state.signals.transitions_live} tone="emerald" />
        <StatTile label="refusal events" value={state.signals.refusal_events} tone="red" sub="sealed, never dropped" />
      </div>

      {/* Transition ledger */}
      <h3 className="mb-4 mt-8 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
        Transition ledger · newest first
      </h3>
      <ul className="flex flex-col gap-2">
        {transitions.length === 0 ? (
          <li className="flex h-24 items-center justify-center rounded-md border border-dashed border-zinc-800 font-mono text-xs text-zinc-600">
            no transitions yet — run a cycle
          </li>
        ) : (
          transitions.map((t) => {
            const mode = modeOf(t.hypothesis_id);
            const reverted = t.reverted === 1;
            return (
              <li
                key={t.id}
                className={cn(
                  "grid gap-x-6 gap-y-3 rounded-lg border p-4 sm:grid-cols-[minmax(0,2.4fr)_minmax(0,1.6fr)_minmax(0,2fr)_auto] sm:items-center",
                  reverted
                    ? "border-red-500/20 bg-red-500/[0.03]"
                    : "border-zinc-800 bg-zinc-900/30",
                )}
              >
                {/* what changed */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm text-zinc-100">{t.contract_key}</span>
                    {mode ? (
                      <span
                        className={cn(
                          "rounded-sm border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em]",
                          mode === "LIVE_MODEL"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                            : "border-zinc-700 bg-zinc-800/40 text-zinc-400",
                        )}
                        title={`hypothesis mode: ${mode}`}
                      >
                        {mode}
                      </span>
                    ) : null}
                    {reverted ? (
                      <span className="inline-flex items-center gap-1 rounded-sm border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-red-400">
                        <Undo2 className="size-3" aria-hidden="true" />
                        reverted · restored to {t.before_value}
                      </span>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      "mt-2 flex items-center gap-2 font-mono text-sm",
                      reverted && "line-through decoration-red-500/60",
                    )}
                  >
                    <span className="text-zinc-500">{t.before_value}</span>
                    <ArrowRight className={cn("size-3.5", reverted ? "text-red-500/50" : "text-amber-500")} aria-hidden="true" />
                    <span className={reverted ? "text-zinc-500" : "text-amber-300"}>{t.after_value}</span>
                  </div>
                  <div className="mt-1.5 font-mono text-[10px] text-zinc-600">
                    {t.cycle_id} · {fmtDubai(t.ts)}
                  </div>
                </div>

                {/* receipt */}
                <div className="min-w-0">
                  {t.receipt_seq != null ? (
                    <div className="font-mono text-[11px] text-zinc-400">
                      receipt <span className="text-amber-400">#{t.receipt_seq}</span>
                    </div>
                  ) : (
                    <div className="font-mono text-[11px] text-zinc-600">receipt pending</div>
                  )}
                  <HashChip value={t.receipt_digest} size="sm" head={10} tail={6} className="mt-1.5" />
                </div>

                {/* provenance of the change */}
                <div className="min-w-0 font-mono text-[10px] leading-relaxed text-zinc-600">
                  hypothesis {t.hypothesis_id != null ? `#${t.hypothesis_id}` : "—"}
                  {reverted && t.reverted_at ? (
                    <div className="mt-1 text-red-400/80">reverted {fmtDubai(t.reverted_at)}</div>
                  ) : null}
                </div>

                {/* revert — human authority */}
                <div className="flex sm:justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={reverted || revertingId === t.id}
                        className={cn(
                          "h-11 border-red-500/40 bg-transparent text-red-400 hover:bg-red-500/10 hover:text-red-300",
                          reverted && "opacity-40",
                        )}
                      >
                        {revertingId === t.id ? (
                          <Loader2 className="animate-spin" aria-hidden="true" />
                        ) : (
                          <History aria-hidden="true" />
                        )}
                        REVERT
                        <span className="sr-only">Revert transition {t.id}</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="border-zinc-800 bg-zinc-950">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-zinc-100">
                          Revert transition {t.id}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                          Revert is human authority — it will be sealed as a receipt.{" "}
                          {t.contract_key} will be restored from {t.after_value} to {t.before_value},
                          and the act itself becomes an immutable chain entry.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onRevert(t.id)}
                          className="border border-red-500/40 bg-red-500/90 text-white hover:bg-red-500"
                        >
                          <Undo2 aria-hidden="true" />
                          SEAL THE REVERT
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </Section>
  );
}
