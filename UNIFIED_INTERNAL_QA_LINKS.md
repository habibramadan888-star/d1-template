# Unified Internal QA Links

Date: 2026-05-27, Asia/Dubai

Scope: corrected internal QA links for the unified portal. This file does not
approve production deploy, production migration, D1 write, feature flags,
dashboard authority switch, public beta, or commercial launch.

## Primary Entry

| Link Type                | URL                                                                       | Use                                                                  |
| ------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Unified login            | `https://homelink-finance.habibramadan888.workers.dev/unified-login.html` | All internal testers start here.                                     |
| Employee destination     | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`   | Automatic destination after employee/staff role is confirmed.        |
| Owner destination        | `https://homelink-finance.habibramadan888.workers.dev/index.html`         | Automatic destination after owner/manager/admin role is confirmed.   |
| Owner/root compatibility | `https://homelink-finance.habibramadan888.workers.dev/`                   | Preserved old owner/main SPA entry; not the preferred QA start link. |

## Tester Instructions

1. Open the unified login link first.
2. Do not start from separate employee or owner links unless debugging a routing
   issue.
3. Employee/staff login must route to the employee page.
4. Owner/manager/admin login must route to the owner/main SPA.
5. If routing does not match the server-confirmed role, stop and open a bug.
6. Do not submit production-affecting writes on `homelink-finance` without a
   separate explicit production D1 write approval.

## Current Backend Binding

| Worker                     | D1 Binding | Database                   | Internal QA Suitability                                                  |
| -------------------------- | ---------- | -------------------------- | ------------------------------------------------------------------------ |
| `homelink-finance`         | `DB`       | `homelink`                 | Read-only smoke only unless production-linked write approval is granted. |
| `homelink-finance-staging` | `DB`       | `homelink-finance-staging` | Preferred target for full write QA after staging approval.               |

Production remains `PRODUCTION_NO_GO`.
