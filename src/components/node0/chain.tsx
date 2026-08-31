"use client";

import * as React from "react";
import { Link2, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node0State } from "./types";
import { FeedEmpty, fmtDubai, HashChip, kindTone, Section } from "./shared";

export function ChainExplorer({ state }: { state: Node0State }) {
  const { chain } = state;
  const receipts = chain.last;

  return (
    <Section
      id="chain"
      kicker="X · The Past"
      title="Receipt chain explorer"
      description="An append-only chain of sealed receipts. Each digest is SHA-256(prev | kind | subject | payload) — break one byte anywhere and the walk from genesis reports the exact broken link."
    >
      {/* Verification badge */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {chain.ok ? (
          <span className="inline-flex items-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-emerald-400">
            <ShieldCheck className="size-4" aria-hidden="true" />
            tamper-evident · verified
            <span className="sr-only">Chain walk from genesis passed</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-sm border border-red-500/40 bg-red-500/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-red-400">
            <ShieldAlert className="size-4" aria-hidden="true" />
            broken at #{chain.brokenAt}
          </span>
        )}
        <span className="font-mono text-[11px] text-zinc-500">
          {chain.len} receipts · head{" "}
          <span className="text-zinc-300">{chain.head.slice(0, 10)}…{chain.head.slice(-6)}</span>
        </span>
      </div>

      {/* Receipt rail — prev-linked */}
      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <ul className="node0-scroll max-h-[32rem] divide-y divide-zinc-800/70 overflow-y-auto">
          {receipts.length === 0 ? (
            <FeedEmpty>chain empty</FeedEmpty>
          ) : (
            receipts.map((r) => {
              const tone = kindTone(r.kind);
              const cls: Record<string, string> = {
                amber: "border-amber-500/30 bg-amber-500/10 text-amber-400",
                emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                red: "border-red-500/30 bg-red-500/10 text-red-400",
                zinc: "border-zinc-700 bg-zinc-800/40 text-zinc-400",
              };
              return (
                <li key={r.seq} className="relative flex gap-4 p-4 pl-8">
                  {/* prev-linked connector */}
                  <span
                    className="absolute left-3 top-0 bottom-0 w-px bg-zinc-800"
                    aria-hidden="true"
                  />
                  <span
                    className="absolute left-[9.5px] top-6 size-2 rounded-full border border-zinc-600 bg-zinc-950"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono text-sm text-amber-300">#{r.seq}</span>
                      <span
                        className={cn(
                          "rounded-sm border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em]",
                          cls[tone],
                        )}
                        title={`receipt kind: ${r.kind}`}
                      >
                        {r.kind}
                      </span>
                      <span className="font-mono text-xs text-zinc-300">{r.subject}</span>
                      <span className="ml-auto font-mono text-[10px] text-zinc-600">{fmtDubai(r.ts)}</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                      <HashChip value={r.digest} label="digest" size="sm" head={10} tail={6} />
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-zinc-600">
                        <Link2 className="size-3 text-zinc-600" aria-hidden="true" />
                        prev-linked
                      </span>
                      <span className="font-mono text-[10px] text-zinc-700" title={r.prev}>
                        ← {r.prev.slice(0, 8)}…{r.prev.slice(-6) || "genesis"}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
      <p className="mt-4 font-mono text-[10px] leading-relaxed text-zinc-600">
        newest first · showing the last {receipts.length} of {chain.len} receipts · every action
        from this console lands here permanently
      </p>
    </Section>
  );
}
