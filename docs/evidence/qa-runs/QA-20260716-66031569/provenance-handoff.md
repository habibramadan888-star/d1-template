# QA Validation Provenance and Stale-State Handoff 075

## Run identity

- QA run: `QA-20260716-66031569`
- Artifact SHA-256: `cf20a0d9f46c2c0e92d6b6f278dfe048f92e40011fad397ca9b83acb65aad5a5`
- Artifact commit: `c4fabfbe98e39783ceb355db61192516e265c043`
- QA Worker deployment: `95f79676-99ae-4c91-ae3b-bed2acdd80ad`
- Matrix: `employee-qa-matrix-v2`, 16 scenarios
- Payload hash: `0a62426b4408bd77dcf1aa79d5451d1490be21e515d102c7708ad598b789dc0e`

## Provenance result

The preserved older findings were from `QA-20260716-2830578C`, not from the current run. The old client-side upload clone and legacy unscoped diagnostic had no complete run/artifact/worker/payload attestation. Record #5 diverged at request serialization: the old clone replaced the run-scoped Session ID with the logical Current Session ID. Record #11 diverged at the old scenario manifest, which omitted the required `note` field. The current run uses the run-scoped Session/Entry identities and complete payload contract.

The current server attempt is authoritative: `LIVE_SERVER`, HTTP 200, validation attempt `qa-val-8374f648-db0d-4216-bd32-a8638074ffd1`, 16 results, 16 passed, 0 failed, 0 formal writes, 0 TTLock external calls. Every result carries the run, artifact, worker, matrix, entry, session, and payload envelope.

## Stale-state isolation

- Fresh Run first load: 16 pending cards, 0 stale failures.
- In-app Browser validation: 16/16 passed.
- Independent Chrome reload: 16/16 passed with the same `AUTOMATION_PASS` Run state.
- Old failure codes are absent from both current DOM snapshots.
- Upload Session and Accept Employee Review were not clicked.
- `QA_RUN_STATE_CONFLICT` observed only on the superseded intermediate Run after it was already frozen as `AUTOMATION_PASS`; this was a safe state-boundary response, not a business validation failure.

## Acceptance boundary

`TASK_STATUS=PARTIAL_AWAITING_MANUAL_EMPLOYEE_ACCEPTANCE`

`QA_RUN_STATUS=AUTOMATION_PASS`

`MANUAL_EMPLOYEE_STATUS=PENDING`

`FORMAL_WRITE_COUNT=0`

The user may now inspect and accept the Employee Review. No Owner acceptance or Upload is authorized by this handoff.
