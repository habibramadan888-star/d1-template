# Full Manual QA Plan

Generated: 2026-05-25T04:00:00+04:00

Scope: owner and employee commercial QA checklist for local/staging validation.
This plan does not deploy, migrate, or change production configuration.

## Preconditions

- Branch: `nightshift/v4-commercialization-safe-run` or a reviewed descendant.
- Worker must be started with approved local/staging config only.
- Production deploy and remote D1 migration are forbidden for this QA pass.
- Secrets must come from approved local/staging secret storage and must not be
  pasted into reports.
- For adapter tests, `APP_ENV` must be `development`, `local`, `test`, or
  `staging`.
- Production must keep adapter feature flags disabled or ignored.

## Employee Flow Cases

| Test ID                                | Preconditions                         | Steps                                                    | Expected Result                                                      | Data Evidence                                                 | Pass / Fail | Notes |
| -------------------------------------- | ------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- | ----------- | ----- |
| EMP-001 login                          | Employee test account exists          | Open employee UI and log in                              | Login succeeds and token/cookie is issued                            | `/api/me` returns employee role                               |             |       |
| EMP-002 logout                         | Employee logged in                    | Use logout action, then call protected API               | Session is cleared and protected API is denied                       | Protected API returns 401                                     |             |       |
| EMP-003 entry submit legacy            | Adapter flag off                      | Submit a normal employee entry                           | Legacy path accepts valid input                                      | Expected legacy tables update                                 |             |       |
| EMP-004 entry submit adapter rehearsal | Adapter flag on in local/staging      | Submit the same valid entry via `/api/employee/entry`    | Adapter path accepts valid input and preserves legacy fields         | Adapter evidence and expected writes appear                   |             |       |
| EMP-005 handover staging endpoint      | `ENABLE_HANDOVER_ATOMIC_STAGING=true` | Submit valid staging handover commit                     | Staging endpoint accepts; legacy live financial tables are unchanged | `handover_commits` and audit evidence                         |             |       |
| EMP-006 invalid money string           | Employee logged in                    | Submit non-money string amount                           | Request rejected with structured money error                         | No financial write                                            |             |       |
| EMP-007 three decimals                 | Employee logged in                    | Submit amount with 3 decimals                            | Request rejected; no silent rounding                                 | No financial write                                            |             |       |
| EMP-008 empty amount                   | Employee logged in                    | Submit empty amount                                      | Request rejected with structured error                               | No financial write                                            |             |       |
| EMP-009 voided row                     | Voided sample exists                  | Try to resubmit voided row/session                       | Request rejected or clearly blocked                                  | No new active financial write                                 |             |       |
| EMP-010 rollback                       | Adapter flag initially on             | Submit adapter case, turn flag off, resubmit             | Flag off returns legacy behavior                                     | `EMPLOYEE_ENTRY_ROLLBACK_DRILL_RESULT.md` equivalent evidence |             |       |
| EMP-011 weak network                   | Employee logged in                    | Simulate retry with same idempotency key where available | Replay is idempotent or duplicate-safe                               | No duplicate financial rows                                   |             |       |
| EMP-012 duplicate submit               | Employee logged in                    | Submit same payload twice with duplicate-risk scenario   | Duplicate is rejected or flagged                                     | Duplicate warning/rejection evidence                          |             |       |
| EMP-013 permission denied              | Owner/admin or wrong employee         | Try employee-only submit                                 | Request denied with 403                                              | No financial write                                            |             |       |
| EMP-014 mobile layout                  | Mobile viewport                       | Run login, entry, handover, and error cases              | UI remains usable and errors are readable                            | Screenshot/manual notes                                       |             |       |
| EMP-015 API failure                    | Worker or network failure simulated   | Trigger API error from employee UI                       | User sees actionable error; no silent success                        | Console/network evidence                                      |             |       |

## Owner Flow Cases

| Test ID                      | Preconditions                    | Steps                                   | Expected Result                                                  | Data Evidence                        | Pass / Fail | Notes |
| ---------------------------- | -------------------------------- | --------------------------------------- | ---------------------------------------------------------------- | ------------------------------------ | ----------- | ----- |
| OWN-001 login                | Owner test account exists        | Open owner UI and log in                | Login succeeds and owner role is shown                           | `/api/me` returns owner/admin role   |             |       |
| OWN-002 dashboard            | Owner logged in                  | Open dashboard                          | Dashboard loads without console/API failure                      | Dashboard API response captured      |             |       |
| OWN-003 history              | Owner logged in                  | Open history and inspect recent entries | History loads expected rows                                      | History API response captured        |             |       |
| OWN-004 arrears              | Arrears data exists              | Open arrears view                       | Arrears display matches expected data                            | Arrears API or DB evidence           |             |       |
| OWN-005 deposit              | Deposit data exists              | Review deposit records                  | Deposit rows are visible and not duplicated                      | Deposit ledger/API evidence          |             |       |
| OWN-006 rent config          | Owner logged in                  | Review rent config screen               | Config loads; no unauthorized writes                             | Config API response captured         |             |       |
| OWN-007 reports              | Owner logged in                  | Open reports/export preview             | Report renders or gives clear unavailable state                  | Report/export response               |             |       |
| OWN-008 search               | Owner logged in                  | Search customer/property/session        | Results match query; no crash                                    | UI/API evidence                      |             |       |
| OWN-009 filters              | Owner logged in                  | Apply date/status/property filters      | Filtered results are consistent                                  | API params and response              |             |       |
| OWN-010 export               | Export permission available      | Run export/preview                      | Export works or fails safely                                     | Export file/response evidence        |             |       |
| OWN-011 voided records audit | Voided session exists            | Review audit/history view               | Voided records are audit-visible but excluded from active totals | Audit row and active total evidence  |             |       |
| OWN-012 handover review      | Staging handover evidence exists | Review handover/audit evidence          | Handover events are traceable                                    | `audit_logs`/`entry_events` evidence |             |       |
| OWN-013 dashboard unchanged  | Before/after staging action      | Compare dashboard snapshots             | No unexpected live dashboard change                              | Dashboard before/after diff          |             |       |
| OWN-014 due/overdue          | Due/overdue data exists          | Check due today/overdue/soon            | Date logic matches Dubai business date expectation               | Manual date evidence                 |             |       |
| OWN-015 mobile/tablet        | Mobile/tablet viewport           | Review dashboard, tables, filters       | Layout remains usable                                            | Screenshot/manual notes              |             |       |

## Required Evidence Pack

- Worker start command and URL.
- `APP_ENV` and relevant feature flag state, without secrets.
- Employee and owner test account identifiers, without passwords.
- API request/response samples with tokens redacted.
- DB row count snapshots for relevant local/staging tables.
- Dashboard before/after snapshots for adapter and handover staging cases.
- Audit log or entry event rows for financial mutations.
- Secret scan result.

## Production NO-GO Conditions

- Real staging QA not completed.
- Production migration not approved.
- Remote D1 migration not approved.
- P0-001 reconciliation gate remains `MANUAL_REQUIRED`.
- P0-003 dashboard/backend totals live authority is not switched.
- P0-006 tenant/property scope is not implemented.
- P0-008 receivables model is not implemented.
- Embedded/source deploy artifact checks are not reviewed for the actual
  deployment entrypoint.
