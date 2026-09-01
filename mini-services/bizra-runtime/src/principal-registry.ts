/**
 * BIZRA Node0 — server-side local-control principal registry (CONTROL-PLANE-SEAL-1B §3.2).
 *
 * The law this module enforces:
 *   key_id -> local_control_principal_id
 * is resolved SERVER-SIDE, from a registry file inside the state root
 * (<state-root>/keys/principals.json). No caller field may override it.
 *
 * Authority honesty:
 *   - authority_class is LOCAL_CAPABILITY_ONLY: possession of this key proves
 *     local control capability — it is NOT a signature ceremony and NOT the
 *     chain-sealed Node0 principal (that identity does not exist yet:
 *     canonical_principal_status stays ABSENT).
 *   - the registry is written only by the dedicated initializer command
 *     (src/init-control-key.ts) or its explicit rotation, atomically
 *     (temp file + rename). The HTTP surface never writes it.
 */
import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { nowIso } from "./hash";

export const AUTHORITY_CLASS = "LOCAL_CAPABILITY_ONLY";
export const CANONICAL_PRINCIPAL_STATUS = "ABSENT";
export const DEFAULT_LOCAL_CONTROL_PRINCIPAL = "local:mumu:founder-control";

export interface PrincipalRecord {
  key_id: string;
  local_control_principal_id: string;
  authority_class: string;
  canonical_principal_status: string;
  created_at: string;
  status: "ACTIVE" | "ROTATED";
  rotated_at?: string;
  rotated_to?: string;
}

export interface RegistryFile {
  schema: string;
  updated_at: string;
  entries: PrincipalRecord[];
}

export function registryPath(stateRoot: string): string {
  return join(stateRoot, "keys", "principals.json");
}

export function loadRegistry(stateRoot: string): RegistryFile {
  const p = registryPath(stateRoot);
  if (!existsSync(p)) return { schema: "bizra.node0.principal_registry.v1", updated_at: nowIso(), entries: [] };
  try {
    const raw = JSON.parse(readFileSync(p, "utf8")) as RegistryFile;
    if (!Array.isArray(raw.entries)) return { schema: "bizra.node0.principal_registry.v1", updated_at: nowIso(), entries: [] };
    return raw;
  } catch {
    return { schema: "bizra.node0.principal_registry.v1", updated_at: nowIso(), entries: [] };
  }
}

/** Resolve a key to its principal record — the ONLY authority resolution path. */
export function resolvePrincipal(stateRoot: string, keyId: string): PrincipalRecord | null {
  const reg = loadRegistry(stateRoot);
  const rec = reg.entries.find((e) => e.key_id === keyId);
  if (!rec || rec.status !== "ACTIVE") return null;
  return rec;
}

/** All known principal ids (for reserved-label defense: a caller actor_id may not claim another principal). */
export function knownPrincipalIds(stateRoot: string): Set<string> {
  const reg = loadRegistry(stateRoot);
  return new Set(reg.entries.map((e) => e.local_control_principal_id));
}

/** Atomic registry write: temp file + rename. Only the initializer command calls this. */
export function saveRegistryAtomic(stateRoot: string, registry: RegistryFile): void {
  const p = registryPath(stateRoot);
  mkdirSync(dirname(p), { recursive: true });
  const tmp = `${p}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(registry, null, 2), { mode: 0o600 });
  renameSync(tmp, p);
}

/** Upsert a principal record binding key_id -> local_control_principal_id. */
export function upsertPrincipal(stateRoot: string, keyId: string, principalId: string): PrincipalRecord {
  const reg = loadRegistry(stateRoot);
  const existing = reg.entries.find((e) => e.key_id === keyId);
  const rec: PrincipalRecord = existing
    ? { ...existing, local_control_principal_id: principalId, status: "ACTIVE" }
    : {
        key_id: keyId,
        local_control_principal_id: principalId,
        authority_class: AUTHORITY_CLASS,
        canonical_principal_status: CANONICAL_PRINCIPAL_STATUS,
        created_at: nowIso(),
        status: "ACTIVE",
      };
  const entries = existing ? reg.entries.map((e) => (e.key_id === keyId ? rec : e)) : [...reg.entries, rec];
  saveRegistryAtomic(stateRoot, { ...reg, updated_at: nowIso(), entries });
  return rec;
}

/** Explicit rotation: mark the old key ROTATED (never silently delete — history is kept). */
export function rotatePrincipal(stateRoot: string, oldKeyId: string, newKeyId: string, principalId: string): PrincipalRecord {
  const reg = loadRegistry(stateRoot);
  const entries = reg.entries.map((e) =>
    e.key_id === oldKeyId ? { ...e, status: "ROTATED" as const, rotated_at: nowIso(), rotated_to: newKeyId } : e,
  );
  saveRegistryAtomic(stateRoot, { ...reg, updated_at: nowIso(), entries });
  return upsertPrincipal(stateRoot, newKeyId, principalId);
}
