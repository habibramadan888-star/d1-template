# SINGLE_CANONICAL_BED_TRANSFER_WRITE_PATH_CLOSURE

## Scope

- task: `CLOSE_INDEPENDENT_BED_TRANSFER_WRITE_PATH_AND_KEEP_SINGLE_CANONICAL_ENTRY_PATH`
- HEAD before change: `bebb722cf28e63f35a8b0d9cd0fcbe17fbcacd63`
- legacy bootstrap: `REJECTED_FOR_PHASE1`
- Bed Transfer writes: disabled
- production cutover: `PRODUCTION_NO_GO`

## Required code audit

- Employee API authorization boundary: `deploy-worker/src/index.js:8834-8836`. Authenticated user context is supplied before route dispatch; readonly-admin POST requests are rejected at the API boundary.
- Independent route: `POST /api/employee/bed-transfers` at `deploy-worker/src/index.js:8848`.
- Independent handler: `handleEmployeeBedTransferCreate` at `deploy-worker/src/index.js:7972-7974`.
- Independent response: `bedTransferCanonicalPathRequiredResponse` at `deploy-worker/src/index.js:7932-7947`.
- Independent current writes: none. The handler immediately returns before request parsing, role inspection, schema inspection, idempotency, TTLock, or D1 access.
- Historical bypass writes removed from the current handler: commit `fda8f4c`, `deploy-worker/src/index.js:3208-3218`, wrote `bed_transfer_events`, `entry_events`, audit, and idempotency records. These paths are not present in the current handler.
- Historical read access retained: `handleOwnerBedTransfers` at `deploy-worker/src/index.js:7980-8011`, including read-only `SELECT * FROM bed_transfer_events` at line 7998.
- Canonical validate route: `POST /api/employee/entry/validate` at `deploy-worker/src/index.js:8850`.
- Canonical future write route: `POST /api/employee/entry` at `deploy-worker/src/index.js:8851`.
- Event mapping: `employeeEntryUploadType` maps `bed_transfer` to `TF` at `deploy-worker/src/index.js:2672-2680`.
- Validator dispatch: `TF` and `TFF` dispatch to the existing `validateBedTransferUploadFields` at `deploy-worker/src/index.js:2651-2669`. The attachment called this `validateEmployeeBedTransferUploadFields`; that name does not exist in current source and no validator was renamed.
- Strict Phase 1 validation: `validateEmployeeBedTransferPhase1` is called at `deploy-worker/src/index.js:2957-2960`.
- Source firewall: `bedTransferForbiddenIdentityFailure` is defined at `deploy-worker/src/index.js:2833-2851` and executes before validation/schema access at lines 2882-2884 and before canonical write-schema access at lines 3247-3252.
- Validate preview builds structured `sessions.entries_json` content at `deploy-worker/src/index.js:2981-2989` without writing.
- Canonical employee entry builds and stores `sessions.entries_json` at `deploy-worker/src/index.js:3435-3464`.
- Bed Transfer write gate remains before schema/write work at `deploy-worker/src/index.js:3249-3252` and requires exact `BED_TRANSFER_WRITE_APPROVED="true"` through `bedTransferWriteApproved` at lines 7917-7919.

## Implementation

`POST /api/employee/bed-transfers` now deterministically returns HTTP 409 with:

- `error_code = BED_TRANSFER_LEGACY_WRITE_PATH_DISABLED`
- canonical write endpoint `/api/employee/entry`
- validate endpoint `/api/employee/entry/validate`
- `bed_transfer_write_enabled = false`
- `write_attempted = false`
- `business_data_written = false`
- `production_cutover = PRODUCTION_NO_GO`

The handler performs zero business writes and zero TTLock calls even if `BED_TRANSFER_WRITE_APPROVED` is supplied as `true`. No schema, historical row, or historical read path was removed.

## Tests

Required targeted command:

```text
node --test --test-concurrency=1 tests/bed-transfer-canonical-write-closure.spec.mjs tests/bed-transfer-source-of-truth-firewall.spec.mjs tests/employee-source-of-truth-firewall.spec.mjs tests/bed-transfer-phase1-safety-gate.spec.mjs tests/employee-entry-7-event-dispatch-isolation.spec.mjs tests/employee-7-event-source-contract.spec.mjs
```

Result: `47 passed / 0 failed`.

Covered behavior:

- independent route fixed non-2xx response and deterministic error code;
- no request parsing, auth-handler work, schema access, D1, TTLock, idempotency, provider identity, or business write;
- canonical validate route remains no-write;
- canonical employee entry route and `sessions.entries_json` path remain present;
- Bed Transfer validator and source firewall remain present;
- production Bed Transfer write gate remains closed and no test enables a real write;
- Rent, Arrears Payment, Deposit In, Deposit Out, Checkout, Expense, and Bed Transfer dispatch isolation passes;
- unknown/missing event types do not fall back to Rent;
- legacy historical `bed_transfer_events` remain read-only and are not deleted.

Security command:

```text
npm run security:secrets
```

Result: `Secret hygiene check passed.`

An exploratory broader template suite also passed its seven-event template, validation, and renderer checks but retained an unrelated pre-existing owner-decoder source-text assertion failure. That assertion is outside this task; the required owner decoder/source-contract coverage passed in `employee-7-event-source-contract.spec.mjs`.

## Verification result

- verification level: `TEST_PASS`
- legacy route fail closed: `PASS`
- legacy route business writes: `0`
- legacy route TTLock calls: `0`
- canonical employee entry path preserved: `PASS`
- canonical validate path preserved: `PASS`
- `sessions.entries_json` path preserved: `PASS`
- source-of-truth firewall: `PASS`
- seven-event regression: `PASS`
- database schema changed: no
- historical data deleted: no
- production called: no
- deployment: no
- migration applied: no
- Bed Transfer write enabled: no
- Bed Transfer status: `NOT_VERIFIED / REQUIREMENTS_REVIEW`
- production cutover: `PRODUCTION_NO_GO`

Recommended next task: `DEFINE_DURABLE_STAY_CONTEXT_ID_AND_CANONICAL_TRANSFER_LINEAGE_CONTRACT_ONLY`.
