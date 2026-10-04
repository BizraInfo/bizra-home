"use client";

import { useState, type FormEvent } from "react";
import { SeedMark } from "./seed-mark";

export function InviteGate({ nextPath }: { nextPath: string }) {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/invite/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, next: nextPath }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        setMessage(
          response.status === 503
            ? "Invitations are not provisioned on this deployment yet."
            : "That invitation was not accepted.",
        );
        return;
      }
      window.location.assign(result.next ?? nextPath);
    } catch {
      setMessage("The private door could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-navy-900 px-6 py-16">
      <div aria-hidden="true" className="bz-grid-bg pointer-events-none fixed inset-0" />
      <div aria-hidden="true" className="bz-grain pointer-events-none fixed inset-0" />
      <section className="bz-glass relative w-full max-w-md rounded-sm px-7 py-9 shadow-2xl shadow-black/30 sm:px-10">
        <a href="/" className="bz-focus inline-flex items-center gap-3 text-cream/80" aria-label="Back to BIZRA">
          <SeedMark size={38} tone="full" />
          <span className="font-serif text-lg tracking-[0.24em]">BIZRA</span>
        </a>
        <p className="bz-kicker mt-10">Private door · invitation</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-cream">Enter Dema.</h1>
        <p className="mt-4 text-sm leading-7 text-cream/60">
          The public story is open. Dema&apos;s local onboarding and Node0 tools are shared by invitation, one human at a time.
        </p>
        <form onSubmit={submit} className="mt-8">
          <label htmlFor="invite-code" className="bz-kicker block text-[0.62rem]">Invitation code</label>
          <input
            id="invite-code"
            name="code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            autoComplete="one-time-code"
            autoFocus
            className="bz-focus mt-3 min-h-12 w-full rounded-sm border border-gold-500/30 bg-navy-900/70 px-4 font-mono text-sm tracking-[0.12em] text-cream placeholder:text-cream/25"
            placeholder="your invitation"
          />
          {message ? <p className="mt-3 text-sm text-ember" role="alert">{message}</p> : null}
          <button type="submit" disabled={!code.trim() || busy} className="bz-btn-gold bz-focus mt-5 w-full disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? "Checking…" : "Continue privately"}
          </button>
        </form>
        <p className="mt-8 text-xs leading-6 text-cream/35">
          No code? The landing page stays readable. Access is not inferred from a link, a model, or a pasted message.
        </p>
      </section>
    </main>
  );
}
