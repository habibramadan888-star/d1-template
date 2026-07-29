# P0-006Q Coverage Summary

Date: 2026-05-26, Asia/Dubai

Source: `TENANT_SCOPE_AUDIT_ENTRY_EVENTS_REHEARSAL_RESULT.md`

| Metric                      | Count | Notes                                                                                 |
| --------------------------- | ----: | ------------------------------------------------------------------------------------- |
| Total scenarios             |    21 | Audit/event schema, access, and staging count evidence.                               |
| PASS                        |    17 | Schema, deterministic access filtering, scoped employee entry, and handover evidence. |
| MANUAL_REQUIRED             |     0 | Manual rows were refined into concrete evidence-data gaps.                            |
| NEEDS_STAGING_EVIDENCE_DATA |     3 | Owner audit, audit void, entry event void.                                            |
| FAIL                        |     0 | No policy failure found.                                                              |
| LEGACY_WARNING              |     1 | Legacy CORPID fallback remains warning-only.                                          |
| Missing coverage count      |     2 | `audit_logs` and `entry_events` still need staging evidence rows.                     |

## Remaining Gaps

| Table          | Remaining Gap                                               | Needed Evidence                                                        |
| -------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| `audit_logs`   | Owner-created audit and scoped void audit rows are missing. | Staging-only owner/void audit evidence rows with `qa_run_id`.          |
| `entry_events` | Scoped void entry event row is missing.                     | Staging-only `session_void` entry event evidence row with `qa_run_id`. |

Production remains `NO-GO`; P0-006 remains Partial.
