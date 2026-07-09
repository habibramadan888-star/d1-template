# Expense Production Dry-run Script

Run this from the logged-in employee page browser console. It calls only:

`POST /api/employee/entry/validate`

It does not call real upload and sets `dry_run`, `validate_only`, and `no_write`.

```js
(async () => {
  const bed = prompt("Expense target bed/room", "611") || "611";
  const now = Date.now();
  const baseId = `expense-dryrun-${now}`;

  const makeEntry = (name, overrides = {}) => ({
    id: `${baseId}-${name}`,
    event_id: `${baseId}-${name}`,
    type: "E",
    event_type: "expense",
    reason_code: "MAINTENANCE",
    room: bed,
    bed,
    target_bed: bed,
    amount: 50,
    expense_amount: 50,
    expense_category: "MAINTENANCE",
    reason: "dry-run expense validation only",
    expense_desc: "dry-run expense validation only",
    payment_method: "cash",
    pay_type: "C",
    note: "NO WRITE dry-run",
    ...overrides
  });

  const cases = [
    {
      name: "valid_expense_below_100",
      expectOk: true,
      entry: makeEntry("below100", { amount: 50, expense_amount: 50, evidence_ref: "" })
    },
    {
      name: "valid_expense_100_with_evidence",
      expectOk: true,
      entry: makeEntry("eq100-ok", { amount: 100, expense_amount: 100, evidence_ref: `receipt-${now}-100` })
    },
    {
      name: "expense_100_missing_evidence_rejection",
      expectOk: false,
      expectedCode: "EXPENSE_EVIDENCE_REQUIRED",
      entry: makeEntry("eq100-missing", { amount: 100, expense_amount: 100, evidence_ref: "" })
    },
    {
      name: "valid_expense_150_with_evidence",
      expectOk: true,
      entry: makeEntry("gt100-ok", { amount: 150, expense_amount: 150, evidence_ref: `receipt-${now}-150` })
    },
    {
      name: "expense_missing_category_rejection",
      expectOk: false,
      expectedCode: "EXPENSE_REQUIRED_FIELD_MISSING",
      entry: makeEntry("missing-category", { expense_category: "", reason_code: "" })
    },
    {
      name: "expense_missing_reason_rejection",
      expectOk: false,
      expectedCode: "EXPENSE_REQUIRED_FIELD_MISSING",
      entry: makeEntry("missing-reason", { reason: "", expense_desc: "", note: "" })
    },
    {
      name: "expense_missing_payment_method_rejection",
      expectOk: false,
      expectedCode: "EXPENSE_REQUIRED_FIELD_MISSING",
      entry: makeEntry("missing-method", { payment_method: "", pay_type: "" })
    }
  ];

  const forbidden = [
    "tenant_card_id",
    "card_id",
    "old_ttlock_ref",
    "provider_phone",
    "phone_99099",
    "ttlock_metadata",
    "provider_metadata"
  ];

  async function validateCase(testCase, index) {
    const entry = { ...testCase.entry };
    const session = {
      id: `DRYRUN-EXP-${now}-${index}`,
      session_id: `DRYRUN-EXP-${now}-${index}`,
      source: "employee_entry",
      entries: [entry],
      export_text: ""
    };
    const payload = {
      dry_run: true,
      validate_only: true,
      no_write: true,
      event_index: 0,
      entry,
      entries: [entry],
      session
    };
    const response = await fetch("/api/employee/entry/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (error) {
      json = { parse_error: String(error), raw: text };
    }
    const raw = JSON.stringify(json);
    const result = {
      name: testCase.name,
      http_status: response.status,
      ok: !!json.ok,
      expected_ok: testCase.expectOk,
      error_code: json.error_code || "",
      expected_error_code: testCase.expectedCode || "",
      event_type: json.event_type || json.anchor_preview?.event_type || "",
      anchor_types: json.anchor_types || json.summary?.anchor_types || [],
      no_write_requested: payload.no_write === true,
      real_upload_called: false,
      rent_fallback_detected: /RENT_REQUIRED_FIELD_MISSING/.test(raw),
      forbidden_identity_present: forbidden.filter((field) => raw.includes(field)),
      has_entry_anchors_json: /ENTRY ANCHORS JSON|anchor_contract_version|employee_entry_anchor_v1/.test(raw),
      raw_response: json
    };
    result.case_pass =
      response.status < 500 &&
      result.ok === testCase.expectOk &&
      !result.rent_fallback_detected &&
      result.forbidden_identity_present.length === 0 &&
      (!testCase.expectedCode || result.error_code === testCase.expectedCode);
    return result;
  }

  const results = [];
  for (let i = 0; i < cases.length; i += 1) {
    results.push(await validateCase(cases[i], i + 1));
  }

  console.table(results.map(({ raw_response, ...row }) => row));
  console.log("EXPENSE_DRY_RUN_RESULTS", results);
  return {
    status_label: results.every((row) => row.case_pass) ? "LIVE_VERIFIED_DRY_RUN_ONLY" : "DRY_RUN_CHECK_FAILED",
    production_write: "no",
    real_upload_called: "no",
    results
  };
})();
```
