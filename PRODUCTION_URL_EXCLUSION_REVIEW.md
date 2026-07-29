# Production URL Exclusion Review

Generated: 2026-05-25, Asia/Dubai

Scope: read-only review of committed config, docs, and read-only Wrangler
discovery. No URL was guessed.

## URL Evidence

| Item                                   | Evidence                                                                                          | Status  | Notes                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------- |
| Candidate production-like API origin   | `.env.example` contains `CLOUD_API_ORIGIN="https://homelink-finance.habibramadan888.workers.dev"` | Found   | Example file only; still useful as production-like exclusion candidate. |
| Candidate production-like allowed host | `.env.example` contains `ALLOWED_HOST="homelink-finance.habibramadan888.workers.dev"`             | Found   | Example file only.                                                      |
| Local API origins                      | `.env.local.example` and `.dev.vars.example` contain `http://127.0.0.1:8793` / localhost origins  | Found   | Local only, not staging.                                                |
| Worker name                            | `homelink-finance`                                                                                | Found   | URL not shown by `wrangler deployments status/list`.                    |
| Pages project URL                      | `homelink-6km.pages.dev`                                                                          | Found   | Pages project, not confirmed Worker API staging URL.                    |
| Staging Worker URL                     | none                                                                                              | Missing | No committed config or read-only Wrangler output confirmed it.          |
| Custom domain                          | none confirmed                                                                                    | Missing | No route/custom domain was confirmed by read-only CLI output.           |

## Required Questions

| Question                                      | Answer                                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Is there an obvious production URL?           | A production-like workers.dev URL is present in `.env.example`, but final production target still needs human confirmation. |
| Is there an obvious staging URL?              | No.                                                                                                                         |
| Is staging URL different from production URL? | Cannot confirm.                                                                                                             |
| Is there a custom domain?                     | Cannot confirm.                                                                                                             |
| Is there only a workers.dev URL?              | A production-like workers.dev URL is documented; staging is unknown.                                                        |

## Conclusion

`MANUAL_REQUIRED`

Production URL exclusion cannot be confirmed until a human provides the real
staging Worker URL and confirms it is not the production URL/domain.
