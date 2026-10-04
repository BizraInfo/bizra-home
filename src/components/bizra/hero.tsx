"use client";

/**
 * BIZRA — the hero. The first impact.
 *
 * The Seed of Life draws itself in gold, the wordmark rises beneath it,
 * and beneath that: not a marketing promise — a live status line read
 * from the real Node0 runtime. If the runtime is silent, we say so.
 */

import { SeedMark } from "./seed-mark";
import { LiveDot, TruthChip } from "./status-ui";
import { truncHash } from "./format";
import { classifyRuntime, runtimeLabel, runtimeDotTone, NODE0_ACTIVE_FALSE_LABEL, classifyModel, modelLabel } from "./runtime-status";
import type { Node0State } from "@/components/node0/types";

export function Hero({ state, error }: { state: Node0State | null; error: string | null }) {
  const reachable = state != null && !error;
  const kind = classifyRuntime(state?.runtime, error == null, error);
  const live = kind === "LIVE";
  const reference = kind === "REFERENCE";
  const dotTone = runtimeDotTone(kind);
  const chainLen = state?.chain?.len;
  const chainOk = state?.chain?.ok;
  const rootHash = state?.constitution?.root_hash;
  // LOCAL-MODEL-PROVIDER-1A §15: the truthful local-model line. READY renders
  // only from the runtime's verified observation — never from configuration.
  const modelKind = classifyModel(state?.model);
  const modelLine = modelLabel(modelKind, state?.model);
  const publicRuntimeLabel = live
    ? "Measured · local Node0"
    : reference
      ? "Reference-only"
      : kind === "HALTED"
        ? "Blocked"
        : kind === "MISMATCH"
          ? "Unknown · contract mismatch"
        : "Unknown";
  const publicRuntimeTone = live
    ? "verdant"
    : reference
      ? "gold"
      : kind === "HALTED"
        ? "ember"
        : "solar";

  return (
    <section
      id="top"
      aria-label="BIZRA — the seed of sovereign intelligence"
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16"
    >
      {/* The breathing dawn behind the seed */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[42%] left-1/2 size-[min(92vw,900px)] -translate-x-1/2 -translate-y-1/2"
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(201,169,98,.14), rgba(201,169,98,.04) 45%, transparent 70%)",
            animation: "bz-breathe 7s ease-in-out infinite",
          }}
        />
      </div>
      {/* The slow orbit — one satellite keeps watch */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[42%] left-1/2 size-[min(78vw,620px)] -translate-x-1/2 -translate-y-1/2"
      >
        <div className="absolute inset-0" style={{ animation: "bz-orbit 90s linear infinite" }}>
          <div className="absolute inset-0 rounded-full border border-dashed border-gold-500/[0.14]" />
          <div className="absolute top-0 left-1/2 ml-[-3px] size-1.5 rounded-full bg-gold-500 shadow-[0_0_12px_rgba(201,169,98,.9)]" />
          <div className="absolute top-1/2 left-0 mt-[-2px] size-1 rounded-full bg-gold-500/60" />
        </div>
      </div>

      <div className="bz-rise relative" style={{ animationDelay: "0.1s" }}>
        <SeedMark size={260} animated label="The BIZRA Seed of Life mark — seven circles in sacred geometry, blooming in gold" className="!size-[min(64vw,260px)] sm:!size-[300px]" />
      </div>

      <h1
        className="bz-gold-text bz-rise mt-8 text-[3.4rem] font-semibold tracking-[0.24em] sm:mt-10 sm:text-8xl"
        style={{
          animationDelay: "0.15s",
          fontFamily: "Georgia, 'Times New Roman', Times, serif",
        }}
      >
        BIZRA
      </h1>

      <p
        className="bz-rise mt-4 font-arabic text-2xl text-gold-500/70 sm:text-3xl"
        style={{ animationDelay: "0.35s" }}
        lang="ar"
      >
        البذرة
      </p>

      <p
        className="bz-rise mt-6 max-w-3xl text-center font-serif text-xl italic text-cream/85 sm:mt-7 sm:text-[1.7rem]"
        style={{ animationDelay: "0.45s" }}
      >
        The Seed of Sovereign Intelligence
      </p>

      <p
        className="bz-rise mt-4 max-w-xl text-center text-[0.95rem] font-light leading-[1.75] text-cream/55 sm:text-base"
        style={{ animationDelay: "0.55s" }}
      >
        Local-first intelligence that turns human intent into consented, verifiable action.
        Explore the measured reference archive, then enter Dema when invited.
      </p>

      {/* The live heartbeat — real data or honest silence, never invention */}
      <div
        className="bz-rise mt-9 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-[0.68rem] tracking-[0.16em] uppercase sm:gap-x-4"
        style={{ animationDelay: "0.65s" }}
        role="status"
        aria-live="off"
      >
        {reachable && kind !== "READING" ? (
          <>
            <span
              className={`inline-flex items-center gap-2.5 ${
                live ? "text-verdant" : reference ? "text-gold-400" : "text-cream/70"
              }`}
            >
              <LiveDot tone={dotTone} />
              {runtimeLabel(kind)}
            </span>
            <span className="text-cream/25" aria-hidden="true">·</span>
            <span className="text-cream/60">
              {chainLen != null ? `${chainLen} RECEIPTS` : "RECEIPTS —"}{" "}
              <span className={chainOk ? "text-verdant/80" : "text-ember"}>
                {chainOk ? "VERIFIED" : "BROKEN"}
              </span>
            </span>
            {reference ? (
              <>
                <span className="text-cream/25" aria-hidden="true">·</span>
                <span className="text-cream/50">{NODE0_ACTIVE_FALSE_LABEL}</span>
              </>
            ) : null}
            {reachable && modelLine ? (
              <>
                <span className="text-cream/25" aria-hidden="true">·</span>
                <span className="text-cream/40">LOCAL MODEL</span>
                <span className={modelKind === "READY" ? "text-verdant/80" : "text-cream/50"}>{modelLine}</span>
              </>
            ) : null}
            <span className="text-cream/25" aria-hidden="true">·</span>
            <span className="text-gold-500/80">ROOT {truncHash(rootHash, 10)}</span>
            <span className="text-cream/25" aria-hidden="true">·</span>
            <span className="text-cream/40">GST · ASIA/DUBAI</span>
          </>
        ) : (
          <span className="inline-flex items-center gap-2.5 text-solar">
            <LiveDot tone="solar" />
            {runtimeLabel(kind)}
          </span>
        )}
      </div>

      <div
        className="bz-rise mt-6 flex flex-wrap items-center justify-center gap-2"
        style={{ animationDelay: "0.75s" }}
        aria-label="Current public state"
      >
        <TruthChip label={publicRuntimeLabel} tone={publicRuntimeTone} />
        <TruthChip label="Dema · invitation" tone="solar" />
        <TruthChip label="Federation · designed not live" tone="neutral" />
      </div>

      <div
        className="bz-rise mt-10 flex flex-col items-center gap-4 sm:flex-row sm:gap-5"
        style={{ animationDelay: "0.85s" }}
      >
        <a href="#proof" className="bz-btn-gold bz-focus">
          Explore measured proof
        </a>
        <a
          href="/invite?next=/onboarding"
          className="bz-btn-ghost bz-focus"
        >
          Enter Dema · invitation
        </a>
      </div>

      <p
        aria-hidden="true"
        className="bz-glow-pulse absolute bottom-7 left-1/2 -translate-x-1/2 font-mono text-[0.66rem] tracking-[0.35em] text-cream/30 uppercase"
      >
        Scroll — the seed opens
      </p>
    </section>
  );
}
