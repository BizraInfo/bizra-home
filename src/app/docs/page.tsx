import { SeedMark } from "@/components/bizra/seed-mark";

export const metadata = {
  title: "BIZRA — How Dema works",
  description: "The calm, evidence-bound path from BIZRA invitation to a local Dema node.",
};

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-navy-900 px-6 py-12 text-cream sm:px-10 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="bz-focus inline-flex items-center gap-3 text-cream/75" aria-label="Back to BIZRA">
          <SeedMark size={38} tone="full" />
          <span className="font-serif text-lg tracking-[0.24em]">BIZRA</span>
        </a>
        <div className="mt-16 max-w-3xl">
          <p className="bz-kicker">The field guide</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold tracking-tight sm:text-6xl">A place to return to.</h1>
          <p className="mt-5 text-base leading-8 text-cream/60 sm:text-lg">BIZRA is the wider ecosystem. Dema is the calm human-facing companion of one sovereign Node. The public page explains the idea; the invited path helps you begin locally.</p>
        </div>
        <div className="mt-14 grid gap-5 md:grid-cols-2">
          <section className="bz-glass rounded-sm p-7"><p className="bz-kicker">01 · Public</p><h2 className="mt-4 font-serif text-3xl">See the seed.</h2><p className="mt-3 text-sm leading-7 text-cream/55">The landing page is open to everyone. It shows the BIZRA story and labels runtime evidence honestly. It does not expose private Node0 onboarding.</p><a href="/" className="bz-btn-ghost bz-focus mt-6">Return to landing</a></section>
          <section className="bz-glass rounded-sm p-7"><p className="bz-kicker">02 · Invited</p><h2 className="mt-4 font-serif text-3xl">Enter Dema.</h2><p className="mt-3 text-sm leading-7 text-cream/55">An invitation opens the onboarding and install guide. Access is a private door, not a claim that a browser session is already a Node.</p><a href="/invite?next=/onboarding" className="bz-btn-gold bz-focus mt-6">Use invitation</a></section>
        </div>
        <section className="mt-12 border-t border-gold-500/15 pt-10">
          <p className="bz-kicker">The operating model</p>
          <div className="mt-6 space-y-5 text-sm leading-8 text-cream/60">
            <p><span className="text-gold-300">Dema</span> receives natural language, restores the current relationship and mission, and returns the human to one useful next step.</p>
            <p><span className="text-gold-300">PAT-7</span> is Dema&apos;s private personal think tank: Archivist, Extractor, Cartographer, Scout, Engineer, Builder, and Scribe. These are bounded proposal roles, not seven windows the human must manage.</p>
            <p><span className="text-gold-300">SAT-5</span> is system-owned independent verification in the URP plane. It serves the integrity of the network and does not become the human&apos;s private assistant.</p>
            <p><span className="text-gold-300">FATE</span> protects consequential authority. A capability, model output, receipt, or pasted command cannot authorize itself.</p>
          </div>
        </section>
        <section className="mt-12 border-t border-gold-500/15 pt-10"><p className="bz-kicker">Truth labels</p><div className="mt-5 flex flex-wrap gap-3 font-mono text-xs tracking-[0.16em] text-cream/55"><span className="rounded-full border border-verdant/40 px-3 py-2 text-verdant">MEASURED</span><span className="rounded-full border border-gold-500/35 px-3 py-2 text-gold-400">DECLARED</span><span className="rounded-full border border-solar/40 px-3 py-2 text-solar">UNKNOWN</span><span className="rounded-full border border-ember/40 px-3 py-2 text-ember">BLOCKED</span></div></section>
      </div>
    </main>
  );
}
