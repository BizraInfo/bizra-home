"use client";

/**
 * BIZRA — Origin. Before code, there was the Seed.
 * Not a startup story. A people story — Ramadan 2023, one human question.
 */

import { Reveal } from "./shared";
import { classifyRuntime } from "./runtime-status";
import type { Node0State } from "@/components/node0/types";

export function Origin({ state, error }: { state: Node0State | null; error: string | null }) {
  const kind = classifyRuntime(state?.runtime, error == null, error);
  const reference = kind === "REFERENCE";
  const live = kind === "LIVE";
  const node0Card = reference
    ? { value: "Node0", label: "reference · receipt-backed", note: "sealed archive, measured — not an active node" }
    : live
      ? { value: "Node0", label: "live · receipt-backed", note: "measured, not promised" }
      : { value: "Node0", label: "status unavailable", note: "no current runtime evidence" };
  const STATS: Array<{ value: string; label: string; note: string; tone: "gold" | "verdant" }> = [
    { value: "3 years", label: "every single day", note: "day and night, without exception", tone: "gold" },
    { value: "1 builder", label: "solo, sovereign", note: "one of the people, not above them", tone: "gold" },
    { value: node0Card.value, label: node0Card.label, note: node0Card.note, tone: "gold" },
    { value: "7 + 5", label: "PAT for you · SAT for all", note: "private proposals, shared verdicts", tone: "gold" },
  ];
  return (
    <section
      id="origin"
      aria-label="Origin — before code, there was the seed"
      className="relative w-full border-t border-white/5 bg-navy-800 px-6 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 sm:gap-16 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="bz-kicker mb-5">Origin</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-serif text-4xl font-semibold leading-[1.18] tracking-tight text-cream sm:text-[2.9rem]">
              Before code,
              <br />
              there was the Seed.
            </h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-4 font-arabic text-2xl text-gold-500/70" lang="ar">
              قبل الكود، كانت البذرة.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-7 text-base font-light leading-[1.85] text-cream/60">
              BIZRA did not begin as a token, a product, or a market opportunity. It began
              in Ramadan 2023 as a human question: how to live, build, earn, learn, and
              serve — without reducing the human being to data, labor, attention, or fuel.
            </p>
          </Reveal>
          <Reveal delay={0.26}>
            <p className="mt-4 text-base font-light leading-[1.85] text-cream/60">
              We did not start from a startup or a lab. We started from the pain — the
              pain the whole world feels and mostly cannot name. Three years of solo work,
              day and night, produced a local sovereign-node implementation: an AI
              companion, a private agent team, consent gates, and receipt pathways.
            </p>
          </Reveal>
        </div>

        <div className="flex flex-col gap-5">
          <Reveal delay={0.1}>
            <blockquote className="bz-glass rounded-2xl border-l-2 border-l-gold-500 p-7 sm:p-8">
              <p className="font-serif text-xl italic leading-[1.55] text-cream/90 sm:text-2xl">
                A seed is not small because it lacks power. A seed is small because it
                carries a world inside it.
              </p>
            </blockquote>
          </Reveal>
          <div className="grid grid-cols-2 gap-4">
            {STATS.map((s, i) => (
              <Reveal key={s.value + s.label} delay={0.16 + i * 0.07}>
                <div className="bz-glass group h-full rounded-xl p-5 transition-colors duration-500 hover:border-gold-500/25 sm:p-6">
                  <p
                    className={`bz-num text-3xl sm:text-[2.15rem] ${
                      s.tone === "verdant" ? "text-verdant" : "text-gold-500"
                    }`}
                  >
                    {s.value}
                  </p>
                  <p className="mt-2 font-mono text-[0.66rem] tracking-[0.18em] text-cream/45 uppercase">
                    {s.label}
                  </p>
                  <p className="mt-2 text-[0.8rem] font-light leading-relaxed text-cream/40">
                    {s.note}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
