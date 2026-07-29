# Arrears Promise Amount Contract Deploy Approval Required

Date: 2026-05-31

## Status

Deploy was not executed.

This task includes code and UI contract changes, so any live rollout requires a separate explicit deployment approval.

## Changed Areas

- Employee default arrears follow-up payload now uses `promised_payment_date` and `followup_note`.
- Backend accepts semantic aliases and legacy amount aliases.
- Backend staff update ignores legacy promised amount fields as default update values.
- Tests and documentation were updated to lock this behavior.

## Deployment Restrictions

Before any deployment, re-run the approved predeploy checks for this repo. Do not run D1 migration or D1 write as part of this contract cleanup.

## Safety State

- Production deploy: no
- Production migration: no
- Production D1 write: no
- Staging D1 write: no
- Business write: no
- Production cutover: `PRODUCTION_NO_GO`
