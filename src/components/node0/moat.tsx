"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Node0State } from "./types";
import { LawLine, Section } from "./shared";

interface MoatRow {
  contract: string;
  observable: string;
  testable: string;
  diagnosable: string;
}

const MOAT_ROWS: MoatRow[] = [
  {
    contract: "Constitution",
    observable: "/api/state → constitution.verified, files[].sha256, drift[]",
    testable: "flip one byte of a root PDF → the engine HALTS and every action route refuses",
    diagnosable: "NODE0_SEALED receipt · the vault is re-hashed on every boot",
  },
  {
    contract: "Receipt chain",
    observable: "/api/state → chain.ok, len, head, last[] (12 newest)",
    testable: "tamper a stored receipt row → the genesis walk reports BROKEN at the exact seq",
    diagnosable: "every receipt digest = SHA-256(prev | kind | subject | payload)",
  },
  {
    contract: "PAT port",
    observable: "/api/state → pat.mode, model_calls, model_failures, last",
    testable: "model returns garbage or times out → REFUSAL, never a fallback value",
    diagnosable: "proposal_hash sealed inside the mission receipt",
  },
  {
    contract: "SAT contract",
    observable: "/api/state → sat.last.clauses — the four clauses, parsed and displayed",
    testable: "submit a no-op proposal → SAT refuses at consistency, refusal sealed",
    diagnosable: "sat_verdict_hash (mission receipt) · SAT log",
  },
  {
    contract: "FATE membrane",
    observable: "/api/state → fate.stats, registry[], ambient_authority",
    testable: "try to re-consume a consumed lease → refused; let TTL pass → EXPIRED, never renewed",
    diagnosable: "fate_decision_hash inside the transition receipt",
  },
  {
    contract: "Mission (exactly-once)",
    observable: "/api/state → missions[].effect_writes, ladder, receipt.eight_hashes",
    testable: "kill the process after OBSERVE, restart → resume + seal, effect_writes stays 1",
    diagnosable: "the 8-hash MISSION seal — the crown-jewel receipt",
  },
  {
    contract: "Autopoietic transition",
    observable: "/api/state → transitions[] (before/after, reverted), contracts[] values",
    testable: "run cycles → the value moves only inside its min/max clamp; REVERT restores before",
    diagnosable: "TRANSITION_RECEIPT + TRANSITION_REVERT (authority=HUMAN)",
  },
  {
    contract: "Dema relay",
    observable: "/api/state → dema[] — 24 events, statuses DONE/REFUSED/UNKNOWN",
    testable: "force any refusal → Dema reports REFUSED with the receipt digest, never silence",
    diagnosable: "the receipt_digest bound to every Dema row",
  },
];

export function Moat({ state }: { state: Node0State }) {
  return (
    <Section
      id="moat"
      kicker="XI · The Moat"
      title="The Observability Moat"
      description="Make every important system contract observable, testable, and diagnosable across code, runtime behavior, and production reality — prevent drift at its cause, not discover it at its consequences. That composition is the moat."
    >
      <LawLine className="mb-6">
        Make every important system contract observable, testable, and diagnosable across code,
        runtime behavior, and production reality — prevent drift at its cause, not discover it at
        its consequences. That composition is the moat.
      </LawLine>

      <div className="node0-scroll overflow-x-auto rounded-lg border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="h-11 bg-zinc-900/60 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-500/90">
                Contract
              </TableHead>
              <TableHead className="h-11 bg-zinc-900/60 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                Observable
              </TableHead>
              <TableHead className="h-11 bg-zinc-900/60 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                Testable
              </TableHead>
              <TableHead className="h-11 bg-zinc-900/60 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                Diagnosable
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOAT_ROWS.map((row) => (
              <TableRow
                key={row.contract}
                className="border-zinc-800/70 align-top hover:bg-zinc-900/30"
              >
                <TableCell className="py-3.5 pr-4 font-mono text-xs text-zinc-100">
                  {row.contract}
                </TableCell>
                <TableCell className="py-3.5 pr-4 font-mono text-[11px] leading-relaxed text-amber-300/80">
                  {row.observable}
                </TableCell>
                <TableCell className="py-3.5 pr-4 text-[11px] leading-relaxed text-zinc-400">
                  {row.testable}
                </TableCell>
                <TableCell className="py-3.5 font-mono text-[11px] leading-relaxed text-zinc-500">
                  {row.diagnosable}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="mt-4 font-mono text-[10px] leading-relaxed text-zinc-600">
        measured now: chain #{state.chain.len} · {state.signals.traces_admitted} admitted traces ·{" "}
        {state.signals.missions_sealed} mission(s) sealed · ambient authority{" "}
        {state.fate.ambient_authority}
      </p>
    </Section>
  );
}
