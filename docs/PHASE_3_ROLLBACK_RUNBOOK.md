# Phase 3 Rollback Runbook

Generated: 2026-05-30

Scope: production-copy dry-run rollback only.

Production status: `PRODUCTION_NO_GO`.

Rollback must be executed by the assigned incident commander and verified by Engineering plus QA. Finance must be involved for any money, receivables, handover, or audit discrepancy.

## Rollback Triggers

- 5xx error rate >= 1.0% for 5 minutes.
- P95 latency >= 300ms for 5 minutes.
- Any money discrepancy greater than 0 fils.
- Any cross-tenant or cross-property leak.
- Any duplicate or partial financial write.
- DB health check fails.
- Monitoring or audit trail stops producing evidence.

## Scenario 1: Deployment Failure

Symptoms:

- Worker deploy fails.
- Health checks fail immediately after deploy.
- Version metadata cannot be confirmed.

Actions:

```bash
PHASE3_ROLLBACK_MODE=dry-run \
PHASE3_TARGET_ENV=production-copy \
bash scripts/phase3-rollback.sh
```

If approved:

```bash
PHASE3_ROLLBACK_MODE=execute \
PHASE3_TARGET_ENV=production-copy \
PHASE3_ROLLBACK_APPROVED=YES \
PHASE3_CONFIRM_NO_PRODUCTION=YES \
bash scripts/phase3-rollback.sh
```

Validation:

- [ ] Health endpoint passes.
- [ ] DB health endpoint passes.
- [ ] Phase 0 smoke tests pass.
- [ ] Feature flags are disabled.

## Scenario 2: Error-Rate Increase

Symptoms:

- 5xx error rate exceeds threshold.
- Worker exceptions are increasing.
- User-visible requests fail.

Actions:

- [ ] Disable latest enabled feature flag.
- [ ] Re-run monitoring sample.
- [ ] If errors continue, rollback Worker version.
- [ ] Preserve logs before they rotate.

Validation:

- [ ] Error rate returns below warning threshold.
- [ ] No new exceptions for 15 minutes.
- [ ] Smoke tests pass.

## Scenario 3: Performance Regression

Symptoms:

- P95 or P99 latency exceeds threshold.
- DB query latency spikes.
- Queue/backlog appears.

Actions:

- [ ] Pause further flag enablement.
- [ ] Disable latest enabled feature flag.
- [ ] Capture slow endpoint and query evidence.
- [ ] Roll back Worker if feature disablement does not recover.

Validation:

- [ ] P95 latency returns to baseline.
- [ ] DB query latency returns to baseline.
- [ ] No error-rate increase remains.

## Scenario 4: Data Anomaly

Symptoms:

- Money discrepancy greater than 0 fils.
- Receivables state mismatch.
- Duplicate handover or partial write.
- Tenant/property leak.

Actions:

- [ ] Stop write tests immediately.
- [ ] Disable all authority flags.
- [ ] Snapshot evidence and affected resource IDs.
- [ ] Run rollback script in dry-run mode.
- [ ] If approved, execute Worker rollback.
- [ ] Restore production-copy database from approved snapshot only if data is corrupted.

Validation:

- [ ] No new writes occur during investigation.
- [ ] Affected resource list is complete.
- [ ] Finance signs off money reconciliation.
- [ ] QA confirms smoke and isolation checks.

## Post-Rollback Review

- [ ] Record trigger and timeline.
- [ ] Record commands run.
- [ ] Record version IDs before and after rollback.
- [ ] Record flag states before and after rollback.
- [ ] Record validation evidence.
- [ ] Decide whether to resume, retest, or mark Phase 3 `NO-GO`.
