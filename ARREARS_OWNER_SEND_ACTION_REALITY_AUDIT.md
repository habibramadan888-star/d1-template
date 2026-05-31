# Arrears Owner Send Action Reality Audit

Date: 2026-05-31

## Result

| Check | Finding |
|---|---|
| Button | `下发员工` is enabled from selected checkbox count only. |
| Effective function | Last `sendArrearDirectives()` definition is the active browser function. |
| Real API call | No real write API is called by the active owner UI function. |
| Legacy endpoint | Earlier stale duplicate function referenced `/api/arrear_tasks/directive`; it is now renamed/disabled and no longer calls that endpoint. |
| selectedTaskIds | Read from checked `[data-arrear-select]` elements and mapped through `ownerArrearsSelectedRows()`. |
| requestedDate dependency | Active controls do not require requested date / employee target / directive enabled flags. |
| write gate off behavior | UI explicitly says real dispatch is not enabled and no employee inbox write occurred. |
| readonly_admin | Write controls are hidden behind `isOwnerWriteRole()`. |

## Root Cause Classification

| Cause | Status | Notes |
|---|---|---|
| DRY_RUN_SHOWN_AS_REAL_SUCCESS | Confirmed | Previous toast could be interpreted as successful employee dispatch. |
| API_NOT_CALLED | Confirmed for active UI | Active UI generated only WhatsApp/dry-run list, so employee inbox did not receive a directive. |
| WRITE_GATE_OFF_BUT_UI_SUCCESS | Confirmed UX issue | Production write gate remains off; UI must not claim actual dispatch. |
| LEGACY_ENDPOINT_PRESENT | Confirmed stale code | Dead duplicate path existed and was removed from real execution text path. |

## Required Fix

- Keep owner batch send as dry-run unless a separate production write approval opens the gate.
- Do not show real success text unless `/api/boss/arrears/directives` succeeds.
- Direct users to WhatsApp/manual workflow while production write gate is off.

Production cutover remains `PRODUCTION_NO_GO`.
