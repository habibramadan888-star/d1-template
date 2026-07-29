# Employee / Owner Storage Trace Audit

Task: trace why the employee-uploaded 2026-07-03 1520 AED session is not visible in owner history.

Scope: read-only audit. No code changes, no deploy, no production data writes, no migration.

## Executive Result

The employee upload and owner history are using the same Worker, D1 binding, D1 database, corpid, and session SOT.

The target session was written to production `sessions` with `corpid = homelink`, but it is currently marked voided:

- `id`: `S20260703-amv7l`
- `anchor_id`: `EMPV3-20260703-abdul-amv7l`
- `date`: `2026-07-03`
- `operator_name`: `阿布杜`
- `cash_handover`: `1520`
- `gross_received`: `1520`
- `entries_count`: `4`
- `handover_status`: `VOID`
- `voided_at`: `2026-07-03T19:49:55.331Z`

Owner history filters out voided sessions by design:

```sql
WHERE corpid = ?
  AND COALESCE(voided_at,'') = ''
  AND COALESCE(handover_status,'') <> 'VOID'
```

So this is not a table/corpid/D1/Worker mismatch. The owner cannot see the session because the row was later voided/deleted.

## Required Comparison Table

| 项目 | 员工端上传 | 老板端历史读取 |
|---|---|---|
| API route | `POST /api/employee/entry` | `GET /api/history`, `GET /api/session_detail?id=...` |
| Worker env | `homelink-finance` | `homelink-finance` |
| D1 binding | `DB` | `DB` |
| D1 database | `homelink` / `562aa079-1cca-4176-ba3b-7276a65f98fb` | `homelink` / `562aa079-1cca-4176-ba3b-7276a65f98fb` |
| table | Writes `sessions`; writes detail rows to `transactions`; audit trace in `entry_events` | Reads `sessions`; reads detail rows from `transactions` |
| corpid | `homelink` | `homelink` |
| session_id / row_id | `S20260703-amv7l` | Same row would match, but is excluded by void filters |
| anchor | `EMPV3-20260703-abdul-amv7l` | Same anchor, not visible because row is voided |
| source | `EMP` on this production row; current code defaults newer employee sessions to `employee_entry` | No source filter in `/api/history` |
| date | `2026-07-03` | Same date, but hidden by void filters |
| amount | Session summary: `cash_handover = 1520`, `gross_received = 1520` | Not visible in owner history because `handover_status = VOID` and `voided_at` is set |
| entries_count | `4` | Not visible; note that only 3 transaction rows were found for this session in read-only trace |
| query filter | Insert/update path uses authenticated employee `user.corpid` | `corpid = ?` plus `COALESCE(voided_at,'')=''` plus `COALESCE(handover_status,'')<>'VOID'` |
| 是否 owner-visible | No, after void | No, correctly excluded as voided |

## Route And Code Trace

| Layer | Path / Function | Evidence |
|---|---|---|
| Employee UI upload | `deploy-worker/public/employee-v3.html` / `apiFetch('/api/employee/entry', { method: 'POST', ... })` | Employee upload calls the Worker employee entry endpoint. |
| Employee API route | `deploy-worker/src/index.js` / route `POST /api/employee/entry` | Route dispatches to `handleEmployeeEntry(request, env, user)`. |
| Employee session write | `handleEmployeeEntry` | Writes to `sessions` with `corpid: user.corpid`, `created_by`, `operator_name`, summary totals, `export_text`, and `source`. |
| Employee detail write | `handleEmployeeEntry` | Writes entry rows to `transactions` with the same `session_id` and `corpid`. |
| Owner history UI | `deploy-worker/public/index-51-main.js` | Owner history loads `/api/history` and details via `/api/session_detail?id=...`. |
| Owner history API | `deploy-worker/src/index.js` / `GET /api/history` | Reads `sessions` by `corpid` and excludes voided rows. |
| Owner detail API | `deploy-worker/src/index.js` / `GET /api/session_detail` | Reads `transactions` by `session_id` and `corpid`, excluding voided rows. |

## Production Read-Only Evidence

Read-only D1 query found the employee-uploaded target session:

| Field | Value |
|---|---|
| `id` | `S20260703-amv7l` |
| `corpid` | `homelink` |
| `anchor_id` | `EMPV3-20260703-abdul-amv7l` |
| `date` | `2026-07-03` |
| `entries_count` | `4` |
| `created_by` | `abdul` |
| `operator_id` | `abdul` |
| `operator_name` | `阿布杜` |
| `cash_handover` | `1520` |
| `bank_transfer_total` | `0` |
| `gross_received` | `1520` |
| `handover_status` | `VOID` |
| `source` | `EMP` |
| `created_at` | `2026-07-03T23:32:38+04:00` |
| `voided_at` | `2026-07-03T19:49:55.331Z` |

Read-only transaction trace found 3 detail rows under `S20260703-amv7l`, all voided:

| Transaction | Type | Bed | Amount | Due | Paid | Status |
|---|---|---:|---:|---:|---:|---|
| `E20260703-bdnev` | `R` | `144` | `700` | `770` | `700` | `VOID` |
| `E20260703-bu84r` | `AP` | `144` | `70` | `70` | `70` | `VOID` |
| `E20260703-bypcj` | `R` | `146` | `700` | `770` | `700` | `VOID` |

Read-only event trace found the void operation:

| Field | Value |
|---|---|
| `event_type` | `session_void` |
| `ref_id` | `S20260703-amv7l` |
| `userid` | `manager` |
| `operator_id` | `manager` |
| `ts` | `2026-07-03T19:49:55.331Z` |
| `void_source` | `api.delete_session` |
| `void_reason` | `manager_void_session` |

## Root Cause Classification

Required classification: `UNKNOWN`

Precise root cause: `SESSION_VOIDED_BY_MANAGER_DELETE`.

The provided classification list does not include a dedicated `SESSION_VOIDED` category. The evidence rules out these likely alternatives:

- Not `DIFFERENT_TABLE`: employee writes and owner reads `sessions` / `transactions`.
- Not `DIFFERENT_CORPID`: both use `homelink`.
- Not `DIFFERENT_D1_BINDING`: both use D1 binding `DB` to database `homelink`.
- Not `DIFFERENT_WORKER_ENV`: both routes are in `homelink-finance`.
- Not `OWNER_FILTER_EXCLUDES_EMPLOYEE_SOURCE`: owner history has no source filter.
- Not `EMPLOYEE_UPLOAD_NOT_ACTUALLY_WRITTEN`: the session exists in production D1.
- Not `EMPLOYEE_WRITES_LOCAL_ONLY`: the session exists in production D1.

## SOT Verdict

| Check | Result |
|---|---|
| Same Worker | yes |
| Same D1 binding | yes |
| Same D1 database | yes |
| Same table | yes |
| Same corpid | yes |
| Same session SOT | yes |
| Owner source filter excludes employee upload | no |
| Target row exists | yes |
| Target row owner-visible | no, because voided |

## Recommended Smallest Fix

No storage synchronization fix is needed for this specific target row. The employee and owner paths already share the same session SOT.

Smallest safe product fix:

1. Add an owner-side read-only “deleted / voided history” visibility path or support trace indicator, so a successfully uploaded then deleted session is not mistaken for a failed upload.
2. If Ramadan wants this specific 2026-07-03 session restored, handle it as a separate, explicitly approved single-row production write because it requires reversing `VOID` / `voided_at`.
3. Separately audit why this session has `entries_count = 4` but only 3 transaction rows were found and why transaction sum is `1470` while session summary is `1520`. That mismatch is not the visibility root cause, but it is relevant to session integrity.

## Safety Status

| Item | Status |
|---|---|
| Production write | no |
| Migration | no |
| Deploy | no |
| Code change | no |
| Parser change | no |
| Financial formula change | no |
| Secret printed | no |
| Production cutover | `PRODUCTION_NO_GO` |
