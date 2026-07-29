# NEXT PROMPT: READONLY_ADMIN_LOCKDOWN_001

Goal: prove `readonly_admin` is read-only at both frontend and backend layers.

Strict bans:

- Do not print passwords, tokens, or cookies.
- Do not commit secrets.
- No production deploy unless explicitly approved.
- No D1 write.
- No migration.
- No D1 export/import/execute.
- No employee entry write.
- No handover submit.
- No void/delete.
- No settings mutation.

## Current Evidence To Recheck

- `READONLY_ADMIN_ROLES = ["admin_readonly", "readonly_admin"]`.
- `canWriteOwnerData(user)` returns true only for manager.
- `/api/me` returns `canWrite`.
- Owner shell toggles `.readonly-admin` and hides write controls.
- Tests exist for readonly admin role and portal.

## Required Backend Audit

Create an endpoint catalog for every mutation:

- POST
- PUT
- PATCH
- DELETE

For each mutation, verify:

```text
readonly_admin request -> 403
owner/manager request -> allowed only if business rules allow
employee request -> forbidden unless employee endpoint explicitly allows
```

Must include at least:

- employee entry write
- handover submit
- void/delete session
- settings update
- customer create/update/delete
- deposit offset/deduct/return
- arrears clear/update
- WiFi/network settings update

## Required Frontend Audit

Readonly admin mode must:

- show dashboard/history/clients/analysis read-only views
- hide or disable write buttons
- disable write inputs/selects/textareas
- show a subtle read-only indicator
- never rely on hidden buttons as the only security

## Required Tests

Add or update:

- `tests/readonly-admin-lockdown.spec.mjs`

Must cover:

- readonly admin can GET dashboard data.
- readonly admin can GET history data.
- readonly admin can GET clients data.
- readonly admin POST/PUT/PATCH/DELETE mutation attempts return 403.
- frontend write controls hidden or disabled.
- localStorage role tamper does not enable writes.
- production cutover remains `PRODUCTION_NO_GO`.

## Verification

Run:

```bash
npm run format:check
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run test:readonly-admin-role
npm run test:readonly-admin-portal
npm run test:readonly-admin-unified-login
npm run qa:employee-entry-staging
```

## Exit Standard

- Every known mutation denies readonly admin with backend 403.
- Frontend read-only mode is clear.
- No real business write is executed.
- No D1 write.
- `gate:commercial-launch = PRODUCTION_NO_GO`.
