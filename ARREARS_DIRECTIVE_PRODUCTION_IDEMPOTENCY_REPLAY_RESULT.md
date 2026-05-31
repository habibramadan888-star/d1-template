# Arrears Directive Production Idempotency Replay Result

Result: `NOT_EXECUTED`

The owner idempotency replay request was not sent.

| Check | Status |
|---|---|
| duplicate directive prevention | not executed |
| owner idempotency key row | absent before smoke |
| production D1 write | no |

