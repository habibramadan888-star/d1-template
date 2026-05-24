# Money Dual-Write Preparation Plan

Generated: 2026-05-24, Asia/Dubai

Scope: P0-001C preparation only. This plan does not authorize production migration or live write-path switching.

## Objective

Move toward commercial-grade money storage by preparing nullable integer minor-unit companion fields beside legacy decimal fields. During the compatibility period, existing UI/API behavior can continue reading legacy fields while new controlled paths prepare to write `*_fils` values for reconciliation.

## Target Tables

| Table            | Legacy Fields                                                 | Draft Fils Fields                                                       | Notes                                                                       |
| ---------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `sessions`       | `cash_handover`, `bank_transfer_total`, `gross_received`      | `cash_handover_fils`, `bank_transfer_total_fils`, `gross_received_fils` | Must eventually be recomputed by backend totals, not trusted from frontend. |
| `transactions`   | `amount`, `due`, `paid`, `deficit`, deposit and period fields | Matching `*_fils` fields                                                | Core transaction authority. Requires staged migration and reconciliation.   |
| `deposit_ledger` | `amount`, `delta`, `balance_after`                            | `amount_fils`, `delta_fils`, `balance_after_fils`                       | Deposit liability must reconcile to running balance.                        |
| `arrears`        | `remain`                                                      | `remain_fils`                                                           | Legacy compatibility only; future authority belongs to receivables.         |
| `arrear_tasks`   | `arrear_amount`, `promise_amount`, `actual_received`          | Matching `*_fils` fields                                                | Operational follow-up values; not final ledger authority.                   |

## Preparation Artifacts

| Artifact                                                      | Purpose                                                                 | Writes Database? |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------- |
| `modules/finance/money-dual-write.mjs`                        | Build deterministic draft patches from legacy money fields to `*_fils`. | No               |
| `tests/money-dual-write.spec.mjs`                             | Validate parsing, warnings, mismatch reporting, and patch safety.       | No               |
| `scripts/rehearse-money-dual-write.mjs`                       | Inspect local schema and generate rehearsal report.                     | No               |
| `migration-drafts/005_money_minor_units_dual_write_draft.sql` | Human-reviewable nullable column migration draft.                       | No               |

## Rules

1. Legacy decimal fields remain unchanged during preparation.
2. `*_fils` fields are nullable until backfill and reconciliation are complete.
3. A draft patch is not authority until a reviewed write path applies it atomically.
4. Numeric legacy values produce warnings because JS Number must not be future authority.
5. Three-decimal, empty required, NaN, Infinity, or malformed values must be rejected.
6. Existing legacy/fils mismatch must be reported, not auto-corrected.
7. Production migration requires staging proof, backup, rollback, and human approval.

## Dependencies Before Live Switch

| Dependency                    | Why It Matters                                                               |
| ----------------------------- | ---------------------------------------------------------------------------- |
| P0-002 live handover decision | Handover rows must become atomic before session totals are trusted.          |
| P0-003 live backend totals    | Dashboard must use server recompute, not frontend totals.                    |
| P0-008 receivables decision   | Arrears and tail amounts need formal receivable lifecycle.                   |
| P0-006 tenant scope           | SaaS rollout must isolate company/property data before production migration. |
