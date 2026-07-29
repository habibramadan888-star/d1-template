# Route Normalization Result

Date: 2026-05-29, Asia/Dubai

| Path                  | New Role                       | Behavior                                                                                |
| --------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| `/`                   | Formal entry                   | Serves three-portal homepage                                                            |
| `/home`               | Alias                          | Serves three-portal homepage                                                            |
| `/login`              | Legacy login alias             | Redirects `/`                                                                           |
| `/unified-login.html` | Legacy login alias             | Redirects `/`                                                                           |
| `/employee-login`     | Employee login alias           | Redirects `/?portal=employee`                                                           |
| `/staff-login`        | Employee login alias           | Redirects `/?portal=employee`                                                           |
| `/owner-login`        | Owner login alias              | Redirects `/?portal=owner`                                                              |
| `/admin-login`        | Admin login alias              | Redirects `/?portal=admin`                                                              |
| `/employee-v3.html`   | Legacy employee business alias | Redirects `/employee`                                                                   |
| `/employee-v2.html`   | Legacy employee business alias | Redirects `/employee`                                                                   |
| `/index.html`         | Legacy owner business alias    | Redirects `/owner`                                                                      |
| `/index-51.html`      | Legacy owner business alias    | Redirects `/owner`                                                                      |
| `/employee`           | Employee business route        | Requires employee/staff server claim; otherwise redirects by server role or `/`         |
| `/owner`              | Owner business route           | Requires owner/manager server claim; otherwise redirects by server role or `/`          |
| `/admin`              | Readonly admin route           | Requires readonly_admin/admin_readonly server claim; serves owner app in read-only mode |

User-facing QA documentation should only reference the root URL as the formal entry.
