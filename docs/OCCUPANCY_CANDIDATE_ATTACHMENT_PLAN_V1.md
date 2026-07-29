# Occupancy Candidate Attachment Plan V1

Date: 2026-07-08

Status: planning only. No runtime implementation. No migration. No production data changes. No deploy required.

## 1. Purpose

`occupancy_candidate_id` is introduced before durable `occupancy_session_id` so new employee events can start carrying a safe transitional stay identity without breaking current production matching.

Purpose:

- prepare the system to stop depending on bed-only identity
- prepare the system to stop depending on `tenant_card_id`
- prepare the system to stop depending on `card_id`
- prepare the system to stop depending on provider phone or `99099` phone
- group new events that likely belong to the same customer-stay lifecycle
- support future bed transfer, checkout, deposit, and arrears continuity
- support future durable `occupancy_session_id` migration

`occupancy_candidate_id` is transitional and runtime-oriented.

It is not the final durable `occupancy_session_id`.

## 2. Scope

This plan applies to new events only.

This step does not:

- implement runtime `occupancy_candidate_id`
- perform historical backfill
- add database migration
- replace `tenant_card_id` matching
- change employee upload
- change owner UI
- change employee UI
- change arrears projection
- change access card integration
- change production behavior

Current legacy `tenant_card_id` paths remain until a durable occupancy model is implemented and verified.

## 3. Candidate ID Source Rules

Allowed inputs:

- `property_id` / `corpid`
- bed
- event_type
- business_date
- rent_period_start
- rent_period_end
- Access Snapshot context
- deposit event
- rent event
- checkout status
- bed transfer `from_bed`
- bed transfer `to_bed`
- `arrears_ref`
- `original_event_id`
- staff-entered customer phone only if explicitly provided
- owner correction later

Forbidden inputs:

- `card_id`
- `tenant_card_id`
- hardware card id
- provider phone
- card metadata phone
- `99099` phone
- access-card provider phone
- any provider metadata phone

If a candidate cannot be generated without forbidden inputs, generation must stop and mark the event as unresolved.

## 4. Candidate ID Generation Strategy

Proposed deterministic format for future implementation:

`occ_candidate:<property_id>:<bed_or_transfer_root>:<first_known_checkin_or_business_date>:<server_sequence_or_event_id>`

Candidate components:

- `property_id`: tenant/property namespace
- `bed_or_transfer_root`: initial bed or stable previous candidate root
- `first_known_checkin_or_business_date`: check-in date, check-in mmdd with year resolved by business rules, or first event business date
- `server_sequence_or_event_id`: server-generated sequence or first authoritative event id

Collision risk discussion:

- same bed old/new tenant: candidate must use checkout boundary and first event date, not bed alone.
- bed transfer: candidate must preserve the same candidate and update bed state, not create a new candidate.
- checkout boundary: normal checkout closes candidate; later same bed creates a new candidate.
- left_with_arrears boundary: old candidate remains financially open while bed can become available for a new candidate.
- card replacement: does not change candidate.
- access snapshot changes: may update context, but does not create a new candidate by itself.

Do not finalize a formula that cannot distinguish old/new tenants on the same bed.

Do not use provider metadata to reduce collision risk.

## 5. Event-by-Event Attachment Rules

### A. Rent

Rules:

- If active candidate exists for bed, continue it.
- If no active candidate exists and rent looks like a new customer, create candidate.
- Rent renewal continues candidate.
- Short-paid rent creates arrears linked to the same candidate.
- Multi-month advance continues same candidate.
- Do not use `card_id`.
- Do not use `tenant_card_id`.
- Do not use provider phone.

Candidate status:

- `candidate_created` for first rent with no active candidate.
- `candidate_continued` for renewal or existing stay.

### B. Arrears Payment

Rules:

- Must inherit candidate from selected `arrears_ref` / `original_event_id`.
- Must not derive candidate by bed only.
- If `arrears_ref` has no candidate, mark `occupancy_candidate_status = candidate_unresolved`.
- Do not create new candidate just because payment happened.

Candidate status:

- `candidate_continued` if inherited.
- `candidate_unresolved` if source arrears has no candidate.

### C. Deposit In

Rules:

- `deposit_reason = new` may create a new candidate.
- `deposit_reason = balance` or `additional` continues active candidate.
- Deposit belongs to candidate.
- Access remark deposit is context only.
- Do not use provider card id as deposit identity.

Candidate status:

- `candidate_created` for new customer deposit.
- `candidate_continued` for balance or additional deposit.

### D. Deposit Out

Rules:

- Must link to current candidate for bed.
- Must later check deposit balance against the same candidate.
- If open arrears exists for the same candidate, refund should be blocked later.
- No candidate found = anomaly / unresolved.

Candidate status:

- `candidate_continued` when linked.
- `candidate_unresolved` when no active candidate exists.

### E. Checkout Normal

Rules:

- Must close candidate later.
- If open arrears exists, normal checkout is blocked.
- Bed becomes vacant only after checkout closure.
- No provider phone allowed as customer identity.

Candidate status:

- `candidate_checkout_pending` before full closure.
- `candidate_closed` after successful financial/access closure.

### F. Left With Arrears

Rules:

- Candidate remains financially open.
- Bed may become vacant for a new candidate.
- Arrears remains linked to old candidate.
- Staff-entered phone is allowed.
- Provider phone is forbidden.
- `99099` phone is forbidden.

Candidate status:

- `candidate_left_with_arrears`.

### G. Expense

Rules:

- Bed-related expense may attach to candidate.
- Property/company expense should not force candidate.
- If target_bed has active candidate, optional link is allowed.
- If general expense, `occupancy_candidate_id = null`.

Candidate status:

- `candidate_continued` for customer/bed-specific expense.
- null for property/company expense.

### H. Bed Transfer

Rules:

- Must move the same candidate from `from_bed` to `to_bed`.
- Must not create a new candidate.
- Must preserve deposit continuity.
- Must preserve arrears continuity.
- Must preserve rent coverage continuity.
- Must preserve access validity continuity.
- Must check `to_bed` occupancy conflict.
- `from_bed` expected after = vacant/closed.
- `to_bed` expected after = active under same candidate.
- No `card_id` dependency.
- No `tenant_card_id` dependency.
- No provider phone dependency.

Candidate status:

- `candidate_transferred`.

## 6. Candidate Status Values

Allowed candidate status values:

- `candidate_active`
- `candidate_unresolved`
- `candidate_created`
- `candidate_continued`
- `candidate_transferred`
- `candidate_left_with_arrears`
- `candidate_checkout_pending`
- `candidate_closed`
- `candidate_conflict`

Status is explanatory during transition and must not silently replace durable occupancy status.

## 7. Anomaly Rules

Required anomaly codes:

- `SAME_BED_NEW_CUSTOMER_WITH_ACTIVE_CANDIDATE`
- `ARREARS_PAYMENT_WITHOUT_ORIGINAL_CANDIDATE`
- `DEPOSIT_OUT_WITHOUT_ACTIVE_CANDIDATE`
- `CHECKOUT_WITHOUT_ACTIVE_CANDIDATE`
- `BED_TRANSFER_WITHOUT_FROM_CANDIDATE`
- `BED_TRANSFER_TO_OCCUPIED_BED`
- `PROVIDER_METADATA_USED_FOR_CANDIDATE`
- `CARD_ID_USED_FOR_CANDIDATE`
- `99099_USED_FOR_CANDIDATE`

Each anomaly should include:

- `risk_code`
- `risk_level`
- `confidence_score`
- `source_event_ids`
- `suggested_action`

Anomaly handling should prefer unresolved/conflict state over unsafe matching.

## 8. Runtime Integration Plan

Phase E1:

- Attach runtime candidate to new incoming events in dry-run only.
- Return candidate preview in validation response.
- No write.

Phase E2:

- Store candidate in `entries_json` / transaction metadata for new events only if no migration is required.
- Keep legacy fields for compatibility.

Phase E3:

- Use candidate for new arrears/deposit continuity only after dry-run evidence.
- Do not affect old historical matching.

Phase E4:

- Design durable occupancy_session table/index.
- Include audit and rollback strategy.

Phase E5:

- Migrate/backfill history cautiously.
- Mark ambiguous matches as `candidate_conflict` or disputed.

Phase E6:

- Replace `tenant_card_id` legacy matching after durable identity exists.

## 9. No-Go Conditions

Implementation must stop if:

- candidate generation requires `card_id`
- candidate generation requires `tenant_card_id`
- candidate generation requires provider phone
- candidate generation requires `99099` phone
- active bed state cannot be determined
- same bed has multiple possible active candidates
- bed transfer target occupancy is ambiguous
- deposit continuity cannot be linked safely
- arrears continuity cannot be linked safely
- owner correction path is required but not designed

## 10. Required Tests for Future Implementation

Before coding runtime behavior, add tests for:

- candidate preview appears in dry-run only
- no production write in Phase E1
- Rent creates candidate only when no active candidate exists
- Rent renewal continues candidate
- short-paid rent creates arrears with same candidate
- Arrears Payment inherits candidate from `arrears_ref`
- Arrears Payment without original candidate becomes unresolved
- Deposit In new creates candidate
- Deposit In additional continues candidate
- Deposit Out without active candidate becomes anomaly
- Checkout normal closes candidate only when no open arrears
- Left With Arrears keeps candidate financially open
- Expense general leaves candidate null
- Bed Transfer moves same candidate
- Bed Transfer to occupied bed blocks or requires owner override
- provider metadata cannot be used for candidate
- `card_id` cannot be used for candidate
- `tenant_card_id` cannot be used for candidate
- `99099` phone cannot be used for candidate
- legacy `tenant_card_id` matching remains unchanged until planned replacement

## 11. Implementation Boundary

This plan does not authorize implementation.

Go to the next planning step before coding:

- define candidate preview response contract
- define validation trace fields
- define rollback and no-write proof
- define owner correction dependency

Runtime behavior changed in this step: no.

Production data changed in this step: no.

Migration in this step: no.

Deploy in this step: no.

