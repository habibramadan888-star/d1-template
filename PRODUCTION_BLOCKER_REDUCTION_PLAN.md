# Production Blocker Reduction Plan

Date: 2026-05-27, Asia/Dubai

Scope: reduce evidence gaps and decision ambiguity only. This plan does not
approve production write, production migration, production deploy, feature
flags, dashboard switch, or cutover.

| Blocker | Current Status                                | Reduction Method                                      | Can Be Reduced By Preflight | Requires Ramadan Decision | Next Prompt                         |
| ------- | --------------------------------------------- | ----------------------------------------------------- | --------------------------- | ------------------------- | ----------------------------------- |
| SO-001  | MANUAL_REQUIRED                               | Prepare fresh read-only target confirmation checklist | Partially                   | Yes                       | REVIEW-021 production target packet |
| SO-002  | MANUAL_REQUIRED                               | Prepare backup path, integrity, and storage review    | Partially                   | Yes                       | REVIEW-021 backup approval packet   |
| SO-003  | MANUAL_REQUIRED                               | Map copy rollback evidence to production rollback     | Partially                   | Yes                       | REVIEW-021 rollback approval packet |
| SO-004  | MANUAL_REQUIRED                               | Assemble final SQL and target guard packet            | Yes                         | Yes                       | REVIEW-022 copy dry-run refresh     |
| SO-005  | MANUAL_REQUIRED                               | Refresh row-level copy backfill counts and deltas     | Yes                         | Yes                       | REVIEW-022 copy dry-run refresh     |
| SO-006  | PENDING_REVIEW + preflight-only approval note | Refresh reconciliation evidence and accounting deltas | Yes                         | Yes                       | REVIEW-021 money decision packet    |
| SO-007  | PENDING_REVIEW                                | Apply remaining TOP_25 Ramadan decisions              | Partially                   | Yes                       | REVIEW-021 money risk closeout      |
| SO-008  | PENDING_REVIEW + preflight-only approval note | Compare final mapping against copy row-level evidence | Yes                         | Yes                       | REVIEW-021 tenant mapping closeout  |
| SO-009  | PENDING_REVIEW + preflight-only approval note | Confirm warning-only legacy `CORPID` fallback limits  | Partially                   | Yes                       | REVIEW-021 tenant policy closeout   |
| SO-010  | PENDING_REVIEW + preflight-only approval note | Refresh receivables copy reconciliation               | Yes                         | Yes                       | REVIEW-022 copy dry-run refresh     |
| SO-011  | PENDING_REVIEW + preflight-only approval note | Refresh allocation/deposit/void copy evidence         | Yes                         | Yes                       | REVIEW-022 copy dry-run refresh     |
| SO-012  | PENDING_REVIEW + preflight-only approval note | Refresh audit/event scope evidence                    | Yes                         | Yes                       | REVIEW-022 copy dry-run refresh     |
| SO-013  | PENDING_REVIEW + preflight-only approval note | Refresh backend totals comparison                     | Yes                         | Yes                       | REVIEW-022 copy dry-run refresh     |
| SO-014  | PENDING_REVIEW + preflight-only approval note | Confirm route cutover plan and rollback boundaries    | Partially                   | Yes                       | REVIEW-021 cutover criteria packet  |
| SO-015  | PENDING_REVIEW + preflight-only approval note | Confirm endpoint cutover plan and rollback boundaries | Partially                   | Yes                       | REVIEW-021 cutover criteria packet  |
| SO-016  | MANUAL_REQUIRED                               | Draft exact feature flag states and rollback values   | No                          | Yes                       | REVIEW-021 feature flag packet      |
| SO-017  | BLOCKED                                       | Keep blocked until upstream approvals close           | No                          | Yes                       | REVIEW-023 final preflight packet   |
| SO-018  | BLOCKED                                       | Keep blocked until deploy and rollback are approved   | No                          | Yes                       | REVIEW-023 final preflight packet   |
| SO-019  | MANUAL_REQUIRED                               | Prepare monitoring, alerting, and redaction checklist | Partially                   | Yes                       | REVIEW-021 monitoring packet        |
| SO-020  | MANUAL_REQUIRED                               | Assign rollback owner and trigger criteria            | Partially                   | Yes                       | REVIEW-021 rollback owner packet    |

## Reduction Rule

A blocker may be reduced from evidence-gap to decision-ready, but it must not be
closed for production unless Ramadan Habib gives a separate explicit production
approval for that signoff category.
