# Occupancy Candidate Dry-run Preview Contract V1

Date: 2026-07-08

Status: planning only. No runtime implementation. No migration. No production data changes. No deploy required.

## 1. Purpose

This document defines the future dry-run-only response contract for `occupancy_candidate_id` preview on:

`POST /api/employee/entry/validate`

The preview exists to prepare future occupancy identity work without changing current upload behavior.

The preview is:

- dry-run only
- no-write
- transitional
- non-authoritative
- used for validation and future migration preparation

The preview is not:

- durable
- persisted
- a replacement for current `tenant_card_id` matching
- a replacement for deposit, arrears, or checkout matching
- final `occupancy_session_id`
- allowed to use provider identity as customer identity

## 2. Scope

This step only defines the contract.

This step does not:

- implement runtime candidate preview
- modify `/api/employee/entry/validate`
- modify `/api/employee/entry`
- modify employee upload
- modify owner UI
- modify employee UI
- modify arrears projection
- replace `tenant_card_id` matching
- correct old duplicate data
- implement owner correction
- implement WhatsApp compiler
- write production data
- add migration
- deploy runtime behavior

## 3. Future Response Shape

Future `POST /api/employee/entry/validate` may add this top-level field:

```json
{
  "occupancy_candidate_preview": {
    "enabled": true,
    "mode": "dry_run_preview_only",
    "no_write": true,
    "source": "server_dry_run",
    "candidate_persistence": "not_persisted",
    "migration_required_for_durable_id": true,
    "batch_id": "dryrun-...",
    "preview_generated_at": "2026-07-08T00:00:00.000Z",
    "events": [
      {
        "event_index": 0,
        "event_id": "ent...",
        "event_type": "rent",
        "bed": "334",
        "occupancy_candidate_id": "occ_candidate:homelink:334:20260707:ent...",
        "occupancy_candidate_status": "candidate_created",
        "candidate_basis": {
          "property_id": "homelink",
          "bed": "334",
          "business_date": "2026-07-07",
          "access_snapshot_summary": {
            "bed": "334",
            "parsed_deposit_amount": 200,
            "parsed_checkin_mmdd": "0515",
            "parsed_valid_until_mmdd": "0815",
            "parse_status": "parsed"
          },
          "linked_event_id": null,
          "linked_arrears_ref": null,
          "staff_entered_customer_phone_present": false
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
    ],
    "batch_warnings": [],
    "batch_anomalies": [],
    "no_write_proof": {
      "dry_run": true,
      "write_endpoints_called": [],
      "d1_write_count": 0,
      "session_write_attempted": false,
      "transaction_write_attempted": false,
      "arrear_task_write_attempted": false,
      "deposit_write_attempted": false,
      "access_snapshot_write_attempted": false,
      "occupancy_write_attempted": false,
      "owner_history_write_attempted": false,
      "real_upload_called": false,
      "wrote_sessions": false,
      "wrote_transactions": false,
      "wrote_arrear_tasks": false,
      "wrote_deposit_ledger": false,
      "wrote_access_snapshot": false,
      "wrote_occupancy_session": false,
      "wrote_owner_history": false
    }
  }
}
```

If exact D1 write count cannot be measured, the response must include:

```json
{
  "write_guard_mode": "route_level_no_write",
  "proof_limitations": "D1 write count not measured, but validate route does not call write functions"
}
```

## 4. Top-Level Preview Fields

Required fields:

- `enabled`: boolean
- `mode`: must be `dry_run_preview_only`
- `no_write`: must be true
- `source`: must be `server_dry_run`
- `candidate_persistence`: must be `not_persisted`
- `migration_required_for_durable_id`: must be true
- `batch_id`: dry-run correlation id
- `preview_generated_at`: server timestamp
- `events`: candidate preview per incoming event
- `batch_warnings`: non-blocking batch warnings
- `batch_anomalies`: batch-level anomalies
- `no_write_proof`: proof that no real write occurred

The response must not imply that candidate ids are durable or already persisted.

## 5. Event Preview Object

Required fields per event:

- `event_index`
- `event_id`
- `event_type`
- `bed` when applicable
- `from_bed` for bed transfer when applicable
- `to_bed` for bed transfer when applicable
- `occupancy_candidate_id`
- `occupancy_candidate_status`
- `candidate_basis`
- `forbidden_inputs_used`
- `warnings`
- `anomalies`

`occupancy_candidate_id` may be null when status is:

- `candidate_unresolved`
- `candidate_conflict`
- `candidate_not_applicable`

## 6. Candidate Basis

Allowed candidate basis fields:

- `property_id`
- `bed`
- `from_bed`
- `to_bed`
- `business_date`
- `rent_period_start`
- `rent_period_end`
- `access_snapshot_summary`
- `linked_event_id`
- `linked_arrears_ref`
- `deposit_reason`
- `checkout_type`
- `staff_entered_customer_phone_present`

`access_snapshot_summary` may include parsed non-authoritative context:

- `bed`
- `parsed_deposit_amount`
- `parsed_checkin_mmdd`
- `parsed_valid_until_mmdd`
- `parse_status`

Access snapshot fields are context only and must not become customer identity.

## 7. Forbidden Identity Inputs

Dry-run candidate preview must explicitly prove these inputs were not used:

- `card_id`
- `tenant_card_id`
- hardware card id
- provider phone
- access-card metadata phone
- repeated `99099` phone

Required response field:

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

If any forbidden input would be required to generate a candidate:

- `occupancy_candidate_status = candidate_unresolved`
- anomaly includes `PROVIDER_METADATA_USED_FOR_CANDIDATE`, `CARD_ID_USED_FOR_CANDIDATE`, `TENANT_CARD_ID_USED_FOR_CANDIDATE`, or `PHONE_99099_USED_FOR_CANDIDATE`
- no confident candidate is generated

## 8. Candidate Status Enum

Allowed candidate statuses:

- `candidate_created`
- `candidate_continued`
- `candidate_unresolved`
- `candidate_conflict`
- `candidate_transferred`
- `candidate_left_with_arrears`
- `candidate_checkout_pending`
- `candidate_closed_preview`
- `candidate_not_applicable`

`candidate_closed_preview` means the dry-run predicts a future close effect. It must not mean the checkout was written or the candidate was durably closed.

## 9. Event-by-Event Preview Rules

### A. Rent

Preview behavior:

- `candidate_created` if no active candidate exists and the event appears to start a stay.
- `candidate_continued` if the bed has an active candidate.
- `candidate_unresolved` if active state is unknown.
- Short-paid rent links future arrears to the same candidate.
- Multi-month advance continues the same candidate.

Forbidden:

- do not use `card_id`
- do not use `tenant_card_id`
- do not use provider phone
- do not use `99099` phone

### B. Arrears Payment

Preview behavior:

- inherit candidate from selected `arrears_ref` / `original_event_id`
- `candidate_unresolved` if `arrears_ref` has no candidate
- must not create a new candidate from payment alone
- must not derive candidate only by bed

### C. Deposit In

Preview behavior:

- `candidate_created` when `deposit_reason = new`
- `candidate_continued` when `deposit_reason = balance` or `additional`
- `candidate_unresolved` if deposit reason is unclear
- deposit belongs to candidate
- access remark `D200` is context only

### D. Deposit Out

Preview behavior:

- `candidate_continued` if active candidate is found
- `candidate_unresolved` if no active candidate exists
- future rule: open arrears for same candidate blocks refund
- dry-run preview performs no write

### E. Checkout Normal

Preview behavior:

- `candidate_checkout_pending`
- `candidate_closed_preview` only as a predicted dry-run effect
- if open arrears exists, add anomaly `CHECKOUT_WITH_OPEN_ARREARS`
- bed vacancy effect is preview only

The preview must not mark a durable candidate closed.

### F. Left With Arrears

Preview behavior:

- `candidate_left_with_arrears`
- old candidate remains financially open
- bed may become available for a future new candidate
- staff-entered phone is allowed
- provider phone is forbidden
- `99099` phone is forbidden

### G. Expense

Preview behavior:

- `candidate_continued` only if expense is bed-related and active candidate is clear
- `candidate_unresolved` if expense is bed-related but active candidate is unclear
- `candidate_not_applicable` or null candidate is allowed for property/company expense

### H. Bed Transfer

Preview must show same candidate migration:

- `from_bed`
- `to_bed`
- `candidate_transferred`
- `from_state_before`
- `to_state_before`
- `from_state_after_expected`
- `to_state_after_expected`
- `deposit_moved` preview
- `rent_coverage_moved` preview
- `arrears_moved` preview
- `access_validity_moved` preview

If `to_bed` seems occupied:

- anomaly = `BED_TRANSFER_TO_OCCUPIED_BED`
- candidate status = `candidate_conflict`

Bed Transfer must never create a new candidate.

## 10. Anomaly Model

An anomaly object must use this shape:

```json
{
  "risk_code": "CHECKOUT_WITH_OPEN_ARREARS",
  "risk_level": "high",
  "confidence_score": 0.9,
  "event_index": 0,
  "event_id": "ent...",
  "suggested_action": "Collect arrears first or request owner approval.",
  "source_fields": ["bed", "arrears_ref"]
}
```

Allowed `risk_level` values:

- `low`
- `medium`
- `high`
- `critical`

`confidence_score` must be between 0.0 and 1.0.

Required risk codes:

- `SAME_BED_NEW_CUSTOMER_WITH_ACTIVE_CANDIDATE`
- `ARREARS_PAYMENT_WITHOUT_ORIGINAL_CANDIDATE`
- `DEPOSIT_OUT_WITHOUT_ACTIVE_CANDIDATE`
- `CHECKOUT_WITHOUT_ACTIVE_CANDIDATE`
- `CHECKOUT_WITH_OPEN_ARREARS`
- `BED_TRANSFER_WITHOUT_FROM_CANDIDATE`
- `BED_TRANSFER_TO_OCCUPIED_BED`
- `PROVIDER_METADATA_USED_FOR_CANDIDATE`
- `CARD_ID_USED_FOR_CANDIDATE`
- `TENANT_CARD_ID_USED_FOR_CANDIDATE`
- `PHONE_99099_USED_FOR_CANDIDATE`
- `CANDIDATE_AMBIGUOUS`

## 11. No-Write Proof Pack

Future dry-run response must include:

- `dry_run = true`
- `write_endpoints_called = []`
- `d1_write_count = 0` if measurable
- `session_write_attempted = false`
- `transaction_write_attempted = false`
- `arrear_task_write_attempted = false`
- `deposit_write_attempted = false`
- `access_snapshot_write_attempted = false`
- `occupancy_write_attempted = false`
- `owner_history_write_attempted = false`
- `real_upload_called = false`

Compatibility aliases may also be included:

- `wrote_sessions = false`
- `wrote_transactions = false`
- `wrote_arrear_tasks = false`
- `wrote_deposit_ledger = false`
- `wrote_access_snapshot = false`
- `wrote_occupancy_session = false`
- `wrote_owner_history = false`

If write count instrumentation is unavailable, include:

- `write_guard_mode = route_level_no_write`
- `proof_limitations = D1 write count not measured, but validate route does not call write functions`

## 12. Future Live Verification Proof Pack

Future implementation cannot be called `LIVE_VERIFIED` unless this proof exists:

1. Authenticated production browser or API evidence.
2. Only `POST /api/employee/entry/validate` is called.
3. `POST /api/employee/entry` is blocked by a console monkey-patch or equivalent request monitor.
4. One normal Rent fixture is validated.
5. One Arrears Payment fixture is validated.
6. One Bed Transfer fixture is validated.
7. Raw request payload is captured.
8. Raw response body is captured.
9. Response contains `occupancy_candidate_preview`.
10. Response contains `no_write_proof`.
11. `real_upload_called = false`.
12. `write_endpoints_called = []`.
13. Forbidden inputs are all false.
14. Provider phone and `99099` phone are not used.
15. Evidence states what was not verified.

Suggested browser console guard for future verification:

```js
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const url = String(args[0]);
  if (url.includes("/api/employee/entry") && !url.includes("/api/employee/entry/validate")) {
    throw new Error("Blocked real upload during occupancy candidate dry-run verification");
  }
  return originalFetch(...args);
};
```

## 13. No-Go Conditions for Future Implementation

Implementation must stop if:

- active candidate lookup requires migration
- candidate generation requires `card_id`
- candidate generation requires `tenant_card_id`
- candidate generation requires provider phone
- candidate generation requires `99099` phone
- current runtime cannot identify active bed state safely
- bed transfer target status cannot be determined
- dry-run cannot prove no write
- response would confuse candidate preview with durable `occupancy_session_id`
- owner correction dependency is required but not designed
- anomaly reporting cannot identify source event and suggested action

## 14. Required Future Tests

Before implementing runtime behavior, add tests for:

- response includes `occupancy_candidate_preview`
- response uses `mode = dry_run_preview_only`
- response uses `candidate_persistence = not_persisted`
- response includes `no_write_proof`
- no-write proof blocks all write paths
- Rent preview creates or continues candidate correctly
- Arrears Payment inherits candidate from `arrears_ref`
- Deposit In preview respects `deposit_reason`
- Deposit Out preview flags missing active candidate
- Checkout Normal preview flags open arrears
- Left With Arrears preview keeps old candidate financially open
- Expense preview supports candidate_not_applicable
- Bed Transfer preview moves same candidate
- Bed Transfer to occupied bed returns candidate_conflict
- forbidden identity inputs all remain false
- `card_id` cannot generate candidate
- `tenant_card_id` cannot generate candidate
- provider phone cannot generate candidate
- `99099` phone cannot generate candidate
- dry-run route performs no D1 writes
- real upload route is not called

## 15. Implementation Boundary

This document does not authorize runtime implementation.

Recommended next step:

Step 2F implementation may start only after this contract is reviewed and accepted, and only if implementation is limited to dry-run preview on `/api/employee/entry/validate` with no write behavior.

Runtime behavior changed in this step: no.

Production data changed in this step: no.

Migration in this step: no.

Deploy in this step: no.
