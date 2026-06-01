# Bed Transfer Employee UI Write Production Smoke Result

Date: 2026-06-01
Status: NOT RUN

## Reason

Production UI-originated Bed Transfer smoke must only run after local verification and deployment prechecks pass, and after confirming the deployed Worker contains `/api/employee/bed-transfers`.

## Approved Scope When Run

- One employee UI-originated Bed Transfer event.
- Target scenario: from 144 to 122 if approved and still valid.
- Status must be `pending_review`.
- No occupancy/deposit/arrears/TTLock mutation.
- Production cutover remains `PRODUCTION_NO_GO`.

## Current Safety Status

No production write was executed in this step.
