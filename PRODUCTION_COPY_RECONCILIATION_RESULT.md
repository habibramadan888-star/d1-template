# Production Copy Reconciliation Result

Date: 2026-05-27, Asia/Dubai

Target D1: `homelink-finance-production-copy-dryrun`

Conclusion: `MANUAL_REQUIRED`

| Area                            | Result             | Evidence                                                                                                     | Notes                                                                                                              |
| ------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Money reconciliation            | MANUAL_REQUIRED    | 232 legacy transaction rows have decimal money fields; 0 inspected transaction `*_fils` fields are populated | Schema columns exist, but accounting conversion/backfill is not approved.                                          |
| Backend totals                  | PASS_WITH_WARNINGS | Legacy active transaction aggregate query succeeded                                                          | Backend totals can be compared from copy data, but cannot become authority until money/receivables blockers close. |
| Receivables                     | MANUAL_REQUIRED    | 6 legacy arrears rows, legacy remain total 860, 0 receivables rows                                           | Receivables schema exists but data backfill/allocation rules are not approved.                                     |
| Tenant/property scope           | MANUAL_REQUIRED    | Scope columns exist; inspected scoped legacy row count is 0                                                  | Exact production tenant/property mapping is not approved.                                                          |
| Audit/event scope               | MANUAL_REQUIRED    | 108 audit logs and 8 entry events inspected; scoped rows are 0                                               | Scope fields exist, but audit/event policy and row mapping need approval.                                          |
| Legacy CORPID warnings          | MANUAL_REQUIRED    | Legacy `corpid` remains present and preserved                                                                | `corpid` remains compatibility fallback only, not SaaS authority.                                                  |
| TOP_25 money risks intersection | MANUAL_REQUIRED    | Money `*_fils` backfill not executed                                                                         | TOP_25 money risks still need accounting signoff before production migration.                                      |

Status definitions:

- `PASS`: no blocker found for the dry-run area.
- `PASS_WITH_WARNINGS`: dry-run succeeded but cannot approve production authority.
- `MANUAL_REQUIRED`: human accounting/business/engineering review is still required.
- `FAIL`: dry-run found a deterministic failure.
- `BLOCKED`: dry-run could not run safely.

Final decision: production-copy schema dry-run passed, but overall reconciliation remains `MANUAL_REQUIRED`. Production cutover remains `PRODUCTION_NO_GO`.
