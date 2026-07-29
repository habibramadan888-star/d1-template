# Staging Environment Deployment Checklist

## Database Setup

- [ ] Staging D1 database identified.
- [ ] All staging migrations applied.
- [ ] Test data loaded: 1000+ entries.
- [ ] Test data loaded: 500+ customers.
- [ ] Test data loaded: 100+ receivables.
- [ ] Hourly backup configured.
- [ ] Restore tested with RTO below 5 minutes.
- [ ] Test users created for employee, owner, and readonly admin.

## Worker Deployment

- [ ] Candidate code deployed to staging only.
- [ ] Environment variables configured.
- [ ] Feature flags default false.
- [ ] Health check endpoint working.
- [ ] Logs aggregation active.
- [ ] Monitoring alerts enabled.

## Performance Baseline

- [ ] History load p95 recorded.
- [ ] Arrears load p95 recorded.
- [ ] Dashboard totals p95 recorded.
- [ ] Handover p95 recorded.
- [ ] Error-rate baseline recorded.

## Security Verification

- [ ] No secrets in logs.
- [ ] CORS configured for staging domains.
- [ ] Rate limiting active.
- [ ] SQL injection prevention verified.
- [ ] Auth route closure verified.
- [ ] Readonly admin write denial verified.

## Testing Ready

- [ ] Staging stable for 24 hours.
- [ ] All target endpoints responding.
- [ ] No unhandled errors in logs.
- [ ] Ready for Phase 0 smoke test.

## Sign-Off

- [ ] DevOps Lead.
- [ ] QA Lead.
- [ ] Engineering Lead.
