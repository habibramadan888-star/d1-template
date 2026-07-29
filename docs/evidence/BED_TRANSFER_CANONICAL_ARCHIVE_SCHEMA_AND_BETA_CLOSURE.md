# Bed Transfer Canonical Archive Schema and Beta Closure

Date: 2026-07-13 (Asia/Dubai)

Task: `HOMELINK_CANONICAL_ARCHIVE_SCHEMA_AND_BETA_CLOSURE_033`

## Baseline and production control plane

- Repository baseline: `0dba2fdfb8d7cb45dfa72fa162c5f4d39bae1b3f` on `fix/bed-transfer-canonical-write-closure`, clean.
- Production Worker deployment before and after: `fe0d6788-5f00-488a-85c8-5cb336750318` at 100%.
- Production traffic changed: no.
- Production cutover: `PRODUCTION_NO_GO`.
- Migration applied: no. Migration 008 was not executed.

## Remote schema and orphan preflight

- Initial `PRAGMA table_info(sessions)`: 21 columns; `entries_json` absent.
- Initial sessions row count: 102.
- Exact orphan: `S20260713-33wt2`; canonical anchor count 0 and Finance/Deposit/Arrears/ledger/entry-event associations all 0.
- Exact soft void updated one row only:
  - `handover_status=VOID`
  - `soft_voided=1`
  - `void_reason=CANONICAL_ARCHIVE_PERSISTENCE_FAILURE_CLEANUP`
  - `void_source=HOMELINK_CANONICAL_ARCHIVE_SCHEMA_AND_BETA_CLOSURE_033`
- Authorized SQL executed once: `ALTER TABLE sessions ADD COLUMN entries_json TEXT;`
- Final `PRAGMA table_info(sessions)`: `entries_json` is column 21, type `TEXT`, nullable.
- Existing row count remained 102 immediately after the ALTER and all 102 existing values were NULL.

## Canonical persistence closure

- Missing `sessions.entries_json` now returns `CANONICAL_ARCHIVE_SCHEMA_UNAVAILABLE` before insert and creates no Session shell.
- Canonical Bed Transfer uses an explicit Session insert containing `entries_json`; dynamic column dropping is not used.
- Post-insert verification rereads the Session and checks parseability, transfer anchor, request fingerprint, `from_bed`, and `to_bed`.
- A post-insert mismatch never returns success and precisely soft-voids the new shell.
- Archive decoding preserves server-generated transfer identity and additive void evidence without widening the client payload allowlist.

## Controlled Beta live loop

- Preview alias: `owner-post-login-fc6b1cd-homelink-finance.habibramadan888.workers.dev`.
- Temporary Preview version used for the final closure: `c491a54c-a016-4e0d-a017-03bfe3d48098` (0% production traffic).
- Validate-only 146 to 111: passed; source was occupied/not-marked-vacant, target was E/e vacant, fee waived, no write.
- Canonical write created exactly one Session: `S20260713-58ik4`.
- Transfer anchor: `9e154cfd-aabc-45ef-9d70-1b41c5b6e4fc`.
- Transfer lineage: `a539b2e8-eeb1-495f-b34a-f1593bc47f28`.
- Persisted `entries_json`: parseable, one Bed Transfer entry, 146 to 111, fingerprint `bt-65ff74f7`, owner-confirmed legacy genesis, waived amount 0.
- Retry created no second Session or transfer anchor. The UI retry was safely rejected as an idempotency conflict after the accepted context changed; the exact transfer Session count remained 1.
- Legacy transaction and Bed Transfer event rows: 0.

## Additive void and projections

- Owner additive void Session: `owner-tf-void-session-1s616a7`.
- Void anchor: `owner-tf-void-anchor-1s616a7`.
- Target transfer anchor: `9e154cfd-aabc-45ef-9d70-1b41c5b6e4fc`.
- Original transfer remained raw and was not hard-deleted or mutated.
- Owner History after void: historical bed 146, effective current bed 146, raw transfers 1, effective transfers 0.
- Finance after a fresh reload: transfer fee income 0, bed-price-difference income 0, raw transfers 1, effective transfers 0. Rent income for the compared gateway window remained 5,370.
- Controlled-record Deposit rows: 0.
- Controlled-record Arrears rows and Arrears task rows: 0.
- Controlled-record entry-event rows: 0.
- Today Todo after void contained no `BED_TRANSFER_TTLOCK_MOVE_REQUIRED` item.
- TTLock was not modified.
- Final Session count: 104, consisting of the original 102 rows plus one raw transfer Session and one additive void Session; `entries_json` was non-NULL only on those two new rows.

## Preview safety restoration

- Final safe Preview version: `6afe879e-2f98-4aff-8482-9f60427b53ea`.
- `BED_TRANSFER_WRITE_APPROVED=false`.
- `BED_TRANSFER_LEGACY_GENESIS_ALLOWLIST=false`.
- `BED_TRANSFER_VOID_APPROVED=false`.
- `OWNER_TODAY_TODO_ACK_ENABLED=false`.
- Employee Record Transfer button was verified disabled with `aria-disabled=true` after the safe alias refresh.

## Tests

- Canonical archive/void/Owner lineage/Finance/Todo focused tests: 61/61 passed.
- All Bed Transfer-named specifications: 347/347 passed.
- Other six Employee event dispatch/template isolation: 19/19 passed.
- JavaScript syntax checks and Wrangler build/upload checks passed.

## Final classification

- Production schema changed: yes, exactly one nullable `entries_json TEXT` column.
- Production raw archive changed: yes, one controlled transfer plus one additive void; the orphan was precisely soft-voided.
- Production business data changed: yes, as explicitly authorized for this controlled Beta loop.
- Production effective business delta: 0.
- Migration applied: no.
- Production traffic changed: no.
- Bed Transfer status: `LIVE_VERIFIED_CONTROLLED_BETA_SCOPE`.
