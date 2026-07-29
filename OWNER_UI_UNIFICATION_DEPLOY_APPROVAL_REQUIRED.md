# Owner UI Unification Deploy Approval Required

Deploy required for live: Yes.

This task changed static UI assets and login/owner presentation files. The changes are not live until the Worker assets or embedded Worker are deployed through the approved deployment process.

## Deploy Scope

| Item                         | Status             |
| ---------------------------- | ------------------ |
| Static CSS/UI route only     | Yes                |
| Business logic change        | No                 |
| Dashboard calculation change | No                 |
| Financial formula change     | No                 |
| D1 migration                 | No                 |
| D1 write                     | No                 |
| Employee entry write         | No                 |
| Handover submit              | No                 |
| Void/delete_session          | No                 |
| Settings change              | No                 |
| Production cutover           | `PRODUCTION_NO_GO` |

## Required Before Deploy

| Requirement                      | Current Plan                            |
| -------------------------------- | --------------------------------------- |
| `npm run format:check`           | Must pass                               |
| `npm run check`                  | Must pass                               |
| `npm run security:secrets`       | Must pass                               |
| `npm run gate:commercial-launch` | Must remain `PRODUCTION_NO_GO`          |
| `npm run test:owner-ui`          | Must pass                               |
| `npm run test:owner-mobile-ui`   | Must pass                               |
| `npm run build:embedded:dry-run` | Must show no migration/D1 write         |
| `npm run verify:embedded-worker` | Must pass or document freshness warning |
| `npm run audit:worker-drift`     | Must pass with no critical drift        |

## Approval Boundary

Do not deploy automatically from this document. A follow-up deploy task must explicitly approve static UI deployment and continue to prohibit D1 writes, migrations, business writes, and production cutover.
