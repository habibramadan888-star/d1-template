# NEXT PROMPT: P1-006 Embedded Worker Drift Control

进入 TASK P1-006：Embedded Worker drift controlled generation and verification。

当前背景：

- 多个阶段已经修改 `deploy-worker/src/index.js` 和本地验证脚本。
- 如果实际部署入口使用 `index.embedded.js` 或 embedded Worker artifact，source 与 embedded artifact 可能 drift。
- 本任务只处理 drift 审计、controlled generation、diff verification，不执行 production deploy。

严格禁止：

1. 不部署 production Worker。
2. 不修改 production wrangler 配置。
3. 不提交 secret。
4. 不执行 production D1 migration。
5. 不执行 remote D1 migration。
6. 不自动覆盖 production artifact。
7. 不修改 live financial formula。
8. 不修改 live employee handover flow。
9. 不修改 dashboard live result。
10. 不删除 legacy Worker logic。

任务目标：

1. 确认实际部署入口是 `deploy-worker/src/index.js`、embedded Worker artifact，还是 Cloudflare Pages/Worker 组合。
2. 审计当前 source 与 embedded artifact 是否 drift。
3. 如果需要生成 embedded artifact，使用 controlled generation 脚本，不手工复制。
4. 生成 diff report，列出新增/删除 route、feature flag、D1 table usage、auth behavior。
5. 验证 generated artifact 不包含 secret。
6. 验证 generated artifact 不开启 production-only staging routes。
7. 运行 full local safety commands。

必须输出：

- `EMBEDDED_WORKER_DEPLOY_ENTRY_AUDIT.md`
- `EMBEDDED_WORKER_DRIFT_DIFF_REPORT.md`
- `EMBEDDED_WORKER_GENERATION_SAFETY_CHECKLIST.md`
- `NEXT_PROMPT_STAGING_DEPLOY_PREP.md`，仅在人工确认后使用。

必须验证：

- `npm run check`
- `npm run smoke:with-worker`
- `npm run verify:clean-d1`
- `npm run test:handover-staging-endpoint`
- `npm run security:secrets`
- embedded artifact diff check command, if created

完成后：

- P1-006 只能标记为 Partial 或 Verified for local artifact consistency。
- 不允许 production deploy。
- 如发现实际部署入口不确定，标记 BLOCKED and require human confirmation.
