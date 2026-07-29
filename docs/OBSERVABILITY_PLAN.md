# Observability Plan

Date: 2026-05-29

Purpose: define logs, metrics, alerts, dashboards, and evidence required during internal testing.

## 1. Logging Requirements

Every critical request should include:

- Request ID.
- Authenticated user ID or anonymous marker.
- Role.
- Tenant ID.
- Property IDs or selected property ID.
- Endpoint.
- Method.
- Status code.
- Duration in milliseconds.
- Feature flag state.

Sensitive data must not be logged:

- Passwords.
- Session cookies.
- Tokens.
- Secrets.
- Full customer private notes.

## 2. Audit Logging Requirements

Every mutation must record:

- Operation type.
- Resource type.
- Resource ID.
- User ID.
- User role.
- Tenant ID.
- Property ID where applicable.
- Old value.
- New value.
- Changed fields.
- Timestamp.
- Status.
- Error message for failed attempts.

## 3. Metrics

Required application metrics:

- Request count by endpoint.
- Error count by endpoint and status.
- p50, p95, and p99 latency by endpoint.
- D1 query duration by query group.
- Handover commit duration.
- Receivable transition count by state.
- Audit log write success/failure count.
- Feature flag state by environment.

Required business safety metrics:

- Money reconciliation variance.
- Cross-tenant denied access count.
- Partial handover count.
- Idempotency replay count.
- Missing audit entry count.

## 4. Alerts

Critical alerts:

- Any money variance greater than 0 fils.
- Any cross-tenant leak evidence.
- Any partial handover detected.
- Any audit write failure on a mutation.
- API p95 latency greater than 5 seconds.
- Error rate greater than 1 percent for 5 minutes.

Warning alerts:

- p95 latency above baseline plus 20 percent.
- Idempotency replay spike.
- Tenant-scope denied count spike.
- D1 query duration above threshold.

## 5. Dashboards

Internal testing dashboard panels:

- Overall health.
- Endpoint latency.
- Endpoint errors.
- Feature flag state.
- Money reconciliation.
- Receivables state transitions.
- Handover atomicity.
- Tenant/property access denials.
- Audit trail completeness.

## 6. Evidence Capture

Each test run should save:

- Timestamp.
- Environment.
- Commit SHA.
- Feature flag states.
- Test command.
- Summary result.
- Links to logs or exported evidence.

## 7. Observability Go/No-Go

Go criteria:

- Required logs exist.
- Required metrics are visible.
- Critical alerts are configured.
- Dashboard can show current test state.

No-go criteria:

- Critical signals are missing.
- Audit logs contain secrets.
- Error rates or money variance cannot be measured.
