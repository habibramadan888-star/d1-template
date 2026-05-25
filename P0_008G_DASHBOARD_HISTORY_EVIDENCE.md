# P0-008G Dashboard / History Evidence

Date: 2026-05-26, Asia/Dubai

Scope: staging/local authority switch rehearsal evidence. No live dashboard or
history API response was changed.

| Area                    | Before Flag            | During Rehearsal                | After Rollback         | Result | Notes                                                                          |
| ----------------------- | ---------------------- | ------------------------------- | ---------------------- | ------ | ------------------------------------------------------------------------------ |
| Dashboard live result   | Legacy / unchanged     | Guarded rehearsal only          | Legacy / unchanged     | PASS   | `dashboard live result` stayed `DASHBOARD_UNCHANGED_GUARD` and did not switch. |
| History result          | Legacy / unchanged     | No history authority switch     | Legacy / unchanged     | PASS   | History row authority remains out of live switch scope.                        |
| Rent received           | Legacy `2060.00`       | Receivables authority `2060.00` | Legacy `2060.00`       | PASS   | Candidate switched in rehearsal with zero delta.                               |
| Rent due                | Legacy `4750.00`       | Receivables authority `4750.00` | Legacy `4750.00`       | PASS   | Candidate switched in rehearsal with zero delta.                               |
| Arrears outstanding     | Legacy `2590.00`       | Receivables authority `2590.00` | Legacy `2590.00`       | PASS   | Candidate switched in rehearsal with zero delta.                               |
| Due today               | Legacy `1190.00`       | Receivables authority `1190.00` | Legacy `1190.00`       | PASS   | Candidate switched in rehearsal with zero delta.                               |
| Overdue amount          | Legacy `1400.00`       | Receivables authority `1400.00` | Legacy `1400.00`       | PASS   | Candidate switched in rehearsal with zero delta.                               |
| Arrears total           | Legacy `2590.00`       | Receivables authority `2590.00` | Legacy `2590.00`       | PASS   | Candidate switched in rehearsal with zero delta.                               |
| Adjustment credit/debit | Legacy comparison rows | Shadow-only accounting review   | Legacy comparison rows | PASS   | Expected difference rows were not switched.                                    |
| Deposit handling        | Evidence row           | Evidence-only                   | Evidence row           | PASS   | Not treated as rent receivable unless configured.                              |
| Voided payment impact   | Evidence row           | Evidence-only                   | Evidence row           | PASS   | Voided rows remain excluded from active outstanding.                           |

## Conclusion

P0-008G proves the staging/local authority switch mode can apply only the six
approved receivables candidates while leaving dashboard/history live output
unchanged and keeping accounting-review rows shadow-only.
