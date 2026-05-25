# Staging QA Evidence Template

Scope: human-filled evidence packet for real staging QA. This template does not
authorize staging deploy, production deploy, production migration, remote D1
migration, production feature flag enablement, or production cutover.

## Review Metadata

| Field                               | Value                                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA run id                           | `STAGING-SECRETS-002-2026-05-25-SECRETS-ACCOUNTS-ROLLBACK`; real write QA run id still MANUAL_REQUIRED                                                              |
| QA date/time                        | Staging secrets/accounts updated 2026-05-25 Asia/Dubai; actual write QA run time MANUAL_REQUIRED                                                                    |
| Reviewer                            | Codex dry-run preflight; human QA reviewer MANUAL_REQUIRED                                                                                                          |
| Branch                              | `qa/staging-secrets-002-resolve-manual-required`                                                                                                                    |
| Commit                              | Staging secrets/accounts commit recorded in git log after this update                                                                                               |
| Staging Worker URL                  | `https://homelink-finance-staging.habibramadan888.workers.dev`                                                                                                      |
| Worker entrypoint                   | Staging source: `deploy-worker/wrangler.toml` `[env.staging]` -> `src/index.js`; embedded remains `deploy-worker/wrangler.embedded.toml` -> `src/index.embedded.js` |
| APP_ENV                             | `staging` in `deploy-worker/wrangler.toml` `[env.staging.vars]`                                                                                                     |
| Enabled feature flags               | Defaults: `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=false`, `ENABLE_HANDOVER_ATOMIC_STAGING=false`; write QA requires later explicit staging-only approval          |
| Staging D1 name                     | `homelink-finance-staging` (`4ff78bfc-3855-436b-aefb-6b492145d79c`)                                                                                                 |
| Staging KV namespace                | `RATE_LIMIT_STAGING` (`9e84150246204f01b3fd8c184761303e`) bound as `RATE_LIMIT`                                                                                     |
| Backup completed before write tests | Yes for schema bootstrap only: `./backups/homelink-finance-staging-before-schema-bootstrap.sql`; backup file is ignored and not committed                           |
| Rollback method confirmed           | Feature flag rollback documented; runtime exercise still MANUAL_REQUIRED because write endpoints were not called                                                    |
| Production URL checked and excluded | MANUAL_REQUIRED - staging URL is staging-named, but production URL/custom route still requires Dashboard confirmation                                               |
| Real staging write QA status        | NOT_EXECUTED                                                                                                                                                        |
| Staging D1 schema confirmed         | Yes; core tables and handover staging tables confirmed in `STAGING_DB_002_POST_MIGRATION_SCHEMA_SNAPSHOT.md`                                                        |
| Staging D1 bootstrap required       | Completed for staging schema bootstrap; no business test data written                                                                                               |
| Employee staging test account       | Created/confirmed: `employee_stg_qa_001` exists in staging `employee_users` with role `staff`; plaintext password not logged                                        |
| Owner staging test account          | Configured through `USER_ACCOUNTS` staging secret as `owner_stg_qa_001`; plaintext password not logged                                                              |
| Manager/admin staging test account  | Configured through `USER_ACCOUNTS` staging secret as `manager_stg_qa_001`; no separate admin role exists                                                            |
| Password handling                   | Generated in ignored `.tmp/staging-secrets/staging-test-passwords.local.json`; set to Cloudflare staging secrets; not committed; not written to Markdown            |
| Current QA status                   | MANUAL_REQUIRED; real write QA blocked by runtime rollback exercise, production URL exclusion, and explicit write-QA approval                                       |

## Autofilled Test Accounts

These are suggested non-production account identifiers only. Passwords must be
stored in Cloudflare staging secrets or another approved ignored secret store.
No password, token, cookie, or real secret may be written to this Markdown file.

| Role          | Username              | Email                              | Password Handling                                   |
| ------------- | --------------------- | ---------------------------------- | --------------------------------------------------- |
| employee      | `employee_stg_qa_001` | `employee_stg_qa_001@example.test` | stored in Cloudflare staging secret / not committed |
| owner         | `owner_stg_qa_001`    | `owner_stg_qa_001@example.test`    | stored in Cloudflare staging secret / not committed |
| manager/admin | `manager_stg_qa_001`  | `manager_stg_qa_001@example.test`  | stored in Cloudflare staging secret / not committed |

Suggested password generation command for a human to run only when rotating
staging secrets into an approved ignored secret target:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

For this task, strong staging secret material already existed in ignored
`.tmp/staging-secrets/staging-test-passwords.local.json` and was applied to
Cloudflare staging secrets without writing values to Markdown or Git.

## Command Evidence

| Command                             | Result           | Log Path / Screenshot                              | Notes                                                     |
| ----------------------------------- | ---------------- | -------------------------------------------------- | --------------------------------------------------------- |
| `npm run check`                     | PASS             | Local console / git commit evidence                | 182 tests passed; build ran Wrangler dry-run only.        |
| `npm run security:secrets`          | PASS             | Local console / git commit evidence                | Secret hygiene check passed.                              |
| `npm run qa:employee-entry-staging` | MANUAL_REQUIRED  | `EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md` | Dry-run only; no write confirmation flags.                |
| `npm run gate:commercial-launch`    | PRODUCTION_NO_GO | Local console / git commit evidence                | Expected `PRODUCTION_NO_GO` until production gates close. |
| `npm run audit:worker-drift`        | PASS             | `WORKER_ENTRYPOINT_DRIFT_AUDIT.md`                 | 0 critical mismatches.                                    |
| `npm run verify:embedded-worker`    | PASS             | `EMBEDDED_WORKER_FRESHNESS_RESULT.md`              | Embedded freshness passes.                                |
| `npm run build:embedded:dry-run`    | WARNING          | `.tmp/embedded-worker-dry-run/`                    | 0 critical missing items; warning remains non-blocking.   |

## Employee Entry Evidence

| Test ID    | Scenario                               | Request Evidence | Response Evidence | DB Evidence     | Audit Evidence  | Dashboard/History Evidence | Result          | Notes                                          |
| ---------- | -------------------------------------- | ---------------- | ----------------- | --------------- | --------------- | -------------------------- | --------------- | ---------------------------------------------- |
| EE-STG-001 | Production remains legacy              | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED            | MANUAL_REQUIRED | Must not enable adapter in production.         |
| EE-STG-002 | Feature flag off remains legacy        | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED            | MANUAL_REQUIRED | Rollback evidence.                             |
| EE-STG-003 | Staging flag on uses adapter rehearsal | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED            | MANUAL_REQUIRED | Local/staging only.                            |
| EE-STG-004 | Valid employee entry                   | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED            | MANUAL_REQUIRED | Expected legacy write with adapter guardrails. |
| EE-STG-005 | Three-decimal amount rejected          | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED            | MANUAL_REQUIRED | No silent rounding.                            |
| EE-STG-006 | Empty amount rejected                  | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED            | MANUAL_REQUIRED | Structured error required.                     |
| EE-STG-007 | Owner/admin submit denied              | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED            | MANUAL_REQUIRED | No financial write.                            |
| EE-STG-008 | Rollback by flag off                   | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED            | MANUAL_REQUIRED | Must return to legacy behavior.                |

## Handover Staging Evidence

| Test ID    | Scenario                        | Request Evidence | Response Evidence | DB Evidence     | Audit Evidence  | Result          | Notes                               |
| ---------- | ------------------------------- | ---------------- | ----------------- | --------------- | --------------- | --------------- | ----------------------------------- |
| HO-STG-001 | Employee valid staging handover | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | Staging tables only.                |
| HO-STG-002 | Same idempotency key replay     | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | No duplicate financial records.     |
| HO-STG-003 | Frontend total tamper rejected  | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | Backend totals authority rehearsal. |
| HO-STG-004 | Voided row rejected             | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | No re-handover of voided rows.      |
| HO-STG-005 | Owner/admin submit rejected     | MANUAL_REQUIRED  | MANUAL_REQUIRED   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | Employee/staff submit only.         |

## Owner Flow Evidence

| Test ID     | Scenario                                           | Before Evidence | Action Evidence | After Evidence  | Result          | Notes                              |
| ----------- | -------------------------------------------------- | --------------- | --------------- | --------------- | --------------- | ---------------------------------- |
| OWN-STG-001 | Dashboard unchanged after no-write rejects         | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | Invalid/unauthorized cases only.   |
| OWN-STG-002 | Dashboard expected change after valid legacy write | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | Must match legacy write design.    |
| OWN-STG-003 | History expected change after valid legacy write   | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | Confirm no duplicate rows.         |
| OWN-STG-004 | Voided records audit-visible                       | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | Active totals exclude voided rows. |
| OWN-STG-005 | Export/report fails safely or succeeds             | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED | No silent failure.                 |

## Database Snapshot Evidence

| Snapshot                     | Table                |    Before Count |     After Count | Expected Change                | Result          | Notes                                                               |
| ---------------------------- | -------------------- | --------------: | --------------: | ------------------------------ | --------------- | ------------------------------------------------------------------- |
| Employee entry valid write   | sessions             | MANUAL_REQUIRED | MANUAL_REQUIRED | Expected per legacy write path | MANUAL_REQUIRED |                                                                     |
| Employee entry valid write   | transactions         | MANUAL_REQUIRED | MANUAL_REQUIRED | Expected per legacy write path | MANUAL_REQUIRED |                                                                     |
| Employee entry invalid write | sessions             | MANUAL_REQUIRED | MANUAL_REQUIRED | No change                      | MANUAL_REQUIRED |                                                                     |
| Employee entry invalid write | transactions         | MANUAL_REQUIRED | MANUAL_REQUIRED | No change                      | MANUAL_REQUIRED |                                                                     |
| Handover staging valid write | handover_commits     | MANUAL_REQUIRED | MANUAL_REQUIRED | Increase                       | MANUAL_REQUIRED |                                                                     |
| Handover staging valid write | handover_commit_rows | MANUAL_REQUIRED | MANUAL_REQUIRED | Increase                       | MANUAL_REQUIRED |                                                                     |
| Handover staging valid write | transactions         | MANUAL_REQUIRED | MANUAL_REQUIRED | No change                      | MANUAL_REQUIRED | Legacy live table must not be written by staging handover endpoint. |
| Audit evidence               | audit_logs           | MANUAL_REQUIRED | MANUAL_REQUIRED | Expected event increase        | MANUAL_REQUIRED |                                                                     |
| Entry evidence               | entry_events         | MANUAL_REQUIRED | MANUAL_REQUIRED | Expected event increase        | MANUAL_REQUIRED |                                                                     |

## Manual Approval Checklist

| Approval Item                                        | Owner           | Status          | Evidence                                               | Notes                                                                                             |
| ---------------------------------------------------- | --------------- | --------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Staging URL confirmed non-production                 | MANUAL_REQUIRED | MANUAL_REQUIRED | `STAGING_URL_NON_PRODUCTION_REVIEW.md`                 | Staging URL is staging-named, but production URL/custom route still needs Dashboard confirmation. |
| Staging D1 backup completed                          | Codex           | DONE            | `STAGING_DB_002_BACKUP_RESULT.md`                      | Backup file exists under ignored `backups/`; not committed.                                       |
| Staging D1 schema/bootstrap approved                 | Codex           | DONE            | `STAGING_DB_002_POST_MIGRATION_SCHEMA_SNAPSHOT.md`     | Staging schema bootstrap completed; production remains untouched.                                 |
| Staging secrets set                                  | Codex           | DONE            | `STAGING_SECRET_SETUP_RESULT.md`                       | Staging secrets set through Wrangler; values omitted from logs and Git.                           |
| Staging test accounts confirmed                      | Codex           | DONE            | `STAGING_TEST_ACCOUNT_SETUP_RESULT.md`                 | Employee row exists; owner/manager configured through `USER_ACCOUNTS` staging secret.             |
| Rollback method exercised                            | MANUAL_REQUIRED | MANUAL_REQUIRED | `STAGING_ROLLBACK_RUNTIME_REHEARSAL_RESULT.md`         | Config rollback documented; runtime write-path rollback still not exercised.                      |
| Money reconciliation reviewed                        | MANUAL_REQUIRED | MANUAL_REQUIRED | `MONEY_RECONCILIATION_GATE_RESULT.md`                  | Current gate is not production approval                                                           |
| TOP_25_MONEY_RISKS reviewed                          | MANUAL_REQUIRED | MANUAL_REQUIRED | `TOP_25_MONEY_RISKS.md`                                | Human accounting/engineering review required                                                      |
| Tenant/property scope accepted for staging rehearsal | MANUAL_REQUIRED | MANUAL_REQUIRED | `P0_006B_TENANT_PROPERTY_SCOPE_READINESS_GATE.md`      | Tenant model remains partial                                                                      |
| Receivables production dependency acknowledged       | MANUAL_REQUIRED | MANUAL_REQUIRED | `P0_008B_RECEIVABLES_IMPLEMENTATION_READINESS_GATE.md` | Receivables remains partial                                                                       |
| Embedded/source artifact gate reviewed               | MANUAL_REQUIRED | MANUAL_REQUIRED | `WORKER_ENTRYPOINT_DRIFT_AUDIT.md`                     | Re-run artifact gates before deploy                                                               |

## Final QA Decision

| Decision                    | Value                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| GO for continued staging QA | Schema bootstrap, staging secrets, and test account setup complete; continue to production URL exclusion and runtime rollback acceptance |
| GO for production cutover   | No                                                                                                                                       |
| Blocking issues             | Rollback runtime exercise, production URL exclusion, and human approvals are still required before write QA                              |
| Required follow-up task     | Complete `STAGING-SECRETS-003`, then run dry-run QA before any approved staging write                                                    |

Production cutover remains `NO-GO` until production migration, production
deployment, accounting reconciliation, tenant scope, receivables, rollback, and
human approval gates are all complete.
