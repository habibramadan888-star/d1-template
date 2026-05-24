# Embedded Worker Dry-Run Generation Result

Scope: P1-006 dry-run generation. This script writes only to `.tmp/embedded-worker-dry-run/` and does not overwrite `deploy-worker/src/index.embedded.js`.

## Summary

- Result: **WARNING**
- Generated artifact: `.tmp\embedded-worker-dry-run\index.embedded.generated.js`
- Embedded assets included: 7
- Current embedded size: 1051237 bytes
- Dry-run generated size: 1077580 bytes
- Current embedded SHA-256: `300d656cdb1071ba28c96600602467680618489ee2fafe9a84d4c0fd154dda1d`
- Dry-run generated SHA-256: `b8f84fc86018c50a7799d4d4b97fe22bfd2915e65d75880d06883acb8b296e07`
- Hashes match: No

## Critical Item Presence

| Item                             | Current Embedded | Dry-Run Generated |
| -------------------------------- | ---------------- | ----------------- |
| `/api/staging/handover/commit`   | No               | Yes               |
| `ENABLE_HANDOVER_ATOMIC_STAGING` | No               | Yes               |
| `HSC_ALLOWED_APP_ENVS`           | No               | Yes               |
| `handover_commits`               | No               | Yes               |
| `handover_commit_rows`           | No               | Yes               |
| `handover_idempotency_keys`      | No               | Yes               |
| `/api/delete_session`            | Yes              | Yes               |
| `voided_at`                      | Yes              | Yes               |
| `void_reason`                    | Yes              | Yes               |
| `void_source`                    | Yes              | Yes               |

## Interpretation

- Current embedded artifact is missing 6 critical item(s): `/api/staging/handover/commit`, `ENABLE_HANDOVER_ATOMIC_STAGING`, `HSC_ALLOWED_APP_ENVS`, `handover_commits`, `handover_commit_rows`, `handover_idempotency_keys`.
- Dry-run generated artifact contains all checked critical items.
- Current embedded artifact differs from dry-run output; controlled write requires human diff review.

## Gate

- This dry-run is not a deployment.
- This dry-run is not approval to overwrite `index.embedded.js`.
- Controlled write requires explicit human approval, route diff review, secret scan, and full validation.
