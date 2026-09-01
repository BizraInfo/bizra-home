/**
 * BIZRA Node0 — THE SHOULDER.
 * The merged knowledge corpus (THE_SHOULDER.md) absorbed from the three external
 * sources (apex board · proofworld · GitHub estate), merged with the local root,
 * evaluated and verified — sealed ONCE as construction ABOVE the immutable root.
 *
 * Constitutional placement:
 *   ROOT     (3 PDFs)          — immutable, below everything, never touched
 *   SHOULDER (this corpus)     — sealed above the root; the base to stand on
 *   SYSTEM   (runtime/console) — built above the shoulder; the ground breaks here
 *
 * Seal law: one-time, like the constitution. A second seal attempt is refused
 * and recorded. The corpus hash is re-verified on every boot — drift is an
 * honest amber label (the root remains the only HALT boundary; the shoulder
 * is construction, not constitution).
 */
import { readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { STATE_DIR, kv } from "./store";
import { sha256hex, nowIso } from "./hash";
import { appendReceipt } from "./chain";
import { constitutionRoot } from "./constitution";
import { relay } from "./dema";

export const SHOULDER_DIR = join(STATE_DIR, "shoulder");
export const SHOULDER_FILE = join(SHOULDER_DIR, "THE_SHOULDER.md");

const SOURCES = [
  { id: "S1", name: "APEX KERNEL vΩ.2.0 · OMNI-SYNTHESIS board", url: "https://bizranode0dema.space-z.ai/", bytes: 630437 },
  { id: "S2", name: "Sovereign Proofworld (Node0 gamified surface)", url: "https://preview-chat-fef66cde-3f13-4e3e-9897-b55e02bd84b7.space-z.ai/", bytes: 109260 },
  { id: "S3", name: "GitHub estate · BizraInfo (6 repositories, READMEs read in full)", url: "https://github.com/BizraInfo", bytes: 76163 },
  { id: "R", name: "The local root — 3 sealed PDFs + live runtime + console", url: null, bytes: 0 },
];

/**
 * The reconciliation matrix — a faithful structured projection of corpus §IV
 * (claimed vs measured, the honest SNR). The sealed corpus text is the source
 * of truth; these rows mirror it so surfaces render data, never invention.
 */
export const SHOULDER_MATRIX: { claim: string; declared_in: string; status_here: string; label: string }[] = [
  { claim: "Founding document publicly hashed, immutable", declared_in: "S1 · S3", status_here: "sealed in vault, verified each boot", label: "MEASURED" },
  { claim: "Dual-agent PAT/SAT loop, end-to-end", declared_in: "S1 · S3", status_here: "PAT live model + deterministic SAT, running", label: "MEASURED" },
  { claim: "FATE single-use leases, no ambient authority", declared_in: "S1 · S2 · S3", status_here: "leases all consumed, 0 expired, network ✗", label: "MEASURED" },
  { claim: "Hash-chained tamper-evident receipts", declared_in: "S1 · S3", status_here: "chain walks from genesis, verify ok", label: "MEASURED" },
  { claim: "Exactly-once / crash recovery / replay", declared_in: "S1", status_here: "drilled: re-run ⇒ RECOVERY:SKIPPED, writes stay 1", label: "MEASURED" },
  { claim: "Reversible, human-governed transitions", declared_in: "S1 · S2", status_here: "human reverts sealed as receipts", label: "MEASURED" },
  { claim: "Self-improvement under law (autopoietic)", declared_in: "S1", status_here: "cycles run; no-op proposal REFUSED by SAT", label: "MEASURED (seed scale)" },
  { claim: "Ihsān numeric gate ≥ 0.95 / 0.999", declared_in: "S1 · S3", status_here: "not instrumented here (structural honesty only)", label: "DESIGNED — NOT MEASURED HERE" },
  { claim: "SNR ≥ 8.7", declared_in: "S1 · S2", status_here: "no numeric SNR engine here", label: "DESIGNED — NOT MEASURED HERE" },
  { claim: "BlockTree 3,993× compression", declared_in: "S1 · S2", status_here: "exact arithmetic; single node, no federation", label: "ARITHMETIC PROTOTYPE" },
  { claim: "PoI economy · sybil 30.8%→2.2% · Gini 0.218", declared_in: "S1 · S3", status_here: "simulation (seed 42), no token economy here", label: "DECLARED (simulated)" },
  { claim: "12-agent parliament, P5/S2 frozen", declared_in: "S3", status_here: "here PAT/SAT are organs, not 12 personas", label: "DESIGNED — DIFFERENT SCALE" },
  { claim: "Ed25519 / zk-SNARK receipts", declared_in: "S1 · S3", status_here: "SHA-256 chain (honest demo-grade)", label: "DESIGNED — NOT HERE" },
  { claim: "Bitcoin-anchored priority (OpenTimestamps)", declared_in: "S3 Dema", status_here: "exists in the Dema repo, not re-anchored here", label: "DECLARED (external)" },
  { claim: "Federation / forest / 1M nodes", declared_in: "S1 · S2", status_here: "explicitly NOT LIVE, by design", label: "NOT LIVE — SEALED DOOR" },
];

export interface ShoulderState {
  sealed: boolean;
  corpus: string;
  sha256: string | null;
  sealed_sha256: string | null;
  bytes: number | null;
  sealed_at: string | null;
  receipt_seq: number | null;
  receipt_digest: string | null;
  verified: boolean | null; // null = not sealed yet; false = drifted
  drift: boolean;
  sources: typeof SOURCES;
  stands_on: string | null; // constitution root at seal time
  matrix: typeof SHOULDER_MATRIX;
  law: string;
}

export function isShoulderSealed(): boolean {
  return kv("shoulder_sha256") !== null;
}

/** Seal the shoulder. Once. Never again. */
export function sealShoulder(): { sealed: boolean; sha256?: string; receipt_seq?: number; refused?: string } {
  if (isShoulderSealed()) {
    // Already sealed — a second attempt is a constitutional event, refused and recorded.
    relay("REFUSED", "SHOULDER", "second seal attempt — the shoulder is already sealed", undefined);
    return { sealed: true, refused: "already sealed — the shoulder seals once, like the root" };
  }
  if (!existsSync(SHOULDER_FILE)) {
    return { sealed: false, refused: "corpus missing — nothing to seal" };
  }
  const bytes = readFileSync(SHOULDER_FILE);
  const sha256 = sha256hex(bytes);
  const sealed_at = nowIso();
  const receipt = appendReceipt("SHOULDER_SEALED", "NODE0-SHOULDER", {
    corpus: "THE_SHOULDER.md",
    sha256,
    bytes: statSync(SHOULDER_FILE).size,
    stands_on_constitution_root: constitutionRoot(),
    sources: SOURCES.map((s) => ({ id: s.id, name: s.name, url: s.url, bytes: s.bytes })),
    act: "observed → absorbed → merged → evaluated → verified → sealed — construction ABOVE the immutable root",
    authority: "HUMAN — the operator's typed directive is sealed verbatim in corpus §0 (the standing consent)",
    law: "by respecting the root we honor the whole BIZRA — the root is never modified; the ground breaks above the shoulder",
    standing: "three years of daily work, honored not by words but by this seal",
  });
  kv("shoulder_sha256", sha256);
  kv("shoulder_bytes", String(statSync(SHOULDER_FILE).size));
  kv("shoulder_sealed_at", sealed_at);
  kv("shoulder_receipt_seq", String(receipt.seq));
  kv("shoulder_receipt_digest", receipt.digest);
  kv("shoulder_stands_on", constitutionRoot() ?? "");
  relay("DONE", "SHOULDER_SEALED", "knowledge corpus sealed above the root — the shoulder stands", receipt.digest);
  return { sealed: true, sha256, receipt_seq: receipt.seq };
}

/** Re-read the corpus bytes and compare. Drift is honest amber — never a silent fact. */
export function shoulderState(): ShoulderState {
  const sealedHash = kv("shoulder_sha256");
  const present = existsSync(SHOULDER_FILE);
  let currentHash: string | null = null;
  let bytes: number | null = null;
  if (present) {
    try {
      const buf = readFileSync(SHOULDER_FILE);
      currentHash = sha256hex(buf);
      bytes = statSync(SHOULDER_FILE).size;
    } catch {
      currentHash = null;
    }
  }
  const seq = kv("shoulder_receipt_seq");
  return {
    sealed: sealedHash !== null,
    corpus: "THE_SHOULDER.md",
    sha256: currentHash,
    sealed_sha256: sealedHash,
    bytes,
    sealed_at: kv("shoulder_sealed_at"),
    receipt_seq: seq ? Number(seq) : null,
    receipt_digest: kv("shoulder_receipt_digest"),
    verified: sealedHash === null ? null : currentHash === sealedHash && present,
    drift: sealedHash !== null && currentHash !== sealedHash,
    sources: SOURCES,
    stands_on: kv("shoulder_stands_on") || constitutionRoot(),
    matrix: SHOULDER_MATRIX,
    law: "sealed once above the immutable root — drift is an honest amber label; the root remains the only HALT boundary",
  };
}

/** The corpus text (served by GET /api/shoulder). Null when unreadable. */
export function shoulderText(): string | null {
  try {
    return readFileSync(SHOULDER_FILE, "utf8");
  } catch {
    return null;
  }
}
