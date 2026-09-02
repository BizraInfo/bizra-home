/**
 * BIZRA Node0 — the model-neutral local cognition port (LOCAL-MODEL-PROVIDER-1A).
 *
 * THE CONTRACT (mission §2): the rest of BIZRA depends on ModelProvider, never
 * on Ollama-specific objects. Providers expose:
 *
 *   ModelProvider { id, kind, health(), listModels(), inspectModel(), generate() }
 *
 * THE AUTHORITY LAW (mission §8, constitutional): MODEL OUTPUT HAS ZERO EFFECT
 * AUTHORITY. Every generate() result — success or failure — carries
 *   MODEL_AUTHORITY = PROPOSE_ONLY, authority_delta = 0.
 * The model may interpret, reason, summarize, plan, propose. It may never
 * execute, seal, approve, lease, or change its own authority. There is no code
 * path from a model response to any effect.
 *
 * THE FALLBACK LAW (mission §5): there is NO remote provider in this runtime.
 * The historical Z.ai provider exists only as a documented memory
 * (REFERENCE_OR_DEV_REMOTE_PROVIDER) and is not wired to anything — it is not
 * reachable from LOCAL_FOUNDER execution because it is not reachable at all.
 * LOCAL_FOUNDER + unavailable Ollama returns LOCAL_MODEL_UNAVAILABLE. No cloud
 * fallback, no remote convenience fallback, never silent.
 *
 * THE BUDGET LAW (mission §11): MAX_MODEL_CALLS_PER_MISSION = 1 for the
 * first-breath mission class. One attempt — success OR failure — consumes the
 * mission's single call. No automatic retry. A second attempt is refused with
 * MODEL_BUDGET_EXCEEDED.
 *
 * THE PRIVACY LAW (mission §10): telemetry persists mission_id, provider,
 * model identity, request hash, response hash, byte counts, timestamps,
 * duration, result status, call count — NEVER full prompts or responses.
 */
import { dirname } from "node:path";
import { one, all, run, kv, RUNTIME_MODE, STATE_DIR } from "./store";
import { nowIso, sha256hex, canonical } from "./hash";
import { LocalOllamaProvider, ollamaFetch } from "./ollama-provider";
import { loadModelConfig, modelConfigPath, MODEL_CONFIG_SCHEMA, saveModelConfigAtomic, ModelProviderConfigFile, classifyEndpoint, DEFAULT_OLLAMA_ENDPOINT, MODEL_AUTHORITY, AUTHORITY_DELTA, MODEL_AUTHORITY_LABEL, MAX_MODEL_CALLS_PER_MISSION, MAX_OUTPUT_BYTES, MAX_REQUEST_BYTES, modelTimeoutMs } from "./model-config";
import { recordTiming, tryReserveBudget } from "./model-timing";

// Re-export the shared provider laws as this module's public surface.
export { MODEL_AUTHORITY, AUTHORITY_DELTA, MODEL_AUTHORITY_LABEL, MAX_MODEL_CALLS_PER_MISSION, MAX_OUTPUT_BYTES, MAX_REQUEST_BYTES, modelTimeoutMs };

// ---------------------------------------------------------------------------
// States, authority, limits
// ---------------------------------------------------------------------------
export type ModelProviderState = "UNCONFIGURED" | "UNAVAILABLE" | "READY" | "DEGRADED" | "REFUSED_NONLOCAL";

// ---------------------------------------------------------------------------
// Identity — never a friendly name alone (mission §4)
// ---------------------------------------------------------------------------
export interface ModelIdentity {
  provider: string;
  model_name: string;
  /** Ollama content digest when present; UNKNOWN/absent is never fabricated. */
  model_digest: string | null;
  family: string | null;
  parameter_size: string | null;
  quantization_level: string | null;
  size: number | null;
  modified_at: string | null;
}

// ---------------------------------------------------------------------------
// Failure codes — every failure preserves authority_delta = 0 (mission §11)
// ---------------------------------------------------------------------------
export type ModelFailureCode =
  | "MODEL_NOT_CONFIGURED"
  | "LOCAL_MODEL_UNAVAILABLE"
  | "MODEL_TIMEOUT"
  | "MODEL_PROTOCOL_ERROR"
  | "MODEL_NOT_INSTALLED"
  | "MODEL_REDIRECT_NONLOCAL"
  | "MODEL_IDENTITY_MISMATCH"
  | "MODEL_OUTPUT_EXCEEDED"
  | "MODEL_REQUEST_TOO_LARGE"
  | "MODEL_BUDGET_EXCEEDED"
  | "MODEL_MODE_REFUSED";

export interface ModelFailure {
  ok: false;
  code: ModelFailureCode;
  reason: string;
  provider_id: string;
  endpoint_class: string;
  endpoint: string | null;
  mission_id: string;
  authority: typeof MODEL_AUTHORITY_LABEL;
}

export interface ModelGenerateOk {
  ok: true;
  text: string;
  identity: ModelIdentity;
  provider_id: string;
  endpoint: string;
  endpoint_class: string;
  mission_id: string;
  request_sha256: string;
  response_sha256: string;
  request_bytes: number;
  response_bytes: number;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  authority: typeof MODEL_AUTHORITY_LABEL;
}

export interface GenerateInput {
  mission_id: string;
  model: string;
  /** Configured digest binding — null = unbound. A mismatch refuses: no silent model change. */
  expected_digest: string | null;
  system: string;
  user: string;
}

export interface ProviderHealth {
  provider_id: string;
  kind: string;
  endpoint: string;
  endpoint_class: string;
  state: ModelProviderState;
  reason?: string;
}

export interface ModelProvider {
  readonly id: string;
  readonly kind: string;
  readonly endpoint: string;
  readonly endpointClass: string;
  health(): Promise<ProviderHealth>;
  listModels(): Promise<{ ok: true; models: ModelIdentity[] } | { ok: false; code: ModelFailureCode; reason: string }>;
  inspectModel(model: string): Promise<{ ok: true; identity: ModelIdentity } | { ok: false; code: ModelFailureCode; reason: string }>;
  generate(input: GenerateInput): Promise<ModelGenerateOk | ModelFailure>;
}

/** The state ROOT (parent of the state dir) — where config/ lives, like keys/. */
export function modelStateRoot(): string {
  return dirname(STATE_DIR);
}

// ---------------------------------------------------------------------------
// Provider resolution — LOCAL only, LOOPBACK only, never remote (mission §5)
// ---------------------------------------------------------------------------
export interface ModelSelection {
  endpoint: string;
  model: string | null;
  digest: string | null;
  unconfigured: boolean;
}

export function getModelSelection(): ModelSelection {
  const cfg = loadModelConfigForRuntime();
  if (!cfg) {
    return { endpoint: DEFAULT_OLLAMA_ENDPOINT, model: null, digest: null, unconfigured: true };
  }
  return { endpoint: cfg.endpoint, model: cfg.selected_model, digest: cfg.selected_model_digest, unconfigured: false };
}

function loadModelConfigForRuntime(): ModelProviderConfigFile | null {
  if (RUNTIME_MODE !== "LOCAL_FOUNDER") return null;
  try {
    return loadModelConfig(dirname(STATE_DIR));
  } catch {
    return null;
  }
}

/** Resolve the active provider. LOCAL_FOUNDER only; PUBLIC never resolves one
 *  (it must not probe — mission §6). Never a remote provider — none exists. */
export function resolveModelProvider(endpointOverride?: string): LocalOllamaProvider | null {
  if (RUNTIME_MODE !== "LOCAL_FOUNDER") return null;
  const selection = getModelSelection();
  const endpoint = endpointOverride ?? selection.endpoint;
  const cls = classifyEndpoint(endpoint);
  if (!cls.ok) return null; // a persisted non-loopback endpoint is never honored
  return new LocalOllamaProvider(cls.endpoint);
}

// ---------------------------------------------------------------------------
// Budget — one call per mission, durable in model_call_log + atomic model_budget (mission §11)
// Observability 1A: the reservation is atomic via PRIMARY KEY INSERT in model_budget,
//               before any network dispatch. N concurrent at budget=1 → exactly ONE dispatch.
// ---------------------------------------------------------------------------
export function modelCallsUsed(missionId: string): number {
  try {
    // Primary truth is the atomic reservation table; fallback to legacy count for old roots
    const r = one<{ n: number }>("SELECT COUNT(*) AS n FROM model_budget WHERE mission_id = ?", missionId);
    if (r != null) return Number(r.n);
  } catch {}
  try {
    return Number(one<{ n: number }>("SELECT COUNT(*) AS n FROM model_call_log WHERE mission_id = ?", missionId)?.n ?? 0);
  } catch {
    return 0;
  }
}

export function assertModelBudget(missionId: string): { ok: true } | { ok: false; code: ModelFailureCode; reason: string } {
  const used = modelCallsUsed(missionId);
  if (used >= MAX_MODEL_CALLS_PER_MISSION) {
    return {
      ok: false,
      code: "MODEL_BUDGET_EXCEEDED",
      reason: `MODEL_BUDGET_EXCEEDED: MAX_MODEL_CALLS_PER_MISSION=${MAX_MODEL_CALLS_PER_MISSION} for the first-breath mission class — this mission already spent its single call (durable in model_call_log / model_budget); no automatic retry exists`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Telemetry — privacy-safe by construction (mission §10)
// ---------------------------------------------------------------------------
export interface ModelCallTelemetryRow {
  mission_id: string;
  provider_id: string;
  endpoint_class: string;
  model_name: string | null;
  model_digest: string | null;
  request_sha256: string;
  response_sha256: string | null;
  request_bytes: number | null;
  response_bytes: number | null;
  started_at: string;
  ended_at: string;
  duration_ms: number | null;
  result_status: string;
  model_call_count: number;
  authority: string;
  authority_delta: number;
  detail: string;
}

function recordModelCall(row: ModelCallTelemetryRow): void {
  // LOCAL_FOUNDER only — the public snapshot is never written
  if (RUNTIME_MODE !== "LOCAL_FOUNDER") return;
  run(
    `INSERT INTO model_call_log
      (ts, mission_id, provider_id, endpoint_class, model_name, model_digest,
       request_sha256, response_sha256, request_bytes, response_bytes,
       started_at, ended_at, duration_ms, result_status, model_call_count,
       authority, authority_delta, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    nowIso(), row.mission_id, row.provider_id, row.endpoint_class, row.model_name, row.model_digest,
    row.request_sha256, row.response_sha256, row.request_bytes, row.response_bytes,
    row.started_at, row.ended_at, row.duration_ms, row.result_status, row.model_call_count,
    row.authority, row.authority_delta, row.detail,
  );
}

export function modelCallLog(limit = 12): any[] {
  try {
    return all("SELECT id, ts, mission_id, provider_id, endpoint_class, model_name, model_digest, request_sha256, response_sha256, request_bytes, response_bytes, started_at, ended_at, duration_ms, result_status, model_call_count, authority, authority_delta, detail FROM model_call_log ORDER BY id DESC LIMIT ?", limit);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// THE bounded call — the single entry point every organ must use
// Observability 1A: every call is timed, every stage is an event, the budget
// reservation is atomic via PRIMARY KEY and happens BEFORE any network dispatch.
// ---------------------------------------------------------------------------
export async function modelCall(input: GenerateInput): Promise<ModelGenerateOk | ModelFailure> {
  const missionId = input.mission_id;

  // Mode law: model calls are legal in LOCAL_FOUNDER only. PUBLIC never calls.
  if (RUNTIME_MODE !== "LOCAL_FOUNDER") {
    return {
      ok: false, code: "MODEL_MODE_REFUSED",
      reason: "MODEL_MODE_REFUSED: model calls are legal in LOCAL_FOUNDER mode only — PUBLIC_REFERENCE never invokes, enumerates, or probes any model",
      provider_id: "none", endpoint_class: "NONE", endpoint: null, mission_id: missionId,
      authority: MODEL_AUTHORITY_LABEL,
    };
  }

  // 1. REQUEST — the observable entry point
  recordTiming(missionId, "REQUEST", `model=${input.model} digest=${(input.expected_digest ?? "null").slice(0, 19)}`);

  // 2. Atomic budget admission — BEFORE any dispatch. N concurrent at budget=1 → exactly ONE succeeds.
  const reservation = tryReserveBudget(missionId);
  if (!reservation.ok) {
    recordTiming(missionId, "BUDGET_REFUSED", reservation.reason.slice(0, 200));
    return {
      ok: false, code: reservation.code, reason: reservation.reason,
      provider_id: "local-ollama", endpoint_class: "LOOPBACK",
      endpoint: getModelSelection().endpoint, mission_id: missionId,
      authority: MODEL_AUTHORITY_LABEL,
    };
  }
  recordTiming(missionId, "BUDGET_ADMITTED", `limit=1 used_before=0`);

  const provider = resolveModelProvider();
  const selection = getModelSelection();

  if (!input.model || input.model.length === 0) {
    const reason = "MODEL_NOT_CONFIGURED: no selected model — configure one through POST /api/model/config under a local action envelope (LOCAL_FOUNDER only)";
    recordTiming(missionId, "GENERATION_FAILED", reason.slice(0, 120));
    recordModelCall({
      mission_id: missionId, provider_id: "local-ollama", endpoint_class: "LOOPBACK", model_name: null, model_digest: null,
      request_sha256: sha256hex(canonical({ mission: missionId, model: null, system: input.system, user: input.user })),
      response_sha256: null, request_bytes: Buffer.byteLength(input.system) + Buffer.byteLength(input.user), response_bytes: null,
      started_at: nowIso(), ended_at: nowIso(), duration_ms: 0, result_status: "MODEL_NOT_CONFIGURED", model_call_count: modelCallsUsed(missionId),
      authority: MODEL_AUTHORITY, authority_delta: AUTHORITY_DELTA, detail: reason,
    });
    return { ok: false, code: "MODEL_NOT_CONFIGURED", reason, provider_id: "local-ollama", endpoint_class: "LOOPBACK", endpoint: selection.endpoint, mission_id: missionId, authority: MODEL_AUTHORITY_LABEL };
  }

  if (!provider) {
    const reason = `LOCAL_MODEL_UNAVAILABLE: no local provider is resolvable at '${selection.endpoint}' — configuration refused or endpoint not loopback; there is NO remote fallback (mission law)`;
    recordTiming(missionId, "GENERATION_FAILED", reason.slice(0, 120));
    recordModelCall({
      mission_id: missionId, provider_id: "local-ollama", endpoint_class: "REFUSED_NONLOCAL", model_name: input.model, model_digest: input.expected_digest,
      request_sha256: sha256hex(canonical({ mission: missionId, model: input.model, system: input.system, user: input.user })),
      response_sha256: null, request_bytes: Buffer.byteLength(input.system) + Buffer.byteLength(input.user), response_bytes: null,
      started_at: nowIso(), ended_at: nowIso(), duration_ms: 0, result_status: "LOCAL_MODEL_UNAVAILABLE", model_call_count: modelCallsUsed(missionId),
      authority: MODEL_AUTHORITY, authority_delta: AUTHORITY_DELTA, detail: reason,
    });
    return { ok: false, code: "LOCAL_MODEL_UNAVAILABLE", reason, provider_id: "local-ollama", endpoint_class: "REFUSED_NONLOCAL", endpoint: selection.endpoint, mission_id: missionId, authority: MODEL_AUTHORITY_LABEL };
  }

  // Request size law — refuse before any network act
  const requestBytes = Buffer.byteLength(input.system) + Buffer.byteLength(input.user);
  if (requestBytes > MAX_REQUEST_BYTES) {
    const reason = `MODEL_REQUEST_TOO_LARGE: request is ${requestBytes}B, over the ${MAX_REQUEST_BYTES}B cap`;
    recordTiming(missionId, "GENERATION_FAILED", reason.slice(0, 120));
    recordModelCall({
      mission_id: missionId, provider_id: provider.id, endpoint_class: provider.endpointClass, model_name: input.model, model_digest: input.expected_digest,
      request_sha256: sha256hex(canonical({ mission: missionId, model: input.model, system: input.system, user: input.user })),
      response_sha256: null, request_bytes: requestBytes, response_bytes: null,
      started_at: nowIso(), ended_at: nowIso(), duration_ms: 0, result_status: "MODEL_REQUEST_TOO_LARGE", model_call_count: modelCallsUsed(missionId),
      authority: MODEL_AUTHORITY, authority_delta: AUTHORITY_DELTA, detail: reason,
    });
    return { ok: false, code: "MODEL_REQUEST_TOO_LARGE", reason, provider_id: provider.id, endpoint_class: provider.endpointClass, endpoint: provider.endpoint, mission_id: missionId, authority: MODEL_AUTHORITY_LABEL };
  }

  // 3. Pre-dispatch timing. Model listing verifies identity, not residency.
  recordTiming(missionId, "GENERATE_DISPATCHED", `endpoint=${provider.endpoint} model=${input.model}`);

  const startedAt = new Date();
  const result = await provider.generate(input);
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - startedAt.getTime();
  const callCount = modelCallsUsed(missionId); // reservation already counts as 1

  if (!result.ok) {
    // Failure timing — lifecycle branches to deadline/abort
    if (result.code === "MODEL_TIMEOUT") {
      recordTiming(missionId, "DEADLINE_EXCEEDED", `timeout_ms=${modelTimeoutMs()} duration_ms=${durationMs}`);
      recordTiming(missionId, "ABORT_EMITTED", `abort for ${missionId}`);
      recordTiming(missionId, "BACKEND_TERMINATION_UNKNOWN", `backend termination not observable after abort`);
    } else {
      recordTiming(missionId, "GENERATION_FAILED", `${result.code}: ${result.reason.slice(0, 120)}`);
    }
    // Failure telemetry — the attempt still consumes the single-call budget (reservation already held)
    recordModelCall({
      mission_id: missionId, provider_id: result.provider_id, endpoint_class: result.endpoint_class,
      model_name: input.model,
      model_digest: input.expected_digest,
      request_sha256: sha256hex(canonical({ mission: missionId, model: input.model, system: input.system, user: input.user })),
      response_sha256: null, request_bytes: requestBytes, response_bytes: null,
      started_at: startedAt.toISOString(), ended_at: endedAt.toISOString(), duration_ms: durationMs,
      result_status: result.code, model_call_count: callCount,
      authority: MODEL_AUTHORITY, authority_delta: AUTHORITY_DELTA,
      detail: result.reason.slice(0, 300),
    });
    return { ...result, code: result.code as ModelFailureCode, mission_id: missionId };
  }

  // Success timing — transport and stream object observability
  recordTiming(missionId, "FIRST_TRANSPORT_BYTES", `status=200 duration_ms=${durationMs}`);
  recordTiming(missionId, "FIRST_VALID_STREAM_OBJECT", `response_bytes=${result.response_bytes}`);
  // For stream=false the reasoning and answer are in the same object
  recordTiming(missionId, "FIRST_ANSWER_CONTENT", `response_sha256=${result.response_sha256.slice(0, 19)}`);
  recordTiming(missionId, "GENERATION_COMPLETE", `duration_ms=${durationMs} bytes=${result.response_bytes}`);

  // Success telemetry — hashes and metadata ONLY, never content (mission §10)
  recordModelCall({
    mission_id: missionId, provider_id: result.provider_id, endpoint_class: result.endpoint_class,
    model_name: result.identity.model_name, model_digest: result.identity.model_digest,
    request_sha256: result.request_sha256, response_sha256: result.response_sha256,
    request_bytes: result.request_bytes, response_bytes: result.response_bytes,
    started_at: result.started_at, ended_at: result.ended_at, duration_ms: result.duration_ms,
    result_status: "OK", model_call_count: callCount,
    authority: MODEL_AUTHORITY, authority_delta: AUTHORITY_DELTA,
    detail: `PROPOSE_ONLY proposal: ${result.response_bytes}B via ${result.provider_id} ${result.identity.model_digest ? `digest=${result.identity.model_digest.slice(0, 19)}…` : "digest=UNKNOWN"}`,
  });
  return result;
}

// ---------------------------------------------------------------------------
// Observation — the ONLY thing that may set READY (mission §15)
// ---------------------------------------------------------------------------
export interface ModelObservation {
  model_status: "NOT_CONNECTED_REFERENCE_MODE" | "UNCONFIGURED" | "NOT_DETECTED" | "READY" | "DEGRADED";
  probed: boolean;
  provider: { provider_id: string; kind: string; endpoint: string; endpoint_class: string } | null;
  selected: { model_name: string | null; model_digest: string | null } | null;
  observed: {
    model_name: string;
    model_digest: string | null;
    family: string;
    parameter_size: string;
    quantization_level: string;
    size: number | null;
    modified_at: string;
    observed_at: string;
  } | null;
  probe_failure?: { code: string; reason: string };
  authority: typeof MODEL_AUTHORITY_LABEL;
  law: string;
}

export const PUBLIC_MODEL_LAW =
  "PUBLIC_REFERENCE never probes local models — no request to port 11434, no model enumeration, no model invocation, no model configuration mutation, no capability escalation. The public/reference site stays safe and inert.";

/** PUBLIC projection: static, never a probe. */
export function publicModelProjection(): ModelObservation {
  return {
    model_status: "NOT_CONNECTED_REFERENCE_MODE",
    probed: false,
    provider: null,
    selected: null,
    observed: null,
    authority: MODEL_AUTHORITY_LABEL,
    law: PUBLIC_MODEL_LAW,
  };
}

const OBSERVATION_LAW =
  "READY requires a successful provider health/list-model observation — never configuration alone; model identity is digest-bound when a digest exists; model output is PROPOSE_ONLY with zero effect authority";

function selectionBase(selection: ModelSelection) {
  return {
    provider: { provider_id: "local-ollama", kind: "LOCAL_OLLAMA", endpoint: selection.endpoint, endpoint_class: "LOOPBACK" },
    selected: selection.unconfigured ? null : { model_name: selection.model, model_digest: selection.digest },
    authority: MODEL_AUTHORITY_LABEL,
    law: OBSERVATION_LAW,
  };
}

/** LOCAL observation: a real health/list-models probe against the loopback provider.
 *  The ONLY thing that may set READY (mission §15). */
export async function observeLocalModel(): Promise<ModelObservation> {
  const selection = getModelSelection();
  const base = selectionBase(selection);
  if (selection.unconfigured || !selection.model) {
    return { ...base, model_status: "UNCONFIGURED", probed: false, observed: null };
  }
  const provider = resolveModelProvider();
  if (!provider) {
    return {
      ...base, model_status: "NOT_DETECTED", probed: true, observed: null,
      probe_failure: { code: "MODEL_ENDPOINT_NONLOCAL", reason: "configured endpoint is not loopback — refused; LOCAL_FOUNDER never becomes REMOTE_MODEL mode" },
    };
  }
  const tags = await provider.listModels();
  if (!tags.ok) {
    // §15: LOCAL_FOUNDER + unavailable Ollama projects NOT DETECTED — honestly probed, honestly absent
    return {
      ...base, model_status: "NOT_DETECTED", probed: true, observed: null,
      probe_failure: { code: tags.code, reason: tags.reason },
    };
  }
  const found = tags.models.find((m) => m.model_name === selection.model);
  if (!found) {
    return {
      ...base, model_status: "NOT_DETECTED", probed: true, observed: null,
      probe_failure: { code: "MODEL_NOT_INSTALLED", reason: `selected model '${selection.model}' is not present at ${selection.endpoint} — no silent substitution` },
    };
  }
  const digestBound = selection.digest == null || found.model_digest === selection.digest;
  const unknown = (v: string | null) => (v == null ? "UNKNOWN" : v);
  return {
    ...base,
    model_status: digestBound ? "READY" : "DEGRADED",
    probed: true,
    observed: {
      model_name: found.model_name,
      model_digest: found.model_digest,
      family: unknown(found.family),
      parameter_size: unknown(found.parameter_size),
      quantization_level: unknown(found.quantization_level),
      size: found.size,
      modified_at: unknown(found.modified_at),
      observed_at: nowIso(),
    },
    probe_failure: digestBound ? undefined : { code: "MODEL_IDENTITY_MISMATCH", reason: "configured digest does not match the observed model digest — a model change is an observable state transition and requires explicit reconfiguration" },
  };
}

/** The /api/state projection: PUBLIC is static; LOCAL replays the last cached
 *  observation (kv) — building state NEVER probes. A fresh observation happens
 *  only on the dedicated GET /api/model route. */
export function modelStateProjection(): ModelObservation {
  if (RUNTIME_MODE === "PUBLIC_REFERENCE") return publicModelProjection();
  const cached = kv("model_observation");
  if (cached) {
    try {
      return JSON.parse(cached) as ModelObservation;
    } catch {
      /* fall through to the honest unobserved projection */
    }
  }
  const selection = getModelSelection();
  return {
    ...selectionBase(selection),
    model_status: selection.unconfigured || !selection.model ? "UNCONFIGURED" : "NOT_DETECTED",
    probed: false,
    observed: null,
  };
}

/** Cache an observation for the state projection (LOCAL_FOUNDER only — PUBLIC never writes). */
export function cacheModelObservation(obs: ModelObservation): void {
  if (RUNTIME_MODE !== "LOCAL_FOUNDER") return;
  try {
    kv("model_observation", JSON.stringify(obs));
  } catch {
    /* observation caching must never break the route */
  }
}

export { loadModelConfig, saveModelConfigAtomic, modelConfigPath, MODEL_CONFIG_SCHEMA, ollamaFetch };
export type { ModelProviderConfigFile };
