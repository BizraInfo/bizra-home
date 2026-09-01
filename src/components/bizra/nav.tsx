"use client";

/**
 * BIZRA — the fixed masthead of the public face.
 * Left: the Seed mark and the wordmark. Right: the live heartbeat.
 * The nav is quiet — the work speaks, not the chrome.
 */

import { Github } from "lucide-react";
import { SeedMark } from "./seed-mark";
import { LiveDot } from "./shared";
import { classifyRuntime, runtimeBadge, runtimeDotTone } from "./runtime-status";
import type { Node0State } from "@/components/node0/types";

const LINKS = [
  { href: "#origin", label: "Origin" },
  { href: "#fracture", label: "Fracture" },
  { href: "#loop", label: "Loop" },
  { href: "#proof", label: "Proof" },
  { href: "#vision", label: "Vision" },
  { href: "#law", label: "Law" },
  { href: "#forest", label: "Forest" },
];

export function Nav({ state, error }: { state: Node0State | null; error: string | null }) {
  const reachable = state != null && !error;
  const kind = classifyRuntime(state?.runtime, reachable);
  const live = kind === "LIVE";
  const reference = kind === "REFERENCE";
  const halted = kind === "HALTED";
  const chainLen = state?.chain?.len;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy-900/95 via-navy-900/70 to-transparent"
      />
      <nav
        aria-label="Primary"
        className="relative mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:h-[4.5rem] sm:px-8"
      >
        <a
          href="#top"
          className="bz-focus group flex items-center gap-3 py-2"
          aria-label="BIZRA — back to the top"
        >
          <SeedMark size={34} tone="full" className="transition-transform duration-500 group-hover:rotate-[60deg]" />
          <span className="font-serif text-lg font-semibold tracking-[0.28em] text-cream">
            BIZRA
          </span>
          <span className="hidden font-arabic text-sm text-gold-500/70 sm:inline" aria-hidden="true">
            البذرة
          </span>
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="bz-focus inline-flex min-h-11 items-center px-3.5 text-[0.72rem] font-medium tracking-[0.22em] text-cream/55 uppercase transition-colors duration-300 hover:text-gold-300"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          {live || reference ? (
            <a
              href="#proof"
              className={`bz-focus inline-flex min-h-11 items-center gap-2.5 rounded-full border bg-navy-900/60 px-4 py-2 font-mono text-[0.6875rem] tracking-[0.18em] text-cream/85 uppercase backdrop-blur transition-colors ${
                live ? "border-verdant/30 hover:border-verdant/60" : "border-gold-500/30 hover:border-gold-500/60"
              }`}
              aria-label={
                live
                  ? `Node0 is live — chain of ${chainLen ?? "?"} receipts verified. Jump to proof.`
                  : `Reference archive online — ${chainLen ?? "?"} receipts verified, Node0 not active (read-only presentation). Jump to proof.`
              }
            >
              <LiveDot tone={runtimeDotTone(kind)} />
              <span className={`hidden sm:inline ${live ? "text-verdant" : "text-gold-400"}`}>{runtimeBadge(kind)}</span>
              <span className="text-cream/40" aria-hidden="true">·</span>
              <span>{chainLen != null ? `${chainLen} RCPT` : "NODE0"}</span>
            </a>
          ) : halted ? (
            <a
              href="#proof"
              className="bz-focus inline-flex min-h-11 items-center gap-2.5 rounded-full border border-ember/40 bg-navy-900/60 px-4 py-2 font-mono text-[0.6875rem] tracking-[0.18em] text-ember uppercase backdrop-blur"
            >
              <LiveDot tone="ember" />
              <span className="hidden sm:inline">HALTED</span>
            </a>
          ) : (
            <a
              href="#proof"
              className="bz-focus inline-flex min-h-11 items-center gap-2.5 rounded-full border border-solar/30 bg-navy-900/60 px-4 py-2 font-mono text-[0.6875rem] tracking-[0.18em] text-solar uppercase backdrop-blur"
              aria-label="Runtime signal lost — retrying honestly"
            >
              <LiveDot tone="solar" />
              <span className="hidden sm:inline">SIGNAL LOST</span>
            </a>
          )}
          <a
            href="https://github.com/BizraInfo"
            target="_blank"
            rel="noopener noreferrer"
            className="bz-focus inline-flex size-11 items-center justify-center rounded-full border border-gold-500/25 text-gold-500 transition-colors hover:border-gold-500/60 hover:text-gold-300"
            aria-label="BIZRA on GitHub — the public repositories"
          >
            <Github className="size-[1.1rem]" aria-hidden="true" />
          </a>
        </div>
      </nav>
    </header>
  );
}
