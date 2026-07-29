# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-010 Final Production Approval Packet

Use only after COMMERCIAL-LAUNCH-REVIEW-009 rollback rehearsal is committed and
production remains `PRODUCTION_NO_GO`.

Goal:

Prepare the final production approval packet. Do not execute production.

Strict scope:

1. Documentation and approval packet only.
2. No production deploy.
3. No production migration.
4. No production D1 write.
5. No production D1 export/import/execute unless a separate explicit approval task is opened.
6. No production cutover.
7. Do not mark Partial P0 items Verified.
8. Keep commercial launch gate as `PRODUCTION_NO_GO`.

Required inputs:

1. `PRODUCTION_COPY_ROLLBACK_009_READINESS_RESULT.md`
2. `PRODUCTION_COPY_ROLLBACK_009_COMPARISON_RESULT.md`
3. `PRODUCTION_COPY_ROW_BACKFILL_008_MANUAL_RECONCILIATION_REVIEW.md`
4. `PRODUCTION_COPY_ROW_BACKFILL_008_ACCOUNTING_SIGNOFF_CHECKLIST.md`
5. `PRODUCTION_COPY_ROW_BACKFILL_008_TENANT_MAPPING_REVIEW.md`
6. `PRODUCTION_COPY_ROW_BACKFILL_008_RECEIVABLES_DECISION.md`
7. `COMMERCIAL_LAUNCH_APPROVAL_MATRIX.md`
8. `COMMERCIAL_LAUNCH_PRODUCTION_NO_GO_REASONS.md`

Required outputs:

1. Final production approval checklist.
2. Production migration / backfill owner signoff list.
3. Production backup / restore approval checklist.
4. Production cutover go/no-go matrix.
5. Explicit list of remaining NO-GO blockers.

Commercial launch must remain `PRODUCTION_NO_GO` unless a later separate task
receives explicit production cutover approval.
