# BIZRA Genesis Library (BGL)
## Master Technical Plan & System Specification v0.1

Project name: `bizra-genesis-library`
Physical corpus root: `BIZRA_GENESIS_LIBRARY/`
Purpose: Build one local-first, provenance-preserving, deduplicated, context-aware home for the complete BIZRA corpus without altering source evidence.

## 1. Executive Decision

BGL is a canonical evidence library and smart file-management system, not merely a data lake.

It must answer:
- What data exists?
- Where did each object come from?
- Is it an exact duplicate?
- Which version/revision is it?
- What physical type is it?
- Which source/account/device/repository/conversation does it belong to?
- Can the exact original representation be recovered?
- What is known, derived, assumed, or unknown about its semantic role?

Knowledge graphs, embeddings, RAG, lineage analysis, or Dema reasoning come after this foundation is proven.

## 2. Product Definition

BGL is a local-first, append-oriented, content-addressed corpus manager with:
- multi-source discovery and incremental ingestion;
- immutable/content-addressed object storage;
- exact deduplication;
- near-duplicate and version clustering without automatic deletion;
- source and timestamp provenance;
- file-type identification;
- context-aware, multi-label semantic classification;
- generated views by type, source, topic, time, project, and lineage;
- full-text and metadata search;
- run receipts and integrity verification;
- restart-safe and idempotent processing;
- pluggable adapters, extractors, classifiers, and policies;
- CI/CD for engine, schemas, migrations, and fixture corpus.

## 3. Architectural Philosophy: Hard Core, Flexible Shell

### Non-negotiable invariants
1. Original evidence is immutable.
2. Every stored byte object has a canonical cryptographic identity.
3. Exact duplicate decisions require byte-equivalent cryptographic evidence.
4. No source object is deleted automatically.
5. No near-duplicate is auto-deleted.
6. Every object retains source provenance.
7. Every derived artifact points to its source object(s).
8. Every pipeline stage is restart-safe and idempotent.
9. Unknown/unclassified objects remain preserved and indexed.
10. Every mutation to BGL state is auditable.

### Flexible policy layer
- topic taxonomy;
- project taxonomy;
- classification models;
- extraction/OCR engines;
- embedding models;
- near-duplicate algorithms;
- views;
- source priorities;
- confidence thresholds;
- scheduling and concurrency;
- graph schema;
- human-review workflow.

Architecture:
`IMMUTABLE EVIDENCE CORE + VERSIONED METADATA + PLUGGABLE POLICIES + GENERATED VIEWS + OPTIONAL INTELLIGENCE`

## 4. One Physical Project Root

```text
BIZRA_GENESIS_LIBRARY/
|
+-- 00_SYSTEM/
|   +-- engine/                 # Git repository: BGL code only
|   +-- config/
|   +-- policies/
|   +-- schemas/
|   +-- migrations/
|   `-- README.md
|
+-- 01_INBOX/
|   +-- local/
|   +-- imports/
|   `-- temporary/
|
+-- 02_OBJECTS/
|   +-- sha256/
|   +-- repositories/
|   `-- provider_native/
|
+-- 03_INDEX/
|   +-- bgl.sqlite3
|   +-- snapshots/
|   +-- parquet/
|   +-- manifests/
|   `-- search/
|
+-- 04_VIEWS/
|   +-- by_type/
|   +-- by_topic/
|   +-- by_source/
|   +-- by_time/
|   +-- by_project/
|   `-- by_lineage/
|
+-- 05_DERIVED/
|   +-- extracted_text/
|   +-- metadata/
|   +-- thumbnails/
|   +-- transcripts/
|   +-- ocr/
|   +-- embeddings/
|   +-- summaries/
|   `-- code_symbols/
|
+-- 06_GRAPH/
+-- 07_RECEIPTS/
+-- 08_QUARANTINE/
+-- 09_EXPORTS/
`-- 10_BACKUP/
```

Only `00_SYSTEM/engine/` is Git-managed. The corpus is never committed to Git.

## 5. Storage Model

Canonical byte identity:
`object_id = "sha256:" + SHA256(original_bytes)`

Optional fast fingerprint:
`fast_hash = BLAKE3(original_bytes)`

SHA-256 remains canonical.

Exact duplicates:
three source locations may map to one canonical byte object while all provenance records remain.

Near duplicates are clustered, never deleted automatically.

Relations:
- EXACT_DUPLICATE
- LIKELY_EXPORT_VARIANT
- LIKELY_VERSION
- DERIVED_FROM
- ATTACHMENT_OF
- CONTAINS
- MIRRORS
- SUPERSEDES
- RELATED
- UNKNOWN_RELATION

## 6. Canonical Data Model

Core entities:
- `objects`
- `source_locations`
- `source_snapshots`
- `classifications`
- `relations`
- `derived_artifacts`
- `runs`
- `events`

Every semantic classification stores:
- dimension
- label
- confidence
- method
- classifier version
- context snapshot
- review state

## 7. Smart File Management Pipeline

```text
DISCOVER
-> SNAPSHOT SOURCE METADATA
-> STAGE / STREAM
-> IDENTIFY TYPE
-> HASH
-> EXACT DEDUP CHECK
-> CONTENT-ADDRESS STORE
-> REGISTER PROVENANCE
-> EXTRACT TECHNICAL METADATA
-> CLASSIFY PRIMARY TYPE
-> INDEX
-> GENERATE VIEWS
-> VERIFY
-> RECEIPT
-> OPTIONAL SEMANTIC ENRICHMENT
```

Object state machine:
`DISCOVERED -> OBSERVED -> HASHING -> IDENTIFIED -> STORED|DUPLICATE_LINKED -> METADATA_EXTRACTED -> TYPE_CLASSIFIED -> INDEXED -> VERIFIED -> READY`

Failure states:
`RETRYABLE | QUARANTINED | UNSUPPORTED | CORRUPTED | UNKNOWN`

Unknown is a valid state and never a reason to discard evidence.

## 8. Context-Aware Classification

Layer 0: deterministic physical facts.
Layer 1: source context.
Layer 2: content-derived context.
Layer 3: optional semantic model classification.
Layer 4: human correction.

Human correction creates a higher-authority record instead of overwriting history.

## 9. Dynamic Taxonomy

An artifact may simultaneously be:
- TYPE: PDF
- TOPIC: AI Agents
- TOPIC: BIZRA Ideology
- PROJECT: Dema
- ERA: 2025
- ROLE: Architecture Spec
- SOURCE: Google Drive

Taxonomies are versioned. Reclassification changes metadata, not source bytes.

## 10. Generated Views

`04_VIEWS/` is presentation, not duplicated storage.

Preferred order:
1. database/search views;
2. generated HTML/Markdown indexes;
3. optional safe symlink/hardlink materialization.

Views are rebuildable from the index.

## 11. Source Adapter Interface

```text
SourceAdapter
  discover()
  stat()
  open_stream()
  checkpoint()
  resume()
  source_identity()
  normalize_metadata()
```

Initial adapters:
- local filesystem
- Git
- GitHub
- Google Drive
- Google Takeout
- ChatGPT exports
- Gemini/Bard exports
- OneDrive
- email exports
- mobile/device backups
- generic archives
- Midjourney/Runway exports

## 12. Special Handling

Git repositories retain commits, branches, tags, files/blobs, issues, PRs, and remote metadata.

Chats retain platform, account alias, conversation ID, timestamps, messages, model metadata, and attachments.

Cloud-native docs retain provider IDs/revisions/timestamps. Local exports are labeled archival/derived representations, not silently treated as native originals.

Archives are indexed safely with path-traversal, archive-bomb, recursion, and malformed-file protections.

## 13. Search Architecture

v0.1:
- SQLite metadata
- SQLite FTS5
- structured filters

v0.2+ optional:
- DuckDB/Parquet
- embeddings/vector index
- graph projection/database

The relational index remains the canonical operational index.

## 14. Recommended Implementation Stack

Core:
- Python 3.12+
- uv
- Typer
- Pydantic v2
- SQLite WAL
- FTS5
- Rich
- streaming I/O
- hashlib SHA-256
- optional BLAKE3
- pluggable extractor registry

Quality:
- Ruff
- Pyright or mypy
- pytest
- Hypothesis
- pre-commit

Optional later Rust/PyO3 acceleration only after throughput becomes a measured bottleneck.

## 15. CLI Contract

```text
bgl init
bgl doctor
bgl source add <type> <location>
bgl source list
bgl source scan <source>
bgl ingest <source>
bgl ingest --all
bgl resume <run-id>
bgl verify
bgl verify <object-id>
bgl dedup exact
bgl dedup report
bgl classify type
bgl classify topics
bgl view build
bgl index rebuild
bgl search "<query>"
bgl show <object-id>
bgl status
bgl runs
bgl receipt <run-id>
bgl export manifest
bgl export census
```

Support `--dry-run`, `--json`, and `--verbose` where meaningful.

## 16. Configuration

```yaml
library:
  root: /BIZRA_GENESIS_LIBRARY

ingest:
  delete_sources: false
  overwrite_objects: false
  chunk_size_mb: 16
  workers: auto
  resume: true

dedup:
  canonical_hash: sha256
  fast_hash: blake3
  exact: true
  near_duplicate:
    enabled: false
    action: report_only

classification:
  physical_type:
    required: true
  semantic:
    enabled: false
  unknown_policy: preserve
  multi_label: true

views:
  materialization: index
  rebuildable: true

receipts:
  enabled: true
```

Policies are versioned and each run records a `config_hash`.

## 17. CI/CD

CI/CD applies to the engine, not the corpus.

Branch model:
`main <- short-lived feature branches`

CI gates:
- format
- lint
- typecheck
- unit tests
- property tests
- schema validation
- migration tests
- fixture-corpus ingest
- idempotency
- determinism
- interrupted-run recovery
- exact-dedup
- unknown-file preservation
- archive safety
- static/security scan

Critical assertion:
a second ingest of the same fixture corpus must not change the canonical unique-object set or create duplicate physical objects.

Release:
`test -> build -> checksum -> release manifest -> migration package -> local install/update artifact`

Local deployment:
`preflight -> backup index -> migration dry-run -> update -> migrate -> smoke test -> verify -> receipt`

No release may delete corpus objects.

## 18. Run Receipts

Each ingest run records:
- run ID
- source snapshots
- objects discovered
- bytes observed
- unique objects added
- exact duplicates linked
- unsupported/quarantined objects
- errors
- config hash
- engine version
- start/end timestamps
- manifest hash

## 19. Observability

Minimum metrics:
- objects discovered/sec
- bytes hashed/sec
- bytes copied/sec
- queue depth
- duplicate ratio
- extraction failure rate
- classification rate
- quarantine rate
- free disk
- index size
- DB latency
- retry count
- run duration

## 20. Recovery

Required:
- atomic final object placement
- temporary `.partial` staging
- crash-safe DB transactions
- WAL mode
- resumable source cursors
- resumable ingest runs
- no partial object marked VERIFIED
- index snapshots
- idempotent rescans
- safe disk-full stop

## 21. Security and Privacy

Assume the archive can contain credentials, private messages, API keys, secrets, personal data, malformed files, and suspicious downloads.

Controls:
- local-first
- storage encryption at OS level
- no automatic external upload
- secret scanning as metadata, not deletion
- logical quarantine
- archive sandboxing
- least-privilege adapters
- account aliases where possible
- semantic services declare whether data leaves Node0

## 22. Context-Aware Runtime

Runtime context:
- available CPU/RAM/disk
- source type
- file type
- object size
- extractor availability
- model availability
- network state
- operator policy

Examples:
- small text -> extract now
- large video -> metadata now, transcript later
- encrypted archive -> preserve + unresolved
- unknown binary -> hash + index + preserve
- Git repo -> repository adapter
- chat export -> structured conversation parser

The system preserves first and understands progressively.

## 23. Resource Scheduling

Queues:
`DISCOVERY_QUEUE | HASH_QUEUE | COPY_QUEUE | EXTRACT_QUEUE | CLASSIFY_QUEUE | VERIFY_QUEUE`

Priority:
P0 integrity
P1 ingest/hash
P2 indexing
P3 deterministic extraction
P4 semantic enrichment
P5 embeddings/graph

Semantic work never starves core ingest.

## 24. Engine Module Layout

```text
engine/
+-- pyproject.toml
+-- README.md
+-- MASTER_SPEC.md
+-- CHANGELOG.md
+-- src/bgl/
|   +-- cli/
|   +-- config/
|   +-- core/
|   +-- db/
|   +-- sources/
|   +-- pipeline/
|   +-- extractors/
|   +-- classifiers/
|   +-- relations/
|   +-- views/
|   +-- search/
|   +-- security/
|   `-- observability/
+-- tests/
|   +-- unit/
|   +-- integration/
|   +-- property/
|   +-- recovery/
|   `-- fixtures/
+-- scripts/
+-- schemas/
+-- config/
+-- policies/
`-- .github/workflows/
```

## 25. Development Epics

BGL-0 Bootstrap
BGL-1 Local Census
BGL-2 Content Addressing
BGL-3 Exact Dedup
BGL-4 Type Index
BGL-5 Search and Views
BGL-6 Recovery
BGL-7 Cloud/Archive Adapters
BGL-8 Context Engine
BGL-9 Knowledge Layer

BGL-9 must not start until the evidence library passes its acceptance gate.

## 26. v0.1 Acceptance Contract

GREEN only if:

A1 source files modified = 0
A2 source files deleted = 0
A3 stored byte objects without SHA-256 = 0
A4 stored objects without source provenance = 0
A5 unexpected unique-object change on re-ingest = 0
A6 exact duplicate physical copies created = 0
A7 unknown types lost = 0
A8 interrupted ingest resumable = true
A9 full manifest export succeeds = true
A10 verification receipt generated = true

## 27. Semantic Activation Gate

Do not enable automatic semantic reorganization until:

`CENSUS_COMPLETE AND HASH_COVERAGE_COMPLETE AND PROVENANCE_COVERAGE_COMPLETE AND EXACT_DEDUP_COMPLETE AND TYPE_INDEX_COMPLETE AND REINGEST_IDEMPOTENCY_PROVEN AND BACKUP_RECOVERY_TESTED`

Then semantic enrichment can be enabled as derived metadata only.

## 28. Immediate Build Sequence

1. Create `BIZRA_GENESIS_LIBRARY/`.
2. Create `00_SYSTEM/engine/` Git repository.
3. Implement config + SQLite schema.
4. Implement local filesystem discovery.
5. Implement streaming SHA-256.
6. Implement CAS object placement.
7. Implement source-location provenance.
8. Implement exact dedup.
9. Implement basic physical-type classifier.
10. Implement manifest + verify receipt.
11. Build fixture corpus and CI.
12. Run first small real-source pilot.

Do not begin with Drive crawling, embeddings, OCR, LLM classification, or graph construction. Prove the core engine first.

## 29. First Pilot

Create a controlled fixture/pilot corpus containing:
- exact duplicates with different names
- same names with different content
- empty files
- Unicode names
- long paths
- large files
- corrupted files
- symlinks
- archives
- files without extensions

Expected:
all discovered, all preserved, exact duplicates linked, versions not deleted, unknowns retained, manifest deterministic, second ingest idempotent.

## 30. Governing Rule

```text
Preserve first.
Identify second.
Deduplicate exactly.
Index completely.
Understand progressively.
Connect contextually.
Never rewrite history.
```
