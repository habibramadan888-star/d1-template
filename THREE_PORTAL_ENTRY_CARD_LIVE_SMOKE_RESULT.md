# Three Portal Entry Card Live Smoke Result

## Status

Read-only live observation performed. Deploy was not executed because `npm run build:embedded:dry-run` failed.

## Smoke Checklist

| Check                                              | Result                     |
| -------------------------------------------------- | -------------------------- |
| GET `/` displays three doors                       | fail on current live asset |
| Main portal hides arrears management entry card    | fail on current live asset |
| Employee entry remains visible                     | pass                       |
| Owner entry remains visible                        | pass                       |
| Admin entry remains visible                        | pass                       |
| Owner arrears module remains available after login | static verified            |
| Employee arrears follow-up remains in employee app | static verified            |
| Readonly admin arrears view remains read-only      | static verified            |
| Business write performed                           | no                         |
| D1 write performed                                 | no                         |

## Live Read-Only GET Evidence

Target: `https://homelink-finance.habibramadan888.workers.dev/`

| Field                      | Value |
| -------------------------- | ----- |
| HTTP status                | 200   |
| Employee text present      | true  |
| Owner text present         | true  |
| Admin text present         | true  |
| Arrears entry text present | true  |
| `data-portal` count        | 4     |

The local portal source is corrected, but production still serves the old four-card entry until a deploy can safely run.

## Production Cutover

Production cutover remains `PRODUCTION_NO_GO`.
