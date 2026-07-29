# P0-008B Receivables Implementation Readiness Gate

Generated: 2026-05-25T03:42:25+04:00

Scope: implementation readiness gate for future receivables. This gate does not create production tables, execute migrations, switch dashboard queries, or change legacy arrears logic.

## Readiness Summary

| Area                             | Status           | Evidence                                                 | Risk                                        | Recommendation                                                     |
| -------------------------------- | ---------------- | -------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ |
| Receivables conceptual model     | Ready for review | `RECEIVABLES_MODEL_DESIGN.md`                            | Design is not implementation                | Use as source for local/staging rehearsal only                     |
| Lifecycle test scenarios         | Ready for review | `RECEIVABLES_LIFECYCLE_TEST_PLAN.md`                     | Tests are not implemented yet               | Convert to local-only tests in P0-008C                             |
| Migration draft                  | Missing          | `migration-drafts/receivables_model_draft.sql` not found | Cannot rehearse schema or table constraints | Create draft before any local/staging implementation               |
| Integer money dependency         | Partial          | P0-001 helper/gates exist, live migration not complete   | Receivables must use fils from day one      | Block production until P0-001 migration/reconciliation is approved |
| Backend totals dependency        | Partial          | P0-003C gate exists                                      | Dashboard totals not live authority         | Use backend totals helper in local/staging only                    |
| Atomic handover dependency       | Partial          | P0-002 staging endpoint exists                           | Live handover not cut over                  | Do not make receivables production authority yet                   |
| Tenant/property scope dependency | Partial          | P0-006 audit exists                                      | SaaS data isolation not implemented         | Receivables must include tenant/company/property scope             |
| Legacy arrears migration         | Not ready        | `arrears` / `arrear_tasks` still legacy                  | Risk of duplicate or missing debt           | Require reconciliation and manual review                           |

## Required Table Scope

| Table                    | Readiness   | Required Fields / Rules                                                                                                                              | Notes                                             |
| ------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `receivables`            | Design only | `receivable_id`, `company_id`, `property_id`, snapshots, `amount_due_fils`, `amount_paid_fils`, `amount_remaining_fils`, `status`, audit/void fields | Must be source of truth for what is owed          |
| `receivable_events`      | Design only | Append-only event rows for create/pay/adjust/void/writeoff                                                                                           | Must not be mutable operational notes             |
| `payment_allocations`    | Design only | Link payment/transaction to one or more receivables in fils                                                                                          | Needed to explain repayment and short-pay closure |
| `receivable_adjustments` | Design only | Owner-approved discount, waiver, deposit offset, correction                                                                                          | Must not be recorded as cash                      |

## Lifecycle Rules

| Lifecycle           | Required Rule                                                                      | Gate Status     |
| ------------------- | ---------------------------------------------------------------------------------- | --------------- |
| Rent due generation | Create receivable using effective rent config and Dubai business date              | MANUAL_REQUIRED |
| Full payment        | Allocation settles receivable to zero remaining                                    | MANUAL_REQUIRED |
| Short pay           | Remaining balance remains open and follow-up task is derived                       | MANUAL_REQUIRED |
| Repayment           | Payment allocation reduces existing receivable                                     | MANUAL_REQUIRED |
| Refund              | Does not reduce rent receivable unless approved adjustment exists                  | MANUAL_REQUIRED |
| Void                | Marks receivable/allocation status; never hard deletes rows                        | MANUAL_REQUIRED |
| Config change       | Existing receivables keep original amount; future receivables use effective config | MANUAL_REQUIRED |

## Dependency Decision

| Dependency                   | Blocks Local/Staging Rehearsal                            | Blocks Production                |
| ---------------------------- | --------------------------------------------------------- | -------------------------------- |
| P0-001 minor-unit policy     | No, if local/staging uses helper and integer fils         | Yes                              |
| P0-002 atomic handover       | No, if rehearsal is isolated                              | Yes                              |
| P0-003 backend totals        | No, if shadow compare only                                | Yes                              |
| P0-006 tenant/property scope | No, if fields are included as draft and tests cover scope | Yes                              |
| Dubai timezone policy        | No, if tests use helper/policy                            | Yes for overdue production logic |

## Gate Conclusion

P0-008 status: `Partial - receivables implementation readiness gate ready`.

GO for P0-008C local/staging schema rehearsal: yes, after creating a migration draft and tests.

NO-GO for production receivables: yes.

Production remains blocked until migration, reconciliation, tenant scope, backend totals, and human accounting approval are complete.
