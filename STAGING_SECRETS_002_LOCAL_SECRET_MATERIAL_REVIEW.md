# Staging Secrets 002 Local Secret Material Review

Date: 2026-05-25, Asia/Dubai

Scope: inspect local ignored staging secret material without printing, copying,
or committing secret values.

| Secret Name                 | Exists Locally | Value Logged | Git Ignored | Notes                                                                   |
| --------------------------- | -------------- | ------------ | ----------- | ----------------------------------------------------------------------- |
| `JWT_SECRET`                | yes            | no           | yes         | Source: `.tmp/staging-secrets/staging-test-passwords.local.json`.       |
| `PW_SALT`                   | yes            | no           | yes         | Required for manager/staff and employee PIN hash verification.          |
| `DATA_ENCRYPTION_KEY`       | yes            | no           | yes         | Required by Worker secret encryption helper fallback path.              |
| `MANAGER_PW_HASH`           | yes            | no           | yes         | Used by legacy manager/owner password login fallback.                   |
| `STAFF_PW_HASH`             | yes            | no           | yes         | Used by staff password login fallback.                                  |
| `EMPLOYEE_STAGING_PASSWORD` | yes            | no           | yes         | Plaintext value kept only in ignored local material and staging secret. |
| `OWNER_STAGING_PASSWORD`    | yes            | no           | yes         | Plaintext value kept only in ignored local material and staging secret. |
| `MANAGER_STAGING_PASSWORD`  | yes            | no           | yes         | Plaintext value kept only in ignored local material and staging secret. |
| `USER_ACCOUNTS`             | derived        | no           | yes         | Derived during staging secret setup; not stored in Markdown.            |

Evidence:

- `git check-ignore` reports `.tmp/` as ignored.
- Local secret material was inspected by key name only.
- No password, token, cookie, or secret value was printed into this report.
