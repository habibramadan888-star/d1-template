# Console SOT Alignment Final Result

Date: 2026-06-02
Branch: fix/auth-closure-001
Production cutover: PRODUCTION_NO_GO

## Scope

Aligned the employee System page, owner arrears read model, and owner Overview summary to the owner console current visible TTLock read model.

Canonical source:

- Resolver source: owner_console_current_view
- Console logic: cp_getStatus_cp_computeMetrics
- Compatibility endpoint retained: /api/owner/current-receivables-sot
- New explicit endpoint: /api/owner/console-receivables-sot

## Live Authenticated Smoke Result

Authenticated owner and employee read-only smoke completed without printing password, token, cookie, or Set-Cookie.

| Check | Result |
|---|---|
| Owner auth usable | PASS |
| Employee auth usable | PASS |
| Employee System uses console SOT | PASS |
| Owner arrears uses console SOT | PASS |
| Owner Overview uses console SOT | PASS |
| Production business write | No |
| Production migration | No |
| Write gate | Off |

Live console SOT counts:

| Metric | Value |
|---|---:|
| Overdue | 33 |
| Due today | 0 |
| Due soon | 21 |
| Existing arrears | 0 |
| Action count | 54 |
| Outstanding amount | 38,780.00 AED |
| Outstanding amount fils | 3,878,000 |

## WhatsApp Entry Export

Employee Entry WhatsApp export was kept on the searchable bracket baseline:

- Rent line includes searchable bed token such as `【144】`.
- Bed transfer line includes searchable transfer token such as `【144-145】`.
- Export does not include EID, trace, source_ref, +971, debug, audit, request, or idempotency fields.

## Tests

Targeted tests passed:

- npm run test:console-receivables-sot-resolver
- npm run test:employee-system-uses-console-sot
- npm run test:owner-arrears-uses-console-sot
- npm run test:overview-uses-console-sot
- npm run test:no-hardcoded-ttlock-count
- npm run test:employee-entry-whatsapp-export-golden-baseline
- npm run test:employee-entry-whatsapp-export-searchable
- npm run test:employee-entry-whatsapp-export-no-debug
- npm run test:employee-system-reminder-live-sot-source
- npm run test:employee-system-reminder-no-hardcoded-ttlock-count
- npm run test:employee-system-reminder-refresh-reloads-sot
- npm run test:employee-system-reminder-source-breakdown
- npm run test:employee-system-reminder-count-fix
- npm run test:employee-followup-hide-ttlock-account-phone
- npm run test:owner-overview-cloud-ledger-preload
- npm run test:owner-overview-no-up-when-no-baseline
- npm run test:owner-overview-accounting-control
- npm run test:owner-overview-top-cards-live-data
- npm run test:owner-overview-not-dependent-on-manual-history-load
- npm run test:owner-overview-comparative-api
- npm run test:owner-overview-comparative-ui-cn
- npm run test:owner-overview-bed-transfer-fee-separated
- npm run test:readonly-admin-role

Safety/build checks passed:

- npm run security:secrets
- npm run gate:commercial-launch = PRODUCTION_NO_GO
- npm run build:embedded:dry-run
- npm run verify:embedded-worker
- npm run audit:worker-drift = critical mismatches 0

## Deploy

Deployed to default homelink-finance Worker.

Worker version: 19e8475a-ff1b-443b-a0f9-85034b35680c

## Final Status

| Item | Status |
|---|---|
| Employee System SOT | PASS |
| Owner arrears SOT | PASS |
| Owner Overview cloud summary | PASS |
| WhatsApp searchable baseline | PASS |
| Production business write | No |
| Migration | No |
| Write gate | Off |
| Production cutover | PRODUCTION_NO_GO |

