# Information Anchor Contract V1 - Step 2 Implementation Plan

Status: planning only. This document maps current runtime gaps to `docs/INFORMATION_ANCHOR_CONTRACT_V1.md`.

No runtime implementation, API behavior, UI behavior, schema, migration, production data, or deployment is included in this step.

## 1. Current Runtime Gap Map

| Contract Area | Current Runtime Status | Files / Functions | Gap | Risk | Migration Needed | Suggested Phase |
|---|---|---|---|---|---|---|
| Access Card Remark Snapshot | Partial transient parsing exists. | `deploy-worker/src/index.js::loadLockCards`, `deploy-worker/public/employee-v3.html::lockCardSnapshot`, `modules/properties/ttlock-remark.mjs::parseTtlockRemark` | No formal `access_snapshot_id`, no durable snapshot DTO, no central `parse_status`, no standard `source=access_card_remark` event attachment. | High | Later, yes for durable snapshot store; no for attaching non-persistent snapshots to new events first. | 2C |
| card_id / tenant_card_id usage | Still used as runtime reference in employee UI, transactions, arrears, deposit ledger, bed transfer context. | `employee-v3.html`, `deploy-worker/src/index.js`, `modules/finance/arrears-followup-pool.mjs`, `modules/finance/receivables.mjs` | Provider card identity is still mixed into business fields and display context. | Critical | Later, yes if columns are renamed or deprecated; no for forbidding new business matching first. | 2B |
| 99099 provider phone usage | UI sanitizers exist, but raw remark/parser can retain provider phone. | `employee-v3.html`, `modules/properties/ttlock-remark.mjs`, `tests/employee-followup-hide-ttlock-account-phone.spec.mjs` | No central source-authority ban at all intake points. | High | No for validation and forbidden-field tests; yes only if historical cleanup is approved later. | 2B |
| occupancy_session_id | Missing as a stable lifecycle anchor. | No authoritative runtime implementation found; bed transfer and left-with-arrears use bed/card/context fields. | Old/new tenant separation still depends on bed/card context instead of occupancy lifecycle. | Critical | Yes for durable storage and backfill. | 2E |
| Source Authority Matrix enforcement | Contract exists only in documentation. | `docs/INFORMATION_ANCHOR_CONTRACT_V1.md` | Runtime validators do not enforce authority boundaries for card ID, phone, deposit remark, occupancy identity. | Critical | No for new validation gates; later yes for persisted authority metadata. | 2B |
| Time Model | Several event dates exist, but common event time model is incomplete. | `employee-v3.html::build*Anchor`, `deploy-worker/src/index.js::normalizeEntryAnchor`, sessions/transactions date fields | `business_date`, `event_time`, `synced_at`, `effective_from`, `effective_until`, `access_valid_until` are not uniform across all event anchors. | High | Possible later for persisted columns; no for entries_json anchor enrichment. | 2D |
| 7 Employee Event Anchors | Event-specific validators/builders exist and normalize anchors. | `employee-v3.html::entryTemplates`, `buildRentAnchor`, `buildArrearsPaymentAnchor`, `buildDepositOutAnchor`, `buildCheckoutAnchor`, backend `entryAnchorContract` | Missing common contract fields: `upload_batch_id`, `property_id`, `occupancy_session_id`, access snapshots, fingerprints, server validation timestamp. | High | No for entries_json enrichment; yes if normalized columns are added. | 2D |
| Duplicate / Idempotency Guard | Frontend excludes synced records; some idempotency exists; backend current employee route still relies heavily on event ID/insert ignore and does not universally enforce canonical fingerprints. | `employee-v3.html::entryUploadCandidateReason`, `prepareRepeatableUploadRows`, `deploy-worker/src/index.js::empInsertDynamicMode`, `transactions.id`, handover idempotency modules | Duplicate upload can still create money risk when new event IDs represent same business fact. | Critical | No for first defensive guard using existing event IDs and entries_json scans; yes later for unique fingerprint indexes. | 2A |
| Correction / Void / Reversal | Void fields and session delete/void paths exist. | `deploy-worker/src/index.js` void columns and delete session route, `entry_events` audit traces | No unified immutable correction, reversal, owner correction event model. | High | Yes for durable correction event store; no for design/test scaffolding. | 2G |
| State Projections | Cloud arrears projection exists; other states are scattered. | `rebuildCloudArrearsForBed`, `rebuildAllCloudArrears`, `deposit_ledger`, owner overview/current receivables code | No shared projection contract for bed, occupancy, deposit, access validity, cash/bank, network. | High | Mixed: no for projection interfaces/tests; yes for durable projection tables. | 2F |
| Anomaly Screening | Scattered warnings and blockers exist. | employee validators, arrears/refund/checkout checks, rent continuity tests, bed transfer review tests | No central anomaly model with `risk_code`, `risk_level`, `confidence_score`, `suggested_action`. | Medium | No for in-memory screening contract; yes for persisted anomaly queue. | 2H |
| Ledger / Full Audit Snapshot | Machine truth is split across sessions, transactions, arrear tasks, deposit ledger, entry events. | `sessions.entries_json`, `transactions`, `arrear_tasks`, `deposit_ledger`, `entry_events` | No single Homelink Ledger snapshot compiler from canonical events. | High | Later, likely yes if durable ledger snapshots are stored. | 2I |
| WhatsApp Compiler later | Compiler exists and should remain presentation only. | `employee-v3.html::buildEntryWhatsappText`, `renderEntryAnchorForWhatsapp`, owner detail rendering | Must not be prioritized before anchors, duplicate guard, and authority boundaries. | Medium | No. | 2I |

## 2. P0 / P1 / P2 Priority Plan

### P0

Money correctness, duplicate upload, deposit, arrears, checkout, bed transfer, and identity continuity.

- Phase 2A: Duplicate / Idempotency Guard
- Phase 2B: Non-authoritative field deprecation boundary
- Phase 2C: Access Card Remark Snapshot DTO for new events
- Phase 2D: Canonical Event Common Fields for 7 events
- Phase 2E: occupancy_session_id design
- Phase 2F: Deposit / Arrears / Checkout / Bed Transfer projection alignment

### P1

Owner correction, anomaly screening, projections, and audit improvements.

- Phase 2G: Owner Correction / Void / Reversal event model
- Phase 2H: Anomaly Screening

### P2

Reporting, display, WhatsApp compiler, and convenience.

- Phase 2I: Shared Ledger Compiler and presentation compilers

Ordering rule:

- Do not put WhatsApp Compiler before the core anchors unless the change is purely read-only presentation.
- Do not put UI polish before duplicate prevention and anchor correctness.

## 3. Recommended Implementation Sequence

1. Phase 2A: Duplicate / Idempotency Guard
2. Phase 2B: Non-authoritative field deprecation boundary
3. Phase 2C: Access Card Remark Snapshot DTO
4. Phase 2D: Canonical Event Common Fields for 7 events
5. Phase 2E: occupancy_session_id design
6. Phase 2F: Deposit / Arrears / Checkout / Bed Transfer projection alignment
7. Phase 2G: Owner Correction / Void / Reversal event
8. Phase 2H: Anomaly Screening
9. Phase 2I: Shared Ledger Compiler

### Phase 2A: Duplicate / Idempotency Guard

Goal: prevent repeated upload of already synced events and prevent repeated business facts from being created under new event IDs.

Must cover:

- frontend synced records excluded from upload payload
- backend event_id guard
- backend source_fingerprint guard
- backend canonical_fingerprint guard
- duplicate upload incident prevention
- idempotent response when duplicate is detected

Reason: a duplicate upload already happened in production and can damage money totals.

### Phase 2B: Non-authoritative field deprecation boundary

Goal: make sure card_id and 99099 provider phone are not used as business references.

Must cover:

- card_id only raw audit
- tenant_card_id only raw audit
- provider phone not customer phone
- 99099 banned as tenant phone
- no business matching by these fields

### Phase 2C: Access Card Remark Snapshot DTO

Goal: standardize card remark parsing as contextual source.

Must cover:

- bed
- deposit remark
- check-in mmdd
- valid-until / expiry if available
- parse_status
- raw_remark
- source = access_card_remark

No migration unless necessary. Prefer attaching snapshot to new events first.

### Phase 2D: Canonical Event Common Fields for 7 events

Goal: every employee event has required anchor fields.

Must cover:

- event_id
- session_id
- upload_batch_id
- event_type
- business_date
- created_at
- synced_at
- source_fingerprint
- canonical_fingerprint
- access_snapshot_before
- status

### Phase 2E: occupancy_session_id design

Goal: separate tenant/occupancy lifecycle from bed/card.

Must cover:

- generation strategy
- when to create
- when to continue
- bed transfer migration
- checkout closure
- left-with-arrears continuation

This may require schema/migration later. Do not implement until design is explicit.

### Phase 2F: Deposit / Arrears / Checkout / Bed Transfer projection alignment

Goal: use event anchors to derive current state.

Must cover:

- deposit_balance_state
- arrears_state
- occupancy_state
- access_validity_state
- bed_transfer continuity

### Phase 2G: Owner Correction / Void / Reversal event

Goal: fix production mistakes without editing original facts.

Must cover:

- duplicate upload correction
- wrong amount correction
- arrears waiver
- deposit adjustment
- repayment reversal

### Phase 2H: Anomaly Screening

Goal: detect contradictions and high-risk data.

Must cover:

- duplicate fingerprint
- active bed conflict
- access expiry earlier than rent coverage
- refund while arrears open
- overpayment of arrears
- 99099 repeated phone

### Phase 2I: Shared Ledger Compiler

Goal: presentation only, after anchors are safe.

Must cover:

- Homelink Ledger full audit snapshot
- owner display compiler
- WhatsApp readable compiler
- no compiler output as source of truth

## 4. First Implementation Recommendation

recommended_first_task:

Phase 2A.1 - Employee Entry backend duplicate guard for event_id/source_fingerprint/canonical_fingerprint, with frontend synced-record exclusion kept as a secondary guard.

reason:

This is the smallest P0 task that reduces immediate production money risk. Duplicate upload has already occurred in production. The frontend has a synced-record guard, but backend must not rely on frontend status. This phase can first use existing `event_id`, current upload rows, and `sessions.entries_json`/`transactions.id` checks before any durable fingerprint migration.

files likely touched:

- `deploy-worker/src/index.js`
- `deploy-worker/public/employee-v3.html`
- `tests/employee-entry-repeatable-upload.spec.mjs`
- `tests/employee-post-upload-state-reconciliation.spec.mjs`
- new targeted duplicate guard tests under `tests/`

runtime risk:

medium

migration needed:

no for Phase 2A.1 defensive guard; yes later for durable unique fingerprint indexes.

production data write:

no for tests and deployment verification; production business writes only after explicit live smoke approval.

required tests:

- synced records excluded from upload payload
- backend rejects duplicate event_id
- backend rejects duplicate source_fingerprint when supplied
- backend rejects duplicate canonical_fingerprint when supplied
- same idempotency replay returns existing success
- new upload with distinct canonical_fingerprint still succeeds
- no production write assertion in dry-run tests
- owner history total not duplicated after replay fixture

acceptance criteria:

- already synced records cannot be uploaded again from frontend
- backend does not create duplicate rows for duplicate event_id
- backend does not create duplicate rows for duplicate source_fingerprint
- backend does not create duplicate rows for duplicate canonical_fingerprint
- duplicate response is explicit and staff-safe
- no existing rent upload success path is broken
- owner history totals do not double-count replayed fixtures

## 5. Migration Assessment

| Change | Migration Needed | Reason | Can be staged without migration? |
|---|---|---|---|
| Phase 2A.1 backend duplicate guard using current event IDs and payload fingerprints | no | Existing route can reject duplicates before write. | yes |
| Durable unique index for source_fingerprint / canonical_fingerprint | yes | Requires persisted columns and unique indexes. | yes, after Phase 2A.1 |
| Non-authoritative field validation for new events | no | Can be enforced at validator/builder boundary. | yes |
| Historical card_id / tenant_card_id cleanup | yes | Requires data migration and compatibility plan. | no |
| Access Card Remark Snapshot attached to new events | no | Can live inside entries_json initially. | yes |
| Durable Access Card Remark Snapshot table | yes | Requires table/index design. | yes, after DTO stabilizes |
| Canonical Event Common Fields inside entries_json | no | Structured JSON can carry fields first. | yes |
| Normalized canonical event columns | yes | Requires schema and backfill. | yes, after JSON contract stabilizes |
| occupancy_session_id design document and generators | no | Can design and test generation rules without persistence first. | yes |
| Durable occupancy_session_id on old records | yes | Requires backfill and old/new tenant reconciliation. | no |
| Projection interfaces and fixture rebuild tests | no | Can be pure code/tests against fixtures. | yes |
| Durable state projection tables | yes | Requires table/index lifecycle. | yes, after projection contracts pass |
| Owner correction event design and tests | no | Can define event shape first. | yes |
| Durable owner correction ledger | yes | Requires persistence and audit linking. | yes, after design |
| Anomaly screening in validation response | no | Can return non-persistent anomalies first. | yes |
| Persisted anomaly queue | yes | Requires queue/table and owner workflow. | yes, after non-persistent screening |
| Shared Ledger Compiler presentation layer | no | Can compile from existing structured anchors. | yes, only after anchors are safe |

## 6. Test Strategy

Every implementation phase must include:

- contract test
- unit test
- fixture test
- regression test
- forbidden-field test if applicable
- no-production-write assertion

Phase-specific tests:

| Phase | Tests |
|---|---|
| 2A Duplicate / Idempotency Guard | duplicate event_id, duplicate source_fingerprint, duplicate canonical_fingerprint, synced frontend exclusion, idempotent replay, owner total no double-count |
| 2B Non-authoritative Boundary | card_id not used as customer identity, tenant_card_id raw audit only, 99099 rejected as customer phone, provider phone forbidden |
| 2C Access Snapshot DTO | parsed bed/deposit/check-in/expiry, parse_status, raw remark retention, provider metadata non-authoritative |
| 2D Canonical Common Fields | all 7 events include common fields, fingerprints stable, status/server_validated_at present after validation |
| 2E occupancy_session_id | create/continue/transfer/checkout/left-with-arrears fixture rules |
| 2F Projections | deposit, arrears, occupancy, access validity, and bed transfer rebuild from canonical events |
| 2G Correction/Void/Reversal | original immutable, linked correction, duplicate void, repayment reversal, arrears waiver |
| 2H Anomaly Screening | active bed conflict, access expiry mismatch, refund while arrears open, duplicate fingerprint, 99099 provider phone |
| 2I Ledger Compiler | WhatsApp/owner display compiled from canonical events only; readable output not source of truth |

## 7. Risks and Dependencies

Dependencies:

- Phase 2A must precede projection and compiler work because duplicate facts corrupt downstream totals.
- Phase 2B must precede occupancy and customer identity work because provider metadata must be excluded from identity rules.
- Phase 2C should precede access validity projections so snapshots have stable shape.
- Phase 2D must precede Phase 2F projections because projections need complete anchors.
- Phase 2E must be designed before checkout, left-with-arrears, and bed transfer are treated as final state transitions.
- Phase 2I must wait until anchor and projection safety is established.

Areas that must not be touched together:

- Upload duplicate guard and WhatsApp compiler.
- occupancy_session_id migration and owner UI display changes.
- arrears projection rewrite and deposit ledger rewrite.
- access-card parser changes and production backfill.
- correction event model and historical data cleanup.

Risk of breaking current upload:

- Medium in Phase 2A because the upload route is active and business-critical.
- Reduce risk by adding pre-write duplicate checks behind exact fixture tests and preserving current successful rent upload path.

Risk of breaking owner history:

- Medium if owner detail starts reading new canonical fields before compatibility tests exist.
- Do not change owner detail in Phase 2A.

Risk of breaking arrears:

- High if rent short-paid, arrears projection, and arrears payment are changed together.
- Do not combine Phase 2A duplicate guard with projection rewrite.

Risk of migration:

- High for occupancy_session_id and durable fingerprint indexes.
- Defer migration until no-migration contract fields and fixture behavior are stable.

