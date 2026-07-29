# BED_TRANSFER_EXISTING_STAY_IDENTITY_AUDIT_V1

## 1. AUDIT_SCOPE

- repository HEAD: `c6ae7f08434a606485a2ee80790f05034e0e2127`
- branch: `fix/bed-transfer-canonical-write-closure`
- worktree before audit: clean
- audit mode: source and document inspection only
- runtime code changed: no
- tests run: no
- production called: no
- migration applied: no

## 2. SUMMARY

- stable stay identity currently exists: `partial`
- suitable identity candidate: `stay_context_id` only
- check-in boundary: `partial`
- Checkout close boundary: `partial semantic boundary / NOT_IMPLEMENTED runtime closure`
- transfer preservation: `NOT_IMPLEMENTED`
- legacy presence: no
- company scope: `corpid`, known
- legacy bootstrap: `REJECTED_FOR_PHASE1`
- implementation status: `BLOCKED / HUMAN_REVIEW_REQUIRED`

## 3. IDENTITY_CANDIDATE_MATRIX

| Candidate | Durable | Unique | Created at check-in | Closed at Checkout | Preserved across transfer | Present on legacy data | Suitability |
|---|---|---|---|---|---|---|---|
| `stay_context_id` | Partial: canonical genesis and local registry | Yes for prepared UUID/genesis anchor | Partial: explicit `stay_action=start` on Rent/Deposit In | No runtime closure | No | No | `PARTIAL / ONLY SUITABLE CANDIDATE` |
| `occupancy_candidate_id` | No; preview/metadata only | Candidate-scoped only | No | No | Preview text only | No authoritative presence | `UNSUITABLE` |
| `session_id` / `sessions.id` | Durable batch/session record | Unique as a session | No; one session may contain multiple events | Session void is not stay close | No | Yes | `UNSUITABLE` |
| `entry_id` / `event_id` / `anchor_id` | Durable canonical event identity | Unique per event/anchor | Identifies an event, not a stay | No | New ID per event | Yes/partial | `UNSUITABLE AS STAY ID` |
| transaction `id` | Durable transaction identity | Unique per transaction | No | No | No | Yes | `UNSUITABLE` |
| `occupancy_episode_id` | Absent from runtime/modules/schema | N/A | No | No | No | No | `NOT_IMPLEMENTED` |
| `lease_context_id` | Absent from runtime/modules/schema | N/A | No | No | No | No | `NOT_IMPLEMENTED` |
| `resident_context_id` | Absent from runtime/modules/schema | N/A | No | No | No | No | `NOT_IMPLEMENTED` |
| `tenant_context_id` | No repository implementation found | N/A | No | No | No | No | `NOT_IMPLEMENTED` |
| occupancy session identity | No authoritative runtime record; only `wrote_occupancy_session:false` proof | N/A | No | No | No | No | `NOT_IMPLEMENTED` |
| `tenant_card_id` | Persistent in legacy transaction/deposit/arrears paths, but card-dependent | Not resident/stay unique | No | No | Changes with card | Yes | `FORBIDDEN / UNSUITABLE` |
| `customer_id` / `customer_code` | Legacy/direct-view fields | Not proven unique or stable | No | No | No | Yes/partial | `FORBIDDEN / UNSUITABLE` |
| bed / room | Location only | Reused by multiple stays | No | No | Changes on transfer | Yes | `FORBIDDEN AS IDENTITY` |
| TTLock MMDD | Month/day context without year | Not unique | No | No | Context only | Yes/partial | `FORBIDDEN AS IDENTITY` |
| Access Snapshot/provider candidate ID | Snapshot identity derived partly from provider/card metadata | Snapshot-only | No | No | No | Provider-dependent | `FORBIDDEN AS BUSINESS IDENTITY` |
| `old_tenant_context` / `old_ttlock_context` | Transfer context fields only | Unknown | No | No | No | Partial | `UNSUITABLE / NOT A FACT IDENTITY` |

## 4. CANDIDATE_EVIDENCE

### 4.1 `stay_context_id`

- Server-managed fields are rejected from employee input: `deploy-worker/src/index.js:2690-2715`.
- Only Rent and Deposit In with explicit `stay_action=start` request genesis: `modules/employees/durable-stay-genesis-trigger.mjs:1-44`.
- Server UUID v4 generation and active genesis preparation: `modules/employees/durable-stay-persistence.mjs:39-98`.
- Canonical-first injection into `sessions.entries_json`: `deploy-worker/src/index.js:2796-2810`, `3422-3464`.
- Registry persistence exists only for genesis: `modules/employees/durable-stay-persistence.mjs:188-276`.
- Canonical stay gateway recognizes only active Rent/Deposit In genesis: `modules/employees/canonical-stay-bed-context.mjs:54-75`.
- Different active stay IDs fail closed, but no Transfer/Checkout lifecycle implementation is present: `modules/employees/canonical-stay-bed-context.mjs:101-151`.

Conclusion: technically durable for a narrow new-genesis slice, but not yet a complete stay identity lifecycle.

### 4.2 `occupancy_candidate_id`

- Preview emits `occupancy_candidate_id`: `deploy-worker/src/index.js:2355-2368`.
- Preview is `dry_run_preview_only`, `no_write`, `not_persisted`, and says a migration is required for a durable ID: `deploy-worker/src/index.js:2371-2389`.
- Uploaded metadata labels the candidate `non_authoritative`, `not_durable`, `not_final_identity`, and `not_used_for_matching`: `deploy-worker/src/index.js:2420-2434`.

Conclusion: explicitly unsuitable.

### 4.3 Session and event identities

- `sessions.id`/`session_id` identify an employee batch/archive session; canonical anchor extraction applies the same session ID to its contained entries: `deploy-worker/src/index.js:4355-4373`.
- `event_id`/`anchor_id` are normalized per event: `deploy-worker/src/index.js:3921-3932`.
- Duplicate and sync matching use event/source/canonical fingerprints, not a continuous stay identity: `deploy-worker/src/index.js:4073-4163`.

Conclusion: durable event/archive references, not resident/stay identity.

## 5. EVENT_IDENTITY_AUDIT

| Domain | Current identification behavior | Stay suitability |
|---|---|---|
| Rent | Canonical session/entry/event/anchor IDs, bed, period, payment fields; optional `stay_context_id` only when explicit genesis is requested. Legacy transaction rows may contain `tenant_card_id`. | Partial only for new explicit genesis. |
| Arrears | Canonical arrears item/task/ref plus source session/entry/event/anchor and bed. Arrears identity is item-specific, not stay-wide. | Unsuitable as stay ID; future events must link to stay separately. |
| Deposit In/Out | Canonical event/anchor and bed; legacy `deposit_ledger` is keyed by `tenant_card_id`. TTLock D is current deposit fact, not identity. | No stable stay identity across all deposit paths. |
| Checkout / Left With Arrears | Canonical event/anchor/session, bed, checkout fields, optional original session/event refs. No runtime update closes `stay_context_id`. | Semantic close event exists; durable close is not implemented. |
| Owner History | Reads company-scoped `sessions`, canonical `entries_json` anchors, transactions, and additive correction rows. It identifies archive sessions/events, not a current resident stay. | Cannot currently derive complete A -> B -> C stay lineage. |
| Bed Context / Occupancy | Derives status primarily by bed and latest canonical events/Access Snapshot. It can expose `stay_context_id` only for recognized active genesis anchors. | Partial; current-bed transfer lineage is absent. |
| Finance | Scans active canonical session anchors and correction-effective totals. It counts event anchors but has no stay-lineage dedup domain. | Event-level authority exists; lineage-specific dedup is not implemented. |

Evidence:

- event-specific normalization: `deploy-worker/src/index.js:3921-3970`
- canonical archive extraction: `deploy-worker/src/index.js:4355-4373`
- Owner History list/detail: `deploy-worker/src/index.js:11097-11142`
- Finance active-anchor projection: `deploy-worker/src/index.js:9426-9517`
- generic session void behavior: `deploy-worker/src/index.js:10969-11069`

## 6. CHECKIN_AND_CHECKOUT_BOUNDARIES

### Check-in

- Business-semantic accepted check-in boundary: defined by the new contract.
- Current technical trigger: explicit `stay_action=start` on Rent or Deposit In.
- Reliability: `PARTIAL` because the final accepted-checkin event vocabulary and occupancy/no-active-stay proof are not locked.

### Checkout

- Canonical Checkout event and validation: present.
- Draft closed-state columns: present in `migrations/008_durable_stay_context.sql:1-58`.
- Runtime lifecycle closure: absent.
- Reliability: `PARTIAL`; the event boundary exists, but it cannot currently close the durable stay.

## 7. COMPANY_SCOPE

- Current identity and gateway code consistently use `corpid`.
- Draft registry schema scopes context and event links by `corpid`: `migrations/008_durable_stay_context.sql:1-104`.
- Canonical employee sessions and Owner History queries are company-scoped.

Conclusion: company scope identity is known; cross-`corpid` stay or transfer linkage is forbidden.

## 8. LEGACY_DATA

- Legacy records generally have no `stay_context_id`.
- Reconstructing their resident identity would require bootstrap/backfill or guessing from bed/card/provider fields.
- Human decision is `LEGACY_BOOTSTRAP = REJECTED_FOR_PHASE1`.
- Legacy lineage therefore remains `UNKNOWN` or `OWNER_REVIEW_REQUIRED` and is excluded from new Phase 1 transfer identity.

## 9. STOP_CONDITION_MATRIX

| Stop condition | Result | Effect |
|---|---|---|
| No reliable check-in boundary exists | `PARTIAL / TRIGGERED FOR RUNTIME` | Exact accepted-checkin contract requires human review before implementation. |
| Checkout cannot close a stay | `TRIGGERED` | Runtime Checkout lifecycle closure is absent. |
| Current data uses only bed number as identity | `PARTIAL` | Most legacy events lack stay identity; new genesis slice prevents claiming a total absence. |
| Durable identity necessarily requires migration | `TRIGGERED IN CURRENT IMPLEMENTATION` | Current writer requires unapplied `008` tables; contract does not approve migration. |
| Multiple candidate identities conflict | `NOT TRIGGERED` | Only `stay_context_id` is suitable; all others are rejected or event-only. |
| Company scope identity is unknown | `NOT TRIGGERED` | `corpid` is the authority. |
| Legacy data would require bootstrap | `TRIGGERED BUT EXCLUDED` | Bootstrap is rejected; legacy remains unknown and cannot enter Phase 1 lineage. |

## 10. VERIFICATION_RESULT

- audit result: `PARTIAL_PASS`
- stable stay identity currently exists: `partial`
- transfer lineage contract defined: `PASS`
- original-event bed immutability rule defined: `PASS`
- Finance deduplication rule defined: `PASS`
- void/reversal lineage rule defined: `PASS`
- runtime implementation authorized: no
- human review required: yes
- Bed Transfer write enabled: no
- Bed Transfer status: `NOT_VERIFIED / REQUIREMENTS_REVIEW`
- production cutover: `PRODUCTION_NO_GO`

Recommended next task: `HUMAN_REVIEW_NEW_STAY_CHECKIN_CHECKOUT_AND_PERSISTENCE_BOUNDARIES`.
