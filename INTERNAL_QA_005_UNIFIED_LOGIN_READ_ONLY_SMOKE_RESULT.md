# INTERNAL-QA-005 Unified Login Read-only Smoke Result

Date: 2026-05-27

Scope: read-only smoke against `https://homelink-finance.habibramadan888.workers.dev`.

Production status: `PRODUCTION_NO_GO`

## Safety Guard

| Item                              | Result | Notes                                                  |
| --------------------------------- | ------ | ------------------------------------------------------ |
| Production deploy executed        | No     | No deploy command was run.                             |
| Production migration executed     | No     | No migration command was run.                          |
| D1 export/import/execute executed | No     | No D1 command was run.                                 |
| Production D1 write executed      | No     | No business write endpoint was invoked.                |
| Staging D1 write executed         | No     | No staging write was performed.                        |
| Production-copy D1 write executed | No     | No production-copy write was performed.                |
| Employee entry submitted          | No     | Employee page was not used for submit/save testing.    |
| Handover submitted                | No     | Handover paths were not exercised.                     |
| Void/delete_session executed      | No     | No void/delete endpoint was invoked.                   |
| Settings modified                 | No     | Settings pages/APIs were not modified.                 |
| Password/token/cookie printed     | No     | Credential values and cookie contents were not logged. |

## Live URL Checks

| Check                     | URL / API                                                 | Actual                                                              | Result  | Notes                                                                                                                                                          |
| ------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unified login opens       | `/unified-login.html`                                     | HTTP 200, `text/plain`, body starts with Worker API default message | BLOCKED | The live Worker is not currently serving the new unified login HTML asset. This likely requires a future approved deploy; no deploy was executed in this task. |
| Employee page opens       | `/employee-v3.html`                                       | HTTP 200, `text/html`                                               | PASS    | Existing employee destination is reachable.                                                                                                                    |
| Owner page opens          | `/index.html`                                             | HTTP 200, `text/html`                                               | PASS    | Existing owner/main SPA destination is reachable.                                                                                                              |
| Owner root opens          | `/`                                                       | HTTP 200, `text/html`                                               | PASS    | Root remains owner/main SPA compatible.                                                                                                                        |
| Unauthenticated `/api/me` | `/api/me`                                                 | HTTP 401                                                            | PASS    | Read-only unauthenticated auth boundary behaves as expected.                                                                                                   |
| Invalid login error       | `POST /auth/login` with invalid password and valid Origin | HTTP 401, `invalid_credentials`                                     | PASS    | Clear backend error exists; no session cookie returned.                                                                                                        |

## Role Smoke

| Scenario                               | Expected                                                                         | Actual                                                                                   | Result               | Notes                                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Employee login routes to employee page | Unified login should authenticate staff/employee and route to `employee-v3.html` | Live unified login page is not served, so browser redirect cannot be verified end-to-end | BLOCKED              | Direct employee auth using existing local credential material returned role `staff`, then `/api/me` returned HTTP 200. Credential values were not printed. |
| Owner login routes to owner page       | Unified login should authenticate owner/manager/admin and route to `index.html`  | Not verified                                                                             | MANUAL_REQUIRED      | No approved production-linked owner credential was available in this task. Local manager credential did not authenticate against the live Worker.          |
| Unknown/invalid login shows error      | Login failure should show clear error                                            | Backend returned `invalid_credentials` for invalid owner password                        | PASS                 | Frontend unified-login error rendering cannot be verified on live until the asset is served.                                                               |
| `/api/me` remains authority            | Authenticated role should come from backend session                              | Employee `/api/me` returned HTTP 200 with role `staff`                                   | PASS_WITH_LIMITATION | Only employee role was verified. Owner role remains manual-required.                                                                                       |

## Mobile Display

| Page          | Viewport  | Actual                                                                        | Result  | Notes                                                                                                                |
| ------------- | --------- | ----------------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------- |
| Unified login | 390 x 844 | Headless mobile screenshot captured, but page content is the API default text | BLOCKED | The live unified login asset is not deployed/served.                                                                 |
| Employee page | 390 x 844 | Headless mobile screenshot captured                                           | PASS    | Existing employee page renders at mobile viewport. Screenshot was kept as temporary evidence only and not committed. |
| Owner page    | 390 x 844 | Headless mobile screenshot captured                                           | PASS    | Existing owner page renders at mobile viewport. Screenshot was kept as temporary evidence only and not committed.    |

## Required Result Summary

| Required Item                              | Result                                                                                                                                                                                                                                                       |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Unified login opened                       | Blocked: live URL returns Worker API default text, not unified login HTML.                                                                                                                                                                                   |
| Employee login redirected to employee page | Blocked for live unified-login redirect; direct employee auth returned `staff` and `/api/me` 200.                                                                                                                                                            |
| Owner login redirected to owner page       | Manual required; no approved production-linked owner credential available.                                                                                                                                                                                   |
| Wrong login showed error                   | Pass via backend invalid login response.                                                                                                                                                                                                                     |
| Mobile display usable                      | Employee and owner pages pass; unified login blocked until asset is served.                                                                                                                                                                                  |
| Any write occurred                         | No.                                                                                                                                                                                                                                                          |
| Production D1 write occurred               | No.                                                                                                                                                                                                                                                          |
| Can enter next test step                   | No for unified-login read-only PASS. Next step is an approved deploy/preflight of the unified-login asset or repeat smoke after deployment. Existing direct employee/owner page read-only smoke may continue, but unified-login end-to-end smoke is blocked. |

## Conclusion

`INTERNAL_QA_005_UNIFIED_LOGIN_READ_ONLY_SMOKE=BLOCKED`

Reason: the repository contains the unified login implementation, but the current live Worker does not serve `/unified-login.html` as HTML. No production deploy was executed by this task, so the live unified login redirect behavior cannot be marked PASS.

Production cutover remains `PRODUCTION_NO_GO`.
