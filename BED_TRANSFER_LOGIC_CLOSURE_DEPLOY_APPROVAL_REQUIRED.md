# Bed Transfer Logic Closure Deploy Approval Required

Default decision: `NO_DEPLOY_IN_THIS_TASK`

Deploy would require separate approval.

Allowed deploy scope:

- Employee Bed Transfer UI fields.
- Local validation summary.
- Transfer state/data anchors.
- No production write behavior.

Not allowed:

- Production write.
- Write gate.
- Migration unless separately approved.
- Automatic modification of real bed data.
- Dashboard calculation or financial formula changes.

Production cutover remains `PRODUCTION_NO_GO`.
