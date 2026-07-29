# Employee Entry Live Route Cutover Test Plan

Date: 2026-05-24

Scope: future test plan only. This task does not switch live `/api/employee/entry`.

| Test ID  | Scenario                    | Preconditions                    | Expected Result                                     | Evidence                         |
| -------- | --------------------------- | -------------------------------- | --------------------------------------------------- | -------------------------------- |
| EELC-001 | Production feature disabled | `APP_ENV=production`             | Legacy production route remains unchanged           | Response snapshot                |
| EELC-002 | Local flag disabled         | `APP_ENV=test`, flag off         | Legacy path is used                                 | Table snapshot                   |
| EELC-003 | Local flag enabled          | `APP_ENV=test`, flag on          | Adapter pre-validation runs                         | Adapter audit marker             |
| EELC-004 | Full rent cash              | Valid rent anchors               | Amount/due/paid/deficit plans match write result    | `transactions`, `sessions`       |
| EELC-005 | Short-paid rent             | Promise date and reason provided | Arrear task plan/write is consistent                | `arrear_tasks`, audit            |
| EELC-006 | Missing arrear reason       | Short-paid rent without reason   | Request rejected                                    | Structured error                 |
| EELC-007 | Deposit collection          | Deposit balance anchor known     | Deposit ledger plan/write is consistent             | `deposit_ledger`                 |
| EELC-008 | Deposit refund              | Known balance sufficient         | Refund decreases balance                            | `deposit_ledger`                 |
| EELC-009 | Refund exceeds balance      | Known balance insufficient       | Request rejected                                    | Structured error                 |
| EELC-010 | Checkout deduction          | Known deposit balance            | Deduction not treated as income                     | `transactions`, `deposit_ledger` |
| EELC-011 | Arrears payment             | Linked open task exists          | Task actual received increments                     | `arrear_tasks`                   |
| EELC-012 | Transfer fee                | Fee choice provided              | Fixed fee rule applied                              | `transactions`                   |
| EELC-013 | Expense                     | Expense category provided        | Cash handover decreases if cash                     | `sessions`                       |
| EELC-014 | Three decimals              | `100.999`                        | Request rejected                                    | Structured error                 |
| EELC-015 | JS numeric money            | Numeric amount body              | Request rejected or explicitly legacy-warning gated | Structured error/warning         |
| EELC-016 | Voided row                  | `status=VOIDED`                  | No active write                                     | Audit evidence                   |
| EELC-017 | Duplicate entry id          | Same id twice                    | Idempotent or duplicate-safe response               | Existing row evidence            |
| EELC-018 | Dashboard unchanged         | Before/after owner snapshot      | No unintended change                                | Dashboard snapshot               |
| EELC-019 | Flag rollback               | Disable flag after enabled run   | Legacy path restored                                | Route behavior snapshot          |
| EELC-020 | Secret hygiene              | Full test chain                  | No secret committed                                 | `npm run security:secrets`       |

## Required Commands For Future Rehearsal

```text
npm run check
npm run smoke:with-worker
npm run verify:clean-d1
npm run test:employee-entry-live-write-adapter
npm run test:employee-entry-adapter-staging-endpoint
npm run rehearse:employee-entry-adapter-staging-endpoint
npm run security:secrets
```

Additional future scripts should be added before any live-route switch rehearsal:

- `npm run test:employee-entry-live-route-cutover`
- `npm run rehearse:employee-entry-live-route-cutover`
- `npm run verify:employee-entry-dashboard-unchanged`
