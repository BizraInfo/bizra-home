"use client";

import { useState, type FormEvent } from "react";
import { useNode0State } from "@/components/node0/use-node0-state";
import {
  classifyModel,
  classifyRuntime,
  modelLabel,
  runtimeBadge,
  runtimeLabel,
  type RuntimeKind,
} from "@/components/bizra/runtime-status";

const STATUS_TONE: Record<RuntimeKind, string> = {
  LIVE: "border-verdant/30 text-verdant",
  REFERENCE: "border-gold-500/30 text-gold-300",
  HALTED: "border-ember/40 text-ember",
  MISMATCH: "border-solar/40 text-solar",
  LOST: "border-solar/40 text-solar",
  READING: "border-white/15 text-cream/60",
};

export function DemaFlow() {
  const { data, error, loading, updatedAt, refresh } = useNode0State();
  const [intent, setIntent] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const runtimeKind = loading && data === null
    ? classifyRuntime(null)
    : classifyRuntime(data?.runtime, error === null, error);
  const modelKind = classifyModel(data?.model);
  const observedModel = modelLabel(modelKind, data?.model) ?? "No model observation reported";

  function preparePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = intent.trim();
    if (!value) return;
    setPreview(value);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-navy-900 px-5 pb-16 pt-8 text-cream sm:px-8 sm:pt-10">
      <div aria-hidden="true" className="bz-grid-bg pointer-events-none fixed inset-0 opacity-50" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-5">
          <a href="/" className="bz-focus text-sm tracking-[0.2em] text-cream/75">
            BIZRA <span className="text-gold-400">/</span> DEMA
          </a>
          <span className="rounded-full border border-gold-500/25 px-3 py-1.5 font-mono text-[0.62rem] tracking-[0.16em] text-gold-300">
            INVITE-GATED · READ-ONLY POC
          </span>
        </header>

        <section className="mt-14 max-w-3xl sm:mt-20">
          <p className="bz-kicker">Momo · Node0 workbench</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Put the hard work into one clear intention.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-cream/60 sm:text-lg">
            Draft a task and see the current Node0 situation in one place. This proof of concept does not send the draft, start a mission, or grant authority.
          </p>
        </section>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.85fr)]">
          <section aria-labelledby="intent-title" className="bz-glass rounded-sm p-5 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="bz-kicker">01 · Your intention</p>
                <h2 id="intent-title" className="mt-3 font-serif text-2xl text-cream sm:text-3xl">
                  What should DEMA help with?
                </h2>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 font-mono text-[0.6rem] tracking-[0.14em] text-cream/45">
                LOCAL DRAFT
              </span>
            </div>

            <form className="mt-6" onSubmit={preparePreview}>
              <label htmlFor="node0-intent" className="sr-only">Describe the work you want help with</label>
              <textarea
                id="node0-intent"
                value={intent}
                onChange={(event) => {
                  setIntent(event.currentTarget.value);
                  setPreview(null);
                }}
                maxLength={2000}
                rows={6}
                placeholder="Describe the outcome, relevant constraints, and what would count as done."
                className="bz-focus w-full resize-y rounded-sm border border-white/10 bg-black/20 p-4 text-sm leading-7 text-cream placeholder:text-cream/30"
                aria-describedby="intent-limit intent-boundary"
              />
              <div className="mt-3 flex items-center justify-between gap-4">
                <span id="intent-limit" className="font-mono text-xs text-cream/35">{intent.length}/2000</span>
                <button
                  type="submit"
                  disabled={!intent.trim()}
                  className="bz-focus rounded-sm border border-gold-500/40 px-4 py-2.5 text-sm text-gold-200 transition-colors hover:border-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Preview brief
                </button>
              </div>
            </form>

            <p id="intent-boundary" className="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-cream/45">
              Drafts are not persisted; closing or refreshing this page clears them. Previewing is local only; no Node0 action is called.
            </p>

            {preview !== null ? (
              <section aria-labelledby="preview-title" className="mt-6 rounded-sm border border-gold-500/20 bg-gold-500/[0.04] p-4 sm:p-5">
                <p className="bz-kicker">Not submitted</p>
                <h3 id="preview-title" className="mt-2 font-serif text-xl text-cream">Intent preview</h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-cream/75">{preview}</p>
              </section>
            ) : null}
          </section>

          <aside aria-labelledby="situation-title" className="bz-glass rounded-sm p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="bz-kicker">02 · Observed situation</p>
                <h2 id="situation-title" className="mt-3 font-serif text-2xl text-cream">Node0</h2>
              </div>
              <span className={`rounded-full border px-3 py-1.5 font-mono text-[0.62rem] tracking-[0.12em] ${STATUS_TONE[runtimeKind]}`}>
                {runtimeBadge(runtimeKind)}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-cream/65">{runtimeLabel(runtimeKind)}</p>

            <dl className="mt-6 divide-y divide-white/10 border-y border-white/10">
              <div className="flex justify-between gap-4 py-3 text-sm">
                <dt className="text-cream/45">Model observation</dt>
                <dd className="max-w-[60%] text-right text-cream/75">{observedModel}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3 text-sm">
                <dt className="text-cream/45">Sealed missions</dt>
                <dd className="font-mono text-cream/75">{data?.signals.missions_sealed ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3 text-sm">
                <dt className="text-cream/45">Runtime chain report</dt>
                <dd className="text-right text-cream/75">
                  {data?.chain.ok === true ? `Reported intact · ${data.chain.len} receipts` :
                    data?.chain.ok === false ? "Runtime reports a chain issue" : "Not reported"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-3 text-sm">
                <dt className="text-cream/45">Last observation</dt>
                <dd className="text-right text-cream/75">
                  {updatedAt === null ? (loading ? "Reading…" : "Not observed") : new Date(updatedAt).toLocaleTimeString()}
                </dd>
              </div>
            </dl>

            {error ? (
              <p role="status" className="mt-4 rounded-sm border border-solar/20 bg-solar/[0.04] p-3 text-xs leading-5 text-solar">
                {error === "NODE0_INVITE_REQUIRED" ? (
                  <>Invite access expired. <a className="bz-focus underline underline-offset-4" href="/invite?next=/node0">Enter the invitation again</a> to refresh Node0.</>
                ) : (
                  "Latest poll failed. Any values above are from the last successful observation and may be stale."
                )}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="bz-focus mt-5 min-h-11 rounded-sm border border-white/10 px-4 text-sm text-cream/65 transition-colors hover:border-gold-500/30 hover:text-cream disabled:opacity-40"
            >
              Refresh observation
            </button>
          </aside>
        </div>

        <footer className="mt-8 flex flex-col gap-2 border-t border-white/10 pt-5 text-xs leading-6 text-cream/40 sm:flex-row sm:justify-between">
          <span>Invite access is not a verified Momo identity binding.</span>
          <span>Mission execution remains outside this preview.</span>
        </footer>
      </div>
    </main>
  );
}
