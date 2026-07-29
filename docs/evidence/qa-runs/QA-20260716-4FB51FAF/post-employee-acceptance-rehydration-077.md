# QA 077 Post-Employee-Acceptance Rehydration

- QA Run: `QA-20260716-4FB51FAF`
- Result: `PARTIAL_AWAITING_MANUAL_UPLOAD`
- Run status before and after: `MANUAL_EMPLOYEE_ACCEPTED`
- Employee Review: `ACCEPTED`
- Cleanup status: `NOT_RUN`
- Upload Session clicked: no
- Formal writes: 0
- Canonical anchors: 0
- Run sessions: 0
- Transactions: 0
- Run-scoped arrears rows: 0
- TTLock external calls: 0

## First divergence

The authenticated Employee draft request returned HTTP 200 with 16 scenarios, but the Employee delivery contract rejected `MANUAL_EMPLOYEE_ACCEPTED` as an unsupported client state. The client catch path then cleared the in-memory presentation and rendered a misleading zero-record session. Authentication, persisted Run data, Employee Review status, artifact identity, payload hash, and the server draft contract were intact.

## Repair contract

- `AUTOMATION_PASS`: viewable, Upload locked.
- `MANUAL_EMPLOYEE_ACCEPTED`: same 16 reviewed records rehydrated, Upload unlocked only for authenticated QA Staff.
- `UPLOAD_PASS`: same records rehydrated read-only.
- Cleanup, artifact, payload, matrix, Worker, or Entry-ID drift: fail closed.
- Accepted validation proof is reusable after its ordinary TTL only when it was accepted inside the original TTL and remains an exact 16/16, zero-write, artifact/Worker/matrix/payload/Entry-ID match.
- QA Owner and Staff cookies remain separate; Owner cannot use QA Employee write or upload-complete routes.
- 401 requires login. Role 403 and transient 409/500 preserve the existing records and show a Run-level error.

## Artifact lineage

- Reviewed Run artifact: `a49ac3590b25a8567a6bf8362cf7968fdf17f4cabae476218eb437342113b304`
- Reviewed Run commit: `a265ee491bab20ad3308133d422c564964694fa7`
- Reviewed payload hash: `74c8dd64a3c79be7a566b2008ae5acd479876c604cfdb081d51ea2e52fc53ab3`
- Rehydration artifact: `13f3b6bc6c106b7163b3f9b4db8607febaf4d8a2dd5db705525792c0357fc3d5`
- Rehydration code commit: `90edb7cd5660121b71eb81058972664566b83a24`
- QA Worker version: `042675f6-208d-48b1-9e35-d314b36a65cd`
- Compatibility scope: `employee_post_acceptance_rehydration_v1`
- Compatibility lineage entries: 1, exact to this Run, reviewed artifact, reviewed commit, and reviewed payload hash.

## Live verification

- `/api/me`: authenticated QA Staff.
- Employee draft API: 200, `MANUAL_EMPLOYEE_ACCEPTED`, 16 records, Employee Review `ACCEPTED`.
- Header: 16.
- Sticky summary: 16.
- DOM cards: 16.
- Validation Passed cards: 16.
- QA storage indicator: 16.
- Server record indicator: 16.
- Unique Entry IDs: 16 by the immutable server draft and validated manifest contract.
- Reload parity: 16/16 across three settled page reloads.
- Second browser: Chrome QA Staff session rehydrated 16/16 and displayed Upload unlocked.
- Upload Session clicked: no.
- Production Worker before and after: `84ee2023-f550-47e0-9e4f-3caa161a3431`, 100% unchanged.
- Production business data changed: no.

## Automated verification

- Focused rehydration/state-machine tests: 43/43 passed.
- QA and cross-system regression group: 145/145 passed.
- Local QA Worker/D1/KV platform verification: passed at `MANUAL_EMPLOYEE_ACCEPTED`, formal writes 0.
- Inline/Worker/script syntax: passed.
- Secret hygiene: passed.
- Wrangler 4.94.0 reproducible QA artifact dry-run: passed twice.
- Git diff check: passed.
