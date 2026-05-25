# STAGING-SECRETS-001 Test Password Generation Result

Date: 2026-05-25, Asia/Dubai

Command:

```powershell
npm run staging:generate-passwords
```

Output summary:

| Item                               | Result                                                   |
| ---------------------------------- | -------------------------------------------------------- |
| Passwords generated                | yes                                                      |
| Uses Node crypto                   | yes                                                      |
| Password length                    | 24+ characters                                           |
| Full passwords printed to console  | no                                                       |
| Full passwords written to Markdown | no                                                       |
| Full passwords committed to Git    | no                                                       |
| Local storage path                 | `.tmp/staging-secrets/staging-test-passwords.local.json` |
| Storage path ignored by Git        | yes                                                      |

Generated secret names:

- `JWT_SECRET`
- `PW_SALT`
- `DATA_ENCRYPTION_KEY`
- `MANAGER_PW_HASH`
- `STAFF_PW_HASH`
- `EMPLOYEE_STAGING_PASSWORD`
- `OWNER_STAGING_PASSWORD`
- `MANAGER_STAGING_PASSWORD`

Generated account seed material:

- Employee username: `employee_stg_qa_001`
- Employee email: `employee_stg_qa_001@example.test`
- Employee PIN hash: generated in ignored local file only
- Owner username: `owner_stg_qa_001`
- Owner email: `owner_stg_qa_001@example.test`
- Manager/admin username: `manager_stg_qa_001`
- Manager/admin email: `manager_stg_qa_001@example.test`

No generated value is shown in this report.
