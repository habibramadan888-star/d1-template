# Backend Totals Authority Rehearsal Result

Generated: 2026-05-24T23:49:28.046Z

Scope: P0-003B local-only rehearsal. No production D1, remote D1, production Worker deploy, live dashboard output, or employee handover production path was changed.

| Scenario                  |                                      Current Total |                                                       Backend Recomputed Total |   Delta | Status         | Notes                                                                   |
| ------------------------- | -------------------------------------------------: | -----------------------------------------------------------------------------: | ------: | -------------- | ----------------------------------------------------------------------- |
| match-session             |                   cash 620 / bank 770 / gross 1410 |     cash 620.00 / bank 770.00 / gross 1410.00 / session 1390.00 / arrears 0.00 |    0.00 | MATCH          | Session frontend totals compared to backend recompute.                  |
| tampered-session          |                    cash 999 / bank 200 / gross 840 |       cash 640.00 / bank 200.00 / gross 840.00 / session 840.00 / arrears 0.00 |  359.00 | MISMATCH       | Session frontend totals compared to backend recompute.                  |
| voided-session            |                    cash 1400 / bank 0 / gross 1400 |         cash 500.00 / bank 0.00 / gross 500.00 / session 500.00 / arrears 0.00 |  900.00 | MISMATCH       | Voided transaction excluded from active backend total.                  |
| dashboard-active          | No current backend authority endpoint in rehearsal | cash 2300.00 / bank 1940.00 / gross 4360.00 / session 4240.00 / arrears 200.00 |    0.00 | LEGACY_WARNING | 13 legacy/void warnings; 0 errors.                                      |
| synthetic-frontend-tamper |           cash 9999.99 / bank 0.00 / gross 9999.99 |       cash 640.00 / bank 200.00 / gross 840.00 / session 840.00 / arrears 0.00 | 9359.99 | MISMATCH       | Synthetic browser total is rejected as authority by discrepancy report. |

## Summary

- Local D1 persist directory: disposable temp directory.
- Source rows inserted: 11 transactions, 4 sessions, 2 arrear tasks.
- Backend totals module used: `modules/finance/backend-totals.mjs`.
- Frontend/session totals are comparison input only.
- Voided rows are excluded from active totals by default.
- P0-003 remains Partial because live Worker/dashboard responses were not switched.
