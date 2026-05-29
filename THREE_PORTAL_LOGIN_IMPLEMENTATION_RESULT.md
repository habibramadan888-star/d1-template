# Three Portal Login Implementation Result

Date: 2026-05-29, Asia/Dubai

| Item                           | Result                                                             |
| ------------------------------ | ------------------------------------------------------------------ |
| Three doors implemented        | Yes                                                                |
| Employee door submit           | `/auth/employee-login` with employee account and PIN/password      |
| Owner door submit              | `/auth/login` with password and stable browser username identifier |
| Admin door submit              | `/auth/login` with admin username field and password               |
| Role mismatch handling         | `/api/me` server role decides final redirect                       |
| Employee destination           | `/employee`                                                        |
| Owner destination              | `/owner`                                                           |
| Readonly admin destination     | `/admin`                                                           |
| Backend role authority         | Yes, `/api/me`                                                     |
| User-visible old login removed | Yes, old login paths redirect to `/` or business aliases           |
| Production D1 write            | No                                                                 |
| Migration                      | No                                                                 |

The implementation is `deploy-worker/public/portal.html` plus Worker route normalization in `deploy-worker/src/index.js`. The page does not expose technical routing notes to users.
