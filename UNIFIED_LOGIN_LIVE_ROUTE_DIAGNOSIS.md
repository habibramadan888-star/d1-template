# Unified Login Live Route Diagnosis

Date: 2026-05-28

## Scope

This diagnosis covers only the live static route for:

`https://homelink-finance.habibramadan888.workers.dev/unified-login.html`

It does not approve production D1 writes, migrations, feature flags, dashboard formula changes, financial formula changes, employee entry writes, handover submits, void/delete actions, or commercial launch GO.

## Findings

| Check                                                    | Result  | Notes                                                            |
| -------------------------------------------------------- | ------- | ---------------------------------------------------------------- |
| `deploy-worker/public/unified-login.html` exists in repo | PASS    | Local asset exists and contains the Homelink unified login page. |
| Worker config includes assets binding                    | PASS    | `deploy-worker/wrangler.toml` binds `ASSETS` to `./public`.      |
| Worker target                                            | PASS    | `deploy-worker/wrangler.toml` targets `homelink-finance`.        |
| D1 binding                                               | WARNING | Live Worker binds `DB = homelink`; this task does not write D1.  |
| Live `/unified-login.html` response                      | FAIL    | Returns API fallback text instead of HTML.                       |
| Live `/employee-v3.html` response                        | PASS    | Returns `text/html`.                                             |
| Live `/index.html` and `/` response                      | PASS    | Returns `text/html`.                                             |
| Live `/api/me` unauthenticated response                  | PASS    | Returns HTTP 401, preserving backend authority.                  |

## Live Route Evidence Before Deploy

| Path                  | Status | Content-Type                      | Result                             |
| --------------------- | -----: | --------------------------------- | ---------------------------------- |
| `/unified-login.html` |    200 | `text/plain`                      | FAIL - returned API fallback text. |
| `/employee-v3.html`   |    200 | `text/html; charset=utf-8`        | PASS                               |
| `/index.html`         |    200 | `text/html; charset=utf-8`        | PASS                               |
| `/`                   |    200 | `text/html; charset=utf-8`        | PASS                               |
| `/api/me`             |    401 | `application/json; charset=utf-8` | PASS                               |

## Root Cause

The Worker source falls back to:

`Homelink Finance API is running. Use /auth/login for authentication.`

when `env.ASSETS.fetch(request)` does not return a deployed static asset. Because the live route currently returns that fallback, the most likely cause is that the live Worker deployment does not yet include `unified-login.html` in its deployed assets.

## Required Fix

Deploy the `homelink-finance` Worker with the current `deploy-worker/public` asset set so the live assets include `unified-login.html`.

No code path requires a D1 migration or D1 write for this static route fix.

## Safety Boundaries

| Item                              | Status |
| --------------------------------- | ------ |
| Production D1 write approved      | No     |
| Production migration approved     | No     |
| D1 export/import/execute approved | No     |
| Business write test approved      | No     |
| Dashboard formula change approved | No     |
| Financial formula change approved | No     |
| Commercial launch GO              | No     |

## Deployment Need

Deploy is required for the live Worker to serve the newly added static asset. The deployment scope is limited to Worker static route/assets for the existing `homelink-finance` Worker and must keep production cutover as `PRODUCTION_NO_GO`.
