import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const htmlPath = "deploy-worker/public/employee-v3.html";

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const open = source.indexOf("{", source.indexOf(")", start));
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("employee System shows list count from the same reminder SOT and can load more", async () => {
  const html = await readFile(htmlPath, "utf8");
  const loader = html.slice(
    html.indexOf("async function loadEmployeeSystemReminders"),
    html.indexOf("function stripTtlockAccountPhoneForEmployee"),
  );
  const listCount = extractFunction(html, "ensureSystemReminderListCount");

  assert.match(loader, /loadEmployeeSystemReminders\(render=true,limit=100\)/);
  assert.match(loader, /employee\/system\/reminders\?limit=/);
  assert.match(listCount, /data-system-reminder-list-count/);
  assert.match(listCount, /Shown \/ 已显示/);
  assert.match(listCount, /Total \/ 总数/);
  assert.match(listCount, /data-load-system-reminders-more/);
});

test("Entry save is gated by TTLock and Entry view auto-loads TTLock", async () => {
  const html = await readFile(htmlPath, "utf8");
  const saveEntry = extractFunction(html, "saveEntryWithTtlockGate");
  const showEmployeeView = extractFunction(html, "showEmployeeView");

  assert.match(html, /function ensureEntryTtlockReady/);
  assert.match(html, /saveEntry=saveEntryWithTtlockGate/);
  assert.match(html, /TTLock required before formal entry/);
  assert.match(saveEntry, /ensureEntryTtlockReady\(\{auto:false\}\)/);
  assert.match(showEmployeeView, /ensureEntryTtlockReady\(\{auto:true\}\)/);
  assert.match(html, /data-ttlock-entry-status/);
});

test("New Session can discard local unuploaded ticket instead of locking the employee", async () => {
  const html = await readFile(htmlPath, "utf8");
  const replacement = extractFunction(html, "newSessionFinal");

  assert.match(html, /newSession=newSessionFinal/);
  assert.match(replacement, /hasLocalOnly\(\)&&!confirm/);
  assert.match(replacement, /Discard this ticket and start a new session/);
  assert.doesNotMatch(replacement, /不能开始新会话/);
});

test("Current Session WhatsApp export requires cloud upload first", async () => {
  const html = await readFile(htmlPath, "utf8");
  const exportWhatsapp = extractFunction(html, "exportEntrySessionWhatsApp");
  const actions = extractFunction(html, "updateEntrySessionActionState");

  assert.match(exportWhatsapp, /hasLocalOnly\(\)/);
  assert.match(exportWhatsapp, /Upload this session to cloud first/);
  assert.match(actions, /btnWhatsAppSession/);
  assert.match(actions, /UPLOAD SESSION/);
  assert.match(actions, /entrySessionUploaded/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
