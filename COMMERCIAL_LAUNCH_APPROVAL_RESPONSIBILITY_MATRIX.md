# Commercial Launch Approval Responsibility Matrix

Date: 2026-05-27, Asia/Dubai

Status: `PENDING_REVIEW`

| Owner Role                          | Person / Team | Approval Areas                                                                              | Required Evidence                                                                               | Status         |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------- |
| Project owner                       | Ramadan Habib | Overall production readiness, launch sequencing, residual risk acceptance                   | Final approval checklist, cutover matrix, blocker list                                          | PENDING_REVIEW |
| Engineering owner                   | Ramadan Habib | Final SQL, feature flags, backend totals, employee entry, handover atomic, deploy readiness | `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md`, `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`  | PENDING_REVIEW |
| Accounting / finance reviewer       | Ramadan Habib | Money conversion, TOP_25 money risks, receivables, arrears, adjustments                     | `FINAL_PRODUCTION_APPROVAL_CHECKLIST.md`, `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md` | PENDING_REVIEW |
| Data migration reviewer             | Ramadan Habib | Production migration/backfill SQL, row counts, rollback rows, data verification             | `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md`                                           | PENDING_REVIEW |
| Security / secrets reviewer         | Ramadan Habib | Secret scan, redaction, observability, production config risk                               | `COMMERCIAL_LAUNCH_APPROVAL_MATRIX.md`, `VERIFICATION_STATUS.md`                                | PENDING_REVIEW |
| Operations / business user reviewer | Ramadan Habib | Production D1 backup, cutover freeze, owner flow, business validation                       | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`, `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`      | PENDING_REVIEW |
| Rollback owner                      | Ramadan Habib | Restore/reverse rollback method, trigger criteria, verification                             | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`                                               | PENDING_REVIEW |
| Deployment owner                    | Ramadan Habib | Deploy command, target, feature flags, post-deploy checks                                   | `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`                                                         | PENDING_REVIEW |

All owner roles are assigned to Ramadan Habib, but each approval category must
still be reviewed independently. No owner role is recorded as approved for
production in this task.
