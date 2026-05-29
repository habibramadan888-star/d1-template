# PHASE 2B: Write Operations Testing Execution Plan

## Receivables State Machine

- [ ] PENDING to PARTIAL.
- [ ] PENDING to PAID.
- [ ] PARTIAL to PAID.
- [ ] PENDING to VOIDED.
- [ ] VOIDED to PENDING restore.
- [ ] VOIDED restores original outstanding amount.
- [ ] Ledger entry created for each transition.
- [ ] Ledger shows allocated amount.
- [ ] State conflict detection works.
- [ ] Concurrent state changes handled.

## Tenant Isolation on Write

- [ ] Employee A cannot write to property 102.
- [ ] Employee B cannot write to property 101.
- [ ] Owner can write to all own-tenant properties.
- [ ] Customer data stays tenant-scoped.
- [ ] Payment assigned to correct tenant.
- [ ] Handover assigned to correct tenant.
- [ ] Cross-tenant write rejected with 403 or equivalent denial.

## Audit Trail on Write

- [ ] Entry create creates audit log.
- [ ] Entry edit creates audit log with old and new values.
- [ ] Entry delete or void creates audit log.
- [ ] Payment add creates audit log.
- [ ] Handover creates audit log.
- [ ] All 20+ write endpoints audited.
- [ ] Spot-check 50 audit entries for completeness.
- [ ] User ID is correct.
- [ ] Timestamp is present.

## Money Precision

- [ ] `150.50 AED` stores as `15050` fils.
- [ ] `15050` fils displays as `150.50 AED`.
- [ ] Input to DB to API to display round trip has 0 fils variance.
- [ ] Manual audit of 100 transactions complete.
- [ ] Finance sign-off obtained.
- [ ] No precision loss detected.

## Handover Atomicity

- [ ] Normal handover completes.
- [ ] Duplicate submission detected by idempotency key.
- [ ] Network failure rolls back.
- [ ] Retry after failure is safe.
- [ ] Mismatch between frontend and backend totals is rejected.

## Stress Test

- [ ] 100 concurrent users.
- [ ] 10-minute duration.
- [ ] Error rate below 0.1%.
- [ ] Performance stable.
- [ ] No memory leaks.

## Go/No-Go Gate

- [ ] 100+ write tests pass.
- [ ] 0 data corruption.
- [ ] Money precision verified.
- [ ] Tenant isolation verified.
- [ ] Audit trail coverage is 100%.
- [ ] Finance sign-off obtained.
- [ ] Decision: proceed to Phase 2C or extend Phase 2B.
