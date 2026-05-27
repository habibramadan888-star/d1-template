# Internal Staging QA Package Index

Date: 2026-05-27, Asia/Dubai

Scope: internal staging QA documentation package. This package does not approve
production deploy, staging deploy, production migration, D1 write, feature
flags, public beta, or commercial launch.

| Package Area           | File                                     | Status | Notes                                                                                                                                                          |
| ---------------------- | ---------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overall test plan      | `FULL_INTERNAL_QA_TEST_PLAN.md`          | READY  | Defines staging-only scope, roles, cycles, pass criteria, and failure handling.                                                                                |
| Employee script        | `EMPLOYEE_INTERNAL_TEST_SCRIPT.md`       | READY  | Covers login, rent, deposit, arrears, short-pay, repayment, void, handover, duplicate, weak network, invalid money, permissions, mobile, and refresh behavior. |
| Owner script           | `OWNER_INTERNAL_TEST_SCRIPT.md`          | READY  | Covers dashboard, due, overdue, arrears, income, deposits, history, filters, voids, handover review, export/report, mobile, permissions, and reconciliation.   |
| Test data plan         | `STAGING_TEST_DATA_PLAN.md`              | READY  | Defines QA-marked staging data and retention/cleanup boundary.                                                                                                 |
| Bug template           | `BUG_REPORT_TEMPLATE.md`                 | READY  | Defines required fields and severity handling.                                                                                                                 |
| QA signoff checklist   | `INTERNAL_QA_SIGNOFF_CHECKLIST.md`       | READY  | Defines internal QA signoff items and closed-pilot boundary.                                                                                                   |
| Daily report template  | `INTERNAL_QA_DAILY_REPORT_TEMPLATE.md`   | READY  | Provides day-by-day QA status and evidence summary.                                                                                                            |
| Scope/accounts summary | `INTERNAL_QA_TEST_SCOPE_AND_ACCOUNTS.md` | READY  | Summarizes staging URL, role slots, and no-secret handling.                                                                                                    |

## Boundary

Internal QA may create manual staging evidence through approved application
flows, but this documentation task did not execute any D1 command and did not
write production, staging, or production-copy D1.

Production remains `PRODUCTION_NO_GO`.
