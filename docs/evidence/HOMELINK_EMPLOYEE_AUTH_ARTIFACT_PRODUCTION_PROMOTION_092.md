# Homelink Employee Auth Artifact Production Promotion 092

- Task terminal state: `ROLLED_BACK`
- Source HEAD: `54affdf083ff4d6881a888c9f3b8f11931c14659`
- QA run: `QA-20260717-7A5AA4E6` (`FINAL_ACCEPTED`)
- Artifact SHA-256 expected/actual: `56dc1828134e29212aa7e7feca92be094365387e06926aa9c647af2f54f2ac66`
- Artifact byte identity: pass; the locked artifact directory was re-hashed and uploaded with Wrangler 4.94.0 using `--no-bundle`.
- Bundled Worker SHA-256 expected/actual: `21fa7b46ad3387145602692ecbcd90377487cba190ddc0eec04a8815378d52aa`
- Production version before / rollback target: `84ee2023-f550-47e0-9e4f-3caa161a3431`
- Candidate version: `3926f217-7a34-4e4c-a2a4-e8b98730c783`
- Production version after: `84ee2023-f550-47e0-9e4f-3caa161a3431` at 100%
- Candidate retained at 0% traffic after rollback.

## Configuration and isolation

- `APP_ENV=internal_beta` before, on the candidate, and after rollback.
- Production D1 binding: `562aa079-1cca-4176-ba3b-7276a65f98fb` (unchanged).
- Production KV binding: `c7c64d522d964baba2e72454e7262da9` (unchanged).
- Production secret names were preserved with `--keep-vars`; values were not read.
- `QA_ACCEPTANCE_ENABLED` was absent; the Production QA Acceptance page resolved to HTTP 404.
- No migration, schema change, QA binding, QA run, Production upload, or TTLock configuration change occurred.

## Employee preflight

- Authenticated role: STAFF.
- Current Session count: 1.
- Draft visible-content signature: `53c7aed8071afed89de91a7422f6b310635f40b116a35605e6664c9b0e8acbc6`.
- Seven event buttons: 7/7 present.
- Bed Transfer: visible, selectable, and available under `internal_beta`.
- No New Session, Reset, clear, saveDrafts, or Upload Session action was performed.

## Candidate validation and forced rollback

- Candidate uploaded at 0% and bindings/assets/APP_ENV/QA gate were verified before traffic promotion.
- Traffic reached candidate version 100% at `2026-07-17T20:27:16Z`.
- Ten consecutive Employee reloads preserved the visible draft count at 1 and never displayed a false `Current Session 0` or `No Records` state.
- All ten reloads remained in `Restoring session / 正在恢复登录`; stable `AUTHENTICATED` was not reached and write controls remained disabled.
- This met the mandatory Employee-auth rollback condition. No business write was attempted.
- Rollback began at `2026-07-17T20:28:42Z` and completed successfully.
- A fresh cache-busted Employee page on the rollback version restored `STAFF / 员工`, Current Session 1, all seven event buttons, and normal Bed Transfer availability.
- Candidate observation duration before rollback: approximately 86 seconds; the 15-minute observation was intentionally not continued after the hard failure.

## Data and health

- Production sessions before/after: `118 / 118`.
- Production transactions before/after: `3192 / 3192`.
- D1 verification reported `changes=0` and `rows_written=0`.
- Public root returned HTTP 200; Employee and Owner auth boundaries returned redirects; History, Finance, Arrears, and Today Todo returned bounded JSON 401 responses rather than 5xx/HTML.
- Authenticated Owner validation was not attempted because no reusable Production Owner session was available and rollback had already completed.
- Production business writes: 0.
- No TTLock/OAuth/Lock List/Identity Card call path was intentionally invoked by this task.

## Enterprise WeChat terminal notification

- Recipient contract: exact contact `张雨德`, confirmed as the logged-in user's own contact before sending.
- Required message: `任务结束：QA验收已完成；Production推广已回滚｜状态：ROLLED_BACK｜请查看Codex报告`
- Notification result: `PENDING_REQUIRED_ACTION_TIME_CONFIRMATION`; no message has been typed or sent.
