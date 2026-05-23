# Directory Governance Plan

This is the target directory plan for modularizing the system. It is intentionally a plan only. No business code is migrated by this document.

## Principles

- Do not expand existing monolith files for new substantial logic.
- Keep each module responsible for one business domain.
- Move code incrementally only when a test or validation path exists.
- Preserve current production entrypoints until replacement paths are verified.
- Prefer additive modules and adapters over destructive rewrites.

## Target Module Structure

```text
modules/
  auth/
  finance/
  contracts/
  properties/
  employees/
  reports/
  settings/
  audit/
```

## Module Responsibilities

### `modules/auth/`

Owns:

- login
- session creation and revocation
- password verification
- role checks
- trusted origin checks
- future tenant membership checks

Must not own:

- finance calculations
- UI rendering
- TTLock parsing

### `modules/finance/`

Owns:

- amount parsing and integer minor-unit conversion
- rent cycle calculation
- receivables
- arrears creation and reconciliation
- deposit ledger
- handover totals
- financial validation rules

Must not own:

- visual design
- raw authentication
- tenant routing

### `modules/contracts/`

Owns:

- lease/rental period definitions
- start/end date anchors
- expected rent obligations
- checkout and renewal state

Must not own:

- raw transaction posting
- payment method UI

### `modules/properties/`

Owns:

- property/building/room/bed model
- bed rent configuration
- TTLock card-to-bed context mapping
- vacant/staff-bed exclusion rules

Must not own:

- payment posting
- arrear recovery state

### `modules/employees/`

Owns:

- employee profile
- staff assignment
- employee-scoped handover
- employee action limits

Must not own:

- owner dashboard metrics
- global configuration

### `modules/reports/`

Owns:

- owner dashboard summaries
- handover reports
- CSV/Excel/PDF export models
- period grouping
- KPI computation from backend-normalized data

Must not own:

- transaction mutation
- password/session logic

### `modules/settings/`

Owns:

- tenant-scoped settings
- rent configuration storage
- feature flags
- integration settings metadata

Must not own:

- secrets plaintext
- financial transaction rows

### `modules/audit/`

Owns:

- audit event model
- before/after snapshots
- void reason records
- exportable audit trails

Must not own:

- business approval logic
- UI interaction state

## Future Worker Layout

```text
deploy-worker/
  src/
    index.js
    routes/
      auth.js
      employee.js
      owner.js
      reports.js
    services/
      auth/
      finance/
      arrears/
      deposits/
      handover/
      settings/
      audit/
    repositories/
      d1/
    integrations/
      ttlock/
      wifi/
    middleware/
      security.js
      cors.js
      auth.js
```

## Migration Guardrails

- Do not move code and change behavior in the same step.
- First extract pure helpers with tests.
- Then extract service functions.
- Then extract route handlers.
- Keep `src/index.js` as an adapter until routes are proven stable.
- Never edit `src/index.embedded.js` manually; it is generated.

## First Safe Extraction Candidates

These are candidates only, not actions for tonight:

- amount helpers
- date helpers for Asia/Dubai business date
- governance checks
- audit event helpers
- rent cycle constants
- response helpers

## Explicit Non-Goals For Tonight

- no UI rewrite
- no route migration
- no schema migration
- no production deployment
- no behavior-changing finance refactor
