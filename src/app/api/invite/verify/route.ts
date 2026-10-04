import { NextResponse } from "next/server";
import {
  createInviteCookieValue,
  INVITE_COOKIE,
  INVITE_MAX_AGE,
  inviteConfigurationReady,
  safeInviteNext,
} from "@/lib/invite";

export async function POST(request: Request) {
  if (!inviteConfigurationReady()) {
    return NextResponse.json(
      { ok: false, reason: "INVITATIONS_NOT_PROVISIONED" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim() : "";
  const safeNext = safeInviteNext(body?.next);
  const cookieValue = createInviteCookieValue(code);

  if (!cookieValue) {
    return NextResponse.json({ ok: false, reason: "INVITATION_REFUSED" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true, next: safeNext });
  response.cookies.set({
    name: INVITE_COOKIE,
    value: cookieValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: INVITE_MAX_AGE,
  });
  return response;
}
