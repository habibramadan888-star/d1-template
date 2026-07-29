# Owner Correction Anchor Implementation Plan V1

Date: 2026-07-08

Status: implementation planning only. No runtime correction code. No production data changes. No migration. No deploy.

## 1. Purpose

Correction anchors allow Homelink to safely correct duplicate uploads, wrong repayments, wrong deposits, wrong checkout events, and disputed records without hard delete, silent overwrite, or direct database edits.

Original employee events remain immutable.

Corrections are new owner/system events that link to original facts. A correction changes the projected business view, not the historical source fact.

The first implementation must be no-migration and additive. It must not correct x6wio production data, and it must not change runtime behavior in this planning step.

## 2. No-Migration Storage Strategy

Preferred first implementation target:

Store correction anchors as a new owner/system correction session using the existing `sessions` and `export_text` mechanism.

Example correction session text:

```text
HOMELINK OWNER CORRECTION
Correction Anchor ID: CORR-20260708-owner-xxxxx
Target Session: EMPV3-20260707-abdul-x6wio
Reason: duplicate upload correction

==== CORRECTION ANCHORS JSON ====
{
  "anchor_contract_version": "owner_correction_anchor_v1",
  "correction_session_id": "CORR-S20260708-owner-xxxxx",
  "correction_type": "duplicate_upload_correction",
  "target_session_anchor": "EMPV3-20260707-abdul-x6wio",
  "correction_events": []
}
==== END CORRECTION ANCHORS JSON ====
```

First implementation should not require a new table or new columns.

The correction session must be owner/system sourced, not employee sourced. It must not rewrite the target employee session.

Future migration alternatives:

- `correction_events` table
- correction indexes
- durable projection tables

These future alternatives require separate migration design and are not part of the no-migration first implementation.

## 3. Correction Anchor Contract

Contract version:

- `correction_anchor_contract_version = owner_correction_anchor_v1`

Correction session common fields:

- `correction_session_id`
- `correction_anchor_id`
- `correction_type`
- `target_session_id`
- `target_session_anchor`
- `target_employee_userid`
- `target_business_date`
- `created_by`
- `created_by_role`
- `authorized_by`
- `authorized_role`
- `created_at`
- `effective_date`
- `correction_reason`
- `evidence_summary`
- `status = pending / applied / rejected / reversed / voided`
- `production_write_scope`
- `no_hard_delete = true`
- `original_events_immutable = true`

Correction event fields:

- `correction_event_id`
- `correction_event_type`
- `original_event_id`
- `original_entry_id`
- `original_session_id`
- `original_anchor`
- `affected_bed`
- `affected_event_type`
- `affected_arrears_ref`, if applicable
- `affected_deposit_ref`, if applicable
- `affected_occupancy_candidate_id`, if available
- `correction_reason`
- `financial_effect`
- `projection_effect`
- `audit_note`
- `evidence_summary`
- `status`

Correction anchors must be explicitly linked to the original event. A correction without a unique `original_event_id` is invalid unless it is a draft-only dispute marker with no financial effect.

## 4. Correction Event Types

Supported correction event types:

- `void_duplicate_event`
- `reverse_event`
- `correction_adjustment_event`
- `arrears_waiver_event`
- `deposit_adjustment_event`
- `repayment_reversal_event`
- `dispute_marker_event`
- `owner_note_event`

All types are additive. They must not hard-delete source events and must not silently edit source employee events.

## 5. Financial Effect Schema

Required schema:

```json
{
  "financial_effect": {
    "cash_delta": 0,
    "bank_delta": 0,
    "gross_delta": 0,
    "rent_income_delta": 0,
    "deposit_liability_delta": 0,
    "arrears_repaid_delta": 0,
    "arrears_open_delta": 0,
    "expense_delta": 0,
    "transfer_fee_delta": 0
  }
}
```

Rules:

- Duplicate rent void: `rent_income_delta` negative, matching `cash_delta` or `bank_delta` negative, and `gross_delta` negative.
- Duplicate deposit void: `deposit_liability_delta` negative, matching `cash_delta` or `bank_delta` negative, and `gross_delta` negative.
- Repayment reversal: `arrears_repaid_delta` negative and `arrears_open_delta` positive.
- Arrears waiver: `arrears_open_delta` negative, no `cash_delta`, no `bank_delta`, no `gross_delta`.
- Deposit offset to arrears: `deposit_liability_delta` negative and `arrears_open_delta` negative, no cash income.

Financial effect must be numeric and explicit. The runtime must not infer correction amount from text.

## 6. Projection Effect Schema

Required schema:

```json
{
  "projection_effect": {
    "affects_owner_finance": true,
    "affects_arrears_state": false,
    "affects_deposit_state": false,
    "affects_occupancy_state": false,
    "affects_checkout_eligibility": false,
    "affects_access_network_future": false
  }
}
```

First no-migration implementation may adjust only owner detail and owner summary projection.

Future phases may update durable projections for:

- arrears state
- deposit state
- occupancy state
- checkout eligibility
- access/network preview state

Correction anchors must declare which projections they affect. Projection code must not guess based only on event text.

## 7. Owner Parser Strategy

Owner History parser must support correction anchors without mutating source sessions.

Rules:

- Original sessions still display original events.
- Correction sessions display correction anchors.
- Owner summary can show original total, correction total, and adjusted total.
- Correction-adjusted totals must be derived additively.
- Parser must not remove original lines.
- Parser must not silently mutate source session.
- Parser must link each correction event to `original_event_id`.
- If `original_event_id` cannot be found, the correction is invalid or unresolved.

Parser modes:

### A. Raw Mode

Show original session facts only.

No correction effects are applied.

### B. Adjusted Mode

Show correction-adjusted totals by applying active correction anchors additively to original sessions.

### C. Audit Mode

Show original events, correction events, and adjusted totals together.

Audit mode is the required mode for owner review and correction troubleshooting.

## 8. x6wio Example

Production incident reference only. Do not apply this correction now.

Original session:

- `EMPV3-20260707-abdul-w1ofc`
- `#334 rent 700`
- `#134 rent 770`

Duplicate later session:

- `EMPV3-20260707-abdul-x6wio`
- `#334 arrears_payment 80`
- duplicate `#334 rent 700`
- duplicate `#134 rent 770`

If `80 AED` arrears payment was real, later correction session would include:

```json
{
  "anchor_contract_version": "owner_correction_anchor_v1",
  "correction_type": "duplicate_upload_correction",
  "target_session_anchor": "EMPV3-20260707-abdul-x6wio",
  "correction_events": [
    {
      "correction_event_type": "void_duplicate_event",
      "original_event_id": "x6wio-duplicate-334-rent-event-id",
      "original_session_id": "S20260707-x6wio",
      "original_anchor": "EMPV3-20260707-abdul-x6wio",
      "affected_bed": "334",
      "affected_event_type": "rent",
      "financial_effect": {
        "cash_delta": -700,
        "bank_delta": 0,
        "gross_delta": -700,
        "rent_income_delta": -700,
        "deposit_liability_delta": 0,
        "arrears_repaid_delta": 0,
        "arrears_open_delta": 0,
        "expense_delta": 0,
        "transfer_fee_delta": 0
      }
    },
    {
      "correction_event_type": "void_duplicate_event",
      "original_event_id": "x6wio-duplicate-134-rent-event-id",
      "original_session_id": "S20260707-x6wio",
      "original_anchor": "EMPV3-20260707-abdul-x6wio",
      "affected_bed": "134",
      "affected_event_type": "rent",
      "financial_effect": {
        "cash_delta": -770,
        "bank_delta": 0,
        "gross_delta": -770,
        "rent_income_delta": -770,
        "deposit_liability_delta": 0,
        "arrears_repaid_delta": 0,
        "arrears_open_delta": 0,
        "expense_delta": 0,
        "transfer_fee_delta": 0
      }
    }
  ]
}
```

Total correction:

- `cash_delta = -1470`
- `gross_delta = -1470`
- `rent_income_delta = -1470`

Adjusted x6wio total:

- `1550 - 1470 = 80`

Keep:

- `#334 arrears_payment 80`

Do not touch:

- `EMPV3-20260707-abdul-w1ofc`

If `80 AED` was not real, the alternative plan is:

- void entire x6wio session through correction anchors
- create `repayment_reversal_event`
- restore arrears remaining `80`
- preserve original x6wio source facts

## 9. Safety Validation Rules

Before applying any correction, runtime implementation must validate:

- `original_event_id` exists
- original session exists
- original event is not already voided by another active correction
- `financial_effect` matches original event amount where applicable
- correction reason is present
- `authorized_by` is present
- correction does not use `card_id`, `tenant_card_id`, hardware card id, provider phone, access-card metadata phone, or `99099` phone identity
- correction does not hard-delete
- correction does not silently mutate original
- correction does not create negative impossible deposit state unless owner override is explicit
- correction does not create negative impossible arrears state unless owner override is explicit

Unresolved corrections must remain `pending` or `rejected`; they must not be applied.

## 10. Owner Approval Workflow

Workflow states:

- `draft`
- `reviewed`
- `approved`
- `applied`
- `reversed`
- `voided`

Roles:

- owner can create and apply
- admin may draft
- employee may request only and cannot apply

Required before apply:

- reason
- evidence summary
- preview adjusted total
- confirmation before apply
- authorized owner identity
- audit note

Applying a correction is a controlled production write in a future implementation. This planning step performs no write.

## 11. No-Go Conditions

Implementation must stop if:

- no unique `original_event_id`
- correction requires hard delete
- correction requires direct edit of original event
- parser cannot apply additive correction
- adjusted totals cannot be reconciled
- correction requires migration but task forbids migration
- correction depends on `card_id`, `tenant_card_id`, hardware card id, provider phone, access-card metadata phone, or `99099` phone identity
- correction would break owner parser
- correction would alter existing source facts
- double correction cannot be detected
- owner approval cannot be audited

## 12. Future Implementation Phases

Phase H1:

- Correction anchor parser only, with fixtures.
- No production writes.
- No adjusted totals applied to production UI yet.

Phase H2:

- Owner correction draft/preview API, no write.
- Preview original total, correction total, and adjusted total.

Phase H3:

- Owner correction write using existing sessions/export_text, no migration.
- Owner-only controlled production write.

Phase H4:

- Owner adjusted summary display.
- Raw/adjusted/audit modes available.

Phase H5:

- Correction reversal.
- Reversal is additive and auditable.

Phase H6:

- Future durable `correction_events` table migration if no-migration anchors are insufficient.

## 13. Required Tests for Future Runtime

Future runtime implementation must add targeted tests:

- parse correction anchor
- apply duplicate rent void
- x6wio fixture adjusted from `1550` to `80`
- original w1ofc unchanged
- original event remains visible
- adjusted total correct
- no hard delete
- no `card_id`, `tenant_card_id`, provider phone, access-card metadata phone, or `99099` identity
- old sessions without corrections still parse
- correction with missing `original_event_id` rejected
- double correction rejected
- repayment reversal restores arrears
- waiver does not create cash income
- deposit adjustment affects liability
- bed transfer correction preserves from/to audit
- parser raw mode shows original only
- parser adjusted mode applies corrections additively
- parser audit mode shows original plus correction plus adjusted total

## 14. Recommended Next Step

Recommended next implementation step:

`STEP H1: Implement correction anchor parser only with fixtures, no writes and no owner UI changes.`

Go/no-go recommendation:

`GO_TO_H1_CORRECTION_PARSER_IMPLEMENTATION`

This is a go for parser-only implementation, not for correction writes or x6wio production correction.

Runtime behavior changed in this step: no.

Production data changed in this step: no.

Migration in this step: no.

Deploy in this step: no.
