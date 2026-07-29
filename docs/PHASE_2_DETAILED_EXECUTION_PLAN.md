# PHASE 2 Detailed Execution Plan

## Objective

Validate readonly behavior, write behavior, and failure handling before production-copy dry-run.

## Scope

- Phase 2A: readonly feature validation.
- Phase 2B: write operation validation.
- Phase 2C: failure scenario validation.
- Staging only unless specifically marked production-copy.

## Phase 2A: Readonly Validation

### Feature-Flag Sequence

1. Enable backend totals authority.
2. Enable receivables state machine readonly paths.
3. Enable tenant isolation.
4. Enable audit trail.
5. Run full readonly integration with all flags on.

### Exit Criteria

- [ ] 50+ readonly checks pass.
- [ ] Error rate below 0.1%.
- [ ] Latency within baseline plus 20%.
- [ ] No cross-tenant leak.
- [ ] Finance spot-checks 10 totals.

## Phase 2B: Write Validation

### Test Categories

- [ ] Receivables transitions and ledger entries.
- [ ] Tenant/property scoped writes.
- [ ] Audit log completeness for mutations.
- [ ] Money precision round trip.
- [ ] Handover atomicity and idempotency.
- [ ] 100-user stress run.

### Exit Criteria

- [ ] 100+ write tests pass.
- [ ] 0 data corruption.
- [ ] 100 finance-reviewed transactions pass with 0 fils variance.
- [ ] 50 audit entries spot-checked.
- [ ] Tenant isolation matrix passes.

## Phase 2C: Failure Validation

### Failure Scenarios

- [ ] Network failure during handover.
- [ ] Database connection interruption.
- [ ] Concurrent writes to the same receivable.
- [ ] Feature flag toggle mid-transaction.
- [ ] Disk pressure or storage quota condition.
- [ ] Corrupt audit entry in disposable data.
- [ ] High-volume memory pressure.
- [ ] Cascading slow DB plus slow network condition.

### Exit Criteria

- [ ] All 8 failure scenarios handled.
- [ ] Rollback completes below 5 minutes.
- [ ] No partial transactions remain.
- [ ] Incident response evidence captured.

## Go/No-Go Criteria

- GO: Phase 2A, 2B, and 2C exit criteria all met.
- NO-GO: Any money mismatch, tenant leak, partial handover, or unrecoverable failure.

## Output

- Approved or blocked recommendation for Phase 3 production-copy dry-run.
