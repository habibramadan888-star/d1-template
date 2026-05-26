# Production Copy Migration / Backfill Dry-Run Matrix

Date: 2026-05-26, Asia/Dubai

Status: `MANUAL_REQUIRED`

| Area                           | Dry-run Target                                   | Required Inputs                                                                 | Risk                                        | Owner Approval               | Status             |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------- | ------------------ |
| Money minor-unit migration     | Production-copy D1 only                          | Money migration SQL, row counts, reconciliation rules, TOP_25 review            | Incorrect monetary conversion or rounding   | Engineering + accounting     | MANUAL_REQUIRED    |
| Employee entry adapter cutover | Production-copy D1 / local Worker rehearsal only | Employee entry write plan, idempotency rules, staging QA evidence               | Partial write or wrong authority source     | Engineering + business owner | MANUAL_REQUIRED    |
| Handover atomic                | Production-copy D1 / local rehearsal only        | Atomic tables, idempotency, audit/entry event evidence                          | Duplicate or partial handover commit        | Engineering + accounting     | MANUAL_REQUIRED    |
| Backend totals authority       | Production-copy D1 / report-only comparison      | Backend totals helper, dashboard/history comparison, P0-001/P0-008 dependencies | Wrong dashboard/accounting authority        | Engineering + accounting     | MANUAL_REQUIRED    |
| Receivables                    | Production-copy D1 only                          | Receivable migration/backfill, payment allocation, adjustment review            | Wrong due/overdue/arrears authority         | Accounting + engineering     | MANUAL_REQUIRED    |
| Tenant/property scope          | Production-copy D1 only                          | P0-006 mapping, auth claim contract, route/query matrix                         | Cross-tenant leakage or over-filtering      | Engineering + business owner | MANUAL_REQUIRED    |
| audit_logs / entry_events      | Production-copy D1 only                          | Scope fields, audit visibility policy, retention rules                          | Missing compliance evidence or overexposure | Engineering + business owner | MANUAL_REQUIRED    |
| Rollback verification          | Production-copy D1 only                          | Backup restore plan, reverse updates, flag rollback                             | Failed rollback after live issue            | Engineering / operations     | MANUAL_REQUIRED    |
| Commercial launch gate         | Local report gate                                | All P0/P1 evidence, approval matrix, owner signoff                              | False GO signal                             | Engineering + business owner | `PRODUCTION_NO_GO` |

Conclusion: every migration/backfill area remains manual-required. Nothing in
this matrix authorizes direct production work.
