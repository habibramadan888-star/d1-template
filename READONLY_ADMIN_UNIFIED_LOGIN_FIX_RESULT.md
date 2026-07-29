# Readonly Admin Unified Login Fix Result

| Requirement                                             | Result             |
| ------------------------------------------------------- | ------------------ |
| Unified-login supports username `admin`                 | yes                |
| `readonly_admin` is accepted as an owner-side role      | yes                |
| `readonly_admin` redirects to `index.html`              | yes                |
| `/api/me` remains the routing authority                 | yes                |
| `canWrite=false` remains enforced                       | yes                |
| Write buttons remain hidden/disabled for readonly admin | yes                |
| Backend write request denial remains covered            | yes                |
| Employee/staff login flow preserved                     | yes                |
| Owner/manager login flow preserved                      | yes                |
| Password printed                                        | no                 |
| Token/cookie printed                                    | no                 |
| Production D1 write                                     | no                 |
| Migration                                               | no                 |
| Production cutover                                      | `PRODUCTION_NO_GO` |

Implementation: `unified-login.html` now treats `admin`, `owner`, `manager`, `admin_readonly`, and `readonly_admin` account IDs as owner-side login identifiers and sends them through `/auth/login`. Other non-empty account IDs continue to use `/auth/employee-login`.
