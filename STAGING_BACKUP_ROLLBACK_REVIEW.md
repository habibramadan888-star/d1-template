# Staging Backup Rollback Review

Generated: 2026-05-25, Asia/Dubai

Scope: read-only review of existing documents and scripts. No D1 export, D1
restore/import, Worker rollback, deployment, migration, or feature flag mutation
was executed.

## Backup / Rollback Findings

| Item                                | Found                   | Evidence                                                                        | Status                           | Notes                                                                      |
| ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| D1 export backup command            | Partial                 | Wrangler supports `d1 export`; docs mention backup/export requirements          | MANUAL_REQUIRED                  | No approved staging DB target or backup output path confirmed.             |
| D1 restore/import plan              | Partial                 | Rollback/readiness docs discuss rollback requirements                           | MANUAL_REQUIRED                  | No exercised staging restore/import run found.                             |
| Worker rollback plan                | Partial                 | Deploy/readiness plans mention rollback and Wrangler versions/rollback concepts | MANUAL_REQUIRED                  | No real staging rollback evidence found.                                   |
| Feature flag rollback plan          | Yes for local rehearsal | Employee entry rollback drill and feature flag docs                             | MANUAL_REQUIRED for real staging | Local rollback evidence exists; real staging not exercised.                |
| Previous deploy rollback plan       | Partial                 | Version/deployment read-only data available                                     | MANUAL_REQUIRED                  | Human must approve rollback version/entrypoint before staging/prod deploy. |
| Staging D1 backup naming convention | No                      | Not found in committed docs                                                     | MANUAL_REQUIRED                  | Needed before staging write QA.                                            |
| Backup storage location outside git | No                      | Not found in committed docs                                                     | MANUAL_REQUIRED                  | Must not commit backup files or secrets.                                   |
| What must not be committed          | Yes                     | `.env` examples and QA docs warn against secrets                                | Partial                          | Needs real QA operator confirmation.                                       |

## Backup Evidence Template

| Field              | Value           |
| ------------------ | --------------- |
| Command            | MANUAL_REQUIRED |
| Database           | MANUAL_REQUIRED |
| Output file        | MANUAL_REQUIRED |
| Timestamp          | MANUAL_REQUIRED |
| Operator           | MANUAL_REQUIRED |
| Stored outside git | yes/no          |

## Rollback Evidence Template

| Field                       | Value           |
| --------------------------- | --------------- |
| Disable feature flag        | MANUAL_REQUIRED |
| Restore Worker version      | MANUAL_REQUIRED |
| Restore D1 backup if needed | MANUAL_REQUIRED |
| Verification command        | MANUAL_REQUIRED |
| Operator                    | MANUAL_REQUIRED |

## Conclusion

`MANUAL_REQUIRED`

Do not run real staging write QA until a human provides staging D1 backup
evidence and an exercised rollback plan.
