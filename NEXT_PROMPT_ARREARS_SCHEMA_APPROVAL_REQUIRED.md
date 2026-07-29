# Next Prompt: Arrears Schema Approval Required

Use this prompt only after owner approval.

```text
进入 TASK ARREARS-SCHEMA-APPROVAL-001。
目标：只生成 arrears_followup_tasks / audit / source-link schema migration 草案和 rollback 草案。
禁止执行 migration。
禁止写 production D1。
禁止写 staging D1。
禁止写 production-copy D1。
输出 approval packet、SQL review、rollback plan、affected table list。
必须保持 PRODUCTION_NO_GO。
```
