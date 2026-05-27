# Internal QA Real Links Review

Date: 2026-05-27, Asia/Dubai

Scope: documentation-only link correction. This review used local project files,
routes, HTML assets, and wrangler config. It did not call production URLs, deploy,
migrate, execute D1 commands, or write any D1.

## Confirmed Employee Link

| Item                            | Result                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| Unified login link              | `https://homelink-finance.habibramadan888.workers.dev/unified-login.html`                 |
| Employee real link              | `https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`                   |
| Source of confirmation          | Ramadan-confirmed link plus local asset `deploy-worker/public/employee-v3.html`           |
| Old default to avoid            | `https://homelink-finance-staging.habibramadan888.workers.dev` as the employee entry link |
| Remote URL called by this task? | No                                                                                        |

## Owner / Boss Candidate Links

| Candidate Link                                                        | Local Evidence                                                               | Confirmed Exists Locally | Notes                                      |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------ | ------------------------------------------ |
| `https://homelink-finance.habibramadan888.workers.dev/`               | `deploy-worker/public/index.html` exists and Worker assets serve `./public`. | Yes                      | Best owner/main app entry candidate.       |
| `https://homelink-finance.habibramadan888.workers.dev/index.html`     | `deploy-worker/public/index.html` exists.                                    | Yes                      | Explicit asset path for the same main SPA. |
| `https://homelink-finance.habibramadan888.workers.dev/index-51.html`  | `deploy-worker/public/index-51.html` exists.                                 | Yes                      | Alternate/versioned main SPA asset.        |
| `https://homelink-finance.habibramadan888.workers.dev/owner.html`     | No `owner.html` found under `deploy-worker/public`.                          | No                       | Do not use unless a future route adds it.  |
| `https://homelink-finance.habibramadan888.workers.dev/boss.html`      | No `boss.html` found under `deploy-worker/public`.                           | No                       | Do not use unless a future route adds it.  |
| `https://homelink-finance.habibramadan888.workers.dev/dashboard.html` | No `dashboard.html` found under `deploy-worker/public`.                      | No                       | Do not use unless a future route adds it.  |

## Confirmed Owner Entry

The confirmed owner/boss entry from local files is the main SPA:

`https://homelink-finance.habibramadan888.workers.dev/`

The explicit equivalent asset is:

`https://homelink-finance.habibramadan888.workers.dev/index.html`

Reason: `deploy-worker/public/index.html` contains the Homelink main app, manager
role badge handling, history/dashboard sections, and loads `index-51-main.js`.
No separate owner, boss, or dashboard HTML file was found in the deployed public
asset directory.

## Worker Backend Environment / D1 Binding

| Config                                         | Worker / Env               | D1 Binding | Database Name              | Database ID                            | Notes                                                  |
| ---------------------------------------------- | -------------------------- | ---------- | -------------------------- | -------------------------------------- | ------------------------------------------------------ |
| `deploy-worker/wrangler.toml` default          | `homelink-finance`         | `DB`       | `homelink`                 | `562aa079-1cca-4176-ba3b-7276a65f98fb` | This is the Worker used by the confirmed employee URL. |
| `deploy-worker/wrangler.toml` staging env      | `homelink-finance-staging` | `DB`       | `homelink-finance-staging` | `4ff78bfc-3855-436b-aefb-6b492145d79c` | Separate staging Worker/D1 binding.                    |
| `deploy-worker/wrangler.embedded.toml` default | `homelink-finance`         | `DB`       | `homelink`                 | `562aa079-1cca-4176-ba3b-7276a65f98fb` | Embedded Worker config also points at `homelink`.      |

## Write Risk And Suitability

| Question                                                                                  | Answer                                                                                                            |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Does this task write production data?                                                     | No.                                                                                                               |
| Would the confirmed employee URL write production data if testers submit write flows?     | Yes, based on local wrangler config, authenticated write APIs on `homelink-finance` can write to `DB = homelink`. |
| Is the confirmed employee link suitable for internal write QA under current restrictions? | No, not without a separate explicit production D1 write approval.                                                 |
| Is the confirmed employee link suitable for internal link/login/read-only smoke testing?  | Yes, if testers avoid write actions and do not expose secrets.                                                    |
| Is the owner/main app link suitable for internal write QA under current restrictions?     | No, not without separate production D1 write approval.                                                            |
| Production status                                                                         | `PRODUCTION_NO_GO`                                                                                                |

## Required QA Package Correction

Use the unified login link first:

`https://homelink-finance.habibramadan888.workers.dev/unified-login.html`

The Ramadan-confirmed employee destination remains:

`https://homelink-finance.habibramadan888.workers.dev/employee-v3.html`

The owner/boss destination remains:

`https://homelink-finance.habibramadan888.workers.dev/index.html`

Do not treat these links as approval for production D1 writes, production
migration, production deploy, dashboard authority switch, public beta, or
commercial launch.
