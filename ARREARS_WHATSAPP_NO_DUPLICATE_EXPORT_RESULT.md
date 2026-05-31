# Arrears WhatsApp No Duplicate Export Result

Date: 2026-05-31

Duplicate prevention rules:

1. If selected task ids exist, export selected tasks only.
2. If no selected task ids exist, export the current source-filtered result.
3. Selected tasks and filtered tasks are never concatenated.
4. `preview_tasks` and `tasks` are not merged in the WhatsApp builder.
5. Rows are de-duplicated before composing text.
6. Clipboard text is replaced with a single generated text block.
7. Manual fallback uses the same single generated text block.

Implementation:

- `ownerArrearsExportRows()` chooses selected rows first, otherwise current filtered rows.
- `dedupeArrearsExportRows()` removes repeated task rows.
- `buildArrearsWhatsAppText()` composes exactly one text block.

Safety:

- Business write: No
- D1 write: No
- Migration: No
- Production cutover: PRODUCTION_NO_GO
