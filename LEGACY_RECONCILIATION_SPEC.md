# Legacy Reconciliation Spec

Date: 2026-05-23  
Status: design only  
Database read: no  
Backfill executed: no

## Purpose

This spec defines the output format for a future legacy backfill dry-run. The dry-run must prove that old data can be mapped into the commercial schema without losing money, deposit liabilities, receivable state, tenant scope, or audit history.

This document is not a backfill script and does not authorize production migration.

## Required Inputs

A future reconciliation run must declare:

- source database label,
- source database backup timestamp,
- source environment: local copy, staging, or production backup,
- company seed mapping,
- property seed mapping,
- timezone,
- currency,
- script version,
- git commit hash,
- run timestamp.

## Required Output Files

The dry-run must produce:

- `legacy-reconciliation-report.json`
- `legacy-reconciliation-report.md`
- `legacy-reconciliation-exceptions.csv`

No production data should be committed to Git. Only sanitized sample reports may be committed.

## JSON Report Schema

Top-level shape:

```json
{
  "run": {
    "mode": "dry-run",
    "source": "local-copy",
    "source_backup_at": "ISO timestamp",
    "git_commit": "short hash",
    "started_at": "ISO timestamp",
    "finished_at": "ISO timestamp"
  },
  "scope": {
    "legacy_corpid": "homelink",
    "company_id": "company_default",
    "property_id": "property_default",
    "timezone": "Asia/Dubai",
    "currency": "AED"
  },
  "source_counts": {},
  "target_counts": {},
  "money_totals_fils": {},
  "reconciliation": {},
  "exceptions": [],
  "no_go": []
}
```

## Count Requirements

`source_counts` must include:

- `sessions`
- `transactions`
- `arrears`
- `arrear_tasks`
- `deposit_ledger`
- `entry_events`
- `audit_logs`
- `employee_users`
- `app_settings`

`target_counts` must include:

- `companies`
- `properties`
- `users`
- `property_memberships`
- `beds`
- `bed_rent_config_versions`
- `handover_sessions`
- `transactions`
- `receivables`
- `payments`
- `arrear_tasks`
- `deposit_ledger`
- `audit_events`

## Money Total Requirements

All money totals must be integer AED fils.

Required categories:

- `legacy_transaction_amount_fils`
- `legacy_transaction_due_fils`
- `legacy_transaction_paid_fils`
- `legacy_transaction_deficit_fils`
- `legacy_session_cash_handover_fils`
- `legacy_session_bank_transfer_fils`
- `legacy_session_gross_received_fils`
- `legacy_arrear_remaining_fils`
- `legacy_deposit_delta_fils`
- `target_payment_amount_fils`
- `target_receivable_due_fils`
- `target_receivable_paid_fils`
- `target_receivable_remaining_fils`
- `target_deposit_delta_fils`
- `target_handover_cash_fils`
- `target_handover_bank_fils`
- `target_handover_gross_fils`

## Reconciliation Sections

The report must include these sections:

- `session_totals`: compare legacy session totals with recomputed target handover totals.
- `transaction_totals`: compare source transaction money with target transaction/payment totals.
- `receivable_totals`: compare legacy deficits/arrears with target receivables.
- `deposit_balances`: compare legacy deposit ledger balance with target deposit ledger balance per tenant card.
- `audit_coverage`: compare legacy event/audit row counts with target audit event rows.
- `tenant_scope`: verify every generated target row has company and property scope.
- `idempotency`: verify rerunning the dry-run creates zero duplicate target ids.

## Exception Schema

Each exception must include:

```json
{
  "severity": "P0|P1|P2|P3",
  "code": "SHORT_CODE",
  "legacy_table": "transactions",
  "legacy_id": "row id",
  "target_table": "receivables",
  "target_id": "generated id or empty",
  "message": "human-readable issue",
  "amount_delta_fils": 0,
  "requires_manual_review": true
}
```

## P0 Exceptions

Any of these must block promotion:

- missing company/property mapping,
- unknown money column,
- amount conversion failure,
- session total mismatch without explanation,
- deposit balance mismatch,
- receivable without period anchors,
- target row without source trace,
- duplicate target id,
- missing audit trail for void/delete,
- employee-owned production credential migration.

## Acceptance Rules

The dry-run is acceptable only when:

- all P0 exceptions are zero,
- all P1 exceptions are reviewed,
- source and target money totals are equal or explained,
- deposit balances reconcile by tenant card,
- receivables reconcile by bed, tenant card, period, due, paid, remaining,
- every generated target row is idempotent,
- no production D1 mutation occurs,
- rollback/restore plan is documented.

## Explicit Non-Execution Statement

This spec does not read a database and does not perform backfill. The first implementation must default to dry-run and must refuse to run against remote D1 unless a separate production backup workflow exists.

## Local Read-Only Implementation

The first implementation is `scripts/reconcile-legacy-dry-run.mjs`.

Safety rules:

- It requires explicit `--persist-to <local D1 state directory>`.
- It rejects `--remote` and `--preview`.
- It only calls Wrangler with `--local`.
- It generates output under `reconciliation-output/` by default.
- `reconciliation-output/` is ignored by Git because reports may contain production-derived counts or identifiers.
- It does not execute `INSERT`, `UPDATE`, `DELETE`, `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, or backfill SQL.

Example:

```bash
npm run reconciliation:dry-run -- --persist-to <local-d1-copy> --company-id company_default --property-id property_default --legacy-corpid homelink
```

The command is still a dry-run. A non-empty report does not approve production migration.
