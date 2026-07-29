# P0-008G Rollback Result

Date: 2026-05-26, Asia/Dubai

Feature flag: `ENABLE_RECEIVABLES_AUTHORITY_STAGING`

| Check                       | Expected | Actual                        | Result | Notes                                                            |
| --------------------------- | -------- | ----------------------------- | ------ | ---------------------------------------------------------------- |
| Remote staging flag enabled | no       | no                            | PASS   | P0-008G used local staging-mode evaluation only.                 |
| Before flag state           | false    | false                         | PASS   | Legacy values used before rehearsal.                             |
| During rehearsal state      | true     | true in local evaluation only | PASS   | Six approved candidates used receivables authority values.       |
| Final flag state            | false    | false / not enabled remotely  | PASS   | Rollback verified by after=false rows.                           |
| Production flag enabled     | no       | no                            | PASS   | Production guard remains disabled even if flag input is true.    |
| Dashboard mutation          | no       | no                            | PASS   | Dashboard live result remained unchanged.                        |
| Production touched          | no       | no                            | PASS   | No production deploy, migration, URL call, or D1 write occurred. |

Rollback method for any future rehearsal:

1. Set `ENABLE_RECEIVABLES_AUTHORITY_STAGING=false`.
2. Rerun `npm run rehearse:receivables-staging-authority-switch`.
3. Confirm all after-rollback rows return to `LEGACY`.
4. Confirm `npm run gate:commercial-launch` remains `PRODUCTION_NO_GO`.
