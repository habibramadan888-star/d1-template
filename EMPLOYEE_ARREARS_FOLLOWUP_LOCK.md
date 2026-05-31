# Employee Arrears Follow-Up Lock

## Final Employee Scope

Employee arrears follow-up is a task feedback workflow, not a finance amount editing workflow.

Employees only need to:

1. View arrears tasks assigned or visible to them.
2. Fill promise payment date.
3. Fill staff note.
4. Submit follow-up feedback.

Employees do not need to:

1. Fill promised amount.
2. Modify arrears amount.
3. Modify source.
4. Close task.
5. Void task.
6. Delete task.
7. Modify accounting/finance status.

## Employee Action Matrix

| Employee Action                    | Allowed | Required Fields                                                             | Owner Sees               |
| ---------------------------------- | ------- | --------------------------------------------------------------------------- | ------------------------ |
| View assigned arrears task         | yes     | none                                                                        | Task status unchanged    |
| Set follow-up status               | yes     | `followup_status`                                                           | Business status          |
| Fill promise payment date          | yes     | `promise_date` when status is `承诺付款`                                    | `承诺日期`               |
| Fill staff note                    | yes     | `staff_note` when status is not `待跟进`                                    | `备注`                   |
| Submit feedback                    | yes     | `followup_status`, optional/required `promise_date`, `staff_note` by status | Updated date/note/status |
| Fill promised amount               | no      | none                                                                        | Not shown                |
| Modify arrears amount              | no      | none                                                                        | Not allowed              |
| Modify source                      | no      | none                                                                        | Not allowed              |
| Close task                         | no      | none                                                                        | Not allowed              |
| Void/delete task                   | no      | none                                                                        | Not allowed              |
| Modify financial/accounting status | no      | none                                                                        | Not allowed              |

## Current Implementation Gap

| Layer                 | Current                                                                                      | Lock Status |
| --------------------- | -------------------------------------------------------------------------------------------- | ----------- |
| Employee v3 UI        | Follow-up card has date and note inputs; save payload sends `promise_date` and `staff_note`. | Aligned     |
| Employee v2 legacy UI | Promised amount input removed from follow-up section.                                        | Aligned     |
| Backend staff patch   | `staffAllowed` still includes `promise_amount` for compatibility.                            | Gap         |
| Owner card            | No longer displays promised amount.                                                          | Aligned     |

## Required Future Fix

Create a dedicated compatibility task to remove or ignore `promise_amount` from employee follow-up updates in the backend. This must be done separately because the same schema field is still used in legacy arrears/task compatibility paths.

## Required Tests

1. Employee follow-up UI has no promised amount input.
2. Employee follow-up save payload does not include `promise_amount`.
3. Backend staff patch rejects amount changes after compatibility review.
4. Owner card does not display promised amount.

## Promise Amount Contract Cleanup

- Employees only fill promised payment date and follow-up note in the default arrears follow-up flow.
- Arrears amount is system-controlled and must not be entered by employees as a promised amount.
- `promise_amount`, `promised_amount`, and `promised_amount_fils` are legacy optional compatibility fields only.
- Default employee UI must not display or submit promised amount fields.
- No migration or D1 write was performed.
- Production cutover remains `PRODUCTION_NO_GO`.

## Owner Batch Directive UI Lock

- Current owner-side "send employee" flow is dry-run/list-generation only unless a separate write approval is issued.
- The owner UI no longer asks for a directive date before generating the employee execution list.
- Employee write flows are not executed by owner arrears batch selection tests.
- Production cutover remains `PRODUCTION_NO_GO`.
