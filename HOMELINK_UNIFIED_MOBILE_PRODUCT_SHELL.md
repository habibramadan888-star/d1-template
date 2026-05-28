# Homelink Unified Mobile Product Shell

This is the single mobile visual skeleton for employee and owner destinations.

## Header

Both employee and owner pages must use the same structure:

- HOME LINK rounded logo.
- HOMELINK. wordmark.
- Business/page name next to the wordmark.
- Current role badge as a soft pill.
- Right-side action button area with compact, non-overflowing controls.

Owner-specific rule: owner pages may display `老板` and `控制台`, but the controls must look like the employee shell chips/buttons, not a backend toolbar.

## Navigation

Both employee and owner pages must use the same tab language:

- Large pill tabs.
- Same active green gradient.
- Same inactive white card background.
- Same height, radius, and shadow.
- Chinese primary label plus small uppercase English label.
- Stable inline SVG only where icons are used; no emoji fallback.

Owner tabs:

| Tab  | English   | Purpose                                      |
| ---- | --------- | -------------------------------------------- |
| 总览 | OVERVIEW  | Default owner landing page and summary shell |
| 历史 | HISTORY   | Saved sessions and records                   |
| 分析 | ANALYTICS | Period analysis and import/report tools      |
| 客户 | CLIENTS   | Client credit / continuity review            |

## Content

Unified rules:

- Page title uses the employee title hierarchy.
- English subtitle uses small uppercase, letter-spaced style.
- Cards use the same radius, shadow, padding, and soft white surface.
- Action panels use mobile action cards, not backend tool panels.
- Lists become readable mobile cards where possible.
- Empty, loading, and error states use shared card styling.

Hard rule: the owner page must not keep an independent backend-style topbar/nav or default directly into a tool page.
