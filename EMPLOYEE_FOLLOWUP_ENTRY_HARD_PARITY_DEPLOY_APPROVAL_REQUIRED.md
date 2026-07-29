# Employee Follow-up Entry Hard Parity Deploy Approval Required

Task: EMPLOYEE-FOLLOWUP-ENTRY-LAYOUT-PARITY-HARD-FIX-001

Default action: do not deploy.

Deployment, if later approved, is limited to:

- Employee UI
- Header compact parity
- Entry/Follow-up nav centered
- Follow-up body Entry rebuild
- System Reminders Entry rebuild
- Legacy Follow-up CSS cleanup

Deployment must not include:

- Production write gate
- Production business write
- Production migration
- D1 execute/export/import
- Owner directive create
- Employee follow-up write
- Batch dispatch
- TTLock smoke
- Financial formula change
- Dashboard calculation change

Required approval wording before deploy:

`APPROVE EMPLOYEE FOLLOWUP HARD PARITY UI DEPLOY ONLY`

Production cutover remains `PRODUCTION_NO_GO`.
