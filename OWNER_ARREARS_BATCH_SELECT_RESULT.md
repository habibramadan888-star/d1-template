# Owner Arrears Batch Select Result

Scope: UI/read-only behavior only. No deploy, migration, D1 execute, D1 write, or business write was performed.

| Check | Result |
|---|---|
| 是否有全选 | yes |
| 是否支持取消全选 | yes |
| 是否显示已选择数量 | yes |
| 是否按当前筛选范围选择 | yes |
| readonly_admin 是否隐藏选择动作 | yes |
| 是否执行真实写入 | no |

Implementation notes:
- Added `arrearSelectAll` in the arrears action bar.
- Selection is limited to currently rendered `data-arrear-select` rows, so source filters constrain the batch scope.
- `updateArrearDirectiveButtonState()` keeps the count and button disabled state synchronized.
