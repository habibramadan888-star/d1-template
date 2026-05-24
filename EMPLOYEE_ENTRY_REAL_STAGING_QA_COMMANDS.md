# Employee Entry Real Staging QA Commands

Generated: 2026-05-25T03:42:25+04:00

All commands are non-production. Do not run against a production URL.

## Dry-Run Preflight

```powershell
npm run qa:employee-entry-staging
```

Expected result without staging inputs:

```text
EMPLOYEE_ENTRY_STAGING_QA=MANUAL_REQUIRED
```

## Real Staging Write Preconditions

Before any write command, set ignored local environment variables or pass equivalent CLI args through a secure terminal session:

```powershell
$env:STAGING_WORKER_URL = "https://<reviewed-staging-worker>"
$env:STAGING_D1_DATABASE = "<reviewed-staging-d1-name>"
$env:STAGING_ENTRYPOINT = "source-or-embedded-confirmed-by-human"
$env:STAGING_EMPLOYEE_USERNAME = "<secure-staging-employee>"
$env:STAGING_OWNER_USERNAME = "<secure-staging-owner>"
```

Do not commit these values.

## Confirmed Staging Write Command

Only after backup and rollback are confirmed:

```powershell
npm run qa:employee-entry-staging -- --confirm-staging-write --confirm-backup --confirm-rollback
```

The script must reject production-looking URLs and must not execute migration or deployment commands.

## Required Follow-Up Commands

```powershell
npm run test:employee-entry-route-switch
npm run compare:employee-entry-routes
npm run rehearse:employee-entry-rollback
npm run test:employee-entry-production-lock
npm run verify:dashboard-unchanged
npm run verify:handover-legacy-unchanged
npm run gate:money-reconciliation
npm run security:secrets
```
