# Embedded Worker Freshness Result

Scope: read-only P1-006 freshness gate. No deploy artifact was overwritten.

## Result

- Result: **PASS**
- Source Worker: `deploy-worker\src\index.js`
- Embedded artifact: `deploy-worker\src\index.embedded.js`
- Source SHA-256: `3951fc8d8ea49d17696502993a3ee8d1cd2ec9d5d2b0ea78b630501985b63572`
- Embedded SHA-256: `b8f84fc86018c50a7799d4d4b97fe22bfd2915e65d75880d06883acb8b296e07`
- Primary wrangler main: `src/index.js`
- Embedded wrangler main: `src/index.embedded.js`
- Generated source-hash marker present: Yes

## Critical Freshness Checks

| Check                             | Source Has | Embedded Has | Status |
| --------------------------------- | ---------- | ------------ | ------ |
| staging handover route            | Yes        | Yes          | MATCH  |
| staging feature flag              | Yes        | Yes          | MATCH  |
| production-disabled APP_ENV guard | Yes        | Yes          | MATCH  |
| staging handover tables           | Yes        | Yes          | MATCH  |
| delete_session void behavior      | Yes        | Yes          | MATCH  |
| auth smoke routes                 | Yes        | Yes          | MATCH  |

## Notes

- No freshness warnings.

## Gate Meaning

- `PASS`: artifact freshness is acceptable for the checked conditions.
- `WARNING`: artifact may be stale or lacks freshness metadata, but no confirmed deploy-blocking critical drift was proven.
- `MANUAL_REQUIRED`: deploy entrypoint or artifact freshness needs human approval before staging/production deploy.
- `FAIL`: a confirmed active deploy artifact is missing critical behavior.

Current recommendation: do not deploy through the embedded config until controlled generation and human diff review are completed.
