# Arrears Auth Local Template Result

| Check | Result |
|---|---|
| example file created | yes |
| example path | `.tmp/arrears-smoke-auth/production-auth.local.env.example` |
| real password filled | no |
| default password generated | no |
| random password generated | no |
| password printed | no |
| production-auth.local.env committed | no |
| production-auth.local.env.example committed | no, local ignored due secret scanner policy |

Template model:

- Owner has no login ID. Owner uses `OWNER_PASSWORD` only.
- Employee uses `EMPLOYEE_LOGIN_ID`, `EMPLOYEE_PASSWORD`, and optional `EMPLOYEE_NAME`.
- Admin uses `ADMIN_LOGIN_ID` and `ADMIN_PASSWORD`.

