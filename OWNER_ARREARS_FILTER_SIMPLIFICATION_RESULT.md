# Owner Arrears Filter Simplification Result

| Filter | Exists |
|---|---|
| 全部 | yes |
| 通通锁已过期 | yes |
| 系统已有欠款 | yes |
| 其他筛选 | no |

Implementation notes:
- Filter contract is source-only: `all`, `ttlock_expired_unpaid`, `existing_arrears_record`.
- `current_due_unpaid`, unknown sources, and status filters are not shown in the arrears filter UI.
- Selection and WhatsApp export use the current source-filtered rows.
