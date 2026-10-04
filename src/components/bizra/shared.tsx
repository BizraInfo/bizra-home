/**
 * BIZRA — shared section primitives for the public face.
 * One rhythm for the whole page: kicker → serif heading → human sentence → content.
 * Reveal is CSS-only so framer-motion stays off the homepage critical path.
 */

import type { ReactNode } from "react";

export { LiveDot, TruthChip } from "./status-ui";

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

/** Quiet entrance — CSS only (no framer-motion on the public face). */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <div
      className={`bz-rise ${className}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    >
      {children}
    </div>
  );
}
