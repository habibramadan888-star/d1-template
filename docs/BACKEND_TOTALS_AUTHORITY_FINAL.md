# Backend Totals Authority Final Definition

Generated: 2026-05-29
Scope: static definition and code audit. No D1 write, no migration, no deploy, no dashboard calculation change.

## Authority Rule

All totals that affect money, receivables, handover, or dashboard KPI display must be computed by backend code from persisted records. The frontend may format and display values, but must not become the source of truth.

## Current Evidence

| Area | Evidence | Status |
|---|---|---|
| Staging handover totals | `deploy-worker/src/index.js` has `hscComputeBackendTotals` and stores `backend_*_fils` into `handover_commits`. | Backend authority exists for staging handover. |
| Legacy dashboard/history | Worker still serves legacy `sessions`, `transactions`, `arrears`, and `arrear_tasks` through `corpid` queries. | Needs versioned total contract. |
| Audit support | `audit_logs`, `entry_events`, and `handover_audit_events` exist. | Current audit exists, but dashboard total computation event is not complete authority. |

## Required Backend Totals

| Total | Required Source | Required Exclusions | Unit |
|---|---|---|---|
| `totalCash` | Backend sum of accepted cash payments | voided/deleted/test rows | fils |
| `totalBank` | Backend sum of accepted bank payments | voided/deleted/test rows | fils |
| `totalCollected` | `totalCash + totalBank` | frontend submitted totals | fils |
| `totalOutstanding` | Backend receivables outstanding query | written-off, voided | fils |
| `totalOverdue` | Backend overdue receivables query | future due, written-off, voided | fils |
| `arrearsList` | Backend grouped receivables/arrears query | closed/paid/voided rows | fils |

## Required Response Contract

```json
{
  "totals": {
    "totalCashFils": 0,
    "totalBankFils": 0,
    "totalCollectedFils": 0,
    "totalOutstandingFils": 0,
    "totalOverdueFils": 0
  },
  "computation": {
    "version": "1.0",
    "computedAt": "ISO-8601 timestamp",
    "sourceTables": ["payments", "receivables"],
    "method": "backend_recompute_on_request"
  }
}
```

## Non-Compliance Items

- Legacy live-compatible dashboard data does not yet expose a uniform `computation.version`.
- Current live-compatible tables still include decimal money fields.
- Frontend math classification remains required before production sign-off.

## Decision

| Item | Result |
|---|---|
| Backend totals authority defined | Yes |
| Fully implemented across live dashboard | No |
| Frontend display-only proven | No |
| Production cutover | PRODUCTION_NO_GO |
