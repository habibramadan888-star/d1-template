# Occupancy Session Design V1

Date: 2026-07-08

Status: design only. No runtime implementation. No migration. No production data changes.

## 1. Purpose

`occupancy_session_id` is needed because Homelink must distinguish a customer-stay business relationship from unstable operational references.

It supports:

- distinguishing old and new tenants on the same bed
- preserving identity through bed transfer
- keeping deposit continuity
- keeping arrears continuity
- supporting normal checkout
- supporting left with arrears
- supporting future access and network permissions
- supporting customer credit and customer quality scoring

Core principle:

Bed = location.

Access card = provider object.

Card ID = unstable hardware/provider reference.

Provider phone = non-authoritative metadata.

`occupancy_session_id` = business relationship.

occupancy_session_id = business relationship.

## 2. Definition

`occupancy_session_id` identifies one continuous customer or tenant stay relationship inside one property.

It starts when a customer stay is created or first confidently inferred from authoritative business events. It remains active while rent, deposit, arrears, access, network, bed transfer, checkout, and left-with-arrears records belong to the same stay relationship.

Lifecycle states:

- `active`: customer stay is active on a current bed.
- `transferred`: customer stay moved from one bed to another and remains the same occupancy.
- `checkout_pending`: checkout started but not fully closed.
- `checked_out`: customer physically left and normal financial closure is complete.
- `left_with_arrears`: customer left but financial arrears remain open.
- `closed`: all business obligations are resolved.
- `voided`: occupancy was created by error and voided by authorized correction.
- `disputed`: identity or financial continuity has unresolved conflict.

Lifecycle boundaries:

- start: first authoritative deposit, rent, check-in, or owner correction creates the stay.
- active: current customer continues rent/payment/deposit relationship.
- transferred: bed changes but customer-stay identity remains the same.
- checkout closed: customer stay ends after deposit/refund/arrears rules are satisfied.
- left_with_arrears: bed may become available, but financial identity remains open.
- voided/corrected: authorized correction changes or invalidates the stay identity.

## 3. Identity Source Authority

Allowed to participate in occupancy identity:

- `property_id`
- `initial_bed`
- `first_checkin_date`
- `checkin_mmdd`
- first Deposit In event
- first Rent event
- Access Snapshot context from access-card remark
- employee-entered customer display name
- staff-entered customer phone if explicitly provided
- owner correction later

Forbidden as occupancy identity:

- `card_id`
- `tenant_card_id`
- hardware card id
- provider phone
- repeated owner/admin phone ending `99099`
- access-card metadata phone

Provider references may be stored as non-authoritative metadata or raw audit evidence, but cannot decide customer identity, tenant identity, deposit identity, arrears identity, checkout identity, or matching keys.

## 4. Occupancy Creation Rules

Create a new `occupancy_session_id` when:

A. Deposit In new customer:

- employee records a new deposit for a bed with no active occupancy for that customer stay.
- deposit event becomes an authoritative starting signal.

B. Rent new customer with no active occupancy:

- employee records rent for a bed where no active occupancy is found.
- Access Snapshot context may support the candidate, but provider card id cannot create identity.

C. Left-with-arrears former customer record if no existing occupancy:

- customer already left, has unpaid arrears, and no occupancy can be linked.
- create a former-customer occupancy candidate linked to the arrears and staff-entered contact.

D. Owner correction / historical import later:

- owner confirms historical identity or corrects ambiguous records.

Do not create a new occupancy session for:

- normal rent renewal
- arrears payment against existing arrears_ref
- deposit balance payment for the same active stay
- bed transfer
- access card replacement
- provider card id change
- provider record recreation

## 5. Occupancy Continuation Rules

Events should link to an existing occupancy when the event belongs to the same customer-stay relationship.

Rent:

- same bed plus same active occupancy continues occupancy.
- same bed after checkout creates or requires a new occupancy.

Arrears Payment:

- must link through `arrears_ref`, not bed only.
- arrears_ref then links back to `occupancy_session_id`.

Deposit In:

- additional deposit or deposit balance payment for the same active stay continues occupancy.
- first deposit for a new customer may create occupancy.

Deposit Out:

- decreases deposit for the linked occupancy.
- cannot be matched only by bed if multiple occupancies exist.

Checkout:

- closes or changes status of the linked occupancy.

Expense if bed-related:

- may link to occupancy if it is customer-specific; otherwise it is property or bed context only.

Bed Transfer:

- same occupancy moves from `from_bed` to `to_bed`.

Continuation rule summary:

- same bed + same active occupancy = continue.
- same bed after checkout = new occupancy.
- bed transfer = same occupancy moves from `from_bed` to `to_bed`.

## 6. Bed Transfer Model

Bed transfer is occupancy session migration from `from_bed` to `to_bed`.

Required transfer state:

- `from_bed`
- `to_bed`
- `occupancy_session_id`
- `from_access_snapshot_before`
- `to_access_snapshot_before`
- `from_state_before`
- `to_state_before`
- `from_state_after_expected`
- `to_state_after_expected`
- `deposit_moved`
- `rent_coverage_moved`
- `arrears_moved`
- `access_validity_moved`
- `transfer_fee`
- `fee_waived_reason`
- `conflict_check`

Rules:

- transfer cannot depend on card_id.
- transfer cannot depend on tenant_card_id.
- transfer cannot depend on provider phone.
- transfer to occupied bed should be blocked or require owner override.
- deposit balance follows occupancy unless explicitly split.
- arrears follows occupancy unless explicitly settled or waived.
- rent coverage follows occupancy.
- old bed should become vacant/closed after transfer unless otherwise specified.
- new bed becomes active under the same occupancy.
- provider access card changes are access operations, not occupancy identity changes.

## 7. Checkout Model

Normal checkout:

- closes occupancy if no open arrears remain and deposit/refund is handled.
- closes access and network requirements.
- marks bed vacant.
- records checkout date and financial closure evidence.

Left with arrears:

- occupancy remains financially open.
- bed may become vacant for a new customer.
- arrears remains linked to `occupancy_session_id`.
- customer phone is allowed only if staff-entered or from an authoritative customer profile.
- provider phone and `99099` phone are forbidden as customer phone.
- belongings status is preserved.
- promise date and follow-up notes remain linked to occupancy.

## 8. Deposit Model

Deposit belongs to `occupancy_session_id`.

Access remark `D200` is context only, not deposit ledger authority.

Deposit ledger is authoritative.

Deposit rules:

- Deposit In increases deposit balance for the linked occupancy.
- Deposit Out decreases deposit balance for the linked occupancy.
- Bed Transfer moves deposit with occupancy unless explicitly split.
- Checkout refunds, offsets, or closes deposit.
- Owner Correction later can adjust deposit balance with audit trail.

Legacy warning:

Current `tenant_card_id` deposit matching is unsafe and must be replaced only after durable occupancy identity exists.

## 9. Arrears Model

Arrears belongs to `occupancy_session_id` plus `arrears_ref`.

Arrears also displays current or former bed context, but bed is not the identity.

Rules:

- bed transfer does not break arrears continuity.
- left_with_arrears keeps arrears linked to occupancy.
- arrears payment must select `arrears_ref`.
- repayment cannot be by bed only.
- if the same bed later has a new customer, old arrears remain linked to the old occupancy.
- waived, settled, voided, and disputed arrears must keep source event evidence.

## 10. Access / Network Model

Access validity is derived from Access Snapshot context plus rent/payment state.

Network permission should attach to `occupancy_session_id`.

Access card replacement should not create new occupancy.

Provider card id is only a provider lookup handle.

Access Snapshot is evidence/context:

- bed context
- deposit remark context
- check-in month/day context
- valid-until month/day context
- raw remark audit
- non-authoritative provider metadata

It is not customer identity by itself.

## 11. Time Model

Occupancy must distinguish these timestamps and date anchors:

- `occupancy_started_at`
- `checkin_mmdd`
- `business_start_date`
- `active_from`
- `active_until`
- `rent_coverage_start`
- `rent_coverage_end`
- `checkout_date`
- `left_date`
- `closed_at`
- `created_at`
- `synced_at`

Do not collapse all dates into one timestamp.

Examples:

- `checkin_mmdd` may come from access remark and lacks year.
- `rent_coverage_end` may differ from access valid-until.
- `left_date` may happen before final financial closure.
- `closed_at` means business closure, not necessarily physical checkout.

## 12. Conflict / Anomaly Rules

Each anomaly should include:

- `risk_code`
- `risk_level`
- `confidence_score`
- `source_event_ids`
- `suggested_action`

Risk codes:

- `OCCUPANCY_DOUBLE_ACTIVE_BED`
- `BED_DOUBLE_OCCUPIED`
- `TRANSFER_TO_OCCUPIED_BED`
- `ARREARS_WITHOUT_OCCUPANCY`
- `DEPOSIT_WITHOUT_OCCUPANCY`
- `CHECKOUT_WITH_OPEN_ARREARS`
- `PROVIDER_PHONE_USED_AS_CUSTOMER_PHONE`
- `CARD_ID_USED_AS_OCCUPANCY_ID`
- `BED_REUSED_WITHOUT_CHECKOUT`
- `SAME_BED_NEW_CUSTOMER_WITH_OPEN_OLD_OCCUPANCY`

Suggested actions may include:

- request owner correction
- block direct employee action
- mark disputed
- require checkout confirmation
- require arrears settlement or owner override
- split occupancy after review

## 13. Migration Strategy

Do not implement migration now.

Future staged migration:

Phase 1:

- new events optionally attach runtime `occupancy_candidate_id`.
- continue writing legacy fields for compatibility.

Phase 2:

- derive `occupancy_session_id` for new sessions only.
- do not backfill history yet.

Phase 3:

- add durable storage and migration for occupancy sessions.
- create indexes and audit fields.

Phase 4:

- backfill history cautiously.
- mark low-confidence matches as disputed.

Phase 5:

- replace `tenant_card_id` matching for deposit and arrears with occupancy identity.

Phase 6:

- owner correction tools for conflicts.
- allow authorized merge/split/void occupancy corrections.

## 14. Event Mapping Table

| Event Type | Creates Occupancy | Continues Occupancy | Closes Occupancy | Moves Occupancy | Required Link |
|---|---|---|---|---|---|
| Rent | Yes, if no active occupancy exists | Yes | No | No | bed + active occupancy or occupancy candidate |
| Arrears Payment | No | Yes | No | No | arrears_ref linked to occupancy_session_id |
| Deposit In | Yes, for new customer deposit | Yes, for additional deposit | No | No | occupancy_session_id or new occupancy candidate |
| Deposit Out | No | Yes | Maybe, only with checkout closure | No | occupancy_session_id |
| Checkout Normal | No | Yes | Yes | No | occupancy_session_id |
| Left With Arrears | Yes, if former customer has no occupancy | Yes | No, remains financially open | No | occupancy_session_id + arrears_ref |
| Expense | No | Optional if bed/customer-specific | No | No | property, bed, or occupancy context |
| Bed Transfer | No | Yes | No | Yes | occupancy_session_id + from_bed + to_bed |
| Owner Correction later | Yes, if confirmed missing | Yes | Yes | Yes | owner correction audit record |

## 15. Open Questions / NO-GO Items

Open questions:

- What is the minimum owner confirmation needed to split old/new tenants on the same bed?
- How should historical access-card-only records be backfilled when check-in year is unknown?
- What confidence threshold should auto-link rent renewal to occupancy?
- Should network permissions close at checkout_date or closed_at?
- How should deposit splits be represented after disputed bed transfer?

NO-GO for runtime implementation until:

- durable occupancy storage is designed.
- owner correction workflow is designed.
- Access Snapshot DTO integration path is finalized.
- legacy `tenant_card_id` matching replacement plan is approved.
- migration and rollback plan exists.
- production cutover remains blocked until verified.
