# P0 Arrears Frontend Adapter Result

## Result

The owner frontend arrears path now treats the backend SOT response as authoritative. `buildArrearsFollowupPool()` and `buildArrearsFollowupPoolResult()` are downgraded to response adapters.

| Logic              | Frontend Still Does It | Backend Does It |
| ------------------ | ---------------------: | --------------: |
| source merge       |                     no |             yes |
| summary count      |                     no |             yes |
| dedupe             |                     no |             yes |
| amount calculation |                     no |             yes |
| bed rent mapping   |                     no |             yes |
| render labels      |                    yes |        optional |

## Frontend Changes

- `loadArrearsForOwner()` now uses the backend SOT response via `/api/boss/arrears/followup-tasks`.
- It no longer runs a parallel TTLock frontend fetch for arrears pool construction.
- It no longer locally recomputes source counts, total amount, or dedupe drops.
- View-all and load-more state are based on backend pagination/summary metadata.

## Safety

No D1 command, migration, write operation, deployment, portal change, navigation change, or unrelated UI rewrite was performed.
