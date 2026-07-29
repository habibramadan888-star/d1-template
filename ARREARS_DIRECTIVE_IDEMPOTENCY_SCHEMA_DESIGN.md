# Arrears Directive Idempotency Schema Design

Date: 2026-05-31

## Scope

This design covers durable idempotency for arrears directive staging write QA only:

- Owner directive creation: `POST /api/boss/arrears/directives`
- Employee directive follow-up: `POST /api/employee/arrears/directives/:taskId/followup`

Production D1 was not modified. Production migration remains approval-required.

## Table

`request_idempotency_keys`

| Column | Purpose |
|---|---|
| `id` | Internal row id |
| `scope` | Tenant/corporate scope, currently `corpid` |
| `idempotency_key` | Client/QA supplied key |
| `actor_user_id` | User that submitted the original request |
| `actor_role` | Role at submission time |
| `action` | Logical write action |
| `request_hash` | Stable hash of the normalized request payload |
| `response_hash` | Hash of the stored response body |
| `response_body` | Stored successful response for replay |
| `resource_type` | Resource family, e.g. `arrear_task` |
| `resource_id` | Affected task id(s) |
| `status` | Recorded result status |
| `created_at` | Insert timestamp |
| `expires_at` | Optional retention boundary |

## Unique Constraint

The unique replay key is:

`(scope, action, idempotency_key)`

This allows the same text key to be reused safely for different tenants or logical actions, while preventing duplicate processing for the same scoped action.

## Replay Rules

| Case | Result |
|---|---|
| Same scope/action/key, same actor, same request hash | Return stored response with `X-Idempotency-Replayed: true` |
| Same scope/action/key, different actor or different request hash | Return `409 idempotency_conflict` |
| New scope/action/key | Process write and store response |

## Request Hash Inputs

Owner directive create:

- `corpid`
- `actor`
- `assigned_employee_id`
- `note`
- `task_ids`

Employee follow-up:

- `corpid`
- `actor`
- `task_id`
- `promised_payment_date`
- `followup_note`

## Write Safety

- Idempotency is checked before the business write.
- Successful writes store response body and response hash.
- Audit logging remains separate from idempotency storage.
- Staging write gate is still required.

## Production Status

Production cutover remains `PRODUCTION_NO_GO`.
