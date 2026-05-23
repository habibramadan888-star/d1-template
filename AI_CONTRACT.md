# AI Engineering Contract

This document is the mandatory operating contract for any AI or human engineer modifying this project. It exists to prevent demo-style changes from damaging a commercial finance system.

## Scope

- Applies to employee frontend, owner frontend, Cloudflare Worker APIs, D1 schema, deployment configuration, tests, and documentation.
- Business logic changes must be traceable to a requirement, reviewed against this contract, and verified before deployment.
- No change may trade away financial accuracy, auditability, permission safety, or future multi-tenant support for short-term convenience.

## Non-Negotiable Rules

### 1. Do Not Expand Monolith Files

- Do not add new business features directly into large single-file frontends unless the change is a narrowly scoped hotfix.
- Existing large files must not become larger as the default implementation path.
- New substantial frontend logic must be extracted into smaller modules before or during implementation.
- New substantial Worker logic must be placed behind clear route/service/data-access boundaries.
- Compatibility shims are allowed only when documented and scheduled for removal.

Current monolith risk files:

- `employee-v3.html`
- `index-51.html`
- `index-51-main.js`
- `deploy-worker/src/index.js`
- `deploy-worker/src/index.embedded.js`

### 2. Financial Amount Rules

- All stored money values must use integer minor units, normally `*_fils`.
- Do not store business money as SQLite `REAL`.
- Do not use JavaScript floating point arithmetic as the source of truth for money.
- UI may display decimal AED values, but conversion must happen at boundaries.
- Server-side APIs must recompute authoritative totals instead of trusting frontend totals.
- Handover anchors must be computed by backend from accepted entries:
  - cash handover = cash inflow - cash outflow
  - bank transfer total = bank inflow count and amount
  - gross received = cash inflow + bank inflow
- Rent, deposit, refund, arrears, expense, and transfer fee calculations must use the same amount helper.
- Rounding must be explicit and tested.

### 3. API Authentication And Authorization Rules

- API security must be enforced on the Worker, not only through hidden frontend buttons.
- Every protected API route must call authentication and role authorization before reading or writing business data.
- Roles must be explicit:
  - owner/manager: configuration, reports, global review, overrides, voids
  - staff: entry, assigned arrear follow-up, limited self-scope export
  - admin: platform operations only when added intentionally
- Staff must never update owner-only financial fields.
- Cookies must remain `HttpOnly`, `Secure`, and `SameSite=Strict`.
- Tokens and password hashes must be stored only in secrets or protected tables.
- Default production credentials are forbidden.
- CORS/origin checks must be documented and covered by tests.

### 4. Data Deletion Rules

- Commercial financial records must not be physically deleted in normal operations.
- Delete actions must become void/soft-delete operations.
- Voids must preserve:
  - original record
  - actor
  - role
  - timestamp
  - reason
  - before/after state
- Deposit ledger rows, transaction rows, arrear tasks, and exported handover records must remain audit-readable.
- Physical deletion is allowed only for local test data or explicit data retention tooling with written confirmation.

### 5. Multi-Tenant Rules

- Every business table must be scoped by tenant/company identifier.
- Future commercial structure must support:
  - company
  - property/building
  - room/bed
  - owner account
  - staff account
- `corpid` alone is not enough for long-term SaaS scale; new schema work must include `property_id` or equivalent.
- No API may return data without tenant filtering.
- No frontend may infer tenant access from local state.
- Configuration must be tenant-scoped, not globally hardcoded.

### 6. Test Rules

- No fix is complete without verification.
- Do not make tests pass by disabling validation, reducing permissions, hardcoding data, or suppressing errors.
- Required test categories for financial changes:
  - amount conversion and rounding
  - rent cycle calculation
  - arrear creation and repayment
  - deposit in/refund/checkout deduction
  - session handover totals
  - duplicate submit/idempotency
  - role permission denial
  - timezone boundary at Asia/Dubai
- Required test categories for UI changes:
  - desktop
  - tablet/foldable width
  - mobile
  - empty state
  - loading state
  - failed API state
  - long text/card remark
  - repeated click

## Change Procedure

1. Read `AI_CONTRACT.md`, `ARCHITECTURE.md`, and `PROJECT_MAP.md`.
2. Identify affected modules and data flows.
3. State the intended change before editing.
4. Make the smallest safe change.
5. Run relevant local checks.
6. Record residual risks.
7. Do not deploy unless startup, API, and relevant business checks pass.

## Commercial Acceptance Bar

A change is not acceptable if it creates any of the following:

- unverifiable financial totals
- missing audit trail
- staff privilege escalation
- cross-tenant data leakage
- hard delete of financial records
- browser-only authority for financial truth
- new hardcoded production data
- larger unstructured monolith logic
- undocumented environment dependency
- inability to reproduce locally
