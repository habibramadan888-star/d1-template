# Arrears Directive Production Real Delivery Rollout Decision

Date: 2026-05-31

## Decision

The current production UI must be treated as dry-run/manual dispatch unless a separate approval opens the production write gate.

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
