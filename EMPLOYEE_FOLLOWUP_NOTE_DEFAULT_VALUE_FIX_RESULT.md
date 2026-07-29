# Employee Follow-up Note Default Value Fix Result

Task: EMPLOYEE-FOLLOWUP-BOSS-CARD-COMPACT-UI-001

Date: 2026-06-01, Asia/Dubai

## Result

| Check | Result |
|---|---|
| no saved note defaults blank | yes |
| saved note exists shows real saved value | yes |
| QA demo text still appears by default | no |
| UI writes demo content | no |
| production write executed | no |

## Implementation Notes

- `employeeDirectiveEditableNote()` returns blank for known QA/demo smoke notes.
- `normalizeEmployeeDirective()` stores the editable note after the QA/demo filter.
- The textarea renders `employeeDirectiveEditableNote(d.followup_note)`.
- The placeholder is shortened to `Note / 备注`.

The persisted-state model remains intact: real saved note values still feed `serverOriginalFollowupNote` for saved/dirty state comparison.
