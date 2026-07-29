# Homelink Information Anchor Contract V1

## 1. Purpose

Homelink must treat business information as anchored facts, not as page-local display text or ad hoc parser output.

The system has two foundational information sources:

1. Access Card Remark Snapshot
2. Employee 7 Event Anchors

These feed the system in this order:

Access Card Remark Snapshot + Employee 7 Event Anchors
-> Canonical Event Store
-> State Projections
-> Owner / Employee / Arrears / Deposit / Checkout / Access / Network / WhatsApp

Rules:

- UI pages must not invent independent business logic from raw text.
- WhatsApp readable text must not be treated as machine truth.
- Provider metadata must not become business identity.
- Every future implementation must preserve the information anchors defined here.

## 2. Non-authoritative Provider Metadata

The following fields are deprecated as business references:

- card_id
- tenant_card_id
- physical card id
- hardware card id
- access-card provider phone
- repeated owner/admin phone ending 99099
- any phone from access-card metadata unless explicitly staff-entered

These fields must not be used for:

- customer identity
- bed identity
- arrears identity
- refund identity
- checkout identity
- access-control identity
- network identity
- customer credit identity
- business matching key

Allowed use:

- raw audit metadata only
- display context only when clearly labeled non-authoritative
- forensic trace only

Provider phone, including repeated phone values ending 99099, is not customer phone. Customer phone must come from a staff-entered customer profile or a staff-entered event field.

## 3. Source Authority Matrix

| Business Field | Authoritative Source | Context Source | Forbidden Source |
|---|---|---|---|
| bed | access remark + employee event | history | card_id |
| rent paid amount | employee event | owner review | access card |
| deposit balance | employee event ledger | access remark as context only | card_id |
| access valid-until | access remark / access validity snapshot | rent period as comparison only | phone |
| arrears balance | employee event + arrears projection | owner correction | access remark |
| customer phone | staff-entered customer profile only | none | access-card phone / 99099 |
| occupancy identity | occupancy_session_id | bed history | card_id / phone |
| duplicate identity | canonical_fingerprint | event_id/source_fingerprint | UI status only |

Additional authority rules:

- Access remark can provide bed context and access-card context, but it cannot create financial truth by itself.
- Employee event anchors create financial and operational facts only after server validation.
- Owner correction events can override or void derived state, but they must link back to the original event.
- History text and export text are context; they are not primary machine truth.

## 4. Access Card Remark Snapshot DTO

Required fields:

- access_snapshot_id
- property_id
- bed
- raw_remark
- parsed_deposit_amount
- parsed_checkin_mmdd
- parsed_valid_until_mmdd / expiry_mmdd if available
- parsed_business_note
- parse_status
- synced_at
- source = access_card_remark
- raw_provider_metadata optional
- non_authoritative_card_id optional
- non_authoritative_provider_phone optional

Allowed parse_status values:

- parsed
- partial
- unparsed
- invalid
- unavailable

Rules:

- Access remark snapshot is context.
- Access remark snapshot is not deposit ledger authority.
- Card ID is not business identity.
- Provider phone is not customer phone.
- Raw provider metadata is retained only for audit and forensic tracing.
- Parsed deposit text from access remark can create a review prompt, not a settled ledger balance.

## 5. Occupancy Session Contract

occupancy_session_id means a stable business lifecycle for one tenant or occupancy relationship.

It continues across:

- card replacement
- bed transfer
- arrears
- deposit movement
- checkout
- left with arrears
- future network/access permission

Rules:

- Bed is a location.
- occupancy_session_id is the business relationship.
- card_id is not identity.
- provider phone is not identity.
- bed alone is not enough for old/new tenant separation.
- A bed transfer migrates occupancy_session_id from from_bed to to_bed.
- A left-with-arrears case keeps the former occupancy_session_id independent from the next occupant of the same bed.

## 6. Canonical Event Common Fields

Every employee event should include or be able to derive:

- event_id
- session_id
- upload_batch_id
- event_type
- property_id
- staff_userid
- business_date / event_time
- created_at
- synced_at
- effective_from
- effective_until
- bed / from_bed / to_bed
- occupancy_session_id
- access_snapshot_before
- access_snapshot_after or intended_access_after when relevant
- payment_method if financial
- amount fields if financial
- note
- source_fingerprint
- canonical_fingerprint
- server_validated_at
- status
- void/correction/reversal linkage

Rules:

- event_id identifies one event record.
- upload_batch_id identifies one uploaded session attempt.
- source_fingerprint identifies the original client-submitted source shape.
- canonical_fingerprint identifies the normalized business meaning.
- canonical_fingerprint must not include UI status labels.
- server_validated_at records when the backend accepted the event.

## 7. Time Model

Required distinctions:

- business_date / event_time
- created_at
- synced_at
- effective_from
- effective_until
- rent_period_start
- rent_period_end
- access_valid_until

Rules:

- These timestamps must not be collapsed into one timestamp.
- business_date / event_time describes the business event time.
- created_at describes when the event was created in the employee UI or server.
- synced_at describes when the event became server-visible.
- effective_from and effective_until describe when state changes apply.
- rent_period_start and rent_period_end describe rental coverage.
- access_valid_until describes access-card validity and is not proof of rent payment.

## 8. Duplicate / Idempotency Rules

Required fields:

- event_id
- source_fingerprint
- canonical_fingerprint
- upload_batch_id
- dedupe_status

Rules:

- Synced records must not enter frontend upload payload.
- Backend must reject or idempotently return an existing record if event_id already exists.
- Backend must reject or idempotently return an existing record if source_fingerprint already exists.
- Backend must reject or idempotently return an existing record if canonical_fingerprint already exists.
- Backend cannot rely only on frontend guard.
- UI status only is not duplicate identity.
- Same bed / same amount / same time repeated upload must be screened before creating duplicate business facts.

Allowed dedupe_status values:

- unique
- duplicate_event_id
- duplicate_source_fingerprint
- duplicate_canonical_fingerprint
- idempotent_replay
- rejected_duplicate
- needs_owner_review

## 9. Immutable Event + Correction / Void / Reversal

Original canonical events are immutable.

Correction model:

- void_event
- correction_event
- reversal_event
- owner_correction_event
- reason
- authorized_by
- corrected_at
- link to original_event_id

Rules:

- A wrong original event must not be silently edited.
- A correction must create a new linked event.
- A void must preserve the original event for audit.
- A reversal must record the financial and operational reversal.
- Owner correction events require authorized_by and reason.

Use cases:

- duplicate upload
- wrong amount
- wrong refund
- arrears waiver
- deposit adjustment
- wrong repayment
- imported history correction

## 10. State Projections

Required projections:

- current_bed_state
- current_occupancy_state
- deposit_balance_state
- arrears_state
- access_validity_state
- cash_bank_balance_state
- network_access_state

Rules:

- Projections are derived from canonical event anchors.
- UI pages should not invent independent calculations.
- Projection rebuild must be possible from canonical events plus access-card snapshots.
- Projection rows are read models, not original truth.
- A projection can be stale or failed without mutating canonical events.

## 11. Anomaly Screening

Required anomaly model:

- risk_code
- risk_level
- confidence_score
- suggested_action
- source_event_ids
- detected_at

Risk levels:

- info
- warning
- blocking
- owner_review
- critical

Required examples:

- same bed has two active occupancy sessions
- same occupancy active in two beds without bed_transfer
- card remark deposit D200 but system deposit balance 0
- access expiry earlier than rent coverage end
- arrears payment exceeds remaining
- deposit refund while arrears open
- bed transfer to occupied bed
- duplicate event_id
- duplicate canonical_fingerprint
- same bed / same amount / same time repeated upload
- 200+ cards sharing provider phone ending 99099
- card_id used as customer identity
- access-card phone used as tenant phone

Rules:

- Anomaly screening must not silently rewrite canonical events.
- Blocking anomalies must be visible before upload or before owner approval.
- Owner review anomalies must produce a reviewable item with source_event_ids.

## 12. 7 Employee Event Anchor Contracts

The employee Entry system has seven event templates. Checkout has two modes, so this contract lists normal checkout and left with arrears separately.

### A. Rent

Required fields:

- event_id
- session_id
- upload_batch_id
- event_type = rent
- property_id
- staff_userid
- business_date / event_time
- created_at
- synced_at
- bed
- occupancy_session_id
- access_snapshot_before
- access_snapshot_after or intended_access_after when relevant
- expected_rent
- paid_amount
- payment_method
- rent_period_start
- rent_period_end
- deposit_included_amount if any
- short_paid
- arrears_amount
- arrears_due_date if short_paid
- arrears_note if short_paid
- arrears_status if short_paid
- note
- source_fingerprint
- canonical_fingerprint
- server_validated_at
- status

Rules:

- If expected_rent > paid_amount, short_paid must be true.
- short_paid must create or link an arrears anchor after server validation.
- Rent cannot settle an existing arrears item unless an explicit arrears_payment event exists.

### B. Arrears Payment

Required fields:

- event_id
- session_id
- upload_batch_id
- event_type = arrears_payment
- property_id
- staff_userid
- business_date / event_time
- created_at
- synced_at
- bed
- occupancy_session_id
- arrears_ref / original_arrears_id
- original_arrears_amount
- already_paid_amount
- payment_amount
- remaining_arrears
- settlement_status
- payment_method
- note
- source_fingerprint
- canonical_fingerprint
- server_validated_at
- status

Rules:

- Arrears Payment must select exact arrears_ref, not repay by bed only.
- Arrears Payment is not tied to rent period.
- Repayment can only settle the selected arrears_ref.
- If payment_amount exceeds remaining_arrears, create a blocking anomaly.

### C. Deposit In

Required fields:

- event_id
- session_id
- upload_batch_id
- event_type = deposit_in
- property_id
- staff_userid
- business_date / event_time
- created_at
- synced_at
- bed
- occupancy_session_id
- deposit_amount
- payment_method
- linked_tenant / bed
- note
- source_fingerprint
- canonical_fingerprint
- server_validated_at
- status

Rules:

- Deposit In changes deposit_balance_state only through the canonical event.
- Access remark deposit text is context only and cannot create deposit balance by itself.

### D. Deposit Out

Required fields:

- event_id
- session_id
- upload_batch_id
- event_type = deposit_out
- property_id
- staff_userid
- business_date / event_time
- created_at
- synced_at
- bed
- occupancy_session_id
- deposit_balance_before
- refund_amount
- payment_method
- refund_date
- refund_reason
- difference_reason if refund_amount differs from deposit_balance_before
- outstanding_arrears
- owner_approval_required
- owner_approval_status
- note
- source_fingerprint
- canonical_fingerprint
- server_validated_at
- status

Rules:

- Open arrears block normal refund.
- Refund cannot exceed deposit balance without explicit owner approval.
- Offset to arrears must create explicit offset anchor.
- Difference between deposit balance and refund amount requires difference_reason.

### E. Checkout Normal

Required fields:

- event_id
- session_id
- upload_batch_id
- event_type = checkout
- checkout_mode = normal
- property_id
- staff_userid
- business_date / event_time
- created_at
- synced_at
- bed
- occupancy_session_id
- checkout_date
- deposit_balance_before
- deposit_refund
- outstanding_arrears
- owner_approval_required
- owner_approval_status
- final_note
- access_snapshot_before
- intended_access_after
- source_fingerprint
- canonical_fingerprint
- server_validated_at
- status

Rules:

- Normal Checkout cannot proceed with open or partial arrears unless owner approval exists.
- Checkout closes or changes occupancy_session_id state; it must not use card_id as customer identity.

### F. Left With Arrears

Required fields:

- event_id
- session_id
- upload_batch_id
- event_type = checkout
- checkout_mode = left_with_arrears
- property_id
- staff_userid
- business_date / event_time
- created_at
- synced_at
- bed
- occupancy_session_id
- former_customer_name / card_name
- whatsapp_phone or approved alternate contact
- left_date / customer_left_date
- confirmed_not_returning_date if abandoned_confirmed
- promised_payment_date
- promised_return_date if known
- arrears_amount
- cloud_arrears_ref
- deposit_balance
- belongings_held
- belongings_note if belongings_held = yes
- note
- customer_left
- left_status / final_status
- access_snapshot_before
- intended_access_after
- source_fingerprint
- canonical_fingerprint
- server_validated_at
- status

Rules:

- Left With Arrears preserves the former occupancy_session_id separately from future occupants of the same bed.
- Cloud arrears remains open or partial until repaid, waived, corrected, or voided.
- WhatsApp phone must be staff-entered; access-card provider phone is forbidden.

### G. Expense

Required fields:

- event_id
- session_id
- upload_batch_id
- event_type = expense
- property_id
- staff_userid
- business_date / event_time
- created_at
- synced_at
- target_bed / room if applicable
- expense_amount
- expense_category
- reason
- payment_method
- note
- source_fingerprint
- canonical_fingerprint
- server_validated_at
- status

Rules:

- Expense does not create rent income.
- Expense must not use access-card metadata as business identity.

### H. Bed Transfer

Required fields:

- event_id
- session_id
- upload_batch_id
- event_type = bed_transfer
- property_id
- staff_userid
- business_date / event_time
- created_at
- synced_at
- from_bed
- to_bed
- occupancy_session_id
- transfer_date
- fee_amount
- fee_status
- waiver_reason if fee_status = waived
- transfer_reason
- old_tenant_context
- old_access_snapshot_before
- intended_access_after
- note
- source_fingerprint
- canonical_fingerprint
- server_validated_at
- status

Rules:

- Bed Transfer is occupancy_session migration, not just from_bed -> to_bed.
- Transfer must preserve old context for audit.
- Transfer to an occupied bed must create anomaly screening.
- Fee waiver requires waiver_reason.

## 13. Ledger / Compiler Positioning

Definitions:

- structured transactions rows = machine truth
- HOMELINK LEDGER = full audit snapshot
- WhatsApp readable view = runtime presentation compiler output

Rules:

- WhatsApp readable output is not source of truth.
- Owner detail display may render WhatsApp-readable text, but machine analysis must read structured canonical events.
- The compiler must be a presentation layer over canonical events.
- The ledger must preserve full audit state, including original event, correction, void, reversal, projection source, and anomaly links.

