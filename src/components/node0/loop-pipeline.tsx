"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node0State } from "./types";
import { Section } from "./shared";

interface Stage {
  id: string;
  name: string;
  organ?: string;
  count: string;
  counterLabel: string;
  prevents: string;
}

function StageCard({ stage, index }: { stage: Stage; index: number }) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col gap-2 rounded-lg border bg-zinc-900/30 p-4",
        stage.organ === "PAT"
          ? "border-amber-600/40"
          : stage.organ === "SAT"
            ? "border-emerald-600/40"
            : stage.organ === "FATE"
              ? "border-red-500/30"
              : "border-zinc-800",
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
          {String(index + 1).padStart(2, "0")}
        </span>
        {stage.organ ? (
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">{stage.organ}</span>
        ) : null}
      </div>
      <div className="text-[13px] font-semibold leading-tight text-zinc-100">{stage.name}</div>
      <div>
        <span className="font-mono text-lg leading-none text-amber-300">{stage.count}</span>{" "}
        <span className="font-mono text-[10px] text-zinc-500">{stage.counterLabel}</span>
      </div>
      <p className="mt-auto text-[11px] leading-relaxed text-zinc-500">{stage.prevents}</p>
    </div>
  );
}

export function LoopPipeline({ state }: { state: Node0State }) {
  const { traces, hypotheses, sat, fate, chain, signals, transitions } = state;

  const stages: Stage[] = [
    {
      id: "traces",
      name: "Traces",
      count: String(traces.stats.total),
      counterLabel: "records",
      prevents:
        "Every observation enters as a hash-sealed first-class record. Prevents hidden messages — nothing is invisible.",
    },
    {
      id: "gate",
      name: "Admissibility Gate",
      count: `${traces.stats.admissible}/${traces.stats.total}`,
      counterLabel: "admitted",
      prevents:
        "Scope, completeness, correlation limits. An external trace cannot claim to be runtime. Prevents forged provenance and bulletin-board noise.",
    },
    {
      id: "pat",
      name: "Hypothesis · PAT",
      organ: "PAT",
      count: String(hypotheses.length),
      counterLabel: "hypotheses",
      prevents:
        "One bounded live-model call proposes — never executes, never verifies, never seals. Prevents reward hacking of the proposer.",
    },
    {
      id: "sat",
      name: "Diagnostic · SAT",
      organ: "SAT",
      count: String(sat.log.length),
      counterLabel: "recent verdicts",
      prevents:
        "Deterministic, model-blind, four-clause contract. Prevents black-box forensics — every verdict is inspectable.",
    },
    {
      id: "fate",
      name: "FATE Lease",
      organ: "FATE",
      count: String(fate.stats.total),
      counterLabel: "leases",
      prevents:
        "Single-use, TTL, network off, fs outbox-only. Prevents ambient authority and lateral movement.",
    },
    {
      id: "transition",
      name: "Transition",
      count: `${signals.transitions_live}/${transitions.length}`,
      counterLabel: "live / sealed",
      prevents:
        "Clamped, before-snapshot, reversible by human authority. Prevents hierarchy formation — the system cannot self-escalate.",
    },
    {
      id: "receipt",
      name: "Receipt",
      count: `#${chain.len}`,
      counterLabel: "chain length",
      prevents:
        "Append-only, prev-linked, 8-hash seals. Prevents tampering — the past cannot be rewritten.",
    },
  ];

  return (
    <Section
      id="loop"
      kicker="II · The Loop"
      title="The Constitutional Loop"
      description="One direction of flow, sealed at every joint. The loop answers the seven failure modes — ambient authority, reward hacking, hierarchy formation, bulletin board, lateral movement, hidden messages, black-box forensics — with structure, not promises."
    >
      {/* Desktop — horizontal rail */}
      <ol className="hidden items-stretch gap-1.5 lg:flex" aria-label="The constitutional loop stages">
        {stages.map((stage, i) => (
          <React.Fragment key={stage.id}>
            <li className="min-w-0 flex-1">
              <StageCard stage={stage} index={i} />
            </li>
            {i < stages.length - 1 ? (
              <li className="flex items-center" aria-hidden="true">
                <ChevronRight className="size-4 shrink-0 text-amber-600/70" />
              </li>
            ) : null}
          </React.Fragment>
        ))}
      </ol>

      {/* Mobile / tablet — vertical rail */}
      <ol className="flex flex-col gap-2 lg:hidden" aria-label="The constitutional loop stages">
        {stages.map((stage, i) => (
          <React.Fragment key={stage.id}>
            <li>
              <StageCard stage={stage} index={i} />
            </li>
            {i < stages.length - 1 ? (
              <li className="flex justify-center" aria-hidden="true">
                <ChevronDown className="size-4 text-amber-600/70" />
              </li>
            ) : null}
          </React.Fragment>
        ))}
      </ol>

      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="mt-6 font-mono text-[11px] leading-relaxed text-zinc-500"
      >
        TRACES → GATE → HYPOTHESIS → CONTRACT → LEASE → TRANSITION → RECEIPT · a conclusion
        becomes authoritative only after the whole loop passes
      </motion.p>
    </Section>
  );
}
