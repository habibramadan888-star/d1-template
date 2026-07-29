# Employee Nav Split System Page Deploy Approval Required

Default decision: `NO_DEPLOY_IN_THIS_TASK`

This change is UI-only and can be deployed later if mobile acceptance requires it.

Allowed deploy scope if separately approved:

- Employee three-tab navigation: Entry / Follow-up / System.
- Follow-up limited to Boss Assigned Tasks.
- System Reminders moved to the System tab.
- Hash routing for `#entry`, `#followup`, and `#system`.
- Legacy `#export` redirected to `#followup`.

Explicitly excluded:

- Production write gate changes.
- Production business writes.
- Employee follow-up writes.
- Owner directive create.
- Batch dispatch.
- TTLock smoke.
- D1 migration/export/import/execute.
- Financial formula or dashboard calculation changes.

Production cutover remains `PRODUCTION_NO_GO`.
