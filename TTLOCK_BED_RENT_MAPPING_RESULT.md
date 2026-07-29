# TTLock Bed Rent Mapping Result

Rent mapping source: read-only `app_settings` row where `key = rent_ref_room`.

Lookup order:

| room_bed | rent found | amount | source |
|---|---|---|---|
| `1-102` | yes if exact key exists | configured AED value | `rent_ref_room` |
| `2-219` | yes if exact key exists | configured AED value | `rent_ref_room` |
| `8-202` | yes if exact key exists | configured AED value | `rent_ref_room` |
| `lockRoom-bed` | yes if combined key exists | configured AED value | `rent_ref_room` |
| missing/unconfigured | no | excluded from default total | `ttlock_missing_rent` |

Rules:

- Amount unit in API result includes `amount_fils`.
- UI amount remains AED for display.
- Missing rent does not crash the module.
- Missing rent is not counted in default arrears total.
- No D1 write is performed while reading rent config.
