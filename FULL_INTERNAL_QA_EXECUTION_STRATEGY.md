# Full Internal QA Execution Strategy

Date: 2026-05-27, Asia/Dubai

Scope: internal QA execution strategy after unified login implementation. This
strategy does not approve production deploy, production migration, production D1
write, staging D1 write by Codex, dashboard authority switch, or commercial
launch.

## Read-Only Production-Linked Smoke

Applies to:

`https://homelink-finance.habibramadan888.workers.dev/unified-login.html`

Allowed without additional production write approval:

| Action                  | Allowed? | Notes                                             |
| ----------------------- | -------- | ------------------------------------------------- |
| Open unified login page | Yes      | Screenshot page load and URL.                     |
| Login                   | Yes      | Do not record passwords, tokens, or cookies.      |
| Verify employee routing | Yes      | Employee/staff should land on `employee-v3.html`. |
| Verify owner routing    | Yes      | Owner/manager/admin should land on `index.html`.  |
| View existing pages     | Yes      | Read-only only; no submit/save/delete.            |
| Screenshot              | Yes      | Mask sensitive data.                              |

Explicitly forbidden without separate production-linked write approval:

| Action                                     | Status    |
| ------------------------------------------ | --------- |
| Employee rent/deposit/arrears entry submit | Forbidden |
| Handover submit                            | Forbidden |
| Void / soft-delete                         | Forbidden |
| Settings change                            | Forbidden |
| Delete / revoke / destructive action       | Forbidden |
| Save business data                         | Forbidden |
| Dashboard authority switch                 | Forbidden |

## Full Write QA

Full write QA may run only under one of these conditions:

1. Staging environment is confirmed and approved.
2. Production-copy is confirmed and approved.
3. Ramadan Habib explicitly approves production-linked write testing with backup,
   rollback, and stop conditions.

## Required Full Write QA Coverage

| Area                      | Target Environment         | Notes                                          |
| ------------------------- | -------------------------- | ---------------------------------------------- |
| Employee entry            | staging or production-copy | Rent, deposit, arrears, repayment, validation. |
| Handover submit           | staging or production-copy | Duplicate and weak-network behavior.           |
| Void / correction         | staging or production-copy | Active totals must exclude voided rows.        |
| Owner dashboard/history   | staging or production-copy | Reconcile against QA rows only.                |
| Tenant/property isolation | staging or production-copy | Include negative cases.                        |
| Export/report             | staging or production-copy | Verify scope and no secrets.                   |

## Launch Boundary

Internal QA, unified login smoke, staging QA, and production-copy dry-runs do not
approve commercial launch. Production remains `PRODUCTION_NO_GO`.
