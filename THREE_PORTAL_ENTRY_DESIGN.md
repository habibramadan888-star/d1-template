# Three Portal Entry Design

Date: 2026-05-29, Asia/Dubai

Official entry: `/`

The homepage is a single high-level entry selector with three doors:

| Door     | Visible Label   | Form                                         | Expected Business Destination |
| -------- | --------------- | -------------------------------------------- | ----------------------------- |
| Employee | 员工 / Employee | Employee account + password/PIN              | `/employee`                   |
| Owner    | 老板 / Owner    | Owner password with browser username support | `/owner`                      |
| Admin    | 管理员 / Admin  | Admin username + password                    | `/admin`                      |

Visible page content is intentionally limited to logo, Homelink, "请选择入口", the three door cards, and the selected login form. It does not display production status, D1, QA notes, server role details, old paths, or `.html` links.

Security model:

- The selected door only changes form presentation and endpoint selection.
- Server session and `/api/me` decide final routing.
- Frontend role, localStorage role, sessionStorage role, tenant id, and property id are not authority.
- Role mismatch is corrected by server role: employee routes to `/employee`, owner/manager routes to `/owner`, readonly admin routes to `/admin`.
