# READONLY_ADMIN_MANUAL_PASSWORD_LIVE_VERIFY_RESULT

| Check                           | Result             |
| ------------------------------- | ------------------ |
| live login usable               | yes                |
| `/api/me` role `readonly_admin` | yes                |
| `canWrite` false                | yes                |
| read customers 200              | yes                |
| read history 200                | yes                |
| write customers 403             | yes                |
| production D1 write             | no                 |
| migration                       | no                 |
| password printed in report      | no                 |
| token/cookie printed            | no                 |
| production cutover              | `PRODUCTION_NO_GO` |

This was a read-only smoke verification except for the intentionally denied write
probe. The write probe returned `403`; no business data write was accepted.
