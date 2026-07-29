# Employee Header Account / Logout Audit

Generated: 2026-06-01 Asia/Dubai

## Finding

The employee header rendered employee identity in more than one place:

- `operatorId` was intended as an internal operator field but could be visually exposed by CSS rules despite the `hidden` attribute.
- `employeeUserButton` displayed the employee name and the label `ACCOUNT`.
- `btnEmployeeLogout` was nested inside a hidden menu, so the visible green account button looked like a second employee-name action rather than a clear logout control.

## Root Cause

| Area | Current Behavior | Root Cause | Required Fix |
|---|---|---|---|
| operator identity | employee name could appear in a pale field | generic `.operator` CSS overrode the intended hidden behavior in some layouts | force `.operator[hidden]` to `display:none!important` |
| account button | showed employee name + ACCOUNT | account display and account action were mixed | replace visible account action with one identity card |
| logout | hidden in a menu | logout was not a first-class visible action | add visible `Logout / 退出` button |

## Safety

No login logic, session logic, cookie handling, production write gate, D1 write, or migration was changed.
