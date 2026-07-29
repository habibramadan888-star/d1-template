# Arrears Directive Production Real Delivery Rollout Decision

Date: 2026-05-31

## Decision

The current production UI must be treated as dry-run/manual dispatch unless a separate approval opens the production write gate.

## Abdul Single-Task Rollout Result - 2026-05-31

Ramadan approved a constrained production-linked rollout for exactly one existing arrears task assigned to Abdul.

| Item | Result |
|---|---|
| target task | `task-mpgzu9kp-f150e26f` |
| source | `existing_arrears_record` |
| owner directive create | PASS |
| employee inbox visibility | PASS |
| employee follow-up | PASS |
| owner feedback visible | PASS |
| write gate after rollout | off |
| production D1 write scope | one owner directive create and one employee follow-up only |
| TTLock production dispatch | NOT RUN |
| batch dispatch | NOT RUN |
| cleanup / restore | not performed; result retained per current rollout instruction |
| production cutover | PRODUCTION_NO_GO |

This result proves the Abdul inbox path for one existing arrears record only. It does not approve TTLock rollout, batch dispatch, public beta, or commercial cutover.

## Why Employee Did Not Receive Task

The owner UI generated a dispatch/WhatsApp list, but real production delivery requires `POST /api/boss/arrears/directives` with the write gate enabled. With the write gate off, no new employee inbox task should be created.

## Options

| Option | Scope | Recommendation |
|---|---|---|
| A | Dry-run + WhatsApp manual notify | Safe default now |
| B | Single employee Abdul pilot | Requires explicit approval and write gate |
| C | existing_arrears only real dispatch | Safer than broad rollout, still requires approval |
| D | All arrears real dispatch | Not recommended now |

## Boundary

- Write gate: off.
- Batch dispatch: not approved.
- TTLock production smoke: not approved.
- Production cutover: `PRODUCTION_NO_GO`.

## UI Deploy Note - 2026-05-31

The employee inbox UI and owner dry-run copy were deployed in Worker version `6d7b8a02-ddb1-4cb8-a67d-21ace1871c10`.

This deploy does not change the rollout decision:

- Production write gate remains off.
- Dry-run still does not create employee-side directives.
- Real production delivery still requires separate approval.
- Production cutover remains `PRODUCTION_NO_GO`.
