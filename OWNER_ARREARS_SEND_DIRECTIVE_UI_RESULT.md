# Owner Arrears Send Directive UI Result

Scope: directive UI was converted to dry-run execution-list generation. It does not call `/api/arrear_tasks/directive`.

| Item | Result |
|---|---|
| 下发日期是否已移除 | yes |
| 下发员工是否依赖选中任务 | yes |
| 未选择时是否提示 | yes |
| readonly_admin 是否隐藏 | yes |
| 是否真实写入 | no |

Implementation notes:
- Removed the date input from the new owner arrears action bar.
- `sendArrearDirectives()` now requires selected rows and generates a WhatsApp/manual execution list as dry-run only.
- No D1 writes or backend directive writes are triggered.
