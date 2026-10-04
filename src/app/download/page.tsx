import { redirect } from "next/navigation";
import { SeedMark } from "@/components/bizra/seed-mark";
import { hasInviteAccess } from "@/lib/invite";

const INSTALL_COMMANDS = [
  "git clone https://github.com/BizraInfo/Dema",
  "cd Dema",
  "node bin/dema --version",
].join("\n");

const START_COMMANDS = [
  "node bin/dema welcome",
  "node bin/dema onboard",
  "node bin/dema status",
].join("\n");

export default async function DownloadPage() {
  if (!(await hasInviteAccess())) redirect("/invite?next=/download");

  return (
    <main className="min-h-screen bg-navy-900 px-6 py-12 text-cream sm:px-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="bz-focus inline-flex items-center gap-3 text-cream/75" aria-label="Back to BIZRA">
          <SeedMark size={38} tone="full" />
          <span className="font-serif text-lg tracking-[0.24em]">BIZRA</span>
        </a>
        <div className="mt-16 max-w-2xl">
          <p className="bz-kicker">Dema · invited release path</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold tracking-tight sm:text-6xl">Install your place.</h1>
          <p className="mt-5 text-base leading-8 text-cream/60 sm:text-lg">Dema runs on the human&apos;s machine first. This page gives the reproducible source path; it does not pretend that a cloud page is your sovereign Node0.</p>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <section className="bz-glass rounded-sm p-7">
            <p className="bz-kicker">01 · Get Dema</p>
            <h2 className="mt-4 font-serif text-3xl">A small local install.</h2>
            <pre className="mt-6 overflow-x-auto rounded-sm border border-white/10 bg-black/20 p-5 font-mono text-sm leading-8 text-gold-200"><code>{INSTALL_COMMANDS}</code></pre>
            <p className="mt-4 text-sm leading-7 text-cream/45">Requires Node.js 20 or newer. The current Quickstart is source-first; no hidden daemon is started by these commands.</p>
          </section>
          <section className="bz-glass rounded-sm p-7">
            <p className="bz-kicker">02 · Meet Dema</p>
            <h2 className="mt-4 font-serif text-3xl">Begin without theater.</h2>
            <pre className="mt-6 overflow-x-auto rounded-sm border border-white/10 bg-black/20 p-5 font-mono text-sm leading-8 text-gold-200"><code>{START_COMMANDS}</code></pre>
            <p className="mt-4 text-sm leading-7 text-cream/45">If a model or runtime is unavailable, Dema says so. Recovery and orientation must not depend on a model call.</p>
          </section>
        </div>
        <section className="mt-12 border-t border-gold-500/15 pt-10">
          <p className="bz-kicker">The boundary</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div><p className="font-serif text-2xl text-cream">Dema</p><p className="mt-2 text-sm leading-6 text-cream/50">Your one human-facing companion and owner of the relationship.</p></div>
            <div><p className="font-serif text-2xl text-cream">PAT-7</p><p className="mt-2 text-sm leading-6 text-cream/50">Your private, local-first proposal team behind Dema.</p></div>
            <div><p className="font-serif text-2xl text-cream">SAT-5</p><p className="mt-2 text-sm leading-6 text-cream/50">System-owned independent verification in the URP plane, not a personal agent team.</p></div>
          </div>
        </section>
        <div className="mt-12 flex flex-wrap gap-4">
          <a href="/onboarding" className="bz-btn-gold bz-focus">Back to onboarding</a>
          <a href="https://github.com/BizraInfo/Dema" target="_blank" rel="noopener noreferrer" className="bz-btn-ghost bz-focus">Open source repository</a>
        </div>
      </div>
    </main>
  );
}
