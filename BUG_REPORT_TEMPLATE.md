# Bug Report Template

Use this template for internal staging QA bugs. Do not include passwords,
tokens, cookies, or unmasked sensitive screenshots.

| Field                 | Value                          |
| --------------------- | ------------------------------ |
| Bug ID                |                                |
| Reporter              |                                |
| Date / Time           |                                |
| Environment           | staging                        |
| Role                  | employee / owner / manager     |
| Device                |                                |
| Browser               |                                |
| Steps to Reproduce    |                                |
| Expected Result       |                                |
| Actual Result         |                                |
| Screenshot / Evidence |                                |
| Severity              | P0 / P1 / P2 / P3              |
| Financial Impact      | yes/no                         |
| Data Impact           | yes/no                         |
| Permission Impact     | yes/no                         |
| Suggested Owner       |                                |
| Status                | open / fixed / retest / closed |

## Severity Guide

| Severity | Meaning                                                                | Required Response                                        |
| -------- | ---------------------------------------------------------------------- | -------------------------------------------------------- |
| P0       | Direct financial corruption, data loss, or unsafe duplicate write      | Stop affected QA flow and escalate immediately.          |
| P1       | Permission leak, cross-tenant data exposure, or major blocked workflow | Stop affected scope and require fix/retest before pilot. |
| P2       | Important functional bug with workaround                               | Track and decide whether pilot can continue.             |
| P3       | Usability, copy, layout, or minor display issue                        | Track for cleanup; does not block internal QA by itself. |

## Design-System UX Bug Notes

| Scenario                                            | Suggested Severity | Expected Result                                                                                                    |
| --------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Owner UI still visibly looks older than employee UI | P1                 | Owner and employee should feel like one SaaS product with same typography, cards, buttons, inputs, and background. |
| Owner second login panel flashes before auth check  | P1                 | Owner should show auth loading first, then dashboard or fallback login after `/api/me`.                            |
| Owner mobile layout blocks dashboard/history review | P1                 | Mobile owner dashboard must remain usable and readable.                                                            |
| Owner mobile layout is awkward but usable           | P2                 | Record screenshots and affected viewport.                                                                          |
| Shared token styling regresses employee page        | P1                 | Employee page should remain the visual baseline.                                                                   |

## Unified Login UX Bug Notes

Use these expected results when reporting unified-login bugs:

| Scenario                                      | Expected Result                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Owner login after unified-login route         | Owner destination shows `Checking session` first, then dashboard; no legacy password flash. |
| Browser back to unified-login while signed in | Page shows signed-in panel with Continue and Clear session choices; no automatic loop.      |
| Employee login after unified-login route      | Employee destination should not ask for a second PIN if `/api/me` confirms employee/staff.  |
| Any successful live login smoke               | Requires separate approval because it can write production D1 `active_sessions`.            |

## Owner UX Stabilization Bug Notes

| Scenario                                        | Suggested Severity | Expected Result                                                                                                          |
| ----------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Login remembers password / PIN                  | P0                 | App may remember only username / account. Password storage by app code is forbidden.                                     |
| Owner topbar still shows `老板` badge           | P2                 | Badge should be removed; server session remains the authority.                                                           |
| Owner overview gives no business decision value | P1/P2              | Overview should show today's receipts, outstanding amount, pending items, handover/alerts, recent flow, and quick links. |
| Owner history has 15-20 second blank load       | P1                 | History should show loading skeleton quickly and load recent rows first.                                                 |
| Owner mobile typography/cards are too large     | P1/P2              | Mobile owner pages should increase useful information density while remaining readable.                                  |

## Auth Routing Stabilization Bug Notes

| Scenario                                                     | Suggested Severity | Expected Result                                                                                                         |
| ------------------------------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Any old login panel appears after opening a role destination | P1                 | Unauthenticated `index.html` and `employee-v3.html` should redirect to `unified-login.html` without legacy login flash. |
| Lock/logout opens an old login page                          | P1                 | Lock/logout should clear session state and route to `unified-login.html`.                                               |
| Employee header displays `staff` as the person name          | P1                 | UI should show display name, username, or employee id; `staff` is only a role.                                          |
| Owner history shows no feedback for more than 5 seconds      | P1                 | History should show skeleton/loading quickly and load recent records first.                                             |
| Owner network/WiFi entry is missing                          | P2/P1              | Entry should be visible or documented as manual-required; severity depends on operational impact.                       |

## AUTH-UI-STABILIZATION-002 Bug Classification Addendum

| Condition                                                    | Severity |
| ------------------------------------------------------------ | -------- |
| Old employee PIN login is visible to a user                  | P0/P1    |
| Old owner login is visible to a user                         | P0/P1    |
| Lock/logout routes anywhere except unified login             | P1       |
| Employee identity displays `staff` instead of actual account | P1       |
| Owner history shows no feedback for more than 5 seconds      | P1       |
| Owner control panel mobile layout breaks                     | P1/P2    |
| Arrears detail modal is unreadable on mobile                 | P1/P2    |
| Employee top tab labels are inconsistent or truncated        | P2       |
