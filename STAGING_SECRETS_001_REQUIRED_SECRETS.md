# STAGING-SECRETS-001 Required Secrets

Date: 2026-05-25, Asia/Dubai

Scope: staging-only secret and variable inventory. No real secret value is stored in this file.

Sources reviewed:

- `deploy-worker/wrangler.toml`
- `.env.example`
- `STAGING_SECRET_AND_TEST_ACCOUNT_SETUP.md`
- `STAGING_SECRETS_AND_TEST_ACCOUNTS_NEXT_STEPS.md`
- `STAGING_QA_EVIDENCE_TEMPLATE.md`
- `STAGING_DB_002_POST_MIGRATION_SCHEMA_SNAPSHOT.md`
- `deploy-worker/src/index.js`
- `deploy-worker/src/index.embedded.js`

| Secret / Var                               | Required                   | Environment | Storage                                                  | Safe To Commit           | Notes                                                                                            |
| ------------------------------------------ | -------------------------- | ----------- | -------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------ |
| `APP_ENV`                                  | yes                        | staging     | Wrangler var                                             | yes, name/value only     | Already configured as `staging` in `[env.staging.vars]`.                                         |
| `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE` | yes                        | staging     | Wrangler var                                             | yes, name/value only     | Default remains `false`; must stay false until approved write QA.                                |
| `ENABLE_HANDOVER_ATOMIC_STAGING`           | yes                        | staging     | Wrangler var                                             | yes, name/value only     | Default remains `false`; must stay false until approved handover staging QA.                     |
| `JWT_SECRET`                               | yes                        | staging     | Cloudflare secret                                        | no                       | Required for JWT signing/verification.                                                           |
| `PW_SALT`                                  | yes                        | staging     | Cloudflare secret                                        | no                       | Required for owner/staff password hash verification and employee PIN hash verification.          |
| `DATA_ENCRYPTION_KEY`                      | recommended                | staging     | Cloudflare secret                                        | no                       | Used as encryption key fallback path for stored integration credentials; should be staging-only. |
| `MANAGER_PW_HASH`                          | yes                        | staging     | Cloudflare secret                                        | no                       | Current owner/manager login checks this hash.                                                    |
| `STAFF_PW_HASH`                            | yes                        | staging     | Cloudflare secret                                        | no                       | Current staff login checks this hash.                                                            |
| `USER_ACCOUNTS`                            | optional                   | staging     | Wrangler secret or var with reviewed JSON                | no if it contains hashes | Optional multi-user auth map; not required for this setup.                                       |
| `EMPLOYEE_STAGING_PASSWORD`                | yes for QA handling        | staging     | Cloudflare secret or approved ignored local secret store | no                       | Human QA credential storage only; Worker employee login uses `employee_users.pin_hash`.          |
| `OWNER_STAGING_PASSWORD`                   | yes for QA handling        | staging     | Cloudflare secret or approved ignored local secret store | no                       | Human QA credential storage only; Worker owner login uses `MANAGER_PW_HASH`.                     |
| `MANAGER_STAGING_PASSWORD`                 | conditional                | staging     | Cloudflare secret or approved ignored local secret store | no                       | Mark N/A if no separate manager/admin role is used.                                              |
| `TTLOCK_CLIENT_SECRET`                     | not required for this task | staging     | Cloudflare secret if integration QA is approved          | no                       | Not needed for employee entry dry-run/write QA.                                                  |
| `TTLOCK_PASSWORD`                          | not required for this task | staging     | Cloudflare secret if integration QA is approved          | no                       | Not needed for employee entry dry-run/write QA.                                                  |

Current remote staging secret status:

```powershell
npx wrangler secret list --env staging --config deploy-worker/wrangler.toml
```

Result: `[]`

Conclusion:

- Staging secrets are not yet set.
- Staging write QA remains `MANUAL_REQUIRED`.
- No password, token, cookie, or secret value is committed.
