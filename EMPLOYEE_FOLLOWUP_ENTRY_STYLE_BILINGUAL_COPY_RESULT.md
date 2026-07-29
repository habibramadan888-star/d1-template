# Employee Follow-up Entry Style Bilingual Copy Result

Task: `EMPLOYEE-FOLLOWUP-MATCH-ENTRY-UX-001`

Result: PASS.

Copy rules applied:

- English first, Chinese second.
- Short action labels.
- No long instructional paragraph in the default card.
- Detail copy uses concise labels:
  - `Entry / 录入`
  - `Follow-up / 跟进`
  - `Logout / 退出`
  - `Boss Assigned / 老板下发`
  - `System Reminders / 系统提醒`
  - `Bed / 床位`
  - `Amount / 金额`
  - `Due Date / 截止日期`
  - `Saved / 已保存`
  - `Submit Feedback / 提交反馈`
  - `Expand Details / 展开详情`
  - `Collapse Details / 收起详情`

Verification:

- `npm run test:employee-followup-entry-style-bilingual`: PASS.
- Production cutover remains `PRODUCTION_NO_GO`.
