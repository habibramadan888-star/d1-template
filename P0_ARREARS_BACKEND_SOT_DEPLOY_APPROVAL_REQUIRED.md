# P0 Arrears Backend SOT Deploy Approval Required

Deployment was not executed.

If online validation is required, request explicit approval for a separate deployment task. This task intentionally stops after local code, tests, and documentation.

## Deployment Boundary

Before any deployment, rerun:

- `npm run security:secrets`
- `npm run gate:commercial-launch`
- `npm run test:arrears-backend-sot`
- `npm run test:arrears-frontend-adapter`
- `npm run test:arrears-summary-viewall`
- `npm run test:arrears-source-isolation`
- `npm run test:arrears-dedupe-safety`
- `npm run test:arrears-bed-rent-mapping`
- `npm run test:owner-arrears-api-contract`
- `npm run test:readonly-admin-role`
- `npm run qa:employee-entry-staging`

Production cutover must remain `PRODUCTION_NO_GO`.
