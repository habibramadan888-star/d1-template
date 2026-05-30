# Phase 3 Production-Copy Dry-Run Runbook

Generated: 2026-05-30T08:19:11.995Z

Status: ready for human-scheduled production-copy dry-run preparation.

Important boundary: this repository runbook does not deploy, migrate, write remote D1, enable production flags, or claim 24-hour stability. Production remains `PRODUCTION_NO_GO` until the dry-run is executed and signed off.

## Scope

Phase 3 validates the release candidate against a production-copy environment with production-like data, monitoring, and rollback rehearsals. The dry-run must use copied data and isolated bindings only.

## Required Inputs Before Starting

- [ ] Production-copy Worker environment name and URL are documented.
- [ ] Production-copy D1 database is restored from a known backup snapshot.
- [ ] Production-copy KV/R2/secret bindings are isolated from production.
- [ ] Feature flags are initially disabled.
- [ ] Monitoring dashboards and alert channels are active.
- [ ] Rollback owner and incident commander are assigned.
- [ ] Finance, QA, Engineering, Product, and owner/CEO sign-off owners are available.

## Day 1: Baseline With Flags Off

- [ ] Deploy release candidate to production-copy only.
- [ ] Confirm all feature flags are disabled.
- [ ] Run Phase 0 smoke tests against production-copy.
- [ ] Run read-only dashboard/history/arrears verification.
- [ ] Establish p50, p95, p99 latency baselines.
- [ ] Confirm audit and error logs are flowing.
- [ ] Confirm no writes are pointed at production resources.

## Day 2: Controlled Flag Enablement

- [ ] Enable backend totals authority in production-copy only.
- [ ] Monitor for 1 hour and compare totals against legacy output.
- [ ] Enable receivables authority in production-copy only.
- [ ] Monitor for 2 hours and compare outstanding/paid/voided behavior.
- [ ] Enable tenant isolation switches in production-copy only.
- [ ] Run cross-tenant and cross-property isolation checks.
- [ ] Enable audit trail checks and confirm coverage.

## Day 3-4: 24-Hour Stability Window

- [ ] Keep all approved production-copy flags enabled for 24 hours.
- [ ] Run scheduled smoke tests at least hourly.
- [ ] Track error rate, latency, queue/backlog behavior, and DB query latency.
- [ ] Spot-check at least 100 money transactions with finance.
- [ ] Verify audit trail completeness for sampled writes.
- [ ] Execute rollback rehearsal and confirm restore below the target RTO.

## Exit Criteria

- [ ] No critical defects or unresolved data-integrity findings.
- [ ] Error rate stays below the agreed threshold for the full window.
- [ ] p95 latency remains within the approved dry-run baseline.
- [ ] Finance confirms sampled money precision and receivables behavior.
- [ ] QA confirms smoke and write-operation coverage.
- [ ] Engineering confirms rollback evidence and environment separation.
- [ ] Product confirms user workflow acceptance.
- [ ] Owner/CEO gives final production approval.

## Explicit Non-Goals

- No production deployment.
- No production D1 migration.
- No production feature-flag enablement.
- No live accounting authority switch.
- No claim of 24-hour PASS until the 24-hour production-copy window has actually completed.
