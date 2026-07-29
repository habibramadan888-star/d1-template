# QA Acceptance QA-20260717-5BE82FDC

- Mode: full
- Status: AUTOMATION_FAILED
- Real Employee Validate Session: 41 results returned; 33 rejected as duplicate canonical fingerprints from prior cleaned QA archive
- Employee manual acceptance: unavailable until real 16/16 validation
- Upload: not executed
- Owner manual acceptance: pending
- Final reconciliation: pending
- Formal write count: 0
- Production business data changed: no

## Environment finding

- Authentication rehydration, 41-record draft visibility, and Bed Transfer capability passed.
- The reused QA D1 retained immutable canonical archives from earlier certification Runs; run-scoped cleanup had made their Sessions ineffective but global fingerprint validation still detected the archived business fingerprints.
- No Upload Session, manual acceptance, or formal business write was executed.
- Formal QA run-scoped cleanup completed. The prior QA D1 is preserved for evidence; certification moves to a fresh isolated QA D1 rather than weakening idempotency.
