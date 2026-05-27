# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-008 Manual Reconciliation Review

Use only after COMMERCIAL-LAUNCH-REVIEW-007 completes with
`MANUAL_REQUIRED`.

Current copy target:

`homelink-finance-production-copy-dryrun`

Required scope:

1. Review copy-only row-level backfill results.
2. Review money `*_fils` conversions against accounting expectations.
3. Review tenant/property compatibility mapping warnings.
4. Review audit/event visibility mapping warnings.
5. Decide whether receivables data backfill needs a separate copy-only task.
6. Decide whether copy rollback rehearsal can proceed.

Strictly forbidden:

1. No production deploy.
2. No production migration.
3. No production D1 write.
4. No production cutover.
5. No production feature flags.
6. No staging D1 write.
7. No secret commit.
8. Do not mark Partial P0 items Verified.
9. Do not mark commercial launch GO.

Required outputs:

1. `PRODUCTION_COPY_ROW_BACKFILL_008_MANUAL_RECONCILIATION_REVIEW.md`
2. `PRODUCTION_COPY_ROW_BACKFILL_008_ACCOUNTING_SIGNOFF_CHECKLIST.md`
3. `PRODUCTION_COPY_ROW_BACKFILL_008_TENANT_MAPPING_REVIEW.md`
4. `PRODUCTION_COPY_ROW_BACKFILL_008_RECEIVABLES_DECISION.md`
5. Next prompt for copy rollback rehearsal or remediation.

Commercial launch gate must remain `PRODUCTION_NO_GO`.
