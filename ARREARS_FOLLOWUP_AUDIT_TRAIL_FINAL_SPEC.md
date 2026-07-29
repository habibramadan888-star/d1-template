# Arrears Follow-up Audit Trail Final Spec

Status: final audit design only

## Required Fields

Every mutation must record:

- `task_id`
- `actor_user_id`
- `actor_role`
- `action`
- `from_status`
- `to_status`
- `note`
- `promised_payment_date`
- `amount_fils`
- `request_id`
- `created_at`
- `source_ip` if available
- `user_agent` if available

## Covered Events

1. Employee status update.
2. Employee promised payment.
3. Employee paid reported.
4. Owner closes task.
5. Owner confirms false positive.
6. Owner voids task.
7. System marks promise overdue.
8. Risk score updates.

## Audit Requirements

- Audit failure must be visible to monitoring.
- Business mutation should not silently proceed if audit is mandatory and unavailable unless explicitly designed as best-effort for non-financial fields.
- Audit rows must not store plaintext passwords, cookies, tokens, or secrets.
- Notes must be length-limited and escaped on display.
