# TTLock Console Count Render Path Audit

Date: 2026-06-02
Scope: read-only provenance audit. No production D1 write, migration, deploy, write gate, or credential output was performed.
Production cutover: PRODUCTION_NO_GO

## Summary

The user-visible “about 23” count is not the same metric as the backend arrears SOT `ttlock_expired_unpaid_count`.

The owner console count comes from the legacy TTLock control/continuity module:

- HTML entry: `deploy-worker/public/index-51.html`
- Console script: `deploy-worker/public/index-51-cp.js`
- Analysis/continuity renderer: `deploy-worker/public/index-51-main.js`

The console loads live TTLock cards through `/api/lock/cards`, stores them in global `roomsData`, then renders different metrics depending on the active panel:

- TTLock control panel overdue count: `cp_computeMetrics()` counts cards where `cp_getStatus(card).type === 'overdue'`.
- Continuity/leakage panel count: `rc_cardContinuityRender()` counts unresolved missing rent-coverage rows with `unresolvedMissing.length`.

The user-reported “about 23” is most consistent with the continuity/leakage count (`unresolvedMissing.length`), not with raw expired card count or backend arrears SOT count.

## Render Path

| Layer | File / Function / API | Count | Notes |
|---|---|---:|---|
| HTML owner console shell | `deploy-worker/public/index-51.html`, button `cp_loadAll()` | n/a | Owner control panel calls TTLock refresh manually. |
| TTLock API load | `deploy-worker/public/index-51-cp.js`, `cp_loadAll()` -> `apiFetch('/api/lock/cards')` | n/a | Uses protected owner API and assigns `roomsData = ld.roomsData || {}`. |
| Backend TTLock live API | `deploy-worker/src/index.js`, `/api/lock/cards` -> `loadLockCards(env)` | raw live cards | Calls TTLock OAuth/token and `/v3/lock/list`, then `/v3/identityCard/list` per lock. |
| TTLock console status count | `deploy-worker/public/index-51-cp.js`, `cp_computeMetrics()` | overdue/today/soon totals | Counts direct card status with `cp_getStatus()`. Does not apply rent coverage, arrears, or resolution filters. |
| Continuity source cards | `deploy-worker/public/index-51-main.js`, `rc_currentOccupiedCards()` | latest occupied card per bed | Dedupes to latest card by bed and excludes staff/vacant cards. |
| Continuity rent coverage | `deploy-worker/public/index-51-main.js`, `rc_bestCoverageForCard()` / `rc_cardPaymentCandidates()` | coverage rows | Uses imported cloud/history sessions and billing period. |
| Continuity known-arrears exclusion | `deploy-worker/public/index-51-main.js`, `rc_activeRentArrearsMap()` | known arrears rows | Marks beds with open arrears as `knownArrears`, not unresolved leakage. |
| Continuity final visible action count | `deploy-worker/public/index-51-main.js`, `rc_cardContinuityRender()` | `unresolvedMissing.length` | Counts only `status === 'missing'` rows not present in local resolution storage. This is the likely source of the user-visible “about 23”. |
| Backend arrears SOT count | `deploy-worker/src/index.js`, `empListMergedArrearTasksDetailed()` | 41 known from prior authenticated smoke | Uses live TTLock API plus bed-rent mapping and existing arrears, but does not apply continuity rent-coverage or local resolved filters. |

## Key Finding

`raw expired cards = 61`, `backend SOT = 41`, and `console visible ≈23` are different counts:

- `61` = raw live TTLock expired card count from `/api/lock/cards?purpose=arrears_pool` probe.
- `41` = backend arrears SOT after bed-rent mapping and backend dedupe.
- `≈23` = likely continuity UI “待处理漏收” count after payment coverage, known-arrears, threshold, and local resolved filters.

