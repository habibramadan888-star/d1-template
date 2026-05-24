# Handover Atomic Test Plan

Generated: 2026-05-24, Asia/Dubai

Scope: P0-002A test design only. These tests are required before the future endpoint can become production behavior.

| Test ID | Scenario                      | Input                                                                      | Expected Result                                                                                     | Risk Covered                |
| ------- | ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------- |
| HAT-001 | First submit success          | Valid employee, valid property membership, valid rows, new idempotency key | `200 accepted`, backend totals returned, audit event written                                        | Happy path                  |
| HAT-002 | Duplicate retry after success | Same idempotency key and same canonical payload                            | `200 duplicate`, original result returned, no duplicate rows                                        | Weak network retry          |
| HAT-003 | Same key different payload    | Same idempotency key but changed row amount or count                       | `409 idempotency_conflict`, no new rows                                                             | Duplicate/tamper protection |
| HAT-004 | Halfway failure simulation    | Force one row write failure in test executor                               | Whole handover rejected or rolled back; no partial accepted session                                 | Atomicity                   |
| HAT-005 | Missing/invalid JWT           | No cookie or invalid token                                                 | `401`                                                                                               | Authentication              |
| HAT-006 | Employee wrong property       | Employee authenticated but not assigned to property                        | `403`                                                                                               | Authorization               |
| HAT-007 | Owner submit attempt          | Owner calls employee handover commit                                       | `403` or route not allowed for owner submit                                                         | Role boundary               |
| HAT-008 | Frontend totals tampered      | Client totals differ from row-derived totals                               | Backend recomputes and either rejects mismatch or stores mismatch audit; client total not authority | Accounting authority        |
| HAT-009 | Unsafe money                  | Three decimals, NaN, Infinity, negative without reason                     | Reject before write                                                                                 | Money precision             |
| HAT-010 | Void after commit             | Accepted session then `/api/delete_session`                                | Rows preserved and voided; active history hides session; audit visible                              | P0-004 compatibility        |
| HAT-011 | Arrears row included          | Short rent row with promise date/reason                                    | Receivable/arrear task created once and linked to session                                           | P0-008 compatibility        |
| HAT-012 | Export text generated         | Accepted commit returns export summary                                     | Export content matches backend accepted rows and totals                                             | Handover reconciliation     |

## Current Automated Guardrail

`tests/handover-atomic.design.spec.mjs` currently validates only the future request contract and idempotency key shape. It does not test a live Worker endpoint because P0-002A deliberately does not wire production behavior.
