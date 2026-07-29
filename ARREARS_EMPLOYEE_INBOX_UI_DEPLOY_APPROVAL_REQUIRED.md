# Arrears Employee Inbox UI Deploy Approval Required

Date: 2026-05-31

## Status

The owner dry-run copy and employee directive inbox UI fixes are committed locally, but they are not deployed.

## What Would Be Deployed

- Owner `下发员工` UI copy that clearly states dry-run/manual list only while write gate is off.
- Employee FOLLOW-UP `老板下发任务` inbox reading `GET /api/employee/arrears/directives`.
- Employee directive feedback UI with promised payment date and follow-up note only.
- Static tests and documentation only.

## Explicitly Not Included

- No production D1 write.
- No migration.
- No production write gate.
- No owner directive create.
- No employee follow-up write.
- No TTLock production smoke.
- No batch dispatch.
- No financial formula or dashboard calculation change.
- No production cutover.

## Required Approval

Deployment requires separate explicit approval from Ramadan.

Production cutover remains `PRODUCTION_NO_GO`.
