/**
 * BIZRA Node0 — kernel scenario probe (CONTROL-PLANE-SEAL-1B, Phase 2 tests).
 *
 * Runs a single kernel-level scenario in its OWN process (fresh env, fresh
 * module state) over an explicit temp state root, then prints one JSON line.
 * This isolation is what keeps combined `bun test test/*.test.ts` runs free of
 * cross-file module-cache contamination.
 *
 * Usage: BIZRA_STATE_ROOT=<root> BIZRA_RUNTIME_MODE=LOCAL_FOUNDER \
 *        BIZRA_BIND_HOST=127.0.0.1 BIZRA_PORT=<port> \
 *        bun scripts/kernel-probe.ts <scenario>
 *
 * Scenarios: ev01_tamper · ev02_legacy · co01_labels · co02_same_artifact ·
 *            co03_repeat_domain · co04_two_domains · co05_n1
 */
import { join } from "node:path";
import { createHash } from "node:crypto";

const scenario = process.argv[2] ?? "";
const root = process.env.BIZRA_STATE_ROOT ?? "";

const traces = await import("../src/traces");
const sat = await import("../src/sat");
const store = await import("../src/store");

const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const CATALOG = [{ key: "TEST_CONTRACT", value: 1, min: 0, max: 10 }];
const PRINCIPAL = "local:mumu:founder-control";
const OPERATOR = { local_control_principal_id: PRINCIPAL, producer_id: "operator_input_adapter", evidence_domain: "OPERATOR_STATEMENT" } as const;
const RUNTIME_OBS = { local_control_principal_id: null, producer_id: "runtime_state_observer", evidence_domain: "RUNTIME_STATE" } as const;

function verify(cited: number[], floor: number) {
  return sat.verifyDiagnosticContract({
    cycleId: `PROBE-${scenario}`,
    hypothesis: `probe ${scenario}`,
    targetContract: "TEST_CONTRACT",
    beforeValue: 1,
    afterValue: 2,
    dod: "TEST_CONTRACT probe",
    citedTraces: cited,
    catalog: CATALOG,
    corroborationMin: floor,
  });
}

function result(o: Record<string, unknown>) {
  console.log(JSON.stringify(o));
}

switch (scenario) {
  case "ev01_tamper": {
    // one v2 trace; tamper each decision-bearing field; both the digest AND
    // the SAT provenance clause must break.
    const t = traces.ingestTrace({
      source: "browser", kind: "observation", payload: "ev01-artifact",
      correlation: "EV01", external: true, actor_id: "alice",
      evidence: { ...OPERATOR, artifact_hash: sha("ev01-artifact") },
    });
    const row = store.one("SELECT * FROM traces WHERE id = ?", t.id);
    const tamperValues: Record<string, unknown> = {
      ts: "1999-01-01T00:00:00.000Z",
      source: "runtime",
      kind: "metric",
      correlation: "TAMPERED",
      payload: "tampered-payload",
      local_control_principal_id: "local:evil:spoof",
      producer_id: "receipt_chain_observer",
      evidence_domain: "RECEIPT_STATE",
      artifact_hash: sha("tampered-payload"),
      evidence_version: 1,
    };
    const fields: Record<string, { digest_changed: boolean; provenance_failed: boolean }> = {};
    for (const [f, tampered] of Object.entries(tamperValues)) {
      const original = row[f];
      // 1) digest coverage: recomputing over the tampered row must differ
      const probeRow = { ...row, [f]: tampered };
      const recomputed = (probeRow.evidence_version ?? 1) >= 2
        ? traces.traceDigestV2(probeRow)
        : traces.traceDigestV1(probeRow);
      const digestChanged = recomputed !== row.sha256;
      // 2) end-to-end: write the tampered value, SAT provenance must fail, restore
      store.run("UPDATE traces SET " + f + " = ? WHERE id = ?", tampered, t.id);
      const v = verify([t.id!], 1);
      const provenanceFailed = !v.clauses!.provenance.pass;
      store.run("UPDATE traces SET " + f + " = ? WHERE id = ?", original, t.id);
      fields[f] = { digest_changed: digestChanged, provenance_failed: provenanceFailed };
    }
    result({ scenario, trace_id: t.id, fields });
    break;
  }
  case "ev02_legacy": {
    // two archived v1 traces: provenance readable, corroboration ineligible
    const rows = store.all("SELECT id FROM traces WHERE admissible = 1 ORDER BY id ASC LIMIT 2");
    const v = verify(rows.map((r: any) => r.id), 2);
    result({
      scenario,
      cited: rows.map((r: any) => r.id),
      provenance_pass: v.clauses!.provenance.pass,
      corroboration_pass: v.clauses!.corroboration.pass,
      detail: v.clauses!.corroboration.detail,
      reason: v.clauses!.corroboration.detail,
    });
    break;
  }
  case "co01_labels": {
    // one key, ten labels, one domain, distinct artifacts
    const ids: number[] = [];
    for (let i = 0; i < 10; i++) {
      const t = traces.ingestTrace({
        source: "browser", kind: "observation", payload: `co01-artifact-${i}`,
        correlation: "CO01", external: true, actor_id: `actor-label-${i}`,
        evidence: { ...OPERATOR, artifact_hash: sha(`co01-artifact-${i}`) },
      });
      ids.push(t.id!);
    }
    const v = verify(ids, 2);
    result({ scenario, corroboration_pass: v.clauses!.corroboration.pass, domain_count: 1, detail: v.clauses!.corroboration.detail });
    break;
  }
  case "co02_same_artifact": {
    // the SAME artifact hash, three times, under different labels
    const artifact = "co02-same-artifact";
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t = traces.ingestTrace({
        source: "browser", kind: "observation", payload: artifact,
        correlation: `CO02-${i}`, external: true, actor_id: `label-${i}`,
        evidence: { ...OPERATOR, artifact_hash: sha(artifact) },
      });
      ids.push(t.id!);
    }
    const v = verify(ids, 2);
    result({ scenario, corroboration_pass: v.clauses!.corroboration.pass, domain_count: 1, detail: v.clauses!.corroboration.detail });
    break;
  }
  case "co03_repeat_domain": {
    // same producer/domain, three DIFFERENT artifacts — still one domain
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t = traces.ingestTrace({
        source: "browser", kind: "observation", payload: `co03-artifact-${i}`,
        correlation: "CO03", external: true, actor_id: "alice",
        evidence: { ...OPERATOR, artifact_hash: sha(`co03-artifact-${i}`) },
      });
      ids.push(t.id!);
    }
    const v = verify(ids, 2);
    result({ scenario, corroboration_pass: v.clauses!.corroboration.pass, domain_count: 1, detail: v.clauses!.corroboration.detail });
    break;
  }
  case "co04_two_domains": {
    // two trusted producer/domains with distinct artifact hashes — floor 2 satisfied
    const a = traces.ingestTrace({
      source: "browser", kind: "observation", payload: "co04-external",
      correlation: "CO04", external: true, actor_id: "alice",
      evidence: { ...OPERATOR, artifact_hash: sha("co04-external") },
    });
    const b = traces.ingestTrace({
      source: "runtime", kind: "observation", payload: "co04-internal",
      correlation: "CO04", evidence: { ...RUNTIME_OBS, artifact_hash: sha("co04-internal") },
    });
    const v = verify([a.id!, b.id!], 2);
    result({ scenario, corroboration_pass: v.clauses!.corroboration.pass, domain_count: 2, detail: v.clauses!.corroboration.detail });
    break;
  }
  case "co05_n1": {
    // ten labels from one key: all principals identical, one domain, floor 2 fails
    const ids: number[] = [];
    const principals = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const t = traces.ingestTrace({
        source: "browser", kind: "observation", payload: `co05-artifact-${i}`,
        correlation: "CO05", external: true, actor_id: `human-label-${i}`,
        evidence: { ...OPERATOR, artifact_hash: sha(`co05-artifact-${i}`) },
      });
      ids.push(t.id!);
      principals.add(t.evidence.local_control_principal_id ?? "null");
    }
    const v = verify(ids, 2);
    result({
      scenario,
      all_principals_identical: principals.size === 1,
      corroboration_pass: v.clauses!.corroboration.pass,
      domain_count: 1,
      detail: v.clauses!.corroboration.detail,
    });
    break;
  }
  default:
    console.error(`kernel-probe: unknown scenario '${scenario}'`);
    process.exit(1);
}
