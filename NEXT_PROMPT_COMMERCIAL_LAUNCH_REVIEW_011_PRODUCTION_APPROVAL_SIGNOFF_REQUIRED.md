# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-011 Production Approval Signoff Required

Use only after COMMERCIAL-LAUNCH-REVIEW-010 is committed.

Goal:

Collect explicit human owner signoffs for production approval. This prompt does
not execute production.

Strict scope:

1. Documentation and approval tracking only unless a later task explicitly
   approves production execution.
2. No production deploy.
3. No production migration.
4. No production D1 write.
5. No production D1 export/import/execute.
6. No production feature flag enablement.
7. No production cutover.
8. Do not mark Partial P0 items Verified.
9. Keep commercial launch gate as `PRODUCTION_NO_GO`.

Required signoffs:

1. Engineering approval for final production SQL and deployment plan.
2. Accounting approval for money conversion and TOP_25 risk closure.
3. Business owner approval for tenant/property mapping.
4. Receivables owner approval for lifecycle/allocation/backfill decision.
5. Operations approval for fresh production backup and restore plan.
6. Security approval for secrets, redaction, and observability.
7. Business owner launch acceptance.

Required outputs:

1. Signed approval record or MANUAL_REQUIRED blocker.
2. Updated production GO / NO-GO matrix.
3. Updated remaining blocker list.
4. If all approvals are complete, generate the next prompt for production
   execution approval. Otherwise generate the next manual review prompt.

Commercial launch must remain `PRODUCTION_NO_GO` unless a later separate task
receives explicit production cutover approval.
