# Bed Transfer Staging Rollback Result

Date: 2026-06-01
Status: `PASS`

Rollback deleted the QA event row and QA audit row. No existing staging source row was modified.

| Rollback Check | Expected | Actual | Result |
|---|---|---|---|
| QA transfer event removed/restored | row count 0 | `qa_event_rows=0` | PASS |
| QA audit row removed | row count 0 | `qa_audit_rows=0` | PASS |
| from_bed occupant state restored | unchanged | source row for `STG-valid` still present | PASS |
| to_bed occupant state restored | unchanged | no target occupancy row was created | PASS |
| deposit relation restored | unchanged | no deposit update executed | PASS |
| arrears state restored | unchanged | no arrears update executed | PASS |
| TTLock trace state restored | unchanged | no TTLock/source row update executed | PASS |
| staging consistency | unchanged except schema migration retained | QA rows removed | PASS |

The staging schema migration was retained for future approved staging E2E work. Production was not touched.
