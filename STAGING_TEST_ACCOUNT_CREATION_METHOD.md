# Staging Test Account Creation Method

Date: 2026-05-25, Asia/Dubai

| Question                              | Answer                                                                                                                                                                                   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `employee_users` table structure      | `employee_id TEXT PRIMARY KEY`, `corpid TEXT`, `employee_name TEXT`, `pin_hash TEXT`, `role TEXT DEFAULT 'staff'`, `status TEXT DEFAULT 'ACTIVE'`, `created_at TEXT`, `updated_at TEXT`. |
| Password hash field                   | Employee PIN/password hash is stored in `employee_users.pin_hash`.                                                                                                                       |
| Hash algorithm                        | PBKDF2 with SHA-256, 100000 iterations.                                                                                                                                                  |
| Existing safe seed script             | No approved remote staging seed existed before this task; a controlled script was added.                                                                                                 |
| Dev-only seed logic                   | `ensureEmployeeUsers` seeds only for development/dev/local/test with `ALLOW_DEV_SEED`; staging is intentionally excluded.                                                                |
| APP_ENV=staging support               | Staging account creation is explicit and one-time, not automatic.                                                                                                                        |
| Can write only `employee_users`       | Yes. The controlled script inserts only the employee test row.                                                                                                                           |
| Role field required                   | Yes. Employee row uses `role='staff'`; owner/manager roles are handled by auth secrets.                                                                                                  |
| Owner/employee/manager distinction    | Employee uses `/auth/employee-login` and `employee_users`; owner/manager use `/auth/login` through `USER_ACCOUNTS`/hash secrets with role `manager`.                                     |
| Can Codex safely create automatically | Yes for the employee test row only, after target D1 name/id confirmation. Owner/manager are configured via staging secrets, not D1 rows.                                                 |
| Business tables touched               | No. No `sessions`, `transactions`, `deposit_ledger`, `arrears`, or handover tables were written.                                                                                         |

Controlled command:

```bash
npm run staging:setup-test-accounts -- --confirm-staging-test-accounts
```

Safety properties:

- Confirms target D1 name is `homelink-finance-staging`.
- Confirms target D1 id is `4ff78bfc-3855-436b-aefb-6b492145d79c`.
- Reads password hash material from ignored `.tmp/staging-secrets/staging-test-passwords.local.json`.
- Writes temporary ignored SQL under `.tmp/staging-secrets/`.
- Stores only a password hash in D1.
- Does not print plaintext passwords.
- Does not write financial business data.
