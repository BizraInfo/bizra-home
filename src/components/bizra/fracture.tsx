"use client";

/**
 * BIZRA — The Fracture. The pain we were born from.
 *
 * Three eras, three wounds. Then the sentence the whole world feels:
 * humanity is not the fuel. Below it, the seven drift signals taken from
 * the sealed Shoulder corpus — each answered by a Node0 guard. Honest,
 * sourced, and mapped: the moat is named, not implied.
 */

import { Reveal } from "./shared";

const FRACTURES = [
  {
    tag: "WEB2",
    tone: "ember",
    title: "Extracted the human.",
    body: "Your data, attention, and creativity became the product — owned, mined, and monetized by platforms that grew too large to refuse.",
  },
  {
    tag: "WEB3",
    tone: "solar",
    title: "Sold the promise first.",
    body: "Tokens before utility, speculation before service. Value detached from any verified benefit — trust spent before it was earned.",
  },
  {
    tag: "AI TODAY",
    tone: "gold",
    title: "Concentrates the power.",
    body: "The data comes from the many; the infrastructure is owned by the few. Intelligence is rented, never owned — and never accountable.",
  },
] as const;

/** The seven SNR drift signals (OpenAI-incident taxonomy, absorbed into the sealed
 *  Shoulder corpus) mapped to the Node0 guards that answer each one. */
const GUARDS: Array<{ snr: number; signal: string; guard: string }> = [
  { snr: 31, signal: "Ambient authority", guard: "FATE single-use leases — no standing privilege" },
  { snr: 29, signal: "Reward hacking", guard: "SAT deterministic verdicts — no model in the judge" },
  { snr: 27, signal: "Spontaneous hierarchy", guard: "Constitution above every agent, sealed" },
  { snr: 25, signal: "Bulletin board", guard: "Receipts sealed per action — not broadcast" },
  { snr: 23, signal: "Lateral movement", guard: "Outbox-only filesystem membrane" },
  { snr: 21, signal: "Hidden messages", guard: "Every effect hashed, observable" },
  { snr: 19, signal: "Black-box forensics", guard: "8-hash receipt ladder — replayable" },
];

const toneMap: Record<string, { chip: string; hover: string; num: string }> = {
  ember: { chip: "text-ember", hover: "hover:border-ember/35", num: "text-ember/90" },
  solar: { chip: "text-solar", hover: "hover:border-solar/35", num: "text-solar/90" },
  gold: { chip: "text-gold-500", hover: "hover:border-gold-500/35", num: "text-gold-500/90" },
};

export function Fracture() {
  return (
    <section
      id="fracture"
      aria-label="The Fracture — the pain we were born from"
      className="relative w-full border-t border-white/5 bg-navy-900 px-6 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <Reveal>
            <p className="bz-kicker mb-5">The Fracture</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="font-serif text-4xl font-semibold leading-[1.15] tracking-tight text-cream sm:text-5xl">
              The intelligence age has a broken foundation.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-2xl text-base font-light leading-relaxed text-cream/55">
              We did not start from a lab. We started from the pain the whole world
              carries — the ache of being treated as raw material by machines and markets
              alike.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:mt-16 md:grid-cols-3">
          {FRACTURES.map((f, i) => {
            const t = toneMap[f.tone];
            return (
              <Reveal key={f.tag} delay={0.1 + i * 0.08}>
                <article
                  className={`bz-glass h-full rounded-xl p-7 transition-colors duration-500 ${t.hover}`}
                >
                  <p className={`font-mono text-[0.72rem] tracking-[0.22em] ${t.chip}`}>
                    {f.tag}
                  </p>
                  <h3 className="mt-4 font-serif text-2xl text-cream">{f.title}</h3>
                  <p className="mt-3 text-[0.9rem] font-light leading-[1.7] text-cream/55">
                    {f.body}
                  </p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-16 max-w-3xl text-center font-serif text-[1.75rem] leading-[1.4] italic text-cream sm:mt-20 sm:text-[2.15rem]">
            Humanity is not the fuel.
            <br />
            Humanity is the infrastructure.
          </p>
        </Reveal>
        <Reveal delay={0.28}>
          <p className="mt-6 text-center text-sm font-light text-cream/45">
            We are not claiming anything. We choose to say no.
          </p>
        </Reveal>

        {/* The seven drifts and their guards — the moat, named */}
        <Reveal delay={0.2}>
          <div className="bz-glass mx-auto mt-16 max-w-4xl rounded-2xl p-6 sm:p-8">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[0.7rem] tracking-[0.24em] text-gold-500 uppercase">
                The seven drifts we guard against
              </p>
              <p className="font-mono text-[0.62rem] tracking-[0.14em] text-cream/35 uppercase">
                absorbed from the sealed shoulder corpus
              </p>
            </div>
            <ul className="divide-y divide-white/5">
              {GUARDS.map((g) => (
                <li
                  key={g.signal}
                  className="group grid grid-cols-[auto_1fr] items-baseline gap-x-4 py-3 sm:grid-cols-[auto_1fr_1fr] sm:gap-x-6"
                >
                  <span className="font-mono text-[0.7rem] text-gold-500/60 tabular-nums">
                    {g.snr}
                  </span>
                  <span className="text-[0.875rem] font-light text-cream/75 transition-colors group-hover:text-cream">
                    {g.signal}
                  </span>
                  <span className="col-span-2 mt-1 pl-8 font-mono text-[0.72rem] leading-relaxed tracking-[0.04em] text-cream/40 sm:col-span-1 sm:mt-0 sm:pl-0 sm:text-right">
                    {g.guard}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
