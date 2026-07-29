# Production Deployment Safety Checklist

Status: P1-010A checklist only. Production deploy executed: no.

## Pre-Deploy Checks

- [ ] Git workspace is clean.
- [ ] Current commit is reviewed and approved.
- [ ] `npm run check` passes.
- [ ] `npm run smoke:with-worker` passes locally.
- [ ] `npm run verify:clean-d1` passes locally.
- [ ] `npm run test:delete-session` passes.
- [ ] `npm run test:money` passes.
- [ ] `npm run test:timezone` passes.
- [ ] `npm run audit:runtime-ddl` has been reviewed.
- [ ] No `.env`, `.env.local`, `.dev.vars`, token, password, or secret file is tracked.

## Migration Checks

- [ ] Migration file is reviewed.
- [ ] Migration is tested on local disposable D1.
- [ ] Migration is tested on staging D1.
- [ ] Backup/export exists for production D1.
- [ ] Rollback or forward-fix plan is documented.
- [ ] No remote migration is run by Codex without human approval.
- [ ] Money migrations have reconciliation reports.
- [ ] Tenant/property scope migration has cross-tenant denial tests.

## Secret Checks

- [ ] Production `JWT_SECRET` exists and is not a dev value.
- [ ] Production `PW_SALT` exists and is not a dev value.
- [ ] `ALLOW_DEV_SEED` is false or absent in production.
- [ ] TTLock credentials are production-approved.
- [ ] No default employee PIN is created in production.

## Auth And Smoke Checks

- [ ] Owner login works in staging.
- [ ] Employee login works in staging.
- [ ] Invalid JWT is rejected.
- [ ] Unauthenticated sensitive API is rejected.
- [ ] Employee cannot access owner-only APIs.
- [ ] Owner dashboard loads.
- [ ] Employee entry flow can submit a test non-production row in staging.
- [ ] Delete-session void behavior retains rows in staging.

## Financial Checks

- [ ] No hard delete path exists for normal financial records.
- [ ] New writes use integer AED fils where implemented.
- [ ] Dashboard totals are reconciled against backend/database source.
- [ ] Receivables/arrears lifecycle is verified before enabling commercial billing features.
- [ ] Void/adjustment events are auditable.

## Deployment Checks

- [ ] Confirm target environment is production.
- [ ] Confirm Worker name and account are correct.
- [ ] Confirm D1 and KV ids are production ids.
- [ ] Confirm assets and embedded Worker are in sync.
- [ ] Deploy command is run by an approved human operator.
- [ ] Immediately run production smoke after deploy.

## Post-Deploy Checks

- [ ] Owner login succeeds.
- [ ] Employee login succeeds.
- [ ] Dashboard loads with expected data.
- [ ] Employee page loads.
- [ ] Critical APIs return expected status.
- [ ] Error logs are reviewed.
- [ ] Rollback window remains open until checks are complete.

## No-Go Conditions

- Any P0 is still unresolved for the target launch scope.
- Staging was skipped.
- Production D1 backup is missing.
- Secrets are unknown or copied from local dev.
- Worker deploy would include uncommitted local changes.
- Migration would alter financial data without reconciliation.
