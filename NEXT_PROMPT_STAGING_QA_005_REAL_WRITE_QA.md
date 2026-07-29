# NEXT PROMPT: STAGING-QA-005 Real Write QA

Use only after human approval and after all prerequisites are complete.

```text
进入 TASK STAGING-QA-005：Real staging write QA for employee entry adapter.

前置条件必须全部满足：
1. staging schema bootstrap completed.
2. staging D1 backup completed and evidence recorded.
3. rollback method exercised.
4. employee / owner / manager test accounts confirmed.
5. staging secrets configured outside Git.
6. production URL excluded.
7. human approval explicitly granted for staging write QA.

严格禁止：
1. 不执行 production deploy。
2. 不执行 production migration。
3. 不执行 remote production D1 migration。
4. 不写 production D1。
5. 不提交 secret。
6. 不开启 production feature flags。
7. 不把 staging write QA 误标记为 production ready。

允许：
1. 只对 homelink-finance-staging 执行 approved staging write QA。
2. 使用 staging Worker homelink-finance-staging。
3. 使用 explicit confirmation flags。
4. 验证 employee entry adapter。
5. 验证 dashboard/history expected behavior。
6. 验证 rollback by feature flag off。

必须运行：
1. npm run check
2. npm run security:secrets
3. npm run gate:commercial-launch
4. npm run qa:employee-entry-staging -- --confirm-staging-write --confirm-backup --confirm-rollback

完成后输出：
1. 是否写 staging 数据。
2. 写入哪些表。
3. 是否写 production：必须 no。
4. dashboard/history 是否符合预期。
5. rollback 是否通过。
6. production cutover 是否仍 NO-GO。
```
