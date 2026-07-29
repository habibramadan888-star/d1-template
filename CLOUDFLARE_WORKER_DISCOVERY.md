# Cloudflare Worker Discovery

Generated: 2026-05-25, Asia/Dubai

Scope: read-only Cloudflare/Wrangler discovery. No deploy, preview deploy,
rollback, version deploy, secret write, D1 command, KV value read/write, or
Worker config mutation was executed.

## Commands Run

| Command                                                           | Result | Notes                                                                                   |
| ----------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| `npx wrangler --help`                                             | PASS   | Confirmed Wrangler command surface.                                                     |
| `npx wrangler whoami`                                             | PASS   | Authentication works; account details intentionally omitted from this committed report. |
| `npx wrangler deployments --help`                                 | PASS   | Read-only deployment list/status commands available.                                    |
| `npx wrangler versions --help`                                    | PASS   | Read-only version list available; upload/deploy subcommands were not used.              |
| `npx wrangler pages --help`                                       | PASS   | Pages project list available.                                                           |
| `npx wrangler deployments list --config wrangler.toml`            | PASS   | Listed deployments for configured Worker `homelink-finance`.                            |
| `npx wrangler deployments status --config wrangler.toml`          | PASS   | Current configured Worker deployment is visible.                                        |
| `npx wrangler versions list --config wrangler.toml`               | PASS   | Listed many versions for configured Worker `homelink-finance`.                          |
| `npx wrangler deployments status --config wrangler.embedded.toml` | PASS   | Embedded config targets same Worker name.                                               |
| `npx wrangler pages project list`                                 | PASS   | Listed one Pages project.                                                               |

## Candidate Workers / Projects

| Candidate                | Source                                                        | URL / Route                                           | Entry Config                     | Looks Staging? | Looks Production?    | Confidence                                | Notes                                                                                                       |
| ------------------------ | ------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------- | -------------- | -------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `homelink-finance`       | `deploy-worker/wrangler.toml`, deployment/status/version list | MANUAL_REQUIRED - CLI output did not show a route/URL | `src/index.js`                   | No             | Yes, production-like | High for existing Worker, low for staging | Same Worker name is used by both source and embedded configs; no staging suffix or environment block found. |
| `homelink-finance`       | `deploy-worker/wrangler.embedded.toml`, deployment status     | MANUAL_REQUIRED - CLI output did not show a route/URL | `src/index.embedded.js`          | No             | Yes, production-like | High for existing Worker, low for staging | Embedded config uses the same Worker name as source config.                                                 |
| `homelink` Pages project | `npx wrangler pages project list`                             | `homelink-6km.pages.dev`                              | Pages project, not Worker config | Unknown        | Unknown              | Low                                       | This is a Pages project, not the Worker staging endpoint requested for API QA.                              |

## Worker URL Conclusion

`MANUAL_REQUIRED`.

Read-only Wrangler discovery proved the configured Worker name
`homelink-finance` exists and has deployments, but it did not expose or confirm
a staging Worker URL. The repository also lacks staging-specific Wrangler
environment blocks.

## Human Dashboard Steps Required

1. Open Cloudflare Dashboard.
2. Confirm whether a separate staging Worker exists.
3. Record the staging Worker name and URL/route.
4. Confirm whether staging uses `deploy-worker/wrangler.toml` or
   `deploy-worker/wrangler.embedded.toml`.
5. Confirm the target is not production.
6. Provide the staging URL through a non-committed QA input channel.
