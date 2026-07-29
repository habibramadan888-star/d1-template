# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-013 Production Preflight After Signoff

Use only after all required production signoffs in
`COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md` are approved.

Goal:

Prepare production preflight after signoff. This prompt must not directly
cutover unless a later task provides explicit production execution approval.

Strict scope:

1. Confirm signoff completeness.
2. Prepare production preflight checklist.
3. Reconfirm production D1 name/id.
4. Prepare fresh production D1 backup plan.
5. Prepare production migration/deploy/feature flag/rollback command review.
6. Do not execute production commands unless separately approved.
7. Do not perform production cutover.

Explicit approvals still required before execution:

1. Production D1 backup.
2. Production migration.
3. Production deploy.
4. Production feature flags.
5. Rollback owner and rollback execution plan.
6. Cutover window and business launch approval.

Required output:

1. Production preflight checklist.
2. Production command review packet.
3. Backup and rollback final approval packet.
4. GO / NO-GO matrix.
5. Next prompt for explicit production execution approval or remaining blocker
   remediation.
