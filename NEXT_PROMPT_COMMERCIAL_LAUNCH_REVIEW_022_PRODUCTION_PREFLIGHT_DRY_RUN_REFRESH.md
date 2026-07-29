# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-022 Production Preflight Dry-Run Refresh

Use only after REVIEW-020 is complete and Ramadan confirms the dry-run refresh
scope.

Goal: refresh production-copy dry-run evidence without touching production.

Strict limits:

1. Do not execute production deploy.
2. Do not execute staging deploy.
3. Do not execute production migration.
4. Do not write production D1.
5. Do not write staging D1.
6. Do not call production URL.
7. Do not enable production feature flags.
8. Do not treat production-copy evidence as production approval.
9. Keep commercial launch `PRODUCTION_NO_GO`.

Allowed only with explicit approval:

1. Confirm target is `homelink-finance-production-copy-dryrun`.
2. Run copy-only schema/backfill/reconciliation refresh.
3. Compare before/after copy snapshots.
4. Refresh money, tenant/property, receivables, audit/event, backend totals, and
   rollback evidence.
5. Produce updated blocker reduction evidence.

Required output:

1. Updated production-copy dry-run refresh result.
2. Updated reconciliation result.
3. Updated blocker reduction map.
4. Confirmation that production D1 write did not occur.
5. Confirmation that production remains `PRODUCTION_NO_GO`.
