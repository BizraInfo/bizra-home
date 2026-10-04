import { expect, mock, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

let snapshot = {
  data: null,
  error: null as string | null,
  loading: false,
  updatedAt: null,
  refresh: async () => {},
};

mock.module("@/components/node0/use-node0-state", () => ({ useNode0State: () => snapshot }));

const { DemaFlow } = await import("./dema-flow");

test("invite expiry provides a return path while other poll failures remain clear", () => {
  snapshot.error = "NODE0_INVITE_REQUIRED";
  const expired = renderToStaticMarkup(createElement(DemaFlow));
  expect(expired).toContain('href="/invite?next=/node0"');
  expect(expired).toContain("Invite access expired.");

  snapshot.error = "NODE0_UNREACHABLE";
  const unreachable = renderToStaticMarkup(createElement(DemaFlow));
  expect(unreachable).toContain("Latest poll failed.");
  expect(unreachable).not.toContain('href="/invite?next=/node0"');
});
