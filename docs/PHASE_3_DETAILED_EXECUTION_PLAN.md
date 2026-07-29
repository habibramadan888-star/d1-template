# PHASE 3 Detailed Execution Plan

## Objective

Run a production-copy rehearsal with production-like data before any release to master or production deployment.

## Scope

- Production-copy only.
- Feature flags start off.
- No production D1 writes.
- No live customer traffic.

## Entry Criteria

- [ ] Phase 2 complete with GO.
- [ ] Production-copy database restored.
- [ ] Backup and rollback procedures tested.
- [ ] Finance, QA, Engineering, Product, and Owner sign-off slots scheduled.

## Day 1: Baseline

- [ ] Deploy candidate code with all flags off.
- [ ] Verify old behavior path.
- [ ] Capture baseline latency and error rate.
- [ ] Run readonly smoke test.
- [ ] Confirm no unexpected schema/runtime errors.

## Day 2: Progressive Enablement

- [ ] Enable backend totals authority and monitor 1 hour.
- [ ] Enable receivables state machine and monitor 2 hours.
- [ ] Enable tenant isolation and monitor access matrix.
- [ ] Enable audit trail and inspect sample logs.

## Day 3-4: Stability

- [ ] Keep all flags enabled for 24 hours.
- [ ] Run money reconciliation on 100 transactions.
- [ ] Run audit completeness check.
- [ ] Run rollback drill.
- [ ] Document all anomalies.

## Final Sign-Off

- [ ] Finance Lead.
- [ ] Engineering Lead.
- [ ] QA Lead.
- [ ] Product Manager.
- [ ] CEO/Owner.

## Go/No-Go Criteria

- GO: Dry-run passes, rollback passes, all sign-offs obtained.
- NO-GO: Any P0 issue, missing sign-off, or unproven rollback.

## Output

- Production release approval packet or remediation plan.
