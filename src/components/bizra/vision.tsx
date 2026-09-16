"use client";

/**
 * BIZRA — The Vision. What the engine is for.
 *
 * The founder's three-year arc, carried onto the public face: three pillars
 * of study (ideology · AI · blockchain) fused into a new category — a shared
 * digital space where every human is a node, every contribution flows into
 * one Universal Resource Pool, and tokens are minted only from verified
 * impact, never from speculation.
 *
 * The grammar of this page is law here: what is live is labeled live and
 * measured from the running Node0; what is vision is labeled vision and
 * drawn dashed. Nothing is a promise.
 */

import { SeedMark } from "./seed-mark";
import { Reveal, LiveDot, TruthChip } from "./shared";
import { classifyRuntime } from "./runtime-status";
import type { Node0State } from "@/components/node0/types";

/* ------------------------------------------------------------------ */
/* The three pillars — three years of study, each with its live organ   */
/* ------------------------------------------------------------------ */

interface Pillar {
  tag: string;
  title: string;
  body: string;
  /** Live measurement line, resolved from state — honest when unreachable. */
  live: (s: Node0State | null) => string;
  /** Honest amber footnote — what is NOT yet live in this pillar. */
  sealed: string;
}

const PILLARS: Pillar[] = [
  {
    tag: "Pillar I · BIZRA Ideology",
    title: "The study of the human.",
    body: "Meaning, need, and existence — ethics before engineering, and a non-profit soul, because people are the purpose, not the margin. From this root came the Law of Assumption and the no-riba economy.",
    live: (s) =>
      s && s.ok
        ? `assumption gate — ${s.traces.stats.total} traces judged · ${s.traces.stats.inadmissible} forgery refused`
        : "engine silent",
    sealed: "society layer — not live",
  },
  {
    tag: "Pillar II · BIZRA AI",
    title: "The machine that speaks our language.",
    body: "From prompt engineering to context engineering, from language models to the pattern that makes them safe to live with: a private team proposes, a deterministic court verifies, a constitution decides.",
    live: (s) =>
      s && s.ok
        ? `PAT live model — ${s.pat.model_calls} bounded calls · SAT deterministic`
        : "engine silent",
    sealed: "swarm scale — not live",
  },
  {
    tag: "Pillar III · BIZRA Blockchain",
    title: "Trust between strangers.",
    body: "Smart contracts, chain architectures, and the deep difference between decentralized and distributed — how strangers who share nothing else can still hold one shared truth.",
    live: (s) =>
      s && s.ok
        ? `local receipt chain — ${s.chain.len} sealed · walk ${s.chain.ok ? "verified" : "BROKEN"}`
        : "engine silent",
    sealed: "the node network — sealed door",
  },
];

/* ------------------------------------------------------------------ */
/* The scale ladder — the only honest log-scale in the market          */
/* ------------------------------------------------------------------ */

interface Rung {
  scale: string;
  label: string;
  width: string;
  measured: boolean;
  caption: string;
}

const RUNGS: Rung[] = [
  {
    scale: "10⁰",
    label: "one node",
    width: "7%",
    measured: true,
    caption: "the only bar that is real",
  },
  {
    scale: "10³",
    label: "one thousand nodes",
    width: "36%",
    measured: false,
    caption: "every node shares a part of its power and its data",
  },
  {
    scale: "10⁶",
    label: "one million nodes",
    width: "68%",
    measured: false,
    caption: "the pool compounds — performance, quality, honest reward",
  },
  {
    scale: "10⁹",
    label: "one billion nodes",
    width: "100%",
    measured: false,
    caption: "the universal pool at full breath — declared, not claimed",
  },
];

/** The pool ornament — twelve nodes, one center, every line flows inward. */
function PoolMark() {
  const dots: Array<[number, number]> = [
    [104, 60], [98, 82], [82, 98], [60, 104], [38, 98], [22, 82],
    [16, 60], [22, 38], [38, 22], [60, 16], [82, 22], [98, 38],
  ];
  return (
    <svg
      viewBox="0 0 120 120"
      width={128}
      height={128}
      aria-hidden="true"
      className="pointer-events-none mx-auto"
    >
      {dots.map(([x, y], i) => (
        <line
          key={i}
          x1={x}
          y1={y}
          x2={60}
          y2={60}
          stroke="rgba(201,169,98,0.22)"
          strokeWidth={0.6}
        />
      ))}
      {dots.map(([x, y], i) => (
        <circle key={`d${i}`} cx={x} cy={y} r={2.4} fill="rgba(201,169,98,0.65)" />
      ))}
      <circle
        cx={60}
        cy={60}
        r={5}
        fill="#c9a962"
        style={{ animation: "bz-glow-pulse 3s ease-in-out infinite" }}
      />
    </svg>
  );
}

export function Vision({ state, error }: { state: Node0State | null; error: string | null }) {
  const kind = classifyRuntime(state?.runtime, error == null);
  const live = kind === "LIVE";
  const reference = kind === "REFERENCE";
  const observedState = live || reference ? state : null;
  const organPrefix = reference ? "measured organ (reference)" : live ? "live organ" : "runtime organ unavailable";
  const chainLen = state?.chain.len;

  return (
    <section
      id="vision"
      aria-label="The Vision — what the engine is for: three pillars, one pool, impact-only reward"
      className="relative w-full overflow-hidden border-t border-white/5 bg-navy-900 px-6 py-24 sm:px-8 sm:py-32"
    >
      {/* The horizon glow — the light the section points toward */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[26rem]"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 100%, rgba(201,169,98,0.07), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl">
        {/* ---------------------------------------------------------- */}
        {/* Header                                                      */}
        {/* ---------------------------------------------------------- */}
        <div className="text-center">
          <Reveal>
            <p className="bz-kicker mb-5">The Vision</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mx-auto max-w-3xl font-serif text-4xl font-semibold leading-[1.15] tracking-tight text-cream sm:text-5xl">
              One node is a proof. A billion is a world.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-2xl text-base font-light leading-relaxed text-cream/55">
              {reference
                ? "The measurements above come from one sealed reference archive; they do not establish an active node."
                : live
                  ? "Everything above is measured on one machine, today."
                  : "Current runtime measurements are unavailable, so no active-node claim is made."}{" "}
              The design is larger: a shared digital space where every human is a node —
              sharing power, data, and ideas into one universal pool — where
              reward is minted only from verified impact. What is live is
              labeled live. What is vision is labeled vision. Nothing here is
              a promise.
            </p>
          </Reveal>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* The three pillars                                           */}
        {/* ---------------------------------------------------------- */}
        <Reveal delay={0.12}>
          <div
            className="mt-12 grid gap-6 sm:mt-16 md:grid-cols-3"
            role="list"
            aria-label="The three pillars of study"
          >
            {PILLARS.map((p, i) => (
              <article
                key={p.tag}
                role="listitem"
                className="bz-glass flex h-full min-w-0 flex-col rounded-xl p-7 transition-colors duration-500 hover:border-gold-500/25"
              >
                <p className="font-mono text-[0.66rem] tracking-[0.2em] text-gold-500/80 uppercase">
                  {p.tag}
                </p>
                <h3 className="mt-4 font-serif text-2xl leading-tight text-cream">
                  {p.title}
                </h3>
                <p className="mt-3 text-[0.88rem] font-light leading-[1.7] text-cream/55">
                  {p.body}
                </p>
                <div className="mt-auto border-t border-white/5 pt-4">
                  <p
                    className={`font-mono text-[0.66rem] leading-relaxed tracking-[0.08em] break-words ${
                      live ? "text-verdant/85" : reference ? "text-gold-500/80" : "text-solar/70"
                    }`}
                  >
                    <span className="whitespace-nowrap">▸ {organPrefix}</span>
                    <span aria-hidden="true"> · </span>
                    {observedState ? p.live(observedState) : reference ? "reference-only · no live call" : "engine silent"}
                  </p>
                  <p className="mt-1.5 font-mono text-[0.6rem] tracking-[0.14em] text-cream/35 uppercase">
                    {p.sealed} · declared 3 years of study
                  </p>
                </div>
              </article>
            ))}
          </div>
        </Reveal>

        {/* The three-years lesson — verbatim from the sealed Root */}
        <Reveal delay={0.16}>
          <figure className="mx-auto mt-10 max-w-3xl text-center sm:mt-12">
            <blockquote>
              <p
                className="font-arabic text-xl leading-[1.9] text-gold-500/75 sm:text-2xl"
                dir="rtl"
                lang="ar"
              >
                كلما ازددت علمًا، ازددت يقينًا بجهلي
              </p>
              <p className="mt-4 font-serif text-lg italic leading-[1.6] text-cream/80 sm:text-xl">
                The more I learn, the more certain I become of my ignorance.
              </p>
            </blockquote>
            <figcaption className="mt-3 font-mono text-[0.62rem] tracking-[0.18em] text-cream/35 uppercase">
              the founder&apos;s lesson of three years · sealed in the Root ·
              Third Fact §VI
            </figcaption>
          </figure>
        </Reveal>

        {/* ---------------------------------------------------------- */}
        {/* The fusion — three roots feed one seed                      */}
        {/* ---------------------------------------------------------- */}
        <Reveal delay={0.1}>
          <div className="mx-auto mt-16 max-w-4xl sm:mt-20">
            <div className="flex flex-col items-center">
              <div className="flex flex-wrap items-center justify-center gap-3">
                {["ideology", "artificial intelligence", "blockchain"].map(
                  (w) => (
                    <span
                      key={w}
                      className="rounded-full border border-gold-500/30 px-4 py-1.5 font-mono text-[0.68rem] tracking-[0.18em] text-gold-500/90 uppercase"
                    >
                      {w}
                    </span>
                  ),
                )}
              </div>
              <svg
                viewBox="0 0 300 56"
                className="mt-2 h-14 w-full max-w-[16rem]"
                aria-hidden="true"
              >
                <path d="M40 0 C60 34, 120 52, 150 56" fill="none" stroke="rgba(201,169,98,0.4)" strokeWidth="1" />
                <path d="M150 0 L150 56" fill="none" stroke="rgba(201,169,98,0.4)" strokeWidth="1" />
                <path d="M260 0 C240 34, 180 52, 150 56" fill="none" stroke="rgba(201,169,98,0.4)" strokeWidth="1" />
              </svg>
              <SeedMark size={68} tone="full" label="The seed — where three roots merge" />
              <p className="mt-6 max-w-2xl text-center text-base font-light leading-[1.8] text-cream/60">
                Stand the three on one root and something new appears — a
                category that did not exist before: not a product, not a
                platform, but a{" "}
                <span className="text-gold-300">
                  constitutional space for human impact
                </span>
                . BIZRA does not go to the market to compete with anyone. It
                stands against two enemies —{" "}
                <span className="text-ember/90">blind assumption</span> and{" "}
                <span className="text-ember/90">debt-interest extraction</span> —
                and it fights for all humanity.
              </p>
            </div>
          </div>
        </Reveal>

        {/* ---------------------------------------------------------- */}
        {/* The space and the pool                                      */}
        {/* ---------------------------------------------------------- */}
        <Reveal delay={0.14}>
          <div className="mt-16 grid gap-6 sm:mt-20 lg:grid-cols-5">
            <article className="bz-glass flex h-full min-w-0 flex-col rounded-2xl p-7 sm:p-8 lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[0.7rem] tracking-[0.22em] text-gold-500 uppercase">
                  The Space
                </p>
                <TruthChip label="Designed · not live" tone="solar" />
              </div>
              <h3 className="mt-5 font-serif text-2xl leading-tight text-cream sm:text-[1.75rem]">
                A world, not a platform.
              </h3>
              <p className="mt-4 text-[0.92rem] font-light leading-[1.75] text-cream/60">
                A shared digital space, kin to the worlds of games — entered
                not to escape life, but to return with value. Humans connect
                there; share computing power, data, and ideas; and act
                together on anything that makes real impact. The space exists
                to give every human the chance and the freedom to choose —
                to opt in, to contribute, to build above us.
              </p>
              <p className="mt-auto pt-5 font-mono text-[0.62rem] tracking-[0.16em] text-cream/35 uppercase">
                MMORPG-class shared world · consent before execution
              </p>
            </article>

            <article className="bz-glass flex h-full min-w-0 flex-col rounded-2xl p-7 sm:p-8 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-[0.7rem] tracking-[0.22em] text-gold-500 uppercase">
                  The Universal Pool
                </p>
                <TruthChip label="Designed · not live" tone="solar" />
              </div>
              <div className="mt-3">
                <PoolMark />
              </div>
              <h3 className="mt-2 font-serif text-2xl leading-tight text-cream">
                One pool, from every node.
              </h3>
              <p className="mt-4 text-[0.92rem] font-light leading-[1.75] text-cream/60">
                Every node gives a part of its power and a part of its data.
                All of it flows into the Universal Resource Pool — and the
                pool serves every node back. Performance, quality, and reward
                grow with the giving.
              </p>
            </article>
          </div>
        </Reveal>

        <Reveal delay={0.18}>
          <blockquote className="bz-glass mx-auto mt-6 max-w-4xl rounded-2xl border-l-2 border-l-gold-500 p-7 sm:p-8">
            <p className="font-serif text-xl italic leading-[1.55] text-cream/90 sm:text-[1.45rem]">
              We build the habit, not the actors. Actors may come and go — the
              infrastructure remains. We are the ground; those who build above
              us stand on our shoulders, as we stand on the Root&apos;s.
            </p>
          </blockquote>
        </Reveal>

        {/* ---------------------------------------------------------- */}
        {/* Proof of Impact — the honest money                          */}
        {/* ---------------------------------------------------------- */}
        <Reveal delay={0.14}>
          <div
            className="bz-glass mx-auto mt-16 max-w-5xl rounded-2xl p-6 sm:mt-20 sm:p-8"
            aria-label="Proof of Impact — the honest money"
          >
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[0.7rem] tracking-[0.24em] text-gold-500 uppercase">
                Proof of Impact — the honest money
              </p>
              <p className="font-mono text-[0.62rem] tracking-[0.14em] text-cream/35 uppercase">
                minted from work, never from hope
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="min-w-0">
                <h4 className="font-serif text-lg text-cream">
                  No use — no reward.
                </h4>
                <p className="mt-2.5 text-[0.84rem] font-light leading-[1.7] text-cream/55">
                  Tokens are issued only after impact is measured, verified,
                  and sealed — real behavior, evaluated by deterministic
                  rules. No pre-mine privilege, no speculation, no sale
                  before service.
                </p>
              </div>
              <div className="min-w-0">
                <h4 className="font-serif text-lg text-cream">
                  No privilege — not even the founder&apos;s.
                </h4>
                <p className="mt-2.5 text-[0.84rem] font-light leading-[1.7] text-cream/55">
                  Three years of daily building — and not one token taken.
                  When minting begins, this work is evaluated under the same
                  rules that bind every node: same gates, same court, same
                  receipts.
                </p>
              </div>
              <div className="min-w-0 rounded-xl border border-verdant/20 bg-verdant/[0.04] p-5">
                <h4 className="font-serif text-lg text-cream">
                  The pattern runs today.
                </h4>
                <p className="mt-2.5 text-[0.84rem] font-light leading-[1.7] text-cream/55">
                  {live
                    ? `At Node0 scale, every effect is already hashed, verified, and sealed — ${state?.signals.missions_sealed ?? 0} mission sealed, ${state?.signals.refusal_events ?? 0} honest refusals recorded.`
                    : "The runtime is silent — when it returns, its receipts speak here."}
                </p>
                <a
                  href="#proof"
                  className="bz-focus mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-verdant/30 px-4 py-2 font-mono text-[0.66rem] tracking-[0.18em] text-verdant uppercase transition-colors hover:border-verdant/60"
                >
                  <LiveDot />
                  see the receipts
                </a>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-6">
              <div className="flex flex-wrap items-center gap-2.5">
                <TruthChip label="Token mint — sealed door" tone="solar" />
                <span className="font-mono text-[0.62rem] tracking-[0.14em] text-cream/35 uppercase">
                  not live · not sold · not promised
                </span>
              </div>
              <p className="font-mono text-[0.62rem] tracking-[0.14em] text-cream/35 uppercase">
                when it opens, it opens under the same constitution
              </p>
            </div>
          </div>
        </Reveal>

        {/* ---------------------------------------------------------- */}
        {/* The scale horizon — measured vs declared                    */}
        {/* ---------------------------------------------------------- */}
        <Reveal delay={0.14}>
          <div
            className="bz-glass mx-auto mt-16 max-w-5xl rounded-2xl p-6 sm:mt-20 sm:p-8"
            aria-label="The scale horizon — measured versus declared"
          >
            <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-mono text-[0.7rem] tracking-[0.24em] text-gold-500 uppercase">
                The scale horizon
              </p>
              <p className="font-mono text-[0.62rem] tracking-[0.14em] text-cream/35 uppercase">
                log scale · honest labels
              </p>
            </div>

            <ol role="list" className="space-y-6">
              {RUNGS.map((r) => (
                <li key={r.scale} role="listitem">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
                    <p className="font-mono text-sm text-cream/85">
                      {r.scale}
                      <span className="ml-2 text-cream/40">{r.label}</span>
                    </p>
                    {r.measured ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-verdant/40 px-3 py-1 font-mono text-[0.66rem] tracking-[0.18em] text-verdant uppercase">
                        <LiveDot />
                        measured · live now
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-gold-500/30 px-3 py-1 font-mono text-[0.66rem] tracking-[0.18em] text-gold-500/80 uppercase">
                        declared · vision
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    {r.measured ? (
                      <div
                        className="h-full rounded-full bg-verdant shadow-[0_0_14px_rgba(52,211,153,0.5)]"
                        style={{ width: r.width }}
                      />
                    ) : (
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: r.width,
                          backgroundImage:
                            "repeating-linear-gradient(90deg, rgba(201,169,98,0.55) 0 10px, transparent 10px 18px)",
                        }}
                      />
                    )}
                  </div>
                  <p
                    className={`mt-2 font-mono text-[0.66rem] tracking-[0.08em] break-words ${
                      r.measured
                        ? live
                          ? "text-verdant/80"
                          : "text-solar/70"
                        : "text-cream/35"
                    }`}
                  >
                    {r.measured
                      ? live
                        ? `▸ ${chainLen ?? "?"} receipts · 1 human node · ${state?.runtime.tz ?? "—"} · ${r.caption}`
                        : reference
                          ? `▸ reference-only · no live call · ${r.caption}`
                          : `▸ engine silent · ${r.caption}`
                      : r.caption}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-7 border-t border-white/5 pt-6">
              <p className="text-center text-[0.84rem] font-light leading-relaxed text-cream/50">
                Only the first bar is measured. The dashed bars are vision —
                drawn hollow because they are not built. BIZRA&apos;s strength
                is a scale strength: one node performs, proven above; a
                billion sharing into one pool is the horizon we build toward.
                When they become real, they will be measured here — or this
                page will say why not.
              </p>
            </div>
          </div>
        </Reveal>

        {/* ---------------------------------------------------------- */}
        {/* Closing — the human lines                                   */}
        {/* ---------------------------------------------------------- */}
        <Reveal delay={0.18}>
          <p className="mx-auto mt-16 max-w-3xl text-center font-serif text-[1.6rem] leading-[1.45] italic text-cream sm:mt-20 sm:text-[2rem]">
            Imagine what every child could hold
            <br />
            if this is built in the right way.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <p className="mx-auto mt-5 max-w-xl text-center text-sm font-light leading-[1.8] text-cream/50">
            Every mother, every father, every dreamer, every seeker. For a
            long time, a few have held the whole — this is the generation
            where that changes, and what we build now is what gets written.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <p className="mt-7 text-center font-mono text-[0.64rem] tracking-[0.18em] text-cream/30 uppercase">
            we do not claim to be right · we claim the right to try, and to
            prove it · at the very least, we will not repeat the past mistakes
          </p>
        </Reveal>
      </div>
    </section>
  );
}
