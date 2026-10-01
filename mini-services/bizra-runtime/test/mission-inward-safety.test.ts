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
