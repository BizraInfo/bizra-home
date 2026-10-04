import { expect, test } from "bun:test";
import { safeInviteNext } from "./invite";

test("safeInviteNext keeps redirects same-origin", () => {
  expect(safeInviteNext("/download?from=invite#start")).toBe("/download?from=invite#start");
  expect(safeInviteNext("//evil.example")).toBe("/onboarding");
  expect(safeInviteNext("/\\evil.example")).toBe("/onboarding");
  expect(safeInviteNext("https://evil.example")).toBe("/onboarding");
  expect(safeInviteNext(undefined)).toBe("/onboarding");
});
