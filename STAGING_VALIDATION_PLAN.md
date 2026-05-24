# Staging Validation Plan

Status: P1-010A plan only. Staging environment created: no. Production deploy executed: no.

## Purpose

Staging must prove the Worker, D1, KV, auth, employee flow, owner flow, migrations, and rollback plan before production receives customer data.

## Required Staging Resources

| Resource       | Requirement                                                              |
| -------------- | ------------------------------------------------------------------------ |
| Worker         | Separate staging Worker name, not production.                            |
| D1             | Separate staging D1 database, seeded with sanitized/non-production data. |
| KV             | Separate staging `RATE_LIMIT` namespace.                                 |
| Secrets        | Separate staging values for JWT, password salt, and integrations.        |
| APP_ENV        | `staging`.                                                               |
| ALLOW_DEV_SEED | `false`.                                                                 |

## Staging Test Sequence

1. Deploy Worker to staging.
2. Apply reviewed staging migration only.
3. Run owner login smoke.
4. Run employee login smoke.
5. Run invalid JWT and unauthenticated denial checks.
6. Run employee denied owner API checks.
7. Run owner dashboard load test.
8. Run employee entry test with staging-only fixture.
9. Run delete-session void test against staging fixture.
10. Run arrears/follow-up read/update test.
11. Run export/preview manual test.
12. Run mobile viewport smoke.
13. Review Worker logs and D1 row counts.
14. Confirm rollback process.

## Data Requirements

- At least two companies/tenants for future P0-006 tests.
- At least two properties with overlapping bed codes.
- At least one settled rent transaction.
- At least one short-paid rent transaction.
- At least one open arrears task.
- At least one deposit ledger balance.
- At least one voided session/transaction fixture.

## Pass Criteria

- No production resources are touched.
- All auth boundaries pass.
- Staging row counts match expected fixture counts.
- Void keeps original rows.
- Dashboard values reconcile to backend/database calculations for fixture data.
- No default production credentials exist.
- Logs do not expose secrets.

## Fail Criteria

- Staging uses production D1/KV ids.
- Employee can access owner APIs.
- Cross-tenant data leaks.
- Financial rows are hard-deleted.
- Date/overdue status differs from Dubai business-date expectation.
- Rollback path is untested.
