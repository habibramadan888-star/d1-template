# Money Migration Plan

Generated: 2026-05-24, Asia/Dubai

Scope: P0-001A planning only. No live schema migration, production D1 operation, dashboard formula change, handover logic change, or production write-path rewiring was performed.

## Migration Phases

| Phase   | Scope                                                                 | Tables                                                                               | Code Paths                                                                  | Risk                                                              | Verification                                                               | Needs Human Approval                                          |
| ------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| P0-001A | Audit, policy, helper, scan, tests                                    | None changed                                                                         | `modules/finance/money.mjs`, tests, audit script                            | Low; no live path rewrite                                         | `npm run test:money`, `npm run audit:money`, full smoke/check              | No for local tooling; yes before using outputs for migration. |
| P0-001B | Introduce helper to low-risk backend validation and new routes        | None or dev-only draft                                                               | New validation adapters, not legacy financial writes                        | Medium; could reject inputs previously accepted                   | Unit tests for accepted/rejected money strings                             | Yes if staff workflow input behavior changes.                 |
| P0-001C | Dual-write integer minor-unit fields while preserving legacy decimals | `sessions`, `transactions`, `deposit_ledger`, `arrears`, `arrear_tasks`, rent config | `/api/employee/entry`, `/api/save_session`, arrear updates, deposit updates | High; schema and write-path change                                | Local migration rehearsal, rollback rehearsal, dual-write comparison tests | Yes.                                                          |
| P0-001D | Backend summaries prefer `*_fils` with legacy fallback                | Same as P0-001C                                                                      | Dashboard/history/handover read models                                      | High; visible dashboard totals can change if legacy/fils mismatch | Golden data comparison and reconciliation report                           | Yes.                                                          |
| P0-001E | Reconciliation report                                                 | Same tables                                                                          | Read-only reconciliation tooling                                            | Medium; can expose legacy data quality issues                     | Compare legacy decimal-derived fils with stored `*_fils`                   | Yes for resolving discrepancies.                              |
| P0-001F | Production migration plan                                             | Production D1 after approval only                                                    | Migration runner/checklist                                                  | Very high                                                         | Staging migration, backup/restore drill, rollback plan                     | Required.                                                     |

## Dual-Write Strategy

1. Add nullable `*_fils INTEGER` columns in a reviewed migration.
2. Keep legacy decimal fields unchanged during compatibility period.
3. On new writes, parse incoming AED strings to fils and write both:
   - legacy decimal field for old UI/API compatibility;
   - integer fils field for accounting authority.
4. Include idempotency key and audit event for each financial mutation.
5. Reconcile every dual-written row before switching readers.

## Fallback Strategy

- If `*_fils` exists, read it as authority.
- If `*_fils` is null on legacy rows, derive a temporary fils value from legacy decimal string/number and mark as `legacy_derived`.
- Do not silently overwrite legacy rows during normal reads.
- Report mismatches instead of auto-correcting them.

## Reconciliation Strategy

| Source                                                      | Reconcile Against                             | Mismatch Action                                |
| ----------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| `transactions.amount/due/paid/deficit`                      | `amount_fils/due_fils/paid_fils/deficit_fils` | Produce report; do not auto-fix.               |
| `sessions.cash_handover/bank_transfer_total/gross_received` | backend recomputed transaction totals         | Requires P0-003.                               |
| `deposit_ledger.amount/delta/balance_after`                 | running fils ledger                           | Flag liability mismatch for accountant review. |
| `arrears.remain` / `arrear_tasks.*amount*`                  | receivable/payment balances                   | Requires P0-008.                               |
| `app_settings.rent_ref_room`                                | effective-dated rent config                   | Requires rent config migration.                |

## Dependencies

- P0-002: needed before handover can be treated as atomic commercial commit.
- P0-003: needed before session/dashboard totals become backend authority.
- P0-008: needed before arrears/tail payments are closed as formal receivables.
- P0-006: needed before SaaS multi-tenant production rollout.

## Current Status

P0-001 is Partial after P0-001A. The project now has better helper/test/audit guardrails, but live legacy money columns and JS Number calculations still exist.

## P0-001C Preparation Update

Date: 2026-05-24, Asia/Dubai

P0-001C added preparation guardrails without changing live accounting behavior:

- `modules/finance/money-dual-write.mjs` generates draft `*_fils` patches from legacy decimal values.
- `tests/money-dual-write.spec.mjs` verifies safe patch generation, invalid input rejection, explicit negative handling, and mismatch reporting.
- `scripts/rehearse-money-dual-write.mjs` inspects local schema and creates `MONEY_DUAL_WRITE_REHEARSAL_RESULT.md`.
- `migration-drafts/005_money_minor_units_dual_write_draft.sql` documents nullable `*_fils` companion columns for human review.

P0-001 remains Partial. No production migration, remote D1 operation, live write-path switch, dashboard reader switch, or automatic legacy correction has been performed.
