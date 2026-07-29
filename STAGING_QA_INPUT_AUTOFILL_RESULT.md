# Staging QA Input Autofill Result

Generated: 2026-05-25T10:56:36+04:00

Scope: safe autofill of `STAGING_QA_EVIDENCE_TEMPLATE.md` from git metadata,
checked-in Wrangler config, package scripts, example env files, and existing
reports. No staging QA was executed.

## Safety Result

| Check                                     | Result | Evidence                                                                                    |
| ----------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Production deploy executed                | No     | No deploy command was run.                                                                  |
| Staging deploy executed                   | No     | No deploy command was run.                                                                  |
| Production D1 migration executed          | No     | No migration command was run.                                                               |
| Remote D1 migration executed              | No     | No migration command was run.                                                               |
| D1 execute command run                    | No     | Only read-only `wrangler d1 list --json` was run.                                           |
| Staging data written                      | No     | No staging write command was run.                                                           |
| Real `.env` / `.dev.vars` read            | No     | Only `.env.example`, `.env.local.example`, and `deploy-worker/.dev.vars.example` were read. |
| Password/token/cookie written to Markdown | No     | Test account passwords are marked as secret-store only.                                     |
| Secret generated                          | No     | No password was generated because no approved ignored staging secret target was confirmed.  |

## Autofilled Metadata

| Field                     | Value                                                                                                                                | Source                                                      | Status             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------ |
| Branch                    | `nightshift/v4-commercialization-safe-run`                                                                                           | `git branch --show-current`                                 | Filled             |
| Commit                    | `1f1f36b`                                                                                                                            | `git rev-parse --short HEAD`                                | Filled             |
| Worker entrypoint         | Source: `deploy-worker/wrangler.toml` -> `src/index.js`; embedded: `deploy-worker/wrangler.embedded.toml` -> `src/index.embedded.js` | Wrangler configs and deploy entrypoint review               | Filled with caveat |
| Actual staging entrypoint | MANUAL_REQUIRED                                                                                                                      | No committed staging deploy config proves actual entrypoint | Manual required    |
| APP_ENV                   | Expected `staging`; checked-in Wrangler vars do not set it; examples use `development`                                               | Wrangler configs and example env files                      | Manual required    |
| Feature flags             | `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true`, `ENABLE_HANDOVER_ATOMIC_STAGING=true` required for relevant QA                      | Existing reports and Worker source                          | Manual required    |
| Staging Worker URL        | MANUAL_REQUIRED                                                                                                                      | Not found in committed non-secret config                    | Manual required    |
| Production URL excluded   | MANUAL_REQUIRED                                                                                                                      | Cannot compare without staging URL                          | Manual required    |

## D1 Review

| Item                              | Value                                  | Source                                                                | Status                        |
| --------------------------------- | -------------------------------------- | --------------------------------------------------------------------- | ----------------------------- |
| Configured source binding         | `DB`                                   | `deploy-worker/wrangler.toml`                                         | Filled                        |
| Configured source database name   | `homelink`                             | `deploy-worker/wrangler.toml`                                         | Not accepted as staging       |
| Configured source database id     | `562aa079-1cca-4176-ba3b-7276a65f98fb` | `deploy-worker/wrangler.toml`                                         | Not accepted as staging       |
| Configured embedded binding       | `DB`                                   | `deploy-worker/wrangler.embedded.toml`                                | Filled                        |
| Configured embedded database name | `homelink`                             | `deploy-worker/wrangler.embedded.toml`                                | Not accepted as staging       |
| Read-only D1 list result          | `homelink`, `d1-template-database`     | `npx wrangler d1 list --json`                                         | No confirmed staging DB found |
| Candidate staging D1              | MANUAL_REQUIRED                        | `homelink-staging` is a plan target only, not found in read-only list | Manual required               |

No `wrangler d1 info`, `wrangler d1 execute`, or migration command was run
against `homelink` because it is not confirmed as a staging database.

## KV Review

| Item                           | Value                              | Source                                 | Status                  |
| ------------------------------ | ---------------------------------- | -------------------------------------- | ----------------------- |
| Configured source KV binding   | `RATE_LIMIT`                       | `deploy-worker/wrangler.toml`          | Filled                  |
| Configured source KV id        | `c7c64d522d964baba2e72454e7262da9` | `deploy-worker/wrangler.toml`          | Not accepted as staging |
| Configured embedded KV binding | `RATE_LIMIT`                       | `deploy-worker/wrangler.embedded.toml` | Filled                  |
| Confirmed staging KV namespace | MANUAL_REQUIRED                    | No separate staging KV config found    | Manual required         |

## Suggested Test Accounts

These identifiers were written to the template. They are account identifiers
only; passwords must not be committed.

| Role          | Username              | Email                              | Password Handling                                   |
| ------------- | --------------------- | ---------------------------------- | --------------------------------------------------- |
| employee      | `employee_stg_qa_001` | `employee_stg_qa_001@example.test` | stored in Cloudflare staging secret / not committed |
| owner         | `owner_stg_qa_001`    | `owner_stg_qa_001@example.test`    | stored in Cloudflare staging secret / not committed |
| manager/admin | `manager_stg_qa_001`  | `manager_stg_qa_001@example.test`  | stored in Cloudflare staging secret / not committed |

Password generation was not executed. Suggested command for a human to run only
when writing to an approved ignored secret target:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

## Backup / Rollback Review

| Item                              | Result  | Evidence                                                               | Action                                                            |
| --------------------------------- | ------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Backup executed                   | No      | No backup command was run                                              | Human must provide backup/export evidence before staging write QA |
| Backup plan exists                | Partial | Environment and staging QA planning docs reference backup requirements | Manual approval required                                          |
| Rollback executed in real staging | No      | No staging write was run                                               | Human must exercise/approve rollback before staging write QA      |
| Rollback docs exist               | Partial | Rollback matrix and QA guides exist                                    | Manual approval required                                          |

## Template Update Summary

Updated tracked repository file:

- `STAGING_QA_EVIDENCE_TEMPLATE.md`

Noted external file:

- `C:/Users/Chinalink/Desktop/STAGING_QA_EVIDENCE_TEMPLATE.md` exists but is not
  the tracked repository file committed by this task.

Fields that remain `MANUAL_REQUIRED` are intentionally unresolved because they
depend on real staging resources, credentials, backup/rollback evidence, or
human approval.

## Final Gate

| Gate                                       | Result          |
| ------------------------------------------ | --------------- |
| GO for real staging write QA               | MANUAL_REQUIRED |
| GO for production cutover                  | No              |
| Safe to continue local dry-run preparation | Yes             |

## Verification

| Command                          | Result           | Notes                                                                           |
| -------------------------------- | ---------------- | ------------------------------------------------------------------------------- |
| `npm run check`                  | PASS             | 182 tests passed; Worker build commands were dry-run only.                      |
| `npm run security:secrets`       | PASS             | Secret hygiene check passed.                                                    |
| `npm run gate:commercial-launch` | PRODUCTION_NO_GO | 17 areas reviewed; 12 confirmed production NO-GO; 1 manual-required; 0 blocked. |
