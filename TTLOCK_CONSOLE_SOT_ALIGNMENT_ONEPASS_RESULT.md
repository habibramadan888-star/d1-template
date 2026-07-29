# TTLock Console SOT Alignment One-Pass Result

Date: 2026-06-02

Branch: `fix/auth-closure-001`

Deploy version: `1b717727-b2bf-4478-bf5f-69901cdb03c8`

## Result

Implemented a shared read-only `resolveCurrentReceivablesSot()` backend resolver.

The resolver now feeds:

- Owner arrears follow-up tasks
- Employee System reminders
- Owner Overview comparative summary
- Direct read-only endpoint: `GET /api/owner/current-receivables-sot`

Source:

- `owner_console_unresolved_missing_plus_existing_arrears`

Source function:

- `owner_console_unresolved_missing_continuity_filter`

## Resolver Live Counts

Authenticated read-only smoke result:

| Metric | Value |
|---|---:|
| TTLock unresolved missing | 55 |
| Existing arrears | 0 |
| Action count | 55 |
| Outstanding amount fils | 3063000 |

The same counts were returned by:

- `/api/owner/current-receivables-sot`
- `/api/boss/arrears/followup-tasks`
- `/api/employee/system/reminders`
- `/api/owner/overview/comparative-summary`

## Important Limitation

The backend resolver can mirror the owner console continuity calculation using live TTLock cards, cloud rent config, cloud ledger rows, and open arrears suppression.

It cannot read browser-local `rc_getResolutions()` state from the owner console localStorage. If the phone console still shows about 23 while backend read APIs show 55, the remaining delta is local resolved/suppressed continuity records that are not available to backend APIs.

No hardcoded `41` or `23` was introduced.

## Owner Arrears Result

Owner arrears now uses the shared resolver and exposes:

- `source`
- `source_function`
- `source_breakdown`
- `summary`
- `source_tasks`

## Employee System Result

Employee System reminders now use the shared resolver:

- `ttlock_overdue_count = 55`
- `existing_arrears_count = 0`
- `action_count = 55`
- `amount_fils = 3063000`

No fake fallback or hardcoded TTLock count is used.

## Owner Overview Result

Owner Overview now includes `current_receivables_sot` from the same resolver.

Authenticated smoke:

- current month rows: 32
- current month gross received: 15100
- current receivables action count: 55

## WhatsApp Golden Baseline Result

Employee Entry Current Session WhatsApp export was changed to the latest compact searchable baseline without `#`.

Example:

```text
Entry 06/02 | Abdul | 2 records
Cash 820.00 | Bank 0.00 | Total 820.00
1. 144 rent 770.00 cash 0605-0705
2. 144-145 144 145 bed_transfer 50.00 cash customer_request
```

The export strips internal/debug fields including:

- EID
- trace
- source_ref
- +971
- debug
- idempotency
- audit
- raw JSON

## Validation

Passed:

- `npm run security:secrets`
- `npm run gate:commercial-launch`
- `npm run test:arrears-current-sot-resolver`
- `npm run test:arrears-current-sot-uses-console-unresolved-missing`
- `npm run test:arrears-current-sot-no-materialized-stale-count`
- `npm run test:employee-system-reminder-live-sot-source`
- `npm run test:employee-system-reminder-no-hardcoded-ttlock-count`
- `npm run test:employee-system-reminder-refresh-reloads-sot`
- `npm run test:employee-system-reminder-source-breakdown`
- `npm run test:employee-system-reminder-count-fix`
- `npm run test:employee-followup-hide-ttlock-account-phone`
- `npm run test:owner-overview-top-cards-live-data`
- `npm run test:owner-overview-cloud-ledger-preload`
- `npm run test:owner-overview-not-dependent-on-manual-history-load`
- `npm run test:owner-overview-no-up-when-no-baseline`
- `npm run test:owner-overview-comparative-api`
- `npm run test:owner-overview-accounting-control`
- `npm run test:employee-entry-whatsapp-export-golden-baseline`
- `npm run test:employee-entry-whatsapp-export-baseline`
- `npm run test:employee-entry-whatsapp-export-searchable`
- `npm run test:employee-entry-whatsapp-export-no-debug`
- `npm run test:employee-entry-whatsapp-export-hash-searchable`
- `npm run test:readonly-admin-role`
- `npm run build:embedded:dry-run`
- `npm run verify:embedded-worker`
- `npm run audit:worker-drift`

Authenticated read-only live smoke:

- owner auth status: 200
- employee auth status: 200
- SOT status: 200
- owner arrears status: 200
- employee System status: 200
- owner Overview status: 200
- password printed: no
- token printed: no
- cookie printed: no

## Safety

- Production business write: no
- Write gate: off
- Migration: no
- D1 export/import/execute: no
- Entry save logic changed: no
- Bed Transfer save logic changed: no
- Arrears dispatch write logic changed: no
- Financial formula changed: no
- Dashboard save logic changed: no
- Production cutover: `PRODUCTION_NO_GO`
