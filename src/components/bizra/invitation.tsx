"use client";

/**
 * BIZRA — The Invitation.
 *
 * The public story is open; Dema's install path remains invitation-only.
 */

import { SeedMark } from "./seed-mark";
import { Reveal } from "./shared";

export function Invitation() {
  return (
    <section
      id="invitation"
      aria-label="Invitation — plant your seed"
      className="relative w-full border-t border-white/5 bg-navy-900 px-6 pt-24 pb-14 text-center sm:px-8 sm:pt-32"
    >
      <div className="mx-auto max-w-3xl">
        <Reveal>
          <SeedMark
            size={74}
            tone="full"
            label="The BIZRA seed — plant yours"
            className="mx-auto"
          />
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="mt-7 font-serif text-5xl font-semibold tracking-tight text-cream sm:text-6xl">
            Plant your seed.
          </h2>
        </Reveal>
        <Reveal delay={0.14}>
          <p className="mx-auto mt-5 max-w-md text-[0.95rem] font-light leading-[1.8] text-cream/55 sm:text-base">
            The public story is open. Dema&apos;s local onboarding and install path are
            shared by invitation, with every runtime claim kept inside its evidence boundary.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5">
            <a
              href="/invite?next=/onboarding"
              className="bz-btn-gold bz-focus"
            >
              Enter by invitation
            </a>
            <a href="/docs" className="bz-btn-ghost bz-focus">
              Read the field guide
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.26}>
          <p className="mt-8 font-mono text-[0.64rem] tracking-[0.2em] text-cream/30 uppercase">
            Dema · BIZRA-OS · local-first · consent-bound
          </p>
        </Reveal>
      </div>
    </section>
  );
}
