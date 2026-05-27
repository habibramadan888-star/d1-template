# Unified Login Session Handoff Deploy Approval Required

Date: 2026-05-28

## Why Approval Is Required

The double-login fix changes live Worker-served static assets:

| Asset                                   | Change                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `deploy-worker/public/index-51-main.js` | Owner SPA startup now checks `/api/me` and reuses unified-login session.                               |
| `deploy-worker/public/employee-v3.html` | Employee page startup now checks `/api/me` and reuses unified-login session for staff/employee claims. |

Because these files are served by the live `homelink-finance` Worker, the fix requires a future approved Worker deploy before the live double-login behavior changes.

## Approval Not Included In This Task

This task does not approve or execute:

1. Production D1 write.
2. Production migration.
3. D1 export/import/execute.
4. Employee entry write.
5. Handover submit.
6. Void/delete.
7. Dashboard calculation change.
8. Financial formula change.
9. Feature flag cutover.
10. Commercial launch GO.

## Future Deploy Command Candidate

Only after explicit deploy approval:

`npx wrangler deploy --config wrangler.toml --env="" --keep-vars`

Working directory:

`deploy-worker`

## Required Future Smoke

After approved deploy, run read-only smoke only:

| Check                     | Expected                                                       |
| ------------------------- | -------------------------------------------------------------- |
| Unified login page        | HTTP 200 `text/html`                                           |
| Owner login handoff       | Owner lands in `index.html` without second password prompt     |
| Employee login handoff    | Employee lands in `employee-v3.html` without second PIN prompt |
| `/api/me` unauthenticated | HTTP 401                                                       |
| Production D1 write       | No                                                             |

Production cutover remains `PRODUCTION_NO_GO`.
