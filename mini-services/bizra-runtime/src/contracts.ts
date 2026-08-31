/**
 * BIZRA Node0 — Engine Contracts.
 * The tunable parameters of the runtime itself. This is the "self" that the
 * autopoietic loop is allowed to modify — and ONLY through:
 *   proposal -> SAT diagnostic contract -> FATE lease -> sealed, reversible transition.
 * Clamps are constitutional floors/ceilings: a proposal outside them fails the contract.
 * No contract change can widen the constitution, the scope gate, or the chain.
 */
import { all, one, run } from "./store";
import { nowIso } from "./hash";

export interface ContractDef {
  key: string;
  label: string;
  min: number;
  max: number;
  unit: string;
  description: string;
  seed: number;
}

export const CONTRACT_CATALOG: ContractDef[] = [
  {
    key: "PAT_MODEL_BUDGET",
    label: "PAT model budget",
    min: 1,
    max: 3,
    unit: "calls/cycle",
    description: "Maximum live-model invocations PAT may spend per cycle. One is the law; three is the ceiling.",
    seed: 1,
  },
  {
    key: "SAT_CORROBORATION_MIN",
    label: "SAT corroboration floor",
    min: 2,
    max: 5,
    unit: "distinct sources",
    description: "Minimum distinct trace sources that must independently support a conclusion before promotion. Constitutional floor: 2. Cannot be lowered below 2 by anyone, including the system.",
    seed: 2,
  },
  {
    key: "FATE_TTL_MS",
    label: "FATE lease TTL",
    min: 5000,
    max: 120000,
    unit: "ms",
    description: "Time-to-live of a single-use lease. Expired leases are refused, never renewed.",
    seed: 30000,
  },
  {
    key: "HYPOTHESIS_WINDOW",
    label: "Evidence window",
    min: 10,
    max: 200,
    unit: "traces",
    description: "How many recent admissible traces feed PAT's hypothesis context. Grows only under saturation, shrinks only under scarcity.",
    seed: 20,
  },
];

export function seedContracts(): void {
  for (const c of CONTRACT_CATALOG) {
    if (!one("SELECT key FROM contracts WHERE key = ?", c.key)) {
      run(
        "INSERT INTO contracts (key, value, min, max, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?)",
        c.key, String(c.seed), String(c.min), String(c.max), nowIso(), "GENESIS",
      );
    }
  }
}

export function contractValue(key: string): number {
  const row = one<{ value: string }>("SELECT value FROM contracts WHERE key = ?", key);
  if (!row) throw new Error(`unknown contract: ${key}`);
  return Number(row.value);
}

export function contractClamp(key: string): { min: number; max: number } {
  const row = one<{ min: string; max: string }>("SELECT min, max FROM contracts WHERE key = ?", key);
  if (!row) throw new Error(`unknown contract: ${key}`);
  return { min: Number(row.min), max: Number(row.max) };
}

export function setContractValue(key: string, value: number, by: string): void {
  const clamp = contractClamp(key);
  if (!Number.isFinite(value) || value < clamp.min || value > clamp.max) {
    throw new Error(`value out of constitutional clamp for ${key}`);
  }
  run(
    "UPDATE contracts SET value = ?, updated_at = ?, updated_by = ? WHERE key = ?",
    String(value), nowIso(), by, key,
  );
}

export function contractsSnapshot() {
  const rows = all<any>("SELECT key, value, min, max, updated_at, updated_by FROM contracts ORDER BY key ASC");
  const defs = new Map(CONTRACT_CATALOG.map((c) => [c.key, c]));
  return rows.map((r) => ({
    key: r.key,
    label: defs.get(r.key)?.label ?? r.key,
    value: Number(r.value),
    min: Number(r.min),
    max: Number(r.max),
    unit: defs.get(r.key)?.unit ?? "",
    description: defs.get(r.key)?.description ?? "",
    updated_at: r.updated_at,
    updated_by: r.updated_by,
  }));
}

export function catalogHash(): string {
  // hash over catalog definitions + current values — the "contract_hash" bound into transition receipts
  const rows = all<any>("SELECT key, value, min, max FROM contracts ORDER BY key ASC");
  const payload = rows.map((r) => `${r.key}:${r.value}[${r.min},${r.max}]`).join("|");
  return sha256Hex(payload);
}

import { sha256hex as sha256Hex } from "./hash";
