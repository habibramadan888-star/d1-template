# Commercial Launch Single Owner Signoff Model

Date: 2026-05-27, Asia/Dubai

Production status: `PRODUCTION_NO_GO`

Current owner model:

- All commercial launch approval categories are owned by Ramadan Habib.
- This is a unified person/team assignment only.
- It does not merge the approval categories.
- It does not approve production deploy, production migration, D1 write, feature
  flags, or production cutover.

## Required Approval Categories

| Approval Category                   | Person / Team | Separate Review Required | Notes                                                                         |
| ----------------------------------- | ------------- | ------------------------ | ----------------------------------------------------------------------------- |
| Project owner                       | Ramadan Habib | Yes                      | Overall launch readiness and residual risk acceptance.                        |
| Engineering owner                   | Ramadan Habib | Yes                      | Final SQL, flags, backend totals, employee entry, handover, deploy readiness. |
| Accounting / finance reviewer       | Ramadan Habib | Yes                      | Money conversion, TOP_25 risks, receivables, arrears, adjustments.            |
| Data migration reviewer             | Ramadan Habib | Yes                      | Row counts, migration/backfill SQL, rollback rows, data verification.         |
| Security / secrets reviewer         | Ramadan Habib | Yes                      | Secrets, redaction, observability, production config risk.                    |
| Operations / business user reviewer | Ramadan Habib | Yes                      | Backup, cutover freeze, owner flow, business validation.                      |
| Rollback owner                      | Ramadan Habib | Yes                      | Restore/reverse rollback method, trigger criteria, verification.              |
| Deployment owner                    | Ramadan Habib | Yes                      | Deploy command, target, feature flags, post-deploy checks.                    |

## Status Rules

Each approval item must keep its own status:

- `NOT_STARTED`
- `PENDING_REVIEW`
- `APPROVED`
- `REJECTED`
- `MANUAL_REQUIRED`
- `BLOCKED`

One global approval cannot replace the individual signoff decisions. For
example, approving the project owner category does not automatically approve
accounting, data migration, rollback, deployment, or cutover.

## Production Rule

Production cutover remains `PRODUCTION_NO_GO` until every required signoff in
`COMMERCIAL_LAUNCH_HUMAN_SIGNOFF_TRACKER.md` is independently reviewed and
approved.

Current tracked state:

- Total signoffs: 20.
- Required owner: Ramadan Habib.
- Approved production signoffs: 0.
- Missing production-blocking signoffs: 20.
