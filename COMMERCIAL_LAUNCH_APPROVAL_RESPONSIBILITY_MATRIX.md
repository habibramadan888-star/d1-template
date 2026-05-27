# Commercial Launch Approval Responsibility Matrix

Date: 2026-05-27, Asia/Dubai

Status: `MANUAL_REQUIRED`

| Owner Role                          | Person / Team   | Approval Areas                                                                              | Required Evidence                                                                               | Status          |
| ----------------------------------- | --------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------- |
| Project owner                       | MANUAL_REQUIRED | Overall production readiness, launch sequencing, residual risk acceptance                   | Final approval checklist, cutover matrix, blocker list                                          | MANUAL_REQUIRED |
| Engineering owner                   | MANUAL_REQUIRED | Final SQL, feature flags, backend totals, employee entry, handover atomic, deploy readiness | `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md`, `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`  | MANUAL_REQUIRED |
| Accounting / finance reviewer       | MANUAL_REQUIRED | Money conversion, TOP_25 money risks, receivables, arrears, adjustments                     | `FINAL_PRODUCTION_APPROVAL_CHECKLIST.md`, `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md` | MANUAL_REQUIRED |
| Data migration reviewer             | MANUAL_REQUIRED | Production migration/backfill SQL, row counts, rollback rows, data verification             | `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md`                                           | MANUAL_REQUIRED |
| Security / secrets reviewer         | MANUAL_REQUIRED | Secret scan, redaction, observability, production config risk                               | `COMMERCIAL_LAUNCH_APPROVAL_MATRIX.md`, `VERIFICATION_STATUS.md`                                | MANUAL_REQUIRED |
| Operations / business user reviewer | MANUAL_REQUIRED | Production D1 backup, cutover freeze, owner flow, business validation                       | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`, `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`      | MANUAL_REQUIRED |
| Rollback owner                      | MANUAL_REQUIRED | Restore/reverse rollback method, trigger criteria, verification                             | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`                                               | MANUAL_REQUIRED |
| Deployment owner                    | MANUAL_REQUIRED | Deploy command, target, feature flags, post-deploy checks                                   | `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`                                                         | MANUAL_REQUIRED |

No owner role is recorded as approved for production in this task.
