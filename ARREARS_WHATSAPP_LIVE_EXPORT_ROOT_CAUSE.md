# Arrears WhatsApp Live Export Root Cause

Generated: 2026-05-31

## Summary

The deployed baseline builder exists, but acceptance feedback indicates the actual clicked export path still needs to be locked so the button, clipboard, WhatsApp share URL, and fallback modal all use the same final baseline text. The fix keeps one `text` variable from `buildArrearsWhatsAppText(rows)` and passes it to every export path.

Root cause category: `CLIPBOARD_AND_SHARE_MISMATCH` risk and `LIVE_BUTTON_OLD_BUILDER` regression guard.

| Path | Expected Builder | Actual Builder | Problem | Required Fix |
|---|---|---|---|---|
| Owner WhatsApp button | `buildArrearsWhatsAppText(ownerArrearsExportRows())` | Final builder | Must remain locked to selected-or-filtered rows | Static test added |
| Clipboard | Same `text` variable | Same `text` variable | Clipboard/share mismatch would break acceptance | Use `writeText(text)` |
| WhatsApp URL | Same `text` variable | Same `text` variable | Rebuilding could alter encoding/searchability | Use `encodeURIComponent(text)` |
| Fallback modal | Same `text` variable | Same `text` variable | Fallback must not use legacy preview text | Pass `showArrearsWhatsAppFallback(text,url)` |
| Selected tasks | Selected only when non-empty | `ownerArrearsExportRows()` | Selected/filter merge would duplicate rows | Deduped selected-or-filtered path |

## Safety

- Backend SOT changed: No
- D1 write: No
- Migration: No
- Production cutover: `PRODUCTION_NO_GO`

