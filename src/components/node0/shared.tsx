"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, Copy, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Time & text helpers (all timestamps displayed in Asia/Dubai)         */
/* ------------------------------------------------------------------ */

const dubaiFull = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dubai",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dubaiDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dubai",
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function fmtDubai(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dubaiFull.format(d);
}

export function fmtDubaiDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dubaiDate.format(d);
}

export function fmtUptime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m ${s % 60}s`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export function fmtBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

export function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Copy to clipboard                                                   */
/* ------------------------------------------------------------------ */

export async function copyText(text: string, label = "Copied to clipboard"): Promise<void> {
  const describe = () => (text.length > 64 ? `${text.slice(0, 32)}…${text.slice(-16)}` : text);
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label, { description: describe() });
  } catch {
    // legacy fallback — contexts without the async clipboard permission
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      if (ok) {
        toast.success(label, { description: describe() });
        return;
      }
    } catch {
      // fall through to the honest failure
    }
    toast.error("Copy failed", { description: "Clipboard is unavailable in this context" });
  }
}

/* ------------------------------------------------------------------ */
/* Semantic tones — emerald = verified, red = refused, amber = pending  */
/* ------------------------------------------------------------------ */

export type Tone = "emerald" | "red" | "amber" | "zinc";

const toneClasses: Record<Tone, string> = {
  emerald: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  red: "text-red-400 border-red-500/30 bg-red-500/10",
  amber: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  zinc: "text-zinc-400 border-zinc-700 bg-zinc-800/40",
};

const toneDot: Record<Tone, string> = {
  emerald: "bg-emerald-400",
  red: "bg-red-400",
  amber: "bg-amber-400",
  zinc: "bg-zinc-500",
};

export function statusTone(status: string): Tone {
  const s = status.toUpperCase();
  if (
    ["DONE", "PASS", "SEALED", "VERIFIED", "CONSUMED", "LIVE", "ADMITTED", "PASSED", "OK"].includes(s)
  ) {
    return "emerald";
  }
  if (["REFUSED", "FAIL", "FAILED", "BROKEN", "EXPIRED", "HALTED", "INADMISSIBLE", "ERROR"].includes(s)) {
    return "red";
  }
  if (["UNKNOWN", "PENDING", "RUNNING", "RECOVERED", "STALE"].includes(s)) return "amber";
  return "zinc"; // SKIPPED, NO_PROPOSAL, DETERMINISTIC, PROPOSED…
}

/** Source → tone. No indigo/blue anywhere. */
export function sourceTone(source: string): Tone {
  switch (source) {
    case "operator":
      return "amber";
    case "browser":
      return "emerald";
    case "cycle":
      return "emerald";
    case "runtime":
      return "zinc";
    case "model":
      return "red";
    default:
      return "zinc";
  }
}

export function kindTone(kind: string): Tone {
  switch (kind) {
    case "TRANSITION_RECEIPT":
    case "NODE0_SEALED":
    case "CONSTITUTION_SEAL":
      return "amber";
    case "TRANSITION_REVERT":
      return "red";
    case "NODE0_LIVE":
    case "MISSION_SEAL":
      return "emerald";
    case "NODE0_BOOT":
    default:
      return "zinc";
  }
}

/* ------------------------------------------------------------------ */
/* Primitives                                                           */
/* ------------------------------------------------------------------ */

export function StatusChip({
  status,
  className,
  title,
}: {
  status: string;
  className?: string;
  title?: string;
}) {
  const tone = statusTone(status);
  return (
    <span
      title={title ?? status}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.12em]",
        toneClasses[tone],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", toneDot[tone])} aria-hidden="true" />
      {status}
      <span className="sr-only">{title ? `: ${title}` : ""}</span>
    </span>
  );
}

/**
 * Monospace hash chip — middle-truncated, full value on title,
 * click to copy the complete digest.
 */
export function HashChip({
  value,
  label,
  head = 10,
  tail = 8,
  className,
  size = "md",
  title,
}: {
  value: string | null | undefined;
  label?: string;
  head?: number;
  tail?: number;
  className?: string;
  size?: "sm" | "md";
  title?: string;
}) {
  if (!value) {
    return (
      <span className={cn("font-mono text-xs text-zinc-600", className)}>
        {label ? `${label} ` : ""}—
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => void copyText(value, label ? `${label} copied` : "Hash copied")}
      title={title ?? value}
      aria-label={`${label ?? "hash"}: copy full value`}
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 rounded-sm border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-left font-mono text-zinc-400 transition-colors hover:border-amber-600/50 hover:text-amber-300",
        size === "sm" ? "text-[10px]" : "text-xs",
        className,
      )}
    >
      {label ? <span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-zinc-600">{label}</span> : null}
      <span className="truncate">{truncateMiddle(value, head, tail)}</span>
      <Copy className="size-3 shrink-0 text-zinc-600 group-hover:text-amber-500" aria-hidden="true" />
    </button>
  );
}

/** Full-width mono hash that wraps — for the 8-hash receipt grid. */
export function FullHash({
  value,
  label,
  className,
}: {
  value: string | null | undefined;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => value && void copyText(value, `${label} copied`)}
      title={value ?? "—"}
      aria-label={`${label}: copy full hash`}
      className={cn(
        "group flex w-full flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-950/60 p-3 text-left transition-colors hover:border-amber-600/50",
        className,
      )}
    >
      <span className="flex items-center justify-between gap-2 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
        <Copy className="size-3 text-zinc-700 group-hover:text-amber-500" aria-hidden="true" />
      </span>
      <span className="break-all font-mono text-[10px] leading-relaxed text-amber-200/80 group-hover:text-amber-200">
        {value ?? "—"}
      </span>
    </button>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "amber",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const valueTone: Record<Tone, string> = {
    emerald: "text-emerald-300",
    red: "text-red-300",
    amber: "text-amber-300",
    zinc: "text-zinc-200",
  };
  return (
    <div className={cn("rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-3", className)}>
      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">{label}</div>
      <div className={cn("mt-1.5 font-mono text-xl leading-none", valueTone[tone])}>{value}</div>
      {sub ? <div className="mt-1.5 text-[11px] leading-tight text-zinc-500">{sub}</div> : null}
    </div>
  );
}

export function PassFailChip({ pass }: { pass: boolean }) {
  return pass ? (
    <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-400">
      <Check className="size-3" aria-hidden="true" />
      pass
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-sm border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-red-400">
      <X className="size-3" aria-hidden="true" />
      fail
    </span>
  );
}

/**
 * Section shell — semantic <section> with anchor id, kicker, title,
 * and a subtle framer-motion reveal.
 */
export function Section({
  id,
  kicker,
  title,
  description,
  children,
  className,
}: {
  id: string;
  kicker: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn("scroll-mt-24 border-t border-zinc-800/70 pt-10 sm:pt-14", className)}
      aria-labelledby={`${id}-title`}
    >
      <header className="mb-6 sm:mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-500/90">{kicker}</div>
        <h2
          id={`${id}-title`}
          className="mt-2 text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">{description}</p>
        ) : null}
      </header>
      {children}
    </motion.section>
  );
}

/** Section copy-quoted line (amber hairline). */
export function LawLine({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <blockquote
      className={cn(
        "border-l-2 border-amber-500/60 pl-4 text-sm italic leading-relaxed text-zinc-300",
        className,
      )}
    >
      {children}
    </blockquote>
  );
}

export function FeedEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-zinc-800 font-mono text-xs text-zinc-600">
      {children}
    </div>
  );
}
