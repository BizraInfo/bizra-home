/A,/S,/X,/#,/L/^

MISSION
BIZRA-HOME-LOCAL-SOVEREIGN-BOUNDARY-1A

NORTH STAR

Preserve the existing BIZRA Home design exactly as a protected product asset.
Convert the current Z.ai runtime from an attractive but authority-unsafe prototype
into a source tree that has a fail-closed LOCAL control boundary.

This is exactly one spearpoint.

Do NOT add the local Ollama provider yet.
Do NOT add Estate Graph, indexing, mobile, PAT-7 manifests, SAT-5 manifests,
federation, Node1, tokens, minting, or public launch in this slice.

The reason for this ordering is evidence-bound: the current source permits an
untrusted browser request to reach consequential runtime routes, lets an external
caller choose internal-looking trace source labels, counts source strings as
independent corroboration, and can apply/revert engine contract changes without
an exact human consent envelope. Installing that unchanged on Mumu's laptop
would make the prototype more reachable before making it sovereign.

======================================================================
ENTRY EVIDENCE - BIND BEFORE EDITING
======================================================================

Historical workspace archive:
  workspace UUID: 406a049a-f31f-4562-aae7-a74a198ebdbd
  archive SHA-256:
    2287832c0a9bf5ae21eed87a3f8ed50bd049124692633a3df17c8f6f2ffcf31d

Historical Git identity observed in the exported workspace:
  commit:
    13e287e329f5e70950c859cefb3b93ada2c36e9e
  tree:
    44d4b1dfa0df26f32fc8baa13a639a604882ba02

Historical runtime evidence in the exported SQLite state:
  receipt chain length: 33
  receipt chain head:
    a1c441c3a5421805aff2028d4d624b5aafcde3955835aae54db925d477040875
  founder mission:
    MUMU-DAILY-STATE-RELIEF-0A
  mission receipt #4:
    1348f5f7c0459a7d8b3777edc72c9f14b9b251390482f9a1db32227e2b5cf157
  effect SHA-256:
    a2147d0b6ded9bea033d5f1d580af52fc3361df5d8a27a2924f6761a52146e02

These values describe the recovered archive. They are NOT permission to rewrite
or reuse its runtime database as test state.

First run:
  git rev-parse HEAD
  git rev-parse HEAD^{tree}
  git status --porcelain

If the live workspace HEAD differs from the historical commit:
  record CURRENT_HEAD and CURRENT_TREE;
  compare and explain the difference;
  do NOT reset, force checkout, or discard current work.

======================================================================
AUTHORITY AND HARD BOUNDARIES
======================================================================

AUTHORIZED:

- Modify source and tests inside this Z.ai workspace only.
- Create a feature branch/checkpoint.
- Add small deterministic code using platform crypto and SQLite already present.
- Create isolated temporary state roots for tests.
- Run lint, typecheck, unit tests, and browser checks.
- Create one implementation commit and one proof receipt.

NOT AUTHORIZED:

- No deletion, reset, migration, compaction, or rewriting of the recovered
  33-receipt runtime state.
- No edits to the three root PDFs.
- No runtime PAT/model invocation in this slice.
- No execution against Mumu's laptop, localhost, Ollama, Gemma, or Qwen from
  the Z.ai cloud workspace. Z.ai's 127.0.0.1 is not Mumu's laptop.
- No source self-modification cycle.
- No contract transition or revert on the recovered runtime state.
- No credential, signer, wallet, token, mint, Node1, or federation operation.
- No claim that canonical Node0 is CLOSED.
- No redesign of the BIZRA Home visual system.
- No new dependency unless the same result is physically impossible with
  node:crypto, Bun, Next.js, and SQLite already present.

If the current runtime is running against the recovered state:
  stop it cleanly before source edits;
  verify port 7421 is clear;
  preserve the DB, WAL, and SHM bytes together before opening them with tools.

======================================================================
PHASE 0 - WRITE-ONCE BASELINE
======================================================================

Create:
  evidence/local-sovereign-boundary-1a/PRE_STATE.json

Record:

- current commit/tree/status;
- SHA-256 of Caddyfile, next.config.ts, root package.json;
- SHA-256 of mini-services/bizra-runtime/index.ts and every src/*.ts;
- recovered DB/WAL/SHM sizes and SHA-256 values without opening or checkpointing
  the originals;
- receipt chain length/head from a COPY of the DB only;
- screenshots of desktop and mobile BIZRA Home;
- existing design tokens and component inventory;
- current exposed runtime routes;
- current CORS and proxy behavior;
- current truth labels.

Do not call this a backup until restoration of a copy has been tested.

======================================================================
PHASE 1 - RED-FIRST TESTS
======================================================================

Create focused tests before implementation. Every test must use a unique temp
state root and must never touch the recovered DB.

R1 LOOPBACK BINDING
  A runtime configured with 0.0.0.0, ::, a LAN address, or an absent host
  must refuse LOCAL execution mode.
  LOCAL mode may bind only 127.0.0.1 or ::1 by an explicit policy.

R2 NO ARBITRARY PORT PROXY
  Requests containing XTransformPort or any caller-selected target port must
  be refused. The public gateway may proxy only one compiled/configured Node0
  target: 127.0.0.1:7421.

R3 NO WILDCARD CORS
  access-control-allow-origin must never be '*'.
  A foreign Origin must receive a refusal before request-body processing.

R4 READ-ONLY DEFAULT
  With no local control key configured, GET health/state/verify may remain
  read-only, but every POST that can alter traces, missions, leases, contracts,
  transitions, receipts, or files must fail closed.
  Assert DB hash, chain length/head, contract values, and outbox bytes unchanged.

R5 ACTION ENVELOPE REQUIRED
  Missing, malformed, expired, wrong-action, wrong-request-hash, wrong-key,
  or replayed envelopes must fail closed with no state change.

R6 NONCE ATOMICITY
  Two concurrent attempts using the same nonce must yield exactly one winner.
  The losing attempt must produce no effect and no authority.

R7 TRACE PROVENANCE CANNOT BE CHOSEN BY CALLER
  The external trace route must ignore/refuse caller values such as runtime,
  mission, cycle, dema, operator, and browser as authority labels.
  One external actor must remain one provenance principal regardless of how
  many labels it submits.

R8 CORROBORATION IS PRINCIPAL-BOUND
  Two traces from the same authenticated principal must not satisfy a
  corroboration floor of two merely because their source strings differ.

R9 AUTOPOIETIC MUTATION DISABLED
  The existing one-call /api/cycle path must not apply a contract transition in
  this slice. It may return a proposal-only/refused result, but must not issue a
  transition lease, call setContractValue, append a transition receipt, or mark
  a cycle DONE as an applied change.

R10 REVERT CANNOT PRECEDE AUTHORITY
  A failed/missing lease or consent envelope must leave the contract value,
  transition row, receipt chain, and Dema log unchanged.
  This must catch the current ordering where setContractValue occurs before
  FATE admission.

R11 LIVE MEANS LISTENER BOUND
  Simulate bind failure/EADDRINUSE. No NODE0_LIVE or NODE0_BOOT receipt, LIVE
  status, or DONE relay may be persisted before the server has successfully
  bound its listener.

R12 DESIGN REGRESSION
  The baseline desktop/mobile screenshots and design-token assertions remain
  within the agreed visual-diff threshold. No redesign is accepted.

Preserve the initial RED evidence in:
  evidence/local-sovereign-boundary-1a/RED_TESTS.json

======================================================================
PHASE 2 - IMPLEMENT THE LOCAL SOVEREIGN BOUNDARY
======================================================================

2.1 RUNTIME MODE

Add an explicit runtime mode:

  PUBLIC_REFERENCE
  LOCAL_FOUNDER

PUBLIC_REFERENCE is the safe default in Z.ai/public deployment:

- read-only state presentation only;
- no model invocation;
- no mission effect;
- no trace ingestion;
- no cycle application;
- no transition revert.

LOCAL_FOUNDER is permitted only when every local preflight passes.

2.2 PORTABLE TEST/LOCAL STATE ROOT

Add BIZRA_STATE_ROOT.

Rules:

- tests MUST provide a unique temp root;
- LOCAL_FOUNDER MUST use an explicit root outside the source tree;
- PUBLIC_REFERENCE must not mutate recovered archive state;
- legacy archive paths are read-only historical evidence, not portable runtime
  authority;
- never silently migrate the 33-receipt database.

2.3 FIXED TRANSPORT

Replace the XTransformPort query mechanism.

Required outcome:

  browser -> same-origin /api/node0/*
          -> fixed server-side proxy
          -> http://127.0.0.1:7421/*

No request parameter, header, body field, cookie, or path segment may select an
arbitrary localhost port or host.

2.4 LOCAL ACTION ENVELOPE

Implement schema:
  bizra.node0.local_action_envelope.v1

Required fields:

  schema
  action_id
  action_class
  actor_id
  request_sha256
  intent_sha256
  nonce
  issued_at
  expires_at
  key_id
  mac

Use canonical deterministic JSON for the signed/MACed body.
Use HMAC-SHA256 with a 32-byte random local control key.
Use crypto.randomBytes, never Math.random, for security tokens and nonces.

The key:

- is generated only by the future local installer or a dedicated local init
  command;
- lives outside the repository;
- is mode 0600;
- is never printed, returned to the browser, committed, archived, or written to
  receipts;
- is identified only by key_id/fingerprint.

An HMAC local capability proves local-control-key possession. It is NOT a
sovereign signature and must never be labeled one.

2.5 ATOMIC NONCE STORE

Add a small action_nonces table or equivalent durable store:

  nonce PRIMARY KEY
  action_id
  action_class
  request_sha256
  actor_id
  expires_at
  consumed_at

Verify and consume the nonce atomically in one transaction/CAS operation before
any consequential state mutation. A consumed or expired nonce is never renewed.

2.6 ROUTE POLICY

Read-only routes may remain unauthenticated in LOCAL mode when bound to loopback:

  GET /api/health
  GET /api/state
  GET /api/verify
  GET /api/dema
  GET /api/contracts
  GET /api/shoulder
  GET /api/outbox/:name

Consequential routes require a valid envelope:

  POST /api/mission
  POST /api/trace

Disable these consequential actions in this slice:

  POST /api/cycle
  POST /api/transition/:id/revert

Return an honest fail-closed response naming the later two-phase proposal/commit
contract. Do not preserve an unsafe feature merely for demo continuity.

2.7 TRACE PROVENANCE

For external/operator trace submission:

- source is derived by the server, never accepted from request JSON;
- actor_id comes from the authenticated envelope;
- provenance class is EXTERNAL_OPERATOR;
- all traces from one actor count as one corroborating principal;
- internal source labels are reserved to internal call sites;
- source strings are presentation metadata, not proof of independence.

Update SAT corroboration to count independently authenticated principals/evidence
classes, not arbitrary source strings.

2.8 LIVENESS ORDERING

Perform in this order:

  verify constitution
  open/verify store
  bind 127.0.0.1:7421 successfully
  only then persist LIVE/BOOT state and receipt

If binding fails, persist no LIVE claim.

Use a subordinate truth label such as:
  LOCAL_RUNTIME_LISTENER_BOUND

Do not emit canonical NODE0_CLOSED.

2.9 REVERT ORDERING

Even though revert remains disabled at the HTTP boundary, repair the kernel order:

  validate request
  validate current transition
  validate action envelope
  issue lease
  atomically consume lease/nonce
  apply mutation
  append receipt
  mark transition reverted

No authority object -> no mutation.

======================================================================
PHASE 3 - PROOF LADDER
======================================================================

Run, in order:

1. focused boundary tests;
2. race/nonce test;
3. route tests against temp state;
4. lint;
5. TypeScript typecheck with errors NOT ignored for the touched runtime path;
6. production build;
7. browser desktop/mobile visual regression;
8. source scan proving:
     no XTransformPort wildcard;
     no CORS '*';
     no runtime bind without explicit loopback host;
     no external source selection;
     no mutating route bypass;
     no Math.random in authority-token generation;
9. copy-restore drill for the test state;
10. hash recovered archive DB/WAL/SHM again and prove unchanged.

No runtime PAT/model call is needed or allowed for this proof.

======================================================================
DEFINITION OF DONE
======================================================================

PASS only when every item below is true.

BASELINE

[ ] Current workspace commit/tree/status recorded.
[ ] Historical archive identity recorded without forcing a reset.
[ ] Recovered 33-receipt state preserved byte-for-byte.
[ ] Baseline screenshot set preserved.

TRANSPORT

[ ] LOCAL runtime explicitly binds loopback only.
[ ] Caller-selected host/port proxy is impossible.
[ ] XTransformPort is absent from source and tests.
[ ] CORS wildcard is absent.
[ ] Foreign Origin negative control passes.

AUTHORITY

[ ] Public/Z.ai mode is read-only by default.
[ ] Every enabled POST mutation requires a valid action envelope.
[ ] Local key is external to repo and mode 0600 in local fixtures.
[ ] Missing/invalid/expired/replayed envelope changes zero state.
[ ] Nonce consumption is atomic under a two-request race.
[ ] Action tokens use cryptographic randomness.
[ ] HMAC capability is not mislabeled as human/sovereign signature.

PROVENANCE

[ ] External caller cannot claim an internal source label.
[ ] Corroboration counts authenticated principals, not strings.
[ ] Same actor under two labels cannot satisfy independence.

AUTOPOIESIS

[ ] /api/cycle cannot apply a transition in this slice.
[ ] HTTP revert cannot mutate in this slice.
[ ] Kernel revert order is authority-before-mutation.

LIVENESS TRUTH

[ ] Bind failure produces no LIVE/BOOT receipt or state.
[ ] Successful bind is the first point at which local runtime liveness may emit.
[ ] No canonical NODE0_CLOSED claim is produced.

QUALITY

[ ] Red tests were observed before implementation.
[ ] Focused tests pass.
[ ] Typecheck passes for touched surfaces.
[ ] Lint passes.
[ ] Production build passes.
[ ] Visual design is preserved on desktop and mobile.
[ ] No new dependency, or an exact written necessity is provided.
[ ] Current limitations are updated honestly.

BOUNDARY

[ ] No runtime model call.
[ ] No root PDF mutation.
[ ] No recovered DB mutation.
[ ] No wallet/token/federation action.
[ ] authority_delta = 0.

======================================================================
TRUTH LABEL CEILING
======================================================================

Allowed after PASS:

  PUBLIC_ZAI_RUNTIME = REFERENCE_READ_ONLY
  LOCAL_CONTROL_PLANE = IMPLEMENTED_AND_TESTED
  LOCAL_ACTION_ADMISSION = FAIL_CLOSED
  TRACE_PROVENANCE_FORGERY_PATH = CLOSED_STATIC_AND_TESTED
  LOCAL_RUNTIME_LIVENESS_ORDERING = VERIFIED_BY_TEST

Must remain false/unknown:

  LOCAL_MODEL_CONNECTED = false
  PAT_7_ACTIVE = false
  SAT_5_ACTIVE_N1 = false
  ESTATE_DISCOVERED = false
  ESTATE_GRAPH_BUILT = false
  NODE0_FOUNDER_MODE_ACTIVE = false
  NODE0_CLOSED = false
  PRODUCTION_QUALIFIED = false
  REMOTE_WRITE_SAFE = unknown
  NODE1_CONNECTED = false
  FEDERATION = false

======================================================================
RECEIPT
======================================================================

Create:
  evidence/local-sovereign-boundary-1a/
  BIZRA-HOME-LOCAL-SOVEREIGN-BOUNDARY-1A-RECEIPT.json

Required fields:

  schema
  created_at
  base_commit
  base_tree
  implementation_commit
  implementation_tree
  pre_state_sha256
  changed_files_sha256
  red_tests
  focused_tests
  race_test
  lint
  typecheck
  build
  browser_regression
  recovered_state_pre_hashes
  recovered_state_post_hashes
  what_this_proves
  what_this_does_not_prove
  truth_labels
  authority_delta

Hash the literal receipt bytes and report the full SHA-256.
Do not call it signed or non-repudiable.

======================================================================
FINAL RESPONSE - THEN STOP
======================================================================

Return exactly these sections:

BASE
  current_commit
  current_tree
  archive_reference_commit
  archive_reference_tree

CHANGES
  files_added
  files_modified
  files_deleted
  dependency_changes

TESTS
  red_first
  focused
  nonce_race
  typecheck
  lint
  build
  browser_desktop
  browser_mobile

BOUNDARY
  runtime_mode_default
  loopback_only
  arbitrary_proxy_removed
  cors_policy
  action_envelope
  nonce_atomicity
  external_trace_provenance
  cycle_application
  revert_http
  live_emission_order

PRESERVATION
  recovered_chain_length_before
  recovered_chain_head_before
  recovered_state_hashes_equal_after
  design_regression

TRUTH
  PUBLIC_ZAI_RUNTIME
  LOCAL_CONTROL_PLANE
  LOCAL_MODEL_CONNECTED
  NODE0_FOUNDER_MODE_ACTIVE
  NODE0_CLOSED
  authority_delta

RECEIPT
  path
  sha256

NEXT
  LOCAL-MODEL-PROVIDER-1A

Then stop. Do not begin the next mission.
