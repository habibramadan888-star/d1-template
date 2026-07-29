# Ramadan TOP 5 Money Decisions

Date: 2026-05-27, Asia/Dubai

Scope: human decision support only. This file does not approve production.

## Decision 1: False-Positive Candidates

## What this means

Ranks 1, 19, and 22 look like non-money scan hits: lock sorting, Dubai date
formatting, and pagination page count.

## Why it matters

Closing these reduces noise in the TOP_25 list without changing money behavior.

## Evidence already available

- `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md`
- `RAMADAN_TOP_25_MONEY_RISK_DECISION_SHEET.md`

## Risk if approved

Low, if Ramadan agrees these are not money authority. Approval only closes them
as false positives.

## Risk if not approved

They stay open and may require scanner/risk-rule remediation.

## Suggested safe decision

`FALSE_POSITIVE` for ranks 1, 19, and 22 if Ramadan agrees they are non-money.

## What Codex should do next after Ramadan decides

Update the TOP_25 tracker rows only. Do not approve production.

## Decision 2: Legacy AED-to-Fils Conversion Path

## What this means

Legacy decimal/number money fields must be converted to integer fils before
they can become accounting authority.

## Why it matters

Production migration can change financial records if conversion, warnings, row
counts, or rollback are wrong.

## Evidence already available

- `MONEY_PRECISION_POLICY.md`
- `MONEY_RECONCILIATION_GATE_RESULT.md`
- `TOP_25_MONEY_RISKS_REVIEW_MATRIX.md`

## Risk if approved

Approval allows production preflight planning to proceed, but still does not
authorize production migration.

## Risk if not approved

Production money migration remains blocked until conversion rules are changed or
data is cleaned.

## Suggested safe decision

`NEEDS_ACCOUNTING_DECISION` until Ramadan accepts exact conversion, warning, and
rollback rules.

## What Codex should do next after Ramadan decides

Update SO-006/SO-007 evidence and prepare the next preflight or remediation
prompt.

## Decision 3: Backend / Session Totals Authority

## What this means

Session totals such as cash handover, bank transfer total, and gross received
can only become authority after backend recomputation and reconciliation are
accepted.

## Why it matters

Dashboard and handover totals affect operational income views.

## Evidence already available

- `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`
- `STAGING_BACKEND_TOTALS_COMPARISON_RESULT.md`
- TOP_25 ranks 2-4

## Risk if approved

Backend totals can move toward production preflight, but live dashboard switch
still needs explicit approval.

## Risk if not approved

Dashboard/history/backend totals authority remains NO-GO.

## Suggested safe decision

`NEEDS_ACCOUNTING_DECISION` until Ramadan accepts production row counts and
rollback.

## What Codex should do next after Ramadan decides

Update backend totals signoff status and keep production cutover blocked unless
all other signoffs close.

## Decision 4: Deposit Liability / Refund Handling

## What this means

Deposits, deductions, refunds, ledger amounts, deltas, and balances must stay
separate from rent income unless explicitly approved.

## Why it matters

Deposit money is liability-sensitive and can distort income or outstanding rent
if mixed incorrectly.

## Evidence already available

- `BACKEND_TOTALS_SOURCE_OF_TRUTH.md`
- `RECEIVABLES_SOURCE_OF_TRUTH.md`
- `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md`
- TOP_25 ranks 8-11, 16-18, 23-24

## Risk if approved

Production preflight can include deposit ledger conversion with explicit
reconciliation and rollback.

## Risk if not approved

Deposit ledger migration and any dashboard authority using deposit values remain
blocked.

## Suggested safe decision

`NEEDS_ACCOUNTING_DECISION` until deposit/refund semantics are explicitly
accepted.

## What Codex should do next after Ramadan decides

Update deposit-related money risk rows and production signoff notes only.

## Decision 5: Receivables Lifecycle / Allocation Semantics

## What this means

Receivables, arrears, repayments, short-pay, overpayment, voids, credits, and
debits need accepted lifecycle and allocation rules.

## Why it matters

This controls due, overdue, outstanding, arrears paid, and arrears outstanding.

## Evidence already available

- `RECEIVABLES_SOURCE_OF_TRUTH.md`
- `STAGING_RECEIVABLES_SHADOW_COMPARISON_RESULT.md`
- TOP_25 ranks 6-7, 12-15, 25

## Risk if approved

Receivables can proceed to production preflight review, but not production
authority or cutover by itself.

## Risk if not approved

P0-008 remains Partial and production receivables authority stays NO-GO.

## Suggested safe decision

`NEEDS_ACCOUNTING_DECISION` until Ramadan accepts lifecycle/allocation behavior.

## What Codex should do next after Ramadan decides

Update SO-010/SO-011 and decide whether to prepare remediation or production
preflight documentation.
