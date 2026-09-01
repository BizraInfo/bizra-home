"use client";

import * as React from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Node0State } from "./types";
import { fmtBytes, fmtDubai, HashChip, LawLine, Section, StatTile } from "./shared";

export function Vault({ state }: { state: Node0State }) {
  const { constitution, node0 } = state;
  const spine = node0.spine;

  return (
    <Section
      id="vault"
      kicker="I · The Root"
      title="Constitution Vault"
      description="Three root PDFs, sealed once. The composite root hash binds every byte — the engine re-hashes the vault on every boot and walks the chain from genesis."
    >
      {/* Composite root */}
      <div className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">
            Composite root hash · SHA-256 over the sealed manifest
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
              constitution.verified
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-red-500/40 bg-red-500/10 text-red-400",
            )}
          >
            {constitution.verified ? (
              <ShieldCheck className="size-3" aria-hidden="true" />
            ) : (
              <ShieldAlert className="size-3" aria-hidden="true" />
            )}
            {constitution.verified ? "verified" : "drift"} · {constitution.files.filter((f) => f.verified).length}/
            {constitution.files.length} files
          </span>
        </div>
        <HashChip
          value={constitution.root_hash}
          head={20}
          tail={16}
          size="md"
          className="w-full justify-start border-zinc-800 bg-zinc-950/60 py-2 text-sm text-amber-200/90"
        />
        <div className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-zinc-500">
          <span>
            drift:{" "}
            <span className={constitution.drift.length === 0 ? "text-emerald-400" : "text-red-400"}>
              {constitution.drift.length === 0 ? "[] — measured now" : JSON.stringify(constitution.drift)}
            </span>
          </span>
          <span>sealed {fmtDubai(state.runtime.sealed_at)}</span>
        </div>
      </div>

      {/* The three root files */}
      <ul className="mt-6 flex flex-col gap-3">
        {constitution.files.map((file) => (
          <li
            key={file.name}
            className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 sm:flex-row sm:items-center sm:gap-6"
          >
            <div className="min-w-0 sm:w-72">
              <div className="truncate font-mono text-sm text-zinc-100">{file.name}</div>
              <div className="mt-1 text-xs leading-snug text-zinc-500">{file.role}</div>
            </div>
            <HashChip
              value={file.sha256}
              label="sha256"
              head={14}
              tail={10}
              className="w-full flex-1 justify-start border-transparent bg-transparent py-1.5"
            />
            <div className="flex shrink-0 items-center gap-4 font-mono text-[11px] text-zinc-500">
              <span>{fmtBytes(file.bytes)}</span>
              {file.verified ? (
                <span className="inline-flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                  verified
                  <span className="sr-only">sha256 matches the sealed manifest</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-red-400">
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                  drift
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Law */}
      <div className="mt-6 flex flex-col gap-4">
        <LawLine>
          &ldquo;Root bytes hash-sealed — byte drift detected on verification halts the
          engine; physical permission immutability is not proven by this workspace.&rdquo;
        </LawLine>

        {/* Source-drift, shown honestly when present */}
        <div className="grid gap-3 sm:grid-cols-3">
          <StatTile
            label="vault drift"
            value={constitution.drift.length === 0 ? "NONE" : `${constitution.drift.length} file(s)`}
            tone={constitution.drift.length === 0 ? "emerald" : "red"}
            sub={constitution.drift.length === 0 ? "halt boundary not crossed" : "engine halts — nothing proceeds"}
          />
          <StatTile
            label="runtime status"
            value={state.runtime.status}
            tone={state.runtime.status === "LIVE" ? "emerald" : state.runtime.status === "REFERENCE_ONLINE" ? "amber" : "red"}
            sub={
              state.runtime.halted_reason
                ? state.runtime.halted_reason
                : state.runtime.status === "REFERENCE_ONLINE"
                  ? "read-only archive presentation — Node0 not active"
                  : "all action routes open"
            }
          />
          <StatTile
            label="spine source drift"
            value={spine.source_drift ? "YES · DEV" : "NONE"}
            tone={spine.source_drift ? "amber" : "emerald"}
            sub="bun --hot observation — the constitution is the halt boundary"
          />
        </div>
        {spine.source_drift ? (
          <p className="rounded-md border border-amber-500/25 bg-amber-500/5 p-4 text-xs leading-relaxed text-amber-300/90">
            <span className="font-mono uppercase tracking-[0.14em]">spine note · </span>
            {spine.drift_note} — sealed {spine.sealed_source_digest.slice(0, 8)}…, current{" "}
            {spine.current_source_digest.slice(0, 8)}….
          </p>
        ) : null}
      </div>
    </Section>
  );
}
