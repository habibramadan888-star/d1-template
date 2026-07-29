# Environment Separation Hardening Review

Generated: 2026-05-25T03:42:25+04:00

Scope: hardening review for local/dev/staging/production separation. This review does not modify Wrangler production config and does not deploy.

## Current Config Findings

| Area                   | Current Evidence                                                                           | Risk                                                           | Required Hardening                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Source Worker config   | `deploy-worker/wrangler.toml` uses `name = "homelink-finance"` and `main = "src/index.js"` | Looks production-like; no staging env section                  | Add reviewed staging/dev config or environment blocks before deploy |
| Embedded Worker config | `deploy-worker/wrangler.embedded.toml` uses same `name`, D1, KV                            | Embedded deploy can target same resources                      | Human must confirm entrypoint and target before staging/prod deploy |
| D1 binding             | Both configs use `database_name = "homelink"` and same database id                         | Staging/prod separation not proven                             | Separate staging D1 and production D1 ids                           |
| KV binding             | Both configs use same `RATE_LIMIT` namespace id                                            | Rate limit/session-like data can mix                           | Separate staging and production KV namespaces                       |
| `APP_ENV`              | Not present in checked-in Wrangler vars                                                    | Feature flags rely on runtime env but config does not prove it | Set explicit `APP_ENV` per environment                              |
| Feature flags          | Not present in checked-in Wrangler vars                                                    | Real staging QA cannot prove intended flag state               | Manage flags per environment via reviewed vars/secrets              |
| Dev seed               | `.env.example` / `.dev.vars.example` document dev-only use                                 | Safe locally, but production guard must be enforced            | Keep `ALLOW_DEV_SEED=false` or absent in staging/prod               |
| Deploy command         | Package build scripts use `wrangler deploy --dry-run`                                      | Good default; actual deploy command not approved               | Keep deploy out of automated Codex tasks                            |
| Rollback               | Documented at plan level                                                                   | Not exercised in real staging/prod                             | Human must confirm Cloudflare rollback method                       |

## Environment Matrix

| Environment | Worker                             | D1                         | KV                  | Secrets                   | Deploy Rule             | Current Status       |
| ----------- | ---------------------------------- | -------------------------- | ------------------- | ------------------------- | ----------------------- | -------------------- |
| Local       | `wrangler dev` / scripts only      | local disposable D1        | local Miniflare KV  | ignored local `.dev.vars` | Allowed for smoke/tests | Working              |
| Dev         | planned separate Worker            | planned separate D1        | planned separate KV | separate dev secrets      | Human-reviewed only     | Not confirmed        |
| Staging     | planned `homelink-finance-staging` | planned `homelink-staging` | planned staging KV  | separate staging secrets  | Human-approved only     | MANUAL_REQUIRED      |
| Production  | current or future prod Worker      | production D1 only         | production KV only  | production secrets        | Human-approved only     | NO-GO for automation |

## Hardening Requirements

1. Add explicit reviewed dev/staging/prod configuration strategy.
2. Confirm staging Worker URL and entrypoint before real QA.
3. Confirm staging D1/KV are distinct from production.
4. Set `APP_ENV` explicitly per environment.
5. Keep feature flags disabled in production unless production cutover is approved.
6. Require `security:secrets`, worker drift checks, and dry-run build checks before deploy.
7. Require backup and rollback before any migration.

## Gate Conclusion

Environment separation remains `MANUAL_REQUIRED`.

Local development is safe. Real staging QA needs human-provided target resources. Production deployment remains NO-GO.
