# Phase 3 Execution Checklist

Generated: 2026-05-30T08:19:11.997Z

## Before Production-Copy Deployment

- [ ] Confirm production remains `PRODUCTION_NO_GO`.
- [ ] Confirm written approval to use production-copy resources.
- [ ] Confirm production-copy D1 backup/restore source and timestamp.
- [ ] Confirm production-copy secrets do not target production services.
- [ ] Confirm all feature flags are initially disabled.
- [ ] Confirm monitoring and alerting destinations are active.

## Baseline Verification

- [ ] Run Phase 0 smoke suite against production-copy.
- [ ] Verify dashboard totals with flags disabled.
- [ ] Verify entries, history, customers, arrears, owner, and admin read paths.
- [ ] Record latency baseline and error-rate baseline.
- [ ] Confirm audit logs are visible and scoped.

## Flag Enablement

- [ ] Enable backend totals authority and monitor 1 hour.
- [ ] Enable receivables authority and monitor 2 hours.
- [ ] Enable tenant isolation and run leak probes.
- [ ] Enable audit trail checks and verify write evidence.
- [ ] Disable flags and confirm rollback/off behavior.
- [ ] Re-enable approved flags for extended stability only if rollback passes.

## 24-Hour Window

- [ ] Keep hourly smoke evidence.
- [ ] Keep hourly metric snapshots.
- [ ] Capture all incidents, warnings, and mitigations.
- [ ] Spot-check 100 finance transactions.
- [ ] Verify rollback rehearsal time and outcome.

## Final Decision

- [ ] Finance sign-off complete.
- [ ] Engineering sign-off complete.
- [ ] QA sign-off complete.
- [ ] Product sign-off complete.
- [ ] Owner/CEO sign-off complete.
- [ ] Final decision recorded: GO or NO-GO.
