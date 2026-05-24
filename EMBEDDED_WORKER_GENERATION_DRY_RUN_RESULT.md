# Embedded Worker Dry-Run Generation Result

Scope: P1-006 dry-run generation. This script writes only to `.tmp/embedded-worker-dry-run/` and does not overwrite `deploy-worker/src/index.embedded.js`.

## Summary

- Result: **WARNING**
- Generated artifact: `.tmp\embedded-worker-dry-run\index.embedded.generated.js`
- Embedded assets included: 7
- Current embedded size: 1077580 bytes
- Dry-run generated size: 1085219 bytes
- Current embedded SHA-256: `b8f84fc86018c50a7799d4d4b97fe22bfd2915e65d75880d06883acb8b296e07`
- Dry-run generated SHA-256: `22ed1c92d14d39537053125bcc5d712f49dc9e0e69493823130fbe2c40fc4aa0`
- Hashes match: No

## Critical Item Presence

| Item                             | Current Embedded | Dry-Run Generated |
| -------------------------------- | ---------------- | ----------------- |
| `/api/staging/handover/commit`   | Yes              | Yes               |
| `ENABLE_HANDOVER_ATOMIC_STAGING` | Yes              | Yes               |
| `HSC_ALLOWED_APP_ENVS`           | Yes              | Yes               |
| `handover_commits`               | Yes              | Yes               |
| `handover_commit_rows`           | Yes              | Yes               |
| `handover_idempotency_keys`      | Yes              | Yes               |
| `/api/delete_session`            | Yes              | Yes               |
| `voided_at`                      | Yes              | Yes               |
| `void_reason`                    | Yes              | Yes               |
| `void_source`                    | Yes              | Yes               |

## Interpretation

- Current embedded artifact contains the checked critical items.
- Dry-run generated artifact contains all checked critical items.
- Current embedded artifact differs from dry-run output; controlled write requires human diff review.

## Gate

- This dry-run is not a deployment.
- This dry-run is not approval to overwrite `index.embedded.js`.
- Controlled write requires explicit human approval, route diff review, secret scan, and full validation.
