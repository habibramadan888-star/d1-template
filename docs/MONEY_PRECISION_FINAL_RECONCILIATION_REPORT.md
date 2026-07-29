# Money Precision Final Reconciliation Report

Generated: 2026-05-29
Scope: static audit only. No D1 write, no migration, no deploy, no formula change.

## Current Evidence

| Area | Evidence | Current State | Risk |
|---|---|---|---|
| Legacy employee schema | `migrations/001_employee_anchor_schema.sql` uses `arrear_amount REAL` and `promise_amount REAL`. | Decimal AED values still exist in legacy tables. | HIGH |
| Local legacy bootstrap | `migrations/local/001_clean_legacy_bootstrap.sql` uses `REAL` for `cash_handover`, `bank_transfer_total`, `amount`, `list_price`, `promise_amount`. | Legacy live-compatible storage is not purely integer fils. | CRITICAL |
| Staging handover schema | `migrations/local/002_handover_atomic_staging.sql` uses `*_fils INTEGER` for backend and frontend handover totals. | New staging path has integer-fils design. | LOW for staging only |
| Worker legacy entry path | `deploy-worker/src/index.js` parses entry amounts with `Number(...)`, `cleanMoney(...)`, and decimal comparisons. | Legacy entry and arrears paths are decimal based. | HIGH |
| Worker staging handover path | `deploy-worker/src/index.js` has `hscParseAedToFils`, `BigInt` totals, and `hscFilsToSafeInteger`. | Staging handover totals are integer arithmetic. | LOW for that route |

## Precision Round-Trip Requirements

| Case | Input AED | Required Stored Fils | Required API Fils | Required Display | Current Approval |
|---|---:|---:|---:|---|---|
| Standard decimal | 150.50 | 15050 | 15050 | AED 150.50 | NOT APPROVED |
| Smallest unit | 0.01 | 1 | 1 | AED 0.01 | NOT APPROVED |
| Large amount | 1000000.99 | 100000099 | 100000099 | AED 1,000,000.99 | NOT APPROVED |

## Findings

- The repository contains a correct integer-fils pattern in the staging handover path.
- The legacy/live-compatible employee and arrears paths still use decimal `REAL` fields and `Number` arithmetic.
- Therefore, system-wide money authority cannot be signed off as integer-fils-only.
- No financial formula was changed during this audit.

## Decision

| Item | Result |
|---|---|
| All money storage integer fils | No |
| All backend calculations integer-only | No |
| Staging handover integer-fils ready | Yes, for staging path only |
| Live production money precision sign-off | No |
| Production cutover | PRODUCTION_NO_GO |

## Exit Criteria Before Sign-Off

- Convert or isolate all live financial storage that uses decimal `REAL`.
- Prove all live money mutations accept, store, compute, and return integer fils.
- Keep frontend display-only for totals; backend must be calculation authority.
- Run read-only reconciliation against production-copy data before any write QA.
