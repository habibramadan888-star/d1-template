import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const ownerSource = await readFile(new URL("deploy-worker/public/index-51-main.js", root), "utf8");
const workerSource = await readFile(new URL("deploy-worker/src/index.js", root), "utf8");
const ownerHtml = await readFile(new URL("deploy-worker/public/index-51.html", root), "utf8");

function functionBlock(source, name) {
  const start = source.indexOf(`function ${name}(`);
  const asyncStart = source.indexOf(`async function ${name}(`);
  const actual = start === -1 ? asyncStart : asyncStart === -1 ? start : Math.min(start, asyncStart);
  assert.notEqual(actual, -1, name);
  const signature = source.slice(actual);
  const bodyMatch = /\)\s*\{/.exec(signature);
  assert.ok(bodyMatch, `${name} body`);
  const bodyStart = actual + bodyMatch.index + bodyMatch[0].lastIndexOf("{");
  let depth = 0, opened = false;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === "{") { depth++; opened = true; }
    if (source[i] === "}") depth--;
    if (opened && depth === 0) return source.slice(actual, i + 1);
  }
  throw new Error(`unterminated ${name}`);
}

test("Period Analysis preserves distinct Entry IDs and rejects only the same formal identity", () => {
  const context = {
    normalizeLedgerSession: value => value,
    contentFP: () => "same-content",
    state: { analysisSessions: [] },
    result: null,
  };
  vm.createContext(context);
  vm.runInContext(`${functionBlock(ownerSource, "ledgerSessionIdentity")};${functionBlock(ownerSource, "isDuplicate")}`, context);
  const first = { id: "S01", entries: [{ id: "E01", amount: 50 }] };
  const sameBusinessDifferentEntry = { id: "S02", entries: [{ id: "E02", amount: 50 }] };
  context.state.analysisSessions.push(first);
  assert.equal(vm.runInContext("isDuplicate", context)(sameBusinessDifferentEntry), false);
  assert.equal(vm.runInContext("isDuplicate", context)({ id: "S99", entries: [{ id: "E01", amount: 50 }] }), true);
  assert.equal(vm.runInContext("ledgerSessionIdentity", context)(first), "entry:E01");
});

test("all sixteen Quick identities survive a first Period Analysis import", () => {
  const context = { normalizeLedgerSession: value => value, contentFP: () => "same-content", state: { analysisSessions: [] } };
  vm.createContext(context);
  vm.runInContext(`${functionBlock(ownerSource, "ledgerSessionIdentity")};${functionBlock(ownerSource, "isDuplicate")}`, context);
  const isDuplicate = vm.runInContext("isDuplicate", context);
  for (let index = 1; index <= 16; index++) {
    const n = String(index).padStart(2, "0");
    const session = { id: `QA-RUN-S${n}`, entries: [{ id: `QA-RUN-E${n}`, amount: 50 }] };
    assert.equal(isDuplicate(session), false, n);
    context.state.analysisSessions.push(session);
  }
  assert.equal(context.state.analysisSessions.length, 16);
  assert.equal(new Set(context.state.analysisSessions.map(row => row.entries[0].id)).size, 16);
});

test("Run analysis cache rejects stale parsed rows and retains canonical Entry-linked rows", () => {
  const block = functionBlock(ownerSource, "qaRunAnalysisSessionIntegrity");
  const context = { ownerQaRunId: () => "QA-20260716-4FB51FAF" };
  vm.createContext(context);
  vm.runInContext(block, context);
  const check = context.qaRunAnalysisSessionIntegrity;
  assert.equal(check({qa_run_id:"QA-20260716-4FB51FAF",anchorId:"QA-20260716-4FB51FAF-E01",entries:[{id:"legacy-random-id"}]}), false);
  assert.equal(check({id:"QA-20260716-4FB51FAF-S01",anchorId:"QA-20260716-4FB51FAF-E01",entries:[{id:"legacy-random-id"}]}), false);
  assert.equal(check({anchorId:"QA-20260716-4FB51FAF-E01",entries:[{id:"legacy-random-id"}]}), false);
  assert.equal(check({anchorId:"QA-20260716-4FB51FAF-E01",entries:[{entry_id:"QA-20260716-4FB51FAF-E01"}]}), true);
  assert.equal(check({anchorId:"QA-20260716-4FB51FAF-E01",entries:[{entry_id:"QA-20260716-4FB51FAF-E01"},{id:"legacy-summary-entry"}]}), false);
  assert.equal(check({anchorId:"QA-20260716-4FB51FAF-E01",entriesCount:2,entries:[{entry_id:"QA-20260716-4FB51FAF-E01"}]}), false);
  assert.equal(check({qa_run_id:"QA-20260716-4FB51FAF",anchorId:"QA-20260716-4FB51FAF-E01",entries:[{entry_id:"QA-20260716-4FB51FAF-E01"}]}), true);
  assert.equal(check({qa_run_id:"QA-20260716-4FB51FAF",anchorId:"canonical-transfer-anchor",entries:[{entry_id:"QA-20260716-4FB51FAF-E14"}]}), true);
});

test("Quick Period Analysis cash and bank nets match the shared Finance oracle", () => {
  const context = { Math, Number };
  vm.createContext(context);
  vm.runInContext(functionBlock(ownerSource, "totals"), context);
  const entries = [
    {cat:"cash",amount:700},{cat:"bank",amount:700},{cat:"cash",amount:730},
    {cat:"cash",amount:40},{cat:"bank",amount:30},{cat:"cash",amount:100},{cat:"bank",amount:100},
    {cat:"refund",amount:100,payType:"cash"},{cat:"refund",amount:100,payType:"bank"},
    {cat:"expense",amount:99,payType:"cash"},{cat:"expense",amount:500,payType:"bank"},
    {cat:"cash",amount:50},{cat:"bank",amount:50},{cat:"cash",amount:0}
  ];
  const result = context.totals(entries);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), {cashIn:1620,bankIn:880,refundOut:200,expOut:599,cashOut:199,bankOut:600,netFunds:1701,cashBal:1421,bankBal:280,total:2500});
  assert.match(ownerSource, /\['现金结余',a\.totals\.cashBal/);
});

test("QA Period Analysis uses Run-namespaced storage and performs no cloud sync write", () => {
  assert.match(ownerSource, /analysis:index:\$\{runId\}/);
  assert.match(ownerSource, /anchor:\$\{runId\}:\$\{identity\}/);
  const sync = functionBlock(ownerSource, "syncImportedSessionsToCloud");
  assert.match(sync, /if\(ownerQaRunId\(\)\)return\{ok:0,fail:0,errors:\[\],readonly:true/);
  assert.ok(sync.indexOf("ownerQaRunId()") < sync.indexOf("/api/save_session"));
});

test("Period Analysis maps every seven-event canonical amount without a second finance formula", () => {
  const block = functionBlock(ownerSource, "loadHistoryImportEntries");
  for (const field of ["fee_amount_aed", "expense_amount", "actual_refund_amount", "paid_amount", "payment_amount", "deposit_paid_amount", "expected_rent"]) {
    assert.match(block, new RegExp(field));
  }
  assert.match(block, /entry_id:tx\.entry_id\|\|tx\.id\|\|tx\.event_id/);
  assert.match(block, /canonical_anchor_id:tx\.transfer_anchor_id\|\|tx\.anchor_id/);
  assert.match(block, /runScopedCanonical/);
  assert.match(ownerSource, /source:runScopedCanonical\?'employee_entry'/);
});

test("Owner five-page calls carry the current QA Run while normal URLs stay unchanged", () => {
  const scoped = functionBlock(ownerSource, "ownerRunScopedApi");
  assert.match(scoped, /searchParams\.set\('qa_run_id',runId\)/);
  for (const route of [
    "/api/history",
    "/api/session_detail",
    "/api/owner/finance/projection",
    "/api/owner/cloud-arrears/projection",
    "/api/owner/today-todos",
  ]) assert.match(ownerSource, new RegExp(`ownerRunScopedApi\\([^\\n]*${route.replaceAll("/", "\\/")}`));
  assert.match(ownerSource, /const limit=ownerQaRunId\(\)\?100:/);
  assert.match(ownerSource, /source:ownerQaRunId\(\)\?'employee_entry'/);
  assert.match(ownerHtml, /index-51-main\.js\?v=qa-owner-run-filter-083-final-integrity/);
});

test("server Run scope is QA-host gated and built from persisted matrix Session and Entry IDs", () => {
  const block = functionBlock(workerSource, "qaAcceptanceOwnerRunScope");
  assert.match(block, /qaAcceptanceEnabled\(env\)/);
  assert.match(block, /qaAcceptanceRequestHostAllowed\(request,env\)/);
  assert.match(block, /qaAcceptanceReadRun\(env,user,runId\)/);
  assert.match(block, /matrix\.scenarios/);
  assert.match(block, /sessionIds=new Set/);
  assert.match(block, /entryIds=new Set/);
  assert.match(block, /SELECT \* FROM sessions WHERE corpid=\? AND id IN/);
  assert.match(block, /QA_RUN_NOT_FOUND/);
  assert.match(block, /QA_OWNER_RUN_NOT_REVIEWABLE/);
});

test("server Run scope resolves only persisted sessions from the requested accepted Run", async () => {
  const runId = "QA-20260716-4FB51FAF";
  const scenarios = [1, 2].map(index => ({
    entry_id: `${runId}-E0${index}`,
    session_id: `${runId}-S0${index}`,
  }));
  const sessions = scenarios.map(row => ({
    id: row.session_id,
    entries_json: JSON.stringify({ entries: [{ id: row.entry_id, anchor_id: row.entry_id }] }),
  }));
  const context = {
    URL,
    cleanText: value => String(value || "").trim(),
    qaAcceptanceEnabled: () => true,
    qaAcceptanceRequestHostAllowed: () => true,
    canReadOwnerData: () => true,
    qaAcceptanceRunId: value => String(value || "").toUpperCase(),
    qaAcceptanceReadRun: async () => ({ qa_run_id: runId, status: "UPLOAD_PASS", matrix_json: JSON.stringify({ scenarios }), expected_json: "{}" }),
    qaAcceptanceNotFound: () => ({ status: 404 }),
    forbidden: () => ({ status: 403 }),
    json: (body, status) => ({ body, status }),
    extractEmployeeEntryAnchorsFromSession: session => JSON.parse(session.entries_json).entries,
    env: { DB: { prepare: () => ({ bind: () => ({ all: async () => ({ results: sessions }) }) }) } },
    user: { corpid: "HL-QA", role: "manager" },
  };
  vm.createContext(context);
  vm.runInContext(functionBlock(workerSource, "qaAcceptanceOwnerRunScope"), context);
  const result = await vm.runInContext("qaAcceptanceOwnerRunScope", context)({ url: `https://homelink-finance-qa.example/owner?qa_run_id=${runId}` }, context.env, context.user);
  assert.equal(result.requested, true);
  assert.equal(result.sessions.length, 2);
  assert.equal(result.session_ids.size, 2);
  assert.equal(result.entry_ids.size, 2);
  assert.equal(result.anchor_ids.size, 2);

  context.qaAcceptanceEnabled = () => false;
  const production = await vm.runInContext("qaAcceptanceOwnerRunScope", context)({ url: `https://homelink-finance.example/owner?qa_run_id=${runId}` }, context.env, context.user);
  assert.equal(production.response.status, 404);
});

test("History Detail Finance Arrears and Todo enforce the shared server Run scope", () => {
  const occurrences = workerSource.match(/qaAcceptanceOwnerRunScope\(request,env,user\)/g) || [];
  assert.equal(occurrences.length >= 5, true);
  assert.match(workerSource, /QA_RUN_DETAIL_OUT_OF_SCOPE/);
  assert.match(workerSource, /qaScope\.requested&&anchorRows\.length/);
  assert.match(workerSource, /const maxLimit=qaScope\.requested\?100:30/);
  assert.match(functionBlock(workerSource, "canonicalFinanceProjectionFetchSessions"), /Array\.isArray\(options\.sessions\)/);
  assert.match(functionBlock(workerSource, "handleOwnerCloudArrearsProjection"), /buildCloudArrearsProjectionFromSessions\(qaScope\.sessions/);
  assert.match(functionBlock(workerSource, "handleOwnerCloudArrearsProjection"), /total_remaining:projection\.total_remaining/);
  const todo = functionBlock(workerSource, "buildOwnerTodayTodoGateway");
  assert.match(todo, /runScoped\?opts\.archive_snapshot/);
  assert.match(todo, /runScoped\?\[\.\.\.archiveByBed\.keys\(\),\.\.\.openArrearsByBed\.keys\(\)\]/);
  assert.match(todo, /runScoped\s*\?\{all_rows:\(arrearsProjection\.open_items/);
});

test("Production cannot activate QA Run owner filtering", async () => {
  const block = functionBlock(workerSource, "qaAcceptanceOwnerRunScope");
  assert.match(block, /!qaAcceptanceEnabled\(env\).*qaAcceptanceNotFound\(true\)/s);
  const productionConfig = await readFile(new URL("deploy-worker/wrangler.toml", root), "utf8");
  assert.doesNotMatch(productionConfig, /QA_ACCEPTANCE_ENABLED|QA_HOSTNAME|HL-QA/);
});

test("QA Owner Run HTML uses versioned no-store asset fetch without changing normal Owner caching", () => {
  const block = functionBlock(workerSource, "fetchStaticAsset");
  assert.match(block, /String\(env\.APP_ENV \|\| ""\).*=== "qa"/s);
  assert.match(block, /requestUrl\.searchParams\.get\("qa_run_id"\)/);
  assert.match(block, /env\.CF_VERSION_METADATA\?\.id/);
  assert.match(block, /qa_asset_version=/);
  assert.match(block, /if \(qaOwnerRunAsset\)/);
  assert.match(block, /no-store, no-cache, max-age=0, must-revalidate/);
});
