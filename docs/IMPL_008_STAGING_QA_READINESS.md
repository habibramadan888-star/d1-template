# IMPL-008 Staging QA Environment Readiness

Generated: 2026-05-29
Scope: staging readiness plan. No deploy, no D1 write.

## Infrastructure Checklist

| Item | Required |
|---|---|
| Staging Worker | Deployed only after implementation branch approval |
| Staging D1 | Disposable or approved staging DB, never production |
| Feature flags | Explicit staging-only enablement |
| Test accounts | Non-secret fixture/mock or secure staging secret |
| Logs | Sanitized, no passwords/tokens/cookies |

## Read-Only Validation

- `/api/me` role and `canWrite` correctness.
- `/api/dashboard/totals` returns computation metadata.
- `/api/history?limit=20` returns first page quickly.
- `/api/arrears` returns scoped data.
- Readonly admin can read and cannot write.
- Tenant/property cross-scope rows are filtered.

## Write Validation Requires Separate Approval

Do not run these unless explicitly approved:

- Employee entry write.
- Handover submit.
- Session void/delete.
- Settings update.
- Receivable state mutation.

## Performance Targets

| Scenario | Target |
|---|---:|
| Dashboard totals | under 200 ms on production-copy data |
| History first page | under 500 ms |
| Arrears modal data | under 300 ms |
| Auth bootstrap | under 500 ms |

## Exit Criteria

- P0 features pass read-only staging smoke.
- Write tests are either approved and passed, or explicitly marked not run.
- `PRODUCTION_NO_GO` remains until sign-off.
