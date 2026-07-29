# Finance Authority Freeze

Scope: authority definition and implementation gap audit only. No D1 query, migration, deploy, or formula change was performed.

## 1. Money Unit Authority

### Current State

- Shared finance modules use integer minor units:
  - `modules/finance/money.mjs` parses AED strings into BigInt fils.
  - `modules/finance/receivables.mjs` rejects JS numbers as authority and accepts bigint fils or AED strings only.
- Staging handover schema uses integer fields such as `backend_cash_handover_fils`, `amount_fils`, and `delta_max_fils`.
- Legacy local bootstrap schema still includes `REAL` amount fields in tables such as `sessions`, `transactions`, `arrear_tasks`, and `deposit_ledger`.
- Source scan scripts exist:
  - `scripts/audit-money-fields.mjs`
  - `scripts/triage-money-audit.mjs`
  - `scripts/audit-money-live-write-paths.mjs`

### Target State

Only integer fils is authoritative.

```text
1 AED = 100 fils
150.50 AED = 15050 fils
```

Conversion rules:

```text
User input "150.50"
  -> frontend validates input shape
  -> backend receives/normalizes integer fils
  -> DB stores integer fils
  -> backend computes with integer arithmetic
  -> frontend displays "150.50 AED"
```

Forbidden authority:

- JS floating point arithmetic for accounting totals.
- Frontend-computed dashboard totals.
- DB `REAL`, `FLOAT`, `DOUBLE`, or unbounded decimal as commercial authority.

### Audit Requirements

| Check                   | Evidence Source                                                                         | Current Result                                                                 | Required Action                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Current storage unit    | `migrations/local/001_clean_legacy_bootstrap.sql` and `002_handover_atomic_staging.sql` | Mixed legacy `REAL` and target `*_fils`.                                       | Block production cutover until live write paths are integer-fils authority. |
| All JS money operations | `npm run audit:money` and `npm run triage:money`                                        | Tooling exists; raw findings must be triaged.                                  | Classify every frontend/backend money operation.                            |
| API response schema     | Worker source and API audit                                                             | Several legacy endpoints return decimal-shaped fields.                         | Freeze per-endpoint response schema before write QA.                        |
| DB schema               | migration and readiness scripts                                                         | Commercial target tables exist in rehearsal drafts; legacy tables remain.      | Run production-copy schema readiness audit before D1 write approval.        |
| Dashboard totals        | backend totals tests and owner source                                                   | Backend totals tests exist, but live dashboard authority switch remains gated. | Require backend-computed totals endpoint and reconciliation version.        |

### Current Top 5 Precision Risks

| Risk                    | Current Evidence                                                                        | Required Verification                                           |
| ----------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Dashboard totals        | Owner UI and legacy routes still have compatibility logic.                              | Confirm all KPI totals are returned by backend in integer fils. |
| Handover transaction    | Staging atomic flow has idempotency and fils fields, but live switch remains disabled.  | Production-copy dry-run of idempotent handover.                 |
| Deposit deduction       | `deposit_ledger` legacy schema has `REAL`; adapter plans `amount_fils`.                 | Deposit migration and state transition validation.              |
| Receivables calculation | Receivable module uses fils, but live authority switch is still staged.                 | Receivables shadow comparison and authority switch gate.        |
| Overpayment handling    | Receivables module classifies overpaid, but commercial workflow approval is not frozen. | Manual review and audit trail definition before GO.             |

## 2. Backend Totals Authority

Target definitions:

| KPI                | Authority    | Calculation Rule                                                          | Exclusions                               |
| ------------------ | ------------ | ------------------------------------------------------------------------- | ---------------------------------------- |
| `totalCash`        | Backend only | Sum accepted cash payment rows for business date.                         | Voided, pending, rejected rows.          |
| `totalBank`        | Backend only | Sum accepted bank transfer rows for business date.                        | Voided, pending, rejected rows.          |
| `totalReceived`    | Backend only | `totalCash + totalBank`.                                                  | Frontend recomputation.                  |
| `pendingChargeoff` | Backend only | Sum approved pending chargeoff/offset candidates.                         | Unapproved manual drafts.                |
| `arrearsList`      | Backend only | Group receivables with outstanding > 0 and due date before business date. | Voided, written off, future receivables. |

Required response metadata:

```json
{
  "computation_version": "1.0",
  "business_date": "YYYY-MM-DD",
  "computed_at": "ISO8601",
  "source_tables": {
    "payments_checked": 0,
    "receivables_checked": 0,
    "voided_excluded": 0
  },
  "reconciliation_status": "pending"
}
```

Current gap: current code and tests prove parts of backend total behavior, but the live endpoint contract does not visibly include `computation_version` and reconciliation metadata.

## 3. Deposit State Machine

Target states:

```text
RECEIVED -> HELD -> DEDUCTED -> RETURNED -> CLOSED
                 -> OFFSET_APPLIED -> CLOSED
                 -> RETURNED -> CLOSED
```

| State          | Meaning                            | Required Fields                                                        | Valid Next State                   |
| -------------- | ---------------------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| RECEIVED       | Deposit payment recorded.          | deposit_id, customer_id, amount_fils, method, recorded_by, created_at. | HELD                               |
| HELD           | Deposit held and not yet consumed. | balance_fils, held_since.                                              | DEDUCTED, RETURNED, OFFSET_APPLIED |
| DEDUCTED       | Some or all deposit deducted.      | deducted_fils, reason, approved_by.                                    | RETURNED, OFFSET_APPLIED, CLOSED   |
| RETURNED       | Deposit balance returned.          | returned_fils, returned_method, returned_date.                         | CLOSED                             |
| OFFSET_APPLIED | Deposit used to offset receivable. | receivable_id, offset_fils, approved_by, offset_transaction_id.        | CLOSED                             |
| CLOSED         | Fully settled deposit lifecycle.   | closed_at, close_reason.                                               | none                               |

Ledger entry required for every transition:

```json
{
  "event_id": "uuid",
  "deposit_id": "uuid",
  "event_type": "DEPOSIT_RECEIVED",
  "amount_fils": 10000,
  "previous_state": "HELD",
  "next_state": "DEDUCTED",
  "approved_by": "manager_id",
  "created_at": "ISO8601"
}
```

Current gap: existing code has deposit ledger and staging write plans, but the full six-state deposit lifecycle is not frozen as live schema and transition guard.

## 4. Receivables State Machine

Target states:

```text
CREATED -> PENDING -> PARTIAL -> PAID
                    -> VOIDED -> RESTORED -> PENDING
                    -> ADJUSTED
                    -> WRITTEN_OFF
```

| State       | Meaning                                     | Required Validation                                |
| ----------- | ------------------------------------------- | -------------------------------------------------- |
| CREATED     | Receivable created by contract/rent period. | amount_fils > 0, due_date present.                 |
| PENDING     | No payment applied.                         | outstanding_fils = amount_fils.                    |
| PARTIAL     | Some payment applied.                       | paid_fils > 0 and outstanding_fils > 0.            |
| PAID        | Fully paid.                                 | outstanding_fils = 0.                              |
| VOIDED      | Receivable voided.                          | voided_by, voided_at, reason.                      |
| RESTORED    | Voided receivable restored.                 | restore event linked to prior void.                |
| ADJUSTED    | Amount adjusted with approval.              | original_fils, adjusted_fils, approved_by, reason. |
| WRITTEN_OFF | Accounting write-off.                       | written_off_by, written_off_at, reason.            |

Payment allocation rule:

```text
Allocate payment to oldest due PENDING/PARTIAL receivable first.
If payment exceeds outstanding balance, create manual review or credit event.
Do not silently over-apply.
```

Current implementation evidence:

- `modules/finance/receivables.mjs` computes outstanding and classifies status using fils.
- Receivables staging tests and fixtures exist.

Current gap:

- Live authority switch remains staged.
- Payment allocation is not frozen as production D1 authority.
- Write-off and adjustment approval workflow needs final signoff.

## 5. Dashboard KPI Authority

| KPI                | Source                         | Target Behavior                                                | Current Gap                                                         |
| ------------------ | ------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------- |
| Today's Collected  | Backend payments/session rows. | Return backend-computed integer-fils totals.                   | Live contract still needs versioned authority metadata.             |
| Pending Collection | Receivables.                   | Return overdue outstanding receivables only.                   | Receivables authority switch not complete.                          |
| Today's Actions    | Composite backend endpoint.    | Return checkouts, new arrears, voided entries, manual reviews. | Some modules are UI-level summaries, not a frozen backend contract. |
| Alerts             | Backend rule set.              | Short pay, overdue, high arrears, pending review.              | Alert thresholds and ownership need product/finance signoff.        |

## 6. Production Status & Sign-Off

Current production status:

```text
PRODUCTION_NO_GO
```

Before GO:

- [ ] Money precision: live authoritative amount fields are integer fils.
- [ ] Deposit state machine: schema and transition validation implemented.
- [ ] Receivables state machine: schema, payment allocation, write-off, and adjustment rules implemented.
- [ ] Audit trail: all mutations have old/new values and actor identity.
- [ ] Backend totals: versioned response and reconciliation status.
- [ ] Dashboard KPIs: backend-computed and finance-approved.
- [ ] Tenant/property isolation: every list and write endpoint filtered by server claim.
- [ ] Production-copy dry-run completed.

Required signoff:

- Finance/accounting: money authority and receivables rules.
- Engineering lead: implementation and tests.
- Product owner: workflow correctness.
- CEO/owner: final business approval.
