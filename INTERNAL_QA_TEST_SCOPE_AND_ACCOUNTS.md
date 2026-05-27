# Internal QA Test Scope and Accounts

Date: 2026-05-27, Asia/Dubai

Scope: staging internal QA coordination only. This file must not contain
passwords, tokens, cookies, or production secrets.

| Item                         | Value                                                                     |
| ---------------------------- | ------------------------------------------------------------------------- |
| Unified login URL            | `https://homelink-finance.habibramadan888.workers.dev/unified-login.html` |
| Employee destination URL     | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`   |
| Owner destination URL        | `https://homelink-finance.habibramadan888.workers.dev/index.html`         |
| Staging Worker URL           | `https://homelink-finance-staging.habibramadan888.workers.dev`            |
| Current default Worker DB    | `homelink`; write-style tests can affect production data                  |
| Production URL command used? | No                                                                        |
| Test data source             | QA-marked data only; no production writes without approval                |
| Account delivery             | Secure channel outside repository                                         |
| Passwords stored here?       | No                                                                        |
| Production cutover status    | `PRODUCTION_NO_GO`                                                        |

## Account Slots

| Slot      | Role                            | Purpose                              | Credential Source | Notes                                         |
| --------- | ------------------------------- | ------------------------------------ | ----------------- | --------------------------------------------- |
| QA-EMP-01 | employee                        | Rent/deposit/arrears/handover entry  | Secure channel    | Must be scoped to QA property.                |
| QA-OWN-01 | owner                           | Dashboard/history/report review      | Secure channel    | Must be scoped to QA tenant/property.         |
| QA-MGR-01 | manager/admin if available      | Permission and boundary testing      | Secure channel    | Optional; use only if staging account exists. |
| QA-NEG-01 | employee or owner negative case | Cross-property / cross-tenant denial | Secure channel    | Must not expose production data.              |

## In-Scope Areas

| Area                        | Included? | Notes                                                              |
| --------------------------- | --------- | ------------------------------------------------------------------ |
| Employee entry              | Yes       | Start at unified login; write tests need separate target approval. |
| Owner dashboard/history     | Yes       | Start at unified login; write tests need separate target approval. |
| Handover                    | Yes       | Include duplicate and weak-network checks.                         |
| Receivables / arrears       | Yes       | Validate business rules from Ramadan decisions.                    |
| Deposit ledger behavior     | Yes       | Deposit is not rent income by default.                             |
| Tenant/property access      | Yes       | Include negative cases.                                            |
| Production migration/deploy | No        | Explicitly out of scope.                                           |
| Production D1 write         | No        | Explicitly out of scope.                                           |
