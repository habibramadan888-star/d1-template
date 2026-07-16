# Homelink QA Topology and Isolation Contract

Status: binding pre-resource contract for `HOMELINK_END_TO_END_QA_ACCEPTANCE_PLATFORM_074`.

## Production facts

| Boundary | Production value |
| --- | --- |
| Worker | `homelink-finance` |
| Hostname | `homelink-finance.habibramadan888.workers.dev` |
| D1 binding | `DB` -> `homelink` / `562aa079-1cca-4176-ba3b-7276a65f98fb` |
| KV binding | `RATE_LIMIT` -> `RATE_LIMIT` / `c7c64d522d964baba2e72454e7262da9` |
| APP_ENV | `internal_beta` |
| Company scope | `homelink` |
| Authentication scope | Production accounts and production host-only sessions |
| TTLock scope | Production cached/live integration under the existing production policy |
| QA acceptance | `QA_ACCEPTANCE_ENABLED` must be absent or false; `/qa/acceptance` and `/api/qa/acceptance/*` must fail closed |

The production version at contract creation is `84ee2023-f550-47e0-9e4f-3caa161a3431`. Task 074 is not authorized to deploy or route traffic to Production.

## QA target contract

| Boundary | Required QA value |
| --- | --- |
| Worker | `homelink-finance-qa` |
| Hostname | Dedicated `homelink-finance-qa` hostname reported after creation |
| D1 binding | `DB` -> new `homelink-finance-qa` database; ID must differ from every Production and staging D1 ID |
| KV binding | `RATE_LIMIT` -> new `HOMELINK_FINANCE_QA` namespace; ID must differ from every Production and staging KV ID |
| APP_ENV | exactly `qa` |
| Company scope | exactly `HL-QA` |
| Authentication scope | QA-only STAFF and OWNER/MANAGER identities; no copied Production auth rows or credentials |
| TTLock scope | versioned, sanitized, frozen snapshot in QA KV; no TTLock/OAuth secrets and no live upstream access |
| QA acceptance | `QA_ACCEPTANCE_ENABLED=true` |

Remote IDs are intentionally not guessed in this pre-resource contract. They must be written into the QA deployment config and artifact manifest only after Cloudflare returns them.

## Mandatory triple gate

Every QA acceptance page, API, mutation, cleanup operation, and evidence read must independently verify all three boundaries:

1. Environment: `APP_ENV === "qa"` and `QA_ACCEPTANCE_ENABLED === "true"`.
2. Hostname: the request hostname equals the configured dedicated QA hostname; localhost is allowed only for automated local tests.
3. Bindings/company: authenticated `corpid === "HL-QA"`, configured `CORPID === "HL-QA"`, and runtime QA binding fingerprints match the committed QA binding contract.

Run creation and manual acceptance additionally require OWNER/MANAGER. Employee draft retrieval requires the authenticated QA STAFF identity and the same company scope. A missing or mismatched condition returns 404 or bounded 403 before any D1/KV mutation.

## Hard isolation invariants

- QA Worker must never bind Production or staging D1/KV IDs.
- QA Worker must not receive Production TTLock, OAuth, card-provider, or tenant credentials.
- QA data must never appear in Production History, Finance, Arrears, Todo, or authentication tables.
- Production data must never be copied into QA.
- QA cleanup is parameterized by one `QA_RUN_ID` and can address only the configured QA bindings.
- No unconditional database-wide cleanup is permitted.
- Production `/qa/acceptance` and `/api/qa/acceptance/*` remain unavailable even for manually constructed authenticated requests.
- A QA route must not use client-supplied company, D1 ID, KV ID, hostname, artifact SHA, reviewer, anchor, or canonical fingerprint as authority.
- Secrets, password hashes, session cookies, tokens, and Production personal/business data are forbidden in Git, logs, screenshots, manifests, and evidence.

## Frozen TTLock contract

QA uses a versioned sanitized snapshot containing occupied, vacant `E/e`, active, expired, deleted/controlled, D0/D100/D200, rent 700/770, missing/conflicting D, and source/target conflict cases. It contains no real person, phone, provider/card identity, token, secret, or Production raw metadata.

The QA Worker has no live TTLock credential. Any attempted `api.sciener.com` request is a failed acceptance condition. Expected run totals are:

- `TTLOCK_EXTERNAL_CALLS=0`
- `OAUTH_CALLS=0`
- `LOCK_LIST_CALLS=0`
- `IDENTITY_CARD_CALLS=0`

## Immutable artifact promotion contract

One source checkout produces one immutable candidate consisting of:

- bundled Worker module bytes;
- the complete static-asset byte set and content hashes;
- Git commit and build timestamp;
- Worker entry;
- schema and matrix versions;
- a binding-contract hash that records binding names and environment classes without secret values.

The candidate SHA-256 is calculated over a canonical manifest of those bytes. QA deployment must use the archived bundle/assets without rebuilding. Future Production promotion must use the same archived bundle/assets and verify the same candidate SHA before upload; a new build, changed asset, or changed bundle is a new candidate requiring QA again. Cloudflare version IDs may differ by Worker service, but candidate bytes and candidate SHA must not.

Task 074 may build, archive, and deploy the candidate to QA. It may only emit a fail-closed Production promotion command and contract; it must not execute Production upload, deployment, traffic change, binding change, or migration.

## QA schema and cleanup

QA bootstrap/migrations may create QA-only acceptance tables and the normal application schema in the QA D1. Reports must distinguish `QA_MIGRATION_APPLIED` from `PRODUCTION_MIGRATION_APPLIED`; the latter is always `no` for task 074.

Cleanup requires an explicit server-validated `QA_RUN_ID`, rechecks the triple gate, preserves the run/evidence manifest, and removes only repeatable QA business projections associated with that run. Cleanup cannot accept a database identifier or company override from the client.

## State machine

The only forward states are:

1. `AUTOMATION_PASS`
2. `MANUAL_EMPLOYEE_ACCEPTED` (user action only)
3. `UPLOAD_PASS` (formal Employee Upload Session only)
4. `MANUAL_OWNER_ACCEPTED` (user action only)
5. `FINAL_ACCEPTED` (reconciliation and evidence complete)

Codex and automation may not synthesize either manual acceptance. The first task-074 run must stop at `AUTOMATION_PASS` and report `PARTIAL_AWAITING_MANUAL_EMPLOYEE_ACCEPTANCE`.
