# Arrears Employee Inbox Status Copy Deploy Result

Date: 2026-05-31, Asia/Dubai

| Item | Result |
|---|---|
| deploy executed | yes |
| Worker | homelink-finance |
| Worker version id | 8307d5e9-c209-4789-8d1d-9664cbbd5fcc |
| URL | https://homelink-finance.habibramadan888.workers.dev |
| write gate | off |
| D1 business write | no |
| migration | no |
| production cutover | PRODUCTION_NO_GO |

## Deploy Output Tail

``text
  If your intention is to use the top-level environment of your configuration simply pass an empty string to the flag t
o target such environment. For example `--env=""`.


🌀 Building list of assets...
✨ Read 10 files from the assets directory C:\Users\Chinalink\Desktop\软件迭代\deploy-worker\public
🌀 Starting asset upload...
🌀 Found 1 new or modified static asset to upload. Proceeding with upload...
+ /employee-v3.html
Uploaded 1 of 1 asset
✨ Success! Uploaded 1 file (9 already uploaded) (2.43 sec)

Total Upload: 238.86 KiB / gzip: 50.43 KiB
Your Worker has access to the following bindings:
Binding                                                          Resource
env.RATE_LIMIT (c7c64d522d964baba2e72454e7262da9)                KV Namespace
env.DB (homelink)                                                D1 Database
env.ASSETS                                                       Assets
env.APP_NAME ("Homelink Finance")                                Environment Variable
env.APP_VERSION ("2.0.0")                                        Environment Variable
env.CORPID ("homelink")                                          Environment Variable
env.FF_BACKEND_TOTALS ("false")                                  Environment Variable
env.FF_RECEIVABLES_STATE ("false")                               Environment Variable
env.FF_TENANT_ISOLATION ("false")                                Environment Variable
env.FF_AUDIT_TRAIL ("false")                                     Environment Variable

Uploaded homelink-finance (16.82 sec)
Deployed homelink-finance triggers (5.53 sec)
  https://homelink-finance.habibramadan888.workers.dev
Current Version ID: 8307d5e9-c209-4789-8d1d-9664cbbd5fcc
``
