# AUTH-UI-STABILIZATION-002 Employee Display Name Fix Result

Date: 2026-05-29, Asia/Dubai

| Item                      | Result                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Original cause            | `employeeDisplayName()` included `role` as a fallback, so `role=staff` could be rendered as the employee identity.       |
| `/api/me` identity fields | Now returns `userid`, `username`, `employee_id`, `display_name`, `employee_name`, `corpid`, `role`, and `isManager`.     |
| Display field order       | `display_name`, `displayName`, `name`, `username`, `employee_name`, `employee_id`, `userid`, `login_id`, then `unknown`. |
| Role fallback             | Removed. Values `staff` and `employee` are filtered from display output.                                                 |
| Example `abdul`           | Displays `abdul` when returned as username / employee id / employee name.                                                |
| Permission impact         | No. Auth and permission checks still use `/api/me` role; display text is not authority.                                  |

The employee header now labels the visible identity as current employee rather than `员工编号 staff`.
