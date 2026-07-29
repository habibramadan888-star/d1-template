# OWNER_ARREARS_DEBUG_FIELD_REMOVAL_RESULT

## Removed From Visible UI

The mobile card renderer no longer displays raw/debug labels such as:

- `directive`
- `promise:`
- `staff:`
- `source:`
- `source_type`
- `followup_status`
- `accounting_status`
- `none`
- `undefined`
- `null`

## Business Mapping

| Raw Field / Value     | UI Label   |
| --------------------- | ---------- |
| `ttlock_expired_card` | 通通锁过期 |
| `historical_arrears`  | 历史欠款   |
| `current_due_unpaid`  | 到期未收   |
| `pending_followup`    | 待跟进     |
| `contacted`           | 已联系     |
| `promised`            | 承诺付款   |
| `promise_overdue`     | 承诺逾期   |
| `paid_reported`       | 已反馈付款 |
| `needs_review`        | 待核对     |
| `closed`              | 已关闭     |

## Empty Value Mapping

| Empty / Raw Value             | UI Label         |
| ----------------------------- | ---------------- |
| empty assignee                | 负责人：待分配   |
| empty promised repayment date | 承诺还款：未填写 |
| empty note                    | 备注：无         |
| unknown amount                | 金额待核对       |
