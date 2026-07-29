# Employee Follow-up Match Entry UX Deploy Approval Required

Task: `EMPLOYEE-FOLLOWUP-MATCH-ENTRY-UX-001`

Default decision: not deployed in this task.

Deployment would only include:

- Employee UI layout alignment with Entry.
- Employee Export tab/page removal.
- Header account/logout style alignment.
- Follow-up card expand/collapse interaction.
- Concise bilingual copy.

Deployment must not include:

- Production write gate changes.
- Production business writes.
- Migration.
- Owner/employee write API behavior changes.
- Financial formula changes.
- Dashboard calculation changes.

Approval required:

- Ramadan must explicitly approve deployment before running Wrangler deploy.
- Production cutover must remain `PRODUCTION_NO_GO`.
