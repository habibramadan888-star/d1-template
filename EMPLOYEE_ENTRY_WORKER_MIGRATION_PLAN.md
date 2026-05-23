# Employee Entry Worker Migration Plan

Date: 2026-05-23  
Status: planning document, not executable code  
Production deployment: not executed  
Production database mutation: not executed

## Purpose

This plan defines the safe path for migrating the live `/api/employee/entry` Worker route from the legacy entry flow to the commercial accounting write path.

The goal is not to rewrite the Worker in one pass. The goal is to close the clean-bootstrap P0 while preserving auditability, integer money, multi-tenant boundaries, idempotency, and rollback options.

## Current Runtime Findings

The live `handleEmployeeEntry` route currently:

- calls `empEnsureSchema(env)`,
- queries `transactions` before a clean database creates it,
- stores money with JS `Number` and legacy decimal columns,
- writes `sessions` and `transactions` directly from request payloads,
- trusts some frontend-provided session totals,
- handles multiple event types in one large function,
- creates or updates arrear tasks from legacy transaction totals,
- is not yet connected to the commercial `transactions/receivables/payments/audit_events` write plan.

## Non-Negotiable Migration Rules

- Do not add another large branch inside `src/index.js` for commercial accounting.
- Do not create production tables inside request paths as the long-term solution.
- Do not store new commercial money values as `REAL`, `FLOAT`, or JS floating-point derived values.
- Do not let frontend totals become accounting source of truth.
- Do not bypass employee authentication or property membership checks.
- Do not delete legacy behavior until compatibility and backfill are reviewed.

## Target Route Behavior

For a rent entry request, the Worker must:

1. Authenticate the request server-side.
2. Resolve `company_id`, `property_id`, and `operator_id` from authenticated context.
3. Verify active property membership.
4. Verify or create a draft handover session using the commercial schema.
5. Generate or verify a scoped employee entry idempotency key.
6. On duplicate idempotency conflict, return the original committed result.
7. Resolve the bed and rent config server-side.
8. Parse TTLock remark server-side and reject staff/vacant/mismatched beds.
9. Build a rent entry draft using integer fils.
10. Build the commercial write plan.
11. Execute all write-plan operations as one atomic unit or fail without committed business rows.
12. Recompute handover totals server-side.
13. Return a staff-safe success/error response.

## Phased Implementation

### Phase 1: Compatibility Adapter

Create a new module outside the monolith:

```text
modules/worker/employee-entry-commercial-adapter.mjs
```

Responsibilities:

- translate the existing request payload into commercial input,
- call `createEmployeeEntryIdempotencyKey`,
- call `createRentEntryDraft`,
- call `createRentWritePlan`,
- return a database execution plan and response shape,
- contain no direct D1 calls.

Current status:

- module created,
- tests added,
- not wired into the Worker route.

### Phase 2: Local Commercial Executor

Create a small D1 executor module for the commercial write plan:

```text
modules/worker/d1-write-plan-executor.mjs
```

Responsibilities:

- execute allowed operation types only,
- reject unknown tables/actions,
- run inside one D1 batch or reviewed equivalent,
- handle transaction idempotency uniqueness conflicts,
- never expose raw SQLite errors to employees.

Current status:

- module created,
- tests added,
- not wired into the Worker route.

### Phase 3: Route Feature Gate

Add a server-side feature flag:

```text
EMPLOYEE_ENTRY_COMMERCIAL_V1
```

Rules:

- default off,
- local/staging only until gates pass,
- no production enablement without migration promotion checklist.

### Phase 4: Local Clean Bootstrap Gate

The route cannot be promoted until:

```bash
npm run probe:clean-bootstrap
```

passes against a clean disposable D1 with no ad hoc SQL patching.

### Phase 5: Legacy Compatibility

Legacy owner pages that still read old `transactions` rows must be explicitly handled before production cutover:

- either backfill/sync commercial rows to legacy-compatible views,
- or migrate owner reads to commercial tables,
- or keep old route as compatibility fallback for legacy tenants only.

## Required Tests Before Worker Change

- unauthenticated request is rejected,
- employee without property membership is rejected,
- staff/vacant TTLock remark is rejected,
- mismatched input bed and remark bed is rejected,
- missing rent config is rejected,
- partial payment without reason and promise date is rejected,
- duplicate idempotency request returns original committed result,
- duplicate idempotency request does not create extra transaction/receivable/payment rows,
- backend recomputes handover totals,
- clean bootstrap probe passes.

## Rollback Strategy

- Keep legacy route intact behind the current path until the feature flag is enabled.
- Keep commercial route off in production by default.
- If staging validation fails, disable `EMPLOYEE_ENTRY_COMMERCIAL_V1`.
- Do not run production D1 migration until rehearsal, backfill audit, and rollback checklist are complete.

## Current Blocker

`npm run probe:clean-bootstrap` still fails because the live Worker route references `transactions` before a clean D1 creates it.

This plan does not close the blocker by itself. It defines the safe implementation path to close it.
