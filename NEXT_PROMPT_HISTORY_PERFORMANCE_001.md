# NEXT PROMPT: HISTORY_PERFORMANCE_001

Goal: prove and improve owner history load performance without changing financial calculations.

Strict bans:

- No production deploy unless explicitly approved.
- No D1 write.
- No migration unless separately approved.
- No D1 export/import/execute.
- No dashboard calculation change.
- No financial formula change.
- No business write QA.

## Current Evidence

- Worker `/api/history` supports:
  - `limit`
  - `offset`
  - `include_voided`
- Owner UI renders `owner-history-skeleton`.
- Owner UI requests `/api/history?limit=${limit}`.
- Static tests check skeleton and limit usage.

## Remaining Risk

Source-level tests do not prove real data performance.

Potential causes if real phone still sees 15-30 seconds:

- missing DB index on `(corpid, created_at)`
- full table scan despite `LIMIT`
- surrounding UI waits for another slow request
- browser renders too many local sessions
- Cloudflare asset/cache drift serving stale JS
- mobile CPU bottleneck

## Required Read-Only Diagnosis

1. Inspect current history SQL.
2. Inspect schema/index definitions for `sessions`.
3. If using production-copy only, run read-only `EXPLAIN QUERY PLAN`.
4. Do not run production D1 query unless separately approved.
5. Profile UI with local/staging data:
   - skeleton time
   - first request time
   - first rows rendered
   - load-more behavior

## Required Implementation

If safe:

1. Ensure history shell renders immediately.
2. Ensure first request uses `limit=20`.
3. Add `offset` based "Load more".
4. Do not call session detail for every row on initial render.
5. If API pagination is not enough, add frontend incremental rendering.
6. If index is missing, generate an approval-required migration prompt instead of running migration.

## Required Tests

Add or update:

- `tests/owner-history-performance-runtime.spec.mjs`

Must cover:

- history skeleton appears before network result
- initial request contains `limit=20`
- load-more uses next offset
- no full-history request on first render
- timeout state is visible
- production cutover remains `PRODUCTION_NO_GO`

## Verification

Run:

```bash
npm run format:check
npm run check
npm run security:secrets
npm run gate:commercial-launch
npm run test:owner-history-performance
npm run test:owner-history-load-performance
npm run qa:employee-entry-staging
```

## Exit Standard

- Skeleton is immediate.
- First page is limited.
- Load more is explicit.
- Query/index risk is documented.
- No D1 write.
- `gate:commercial-launch = PRODUCTION_NO_GO`.
