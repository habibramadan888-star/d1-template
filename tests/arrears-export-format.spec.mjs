import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const fixedNow = Date.UTC(2026, 4, 29, 12, 0, 0);

class FixedDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : [fixedNow]));
  }

  static now() {
    return fixedNow;
  }
}

function fakeElement() {
  return {
    addEventListener() {},
    appendChild() {},
    click() {},
    querySelector() {
      return fakeElement();
    },
    querySelectorAll() {
      return [];
    },
    classList: {
      add() {},
      remove() {},
      toggle() {}
    },
    dataset: {},
    style: {},
    innerHTML: "",
    textContent: ""
  };
}

async function loadControlPanelContext() {
  const js = await readFile("deploy-worker/public/index-51-cp.js", "utf8");
  const context = {
    Date: FixedDate,
    Blob: class {},
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    alert() {},
    apiFetch() {},
    console,
    document: {
      addEventListener() {},
      body: fakeElement(),
      createElement: fakeElement,
      getElementById: fakeElement,
      querySelectorAll() {
        return [];
      }
    },
    navigator: { clipboard: { writeText: async () => undefined } },
    setTimeout(fn) {
      if (typeof fn === "function") fn();
    },
    window: { scrollTo() {} }
  };
  vm.createContext(context);
  vm.runInContext(js, context);
  return { context, js };
}

function endDate(daysAgo) {
  return fixedNow - daysAgo * 86400000;
}

function row(room, cardName, daysAgo, type = daysAgo > 0 ? "overdue" : "today") {
  return {
    room,
    card: { cardName, endDate: endDate(daysAgo) },
    info: { type }
  };
}

function sampleRows() {
  return [
    row("8-202", "835 D0 0514", 0, "today"),
    row("2-219", "4014 D200 0808", 21),
    row("6-126", "636 D200 1028", 1),
    row("1-102", "134 D200 0525", 4),
    row("8-202", "821 D150 0428", 1),
    row("4-204", "4210 D20 0329", 0, "today"),
    row("8-202", "816 D150 0428", 1),
    row("2-219", "219 D200 0808", 21),
    row("3-103", "325 D100 1207p0508p23", 22),
    row("6-126", "641 D200 0226", 3),
    row("8-202", "836 D200 0427", 2)
  ];
}

test("arrears WhatsApp export uses bed-grouped compact format", async () => {
  const { context } = await loadControlPanelContext();
  const text = context.cp_buildArrearsReport("已过期清单", sampleRows());

  assert.match(text, /^Due 5\/29 \| 11 overdue\n---/);
  for (const room of ["1-102", "2-219", "3-103", "4-204", "6-126", "8-202"]) {
    assert.match(text, new RegExp(`【${room}】`));
  }

  assert.match(text, /^134\s+4d🔥\s+D200\s+0525$/m);
  assert.match(text, /^219\s+21d🔥\s+D200\s+0808$/m);
  assert.match(text, /^4014\s+21d🔥\s+D200\s+0808$/m);
  assert.match(text, /^641\s+3d🔥\s+D200\s+0226$/m);
  assert.match(text, /^636\s+1d\s+D200\s+1028$/m);
  assert.match(text, /^835\s+Due\s+D0\s+0514$/m);
});

test("arrears WhatsApp export is searchable and omits old accounting prose", async () => {
  const { context, js } = await loadControlPanelContext();
  const text = context.cp_buildArrearsReport("已过期清单", sampleRows());

  for (const id of ["641", "835", "219", "4014"]) {
    assert.match(text, new RegExp(`^${id}\\s`, "m"));
  }

  assert.doesNotMatch(text, /重点/);
  assert.doesNotMatch(text, /核对/);
  assert.doesNotMatch(text, /金额未接入/);
  assert.doesNotMatch(text, /update/i);
  assert.doesNotMatch(text, /备注/);
  assert.doesNotMatch(text, /====|╔|╚|║/);
  assert.match(js, /function cp_overdueDayNumber\(card\)/);
  assert.match(js, /Date\.now\(\)-end/);
});

test("arrears export keeps fire marker only for more than one overdue day", async () => {
  const { context } = await loadControlPanelContext();
  const text = context.cp_buildArrearsReport("已过期清单", sampleRows());

  assert.match(text, /^836\s+2d🔥/m);
  assert.match(text, /^636\s+1d\s+D200/m);
  assert.doesNotMatch(text, /^636\s+1d🔥/m);
  assert.match(text, /^4210\s+Due\s+D20/m);
  assert.doesNotMatch(text, /^4210\s+Due🔥/m);
});

test("production cutover remains no-go", async () => {
  const readiness = await readFile("COMMERCIAL_LAUNCH_READINESS_RESULT.md", "utf8");
  assert.match(readiness, /PRODUCTION_NO_GO/);
});
