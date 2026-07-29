# NEXT PROMPT: AUTH_ROUTE_CLOSURE_001

Goal: close old login paths and make `/` the only formal product entry.

Strict bans:

- No production deploy unless explicitly approved.
- No D1 write.
- No migration.
- No D1 export/import/execute.
- No dashboard calculation change.
- No financial formula change.
- No secret printing or committing.
- No business write QA.

## Current Evidence To Recheck

- `deploy-worker/src/index.js` redirects:
  - `/login` and `/unified-login.html` to `/`
  - `/employee-v3.html` to `/employee`
  - `/index.html` to `/owner`
- Physical compatibility files still exist:
  - `deploy-worker/public/unified-login.html`
  - `deploy-worker/public/employee-v3.html`
  - `deploy-worker/public/index.html`
  - `deploy-worker/public/index-51.html`
- Worker asset freshness and embedded worker drift must be checked before any deploy.

## Required Implementation

1. Keep `/` as the only public entry.
2. Ensure old paths never show old login UI:
   - `/unified-login.html`
   - `/employee-v3.html`
   - `/index.html`
   - `/employee.html`
   - `/owner.html`
   - `/employee-login`
   - `/owner-login`
   - `/admin-login`
3. All logout/lock handlers must go to `/`.
4. Do not serve old employee PIN login or old owner login to users.
5. If files must remain for asset compatibility, add source comments and tests proving Worker redirects win.

## Required Tests

Add or update:

- `tests/auth-route-closure.spec.mjs`

Must cover:

- GET `/` renders three portal.
- GET `/unified-login.html` redirects to `/`.
- GET `/employee-v3.html` redirects to `/employee`.
- GET `/index.html` redirects to `/owner`.
- Unauthenticated `/employee`, `/owner`, `/admin` redirect to `/`.
- No old employee PIN login is user visible.
- No old owner login is user visible.
- Logout from employee/owner/admin returns `/`.
- Production cutover remains `PRODUCTION_NO_GO`.

## Verification

Run:

```bash
npm run format:check
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run test:route-normalization
npm run test:legacy-login-hidden
npm run test:logout-to-root
npm run qa:employee-entry-staging
```

`qa:employee-entry-staging` must remain `MANUAL_REQUIRED / DRY_RUN_ONLY`.

## Exit Standard

- Old paths cannot show login UI.
- `/` is documented as the only formal entry.
- No D1 write.
- No deploy without explicit approval.
- `gate:commercial-launch = PRODUCTION_NO_GO`.
