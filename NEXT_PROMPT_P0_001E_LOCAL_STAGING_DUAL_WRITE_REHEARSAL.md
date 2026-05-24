# NEXT PROMPT: P0-001E Local/Staging Dual-Write Rehearsal

进入 TASK P0-001E：Local/staging-only minor-unit dual-write rehearsal。

当前前置状态：

- P0-001D-GATE 已完成。
- `MONEY_DUAL_WRITE_MIGRATION_REVIEW.md` 已审查 `005_money_minor_units_dual_write_draft.sql`。
- `MONEY_AUDIT_TRIAGE.md` 和 `TOP_25_MONEY_RISKS.md` 已生成。
- `MONEY_RECONCILIATION_GATE.md` 和 `MONEY_RECONCILIATION_GATE_RESULT.md` 已生成。
- P0-001 状态仍然是 Partial，不允许标记 Verified。

本任务目标：

只做 local/staging dual-write rehearsal。允许在本地或 staging-only 数据库中应用经审查的 minor-unit draft migration，验证新写入可以同时保留 legacy decimal 字段和写入 `*_fils` 字段，并生成 reconciliation 证据。

严格禁止：

1. 不执行 production D1 migration。
2. 不执行 remote D1 migration。
3. 不部署 production Worker。
4. 不修改 production wrangler 配置。
5. 不删除 legacy decimal / REAL 字段。
6. 不修改 live dashboard result。
7. 不修改 live financial formula。
8. 不修改 live employee handover flow。
9. 不切换 owner dashboard reader 到 `*_fils`。
10. 不正式落地 P0-008 receivables。
11. 不做 P0-006 tenant isolation 重构。
12. 不自动修改 embedded Worker artifact。
13. 不把 frontend submitted totals 当成 accounting authority。
14. 不静默 round 三位小数。

允许：

1. 创建 local/staging-only migration runner。
2. 将 `migration-drafts/005_money_minor_units_dual_write_draft.sql` 转换为 local/staging rehearsal migration。
3. 新增 dev/local-only test data。
4. 新增 endpoint/rehearsal tests that verify `*_fils` fields are written in local/staging-only paths.
5. 新增 reconciliation dry-run before and after local/staging rehearsal.
6. 更新 P0/P1 reports and verification docs.

必须验证：

- `npm run check`
- `npm run smoke:with-worker`
- `npm run verify:clean-d1`
- `npm run test:money`
- `npm run audit:money`
- `npm run triage:money`
- `npm run test:money-dual-write`
- `npm run rehearse:money-dual-write`
- `npm run gate:money-reconciliation`
- new local/staging dual-write rehearsal command
- `npm run verify:dashboard-unchanged`
- `npm run verify:handover-legacy-unchanged`
- `npm run security:secrets`

完成后：

- P0-001 状态只能是 `Partial - local/staging minor-unit dual-write rehearsal passed`。
- 不允许标记 Verified / Done / Fixed。
- 本任务完成后停止，不进入 production migration。
