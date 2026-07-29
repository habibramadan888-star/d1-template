# Employee Arrears Directive Inbox Count Audit

Date: 2026-06-01, Asia/Dubai

Scope: verify how the employee Follow-up inbox calculates `ASSIGNED` count.

Safety: no production write, no write gate, no D1 command, no new auth session.

## API / UI Path

| Layer | Count | Result |
|---|---:|---|
| API returned directives | 1 observed in latest Abdul mobile acceptance | `GET /api/employee/arrears/directives` is the dedicated source. |
| UI rendered directives | `rows.length` | UI renders all `state.employeeDirectives` rows with `rows.map(employeeDirectiveCard)`. |
| Expected visible directives | persisted assigned directives only | Owner dry-run count must not enter this count. |

## Root Cause Classification

- `API_RETURNS_ONE_CORRECTLY`
- `CANCELLED_ROWS_FILTERED_CORRECTLY`

Not supported by current source audit:

- `API_RETURNS_MANY_UI_RENDERS_ONE`
- `PAGINATION_LIMIT_BUG`
- `EMPLOYEE_FILTER_MISMATCH`

## Source Audit

- `loadEmployeeArrearsDirectives()` calls `GET /api/employee/arrears/directives`.
- It maps `(data.directives || data.tasks || [])` into `state.employeeDirectives`.
- `renderEmployeeDirectiveInbox()` uses `const rows = state.employeeDirectives || []`.
- The title count is `${rows.length} ASSIGNED`.
- The card list is `rows.map(employeeDirectiveCard).join('')`, so multiple returned directives render as multiple cards.
- The inbox does not read owner selected checkbox count, owner dry-run count, or WhatsApp export count.

## Conclusion

Employee `1 ASSIGNED` is the count of persisted assigned directives visible to Abdul, not the owner selected/dry-run task count.

Production cutover: `PRODUCTION_NO_GO`.
