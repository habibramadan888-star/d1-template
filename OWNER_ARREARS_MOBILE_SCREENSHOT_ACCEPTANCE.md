# OWNER_ARREARS_MOBILE_SCREENSHOT_ACCEPTANCE

## Screenshot-Level Acceptance

The next mobile screenshot should meet these checks:

1. One screen shows at least two task cards with primary content visible.
2. No vertical text.
3. No raw `directive`, `promise`, `staff`, `source_type`, `none`, `undefined`, or `null` labels.
4. Each card immediately shows customer number, bed, amount, overdue/due status, source, and state.
5. Buttons wrap cleanly and do not squeeze content.
6. No horizontal scrolling.
7. No large blank zones inside cards.
8. The next action is obvious from the button row.

## Expected First-Line Pattern

```text
#325｜3-103｜630.00 AED
```

or:

```text
#641｜6-126｜金额待核对
```
