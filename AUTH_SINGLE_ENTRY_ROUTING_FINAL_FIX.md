# AUTH-UI-STABILIZATION-002 Single Entry Routing Final Fix

Date: 2026-05-29, Asia/Dubai

Single login entry: `/unified-login.html`

Business destinations:

| Page                         | Authenticated Role            | Result                                                                 |
| ---------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `employee-v3.html`           | `employee` / `staff`          | Enters employee business page.                                         |
| `employee-v3.html`           | unauthenticated               | Redirects `/unified-login.html`.                                       |
| `employee-v3.html`           | `owner` / `manager` / `admin` | Redirects `index.html`.                                                |
| `index.html`                 | `owner` / `manager` / `admin` | Enters owner business page.                                            |
| `index.html`                 | unauthenticated               | Redirects `/unified-login.html`.                                       |
| `index.html`                 | `employee` / `staff`          | Redirects `employee-v3.html`.                                          |
| old route aliases            | any                           | Redirects `/unified-login.html`.                                       |
| static `employee.html` asset | any                           | Redirect-only stub to `/unified-login.html`; no legacy PIN UI remains. |

In-page auth bootstrap shows only auth loading before `/api/me` completes. Old owner/employee login UI is not shown to users.

Production status remains `PRODUCTION_NO_GO`.
