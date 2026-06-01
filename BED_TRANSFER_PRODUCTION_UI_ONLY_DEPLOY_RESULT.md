# Bed Transfer Production UI-Only Deploy Result

Date: 2026-06-01, Asia/Dubai

Scope: publish employee Bed Transfer UI/read-only controlled state to the default `homelink-finance` Worker.

## Deploy Command

```powershell
cd deploy-worker
npx wrangler deploy --config wrangler.toml
```

## Deploy Output Summary

| Item | Result |
|---|---|
| Worker | `homelink-finance` |
| URL | `https://homelink-finance.habibramadan888.workers.dev` |
| Worker version id | `5b17b7f2-0551-4cdb-a439-38fcc965b1cb` |
| Uploaded assets reported by Wrangler | `/employee-v3.html`, `/index-51-main.js` |
| Production Bed Transfer write | No |
| Production write gate | Off / not opened |
| Production migration | No |
| Production D1 execute for write | No |
| Production cutover | `PRODUCTION_NO_GO` |

## Deployed UI-Only Scope

- Employee Bed Transfer fields are available in the UI.
- Bed Transfer real save/export path is gated by `BED_TRANSFER_WRITE_ENABLED=false`.
- Save/export shows: `换床真实写入未启用，需要生产审批。 Bed transfer write is not enabled.`
- No occupancy mutation was deployed.
- No TTLock mutation was deployed.
- No financial formula or dashboard calculation change was deployed.

## Note

Wrangler reported `/index-51-main.js` as an uploaded static asset, but this task did not modify `deploy-worker/public/index-51-main.js`. The intentional code change for this task is `/employee-v3.html`.
