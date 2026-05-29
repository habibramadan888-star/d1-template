# Three Portal Entry Live Smoke Result

Date: 2026-05-29

## Live URL

Official entry:

https://homelink-finance.habibramadan888.workers.dev/

## Read-Only Smoke Checks

| Check                                            | Result |
| ------------------------------------------------ | ------ |
| GET `/` displays three portal entry              | yes    |
| GET `/login` redirects to `/`                    | yes    |
| GET `/unified-login.html` redirects to `/`       | yes    |
| GET `/employee-v3.html` redirects to `/employee` | yes    |
| GET `/index.html` redirects to `/owner`          | yes    |
| Unauthenticated `/owner` redirects to `/`        | yes    |
| Unauthenticated `/employee` redirects to `/`     | yes    |
| Unauthenticated `/admin` redirects to `/`        | yes    |
| Root page exposes old employee PIN login         | no     |
| Root page exposes old owner login                | no     |
| Readonly admin live login usable                 | yes    |
| `/api/me` role is `readonly_admin`               | yes    |
| `/api/me` `canWrite` is false                    | yes    |
| Authenticated `/admin` returns owner shell       | yes    |
| Read-only `GET /api/history?limit=1` returns 200 | yes    |
| Password printed                                 | no     |
| Token/cookie printed                             | no     |
| Business write performed                         | no     |
| Production D1 write                              | no     |
| Migration                                        | no     |

## Notes

- Employee and owner credential live login was not executed in this smoke because no non-secret owner/employee credential was used in this task.
- The route model was verified without business writes.
- Production cutover remains `PRODUCTION_NO_GO`.
