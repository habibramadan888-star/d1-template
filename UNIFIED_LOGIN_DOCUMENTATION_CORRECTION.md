# Unified Login Documentation Correction

Date: 2026-05-28, Asia/Dubai

Production status: `PRODUCTION_NO_GO`.

## Correction Applied

Internal QA documentation now uses the single-entry model:

| Old Concept                         | Correct Concept                                |
| ----------------------------------- | ---------------------------------------------- |
| Owner login page                    | Owner business page: `index.html`              |
| Employee login page                 | Employee business page: `employee-v3.html`     |
| Separate employee/owner login links | Single unified login: `unified-login.html`     |
| Separate login per role             | Role-based redirect after server auth          |
| Frontend-selected role              | `/api/me` or server auth response is authority |

## Files Reviewed / Updated

| File                                       | Result                                                                      |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `INTERNAL_QA_START_GUIDE.md`               | Updated to state one primary login entry.                                   |
| `FULL_INTERNAL_QA_TEST_PLAN.md`            | Updated single-entry language.                                              |
| `INTERNAL_QA_REAL_LINKS_REVIEW.md`         | Updated fallback wording to destination behavior, not separate login pages. |
| `OWNER_EMPLOYEE_UI_VISUAL_QA_CHECKLIST.md` | Updated screenshot and manual checks for unified-login visual match.        |
| `EMPLOYEE_INTERNAL_TEST_SCRIPT.md`         | Updated to treat `employee-v3.html` as employee business destination.       |
| `OWNER_INTERNAL_TEST_SCRIPT.md`            | Updated to treat `index.html` as owner business destination.                |

## Boundary

This documentation correction does not approve production deploy, production
migration, D1 write, feature flags, dashboard authority switch, or commercial
launch.
