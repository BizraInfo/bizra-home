import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CommandBar } from "./command-bar";
import type { Node0State } from "./types";

function renderStatus(runtime: Record<string, unknown>) {
  const state = {
    runtime: { phase: "BOOT", halted_reason: null, ...runtime },
    chain: { len: 0 },
    dema: [],
  } as unknown as Node0State;
  return renderToStaticMarkup(createElement(CommandBar, { state, error: null, onRetry: () => {} }));
}

test("unknown runtime status stays reference instead of becoming LIVE", () => {
  const markup = renderStatus({ mode: "LOCAL_FOUNDER", status: "STARTING", node0_active: true });
  expect(markup).toContain("REFERENCE · READ-ONLY");
  expect(markup).not.toContain(">LIVE<");
});

test("keeps LIVE for a server-verified founder runtime", () => {
  const markup = renderStatus({ mode: "LOCAL_FOUNDER", status: "LIVE", node0_active: true });
  expect(markup).toContain(">LIVE<");
});
