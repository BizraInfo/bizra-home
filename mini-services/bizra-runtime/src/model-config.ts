/**
 * BIZRA Node0 — local model provider configuration (LOCAL-MODEL-PROVIDER-1A §7).
 *
 * <BIZRA_STATE_ROOT>/config/model-provider.json
 *
 *   { schema, provider_id, endpoint, endpoint_class, selected_model,
 *     selected_model_digest, updated_at, updated_by_principal }
 *
 * WRITE LAW: this file is written ONLY through the local-control authority
 * envelope (POST /api/model/config, action_class MODEL_CONFIG_SET) with a
 * server-resolved principal and a fresh nonce. No browser-generated authority.
 * The file is 0600 where POSIX permissions apply, written atomically
 * (temp file + rename). The HTTP surface never sees the key.
 *
 * ENDPOINT LAW (mission §3): configuration accepts LOOPBACK endpoints only —
 * 127.0.0.1, localhost, ::1 (the 127.0.0.0/8 loopback class). Refused:
 * 0.0.0.0, LAN addresses, Tailscale addresses, public IPs, remote DNS hosts.
 * LOCAL_FOUNDER must never silently become REMOTE_MODEL mode.
 */
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { nowIso } from "./hash";

// ---------------------------------------------------------------------------
// Provider LAWS shared by every model module (authority, budget, limits)
// (kept here so ollama-provider never imports model-provider — no import cycle)
// ---------------------------------------------------------------------------
export const MODEL_AUTHORITY = "PROPOSE_ONLY" as const;
export const AUTHORITY_DELTA = 0 as const;
export const MODEL_AUTHORITY_LABEL = { model_authority: MODEL_AUTHORITY, authority_delta: AUTHORITY_DELTA } as const;
export const MAX_MODEL_CALLS_PER_MISSION = 1;
export const MAX_OUTPUT_BYTES = 8192;
export const MAX_REQUEST_BYTES = 65536;

export function modelTimeoutMs(): number {
  const n = Number(process.env.BIZRA_MODEL_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 100 ? Math.floor(n) : 20000;
}

export const MODEL_CONFIG_SCHEMA = "bizra.node0.model_provider_config.v1";
export const PROVIDER_ID_LOCAL_OLLAMA = "local-ollama";
export const DEFAULT_OLLAMA_ENDPOINT = "http://127.0.0.1:11434";

export interface ModelProviderConfigFile {
  schema: string;
  provider_id: string;
  endpoint: string;
  endpoint_class: string;
  selected_model: string | null;
  selected_model_digest: string | null;
  updated_at: string;
  updated_by_principal: string;
}

export function modelConfigPath(stateRoot: string): string {
  return join(stateRoot, "config", "model-provider.json");
}

export function loadModelConfig(stateRoot: string): ModelProviderConfigFile | null {
  const p = modelConfigPath(stateRoot);
  if (!existsSync(p)) return null;
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as ModelProviderConfigFile;
    if (!raw || typeof raw !== "object") return null;
    if (raw.schema !== MODEL_CONFIG_SCHEMA) return null;
    return raw;
  } catch {
    return null;
  }
}

/** Atomic config write: temp file + rename, mode 0600 where POSIX applies. */
export function saveModelConfigAtomic(stateRoot: string, cfg: ModelProviderConfigFile): void {
  const p = modelConfigPath(stateRoot);
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  renameSync(tmp, p);
}

// ---------------------------------------------------------------------------
// LOOPBACK-ONLY endpoint policy (mission §3)
// ---------------------------------------------------------------------------

/** Is this host in the loopback class? 127.0.0.0/8, ::1, or the literal `localhost`. */
export function isLoopbackHost(hostname: string): boolean {
  const h = String(hostname).toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (h === "localhost" || h === "::1") return true;
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    if (octets.some((o) => o > 255)) return false;
    return octets[0] === 127; // the IPv4 loopback class 127.0.0.0/8
  }
  return false;
}

export type EndpointClassification =
  | { ok: true; endpoint: string; hostname: string; class: "LOOPBACK" }
  | { ok: false; refused: string };

/** Classify a proposed provider endpoint. Anything not loopback is REFUSED. */
export function classifyEndpoint(raw: string): EndpointClassification {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, refused: "MODEL_ENDPOINT_NONLOCAL: the endpoint is empty — LOCAL_FOUNDER accepts loopback endpoints only (127.0.0.1, localhost, ::1)" };
  }
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, refused: `MODEL_ENDPOINT_NONLOCAL: '${raw.slice(0, 60)}' is not a parsable endpoint URL — LOCAL_FOUNDER accepts loopback endpoints only (127.0.0.1, localhost, ::1)` };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, refused: `MODEL_ENDPOINT_NONLOCAL: protocol '${url.protocol}' is refused — only http(s) loopback endpoints are configurable in LOCAL_FOUNDER` };
  }
  const host = url.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (host === "0.0.0.0" || host === "::" || host === "") {
    return { ok: false, refused: `MODEL_ENDPOINT_NONLOCAL: wildcard bind '${host}' is not a loopback endpoint — a wildcard would silently become REMOTE_MODEL mode; refused` };
  }
  if (!isLoopbackHost(host)) {
    return {
      ok: false,
      refused: `MODEL_ENDPOINT_NONLOCAL: '${host}' is not a loopback host — LOCAL_FOUNDER may configure 127.0.0.1, localhost, or ::1 only; LAN, Tailscale, public, and remote DNS hosts are refused (LOCAL_FOUNDER never silently becomes REMOTE_MODEL mode)`,
    };
  }
  return { ok: true, endpoint: url.origin, hostname: host, class: "LOOPBACK" };
}

/** The canonical first configuration record (used by the envelope-gated route). */
export function newModelConfig(opts: {
  endpoint: string;
  selected_model: string | null;
  selected_model_digest: string | null;
  updated_by_principal: string;
}): ModelProviderConfigFile {
  return {
    schema: MODEL_CONFIG_SCHEMA,
    provider_id: PROVIDER_ID_LOCAL_OLLAMA,
    endpoint: opts.endpoint,
    endpoint_class: "LOOPBACK",
    selected_model: opts.selected_model,
    selected_model_digest: opts.selected_model_digest,
    updated_at: nowIso(),
    updated_by_principal: opts.updated_by_principal,
  };
}
