import { redirect } from "next/navigation";
import { SeedMark } from "@/components/bizra/seed-mark";
import { hasInviteAccess } from "@/lib/invite";

const COMMANDS = [
  "git clone https://github.com/BizraInfo/Dema",
  "cd Dema",
  "node bin/dema setup",
  "node bin/dema status",
  "node bin/dema doctor",
].join("\n");

const stages = [
  ["01", "Welcome", "Meet Dema as the human-facing companion of your local BIZRA node."],
  ["02", "Privacy", "Local-first is the default. Nothing leaves the node without a boundary you understand."],
  ["03", "Profile", "Give Dema only the name, language, and memory preferences you choose to keep."],
  ["04", "Model check", "Dema detects available local models and reports unavailable capability honestly."],
  ["05", "Node health", "Review profile, receipts, Node0 connection, and consent state before work begins."],
  ["06", "Receipts", "Choose the local evidence folder. A receipt records what happened; it is not a marketing claim."],
  ["07", "First light", "Dema proposes one safe next action. A preview never executes that action by itself."],
];

export default async function OnboardingPage() {
  if (!(await hasInviteAccess())) redirect("/invite?next=/onboarding");

  return (
    <main className="min-h-screen bg-navy-900 px-6 py-12 text-cream sm:px-10 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <a href="/" className="bz-focus inline-flex items-center gap-3 text-cream/75" aria-label="Back to BIZRA">
          <SeedMark size={38} tone="full" />
          <span className="font-serif text-lg tracking-[0.24em]">BIZRA</span>
        </a>
        <div className="mt-16 max-w-2xl">
          <p className="bz-kicker">Dema genesis · invited</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold tracking-tight sm:text-6xl">Start with clarity.</h1>
          <p className="mt-5 text-base leading-8 text-cream/60 sm:text-lg">
            Seven quiet steps establish a local relationship. Setup can continue without a model; blocked capability is shown as blocked, never painted green.
          </p>
        </div>
        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stages.map(([number, title, body]) => (
            <article key={number} className="bz-glass rounded-sm p-6">
              <p className="font-mono text-xs tracking-[0.22em] text-gold-500">{number}</p>
              <h2 className="mt-5 font-serif text-2xl text-cream">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-cream/55">{body}</p>
            </article>
          ))}
        </div>
        <section className="mt-12 border-t border-gold-500/15 pt-10">
          <p className="bz-kicker">Local path</p>
          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <pre className="overflow-x-auto rounded-sm border border-white/10 bg-black/20 p-5 font-mono text-sm leading-8 text-gold-200"><code>{COMMANDS}</code></pre>
            <div className="bz-glass rounded-sm p-6">
              <p className="font-serif text-2xl text-cream">The honest first minute.</p>
              <p className="mt-3 text-sm leading-7 text-cream/55">Dema is local-first, consent-bound, and receipt-aware. PAT-7 is Dema&apos;s private personal team. SAT-5 belongs to the system/URP plane and is not a second private assistant.</p>
              <a href="/download" className="bz-btn-gold bz-focus mt-6">Open install guide</a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
