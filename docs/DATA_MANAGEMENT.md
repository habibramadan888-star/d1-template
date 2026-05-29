# Data Management Plan

Date: 2026-05-29

Purpose: define safe handling of test data, production-copy data, anonymization, backup, and restore.

## 1. Data Environments

Allowed environments:

- Local development.
- Local D1 emulator.
- Staging D1.
- Production-copy D1.

Restricted environment:

- Production D1.

Production D1 rules:

- No internal testing writes.
- No migrations.
- No destructive queries.
- Readonly review only when explicitly approved.

## 2. Test Data Requirements

Internal test data must include:

- Multiple tenants.
- Multiple properties.
- Employees with limited property scope.
- Owners with tenant scope.
- Readonly admins.
- Active and voided entries.
- Paid, partial, overdue, adjusted, and written-off receivables.
- Handover candidates.
- Audit-log fixtures.

## 3. Production-Copy Handling

Before using production-copy:

- Confirm source backup timestamp.
- Confirm destination is not production.
- Confirm credentials point to production-copy only.
- Record commit SHA and feature flag state.

Production-copy restrictions:

- No external user traffic.
- No real notifications.
- No WhatsApp send action.
- No production secrets.

## 4. Anonymization

Anonymize:

- Customer names.
- Phone numbers.
- Passport or ID numbers.
- Private notes.
- Staff personal details.

Preserve:

- Tenant/property relationships.
- Bed identifiers where needed for scope tests.
- Amounts for finance reconciliation where approved.
- Dates needed for overdue logic.

## 5. Backup and Restore

Required before staging write tests:

- Backup identifier.
- Backup timestamp.
- Restore command or runbook.
- RTO target.
- RPO target.

Restore validation:

- Table counts match expected baseline.
- Sample rows match.
- Feature flags reset to expected state.
- No partial test data remains.

## 6. Data Integrity Checks

Run after each write-test batch:

- Money totals match expected integer-fils totals.
- Receivable outstanding is never negative unless approved.
- Handover rows are complete or absent.
- Audit rows exist for mutations.
- Tenant and property IDs are populated where required.

## 7. Data Retention

Retain:

- Test evidence for release review.
- Audit trail samples.
- Performance measurements.

Delete or rotate:

- Temporary local secrets.
- Raw production-copy exports after review.
- Obsolete generated test data.
