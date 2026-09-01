"use client";

/**
 * BIZRA — the public face.
 *
 * The Seed of Life brand system (Genesis Gold × Celestial Navy), the
 * narrative arc of the Public First Look, and the live Node0 runtime —
 * fused into one page. Born from people, not from a lab. We claim
 * nothing; we show what is measured.
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

export default function Home() {
  const { data, error } = useNode0State();

  return (
    <div className="relative flex min-h-screen flex-col bg-navy-900">
      {/* The permanent background: gold construction grid + film grain */}
      <div aria-hidden="true" className="bz-grid-bg pointer-events-none fixed inset-0 z-0" />
      <div aria-hidden="true" className="bz-grain pointer-events-none fixed inset-0 z-0" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Nav state={data} error={error} />

        <main className="flex-1">
          <Hero state={data} error={error} />
          <Origin state={data} />
          <Fracture />
          <Loop state={data} />
          <Proof state={data} error={error} />
          <Vision state={data} />
          <Law />
          <Ihsan />
          <Forest />
          <Invitation />
        </main>

        <Footer state={data} />
      </div>
    </div>
  );
}
