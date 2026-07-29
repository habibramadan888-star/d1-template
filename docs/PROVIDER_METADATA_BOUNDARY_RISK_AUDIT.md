# Provider Metadata Boundary Risk Audit

Date: 2026-07-08

Scope: Step 2B non-authoritative provider metadata boundary for card ids and provider/card phones.

## Classification Key

- A: provider lookup handle / raw audit only
- B: display only
- C: business matching
- D: unsafe, must be deprecated later
- E: missing source authority marker

## Runtime Boundary Added

- `classifyProviderMetadataAuthority`
- `isNonAuthoritativeProviderPhone`
- `isProviderCardId`
- `sanitizeBusinessContactFromProviderMetadata`
- `assertNoProviderMetadataInBusinessIdentity`
- `buildSafeBusinessIdentityContext`

Canonical employee entry fingerprints are now server-derived and do not trust supplied `canonical_fingerprint` values. `source_fingerprint` values contaminated by provider metadata are suppressed.

## Current Usage Audit

| Location | Usage | Classification | Notes |
|---|---|---:|---|
| `deploy-worker/src/index.js` schema columns for `transactions.tenant_card_id`, `arrear_tasks.tenant_card_id`, `deposit_ledger.tenant_card_id` | legacy persisted provider/customer reference | D | Existing schema uses this as a customer/deposit key. No migration in Step 2B. |
| `deploy-worker/src/index.js` `empDepositBalance()` and `empDepositMove()` | deposit ledger keyed by `tenant_card_id` | D | Unsafe business matching, must be replaced by future authoritative customer/occupancy identity. |
| `deploy-worker/src/index.js` employee entry write path stores `tenant_card_id` on transactions and arrear tasks | audit/reference plus legacy matching | D | Kept unchanged except fingerprint guard. |
| `deploy-worker/src/index.js` `cloudArrearsBaseItem()` copies `tenant_card_id` | cloud arrears display/context and legacy ref | E | Source authority marker missing. Future step should separate provider ref from former customer identity. |
| `deploy-worker/src/index.js` bed transfer context uses `tenant_card_id` as old access ref | raw audit/context | A | Allowed when used as provider/access reference only. |
| `deploy-worker/src/index.js` `buildCanonicalEventFingerprint()` | employee duplicate/business fingerprint | A | Now server-derived from business fields and excludes provider metadata. |
| `deploy-worker/src/index.js` `buildEmployeeEntrySourceFingerprint()` | incoming source fingerprint | C | Guarded to suppress provider-contaminated values. |
| `deploy-worker/public/employee-v3.html` hidden/current card id fields | provider/card lookup and display context | A/B | Existing UI still carries values for reference and lookup. No broad UI rewrite in Step 2B. |
| `deploy-worker/public/employee-v3.html` left-with-arrears phone input | staff-entered business contact | A | Allowed when explicit employee input. Runtime normalization suppresses provider/99099 phones. |
| `deploy-worker/public/index-51-main.js` owner left-with-arrears phone display | business contact display | B/E | Relies on normalized anchors. Source authority marker should be made explicit in a future DTO. |
| Tests mentioning `tenant_card_id` fixtures | fixture coverage | A/B | Not production behavior. |

## NO-GO Assessment

No Step 2B NO-GO was triggered for canonical fingerprinting or duplicate guard scope.

Known unsafe legacy business matching remains in deposit ledger and some arrears/customer-code paths. Those require a later authoritative customer/occupancy identity design and are intentionally not migrated in this step.

## Follow-Up Required

1. Implement `access_snapshot` DTO to keep provider record ids separate from business identity.
2. Implement authoritative `occupancy_session_id` / customer identity for deposit and arrears.
3. Replace legacy `tenant_card_id` deposit matching with authoritative identity.
4. Add source authority markers to all customer/contact phone fields.
5. Run owner correction design before changing existing production data.

