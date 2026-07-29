# Staging Test Accounts Review

Generated: 2026-05-25, Asia/Dubai

Scope: read-only review. No account was created, no password was generated, no
secret was read, and no credential was written to Markdown.

## Current Evidence

| Item                                 | Found   | Evidence                                                                     | Status          | Notes                                                        |
| ------------------------------------ | ------- | ---------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------ |
| Staging employee account exists      | No      | No committed non-secret config confirms a staging employee test account      | MANUAL_REQUIRED | Must be provided through secure non-committed channel.       |
| Staging owner account exists         | No      | No committed non-secret config confirms a staging owner test account         | MANUAL_REQUIRED | Must be provided through secure non-committed channel.       |
| Staging manager/admin account exists | No      | No committed non-secret config confirms a staging manager/admin test account | MANUAL_REQUIRED | If admin role is not implemented, mark N/A during manual QA. |
| Password storage method              | Partial | QA templates require Cloudflare staging secret / ignored secret store        | MANUAL_REQUIRED | No secret write target confirmed.                            |

## Recommended Account Identifiers

| Role          | Username              | Email                              | Password                                                                                   |
| ------------- | --------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------ |
| employee      | `employee_stg_qa_001` | `employee_stg_qa_001@example.test` | stored in Cloudflare staging secret / not committed                                        |
| owner         | `owner_stg_qa_001`    | `owner_stg_qa_001@example.test`    | stored in Cloudflare staging secret / not committed                                        |
| manager/admin | `manager_stg_qa_001`  | `manager_stg_qa_001@example.test`  | stored in Cloudflare staging secret / not committed; mark N/A if admin role does not exist |

## Password Rule

If a human needs to generate staging test passwords, use a strong random value
and write it only to Cloudflare staging secrets or an ignored local secret file.
Do not write passwords to Markdown, git, console transcripts intended for
commit, or chat.

Suggested command for a human to run only when writing to an approved secret
target:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

## Conclusion

`MANUAL_REQUIRED`

No staging test account existence was confirmed by read-only discovery.
