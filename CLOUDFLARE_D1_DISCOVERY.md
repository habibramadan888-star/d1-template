# Cloudflare D1 Discovery

Generated: 2026-05-25, Asia/Dubai

Scope: read-only D1 discovery. No `wrangler d1 execute`, migration, create,
delete, export, time-travel, or remote write command was run.

## Commands Run

| Command                       | Result | Notes                         |
| ----------------------------- | ------ | ----------------------------- |
| `npx wrangler d1 --help`      | PASS   | Confirmed D1 command surface. |
| `npx wrangler d1 list --json` | PASS   | Listed D1 databases only.     |

## D1 Databases

| Database Name          | Database ID                            | Looks Staging? | Looks Production?    | Binding Match                         | Confidence                                       | Notes                                                                          |
| ---------------------- | -------------------------------------- | -------------- | -------------------- | ------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| `homelink`             | `562aa079-1cca-4176-ba3b-7276a65f98fb` | No             | Yes, production-like | Matches `DB` in both Wrangler configs | High for existing configured DB, low for staging | Same DB is bound by source and embedded configs; not safe to treat as staging. |
| `d1-template-database` | `4792b9f7-f808-4c59-bf10-e72a8d27db2e` | No             | No                   | No                                    | Low                                              | Template database name does not match staging plan or current binding.         |

## Candidate Staging D1

`MANUAL_REQUIRED`.

`homelink-staging` appears in planning documents as the desired staging target,
but it was not present in the read-only `wrangler d1 list --json` result. No
`wrangler d1 info` command was run because no candidate staging database was
confirmed.

## Required Human Action

1. Create or identify a dedicated staging D1 database outside this task.
2. Confirm its database name and ID.
3. Confirm it is separate from `homelink`.
4. Provide backup/export evidence before any real staging write QA.
