# Entry Anchor Contract

This contract defines the structured source of truth for Homelink entry sessions.
Employee uploads, owner history, owner detail, customer credit, arrears, rent
continuity checks, and WhatsApp exports must read the same anchors instead of
guessing from display text.

## Contract Version

- `employee_entry_anchor_v1`

## Locked Event Types

| Event Type | Meaning |
|---|---|
| `rent` | Rent receipt |
| `arrears_payment` | Historical arrears repayment |
| `deposit_in` | Deposit received |
| `deposit_out` | Deposit refunded |
| `checkout` | Checkout event |
| `expense` | Expense |
| `bed_transfer` | Bed transfer fee or waived transfer |

## Base Anchor Fields

Every anchor should preserve:

| Field | Notes |
|---|---|
| `anchor_id` / `event_id` | Stable event identifier when available |
| `session_id` | Parent entry session |
| `source` | `employee_entry` for employee uploads |
| `event_type` | One of the locked event types |
| `date` | Entry date |
| `operator` / `employee` | Human operator name or id |
| `created_at` | Creation timestamp |
| `bed` / `from_bed` / `to_bed` | Bed reference for the event |
| `amount` | Event amount in AED |
| `payment_method` | `cash`, `bank`, `none`, or `other` |
| `note` | Operator note |
| `raw_display_line` | Human-readable line generated from the anchor |
| `ttlock_context` | TTLock context when available |
| `validation_status` | `valid` or `missing_required_fields` |

## Event Required Fields

### rent

Required fields:

- `bed`
- `expected_rent`
- `paid_amount`
- `payment_method`
- `rent_period_start`
- `rent_period_end`
- `deposit_included_amount`
- `short_paid`
- `arrears_amount`
- `arrears_due_date`
- `arrears_note`
- `arrears_status`

If `expected_rent > paid_amount`, the anchor must preserve:

- `short_paid = true`
- `arrears_amount = expected_rent - paid_amount`
- `arrears_status = open`

### arrears_payment

Required fields:

- `bed`
- `original_arrears_id` / `arrears_ref`
- `original_arrears_amount`
- `already_paid_amount`
- `payment_amount`
- `remaining_arrears`
- `settlement_status = partial | settled`
- `payment_method`
- `note`

Arrears repayment is tied to an existing arrears reference, not to a billing
period.

### deposit_in

Required fields:

- `bed`
- `deposit_amount`
- `payment_method`
- `linked_tenant`
- `note`

### deposit_out

Required fields:

- `bed`
- `refund_amount`
- `payment_method`
- `refund_reason`
- `checkout_ref`
- `note`

### checkout

Required fields:

- `bed`
- `checkout_date`
- `deposit_refund`
- `outstanding_arrears`
- `final_note`
- `ttlock_context`

### expense

Required fields:

- `expense_amount`
- `expense_category`
- `target_bed`
- `reason`
- `payment_method`
- `note`

### bed_transfer

Required fields:

- `from_bed`
- `to_bed`
- `transfer_date`
- `fee_amount`
- `fee_status = paid | waived`
- `waiver_reason`
- `transfer_reason`
- `old_tenant_context`
- `old_ttlock_context`
- `note`

## Session Contract

Every session should preserve:

| Field | Notes |
|---|---|
| `session_id` / `row_id` | Session identifier |
| `anchor` | Stable session anchor |
| `corpid` | Owner-visible company id |
| `source` | `employee_entry` or `owner_upload` |
| `date` | Session date |
| `operator` / `employee` | Session operator |
| `entries_count` | Number of entry anchors |
| `entries_json` | Structured anchors |
| `export_text` | Readable export text |
| `summary` | Structured totals |

Structured summary is authoritative for employee entry sessions. Owner history
must not reparse employee export text as the money authority.

Summary fields:

- `cash_receipts`
- `bank_receipts`
- `deposit_refund`
- `expenses`
- `gross_income`
- `cash_handover`
- `balance_total`

## Immutable Rules

1. Raw anchors are the core fact layer and must not be silently rewritten by UI.
2. Repairs must be explicit repair/audit records.
3. Display, export, and analysis may evolve, but must not change anchor meaning.
4. Employee, owner, parser-adjacent readers, and exports must share this
   contract.
5. New features must read anchors instead of redefining field semantics.

