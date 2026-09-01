/**
 * BIZRA Node0 — the Constitution Vault.
 * The three root files (themassage.pdf, bizra.pdf, BIZRA_Third_Fact_v0_1_FINAL.pdf)
 * are the hash-sealed root of the system — byte drift halts the engine.
 * Sealed once at commission; re-verified on every boot and on every /api/verify.
 * Any byte drift => the engine HALTS. Nothing proceeds over a broken constitution.
 * Physical permission immutability is not claimed; what is proven is hash-seal + drift detection.
 *
 * Portability law (artifact identity != location):
 *   historical absolute path in DB = provenance only
 *   current logical slot = server-owned STATE_ROOT + fixed VAULT_DIR + expected name
 *   + regular-file / no-symlink / containment checks + sealed byte hash = identity
 */
import { readFileSync, statSync, lstatSync } from "node:fs";
import { join, resolve } from "node:path";
import { all, one, run } from "./store";
import { VAULT_DIR } from "./store";
import { sha256hex, sha256obj, nowIso } from "./hash";
import { appendReceipt } from "./chain";
import { relay } from "./dema";

export interface RootFile {
  name: string;
  role: string;
  path: string;
  bytes: number;
  sha256: string;
  sealed_at: string;
}

const ROOT_FILES: { name: string; role: string }[] = [
  { name: "themassage.pdf", role: "ROOT-I · THE MESSAGE — origin intent" },
  { name: "bizra.pdf", role: "ROOT-II · THE ARCHITECTURE — constitutional law" },
  { name: "BIZRA_Third_Fact_v0_1_FINAL.pdf", role: "ROOT-III · THE THIRD FACT — sealed reality" },
];

export function constitutionRoot(): string | null {
  const rows = all<RootFile>("SELECT name, role, path, bytes, sha256, sealed_at FROM constitution ORDER BY id ASC");
  if (rows.length === 0) return null;
  return sha256obj(rows.map((r) => r.sha256));
}

export function isSealed(): boolean {
  return all<any>("SELECT id FROM constitution").length > 0;
}

/** Seal the root. Once. Never again. */
export function sealConstitution(): { root: string; files: RootFile[] } {
  if (isSealed()) {
    // The constitution is sealed. A second seal attempt is a constitutional event, refused and recorded.
    relay("REFUSED", "CONSTITUTION", "second seal attempt — the root is already sealed", undefined);
    const files = all<RootFile>("SELECT name, role, path, bytes, sha256, sealed_at FROM constitution ORDER BY id ASC");
    return { root: constitutionRoot()!, files };
  }
  const sealed_at = nowIso();
  const files: RootFile[] = [];
  for (const f of ROOT_FILES) {
    const path = join(VAULT_DIR, f.name);
    const bytes = readFileSync(path);
    const sha256 = sha256hex(bytes);
    const size = statSync(path).size;
    run(
      "INSERT INTO constitution (name, role, path, bytes, sha256, sealed_at) VALUES (?, ?, ?, ?, ?, ?)",
      f.name, f.role, path, size, sha256, sealed_at,
    );
    files.push({ name: f.name, role: f.role, path, bytes: size, sha256, sealed_at });
  }
  const root = sha256obj(files.map((f) => f.sha256));
  const receipt = appendReceipt("CONSTITUTION_SEALED", "NODE0-ROOT", {
    root_hash: root,
    files: files.map((f) => ({ name: f.name, sha256: f.sha256, bytes: f.bytes })),
    law: "hash-sealed — byte drift halts the engine; physical permission immutability not claimed",
  });
  relay("DONE", "CONSTITUTION_SEALED", "3 root files sealed", receipt.digest);
  return { root, files };
}

export interface ConstitutionVerification {
  verified: boolean;
  root: string | null;
  files: { name: string; role: string; bytes: number; sha256: string; verified: boolean }[];
  drift: string[];
}

/** Re-read the vault bytes and compare. Drift is fatal.
 * Logical-slot verification: historical r.path is provenance only.
 * Current slot = VAULT_DIR + r.name, with containment + symlink + regular-file checks.
 * This makes the sealed DB portable across relocations and temp roots:
 *   historical absolute path = provenance
 *   current logical slot      = location
 *   content hash              = identity
 */
export function verifyConstitution(): ConstitutionVerification {
  const rows = all<RootFile>("SELECT name, role, path, bytes, sha256, sealed_at FROM constitution ORDER BY id ASC");
  const drift: string[] = [];
  const vaultResolved = resolve(VAULT_DIR);
  const files = rows.map((r) => {
    let verified = false;
    // Fixed logical slot for this artifact
    const currentPath = join(VAULT_DIR, r.name);
    const currentResolved = resolve(currentPath);
    // Containment: must stay inside the vault (no traversal/escape)
    if (!currentResolved.startsWith(vaultResolved + "/") && currentResolved !== vaultResolved) {
      drift.push(`${r.name} (slot escape)`);
      return { name: r.name, role: r.role, bytes: r.bytes, sha256: r.sha256, verified: false };
    }
    // No symlink, must be regular file
    try {
      const lst = lstatSync(currentPath);
      if (lst.isSymbolicLink()) {
        drift.push(`${r.name} (symlink refused)`);
        return { name: r.name, role: r.role, bytes: r.bytes, sha256: r.sha256, verified: false };
      }
      const st = statSync(currentPath);
      if (!st.isFile()) {
        drift.push(`${r.name} (not a regular file)`);
        return { name: r.name, role: r.role, bytes: r.bytes, sha256: r.sha256, verified: false };
      }
    } catch {
      drift.push(`${r.name} (unreadable)`);
      return { name: r.name, role: r.role, bytes: r.bytes, sha256: r.sha256, verified: false };
    }
    try {
      const actual = sha256hex(readFileSync(currentPath));
      verified = actual === r.sha256;
      if (!verified) drift.push(r.name);
    } catch {
      drift.push(`${r.name} (unreadable)`);
    }
    return { name: r.name, role: r.role, bytes: r.bytes, sha256: r.sha256, verified };
  });
  return { verified: drift.length === 0, root: constitutionRoot(), files, drift };
}
