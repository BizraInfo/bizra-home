import { test, expect } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SERVICE = join(import.meta.dir, "..");

// Modules bind their SQLite/outbox root at import. Each child has its own root.
function fixture(script: string): any {
  const root = mkdtempSync(join(tmpdir(), "bizra-inward-safety-"));
  try {
    const result = spawnSync(process.execPath, ["-e", script], {
      cwd: SERVICE,
      env: { ...process.env, BIZRA_RUNTIME_MODE: "LOCAL_FOUNDER",
        BIZRA_BIND_HOST: "127.0.0.1", BIZRA_STATE_ROOT: root },
      encoding: "utf8", timeout: 4000,
    });
    expect(result.error, result.stderr).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    return JSON.parse(result.stdout.trim().split("\n").at(-1)!);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const setup = `
  const fs = await import("node:fs");
  const { join } = await import("node:path");
  const store = await import("./src/store.ts");
  const ex = await import("./src/executor.ts");
`;

test("existing artifact is never overwritten", () => {
  const report = fixture(setup + `
    const first = ex.boundedWrite("once.md", "original");
    let refused = false;
    try { ex.boundedWrite("once.md", "replacement"); } catch { refused = true; }
    console.log(JSON.stringify({ refused, text: fs.readFileSync(first.path, "utf8") }));
  `);
  expect(report.refused).toBe(true);
  expect(report.text).toBe("original");
});

test("ordinary UTF-8 artifact round-trips by bytes", () => {
  const report = fixture(setup + `
    const effect = ex.boundedWrite("brief.md", "BIZRA — سلام");
    console.log(JSON.stringify({ effect, observation: ex.observe(effect.path),
      read: ex.readOutboxFile("brief.md"), listing: ex.outboxListings() }));
  `);
  expect(report.read).toBe("BIZRA — سلام");
  expect(report.effect.bytes).toBe(18);
  expect(report.observation.bytes).toBe(18);
  expect(report.observation.observer_sha256).toBe(report.effect.effect_sha256);
  expect(report.listing).toEqual([{ name: "brief.md", bytes: 18, sha256: report.effect.effect_sha256 }]);
});

for (const dangling of [false, true]) {
  test(`target ${dangling ? "dangling " : ""}symlink refuses creation and observation`, () => {
    const report = fixture(setup + `
      const target = join(process.env.BIZRA_STATE_ROOT, "outside.md");
      if (!${dangling}) fs.writeFileSync(target, "private fixture");
      const link = join(store.OUTBOX_DIR, "link.md");
      fs.symlinkSync(target, link);
      let writeRefused = false, observeRefused = false;
      try { ex.boundedWrite("link.md", "replacement"); } catch { writeRefused = true; }
      try { ex.observe(link); } catch { observeRefused = true; }
      console.log(JSON.stringify({ writeRefused, observeRefused,
        read: ex.readOutboxFile("link.md"),
        target: fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null }));
    `);
    expect(report.writeRefused).toBe(true);
    expect(report.observeRefused).toBe(true);
    expect(report.read).toBeNull();
    expect(report.target).toBe(dangling ? null : "private fixture");
  });
}

test("symlinked ancestor refuses reads and writes", () => {
  const report = fixture(setup + `
    const outside = join(process.env.BIZRA_STATE_ROOT, "outside");
    fs.mkdirSync(outside);
    fs.writeFileSync(join(outside, "private.md"), "private fixture");
    fs.renameSync(store.OUTBOX_DIR, store.OUTBOX_DIR + "-original");
    fs.symlinkSync(outside, store.OUTBOX_DIR);
    let writeRefused = false, observeRefused = false;
    try { ex.boundedWrite("escape.md", "replacement"); } catch { writeRefused = true; }
    try { ex.observe(join(store.OUTBOX_DIR, "private.md")); } catch { observeRefused = true; }
    console.log(JSON.stringify({ writeRefused, observeRefused,
      read: ex.readOutboxFile("private.md"),
      escaped: fs.existsSync(join(outside, "escape.md")),
      target: fs.readFileSync(join(outside, "private.md"), "utf8") }));
  `);
  expect(report.writeRefused).toBe(true);
  expect(report.observeRefused).toBe(true);
  expect(report.read).toBeNull();
  expect(report.escaped).toBe(false);
  expect(report.target).toBe("private fixture");
});

for (const kind of ["directory", "fifo", "hardlink"]) {
  test(`${kind} cannot be observed as an outbox artifact`, () => {
    const report = fixture(setup + `
      const path = join(store.OUTBOX_DIR, "bad.md");
      if (${JSON.stringify(kind)} === "directory") fs.mkdirSync(path);
      if (${JSON.stringify(kind)} === "fifo") {
        const { spawnSync } = await import("node:child_process");
        const result = spawnSync("/usr/bin/mkfifo", [path]);
        if (result.status !== 0) throw new Error("fixture mkfifo failed");
      }
      if (${JSON.stringify(kind)} === "hardlink") {
        const target = join(process.env.BIZRA_STATE_ROOT, "external.md");
        fs.writeFileSync(target, "private fixture"); fs.linkSync(target, path);
      }
      let refused = false;
      try { ex.observe(path); } catch { refused = true; }
      console.log(JSON.stringify({ refused, read: ex.readOutboxFile("bad.md") }));
    `);
    expect(report.refused).toBe(true);
    expect(report.read).toBeNull();
  });
}

test("path aliases and external observations are refused", () => {
  const report = fixture(setup + `
    ex.boundedWrite("brief.md", "original");
    const outside = join(process.env.BIZRA_STATE_ROOT, "external.md");
    fs.writeFileSync(outside, "private fixture");
    const names = ["../brief.md", "folder/brief.md", join(store.OUTBOX_DIR, "brief.md")];
    const writes = names.map(name => { try { ex.boundedWrite(name, "replacement"); return false; } catch { return true; } });
    const reads = names.map(name => ex.readOutboxFile(name));
    let observeRefused = false;
    try { ex.observe(outside); } catch { observeRefused = true; }
    console.log(JSON.stringify({ writes, reads, observeRefused }));
  `);
  expect(report.writes).toEqual([true, true, true]);
  expect(report.reads).toEqual([null, null, null]);
  expect(report.observeRefused).toBe(true);
});

test("genuinely absent artifact remains absent", () => {
  const report = fixture(setup + `
    console.log(JSON.stringify({ observation: ex.observe(join(store.OUTBOX_DIR, "missing.md")),
      read: ex.readOutboxFile("missing.md"), listing: ex.outboxListings() }));
  `);
  expect(report.observation.exists).toBe(false);
  expect(report.observation.observer_sha256).toBe("");
  expect(report.read).toBeNull();
  expect(report.listing).toEqual([]);
});

test("unsafe outbox entries cannot leak through state presentation", () => {
  const report = fixture(setup + `
    const contracts = await import("./src/contracts.ts");
    contracts.seedContracts();
    const { buildState } = await import("./src/state.ts");
    buildState(Date.now());
    const target = join(process.env.BIZRA_STATE_ROOT, "external.md");
    fs.writeFileSync(target, "private fixture");
    fs.symlinkSync(target, join(store.OUTBOX_DIR, "link.md"));
    let refused = false;
    try { buildState(Date.now()); } catch { refused = true; }
    console.log(JSON.stringify({ refused }));
  `);
  expect(report.refused).toBe(true);
});

test("two creators leave exactly one complete artifact", () => {
  const report = fixture(setup + `
    const { spawn } = await import("node:child_process");
    const payloads = ["a".repeat(1000), "b".repeat(1000)];
    const results = await Promise.all(payloads.map(text => new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["-e", 
        'const ex = await import("./src/executor.ts"); try { ex.boundedWrite("race.md", ' + JSON.stringify(text) + '); process.exit(0); } catch { process.exit(3); }'],
        { cwd: process.cwd(), env: process.env, stdio: "ignore" });
      child.on("error", reject); child.on("exit", resolve);
    })));
    console.log(JSON.stringify({ results, text: fs.readFileSync(join(store.OUTBOX_DIR, "race.md"), "utf8") }));
  `);
  expect(report.results.filter((code: number) => code === 0)).toHaveLength(1);
  expect(report.results.filter((code: number) => code === 3)).toHaveLength(1);
  expect(["a".repeat(1000), "b".repeat(1000)]).toContain(report.text);
});

for (const entry of ["standaloneProposal", "runMission"]) {
  test(`${entry} never presents unobserved liveness as LIVE`, () => {
    const report = fixture(`
      const { mock } = await import("bun:test");
      let captured, calls = 0;
      mock.module("./src/model-provider.ts", () => ({
        MODEL_AUTHORITY_LABEL: "PROPOSE_ONLY", MAX_MODEL_CALLS_PER_MISSION: 1,
        modelCallsUsed: () => 0,
        getModelSelection: () => ({ model: "fixture", digest: null, endpoint: null }),
        modelCall: async input => { captured = input; calls++; return {
          ok: false, code: "FIXTURE_NO_DISPATCH", reason: "no inference",
          provider_id: "fixture", endpoint: null, endpoint_class: "NONE"
        }; }
      }));
      const mission = await import("./src/mission.ts");
      const result = await mission.${entry}();
      const store = await import("./src/store.ts");
      const { readdirSync } = await import("node:fs");
      console.log(JSON.stringify({ prompt: captured.user, calls, result,
        artifacts: readdirSync(store.OUTBOX_DIR),
        receipts: store.one("SELECT COUNT(*) AS n FROM receipts WHERE kind='MISSION_RECEIPT'").n }));
    `);
    expect(report.prompt).toContain('"node0_status": "UNKNOWN"');
    expect(report.prompt).not.toContain('"node0_status": "LIVE"');
    expect(report.prompt).not.toContain("measured, authoritative");
    expect(report.calls).toBe(1);
    expect(report.artifacts).toEqual([]);
    expect(report.receipts).toBe(0);
    if (entry === "runMission") expect(report.result.status).toBe("REFUSED");
    else expect(report.result.body.ok).toBe(false);
  });
}

const recoverySetup = setup + `
  const { mock } = await import("bun:test");
  let dispatches = 0;
  mock.module("./src/model-provider.ts", () => ({
    MODEL_AUTHORITY_LABEL: "PROPOSE_ONLY", MAX_MODEL_CALLS_PER_MISSION: 1,
    modelCallsUsed: () => dispatches,
    getModelSelection: () => ({ model: "fixture", digest: null, endpoint: null }),
    modelCall: async () => { dispatches++; throw new Error("RECOVERY_MUST_NOT_DISPATCH"); }
  }));
  const contracts = await import("./src/contracts.ts");
  contracts.seedContracts();
  const mission = await import("./src/mission.ts");
  const { sha256obj } = await import("./src/hash.ts");
  const { createHash } = await import("node:crypto");
  const hash = x => createHash("sha256").update(x).digest("hex");
  const bytes = "fixture brief " + "evidence ".repeat(60);
  let path = join(store.OUTBOX_DIR, mission.missionContract().path);
  fs.writeFileSync(path, bytes);
  const attempt = "FIXTURE-ATTEMPT";
  const checkpoint = {
    mission_hash: hash(mission.MISSION_ID), contract_hash: sha256obj(mission.missionContract()),
    attempt_hash: hash(attempt), proposal_hash: hash("fixture proposal"),
    sat_verdict_hash: hash("fixture verdict"), fate_decision_hash: hash("fixture lease"),
    effect_hash: hash(bytes), observer_hash: hash(bytes),
  };
`;

const insertCheckpoint = `
  store.run("INSERT INTO missions (id, attempt_id, status, effect_path, effect_sha256, effect_writes, result) VALUES (?, ?, 'EFFECTED', ?, ?, 1, ?)",
    mission.MISSION_ID, attempt, path, hash(bytes), checkpointJSON);
`;

const corruptions: [string, string][] = [
  ["changed output", 'fs.writeFileSync(path, "corrupt fixture");'],
  ["missing output", "fs.unlinkSync(path);"],
  ["symlink output", 'fs.unlinkSync(path); const outside = join(process.env.BIZRA_STATE_ROOT, "outside.md"); fs.writeFileSync(outside, bytes); fs.symlinkSync(outside, path);'],
  ["malformed checkpoint", 'checkpointJSON = "{";'],
  ["null checkpoint", 'checkpointJSON = "null";'],
  ["empty proposal digest", 'checkpoint.proposal_hash = "";'],
  ["invalid proposal digest", 'checkpoint.proposal_hash = "not-a-sha256";'],
  ["wrong attempt digest", 'checkpoint.attempt_hash = hash("other attempt");'],
  ["wrong contract digest", 'checkpoint.contract_hash = hash("other contract");'],
  ["wrong mission digest", 'checkpoint.mission_hash = hash("other mission");'],
  ["wrong observer digest", 'checkpoint.observer_hash = hash("other observation");'],
  ["wrong output filename", 'path = join(store.OUTBOX_DIR, "other.md"); fs.writeFileSync(path, bytes);'],
];
for (const key of ["mission_hash", "contract_hash", "attempt_hash", "proposal_hash",
  "sat_verdict_hash", "fate_decision_hash", "effect_hash", "observer_hash"]) {
  corruptions.push([`missing ${key}`, `delete checkpoint.${key};`]);
}

for (const [name, mutation] of corruptions) {
  test(`EFFECTED recovery refuses ${name} without rewriting proof or dispatching`, () => {
    const report = fixture(recoverySetup + `
      let checkpointJSON;
      ${mutation}
      checkpointJSON ??= JSON.stringify(checkpoint);
      ${insertCheckpoint}
      const before = store.one("SELECT result FROM missions").result;
      const beforeBytes = fs.existsSync(path) && !fs.lstatSync(path).isSymbolicLink() ? fs.readFileSync(path, "utf8") : null;
      let result;
      try { result = await mission.runMission(); } catch (error) { result = { status: "THREW", reason: String(error) }; }
      const row = store.one("SELECT status, result FROM missions");
      const afterBytes = fs.existsSync(path) && !fs.lstatSync(path).isSymbolicLink() ? fs.readFileSync(path, "utf8") : null;
      console.log(JSON.stringify({ result, before, row, dispatches, beforeBytes, afterBytes,
        receipts: store.one("SELECT COUNT(*) AS n FROM receipts WHERE kind='MISSION_RECEIPT'").n }));
    `);
    expect(report.result.status).toBe("UNKNOWN");
    expect(report.result.ladder.some((step: any) => ["OBSERVE", "SEAL"].includes(step.step) && step.status === "DONE")).toBe(false);
    expect(report.receipts).toBe(0);
    expect(report.dispatches).toBe(0);
    expect(report.row.status).toBe("EFFECTED");
    expect(report.row.result).toBe(report.before);
    expect(report.afterBytes).toBe(report.beforeBytes);
  });
}

test("intact recovery seals actual bytes once and reuses its durable receipt", () => {
  const report = fixture(recoverySetup + `
    const checkpointJSON = JSON.stringify(checkpoint);
    ${insertCheckpoint}
    const first = await mission.runMission();
    const second = await mission.runMission();
    console.log(JSON.stringify({ first, second, dispatches, checkpoint,
      bytes: fs.readFileSync(path, "utf8"), files: fs.readdirSync(store.OUTBOX_DIR),
      receipts: store.one("SELECT COUNT(*) AS n FROM receipts WHERE kind='MISSION_RECEIPT'").n }));
  `);
  expect(report.first.status).toBe("DONE");
  expect(report.second.status).toBe("DONE");
  expect(report.second.receipt).toEqual(report.first.receipt);
  expect(report.first.receipt.eight_hashes).toEqual(report.checkpoint);
  expect(report.receipts).toBe(1);
  expect(report.files).toHaveLength(1);
  expect(report.dispatches).toBe(0);
  expect(report.bytes).toBe("fixture brief " + "evidence ".repeat(60));
});

for (const [name, mutation] of [
  ["changed output", 'fs.writeFileSync(path, "corrupt fixture");'],
  ["missing output", "fs.unlinkSync(path);"],
  ["missing receipt reference", 'const stored = JSON.parse(store.one("SELECT result FROM missions").result); delete stored.receipt; store.run("UPDATE missions SET result = ?", JSON.stringify(stored));'],
  ["wrong receipt digest", 'const stored = JSON.parse(store.one("SELECT result FROM missions").result); stored.receipt.digest = hash("forged receipt"); store.run("UPDATE missions SET result = ?", JSON.stringify(stored));'],
  ["missing durable receipt", 'store.run("DELETE FROM receipts WHERE kind=\'MISSION_RECEIPT\'");'],
  ["changed durable payload", 'store.run("UPDATE receipts SET payload = \'{}\' WHERE kind=\'MISSION_RECEIPT\'");'],
] as [string, string][]) {
  test(`SEALED recovery refuses ${name}`, () => {
    const report = fixture(recoverySetup + `
      const checkpointJSON = JSON.stringify(checkpoint);
      ${insertCheckpoint}
      const first = await mission.runMission();
      if (first.status !== "DONE") throw new Error("fixture did not seal");
      ${mutation}
      const before = store.one("SELECT result FROM missions").result;
      const receiptsBefore = store.one("SELECT COUNT(*) AS n FROM receipts").n;
      const result = await mission.runMission();
      console.log(JSON.stringify({ result, before, dispatches, receiptsBefore,
        after: store.one("SELECT result FROM missions").result,
        receipts: store.one("SELECT COUNT(*) AS n FROM receipts").n }));
    `);
    expect(report.result.status).toBe("UNKNOWN");
    expect(report.receipts).toBe(report.receiptsBefore);
    expect(report.after).toBe(report.before);
    expect(report.dispatches).toBe(0);
  });
}

test("normal fixture crash drill persists proof for recovery without redispatch", () => {
  const report = fixture(setup + `
    const { mock } = await import("bun:test");
    let dispatches = 0;
    mock.module("./src/model-provider.ts", () => ({
      MODEL_AUTHORITY_LABEL: "PROPOSE_ONLY", MAX_MODEL_CALLS_PER_MISSION: 1,
      modelCallsUsed: () => dispatches,
      getModelSelection: () => ({ model: "fixture", digest: null, endpoint: null }),
      modelCall: async () => {
        dispatches++;
        const mission = await import("./src/mission.ts");
        const contracts = await import("./src/contracts.ts");
        const text = mission.missionContract().anchors.join("\\n") + "\\n"
          + contracts.contractsSnapshot().map(c => c.key + "=" + c.value + " " + c.unit).join("\\n")
          + "\\n" + "Local fixture evidence only. ".repeat(20);
        return { ok: true, text, provider_id: "fixture", endpoint: null,
          endpoint_class: "NONE", identity: { model_name: "fixture", model_digest: null } };
      }
    }));
    const contracts = await import("./src/contracts.ts"); contracts.seedContracts();
    const mission = await import("./src/mission.ts");
    const first = await mission.runMission({ crashAfter: "OBSERVE" });
    const checkpoint = JSON.parse(store.one("SELECT result FROM missions").result);
    const before = fs.readFileSync(join(store.OUTBOX_DIR, mission.missionContract().path), "utf8");
    const second = await mission.runMission();
    console.log(JSON.stringify({ first, second, checkpoint, dispatches,
      before, after: fs.readFileSync(join(store.OUTBOX_DIR, mission.missionContract().path), "utf8"),
      receipts: store.one("SELECT COUNT(*) AS n FROM receipts WHERE kind='MISSION_RECEIPT'").n }));
  `);
  expect(report.first.status).toBe("UNKNOWN");
  expect(report.checkpoint).not.toBeNull();
  for (const key of ["mission_hash", "contract_hash", "attempt_hash", "proposal_hash",
    "sat_verdict_hash", "fate_decision_hash", "effect_hash", "observer_hash"]) {
    expect(report.checkpoint[key]).toMatch(/^[a-f0-9]{64}$/);
  }
  expect(report.second.status).toBe("DONE");
  expect(report.before).toBe(report.after);
  expect(report.dispatches).toBe(1);
  expect(report.receipts).toBe(1);
});
