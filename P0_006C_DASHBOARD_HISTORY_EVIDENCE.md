# P0-006C Dashboard / History Evidence

Date: 2026-05-26, Asia/Dubai

Scope: local/staging fixture-based dashboard/history scope rehearsal. No live
dashboard or history API response was changed.

| Area                           | Rehearsal Input                            | Expected Behavior                       | Result | Notes                                                               |
| ------------------------------ | ------------------------------------------ | --------------------------------------- | ------ | ------------------------------------------------------------------- |
| Owner A dashboard own property | `company_a/property_a_1`                   | Allowed; only own property rows visible | PASS   | `session_a_1` visible, no Company B rows leaked.                    |
| Owner A dashboard Company B    | `company_b/property_b_1`                   | Denied                                  | PASS   | Shared legacy `corpid=homelink` does not grant access.              |
| Owner A history aggregation    | Company A memberships                      | Company A rows only                     | PASS   | `session_a_1` and `transaction_a_2` visible; `arrear_b_1` excluded. |
| Employee A owner dashboard     | `company_a/property_a_1`                   | Denied                                  | PASS   | Employee role cannot access owner dashboard action.                 |
| Same bed/CID isolation         | Bed `101`, CID `CID-SHARED` in A and B     | Company/property scope wins             | PASS   | Legacy bed/CID collision did not leak B row.                        |
| Dashboard mutation             | Fixture rows before/after helper execution | No mutation                             | PASS   | Tests compare fixture rows before and after filtering.              |
| History mutation               | Fixture rows before/after helper execution | No mutation                             | PASS   | Rehearsal helper is pure and local-only.                            |

## Conclusion

P0-006C provides local/staging evidence that dashboard/history scope must be
driven by company/property membership rather than deployment-wide `CORPID`,
bed, or tenant CID. It does not switch live dashboard/history behavior.
