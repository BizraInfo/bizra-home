"use client";

/**
 * BIZRA — the footer. Sticky to the bottom of the world.
 * Built alone. Verified in public. The last line of the page is the first
 * law of the work: nothing here is claimed — it is shown.
 */

import { truncHash } from "./format";
import type { Node0State } from "@/components/node0/types";

export function Footer({ state }: { state: Node0State | null }) {
  const rootHash = state?.constitution?.root_hash;
  return (
    <footer className="mt-auto w-full border-t border-white/5 bg-navy-900">
      <div className="mx-auto max-w-6xl px-6 pt-7 pb-8 sm:px-8">
        <div className="flex flex-col items-center justify-between gap-4 text-center font-mono text-[0.62rem] tracking-[0.22em] text-cream/30 uppercase sm:flex-row sm:text-left">
          <span className="flex items-center gap-2.5">
            BIZRA · <span className="font-arabic text-sm tracking-normal text-gold-500/50">البذرة</span>
          </span>
          <span>Local-first · Consent-bound · Receipt-backed</span>
          <span>Built alone · Verified in public</span>
        </div>
        <p className="mt-5 text-center font-mono text-[0.56rem] leading-relaxed tracking-[0.12em] text-cream/20 uppercase sm:text-left">
          {rootHash
            ? `Sealed constitution root ${truncHash(rootHash, 16)} · this page invents nothing — every number is read live from the Node0 runtime`
            : "This page invents nothing — every number is read live from the Node0 runtime"}
        </p>
      </div>
    </footer>
  );
}
