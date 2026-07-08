# Access Snapshot DTO Step 2C Audit

Date: 2026-07-08

Status: foundation DTO/helper only. No migration. No production data write.

## Current Access Remark Parsing Locations

| Location | Current Role | Classification |
|---|---|---:|
| `modules/properties/ttlock-remark.mjs` | Reusable parser for existing remark tests and follow-up fixtures. | A/B |
| `deploy-worker/public/employee-v3.html` `parseLockRemark()` / `normalizeCard()` | Frontend card remark parsing for employee reference display and form prefill. | B/E |
| `deploy-worker/src/index.js` `buildAccessSnapshotDTO()` / `parseAccessCardRemark()` | New Step 2C runtime helper available for future Worker integration. Not wired into matching. | A |
| `modules/properties/access-snapshot.mjs` | New shared Access Snapshot DTO helper for tests and future imports. | A |

## Runtime Replacement Scope

No existing production matching path was replaced in Step 2C.

The Access Snapshot DTO is now available, but it does not yet replace:

- `transactions.tenant_card_id`
- `arrear_tasks.tenant_card_id`
- `deposit_ledger.tenant_card_id`
- employee frontend `tenant_card_id` hidden/reference fields
- owner/customer-code display adapters

This is intentional. Replacing those paths requires an authoritative customer/occupancy identity design.

## Access Snapshot ID

`access_snapshot_id` is runtime-only.

It is deterministic from:

- `property_id`
- `raw_remark`
- `synced_at`
- provider record id if supplied

No durable persistence was added. No schema migration was added.

## Provider Metadata Boundary

Provider metadata is preserved only under:

`non_authoritative_provider_metadata`

Examples:

- `card_id`
- `tenant_card_id`
- `hardware_card_id`
- `provider_phone`
- `provider_account_phone`
- `is_provider_phone_non_authoritative: true`

DTO business fields are limited to:

- `bed`
- `parsed_deposit_amount`
- `parsed_checkin_mmdd`
- `parsed_valid_until_mmdd`
- `parsed_business_note`
- `parse_status`
- `raw_remark`

Provider phone is not emitted as:

- customer phone
- tenant phone
- contact phone
- arrears follow-up phone
- checkout phone

## Remaining Legacy tenant_card_id Paths

| Location | Risk | Classification |
|---|---|---:|
| `deposit_ledger(corpid, tenant_card_id, ts)` and `empDepositBalance()` | Deposit matching still depends on legacy provider/customer reference. | D/E |
| `transactions.tenant_card_id` | Transaction audit/reference remains legacy. | A/D |
| `arrear_tasks.tenant_card_id` | Arrears display and legacy filtering still carry provider/customer reference. | D/E |
| employee frontend `tenantCardId` hidden field | Provider lookup/reference field still present. | A/B |
| bed transfer old access reference | Raw access audit context. | A |

## Provider Phone Leakage Check

No new Access Snapshot DTO business contact field accepts provider phone or `99099` phone.

Known older UI/display fields may still show normalized left-with-arrears phone from staff input. They are outside Step 2C unless sourced from provider metadata.

## Future Replacement Step

Next step should implement an authoritative occupancy/customer identity boundary:

1. Define `occupancy_session_id` or equivalent stable customer-stay identity.
2. Attach Access Snapshot DTO as contextual evidence, not identity.
3. Replace deposit and arrears matching from `tenant_card_id` to the authoritative identity.
4. Keep provider IDs only as lookup handles/raw audit metadata.

## Cutover Status

Production cutover remains `PRODUCTION_NO_GO`.

