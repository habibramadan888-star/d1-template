# Money Dual-Write Migration Review

Generated: 2026-05-24, Asia/Dubai

Reviewed file: `migration-drafts/005_money_minor_units_dual_write_draft.sql`

Scope: review only. The draft was not executed locally, remotely, or in production. No live financial formulas, dashboard results, handover flow, or production configuration were changed.

## Field Review

| Table                          | Legacy Field                                         | Proposed Fils Field                                                 | Type      | Nullable              | Backfill Needed | Risk                                                                                  | Recommendation                                                                  |
| ------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------- | --------- | --------------------- | --------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `sessions`                     | `cash_handover`                                      | `cash_handover_fils`                                                | `INTEGER` | yes                   | yes             | session handover cash total can diverge from transactions until P0-003 live authority | Safe for local/staging draft; production requires backend total reconciliation. |
| `sessions`                     | `bank_transfer_total`                                | `bank_transfer_total_fils`                                          | `INTEGER` | yes                   | yes             | bank total must match accepted bank rows and count                                    | Safe for local/staging draft; production requires P0-003.                       |
| `sessions`                     | `gross_received`                                     | `gross_received_fils`                                               | `INTEGER` | yes                   | yes             | gross can be overstated if frontend totals are trusted                                | Safe for local/staging draft; production requires backend authority only.       |
| `transactions`                 | `amount`                                             | `amount_fils`                                                       | `INTEGER` | yes                   | yes             | main entry amount is a live financial authority path                                  | Needs staged rehearsal before any production write-path change.                 |
| `transactions`                 | `due`                                                | `due_fils`                                                          | `INTEGER` | yes                   | yes             | due can become receivable source; current model is not final                          | Blocked for production until P0-008 receivables decision.                       |
| `transactions`                 | `paid`                                               | `paid_fils`                                                         | `INTEGER` | yes                   | yes             | paid must reconcile with accepted payment rows                                        | Needs P0-003 backend total comparison.                                          |
| `transactions`                 | `deficit`                                            | `deficit_fils`                                                      | `INTEGER` | yes                   | yes             | deficit should be derived, not manually trusted                                       | Production needs receivables rule and backend recompute.                        |
| `transactions`                 | `dep_due` / `dep_paid` / `dep_def`                   | `dep_due_fils` / `dep_paid_fils` / `dep_def_fils`                   | `INTEGER` | yes                   | yes             | deposit liability cannot be treated as ordinary rent income                           | Requires accountant review before production migration.                         |
| `transactions`                 | `list_price` / `period_due`                          | `list_price_fils` / `period_due_fils`                               | `INTEGER` | yes                   | yes             | rent config effective date not fully modeled                                          | Production blocked until rent config effective-date policy is approved.         |
| `transactions`                 | `excess`                                             | `excess_fils`                                                       | `INTEGER` | yes                   | yes             | excess allocation needs receivable/payment allocation model                           | Production blocked until P0-008.                                                |
| `transactions`                 | `deposit_held` / `deposit_amt` / `deposit_deduction` | `deposit_held_fils` / `deposit_amt_fils` / `deposit_deduction_fils` | `INTEGER` | yes                   | yes             | deposit movements must tie to liability ledger                                        | Production requires ledger reconciliation.                                      |
| `transactions`                 | `promise_amount`                                     | `promise_amount_fils`                                               | `INTEGER` | yes                   | yes             | promise is a follow-up anchor, not payment authority                                  | Keep nullable; reconcile with arrear tasks.                                     |
| `deposit_ledger`               | `amount`                                             | `amount_fils`                                                       | `INTEGER` | yes                   | yes             | deposit liability must not be lost or rounded                                         | Safe for local/staging; production requires running balance reconciliation.     |
| `deposit_ledger`               | `delta`                                              | `delta_fils`                                                        | `INTEGER` | yes                   | yes             | negative delta must be explicit for refund/adjustment                                 | Safe only with explicit negative allowance.                                     |
| `deposit_ledger`               | `balance_after`                                      | `balance_after_fils`                                                | `INTEGER` | yes                   | yes             | liability balance mismatch is accounting-critical                                     | Production requires zero-delta reconciliation.                                  |
| `arrears`                      | `remain`                                             | `remain_fils`                                                       | `INTEGER` | yes                   | yes             | arrears are not yet formal receivables                                                | Production blocked until P0-008 receivables.                                    |
| `arrear_tasks`                 | `arrear_amount`                                      | `arrear_amount_fils`                                                | `INTEGER` | yes                   | yes             | task amount can drift from source receivable                                          | Requires receivable/payment allocation source-of-truth.                         |
| `arrear_tasks`                 | `promise_amount`                                     | `promise_amount_fils`                                               | `INTEGER` | yes                   | yes             | promise amount should not count as paid                                               | Keep as follow-up anchor only.                                                  |
| `arrear_tasks`                 | `actual_received`                                    | `actual_received_fils`                                              | `INTEGER` | yes                   | yes             | repayment must be allocated to receivable/payment rows                                | Production blocked until allocation model.                                      |
| `handover_commits`             | staging backend totals                               | already `*_fils`                                                    | `INTEGER` | no for backend totals | no              | staging-only table, not live accounting source                                        | Safe for local/staging; do not treat as production table yet.                   |
| `handover_commit_rows`         | staging row amount                                   | already `amount_fils`                                               | `INTEGER` | no                    | no              | staging-only accepted/rejected row evidence                                           | Safe for local/staging; production requires tenant and receivables review.      |
| `app_settings` / `rent_config` | JSON rent values                                     | none proposed                                                       | n/a       | n/a                   | yes             | JSON numeric rent config can keep legacy decimal/Number semantics                     | Needs a separate effective-dated rent config migration, not this draft.         |
| history / dashboard read model | derived totals                                       | none proposed                                                       | n/a       | n/a                   | yes             | read models can keep using legacy decimals after write migration                      | Needs P0-003 live backend totals switch and reconciliation gate.                |
| refund / adjustment            | mixed transaction/deposit fields                     | partial through existing fields                                     | `INTEGER` | yes                   | yes             | negative/adjustment semantics need explicit field-level policy                        | Needs human accounting approval before production.                              |

## Draft Checks

| Check                                              | Result  | Notes                                                                                                |
| -------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| All proposed money authority columns are `INTEGER` | PASS    | All `*_fils` fields in the draft use `INTEGER`.                                                      |
| Legacy decimal/REAL fields are preserved           | PASS    | Draft only adds nullable companion fields.                                                           |
| Old fields are deleted or renamed                  | PASS    | No deletion or rename in the draft.                                                                  |
| Production-ready idempotency                       | WARNING | SQLite `ALTER TABLE ADD COLUMN` is not fully idempotent without a column-existence migration runner. |
| Backfill covered                                   | WARNING | Backfill is not included; reconciliation must precede any backfill.                                  |
| Dashboard/read model covered                       | WARNING | No read-model switch in this migration. Correct for P0-001D gate, but production remains blocked.    |
| Rent config covered                                | WARNING | `app_settings` JSON / rent config needs a separate design.                                           |
| Tenant scope covered                               | WARNING | Existing legacy tables use `corpid`; production SaaS scope depends on P0-006.                        |

## Conclusion

### Safe For Local/Staging Draft

- Nullable `*_fils INTEGER` additions beside legacy fields.
- Rehearsal-only generation of dual-write patches.
- Read-only reconciliation scripts that compare legacy decimal-derived fils to stored `*_fils`.

### Needs Revision Before Staging

- Add an idempotent migration runner or explicit column-existence checks before applying the draft repeatedly.
- Decide whether staging should add all proposed fields or only a smaller first slice.
- Add a dry-run reconciliation report before any local/staging backfill.

### Needs Human Approval Before Production

- All production schema execution.
- Any backfill from legacy decimal fields.
- Any dashboard/history reader switch to `*_fils`.
- Any arrears/receivables conversion.
- Any tenant/company/property scope migration.

### Blocked Until Other P0 Work

- Production dashboard authority depends on P0-003.
- Production arrears/short-pay migration depends on P0-008.
- Production SaaS multi-tenant rollout depends on P0-006.
- Production deploy artifact consistency may depend on P1-006 embedded Worker drift control.
