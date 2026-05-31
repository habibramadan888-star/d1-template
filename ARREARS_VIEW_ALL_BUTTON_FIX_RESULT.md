# ARREARS VIEW ALL BUTTON FIX RESULT

Status: fixed.

The overview `查看全部` button now:

- Toggles `state.arrearsExpanded`.
- Sets `state.arrearsLimit` to at least the current active arrears row count.
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
