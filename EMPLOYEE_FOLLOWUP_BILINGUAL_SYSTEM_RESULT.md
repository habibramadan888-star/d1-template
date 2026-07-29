# Employee Follow-up Bilingual System Result

Task: `EMPLOYEE-FOLLOWUP-FULL-UX-PARITY-WITH-ENTRY-001`

Rule:

- Core actions use compact bilingual labels.
- Employee execution labels remain English-readable.
- Technical fields are not exposed as employee-facing copy.
- Tabs keep the existing Entry visual system while Follow-up action labels remain clear: `Refresh / 刷新`, `Expand Details / 展开详情`, `Submit Feedback / 提交反馈`, `Logout / 退出`.

| Copy Type | Pattern |
|---|---|
| Module title | English / Chinese when Follow-up-specific |
| Action button | English / Chinese |
| Field label | English / Chinese |
| Status | English / Chinese |
| Long explanation | avoided |
| Technical source fields | hidden or humanized |

Safety: no production write, no write gate, no migration, production cutover `PRODUCTION_NO_GO`.
