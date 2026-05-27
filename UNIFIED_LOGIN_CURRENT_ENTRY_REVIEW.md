# Unified Login Current Entry Review

Date: 2026-05-27, Asia/Dubai

Scope: local code and documentation review only. No production deploy, migration,
D1 command, D1 write, feature flag change, dashboard formula change, or financial
formula change was executed.

## Findings

| Question                                    | Answer                                                                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Current employee entry                      | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`; local asset: `deploy-worker/public/employee-v3.html`.                                                                   |
| Current owner entry                         | `https://homelink-finance.habibramadan888.workers.dev/` or `/index.html`; local asset: `deploy-worker/public/index.html`.                                                                        |
| Is login duplicated?                        | Yes. Main SPA uses `/auth/login` with password-only manager/staff auth. Employee v3 uses `/auth/employee-login` with `employee_id` + `pin`.                                                      |
| Where does role come from?                  | Worker auth returns role after password/PIN verification and creates a session/JWT cookie. `/api/me` returns the current server-confirmed role.                                                  |
| Is role backend-confirmed?                  | Yes for `/auth/login`, `/auth/employee-login`, and `/api/me`. The new unified portal routes only after `/api/me`.                                                                                |
| Can employee access owner side today?       | Existing main SPA can accept a `staff` role, but owner-only navigation/API remains locked. New compatibility routing redirects `staff`/`employee` from the main SPA login to `employee-v3.html`. |
| Can owner enter employee submit page today? | Not through the unified portal. Owner/manager roles route to `/index.html`; employee workflows remain employee/staff-only unless explicitly granted.                                             |
| Paths to preserve                           | `/`, `/index.html`, `/index-51.html`, `/employee-v3.html`.                                                                                                                                       |
| Paths to prefer for QA                      | `/unified-login.html` as the single login portal.                                                                                                                                                |

## Auth / Session Review

| Area                   | Current Behavior                                                                                             | Risk / Note                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `/auth/login`          | Verifies owner/manager/staff password via `USER_ACCOUNTS` or legacy password hashes and sets session cookie. | Current role vocabulary is mainly `manager` and `staff`; owner maps to manager in the current Worker. |
| `/auth/employee-login` | Verifies `employee_users.employee_id` + PIN and sets a shorter employee session.                             | Employee refresh behavior intentionally requires re-entry on the employee page.                       |
| `/api/me`              | Requires valid session/JWT and returns `userid`, `employee_name`, `corpid`, `role`, and `isManager`.         | This is the authority used by unified login routing.                                                  |
| Frontend route role    | New portal ignores frontend-supplied role, tenant, and property values.                                      | Frontend values are display/routing hints only, not authorization authority.                          |
| Legacy CORPID          | Current Worker still carries `CORPID = homelink` for default env.                                            | Warning-only for SaaS authority; tenant/property claims remain required for production readiness.     |

## Production Boundary

The default `homelink-finance` Worker is configured with `DB = homelink`. Any
manual write flow on the production-linked URL can affect production D1. This
task only changes login UI/routing code and documentation. Production remains
`PRODUCTION_NO_GO`.
