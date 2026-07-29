# Bed Transfer Employee Save Path Production Smoke Result

Date: 2026-06-01, Asia/Dubai

Result: `PASS`

## Smoke Input

| Field | Value |
|---|---|
| endpoint | `POST /api/employee/bed-transfers` |
| from_bed | `103` |
| to_bed | `111` |
| transfer_date | `2026-06-01` |
| reason | `Management adjustment` |
| note | `Internal production smoke: employee UI save path to pending review only.` |
| qa_tag | `qa_prod_bed_transfer_ui_20260601163437` |

## API Result

| Check | Expected | Actual | Result |
|---|---|---|---|
| create status | 201 | 201 | PASS |
| response code | 0 | 0 | PASS |
| transfer_id | present | `bt-20260601-103-111-89ba905e` | PASS |
| event status | `pending_review` | `pending_review` | PASS |
| review_required | yes | yes | PASS |
| idempotency replay status | 200 | 200 | PASS |
| idempotency replay transfer | same transfer | `bt-20260601-103-111-89ba905e` | PASS |
| owner API visibility | yes | yes | PASS |

## Production Write Scope

| Row Type | Count | Purpose |
|---|---:|---|
| `bed_transfer_events` | 1 | pending owner-review event |
| `audit_logs` | 1 | audit evidence |
| `entry_events` | 1 | trace evidence |
| `request_idempotency_keys` | 1 | idempotency replay evidence |

Authentication created temporary production login sessions for the employee and owner smoke checks. No password, token, cookie, or Set-Cookie value was printed.

## Explicit Non-Mutations

- No occupancy mutation.
- No deposit mutation.
- No arrears clearing.
- No TTLock mutation.
- No new tenant transaction.
- No checkout transaction.
- No financial formula change.
- No dashboard calculation change.

Production cutover remains `PRODUCTION_NO_GO`.
