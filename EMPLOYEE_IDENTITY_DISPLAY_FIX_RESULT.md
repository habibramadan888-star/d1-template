# AUTH-ROUTING-STABILIZATION-001 Employee Identity Display Fix Result

Date: 2026-05-29, Asia/Dubai

## Root Cause

The employee page used `userid` or local operator state in the visible top-right
identity field. When the user passed through an old `staff` role flow, `staff`
could become the visible identity even though it is a role, not a person.

## New Display Priority

The employee page now resolves the visible name in this order:

1. `display_name`
2. `displayName`
3. `employee_name`
4. `name`
5. `username`
6. `userid`
7. `employee_id`
8. `role` as last-resort fallback only

## UI Result

| Item                          | Result                                                         |
| ----------------------------- | -------------------------------------------------------------- |
| Top-right label               | Changed from `员工编号` to `当前员工`.                         |
| Visible value for abdul       | Displays `abdul` if returned as username/userid/employee_name. |
| Visible value for 张三 / 李四 | Displays returned display/name field if `/api/me` provides it. |
| Role `staff` as name          | No longer preferred over real employee fields.                 |
| Permission impact             | No. `/api/me` role remains the authority.                      |

If `/api/me` does not return a human display name, the page falls back to
`userid` / `employee_id`. Backend enrichment of employee display names remains a
future improvement if production accounts lack names.

Production status remains `PRODUCTION_NO_GO`.
