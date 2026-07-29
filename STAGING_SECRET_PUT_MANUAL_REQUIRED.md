# STAGING-SECRETS-001 Secret Put Manual Required

Date: 2026-05-25, Asia/Dubai

Codex did not execute `wrangler secret put`.

Reason:

- `wrangler secret put` is interactive for secret values.
- Secret values must not be printed into terminal output, Markdown, or Git history.
- Generated values are available only in the ignored local file `.tmp/staging-secrets/staging-test-passwords.local.json`.
- A human operator must decide whether to set secrets through Wrangler CLI or Cloudflare Dashboard.

Suggested command pattern. Do not paste secret values into the command line:

```powershell
npx wrangler secret put JWT_SECRET --env staging --config deploy-worker/wrangler.toml
npx wrangler secret put PW_SALT --env staging --config deploy-worker/wrangler.toml
npx wrangler secret put DATA_ENCRYPTION_KEY --env staging --config deploy-worker/wrangler.toml
npx wrangler secret put MANAGER_PW_HASH --env staging --config deploy-worker/wrangler.toml
npx wrangler secret put STAFF_PW_HASH --env staging --config deploy-worker/wrangler.toml
npx wrangler secret put EMPLOYEE_STAGING_PASSWORD --env staging --config deploy-worker/wrangler.toml
npx wrangler secret put OWNER_STAGING_PASSWORD --env staging --config deploy-worker/wrangler.toml
npx wrangler secret put MANAGER_STAGING_PASSWORD --env staging --config deploy-worker/wrangler.toml
```

Current remote staging secret list command:

```powershell
npx wrangler secret list --env staging --config deploy-worker/wrangler.toml
```

Observed result during this task: `[]`

Conclusion: staging secrets remain `MANUAL_REQUIRED`.
