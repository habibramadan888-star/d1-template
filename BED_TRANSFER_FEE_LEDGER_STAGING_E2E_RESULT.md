# Bed Transfer Fee Ledger Staging E2E Result

Date: 2026-06-01

Status: `NOT_EXECUTED_YET`

Static implementation and local contract tests are in place. Remote staging write E2E has not been executed in this revision yet.

Planned staging coverage:

| Case | Expected |
|---|---|
| charged | `fee_mode=charged`, `amount_fils=5000`, entry event, bed transfer event, audit, idempotency |
| waived | `fee_mode=waived`, `amount_fils=0`, `waiver_reason` required, event/audit/idempotency |
| no mutation | no occupancy, deposit, arrears, or TTLock mutation |
| rollback QA rows | staging QA rows only, if staging write is approved |

Production cutover remains `PRODUCTION_NO_GO`.
