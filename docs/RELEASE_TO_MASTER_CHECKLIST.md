# Release to Master Checklist

Status: execute only after internal testing is complete and explicitly approved.

## Preconditions

- [ ] Phase 0 readonly smoke test passes.
- [ ] Phase 1 implementation is complete.
- [ ] Phase 2a readonly validation passes.
- [ ] Phase 2b write validation passes.
- [ ] Phase 2c failure scenarios pass.
- [ ] Phase 3 production-copy dry-run passes.
- [ ] All required sign-offs are recorded.
- [ ] `PRODUCTION_NO_GO` has been resolved through approved release process.

## Step 1: Prepare Release Documents

- [ ] Release notes.
- [ ] Migration guide if migrations are approved.
- [ ] Runbooks.
- [ ] Rollback plan.
- [ ] Monitoring dashboard links.
- [ ] Known issues list.

## Step 2: Merge to Master

Use the approved release branch only after final approval:

```bash
git checkout master
git pull --ff-only
git merge internal/impl-phase-1 --no-ff -m "Release: Homelink Finance production readiness"
```

Do not merge if:

- Any P0 blocker remains.
- Any required sign-off is missing.
- Dry-run failed.
- Rollback is untested.

## Step 3: Production Deployment

Deployment must follow the approved operations runbook:

- [ ] Deploy with feature flags off.
- [ ] Monitor baseline for at least 1 hour.
- [ ] Enable features gradually.
- [ ] Monitor error rate, latency, money variance, and audit completeness.
- [ ] Keep rollback owner available.

## Step 4: Communication

- [ ] Notify stakeholders before deployment.
- [ ] Announce start of rollout.
- [ ] Report each rollout stage.
- [ ] Announce completion or rollback.

## Step 5: Seven-Day Watch

- [ ] Error rate below threshold.
- [ ] p95 latency within baseline.
- [ ] No money precision incident.
- [ ] No tenant isolation incident.
- [ ] Audit trail complete.
- [ ] Customer-impacting issues triaged.

## Completion

Release is complete only after:

- 24-hour stability check passes.
- Seven-day watch has no P0 incident.
- Post-release review is recorded.
