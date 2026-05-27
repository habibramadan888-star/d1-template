# Production Preflight Readiness Map

Date: 2026-05-27, Asia/Dubai

Scope: preflight planning only. This map does not approve production writes,
deploy, migration, feature flags, dashboard authority switch, or cutover.

| Preflight Area                    | Required Evidence                                                            | Current Status             | Next Required Action                                                                     | Risk     |
| --------------------------------- | ---------------------------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| Production D1 target confirmation | Fresh D1 name/id confirmation immediately before any production command      | MANUAL_REQUIRED            | Ramadan must confirm production D1 target in a future explicit approval task.            | HIGH     |
| Production D1 backup              | Fresh export path outside git, integrity check, restore path                 | MANUAL_REQUIRED            | Prepare backup approval packet; do not export until explicitly approved.                 | BLOCKING |
| Production restore / rollback     | Restore or reverse-update method, owner, trigger criteria, verification      | MANUAL_REQUIRED            | Approve rollback owner and rollback trigger rules.                                       | BLOCKING |
| Production migration SQL          | Final SQL, target guard, no unsafe operations, exact row counts              | MANUAL_REQUIRED            | Produce final SQL review packet for Ramadan; do not execute.                             | BLOCKING |
| Money AED-to-fils conversion      | TOP_25 decisions, reconciliation, warning handling, rollback                 | PENDING_RAMADAN_REVIEW     | Ramadan must decide 22 remaining money/accounting risks.                                 | HIGH     |
| Tenant/property mapping           | Final tenant_id/property_id/owner/employee mapping and CORPID fallback rules | READY_FOR_PREFLIGHT_REVIEW | Ramadan can approve/reject mapping for preflight-only planning.                          | HIGH     |
| Receivables migration/backfill    | Q1-Q9 decisions, exact SQL, row counts, rollback, dashboard authority limits | READY_FOR_PREFLIGHT_REVIEW | Use Q1-Q9 as preflight input; generate exact production preflight packet next.           | HIGH     |
| Backend totals authority          | Staging/copy comparison, dashboard/history authority boundaries              | READY_FOR_PREFLIGHT_REVIEW | Ramadan can review authority switch criteria for preflight-only planning.                | HIGH     |
| Employee entry cutover            | Staging QA, production route plan, rollback                                  | READY_FOR_PREFLIGHT_REVIEW | Ramadan can review cutover conditions, but production route switch remains forbidden.    | MEDIUM   |
| Handover atomic cutover           | Staging QA, atomic commit evidence, production endpoint plan                 | READY_FOR_PREFLIGHT_REVIEW | Ramadan can review cutover conditions, but production endpoint switch remains forbidden. | MEDIUM   |
| Dashboard authority switch        | Backend totals and receivables authority evidence, rollback flag states      | MANUAL_REQUIRED            | Define exact flags and switch sequencing after accounting signoff.                       | BLOCKING |
| Production feature flags          | Exact names, final values, rollback values, monitoring criteria              | MANUAL_REQUIRED            | Draft feature flag approval packet; do not enable flags.                                 | BLOCKING |
| Production deploy                 | Deploy command, target, freeze window, verification, rollback                | BLOCKED                    | Wait until upstream production write/migration/cutover signoffs close.                   | BLOCKING |
| Production cutover window         | Business acceptance, staffing, freeze, rollback window                       | BLOCKED                    | Wait until production migration, deploy, rollback, and monitoring approvals close.       | BLOCKING |
| Post-cutover monitoring           | Alerting, redaction, dashboards, reconciliation, escalation                  | MANUAL_REQUIRED            | Prepare monitoring approval checklist before any cutover approval.                       | HIGH     |

Conclusion: several areas are ready for preflight-only review, but no area is
approved for production execution. Production remains `PRODUCTION_NO_GO`.
