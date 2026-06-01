# Arrears Directive Assigned Employee Mapping Audit

Date: 2026-06-01, Asia/Dubai

Scope: verify whether owner write field and employee read filter use the same assignment identity.

## Mapping Table

| Field | Owner Write Uses | Employee Read Uses | Match? |
|---|---|---|---|
| company scope | `user.corpid` | `WHERE corpid=?` bound to `user.corpid` | yes |
| assigned employee | `assignedFallback || old.userid || actor` written to `userid` | `WHERE userid=?` bound to `user.userid` | yes |
| response assigned id | `empTaskToEmployeeDirective(updated)` reads `t.userid` | `assigned_employee_id: cleanText(t?.userid)` | yes |
| role guard | `requireManager(user)` | `isStaffRoleValue(user?.role)` | yes |
| closed-row filter | open task required before create | closed/void/waived rows excluded during employee read | yes |
| active directive statuses | `assigned` after approved write | `assigned/pending/viewed/promised/followed_up/needs_review/overdue` | yes |

## Findings

- The source code does not show an owner/employee identifier mismatch for the Abdul one-task path.
- If a real rollout wrote 40 directives to `userid=abdul`, the employee API should return up to 100 active matching rows.
- The current `1 ASSIGNED` observation therefore points to only one persisted active Abdul directive, not a UI render cap.

## Boundary

This audit did not execute production reads or writes. It is a source-contract audit plus documented production evidence review.

Production cutover: `PRODUCTION_NO_GO`.
