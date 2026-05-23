# Auth And Tenancy Audit

Date: 2026-05-23  
Production mutation: none

## Summary

The project has a real server-side auth layer, session table, signed JWT cookies, staff allowlist, and manager checks. It is not yet SaaS-ready for multi-tenant commercial use because tenant/company/property identity is static and incomplete.

## Auth Flow

Observed:

- Owner/staff password login uses `/auth/login`.
- Employee PIN login uses `/auth/employee-login`.
- Session cookie is `HttpOnly`, `Secure`, `SameSite=Strict`.
- `active_sessions` supports revocation.
- Rate limiting uses KV binding `RATE_LIMIT`.

## P0 Risks

- Local authenticated flow cannot be validated without `JWT_SECRET`.
- Default employee seed `abdul` with PIN `8888` exists in code path. This must not exist as a production default.
- `employee_users` lacks `corpid`, so future multi-company employee isolation is unsafe.
- `CORPID` comes from env and is static. Future SaaS needs tenant/company resolved from account/session, not a single deployment constant.

## P1 Risks

- No admin role is implemented as a separate platform role.
- No property-level access scoping exists.
- Staff allowlist exists, but route-level tests are missing.
- Auth docs do not yet include password hash generation and local secret setup.
- Some app settings store tenant-wide JSON blobs, making fine-grained permission hard.

## Permission Review

| Area             | Current State                          | Risk                                              |
| ---------------- | -------------------------------------- | ------------------------------------------------- |
| Owner APIs       | guarded by manager checks after auth   | needs tests                                       |
| Employee APIs    | explicit `handleEmployeeApi` path list | needs route tests                                 |
| Frontend buttons | used for UX                            | acceptable only because backend checks also exist |
| Data queries     | generally filter `corpid`              | no `property_id`                                  |
| Session revoke   | manager endpoint exists                | needs audit and tests                             |

## Multi-Tenant Requirements

Before commercial SaaS:

- Add `companies` or `tenants`.
- Add `properties`.
- Add user membership table.
- Add `property_id` to business records.
- Scope all APIs by tenant and property.
- Add tests proving cross-tenant denial.

## Do Not Auto-Fix Yet

- Do not rewrite auth system in one pass.
- Do not hardcode local secrets.
- Do not weaken origin checks.
- Do not bypass JWT/session validation for testing.

## Recommended Safe Order

1. Add password hash helper and local `.dev.vars` setup docs.
2. Add auth route tests.
3. Remove production default employee seed behavior or gate it to local development only.
4. Add tenant/property schema in migrations.
5. Refactor queries to tenant/property scope after tests exist.
