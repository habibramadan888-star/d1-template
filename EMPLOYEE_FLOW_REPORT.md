# Employee Flow Report

Date: 2026-05-23  
Environment: local Worker on `http://127.0.0.1:8793`  
Production mutation: none

## Checks Performed

| Check                            | Result        | Notes                                                          |
| -------------------------------- | ------------- | -------------------------------------------------------------- |
| Employee page opens              | PASS          | `GET /employee-v3.html` returned 200                           |
| Browser title                    | PASS          | `Homelink 员工端 v3`                                           |
| Login overlay visible on refresh | PASS          | Browser check showed login overlay visible                     |
| Unauthenticated API protected    | PASS          | `/api/me` returned 401                                         |
| Employee login                   | FAIL          | local `JWT_SECRET` missing, `/auth/employee-login` returns 503 |
| Entry flow after login           | BLOCKED       | cannot safely test without local secrets                       |
| Arrear follow-up after login     | BLOCKED       | cannot safely test without local secrets                       |
| Export after login               | BLOCKED       | cannot safely test without local secrets                       |
| Mobile layout                    | NOT RUN in V2 | requires follow-up visual pass                                 |

## Observed Employee Page Text

The page rendered:

- employee login
- staff sign in
- entry/follow-up/export tabs
- current session summary
- handover core metrics

## Risks

### P0

- Authenticated employee workflows cannot be validated until local secrets are configured.
- Existing employee login seed/default account behavior must be reviewed before production.

### P1

- Employee handover still needs full repeat-click and weak-network validation.
- Employee export must be validated against backend-accepted records, not local draft assumptions.
- Local draft recovery and partial upload states need regression tests.

## Safe Next Employee Tests

After local `.dev.vars` is configured:

1. Login with local employee account.
2. Confirm employee cannot access owner APIs.
3. Load rent config.
4. Load TTLock cards with test/mocked integration or controlled failure.
5. Create local draft entry.
6. Submit full handover.
7. Validate session, transaction, arrear task, deposit ledger, and audit rows.
8. Repeat submit and confirm idempotency.
