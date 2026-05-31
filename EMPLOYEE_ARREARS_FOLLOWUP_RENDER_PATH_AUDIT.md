# Employee Arrears Follow-up Render Path Audit

Date: 2026-06-01 Asia/Dubai

Scope: local render-path audit plus live-path comparison. No production write, write gate, migration, or deploy was executed.

## Render Path

| UI Element | Source Function | Current Local Logic | Expected Logic | Gap |
|---|---|---|---|---|
| Boss assigned task card | `employeeDirectiveCard` | Renders boss directive card and status tag from directive data | Use persisted-state model for status and button copy | Fixed locally in `223cbbb`, not deployed live |
| Status badge | `updateEmployeeDirectivePersistedState` | Uses persisted feedback and dirty state to show saved / unsaved copy | Same model must drive status and submit button | Not present in live asset |
| Submit button | `updateEmployeeDirectivePersistedState` and `saveEmployeeDirectiveFollowup` | Saved/unchanged feedback shows saved state; dirty edits can submit/gate-warning | Button must not use stale submit-only model | Not present in live asset |
| Gate-off toast | `saveEmployeeDirectiveFollowup` | Only dirty/new submission path shows write-gate warning | Existing saved feedback click should not show write-gate warning | Live still behaves like older handler |
| Owner assigned/followed-up action | `renderArrearCardActions` | Assigned/viewed/followed-up tasks render disabled state buttons | Do not show clickable primary `下发员工` for already assigned/followed-up tasks | Not present in live asset |

## Renderer Inventory

| Renderer | Purpose | Risk |
|---|---|---|
| `employeeDirectiveCard` | Dedicated boss assigned directive card | Needs deployed persisted-state model |
| `followupCard` | Legacy/system reminders card | Separate system reminder flow; not the Abdul boss directive path |
| `saveEmployeeDirectiveFollowup` | Boss directive follow-up click handler | Live still appears to use old behavior because deployed asset lacks current fix |
| `renderArrearCardActions` | Owner arrears card actions | Live lacks assigned/followed-up disabled state markers |

## Root Cause Classification

`LEGACY_CLICK_HANDLER_ACTIVE` due to `LIVE_NOT_DEPLOYED`.

The local code has the state model, but live assets do not. The practical live path remains the older click-handler behavior.

Production cutover remains `PRODUCTION_NO_GO`.
