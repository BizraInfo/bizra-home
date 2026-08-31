"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { api } from "@/components/node0/api";
import { useNode0State } from "@/components/node0/use-node0-state";
import { CommandBar } from "@/components/node0/command-bar";
import { Hero } from "@/components/node0/hero";
import { Vault } from "@/components/node0/vault";
import { LoopPipeline } from "@/components/node0/loop-pipeline";
import { DualAgent } from "@/components/node0/dual-agent";
import { Fate } from "@/components/node0/fate";
import { Transitions } from "@/components/node0/transitions";
import { Evidence } from "@/components/node0/evidence";
import { EvidenceForm, type TraceSubmitInput } from "@/components/node0/evidence-form";
import { MissionRunner } from "@/components/node0/mission";
import { DemaRelay } from "@/components/node0/dema";
import { ChainExplorer } from "@/components/node0/chain";
import { Moat } from "@/components/node0/moat";
import { Node0Footer } from "@/components/node0/footer";

function toneFor(status: string): "success" | "error" | "warning" {
  const s = status.toUpperCase();
  if (["DONE", "PASS", "SEALED", "ADMITTED", "LIVE"].includes(s)) return "success";
  if (["REFUSED", "FAIL", "HALTED", "INADMISSIBLE"].includes(s)) return "error";
  return "warning";
}

function LoadingDeck() {
  return (
    <div className="flex flex-col gap-14" role="status" aria-label="Loading runtime state">
      <div className="flex flex-col gap-5">
        <Skeleton className="h-3 w-64 bg-zinc-900" />
        <Skeleton className="h-10 w-full max-w-2xl bg-zinc-900" />
        <Skeleton className="h-4 w-full max-w-xl bg-zinc-900" />
        <div className="flex gap-3">
          <Skeleton className="h-11 w-40 bg-zinc-900" />
          <Skeleton className="h-11 w-36 bg-zinc-900" />
          <Skeleton className="h-11 w-36 bg-zinc-900" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 bg-zinc-900" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 bg-zinc-900" />
        ))}
      </div>
      <Skeleton className="h-48 w-full bg-zinc-900" />
    </div>
  );
}

function UnreachableDeck({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-start gap-5 rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-6 sm:p-10"
      role="alert"
    >
      <div className="flex items-center gap-3">
        <AlertTriangle className="size-5 text-amber-400" aria-hidden="true" />
        <h2 className="text-lg font-semibold tracking-tight text-amber-200">
          RUNTIME UNREACHABLE
        </h2>
      </div>
      <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
        The constitutional runtime on port 7421 did not answer. Nothing is invented here — no
        state is shown until the engine speaks. The console will keep retrying every 2.5 seconds.
      </p>
      <p className="font-mono text-[11px] text-zinc-600">last error: {message}</p>
      <Button
        onClick={onRetry}
        className="h-11 border border-amber-400/40 bg-amber-500 font-semibold text-amber-950 hover:bg-amber-400"
      >
        <RotateCw aria-hidden="true" />
        RETRY NOW
      </Button>
    </motion.section>
  );
}

export default function Home() {
  const { data, error, loading, updatedAt, refresh } = useNode0State();
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});
  const [revertingId, setRevertingId] = React.useState<number | null>(null);
  const [traceBusy, setTraceBusy] = React.useState(false);

  const setFlag = (key: string, value: boolean) =>
    setBusy((prev) => ({ ...prev, [key]: value }));

  /* ---------------- actions — every one honest, every one refreshed -------- */

  const runMission = async (crashAfter?: "OBSERVE") => {
    const key = crashAfter ? "crash" : "mission";
    setFlag(key, true);
    const t = toast.loading(
      crashAfter
        ? "Crash drill — mission running until the OBSERVE crash…"
        : "Mission MUMU-DAILY-STATE-RELIEF-0A running…",
    );
    try {
      const { data: body } = await api.runMission(crashAfter);
      await refresh();
      const r = body?.result;
      if (!r) {
        toast.error("MISSION · NO ANSWER", {
          id: t,
          description: "The runtime did not return a result — nothing is invented.",
        });
        return;
      }
      const label = crashAfter ? "CRASH DRILL" : "MISSION";
      toast[toneFor(r.status)](`${label} · ${r.status}`, {
        id: t,
        description:
          (r.recovered ? "Recovered: " : "") +
          (r.reason ?? "no reason recorded") +
          (r.effect_writes_total != null ? ` · effect writes total: ${r.effect_writes_total}` : ""),
      });
    } finally {
      setFlag(key, false);
    }
  };

  const runCycle = async () => {
    setFlag("cycle", true);
    const t = toast.loading("Cycle running — the loop is observing itself (30–60s)…");
    try {
      const { data: body } = await api.runCycle();
      await refresh();
      const r = body?.report;
      if (!r) {
        toast.error("CYCLE · NO ANSWER", {
          id: t,
          description: "The runtime did not return a report — nothing is invented.",
        });
        return;
      }
      toast[toneFor(r.status)](`${r.cycle_id} · ${r.status}`, {
        id: t,
        description: r.reason,
      });
    } finally {
      setFlag("cycle", false);
    }
  };

  const submitTrace = async (input: TraceSubmitInput) => {
    setTraceBusy(true);
    try {
      const { data: body } = await api.submitTrace(input);
      await refresh();
      const r = body?.result;
      if (!r) {
        toast.error("TRACE · NO ANSWER", {
          description: "The runtime did not answer the gate — nothing is invented.",
        });
        return;
      }
      if (r.admissible) {
        toast.success(`TRACE #${r.id} · ADMITTED`, { description: r.reason });
      } else {
        toast.error(`TRACE #${r.id} · REFUSED`, {
          description: `${r.reason} — recorded, never dropped`,
        });
      }
    } finally {
      setTraceBusy(false);
    }
  };

  const revert = async (id: number) => {
    setRevertingId(id);
    const t = toast.loading(`Reverting transition ${id} — sealing human authority…`);
    try {
      const { httpOk, data: body } = await api.revertTransition(id);
      await refresh();
      if (httpOk && body?.ok) {
        toast.success(`REVERTED · RESTORED TO ${body.restored ?? "?"}`, {
          id: t,
          description: `receipt #${body.receipt?.seq ?? "—"} sealed — ${body.receipt?.digest?.slice(0, 16)}…`,
        });
      } else {
        toast.error("REVERT · REFUSED", {
          id: t,
          description: body?.reason ?? "The runtime refused the revert — see Dema for the record.",
        });
      }
    } finally {
      setRevertingId(null);
    }
  };

  /* ---------------- composition ------------------------------------------- */

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col bg-background">
        <CommandBar state={data} error={error} onRetry={() => void refresh()} />

        {/* honest runtime banners */}
        {data && error ? (
          <div
            role="alert"
            className="border-b border-amber-500/25 bg-amber-500/[0.06] px-4 py-2.5 text-center font-mono text-[11px] text-amber-300 sm:px-6"
          >
            RUNTIME UNREACHABLE — showing the last verified state; retrying every 2.5s
          </div>
        ) : null}
        {data?.runtime.status === "HALTED" ? (
          <div
            role="alert"
            className="border-b border-red-500/30 bg-red-500/[0.08] px-4 py-2.5 text-center font-mono text-[11px] text-red-300 sm:px-6"
          >
            ENGINE HALTED — {data.runtime.halted_reason ?? "constitution drift"} · nothing
            proceeds over a broken constitution
          </div>
        ) : null}

        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-16 px-4 py-8 sm:gap-20 sm:px-6 sm:py-12">
          {loading && !data ? (
            <LoadingDeck />
          ) : !data ? (
            <UnreachableDeck message={error ?? "no answer"} onRetry={() => void refresh()} />
          ) : (
            <>
              <Hero
                state={data}
                busy={busy}
                onRunMission={() => void runMission()}
                onRunCycle={() => void runCycle()}
                onCrashDrill={() => void runMission("OBSERVE")}
              />
              <Vault state={data} />
              <LoopPipeline state={data} />
              <DualAgent state={data} />
              <Fate state={data} />
              <Transitions state={data} onRevert={(id) => void revert(id)} revertingId={revertingId} />
              <Evidence state={data} />
              <EvidenceForm onSubmit={(input) => void submitTrace(input)} busy={traceBusy} />
              <MissionRunner state={data} />
              <DemaRelay state={data} />
              <ChainExplorer state={data} />
              <Moat state={data} />
            </>
          )}
        </main>

        <Node0Footer state={data} updatedAt={updatedAt} />
      </div>
    </TooltipProvider>
  );
}
