# Unified Login Technical Notes Moved To QA Docs

Date: 2026-05-28, Asia/Dubai

The visible login page is now intentionally minimal. Technical details removed
from the user-facing card remain documented for internal testers and reviewers.

| Technical Note                                | QA Documentation Location                                                                                | Visible On Login Page |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | --------------------- |
| Current Worker binds `DB = homelink`          | `INTERNAL_QA_START_GUIDE.md`, `INTERNAL_QA_REAL_LINKS_REVIEW.md`, `FULL_INTERNAL_QA_TEST_PLAN.md`        | No                    |
| Write-style QA needs separate approval        | `INTERNAL_QA_START_GUIDE.md`, `FULL_INTERNAL_QA_TEST_PLAN.md`                                            | No                    |
| Production cutover remains `PRODUCTION_NO_GO` | `INTERNAL_QA_START_GUIDE.md`, `FULL_INTERNAL_QA_TEST_PLAN.md`, `VERIFICATION_STATUS.md`, `RUN_REPORT.md` | No                    |
| Role routing rules                            | `INTERNAL_QA_START_GUIDE.md`, `INTERNAL_QA_REAL_LINKS_REVIEW.md`                                         | No                    |
| `/api/me` is authority                        | `INTERNAL_QA_START_GUIDE.md`, `INTERNAL_QA_REAL_LINKS_REVIEW.md`, tests                                  | No                    |

QA acceptance rule: if a live screenshot of `unified-login.html` shows
production, D1, cutover, write-QA, or server-role routing text, visual QA fails.
