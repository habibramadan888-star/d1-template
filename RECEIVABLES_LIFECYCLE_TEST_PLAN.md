# Receivables Lifecycle Test Plan

Status: P0-008A design only. No production migration or Worker deployment was executed.

## Required Automated Tests

| ID      | Scenario                                | Input                                                      | Expected Result                                                                       | Risk Covered                                     |
| ------- | --------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| REC-001 | Create monthly rent receivable          | Bed with configured monthly rent, period anchors, due date | `receivables` row created with `OPEN`, integer `amount_due_fils`, tenant/bed snapshot | Rent due has accounting source of truth.         |
| REC-002 | Full payment settles receivable         | Payment equals due                                         | `payment_allocations` created, `amount_remaining_fils = 0`, status `SETTLED`          | Prevents false arrears after full payment.       |
| REC-003 | Short payment creates remaining balance | Due 770 AED, paid 80 AED                                   | Remaining 690 AED, status `PARTIAL`, follow-up task required                          | Tail payment is not lost or treated as discount. |
| REC-004 | Repayment closes old balance            | Existing partial receivable, repayment 690 AED             | Allocation reduces remaining to zero, status `SETTLED`, task closes                   | 欠款回收 links to original debt.                 |
| REC-005 | Partial repayment keeps task open       | Existing 690 AED remaining, repayment 200 AED              | Remaining 490 AED, status `PARTIAL`, task still open                                  | Follow-up cannot be falsely closed.              |
| REC-006 | Approved discount is not cash           | Due 770 AED, paid 700 AED, owner approved 70 AED waiver    | Adjustment event created, cash remains 700 AED, status `SETTLED`                      | Accounting separates waiver from payment.        |
| REC-007 | Deposit offset is explicit              | Deposit balance available, rent shortfall offset approved  | Deposit ledger delta and receivable adjustment both recorded                          | Deposit cannot silently hide rent debt.          |
| REC-008 | Refund does not reduce rent due         | Deposit refund event exists                                | Rent receivable unchanged unless linked adjustment exists                             | Refund and rent receivable stay separate.        |
| REC-009 | Void retains records                    | Void source session/transaction                            | Receivable status `VOIDED`, original rows and events still queryable                  | No financial hard delete.                        |
| REC-010 | Duplicate handover retry                | Same idempotency key submitted twice                       | One receivable/allocation set only, duplicate returns existing result                 | Weak network retry cannot double bill/pay.       |
| REC-011 | Future rent config change               | Rent changed after existing receivable created             | Existing receivable amount unchanged, new periods use new config                      | Historical accounting does not drift.            |
| REC-012 | Overpayment handling                    | Paid exceeds due                                           | Overpayment is recorded separately; receivable settles; no negative remaining         | Prevents negative arrears.                       |
| REC-013 | Employee cannot adjust receivable       | Staff submits approved adjustment without owner approval   | Rejected or marked pending owner approval                                             | Staff cannot decide accounting discounts.        |
| REC-014 | Tenant scope isolation                  | Tenant A user requests tenant B receivable                 | 403 or empty scoped result                                                            | SaaS data isolation.                             |
| REC-015 | Dubai overdue boundary                  | Due date crosses midnight UTC/Dubai                        | Status follows Dubai business date                                                    | Prevents wrong overdue status.                   |

## Manual Acceptance Tests

| Test                  | Staff Action                                             | Owner View Expected                                                                 |
| --------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Full rent collection  | Staff records rent matching system due.                  | Session shows collected; no arrears task; receivable settled.                       |
| Short rent collection | Staff records 80 AED against 770 AED with promise date.  | Receivable remaining 690 AED; follow-up card shows amount/date/reason.              |
| Repayment             | Staff records `还欠款` against existing 690 AED balance. | Remaining decreases or closes; audit shows operator and time.                       |
| Void session          | Owner voids a mistaken handover.                         | Active dashboard excludes it; audit/report can still show original and void reason. |
| Deposit offset        | Owner approves using deposit to offset rent shortfall.   | Deposit balance decreases; receivable adjustment reason visible.                    |

## Non-Negotiable Validation Rules

- Tests must not use floating money as source of truth.
- Tests must assert original rows remain after void.
- Tests must prove frontend totals are not accepted as accounting authority.
- Tests must cover duplicate submit/idempotency.
- Tests must prove `arrear_tasks` are operational follow-up records, not the accounting ledger.
- Tests must run against local/dev D1 only until production migration is approved.

## Out Of Scope For P0-008A

- No production table creation.
- No live route migration.
- No dashboard query replacement.
- No automatic data backfill.
- No official receivables cutover until P0-001, P0-002, P0-003, and P0-006 gates are ready.
