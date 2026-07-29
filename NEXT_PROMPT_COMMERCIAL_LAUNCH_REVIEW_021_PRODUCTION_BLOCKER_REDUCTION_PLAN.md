# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-021 Production Blocker Reduction Plan

Use after REVIEW-020 production preflight execution plan is complete.

Goal: reduce the 20 remaining production blockers one group at a time without
executing production.

Strict limits:

1. Do not execute production deploy.
2. Do not execute staging deploy.
3. Do not execute production migration.
4. Do not write production D1.
5. Do not write staging D1.
6. Do not write production-copy D1 unless a later prompt explicitly approves a
   copy-only dry-run.
7. Do not execute D1 export/import/execute.
8. Do not call production URL.
9. Do not modify production config.
10. Do not enable production feature flags.
11. Do not mark commercial launch GO.
12. Do not mark Partial P0 items Verified.
13. Do not treat `APPROVED_FOR_PREFLIGHT_ONLY` as production approval.

Required work:

1. Read `PRODUCTION_BLOCKER_REDUCTION_PLAN.md`.
2. Read `PRODUCTION_BLOCKER_MATRIX_AFTER_PREFLIGHT_PACKET.md`.
3. Read `COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md`.
4. Classify blockers by evidence gap, Ramadan decision gap, backup/rollback
   gap, SQL gap, deploy gap, monitoring gap, and cutover gap.
5. Generate individual approval packets for the next safest blocker group.
6. Keep all production execution forbidden.
7. Keep production cutover `PRODUCTION_NO_GO`.
