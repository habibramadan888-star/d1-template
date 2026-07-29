# Production Copy Row Backfill 008 Accounting Signoff Checklist

Date: 2026-05-27, Asia/Dubai

Status: `ACCOUNTING_SIGNOFF_REQUIRED`

Scope: checklist for accounting review after copy-only row-level money
compatibility backfill. This file is not production approval.

| Item                           | Evidence                                            | Current Status     | Required Owner                 | Notes                                                  |
| ------------------------------ | --------------------------------------------------- | ------------------ | ------------------------------ | ------------------------------------------------------ |
| Transaction amount conversion  | `amount` 123850.5 AED -> `amount_fils` 12385050     | REVIEW_READY       | Accounting                     | 0 mismatch count on copy.                              |
| Transaction due conversion     | `due` 43800 AED -> `due_fils` 4380000               | REVIEW_READY       | Accounting                     | 0 mismatch count on copy.                              |
| Transaction paid conversion    | `paid` 37570 AED -> `paid_fils` 3757000             | REVIEW_READY       | Accounting                     | 0 mismatch count on copy.                              |
| Transaction deficit conversion | `deficit` 6230 AED -> `deficit_fils` 623000         | REVIEW_READY       | Accounting                     | 0 mismatch count on copy.                              |
| Arrears remaining conversion   | `remain` 860 AED -> `remain_fils` 86000             | REVIEW_READY       | Accounting + receivables owner | Must align with receivables policy.                    |
| Arrear task conversion         | `arrear_amount` 50 AED -> `arrear_amount_fils` 5000 | REVIEW_READY       | Accounting + receivables owner | Task lifecycle still review-only.                      |
| Deposit ledger                 | 0 rows                                              | NOT_APPLICABLE_NOW | Accounting                     | No production-copy rows to review.                     |
| TOP_25 money risks             | Prior risk list still not closed                    | MANUAL_REQUIRED    | Accounting + engineering       | Must be closed before production.                      |
| Frontend totals authority      | Not used as authority                               | PASS_WITH_WARNING  | Engineering + accounting       | Production authority still gated.                      |
| Rounding behavior              | Unsafe decimal precheck was 0                       | PASS_WITH_WARNING  | Engineering                    | Production policy should still reject unsafe decimals. |

## Required Signoff Before Production

Accounting must explicitly approve:

1. Legacy AED-to-fils conversion totals.
2. Treatment of cleared vs active arrears rows.
3. Treatment of arrear task promised/received amounts.
4. TOP_25 money risk closure or accepted residual risk.
5. Whether receivables data backfill must happen before production cutover.
6. Rollback acceptance after copy rollback rehearsal.

Current decision: `MANUAL_REQUIRED`.
