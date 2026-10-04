"use client";

/**
 * BIZRA — client shell for the public face.
 * Polls Node0 once; keeps framer-motion out of nav/hero via status-ui.
 */

import { useNode0State } from "@/components/node0/use-node0-state";
import { Nav } from "@/components/bizra/nav";
import { Hero } from "@/components/bizra/hero";
import { Origin } from "@/components/bizra/origin";
import { Fracture } from "@/components/bizra/fracture";
import { Loop } from "@/components/bizra/loop";
import { Proof } from "@/components/bizra/proof";
import { Vision } from "@/components/bizra/vision";
import { Law } from "@/components/bizra/law";
import { Ihsan } from "@/components/bizra/ihsan";
import { Forest } from "@/components/bizra/forest";
import { Invitation } from "@/components/bizra/invitation";
import { Footer } from "@/components/bizra/footer";

export function HomeShell() {
  const { data, error } = useNode0State();

  return (
    <div className="relative flex min-h-screen flex-col bg-navy-900">
      <div aria-hidden="true" className="bz-grid-bg pointer-events-none fixed inset-0 z-0" />
      <div aria-hidden="true" className="bz-grain pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Nav state={data} error={error} />

        <main className="flex-1">
          <Hero state={data} error={error} />
          <Origin state={data} error={error} />
          <Fracture />
          <Loop state={data} error={error} />
          <Proof state={data} error={error} />
          <Vision state={data} error={error} />
          <Law />
          <Ihsan />
          <Forest state={data} error={error} />
          <Invitation />
        </main>

        <Footer state={data} error={error} />
      </div>
    </div>
  );
}
