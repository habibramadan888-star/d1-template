# Next Prompt: P0-001E Local/Staging Dual-Write Rehearsal

Use this prompt only after P1-006B has completed and no real deploy is required.

```text
Enter TASK P0-001E: local/staging-only money minor-unit dual-write rehearsal.

Current state:
1. P0-001D-GATE is complete.
2. P1-006B controlled embedded Worker write is complete.
3. Embedded artifact freshness is verified.
4. No production deploy has been executed.
5. No staging deploy has been executed.
6. No production or remote D1 migration has been executed.

Goal:
Rehearse minor-unit dual-write in local/staging-only paths using `*_fils` fields and reconciliation evidence, without changing live accounting results.

Strictly forbidden:
1. Do not execute production D1 migration.
2. Do not execute remote D1 migration.
3. Do not deploy production or staging Worker.
4. Do not switch live dashboard totals to minor units.
5. Do not switch live employee handover flow.
6. Do not delete legacy decimal / REAL fields.
7. Do not modify live transactions / deposit_ledger / arrears write paths.
8. Do not implement P0-008 receivables production model.
9. Do not implement P0-006 tenant rewrite.
10. Do not mark P0-001 Verified.

Allowed:
1. Add local/staging-only rehearsal migration drafts or disposable test tables.
2. Add dual-write rehearsal scripts.
3. Add dry-run backfill and reconciliation scripts.
4. Add tests and reports.
5. Update RUN_REPORT, VERIFICATION_STATUS, P0_P1_STATUS_REVIEW, COMMERCIALIZATION_BACKLOG, and NEXT_MORNING_REVIEW.

Required verification:
1. npm run check
2. npm run smoke:with-worker
3. npm run verify:clean-d1
4. npm run test:money
5. npm run audit:money
6. npm run triage:money
7. npm run test:money-dual-write
8. npm run rehearse:money-dual-write
9. npm run gate:money-reconciliation
10. npm run test:backend-totals
11. npm run rehearse:backend-totals
12. npm run test:handover-staging-endpoint
13. npm run rehearse:handover-staging-endpoint
14. npm run verify:dashboard-unchanged
15. npm run verify:handover-legacy-unchanged
16. npm run audit:worker-drift
17. npm run verify:embedded-worker
18. npm run build:embedded:dry-run
19. npm run smoke:embedded-with-worker
20. npm run security:secrets

Final status:
P0-001 can only remain Partial unless live write/read paths are reviewed, switched, reconciled, and approved in a later task.
```
