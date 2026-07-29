# STAGING-QA-004 Remaining Manual Inputs

Generated: 2026-05-25

These items must be completed before real staging write QA. This task did not write staging data, create accounts, execute backup, run migration, or enable feature flags.

| Item                                                               | Required Before Write QA | Current Status  | Who Must Do It                                        | Notes                                                                                       |
| ------------------------------------------------------------------ | ------------------------ | --------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Set staging secrets                                                | Yes                      | MANUAL_REQUIRED | Human operator                                        | Use Cloudflare staging secrets only. Do not commit values.                                  |
| Create / confirm employee staging test account                     | Yes                      | MANUAL_REQUIRED | Human operator or approved staging seed task          | Suggested username: `employee_stg_qa_001`.                                                  |
| Create / confirm owner staging test account                        | Yes                      | MANUAL_REQUIRED | Human operator or approved staging seed task          | Suggested username: `owner_stg_qa_001`.                                                     |
| Create / confirm manager/admin staging test account, or mark N/A   | Yes                      | MANUAL_REQUIRED | Human operator                                        | Suggested username: `manager_stg_qa_001`; mark N/A if role does not exist.                  |
| Execute staging D1 backup                                          | Yes                      | MANUAL_REQUIRED | Human operator                                        | Must happen before write QA. Do not commit backup file.                                     |
| Record backup evidence                                             | Yes                      | MANUAL_REQUIRED | Human operator                                        | Include command, database, timestamp, operator, and storage location outside Git.           |
| Rehearse rollback by feature flag off                              | Yes                      | MANUAL_REQUIRED | Human operator or approved staging dry-run/write task | Must prove flags can be disabled and legacy behavior restored.                              |
| Confirm staging D1 schema / migrations state                       | Yes                      | MANUAL_REQUIRED | Human operator or approved staging DB preflight task  | New staging D1 was created without migrations in setup task.                                |
| Confirm staging D1 does not contain production data                | Yes                      | MANUAL_REQUIRED | Human operator                                        | Use Cloudflare Dashboard/read-only metadata and approved schema/data checks.                |
| Confirm staging KV does not use production KV                      | Yes                      | PARTIAL         | Human operator                                        | Config binds staging Worker to `RATE_LIMIT_STAGING`; Dashboard confirmation still required. |
| Confirm Cloudflare Dashboard Worker URL                            | Yes                      | MANUAL_REQUIRED | Human operator                                        | Confirm Worker route/custom domain and no production route overlap.                         |
| Confirm production URL is excluded                                 | Yes                      | MANUAL_REQUIRED | Human operator                                        | Production URL was not fully confirmed in this task.                                        |
| Decide whether staging D1 migration/bootstrap is needed            | Yes                      | MANUAL_REQUIRED | Human operator                                        | If needed, open `STAGING-DB-001`; do not run migration inside this task.                    |
| If staging migration is needed, approve separate staging-only task | Yes                      | MANUAL_REQUIRED | Human operator                                        | Must prohibit production migration.                                                         |

Current gate: real staging write QA is not allowed until all required manual inputs are complete.
