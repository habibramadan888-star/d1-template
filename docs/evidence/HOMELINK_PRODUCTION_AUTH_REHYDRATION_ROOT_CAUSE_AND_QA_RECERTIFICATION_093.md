# HOMELINK Production Auth Rehydration Root Cause and QA Recertification 093

## Scope and safety

- Production read-only diagnostic version: `3926f217-7a34-4e4c-a2a4-e8b98730c783`.
- Safe Production version restored: `84ee2023-f550-47e0-9e4f-3caa161a3431` at 100% traffic.
- Diagnostic cutover: `2026-07-18T07:46:01.376Z` to `2026-07-18T07:46:53.539Z` (about 52 seconds).
- Production business POST/Upload: none.
- Production D1 counts before and after: sessions `118`; transactions `3192`.
- Cookie value, token, password, and complete authentication response were not read or recorded.

## First divergence

- Layer: Employee presentation/DOM state after authentication.
- Function: `applyEmployeeUser` / `setEmployeeAuthState` label rendering boundary.
- Field: the adjacent role/account label `textContent` remained the static restoring copy.
- Candidate state after approximately 4.5 seconds: body auth state `AUTHENTICATED`, verified Staff identity applied, Current Session count `1`, Bed Transfer enabled, while the two adjacent labels still read the restoring copy.
- `/employee` and authenticated Employee API traffic returned HTTP 200 on the exact candidate version. Cookie presence was observed as yes with the value redacted. The isolated `/api/me` event was not separately retained by the tail; the `AUTHENTICATED` state is reachable only after the formal `/api/me` success path accepts a Staff response.
- Root cause confidence: confirmed, high.

## Minimal correction

- The role and account label nodes now have stable IDs and are rendered from the authentication state machine.
- Initial rehydration remains fail-closed and does not expose another user's draft.
- Existing authenticated content remains visible across transient 503, timeout, network, and non-JSON responses.
- Only a real 401 enters `AUTH_REQUIRED`.
- Retries are bounded; concurrent checks join one in-flight request.
- A bounded diagnostic envelope records timing, HTTP status, content type, response class, Worker/asset version, and attempt order without identity or credential material.
- `/api/me` uses `no-store` and emits non-sensitive Worker/asset response headers.
- Seven-event runtime, upload protocol, canonical write, Finance, Owner runtime, and TTLock paths were not changed.

## Automated verification

- Auth targeted matrix: 33/33 passed.
- Core QA/Full/Negative/Recovery/aggregate/resumable/fingerprint/TTLock/Exit Event group: 94/94 passed.
- Golden seven-event harness: 16/16 passed; idempotent retry new writes `0`; TTLock external calls `0`.
- QA acceptance platform local verification: passed with formal write count `0`.
- Worker and inline syntax: 691 files passed.
- Secret scan: passed.
- Wrangler: locked `4.94.0`; QA dry-run passed.
- Git diff check: passed.
- Artifact reproducibility: passed by two Wrangler dry-runs.

## Independent QA Full recertification

- Artifact SHA-256: `fa3d7acaa41a1515f3a2135cf3aa1c48a552c6f5f7829bee467e982aac97e54c`.
- Artifact source commit: `d260e18763485aed3b7982d1a004bb6e13bba32f`.
- QA Worker version: `36b5d77f-ad25-4ac4-917f-7dcddc7d9d97`.
- QA Run: `QA-20260718-D8FEE436`.
- Run status: `AUTOMATION_PASS`.
- Scenario count: `46` = Employee records `41` + automation-only `5`.
- Aggregate validate-only: `41/41` passed; failed `0`.
- Header, sticky summary, and DOM card count: `41`; unique Entry IDs: `41`.
- Ten settled refreshes: `10/10` restored `AUTHENTICATED`, Staff role, 41 cards, and 41 passed statuses.
- Formal write count: `0`; Upload Session was not clicked.
- TTLock/OAuth/Lock List/Identity Card external calls: `0` on the frozen QA snapshot contract.
- Manual Employee status: `PENDING`.

## QA environment reset note

- The first recertification attempt exposed stale QA-only Full Run fingerprints after the formal Cleanup soft-voided sessions but left archive/event evidence queryable.
- No idempotency rule was relaxed. Replaced QA Runs were scoped through formal Cleanup, their evidence directories remained independent, and only rows already marked as prior QA cleanup evidence were removed from the disposable QA certification data plane before issuing the final clean Run.
- Production bindings, configuration, data, authentication, migration state, and traffic were not changed by QA recertification.
