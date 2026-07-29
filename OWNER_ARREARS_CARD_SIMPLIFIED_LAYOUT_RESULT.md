# OWNER_ARREARS_CARD_SIMPLIFIED_LAYOUT_RESULT

## Final Card Structure

Owner arrears cards now use this default hierarchy:

```text
床位｜金额
来源｜逾期/截止
承诺日期：未填写 / 2026-06-01
备注：暂无 / 客户说晚上转账
状态：待下发 / 已下发 / 已跟进 / 承诺付款 / 待核对
```

## Removed From Default Card

| Removed Item                               | Status        |
| ------------------------------------------ | ------------- |
| `承诺金额`                                 | removed       |
| `promised_amount` / `promised_amount_fils` | not displayed |
| internal task id                           | not displayed |
| `source_type` raw field                    | not displayed |
| `ttlock_card` raw field                    | not displayed |
| `none` / `undefined` / `null`              | not displayed |

## Kept

- Top arrears amount remains in the first row.
- Source and due/overdue line remain visible.
- Employee promised date and note remain visible.
- Current status remains visible.

No amount calculation logic was changed.
