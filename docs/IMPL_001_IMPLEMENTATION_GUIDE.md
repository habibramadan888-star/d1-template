# IMPL-001: Backend Totals Authority Implementation Guide

Status: ready for implementation.

Owner: Backend Lead.

Duration: 2 to 3 hours.

Risk: medium, calculation logic.

## Objective

Implement backend-owned dashboard totals with computation metadata and audit evidence. Frontend must display backend values and must not become accounting authority.

## Required Response Shape

```json
{
  "data": {
    "totalCash": 15050,
    "totalBank": 20025,
    "totalCollected": 35075,
    "totalOverdue": 5000,
    "pendingChargeoff": 2500
  },
  "computation": {
    "version": "1.0",
    "timestamp": "2026-05-30T09:00:00Z",
    "durationMs": 45,
    "rowsChecked": {
      "payments": 1250,
      "receivables": 3420
    }
  },
  "audit": {
    "computationId": "uuid",
    "userId": "owner-id",
    "sourceTables": ["payments", "receivables"]
  }
}
```

## Implementation Checklist

- Add computation version `1.0`.
- Measure `durationMs` around backend computation.
- Count rows checked from payment and receivable queries.
- Generate a computation ID.
- Record audit evidence for each computation.
- Keep all amounts in integer fils.
- Preserve `PRODUCTION_NO_GO` until approval gates pass.

## Tests to Write

- Response contains `computation.version`.
- `durationMs` is a number and below target.
- `rowsChecked` includes payment and receivable counts.
- Audit log is created for computation.
- Totals are accurate for fixture rows.
- Frontend-submitted totals do not influence backend totals.

## Definition of Done

- Code compiles.
- Unit and integration tests pass.
- p95 is within performance baseline.
- Audit evidence exists.
- Code review approved.
- Staging validation complete.
