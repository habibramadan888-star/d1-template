# Receivables Staging Shadow Data Seed Result

Generated: 2026-05-25T19:24:33.971Z

Result: `PASS`

QA run id: `P0-008E-20260525-STAGING-SHADOW-001`
Source: `P0-008E_RECEIVABLES_SHADOW_REHEARSAL`
Target D1: `homelink-finance-staging` (`4ff78bfc-3855-436b-aefb-6b492145d79c`)

Mode:

- Confirm flag present: yes.
- Staging D1 write executed: yes.
- Production deploy: no.
- Production migration: no.
- Production D1 write: no.
- Secret/password/token/cookie logged: no.

Before / after counts:

| Table        | Before | After | Delta |
| ------------ | ------ | ----- | ----- |
| arrear_tasks | 0      | 7     | 7     |
| transactions | 0      | 2     | 2     |

Planned / seeded rows:

| Table        | ID                        | Scenario          | Amount Fils | Paid Fils |
| ------------ | ------------------------- | ----------------- | ----------- | --------- |
| arrear_tasks | p0_008e_due_today         | due_today         | 50000       | 0         |
| arrear_tasks | p0_008e_overdue           | overdue           | 90000       | 10000     |
| arrear_tasks | p0_008e_short_pay         | short_pay         | 77000       | 8000      |
| arrear_tasks | p0_008e_partial_repayment | partial_repayment | 100000      | 40000     |
| arrear_tasks | p0_008e_full_repayment    | full_repayment    | 30000       | 30000     |
| arrear_tasks | p0_008e_adjustment_credit | adjustment_credit | 70000       | 60000     |
| arrear_tasks | p0_008e_adjustment_debit  | adjustment_debit  | 50000       | 50000     |
| transactions | p0_008e_voided_payment    | voided_payment    | 45000       | 45000     |
| transactions | p0_008e_deposit_exclusion | deposit_exclusion | 25000       | 25000     |

Gate evidence:

```text
> homelink-finance@0.1.0 gate:commercial-launch
> node scripts/gate-commercial-launch-readiness.mjs

COMMERCIAL_LAUNCH_READINESS=PRODUCTION_NO_GO
COMMERCIAL_LAUNCH_AREAS=17
COMMERCIAL_LAUNCH_NO_GO=12
COMMERCIAL_LAUNCH_MANUAL_REQUIRED=1
COMMERCIAL_LAUNCH_BLOCKED=0
```

Rollback recommendation:

- Keep this data temporarily as staging QA evidence.
- If cleanup is approved later, delete only rows with IDs beginning `p0_008e_` after a staging backup.
- Do not delete production data.
