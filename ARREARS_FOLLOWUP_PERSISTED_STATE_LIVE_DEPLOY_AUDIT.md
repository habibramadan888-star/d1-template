# Arrears Follow-up Persisted State Live Deploy Audit

Date: 2026-06-01 Asia/Dubai

Scope: read-only live asset/deployment audit for the employee follow-up persisted-state issue. No production write gate was opened and no production write was executed.

## Deployment Evidence

| Check | Result |
|---|---|
| Current local fix commit | `223cbbb fix: distinguish saved and unsaved arrears followup states` |
| Latest listed live Worker version | `9f9b7b6e-c249-4141-b5d1-ff22b52476b2` |
| Latest actual deployment in list | `8307d5e9-c209-4789-8d1d-9664cbbd5fcc` |
| Latest entries after deployment | secret-change versions only |
| `employee-v3.html` public GET | 302 auth redirect, public unauthenticated asset body not available |
| Live `index-51-main.js` contains `serverOriginalPromisedDate` | no |
| Live `index-51-main.js` contains `serverOriginalFollowupNote` | no |
| Live `index-51-main.js` contains `updateEmployeeDirectivePersistedState` | no |
| Live `index-51-main.js` contains `employeeDirectiveIsDirty` | no |
| Live `index-51-main.js` contains owner `assigned-state` action | no |
| Live `index-51-main.js` contains owner `followed-up-state` action | no |
| Local repo contains the persisted-state fix | yes |

## Required Strings

| String / Marker | Local Fix | Live Asset |
|---|---:|---:|
| `serverOriginalPromisedDate` | yes | no |
| `serverOriginalFollowupNote` | yes | no |
| `updateEmployeeDirectivePersistedState` | yes | no |
| `employeeDirectiveIsDirty` | yes | no |
| `反馈已保存` | yes | no |
| `老板端可见` | yes | no |
| `当前修改未提交` | yes | no |
| `data-arrear-write-action="assigned-state"` | yes | no |
| `data-arrear-write-action="followed-up-state"` | yes | no |

## Conclusion

`LIVE_NOT_DEPLOYED`

The phone behavior is consistent with the deployed Worker/static assets being older than commit `223cbbb`. The current live assets do not contain the persisted-state model or the owner assigned/followed-up button-state markers.

## Decision

Do not change follow-up business logic in this task. The next action is deployment approval for the already-committed UI-state fix only.

Production cutover remains `PRODUCTION_NO_GO`.
