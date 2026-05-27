# Internal Staging QA Package Index

Date: 2026-05-28, Asia/Dubai

Scope: internal staging QA documentation package. This package does not approve
production deploy, staging deploy, production migration, D1 write, feature
flags, public beta, or commercial launch.

| Package Area           | File                                                                                                                                     | Status | Notes                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overall test plan      | `FULL_INTERNAL_QA_TEST_PLAN.md`                                                                                                          | READY  | Defines corrected role links, QA boundaries, roles, cycles, pass criteria, and failure handling.                                                               |
| Real links review      | `INTERNAL_QA_REAL_LINKS_REVIEW.md`                                                                                                       | READY  | Confirms the employee entry link, owner/main app candidate links, live unified-login route, and Worker/D1 binding risk.                                        |
| Unified login design   | `UNIFIED_LOGIN_DESIGN.md`                                                                                                                | READY  | Defines `/api/me` authority, role routing, security rules, and compatibility paths.                                                                            |
| Unified links          | `UNIFIED_INTERNAL_QA_LINKS.md`                                                                                                           | READY  | Gives testers one login link and documents destination links and write-risk boundaries.                                                                        |
| Session handoff fix    | `UNIFIED_LOGIN_DOUBLE_LOGIN_DIAGNOSIS.md`; `UNIFIED_LOGIN_OWNER_SESSION_HANDOFF_FIX.md`; `UNIFIED_LOGIN_EMPLOYEE_SESSION_HANDOFF_FIX.md` | READY  | Documents the double-login root cause and the `/api/me` handoff fix for owner and employee destinations.                                                       |
| Start guide            | `INTERNAL_QA_START_GUIDE.md`                                                                                                             | READY  | Gives testers the unified login link plus no-write safety boundary.                                                                                            |
| Employee script        | `EMPLOYEE_INTERNAL_TEST_SCRIPT.md`                                                                                                       | READY  | Covers login, rent, deposit, arrears, short-pay, repayment, void, handover, duplicate, weak network, invalid money, permissions, mobile, and refresh behavior. |
| Owner script           | `OWNER_INTERNAL_TEST_SCRIPT.md`                                                                                                          | READY  | Covers dashboard, due, overdue, arrears, income, deposits, history, filters, voids, handover review, export/report, mobile, permissions, and reconciliation.   |
| Test data plan         | `STAGING_TEST_DATA_PLAN.md`                                                                                                              | READY  | Defines QA-marked staging data and retention/cleanup boundary.                                                                                                 |
| Bug template           | `BUG_REPORT_TEMPLATE.md`                                                                                                                 | READY  | Defines required fields and severity handling.                                                                                                                 |
| QA signoff checklist   | `INTERNAL_QA_SIGNOFF_CHECKLIST.md`                                                                                                       | READY  | Defines internal QA signoff items and closed-pilot boundary.                                                                                                   |
| Daily report template  | `INTERNAL_QA_DAILY_REPORT_TEMPLATE.md`                                                                                                   | READY  | Provides day-by-day QA status and evidence summary.                                                                                                            |
| Scope/accounts summary | `INTERNAL_QA_TEST_SCOPE_AND_ACCOUNTS.md`                                                                                                 | READY  | Summarizes corrected role links, role slots, and no-secret handling.                                                                                           |
| Live smoke result      | `INTERNAL_QA_005B_UNIFIED_LOGIN_LIVE_SMOKE_RESULT.md`                                                                                    | PASS   | Confirms live `/unified-login.html` returns `text/html`; no D1 write or business write occurred.                                                               |

## Boundary

The unified login link is
`https://homelink-finance.habibramadan888.workers.dev/unified-login.html`.
Employee and owner destinations remain compatibility paths, but testers should
not start from separate role-specific links. Local project files show that this
Worker name is configured with the `homelink` D1 binding, so it is not safe for
write-style QA unless production D1 writes are separately approved. This task did
not execute any D1 command and did not write production, staging, or
production-copy D1.

Production remains `PRODUCTION_NO_GO`.

Unified login should require only one login after the session handoff fix is
deployed. A second owner password prompt or employee PIN prompt after successful
unified login is a bug, not expected QA behavior.
