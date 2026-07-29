# Money Precision Policy

Generated: 2026-05-24, Asia/Dubai

This policy defines the commercial target for AED accounting precision. P0-001A establishes the policy and guardrails only; it does not migrate live production data or change current business results.

## Core Rules

1. AED commercial amounts must use integer minor units: fils.
2. `100.50 AED = 10050 fils`; `0.01 AED = 1 fils`.
3. JavaScript floating point values and D1 `REAL` are not accounting authority.
4. Frontend may collect and display money but must not be the source of accounting truth.
5. Backend must parse, validate, normalize, and store authoritative amounts.
6. Internal APIs should prefer integer minor units for new paths.
7. UI responses may include formatted AED decimal strings for display.
8. Summary totals must be recomputed server-side from accepted database records.
9. Every financial mutation must be auditable with actor, time, source, and reason.
10. Void must preserve original rows and create audit evidence; it must not delete money rows.
11. During migration, legacy fields need fallback plus reconciliation, not silent overwrite.
12. New financial writes should move toward dual-write `*_fils` columns before legacy fields are retired.

## Input Rules

| Case                       | Rule                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `"100.50"`                 | Valid, parse to `10050n`.                                                            |
| `"100"`                    | Valid, parse to `10000n`.                                                            |
| `"0.01"`                   | Valid, parse to `1n`.                                                                |
| `"0.001"` / three decimals | Reject.                                                                              |
| Empty string               | Reject.                                                                              |
| `NaN` / `Infinity`         | Reject.                                                                              |
| Non-string numeric input   | Reject for accounting authority.                                                     |
| Negative amount            | Reject by default. Allow only with explicit refund/adjustment option and reason.     |
| Thousand grouping          | Supported only for valid grouping like `"1,234.56"`; malformed grouping is rejected. |
| Rounding                   | Do not round silently. Reject ambiguous input before storage.                        |
| Large values               | Accept only if they fit safe D1 integer binding; otherwise reject.                   |

## Test Coverage Required

- `0.1 + 0.2` cannot be authority.
- AED string to fils conversion.
- Fixed two-decimal display formatting.
- Rounding and three-decimal rejection.
- Negative amount default rejection and explicit refund/adjustment allowance.
- Empty, non-numeric, NaN, Infinity rejection.
- Large value handling.
- Integer-only add/subtract/compare.

## Execution Phases

| Rule Group                | When                 | Notes                                                                                    |
| ------------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| Helper and tests          | Immediate in P0-001A | Non-invasive helper/API guardrail only.                                                  |
| New input normalization   | P0-001B              | Start with low-risk backend validation paths; do not change accounting results silently. |
| Dual-write integer fils   | P0-001C              | Add `*_fils` columns while preserving legacy decimal fields. Requires migration review.  |
| Backend summary authority | P0-003 dependency    | Handover/dashboard totals must be recomputed backend-side from accepted rows.            |
| Receivable lifecycle      | P0-008 dependency    | Rent due, tail amount, arrears, and repayment need formal receivables/payments.          |
| Reconciliation            | P0-001E              | Compare legacy decimal values to fils-derived values before production migration.        |
| Production migration      | P0-001F              | Human-approved, staged, reversible; not executed automatically.                          |

## Current P0-001A Boundary

P0-001 remains Partial after this task. The current live Worker and legacy migrations still contain `REAL` and JS `Number` usage. This task adds visibility and test guardrails, not a completed commercial migration.
