# Phase 3 Execution Runbook

Generated: 2026-05-30

Scope: production-copy dry-run only.

Production status: `PRODUCTION_NO_GO`.

This runbook is an execution guide for the production-copy dry-run. It must not be used to deploy to production. All times are relative to the dry-run start.

## Pre-Start Gate

Required before Hour 0:

- [ ] Written approval to use production-copy resources is recorded.
- [ ] `npm run gate:commercial-launch` returns `PRODUCTION_NO_GO`.
- [ ] Production-copy D1 restore is complete and verified.
- [ ] Production-copy secrets and bindings are isolated.
- [ ] All feature flags are disabled.
- [ ] Monitoring dashboard is visible to the war room.
- [ ] Rollback owner is online.

Recommended command:

```bash
bash scripts/phase3-deploy.sh
```

Default behavior is dry-run only.

## Hour 0: Deployment Preparation

### 0:00 - Start War Room

- [ ] Confirm owners are online.
- [ ] Confirm incident channel is active.
- [ ] Confirm production remains out of scope.
- [ ] Record dry-run start time.

### 0:05 - Deploy Dry-Run Validation

Run:

```bash
PHASE3_DEPLOY_MODE=dry-run \
PHASE3_TARGET_ENV=production-copy \
bash scripts/phase3-deploy.sh
```

Expected:

- `gate:commercial-launch` still reports `PRODUCTION_NO_GO`.
- Wrangler deploy command runs with `--dry-run`.
- No Cloudflare deployment is made.

### 0:30 - Production-Copy Deploy

Only execute after explicit human approval:

```bash
PHASE3_DEPLOY_MODE=execute \
PHASE3_TARGET_ENV=production-copy \
PHASE3_DEPLOY_APPROVED=YES \
PHASE3_CONFIRM_NO_PRODUCTION=YES \
PHASE3_CHANGE_TICKET=<ticket-id> \
bash scripts/phase3-deploy.sh
```

Expected:

- Target environment is exactly `production-copy`.
- Command refuses to run without all approval variables.
- Deployment target is production-copy only.

## Hour 1: Baseline With Flags Off

- [ ] Confirm all feature flags are off.
- [ ] Run Phase 0 smoke tests against production-copy.
- [ ] Run health and DB checks.
- [ ] Run first monitoring sample.

```bash
PHASE3_MONITOR_NETWORK_APPROVED=YES \
PHASE3_PRODUCTION_COPY_BASE_URL=https://<production-copy-host> \
node scripts/phase3-monitor-hourly.mjs
```

Exit criteria:

- [ ] Error rate is below threshold.
- [ ] P95 latency is below threshold.
- [ ] DB health check passes.
- [ ] No production resource access is detected.

## Hour 5: Enable Backend Totals Authority

- [ ] Enable backend totals authority in production-copy only.
- [ ] Compare legacy totals and authority totals.
- [ ] Monitor for at least 1 hour.
- [ ] Roll back immediately if money discrepancy is greater than 0 fils.

Exit criteria:

- [ ] No money discrepancy.
- [ ] No error-rate increase.
- [ ] No latency regression beyond threshold.

## Hour 8: Enable Receivables Authority

- [ ] Enable receivables authority in production-copy only.
- [ ] Compare outstanding, paid, partial, voided, and adjusted states.
- [ ] Verify ledger/audit evidence.
- [ ] Monitor for at least 2 hours.

Exit criteria:

- [ ] No receivables state drift.
- [ ] No double allocation.
- [ ] No audit gaps.

## Hour 12: Enable Tenant Isolation

- [ ] Enable tenant/property isolation switches in production-copy only.
- [ ] Run cross-tenant access probes.
- [ ] Run cross-property access probes.
- [ ] Verify owner, employee, manager, and admin expectations.

Exit criteria:

- [ ] No cross-tenant reads.
- [ ] No cross-property employee reads.
- [ ] No write path bypasses isolation.

## Hour 16: Enable Audit Trail Validation

- [ ] Verify audit records for representative writes.
- [ ] Confirm audit visibility is scoped by tenant/property policy.
- [ ] Confirm audit entries include user, resource, status, and timestamp.

Exit criteria:

- [ ] Audit completeness is acceptable.
- [ ] Audit access is scoped.
- [ ] Audit failures do not hide business failures.

## Hour 24: Stability Review

- [ ] Review all hourly monitoring reports.
- [ ] Review all incidents and warnings.
- [ ] Finance signs off sampled money precision.
- [ ] QA signs off smoke/write/failure checks.
- [ ] Engineering signs off rollback and environment separation.
- [ ] Product signs off workflows.
- [ ] Owner/CEO records final dry-run decision.

## Final Decision

Allowed outcomes:

- `PHASE_3_PASS_READY_FOR_RELEASE_PLANNING`
- `PHASE_3_CONDITIONAL_RETEST_REQUIRED`
- `PHASE_3_NO_GO`

Do not use this runbook to mark production release approved. Production release requires a separate final sign-off.
