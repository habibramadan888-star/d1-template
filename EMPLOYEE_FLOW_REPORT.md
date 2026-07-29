# Employee Flow Report

Date: 2026-05-23  
Environment: local Worker on `http://127.0.0.1:8793`  
Production mutation: none

## Checks Performed

| Check                            | Result        | Notes                                                        |
| -------------------------------- | ------------- | ------------------------------------------------------------ |
| Employee page opens              | PASS          | `GET /employee-v3.html` returned 200                         |
| Browser title                    | PASS          | `Homelink 鍛樺伐绔?v3`                                       |
| Login overlay visible on refresh | PASS          | Browser check showed login overlay visible                   |
| Unauthenticated API protected    | PASS          | `/api/me` returned 401                                       |
| Employee login                   | PASS          | local non-production `.dev.vars`; `/auth/employee-login` 200 |
| Employee `/api/me`               | PASS          | returned staff role                                          |
| Employee denied owner history    | PASS          | `/api/history` returned 403 for employee session             |
| Entry flow after login           | FAIL          | `/api/employee/entry` returned 500 on clean local bootstrap  |
| Arrear follow-up after login     | NOT RUN       | next authenticated workflow test                             |
| Export after login               | NOT RUN       | next authenticated workflow test                             |
| Mobile layout                    | NOT RUN in V2 | requires follow-up visual pass                               |

## Observed Employee Page Text

The page rendered:

- employee login
- staff sign in
- entry/follow-up/export tabs
- current session summary
- handover core metrics

## Authenticated Smoke Result

```text
PASS employee login 200
PASS employee /api/me 200
PASS employee role staff
PASS employee denied owner history 403
```

## Risks

### P0

- Employee entry fails on clean local D1 because `transactions` is missing.
- Existing employee login seed/default account behavior must be reviewed before production.
- Entry, arrear update, and export flows still need authenticated E2E validation.

### P1

- Employee handover still needs full repeat-click and weak-network validation.
- Employee export must be validated against backend-accepted records, not local draft assumptions.
- Local draft recovery and partial upload states need regression tests.

## Safe Next Employee Tests

1. Design and test clean migration that creates `transactions`.
2. Re-run `npm run smoke:employee-entry`.
3. Load rent config with employee session.
4. Load TTLock cards with test/mocked integration or controlled failure.
5. Create local draft entry.
6. Submit full handover.
7. Validate session, transaction, arrear task, deposit ledger, and audit rows.
8. Repeat submit and confirm idempotency.

## Extended Authenticated Smoke Result

```text
PASS employee allowed rent config 200
```
