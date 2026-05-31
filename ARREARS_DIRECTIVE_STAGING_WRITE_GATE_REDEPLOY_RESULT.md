# Arrears Directive Staging Write Gate Redeploy Result

Date: 2026-05-31

## Result

`PASS`

The current Worker code containing durable idempotency handling was deployed to staging only.

## Staging Deploy

Command:

```powershell
cd C:\Users\Chinalink\Desktop\软件迭代\deploy-worker
npx wrangler deploy --env staging --config wrangler.toml
```

Observed staging Worker version:

`131a00f5-0813-4abf-bc82-72ea2c3433e2`

## Staging Write Gate

The staging-only write gate secret was enabled for controlled QA:

```powershell
"true" | npx wrangler secret put ARREARS_DIRECTIVE_WRITE_APPROVED --env staging --config wrangler.toml
```

The gate was removed after QA:

```powershell
"y" | npx wrangler secret delete ARREARS_DIRECTIVE_WRITE_APPROVED --env staging --config wrangler.toml
```

Observed result: `Success! Deleted secret ARREARS_DIRECTIVE_WRITE_APPROVED`.

## Allowed QA Scope

- Max 2 staging owner directive writes
- Max 2 staging employee follow-up writes
- QA idempotency replay checks
- QA rollback verification

## Production Boundary

| Check | Result |
|---|---|
| Production deploy | No |
| Production D1 write | No |
| Production migration | No |
| Business production write | No |
| Production cutover | `PRODUCTION_NO_GO` |
