# Staging Secret And Test Account Setup

Generated: 2026-05-25

No real password, token, cookie, or secret is stored in this file. No `wrangler secret put` command was executed by this task.

## Test Account Plan

| Role          | Username              | Email                              | Password Handling                                                                                                                                                            |
| ------------- | --------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Employee      | `employee_stg_qa_001` | `employee_stg_qa_001@example.test` | Generated strong password stored as a Cloudflare staging secret or another approved ignored secret store; not committed.                                                     |
| Owner         | `owner_stg_qa_001`    | `owner_stg_qa_001@example.test`    | Generated strong password stored as a Cloudflare staging secret or another approved ignored secret store; not committed.                                                     |
| Manager/Admin | `manager_stg_qa_001`  | `manager_stg_qa_001@example.test`  | Generated strong password stored as a Cloudflare staging secret or another approved ignored secret store; not committed. If admin role is not supported, mark N/A during QA. |

## Password Rules

- Use 24+ character random passwords.
- Do not use weak or reused passwords.
- Do not write passwords into Markdown, Git, screenshots, terminal transcripts, or issue comments.
- Store only in Cloudflare staging secrets or an approved ignored local secret file.

Suggested local generation command for a human operator:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Suggested staging secret commands. Do not paste secrets into the command line; enter values interactively when Wrangler prompts:

```powershell
npx wrangler secret put JWT_SECRET --env staging
npx wrangler secret put EMPLOYEE_STAGING_PASSWORD --env staging
npx wrangler secret put OWNER_STAGING_PASSWORD --env staging
npx wrangler secret put MANAGER_STAGING_PASSWORD --env staging
```

Manual required before write QA:

| Item                                 | Status          | Notes                                                           |
| ------------------------------------ | --------------- | --------------------------------------------------------------- |
| Staging `JWT_SECRET` set             | MANUAL_REQUIRED | Must be set only for `--env staging`.                           |
| Employee staging password set        | MANUAL_REQUIRED | Do not commit the value.                                        |
| Owner staging password set           | MANUAL_REQUIRED | Do not commit the value.                                        |
| Manager/admin staging password set   | MANUAL_REQUIRED | Mark N/A if role does not exist.                                |
| Staging test accounts created/seeded | MANUAL_REQUIRED | Requires approved staging seed/write task, not this setup task. |
