# Environment Separation Plan

Status: P1-010A plan only. Production configuration changed: no. Production deploy executed: no.

## Current State

The current Wrangler configs point at one Worker name, one D1 database, one KV namespace, and one static `CORPID` value:

- Worker name: `homelink-finance`
- D1 binding: `DB`
- D1 database name: `homelink`
- KV binding: `RATE_LIMIT`
- Static var: `CORPID = "homelink"`

This is acceptable for local validation and a single internal deployment, but not enough for commercial SaaS release. Local, staging, and production must be separated before customer data is onboarded.

## Target Environments

| Environment | Worker Name                | D1 Database                                           | KV Namespace         | APP_ENV       | ALLOW_DEV_SEED                  | Deployment Command                                           | Forbidden Command                                       |
| ----------- | -------------------------- | ----------------------------------------------------- | -------------------- | ------------- | ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------- |
| Local       | `wrangler dev` only        | Local D1 under isolated `--persist-to` or local state | Local Miniflare KV   | `local`       | `true`                          | `npm run smoke:with-worker`, `npm run verify:clean-d1`       | Any `--remote`, production deploy, production migration |
| Dev         | `homelink-finance-dev`     | `homelink-dev`                                        | `RATE_LIMIT_DEV`     | `development` | `true` only if explicitly gated | Reviewed dev deploy command                                  | Production D1/KV ids                                    |
| Staging     | `homelink-finance-staging` | `homelink-staging`                                    | `RATE_LIMIT_STAGING` | `staging`     | `false`                         | Reviewed staging deploy after smoke/auth/migration rehearsal | Dev seed, production D1/KV ids                          |
| Production  | `homelink-finance`         | `homelink-prod` or reviewed current production D1     | `RATE_LIMIT_PROD`    | `production`  | `false`                         | Human-approved production deploy only                        | Local secrets, dev seed, unreviewed migrations          |

## Secrets

| Secret                 | Local             | Dev                | Staging                | Production                |
| ---------------------- | ----------------- | ------------------ | ---------------------- | ------------------------- |
| `JWT_SECRET`           | Random local only | Separate dev value | Separate staging value | Separate production value |
| `PW_SALT`              | Random local only | Separate dev value | Separate staging value | Separate production value |
| `TTLOCK_CLIENT_ID`     | Optional mock/dev | Dev credential     | Staging credential     | Production credential     |
| `TTLOCK_CLIENT_SECRET` | Optional mock/dev | Dev credential     | Staging credential     | Production credential     |
| `TTLOCK_USERNAME`      | Optional mock/dev | Dev account        | Staging account        | Production account        |
| `TTLOCK_PASSWORD`      | Optional mock/dev | Dev account        | Staging account        | Production account        |

Real secrets must be set via Cloudflare secret management or local ignored files. They must not be committed.

## Required Config Changes Before Launch

- Add explicit Wrangler environment sections or separate reviewed config files for dev/staging/production.
- Ensure staging and production use different D1 database ids and KV namespace ids.
- Remove `CORPID` as tenant authority before shared SaaS launch, or isolate every customer by deployment.
- Fix README local setup reference from `env.example` to the actual `.env.example` / `.dev.vars.example` convention.
- Define rollback command and previous Worker version lookup.
- Define production migration approval process.

## Rollback Method

- Worker rollback: redeploy the last known-good Worker version or use Cloudflare rollback workflow after verifying no migration incompatibility.
- D1 rollback: never rely on destructive rollback. Use backup/export before migration and forward-only compensating migrations.
- Secret rollback: restore previous secret values only after confirming no active session/signature compatibility break.

## No-Go Conditions

- Staging and production share the same D1 database id.
- Dev seed can run with `APP_ENV=production`.
- A production deploy command runs from an unclean git workspace.
- Migration is executed before backup, smoke, auth, and rollback plan.
- Production config is modified by an autonomous task without human approval.
