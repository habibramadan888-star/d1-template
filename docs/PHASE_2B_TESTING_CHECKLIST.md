# Phase 2b Write Operations Testing Checklist

Duration: 5 to 10 days.

Owner: Backend Lead and QA Lead.

Risk: medium.

## Receivables State Machine

- [ ] `PENDING` to `PARTIAL`.
- [ ] `PENDING` to `PAID`.
- [ ] `PARTIAL` to `PAID`.
- [ ] `PENDING` to `VOIDED`.
- [ ] `VOIDED` restoration path.
- [ ] Void restores outstanding through approved path.
- [ ] Ledger entry created for each transition.
- [ ] Ledger shows allocated amount.
- [ ] Invalid transitions rejected.
- [ ] Concurrent state changes handled safely.

## Tenant Isolation on Writes

- [ ] Employee cannot write to unauthorized property.
- [ ] Owner can write within own tenant.
- [ ] Owner cannot write to other tenant.
- [ ] Customer data is scoped correctly.
- [ ] Payment assigned to correct tenant.
- [ ] Handover uses correct tenant and property scope.
- [ ] Cross-tenant write returns denial.

## Audit Trail on Writes

- [ ] Entry create writes audit row.
- [ ] Entry edit writes old and new values.
- [ ] Entry delete or void writes audit row.
- [ ] Payment add writes audit row.
- [ ] Handover writes audit row.
- [ ] Receivable transition writes audit row.
- [ ] Spot check 50 audit rows for completeness.
- [ ] User ID and role are correct.
- [ ] Timestamp present.

## Money Precision

- [ ] 150.50 AED maps to 15050 fils.
- [ ] 15050 fils displays as 150.50 AED.
- [ ] Round-trip path has zero variance.
- [ ] 100 transaction finance sample passes.
- [ ] Unsafe decimals rejected.
- [ ] Frontend totals are not authority.

## Handover Atomicity

- [ ] Normal 10-entry handover creates one handover.
- [ ] Duplicate idempotency key returns cached result.
- [ ] Failure rolls back.
- [ ] Retry after failure is safe.
- [ ] Total mismatch rejects.

## Stress Test

- [ ] 100 concurrent users for 10 minutes.
- [ ] Error rate below 0.1 percent.
- [ ] Performance stable.
- [ ] No memory leak evidence.
- [ ] No deadlock evidence.

Final decision: [ ] Proceed to Phase 2c [ ] Fix and retest
