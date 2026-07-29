# Owner Page Component Boundary Lock

Date: 2026-05-30, Asia/Dubai

## Locked Boundaries

| Component         | Allowed Responsibility                        | Forbidden Regression                             |
| ----------------- | --------------------------------------------- | ------------------------------------------------ |
| Owner overview    | Business summary and alerts                   | `QUICK ACTIONS`, `快速进入`, duplicate nav cards |
| Owner arrears     | Arrears follow-up pool and directive workflow | Direct payment/write shortcuts in the main list  |
| Root portal       | Employee / owner / admin entry only           | Arrears management as a fourth login card        |
| Owner primary nav | Maximum five visible high-frequency modules   | Network tab wrapping to a second row             |

## Regression Tests

- `tests/owner-page-regression-lock.spec.mjs`
- `tests/owner-overview-no-quick-actions.spec.mjs`
- `tests/owner-nav-no-wrap-regression.spec.mjs`
