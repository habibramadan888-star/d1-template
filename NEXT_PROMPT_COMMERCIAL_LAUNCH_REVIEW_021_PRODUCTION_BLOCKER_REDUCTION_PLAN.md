# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-021 Production Blocker Reduction Plan

Use this prompt to reduce remaining commercial launch blockers one by one
through documentation, review packets, and explicit owner decisions. This prompt
does not authorize production execution.

## Goal

Prepare an itemized plan to reduce the 20 production-blocking signoffs without
executing production changes.

## Strict Limits

1. Do not execute production deploy.
2. Do not execute staging deploy.
3. Do not execute production migration.
4. Do not execute remote production D1 migration.
5. Do not write production D1.
6. Do not write staging D1.
7. Do not write production-copy D1.
8. Do not execute D1 export/import/execute.
9. Do not call production URL.
10. Do not modify production config.
11. Do not enable production feature flags.
12. Do not commit secrets.
13. Do not print password, token, or cookie values.
14. Do not mark commercial launch GO.
15. Do not mark any Partial P0 Verified.
16. Do not treat preflight-only approval as production approval.
17. Do not modify business code, dashboard, or financial formula.

## Required Focus Areas

Cover all 20 production blockers:

- Production D1 target confirmation.
- Production backup.
- Production restore / rollback.
- Production migration SQL.
- Production backfill.
- Money reconciliation and TOP_25 risks.
- Tenant/property mapping and legacy CORPID fallback.
- Receivables lifecycle and allocation.
- Audit/event scope.
- Backend totals authority.
- Employee entry and handover cutover.
- Feature flags.
- Deploy.
- Cutover window.
- Monitoring.
- Rollback owner.

## Required Outputs

Generate:

1. `PRODUCTION_BLOCKER_REDUCTION_PLAN.md`
2. `PRODUCTION_BLOCKER_OWNER_DECISION_QUEUE.md`
3. `PRODUCTION_BLOCKER_EVIDENCE_GAP_MATRIX.md`
4. Next prompt for the highest-priority unresolved blocker.

Production status must remain `PRODUCTION_NO_GO`.

Stop after documentation. Do not enter production.
