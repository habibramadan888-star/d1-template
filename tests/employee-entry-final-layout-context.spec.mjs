import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const employee = await readFile("deploy-worker/public/employee-v3.html", "utf8");
const worker = await readFile("deploy-worker/src/index.js", "utf8");

function functionBlock(source, name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  assert.fail(`${name} must close`);
}

test("System Calculation display is removed while paid and clear fields remain hidden", () => {
  assert.doesNotMatch(employee, /id="systemCalculationToggle"|id="systemCalculationCompactStatus"/);
  assert.doesNotMatch(employee, />System Calculation\s*</);
  assert.match(employee, /id="systemCalculation"[^>]*hidden/);
  assert.match(employee, /id="paid"[^>]*readonly/);
  assert.match(employee, /id="entryClr"[^>]*disabled/);
  const updater = functionBlock(employee, "employeeUpdateSystemCalculationDisclosure");
  assert.doesNotMatch(updater, /toggle|aria-expanded|classList\.toggle/);
  const order = functionBlock(employee, "employeePrioritizeEntryInputs");
  assert.match(order, /exceptionStep/);
  assert.ok(order.indexOf("exceptionStep") < order.indexOf("actionRow"));
  assert.match(functionBlock(employee, "employeeUpdateCollapsedStepSummaries"), /employeePrioritizeEntryInputs\(\)/);
  assert.doesNotMatch(functionBlock(employee, "employeeUpdateCollapsedStepSummaries"), /if\(!employeeEntryActiveEditable\(\)\)/);
});

test("event picker has exactly seven compact buttons in a centered four plus three grid", () => {
  assert.doesNotMatch(employee, /class="employee-picker-title"/);
  const chips = [...employee.matchAll(/<button class="event-chip" data-type="([A-Z]+)"/g)].map(match => match[1]);
  assert.deepEqual(chips, ["R", "AP", "D", "DR", "CO", "E", "TF"]);
  assert.match(employee, /#eventChips\{grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(employee, /#eventChips \.event-chip\{grid-column:span 3/);
  assert.match(employee, /#eventChips \.event-chip\[data-type="CO"\]\{grid-column:2 \/ span 3/);
  assert.doesNotMatch(employee, /\.employee-entry-card \.event-chip small[^}]*display:none/);
  assert.match(employee, /\.tab\.active,\.employee-workspace-switch button\.active,\.event-chip\.active,\.pay-option\.active,\.btn\.primary:not\(:disabled\)\{background:var\(--employee-active-background\)/);
});

test("session summary is inside the one sticky workspace frame and still uses shared totals", () => {
  const switchStart = employee.indexOf('<div class="employee-workspace-switch"');
  const switchEnd = employee.indexOf("</div>", switchStart);
  const entryCard = employee.indexOf('id="employeeEntryCard"');
  const summary = employee.indexOf('id="employeeSessionStatusBar"');
  assert.ok(switchStart >= 0 && switchEnd > switchStart && summary > switchStart && summary < entryCard);
  assert.equal((employee.match(/id="employeeSessionStatusBar"/g) || []).length, 1);
  assert.match(employee, /\.employee-workspace-switch\{position:sticky!important/);
  assert.match(functionBlock(employee, "employeeRefreshWorkspaceStatus"), /calculateEmployeeSessionSummary\(state\.drafts\)/);
});

test("List Price displays the current Gateway rent without changing the numeric payload field", () => {
  assert.match(employee, /id="listPriceDisplay"[^>]*>Not configured</);
  const render = functionBlock(employee, "employeeRenderListPrice");
  const fields = { listPrice: { value: "" }, listPriceDisplay: { textContent: "" } };
  let rent = 700;
  const context = {
    result: null,
    $: id => fields[id],
    rentForBed: () => rent,
    fmtMoney: value => Number(value).toFixed(2),
    state: { rentConfigLoaded: true }
  };
  vm.createContext(context);
  vm.runInContext(`${render}; result=employeeRenderListPrice;`, context);
  context.result("144");
  assert.equal(fields.listPrice.value, "700.00");
  assert.equal(fields.listPriceDisplay.textContent, "AED 700.00");
  rent = 770;
  context.result("145");
  assert.equal(fields.listPriceDisplay.textContent, "AED 770.00");
  rent = 0;
  context.result("999");
  assert.equal(fields.listPrice.value, "");
  assert.equal(fields.listPriceDisplay.textContent, "Not configured");
  assert.match(functionBlock(employee, "syncForm"), /employeeRenderListPrice/);
});

test("complete access-card display note is preserved through a provider-safe DTO", () => {
  const renderer = functionBlock(employee, "employeeRenderBedInfoStrip");
  const element = { className: "", innerHTML: "" };
  let card = { access_card_note: " 111   e ", end: "2026-05-01" };
  const context = {
    result: null,
    employeeNormalizeBedValue: value => String(value || "").trim(),
    employeeFindCardForBedValue: () => card,
    employeeCardStatus: () => ({ en: "Expired", kind: "warn" }),
    employeeCardUntilText: value => value?.end || "",
    rentForBed: () => 700,
    fmtMoney: value => Number(value).toFixed(2),
    esc: value => String(value),
    String
  };
  vm.createContext(context);
  vm.runInContext(`${renderer}; result=employeeRenderBedInfoStrip;`, context);
  context.result(element, "111");
  assert.match(element.innerHTML, /Access Card Note: 111   e/);
  assert.match(element.innerHTML, /Card Expiry: 2026-05-01/);
  assert.match(element.innerHTML, /Status: Expired/);
  assert.match(element.innerHTML, /System Rent: AED 700\.00/);
  assert.doesNotMatch(element.innerHTML, /门卡备注|截止日期|状态：|系统月租/);
  card = { access_card_note: "111E", end: "2026-05-01" };
  context.result(element, "111");
  assert.match(element.innerHTML, /Access Card Note: 111E/);

  const dto = functionBlock(worker, "employeeLockCardsSafeDto");
  assert.match(dto, /access_card_note/);
  for (const forbidden of ["cardId", "cardNumber", "provider", "snapshot_fingerprint", "_ttlock_meta"])
    assert.doesNotMatch(dto, new RegExp(`\\b${forbidden}\\b`));
  const displayNote = functionBlock(worker, "employeeAccessCardDisplayNote");
  const safeContext = {
    result: null,
    cleanText: value => String(value || "").trim(),
    Number,
    Object,
    Array
  };
  vm.createContext(safeContext);
  vm.runInContext(`${displayNote}; ${dto}; result=employeeLockCardsSafeDto;`, safeContext);
  const safe = safeContext.result({
    roomsData: {
      111: [{ room: "111", cardName: " 111   e ", cardId: "provider-secret", endDate: 1780000000000 }]
    },
    snapshot_fingerprint: "forbidden"
  });
  assert.equal(safe.roomsData[111][0].access_card_note, "111   e");
  assert.equal(Object.hasOwn(safe.roomsData[111][0], "cardId"), false);
  assert.equal(Object.hasOwn(safe, "snapshot_fingerprint"), false);
});
