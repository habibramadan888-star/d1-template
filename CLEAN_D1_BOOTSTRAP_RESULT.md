# Clean D1 Bootstrap Result

Date: 2026-05-24  
Task: P0-005 Clean D1 Bootstrap

## Verification Table

| Step                     | Command                                    | Result | Evidence                                                     | Notes                                                    |
| ------------------------ | ------------------------------------------ | ------ | ------------------------------------------------------------ | -------------------------------------------------------- |
| Baseline check           | `npm run check`                            | Pass   | 81 tests passed; Worker dry-run build passed                 | Before P0-005 changes.                                   |
| Baseline smoke           | `npm run smoke:with-worker`                | Pass   | owner login, employee login, auth boundary smoke passed      | Before P0-005 changes.                                   |
| Baseline delete-session  | `npm run test:delete-session`              | Pass   | rows retained and audit evidence written                     | Before P0-005 changes.                                   |
| Historical failure probe | `npm run probe:clean-bootstrap` before fix | Fail   | `no such table: transactions`                                | Confirmed P0-005 root cause.                             |
| Local reset/migrate/seed | `npm run db:local:bootstrap`               | Pass   | local migration and dev seed completed                       | Uses `deploy-worker/.wrangler/p0-005-clean-d1`.          |
| Clean D1 full verify     | `npm run verify:clean-d1`                  | Pass   | smoke, auth, core, employee entry, counts all passed         | Uses disposable temp D1 and deletes it.                  |
| Updated clean probe      | `npm run probe:clean-bootstrap`            | Pass   | `PASS clean local Worker bootstrap supports employee entry.` | The old failing probe now uses local migration and seed. |

## Direct Answers

1. Empty D1 can initialize: yes, using `npm run db:local:bootstrap` or disposable `npm run verify:clean-d1`.
2. Worker can start after migration: yes.
3. Employee login passes: yes.
4. Owner login passes: yes.
5. Employee entry still lacks `transactions`: no, fixed for clean local bootstrap.
6. Delete-session void test still passes: yes, verified before and included in final safety gates.
7. Runtime `CREATE TABLE` / `ALTER TABLE` remains: yes, documented as P1-002.
8. Clean bootstrap blocker remains: no for local minimum bootstrap; production promotion still requires human-approved migration planning.

## Clean D1 Evidence

```text
PASS local migration migrations\local\001_clean_legacy_bootstrap.sql
PASS local dev seed app_settings for local-dev-company
PASS Worker ready at http://127.0.0.1:8797
PASS smoke
PASS smoke:auth
PASS smoke:core
PASS smoke:employee-entry
PASS sessions_count 1
PASS transactions_count 1
PASS arrear_tasks_count 1
PASS audit_logs_count 1
PASS entry_events_count 1
PASS rent_settings_count 1
PASS clean D1 bootstrap verification
```
