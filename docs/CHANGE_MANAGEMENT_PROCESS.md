# Change Management and Feature Flag Strategy

Date: 2026-05-29

Purpose: introduce major production-readiness changes safely through progressive exposure, test gates, and fast rollback.

Status: internal process only. No deploy, no D1 write, and no migration are authorized by this document.

## 1. Feature Flags

Required flags:

- `BACKEND_TOTALS_AUTHORITY_ENABLED`
- `RECEIVABLES_STATE_MACHINE_ENABLED`
- `TENANT_ISOLATION_ENABLED`
- `AUDIT_TRAIL_ENABLED`
- `HANDOVER_ATOMICITY_ENABLED`

Default behavior:

- `false`: old or shadow-only path.
- `true`: new candidate path in approved non-production environment.

Production rule:

- Production defaults to disabled until explicit business and engineering approval.
- Production must remain `PRODUCTION_NO_GO` until all release gates pass.

## 2. Phase Progression

### Phase 1: Isolated Development

Environment: internal branch and local/staging harness.

Allowed:

- Unit tests.
- Fixture tests.
- Local dry-run scripts.
- Documentation updates.

Not allowed:

- Production deploy.
- Production D1 writes.
- Production migration.

Exit gate:

- Code compiles.
- Unit tests pass.
- Feature flags exist and default off.

### Phase 2a: Readonly Staging

Environment: staging only.

Allowed:

- Readonly API testing.
- Backend totals shadow comparison.
- Tenant-scope read rehearsal.
- Audit coverage inspection.

Exit gate:

- Readonly tests pass.
- No data mutation occurs.
- Performance within baseline plus 20 percent.

### Phase 2b: Controlled Staging Writes

Environment: staging only.

Allowed:

- Approved write tests against staging D1.
- Handover idempotency tests.
- Receivable state transition tests.
- Audit trail mutation tests.

Exit gate:

- Write tests pass.
- Rollback path tested.
- Audit evidence complete.
- Finance test sample approved.

### Phase 2c: Failure Injection

Environment: staging or production-copy only.

Allowed:

- Network failure injection.
- Duplicate submission tests.
- Concurrent write tests.
- Feature flag rollback tests.

Exit gate:

- No partial transactions.
- Recovery time objective met.
- No unrecoverable state found.

### Phase 3: Production-Copy Dry-Run

Environment: production-copy only.

Allowed:

- Full release rehearsal.
- Feature flag progression.
- Backup and rollback rehearsal.
- Business sign-off evidence collection.

Exit gate:

- Dry-run pass.
- All sign-offs recorded.
- No critical findings open.

## 3. Change Request Template

Every implementation change must record:

```text
Change ID:
Owner:
Related blocker:
Feature flag:
Risk level:
Rollback method:
Tests required:
Evidence file:
Approval:
```

## 4. Rollback Triggers

Rollback immediately if:

- Error rate exceeds 1 percent for 5 minutes.
- p95 latency exceeds 5 seconds.
- Any money precision mismatch is found.
- Cross-tenant data appears in a response.
- Partial handover state exists.
- Audit log missing for a mutation.

## 5. Approval Rules

No phase promotion without:

- Engineering owner approval.
- QA evidence.
- Finance approval for money or receivables changes.
- DevOps approval for environment or rollback changes.
- Product approval for business behavior changes.
