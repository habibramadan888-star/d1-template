# Production D1 Backup And Copy Command Draft

Date: 2026-05-26, Asia/Dubai

Status: command draft only. Nothing in this file was executed.

Production cutover: `PRODUCTION_NO_GO`

## Read-Only Discovery Commands

These commands are drafts. They must not be run in this task.

```powershell
npx wrangler d1 list
npx wrangler d1 info <PRODUCTION_D1_NAME>
```

## Backup Command Draft

This command is a draft only and must not be run without explicit future human
approval.

```powershell
npx wrangler d1 export <PRODUCTION_D1_NAME> --remote --output ./backups/production-before-dryrun.sql
```

## Copy / Restore Plan Draft

Draft sequence for a future approval-gated task:

1. Confirm live production D1 name and id.
2. Export production D1 to an ignored backup path.
3. Create an isolated production-copy D1, recommended name:
   `homelink-finance-production-copy-dryrun`.
4. Import the approved backup into the production-copy D1.
5. Run migration/backfill/reconciliation rehearsals only against the copy.
6. Verify row counts and rollback on the copy.
7. Retain or destroy the copy according to an approved retention decision.

## Forbidden Now

The current task forbids executing:

1. Export production.
2. Import production.
3. Migration apply.
4. D1 execute.
5. Deploy.
6. Delete.

## Command Classification

| Command                                                                                                                  | Purpose                             | Safe To Run Now | Needs Human Approval                  | Writes Cloudflare                  | Writes Production        |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | --------------- | ------------------------------------- | ---------------------------------- | ------------------------ |
| `npx wrangler d1 list`                                                                                                   | Discover D1 resources               | No              | Yes                                   | No                                 | No                       |
| `npx wrangler d1 info <PRODUCTION_D1_NAME>`                                                                              | Confirm production D1 id            | No              | Yes                                   | No                                 | No                       |
| `npx wrangler d1 export <PRODUCTION_D1_NAME> --remote --output ./backups/production-before-dryrun.sql`                   | Backup live production D1           | No              | Yes                                   | Reads remote / writes local backup | No, but reads production |
| `npx wrangler d1 create homelink-finance-production-copy-dryrun`                                                         | Create production-copy D1           | No              | Yes                                   | Yes                                | No                       |
| `npx wrangler d1 execute homelink-finance-production-copy-dryrun --remote --file ./backups/production-before-dryrun.sql` | Restore backup into production copy | No              | Yes                                   | Yes                                | No                       |
| `npx wrangler d1 execute homelink-finance-production-copy-dryrun --remote --file <MIGRATION_SQL>`                        | Rehearse migration on copy          | No              | Yes                                   | Yes                                | No                       |
| `npx wrangler d1 execute <PRODUCTION_D1_NAME> --remote --file <ANY_SQL>`                                                 | Execute SQL on live production      | No              | Yes, but still forbidden by this task | Yes                                | Yes                      |
| `npx wrangler deploy`                                                                                                    | Deploy Worker                       | No              | Yes, but forbidden by this task       | Yes                                | Possible                 |
| `npx wrangler d1 delete homelink-finance-production-copy-dryrun`                                                         | Delete dry-run copy                 | No              | Yes                                   | Yes                                | No                       |

Conclusion: this file is a command draft only. It intentionally contains no
executed command output.
