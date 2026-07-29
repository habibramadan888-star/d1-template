# Operational Runbook

## Daily Operations

- [ ] Check monitoring dashboard at 09:00.
- [ ] Review error logs.
- [ ] Verify backups completed.
- [ ] Check health endpoints.
- [ ] Review feature flag state.
- [ ] Scan audit logging health.

## Weekly Tasks

- [ ] Review test coverage.
- [ ] Update documentation.
- [ ] Clean up old non-retained logs.
- [ ] Generate performance report.
- [ ] Review open incidents and near misses.
- [ ] Hold Friday operational review.

## Monthly Tasks

- [ ] Full regression testing.
- [ ] Security audit.
- [ ] Performance optimization review.
- [ ] Disaster recovery drill.
- [ ] Stakeholder review.

## Quarterly Tasks

- [ ] Architecture review.
- [ ] Capacity planning.
- [ ] Dependency review.
- [ ] Roadmap planning.
- [ ] Post-mortem trend review.

## Troubleshooting: High Error Rate

1. Check monitoring alerts.
2. Review recent deployments.
3. Check database status.
4. Review application logs.
5. Toggle feature flags off if error correlates with rollout.
6. Escalate if unresolved within 15 minutes.

## Troubleshooting: Slow Performance

1. Check database query duration.
2. Identify slow endpoints.
3. Check resource utilization.
4. Review recent code changes.
5. Optimize, scale, or roll back.

## Troubleshooting: Data Inconsistency

1. Stop accepting writes if corruption is suspected.
2. Run integrity checks.
3. Run money reconciliation.
4. Restore from backup if corruption is confirmed.
5. Document root cause and prevention action.
