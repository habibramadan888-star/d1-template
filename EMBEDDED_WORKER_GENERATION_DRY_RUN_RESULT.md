# Embedded Worker Dry-Run Generation Result

Scope: P1-006 dry-run generation. This script writes only to `.tmp/embedded-worker-dry-run/` and does not overwrite `deploy-worker/src/index.embedded.js`.

## Summary

- Result: **WARNING**
- Generated artifact: `.tmp\embedded-worker-dry-run\index.embedded.generated.js`
- Embedded assets included: 9
- Current embedded size: 1152066 bytes
- Dry-run generated size: 1163262 bytes
- Current embedded SHA-256: `f53b3d8f6dce5821ed5b1dc3356218908a1f413488e21d18ccbf73a5f5518664`
- Dry-run generated SHA-256: `cd815aac27f0fbe089138df18897a738d27d70b2c7a589ad011746c38d62404a`
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
