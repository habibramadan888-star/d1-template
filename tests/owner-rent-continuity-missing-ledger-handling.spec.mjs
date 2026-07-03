import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = () => readFile("deploy-worker/public/index-51-main.js", "utf8");

test("missing ledger continuity rows share the issue handling workflow", async () => {
  const js = await source();

  assert.match(js, /function rc_isResolvableIssue\(card\)\{return card\?\.status==='missing'\|\|card\?\.status==='noCoverage';\}/);
  assert.match(js, /if\(!rc_isResolvableIssue\(c\)\)return\{\.\.\.c,resolved:null,rkey:''\}/);
  assert.match(js, /const unresolvedMissing=enriched\.filter\(c=>rc_isResolvableIssue\(c\)&&!c\.resolved\)/);
  assert.match(js, /const resolvedMissing\s*=enriched\.filter\(c=>rc_isResolvableIssue\(c\)&&!!c\.resolved\)/);
  assert.match(js, /const mainCards=enriched\.filter\(c=>!\(rc_isResolvableIssue\(c\)&&c\.resolved\)\)/);
  assert.match(js, /const isResolvable=rc_isResolvableIssue\(c\)/);
  assert.match(js, /const actionBtn=isResolvable/);
});

test("missing ledger modal exposes required evidence and resolution options", async () => {
  const js = await source();

  assert.match(js, /const isNoCoverage=issue\.status==='noCoverage'/);
  assert.match(js, /const modalTitle=isNoCoverage\?'处理缺流水问题':'处理收款问题'/);
  assert.match(js, /'床位号'/);
  assert.match(js, /'通通锁卡片名称'/);
  assert.match(js, /'月租'/);
  assert.match(js, /'TTLock 卡片有效期'/);
  assert.match(js, /'系统是否找到付款流水'/);
  assert.match(js, /'缺流水原因说明'/);
  assert.match(js, /已补录流水/);
  assert.match(js, /已确认无需流水/);
  assert.match(js, /数据错误/);
  assert.match(js, /跟进中/);
  assert.match(js, /if\(!note\)/);
});

test("existing missing payment handling remains wired to the same modal", async () => {
  const js = await source();

  assert.match(js, /function rc_openResolveModal\(rkey,bed,cardName,amount\)/);
  assert.match(js, /rc_submitResolution\(rkey\)/);
  assert.match(js, /rc_clearResolution\(rkey\)/);
  assert.match(js, /rc_saveResolutions\(m\)/);
  assert.match(js, /rc_check\(\)/);
});
