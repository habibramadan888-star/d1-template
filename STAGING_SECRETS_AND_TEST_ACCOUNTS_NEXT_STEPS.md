# Staging Secrets And Test Accounts Next Steps

Generated: 2026-05-25

Scope: planning only. No secret was generated, printed, stored, or submitted. No staging account was created.

## Required Staging Secrets

| Secret                      |    Required | Storage                                                    | Notes                                       |
| --------------------------- | ----------: | ---------------------------------------------------------- | ------------------------------------------- |
| `JWT_SECRET`                |         Yes | Cloudflare staging secret                                  | Required for auth/session signing.          |
| `EMPLOYEE_STAGING_PASSWORD` |         Yes | Cloudflare staging secret or approved ignored secret store | Do not commit value.                        |
| `OWNER_STAGING_PASSWORD`    |         Yes | Cloudflare staging secret or approved ignored secret store | Do not commit value.                        |
| `MANAGER_STAGING_PASSWORD`  | Conditional | Cloudflare staging secret or approved ignored secret store | Mark N/A if manager/admin role is not used. |

## Strong Password Generation

Use 24+ character random passwords. Suggested command for a human operator:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Do not paste generated values into Markdown, Git, screenshots, or issue comments.

## Suggested Test Account Identifiers

| Role          | Username              | Email                              | Password Handling                                      |
| ------------- | --------------------- | ---------------------------------- | ------------------------------------------------------ |
| Employee      | `employee_stg_qa_001` | `employee_stg_qa_001@example.test` | Stored as staging secret / not committed.              |
| Owner         | `owner_stg_qa_001`    | `owner_stg_qa_001@example.test`    | Stored as staging secret / not committed.              |
| Manager/Admin | `manager_stg_qa_001`  | `manager_stg_qa_001@example.test`  | Stored as staging secret / not committed, or mark N/A. |

If creating accounts requires writing to D1, open a separate task. That task must require staging D1 backup, rollback evidence, explicit staging target confirmation, and no production migration.

## Manual Next Steps

1. Set staging-only secrets through Cloudflare Wrangler or Dashboard.
2. Confirm the test account creation mechanism.
3. Confirm staging D1 schema exists before account creation.
4. Execute and record staging D1 backup before any account seed.
5. Keep all generated passwords outside Git.
