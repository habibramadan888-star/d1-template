# Production Backup Restore Approval Checklist

Date: 2026-05-27, Asia/Dubai

Status: `APPROVAL_REQUIRED`

This checklist defines what must be true before any production write can be
considered. It does not authorize production export, import, execute, migration,
deploy, or cutover.

| Checklist Item                     | Required Before Production Write | Current Status             | Notes                                                                      |
| ---------------------------------- | -------------------------------- | -------------------------- | -------------------------------------------------------------------------- |
| Production D1 name/id confirmed    | Yes                              | MUST_RECONFIRM             | Prior evidence identified `homelink`; reconfirm before production command. |
| Fresh production backup exported   | Yes                              | NOT_DONE_FOR_CUTOVER       | Must be done in a separately approved task.                                |
| Backup stored outside git          | Yes                              | REQUIRED                   | `backups/` must remain ignored.                                            |
| Backup integrity verified          | Yes                              | REQUIRED                   | File exists, size recorded, and restore path tested.                       |
| Restore rehearsal completed        | Yes                              | COPY_REHEARSAL_ONLY        | REVIEW-009 proved copy rollback, not production restore.                   |
| Reverse update plan reviewed       | Yes                              | PASS_WITH_WARNINGS_ON_COPY | Prefer restore from fresh backup unless exact row IDs are approved.        |
| Rollback owner assigned            | Yes                              | MANUAL_REQUIRED            | Operations and engineering owner must sign off.                            |
| Cutover freeze window approved     | Yes                              | MANUAL_REQUIRED            | Required before production mutation.                                       |
| Post-restore verification defined  | Yes                              | MANUAL_REQUIRED            | Row counts, reconciliation, route smoke, and gate checks.                  |
| Production no-go override approved | Yes                              | NOT_APPROVED               | Commercial launch gate currently returns `PRODUCTION_NO_GO`.               |

Rollback recommendation:

1. Prefer restore from a fresh production backup for production rollback.
2. Use reverse updates only if exact primary keys, fields, expected values, and
   owner approvals are recorded.
3. Do not run rollback automatically without a separate explicit approval task.
