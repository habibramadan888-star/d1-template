# Arrears Owner 40 Directives Reality Audit

Date: 2026-06-01, Asia/Dubai

Scope: explain why the owner-side screen can show/select 40 arrears tasks while Abdul employee Follow-up shows `1 ASSIGNED`.

Safety boundary: no production write gate, no production D1 write, no D1 execute/export/import, no owner directive create, no employee follow-up write, no deploy.

## Finding

Root cause classification:

- `OWNER_40_IS_DRY_RUN`
- `OWNER_40_IS_SELECTED_ONLY`
- `OWNER_40_IS_UI_SUMMARY_NOT_PERSISTED`
- `OWNER_UI_MISLEADING_COPY`

Not supported by current evidence:

- `OWNER_40_REAL_WRITE_BUT_EMPLOYEE_FILTER_MISMATCH`

## Evidence

| Source | Count | Meaning | Real Write? | Employee Should See? |
|---|---:|---|---|---|
| owner visible arrears cards / selected checkboxes | up to current filtered list, user reported 40 | UI selection or current filtered task pool | No | No |
| owner `sendArrearDirectives()` before this fix | selected checkbox count | dry-run WhatsApp/export list count | No | No |
| owner `POST /api/boss/arrears/directives` backend | only when write gate is explicitly approved | persisted directive rows | Yes, only under approval | Yes, if assigned to that employee |
| existing production minimal smoke | 1 task | approved smoke row only | Yes, within approved scope | Yes, then cleaned/restored for that smoke |
| Abdul real inbox rollout / phone acceptance | 1 task | persisted assigned directive visible to Abdul | Yes, previously approved | Yes |
| employee `/api/employee/arrears/directives` UI count | 1 observed | persisted assigned directives returned by employee API | No write, read only | Yes |

## Owner Button / Handler Audit

- The active owner UI action is `sendArrearDirectives()` in `deploy-worker/public/index-51-main.js`.
- It reads checked `data-arrear-select` boxes and builds a WhatsApp/dry-run list with `buildArrearsWhatsAppText(rows)`.
- It does not call `apiFetch`, `POST /api/boss/arrears/directives`, or any write endpoint.
- The backend real write route remains `POST /api/boss/arrears/directives`.
- The backend route returns `production_write_approval_required` while `ARREARS_DIRECTIVE_WRITE_APPROVED` / `ARREARS_DIRECTIVE_WRITE_MODE` are not enabled.

## Copy Risk Found

Before this task, the selected-count button used copy equivalent to `下发员工（N）`. Although the toast said dry-run, the button label could still be interpreted as real dispatch.

Fix applied:

- Button text now says `生成下发清单`.
- Selected state now says `生成下发清单（N）`.
- Toast now says selected rows are a dry-run list and employees will not receive them.

## Conclusion

The employee page showing `1 ASSIGNED` is consistent with the current approved persisted-directive evidence. The owner-side `40` is not evidence of 40 real production directives; it is a selected/current UI dry-run count unless a separately approved production rollout writes those rows.

Production cutover: `PRODUCTION_NO_GO`.
