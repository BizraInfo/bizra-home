import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DemaFlow } from "@/components/node0/dema-flow";
import { hasInviteAccess } from "@/lib/invite";

export const metadata: Metadata = {
  title: "DEMA — Node0 Workbench",
  description: "An invite-gated, read-only workbench for observing Node0 and drafting an intention.",
  robots: { index: false, follow: false },
};

export default async function Node0Page() {
  if (!(await hasInviteAccess())) redirect("/invite?next=/node0");
  return <DemaFlow />;
}
