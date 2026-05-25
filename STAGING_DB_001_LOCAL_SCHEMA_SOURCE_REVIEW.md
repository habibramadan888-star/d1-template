# STAGING-DB-001 Local Schema Source Review

Generated: 2026-05-25

Scope: local schema source review only. No migration, staging write, production operation, or secret access was performed.

## Summary

The current clean bootstrap path is local-only and file-based. It uses SQL files under `migrations/local/` through the local bootstrap scripts, not `wrangler d1 migrations apply`.

| Source                                                        | Role                                                                            | Status                                                                              | Staging Applicability                                                               | Production Applicability                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------- |
| `migrations/local/001_clean_legacy_bootstrap.sql`             | Creates minimum legacy-compatible app schema.                                   | Active for local clean bootstrap.                                                   | Candidate for staging bootstrap after backup and approval.                          | Not production-approved.                      |
| `migrations/local/002_handover_atomic_staging.sql`            | Creates local/staging-only handover atomic tables.                              | Active for local clean bootstrap.                                                   | Candidate for staging bootstrap after backup and approval.                          | Not production-approved.                      |
| `migrations/001_employee_anchor_schema.sql`                   | Historical patch for an existing DB where `transactions` already exists.        | Not sufficient for clean bootstrap.                                                 | Not recommended for empty staging D1.                                               | Not production-approved without review.       |
| `migration-drafts/002_commercial_bootstrap.sql`               | Future commercial schema with tenancy, receivables, payments, and integer fils. | Draft only.                                                                         | Rehearsal/design only.                                                              | Forbidden without P0/P1 approvals.            |
| `migration-drafts/003_delete_session_void_fields.sql`         | Existing legacy table void-field rollout draft.                                 | Draft only; local bootstrap already creates void fields.                            | Not needed for empty staging bootstrap if `001_clean_legacy_bootstrap.sql` is used. | Human approval required.                      |
| `migration-drafts/004_receivables_model_draft.sql`            | Future receivables model.                                                       | Draft only.                                                                         | Not required for current staging QA.                                                | Blocked by P0-008.                            |
| `migration-drafts/005_money_minor_units_dual_write_draft.sql` | Future minor-unit dual-write fields.                                            | Draft only.                                                                         | Not required for initial staging schema bootstrap.                                  | Blocked by P0-001 production migration gates. |
| `migration-drafts/handover_atomic_commit_draft.sql`           | Earlier handover atomic draft.                                                  | Superseded for local/staging by `migrations/local/002_handover_atomic_staging.sql`. | Do not apply separately unless reviewed.                                            | Not production-approved.                      |

## Direct Answers

| Question                                                 | Answer                                                                                                                                                               |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local clean D1 bootstrap depends on which migrations?    | `migrations/local/001_clean_legacy_bootstrap.sql` then `migrations/local/002_handover_atomic_staging.sql`.                                                           |
| Current active migrations are where?                     | `migrations/local/`.                                                                                                                                                 |
| Which migrations are local/staging usable?               | The two `migrations/local/*.sql` files, after staging backup and human approval.                                                                                     |
| Which migrations are draft only?                         | All files under `migration-drafts/` and the historical `migrations/001_employee_anchor_schema.sql` for empty DB bootstrap purposes.                                  |
| Which migrations are forbidden for production?           | All current local/staging/draft migrations until a separate production migration review approves them.                                                               |
| Minimum required app tables?                             | `active_sessions`, `employee_users`, `audit_logs`, `app_settings`, `sessions`, `transactions`, `arrears`, `arrear_tasks`, `entry_events`, `deposit_ledger`.          |
| Staging handover endpoint required tables?               | `handover_commits`, `handover_commit_rows`, `handover_idempotency_keys`, `handover_audit_events`.                                                                    |
| Employee entry adapter required tables?                  | Legacy runtime path still needs `sessions`, `transactions`, `deposit_ledger`, `arrear_tasks`, `entry_events`, `audit_logs`, `app_settings`, and auth/session tables. |
| Future P0-001 / P0-008 / P0-006 tables?                  | `*_fils` dual-write fields, receivables/payment allocation tables, tenant/company/property scope tables, and formal SaaS user/property model.                        |
| What should staging D1 apply for dry-run / QA readiness? | Start with `migrations/local/001_clean_legacy_bootstrap.sql` and `migrations/local/002_handover_atomic_staging.sql` only, after backup and approval.                 |

Conclusion: staging schema bootstrap is required before real staging write QA. Current local/staging candidates are known, but execution must be a separate approved task.
