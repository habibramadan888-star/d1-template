# PHASE 1 Detailed Execution Plan

## Objective

Wire IMPL-001 through IMPL-006 into staging behind feature flags without changing production behavior.

## Scope

- Implementation branch only.
- Feature flags default off.
- Staging deployment only after code review.
- No production deploy.

## Entry Criteria

- [ ] Phase 0 completed with GO.
- [ ] Engineering owner assigned for each IMPL item.
- [ ] Migration drafts reviewed but not applied to production.
- [ ] Rollback owner identified.

## Implementation Tracks

### IMPL-001 Backend Totals Authority

- [ ] Route wiring for `/api/dashboard/totals`.
- [ ] Auth claim and tenant scope enforced.
- [ ] Computation metadata returned.
- [ ] Audit event recorded.
- [ ] Existing dashboard behavior preserved while flag is off.

### IMPL-002 Receivables State Machine

- [ ] Migration draft reviewed for `receivables_ledger`.
- [ ] Transition guard wired to write paths.
- [ ] Oldest-first allocation confirmed.
- [ ] Approval checks added for adjusted and written-off states.
- [ ] Ledger write verified.

### IMPL-003 Tenant/Property Isolation

- [ ] Scope filters wired into list/read endpoints.
- [ ] Employee property restrictions enforced.
- [ ] Owner tenant boundary enforced.
- [ ] Readonly admin behavior explicitly documented and tested.

### IMPL-004 Handover Atomicity

- [ ] Idempotency storage migration draft reviewed.
- [ ] Atomic write path wired behind flag.
- [ ] Backend totals recomputation enforced.
- [ ] Duplicate replay response implemented.

### IMPL-005 Runtime DDL Cleanup

- [ ] Runtime DDL inventory checked.
- [ ] Schema verification path added.
- [ ] Worker startup no longer depends on table creation for target tables.

### IMPL-006 Audit Trail

- [ ] Mutation endpoints call audit helper.
- [ ] Sensitive values redacted.
- [ ] Audit read endpoint access controlled.
- [ ] Audit failures do not cause hidden partial commits.

## Daily Controls

- [ ] Morning update: completed, blocked, next action.
- [ ] End-of-day commit with test result reference.
- [ ] Any blocker over 4 hours escalated.

## Go/No-Go Criteria

- GO: All implementation tracks are feature-flagged, reviewed, and staging-ready.
- NO-GO: Any unflagged production behavior change, unscoped query, or failing core regression.

## Output

- Implementation branch ready for Phase 2A staging readonly testing.
