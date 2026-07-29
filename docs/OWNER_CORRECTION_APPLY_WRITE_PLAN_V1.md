# Owner Correction Apply / Write Plan V1

Date: 2026-07-08

Status: planning only. No apply endpoint implemented. No correction anchors written. No production data changes. No migration. No deploy.

## 1. Purpose

H3 defines how a future owner-approved correction apply/write step can safely write correction anchors without mutating original employee events.

Original events remain immutable. A correction must be additive and auditable. The original employee session, transaction rows, arrear tasks, deposit ledger, and uploaded text remain the source facts. The correction write creates a separate owner/system correction fact that later projections can read.

This plan does not correct `EMPV3-20260707-abdul-x6wio`, does not implement the write endpoint, and does not change Owner History totals.

## 2. No-Migration Write Strategy

The first write target should use the existing `sessions` / `export_text` mechanism. The future apply step creates a new owner/system correction session rather than editing the target employee session.

Example correction session text:

```text
HOMELINK OWNER CORRECTION
CORR-20260708-owner-x6wio-xxxxx

==== CORRECTION ANCHORS JSON ====
{
  "anchor_contract_version": "owner_correction_anchor_v1",
  "correction_session_id": "CORR-S20260708-owner-x6wio-xxxxx",
  "correction_anchor_id": "CORR-20260708-owner-x6wio-xxxxx",
  "correction_type": "duplicate_upload_correction",
  "target_session_anchor": "EMPV3-20260707-abdul-x6wio",
  "target_session_id": "S20260707-x6wio",
  "status": "applied",
  "correction_events": []
}
==== END CORRECTION ANCHORS JSON ====
```

First implementation rules:

- Do not require a new DB table.
- Do not require new columns.
- Do not mutate the target employee session.
- Do not mutate transaction rows.
- Do not mutate `arrear_tasks`.
- Do not mutate deposit ledger rows.
- Future migration may add a durable `correction_events` table, but that is not part of the first apply implementation.

## 3. Apply Endpoint Design

Future endpoint:

`POST /api/owner/corrections/apply`

Access rules:

- Owner can apply.
- Admin may draft or preview only unless the existing system explicitly treats that admin role as owner-level write authority.
- Employee must never apply correction.

Required request fields:

- `target_session_anchor`
- `target_session_id`
- `correction_type`
- `correction_reason`
- `evidence_summary`
- `correction_events`
- `preview_hash`
- `idempotency_key`
- `explicit_owner_confirmation`

The endpoint must recompute the preview server-side before writing. It must not trust client-calculated totals.

## 4. Preview-to-Apply Binding

Apply must not accept arbitrary correction writes. Apply must bind to a successful dry-run preview.

`preview_hash` must be a stable hash of:

- `target_session_anchor`
- `target_session_id`
- `correction_type`
- `correction_events`
- each event `financial_effect`
- `original_totals`
- `correction_totals`
- `adjusted_totals`
- target session content hash or `export_text` hash
- created_by / owner identity
- preview timestamp window

Apply must reject if:

- `preview_hash` is missing.
- `preview_hash` does not match the recomputed preview.
- target session changed since preview.
- original totals changed since preview.
- correction event IDs changed.
- correction totals changed.
- adjusted totals changed.
- preview expired.

## 5. Owner Confirmation Contract

Apply request must include explicit owner confirmation:

```json
{
  "explicit_owner_confirmation": {
    "confirmed": true,
    "understands_original_events_immutable": true,
    "understands_no_hard_delete": true,
    "understands_correction_is_additive": true,
    "confirmed_adjusted_gross": 80,
    "confirmed_correction_gross_delta": -1470,
    "confirmed_target_session_anchor": "EMPV3-20260707-abdul-x6wio"
  }
}
```

Reject if confirmation is missing, false, mismatched, or confirms a different target/amount.

## 6. Idempotency and Duplicate Correction Guard

Apply must require:

- `idempotency_key`
- `correction_request_fingerprint`
- `target_session_anchor`
- original_event_id list
- `correction_type`

Duplicate correction guard rules:

- Same `idempotency_key` with identical fingerprint returns the existing correction result.
- Same `idempotency_key` with different fingerprint is rejected.
- Same `target_session_anchor` + same `original_event_id` list + same `correction_type` is rejected unless it is an exact idempotent replay.
- Same `original_event_id` already voided by an active correction is rejected.
- Existing correction session with the same fingerprint is returned or rejected safely.
- Never double-void the same `original_event_id`.

## 7. Correction Session Fields

Required correction session fields:

- `correction_session_id`
- `correction_anchor_id`
- `correction_anchor_contract_version`
- `target_session_id`
- `target_session_anchor`
- `target_employee_userid`
- `target_business_date`
- `correction_type`
- `correction_reason`
- `evidence_summary`
- `created_by`
- `created_by_role`
- `authorized_by`
- `authorized_role`
- `created_at`
- `effective_date`
- `applied_at`
- `status = applied`
- `preview_hash`
- `idempotency_key`
- `correction_request_fingerprint`
- `original_totals`
- `correction_totals`
- `adjusted_totals`
- `no_hard_delete = true`
- `original_events_immutable = true`
- `production_write_scope = correction_anchor_only`

## 8. Correction Event Fields

Each correction event must include:

- `correction_event_id`
- `correction_event_type`
- `original_event_id`
- `original_session_id`
- `original_anchor`
- `affected_bed`
- `affected_event_type`
- `affected_arrears_ref`, if applicable
- `affected_deposit_ref`, if applicable
- `affected_occupancy_candidate_id`, if available
- `correction_reason`
- `evidence_summary`
- `financial_effect`
- `projection_effect`
- `status = applied`
- `audit_note`

## 9. x6wio Apply Example

Future apply target:

- `EMPV3-20260707-abdul-x6wio`
- `S20260707-x6wio`

Keep:

- `ent20260707-x6wio-01`
- `#334 arrears_payment 80`

Void by correction anchor:

1. `void_duplicate_event`
   - `original_event_id = ent20260707-x6wio-02`
   - `affected_bed = 334`
   - `amount = 700`
   - `cash_delta = -700`
   - `gross_delta = -700`
   - `rent_income_delta = -700`

2. `void_duplicate_event`
   - `original_event_id = ent20260707-x6wip-03`
   - `affected_bed = 134`
   - `amount = 770`
   - `cash_delta = -770`
   - `gross_delta = -770`
   - `rent_income_delta = -770`

Expected correction totals:

- `cash_delta = -1470`
- `gross_delta = -1470`
- `rent_income_delta = -1470`

Expected adjusted totals:

- `cash = 80`
- `gross = 80`
- `rent_income = 0`
- `arrears_repaid = 80`

Do not apply this in H3 planning.

## 10. Atomicity and Failure Handling

Apply behavior if write fails:

- Correction session write must be atomic as much as existing `sessions` / `export_text` storage allows.
- No partial correction events without a correction session.
- If write fails, return failure and do not mark anything applied.
- If retry uses the same idempotency key and same fingerprint, return the same result or safe duplicate response.
- No original source session mutation.
- No transaction row mutation.
- No `arrear_tasks` mutation in first no-migration apply.
- No deposit ledger mutation in first no-migration apply.
- No owner history mutation except the additive correction session itself.

## 11. Owner History Integration Plan

Staged integration:

- H3 first write may only create a correction anchor session.
- Owner adjusted summary must not change in H3.
- Owner History totals must not silently change until adjusted mode is explicitly designed and verified.

Future stages:

- H4: Owner parser reads correction sessions and can calculate adjusted totals.
- H5: Owner History displays original total, correction total, adjusted total, and linked correction events.
- H6: Correction reversal support.

Important: do not silently change existing History totals until adjusted mode is explicitly designed and LIVE_VERIFIED.

## 12. Security and Authorization

Security rules:

- Employee forbidden.
- Owner required for apply.
- Admin behavior must match existing system policy.
- Apply must verify same `corpid` / tenant.
- Apply cannot correct across another company/account.
- Apply cannot use `card_id`, `tenant_card_id`, hardware card id, provider phone, access-card metadata phone, or `99099` as identity.
- Apply cannot print secrets, tokens, cookies, or passwords.

## 13. Validation Rules

Apply must reject if:

- `target_session_anchor` missing.
- Target session not found.
- `correction_events` empty.
- `original_event_id` missing.
- `original_event_id` not found in target session.
- Duplicate `original_event_id` in same request.
- `original_event_id` already corrected by active correction.
- `financial_effect` missing.
- `financial_effect` mismatch.
- `hard_delete = true`.
- `silent_overwrite = true`.
- Forbidden identity used.
- `preview_hash` invalid.
- Preview expired.
- Owner confirmation missing.
- Adjusted totals mismatch confirmation.
- `idempotency_key` missing.
- Target session changed since preview.

## 14. No-Go Conditions

Implementation must stop if:

- Apply requires migration.
- Apply requires direct edit of original session.
- Apply requires hard delete.
- Apply cannot ensure idempotency.
- Apply cannot prevent double correction.
- Apply cannot bind to a successful preview.
- Apply cannot verify owner authorization.
- Apply would alter arrears/deposit projection without separate tests.
- Apply would silently change owner History totals.
- Apply depends on `card_id`, `tenant_card_id`, provider phone, hardware card id, access-card metadata phone, or `99099` identity.

## 15. Required Future Tests

Future H3 apply implementation tests:

- Owner can apply correction anchor.
- Employee forbidden.
- Preview hash required.
- Invalid preview hash rejected.
- Changed target session rejected.
- Missing confirmation rejected.
- Mismatched adjusted total confirmation rejected.
- Idempotency repeat returns existing correction.
- Double correction rejected.
- Correction session written as `HOMELINK OWNER CORRECTION`.
- Original x6wio session unchanged.
- Original events remain visible.
- No hard delete.
- No transaction row mutation.
- No `arrear_tasks` mutation.
- No deposit mutation.
- x6wio correction anchor totals = `-1470`.
- Adjusted preview after correction = `80`.
- Old sessions still parse.
- Owner history parser unaffected until H4.
- Forbidden identity rejected.

## 16. Recommended Next Implementation Step

GO_TO_H3_APPLY_ENDPOINT_IMPLEMENTATION only after this plan is accepted.

The next step should implement a write endpoint behind owner authorization that:

- recomputes H2 preview,
- validates preview hash,
- validates explicit owner confirmation,
- writes only a new owner/system correction session,
- returns no original mutation proof,
- remains `PRODUCTION_NO_GO`.
