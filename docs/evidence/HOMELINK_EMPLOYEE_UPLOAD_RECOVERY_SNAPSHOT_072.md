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
