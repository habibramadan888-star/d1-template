# Staging QA Evidence Template

Scope: human-filled evidence packet for real staging QA. This template does not
authorize staging deploy, production deploy, production migration, remote D1
migration, production feature flag enablement, or production cutover.

## Review Metadata

| Field                               | Value                                                                                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA run id                           | MANUAL_REQUIRED - assign per real staging QA run                                                                                                                                             |
| QA date/time                        | Discovery generated 2026-05-25; actual QA run time MANUAL_REQUIRED                                                                                                                           |
| Reviewer                            | MANUAL_REQUIRED                                                                                                                                                                              |
| Branch                              | `qa/staging-resource-discovery-readonly`                                                                                                                                                     |
| Commit                              | Discovery base commit `20b3f25`; final discovery commit recorded in git log after this update                                                                                                |
| Staging Worker URL                  | MANUAL_REQUIRED - read-only Wrangler deployment discovery found configured Worker `homelink-finance`, but did not confirm a staging URL                                                      |
| Worker entrypoint                   | Source: `deploy-worker/wrangler.toml` -> `src/index.js`; embedded: `deploy-worker/wrangler.embedded.toml` -> `src/index.embedded.js`; actual staging entrypoint MANUAL_REQUIRED              |
| APP_ENV                             | Expected `staging` for real staging QA; checked-in Wrangler vars do not set `APP_ENV`; examples document `development`; MANUAL_REQUIRED for Cloudflare staging var confirmation              |
| Enabled feature flags               | Required for QA: `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true`, `ENABLE_HANDOVER_ATOMIC_STAGING=true`; not found in checked-in Wrangler vars; MANUAL_REQUIRED for staging var confirmation |
| Staging D1 name                     | MANUAL_REQUIRED - read-only D1 list found `homelink` matching config and `d1-template-database`, but no confirmed staging D1                                                                 |
| Staging KV namespace                | MANUAL_REQUIRED - read-only KV list found `RATE_LIMIT` matching config and `__homelink-app-workers_sites_assets`, but no confirmed staging KV                                                |
| Backup completed before write tests | MANUAL_REQUIRED - no backup executed by this discovery task                                                                                                                                  |
| Rollback method confirmed           | MANUAL_REQUIRED - rollback docs/plans exist, but real staging rollback is not exercised                                                                                                      |
| Production URL checked and excluded | MANUAL_REQUIRED - staging URL is missing, so staging-vs-production exclusion cannot be proven                                                                                                |

## Autofilled Test Accounts

These are suggested non-production account identifiers only. Passwords must be
stored in Cloudflare staging secrets or another approved ignored secret store.
No password, token, cookie, or real secret may be written to this Markdown file.

| Role          | Username              | Email                              | Password Handling                                   |
| ------------- | --------------------- | ---------------------------------- | --------------------------------------------------- |
| employee      | `employee_stg_qa_001` | `employee_stg_qa_001@example.test` | stored in Cloudflare staging secret / not committed |
| owner         | `owner_stg_qa_001`    | `owner_stg_qa_001@example.test`    | stored in Cloudflare staging secret / not committed |
| manager/admin | `manager_stg_qa_001`  | `manager_stg_qa_001@example.test`  | stored in Cloudflare staging secret / not committed |

Suggested password generation command for a human to run only when writing to an
approved ignored secret target:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

This command was not executed by the autofill task because no approved staging
secret write target was confirmed.

## Command Evidence

| Command                             | Result                                    | Log Path / Screenshot                              | Notes                                                     |
| ----------------------------------- | ----------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| `npm run check`                     | PASS                                      | Local console / git commit evidence                | 182 tests passed; build ran Wrangler dry-run only.        |
| `npm run security:secrets`          | PASS                                      | Local console / git commit evidence                | Secret hygiene check passed.                              |
| `npm run qa:employee-entry-staging` | MANUAL_REQUIRED                           | `EMPLOYEE_ENTRY_REAL_STAGING_QA_DRY_RUN_RESULT.md` | Dry-run only until real staging inputs are supplied.      |
| `npm run gate:commercial-launch`    | PRODUCTION_NO_GO                          | Local console / git commit evidence                | Expected `PRODUCTION_NO_GO` until production gates close. |
| `npm run audit:worker-drift`        | Previously available; rerun before deploy | `WORKER_ENTRYPOINT_DRIFT_AUDIT.md`                 | No deploy performed by autofill.                          |
| `npm run verify:embedded-worker`    | Previously available; rerun before deploy | `EMBEDDED_WORKER_FRESHNESS_RESULT.md`              | No deploy performed by autofill.                          |
| `npm run build:embedded:dry-run`    | Previously available; rerun before deploy | `.wrangler-dryrun/`, deploy artifact reports       | Dry-run only; no deploy.                                  |

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

| Approval Item                                        | Owner           | Status          | Evidence                                               | Notes                                           |
| ---------------------------------------------------- | --------------- | --------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Staging URL confirmed non-production                 | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED                                        | No staging URL found in committed config        |
| Staging D1 backup completed                          | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED                                        | No backup executed by autofill                  |
| Rollback method exercised                            | MANUAL_REQUIRED | MANUAL_REQUIRED | MANUAL_REQUIRED                                        | Docs exist; real staging rollback not exercised |
| Money reconciliation reviewed                        | MANUAL_REQUIRED | MANUAL_REQUIRED | `MONEY_RECONCILIATION_GATE_RESULT.md`                  | Current gate is not production approval         |
| TOP_25_MONEY_RISKS reviewed                          | MANUAL_REQUIRED | MANUAL_REQUIRED | `TOP_25_MONEY_RISKS.md`                                | Human accounting/engineering review required    |
| Tenant/property scope accepted for staging rehearsal | MANUAL_REQUIRED | MANUAL_REQUIRED | `P0_006B_TENANT_PROPERTY_SCOPE_READINESS_GATE.md`      | Tenant model remains partial                    |
| Receivables production dependency acknowledged       | MANUAL_REQUIRED | MANUAL_REQUIRED | `P0_008B_RECEIVABLES_IMPLEMENTATION_READINESS_GATE.md` | Receivables remains partial                     |
| Embedded/source artifact gate reviewed               | MANUAL_REQUIRED | MANUAL_REQUIRED | `WORKER_ENTRYPOINT_DRIFT_AUDIT.md`                     | Re-run artifact gates before deploy             |

## Final QA Decision

| Decision                    | Value                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| GO for continued staging QA | Manual Required                                                                                                         |
| GO for production cutover   | No                                                                                                                      |
| Blocking issues             | Missing staging URL, confirmed staging D1/KV, staging accounts, backup evidence, rollback evidence, and human approvals |
| Required follow-up task     | Provide real staging inputs through non-committed secure channel, then run dry-run QA before any approved staging write |

Production cutover remains `NO-GO` until production migration, production
deployment, accounting reconciliation, tenant scope, receivables, rollback, and
human approval gates are all complete.
