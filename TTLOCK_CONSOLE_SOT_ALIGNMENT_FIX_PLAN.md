# TTLock Console SOT Alignment Fix Plan

Date: 2026-06-02
Scope: recommendation only. No code change, deploy, write gate, production D1 write, or migration was performed.
Production cutover: PRODUCTION_NO_GO

## Result

LIKELY_CONSOLE_FILTER_FOUND

The likely user-visible count source is the owner console continuity/leakage count:

- `rc_cardContinuityRun()`
- `rc_cardContinuityRender()`
- final visible count: `unresolvedMissing.length`

This is distinct from the backend arrears SOT count.

## Minimum Fix Plan

1. Add a backend read-only resolver named `resolveCurrentReceivablesSot()`.
2. Make it reuse the owner console continuity logic in backend form, not the current materialization-oriented SOT.
3. Required backend inputs:
   - live TTLock cards from `loadLockCards(env)`,
   - cloud ledger/payment history from `entry_events` and/or `transactions`,
   - open existing arrears,
   - rent reference config,
   - optional persisted resolution state if the business wants “already handled” rows excluded.
4. Return only two sources:
   - `ttlock_expired_unpaid`,
   - `existing_arrears`.
5. Use `summary.action_count = ttlock_count + existing_arrears_count`.
6. Wire this resolver to:
   - owner arrears page,
   - employee System page,
   - owner Overview top cards `待收尾款` and `今日待办`.
7. Keep assigned directives, materialized rows, smoke rows, old cache, fake fallback, and hardcoded counts out of the current TTLock count.

## Decision Required Before Implementation

Ramadan must choose how to handle browser-local resolved leakage records:

- Option A: ignore local resolved records in backend SOT until they are persisted.
- Option B: add/persist a read-only resolution source, then backend SOT can exclude already resolved leakage rows.

Without that decision, backend SOT can match the continuity filter except for local resolved/unresolved state.

## Prohibited In The Fix

- No production write.
- No migration unless separately approved.
- No write gate.
- No Entry save logic change.
- No Bed Transfer save logic change.
- No arrears directive write logic change.
- No hardcoded `23` or `41`.
- No fake fallback.
- No production cutover.

## Next Prompt Recommendation

Proceed with a read-only backend resolver implementation only after confirming whether local resolved leakage rows should be ignored or persisted.

Suggested next task title:

`TASK TTLOCK-CONSOLE-SOT-ALIGN-READONLY-RESOLVER-001`

