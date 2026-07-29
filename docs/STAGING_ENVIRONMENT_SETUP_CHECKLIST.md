# Staging Environment Setup Checklist

Owner: DevOps Lead.

Duration: 2 to 4 hours.

Status: ready for setup.

## Database Setup

- [ ] Staging D1 database exists.
- [ ] Approved staging migrations applied.
- [ ] Test data loaded.
- [ ] At least 1000 entries available.
- [ ] At least 500 customers available.
- [ ] At least 100 receivables available.
- [ ] Test data anonymized where sourced from production-copy.
- [ ] Backup configured.
- [ ] Restore procedure tested.

## Worker Deployment

- [ ] Staging Worker can deploy through approved staging command.
- [ ] Environment variables configured.
- [ ] Feature flags default false.
- [ ] Health endpoint or equivalent smoke check works.
- [ ] Staging URL documented.

## Monitoring and Logging

- [ ] Error tracking enabled.
- [ ] Logs available to QA and engineering.
- [ ] Slack or equivalent alerts configured.
- [ ] Error-rate alert configured.
- [ ] Latency alert configured.
- [ ] D1 availability alert configured.
- [ ] Feature flag change alert configured.

## Performance Baseline

- [ ] History p95 recorded.
- [ ] Arrears p95 recorded.
- [ ] Dashboard totals p95 recorded.
- [ ] Handover p95 recorded in staging write window.
- [ ] Baseline saved to evidence file.

## Security

- [ ] No secrets in logs.
- [ ] CORS configured for staging only.
- [ ] Rate limiting configured.
- [ ] Test account credentials stored outside repo.
- [ ] Production D1 binding not used by staging tests.

## Testing Infrastructure

- [ ] Employee test account alias available.
- [ ] Owner test account alias available.
- [ ] Readonly admin test account alias available.
- [ ] Test data refresh process documented.
- [ ] QA evidence location prepared.

Sign-off: [ ] Ready for internal testing
