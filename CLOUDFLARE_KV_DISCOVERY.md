# Cloudflare KV Discovery

Generated: 2026-05-25, Asia/Dubai

Scope: read-only KV namespace discovery. No KV value read, write, delete, rename,
or namespace mutation was executed.

## Commands Run

| Command                                 | Result | Notes                                                                                 |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------- |
| `npx wrangler kv namespace --help`      | PASS   | Confirmed namespace list command.                                                     |
| `npx wrangler kv namespace list --json` | FAILED | Current Wrangler did not accept `--json` for this command. No data mutation occurred. |
| `npx wrangler kv namespace list`        | PASS   | Listed namespaces in JSON-like output without reading values.                         |

## KV Namespaces

| Namespace Title                       | Namespace ID                       | Binding Match                                 | Looks Staging? | Looks Production?           | Confidence                                 | Notes                                                                         |
| ------------------------------------- | ---------------------------------- | --------------------------------------------- | -------------- | --------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| `RATE_LIMIT`                          | `c7c64d522d964baba2e72454e7262da9` | Matches `RATE_LIMIT` in both Wrangler configs | No             | Yes, production-like/shared | High for existing binding, low for staging | Same namespace is used by source and embedded configs; not confirmed staging. |
| `__homelink-app-workers_sites_assets` | `56b4719988a2480cab798007479d8529` | No                                            | No             | Unknown                     | Low                                        | Looks like Workers Sites/assets namespace, not staging `RATE_LIMIT`.          |

## Staging KV Conclusion

`MANUAL_REQUIRED`.

No separate staging KV namespace was confirmed by checked-in config or read-only
Wrangler discovery. If staging does not require KV, that decision still needs
human confirmation because the Worker currently binds `RATE_LIMIT`.

## Required Human Action

1. Confirm whether staging needs a separate `RATE_LIMIT` KV namespace.
2. If yes, provide staging namespace title and ID.
3. Confirm it is separate from the current `RATE_LIMIT` namespace.
4. Do not store secrets in KV evidence reports.
