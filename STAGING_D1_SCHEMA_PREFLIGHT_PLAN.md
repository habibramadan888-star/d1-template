# Staging D1 Schema Preflight Plan

Generated: 2026-05-25

Scope: planning only. This task did not execute D1 commands, migrations, schema queries, or staging writes.

## Current Status

1. Staging D1 `homelink-finance-staging` exists.
2. The setup task did not execute migrations.
3. The current staging D1 schema is not confirmed.
4. Real staging write QA may fail until required tables and staging/local schema are created.
5. Any staging schema bootstrap must be handled in a separate approved task.

## Safe Schema Check Options

The following are candidates for a future staging DB preflight task. They are not executed here.

| Command / Action                                                            | Category               |  Requires Approval | Notes                                                             |
| --------------------------------------------------------------------------- | ---------------------- | -----------------: | ----------------------------------------------------------------- |
| Review `migrations/local/*.sql`                                             | Local read-only        |                 No | Confirms expected schema source.                                  |
| Review `D1_MIGRATION_ORDER.md`                                              | Local read-only        |                 No | Confirms intended migration ordering.                             |
| Review Cloudflare Dashboard D1 table list                                   | Dashboard read-only    |  Yes, human action | Does not write data.                                              |
| `npx wrangler d1 info homelink-finance-staging`                             | Remote metadata read   |                Yes | Metadata-only; not sufficient for table schema.                   |
| `npx wrangler d1 execute homelink-finance-staging --remote --command "..."` | Remote SQL             | Yes, separate task | Even read-only SQL uses D1 execute and is forbidden in this task. |
| `npx wrangler d1 migrations apply homelink-finance-staging --remote`        | Remote migration/write | Yes, separate task | Writes schema; forbidden here.                                    |
| Any staging seed command                                                    | Remote write           | Yes, separate task | Requires backup and rollback first.                               |

## Required Future Decision

Before real staging write QA:

1. Confirm whether staging D1 is empty.
2. Confirm which migration set is approved for staging.
3. Execute backup before any write.
4. Apply only staging-approved migrations.
5. Verify required tables for employee entry, handover staging endpoint, audit logs, and dashboard reads.
6. Keep production migration explicitly forbidden.

Recommendation: open `STAGING-DB-001` for staging D1 schema/bootstrap preflight.
