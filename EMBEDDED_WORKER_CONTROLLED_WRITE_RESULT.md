# Embedded Worker Controlled Write Result

Scope: P1-006B controlled write. This is not a staging or production deploy and does not run D1 migrations.

## Result

- Result: **PASS**
- Source Worker: `deploy-worker\src\index.js`
- Written target: `deploy-worker\src\index.embedded.js`
- Backup path: `.tmp\embedded-worker-backups\index.embedded.2026-05-28T07-28-45-590Z.js`
- Dry-run generated source: `.tmp\embedded-worker-dry-run\index.embedded.generated.js`
- Source SHA-256: `17c0e85c56f86629987c42cafe33f3b1663933fc6882b84845d15bfcc73d3207`
- Old embedded SHA-256: `b8f84fc86018c50a7799d4d4b97fe22bfd2915e65d75880d06883acb8b296e07`
- Dry-run generated SHA-256: `f53b3d8f6dce5821ed5b1dc3356218908a1f413488e21d18ccbf73a5f5518664`
- New embedded SHA-256: `f53b3d8f6dce5821ed5b1dc3356218908a1f413488e21d18ccbf73a5f5518664`
- New matches dry-run generated: Yes

## Critical Item Verification

| Item                             | New Embedded Has |
| -------------------------------- | ---------------- |
| `/api/staging/handover/commit`   | Yes              |
| `ENABLE_HANDOVER_ATOMIC_STAGING` | Yes              |
| `HSC_ALLOWED_APP_ENVS`           | Yes              |
| `handover_commits`               | Yes              |
| `handover_commit_rows`           | Yes              |
| `handover_idempotency_keys`      | Yes              |
| `/api/delete_session`            | Yes              |
| `voided_at`                      | Yes              |
| `void_reason`                    | Yes              |
| `void_source`                    | Yes              |

## Rollback

- Before commit: copy `.tmp\embedded-worker-backups\index.embedded.2026-05-28T07-28-45-590Z.js` back to `deploy-worker\src\index.embedded.js`, or run `git restore -- deploy-worker/src/index.embedded.js`.
- After commit: revert the controlled write commit.

## Safety

- No Wrangler deploy command was executed.
- No D1 migration command was executed.
- No production configuration was modified by this script.
