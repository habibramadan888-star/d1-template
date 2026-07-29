# Final Go/No-Go Checklist

Status: execute after all Phase 2 validation is complete.

Owner: Engineering Lead.

## Pre-Dry-Run

- [ ] Restore production database to production-copy.
- [ ] Deploy latest code to production-copy.
- [ ] Feature flags default false.
- [ ] Old-path behavior verified.
- [ ] Performance baseline established.
- [ ] Rollback owner assigned.

## Dry-Run Day 1: Flags Off

- [ ] Readonly endpoints work.
- [ ] Write endpoints work in production-copy.
- [ ] No unexpected errors.
- [ ] Performance within baseline.
- [ ] Audit and monitoring visible.

## Dry-Run Day 2: Gradual Flags

- [ ] Enable backend totals candidate.
- [ ] Monitor error rate and latency.
- [ ] Enable receivables candidate.
- [ ] Enable tenant isolation candidate.
- [ ] Enable audit trail candidate.
- [ ] Monitor all metrics for at least 4 hours.

## Dry-Run Day 3: Extended Validation

- [ ] 24-hour stability window passes.
- [ ] Money precision spot check passes.
- [ ] Audit trail completeness check passes.
- [ ] Rollback tested and timed.
- [ ] No P0 defects open.

## Required Sign-Offs

- [ ] Finance Lead: money logic approved.
- [ ] Engineering Lead: code quality approved.
- [ ] QA Lead: tests pass.
- [ ] Product Manager: requirements met.
- [ ] Owner: final production approval.

## Decision

- [ ] GO: proceed to approved release process.
- [ ] NO-GO: delay release, investigate, and retest.
