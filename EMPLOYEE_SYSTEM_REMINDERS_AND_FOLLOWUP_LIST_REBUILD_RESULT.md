# Employee System Reminders And Follow-up List Rebuild Result

Task: EMPLOYEE-FOLLOWUP-ENTRY-LAYOUT-PARITY-HARD-FIX-001

## Result

System Reminders and the arrears follow-up list were rebuilt around Entry-style primitives:

- KPI row uses `kpi-grid followup-dashboard`.
- KPI cards use `kpi-card followup-metric`.
- Each reminder item uses `followup-card step employee-card`.
- Default reminder card shows only bed/title, amount, overdue/source/status chips, and an expand button.
- Status select, promise date, note, save, and collect-rent buttons are hidden inside `followup-details` until expanded.

## Information Exposure

| Field / UI | Default Card | Details |
|---|---|---|
| Bed / task title | visible | visible |
| Amount | visible | visible |
| Overdue | visible | visible |
| Status | summarized | editable after expand |
| Promise date | hidden | editable after expand |
| Note | hidden | editable after expand |
| tenant_card_id / deposit / CID | hidden | hidden |
| raw source fields | hidden | hidden |

Safety: no production write, no D1 command, no migration, no deploy.
