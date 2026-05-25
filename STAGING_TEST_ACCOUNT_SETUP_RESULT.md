# STAGING-SECRETS-001 Test Account Setup Result

Date: 2026-05-25, Asia/Dubai

| Role          | Username              | Email                              | Created / Exists / N/A | Password Stored Where                                                             | Plain Password Logged |
| ------------- | --------------------- | ---------------------------------- | ---------------------- | --------------------------------------------------------------------------------- | --------------------- |
| Employee      | `employee_stg_qa_001` | `employee_stg_qa_001@example.test` | MANUAL_REQUIRED        | `.tmp/staging-secrets/staging-test-passwords.local.json` until human secret setup | no                    |
| Owner         | `owner_stg_qa_001`    | `owner_stg_qa_001@example.test`    | MANUAL_REQUIRED        | `.tmp/staging-secrets/staging-test-passwords.local.json` until human secret setup | no                    |
| Manager/Admin | `manager_stg_qa_001`  | `manager_stg_qa_001@example.test`  | MANUAL_REQUIRED        | `.tmp/staging-secrets/staging-test-passwords.local.json` until human secret setup | no                    |

Actions performed:

- Generated local ignored secret material.
- Confirmed no matching `employee_users` rows exist with a read-only SELECT.
- Did not create any test account.
- Did not write business data.
- Did not write plaintext password to D1, Markdown, Git, or terminal output.

Conclusion: test account setup remains `MANUAL_REQUIRED`.
