# Arrears Follow-up State Machine Final

Status: final state design only  
Execution boundary: no migration, no D1 write

## Main State Flow

```text
discovered
-> pending_followup
-> contacted
-> promised
-> promise_overdue
-> paid_reported
-> payment_matched
-> closed
```

## Branches

```text
pending_followup -> false_positive_suggested
pending_followup -> moved_out_suggested
paid_reported -> needs_review
needs_review -> closed
needs_review -> pending_followup
any state -> voided (owner only)
```

## Status Rules

| Status                     | Meaning                                         | Who Can Set               | Required Fields                     | Next Allowed                                                     | Accounting Impact                                 |
| -------------------------- | ----------------------------------------------- | ------------------------- | ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------- |
| `discovered`               | System found a candidate task                   | system                    | source_type, source_ref, dedupe_key | pending_followup, voided                                         | None                                              |
| `pending_followup`         | Task needs employee follow-up                   | owner, system             | assigned_employee_id                | contacted, false_positive_suggested, moved_out_suggested, voided | None                                              |
| `contacted`                | Employee contacted customer                     | employee assigned to task | note                                | promised, paid_reported, pending_followup                        | None                                              |
| `promised`                 | Customer promised payment                       | employee assigned to task | next_promised_payment_date, note    | promise_overdue, paid_reported, pending_followup                 | None                                              |
| `promise_overdue`          | Promise date has passed without matched payment | system                    | next_promised_payment_date          | paid_reported, pending_followup, needs_review                    | None                                              |
| `paid_reported`            | Employee reports customer says paid             | employee assigned to task | note, optional amount/method        | needs_review, payment_matched                                    | accounting_status becomes `payment_reported` only |
| `payment_matched`          | Accounting matched payment                      | owner/accounting process  | payment or ledger reference         | closed, needs_review                                             | accounting_status becomes `payment_matched`       |
| `needs_review`             | Owner/accounting must review conflict           | owner, system             | reason                              | closed, pending_followup                                         | None until resolved                               |
| `false_positive_suggested` | Employee suggests task is not real arrears      | employee assigned to task | note                                | false_positive, pending_followup                                 | None                                              |
| `moved_out_suggested`      | Employee suggests customer moved out            | employee assigned to task | note                                | moved_out, pending_followup                                      | None                                              |
| `false_positive`           | Owner confirms false positive                   | owner                     | close_reason                        | closed, voided                                                   | Preserve record                                   |
| `moved_out`                | Owner confirms moved out                        | owner                     | close_reason                        | closed, voided                                                   | Preserve record                                   |
| `closed`                   | Owner closes task                               | owner                     | close_reason                        | none                                                             | accounting_status must be consistent              |
| `voided`                   | Owner voids invalid task                        | owner                     | reason                              | none                                                             | No deletion; audit required                       |

## Mandatory Constraints

- `promised` requires `next_promised_payment_date`.
- `paid_reported` requires note; amount and payment method are optional.
- `promise_overdue` is system-derived from promised date.
- Employee cannot close.
- Employee cannot void.
- Readonly admin cannot modify any status.
- False positive and moved out begin as employee suggestions and require owner confirmation.
- Closed must have `close_reason`.
