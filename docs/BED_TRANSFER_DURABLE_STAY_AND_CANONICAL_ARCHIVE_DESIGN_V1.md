# Bed Transfer Durable Stay and Canonical Archive Design V1

## 1. DOCUMENT_STATUS

- document: `architecture contract`
- runtime implementation: `not started`
- migration: `not started`
- production verification: `not started`
- Bed Transfer: `NOT_VERIFIED / REQUIREMENTS_REVIEW`
- production_cutover: `PRODUCTION_NO_GO`

This document defines a future architecture contract only. It does not claim that the contract is implemented, migrated, deployed, or production verified.

## 2. CORE_PROBLEM

- stable stay identity: `none`
- canonical transfer write path unique: `no`
- independent write bypass: `confirmed`
- transfer lineage: `not implemented`
- multiple arrears identity preservation: `no`
- void lineage recomputation: `no`
- company scope: `partial`
- concurrency: `partial`
- idempotency: `partial`

## 3. DURABLE_STAY_IDENTITY

The formal business identity is `stay_context_id`.

- Homelink server must generate it.
- It must be opaque, non-guessable, non-reusable, and stable for the duration of one stay.
- It must not be derived from bed number, card ID, `tenant_card_id`, phone number, `old_ttlock_ref`, or provider metadata.
- Changing an access card must not change `stay_context_id`.
- An A -> B -> C transfer chain must retain the same `stay_context_id`.
- Checkout ends the stay.
- A later check-in must generate a new `stay_context_id`.
- Arrears from an ended stay must retain their original `stay_context_id`.
- Expense does not belong to a resident stay and must not carry `stay_context_id`.

## 4. STAY_START_CONTRACT

The employee application retains exactly seven employee event types. This contract does not add an eighth employee event.

A new stay may begin only through explicit canonical stay-start semantics attached to one of these existing events:

- the first Rent for a new occupant; or
- the first Deposit In for a new occupant.

All of the following are required at the same time:

- The payload explicitly marks the event as a new occupant / stay start.
- The current TTLock / Access Snapshot is not E/e vacant.
- The bed has no active `stay_context_id`.
- Company scope is consistent.
- The server generates the new `stay_context_id`.
- The archive creates an immutable `STAY_START_ANCHOR`.

Ordinary Rent renewal continues the current active `stay_context_id` and must not create a new stay. Deposit top-up also continues the current active `stay_context_id` and must not create a new stay.

If the system cannot distinguish a new occupant from an ordinary renewal or top-up, it must fail closed. It must not create a stay merely because this is the first time a bed was observed, and it must not guess occupant identity from a card ID.

## 5. LEGACY_ACTIVE_STAY_BOOTSTRAP

Existing active occupants without a durable stay identity require a one-time `STAY_BOOTSTRAP_ANCHOR` contract.

- Creation or confirmation requires owner authorization.
- It is only for initialization of a historical active occupant.
- The current TTLock / Access Snapshot is physical-context evidence.
- Audit references must retain bed, D, MMDD, expiry, and `corpid` provenance.
- Provider identity must not become stay identity.
- The server generates `stay_context_id`.
- Existing Rent, Deposit, and Arrears events remain immutable and are not rewritten.
- Historical events link through explicit bootstrap linkage.
- Ambiguous bed or history evidence is `BLOCKED` and must not be auto-merged.
- Bed 334 must not be used for automatic bootstrap validation.

This document defines the bootstrap contract only. It does not design or execute a production backfill.

## 6. STAY_CONTINUATION

The following resident events continue the same `stay_context_id`:

- Rent renewal
- Arrears creation
- Arrears Payment
- Deposit In top-up
- Deposit Out
- Bed Transfer
- the Checkout event itself, before termination becomes effective

For Bed Transfer, `from_bed` changes to `to_bed`, `stay_context_id` remains unchanged, original events remain immutable, and the current bed is derived from active lineage.

## 7. STAY_TERMINATION

An accepted Checkout creates an immutable `STAY_END_ANCHOR`.

- The active stay ends.
- Historical events remain available.
- Open arrears remain linked to the ended stay.
- Left With Arrears does not start a new stay.
- Later Arrears Payment references the original stay and exact arrears identity.

Voiding Checkout restores the former stay through a void/reversal anchor and does not physically delete the Checkout. If a later new stay already exists, restoration creates an owner conflict and must not automatically overwrite that later stay.

## 8. SINGLE_CANONICAL_TRANSFER_WRITE_PATH

The only authoritative Bed Transfer write route is:

`POST /api/employee/entry`

The only authoritative storage chain is:

`sessions -> sessions.entries_json -> session anchor -> entry anchor -> transfer lineage projection`

- `/api/employee/bed-transfers` must not remain an independent writer.
- Until unification is complete, `/api/employee/bed-transfers` must fail closed.
- If that URL is retained later, it may only call the same canonical internal handler used by `/api/employee/entry`.
- `/api/save_session` must reject `TF`, `TFF`, and `bed_transfer`.
- `bed_transfer_events` may be a projection or index, but it must not be an independent truth source.
- The projection must be rebuildable from `sessions.entries_json` and canonical anchors.

## 9. TRANSFER_ANCHOR

An immutable `TRANSFER_ANCHOR` has the following required business semantics:

- `transfer_id`
- `stay_context_id`
- `corpid`
- `from_bed`
- `to_bed`
- `occurred_at`
- operator identity
- source session ID
- source entry ID
- source anchor ID
- previous active bed
- previous active transfer anchor, if any
- TTLock source snapshot provenance
- TTLock target snapshot provenance
- inherited deposit audit value
- inherited MMDD audit value
- inherited expiry audit value
- carried arrears `refs[]`
- transfer fee mode
- transfer fee payment/ref/arrears ref
- bed-price-difference payment/arrears ref
- idempotency key
- `created_at`
- active/void relationship represented through separate anchors

The following are forbidden as anchor identity or facts:

- `tenant_card_id`
- `card_id`
- `old_ttlock_ref`
- provider phone
- `phone_99099`
- creator phone
- card creation time
- provider identity metadata
- UI, Preview, or WhatsApp text

## 10. HISTORY_AND_LINEAGE

- A -> B -> C uses one `stay_context_id`.
- Every Transfer Anchor points to the previous active bed and previous active transfer anchor.
- Original Rent, Deposit, and Arrears event beds are not rewritten.
- The current bed is derived from the final active lineage node.
- Querying C can read the current occupant's linked A, B, and C history.
- Historical events for other former occupants of A must not follow the transfer lineage.
- Finance counts every original event exactly once.
- A voided Transfer Anchor is excluded from active lineage.

## 11. ARREARS_IDENTITY

- Every arrears item retains its own `arrears_ref`.
- All open arrears belonging to the stay follow the current active lineage.
- The original arrears bed is not rewritten.
- Arrears must not be aggregated into a total that loses individual identity.
- Multiple arrears are carried as complete `refs[]`.
- Transfer Fee Arrears uses a separate source type.
- Bed Price Difference Arrears uses a separate source type.
- The owner continues to see all arrears through the unified Arrears Gateway page.
- Arrears Payment binds to one exact `arrears_ref`.
- AED 50 Transfer Fee Arrears does not permit partial repayment.
- Current Arrears Payment reuse is only partial and requires a separate contract audit before implementation.

## 12. FINANCE_CONTRACT

A Bed Transfer without money has:

- `rent_income = 0`
- `deposit_received = 0`
- `deposit_refund = 0`
- `arrears_repaid = 0`
- `expense = 0`

A paid transfer fee is separate transfer-fee income and is not Rent. Creating transfer-fee arrears creates no received income. Repaying transfer-fee arrears creates transfer-fee income only at repayment time and must reference the original `arrears_ref`.

Bed price difference uses a separate money/ref/source contract and must not be represented as transfer fee or ordinary Rent.

Current runtime Finance zero behavior is `UNKNOWN` and must be verified after implementation.

## 13. VOID_REVERSAL

- Transfer history must not be hard deleted.
- Owner UI delete semantics create a `VOID_TRANSFER_ANCHOR`.
- A voided A -> B transfer is removed from active lineage.
- The stay current bed returns to A.
- B no longer inherits A history.
- Arrears current context is restored.
- Sync State reports Cloud Voided / Owner review.
- Today Todo recomputes.
- The owner manually restores TTLock, access card, Wi-Fi, and electricity-card state.
- Refund rules for a paid AED 50 fee or paid bed price difference remain `GOVERNANCE_PENDING`.
- No real transfer-void money reversal may be implemented before refund rules are approved.

## 14. COMPANY_SCOPE

- Company authority is `corpid`.
- `from_bed` and `to_bed` must belong to the same `corpid`.
- Cross-room, cross-apartment, and cross-property transfer is allowed within one `corpid`.
- `property_id` is not the boundary that prohibits cross-property transfer.
- Cross-`corpid` transfer is forbidden.
- Missing or ambiguous company scope must fail closed.

## 15. CONCURRENCY_AND_IDEMPOTENCY

- All Bed Transfer writes use one unified idempotency-key contract.
- Idempotency scope includes at least `corpid` plus event identity.
- Retrying the same idempotency key returns the same result.
- A retry must not duplicate a transfer, fee, or arrears item.
- The latest source and target TTLock / Access Snapshot must be re-read before write.
- Snapshot provenance, version, or fingerprint must be retained.
- The target must still be vacant at commit time.
- Target occupancy claim and transfer archive write must share one atomic boundary.
- When two employees concurrently claim the same target, only one may succeed.
- Frontend button state alone is not a concurrency control.
- `/api/save_session` lacks idempotency and must not process Bed Transfer.
- A direct legacy route must not retain a separate idempotency domain.

This document does not choose the exact D1 SQL or transaction implementation.

## 16. PROJECTIONS_AND_GATEWAYS

The following gateways derive directly from Canonical Archive and active anchors:

- Bed Context Gateway
- Arrears Gateway
- Occupancy Gateway
- Finance Gateway
- Owner Archive Gateway
- Sync State Gateway
- Today Todo Gateway
- Transfer Lineage Gateway

No gateway may treat UI state, local cache, or an independent transfer table as final truth.

## 17. BLOCKERS_BEFORE_IMPLEMENTATION

- Exact TTLock expiry API field, unit, and timezone: `UNKNOWN`.
- Current Arrears Payment full reuse: unsupported.
- Transfer fee arrears implementation: absent.
- Finance zero behavior: unverified.
- Void money refund rule: pending.
- D1 atomic target-claim implementation: undecided.
- Legacy active-stay bootstrap requires a separate controlled plan.
- Bed 334 remains `DEFERRED`.
- `production_cutover` remains `PRODUCTION_NO_GO`.

## 18. IMPLEMENTATION_SEQUENCE

This sequence is future work only; this document does not execute it.

1. Source Firewall identity cleanup
2. Durable stay schema/anchor contract
3. Canonical transfer internal writer
4. Fail-close legacy direct paths
5. Identity-preserving arrears linkage
6. Finance classification
7. Void/reversal recomputation
8. Concurrency/idempotency
9. Local runtime tests
10. Production dry-run
11. Production read verification
12. Controlled live verification
13. Cleanup

## 19. NON_GOALS

This document does not perform or authorize:

- runtime implementation
- migration
- schema modification
- production read or write
- deployment
- test execution
- legacy data backfill
- bed 334 repair
- void money refund decision

## Durable Stay Persistence DDL Contract

The canonical company scope column is `corpid`. This persistence contract does not store `current_bed`, does not create an active-stay-per-bed uniqueness constraint, and does not use provider/card identity. It does not create foreign keys to the legacy archive or permit cascade deletion.

```sql
CREATE TABLE IF NOT EXISTS stay_contexts (
  stay_context_id TEXT PRIMARY KEY,
  corpid TEXT NOT NULL,
  lifecycle_status TEXT NOT NULL DEFAULT 'active',
  genesis_event_type TEXT NOT NULL,
  genesis_session_id TEXT,
  genesis_entry_id TEXT,
  genesis_anchor_id TEXT NOT NULL,
  started_at TEXT NOT NULL,
  closed_at TEXT,
  close_session_id TEXT,
  close_entry_id TEXT,
  close_anchor_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (corpid, stay_context_id),

  CHECK (length(trim(stay_context_id)) >= 16),

  CHECK (
    lifecycle_status IN ('active', 'closed')
  ),

  CHECK (
    genesis_event_type IN (
      'rent',
      'deposit_in',
      'legacy_bootstrap'
    )
  ),

  CHECK (
    genesis_event_type = 'legacy_bootstrap'
    OR (
      genesis_session_id IS NOT NULL
      AND genesis_entry_id IS NOT NULL
    )
  ),

  CHECK (
    (
      lifecycle_status = 'active'
      AND closed_at IS NULL
      AND close_session_id IS NULL
      AND close_entry_id IS NULL
      AND close_anchor_id IS NULL
    )
    OR
    (
      lifecycle_status = 'closed'
      AND closed_at IS NOT NULL
      AND close_session_id IS NOT NULL
      AND close_entry_id IS NOT NULL
      AND close_anchor_id IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_stay_contexts_corpid_status
  ON stay_contexts(corpid, lifecycle_status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stay_contexts_corpid_genesis_anchor
  ON stay_contexts(corpid, genesis_anchor_id);

CREATE TABLE IF NOT EXISTS stay_event_links (
  stay_event_link_id TEXT PRIMARY KEY,
  corpid TEXT NOT NULL,
  stay_context_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  entry_id TEXT NOT NULL,
  anchor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  link_role TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (corpid, anchor_id),
  UNIQUE (corpid, session_id, entry_id),

  FOREIGN KEY (corpid, stay_context_id)
    REFERENCES stay_contexts(corpid, stay_context_id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT,

  CHECK (
    link_role IN (
      'genesis',
      'activity',
      'transfer',
      'termination',
      'correction'
    )
  ),

  CHECK (length(trim(stay_event_link_id)) >= 16),
  CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_stay_event_links_stay_time
  ON stay_event_links(corpid, stay_context_id, occurred_at);

CREATE INDEX IF NOT EXISTS idx_stay_event_links_event_type
  ON stay_event_links(corpid, event_type, occurred_at);
```

Migration status: created locally and not applied. Runtime wiring has not been implemented.

## Durable Stay Genesis Trigger Contract

- `stay_action=start` is the only explicit durable-stay genesis trigger.
- The trigger applies only to Rent (`event_type=rent`) and Deposit In (`event_type=deposit_in`).
- A missing `stay_action` does not request or create a stay.
- TTLock E/e, D, MMDD, expiry, bed/room, Rent reason codes, deposit amounts, provider identity, local cache, Preview, WhatsApp, and UI text must not infer genesis.
- `stay_context_id` and `stay_event_link_id` are server-generated identifiers and are forbidden in client input.
- Canonical genesis must first enter `sessions.entries_json` as the accepted event/anchor fact.
- `stay_contexts` and `stay_event_links` are rebuildable materialized registries derived from the canonical archive.
- A registry write failure must not rewrite or delete the canonical archive.
- `legacy_bootstrap` persistence remains not implemented.
- Runtime wiring, UI integration, feature flag, and schema migration application remain not completed.

### Canonical-First Genesis Persistence Order

- The server must generate `stay_context_id` before writing the canonical archive.
- The canonical entry in `sessions.entries_json` must store that generated `stay_context_id`.
- A later registry materializer must reuse the exact canonical `stay_context_id`; it must not generate a replacement stay ID.
- `stay_contexts` and `stay_event_links` remain rebuildable materialized registries, not independent fact sources.
- If the canonical archive succeeds and registry materialization fails, the canonical `stay_context_id` remains valid and the registry must be rebuildable later from the canonical archive.
- Runtime wiring and the registry rebuild worker remain not implemented.

### Local Durable Stay Genesis Vertical Slice Status

- Local runtime integration uses only the strict `DURABLE_STAY_WRITE_APPROVED="true"` feature flag.
- Before genesis business writes, the runtime requires both `stay_contexts` and `stay_event_links`; it does not create or alter schema at runtime.
- The server prepares one canonical `stay_context_id`, injects it into the selected `sessions.entries_json` genesis entry, completes the existing event writes, and then materializes the registry with that same ID.
- Registry materialization is idempotent by `(corpid, genesis_anchor_id)`, supports exact no-write convergence and missing-link repair, and fails closed on orphan or canonical-field conflicts.
- If the canonical archive is accepted but registry materialization is temporarily unavailable or conflicting, the local HTTP contract returns `202` with `pending_rebuild` or `conflict`; it does not delete or rewrite the canonical archive.
- This vertical slice is verified only against an isolated local test database. Employee UI integration and a registry rebuild worker remain unimplemented.
- Migration `008_durable_stay_context.sql` has not been applied to staging or production, and Bed Transfer writes remain disabled.

### Canonical Stay Identity Bed Context Read Status

- The local Bed Context read path now derives durable stay identity from bounded active `sessions.entries_json` scanning and verifies it against `stay_contexts` / `stay_event_links` when available.
- Read status is limited to `confirmed`, `canonical_only_pending_registry`, `registry_conflict`, or `missing`; canonical/registry disagreement never selects an arbitrary ID.
- Voided, deleted, and reversed genesis facts are excluded. Multiple active stay IDs for one bed fail closed as a conflict.
- TTLock E/e remains physical-vacancy context only and cannot create, select, or delete durable stay identity.
- The gateway is read-only, excludes provider/card identity, performs no schema mutation, and is verified locally only.

### Legacy Stay Bootstrap Candidate Preview Status

- A local pure preview now classifies legacy occupied-bed evidence as `eligible_for_owner_review`, `blocked`, or `already_has_stay_context`.
- Eligibility requires matching company scope, a non-E/e Access Snapshot, valid MMDD context, a complete expiry value, one active canonical Rent or Deposit In source anchor, and no stay registry conflict.
- Access Snapshot D is optional deposit context: a missing D value produces a warning and is never converted to zero or used as identity.
- Bed 334, conflicting canonical candidates, provider-only clues, missing canonical anchors, and invalid access facts fail closed.
- The preview creates no stay ID, anchor, session, entry, or registry row. No HTTP route, owner approval UI, production backfill, or bootstrap write path is implemented.
