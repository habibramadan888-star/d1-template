# Next Prompt: Arrears Production Preflight Packet

```text
进入 TASK ARREARS-PRODUCTION-PREFLIGHT-PACKET-001。
目标：生成生产前审批包，不执行 production。
必须包含：schema diff、rollback drill、backup plan、D1 target confirmation、manual accounting signoff、owner signoff、risk acceptance、go/no-go matrix。
禁止 production deploy。
禁止 production migration。
禁止 production D1 write。
禁止把 commercial launch 改成 GO。
默认结论必须保持 PRODUCTION_NO_GO，除非独立审批链全部完成。
```
