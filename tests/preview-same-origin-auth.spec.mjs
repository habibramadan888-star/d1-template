import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const workerPath=new URL('../deploy-worker/src/index.js',import.meta.url);
const employeePath=new URL('../deploy-worker/public/employee-v3.html',import.meta.url);
const ownerPath=new URL('../deploy-worker/public/index-51-main.js',import.meta.url);
const portalPath=new URL('../deploy-worker/public/portal.html',import.meta.url);
const [worker,employee,owner,portal]=await Promise.all([workerPath,employeePath,ownerPath,portalPath].map(path=>readFile(path,'utf8')));
const activeAuth=`${worker}\n${employee}\n${owner}\n${portal}`;

test('active authentication and navigation contain no hardcoded production Worker origin',()=>{
  assert.doesNotMatch(activeAuth,/https:\/\/homelink-finance\.habibramadan888\.workers\.dev/);
});

test('employee and owner API helpers reject cross-origin absolute URLs and return relative paths',()=>{
  for(const source of [employee,owner]){
    assert.match(source,/target\.origin!==location\.origin/);
    assert.match(source,/cross_origin_api_url_blocked/);
    assert.match(source,/return target\.pathname\+target\.search\+target\.hash/);
    assert.match(source,/return raw\.startsWith\('\/'\)\?raw/);
  }
});

test('portal login and role redirects stay same-origin for employee and owner',()=>{
  assert.match(portal,/fetch\(path,\{credentials:"include"/);
  assert.match(portal,/return"\/employee"/);
  assert.match(portal,/return"\/owner"/);
  assert.match(portal,/location\.replace\(target\)/);
  assert.doesNotMatch(portal,/new URLSearchParams[\s\S]*redirect/i);
});

test('employee and owner logout remain same-origin',()=>{
  assert.match(employee,/fetch\(apiUrl\('\/api\/logout'\)/);
  assert.match(owner,/const logoutUrl=apiUrl\('\/api\/logout'\)/);
  assert.match(employee,/redirectToUnifiedLogin\('signed_out'\)/);
  assert.match(owner,/redirectToUnifiedLogin\('signed_out'\)/);
});

test('capability calls use the same-origin API helper',()=>{
  assert.match(employee,/apiFetch\('\/api\/capabilities'/);
  assert.match(owner,/ownerGatewayJson\('\/api\/capabilities'/);
});

test('Worker redirects derive their origin from the trusted request URL',()=>{
  assert.match(worker,/const target = new URL\("\/", request\.url\)/);
  assert.match(worker,/const target = new URL\(request\.url\)/);
  assert.doesNotMatch(worker,/redirect_uri|redirect_url|return_url/i);
});

test('state-changing origin enforcement accepts only the current request origin',()=>{
  const start=worker.indexOf('function configuredOrigins');
  const end=worker.indexOf('__name(configuredOrigins',start);
  const block=worker.slice(start,end);
  assert.match(block,/new Set\(\[current\]\.filter\(Boolean\)\)/);
  assert.doesNotMatch(block,/ALLOWED_ORIGINS|ALLOWED_HOST|workers\.dev/);
});

test('session cookie remains host-only Secure HttpOnly SameSite Lax',()=>{
  const start=worker.indexOf('function makeSessionCookie');
  const end=worker.indexOf('__name(clearSessionCookie',start);
  const block=worker.slice(start,end);
  assert.match(block,/Path=\//);
  assert.match(block,/HttpOnly/);
  assert.match(block,/Secure/);
  assert.match(block,/SameSite=Lax/);
  assert.doesNotMatch(block,/Domain=/i);
});

test('CSP connect source is self and current request origin only',()=>{
  assert.match(worker,/new Set\(\["'self'", origin\]\.filter\(Boolean\)\)/);
  assert.doesNotMatch(worker,/CLOUD_API_ORIGIN/);
});

test('Bed Transfer and owner acknowledgment gates remain fail-closed',()=>{
  assert.match(worker,/String\(env\?\.BED_TRANSFER_WRITE_APPROVED\?\?""\)\.trim\(\)==="true"/);
  assert.match(worker,/OWNER_TODAY_TODO_ACK_ENABLED/);
  assert.match(worker,/\["development","dev","local","test"\]\.includes/);
  assert.match(worker,/production_cutover:"PRODUCTION_NO_GO"/);
});

test('direct and canonical Bed Transfer writes remain closed while validate-only stays available',()=>{
  assert.match(worker,/bed_transfer_validate_enabled:true/);
  assert.match(worker,/BED_TRANSFER_LEGACY_WRITE_PATH_DISABLED/);
  assert.match(worker,/bed_transfer_write_disabled_phase1_safety/);
  assert.match(worker,/validate_endpoint:"\/api\/employee\/entry\/validate"/);
});
