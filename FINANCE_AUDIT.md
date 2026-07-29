# Finance Audit

Date: 2026-05-23  
Role perspective: senior accountant, controller, SaaS finance system reviewer  
Production data mutation: none

## Audit Scope

Reviewed:

- employee entry flow
- owner legacy entry/history flow
- rent config
- arrears
- deposit ledger
- transaction rows
- handover totals
- dashboard/browser calculations
- date and timezone handling

## P0: Cannot Go Live

- Money is stored and calculated using `REAL`, JS `Number`, and decimal rounding in multiple places. Commercial finance should use integer minor units or a decimal library.
- Employee handover upload is per-entry, not a server-side atomic session commit. Partial cloud success can leave an incomplete handover.
- Backend stores frontend-provided session totals such as cash handover, bank transfer total, and gross received. Backend must recompute authoritative totals from accepted entries.
- `/api/delete_session` physically deletes financial rows. This breaks auditability and dispute resolution.
- No formal `receivables` table exists. Arrears should originate from receivables, not only from transaction shortfall logic.
- Clean D1 bootstrap is not proven. A new customer environment may be missing tables.

## P1: Must Fix Before Commercial Launch

- Deposit ledger exists but uses `REAL` and can be hard-deleted by session delete.
- Arrear task lifecycle exists but needs tests for short pay, partial repayment, full repayment, manager close, and write-off.
- Rent configuration is stored as JSON in `app_settings`, without effective dates.
- Boss dashboard calculations still rely heavily on browser-side aggregation.
- Date logic mixes local browser dates, UTC ISO, and Dubai business date logic.
- Audit logs exist, but not every financial mutation has a consistent before/after event.

## P2: Commercial Optimization

- Export should be generated from backend-accepted session data.
- Reports should support CSV/Excel/PDF after schema stabilization.
- Owner dashboard should separate cash revenue, liabilities, refunds, expenses, and receivables.
- Reconciliation screen should show source row, receivable, payment, deposit movement, and audit event.

## P3: Later Enhancements

- AI anomaly detection.
- Automated overdue notifications.
- Router/WiFi suspension workflow.
- Multi-currency support only if needed later.

## Accounting Logic Review

### Rent

Current state:

- Monthly rent is configured by bed.
- 15-day rent is fixed at 400.
- Custom days use 40/day.
- Employee short payment can create an arrear task.

Risk:

- No receivable table means rent due is not a first-class accounting object.
- Browser-generated period data can diverge from backend.

Target:

- Create receivable first, then apply payments.

### Deposit

Current state:

- `deposit_ledger` records movements by tenant card ID.
- Deposit balance is sum of deltas.

Risk:

- Uses floating point.
- Legacy seed from TTLock/card remark can treat operational notes as accounting truth.

Target:

- Deposits must be liability ledger movements in integer minor units.

### Arrears

Current state:

- Rent shortfall creates or updates `arrear_tasks`.
- AP payments reconcile against linked task.

Risk:

- Needs formal linkage to receivable and exact payment events.
- Staff follow-up and financial repayment are mixed in one task object.

Target:

- `receivables` + `payments` + `arrear_tasks` separation.

### Handover

Current required formulas:

- cash handover = cash inflow - cash refund/expense outflow
- bank transfer total = bank inflow
- gross received = cash inflow + bank inflow

Risk:

- Current backend accepts frontend totals.

Target:

- Backend recomputes totals and returns accepted summary.

## Required Finance Tests

- 770 due, 80 paid creates 690 arrear with promise date.
- 400 due, 400 paid creates no arrear.
- 15D period uses inclusive 15-day rule.
- CUST 3 days equals 120 AED.
- Deposit in increases deposit liability.
- Deposit refund decreases deposit liability.
- Checkout deduction cannot exceed deposit balance.
- Arrear payment cannot exceed remaining arrear.
- Duplicate submit is idempotent.
- Voided session preserves all financial records.
