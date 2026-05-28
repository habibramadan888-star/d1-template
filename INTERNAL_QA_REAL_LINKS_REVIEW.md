# Internal QA Real Links Review

Date: 2026-05-28, Asia/Dubai

Scope: real-link review plus UNIFIED-LOGIN-DEPLOY-001 live route verification.
The original review used local project files, routes, HTML assets, and wrangler
config. UNIFIED-LOGIN-DEPLOY-001 later performed the approved static Worker
asset deploy and read-only live smoke. It did not migrate, execute D1 commands,
or write any D1.

## Confirmed Employee Link

| Item                            | Result                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| Unified login link              | `https://homelink-finance.habibramadan888.workers.dev/unified-login.html`                 |
| Employee real link              | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`                   |
| Source of confirmation          | Ramadan-confirmed link plus local asset `deploy-worker/public/employee-v3.html`           |
| Old default to avoid            | `https://homelink-finance-staging.habibramadan888.workers.dev` as the employee entry link |
| Remote URL called by this task? | Yes, read-only after approved static route deploy.                                        |

## Live Unified Login Verification

| Item                            | Result                                                                    |
| ------------------------------- | ------------------------------------------------------------------------- |
| Live unified login URL          | `https://homelink-finance.habibramadan888.workers.dev/unified-login.html` |
| HTTP status                     | 200                                                                       |
| Content-Type                    | `text/html`                                                               |
| Contains Homelink login content | Yes                                                                       |
| Returns API fallback text       | No                                                                        |
| Evidence                        | `INTERNAL_QA_005B_UNIFIED_LOGIN_LIVE_SMOKE_RESULT.md`                     |
| Production D1 write             | No                                                                        |
| Production migration            | No                                                                        |

## Session Handoff Review

| Item                               | Result                                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Owner destination session check    | `index-51-main.js` now starts by checking `/api/me` and enters owner UI for owner/manager/admin claims. |
| Employee destination session check | `employee-v3.html` now starts by checking `/api/me` and enters employee UI for staff/employee claims.   |
| Fallback behavior                  | Old owner login and employee PIN login remain available when `/api/me` is unauthenticated or expired.   |
| Authority                          | `/api/me`; frontend role/local storage is not authority.                                                |
| Live deployment status             | Deployed in UNIFIED-LOGIN-FIX-003 to `homelink-finance` Worker assets.                                  |
| Successful login smoke             | Not executed in UNIFIED-LOGIN-FIX-003 because successful login writes production D1 `active_sessions`.  |

## Owner UX Review

| Item                        | Result                                                                              |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Owner loading flicker       | Fixed in UNIFIED-LOGIN-UX-004 by starting owner SPA in auth-loading state.          |
| Legacy login fallback       | Preserved, but only shown after `/api/me` returns unauthenticated/expired.          |
| Back-button behavior        | Unified login now shows a signed-in panel instead of immediate redirect loop.       |
| Continue action             | Routes to owner dashboard or employee page based on server-confirmed role.          |
| Clear session action        | Calls logout and returns to the login form.                                         |
| Successful live login smoke | Still requires separate approval because successful login writes `active_sessions`. |

## Owner / Employee UI Unification Review

| Item                      | Result                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Shared design tokens      | Added in `deploy-worker/public/shared-design-tokens.css`.                                              |
| Employee page             | Links shared tokens while preserving existing employee look.                                           |
| Unified login             | Uses shared font/background/card/button classes.                                                       |
| Owner page                | Uses `hl-page owner-ui-unified` and shared owner alignment layer.                                      |
| Owner dashboard KPI cards | Dynamic summary cards include `.hl-stat-card`, `.hl-stat-label`, `.hl-stat-value`.                     |
| Owner visual QA checklist | `OWNER_EMPLOYEE_UI_VISUAL_QA_CHECKLIST.md`.                                                            |
| Deploy status             | Not deployed by UI-UNIFICATION-NIGHT-001; live visibility requires separate approved static UI deploy. |
| Production status         | `PRODUCTION_NO_GO`.                                                                                    |

## Owner / Boss Candidate Links

| Candidate Link                                                        | Local Evidence                                                               | Confirmed Exists Locally | Notes                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------ | ------------------------------------------ |
| `https://homelink-finance.habibramadan888.workers.dev/`               | `deploy-worker/public/index.html` exists and Worker assets serve `./public`. | Yes                      | Best owner/main app entry candidate.       |
| `https://homelink-finance.habibramadan888.workers.dev/index.html`     | `deploy-worker/public/index.html` exists.                                    | Yes                      | Explicit asset path for the same main SPA. |
| `https://homelink-finance.habibramadan888.workers.dev/index-51.html`  | `deploy-worker/public/index-51.html` exists.                                 | Yes                      | Alternate/versioned main SPA asset.        |
| `https://homelink-finance.habibramadan888.workers.dev/owner.html`     | No `owner.html` found under `deploy-worker/public`.                          | No                       | Do not use unless a future route adds it.  |
| `https://homelink-finance.habibramadan888.workers.dev/boss.html`      | No `boss.html` found under `deploy-worker/public`.                           | No                       | Do not use unless a future route adds it.  |
| `https://homelink-finance.habibramadan888.workers.dev/dashboard.html` | No `dashboard.html` found under `deploy-worker/public`.                      | No                       | Do not use unless a future route adds it.  |

## Confirmed Owner Entry

The confirmed owner/boss entry from local files is the main SPA:

`https://homelink-finance.habibramadan888.workers.dev/`

The explicit equivalent asset is:

`https://homelink-finance.habibramadan888.workers.dev/index.html`

Reason: `deploy-worker/public/index.html` contains the Homelink main app, manager
role badge handling, history/dashboard sections, and loads `index-51-main.js`.
No separate owner, boss, or dashboard HTML file was found in the deployed public
asset directory.

## Worker Backend Environment / D1 Binding

| Config                                         | Worker / Env               | D1 Binding | Database Name              | Database ID                            | Notes                                                  |
| ---------------------------------------------- | -------------------------- | ---------- | -------------------------- | -------------------------------------- | ------------------------------------------------------ |
| `deploy-worker/wrangler.toml` default          | `homelink-finance`         | `DB`       | `homelink`                 | `562aa079-1cca-4176-ba3b-7276a65f98fb` | This is the Worker used by the confirmed employee URL. |
| `deploy-worker/wrangler.toml` staging env      | `homelink-finance-staging` | `DB`       | `homelink-finance-staging` | `4ff78bfc-3855-436b-aefb-6b492145d79c` | Separate staging Worker/D1 binding.                    |
| `deploy-worker/wrangler.embedded.toml` default | `homelink-finance`         | `DB`       | `homelink`                 | `562aa079-1cca-4176-ba3b-7276a65f98fb` | Embedded Worker config also points at `homelink`.      |

## Write Risk And Suitability

| Question                                                                                  | Answer                                                                                                            |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Does this task write production data?                                                     | No.                                                                                                               |
| Would the confirmed employee URL write production data if testers submit write flows?     | Yes, based on local wrangler config, authenticated write APIs on `homelink-finance` can write to `DB = homelink`. |
| Is the confirmed employee link suitable for internal write QA under current restrictions? | No, not without a separate explicit production D1 write approval.                                                 |
| Is the confirmed employee link suitable for internal link/login/read-only smoke testing?  | Yes, if testers avoid write actions and do not expose secrets.                                                    |
| Is the owner/main app link suitable for internal write QA under current restrictions?     | No, not without separate production D1 write approval.                                                            |
| Production status                                                                         | `PRODUCTION_NO_GO`                                                                                                |

## Required QA Package Correction

Use the unified login link first:

`https://homelink-finance.habibramadan888.workers.dev/unified-login.html`

The Ramadan-confirmed employee destination remains:

`https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`

The owner/boss destination remains:

`https://homelink-finance.habibramadan888.workers.dev/index.html`

Do not treat these links as approval for production D1 writes, production
migration, production deploy, dashboard authority switch, public beta, or
commercial launch.

## UI-UNIFICATION-003 Link QA Notes

The owner destination remains:

`https://homelink-finance.habibramadan888.workers.dev/index.html`

Expected owner mobile behavior after the next static UI deploy:

| Area          | Expected Result                                                                      |
| ------------- | ------------------------------------------------------------------------------------ |
| Primary nav   | No main `录入` tab; owner sees owner-oriented navigation.                            |
| Control panel | Control panel button uses SVG/text and does not show emoji fallback or garbled text. |
| Mobile width  | Right-side topbar controls stay inside the viewport.                                 |
| Client credit | Search/filter/refresh/card surfaces use shared design-system styling.                |

The current link is still bound to `DB = homelink`; do not run write QA without
separate explicit approval.
