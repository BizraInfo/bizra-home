"use client";

import * as React from "react";
import { Radio } from "lucide-react";
import type { Node0State } from "./types";
import { FeedEmpty, fmtDubai, HashChip, Section, StatusChip } from "./shared";

export function DemaRelay({ state }: { state: Node0State }) {
  const dema = state.dema;
  const counts = dema.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Section
      id="dema"
      kicker="IX · Relay"
      title="Dema relay"
      description="Every consequential event reports its truth — DONE, REFUSED, or UNKNOWN — bound to the receipt that sealed it. Nothing is silently dropped."
    >
      <div className="mb-4 flex flex-wrap items-center gap-3 font-mono text-[11px] text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <Radio className="size-3.5 text-emerald-400" aria-hidden="true" />
          {dema.length} events · newest first
        </span>
        <span className="text-emerald-400">{counts.DONE ?? 0} done</span>
        <span className="text-red-400">{counts.REFUSED ?? 0} refused</span>
        <span className="text-amber-400">{counts.UNKNOWN ?? 0} unknown</span>
        <span className="text-zinc-600">updates every 2.5s</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <ul className="node0-scroll max-h-96 divide-y divide-zinc-800/70 overflow-y-auto">
          {dema.length === 0 ? (
            <FeedEmpty>relay silent</FeedEmpty>
          ) : (
            dema.map((e) => (
              <li
                key={e.id}
                className="grid gap-x-6 gap-y-1.5 p-3.5 transition-colors hover:bg-zinc-900/30 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="flex items-center gap-2.5">
                  <StatusChip status={e.status} />
                  <span className="font-mono text-[11px] text-amber-300/80">{e.subject}</span>
                </div>
                <p className="min-w-0 break-words text-xs leading-relaxed text-zinc-400">{e.reason}</p>
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <HashChip value={e.receipt_digest} size="sm" head={8} tail={6} />
                  <span className="font-mono text-[10px] text-zinc-600">{fmtDubai(e.ts)}</span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </Section>
  );
}
