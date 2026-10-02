# Runtime inward safety repairs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the three confirmed source defects: unsafe outbox access, unmeasured LIVE context, and successful recovery despite missing/mismatched proof.

**Architecture:** Keep the existing executor, mission, SQLite and receipt owners. Route all outbox reads through one descriptor-based guard; keep unobserved liveness UNKNOWN; validate persisted recovery bindings before any success receipt. This implements qualification gates 1–3, not the complete status-brief mission.

**Tech Stack:** Installed Bun, TypeScript, bun:test, bun:sqlite, node:fs and node:crypto. No dependencies or service deployment.

**Spec:** `docs/superpowers/specs/2026-10-02-dema-status-brief-mission-design.md`, sections 6.1–6.3 and the associated refusal requirements.

## Global Constraints

- Correct owner: `/home/bizra-operating-system/bizra-home/mini-services/bizra-runtime/`; Downloads/Dema is a different component.
- No service restart, installed release replacement, real mission effect, model dispatch, identity/key change, campaign change or push.
- Preserve existing dirty source and untracked evidence; stage only this slice if committing.
- Report contract remains 400–6,144 UTF-8 bytes; no new report generation or source ingestion in this slice.
- Fixture tests may write only unique temporary roots outside the source tree; use `BIZRA_RUNTIME_MODE=LOCAL_FOUNDER`, `BIZRA_BIND_HOST=127.0.0.1`, and an explicitly assigned temporary `BIZRA_STATE_ROOT` before imports.
- UNKNOWN never becomes DONE by default. Missing digests are not empty successful bindings. Measured test cost does not establish usefulness, economic reward or Node0 closure.
- Linux descriptor anchoring is a deliberate host-specific implementation; unsupported hosts refuse rather than use a weaker path fallback.
- Spec gates 4–7 remain open: crash-window/contract-date qualification, separate observation, factual citation verification, and HTTP REFUSED envelope correction. No full-mission readiness claim follows from these three repairs.

## Review Focus

- A dangling target or symlinked ancestor must neither escape the outbox nor alter the external target; Task 1 exercises both.
- Two creators for one filename must leave one complete artifact and one refusal; Task 1 uses separate fixture processes.
- Directory/FIFO/hardlink targets must not be treated as readable regular report files; Task 1 checks these without blocking.
- A corrupt, missing or malformed EFFECTED checkpoint must not fall through to PAT or overwrite its existing evidence; Task 3 exercises each case.
- A successful-looking SEALED row with changed output must not be returned as verified DONE; Task 3 exercises the sibling recovery path.

---

### Task 1: Exclusive creation and shared guarded reads

**Files:** Modify `mini-services/bizra-runtime/src/executor.ts` and `src/state.ts`. Create `mini-services/bizra-runtime/test/mission-inward-safety.test.ts`.

**Interfaces:** Preserve `boundedWrite(fileName: string, content: string): Effect`, `observe(path: string): Observation`, `readOutboxFile(name: string): string | null`, and `outboxListings()`. Add private executor helpers only. `buildState` consumes the existing guarded reader for its outbox preview, instead of directly reopening a pathname.

- [x] **Step 1: Add isolated fixture harness and failing checks.** In the new test file use this harness; every child imports runtime modules only after the temporary environment is installed:

```ts
import { test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SERVICE = join(import.meta.dir, "..");
function fixture(script: string) {
  const root = mkdtempSync(join(tmpdir(), "bizra-inward-safety-"));
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: SERVICE,
    env: { ...process.env, BIZRA_RUNTIME_MODE: "LOCAL_FOUNDER",
      BIZRA_BIND_HOST: "127.0.0.1", BIZRA_STATE_ROOT: root },
    encoding: "utf8", timeout: 15000,
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout.trim().split("\n").at(-1)!);
}

test("existing artifact is never overwritten", () => {
  const report = fixture(`
    const fs = await import("node:fs");
    const ex = await import("./src/executor.ts");
    const first = ex.boundedWrite("once.md", "original");
    let refused = false;
    try { ex.boundedWrite("once.md", "replacement"); } catch { refused = true; }
    console.log(JSON.stringify({ refused, text: fs.readFileSync(first.path, "utf8") }));
  `);
  expect(report.refused).toBe(true);
  expect(report.text).toBe("original");
});

test("observer never follows a symlink", () => {
  const report = fixture(`
    const fs = await import("node:fs");
    const path = await import("node:path");
    const store = await import("./src/store.ts");
    const ex = await import("./src/executor.ts");
    const outside = path.join(process.env.BIZRA_STATE_ROOT, "outside.md");
    fs.writeFileSync(outside, "private fixture bytes");
    const link = path.join(store.OUTBOX_DIR, "link.md");
    fs.symlinkSync(outside, link);
    let refused = false;
    try { ex.observe(link); } catch { refused = true; }
    console.log(JSON.stringify({ refused, read: ex.readOutboxFile("link.md") }));
  `);
  expect(report.refused).toBe(true);
  expect(report.read).toBeNull();
});
```

Extend this file with explicit cases for a dangling link, ancestor replacement after store initialization, directory, FIFO, hardlink, absolute path, `../escape.md`, basename aliases, and ordinary UTF-8 round-trip. For the ancestor case rename fixture `state/outbox` to `state/original-outbox`, replace `state/outbox` with a link to another fixture directory, and assert refusal and unchanged external bytes. For FIFO create it with installed `/usr/bin/mkfifo` after verifying that command exists; the child timeout makes a blocking read fail the test. For concurrency launch two children against the same initialized fixture root and filename, await both, assert exactly one creator succeeds and the final bytes equal that creator's full payload.

- [x] **Step 2: Record RED.** Run `bun test mini-services/bizra-runtime/test/mission-inward-safety.test.ts`; retain stdout/stderr and status under `/data/bizra/logs/`. Existing-overwrite and observer-link cases must fail on current source for the claimed reasons.

- [x] **Step 3: Implement the shared guard in executor.ts.** Validate the exact input name, not a basename alias. Pin every ancestor directory using `openSync` with `O_RDONLY | O_DIRECTORY | O_NOFOLLOW`, beginning at `/`, then traverse children through `/proc/self/fd/<directory-fd>/<component>`. Keep the final directory descriptor alive for the operation; close every descriptor in `finally`. No `realpath`-then-open fallback and no pathname-only ancestor check.

The file-open core is:

```ts
const fd = openSync(`/proc/self/fd/${directoryFd}/${name}`, flags | constants.O_NOFOLLOW, 0o600);
try {
  const stat = fstatSync(fd);
  if (!stat.isFile() || stat.nlink !== 1) throw new Error("OUTBOX_FILE_REFUSED");
  return operation(fd);
} finally { closeSync(fd); }
```

Use `O_WRONLY | O_CREAT | O_EXCL` for creation, and `O_RDONLY | O_NONBLOCK` for reading. Write/read by the returned descriptor; hash the actual read buffer. Remove the writer's recursive mkdir: the existing store creates the outbox, and missing/symlinked ancestry must refuse. Increment the write counter only after successful descriptor write. A write failure propagates; a partially created file is not deleted or retried as success.

Route `observe`, `readOutboxFile` and listings through this same guard. `observe` accepts only a direct child of the configured outbox; a genuinely absent regular target returns `exists:false`; unsafe/nonregular targets throw. `readOutboxFile` returns null for refused/missing files. Listings must not read unsafe entries or silently label them verified; a refused entry causes the listing to refuse. An absent outbox remains an empty listing. Route `state.ts` preview through `readOutboxFile(f.name)` and retain its existing null-preview error handling.

- [x] **Step 4: Record GREEN.** Rerun the focused file; inspect both concurrency exit codes and complete final payload, not just file existence. Verify the temporary external fixture files remain unchanged.
- [x] **Step 5: Review the focused diff.** Run `git diff --check` and search executor/state for remaining direct outbox pathname reads. If committing, stage only these three slice files and use `fix: fence outbox creation and observation`.

### Task 2: Honest context for both proposal callers

**Files:** Modify `mini-services/bizra-runtime/src/mission.ts` and `src/pat.ts`; extend `test/mission-inward-safety.test.ts`.

**Interfaces:** Preserve both `runMission` and `standaloneProposal`. Their shared private `buildMissionContext()` still returns `node0_status: string`, but returns UNKNOWN until an admitted liveness owner supplies evidence. No new probe, observation cache or network call.

- [x] **Step 1: Add a failing behavioral check.** Use the fixture harness and `mock.module` to replace the model-provider port before importing mission. Capture the actual request emitted by the real PAT; make the mock return a refusal. This tests prompt construction without inference:

```ts
test("standalone proposal never invents liveness", () => {
  const report = fixture(`
    const { mock } = await import("bun:test");
    let captured;
    mock.module("./src/model-provider.ts", () => ({
      MODEL_AUTHORITY_LABEL: "PROPOSE_ONLY", MAX_MODEL_CALLS_PER_MISSION: 1,
      modelCallsUsed: () => 0,
      getModelSelection: () => ({ model: "fixture", digest: null, endpoint: null }),
      modelCall: async input => { captured = input; return {
        ok: false, code: "FIXTURE_NO_DISPATCH", reason: "no inference",
        provider_id: "fixture", endpoint: null, endpoint_class: "NONE"
      }; }
    }));
    const mission = await import("./src/mission.ts");
    await mission.standaloneProposal();
    console.log(JSON.stringify({ prompt: captured.user }));
  `);
  expect(report.prompt).toContain('"node0_status": "UNKNOWN"');
  expect(report.prompt).not.toContain('"node0_status": "LIVE"');
  expect(report.prompt).not.toContain("measured, authoritative");
});
```

Add the corresponding `runMission()` refusal-path case with the same model-port stub, asserting UNKNOWN in the captured context, zero outbox artifacts, zero mission success receipts, and REFUSED as the result.

- [x] **Step 2: Record RED.** Run the focused file and confirm the actual captured context contains the current literal LIVE.
- [x] **Step 3: Make the two minimal truth-label changes.** In `buildMissionContext` set `node0_status: "UNKNOWN"` and describe the function as local database context, not authoritative liveness. In PAT's prompt replace `Runtime context (measured, authoritative)` with `Local database context (Node0 liveness is unmeasured unless separately evidenced)`. Existing contracts, chain metadata and SQL counters remain descriptive local facts; they do not imply current campaign/runtime identity.
- [x] **Step 4: Record GREEN.** Rerun the focused file. Confirm the stub dispatch count is exactly one per attempted proposal, with no real provider call or report effect.
- [x] **Step 5: Review/commit only this task's changes.** If committing, use `fix: keep unobserved mission liveness unknown`.

### Task 3: Fail closed on recovery proof and actual output

**Files:** Modify `mini-services/bizra-runtime/src/mission.ts`; extend `test/mission-inward-safety.test.ts`.

**Interfaces:** Keep `runMission(opts)` and the existing DONE/REFUSED/UNKNOWN result contract. Persist binding fields in the existing `missions.result` JSON, without a second ledger or schema migration. Recovery UNKNOWN preserves the original checkpoint and physical output; it does not fall through to PAT.

- [x] **Step 1: Add RED fixture cases for EFFECTED recovery.** Seed contracts and an EFFECTED row in a fresh fixture root; mock PAT to throw if recovery invokes it. Insert a syntactically complete checkpoint, then deliberately change one precondition per child process:

```ts
const { mock } = await import("bun:test");
mock.module("./src/pat.ts", () => ({
  proposeMissionBrief: async () => { throw new Error("RECOVERY_MUST_NOT_DISPATCH"); },
}));
const fs = await import("node:fs");
const { join } = await import("node:path");
const store = await import("./src/store.ts");
const contracts = await import("./src/contracts.ts");
contracts.seedContracts();
const bytes = "fixture brief " + "x".repeat(410);
const { MISSION_ID, missionContract, runMission } = await import("./src/mission.ts");
const { sha256hex, sha256obj } = await import("./src/hash.ts");
const attempt = "FIXTURE-ATTEMPT";
const path = join(store.OUTBOX_DIR, missionContract().path);
fs.writeFileSync(path, bytes);
const checkpoint = {
  mission_hash: sha256hex(MISSION_ID), contract_hash: sha256obj(missionContract()),
  attempt_hash: sha256hex(attempt), proposal_hash: sha256hex("fixture proposal"),
  sat_verdict_hash: sha256hex("fixture verdict"), fate_decision_hash: sha256hex("fixture lease"),
  effect_hash: sha256hex(bytes), observer_hash: sha256hex(bytes),
};
store.run("INSERT INTO missions (id, attempt_id, status, effect_path, effect_sha256, effect_writes, result) VALUES (?, ?, 'EFFECTED', ?, ?, 1, ?)",
  MISSION_ID, attempt, path, checkpoint.effect_hash, JSON.stringify(checkpoint));
const result = await runMission();
console.log(JSON.stringify({ result,
  receipts: store.one("SELECT COUNT(*) AS n FROM receipts WHERE kind = 'MISSION_RECEIPT'").n,
  checkpoint: store.one("SELECT result FROM missions WHERE id = ?", MISSION_ID).result,
}));
```

Construct `path` as the approved `missionContract().path` inside the fixture outbox. Before calling runMission, cases must: replace bytes; remove the file; replace it with a link; remove each required digest in turn; use an empty/invalid digest; provide malformed JSON; change the attempt hash; change contract hash; or set a different outbox filename. Assert result UNKNOWN, no DONE OBSERVE/SEAL step, zero new MISSION_RECEIPT rows, unchanged checkpoint, and no model dispatch. Each child has independent state.

Add a positive fixture with intact bytes and all bindings: one receipt with eight nonempty SHA-256 fields, matching output readback; a second run returns the same receipt and does not create another file/receipt. This is a fixture proof, not qualification of a real mission.

Add a SEALED-row sibling test: first produce the positive recovery result, then corrupt the file. The next run must return UNKNOWN without adding a receipt or overwriting the previously sealed result. Also reject a SEALED row with a missing/incorrect receipt reference; a JSON receipt object alone is not durable receipt evidence.

- [x] **Step 2: Record RED.** Run the focused file. On current source expect corrupted EFFECTED output to report DONE, absent output to fall through to PAT, and missing digests to enter a success receipt. Capture these distinct causes rather than a generic nonzero exit.
- [x] **Step 3: Validate before sealing, across both recovery branches.** Parse the existing result defensively. Build a common private recovery validator that checks:

```ts
const required = ["mission_hash", "contract_hash", "attempt_hash", "proposal_hash",
  "sat_verdict_hash", "fate_decision_hash", "effect_hash", "observer_hash"] as const;
const complete = required.every(key => typeof hashes[key] === "string"
  && /^[a-f0-9]{64}$/.test(hashes[key]));
const bound = complete && hashes.mission_hash === sha256hex(MISSION_ID)
  && hashes.contract_hash === contractHash
  && hashes.attempt_hash === sha256hex(row.attempt_id)
  && hashes.effect_hash === row.effect_sha256;
```

For EFFECTED use the persisted top-level checkpoint; for SEALED use the stored receipt's eight hashes. Validate the exact approved output path, catch observer failures, require existing actual output and matching effect/observer hashes before any success. A previously stored observer hash must match the actual readback. Missing or mismatched proof produces a RECOVERY/OBSERVE UNKNOWN result with existing effect count/path disclosed. Preserve checkpoint/result bytes and existing row state on that failed recovery; record only the honest existing relay/trace outcome. Never rewrite artifact, create a success receipt, regenerate a proposal, or let an unknown row fall into normal execution.

For SEALED additionally rebind its stored receipt sequence/digest to the actual receipts table, subject/kind, payload hashes and recomputed existing receipt digest. Return the same receipt only if those checks and output readback pass. This does not claim independent custody or repair global receipt/state atomicity.

On the normal effect path compute the eight existing bindings once, persist them as the EFFECTED checkpoint after successful creation and before observation/crash-drill handling, and reuse them in the receipt. Preserve that checkpoint when observation yields UNKNOWN. Do not default any required hash to `""`. The existing simulated crash option must leave these bindings available; it is not an actual process-termination proof. A failure between creation and checkpoint persistence remains a partial-effect crash-window gate, not a qualified exactly-once claim.

- [x] **Step 4: Record GREEN.** Rerun the focused file including intact recovery, corrupt recovery, repeat recovery and both proposal context callers. Assert zero dispatch on recovery cases and no duplicate successful receipt in the fixture repeat.
- [x] **Step 5: Validate the slice.** Run `bun test mini-services/bizra-runtime/test/mission-inward-safety.test.ts mini-services/bizra-runtime/test/transition-atomicity-1a.test.ts`, then the existing runtime suite under `mini-services/bizra-runtime/test`. Existing tests that boot fixture servers are local test processes, never service restarts. Run `node_modules/.bin/tsc --noEmit -p mini-services/bizra-runtime/tsconfig.json` and `git diff --check`. Record baseline failures separately; do not alter unrelated code to green this slice. If committing, stage only slice-owned files and use `fix: refuse unbound mission recovery success`.

## Receipt and self-review

- [x] Save RED/GREEN commands, statuses, output and source/diff SHA-256 bindings under one unique `/data/bizra/logs/runtime-inward-safety-*` directory.
- [x] Rehash the campaign pointer/state and protected source preimages; disclose source/test/document writes separately from runtime/campaign state.
- [ ] Mark TASK-075.26 as partially advanced only through the Backlog CLI if task tracking is updated. These three prerequisite repairs do not satisfy its real-effect/usefulness acceptance criteria.
- [x] Leave deployment, a real model/mission call and Node0 closure NOT_RUN. No simulated impact, trained RL or realized usefulness claim.

Self-review: this plan covers only the separately approved first three inward repairs. It preserves owners, result signatures, metadata disclosure and refusal semantics. The five review-focus cases have explicit owning tasks. Full report rendering/consent/independent checker/crash qualification/HTTP envelopes are intentionally separate remaining work from the architectural spec, not silently completed here.

## Execution handoff

Status: COMPLETED LOCAL SOURCE SLICE — approved native execution, integrated at `459a0850`; deployment and real mission qualification NOT_RUN.
Recommended method: Native, because these three tasks share one executor/mission flow and one focused fixture harness. A fresh reviewer checks the resulting slice before completion. User may instead choose subagent-driven execution.

Execution evidence: `/data/bizra/logs/runtime-inward-safety-20261002/`. Integrated suite: 123/123; 44 focused checks. Fresh review found one receipt/state atomicity regression, fixed RED→GREEN with existing SQLite transaction. No Minor findings. Canonical checkout typecheck has a pre-existing shared UI alias failure (`runtime-status.ts:18`, TS2307), reproduced with pre-repair runtime source plus unchanged dirty UI. Isolated typecheck passes. The first evidence-only integrated config failed Node type discovery because it lived outside the checkout; adding the checkout typeRoots to that evidence config corrected the setup. The corrected integrated typecheck (integrated-alias-typecheck-r2.log) passes with the existing root alias mapping. The canonical command still has the reproduced baseline TS2307 failure. No UI/config repair was made. TASK-075.26 remains open.
