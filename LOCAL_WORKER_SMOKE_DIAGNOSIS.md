# Local Worker Smoke Diagnosis

Date: 2026-05-23  
Task: P0-007A repeatable local Worker + Auth Smoke

## Diagnosis Summary

The original smoke failure was primarily a test orchestration failure, not a confirmed business logic failure.

Before this task:

- `npm run smoke` expected `http://127.0.0.1:8793`.
- `npm run smoke:auth` expected `http://127.0.0.1:8793`.
- Neither script started the Worker.
- Neither script waited for Worker readiness.
- If Worker was not already running, both failed with a low-signal `fetch failed`.

After this task:

- `npm run dev:worker` starts the local Worker on `http://127.0.0.1:8793`.
- `npm run wait:worker` waits until `/api/me` returns a ready status.
- `npm run smoke:with-worker` starts Worker, waits for readiness, runs `smoke`, runs `smoke:auth`, and stops Worker.
- Local dev seed is gated by `APP_ENV=development` and `ALLOW_DEV_SEED=true`.

## Required Local Base URL

- Smoke base URL: `http://127.0.0.1:8793`
- Source: `scripts/smoke-worker.mjs`, `scripts/smoke-auth.mjs`, `scripts/local-worker-utils.mjs`
- Override: `SMOKE_BASE_URL`

## Worker Startup Command

`npm run dev:worker`

Internally this runs Wrangler in local mode with:

- config: `deploy-worker/wrangler.toml`
- port: `8793`
- local persistence: `deploy-worker/.wrangler/local-dev`
- production deploy: no
- remote D1 mutation: no

## Wrangler Default Port

Wrangler commonly defaults to `8787`, while this project smoke expects `8793`. This mismatch was one source of repeatability risk. The new scripts set the port explicitly to `8793`.

## Root Cause Matrix

| Check                  | Result                            | Evidence                                                              | Meaning                                                    |
| ---------------------- | --------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| smoke base URL         | Confirmed `http://127.0.0.1:8793` | `scripts/smoke-worker.mjs`, `scripts/smoke-auth.mjs`                  | Base URL is now centralized in `local-worker-utils.mjs`    |
| Worker startup command | Added                             | `npm run dev:worker`                                                  | Local Worker can be started consistently                   |
| Port mismatch          | Resolved for scripts              | explicit `--port 8793`                                                | No dependency on Wrangler default port                     |
| Worker startup failure | Not reproduced after script fix   | `npm run smoke:with-worker` passed                                    | Current Worker can start locally                           |
| Missing `.dev.vars`    | Guarded                           | `scripts/generate-dev-secrets.mjs`, `deploy-worker/.dev.vars.example` | Script now fails clearly if local secrets are missing      |
| Missing `JWT_SECRET`   | Guarded                           | `scripts/smoke-auth.mjs` checks before login                          | Auth smoke cannot silently pass without JWT secret         |
| Missing D1 binding     | Not present                       | Wrangler dry-run shows `env.DB (homelink)`                            | Binding exists in config                                   |
| Missing KV binding     | Not present                       | Wrangler dry-run shows `env.RATE_LIMIT`                               | Binding exists in config                                   |
| Missing local D1 data  | Partially acceptable              | Auth smoke passes; clean employee entry still fails                   | Auth path works, commercial entry bootstrap remains P0-005 |
| Local D1 bootstrap     | Blocked for employee entry        | `npm run probe:clean-bootstrap` fails: `no such table: transactions`  | Not solved in P0-007A                                      |
| Smoke auto-start       | Fixed                             | `scripts/smoke-with-worker.mjs`                                       | One command can run Worker + smoke                         |
| Smoke ready wait       | Fixed                             | `scripts/wait-for-worker.mjs` and `waitForWorker()`                   | No blind race against Worker startup                       |

## Verification Evidence

```text
npm run smoke:with-worker
PASS Worker ready at http://127.0.0.1:8793
PASS employee page 200 http://127.0.0.1:8793/employee-v3.html
PASS owner page 200 http://127.0.0.1:8793/index-51.html
PASS unauthenticated api 401 http://127.0.0.1:8793/api/me
PASS smoke
PASS unauthenticated /api/me rejected 401
PASS invalid jwt rejected 401
PASS owner login 200
PASS owner /api/me 200
PASS owner role manager
PASS owner allowed /api/rent_config 200
PASS employee login 200
PASS employee /api/me 200
PASS employee role staff
PASS employee denied owner history 403
PASS employee allowed rent config 200
PASS smoke:auth
Local Worker stopped.
```

## Classification

- Business failure: no for the original smoke failure.
- Test orchestration failure: yes, fixed by `smoke:with-worker`.
- Local environment failure: partially, fixed by dev secret preflight and explicit Worker start.
- D1 schema failure: yes for clean employee entry; remains P0-005.
- Auth secret failure: no after local `.dev.vars` and preflight checks.

## Remaining Risk

P0-007A is verified for repeatable local Worker startup and auth boundary smoke. It does not verify employee handover submit, export, owner dashboard statistics, or clean D1 commercial bootstrap. Those remain covered by P0-002, P0-003, P0-005, and P1 authenticated E2E work.
