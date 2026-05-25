# STAGING-SECRETS-001 Test Account Setup Plan

Date: 2026-05-25, Asia/Dubai

Scope: plan only. No staging test account was created by this task.

Target D1:

- Name: `homelink-finance-staging`
- ID: `4ff78bfc-3855-436b-aefb-6b492145d79c`

Read-only confirmation command:

```powershell
npx wrangler d1 execute homelink-finance-staging --remote --command "SELECT employee_id, employee_name, role, status FROM employee_users WHERE lower(employee_id) IN ('employee_stg_qa_001','owner_stg_qa_001','manager_stg_qa_001') ORDER BY employee_id;"
```

Result:

- No matching rows found.
- `changes=0`
- `changed_db=false`
- `rows_written=0`

| Role          | Username              | Email                              | Created / Exists / N/A | Password Stored Where                           | Plain Password Logged |
| ------------- | --------------------- | ---------------------------------- | ---------------------- | ----------------------------------------------- | --------------------- |
| Employee      | `employee_stg_qa_001` | `employee_stg_qa_001@example.test` | MANUAL_REQUIRED        | ignored local secret material or staging secret | no                    |
| Owner         | `owner_stg_qa_001`    | `owner_stg_qa_001@example.test`    | MANUAL_REQUIRED        | ignored local secret material or staging secret | no                    |
| Manager/Admin | `manager_stg_qa_001`  | `manager_stg_qa_001@example.test`  | MANUAL_REQUIRED        | ignored local secret material or staging secret | no                    |

Why accounts were not created automatically:

- The repository does not currently expose an approved staging account seed script.
- Owner/staff auth is hash-secret based (`MANAGER_PW_HASH`, `STAFF_PW_HASH`) rather than a normal user table.
- Employee login uses `employee_users.pin_hash`; writing it requires an approved staging seed task.
- The task explicitly forbids writing business data and requires careful staging-only account creation.

Required next step:

- Create a dedicated staging account seed task after secrets are set.
- That task must only target `homelink-finance-staging`.
- That task must write only test account rows and no `sessions`, `transactions`, `deposit_ledger`, or `arrears` rows.
