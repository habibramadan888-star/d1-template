# Infrastructure Status

Generated: 2026-05-23, Asia/Dubai

## Cloudflare / D1 / Worker

- Current D1 database name: `homelink`
- Current D1 database id: `562aa079-1cca-4176-ba3b-7276a65f98fb`
- Primary wrangler config: `deploy-worker/wrangler.toml`
- Embedded wrangler config: `deploy-worker/wrangler.embedded.toml`
- Primary Worker name: `homelink-finance`
- Primary Worker main: `deploy-worker/src/index.js`
- Embedded Worker main: `deploy-worker/src/index.embedded.js`
- Assets binding: `ASSETS`, directory `deploy-worker/public`
- D1 binding: `DB`
- KV binding: `RATE_LIMIT`
- KV namespace id in config: `c7c64d522d964baba2e72454e7262da9`
- Static env var in config: `CORPID = "homelink"`

## Required Checks

| Check                                  | Status             | Evidence                                                                                                                                                      | Risk                                                         |
| -------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Dev / staging / production separation  | Not complete       | `deploy-worker/wrangler.toml` and `deploy-worker/wrangler.embedded.toml` do not define separate environment strategy                                          | Production/test confusion risk                               |
| Local D1 exists                        | Verified for local | `npm run verify:clean-d1` uses a disposable empty local D1 and passes three consecutive Windows runs without `EBUSY`                                          | Production migration still requires human review             |
| Clean bootstrap flow                   | Verified for local | `npm run db:local:bootstrap`, `npm run verify:clean-d1`, and `npm run probe:clean-bootstrap` pass; P0-005A added awaited Worker shutdown and retrying cleanup | Production migration not executed                            |
| Migration files                        | Partial            | `migrations/local/001_clean_legacy_bootstrap.sql`, `migrations/001_employee_anchor_schema.sql`, migration drafts                                              | Local legacy bootstrap exists; commercial migration is draft |
| Runtime `CREATE TABLE` / `ALTER TABLE` | Present            | `DATABASE_STATIC_SCAN.md` runtime DDL findings                                                                                                                | Schema drift and concurrency risk                            |
| KV binding                             | Present            | `RATE_LIMIT` in wrangler configs                                                                                                                              | Binding exists, runtime behavior not fully validated         |
| RATE_LIMIT                             | Partial            | KV binding exists                                                                                                                                             | Policy behavior and production thresholds not verified       |
| Worker local startup record            | Verified           | `npm run smoke:with-worker` and `npm run verify:clean-d1` pass                                                                                                | Browser E2E remains separate                                 |
| Embedded Worker generation             | Present            | `deploy-worker/scripts/build-embedded-worker.js`, `src/index.embedded.js`                                                                                     | Drift risk remains                                           |
| Source vs embedded drift               | Risk present       | `BLOCKER_REPORT.md` source boundary blocker                                                                                                                   | Direct patching can break bundled production source          |
| Deploy commands                        | Present as dry-run | `npm run build` executes `wrangler deploy --dry-run`                                                                                                          | Dry-run is safe; production deploy not proven                |
| Production deploy executed today       | No evidence        | Git/report review and build logs                                                                                                                              | None from this reconciliation                                |
| Production data mutation today         | No evidence        | Migration/rehearsal reports indicate local/draft only                                                                                                         | None from this reconciliation                                |

## Can A New Customer Environment Be Initialized From Zero?

Yes for local/dev/test bootstrap. No for production SaaS rollout without human-approved migration and tenant setup.

Missing pieces:

- Clean local legacy bootstrap is verified with `npm run verify:clean-d1`; P0-005A confirmed three consecutive Windows runs with clean shutdown and cleanup.
- Employee entry smoke against clean local D1 now passes.
- Runtime DDL still exists and must be replaced by migration-controlled schema.
- Tenant/company/property bootstrap model is not complete.
- Default credential/setup flow is not production-safe.

## Most Dangerous Deployment Risk

The Worker source boundary is not clean. The project has a large legacy Worker and an embedded Worker output. Directly patching bundled or embedded code can create source drift and regressions across employee, owner, and API behavior.

## Most Dangerous Data Risk

Financial data can still be represented with `REAL` / JavaScript `Number` in legacy paths. Clean local bootstrap is fixed, but P0-001 money precision remains the largest data risk.

## Current Safe Infrastructure Work

- Keep using dry-run build only.
- Add or update documentation/tests/audits.
- Prepare non-production migration rehearsal scripts.
- Do not run production `wrangler deploy`.
- Do not run production D1 migration.
