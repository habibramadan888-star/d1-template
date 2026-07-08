# H4B Detail Endpoint Manual Live Verification Script

Run this from the authenticated owner page browser console.

This script only calls `GET /api/history` and `GET /api/session_detail?id=...&include_corrections=1`. It does not apply corrections and does not write production data.

```js
(async () => {
  const targetAnchor = "EMPV3-20260707-abdul-x6wio";
  const historyRes = await fetch("/api/history?limit=100", { credentials: "include" });
  const historyText = await historyRes.text();
  let history;
  try {
    history = JSON.parse(historyText);
  } catch (error) {
    console.log({ step: "history", status: historyRes.status, raw: historyText });
    throw error;
  }
  const historyRows = Array.isArray(history) ? history : (Array.isArray(history?.data) ? history.data : []);
  const session = historyRows.find((row) => row.anchor_id === targetAnchor || row.id === "S20260707-x6wio");
  if (!session) {
    console.log({ status_label: "NOT_LIVE_VERIFIED", reason: "target session not found", targetAnchor });
    return;
  }
  const detailUrl = `/api/session_detail?id=${encodeURIComponent(session.id)}&include_corrections=1`;
  const detailRes = await fetch(detailUrl, { credentials: "include" });
  const raw = await detailRes.text();
  let detail;
  try {
    detail = JSON.parse(raw);
  } catch (error) {
    console.log({ step: "detail", url: detailUrl, status: detailRes.status, raw });
    throw error;
  }
  const summary = detail.correction_summary || {};
  const audit = detail.correction_audit || {};
  const result = {
    status_label: detailRes.ok && !!summary.correction_aware ? "LIVE_VERIFIED" : "NOT_LIVE_VERIFIED",
    url: detailUrl,
    http_status: detailRes.status,
    anchor: session.anchor_id,
    session_id: session.id,
    old_top_level_gross: Number(session.gross_received || 0),
    old_top_level_cash: Number(session.cash_handover || 0),
    correction_summary_exists: !!detail.correction_summary,
    correction_audit_exists: !!detail.correction_audit,
    correction_aware: summary.correction_aware === true,
    correction_applied: summary.correction_applied === false,
    raw_gross: summary.raw_totals?.gross,
    correction_gross_delta: summary.correction_totals?.gross_delta,
    adjusted_gross: summary.adjusted_totals?.gross,
    correction_events_count: summary.correction_events_count,
    invalid_corrections_count: summary.invalid_corrections_count,
    original_events_visible: audit.original_events_visible === true,
    correction_events_visible: audit.correction_events_visible === true,
    production_write: "no"
  };
  console.log("H4B detail endpoint additive fields verification", result);
  console.log("Raw detail response", detail);
})();
```

Expected before any real correction anchor exists:

- `correction_summary_exists = true`
- `correction_aware = true`
- `correction_applied = false`
- `correction_gross_delta = 0`
- `adjusted_gross = raw_gross`
- production write remains `no`
