# Environment Separation Audit Result

Generated: 2026-05-25T00:08:03.695Z

Overall: `MANUAL_REQUIRED`

## Checks

### 1. source Worker config exists

- Result: PASS
- Evidence: deploy-worker/wrangler.toml
- Notes: homelink-finance

### 2. embedded Worker config exists

- Result: PASS
- Evidence: deploy-worker/wrangler.embedded.toml
- Notes: homelink-finance

### 3. source/embedded Worker names separated

- Result: MANUAL_REQUIRED
- Evidence: homelink-finance / homelink-finance
- Notes: same Worker name requires human deploy-entrypoint discipline

### 4. source/embedded D1 ids separated

- Result: MANUAL_REQUIRED
- Evidence: 562aa079-1cca-4176-ba3b-7276a65f98fb / 562aa079-1cca-4176-ba3b-7276a65f98fb
- Notes: same D1 id is acceptable for local dry-run only; not staging/prod separation

### 5. source/embedded KV ids separated

- Result: MANUAL_REQUIRED
- Evidence: c7c64d522d964baba2e72454e7262da9 / c7c64d522d964baba2e72454e7262da9
- Notes: same KV id is not sufficient for staging/prod separation

### 6. APP_ENV configured in Wrangler

- Result: MANUAL_REQUIRED
- Evidence: wrangler vars scan
- Notes: runtime APP_ENV must be explicit per environment

### 7. dry-run deploy scripts

- Result: PASS
- Evidence: package.json
- Notes: default build scripts remain dry-run

This audit is read-only and does not modify Wrangler config or deploy.
