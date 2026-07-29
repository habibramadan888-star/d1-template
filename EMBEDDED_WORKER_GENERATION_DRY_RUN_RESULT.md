# Embedded Worker Dry-Run Generation Result

Scope: P1-006 dry-run generation. This script writes only to `.tmp/embedded-worker-dry-run/` and does not overwrite `deploy-worker/src/index.embedded.js`.

## Summary

- Result: **PASS**
- Generated artifact: `.tmp\embedded-worker-dry-run\index.embedded.generated.js`
- Embedded assets included: 10
- Current embedded size: 1155100 bytes
- Dry-run generated size: 1235488 bytes
- Current embedded SHA-256: `16758b5eeb7f02f46b7200a0234c6f10678376e29d5b26eed952e5e44bfea9a1`
- Dry-run generated SHA-256: `198309375f332bd9559223aac19aa2292399d0224fd1fa3f2ddd0c969be30f31`
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
- Current embedded artifact differs from dry-run output; this is not a blocker for the default `wrangler.toml` asset deployment path, but a future embedded deployment still requires controlled write review.

## Gate

- This dry-run is not a deployment.
- This dry-run is not approval to overwrite `index.embedded.js`.
- Hash mismatch is reported for embedded-artifact governance but does not fail static ASSETS deploy preflight when critical items are present.
- Controlled write still requires explicit human approval, route diff review, secret scan, and full validation.
