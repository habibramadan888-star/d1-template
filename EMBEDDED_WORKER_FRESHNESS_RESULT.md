# Embedded Worker Freshness Result

Scope: read-only P1-006 freshness gate. No deploy artifact was overwritten.

## Result

- Result: **MANUAL_REQUIRED**
- Source Worker: `deploy-worker\src\index.js`
- Embedded artifact: `deploy-worker\src\index.embedded.js`
- Source SHA-256: `3951fc8d8ea49d17696502993a3ee8d1cd2ec9d5d2b0ea78b630501985b63572`
- Embedded SHA-256: `300d656cdb1071ba28c96600602467680618489ee2fafe9a84d4c0fd154dda1d`
- Primary wrangler main: `src/index.js`
- Embedded wrangler main: `src/index.embedded.js`
- Generated source-hash marker present: No

## Critical Freshness Checks

| Check                             | Source Has | Embedded Has | Status |
| --------------------------------- | ---------- | ------------ | ------ |
| staging handover route            | Yes        | No           | DRIFT  |
| staging feature flag              | Yes        | No           | DRIFT  |
| production-disabled APP_ENV guard | Yes        | No           | DRIFT  |
| staging handover tables           | Yes        | No           | DRIFT  |
| delete_session void behavior      | Yes        | Yes          | MATCH  |
| auth smoke routes                 | Yes        | Yes          | MATCH  |

## Notes

- Embedded artifact is referenced by a deployable Wrangler config and is missing source-critical behavior.
- Embedded artifact has no explicit generated source-hash marker.

## Gate Meaning

- `PASS`: artifact freshness is acceptable for the checked conditions.
- `WARNING`: artifact may be stale or lacks freshness metadata, but no confirmed deploy-blocking critical drift was proven.
- `MANUAL_REQUIRED`: deploy entrypoint or artifact freshness needs human approval before staging/production deploy.
- `FAIL`: a confirmed active deploy artifact is missing critical behavior.

Current recommendation: do not deploy through the embedded config until controlled generation and human diff review are completed.
