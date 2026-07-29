import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("owner arrears cards display employee feedback fields in details", async () => {
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");

  assert.match(ownerJs, /arrearPromiseDateLabel/);
  assert.match(ownerJs, /arrearFollowupNoteLabel/);
  assert.match(ownerJs, /<span>承诺日期<\/span>/);
  assert.match(ownerJs, /<span>备注<\/span>/);
  assert.match(ownerJs, /<span>状态<\/span>/);
  assert.match(ownerJs, /<span>负责人<\/span>/);
});

test("owner arrears default card does not show promised amount or internal ids", async () => {
  const ownerJs = await readFile("deploy-worker/public/index-51-main.js", "utf8");
  const start = ownerJs.lastIndexOf("function renderOwnerArrearsTaskCard");
  const end = ownerJs.indexOf("\nfunction arrearsWhatsappCustomerCode", start);
  const card = ownerJs.slice(start, end);

  assert.doesNotMatch(card, /承诺金额/);
  assert.doesNotMatch(card, /source_ref|dedupe_key|ttlock_card/);
});
