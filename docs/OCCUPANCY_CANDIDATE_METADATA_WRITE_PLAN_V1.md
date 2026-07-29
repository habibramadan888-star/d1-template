# Occupancy Candidate Metadata Write Plan V1

Date: 2026-07-08

Status: planning only. No runtime implementation. No migration. No production data changes. No deploy required.

## 1. Purpose

This document defines the future safe strategy for storing `occupancy_candidate` metadata after a real employee upload succeeds.

The metadata is transitional and non-authoritative.

It is intended only as:

- `non_authoritative_occupancy_candidate`
- `preview_metadata`
- `migration_preparation_metadata`
- audit/supporting metadata for future durable `occupancy_session_id`

It must not become customer identity or business matching authority.

## 2. Current Step 2F Dry-run Status

Step 2F is `LIVE_VERIFIED`.

Verified flows:

- Rent dry-run preview
- Arrears Payment dry-run preview
- Bed Transfer dry-run preview

Verified properties:

- `occupancy_candidate_preview` exists
- `mode = dry_run_preview_only`
- `candidate_persistence = not_persisted`
- `no_write = true`
- `forbidden_inputs_used` all false
- `real_upload_called = false`
- production write = no

Step 2F does not persist candidate metadata.

## 3. Identity Layers

### A. Dry-run Preview

Dry-run preview is:

- returned by `/api/employee/entry/validate`
- no-write
- not persisted
- not authoritative
- used only for validation inspection and future migration preparation

Dry-run preview must continue to report:

- `candidate_persistence = not_persisted`
- `mode = dry_run_preview_only`

### B. Non-Authoritative Uploaded Metadata

Future real upload metadata may be stored only as:

- metadata
- non-authoritative
- not durable
- not final identity
- not used for matching

It may help future migration to durable occupancy sessions, but it must not control business logic.

It must not replace legacy matching.

It is not used for customer identity.

Required labels:

- `non_authoritative`
- `metadata_only`
- `not_durable`
- `not_final_identity`
- `not_used_for_matching`

### C. Durable Occupancy Session ID

Durable `occupancy_session_id` is not implemented in this step.

Durable identity requires a separate design, migration, owner correction model, audit model, rollback plan, and live verification.

## 4. Should Preview Be Written on Real Upload?

Answer:

- Dry-run preview: no, it remains not persisted.
- Future real upload metadata: optional, non-authoritative metadata only.
- Durable `occupancy_session_id`: not implemented yet.

Future implementation may copy the server upload preflight candidate metadata into new uploaded event anchors only if it does not alter upload acceptance, duplicate detection, financial totals, owner decoding, arrears matching, deposit matching, checkout blocking, or bed transfer business state.

## 5. Proposed Storage Target

### A. `entries_json` Per Event Metadata

Recommendation: first safe implementation target.

Reasons:

- no migration required
- scoped to new uploaded events only
- travels with canonical employee entry anchors
- owner history can ignore it safely
- legacy sessions without metadata remain valid
- can be removed or ignored without data-model rollback

Recommended first step:

Store metadata under each new event anchor in `sessions.entries_json` only.

### B. Transactions Row Metadata

Possible later target if an existing metadata JSON field is already available.

Do not use this first if it requires schema changes or risks financial row parsing.

### C. HOMELINK LEDGER Audit Block

Possible later audit mirror only.

It should not become the primary candidate storage because it is audit/supporting metadata, not event truth.

### D. Separate Table Later

Separate table is only for durable or indexed occupancy work after migration design.

Do not add a table in this step.

## 6. Proposed Metadata Shape

Future uploaded event anchor metadata:

```json
{
  "occupancy_candidate_metadata": {
    "version": "occupancy_candidate_v1",
    "classification": "non_authoritative",
    "storage_role": "metadata_only",
    "durability": "not_durable",
    "identity_role": "not_final_identity",
    "matching_role": "not_used_for_matching",
    "candidate_id": "occ_candidate:...",
    "candidate_status": "candidate_unresolved",
    "candidate_persistence": "metadata_only_not_authoritative",
    "source": "server_upload_preflight",
    "generated_at": "2026-07-08T00:00:00.000Z",
    "basis": {
      "property_id": "homelink",
      "bed": "334",
      "business_date": "2026-07-08",
      "linked_event_id": null,
      "linked_arrears_ref": null,
      "access_snapshot_summary": {
        "bed": "334",
        "parsed_deposit_amount": 200,
        "parsed_checkin_mmdd": "0515",
        "parsed_valid_until_mmdd": "0815",
        "parse_status": "parsed"
      }
    },
    "forbidden_inputs_used": {
      "card_id": false,
      "tenant_card_id": false,
      "provider_phone": false,
      "phone_99099": false
    },
    "warnings": [],
    "anomalies": []
  }
}
```

The object must be ignored by business logic until durable occupancy identity is implemented and live verified.

## 7. Event-by-Event Metadata Behavior

All seven employee event types may receive metadata later if the real upload succeeds.

### A. Rent

- May store `candidate_created`, `candidate_continued`, or `candidate_unresolved`.
- Short-paid rent metadata may indicate future arrears continuity.
- Must not change Cloud Arrears creation or rent validation.

### B. Arrears Payment

- May store candidate inherited from `arrears_ref` if known.
- If no source candidate exists, store `candidate_unresolved`.
- Must not change arrears payment matching or settlement logic.

### C. Deposit In

- May store `candidate_created` for new deposit.
- May store `candidate_continued` for balance/additional deposit.
- Must not alter deposit ledger authority.

### D. Deposit Out

- May store `candidate_continued`, `candidate_unresolved`, or `candidate_conflict`.
- Must not alter deposit balance calculation.
- Must not alter refund blocking.

### E. Checkout

- May store `candidate_checkout_pending`, `candidate_unresolved`, or `candidate_conflict`.
- Must not alter checkout blocking or owner approval rules.
- Must not durably close an occupancy session.

### F. Left With Arrears

- May store `candidate_left_with_arrears`.
- Old candidate remains financially open only as metadata until durable model exists.
- Must not alter Cloud Arrears state.

### G. Expense

- May store `candidate_not_applicable` for property/company expense.
- May store `candidate_unresolved` for unclear bed-related expense.
- Must not force a customer identity.

### H. Bed Transfer

- May store `candidate_transferred`, `candidate_unresolved`, or `candidate_conflict`.
- Must not move durable business state.
- Must not alter deposit, arrears, rent coverage, or access validity.

## 8. Unresolved and Conflict Behavior

If real upload succeeds but candidate matching is unclear:

- store `candidate_unresolved` metadata
- preserve warnings/anomalies
- do not block upload unless existing business validation blocks it
- do not make business decisions from this metadata

If conflict is detected:

- store `candidate_conflict` metadata
- include anomaly records
- keep owner/employee normal UI unchanged initially
- expose only in debug/audit view later

## 9. Forbidden Inputs

Metadata generation must not use:

- `card_id`
- `tenant_card_id`
- hardware card id
- provider phone
- access-card metadata phone
- repeated `99099` phone

The metadata must include:

```json
{
  "forbidden_inputs_used": {
    "card_id": false,
    "tenant_card_id": false,
    "provider_phone": false,
    "phone_99099": false
  }
}
```

If any forbidden input would be required, store unresolved/conflict metadata or stop implementation.

## 10. UI Visibility

Initial future implementation should keep metadata hidden from normal UI.

Allowed later visibility:

- debug panel
- audit panel
- owner/developer diagnostic view

Not allowed initially:

- employee-visible customer identity
- owner-visible customer identity
- financial total display
- deposit/arrears/checkout decision UI

## 11. Business Logic Non-Impact Guarantee

Future metadata write must not:

- create durable `occupancy_session_id`
- create occupancy table
- replace `tenant_card_id` matching
- alter deposit balance logic
- alter arrears matching logic
- alter checkout blocking logic
- alter bed transfer business state
- write provider phone as customer phone
- use `card_id` as candidate basis
- use `tenant_card_id` as candidate basis
- affect duplicate guard
- affect owner history parser
- affect financial totals

Metadata is support data only.

## 12. Future Implementation Phases

Phase 2G-1:

- Copy server upload preflight candidate preview into `entries_json` metadata for new events only.
- No migration.
- No business logic read path.

Phase 2G-2:

- Add owner/debug inspection only.
- Keep normal owner and employee UI unchanged.

Phase 2G-3:

- Add analytics/audit comparison reports to evaluate candidate quality.
- Still no business logic authority.

Phase 2G-4:

- Design durable `occupancy_session_id` table/index and owner correction workflow.

Phase 2G-5:

- Only after durable design and live verification, consider replacing legacy matching.

## 13. Tests Required for Future Implementation

Future implementation must add tests proving:

- real upload writes candidate metadata into `entries_json` only
- no database migration
- no durable occupancy session table
- no `tenant_card_id` replacement
- forbidden inputs remain false
- duplicate guard still works
- Rent upload still works
- Arrears Payment upload still works
- Bed Transfer upload still works
- Deposit In upload still works
- Deposit Out upload still works
- Checkout upload still works
- Expense upload still works
- owner history parser still works
- legacy sessions without metadata still work
- financial totals remain unchanged
- metadata is hidden from normal UI
- unresolved/conflict metadata does not block upload unless existing validation blocks it

## 14. No-Go Conditions

Implementation must stop if:

- metadata write requires migration
- metadata write changes business decisions
- metadata uses `card_id`
- metadata uses `tenant_card_id`
- metadata uses provider phone
- metadata uses `99099` phone
- metadata breaks owner decoder
- metadata causes duplicate guard regression
- metadata changes financial totals
- metadata blocks valid uploads by itself
- legacy sessions without metadata fail to parse
- normal UI starts treating metadata as customer identity

## 15. Recommended First Implementation Task

Recommended next implementation:

`STEP 2G IMPLEMENTATION: Store non-authoritative occupancy_candidate_metadata in entries_json for new uploaded events only.`

Scope for that implementation:

- use server upload preflight preview metadata
- copy metadata to each new event anchor
- store only in `sessions.entries_json`
- do not add schema
- do not migrate old data
- do not alter financial totals
- do not alter matching
- do not expose in normal UI

Go/no-go recommendation:

`GO_TO_METADATA_WRITE_IMPLEMENTATION` only if the implementation is limited to `entries_json` metadata for new events and keeps all business logic non-authoritative.

Runtime behavior changed in this step: no.

Production data changed in this step: no.

Migration in this step: no.

Deploy in this step: no.
