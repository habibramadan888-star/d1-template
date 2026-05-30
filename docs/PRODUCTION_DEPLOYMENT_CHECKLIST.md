# Production Deployment Checklist

## Pre-Deployment

- [ ] Phase 0 complete.
- [ ] Phase 1 complete.
- [ ] Phase 2A complete.
- [ ] Phase 2B complete.
- [ ] Phase 2C complete.
- [ ] Phase 3 production-copy dry-run complete.
- [ ] All required sign-offs obtained.
- [ ] Rollback procedure tested.
- [ ] On-call team assigned.
- [ ] Incident response channel open.
- [ ] Production backup verified.

## Deployment Steps

1. Deploy code with all feature flags false.
2. Monitor for 1 hour with old behavior path.
3. Enable backend totals authority for initial cohort.
4. Monitor for 1 hour.
5. Enable receivables state machine for expanded cohort.
6. Monitor for 2 hours.
7. Enable tenant isolation.
8. Monitor access matrix and tenant-scope denials.
9. Enable audit trail.
10. Run 24-hour stability check.

## Post-Deployment

- [ ] Error rate below 0.1%.
- [ ] Latency within approved baseline.
- [ ] No customer complaints.
- [ ] Money precision verified.
- [ ] Audit trail completeness verified.
- [ ] All metrics green.

## Rollback Triggers

- [ ] Error rate greater than 1% for 5 minutes.
- [ ] Latency p95 greater than baseline plus 50%.
- [ ] Money discrepancy detected.
- [ ] Data corruption found.
- [ ] Cross-tenant leak detected.
- [ ] Customer-visible P0 bug reported.

## Final Status

- [ ] Production GO.
- [ ] Production rollback.
- [ ] Production hold.
