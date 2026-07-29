# Next Prompt: P1-006B Controlled Embedded Write

Use this prompt only after human review confirms that `deploy-worker/src/index.embedded.js` is an actual staging or production deploy artifact and approves the dry-run diff.

```text
进入 TASK P1-006B：Controlled embedded Worker artifact write.

前置条件：
1. P1-006 drift gate 已完成。
2. 人工已确认 embedded Worker 是实际 deploy artifact 或 staging deploy 需要它。
3. 人工已审核 `EMBEDDED_WORKER_GENERATION_DRY_RUN_RESULT.md`。
4. 人工已审核 `.tmp/embedded-worker-dry-run/index.embedded.generated.js` 与 `deploy-worker/src/index.embedded.js` 的差异。
5. 不允许 production deploy。
6. 不允许 production / remote D1 migration。

任务目标：
受控更新 `deploy-worker/src/index.embedded.js`，使它与 `deploy-worker/src/index.js` 的关键 route / guard / void 行为一致。

严格限制：
1. 不部署 production。
2. 不执行 staging deploy。
3. 不执行 production / remote D1 migration。
4. 不修改 live financial formula。
5. 不修改 live dashboard result。
6. 不修改 live handover flow。
7. 不提交 secret。
8. 不删除 legacy business code。

执行步骤：
1. `git status`，确认干净。
2. 创建分支：`fix/p1-006b-controlled-embedded-write`。
3. 运行：
   - `npm run check`
   - `npm run smoke:with-worker`
   - `npm run verify:clean-d1`
   - `npm run test:handover-staging-endpoint`
   - `npm run rehearse:handover-staging-endpoint`
   - `npm run verify:dashboard-unchanged`
   - `npm run verify:handover-legacy-unchanged`
   - `npm run audit:worker-drift`
   - `npm run verify:embedded-worker`
   - `npm run build:embedded:dry-run`
   - `npm run security:secrets`
4. 如果 dry-run 仍包含全部 critical items，受控复制 `.tmp/embedded-worker-dry-run/index.embedded.generated.js` 到 `deploy-worker/src/index.embedded.js`。
5. 重新运行全部验证命令。
6. 生成 diff summary、hash summary、route inventory summary。
7. 更新 P1-006 状态报告。
8. 提交：`build: refresh embedded Worker artifact after controlled drift review`。

最终必须输出：
1. 是否修改 `index.embedded.js`
2. 新旧 hash
3. critical routes / guards 是否存在
4. 是否执行 deploy：必须为 no
5. 是否执行 remote/production migration：必须为 no
6. 是否存在 secret 风险
7. 是否可以进入真实 staging deploy prep

本任务完成后停止，不要部署。
```
