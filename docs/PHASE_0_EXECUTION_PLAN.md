# PHASE 0: Readonly Smoke Test Execution Plan

## Setup

- [ ] Identify target environment: staging preferred, production only if explicitly approved.
- [ ] Verify test users exist: `employee@test.com`, `owner@test.com`, `admin@test.com`.
- [ ] Create result tracking sheet from `docs/SMOKE_TEST_RESULT_TEMPLATE.md`.
- [ ] Brief QA team on readonly procedure and screenshot capture.

## Execution

- [ ] Test 1: Employee login.
- [ ] Test 2: Owner login.
- [ ] Test 3: Admin login.
- [ ] Test 4: Auth route closure, `/owner.html` redirects to `/owner`.
- [ ] Test 5: Employee property list.
- [ ] Test 6: Employee entries list.
- [ ] Test 7: Employee history.
- [ ] Test 8: Employee customers.
- [ ] Test 9: Employee dashboard overview.
- [ ] Test 10: Employee dashboard totals.
- [ ] Test 11: Employee arrears modal.
- [ ] Test 12: Employee search/filter.
- [ ] Test 13: Owner dashboard.
- [ ] Test 14: Owner all-properties view.
- [ ] Test 15: Owner totals.
- [ ] Test 16: Owner history.
- [ ] Test 17: Owner arrears.
- [ ] Test 18: Owner reports.
- [ ] Test 19: Admin dashboard.
- [ ] Test 20: Admin view entries with no edit buttons.
- [ ] Test 21: Admin view totals.
- [ ] Test 22: Admin view history.
- [ ] Test 23: Admin view audit trail.
- [ ] Test 24: Admin permissions enforced with 403 on write.
- [ ] Test 25: Employee cross-property isolation.
- [ ] Test 26: Owner cross-tenant isolation.
- [ ] Test 27: Admin full access with readonly enforcement.
- [ ] Test 28: System uptime.
- [ ] Test 29: Error rate below 0.1%.
- [ ] Test 30: Database connectivity.

## Analysis

- [ ] Compile pass/fail results.
- [ ] Calculate pass rate.
- [ ] Document failures with screenshot, error, root cause, and owner.
- [ ] Record latency and availability metrics.

## Go/No-Go

- [ ] GO: 30/30 pass, proceed to Phase 1.
- [ ] NO-GO: 1 or more failures, investigate and retest.
