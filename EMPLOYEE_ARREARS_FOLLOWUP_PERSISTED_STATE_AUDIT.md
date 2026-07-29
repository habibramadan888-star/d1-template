# Employee Arrears Follow-up Persisted State Audit

Date: 2026-06-01 Asia/Dubai

Scope: employee-side boss directive follow-up UI state only. No production write gate was opened and no production business write was executed in this task.

## Root Cause Classification

`PERSISTED_FEEDBACK_NOT_RECOGNIZED`, `DIRTY_STATE_NOT_TRACKED`, `SUBMIT_ALWAYS_GATED_WARNING`, and `SERVER_VALUES_NOT_SAVED_FOR_COMPARE`.

## Findings

| State | Current Behavior | Expected Behavior | Gap |
|---|---|---|---|
| Persisted feedback from server | Card could display existing feedback but submit still entered the write attempt path | If server values match current inputs, show saved feedback and do not show gate-off warning | Persisted server values were not used as the submit guard |
| Current unsaved edit | Input change changed the status tag to unsaved | Keep unsaved status only when current values differ from server originals | Dirty state was not explicitly compared against server originals |
| Write gate off | 409 response always showed the same not-written warning | Gate warning should apply only to new/changed feedback attempts | Submit path did not first check clean persisted state |
| Server original values | Current inputs were rendered from server fields | Store `serverOriginalPromisedDate` and `serverOriginalFollowupNote` for comparison | Original values were not separately retained for dirty checks |
| Employee confidence | User saw "existing feedback" and then a not-written warning | Existing feedback should be acknowledged as saved and owner-visible | Copy conflict made a successful prior write look failed |

## Required Fix

- Store server original promised date and follow-up note on load.
- Calculate dirty state from current inputs versus server originals.
- If feedback is persisted and not dirty, disable/label the button as saved and show "feedback saved, owner visible" on click.
- If dirty and write gate is off, show the gated warning only for the unsaved modification.
- Do not open write gate or execute any write in this UI fix.
