# Three Portal Card Text Alignment Result

Generated: 2026-05-31

## Result

The three portal entry cards now use a consistent centered vertical text stack for Chinese title and English subtitle.

| Check | Result |
|---|---|
| 员工/老板/管理员是否对齐 | yes |
| 卡片高度是否一致 | yes |
| 是否仍只有三道门 | yes |
| 是否改登录逻辑 | no |

## Implementation

- `.door` uses `justify-content:center`, `text-align:center`, and `min-height:88px`.
- `.door span` uses `display:flex`, `flex-direction:column`, and `align-items:center`.
- `.door strong` uses a consistent `line-height`.
- Role routing and portal count are unchanged.

