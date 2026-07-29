# BED_TRANSFER_STAY_CONTEXT_AND_LINEAGE_CONTRACT_V1

## 1. DOCUMENT_STATUS

- task: `DEFINE_DURABLE_STAY_CONTEXT_ID_AND_CANONICAL_TRANSFER_LINEAGE_CONTRACT_ONLY`
- scope: business contract and design evidence only
- runtime implementation: `NOT_IMPLEMENTED`
- database schema decision: `UNKNOWN / NOT_FINALIZED`
- migration apply: no
- legacy bootstrap: `REJECTED_FOR_PHASE1`
- Bed Transfer write enabled: no
- Bed Transfer status: `NOT_VERIFIED / REQUIREMENTS_REVIEW`
- production cutover: `PRODUCTION_NO_GO`

This contract applies only to new stays and new Bed Transfer events accepted after a future feature enablement. It does not authorize runtime code, a migration, a deployment, production access, historical reconstruction, or legacy backfill.

## 2. STATUS_LEGEND

- `USER_ACCEPTED_BUSINESS_RULE`: explicitly required by the current human task or an already accepted controlling contract.
- `CURRENT_CODE_FACT`: verified from the current repository at HEAD `c6ae7f08434a606485a2ee80790f05034e0e2127`.
- `UNKNOWN`: not decided or not proven; no default may be inferred.
- `NOT_IMPLEMENTED`: required semantics are absent from the current runtime.
- `BLOCKED`: implementation must not proceed without the stated human decision or prerequisite.
- `FUTURE_IMPLEMENTATION_REQUIREMENT`: mandatory behavior for a later, separately authorized implementation.

## 3. DURABLE_STAY_IDENTITY

### USER_ACCEPTED_BUSINESS_RULE

The business-semantic identity is `stay_context_id`. A later implementation may use a different exact code field name only if it preserves every semantic rule in this contract and does not create a second identity domain.

1. One continuous stay begins at an accepted check-in boundary.
2. Transfers A -> B -> C retain the same stay identity.
3. Accepted Checkout closes that stay.
4. A later accepted check-in creates a new stay identity; the closed ID is never reused.
5. Bed number is an event location and lineage node, not resident identity.
6. Changing a physical access card does not change the stay identity.
7. The identity is company-scoped and cannot cross `corpid`.
8. The identity is opaque, server-generated, non-guessable, and durable for one continuous stay.

The identity must not be generated, selected, matched, restored, or merged from:

- `tenant_card_id`
- `card_id`
- `old_ttlock_ref`
- phone or provider phone
- `phone_99099`
- creator phone
- card or record creation time
- provider metadata
- bed number
- TTLock D, E/e, MMDD, or expiry
- employee/owner display text, Preview, WhatsApp, cache, or local storage

### CURRENT_CODE_FACT

- `stay_context_id` exists in a local, default-off genesis vertical slice. The server generates UUID v4 values and accepts only explicit `stay_action=start` on Rent or Deposit In (`modules/employees/durable-stay-genesis-trigger.mjs:1-44`, `modules/employees/durable-stay-persistence.mjs:39-98`).
- The generated ID is injected into the canonical `sessions.entries_json` genesis entry before registry materialization (`deploy-worker/src/index.js:2796-2810`, `3422-3464`).
- The Bed Context gateway can read active genesis IDs from canonical archive entries and use registry rows only for confirmation/conflict detection (`modules/employees/canonical-stay-bed-context.mjs:54-75`, `101-151`).
- The local runtime requires `DURABLE_STAY_WRITE_APPROVED="true"` and the `stay_contexts` and `stay_event_links` tables before genesis (`deploy-worker/src/index.js:2763-2794`, `3227-3252`).

### UNKNOWN

- The exact canonical event vocabulary for `accepted_checkin` is not finalized. Current code permits explicit Rent or Deposit In genesis, but the final business rule deciding which accepted event represents check-in is not locked by this task.
- The final persistence shape, indexes, transaction mechanism, and whether a rebuildable registry is required at the first implementation step are not finalized here.

### NOT_IMPLEMENTED

- Ordinary Rent, Arrears, Deposit, Checkout, Owner History, and Bed Transfer events do not universally carry `stay_context_id`.
- Checkout does not close the current `stay_context_id` in runtime.
- Bed Transfer does not resolve or preserve the source stay ID.
- No active transfer-lineage projection derives the current bed from stay identity.
- No registry rebuild worker exists.

## 4. ACCEPTED_CHECKIN_BOUNDARY

### USER_ACCEPTED_BUSINESS_RULE

An accepted check-in boundary must be a canonical employee-entry event that:

1. explicitly declares a new occupant/stay start;
2. has passed source firewall and business validation;
3. is accepted into `sessions.entries_json`;
4. is company-scoped by `corpid`;
5. has no conflicting active stay for the same business context;
6. causes the server to create exactly one new opaque stay identity.

Rent renewal, Deposit top-up, first observation of a bed, missing prior data, or provider/card clues must never infer a new stay.

### CURRENT_CODE_FACT

The current explicit trigger is `stay_action=start` on Rent or Deposit In. Missing `stay_action` creates no stay. This is a partial technical boundary, not final proof of accepted check-in business semantics.

### BLOCKED

Runtime expansion is blocked until a human confirms the exact accepted-check-in event contract and the no-active-stay/occupancy preconditions. Legacy records cannot satisfy this boundary through reconstruction because legacy bootstrap is rejected.

## 5. ACCEPTED_CHECKOUT_BOUNDARY

### USER_ACCEPTED_BUSINESS_RULE

An accepted canonical Checkout event belongs to the active `stay_context_id` and then closes it through immutable termination evidence. Closing a stay must record the Checkout session, entry, anchor, and time without deleting or rewriting prior events.

Left With Arrears closes occupancy/stay in the same identity domain while its arrears remain linked to the closed stay. A later Arrears Payment does not reopen the stay.

### CURRENT_CODE_FACT

Checkout and Left With Arrears have canonical event validation and anchor fields, including event/session references (`deploy-worker/src/index.js:2539-2557`, `3618`, `3962-3966`). The draft migration contains closed-state fields (`migrations/008_durable_stay_context.sql:1-58`).

### NOT_IMPLEMENTED

No current runtime function updates a stay to `closed`, stores close session/entry/anchor references, or creates a canonical `STAY_END_ANCHOR`. Repository search finds closed-stay fields only in the unapplied migration/design/tests, not a Checkout lifecycle writer.

### BLOCKED

Any runtime task that relies on a closed stay must stop until Checkout stay closure and its void/reversal restoration conflict rules receive human review.

## 6. IMMUTABLE_TRANSFER_LINEAGE_RECORD

### USER_ACCEPTED_BUSINESS_RULE

Every accepted new Bed Transfer must append one immutable canonical transfer lineage record. The semantic record contains:

| Field | Contract |
|---|---|
| `transfer_event_id` | Unique immutable canonical event/anchor identity for this transfer. |
| `stay_context_id` | Existing active stay identity; never client-generated and never replaced during transfer. |
| `from_bed` | Original source location for this transfer edge. |
| `to_bed` | Target location for this transfer edge. |
| `occurred_at` | Canonical business occurrence time. |
| `source_session_id` | Canonical employee-entry session containing the transfer. |
| `source_entry_id` | Canonical entry containing the transfer. |
| `previous_transfer_ref` | Prior active transfer edge for this stay, or null for its first transfer. |
| `status` | Semantic state such as active, voided, or reversed; exact stored enum is `UNKNOWN`. |
| `void/reversal reference` | Additive anchor reference that makes an edge inactive; never an overwrite or deletion. |
| `source_proof` | Canonical source/target evidence references and fingerprints; proof is not identity. |
| `company scope reference` | `corpid`; from/to beds and stay must resolve within the same company. |

The exact database columns and table design are deliberately not finalized by this contract.

### FUTURE_IMPLEMENTATION_REQUIREMENT

- The only writer is canonical `POST /api/employee/entry` -> source firewall -> validator -> normalization -> `sessions.entries_json`.
- The transfer must resolve exactly one active source `stay_context_id` from Canonical Archive.
- Missing, closed, ambiguous, or conflicting stay identity must fail closed.
- The transfer entry must reuse the resolved ID and may not accept a client-supplied identity.
- `previous_transfer_ref` must point to the previous active edge for the same stay and company.
- `from_bed` must match the current bed derived before appending the new edge.
- `to_bed` becomes current only after the canonical transfer edge is accepted.
- No transfer may attach historical events from another stay merely because they share a bed.

### NOT_IMPLEMENTED

The current Bed Transfer canonical anchor has from/to bed and transfer fields but no `stay_context_id`, `previous_transfer_ref`, termination linkage, or active lineage projection (`deploy-worker/src/index.js:3619-3620`, `3946-3948`). Bed Transfer writing remains disabled.

## 7. ORIGINAL_EVENT_BED_IMMUTABILITY

### USER_ACCEPTED_BUSINESS_RULE

- Original Rent, Arrears, Deposit, Checkout, Expense, and prior Transfer events retain their original bed/location.
- A transfer appends an A -> B edge; it never rewrites A events to B.
- Current bed is derived from the final active transfer edge, falling back to the accepted check-in bed when no active transfer exists.
- Owner History must display original event bed and derived current bed as different concepts.

### FUTURE_IMPLEMENTATION_REQUIREMENT

Any updater that changes `room`, `bed`, `from_bed`, or historical event content to simulate a transfer is forbidden. Derived gateways may expose `current_bed`, but that value is never written back into original events.

## 8. FINANCE_DEDUPLICATION

### USER_ACCEPTED_BUSINESS_RULE

- Finance counts every original canonical financial event exactly once by canonical event identity.
- Moving the stay from A to B does not clone, re-home, or recount Rent, Deposit, Arrears Payment, or Expense.
- A Bed Transfer with no explicit money event has zero financial effect.
- This contract does not implement transfer fee, transfer-fee arrears, bed-price difference, or arrears carryover.

### CURRENT_CODE_FACT

The Finance projection reads canonical session anchors and applies each active anchor once in its session scan; voided/reversed sessions are excluded from active totals (`deploy-worker/src/index.js:9426-9517`). Current Bed Transfer fee branches exist in the broader legacy contract, so full future Finance-zero compliance remains unverified.

### FUTURE_IMPLEMENTATION_REQUIREMENT

Transfer lineage changes location/history projection only. It must not create replacement copies of source financial anchors or cause Finance to count linked historical anchors again.

## 9. VOID_REVERSAL_LINEAGE

### USER_ACCEPTED_BUSINESS_RULE

- A transfer event is never hard deleted.
- Void/reversal appends immutable canonical evidence referencing the original transfer edge.
- The referenced edge becomes inactive for current-lineage derivation.
- The original transfer remains visible in audit/history.
- Current bed is recomputed from the last remaining active edge, or the check-in bed if none remain.
- If removing an earlier edge makes a later edge discontinuous, the projection must fail closed with owner review; it must not invent a path.
- TTLock rollback remains manual and is outside this contract.

### NOT_IMPLEMENTED

Current generic session voiding updates session/transaction/arrears/deposit records but does not implement transfer-edge reversal or stay-lineage recomputation (`deploy-worker/src/index.js:10969-11069`).

## 10. LEGACY_BOUNDARY

### USER_ACCEPTED_BUSINESS_RULE

- `LEGACY_BOOTSTRAP = REJECTED_FOR_PHASE1`.
- Legacy stay identity and historical lineage remain `UNKNOWN` or `OWNER_REVIEW_REQUIRED`.
- No legacy resident identity reconstruction, transfer backfill, stay-context creation, historical migration, or automatic bed-history merge is authorized.
- Bed 334 remains deferred and excluded.

Legacy uncertainty does not block defining the new-event contract, but legacy events cannot be attached to a new `stay_context_id` without a later explicit human decision.

## 11. IMPLEMENTATION_GATE

### BLOCKED

This contract is defined, but runtime implementation is not authorized by this task. Human review is required because:

1. the exact accepted-checkin event boundary is only partial in current code;
2. Checkout cannot currently close a durable stay;
3. the current implementation requires draft migration `008`, which has not been applied;
4. new Transfer events do not yet preserve `stay_context_id`;
5. legacy records have no durable stay identity and bootstrap remains rejected.

The next task must remain one minimal review task and must not apply a migration or enable Bed Transfer writes.
