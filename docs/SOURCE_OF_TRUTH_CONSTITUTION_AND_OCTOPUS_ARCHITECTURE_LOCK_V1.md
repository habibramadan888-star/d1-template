# Source Of Truth Constitution And Octopus Architecture Lock V1

Status: architecture audit only. No runtime code changed. No production data changed. No deploy. No migration. Production cutover = PRODUCTION_NO_GO.

## Constitution

Homelink must follow an octopus architecture:

- The center body / brain is the canonical truth layer.
- Each feature is a separate leg.
- No feature leg may use another feature leg as its source of truth.
- Every feature leg must connect directly to the canonical truth layer through an approved gateway.

There are only two true external input sources:

1. TTLock / Access Snapshot / card remark context.
2. Employee 7 Event Anchors: Rent, Arrears Payment, Deposit In, Deposit Out, Checkout, Expense, Bed Transfer.

After employee events are accepted by cloud, they become the Canonical Event Archive / Immutable History Ledger. This internal archive is the source of record. It is append-only in principle. Errors must be represented by correction, void, reversal, or adjustment anchors. Hard delete must not silently break employee state or projections.

Everything else is derived: owner history, employee current session display, arrears list, deposit balance, occupancy status, bed status, synced state, preview, WhatsApp export, reports, and financial totals.

## Architecture Rules

1. UI features must not use other UI features as truth.
2. Employee app must not use owner history display text as write source.
3. Owner app must not use employee local cache as truth.
4. Arrears Payment must use canonical arrears_ref, not card identity.
5. Deposit must use deposit_ref / future occupancy_session_id, not tenant_card_id.
6. Bed Transfer must use from_bed / to_bed / occupancy relationship, not old_ttlock_ref.
7. Synced must mean cloud confirms the record currently exists and matches.
8. localStorage / IndexedDB / memory are draft/cache only.
9. TTLock provider metadata is context only, never durable identity.
10. Projection data must be rebuildable from canonical event archive.
11. Feature-to-feature dependency is forbidden unless it goes through an approved canonical gateway.

## Canonical Layers

| Layer | Name | Allowed contents | Not allowed |
|---|---|---|---|
| L0 | External Input Sources | Access Snapshot / card remark context; Employee 7 Event Anchors before cloud acceptance | owner history display text; WhatsApp text; local cache as truth |
| L1 | Canonical Event Archive | cloud accepted sessions, embedded ENTRY ANCHORS JSON, correction anchors, void/reversal anchors | silent mutation as business correction; hard delete as undisclosed state change |
| L2 | Derived Projections | arrears projection, deposit projection, occupancy projection, owner finance projection, employee context projection | independent business truth; UI text parsing as primary source |
| L3 | Canonical Gateways | Bed Context Gateway, Arrears Gateway, Deposit Gateway, Occupancy Gateway, Upload Gateway, Sync State Gateway, Owner History Gateway | direct feature-to-feature truth reads |
| L4 | Feature Legs | employee forms, owner dashboard, preview, WhatsApp export, reports, current session UI | durable identity or financial truth stored only in UI state |

## Approved Gateways

| Gateway | Reads from | Writes to | Purpose | Current status |
|---|---|---|---|---|
| Bed Context Gateway | L0 Access Snapshot + L2 occupancy/bed projections | none | provide bed/card/context strip without making provider metadata identity | PARTIAL |
| Arrears Gateway | L1 Event Archive + L2 arrears projection | L1 through accepted Arrears Payment anchors only | expose open/partial arrears by arrears_ref | PARTIAL |
| Deposit Gateway | L1 Event Archive + L2 deposit projection | L1 through Deposit In/Out anchors only | expose deposit balance and deposit history | FAIL, legacy tenant_card_id dependency remains |
| Occupancy Gateway | L1 Event Archive + L2 occupancy projection | L1 through event anchors/corrections only | resolve customer-stay relationship and bed movement | PARTIAL |
| Upload Gateway | L0 employee draft anchors -> server validation -> L1 archive | L1 accepted sessions | validate and accept employee events | PARTIAL |
| Sync State Gateway | L1 archive + correction/void/delete state | none | decide Synced / Cloud Missing / Needs Review | PARTIAL |
| Owner History Gateway | L1 archive + L2 correction-aware projections | none | display history/detail without becoming write source | PARTIAL |

## Feature Dependency Audit

### Employee Side

| Function / component / file | Reads from | Writes to | Reads another feature? | Local cache as truth? | Owner history as truth? | TTLock as identity? | Writes canonical payload? | Affects projection? | Affects synced state? | Allowed source | Current source | Status | Required fix |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Reload Cards, employee-v3.html | L0 Access Snapshot / card context | local cache only | no | no, if display/cache only | no | risk if card fields reused | no | no | no | Bed Context Gateway | raw card context + cache | PARTIAL | route all bed context through Bed Context Gateway and label provider metadata non-authoritative |
| Rent form, employee-v3.html | employee inputs + bed context | draft entry, Upload Gateway | no | draft only | no | should not | yes | yes after upload | yes after upload | Upload Gateway | event-specific builder + firewall | PASS | keep firewall and dry-run server validation |
| Arrears Payment form, employee-v3.html | Arrears Gateway projection by arrears_ref | draft entry, Upload Gateway | no | draft only | no | recent contamination fixed by firewall | yes | yes after upload | yes after upload | Arrears Gateway + Upload Gateway | projection task + sanitizer | PARTIAL | live retest 611 AP upload and keep AP matching by arrears_ref only |
| Refresh Arrears, employee-v3.html | Arrears Gateway | local view state | no | no | no | no | no | no | may mark stale | Arrears Gateway | /api/arrear_tasks / projection | PARTIAL | ensure stale selected refs are cleared only from gateway result |
| Deposit In form, employee-v3.html | employee inputs + future Deposit Gateway | draft entry, Upload Gateway | no | draft only | no | must not | yes | yes after upload | yes after upload | Deposit Gateway + Upload Gateway | event-specific builder + contract | PARTIAL | introduce deposit_ref/occupancy context, not tenant_card_id |
| Deposit Out form, employee-v3.html | Deposit Gateway + Arrears Gateway | draft entry, Upload Gateway | no | draft only | no | must not | yes | yes after upload | yes after upload | Deposit Gateway + Arrears Gateway | event-specific builder, legacy balance lookup risk | PARTIAL | replace legacy balance lookup with canonical Deposit Gateway |
| Checkout form, employee-v3.html | Occupancy Gateway + Deposit Gateway + Arrears Gateway | draft entry, Upload Gateway | no | draft only | no | must not | yes | yes after upload | yes after upload | Occupancy/Deposit/Arrears Gateways | event-specific builder + left-with-arrears fields | PARTIAL | require gateway-backed open arrears and deposit context |
| Expense form, employee-v3.html | employee inputs | draft entry, Upload Gateway | no | draft only | no | no | yes | owner finance after upload | yes after upload | Upload Gateway | event-specific builder + contract | PASS | maintain evidence rule and cost-only classification |
| Bed Transfer form, employee-v3.html | Occupancy Gateway + bed context | draft entry, Upload Gateway | no | draft only | no | old_ttlock_ref risk blocked by firewall | yes | yes after upload | yes after upload | Occupancy Gateway + Upload Gateway | event-specific builder + firewall | PARTIAL | carry deposit/arrears/rent coverage through Occupancy Gateway |
| Preview | draft anchors + dry-run preview | no durable write | no | draft only | no | must not | no | no | no | Upload Gateway dry-run | dry-run preview | PASS | keep no-write proof and never use preview as upload truth |
| WhatsApp Export | canonical normalized anchors after accepted/synced session | clipboard/export text only | no | must not be truth | no | no | no | no | no | L1/L2 display projection | normalized anchors/export compiler | PARTIAL | enable only after upload success/cloud confirmation |
| Upload Session | draft anchors -> server validation | L1 cloud accepted session | no | no | no | must not | yes | yes | yes | Upload Gateway | server dry-run then upload | PARTIAL | ensure all seven payloads pass firewall and server dry-run before write |
| Synced state | Sync State Gateway | local status display | no | historical issue: local flag risk | no | no | no | no | yes | L1 cloud confirmation | cloud-authoritative reconciliation | PARTIAL | keep cloud confirmation required and handle hard delete/void/correction |
| Undo | local draft/cache | local draft/cache | no | draft only | no | no | no | no | yes local only | local draft only | local draft | PASS | never undo accepted cloud facts; use correction/void instead |
| Remove Invalid Record | local draft/cache | local draft/cache | no | draft only | no | no | no | no | yes local only | local draft only | local draft | PASS | only remove local invalid records before upload |
| Copy Diagnostic JSON | validation/gateway response | clipboard only | no | no | no | no | no | no | no | diagnostic response | validation response | PASS | redact secrets and keep no-write |
| local draft/cache | employee draft state | browser storage/memory | no | yes if misused | no | possible if raw cards copied | no | no | yes if misused | draft/cache only | localStorage / memory | PARTIAL | source-of-truth firewall plus cloud reconciliation for persisted facts |

### Owner Side

| Function / component / file | Reads from | Writes to | Reads another feature? | Local cache as truth? | Owner history as truth? | TTLock as identity? | Writes canonical payload? | Affects projection? | Affects synced state? | Allowed source | Current source | Status | Required fix |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| session list | L1 sessions + L2 summary | none | no | no | display only | no | no | no | no | Owner History Gateway | /api/history | PARTIAL | keep list display non-authoritative |
| session detail | L1 session anchors + correction-aware L2 | none | no | no | display only | no | no | no | no | Owner History Gateway | /api/session_detail opt-in corrections | PARTIAL | keep additive correction fields and raw rows visible |
| delete / void / correction | owner action + correction anchors | L1 correction/void anchors only | no | no | no | no | yes, correction anchor | yes | yes | correction gateway | correction apply disabled except gated one-time flow | PARTIAL | forbid hard delete as silent business correction; require correction anchor |
| finance summary | L1 accepted sessions + L2 owner finance projection | none | no | no | no | no | no | no | no | owner finance projection | sessions summary/current period fixes | PARTIAL | avoid transactions/entry_events stale aggregators |
| arrears display | L2 arrears projection | none | no | no | no | no | no | no | no | Arrears Gateway | materialized plus projection | PARTIAL | ensure rebuild from L1 anchors and corrections |
| deposit display | L2 deposit projection | none | no | no | no | legacy risk | no | no | no | Deposit Gateway | legacy tenant_card_id paths remain | FAIL | replace tenant_card_id ledger identity with deposit_ref/occupancy context |
| history parser | L1 embedded anchors; text fallback only for old compatibility | none | no | no | display parser only | no | no | no | no | Owner History Gateway | structured anchors preferred, parser fallback | PARTIAL | keep text fallback non-authoritative |
| correction-aware totals | L1 source anchors + correction anchors | none | no | no | no | no | no | derived totals | no | correction-aware projection | H4B detail opt-in | PARTIAL | propagate correction-aware projections to all owner summaries when approved |

### Projections

| Projection | Reads from | Writes to | Reads another feature? | Uses UI output as truth? | TTLock as identity? | Allowed source | Current source | Status | Required fix |
|---|---|---|---|---|---|---|---|---|---|
| arrears projection | L1 Rent short-paid, Left With Arrears, Arrears Payment, correction anchors | derived response/materialized task | no | no | no | canonical anchors and correction anchors | materialized plus projection | PARTIAL | make projection fully rebuildable and correction-aware |
| deposit projection | L1 Deposit In/Out, Checkout, Bed Transfer, correction anchors | derived balance/history | no | no | legacy risk | canonical deposit_ref/occupancy context | legacy tenant_card_id paths remain | FAIL | implement Deposit Gateway and phase out tenant_card_id identity |
| rent income projection | L1 Rent anchors + corrections | derived finance totals | no | no | no | canonical Rent anchors | owner-visible sessions summary | PARTIAL | keep correction-aware and period-scoped |
| cash/bank projection | L1 financial anchors + corrections | derived cash/bank totals | no | no | no | canonical financial effect | session summary + corrections | PARTIAL | ensure deposits, refunds, expenses, fees classified separately |
| occupancy projection | L1 Rent, Checkout, Bed Transfer, Left With Arrears, correction anchors | derived occupancy state | no | no | provider metadata context only | occupancy_session_id future / candidate now | candidate metadata only | PARTIAL | implement durable occupancy gateway when approved |
| bed status projection | L0 Access Snapshot + L1 occupancy events | derived bed status | no | no | no | Bed Context + Occupancy Gateway | mixed card context and events | PARTIAL | separate access-card state from occupancy truth |

## Required Source Matrix By Business Fact

| Business fact | Allowed source | Current actual source | Forbidden source risk | Status | Recommended fix |
|---|---|---|---|---|---|
| event_type | employee selected event + dispatch classifier | event-specific classifier | rent fallback previously fixed | PASS | keep unknown/missing rejection |
| bed | employee event field / Access Snapshot as context | event fields + card context | card_id as bed identity | PARTIAL | route through Bed Context Gateway |
| rent amount | Rent anchor | Rent form/anchor | owner display text | PASS | keep server validation |
| expected rent | Rent anchor / approved rent config context | Rent form/anchor | access-card text as financial truth | PASS | keep explicit expected_rent |
| rent period | Rent anchor | Rent form/anchor | card validity as rent truth | PASS | compare only, do not equate |
| short-paid arrears | Rent anchor -> arrears projection | Rent short-paid anchor | duplicate rent auto-close | PARTIAL | keep AP-only settlement rule |
| arrears_ref | Arrears Gateway / canonical arrears projection | arrear_tasks/projection | tenant_card_id, card_id, old_ttlock_ref | PARTIAL | live retest AP after firewall |
| arrears remaining | Arrears projection rebuilt from L1 | materialized plus projection | future receivable | PARTIAL | correction-aware rebuild |
| deposit_required_total | Deposit In anchor | Deposit In contract | access remark as ledger truth | PARTIAL | Deposit Gateway |
| deposit_paid_amount | Deposit In anchor | Deposit In contract | rent income merge | PASS | keep separate Deposit In anchor |
| deposit_remaining | Deposit projection | Deposit In contract + legacy | tenant_card_id ledger identity | FAIL | deposit_ref/occupancy context |
| refund amount | Deposit Out anchor | Deposit Out contract | owner text | PASS | require balance/override reason |
| deposit balance | Deposit projection | legacy and event fields | tenant_card_id | FAIL | Deposit Gateway replacement |
| checkout status | Checkout anchor + occupancy projection | Checkout contract | access-card status only | PARTIAL | Occupancy Gateway |
| open arrears status | Arrears projection | Arrears Gateway | owner card text | PARTIAL | projection from canonical anchors only |
| expense evidence | Expense anchor | Expense contract | local attachment label only | PARTIAL | evidence_ref storage gateway later |
| transfer from_bed/to_bed | Bed Transfer anchor | Bed Transfer contract | old_ttlock_ref | PASS | keep old_ttlock_ref stripped |
| transfer carryover fields | Occupancy projection + Bed Transfer anchor | contract only | bed-only matching | PARTIAL | Occupancy Gateway |
| synced status | Sync State Gateway cloud confirmation | reconciliation implemented/tested | localStorage flag | PARTIAL | live verify deletion/reconcile flows |
| duplicate status | canonical fingerprint + source/event ids | duplicate guard | UI status/local synced | PARTIAL | keep provider fields excluded |
| owner history totals | L1/L2 correction-aware projections | sessions/detail projections | parsed display text | PARTIAL | correction-aware totals everywhere |
| employee handover totals | accepted session anchors/summaries | employee session payload/export | WhatsApp text as truth | PARTIAL | compiler from canonical anchors |

## Violation Register

### Feature-to-feature dependency violations

- Potential: employee AP must not read owner history text as arrears source. Current approved path is Arrears Gateway; continue enforcing.
- Potential: preview/export must never become upload truth. Current path should remain dry-run/display only.
- Potential: owner finance summaries must not depend on owner UI detail parser; use canonical sessions/projections.

### Local cache truth violations

- Historical: employee local Synced remained after owner-side deletion. Status must remain cloud-authoritative.
- Risk: local drafts/current session may contain stale refs. Refresh gateways must clear stale refs before upload.
- Risk: localStorage/IndexedDB should never block or prove cloud persistence alone.

### Owner history truth violations

- Risk: owner history parser fallback is needed for legacy display but must not be a write source.
- Risk: employee app must not use owner history display rows for repayment/deposit identity.

### TTLock identity violations

- Fixed/guarded by firewall: AP payload must strip tenant_card_id, old_ttlock_ref, card_id, provider phone, 99099 phone.
- Deferred/partial: deposit ledger still has tenant_card_id replacement risk until Deposit Gateway exists.
- Risk: bed/occupancy context may still display Access Snapshot metadata; display-only is safe, matching identity is forbidden.

### Projection source violations

- Deposit projection has highest risk because legacy tenant_card_id paths remain.
- Arrears projection is partial until fully correction-aware and rebuildable only from L1 anchors.
- Occupancy projection is partial because durable occupancy_session_id is not implemented.

### Sync-state truth violations

- Synced must never be based only on local uploaded flag.
- Deleted/voided/corrected cloud records must render Cloud Missing / Voided / Corrected / Needs Review, not Synced.

## Current Status Summary

| Area | Status | Reason |
|---|---|---|
| deposit identity status | DEPOSIT_IDENTITY_PARTIAL | deposit_ref/occupancy context not fully replacing legacy tenant_card_id paths |
| arrears source status | PARTIAL | arrears_ref/projection path exists, but live AP retest after firewall still required |
| employee app source status | PARTIAL | source firewall added, but gateway architecture not complete |
| owner app source status | PARTIAL | correction-aware detail exists, broader summaries/projections still partial |
| should continue real testing | no | gateway boundaries should be locked before continuing broad event testing |

## Minimal Architecture Fix Roadmap

1. Implement canonical Gateway interfaces and route each feature leg through them: Bed Context, Arrears, Deposit, Occupancy, Upload, Sync State, Owner History.
2. Replace Deposit legacy tenant_card_id identity with deposit_ref / occupancy_candidate_id / future occupancy_session_id, keeping old data compatibility read-only.
3. Make all projections rebuild from L1 canonical event archive plus correction/void/reversal anchors, not UI output.
4. Enforce cloud-authoritative Sync State Gateway for load, pre-upload, post-upload, delete/void/correction reconciliation.
5. Add contract tests that fail any direct feature-to-feature truth dependency or forbidden provider identity persistence.
