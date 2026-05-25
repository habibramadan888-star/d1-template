# Staging Test Account Setup Result

Scope: `homelink-finance-staging` only. No sessions, transactions, deposit ledger, arrears, or handover rows were written.

| Role          | Username              | Email                              | Created / Exists / N/A                                                     | Password Hash Stored | Plain Password Logged | Business Data Written |
| ------------- | --------------------- | ---------------------------------- | -------------------------------------------------------------------------- | -------------------- | --------------------- | --------------------- |
| Employee      | `employee_stg_qa_001` | `employee_stg_qa_001@example.test` | Created                                                                    | yes                  | no                    | no                    |
| Owner         | `owner_stg_qa_001`    | `owner_stg_qa_001@example.test`    | Configured via USER_ACCOUNTS staging secret                                | yes                  | no                    | no                    |
| Manager/Admin | `manager_stg_qa_001`  | `manager_stg_qa_001@example.test`  | Configured via USER_ACCOUNTS staging secret; no separate admin role exists | yes                  | no                    | no                    |

D1 target name: `homelink-finance-staging`
D1 target id: `4ff78bfc-3855-436b-aefb-6b492145d79c`
D1 business data written: no
Plaintext password stored in D1: no
Plaintext password logged: no
Temporary SQL path: `.tmp/staging-secrets/staging-test-account-seed.sql` (ignored, not committed)
