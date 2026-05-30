# Rollback Procedures

## Immediate Feature-Flag Rollback

Target time: below 5 minutes.

- [ ] Set `BACKEND_TOTALS_AUTHORITY_ENABLED=false`.
- [ ] Set `RECEIVABLES_STATE_MACHINE_ENABLED=false`.
- [ ] Set `TENANT_ISOLATION_ENABLED=false`.
- [ ] Set `AUDIT_TRAIL_ENABLED=false`.
- [ ] Deploy or apply flag update using approved environment process.
- [ ] Verify old code path is active.
- [ ] Confirm error rate returns to normal.

## Database Rollback

Target time: below 30 minutes.

- [ ] Stop write traffic if data corruption is suspected.
- [ ] Identify latest clean backup.
- [ ] Restore database to approved point.
- [ ] Run integrity checks.
- [ ] Verify money reconciliation.
- [ ] Restart Worker traffic.
- [ ] Monitor for 1 hour.

## Code Rollback

Target time: below 1 hour.

- [ ] Revert candidate commit or redeploy previous version.
- [ ] Keep feature flags false during redeploy.
- [ ] Run smoke test.
- [ ] Verify critical endpoints.
- [ ] Open root-cause investigation.

## 24-Hour Post-Rollback Monitoring

- [ ] Error rate stable or decreasing.
- [ ] Latency returning to normal.
- [ ] No cascading failures.
- [ ] Customer experience restored.
- [ ] Finance reconciliation passes.

## Escalation

- [ ] Engineering Lead notified.
- [ ] DevOps Lead notified.
- [ ] QA Lead notified.
- [ ] Product Manager notified.
- [ ] CEO/Owner notified for P0 data or customer impact.
