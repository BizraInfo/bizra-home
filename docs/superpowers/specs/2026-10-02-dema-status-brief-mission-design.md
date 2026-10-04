# One useful DEMA mission: a source-cited Node0 status brief

Status: APPROVED DESIGN — user GO accepted for the corrected runtime source scope;
written plan approved for native execution. No mission or deployment authorized.
Date: 2026-10-02, Asia/Dubai.
Backlog: TASK-075.26 under TASK-075 in `/home/bizra-operating-system/Downloads/Dema`.

## 1. Intent and success

The human selected “complete one useful DEMA mission” and then asked to proceed
with the recommended status brief. The purpose is to reduce the time Mumu spends
reconstructing BIZRA's state across transcripts and scattered evidence.

Deliver one readable Markdown brief with three sections: proven within scope,
unknown/open, and one next action. Target at most 600 words and 6,144 UTF-8 bytes;
retain the current runtime contract's 400-byte minimum. Citations count toward
these limits. “One page” describes reading effort, not guaranteed pagination.

Success has separate gates:

1. The report's claims and temporal labels bind to an approved source snapshot.
2. An admitted runtime creates the approved report without overwriting any file.
3. A separately invoked checker observes the actual output and verifies bindings.
4. The existing runtime receipt and recovered mission state verify, without a
   repeated report effect or duplicate success receipt.
5. Mumu answers whether the brief removed the need to reconstruct the frontier.

Until gate 5, usefulness is NOT_MEASURED. Source tests, previews, receipts and
model confidence do not establish useful value or Node0 closure.

Assumptions for review: English Markdown is suitable; a short status brief is
useful; no model is needed to render factual fields. These are design choices,
not measurements of human benefit. Reading sources does not authorize effects.

## 2. Approaches and recommendation

**Recommended: deterministic evidence projection through existing mission owners.**
Use an explicit small source set and existing truth/status projections. Render
factual panels from validated fields. The current local PAT may propose wording
only in a separately admitted model call; generated prose cannot alter the facts,
consent, destination or acceptance criteria. A deterministic renderer can produce
the first report without inference. That version cannot claim live PAT/SAT model
qualification under the wider TASK-075 campaign.

**Alternative: model-led brief with graph retrieval.** This may find dispersed
context, but adds source-selection and hallucination risk. The local HHMM has no
incremental pilot gain over the heuristic; this fixed source set has no measured
retrieval need. Keep HHMM, diffusion, hypergraph recall and learned reward outside
the first effect path. Their existing prototype results retain their local scope.

**Alternative: a new stand-alone reporting agent/runtime.** This bypasses ownership
and creates a competing receipt/authority plane. Reject it.

## 3. Current evidence and existing owners

The inspected source checkout is dirty and is not assumed to match installation.
No service, model, authority-envelope admission or production lineage was probed
or changed during design. Paths below establish present source owners only.

In `/home/bizra-operating-system/Downloads/Dema`:

| Concern | Existing owner | Scope |
|---|---|---|
| Intent/draft | `packages/mission/src/mission-draft.js`, `buildMissionDraftPreview` | Preview; no approval or execution |
| Frozen contract | `packages/core/src/mission-contract-state.js`, `createMissionContract` | Pure contract/acceptance kernel |
| State/replay | `packages/core/src/mission-supervisor.js`, `step` | Preview reducer; not a live dispatcher |
| Status | `packages/core/src/dema-first-look-home.js`, `buildFirstLookHome` | Withholds unverified next actions |
| Runtime observation | `packages/node-adapter/src/gateway-http-adapter.js`, `fetchGatewayState` | Loopback GET only; never POST |
| Receipt presentation | `packages/mission/src/mission-closeout.js`, `buildCloseoutReport` | Hash/result presentation, not usefulness |
| Interface map | `packages/core/src/invoke-ax-flow-state.js` | Existing preview/missing-seam ownership |

The CLI `mission run` currently invokes a preview demo; `mission emit` writes four
preview artifacts. Neither is the proposed governed one-report execution path.
Do not make the read-only status adapter POST or relabel its preview as execution.

In this workspace, `mini-services/bizra-runtime/src/` owns a candidate external
effect path: `mission.ts`/`runMission`, `pat.ts`/`proposeMissionBrief`,
`sat.ts`/`verifyMissionProposal`, `fate.ts`/leases, `executor.ts`/`boundedWrite`
and `observe`, `chain.ts`/`appendReceipt`, and `store.ts`/SQLite/outbox.
Its fixed mission is `MUMU-DAILY-STATE-RELIEF-0A`; output is
`morning-delta-${dubaiDate()}.md` under the resolved runtime `state/outbox/`.
That outbox is the existing effect root, not an arbitrary caller-chosen directory.
Its POST `/api/mission` requires `LOCAL_FOUNDER` and `MISSION_RUN` envelope admission.
It currently accepts no generic approved source/report bundle.

Reuse these owners only after qualification. No new truth ledger, signing identity,
consent issuer or runtime is part of this design.

## 4. Bounded source snapshot and report contract

The allowlist contains the active mission pointer; current campaign state;
campaign contract/frozen DOD; latest event and its explicitly referenced scoped
evidence/receipt; and a local prototype receipt only if the brief discusses that
prototype. No recursive home scan, raw conversation corpus, secret, identity-root
contents or credential configuration is admitted.

Initial snapshot limits are 12 explicitly enumerated regular files, 2 MiB per
file and 16 MiB total. Exceeding a limit refuses collection rather than truncating
an authoritative input. The human-visible snapshot names the selected files.

For each factual field retain absolute source path, locator (JSON pointer or event
sequence), full SHA-256, collection time, original observation time when known,
truth label and scope. A hash binds bytes; it does not certify the claim. Validate
the same read bytes that are hashed, cap reads, and refuse malformed/non-file or
unapproved source paths. A missing mandatory source blocks report execution.

The current inspected campaign is seq 208 at
`STOP_AFTER_D2_PER_EXACT_INSTALL_GO`. `current_receipt` points to receipt-189;
it must not replace the newer scoped event/evidence by filename or age heuristics.
The report preserves this relationship explicitly. The DOD's `required:
SATISFIED` values are requirements, not results. Historical runtime observations
stay historical; current service/model liveness remains UNKNOWN without a fresh
admitted observation. Do not copy `node0_status: LIVE` from an unverified literal.

Expected-current facts are checked against source-bound requirements by a
separately invoked checker. It rereads the approved sources rather than trusting
the proposer's citation envelope. Factual panels use a fixed mapping of source
fields and labels; free prose is visibly PROPOSED and excluded from verified facts.
Claims unsupported by that mapping are rejected. Hash/shape validation is not
general semantic truth verification or independent SAT custody.

Conflicts remain visible. When the campaign requires STOP, the single next action
is reviewing/requesting the separately bounded authority; a report cannot silently
recommend or execute installation, remote-write repair, federation or economy.

## 5. Preview, authority and execution boundary

The supported flow is:

`intent -> source snapshot -> candidate brief -> separate check -> preview ->`
`exact human consent -> admitted runtime effect -> separate observation ->`
`existing runtime receipt/recovery -> human usefulness`.

The preview shows the exact report bytes, resolved output destination, byte count,
report digest, source-snapshot digest, frozen contract/acceptance digest, existing
runtime identity/version and expected metadata writes. The final consent binds
these values, an expiry and one-use nonce through existing governed owners.
The initial effect-grant lifetime is 300 seconds from issuance; an expired grant
is refused, never extended by retry or self-critique.
No executable consent phrase is invented in the design: the admitted owner must
derive the exact human-visible card from these actual values.

Disclose one business artifact **and** operational writes: mission/attempt state,
lease/nonce state, receipt-chain entries, observations/recovery metadata and bounded
temporary staging where required. Do not promise one total filesystem mutation.
The destination must remain under the qualified existing outbox. No overwrite,
symlink traversal, arbitrary destination, source replacement or silent regeneration
under old consent is permitted. Source/report/contract drift requires a new preview.

Model/provider calls, if selected, require their own explicit bounded admission
before preview computation. They are not implied by effect consent or a document.
No external inference or network egress belongs in this first mission.

This design review authorizes neither a real mission nor a service deployment.
The campaign STOP remains unchanged. DEMA's face remains a presenter; only an
explicitly admitted execution transport may reach the external runtime. A missing
or retired route blocks the mission; no proxy or direct-script bypass is allowed.

## 6. Mandatory qualification gates found in current source

These are prerequisites to execution, not completed repairs:

1. `executor.ts:37` uses ordinary `writeFileSync`: it overwrites and follows links.
   Require exclusive creation, verified trusted ancestry and no-follow parity for
   writer and observer. Lexical path-prefix checks alone are insufficient.
2. `mission.ts:66` supplies a literal LIVE context. Replace it with scoped,
   source-bound facts; missing observations stay UNKNOWN.
3. `mission.ts:142–178` can seal recovery despite an observed hash mismatch and
   missing proposal/SAT/FATE bindings. Refuse success when any required binding
   or actual postcondition is absent or mismatched.
4. File creation, SQLite state and receipt issuance have crash windows. Freeze the
   contract/date/path in durable mission state before the effect. Recovery must
   inspect an existing artifact and finish or refuse without a second creation.
   A midnight restart must not recompute a different contract.
5. `observe` is a same-process readback. Preserve that honest label; require a
   separately invoked observation/checker before claiming the selected independent
   verification gate. Separate processes on one host still do not establish
   independent key custody or an external witness.
6. `verifyMissionProposal` currently checks form, size and anchors. It does not
   verify source citations or human benefit. Extend the existing acceptance seam
   with the bounded factual/source mapping; do not promote form checks to truth.
7. `server.ts:526` treats REFUSED as `ok: true`. Consumers and transport admission
   must use exact status and correct this false-success envelope at its owner.

Current inspected tests did not cover outbox `boundedWrite`, EFFECTED recovery or
real crash windows. Vault symlink tests and simulated auto-cycle recovery are not
substitutes. Test counts from past receipts are historical, not fresh qualification.

## 7. Refusal, partial effect and recovery

Use existing states/receipts where their contracts permit; do not invent a second
state machine. Refusal is terminal for this grant. Record outward attempts through
the existing runtime failure owner. Source unavailable, provider unavailable and
code defects remain separate diagnoses. UNKNOWN never becomes DONE by default.

If the report exists but receipt/state completion fails, report a partial effect.
Reconcile the approved path/digest from durable intent, without regenerating or
overwriting. A changed report, foreign pre-existing file, missing binding or corrupt
checkpoint refuses successful sealing. A retry of completed work returns the same
verified receipt rather than a new business effect. Receipt write failure is visible,
not caught and called success. No simulation mints a normal success or realized value.

## 8. Verification and delivery criteria

The implementation plan must select one focused source repair at a time and bind
each to current files. Verification includes:

- Correct source rendering; receipt-189/event-208 coexistence; DOD requirements are
  not outcomes; stale pointers/conflicting sources withhold unsafe next actions.
- Missing/bare/forged citations, source drift, unsupported truth upgrades and
  literal LIVE cannot pass; a nonexistent source never creates the report.
- Missing/expired/replayed/mismatched consent, changed report bytes and wrong
  destination refuse before the business write.
- Existing target, dangling/ancestor symlink, path escape and concurrent duplicate
  requests cannot overwrite, escape or produce duplicate effects.
- Actual process termination around each durable effect/receipt boundary; recovery
  after midnight; corrupted output; missing proposal/SAT/FATE digests. A simulated
  crash option alone cannot qualify real recovery.
- REFUSED/UNKNOWN remain non-success across HTTP, CLI and DEMA presentation.
- A real admitted run has output readback, source/output/contract/verdict bindings,
  verified existing receipt, replay and no duplicate business effect. Fixture tests
  prove only source behavior; installation/model/runtime observations bind separately.

Use focused existing tests first, then required repository gates for changed source.
At runtime the human sees the brief, its receipt and recovery status, then answers:
“Did this brief remove your need to reconstruct the current frontier across
transcripts?” Record YES/NO/NOT_ANSWERED via an existing authorized owner; no silent
ledger write is allowed. The answer is human-reported usefulness, not an economic
mint or a general benchmark. No learned RL policy, impact token or closure claim follows.

## 9. Review and implementation handoff

The owner survey and design critique are read-only source reviews. No product code,
mission execution, model call, service restart or canonical promotion has occurred
for this mission. TASK-075.26 remains To Do. Source and report fields described above
are requirements, not assertions that new interfaces already exist.

Next gate: human review of this written specification. After approval, use the
brainstorming skill's `writing-plans` handoff, bind the plan to current owners,
review it and select its execution method. The first implementation candidate must
close the smallest necessary refusal/recovery gap; deployment and the eventual
exact report-execution grant remain separate. Do not reopen the campaign by
mistaking a local source change or this document for authority.

Source-slice result: the first three inward repairs are locally integrated/tested at `459a0850`. Broader qualification gates 4–7, actual mission execution and human usefulness remain open. See the implementation plan and local evidence directory for the bounded result.
