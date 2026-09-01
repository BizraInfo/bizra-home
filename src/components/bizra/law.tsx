"use client";

/**
 * BIZRA — The Law. The economic order, fixed.
 * Contribution → Verification → Receipt → Impact → Reward. It cannot be skipped.
 */

import { Reveal } from "./shared";

const CHAIN = ["Contribution", "Verification", "Receipt", "Impact"] as const;

const VOWS = ["No riba — no usury", "No speculation-first", "No false green"] as const;

export function Law() {
  return (
    <section
      id="law"
      aria-label="The Law — no reward detached from real benefit"
      className="relative w-full border-t border-white/5 bg-navy-800 px-6 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="bz-kicker mb-5">The Law</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="font-serif text-4xl font-semibold leading-[1.15] tracking-tight text-cream sm:text-5xl">
            No reward detached from real benefit.
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mx-auto mt-5 max-w-xl text-base font-light leading-relaxed text-cream/55">
            The economic order is fixed — and it cannot be skipped:
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {CHAIN.map((step) => (
              <span
                key={step}
                className="rounded-full border border-white/[0.12] px-6 py-3.5 font-serif text-lg text-cream/85 sm:px-7 sm:text-xl"
              >
                {step}
              </span>
            ))}
            <span className="text-gold-500" aria-hidden="true">→</span>
            <span className="rounded-full border border-verdant/50 bg-verdant/[0.06] px-6 py-3.5 font-serif text-lg text-verdant sm:px-7 sm:text-xl">
              Reward
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.26}>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5">
            {VOWS.map((v) => (
              <span
                key={v}
                className="rounded-full border border-white/10 px-4 py-2 font-mono text-[0.66rem] tracking-[0.16em] text-cream/50 uppercase"
              >
                {v}
              </span>
            ))}
            <span className="rounded-full border border-verdant/35 px-4 py-2 font-mono text-[0.66rem] tracking-[0.16em] text-verdant uppercase">
              Proof gates issuance
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.32}>
          <p className="mx-auto mt-12 max-w-2xl font-serif text-lg italic leading-[1.6] text-cream/70 sm:text-xl">
            Before any coin exists, a receipt must exist. Before any reward moves, an
            observer must have confirmed the impact was real.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
