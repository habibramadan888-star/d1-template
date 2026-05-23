# Homelink Finance

Homelink Finance is a Cloudflare Workers + D1 finance workflow for rental handover,
employee entry, owner review, arrears follow-up, TTLock context, and future WiFi control.

## Current Entrypoints

- Employee page: `employee-v3.html`
- Owner page: `index-51.html` and `index-51-main.js`
- Worker source: `deploy-worker/src/index.js`
- Embedded Worker: `deploy-worker/src/index.embedded.js`
- Worker configs:
  - `deploy-worker/wrangler.toml`
  - `deploy-worker/wrangler.embedded.toml`

## Governance Documents

Read these before making changes:

- `AI_CONTRACT.md`
- `ARCHITECTURE.md`
- `PROJECT_MAP.md`

## Local Setup

Install dependencies:

```bash
npm install
```

Create local Wrangler secrets:

```bash
cp .env.example deploy-worker/.dev.vars
```

Then replace every placeholder with local development values. Do not commit real secrets.

## Validation Commands

```bash
npm run governance:check
npm run lint
npm run typecheck
npm run build
npm run check
```

## Local Worker

Assets config:

```bash
cd deploy-worker
npx wrangler dev --config wrangler.toml --port 8791
```

Embedded config:

```bash
cd deploy-worker
npx wrangler dev --config wrangler.embedded.toml --port 8792
```

## Commercial Safety Notes

- Do not store money as floating point values in new schema work.
- Do not hard-delete financial records.
- Do not rely on frontend visibility for security.
- Do not hardcode production credentials or tenant identifiers.
- Do not deploy production from local validation unless explicitly requested.
