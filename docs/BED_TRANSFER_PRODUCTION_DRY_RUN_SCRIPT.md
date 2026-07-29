# BED_TRANSFER_PRODUCTION_DRY_RUN_SCRIPT

## Bed Transfer Production Dry-Run Script

Run the script below only from an authenticated production employee page. It reads Bed Context for beds 146, 111, and 948, then sends validation-only Bed Transfer requests. It never calls a write endpoint and never writes browser storage.

Production policy:

- Allowed requests are `GET /api/employee/bed-context?bed=<bed>` and `POST /api/employee/entry/validate`.
- Blocked requests include `/api/employee/bed-transfers`, `/api/employee/entry`, and all D1/KV, migration, and deployment operations.
- Bed 334 is a local hard stop. The script refuses to send any request if a default or override bed is 334.
- The script does not print raw response bodies, provider identity fields, or provider metadata.
- A case depending on bed 948 is `NOT_EXECUTED` unless its Bed Context has exactly one open arrears item.
- The result label is `PRODUCTION_DRY_RUN_VERIFIED` only when every case executes and meets its expected result. Otherwise it is `NOT_VERIFIED`.

```js
(async () => {
  const DEFAULT_BEDS = { noArrearsSource: "146", vacantTarget: "111", openArrearsSource: "948" };
  const overrides = globalThis.__BED_TRANSFER_DRY_RUN_OVERRIDES__ || {};
  const beds = { ...DEFAULT_BEDS, ...overrides };
  const forbiddenBed = value => String(value ?? "").trim().replace(/^#/, "") === "334";
  const bedValues = Object.values(beds);
  if (bedValues.some(forbiddenBed)) {
    throw new Error("Local safety stop: bed 334 is not allowed in any production request.");
  }

  const allowedPaths = new Set(["/api/employee/bed-context", "/api/employee/entry/validate"]);
  const safeText = value => String(value ?? "").trim().slice(0, 160);
  const safeNumber = value => {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const responseBody = async response => {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("json")) return {};
    try { return await response.json(); } catch { return {}; }
  };
  const noWriteRequested = payload => payload.dry_run === true && payload.validate_only === true && payload.no_write === true;

  async function allowedRequest(path, init = {}) {
    const url = new URL(path, location.origin);
    if (!allowedPaths.has(url.pathname)) throw new Error("Local safety stop: endpoint is not allowlisted.");
    if (forbiddenBed(url.searchParams.get("bed"))) throw new Error("Local safety stop: bed 334 request blocked.");
    const response = await fetch(url, { credentials: "include", cache: "no-store", ...init });
    return { response, body: await responseBody(response) };
  }

  function summarizeContext(bed, response, body) {
    const occupancy = body.occupancy_gateway || body.occupancy || body;
    const access = body.access_snapshot_context || occupancy.access_snapshot_context || {};
    const open = Array.isArray(body.open_arrears) ? body.open_arrears : [];
    return {
      bed,
      http_status: response.status,
      ok: response.ok && body.ok !== false,
      physical_bed_status: safeText(occupancy.physical_bed_status),
      physical_bed_status_source: safeText(occupancy.physical_bed_status_source),
      occupancy_status: safeText(body.occupancy_status || occupancy.occupancy_status),
      deposit_recorded_amount: safeNumber(occupancy.deposit_recorded_amount ?? access.parsed_deposit_amount),
      access_data_source: safeText(access.data_source || access.status),
      access_fallback: access.fallback === true,
      access_candidate_count: safeNumber(access.candidate_count),
      access_ambiguous: access.ambiguous === true,
      access_conflict: access.conflict === true,
      open_arrears_count: open.length,
      open_arrears: open.map(item => ({
        arrears_ref: safeText(item.cloud_arrears_ref || item.arrears_ref || item.task_id || item.id),
        remaining_arrears: safeNumber(item.remaining_arrears ?? item.remaining_amount ?? item.remain ?? item.arrear_amount),
        status: safeText(item.status || item.close_status || "open")
      }))
    };
  }

  async function readContext(bed) {
    try {
      const { response, body } = await allowedRequest(`/api/employee/bed-context?bed=${encodeURIComponent(bed)}`);
      return summarizeContext(bed, response, body);
    } catch (error) {
      return { bed, http_status: null, ok: false, read_error: safeText(error.message || error), open_arrears_count: null };
    }
  }

  const contexts = {};
  for (const bed of new Set(Object.values(beds))) contexts[bed] = await readContext(bed);
  const contextReady = bed => contexts[bed]?.ok === true && contexts[bed]?.http_status === 200;
  const arrearsContext = contexts[beds.openArrearsSource];
  const exactlyOneOpenArrear = arrearsContext?.open_arrears_count === 1;
  const today = new Date().toISOString().slice(0, 10);

  function entryFor(fromBed, toBed, fee) {
    return {
      event_type: "bed_transfer",
      type: "TF",
      from_bed: fromBed,
      to_bed: toBed,
      bed_from: fromBed,
      bed_to: toBed,
      transfer_date: today,
      transfer_reason: "phase1_production_dry_run",
      fee_choice: fee.choice,
      fee_amount_aed: fee.aed,
      fee_amount_fils: fee.fils,
      payment_method: fee.payment_method || "",
      waiver_reason: fee.waiver_reason || ""
    };
  }

  async function validateCase(name, expected, fromBed, toBed, fee, extra = {}, requiredBeds = [fromBed, toBed]) {
    if ([fromBed, toBed, ...requiredBeds].some(forbiddenBed)) {
      return { case: name, status: "NOT_EXECUTED", reason: "bed_334_local_stop", no_write_requested: true };
    }
    if (!requiredBeds.every(contextReady)) {
      return { case: name, status: "NOT_EXECUTED", reason: "bed_context_unavailable", no_write_requested: true };
    }
    const payload = {
      dry_run: true,
      validate_only: true,
      no_write: true,
      source: "employee_entry",
      event_type: "bed_transfer",
      type: "TF",
      event_index: 0,
      entry: { ...entryFor(fromBed, toBed, fee), ...extra },
      entries: [{ ...entryFor(fromBed, toBed, fee), ...extra }],
      session: { id: `DRYRUN-BED-TRANSFER-${Date.now()}`, source: "employee_entry", entries: [{ ...entryFor(fromBed, toBed, fee), ...extra }] }
    };
    try {
      const { response, body } = await allowedRequest("/api/employee/entry/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const resultOk = response.ok && body.ok === true;
      const matched = expected === "PASS" ? resultOk : !resultOk;
      return {
        case: name,
        status: matched ? "PASS" : "FAIL",
        expected,
        http_status: response.status,
        ok: body.ok === true,
        error_code: safeText(body.error_code || body.data?.error_code),
        event_type: safeText(body.event_type || body.data?.event_type || "bed_transfer"),
        no_write_requested: noWriteRequested(payload),
        real_upload_called: false
      };
    } catch (error) {
      return { case: name, status: "FAIL", expected, http_status: null, ok: false, error_code: "REQUEST_BLOCKED_OR_FAILED", event_type: "bed_transfer", no_write_requested: noWriteRequested(payload), real_upload_called: false };
    }
  }

  const cases = [];
  cases.push(await validateCase("146 -> 111 charged 50 AED", "PASS", beds.noArrearsSource, beds.vacantTarget, { choice: "charged", aed: 50, fils: 5000, payment_method: "cash" }));
  cases.push(await validateCase("146 -> 111 waived 0 AED with structured reason", "PASS", beds.noArrearsSource, beds.vacantTarget, { choice: "waived", aed: 0, fils: 0, waiver_reason: "OWNER_APPROVED|reason_code=phase1_dry_run" }));
  cases.push(await validateCase("146 -> 146 same bed", "REJECT", beds.noArrearsSource, beds.noArrearsSource, { choice: "charged", aed: 50, fils: 5000, payment_method: "cash" }, {}, [beds.noArrearsSource]));
  cases.push(await validateCase("111 -> 146 source E/e", "REJECT", beds.vacantTarget, beds.noArrearsSource, { choice: "charged", aed: 50, fils: 5000, payment_method: "cash" }));
  cases.push(await validateCase("146 -> 948 target not E/e", "REJECT", beds.noArrearsSource, beds.openArrearsSource, { choice: "charged", aed: 50, fils: 5000, payment_method: "cash" }));

  if (!exactlyOneOpenArrear) {
    for (const name of ["948 -> 111 open arrears without carryover", "948 -> 111 wrong arrears ref or amount", "948 -> 111 exact arrears ref and full carryover"]) {
      cases.push({ case: name, status: "NOT_EXECUTED", reason: "948_must_have_exactly_one_open_arrears", no_write_requested: true });
    }
  } else {
    const task = arrearsContext.open_arrears[0];
    const ref = task.arrears_ref;
    const remaining = task.remaining_arrears;
    cases.push(await validateCase("948 -> 111 open arrears without carryover", "REJECT", beds.openArrearsSource, beds.vacantTarget, { choice: "charged", aed: 50, fils: 5000, payment_method: "cash" }, {}, [beds.openArrearsSource, beds.vacantTarget]));
    cases.push(await validateCase("948 -> 111 wrong arrears ref or amount", "REJECT", beds.openArrearsSource, beds.vacantTarget, { choice: "charged", aed: 50, fils: 5000, payment_method: "cash" }, { cloud_arrears_ref: `${ref}-wrong`, arrears_carryover: true, carried_arrears_amount: Number(remaining || 0) + 1 }, [beds.openArrearsSource, beds.vacantTarget]));
    cases.push(await validateCase("948 -> 111 exact arrears ref and full carryover", "PASS", beds.openArrearsSource, beds.vacantTarget, { choice: "charged", aed: 50, fils: 5000, payment_method: "cash" }, { cloud_arrears_ref: ref, arrears_carryover: true, carried_arrears_amount: remaining }, [beds.openArrearsSource, beds.vacantTarget]));
  }

  cases.push(await validateCase("146 -> 111 fee 49 AED", "REJECT", beds.noArrearsSource, beds.vacantTarget, { choice: "charged", aed: 49, fils: 4900, payment_method: "cash" }));
  cases.push(await validateCase("146 -> 111 fee 51 AED", "REJECT", beds.noArrearsSource, beds.vacantTarget, { choice: "charged", aed: 51, fils: 5100, payment_method: "cash" }));

  const allExecuted = cases.every(item => item.status !== "NOT_EXECUTED");
  const allExpectedResultsPass = cases.every(item => item.status === "PASS" || item.status === "REJECT");
  const result = {
    status_label: allExecuted && allExpectedResultsPass ? "PRODUCTION_DRY_RUN_VERIFIED" : "NOT_VERIFIED",
    case_results: cases,
    endpoint_policy: {
      allowed: ["GET /api/employee/bed-context?bed=<bed>", "POST /api/employee/entry/validate"],
      blocked: ["/api/employee/bed-transfers", "/api/employee/entry", "D1/KV write interfaces", "migration/deploy commands"],
      real_upload_called: false
    },
    context_summary: contexts,
    production_business_data_changed: "no",
    production_storage_changed: "unknown_not_fully_audited",
    migration: "no",
    deployment: "no",
    production_cutover: "PRODUCTION_NO_GO"
  };
  console.log(result);
  return result;
})().catch(error => console.error({ status_label: "NOT_VERIFIED", error: String(error?.message || error), production_business_data_changed: "no", production_storage_changed: "unknown_not_fully_audited", migration: "no", deployment: "no", production_cutover: "PRODUCTION_NO_GO" }));
```
