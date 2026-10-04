"use client";

/**
 * BIZRA — The Forest.
 *
 * Every human a node. Every node a seed. Every seed a forest.
 * Growth without a master — seed by seed, root by root.
 */

import { LiveDot, Reveal } from "./shared";
import { classifyRuntime, runtimeDotTone } from "./runtime-status";
import type { Node0State } from "@/components/node0/types";

export function Forest({ state, error }: { state: Node0State | null; error: string | null }) {
  const kind = classifyRuntime(state?.runtime, error == null, error);
  const nodeLabel = kind === "LIVE"
    ? "Node0 — live today"
    : kind === "REFERENCE"
      ? "Node0 — reference archive online"
      : kind === "MISMATCH"
        ? "Node0 — runtime contract mismatch"
      : "Node0 — runtime status not yet observed";
  return (
    <section
      id="forest"
      aria-label="The Forest — every human a node, every node a seed"
      className="relative w-full overflow-hidden border-t border-white/5 bg-navy-800 px-6 py-24 sm:px-8 sm:py-32"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 size-[min(96vw,1000px)] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(201,169,98,.07), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="bz-kicker mb-5">The Forest</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="font-serif text-[2.35rem] font-semibold leading-[1.28] tracking-tight text-cream sm:text-5xl">
            Every human a node.
            <br />
            Every node a seed.
            <br />
            Every seed a forest.
          </h2>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mt-9 font-arabic text-2xl leading-[1.8] text-gold-500/75 sm:text-[1.75rem]" lang="ar">
            شجرة طيبة أصلها ثابت وفرعها في السماء
          </p>
          <p className="mt-2.5 font-serif text-[0.95rem] italic text-cream/45 sm:text-base">
            A good tree — its root firm, its branches in the sky.
          </p>
        </Reveal>

        <Reveal delay={0.22}>
          <p className="mx-auto mt-9 max-w-xl text-base font-light leading-[1.85] text-cream/60">
            Each node that joins brings its own human, its own private agents, five new
            verifiers for the shared world, and its own compute, knowledge, and proof.
            The system grows the way a forest grows — seed by seed, root by root,
            without a master, without extracting the very people it serves.
          </p>
        </Reveal>

        <Reveal delay={0.28}>
          <div className="mt-11 inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-full border border-white/[0.12] px-5 py-3 font-mono text-[0.66rem] tracking-[0.16em] uppercase">
            <span className="inline-flex items-center gap-2 text-cream/75">
              <LiveDot tone={runtimeDotTone(kind)} />
              {nodeLabel}
            </span>
            <span className="text-cream/25" aria-hidden="true">·</span>
            <span className="text-cream/45">Federation — designed, not yet live</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
