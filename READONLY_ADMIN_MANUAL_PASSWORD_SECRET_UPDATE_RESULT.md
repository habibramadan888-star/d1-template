# READONLY_ADMIN_MANUAL_PASSWORD_SECRET_UPDATE_RESULT

| Field                      | Value                                                             |
| -------------------------- | ----------------------------------------------------------------- |
| username                   | `admin`                                                           |
| role                       | `readonly_admin`                                                  |
| password source            | user-provided temporary password                                  |
| password printed in report | no                                                                |
| password location          | `.tmp/readonly-admin/readonly-admin.local.json`                   |
| USER_ACCOUNTS configured   | yes                                                               |
| secret update method       | Cloudflare Worker `USER_ACCOUNTS` secret                          |
| live Worker                | `homelink-finance`                                                |
| production D1 write        | no                                                                |
| migration                  | no                                                                |
| deploy                     | no                                                                |
| production cutover         | `PRODUCTION_NO_GO`                                                |
| rotation note              | Temporary internal QA password must be rotated before production. |
