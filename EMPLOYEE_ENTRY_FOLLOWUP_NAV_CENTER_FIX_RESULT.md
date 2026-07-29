# Employee Entry Follow-up Nav Center Fix Result

Task: EMPLOYEE-FOLLOWUP-ENTRY-LAYOUT-PARITY-HARD-FIX-001

## Fix

The top tabs now use `class="tabs employee-tabs" data-entry-parity-tabs="true"` with a dedicated parity override:

- Desktop: centered flex, two equal 178px buttons.
- Mobile: centered two-column grid, no horizontal scroll, no wrap.
- Only `Entry` and `Follow-up` tabs are present.
- Employee `Export` remains removed.

| Check | Result |
|---|---|
| Entry/Follow-up centered | yes |
| Two buttons same size | yes |
| Export removed | yes |
| Active/inactive state unified | yes |
| D1 write | no |

Production cutover remains `PRODUCTION_NO_GO`.
