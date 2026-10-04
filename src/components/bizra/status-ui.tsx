/**
 * Status UI primitives with no motion library — safe for the critical path
 * (nav / hero) so framer-motion stays out of the LCP bundle.
 */

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
