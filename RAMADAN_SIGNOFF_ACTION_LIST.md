# Ramadan Signoff Action List

Date: 2026-05-27, Asia/Dubai

Owner: Ramadan Habib

Scope: manual signoff preparation only. This file does not approve production.

| Priority | Action                                           | Evidence File                                                                                                 | Decision Needed                                                                 | Suggested Status |
| -------: | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------- |
|        1 | Review TOP_25 money risks                        | `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md`; `MONEY_RISK_RAMADAN_REVIEW_CHECKLIST.md`                               | Close, reject, or explicitly accept each residual risk item by item.            | PENDING_REVIEW   |
|        2 | Review money reconciliation                      | `FINAL_PRODUCTION_APPROVAL_CHECKLIST.md`; `MONEY_RISK_SIGNOFF_UPDATE_RESULT.md`; copy reconciliation evidence | Decide whether copy money evidence is acceptable for production preflight.      | PENDING_REVIEW   |
|        3 | Review tenant/property final mapping             | `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md`                                                         | Approve final SaaS tenant/property IDs and confirm `CORPID` is fallback only.   | MANUAL_REQUIRED  |
|        4 | Review receivables lifecycle and allocation      | `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md`                                                         | Approve lifecycle, allocations, repayments, adjustments, and arrears behavior.  | MANUAL_REQUIRED  |
|        5 | Review production D1 target, backup, and restore | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`                                                             | Confirm target D1, fresh backup, backup location, and restore method.           | MANUAL_REQUIRED  |
|        6 | Review production migration/backfill SQL         | `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`; `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md`                | Approve exact SQL, WHERE clauses, row counts, and rollback.                     | MANUAL_REQUIRED  |
|        7 | Review production rollback                       | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`                                                             | Assign rollback owner and approve trigger criteria and verification.            | MANUAL_REQUIRED  |
|        8 | Review production deploy and feature flags       | `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`; `COMMERCIAL_LAUNCH_APPROVAL_MATRIX.md`                               | Approve exact deploy target, commands, flags, final states, and rollback.       | BLOCKED          |
|        9 | Review business cutover window                   | `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`                                                                       | Approve freeze window, staffing, cutover timing, and launch acceptance.         | BLOCKED          |
|       10 | Review post-cutover monitoring                   | `COMMERCIAL_LAUNCH_APPROVAL_MATRIX.md`; `VERIFICATION_STATUS.md`                                              | Approve monitoring, alerting, redaction, escalation, and reconciliation checks. | MANUAL_REQUIRED  |

Production remains `PRODUCTION_NO_GO` until each required signoff is separately
approved.
