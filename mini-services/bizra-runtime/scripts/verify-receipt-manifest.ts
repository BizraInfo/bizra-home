/**
 * BIZRA Node0 — deterministic 1A receipt-manifest verifier (CONTROL-PLANE-SEAL-1B, TODO 1.2).
 *
 * Reads the 1A proof receipt's changed_files_sha256 map and checks, for every
 * entry: path exists, size matches, SHA-256 matches.
 *
 * Modes:
 *   default            — verify against the CURRENT DISK state.
 *   --at-commit <sha>  — verify against the bytes IN A COMMITTED TREE (git
 *                        cat-file), which is the true reproducibility check of
 *                        a receipt: does the commit it points to actually
 *                        contain the bytes it claims?
 *   --supersede <json> — apply the 1B supersede map so a path deliberately
 *                        replaced by the 1B mission (the never-committed
 *                        local-init.ts) resolves to its verified replacement
 *                        instead of dangling. The replacement is verified at
 *                        the CURRENT committed tree (HEAD) when --at-commit is
 *                        used, or on disk otherwise.
 *
 * Usage:
 *   bun scripts/verify-receipt-manifest.ts [--receipt <1A receipt.json>]
 *        [--supersede <SUPERSEDE_1A.json>] [--at-commit <sha>]
 *
 * Exit 0 = every manifest path is verified (directly, or via supersede).
 * Exit 1 = at least one path is MISSING or mismatched and not superseded.
 * Deterministic: no network, no model, no clock, no randomness.
 */
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const REPO_ROOT = resolve(import.meta.dir, "..", "..", "..");

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const receiptPath = arg("receipt") ?? join(REPO_ROOT, "evidence", "local-sovereign-boundary-1a", "BIZRA-HOME-LOCAL-SOVEREIGN-BOUNDARY-1A-RECEIPT.json");
const supersedePath = arg("supersede");
const atCommit = arg("at-commit");

/** Blob bytes of <path> at <commit> via git cat-file, or null when absent. */
function committedBytes(commit: string, path: string): Buffer | null {
  const res = spawnSync("git", ["-C", REPO_ROOT, "cat-file", "-p", `${commit}:${path}`], { maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0 || !res.stdout) return null;
  return Buffer.from(res.stdout);
}

/** Bytes of a path as currently committed (HEAD), staged (index), or on disk — the replacement-resolution ladder. */
function presentBytes(path: string): Buffer | null {
  for (const ref of ["HEAD", ":"]) {
    const res = spawnSync("git", ["-C", REPO_ROOT, "show", `${ref}${path}`], { maxBuffer: 64 * 1024 * 1024 });
    if (res.status === 0 && res.stdout) return Buffer.from(res.stdout);
  }
  const abs = join(REPO_ROOT, path);
  return existsSync(abs) ? readFileSync(abs) : null;
}

interface SupersedeEntry {
  superseded_path: string;
  reason: string;
  replacement_path: string;
}
const supersede = new Map<string, SupersedeEntry>();
if (supersedePath) {
  const raw = JSON.parse(readFileSync(supersedePath, "utf8")) as { entries: SupersedeEntry[] };
  for (const e of raw.entries) supersede.set(e.superseded_path, e);
}

const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as {
  changed_files_sha256: Record<string, { sha256: string; bytes: number; note?: string }>;
};
const manifest = receipt.changed_files_sha256;

let match = 0;
let missing = 0;
let mismatched = 0;
let superseded = 0;
const lines: string[] = [];

function verifyBytes(p: string, claimedSha: string, claimedBytes: number, bytes: Buffer): "MATCH" | "MISMATCH" {
  const sha = createHash("sha256").update(bytes).digest("hex");
  return sha === claimedSha && bytes.length === claimedBytes ? "MATCH" : "MISMATCH";
}

for (const [p, v] of Object.entries(manifest)) {
  const bytes = atCommit ? committedBytes(atCommit, p) : existsSync(join(REPO_ROOT, p)) ? readFileSync(join(REPO_ROOT, p)) : null;
  if (bytes === null) {
    const s = supersede.get(p);
    // supersede replacement resolved via the presentBytes ladder: HEAD → index → disk
    const replacementBytes = s ? presentBytes(s.replacement_path) : null;
    if (s && replacementBytes !== null) {
      superseded++;
      lines.push(`SUPERSEDED  ${p} -> ${s.replacement_path} (${s.reason}; replacement present, ${replacementBytes.length}B)`);
    } else if (s) {
      missing++;
      lines.push(`MISSING     ${p} (supersede declares replacement ${s.replacement_path}, which is ALSO absent)`);
    } else {
      missing++;
      lines.push(`MISSING     ${p} (claimed sha256 ${v.sha256.slice(0, 16)}…, bytes ${v.bytes}${atCommit ? ` — absent from commit ${atCommit.slice(0, 8)}` : ""})`);
    }
    continue;
  }
  const verdict = verifyBytes(p, v.sha256, v.bytes, bytes);
  if (verdict === "MATCH") {
    match++;
    lines.push(`MATCH       ${p} (sha256 ${v.sha256.slice(0, 16)}…, ${v.bytes}B${atCommit ? ` at commit ${atCommit.slice(0, 8)}` : ""})`);
  } else {
    mismatched++;
    lines.push(
      `MISMATCH    ${p} (claimed sha256 ${v.sha256.slice(0, 16)}…/${v.bytes}B, found ${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}…/${bytes.length}B${atCommit ? ` at commit ${atCommit.slice(0, 8)}` : ""})`,
    );
  }
}

lines.sort();
console.log(lines.join("\n"));
console.log("");
console.log(
  `SUMMARY: ${match} MATCH · ${superseded} SUPERSEDED(verified replacement present) · ${mismatched} MISMATCH · ${missing} MISSING — manifest size ${Object.keys(manifest).length}${atCommit ? ` — verified at commit ${atCommit.slice(0, 8)}` : " — verified on current disk"}`,
);
process.exit(missing + mismatched > 0 ? 1 : 0);

