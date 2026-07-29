# OWNER_ARREARS_TTLOCK_LABEL_CLEANUP_RESULT

## Result

The visible TTLock arrears source line now uses business wording only.

Expected examples:

```text
通通锁到期未付｜截止待确认
通通锁到期未付｜逾期 23 天｜截止 2026-05-07
```

## Removed From Main Card

| Technical Text     | Main Card Status |
| ------------------ | ---------------- |
| `ttlock_card`      | removed          |
| `ttlock-expired-*` | removed          |
| `source_ref`       | removed          |
| raw `source_type`  | removed          |
| raw card id        | removed          |

## Code Path

- Source label: `arrearSourceLabel`
- Due line: `arrearDueLine`
- Card renderer: `renderOwnerArrearsTaskCard`

No D1 write, migration, or financial calculation change was made.
