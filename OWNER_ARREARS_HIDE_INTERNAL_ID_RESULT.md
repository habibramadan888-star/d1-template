# OWNER_ARREARS_HIDE_INTERNAL_ID_RESULT

## Result

Owner arrears task cards now render the main title from business fields only:

```text
床位｜金额
```

Examples:

```text
329｜630.00 AED
3-329｜630.00 AED
床位待确认｜金额待确认
```

## Fix Summary

| Rule                           | Status | Implementation                                                                         |
| ------------------------------ | -----: | -------------------------------------------------------------------------------------- |
| Do not show internal task id   |   done | `renderOwnerArrearsTaskCard` no longer uses `arrearCustomerLabel` in the visible title |
| Do not show `source_ref`       |   done | visible card title uses only `arrearBedLabel` and `arrearAmountLabel`                  |
| Do not show `ttlock-expired-*` |   done | TTLock fallback IDs remain hidden in checkbox values/actions only                      |
| Do not show `dedupe_key`       |   done | no dedupe field is rendered in the card                                                |
| Show bed / room bed            |   done | `arrearBedLabel` checks `roomBed`, `bedNo`, `roomNo`, `room`, `bed`, and `lockRoom`    |
| Show amount                    |   done | `arrearAmountLabel` shows positive finite amount as AED                                |
| Missing bed fallback           |   done | `床位待确认`                                                                           |
| Missing amount fallback        |   done | `金额待确认`                                                                           |

## Changed Files

- `deploy-worker/public/index-51-main.js`
- `tests/owner-arrears-hide-internal-id.spec.mjs`
- `tests/owner-arrears-business-title.spec.mjs`
- `package.json`

## D1 / Migration Safety

No D1 command was run. No migration was added or executed. No business write was performed.
