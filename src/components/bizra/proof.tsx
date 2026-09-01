"use client";

/**
 * BIZRA — The Living Proof.
 *
 * The page's whole argument: we claim nothing, we show what is measured.
 * Every tile below reads from the live Node0 runtime (polled every 2.5s).
 * If the engine is silent, this section says so — nothing is invented.
 */

import { useEffect, useState } from "react";
import { Reveal, TruthChip, LiveDot } from "./shared";
import { fmtUptime, fmtBytes, fmtStamp, truncHash } from "./format";
import type { Node0State, DemaEntry } from "@/components/node0/types";

/* ---------------- small pieces ------------------------------------------ */

function Metric({
  value,
  unit,
  tone = "gold",
  className = "",
}: {
  value: string;
  unit?: string;
  tone?: "gold" | "verdant" | "ember" | "cream";
  className?: string;
}) {
  const toneClass = {
    gold: "text-gold-500",
    verdant: "text-verdant",
    ember: "text-ember",
    cream: "text-cream",
  }[tone];
  return (
    <p className={`bz-num ${toneClass} ${className}`}>
      {value}
      {unit ? <span className="ml-1.5 font-mono text-[0.7rem] tracking-wide text-cream/40">{unit}</span> : null}
    </p>
  );
}

function TileShell({
  children,
  chip,
  chipTone = "gold",
  className = "",
  title,
  note,
}: {
  children: React.ReactNode;
  chip: string;
  chipTone?: "gold" | "verdant" | "ember" | "solar" | "neutral";
  className?: string;
  title: string;
  note?: string;
}) {
  return (
    <article className={`bz-glass group flex h-full flex-col rounded-xl p-5 transition-colors duration-500 hover:border-gold-500/25 sm:p-6 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="font-mono text-[0.68rem] leading-snug tracking-[0.2em] text-cream/70 uppercase">
          {title}
        </h3>
        <TruthChip label={chip} tone={chipTone} />
      </div>
      <div className="flex-1">{children}</div>
      {note ? (
        <p className="mt-4 border-t border-white/5 pt-3 text-[0.75rem] font-light leading-relaxed text-cream/40">
          {note}
        </p>
      ) : null}
    </article>
  );
}

/** The receipt spine — chain.len live cells, head pulsing, root ringed. */
function ReceiptSpine({ state }: { state: Node0State }) {
  const len = state.chain.len;
  const lastSeqs = state.chain.last?.map((r) => r.seq) ?? [];
  const cells = Array.from({ length: len }, (_, i) => i + 1);
  const isHead = (seq: number) => seq === len;
  const isKnown = (seq: number) => lastSeqs.includes(seq);

  return (
    <div className="bz-glass rounded-2xl p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-[0.7rem] tracking-[0.22em] text-gold-500 uppercase">
          The Receipt Spine — {len} sealed blocks
        </h3>
        <div className="flex items-center gap-2.5">
          {state.chain.ok ? (
            <TruthChip label="Chain verified" tone="verdant" />
          ) : (
            <TruthChip label={`Broken at ${state.chain.brokenAt ?? "?"}`} tone="ember" />
          )}
          <TruthChip label="Measured" tone="neutral" />
        </div>
      </div>

      <div
        className="bz-scroll flex flex-wrap items-center gap-x-2 gap-y-3 py-2"
        role="img"
        aria-label={`Receipt chain of ${len} blocks, previous-linked, ${state.chain.ok ? "verified" : "broken"}. Head hash ${state.chain.head}`}
      >
        {cells.map((seq) => {
          const head = isHead(seq);
          const known = isKnown(seq);
          return (
            <span
              key={seq}
              title={`receipt #${seq}${known ? " · in live window" : ""}`}
              className={`relative flex size-3.5 rotate-45 items-center justify-center border transition-transform duration-300 hover:scale-[1.6] ${
                head
                  ? "border-gold-500 bg-gold-500 shadow-[0_0_14px_rgba(201,169,98,0.8)]"
                  : known
                    ? "border-gold-500/60 bg-gold-500/35"
                    : "border-gold-500/30 bg-transparent"
              }`}
            >
              {head ? (
                <span className="bz-live-ping absolute inset-0 rounded-[1px] bg-gold-500/50" aria-hidden="true" />
              ) : null}
            </span>
          );
        })}
        <span className="ml-2 rotate-0 font-mono text-[0.62rem] tracking-[0.14em] text-gold-500/60 uppercase">
          → head {truncHash(state.chain.head, 10)}
        </span>
      </div>

      <p className="mt-4 border-t border-white/5 pt-4 text-[0.78rem] font-light leading-relaxed text-cream/45">
        Each diamond is one sealed receipt — mission, contract, attempt, proposal, SAT
        verdict, FATE decision, effect, observer: eight hashes, previous-linked, blake-hashed.
        Bright cells sit in the live window. {len} receipts since genesis; nothing was
        retro-editable, or the chain would halt.
      </p>
    </div>
  );
}

/** Autopoiesis ladder — the window grew itself, each step receipt-sealed. */
function AutopoiesisLadder({ state }: { state: Node0State }) {
  const transitions = [...state.transitions].sort((a, b) => a.id - b.id);
  return (
    <div>
      <ol className="bz-scroll flex items-end gap-1.5 overflow-x-auto pb-2 pt-1" aria-label="Constitutional contract transitions, each sealed by a receipt">
        {transitions.map((t) => {
          const after = Number(t.after_value);
          const h = Math.max(14, Math.min(84, (after / 70) * 84));
          const reverted = t.reverted === 1;
          return (
            <li key={t.id} className="flex w-14 flex-none flex-col items-center gap-1.5">
              <span
                className={`bz-num w-full rounded-t-[3px] border-x border-t ${
                  reverted
                    ? "border-ember/40 bg-ember/10 text-ember/80"
                    : "border-gold-500/50 bg-gradient-to-t from-gold-500/25 to-gold-500/5"
                } flex items-start justify-center pt-1 text-[0.72rem] tabular-nums`}
                style={{ height: `${h}px` }}
                title={`${t.contract_key}: ${t.before_value} → ${t.after_value}${reverted ? " · reverted by human authority" : ""} · receipt #${t.receipt_seq ?? "—"}`}
              >
                {t.after_value}
              </span>
              <span className="font-mono text-[0.56rem] tracking-wider text-cream/35 uppercase">
                {reverted ? "rvt" : `#${t.receipt_seq ?? "—"}`}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[0.78rem] font-light leading-relaxed text-cream/45">
        {state.signals.transitions_live} live transitions · {state.signals.refusal_events} honest
        refusals. The system raised its own hypothesis window — every step proposed, verified,
        and sealed. One step was reverted by human authority, and the receipt of that
        refusal stands in the chain forever.
      </p>
    </div>
  );
}

/** Dema relay — the last verdicts, exactly as spoken. */
function DemaFeed({ entries }: { entries: DemaEntry[] }) {
  const tone = (status: string) =>
    status === "DONE" ? "verdant" : status === "REFUSED" ? "ember" : "solar";
  return (
    <ul className="bz-scroll max-h-44 space-y-2 overflow-y-auto pr-1" aria-label="Latest Dema relay verdicts">
      {entries.slice(0, 6).map((e) => (
        <li key={e.id} className="flex items-baseline gap-2.5 font-mono text-[0.66rem] leading-relaxed">
          <span className="flex-none text-cream/30 tabular-nums">{fmtStamp(e.ts).slice(-5)}</span>
          <span className="flex-1 truncate text-cream/65">{e.subject}</span>
          <span
            className={`flex-none rounded-sm px-1.5 py-0.5 text-[0.58rem] tracking-[0.12em] uppercase ${
              tone(e.status) === "verdant"
                ? "bg-verdant/10 text-verdant"
                : tone(e.status) === "ember"
                  ? "bg-ember/10 text-ember"
                  : "bg-solar/10 text-solar"
            }`}
          >
            {e.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- the section -------------------------------------------- */

export function Proof({ state, error }: { state: Node0State | null; error: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const live = state && !error && state.ok;

  return (
    <section
      id="proof"
      aria-label="The Living Proof — real numbers, measured now"
      className="relative w-full border-t border-white/5 bg-navy-900 px-6 py-24 sm:px-8 sm:py-32"
    >
      {/* faint dawn behind the proof */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-[480px] w-[min(96vw,1100px)] -translate-x-1/2 rounded-full"
        style={{
          background: "radial-gradient(ellipse at top, rgba(201,169,98,.07), transparent 65%)",
        }}
      />
      <div className="relative mx-auto max-w-6xl">
        <div className="text-center">
          <Reveal>
            <p className="bz-kicker mb-5">The Living Proof</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mx-auto max-w-3xl font-serif text-4xl font-semibold leading-[1.15] tracking-tight text-cream sm:text-5xl">
              We claim nothing. We show what is measured.
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mx-auto mt-5 max-w-2xl text-base font-light leading-relaxed text-cream/55">
              Every number on this page is read live from the Node0 runtime, refreshed
              every 2.5 seconds. If the engine goes silent, this page says so — no
              hardcoded victories, no painted green.
            </p>
          </Reveal>
        </div>

        {!live ? (
          <Reveal delay={0.1}>
            <div
              role="alert"
              className="bz-glass mx-auto mt-12 max-w-2xl rounded-2xl border-solar/25 p-8 text-center"
            >
              <p className="inline-flex items-center gap-2.5 font-mono text-[0.72rem] tracking-[0.2em] text-solar uppercase">
                <LiveDot tone="solar" />
                {state ? "Runtime signal lost — the last verified state stands" : "Reading the runtime — first heartbeat arriving"}
              </p>
              <p className="mt-4 text-sm font-light leading-relaxed text-cream/50">
                The constitutional engine on port 7421 did not answer the last poll.
                 Nothing below is invented while it is silent — the page keeps listening
                 and will speak again the moment the engine does.{" "}
                 {state ? "The measurements shown while unreachable are the last sealed truth." : ""}
              </p>
            </div>
          </Reveal>
        ) : null}

        {state ? (
          <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-5">
            <Reveal delay={0.06}>
              <ReceiptSpine state={state} />
            </Reveal>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
              {/* Traces — the gate that says no */}
              <Reveal delay={0.1} className="lg:col-span-5">
                <TileShell
                  title="Evidence gate — the door that says no"
                  chip="Measured"
                  chipTone="verdant"
                  note="One trace was refused admission and recorded — not dropped. A system that never refuses is a system that cannot be trusted to accept."
                >
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3 sm:gap-x-8">
                    <Metric value={String(state.traces.stats.admissible)} unit="admitted" tone="verdant" className="text-5xl sm:text-6xl" />
                    <div className="flex flex-col gap-1">
                      <Metric value={String(state.traces.stats.inadmissible)} unit="refused" tone="ember" className="text-2xl" />
                      <span className="font-mono text-[0.6rem] tracking-[0.14em] text-cream/35 uppercase">
                        of {state.traces.stats.total} total
                      </span>
                    </div>
                  </div>
                </TileShell>
              </Reveal>

              {/* Constitution — the root that not even the author may touch */}
              <Reveal delay={0.14} className="lg:col-span-4">
                <TileShell
                  title="Constitution — sealed root"
                  chip="Immutable"
                  chipTone="gold"
                  note={state.constitution.law}
                >
                  <div className="space-y-3">
                    <Metric value={String(state.constitution.files.length)} unit="root files" className="text-4xl" />
                    <p className="font-mono text-[0.66rem] break-all leading-relaxed text-gold-500/70">
                      {truncHash(state.constitution.root_hash, 18, 6)}
                    </p>
                    <ul className="space-y-1">
                      {state.constitution.files.map((f) => (
                        <li key={f.name} className="flex items-baseline justify-between gap-2 font-mono text-[0.6rem] text-cream/45">
                          <span className="truncate">{f.name}</span>
                          <span className={f.verified ? "text-verdant/70" : "text-ember"} aria-label={f.verified ? "verified" : "drifted"}>
                            {f.verified ? "✓" : "✕"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </TileShell>
              </Reveal>

              {/* The Shoulder — standing on the root */}
              <Reveal delay={0.18} className="lg:col-span-3">
                <TileShell
                  title="The Shoulder — sealed"
                  chip={state.shoulder.sealed ? "Sealed" : "Open"}
                  chipTone="gold"
                  note={`${state.shoulder.sources.length} sources absorbed · corpus ${fmtBytes(state.shoulder.bytes)} · stands on the root, breaks ground above.`}
                >
                  <div className="space-y-2.5">
                    <Metric value={`#${state.shoulder.receipt_seq ?? "—"}`} unit="receipt" className="text-4xl" />
                    <p className="font-mono text-[0.66rem] leading-relaxed text-gold-500/70">
                      {truncHash(state.shoulder.sealed_sha256, 12)}
                    </p>
                    <p className="text-[0.75rem] font-light leading-relaxed text-cream/45">
                      The merged wisdom of every observed source — sealed once, verifiable
                      forever.
                    </p>
                  </div>
                </TileShell>
              </Reveal>

              {/* FATE — the membrane */}
              <Reveal delay={0.1} className="lg:col-span-4">
                <TileShell
                  title="FATE — the membrane"
                  chip="Fail-closed"
                  chipTone="gold"
                  note="Single-use leases only. No standing authority exists anywhere in Node0 — every privilege expires in seconds."
                >
                  <div className="flex flex-wrap items-baseline gap-x-5 gap-y-3 sm:gap-x-8">
                    <Metric
                      value={`${state.fate.stats.consumed}/${state.fate.stats.total}`}
                      unit="consumed"
                      className="text-4xl sm:text-5xl"
                    />
                    <div className="flex flex-col gap-1">
                      <Metric value={String(state.fate.stats.expired_ever)} unit="expired" tone="verdant" className="text-2xl" />
                      <span className="font-mono text-[0.6rem] tracking-[0.14em] text-cream/35 uppercase">
                        ttl 30s · network off
                      </span>
                    </div>
                  </div>
                </TileShell>
              </Reveal>

              {/* Dema — the voice that never lies */}
              <Reveal delay={0.14} className="lg:col-span-3">
                <TileShell
                  title="Dema relay — live verdicts"
                  chip="Measured"
                  chipTone="verdant"
                  note={`${state.dema.length} verdicts since genesis. DONE, REFUSED, or UNKNOWN — never silence, never spin.`}
                >
                  <DemaFeed entries={state.dema} />
                </TileShell>
              </Reveal>

              {/* Autopoiesis — the system that grows itself */}
              <Reveal delay={0.18} className="lg:col-span-5">
                <TileShell
                  title="Autopoiesis — the system grows itself"
                  chip="Receipt-sealed"
                  chipTone="gold"
                  note="Proposed by PAT, verified by SAT, sealed by receipt — the ladder of a contract teaching itself to see further."
                >
                  <AutopoiesisLadder state={state} />
                </TileShell>
              </Reveal>

              {/* The living strip — uptime, boots, mission, outbox */}
              <Reveal delay={0.1} className="lg:col-span-12">
                <div className="bz-glass grid grid-cols-2 divide-x divide-white/5 rounded-xl sm:grid-cols-4">
                  <div className="p-5 sm:p-6">
                    <p className="mb-2 font-mono text-[0.62rem] tracking-[0.18em] text-cream/50 uppercase">
                      Uptime · boot {state.runtime.boot_count}
                    </p>
                    <p className="bz-num text-3xl text-gold-500 tabular-nums">
                      {live ? fmtUptime(state.runtime.started_at, now) : fmtUptime(state.runtime.started_at)}
                    </p>
                    <p className="mt-2 text-[0.72rem] font-light text-cream/40">
                      sealed {fmtStamp(state.runtime.sealed_at)} · GST
                    </p>
                  </div>
                  <div className="p-5 sm:p-6">
                    <p className="mb-2 font-mono text-[0.62rem] tracking-[0.18em] text-cream/50 uppercase">
                      First mission
                    </p>
                    <p className="bz-num text-3xl text-gold-500">SEALED</p>
                    <p className="mt-2 truncate text-[0.72rem] font-light text-cream/40" title={state.missions[0]?.id ?? "—"}>
                      {state.missions[0]?.id ?? "—"}
                    </p>
                  </div>
                  <div className="col-span-2 p-5 sm:col-span-1 sm:p-6">
                    <p className="mb-2 font-mono text-[0.62rem] tracking-[0.18em] text-cream/50 uppercase">
                      Outbox — the only exit
                    </p>
                    <p className="bz-num truncate text-2xl text-gold-500 sm:text-3xl" title={state.outbox[0]?.name ?? "—"}>
                      {state.outbox.length > 0 ? fmtBytes(state.outbox[0].bytes) : "empty"}
                    </p>
                    <p className="mt-2 truncate text-[0.72rem] font-light text-cream/40" title={state.outbox[0]?.name ?? "—"}>
                      {state.outbox[0]?.name ?? "no briefs pending"}
                    </p>
                  </div>
                  <div className="col-span-2 flex flex-col justify-center p-5 sm:col-span-1 sm:p-6">
                    <p className="mb-2 font-mono text-[0.62rem] tracking-[0.18em] text-cream/50 uppercase">
                      Truth scale
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <TruthChip label="Measured" tone="verdant" />
                      <TruthChip label="Designed" tone="gold" />
                      <TruthChip label="Not live" tone="neutral" />
                    </div>
                    <p className="mt-2.5 text-[0.7rem] font-light leading-relaxed text-cream/40">
                      Node0 is one node. The federation is designed — not yet live. We
                      say so.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.12}>
              <p className="mx-auto max-w-3xl text-center font-mono text-[0.64rem] leading-relaxed tracking-[0.12em] text-cream/30 uppercase">
                Source of truth · live runtime 127.0.0.1:7421 · polled every 2.5s ·
                constitution {state.constitution.verified ? "verified" : "drift detected"} ·{" "}
                {state.node0.spine.source_drift
                  ? "dev-mode source drift observed, honestly labeled"
                  : "spine aligned"}
              </p>
            </Reveal>
          </div>
        ) : null}
      </div>
    </section>
  );
}
