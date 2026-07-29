# Homelink Cloudflare Environment Topology Audit

## Audit identity

- Audit time: 2026-07-12T15:59:43+04:00 (Asia/Dubai)
- Task: `HOMELINK_CLOUDFLARE_WRANGLER_LOGIN_AND_READ_ONLY_AUDIT`, resuming `HOMELINK_ENVIRONMENT_TOPOLOGY_AND_DEPLOYMENT_TARGET_AUDIT_014`
- Repository: `C:/Users/Chinalink/Desktop/软件迭代-worktrees/bed-transfer-canonical-write-closure`
- Branch: `fix/bed-transfer-canonical-write-closure`
- HEAD before: `d50afd985eada1f3d1ea16a469d6747b6e5df7ae`
- Baseline worktree: clean
- Audit classification: `PRODUCTION_READ_VERIFIED`
- Recommended next target: `ISOLATED_STAGING`
- Local package readiness remains `LOCAL_DEPLOYMENT_PACKAGE_READY`.

This audit read Cloudflare control-plane metadata only. It did not call a Worker business endpoint or read D1 rows, KV values, secrets, cookies, credentials, or production business data.

## Package and Wrangler lock

| Item | Result |
| --- | --- |
| Package root | repository root |
| package.json | committed `package.json`, SHA-256 fingerprint `80d3c597e685` |
| package-lock.json | committed lockfile v3, SHA-256 fingerprint `82abcc6d8be6` |
| Wrangler declared | `^4.0.0` |
| Wrangler locked/installed | `4.94.0` / `4.94.0` |
| Node requirement/current | `>=20` / `v24.15.0` |
| Root lifecycle hooks | no preinstall/install/postinstall/prepare/prepublish hooks |
| Install command | `npm ci --legacy-peer-deps --ignore-scripts` after npm 11 rejected the first plain peer resolution |
| Package files changed | no |
| node_modules | generated locally and ignored by `.gitignore` |
| Install warning | 6 dependency audit findings reported; no `npm audit fix` or package mutation was run |

The lockfile contains native install markers for esbuild, workerd, sharp, and optional fsevents. `--ignore-scripts` prevented lifecycle execution; Wrangler's locked platform packages were sufficient for the read-only CLI.

## Authentication

- `wrangler login` opened the official Cloudflare OAuth page.
- The user completed browser authorization.
- `wrangler whoami` passed.
- Account display: user-owned Cloudflare account; account ID fingerprint `1cf58fd0c253`.
- Credential/token/cookie content was not read or recorded.
- OAuth permission summary reported account/user read plus broad Workers platform permissions. Despite those permissions, this audit invoked only `whoami`, `deployments list/status`, `versions list/view`, and local help/version commands.

## Commands run

- `npx --no-install wrangler --version`
- `npx --no-install wrangler login`
- `npx --no-install wrangler whoami`
- `npx --no-install wrangler deployments status --config deploy-worker/wrangler.toml --name <worker> --json [--env staging]`
- `npx --no-install wrangler deployments list --config deploy-worker/wrangler.toml --name <worker> --json [--env staging]`
- `npx --no-install wrangler versions list --config deploy-worker/wrangler.toml --name <worker> --json [--env staging]`
- `npx --no-install wrangler versions view <current-version> --config deploy-worker/wrangler.toml --name <worker> --json [--env staging]`
- Read-only `--help` for deployments, versions, and rollback syntax.

No command containing deploy, upload, versions deploy, rollback execution, publish, delete, create, put, D1 execute, migration, secret mutation, tail, or business endpoint fetch was run.

## Local configuration topology

| Item | Default | Staging |
| --- | --- | --- |
| Worker name | `homelink-finance` | `homelink-finance-staging` |
| Entrypoint | `src/index.js` | `src/index.js` |
| APP_ENV | unconfigured locally | configured as staging |
| Assets | `./public`, binding `ASSETS`, Worker-first | inherited |
| D1 binding | `DB`, database `homelink`, fingerprint `1668ee16276d` | `DB`, database `homelink-finance-staging`, fingerprint `19971362842c` |
| KV binding | `RATE_LIMIT`, fingerprint `691d016d4aa7` | `RATE_LIMIT`, fingerprint `b8bea06dae55` |
| Compatibility date | `2024-09-23` | inherited |
| Durable Object/R2/Queue | none configured | none configured |
| account_id | missing from repository config | missing from repository config |

There is no route declaration in `wrangler.toml`. Repository operational docs identify the workers.dev hostnames as:

- production: `https://homelink-finance.habibramadan888.workers.dev`
- staging: `https://homelink-finance-staging.habibramadan888.workers.dev`

Neither hostname nor any Worker endpoint was fetched during this audit. Current version metadata reports preview availability for both Workers.

The only formal deployment target is `deploy-worker/wrangler.toml`. `wrangler.embedded.toml` is forbidden because its committed embedded source is stale. Migration 008 remains unapplied and forbidden.

## Remote production fingerprint

| Field | Value |
| --- | --- |
| Worker | `homelink-finance` |
| Environment | default production deployment |
| Current deployment fingerprint | `a4bcb881f424` |
| Current version fingerprint | `84c7a3421576` |
| Deployment time | 2026-07-10T16:44:27.589245Z / 2026-07-10T20:44:27+04:00 |
| Traffic | 100% current version |
| Preview metadata | available |
| Recent deployments returned | 10 |
| Versions returned | 100 |
| Source | Wrangler |
| Compatibility date from remote version metadata | UNKNOWN |
| Source commit annotation | absent |
| Commit mapping | `UNKNOWN` |

The historic `ba9584...` and `fe0d...` references are not used as current production mappings.

## Remote staging fingerprint

| Field | Value |
| --- | --- |
| Worker | `homelink-finance-staging` |
| Environment | staging |
| Current deployment fingerprint | `6ed1f6ddc795` |
| Current version fingerprint | `ad0099f69cc0` |
| Deployment time | 2026-06-01T17:01:50.135287Z / 2026-06-01T21:01:50+04:00 |
| Traffic | 100% current version |
| Preview metadata | available |
| Recent deployments returned | 10 |
| Versions returned | 21 |
| Source commit annotation | absent |
| Commit mapping | `UNKNOWN` |

## Staging isolation matrix

| Requirement | Evidence | Result |
| --- | --- | --- |
| Independent Worker | remote Worker `homelink-finance-staging` exists separately from `homelink-finance` | PASS |
| Independent route/preview namespace | distinct Worker name, separately documented workers.dev hostname, current version preview available | PASS |
| Independent D1 | current remote D1 binding fingerprints `19971362842c` vs production `1668ee16276d` | PASS |
| Independent KV | current remote KV fingerprints `b8bea06dae55` vs production `691d016d4aa7` | PASS |
| No production write binding reuse | current D1/KV identifiers differ | PASS |
| Secret scope | secret bindings are scoped to separate Worker resources; values were not read | PASS |
| Explicit deploy selection | staging requires `--env staging --config deploy-worker/wrangler.toml` | PASS |
| Rollback boundary | staging has independent deployment/version history | PASS |

Classification: `STAGING_AVAILABLE_AND_ISOLATED`.

## Remote gate matrix

No raw variable or secret values are recorded.

| Environment | Gate | Remote configured | Code default | Effective state |
| --- | --- | --- | --- | --- |
| Production | `BED_TRANSFER_WRITE_APPROVED` | no binding in current version | false | false |
| Production | `OWNER_TODAY_TODO_ACK_ENABLED` | no binding in current version | false | false |
| Production | Bed Transfer UI capability | server-derived | false until capability true | false |
| Production | validate-only capability | code available | true | true |
| Production | `APP_ENV` | unconfigured | empty | unconfigured |
| Production | `production_cutover` | code constant | `PRODUCTION_NO_GO` | `PRODUCTION_NO_GO` |
| Staging | `BED_TRANSFER_WRITE_APPROVED` | no binding in current version | false | false |
| Staging | `OWNER_TODAY_TODO_ACK_ENABLED` | no binding in current version | false | false |
| Staging | Bed Transfer UI capability | server-derived | false until capability true | false |
| Staging | validate-only capability | code available | true | true |
| Staging | `APP_ENV` | configured | staging | staging |
| Staging | `production_cutover` | code constant | `PRODUCTION_NO_GO` | `PRODUCTION_NO_GO` |

## Rollback readiness

Production rollback candidate:

- previous deployment fingerprint: `a2dfccde69cc`
- previous version fingerprint: `1934e0116fe6`
- deployed at: 2026-07-09T18:54:51.272265Z / 2026-07-09T22:54:51+04:00

Staging rollback candidate:

- previous deployment fingerprint: `c48eb929727e`
- previous version fingerprint: `cc02e37bef6a`
- deployed at: 2026-06-01T16:30:20.977584Z / 2026-06-01T20:30:20+04:00

Read-only rollback command template, not executed:

`npx --no-install wrangler rollback <FULL_VERSION_ID_FROM_FRESH_CONTROL_PLANE_READ> --config deploy-worker/wrangler.toml --name <WORKER> [--env staging]`

A Worker rollback restores that version's Worker code and bundled/static assets. It does not roll back D1 data. No migration occurred in this task, so data rollback is not applicable.

Classification: `ROLLBACK_READY`.

## Deployment target decision

`NEXT_TARGET=ISOLATED_STAGING`

Reasons:

- staging exists remotely
- Worker name and preview namespace are distinct
- D1 and KV bindings are remotely confirmed distinct
- both Bed Transfer write gates remain absent/effectively false
- validate-only remains available
- current and prior staging versions provide a rollback boundary
- local deployment package was already classified ready in audit 013

This decision does not deploy anything. Any staging deployment still requires an explicit later authorization and must use:

- `deploy-worker/wrangler.toml`
- explicit `--env staging`
- no migration 008
- Bed Transfer and Owner acknowledgment gates kept false

Production validate-only deployment is not the next target.

## Unknown values and warnings

- Production and staging source commit mappings: UNKNOWN
- Remote compatibility date was not returned by the inspected version metadata; local config says `2024-09-23`
- Cloudflare route attachment was not returned by Wrangler deployment/version metadata; workers.dev hostnames come from committed operational docs and were not fetched
- TTLock expiry API field: UNKNOWN
- timestamp unit: UNKNOWN
- API timezone: UNKNOWN
- D0 meaning: UNKNOWN
- multi-D conflict rule: UNKNOWN
- Wrangler reports a newer version, but the audit used the project-locked `4.94.0`
- npm reported 6 dependency audit findings; no dependency mutation was authorized

## Fixed safety proof

- CLOUDFLARE_CONTROL_PLANE_READ=yes
- PRODUCTION_BUSINESS_ENDPOINT_CALLED=no
- PRODUCTION_BUSINESS_DATA_CHANGED=no
- D1 business data read=no
- KV values read=no
- credential exposed=no
- deployment=no
- rollback executed=no
- migration applied to staging=no
- migration applied to production=no
- Bed Transfer production write enabled=no
- Owner acknowledgment production write enabled=no
- production cutover=`PRODUCTION_NO_GO`
