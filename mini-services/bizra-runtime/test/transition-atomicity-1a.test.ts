import { test, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const SERVICE = join(import.meta.dir, "..");

test("a transition is never authoritative without its receipt", () => {
  const root = mkdtempSync(join(tmpdir(), "bizra-transition-atomic-"));
  const script = `
    const store = await import("./src/store.ts");
    const contracts = await import("./src/contracts.ts");
    const chain = await import("./src/chain.ts");
    const auto = await import("./src/auto.ts");
    const fate = await import("./src/fate.ts");
    contracts.seedContracts();
    const before = contracts.contractValue("FATE_TTL_MS");
    const input = { cycleId: "CYCLE-ATOMIC", target: "FATE_TTL_MS", before, after: before + 1000, hypothesisId: 1, proposal: { target_contract: "FATE_TTL_MS", after_value: before + 1000 }, satVerdictHash: "sat", fateDecisionHash: "fate" };

    store.db.exec("CREATE TRIGGER fail_transition BEFORE INSERT ON receipts WHEN NEW.kind = \\\"TRANSITION_RECEIPT\\\" BEGIN SELECT RAISE(ABORT, \\\"injected transition receipt failure\\\"); END;");
    let failed = "";
    try { auto.commitContractTransition(input); } catch (error) { failed = String(error.message || error); }
    const afterFailed = contracts.contractValue(input.target);

    store.db.exec("DROP TRIGGER fail_transition");
    const committed = auto.commitContractTransition(input);
    const afterCommit = contracts.contractValue(input.target);

    let stale = "";
    try { auto.commitContractTransition({ ...input, cycleId: "CYCLE-STALE", after: before + 2000 }); } catch (error) { stale = String(error.message || error); }

    const lease = fate.issueLease("REVERT-" + committed.transitionId, "HUMAN_REVERT", { ttlMs: 10000, effectClass: "CONTRACT_TRANSITION" });
    if (!lease.ok) throw new Error(lease.reason);
    if (!fate.consumeLease(lease.lease.id).ok) throw new Error("revert lease was not consumed");
    store.db.exec("CREATE TRIGGER fail_revert BEFORE INSERT ON receipts WHEN NEW.kind = \\\"TRANSITION_REVERT\\\" BEGIN SELECT RAISE(ABORT, \\\"injected revert receipt failure\\\"); END;");
    let revertFailed = "";
    try { auto.revertTransition(committed.transitionId, { leaseId: lease.lease.id }); } catch (error) { revertFailed = String(error.message || error); }
    const afterFailedRevert = contracts.contractValue(input.target);
    const revertedAfterFailure = store.one("SELECT reverted FROM transitions WHERE id = ?", committed.transitionId)?.reverted;

    store.db.exec("DROP TRIGGER fail_revert");
    const lease2 = fate.issueLease("REVERT-" + committed.transitionId, "HUMAN_REVERT_RETRY", { ttlMs: 10000, effectClass: "CONTRACT_TRANSITION" });
    if (!lease2.ok) throw new Error(lease2.reason);
    if (!fate.consumeLease(lease2.lease.id).ok) throw new Error("revert retry lease was not consumed");
    const reverted = auto.revertTransition(committed.transitionId, { leaseId: lease2.lease.id });

    console.log(JSON.stringify({
      before,
      afterFailed,
      afterCommit,
      stale,
      failed,
      revertFailed,
      afterFailedRevert,
      revertedAfterFailure,
      reverted: reverted.ok,
      afterRevert: contracts.contractValue(input.target),
      receipts: store.one("SELECT COUNT(*) AS n FROM receipts")?.n,
      transitions: store.one("SELECT COUNT(*) AS n FROM transitions")?.n,
      chain: chain.verifyChain(),
    }));
  `;
  const result = spawnSync("bun", ["-e", script], {
    cwd: SERVICE,
    env: { ...process.env, BIZRA_RUNTIME_MODE: "LOCAL_FOUNDER", BIZRA_BIND_HOST: "127.0.0.1", BIZRA_STATE_ROOT: root },
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  const report = JSON.parse(result.stdout.trim().split("\n").at(-1)!);
  expect(report.afterFailed).toBe(report.before);
  expect(report.failed).toMatch(/injected transition receipt failure/);
  expect(report.afterCommit).toBe(report.before + 1000);
  expect(report.stale).toMatch(/TRANSITION_STALE_STATE/);
  expect(report.revertFailed).toMatch(/injected revert receipt failure/);
  expect(report.afterFailedRevert).toBe(report.afterCommit);
  expect(report.revertedAfterFailure).toBe(0);
  expect(report.reverted).toBe(true);
  expect(report.afterRevert).toBe(report.before);
  expect(report.receipts).toBe(2);
  expect(report.transitions).toBe(1);
  expect(report.chain.ok).toBe(true);
});
