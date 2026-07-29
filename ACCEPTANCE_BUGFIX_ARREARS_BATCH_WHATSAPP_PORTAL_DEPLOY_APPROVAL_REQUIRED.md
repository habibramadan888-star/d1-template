# Acceptance Bugfix Deploy Approval Required

Generated: 2026-05-31

Default deployment decision: No deploy.

## Why Approval Is Required

This task changes owner arrears batch action UI, WhatsApp export behavior guards, and portal card styling. To make these changes live, a separate deployment approval is required.

## Allowed Future Deploy Scope

- Owner arrears batch dry-run button state fix.
- WhatsApp export button baseline path.
- Clipboard/share/fallback text consistency.
- Three portal card text alignment.

## Forbidden Future Deploy Scope Without Separate Approval

- D1 write
- Migration
- Real employee directive delivery
- Backend SOT rewrite
- Financial formula changes
- Dashboard calculation changes
- Production cutover

Production cutover must remain `PRODUCTION_NO_GO`.

