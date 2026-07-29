# Arrears WhatsApp Baseline Deploy Result

Generated: 2026-05-31 16:12:54 +04:00

## Deploy Command

Executed from clean detached worktree:

```powershell
cd C:\Users\Chinalink\Desktop\软件迭代\.tmp\whatsapp-baseline-deploy-307af7f\deploy-worker
npx wrangler deploy --config wrangler.toml
```

## Wrangler Result

```text
Uploaded homelink-finance (17.38 sec)
Deployed homelink-finance triggers (5.60 sec)
https://homelink-finance.habibramadan888.workers.dev
Current Version ID: 990e89ac-44b5-450a-8d6d-9aee03e88168
```

Wrangler uploaded 5 new or modified static assets:

```text
/employee-v2.html
/employee-v3.html
/index.html
/index-51-main.js
/index-51.html
```

## Deploy Scope

Allowed scope deployed:

- WhatsApp export final baseline
- Searchable identifier format
- Deduplicated export rows
- Clipboard/share fallback support

Forbidden scope not changed:

- D1 schema: No
- D1 write: No
- Migration: No
- Backend SOT rewrite: No
- Financial formula: No
- Dashboard calculation: No
- Business write flow: No

## Production Cutover

Production cutover status remains `PRODUCTION_NO_GO`.

