# Blocker Report

Date: 2026-05-23  
Mode: NIGHT SHIFT  
Production deploy: not executed  
Production database mutation: not executed

## Blocking Risks

### P0: Local authentication cannot be fully validated

Evidence:

```text
POST /auth/employee-login -> 503
Error: jwt_secret_missing
```

Impact:

- Employee authenticated workflows cannot be verified locally.
- Permission checks beyond unauthenticated 401 cannot be fully validated.

Safe resolution:

- Add real local `.dev.vars` using non-production secrets.
- Add documented password-hash generation workflow.
- Do not hardcode passwords or secrets.

### P0: Clean database bootstrap is not proven

Evidence:

Local D1 schema currently shows only:

```text
active_sessions
employee_users
```

Impact:

- A new customer or clean environment may not have required business tables.
- Runtime schema mutation is not a commercial-grade migration strategy.

Safe resolution:

- Create explicit, ordered migrations for all business tables.
- Use integer minor-unit money columns in new migrations.
- Test clean database bootstrap locally before production rollout.

### P0: Existing money model still uses decimal/REAL in business tables

Evidence:

- Existing schema and Worker code use `REAL` and `Number` for financial values.

Impact:

- Float precision can corrupt rent, deposit, arrears, refunds, and handover totals.

Safe resolution:

- Introduce integer minor-unit helpers and schema fields.
- Migrate gradually with compatibility reads.
- Do not alter financial calculation behavior without tests and reconciliation.

### P0: Financial hard-delete path exists

Evidence:

- Existing session delete path deletes transaction/deposit/arrears rows.

Impact:

- Commercial audit trail can be lost.
- Owner/staff disputes cannot be reconstructed.

Safe resolution:

- Replace normal delete with void/soft-delete.
- Preserve before/after audit events.
- Keep physical deletion only for explicit local test cleanup tooling.

### P1: Owner-side legacy script has duplicate function declarations

Evidence:

```text
index-51-main.js
Parsing error: Identifier 'rc_renderCfg' has already been declared
```

Impact:

- Lint cannot pass.
- Duplicate implementation risk makes future fixes unsafe.

Safe resolution:

- Review duplicate blocks.
- Remove or rename only the obsolete duplicate after confirming behavior.
- Add regression check for rent config UI.

## Stop Condition

No further business logic modifications should proceed until:

- local secrets are configured safely,
- clean D1 bootstrap is defined,
- financial delete policy is converted to void/soft-delete,
- lint blockers are triaged into isolated fixes.

## NIGHT SHIFT V2 Blockers

### P0: Financial precision model is not commercial-grade

Evidence:

- `DATABASE_AUDIT.md` and `FINANCE_AUDIT.md` identify `REAL` and JS `Number` use across financial data.

Impact:

- Rent, deposit, arrears, refund, expense, and handover totals can suffer precision drift.

Safe resolution:

- Add integer minor-unit fields in new migrations.
- Add compatibility reads and reconciliation tests.
- Do not change existing formulas without finance regression tests.

### P0: Employee handover is not server-atomic

Evidence:

- Employee session export/submission logic sends accepted entries individually to `/api/employee/entry`.

Impact:

- A weak network or repeated click can leave a partially uploaded handover.

Safe resolution:

- Add a backend handover commit endpoint with idempotency key.
- Recompute totals server-side.
- Add duplicate-submit and network-failure tests.

### P0: Hard delete remains present in financial session path

Evidence:

- `/api/delete_session` deletes financial rows rather than voiding them.

Impact:

- Commercial audit trail and dispute evidence can be lost.

Safe resolution:

- Replace standard delete with void/soft-delete and immutable audit events.

### P1: Embedded Worker source can drift

Evidence:

- `deploy-worker/src/index.embedded.js` is generated and was not regenerated during V2 because the night rules prohibit expanding giant files.

Impact:

- Embedded deployment path may not include source Worker lint cleanup until a controlled build-prep step regenerates it.

Safe resolution:

- Add a generated-file hash check.
- Regenerate embedded Worker only during explicit deploy preparation.
