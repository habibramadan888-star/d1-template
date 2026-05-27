# Internal QA Start Guide

Date: 2026-05-27, Asia/Dubai

Scope: corrected link guide for internal QA. This file does not approve
production deploy, staging deploy, production migration, D1 export/import/execute,
D1 write, feature flags, dashboard authority switch, public beta, or commercial
launch.

## Correct Links

| Role                 | Link                                                                    | Status                                      | Notes                                                                 |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------- |
| Employee             | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html` | Confirmed by Ramadan and local asset exists | Do not use the staging Worker URL as the default employee entry link. |
| Owner / boss         | `https://homelink-finance.habibramadan888.workers.dev/`                 | Confirmed local main SPA asset exists       | Use for owner/manager dashboard/history review.                       |
| Owner explicit asset | `https://homelink-finance.habibramadan888.workers.dev/index.html`       | Confirmed local asset exists                | Equivalent explicit path for the main SPA.                            |
| Versioned main SPA   | `https://homelink-finance.habibramadan888.workers.dev/index-51.html`    | Confirmed local asset exists                | Candidate fallback only if the root/index route needs comparison.     |

## Before Testing

| Check                     | Requirement                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Production cutover status | Must remain `PRODUCTION_NO_GO`.                                                                                 |
| Credentials               | Receive through secure channel only; do not write passwords in docs.                                            |
| Evidence                  | Mask passwords, tokens, cookies, and sensitive customer data.                                                   |
| Write actions             | Do not run write-style QA against `homelink-finance` unless production D1 write approval is explicitly granted. |
| Bug reports               | Use `BUG_REPORT_TEMPLATE.md`.                                                                                   |

## Backend Binding Warning

Local `deploy-worker/wrangler.toml` config shows the default
`homelink-finance` Worker is bound to D1 database `homelink` with binding `DB`.
That means employee or owner write flows on the confirmed links can affect
production data. This guide is safe for link correction, navigation, login, and
read-only smoke planning only under current restrictions.

## Stop Immediately If

| Condition                                                                 | Action                                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------- |
| A tester is about to submit a production-affecting write without approval | Stop and request explicit production D1 write approval. |
| A tester sees another tenant/property data                                | Stop and open a P1 permission/data bug.                 |
| A screenshot exposes password, token, cookie, or secret                   | Stop, redact, and open a security bug.                  |
| Production cutover is marked GO by mistake                                | Stop and correct status to `PRODUCTION_NO_GO`.          |
