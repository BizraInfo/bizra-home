/**
 * BIZRA — shared section primitives for the public face.
 * One rhythm for the whole page: kicker → serif heading → human sentence → content.
 */

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface SectionProps {
  id?: string;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  /** "abyss" = deepest navy (#050B14), "vault" = raised navy (#0A1628). */
  tone?: "abyss" | "vault";
  align?: "center" | "left";
  className?: string;
  /** Render a section-local aria label for assistive land-marking. */
  "aria-label"?: string;
}

export function Section({
  id,
  kicker,
  title,
  lead,
  children,
  tone = "abyss",
  align = "center",
  className = "",
  ...rest
}: SectionProps) {
  return (
    <section
      id={id}
      aria-label={rest["aria-label"] ?? kicker}
      className={`relative w-full border-t border-white/5 px-6 py-24 sm:px-8 sm:py-32 ${
        tone === "vault" ? "bg-navy-800" : "bg-navy-900"
      } ${className}`}
    >
      <div
        className={`mx-auto max-w-6xl ${
          align === "center" ? "text-center" : "text-left"
        }`}
      >
        <Reveal>
          <p className="bz-kicker mb-5 sm:mb-6">{kicker}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="font-serif text-4xl font-semibold leading-[1.15] tracking-tight text-cream sm:text-5xl">
            {title}
          </h2>
        </Reveal>
        {lead ? (
          <Reveal delay={0.16}>
            <p
              className={`mt-5 max-w-2xl text-base font-light leading-relaxed text-cream/60 sm:text-[1.0625rem] ${
                align === "center" ? "mx-auto" : ""
              }`}
            >
              {lead}
            </p>
          </Reveal>
        ) : null}
        <div className="mt-12 sm:mt-16">{children}</div>
      </div>
    </section>
  );
}

/** Scroll-reveal wrapper — one quiet motion language across the page. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A live-status dot — the pulse that means "measured, now". Gold marks the reference archive. */
export function LiveDot({ tone = "verdant" }: { tone?: "verdant" | "solar" | "ember" | "gold" }) {
  const color =
    tone === "verdant" ? "#34d399" : tone === "solar" ? "#fbbf24" : tone === "ember" ? "#f87171" : "#c9a962";
  return (
    <span className="relative inline-flex size-2 flex-none" aria-hidden="true">
      <span
        className="bz-live-ping absolute inline-flex size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex size-2 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
      />
    </span>
  );
}

/** Honest truth-label chip — MEASURED / DESIGNED / SEALED / REFUSED. */
export function TruthChip({
  label,
  tone = "gold",
}: {
  label: string;
  tone?: "gold" | "verdant" | "ember" | "solar" | "neutral";
}) {
  const map: Record<string, string> = {
    gold: "border-gold-500/35 text-gold-500",
    verdant: "border-verdant/40 text-verdant",
    ember: "border-ember/40 text-ember",
    solar: "border-solar/40 text-solar",
    neutral: "border-white/15 text-cream/50",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.6875rem] tracking-[0.18em] uppercase ${map[tone]}`}
    >
      {label}
    </span>
  );
}
