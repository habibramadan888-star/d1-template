# Receivables Migration Draft Review

Generated: 2026-05-25, Asia/Dubai

Reviewed file: `migration-drafts/receivables_local_staging_rehearsal_draft.sql`

Scope: draft schema for local/staging rehearsal only. The draft was not applied to local D1, staging D1, remote D1, or production.

| Table                    | Purpose                           | Money Fields                                   | Writes Data | Production Allowed | Notes                                       |
| ------------------------ | --------------------------------- | ---------------------------------------------- | ----------- | ------------------ | ------------------------------------------- |
| `receivables`            | Future obligation source of truth | `amount_fils`, `paid_fils`, `outstanding_fils` | No          | No                 | Schema only; preserves legacy arrears.      |
| `receivable_events`      | Append-only lifecycle events      | `amount_fils`                                  | No          | No                 | Supports auditability.                      |
| `payment_allocations`    | Payment-to-receivable allocation  | `allocated_fils`                               | No          | No                 | Needed for repayment and short-pay closure. |
| `receivable_adjustments` | Approved non-payment corrections  | `amount_fils`                                  | No          | No                 | Keeps waiver/discount separate from cash.   |

## SQL Safety Review

| Check                               | Result | Notes                                         |
| ----------------------------------- | ------ | --------------------------------------------- |
| Contains CREATE TABLE               | Yes    | Allowed for local/staging draft.              |
| Contains CREATE INDEX               | Yes    | Allowed for local/staging draft.              |
| Contains ALTER                      | No     | No existing table mutation.                   |
| Contains DROP                       | No     | No destructive operation.                     |
| Contains INSERT                     | No     | No seed/business data.                        |
| Contains UPDATE                     | No     | No data mutation.                             |
| Contains DELETE                     | No     | No data mutation.                             |
| Modifies existing production tables | No     | Draft creates only future receivables tables. |

Conclusion: safe as a draft for local/staging review. It is not safe to apply to production without separate migration approval, backup, rollback, reconciliation, and tenant/property scope review.
