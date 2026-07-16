# QA Owner Auth Handoff and Console Recovery 076

## Scope

- QA only: `homelink-finance-qa`
- QA Run: `QA-20260716-4FB51FAF`
- Production deployment, traffic, bindings, migration, and business data: unchanged
- Manual Employee acceptance: not clicked
- Upload Session: not clicked

## Owner account and handoff

- QA Owner account source: QA Worker `USER_ACCOUNTS` secret metadata, not Production D1 or Production auth
- User ID: `qa-owner`
- Role: `manager`
- Company: `HL-QA`
- Account count: 1
- Lock and failed-login account fields: not present in the current account contract
- Root classification: `QA_OWNER_PASSWORD_NOT_DELIVERED`
- Delivery: high-entropy, hash-only, Run-scoped, purpose-scoped, single-use QA Owner handoff code
- Owner session uses the isolated host-only `__qa_owner_session` cookie; Employee continues to use `__session`
- Test code success: PASS
- Test code reuse: HTTP 409 `QA_OWNER_HANDOFF_ALREADY_USED`
- Test code expiry: HTTP 410 `QA_OWNER_HANDOFF_EXPIRED`
- Wrong-company scope: HTTP 403 `QA_OWNER_HANDOFF_SCOPE_MISMATCH`
- Owner session persistence: PASS
- Owner logout SID revocation and Employee session preservation: PASS in executable local Worker verification
- No plaintext code, password, hash, token, or Cookie is stored in this evidence

## Endpoint defects

### Employee arrears directives

- Before: HTTP 500, request ID `13e9cadb-f35d-42b1-8ff2-08ab062d62b9`
- Root cause: QA-only `arrear_tasks` schema lacked directive projection columns
- Classification: `NON_BLOCKING_QA_ENDPOINT_DEFECT`
- Fix: idempotent QA-only column/index bootstrap plus bounded JSON fallback
- After: HTTP 200 with QA Staff authentication
- TTLock calls added: 0

### Automation attestation

- Before: HTTP 409 `QA_RUN_STATE_CONFLICT`, request ID `204c14bb-9419-44ef-8968-c8fba4db5663`
- Root cause: a new revalidation attempt reached an `AUTOMATION_PASS` Run while the old recorder rejected that state before comparing the attestation
- Fix: exact attempt plus exact result digest is idempotent HTTP 200; a different attempt refreshes; same attempt with a different digest fails closed
- After: HTTP 200, status `AUTOMATION_PASS`

## Live QA acceptance facts

- Artifact SHA-256: `a49ac3590b25a8567a6bf8362cf7968fdf17f4cabae476218eb437342113b304`
- Artifact commit: `a265ee491bab20ad3308133d422c564964694fa7`
- QA Worker version: `16c0304b-4aaa-4ebd-8057-f51921acb1da`
- Aggregate HTTP: 200
- Validation results: 16
- Passed: 16
- Failed: 0
- Refresh result: 16/16 retained
- Employee Review: PENDING
- Accept Employee Review button: visible to QA Owner/Manager and not clicked
- QA Staff accept attempt: HTTP 403 `QA_MANAGER_REQUIRED`
- Formal write count: 0
- Run-scoped session rows: 0
- Run-scoped transaction rows: 0
- Run-scoped arrears task rows: 0
- TTLock external calls: 0

## Production closure

- Production version before and after: `84ee2023-f550-47e0-9e4f-3caa161a3431`
- Production traffic: unchanged at 100% on the same version
- Current Production code has no QA handoff implementation; its generic unauthenticated API guard closes the unknown POST
- The QA artifact's non-QA boundary returns 404 for canonical and raw QA login/Console routes
- Production business data changed: no
- Production migration applied: no
