/**
 * BIZRA Node0 — the local control-key initializer command (CONTROL-PLANE-SEAL-1B §3.1).
 *
 * This is the honest successor of the 1A-era `src/local-init.ts` — which was
 * accidentally ignored by `.gitignore:43 local-*` and therefore never entered
 * the committed tree (the 1A receipt's unreproducible manifest entry). This
 * file's name is deliberately NOT matched by any ignore pattern.
 *
 * Law:
 *   - requires an explicit external BIZRA_STATE_ROOT;
 *   - refuses a state root inside the source tree;
 *   - generates exactly 32 cryptographically random bytes;
 *   - writes the key mode 0600 OUTSIDE the repo (<root>/keys/<key_id>.key);
 *   - creates/updates the server-side principal registry atomically
 *     (key_id -> local_control_principal_id, LOCAL_CAPABILITY_ONLY);
 *   - prints ONLY non-secret identifiers — never key bytes;
 *   - refuses overwrite unless the separately explicit --rotate operation is used.
 *
 * Run:  BIZRA_STATE_ROOT=<absolute path outside the repo> bun src/init-control-key.ts [--rotate]
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { keyIdFor } from "./envelope";
import { upsertPrincipal, rotatePrincipal, registryPath, AUTHORITY_CLASS, CANONICAL_PRINCIPAL_STATUS, DEFAULT_LOCAL_CONTROL_PRINCIPAL, loadRegistry } from "./principal-registry";

const SERVICE_DIR = resolve(import.meta.dir, "..");

function refuse(red: string, message: string): never {
  console.error(`[CONTROL-PLANE-1B][RED] ${red}: ${message}`);
  process.exit(1);
}

function isInside(child: string, parent: string): boolean {
  const c = resolve(child) + sep;
  const p = resolve(parent) + sep;
  return c === p || c.startsWith(p);
}

const root = process.env.BIZRA_STATE_ROOT;
if (!root) {
  refuse("STATE_ROOT_REQUIRED", "BIZRA_STATE_ROOT must be set explicitly — an implicit root is a refusal, not a default");
}
if (isInside(root, SERVICE_DIR)) {
  refuse("STATE_ROOT_INSIDE_SOURCE_TREE", "the state root must live outside the source tree — the tree is not runtime authority");
}

const rotate = process.argv.includes("--rotate");
const principalArg = process.argv.find((a) => a.startsWith("--principal="));
const principalId = principalArg ? principalArg.slice("--principal=".length) : DEFAULT_LOCAL_CONTROL_PRINCIPAL;

const keysDir = join(resolve(root), "keys");
mkdirSync(keysDir, { recursive: true });

// one ACTIVE control key per root: a second initializer run REFUSES unless the
// separately explicit --rotate operation is used (rotation marks the old key
// ROTATED — history kept, never deleted)
const registry = loadRegistry(resolve(root));
const activeKeys = registry.entries.filter((e) => e.status === "ACTIVE");
if (activeKeys.length > 0 && !rotate) {
  refuse(
    "CONTROL_KEY_EXISTS",
    `an ACTIVE local control key already exists (key_id ${activeKeys[0].key_id}) — overwriting the control key requires the separately explicit --rotate operation`,
  );
}

// key_id = sha256(key bytes) prefix — derived BEFORE writing, so the filename is the identity
const key = randomBytes(32);
const keyId = keyIdFor(key);
const keyPath = join(keysDir, `${keyId}.key`);

if (existsSync(keyPath) && !rotate) {
  refuse(
    "KEY_OVERWRITE_REFUSED",
    `key file ${keyPath} already exists — overwrite requires the separately explicit --rotate operation`,
  );
}

// if rotating, mark the previous ACTIVE key ROTATED (history kept)
if (rotate && activeKeys.length > 0) {
  const oldKeyId = activeKeys[0].key_id;
  rotatePrincipal(resolve(root), oldKeyId, keyId, principalId);
} else {
  upsertPrincipal(resolve(root), keyId, principalId);
}

writeFileSync(keyPath, key, { mode: 0o600 });
// enforce 0600 even if the fs applied a umask
try { (await import("node:fs")).chmodSync(keyPath, 0o600); } catch { /* best-effort; mode asserted below */ }

const st = statSync(keyPath);
if ((st.mode & 0o777) !== 0o600) {
  refuse("KEY_MODE_WRONG", `key file mode ${(st.mode & 0o777).toString(8)} — expected 600`);
}

// print ONLY non-secret identifiers
console.log(
  JSON.stringify(
    {
      ok: true,
      key_id: keyId,
      local_control_principal_id: principalId,
      authority_class: AUTHORITY_CLASS,
      canonical_principal_status: CANONICAL_PRINCIPAL_STATUS,
      key_path: keyPath,
      registry_path: registryPath(resolve(root)),
      rotated: rotate,
      law: "the key never leaves this machine; only key_id is ever printed; possession proves LOCAL_CAPABILITY_ONLY — not identity, not sovereignty",
    },
    null,
    2,
  ),
);
