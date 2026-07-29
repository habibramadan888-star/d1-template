# Owner Arrears Collapsible Card Result

Default card content:
- bed / room-bed
- amount
- source
- due / overdue line

Collapsed by default:
- promise date
- note
- status
- source detail
- owner/staff assignment
- detail actions

Result:
- Each arrears task card uses a `<details>` disclosure.
- Default view stays compact.
- Internal IDs and `ttlock-expired-*` are not rendered in the business title.
- Promised amount remains excluded from the owner default card.
- No business write was executed.
