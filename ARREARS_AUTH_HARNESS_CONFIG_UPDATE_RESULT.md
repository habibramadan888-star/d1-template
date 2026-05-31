# Arrears Auth Harness Config Update Result

| Check | Result |
|---|---|
| owner password required | yes |
| owner login id required | no |
| owner login payload follows production contract | yes, `/auth/login` uses password only |
| employee login id required | yes |
| employee password required | yes |
| employee name optional/recommended | yes |
| admin login id tracked | yes |
| admin password tracked | yes |
| `--check-config` logs in | no |
| `--auth-smoke` requires `ARREARS_AUTH_HARNESS_APPROVED=yes` | yes |
| password printed | no |
| token printed | no |
| cookie printed | no |

`--auth-smoke` was not executed in this task.

