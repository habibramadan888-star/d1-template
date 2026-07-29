# Homelink Definition of Done and Anti-Fake-Pass Protocol

This document is mandatory for all future Homelink tasks. It exists to prevent false completion reports when code, static checks, or simulated tests pass but the real production user flow still fails.

## Result Labels

Use only these status labels:

- `CODE_DONE`: Code or document changes were made and committed, but deployment and live verification are not complete.
- `DEPLOYED`: The change was deployed to the Worker, but the real production user flow has not been fully verified.
- `TEST_PASS`: Local tests, static checks, fixture tests, or simulated payload tests passed.
- `LIVE_VERIFIED`: The exact production user flow was verified with live authenticated production evidence.
- `NOT_VERIFIED`: Required live evidence is missing, incomplete, or not applicable to the claimed result.

## Banned Completion Language

Do not use `PASS`, `completed`, `fixed`, `works`, `verified`, or equivalent final wording unless `LIVE_VERIFIED` evidence exists.

Allowed examples:

- `TEST_PASS`: local and fixture checks passed, but production was not verified.
- `DEPLOYED`: Worker version was deployed, but live UI/API evidence is missing.
- `NOT_VERIFIED`: no live authenticated production smoke was run.

If no live authenticated production smoke was run, final output must explicitly say:

```text
status_label = NOT_VERIFIED
NOT_LIVE_VERIFIED
```

## Proof Pack Required For Completed Tasks

Every task reported as complete must include a Proof Pack. If any item is missing, the task cannot be labeled `LIVE_VERIFIED`.

Required Proof Pack fields:

- `commit_hash`: exact git commit hash.
- `worker_version`: exact deployed Worker version ID, if deployed.
- `production_url`: exact production URL tested.
- `user_flow_tested`: exact owner or employee flow tested, step by step.
- `raw_request_payload`: raw request payload for upload/API tasks, with secrets redacted.
- `raw_response_body`: raw response body for upload/API tasks, with secrets redacted.
- `screenshot_or_log_artifact`: screenshot path, browser log, console log, network log, or saved trace artifact.
- `visible_result`: owner/employee visible UI result after the action.
- `not_verified`: explicit list of anything not verified.
- `production_write_scope`: no write, one controlled row, read-only, or exact write scope.

## Verification Rules

### Unit And Static Tests

Unit tests, static checks, fixture tests, simulated payload tests, and local smoke tests can only support:

```text
status_label = TEST_PASS
```

They can never support:

```text
status_label = LIVE_VERIFIED
```

### UI Bugs

UI bugs require production browser evidence.

Minimum evidence:

- exact production URL
- authenticated role used
- browser screenshot or screen recording
- visible before/after result
- console or network evidence when relevant

Without production browser evidence, the result must be:

```text
status_label = NOT_VERIFIED
NOT_LIVE_VERIFIED
```

### Upload And API Bugs

Upload/API bugs require raw request and raw response evidence.

Minimum evidence:

- exact endpoint
- authenticated role used
- raw request payload, secrets redacted
- raw response body, secrets redacted
- HTTP status
- UI state after response
- whether a production write happened

Without raw request/response evidence, the result must be:

```text
status_label = NOT_VERIFIED
NOT_LIVE_VERIFIED
```

### Production Writes

Production writes must be explicitly scoped before execution.

Allowed labels:

- `production_write_scope = no`
- `production_write_scope = read-only`
- `production_write_scope = one controlled row`
- `production_write_scope = exact scoped write: ...`

If production write scope is unclear, stop before writing.

## Anti-Fake-Pass Protocol

### Two-Attempt Rule

If the same bug survives two attempted fixes, stop code changes and enter forensic mode.

Forensic mode means:

- no more business code changes
- no UI rewrites
- no deployment unless the task explicitly permits diagnostic deployment
- collect the exact production path
- collect raw request/response or browser evidence
- identify the layer that failed
- write an audit or trace note before any further fix

### Evidence Before Claims

Do not infer production success from:

- local tests
- static grep checks
- deployment success
- dry-run success
- fixture success
- expected code path
- previous successful similar task

Production success requires production evidence for the exact reported flow.

### Diagnostic Failures

If a validation or diagnostic system returns a generic error without source, stage, raw response, or trace, that is itself a P0 diagnostic failure.

Do not continue business fixes until diagnostic evidence can identify the failing layer.

## Future Result Template

All future final results for Homelink tasks must use this template.

```text
status_label:
proof_pack:
  commit_hash:
  worker_version:
  production_url:
  user_flow_tested:
  raw_request_payload:
  raw_response_body:
  screenshot_or_log_artifact:
  owner_employee_visible_result:
verified_by:
not_verified:
production_write_scope:
migration:
deploy:
production_cutover:
```

## Minimum Final Output Rules

If live authenticated production smoke was not run:

```text
status_label = NOT_VERIFIED
NOT_LIVE_VERIFIED
```

If only local tests passed:

```text
status_label = TEST_PASS
NOT_LIVE_VERIFIED
```

If deployed but not live verified:

```text
status_label = DEPLOYED
NOT_LIVE_VERIFIED
```

If and only if live production evidence exists:

```text
status_label = LIVE_VERIFIED
```

