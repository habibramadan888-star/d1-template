# AUTH-UI-STABILIZATION-002 Owner Arrears Detail Modal Layout Fix Result

Date: 2026-05-29, Asia/Dubai

The arrears / due detail modal no longer renders a narrow table body on mobile.

| Requirement                   | Result                                               |
| ----------------------------- | ---------------------------------------------------- |
| Mobile readable detail        | Yes. Details render as `.arrears-detail-card` items. |
| Room / bed                    | Shown in card header.                                |
| Tenant / card                 | Shown under room and in detail grid.                 |
| Cutoff date                   | Shown as `截止日期`.                                 |
| Status                        | Shown as stable status label.                        |
| Overdue days                  | Computed for display only from card end date.        |
| Amount                        | Shown when available; otherwise `未接入`.            |
| Copy / export / close buttons | Wrapped into mobile-safe grid.                       |
| Calculation impact            | No. Display-only change.                             |

No arrears calculation, financial formula, or D1 data was changed.
