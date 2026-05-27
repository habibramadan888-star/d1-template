# Internal QA Day 1 Execution Checklist

Date: 2026-05-27, Asia/Dubai

Scope: Day 1 internal staging QA only. This checklist does not approve public
beta, production deploy, production migration, production D1 write, staging D1
write by Codex, feature flags, dashboard authority switch, or commercial launch.

Production status must remain `PRODUCTION_NO_GO`.

## 1. Pre-Test Preparation

| Item                           | Required Check                                                                 | Result | Notes |
| ------------------------------ | ------------------------------------------------------------------------------ | ------ | ----- |
| Confirm environment            | Use staging only.                                                              |        |       |
| Confirm URL                    | `https://homelink-finance-staging.habibramadan888.workers.dev`                 |        |       |
| Confirm production not used    | Do not open production URL.                                                    |        |       |
| Confirm test data label        | Use `QA_INTERNAL_STAGING_2026_05_27` where possible.                           |        |       |
| Confirm evidence folder        | Prepare local folder for screenshots/videos.                                   |        |       |
| Confirm bug template           | Use `BUG_REPORT_TEMPLATE.md`.                                                  |        |       |
| Confirm daily report template  | Use the report section in this file or `INTERNAL_QA_DAILY_REPORT_TEMPLATE.md`. |        |       |
| Confirm no secrets in evidence | No password, token, cookie, or API key visible.                                |        |       |
| Confirm launch boundary        | Internal QA is not public beta or production approval.                         |        |       |

## 2. Test Account Confirmation

Do not write passwords, tokens, cookies, or recovery codes in this file.

| Account Slot | Role                            | Required Scope                         | Confirmed? | Notes                                 |
| ------------ | ------------------------------- | -------------------------------------- | ---------- | ------------------------------------- |
| QA-EMP-01    | employee                        | Assigned to QA property only.          |            | Credentials from secure channel only. |
| QA-OWN-01    | owner                           | Assigned to QA tenant/property.        |            | Credentials from secure channel only. |
| QA-MGR-01    | manager/admin if available      | Tenant/property boundary checks.       |            | Optional for Day 1.                   |
| QA-NEG-01    | negative-case user if available | Cross-tenant or cross-property denial. |            | Use only if staging-safe.             |

## 3. Test URL

| Environment | URL                                                            | Use                     |
| ----------- | -------------------------------------------------------------- | ----------------------- |
| staging     | `https://homelink-finance-staging.habibramadan888.workers.dev` | Day 1 internal QA       |
| production  | Do not use                                                     | Forbidden for this task |

## 4. Desktop Test Steps

| Step  | Action                                  | Expected Result                                                | Evidence                                           |
| ----- | --------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------- |
| D-001 | Open staging URL in desktop browser.    | Page loads without production redirect.                        | Screenshot of landing/login page with URL visible. |
| D-002 | Login as employee.                      | Employee view opens and owner-only controls are not visible.   | Screenshot after login.                            |
| D-003 | Run employee main flow checklist below. | Employee flow produces expected QA evidence or documented bug. | Screenshots per flow.                              |
| D-004 | Logout employee.                        | User returns to login or unauthenticated state.                | Screenshot.                                        |
| D-005 | Login as owner.                         | Owner dashboard/history area opens.                            | Screenshot after login.                            |
| D-006 | Run owner main flow checklist below.    | Owner flow produces expected QA evidence or documented bug.    | Screenshots per flow.                              |
| D-007 | Refresh dashboard/history.              | Data remains consistent after reload.                          | Before/after screenshots.                          |
| D-008 | Logout owner.                           | User returns to login or unauthenticated state.                | Screenshot.                                        |

## 5. Mobile Test Steps

| Step  | Action                                                                     | Expected Result                                      | Evidence                   |
| ----- | -------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------- |
| M-001 | Open staging URL on phone or mobile viewport.                              | Login page is usable without horizontal blocking.    | Mobile screenshot.         |
| M-002 | Login as employee.                                                         | Employee controls are reachable.                     | Mobile screenshot.         |
| M-003 | Submit or dry-run one safe QA rent/deposit flow if approved for manual QA. | Form is usable and validation messages are readable. | Mobile screenshots.        |
| M-004 | Open handover flow.                                                        | Handover content and submit controls are visible.    | Mobile screenshot.         |
| M-005 | Login as owner on mobile.                                                  | Dashboard/history is readable.                       | Mobile screenshot.         |
| M-006 | Check dashboard, history, and filters.                                     | Key data is readable and filters are usable.         | Mobile screenshots.        |
| M-007 | Rotate or resize if relevant.                                              | Layout remains usable.                               | Screenshot if issue found. |

## 6. Employee Main Flow

| Test ID    | Scenario           | Day 1 Steps                                                       | Expected Result                                                      | Required Screenshot                      |
| ---------- | ------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------- |
| EMP-D1-001 | Login / logout     | Login as employee and logout.                                     | Login/logout works; no owner-only pages.                             | Login success and logout state.          |
| EMP-D1-002 | Rent full payment  | Create QA rent full-payment entry if manual QA write is approved. | Entry accepted or safely queued; amount is correct.                  | Entry form and result/history reference. |
| EMP-D1-003 | Deposit            | Create QA deposit entry if approved.                              | Deposit is separate from rent income.                                | Deposit form/result.                     |
| EMP-D1-004 | Short pay          | Enter lower paid amount than due if approved.                     | Difference remains outstanding.                                      | Entry and outstanding evidence.          |
| EMP-D1-005 | Repayment          | Apply repayment against QA outstanding item if approved.          | Outstanding reduces according to oldest-due-first rule if supported. | Before/after outstanding.                |
| EMP-D1-006 | Void / soft-delete | Void a QA entry if approved.                                      | Active totals exclude voided row; audit evidence remains.            | Before/after void marker.                |
| EMP-D1-007 | Handover           | Submit QA handover with mixed rows if approved.                   | Handover totals are safe and explainable.                            | Handover summary.                        |
| EMP-D1-008 | Duplicate submit   | Repeat submit or refresh during submit.                           | No double count; duplicate is blocked/idempotent.                    | First and second attempt.                |
| EMP-D1-009 | Invalid money      | Try wrong amount, three decimals, and empty amount.               | Validation blocks unsafe input.                                      | Validation messages.                     |
| EMP-D1-010 | Permission denied  | Attempt out-of-scope property/tenant if test account supports it. | Access denied or filtered.                                           | Denial or filtered result.               |

## 7. Owner Main Flow

| Test ID    | Scenario                            | Day 1 Steps                                                      | Expected Result                                                          | Required Screenshot                  |
| ---------- | ----------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------ |
| OWN-D1-001 | Login / logout                      | Login as owner and logout.                                       | Login/logout works.                                                      | Login success and logout state.      |
| OWN-D1-002 | Dashboard                           | Open dashboard after QA entries.                                 | Dashboard shows staging QA data in owner scope only.                     | Dashboard overview.                  |
| OWN-D1-003 | Due today                           | Review due-today widget/list.                                    | Due today follows Asia/Dubai business date.                              | Due today area.                      |
| OWN-D1-004 | Overdue                             | Review overdue rows.                                             | Only earlier due dates are overdue.                                      | Overdue area.                        |
| OWN-D1-005 | Arrears                             | Review arrears total/detail.                                     | Short-pay remains outstanding until repayment/adjustment.                | Arrears summary/detail.              |
| OWN-D1-006 | Monthly income / rent received      | Compare dashboard to QA rent history.                            | Rent income excludes deposit and voided rows.                            | Dashboard plus history.              |
| OWN-D1-007 | Deposit                             | Review deposit collection/refund/deduction if test data exists.  | Deposit stays separate from rent income.                                 | Deposit evidence.                    |
| OWN-D1-008 | History search/filter               | Filter by QA property, tenant, date, or status.                  | Results match filters and stay scoped.                                   | Before/after filter.                 |
| OWN-D1-009 | Voided records                      | Find or toggle voided QA record if supported.                    | Voided row is auditable and excluded from active totals.                 | Voided evidence.                     |
| OWN-D1-010 | Handover review                     | Review QA handover.                                              | Rows and totals are visible and explainable.                             | Handover review.                     |
| OWN-D1-011 | Export/report                       | Generate export/report if available and approved for staging QA. | Export matches scope and excludes secrets.                               | Export summary, not credential data. |
| OWN-D1-012 | Dashboard vs history reconciliation | Compare selected dashboard totals to history rows.               | Differences are explainable; no unsupported production authority switch. | Reconciliation notes.                |

## 8. Required Screenshot Points

| Screenshot ID | Required Screenshot                          | Role           | Timing                       |
| ------------- | -------------------------------------------- | -------------- | ---------------------------- |
| SS-001        | Staging URL login page                       | all            | Before login                 |
| SS-002        | Employee login success                       | employee       | After login                  |
| SS-003        | Employee rent/deposit/short-pay form         | employee       | Before submit                |
| SS-004        | Employee submit result or validation message | employee       | After submit attempt         |
| SS-005        | Employee handover summary                    | employee       | Before/after handover submit |
| SS-006        | Duplicate submit or weak-network response    | employee       | During retry/second submit   |
| SS-007        | Owner dashboard overview                     | owner          | After owner login            |
| SS-008        | Owner history row for QA data                | owner          | After employee flow          |
| SS-009        | Due/overdue/arrears sections                 | owner          | During dashboard review      |
| SS-010        | Deposit section or history evidence          | owner          | During deposit review        |
| SS-011        | Search/filter before and after               | owner          | During history review        |
| SS-012        | Permission denial or filtered result         | employee/owner | During negative case         |
| SS-013        | Mobile employee form                         | employee       | Mobile pass                  |
| SS-014        | Mobile owner dashboard/history               | owner          | Mobile pass                  |
| SS-015        | Logout state                                 | employee/owner | End of role test             |

## 9. Bug Recording Rules

| Rule                       | Requirement                                            |
| -------------------------- | ------------------------------------------------------ |
| Use template               | Record every bug using `BUG_REPORT_TEMPLATE.md`.       |
| Use severity               | Assign P0, P1, P2, or P3.                              |
| Include role               | employee / owner / manager-admin.                      |
| Include device/browser     | Desktop or mobile, browser name/version if known.      |
| Include exact steps        | Steps must be reproducible by another tester.          |
| Include expected vs actual | Do not only write "not working".                       |
| Include evidence           | Screenshot or video with secrets masked.               |
| Mark impact                | Financial, data, and permission impact must be yes/no. |
| Never include secrets      | No password, token, cookie, or API key.                |

## 10. Must Stop Immediately

| Stop Condition                                                   | Severity | Required Action                                                               |
| ---------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| Money total changes incorrectly or duplicates financial row      | P0       | Stop related finance flow, preserve evidence, open bug, notify Ramadan Habib. |
| Deposit appears as rent income without explicit rule             | P0/P1    | Stop finance flow and open bug.                                               |
| Voided payment still affects active totals                       | P0/P1    | Stop related flow and open bug.                                               |
| Employee can see or write another tenant/property                | P1       | Stop permission tests, preserve evidence, open bug.                           |
| Owner sees another tenant/property data                          | P1       | Stop owner permission tests and open bug.                                     |
| Export/report leaks out-of-scope data                            | P1       | Stop export/report tests and open bug.                                        |
| Password/token/cookie appears in UI, screenshot, logs, or export | P1       | Stop, redact evidence, open security bug.                                     |
| Staging redirects to production or production URL is used        | P1       | Stop all tests and correct environment before continuing.                     |

## 11. Can Record And Continue

| Issue Type                                     | Severity        | Continue Rule                                            |
| ---------------------------------------------- | --------------- | -------------------------------------------------------- |
| Minor layout issue without blocked submit      | P3              | Record and continue.                                     |
| Text/copy issue                                | P3              | Record and continue.                                     |
| Slow page load without data corruption         | P2/P3           | Record timing and continue if flow remains safe.         |
| Filter usability issue with correct data scope | P2/P3           | Record and continue unrelated tests.                     |
| Non-critical export formatting issue           | P2/P3           | Record and continue if data scope is safe.               |
| Unclear accounting interpretation              | MANUAL_REQUIRED | Record as manual-required; continue non-dependent tests. |

## 12. Day 1 Pass Standard

| Area              | Day 1 Pass Standard                                                      |
| ----------------- | ------------------------------------------------------------------------ |
| Environment       | Only staging URL used; production remains untouched.                     |
| Accounts          | Employee and owner staging accounts confirmed without secrets in docs.   |
| Desktop employee  | Login, at least one safe entry path, validation path, and logout tested. |
| Desktop owner     | Dashboard, history, due/overdue/arrears, and logout tested.              |
| Mobile            | At least employee login/form and owner dashboard/history reviewed.       |
| Screenshots       | Required screenshots collected or explicitly marked not applicable.      |
| Bugs              | Every bug recorded with severity and impact.                             |
| Stop conditions   | No unresolved stop condition remains untriaged.                          |
| Production status | `PRODUCTION_NO_GO` confirmed.                                            |

Day 1 can pass with P2/P3 bugs if they are documented and no P0/P1 remains open.
Day 1 cannot pass if any P0/P1 is open, any cross-tenant leak is observed, or
production is touched.

## 13. End-of-Day Report Template

| Field                     | Value                                                          |
| ------------------------- | -------------------------------------------------------------- |
| QA Date                   |                                                                |
| Tester(s)                 |                                                                |
| Environment               | staging                                                        |
| Staging URL               | `https://homelink-finance-staging.habibramadan888.workers.dev` |
| Roles Tested              | employee / owner / manager-admin                               |
| Production Used?          | no                                                             |
| Production Cutover Status | `PRODUCTION_NO_GO`                                             |

| Area                        | Planned | Run | Pass | Fail | Blocked | Notes |
| --------------------------- | ------: | --: | ---: | ---: | ------: | ----- |
| Employee desktop            |         |     |      |      |         |       |
| Owner desktop               |         |     |      |      |         |       |
| Employee mobile             |         |     |      |      |         |       |
| Owner mobile                |         |     |      |      |         |       |
| Finance / receivables       |         |     |      |      |         |       |
| Handover                    |         |     |      |      |         |       |
| Tenant/property permissions |         |     |      |      |         |       |
| Export/report               |         |     |      |      |         |       |

| Bug ID | Severity | Area | Short Description | Status | Blocks Day 1 Pass? |
| ------ | -------- | ---- | ----------------- | ------ | ------------------ |
|        |          |      |                   |        |                    |

| Evidence ID | Screenshot / File | Related Test ID | Notes |
| ----------- | ----------------- | --------------- | ----- |
|             |                   |                 |       |

| End-of-Day Decision       | Value  |
| ------------------------- | ------ |
| Day 1 pass?               | yes/no |
| Continue Day 2?           | yes/no |
| Retest required?          | yes/no |
| Open P0/P1 bugs?          | yes/no |
| Production remains NO-GO? | yes    |

## Final Boundary

Completing Day 1 internal staging QA does not approve production, public beta,
commercial launch, migration, deploy, D1 write, feature flags, or dashboard
authority switch.
