import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("employee Follow-up keeps consistent concise bilingual action copy", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");

  for (const phrase of [
    "Follow-up / 跟进",
    "Boss Assigned Tasks / 老板下发任务",
    "System Reminders / 系统提醒",
    "Refresh / 刷新",
    "Expand Details / 展开详情",
    "Collapse Details / 收起详情",
    "Promise Date / 承诺日期",
    "Note / 备注",
    "Submit Feedback / 提交反馈",
    "Logout",
  ]) {
    assert.match(html, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("technical source labels are not in the final default directive card renderer", async () => {
  const html = await readFile("deploy-worker/public/employee-v3.html", "utf8");
  const start = html.lastIndexOf("function employeeDirectiveCard(");
  const card = html.slice(start, html.indexOf("function renderEmployeeDirectiveInbox", start));

  assert.doesNotMatch(card, /existing_arrears_record|source_ref|directive_id|customer_code/);
});
