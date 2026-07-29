# Ledger Parser Calculation Root Audit

Date: 2026-07-03
Branch: fix/auth-closure-001
Scope: read-only audit of pasted financial handover TXT parsing and amount calculation.

No code change, deployment, D1 write, migration, write gate, UI fix, or financial formula change was performed.

Production cutover remains `PRODUCTION_NO_GO`.

## 1. Parser Path

| Item | Current Implementation |
|---|---|
| UI page | `deploy-worker/public/index-51.html`, paste area `#pasteArea`, button `#btnPaste` |
| Main parser file | `deploy-worker/public/index-51-main.js` |
| Paste entry function | `onPaste()` |
| Import splitter | `tryAdd(text)` |
| Parser entry function | `parseTXT(text)` |
| Continuation-note pre-parser | `applySpokenContinuation(entry, line, sessionDate)` |
| Cash section parser | `parseTXT()` section state `cat='cash'`; no separate cash parser function |
| Bank section parser | `parseTXT()` section state `cat='bank'`; no separate bank parser function |
| Deposit refund parser | `parseTXT()` section state `cat='refund'`; no separate refund parser function |
| Expense parser | `parseTXT()` section state `cat='expense'`; has a specific expense branch before common row parsing |
| Summary calculation | `totals(entries)` |
| Rendering path | `renderSummary()` and analysis/history renderers use `totals()` |

Related backend totals modules exist (`modules/finance/handover.mjs`, `modules/finance/backend-totals.mjs`), but this pasted TXT import path is currently parsed client-side in `deploy-worker/public/index-51-main.js`.

## 2. Section Detection Logic

`parseTXT()` keeps a mutable `cat` section state.

| Section | Detection Rule |
|---|---|
| Cash | Line contains `💵`, or matches `现金收款` and contains `笔`, or matches `STATEMENT`, or starts with `CASH` |
| Bank | Line contains `🏦`, or matches `银行转账` and contains `笔`, or matches `BANK TRANSFER` |
| Deposit refund | Line contains `💸`, or matches `押金退款` and contains `笔`, or matches English `DEPOSIT RETURN` variants |
| Expense | Line contains `📤`, or matches `其他支出` and contains `笔`, or starts with `USED` / `EXPENSE` |

Findings:

- The parser does not require emoji when the Chinese section title contains `笔`.
- The parser does depend on `笔` for Chinese section-title fallback.
- The parser does not use `8笔`, `3笔`, `2笔`, or `1笔` as a validated count. It only uses the presence of `笔` to identify the section.
- Header summary lines such as `现金结余 4,455.00 AED` and `总收入 7,020.00 AED` are intentionally skipped before section detection.

## 3. Row Parsing Logic

After section detection, `parseTXT()` tries these money-row patterns:

| Pattern | Meaning |
|---|---|
| `compact` | `room type amount note`, e.g. `#911 T 50.00 note` |
| `amountFirst` | `room amount type note`, e.g. `#911 50.00 O note` |
| `paid` | `room paid amount Old/New note` |
| `fallback` | `room amount note`, defaulting tag to `Old` unless note starts with `O/N/T/Old/New/Transfer` |

Important behavior:

- `#911-831` is accepted by the row regex because `\S+` accepts hyphenated tokens.
- `#911-831` is not treated as a numeric range by the current regex.
- `#911→831` is supported as a transfer bed pair only when an amount row pattern also matches.
- `#911→831 T 豁免 ...` has no amount, so it is not a money row.
- The line `#911-831 500.00 O was balance from rent` should match the `amountFirst` money-row regex, but it never reaches that regex because `applySpokenContinuation()` runs first.

## 4. Per-Line Parse Result

| Raw Line | Detected Section | Parsed Bed | Parsed Amount | Parsed Type | Included In Cash | Included In Bank | Included In Refund | Included In Expense | Skip Reason |
|---|---|---:|---:|---|---|---|---|---|---|
| `#224 800.00 O` | cash | 224 | 800.00 | Old | yes | no | no | no | |
| `#627 680.00 O` | cash | 627 | 680.00 | Old | yes | no | no | no | |
| `#636 730.00 O` | cash | 636 | 730.00 | Old | yes | no | no | no | |
| `#8513 700.00 O` | cash | 8513 | 700.00 | Old | yes | no | no | no | |
| `#842 750.00 O` | cash | 842 | 750.00 | Old | yes | no | no | no | |
| `#911-831 500.00 O was balance from rent` | cash |  |  |  | no | no | no | no | `applySpokenContinuation()` sees `balance` and appends a note to previous `#842` instead of parsing a new row |
| `#855 700.00 O` | cash | 855 | 700.00 | Old | yes | no | no | no | |
| `#911→831 T 豁免 was in 911 temporary was in 911 temporary` | cash |  |  |  | no | no | no | no | No amount; does not match money-row regex; should be non-money transfer/waiver note |
| `#821 700.00 O` | bank | 821 | 700.00 | Old | no | yes | no | no | |
| `#321 730.00 N 2026-06-01 含押100.00` | bank | 321 | 730.00 | New | no | yes | no | no | |
| `#628 730.00 O` | bank | 628 | 730.00 | Old | no | yes | no | no | |
| `#9115 200.00 went to home` | refund | 9115 | 200.00 | Old | no | no | yes | no | |
| `#644 200.00 went to home country` | refund | 644 | 200.00 | Old | no | no | yes | no | |
| `#219 5.00 door battery` | expense | 219 | 5.00 | expense | no | no | no | yes | |

## 5. Current Parsed Totals vs Expected

| Metric | Current Parsed | Expected | Difference |
|---|---:|---:|---:|
| cash_receipts | 4,360.00 | 4,860.00 | -500.00 |
| bank_receipts | 2,160.00 | 2,160.00 | 0.00 |
| deposit_refund | 400.00 | 400.00 | 0.00 |
| expenses | 5.00 | 5.00 | 0.00 |
| gross_income | 6,520.00 | 7,020.00 | -500.00 |
| cash_handover | 3,955.00 | 4,455.00 | -500.00 |

Formula currently used by `totals(entries)`:

- `cashIn = sum(entries where cat === 'cash')`
- `bankIn = sum(entries where cat === 'bank')`
- `refundOut = sum(entries where cat === 'refund')`
- `expOut = sum(entries where cat === 'expense')`
- `cashBal = cashIn - refundOut - expOut`
- `total = cashIn + bankIn`

## 6. Why the Page Shows 4,360.00

| Question | Answer |
|---|---|
| Is 4,360 cash receipt subtotal? | Yes. It is parsed cash receipts after the 500.00 row is skipped. |
| Does 4,360 equal cash receipts missing 500? | Yes. Expected 4,860.00 - 500.00 = 4,360.00. |
| Is cash_handover confused with cash_receipts? | The visible 4,360.00 is cash receipts, not cash handover. If calculated from parsed rows, cash handover would be 3,955.00. |
| Did the system fail to deduct refund and expense? | Not for cash handover. Refund 400.00 and expense 5.00 are parsed correctly. |
| Did the system use header `现金结余 4,455.00`? | No. Header summary rows are skipped. |
| Did the system ignore header declared amounts? | Yes. The parser ignores header declared totals and recomputes from parsed rows only. |

## 7. Missing Row Root Cause

Root cause classification:

`NOTE_TEXT_CAUSED_SKIP`

Detailed cause:

- `parseTXT()` calls `applySpokenContinuation(lastEntry, line, s.date)` before row regex matching.
- `applySpokenContinuation()` contains `if (/\bbalance\b/i.test(l)) ... return true`.
- The line `#911-831 500.00 O was balance from rent` contains `balance`.
- Because a previous entry exists (`#842 750.00 O`), the parser treats the whole line as a continuation note for `#842`.
- The actual amount row regex never runs.
- Therefore 500.00 is never added to cash.

Secondary categories ruled out:

| Category | Status |
|---|---|
| BED_PATTERN_REJECTS_HYPHEN | Ruled out. `\S+` accepts `#911-831`. |
| TRANSFER_PATTERN_TREATED_AS_NON_CASH | Not the main cause. The skipped line is an amount row, not the no-amount transfer waiver line. |
| AMOUNT_EXTRACTION_FAILED | Ruled out. The amount pattern would match if reached. |
| SECTION_STATE_LOST | Ruled out. Section is still `cash`. |
| DUPLICATE_OR_TRANSFER_DEDUPED | Ruled out. No dedupe is involved before parsing this row. |
| CASH_TOTAL_USES_WRONG_SOURCE | Not the root cause for 4,360. The source is parsed rows, but one row was swallowed. |

## 8. `#911→831 T 豁免` Handling

| Question | Answer |
|---|---|
| Should it be an amount ledger row? | No. It has no amount and says waiver. |
| Should it be an information anchor? | Yes. It can be retained as a transfer waiver / note anchor. |
| Should it enter cash amount? | No. |
| Should it affect cash handover? | No. |
| Should it be retained as note/event? | Yes, preferably as a non-money event or note, separate from money-row count. |

## 9. Count vs Money Row Mixing

The title says `现金收款 8笔`, but the section has:

- 7 money rows expected for cash receipts.
- 1 non-money transfer waiver note.

Findings:

- The current parser does not validate `8笔` as exactly 8 money rows.
- The no-amount waiver line does not itself break later parsing.
- The model should distinguish:
  - `event_count`: section title or total visible events.
  - `money_row_count`: rows with parsed amount included in money totals.
  - `non_money_note_count`: rows such as transfer/waiver notes.

## 10. Reconciliation Validation

Current pasted TXT import does not reconcile parsed totals against declared header totals.

| Reconciliation Check | Current Status |
|---|---|
| parsed cash receipts equals header total income minus header bank | Not checked |
| parsed bank equals header bank receipt | Not checked |
| parsed refund equals header deposit refund | Not checked |
| parsed expense equals header other expense | Not checked |
| parsed gross equals header total income | Not checked |
| parsed cash handover equals header cash handover | Not checked |

Recommended reconciliation behavior, not implemented in this audit:

1. Parse header declared totals into a separate `declaredTotals` object.
2. Parse detail rows into `parsedTotals`.
3. Compare:
   - `parsed.bankIn` vs declared bank.
   - `parsed.refundOut` vs declared refund.
   - `parsed.expOut` vs declared expense.
   - `parsed.total` vs declared gross.
   - `parsed.cashBal` vs declared cash handover.
   - inferred declared cash receipts = declared gross - declared bank.
4. Show a blocking or high-severity warning if any delta is non-zero.
5. Include skipped candidate money lines in the warning, especially lines that contain `#`, a money amount, and a section state.

## Recommended Minimal Fix Plan

Do not implement as part of this audit.

Minimal fix should be:

1. In `parseTXT()`, try explicit money-row regexes before `applySpokenContinuation()` when a line begins with a bed token and amount-like token.
2. Narrow `applySpokenContinuation()` so `balance` continuation only applies to lines that do not begin with a money-row candidate.
3. Add a parser regression fixture for:
   - `#911-831 500.00 O was balance from rent`
   - `#911→831 T 豁免 ...`
4. Add declared-vs-parsed reconciliation warnings for pasted TXT.
5. Keep `#911→831 T 豁免` as a non-money event/note anchor, not a cash amount.

