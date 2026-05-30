# Monitoring & Alerts Setup

## Metrics Collection

- [ ] 5xx and 4xx error rate by endpoint.
- [ ] Validation error rate by operation.
- [ ] Latency p50, p95, and p99 by endpoint.
- [ ] Database query duration by query family.
- [ ] Feature flag state and toggle history.
- [ ] Audit trail completeness by mutation type.
- [ ] Money precision variance in fils.
- [ ] Handover success, replay, and rollback counts.
- [ ] Tenant-scope denial counts.

## Critical Alert Rules

- [ ] Error rate greater than 1% for 5 minutes.
- [ ] API latency p95 greater than baseline plus 50%.
- [ ] Database unavailable or repeated timeout.
- [ ] Money discrepancy greater than 0 fils.
- [ ] Cross-tenant result detected.
- [ ] Partial handover state detected.
- [ ] Audit log write failure rate above threshold.

## Warning Alert Rules

- [ ] Error rate greater than 0.5% for 5 minutes.
- [ ] API latency p95 greater than baseline plus 20%.
- [ ] Disk usage above 80%.
- [ ] Memory usage trending upward for 30 minutes.
- [ ] Feature flag toggled outside approved window.

## Info Events

- [ ] Deployment started.
- [ ] Deployment completed.
- [ ] Feature flag toggled.
- [ ] Backup completed.
- [ ] Rollback drill completed.

## Dashboard Setup

- [ ] Error-rate trend.
- [ ] Latency trend by endpoint.
- [ ] Traffic volume.
- [ ] Database query duration.
- [ ] Feature flag status.
- [ ] Audit completeness chart.
- [ ] Money reconciliation variance chart.
- [ ] Handover idempotency replay chart.

## Log Aggregation

- [ ] Errors indexed by code and endpoint.
- [ ] User actions indexed by `user_id`.
- [ ] Mutations indexed by `resource_id`.
- [ ] Performance logs indexed by endpoint and query family.
- [ ] Tenant-scope denials indexed by tenant and property.

## Readiness Gate

- [ ] Alerts tested.
- [ ] Dashboard visible to Engineering, QA, DevOps, and Product.
- [ ] Escalation channel configured.
- [ ] On-call owner confirmed.
