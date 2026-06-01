# Bed Transfer Employee Save Path No-Mutation Verify

Date: 2026-06-01, Asia/Dubai

Result: `PASS`

## Post-Smoke Evidence

| Check | Pre-Smoke | Post-Smoke | Result |
|---|---:|---:|---|
| from_bed active transactions (`103`) | 2 | 2 | PASS |
| to_bed active transactions (`111`) | 0 | 0 | PASS |
| from_bed deposit balance cents | 0 | 0 | PASS |
| to_bed deposit balance cents | 0 | 0 | PASS |
| from_bed open arrears cents | 0 | 0 | PASS |
| to_bed open arrears cents | 0 | 0 | PASS |
| selected transfer row | 0 | 1 | expected event-ledger write |
| selected audit row | 0 | 1 | expected audit evidence |
| selected trace row | 0 | 1 | expected trace evidence |
| selected idempotency row | 0 | 1 | expected idempotency evidence |

## Mutation Boundary

| Area | Mutation |
|---|---|
| occupancy | no |
| deposit | no |
| arrears | no |
| TTLock | no |
| new tenant count | no new tenant transaction |
| checkout count | no checkout transaction |
| financial formula | unchanged |
| dashboard calculation | unchanged |
| production cutover | `PRODUCTION_NO_GO` |
