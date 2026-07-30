# Current Legacy Employee UI Production Identity

Status: **CURRENT AND PRODUCTION-VERIFIED**

Verified at: 2026-07-31 (Asia/Dubai)

## Canonical identity

| Item | Current value |
|---|---|
| Product identity | Homelink legacy employee UI v3 |
| Canonical UI ID | `LEGACY_EMPLOYEE_V3` |
| Canonical route | `/employee` |
| Production URL | `https://homelink-finance.habibramadan888.workers.dev/employee` |
| Source file | `deploy-worker/public/employee-v3.html` |
| Worker | `homelink-finance` |
| Worker environment | top-level `internal_beta` environment serving the retained production employee route |
| Current verified source commit | `43f01812b7d0af7a5bb11a9d79b10be4842d3366` |
| Current verified Worker version | `680e089f-48e3-4417-aa7f-4e9149fe956b` |
| Source branch at verification | `codex/fix-rent-paid-silent-cap-20260730` |
| Employee Next | **Not the retained employee UI; do not use as the current employee entry surface** |

`/employee` is the stable public entry. Direct `/employee-v3` and
`/employee-v3.html` paths are implementation aliases and must not replace the
canonical route in operational instructions.

## Route and authentication evidence

The Worker route implementation is in `deploy-worker/src/index.js`.

- An unauthenticated request to `/employee` is redirected to the employee login.
- A successfully authenticated staff user is redirected to `/employee`.
- An authenticated staff request to `/employee` serves the static
  `/employee-v3` asset.
- Direct requests to `/employee-v3.html` and `/employee-v2.html` are redirected
  to `/employee`.

The production verification used the normal employee session. No authentication
bypass, Employee Next route, direct database write, or internal write script was
used.

## Supported employee entry contract

The retained employee UI supports these seven raw employee event types:

1. `rent`
2. `arrears_payment`
3. `deposit_in`
4. `deposit_out`
5. `checkout`
6. `expense`
7. `bed_transfer`

Employee responsibility is to record and submit the observed raw fact.
Business discrepancies may be retained as warnings, explanations, anomalies, or
owner-review state; they must not silently replace employee-entered amounts.

The current upload endpoints are:

| Purpose | Method and endpoint |
|---|---|
| No-write session validation | `POST /api/employee/entry/validate` |
| Formal employee entry upload | `POST /api/employee/entry` |
| Read-only/safe sync-state check | `POST /api/employee/entry/sync-state` with `no_write=true` |

The employee page uses same-origin requests. Validation is not formal upload.
Formal upload remains a separate explicit user action.

## Current Session and export behavior

The current employee Session supports:

- multiple records in one Session;
- local draft preservation;
- separate Validate Session and Upload Session actions;
- per-entry technical identity and idempotent upload recovery;
- raw Session, entry/event, and Canonical anchor persistence;
- owner-side raw Session detail;
- current `HOMELINK LEDGER` preview and copy output.

The current text export:

- displays exact existing customer tags `O` and `N`;
- keeps Expense untagged;
- separates `Deposit Refund` from `Other Expense`;
- labels their combined amount as `Total Outflow`;
- preserves complete employee remarks without the former 90-character cut;
- preserves Rent remarks;
- does not infer an入住日期 from a Rent billing-period start;
- keeps the original statement or receipt date when it is present in the
  employee-entered remark.

## Production acceptance evidence

The production batch identified by:

`APT-20260725-SAW89B`

was verified through the retained `/employee` UI and then read successfully by
the Owner UI as one Session containing 11 entries.

Verified Ledger result:

| Measure | Amount |
|---|---:|
| Cash Received | AED 4,780 |
| Bank Received | AED 460 |
| Total Received | AED 5,240 |
| Deposit Included | AED 200 |
| Deposit Refund | AED 200 |
| Other Expense | AED 150 |
| Total Outflow | AED 350 |
| Net Funds | AED 4,890 |
| Cash Net / Cash Handover | AED 4,430 |
| Outstanding / Arrears Opened | AED 220 |

The arithmetic was verified:

- `4,780 + 460 = 5,240` total received;
- `200 + 150 = 350` total outflow;
- `4,780 - 350 = 4,430` cash net;
- `5,240 - 350 = 4,890` net funds.

The Owner UI successfully displayed the uploaded 11-entry Session. Deposit
refund and ordinary Expense were distinguishable, and the verified totals did
not double-count deposits, refunds, expenses, or the AED 220 outstanding amount.

The exact Session ID for this acceptance was not captured in the retained
verification note; the source anchor above is the durable recorded batch
identifier. Do not invent or infer a Session ID.

## Verified corrective commit chain

The following commits form the final employee export and validation-display
correction chain in this recovery line:

| Commit | Purpose |
|---|---|
| `b672492` | Ignore a null validation-failure index instead of coercing it to record zero |
| `19b49dd` | Separate Deposit Refund and ordinary Expense in the Ledger |
| `fd5ed68` | Preserve complete export notes and Rent remarks |
| `efd4b50` | Clear stale preview-button accessibility lock after session restoration |
| `43f0181` | Do not infer a stay date from a Rent billing-period date |

## Operational rule

For all future employee work:

1. Open `/employee`.
2. Confirm the rendered page is `LEGACY_EMPLOYEE_V3` from
   `deploy-worker/public/employee-v3.html`.
3. Do not use Employee Next.
4. Preserve raw employee-entered facts.
5. Treat Validate Session as no-write validation.
6. Treat Upload Session as the only explicit formal employee upload action.
7. Verify important uploads through the Owner raw Session detail and the
   persisted Canonical/raw record chain.

This document records the known-good employee UI identity and acceptance state.
It does not authorize schema changes, business projection changes, production
writes, or replacement of the legacy employee UI.
