# Employee Entry Real Staging QA Plan

Generated: 2026-05-25T03:42:25+04:00

Scope: real staging QA plan for P0-001 employee entry adapter route rehearsal. This plan does not approve production cutover.

## Prerequisites

| Area         | Requirement                                                                              |
| ------------ | ---------------------------------------------------------------------------------------- |
| Target       | Reviewed staging Worker URL, not production                                              |
| Runtime      | `APP_ENV=staging`                                                                        |
| Feature flag | `ENABLE_EMPLOYEE_ENTRY_ADAPTER_LIVE_ROUTE=true` only for adapter scenarios               |
| Backup       | Staging D1 backup/export completed before any write scenario                             |
| Rollback     | Rollback procedure reviewed and executable                                               |
| Auth         | Staging employee and owner/admin accounts available through secure non-committed channel |
| Artifact     | Source/embedded entrypoint confirmed before test                                         |
| Safety       | No production deploy, no production migration, no remote production D1 operation         |

## Test Sequence

| Step | Scenario                      | Expected Result                                                        | Evidence                                          |
| ---: | ----------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
|    1 | Confirm target URL is staging | URL is not production and is human-approved                            | QA preflight output                               |
|    2 | Confirm `APP_ENV=staging`     | Staging runtime reports/behaves as non-production                      | Environment check                                 |
|    3 | Confirm flag off rollback     | `/api/employee/entry` remains legacy                                   | Response lacks adapter metadata                   |
|    4 | Enable staging feature flag   | Adapter path becomes available only in staging                         | Cloudflare variable evidence                      |
|    5 | Employee valid entry          | Adapter prevalidation succeeds and legacy write continues as designed  | Response, DB row evidence, audit event            |
|    6 | Invalid 3-decimal amount      | Request rejected before legacy write                                   | `422` structured error and no financial row write |
|    7 | Empty/invalid money           | Request rejected before legacy write                                   | Structured error and no write                     |
|    8 | Owner/admin submit            | Rejected in adapter mode                                               | `403` and no write                                |
|    9 | Rollback flag off             | Route returns legacy behavior                                          | Response lacks adapter metadata                   |
|   10 | Dashboard/history review      | Valid write changes history only as expected; no-write cases unchanged | Before/after snapshots                            |
|   11 | delete_session regression     | Void behavior still preserves rows                                     | Existing delete-session test/QA evidence          |
|   12 | handover staging regression   | Handover staging endpoint remains isolated                             | Staging endpoint QA evidence                      |
|   13 | Reconciliation review         | Gate remains no FAIL/BLOCKED; manual items tracked                     | `MONEY_RECONCILIATION_GATE_RESULT.md`             |

## Production Cutover Boundary

Passing this plan means the employee entry adapter is ready for further staging validation only. It does not mean:

- production migration is approved;
- production deployment is approved;
- P0-001 is Verified;
- legacy fields can be deleted;
- P0-006 tenant scope or P0-008 receivables dependencies are resolved.
