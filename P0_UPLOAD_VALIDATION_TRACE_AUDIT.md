# P0 Upload Validation Trace Audit

Date: 2026-07-07
Branch: fix/auth-closure-001

## Scope

Read-only/diagnostic scope, with a diagnostic-only trace patch.

- No Rent business logic change.
- No Arrears Payment / Checkout / Deposit Out business logic change.
- No ENTRY_ANCHOR_CONTRACT change.
- No parser or financial formula change.
- No production data write.
- No migration.
- Production cutover remains PRODUCTION_NO_GO.

## Generic Error Sources Found

| Source | Function | Result |
|---|---|---|
| Frontend local batch validation | `commitSessionAndExport()` -> `validateUploadAnchorBatch()` failure branch | Previously synthesized `UPLOAD_VALIDATION_FAILED` before calling `/api/employee/entry/validate`. |
| Frontend record fallback | `employeeRecordValidationError()` | Previously synthesized `UPLOAD_VALIDATION_FAILED` when a failed record had only `state.uploadValidationFailedIndex` and lost the structured error object. |
| Backend dry-run failures | `employeeEntryValidationFailure()` | Already returned specific stage/error codes for most business branches, but did not expose a unified `validation_trace`. |
| Backend dry-run exception path | `handleEmployeeEntryValidate()` | Exceptions could become unstructured HTTP failures, then appear generic in frontend. |

## Diagnostic Patch

Added diagnostic trace only:

- Backend failures now include `validation_trace` with `stage`, `function`, `ok`, `event_index`, `event_type`, `error_code`, `message`, `missing_fields`, and `invalid_fields`.
- Backend success now includes a pass trace for parse, event dispatch, event validation, summary/export/decoder compatibility, and final preflight.
- Backend validate route catches dry-run exceptions and returns structured `VALIDATION_EXCEPTION` with trace. It still performs no D1 writes.
- Frontend preserves and renders `validation_trace`.
- Frontend local batch validation no longer reports stage-less `UPLOAD_VALIDATION_FAILED`; it now reports `CLIENT_ANCHOR_BATCH_VALIDATION_FAILED` with stage `client_anchor_batch_validation`.
- Frontend state fallback now includes stage `client_upload_state_fallback`.

## Current Rent Payload Local Trace

Payload reproduced from the reported current record:

```json
{
  "event_type": "rent",
  "bed": "145",
  "amount": 700,
  "paid": 700,
  "due": 700,
  "period_due": 700,
  "payment_method": "cash",
  "period_start": "2026-08-01",
  "period_end": "2026-09-01",
  "cycle": "1M"
}
```

Local frontend anchor result:

| Stage | Function | Result | Error |
|---|---|---|---|
| payload parse | local harness | PASS | none |
| event dispatch | rent | PASS | none |
| validateRentEntry | `normalizeEntryAnchor()` / contract validation | PASS | none |
| buildRentAnchor | `normalizeEntryAnchor()` / upload row preparation | PASS | none |
| session summary build | not executed locally | not observed | requires authenticated dry-run route |
| export_text build | not executed locally | not observed | requires authenticated dry-run route |
| structured anchor block build | local entries JSON preparation | PASS | none |
| owner decoder compatibility | not executed locally | not observed | requires authenticated dry-run route |
| final preflight | `validateUploadAnchorBatch()` | PASS | none |

Local result:

```json
{
  "validation_status": "valid",
  "validation_missing_fields": [],
  "batch": { "ok": true, "errors": [] }
}
```

## Exact Generic Swallow Root Cause

The exact source of the generic display is frontend-side swallowing/fallback, not a specific Rent validator:

| Question | Result |
|---|---|
| Which function returned generic `UPLOAD_VALIDATION_FAILED`? | `commitSessionAndExport()` local batch failure branch and `employeeRecordValidationError()` fallback could synthesize it. |
| Did local reproduced `validateRentEntry()` pass? | yes |
| Did local reproduced `buildRentAnchor()` pass? | yes |
| Did local reproduced frontend batch validation pass? | yes |
| Was exact backend business failing stage observable before trace patch? | no, the frontend could display a generic fallback without backend trace. |

## Live Trace Status

Worker diagnostic patch was deployed so authenticated employee UI can now show the real live dry-run stage on the next retry.

Attempted Chrome authenticated trace was not completed because the Chrome bridge returned:

```text
privileged native pipe bridge is not available; browser-client is not trusted
```

No browser cookie/session store was inspected.

## Expected New Failure Format

Future dry-run failures must return and render a structure like:

```json
{
  "ok": false,
  "stage": "rent_validation",
  "event_index": 0,
  "event_type": "rent",
  "error_code": "PERIOD_END_INVALID_FOR_1M",
  "missing_fields": [],
  "invalid_fields": ["period_end"],
  "validation_trace": [
    {
      "stage": "rent_validation",
      "function": "validateEmployeeEntryUploadPayload",
      "ok": false,
      "error_code": "PERIOD_END_INVALID_FOR_1M"
    }
  ]
}
```

Stage-less generic output is no longer acceptable.

## Tests

Passed:

- `npm run test:employee-upload-validation-trace`
- `node --test tests/employee-upload-dry-run-validation.spec.mjs`
- `node --test tests/employee-rent-upload-closure.spec.mjs`
- `npm run security:secrets`
- `npm run gate:commercial-launch`

Gate result:

```text
COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO
```

## Deployment

Worker version deployed:

```text
d0c890b9-f4ea-4a63-b8a1-7138be0800ac
```

Deployment scope:

- Diagnostic dry-run error trace.
- Frontend validation trace display.
- No D1 writes.
- No migration.

