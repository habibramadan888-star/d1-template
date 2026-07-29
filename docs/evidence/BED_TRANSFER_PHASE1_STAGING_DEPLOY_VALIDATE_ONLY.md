# Bed Transfer Phase 1 Staging Deploy / Validate-Only Evidence

## Result

- Authorization task: `HOMELINK_BED_TRANSFER_PHASE1_STAGING_DEPLOY_VALIDATE_ONLY_015`
- Source HEAD: `46df5e5b439a739be78a88e699567a4321a92e68`
- Deployment target: staging only
- Worker: `homelink-finance-staging`
- Config: `deploy-worker/wrangler.toml`
- Environment selector: explicit `--env staging`
- Entrypoint: `deploy-worker/src/index.js`
- Final task status: `ROLLED_BACK / BLOCKED`
- Verification level: `BLOCKED`
- Blocking condition: an authenticated staging application session was unavailable, so the mandatory live capability and DB-before-write gate rejection could not be proved without reading credentials, cookies, or secrets.

The staging deployment itself succeeded. The task then failed closed and automatically restored the exact pre-task staging Worker version. Production remained unchanged throughout.

## Authorization boundary

The run used only the explicitly authorized staging deploy, staging endpoint reads, Cloudflare control-plane reads, and staging rollback. It did not:

- deploy or roll back production
- call a production Worker endpoint
- read or modify production business data
- read D1 rows or KV values in either environment
- execute a staging business write
- enable either Bed Transfer or Owner acknowledgment write gates
- read or print an application credential, cookie, token, secret value, or Wrangler credential file
- run a migration or change Worker variables, secrets, bindings, routes, or repository config
- create a Bed Context fixture or use bed 334 as a success fixture

## Baseline

| Check | Result |
| --- | --- |
| Repository | `C:/Users/Chinalink/Desktop/软件迭代-worktrees/bed-transfer-canonical-write-closure` |
| Branch | `fix/bed-transfer-canonical-write-closure` |
| Required/actual HEAD | `46df5e5b439a739be78a88e699567a4321a92e68` |
| Initial worktree | clean |
| Wrangler required/installed | `4.94.0` / `4.94.0` |
| In-progress Git operation | none |

## Resolved staging target

| Field | Resolved value |
| --- | --- |
| Config | `deploy-worker/wrangler.toml` |
| Environment | `staging` |
| Worker | `homelink-finance-staging` |
| Entrypoint | `deploy-worker/src/index.js` |
| Staging D1 binding fingerprint | `19971362842c` |
| Staging KV binding fingerprint | `b8bea06dae55` |
| Source HEAD | `46df5e5b439a739be78a88e699567a4321a92e68` |

The fingerprints remained distinct from production (`1668ee16276d` D1 and `691d016d4aa7` KV). `wrangler.embedded.toml`, migration 008, and the default production target were not used.

## Pre-deploy control-plane snapshot

| Field | Result |
| --- | --- |
| Staging version before | fingerprint `ad0099f69cc0` |
| Staging deployment before | fingerprint `6ed1f6ddc795` |
| Staging deployed at before | `2026-06-01T17:01:50.135287Z` |
| Staging rollback target | exact pre-task version, fingerprint `ad0099f69cc0` |
| Production version before | fingerprint `84c7a3421576` |

The current staging version metadata showed:

- `APP_ENV=staging`
- no `BED_TRANSFER_WRITE_APPROVED` binding; code default false
- no `OWNER_TODAY_TODO_ACK_ENABLED` binding; code default false
- D1/KV fingerprints matching the isolated staging resources above

## Local deployment package verification

Wrangler generated the staging bundle using `deploy --dry-run --env staging` into a temporary directory outside the repository.

| Check | Result |
| --- | --- |
| Worker artifact | `index.js`, 905,834 bytes |
| Artifact SHA-256 | `13ff2d7ccfd818f0b689ac392e39517e97e671653bfd8ed731f4d872ae0afda9` |
| Source entrypoint SHA-256 | `7da9b4fbe8f7a96a29a001c2993fa312f6cbbb27c6280fe6ee84151074769ea5` |
| Source syntax | PASS |
| Generated artifact syntax | PASS |
| Import resolution / Wrangler bundle | PASS |
| Employee asset | present |
| Owner HTML and main JS assets | present |
| `/api/capabilities` | present and authenticated |
| Direct Bed Transfer route | fail-closed by write gate |
| `save_session` Bed Transfer | rejected |
| Canonical write gate default | false |
| Owner acknowledgment gate default | false |
| Migration dependency | none invoked |
| `.dev.vars` / absolute Windows path / test or fixture path in bundle | none found |

Targeted pre-deploy suites:

- `bed-transfer-deployment-capabilities`
- `bed-transfer-phase1-safety-gate`
- `bed-transfer-canonical-write-closure`
- `employee-bed-transfer-validation-flow`
- `employee-bed-transfer-payload-firewall`
- `bed-transfer-save-gated-ui`
- `owner-bed-transfer-waiver-ack`
- `bed-transfer-phase1-local-e2e-acceptance`

Result: **41 passed, 0 failed, 0 skipped**.

## Staging deployment

The only deployment command selected `deploy-worker/wrangler.toml` and explicit `--env staging`.

| Field | Result |
| --- | --- |
| Deployment | succeeded |
| Worker | `homelink-finance-staging` |
| Staging URL | `https://homelink-finance-staging.habibramadan888.workers.dev` |
| Newly deployed version | fingerprint `196c03ff0c78` |
| New deployment | fingerprint `7ebb31e2572c` |
| Deployed at | `2026-07-12T12:09:22.751473Z` |
| Static assets | 8 uploaded/confirmed by Wrangler |
| Source HEAD | `46df5e5b439a739be78a88e699567a4321a92e68` |
| Artifact SHA-256 | `13ff2d7ccfd818f0b689ac392e39517e97e671653bfd8ed731f4d872ae0afda9` |

Post-deploy control-plane checks proved:

- production version remained `84c7a3421576`
- staging version changed only to the new fingerprint `196c03ff0c78`
- both staging write gates remained absent/effectively false
- `APP_ENV` remained `staging`

## Public route and asset smoke

Only the staging workers.dev hostname was called.

| Route | Result |
| --- | --- |
| `/` | HTTP 200 HTML, bounded response |
| `/employee-v3` | HTTP 200 HTML; Bed Transfer form, validate route, capabilities, write-gate and `PRODUCTION_NO_GO` markers present |
| `/index-51` | HTTP 200 Owner HTML asset |
| `/api/capabilities` without app session | HTTP 401 JSON `unauthenticated`; no sensitive response key |
| `/api/history?limit=1` without app session | HTTP 401 JSON `unauthenticated` |
| `/api/owner/finance/projection` without app session | HTTP 401 JSON `unauthenticated` |
| `/api/owner/cloud-arrears/projection` without app session | HTTP 401 JSON `unauthenticated` |
| `/api/owner/today-todos?limit=1` without app session | HTTP 401 JSON `unauthenticated` |
| `/api/me` without app session | HTTP 401 JSON `unauthenticated` |

The read-only Gateway smoke therefore proved bounded JSON authentication failures and no 5xx HTML, but did not claim staging business-data correctness or emptiness.

## Capability and UI result

| Requirement | Result |
| --- | --- |
| Capability JSON values from authenticated route | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| Employee static asset loads | PASS |
| Employee authenticated UI / final-upload state | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| Owner static HTML asset loads | PASS |
| Owner authenticated UI / acknowledgment state | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| Unauthenticated auth failure | PASS; JSON 401 with no sensitive fields |

Chrome had no staging application session. A production application tab existed but was not claimed, read, navigated, or reused. The run did not inspect cookie storage or password values and did not submit login credentials.

## Validate-only matrix

The mandatory authenticated validation cases were not sent because no authorized staging application session was available.

| Case | Result |
| --- | --- |
| same bed rejection | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| bed 334 rejection | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| provider identity injection | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| server-managed field injection | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| client transfer timestamp/backfill | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| malformed fee | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| malformed price difference | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| mixed/multiple transfer entries | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| canonical no-write response | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| source-context ambiguity | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| non-JSON guard after authentication | `NOT_EXECUTED_AUTH_SESSION_UNAVAILABLE` |
| authentication failure does not leak data | PASS |
| employee-first / owner-first fixture classification | `NOT_EXECUTED_FIXTURE_UNAVAILABLE` |

No staging fixture or business row was created.

## Gate-false no-write result

The control plane and local contract proved both gates remained false, but the required authenticated real-write-shaped request could not be sent. Consequently the run could not obtain live `BED_TRANSFER_WRITE_NOT_ENABLED`, `write_attempted=false`, or an authenticated Owner acknowledgment rejection from the staging route.

Result: `BLOCKED_NO_AUTHENTICATED_GATE_FALSE_PROOF`.

Per the authorization contract, this condition required automatic staging rollback.

## Automatic rollback

| Field | Result |
| --- | --- |
| Rollback executed | yes, staging only |
| Rollback target | exact pre-task staging version, fingerprint `ad0099f69cc0` |
| Rollback command target | `homelink-finance-staging`, explicit `--env staging` |
| Rollback result | success, restored to 100% traffic |
| Final staging active version | fingerprint `ad0099f69cc0` |
| Rollback deployment fingerprint | `afb5a996c53b` |
| Rollback deployed at | `2026-07-12T12:14:16.674515Z` |
| Production version after rollback | fingerprint `84c7a3421576` |
| Production unchanged | yes |

Wrangler explicitly states that Worker rollback does not roll back bound D1/KV resources. This run did not call business write endpoints or execute a migration, so there was no business-data rollback action.

## Final safety proof

- deployment final state: `rolled_back`
- staging business data changed: no
- production business endpoint called: no
- production business data changed: no
- production Worker version changed: no
- Bed Transfer write enabled in staging: no
- Owner acknowledgment write enabled in staging: no
- Bed Transfer write enabled in production: no
- Owner acknowledgment write enabled in production: no
- migration applied to staging: no
- migration applied to production: no
- production cutover: `PRODUCTION_NO_GO`
- Bed Transfer status: `NOT_VERIFIED / REQUIREMENTS_REVIEW`

## Unresolved blockers

1. A legitimate staging employee application session is required to read `/api/capabilities` and exercise the validate-only matrix.
2. A legitimate staging owner application session is required to exercise the Owner acknowledgment gate and authenticated Owner read-only Gateway routes.
3. Gate-false no-write proof remains incomplete until authenticated requests demonstrate rejection before D1 writes.
4. Employee-first and owner-first classification remain `NOT_EXECUTED_FIXTURE_UNAVAILABLE`; no business fixture was created.
