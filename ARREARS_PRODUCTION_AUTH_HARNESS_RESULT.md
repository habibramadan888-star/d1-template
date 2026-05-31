# Arrears Production Auth Harness Result

Status: `CREATED_NOT_EXECUTED`

Harness path: `scripts/arrears-production-auth-harness.mjs`

## Supported Modes

| Mode | Behavior |
|---|---|
| `--check-config` | Checks whether the ignored local env file exists and required fields are present. Does not login. Does not write D1. Does not print secrets. |
| `--run-auth-check` | Logs in owner and employee, keeps cookies in memory only, verifies `/api/me`, and prints only redacted auth status. This may create production `active_sessions` rows and therefore requires explicit approval before use. |

## Output Contract

The harness output is limited to:

- owner auth usable: yes/no
- employee auth usable: yes/no
- role matched: yes/no
- cookie printed: no
- token printed: no
- password printed: no

## Explicit Non-Calls

| Endpoint / Operation | Called By This Task |
|---|---|
| `/api/boss/arrears/directives` | no |
| `/api/employee/arrears/directives/:id/followup` | no |
| production write gate | no |
| production business write | no |

## Session Warning

`--run-auth-check` uses real login endpoints. The Worker login implementation creates `active_sessions` rows. This mode must not be run until Ramadan explicitly approves production auth session writes.

