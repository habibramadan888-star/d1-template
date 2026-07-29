# Bed Transfer Owner Review Removal Result

Date: 2026-06-01

## Result

Bed Transfer is now modeled as a record-only event ledger path, not an owner approval workflow.

| Check | Result |
|---|---|
| Owner approve action exposed | No |
| Owner reject action exposed | No |
| Owner overview card wording | `Bed Transfer Records / 换床记录` |
| Legacy `pending_review` rows | Displayed as record-only legacy records |
| Occupancy mutation | No |
| Deposit mutation | No |
| Arrears mutation | No |
| TTLock mutation | No |
| Production cutover | `PRODUCTION_NO_GO` |

## Notes

Existing legacy `pending_review` rows are preserved for traceability and normalized to `recorded` in the owner-facing view. No forced production data migration of legacy rows is required for display.
