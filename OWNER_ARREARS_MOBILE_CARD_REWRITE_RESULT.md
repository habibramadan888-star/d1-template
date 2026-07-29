# OWNER_ARREARS_MOBILE_CARD_REWRITE_RESULT

## Result

Implemented a dedicated owner arrears task card renderer:

- `renderOwnerArrearsTaskCard(a, today)`
- `renderArrearCardActions(a)`
- Business label helpers for customer, bed, amount, due line, status, assignee, source, and empty values.

## New Card Structure

Each mobile card now renders as:

1. First line: `#客户编号｜床位｜金额`
2. Second line: overdue/due status, D/package/card label, deadline
3. Follow-up grid: source, status, assignee, promised repayment, owner requested date, follow-up result
4. Note line: `备注：...`
5. Action row: role-aware business actions

## Role Behavior

- Write-capable owner roles see contextual actions such as `下发员工`, `催促`, `继续跟进`, `待核对`, `确认关闭`.
- `readonly_admin` gets only `详情`.

## Legacy Row Removal

The main arrears render path no longer emits:

```html
class="arrear-row arrear-task-card"
```

It now renders:

```html
<article class="owner-arrears-task-card ..."></article>
```
