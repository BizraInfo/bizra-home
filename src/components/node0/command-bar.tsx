"use client";

import * as React from "react";
import { RotateCw, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Node0State } from "./types";
import { statusTone } from "./shared";

const NAV = [
  { href: "#deck", label: "Deck" },
  { href: "#vault", label: "Vault" },
  { href: "#loop", label: "Loop" },
  { href: "#agents", label: "PAT|SAT" },
  { href: "#fate", label: "FATE" },
  { href: "#transitions", label: "Transitions" },
  { href: "#evidence", label: "Evidence" },
  { href: "#submit", label: "Submit" },
  { href: "#mission", label: "Mission" },
  { href: "#dema", label: "Dema" },
  { href: "#chain", label: "Chain" },
  { href: "#moat", label: "Moat" },
];

type LiveStatus = "LIVE" | "HALTED" | "UNREACHABLE";

function statusOf(state: Node0State | null, error: string | null): LiveStatus {
  if (!state) return "UNREACHABLE";
  if (error) return "UNREACHABLE";
  if (state.runtime.status === "HALTED") return "HALTED";
  return "LIVE";
}

const pillTone: Record<LiveStatus, { dot: string; text: string; ping?: boolean }> = {
  LIVE: { dot: "bg-emerald-400", text: "text-emerald-300 border-emerald-500/40 bg-emerald-500/10", ping: true },
  HALTED: { dot: "bg-red-400", text: "text-red-300 border-red-500/40 bg-red-500/10", ping: true },
  UNREACHABLE: { dot: "bg-amber-400", text: "text-amber-300 border-amber-500/40 bg-amber-500/10" },
};

export function CommandBar({
  state,
  error,
  onRetry,
}: {
  state: Node0State | null;
  error: string | null;
  onRetry: () => void;
}) {
  const live = statusOf(state, error);
  const tone = pillTone[live];
  const dema = state?.dema?.[0];

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0a0a0b]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0b]/75">
      <nav
        aria-label="BIZRA Node0 primary"
        className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6"
      >
        {/* Wordmark */}
        <a href="#deck" className="flex items-center gap-2.5" aria-label="BIZRA Node0 — command deck">
          <span className="flex size-6 items-center justify-center rounded-sm border border-amber-600/50 bg-amber-500/10">
            <Scale className="size-3.5 text-amber-400" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-[0.22em] text-zinc-100">BIZRA&nbsp;NODE0</span>
        </a>

        {/* Live status pill */}
        <span
          role="status"
          aria-live="polite"
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em]",
            tone.text,
          )}
        >
          <span className="relative flex size-2">
            {tone.ping ? (
              <span className={cn("absolute inline-flex size-2 rounded-full opacity-60 node0-ping", tone.dot)} aria-hidden="true" />
            ) : null}
            <span className={cn("relative inline-flex size-2 rounded-full", tone.dot)} aria-hidden="true" />
          </span>
          {live === "UNREACHABLE" ? "RUNTIME UNREACHABLE" : live}
          <span className="sr-only">
            {live === "LIVE"
              ? "Runtime is live on port 7421"
              : live === "HALTED"
                ? "Runtime is halted: constitution drift"
                : "Runtime is unreachable — retrying"}
          </span>
        </span>

        {live === "UNREACHABLE" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-9 border-amber-600/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
          >
            <RotateCw className="size-3.5" aria-hidden="true" />
            RETRY
            <span className="sr-only">Retry connection to the runtime</span>
          </Button>
        ) : null}

        {/* Right meta */}
        <div className="ml-auto hidden items-center gap-4 font-mono text-[11px] text-zinc-500 md:flex">
          <span>
            phase <span className="text-amber-400">{state?.runtime.phase ?? "—"}</span>
          </span>
          <span>
            chain <span className="text-zinc-200">#{state?.chain.len ?? "—"}</span>
          </span>
          <span>
            dema{" "}
            <span
              className={
                dema ? (statusTone(dema.status) === "emerald" ? "text-emerald-400" : statusTone(dema.status) === "red" ? "text-red-400" : "text-amber-400") : "text-zinc-600"
              }
            >
              {dema?.status ?? "—"}
            </span>
          </span>
        </div>
      </nav>

      {/* Anchor rail — horizontally scrollable on touch */}
      <div className="relative">
        <nav
          aria-label="Section anchors"
          className="no-scrollbar mx-auto flex w-full max-w-7xl items-center gap-5 overflow-x-auto border-t border-zinc-800/50 px-4 py-2 sm:px-6"
        >
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="shrink-0 whitespace-nowrap py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 transition-colors hover:text-amber-400"
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#0a0a0b] to-transparent"
        />
      </div>
    </header>
  );
}
