/**
 * BIZRA Node0 — the state snapshot. One call, the whole truth.
 * Every field is measured from sealed state — nothing here is cached, spun, or flattered.
 */
import { all, one, kv, OUTBOX_DIR } from "./store";
import { verifyChain, lastReceipts } from "./chain";
import { verifyConstitution, constitutionRoot } from "./constitution";
import { contractsSnapshot } from "./contracts";
import { leaseRegistry, fateStats } from "./fate";
import { patStats, lastPat } from "./pat";
import { lastSat, satLog } from "./sat";
import { traceStats, lastTraces } from "./traces";
import { demaLog } from "./dema";
import { outboxListings } from "./executor";
import { computeSignals } from "./auto";
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

export function buildState(startedAt: number) {
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
      port: 7421,
      status: kv("status") ?? "CONSTRUCTION",
      halted_reason: kv("halted_reason"),
      phase: kv("phase") ?? "CONSTRUCTION",
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
      law: "the 3 root files are sealed — unchangeable even by their author; any byte drift halts the engine",
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
      mode: "LIVE_MODEL (z-ai-web-dev-sdk) + PAT-0 deterministic triggers",
      ...patStats(),
      last: lastPat(),
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
        preview = readFileSync(join(OUTBOX_DIR, f.name), "utf8").slice(0, 1200);
      } catch {
        preview = null;
      }
      return { name: f.name, bytes: f.bytes, sha256: f.sha256, preview };
    }),
  };
}
