# Employee Owner Session Restore Result

Status: controlled restore completed and UI trace prepared.

## Scope

| Item | Value |
|---|---|
| session_id | `S20260703-amv7l` |
| anchor | `EMPV3-20260703-abdul-amv7l` |
| corpid | `homelink` |
| date | `2026-07-03` |
| production write scope | one sessions row restore only |
| migration | no |
| production cutover | `PRODUCTION_NO_GO` |

## Planned Restore

Only this row may be changed:

```sql
UPDATE sessions
SET voided_at = NULL,
    voided_by = NULL,
    void_reason = NULL,
    void_source = 'restored_employee_owner_sync_20260703',
    handover_status = 'EXPORTING'
WHERE id = 'S20260703-amv7l'
  AND anchor_id = 'EMPV3-20260703-abdul-amv7l'
  AND corpid = 'homelink'
  AND date = '2026-07-03'
  AND COALESCE(voided_at,'') <> '';
```

Audit note: stored in the restored session row `void_source = restored_employee_owner_sync_20260703`.

## Results

| Check | Result |
|---|---|
| pre-restore row found | yes |
| pre-restore row was voided | yes, `handover_status = VOID`, `voided_at = 2026-07-03T19:49:55.331Z` |
| restore affected sessions rows | 1 |
| owner history visible | yes, row now matches active owner `/api/history` filter |
| deleted history trace available | implemented as read-only owner history mode using `include_voided=1` |
| entries_count warning | yes, UI warns when saved count and loaded transaction rows differ |
| production write | yes, one `sessions` row restore only |
| deploy | yes, Worker version `b4f675dd-cef7-4573-9ca2-83362d6bac1d` |

## Post-Restore Values

| Field | Value |
|---|---|
| `id` | `S20260703-amv7l` |
| `anchor_id` | `EMPV3-20260703-abdul-amv7l` |
| `corpid` | `homelink` |
| `date` | `2026-07-03` |
| `entries_count` | `4` |
| `cash_handover` | `1520` |
| `bank_transfer_total` | `0` |
| `gross_received` | `1520` |
| `handover_status` | `EXPORTING` |
| `voided_at` | `NULL` |
| `voided_by` | `NULL` |
| `void_reason` | `NULL` |
| `void_source` | `restored_employee_owner_sync_20260703` |
| transaction rows found | `3` |

## Live Smoke

| Check | Result |
|---|---|
| deployed asset contains deleted trace marker | yes |
| deployed asset contains entries_count warning marker | yes |
| deployed asset contains `include_voided=1` marker | yes |
| restored session matches active owner history filter | yes |
| owner-visible restored session amount | `1520` |
| entries_count warning evidence | `entries_count = 4`, transaction rows = `3` |
| production write scope | one `sessions` row restore only |
| migration | no |
| production cutover | `PRODUCTION_NO_GO` |
