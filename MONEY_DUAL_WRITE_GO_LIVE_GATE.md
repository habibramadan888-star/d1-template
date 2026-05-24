# Money Dual-Write Go-Live Gate

Generated: 2026-05-24, Asia/Dubai

P0-001 cannot be marked Verified until this gate is satisfied in staging and approved by a human reviewer.

## GO Conditions

| Condition                            | Required Evidence                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Migration reviewed                   | Approved executable migration derived from `migration-drafts/005_money_minor_units_dual_write_draft.sql`. |
| Backup and rollback rehearsed        | Staging D1 export, rollback SQL, and restore drill documented.                                            |
| Dual-write tests pass                | `npm run test:money-dual-write` and full regression suite pass.                                           |
| Rehearsal passes                     | `npm run rehearse:money-dual-write` identifies no unhandled invalid legacy values.                        |
| Backend totals gate ready            | P0-003 live authority gate approved or staged.                                                            |
| Handover atomicity gate ready        | P0-002 staging/manual validation completed and reviewed.                                                  |
| Receivables impact reviewed          | Arrears fields have explicit compatibility plan with P0-008.                                              |
| Tenant scope reviewed                | Migration does not create cross-tenant exposure.                                                          |
| Reconciliation report ready          | Legacy decimal-derived fils compared with stored `*_fils`.                                                |
| Production disabled during rehearsal | No production or remote D1 operation executed by test scripts.                                            |

## NO-GO Conditions

| Condition                                                    | Reason                                                    |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| Any production migration is needed before approval           | This task is preparation only.                            |
| Legacy/fils mismatches lack owner/accountant review          | Auto-correction would be unsafe.                          |
| Dashboard would change visible totals without reconciliation | Could create accounting disputes.                         |
| Employee live flow must be switched to proceed               | That belongs to later staged rollout.                     |
| Receivables model remains undecided for arrears authority    | Arrear tasks are operational, not final ledger authority. |
| Tenant isolation remains unresolved for SaaS production      | Multi-customer data separation must be explicit.          |

## Rollback Requirements

1. New `*_fils` columns must be nullable during rollout.
2. Legacy decimal readers must remain intact until reconciliation is approved.
3. Feature flags or route-level controls must allow stopping new dual-write paths.
4. Reconciliation reports must preserve mismatch evidence before any correction.
5. Production migration must have an export/restore plan before execution.

## Current Status

P0-001C in this branch prepares the gate. It does not satisfy the gate because live write paths, production schema, and dashboard readers are unchanged.
