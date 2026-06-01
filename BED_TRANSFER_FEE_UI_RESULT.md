# Bed Transfer Fee UI Result

Date: 2026-06-01

Employee Bed Transfer UI now exposes the required fee model:

| Requirement | Result |
|---|---|
| From Bed / original bed | Present |
| To Bed / target bed | Present |
| Transfer Date | Present |
| Fee Option | Present |
| Default charged path | `Charge 50 AED / 收取 50 AED` |
| Waived path | `Waive fee / 豁免费用` |
| Waiver reason | Dedicated `Waiver Reason / 豁免原因` field |
| Waiver validation | Blocks submit when waived and reason is blank |
| Step context fee summary | Shows `50.00 AED` or `Waived / 已豁免` |
| Accounting effect | Shows `Bed Transfer Fee income` or `No income` |
| Owner review wording | Not introduced |

The UI sends `fee_mode`, `amount_fils`, and `waiver_reason` to `/api/employee/bed-transfers`.
