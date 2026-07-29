# NEXT PROMPT: STAGING-DB-002 Apply Staging Migrations

Use this prompt only after human approval. Do not run it as part of STAGING-DB-001.

```text
进入 TASK STAGING-DB-002：Apply staging-only D1 schema migrations after backup.

目标：
在人工确认 backup / rollback 后，只对 staging D1 应用已审查的 staging schema migrations。

目标 D1：
name: homelink-finance-staging
id: 4ff78bfc-3855-436b-aefb-6b492145d79c

严格禁止：
1. 不执行 production deploy。
2. 不执行 staging deploy。
3. 不执行 production D1 migration。
4. 不执行 remote production D1 execute。
5. 不写业务测试数据，除非另有明确批准。
6. 不创建测试账号。
7. 不提交 secret。
8. 不读取、打印、提交 .env / .dev.vars 真实内容。
9. 不开启 production feature flags。
10. 不进入真实 staging write QA。

必须先确认：
1. staging D1 backup completed。
2. rollback method confirmed。
3. target DB is homelink-finance-staging。
4. target DB id is 4ff78bfc-3855-436b-aefb-6b492145d79c。
5. production DB excluded。
6. human approval granted。

允许执行的 staging-only schema commands:
1. npx wrangler d1 execute homelink-finance-staging --remote --file migrations/local/001_clean_legacy_bootstrap.sql
2. npx wrangler d1 execute homelink-finance-staging --remote --file migrations/local/002_handover_atomic_staging.sql

执行后必须：
1. Run SELECT schema verification.
2. Generate STAGING_D1_POST_MIGRATION_SCHEMA_SNAPSHOT.md.
3. Run npm run qa:employee-entry-staging without write confirmations.
4. Run npm run check.
5. Run npm run security:secrets.
6. Run npm run gate:commercial-launch and confirm PRODUCTION_NO_GO.

完成后停止。
不要执行真实 staging write QA。
不要部署。
```
