# Employee 7 Event Closed-Loop Test Matrix V1

Status: audit and test matrix only. No runtime behavior changed. No production data changed. No deploy. No migration. Production cutover = PRODUCTION_NO_GO.

This document audits whether each employee Entry event type is covered across the full closed loop:

Employee input -> backend validation -> dry-run preview -> real upload -> Owner History list -> Owner History detail -> ENTRY ANCHORS JSON -> financial/projection side effects -> duplicate/correction compatibility -> provider metadata boundary -> old data compatibility.

## Status Labels

| Label | Meaning |
|---|---|
| LIVE_VERIFIED | The exact production UI/API flow was verified with live evidence. |
| TEST_PASS_ONLY | Automated/local/fixture tests cover the behavior, but no live production evidence exists. |
| PARTIAL | Some important layers are covered, but at least one required closed-loop layer is missing or only fixture-tested. |
| NOT_TESTED | No meaningful direct test evidence was found for this event/layer. |
| BLOCKED | Verification cannot proceed until an upstream blocker is resolved. |

## Required Audit Dimensions

1. Employee input fields covered
2. Backend validation covered
3. Dry-run preview covered
4. Real upload covered
5. Owner History list covered
6. Owner History detail covered
7. ENTRY ANCHORS JSON covered
8. Financial totals covered
9. Arrears/deposit/checkout projection covered if applicable
10. Duplicate guard covered
11. Correction/void/reversal covered
12. Provider metadata/card_id/tenant_card_id/99099 forbidden identity covered
13. Old data compatibility covered
14. Live verified / test only / not covered status

## Overall Matrix

| Event | Closed-loop status | Strongest evidence | Highest missing coverage |
|---|---|---|---|
| Rent | LIVE_VERIFIED | Bed `411` real upload, expected `730`, paid `730`, owner history visible; x6wio duplicate guard and correction chain completed. | Additional live variants for short-paid rent plus correction-aware owner detail regression after future changes. |
| Arrears Payment | PARTIAL | x6wio `80 AED` arrears_payment was preserved through correction; dry-run preview and correction chain verified. | Standalone clean repayment upload, settlement update, owner detail, and projection update need a dedicated live matrix. |
| Deposit In | PARTIAL | Contract, metadata, dry-run/fixture coverage exists. | Real upload, owner history list/detail, deposit projection, duplicate guard, and correction coverage are not live verified. |
| Deposit Out | PARTIAL | Contract, event-specific form intent, and fixture coverage exists. | Real upload, difference-reason enforcement, arrears block, owner detail, deposit projection, and correction coverage are not live verified. |
| Checkout | PARTIAL | Contract, left-with-arrears/cloud-arrears fixture coverage exists. | Normal checkout real upload, open-arrears owner approval path, left-with-arrears real upload, owner detail, and projection behavior are not live verified. |
| Expense | PARTIAL | Contract, metadata, dry-run/fixture coverage exists. | Real upload, owner list/detail, financial totals, duplicate guard, and correction coverage are not live verified. |
| Bed Transfer | PARTIAL | Bed Transfer dry-run preview is LIVE_VERIFIED; dispatch and fee normalization were verified. | Real upload closed loop, owner list/detail, transfer financial totals, duplicate guard, and correction coverage are not live verified. |

## Event Detail Matrix

### 1. Rent

| Dimension | Coverage |
|---|---|
| Employee input fields covered | LIVE_VERIFIED for a normal rent upload: bed `411`, expected `730`, paid `730`. TEST_PASS_ONLY for short-paid preservation and field variants. |
| Backend validation covered | LIVE_VERIFIED for accepted normal rent dry-run/upload path. TEST_PASS_ONLY for duplicate and short-paid branches outside the cited live flow. |
| Dry-run preview covered | LIVE_VERIFIED for rent dry-run preview in Step 2F. |
| Real upload covered | LIVE_VERIFIED for bed `411` rent upload. |
| Owner History list covered | LIVE_VERIFIED: owner history visible for bed `411` upload. |
| Owner History detail covered | PARTIAL: employee-entry owner detail parsing has fixture coverage and multiple live detail checks, but this exact `411` detail was not separately documented in the current proof pack. |
| ENTRY ANCHORS JSON covered | LIVE_VERIFIED: `occupancy_candidate_metadata` present in embedded ENTRY ANCHORS JSON block for `S20260708-4fjda` / `EMPV3-20260708-abdul-4fjda`. |
| Financial totals covered | LIVE_VERIFIED for `730` expected/paid unchanged in bed `411` upload. |
| Arrears/deposit/checkout projection covered if applicable | PARTIAL: short-paid arrears creation was live verified separately for bed `334`; the clean rent `411` flow has no projection side effect. |
| Duplicate guard covered | LIVE_VERIFIED: duplicate guard dry-run caught x6wio duplicate records before writes. |
| Correction/void/reversal covered | LIVE_VERIFIED for x6wio additive correction chain affecting duplicate rent rows. Reversal is not yet live verified. |
| Provider metadata/card_id/tenant_card_id/99099 forbidden identity covered | LIVE_VERIFIED for bed `411` metadata markers excluding forbidden inputs. |
| Old data compatibility covered | LIVE_VERIFIED through owner parser regression checks and x6wio correction-aware detail behavior. |
| Live verified / test only / not covered status | LIVE_VERIFIED overall, with noted gaps for additional variants. |

### 2. Arrears Payment

| Dimension | Coverage |
|---|---|
| Employee input fields covered | PARTIAL: UI lookup for live bed `334` arrears was verified, but a clean standalone repayment upload was not performed in this matrix. |
| Backend validation covered | TEST_PASS_ONLY/PARTIAL: projection ref validation and stale ref tests exist; clean live repayment validation is missing. |
| Dry-run preview covered | LIVE_VERIFIED for Arrears Payment dry-run preview in Step 2F. |
| Real upload covered | PARTIAL: x6wio `80 AED` arrears_payment exists and was preserved, but it is part of a correction incident rather than a clean standalone repayment verification. |
| Owner History list covered | PARTIAL: x6wio owner-visible chain confirms preservation, but standalone repayment list verification is missing. |
| Owner History detail covered | PARTIAL: correction-aware detail keeps the `80 AED` arrears_payment adjusted result; standalone detail verification is missing. |
| ENTRY ANCHORS JSON covered | TEST_PASS_ONLY/PARTIAL: fixture/parser tests cover arrears_payment anchors; live clean repayment anchor proof is missing. |
| Financial totals covered | LIVE_VERIFIED within x6wio adjusted result: adjusted arrears_repaid = `80`. |
| Arrears/deposit/checkout projection covered if applicable | PARTIAL: bed `334` open arrears lookup is live verified before repayment; repayment settlement projection update is not live verified. |
| Duplicate guard covered | PARTIAL: mixed duplicate batch guard is live verified; duplicate handling for pure arrears_payment batch is not separately live verified. |
| Correction/void/reversal covered | LIVE_VERIFIED for x6wio correction preserving the real `80 AED` arrears payment. Reversal is not live verified. |
| Provider metadata/card_id/tenant_card_id/99099 forbidden identity covered | TEST_PASS_ONLY via provider boundary and metadata tests. |
| Old data compatibility covered | LIVE_VERIFIED through x6wio correction-aware detail and old detail compatibility checks. |
| Live verified / test only / not covered status | PARTIAL. |

### 3. Deposit In

| Dimension | Coverage |
|---|---|
| Employee input fields covered | TEST_PASS_ONLY: contract and template tests cover required fields. |
| Backend validation covered | TEST_PASS_ONLY. |
| Dry-run preview covered | TEST_PASS_ONLY: dry-run preview contract includes Deposit In. |
| Real upload covered | NOT_TESTED: no live real upload proof found. |
| Owner History list covered | NOT_TESTED for a live Deposit In session. |
| Owner History detail covered | PARTIAL: employee-entry decoder fixtures include deposit-like rendering, but no live Deposit In detail proof. |
| ENTRY ANCHORS JSON covered | TEST_PASS_ONLY through anchor/metadata tests. |
| Financial totals covered | TEST_PASS_ONLY. |
| Arrears/deposit/checkout projection covered if applicable | PARTIAL: deposit projection/balance behavior is not live verified. |
| Duplicate guard covered | TEST_PASS_ONLY/NOT_TESTED for Deposit In-specific duplicate behavior. |
| Correction/void/reversal covered | NOT_TESTED for Deposit In-specific correction. |
| Provider metadata/card_id/tenant_card_id/99099 forbidden identity covered | TEST_PASS_ONLY. |
| Old data compatibility covered | TEST_PASS_ONLY through owner parser compatibility tests. |
| Live verified / test only / not covered status | PARTIAL. |

### 4. Deposit Out

| Dimension | Coverage |
|---|---|
| Employee input fields covered | TEST_PASS_ONLY/PARTIAL: event-specific form requirements are documented/tested, including actual refund and difference reason intent. |
| Backend validation covered | TEST_PASS_ONLY/PARTIAL: no live validation proof for difference reason and arrears block. |
| Dry-run preview covered | TEST_PASS_ONLY: dry-run preview contract includes Deposit Out. |
| Real upload covered | NOT_TESTED: no live real upload proof found. |
| Owner History list covered | NOT_TESTED for a live Deposit Out session. |
| Owner History detail covered | PARTIAL: decoder compatibility exists, but no live Deposit Out detail proof. |
| ENTRY ANCHORS JSON covered | TEST_PASS_ONLY. |
| Financial totals covered | TEST_PASS_ONLY/PARTIAL: refund effect needs live verification. |
| Arrears/deposit/checkout projection covered if applicable | PARTIAL: deposit balance and open arrears block need live closed-loop proof. |
| Duplicate guard covered | NOT_TESTED for Deposit Out-specific duplicate behavior. |
| Correction/void/reversal covered | NOT_TESTED for Deposit Out-specific correction. |
| Provider metadata/card_id/tenant_card_id/99099 forbidden identity covered | TEST_PASS_ONLY. |
| Old data compatibility covered | TEST_PASS_ONLY. |
| Live verified / test only / not covered status | PARTIAL. |

### 5. Checkout

| Dimension | Coverage |
|---|---|
| Employee input fields covered | TEST_PASS_ONLY/PARTIAL: normal checkout and Left With Arrears fields have fixture coverage, but live UI closed-loop proof is missing. |
| Backend validation covered | TEST_PASS_ONLY/PARTIAL: open-arrears block and left-with-arrears validation are test-covered, not live upload verified. |
| Dry-run preview covered | TEST_PASS_ONLY: dry-run preview contract includes normal Checkout and Left With Arrears. |
| Real upload covered | NOT_TESTED: no live normal checkout or left-with-arrears upload proof found. |
| Owner History list covered | NOT_TESTED for live checkout. |
| Owner History detail covered | PARTIAL: decoder fixtures include checkout fields; live detail proof is missing. |
| ENTRY ANCHORS JSON covered | TEST_PASS_ONLY. |
| Financial totals covered | TEST_PASS_ONLY/PARTIAL: checkout financial effect is not live verified. |
| Arrears/deposit/checkout projection covered if applicable | PARTIAL: cloud arrears customer-left and belongings metadata tests exist; live projection behavior is missing. |
| Duplicate guard covered | NOT_TESTED for Checkout-specific duplicate behavior. |
| Correction/void/reversal covered | NOT_TESTED for Checkout-specific correction. |
| Provider metadata/card_id/tenant_card_id/99099 forbidden identity covered | TEST_PASS_ONLY. |
| Old data compatibility covered | TEST_PASS_ONLY. |
| Live verified / test only / not covered status | PARTIAL. |

### 6. Expense

| Dimension | Coverage |
|---|---|
| Employee input fields covered | TEST_PASS_ONLY through contract/template coverage. |
| Backend validation covered | TEST_PASS_ONLY. |
| Dry-run preview covered | TEST_PASS_ONLY: dry-run preview contract includes Expense. |
| Real upload covered | NOT_TESTED: no live Expense upload proof found. |
| Owner History list covered | NOT_TESTED for a live Expense session. |
| Owner History detail covered | PARTIAL: employee-entry decoder fixtures include expense detail rendering. |
| ENTRY ANCHORS JSON covered | TEST_PASS_ONLY. |
| Financial totals covered | TEST_PASS_ONLY/PARTIAL: expense total effect requires live closed-loop verification. |
| Arrears/deposit/checkout projection covered if applicable | Not applicable except financial summary; no projection-specific live requirement. |
| Duplicate guard covered | NOT_TESTED for Expense-specific duplicate behavior. |
| Correction/void/reversal covered | NOT_TESTED for Expense-specific correction. |
| Provider metadata/card_id/tenant_card_id/99099 forbidden identity covered | TEST_PASS_ONLY. |
| Old data compatibility covered | TEST_PASS_ONLY. |
| Live verified / test only / not covered status | PARTIAL. |

### 7. Bed Transfer

| Dimension | Coverage |
|---|---|
| Employee input fields covered | LIVE_VERIFIED for dry-run preview inputs from_bed `145`, to_bed `146`; TEST_PASS_ONLY for current session append and UI field stability. |
| Backend validation covered | LIVE_VERIFIED for dry-run preview dispatch and fee normalization; real upload validation is not live verified. |
| Dry-run preview covered | LIVE_VERIFIED. |
| Real upload covered | NOT_TESTED: no live Bed Transfer real upload proof found. |
| Owner History list covered | NOT_TESTED for live Bed Transfer upload. |
| Owner History detail covered | PARTIAL: employee-entry decoder fixtures can render bed_transfer details. |
| ENTRY ANCHORS JSON covered | TEST_PASS_ONLY/PARTIAL: fixtures cover from_bed/to_bed/fee metadata; live uploaded anchor proof is missing. |
| Financial totals covered | TEST_PASS_ONLY/PARTIAL: transfer fee financial effect is not live verified through upload. |
| Arrears/deposit/checkout projection covered if applicable | PARTIAL: occupancy candidate preview is live verified; durable projection side effects are not expected in dry-run. |
| Duplicate guard covered | NOT_TESTED for Bed Transfer-specific duplicate behavior. |
| Correction/void/reversal covered | NOT_TESTED for Bed Transfer-specific correction, though correction contract explicitly preserves from/to audit expectations. |
| Provider metadata/card_id/tenant_card_id/99099 forbidden identity covered | LIVE_VERIFIED in dry-run preview: forbidden inputs were false. |
| Old data compatibility covered | TEST_PASS_ONLY through owner parser compatibility tests. |
| Live verified / test only / not covered status | PARTIAL. |

## Highest-Risk Missing Tests

1. Arrears Payment standalone clean repayment: select an open projection arrears ref, dry-run, upload, owner list/detail, projection settlement update, and WhatsApp export.
2. Deposit Out closed loop: deposit balance read, actual refund, required difference reason, open-arrears block, upload, owner detail, and deposit projection.
3. Checkout closed loop: normal checkout without arrears, checkout with open arrears blocked, owner approval path, and Left With Arrears real upload/projection.
4. Deposit In closed loop: real upload, deposit balance projection, owner list/detail, and financial totals.
5. Expense closed loop: real upload, owner list/detail, expense totals, and correction readiness.
6. Bed Transfer real upload closed loop: from/to/fee/reason anchor, owner list/detail, financial totals, and correction readiness.
7. Rent variant regression: short-paid rent with cloud arrears plus correction-aware owner detail after future changes.

## Recommended Next Test Order

1. Arrears Payment clean repayment closed loop.
2. Deposit Out event-specific closed loop.
3. Checkout normal/open-arrears/Left With Arrears closed loop.
4. Deposit In closed loop.
5. Expense closed loop.
6. Bed Transfer real upload closed loop.
7. Rent variant regression suite.

## Final Audit Summary

| Event | Final status |
|---|---|
| Rent | LIVE_VERIFIED |
| Arrears Payment | PARTIAL |
| Deposit In | PARTIAL |
| Deposit Out | PARTIAL |
| Checkout | PARTIAL |
| Expense | PARTIAL |
| Bed Transfer | PARTIAL |

7-event audit result: TEST_PASS_ONLY for the matrix document; NOT_LIVE_VERIFIED for any new evidence because this task did not run live production flows.

Runtime behavior changed: no

Production data changed: no

Deploy: no

Migration: no

Production cutover: PRODUCTION_NO_GO
