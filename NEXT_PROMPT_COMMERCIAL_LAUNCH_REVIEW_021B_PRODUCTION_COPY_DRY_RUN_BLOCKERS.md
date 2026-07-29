# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-021B Production-Copy Dry-Run Blockers

Use only after REVIEW-021A is complete and Ramadan explicitly approves
copy-only blocker reduction for Batch 2.

Target blockers:

- SO-004: production migration approval.
- SO-005: production backfill approval.

Goal: refresh isolated production-copy evidence for SO-004 and SO-005 only.
Production D1 must remain untouched.

Strict limits:

1. Do not execute production deploy.
2. Do not execute staging deploy.
3. Do not execute production migration.
4. Do not write production D1.
5. Do not write staging D1.
6. Do not call production URL.
7. Do not enable production feature flags.
8. Do not treat production-copy evidence as production approval.
9. Keep production cutover `PRODUCTION_NO_GO`.

Approval required before any D1 command:

1. Explicitly confirm target D1 is `homelink-finance-production-copy-dryrun`.
2. Explicitly confirm no production write.
3. Explicitly confirm no production deploy.
4. Explicitly confirm no production migration.
5. Explicitly confirm backup / rollback review boundary.

Allowed after explicit approval:

1. Run copy-only schema/migration dry-run refresh for SO-004.
2. Run copy-only row-level backfill dry-run refresh for SO-005.
3. Run copy-only row count / delta / reconciliation checks.
4. Generate refreshed evidence and blocker reduction report.

Forbidden:

1. Production D1 write.
2. Production migration.
3. Production deploy.
4. Production feature flag enablement.
5. Production cutover.
6. Closing SO-004 or SO-005 for production without a later explicit Ramadan
   production decision.
