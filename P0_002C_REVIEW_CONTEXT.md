# P0-002C Review Context

Generated: 2026-05-24, Asia/Dubai

Scope: implementation review gate only. No live endpoint, employee live handover flow, dashboard live result, production migration, remote D1 migration, production deployment, or secret change was performed.

## What P0-002B Proved

1. A full employee handover batch can be represented as one backend commit draft instead of unrelated per-row uploads.
2. Backend code can recompute cash, bank, gross, rent, deposit, arrears, and session totals from submitted rows.
3. Frontend submitted totals are comparison inputs only; tampered totals produce structured discrepancy evidence.
4. Same idempotency key plus same payload can return idempotent replay without planning duplicate financial writes.
5. Same rows under a different idempotency key can be detected as duplicate risk.
6. Weak-network retry can be modeled without duplicate accepted results.
7. Voided session or transaction rows are rejected from the handover commit plan.
8. Unauthorized employee scope and owner submitter attempts are rejected by the non-invasive module.
9. Audit and entry event plans are generated for attempts, accepted rows, and rejected rows.
10. Disposable local D1 rehearsal passes without production D1, remote D1, or production Worker usage.

## What P0-002B Did Not Prove

1. No live Worker route is wired.
2. No real server endpoint currently persists `handover_commits` or `handover_commit_rows`.
3. No staging or production D1 migration was executed.
4. The employee UI still does not call an atomic commit endpoint.
5. Owner dashboard live totals still do not consume atomic handover commits.
6. Real D1 transaction-like acceptance, concurrency behavior, and idempotency persistence are not proven.
7. Receivable creation and payment allocation are not wired to live accounting flows.
8. Multi-tenant company/property scope is not enforced beyond current static CORPID limitations.
9. Production-disabled behavior is not yet implemented or tested in a live route.
10. Rollback has not been exercised against a staging endpoint.

## Safe Scope For P0-002C Staging Endpoint

1. Add a local/staging-only endpoint behind a feature flag.
2. Reuse `modules/finance/handover-atomic.mjs` and backend totals helpers.
3. Require authenticated employee scope for submit.
4. Reject owner/admin submit attempts while allowing future read/review endpoints separately.
5. Persist only to reviewed staging/draft tables or a local/staging disposable schema.
6. Store backend recomputed totals, frontend submitted totals, discrepancy status, idempotency state, and audit evidence.
7. Keep the current legacy employee handover flow untouched.
8. Keep owner dashboard live output untouched.
9. Add endpoint tests, auth tests, idempotency tests, and staging rehearsal scripts.
10. Keep P0-002 status Partial after implementation because production live cutover is still future work.

## Not Safe For Live Production Yet

1. Enabling atomic handover in production.
2. Switching the employee UI to the new endpoint.
3. Replacing owner dashboard totals.
4. Running production or remote D1 migration.
5. Treating legacy decimal fields as final accounting authority.
6. Generating live receivables from the endpoint before P0-008 is decided.
7. Expanding SaaS usage before P0-006 tenant isolation is implemented.
8. Removing legacy handover code.

## Dependencies

| Dependency                            | Impact On P0-002C                                                                                                                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0-001C money minor units             | Live production should dual-write or store authoritative fils fields before relying on the endpoint as final accounting truth. Staging can use draft `*_fils` fields if isolated. |
| P0-003C backend totals live authority | Dashboard and handover totals must eventually come from backend recompute. P0-002C can rehearse this but should not switch dashboard live results.                                |
| P0-008 receivables                    | Short pay, tail amount, arrears, repayment allocation, and outstanding balance lifecycle need formal receivables before production accounting closure.                            |
| P0-006 tenant isolation               | Endpoint must not become a SaaS route until company/property/user membership scope is enforced server-side.                                                                       |
| P1 audit model                        | Staging can write existing `audit_logs`/`entry_events`; production should converge on immutable unified audit events.                                                             |

## Human Decisions Required

1. Final staging endpoint path and whether the future live path differs.
2. Whether frontend total mismatch should reject immediately or accept with audit hold in staging.
3. Whether staging tables should include dual-write fils fields now.
4. Whether to reserve `tenant_id` or use `company_id` as the canonical tenant key.
5. Which staging D1 database and Worker environment are approved for endpoint rehearsal.
6. Whether owner/admin should have read-only review API in the same P0-002C task or later.
7. Rollback criteria and who can approve disabling the feature flag.
