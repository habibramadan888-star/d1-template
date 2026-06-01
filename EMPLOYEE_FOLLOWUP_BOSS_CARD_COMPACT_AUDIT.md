# Employee Follow-up Boss Card Compact Audit

Task: EMPLOYEE-FOLLOWUP-BOSS-CARD-COMPACT-UI-001

Date: 2026-06-01, Asia/Dubai

Scope: employee Follow-up boss-assigned task card UI only.

## Current Structure Audit

| Section | Current Content | Needed | Action |
|---|---|---:|---|
| Summary | Bed, amount, boss assigned badge, due date, overdue state, persisted/dirty state | yes | keep and compact |
| Summary | Customer code / internal ids | no | keep hidden from default card |
| Expanded content | Promise Date input | yes | keep |
| Expanded content | Note textarea | yes | keep, default blank when no saved note exists |
| Expanded content | Save button | yes | keep, simplify copy |
| Expanded content | Helper text: `Only update promise date and note` | no | remove |
| Expanded content | Source block | no | remove from employee task card |
| Expanded content | Boss Note block | no | remove from employee task card |
| Expanded content | QA smoke default note text | no | filter from editable note value |

## Root Cause Classification

| Root Cause | Present | Finding | Fix |
|---|---:|---|---|
| CARD_VERTICAL_SPACE_TOO_LARGE | yes | Expanded card included extra helper/source/boss-note blocks plus oversized spacing. | Reduced card padding, badge size, detail spacing, textarea height. |
| NON_ACTIONABLE_HELPER_TEXT_VISIBLE | yes | Helper text was always rendered in expanded details. | Removed from `employeeDirectiveCard`. |
| NON_ACTIONABLE_SOURCE_INFO_VISIBLE | yes | Source label was shown to employee although it does not affect execution. | Removed from expanded details. |
| BOSS_NOTE_EXPOSED_TO_EMPLOYEE_UNNECESSARILY | yes | Boss note was displayed by default in details. | Removed from employee card details. |
| NOTE_PREPOPULATED_UNNECESSARILY | yes | Follow-up note could prefill QA smoke text from server data. | Added `employeeDirectiveEditableNote()` QA/demo-note filter. |
| SUMMARY_BADGE_LAYOUT_NOT_COMPACT | yes | Badges used larger spacing and height than needed. | Added compact directive-card CSS tokens. |

## Safety

No production write, write gate opening, D1 execute/export/import, migration, employee follow-up write, owner directive create, financial formula change, dashboard calculation change, deploy, or production cutover was performed.
