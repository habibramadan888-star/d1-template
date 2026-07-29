import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("follow-up page uses English-first bilingual module and action copy", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  for (const copy of [
    "Boss Assigned Tasks / 老板下发任务",
    "System Reminders / 系统提醒",
    "Due Date / 截止日期",
    "Promise Date / 承诺日期",
    "Note / 备注",
    "Saved / 已保存",
    "Unsaved Changes / \\u5f53\\u524d\\u4fee\\u6539\\u672a\\u63d0\\u4ea4",
    "Save Follow-up / \\u4fdd\\u5b58\\u8ddf\\u8fdb",
    "Expand Details / 展开详情",
    "Collapse Details / \\u6536\\u8d77\\u8be6\\u60c5",
    "Logout<span class=\"label-en\">退出</span>"
  ]) {
    assert.ok(html.includes(copy), `missing bilingual copy: ${copy}`);
  }
});

test("no-feedback status is bilingual", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  assert.match(html, /No Feedback Yet \/ 待反馈/);
});

test("production cutover remains blocked", async () => {
  const gate = await readFile("scripts/gate-commercial-launch-readiness.mjs", "utf8");
  assert.match(gate, /PRODUCTION_NO_GO/);
});
