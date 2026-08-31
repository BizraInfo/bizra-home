"use client";

import * as React from "react";
import { Scale } from "lucide-react";
import type { Node0State } from "./types";

function useDubaiClock(): string {
  const [now, setNow] = React.useState<string>("");
  React.useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dubai",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const tick = () => setNow(`${fmt.format(new Date())} GST`);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Node0Footer({
  state,
  updatedAt,
}: {
  state: Node0State | null;
  updatedAt: number | null;
}) {
  const clock = useDubaiClock();
  return (
    <footer
      className="mt-auto border-t border-zinc-800/80 bg-[#0a0a0b]/95"
      style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] text-zinc-500">
          <Scale className="size-3.5 text-amber-500" aria-hidden="true" />
          <span className="tracking-[0.14em] text-zinc-300">BIZRA NODE0</span>
          <span className="text-zinc-800">·</span>
          <span>Constitution &gt; Intelligence</span>
          <span className="text-zinc-800">·</span>
          <span>PAT proposes</span>
          <span className="text-zinc-800">·</span>
          <span>SAT verifies</span>
          <span className="text-zinc-800">·</span>
          <span>FATE leases</span>
          <span className="text-zinc-800">·</span>
          <span>receipts seal</span>
          <span className="text-zinc-800">·</span>
          <span>Dema reports</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
          <span className="text-emerald-500/80">measured — live model calls, file effects, hashes</span>
          <span className="text-amber-600">verified — chain walk, constitution re-hash, SAT clauses</span>
          <span className="text-zinc-700">port {state?.runtime.port ?? "—"}</span>
          <span className="text-zinc-400" aria-live="off">
            {clock || "—"} · Asia/Dubai
          </span>
          <span className="text-zinc-700">
            {updatedAt ? `state synced ${new Date(updatedAt).toLocaleTimeString("en-GB", { hour12: false })}` : "awaiting first sync"}
          </span>
        </div>
      </div>
    </footer>
  );
}
