# Staging QA Evidence Template

Scope: human-filled evidence packet for real staging QA. This template does not
authorize staging deploy, production deploy, production migration, remote D1
migration, production feature flag enablement, or production cutover.

## Review Metadata

| Field                               | Value    |
| ----------------------------------- | -------- |
| QA run id                           |          |
| QA date/time                        |          |
| Reviewer                            |          |
| Branch                              |          |
| Commit                              |          |
| Staging Worker URL                  |          |
| Worker entrypoint                   |          |
| APP_ENV                             |          |
| Enabled feature flags               |          |
| Staging D1 name                     |          |
| Staging KV namespace                |          |
| Backup completed before write tests | Yes / No |
| Rollback method confirmed           | Yes / No |
| Production URL checked and excluded | Yes / No |

## Command Evidence

| Command                             | Result | Log Path / Screenshot | Notes                                                     |
| ----------------------------------- | ------ | --------------------- | --------------------------------------------------------- |
| `npm run check`                     |        |                       |                                                           |
| `npm run security:secrets`          |        |                       |                                                           |
| `npm run qa:employee-entry-staging` |        |                       |                                                           |
| `npm run gate:commercial-launch`    |        |                       | Expected `PRODUCTION_NO_GO` until production gates close. |
| `npm run audit:worker-drift`        |        |                       |                                                           |
| `npm run verify:embedded-worker`    |        |                       |                                                           |
| `npm run build:embedded:dry-run`    |        |                       |                                                           |

## Employee Entry Evidence

| Test ID    | Scenario                               | Request Evidence | Response Evidence | DB Evidence | Audit Evidence | Dashboard/History Evidence | Result | Notes                                          |
| ---------- | -------------------------------------- | ---------------- | ----------------- | ----------- | -------------- | -------------------------- | ------ | ---------------------------------------------- |
| EE-STG-001 | Production remains legacy              |                  |                   |             |                |                            |        | Must not enable adapter in production.         |
| EE-STG-002 | Feature flag off remains legacy        |                  |                   |             |                |                            |        | Rollback evidence.                             |
| EE-STG-003 | Staging flag on uses adapter rehearsal |                  |                   |             |                |                            |        | Local/staging only.                            |
| EE-STG-004 | Valid employee entry                   |                  |                   |             |                |                            |        | Expected legacy write with adapter guardrails. |
| EE-STG-005 | Three-decimal amount rejected          |                  |                   |             |                |                            |        | No silent rounding.                            |
| EE-STG-006 | Empty amount rejected                  |                  |                   |             |                |                            |        | Structured error required.                     |
| EE-STG-007 | Owner/admin submit denied              |                  |                   |             |                |                            |        | No financial write.                            |
| EE-STG-008 | Rollback by flag off                   |                  |                   |             |                |                            |        | Must return to legacy behavior.                |

## Handover Staging Evidence

| Test ID    | Scenario                        | Request Evidence | Response Evidence | DB Evidence | Audit Evidence | Result | Notes                               |
| ---------- | ------------------------------- | ---------------- | ----------------- | ----------- | -------------- | ------ | ----------------------------------- |
| HO-STG-001 | Employee valid staging handover |                  |                   |             |                |        | Staging tables only.                |
| HO-STG-002 | Same idempotency key replay     |                  |                   |             |                |        | No duplicate financial records.     |
| HO-STG-003 | Frontend total tamper rejected  |                  |                   |             |                |        | Backend totals authority rehearsal. |
| HO-STG-004 | Voided row rejected             |                  |                   |             |                |        | No re-handover of voided rows.      |
| HO-STG-005 | Owner/admin submit rejected     |                  |                   |             |                |        | Employee/staff submit only.         |

## Owner Flow Evidence

| Test ID     | Scenario                                           | Before Evidence | Action Evidence | After Evidence | Result | Notes                              |
| ----------- | -------------------------------------------------- | --------------- | --------------- | -------------- | ------ | ---------------------------------- |
| OWN-STG-001 | Dashboard unchanged after no-write rejects         |                 |                 |                |        | Invalid/unauthorized cases only.   |
| OWN-STG-002 | Dashboard expected change after valid legacy write |                 |                 |                |        | Must match legacy write design.    |
| OWN-STG-003 | History expected change after valid legacy write   |                 |                 |                |        | Confirm no duplicate rows.         |
| OWN-STG-004 | Voided records audit-visible                       |                 |                 |                |        | Active totals exclude voided rows. |
| OWN-STG-005 | Export/report fails safely or succeeds             |                 |                 |                |        | No silent failure.                 |

## Database Snapshot Evidence

| Snapshot                     | Table                | Before Count | After Count | Expected Change                | Result | Notes                                                               |
| ---------------------------- | -------------------- | -----------: | ----------: | ------------------------------ | ------ | ------------------------------------------------------------------- |
| Employee entry valid write   | sessions             |              |             | Expected per legacy write path |        |                                                                     |
| Employee entry valid write   | transactions         |              |             | Expected per legacy write path |        |                                                                     |
| Employee entry invalid write | sessions             |              |             | No change                      |        |                                                                     |
| Employee entry invalid write | transactions         |              |             | No change                      |        |                                                                     |
| Handover staging valid write | handover_commits     |              |             | Increase                       |        |                                                                     |
| Handover staging valid write | handover_commit_rows |              |             | Increase                       |        |                                                                     |
| Handover staging valid write | transactions         |              |             | No change                      |        | Legacy live table must not be written by staging handover endpoint. |
| Audit evidence               | audit_logs           |              |             | Expected event increase        |        |                                                                     |
| Entry evidence               | entry_events         |              |             | Expected event increase        |        |                                                                     |

## Manual Approval Checklist

| Approval Item                                        | Owner | Status | Evidence | Notes |
| ---------------------------------------------------- | ----- | ------ | -------- | ----- |
| Staging URL confirmed non-production                 |       |        |          |       |
| Staging D1 backup completed                          |       |        |          |       |
| Rollback method exercised                            |       |        |          |       |
| Money reconciliation reviewed                        |       |        |          |       |
| TOP_25_MONEY_RISKS reviewed                          |       |        |          |       |
| Tenant/property scope accepted for staging rehearsal |       |        |          |       |
| Receivables production dependency acknowledged       |       |        |          |       |
| Embedded/source artifact gate reviewed               |       |        |          |       |

## Final QA Decision

| Decision                    | Value                      |
| --------------------------- | -------------------------- |
| GO for continued staging QA | Yes / No / Manual Required |
| GO for production cutover   | No                         |
| Blocking issues             |                            |
| Required follow-up task     |                            |

Production cutover remains `NO-GO` until production migration, production
deployment, accounting reconciliation, tenant scope, receivables, rollback, and
human approval gates are all complete.
