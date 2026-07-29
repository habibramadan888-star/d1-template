# Ramadan Production Preflight Decision Checklist

Date: 2026-05-27, Asia/Dubai

Audience: non-technical owner review. This checklist separates four different
decision types:

- Approve for preflight only: Codex may prepare a production preflight packet
  or dry-run plan, but must not write production.
- Approve for production write: explicitly allows a scoped production D1 write
  in a later task. This is not recommended now.
- Approve for deploy: explicitly allows production deploy in a later task. This
  is not recommended now.
- Approve for cutover: explicitly allows business cutover. This is not
  recommended now.

Default safe decision now: approve for preflight only where evidence is ready.

| Item                         | What Ramadan Must Decide                                                                                             | Evidence File                                                                   | Safe Decision Now                                                        | If Not Approved                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Money reconciliation         | Whether copy/staging money evidence is acceptable input for a production preflight packet.                           | `FINAL_PRODUCTION_APPROVAL_CHECKLIST.md`; `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md` | Approve for preflight only after remaining money decisions are recorded. | Keep SO-006 pending; do not prepare production money write packet.   |
| TOP_25 money risks           | Whether each remaining money/accounting risk is accepted, rejected, false-positive, or still open.                   | `RAMADAN_TOP_25_MONEY_RISK_DECISION_SHEET.md`                                   | Continue item-by-item review; do not approve production migration.       | Keep SO-007 pending and production blocked.                          |
| Tenant/property mapping      | Whether tenant_id/property_id/owner_id/employee_id mapping is acceptable for preflight planning.                     | `RAMADAN_TENANT_PROPERTY_MAPPING_DECISION_SHEET.md`                             | Approve for preflight only if final SaaS authority is acceptable.        | Keep SO-008 pending; do not prepare production mapping write packet. |
| Legacy CORPID fallback       | Whether `CORPID` may remain warning-only fallback and not final SaaS authority.                                      | `RAMADAN_TENANT_MAPPING_REVIEW_CHECKLIST.md`                                    | Approve for preflight only if fallback limits are accepted.              | Keep SO-009 pending and tenant migration blocked.                    |
| Receivables lifecycle        | Whether Q1-Q9 business rules can drive production preflight planning.                                                | `RAMADAN_RECEIVABLES_ACCOUNTING_DECISION_SHEET.md`                              | Already accepted for preflight input; keep production write blocked.     | Keep SO-010 pending; do not prepare receivables production packet.   |
| Receivables allocation       | Whether oldest-due-first, overpayment, void, deposit, and Dubai date rules can drive preflight planning.             | `RECEIVABLES_ACCOUNTING_SIGNOFF_UPDATE_RESULT.md`                               | Already accepted for preflight input; keep production write blocked.     | Keep SO-011 pending and dashboard authority blocked.                 |
| Audit/event visibility       | Whether audit/event rows must be tenant/property filtered under the same rules as financial rows.                    | `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`                                         | Approve for preflight only after visibility policy is understood.        | Keep SO-012 pending and production query enforcement blocked.        |
| Backend totals authority     | Whether backend totals can be treated as future authority after production preflight proves row counts and rollback. | `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md`                                           | Approve for preflight only; do not switch live dashboard.                | Keep SO-013 pending and dashboard switch blocked.                    |
| Employee entry cutover       | Whether employee entry production cutover can be prepared as a preflight packet.                                     | `COMMERCIAL_LAUNCH_P0_STATUS_SUMMARY.md`                                        | Approve for preflight only; do not switch live route.                    | Keep SO-014 pending and production employee entry blocked.           |
| Handover atomic cutover      | Whether handover atomic endpoint cutover can be prepared as a preflight packet.                                      | `COMMERCIAL_LAUNCH_P0_STATUS_SUMMARY.md`                                        | Approve for preflight only; do not switch live endpoint.                 | Keep SO-015 pending and production handover cutover blocked.         |
| Production D1 target         | Whether the production D1 name/id is correct immediately before any future command.                                  | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`                               | Do not approve until a future command-specific preflight task.           | Keep SO-001 manual-required and no D1 command allowed.               |
| Production backup            | Whether fresh backup/export and storage location are acceptable.                                                     | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`                               | Prepare approval packet only; do not export now.                         | Keep SO-002 manual-required and production write blocked.            |
| Production rollback          | Whether restore/reverse update method, owner, and trigger criteria are acceptable.                                   | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`                               | Prepare approval packet only; do not rollback now.                       | Keep SO-003/SO-020 manual-required.                                  |
| Production SQL/backfill      | Whether exact production SQL, WHERE clauses, row counts, and rollback are acceptable.                                | `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md`                           | Prepare SQL review packet only; do not execute.                          | Keep SO-004/SO-005 manual-required.                                  |
| Feature flags/deploy/cutover | Whether production flags, deploy, and business cutover can be approved.                                              | `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`                                         | Do not approve now; wait for upstream signoffs.                          | SO-016 remains manual-required; SO-017/SO-018 remain blocked.        |
| Post-cutover monitoring      | Whether alerting, redaction, escalation, and reconciliation checks are sufficient.                                   | `COMMERCIAL_LAUNCH_APPROVAL_MATRIX.md`; `VERIFICATION_STATUS.md`                | Prepare monitoring checklist only.                                       | Keep SO-019 manual-required.                                         |

Current recommendation: do not approve production write, production deploy, or
production cutover. The next safe step is a production preflight-only approval
packet.
