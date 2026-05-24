# Money Live Write Switch Test Plan

Generated: 2026-05-24, Asia/Dubai

Scope: test plan for later P0-001G and beyond. No live switch is performed by this document.

## Required Test Groups

| Group                        | Purpose                                                                             | Required Before           |
| ---------------------------- | ----------------------------------------------------------------------------------- | ------------------------- |
| Adapter unit tests           | Prove legacy inputs can produce exact `*_fils` patches without writing DB.          | P0-001G                   |
| Local/staging D1 rehearsal   | Apply draft columns and write adapter output in isolated D1 only.                   | P0-001G/P0-001H           |
| Legacy/fils reconciliation   | Prove legacy decimal-derived fils and stored `*_fils` have 0 fils delta.            | Any read or write cutover |
| Backend totals comparison    | Prove totals computed from `*_fils` match backend source-of-truth.                  | Dashboard/history cutover |
| Live route shadow comparison | Compare current live route result to adapter result without changing response.      | Any route switch          |
| Void compatibility           | Ensure voided rows are excluded from active totals and included only in audit mode. | Any active report switch  |
| Secret/config safety         | Confirm no production deploy, no remote D1 migration, no secret commit.             | Every phase               |

## P0-001G Proposed Test Cases

| ID      | Flow                        | Input                                                               | Expected Result                                                                                                 |
| ------- | --------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| MWS-001 | Employee rent full payment  | `type=R`, `amount=770.00`, `due=770.00`, `cycle=1M`                 | Adapter returns `amount_fils=77000`, `due_fils=77000`, `paid_fils=77000`, `deficit_fils=0`.                     |
| MWS-002 | Employee rent short payment | `amount=80.00`, `period_due=770.00`, arrear promise anchors present | Adapter returns transaction `*_fils` and arrear task `arrear_amount_fils=69000`; no live DB write.              |
| MWS-003 | Deposit collection          | `type=D`, `amount=200.00`                                           | Adapter returns transaction amount and deposit ledger `amount_fils=20000`, `delta_fils=20000`.                  |
| MWS-004 | Deposit refund              | `type=DR`, `amount=100.00`                                          | Adapter allows explicit negative ledger `delta_fils=-10000`; transaction amount remains positive display value. |
| MWS-005 | Checkout deduction          | `type=CO`, `deposit_deduction=40.00`                                | Adapter creates explicit ledger deduction patch and audit plan.                                                 |
| MWS-006 | Arrears payment             | `type=AP`, linked open task                                         | Adapter computes `paid_fils`, `actual_received_fils`, and remaining balance without float math.                 |
| MWS-007 | Three-decimal input         | `amount=100.999`                                                    | Structured rejection; no patch.                                                                                 |
| MWS-008 | Empty money input           | `amount=""` for required field                                      | Structured rejection; no patch.                                                                                 |
| MWS-009 | Legacy number input         | `amount=770` from old code                                          | Patch allowed only with `LEGACY_NUMBER_SOURCE` warning.                                                         |
| MWS-010 | Voided row                  | row with `voided_at`                                                | Excluded from active reconciliation; included only in audit reconciliation.                                     |
| MWS-011 | Manager save session        | batch entries from `/api/save_session`                              | Adapter can parse entries, but live switch remains blocked pending manager path decision.                       |
| MWS-012 | Rent config JSON            | rent map values                                                     | Test documents conversion need; no production config rewrite.                                                   |

## Regression Commands

Minimum commands for a later local/staging switch rehearsal:

```powershell
npm run check
npm run audit:money-live-writes
npm run test:money
npm run test:money-dual-write
npm run test:money-dual-write-local-staging
npm run rehearse:money-dual-write-local-staging
npm run test:backend-totals
npm run rehearse:backend-totals
npm run test:handover-staging-endpoint
npm run verify:dashboard-unchanged
npm run verify:handover-legacy-unchanged
npm run security:secrets
```

## Acceptance Criteria For Any Live Switch

| Criterion      | Requirement                                                                         |
| -------------- | ----------------------------------------------------------------------------------- |
| Delta          | Legacy-to-fils reconciliation must be 0 fils for active rows.                       |
| Invalid values | Three decimals, NaN, Infinity, empty required fields, unsafe negatives fail closed. |
| Authority      | Frontend totals are comparison inputs only.                                         |
| Voids          | Active totals exclude voided rows by default.                                       |
| Audit          | Every financial mutation has audit evidence.                                        |
| Rollback       | Legacy fields remain available and unchanged during compatibility period.           |
| Approval       | Production migration and live route switch require human approval.                  |
