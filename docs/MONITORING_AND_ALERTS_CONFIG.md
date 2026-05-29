# Monitoring and Alerts Configuration

Owner: DevOps Lead.

Status: ready for configuration.

## Metrics to Monitor

Error metrics:

- 5xx error rate.
- 4xx error rate.
- Database errors.
- Timeout errors.
- Failed audit writes.

Performance metrics:

- API response time p50, p95, and p99.
- Database query duration.
- Worker CPU time where available.
- Cache hit ratio if cache exists.

Business safety metrics:

- Handover success rate.
- Payment processing success rate.
- Money reconciliation variance.
- Tenant-scope denied count.
- Audit trail completeness.

## Critical Alerts

Send to engineering incident channel:

- Error rate greater than 1 percent for 5 minutes.
- API latency p95 greater than baseline plus 50 percent.
- Database unavailable.
- Money discrepancy detected.
- Cross-tenant leak evidence.
- Partial handover detected.

## Warning Alerts

Send to engineering warning channel:

- Error rate greater than 0.5 percent for 5 minutes.
- Latency p95 greater than baseline plus 20 percent.
- Memory or CPU above warning threshold.
- Disk usage or storage quota above warning threshold.
- Idempotency replay spike.

## Info Alerts

- Feature flag toggle.
- Staging deployment started or completed.
- Backup completed.
- Daily testing report generated.

## Dashboard Panels

- Error-rate trend.
- Latency trend.
- Traffic volume.
- D1 query duration.
- Feature flag status.
- Audit trail completeness.
- Handover atomicity.
- Tenant isolation denials.
- Money reconciliation variance.

## Prepared Log Queries

- Errors in last hour.
- Slow queries above 1 second.
- User actions by user ID.
- Resource changes by resource ID.
- Missing audit logs.
- Denied cross-scope access attempts.
