# QA Validation Provenance Investigation 075

## Scope and safety

- Investigated Run: `QA-20260716-B9CA9E42`
- Formal writes: `0`
- Upload Session: not clicked
- Accept Employee Review: not clicked
- TTLock external calls: `0`
- Production version: `84ee2023-f550-47e0-9e4f-3caa161a3431` (unchanged)

## Proven root cause

The two failure codes were not emitted by the persisted current-Run validation attempt. They match the preserved old Run `QA-20260716-2830578C` exactly:

- old Run artifact: `d1e68b40f95728f6dce9078d3c1b4f1f1f99ce18c4180ad703c6c01aa54ac91d`
- old Run Worker marker: `d1e68b40f957`
- old matrix: `employee-qa-matrix-v1`
- old validation: 14 passed, 2 failed
- failures: Record #5 `LEGACY_ARREARS_CANONICAL_REF_INVALID`; Record #11 `LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING` (`note`)
- old payload hash / validation attempt: not recorded (`LEGACY_UNSCOPED`)

The current Run was created later with artifact `19bb6cac992367d5be0032622e52914d18487c0adef7f0c897f1d48e8c0173ec`, Worker marker `19bb6cac9923`, matrix `employee-qa-matrix-v2`, and payload hash `a20260f16501138882bc7c61b09ef1e4668e32359c55b1736755bebe4193574d`. Its only persisted validation result was HTTP 200 with 16/16 passed.

Before the fix, validation cards did not carry a validation-attempt ID or a complete Run/artifact/Worker/payload envelope. The generic Employee asset version also remained `upload-diagnostic-trace-20260707-001` across the QA artifact change. A loaded page could therefore continue presenting its in-memory/DOM result as current after the server Run changed. In a live reproduction, the already-open page continued to show `AUTOMATION_PASS` and 16 cards after the server had been frozen as `AUTOMATION_PASS_WITH_RECOVERY_FINDING`; refresh replaced the page with the current server result and zero cards. This proves the first divergence at the client DOM/memory boundary, not inside either business validator.

## Refresh decomposition before the fix

| Scenario | Actual result |
| --- | --- |
| Existing page, no refresh | Continued displaying the earlier in-memory `AUTOMATION_PASS`, 16 cards and 16 passed results. |
| Fresh independent browser | Server refused the frozen Run and rendered zero QA cards; no old per-record failure was fetched. |
| Refresh only | Re-fetched the server Run and removed the old in-memory/DOM state. |
| Refresh then Validate | Validation was unavailable after the Run was frozen; no write was attempted. |
| Hard refresh | Same authoritative server reload boundary as refresh. |
| Logout/login | Deferred to the corrected artifact matrix; authentication is not the source of the old diagnostic. |

## Field lineage — Record #5

| Boundary | Value |
| --- | --- |
| Current QA Run | `QA-20260716-B9CA9E42` |
| Current Session ID | `QA-20260716-B9CA9E42-S05` |
| Current Entry ID | `QA-20260716-B9CA9E42-E05` |
| Current event type | `arrears_payment` |
| Current arrears ref | `legacy-manual-QA-20260716-B9CA9E42-S05-QA-20260716-B9CA9E42-E05` |
| Current payload hash | `a20260f16501138882bc7c61b09ef1e4668e32359c55b1736755bebe4193574d` |
| Current server attestation | passed |
| Old scenario manifest | Correct old Run-scoped ref, but the old client upload clone replaced its Session ID with the logical Current Session ID. |
| Old validator result | `LEGACY_ARREARS_CANONICAL_REF_INVALID` |
| First old divergence | old Employee upload clone / request serialization |

## Field lineage — Record #11

| Boundary | Value |
| --- | --- |
| Current QA Run | `QA-20260716-B9CA9E42` |
| Current Session ID | `QA-20260716-B9CA9E42-S11` |
| Current Entry ID | `QA-20260716-B9CA9E42-E11` |
| Current checkout type | `left_with_arrears` |
| Current amount | `80` |
| Current note | `QA left with arrears fixture` |
| Current payload hash | `a20260f16501138882bc7c61b09ef1e4668e32359c55b1736755bebe4193574d` |
| Current server attestation | passed |
| Old scenario manifest note | missing |
| Old validator result | `LEFT_WITH_ARREARS_REQUIRED_FIELDS_MISSING` |
| First old divergence | old scenario manifest |

## Corrective boundary

No Legacy Arrears or Checkout business rule was changed. The correction is limited to QA provenance:

- artifact-specific Employee asset version;
- server-generated `validation_attempt_id` and trace ID;
- result binding to Run, artifact, Worker, matrix, Entry and payload hash;
- server-attestation-only display authority;
- Run/Entry-namespaced local diagnostic storage that is never display authority;
- bounded QA Error Catalog and Diagnostic Envelope;
- QA-only diagnostic console and copy bundle;
- stale asset rejection before per-record validation.

