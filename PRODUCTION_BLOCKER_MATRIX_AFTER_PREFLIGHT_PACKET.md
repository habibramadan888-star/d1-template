# Production Blocker Matrix After Preflight Packet

Date: 2026-05-27, Asia/Dubai

Scope: production blocker tracking after creating the preflight-only approval
packet. All listed items still block production.

| Blocker | Area                                        | Why Still Blocks Production                                         | Required Decision                                                                     | Evidence Needed                                                                                 |
| ------- | ------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| SO-001  | Production D1 target confirmation           | No future command can safely run without fresh target confirmation. | Confirm production D1 name and id immediately before any future production command.   | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md` plus fresh read-only D1 confirmation.         |
| SO-002  | Production D1 backup approval               | Production write cannot proceed without restorable backup.          | Approve export path, backup storage, and integrity checks.                            | Backup approval packet and future backup result.                                                |
| SO-003  | Production D1 restore / rollback approval   | Copy rollback evidence is not production rollback approval.         | Approve restore or reverse-update method and verification.                            | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`; copy rollback evidence.                      |
| SO-004  | Production migration approval               | Final production SQL and target guards are not approved.            | Approve exact SQL, target, WHERE clauses, and no unsafe operations.                   | Final SQL review packet.                                                                        |
| SO-005  | Production backfill approval                | Exact production rows and counts are not approved.                  | Approve row-level backfill plan, counts, rollback, and stop conditions.               | `PRODUCTION_MIGRATION_BACKFILL_OWNER_SIGNOFF_LIST.md`; copy row-level dry-run evidence.         |
| SO-006  | Money reconciliation approval               | Accounting signoff is not granted.                                  | Approve reconciliation as preflight-only or keep open.                                | `FINAL_PRODUCTION_APPROVAL_CHECKLIST.md`; `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md`.                |
| SO-007  | TOP_25 money risks approval                 | 22 money/accounting decisions remain open.                          | Decide each residual risk.                                                            | `RAMADAN_TOP_25_MONEY_RISK_DECISION_SHEET.md`.                                                  |
| SO-008  | Tenant/property final SaaS mapping approval | Final mapping is not approved.                                      | Approve, reject, or revise mapping for preflight only first.                          | `RAMADAN_TENANT_PROPERTY_MAPPING_DECISION_SHEET.md`; `TENANT_PROPERTY_MAPPING_RISK_SUMMARY.md`. |
| SO-009  | Legacy CORPID fallback policy approval      | Warning-only fallback policy needs explicit decision.               | Approve fallback limits for preflight only or keep open.                              | `RAMADAN_TENANT_MAPPING_REVIEW_CHECKLIST.md`.                                                   |
| SO-010  | Receivables lifecycle approval              | Q1-Q9 are not production execution approval.                        | Confirm lifecycle rules for preflight only or keep open.                              | `RAMADAN_RECEIVABLES_ACCOUNTING_DECISION_SHEET.md`.                                             |
| SO-011  | Receivables allocation approval             | Allocation/deposit/void/date rules are preflight input only.        | Confirm allocation rules for preflight only or keep open.                             | `RAMADAN_RECEIVABLES_ACCOUNTING_REVIEW_CHECKLIST.md`; `RECEIVABLES_ACCOUNTING_RISK_SUMMARY.md`. |
| SO-012  | Audit/event scope approval                  | Production visibility/query policy is not approved.                 | Approve access policy for preflight only or require more review.                      | P0-006 audit/event evidence and `PRODUCTION_CUTOVER_GO_NO_GO_MATRIX.md`.                        |
| SO-013  | Backend totals authority approval           | Live dashboard authority switch is not approved.                    | Approve authority criteria for preflight only or keep open.                           | Backend totals evidence and money risk matrix.                                                  |
| SO-014  | Employee entry cutover approval             | Production route switch and rollback are unapproved.                | Approve route cutover for preflight only or request more QA.                          | `COMMERCIAL_LAUNCH_P0_STATUS_SUMMARY.md`; staging QA evidence.                                  |
| SO-015  | Handover atomic cutover approval            | Production endpoint switch is unapproved.                           | Approve endpoint cutover for preflight only or request more QA.                       | `COMMERCIAL_LAUNCH_P0_STATUS_SUMMARY.md`; handover staging evidence.                            |
| SO-016  | Production feature flags approval           | Exact flag values and rollback states are missing.                  | Approve feature flag packet in a later task.                                          | Feature flag names, values, rollback states, and monitoring criteria.                           |
| SO-017  | Production deploy approval                  | Deploy is blocked by unresolved upstream approvals.                 | Approve deploy only after production write/migration/rollback/cutover signoffs close. | Deploy command, target, freeze window, verification and rollback checklist.                     |
| SO-018  | Production cutover window approval          | Business cutover is blocked by open NO-GO gates.                    | Approve cutover window only after production preflight and deploy approvals.          | Business acceptance, staffing, freeze, rollback window, monitoring.                             |
| SO-019  | Post-cutover monitoring approval            | Monitoring and escalation are not approved.                         | Approve monitoring, redaction, alerting, escalation, and reconciliation checks.       | `COMMERCIAL_LAUNCH_APPROVAL_MATRIX.md`; `VERIFICATION_STATUS.md`.                               |
| SO-020  | Rollback owner approval                     | Accountable rollback owner and trigger criteria are missing.        | Assign owner and approve rollback triggers.                                           | `PRODUCTION_BACKUP_RESTORE_APPROVAL_CHECKLIST.md`.                                              |

Still-production-blocking signoffs: 20.

## REVIEW-019 Preflight-Only Approval Update

Date: 2026-05-27, Asia/Dubai

The following 9 items are no longer waiting for preflight review approval. They
are approved for preflight planning only, while their production blockers remain
open:

| Signoff | Preflight Review Status     | Still Blocks Production | Production Blocker                                                          |
| ------- | --------------------------- | ----------------------- | --------------------------------------------------------------------------- |
| SO-006  | APPROVED_FOR_PREFLIGHT_ONLY | Yes                     | Production money reconciliation and accounting approval are not granted.    |
| SO-008  | APPROVED_FOR_PREFLIGHT_ONLY | Yes                     | Final production tenant/property mapping is not approved.                   |
| SO-009  | APPROVED_FOR_PREFLIGHT_ONLY | Yes                     | Production legacy CORPID fallback policy is not approved.                   |
| SO-010  | APPROVED_FOR_PREFLIGHT_ONLY | Yes                     | Production receivables migration/backfill/dashboard switch is not approved. |
| SO-011  | APPROVED_FOR_PREFLIGHT_ONLY | Yes                     | Production allocation/backfill/dashboard switch is not approved.            |
| SO-012  | APPROVED_FOR_PREFLIGHT_ONLY | Yes                     | Production audit/event visibility and query enforcement are not approved.   |
| SO-013  | APPROVED_FOR_PREFLIGHT_ONLY | Yes                     | Production backend totals/dashboard authority switch is not approved.       |
| SO-014  | APPROVED_FOR_PREFLIGHT_ONLY | Yes                     | Production employee entry route switch and rollback are not approved.       |
| SO-015  | APPROVED_FOR_PREFLIGHT_ONLY | Yes                     | Production handover endpoint switch and rollback are not approved.          |

Still-production-blocking signoffs remain: 20.

Production cutover remains `PRODUCTION_NO_GO`.
