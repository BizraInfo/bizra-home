"use client";

/**
 * BIZRA — The Ihsān Gate.
 *
 * The inner room of the whole work. Before anything leaves, one question
 * is asked — alone, honestly — and the answer decides. Excellence in
 * worship and work as if you see the One who made both, and even if you
 * do not see, you know you are seen. The formula must equal one.
 */

import { Reveal } from "./shared";
import { SeedMark } from "./seed-mark";

const FACTORS = ["Truth", "Precision", "Executability", "Verification", "Reversibility"] as const;

export function Ihsan() {
  return (
    <section
      id="ihsan"
      aria-label="The Ihsān Gate — the question that decides what ships"
      className="relative w-full overflow-hidden border-t border-white/5 bg-navy-900 px-6 py-28 sm:px-8 sm:py-36"
    >
      {/* the quiet dawn behind the gate */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[min(88vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(201,169,98,.08), transparent 62%)",
          animation: "bz-breathe 9s ease-in-out infinite",
        }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <SeedMark size={30} tone="soft" className="mx-auto" />
        </Reveal>
        <Reveal>
          <p className="bz-kicker mb-5 mt-6">The Ihsān Gate</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="font-serif text-4xl font-semibold leading-[1.18] tracking-tight text-cream sm:text-[2.9rem]">
            Before anything leaves this room,
            <br />
            one question is asked.
          </h2>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mx-auto mt-10 max-w-xl">
            <p className="font-serif text-xl italic leading-[1.7] text-cream/85 sm:text-[1.35rem]">
              Is this made with true Ihsān — in a way that honors the whole of BIZRA?
            </p>
            <p className="mt-4 text-sm font-light leading-relaxed text-cream/50">
              Asked alone. Answered honestly. If the answer is no, it does not ship — no
              matter how late the night, no matter how close the prize. Three years of
              nights have been saved by that one refusal, not by one shortcut.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="bz-glass mx-auto mt-12 max-w-2xl rounded-2xl p-6 sm:p-8">
            <p className="mb-4 font-mono text-[0.62rem] tracking-[0.22em] text-gold-500 uppercase">
              The quality formula — it must equal one
            </p>
            <p className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 font-mono text-[0.82rem] tracking-[0.04em] text-cream/75 sm:text-[0.95rem]">
              {FACTORS.map((f, i) => (
                <span key={f} className="inline-flex items-center gap-2.5">
                  {i > 0 ? <span className="text-gold-500/60" aria-hidden="true">×</span> : null}
                  {f}
                </span>
              ))}
              <span className="inline-flex items-center gap-2.5">
                <span className="text-gold-500/60" aria-hidden="true">=</span>
                <span className="text-gold-500">1.0</span>
              </span>
            </p>
            <p className="mt-5 border-t border-white/5 pt-5 text-[0.8rem] font-light leading-relaxed text-cream/45">
              If any factor falls to zero, the product falls to zero. There are no
              partial truths in a seed — it either carries the whole world inside it,
              or it carries nothing.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.3}>
          <p className="mt-10 font-arabic text-xl text-gold-500/60" lang="ar">
            الإحسان أن تعبد الله كأنك تراه
          </p>
          <p className="mt-2 font-serif text-sm italic text-cream/45">
            Ihsān: to work as though you see the One — and if you do not see, you know
            you are seen.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
