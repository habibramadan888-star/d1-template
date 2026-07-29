# API Permission Matrix Final

Generated: 2026-05-29
Scope: static permission matrix. No API writes, no D1 write, no deploy.

## Role Rules

| Role | Read Owner Data | Employee Entry | Owner Writes | Settings Writes | Void/Delete | Notes |
|---|---|---|---|---|---|---|
| employee/staff | No | Yes, scoped | No | No | No | Property scope required. |
| owner/manager | Yes | No as primary flow | Yes | Yes | Yes, controlled | Tenant scope required. |
| readonly_admin/admin_readonly | Yes | No | No | No | No | Backend 403 required. |
| unauthenticated | No | No | No | No | No | 401/redirect. |

## Current Backend Evidence

| Evidence | Result |
|---|---|
| `READONLY_ADMIN_ROLES` includes `admin_readonly` and `readonly_admin`. | Present |
| `canWriteOwnerData(user)` returns true only for manager role. | Present |
| `/api/me` exposes `canWrite` through backend role. | Present |
| Worker denies read-only admin non-GET in owner route block. | Present |
| Employee entry adapter live route requires employee/staff roles. | Present |
| Tenant/property scope tests exist. | Present |

## Endpoint Classes

| Endpoint Class | Employee | Owner/Manager | Readonly Admin |
|---|---|---|---|
| `GET /api/me` | Allow | Allow | Allow |
| `GET /api/history` | Deny/redirect unless employee route policy allows own data | Allow tenant scope | Allow tenant scope |
| `GET /api/arrears` | Allow only if employee workflow requires scoped follow-up | Allow tenant scope | Allow tenant scope |
| `POST /api/employee/entry` or adapter writes | Allow employee/staff only | Deny unless explicit secondary tool is approved | Deny 403 |
| `POST /api/staging/handover/commit` | Allow employee/staff only in staging guard | Deny | Deny 403 |
| settings writes | Deny | Allow manager only | Deny 403 |
| session void/delete | Deny | Allow manager only | Deny 403 |
| customer/client credit save | Deny unless explicitly scoped | Allow manager only | Deny 403 |

## Required Automated Coverage

- Every POST/PUT/PATCH/DELETE route returns 403 for readonly admin.
- Every employee write route denies owner/admin unless intentionally granted.
- Every owner route denies staff.
- Frontend role/localStorage tampering has no effect on backend permission.
- Tenant/property scope enforced for all list and mutation endpoints.

## Decision

| Item | Result |
|---|---|
| Matrix defined | Yes |
| Full route-by-route proof | Partial |
| Production cutover | PRODUCTION_NO_GO |
