# Bed Transfer Current Code and Write Path Audit V1

Status: `NOT_VERIFIED / REQUIREMENTS_REVIEW`

Scope: repository facts only. No production API was called, no runtime file was modified, and no production data was written.

## 1. Repository and Ancestry Evidence

| Item | Observed fact |
|---|---|
| Repository root | `C:/Users/Chinalink/Desktop/软件迭代` |
| Branch before audit | `chore/bed-transfer-production-dry-run` |
| HEAD before audit | `1c61104b3a6efe61e5a7342229d3eb4bfcf5268f` |
| Deployed commit object | `ba9584fed13200a422f72433eed2c455f2c06316` exists locally |
| Safety commit ancestry | `d7be5160ef97dcd20975eb504018eaf386877e10` is an ancestor of `ba9584...` |
| HEAD relation | HEAD is one commit ahead of `ba9584...`; the extra commit is the dry-run documentation commit |
| Uncommitted files before audit | Seven modified root documents; three untracked root/docs documents; the existing dry-run doc and test were modified |
| Merge/rebase state | No in-progress state observed |

The current branch is not the requested baseline branch. No branch switch was performed.

## 2. Route and Write-Path Facts

### Route matrix

| Route | Handler | Current facts | Archive/bypass risk |
|---|---|---|---|
| `POST /api/employee/entry/validate` | `handleEmployeeEntryValidate` at `deploy-worker/src/index.js:3005-3038` | Parses JSON and calls `validateEmployeeEntryUploadPayload`; returns read-only preview and occupancy candidate preview | Does not write D1 in the handler; validation reads D1/Gateway context |
| `POST /api/employee/entry` | `handleEmployeeEntry` at `deploy-worker/src/index.js:3039-3358` | Applies TF/TFF write gate, validates, then writes `sessions`, `transactions`, arrears/deposit side effects, and `entry_events` | Writes canonical `sessions.entries_json`; legacy transaction path remains separate from `bed_transfer_events` |
| `POST /api/employee/bed-transfers` | `handleEmployeeBedTransferCreate` at `deploy-worker/src/index.js:7718-7902` | Fail-closed gate precedes role/schema/body parsing; writes `entry_events` and `bed_transfer_events` in one D1 batch | Does not write `sessions.entries_json`; separate archive path can diverge from Employee Entry archive |

### `/api/employee/entry/validate`

- Event dispatch: `employeeEntryUploadType` at `:2662-2692`; `bed_transfer` maps to `TF`, `bed_transfer_fee` maps to `TFF`.
- Generic event validator: `validateEmployeeEntryUploadEventFields` at `:2641-2660`.
- Phase 1 validator: `validateEmployeeBedTransferPhase1` at `:2606-2639`.
- Strict Bed Context reads use `canonicalBedContextGateway(... strict_access_snapshot:true)` at `:2614-2615`.
- Source firewall/normalization is performed through `normalizeEntryAnchor` and the event-specific validation/anchor paths; the pure Phase 1 contract recursively rejects forbidden identity keys.
- No write is performed by this route.

### `/api/employee/entry`

- The TF/TFF fail-closed write gate is at `:3044-3047`.
- Validation runs at `:3048-3050` before the legacy write path.
- Duplicate-by-entry-id check is at `:3097-3111`; broader duplicate guard is run by validation earlier.
- `sessions.entries_json` and `sessions.export_text` are built at `:3217-3247`.
- `transactions` is inserted at `:3248-3269`.
- Arrears task creation is Rent-specific at `:3280-3316`; AP reconciliation is at `:3317-3320`.
- `entry_events` create audit is written at `:3342`.
- For TF, this route is currently blocked unless `BED_TRANSFER_WRITE_APPROVED` is exactly `"true"`.

### `/api/employee/bed-transfers`

- `bedTransferWriteApproved` at `:7703-7706` accepts only exact trimmed string `true`.
- Gate response is HTTP 409 and `bed_transfer_write_disabled_phase1_safety` at `:7707-7715`.
- Auth/role check follows the gate at `:7719-7722`.
- Request normalization accepts `from_bed/bed_from/fromBed/room` and `to_bed/bed_to/toBed/room_to` at `:7725-7726`.
- Idempotency requires a key and hashes a stable request payload at `:7731-7767`.
- Snapshot is read by `bedTransferEventSnapshot` at `:7632-7651`; it reads transactions and arrear tasks.
- The write is a D1 batch inserting `entry_events` and `bed_transfer_events` at `:7889-7897`.
- The response contains a `session_entry` object, but there is no `sessions` insert or `entries_json` write in this handler.

### Schema and archive evidence

- `EMP_SESSION_COLUMNS` includes `entries_json` at `deploy-worker/src/index.js:1132-1137`.
- `BED_TRANSFER_EVENT_COLUMNS` includes a dedicated transfer table at `:1146-1155`.
- `entry_events` schema is created at `:1268-1280`.
- `bed_transfer_events` is checked by `bedTransferRequiredTablesReady` at `:7564` and queried by owner routes at `:7907-7956`.
- Canonical archive projection prefers `sessions.entries_json` and only falls back to export text when needed; relevant code is around `:4112-4125`, `:4353-4369`, and `:9353-9364`.

## 3. Current Bed Transfer Contract Facts

| Area | Current code fact | Evidence |
|---|---|---|
| Event types | `event_type=bed_transfer` -> `TF`; `bed_transfer_fee` -> `TFF` | `employeeEntryUploadType`, `:2662-2692` |
| Bed aliases | `from_bed`, `bed_from`, `room`; target `to_bed`, `bed_to`, `roomTo`/`room_to` depending on path | `:2610-2612`, `:2570-2571`, `:7725-7726` |
| Generic required fields | from bed, to bed, transfer date, transfer reason | `validateBedTransferUploadFields`, `:2567-2581` |
| Phase 1 fee fields | `fee_choice`, `fee_amount_aed`, `fee_amount_fils`, `payment_method`, `waiver_reason` | `modules/employees/bed-transfer-phase1-contract.mjs:104-124` |
| Charged fee | Exactly 50 AED / 5000 fils in pure Phase 1 contract; generic legacy validator only checks positive amount | module `:110-116`; `index.js:2875-2879` |
| Waived fee | Exactly zero amount and non-empty waiver reason in pure contract | module `:117-122` |
| Same bed | Rejected | module `:100-102`; `index.js:2573` |
| Source vacancy | Source must be non-vacant and `access_snapshot_no_E` in Phase 1 | module `:134-138` |
| Target vacancy | Target must be vacant, E-marker sourced, and parsed marker true | module `:140-141` |
| Snapshot quality | Missing, fallback, stale, ambiguous, conflict, or candidate count not equal to one is rejected | module `:43-67`, `:129-131` |
| Source D | Missing/ambiguous source D rejected; zero is accepted if represented as a valid numeric value | module `:143-147` |
| Company scope | `company_scope` must equal source and target context scope | module `:149-153` |
| Rent coverage | Both absolute `YYYY-MM-DD` start/end values required in source context | module `:155-158` |
| Existing arrears | Zero allowed; one requires exact ref/full remaining; more than one rejected by Phase 1 contract | module `:160-172` |
| Forbidden fields | Pure contract recursively rejects provider identity keys; independent write route still stores `tenant_card_id` and `old_ttlock_ref` fields | module `:1-10`; `index.js:7802-7806`, `:7832-7834` |
| Entries JSON | `/api/employee/entry` produces structured entries JSON; independent transfer route does not | `index.js:3217-3247`, `:7858-7897` |

The generic upload validator runs before the strict Phase 1 Gateway. The current code therefore has two layers with different fee normalization and different write/archive behavior.

## 4. TTLock E/e Vacancy Audit

### Parser

- Backend parser: `parseAccessCardRemark` at `deploy-worker/src/index.js:3566-3616`.
- Shared parser module: `modules/properties/access-snapshot.mjs:58-125`.
- Both use an independent-token check equivalent to `/^[Ee]$/`; arbitrary `e` inside a word is not a vacancy marker.
- Output states include `vacant`, `not_marked_vacant`, `unknown`, and `missing_access_snapshot`; strict gateway metadata separately records `fallback`, `candidate_count`, `ambiguous`, `conflict`, and `stale`.
- Empty remark produces `unknown` / `missing_access_snapshot`; missing bed produces `unknown` or `unparsed`.
- Strict Access Snapshot rejects upstream error, fallback, ambiguous candidate count, and conflict at `:1548-1562`.
- Duplicate candidates are represented as ambiguity/conflict and rejected in strict mode.
- Residual D/MMDD on an E/e remark is parsed as deposit/MMDD context while physical status remains vacant. The code does not adopt target D as incoming resident state in the Phase 1 contract.
- Provider metadata is retained as explicitly non-authoritative metadata, but separate transfer snapshot code still uses card-derived values as customer fields; this is a current conflict.

## 5. TTLock Expiry Audit

| Question | Current fact |
|---|---|
| Upstream API | `/v3/identityCard/list`, loaded by `loadLockCards` at `deploy-worker/src/index.js:1025-1110` |
| Response field | Raw `card.endDate`; copied as `endDate: card.endDate || 0` at `:1097-1103` |
| Raw type | Not contract-validated in source; code accepts a numeric-like value or zero |
| Seconds vs milliseconds | Frontend `dateFromAny` treats 10-digit values as seconds and 13-digit values as milliseconds at `employee-v3.html:3594`; source does not prove upstream unit |
| Timezone | Backend source timezone is unspecified; frontend uses browser-local `Date` getters |
| Display | `normalizeCard` maps `endDate`/aliases to `end`; UI reads `end`, `end_date`, `valid_until`, or `validTo` at `employee-v3.html:3938-3950` |
| Precision | Frontend display conversion emits date only, so hour/minute/second are not preserved in the employee card model |
| Creation time | Used for transaction/session ordering and metadata in other paths; not proven as the lock expiry source |
| Card ID / 99099 | Card ID is used in current matching and transfer snapshot identity fields; provider phone/99099 is retained as non-authoritative metadata in Access Snapshot; this conflicts with the accepted contract |
| One month | Frontend `addMonths` at `employee-v3.html:3589` clamps month overflow to the last valid day; backend `empAddMonths` at `index.js:1366-1375` does the same for date-only strings |
| 15-day | Frontend uses `addDays(...,14)` for an inclusive 15-day period; backend uses `empAddDays(...,14)` for validation |
| Custom | Frontend calculates `customDays - 1`; backend validates custom day count and uses `periodDays - 1` |
| Transfer | No proven implementation that copies a live TTLock expiry unchanged from A to B; direct route stores `old_lock_valid_until` from transaction/task date fields and leaves new expiry empty |

Exact raw timestamp unit, source timezone, and a full timestamp-preserving transfer path are `UNKNOWN`.

## 6. 948 Coverage Conflict Audit

Classification: `UNKNOWN`.

Proven source paths:

- `canonicalOccupancyGateway` obtains canonical archive events and arrears at `index.js:4646-4652`.
- `canonicalOccupancyProjectStatus` identifies latest Rent/Transfer events at `:4598-4615`.
- Returned coverage is `current_rent_coverage_start` and `current_rent_coverage_end` at `:4674-4675`.
- Start comes from latest transfer-in `rent_period_start`, otherwise latest Rent `rent_period_start`.
- End comes from latest transfer-in `rent_period_end`, then `rent_coverage_carryover`, otherwise latest Rent `rent_period_end`.
- Active archive reads prefer `sessions.entries_json`; voided sessions are filtered in canonical fetch paths unless audit mode requests them.
- Phase 1 validator reads only the strict Bed Context response passed into `source_context` and returns `BED_TRANSFER_RENT_COVERAGE_REQUIRED` when either date is absent.
- No repository fixture proves a valid 948 coverage response with the two earlier dates. The current test fixture uses 2026-08-01/2026-09-01 for a synthetic source context, not bed 948.

The two observed 948 results cannot be classified as gateway omission, fixture-only dates, version/void change, or a wrong prior claim from repository facts alone. No production call was made.

## 7. Stay / Occupancy Identity Audit

- No durable `stay_context_id`, `lease_context_id`, `occupancy_episode_id`, `resident_context_id`, or `canonical_occupant_id` implementation was found.
- `occupancy_candidate_id` exists in read-only candidate preview paths (`index.js:2352`, `:2419`) and is explicitly transitional/non-durable in the surrounding architecture docs/tests.
- Independent transfer snapshot uses `transactions.tenant_card_id` or `arrear_tasks.tenant_card_id` as `customer_id`, `customer_code`, and `old_ttlock_ref` at `:7572-7613`.
- No stable stay identity creation/end/continuation across transfer was found.
- Checkout closes business state by event/task behavior, but no durable stay context is closed.

Result: `BLOCKED_BY_MISSING_STAY_IDENTITY` for immutable transfer lineage.

## 8. Arrears Support Audit

Observed source types and paths:

- `employee_entry_short_paid` is created for Rent shortfall at `index.js:3304-3312`.
- `left_with_arrears` is materialized by `empApplyLeftWithArrearsMetadata` and included in canonical projection around `:4214-4235` and `:4287-4296`.
- `cloud_arrears_projection` is the default canonical projection source.
- `ttlock_expired_unpaid` exists in the reminder/materialization path, not as a proven Bed Transfer fee-arrears source.
- `bed_transfer_fee_arrears` and `bed_price_difference_arrears` were not found as created source types.

Current capability:

- Rent short-paid: implemented.
- Left With Arrears: partial, event/task path exists.
- Multiple open arrears: Canonical Arrears Gateway can expose multiple items, but Phase 1 Bed Transfer rejects more than one and the independent transfer snapshot sums amounts only (`:7616-7630`).
- All-arrears identity-preserving carryover: not implemented in the independent write path.
- Exact full repayment: generic Arrears Payment validates against an open projection item and remaining amount; no transfer-fee-specific exact AED 50 rule was found.
- Transfer-fee arrears and no-partial repayment: not implemented/proven.
- Finance classification after transfer-fee repayment: not proven because no transfer-fee arrears source is created.

## 9. Finance Audit

- Canonical Finance Projection maps `bed_transfer` / `bed_transfer_fee` to `bed_transfer_fee` at `index.js:9324-9330`.
- A positive non-waived fee contributes inflow and `bed_transfer_fee`; it does not contribute Rent income.
- Deposit, Rent, Arrears Payment, Expense, and Deposit Out have separate branches at `:9298-9323`.
- The owner overview category aliases map `TF` to `bed_transfer_fee` at `:9842-9851`.
- The independent transfer route always creates a fee-shaped event: charged defaults to 5000 fils, waived uses zero, and category is `bed_transfer_fee` at `:7742-7751`.
- A pure zero-money transfer through the Employee Entry path is not shown to create a Finance amount; the independent route is fee-shaped even when waived.

`TRANSFER_WITHOUT_MONEY_FINANCE_ZERO`: `UNKNOWN` across both active code paths.

## 10. Void, Reversal, Correction, and Sync Audit

- Owner session delete route is `/api/delete_session` at `index.js:10895-10988`.
- It marks `sessions` void and updates related `transactions`, `arrear_tasks`, `deposit_ledger`, and legacy `arrears` in a D1 batch.
- It does not update `bed_transfer_events` or create a transfer-specific reversal/correction anchor.
- Owner correction infrastructure exists, but no transfer-specific correction/reversal lineage recomputation was proven.
- Canonical projections exclude voided sessions/transactions in active modes and can read correction/void/reversal sources, but the independent transfer table is not shown to be included in that archive path.
- Sync State reads employee archive/session identifiers; no direct transfer-table reconciliation path was found.
- Today Todo/occupancy warnings can be generated from canonical sessions/anchors; the independent transfer route does not write `sessions.entries_json`, so its Todo/occupancy participation is not proven.

Result: `PARTIAL` void/reversal support; transfer-specific restoration and Sync State are not implemented/proven.

## 11. Company Scope and Authorization

- Employee API route is authenticated before `handleEmployeeApi` dispatch.
- Staff role is checked in the direct transfer handler at `:7719-7720`.
- Phase 1 contract checks `company_scope` against source and target context scope at module `:149-153`.
- The direct `/api/employee/bed-transfers` route sets `corp_id` and `tenant_scope` from `user.corpid` but does not perform the same strict source/target Bed Context contract before writing.
- `property_id` is carried in Access Snapshot context, but no cross-apartment authorization rule was proven.

Result: `PARTIAL`. Same-company scope is explicit in the pure validator, but independent write authorization is not equivalent and property scope is unresolved.

## 12. Concurrency and Idempotency Audit

- Independent transfer route requires `idempotency_key` and stores request hash through `request_idempotency_keys` helpers at `:7731-7767`.
- The two transfer writes are a D1 batch at `:7889-7897`.
- Idempotency recording occurs after the event batch at `:7898-7899`; no single transaction boundary covering both was proven.
- No unique target-bed occupancy constraint or target snapshot version check was found.
- No lock/recheck is shown between validation and write.
- Two employees can race for the same target unless an external database constraint not shown here intervenes.
- `/api/employee/entry` has duplicate/fingerprint checks and existing transaction ID handling, but TF write is safety-gated and does not provide a complete transfer concurrency proof.

Result: `PARTIAL` idempotency; target/concurrent-transfer protection is not proven.

## 13. Current Conflicts and Risk Classification

1. `CRITICAL`: independent transfer writes bypass `sessions.entries_json` and therefore bypass the canonical Employee Entry archive path.
2. `CRITICAL`: independent transfer snapshot derives customer identity and `old_ttlock_ref` from `tenant_card_id`.
3. `CRITICAL`: no durable stay identity exists; bed number/card metadata cannot safely establish lineage.
4. `HIGH`: Phase 1 strict validator supports one exact arrears item, while the independent path sums arrears without preserving all references.
5. `HIGH`: direct transfer route does not show strict source/target E/e validation before write.
6. `HIGH`: transfer-specific void/reversal/correction recomputation is not proven.
7. `HIGH`: expiry source unit/timezone and timestamp-preserving transfer are unresolved.
8. `MEDIUM`: generic Employee Entry TF contract and independent transfer fee contract use different aliases and normalization.
9. `MEDIUM`: target-bed concurrent write protection is not proven.
10. `MEDIUM`: 948 coverage discrepancy cannot be classified from repository evidence.

## 14. Verification Conclusion

- Current Bed Transfer status: `NOT_VERIFIED / REQUIREMENTS_REVIEW`.
- No production endpoint was called.
- No runtime code, UI, migration, or embedded worker was changed.
- No production data changed.
- The user-accepted contract is recorded separately from current code facts and conflicts.
