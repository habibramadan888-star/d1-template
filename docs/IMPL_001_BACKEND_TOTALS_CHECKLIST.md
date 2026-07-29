# IMPL-001 Backend Totals Authority Implementation Checklist

Generated: 2026-05-29
Scope: implementation handoff. No code change, no deploy, no D1 write.

## Current Code Evidence

| Area | Evidence | Status |
|---|---|---|
| Backend totals helpers | `deploy-worker/src/index.js` has staging handover total functions using `*_Fils` and `BigInt` style totals. | Reusable pattern exists. |
| Tests | `tests/backend-totals*.spec.mjs` cover backend authority, frontend tamper detection, and production switch gates. | Strong test base exists. |
| Live response contract | No dedicated `/api/dashboard/totals` contract with `computation.version` was proven in this pass. | Implementation gap. |
| Production switch | Existing tests keep production switch disabled/no-go. | Correct. |

## Required Endpoint

`GET /api/dashboard/totals`

Required response shape:

```json
{
  "data": {
    "totalCashFils": 0,
    "totalBankFils": 0,
    "totalCollectedFils": 0,
    "totalOverdueFils": 0,
    "pendingChargeoffFils": 0
  },
  "computation": {
    "version": "1.0",
    "computedAt": "ISO-8601",
    "durationMs": 0,
    "sourceTables": ["sessions", "transactions", "arrear_tasks"],
    "rowsChecked": {
      "sessions": 0,
      "transactions": 0,
      "arrears": 0
    }
  },
  "audit": {
    "computationId": "uuid",
    "userId": "server-user-id",
    "mode": "backend_recompute_on_request"
  }
}
```

## Implementation Steps

1. Add a read-only route for `/api/dashboard/totals`.
2. Require authenticated owner/manager/readonly_admin claim.
3. Recompute totals from backend persisted rows only.
4. Return integer fils only for monetary authority.
5. Add `computation.version = "1.0"` and timing metadata.
6. Log a safe computation audit event without sensitive values.
7. Keep production feature switch off until P0 sign-off.

## Tests To Add Or Extend

- Unit: all totals are computed in integer fils.
- Unit: frontend-submitted totals are ignored.
- Integration: readonly_admin can read totals.
- Permission: staff cannot read owner totals unless explicitly scoped.
- Performance: first-page totals query target under 200 ms on production-copy data.
- Gate: production remains `PRODUCTION_NO_GO`.

## Exit Criteria

| Item | Required |
|---|---|
| `/api/dashboard/totals` returns `computation.version` | Yes |
| Money units | Integer fils |
| Audit event | Safe computation audit only |
| Frontend authority | Display-only |
| Production state | PRODUCTION_NO_GO until signed off |
