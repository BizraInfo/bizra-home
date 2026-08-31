/**
 * BIZRA Node0 — the Constitution Vault.
 * The three root files (themassage.pdf, bizra.pdf, BIZRA_Third_Fact_v0_1_FINAL.pdf)
 * are the immutable root of the system — unchangeable, even by their author.
 * Sealed once at commission; re-verified on every boot and on every /api/verify.
 * Any byte drift => the engine HALTS. Nothing proceeds over a broken constitution.
 */
import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
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
    law: "unchangeable even by its author — drift halts the engine",
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

/** Re-read the vault bytes and compare. Drift is fatal. */
export function verifyConstitution(): ConstitutionVerification {
  const rows = all<RootFile>("SELECT name, role, path, bytes, sha256, sealed_at FROM constitution ORDER BY id ASC");
  const drift: string[] = [];
  const files = rows.map((r) => {
    let verified = false;
    try {
      const actual = sha256hex(readFileSync(r.path));
      verified = actual === r.sha256;
      if (!verified) drift.push(r.name);
    } catch {
      drift.push(`${r.name} (unreadable)`);
    }
    return { name: r.name, role: r.role, bytes: r.bytes, sha256: r.sha256, verified };
  });
  return { verified: drift.length === 0, root: constitutionRoot(), files, drift };
}
