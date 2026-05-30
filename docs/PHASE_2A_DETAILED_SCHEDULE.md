# Phase 2A Detailed Feature Flag Schedule

Generated: 2026-05-30T07:55:06.680Z

Environment: local/staging validation only.

Production status: `PRODUCTION_NO_GO`.

## Flag Mapping

| Business Flag             | Current Repository Flag(s)                                                                                                                   | Notes                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Backend totals authority  | `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING`                                                                                                    | Staging switch candidate only; production disabled by tests.                                   |
| Receivables state machine | `ENABLE_RECEIVABLES_SHADOW_STAGING`, `ENABLE_RECEIVABLES_AUTHORITY_STAGING`                                                                  | Shadow mode first, authority switch rehearsal after approved candidates.                       |
| Tenant/property isolation | `ENABLE_TENANT_SCOPE_SHADOW_STAGING`, `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`, `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING` | Split across shadow, route enforcement, and query filtering.                                   |
| Audit trail               | `FF_AUDIT_TRAIL` plus current `audit_logs` / `entry_events` evidence                                                                         | Config flag exists; current automated evidence validates scoped audit rows and staging writes. |

## Preflight

- [ ] Verify all flags default to safe/off.
- [ ] Verify production remains disabled even if staging flags are true.
- [ ] Verify rollback/off behavior is part of every switch rehearsal.

## Day 1: Backend totals authority staging switch

**Flags:** `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING`

**Purpose:** Validate backend totals staging flag on/off behavior, approved candidate switching, rollback, and production disablement.

### Morning

- [ ] Confirm prior day rollback/off state is clean.
- [ ] Confirm target flags are disabled before starting.
- [ ] Review expected metrics: error rate, latency, audit/entry-event counts, and rollback behavior.

### Enablement Window

- [ ] Enable target flag(s) in staging/local-staging only.
- [ ] Run the listed automated validation files.
- [ ] Record before/during/after flag states.
- [ ] Confirm production mode remains disabled even if the flag is set.

### Validation Files

- `tests/backend-totals-authority.spec.mjs`
- `tests/backend-totals-shadow.spec.mjs`
- `tests/backend-totals-staging-switch-gate.spec.mjs`
- `tests/backend-totals-staging-switch-rehearsal.spec.mjs`

### Exit Criteria

- [ ] All listed validations pass.
- [ ] Rollback/off behavior is verified.
- [ ] No production deploy, remote D1 write, or production migration occurred.
- [ ] Results are attached to the Phase 2A evidence packet.

## Day 2: Receivables shadow and authority staging switches

**Flags:** `ENABLE_RECEIVABLES_SHADOW_STAGING`, `ENABLE_RECEIVABLES_AUTHORITY_STAGING`

**Purpose:** Validate receivables shadow mode, authority gate candidates, rollback/off behavior, and production disablement.

### Morning

- [ ] Confirm prior day rollback/off state is clean.
- [ ] Confirm target flags are disabled before starting.
- [ ] Review expected metrics: error rate, latency, audit/entry-event counts, and rollback behavior.

### Enablement Window

- [ ] Enable target flag(s) in staging/local-staging only.
- [ ] Run the listed automated validation files.
- [ ] Record before/during/after flag states.
- [ ] Confirm production mode remains disabled even if the flag is set.

### Validation Files

- `tests/finance-receivables.spec.mjs`
- `tests/receivables.spec.mjs`
- `tests/receivables-staging-shadow-gate.spec.mjs`
- `tests/receivables-staging-shadow-rehearsal.spec.mjs`
- `tests/receivables-staging-authority-switch-gate.spec.mjs`
- `tests/receivables-staging-authority-switch-rehearsal.spec.mjs`

### Exit Criteria

- [ ] All listed validations pass.
- [ ] Rollback/off behavior is verified.
- [ ] No production deploy, remote D1 write, or production migration occurred.
- [ ] Results are attached to the Phase 2A evidence packet.

## Day 3: Tenant/property isolation staging switches

**Flags:** `ENABLE_TENANT_SCOPE_SHADOW_STAGING`, `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`, `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING`

**Purpose:** Validate tenant shadow mode, route enforcement, dashboard/history query filtering, combined wiring, rollback/off behavior, and production disablement.

### Morning

- [ ] Confirm prior day rollback/off state is clean.
- [ ] Confirm target flags are disabled before starting.
- [ ] Review expected metrics: error rate, latency, audit/entry-event counts, and rollback behavior.

### Enablement Window

- [ ] Enable target flag(s) in staging/local-staging only.
- [ ] Run the listed automated validation files.
- [ ] Record before/during/after flag states.
- [ ] Confirm production mode remains disabled even if the flag is set.

### Validation Files

- `tests/tenant-scope-staging-shadow-gate.spec.mjs`
- `tests/tenant-scope-staging-route-enforcement-gate.spec.mjs`
- `tests/tenant-scope-staging-dashboard-history-query-gate.spec.mjs`
- `tests/tenant-scope-staging-wiring-gate.spec.mjs`
- `tests/tenant-scope-staging-wiring-rehearsal.spec.mjs`
- `tests/tenant-scope-staging-access-matrix-rehearsal.spec.mjs`

### Exit Criteria

- [ ] All listed validations pass.
- [ ] Rollback/off behavior is verified.
- [ ] No production deploy, remote D1 write, or production migration occurred.
- [ ] Results are attached to the Phase 2A evidence packet.

## Day 4: Audit trail evidence and scoped audit visibility

**Flags:** `FF_AUDIT_TRAIL`, `existing audit_logs / entry_events evidence`

**Purpose:** Validate audit trail configuration, scoped audit evidence, entry event coverage, and staging handover audit writes.

### Morning

- [ ] Confirm prior day rollback/off state is clean.
- [ ] Confirm target flags are disabled before starting.
- [ ] Review expected metrics: error rate, latency, audit/entry-event counts, and rollback behavior.

### Enablement Window

- [ ] Enable target flag(s) in staging/local-staging only.
- [ ] Run the listed automated validation files.
- [ ] Record before/during/after flag states.
- [ ] Confirm production mode remains disabled even if the flag is set.

### Validation Files

- `tests/tenant-scope-audit-entry-events.spec.mjs`
- `tests/tenant-scope-access-matrix.spec.mjs`
- `tests/handover-staging-endpoint.spec.mjs`
- `tests/employee-entry-route-switch-rehearsal.spec.mjs`

### Exit Criteria

- [ ] All listed validations pass.
- [ ] Rollback/off behavior is verified.
- [ ] No production deploy, remote D1 write, or production migration occurred.
- [ ] Results are attached to the Phase 2A evidence packet.

## Day 5: All staging flags integration and rollback rehearsal

**Flags:** `ENABLE_BACKEND_TOTALS_AUTHORITY_STAGING`, `ENABLE_RECEIVABLES_AUTHORITY_STAGING`, `ENABLE_TENANT_SCOPE_ROUTE_ENFORCEMENT_STAGING`, `ENABLE_TENANT_SCOPE_DASHBOARD_HISTORY_QUERY_STAGING`

**Purpose:** Validate combined flag behavior with representative staging gates, rollback/off mode, and no production mutation.

### Morning

- [ ] Confirm prior day rollback/off state is clean.
- [ ] Confirm target flags are disabled before starting.
- [ ] Review expected metrics: error rate, latency, audit/entry-event counts, and rollback behavior.

### Enablement Window

- [ ] Enable target flag(s) in staging/local-staging only.
- [ ] Run the listed automated validation files.
- [ ] Record before/during/after flag states.
- [ ] Confirm production mode remains disabled even if the flag is set.

### Validation Files

- `tests/backend-totals-staging-switch-rehearsal.spec.mjs`
- `tests/receivables-staging-authority-switch-rehearsal.spec.mjs`
- `tests/tenant-scope-staging-wiring-rehearsal.spec.mjs`
- `tests/handover-staging-endpoint.spec.mjs`

### Exit Criteria

- [ ] All listed validations pass.
- [ ] Rollback/off behavior is verified.
- [ ] No production deploy, remote D1 write, or production migration occurred.
- [ ] Results are attached to the Phase 2A evidence packet.
