# PHASE 3: Production Dry-Run Execution Plan

## Day 1: Production-Copy Setup

- [ ] Restore production database to production-copy.
- [ ] Deploy all code to production-copy only.
- [ ] Keep feature flags false.
- [ ] Verify old code path still works.
- [ ] Establish performance baseline.
- [ ] Record error-rate baseline.

## Day 2: Gradual Flag Enabling

- [ ] Enable backend totals authority first.
- [ ] Monitor 1 hour: error rate, latency, and data consistency.
- [ ] Enable receivables state machine.
- [ ] Monitor 2 hours.
- [ ] Enable tenant isolation and audit trail.
- [ ] Monitor 4 hours with all features enabled.

## Day 3-4: Extended Validation

- [ ] 24-hour stability with all flags enabled.
- [ ] Error rate stable or trending down.
- [ ] Performance stable.
- [ ] Money precision spot-check of 100 transactions.
- [ ] Audit trail completeness verified.
- [ ] Rollback procedure tested below 5 minutes.

## Final Sign-Offs

- [ ] Finance Lead: approved for release.
- [ ] Engineering Lead: code quality approved.
- [ ] QA Lead: all tests pass.
- [ ] Product Manager: requirements met.
- [ ] CEO/Owner: final production approval.

## Go/No-Go Decision

- [ ] APPROVED: proceed to release.
- [ ] NOT APPROVED: delay release and investigate.
