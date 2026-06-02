# TTLock SOT vs Console Filter Gap

Date: 2026-06-02
Scope: read-only provenance audit.
Production cutover: PRODUCTION_NO_GO

## Current Backend SOT

Current backend arrears SOT path:

1. `handleBossArrearsFollowupTasks()`
2. `empListMergedArrearTasksDetailed()`
3. `empLoadTtlockExpiredUnpaidForArrears()`
4. `loadLockCards(env)`
5. `empTtlockRoomsToExpiredArrears()`

Backend TTLock SOT rules:

- uses live TTLock API through `loadLockCards(env)`,
- skips vacant/staff-like card names,
- requires expired TTLock card timestamp,
- parses bed number from card name or lock room,
- requires bed rent mapping,
- excludes missing-rent rows from default pool,
- dedupes mapped backend rows,
- combines with open system arrears.

It does not apply the owner console continuity rules:

- payment coverage by billing period,
- `GAP_LIMIT = 3`,
- existing arrears converted to `knownArrears`,
- local resolved leakage records,
- browser-imported history/session coverage state.

## Owner Console Filter

Owner console path:

1. `cp_loadAll()` loads `/api/lock/cards`.
2. `roomsData` stores raw TTLock card data.
3. `cp_computeMetrics()` directly counts card status for the TTLock control panel.
4. `rc_cardContinuityRun()` computes continuity/leakage from TTLock cards plus rent/payment history.
5. `rc_cardContinuityRender()` displays `unresolvedMissing.length` as the visible action count.

Console continuity rules:

- `rc_currentOccupiedCards()` keeps latest occupied card per bed.
- `rc_bestCoverageForCard()` calculates rent coverage from imported sessions.
- `rc_cardContinuityRun()` marks rows as `missing`, `knownArrears`, `noCoverage`, `noDate`, or `ok`.
- Rows with existing open arrears are not counted as leakage; they become `knownArrears`.
- Rows with enough coverage or small gap are `ok`.
- Rows already handled in local resolutions are removed from the unresolved count.

## Filter Comparison

| Filter | Backend SOT | Console | Should Use |
|---|---|---|---|
| Live TTLock API | yes | yes | yes |
| Expired TTLock timestamp | yes | yes | yes |
| Exclude staff/vacant cards | yes | yes | yes |
| Deduplicate by bed/latest card | partial backend dedupe | yes, latest per bed | yes |
| Require rent mapping | yes | uses configured/default/reference rent | yes, but must align source |
| Existing system arrears included | yes, as separate source | shown as `knownArrears`, not leakage | yes, separate source |
| Assigned directives excluded | yes for source count | not part of console count | yes |
| Materialized rows excluded | partially, backend still reads `arrear_tasks` existing source | not part of TTLock console count | yes for TTLock count |
| Payment/rent coverage from ledger | no | yes | needed if matching console continuity |
| Gap threshold `GAP_LIMIT = 3` | no | yes | needed if matching console continuity |
| Already resolved local leakage | no | yes | must decide; local-only data is not valid backend SOT unless persisted |
| No coverage/no date rows | backend may include if rent mapping exists | console separates yellow rows | should be separated, not counted as active actionable TTLock arrears without amount authority |

## Gap

The 41 vs about 23 gap is not caused by an obvious hardcoded value in the currently audited backend path. It is caused by the backend SOT and owner console using different business questions:

- Backend SOT asks: “Which live expired TTLock cards have bed-rent mapping and can be materialized as arrears follow-up rows?”
- Owner console continuity asks: “Which occupied TTLock cards still have unresolved rent coverage leakage after considering actual payment history, existing arrears, gap threshold, and local resolution state?”

## Recommended Unified SOT Direction

If the business wants employee System / owner arrears / Overview to match the user-visible console count, the unified resolver must use a backend equivalent of the continuity filter:

- live TTLock card load,
- latest occupied card per bed,
- rent/payment coverage from cloud `entry_events` / transactions,
- existing arrears separation,
- gap threshold,
- no fake fallback,
- no materialized/directive rows as TTLock source.

Local browser-only resolution state must either be persisted in a read model or excluded from the backend SOT definition; otherwise the backend cannot safely reproduce the exact console count.

