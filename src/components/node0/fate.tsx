"use client";

import * as React from "react";
import { Ban, HardDrive, Lock, Timer } from "lucide-react";
import type { Node0State } from "./types";
import { fmtDubai, HashChip, Section, StatTile, StatusChip } from "./shared";

export function Fate({ state }: { state: Node0State }) {
  const { fate } = state;
  const leases = fate.registry;

  return (
    <Section
      id="fate"
      kicker="IV · The Membrane"
      title="FATE"
      description="Authority is not ambient — it is issued as a durable, single-use lease with a TTL, no network, and a filesystem scope of exactly one directory. Expired leases are refused and never renewed."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="leases issued" value={fate.stats.total} />
        <StatTile label="active now" value={fate.stats.active} tone="amber" />
        <StatTile
          label="consumed (single-use)"
          value={fate.stats.consumed}
          tone="emerald"
          sub="re-consumption refused"
        />
        <StatTile label="expired ever" value={fate.stats.expired_ever} tone="red" />
        <StatTile
          label="ambient authority"
          value={fate.ambient_authority}
          tone={fate.ambient_authority === "NONE" ? "emerald" : "red"}
          sub="no standing capability exists"
        />
      </div>

      {/* Lease ledger */}
      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-400">
            Lease ledger · {leases.length} shown
          </h3>
          <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
            <span className="inline-flex items-center gap-1">
              <Ban className="size-3" aria-hidden="true" /> network
            </span>
            <span className="inline-flex items-center gap-1">
              <HardDrive className="size-3" aria-hidden="true" /> fs
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="size-3" aria-hidden="true" /> ttl
            </span>
          </div>
        </div>
        <ul className="node0-scroll max-h-96 divide-y divide-zinc-800/70 overflow-y-auto">
          {leases.length === 0 ? (
            <li className="p-6 text-center font-mono text-xs text-zinc-600">no leases recorded</li>
          ) : (
            leases.map((lease) => (
              <li
                key={lease.id}
                className="grid gap-x-6 gap-y-2 p-4 transition-colors hover:bg-zinc-900/30 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto]"
              >
                <div className="min-w-0">
                  <HashChip value={lease.id} label="lease" head={12} tail={6} size="sm" />
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusChip status={lease.status} />
                    <span className="font-mono text-[10px] text-zinc-600">{fmtDubai(lease.ts)}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs text-zinc-300">{lease.subject}</div>
                  <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                    {lease.purpose} · single_use {lease.single_use ? "true" : "false"}
                  </div>
                  {lease.consumed_at ? (
                    <div className="mt-1 font-mono text-[10px] text-zinc-600">
                      consumed {fmtDubai(lease.consumed_at)}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <span
                    className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/25 bg-emerald-500/5 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400"
                    title="network access: denied by structure"
                  >
                    <Ban className="size-3" aria-hidden="true" />
                    network ✗
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-sm border border-zinc-700 bg-zinc-800/40 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    <Lock className="size-3" aria-hidden="true" />
                    {lease.fs_scope}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-sm border border-zinc-700 bg-zinc-800/40 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                    <Timer className="size-3" aria-hidden="true" />
                    {lease.ttl_ms} ms
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </Section>
  );
}
