# Readonly Admin Unified Login Failure Diagnosis

Conclusion: `API_AUTH_WORKS_UI_PAYLOAD_BUG`

| Check                                                      | Finding                                       |
| ---------------------------------------------------------- | --------------------------------------------- |
| Live unified-login asset loaded                            | yes                                           |
| API direct login with browser origin                       | success                                       |
| `/api/me` after API direct login                           | `readonly_admin` / `admin` / `canWrite=false` |
| Unified-login UI endpoint with username `admin` before fix | `/auth/employee-login`                        |
| Unified-login UI payload before fix                        | `employee_id`, `pin`                          |
| UI failure status before fix                               | `401 invalid_employee_pin`                    |
| Password printed                                           | no                                            |
| Token/cookie printed                                       | no                                            |

Root cause: the unified login submit handler treated every non-empty account field as an employee login. The username `admin` was sent as `employee_id=admin` to `/auth/employee-login`, so the Worker rejected it as an invalid employee PIN. The readonly admin account is configured through `USER_ACCOUNTS` and must authenticate through `/auth/login`.

This is not a `USER_ACCOUNTS` secret mismatch and not a password mismatch.
