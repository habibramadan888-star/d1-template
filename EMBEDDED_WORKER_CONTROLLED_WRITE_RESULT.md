# Embedded Worker Controlled Write Result

Scope: P1-006B controlled write. This is not a staging or production deploy and does not run D1 migrations.

## Result

- Result: **PASS**
- Source Worker: `deploy-worker\src\index.js`
- Written target: `deploy-worker\src\index.embedded.js`
- Backup path: `.tmp\embedded-worker-backups\index.embedded.2026-05-24T15-59-29-662Z.js`
- Dry-run generated source: `.tmp\embedded-worker-dry-run\index.embedded.generated.js`
- Source SHA-256: `3951fc8d8ea49d17696502993a3ee8d1cd2ec9d5d2b0ea78b630501985b63572`
- Old embedded SHA-256: `300d656cdb1071ba28c96600602467680618489ee2fafe9a84d4c0fd154dda1d`
- Dry-run generated SHA-256: `b8f84fc86018c50a7799d4d4b97fe22bfd2915e65d75880d06883acb8b296e07`
- New embedded SHA-256: `b8f84fc86018c50a7799d4d4b97fe22bfd2915e65d75880d06883acb8b296e07`
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

- Before commit: copy `.tmp\embedded-worker-backups\index.embedded.2026-05-24T15-59-29-662Z.js` back to `deploy-worker\src\index.embedded.js`, or run `git restore -- deploy-worker/src/index.embedded.js`.
- After commit: revert the controlled write commit.

## Safety

- No Wrangler deploy command was executed.
- No D1 migration command was executed.
- No production configuration was modified by this script.
