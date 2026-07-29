# Arrears Directive Production Smoke Auto Selected Employee

Date: 2026-05-31

## Scope

Production read-only query only. The query selected from `employee_users` and did not read or print `pin_hash`, passwords, tokens, cookies, or secrets.

## Selected Employee

| Field           | Value                                                                       |
| --------------- | --------------------------------------------------------------------------- |
| employee_id     | `abdul`                                                                     |
| employee_name   | `阿布杜`                                                                    |
| role            | `staff`                                                                     |
| status          | `ACTIVE`                                                                    |
| reason selected | active staff employee available for smoke; not readonly_admin and not owner |

## Candidate List

| Rank | employee_id | employee_name | role    | status   | Reason                                                  |
| ---: | ----------- | ------------- | ------- | -------- | ------------------------------------------------------- |
|    1 | `abdul`     | `阿布杜`      | `staff` | `ACTIVE` | Selected; only active staff/employee candidate returned |

## Safety Status

- Password/token/cookie printed: `No`
- Production D1 write: `No`
- Production write gate: `Off`
- Production migration: `No`
- Production deploy: `No`
- Production cutover: `PRODUCTION_NO_GO`
