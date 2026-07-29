# Arrears WhatsApp Live Button Baseline Fix Result

Generated: 2026-05-31

## Result

The owner WhatsApp export button is locked to the final baseline builder path.

## Acceptance Rules

- Button calls `ownerArrearsExportRows()`.
- Selected tasks are exported when selected rows exist.
- Current filtered rows are exported when nothing is selected.
- `buildArrearsWhatsAppText(rows)` is the single text source.
- Clipboard text and WhatsApp share text use the same `text` variable.
- Fallback modal receives the same `text` and `url`.
- Export remains deduplicated.
- No `ttlock_card`, `rent`, `deposit`, raw `source_type`, internal id, `undefined`, `null`, or `none` in final generated text.
- Search codes remain continuous: `125`, `144`, `219`, `4014`, `325`, `641`, `636`, `816`, `821`, `835`, `9321`.
- Uses `*` urgent marker, not fire emoji.
- Backend SOT unchanged.

## Safety

- D1 write: No
- Migration: No
- Backend SOT changed: No
- Production cutover: `PRODUCTION_NO_GO`

