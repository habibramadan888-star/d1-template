# Staging QA Test Data Retention Plan

Generated: 2026-05-25

Scope: document retention of staging-only test data produced during
STAGING-QA-005B. No cleanup is executed by this plan.

## Retention Decision

| Item                                 | Decision | Notes                                                                |
| ------------------------------------ | -------- | -------------------------------------------------------------------- |
| Did real staging QA write test data? | Yes      | STAGING-QA-005B wrote staging-only QA evidence data.                 |
| Should data be deleted now?          | No       | Keep data temporarily as QA evidence until human review is complete. |
| Production data affected?            | No       | QA targeted only `homelink-finance-staging`.                         |
| Cleanup executed in this task?       | No       | This task only creates a future cleanup plan.                        |

## Tables Containing QA Evidence

| Table                       | Evidence Type                              | Expected Test Data                                    |
| --------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| `sessions`                  | Employee entry staging QA                  | One valid employee entry session from the QA run.     |
| `transactions`              | Employee entry staging QA                  | One valid employee entry transaction from the QA run. |
| `audit_logs`                | Employee entry and handover audit          | Audit rows for valid QA flows.                        |
| `entry_events`              | Employee entry and handover event evidence | Event rows for valid QA flows.                        |
| `handover_commits`          | Handover staging QA                        | One staging handover commit.                          |
| `handover_commit_rows`      | Handover staging QA                        | Two staging handover commit rows.                     |
| `handover_idempotency_keys` | Handover staging QA                        | One idempotency key row.                              |
| `handover_audit_events`     | Handover staging QA                        | One handover audit event row.                         |

## Why Retain The Data

- It is direct evidence that real staging write QA executed against the correct
  staging resources.
- It supports review of database before/after counts and audit evidence.
- It helps debug any follow-up discrepancies in dashboard/history evidence.
- Deleting it before review would weaken traceability for STAGING-QA-005B.

## Future Cleanup Requirements

| Requirement                      | Mandatory | Notes                                                                                     |
| -------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| Backup before cleanup            | Yes       | Export staging D1 before deleting QA evidence rows.                                       |
| Staging-only target confirmation | Yes       | Confirm DB name `homelink-finance-staging` and ID `4ff78bfc-3855-436b-aefb-6b492145d79c`. |
| Exact row identification         | Yes       | Use QA run identifiers, timestamps, staging test accounts, or known evidence IDs.         |
| Production cleanup allowed       | No        | Never run cleanup against production D1.                                                  |
| Human approval                   | Yes       | Cleanup deletes evidence and must be approved separately.                                 |
| Post-cleanup verification        | Yes       | Verify only intended QA rows were removed.                                                |

## Suggested Follow-up Task

Create a dedicated staging cleanup task after human evidence review:

`STAGING-QA-CLEANUP-001: Clean retained staging QA evidence after backup and human approval`

The cleanup task must remain staging-only, must not run production commands, and
must not remove evidence before the reviewer accepts the QA package.
