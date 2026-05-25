# Staging D1 Creation Result

Generated: 2026-05-25

Command executed:

```powershell
npx wrangler d1 create homelink-finance-staging
```

This created a new staging D1 database only. No D1 execute, migration apply, production D1 operation, or data write was performed.

| Field                 | Value                                  |
| --------------------- | -------------------------------------- |
| Database name         | `homelink-finance-staging`             |
| Database ID           | `4ff78bfc-3855-436b-aefb-6b492145d79c` |
| Region                | APAC                                   |
| Intended binding      | `DB`                                   |
| Production D1 touched | No                                     |
| D1 execute performed  | No                                     |
| Migration performed   | No                                     |

Wrangler config snippet used for staging:

```toml
[[env.staging.d1_databases]]
binding = "DB"
database_name = "homelink-finance-staging"
database_id = "4ff78bfc-3855-436b-aefb-6b492145d79c"
```

Notes: the Wrangler output suggested a generated binding name based on the database name, but the project code uses `env.DB`, so the staging config intentionally uses `binding = "DB"`.
