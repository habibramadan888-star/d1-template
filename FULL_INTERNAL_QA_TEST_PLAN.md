# Full Internal QA Test Plan

Date: 2026-05-27, Asia/Dubai

Scope: internal staging manual QA only. This plan does not approve public beta,
production migration, production deploy, production D1 write, production feature
flags, dashboard production authority switch, or commercial launch.

## Environment

| Item                      | Value                                                          |
| ------------------------- | -------------------------------------------------------------- |
| Environment               | staging                                                        |
| Staging URL               | `https://homelink-finance-staging.habibramadan888.workers.dev` |
| Production used?          | No                                                             |
| Production equivalent?    | No                                                             |
| Production cutover status | `PRODUCTION_NO_GO`                                             |
| Test data policy          | QA-marked staging evidence only                                |
| Password / token handling | Never paste into docs, screenshots, tickets, or chat           |

## Roles

| Role          | Purpose                                                      | Account Handling                             |
| ------------- | ------------------------------------------------------------ | -------------------------------------------- |
| employee      | Staff entry, rent/deposit/arrears/handover flows             | Staging-only credentials from secure channel |
| owner         | Dashboard, history, reports, reconciliation, review flows    | Staging-only credentials from secure channel |
| manager/admin | Tenant/property permission boundary checks if account exists | Staging-only credentials from secure channel |

## Test Cycle

| Round   | Focus                                   | Required Output                                                           | Pass Standard                                                                     |
| ------- | --------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Round 1 | Functional usability                    | Employee and owner scripts completed                                      | Core pages load, login/logout works, no P0/P1 functional blocker                  |
| Round 2 | Financial flows                         | Evidence for rent, deposit, arrears, short-pay, repayment, void, handover | Amounts and status changes are explainable and match expected accounting rules    |
| Round 3 | Permissions / exceptions / weak network | Negative cases, duplicate submit, mobile, refresh/back navigation         | Unauthorized access denied, duplicate/weak-network behavior safe, no data leakage |

## Pass Criteria

| Area                  | Pass Criteria                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Employee flow         | Rent, deposit, arrears, short-pay, repayment, void, and handover scenarios are completed or have documented blockers.  |
| Owner flow            | Dashboard, history, search/filter, handover review, and report/export behavior are reviewed with screenshots or notes. |
| Finance flow          | Rent income, deposit liability, arrears, overdue, overpayment, and void behavior match the accepted staging rules.     |
| Tenant/property scope | Employee, owner, and manager/admin access is constrained to expected tenant/property boundaries.                       |
| Mobile usability      | Required employee and owner flows are usable on phone viewport.                                                        |
| Bug threshold         | No open P0/P1 bug remains before closed-pilot recommendation.                                                          |
| Launch boundary       | Production remains `PRODUCTION_NO_GO`; internal QA does not become public beta or launch approval.                     |

## Failure Handling

| Failure Type                         | Required Action                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| P0 financial or data corruption risk | Stop the affected flow, create bug report, notify Ramadan Habib, and do not continue related tests until triaged. |
| P1 permission or cross-tenant risk   | Stop permission testing, preserve evidence, create bug report, and keep production NO-GO.                         |
| P2 functional defect                 | Record steps, expected/actual result, screenshot, and continue unrelated tests if safe.                           |
| P3 usability issue                   | Record notes and screenshots; group for later UI cleanup.                                                         |
| Unclear accounting behavior          | Mark `MANUAL_REQUIRED`; do not invent pass/fail.                                                                  |

## Evidence Rules

| Evidence Type      | Required Content                                        | Redaction                                                          |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------ |
| Screenshot         | Page, role, date/time, masked tenant/customer if needed | Mask passwords, tokens, cookies, personal phone numbers if visible |
| Video              | Only if a bug needs sequence proof                      | No credentials or tokens visible                                   |
| Export/report file | Store as staging QA evidence only                       | Do not upload production data                                      |
| Bug report         | Use `BUG_REPORT_TEMPLATE.md`                            | No secrets or passwords                                            |

## Explicit Non-Goals

| Non-Goal                    | Reason                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Production deploy           | Not approved.                                                                                                               |
| Production migration        | Not approved.                                                                                                               |
| Production D1 write         | Not approved.                                                                                                               |
| Staging D1 write from Codex | This package is documentation only; manual QA may create QA-marked staging evidence through the app if separately approved. |
| Public beta                 | Internal QA is not public beta.                                                                                             |
| Commercial launch GO        | Launch gate remains `PRODUCTION_NO_GO`.                                                                                     |
