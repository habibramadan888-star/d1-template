# TTLOCK COUNT/LIST VIEW ALL FIX RESULT

Status: fixed.

| Check                                                                     | Result |
| ------------------------------------------------------------------------- | ------ |
| TTLock count comes from the same merged pool as rendered cards            | yes    |
| Backend TTLock rows with bed-rent-mapped amounts are accepted by frontend | yes    |
| `all_tasks` includes TTLock rows                                          | yes    |
| `preview_tasks` is only a preview, not the authoritative full list        | yes    |
| `查看全部` can reveal all loaded TTLock cards                             | yes    |

Important behavior:

- Overview may initially show a preview such as 5 cards.
- It now displays `预览 5 / 共 16` or `已显示全部 16 / 共 16`.
- Pressing `查看全部 16` expands the already loaded list without a blocking second fetch.
