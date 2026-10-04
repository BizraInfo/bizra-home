import { expect, mock, test } from "bun:test";

let inviteCookie: string | undefined;
mock.module("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => name === "bizra_invite" && inviteCookie ? { value: inviteCookie } : undefined,
  }),
}));

const { GET, POST } = await import("./route");
const { createInviteCookieValue } = await import("@/lib/invite");

test("gates reads by invitation, rejects writes before upstream, and preserves the state poll", async () => {
  const originalFetch = globalThis.fetch;
  const originalCodes = process.env.BIZRA_BETA_INVITE_CODES;
  const originalSecret = process.env.BIZRA_INVITE_SECRET;
  const calls: Array<{ url: string; method: string | undefined }> = [];
  process.env.BIZRA_BETA_INVITE_CODES = "test-invite-code";
  process.env.BIZRA_INVITE_SECRET = "test-only-invite-secret-32-bytes";
  inviteCookie = undefined;
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), method: init?.method });
    return Response.json({ ok: true, runtime: { status: "REFERENCE_ONLINE" } });
  };

  try {
    const denied = await GET(new Request("http://localhost/api/node0/shoulder"), {
      params: Promise.resolve({ path: ["shoulder"] }),
    });
    expect(denied.status).toBe(401);
    expect(await denied.json()).toMatchObject({ ok: false, refused: true, reason: "NODE0_INVITE_REQUIRED" });
    expect(calls).toHaveLength(0);

    inviteCookie = "v1.1.not-a-digest.invalid";
    const forged = await GET(new Request("http://localhost/api/node0/state"), {
      params: Promise.resolve({ path: ["state"] }),
    });
    expect(forged.status).toBe(401);
    expect(calls).toHaveLength(0);

    inviteCookie = createInviteCookieValue("test-invite-code") ?? undefined;
    expect(inviteCookie).toBeDefined();
    const params = Promise.resolve({ path: ["mission"] });
    const write = await POST(new Request("http://localhost/api/node0/mission", { method: "POST", body: "{}" }), { params });
    expect(write.status).toBe(405);
    expect(write.headers.get("allow")).toBe("GET");
    expect(await write.json()).toMatchObject({
      ok: false,
      refused: true,
      reason: "NODE0_READ_ONLY: writes are not available through this workbench",
    });
    expect(calls).toHaveLength(0);

    const read = await GET(new Request("http://localhost/api/node0/state"), {
      params: Promise.resolve({ path: ["state"] }),
    });
    expect(read.status).toBe(200);
    expect(calls).toEqual([{ url: "http://127.0.0.1:7421/api/state", method: "GET" }]);
  } finally {
    globalThis.fetch = originalFetch;
    inviteCookie = undefined;
    if (originalCodes === undefined) delete process.env.BIZRA_BETA_INVITE_CODES;
    else process.env.BIZRA_BETA_INVITE_CODES = originalCodes;
    if (originalSecret === undefined) delete process.env.BIZRA_INVITE_SECRET;
    else process.env.BIZRA_INVITE_SECRET = originalSecret;
  }
});
