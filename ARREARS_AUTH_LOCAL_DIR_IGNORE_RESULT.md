# Arrears Auth Local Directory Ignore Result

| Check | Result |
|---|---|
| directory created | yes |
| directory ignored | yes |
| `*.local.env` ignored | yes |
| real credentials committed | no |

Notes:

- `.tmp/arrears-smoke-auth/` is ignored by `.gitignore`.
- `*.local.env` is ignored by `.gitignore`.
- No production login was executed.
- No production D1 write, migration, D1 export/import/execute, deploy, or write gate operation was executed.

