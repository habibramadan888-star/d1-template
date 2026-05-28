# Unified Design Tokens

Scope: `deploy-worker/public/shared-design-tokens.css`.

Production status: `PRODUCTION_NO_GO`. These tokens are CSS-only and do not approve production deploy, D1 write, migration, or business-rule changes.

```css
:root {
  --font-family:
    -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "PingFang SC",
    "Microsoft YaHei", Inter, system-ui, sans-serif;
  --font-size-xs: 10px;
  --font-size-sm: 12px;
  --font-size-base: 14px;
  --font-size-lg: 17px;
  --font-size-xl: 22px;
  --font-size-2xl: 32px;
  --font-weight-normal: 450;
  --font-weight-medium: 620;
  --font-weight-semibold: 760;
  --font-weight-bold: 950;
  --line-height-tight: 1.15;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  --color-bg: #f4f6f8;
  --color-surface: #ffffff;
  --color-card: rgba(255, 255, 255, 0.78);
  --color-primary: #09a64f;
  --color-primary-hover: #078d42;
  --color-text-primary: #111827;
  --color-text-secondary: #5f6877;
  --color-text-muted: #8a94a3;
  --color-border: #dfe5e8;
  --color-success: #09a64f;
  --color-warning: #e16b00;
  --color-danger: #d93025;
  --color-info: #1a73e8;
  --radius-sm: 12px;
  --radius-md: 17px;
  --radius-lg: 22px;
  --radius-xl: 30px;
  --shadow-sm: 0 8px 22px rgba(20, 32, 51, 0.07);
  --shadow-card: 0 16px 38px rgba(20, 32, 51, 0.1);
  --shadow-elevated: 0 28px 80px rgba(15, 23, 42, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.9);
  --space-xs: 6px;
  --space-sm: 10px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --input-height: 54px;
  --button-height: 54px;
}
```

## Application

| Target                 | Status                          | Notes                                                                         |
| ---------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Employee page          | Linked, appearance preserved    | Employee inline CSS still owns its current look, but now shares token source. |
| Unified login          | Linked and partially refactored | Uses shared font/background/card/button classes.                              |
| Owner index            | Linked and aligned              | Uses final `.owner-ui-unified` layer with shared variables.                   |
| Owner index-51         | Linked and aligned              | Same as owner index for compatibility.                                        |
| Owner dashboard KPI JS | Aligned                         | Dynamic KPI markup now uses shared stat classes.                              |

## Guardrails

| Guardrail                     | Result             |
| ----------------------------- | ------------------ |
| Dashboard calculation changed | No                 |
| Financial formula changed     | No                 |
| D1 write required             | No                 |
| Migration required            | No                 |
| Production cutover status     | `PRODUCTION_NO_GO` |
