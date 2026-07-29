# Arrears Promise Amount Backend Compatibility Result

Date: 2026-05-31

## Compatibility Behavior

| Requirement                                                                  | Result | Notes                                                               |
| ---------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| API receiving `promise_amount` must not fail by field validation alone       | Pass   | Staff allow-list keeps `promise_amount`.                            |
| API receiving `promised_amount` must not fail by field validation alone      | Pass   | Staff allow-list includes `promised_amount`.                        |
| API receiving `promised_amount_fils` must not fail by field validation alone | Pass   | Staff allow-list includes `promised_amount_fils`.                   |
| Default status update does not depend on promised amount                     | Pass   | Staff update branch no longer writes `updateValues.promise_amount`. |
| `promised_payment_date` is the semantic date alias                           | Pass   | Backend maps it to existing `promise_date` storage.                 |
| `followup_note` is the semantic note alias                                   | Pass   | Backend maps it to existing `staff_note` storage.                   |
| No D1 write                                                                  | Pass   | Code-only compatibility update.                                     |
| No migration                                                                 | Pass   | Existing columns retained.                                          |

## Design Note

`promise_amount` and related amount aliases are legacy optional compatibility fields. They may appear in old clients, historical rows, migration rehearsals, or API payloads, but the current staff follow-up flow is controlled by system amount plus promised date and note.
