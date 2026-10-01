/**
 * BIZRA Node0 — the state snapshot. One call, the whole truth.
 * Every field is measured from sealed state — nothing here is cached, spun, or flattered.
 */
import { all, one, kv, STATE_DIR, RUNTIME_MODE, ARCHIVE_SNAPSHOT_DIR } from "./store";
import { verifyChain, lastReceipts } from "./chain";
import { verifyConstitution, constitutionRoot } from "./constitution";
import { contractsSnapshot } from "./contracts";
import { leaseRegistry, fateStats } from "./fate";
import { patStats, lastPat } from "./pat";
import { lastSat, satLog } from "./sat";
import { traceStats, lastTraces } from "./traces";
import { demaLog } from "./dema";
import { outboxListings, readOutboxFile } from "./executor";
import { computeSignals } from "./auto";
import { shoulderState } from "./shoulder";
import { modelStateProjection, modelCallLog } from "./model-provider";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const RUNTIME_DIR = import.meta.dir + "/..";

function sourceDigest(): string {
  const h = createHash("sha256");
  const files = ["index.ts", ...readdirSync(join(RUNTIME_DIR, "src")).filter((f) => f.endsWith(".ts")).sort()].map((f) =>
    f === "index.ts" ? join(RUNTIME_DIR, f) : join(RUNTIME_DIR, "src", f),
  );
  for (const f of files) {
    h.update(f);
    h.update(readFileSync(f));
  }
  return h.digest("hex");
}

export function buildState(startedAt: number, bind?: { host: string; port: number; haltedReason?: string | null }) {
  const chain = verifyChain();
  const constitution = verifyConstitution();
  const sealedSource = kv("source_digest");
  const currentSource = sourceDigest();
  const transitions = all<any>(
    "SELECT t.id, t.ts, t.cycle_id, t.contract_key, t.before_value, t.after_value, t.hypothesis_id, t.receipt_seq, t.reverted, t.reverted_at, r.digest AS receipt_digest FROM transitions t LEFT JOIN receipts r ON r.seq = t.receipt_seq ORDER BY t.id DESC LIMIT 20",
  );
  const missions = all<any>("SELECT id, attempt_id, status, effect_path, effect_sha256, receipt_seq, effect_writes, started_at, finished_at, ladder, result FROM missions ORDER BY started_at DESC LIMIT 5").map((m: any) => ({
    id: m.id,
    attempt_id: m.attempt_id,
    status: m.status,
    effect_path: m.effect_path,
    effect_sha256: m.effect_sha256,
    receipt_seq: m.receipt_seq,
    effect_writes: m.effect_writes,
    started_at: m.started_at,
    finished_at: m.finished_at,
    ladder: m.ladder ? JSON.parse(m.ladder) : [],
    receipt: m.result ? (JSON.parse(m.result).receipt ?? null) : null,
    reason: m.result ? (JSON.parse(m.result).reason ?? null) : null,
    recovered: m.result ? (JSON.parse(m.result).recovered ?? false) : false,
  }));
  const hypotheses = all<any>(
    "SELECT id, ts, cycle_id, mode, status, hypothesis, target_contract, before_value, after_value, dod, cited_traces, detail, model_calls FROM hypotheses ORDER BY id DESC LIMIT 6",
  );
  const cycles = all<any>("SELECT ts, cycle_id, status, detail FROM cycles ORDER BY id DESC LIMIT 8");

  return {
    ok: true,
    runtime: {
      name: "BIZRA Node0 · bizra-runtime",
      port: bind?.port ?? 7421,
      bind_host: bind?.host ?? "127.0.0.1",
      mode: RUNTIME_MODE,
      // CONTROL-PLANE-SEAL-1B truth projection: PUBLIC_REFERENCE is a read-only
      // archive presentation — REFERENCE_ONLINE, never LIVE. Only LOCAL_FOUNDER
      // after bind + successful commission reports LIVE / node0_active=true.
      status: RUNTIME_MODE === "PUBLIC_REFERENCE"
        ? (bind?.haltedReason ? "HALTED" : "REFERENCE_ONLINE")
        : (kv("status") ?? "CONSTRUCTION"),
      node0_active: RUNTIME_MODE === "PUBLIC_REFERENCE" ? false : (kv("status") === "LIVE" && !bind?.haltedReason),
      actions_enabled: RUNTIME_MODE === "PUBLIC_REFERENCE" ? false : (kv("status") === "LIVE" && !bind?.haltedReason),
      halted_reason: RUNTIME_MODE === "PUBLIC_REFERENCE" ? (bind?.haltedReason ?? null) : kv("halted_reason"),
      phase: RUNTIME_MODE === "PUBLIC_REFERENCE" ? "PUBLIC_REFERENCE" : (kv("phase") ?? "CONSTRUCTION"),
      state_presentation: RUNTIME_MODE === "PUBLIC_REFERENCE"
        ? "sealed archive presented read-only from an ephemeral snapshot — originals untouched, nothing appended; this is a reference presentation, not an active Node0"
        : "live local founder root — envelope-gated consequential actions only",
      archive_snapshot_dir: ARCHIVE_SNAPSHOT_DIR,
      sealed_at: kv("sealed_at"),
      live_at: kv("live_at"),
      boot_count: Number(kv("boot_count") ?? "1"),
      started_at: new Date(startedAt).toISOString(),
      uptime_ms: Date.now() - startedAt,
      tz: "Asia/Dubai",
      now: new Date().toISOString(),
    },
    constitution: {
      verified: constitution.verified,
      root_hash: constitutionRoot(),
      drift: constitution.drift,
      files: constitution.files,
      // CONTROL-PLANE-SEAL-1B: hash-seal + drift-detection is what this workspace
      // PROVES. Physical permission immutability is NOT proven here (vault files
      // are mode 0755 on this substrate) and is no longer claimed.
      law: "the 3 root files are HASH-SEALED: byte drift is detected on verification and halts the engine; physical permission immutability is not proven by this workspace",
    },
    shoulder: {
      ...shoulderState(),
      preview: (() => {
        try {
          return readFileSync(join(STATE_DIR, "shoulder", "THE_SHOULDER.md"), "utf8").slice(0, 2400);
        } catch {
          return null;
        }
      })(),
    },
    node0: {
      phase: kv("phase") ?? "CONSTRUCTION",
      spine: {
        sealed_source_digest: sealedSource,
        current_source_digest: currentSource,
        source_drift: sealedSource !== currentSource,
        drift_note: "source drift under bun --hot is a dev-mode observation, honestly labeled; the constitution is the halt boundary",
      },
    },
    chain: {
      ...chain,
      last: lastReceipts(12),
    },
    contracts: contractsSnapshot(),
    pat: {
      organs: "PAT proposes — never executes, never verifies, never seals",
      mode: "MODEL_PROVIDER (local loopback provider, PROPOSE_ONLY) + PAT-0 deterministic triggers",
      ...patStats(),
      last: lastPat(),
    },
    // LOCAL-MODEL-PROVIDER-1A: the truthful local-model projection.
    // PUBLIC_REFERENCE: static NOT_CONNECTED_REFERENCE_MODE — never a probe.
    // LOCAL_FOUNDER: the last cached observation (state building never probes).
    model: {
      ...modelStateProjection(),
      call_log: modelCallLog(6),
    },
    sat: {
      organs: "SAT verifies — deterministic, model-blind, nothing to reward-hack",
      deterministic: true,
      last: lastSat(),
      log: satLog(6),
    },
    fate: {
      organs: "FATE leases — single-use, network=false, fs=outbox_only, durable",
      stats: fateStats(),
      registry: leaseRegistry().slice(0, 12),
      ambient_authority: "NONE",
    },
    traces: {
      gate: "scope · completeness · correlation limits — inadmissible traces are recorded, never dropped",
      stats: traceStats(),
      last: lastTraces(12),
    },
    hypotheses,
    transitions,
    missions,
    cycles,
    dema: demaLog(24),
    signals: computeSignals(),
    outbox: outboxListings().map((f) => {
      let preview: string | null = null;
      try {
        preview = readOutboxFile(f.name)?.slice(0, 1200) ?? null;
      } catch {
        preview = null;
      }
      return { name: f.name, bytes: f.bytes, sha256: f.sha256, preview };
    }),
  };
}
