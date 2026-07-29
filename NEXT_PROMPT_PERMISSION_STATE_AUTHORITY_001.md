# NEXT PROMPT: PERMISSION_STATE_AUTHORITY_001

Goal: freeze frontend permission state authority to `/api/me` and verified server session.

Strict bans:

- No production deploy unless explicitly approved.
- No D1 write.
- No migration.
- No D1 export/import/execute.
- No business formula changes.
- No dashboard calculation changes.
- No secret printing or committing.

## Current Evidence To Recheck

- `deploy-worker/src/index.js` uses `readRouteClaim()` for route guards.
- `/api/me` returns identity, role, `isReadonlyAdmin`, and `canWrite`.
- Portal/employee/owner shells clear stale `homelink:role`, `owner:role`, and employee user keys.
- `modules/auth/tenant-claims.mjs` defines richer target claims with `permissions` and `allowed_property_ids`.

## Required Implementation

1. Add or finalize a small auth state helper for all front-end shells:
   - fetch `/api/me`
   - expose `user`, `role`, `canWrite`, `isLoading`
   - ignore localStorage role
2. Remove all authority decisions from:
   - `localStorage.getItem("role")`
   - `sessionStorage.getItem("role")`
   - `owner:role`
   - `homelink:role`
3. Keep localStorage only for:
   - remembered username
   - non-sensitive UI preference
   - employee local drafts, scoped by authenticated employee ID
4. Expand `/api/me` target contract to include:
   - `permissions`
   - `tenant_id`
   - `allowed_property_ids`
5. Do not trust front-end selected portal for authority.

## Required Tests

Add or update:

- `tests/permission-state-authority.spec.mjs`

Must cover:

- Stale localStorage role does not change route access.
- Stale localStorage role does not show write controls.
- `/api/me` role decides employee/owner/admin destination.
- `/api/me canWrite=false` disables owner write UI.
- Missing `/api/me` identity redirects to `/`.
- Production cutover remains `PRODUCTION_NO_GO`.

## Verification

Run:

```bash
npm run format:check
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run test:role-guard-closure
npm run test:readonly-admin-portal
npm run test:employee-identity-display
npm run qa:employee-entry-staging
```

## Exit Standard

- No permission decision relies on localStorage/sessionStorage role.
- `/api/me` is the UI authority.
- Frontend selected portal is not authority.
- No D1 write.
- `gate:commercial-launch = PRODUCTION_NO_GO`.
