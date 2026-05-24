# Next Prompt: P0-002C Staging Implementation

Use this prompt only after human GO approval of `P0_002C_GO_NO_GO_CHECKLIST.md`.

```text
TASK P0-002C: Implement staging/local-only handover atomic commit endpoint.

Current gate:
- P0-002B rehearsal passed.
- P0-002C Review Gate approved by human reviewer.
- Approved endpoint path: POST /api/staging/handover/commit.
- Approved feature flag: ENABLE_HANDOVER_ATOMIC_STAGING.
- Approved environment guard: APP_ENV must be development/local/staging.
- Production must be disabled.

Goal:
Implement a staging/local-only Worker endpoint that accepts an employee handover batch, validates auth/scope, validates idempotency, recomputes backend totals, detects frontend total mismatch, rejects voided rows, records staging audit evidence, and returns structured result.

Strict restrictions:
1. Do not switch live employee handover flow.
2. Do not modify employee production UI.
3. Do not modify owner dashboard live result.
4. Do not modify production financial formula.
5. Do not execute production D1 migration.
6. Do not execute remote D1 migration.
7. Do not deploy production Worker.
8. Do not submit secrets.
9. Do not implement P0-001C minor-unit live dual-write.
10. Do not formally land P0-008 receivables.
11. Do not implement P0-006 tenant rewrite.
12. Do not delete legacy handover logic.
13. Do not bypass auth or money validation to make tests pass.
14. P0-002 remains Partial after this task.

Implementation requirements:
1. Add route POST /api/staging/handover/commit only behind ENABLE_HANDOVER_ATOMIC_STAGING=true.
2. Return disabled/404 when APP_ENV=production.
3. Require server-side auth.
4. Allow only employee/staff submitter.
5. Reject owner/admin submitter.
6. Reuse modules/finance/handover-atomic.mjs.
7. Reuse backend totals and money helper behavior.
8. Implement server-side idempotency storage for staging/local only.
9. Same idempotency key + same fingerprint returns replay.
10. Same idempotency key + different fingerprint returns conflict.
11. Same rows under different idempotency key returns duplicate warning or rejection.
12. Frontend totals mismatch must be rejected in staging with structured discrepancy.
13. Voided rows must be rejected.
14. Audit attempt and accepted/rejected result must be persisted or explicitly staged in D1.
15. Do not write live legacy financial records as final accounting facts.

Files likely affected:
- deploy-worker/src/index.js
- modules/finance/handover-atomic.mjs only if a non-invasive helper is missing
- migration-drafts/handover_atomic_commit_draft.sql or a local/staging migration draft
- tests/handover-staging-endpoint.spec.mjs
- scripts/rehearse-handover-staging-endpoint.mjs
- package.json
- RUN_REPORT.md
- VERIFICATION_STATUS.md
- P0_P1_STATUS_REVIEW.md
- COMMERCIALIZATION_BACKLOG.md

Required tests:
- npm run check
- npm run smoke:with-worker
- npm run verify:clean-d1
- npm run test:delete-session
- npm run test:money
- npm run audit:money
- npm run test:backend-totals
- npm run rehearse:backend-totals
- npm run test:handover-atomic
- npm run rehearse:handover-atomic
- new endpoint test command
- new endpoint rehearsal command

Final status:
- P0-002 status must be: Partial - staging endpoint implementation rehearsal passed
- Do not mark P0-002 Verified, Done, or Fixed.
```
