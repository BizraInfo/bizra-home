import { expect, test } from "bun:test";
import {
  NODE0_RUNTIME_CONTRACT_MISMATCH,
  node0ContractFailure,
  validateNode0StateEnvelope,
} from "./runtime-contract";

test("accepts only a successful Node0 state envelope", () => {
  expect(validateNode0StateEnvelope({ ok: true, runtime: { status: "REFERENCE_ONLINE" } })).toBe(true);
  expect(validateNode0StateEnvelope({ ok: true, runtime: [{ status: "LIVE" }] })).toBe(false);
  expect(validateNode0StateEnvelope({ ok: false, runtime: { status: "LIVE" } })).toBe(false);
  expect(validateNode0StateEnvelope({ ok: true, runtime: null })).toBe(false);
  expect(validateNode0StateEnvelope({ ok: true })).toBe(false);
});

test("describes an upstream contract mismatch without inventing state", () => {
  expect(node0ContractFailure(404, "HTTP_STATUS")).toEqual({
    ok: false,
    status: "UNKNOWN",
    reason: NODE0_RUNTIME_CONTRACT_MISMATCH,
    contract: "bizra.home.node0-transport.v1",
    expected_path: "/api/state",
    upstream_status: 404,
    failure: "HTTP_STATUS",
    authority_delta: 0,
  });
});
