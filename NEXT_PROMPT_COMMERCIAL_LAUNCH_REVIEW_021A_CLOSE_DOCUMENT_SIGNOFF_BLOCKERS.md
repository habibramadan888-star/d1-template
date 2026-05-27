# NEXT PROMPT: COMMERCIAL-LAUNCH-REVIEW-021A Close Document Signoff Blockers

Use after REVIEW-021 is complete.

Goal: prepare and apply Ramadan document-only decisions for blockers that do
not require D1 action.

Strict limits:

1. Do not execute production deploy.
2. Do not execute staging deploy.
3. Do not execute production migration.
4. Do not write production D1.
5. Do not write staging D1.
6. Do not write production-copy D1.
7. Do not execute D1 export/import/execute.
8. Do not call production URL.
9. Do not enable production feature flags.
10. Do not modify business code, dashboard, or financial formula.
11. Do not treat `APPROVED_FOR_PREFLIGHT_ONLY` as production approval.
12. Keep production cutover `PRODUCTION_NO_GO`.

Allowed:

1. Read `PRODUCTION_BLOCKER_CLOSURE_PLAN.md`.
2. Read `PRODUCTION_BLOCKER_REDUCTION_BATCHES.md`.
3. Prepare document-only approval packets for SO-001, SO-006, SO-007, SO-008,
   SO-009, SO-010, SO-011, SO-012, SO-013, SO-014, SO-015, SO-016, SO-019, and
   SO-020.
4. Update signoff tracker only when Ramadan explicitly supplies decisions.
5. Leave production write, deploy, feature flags, and cutover unapproved.
