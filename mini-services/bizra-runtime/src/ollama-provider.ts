/**
 * BIZRA Node0 — LocalOllamaProvider (LOCAL-MODEL-PROVIDER-1A §3).
 *
 * The ONLY provider implementation in this runtime: a local Ollama adapter
 * over the loopback endpoint (default http://127.0.0.1:11434). It implements
 * the model-neutral ModelProvider contract — the rest of BIZRA never touches
 * an Ollama-shaped object directly.
 *
 * Protocol surface (exactly what is required, nothing more):
 *   GET  /api/tags                     — health + model enumeration + identity
 *   POST /api/show                     — model metadata (when useful)
 *   POST /api/generate (stream=false)  — one bounded generation
 *
 * Hard laws encoded here:
 *   - the endpoint is LOOPBACK-CLASS ONLY (validated at construction);
 *   - redirects are NEVER followed: a redirect to a non-loopback destination
 *     is refused as MODEL_REDIRECT_NONLOCAL; even a loopback redirect is
 *     refused as a protocol error (deterministic, never silent);
 *   - identity is DIGEST-BOUND: a configured digest that does not match the
 *     observed model digest refuses the call — a model change is an observable
 *     state transition, never a silent fallback;
 *   - unknown identity fields stay UNKNOWN — nothing is fabricated;
 *   - every failure preserves PROPOSE_ONLY authority and authority_delta = 0.
 *
 * This adapter uses the runtime's standard fetch facilities only — no new
 * dependency was added for it.
 */
import { createHash } from "node:crypto";
import { classifyEndpoint, modelTimeoutMs, MAX_OUTPUT_BYTES, MODEL_AUTHORITY_LABEL } from "./model-config";

export interface OllamaIdentity {
  provider: string;
  model_name: string;
  model_digest: string | null;
  family: string | null;
  parameter_size: string | null;
  quantization_level: string | null;
  size: number | null;
  modified_at: string | null;
}

/** fetch with: manual redirects (never auto-followed), hard timeout, abort. */
export async function ollamaFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, redirect: "manual", signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

function classifyRedirect(res: Response): { code: "MODEL_REDIRECT_NONLOCAL" | "MODEL_PROTOCOL_ERROR"; reason: string } | null {
  if (res.status < 300 || res.status > 399) return null;
  const loc = res.headers.get("location");
  if (!loc) {
    return { code: "MODEL_PROTOCOL_ERROR", reason: `MODEL_PROTOCOL_ERROR: provider answered ${res.status} without a Location header — redirects are never followed` };
  }
  const target = classifyEndpoint(loc);
  if (!target.ok) {
    return {
      code: "MODEL_REDIRECT_NONLOCAL",
      reason: `MODEL_REDIRECT_NONLOCAL: the loopback provider redirected to a non-loopback destination '${loc.slice(0, 80)}' — refused, never followed; LOCAL_FOUNDER must never silently become REMOTE_MODEL mode`,
    };
  }
  return {
    code: "MODEL_PROTOCOL_ERROR",
    reason: `MODEL_PROTOCOL_ERROR: provider redirected to '${loc.slice(0, 80)}' — redirects are never followed, even loopback ones (deterministic refusal)`,
  };
}

/** Distinguish timeout (abort) from transport failure (refused/unreachable). */
function transportFailure(e: unknown, endpoint: string): { code: "MODEL_TIMEOUT" | "LOCAL_MODEL_UNAVAILABLE"; reason: string } {
  const err = e as { name?: string; message?: string; cause?: { code?: string } };
  if (err?.name === "AbortError" || err?.name === "TimeoutError") {
    return { code: "MODEL_TIMEOUT", reason: `MODEL_TIMEOUT: the local provider at ${endpoint} did not answer within the configured timeout — aborted; no retry exists (single-call budget law)` };
  }
  return {
    code: "LOCAL_MODEL_UNAVAILABLE",
    reason: `LOCAL_MODEL_UNAVAILABLE: no local model provider answered at ${endpoint} (${String(err?.cause?.code ?? err?.message ?? e).slice(0, 120)}) — there is NO remote fallback, only an honest failure`,
  };
}

export class LocalOllamaProvider {
  readonly id = "local-ollama";
  readonly kind = "LOCAL_OLLAMA";
  readonly endpoint: string;
  readonly endpointClass = "LOOPBACK";

  constructor(endpoint: string) {
    const cls = classifyEndpoint(endpoint);
    if (!cls.ok) throw new Error(cls.refused); // never constructed for a non-loopback endpoint
    this.endpoint = cls.endpoint;
  }

  private tagsUrl(): string {
    return `${this.endpoint}/api/tags`;
  }

  // -- GET /api/tags ---------------------------------------------------------
  async listModels(): Promise<{ ok: true; models: OllamaIdentity[] } | { ok: false; code: string; reason: string }> {
    let res: Response;
    try {
      res = await ollamaFetch(this.tagsUrl(), { method: "GET", headers: { accept: "application/json" } }, Math.min(modelTimeoutMs(), 5000));
    } catch (e) {
      const t = transportFailure(e, this.endpoint);
      return { ok: false, code: t.code, reason: t.reason };
    }
    const redirect = classifyRedirect(res);
    if (redirect) return { ok: false, code: redirect.code, reason: redirect.reason };
    if (res.status === 404) {
      return { ok: false, code: "MODEL_PROTOCOL_ERROR", reason: `MODEL_PROTOCOL_ERROR: ${this.endpoint} answered 404 for /api/tags — this is not an Ollama-compatible local provider` };
    }
    if (res.status !== 200) {
      return { ok: false, code: "MODEL_PROTOCOL_ERROR", reason: `MODEL_PROTOCOL_ERROR: /api/tags answered HTTP ${res.status}` };
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      return { ok: false, code: "MODEL_PROTOCOL_ERROR", reason: "MODEL_PROTOCOL_ERROR: /api/tags body is not valid JSON" };
    }
    const models = (data as { models?: unknown })?.models;
    if (!Array.isArray(models)) {
      return { ok: false, code: "MODEL_PROTOCOL_ERROR", reason: "MODEL_PROTOCOL_ERROR: /api/tags JSON has no models array" };
    }
    const identities: OllamaIdentity[] = [];
    for (const m of models) {
      const mm = m as Record<string, unknown>;
      const name = typeof mm.name === "string" ? mm.name : typeof mm.model === "string" ? (mm.model as string) : null;
      if (!name) continue;
      const details = (mm.details ?? {}) as Record<string, unknown>;
      identities.push({
        provider: this.id,
        model_name: name,
        model_digest: typeof mm.digest === "string" && mm.digest.length > 0 ? mm.digest : null,
        family: typeof details.family === "string" ? details.family : null,
        parameter_size: typeof details.parameter_size === "string" ? details.parameter_size : null,
        quantization_level: typeof details.quantization_level === "string" ? details.quantization_level : null,
        size: typeof mm.size === "number" ? mm.size : null,
        modified_at: typeof mm.modified_at === "string" ? mm.modified_at : null,
      });
    }
    return { ok: true, models: identities };
  }

  async health(): Promise<{ state: string; provider_id: string; kind: string; endpoint: string; endpoint_class: string; reason?: string }> {
    const res = await this.listModels();
    if (res.ok) {
      return { state: "READY", provider_id: this.id, kind: this.kind, endpoint: this.endpoint, endpoint_class: this.endpointClass };
    }
    return { state: "UNAVAILABLE", provider_id: this.id, kind: this.kind, endpoint: this.endpoint, endpoint_class: this.endpointClass, reason: res.reason };
  }

  // -- POST /api/show (metadata only, when useful) ---------------------------
  async inspectModel(model: string): Promise<{ ok: true; identity: OllamaIdentity } | { ok: false; code: string; reason: string }> {
    let res: Response;
    try {
      res = await ollamaFetch(`${this.endpoint}/api/show`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model }),
      }, Math.min(modelTimeoutMs(), 5000));
    } catch (e) {
      const t = transportFailure(e, this.endpoint);
      return { ok: false, code: t.code, reason: t.reason };
    }
    const redirect = classifyRedirect(res);
    if (redirect) return { ok: false, code: redirect.code, reason: redirect.reason };
    if (res.status === 404) {
      return { ok: false, code: "MODEL_NOT_INSTALLED", reason: `MODEL_NOT_INSTALLED: model '${model}' is not installed at ${this.endpoint} — install it locally or reconfigure under a local action envelope; there is no silent substitution` };
    }
    if (res.status !== 200) {
      return { ok: false, code: "MODEL_PROTOCOL_ERROR", reason: `MODEL_PROTOCOL_ERROR: /api/show answered HTTP ${res.status}` };
    }
    try {
      const data = (await res.json()) as Record<string, unknown>;
      const details = (data.details ?? {}) as Record<string, unknown>;
      return {
        ok: true,
        identity: {
          provider: this.id,
          model_name: model,
          model_digest: typeof data.digest === "string" && data.digest.length > 0 ? data.digest : null,
          family: typeof details.family === "string" ? details.family : null,
          parameter_size: typeof details.parameter_size === "string" ? details.parameter_size : null,
          quantization_level: typeof details.quantization_level === "string" ? details.quantization_level : null,
          size: null,
          modified_at: typeof data.modified_at === "string" ? data.modified_at : null,
        },
      };
    } catch {
      return { ok: false, code: "MODEL_PROTOCOL_ERROR", reason: "MODEL_PROTOCOL_ERROR: /api/show body is not valid JSON" };
    }
  }

  // -- POST /api/generate (stream=false) — the ONE bounded call ---------------
  async generate(input: {
    mission_id: string;
    model: string;
    expected_digest: string | null;
    system: string;
    user: string;
  }): Promise<
    | {
        ok: true;
        text: string;
        identity: OllamaIdentity;
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
    | { ok: false; code: string; reason: string; provider_id: string; endpoint_class: string; endpoint: string; mission_id: string; authority: typeof MODEL_AUTHORITY_LABEL }
  > {
    const fail = (code: string, reason: string) =>
      ({ ok: false as const, code, reason, provider_id: this.id, endpoint_class: this.endpointClass, endpoint: this.endpoint, mission_id: input.mission_id, authority: MODEL_AUTHORITY_LABEL });

    // 1. IDENTITY FIRST — never send a prompt to an unknown model (mission §4)
    const tags = await this.listModels();
    if (!tags.ok) return fail(tags.code, tags.reason);
    const identity = tags.models.find((m) => m.model_name === input.model);
    if (!identity) {
      return fail(
        "MODEL_NOT_INSTALLED",
        `MODEL_NOT_INSTALLED: model '${input.model}' is not present at ${this.endpoint} — the configured model was not found by the provider; there is no silent substitution (a model change is an observable state transition requiring explicit reconfiguration)`,
      );
    }
    // 2. DIGEST BINDING — a configured digest that does not match refuses (mission §4)
    if (input.expected_digest != null && identity.model_digest !== input.expected_digest) {
      return fail(
        "MODEL_IDENTITY_MISMATCH",
        `MODEL_IDENTITY_MISMATCH: the configured digest binding does not match the observed model — configured '${input.expected_digest.slice(0, 19)}…' vs observed '${(identity.model_digest ?? "NONE").slice(0, 19)}…' — a model change is an observable state transition; reconfigure explicitly under a local action envelope`,
      );
    }

    // 3. THE single generate call — stream=false, hard timeout, no retry
    const requestSha = createHash("sha256")
      .update(`${input.system}\n\n${input.user}`)
      .digest("hex");
    const requestBytes = Buffer.byteLength(input.system) + Buffer.byteLength(input.user);
    const startedAt = new Date();
    let res: Response;
    try {
      res = await ollamaFetch(`${this.endpoint}/api/generate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model: input.model, system: input.system, prompt: input.user, stream: false }),
      }, modelTimeoutMs());
    } catch (e) {
      const t = transportFailure(e, this.endpoint);
      return fail(t.code, t.reason);
    }
    const endedAt = new Date();

    const redirect = classifyRedirect(res);
    if (redirect) return fail(redirect.code, redirect.reason);
    if (res.status === 404) {
      return fail("MODEL_NOT_INSTALLED", `MODEL_NOT_INSTALLED: /api/generate answered 404 for model '${input.model}' — the model is not installed at ${this.endpoint}`);
    }
    if (res.status !== 200) {
      return fail("MODEL_PROTOCOL_ERROR", `MODEL_PROTOCOL_ERROR: /api/generate answered HTTP ${res.status} for model '${input.model}' — the failure is named, never retried, and never falls back to another model`);
    }
    let data: Record<string, unknown>;
    try {
      data = (await res.json()) as Record<string, unknown>;
    } catch {
      return fail("MODEL_PROTOCOL_ERROR", "MODEL_PROTOCOL_ERROR: /api/generate body is not valid JSON");
    }
    const text = data.response;
    if (typeof text !== "string" || text.length === 0) {
      return fail("MODEL_PROTOCOL_ERROR", "MODEL_PROTOCOL_ERROR: /api/generate JSON has no non-empty 'response' string");
    }
    if (Buffer.byteLength(text) > MAX_OUTPUT_BYTES) {
      return fail("MODEL_OUTPUT_EXCEEDED", `MODEL_OUTPUT_EXCEEDED: model output is ${Buffer.byteLength(text)}B, over the ${MAX_OUTPUT_BYTES}B configured output cap`);
    }

    const responseSha = createHash("sha256").update(text).digest("hex");
    return {
      ok: true,
      text,
      identity,
      provider_id: this.id,
      endpoint: this.endpoint,
      endpoint_class: this.endpointClass,
      mission_id: input.mission_id,
      request_sha256: requestSha,
      response_sha256: responseSha,
      request_bytes: requestBytes,
      response_bytes: Buffer.byteLength(text),
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      duration_ms: endedAt.getTime() - startedAt.getTime(),
      authority: MODEL_AUTHORITY_LABEL,
    };
  }
}
