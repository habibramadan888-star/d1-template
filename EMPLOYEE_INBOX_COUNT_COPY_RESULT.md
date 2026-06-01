# Employee Inbox Count Copy Result

Date: 2026-06-01, Asia/Dubai

## Result

The employee inbox count remains tied to the persisted directive API response:

- Source: `GET /api/employee/arrears/directives`
- State: `state.employeeDirectives`
- Count: `${rows.length} ASSIGNED`
- Render: `rows.map(employeeDirectiveCard).join('')`

## Required Behavior

| Condition | Employee UI |
|---|---|
| Abdul has 1 persisted assigned directive | `1 ASSIGNED` |
| Abdul has 0 persisted assigned directives | `No boss assigned tasks / 暂无老板下发任务` |
| Owner selects/generates dry-run list of 40 | employee count remains unchanged |
| Future approved rollout writes multiple Abdul directives | count equals persisted API row count |

No fake count is injected into the employee UI.

Production cutover: `PRODUCTION_NO_GO`.
