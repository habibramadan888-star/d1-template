# Testing Strategy

Date: 2026-05-29

Purpose: define the internal testing pyramid, scenario coverage, and required evidence before production approval.

## 1. Test Pyramid

### Unit Tests

Use for:

- Money helpers.
- Date and Dubai business-day logic.
- Receivables transition validation.
- Tenant-scope authorization helpers.
- Idempotency key generation.

Expected output:

- Fast deterministic tests.
- No network.
- No production D1.

### Integration Tests

Use for:

- Worker handler behavior.
- Auth claim enforcement.
- API response schemas.
- Feature flag true/false behavior.
- Local/staging D1 harness only.

Expected output:

- Endpoint-level pass/fail evidence.
- Staging-only write evidence where approved.

### End-to-End Tests

Use for:

- Employee entry flow.
- Owner dashboard and history flow.
- Admin readonly flow.
- Handover flow.
- Arrears WhatsApp export flow.

Expected output:

- User-visible route and API behavior.
- Screenshots or logs where practical.

### Manual QA

Use for:

- Finance audit.
- Mobile real-device validation.
- Arabic/English/Chinese display sanity.
- Operational runbook rehearsal.

Expected output:

- Signed checklist.
- Evidence links.
- Bug IDs for failures.

## 2. Minimum Scenario Matrix

Money precision:

- AED to fils conversion.
- Fils to display formatting.
- Smallest unit: 0.01 AED.
- Large amount.
- Invalid decimal precision.
- Refund and negative adjustment.

Receivables:

- `CREATED` to `PENDING`.
- `PENDING` to `PARTIAL`.
- `PENDING` to `PAID`.
- `PARTIAL` to `PAID`.
- Invalid `PAID` transition.
- `VOIDED` restoration path.
- Approved adjustment.
- Write-off.

Tenant isolation:

- Employee allowed property.
- Employee denied property.
- Owner same tenant.
- Owner other tenant denied.
- Admin readonly same tenant.
- Frontend tenant ID tamper ignored.

Handover:

- Cash-only.
- Bank-only.
- Mixed cash and bank.
- Duplicate idempotency key.
- Different idempotency key duplicate risk.
- Network failure injection.
- Total mismatch rejection.

Audit trail:

- Successful create.
- Successful update.
- Successful void/delete.
- Failed mutation.
- Readonly admin denied mutation.

Performance:

- History first page.
- History pagination.
- Arrears modal data load.
- Dashboard totals.
- Handover commit.

## 3. Test Data Requirements

Required fixtures:

- Three tenants.
- At least two properties per tenant.
- Overlapping bed IDs across tenants.
- Overlapping customer identifiers across tenants.
- At least 100 representative transactions.
- At least 50 receivables across all states.
- At least 20 handover candidates.

## 4. Exit Criteria

Internal testing exits only when:

- All P0 scenario groups pass.
- No critical or high risk remains unmitigated.
- Performance baseline passes.
- Manual QA sign-off is recorded.
- Finance sign-off is recorded.
- Rollback rehearsal is complete.
