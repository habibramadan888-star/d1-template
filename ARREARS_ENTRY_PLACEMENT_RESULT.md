# Arrears Entry Placement Result

## Decision

The main portal is a role-selection surface only. Arrears management is not a fourth identity and must only appear after a user enters the correct role workspace.

| Role           | Where arrears appears      | Permission          |
| -------------- | -------------------------- | ------------------- |
| employee       | employee follow-up tasks   | assigned tasks only |
| owner          | owner arrears management   | manage/review       |
| readonly_admin | owner/admin read-only view | read only           |

## Verification

- Main portal no longer includes `欠款管理（新版指令功能）`.
- Owner workspace still includes `data-view="arrears"` and `renderArrearsPanel()`.
- Employee workspace keeps arrears follow-up task handling inside the employee app.
- Readonly admin protection remains in `denyReadonlyAdminWrite()` and backend readonly role checks.

## Guardrails

- No business data was modified.
- No D1 command was run.
- No migration was run.
- Production cutover remains `PRODUCTION_NO_GO`.
