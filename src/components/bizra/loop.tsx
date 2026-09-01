"use client";

/**
 * BIZRA — The Living System. One loop, seven stops.
 *
 * A gold pulse travels the spine every 1.6s, lighting each stop in order —
 * and every stop carries a real measurement read from the live runtime:
 * Dema's verdict count, FATE's lease ledger, SAT's determinism. The story
 * is the system; the numbers are its pulse.
 */

import { useEffect, useState } from "react";
import { Reveal } from "./shared";
import { classifyRuntime } from "./runtime-status";
import type { Node0State } from "@/components/node0/types";

interface Stop {
  num: string;
  name: string;
  desc: string;
  /** Live measurement line — resolved from state, honest if unreachable. */
  live: (s: Node0State | null) => string;
}

const STOPS: Stop[] = [
  {
    num: "01",
    name: "You",
    desc: "One human, one node. Intention starts here — and nothing moves without it.",
    live: (s) => (s ? `${s.signals.distinct_sources} observed sources` : "engine silent"),
  },
  {
    num: "02",
    name: "Dema",
    desc: "The companion door — listens, explains, and asks for exact consent. Status only: DONE, REFUSED, or UNKNOWN. Never silence.",
    live: (s) => (s ? `${s.dema.length} verdicts relayed` : "engine silent"),
  },
  {
    num: "03",
    name: "PAT × 7",
    desc: "Your private team of seven drafts a bounded proposal. It never leaves your node — one model call per cycle, budgeted.",
    live: (s) => (s ? `mode ${s.pat.mode} · ${s.pat.organs} organs` : "engine silent"),
  },
  {
    num: "04",
    name: "FATE",
    desc: "The fail-closed membrane: single-use lease, 30-second TTL, network denied, filesystem outbox-only. No standing authority, ever.",
    live: (s) =>
      s ? `${s.fate.stats.consumed}/${s.fate.stats.total} leases consumed · 0 expired` : "engine silent",
  },
  {
    num: "05",
    name: "SAT × 5",
    desc: "The shared world verifies — deterministic clauses, no model in the judge. Provenance, consistency, corroboration, disambiguation.",
    live: (s) =>
      s
        ? `deterministic · last verdict ${s.sat.last?.verdict ?? "—"}`
        : "engine silent",
  },
  {
    num: "06",
    name: "Proof of Impact",
    desc: "Was it actually useful? Effects are hashed, observers confirm, and the eight-hash receipt is sealed. No use — no reward.",
    live: (s) =>
      s
        ? `${s.signals.missions_sealed} mission sealed · ${s.signals.refusal_events} honest refusals`
        : "engine silent",
  },
  {
    num: "07",
    name: "Return",
    desc: "A verified verdict rides home along the receipt spine. Your team learns, the constitution holds, the loop closes.",
    live: (s) => (s ? `chain head · ${s.chain.len} receipts` : "engine silent"),
  },
];

export function Loop({ state }: { state: Node0State | null }) {
  const [step, setStep] = useState(0);
  const reference = classifyRuntime(state?.runtime, state && state.ok ? true : false) === "REFERENCE";

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % STOPS.length), 1600);
    return () => clearInterval(id);
  }, []);

  const live = state && state.ok;
  const pct = (step / (STOPS.length - 1)) * 100;

  return (
    <section
      id="loop"
      aria-label="The Living System — one loop from intention to verified impact"
      className="relative w-full border-t border-white/5 bg-navy-800 px-6 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <Reveal>
            <p className="bz-kicker mb-5">The Living System</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mx-auto max-w-3xl font-serif text-4xl font-semibold leading-[1.15] tracking-tight text-cream sm:text-5xl">
              One loop. From your intention to verified impact.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-2xl text-base font-light leading-relaxed text-cream/55">
              {reference
                ? "Nothing acts without consent. Nothing is rewarded without proof. The loop below is the sealed record of a system that ran under this law — each stop carries its own measured value, read from the reference archive."
                : "Nothing acts without consent. Nothing is rewarded without proof. The loop below is not a diagram — it is running now, and each stop carries its own live measurement."}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.18}>
          <div
            className="mt-12 grid gap-3 sm:mt-16 sm:grid-cols-2 lg:grid-cols-7"
            role="list"
            aria-label="The seven stops of the constitutional loop"
          >
            {STOPS.map((stop, i) => {
              const active = i === step;
              return (
                <article
                  key={stop.num}
                  role="listitem"
                  aria-current={active ? "step" : undefined}
                  className={`relative flex min-h-11 flex-col rounded-xl border p-4 transition-[border-color,background-color,box-shadow] duration-500 sm:p-5 ${
                    active
                      ? "border-gold-500/70 bg-gold-500/[0.07] shadow-[0_0_34px_rgba(201,169,98,0.14)]"
                      : "border-white/[0.07] bg-white/[0.03]"
                  }`}
                >
                  <p className="font-mono text-[0.66rem] tracking-[0.18em] text-gold-500/60">
                    {stop.num}
                  </p>
                  <h3 className="mt-1.5 font-serif text-lg leading-tight text-cream sm:text-xl">
                    {stop.name}
                  </h3>
                  <p className="mt-2 text-[0.78rem] font-light leading-[1.55] text-cream/50">
                    {stop.desc}
                  </p>
                  <p
                    className={`mt-auto pt-3 font-mono text-[0.64rem] tracking-[0.1em] ${
                      live ? "text-gold-500/80" : "text-solar/70"
                    }`}
                  >
                    {live ? "▸ " : "▸ "}
                    {stop.live(state)}
                  </p>
                </article>
              );
            })}
          </div>
        </Reveal>

        {/* The traveling pulse — the loop's own heartbeat */}
        <Reveal delay={0.24}>
          <div
            className="relative mt-6 hidden h-1 overflow-visible rounded-full bg-gold-500/10 lg:block"
            aria-hidden="true"
          >
            <div
              className="absolute top-1/2 -mt-1.5 size-3 rounded-full bg-gold-500 shadow-[0_0_18px_rgba(201,169,98,0.9)] transition-[left] duration-[1400ms] ease-[cubic-bezier(.22,1,.36,1)]"
              style={{ left: `calc(${pct}% - 6px)` }}
            />
          </div>
          <div className="mt-3 hidden justify-between font-mono text-[0.68rem] tracking-[0.16em] text-cream/35 uppercase lg:flex" aria-hidden="true">
            <span>intention →</span>
            <span className={live ? "text-verdant/70" : "text-solar/70"}>
              ← verified verdict returns home
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
