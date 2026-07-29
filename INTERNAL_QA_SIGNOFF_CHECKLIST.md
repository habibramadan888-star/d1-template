# Internal QA Signoff Checklist

Date: 2026-05-27, Asia/Dubai

Scope: internal staging QA signoff only. This checklist does not approve
production deploy, production migration, production D1 write, production feature
flags, public beta, or commercial launch.

| Signoff Item                | Required Evidence                                             | Status      | Signoff Owner | Notes |
| --------------------------- | ------------------------------------------------------------- | ----------- | ------------- | ----- |
| Employee flow pass          | `EMPLOYEE_INTERNAL_TEST_SCRIPT.md` completed                  | NOT_STARTED | Ramadan Habib |       |
| Owner flow pass             | `OWNER_INTERNAL_TEST_SCRIPT.md` completed                     | NOT_STARTED | Ramadan Habib |       |
| Finance flow pass           | Rent, short-pay, repayment, deposit, void evidence            | NOT_STARTED | Ramadan Habib |       |
| Handover pass               | Employee handover and owner review evidence                   | NOT_STARTED | Ramadan Habib |       |
| Receivables pass            | Due, overdue, arrears, allocation evidence                    | NOT_STARTED | Ramadan Habib |       |
| Tenant/property access pass | Permission isolation and negative cases                       | NOT_STARTED | Ramadan Habib |       |
| Void / soft-delete pass     | Voided rows excluded from active totals and visible for audit | NOT_STARTED | Ramadan Habib |       |
| Export/report pass          | Export/report scope and redaction evidence                    | NOT_STARTED | Ramadan Habib |       |
| Mobile usability pass       | Employee and owner phone screenshots                          | NOT_STARTED | Ramadan Habib |       |
| Known bugs reviewed         | Bug list triaged with severity                                | NOT_STARTED | Ramadan Habib |       |
| No P0/P1 open bugs          | Bug tracker confirms no open P0/P1                            | NOT_STARTED | Ramadan Habib |       |
| Production still NO-GO      | `gate:commercial-launch = PRODUCTION_NO_GO`                   | NOT_STARTED | Ramadan Habib |       |
| Ready for closed pilot      | Internal QA accepted, production still blocked                | NOT_STARTED | Ramadan Habib |       |

Allowed status values: `NOT_STARTED`, `IN_PROGRESS`, `PASS`, `FAIL`,
`MANUAL_REQUIRED`, `BLOCKED`.

## Closed Pilot Boundary

`Ready for closed pilot` means internal stakeholders may consider a restricted
staging pilot. It does not mean production approval, public beta, commercial
launch, production D1 write, production migration, production deploy, or
dashboard authority switch.
