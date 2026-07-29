# Owner Arrears Batch Export Deploy Result

Date: 2026-05-31

| Item | Result |
|---|---|
| deploy executed | yes |
| Worker | homelink-finance |
| Worker version id | `d09255c7-aa18-424b-a34f-7cb385cfea91` |
| URL | `https://homelink-finance.habibramadan888.workers.dev` |
| static assets uploaded | `/index.html`, `/index-51-main.js`, `/index-51.html`, `/employee-v3.html` |
| D1 write | no |
| migration | no |
| D1 export/import/execute | no |
| business write | no |
| production cutover | PRODUCTION_NO_GO |

Deployment command:

```bash
cd deploy-worker
npx wrangler deploy --config wrangler.toml
```

Wrangler output summary:

- Uploaded `homelink-finance`
- Current Version ID: `d09255c7-aa18-424b-a34f-7cb385cfea91`
- Warning: top-level environment was used because no `--env` was specified. This matches the requested default production Worker deploy.

Safety notes:

- No D1 command was run.
- No migration command was run.
- No employee entry write, handover, void/delete, or business write was run.
- Commercial launch remains `PRODUCTION_NO_GO`.
