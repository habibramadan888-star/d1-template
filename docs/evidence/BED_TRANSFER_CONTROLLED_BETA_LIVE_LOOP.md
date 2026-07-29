# Bed Transfer Controlled Beta Live Loop Evidence

## Scope

- Task: `HOMELINK_BED_TRANSFER_LEGACY_GENESIS_LIVE_LOOP_032`
- Baseline branch: `fix/bed-transfer-canonical-write-closure`
- Baseline HEAD: `b3e15f20fccc211b296d0cf5bd1af0493d261949`
- Approved fixture only: Bed `146` to Bed `111`
- Result: `BLOCKED_CLEANUP_REQUIRED`
- Bed Transfer status: `BLOCKED_CLEANUP_REQUIRED`

## Local implementation

The beta-only legacy genesis rule is server-gated by `APP_ENV=beta_preview`,
`BED_TRANSFER_WRITE_APPROVED=true`, and a server-side source-bed allowlist. It
accepts only the approved `146` to `111` pair after server-derived TTLock,
corpid, vacancy, MMDD, expiry, deposit-context, and lineage-conflict checks.
Client-supplied lineage, source-context, provider, card, phone, and snapshot
fields remain forbidden.

The canonical writer and the exact additive Owner transfer-void path now also
fail closed before writing when the remote `sessions` table does not expose
`entries_json`. The failure is `BED_TRANSFER_CANONICAL_ARCHIVE_SCHEMA_NOT_READY`
with `no_write=true` and `write_attempted=false`. No schema or migration was
changed or applied.

Code commit: `a0809427c9b028e790d2241aabe970670f3ae389`
(`fix: allow owner-confirmed legacy transfer genesis`).

## Local verification

- JavaScript syntax check: PASS.
- Focused legacy-genesis, canonical-write, resolver, and Owner-void tests: 33/33 PASS.
- Related Phase 1 regression run before the final schema-presence guard: 346/346 PASS.
- A wider non-task glob also reached existing Owner/Rent static-contract failures;
  those failures are outside this task and were not modified or represented as passing.
- Wrangler version: locked and installed `4.94.0`.
- Wrangler dry-run artifact build: PASS.

## Controlled Preview sequence

Write-enabled zero-traffic Preview versions used during the controlled run:

- `35f6ca38-cfc5-4ab0-9f1b-cb62c88dd31e`
- `dbbe8ffa-e947-4988-820d-c398d80de943`
- `fbef55cb-1ba2-412c-8f3f-333060fadd27`

Preview alias:
`https://owner-post-login-fc6b1cd-homelink-finance.habibramadan888.workers.dev`

The authenticated validate-only request for `146` to `111` passed with:

- source Bed 146: `not_marked_vacant`, unambiguous, D present, MMDD present,
  expiry present, and zero open arrears;
- target Bed 111: TTLock E/e vacant and unambiguous;
- fee mode: waived, amount AED 0;
- TTLock sequence: `employee_first_pre_move`;
- `dry_run=true`, `validate_only=true`, `no_write=true`;
- Record Transfer enabled only after successful validation.

One canonical-shaped request was submitted to `POST /api/employee/entry`. The
API returned accepted with:

- session id: `S20260713-33wt2`;
- transfer anchor id: `8315e2b7-38cf-459e-b94f-e5c23c41c060`;
- transfer lineage id: `00b38a90-5cf0-488a-811b-785612a75e82`;
- `idempotent=false`.

No direct Bed Transfer route, `/api/save_session`, event-ledger path, generic TF
save path, or legacy transaction write was used.

## Remote persistence finding

An account-scoped, session-scoped read-only D1 check established that the
production-context D1 `sessions` table does not have `entries_json` or
`summary_json`. It has only the legacy session-summary columns. Consequently,
the dynamic insert omitted the canonical entry payload.

The exact scoped remote facts are:

- one session shell exists for `S20260713-33wt2`;
- its `anchor_id` is `8315e2b7-38cf-459e-b94f-e5c23c41c060`;
- `entries_count=1`, `source=employee_entry`, and all gross/cash/bank totals are 0;
- matching legacy transaction count is 0;
- no canonical transfer anchor was persisted in a readable canonical archive;
- Owner History can see the session shell but cannot project a transfer lineage;
- no effective Bed Transfer Finance or Today Todo projection was created.

No provider/card/phone/99099 identity was emitted in the validated response,
canonical-shaped response, or evidence.

## Void and restoration result

The exact additive Owner void was not executed because it requires the original
canonical transfer entry in `sessions.entries_json`. The user explicitly
forbade the generic hard-delete/session-delete path, and it was not used.

Therefore:

- active canonical transfer: 0;
- effective current-bed projection change: 0;
- effective Finance delta: AED 0;
- Deposit delta: 0;
- Arrears delta: 0;
- active canonical transfer Todo: 0;
- one active orphan zero-finance legacy session shell remains;
- full cleanup and post-void restoration cannot be certified.

The remaining governance decision is whether to authorize either the currently
forbidden canonical archive schema/migration work or an explicitly scoped
exceptional soft-void of the orphan session shell. This evidence does not choose
or recommend either option.

## Preview and production safety restoration

- Safe zero-traffic Preview version restored: `d0c3a29a-6706-4b27-b92c-4c90366e9c59`.
- Preview Bed Transfer write gate: false.
- Preview legacy-genesis allowlist: disabled.
- Preview Owner transfer-void gate: false.
- Preview Owner acknowledgment gate: false.
- Employee UI after restoration: Validate enabled; Record Transfer
  `disabled=true` and `aria-disabled=true`.
- Production version before: `fe0d6788-5f00-488a-85c8-5cb336750318`.
- Production version after: `fe0d6788-5f00-488a-85c8-5cb336750318`.
- Production traffic changed: no.
- Production main-Worker business endpoint called: no; the authorized
  production-context Beta Preview endpoint was called once.
- Production-context business data changed by this run: one orphan zero-finance
  session shell was created through the authorized Beta Preview;
  no effective Finance, Deposit, Arrears, lineage, or Todo projection changed.
- Migration applied: no.
- Production cutover: `PRODUCTION_NO_GO`.

## Final verification result

`BLOCKED_CLEANUP_REQUIRED`

The validate-only contract passed and the Preview write gates were restored,
but the live lifecycle did not close because the remote canonical archive
column required for additive evidence and additive void is absent.
