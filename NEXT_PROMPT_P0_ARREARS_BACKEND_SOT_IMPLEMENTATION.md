# Next Prompt: P0 Arrears Backend SOT Implementation

Use this prompt as the next implementation task.

```text
# TASK P0-ARREARS-BACKEND-SOT-IMPLEMENTATION

Goal:
Make `GET /api/arrears/followup/tasks` the only source of truth for the owner arrears follow-up pool. Downgrade frontend `buildArrearsFollowupPool()` and related logic to a compatibility adapter only, with no business aggregation.

Strict prohibitions:
1. Do not execute production migration.
2. Do not write production or staging D1.
3. Do not execute D1 export/import/execute.
4. Do not execute employee entry write.
5. Do not submit handover.
6. Do not void/delete sessions.
7. Do not modify financial formula.
8. Do not modify dashboard calculation.
9. Do not modify money / receivables / handover / tenant scope rules.
10. Do not commit secrets.
11. Do not print password/token/cookie.
12. Do not mark commercial launch GO.
13. Production cutover must remain PRODUCTION_NO_GO.

Backend requirements:
1. Keep `/api/arrears/followup/tasks` as the only official arrears SOT endpoint.
2. Return this final shape:
   - `summary.total_count`
   - `summary.total_amount_fils`
   - `summary.existing_arrears_count`
   - `summary.ttlock_expired_unpaid_count`
   - `summary.promised_unpaid_count`
   - `summary.config_missing_count`
   - `summary.dedupe_dropped_count`
   - `preview_tasks`
   - `tasks`
   - `pagination.limit`
   - `pagination.offset`
   - `pagination.total_count`
   - `pagination.has_more`
   - `sources.existing_arrears_record.count/status/error_code`
   - `sources.ttlock_expired_unpaid.count/status/error_code`
3. Preserve temporary aliases:
   - `employee_promised_count`
   - `ttlock_missing_rent_count`
   - top-level `total_count`, `total_amount_fils`, `has_more`
4. Existing arrears source must include only authoritative existing arrears rows.
5. TTLock source must include only expired unpaid cards with valid server-side bed rent mapping.
6. Rows without rent config must not enter the default official list; return `config_missing_count` and QA metadata instead.
7. Backend must own dedupe and return `dedupe_dropped_count`.
8. Backend must own preview and pagination.
9. Backend must return partial-source status without failing the whole page when one source is unavailable.

Frontend requirements:
1. `loadArrearsForOwner()` must fetch only `/api/arrears/followup/tasks`.
2. Remove or quarantine direct frontend TTLock loading for arrears pool generation.
3. Remove frontend business rent mapping for arrears pool generation.
4. Remove frontend source merge for official arrears pool generation.
5. Remove frontend summary/count/total recomputation from official backend rows.
6. Keep only a renderer adapter that maps backend fields to card display fields.
7. AbortError from replaced/stale requests must not be shown as a user-facing red failure.
8. View-all must use backend `tasks`/pagination rather than rebuilding local pools.

Tests to add/update:
1. Backend summary equals returned list source counts.
2. Backend includes `existing_arrears_record`.
3. Backend includes `ttlock_expired_unpaid`.
4. Unknown source is excluded.
5. TTLock rows without rent config do not enter default official list.
6. `preview_tasks` and `tasks` are consistent.
7. `pagination.has_more` works.
8. Frontend does not call `/api/lock/cards` for arrears pool generation.
9. Frontend does not compute bed rent for official arrears cards.
10. Partial source failure renders warning and available data, not blank page.
11. Timeout does not produce `signal is aborted without reason`.
12. Production cutover remains PRODUCTION_NO_GO.

Validation:
- `npm run security:secrets`
- `npm run gate:commercial-launch`
- `npm run test:owner-arrears-api-contract`
- `npm run test:owner-arrears-abort`
- `npm run test:owner-arrears-load-performance`
- `npm run test:readonly-admin-arrears-card`
- `npm run qa:employee-entry-staging`

Expected final output:
1. Files changed.
2. Backend contract diff.
3. Frontend logic removed or quarantined.
4. Test results.
5. Confirmation: no D1 write, no migration, no deploy unless explicitly approved.
6. Production cutover status remains PRODUCTION_NO_GO.
```
