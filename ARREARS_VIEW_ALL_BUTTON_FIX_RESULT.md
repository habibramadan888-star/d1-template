# ARREARS VIEW ALL BUTTON FIX RESULT

Status: fixed.

The overview `查看全部` button now:

- Toggles `state.arrearsExpanded`.
- Sets `state.arrearsLimit` to at least the current active arrears row count.
- If the overview cache only has the 5-card preview, fetches a full first page with `ARREARS_PAGE_SIZE` before final render.
- Is explicitly exposed as `window.toggleOverviewArrearsAll`.
- Re-renders both `renderOwnerOverviewArrearsPanel()` and `renderArrearsPanel()`.
- Does not depend on the old `preferCache` path.

Telemetry hooks added:

- `data-owner-arrears-view-all="true"`
- `data-owner-arrears-visible-count`
- `data-owner-arrears-total-count`
- `data-owner-arrears-preview-count="true"`

Expected user-visible behavior:

- Collapsed: preview cards plus `预览 N / 共 M`.
- Expanded: all loaded cards plus `已显示全部 M / 共 M`.
