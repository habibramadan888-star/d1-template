# Bed Transfer Employee Save Mobile QA Result

Date: 2026-06-01, Asia/Dubai

Result: `PASS`

## Context

| Item | Value |
|---|---|
| Branch | `fix/auth-closure-001` |
| Deploy commit | `839c6f9 deploy: publish bed transfer employee save path` |
| Smoke record commit | `b604327 test: record bed transfer employee ui write smoke` |
| Production Worker version | `832d3ac2-3b3a-4839-92e8-698fbeffe24c` |
| Staging E2E | PASS |
| Production smoke | PASS |
| Smoke pair | `103 -> 111` |
| Owner visibility | PASS |
| No-mutation verify | PASS |
| Internal enablement | `enabled_for_internal_testing` |
| Production cutover | `PRODUCTION_NO_GO` |

## Ramadan Mobile QA

| Check | Expected | Actual | Result |
|---|---|---|---|
| Employee Entry page opens | yes | yes | PASS |
| Bed Transfer option selectable | yes | yes | PASS |
| From Bed / 原床位 visible | yes | yes | PASS |
| To Bed / 新床位 visible | yes | yes | PASS |
| Transfer Date / 换床日期 visible | yes | yes | PASS |
| Reason / 换床原因 visible | yes | yes | PASS |
| Note / 备注 visible | yes | yes | PASS |
| Save does not show write-not-enabled copy | no gated-copy after enablement | no gated-copy observed | PASS |
| Save success copy | `Submitted for owner review / 已提交老板核对` | shown | PASS |
| Owner sees pending review request | yes | yes | PASS |
| Owner sees from_bed -> to_bed | yes | yes | PASS |
| Owner sees employee/operator | yes | yes | PASS |
| Owner sees transfer date | yes | yes | PASS |
| Owner sees reason | yes | yes | PASS |
| Owner sees note | yes | yes | PASS |
| Occupancy changed directly | no | no | PASS |
| Deposit changed | no | no | PASS |
| Arrears cleared or changed | no | no | PASS |
| TTLock modified | no | no | PASS |
| Dashboard calculation changed | no | no | PASS |
| Financial formula changed | no | no | PASS |
| Production cutover | `PRODUCTION_NO_GO` | `PRODUCTION_NO_GO` | PASS |

## Production Write Scope Already Recorded

The prior approved production smoke wrote only:

- 1 `bed_transfer_events` row with status `pending_review`.
- 1 `audit_logs` row.
- 1 `entry_events` trace row.
- 1 `request_idempotency_keys` row.

This mobile QA record did not execute any new production migration, deployment, D1 command, business write, commercial launch, dashboard calculation change, or financial formula change.

## Decision

Employee Bed Transfer save path remains `enabled_for_internal_testing`.

Production cutover remains `PRODUCTION_NO_GO`.

## Next Recommended Action

Continue internal QA for owner review workflow clarity. Do not enter production cutover or commercial launch until owner approve/reject behavior and broader acceptance are separately approved and verified.
