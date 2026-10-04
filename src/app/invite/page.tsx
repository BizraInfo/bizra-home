import { InviteGate } from "@/components/bizra/invite-gate";
import { safeInviteNext } from "@/lib/invite";

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <InviteGate nextPath={safeInviteNext(params.next)} />;
}
