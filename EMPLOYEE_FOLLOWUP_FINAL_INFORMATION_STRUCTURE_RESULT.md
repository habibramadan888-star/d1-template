# Employee Follow-up Final Information Structure Result

Task: `EMPLOYEE-FOLLOWUP-MATCH-ENTRY-UX-001`

Final structure:

- Header: same Entry header, one employee identity display, one `Logout / 退出` button.
- Functional tabs: `Entry / 录入`, `Follow-up / 跟进`.
- Page title: `Follow-up / 跟进`.
- Subtitle: `Boss tasks + system reminders / 老板下发任务 + 系统提醒`.
- Module 1: `Boss Assigned Tasks / 老板下发任务`.
- Module 2: `System Reminders / 系统提醒`.

Default Boss Assigned task card:

- Bed / 床位.
- Amount / 金额.
- Due Date / 截止日期.
- Status / 状态.
- Expand Details / 展开详情.

Expanded task details:

- Promise Date / 承诺日期.
- Note / 备注.
- Boss Note / 老板备注.
- Source / 来源.
- Submit/Saved state.

System reminders:

- Required / 强制跟进.
- TTLock Overdue / 通通锁过期.
- Arrears / 历史欠款.
- Amount / 应收提醒.

Verification:

- `npm run test:employee-followup-final-information-structure`: PASS.
- Production cutover remains `PRODUCTION_NO_GO`.
