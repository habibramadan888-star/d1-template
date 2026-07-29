# Homelink Employee Upload Recovery Snapshot 072

Captured: 2026-07-16 Asia/Dubai

## Safety boundary

- Target session: `S20260713-jkqj7`
- Snapshot sources: authenticated Employee Current Session visible DOM and exact, read-only production D1 queries.
- Browser credentials, cookies, tokens, provider identity, phone numbers, and raw access metadata were not read or recorded.
- Direct browser localStorage extraction was not performed because the browser-control safety boundary forbids inspecting browser storage. The visible Current Session, header, and sticky summary each reported 13 records.
- No formal upload or business write had been executed at snapshot time.

## Current Session parity

- Visible record cards: 13
- Current Session header: 13
- Sticky summary: 13
- Visible transfer: `112 -> 111`, Due AED 50.00, Paid AED 50.00, Cash, reason `room_issue`
- Target server session status: `EXPORTING`
- Target server archive entries: 7
- Existing Bed Transfer anchors in target session: 0

## Stable identity recovery set

| Entry ID | Event type | Visible/client state at snapshot | Server persistence fact |
|---|---|---|---|
| `E20260715-645lm` | Bed Transfer | Validation Passed | Missing / write pending |
| `E20260715-3twpg` | Deposit In | Validation Passed | Persisted |
| `E20260715-3t7pv` | Arrears Payment | Validation Passed | Persisted |
| `E20260715-2m4w7` | Deposit In | Validation Passed | Persisted |
| `E20260715-z765y` | Expense | Stale prior unauthenticated diagnostic | Persisted |
| `E20260715-z6no4` | Left With Arrears | Validation Passed | Persisted |
| `E20260715-z50uq` | Deposit Out | Validation Passed | Persisted |
| `E20260715-z4e5u` | Deposit In | Validation Passed | Persisted |
| `ent20260713-jkqj8-05` | Rent | Synced | Persisted |
| `ent20260713-jkqj8-04` | Rent | Synced | Persisted |
| `ent20260713-jkqj7-03` | Deposit In | Synced | Persisted |
| `ent20260713-jkqj7-02` | Deposit Out | Synced | Persisted |
| `ent20260713-jkqj7-01` | Expense | Synced | Persisted |

## Recovery invariant

- Expected identities: 13
- Already persisted identities: 12
- Missing identities: 1
- Only authorized pending identity: `E20260715-645lm`
- Duplicate Entry IDs observed: 0
- The twelve persisted identities must not be re-written, deleted, or voided.
- Only the missing Bed Transfer may enter the formal write stage after all thirteen aggregate validation results are matched by stable Entry ID.

## Post-write anomaly and mandatory rollback

The target-session-only preflight reported no transfer anchor, but the post-write Owner projection exposed an older standalone canonical transfer session that already represented the same stable business request:

| Session | Entry identity field | Transfer anchor | Fingerprint | Business fields | Effective state at discovery |
|---|---|---|---|---|---|
| `bed-transfer-E20260715-645lm-S20260713-jkqj7` | Missing in legacy anchor | `046190bb-e111-46e0-8d61-abfcac46823f` | `bt-02d88a84` | 112 -> 111, paid AED 50, cash, `room_issue` | Effective |
| `S20260713-jkqj7` | `E20260715-645lm` | `0f369f3c-9fc0-492a-b5eb-f5c5e98f9cea` | `bt-02d88a84` | 112 -> 111, paid AED 50, cash, `room_issue` | Effective |

- The two anchors have the same canonical business fingerprint and represent a duplicate effective business write.
- The older anchor was not included in the original target-session-only missing-identity classification because its legacy archive entry omitted `entry_identity`, even though its derived Session ID contains the expected Entry and target Session identifiers.
- The recovery Worker was immediately rolled back from `2394c82a-617f-44f5-abdf-0c627ffa1c2b` to `62e75662-d1fa-4209-91b9-df685cd38207` after discovery.
- No hard delete, void, correction, TTLock change, or further business write was performed after discovery.
- The new duplicate anchor remains raw and effective in D1 until the Owner explicitly authorizes an additive void/correction. Worker rollback does not revert D1.
- Task 072 must remain `PARTIAL`; production business data changed and requires a separately authorized, exact cleanup.

## Authorized duplicate cleanup and idempotency closure

Completed: 2026-07-16 Asia/Dubai

The Owner authorized exactly one additive void for the newer duplicate transfer and required the older canonical transfer to remain effective.

### Exact additive void

| Field | Verified value |
|---|---|
| New duplicate target | `0f369f3c-9fc0-492a-b5eb-f5c5e98f9cea` |
| Preserved active anchor | `046190bb-e111-46e0-8d61-abfcac46823f` |
| Void session | `owner-tf-void-session-d0dc8e71-4cee-4d1e-87de-fcf2c6709227` |
| Void anchor | `owner-tf-void-anchor-2770d339-c773-4554-b451-98a2b25d5149` |
| Void fingerprint | `btv-c8bcd6d0` |
| Void event type | `void_transfer` |
| Void session status | `TRANSFER_VOID_APPLIED` |
| Hard delete | `false` |
| TTLock mutated | `false` |

The void was inserted as immutable canonical archive evidence. No original anchor was deleted or rewritten, and no transaction, arrears, deposit, TTLock, schema, migration, secret, D1 binding, or KV binding was changed.

### Post-cleanup canonical and Finance facts

- Canonical fingerprint `bt-02d88a84`: raw transfer count 2; effective transfer count 1.
- Raw transfer fee: AED 100; effective transfer fee: AED 50.
- `046190bb-e111-46e0-8d61-abfcac46823f`: active, effective AED 50.
- `0f369f3c-9fc0-492a-b5eb-f5c5e98f9cea`: voided, effective AED 0.
- Owner Finance effective Bed Transfer fee total returned from AED 150 before cleanup to AED 100 after cleanup, removing the duplicate AED 50 while preserving the older valid transfer.
- Target mixed Session `S20260713-jkqj7` remains `COMPLETED` with eight canonical entries.
- Today Todo shows exactly one `112 -> 111` TTLock transfer task; no duplicate task was introduced.

### Owner projection acceptance

- Owner History shows two separate `112 -> 111` business records: the old anchor as `ACTIVE` and the newer duplicate as `Voided / 已撤销`.
- Both cards show Due AED 50.00, Paid AED 50.00, and CASH.
- The standalone void session and void anchor are not rendered as independent business cards.
- The voided transfer Audit Trail contains both `0f369f3c-9fc0-492a-b5eb-f5c5e98f9cea` and `owner-tf-void-anchor-2770d339-c773-4554-b451-98a2b25d5149`.
- No `Detail Render Mismatch`, core 503, or authentication redirect loop was observed during repeated authenticated Owner navigation.

### Global fingerprint idempotency protection

Runtime commit `79d096f48e9435626b8fec9c67d54e5286bb242e` (`fix: enforce global transfer fingerprint idempotency`) adds fail-closed cross-Session canonical fingerprint checks to aggregate prevalidation and formal write:

- a prior effective anchor is recognized even when its legacy archive entry has no `entry_identity`;
- the same canonical business fingerprint returns existing/idempotent success without a second write;
- multiple effective matches fail closed before D1 mutation;
- a precisely voided duplicate is ignored while the preserved anchor remains the sole effective match;
- Entry ID remains stable for request/result association but is no longer the only persistence proof.

Focused tests: 62 passed, 0 failed. The set covered cross-Session fingerprint reuse, multiple-match fail-closed behavior, exact-void handling, authentication recovery, the 13-record mixed aggregate flow, Bed Transfer timeout and legacy-genesis regressions, TTLock call reduction, Exit Event zero external TTLock calls, Owner transfer void behavior, and Worker/Employee syntax. `git diff --check` passed.

### Production deployment closure

- Fixed runtime first deployed as `ce5ecd3e-fde6-4be0-9688-4c7e2d7e31a1`.
- Owner void gate was temporarily enabled only for the exact cleanup in `f126895d-97df-48fc-b4ce-d10efe5ab639`.
- Final production version is `84ee2023-f550-47e0-9e4f-3caa161a3431` at 100% traffic.
- Final version uses `APP_ENV=internal_beta`, preserves the existing D1/KV bindings, and does not contain `BED_TRANSFER_OWNER_VOID_ENABLED`; the temporary gate is closed.
- Production business data changed only through the authorized additive void. Raw audit history increased by one void anchor; the duplicate effective AED 50 impact was removed.
