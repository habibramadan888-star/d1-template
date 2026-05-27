# Staging Test Data Plan

Date: 2026-05-27, Asia/Dubai

Scope: staging-only QA data planning. This plan does not write D1 and does not
authorize production or staging database mutation by Codex.

## Data Labeling Rule

Every manually created test row should include a visible QA marker where the UI
allows it:

`QA_INTERNAL_STAGING_2026_05_27`

If the UI does not support a notes field, record the row ID, role, date/time,
property, and screenshot in the daily QA report.

## Test Data Matrix

| Data Area                    | Required QA Data                                        | Purpose                                                  | Retain or Clean                                        |
| ---------------------------- | ------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Test property                | QA property / room / unit under staging tenant          | Validate property-scoped employee and owner behavior.    | Retain until QA signoff, then cleanup decision.        |
| Test tenant/customer         | QA tenant with no production identity                   | Validate rent, arrears, history, and search.             | Retain until QA signoff.                               |
| Test employee                | Staging employee assigned to QA property                | Validate staff write and permission boundaries.          | Retain as staging test account.                        |
| Test owner                   | Staging owner assigned to QA tenant/property            | Validate dashboard/history/reporting.                    | Retain as staging test account.                        |
| Normal rent                  | Full payment for QA tenant                              | Baseline income and history behavior.                    | Retain as evidence.                                    |
| Short pay                    | Rent due greater than paid amount                       | Validate outstanding balance and arrears.                | Retain as evidence.                                    |
| Repayment                    | Payment against earlier short pay                       | Validate oldest-due-first and outstanding reduction.     | Retain as evidence.                                    |
| Overdue                      | Due date earlier than Asia/Dubai business date          | Validate overdue display.                                | Retain as evidence.                                    |
| Deposit                      | Deposit collection                                      | Validate deposit is not rent income.                     | Retain as evidence.                                    |
| Deposit refund               | Deposit refund movement                                 | Validate liability reduction / outflow behavior.         | Retain if safe, otherwise document as manual-required. |
| Deposit deduction            | Deposit deduction movement                              | Validate deduction does not silently become rent income. | Retain if safe, otherwise document as manual-required. |
| Void                         | Voided QA rent/payment/handover row                     | Validate soft-delete and active-total exclusion.         | Retain as evidence.                                    |
| Handover                     | QA handover with mixed rows                             | Validate totals and review flow.                         | Retain as evidence.                                    |
| Cross-tenant negative case   | Separate tenant/property data not assigned to test user | Validate filtering and denial.                           | Retain only if already staging-safe.                   |
| Cross-property negative case | Property outside employee assignment                    | Validate property permission denial.                     | Retain only if already staging-safe.                   |

## Safety Boundaries

| Boundary            | Requirement                                                                        |
| ------------------- | ---------------------------------------------------------------------------------- |
| Production data     | Do not copy or enter production customer data.                                     |
| Official accounting | QA rows are not formal accounting records.                                         |
| Secrets             | Do not record passwords, tokens, cookies, or API keys.                             |
| Cleanup             | Do not cleanup until evidence is reviewed and Ramadan Habib approves cleanup.      |
| Dashboard           | QA data may affect staging dashboard only; production dashboard remains untouched. |
