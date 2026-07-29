# Arrears Directive Staging Idempotency Migration Plan

Date: 2026-05-31

## Target

Staging D1 only:

- Database: `homelink-finance-staging`
- Database ID: `4ff78bfc-3855-436b-aefb-6b492145d79c`
- Migration file: `migration-drafts/003_arrears_directive_idempotency_staging.sql`

## Planned SQL

Create `request_idempotency_keys` with:

- durable request/response hashes
- response replay body
- actor/action/scope metadata
- resource metadata
- unique index on `(scope, action, idempotency_key)`
- lookup indexes for actor/action and resource auditability

## Command

```powershell
cd C:\Users\Chinalink\Desktop\软件迭代\deploy-worker
npx wrangler d1 execute homelink-finance-staging --remote --file ..\migration-drafts\003_arrears_directive_idempotency_staging.sql --config wrangler.toml
```

## Boundaries

| Item | Status |
|---|---|
| Staging D1 migration | Allowed |
| Production D1 migration | Forbidden |
| D1 export/import | Forbidden |
| Financial formula change | Forbidden |
| Dashboard calculation change | Forbidden |
| Business production write | Forbidden |

## Rollback Consideration

The migration is additive. If staging rollback is required, the table can be ignored by application code or dropped in staging after separate approval. Production is untouched.
