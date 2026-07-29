# Phase 3 Realtime Monitoring Runbook

Generated: 2026-05-30

Scope: production-copy dry-run monitoring only.

Production status: `PRODUCTION_NO_GO`.

## Monitoring Cadence

Run a monitoring sample every 5 minutes during the first hour, every 15 minutes during feature enablement, and at least hourly during the 24-hour stability window.

Recommended command:

```bash
PHASE3_MONITOR_NETWORK_APPROVED=YES \
PHASE3_PRODUCTION_COPY_BASE_URL=https://<production-copy-host> \
node scripts/phase3-monitor-hourly.mjs
```

Without `PHASE3_MONITOR_NETWORK_APPROVED=YES`, the script writes a manual-required dry-run result and does not make network calls.

## Thresholds

| Metric             |               Warning |           Rollback Trigger |
| ------------------ | --------------------: | -------------------------: |
| 5xx error rate     |               >= 0.1% |      >= 1.0% for 5 minutes |
| P95 latency        |              >= 200ms |     >= 300ms for 5 minutes |
| P99 latency        |              >= 300ms |     >= 500ms for 5 minutes |
| DB health          |           any warning |     failed DB health check |
| Money discrepancy  |    any non-zero value |        greater than 0 fils |
| Tenant isolation   | any unexpected access |         any confirmed leak |
| Handover duplicate | any duplicate warning | duplicate financial result |

## Five-Minute Checklist

- [ ] Worker health endpoint returns success.
- [ ] DB health endpoint returns success.
- [ ] Error-rate endpoint is available or manually checked in dashboard.
- [ ] No new Worker exceptions.
- [ ] P95 latency remains below threshold.
- [ ] No money discrepancy alert.
- [ ] No tenant isolation alert.
- [ ] No unexpected production resource reference.

## Feature Enablement Monitoring

### Backend Totals Authority

- [ ] Compare authority totals against legacy totals.
- [ ] Confirm totals are integer fils.
- [ ] Confirm voided rows are excluded.
- [ ] Confirm frontend-submitted totals are not authoritative.

### Receivables Authority

- [ ] Confirm pending, partial, paid, voided, adjusted, and written-off states.
- [ ] Confirm oldest-first allocation.
- [ ] Confirm ledger events exist.
- [ ] Confirm rollback/off mode restores legacy behavior.

### Tenant Isolation

- [ ] Confirm employee cannot access unauthorized property.
- [ ] Confirm owner cannot access another tenant.
- [ ] Confirm manager/admin policy matches expected matrix.
- [ ] Confirm frontend tenant tampering is ignored.

### Audit Trail

- [ ] Confirm writes generate audit rows.
- [ ] Confirm audit rows include user and resource.
- [ ] Confirm audit access is scoped.
- [ ] Confirm audit failures are visible.

## Alert Response

| Alert                       | First Action                                   | Owner              | Escalation           |
| --------------------------- | ---------------------------------------------- | ------------------ | -------------------- |
| Error-rate warning          | Pause next flag enablement                     | Engineering Lead   | DevOps Lead          |
| Error-rate rollback trigger | Start rollback runbook                         | Incident Commander | Engineering Director |
| Latency warning             | Capture profile and DB query evidence          | DevOps Lead        | Engineering Lead     |
| Money discrepancy           | Disable financial authority flag               | Finance Lead       | Owner/CEO            |
| Tenant leak                 | Disable tenant isolation flag and stop dry-run | Engineering Lead   | Owner/CEO            |
| DB health failure           | Stop write tests and prepare restore           | DevOps Lead        | Engineering Director |

## Evidence To Capture

- Timestamp.
- Flag state.
- Endpoint or dashboard link.
- Error or metric value.
- Owner assigned.
- Action taken.
- Final status.

## End-Of-Window Summary

At the end of each major window, record:

- [ ] Total samples taken.
- [ ] Warning count.
- [ ] Rollback trigger count.
- [ ] Mean, P95, and P99 latency.
- [ ] Error rate.
- [ ] Open incidents.
- [ ] Decision: continue, pause, rollback, or no-go.
