# Role Guard Closure Result

Date: 2026-05-29, Asia/Dubai

| Route       | Allowed Server Role            | Denied / Redirect Behavior                                                                                  |
| ----------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `/employee` | employee, staff                | owner/manager/admin redirect to `/owner`; readonly admin redirect to `/admin`; unauthenticated redirect `/` |
| `/owner`    | owner, manager, admin          | employee/staff redirect `/employee`; readonly admin redirect `/admin`; unauthenticated redirect `/`         |
| `/admin`    | readonly_admin, admin_readonly | employee/staff redirect `/employee`; owner/manager/admin redirect `/owner`; unauthenticated redirect `/`    |

Guard authority is server claim from JWT and `/api/me`. Frontend selected portal, localStorage role, sessionStorage role, tenant id, and property id are not authority.
