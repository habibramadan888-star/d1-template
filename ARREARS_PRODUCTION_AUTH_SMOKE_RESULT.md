# Arrears Production Auth Smoke Result

Status: `PASS`

## Scope

This was a masked authentication smoke only. It did not execute arrears directive creation, employee follow-up, production write gate changes, migration, deploy, or production arrears business writes.

## Results

| Check | Result |
|---|---|
| owner auth usable | yes |
| owner role matched | yes |
| employee auth usable | yes |
| employee role matched | yes |
| admin auth usable | yes |
| admin role matched | yes |
| same-origin `Origin` header fix | yes |
| password printed | no |
| token printed | no |
| cookie printed | no |
| `Set-Cookie` printed | no |
| business write | no |
| owner directive create called | no |
| employee follow-up called | no |
| production write gate | off |
| production cutover | `PRODUCTION_NO_GO` |

## Root Cause Fixed

The first masked auth smoke returned 403 because production auth POST requests require a same-origin `Origin` header. The harness now sends `Origin` and `User-Agent` headers for production auth requests. After the fix, owner, employee, and admin authentication checks passed.

## Safety Notes

- Credentials were read only from the ignored local file.
- No credential values were printed or written to Markdown.
- No credential file was committed.
- No production arrears business data was written.

