# Embedded Dry-Run Blocker Fix Result

## Files Changed

- `scripts/generate-embedded-worker-dry-run.mjs`

## Fix

The generator now uses a minimal fallback regex when the old exact marker string is not found. The regex is limited to the final static fallback block:

- `if (env.ASSETS) { return env.ASSETS.fetch(request); }`
- `return new Response("Homelink Finance API is running...")`

It injects only:

- `const embeddedResponse = embeddedAssetResponse(path);`
- `if (embeddedResponse) return embeddedResponse;`

## Why This Is Minimal

- It changes only the build-time embedded dry-run generator.
- It does not alter `deploy-worker/src/index.js`.
- It does not alter route behavior, auth behavior, business logic, dashboard calculation, financial formulas, arrears logic, receivables logic, handover logic, or tenant scope logic.
- It avoids controlled-writing `deploy-worker/src/index.embedded.js`, which would have embedded unrelated dirty static assets from the working tree.

## Runtime Impact

| Check                          | Result |
| ------------------------------ | ------ |
| Runtime route behavior changed | no     |
| D1 affected                    | no     |
| Business logic affected        | no     |
| Dashboard calculation affected | no     |
| Financial formula affected     | no     |
| Arrears management deleted     | no     |
| Fourth arrears portal restored | no     |

## Result

`npm run build:embedded:dry-run` now completes and reports:

```text
EMBEDDED_WORKER_DRY_RUN_RESULT=PASS
EMBEDDED_WORKER_CURRENT_MISSING=0
EMBEDDED_WORKER_GENERATED_MISSING=0
```

Production cutover remains `PRODUCTION_NO_GO`.
