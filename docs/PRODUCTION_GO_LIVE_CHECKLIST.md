# Production Go-Live Checklist

## 24 Hours Before

- [ ] Final code review completed.
- [ ] All tests passing.
- [ ] Monitoring configured.
- [ ] Alerts tested.
- [ ] Incident response team briefed.
- [ ] Communication plan reviewed.
- [ ] Production backup confirmed.

## 1 Hour Before

- [ ] Database backup verified.
- [ ] Rollback procedure reviewed.
- [ ] All required team members online.
- [ ] Incident channel open.
- [ ] Status page ready.
- [ ] Customer support briefed.

## During Deployment

- [ ] Deploy code with flags false.
- [ ] Verify health checks.
- [ ] Enable backend totals authority.
- [ ] Monitor 1 hour.
- [ ] Enable receivables state machine.
- [ ] Monitor 2 hours.
- [ ] Enable tenant isolation.
- [ ] Monitor access and error metrics.
- [ ] Enable audit trail.
- [ ] Begin 24-hour stability check.

## Post-Deployment

- [ ] Error rate below 0.1%.
- [ ] Latency within baseline.
- [ ] 0 customer complaints.
- [ ] Money precision verified.
- [ ] Audit trail complete.
- [ ] All metrics green.

## Success Criteria

- [ ] YES: production go-live successful.
- [ ] NO: execute rollback and investigate.
