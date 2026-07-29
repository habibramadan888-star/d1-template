# Arrears Production Smoke Auth Execution Options

## Option A: Manual Browser Smoke

| Area | Detail |
|---|---|
| Operator | Ramadan |
| Auth handling | Ramadan uses existing browser login state |
| Codex access to cookie/token | none |
| Automation level | low |
| Production auth session write | depends on whether the browser is already logged in |
| Risk | lowest for secret exposure |
| Tradeoff | harder to automate and harder to collect structured evidence |

## Option B: Local Masked API Harness

| Area | Detail |
|---|---|
| Operator | Codex with local ignored env file |
| Auth handling | `.tmp/arrears-smoke-auth/production-auth.local.env` |
| Secret printing | forbidden; harness redacts cookie and never prints password/token |
| Cookie handling | in-memory cookie jar only |
| Automation level | high |
| Production auth session write | yes, if login endpoints are used |
| Risk | controlled, but requires explicit auth session write approval |

## Recommended Default

Recommended option: `Option B`, but only after Ramadan explicitly approves `AUTH_SESSION_WRITE_APPROVAL_REQUIRED`.

If Ramadan does not approve production auth session writes, use `Option A`.

