export const NODE0_RUNTIME_CONTRACT_MISMATCH = "NODE0_RUNTIME_CONTRACT_MISMATCH";

type ContractFailure = "HTTP_STATUS" | "INVALID_JSON" | "INVALID_STATE_SHAPE";

export function validateNode0StateEnvelope(value: unknown): value is { ok: true; runtime: Record<string, unknown> } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { ok?: unknown; runtime?: unknown };
  return candidate.ok === true && candidate.runtime !== null && typeof candidate.runtime === "object" && !Array.isArray(candidate.runtime);
}

export function node0ContractFailure(upstreamStatus: number, failure: ContractFailure) {
  return {
    ok: false,
    status: "UNKNOWN" as const,
    reason: NODE0_RUNTIME_CONTRACT_MISMATCH,
    contract: "bizra.home.node0-transport.v1" as const,
    expected_path: "/api/state" as const,
    upstream_status: upstreamStatus,
    failure,
    authority_delta: 0 as const,
  };
}
