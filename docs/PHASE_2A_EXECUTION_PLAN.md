# PHASE 2A: Readonly Features Testing Execution Plan

## Day 1: `BACKEND_TOTALS_AUTHORITY_ENABLED=true`

- [ ] Toggle only backend totals authority.
- [ ] Test `/api/dashboard/totals`.
- [ ] Verify `computation.version`.
- [ ] Verify `durationMs < 200ms`.
- [ ] Verify `rowsChecked` populated.
- [ ] Verify audit evidence is created.
- [ ] Monitor error rate below 0.1%.
- [ ] Decision: PASS or FAIL.

## Day 2: Add `RECEIVABLES_STATE_MACHINE_ENABLED=true`

- [ ] Test readonly receivables list.
- [ ] Verify receivable states display correctly.
- [ ] Verify ledger entries are queryable.
- [ ] Verify outstanding amounts are unchanged by readonly access.
- [ ] Monitor latency.
- [ ] Decision: PASS or FAIL.

## Day 3: Add `TENANT_ISOLATION_ENABLED=true`

- [ ] Test employee property filtering.
- [ ] Test owner tenant visibility.
- [ ] Test cross-tenant empty or denied responses.
- [ ] Run 90 isolation scenarios.
- [ ] Monitor error rate.
- [ ] Decision: PASS or FAIL.

## Day 4: Add `AUDIT_TRAIL_ENABLED=true`

- [ ] Verify `audit_logs` table receives readonly computation events where expected.
- [ ] Test audit log read endpoint where available.
- [ ] Confirm audit logging does not degrade readonly response time.
- [ ] Monitor warnings and errors.
- [ ] Decision: PASS or FAIL.

## Day 5: All Readonly Flags Enabled

- [ ] Run all readonly smoke tests.
- [ ] Run 50 concurrent readonly users for 5 minutes.
- [ ] Verify error rate below 0.1%.
- [ ] Verify latency within baseline plus 20%.
- [ ] Verify no cascading failures.

## Go/No-Go Gate

- [ ] 50+ readonly tests pass.
- [ ] Error rate below 0.1% for 5 days.
- [ ] Latency within baseline plus 20%.
- [ ] No customer-visible bugs.
- [ ] Finance spot-check of 10 calculations complete.
- [ ] Decision: proceed to Phase 2B or extend Phase 2A.
