# P0-003C Backend Totals Live Authority Gate

Generated: 2026-05-25T03:42:25+04:00

Scope: gate for moving backend totals from rehearsal/shadow calculation toward live authority. This gate does not switch dashboard output, does not modify live financial formulas, and does not write database rows.

## Current Authority Position

| Total                    | Current Capability                                                             | Live Authority Status | Dependency                                                 | Recommendation                                      |
| ------------------------ | ------------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------- | --------------------------------------------------- |
| Cash total               | Backend rehearsal can recompute from accepted transaction rows in integer fils | Not live              | P0-001 minor-unit write/reconciliation, staging comparison | Continue shadow compare; do not switch live display |
| Bank transfer total      | Backend rehearsal can recompute bank rows and count                            | Not live              | Staging comparison, accepted payment method taxonomy       | Continue shadow compare                             |
| Gross received           | Backend rehearsal can recompute cash + bank inflows                            | Not live              | KPI definition review: gross vs operating income           | Human accounting approval required                  |
| Rent received            | Backend can classify rent rows in test fixtures                                | Not live              | Live category normalization and legacy data review         | Keep as rehearsal                                   |
| Deposit received         | Backend can keep deposit separate from rent/gross fixtures                     | Not live              | Deposit liability policy and ledger reconciliation         | Human accounting approval required                  |
| Arrears paid             | Backend can classify arrears payments in fixtures                              | Not final             | P0-008 receivables/payment allocation                      | Do not make final authority before receivables      |
| Arrears outstanding      | Legacy tasks can be read, future authority is receivables                      | Not final             | P0-008 receivables                                         | Block production authority                          |
| Refund/outflow           | Backend helper can handle explicit refund/adjustment scenarios                 | Not live              | Approved outflow taxonomy                                  | Human approval required                             |
| Handover gross total     | P0-002 staging endpoint recomputes totals in rehearsal                         | Not live production   | P0-002 production cutover and staging QA                   | Keep staging/local only                             |
| Dashboard monthly income | Rehearsal can compute synthetic dashboard totals                               | Not live              | P0-001/P0-003/P0-008/P0-006                                | Do not switch dashboard                             |
| History row amount       | History preserves legacy rows and active filters                               | Display only          | Minor-unit dual-write/backfill                             | Do not treat UI history as authority                |

## What Is Ready

- `modules/finance/backend-totals.mjs` can recompute core totals from rows.
- `tests/backend-totals-authority.spec.mjs` covers cash, bank, gross, deposit, arrears, voided rows, tampering, invalid money, and multi-session dashboard fixtures.
- `scripts/rehearse-backend-totals-authority.mjs` produces local-only discrepancy evidence.
- Frontend submitted totals are treated as comparison input, not authority.
- Voided rows are excluded from active totals by default.

## What Is Not Ready

- Owner dashboard is not live-switched to backend authority.
- Production/staging D1 read-only comparison has not been executed.
- `gate:money-reconciliation` remains `MANUAL_REQUIRED`.
- P0-008 receivables is not implemented, so overdue/arrears cannot be final authority.
- P0-006 tenant/property scope is not implemented, so SaaS shared-data authority is not ready.
- TOP_25 money risks still require human review.

## API Switch Boundary

| API / Area        | Safe Next Step                                      | Forbidden Step                                          |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Owner dashboard   | Add staging/local shadow compare endpoint or report | Replacing dashboard live totals automatically           |
| Employee handover | Continue P0-002 staging endpoint validation         | Production handover cutover                             |
| Employee entry    | Continue adapter/staging QA and reconciliation      | Treating frontend totals as authority                   |
| History           | Compare backend recompute against legacy rows       | Rewriting history display totals without reconciliation |
| Arrears           | Design receivables authority                        | Treating legacy arrear task totals as final             |

## Gate Conclusion

P0-003 status: `Partial - backend totals live authority gate ready`.

GO for staging/local shadow comparison: yes.

NO-GO for live dashboard authority switch: yes.

Production cutover remains blocked until P0-001 reconciliation, P0-008 receivables, P0-006 scope, and human accounting review are complete.
