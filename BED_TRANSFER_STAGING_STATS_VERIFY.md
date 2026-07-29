# Bed Transfer Staging Statistics Verify

Date: 2026-06-01
Status: `PASS`

| Statistic Check | Expected | Actual | Result |
|---|---|---|---|
| bed_transfer_count | +1 during QA event window | one QA event existed before rollback | PASS |
| new_tenant_count | unchanged | no new tenant/occupancy insert executed | PASS |
| checkout_count | unchanged | no checkout insert/update executed | PASS |
| net occupancy | no false increase | source row remained; no target occupancy insert | PASS |
| from_bed_transfer_count | +1 during QA event window | `from_bed=STG-valid` | PASS |
| to_bed_transfer_count | +1 during QA event window | `to_bed=STG-transfer-to-20260601185154` | PASS |
| customer_transfer_count | +1 during QA event window | customer code preserved | PASS |
| employee_transfer_count | +1 during QA event window | `operator_employee=qa-bed-transfer-e2e` | PASS |
| transfer_with_arrears_count | fixture correct | `carry_over_arrears_fils=0` | PASS |
| transfer_with_ttlock_review_count | fixture correct | `new_ttlock_ref=review_required`, `status=pending_review` | PASS |

The QA event was rolled back after verification, so current QA event count is zero.
