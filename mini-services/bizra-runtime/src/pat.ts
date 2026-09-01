/**
 * BIZRA Node0 — PAT, the Proposer.
 * PAT proposes. PAT never executes, never verifies, never seals.
 *
 * LOCAL-MODEL-PROVIDER-1A: PAT's model call is now BEHIND the model-neutral
 * ModelProvider port (src/model-provider.ts + src/ollama-provider.ts). PAT no
 * longer imports z-ai-web-dev-sdk or any remote SDK — the historical Z.ai
 * provider exists only as a documented memory (REFERENCE_OR_DEV_REMOTE_PROVIDER)
 * and is NOT wired to this runtime. In LOCAL_FOUNDER, PAT's single bounded call
 * goes to the LOCAL loopback provider only. If it is unavailable, PAT refuses
 * with LOCAL_MODEL_UNAVAILABLE — no cloud fallback, no remote convenience
 * fallback, never silent.
 *
 * The call remains bounded exactly as the constitution requires: one call per
 * mission (durable budget, no retry), hard timeout, byte caps, strict JSON
 * parse for cycle hypotheses. Failure, noise, or malformed output => REFUSAL.
 * MODEL AUTHORITY IS PROPOSE_ONLY — authority_delta = 0, always.
 * DETERMINISTIC (PAT-0) mode stays pure code triggers: no model, no authority.
 * PAT holds no keys, no lease, no write path. Hierarchy formation is
 * structurally impossible: a proposer that cannot act cannot become a
 * coordinator.
 */
import { one, run } from "./store";
import { nowIso, sha256obj } from "./hash";
import { modelCall, getModelSelection, MODEL_AUTHORITY_LABEL } from "./model-provider";

let modelCalls = 0;
let modelFailures = 0;

export function patStats() {
  return { model_calls: modelCalls, model_failures: modelFailures };
}

function logPat(subject: string, purpose: string, mode: string, status: string, calls: number, detail: string) {
  run(
    "INSERT INTO pat_log (ts, subject, purpose, mode, status, calls, detail) VALUES (?, ?, ?, ?, ?, ?, ?)",
    nowIso(), subject, purpose, mode, status, calls, detail,
  );
}

export function lastPat() {
  return one<any>("SELECT ts, subject, purpose, mode, status, calls, detail FROM pat_log ORDER BY id DESC LIMIT 1");
}

/** One bounded model call through the ModelProvider port — the ONLY model
 *  path in the system. Local provider only; never remote; one attempt. */
async function callModelOnce(subject: string, system: string, user: string): Promise<
  | {
      ok: true;
      text: string;
      model: { provider_id: string; provider_kind: string; endpoint: string; endpoint_class: string; model_name: string; model_digest: string | null };
    }
  | { ok: false; code: string; reason: string; provider_id: string; endpoint: string | null }
> {
  modelCalls++;
  const selection = getModelSelection();
  const res = await modelCall({
    mission_id: subject,
    model: selection.model ?? "",
    expected_digest: selection.digest,
    system,
    user,
  });
  if (!res.ok) {
    modelFailures++;
    return { ok: false, code: res.code, reason: `${res.code}: ${res.reason}`, provider_id: res.provider_id, endpoint: res.endpoint };
  }
  return {
    ok: true,
    text: res.text,
    model: {
      provider_id: res.provider_id,
      provider_kind: "LOCAL_OLLAMA",
      endpoint: res.endpoint,
      endpoint_class: res.endpoint_class,
      model_name: res.identity.model_name,
      model_digest: res.identity.model_digest,
    },
  };
}

/** Deterministic extraction of a single JSON object. Bounded parser, not a fallback.
 *  Handles: bare JSON, fenced JSON, JSON wrapped in prose (balanced-brace scan). */
function parseStrictJson(text: string): { ok: true; value: any } | { ok: false; reason: string } {
  const trimmed = text.trim();
  const attempts: string[] = [];
  attempts.push(trimmed);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) attempts.push(fenced[1].trim());
  // Balanced-brace scan: first complete top-level object, string-aware.
  const start = trimmed.indexOf("{");
  if (start !== -1) {
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (esc) { esc = false; continue; }
      if (ch === "\\" && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) { attempts.push(trimmed.slice(start, i + 1)); break; }
      }
    }
  }
  for (const a of attempts) {
    if (!a.startsWith("{")) continue;
    try {
      return { ok: true, value: JSON.parse(a) };
    } catch {
      continue;
    }
  }
  return { ok: false, reason: `PAT_MALFORMED: no strict JSON object found in ${trimmed.length}B` };
}

// ---------------------------------------------------------------------------
// Mission proposal: the morning delta brief.
// ---------------------------------------------------------------------------

export interface MissionProposal {
  mode: "MODEL_PROVIDER";
  text: string;
  model_calls: number;
  proposal_sha256: string;
}

export interface PatModelInfo {
  provider_id: string;
  provider_kind: string;
  endpoint: string;
  endpoint_class: string;
  model_name: string;
  model_digest: string | null;
}

export async function proposeMissionBrief(
  missionId: string,
  context: {
    date: string;
    node0_status: string;
    constitution_root: string;
    chain_head: string;
    contracts: { key: string; value: number; unit: string }[];
    dema_last: { subject: string; status: string } | null;
    signals: Record<string, number>;
  },
  anchors: string[],
): Promise<
  | { ok: true; proposal: MissionProposal; model: PatModelInfo }
  | { ok: false; code: string; reason: string; model: { provider_id: string; provider_kind: string; endpoint: string | null; endpoint_class: string; model_name: string | null; model_digest: string | null } }
> {
  const selection = getModelSelection();
  const modelInfo = (res?: { provider_id?: string; endpoint?: string | null; endpoint_class?: string }) => ({
    provider_id: res?.provider_id ?? "local-ollama",
    provider_kind: "LOCAL_OLLAMA",
    endpoint: res?.endpoint ?? selection.endpoint,
    endpoint_class: res?.endpoint_class ?? "LOOPBACK",
    model_name: selection.model,
    model_digest: selection.digest,
  });
  const system =
    "You are PAT, the Proposer organ of the BIZRA constitutional runtime. You propose exactly one bounded artifact. " +
    "You have no tools, no network, no authority. You never execute. Output ONLY the requested artifact — no preamble, no code fences, no commentary.";
  const user =
    `Write the BIZRA NODE0 morning delta brief as clean markdown.\n\n` +
    `Runtime context (measured, authoritative):\n${JSON.stringify(context, null, 2)}\n\n` +
    `Hard form law (a deterministic verifier will check every clause):\n` +
    `- 120 to 250 words of markdown.\n` +
    `- MUST contain verbatim, each on its own occurrence: ${anchors.map((a) => JSON.stringify(a)).join(", ")}.\n` +
    `- Each contract on its own line in the exact form KEY=value UNIT.\n` +
    `- NO URLs, NO IP addresses, NO base64 blobs, NO hidden data in names or whitespace.\n` +
    `- Honest tone: state what is measured, what is verified, what remains unknown.\n` +
    `Output the markdown document only.`;
  const res = await callModelOnce(missionId, system, user);
  if (!res.ok) {
    logPat(missionId, "MISSION_PROPOSAL", "MODEL_PROVIDER", "REFUSED", modelCalls, res.reason.slice(0, 300));
    return { ok: false, code: res.code, reason: res.reason, model: modelInfo(res) };
  }
  logPat(missionId, "MISSION_PROPOSAL", "MODEL_PROVIDER", "PROPOSED", modelCalls, `${res.text.length} bytes via ${res.model.provider_id}${res.model.model_digest ? ` digest=${res.model.model_digest.slice(0, 19)}…` : ""}`);
  const proposal = {
    mode: "MODEL_PROVIDER" as const,
    text: res.text,
    model_calls: 1,
    proposal_sha256: sha256obj({ mission: missionId, text: res.text, mode: "MODEL_PROVIDER" }),
  };
  return { ok: true, proposal, model: res.model };
}

// ---------------------------------------------------------------------------
// Cycle hypothesis: traces -> one bounded proposal (or an honest NO).
// ---------------------------------------------------------------------------

export interface CycleHypothesis {
  proposal: "YES" | "NO";
  hypothesis: string;
  target_contract: string;
  after_value: number;
  dod: string;
  cited_traces: number[];
}

export async function proposeCycleHypothesis(
  cycleId: string,
  signals: Record<string, number | string>,
  catalog: { key: string; label: string; value: number; min: number; max: number; unit: string; description: string }[],
  traces: { id: number; source: string; kind: string; payload: string }[],
  corroborationMin: number,
): Promise<{ ok: true; hypothesis: CycleHypothesis; raw: string; model_calls: number } | { ok: false; code: string; reason: string }> {
  const system =
    "You are PAT, the Proposer organ of the BIZRA constitutional runtime, running an autopoietic cycle. " +
    "You may propose AT MOST ONE bounded change to ONE engine contract. A deterministic verifier (SAT) will check " +
    "provenance, consistency, disambiguation, and corroboration. Reply with a single JSON object and nothing else.";
  const user =
    `Autopoietic cycle ${cycleId}.\n\n` +
    `Measured signals (recomputed independently by SAT — do not contradict them):\n${JSON.stringify(signals, null, 2)}\n\n` +
    `Engine contracts (the ONLY mutable surface, clamped):\n${JSON.stringify(catalog, null, 2)}\n\n` +
    `Admissible evidence traces (cite by id; at least ${corroborationMin} DISTINCT sources must appear among your citations or SAT will refuse):\n` +
    traces.map((t) => `#${t.id} [${t.source}/${t.kind}] ${t.payload.slice(0, 160)}`).join("\n") +
    `\n\nRespond with EXACTLY this JSON shape:\n` +
    `{"proposal":"YES"|"NO","hypothesis":"<one sentence, <=200 chars>","target_contract":"<catalog key>","after_value":<number within clamp>,"dod":"<definition of done, must contain the contract key>","cited_traces":[<trace ids>]}\n` +
    `If the evidence does not justify any change, set proposal to "NO" — stability is a valid, honest result. A "YES" whose after_value equals the current value is a no-op and WILL be refused by the verifier. Never invent trace ids.` +
    `\nDECISION RULE: if the optimal value equals the current value, answer "NO". If "YES", after_value MUST differ from the current value and stay within the clamp.`;
  const res = await callModelOnce(cycleId, system, user);
  if (!res.ok) {
    logPat(cycleId, "CYCLE_HYPOTHESIS", "MODEL_PROVIDER", "REFUSED", modelCalls, res.reason.slice(0, 300));
    return { ok: false, code: res.code, reason: res.reason };
  }
  const parsed = parseStrictJson(res.text);
  if (!parsed.ok) {
    logPat(cycleId, "CYCLE_HYPOTHESIS", "MODEL_PROVIDER", "REFUSED", modelCalls, `${parsed.reason} | raw_head: ${res.text.slice(0, 200).replace(/\s+/g, " ")}`);
    return { ok: false, code: "PAT_MALFORMED", reason: parsed.reason };
  }
  const v = parsed.value;
  if (typeof v?.proposal !== "string" || !["YES", "NO"].includes(v.proposal)) {
    return { ok: false, code: "PAT_MALFORMED", reason: "PAT_MALFORMED: proposal field must be YES or NO" };
  }
  if (v.proposal === "YES") {
    if (typeof v.hypothesis !== "string" || v.hypothesis.length === 0 || v.hypothesis.length > 500) {
      return { ok: false, code: "PAT_MALFORMED", reason: "PAT_MALFORMED: hypothesis missing or over 500 chars" };
    }
    if (typeof v.target_contract !== "string" || !catalog.some((c) => c.key === v.target_contract)) {
      return { ok: false, code: "PAT_MALFORMED", reason: "PAT_MALFORMED: target_contract not in catalog" };
    }
    if (typeof v.after_value !== "number" || !Number.isFinite(v.after_value)) {
      return { ok: false, code: "PAT_MALFORMED", reason: "PAT_MALFORMED: after_value must be a finite number" };
    }
    if (typeof v.dod !== "string" || v.dod.length === 0 || v.dod.length > 300) {
      return { ok: false, code: "PAT_MALFORMED", reason: "PAT_MALFORMED: dod missing or over 300 chars" };
    }
    if (!Array.isArray(v.cited_traces) || v.cited_traces.length === 0 || !v.cited_traces.every((x: any) => Number.isInteger(x))) {
      return { ok: false, code: "PAT_MALFORMED", reason: "PAT_MALFORMED: cited_traces must be an array of trace ids" };
    }
  }
  logPat(cycleId, "CYCLE_HYPOTHESIS", "MODEL_PROVIDER", "PROPOSED", modelCalls, `proposal=${v.proposal}`);
  return { ok: true, hypothesis: v, raw: res.text, model_calls: 1 };
}
