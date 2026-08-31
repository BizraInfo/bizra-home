"use client";

import * as React from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EightHashes, LadderStep, Node0State } from "./types";
import { FeedEmpty, fmtBytes, fmtDubai, FullHash, HashChip, Section, StatusChip } from "./shared";

const EIGHT_HASH_LABELS: { key: keyof EightHashes; label: string }[] = [
  { key: "mission_hash", label: "mission" },
  { key: "contract_hash", label: "contract" },
  { key: "attempt_hash", label: "attempt" },
  { key: "proposal_hash", label: "proposal" },
  { key: "sat_verdict_hash", label: "sat verdict" },
  { key: "fate_decision_hash", label: "fate decision" },
  { key: "effect_hash", label: "effect" },
  { key: "observer_hash", label: "observer" },
];

function LadderRow({ step }: { step: LadderStep }) {
  return (
    <li className="relative flex flex-col gap-1.5 border-l border-zinc-800 pb-5 pl-6 last:pb-0">
      <span
        className="absolute -left-[5px] top-1.5 size-2.5 rounded-full border border-zinc-700 bg-zinc-900"
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-zinc-200">{step.step}</span>
        <StatusChip status={step.status} />
      </div>
      <p className="break-words text-xs leading-relaxed text-zinc-500">{step.detail}</p>
      {step.hash ? <HashChip value={step.hash} size="sm" head={8} tail={6} /> : null}
    </li>
  );
}

export function MissionRunner({ state }: { state: Node0State }) {
  const mission = state.missions[0];
  const outbox = state.outbox[0];

  return (
    <Section
      id="mission"
      kicker="VIII · Mission"
      title="Mission runner"
      description="MUMU-DAILY-STATE-RELIEF-0A — the daily delta brief. One attempt, one effect write, one 8-hash seal. Run it again and it recovers without writing: exactly-once, proven under crash."
    >
      {!mission ? (
        <FeedEmpty>no mission recorded yet</FeedEmpty>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Mission card */}
          <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-sm border border-emerald-600/40 bg-emerald-500/10">
                <ShieldCheck className="size-4 text-emerald-400" aria-hidden="true" />
              </span>
              <h3 className="font-mono text-base text-zinc-100">{mission.id}</h3>
              <StatusChip status={mission.status} />
              {mission.recovered ? (
                <span className="rounded-sm border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-amber-400">
                  recovered
                </span>
              ) : null}
            </div>

            <dl className="grid gap-x-8 gap-y-2 font-mono text-[11px] text-zinc-500 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-0.5">
                <dt className="uppercase tracking-[0.16em] text-zinc-600">attempt</dt>
                <dd className="text-zinc-300">{mission.attempt_id}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="uppercase tracking-[0.16em] text-zinc-600">effect writes</dt>
                <dd className="text-amber-300">
                  {mission.effect_writes} — one write, forever
                </dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="uppercase tracking-[0.16em] text-zinc-600">started</dt>
                <dd className="text-zinc-300">{fmtDubai(mission.started_at)}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="uppercase tracking-[0.16em] text-zinc-600">finished</dt>
                <dd className="text-zinc-300">{fmtDubai(mission.finished_at)}</dd>
              </div>
            </dl>

            <HashChip label="effect sha256" value={mission.effect_sha256} head={12} tail={8} />

            {mission.reason ? (
              <p
                className={cn(
                  "break-words rounded-md border p-3 font-mono text-[11px] leading-relaxed",
                  mission.recovered
                    ? "border-amber-500/25 bg-amber-500/5 text-amber-300/90"
                    : "border-zinc-800 bg-zinc-950/40 text-zinc-400",
                )}
              >
                {mission.recovered ? "exactly-once · " : ""}
                {mission.reason}
              </p>
            ) : null}
          </div>

          {/* Ladder */}
          <div>
            <h4 className="mb-4 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
              Conductor ladder · recovery → pat → sat → fate → effect → observe → seal
            </h4>
            <ol className="flex flex-col">
              {mission.ladder.map((step) => (
                <LadderRow key={`${step.step}-${step.hash}`} step={step} />
              ))}
            </ol>
          </div>

          {/* 8-hash receipt — the crown jewel */}
          {mission.receipt ? (
            <div className="flex flex-col gap-4 rounded-lg border border-amber-600/25 bg-gradient-to-b from-amber-500/[0.05] to-transparent p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-500/90">
                    The 8-hash receipt
                  </div>
                  <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-zinc-400">
                    One receipt binds the whole mission: what was asked, under which contract,
                    which attempt, what was proposed, the verdict, the authorization, the effect,
                    and the independent observation of it.
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="font-mono text-sm text-amber-300">receipt #{mission.receipt.seq}</span>
                  <HashChip value={mission.receipt.digest} label="digest" head={10} tail={8} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {EIGHT_HASH_LABELS.map(({ key, label }) => (
                  <FullHash
                    key={key}
                    value={mission.receipt!.eight_hashes[key]}
                    label={label}
                  />
                ))}
              </div>
            </div>
          ) : (
            <FeedEmpty>receipt not sealed yet</FeedEmpty>
          )}

          {/* Outbox brief */}
          {outbox ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                  <FileText className="size-3.5 text-zinc-500" aria-hidden="true" />
                  Outbox brief · the mission&rsquo;s single permitted write
                </h4>
                <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-zinc-600">
                  <span className="text-zinc-400">{outbox.name}</span>
                  <span>{fmtBytes(outbox.bytes)}</span>
                  <span>fs scope: outbox only</span>
                </div>
              </div>
              <pre
                className="node0-scroll max-h-96 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-zinc-300"
                aria-label="Outbox brief preview"
              >
                <code>{outbox.preview}</code>
              </pre>
              <HashChip label="brief sha256" value={outbox.sha256} head={12} tail={8} />
            </div>
          ) : (
            <FeedEmpty>outbox empty — the mission has not written yet</FeedEmpty>
          )}
        </div>
      )}
    </Section>
  );
}
