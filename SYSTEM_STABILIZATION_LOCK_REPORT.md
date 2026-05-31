# System Stabilization Lock Report

## Scope

Task: `SYSTEM-STABILIZATION-LOCK-001`

This report freezes the current Homelink stabilization boundary. It is a diagnostic and operating model document only.

No production deploy, no D1 command, no migration, no business write.

## Current Read-Only Evidence

| Evidence                                             | Result                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| Live `/`                                             | HTTP 200, root portal renders                                                  |
| Live root portal entries                             | `data-portal="employee"`, `data-portal="owner"`, `data-portal="admin"` present |
| Live root portal arrears door                        | `data-portal="arrears"` absent                                                 |
| Live `/employee`, `/owner`, `/admin` unauthenticated | HTTP 302 back to `/`                                                           |
| Live `/api/me` unauthenticated                       | HTTP 401, standard body `{"code":1001,"message":"unauthenticated"}`            |
| Production cutover                                   | Must remain `PRODUCTION_NO_GO`                                                 |

## Stabilization Diagnosis

| Area                       | Problem                                                                                                                        | Engineering Root Cause                                                                                                                                | Product Impact                                                               | Severity | Next Action                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entry and auth             | Entry/login behavior has been repeatedly modified while feature work continued.                                                | Routing authority is split across Worker static routing, `portal.html`, owner shell auth bootstrap, and employee shell auth bootstrap.                | Users lose confidence when old login screens or extra entry points reappear. | P0       | Freeze `/` as the only entry and require tests for root portal, legacy route redirects, logout route, and `/api/me` authority.                                                                       |
| Owner navigation           | Navigation has regressed multiple times: analysis disappeared, arrears appeared as primary tab, network/client access changed. | HTML nav structure, CSS mobile rules, and `switchView()` view map are edited separately.                                                              | Owner cannot reliably find business modules.                                 | P0       | Freeze owner primary navigation: overview/history/analysis/clients plus network via primary or control surface, no arrears top tab.                                                                  |
| Owner overview             | Overview is carrying both dashboard summary and arrears follow-up concerns.                                                    | Arrears was first introduced as a standalone page, then moved into overview without fully removing all view-route affordances.                        | Owner sees inconsistent information architecture.                            | P1       | Keep arrears inside overview and forbid fourth entry / primary arrears tab.                                                                                                                          |
| Arrears source model       | Two approved sources exist, but legacy names and local frontend aggregation still remain.                                      | Backend exposes `/api/boss/arrears/followup-tasks`, while frontend still has `buildArrearsFollowupPool()` and legacy `state.arrears` rendering paths. | Existing arrears or TTLock rows can disappear depending on which path wins.  | P0       | Make backend API the single source of truth; frontend may normalize display only.                                                                                                                    |
| Arrears amount             | TTLock amount must come from bed rent mapping; amount-missing rows must not become official arrears.                           | The backend tracks `ttlock_missing_rent`, but frontend fallback paths can still show partial data if not locked.                                      | Owner may chase wrong amounts.                                               | P0       | Keep `config_missing_count` and exclude missing-rent TTLock rows from default task list.                                                                                                             |
| Arrears loading            | User has seen blank/slow/error states and "view all" no response.                                                              | Multiple async paths: backend fetch, local TTLock aggregation, `Promise.allSettled`, preview/all rendering, expanded state.                           | Owner cannot test or trust arrears.                                          | P0       | Enforce loading state machine and tests for skeleton, timeout, partial failure, retry, and view-all.                                                                                                 |
| Arrears card fields        | Internal IDs/debug/raw fields have repeatedly returned.                                                                        | Card renderer has been changed in isolation without a display field contract.                                                                         | Owner sees technical IDs instead of business decisions.                      | P1       | Lock card allowed/forbidden fields and test for no raw IDs, no raw source, no `none/null/undefined`, no promised amount.                                                                             |
| Employee arrears follow-up | UI now only needs date and note, but backend compatibility still accepts `promise_amount` in staff patch.                      | Legacy arrears task schema contains `promise_amount`; backend staff allowed set still includes it.                                                    | Future UI or scripts can reintroduce employee amount input.                  | P1       | Keep schema compatibility but add a follow-up-specific contract: employee default UI must not send amount; backend should reject staff amount in a dedicated future task after compatibility review. |
| readonly_admin             | Read-only role is supported but must stay write-blocked across new modules.                                                    | Frontend hides write buttons; backend has broad `readonly_admin && method !== GET` guard.                                                             | Admin could accidentally mutate data if any path bypasses guard.             | P0       | Keep backend 403 guard; add module-specific readonly tests for each write endpoint.                                                                                                                  |
| Duplicate owner assets     | `index.html` and `index-51.html` both contain owner shell sections.                                                            | Two HTML files share similar markup and both load `index-51-main.js`.                                                                                 | Fixes can land in one asset but not the other.                               | P1       | Define canonical owner route and either generate/alias the duplicate, or require paired tests.                                                                                                       |
| Old component flow-back    | Old table/outstanding list and legacy arrears functions still exist around the same domain.                                    | No component registry that defines allowed rendering path per business module.                                                                        | Regressions reintroduce old UI after small fixes.                            | P1       | Create page boundary lock and regression tests for component selectors.                                                                                                                              |
| Deployment chain           | Static assets can be deployed without matching lock reports/tests.                                                             | Wrangler deploy uploads current `public` directory snapshot, including unrelated dirty files if present.                                              | Live can drift from audited code.                                            | P1       | Require predeploy status: clean staged scope, drift check, static smoke, no D1 commands.                                                                                                             |
| Test coverage              | Many tests exist, but they are fragmented and sometimes stale.                                                                 | Tests were added per incident, not organized by product boundary.                                                                                     | Passing a subset does not prove the system boundary is stable.               | P1       | Introduce stabilization test groups: entry/auth, owner nav, arrears source/dataflow/loading/card, employee follow-up, readonly_admin.                                                                |
| Performance                | Arrears and history modules have had slow loads.                                                                               | Large data reads and UI rendering can block first paint if not isolated.                                                                              | Mobile internal test feels broken even when APIs eventually return.          | P1       | Lock first-paint behavior: shell within 300ms, module timeout <=10s, partial data allowed.                                                                                                           |

## Product Manager View

| User Pain                                          | Why It Blocks Testing                                       | Severity | Decision                             |
| -------------------------------------------------- | ----------------------------------------------------------- | -------- | ------------------------------------ |
| Navigation keeps changing or losing analysis.      | Owner cannot form a stable mental model.                    | P0       | Freeze nav before more UI work.      |
| Arrears source keeps changing or dropping records. | Owner cannot validate money follow-up.                      | P0       | Freeze two-source arrears model.     |
| Arrears loading/error states block the screen.     | Mobile testing stalls and produces repeated screenshots.    | P0       | Freeze loading state machine.        |
| Debug/internal fields appear in cards.             | Owner sees system implementation, not business action.      | P1       | Freeze card display fields.          |
| Employee follow-up asks for too much.              | Staff workload increases and wrong amount entry risk rises. | P1       | Employee only submits date and note. |

## Can Internal Testing Continue?

Internal testing can continue only for read-only navigation and UI validation after this lock is adopted. It should not proceed to broad write testing until:

1. Entry/auth lock tests are green.
2. Owner navigation lock tests are green.
3. Arrears source/dataflow/loading/card tests are green.
4. Employee follow-up lock tests are green.
5. readonly_admin write-denial tests are green.
6. Commercial gate remains `PRODUCTION_NO_GO`.

## Public Beta Decision

Not suitable for public beta. Current state is internal QA only.

## Next Repair Prompt Sequence

1. `OWNER-NAV-BOUNDARY-LOCK-IMPLEMENT`: enforce owner primary nav, remove arrears from top tab, preserve analysis.
2. `ARREARS-BACKEND-SOURCE-OF-TRUTH-IMPLEMENT`: make `/api/boss/arrears/followup-tasks` the sole source for owner arrears.
3. `ARREARS-LOADING-STATE-MACHINE-IMPLEMENT`: enforce loading/partial failure/timeout/retry states.
4. `EMPLOYEE-ARREARS-FOLLOWUP-CONTRACT-IMPLEMENT`: remove staff amount from allowed write contract after compatibility review.
5. `READONLY-ADMIN-WRITE-DENIAL-MATRIX-IMPLEMENT`: verify every write endpoint returns 403.
