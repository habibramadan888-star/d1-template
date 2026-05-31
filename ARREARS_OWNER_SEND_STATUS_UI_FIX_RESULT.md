# Arrears Owner Send Status UI Fix Result

Date: 2026-05-31

## Changes

| Area | Before | After |
|---|---|---|
| Selected action | Could read as successful dispatch | Shows `真实下发未启用；已生成 dry-run 清单，未写入员工端` |
| Legacy write call | Stale duplicate referenced `/api/arrear_tasks/directive` | Duplicate disabled; active function performs no write request |
| Button enablement | Selected checkbox state | Still selected checkbox state only |
| readonly_admin | Hidden write action | Still hidden |

## Behavior Contract

- `owner/manager`: selecting at least one row enables the button.
- Click generates a dry-run employee execution list and WhatsApp text.
- No production D1 write is performed.
- No employee inbox task is created while write gate is off.
- True dispatch success must only be shown by a future approved real API response.

Production cutover remains `PRODUCTION_NO_GO`.
