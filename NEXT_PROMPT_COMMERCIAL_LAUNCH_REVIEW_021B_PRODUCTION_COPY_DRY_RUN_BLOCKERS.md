# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-021B Production-Copy Dry-Run Blockers

Use after REVIEW-021 is complete and Ramadan explicitly approves copy-only
dry-run refresh.

Goal: reduce blockers that need refreshed production-copy evidence. Production
D1 must remain untouched.

Strict limits:

1. Do not execute production deploy.
2. Do not execute staging deploy.
3. Do not execute production migration.
4. Do not write production D1.
5. Do not write staging D1.
6. Do not call production URL.
7. Do not enable production feature flags.
8. Do not treat copy evidence as production approval.
9. Keep production cutover `PRODUCTION_NO_GO`.

Allowed only with explicit confirmation:

1. Confirm target D1 is `homelink-finance-production-copy-dryrun`.
2. Run copy-only schema/migration dry-run refresh.
3. Run copy-only row-level backfill dry-run refresh.
4. Run copy-only reconciliation for money, tenant/property, receivables,
   audit/event, and backend totals.
5. Generate evidence for SO-004, SO-005, SO-006, SO-010, SO-011, SO-012, and
   SO-013.
6. Do not close production blockers without a later Ramadan production
   decision.
