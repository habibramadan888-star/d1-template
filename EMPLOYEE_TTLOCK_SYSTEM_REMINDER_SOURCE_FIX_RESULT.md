# Employee TTLock and System Reminder Source Fix Result

Date: 2026-07-03
Branch: fix/auth-closure-001
Worker version: 36eb7ba5-9aeb-40b9-9092-98c326b1338e

## Scope

- Restored employee Entry TTLock loading when the live TTLock upstream returns 503 or times out.
- Restored employee System reminders to use the same read-only owner receivables SOT path.
- Added read-only fallback from materialized TTLock arrear tasks.
- No production business write, no migration, no write gate, no financial formula change, no parser change.

## Root Cause

Employee Entry called the live TTLock loader directly and surfaced upstream failures as HTTP 503. Employee System reminders depended on the same live TTLock availability for the TTLock source, so a transient live TTLock failure could make the employee-facing SOT unavailable instead of falling back to the already materialized arrears/TTLock task cache.

## Fix

- `/api/employee/lock/cards` now attempts live TTLock first and falls back to materialized TTLock arrear task rows when live TTLock fails.
- The fallback response is marked with `data_source: materialized_cache` and includes fallback reason metadata.
- Employee Entry displays either live TTLock loaded state or cached TTLock loaded state.
- Employee System SOT resolver uses materialized TTLock rows when live TTLock is unavailable, keeping summary/list counts from the same source.

## Verification

- `npm run security:secrets`: PASS
- `npm run gate:commercial-launch`: PASS, `PRODUCTION_NO_GO`
- `npm run test:employee-ttlock-system-fallback`: PASS
- `npm run test:employee-system-entry-lifecycle`: PASS
- `npm run test:employee-system-reminder-live-sot-source`: PASS
- `npm run test:employee-system-reminder-refresh-reloads-sot`: PASS
- `npm run test:employee-system-reminder-source-breakdown`: PASS
- `npm run test:employee-system-reminder-count-fix`: PASS
- `npm run test:employee-system-page-reminders`: PASS
- `npm run test:employee-followup-hide-ttlock-account-phone`: PASS
- `npm run test:readonly-admin-role`: PASS
- `npm run build:embedded:dry-run`: PASS
- `npm run verify:embedded-worker`: PASS
- `npm run audit:worker-drift`: PASS with `WORKER_DRIFT_CRITICAL_MISMATCHES=0`

## Deploy

- Deployed Worker: homelink-finance
- URL: https://homelink-finance.habibramadan888.workers.dev
- Worker version: 36eb7ba5-9aeb-40b9-9092-98c326b1338e
- Assets uploaded: `/employee-v3.html`

## Live Smoke

- `/api/employee/lock/cards` without login: 401, protected as expected.
- `/api/employee/system/reminders` without login: 401, protected as expected.
- Local deployed asset source includes cached TTLock copy and materialized cache handling.
- Authenticated live smoke was not executed in this task because no authentication file was read and no password/token/cookie was printed.

## Safety

- Production write: no
- Migration: no
- Write gate: off
- Production cutover: PRODUCTION_NO_GO
