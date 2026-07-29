# Arrears Follow-up Final Module Spec

Status: final design package only  
Production cutover: PRODUCTION_NO_GO  
Execution boundary: no D1 write, no migration, no deploy

## 1. Module Goal

The arrears follow-up module is the single operating layer for all unsettled arrears signals. It gives owners one management surface, gives employees one execution queue, and keeps accounting authority separate from operational follow-up.

The module answers four business questions:

- Who owes or appears to owe money?
- Who is responsible for following up?
- What did the employee report and when?
- Which customers are repeatedly risky?

## 2. Three Arrears Sources

Arrears tasks are merged from three source classes:

- `historical_arrears`: historical short-paid, unpaid, restored voided payment arrears, old promised-but-unpaid items.
- `current_due_unpaid`: current rent or receivable due but not matched to payment or confirmed employee handover.
- `ttlock_expired_card`: expired TTLock card or access signal requiring operational follow-up.

TTLock expiry is an operational signal only. It does not prove final accounting receivable amount.

## 3. Owner Responsibilities

- View all arrears follow-up tasks within authorized scope.
- Assign or reassign tasks to employees.
- Review employee notes, promises, and payment reports.
- Confirm false positive, moved-out, closed, or voided outcomes.
- Review customer risk scores and history.
- Export staff WhatsApp follow-up lists.

Owner is the management and review role. Owner is not the employee entry workflow.

## 4. Employee Responsibilities

- View only assigned arrears tasks.
- Contact customer and update follow-up status.
- Record promise date, promised amount, and note.
- Report customer payment feedback with note and optional amount/method.
- Suggest false positive or moved-out outcomes.
- Continue follow-up when payment is not matched.

Employees cannot close, void, delete, alter authority fields, or make accounting confirmation.

## 5. Readonly Admin Responsibilities

- View all permitted tasks, risk indicators, audit trail, and export previews.
- Cannot mutate status, assignment, amount, close reason, accounting status, or source data.

## 6. Accounting Boundary

- `followup_status` describes operational follow-up.
- `accounting_status` describes accounting authority.
- Employee feedback that a customer paid is `paid_reported`, not `payment_matched`.
- A follow-up task is not automatically a formal receivable.
- Final amount authority belongs to backend receivables, ledger, and payment matching.
- Amounts must be integer fils in future implementation.

## 7. Statistical Risk Boundary

Risk scoring supports operational judgement only. It must not auto-ban, auto-close, auto-void, or auto-deny service without owner review.

## 8. Data Lifecycle

`discovered` -> assigned/followed -> promised or reviewed -> payment reported or exception suggested -> accounting review -> closed/voided with preserved record.

Records are append-only from an audit perspective. Closing or voiding changes lifecycle state; it does not physically delete the task.

## 9. Non-delete Principle

False positives, moved-out cases, voided tasks, and closed tasks must be retained with reason, actor, timestamp, and audit trail.

## 10. Relationship to Existing Domains

- `receivables`: accounting authority and verified receivable state.
- `ledger`: immutable accounting/payment matching evidence.
- `payments`: reported and matched payment source.
- `ttlock`: operational access expiry signal, not accounting authority.
- `arrears_followup_tasks`: operational workflow layer between source signals, employee action, owner review, and accounting confirmation.
