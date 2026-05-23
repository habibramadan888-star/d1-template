# Run Report

Date: 2026-05-23  
Mode: NIGHT SHIFT local validation  
Scope: governance, engineering baseline, local startup checks  
Production deploy: not executed  
Production database mutation: not executed

## Summary

Local static/Worker startup is viable. The engineering baseline now exists, but full validation is blocked by legacy lint errors and missing local authentication secrets.

## Commands Executed

### Governance

Command:

```bash
npm run governance:check
```

Result:

```text
Governance check passed.
```

Status: PASS

### Dependency Install

Command:

```bash
npm install
```

Result:

```text
added 122 packages
found 0 vulnerabilities
```

Status: PASS

### Typecheck / Syntax Check

Command:

```bash
npm run typecheck
```

Result:

```text
node --check deploy-worker/src/index.js
node --check deploy-worker/scripts/build-embedded-worker.js
node --check index-51-main.js
```

Status: PASS

### Format Check

Command:

```bash
npm run format:check
```

Result:

```text
All matched files use Prettier code style.
```

Status: PASS

### Build Dry Run

Command:

```bash
npm run build
```

Result:

```text
wrangler deploy --config wrangler.toml --dry-run
wrangler deploy --config wrangler.embedded.toml --dry-run
```

Status: PASS

Notes:

- Assets Worker dry-run upload size: 109.22 KiB / gzip 22.93 KiB
- Embedded Worker dry-run upload size: 1031.46 KiB / gzip 303.38 KiB
- No production deployment was executed.

### Lint

Command:

```bash
npm run lint
```

Status: FAIL

Errors:

```text
deploy-worker/src/index.js
  752:38  no-control-regex
  986:1   no-irregular-whitespace

index-51-main.js
  2372:10 Parsing error: Identifier 'rc_renderCfg' has already been declared
```

Assessment:

- These are existing legacy code issues.
- They were not auto-fixed because that would touch business/legacy logic.
- The duplicate declaration in owner-side code needs a dedicated small fix after review.

### Local D1 Connection

Command:

```bash
npx wrangler d1 execute homelink --local --config deploy-worker/wrangler.toml --command "SELECT type,name FROM sqlite_master WHERE type IN ('table','index') ORDER BY type,name;"
```

Status: PASS

Observed local tables/indexes:

```text
_cf_METADATA
active_sessions
employee_users
sqlite_autoindex_active_sessions_1
sqlite_autoindex_employee_users_1
```

Risk:

- Clean local D1 does not show full business schema.
- Current runtime/migration path does not prove clean commercial bootstrap.

### Local Worker Startup

Command:

```bash
cd deploy-worker
npx wrangler dev --config wrangler.toml --port 8793
```

Status: PASS

Checks:

```text
GET /employee-v3.html 200
GET /index-51.html    200
GET /api/me           401
```

Expected:

- `GET /api/me` returns 401 when unauthenticated.

Login check:

```text
POST /auth/employee-login 503
Error: jwt_secret_missing
```

Status: FAIL

Reason:

- Local secrets are missing.
- `.env.example` was created, but real local `.dev.vars` was not created because it must contain developer-provided secrets.

### Embedded Worker Startup

Command:

```bash
cd deploy-worker
npx wrangler dev --config wrangler.embedded.toml --port 8794
```

Status: PASS

Checks:

```text
GET /                 200
GET /employee-v3.html 200
GET /index-51.html    200
```

## Error Categories

### Startup Errors

- No startup error for static pages.
- Authenticated employee flow blocked by missing `JWT_SECRET`.

### Build Errors

- No dry-run build error.

### API Errors

- `/api/me` unauthenticated returns 401 correctly.
- `/auth/employee-login` returns 503 locally because `JWT_SECRET` is missing.

### Permission Errors

- Not fully validated because login cannot complete without local secrets.
- Server-side auth gate is present for unauthenticated access.

### D1 Errors

- D1 local connection works.
- Clean bootstrap schema is incomplete or not proven.

### Cloudflare Errors

- Wrangler dev and dry-run deploy worked locally.
- No production deploy was attempted.

## Next Safe Actions

1. Create a real local `.dev.vars` from `.env.example` using non-production secrets.
2. Add a password-hash generation helper for local setup.
3. Fix lint blockers in isolated changes:
   - Worker control-regex lint handling
   - Worker irregular whitespace
   - owner-side duplicate `rc_renderCfg`
4. Build a clean D1 migration chain before any commercial onboarding.

## NIGHT SHIFT V2 Update

Date: 2026-05-23

### Safe Fixes Applied

- Updated ESLint parsing boundaries so legacy browser scripts and Worker module code are checked with the correct source type.
- Fixed Worker lint blockers caused by control-character regex handling and an irregular invisible character.
- Added non-invasive smoke/audit scripts:
  - `scripts/smoke-worker.mjs`
  - `scripts/audit-api.mjs`
  - `scripts/audit-db.mjs`
- Added `.env.local.example` as a safe local-only template.
- Added `audit:api`, `audit:db`, and `smoke` npm scripts.

### V2 Commands Passing

```bash
npm run governance:check
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run check
npm run smoke
```

### V2 Smoke Result

Local Worker on port 8793:

```text
GET /employee-v3.html 200
GET /index-51.html    200
GET /api/me           401
```

### Remaining Runtime Gaps

- Authenticated employee/owner flows still require local non-production secrets.
- D1 clean commercial bootstrap is still not proven.
- Embedded Worker generated source was not regenerated because expanding generated giant files is prohibited during this audit.

### Added Test Layer

Command:

```bash
npm run test
```

Result:

```text
tests 6
pass 6
fail 0
```

Coverage:

- governance reports exist and are non-empty,
- commercial blockers are explicitly tracked,
- `.env.local` / `.dev.vars` protection exists,
- root npm Cloudflare deploy commands remain dry-run only,
- Worker auth gate remains present,
- known financial risks remain documented while business logic is not modified.

### Port Cleanup

After local smoke, the leftover local Worker child process on port 8793 was stopped. Final port state showed only `TimeWait`, not an active listener.
