import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const worker=await readFile(new URL('../deploy-worker/src/index.js',import.meta.url),'utf8');
const portal=await readFile(new URL('../deploy-worker/public/portal.html',import.meta.url),'utf8');
const owner=await readFile(new URL('../deploy-worker/public/index-51-main.js',import.meta.url),'utf8');
const employee=await readFile(new URL('../deploy-worker/public/employee-v3.html',import.meta.url),'utf8');

function extractFunction(source,name){
  const start=source.indexOf(`function ${name}`);
  assert.ok(start>=0,name);
  let depth=0,opened=false;
  for(let i=source.indexOf('{',start);i<source.length;i++){
    if(source[i]==='{'){depth++;opened=true;}
    else if(source[i]==='}'&&opened&&--depth===0)return source.slice(start,i+1);
  }
  throw new Error(`unterminated ${name}`);
}

test('successful Owner login response exposes only the fixed relative owner path',()=>{
  const start=worker.indexOf('async function handleLogin');
  const end=worker.indexOf('__name(handleLogin',start);
  const block=worker.slice(start,end);
  assert.match(block,/const next_path=canReadOwnerData\(\{role\}\)\?"\/owner":\(isStaffRoleValue\(role\)\?"\/employee":"\/"\)/);
  assert.match(block,/next_path/);
  assert.doesNotMatch(block,/redirect|return_url|callback|https?:\/\//i);
});

test('Owner success handler accepts only server and role agreement on relative /owner',()=>{
  const destination=extractFunction(portal,'destinationForRole');
  const ownerPath=extractFunction(portal,'ownerPostLoginPath');
  const factory=new Function(`const EMPLOYEE_ROLES=new Set(['staff','employee']);const OWNER_ROLES=new Set(['manager','owner']);const ADMIN_ROLES=new Set(['admin','admin_readonly','readonly_admin']);${destination};${ownerPath};return ownerPostLoginPath;`);
  const resolve=factory();
  assert.equal(resolve({role:'manager'},{next_path:'/owner'}),'/owner');
  assert.equal(resolve({role:'owner'},{next_path:'/owner'}),'/owner');
  for(const injected of ['https://evil.example/owner','//evil.example/owner','/owner?next=https://evil.example','/employee',''])assert.equal(resolve({role:'manager'},{next_path:injected}),null,injected);
  assert.equal(resolve({role:'staff'},{next_path:'/owner'}),null);
});

test('portal Owner branch simulates successful authentication before relative navigation',()=>{
  const signIn=extractFunction(portal,'signIn');
  assert.match(signIn,/if\(!auth\.response\.ok\)throw new Error\("login_failed"\)/);
  assert.match(signIn,/const me=await fetchMe\(\)/);
  assert.match(signIn,/selectedPortal==="owner"/);
  assert.match(signIn,/ownerPostLoginPath\(me,auth\.body\)/);
  assert.match(signIn,/location\.replace\(ownerTarget\)/);
});

test('relative /owner preserves Preview staging and production origins by URL resolution',()=>{
  for(const origin of ['https://preview.example.workers.dev','https://staging.example.workers.dev','https://homelink.example.workers.dev']){
    const resolved=new URL('/owner',origin);
    assert.equal(resolved.origin,origin);
    assert.equal(resolved.pathname,'/owner');
  }
});

test('query body and headers cannot supply an Owner redirect origin',()=>{
  const handle=worker.slice(worker.indexOf('async function handleLogin'),worker.indexOf('__name(handleLogin'));
  assert.doesNotMatch(handle,/body\.(redirect|next|return_url|callback)|headers\.get\(["'](?:Location|X-Redirect)/i);
  assert.doesNotMatch(portal,/URLSearchParams[\s\S]{0,200}(redirect|next|return_url|callback)/i);
});

test('Owner logout remains relative and same-origin',()=>{
  assert.match(owner,/apiUrl\('\/api\/logout'\)/);
  assert.match(owner,/redirectToUnifiedLogin\('signed_out'\)/);
  assert.match(owner,/const UNIFIED_LOGIN_DESTINATION='\/'/);
});

test('Employee Preview authentication behavior remains unchanged',()=>{
  assert.match(portal,/selectedPortal==="employee"[\s\S]*requestJson\("\/auth\/employee-login"/);
  assert.match(portal,/routeFromMe\(me\)/);
  assert.match(employee,/location\.replace\('\/owner'\)/);
});

test('session cookies remain host-only with no Domain attribute',()=>{
  const start=worker.indexOf('function makeSessionCookie');
  const end=worker.indexOf('__name(clearSessionCookie',start);
  const block=worker.slice(start,end);
  assert.match(block,/HttpOnly/);
  assert.match(block,/Secure/);
  assert.match(block,/SameSite=Lax/);
  assert.doesNotMatch(block,/Domain=/i);
});

test('write gates remain fail-closed and production cutover remains no-go',()=>{
  assert.match(worker,/BED_TRANSFER_WRITE_APPROVED/);
  assert.match(worker,/OWNER_TODAY_TODO_ACK_ENABLED/);
  assert.match(worker,/production_cutover:"PRODUCTION_NO_GO"/);
});
