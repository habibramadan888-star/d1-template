# Acceptance Bugfix Deploy Result

Date: 2026-05-31

## Deploy Command

Executed from clean detached worktree at commit `d9059db`:

```bash
npx wrangler deploy --env="" --config wrangler.toml
```

Wrangler first required OAuth refresh. After `npx wrangler login` completed successfully, the deploy command succeeded.

## Result

| Item | Result |
|---|---|
| deploy executed | yes |
| Worker | `homelink-finance` |
| URL | `https://homelink-finance.habibramadan888.workers.dev` |
| Worker version id | `73517bf9-df6e-47e1-a72f-9743264ee934` |
| Uploaded assets | `/portal.html`, `/index-51-main.js` |
| D1 write | no |
| migration | no |
| D1 export/import/execute | no |
| business write | no |
| real employee directive write | no |
| financial formula modified | no |
| dashboard calculation modified | no |
| production cutover | `PRODUCTION_NO_GO` |

## Deployed Scope

- Arrears select-all send button enablement from real selected checkbox state.
- Send-employee action remains dry-run only.
- WhatsApp live button uses final baseline builder path.
- Clipboard, WhatsApp URL, and fallback modal use the same generated text.
- Three portal card title/subtitle alignment.

## Explicitly Not Deployed

- D1 schema changes.
- Migration.
- Backend SOT rewrite.
- Financial formula changes.
- Dashboard calculation changes.
- Business write flow changes.
- Real employee task directive writes.
