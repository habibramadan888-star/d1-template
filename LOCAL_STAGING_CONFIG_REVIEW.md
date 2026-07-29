# Local Staging Config Review

Generated: 2026-05-25, Asia/Dubai

Scope: read-only review of local git metadata, package scripts, Wrangler config,
example env files, and existing staging QA reports. Real `.env`, `.env.local`,
`.dev.vars`, tokens, cookies, and passwords were not read.

## Git Context

| Item                 | Value                                    |
| -------------------- | ---------------------------------------- |
| Branch               | `qa/staging-resource-discovery-readonly` |
| Base commit reviewed | `20b3f25`                                |

## Worker Names From Config

| Config                                 | Worker Name        | Main                    | Assets Binding | Notes                     |
| -------------------------------------- | ------------------ | ----------------------- | -------------- | ------------------------- |
| `deploy-worker/wrangler.toml`          | `homelink-finance` | `src/index.js`          | `ASSETS`       | Source Worker config.     |
| `deploy-worker/wrangler.embedded.toml` | `homelink-finance` | `src/index.embedded.js` | none           | Embedded artifact config. |

## Environment Names From Config

| Source                                 | Environment Evidence                    | Staging-Specific? | Production-Specific? | Notes                                                |
| -------------------------------------- | --------------------------------------- | ----------------- | -------------------- | ---------------------------------------------------- |
| `deploy-worker/wrangler.toml`          | no `[env.staging]` / `[env.production]` | No                | No                   | Uses one Worker name and shared bindings.            |
| `deploy-worker/wrangler.embedded.toml` | no `[env.staging]` / `[env.production]` | No                | No                   | Uses same Worker name and bindings as source config. |
| `.env.example`                         | `APP_ENV="development"`                 | No                | No                   | Example only; no real secret read.                   |
| `.env.local.example`                   | `APP_ENV="development"`                 | No                | No                   | Example only; no real secret read.                   |
| `deploy-worker/.dev.vars.example`      | `APP_ENV="development"`                 | No                | No                   | Example only; no real secret read.                   |

## D1 Bindings

| Config                                 | Binding | Database Name | Database ID                            | Staging Confirmed? | Notes                                                |
| -------------------------------------- | ------- | ------------- | -------------------------------------- | ------------------ | ---------------------------------------------------- |
| `deploy-worker/wrangler.toml`          | `DB`    | `homelink`    | `562aa079-1cca-4176-ba3b-7276a65f98fb` | No                 | Matches remote D1 list but is not confirmed staging. |
| `deploy-worker/wrangler.embedded.toml` | `DB`    | `homelink`    | `562aa079-1cca-4176-ba3b-7276a65f98fb` | No                 | Same as source config.                               |

## KV Bindings

| Config                                 | Binding      | Namespace ID                       | Staging Confirmed? | Notes                                                                                      |
| -------------------------------------- | ------------ | ---------------------------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `deploy-worker/wrangler.toml`          | `RATE_LIMIT` | `c7c64d522d964baba2e72454e7262da9` | No                 | Matches remote KV list title `RATE_LIMIT`, but no separate staging namespace is confirmed. |
| `deploy-worker/wrangler.embedded.toml` | `RATE_LIMIT` | `c7c64d522d964baba2e72454e7262da9` | No                 | Same as source config.                                                                     |

## Vars And Feature Flag Names

| Name                                       | Found In                            | Value Status                        | Notes                                                           |
| ------------------------------------------ | ----------------------------------- | ----------------------------------- | --------------------------------------------------------------- |
| `APP_NAME`                                 | Wrangler configs and examples       | checked-in non-secret value         | `Homelink Finance`.                                             |
| `APP_VERSION`                              | Wrangler configs and examples       | checked-in non-secret value         | `2.0.0`.                                                        |
| `CORPID`                                   | Wrangler configs and examples       | checked-in non-secret value         | Static `homelink`; tenant isolation remains a known P0/P1 gate. |
| `APP_ENV`                                  | example env files and Worker source | not set in checked-in Wrangler vars | Staging runtime value is MANUAL_REQUIRED.                       |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` | Worker source and QA reports        | not set in checked-in Wrangler vars | Required for employee entry adapter staging QA.                 |
| `ENABLE_HANDOVER_ATOMIC_STAGING`           | Worker source and QA reports        | not set in checked-in Wrangler vars | Required for handover staging endpoint QA.                      |

## Deploy Scripts

| Script                  | Command                                                                                                               | Deploys?         | Notes                    |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------ |
| `build:worker:assets`   | `cd deploy-worker && wrangler deploy --config wrangler.toml --dry-run --outdir ../.wrangler-dryrun/assets`            | No, dry-run only | Build validation only.   |
| `build:worker:embedded` | `cd deploy-worker && wrangler deploy --config wrangler.embedded.toml --dry-run --outdir ../.wrangler-dryrun/embedded` | No, dry-run only | Build validation only.   |
| `build`                 | runs both dry-run build scripts                                                                                       | No, dry-run only | Used by `npm run check`. |

## Separation Conclusion

| Question                                                 | Answer                                                                                                                                                                                 |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Can local config distinguish staging from production?    | No                                                                                                                                                                                     |
| Is there staging-specific Wrangler config?               | No                                                                                                                                                                                     |
| Is there production-specific Wrangler config?            | No                                                                                                                                                                                     |
| Is real staging QA target confirmed by committed config? | No                                                                                                                                                                                     |
| Required next action                                     | Human must provide confirmed staging Worker URL/name, staging D1, staging KV if needed, entrypoint, feature flags, backup, rollback, and test accounts through non-committed channels. |
