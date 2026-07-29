# IMPL-003: Tenant and Property Scope Isolation Implementation Guide

Status: ready for implementation.

Owner: Backend Lead.

Duration: 2 to 3 hours.

Risk: critical, data security.

## Objective

Ensure every relevant read and write path enforces tenant and property scope from authenticated server claims.

## Required Behavior

Owner:

- Can access own tenant.
- Cannot access other tenants.

Employee:

- Can access own tenant.
- Can access only assigned properties.

Readonly admin:

- Can read only within configured admin scope.
- Cannot write.

Frontend:

- Cannot supply authoritative tenant, property, or role.

## Implementation Checklist

- Centralize tenant/property access checks.
- Filter list queries by tenant ID.
- Filter employee queries by allowed property IDs.
- Deny missing tenant claims in production.
- Preserve legacy `corp_id` only as warning or compatibility evidence, not authority.
- Add tests for overlapping customer IDs and bed IDs across tenants.

## Endpoints to Review

- `GET /api/entries`
- `GET /api/history`
- `GET /api/payments`
- `GET /api/customers`
- `GET /api/arrears`
- `GET /api/receivables`
- `GET /api/dashboard/*`
- `GET /api/handovers`
- All write paths that accept property or tenant references.

## Tests to Write

- Employee allowed property returns rows.
- Employee denied property does not return rows.
- Owner own tenant returns rows.
- Owner other tenant denied.
- Readonly admin cannot write.
- Frontend tenant/property tamper ignored.
- Same customer ID in two tenants stays isolated.

## Definition of Done

- All list endpoints scoped.
- All write endpoints validate scope.
- Access matrix passes.
- No cross-tenant response evidence.
