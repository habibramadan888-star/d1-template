# Owner Arrears Batch Display Export Deploy Approval Required

Default deployment decision: not deployed.

Deployment is intentionally held because this task explicitly requires no production deploy unless separately approved.

If deployment is later approved, run the established read-only/static validation chain first:

```bash
npm run build:embedded:dry-run
npm run verify:embedded-worker
npm run audit:worker-drift
```

Still prohibited unless separately authorized:
- D1 write
- migration
- D1 export/import/execute
- employee entry write
- handover submit
- void/delete
- settings change
- dashboard calculation change
- financial formula change
