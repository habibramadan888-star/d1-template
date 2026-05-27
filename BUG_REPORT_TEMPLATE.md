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

## Unified Login UX Bug Notes

Use these expected results when reporting unified-login bugs:

| Scenario                                      | Expected Result                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Owner login after unified-login route         | Owner destination shows `Checking session` first, then dashboard; no legacy password flash. |
| Browser back to unified-login while signed in | Page shows signed-in panel with Continue and Clear session choices; no automatic loop.      |
| Employee login after unified-login route      | Employee destination should not ask for a second PIN if `/api/me` confirms employee/staff.  |
| Any successful live login smoke               | Requires separate approval because it can write production D1 `active_sessions`.            |
