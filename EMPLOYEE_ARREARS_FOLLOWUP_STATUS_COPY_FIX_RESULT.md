# Employee Arrears Follow-Up Status Copy Fix Result

Date: 2026-05-31, Asia/Dubai

Scope: UI copy-only correction for the employee boss-assigned arrears follow-up card. No write gate was opened and no production write was executed.

| Issue | Fix | Result |
|---|---|---|
| `followed_up` displayed as `已反馈`, which looked like the new click had already written | Changed historical status label to `已有反馈` | fixed |
| Employee edits date/note but the status label still looked final | Added dirty-state marker `当前修改未提交` on date/note input changes | fixed |
| Gate-off submit copy implied a generic approval failure | Changed 409 copy to `真实反馈写入未启用；当前不会写入生产。请先用 WhatsApp/线下回执。` | fixed |
| Success copy must not appear unless API returns success | Success toast remains only after a non-409 `r.ok` response | preserved |

## Safety

| Check | Result |
|---|---|
| production write gate opened | no |
| employee follow-up production write | no |
| owner directive production write | no |
| batch dispatch | no |
| TTLock smoke | no |
| migration | no |
| D1 export/import/execute | no |
| amount/accounting_status modified | no |
| financial formula modified | no |
| dashboard calculation modified | no |
| production cutover | PRODUCTION_NO_GO |
