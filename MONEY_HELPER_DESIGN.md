# Money Helper Design

Generated: 2026-05-24, Asia/Dubai

Implementation file: `modules/finance/money.mjs`

Scope: P0-001A guardrail only. Existing live Worker write paths are not rewired in this task.

## Design Goals

- Represent AED amounts as integer fils using `bigint`.
- Reject JavaScript floating point input as accounting authority.
- Keep existing helper callers compatible.
- Provide explicit APIs needed for later migration phases.
- Allow negative values only when the caller explicitly declares refund/adjustment behavior.

## Helper API

| Function                          | Purpose                                           | Current Behavior                                                                                                          |
| --------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `parseAedToFils(value, options)`  | Parse AED display/input string into integer fils  | Accepts valid strings like `"100.50"` and `"1,234.56"`; rejects floats, empty strings, NaN, Infinity, and three decimals. |
| `filsToAedString(fils)`           | Format integer fils into two-decimal AED string   | Alias of `formatFilsAsAed`; returns strings like `"100.50"`.                                                              |
| `addFils(a, b)` / `addFils([..])` | Add integer fils values                           | Supports new variadic usage and old array usage.                                                                          |
| `subtractFils(a, b)`              | Subtract integer fils values                      | BigInt-only.                                                                                                              |
| `assertValidFils(value, options)` | Validate a fils value and negative policy         | Rejects non-BigInt and negative values unless `allowNegative` is true.                                                    |
| `normalizeMoneyInput(value)`      | Normalize supported money strings before parsing  | Keeps plain decimals; strips valid thousands grouping; rejects malformed grouping.                                        |
| `compareFils(a, b)`               | Compare two fils values                           | Returns `-1`, `0`, or `1`.                                                                                                |
| `toSafeSqlInteger(fils)`          | Convert BigInt fils to D1-safe JS integer binding | Rejects values outside JS safe integer range.                                                                             |

## Non-Invasive Boundary

The helper is not wired into live `deploy-worker/src/index.js` money write paths in P0-001A. That is intentional. Rewiring live accounting paths requires dual-write fields, migration planning, and reconciliation gates.

## Current Tests

- Existing: `tests/finance-money.spec.mjs`
- New P0-001A guardrail: `tests/money.spec.mjs`

The new guardrail covers:

- floating point authority rejection;
- `"100.50"`, `"100"`, `"0.01"`, and `"999999.99"` conversion;
- three decimals, NaN, Infinity, empty string, non-numeric string rejection;
- negative default rejection and explicit refund/adjustment allowance;
- fixed two-decimal formatting;
- integer-only add/subtract/compare;
- explicit valid thousands grouping support and malformed grouping rejection.

## Future Integration

| Phase   | Integration                                                      |
| ------- | ---------------------------------------------------------------- |
| P0-001B | Use helper for new backend validation and low-risk parse points. |
| P0-001C | Dual-write legacy decimal and `*_fils` integer columns.          |
| P0-001D | Prefer `*_fils` for backend summaries with legacy fallback.      |
| P0-001E | Reconcile legacy decimals against integer-fils derivations.      |
