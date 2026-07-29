# P0-006Q2 Staging Evidence Rows Plan

Date: 2026-05-26, Asia/Dubai

Target D1: `homelink-finance-staging`

QA run id: `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26`

Source marker: `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE`

| Table          | Event Type                                                            | Scope Fields                                                                                                          | qa_run_id                                               | Expected Purpose                                                         | Risk                   |
| -------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------- |
| `audit_logs`   | `owner_created_audit_event` via `owner.created.audit.scope_evidence`  | `company_id=company_a`, `property_id=property_a_1`, `owner_id=owner_a`, `corpid=homelink`                             | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Prove owner-scoped audit row exists.                                     | Low, QA evidence only. |
| `audit_logs`   | `employee_created_audit_event` via `employee.entry.qa_scope_evidence` | `company_id=company_a`, `property_id=property_a_1`, `employee_id=employee_a_1`, `corpid=homelink`                     | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Prove employee-created audit row retains tenant/property/employee scope. | Low, QA evidence only. |
| `audit_logs`   | `void_session_audit_event` via `session.void`                         | `company_id=company_a`, `property_id=property_a_1`, `owner_id=owner_a`, `employee_id=employee_a_1`, `corpid=homelink` | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Close scoped void/delete_session audit evidence gap.                     | Low, QA evidence only. |
| `audit_logs`   | `cross_tenant_visibility_negative_case`                               | `company_id=company_b`, `property_id=property_b_1`, `owner_id=owner_b`, `corpid=homelink`                             | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Provide row that should filter out for company_a claims.                 | Low, QA evidence only. |
| `audit_logs`   | `cross_property_visibility_negative_case`                             | `company_id=company_a`, `property_id=property_a_2`, `employee_id=employee_a_2`, `corpid=homelink`                     | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Provide row that should filter out for property_a_1-only claims.         | Low, QA evidence only. |
| `entry_events` | `employee_entry_event` via `employee_entry_adapter_prevalidation`     | `company_id=company_a`, `property_id=property_a_1`, `employee_id=employee_a_1`, `corpid=homelink`                     | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Prove employee entry event scope evidence.                               | Low, QA evidence only. |
| `entry_events` | `handover_event` via `handover_commit_accepted`                       | `company_id=company_a`, `property_id=property_a_1`, `employee_id=employee_a_1`, `corpid=homelink`                     | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Prove handover event scope evidence.                                     | Low, QA evidence only. |
| `entry_events` | `void_event` via `session_void`                                       | `company_id=company_a`, `property_id=property_a_1`, `employee_id=employee_a_1`, `corpid=homelink`                     | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Close scoped session void entry event evidence gap.                      | Low, QA evidence only. |
| `entry_events` | `tenant_scoped_event`                                                 | `company_id=company_a`, `property_id=property_a_1`, `employee_id=employee_a_1`, `corpid=homelink`                     | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Prove tenant-scoped event can be filtered by claim.                      | Low, QA evidence only. |
| `entry_events` | `property_scoped_event`                                               | `company_id=company_a`, `property_id=property_a_2`, `employee_id=employee_a_2`, `corpid=homelink`                     | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Prove property-scoped event can be filtered by claim.                    | Low, QA evidence only. |
| `entry_events` | `employee_scoped_event`                                               | `company_id=company_a`, `property_id=property_a_1`, `employee_id=employee_a_1`, `corpid=homelink`                     | `P0-006Q2_TENANT_SCOPE_AUDIT_EVENT_EVIDENCE_2026-05-26` | Prove employee-scoped event visibility.                                  | Low, QA evidence only. |

Constraints:

- Rows are QA evidence only and carry deterministic IDs plus `qa_run_id`.
- Rows do not contain secrets, passwords, tokens, cookies, or production data.
- Rows do not write `sessions`, `transactions`, `deposit_ledger`, `arrears`, dashboard, or financial formula data.
- Production D1 remains untouched.
