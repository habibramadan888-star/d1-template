# Arrears Promise Amount UI Cleanup Result

Date: 2026-05-31

## Employee UI

| UI Area                | Result                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Promised amount input  | Not present in default follow-up card.                                                   |
| Promised payment date  | Present as the primary promise field.                                                    |
| Follow-up note         | Present as the note field.                                                               |
| Default submit payload | Sends `promised_payment_date` and `followup_note`; does not send promised amount fields. |

## Owner UI

| UI Area         | Result                                                |
| --------------- | ----------------------------------------------------- |
| Top amount      | Uses system arrears amount via `arrearAmountLabel()`. |
| Promised amount | Not displayed by default card.                        |
| Promise date    | Displayed through `arrearPromiseDateLabel()`.         |
| Note            | Displayed through `arrearFollowupNoteLabel()`.        |
| Status          | Displayed through business state mapping.             |

## Non-Changes

- No amount calculation was changed.
- No arrears Backend SOT merge logic was changed.
- No navigation was changed.
- No D1 write or migration was performed.
