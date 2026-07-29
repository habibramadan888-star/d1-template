# Phase 2c Failure Scenarios Testing

Duration: 5 to 10 days.

Owner: Backend Lead and DevOps Lead.

Goal: prove system resilience and rollback behavior.

## Scenario 1: Network Failure During Handover

- [ ] Start 10-entry handover.
- [ ] Simulate network disconnect during transaction.
- [ ] Verify transaction rolled back.
- [ ] Verify no partial entries.
- [ ] Retry with same idempotency key.
- [ ] Verify no duplicate handover.

## Scenario 2: Database Connection Loss

- [ ] Simulate D1 or local DB unavailability in staging harness.
- [ ] Verify request fails gracefully.
- [ ] Verify no partial state.
- [ ] Verify service recovers after DB availability returns.

## Scenario 3: Concurrent Writes to Same Receivable

- [ ] Send parallel payments to same receivable.
- [ ] Verify no double allocation.
- [ ] Verify outstanding amount is correct.
- [ ] Verify conflict or serialization behavior is documented.

## Scenario 4: Feature Flag Toggle During Transaction

- [ ] Start write operation.
- [ ] Toggle feature flag during execution in staging.
- [ ] Verify transaction uses a consistent code path.
- [ ] Verify no mixed old/new state.

## Scenario 5: Resource Pressure

- [ ] Simulate high load or constrained resources.
- [ ] Verify graceful errors.
- [ ] Verify no data corruption.
- [ ] Verify recovery after pressure is removed.

## Scenario 6: Audit Row Corruption

- [ ] Corrupt or remove one staging audit row.
- [ ] Verify detection.
- [ ] Verify system does not crash.
- [ ] Verify repair path documented.

## Scenario 7: Large Dataset

- [ ] Load large history/receivables dataset.
- [ ] Verify pagination.
- [ ] Verify memory remains stable.
- [ ] Verify no timeout over threshold.

## Scenario 8: Cascading Degradation

- [ ] Combine slow DB, network delay, and high request rate.
- [ ] Verify system degrades gracefully.
- [ ] Verify alerts trigger.
- [ ] Verify no infinite retry loop.

Final decision: [ ] All pass [ ] Fix unrecovered scenario
