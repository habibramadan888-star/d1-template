# P0 Arrears Summary Preview View-All Result

## Result

Summary, preview, and view-all behavior now use backend SOT metadata.

| Requirement                                                            | Result |
| ---------------------------------------------------------------------- | ------ |
| Overview arrears module displays `preview_tasks`                       | yes    |
| UI shows displayed N / total M                                         | yes    |
| View all uses API task list and pagination metadata                    | yes    |
| View all button has an action path                                     | yes    |
| `has_more=true` enables load-more behavior                             | yes    |
| Summary total count comes from backend                                 | yes    |
| System arrears and TTLock rows remain visible when returned by backend | yes    |

## Notes

The frontend can still filter currently loaded rows for visual state filters, but business totals and source counts are sourced from backend `summary` and `pagination`.
