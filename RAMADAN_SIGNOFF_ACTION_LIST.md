# Ramadan Signoff Action List

Date: 2026-05-27, Asia/Dubai

Owner: Ramadan Habib

Scope: manual signoff preparation only. This file does not approve production.

| Priority | Action                                           | Evidence File                                                                                                                                                                                         | Decision Needed                                                                                                                                 | Suggested Status |
| -------: | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
|        1 | Review TOP_25 money risks                        | `RAMADAN_TOP_25_MONEY_RISK_DECISION_SHEET.md`; `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md`                                                                                                                  | Ranks 1, 19, and 22 are closed as false positives; decide the remaining 22 `NEEDS_ACCOUNTING_DECISION` items.                                   | PENDING_REVIEW   |
|        2 | Review money reconciliation                      | `FINAL_PRODUCTION_APPROVAL_CHECKLIST.md`; `MONEY_RISK_SIGNOFF_UPDATE_RESULT.md`; copy reconciliation evidence                                                                                         | Decide whether copy money evidence is acceptable for production preflight.                                                                      | PENDING_REVIEW   |
|        3 | Review tenant/property final mapping             | `RAMADAN_TENANT_PROPERTY_MAPPING_DECISION_SHEET.md`; `TENANT_PROPERTY_MAPPING_RISK_SUMMARY.md`; `RAMADAN_TENANT_MAPPING_REVIEW_CHECKLIST.md`                                                          | Decide final SaaS tenant/property authority, legacy `CORPID` fallback, owner/employee scope, and production-copy evidence boundaries.           | PENDING_REVIEW   |
|        4 | Review receivables lifecycle and allocation      | `RAMADAN_RECEIVABLES_ACCOUNTING_DECISION_SHEET.md`; `RECEIVABLES_ACCOUNTING_RISK_SUMMARY.md`; `RAMADAN_RECEIVABLES_ACCOUNTING_REVIEW_CHECKLIST.md`; `RECEIVABLES_ACCOUNTING_SIGNOFF_UPDATE_RESULT.md` | Q1-Q9 rules are accepted for preflight input; still decide exact production migration/backfill, rollback, and dashboard authority switch later. | PENDING_REVIEW   |
|        5 | Review production D1 target, backup, and restore | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`                                                                                                                                                     | Confirm target D1, fresh backup, backup location, and restore method.                                                                           | MANUAL_REQUIRED  |
|        6 | Review production migration/backfill SQL         | `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`; `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md`                                                                                                        | Approve exact SQL, WHERE clauses, row counts, and rollback.                                                                                     | MANUAL_REQUIRED  |
|        7 | Review production rollback                       | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`                                                                                                                                                     | Assign rollback owner and approve trigger criteria and verification.                                                                            | MANUAL_REQUIRED  |
|        8 | Review production deploy and feature flags       | `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`; `COMMERCIAL_LAUNCH_APPROVAL_MATRIX.md`                                                                                                                       | Approve exact deploy target, commands, flags, final states, and rollback.                                                                       | BLOCKED          |
|        9 | Review business cutover window                   | `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`                                                                                                                                                               | Approve freeze window, staffing, cutover timing, and launch acceptance.                                                                         | BLOCKED          |
|       10 | Review post-cutover monitoring                   | `COMMERCIAL_LAUNCH_APPROVAL_MATRIX.md`; `VERIFICATION_STATUS.md`                                                                                                                                      | Approve monitoring, alerting, redaction, escalation, and reconciliation checks.                                                                 | MANUAL_REQUIRED  |

Production remains `PRODUCTION_NO_GO` until each required signoff is separately
approved.

## REVIEW-016 Preflight Decision Order

Date: 2026-05-27, Asia/Dubai

The next safe decision type is **approve for preflight only**. Do not approve
production write, production deploy, or production cutover from this list.

| Priority | Action                                                                            | Evidence File                                                                                           | Decision Needed                                                                             | Suggested Status           |
| -------: | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------- |
|        1 | Decide remaining TOP_25 money/accounting risks                                    | `RAMADAN_TOP_25_MONEY_RISK_DECISION_SHEET.md`; `COMMERCIAL_LAUNCH_REMAINING_SIGNOFF_CLASSIFICATION.md`  | Close, keep open, or require fix for the remaining 22 money/accounting risks.               | PENDING_RAMADAN_REVIEW     |
|        2 | Decide preflight-only acceptance for tenant/property mapping                      | `RAMADAN_TENANT_PROPERTY_MAPPING_DECISION_SHEET.md`; `PRODUCTION_PREFLIGHT_READINESS_MAP.md`            | Decide whether mapping can be used to prepare a production preflight packet only.           | READY_FOR_PREFLIGHT_REVIEW |
|        3 | Decide preflight-only acceptance for receivables/accounting                       | `RAMADAN_RECEIVABLES_ACCOUNTING_DECISION_SHEET.md`; `RECEIVABLES_ACCOUNTING_SIGNOFF_UPDATE_RESULT.md`   | Confirm Q1-Q9 may drive production preflight planning only.                                 | READY_FOR_PREFLIGHT_REVIEW |
|        4 | Decide preflight-only acceptance for backend totals, employee entry, and handover | `PRODUCTION_PREFLIGHT_READINESS_MAP.md`; `COMMERCIAL_LAUNCH_P0_STATUS_SUMMARY.md`                       | Decide whether these can enter production preflight packet preparation without live switch. | READY_FOR_PREFLIGHT_REVIEW |
|        5 | Prepare manual-required production D1 backup/rollback/SQL approvals               | `RAMADAN_PRODUCTION_PREFLIGHT_DECISION_CHECKLIST.md`; `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md` | Do not approve execution yet; prepare exact approval packets.                               | MANUAL_REQUIRED            |

Production remains `PRODUCTION_NO_GO`.

## REVIEW-018 Preflight-Only Decision Packet

Date: 2026-05-27, Asia/Dubai

The next Ramadan decision is whether the 9 ready items may be approved for
preflight review only. This is not production approval.

| Priority | Action                                  | Evidence File                                                                          | Decision Needed                                                                                                                          | Suggested Status |
| -------: | --------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
|        1 | Decide REVIEW-018 preflight-only packet | `PRODUCTION_PREFLIGHT_ONLY_APPROVAL_PACKET.md`; `READY_FOR_PREFLIGHT_REVIEW_MATRIX.md` | Mark each included item as `APPROVED_FOR_PREFLIGHT_ONLY`, `KEEP_OPEN`, `NEEDS_FIX`, `MANUAL_REQUIRED`, or `BLOCKED`.                     | PENDING_REVIEW   |
|        2 | Keep production write approval separate | `PRODUCTION_BLOCKER_MATRIX_AFTER_PREFLIGHT_PACKET.md`                                  | Confirm that preflight-only approval does not allow production D1 write, migration, deploy, feature flags, dashboard switch, or cutover. | MANUAL_REQUIRED  |

Production remains `PRODUCTION_NO_GO`.
