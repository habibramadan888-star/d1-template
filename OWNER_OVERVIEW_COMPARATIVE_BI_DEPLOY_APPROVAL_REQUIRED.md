# Owner Overview Comparative BI Deploy Approval Required

Default: not deployed.

Deploy scope, if later approved:

- Static owner overview BI panel.
- Read-only owner comparative API.
- No production write.
- No migration.
- No dashboard formula change.
- No financial formula change.

Required predeploy checks:

- `npm run security:secrets`
- `npm run gate:commercial-launch`
- New owner overview BI tests

Production cutover remains `PRODUCTION_NO_GO`.
