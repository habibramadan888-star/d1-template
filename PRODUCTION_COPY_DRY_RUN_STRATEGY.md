# Production Copy Dry-Run Strategy

Date: 2026-05-26, Asia/Dubai

Status: `MANUAL_REQUIRED`

Production cutover: `PRODUCTION_NO_GO`

This document is a strategy only. It does not create a production copy, export
D1, import D1, execute SQL, deploy, migrate, or write any D1.

## 1. What Is A Production Copy

A production copy is an isolated Cloudflare D1 database created from an
approved production backup/export for rehearsal only. It is not the live
production database and must never be bound to the production Worker.

Recommended D1 name:

- `homelink-finance-production-copy-dryrun`

Recommended Worker:

- No public Worker is required for this preparation stage.
- If a future task requires runtime verification, it must use a non-public,
  approval-gated Worker or local tooling only.

## 2. Why Not Dry-Run Directly On Production

Direct production dry-run is unsafe because:

- Some commands labeled dry-run can still discover or mutate remote resources
  if invoked incorrectly.
- Production D1 export/import/execute commands can expose or alter live data.
- Tenant/property backfill, money reconciliation, and receivables checks require
  exact row counts before live use.
- Rollback must be proven before any live write.
- Staging success does not authorize production mutation.

## 3. Naming Convention

| Resource              | Recommended Name                                          | Notes                                              |
| --------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| Production copy D1    | `homelink-finance-production-copy-dryrun`                 | Must be separate from live production and staging. |
| Backup file           | `./backups/production-before-copy-dryrun-<timestamp>.sql` | Must not be committed.                             |
| Dry-run report prefix | `PRODUCTION_COPY_*`                                       | Keeps outputs distinct from staging evidence.      |

## 4. Data Masking / Redaction

Production copy may contain sensitive customer/business data. Before any
non-local or multi-operator workflow, reviewers must decide whether the copy
requires masking.

| Data Class                          | Masking Decision                                             |
| ----------------------------------- | ------------------------------------------------------------ |
| Customer names/contact data         | MANUAL_REQUIRED                                              |
| Employee usernames / identifiers    | MANUAL_REQUIRED                                              |
| Audit/event metadata                | MANUAL_REQUIRED                                              |
| Financial amounts                   | Usually retain for reconciliation; access must be restricted |
| Password/token/cookie/secret values | Must never be exported into reports or logs                  |

## 5. Isolation Requirements

The production copy must:

1. Use a distinct D1 name and id.
2. Not be bound to production Worker.
3. Not be bound to public routes.
4. Not serve external traffic.
5. Not use production feature flags.
6. Not be treated as accounting authority.
7. Be used only for migration, backfill, reconciliation, and rollback
   rehearsal.

## 6. Retention / Destruction

| Option                   | Requirement                                                         |
| ------------------------ | ------------------------------------------------------------------- |
| Destroy after dry-run    | Requires reviewer confirmation and deletion command review.         |
| Retain temporarily       | Requires access control, retention owner, and cleanup deadline.     |
| Reuse for later dry-runs | Requires refresh policy because stale copies can mislead reviewers. |

## 7. Required Approvers

| Approval Area                    | Required Owner                 |
| -------------------------------- | ------------------------------ |
| Production D1 target             | Engineering / operations owner |
| Backup/export                    | Engineering / operations owner |
| Data masking/access              | Business/data owner            |
| Migration/backfill plan          | Engineering + data owner       |
| Money/receivables reconciliation | Accounting owner               |
| Rollback rehearsal               | Engineering / operations owner |
| Business cutover path            | Business owner                 |

Conclusion: the production copy dry-run is the next production-facing rehearsal
only after explicit approval. It is not permission to touch live production.
