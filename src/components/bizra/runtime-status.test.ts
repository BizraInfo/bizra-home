import { expect, test } from "bun:test";
import { NODE0_RUNTIME_CONTRACT_MISMATCH } from "@/lib/runtime-contract";
import { classifyRuntime, runtimeLabel } from "./runtime-status";

test("keeps a contract mismatch below every live claim", () => {
  const kind = classifyRuntime(null, false, NODE0_RUNTIME_CONTRACT_MISMATCH);
  expect(kind).toBe("MISMATCH");
  expect(runtimeLabel(kind)).toContain("STATE UNKNOWN");
});

test("requires the observed founder runtime for LIVE", () => {
  expect(classifyRuntime({ mode: "LOCAL_FOUNDER", status: "LIVE", node0_active: true })).toBe("LIVE");
  expect(classifyRuntime({ mode: "LOCAL_FOUNDER", status: "LIVE", node0_active: false })).toBe("REFERENCE");
});
