# Owner Correction / Void / Reversal Plan V1

Date: 2026-07-08

Status: planning only. No runtime implementation. No migration. No production data changes. No deploy required.

## 1. Purpose

This document defines a formal Owner Correction / Void / Reversal system for Homelink employee and owner finance events.

Direct production edits are unsafe because they silently rewrite the historical fact layer, make owner history inconsistent, break auditability, and can desynchronize finance totals, arrears, deposits, checkout state, and occupancy projections.

Original uploaded employee events must be immutable.

Corrections must be represented as new additive owner/system events that link to the original event. The original event remains visible as the source fact, and projections calculate the corrected business view from original events plus correction events.

The system must avoid direct database edits for business correction. Any later production correction must be traceable, authorized, reversible, and backed by an explicit correction event.

## 2. Correction Event Types

The correction model supports these event types:

- `void_event`: marks a specific original event as void for projection purposes without deleting it.
- `reversal_event`: reverses a previous event or correction where money, arrears, deposit, or state effects must be undone.
- `correction_event`: generic correction anchor for an event-specific adjustment.
- `owner_adjustment_event`: owner-authorized adjustment when the correction is not a simple void or reversal.
- `arrears_waiver_event`: records owner-authorized waiver of remaining arrears without cash income.
- `deposit_adjustment_event`: adjusts deposit liability or deposit balance.
- `repayment_reversal_event`: reverses a wrong arrears repayment and restores arrears remaining.
- `duplicate_upload_correction_event`: corrects duplicate records from a later upload while preserving legitimate records.
- `dispute_marker_event`: marks an event, arrears, deposit, or session as disputed without changing totals until resolved.

All correction events are additive. None of these event types may hard-delete or silently overwrite the original event.

## 3. Common Correction Fields

Every correction event must include:

- `correction_event_id`
- `correction_type`
- `original_event_id`
- `original_session_id`
- `original_anchor`
- `affected_bed`
- `affected_occupancy_candidate_id`, if available
- `affected_arrears_ref`, if applicable
- `affected_deposit_ref`, if applicable
- `correction_reason`
- `authorized_by`
- `authorized_role`
- `created_at`
- `effective_date`
- `financial_effect`
- `projection_effect`
- `audit_note`
- `evidence_summary`
- `status = pending / applied / rejected / reversed / voided`

No correction may be applied without `original_event_id`, `original_session_id`, and `original_anchor` unless the owner explicitly creates a dispute-only marker that has no financial effect.

## 4. Financial Effect Model

Correction events must encode explicit money impacts. Projections must not infer correction amounts from free text.

### A. Duplicate Rent Void

Original duplicate:

- `rent +700`

Correction:

- `rent_adjustment = -700`
- `cash_adjustment = -700` or `bank_adjustment = -700`, matching the original payment method
- `gross_adjustment = -700`
- no change to the original event row

### B. Duplicate Deposit Void

Original duplicate:

- `deposit +200`

Correction:

- `deposit_liability_adjustment = -200`
- `cash_adjustment = -200` or `bank_adjustment = -200`, matching original receipt method
- no rent income adjustment

### C. Wrong Arrears Payment Reversal

Original:

- `arrears_payment +80`
- `remaining_arrears = 0`

Correction:

- `cash_adjustment = -80` or `bank_adjustment = -80`
- `arrears_remaining_adjustment = +80`
- original arrears status recalculates from correction-adjusted ledger

### D. Arrears Waiver

Waiver means no cash received.

Correction:

- `arrears_remaining_adjustment = -waiver_amount`
- `waiver_amount = waiver_amount`
- `cash_adjustment = 0`
- `bank_adjustment = 0`
- waiver must be reported separately from cash income

### E. Deposit Offset to Arrears

Deposit offset means deposit liability is used to reduce arrears.

Correction:

- `deposit_liability_adjustment = -offset_amount`
- `arrears_remaining_adjustment = -offset_amount`
- `cash_adjustment = 0`
- `bank_adjustment = 0`
- no rent income is created unless actual cash was received

## 5. Projection Effect Model

Correction events must define projection effects for:

- owner finance summary
- cash total
- bank total
- gross received
- rent income
- deposit liability
- arrears_state
- deposit_balance_state
- occupancy_state
- checkout eligibility
- owner history detail
- employee history audit

Owner projections must calculate:

- original facts
- minus voided or reversed financial effects
- plus owner adjustment effects
- plus separately reported waiver and dispute states

Employee history audit must keep original employee uploads visible. Owner history can show correction-adjusted totals, but the detail view must expose both the original event and the correction event.

## 6. Duplicate Upload Correction Model

The known x6wio incident is the reference example for future implementation planning only. Do not apply this correction in this planning step.

Original session:

- `EMPV3-20260707-abdul-w1ofc`
- contained `#334 rent 700`
- contained `#134 rent 770`

Later session:

- `EMPV3-20260707-abdul-x6wio`
- contained `#334 arrears_payment 80`
- contained duplicate `#334 rent 700`
- contained duplicate `#134 rent 770`

Duplicate overcount:

- `700 + 770 = 1470 AED`

If the `80 AED` arrears payment was real, correct strategy later:

- keep `#334 arrears_payment 80`
- create `duplicate_upload_correction_event` to void duplicate `#334 rent 700` inside x6wio
- create `duplicate_upload_correction_event` to void duplicate `#134 rent 770` inside x6wio
- reduce x6wio correction-adjusted total from `1550` to `80`
- do not touch original w1ofc session
- keep arrears task settled if the `80 AED` payment was real

If the `80 AED` arrears payment was not real, correct strategy later:

- void the entire x6wio session through additive correction events
- create `repayment_reversal_event` for `#334 arrears_payment 80`
- restore arrears remaining by `80`
- mark repayment as reversed
- preserve original x6wio upload facts for audit

No x6wio production correction is applied in this step.

## 7. Owner Approval Workflow

Only owner-authorized users may apply correction events that affect money, arrears, deposits, checkout, occupancy, or bed transfer state.

Employees may request correction review, but employees must not directly apply financial corrections.

Workflow:

- employee or owner identifies issue
- correction draft is created with mandatory reason
- original event is selected by `original_event_id`, `original_session_id`, and `original_anchor`
- optional attachment/proof or evidence summary is added
- owner reviews financial and projection effects
- owner approves or rejects
- approved correction becomes `applied`
- rejected correction remains audit-only
- any correction can later be reversed by a new `reversal_event`

Mandatory approval fields:

- `authorized_by`
- `authorized_role`
- `correction_reason`
- `evidence_summary`
- `effective_date`

Rollback of a correction must also be additive. A correction is not deleted; it is reversed or voided by another correction event.

## 8. Correction Safety Rules

Required safety rules:

- no correction without `original_event_id`
- no silent overwrite
- no hard delete
- no direct production mutation without correction event
- no correction based only on bed if multiple events match
- no correction that uses `card_id`, `tenant_card_id`, hardware card id, provider phone, access-card metadata phone, or `99099` phone as identity
- no correction that changes historical source facts
- correction must be additive and auditable
- no financial correction without explicit `financial_effect`
- no projection correction without explicit `projection_effect`
- no event-state correction without owner authorization

## 9. Event-Specific Correction Rules

### A. Rent

Rent correction may:

- void duplicate rent
- correct wrong paid amount by additive adjustment
- correct wrong expected rent by additive adjustment
- correct short-paid arrears creation if the original short-paid anchor was wrong
- mark disputed rent

Rent correction must not silently rewrite the original rent anchor.

### B. Arrears Payment

Arrears Payment correction may:

- reverse wrong repayment
- move repayment to the correct `arrears_ref` only through explicit reversal plus new corrected repayment
- restore remaining arrears
- mark repayment disputed

Arrears Payment correction must never settle by bed only. It must reference `affected_arrears_ref`.

### C. Deposit In

Deposit In correction may:

- void duplicate deposit receipt
- correct wrong deposit amount
- mark deposit disputed
- adjust deposit liability

Deposit In correction must not create rent income.

### D. Deposit Out

Deposit Out correction may:

- reverse wrong refund
- correct actual refund amount
- add missing difference reason through a correction note
- restore deposit liability
- mark refund disputed

Deposit Out correction requires owner approval.

### E. Checkout

Checkout correction may:

- void wrong checkout
- reverse checkout state if customer did not leave
- add owner approval record if checkout was blocked by arrears
- mark checkout disputed

Checkout correction must preserve original checkout attempt.

### F. Left With Arrears

Left With Arrears correction may:

- correct promised payment date
- correct belongings note
- correct contact evidence
- mark customer returned
- mark abandoned only by owner confirmation

Left With Arrears correction must not clear Cloud Arrears unless arrears are paid, waived, or offset by an authorized correction.

### G. Expense

Expense correction may:

- void duplicate expense
- correct expense amount
- correct category or target bed
- mark expense disputed

Expense correction must not alter rent income or deposit liability unless an explicit owner adjustment event does so.

### H. Bed Transfer

Bed Transfer correction is high-risk and requires owner approval. See Section 10.

## 10. Bed Transfer Correction

Bed Transfer correction must support:

- reverse transfer fee
- reverse occupancy movement if needed
- restore old bed expected state
- restore new bed expected state
- restore deposit movement
- restore rent coverage movement
- restore arrears movement
- restore access/network preview state later
- mark transfer disputed

Bed Transfer correction must reference:

- original transfer event
- from_bed
- to_bed
- original transfer fee
- original fee status
- correction financial effect
- correction projection effect

No bed transfer correction may be applied using bed numbers alone if multiple transfer events match.

## 11. Arrears Correction

Arrears correction must support:

- void short-paid arrears
- adjust remaining arrears
- reverse repayment
- waive arrears
- mark disputed arrears
- restore arrears after wrong settlement
- offset arrears against deposit by owner approval

Rules:

- never settle by bed only
- always reference `affected_arrears_ref`
- waiver does not create cash income
- repayment reversal restores remaining arrears
- disputed arrears remain visible until resolved

## 12. Deposit Correction

Deposit correction must support:

- adjust deposit balance
- reverse wrong deposit in
- reverse wrong deposit out
- offset deposit to arrears
- mark deposit disputed
- restore deposit liability after wrong refund

Rules:

- owner override required
- access card remark such as `D200` is context only, not authority
- deposit correction must reference `affected_deposit_ref` when available
- deposit offset to arrears must not create cash income

## 13. Correction Storage Strategy

### A. Existing Sessions / Export Text Anchor Block

First no-migration option:

- store correction anchor events in an owner/system ledger session
- include correction anchors inside the existing export text anchor block
- keep original employee session immutable
- let owner projections read original events plus correction anchors

This is the safest first implementation only if the owner parser can read correction anchors without breaking legacy sessions.

### B. Existing Transaction Rows

Possible only if existing transaction rows can safely represent correction rows without ambiguity.

Risks:

- correction rows may be confused with real cash movement
- old summaries may count them incorrectly
- transaction schemas may lack correction-specific fields

Do not use as the first strategy unless tests prove owner totals and history remain correct.

### C. Future `correction_events` Table

Future migration option:

- durable correction_events table
- indexed by original event/session/anchor
- explicit status workflow
- audit fields
- approval fields
- projection effects

This requires a separate migration design and must not be done in a no-migration task.

Recommended staged approach:

1. Plan and test correction anchor contract.
2. Implement correction anchor parsing without applying projections.
3. Implement no-migration owner/system ledger correction anchors if safe.
4. Add projection support behind tests.
5. Later design `correction_events` table if needed.

## 14. No-Go Conditions

Implementation must stop if:

- correction requires hard delete
- original event cannot be uniquely identified
- correction would silently alter original event
- correction would break owner parser
- correction would break financial totals
- correction requires `card_id`, `tenant_card_id`, hardware card id, provider phone, access-card metadata phone, or `99099` phone identity
- correction requires migration but task forbids migration
- arrears projection cannot be safely updated
- deposit projection cannot be safely updated
- bed transfer state cannot be safely reversed
- owner approval workflow cannot be audited

## 15. Required Future Tests

Future implementation must add tests proving:

- duplicate rent void reduces totals
- original event remains immutable
- correction links to `original_event_id`
- wrong repayment reversal restores arrears
- arrears waiver does not create cash income
- deposit adjustment affects liability, not rent income
- bed transfer reversal preserves from/to states
- owner parser displays original plus correction
- owner summary uses correction-adjusted totals
- old sessions without correction still parse
- no `card_id`, `tenant_card_id`, hardware card id, provider phone, access-card metadata phone, or `99099` identity usage
- no hard delete
- no silent overwrite
- no correction without owner authorization

## 16. Recommended Next Step

Recommended next planning step:

`STEP 2H IMPLEMENTATION PLAN: Define correction anchor contract and no-migration parser strategy before runtime correction writes.`

Go/no-go recommendation:

`GO_TO_OWNER_CORRECTION_IMPLEMENTATION_PLAN`

This is a go for an implementation plan only, not for production correction runtime behavior.

Runtime behavior changed in this step: no.

Production data changed in this step: no.

Migration in this step: no.

Deploy in this step: no.
