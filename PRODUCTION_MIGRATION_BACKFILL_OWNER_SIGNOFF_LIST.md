# Production Migration Backfill Owner Signoff List

Date: 2026-05-27, Asia/Dubai

Status: `SIGNOFF_REQUIRED`

| Area                              | Required Owner                 | Evidence Required                                       | Current Status             | Signoff Required |
| --------------------------------- | ------------------------------ | ------------------------------------------------------- | -------------------------- | ---------------- |
| Money `*_fils` conversion         | Accounting + engineering       | Conversion totals, mismatch counts, TOP_25 risk closure | REVIEW_READY_ON_COPY       | Yes              |
| Legacy transaction backfill       | Engineering + data owner       | Exact SQL, row counts, rollback plan                    | MANUAL_REQUIRED            | Yes              |
| Arrears / arrear tasks            | Accounting + receivables owner | Remaining balances, task lifecycle, rollback            | MANUAL_REQUIRED            | Yes              |
| Backend totals authority          | Engineering + accounting       | Authority switch plan and dashboard reconciliation      | MANUAL_REQUIRED            | Yes              |
| Tenant/property mapping           | Business owner + engineering   | Final tenant/property IDs and membership rules          | COMPATIBILITY_ONLY         | Yes              |
| Employee / owner / manager access | Engineering + business owner   | Auth claim and route/query scope approval               | STAGING_EVIDENCE_ONLY      | Yes              |
| Audit logs visibility             | Engineering + business owner   | Tenant/property audit visibility policy                 | MANUAL_REQUIRED            | Yes              |
| Entry events visibility           | Engineering + business owner   | Tenant/property event visibility policy                 | MANUAL_REQUIRED            | Yes              |
| Receivables migration/backfill    | Accounting + engineering       | Receivable, event, allocation, adjustment mapping       | MANUAL_REQUIRED            | Yes              |
| Rollback execution                | Engineering + operations       | Fresh backup, restore/reverse plan, verification        | PASS_WITH_WARNINGS_ON_COPY | Yes              |
| Production deploy                 | Engineering + business owner   | Deploy command, flags, freeze window, monitoring        | NOT_APPROVED               | Yes              |
| Production cutover                | Business owner                 | Launch checklist and residual risk acceptance           | NOT_APPROVED               | Yes              |

No row-level production backfill may run until every applicable signoff is
explicitly approved in a separate task.
