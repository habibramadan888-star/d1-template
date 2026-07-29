# Owner Arrears Info Pool Restore Result

Date: 2026-05-30, Asia/Dubai

## Scope

Restored the owner arrears page as a complete follow-up information pool instead of an old outstanding-summary list.

## Required Components

| Component                  | Result  |
| -------------------------- | ------- |
| 欠款管理 title             | present |
| ARREARS FOLLOW-UP subtitle | present |
| 待下发 KPI                 | present |
| 跟进中 KPI                 | present |
| 承诺逾期 KPI               | present |
| 待核对 KPI                 | present |
| 下发员工 action            | present |
| WhatsApp 导出 action       | present |
| 筛选状态 action            | present |
| 欠款任务列表 / 信息池      | present |
| 客户编号                   | present |
| 房间/床位                  | present |
| 金额                       | present |
| 逾期天数                   | present |
| 套餐/卡片                  | present |
| 当前状态 / 任务状态        | present |
| 负责人                     | present |
| 承诺还款日期               | present |
| 最近备注                   | present |
| 老板审核动作               | present |

## Forbidden Components

| Component                     | Result                         |
| ----------------------------- | ------------------------------ |
| `directive:` raw label        | removed from main arrears list |
| `promise:` raw label          | removed from main arrears list |
| `staff:` raw label            | removed from main arrears list |
| Main-list `录入收款` shortcut | removed                        |
| Main-list `录入押金` shortcut | removed                        |
| Main-list `作废` shortcut     | removed                        |

## Evidence

- `tests/owner-arrears-info-pool.spec.mjs`
- `renderArrearsPanel()` renders `data-owner-arrears-info-pool="true"`, `data-owner-arrear-task-card="true"`, and `data-owner-review-action="true"`.

## Safety

- D1 write: no
- Migration: no
- Dashboard calculation change: no
- Financial formula change: no
- Production cutover: `PRODUCTION_NO_GO`
