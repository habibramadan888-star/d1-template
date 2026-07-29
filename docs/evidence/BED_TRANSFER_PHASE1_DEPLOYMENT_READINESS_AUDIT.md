# Bed Transfer Phase 1 Deployment Readiness Audit

## Classification

- Final classification: `LOCAL_DEPLOYMENT_PACKAGE_READY`
- Verification level: `TEST_PASS`
- Scope: default-disabled local deployment package only.
- This is not deployment, production verification, live verification, or approval to enable writes.

## Run identity

- Task: `HOMELINK_BED_TRANSFER_PHASE1_DEPLOYMENT_READINESS_AUDIT_013`
- Repository: `C:/Users/Chinalink/Desktop/软件迭代-worktrees/bed-transfer-canonical-write-closure`
- Branch: `fix/bed-transfer-canonical-write-closure`
- HEAD before: `9295edeb6888d4b0e1eeaec210eabd2e82216b81`
- Runtime/build fix commit: `5c1f28302316ad3b6e794365f10d103218f2426e`
- Worktree baseline: clean
- Merge/rebase/cherry-pick/revert state: none
- Git remote URL: `UNKNOWN` (no remote configured)

## Phase 1 commit chain

| Capability | Commit |
| --- | --- |
| Contract and canonical link anchor | `c6129f7`, `bbbd805` |
| Canonical path closures | `407ccc0` |
| Source-context resolver | `d180379` |
| Canonical archive write behind gate | `db21868` |
| TTLock sequence compatibility | `895a10a` |
| Owner History lineage | `e45ff53` |
| Finance/Arrears projection | `1be3830` |
| Derived AP lifecycle | `3ddf572` |
| Owner Today Todo | `09a222b` |
| Employee UI/validation | `688f1bf`, `6a529f8` |
| Owner UI | `83c85c8` |
| Local A-G acceptance | `6aa858b`, `9295ede` |
| Deployment capability fail-closed fix | `5c1f283` |

## Entrypoint and active assets

| Item | Confirmed fact |
| --- | --- |
| Worker name | `homelink-finance` |
| Default deployment config | `deploy-worker/wrangler.toml` |
| Default active Worker entrypoint | `deploy-worker/src/index.js` |
| Static asset binding | `[assets] directory="./public", binding="ASSETS", run_worker_first=true` |
| Employee route | Authenticated `/employee` serves `/employee-v3` from `deploy-worker/public/employee-v3.html` |
| Owner route | Authenticated `/owner` serves `/index-51` from `deploy-worker/public/index-51.html` |
| Active Owner JavaScript | `index-51.html` references `index-51-main.js` and supplemental `index-51-cp.js`; Bed Transfer UI is in `index-51-main.js` |
| Legacy paths | `employee-v2.html`, `index.html`, `index-51.html`, and `owner.html` browser routes are intercepted and redirected to canonical authenticated routes |
| Embedded alternative | `wrangler.embedded.toml → src/index.embedded.js` exists but is not the approved default deployment path |
| Source/embedded drift | Committed embedded hash differs from freshly generated output. Existing governance explicitly says this does not block default `wrangler.toml` ASSETS deployment, but `wrangler.embedded.toml` must not be used without controlled refresh/review |

Active Employee and Owner assets are uniquely determined by `handleAppEntryRoute`; there is no active-asset ambiguity on the default config.

## Feature gate matrix

| Boundary | Exact gate/source | Default unset | Enabled value | Malformed behavior | Bundled/UI behavior |
| --- | --- | --- | --- | --- | --- |
| Canonical Bed Transfer real write | `BED_TRANSFER_WRITE_APPROVED` via `bedTransferWriteApproved` | false | trimmed, case-sensitive string `"true"` | false | Capability mirrors the server gate; Employee final Session Upload stays disabled unless capability is explicitly true |
| Owner waiver acknowledgment | `OWNER_TODAY_TODO_ACK_ENABLED` plus `APP_ENV` via `ownerTodayTodoAcknowledgmentWriteEnabled` | false | `1/true/yes/on` and APP_ENV in `development/dev/local/test` | false; production/staging APP_ENV fails | Capability false hides acknowledgment button and direct UI invocation fails closed |
| Employee Bed Transfer UI | Server `/api/capabilities`; in-memory default `bed_transfer_write_enabled:false` | validation-only | server boolean true | invalid/fetch failure resets false | Form remains visible for validate-only/draft; final business upload disabled |
| Owner Bed Transfer read UI | No write-visibility gate; canonical Gateway read projection | visible/read-only | N/A | Gateway failures fail closed | Read views remain available; acknowledgment control is separately gated |
| Direct route closure | `POST /api/employee/bed-transfers` → `bedTransferCanonicalPathRequiredResponse` | always closed | none | closed | HTTP 409, no business write |
| `save_session` closure | `saveSessionContainsBedTransfer(body)` | always closed for TF representations | none | closed | Returns canonical-path-required response before schema/write work |
| Validate-only | `POST /api/employee/entry/validate` | available to authenticated Employee flow | N/A | validation failure returns no-write diagnostics | `no_write_requested:true`; no business write |

## Capability contract

Authenticated `GET /api/capabilities` returns only:

- `bed_transfer_validate_enabled`
- `bed_transfer_write_enabled`
- `owner_waiver_ack_enabled`
- `canonical_write_path`
- `production_cutover`
- public `app_version`

It does not return raw environment values or secrets. Employee and Owner clients both initialize false, accept only boolean responses, and remain false after HTTP, JSON, or contract failure. No capability write endpoint was added.

## Migration and schema compatibility

- Phase 1 transfer validation/write/projections use existing `sessions.entries_json`.
- No new D1 table, column, or index is required.
- Migration `migrations/008_durable_stay_context.sql` exists but was not applied.
- The Worker imports dormant Durable Stay helpers for broader non-transfer functionality, but no migration SQL/schema module is imported and Phase 1 Bed Transfer does not require `stay_contexts` or `stay_event_links`.
- Durable Stay materialization remains independently guarded by exact `DURABLE_STAY_WRITE_APPROVED="true"` plus table readiness.
- Neither Wrangler config has an automatic migration hook.
- The local generator/build step performs no migration.

Status: `NO_PHASE1_MIGRATION_DEPENDENCY`.

## Local artifact

- Artifact type: generated embedded-source deployment evidence package with static assets plus resolved repository module tree.
- Artifact path: `C:/Users/CHINAL~1/AppData/Local/Temp/homelink-bed-transfer-readiness-8c9b4a3/deploy-worker/src/index.embedded.js`
- Artifact size: `2480115` bytes
- SHA-256: `7d8693eba7bdce6b5adb2cd161de17a74f4e198e93529d7c22546846a5433de7`
- Generated at: `2026-07-12T15:33:52.8401955+04:00`
- Source HEAD: `5c1f28302316ad3b6e794365f10d103218f2426e`
- Generation command: copy `deploy-worker`, `modules`, and `dist` to an isolated system temp directory; run `node deploy-worker/scripts/build-embedded-worker.js`; run `node --check index.embedded.js`.
- Build network used: no
- Wrangler/Cloudflare API used: no

Artifact checks:

- syntax valid
- Employee and Owner asset keys present
- canonical Employee/Owner route selection present
- capability route and both real gate functions present
- direct and `save_session` routes closed
- no absolute Windows user path
- no `.dev.vars`
- no test fixture path
- no source-map reference
- no embedded secret value observed
- all 18 relative imports in the default source resolve with exact filename case

The committed `index.embedded.js` remains stale and was not modified because the default deployment path is `wrangler.toml`; the generated temp artifact proves the generator output only. A deploy operator must use `--config wrangler.toml`, not `wrangler.embedded.toml`.

## Build command boundary

Official Wrangler dry-run was `NOT_RUN_WITH_REASON`:

- no global Wrangler
- no local `node_modules/.bin/wrangler`
- repository `node_modules` absent
- dependency download/network use forbidden by this task

The repository's pure Node embedded generator and static entrypoint/import verification were used instead. No `npx`, install, login, Cloudflare API, production URL, D1, KV, or secret was accessed.

## Test commands and results

| Layer | Result |
| --- | --- |
| `node scripts/check-syntax.mjs` | 635 files passed |
| Relative import existence and exact-case scan | 18/18 passed |
| Capability/gate/route/assets/UI/A-G/firewall targeted suite | 126/126 passed |
| Seven employee-event dispatch/firewall regression | 97/97 passed |
| Phase 1 required-term unique inventory | 593/593 passed across 112 files; 0 failed, 0 skipped |
| Temp generated artifact `node --check` | passed |
| `git diff --check` | passed |

The additional six employee event types remain covered and unchanged by the capability-only runtime diff.

## Deployment diff from HEAD 9295ede

| Area | Diff |
| --- | --- |
| Worker runtime | Added authenticated read-only `GET /api/capabilities`; removed stale source-map comment |
| Employee asset | Added server capability load/fail-closed state and disabled final TF Session Upload when write capability is false |
| Owner asset | Added capability load/fail-closed state and hides/blocks waiver acknowledgment unless enabled |
| Build tooling | Embedded generator now supports LF and CRLF source checkouts |
| Modules/business algorithms | unchanged |
| Tests/docs | Added deployment capability contract tests and this evidence |
| Migrations/schema | unchanged; migration 008 present and unapplied |
| Environment/config | no changes |
| Expected new route | `GET /api/capabilities` |
| Expected changed routes | none |
| Unchanged transfer routes | validate-only, canonical employee entry, Owner History, Finance, Arrears, Today Todo |
| Write-disabled routes | direct Bed Transfer route and `save_session` Bed Transfer remain always disabled |
| Conditionally gated routes | canonical `/api/employee/entry` TF write; Owner acknowledgment |
| Production data model changed | no |
| Migration required | no |

Backward-compatibility risk is low and additive: one authenticated GET route and client-side fail-closed guards. Existing six Employee events and all read projections remain unchanged.

## Rollback reference

Historical committed evidence identifies `ba9584fed13200a422f72433eed2c455f2c06316` (`feat: add readonly bed transfer phase1 validator`) as the locally present deployed commit object. It is an ancestor of this branch.

This audit did not access production, so current live Worker version and whether that historic reference remains deployed are `UNKNOWN`. Current HEAD must not be described as deployed. Code rollback for this audit's additive change is the parent of `5c1f283`, namely `9295edeb6888d4b0e1eeaec210eabd2e82216b81`, subject to normal human deployment approval.

## Known warnings and unresolved decisions

- `TTLock expiry API field`: UNKNOWN
- `timestamp unit`: UNKNOWN
- `API timezone`: UNKNOWN
- `D0 meaning`: UNKNOWN
- `multi-D conflict rule`: UNKNOWN
- Current live/deployed Worker version: UNKNOWN
- Git remote URL: UNKNOWN
- Embedded alternative config remains stale and must not be used.
- Static Owner HTML references an integrity-pinned Chart.js CDN asset; no CDN request occurred during this audit.

## Fixed safety facts

- production_called=no
- production_business_data_changed=no
- migration_created=no
- migration_applied_to_staging=no
- migration_applied_to_production=no
- deployment=no
- bed_transfer_write_enabled_in_production=no
- owner_ack_write_enabled_in_production=no
- bed_transfer_status=NOT_VERIFIED / REQUIREMENTS_REVIEW
- production_cutover=PRODUCTION_NO_GO
