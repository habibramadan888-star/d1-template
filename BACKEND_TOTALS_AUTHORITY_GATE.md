# Backend Totals Authority Gate

Scope: future gate for switching backend totals from rehearsal/shadow mode to live production authority. This gate is not satisfied by P0-003B because live Worker and dashboard outputs remain unchanged.

## Required Tests Before Switching

1. `npm run check`
2. `npm run smoke:with-worker`
3. `npm run verify:clean-d1`
4. `npm run test:delete-session`
5. `npm run test:money`
6. `npm run audit:money`
7. `npm run test:backend-totals`
8. `npm run rehearse:backend-totals`
9. Authenticated owner dashboard regression test
10. Authenticated employee handover regression test

## Required Rehearsals

| Rehearsal                               | Required Result                                                         |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Local clean D1 backend totals rehearsal | All expected scenarios pass, no invalid active amount.                  |
| Staging D1 read-only comparison         | Current displayed totals and backend recompute deltas are reviewed.     |
| Voided record rehearsal                 | Active totals exclude voided rows; audit include mode can display them. |
| Tampered frontend total rehearsal       | Backend discrepancy report detects mismatch.                            |
| Legacy money reconciliation             | Legacy decimal values parse exactly or are listed as exceptions.        |

## Delta Rules

| Delta Type                 | Rule                                                                  |
| -------------------------- | --------------------------------------------------------------------- |
| `cash_handover`            | Must be `0 fils` before switching active display.                     |
| `bank_transfer_total`      | Must be `0 fils` before switching active display.                     |
| `gross_received`           | Must be `0 fils` before switching active display.                     |
| `bank_transfer_count`      | Must match exactly.                                                   |
| `dashboard monthly income` | Must match approved accounting definition, not old UI accident.       |
| `arrears outstanding`      | Cannot become final authority until P0-008 receivables model is live. |

## Warnings

Accepted before switch:

- Legacy decimal values that parse exactly into fils.
- Voided rows excluded from active totals but visible in audit mode.
- Historical sessions with missing frontend totals if backend row totals are complete.

Not accepted before switch:

- Three-decimal money values.
- `NaN`, `Infinity`, empty, or null active money values.
- Negative active transaction amounts without approved adjustment model.
- Submitted frontend totals that differ from backend recompute.
- Missing payment method or unsupported category in active financial rows.
- Session and transaction void state mismatch.

## Migration And API Requirements

| Area              | Requirement                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Money             | P0-001C dual-write or equivalent backend-safe money authority must exist before production switch. |
| Employee handover | P0-002 atomic commit must recompute totals backend-side.                                           |
| Dashboard         | Owner dashboard must consume backend totals, not local browser reductions.                         |
| Receivables       | P0-008 must own arrears/outstanding totals before overdue KPIs are final.                          |
| Audit             | Discrepancy and switch events must be audit logged.                                                |
| UI                | UI should show backend totals only after backend response is authoritative.                        |

## Staging And Human Approval

1. Run read-only comparison against staging D1 copy.
2. Export discrepancy report.
3. Accountant reviews all non-zero deltas and legacy warnings.
4. Product owner confirms KPI definitions: gross received, operating income, deposit liability, and arrears outstanding.
5. Engineering verifies rollback can return dashboard to legacy totals.
6. Only then enable backend totals authority in staging.
7. Production switch requires a separate approval and deployment checklist.

## Rollback

- Keep frontend legacy display code until backend totals have been observed in staging.
- Use feature flag or route versioning for backend totals response.
- If mismatch appears in production, disable backend totals display and preserve discrepancy report for audit.
