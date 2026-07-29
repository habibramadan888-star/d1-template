# Staging D1 Bootstrap Plan

Generated: 2026-05-25

This is a plan only. No migration, schema write, D1 execute write, seed, or staging data write was performed.

## Decision

| Question                                  | Answer                                                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Does staging D1 need bootstrap?           | Yes. It has no application schema.                                                                                                              |
| Which migrations are needed first?        | `migrations/local/001_clean_legacy_bootstrap.sql`, then `migrations/local/002_handover_atomic_staging.sql`.                                     |
| Are these active migrations?              | Yes for local clean bootstrap; candidate for staging after approval.                                                                            |
| Are these local/staging only?             | Yes. They are not production-approved.                                                                                                          |
| Can draft migrations be directly applied? | No. Drafts require separate P0 review.                                                                                                          |
| Is seed needed?                           | Yes eventually for test accounts/settings, but not in this schema-only bootstrap plan.                                                          |
| Does seed write business data?            | It can write auth/settings/test data, so it must be a separate approved task after backup.                                                      |
| Are test accounts included here?          | No. Separate staging secrets/accounts task required.                                                                                            |
| Must backup happen first?                 | Yes, before any schema write.                                                                                                                   |
| Rollback method?                          | Restore from backup and/or recreate staging D1 only after explicit human approval; disable feature flags remains immediate behavioral rollback. |
| Production impact                         | No. Target must be `homelink-finance-staging` only.                                                                                             |
| Human approval needed                     | Yes.                                                                                                                                            |

## Proposed Order

| Order | Migration / Script                                                                                                          | Purpose                                           | Writes Schema | Writes Data |   Staging Allowed | Production Allowed | Needs Approval |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------: | ----------: | ----------------: | -----------------: | -------------: |
| 0     | `npx wrangler d1 export homelink-finance-staging --remote --output ./backups/homelink-finance-staging-before-migration.sql` | Backup before schema write.                       |            No |          No |               Yes |                 No |            Yes |
| 1     | `migrations/local/001_clean_legacy_bootstrap.sql`                                                                           | Create minimum legacy-compatible schema.          |           Yes |          No | Yes, after backup |                 No |            Yes |
| 2     | `migrations/local/002_handover_atomic_staging.sql`                                                                          | Create local/staging-only handover atomic tables. |           Yes |          No | Yes, after backup |                 No |            Yes |
| 3     | Staging schema SELECT verification                                                                                          | Confirm tables and indexes exist.                 |            No |          No |               Yes |                 No |            Yes |
| 4     | Staging seed/test accounts task                                                                                             | Add settings/test accounts if approved.           |            No |         Yes |   Later task only |                 No |            Yes |
| Draft | `migration-drafts/005_money_minor_units_dual_write_draft.sql`                                                               | Future `*_fils` dual-write fields.                |           Yes |          No |           Not now |                 No |            Yes |
| Draft | `migration-drafts/004_receivables_model_draft.sql`                                                                          | Future receivables model.                         |           Yes |          No |           Not now |                 No |            Yes |
| Draft | `migration-drafts/002_commercial_bootstrap.sql`                                                                             | Future SaaS tenancy/commercial schema.            |           Yes |          No |           Not now |                 No |            Yes |

Conclusion: proceed to `STAGING-DB-002` only after backup, rollback confirmation, target DB confirmation, and human approval.
