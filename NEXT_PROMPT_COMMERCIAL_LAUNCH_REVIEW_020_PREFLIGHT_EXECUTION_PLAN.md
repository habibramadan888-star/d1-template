# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-020 Production Preflight Execution Plan

Use this prompt only after REVIEW-019 has recorded Ramadan Habib's
`APPROVED_FOR_PREFLIGHT_ONLY` decisions.

## Goal

Prepare the production preflight execution plan only. The plan may cover:

1. Production preflight planning.
2. Production-copy dry-run planning.
3. Final SQL review.
4. Backup review.
5. Rollback review.
6. Row count and verification checklist design.

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

## Required Outputs

Generate:

1. `COMMERCIAL_LAUNCH_REVIEW_020_STARTING_CONTEXT.md`
2. `PRODUCTION_PREFLIGHT_EXECUTION_PLAN.md`
3. `PRODUCTION_PREFLIGHT_SQL_REVIEW_PLAN.md`
4. `PRODUCTION_PREFLIGHT_BACKUP_ROLLBACK_PLAN.md`
5. `PRODUCTION_PREFLIGHT_VERIFICATION_CHECKLIST.md`
6. Next prompt for human approval of any future production command.

Production status must remain `PRODUCTION_NO_GO`.

Stop after documentation. Do not enter production.
