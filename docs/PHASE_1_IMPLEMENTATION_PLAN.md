# PHASE 1: Code Implementation Execution Plan

## Branch Setup

- [ ] Confirm current branch is `fix/auth-closure-001`.
- [ ] Create implementation branch with `git checkout -b internal/impl-phase-1`.
- [ ] Keep all implementation work on internal branch until Phase 3 sign-off.

## IMPL-001: Backend Totals Authority

- [ ] Wire `deploy-worker/src/handlers/dashboard-totals.js` behind a feature flag.
- [ ] Add route contract for `/api/dashboard/totals`.
- [ ] Validate `computation.version`, `durationMs`, `rowsChecked`, and audit metadata.
- [ ] Confirm totals are integer minor units and backend-authoritative.
- [ ] Deploy to staging only after code review.
- [ ] QA smoke test: PASS.

## IMPL-002: Receivables State Machine

- [ ] Add migration for `receivables_ledger` and status tracking fields.
- [ ] Wire `transitionReceivable` into receivable write paths.
- [ ] Wire `allocatePayment` into payment allocation path.
- [ ] Confirm oldest-first allocation.
- [ ] Confirm `VOIDED`, `ADJUSTED`, and `WRITTEN_OFF` approval behavior.
- [ ] QA state machine test: PASS.

## IMPL-003: Tenant/Property Isolation

- [ ] Wire `buildScopeFilter` or equivalent into all list/read endpoints.
- [ ] Update 25+ list endpoints with tenant and property scope.
- [ ] Confirm employee, owner, admin, and readonly admin behavior.
- [ ] Run access matrix tests.
- [ ] QA isolation test: PASS.

## IMPL-004: Handover Atomicity

- [ ] Add migration for `idempotency_keys`.
- [ ] Wire `handleHandover` behind a feature flag.
- [ ] Confirm idempotency replay behavior.
- [ ] Confirm backend recomputes totals.
- [ ] Confirm failure rollback behavior.
- [ ] QA handover test: PASS.

## IMPL-005: Runtime DDL Cleanup

- [ ] Move runtime DDL to migrations.
- [ ] Replace startup creation with `verifySchema`.
- [ ] Confirm missing schema fails loudly.
- [ ] Confirm fresh DB is created only by migrations.
- [ ] QA verify: PASS.

## IMPL-006: Audit Trail

- [ ] Wire `recordAuditLog` into all mutation endpoints.
- [ ] Implement audit history read endpoint.
- [ ] Confirm sensitive values are redacted.
- [ ] Confirm audit write failures do not corrupt primary operations.
- [ ] QA audit test: PASS.

## Daily Controls

- [ ] 09:00 standup: blockers, accomplishments, plan.
- [ ] Update `PROGRESS_TRACKING.md`.
- [ ] Open issue for any blocker lasting more than 4 hours.
- [ ] Commit reviewed, ready code daily.

## Phase Gate

- [ ] All six IMPL modules wired or explicitly deferred behind flags.
- [ ] Staging deploy succeeds with feature flags off.
- [ ] No critical bugs in readonly smoke.
- [ ] Decision: proceed to Phase 2A or extend Phase 1.
