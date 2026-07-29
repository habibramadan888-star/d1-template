# P0 Arrears Loading Partial Failure Result

## Result

Loading behavior remains shell-first and skeleton-first. Source-level partial failures are now consumed from backend `sources` metadata rather than inferred through parallel frontend source requests.

| Requirement                                                          | Result |
| -------------------------------------------------------------------- | ------ |
| 300ms skeleton path preserved                                        | yes    |
| Loading does not require client-side TTLock aggregation              | yes    |
| Existing source failure can be represented independently             | yes    |
| TTLock source failure can be represented independently               | yes    |
| Both-source failure can be represented by backend/source error state | yes    |
| AbortError does not create a second source merge path                | yes    |
| API contract mismatch has a visible error path                       | yes    |
| Source error code retained                                           | yes    |

## Safety

No write path was executed. No D1 command was executed.
