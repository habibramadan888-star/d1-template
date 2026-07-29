# Backend Totals Edge Case Report

Scope: P0-003B test coverage. These cases are covered by `tests/backend-totals-authority.spec.mjs` and supporting fixtures. No live API, dashboard, handover flow, database schema, production Worker, or production D1 was changed.

| Edge Case                                  | Coverage                                                                 | Result                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `0.01 AED` many-row accumulation           | `integer fils addition avoids floating point drift for small decimals`   | 100 rows of `0.01` sum to `1.00` AED with integer fils.                              |
| `0.10 + 0.20`                              | `integer fils addition avoids floating point drift for small decimals`   | JavaScript float drift is shown and integer-fils sum returns `0.30`.                 |
| `999999.99` large amount                   | `large amounts, strings, and explicit number input behavior are covered` | Parses without losing precision.                                                     |
| `100.999` illegal 3-decimal amount         | `invalid-decimal-3dp.json`                                               | Structured error; not silently rounded.                                              |
| string money input                         | Multiple fixtures                                                        | Accepted only when exact AED decimal string.                                         |
| numeric legacy money input                 | `legacy numeric decimal can be converted but carries a warning`          | Converted for compatibility with `LEGACY_NUMBER_AMOUNT` warning.                     |
| `null` / empty amount                      | `empty-and-null-amounts.json`                                            | Structured errors.                                                                   |
| `NaN` / `Infinity`                         | direct test                                                              | Structured errors.                                                                   |
| negative refund/adjustment row             | `negative-refund-or-adjustment.json`                                     | Not silently treated as active total; requires future approved adjustment model.     |
| voided + non-voided mixed rows             | `voided-records.json`                                                    | Active totals exclude voided rows; audit mode can include them.                      |
| duplicate submit risk                      | `duplicate-submit-risk.json`                                             | Backend recompute exposes duplicate row impact; P0-002 must prevent duplicate write. |
| missing payment method                     | covered by normalization error path                                      | Unsupported/missing payment method is a structured row error.                        |
| cash / bank case differences               | fixtures use `C`, `B`, `BANK`, `cash`                                    | Aliases normalize successfully.                                                      |
| old data field gaps                        | amount null/empty fixture                                                | Invalid active money values are not coerced to zero.                                 |
| deposit ledger vs transaction mismatch     | Not a live reconciliation in P0-003B                                     | Must be covered in P0-001E/P0-008 after formal deposit liability model.              |
| arrears row missing but transaction exists | `arrears-partial-payment.json` separates paid vs outstanding             | P0-008 receivable model still required for final authority.                          |
| session void vs transaction void mismatch  | `voided-records.json` covers transaction-level void exclusion            | Full cross-table void consistency should be part of P0-004/P0-003C regression.       |
| dashboard month boundary                   | Not changed in P0-003B                                                   | Depends on P1-004 Dubai business date wiring and dashboard KPI definition.           |

## Conclusion

P0-003B covers the high-risk backend total arithmetic and discrepancy-detection edge cases, but it intentionally does not claim production authority. The remaining production switch depends on P0-001C minor-unit writes, P0-002 atomic handover, P0-008 receivables, and staging reconciliation.
