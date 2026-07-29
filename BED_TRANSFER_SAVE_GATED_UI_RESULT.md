# Bed Transfer Save Gated UI Result

Date: 2026-06-01, Asia/Dubai

## Result

Bed Transfer real writes remain disabled in production UI.

| Requirement | Result |
|---|---|
| Production Bed Transfer save must not write D1 | PASS |
| Shows approval-required message | PASS |
| Does not show save success | PASS |
| Does not create fake Bed Transfer record | PASS |
| Does not modify occupancy | PASS |
| Does not modify deposit | PASS |
| Does not modify arrears | PASS |
| Does not modify TTLock | PASS |
| Does not create `bed_transfer_events` | PASS |

Message:

```text
换床真实写入未启用，需要生产审批。 Bed transfer write is not enabled.
```

The export/commit path also blocks any `TF` draft while `BED_TRANSFER_WRITE_ENABLED=false`.

Production cutover remains `PRODUCTION_NO_GO`.
