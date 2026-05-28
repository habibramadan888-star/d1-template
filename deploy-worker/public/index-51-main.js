/* ── 金额解析工具：所有用户输入金额在源头四舍五入到分 ──*/
const parseMoney=s=>Math.round((parseFloat(s)||0)*100)/100;

/* ── CONSTANTS ── */
const CATS={
  cash:{key:'cash',label:'现金收款',emoji:'💵',color:'#c8902a',dim:'rgba(200,144,42,0.1)',b:'rgba(200,144,42,0.3)'},
  bank:{key:'bank',label:'银行转账',emoji:'🏦',color:'#1a8a4a',dim:'rgba(26,138,74,0.1)',b:'rgba(26,138,74,0.3)'},
  refund:{key:'refund',label:'押金退款',emoji:'💸',color:'#e06c00',dim:'rgba(224,108,0,0.1)',b:'rgba(224,108,0,0.3)'},
  expense:{key:'expense',label:'其他支出',emoji:'📤',color:'#d93025',dim:'rgba(217,48,37,0.08)',b:'rgba(217,48,37,0.25)'},
};
const TAG_COLORS={Old:{bg:'rgba(200,144,42,0.1)',c:'#c8902a'},New:{bg:'rgba(26,138,74,0.12)',c:'#1a8a4a'},Transfer:{bg:'rgba(26,115,232,0.12)',c:'#1a73e8'}};
const TAG_DISP={Old:'O',New:'N',Transfer:'T'}; // 显示缩写
const normTag=t=>({o:'Old',n:'New',t:'Transfer',old:'Old',new:'New',transfer:'Transfer'}[String(t||'Old').toLowerCase()]||t||'Old');
function normalizeEntry(e){
  const out={...e,tag:normTag(e?.tag)};
  const note=String(out.note||'').trim();
  if(out.tag==='Old'&&note){
    const m=note.match(/^(O|N|T|Old|New|Transfer)\b\s*(.*)$/i);
    if(m){out.tag=normTag(m[1]);out.note=(m[2]||'').trim();}
  }
  return out;
}
const CAT_DISP={cash:'C',bank:'B',refund:'R',expense:'E'}; // 类别缩写
const PRICES_KEY='apt:preset_prices';
const ARREARS_KEY='apt:arrears';
const CUSTOMER_KEY='apt:customers';
const CC_GRACE=3;
const DEFAULT_PRICES=[600,650,700,750];
const HISTORY_PAGE_SIZE=20;
const HISTORY_FETCH_TIMEOUT_MS=8000;

/* ── CLOUD AUTH ── */
/* window.authToken 已移除：Token 存于 httpOnly Cookie，JS 不可读取 */
const CLOUD_API_ORIGIN='https://homelink-finance.habibramadan888.workers.dev';
const UNIFIED_LOGIN_DESTINATION='./unified-login.html';
function apiUrl(url){
  if(/^https?:\/\//i.test(url))return url;
  const sameWorker=location.protocol!=='file:'&&location.host==='homelink-finance.habibramadan888.workers.dev';
  return sameWorker?url:CLOUD_API_ORIGIN+url;
}
async function apiFetch(url, opts = {}) {
  const headers={ 'Content-Type':'application/json', ...(opts.headers||{}) };
  const token=LS.get('homelink:cloud_token');
  if(token&&!headers.Authorization)headers.Authorization=`Bearer ${token}`;
  const target=apiUrl(url);
  return fetch(target,{...opts,headers,credentials:'include'});
}
async function apiFetchWithTimeout(url, opts = {}, timeoutMs = HISTORY_FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await apiFetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
function normalizeAuthRole(r){return String(r||'').trim().toLowerCase();}
function isOwnerAppRole(r){return ['manager','owner','admin'].includes(normalizeAuthRole(r));}
function isEmployeeAppRole(r){return ['staff','employee'].includes(normalizeAuthRole(r));}
function toOwnerSpaRole(r){return isOwnerAppRole(r)?'manager':normalizeAuthRole(r);}
function isOwnerShellRole(){return role==='manager';}
function defaultViewForRole(){return isOwnerShellRole()?'overview':'entry';}
function clearLegacyAuthStorage(){
  [
    'homelink:cloud_token',
    'homelink:role',
    'homelink:user',
    'owner:role',
    'owner:user',
    'empv3:user',
    'empv3:operator',
    'empv3:lastEmployeeId',
    'hl:wifi_accounts',
    'hl:wifi_sessions',
    'hl:wifi_blacklist',
    'hl:wifi_config'
  ].forEach(k=>{
    LS.del(k);
    try{localStorage.removeItem(k)}catch{}
    try{sessionStorage.removeItem(k)}catch{}
  });
}
function redirectToUnifiedLogin(reason=''){
  const target=UNIFIED_LOGIN_DESTINATION+(reason?`?reason=${encodeURIComponent(reason)}`:'');
  location.replace(target);
}
async function fetchCurrentAuthUser(){
  const r=await apiFetch('/api/me',{method:'GET'});
  if(r.status===401||r.status===403)return null;
  if(!r.ok)throw new Error('me_failed_'+r.status);
  return r.json();
}
function ownerAuthElements(){
  return {
    overlay:document.getElementById('lockOverlay'),
    message:document.getElementById('ownerAuthMessage'),
    loading:document.getElementById('ownerAuthLoading'),
    loginPanel:document.getElementById('ownerLoginPanel')||document.querySelector('.code-input-wrap'),
    codeErr:document.getElementById('codeErr'),
    empCode:document.getElementById('empCode')
  };
}
function setOwnerAuthMessage(text, sub=''){
  const el=ownerAuthElements().message;
  if(!el)return;
  el.innerHTML=esc(text||'')+(sub?`<span class="en-sub" style="margin-top:3px">${esc(sub)}</span>`:'');
}
function showOwnerAuthChecking(){
  const els=ownerAuthElements();
  if(els.overlay)els.overlay.style.display='flex';
  if(els.loading)els.loading.hidden=false;
  if(els.loginPanel)els.loginPanel.style.display='none';
  if(els.codeErr)els.codeErr.style.display='none';
  setOwnerAuthMessage('Checking session','正在验证登录状态');
}
function showOwnerLoginFallback(message='请输入员工代码'){
  console.info('[AuthRouting] Legacy owner login fallback suppressed:', message);
  redirectToUnifiedLogin('owner_session_required');
}
function showOwnerAuthError(message='Could not verify session. Please try again.'){
  const els=ownerAuthElements();
  if(els.overlay)els.overlay.style.display='flex';
  if(els.loading)els.loading.hidden=true;
  if(els.loginPanel)els.loginPanel.style.display='none';
  if(els.codeErr){els.codeErr.textContent=message;els.codeErr.style.display='block';}
  setOwnerAuthMessage('Session check failed','请重试登录');
}
function showOwnerAppShell(appRole){
  const overlay=document.getElementById('lockOverlay');
  if(overlay)overlay.style.display='none';
  document.getElementById('topbar').style.display='block';
  document.getElementById('mainApp').style.display='block';
  document.getElementById('footerEl').style.display='block';
  const badge=document.getElementById('roleBadge');
  if(badge){badge.textContent='';badge.hidden=true;badge.setAttribute('aria-hidden','true');}
  const isManager=appRole==='manager';
  if(isManager){
    document.getElementById('navOverview')?.classList.remove('locked');
    document.getElementById('navHistory')?.classList.remove('locked');
    document.getElementById('navAnalysis')?.classList.remove('locked');
    document.getElementById('navClients')?.classList.remove('locked');
    document.getElementById('navWifi')?.classList.remove('locked');
  }else{
    document.getElementById('navOverview')?.classList.add('locked');
    document.getElementById('navHistory')?.classList.add('locked');
    document.getElementById('navAnalysis')?.classList.add('locked');
    document.getElementById('navClients')?.classList.add('locked');
    document.getElementById('navWifi')?.classList.add('locked');
  }
  const db=document.getElementById('btnDashboard');
  if(db)db.style.display=isManager?'':'none';
}
async function resumeUnifiedOwnerSession(){
  showOwnerAuthChecking();
  try{
    const me=await fetchCurrentAuthUser();
    if(!me){redirectToUnifiedLogin('owner_session_required');return false;}
    if(isOwnerAppRole(me.role)){
      await enterAs(toOwnerSpaRole(me.role));
      return true;
    }
    if(isEmployeeAppRole(me.role)){
      location.replace('./employee-v3.html');
      return true;
    }
    console.warn('[UnifiedLogin] unsupported role for owner app');
    redirectToUnifiedLogin('owner_role_denied');
    return false;
  }catch(e){
    console.warn('[UnifiedLogin] owner session handoff failed:',e);
    showOwnerAuthError();
    return false;
  }
}
function showAuthExpired(){
  toast('登录已过期，请重新进入系统','err');
  role=null;
  clearLegacyAuthStorage();
  redirectToUnifiedLogin('session_expired');
}

/* ── HELPERS ── */
const pad=n=>String(n).padStart(2,'0');
const fmtMoney=n=>(Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtAED=n=>`AED ${fmtMoney(n)}`;
const fmtDT=d=>{const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())} ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;};
const fmtD=d=>{const x=new Date(d);return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`;};
const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsArg=v=>esc(JSON.stringify(String(v==null?'':v)));
const cssEsc=v=>(window.CSS&&typeof CSS.escape==='function')?CSS.escape(String(v==null?'':v)):String(v==null?'':v).replace(/["\\\]\[]/g,'\\$&');

/* ── STORAGE ── */
const SENSITIVE_STORAGE_KEYS=['current-session','analysis:index',ARREARS_KEY,CUSTOMER_KEY];
const isSensitiveStorageKey=k=>SENSITIVE_STORAGE_KEYS.includes(k)||String(k||'').startsWith('session:')||String(k||'').startsWith('anchor:');
const LS={
  get(k){
    try{
      if(isSensitiveStorageKey(k)){
        let v=sessionStorage.getItem(k);
        if(v==null){
          v=localStorage.getItem(k);
          if(v!=null){sessionStorage.setItem(k,v);localStorage.removeItem(k);}
        }
        return v;
      }
      return localStorage.getItem(k);
    }catch{return null}
  },
  set(k,v){try{if(isSensitiveStorageKey(k)){sessionStorage.setItem(k,v);localStorage.removeItem(k);}else localStorage.setItem(k,v)}catch{}},
  del(k){try{sessionStorage.removeItem(k);localStorage.removeItem(k)}catch{}},
  keys(p=''){
    try{
      const ks=new Set();
      if(isSensitiveStorageKey(p)||p==='session:'||p==='anchor:')Object.keys(sessionStorage).forEach(k=>{if(k.startsWith(p))ks.add(k)});
      Object.keys(localStorage).forEach(k=>{if(k.startsWith(p)){if(isSensitiveStorageKey(k)){const v=localStorage.getItem(k);if(v!=null)sessionStorage.setItem(k,v);localStorage.removeItem(k);ks.add(k);}else ks.add(k);}});
      return [...ks];
    }catch{return[]}
  }
};

function sanitizeHtml(html){
  const tpl=document.createElement('template');
  tpl.innerHTML=String(html||'');
  tpl.content.querySelectorAll('script,iframe,object,embed,link,meta,base').forEach(n=>n.remove());
  tpl.content.querySelectorAll('*').forEach(el=>{
    [...el.attributes].forEach(a=>{
      const n=a.name.toLowerCase(),v=String(a.value||'').trim().toLowerCase();
      if(n.startsWith('on')||v.startsWith('javascript:')||v.startsWith('data:text/html'))el.removeAttribute(a.name);
    });
  });
  return tpl.innerHTML;
}

/* ── AUTH (密码登录 → Worker JWT) ── */
let role=null;
async function submitCode(){
  const code=(document.getElementById('empCode').value||'').trim();
  const err=document.getElementById('codeErr');
  err.style.display='none';
  if(!code){err.style.display='block';return;}

  /* ── Step 1: 密码验证（credentials:'include' 让浏览器自动接收 httpOnly Cookie）── */
  let loginData;
  try{
    const loginUrl=apiUrl('/auth/login');
    const res=await fetch(loginUrl,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({password:code}),
      credentials:'include'
    });
    if(!res.ok){
      const j=await res.json().catch(()=>({}));
      console.error('[Login] HTTP',res.status, j);
      err.style.display='block';
      document.getElementById('empCode').value='';
      document.getElementById('empCode').focus();
      return;
    }
    loginData=await res.json();
    if(loginData.token)LS.set('homelink:cloud_token',loginData.token);
    else LS.del('homelink:cloud_token');
    if(['staff','employee'].includes(String(loginData.role||'').toLowerCase())){
      location.href='./employee-v3.html';
      return;
    }
    /* 线上使用 httpOnly Cookie；本地 file:// 使用服务端返回的短期 Bearer token */
  }catch(e){
    console.error('[Login] 网络错误:', e);
    err.style.display='block';
    document.getElementById('empCode').value='';
    document.getElementById('empCode').focus();
    return;
  }

  /* ── Step 2: 密码正确，用 role 初始化界面（不存储 token）── */
  try{
    await enterAs(loginData.role);
  }catch(e){
    /* enterAs 出错不等于密码错误，强制显示主界面 */
    console.error('[Login] enterAs 出错:', e);
    role=toOwnerSpaRole(loginData.role);
    document.getElementById('lockOverlay').style.display='none';
    document.getElementById('topbar').style.display='block';
    document.getElementById('mainApp').style.display='block';
    document.getElementById('footerEl').style.display='block';
    const badge=document.getElementById('roleBadge');
    const isMgr=isOwnerShellRole();
    if(badge){badge.textContent='';badge.hidden=true;badge.setAttribute('aria-hidden','true');}
    if(isMgr){
      document.getElementById('navOverview')?.classList.remove('locked');
      document.getElementById('navHistory')?.classList.remove('locked');
      document.getElementById('navAnalysis')?.classList.remove('locked');
      document.getElementById('navClients')?.classList.remove('locked');
    }
    const db=document.getElementById('btnDashboard');
    if(db) db.style.display=isMgr?'':'none';
    try{switchView(defaultViewForRole());}catch(e2){console.error('[Login] initial switchView:', e2);}
  }
}
async function enterAs(r){
  role=toOwnerSpaRole(r);
  showOwnerAppShell(role);
  try{switchView(defaultViewForRole());}catch(e){console.error('[OwnerBootstrap] initial shell render failed:',e);}
  try{
    await loadAll();
    switchView(defaultViewForRole());
  }catch(e){
    console.error('[OwnerBootstrap] data load failed:', e);
    toast('Some dashboard data failed to load. Refresh and try again.','err');
  }
}
async function logout(){
  /* 1. 通知服务端清除 httpOnly Cookie（Max-Age=0）*/
  try{
    const logoutUrl=apiUrl('/auth/logout');
    const token=LS.get('homelink:cloud_token');
    const headers=token?{Authorization:`Bearer ${token}`}:{};
    await fetch(logoutUrl,{method:'POST',headers,credentials:'include'});
  }catch(e){
    console.warn('[Logout] 服务端清除 Cookie 失败（网络问题），继续本地登出:',e);
  }
  /* 2. 清除认证/网络敏感缓存；业务历史不在登出时删除 */
  clearLegacyAuthStorage();
  /* 3. 重置内存状态和界面 */
  role=null;
  _wmAccountsCache=null;
  const ec=document.getElementById('empCode');if(ec)ec.value='';
  const ce=document.getElementById('codeErr');if(ce)ce.style.display='none';
  const db=document.getElementById('btnDashboard');if(db)db.style.display='none';
  var m=document.getElementById('modalOverlay');if(m)m.classList.remove('open');
  var ov=document.getElementById('cp-overlay');if(ov)ov.style.display='none';
  _cpReady=false;
  if(typeof state!=='undefined') state._linkedArrearId=null;
  redirectToUnifiedLogin('signed_out');
}

/* 老板密码二次验证弹窗 */
async function confirmManagerPassword(msg='确认操作需验证老板密码'){
  return new Promise(resolve=>{
    const ov=document.createElement('div');
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
    ov.innerHTML=`<div style="background:var(--surface);border-radius:16px;padding:24px;width:100%;max-width:320px;box-shadow:0 8px 40px rgba(0,0,0,.3)">
      <div style="font-weight:700;font-size:15px;margin-bottom:6px">🔐 身份验证</div>
      <div style="font-size:13px;color:var(--text2);margin-bottom:14px">${msg}</div>
      <input id="_cfPw" type="password" placeholder="输入老板密码" autocomplete="off"
        style="width:100%;padding:11px 12px;border:1.5px solid var(--border);border-radius:10px;margin-bottom:8px;box-sizing:border-box;font-size:16px;background:var(--surface2)">
      <div id="_cfErr" style="display:none;color:var(--red);font-size:12px;margin-bottom:8px">⚠ 密码错误，请重试</div>
      <div style="display:flex;gap:10px">
        <button id="_cfCancel" class="btn btn-ghost" style="flex:1">取消</button>
        <button id="_cfOk" class="btn btn-danger" style="flex:1">确认</button>
      </div>
    </div>`;
    document.body.appendChild(ov);
    const pw=ov.querySelector('#_cfPw'),err=ov.querySelector('#_cfErr');
    pw.focus();
    const cancel=()=>{ov.remove();resolve(false);};
    const confirm=async()=>{
      const v=(pw.value||'').trim();if(!v)return;
      try{
        const confirmUrl=apiUrl('/auth/confirm-manager');
        const token=LS.get('homelink:cloud_token');
        const headers={'Content-Type':'application/json'};
        if(token)headers.Authorization=`Bearer ${token}`;
        const r=await fetch(confirmUrl,{method:'POST',
          headers,body:JSON.stringify({password:v}),credentials:'include'});
        const d=await r.json();
        if(r.ok&&d.role==='manager'){ov.remove();resolve(true);}
        else{err.style.display='block';pw.value='';pw.focus();}
      }catch{err.style.display='block';}
    };
    ov.querySelector('#_cfCancel').onclick=cancel;
    ov.querySelector('#_cfOk').onclick=confirm;
    pw.addEventListener('keydown',e=>{if(e.key==='Enter')confirm();if(e.key==='Escape')cancel();});
  });
}

/* ── ANCHOR + TXT ── */
function mkAnchor(sid,date){
  let h=0;const s=sid+date;for(let i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}
  return `APT-${date.replace(/-/g,'')}-${Math.abs(h).toString(36).toUpperCase().padStart(6,'0')}`;
}
function genTXT(session){
  const{date,entries,id}=session;
  const anchorId=session.anchorId||mkAnchor(id||newId(),date.slice(0,10));
  const cash=entries.filter(e=>e.cat==='cash'),bank=entries.filter(e=>e.cat==='bank');
  const refund=entries.filter(e=>e.cat==='refund'),expense=entries.filter(e=>e.cat==='expense');
  const sum=a=>a.reduce((s,e)=>s+Number(e.amount||0),0);
  const r3=n=>Math.round(n*100)/100;
  const fm=n=>fmtMoney(n);  // 简写
  const ci=r3(sum(cash)),bi=r3(sum(bank)),ro=r3(sum(refund)),eo=r3(sum(expense));
  const cb=r3(ci-ro-eo),tot=r3(cb+bi);
  const LINE='─────────────────────────────';
  const L=[];

  // ── 文件头（机读，不显示）──
  L.push(`##ANCHOR:${anchorId}`,`##DATE:${date.slice(0,10)}`,'');

  // ── 标题行 ──
  L.push(`${date.slice(0,10)}  财务交接`);

  // ── 汇总：每项独占一行，按重要程度排列 ──
  const totalIn=r3(ci+bi);
  const pad=(s,n)=>s+' '.repeat(Math.max(1,n-s.length));
  const row=(lbl,val)=>val?`${pad(lbl,8)}${fm(val)} AED`:'';
  [
    row('现金结余',cb),
    row('银行收款',bi),
    ro?row('押金退款',ro):'',
    eo?row('其他支出',eo):'',
    row('总收入',  totalIn),
  ].filter(Boolean).forEach(r=>L.push(r));
  L.push(LINE,'');

  // ── 每条记录的格式化函数 ──
  const fmtEntry=it=>{
    // 保留 # 前缀（让房间号成为可搜索的 hashtag）
    // 字段顺序：床位 → 类型标签(字母) → 金额 → 附加信息
    // 关键：类型标签紧跟 #房间号，让字母隔断后续数字，
    // 防止 WhatsApp 把 "#844 750.00" 识别为电话/频道号码而非 hashtag（会导致搜索844无法高亮）
    const room=it.roomTo?`#${it.room}→${it.roomTo}`:`#${it.room}`;
    const amt=it.amount||0;

    const extras=[];
    if(it.tag==='Transfer'){
      if((it.due||0)===0){
        extras.push('豁免');
        if(it.note) extras.push(it.note);
      } else {
        const tDef=Math.round((it.deficit||0)*100)/100;
        if(tDef>0) extras.push(`欠${fm(tDef)}`);
        if(it.dueDate) extras.push(`还款${it.dueDate}`);
        if(it.note&&it.note!=='无') extras.push(it.note);
      }
    } else if(it.tag==='New'){
      if(it.startDate) extras.push(it.startDate);
      const rentDef=Math.round((it.deficit||0)*100)/100;
      const depDef=Math.round((it.depDef||0)*100)/100;
      const dp=it.depPaid||0;
      if(rentDef>0) extras.push(`欠租${fm(rentDef)}`);
      if(dp>0) extras.push(depDef>0?`含押${fm(dp)} 欠押${fm(depDef)}`:`含押${fm(dp)}`);
      else if((it.depDue||0)>0) extras.push('押未收');
      if(it.dueDate) extras.push(`还款${it.dueDate}`);
    } else if(it.depositCollection){
      extras.push('补押金');
    } else {
      const oDef=Math.round((it.deficit||0)*100)/100;
      if(oDef>0) extras.push(`欠${fm(oDef)}`);
      if(it.dueDate) extras.push(`还款${it.dueDate}`);
    }
    if(it.note&&it.note!=='无'&&it.note!=='补收押金') extras.push(it.note);

    // 组装：#床位  类型(字母)  金额  附加
    // 类型标签在金额前面，确保 #房间号 后紧跟字母，避免 WhatsApp 号码识别
    const tag=it.tag||'Old';
    const tagStr=TAG_DISP[tag]||tag;
    const amtStr=(it.tag==='Transfer'&&(it.due||0)===0)?'':fm(amt);
    const parts=[room, tagStr];        // #844  O  ← 字母紧跟hashtag
    if(amtStr) parts.push(amtStr);    // #844  O  750.00
    if(extras.length) parts.push(extras.join('  '));
    return parts.join('  ');
  };

  const fmtExp=it=>{
    const parts=[`#${it.room}`, fm(it.amount)];
    if(it.note&&it.note!=='无') parts.push(it.note);
    return parts.join('  ');
  };

  // ── 各分类块 ──
  const blk=(em,lbl,items,expMode=false)=>{
    if(!items.length) return;
    L.push(`${em} ${lbl}  ${items.length}笔`);
    items.forEach(it=>L.push('  '+(expMode?fmtExp(it):fmtEntry(it))));
    L.push('');
  };

  blk('💵','现金收款',cash);
  blk('🏦','银行转账',bank);
  blk('💸','押金退款',refund,true);
  blk('📤','其他支出',expense,true);
  L.push(LINE);
  return{txt:L.join('\n').replace(/\n+$/,''),anchorId};
}

/* ── PARSER ── */
function parseEnglishStatementDate(text){
  const months={jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,oct:10,october:10,nov:11,november:11,dec:12,december:12};
  const m=String(text||'').match(/\bDATE[ \t]+(\d{1,2})(?:st|nd|rd|th)?[ \t]+([A-Za-z]+)(?:[ \t]+(\d{2,4}))?/i);
  if(!m)return '';
  const y=m[3]?Number(m[3].length===2?'20'+m[3]:m[3]):new Date().getFullYear();
  const mo=months[m[2].toLowerCase()];
  if(!mo)return '';
  return `${y}-${pad(mo)}-${pad(Number(m[1]))}`;
}

function applySpokenContinuation(entry,line,sessionDate){
  if(!entry||!line)return false;
  const l=line.trim();
  if(/^(old|new|transfer)$/i.test(l)){entry.tag=normTag(l);return true;}
  if(/^by\s+bank\b/i.test(l)){entry.cat='bank';entry.tag=/\bnew\b/i.test(l)?'New':'Old';entry.note=l.replace(/\bold\b|\bnew\b/ig,'').trim();return true;}
  if(/\bbalance\b/i.test(l)){entry.note=[entry.note,'balance'].filter(Boolean).join(' · ');entry.tag=/\bnew\b/i.test(l)?'New':entry.tag||'Old';return true;}
  if(/\bstart\b/i.test(l)||/\brent\s+[\d,]/i.test(l)||/\bdeposi?te?\s+[\d,]/i.test(l)){
    entry.tag=/\bnew\b/i.test(l)?'New':entry.tag||'New';
    const rent=l.match(/\brent\s+([\d,]+(?:\.\d+)?)/i);
    const dep=l.match(/\bdeposi?te?\s+([\d,]+(?:\.\d+)?)/i);
    const start=l.match(/\bstart\s+(\d{1,2})(?:st|nd|rd|th)?\b/i);
    if(rent){entry.due=parseMoney(rent[1].replace(/,/g,''));entry.paid=entry.due;entry.deficit=0;}
    if(dep){entry.depDue=parseMoney(dep[1].replace(/,/g,''));entry.depPaid=entry.depDue;entry.depDef=0;}
    if(start){
      const base=sessionDate?new Date(sessionDate):new Date();
      entry.startDate=`${base.getFullYear()}-${pad(base.getMonth()+1)}-${pad(Number(start[1]))}`;
    }
    const cleaned=l
      .replace(/\bnew\b/ig,'')
      .replace(/\bold\b/ig,'')
      .replace(/\bstart\s+\d{1,2}(?:st|nd|rd|th)?\b/ig,'')
      .replace(/\brent\s+[\d,]+(?:\.\d+)?/ig,'')
      .replace(/\bdeposi?te?\s+[\d,]+(?:\.\d+)?/ig,'')
      .trim();
    if(cleaned)entry.note=[entry.note,cleaned].filter(Boolean).join(' · ');
    return true;
  }
  if(entry.cat==='refund'&&!/^\S+\s+returned\s+/i.test(l)&&!/^[\d,]+(?:\.\d+)?\s*aed\s+paid\s+to/i.test(l)&&!/^(used|total|bank|statement|date|deposi?te?\s+return)\b/i.test(l)){
    entry.note=[entry.note,l.replace(/\bold\b/ig,'').trim()].filter(Boolean).join(' · ');
    entry.tag=/\bnew\b/i.test(l)?'New':'Old';
    return true;
  }
  return false;
}

function parseTXT(text){
  if(!text||!text.trim()) return null;
  const lines=text.split(/\r?\n/);
  const s={id:newId(),date:'',entries:[],anchorId:null,exportTime:null,isLegacy:false};
  for(const l of lines){
    const t=l.trim();
    if(t.startsWith('##ANCHOR:')) s.anchorId=t.slice(9).trim();
    else if(t.startsWith('##EXPORT:')) s.exportTime=t.slice(9).trim();
    else if(t.startsWith('##DATE:')) s.date=t.slice(7).trim();
  }
  if(!s.anchorId){
    s.isLegacy=true;
    const hl=lines.find(l=>/财务交接/.test(l));
    if(hl){const m=hl.match(/(\d{4}-\d{2}-\d{2})/);if(m)s.date=m[1];}
    if(!s.date)s.date=parseEnglishStatementDate(text);
    if(!s.date){const ad=text.match(/\d{4}-\d{2}-\d{2}/);s.date=ad?ad[0]:fmtD(new Date());}
    // content-based anchor for legacy: prevents same-file re-import
    let h=0;const cs=s.date+text.slice(0,300);
    for(let i=0;i<cs.length;i++){h=((h<<5)-h+cs.charCodeAt(i))|0;}
    s.anchorId='LGC-'+s.date+'-'+Math.abs(h).toString(36).toUpperCase().slice(0,6);
  }
  let cat=null;
  let lastEntry=null;
  for(const raw of lines){
    const l=raw.trim();
    if(!l||l.startsWith('##')) continue;
    if(lastEntry&&applySpokenContinuation(lastEntry,l,s.date)) continue;
    // ── 分隔线重置类别（防止上一分类"污染"下一段）──
    if(/^[─━—–\-]{5,}$/.test(l)){cat=null;continue;}
    // ── 汇总标签行跳过（必须在类别检测之前！否则"押金退款 300 AED"会误设 cat='refund'）──
    // 覆盖 genTXT 所有汇总行标签，包括旧版变体
    if(/^(现金收入|现金结余|银行收款|银行收入|押金退款|其他支出|总收入|总金额|净收入)/.test(l)) continue;
    if(/^TOTAL\b/i.test(l)||/^[\d,]+(?:\.\d+)?\.?\s*(Cash|By\s+Bank)$/i.test(l)) continue;
    if(/^DATE\b/i.test(l)) continue;
    if(/财务交接/.test(l)) continue;
    if(l.startsWith('📌')||l.startsWith('▫️')||/^共\s*\d+\s*笔$/.test(l)) continue;
    // ── 类别检测：文字回退必须要求含"笔"字，避免匹配汇总行 ──
    if(l.includes('🏦')||(/银行转账/.test(l)&&l.includes('笔'))||/BANK\s+TRANSFER\b/i.test(l)){cat='bank';continue;}
    if(l.includes('💵')||(/现金收款/.test(l)&&l.includes('笔'))||/STATEMENT\b/i.test(l)||/^CASH\b/i.test(l)){cat='cash';continue;}
    if(l.includes('💸')||(/押金退款/.test(l)&&l.includes('笔'))||/^(DEPOSI?TE?|DEPOSIT)\s+RETURN(?:ED)?\b/i.test(l)){cat='refund';continue;}
    if(l.includes('📤')||(/其他支出/.test(l)&&l.includes('笔'))||/^USED\b/i.test(l)||/^EXPENSE/i.test(l)){cat='expense';continue;}
    if(!cat) continue;
    if(cat==='expense'){
      const spoken=l.match(/^([\d,]+(?:\.\d+)?)\s*aed\s+paid\s+to\s+(.+)$/i);
      if(spoken){lastEntry={id:newId(),cat:'expense',room:(spoken[2].match(/\b(\d{2,5})\s+bed\b/i)?.[1]||'USED'),amount:parseFloat(spoken[1].replace(/,/g,'')),note:spoken[2].trim()};s.entries.push(lastEntry);continue;}
      const m=l.match(/^(\S+)\s+([\d,]+\.?\d*)\s*(.*)$/);if(m){lastEntry={id:newId(),cat:'expense',room:m[1].replace(/^#+/,''),amount:parseFloat(m[2].replace(/,/g,'')),note:(m[3]||'').trim()};s.entries.push(lastEntry);}continue;}
    if(cat==='refund'){
      const r=l.match(/^(\S+)\s+returned\s+([\d,]+\.?\d*)\s*(.*)$/i);
      if(r){lastEntry={id:newId(),cat:'refund',room:r[1].replace(/^#+/,''),amount:parseFloat(r[2].replace(/,/g,'')),tag:'Old',note:(r[3]||'').trim()};s.entries.push(lastEntry);continue;}
    }
    const compact=l.match(/^(\S+)\s+(O|N|T|Old|New|Transfer)\s+([\d,]+\.?\d*)\s*(.*)$/i);
    if(compact){
      const roomParts=compact[1].replace(/^#+/,'').split(/[→>]+/);
      lastEntry={id:newId(),cat,room:roomParts[0],roomTo:roomParts[1]||undefined,
        amount:parseFloat(compact[3].replace(/,/g,'')),tag:normTag(compact[2]),
        note:(compact[4]||'').replace(/^\s*无\s*$/,'').trim()};
      s.entries.push(lastEntry);
      continue;
    }
    const amountFirst=l.match(/^(\S+)\s+([\d,]+\.?\d*)\s+(O|N|T|Old|New|Transfer)\b\s*(.*)$/i);
    if(amountFirst){
      const roomParts=amountFirst[1].replace(/^#+/,'').split(/[→>]+/);
      lastEntry={id:newId(),cat,room:roomParts[0],roomTo:roomParts[1]||undefined,
        amount:parseFloat(amountFirst[2].replace(/,/g,'')),tag:normTag(amountFirst[3]),
        note:(amountFirst[4]||'').replace(/^\s*无\s*$/,'').trim()};
      s.entries.push(lastEntry);
      continue;
    }
    const m=l.match(/^(\S+)\s+paid\s+([\d,]+(?:\.\d+)?)(?:\s+(Old|New))?\s*(.*)$/i);
    if(m){lastEntry={id:newId(),cat,room:m[1].replace(/^#+/,''),amount:parseFloat(m[2].replace(/,/g,'')),tag:normTag(m[3]),note:(m[4]||'').replace(/^\s*无\s*$/,'').trim()};s.entries.push(lastEntry);}
    else{const m2=l.match(/^(\S+)\s+([\d,]+\.?\d*)\s*(.*)$/);if(m2){let note=(m2[3]||'').trim();let tag='Old';const tm=note.match(/^(O|N|T|Old|New|Transfer)\b\s*(.*)$/i);if(tm){tag=normTag(tm[1]);note=(tm[2]||'').trim();}lastEntry={id:newId(),cat,room:m2[1].replace(/^#+/,''),amount:parseFloat(m2[2].replace(/,/g,'')),tag,note};s.entries.push(lastEntry);}}
  }
  return s;
}
function totals(entries){
  // entry.amount = 本次实收总额（租金+押金合计），不需要额外加 depPaid
  const r2=n=>Math.round(n*100)/100;
  const sum=c=>r2(entries.filter(e=>e.cat===c)
    .reduce((s,e)=>s+Number(e.amount||0),0));
  const ci=sum('cash'),bi=sum('bank'),ro=sum('refund'),eo=sum('expense');
  return{cashIn:ci,bankIn:bi,refundOut:ro,expOut:eo,
    cashBal:r2(ci-ro-eo),total:r2(ci+bi)}; // 总收入=现金+银行（不扣退款/支出），现金结余=现金-退款-支出
}

/* ── STATE ── */
const state={
  view:'overview',session:{id:newId(),date:fmtDT(new Date()),entries:[]},saved:[],
  activeCat:'cash',formTag:'Old',formPayType:null,
  analysisSessions:[],
  dateMode:'all',month:(()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}`;})(),
  from:'',to:'',txCatFilter:'all',txSearch:'',historyViewing:null,historyLimit:HISTORY_PAGE_SIZE,
  arrears:[], // [{id,room,roomTo?,totalRent,paid,remain,dueDate,sessionId,cleared}]
  presetPrices:DEFAULT_PRICES,
  customers:[],
  anaOpen:{session:false,finance:false,people:false,continuity:false,tx:false},
};
const charts={};

/* ── TOAST ── */
function toast(msg,type='ok'){
  const host=document.getElementById('toastHost');
  const el=document.createElement('div');
  el.className=`toast ${type}`;
  el.innerHTML=`<span>${type==='err'?'⚠':'✓'}</span><span>${esc(msg)}</span>`;
  host.appendChild(el);
  setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity 0.3s';},5600);
  setTimeout(()=>el.remove(),6000);
}

/* ── PERSISTENCE ── */
function saveCur(){LS.set('current-session',JSON.stringify(state.session));}
function saveAnalysis(){
  _ccCache=null; // 分析流水变更后，客户信用评分必须重建
  LS.set('analysis:index',JSON.stringify(state.analysisSessions.map(s=>s.anchorId)));
  state.analysisSessions.forEach(s=>LS.set(`anchor:${s.anchorId}`,JSON.stringify(s)));
}
function loadAnalysis(){
  try{
    const idx=JSON.parse(LS.get('analysis:index')||'[]');
    const raw=idx.map(aid=>{try{const r=LS.get(`anchor:${aid}`);return r?JSON.parse(r):null;}catch{return null;}}).filter(Boolean);
    // 加载时自动去重：按内容指纹去重，只保留每份流水第一次出现的
    const seen=new Set();
    const deduped=[];
    raw.forEach(s=>{
      const fp=contentFP(s);
      if(!seen.has(fp)){seen.add(fp);deduped.push(s);}
      else{LS.del(`anchor:${s.anchorId}`);}// 删除多余的
    });
    // 如有清理，更新索引
    if(deduped.length<raw.length){
      LS.set('analysis:index',JSON.stringify(deduped.map(s=>s.anchorId)));
    }
    return deduped;
  }catch{return[];}
}
function rmAnalysis(anchorId){state.analysisSessions=state.analysisSessions.filter(s=>s.anchorId!==anchorId);LS.del(`anchor:${anchorId}`);saveAnalysis();}
async function loadAll(){
  try{const cur=LS.get('current-session');if(cur){const p=JSON.parse(cur);if(p&&Array.isArray(p.entries))state.session=p;}}catch{}
  try{const keys=LS.keys('session:');const arr=[];for(const k of keys){try{const r=LS.get(k);if(r)arr.push(JSON.parse(r));}catch{}}arr.sort((a,b)=>(b.date||'').localeCompare(a.date||''));state.saved=arr;}catch{}
  state.analysisSessions=role==='manager'?loadAnalysis():[];
  // Load customers from authenticated cloud storage first; keep sessionStorage only as a short-lived fallback.
  state.customers=[];
  if(role==='manager'){
    try{
      const cr=await apiFetch('/api/customers');
      if(!cr.ok)throw new Error('api');
      const cd=await cr.json();
      state.customers=Array.isArray(cd.customers)?cd.customers:[];
      LS.set(CUSTOMER_KEY,JSON.stringify(state.customers));
    }catch{try{const cc=LS.get(CUSTOMER_KEY);if(cc)state.customers=JSON.parse(cc)||[];}catch{}}
  }else{
    LS.del(CUSTOMER_KEY);
  }
  // Load preset prices
  try{const pp=LS.get(PRICES_KEY);if(pp){const parsed=JSON.parse(pp);if(Array.isArray(parsed)&&parsed.length)state.presetPrices=parsed;}}catch{}
  // Load arrears
  // 欠款：从云端 API 加载（优先），失败则降级 localStorage
  state.arrears=[];
  if(role==='manager'){
    try{
      const _ar=await apiFetch('/api/arrears');
      if(!_ar.ok) throw new Error('api');
      const _rows=await _ar.json();
      state.arrears=_rows.map(a=>({id:a.id,room:a.room,note:a.note,remain:a.remain,
        dueDate:a.due_date,type:a.type||'rent',
        sessionId:a.session_id,entryId:a.entry_id,cleared:false}));
    }catch{try{const ar=LS.get(ARREARS_KEY);if(ar)state.arrears=JSON.parse(ar)||[];}catch{}}
  }else{
    LS.del(ARREARS_KEY);
  }
  if(role==='manager')await rc_loadRoomCfgFromCloud();
}

/* ── RENDER ENTRY ── */
function renderSummary(){
  const t=totals(state.session.entries);
  const ie=state.session.entries.filter(e=>e.cat==='cash'||e.cat==='bank');
  const r=n=>Math.round(n*100)/100;

  // ── 应收 / 实收 / 欠款（所有收款条目，不分租金/押金）──
  const totalDue =r(ie.reduce((s,e)=>s+(e.due !=null?e.due :(e.amount||0))+(e.depDue ||0),0));
  const totalPaid=r(ie.reduce((s,e)=>s+(e.paid!=null?e.paid:(e.amount||0))+(e.depPaid||0),0));
  const totalDef =r(ie.reduce((s,e)=>s+(e.deficit>0?e.deficit:0)+(e.depDef>0?e.depDef:0),0));

  // ── 总收入 = 现金收入 + 银行转账（不扣退款和支出）──
  const netIncome=t.total;  // 总收入 = cashIn + bankIn（不扣退款/支出）

  const c=(lbl,val,col,hi='',span2=false,sub='')=>{
    const parts=(lbl||'').split('|');
    const lbl2=parts[0];const en=parts[1]||'';
    const extra=span2?'style="grid-column:span 2"':'';
    const subHtml=sub?`<div style="font-size:9px;color:#aaa;margin-top:2px">${sub}</div>`:'';
    return `<div class="kpi hl-stat-card${hi.replace(' span2','')}" ${extra}><div class="kpi-lbl hl-stat-label">${lbl2}${en?'<span class="en-sub">'+en+'</span>':''}</div><div class="kpi-val hl-stat-value" style="color:${col}">${fmtMoney(val)}</div>${subHtml}</div>`;
  };

  document.getElementById('summaryGrid').innerHTML=
    c('现金合计|CASH IN',     t.cashIn,  '#c8902a')+
    c('转账合计|BANK IN',     t.bankIn,  '#1a8a4a')+
    c('欠款合计|ARREARS',     totalDef,  '#d93025', totalDef>0?' hi':'')+
    c('押金退款|DEP.REFUND',  t.refundOut,'#e06c00')+
    c('其他支出|EXPENSES',    t.expOut,   '#d93025')+
    c('现金结余|CASH BAL',    t.cashBal,  '#1a73e8','',false,'本期现金净余')+
    c('总收入|GROSS IN',     netIncome,  '#1a9e3f',' hi',true,'现金收入 + 银行转账');
}
function renderCatTabs(){
  const cnt={};Object.keys(CATS).forEach(k=>cnt[k]=state.session.entries.filter(e=>e.cat===k).length);
  document.getElementById('catTabs').innerHTML=Object.values(CATS).map(c=>{
    const a=state.activeCat===c.key;
    return `<button class="cat-tab${a?' active':''}" data-cat="${c.key}"${a?` style="border-color:${c.b};background:${c.dim}"`:''}><span class="em">${c.emoji}</span><span class="nm"${a?` style="color:${c.color}"`:''}>${c.label}</span>${cnt[c.key]>0?`<span class="ct" style="color:${c.color}">${cnt[c.key]}笔</span>`:''}</button>`;
  }).join('');
  document.getElementById('entryCount').textContent=`NEW ENTRY · ${state.session.entries.length}笔已录入`;
  document.getElementById('btnAddText').textContent=`添加 ${CATS[state.activeCat].label}`;

  const isExp    = state.activeCat==='expense';
  const isRefund = state.activeCat==='refund';
  const isIncome = !isExp && !isRefund;

  // ── 押金退款：锁定老租客，只显示金额+备注 ──
  if(isRefund){
    state.formTag='Old'; // force Old Tenant
    document.getElementById('tagWrap').style.display='none';
    document.getElementById('dueWrap').style.display='none';
    document.getElementById('priceWrap').style.display='none';
    document.getElementById('paytypeWrap').style.display='none';
    document.getElementById('transferToWrap').style.display='none';
    document.getElementById('newTenantWrap').style.display='none';
    const tfWrap=document.getElementById('transferFeeWrap');
    if(tfWrap) tfWrap.style.display='none';
    const cw=document.getElementById('simpleAmtWrap');
    cw.style.display='block';
    document.getElementById('simpleAmtLabel').innerHTML='退款金额 AED <span style="color:#d93025">*</span><span class="en-sub">REFUND AMOUNT · REQUIRED</span>';
    const fNote=document.getElementById('fNote');
    if(fNote) fNote.placeholder='必填：退房原因 (REQUIRED: reason for checkout)';
    const sb=document.getElementById('btnSettings');
    if(sb) sb.style.display='none';
    document.getElementById('sessionDate').textContent=state.session.date;
    return; // stop here, no price grid needed
  }

  // ── 其他支出 ──
  if(isExp){
    document.getElementById('tagWrap').style.display='none';
    document.getElementById('dueWrap').style.display='none';
    document.getElementById('priceWrap').style.display='none';
    document.getElementById('simpleAmtWrap').style.display='block';
    document.getElementById('simpleAmtLabel').innerHTML='金额 AED<span class="en-sub">AMOUNT</span>';
    document.getElementById('paytypeWrap').style.display='none';
    document.getElementById('transferToWrap').style.display='none';
    document.getElementById('newTenantWrap').style.display='none';
    const tfWrap=document.getElementById('transferFeeWrap');
    if(tfWrap) tfWrap.style.display='none';
    const fNote=document.getElementById('fNote');
    if(fNote) fNote.placeholder='可留空';
    const sb=document.getElementById('btnSettings');
    if(sb) sb.style.display='none';
    document.getElementById('sessionDate').textContent=state.session.date;
    return;
  }

  // ── 现金/银行收款（应收/实收模式）──
  // isTransfer / isNew 必须在最前面声明，后面所有逻辑都会用到
  const isTransfer=state.formTag==='Transfer';
  const isNew=state.formTag==='New';

  document.getElementById('tagWrap').style.display='block';
  document.getElementById('dueWrap').style.display='block';
  document.getElementById('simpleAmtWrap').style.display='none';
  document.getElementById('priceWrap').style.display='none';
  document.getElementById('customAmtWrap').style.display='none';
  document.getElementById('paytypeWrap').style.display='none';
  const fNote=document.getElementById('fNote');
  if(fNote) fNote.placeholder='可留空';
  const sb=document.getElementById('btnSettings');
  if(sb) sb.style.display=role==='manager'?'flex':'none';
  // 新租客：标签明确为"租金"，与押金区分
  const fDueInc=document.getElementById('fDue');
  const fPaidInc=document.getElementById('fPaid');
  if(isNew){
    if(fDueInc){const l=fDueInc.closest('.field')?.querySelector('label');if(l)l.innerHTML='应收租金 AED<span class="en-sub">RENT DUE</span>';}
    if(fPaidInc){const l=fPaidInc.closest('.field')?.querySelector('label');if(l)l.innerHTML='实收租金 AED<span class="en-sub">RENT PAID</span>';}
    if(fDueInc) fDueInc.placeholder='本期租金应收';
    if(fPaidInc) fPaidInc.placeholder='租金实际收取';
  } else if(!isTransfer){
    // 老租客：普通标签
    if(fDueInc){const l=fDueInc.closest('.field')?.querySelector('label');if(l)l.innerHTML='应收金额 AED<span class="en-sub">AMOUNT DUE</span>';}
    if(fPaidInc){const l=fPaidInc.closest('.field')?.querySelector('label');if(l)l.innerHTML='实收金额 AED<span class="en-sub">AMOUNT PAID</span>';}
    if(fDueInc) fDueInc.placeholder='本期应付';
    if(fPaidInc) fPaidInc.placeholder='实际收取';
  }
  document.getElementById('transferToWrap').style.display=isTransfer?'block':'none';
  const tfWrap=document.getElementById('transferFeeWrap');
  if(tfWrap) tfWrap.style.display='none';

  const fDueEl=document.getElementById('fDue');
  const fPaidEl=document.getElementById('fPaid');
  if(isTransfer){
    // 换床位：应收换床费默认50，可改为0表示豁免
    if(fDueEl){
      fDueEl.placeholder='换床位费（默认50，豁免填0）';
      // 仅首次切换到换床位时预填50（字段为空时）
      if(!fDueEl.value || fDueEl.value==='0') fDueEl.value='50';
      // 用 parentElement 精确定位标签（避免CSS选择器选错元素）
      const dueLabel=fDueEl.closest('.field')?.querySelector('label');
      if(dueLabel) dueLabel.innerHTML='应收换床费 AED<span class="en-sub">TRANSFER FEE DUE</span>';
    }
    if(fPaidEl){
      fPaidEl.placeholder='实收换床费';
      const paidLabel=fPaidEl.closest('.field')?.querySelector('label');
      if(paidLabel) paidLabel.innerHTML='实收换床费 AED<span class="en-sub">TRANSFER FEE PAID</span>';
    }
    // 更新备注提示
    const fNote=document.getElementById('fNote');
    if(fNote) fNote.placeholder='如豁免换床费，请在此说明原因（如：客户受伤）';
    // 隐藏日期字段直到用户实际输入实收金额并有差额
    const _ddw=document.getElementById('dueDateWrap');
    if(_ddw) _ddw.style.display='none';
    document.getElementById('fDueDate')&&(document.getElementById('fDueDate').value='');
    calcDeficit();
  } else {
    // 非换床位：恢复原标签
    if(fDueEl) fDueEl.placeholder='本期应付';
    if(fPaidEl) fPaidEl.placeholder='实际收取';
    const dueLabel=document.querySelector('#dueWrap .field:first-child label');
    if(dueLabel) dueLabel.innerHTML='应收金额 AED<span class="en-sub">AMOUNT DUE</span>';
    const paidLabel=document.querySelector('#dueWrap .field:last-child label');
    if(paidLabel) paidLabel.innerHTML='实收金额 AED<span class="en-sub">AMOUNT PAID</span>';
  }

  const ntWrap=document.getElementById('newTenantWrap');
  if(ntWrap) ntWrap.style.display=isNew?'block':'none';
  const tdl=document.getElementById('totalDueLabel');
  if(tdl) tdl.style.display=isNew?'block':'none';

  document.getElementById('sessionDate').textContent=state.session.date;
  // renderPriceGrid() removed - using 应收/实收 mode
}
function renderPriceGrid(){
  const prices=state.presetPrices;
  const sel=state.formPrice;
  const isTransfer=state.formTag==='Transfer'&&state.activeCat!=='expense';
  const isExp=state.activeCat==='expense';
  const cw=document.getElementById('customAmtWrap');
  const pw=document.getElementById('paytypeWrap');

  if(isTransfer){
    document.getElementById('priceGrid').innerHTML=
      '<button class="price-btn'+(sel===50?' sel':'')+'" data-price="50" style="grid-column:span 2">50 AED 换床位费</button>'+
      '<button class="price-btn custom'+(sel==='custom'?' sel':'')+'" data-price="custom" style="grid-column:span 2">豁免（须在备注说明原因）</button>';
    // For Transfer waiver: hide amount and paytype, reason goes in 备注(fNote)
    cw.style.display='none';
    pw.style.display='none';
    const ds=document.getElementById('discSection');
    const is=document.getElementById('instSection');
    if(ds) ds.style.display='none';
    if(is) is.style.display='none';
    if(sel==='custom') state.formPayType='discount';
    // Update note placeholder to guide user
    const noteInput=document.getElementById('fNote');
    if(noteInput) noteInput.placeholder=sel==='custom'?'必填：豁免原因（如：腿部受伤行动不便）':'可留空';
  } else {
    document.getElementById('priceGrid').innerHTML=
      prices.map(p=>'<button class="price-btn'+(sel===p?' sel':'')+'" data-price="'+p+'">'+p+'</button>').join('')+
      '<button class="price-btn custom'+(sel==='custom'?' sel':'')+'" data-price="custom">其他金额</button>';
    if(!isExp){
      cw.style.display=(sel==='custom')?'block':'none';
      pw.style.display=(sel==='custom')?'block':'none';
    }
  }
}
function updateInstallRemain(){
  if(state.formPayType!=='installment') return;
  const amt=parseFloat(document.getElementById('fAmount')?.value)||0;
  const stdSel=document.getElementById('fInstStandard');
  const standardPrice=stdSel?parseFloat(stdSel.value)||0:0;
  const remain=standardPrice>amt?standardPrice-amt:0;
  const ir=document.getElementById('fInstRemain');
  if(ir) ir.value=remain>0?fmtMoney(remain):'';
}
function setPayType(t){
  state.formPayType=t;
  if(document.getElementById('btnDisc'))
    document.getElementById('btnDisc').className='paytype-btn'+(t==='discount'?' sel-disc':'');
  if(document.getElementById('btnInst'))
    document.getElementById('btnInst').className='paytype-btn'+(t==='installment'?' sel-inst':'');
  const ds=document.getElementById('discSection');
  const is=document.getElementById('instSection');
  if(ds) ds.style.display=t==='discount'?'block':'none';
  if(is) is.style.display=t==='installment'?'block':'none';
  if(t==='installment') buildInstallSection();
}
function buildInstallSection(){
  const is=document.getElementById('instSection');
  if(!is) return;
  const prices=state.presetPrices;
  is.innerHTML=`<div class="paytype-label">分期详情</div>
    <div class="field" style="margin-bottom:8px">
      <label>标准租金（全额是多少？）</label>
      <select class="sel" id="fInstStandard" onchange="updateInstallRemain()">
        ${prices.map(p=>`<option value="${p}">${p} AED</option>`).join('')}
      </select>
    </div>
    <div class="form-row" style="margin-bottom:8px">
      <div class="field">
        <label>尾款金额（自动计算）</label>
        <input class="inp mono" id="fInstRemain" placeholder="自动" readonly style="background:var(--surface3);color:#1a73e8;font-weight:700">
      </div>
      <div class="field">
        <label>还款日期 <span style="color:#d93025">*</span></label>
        <input class="inp" id="fInstDate" type="date" style="color-scheme:light" onchange="updateInstallRemain()">
      </div>
    </div>
    <div class="hint" style="text-align:left;color:#1a73e8">录入后自动生成欠款提醒，还款时系统自动核销</div>`;
  updateInstallRemain();
}
/* onDepositInput removed - deposit uses fDepDue/fDepPaid */
/* 老板视角：从云端静默刷新欠款列表 */
async function refreshArrearsFromCloud(){
  if(role!=='manager') return;
  try{
    const r=await apiFetch('/api/arrears');
    if(!r.ok) return;
    const rows=await r.json();
    state.arrears=rows.map(a=>({
      id:a.id,room:a.room,note:a.note,remain:a.remain,
      dueDate:a.due_date,type:a.type||'rent',
      sessionId:a.session_id,entryId:a.entry_id,cleared:false
    }));
    saveArrears();        // 同步到本地 localStorage
    renderArrearsPanel(); // 静默更新面板
  }catch(e){console.warn('refreshArrearsFromCloud:',e);}
}

function renderArrearsPanel(){
  const panel=document.getElementById('arrearsPanel');
  if(!panel) return;
  const visible=role==='manager'?state.arrears:state.arrears.filter(a=>a.sessionId===state.session.id);
  const active=visible.filter(a=>!a.cleared);
  if(!active.length){panel.innerHTML='';return;}
  const today=fmtD(new Date());
  active.sort((a,b)=>(a.dueDate||'9999').localeCompare(b.dueDate||'9999'));
  panel.innerHTML=`<div class="arrears-panel">
    <div class="arrears-head">
      <div class="arrears-title">
        ⚠ 待收尾款<span class="en-sub" style="font-size:8px;letter-spacing:0.06em">OUTSTANDING</span>
        <span style="background:#d93025;color:#fff;font-size:11px;padding:2px 8px;border-radius:10px;font-weight:700;margin-left:4px">${active.length} 笔</span>
      </div>
      <span style="font-size:11px;color:#b35a00;font-family:JetBrains Mono,monospace">${(()=>{const known=active.filter(a=>a.remain!=null);const unk=active.filter(a=>a.remain==null);const tot=Math.round(known.reduce((s,a)=>s+(a.remain||0),0)*100)/100;return '共 '+fmtMoney(tot)+' AED'+(unk.length?' + '+unk.length+'笔待定':'');})()}</span>
    </div>
    ${active.map(a=>{
      const overdue=a.dueDate&&a.dueDate<today;
      const daysLeft=a.dueDate?Math.ceil((new Date(a.dueDate)-new Date(today))/(1000*60*60*24)):null;
      const urgency=overdue?'#d93025':daysLeft!==null&&daysLeft<=3?'#e06c00':'#b35a00';
      return `<div class="arrear-row">
        <span class="arrear-room">#${esc(a.room)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.note||'分期尾款')}</div>
          <div style="font-size:10px;color:${urgency};font-family:JetBrains Mono,monospace;margin-top:1px">
${overdue?('⚠ 已逾期 '+esc(a.dueDate)):daysLeft===0?'今天到期':daysLeft===1?'明天到期':daysLeft!==null?(daysLeft+'天后到期 '+esc(a.dueDate)):'无截止日 · 尽快安排'}
          </div>
        </div>
        ${(()=>{
          // 押金类型：有金额就显示金额，remain=null才显示"待定"
          const amtStr = a.remain==null ? '押金待定'
            : a.remain>0 ? fmtMoney(a.remain)+' AED'
            : '—';
          const clr = a.type==='deposit' ? '#1a73e8' : urgency;
          return '<span class="arrear-remain" style="color:'+clr+';font-weight:700">'+amtStr+'</span>';
        })()}
        <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">
          ${a.type==='deposit'
            ? `<button class="arrear-clr" style="background:#1a73e8;color:#fff;font-size:10px;padding:4px 8px;border-radius:6px;border:none;cursor:pointer;white-space:nowrap" onclick="enterDepositForArrear(${jsArg(a.id)})">💰 录入押金</button>`
            : `<button class="arrear-clr" style="background:#1a8a4a;color:#fff;font-size:10px;padding:4px 8px;border-radius:6px;border:none;cursor:pointer;white-space:nowrap" onclick="enterPaymentForArrear(${jsArg(a.id)})">💰 录入收款</button>`
          }
          ${role==='manager'?`<button style="background:transparent;color:#999;font-size:9px;padding:2px 4px;border:1px solid #ddd;border-radius:4px;cursor:pointer;white-space:nowrap" onclick="dismissArrear(${jsArg(a.id)})">作废</button>`:''}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}
/* ── 录入收款/押金 → 不直接核销，引导员工录入流水 ── */
function enterPaymentForArrear(id){
  const ar=state.arrears.find(a=>a.id===id);
  if(!ar) return;
  // 切换到现金收款（默认）
  state.activeCat='cash';
  state.formTag='Old';
  state.formPayType=null;
  renderCatTabs();
  // 预填床位号
  const fRoom=document.getElementById('fRoom');
  if(fRoom){fRoom.value=ar.room;}
  // 预填应收金额（欠款金额）
  const fDue=document.getElementById('fDue');
  const fPaid=document.getElementById('fPaid');
  if(fDue&&ar.remain>0){
    fDue.value=ar.remain;
    if(fPaid){fPaid.value='';fPaid.focus();}
    calcDeficit();
  } else if(fDue){
    fDue.value='';
    if(fPaid){fPaid.value='';}
  }
  // 滚动到录入表单
  const form=document.getElementById('entryForm');
  if(form) form.scrollIntoView({behavior:'smooth',block:'center'});
  // 关联欠款ID：提交时直接更新此条欠款，不重复生成
  state._linkedArrearId = ar.id;
  toast(`已填入 ${ar.room}，请填写实收金额后添加记录`, 'info');
}

function enterDepositForArrear(id){
  const ar=state.arrears.find(a=>a.id===id);
  if(!ar) return;
  // 补收押金：不是新入住，不需要重填入住日期
  // 用弹窗直接录入押金金额和收款方式
  let _cat='cash';
  const depModal=showModal(
    '录入押金收款',
    ar.room+' · 补收押金（入住信息已有记录）',
    `<div class="field" style="margin-bottom:14px">
      <label>实收押金金额 AED <span style="color:#d93025">*</span></label>
      <input class="inp mono" id="mDepAmt" inputmode="decimal" placeholder="押金金额" style="font-size:22px;text-align:center">
    </div>
    <div class="field" style="margin-bottom:14px">
      <label>收款方式</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
        <button id="mBtnCash" class="btn" data-dep-cat="cash" style="border:2px solid var(--accent);background:rgba(26,158,63,0.08);color:var(--accent);font-weight:700">💵 现金</button>
        <button id="mBtnBank" class="btn" data-dep-cat="bank" style="border:1px solid var(--border);background:var(--surface2);color:var(--text)">🏦 银行</button>
      </div>
    </div>
    <div class="field">
      <label>备注（可留空）</label>
      <input class="inp" id="mDepNote" placeholder="如：现金已收">
    </div>`,
    [{label:'确认录入',icon:'i-check',onClick:async ()=>{
      const amt=parseMoney(document.getElementById('mDepAmt')?.value||'0');
      if(!amt||isNaN(amt)){toast('请填写押金金额','err');return;}
      const cat=window._mDepCat||'cash';
      const note=(document.getElementById('mDepNote')?.value.trim())||'补收押金';
      // 创建押金收款记录（tag=Old，不需要入住日期）
      const entry={
        id:newId(), cat, room:ar.room, amount:amt, note,
        tag:'Old', depositCollection:true
      };
      // 同时记录 due/paid（押金无欠款）
      entry.due=amt; entry.paid=amt; entry.deficit=0;
      state.session.entries.push(entry);
      // 核销押金提醒（云端+本地）
      try{await apiFetch('/api/clear_arrear',{method:'POST',body:JSON.stringify({id:ar.id})});}catch{}
      ar.cleared=true; ar.collectedAmt=amt;
      saveArrears();
      renderEntryView(); saveCur();
      document.querySelector('.modal-bg')?.remove();
      window._mDepCat=null;
      state._linkedArrearId=null;
  toast('✅ 押金 '+fmtMoney(amt)+' AED 已录入并核销');
    }}]
  );
  window._mDepCat='cash';
  setTimeout(()=>document.getElementById('mDepAmt')?.focus(),150);
}

/* 作废：仅用于特殊情况（需二次确认），不录入任何收款 */
async function dismissArrear(id){
  if(!confirm('作废此提醒？\n注意：此操作不会录入任何收款记录，\n仅适用于录入错误等特殊情况。')) return;
  try{await apiFetch('/api/clear_arrear',{method:'POST',body:JSON.stringify({id})});}catch{}
  const ar=state.arrears.find(a=>a.id===id);
  if(!ar) return;
  ar.cleared=true;saveArrears();renderArrearsPanel();
  toast(`已作废提醒：${ar.room}`);
}
/* 兼容旧代码 */
function clearArrear(id){ dismissArrear(id); }
function saveArrears(){LS.set(ARREARS_KEY,JSON.stringify(state.arrears));}

function renderLedger(){
  const wrap=document.getElementById('ledgerList');
  if(!state.session.entries.length){wrap.innerHTML=`<div class="empty-state"><div class="empty-ico">✦</div><div class="empty-title">尚无记录</div><div class="empty-text">选择类别，填写信息后添加</div></div>`;return;}
  let html='';
  Object.values(CATS).forEach(c=>{
    const list=state.session.entries.filter(e=>e.cat===c.key);if(!list.length)return;
    const sub=Math.round(list.reduce((s,e)=>s+Number(e.amount||0),0)*100)/100;
    html+=`<div class="cat-block"><div class="cat-block-head"><div class="cat-block-title"><span>${c.emoji}</span><span style="color:${c.color}">${c.label}</span><span style="color:var(--text3);font-weight:400;font-size:11px">· ${list.length}笔</span></div><span class="cat-block-total" style="color:${c.color}">${fmtMoney(sub)}</span></div>${list.map(it=>rowHTML(it,c)).join('')}</div>`;
  });
  wrap.innerHTML=html;
}
function rowHTML(item,c){
  const tc=TAG_COLORS[item.tag]||TAG_COLORS.Old;
  const tagBadge=item.cat!=="expense"?`<span class="entry-tag" style="background:${tc.bg};color:${tc.c}">${TAG_DISP[item.tag]||item.tag||"O"}</span>`:"";
  const discBadge=item.payType==="discount"?`<span class="entry-tag" style="background:rgba(224,108,0,0.12);color:#e06c00">折扣</span>`:"";
  const instBadge=item.payType==="installment"?`<span class="entry-tag" style="background:rgba(26,115,232,0.12);color:#1a73e8">分期</span>`:"";
  const badges=tagBadge+discBadge+instBadge;
  const roomStr=item.roomTo?`${esc(item.room)}→${esc(item.roomTo)}`:esc(item.room);
  const amtMain=`<span style="font-weight:700;color:${c.color};font-family:JetBrains Mono,monospace">${fmtMoney(item.amount)}</span>`;
  const rentDef=Math.round((item.deficit||0)*100)/100;
  const amtSub=rentDef>0?`<span style="font-size:11px;color:#bbb;margin-left:4px">应${fmtMoney(item.due)}</span>`:"";
  const pp=[];
  if(item.tag==="New"){
    if(item.startDate) pp.push(item.startDate);
    if(rentDef>0){const dd=item.dueDate?` · 还${item.dueDate}`:"";pp.push(`<span style="color:#d93025">欠租${fmtMoney(rentDef)}${dd}</span>`);}
    const ddf=Math.round((item.depDef||0)*100)/100;
    if((item.depDue||0)>0){
      pp.push(ddf>0
        ?`押${fmtMoney(item.depPaid||0)} <span style="color:#d93025">欠押${fmtMoney(ddf)}</span>`
        :`<span style="color:#1a8a4a">押${fmtMoney(item.depPaid||0)}✓</span>`);
    } else if((item.deposit||0)>0){
      pp.push(`<span style="color:#1a8a4a">押${fmtMoney(item.deposit)}</span>`);
    }
  } else {
    if(rentDef>0){const dd=item.dueDate?` · 还${item.dueDate}`:"";pp.push(`<span style="color:#d93025">欠${fmtMoney(rentDef)}${dd}</span>`);}
    if(item.depositCollection) pp.push(`<span style="color:#1a73e8">补押金</span>`);
  }
  const note=item.cat!=="expense"?(item.discountReason||item.note||""):(item.note||"");
  if(note&&note!=="—") pp.push(esc(note));
  const info=pp.length?`<div style="font-size:10px;color:#888;margin-top:3px;line-height:1.6">${pp.join(" &nbsp;·&nbsp; ")}</div>`:"";
  return `<div class="entry-row" data-id="${item.id}" style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px"><div style="flex-shrink:0;padding-top:1px">${badges}</div><div style="flex:1;min-width:0"><div style="display:flex;align-items:baseline"><span style="font-weight:700;font-size:15px;font-family:JetBrains Mono,monospace">${roomStr}</span>${amtSub}</div>${info}</div><div style="flex-shrink:0;text-align:right;padding-top:1px">${amtMain}<div class="entry-actions" style="margin-top:4px;justify-content:flex-end"><button class="icon-btn danger" data-action="del"><svg class="ico"><use href="#i-trash"/></svg></button></div></div></div>`;
}
function renderEntryView(){renderSummary();renderCatTabs();renderLedger();renderArrearsPanel();}

/* ── ENTRY ACTIONS ── */

/* ── 应收/实收 实时差额计算 ── */

/* ── 押金 应收/实收 差额实时计算 ── */
function calcDepDeficit(){
  const due  = parseMoney(document.getElementById('fDepDue')?.value||'0');
  const paid = parseMoney(document.getElementById('fDepPaid')?.value||'0');
  const disp = document.getElementById('depDeficitDisplay');
  if(!disp) return;
  if(!due && !paid){ disp.style.display='none'; return; }
  const diff = Math.round((due-paid)*100)/100;
  const red   = 'display:block;border-radius:6px;padding:8px 10px;font-size:12px;margin-top:6px;background:rgba(217,48,37,0.08);border:1px solid rgba(217,48,37,0.25);color:#d93025';
  const green = 'display:block;border-radius:6px;padding:8px 10px;font-size:12px;margin-top:6px;background:rgba(26,138,74,0.07);border:1px solid rgba(26,138,74,0.25);color:#1a8a4a';
  disp.style.display='block';
  const dpw=document.getElementById('depDateWrap');
  if(Math.round(diff*100)>0){
    disp.style.cssText=red;
    disp.innerHTML='⚠️ 押金欠 <b>'+fmtMoney(diff)+' AED</b>';
    if(dpw) dpw.style.display='block';
  } else if(Math.round(diff*100)<0){
    disp.style.cssText=green;
    disp.innerHTML='💰 押金多付 <b>'+fmtMoney(-diff)+' AED</b>';
    if(dpw) dpw.style.display='none';
  } else if(paid>0){
    disp.style.cssText=green;
    disp.innerHTML='✅ 押金付清 <b>'+fmtMoney(paid)+' AED</b>';
    if(dpw) dpw.style.display='none';
  } else { disp.style.display='none'; if(dpw) dpw.style.display='none'; }
}
function calcDeficit(){
  const rentDue = parseMoney(document.getElementById('fDue')?.value||'0');
  const paid    = parseMoney(document.getElementById('fPaid')?.value||'0');
  const disp    = document.getElementById('deficitDisplay');
  if(!disp) return;

  // 租金差额（押金通过 calcDepDeficit 单独计算）
  if(!rentDue && !paid){ disp.style.display='none'; return; }

  const red   = 'display:block;border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:8px;background:rgba(217,48,37,0.08);border:1px solid rgba(217,48,37,0.25);color:#d93025';
  const green = 'display:block;border-radius:8px;padding:10px 12px;font-size:13px;margin-bottom:8px;background:rgba(26,138,74,0.07);border:1px solid rgba(26,138,74,0.25);color:#1a8a4a';

  // 统一路径：租金应收 vs 实收
  const diff = Math.round((rentDue-paid)*100)/100;
  disp.style.display='block';
  const ddw=document.getElementById('dueDateWrap');
  // 只有在用户明确输入了实收金额且存在差额时才显示截止日期
  const paidEntered=(document.getElementById('fPaid')?.value||'').trim()!=='';
  if(Math.round(diff*100)>0 && paidEntered){
    disp.style.cssText=red;
    disp.innerHTML='⚠️ 欠租 <b>'+fmtMoney(diff)+' AED</b>&nbsp;&nbsp;应收'+fmtMoney(rentDue)+'−实收'+fmtMoney(paid);
    if(ddw) ddw.style.display='block';
  } else if(Math.round(diff*100)>0 && !paidEntered){
    // 应收已填但实收未填，提示输入（不显示截止日期）
    disp.style.cssText=red;
    disp.innerHTML='请填写实收金额';
    if(ddw) ddw.style.display='none';
  } else if(diff<-0.005){
    disp.style.cssText=green;
    disp.innerHTML='💰 多付 <b>'+fmtMoney(-diff)+' AED</b>&nbsp;&nbsp;可抵下期租金';
    if(ddw) ddw.style.display='none';
  } else if(paid>0){
    disp.style.cssText=green;
    disp.innerHTML='✅ 全额付清&nbsp;&nbsp;<b>'+fmtMoney(paid)+' AED</b>';
    if(ddw) ddw.style.display='none';
  } else { disp.style.display='none'; if(ddw) ddw.style.display='none'; }
}

function addEntry(){
  const room=document.getElementById('fRoom').value.trim();
  if(!room){toast('请填写床位号','err');return;}
  const isExp    = state.activeCat==='expense';
  const isRefund = state.activeCat==='refund';
  const isTransfer=state.formTag==='Transfer'&&!isExp&&!isRefund;
  // ⚠️ note 必须在最前面声明，避免 TDZ（所有验证分支都会使用）
  const note=document.getElementById('fNote')?.value.trim()||'';
  let amount=0;

  // ── 押金退款：只需金额+备注（必填）──
  if(isRefund){
    amount=parseMoney(document.getElementById('fAmount')?.value||'0');
    if(!amount||isNaN(amount)){toast('请填写退款金额','err');return;}
    // 直接用外层 note（已在函数顶部读取），不再重复声明
    if(!note){toast('押金退款必须填写备注（退房原因）','err');return;}
    const entry={id:newId(),cat:'refund',room,amount,note,tag:'Old'};
    state.session.entries.push(entry);
    document.getElementById('fRoom').value='';
    document.getElementById('fAmount').value='';
    document.getElementById('fDue')?.value && (document.getElementById('fDue').value='');
    document.getElementById('fPaid')?.value && (document.getElementById('fPaid').value='');
    const dd=document.getElementById('deficitDisplay');if(dd)dd.style.display='none';
    document.getElementById('fNote').value='';
    document.getElementById('fRoom').focus();
    renderEntryView();saveCur();
    return;
  }

  if(isExp){
    // 其他支出：单一金额
    amount=parseMoney(document.getElementById('fAmount')?.value||'0');
    if(!amount||isNaN(amount)){toast('请填写支出金额','err');return;}
    if(!note){toast('支出必须填写原因','err');return;}
  } else {
    // 现金/银行收款：应收/实收模式
    const dueRaw  = (document.getElementById('fDue')?.value||'').trim();
    const paidRaw = (document.getElementById('fPaid')?.value||'').trim();
    const due  = parseMoney(dueRaw);
    const paid = parseMoney(paidRaw);
    if(dueRaw===''||isNaN(due)){toast('请填写应收金额','err');return;}
    // 应收不能为0（换床位豁免除外，那有单独逻辑）
    if(due<=0 && !isTransfer){
      if(!(note||'').trim()){toast('应收为0时必须在备注说明原因（如：本月免租）','err');return;}
    }
    if(paidRaw===''||isNaN(paid)){toast('请填写实收金额','err');return;}
    if(due>99999||paid>99999){toast('金额超过99,999 AED，请核实是否输入有误','err');return;}
    amount=paid;  // 先设为租金实收，新租客后续加押金
    state._pendingDue    = due;   // 已通过parseMoney四舍五入
    state._pendingPaid   = paid;  // 已通过parseMoney四舍五入
    state._pendingDeficit= Math.round((due-paid)*100)/100;
  }

  const roomTo=document.getElementById('fRoomTo')?.value.trim()||'';
  const isNew=state.formTag==='New'&&!isExp;

  // New tenant: validate start date + deposit
  let deposit=0, depDue=0, depPaid=0, startDate='';
  if(isNew){
    startDate=document.getElementById('fStartDate')?.value||'';
    if(!startDate){toast('新租客必须填写入住日期','err');return;}
    const depDueRaw=(document.getElementById('fDepDue')?.value||'').trim();
    const depPaidRaw=(document.getElementById('fDepPaid')?.value||'').trim();
    depDue  = parseMoney(depDueRaw);
    depPaid = parseMoney(depPaidRaw);
    deposit = depPaid;
    // 押金字段已填但应收为0 → 免押金，需要备注
    if(depDueRaw!=='' && depDue<=0 && !(note||'').trim()){
      toast('免押金必须在备注说明原因（如：长租客免押）','err'); return;
    }
    // 押金字段都没填 → 视为不追踪押金（允许）
  }

  // 新租客：amount = 租金实收 + 押金实收（总入账金额）
  if(isNew) amount = Math.round((amount + depPaid)*100)/100;

  const entry={id:newId(),cat:state.activeCat,room,amount,note,tag:isExp?undefined:state.formTag};
  if(isNew){
    entry.deposit  = depPaid;   // 今日实收押金
    entry.depDue   = depDue;    // 应收押金
    entry.depPaid  = depPaid;   // 实收押金
    entry.depDef   = Math.max(0, Math.round((depDue-depPaid)*100)/100);
    entry.startDate= startDate;
  }
  // 换至床位必填 + 不能换到同一张床
  if(isTransfer){
    if(!roomTo||!roomTo.trim()){toast('请填写换至床位号','err');return;}
    if(roomTo.trim()===room.trim()){toast('换至床位不能与当前床位相同','err');return;}
    entry.roomTo=roomTo;
  }
  // 换床位豁免：应收为0时备注必填
  if(isTransfer && parseMoney(document.getElementById('fDue')?.value||'0')===0 && !(note||'').trim()){
    toast('换床位费豁免必须在备注填写原因（如：客户受伤）','err'); return;
  }

  // ── 押金截止日期预验证（必须在所有副作用之前，防止创建孤立欠款）──
  let _depDueDate='';
  if(isNew && Math.round(entry.depDef*100)>0){
    _depDueDate = document.getElementById('fDepDate')?.value||'';
    if(!_depDueDate){ toast('押金欠款必须填写截止日期','err'); return; }
  }

  // 存储应收/实收/差额
  let _linkedHandled = false;  // 函数级声明，避免隐式全局变量
  if(state._pendingDue !== undefined){
    entry.due     = state._pendingDue;
    entry.paid    = state._pendingPaid;
    entry.deficit = state._pendingDeficit;
    state._pendingDue = state._pendingPaid = state._pendingDeficit = undefined;
    const linkedId = state._linkedArrearId;
    if(Math.round(entry.deficit*100)>0){
      if(linkedId){
        // 【关联还款】：更新原欠款记录，不新建
        const orig = state.arrears.find(a=>a.id===linkedId);
        if(orig){
          const newRemain = Math.round((orig.remain - entry.paid)*100)/100;
          if(Math.round(newRemain*100)<=0){
            orig.cleared = true;
            toast('✅ 欠款已全额结清：'+room);
          } else {
            orig.remain = newRemain;
            orig.note = orig.note.replace(/实收[\d.]+/,'实收'+fmtMoney(entry.paid));
            toast('⚠️ 部分还款：'+room+' 剩余欠款'+fmtMoney(newRemain)+' AED','warn');
          }
          saveArrears();
          _linkedHandled = true;  // ✓ 走了关联路径
        }
      } else {
        // 【普通录入】：新建欠款，需要截止日期
        const rentDueDate = document.getElementById('fDueDate')?.value||'';
        if(!rentDueDate){ toast('欠款必须填写还款截止日期','err'); return; }
        const rentNote = isNew
          ? '欠租 · 应收'+fmtMoney(entry.due)+' 实收'+fmtMoney(entry.paid)
          : isTransfer
            ? '欠换床费 · 应收'+fmtMoney(entry.due)+' 实收'+fmtMoney(entry.paid)
            : '欠费 · 应收'+fmtMoney(entry.due)+' 实收'+fmtMoney(entry.paid);
        entry.dueDate=rentDueDate;  // 存入 entry，用于行内显示和导出
        state.arrears.push({
          id:newId(), room, note:rentNote,
          remain:entry.deficit, dueDate:rentDueDate,
          sessionId:state.session.id, cleared:false,
          entryId:entry.id
        });
        saveArrears();
        toast('欠租提醒已建：'+room+' 欠'+fmtMoney(entry.deficit)+' AED，截止'+rentDueDate,'warn');
      }
    } else if(linkedId){
      // 全额还清（无差额）+ 有关联欠款 → 直接核销
      const orig = state.arrears.find(a=>a.id===linkedId&&!a.cleared);
      if(orig){ orig.cleared=true; saveArrears(); toast('✅ 欠款已全额结清：'+room); }
      _linkedHandled = true;  // ✓ 走了关联路径
    }
    state._linkedArrearId = null;
  }
  // ── 所有验证通过后，才 push entry ──
  state.session.entries.push(entry);

  // 新租客：押金欠款（已预验证，直接创建）
  if(isNew && Math.round(entry.depDef*100)>0){
    state.arrears.push({id:newId(),room,
      note:'欠押金 · 应收'+fmtMoney(depDue)+' 实收'+fmtMoney(depPaid),
      remain:entry.depDef,dueDate:_depDueDate,type:'deposit',
      sessionId:state.session.id,cleared:false,entryId:entry.id});
    saveArrears();
    toast('押金提醒已建：'+room+' 欠押金'+fmtMoney(entry.depDef)+' AED，截止'+_depDueDate,'warn');
  } else if(isNew && depDue>0 && Math.round(entry.depDef*100)<=0){
    if(Math.round((entry.deficit||0)*100)<=0) toast('✅ 租金和押金全额付清');
  }

  // Auto-clear：仅对老租客/换床位执行，新客 amount 含押金容易误清
  if(!isExp&&!isRefund&&!_linkedHandled&&!isNew&&Math.round((entry.deficit||0)*100)===0){
    const matched = state.arrears.find(a=>
      !a.cleared && a.room===room &&
      a.type!=='deposit' &&
      a.entryId!==entry.id &&  // 不能核销本次刚创建的欠款
      Math.round(a.remain*100)===Math.round(amount*100)
    );
    if(matched){matched.cleared=true;saveArrears();renderArrearsPanel();toast('✅ 已收款并自动核销：'+room+' '+fmtMoney(amount)+' AED');}
  }

  // Reset form
  document.getElementById('fRoom').value='';
  if(document.getElementById('fRoomTo')) document.getElementById('fRoomTo').value='';
  if(document.getElementById('fAmount')) document.getElementById('fAmount').value='';
  if(document.getElementById('fNote')) document.getElementById('fNote').value='';
  if(document.getElementById('fDiscReason')) document.getElementById('fDiscReason').value='';
  // ── 清空所有表单字段（每个字段仅清一次）──
  ['fDue','fPaid','fDueDate','fDepDue','fDepPaid','fDepDate','fStartDate']
    .forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['deficitDisplay','dueDateWrap','depDeficitDisplay','depDateWrap','totalDueLabel']
    .forEach(id=>{const el=document.getElementById(id);if(el)el.style.display='none';});
  // 重置状态（formPrice已废弃，仅清理残留state）
  state.formPayType=null;
  // 重置类型为老租客（最常见操作）
  state.formTag='Old';
  state._linkedArrearId=null;
  document.querySelectorAll('#entryForm .tag-btn').forEach(x=>x.classList.toggle('active',x.dataset.tag==='Old'));
  renderCatTabs();
  document.getElementById('fRoom').focus();
  renderEntryView();saveCur();
}

function showSettings(){
  const prices=state.presetPrices;
  showModal('固定租金设置','最多8个价格，逗号分隔',
    `<div class="field"><label>当前固定租金（AED）</label><input class="inp mono" id="mPrices" value="${prices.join(', ')}" placeholder="600, 650, 700, 750"></div>
     <div class="hint" style="text-align:left;margin-top:8px">修改后立即生效，员工录入时看到更新后的价格</div>`,
    [{label:'保存',icon:'i-check',onClick:()=>{
      const raw=document.getElementById('mPrices').value;
      const parsed=raw.split(/[,，\s]+/).map(v=>parseFloat(v.trim())).filter(v=>!isNaN(v)&&v>0).slice(0,8);
      if(!parsed.length){toast('至少需要一个有效价格','err');return;}
      state.presetPrices=parsed;
      LS.set(PRICES_KEY,JSON.stringify(parsed));
      renderPriceGrid();
      toast('租金价格已更新');
      document.querySelector('.modal-bg')?.remove();
    }}]
  );
  depModal?.querySelectorAll('[data-dep-cat]').forEach(btn=>{
    btn.onclick=()=>{
      const cat=btn.dataset.depCat||'cash';
      window._mDepCat=cat;
      const cash=depModal.querySelector('#mBtnCash'),bank=depModal.querySelector('#mBtnBank');
      if(cash)cash.style.cssText=cat==='cash'
        ?'border:2px solid var(--accent);background:rgba(26,158,63,0.08);color:var(--accent);font-weight:700'
        :'border:1px solid var(--border);background:var(--surface2);color:var(--text)';
      if(bank)bank.style.cssText=cat==='bank'
        ?'border:2px solid var(--accent);background:rgba(26,158,63,0.08);color:var(--accent);font-weight:700'
        :'border:1px solid var(--border);background:var(--surface2);color:var(--text)';
    };
  });
}
function editEntryInline(id){
  const item=state.session.entries.find(e=>e.id===id);if(!item)return;
  const row=document.querySelector(`.entry-row[data-id="${id}"]`);if(!row)return;
  const isExp=item.cat==='expense';
  row.outerHTML=`<div class="row-edit" data-id="${id}"><input class="inp mono" data-f="room" value="${esc(item.room)}" placeholder="房号"><input class="inp mono" data-f="amount" value="${esc(item.amount)}" placeholder="金额">${!isExp?`<select class="sel" data-f="tag"><option${item.tag==='Old'?' selected':''}>Old</option><option${item.tag==='New'?' selected':''}>New</option></select>`:'<div></div>'}<input class="inp" data-f="note" value="${esc(item.note||'')}" placeholder="备注"><div class="row-edit-actions"><button class="icon-btn save" data-action="save"><svg class="ico"><use href="#i-check"/></svg></button><button class="icon-btn" data-action="cancel"><svg class="ico"><use href="#i-x"/></svg></button></div></div>`;
}
function saveEdit(id){
  const w=document.querySelector(`.row-edit[data-id="${id}"]`);if(!w)return;
  const g=f=>w.querySelector(`[data-f="${f}"]`)?.value;
  const item=state.session.entries.find(e=>e.id===id);if(!item)return;
  const room=(g('room')||'').trim(),amount=parseMoney(g('amount')||'0');
  if(!room){toast('房号不能为空','err');return;}if(!amount||isNaN(amount)){toast('金额无效','err');return;}
  item.room=room;item.amount=amount;item.note=(g('note')||'').trim();
  if(item.cat!=='expense')item.tag=g('tag')||'Old';
  // 编辑后清除 due/paid 追踪字段，避免 KPI 与显示不一致
  // 改为纯 amount 模式（paid=amount, deficit=0）
  if(item.paid!=null){ item.paid=amount; }
  if(item.due!=null){ item.due=amount; item.deficit=0; }
  renderEntryView();saveCur();
}
function delEntry(id){
  if(!confirm('删除此条记录？\n注意：关联的欠款提醒也将同步删除。')) return;
  // 同步删除关联欠款（避免孤儿欠款）
  const before=state.arrears.length;
  state.arrears=state.arrears.filter(a=>a.entryId!==id);
  if(state.arrears.length<before) saveArrears();
  state.session.entries=state.session.entries.filter(e=>e.id!==id);
  renderEntryView();saveCur();
  toast('已删除记录及关联欠款提醒');
}
async function exportSession(){
  if(!state.session.entries.length){toast('当前没有任何记录','err');return;}
  const final={...state.session,date:fmtDT(new Date())};
  if(!final.anchorId)final.anchorId=mkAnchor(final.id,final.date.slice(0,10));
  const{txt,anchorId}=genTXT(final);final.anchorId=anchorId;
  // 本地备份
  LS.set(`session:${final.id}`,JSON.stringify(final));
  state.saved=[final,...state.saved.filter(s=>s.id!==final.id)].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  // 云端保存（D1）
  try{
    const _sAr=state.arrears.filter(a=>a.sessionId===final.id&&!a.cleared);
    const _r=await apiFetch('/api/save_session',{method:'POST',
      body:JSON.stringify({session:final,arrears:_sAr})});
    if(!_r.ok) throw new Error('HTTP '+_r.status);
    toast(`✅ 已同步云端 · ${anchorId}`);
  }catch(e){toast(`已本地保存（云端失败）· ${anchorId}`,'err');}
  // 下载 TXT
  const blob=new Blob([txt],{type:'text/plain;charset=utf-8'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
  const now=new Date();a.download=`财务交接_${fmtD(final.date).replace(/-/g,'')}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;
  a.click();URL.revokeObjectURL(url);
}
function newSession(){
  if(state.session.entries.length&&!confirm('当前会话有未保存记录，确认新开？'))return;
  state.session={id:newId(),date:fmtDT(new Date()),entries:[]};renderEntryView();saveCur();toast('已开启新会话');
}
function showPreview(){
  const{txt}=genTXT(state.session);
  showModal('TXT 预览','导出格式（含锚点）',`<pre>${esc(txt)}</pre>`,[
    {label:'复制',icon:'i-copy',onClick:async()=>{try{await navigator.clipboard.writeText(txt);toast('已复制');}catch{toast('复制失败','err');}}}
  ]);
}

/* ── MODAL ── */
function showModal(title,sub,html,actions=[]){
  const bg=document.createElement('div');bg.className='modal-bg';
  bg.innerHTML=`<div class="modal"><div class="modal-head"><div><div class="card-title">${esc(title)}</div><div class="card-sub">${esc(sub)}</div></div><div style="display:flex;gap:7px;flex-wrap:wrap">${actions.map((a,i)=>`<button class="btn btn-ghost" data-act="${i}"><svg class="ico"><use href="#${a.icon}"/></svg>${esc(a.label)}</button>`).join('')}<button class="icon-btn" data-act="close"><svg class="ico"><use href="#i-x"/></svg></button></div></div><div class="modal-body">${sanitizeHtml(html)}</div></div>`;
  bg.addEventListener('click',e=>{
    if(e.target===bg){bg.remove();return;}
    const a=e.target.closest('[data-act]');if(!a)return;
    const v=a.dataset.act;if(v==='close'){bg.remove();return;}
    const idx=parseInt(v);if(!isNaN(idx)&&actions[idx])actions[idx].onClick();
  });
  document.body.appendChild(bg);
  return bg;
}

/* ── HISTORY（从云端 D1 加载）── */
async function renderHistory(){
  const wrap=document.getElementById('historyContent');

  // 查看单个会话详情
  if(state.historyViewing){
    const s=state.historyViewing;
    if(s._cloud&&(!s.entries||!s.entries.length)){
      wrap.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3)">加载中...</div>';
      try{
        const r=await apiFetchWithTimeout(`/api/session_detail?id=${encodeURIComponent(s.id)}`);
        if(r.status===401){showAuthExpired();wrap.innerHTML='<div class="card" style="padding:24px;text-align:center;color:var(--red)">登录已过期，请重新登录后查看历史</div>';return;}
        if(r.status===403){wrap.innerHTML='<div class="card" style="padding:24px;text-align:center;color:var(--red)">老板账户才能查看历史详情</div>';return;}
        if(!r.ok){wrap.innerHTML=`<div class="card" style="padding:24px;text-align:center;color:var(--red)">历史详情加载失败：${r.status}</div>`;return;}
        const rows=await r.json();
        if(!Array.isArray(rows)){wrap.innerHTML='<div class="card" style="padding:24px;text-align:center;color:var(--red)">历史详情格式异常</div>';return;}
        s.entries=rows.map(tx=>({
          id:tx.id,cat:tx.cat,room:tx.room,amount:tx.amount,
          due:tx.due,paid:tx.paid,deficit:tx.deficit,tag:normTag(tx.tag),note:tx.note,
          roomTo:tx.room_to||undefined,startDate:tx.start_date||undefined,
          depDue:tx.dep_due,depPaid:tx.dep_paid,depDef:tx.dep_def,
          dueDate:tx.due_date||undefined,depDate:tx.dep_date||undefined,
          payType:tx.pay_type||undefined,discountReason:tx.discount_reason||undefined,
          depositCollection:tx.deposit_collection===1
        }));
      }catch(e){console.warn('session_detail failed:',e);wrap.innerHTML=`<div class="card" style="padding:24px;text-align:center;color:var(--red)">历史详情加载失败：${esc(e.message||'网络错误')}</div>`;return;}
    }
    const{txt}=genTXT(s);
    const cnt=s.entries?s.entries.length:0;
    wrap.innerHTML=`<button class="btn btn-ghost" id="btnHistBack" style="margin-bottom:14px"><svg class="ico"><use href="#i-back"/></svg>返回历史</button>
    <div class="card"><div class="card-head"><div>${s.anchorId?`<div class="card-sub" style="color:var(--accent);margin-bottom:3px">🔐 ${esc(s.anchorId)}</div>`:''}<div class="card-title">${esc((s.date||'').slice(0,10))}</div><div class="card-sub">${cnt} 笔记录</div></div><div style="display:flex;gap:7px"><button class="btn btn-ghost" id="btnHistCopy"><svg class="ico"><use href="#i-copy"/></svg>复制</button><button class="btn btn-primary" id="btnHistDl"><svg class="ico"><use href="#i-download"/></svg>下载</button></div></div><div class="card-body"><pre style="background:var(--surface2);padding:14px;border-radius:8px;max-height:60vh;overflow:auto;line-height:1.7;font-size:12px;color:var(--text2);border:1px solid var(--border)">${esc(txt)}</pre></div></div>`;
    document.getElementById('btnHistBack').onclick=()=>{state.historyViewing=null;renderHistory();};
    document.getElementById('btnHistCopy').onclick=async()=>{try{await navigator.clipboard.writeText(txt);toast('已复制');}catch{toast('复制失败','err');}};
    document.getElementById('btnHistDl').onclick=()=>{const blob=new Blob([txt],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`财务交接_${(s.date||'').split(' ')[0].replace(/-/g,'')}.txt`;a.click();URL.revokeObjectURL(url);};
    return;
  }

  // 会话列表：云端 + 本地合并。先显示骨架，避免历史页 15-20 秒空白。
  const limit=state.historyLimit||HISTORY_PAGE_SIZE;
  wrap.innerHTML=`<div class="owner-history-skeleton history-skeleton card" style="padding:18px">
    <div class="hist-toolbar"><span>正在加载最近 ${limit} 条历史...</span><span class="hist-order">LOADING</span></div>
    <div class="hist-grid">
      ${Array.from({length:Math.min(6,limit)}).map(()=>'<div class="hist-card skeleton-card" style="min-height:118px;background:linear-gradient(90deg,rgba(255,255,255,.58),rgba(226,239,233,.72),rgba(255,255,255,.58));background-size:220% 100%;animation:pulse 1.2s ease-in-out infinite"></div>').join('')}
    </div>
  </div>`;
  let cloud=[];
  try{
    const r=await apiFetchWithTimeout(`/api/history?limit=${encodeURIComponent(limit)}`);
    if(r.status===401){showAuthExpired();wrap.innerHTML='<div class="card" style="padding:24px;text-align:center;color:var(--red)">登录已过期，请重新登录后查看历史</div>';return;}
    if(r.ok)cloud=await r.json();
    else{wrap.innerHTML=`<div class="card" style="padding:24px;text-align:center;color:var(--red)">历史记录加载失败：${r.status}</div>`;return;}
  }catch(e){
    const timedOut=e?.name==='AbortError';
    wrap.innerHTML=`<div class="card owner-history-timeout" style="padding:24px;text-align:center;color:var(--red)">
      <div style="font-weight:800;margin-bottom:8px">${timedOut?'历史记录加载超时':'历史记录加载失败'}</div>
      <div style="color:var(--text2);font-size:13px;line-height:1.6;margin-bottom:14px">${timedOut?'最近 20 条历史超过 8 秒仍未返回，请重试或稍后刷新。':'网络异常，请重试。'}</div>
      <button class="btn btn-primary" id="btnHistoryRetry" type="button">重试加载</button>
    </div>`;
    const retry=document.getElementById('btnHistoryRetry');
    if(retry)retry.onclick=()=>renderHistory();
    return;
  }
  const cloudIds=new Set(cloud.map(s=>s.id));
  const localOnly=state.saved.filter(s=>!cloudIds.has(s.id));
  const all=[
    ...cloud.map(s=>({id:s.id,date:s.date,anchorId:s.anchor_id,entries:[],entriesCount:s.entries_count,_cloud:true,createdBy:s.created_by||''})),
    ...localOnly
  ].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const hasMoreCloud=cloud.length>=limit;

  const monthKey=s=>{
    const d=(s.date||'').slice(0,10);
    const m=d.match(/^(\d{4})-(\d{2})/);
    return m?`${m[1]}-${m[2]}`:'unknown';
  };
  const monthLabel=key=>key==='unknown'?'未归档日期':`${key.slice(0,4)}年${key.slice(5,7)}月`;
  const monthMap=new Map();
  all.forEach(s=>{
    const key=monthKey(s);
    if(!monthMap.has(key))monthMap.set(key,[]);
    monthMap.get(key).push(s);
  });
  const groups=[...monthMap.entries()].sort(([a],[b])=>{
    if(a==='unknown')return 1;
    if(b==='unknown')return -1;
     return b.localeCompare(a);
  });

  document.getElementById('historyCount').textContent=`流水档案 · 已加载最近 ${all.length} 条 · ${groups.length} 个月 · 新 → 旧`;
  if(!all.length){wrap.innerHTML=`<div class="empty-state card" style="padding:44px"><div class="empty-ico">📄</div><div class="empty-title">还没有保存过会话</div><div class="empty-text">录入记录后点击"导出交接"即可保存</div></div>`;return;}

  const cardHtml=s=>{
    const has=s.entries&&s.entries.length>0;
    const t=has?totals(s.entries):null;
    const cnt=has?s.entries.length:(s.entriesCount||0);
    return `<div class="hist-card" data-id="${s.id}">
      <div class="hist-date">${esc((s.date||'').slice(0,10))}</div>
      <div class="hist-anchor">${esc(s.anchorId||'—')}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px">${s.createdBy==='manager'?'老板上传':s.createdBy==='staff'?'员工上传':''}</div>
      ${has?`
        <div class="hist-stat"><span style="color:var(--text2)">现金收入</span><span class="mono" style="color:#c8902a">${fmtMoney(t.cashIn)}</span></div>
        <div class="hist-stat"><span style="color:var(--text2)">银行收入</span><span class="mono" style="color:#1a8a4a">${fmtMoney(t.bankIn)}</span></div>
        <div class="hist-stat"><span style="color:var(--text2)">支出</span><span class="mono" style="color:#d93025">-${fmtMoney(t.expOut+t.refundOut)}</span></div>
        <div class="hist-stat"><span>总收入</span><span class="mono">${fmtMoney(t.total)}</span></div>
      `:`<div class="hist-stat" style="justify-content:center;color:var(--text3);font-size:11px">${cnt}笔 · 点击查看详情</div>`}
      <div class="hist-actions">
        <button class="btn btn-ghost" data-act="view"><svg class="ico"><use href="#i-eye"/></svg>查看</button>
        ${role==='manager'?`<button class="btn btn-danger" data-act="del"><svg class="ico"><use href="#i-trash"/></svg></button>`:''}
      </div>
    </div>`;
  };
  wrap.innerHTML=`<div class="hist-toolbar"><span>按月份归类，优先显示最近记录</span><span class="hist-order">RECENT · FIRST</span></div>`+
    groups.map(([key,items],idx)=>{
      const totalEntries=items.reduce((sum,s)=>sum+(s.entries?s.entries.length:(s.entriesCount||0)),0);
      const from=(items[0]?.date||'').slice(0,10)||'--';
      const to=(items[items.length-1]?.date||'').slice(0,10)||from;
      const mid=`hist-month-${idx}`;
      return `<section class="hist-month">
        <button class="hist-month-head" data-month-toggle="${mid}" aria-expanded="true" type="button">
          <span class="hist-month-title"><span class="hist-month-dot"></span>${esc(monthLabel(key))}</span>
          <span class="hist-month-meta">
            <span class="hist-month-chip">${items.length}档</span>
            <span class="hist-month-chip">${totalEntries}笔</span>
            <span class="hist-month-chip">${esc(from)} → ${esc(to)}</span>
            <span class="hist-month-toggle">收起</span>
          </span>
        </button>
        <div class="hist-month-body" id="${mid}">
          <div class="hist-grid">${items.map(cardHtml).join('')}</div>
        </div>
      </section>`;
    }).join('')+
    (hasMoreCloud?`<button class="btn btn-primary btn-block" id="btnHistoryLoadMore" type="button" style="margin-top:14px">加载更多历史</button>`:'');

  wrap.querySelectorAll('[data-month-toggle]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const body=document.getElementById(btn.dataset.monthToggle);
      if(!body)return;
      const open=body.style.display==='none';
      body.style.display=open?'block':'none';
      btn.setAttribute('aria-expanded',open?'true':'false');
      const label=btn.querySelector('.hist-month-toggle');
      if(label)label.textContent=open?'收起':'展开';
    });
  });
  wrap.querySelectorAll('.hist-card').forEach(card=>{
    card.addEventListener('click',async e=>{
      const a=e.target.closest('[data-act]');if(!a)return;
      const id=card.dataset.id;
      const s=all.find(x=>x.id===id);if(!s)return;
      if(a.dataset.act==='del'){
        const ok=await confirmManagerPassword('删除流水记录将同时从云端移除');
        if(!ok) return;
        toast('删除中...');
        try{
          const r=await apiFetch('/api/delete_session',{method:'POST',body:JSON.stringify({id})});
          if(!r.ok) throw new Error('HTTP '+r.status);
        }catch(e){toast('云端删除失败：'+e.message,'err');return;}
        LS.del(`session:${id}`);
        state.saved=state.saved.filter(x=>x.id!==id);
        toast('已删除');
        renderHistory();
      }else if(a.dataset.act==='view'){state.historyViewing=s;renderHistory();}
    });
  });
  const more=document.getElementById('btnHistoryLoadMore');
  if(more)more.onclick=()=>{state.historyLimit=(state.historyLimit||HISTORY_PAGE_SIZE)+HISTORY_PAGE_SIZE;renderHistory();};
}

/* ── ANALYSIS ── */
function renderFilterControls(){
  const wrap=document.getElementById('filterControls');
  const dates=state.analysisSessions.map(s=>(s.date||'').slice(0,10)).filter(Boolean).sort();
  const mn=dates[0]||'',mx=dates[dates.length-1]||'';
  const hint=dates.length?`<div class="hint" style="text-align:left;margin-top:8px">数据范围：<b>${esc(mn)}</b> ~ <b>${esc(mx)}</b></div>`:`<div class="hint" style="text-align:left;margin-top:8px">尚未加载数据</div>`;
  if(state.dateMode==='month'){wrap.innerHTML=`<input type="month" class="inp" id="mInput" value="${state.month}" style="color-scheme:dark">${hint}`;document.getElementById('mInput').onchange=e=>{state.month=e.target.value;renderAnalysis();};}
  else if(state.dateMode==='range'){wrap.innerHTML=`<div class="field"><label>起始</label><input type="date" class="inp" id="fInput" value="${state.from}" style="color-scheme:dark"></div><div class="field" style="margin-top:8px"><label>结束</label><input type="date" class="inp" id="tInput" value="${state.to}" style="color-scheme:dark"></div>${hint}${dates.length?`<button class="btn btn-ghost" id="btnFill" style="margin-top:8px;width:100%;font-size:11px">使用完整数据范围</button>`:''}`;
    document.getElementById('fInput').onchange=e=>{state.from=e.target.value;renderAnalysis();};
    document.getElementById('tInput').onchange=e=>{state.to=e.target.value;renderAnalysis();};
    const b=document.getElementById('btnFill');if(b)b.onclick=()=>{state.from=mn;state.to=mx;renderFilterControls();renderAnalysis();};}
  else{wrap.innerHTML=`<div style="color:var(--text3);font-size:12px;padding:8px 0">使用全部已导入的数据</div>${hint}`;}
}
function filtered(){
  if(state.dateMode==='all')return state.analysisSessions;
  return state.analysisSessions.filter(s=>{const d=(s.date||'').slice(0,10);if(state.dateMode==='month')return d.startsWith(state.month);if(state.from&&d<state.from)return false;if(state.to&&d>state.to)return false;return true;});
}
function computeAna(sessions){
  if(!sessions.length)return null;
  const all=sessions.flatMap(s=>s.entries.map(e=>({...normalizeEntry(e),sd:s.date})));
  const t=totals(all);
  const byD={};sessions.forEach(s=>{const d=(s.date||'').slice(0,10);if(!byD[d])byD[d]={date:d,cash:0,bank:0,expense:0,refund:0,n:0};byD[d].n+=1;s.entries.forEach(e=>{if(byD[d][e.cat]!==undefined)byD[d][e.cat]+=Number(e.amount||0);});});
  const trend=Object.values(byD).sort((a,b)=>a.date.localeCompare(b.date));
  // Structured discounts (payType===discount) + legacy keyword
  const discounts=all.filter(e=>e.payType==='discount'||(e.payType!=='installment'&&/discount|折扣|优惠/i.test(e.note||e.discountReason||'')));
  // New tenants
  const newOnes=all.filter(e=>e.tag==='New');
  // Room transfers
  const transfers=all.filter(e=>e.tag==='Transfer');
  // Departures = refund entries (押金退款 = checkout)
  const departures=all.filter(e=>e.cat==='refund');
  // Installments
  const installments=all.filter(e=>e.payType==='installment');
  // Expenses
  const expDetail=all.filter(e=>e.cat==='expense');
  // 每次会话的财务指标（用于折线图）
  const r2=n=>Math.round(n*100)/100;
  const sessionTrend=sessions.map(s=>{
    const st=totals(s.entries);
    const d=(s.date||'').slice(0,10);
    return{date:d,
      cashBal:r2(st.cashBal), bankIn:r2(st.bankIn),
      refundOut:r2(st.refundOut), expOut:r2(st.expOut),
      totalIn:r2(st.cashIn+st.bankIn),
      newCount:s.entries.map(normalizeEntry).filter(e=>e.tag==='New').length,
      deptCount:s.entries.filter(e=>e.cat==='refund').length};
  }).sort((a,b)=>a.date.localeCompare(b.date));
  return{totals:t,trend,sessionTrend,discounts,newOnes,transfers,departures,installments,expDetail,all,n:sessions.length,avg:t.total/sessions.length};
}
function renderAnalysisChips(){
  const filt=filtered();const wrap=document.getElementById('analysisChips');
  if(!state.analysisSessions.length){wrap.innerHTML='';return;}
  wrap.className='chips-bar';
  wrap.innerHTML=`<span style="font-size:10px;color:var(--text3);font-family:JetBrains Mono,monospace;white-space:nowrap">已加载 ${filt.length}/${state.analysisSessions.length}:</span>`+state.analysisSessions.map(s=>{
    const inf=filt.includes(s);
    return `<span class="chip${inf?'':' dim'}" data-anchor="${esc(s.anchorId)}">${esc((s.date||'').slice(0,10))} · ${s.entries.length}笔${s.isLegacy?' 旧':''}<button class="chip-x" data-act="rm"><svg class="ico" style="width:11px;height:11px"><use href="#i-x"/></svg></button></span>`;
  }).join('')+`<button class="btn btn-ghost" id="btnClearAna" style="margin-left:auto;padding:5px 10px;font-size:11px"><svg class="ico"><use href="#i-trash"/></svg>清空</button>`;
  wrap.querySelectorAll('.chip').forEach(c=>{c.querySelector('.chip-x')?.addEventListener('click',()=>{rmAnalysis(c.dataset.anchor);renderFilterControls();renderAnalysis();});});
  document.getElementById('btnClearAna').onclick=()=>{if(!confirm('清空所有分析数据？'))return;state.analysisSessions.forEach(s=>LS.del(`anchor:${s.anchorId}`));state.analysisSessions=[];saveAnalysis();renderFilterControls();renderAnalysis();};
}
/* ══════════════════════════════════════════════════════════════════
   租金连续性检查模块 v4（全量 Bug 修复版）
   锚点：通通锁（占用真相）+ 会话流水（收款事实）+ 参考租金（金额基准）

   已修复：
   Bug1 手续费混入租金  Bug2 历史月用锁状态  Bug3 null误报漏收
   Bug4 blindMonths死代码  Bug5 换出月有租金  Bug6 tooltip重复
   Bug7 新租客误报矛盾  Bug8 换入未付落vacant  Bug9 dueDate错误归月
══════════════════════════════════════════════════════════════════ */

const RC_KEY='apt:rentRef';
const RC_ROOM_KEY='apt:rentRefRoom'; // 新：按床位精确设置
let _rcCloudSaveTimer=null;
let _rcLastCloudCfgJson='';
function rc_getCfg(){try{return JSON.parse(LS.get(RC_KEY)||'{}');}catch{return{};}}
function rc_saveCfg(c){LS.set(RC_KEY,JSON.stringify(c));}
function rc_cleanRoomCfg(c){
  const out={};
  Object.entries(c||{}).forEach(([room,value])=>{
    const key=String(room||'').trim();
    const num=Number(value);
    if(key&&Number.isFinite(num)&&num>0&&num<100000)out[key]=Math.round(num*100)/100;
  });
  return out;
}
function rc_getRoomCfg(){try{return rc_cleanRoomCfg(JSON.parse(LS.get(RC_ROOM_KEY)||'{}'));}catch{return{};}}
function rc_storeRoomCfgLocal(c){LS.set(RC_ROOM_KEY,JSON.stringify(rc_cleanRoomCfg(c)));}
function rc_saveRoomCfg(c,opts={}){
  const clean=rc_cleanRoomCfg(c);
  rc_storeRoomCfgLocal(clean);
  if(!opts.localOnly)rc_queueRoomCfgCloudSave(clean,opts);
}
async function rc_loadRoomCfgFromCloud(){
  const local=rc_getRoomCfg();
  try{
    const r=await apiFetch('/api/rent_config');
    if(!r.ok)throw new Error('rent_config');
    const data=await r.json();
    const cloud=rc_cleanRoomCfg(data.config||{});
    const cloudCount=Object.keys(cloud).length;
    const localCount=Object.keys(local).length;
    if(cloudCount>0){
      rc_storeRoomCfgLocal(cloud);
      _rcLastCloudCfgJson=JSON.stringify(cloud);
    }else if(localCount>0){
      await rc_pushRoomCfgToCloud(local,{silent:true});
    }
  }catch(e){
    if(Object.keys(local).length>0)console.warn('参考租金云端读取失败，暂用本机缓存',e);
  }
}
function rc_queueRoomCfgCloudSave(cfg,opts={}){
  clearTimeout(_rcCloudSaveTimer);
  _rcCloudSaveTimer=setTimeout(()=>rc_pushRoomCfgToCloud(cfg,opts),350);
}
async function rc_pushRoomCfgToCloud(cfg,opts={}){
  const clean=rc_cleanRoomCfg(cfg);
  const jsonText=JSON.stringify(clean);
  if(jsonText===_rcLastCloudCfgJson)return;
  try{
    const r=await apiFetch('/api/rent_config',{method:'POST',body:JSON.stringify({config:clean})});
    if(!r.ok)throw new Error('rent_config_save_'+r.status);
    _rcLastCloudCfgJson=jsonText;
    if(!opts.silent)toast('参考租金已同步云端','ok');
  }catch(e){
    console.warn('参考租金云端保存失败',e);
    if(!opts.silent)toast('参考租金仅保存本机，云端同步失败','err');
  }
}

/* 房间名解析 */
function rc_apt(name){return(name||'').trim().split(/\s+/)[0]||'';}
function rc_bedNum(name){
  const p=(name||'').trim().split(/\s+/);
  const n=parseInt((p[p.length-1]||'').replace(/\D/g,''));
  return isNaN(n)?null:n;
}
function rc_parity(name){const n=rc_bedNum(name);return n===null?null:n%2===0?'even':'odd';}
function rc_refRent(name,cfg){
  // 优先：按床位精确匹配（新格式）
  const roomCfg=rc_getRoomCfg();
  const direct=roomCfg[(name||'').trim()];
  if(direct!=null&&Number(direct)>0)return Number(direct);
  // 降级：按公寓奇偶匹配（旧格式，向后兼容）
  const a=rc_apt(name),p=rc_parity(name);
  return(a&&p&&cfg[a])?(Number(cfg[a][p])||null):null;
}

/* 通通锁占用判断 */
function rc_isOccupied(room){
  const cards=roomsData?roomsData[room]:null;
  if(!cards)return null;
  return cards.some(c=>{const s=cp_getStatus(c);return s.type!=='vacant'&&s.type!=='staff';});
}

/* Bug9 Fix：统一用会话日期归月，dueDate 是欠款截止日与租金月无关 */
function rc_sessionMonth(session){
  return(session.date||'').slice(0,7);
}

/* 金额检测（公用，带副作用：push alerts） */
function rc_checkAmt(paid,ref,annotation,room,month,alerts){
  if(!ref)return{st:'ok',note:''};
  const diff=paid-ref,abs=Math.abs(diff);
  if(abs>50){ // Bug12 Fix: 超过50AED即提醒，不叠加百分比限制（双条件会漏掉50~75AED差额）
    const note=`参考${fmtMoney(ref)}，实收${fmtMoney(paid)}，差${diff>0?'+':''}${fmtMoney(diff)}${annotation?'（'+annotation+'）':''}`;
    alerts.yellow.push({room,month,msg:note});
    return{st:'anomaly',note};
  }
  return{st:'ok',note:''};
}

/* ── 核心算法 v4 ────────────────────────────────────────────────── */
function rc_run(){
  const sessions=state.analysisSessions;
  if(!sessions.length)return null;
  const cfg=rc_getCfg();

  /* Bug9 Fix：idx 和 months 全部基于会话日期 */
  const idx={}; // {sessionMonth:{room:[entry]}}
  sessions.forEach(s=>{
    const m=rc_sessionMonth(s);
    if(!m)return;
    (s.entries||[]).forEach(e=>{
      const r=(e.room||'').trim().replace(/^#+/,'');  // 兼容旧版TXT导入的#前缀
      if(!r)return;
      (idx[m]||(idx[m]={}))[r]||(idx[m][r]=[]);
      idx[m][r].push(normalizeEntry(e));
    });
  });

  const months=[...new Set(Object.keys(idx))].sort();
  const lastMonth=months[months.length-1]||'';

  /* 换房映射：{month:{destRoom:sourceRoom}} */
  const txMap={};
  sessions.forEach(s=>{
    const m=rc_sessionMonth(s);
    (s.entries||[]).forEach(e=>{
      const ne=normalizeEntry(e);
      if(ne.tag==='Transfer'&&ne.roomTo&&m)
        (txMap[m]||(txMap[m]={}))[ne.roomTo.trim().replace(/^#+/,'')]=(ne.room||'').trim().replace(/^#+/,'');
    });
  });

  const lockRooms=new Set(roomsData?Object.keys(roomsData):[]);
  const ledgerRooms=new Set();
  sessions.forEach(s=>(s.entries||[]).forEach(e=>{if(e.room)ledgerRooms.add(e.room.trim().replace(/^#+/,''));}));
  const allRooms=[...new Set([...lockRooms,...ledgerRooms])]
    .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));

  const results=[];
  const alerts={red:[],yellow:[]};

  allRooms.forEach(room=>{
    const inLock=lockRooms.has(room);
    const lockOccupied=rc_isOccupied(room);
    const refRent=rc_refRent(room,cfg);
    const monthRows=[];
    let prevSt=null;

    months.forEach(month=>{
      const isLast=month===lastMonth;
      const entries=idx[month]?.[room]||[];

      /* Bug1 Fix：租金收款排除 Transfer 手续费 */
      /* BugX Fix：TXT导入的条目只有 e.amount（无 e.paid），需回退，否则历史会话全部误报为漏收 */
      const ep=e=>e.paid!=null?e.paid:(e.amount||0); // 实收金额：优先 paid，回退 amount
      const cashBank=entries.filter(e=>
        (e.cat==='cash'||e.cat==='bank')&&ep(e)>0&&e.tag!=='Transfer'
      );
      const refunds=entries.filter(e=>e.cat==='refund');
      const txOuts=entries.filter(e=>e.tag==='Transfer'&&e.roomTo);
      const totalPaid=cashBank.reduce((s,e)=>s+ep(e),0);
      const isTxIn=!!(txMap[month]?.[room]);
      const txSrc=txMap[month]?.[room]||'';
      const isNew=cashBank.some(e=>e.tag==='New');

      /* ① 退房月 */
      if(refunds.length){
        monthRows.push({month,st:'moveout',paid:totalPaid});
        prevSt='moveout';return;
      }

      /* ② 换出月（租客本月离开，下月必须视为空置或新租客） */
      if(txOuts.length){
        const ann=`换出至${txOuts[0].roomTo}`;
        if(totalPaid>0){
          const{st,note}=rc_checkAmt(totalPaid,refRent,ann,room,month,alerts);
          monthRows.push({month,st,paid:totalPaid,note,annotation:ann});
          // Fix：租客已离开，下月应推断 occupied=false，不能用 prevSt=st(ok/anomaly)
          // tx_out-无租金和 tx_out-有租金统一设 prevSt='tx_out'
        }else{
          monthRows.push({month,st:'tx_out',to:txOuts[0].roomTo});
        }
        prevSt='tx_out'; // 统一：无论是否有租金，租客本月走了，prevSt 必须是 tx_out
        return;
      }

      /* ③ Bug8 Fix：换入 + 无收款 → 漏收（优先于后续所有判断） */
      if(isTxIn&&totalPaid===0){
        monthRows.push({month,st:'missing'});
        alerts.red.push({room,month,msg:`换入后无首月收款（换自 ${txSrc}）`});
        prevSt='missing';return;
      }

      /* ④ Bug2 Fix：历史月只靠 prevSt 推断占用；通通锁仅覆盖最后一月 */
      let occupied;
      if(prevSt==='ok'||prevSt==='anomaly'||prevSt==='missing'){
        occupied=true;
      }else if(prevSt==='vacant'||prevSt==='moveout'||prevSt==='tx_out'){
        occupied=false;
      }else{
        occupied=null; // 首月、blind
      }
      if(isLast&&inLock)occupied=lockOccupied;

      /* ⑤ 空置 */
      if(occupied===false&&totalPaid===0){
        monthRows.push({month,st:'vacant'});
        prevSt='vacant';return;
      }

      /* ⑥ Bug3 Fix：首月无数据 → blind；唯一例外是最后月锁确认有人 */
      if(occupied===null&&totalPaid===0){
        if(isLast&&lockOccupied===true){
          monthRows.push({month,st:'missing'});
          alerts.red.push({room,month,msg:'通通锁有人，最近月无收款'});
          prevSt='missing';
        }else{
          monthRows.push({month,st:'blind'});
          prevSt='blind';
        }
        return;
      }

      /* ⑦ Bug7+11 Fix：空置后出现收款 */
      if(occupied===false&&totalPaid>0){
        // Bug11 Fix：区分两种 occupied===false 的来源
        // 来源A：prevSt ∈ {vacant/moveout/tx_out} → 床位刚腾出，收款必然是新租客，不报矛盾
        // 来源B：isLast&&lockOccupied===false（锁当前为空） → 真正矛盾
        const afterVacancy=(prevSt==='vacant'||prevSt==='moveout'||prevSt==='tx_out'||prevSt==='blind');
        if(isNew||isTxIn||afterVacancy){
          // 新入住（任何标签）或换入首月
          const ann=isTxIn?`换自${txSrc}`:'新入住';
          const{st,note}=rc_checkAmt(totalPaid,refRent,ann,room,month,alerts);
          monthRows.push({month,st,paid:totalPaid,note,annotation:ann});
          prevSt=st;
        }else{
          // 真正矛盾：通通锁显示空床（lockOccupied===false），但有收款
          monthRows.push({month,st:'contradict',paid:totalPaid});
          alerts.yellow.push({room,month,
            msg:`通通锁显示空床但有收款 ${fmtMoney(totalPaid)}，请核查`});
          prevSt='ok';
        }
        return;
      }

      /* ⑧ 确认有人无收款 → 漏收 */
      if(occupied===true&&totalPaid===0){
        monthRows.push({month,st:'missing'});
        const src=(inLock&&isLast)?'通通锁有人':'上月有收款记录';
        alerts.red.push({room,month,msg:`${src}，本月无收款`});
        prevSt='missing';return;
      }

      /* ⑨ 有收款 → 金额检查 */
      if(totalPaid>0){
        const ann=isTxIn?`换自${txSrc}`:isNew?'新入住':'';
        const{st,note}=rc_checkAmt(totalPaid,refRent,ann,room,month,alerts);
        monthRows.push({month,st,paid:totalPaid,note,annotation:ann});
        prevSt=st;return;
      }

      // 保底（理论上不应触及）
      monthRows.push({month,st:'vacant'});
      prevSt='vacant';
    });


    /* ── 新规则：同一床位跨月金额稳定性检测 ───────────────────────────
       从"正常收款月"（排除首月/换房等注释月）中检测租金金额变动趋势
       规则A：连续两月相差超50AED → 提醒
       规则B：历史中出现3种以上不同金额 → 较强提醒              */
    const stablePaid=monthRows.filter(r=>
      (r.st==='ok'||r.st==='anomaly')&&(r.paid||0)>0&&!r.annotation
    );
    if(stablePaid.length>=2){
      const amts=stablePaid.map(r=>r.paid);

      // 规则A：任意两个正常收款期之间差额 >= 50 AED
      let ruleAFired=false;
      for(let i=1;i<amts.length;i++){
        const d=Math.abs(amts[i]-amts[i-1]);
        if(d>=50){
          ruleAFired=true;
          alerts.yellow.push({room,month:stablePaid[i].month,
            msg:`金额出现变动：${stablePaid[i-1].month} 收 ${fmtMoney(amts[i-1])} → `+
                `${stablePaid[i].month} 收 ${fmtMoney(amts[i])}，差 ${fmtMoney(d)}`});
        }
      }

      // 规则B（BugA+B Fix）：
      // · 仅在规则A未触发时报（避免重复），捕捉小幅多次累计变动
      // · 告警月份改为第3种金额首次出现的月份，而非 lastMonth
      const uniq=[...new Set(amts)];
      if(uniq.length>=3&&!ruleAFired){
        const seen=new Set();
        let firstThird=stablePaid[stablePaid.length-1].month;
        for(const r of stablePaid){seen.add(r.paid);if(seen.size>=3){firstThird=r.month;break;}}
        alerts.yellow.push({room,month:firstThird,
          msg:`租金小幅持续变动：${stablePaid.length}个月出现${uniq.length}种金额`+
              `（${uniq.map(a=>fmtMoney(a)).join(' / ')}），建议核查`});
      }
    }

    results.push({room,inLock,lockOccupied,refRent,monthRows});
  });

  return{months,results,alerts,lastMonth};
}

/* ── 配置面板 ──────────────────────────────────────────────────── */
/* 房间分组：兼容多种格式 */
function rc_apartmentGroup(name){
  const t=(name||'').trim();
  if(!t)return'其他';
  // 空格分隔："公寓1 102" → "公寓1"
  const sp=t.split(/\s+/);
  if(sp.length>1)return sp[0];
  // 短横线分隔："公寓1-102" → "公寓1"
  const idx=t.lastIndexOf('-');
  if(idx>0)return t.slice(0,idx);
  // 纯数字：按百位分组（116→1号公寓）
  if(/^\d{3}$/.test(t))return`${t[0]}号公寓`;
  return t;
}

function rc_renderCfg(container){
  const roomCfg=rc_getRoomCfg();
  const oldCfg=rc_getCfg();

  const allRooms=new Set();
  if(roomsData)Object.keys(roomsData).forEach(r=>{if(r.trim())allRooms.add(r.trim());});
  state.analysisSessions.forEach(s=>(s.entries||[]).forEach(e=>{
    if(e.room&&e.room.trim()&&e.room.trim()!=='无')allRooms.add(e.room.trim().replace(/^#+/,''));
  }));
  Object.keys(roomCfg).forEach(r=>allRooms.add(r));

  const rooms=[...allRooms]
    .filter(r=>r&&r.length>0)
    .sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));

  // 配置进度
  const configured=rooms.filter(r=>roomCfg[r]>0).length;
  const pct=rooms.length>0?Math.round(configured/rooms.length*100):0;

  // 按公寓分组（用新的智能分组函数）
  const aptMap={};
  rooms.forEach(r=>{
    const a=rc_apartmentGroup(r);
    (aptMap[a]||(aptMap[a]=[])).push(r);
  });
  const apts=Object.keys(aptMap).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));

  const bodyHtml=apts.map(apt=>{
    const aptRooms=aptMap[apt];
    const isMulti=aptRooms.length>1;
    const aptConfigured=aptRooms.filter(r=>roomCfg[r]>0).length;

    const roomRows=aptRooms.map(r=>{
      const saved=roomCfg[r];
      const hasVal=saved!=null&&saved>0;
      const fallback=!hasVal?rc_refRent(r,oldCfg):null;
      return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border)">
        <span style="width:6px;height:6px;border-radius:50%;background:${hasVal?'var(--green)':'var(--text3)'};opacity:${hasVal?'1':'0.3'};flex-shrink:0" title="${hasVal?'已配置':'未配置'}"></span>
        <span style="font-size:12px;color:var(--text);font-family:JetBrains Mono,monospace;min-width:100px">${esc(r)}</span>
        <input type="number" data-room="${esc(r)}" value="${hasVal?saved:''}"
          placeholder="${fallback?fmtMoney(fallback):'AED'}"
          style="width:75px;padding:4px 7px;border:1px solid var(--border);border-radius:7px;font-size:13px;text-align:right">
        <span style="font-size:11px;color:var(--text3)">AED</span>
        <button onclick="rc_removeRoom(${jsArg(r)})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0 4px;margin-left:auto" title="清除此床位">×</button>
      </div>`;
    }).join('');

    // 公寓标题：含批量填入
    const aptHeader=`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;margin-top:4px;border-bottom:1px solid var(--border2)">
      <span style="font-size:11px;font-weight:700;color:var(--text2);text-transform:uppercase;letter-spacing:0.06em">${esc(apt)} <span style="font-weight:400;color:var(--text3)">(${aptRooms.length}床 · 已配${aptConfigured})</span></span>
      ${isMulti?`<div style="display:flex;gap:4px;align-items:center">
        <input type="number" class="apt-batch" data-apt="${esc(apt)}" placeholder="批量" style="width:55px;padding:3px 6px;border:1px solid var(--border);border-radius:5px;font-size:11px;text-align:right">
        <button onclick="rc_applyApt(${jsArg(apt)})" style="font-size:10px;padding:3px 9px;background:var(--surface);border:1px solid var(--border);border-radius:5px;cursor:pointer;color:var(--text2)">应用本公寓</button>
      </div>`:''}
    </div>`;

    return `<div style="margin-bottom:10px">${aptHeader}${roomRows}</div>`;
  }).join('');

  container.innerHTML=`
    <!-- 顶部：标题 + 进度 + 全局批量 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">按床位设置参考租金</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px">${rooms.length} 个床位 · 已配置 <b style="color:${configured>0?'var(--green)':'var(--text3)'}">${configured}</b>/${rooms.length} (${pct}%)</div>
      </div>
      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
        <input id="rc_bulkVal" type="number" placeholder="AED" style="width:60px;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;text-align:right">
        <button onclick="rc_bulkFill()" class="btn btn-ghost" style="font-size:11px;padding:5px 11px" title="将上面价格填入所有空白床位">填空白</button>
        <span style="color:var(--text3);font-size:11px;opacity:0.5">|</span>
        <button onclick="rc_setAll(700)" class="btn btn-ghost" style="font-size:11px;padding:5px 8px">⚡700</button>
        <button onclick="rc_setAll(750)" class="btn btn-ghost" style="font-size:11px;padding:5px 8px">⚡750</button>
      </div>
    </div>
    <!-- 提示 -->
    <div style="font-size:10px;color:var(--text3);padding:6px;background:rgba(26,115,232,0.06);border-radius:5px;margin-bottom:10px">💡 批量操作仅修改界面预览，需点击下方「保存设置」才生效 · 绿点表示已配置</div>
    <!-- 床位列表 -->
    <div id="rc_cfgRows" style="max-height:380px;overflow-y:auto;padding-right:4px">
      ${rooms.length>0?bodyHtml:'<div style="color:var(--text3);font-size:12px;padding:8px 0;text-align:center">暂无床位数据，请先加载通通锁或导入历史会话</div>'}
    </div>
    <!-- 底部按钮 -->
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-ghost" onclick="rc_addRoom()" style="font-size:12px;flex:1">+ 添加床位</button>
      <button class="btn btn-primary" onclick="rc_saveCfgFromUI()" style="font-size:12px;flex:2">保存设置</button>
    </div>`;
}

/* 批量填入：仅填空白行 */
function rc_bulkFill(){
  const v=parseFloat(document.getElementById('rc_bulkVal')?.value);
  if(!v||v<=0){toast('请先在输入框中填写有效价格','err');return;}
  let count=0;
  document.querySelectorAll('#rc_cfgRows input[data-room]').forEach(inp=>{
    if(!inp.value||parseFloat(inp.value)<=0){inp.value=v;count++;}
  });
  toast(count>0?`已填入 ${count} 个空白床位为 ${v} AED · 别忘了点保存`:'没有空白床位需要填入');
}

/* 全部设为某值（覆盖已有） */
function rc_setAll(v){
  const total=document.querySelectorAll('#rc_cfgRows input[data-room]').length;
  if(!total){toast('暂无床位','err');return;}
  if(!confirm(`确认将全部 ${total} 个床位价格设为 ${v} AED？\n（会覆盖已有价格，仅修改界面预览，需保存才生效）`))return;
  document.querySelectorAll('#rc_cfgRows input[data-room]').forEach(inp=>{inp.value=v;});
  toast(`已全部设为 ${v} AED · 别忘了点保存`);
}

/* 按公寓批量填入（覆盖该公寓所有床位） */
function rc_applyApt(apt){
  const inp=document.querySelector(`input.apt-batch[data-apt="${cssEsc(apt)}"]`);
  if(!inp){toast('找不到批量输入框','err');return;}
  const v=parseFloat(inp.value);
  if(!v||v<=0){toast('请先在该公寓的批量输入框中填写价格','err');return;}
  let count=0;
  document.querySelectorAll('#rc_cfgRows input[data-room]').forEach(roomInp=>{
    if(rc_apartmentGroup(roomInp.dataset.room)===apt){roomInp.value=v;count++;}
  });
  inp.value='';
  toast(`${apt} 全部 ${count} 个床位已设为 ${v} AED · 别忘了点保存`);
}

function rc_saveCfgFromUI(){
  const cfg=rc_getRoomCfg();
  document.querySelectorAll('#rc_cfgRows input[data-room]').forEach(inp=>{
    const room=inp.dataset.room;
    const v=parseFloat(inp.value);
    if(!room)return;
    if(!isNaN(v)&&v>0) cfg[room]=v;
    else delete cfg[room]; // 清空就从配置里移除
  });
  rc_saveRoomCfg(cfg);
  toast('参考租金已保存');
}
function rc_addRoom(){
  const n=prompt('床位号（如 公寓5-101）');if(!n||!n.trim())return;
  const cfg=rc_getRoomCfg(),r=n.trim();
  if(!(r in cfg))cfg[r]=0;
  rc_saveRoomCfg(cfg);
  const c=document.getElementById('rc_cfgPanel');if(c)rc_renderCfg(c);
}
function rc_removeRoom(r){
  const cfg=rc_getRoomCfg();delete cfg[r];
  rc_saveRoomCfg(cfg);
  const c=document.getElementById('rc_cfgPanel');if(c)rc_renderCfg(c);
}
// 旧函数保留为别名（防止万一有其他引用）
function rc_addApt(){rc_addRoom();}
function rc_removeApt(a){}

/* ── 结果渲染 ──────────────────────────────────────────────────── */
function rc_renderResults(data,container){
  if(!data){container.innerHTML='<div style="color:var(--text3);text-align:center;padding:20px;font-size:13px">请先导入历史会话并加载通通锁数据后运行检查</div>';return;}
  const{months,results,alerts,lastMonth}=data;
  if(!months.length){container.innerHTML='<div style="color:var(--text3);text-align:center;padding:20px;font-size:13px">分析数据为空，请先导入历史会话</div>';return;}

  const SC={ok:'#1a9e3f',missing:'#e02020',anomaly:'#e06c00',vacant:'#bbb',
            blind:'#999',moveout:'#5b7fa6',tx_out:'#8a5bb5',contradict:'#d93025'};
  const SL={ok:'收',missing:'⚠漏',anomaly:'⚠差',vacant:'空',
            blind:'─',moveout:'退',tx_out:'换→',contradict:'?'};

  const hdr=months.map(m=>`<th style="text-align:center;min-width:40px;font-size:10px;padding:3px 2px;color:var(--text3)">${m.slice(5)}</th>`).join('');

  const rows=results.map(({room,inLock,lockOccupied,refRent,monthRows})=>{
    const lbl=inLock?(lockOccupied?'●':'○'):'?';
    const lcol=inLock?(lockOccupied?'#1a9e3f':'#bbb'):'#999';
    const tds=monthRows.map(({month,st,paid,note,to,annotation})=>{
      const col=SC[st]||'#bbb',lbl2=SL[st]||'?';
      const tips=[];
      if(paid>0)tips.push(fmtMoney(paid));
      if(note)tips.push(note);          // note 已含 annotation（Bug6 Fix）
      else if(annotation)tips.push(annotation);
      if(to)tips.push('→'+to);
      return `<td title="${esc(tips.join(' | '))}" style="text-align:center;background:${col}18;color:${col};font-size:11px;font-weight:700;padding:4px 2px;border:1px solid ${col}25;cursor:default">${lbl2}</td>`;
    }).join('');
    const rref=refRent?`<span style="font-size:10px;color:var(--text3)"> ${fmtMoney(refRent)}</span>`:'';
    return `<tr>
      <td style="font-size:12px;font-weight:600;padding:4px 6px 4px 0;white-space:nowrap">${esc(room)}${rref}</td>
      <td title="${inLock?(lockOccupied?'通通锁有人':'通通锁空床'):'不在锁里'}"
        style="text-align:center;font-size:11px;color:${lcol};padding:4px 6px;cursor:default">${lbl}</td>
      ${tds}
    </tr>`;
  }).join('');

  const redHtml=alerts.red.length
    ?`<div style="margin-top:12px;padding:10px 12px;background:#e0202012;border-radius:8px;border-left:3px solid #e02020">
        <b style="color:#e02020">🔴 漏收/漏记 (${alerts.red.length}处)</b>
        <div style="margin-top:6px;font-size:12px;color:var(--text2);line-height:2">
          ${alerts.red.map(a=>`${esc(a.room)} &nbsp;|&nbsp; ${a.month} &nbsp;|&nbsp; ${esc(a.msg)}`).join('<br>')}
        </div></div>`:'';
  const yelHtml=alerts.yellow.length
    ?`<div style="margin-top:8px;padding:10px 12px;background:#e06c0012;border-radius:8px;border-left:3px solid #e06c00">
        <b style="color:#e06c00">🟡 需关注 (${alerts.yellow.length}处)</b>
        <div style="margin-top:6px;font-size:12px;color:var(--text2);line-height:2">
          ${alerts.yellow.map(a=>`${esc(a.room)} &nbsp;|&nbsp; ${a.month} &nbsp;|&nbsp; ${esc(a.msg)}`).join('<br>')}
        </div></div>`:'';
  const okHtml=!alerts.red.length&&!alerts.yellow.length
    ?`<div style="margin-top:8px;padding:10px 12px;background:#1a9e3f12;border-radius:8px;border-left:3px solid #1a9e3f"><b style="color:#1a9e3f">✅ 所有床位租金连续，无漏收无异常</b></div>`:'';
  const summaryHtml=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:8px 0 10px">
    <div style="background:#e0202010;border:1px solid #e0202025;border-radius:8px;padding:10px"><div style="font-size:10px;color:var(--text3)">漏收/漏记</div><div style="font-size:22px;font-weight:800;color:#e02020;font-family:JetBrains Mono,monospace">${alerts.red.length}</div></div>
    <div style="background:#e06c0010;border:1px solid #e06c0025;border-radius:8px;padding:10px"><div style="font-size:10px;color:var(--text3)">金额异常</div><div style="font-size:22px;font-weight:800;color:#e06c00;font-family:JetBrains Mono,monospace">${alerts.yellow.length}</div></div>
    <div style="background:#1a9e3f10;border:1px solid #1a9e3f25;border-radius:8px;padding:10px"><div style="font-size:10px;color:var(--text3)">检查床位</div><div style="font-size:22px;font-weight:800;color:#1a9e3f;font-family:JetBrains Mono,monospace">${results.length}</div></div>
  </div>`;

  container.innerHTML=`
    ${summaryHtml}
    ${redHtml}${yelHtml}${okHtml}
    <div style="overflow-x:auto;margin-top:8px">
      <table style="border-collapse:collapse;width:100%">
        <thead><tr>
          <th style="text-align:left;font-size:10px;padding:3px 6px 3px 0;color:var(--text3)">床位</th>
          <th style="font-size:10px;padding:3px 6px;color:var(--text3)">锁</th>${hdr}
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="margin-top:8px;font-size:11px;color:var(--text3)">
      📅 数据覆盖：${months[0]} 至 ${lastMonth}，共 ${months.length} 个月 · ${results.length} 个床位 · 悬停查看金额
    </div>
    <div style="margin-top:3px;font-size:10px;color:var(--text3)">
      收=已收 · ⚠漏=漏收 · ⚠差=金额异常 · 退=退房 · 换→=换出 · 空=空置 · ─=首月/无历史 · ?=数据矛盾
    </div>`;
}

/* ── 面板入口 ──────────────────────────────────────────────────── */
function toggleContinuity(){
  const wrap=document.getElementById('continuityWrap');
  const btn=document.getElementById('btnContToggle');
  if(!wrap)return;
  const show=wrap.style.display==='none';
  wrap.style.display=show?'':'none';
  if(btn)btn.textContent=show?'收起':'展开';
  if(show)rc_initPanel();
}
async function rc_initPanel(){
  const wrap=document.getElementById('continuityWrap');if(!wrap)return;
  const loaded=roomsData&&Object.keys(roomsData).length>0;
  const sc=state.analysisSessions.length;
  wrap.innerHTML=`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;padding-top:4px">
      <button class="btn btn-ghost" onclick="rc_toggleCfg()" style="font-size:12px">📋 参考租金设置</button>
      <button class="btn btn-ghost" id="rc_loadBtn" onclick="rc_loadLock()" style="font-size:12px">
        ${loaded?'🔄 刷新通通锁':'📡 加载通通锁'}</button>
      <button class="btn btn-primary" onclick="rc_check()" style="font-size:12px">▶ 运行检查</button>
      <span style="font-size:11px;color:var(--text3);align-self:center" id="rc_status">
        ${loaded?Object.keys(roomsData).length+'个床位':'通通锁未加载'} &nbsp;·&nbsp; 分析数据 ${sc} 个会话
      </span>
    </div>
    <div id="rc_cfgPanel" style="display:none;padding:12px;background:var(--surface2);border-radius:10px;margin-bottom:12px"></div>
    <div id="rc_grid"></div>`;
}
function rc_toggleCfg(){
  const p=document.getElementById('rc_cfgPanel');if(!p)return;
  const show=p.style.display==='none';
  p.style.display=show?'':'none';
  if(show)rc_renderCfg(p);
}
async function rc_loadLock(){
  const btn=document.getElementById('rc_loadBtn');
  const st=document.getElementById('rc_status');
  if(btn){btn.textContent='⏳ 加载中...';btn.disabled=true;}
  if(st)st.textContent='正在连接通通锁...';
  try{
    await cp_loadAll();
  }catch(e){
    console.error('rc_loadLock cp_loadAll error:',e);
  }finally{
    // Bug10 Fix：无论成功失败，按钮必须解除禁用
    const n=Object.keys(roomsData||{}).length;
    if(btn){btn.textContent=n>0?'🔄 刷新通通锁':'❌ 加载失败，重试';btn.disabled=false;}
    if(st)st.textContent=n>0
      ?`${n}个床位 · 分析数据 ${state.analysisSessions.length} 个会话`
      :'加载失败，请检查网络';
    const p=document.getElementById('rc_cfgPanel');
    if(p&&p.style.display!=='none')rc_renderCfg(p);
  }
}

function rc_cardKey(card,lockRoom){
  const bed=cp_getBedNumber(card.cardName);
  return bed!==999999?String(bed):(card.cardName||lockRoom||'').trim();
}
function rc_cardDisplay(card){
  return (card.cardName||'').trim()||'—';
}
/* Bug3-Fix: rc_entryRentPaid — 防止 depPaid 与备注"含押"双重扣减 */
function rc_entryRentPaid(e){
  const ne=normalizeEntry(e);
  /* paid 字段由前端录入时已扣押金，直接返回 */
  if(ne.paid!=null&&Number(ne.paid)>0)return Number(ne.paid);
  let amount=Number(ne.amount||0);
  /* depPaid 优先；否则才解析备注"含押 XXX"；两者互斥，防止双扣 */
  if(ne.depPaid&&Number(ne.depPaid)>0){
    amount-=Number(ne.depPaid);
  }else{
    const note=String(ne.note||'');
    const depMatch=note.match(/含押\s*([\d,]+\.?\d*)/);
    if(depMatch)amount-=parseFloat(depMatch[1].replace(/,/g,''))||0;
  }
  return Math.max(0,Math.round(amount*100)/100);
}


/* ═══════════════════════════════════════════════════════════════════
   漏收问题闭环系统 · RC Resolution Workflow
   处理状态: collected(已补收) / error(数据错误) / waived(已豁免) / pending(跟进中)
   ═══════════════════════════════════════════════════════════════════ */
const RC_RESOLVE_LS='apt:rc_resolutions';
function rc_getResolutions(){try{return JSON.parse(LS.get(RC_RESOLVE_LS)||'{}');}catch{return{};}}
function rc_saveResolutions(m){LS.set(RC_RESOLVE_LS,JSON.stringify(m));}
/* Key = bed | card.end(ms) | gapAmount*100 — 金额变化时自动作废旧记录 */
function rc_resolveKey(card){
  const amt=Math.round(((card.gapAmount||0)+(card.shortAmount||0))*100);
  return `${card.bed}|${card.end||0}|${amt}`;
}
const RC_RES_TYPES={
  collected:{label:'已补收',  icon:'✅',color:'#1a8a4a',bg:'rgba(26,138,74,0.13)'},
  error:    {label:'数据错误',icon:'🔧',color:'#1a73e8',bg:'rgba(26,115,232,0.13)'},
  waived:   {label:'已豁免',  icon:'🤝',color:'#7c4dff',bg:'rgba(124,77,255,0.13)'},
  pending:  {label:'跟进中',  icon:'⏳',color:'#e06c00',bg:'rgba(224,108,0,0.13)'},
};
function rc_openResolveModal(rkey,bed,cardName,amount){
  const existing=rc_getResolutions()[rkey]||{};
  const typeOpts=Object.entries(RC_RES_TYPES).map(([k,v])=>{
    const checked=(existing.type===k)||((!existing.type)&&k==='collected');
    return `<label style="display:flex;align-items:center;gap:8px;padding:9px 11px;border:1px solid var(--border);border-radius:8px;cursor:pointer;transition:all 0.15s;background:${checked?v.bg:'var(--surface2)'}">
      <input type="radio" name="rcRType" value="${k}" ${checked?'checked':''} onchange="rc_updateTypeUI()" style="width:15px;height:15px;accent-color:${v.color}">
      <span style="font-size:16px;line-height:1">${v.icon}</span>
      <span style="font-size:12px;font-weight:700;color:${v.color}">${v.label}</span>
    </label>`;
  }).join('');
  let overlay=document.getElementById('rcResolveOverlay');
  if(!overlay){overlay=document.createElement('div');overlay.id='rcResolveOverlay';overlay.onclick=e=>{if(e.target===overlay)rc_closeResolveModal();};document.body.appendChild(overlay);}
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.38);backdrop-filter:blur(5px);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px';
  const prevInfo=existing.type?`<div style="margin-top:10px;padding:7px 10px;background:var(--surface2);border-radius:6px;font-size:11px;color:var(--text3)">上次处理：${RC_RES_TYPES[existing.type]?.icon} ${RC_RES_TYPES[existing.type]?.label||existing.type} · ${new Date(existing.resolvedAt||0).toLocaleDateString('zh-CN')}</div>`:'';
  overlay.innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;max-width:500px;width:100%;padding:22px;box-shadow:0 8px 40px rgba(0,0,0,0.18)">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
        <div>
          <div style="font-size:15px;font-weight:800;color:var(--text)">📋 处理漏收问题</div>
          <div style="font-size:11px;color:var(--text3);margin-top:4px;font-family:JetBrains Mono,monospace">${esc(bed)} &nbsp;·&nbsp; ${esc(cardName)} &nbsp;·&nbsp; 差额 <b style="color:#d93025">${fmtMoney(amount)} AED</b></div>
        </div>
        <button onclick="rc_closeResolveModal()" style="background:transparent;border:none;cursor:pointer;font-size:22px;color:var(--text3);line-height:1;padding:0 4px">×</button>
      </div>
      <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-family:JetBrains Mono,monospace;margin-bottom:8px">处理类型</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:14px" id="rcTypeGrid">${typeOpts}</div>
      <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-family:JetBrains Mono,monospace;margin-bottom:6px">备注说明 <span style="color:#d93025">★ 必填</span></div>
      <textarea id="rcRNote" class="ta" placeholder="请说明原因及处理方案，例如：已与租客确认，5月1日付150为定金，5月6日已结清余款600，合计750 AED全额收清…" style="min-height:96px;font-size:12px">${esc(existing.note||'')}</textarea>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button onclick="rc_closeResolveModal()" class="btn btn-ghost" style="flex:1">取消</button>
        <button onclick="rc_submitResolution(${jsArg(rkey)})" class="btn btn-primary" style="flex:2">✅ 确认并归档</button>
      </div>
      ${prevInfo}
    </div>`;
}
function rc_updateTypeUI(){
  const selected=document.querySelector('[name="rcRType"]:checked')?.value;
  document.querySelectorAll('#rcTypeGrid label').forEach(lbl=>{
    const v=lbl.querySelector('input').value;
    const meta=RC_RES_TYPES[v];
    lbl.style.background=v===selected?meta.bg:'var(--surface2)';
  });
}
function rc_submitResolution(rkey){
  const type=document.querySelector('[name="rcRType"]:checked')?.value||'collected';
  const note=(document.getElementById('rcRNote')?.value||'').trim();
  if(!note){toast('请填写备注说明','err');return;}
  const m=rc_getResolutions();
  m[rkey]={type,note,resolvedAt:Date.now()};
  rc_saveResolutions(m);
  rc_closeResolveModal();
  rc_check();
  toast(`${RC_RES_TYPES[type]?.icon||'✅'} 已归档：${RC_RES_TYPES[type]?.label}`);
}
function rc_clearResolution(rkey){
  if(!confirm('确认撤销此处理记录？问题将重新进入待处理状态。'))return;
  const m=rc_getResolutions();delete m[rkey];
  rc_saveResolutions(m);
  rc_check();
  toast('已重新开启此问题');
}
function rc_closeResolveModal(){const o=document.getElementById('rcResolveOverlay');if(o)o.style.display='none';}

function rc_check(){
  const grid=document.getElementById('rc_grid');if(!grid)return;
  if(!roomsData||!Object.keys(roomsData).length){
    grid.innerHTML='<div style="color:var(--red);text-align:center;padding:16px;font-size:13px">⚠ 请先加载通通锁卡片数据</div>';
    return;
  }
  const{sessions}=rc_periodSessions();
  if(!sessions.length){
    grid.innerHTML='<div style="color:var(--red);text-align:center;padding:16px;font-size:13px">⚠ 本账期没有可核对的流水，请先在分析页导入历史或导出过的会话</div>';
    return;
  }
  grid.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3)">检查中...</div>';
  setTimeout(()=>{rc_cardContinuityRender(rc_cardContinuityRun(),grid);},50);
}

/* v36: 客户页租金连续性检查 - 以每月2日00:00为账期边界，并按卡片到期日闭环判断 */
function rc_periodSessions(){
  const p=getBillingPeriod();
  const all=dedupSessions([...state.saved,...state.analysisSessions]);
  return{period:p,sessions:all.filter(s=>{const d=new Date(s.date);return d>=p.start&&d<p.end;})};
}
function rc_normBedKey(v){
  return String(v||'').trim().replace(/^#+/,'');
}
function rc_activeArrearsMap(){
  const m={};
  (state.arrears||[]).forEach(a=>{
    if(a.cleared)return;
    if(Number(a.remain||0)<=0)return;
    const k=rc_normBedKey(a.room);
    if(!k)return;
    (m[k]||(m[k]=[])).push(a);
  });
  return m;
}

/* v36: 参考租金按“输入金额 -> 勾选床位 -> 应用到勾选”批量设置 */
function rc_renderCfg(container){
  const roomCfg=rc_getRoomCfg();
  const oldCfg=rc_getCfg();
  const allRooms=new Set();
  if(roomsData)Object.keys(roomsData).forEach(r=>{if(r.trim())allRooms.add(r.trim());});
  state.analysisSessions.forEach(s=>(s.entries||[]).forEach(e=>{
    if(e.room&&e.room.trim()&&e.room.trim()!=='—')allRooms.add(e.room.trim().replace(/^#+/,''));
  }));
  Object.keys(roomCfg).forEach(r=>allRooms.add(r));
  const rooms=[...allRooms].filter(r=>r&&r.length>0).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const configured=rooms.filter(r=>roomCfg[r]>0).length;
  const pct=rooms.length>0?Math.round(configured/rooms.length*100):0;
  const aptMap={};
  rooms.forEach(r=>{const a=rc_apartmentGroup(r);(aptMap[a]||(aptMap[a]=[])).push(r);});
  const apts=Object.keys(aptMap).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));

  const bodyHtml=apts.map(apt=>{
    const aptRooms=aptMap[apt];
    const aptConfigured=aptRooms.filter(r=>roomCfg[r]>0).length;
    const rowsHtml=aptRooms.map(r=>{
      const saved=roomCfg[r],hasVal=saved!=null&&saved>0,fallback=!hasVal?rc_refRent(r,oldCfg):null;
      return `<label style="display:grid;grid-template-columns:22px minmax(86px,1fr) 92px 34px 22px;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer">
        <input type="checkbox" class="rc-bed-check" data-room="${esc(r)}" style="width:16px;height:16px">
        <span style="font-size:12px;color:var(--text);font-family:JetBrains Mono,monospace">${esc(r)}</span>
        <input type="number" data-room="${esc(r)}" value="${hasVal?saved:''}" placeholder="${fallback?fmtMoney(fallback):'AED'}" onclick="event.stopPropagation()" style="width:86px;padding:5px 7px;border:1px solid var(--border);border-radius:7px;font-size:13px;text-align:right;background:var(--surface)">
        <span style="font-size:11px;color:${hasVal?'var(--green)':'var(--text3)'}">${hasVal?'已配':'AED'}</span>
        <button onclick="event.preventDefault();event.stopPropagation();rc_removeRoom(${jsArg(r)})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;padding:0 2px" title="清除此床位">×</button>
      </label>`;
    }).join('');
    return `<div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border2);gap:8px">
        <span style="font-size:11px;font-weight:700;color:var(--text2)">${esc(apt)} <span style="font-weight:400;color:var(--text3)">(${aptRooms.length}床 · 已配${aptConfigured})</span></span>
        <button onclick="rc_selectApt(${jsArg(apt)})" class="btn btn-ghost" style="font-size:10px;padding:3px 9px">勾选本公寓</button>
      </div>
      ${rowsHtml}
    </div>`;
  }).join('');

  container.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--text)">按勾选床位设置参考租金</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px">${rooms.length} 个床位 · 已配置 <b style="color:${configured>0?'var(--green)':'var(--text3)'}">${configured}</b>/${rooms.length} (${pct}%)</div>
      </div>
      <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
        <input id="rc_batchVal" type="number" placeholder="AED" style="width:74px;padding:6px 8px;border:1px solid var(--border);border-radius:7px;font-size:12px;text-align:right">
        <button onclick="rc_applySelected()" class="btn btn-primary" style="font-size:11px;padding:6px 12px">应用到勾选</button>
        <button onclick="rc_selectEmpty()" class="btn btn-ghost" style="font-size:11px;padding:6px 10px">勾选未配置</button>
        <button onclick="rc_clearSelection()" class="btn btn-ghost" style="font-size:11px;padding:6px 10px">清空勾选</button>
      </div>
    </div>
    <div style="font-size:10px;color:var(--text3);padding:7px;background:rgba(26,115,232,0.06);border-radius:6px;margin-bottom:10px">先输入租金，再勾选床位并应用；可分批设置不同价格，最后点击“保存设置”才会生效。</div>
    <div id="rc_cfgRows" style="max-height:380px;overflow-y:auto;padding-right:4px">
      ${rooms.length>0?bodyHtml:'<div style="color:var(--text3);font-size:12px;padding:8px 0;text-align:center">暂无床位数据，请先加载通通锁或导入历史会话</div>'}
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button class="btn btn-ghost" onclick="rc_addRoom()" style="font-size:12px;flex:1">+ 添加床位</button>
      <button class="btn btn-primary" onclick="rc_saveCfgFromUI()" style="font-size:12px;flex:2">保存设置</button>
    </div>`;
}
function rc_cfgRoomInputs(){return [...document.querySelectorAll('#rc_cfgRows input[data-room]:not(.rc-bed-check)')];}
function rc_setBatchValue(v){const inp=document.getElementById('rc_batchVal')||document.getElementById('rc_bulkVal');if(inp)inp.value=v;}
function rc_selectedRooms(){return [...document.querySelectorAll('#rc_cfgRows .rc-bed-check:checked')].map(c=>c.dataset.room);}
function rc_applySelected(){
  const v=parseFloat((document.getElementById('rc_batchVal')||document.getElementById('rc_bulkVal'))?.value);
  if(!v||v<=0){toast('请先输入有效租金','err');return;}
  const rooms=rc_selectedRooms();
  if(!rooms.length){toast('请先勾选要设置的床位','err');return;}
  let count=0;
  rc_cfgRoomInputs().forEach(inp=>{if(rooms.includes(inp.dataset.room)){inp.value=v;count++;}});
  toast(`已将 ${count} 个床位设为 ${v} AED，记得保存设置`);
}
function rc_selectEmpty(){
  let count=0;
  document.querySelectorAll('#rc_cfgRows .rc-bed-check').forEach(chk=>{
    const inp=document.querySelector(`#rc_cfgRows input[data-room="${cssEsc(chk.dataset.room)}"]:not(.rc-bed-check)`);
    const empty=!inp||!inp.value||parseFloat(inp.value)<=0;
    chk.checked=empty;if(empty)count++;
  });
  toast(`已勾选 ${count} 个未配置床位`);
}
function rc_clearSelection(){document.querySelectorAll('#rc_cfgRows .rc-bed-check').forEach(chk=>chk.checked=false);}
function rc_selectApt(apt){
  let count=0;
  document.querySelectorAll('#rc_cfgRows .rc-bed-check').forEach(chk=>{
    const match=rc_apartmentGroup(chk.dataset.room)===apt;
    chk.checked=match;if(match)count++;
  });
  toast(`已勾选 ${apt} 的 ${count} 个床位`);
}
function rc_bulkFill(){
  const v=parseFloat((document.getElementById('rc_batchVal')||document.getElementById('rc_bulkVal'))?.value);
  if(!v||v<=0){toast('请先输入有效租金','err');return;}
  let count=0;
  rc_cfgRoomInputs().forEach(inp=>{if(!inp.value||parseFloat(inp.value)<=0){inp.value=v;count++;}});
  toast(`已填入 ${count} 个空白床位为 ${v} AED，记得保存设置`);
}
function rc_setAll(v){rc_setBatchValue(v);}
function rc_applyApt(apt){
  rc_selectApt(apt);
  rc_applySelected();
}
function rc_saveCfgFromUI(){
  const cfg=rc_getRoomCfg();
  rc_cfgRoomInputs().forEach(inp=>{
    const room=inp.dataset.room;
    const v=parseFloat(inp.value);
    if(!room)return;
    if(!isNaN(v)&&v>0)cfg[room]=v;
    else delete cfg[room];
  });
  rc_saveRoomCfg(cfg);
  toast('参考租金已保存');
  const c=document.getElementById('rc_cfgPanel');if(c)rc_renderCfg(c);
}

/* v40: 参考租金设置闭环
   1. 通通锁卡片里出现过的所有床位都显示，空床也显示。
   2. 用户手动输入当前批次价格，不预设快捷金额。
   3. 勾选床位后点“确认本批”，才保存这一批床位的价格。 */
var _rcCfgOpenGroups=_rcCfgOpenGroups||{};
function rc_toggleCfgGroup(group){
  _rcCfgOpenGroups[group]=!_rcCfgOpenGroups[group];
  const c=document.getElementById('rc_cfgPanel');if(c)rc_renderCfg(c);
}
function rc_collectRentBeds(){
  const map=new Map();
  const add=(room,meta={})=>{
    const key=String(room||'').trim().replace(/^#+/,'');
    if(!key||key==='—'||key==='-')return;
    if(!map.has(key))map.set(key,{room:key,cardName:'',lockRoom:'',vacant:false,staff:false,...meta});
    else{
      const old=map.get(key);
      map.set(key,{...old,...Object.fromEntries(Object.entries(meta).filter(([,v])=>v!==''&&v!=null)),vacant:old.vacant||!!meta.vacant,staff:old.staff||!!meta.staff});
    }
  };
  Object.entries(roomsData||{}).forEach(([lockRoom,cards])=>{
    (cards||[]).forEach(card=>{
      const name=String(card.cardName||'').trim();
      const bed=cp_getBedNumber(name);
      const room=bed!==999999?String(bed):'';
      if(!room)return;
      const st=cp_getStatus(card);
      add(room,{cardName:name,lockRoom:String(lockRoom||''),vacant:st.type==='vacant'||cp_isVacant(name),staff:st.type==='staff'||cp_isStaff(name)});
    });
  });
  return [...map.values()].sort((a,b)=>{
    const la=String(a.lockRoom||''),lb=String(b.lockRoom||'');
    const lc=la.localeCompare(lb,undefined,{numeric:true});
    if(lc)return lc;
    const na=parseInt(a.room),nb=parseInt(b.room);
    if(!Number.isNaN(na)&&!Number.isNaN(nb)&&na!==nb)return na-nb;
    return String(a.room).localeCompare(String(b.room),undefined,{numeric:true});
  });
}
function rc_renderCfg(container){
  const cfg=rc_getRoomCfg();
  const beds=rc_collectRentBeds();
  const configured=beds.filter(b=>Number(cfg[b.room])>0).length;
  const pct=beds.length?Math.round(configured/beds.length*100):0;
  const groups={};
  beds.forEach(b=>{const g=b.lockRoom||rc_apartmentGroup(b.room);(groups[g]||(groups[g]=[])).push(b);});
  const groupNames=Object.keys(groups).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const rows=groupNames.map(g=>{
    const list=groups[g];
    const done=list.filter(b=>Number(cfg[b.room])>0).length;
    const complete=done===list.length&&list.length>0;
    const open=!!_rcCfgOpenGroups[g];
    const groupBg=complete?'rgba(26,138,74,0.07)':'rgba(224,108,0,0.07)';
    const groupBorder=complete?'rgba(26,138,74,0.28)':'rgba(224,108,0,0.28)';
    const groupColor=complete?'#1a8a4a':'#e06c00';
    const body=list.map(b=>{
      const price=Number(cfg[b.room])>0?Number(cfg[b.room]):0;
      const isSet=price>0;
      const rowBg=isSet?'rgba(26,138,74,0.045)':'rgba(224,108,0,0.06)';
      const rowBorder=isSet?'rgba(26,138,74,0.18)':'rgba(224,108,0,0.2)';
      const statusBg=isSet?'rgba(26,138,74,0.12)':'rgba(224,108,0,0.12)';
      const statusColor=isSet?'#1a8a4a':'#e06c00';
      const tag=b.vacant?'空床':b.staff?'员工':'通通锁';
      const tagColor=b.vacant?'#8a94a6':b.staff?'#7c4dff':'#1a73e8';
      return `<label class="rc-bed-row" style="display:grid;grid-template-columns:24px minmax(64px,1fr) 82px minmax(120px,1.4fr);gap:8px;align-items:center;padding:7px 8px;margin:3px 0;border:1px solid ${rowBorder};border-radius:7px;background:${rowBg};cursor:pointer">
        <input type="checkbox" class="rc-bed-check" data-room="${esc(b.room)}" data-group="${esc(g)}" style="width:16px;height:16px">
        <span class="mono" style="font-size:13px;font-weight:700;color:var(--text)">${esc(b.room)}</span>
        <span style="font-size:11px;font-weight:800;color:${statusColor};background:${statusBg};border-radius:6px;padding:3px 6px;text-align:center">${isSet?fmtMoney(price):'未设置'}</span>
        <span style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          <b style="color:${tagColor};font-weight:700">${tag}</b>${b.lockRoom?` · ${esc(b.lockRoom)}`:''}${b.cardName?` · ${esc(b.cardName)}`:''}
        </span>
      </label>`;
    }).join('');
    return `<div style="margin-bottom:9px;border:1px solid ${groupBorder};border-radius:9px;background:${groupBg};overflow:hidden">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;gap:8px">
        <button onclick="rc_toggleCfgGroup(${jsArg(g)})" style="background:transparent;border:none;display:flex;align-items:center;gap:7px;cursor:pointer;min-width:0;flex:1;text-align:left">
          <span style="font-size:12px;color:${groupColor};font-weight:800">${open?'▾':'▸'}</span>
          <span style="font-size:12px;font-weight:800;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(g)}</span>
          <span style="font-size:10px;font-weight:700;color:${groupColor};background:${complete?'rgba(26,138,74,0.12)':'rgba(224,108,0,0.12)'};border-radius:999px;padding:2px 7px;white-space:nowrap">${complete?'已完成':'未完成'}</span>
          <span style="font-size:11px;font-weight:500;color:var(--text3);white-space:nowrap">${list.length}床 · 已设${done} · 未设${list.length-done}</span>
        </button>
        <button onclick="rc_selectApt(${jsArg(g)})" class="btn btn-ghost" style="font-size:10px;padding:4px 9px">勾选本组</button>
      </div>
      <div style="display:${open?'block':'none'};padding:0 8px 8px;border-top:1px solid ${groupBorder}">${body}</div>
    </div>`;
  }).join('');
  container.innerHTML=`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:10px">
      <div>
        <div style="font-size:13px;font-weight:800;color:var(--text)">参考租金设置</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px">显示通通锁全部床位，空床也包含 · 已设置 <b style="color:${configured?'var(--green)':'var(--text3)'}">${configured}</b>/${beds.length} (${pct}%)</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
        <input id="rc_batchVal" type="number" placeholder="AED" style="width:76px;padding:6px 8px;border:1px solid var(--border);border-radius:7px;font-size:12px;text-align:right">
        <button onclick="rc_applySelected()" class="btn btn-primary" style="font-size:11px;padding:6px 12px">确认本批</button>
        <button onclick="rc_selectEmpty()" class="btn btn-ghost" style="font-size:11px;padding:6px 10px">勾选未设置</button>
        <button onclick="rc_clearSelection()" class="btn btn-ghost" style="font-size:11px;padding:6px 10px">清空</button>
      </div>
    </div>
    <div style="font-size:10px;color:var(--text3);padding:7px;background:rgba(26,115,232,0.06);border-radius:6px;margin-bottom:10px">手动输入本批租金，再勾选对应床位，最后点“确认本批”。绿色表示已完成设置，橙色表示还未设置。</div>
    <div id="rc_cfgRows" style="max-height:410px;overflow-y:auto;padding-right:4px">
      ${beds.length?rows:'<div style="color:var(--text3);font-size:12px;padding:14px 0;text-align:center">暂无床位数据，请先刷新通通锁卡片</div>'}
    </div>`;
}
function rc_setBatchValue(v){
  const inp=document.getElementById('rc_batchVal')||document.getElementById('rc_bulkVal');
  if(inp){inp.value=v;inp.focus();}
  toast(`当前批次价格已选 ${v} AED，请勾选床位后点确认本批`);
}
function rc_selectedRooms(){
  return [...document.querySelectorAll('#rc_cfgRows .rc-bed-check:checked')].map(c=>String(c.dataset.room||'').trim()).filter(Boolean);
}
function rc_applySelected(){
  const inp=document.getElementById('rc_batchVal')||document.getElementById('rc_bulkVal');
  const v=parseFloat(inp?.value);
  if(!v||v<=0){toast('请先选择或输入本批租金','err');return;}
  const rooms=rc_selectedRooms();
  if(!rooms.length){toast('请先勾选本批要设置的床位','err');return;}
  const cfg=rc_getRoomCfg();
  rooms.forEach(r=>{cfg[r]=v;});
  rc_saveRoomCfg(cfg);
  toast(`已确认 ${rooms.length} 个床位为 ${v} AED`);
  const c=document.getElementById('rc_cfgPanel');if(c)rc_renderCfg(c);
}
function rc_selectEmpty(){
  const cfg=rc_getRoomCfg();let count=0;
  document.querySelectorAll('#rc_cfgRows .rc-bed-check').forEach(chk=>{
    const empty=!Number(cfg[String(chk.dataset.room||'').trim()]);
    chk.checked=empty;if(empty)count++;
  });
  toast(`已勾选 ${count} 个未设置床位`);
}
function rc_clearSelection(){
  document.querySelectorAll('#rc_cfgRows .rc-bed-check').forEach(chk=>chk.checked=false);
}
function rc_selectApt(apt){
  let count=0;
  document.querySelectorAll('#rc_cfgRows .rc-bed-check').forEach(chk=>{
    const match=chk.dataset.group===apt;
    chk.checked=match;if(match)count++;
  });
  toast(`已勾选 ${apt}：${count} 个床位`);
}
function rc_bulkFill(){
  rc_selectEmpty();
  rc_applySelected();
}
function rc_setAll(v){
  rc_setBatchValue(v);
}
function rc_applyApt(apt){
  rc_selectApt(apt);
}
function rc_saveCfgFromUI(){
  rc_saveRoomCfg(rc_getRoomCfg());
  toast('参考租金设置已保存');
}

/* v44: Coverage Gap Detection
   只抓“卡片覆盖日期明显超过租金覆盖日期”的漏网鱼。 */
function rc_activeRentArrearsMap(){
  const m={};
  (state.arrears||[]).forEach(a=>{
    if(a.cleared)return;
    if((a.type||'rent')==='deposit')return;
    if(Number(a.remain||0)<=0)return;
    const k=rc_normBedKey(a.room);
    if(!k)return;
    (m[k]||(m[k]=[])).push(a);
  });
  return m;
}
function rc_dateOnlyTs(d){
  const x=new Date(d);
  if(Number.isNaN(x.getTime()))return null;
  return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();
}
function rc_fmtShortDate(d){
  if(!d)return '-';
  const x=d instanceof Date?d:new Date(d);
  if(Number.isNaN(x.getTime()))return '-';
  return `${x.getMonth()+1}/${x.getDate()}`;
}
function rc_allLedgerSessions(){
  return dedupSessions([...(state.saved||[]),...(state.analysisSessions||[])]);
}
function rc_rentCoverageByBed(roomCfg,defaultPrice=700){
  const dayMs=86400000,coverage={};
  rc_allLedgerSessions().forEach(s=>{
    const paidTs=rc_dateOnlyTs(s.date);
    if(!paidTs)return;
    (s.entries||[]).forEach(raw=>{
      const e=normalizeEntry(raw);
      if(!(e.cat==='cash'||e.cat==='bank'))return;
      if(normTag(e.tag)==='Transfer')return;
      const bed=rc_normBedKey(e.room);
      if(!bed)return;
      const monthly=Number(roomCfg[bed])||defaultPrice;
      const daily=monthly/30;
      if(!daily)return;
      const rentPaid=rc_entryRentPaid(e);
      if(rentPaid<=0)return;
      const coverTs=paidTs+(rentPaid/daily)*dayMs;
      const old=coverage[bed];
      if(!old||coverTs>old.coverTs){
        coverage[bed]={bed,paidTs,coverTs,rentPaid,monthly,daily,entry:e,session:s};
      }
    });
  });
  return coverage;
}
function rc_currentOccupiedCards(){
  const map={};
  Object.entries(roomsData||{}).forEach(([lockRoom,rows])=>{
    (rows||[]).forEach(card=>{
      const name=String(card.cardName||'').trim();
      const st=cp_getStatus(card);
      if(st.type==='vacant'||st.type==='staff'||cp_isVacant(name)||cp_isStaff(name))return;
      const bed=rc_cardKey(card,lockRoom);
      if(!bed)return;
      const end=Number(card.endDate||0);
      const old=map[bed];
      if(!old||end>(old.end||0)){
        map[bed]={bed,lockRoom,cardName:rc_cardDisplay(card),end,endDate:end?new Date(end):null,cardStatus:st.label};
      }
    });
  });
  return Object.values(map);
}

/* ── WIFI MODULE (embedded but isolated) ── */
const WM_DAY=86400000;
var _wmFilter='action',_wmLastContinuityData=null,_wmAccountsCache=null,_wmLoadingAccounts=false;
const WM_UPPER='ABCDEFGHJKLMNPQRSTUVWXYZ';
const WM_LOWER='abcdefghjkmnpqrstuvwxyz';
const WM_NUM='23456789';
const WM_SYM='!@#$%';
function wmGetAccounts(){return _wmAccountsCache||{};}
async function wmLoadAccounts(force=false){
  if(_wmAccountsCache&&!force)return _wmAccountsCache;
  if(_wmLoadingAccounts)return _wmAccountsCache||{};
  _wmLoadingAccounts=true;
  try{
    const r=await apiFetch('/api/wifi/accounts',{method:'GET'});
    const j=await r.json();
    _wmAccountsCache=r.ok?(j.accounts||{}):{};
    LS.del('hl:wifi_accounts');
  }catch{_wmAccountsCache={};}
  _wmLoadingAccounts=false;
  return _wmAccountsCache;
}
async function wmSaveAccounts(m){
  _wmAccountsCache=m;
  LS.del('hl:wifi_accounts');
  const r=await apiFetch('/api/wifi/accounts',{method:'POST',body:JSON.stringify({accounts:m})});
  if(!r.ok)throw new Error('wifi_save_failed');
}
function wmRand(s){return s[Math.floor(Math.random()*s.length)];}
function wmGenPassword(){
  const p=[wmRand(WM_UPPER),wmRand(WM_UPPER),wmRand(WM_LOWER),wmRand(WM_LOWER),wmRand(WM_NUM),wmRand(WM_NUM),wmRand(WM_SYM),wmRand(WM_UPPER),wmRand(WM_LOWER),wmRand(WM_NUM),wmRand(WM_SYM),wmRand(WM_UPPER)];
  return p.sort(()=>Math.random()-0.5).join('');
}
function wmGenUsername(bed){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suf='';for(let i=0;i<6;i++)suf+=wmRand(chars);
  return `${bed}-${suf}`;
}
function wmNoon(ts){const d=new Date(Number(ts)||Date.now());return new Date(d.getFullYear(),d.getMonth(),d.getDate(),12,0,0).getTime();}
function wmStatus(acc,card){
  if(!acc)return{key:'none',label:'待创建',color:'#8a94a6',bg:'#8a94a610'};
  if(acc.manualCut)return{key:'cut',label:'已断网',color:'#52596a',bg:'#52596a12'};
  const end=wmNoon(acc.cardEnd||card.end||0),now=Date.now();
  if(now>=end)return{key:'overdue',label:'已到期',color:'#d93025',bg:'#d9302510'};
  if(end-now<=3*WM_DAY)return{key:'warning',label:'临期',color:'#e06c00',bg:'#e06c0010'};
  return{key:'active',label:'正常',color:'#1a8a4a',bg:'#1a8a4a10'};
}
function wmCardsFromContinuity(data){
  const map={};
  const src=(data?.cards&&data.cards.length)?data.cards:rc_currentOccupiedCards().map(c=>({...c,status:'ok'}));
  (src||[]).forEach(c=>{
    const bed=String(c.bed||'').trim();if(!bed)return;
    const old=map[bed],end=Number(c.end||c.endDate?.getTime?.()||0);
    if(!old||end>(old.end||0))map[bed]={...c,bed,end};
  });
  return Object.values(map).sort((a,b)=>String(a.bed).localeCompare(String(b.bed),undefined,{numeric:true}));
}
function wmCreateAccountFromCard(card,accounts){
  const old=accounts[card.bed]||{};
  accounts[card.bed]={
    ...old,
    bed:String(card.bed),
    lockRoom:card.lockRoom||old.lockRoom||'',
    tenantName:card.cardName||old.tenantName||'',
    cardName:card.cardName||old.cardName||'',
    username:old.username||wmGenUsername(card.bed),
    password:old.password||wmGenPassword(),
    cardEnd:Number(card.end||old.cardEnd||Date.now()+30*WM_DAY),
    createdAt:old.createdAt||Date.now(),
    manualCut:!!old.manualCut,
    archived:false
  };
}
async function wmSyncFromContinuity(){
  const cards=wmCardsFromContinuity(_wmLastContinuityData);
  if(!cards.length){toast('请先刷新通通锁数据','err');return;}
  const accounts=wmGetAccounts();let created=0,updated=0;
  cards.forEach(c=>{const existed=!!accounts[c.bed];wmCreateAccountFromCard(c,accounts);existed?updated++:created++;});
  try{await wmSaveAccounts(accounts);}catch(e){toast('WiFi 账户保存失败','err');return;}
  toast(`WiFi 账户已同步：新建 ${created}，更新 ${updated}`);
  wmRerender();
}
async function wmCreateOne(bed){
  const card=wmCardsFromContinuity(_wmLastContinuityData).find(c=>String(c.bed)===String(bed));
  if(!card){toast('未找到该床位的通通锁卡片','err');return;}
  const accounts=wmGetAccounts();wmCreateAccountFromCard(card,accounts);
  try{await wmSaveAccounts(accounts);}catch(e){toast('WiFi 账户保存失败','err');return;}
  toast(`WiFi 账户已准备：${bed}`);wmRerender();
}
function wmCopyOne(bed){
  const a=wmGetAccounts()[bed];if(!a){toast('请先创建该床位 WiFi 账户','err');return;}
  const txt=`Homelink WiFi\n房号：${a.bed}\n用户名：${a.username}\n密码：${a.password}\n有效期至：${new Date(wmNoon(a.cardEnd)).toLocaleString('zh-CN')}`;
  navigator.clipboard.writeText(txt).then(()=>toast('WiFi 凭证已复制')).catch(()=>toast('复制失败','err'));
}
function wmCopyAll(){
  const cards=wmCardsFromContinuity(_wmLastContinuityData),accounts=wmGetAccounts();
  const lines=cards.map(c=>accounts[c.bed]).filter(Boolean).map(a=>`${a.bed} | ${a.username} | ${a.password} | ${new Date(wmNoon(a.cardEnd)).toLocaleDateString('zh-CN')}`);
  if(!lines.length){toast('暂无可复制的 WiFi 账户','err');return;}
  navigator.clipboard.writeText(lines.join('\n')).then(()=>toast(`已复制 ${lines.length} 个 WiFi 凭证`)).catch(()=>toast('复制失败','err'));
}
function wmSetFilter(f){_wmFilter=f;wmRerender();}
function wmRerender(){
  const panel=document.getElementById('wifiPanel');
  if(panel)wmRenderPage();
}
async function wmLoadLock(){
  try{
    toast('正在刷新通通锁数据...');
    await cp_loadAll();
    toast('通通锁数据已刷新');
  }catch(e){toast('刷新失败：'+e.message,'err');}
  wmRenderPage();
}
async function wmRenderPage(){
  const panel=document.getElementById('wifiPanel');if(!panel)return;
  if(!_wmAccountsCache){
    panel.innerHTML='<div class="card"><div class="card-body" style="text-align:center;color:var(--text3);padding:28px">正在加载 WiFi 账户...</div></div>';
    await wmLoadAccounts();
  }
  panel.innerHTML=wmRenderModule(_wmLastContinuityData);
}
function wmRenderModule(data){
  const cards=wmCardsFromContinuity(data),accounts=wmGetAccounts();
  const rows=cards.map(c=>{
    const a=accounts[c.bed]||null,st=wmStatus(a,c);
    const needsAction=!a||['missing','noCoverage','noDate'].includes(c.status)||st.key==='overdue';
    return{card:c,acc:a,st,needsAction};
  }).filter(r=>_wmFilter==='all'||r.needsAction);
  const total=cards.length,ready=cards.filter(c=>accounts[c.bed]).length,action=cards.filter(c=>!accounts[c.bed]||['missing','noCoverage','noDate'].includes(c.status)||wmStatus(accounts[c.bed],c).key==='overdue').length;
  const filterBtn=(f,l)=>`<button class="btn ${_wmFilter===f?'btn-primary':'btn-ghost'}" onclick="wmSetFilter(${jsArg(f)})" style="font-size:11px;padding:5px 10px">${l}</button>`;
  return `<div class="card" style="overflow:hidden">
    <div class="card-head" style="align-items:flex-start">
      <div>
        <div style="font-size:13px;font-weight:800;color:var(--text)">📶 WiFi 网络管理模块 <span style="font-size:11px;color:var(--accent);font-weight:700">Beta</span></div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">从通通锁床位生成网络账号 · 后续接入 MikroTik RB750Gr3 执行断网/恢复</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <span class="mono" style="font-size:10px;color:var(--text3)">账号 ${ready}/${total} · 待处理 ${action}</span>
        <button class="btn btn-ghost" onclick="wmLoadLock()" style="font-size:11px;padding:5px 10px">刷新通通锁</button>
      </div>
    </div>
    <div class="card-body">
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px">
        <button class="btn btn-primary" onclick="wmSyncFromContinuity()" style="font-size:12px;padding:7px 12px">同步床位到账户</button>
        <button class="btn btn-ghost" onclick="wmCopyAll()" style="font-size:12px;padding:7px 12px">复制全部凭证</button>
        ${filterBtn('action','只看待处理')}${filterBtn('all','全部床位')}
        <span style="font-size:11px;color:var(--text3);align-self:center">当前为模块化接入：不自动断网，只生成建议和操作入口。</span>
      </div>
      ${!cards.length?'<div style="padding:24px;text-align:center;color:var(--text3);background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:10px">暂无通通锁床位数据，请先点击“刷新通通锁”。</div>':''}
      <div class="table-wrap" style="max-height:320px;background:var(--surface)">
        <table class="tx-table">
          <thead><tr><th>床位</th><th>租客/卡片</th><th>WiFi账号</th><th>网络状态</th><th>财务信号</th><th>操作</th></tr></thead>
          <tbody>${rows.length?rows.map(r=>{
            const c=r.card,a=r.acc,fin=STATUS_LABEL_WIFI_MAP[c.status]||STATUS_LABEL_WIFI_MAP.default;
            return `<tr>
              <td class="mono" style="font-weight:800">${esc(c.bed)}</td>
              <td style="font-size:11px;color:var(--text2)">${esc(c.cardName||'—')}<div style="font-size:10px;color:var(--text3)">门锁 ${esc(c.lockRoom||'—')} · 卡截止 ${rc_fmtShortDate(c.endDate)}</div></td>
              <td class="mono" style="font-size:11px">${a?esc(a.username):'<span style="color:var(--text3)">未创建</span>'}</td>
              <td><span style="font-size:10px;padding:3px 8px;border-radius:20px;background:${r.st.bg};color:${r.st.color};border:1px solid ${r.st.color}30;font-weight:700">${r.st.label}</span></td>
              <td><span style="font-size:10px;padding:3px 8px;border-radius:20px;background:${fin.bg};color:${fin.color};border:1px solid ${fin.color}30;font-weight:700">${fin.label}</span></td>
              <td style="white-space:nowrap">
                ${a?`<button class="btn btn-ghost" onclick="wmCopyOne(${jsArg(c.bed)})" style="font-size:10px;padding:4px 8px">复制</button>`:`<button class="btn btn-primary" onclick="wmCreateOne(${jsArg(c.bed)})" style="font-size:10px;padding:4px 8px">创建</button>`}
              </td>
            </tr>`;
          }).join(''):`<tr><td colspan="6" style="text-align:center;color:var(--text3);padding:18px">当前筛选下暂无待处理床位</td></tr>`}</tbody>
        </table>
      </div>
    </div>
  </div>`;
}
const STATUS_LABEL_WIFI_MAP={
  missing:{label:'建议处理漏收',color:'#d93025',bg:'#d9302510'},
  noCoverage:{label:'缺流水待确认',color:'#e06c00',bg:'#e06c0010'},
  noDate:{label:'无截止日',color:'#e06c00',bg:'#e06c0010'},
  knownArrears:{label:'已有欠款记录',color:'#8a94a6',bg:'#8a94a610'},
  ok:{label:'财务正常',color:'#1a8a4a',bg:'#1a8a4a10'},
  default:{label:'待确认',color:'#8a94a6',bg:'#8a94a610'}
};
function rc_cardContinuityRender(data,container){
  if(!data){container.innerHTML='<div style="color:var(--text3);text-align:center;padding:20px;font-size:13px">请先导入流水并加载通通锁数据后运行检查</div>';return;}
  _wmLastContinuityData=data;
  const{period,cards,alerts,sessions,gapLimit}=data;
  if(!cards.length){container.innerHTML='<div style="color:var(--text3);text-align:center;padding:20px;font-size:13px">通通锁暂无可检查的在住卡片</div>';return;}

  /* ── 读取处理记录，为每张漏收卡片注入 resolved 状态 ── */
  const resolutions=rc_getResolutions();
  const enriched=cards.map(c=>{
    if(c.status!=='missing')return{...c,resolved:null,rkey:''};
    const rkey=rc_resolveKey(c);
    const resolved=resolutions[rkey]||null;
    return{...c,resolved,rkey};
  });

  const counts=enriched.reduce((m,c)=>{m[c.status]=(m[c.status]||0)+1;return m;},{});
  const unresolvedMissing=enriched.filter(c=>c.status==='missing'&&!c.resolved);
  const resolvedMissing  =enriched.filter(c=>c.status==='missing'&&!!c.resolved);
  const yel=alerts.yellow.length,ok=counts.ok||0,known=counts.knownArrears||0;
  const redTotal=unresolvedMissing.reduce((s,c)=>s+(c.gapAmount||0),0);

  const pill=(lbl,val,col,bg)=>`<div style="background:${bg};border:1px solid ${col}35;border-radius:8px;padding:10px"><div style="font-size:10px;color:var(--text3)">${lbl}</div><div style="font-size:22px;font-weight:800;color:${col};font-family:JetBrains Mono,monospace">${val}</div></div>`;

  /* ── 快速摘要（仅未处理的漏收项） ── */
  const issueHtml=(title,list,col,open=true)=>list.length?`<div style="margin-top:10px;background:${col}10;border-left:3px solid ${col};border-radius:8px;overflow:hidden">
    <div onclick="const b=this.nextElementSibling;b.style.display=b.style.display==='none'?'block':'none';this.querySelector('[data-fold]').textContent=b.style.display==='none'?'展开':'收起';" style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;cursor:pointer">
      <b style="color:${col}">${title} (${list.length})</b>
      <span data-fold style="font-size:11px;color:var(--text3);white-space:nowrap">${open?'收起':'展开'}</span>
    </div>
    <div style="display:${open?'block':'none'};padding:0 12px 10px;font-size:12px;color:var(--text2);line-height:2">${list.map(c=>`${esc(c.bed)} &nbsp;|&nbsp; ${esc(c.cardName)} &nbsp;|&nbsp; ${c.shortAmount>1?'金额差额 '+fmtMoney(c.shortAmount)+' AED':c.gapDays+' 天 / '+fmtMoney(c.gapAmount)+' AED'} &nbsp;|&nbsp; ${esc(c.msg)}`).join('<br>')}</div>
  </div>`:'';

  /* ── 状态元数据 ── */
  const statusMeta={missing:['漏收异常','#d93025'],noCoverage:['缺流水','#e06c00'],noDate:['无截止日','#e06c00'],knownArrears:['已知欠款','#8a94a6'],ok:['正常','#1a8a4a']};

  /* ── 主表格（不含已处理的漏收项） ── */
  const mainCards=enriched.filter(c=>!(c.status==='missing'&&c.resolved));
  const mainRows=mainCards.map(c=>{
    const meta=statusMeta[c.status]||['待确认','#8a94a6'];
    const col=meta[1],statusLabel=meta[0];
    const isMissing=c.status==='missing';
    const actionBtn=isMissing
      ?`<button onclick="rc_openResolveModal(${jsArg(c.rkey)},${jsArg(c.bed)},${jsArg(c.cardName)},${c.gapAmount||c.shortAmount||0})" style="font-size:10px;padding:4px 9px;border-radius:6px;background:#d9302518;border:1px solid #d9302535;color:#d93025;cursor:pointer;font-weight:700;white-space:nowrap">处理 ▸</button>`
      :'';
    return `<tr style="background:${col}08">
      <td class="mono" style="font-weight:800;color:var(--text);padding:7px 8px">${esc(c.bed)}</td>
      <td style="font-size:11px;color:var(--text2);padding:7px 8px">${esc(c.cardName)}<span style="font-size:10px;color:var(--text3);margin-left:5px">门锁 ${esc(c.lockRoom)} · ${rc_fmtShortDate(c.endDate)}</span></td>
      <td class="mono right" style="padding:7px 8px">${fmtMoney(c.ref)}</td>
      <td class="mono" style="padding:7px 8px">${rc_fmtShortDate(c.lastPaidDate)}</td>
      <td class="mono" style="padding:7px 8px">${rc_fmtShortDate(c.coverageDate)}</td>
      <td class="mono right" style="font-weight:700;color:${col};padding:7px 8px">${c.gapDays||0}</td>
      <td class="mono right" style="font-weight:700;color:${col};padding:7px 8px">${fmtMoney(c.gapAmount||0)}</td>
      <td style="font-weight:700;color:${col};padding:7px 8px;white-space:nowrap">${statusLabel}</td>
      <td style="font-size:11px;color:var(--text2);padding:7px 8px;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.msg)}</td>
      <td style="padding:7px 8px">${actionBtn}</td>
    </tr>`;
  }).join('');

  /* ── 已处理区域 ── */
  const resolvedSection=resolvedMissing.length?`
    <div style="margin-top:16px;border:1px solid rgba(26,138,74,0.3);border-radius:10px;overflow:hidden">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:rgba(26,138,74,0.07);cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <span style="font-size:13px;font-weight:700;color:#1a8a4a">✅ 已处理问题 (${resolvedMissing.length})</span>
        <span style="font-size:11px;color:var(--text3)">点击展开/收起</span>
      </div>
      <div style="display:none">
        ${resolvedMissing.map(c=>{
          const rt=RC_RES_TYPES[c.resolved.type]||{label:c.resolved.type,icon:'📌',color:'#8a94a6',bg:'#8a94a610'};
          return `<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 14px;border-top:1px solid rgba(26,138,74,0.15)">
            <div style="min-width:0;flex:1">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:5px">
                <span class="mono" style="font-size:13px;font-weight:800;color:var(--text)">${esc(c.bed)}</span>
                <span style="font-size:11px;color:var(--text2)">${esc(c.cardName)}</span>
                <span style="font-size:10px;padding:2px 8px;border-radius:20px;font-weight:700;background:${rt.bg};color:${rt.color};border:1px solid ${rt.color}30">${rt.icon} ${rt.label}</span>
                <span class="mono" style="font-size:10px;color:var(--text3)">${new Date(c.resolved.resolvedAt||0).toLocaleDateString('zh-CN')}</span>
              </div>
              <div style="font-size:12px;color:var(--text2);line-height:1.6;padding:7px 10px;background:var(--surface2);border-radius:6px;border-left:3px solid ${rt.color}">${esc(c.resolved.note)}</div>
              <div style="font-size:10px;color:var(--text3);margin-top:4px;font-family:JetBrains Mono,monospace">差额 ${fmtMoney(c.gapAmount||c.shortAmount||0)} AED · 卡截止 ${rc_fmtShortDate(c.endDate)}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
              <button onclick="rc_openResolveModal(${jsArg(c.rkey)},${jsArg(c.bed)},${jsArg(c.cardName)},${c.gapAmount||c.shortAmount||0})" style="font-size:10px;padding:4px 9px;border-radius:6px;background:var(--surface2);border:1px solid var(--border);color:var(--text2);cursor:pointer;white-space:nowrap">编辑</button>
              <button onclick="rc_clearResolution(${jsArg(c.rkey)})" style="font-size:10px;padding:4px 9px;border-radius:6px;background:rgba(217,48,37,0.08);border:1px solid rgba(217,48,37,0.2);color:#d93025;cursor:pointer;white-space:nowrap">撤销</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`:'';

  container.innerHTML=`
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <button class="btn btn-ghost" onclick="rc_toggleCfg()" style="font-size:12px">📋 参考租金设置</button>
      <button class="btn btn-ghost" id="rc_loadBtn" onclick="rc_loadLock()" style="font-size:12px">🔄 刷新通通锁</button>
      <button class="btn btn-primary" onclick="rc_check()" style="font-size:12px">▶ 重新检查</button>
      <span style="font-size:11px;color:var(--text3);align-self:center">Coverage Gap · 阈值 > ${gapLimit}天 · ${sessions.length} 会话 · ${cards.length} 卡片</span>
    </div>
    <div id="rc_cfgPanel" style="display:none;padding:12px;background:var(--surface2);border-radius:10px;margin-bottom:12px"></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:10px">
      ${pill('待处理漏收',unresolvedMissing.length,'#d93025','#d9302510')}
      ${pill('估算差额',fmtMoney(redTotal),'#d93025','#d9302510')}
      ${pill('已处理',resolvedMissing.length,'#1a8a4a','#1a8a4a10')}
      ${pill('待确认',yel,'#e06c00','#e06c0010')}
      ${pill('已知欠款',known,'#8a94a6','#8a94a610')}
      ${pill('正常',ok,'#1a8a4a','#1a8a4a10')}
    </div>
    ${issueHtml('🔴 待处理漏收清单',unresolvedMissing,'#d93025',true)}
    ${issueHtml('🟠 无法计算覆盖日期',alerts.yellow,'#e06c00',false)}
    <div class="table-wrap" style="margin-top:12px;max-height:460px">
      <table class="tx-table">
        <thead><tr><th>床位</th><th>通通锁卡片</th><th class="right">月租</th><th>收款日</th><th>覆盖至</th><th class="right">缺口天</th><th class="right">差额</th><th>状态</th><th>原因</th><th>操作</th></tr></thead>
        <tbody>${mainRows}</tbody>
      </table>
    </div>
    ${resolvedSection}`;
}

/* v45: 通通锁续期锚点版覆盖缺口检测
   D200/D100 后面的 MMDD 是入住日/每月续期日；提前交租要覆盖到下一期锚点。 */
function rc_cardCycleAnchor(cardName){
  const s=String(cardName||'').trim();
  const matches=[...s.matchAll(/(?:^|\D)(\d{4})(?=\D*$)/g)];
  if(!matches.length)return null;
  const token=matches[matches.length-1][1];
  const month=Number(token.slice(0,2));
  const day=Number(token.slice(2));
  if(month<1||month>12||day<1||day>31)return null;
  return{month,day,token};
}
function rc_lastDayOfMonth(y,m){return new Date(y,m+1,0).getDate();}
function rc_cycleDate(y,m,day){
  return new Date(y,m,Math.min(day,rc_lastDayOfMonth(y,m))).getTime();
}
function rc_addCycleMonths(ts,delta,day){
  const d=new Date(ts);
  return rc_cycleDate(d.getFullYear(),d.getMonth()+delta,day||d.getDate());
}
function rc_rentMonthsPaid(rentPaid,monthly){
  if(!monthly||!rentPaid)return 0;
  const raw=rentPaid/monthly;
  const rounded=Math.max(1,Math.round(raw));
  const tolerance=Math.max(60,monthly*0.12);
  return Math.abs(rentPaid-monthly*rounded)<=tolerance?rounded:raw;
}
function rc_bestCoverageForCard(card,monthly,defaultPrice){
  const rows=rc_cardPaymentCandidates(card,monthly,defaultPrice);
  return rows[0]||null;
}

/* v48: rc_cardContinuityRun
   Bug2-Fix: 日租金用截止月实际天数；Bug4-Fix: gapDays 用 ceil 防止临界漏报
   v48主逻辑: shortAmount 基于跨日合并后的周期总收款，分期付款不再误报漏收 */
function rc_cardContinuityRun(){
  const period=getBillingPeriod();
  const roomCfg=rc_getRoomCfg();
  const DEFAULT_PRICE=700,dayMs=86400000,GAP_LIMIT=3;
  const arrears=rc_activeRentArrearsMap();
  const cards=rc_currentOccupiedCards().map(card=>{
    const monthly=Number(roomCfg[card.bed]||roomCfg[card.lockRoom])||DEFAULT_PRICE;
    /* Bug2-Fix: 实际天数日租金，避免31天月份系统性低估覆盖日 */
    const endDate=card.end?new Date(card.end):null;
    const daysInMonth=endDate?new Date(endDate.getFullYear(),endDate.getMonth()+1,0).getDate():30;
    const daily=monthly/daysInMonth;
    const cov=rc_bestCoverageForCard(card,monthly,DEFAULT_PRICE);
    const hasArrears=(arrears[card.bed]||[]).length>0;
    /* v48: rentPaid 已是周期内所有分期付款的合计，shortAmount 才能正确为0 */
    const shortAmount=cov?Math.max(0,Math.round((monthly-(cov.rentPaid||0))*100)/100):0;
    const anchoredShort=!!(cov&&cov.cycleAnchored&&shortAmount>1);
    let gapDays=0,gapAmount=0,status='ok',msg='租金覆盖日期与通通锁卡片截止日一致';
    if(!card.end){
      status='noDate';msg='通通锁卡片没有截止日期，无法做覆盖缺口检测';
    }else if(!cov){
      status=hasArrears?'knownArrears':'noCoverage';
      msg=hasArrears?'该床位已有未结清欠款记录，不进入漏收清单':'没有找到可计算覆盖日期的有效租金流水';
    }else{
      /* Bug4-Fix: ceil 确保3.x天缺口不被floor截断成3从而漏过阈值 */
      gapDays=Math.max(0,Math.ceil((card.end-cov.coverTs)/dayMs));
      gapAmount=Math.round(gapDays*daily*100)/100;
      if(hasArrears){
        status='knownArrears';
        msg=`覆盖缺口 ${gapDays} 天，但已有未结清欠款记录，不重复计入漏收`;
      }else if(anchoredShort){
        gapDays=0;gapAmount=shortAmount;status='missing';
        const nStr=cov.paymentCount>1?`（共${cov.paymentCount}笔，合计${fmtMoney(cov.rentPaid)} AED）`:'';
        msg=`卡片已按租期锚点续到 ${rc_fmtShortDate(new Date(card.end))}，但本期应收 ${fmtMoney(monthly)}、实收 ${fmtMoney(cov.rentPaid)}${nStr}，差额 ${fmtMoney(shortAmount)} AED`;
      }else if(gapDays>GAP_LIMIT){
        status='missing';
        msg=`卡片截止日比租金覆盖日多 ${gapDays} 天，疑似无收款续卡`;
      }else{
        status='ok';
        msg=gapDays>0?`覆盖差 ${gapDays} 天，未超过 ${GAP_LIMIT} 天阈值；${cov.method}`:`${cov.method}，覆盖已达到卡片截止日`;
      }
    }
    return{...card,ref:monthly,daily,coverage:cov||null,coverageDate:cov?new Date(cov.coverTs):null,lastPaidDate:cov?new Date(cov.paidTs):null,lastPaid:cov?cov.rentPaid:0,shortAmount,gapDays,gapAmount,status,msg,arrears:arrears[card.bed]||[]};
  });
  const rank={missing:0,noCoverage:1,noDate:2,knownArrears:3,ok:4};
  cards.sort((a,b)=>(rank[a.status]??9)-(rank[b.status]??9)||(b.gapAmount||0)-(a.gapAmount||0)||(parseInt(a.bed)||999999)-(parseInt(b.bed)||999999)||String(a.bed).localeCompare(String(b.bed),undefined,{numeric:true}));
  const alerts={
    red:cards.filter(c=>c.status==='missing').sort((a,b)=>(b.gapAmount||0)-(a.gapAmount||0)),
    yellow:cards.filter(c=>c.status==='noCoverage'||c.status==='noDate')
  };
  return{period,sessions:rc_allLedgerSessions(),cards,alerts,defaultPrice:DEFAULT_PRICE,gapLimit:GAP_LIMIT};
}
/* v48: rc_cardPaymentCandidates — 跨日租期分期付款聚合
   核心修复：同一租期内多日付款（如816号5/1付150+5/6付600）
   按租期锚点窗口合并，不再拆成独立行，彻底消除"分期误报漏收"。
   Bug2-Fix: daily 用截止月实际天数（非固定30天）
   Bug6-Fix: 付款归属最近匹配周期（防重复归属） */
function rc_cardPaymentCandidates(card,monthly,defaultPrice){
  const sessions=rc_allLedgerSessions();
  const bed=rc_normBedKey(card.bed);
  const anchor=rc_cardCycleAnchor(card.cardName);
  const dayMs=86400000;
  const eff=monthly||defaultPrice;
  /* Bug2-Fix: 实际天数日租 */
  const endDate=card.end?new Date(card.end):null;
  const daysInMonth=endDate?new Date(endDate.getFullYear(),endDate.getMonth()+1,0).getDate():30;
  const daily=eff/daysInMonth;

  /* 收集该床位所有原始付款记录 */
  const raw=[];
  sessions.forEach(s=>{
    const paidTs=rc_dateOnlyTs(s.date);
    if(!paidTs)return;
    (s.entries||[]).forEach(r=>{
      const e=normalizeEntry(r);
      if(!(e.cat==='cash'||e.cat==='bank'))return;
      if(normTag(e.tag)==='Transfer')return;
      if(rc_normBedKey(e.room)!==bed)return;
      const rentPaid=rc_entryRentPaid(e);
      if(rentPaid<=0)return;
      raw.push({paidTs,rentPaid,e,s,cash:e.cat==='cash'?rentPaid:0,bank:e.cat==='bank'?rentPaid:0});
    });
  });
  if(!raw.length)return[];

  if(anchor&&card.end){
    /* ── 锚点路径：按租期窗口归集跨日付款 ── */
    const endDay=new Date(card.end).getDate();
    const cycleDay=anchor.day||endDay;
    const earlyWindow=25*dayMs;
    const lateWindow=7*dayMs;
    const MAX_CYCLES=12;

    /* 构建最近12个周期的时间窗口（从最新到最旧） */
    const cycleWins=[];
    for(let n=1;n<=MAX_CYCLES;n++){
      const cStart=rc_addCycleMonths(card.end,-n,cycleDay);
      const cEnd=n===1?card.end:rc_addCycleMonths(card.end,-(n-1),cycleDay);
      cycleWins.push({n,cStart,cEnd,wStart:cStart-earlyWindow,wEnd:cEnd+lateWindow,pays:[]});
    }

    /* 每笔付款归属最近匹配周期（n=1优先，避免跨周期重复归属） */
    const assigned=new Set();
    raw.forEach((p,idx)=>{
      for(const w of cycleWins){
        if(p.paidTs>=w.wStart&&p.paidTs<=w.wEnd){
          w.pays.push(p);assigned.add(idx);break;
        }
      }
    });

    const rows=[];
    cycleWins.forEach(w=>{
      if(!w.pays.length)return;
      const total=Math.round(w.pays.reduce((s,p)=>s+p.rentPaid,0)*100)/100;
      const totalCash=Math.round(w.pays.reduce((s,p)=>s+p.cash,0)*100)/100;
      const totalBank=Math.round(w.pays.reduce((s,p)=>s+p.bank,0)*100)/100;
      const lastTs=Math.max(...w.pays.map(p=>p.paidTs));
      const entries=w.pays.map(p=>p.e);
      const payNotes=w.pays.map(p=>`${p.e.note||''} ${p.e.discountReason||''} ${p.e.payType||''}`).join(' ');
      const hasDiscount=/discount|diacount|disacount|折扣|优惠/i.test(payNotes);
      const hasInstallment=/installment|分期/i.test(payNotes);
      const hasShortCycle=/\b\d+\s*days?\b|天|半月|half/i.test(payNotes);
      const enoughForCycle=total>=eff*0.75||hasDiscount;
      const countLabel=w.pays.length>1?`${w.pays.length}笔合计 ${fmtMoney(total)} AED`:'';
      let coverTs,method,cycleAnchored=false;
      if(!hasInstallment&&!hasShortCycle&&enoughForCycle){
        coverTs=w.cEnd;cycleAnchored=true;
        method=`现金${fmtMoney(totalCash)}+银行${fmtMoney(totalBank)}${countLabel?' ('+countLabel+')':''}，按${anchor.token}锚点覆盖 ${rc_fmtShortDate(new Date(w.cStart))}-${rc_fmtShortDate(new Date(w.cEnd))}`;
      }else{
        coverTs=lastTs+(total/daily)*dayMs;
        method=`现金${fmtMoney(totalCash)}+银行${fmtMoney(totalBank)}${countLabel?' ('+countLabel+')':''}，按日租折算`;
      }
      const months=rc_rentMonthsPaid(total,eff);
      rows.push({bed,paidTs:lastTs,coverTs,rentPaid:total,monthly:eff,daily,months,entries,entry:entries[0],session:w.pays[0].s,method,expectedStart:w.cStart,cycleAnchored,cycleStart:w.cStart,cash:totalCash,bank:totalBank,paymentCount:w.pays.length});
    });

    /* 超出所有窗口的孤立付款：日租折算兜底 */
    raw.forEach((p,idx)=>{
      if(assigned.has(idx))return;
      const coverTs=p.paidTs+(p.rentPaid/daily)*dayMs;
      const months=rc_rentMonthsPaid(p.rentPaid,eff);
      rows.push({bed,paidTs:p.paidTs,coverTs,rentPaid:p.rentPaid,monthly:eff,daily,months,entries:[p.e],entry:p.e,session:p.s,method:`现金${fmtMoney(p.cash)}+银行${fmtMoney(p.bank)}，日租折算(超窗口)`,expectedStart:null,cycleAnchored:false,cycleStart:null,cash:p.cash,bank:p.bank,paymentCount:1});
    });

    rows.sort((a,b)=>(b.coverTs||0)-(a.coverTs||0));
    return rows;
  }

  /* ── 无锚点路径：按日期分组（保持原行为） ── */
  const dayGroups={};
  raw.forEach(p=>{
    const dateKey=new Date(p.paidTs).toISOString().slice(0,10);
    const key=`${bed}|${dateKey}`;
    if(!dayGroups[key])dayGroups[key]={bed,paidTs:p.paidTs,rentPaid:0,entries:[],sessions:[],cash:0,bank:0};
    dayGroups[key].rentPaid=Math.round((dayGroups[key].rentPaid+p.rentPaid)*100)/100;
    dayGroups[key].cash=Math.round(((dayGroups[key].cash||0)+p.cash)*100)/100;
    dayGroups[key].bank=Math.round(((dayGroups[key].bank||0)+p.bank)*100)/100;
    dayGroups[key].entries.push(p.e);dayGroups[key].sessions.push(p.s);
  });
  const rows=Object.values(dayGroups).map(g=>{
    const coverTs=g.paidTs+(g.rentPaid/daily)*dayMs;
    const months=rc_rentMonthsPaid(g.rentPaid,eff);
    return{bed,paidTs:g.paidTs,coverTs,rentPaid:g.rentPaid,monthly:eff,daily,months,entries:g.entries,entry:g.entries[0],session:g.sessions[0],method:`现金${fmtMoney(g.cash||0)}+银行${fmtMoney(g.bank||0)}，按日租折算`,expectedStart:null,cycleAnchored:false,cycleStart:null,cash:g.cash||0,bank:g.bank||0,paymentCount:g.entries.length};
  });
  rows.sort((a,b)=>(b.coverTs||0)-(a.coverTs||0));
  return rows;
}

function anaPanelHtml(key,title,sub,body){
  const open=!!state.anaOpen?.[key];
  return `<div class="card" style="margin-top:14px">
    <div class="card-head" onclick="toggleAnaPanel(${jsArg(key)})" style="cursor:pointer">
      <div><div class="card-title">${title}</div>${sub?`<div class="card-sub">${sub}</div>`:''}</div>
      <button class="btn btn-ghost" style="font-size:11px;padding:6px 10px">${open?'收起':'展开'}</button>
    </div>
    <div class="card-body" style="display:${open?'block':'none'}">${open?body:''}</div>
  </div>`;
}
function toggleAnaPanel(key){
  state.anaOpen=state.anaOpen||{};
  state.anaOpen[key]=!state.anaOpen[key];
  renderAnalysis();
  if(key==='continuity'&&state.anaOpen[key])rc_initPanel();
}
function renderAnalysis(){
  const hc=state.saved.length;
  document.getElementById('histCount').textContent=hc;
  const hc2=document.getElementById('histCount2');if(hc2)hc2.textContent=hc;
  renderAnalysisChips();
  const filt=filtered(),a=computeAna(filt);
  const wrap=document.getElementById('analysisContent');
  Object.values(charts).forEach(c=>{try{c.destroy();}catch{}});Object.keys(charts).forEach(k=>delete charts[k]);
  if(!a){wrap.innerHTML=`<div class="empty-state card" style="padding:44px;margin-top:14px"><div class="empty-ico">📊</div><div class="empty-title">等待数据</div><div class="empty-text">${state.analysisSessions.length===0?'粘贴TXT、上传文件，或从历史导入':'当前筛选条件下无数据，请调整时间范围'}</div></div>`;return;}
  const pl=state.dateMode==='month'?`${state.month} 月度`:state.dateMode==='range'?`${state.from||'起'} ~ ${state.to||'今'}`:'全部时段';
  const financeBody='<div class="chart-wrap" style="height:200px"><canvas id="cFinTrend"></canvas></div>';
  const peopleBody='<div class="chart-wrap" style="height:180px"><canvas id="cPeople"></canvas></div>';
  const txBody=`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px"><select class="sel" id="txCF" style="padding:7px 10px;font-size:12px;width:auto"><option value="all">全部</option><option value="cash">C 现金</option><option value="bank">B 银行</option><option value="refund">R 退款</option><option value="expense">E 支出</option><option value="tag:New">N 新入住</option><option value="tag:Transfer">T 换床位</option><option value="tag:Old">O 老租客</option><option value="ptype:discount">折扣</option><option value="ptype:installment">分期</option></select><div class="search-wrap"><svg class="ico"><use href="#i-search"/></svg><input class="inp" id="txS" placeholder="床位/备注" style="padding:7px 10px 7px 28px;font-size:12px;width:150px"></div><span id="txCounter" style="font-size:11px;color:var(--text3)"></span></div><div class="table-wrap" id="txWrap"></div>`;
  wrap.innerHTML=`
  <div class="card" style="margin-top:14px"><div class="card-head"><div><div class="card-title">${esc(pl)}</div><div class="card-sub">${a.n} 个会话 · ${a.all.length} 笔交易</div></div><div style="text-align:right"><div class="card-sub">期间总收入</div><div style="font-size:26px;font-weight:800;color:#1a9e3f;font-family:JetBrains Mono,monospace;letter-spacing:0">${fmtMoney(a.totals.total)} <span style="font-size:12px;color:var(--text3)">AED</span></div></div></div>
  <div class="card-body"><div class="ana-kpi-grid">${[['现金收入',a.totals.cashIn,'#c8902a'],['银行收入',a.totals.bankIn,'#1a8a4a'],['押金退款',a.totals.refundOut,'#e06c00'],['其他支出',a.totals.expOut,'#d93025'],['现金结余',a.totals.cashIn-a.totals.refundOut-a.totals.expOut,'#5b7fa6']].map(([l,v,c])=>`<div class="ana-kpi"><div class="ana-kpi-lbl">${l}</div><div class="ana-kpi-val" style="color:${c}">${fmtMoney(v)}</div></div>`).join('')}</div>
  <div class="hint" style="text-align:left;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">平均每次交接 <b style="color:var(--accent)">${fmtMoney(a.avg)} AED</b></div></div></div>
  ${anaPanelHtml('session','逐会话对比','排查核账专用 · 默认收起','<div id="anaSessionBreakdown"></div>')}
  ${anaPanelHtml('finance','财务趋势','每次交接 · 默认收起',financeBody)}
  ${anaPanelHtml('people','人员变动','新入住 · 退房 · 柱形图',peopleBody)}
  ${anaPanelHtml('tx','所有交易明细','流水较多，默认收起',txBody)}`;
  buildCharts(a);
  if(state.anaOpen?.session)buildSessionTable(filt);
  if(state.anaOpen?.tx){
    buildTxTable(a.all);
    document.getElementById('txCF').value=state.txCatFilter;document.getElementById('txS').value=state.txSearch;
    document.getElementById('txCF').onchange=e=>{state.txCatFilter=e.target.value;buildTxTable(a.all);};
    document.getElementById('txS').oninput=e=>{state.txSearch=e.target.value;buildTxTable(a.all);};
  }
}
function dList(title,icon,items,rowFn,empty){
  return `<div class="card"><div class="card-head"><div class="card-title"><svg class="ico" style="color:var(--accent)"><use href="#${icon}"/></svg>${title}</div><span style="font-size:11px;color:var(--text3)">${items.length}笔</span></div><div class="card-body">${items.length===0?`<div style="text-align:center;color:var(--text3);font-size:12px;padding:22px">${empty}</div>`:`<div class="detail-list">${items.map(e=>`<div class="detail-row">${rowFn(e)}</div>`).join('')}</div>`}</div></div>`;
}
function buildTxTable(all){
  const wrap=document.getElementById('txWrap');if(!wrap)return;
  const q=state.txSearch.toLowerCase();
  const f=all.filter(e=>{
    const cf=state.txCatFilter;
    if(cf!=='all'){
      if(cf.startsWith('tag:')&&e.tag!==cf.slice(4)) return false;
      else if(cf.startsWith('ptype:')&&e.payType!==cf.slice(6)) return false;
      else if(!cf.startsWith('tag:')&&!cf.startsWith('ptype:')&&e.cat!==cf) return false;
    }
    if(!q)return true;
    return(e.room||'').toLowerCase().includes(q)||(e.note||'').toLowerCase().includes(q);
  });
  document.getElementById('txCounter').textContent=`${f.length}/${all.length}`;
  if(!f.length){wrap.innerHTML=`<div style="text-align:center;color:var(--text3);padding:28px;font-size:12px">无匹配记录</div>`;return;}
  wrap.innerHTML=`<table class="tx-table"><thead><tr><th>日期</th><th>类别</th><th>房号</th><th class="right">金额</th><th>类型</th><th>备注</th></tr></thead><tbody>${f.map(e=>{const cat=CATS[e.cat]||{color:'var(--text2)'};return`<tr><td class="mono" style="color:var(--text3)">${esc((e.sd||'').slice(0,10))}</td><td><span style="font-weight:700;color:${cat.color};font-size:13px">${esc(CAT_DISP[e.cat]||e.cat||'未知')}</span></td><td class="mono" style="font-weight:700">${esc(e.room)}</td><td class="mono right" style="color:${cat.color};font-weight:600">${fmtMoney(e.amount)}</td><td style="color:var(--text2)">${esc(TAG_DISP[e.tag]||e.tag||'—')}</td><td style="color:var(--text2)">${esc(e.note||'—')}</td></tr>`;}).join('')}</tbody></table>`;
}
function buildCharts(a){
  Chart.defaults.color='#9ba3b0';Chart.defaults.font.family="'Inter',sans-serif";Chart.defaults.borderColor='rgba(0,0,0,0.06)';
  const st=a.sessionTrend||[];
  const labels=st.map(t=>t.date.slice(5)); // MM-DD
  const mkLine=(label,data,color,fill=false)=>({label,data,borderColor:color,backgroundColor:color.replace(')',',0.08)').replace('rgb','rgba'),tension:0.3,fill,borderWidth:2,pointRadius:st.length>8?2:4,pointBackgroundColor:color});
  // ── 财务趋势（5条线）──
  const ctxF=document.getElementById('cFinTrend');
  if(ctxF&&st.length>=1){
    charts.fin=new Chart(ctxF,{type:'line',data:{labels,datasets:[
      mkLine('现金结余', st.map(t=>t.cashBal),   '#1a73e8'),
      mkLine('银行收款', st.map(t=>t.bankIn),     '#1a8a4a'),
      mkLine('押金退款', st.map(t=>t.refundOut),  '#e06c00'),
      mkLine('其他支出', st.map(t=>t.expOut),     '#d93025'),
      mkLine('总收入',   st.map(t=>t.totalIn),    '#c8902a'),
    ]},options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#5a6170',padding:10,boxWidth:12}},
        tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${fmtMoney(c.parsed.y)} AED`}}},
      scales:{x:{ticks:{color:'#9ba3b0',maxRotation:45}},y:{ticks:{color:'#9ba3b0',callback:v=>v>=1000?Math.round(v/100)/10+'k':v},grid:{color:'rgba(0,0,0,0.04)'}}}
    }});
  }
  // ── 人员变动（新入住 + 退房）──
  const ctxP=document.getElementById('cPeople');
  if(ctxP&&st.length>=1){
    charts.ppl=new Chart(ctxP,{type:'bar',data:{labels,datasets:[
      {label:'新入住',data:st.map(t=>t.newCount),backgroundColor:'rgba(26,138,74,0.75)',borderColor:'#1a8a4a',borderWidth:1,borderRadius:5},
      {label:'退房',data:st.map(t=>t.deptCount),backgroundColor:'rgba(224,108,0,0.75)',borderColor:'#e06c00',borderWidth:1,borderRadius:5},
    ]},options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#5a6170',padding:10,boxWidth:12}},
        tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.parsed.y} 笔`}}},
      scales:{x:{ticks:{color:'#9ba3b0',maxRotation:45},grid:{display:false}},y:{beginAtZero:true,ticks:{color:'#9ba3b0',stepSize:1,precision:0},grid:{color:'rgba(0,0,0,0.04)'}}}
    }});
  }
}

function renderOwnerOverview(){
  const wrap=document.getElementById('ownerOverviewContent');
  if(!wrap)return;
  const sessions=state.analysisSessions&&state.analysisSessions.length?state.analysisSessions:state.saved;
  const today=(fmtDT(new Date())||'').slice(0,10);
  const entries=sessions.flatMap(s=>Array.isArray(s.entries)?s.entries.map(e=>({...e,_sessionDate:s.date,_sessionId:s.id,_anchorId:s.anchorId})):[]);
  const todayEntries=sessions.filter(s=>(s.date||'').slice(0,10)===today).flatMap(s=>Array.isArray(s.entries)?s.entries:[]);
  const todayTotals=totals(todayEntries);
  const openArrears=(state.arrears||[]).filter(a=>!a.cleared);
  const overdue=openArrears.filter(a=>a.dueDate&&a.dueDate<today);
  const latest=sessions.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,3);
  const recentEntries=entries.slice().reverse().slice(0,4);
  const kpi=(label,en,value,color='var(--color-primary)',note='')=>`
    <div class="owner-overview-card hl-card">
      <strong>${esc(label)}</strong>
      <span>${esc(en)}</span>
      <b style="color:${color}">${esc(value)}</b>
      ${note?`<span>${esc(note)}</span>`:''}
    </div>`;
  const arrearsHtml=openArrears.length?openArrears.slice(0,5).map(a=>`
    <div class="detail-row owner-mobile-row">
      <div class="room">${esc(a.room||'—')}</div>
      <div class="note">${esc(a.note||a.type||'待收尾款')}${a.dueDate?` · ${esc(a.dueDate)}`:''}</div>
      <div class="amount" style="color:var(--color-warning)">${fmtMoney(a.remain||0)}</div>
    </div>`).join(''):`<div class="empty-state hl-empty-state"><div class="empty-title">暂无待收尾款</div><div class="empty-text">加载通通锁和流水后会在这里显示需要关注的项目。</div></div>`;
  const latestHtml=latest.length?latest.map(s=>`
    <div class="detail-row owner-mobile-row">
      <div class="room">${esc((s.date||'').slice(0,10)||'—')}</div>
      <div class="note">${esc(s.anchorId||s.id||'会话')}</div>
      <div class="amount">${Array.isArray(s.entries)?s.entries.length:0} 笔</div>
    </div>`).join(''):`<div class="empty-state hl-empty-state"><div class="empty-title">暂无历史会话</div><div class="empty-text">导入或刷新数据后会在这里显示最近会话。</div></div>`;
  const alertHtml=[
    {label:'短付/待收',value:openArrears.length?`${openArrears.length} 项`:'暂无',tone:openArrears.length?'var(--color-warning)':'var(--color-primary)'},
    {label:'逾期',value:overdue.length?`${overdue.length} 项`:'暂无',tone:overdue.length?'var(--color-danger)':'var(--color-primary)'},
    {label:'待审核',value:'待接入',tone:'var(--color-text-muted)'},
    {label:'作废记录',value:'待接入',tone:'var(--color-text-muted)'}
  ].map(a=>`<div class="detail-row owner-mobile-row"><div class="room">${esc(a.label)}</div><div class="note">BUSINESS ALERT</div><div class="amount" style="color:${a.tone}">${esc(a.value)}</div></div>`).join('');
  const recentEntryHtml=recentEntries.length?recentEntries.map(e=>`
    <div class="detail-row owner-mobile-row">
      <div class="room">${esc(e.room||'—')}</div>
      <div class="note">${esc(CATS[e.cat]?.label||e.cat||'流水')} · ${esc((e._sessionDate||'').slice(0,10)||'未归档')}</div>
      <div class="amount">${fmtMoney(e.amount||0)}</div>
    </div>`).join(''):`<div class="empty-state hl-empty-state"><div class="empty-title">暂无最近流水</div><div class="empty-text">刷新历史或导入流水后显示最近记录。</div></div>`;
  wrap.innerHTML=`
    <div class="owner-overview-grid">
      ${kpi('今日实收','TODAY RECEIVED',fmtMoney(todayTotals.total),'var(--color-primary)',todayEntries.length?`${todayEntries.length} 笔今日流水`:'暂无今日流水')}
      ${kpi('待收尾款','OUTSTANDING',fmtMoney(openArrears.reduce((sum,a)=>sum+(Number(a.remain)||0),0)),'var(--color-warning)',`${openArrears.length} 项待跟进`)}
      ${kpi('今日待处理','ACTION ITEMS',String(openArrears.length+overdue.length),'#142033','短付、逾期、待跟进')}
      ${kpi('最近交接','LATEST HANDOVER',latest[0]?(latest[0].date||'').slice(0,10):'暂无','#1a73e8',latest[0]?`${latest[0].entries?.length||latest[0].entriesCount||0} 笔记录`:'等待员工提交或导入')}
    </div>
    <div class="card hl-card owner-overview-section" style="margin-top:16px">
      <div class="card-head"><div><div class="card-title">异常提醒</div><div class="card-sub">BUSINESS ALERTS</div></div></div>
      <div class="card-body"><div class="detail-list">${alertHtml}</div></div>
    </div>
    <div class="card hl-card owner-overview-section" style="margin-top:16px">
      <div class="card-head"><div><div class="card-title">待收尾款</div><div class="card-sub">OUTSTANDING FOLLOW-UP</div></div></div>
      <div class="card-body"><div class="detail-list">${arrearsHtml}</div></div>
    </div>
    <div class="card hl-card owner-overview-section" style="margin-top:16px">
      <div class="card-head"><div><div class="card-title">最近会话</div><div class="card-sub">RECENT SESSIONS</div></div></div>
      <div class="card-body"><div class="detail-list">${latestHtml}</div></div>
    </div>
    <div class="card hl-card owner-overview-section" style="margin-top:16px">
      <div class="card-head"><div><div class="card-title">最近流水摘要</div><div class="card-sub">RECENT LEDGER</div></div></div>
      <div class="card-body"><div class="detail-list">${recentEntryHtml}</div></div>
    </div>
    <div class="card hl-card owner-overview-section" style="margin-top:16px">
      <div class="card-head"><div><div class="card-title">快速进入</div><div class="card-sub">QUICK ACTIONS</div></div></div>
      <div class="card-body" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px">
        <button class="btn btn-ghost" type="button" onclick="switchView('history')">历史</button>
        <button class="btn btn-ghost" type="button" onclick="switchView('clients')">客户</button>
        <button class="btn btn-ghost" type="button" onclick="switchView('analysis')">分析</button>
        <button class="btn btn-ghost" type="button" onclick="switchView('wifi')">网络</button>
      </div>
    </div>`;
}

/* ── ANALYSIS IMPORT — 双重去重：锚点ID + 内容指纹 ── */

// 内容指纹：日期 + 笔数 + 各类总额（四舍五入到分）
// 只要是同一份流水，无论从哪条路径导入，指纹必然相同
function contentFP(s){
  const t=totals(s.entries);
  const d=(s.date||'').slice(0,10);
  return `${d}|${s.entries.length}|${Math.round(t.cashIn*100)}|${Math.round(t.bankIn*100)}|${Math.round(t.refundOut*100)}|${Math.round(t.expOut*100)}`;
}

// 从entries内容生成稳定锚点（历史会话无anchorId时用）
function stableAnchor(s){
  if(s.anchorId) return s.anchorId;
  const d=(s.date||'').slice(0,10);
  const sig=d+'|'+s.entries.map(e=>`${e.cat}${e.room}${Math.round(Number(e.amount||0)*100)}`).sort().join('|');
  let h=0;for(let i=0;i<sig.length;i++){h=((h<<5)-h+sig.charCodeAt(i))|0;}
  return `STA-${d.replace(/-/g,'')}-${Math.abs(h).toString(36).toUpperCase().padStart(6,'0')}`;
}

function isDuplicate(s){
  const fp=contentFP(s);
  return state.analysisSessions.some(x=>
    x.anchorId===s.anchorId || contentFP(x)===fp
  );
}

async function syncImportedSessionsToCloud(sessions){
  if(!sessions||!sessions.length)return{ok:0,fail:0,errors:[]};
  let ok=0,fail=0;const errors=[];
  for(const s of sessions){
    try{
      const r=await apiFetch('/api/save_session',{method:'POST',body:JSON.stringify({session:s,arrears:[]})});
      if(r.ok)ok++;
      else{fail++;errors.push(`${s.anchorId||s.id||'unknown'}: HTTP ${r.status}`);}
    }catch(e){fail++;errors.push(`${s.anchorId||s.id||'unknown'}: ${e.message||'network error'}`);}
  }
  return{ok,fail,errors};
}

let importSyncStatusTimer=null;
function renderImportSyncStatus(type,title,detail=''){
  const el=document.getElementById('importSyncStatus');
  if(!el)return;
  if(importSyncStatusTimer){clearTimeout(importSyncStatusTimer);importSyncStatusTimer=null;}
  el.className=`sync-status show ${type||'warn'}`;
  el.innerHTML=`<div class="sync-title">${esc(title)}</div>${detail?`<div class="sync-detail">${esc(detail)}</div>`:''}`;
  if(type==='ok'){
    importSyncStatusTimer=setTimeout(()=>{el.classList.remove('show');},6000);
  }
}

function importSyncDetail(added,dup,sync){
  const apiHost=apiUrl('/api/history').replace(/\/api\/history$/,'');
  const base=`本地新增 ${added} 份，云端成功 ${sync.ok} 份${dup>0?`，重复跳过 ${dup} 份`:''}。接口：${apiHost}`;
  if(sync.fail)return `${base}；失败 ${sync.fail} 份。${(sync.errors||[]).slice(0,2).join('；')}`;
  return base;
}

function tryAdd(text){
  // 先按新格式（##ANCHOR头）切割，再按旧格式（财务交接行）切割
  let parts=text.split(/(?=^##ANCHOR:)/m).filter(p=>p.trim());
  if(parts.length<=1) parts=text.split(/(?=^\d{4}-\d{2}-\d{2}.+财务交接)/m).filter(p=>p.trim());
  if(!parts.length) parts=[text];
  let added=0,dup=0;const addedSessions=[];
  parts.forEach(p=>{
    const s=parseTXT(p);
    if(s&&s.entries.length>0){
      s.anchorId=stableAnchor(s);
      if(!isDuplicate(s)){
        state.analysisSessions.push(s);
        LS.set(`anchor:${s.anchorId}`,JSON.stringify(s));
        addedSessions.push(s);
        added++;
      } else dup++;
    }
  });
  if(added>0) saveAnalysis();
  return{added,dup,addedSessions};
}
async function onPaste(){
  const text=document.getElementById('pasteArea').value;if(!text.trim()){toast('请粘贴TXT内容','err');return;}
  const{added,dup,addedSessions}=tryAdd(text);
  if(added===0){const msg=dup>0?`${dup}份已存在，无新增`:'未解析到有效记录';renderImportSyncStatus('warn','没有新增到云端',msg);toast(msg,'err');return;}
  document.getElementById('pasteArea').value='';
  renderImportSyncStatus('warn','本地已保存，正在同步云端...',`准备同步 ${added} 份流水。`);
  const sync=await syncImportedSessionsToCloud(addedSessions);
  renderImportSyncStatus(sync.fail?'err':'ok',sync.fail?'本地已保存，但云端同步失败':'本地和云端都已保存成功',importSyncDetail(added,dup,sync));
  toast(`已添加 ${added} 份，同步云端 ${sync.ok} 份${sync.fail?`，失败 ${sync.fail} 份`:''}${dup>0?`，${dup}份重复跳过`:''}`,sync.fail?'err':'ok');
  renderFilterControls();renderAnalysis();
}
async function onFiles(files){
  let added=0,dup=0,addedSessions=[];
  for(const f of files){
    try{const t=await f.text();const r=tryAdd(t);added+=r.added;dup+=r.dup;addedSessions=addedSessions.concat(r.addedSessions||[]);}catch{}
  }
  if(added===0){const msg=dup>0?`${dup}份已存在，无新增`:'未解析到有效会话';renderImportSyncStatus('warn','没有新增到云端',msg);toast(msg,'err');return;}
  renderImportSyncStatus('warn','本地已保存，正在同步云端...',`准备同步 ${added} 份流水。`);
  const sync=await syncImportedSessionsToCloud(addedSessions);
  renderImportSyncStatus(sync.fail?'err':'ok',sync.fail?'本地已保存，但云端同步失败':'本地和云端都已保存成功',importSyncDetail(added,dup,sync));
  toast(`已添加 ${added} 份，同步云端 ${sync.ok} 份${sync.fail?`，失败 ${sync.fail} 份`:''}${dup>0?`，${dup}份重复跳过`:''}`,sync.fail?'err':'ok');renderFilterControls();renderAnalysis();
}
async function updateHistCount(){
  const listEl=document.getElementById('histSessionList');
  if(listEl) listEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">加载中...</div>';
  let cloud=[];
  try{
    const r=await apiFetch(`/api/history?limit=${HISTORY_PAGE_SIZE}`);
    if(r.status===401){showAuthExpired();if(listEl)listEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--red);font-size:13px">登录已过期</div>';return;}
    if(r.status===403){if(listEl)listEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--red);font-size:13px">老板账户才能导入历史</div>';toast('老板账户才能导入历史','err');return;}
    if(!r.ok){if(listEl)listEl.innerHTML=`<div style="text-align:center;padding:20px;color:var(--red);font-size:13px">历史加载失败：${r.status}</div>`;return;}
    const data=await r.json();
    cloud=Array.isArray(data)?data:[];
  }catch(e){
    if(listEl)listEl.innerHTML=`<div style="text-align:center;padding:20px;color:var(--red);font-size:13px">历史加载失败：${esc(e.message||'网络错误')}</div>`;
    return;
  }
  const cloudIds=new Set(cloud.map(s=>s.id));
  const localExtra=state.saved.filter(s=>!cloudIds.has(s.id));
  window._histSessions=[
    ...cloud.map(s=>({id:s.id,date:s.date,anchorId:s.anchor_id,entriesCount:s.entries_count,createdBy:s.created_by||'',_cloud:true})),
    ...localExtra.map(s=>({id:s.id,date:s.date,anchorId:s.anchorId,entriesCount:(s.entries||[]).length,createdBy:'',_cloud:false}))
  ];
  const total=window._histSessions.length;
  const hc=document.getElementById('histCount');if(hc) hc.textContent=total;
  const hc2=document.getElementById('histCount2');if(hc2) hc2.textContent=total;
  if(!listEl) return;
  if(!total){
    listEl.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">暂无历史记录</div>';
    syncHistSelectionUI();
    return;
  }
  const periodMap=new Map();
  window._histSessions.forEach(s=>{
    const info=getImportBillingPeriodInfo(s.date);
    if(!periodMap.has(info.key))periodMap.set(info.key,{info,items:[]});
    periodMap.get(info.key).items.push(s);
  });
  const groups=[...periodMap.values()].sort((a,b)=>{
    if(a.info.key==='unknown')return 1;
    if(b.info.key==='unknown')return -1;
    return b.info.key.localeCompare(a.info.key);
  });
  groups.forEach((g,idx)=>{if(_histImportOpenGroups[g.info.key]===undefined)_histImportOpenGroups[g.info.key]=idx===0;});
  listEl.innerHTML=groups.map(({info,items})=>{
    const bodyId=`hist-import-group-${info.key}`;
    const isOpen=!!_histImportOpenGroups[info.key];
    const totalEntries=items.reduce((sum,s)=>sum+(s.entriesCount||0),0);
    return `<section class="hist-month" style="margin-bottom:8px">
      <div class="hist-month-head" style="cursor:default;gap:12px">
        <button data-hist-group-toggle="${esc(info.key)}" aria-expanded="${isOpen?'true':'false'}" type="button" style="background:transparent;border:none;display:flex;align-items:center;gap:8px;min-width:0;flex:1;text-align:left;cursor:pointer;color:inherit">
          <span class="hist-month-title"><span class="hist-month-dot"></span>${esc(info.label)}</span>
          <span class="hist-month-meta" style="justify-content:flex-start">
            <span class="hist-month-chip">${items.length}档</span>
            <span class="hist-month-chip">${totalEntries}笔</span>
            <span class="hist-month-chip">${esc(info.startStr)} → ${esc(info.endStr)}</span>
            <span class="hist-month-chip" data-hist-group-count="${esc(info.key)}">已选 ${items.length}/${items.length}</span>
            <span class="hist-month-toggle" data-hist-group-fold="${esc(info.key)}">${isOpen?'收起':'展开'}</span>
          </span>
        </button>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <button class="btn btn-ghost" data-hist-group-select="${esc(info.key)}" type="button" style="font-size:10px;padding:4px 8px">本期取消全选</button>
          <button class="btn btn-ghost" data-hist-group-clear="${esc(info.key)}" type="button" style="font-size:10px;padding:4px 8px">本期清空</button>
        </div>
      </div>
      <div class="hist-month-body" id="${bodyId}" style="display:${isOpen?'block':'none'}">
        ${items.map(s=>`
          <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer">
            <input type="checkbox" class="hist-chk" data-period-key="${esc(info.key)}" value="${esc(s.id)}" checked>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600">${esc((s.date||'').slice(0,10))}</div>
              <div style="font-size:11px;color:var(--text3)">${esc(s.anchorId||'—')} · ${s.entriesCount||0}笔 · ${s.createdBy==='manager'?'老板':'员工'}</div>
            </div>
          </label>`).join('')}
      </div>
    </section>`;
  }).join('');
  listEl.querySelectorAll('.hist-chk').forEach(chk=>chk.addEventListener('change',syncHistSelectionUI));
  listEl.querySelectorAll('[data-hist-group-toggle]').forEach(btn=>btn.addEventListener('click',()=>toggleHistImportGroup(btn.dataset.histGroupToggle)));
  listEl.querySelectorAll('[data-hist-group-select]').forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.histGroupSelect;
    const boxes=[...document.querySelectorAll(`.hist-chk[data-period-key="${cssEsc(key)}"]`)];
    const allChecked=boxes.length>0&&boxes.every(chk=>chk.checked);
    setHistGroupSelection(key,!allChecked);
  }));
  listEl.querySelectorAll('[data-hist-group-clear]').forEach(btn=>btn.addEventListener('click',()=>setHistGroupSelection(btn.dataset.histGroupClear,false)));
  syncHistSelectionUI();
}

function syncHistSelectionUI(){
  const boxes=[...document.querySelectorAll('.hist-chk')];
  const checkedCount=boxes.filter(chk=>chk.checked).length;
  const totalCount=boxes.length;
  const hc2=document.getElementById('histCount2');
  if(hc2)hc2.textContent=checkedCount;
  const toggleBtn=document.getElementById('btnHistToggleAll');
  if(toggleBtn)toggleBtn.textContent=totalCount>0&&checkedCount===totalCount?'取消全选':'全选';
  syncHistGroupSelectionUI();
}

function setHistSelection(checked){
  document.querySelectorAll('.hist-chk').forEach(chk=>{chk.checked=checked;});
  syncHistSelectionUI();
}

function toggleHistSelection(){
  const boxes=[...document.querySelectorAll('.hist-chk')];
  if(!boxes.length)return;
  const allChecked=boxes.every(chk=>chk.checked);
  setHistSelection(!allChecked);
}

function clearHistSelection(){
  setHistSelection(false);
}

const _histImportOpenGroups={};
function getImportBillingPeriodInfo(dateValue){
  const d=new Date(dateValue||'');
  if(Number.isNaN(d.getTime()))return{key:'unknown',label:'未归档账期',startStr:'--',endStr:'--'};
  const y=d.getFullYear(),m=d.getMonth();
  const cutoff=new Date(y,m,2,0,0,0,0);
  let start,end;
  if(d<cutoff){
    start=new Date(y,m-1,2,0,0,0,0);
    end=cutoff;
  }else{
    start=cutoff;
    end=new Date(y,m+1,2,0,0,0,0);
  }
  return{
    key:`${start.getFullYear()}-${pad(start.getMonth()+1)}`,
    label:`${start.getFullYear()}年${start.getMonth()+1}月账期`,
    startStr:fmtD(start),
    endStr:fmtD(new Date(end.getTime()-1))
  };
}

function syncHistGroupSelectionUI(){
  const groups=new Map();
  document.querySelectorAll('.hist-chk').forEach(chk=>{
    const key=chk.dataset.periodKey||'unknown';
    if(!groups.has(key))groups.set(key,{total:0,checked:0});
    const stat=groups.get(key);
    stat.total++;
    if(chk.checked)stat.checked++;
  });
  groups.forEach((stat,key)=>{
    const countEl=document.querySelector(`[data-hist-group-count="${key}"]`);
    if(countEl)countEl.textContent=`已选 ${stat.checked}/${stat.total}`;
    const selectBtn=document.querySelector(`[data-hist-group-select="${key}"]`);
    if(selectBtn)selectBtn.textContent=stat.total>0&&stat.checked===stat.total?'本期取消全选':'本期全选';
  });
}

function setHistGroupSelection(periodKey,checked){
  document.querySelectorAll(`.hist-chk[data-period-key="${cssEsc(periodKey)}"]`).forEach(chk=>{chk.checked=checked;});
  syncHistSelectionUI();
}

function toggleHistImportGroup(periodKey){
  _histImportOpenGroups[periodKey]=!_histImportOpenGroups[periodKey];
  const body=document.getElementById(`hist-import-group-${periodKey}`);
  if(body)body.style.display=_histImportOpenGroups[periodKey]?'block':'none';
  const btn=document.querySelector(`[data-hist-group-toggle="${periodKey}"]`);
  if(btn)btn.setAttribute('aria-expanded',_histImportOpenGroups[periodKey]?'true':'false');
  const label=document.querySelector(`[data-hist-group-fold="${periodKey}"]`);
  if(label)label.textContent=_histImportOpenGroups[periodKey]?'收起':'展开';
}

async function fromHistory(){
  if(!Array.isArray(window._histSessions)) await updateHistCount();
  const sessions=window._histSessions||[];
  const checked=[...document.querySelectorAll('.hist-chk:checked')].map(cb=>cb.value);
  if(!checked.length){toast('请先勾选要导入的会话','err');return;}
  const selected=sessions.filter(s=>checked.includes(s.id));
  if(!selected.length){toast('未找到选中的历史会话，请刷新历史列表','err');return;}
  const btn=document.getElementById('btnFromHistory');
  if(btn){btn.disabled=true;btn.style.opacity='0.65';}
  toast(`正在导入 ${selected.length} 份会话...`);
  let added=0,dup=0,fail=0,addedSessions=[];
  try{
  for(const cs of selected){
    let entries=[];
    if(cs._cloud){
      try{
        const r=await apiFetch(`/api/session_detail?id=${encodeURIComponent(cs.id)}`);
        if(r.status===401){showAuthExpired();return;}
        if(r.status===403){toast('老板账户才能导入历史详情','err');fail++;continue;}
        if(!r.ok){console.warn('session_detail failed:',cs.id,r.status);fail++;continue;}
        const rows=await r.json();
        if(!Array.isArray(rows)){fail++;continue;}
        entries=rows.map(tx=>({
          id:tx.id,cat:tx.cat,room:tx.room,amount:tx.amount,
          due:tx.due||0,paid:tx.paid||0,deficit:tx.deficit||0,
          tag:normTag(tx.tag),note:tx.note||'',
          roomTo:tx.room_to||undefined,startDate:tx.start_date||undefined,
          depDue:tx.dep_due||0,depPaid:tx.dep_paid||0,depDef:tx.dep_def||0,
          dueDate:tx.due_date||undefined,depDate:tx.dep_date||undefined,
          payType:tx.pay_type||undefined,discountReason:tx.discount_reason||undefined,
          depositCollection:tx.deposit_collection===1
        }));
      }catch(e){console.warn('session_detail failed:',cs.id,e);fail++;continue;}
    }else{
      const loc=state.saved.find(s=>s.id===cs.id);
      if(loc)entries=loc.entries||[];
    }
    if(!entries.length){fail++;continue;}
    const s={id:cs.id,date:cs.date||'',anchorId:cs.anchorId||mkAnchor(cs.id,(cs.date||'').slice(0,10)),entries};
    const aid=stableAnchor(s);
    const entry={...s,anchorId:aid};
    if(!isDuplicate(entry)){state.analysisSessions.push(entry);LS.set(`anchor:${aid}`,JSON.stringify(entry));added++;addedSessions.push(entry);}
    else dup++;
  }
  if(added>0)saveAnalysis();
  if(added>0)renderImportSyncStatus('warn','本地已保存，正在同步云端...',`准备同步 ${added} 份流水。`);
  const sync=await syncImportedSessionsToCloud(addedSessions);
  if(added>0)renderImportSyncStatus(sync.fail?'err':'ok',sync.fail?'本地已保存，但云端同步失败':'本地和云端都已保存成功',importSyncDetail(added,dup,sync));
  if(!added&&fail)renderImportSyncStatus('err','历史导入失败',`${fail} 份历史详情无法读取，请确认登录的是老板账户并稍后重试。`);
  toast(`导入 ${added} 份，同步云端 ${sync.ok} 份${sync.fail?`，同步失败 ${sync.fail} 份`:''}${dup>0?`，${dup}份重复跳过`:''}${fail>0?`，读取失败 ${fail} 份`:''}`,(sync.fail||fail&&!added)?'err':'ok');
  renderFilterControls();renderAnalysis();
  }finally{
    if(btn){btn.disabled=false;btn.style.opacity='';}
  }
}

/* ── BILLING PERIOD ANALYSIS ── */
function getBillingPeriod(){
  const now=new Date(),m=now.getMonth(),y=now.getFullYear();
  const cutoff=new Date(y,m,2,0,0,0);
  let start,end,label;
  if(now<cutoff){
    start=new Date(y,m-1,2,0,0,0);
    end=cutoff;
    label=`${start.getFullYear()}年${start.getMonth()+1}月账期`;
  }else{
    start=cutoff;
    end=new Date(y,m+1,2,0,0,0);
    label=`${y}年${m+1}月账期`;
  }
  const dayMs=86400000;
  const tot=Math.max(1,Math.ceil((end-start)/dayMs));
  const ela=Math.min(tot,Math.max(1,Math.floor((now-start)/dayMs)+1));
  const remaining=Math.max(0,Math.ceil((end-now)/dayMs));
  const fmd=d=>`${d.getMonth()+1}月${d.getDate()}日`;
  return{label,start,end,startStr:fmd(start),endStr:fmd(end),totalDays:tot,
    elapsedDays:ela,remainingDays:remaining,
    timePct:Math.min(1,Math.max(0,(now-start)/(end-start))),isHandoverDay:now>=cutoff&&now<new Date(y,m,3,0,0,0)};
}
/* 期内到期续租预测（从通通锁卡片计算） */
/* Bug2 Fix: 会话去重，防止 state.saved + state.analysisSessions 同一份数据重复计算 */
function dedupSessions(sessions){
  const seen=new Set();
  return sessions.filter(s=>{
    const k=s.anchorId||s.id;
    if(seen.has(k))return false;
    seen.add(k);return true;
  });
}

// 床位租金锚点：优先使用实际录入过的应收租金（due），保持与业务录入一致
function buildRecordedRentAnchorByBed(sessions){
  const anchors={};
  (sessions||[]).forEach(s=>{
    const ts=new Date(s?.date||'').getTime()||0;
    (s?.entries||[]).forEach(raw=>{
      const e=normalizeEntry(raw);
      if(!(e.cat==='cash'||e.cat==='bank'))return;
      if(normTag(e.tag)==='Transfer')return;
      const due=parseMoney(e.due||0);
      if(!(due>0))return;
      const bed=String(e.room||'').trim().replace(/^#+/,'');
      if(!bed||bed==='—'||bed==='-')return;
      const prev=anchors[bed];
      if(!prev||ts>=prev.ts){
        anchors[bed]={amount:due,ts};
      }
    });
  });
  return anchors;
}

/* Bug1+5/6 Fix: 按房间计算本期已收，从续租预估中抵扣 */
function calcPeriodRenewals(period){
  if(!roomsData||!Object.keys(roomsData).length)return null;
  const r2=n=>Math.round(n*100)/100;
  const roomCfg=rc_getRoomCfg();
  const DEFAULT_PRICE=700;
  const handoverTs=period.end.getTime();
  const nowTs=Date.now();

  // Bug2: 去重后的所有会话
  const allSess=dedupSessions([...state.saved,...state.analysisSessions]);
  const rentAnchorByBed=buildRecordedRentAnchorByBed(allSess);

  // Bug1: 按房间统计本期已收金额（用于抵扣）
  const paidByRoom={};
  allSess.filter(s=>{const d=new Date(s.date);return d>=period.start&&d<period.end;})
    .forEach(s=>(s.entries||[]).forEach(e=>{
      if((e.cat==='cash'||e.cat==='bank')&&e.room){
        const r=(e.room||'').trim().replace(/^#+/,'');  // 兼容旧版TXT导入的#前缀
        paidByRoom[r]=(paidByRoom[r]||0)+Number(e.amount||0);  // 不在累加时截断，在读取时统一r2
      }
    }));

  const items=[];
  const seenBeds=new Set();
  for(const[room,cards] of Object.entries(roomsData)){
    if(cp_isVacant(room))continue;
    for(const card of(cards||[])){
      if(cp_isVacant(card.cardName)||cp_isStaff(card.cardName))continue;
      const st=cp_getStatus(card);
      if(st.type==='vacant'||st.type==='staff')continue;
      if(!card.endDate)continue;
      if(card.endDate<handoverTs){
        const bedNo=cp_getBedNumber(card.cardName);
        const bedKey=bedNo!==999999?String(bedNo):(card.cardName||'').trim();
        const uniqueKey=`${room.trim()}|${bedKey}|${card.endDate}`;
        if(seenBeds.has(uniqueKey))continue;
        seenBeds.add(uniqueKey);
        // 金额锚点优先级：实际录入租金 > 床位配置 > 房间配置 > 默认价
        const anchorVal=Number(rentAnchorByBed[bedKey]?.amount||0);
        const cfgVal=Number(roomCfg[bedKey]||roomCfg[room]);
        const price=anchorVal>0?anchorVal:(cfgVal>0?cfgVal:DEFAULT_PRICE);
        const paid=r2(paidByRoom[bedKey]||paidByRoom[room.trim()]||0);
        const remaining=r2(Math.max(0,price-paid));
        const isPaid=Math.round(paid*100)>=Math.round(price*100);  // 用整数分比较避免浮点误差
        const isPartial=paid>0&&!isPaid;
        const isOverdue=card.endDate<nowTs;
        items.push({room:bedKey&&bedKey!==room?`${room} / ${bedKey}`:room,name:card.cardName||'—',endDate:new Date(card.endDate),
          price,paid,remaining,isPaid,isPartial,isOverdue,hasConfig:cfgVal>0,hasRecordedAnchor:anchorVal>0});
      }
    }
  }
  // 排序：待收优先（逾期>即将>已付）
  items.sort((a,b)=>{
    if(a.isPaid!==b.isPaid)return a.isPaid?1:-1;
    return a.endDate-b.endDate;
  });

  const gross=r2(items.reduce((s,i)=>s+i.price,0));
  const remaining=r2(items.reduce((s,i)=>s+i.remaining,0));
  const paidCount=items.filter(i=>i.isPaid).length;
  return{items,gross,total:remaining,count:items.length,paidCount,
    hasDefault:items.some(i=>!i.hasConfig)};
}

function renderBillingWidget(targetId){
  const el=document.getElementById(targetId);if(!el)return;
  const p=getBillingPeriod();
  const r2=n=>Math.round(n*100)/100;

  // Bug2: 去重后合并会话
  const allSess=dedupSessions([...state.saved,...state.analysisSessions]);
  const inPeriod=allSess.filter(s=>{const d=new Date(s.date);return d>=p.start&&d<p.end;});
  let cash=0,bank=0;
  // Fix2: s.entries 防空守卫
  inPeriod.forEach(s=>(s.entries||[]).forEach(e=>{
    if(e.cat==='cash')cash+=Number(e.amount||0);
    if(e.cat==='bank')bank+=Number(e.amount||0);
  }));
  const collected=r2(cash+bank);
  const [cashD,bankD]=[r2(cash),r2(bank)];  // 用于显示的已截断值

  // 未清欠款
  const outstanding=r2(state.arrears.filter(a=>!a.cleared).reduce((s,a)=>s+(Number(a.remain)||0),0));

  // 期内到期续租（通通锁）
  const ren=calcPeriodRenewals(p);
  const hasRen=ren&&ren.count>0;
  window._renewalSnapshots=window._renewalSnapshots||{};
  if(ren)window._renewalSnapshots[targetId]=ren;

  // Bug3 Fix: forecastTotal 包含欠款
  const forecastTotal=r2(collected+(hasRen?ren.total:0)+outstanding);
  const collectedPct=forecastTotal>0?Math.round(collected/forecastTotal*100):0;
  const renewPct=forecastTotal>0&&hasRen?Math.round(ren.total/forecastTotal*100):0;
  const tp=Math.round(p.timePct*100);

  // ── 续租明细列表 + 通通锁状态提示（合并在同一区域）──
  let renewListHtml='';
  if(ren===null){
    // 通通锁未加载
    renewListHtml=`<div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:var(--surface2);border:1px solid var(--border);font-size:11px;color:var(--text3);text-align:center">📡 在<b style="color:var(--text2)">控制面板</b>加载通通锁后，可自动计算期内到期床位和续租预估金额</div>`;
  }else if(ren.count===0){
    renewListHtml=`<div style="margin-top:10px;padding:8px 12px;border-radius:8px;background:rgba(26,138,74,0.06);border:1px solid rgba(26,138,74,0.2);font-size:11px;color:var(--text3);text-align:center">✓ 本期内无卡到期，收款已稳定</div>`;
  }else{
    const unpaid=ren.items.filter(i=>!i.isPaid).length;
    const overdue=ren.items.filter(i=>i.isOverdue&&!i.isPaid).length;
    const paidSummary=ren.paidCount>0?` · ${ren.paidCount}个已收齐`:'';
    renewListHtml=`<div style="margin-top:12px;border-top:1px solid var(--border);padding-top:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div>
          <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em">期内到期明细 · ${ren.count}个床位${paidSummary}${ren.hasDefault?' · ☆为默认700 AED':''}</div>
          <div style="font-size:11px;color:${overdue?'var(--red)':unpaid?'var(--orange)':'var(--green)'};margin-top:3px">${overdue?overdue+'个已过期未收':unpaid?unpaid+'个待收':'全部已收齐'}</div>
        </div>
        <button class="btn btn-ghost" style="font-size:11px;padding:6px 10px" onclick="showRenewalDetails(${jsArg(targetId)})">查看明细</button>
      </div>
    </div>`;
  }

  // ── 卡片区（2列或3列）──
  const card1=`<div style="background:rgba(26,138,74,0.08);border:1px solid rgba(26,138,74,0.25);border-radius:10px;padding:11px">
    <div style="font-size:9px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px">✅ 本期已收入</div>
    <div style="font-size:${hasRen?'17':'20'}px;font-weight:800;color:var(--green);font-family:JetBrains Mono,monospace;line-height:1">${fmtAED(collected)}</div>
    <div style="font-size:9px;color:var(--text3);margin-top:4px">现金 ${fmtAED(cashD)} · 银行 ${fmtAED(bankD)}</div>
    <div style="font-size:9px;color:var(--text3);margin-top:2px">${inPeriod.length} 个会话</div>
  </div>`;

  const card2=hasRen?`<div style="background:rgba(224,108,0,0.07);border:1px solid rgba(224,108,0,0.25);border-radius:10px;padding:11px">
    <div style="font-size:9px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px">📅 期内待续租</div>
    <div style="font-size:17px;font-weight:800;color:${ren.total>0?'var(--orange)':'var(--green)'};font-family:JetBrains Mono,monospace;line-height:1">${fmtAED(ren.total)}</div>
    <div style="font-size:9px;color:var(--text3);margin-top:4px">${ren.count}个到期 · ${ren.paidCount}个已收</div>
    <div style="font-size:9px;color:var(--text3);margin-top:2px">应收 ${fmtAED(ren.gross)}</div>
    <div style="font-size:9px;color:${ren.hasDefault?'var(--text3)':'var(--green)'};margin-top:2px">${ren.hasDefault?'☆含默认700价格':'✓ 按配置租金计算'}</div>
  </div>`:'';

  const card3=`<div style="background:${outstanding>0?'rgba(224,108,0,0.06)':'rgba(26,138,74,0.04)'};border:1px solid ${outstanding>0?'rgba(224,108,0,0.2)':'rgba(26,138,74,0.15)'};border-radius:10px;padding:11px">
    <div style="font-size:9px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:5px">⏳ 未清欠款</div>
    <div style="font-size:${hasRen?'17':'20'}px;font-weight:800;color:${outstanding>0?'var(--orange)':'var(--green)'};font-family:JetBrains Mono,monospace;line-height:1">${fmtAED(outstanding)}</div>
    <div style="font-size:9px;color:var(--text3);margin-top:4px">${state.arrears.filter(a=>!a.cleared).length} 笔待清</div>
  </div>`;

  const cardGrid=`<div class="billing-kpi-grid ${hasRen?'triple':'double'}" style="display:grid;grid-template-columns:${hasRen?'1fr 1fr 1fr':'1fr 1fr'};gap:8px;margin-bottom:12px">${card1}${card2}${card3}</div>`;

  // Fix1: progressHtml 用 hasRen 而非 ren，避免 count=0 时显示误导性的"续租预估 AED 0"图例
  let progressHtml='';
  if(hasRen){
    progressHtml=`<div style="margin-bottom:${ren.count>0?'0':'4px'}">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text2);margin-bottom:5px">
        <span>收款预测进度</span>
        <span style="font-family:JetBrains Mono,monospace;color:var(--text3)">已收${collectedPct}% · 待收${renewPct}%</span>
      </div>
      <div style="height:8px;background:var(--surface3);border-radius:4px;overflow:hidden;display:flex">
        <div style="height:100%;width:${collectedPct}%;background:linear-gradient(90deg,#1a9e3f,#34d399);flex-shrink:0"></div>
        <div style="height:100%;width:${renewPct}%;background:linear-gradient(90deg,#e06c00,#fbbf24);flex-shrink:0"></div>
      </div>
      <div style="display:flex;gap:10px;font-size:9px;color:var(--text3);margin-top:4px;font-family:JetBrains Mono,monospace;flex-wrap:wrap">
        <span><span style="display:inline-block;width:7px;height:7px;background:#1a9e3f;border-radius:1px;margin-right:3px"></span>已收 ${fmtAED(collected)}</span>
        <span><span style="display:inline-block;width:7px;height:7px;background:#e06c00;border-radius:1px;margin-right:3px"></span>续租预估 ${fmtAED(ren.total)}</span>
        <span style="margin-left:auto">预计合计 ${fmtAED(forecastTotal)}</span>
      </div>
    </div>`;
  }else if(forecastTotal>0){
    progressHtml=`<div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text2);margin-bottom:5px"><span>收款完成度</span><span style="color:var(--accent);font-weight:700;font-family:JetBrains Mono,monospace">${collectedPct}%</span></div>
      <div style="height:8px;background:var(--surface3);border-radius:4px;overflow:hidden"><div style="height:100%;width:${collectedPct}%;background:linear-gradient(90deg,#1a9e3f,#34d399);border-radius:4px"></div></div>
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-top:4px;font-family:JetBrains Mono,monospace"><span>已收 ${fmtAED(collected)}</span><span>欠款 ${fmtAED(outstanding)}</span></div>
    </div>`;
  }else if(!collected&&!outstanding){
    progressHtml='<div style="font-size:12px;color:var(--text3);text-align:center;padding:4px 0">暂无本期数据，请在<b style="color:var(--text2)">分析</b>标签导入本月流水后查看</div>';
  }

  el.innerHTML=`<div class="card billing-widget"><div class="card-body" style="padding:16px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px">
      <div>
        <div style="font-size:17px;font-weight:800;color:var(--accent);letter-spacing:0">${esc(p.label)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px;font-family:JetBrains Mono,monospace">${esc(p.startStr)} — ${esc(p.endStr)} · 共${p.totalDays}天</div>
      </div>
      <div style="display:flex;gap:20px">
        <div style="text-align:center"><div style="font-size:26px;font-weight:800;color:var(--blue);font-family:JetBrains Mono,monospace;line-height:1">${p.elapsedDays}</div><div style="font-size:9px;color:var(--text3);margin-top:3px">已过天数</div></div>
        <div style="text-align:center"><div style="font-size:26px;font-weight:800;font-family:JetBrains Mono,monospace;line-height:1;color:${p.remainingDays<=5?'var(--red)':'var(--orange)'}">${p.remainingDays}</div><div style="font-size:9px;color:var(--text3);margin-top:3px">距交接</div></div>
      </div>
    </div>
    <div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--text3);margin-bottom:4px;font-family:JetBrains Mono,monospace"><span>${esc(p.startStr)}</span><span>时间进度 ${tp}%</span><span>${esc(p.endStr)}</span></div>
      <div style="height:4px;background:var(--surface3);border-radius:2px;overflow:hidden"><div style="height:100%;width:${tp}%;background:linear-gradient(90deg,var(--blue),#6366f1);border-radius:2px"></div></div>
    </div>
    ${cardGrid}
    ${progressHtml}
    ${renewListHtml}
    ${p.isHandoverDay?`<div style="margin-top:12px;padding:9px 12px;border-radius:8px;background:rgba(200,184,0,0.08);border:1px solid rgba(200,184,0,0.3);font-size:12px;color:var(--hl-yellow)">⚠️ 今天是 2 号交接日，请在今晚完成本月账期结算</div>`:''}
  </div></div>`;
}

function showRenewalDetails(targetId){
  const ren=window._renewalSnapshots?.[targetId];
  if(!ren||!ren.items||!ren.items.length){toast('暂无期内到期明细','err');return;}
  const fmd=d=>`${d.getMonth()+1}月${d.getDate()}日`;
  const rows=ren.items.map(item=>{
    const status=item.isPaid?'已收齐':item.isPartial?'部分已收':item.isOverdue?'已过期':'待收';
    const color=item.isPaid?'#1a8a4a':item.isPartial?'#e06c00':item.isOverdue?'#d93025':'#5a6170';
    const amt=item.isPaid
      ?`已收 ${fmtMoney(item.paid)}`
      :item.isPartial
      ?`已收 ${fmtMoney(item.paid)} / 待收 ${fmtMoney(item.remaining)}`
      :`应收 ${fmtMoney(item.price)}${item.hasConfig?'':'（默认700）'}`;
    return `<tr>
      <td class="mono" style="font-weight:700">${esc(item.room)}</td>
      <td style="color:var(--text2);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(item.name)}</td>
      <td class="mono" style="color:var(--text3)">${fmd(item.endDate)}</td>
      <td style="color:${color};font-weight:700">${status}</td>
      <td class="mono" style="text-align:right;color:${color}">${amt}</td>
    </tr>`;
  }).join('');
  showModal('期内到期明细',`${ren.count} 个床位 · ${ren.paidCount} 个已收齐 · 待收 ${fmtMoney(ren.total)} AED`,
    `<div class="table-wrap" style="max-height:60vh"><table class="tx-table"><thead><tr><th>床位</th><th>租客/卡片</th><th>到期</th><th>状态</th><th class="right">金额</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}

/* ── CUSTOMER CREDIT SYSTEM ── */
const CC_GRADES={
  excellent:{label:'优质客户',color:'#1a8a4a',bg:'rgba(26,138,74,0.1)',border:'rgba(26,138,74,0.3)'},
  good:     {label:'良好客户',color:'#1a73e8',bg:'rgba(26,115,232,0.1)',border:'rgba(26,115,232,0.3)'},
  fair:     {label:'需留意',  color:'#c8b800',bg:'rgba(200,184,0,0.1)', border:'rgba(200,184,0,0.3)'},
  poor:     {label:'问题客户',color:'#e06c00',bg:'rgba(224,108,0,0.1)', border:'rgba(224,108,0,0.3)'},
  bad:      {label:'高风险',  color:'#d93025',bg:'rgba(217,48,37,0.08)',border:'rgba(217,48,37,0.25)'},
  new:      {label:'新客户',  color:'#9ba3b0',bg:'rgba(155,163,176,0.1)',border:'rgba(155,163,176,0.2)'},
};
function ccSave(){
  if(role!=='manager')return;
  const payload=JSON.stringify(state.customers);
  LS.set(CUSTOMER_KEY,payload);
  apiFetch('/api/customers',{method:'POST',body:JSON.stringify({customers:state.customers})})
    .catch(e=>console.warn('customers cloud save failed:',e));
}
function ccCalcStats(cust){
  if(!cust.payments||!cust.payments.length)return{grade:'new',pmts:[],lateCount:0,lateRate:0,avgDays:0,maxDays:0,streak:0};
  const pmts=cust.payments.map(p=>({...p,days:Math.round((new Date(p.act)-new Date(p.exp))/86400000)}));
  const late=pmts.filter(p=>p.days>CC_GRACE);
  const lateRate=late.length/pmts.length;
  const avgDays=late.length?Math.round(late.reduce((s,p)=>s+p.days,0)/late.length):0;
  const maxDays=late.length?Math.max(...late.map(p=>p.days)):0;
  let grade;
  if(pmts.length<2)grade='new';
  else if(lateRate>=0.6||avgDays>20)grade='bad';
  else if(lateRate>=0.4||avgDays>12)grade='poor';
  else if(lateRate>=0.2||avgDays>6) grade='fair';
  else if(lateRate>0.05)            grade='good';
  else                              grade='excellent';
  let streak=0;
  for(let i=pmts.length-1;i>=0;i--){if(pmts[i].days<=CC_GRACE)streak++;else break;}
  return{grade,pmts,lateCount:late.length,lateRate,avgDays,maxDays,streak};
}
var _ccOpen=null;
function ccToggle(id){_ccOpen=_ccOpen===id?null:id;ccRender();}
var _clientContinuityOpen=false;
function toggleClientContinuity(){
  _clientContinuityOpen=!_clientContinuityOpen;
  renderClientContinuityPanel();
  if(_clientContinuityOpen)rc_initPanel();
}
function renderClientContinuityPanel(){
  const el=document.getElementById('clientContinuityPanel');if(!el)return;
  el.innerHTML=`<div class="card">
    <div class="card-head" onclick="toggleClientContinuity()" style="cursor:pointer">
      <div>
        <div class="card-title">租金连续性检查</div>
        <div class="card-sub">按通通锁卡片床位核对当期流水，发现漏收和金额异常</div>
      </div>
      <button class="btn btn-ghost" style="font-size:11px;padding:6px 10px">${_clientContinuityOpen?'收起':'展开'}</button>
    </div>
    <div class="card-body" style="display:${_clientContinuityOpen?'block':'none'}">
      <div id="continuityWrap"></div>
    </div>
  </div>`;
}

/* ── ANALYSIS SESSION BREAKDOWN ── */
var _anaOpenSess=null;
function anaToggle(id){_anaOpenSess=_anaOpenSess===id?null:id;buildSessionTable(filtered());}

function buildSessionTable(sessions){
  const el=document.getElementById('anaSessionBreakdown');
  if(!el)return;
  if(!sessions||!sessions.length){el.innerHTML='';return;}
  const r2=n=>Math.round(n*100)/100;
  // 每个会话独立计算小计
  const sd=sessions.map(s=>{
    const t=totals(s.entries||[]);
    return{...s,_t:{cashIn:r2(t.cashIn),bankIn:r2(t.bankIn),refundOut:r2(t.refundOut),expOut:r2(t.expOut),net:r2(t.total),cashBal:r2(t.cashBal)}};
  }).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  // 异常检测：≥5个会话时才启用（N<5误报率高）
  const nets=sd.map(s=>s._t.net);
  const mean=nets.reduce((a,b)=>a+b,0)/nets.length;
  const doAnom=nets.length>=5;
  const sigma=doAnom?Math.sqrt(nets.reduce((a,b)=>a+Math.pow(b-mean,2),0)/nets.length):0;
  const thresh=sigma>0?sigma*1.5:Infinity;
  sd.forEach(s=>{s._anomaly=doAnom&&sigma>0&&Math.abs(s._t.net-mean)>thresh;});
  const hasAnom=sd.some(s=>s._anomaly);
  // 合计行（用于与上方汇总对账）
  const sumT=totals(sessions.flatMap(s=>s.entries||[]));
  const rows=sd.map(s=>{
    const open=_anaOpenSess===s.id;
    const d=(s.date||'').slice(0,10);
    const cnt=(s.entries||[]).length;
    const a=s._anomaly;
    return `<div style="border-bottom:1px solid var(--border);${a?'background:rgba(224,108,0,0.04)':''}">
    <div class="ana-session-grid" onclick="anaToggle(${jsArg(s.id)})" style="display:grid;grid-template-columns:80px repeat(6,1fr) 28px;gap:0 6px;align-items:center;padding:10px 14px;cursor:pointer;user-select:none" title="${a?'⚠ 此会话总收入与其他差异较大，建议展开核查':'点击展开查看全部条目'}">
        <div><div style="font-size:11px;font-weight:600;color:${a?'#e06c00':'var(--text)'};font-family:JetBrains Mono,monospace">${esc(d)}</div><div style="font-size:9px;color:var(--text3);margin-top:2px">${cnt}笔${a?' ⚠️':''}</div></div>
        <div style="text-align:right"><div style="font-size:9px;color:var(--text3)">现金</div><div style="font-size:12px;font-weight:600;color:#c8902a;font-family:JetBrains Mono,monospace">${fmtMoney(s._t.cashIn)}</div></div>
        <div style="text-align:right"><div style="font-size:9px;color:var(--text3)">银行</div><div style="font-size:12px;font-weight:600;color:#1a8a4a;font-family:JetBrains Mono,monospace">${fmtMoney(s._t.bankIn)}</div></div>
        <div style="text-align:right"><div style="font-size:9px;color:var(--text3)">退款</div><div style="font-size:12px;font-weight:600;color:#e06c00;font-family:JetBrains Mono,monospace">${fmtMoney(s._t.refundOut)}</div></div>
        <div style="text-align:right"><div style="font-size:9px;color:var(--text3)">支出</div><div style="font-size:12px;font-weight:600;color:#d93025;font-family:JetBrains Mono,monospace">${fmtMoney(s._t.expOut)}</div></div>
        <div style="text-align:right;border-left:1px solid var(--border);padding-left:6px"><div style="font-size:9px;color:var(--text3)">💰现金结余</div><div style="font-size:13px;font-weight:800;color:#1a73e8;font-family:JetBrains Mono,monospace">${fmtMoney(s._t.cashBal)}</div></div>
        <div style="text-align:right"><div style="font-size:9px;color:var(--text3)">总收入</div><div style="font-size:13px;font-weight:700;color:${a?'#e06c00':'#1a9e3f'};font-family:JetBrains Mono,monospace">${fmtMoney(s._t.net)}</div></div>
        <div style="display:flex;justify-content:flex-end"><svg style="width:13px;height:13px;color:var(--text3);transform:${open?'rotate(180deg)':'none'};transition:transform 0.2s" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg></div>
      </div>
      ${open?anaSessDetail(s):''}
    </div>`;
  }).join('');
  el.innerHTML=`<div class="card" style="margin-top:14px">
    <div class="card-head" style="padding:12px 14px">
      <div><div class="card-title">📋 逐会话对比 <span style="font-size:11px;font-weight:400;color:var(--text3)">排查核账专用</span></div>
      <div class="card-sub">${hasAnom?'⚠ 检测到总收入偏差会话（橙色行），建议优先展开核查':'数字均衡，无明显异常'} · 💰现金结余 = 实际拿到手的现金</div></div>
    </div>
    <div class="ana-session-grid ana-session-head" style="display:grid;grid-template-columns:80px repeat(6,1fr) 28px;gap:0 6px;padding:5px 14px;background:var(--surface2);border-top:1px solid var(--border);border-bottom:1px solid var(--border)">
      <div style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em">日期</div>
      <div style="text-align:right;font-size:9px;font-weight:600;color:#c8902a;text-transform:uppercase;letter-spacing:0.06em">现金</div>
      <div style="text-align:right;font-size:9px;font-weight:600;color:#1a8a4a;text-transform:uppercase;letter-spacing:0.06em">银行</div>
      <div style="text-align:right;font-size:9px;font-weight:600;color:#e06c00;text-transform:uppercase;letter-spacing:0.06em">退款</div>
      <div style="text-align:right;font-size:9px;font-weight:600;color:#d93025;text-transform:uppercase;letter-spacing:0.06em">支出</div>
      <div style="text-align:right;font-size:9px;font-weight:700;color:#1a73e8;text-transform:uppercase;letter-spacing:0.06em;border-left:1px solid var(--border);padding-left:6px">💰现金结余</div>
      <div style="text-align:right;font-size:9px;font-weight:600;color:#1a9e3f;text-transform:uppercase;letter-spacing:0.06em">总收入</div>
      <div></div>
    </div>
    ${rows}
    <div class="ana-session-grid ana-session-total" style="display:grid;grid-template-columns:80px repeat(6,1fr) 28px;gap:0 6px;padding:10px 14px;background:var(--surface2);border-top:2px solid var(--border2)">
      <div style="font-size:10px;font-weight:700;color:var(--text2)">合计</div>
      <div style="text-align:right;font-size:12px;font-weight:700;color:#c8902a;font-family:JetBrains Mono,monospace">${fmtMoney(r2(sumT.cashIn))}</div>
      <div style="text-align:right;font-size:12px;font-weight:700;color:#1a8a4a;font-family:JetBrains Mono,monospace">${fmtMoney(r2(sumT.bankIn))}</div>
      <div style="text-align:right;font-size:12px;font-weight:700;color:#e06c00;font-family:JetBrains Mono,monospace">${fmtMoney(r2(sumT.refundOut))}</div>
      <div style="text-align:right;font-size:12px;font-weight:700;color:#d93025;font-family:JetBrains Mono,monospace">${fmtMoney(r2(sumT.expOut))}</div>
      <div style="text-align:right;font-size:13px;font-weight:800;color:#1a73e8;font-family:JetBrains Mono,monospace;border-left:1px solid var(--border);padding-left:6px">${fmtMoney(r2(sumT.cashBal))}</div>
      <div style="text-align:right;font-size:13px;font-weight:800;color:#1a9e3f;font-family:JetBrains Mono,monospace">${fmtMoney(r2(sumT.total))}</div>
      <div></div>
    </div>
  </div>`;
}
function anaSessDetail(s){
  const entries=s.entries||[];
  if(!entries.length)return'<div style="padding:12px 16px;color:var(--text3);font-size:12px;text-align:center;border-top:1px solid var(--border)">无条目</div>';
  const r2=n=>Math.round(n*100)/100;
  const rows=entries.map(e=>{
    const cat=CATS[e.cat]||{};
    return`<tr>
      <td style="padding:6px 8px"><span style="font-size:11px;font-weight:700;color:${cat.color||'var(--text)'}">${CAT_DISP[e.cat]||e.cat}</span></td>
      <td style="padding:6px 8px;font-family:JetBrains Mono,monospace;font-size:12px;font-weight:600;color:var(--text)">${esc(e.room||'—')}</td>
      <td style="padding:6px 8px;font-family:JetBrains Mono,monospace;font-size:12px;font-weight:600;text-align:right;color:${cat.color||'var(--text)'}">${fmtMoney(Number(e.amount||0))}</td>
      <td style="padding:6px 8px;font-size:11px;color:var(--text3)">${esc(TAG_DISP[e.tag]||e.tag||'—')}</td>
      <td style="padding:6px 8px;font-size:11px;color:var(--text2);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(e.note||'—')}</td>
    </tr>`;
  }).join('');
  const t=totals(entries);
  return`<div style="border-top:1px solid var(--border);background:var(--surface2);padding:10px 14px 2px">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="text-align:left;font-size:9px;color:var(--text3);padding:3px 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">类别</th>
        <th style="text-align:left;font-size:9px;color:var(--text3);padding:3px 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">房号</th>
        <th style="text-align:right;font-size:9px;color:var(--text3);padding:3px 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">金额</th>
        <th style="text-align:left;font-size:9px;color:var(--text3);padding:3px 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">类型</th>
        <th style="text-align:left;font-size:9px;color:var(--text3);padding:3px 8px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">备注</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr style="border-top:1px solid var(--border2)">
        <td colspan="2" style="padding:7px 8px;font-size:10px;font-weight:700;color:var(--text2)">本次小计</td>
        <td style="padding:7px 8px;text-align:right;font-family:JetBrains Mono,monospace;font-size:12px;font-weight:800;color:#1a9e3f">${fmtMoney(r2(t.total))}</td>
        <td colspan="2" style="padding:7px 8px;font-size:10px;color:var(--text3)">总收入 · 现金结余 ${fmtMoney(r2(t.cashBal))}</td>
      </tr></tfoot>
    </table>
  </div>`;
}
/* ═══════════════════════════════════════════════════════
   客户风险评分系统 v3  — 数据工程复盘版
   ─────────────────────────────────────────────────────
   信号1: 延迟天数   = paidTs - coverTs（截止日，非起始日）
   信号2: 分批惩罚   = 到期后分批×6 / 到期前分批×2
   信号3: 欠款惩罚   = 实收<85%参考租金时触发
   信号4: 孤立兜底   = 脱锚付款用 card.end 估算延迟
   叠加:  指数加权（越近越重，1.5^i）+ 连续恶化升级
   ─────────────────────────────────────────────────────
   已知结构限制（rc_cardPaymentCandidates 约束，不宜改动）：
   · 周期窗口重叠时，付款归更近的周期（可能漏判轻度延迟）
   · 孤立付款的兜底估算仅对最近周期准确
   · MAX_CYCLES=12，仅回溯 12 个月
   ═══════════════════════════════════════════════════════ */

let _ccCache=null; // {tenants, built} — 评分缓存


function ccScoreCycle(cyc,monthly,cardEndTs){
  // 延迟天数：用截止日(coverTs)，非起始日(cycleStart)
  let daysLate=0;
  if(cyc.cycleAnchored&&cyc.coverTs){
    daysLate=Math.max(0,Math.round((cyc.paidTs-cyc.coverTs)/86400000));
  }else if(!cyc.cycleAnchored&&cardEndTs>0&&cyc.paidTs>cardEndTs){
    // 脱锚孤立付款：用当前card.end兜底（仅最近周期可靠）
    daysLate=Math.max(0,Math.round((cyc.paidTs-cardEndTs)/86400000));
  }
  const extraPayments=Math.max(0,(cyc.paymentCount||1)-1);
  const isPostExpiry=daysLate>0;
  const fragPenalty=extraPayments*(isPostExpiry?6:2); // 到期后分批惩罚加倍
  const completeness=monthly>0?Math.min(1,(cyc.rentPaid||0)/monthly):1;
  const shortPenalty=completeness<0.85?Math.round((1-completeness)*30):0;
  return{daysLate,fragPenalty,shortPenalty,
    total:daysLate+fragPenalty+shortPenalty,
    paymentCount:cyc.paymentCount||1,completeness,isPostExpiry,
    cycleAnchored:!!cyc.cycleAnchored,paidTs:cyc.paidTs,coverTs:cyc.coverTs||0};
}

function ccTenantScore(bed,card,monthly,tenancyStartTs){
  const cardEndTs=Number(card.end)||0;
  const allCycles=rc_cardPaymentCandidates(card,monthly,700);
  // 只用当前租约之后的周期（tenancyStartTs>0时）
  const cycles=tenancyStartTs>0
    ?allCycles.filter(c=>c.paidTs>=tenancyStartTs)
    :allCycles;
  const empty={grade:'new',score:0,n:0,streak:0,avgDaysLate:0,totalFrag:0,
    cycleDetails:[],anchored:false,anchoredCount:0,tenancyStartTs:tenancyStartTs||0};
  if(!cycles.length)return empty;
  const sorted=[...cycles].sort((a,b)=>a.paidTs-b.paidTs); // 旧→新
  const details=sorted.map(c=>ccScoreCycle(c,monthly,cardEndTs));
  const n=details.length;
  const anchoredCount=details.filter(d=>d.cycleAnchored).length;
  const anchored=n>0&&anchoredCount/n>=0.5; // 多数周期有锚点才算可靠
  // 指数加权（index 0=最旧权重1，index n-1=最新权重1.5^(n-1)）
  const weights=details.map((_,i)=>Math.pow(1.5,i));
  const totalW=weights.reduce((s,w)=>s+w,0);
  const weightedScore=details.reduce((s,d,i)=>s+d.total*weights[i],0)/totalW;
  // 连续恶化次数（≥3分视为"坏周期"）
  let streak=0;
  for(let i=details.length-1;i>=0;i--){if(details[i].total>=3)streak++;else break;}
  // 分级阈值（收紧版：5天均延→留意，而非良好）
  const gradeOrder=['excellent','good','fair','poor','bad'];
  let gi;
  if(n<2)gi=-1;
  else if(weightedScore<=1) gi=0; // 优质：≤1天
  else if(weightedScore<=4) gi=1; // 良好：≤4天
  else if(weightedScore<=12)gi=2; // 留意：≤12天
  else if(weightedScore<=24)gi=3; // 问题：≤24天
  else                      gi=4; // 高风险：>24天
  // 连续恶化升级（阈值收严：3个月升一级，5个月升两级）
  if(gi>=0){
    if(streak>=5)gi=Math.min(gi+2,4);
    else if(streak>=3)gi=Math.min(gi+1,4);
  }
  const grade=gi<0?'new':gradeOrder[gi];
  const avgDaysLate=Math.round(details.reduce((s,d)=>s+d.daysLate,0)/n);
  const totalFrag=details.filter(d=>d.paymentCount>1&&d.isPostExpiry).length;
  return{grade,score:Math.round(weightedScore*10)/10,n,streak,
    avgDaysLate,totalFrag,cycleDetails:details,anchored,anchoredCount,
    tenancyStartTs:tenancyStartTs||0};
}

/** 构建评分缓存（重计算，仅在明确刷新或数据变更时调用）
 *  修复：
 *  · 预建 tenancyMap，O(sessions×entries) 替代 O(tenants×sessions×entries)
 *  · 同时识别 'New' 和 'Transfer' 换入作为当前租约起点
 *  · 预排序存入缓存，ccRender 搜索时不重排
 */
function ccBuildCache(){
  const allSessions=rc_allLedgerSessions();
  const _orig=window.rc_allLedgerSessions;
  window.rc_allLedgerSessions=()=>allSessions; // 让 rc_cardPaymentCandidates 用缓存
  try{
    // ── Step1: 一次性扫描所有会话，建 床位→入住时间戳 索引 ──
    // 识别两种新租约起点：
    //   tag='New'       : room=床位  → 新租客入住
    //   tag='Transfer'  : roomTo=床位 → 换床入住（原来漏掉了这种）
    const tenancyMap={}; // bed → 最近入住时间戳
    allSessions.forEach(s=>{
      const ts=rc_dateOnlyTs(s.date);
      if(!ts)return;
      (s.entries||[]).forEach(e=>{
        const ne=normalizeEntry(e);
        let bed=null;
        if(ne.tag==='New')bed=rc_normBedKey(e.room);
        else if(ne.tag==='Transfer'&&e.roomTo)bed=rc_normBedKey(e.roomTo);
        if(!bed)return;
        if(!tenancyMap[bed]||ts>tenancyMap[bed])tenancyMap[bed]=ts;
      });
    });
    // ── Step2: 从通通锁构建在住租客列表 ──
    const hasLock=roomsData&&Object.keys(roomsData).length>0;
    const tenants=[];
    if(hasLock){
      const seen=new Map(); // bed → tenants[]下标，O(1)
      Object.entries(roomsData).forEach(([lockRoom,cards])=>{
        (cards||[]).forEach(card=>{
          if(cp_isVacant(card.cardName)||cp_isStaff(card.cardName))return;
          const st=cp_getStatus(card);
          if(st.type==='vacant'||st.type==='staff')return;
          const bed=rc_normBedKey(rc_cardKey(card,lockRoom));
          if(!bed)return;
          const endTs=Number(card.endDate||0);
          const endLabel=card.endDate?rc_fmtShortDate(new Date(card.endDate)):'—';
          if(seen.has(bed)){
            const ex=tenants[seen.get(bed)];
            if(endTs>ex.endTs){
              ex.cardName=card.cardName||''; ex.lockRoom=lockRoom;
              ex.endTs=endTs; ex.endLabel=endLabel;
              ex._card={cardName:card.cardName,end:endTs,bed};
            }
          }else{
            seen.set(bed,tenants.length);
            tenants.push({bed,cardName:card.cardName||'',lockRoom,endTs,endLabel,
              _card:{cardName:card.cardName,end:endTs,bed}});
          }
        });
      });
    }
    // ── Step3: 一次性读取租金配置 + 评分 ──
    const roomCfg=rc_getRoomCfg();
    tenants.forEach(t=>{
      try{
        const monthly=Number(roomCfg[t.bed])||700;
        const startTs=tenancyMap[t.bed]||0; // 当前租约起始（0=无记录）
        t.sc=ccTenantScore(t.bed,t._card,monthly,startTs);
      }catch(e){
        console.warn('[ccTenantScore]',t.bed,t.cardName,e);
        t.sc={grade:'new',score:0,n:0,streak:0,avgDaysLate:0,totalFrag:0,
          cycleDetails:[],anchored:false,anchoredCount:0,tenancyStartTs:0,scoreError:true};
      }finally{
        delete t._card;
      }
    });
    // ── Step4: 预排序（bad优先，同级按分数降序）──
    const gradeOrd={bad:0,poor:1,fair:2,good:3,excellent:4,new:5};
    const sorted=[...tenants].sort((a,b)=>{
      const d=(gradeOrd[a.sc.grade]||5)-(gradeOrd[b.sc.grade]||5);
      return d!==0?d:(b.sc.score||0)-(a.sc.score||0);
    });
    _ccCache={tenants,sorted,built:Date.now()};
  }finally{
    window.rc_allLedgerSessions=_orig; // 无论成功/失败都还原
  }
}

function ccRender(forceRebuild=false){
  const hasLock=roomsData&&Object.keys(roomsData).length>0;
  // ── 只在完整刷新时重渲染 widget（搜索/筛选不触发）──
  if(forceRebuild||!_ccCache){
    renderBillingWidget('billingWidget2');
    renderClientContinuityPanel();
    if(_clientContinuityOpen)rc_initPanel();
    if(!hasLock){
      const el=document.getElementById('ccCards');
      if(el)el.innerHTML=`<div style="text-align:center;padding:32px 16px;color:var(--text3);font-size:13px;border:1px dashed var(--border);border-radius:12px">请先点击「刷新」，或前往控制面板加载通通锁，系统将自动评分所有在住租客</div>`;
      return;
    }
    // ── Bug1 Fix: ccBuildCache 抛异常时 _ccCache 仍为 null 会崩溃，加兜底 ──
    try{ccBuildCache();}catch(e){
      console.error('[ccBuildCache]',e);
      _ccCache={tenants:[],sorted:[],built:0};
    }
  }else if(!hasLock){
    const el=document.getElementById('ccCards');
    if(el)el.innerHTML=`<div style="text-align:center;padding:32px 16px;color:var(--text3);font-size:13px;border:1px dashed var(--border);border-radius:12px">请先点击「刷新」加载通通锁</div>`;
    return;
  }
  const{tenants,sorted:allSorted}=_ccCache; // 直接用预排序结果
  // 汇总统计
  const cnt={excellent:0,good:0,fair:0,poor:0,bad:0,new:0};
  tenants.forEach(t=>cnt[t.sc.grade]=(cnt[t.sc.grade]||0)+1);
  const sum=document.getElementById('ccSummary');
  if(sum){
    const chips=[
      {k:'全部',v:tenants.length,col:'var(--text2)'},
      {k:'🌟优质+良好',v:(cnt.excellent||0)+(cnt.good||0),col:'var(--green)'},
      {k:'⚠留意',v:cnt.fair||0,col:'var(--hl-yellow)'},
      {k:'🔶问题',v:cnt.poor||0,col:'var(--orange)'},
      {k:'🚨高风险',v:cnt.bad||0,col:'var(--red)'},
      {k:'🆕新客户',v:cnt.new||0,col:'var(--text3)'},
    ];
    sum.innerHTML=chips.map(c=>`<div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 12px;display:flex;align-items:center;gap:6px"><span style="font-size:19px;font-weight:800;color:${c.col};font-family:JetBrains Mono,monospace;line-height:1">${c.v}</span><span style="font-size:10px;color:var(--text3)">${c.k}</span></div>`).join('');
  }
  // 搜索+筛选（纯内存，不重新评分也不重排）
  const search=(document.getElementById('ccSearch')?.value||'').toLowerCase();
  const filter=document.getElementById('ccFilter')?.value||'all';
  let list=allSorted;
  if(search)list=list.filter(t=>t.bed.toLowerCase().includes(search)||t.cardName.toLowerCase().includes(search)||t.lockRoom.toLowerCase().includes(search));
  if(filter!=='all')list=list.filter(t=>t.sc.grade===filter);
  const cards=document.getElementById('ccCards');if(!cards)return;
  if(!tenants.length){cards.innerHTML=`<div style="text-align:center;padding:32px;color:var(--text3);font-size:13px;border:1px dashed var(--border);border-radius:12px">通通锁暂无在住卡片</div>`;return;}
  if(!list.length){cards.innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">没有匹配的租客</div>';return;}
  cards.innerHTML=list.map(t=>ccAutoCardHtml(t)).join('');
}
function ccAutoCardHtml(c){
  const g=CC_GRADES[c.sc.grade]||CC_GRADES.new;
  const sc=c.sc;
  // 色块阈值与分级阈值对齐（≤1/≤4/≤12/>12）
  const dots=sc.cycleDetails.slice(-10).map(d=>{
    const col=d.total<=1?'#1a8a4a':d.total<=4?'#c8b800':d.total<=12?'#e06c00':'#d93025';
    const tip=`${d.cycleAnchored?`延迟${d.daysLate}天`:'未锚定'}${d.paymentCount>1?' 分'+d.paymentCount+'次':''}  得分:${d.total}`;
    return `<span title="${esc(tip)}" style="display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;border-radius:3px;background:${col};font-size:7px;color:#fff;flex-shrink:0">${d.paymentCount>1?'▸':''}</span>`;
  }).join('');
  const stats=[
    sc.avgDaysLate>0?`均延 ${sc.avgDaysLate}天`:'',
    sc.totalFrag>0?`到期后分批 ${sc.totalFrag}次`:'',
    sc.streak>=3?`连续${sc.streak}月`:'',
  ].filter(Boolean).join('  ·  ');
  const scoreTag=sc.score>0
    ?`<span style="font-size:11px;font-weight:800;color:${g.color};font-family:JetBrains Mono,monospace;background:${g.bg};border:1px solid ${g.border};border-radius:6px;padding:1px 6px">${sc.score}分</span>`:'';
  // 锚点可靠性提示（多数锚定才隐藏警告）
  const anchorNote=sc.n>0&&sc.anchoredCount===0
    ?`<div style="font-size:9px;color:var(--orange);margin-top:3px">⚠ 无日期锚点，延迟天数无法计算</div>`
    :sc.n>0&&!sc.anchored
    ?`<div style="font-size:9px;color:var(--text3);margin-top:2px">⚠ 部分无锚(${sc.anchoredCount}/${sc.n})，延迟天数仅供参考</div>`
    :sc.n>0?`<div style="font-size:9px;color:var(--text3);margin-top:2px">${sc.n}个周期</div>`:'';
  const tenancyLabel=sc.tenancyStartTs>0
    ?`<span style="font-size:10px;color:var(--text3)">入住 ${rc_fmtShortDate(new Date(sc.tenancyStartTs))}</span>`:'';
  return `<div class="cc-card" style="border-color:${g.border}">
    <div style="padding:11px 14px;display:flex;align-items:flex-start;gap:10px">
      <div style="width:3px;border-radius:2px;background:${g.color};flex-shrink:0;align-self:stretch;min-height:32px"></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
          <span style="font-size:14px;font-weight:800;color:var(--text);font-family:JetBrains Mono,monospace">${esc(c.bed)}</span>
          ${c.lockRoom?`<span style="font-size:10px;color:var(--text3)">门锁 ${esc(c.lockRoom)}</span>`:''}
          <span class="cc-badge" style="background:${g.bg};border:1px solid ${g.border};color:${g.color};font-size:10px">● ${g.label}</span>
          ${scoreTag}
          ${c.endLabel&&c.endLabel!=='—'?`<span style="font-size:10px;color:var(--text3)">到期 ${esc(c.endLabel)}</span>`:''}
          ${tenancyLabel}
        </div>
        ${c.cardName&&c.cardName!==c.bed?`<div style="font-size:11px;color:var(--text2);margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.cardName)}</div>`:''}
        <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap">
          ${dots?`<div style="display:flex;gap:2px;align-items:center">${dots}</div>`:''}
          <span style="font-size:10px;color:var(--text3)">${stats||'暂无记录'}</span>
        </div>
        ${anchorNote}
      </div>
    </div>
  </div>`;
}
function ccCardHtml(c){
  const s=c._s,g=CC_GRADES[s.grade],open=_ccOpen===c.id;
  const dots=s.pmts.map(p=>{
    const late=p.days>CC_GRACE,early=p.days<0;
    const col=early?'#1a8a4a':late?(p.days>14?'#d93025':p.days>7?'#e06c00':'#c8b800'):'#c8d0d8';
    return `<div class="cc-dot" style="background:${col}" title="${esc(p.exp)}→${p.days>0?'+':''}${p.days}天"></div>`;
  }).join('');
  let histHtml='';
  if(open){
    const rows=s.pmts.map((p,i)=>{
      const isLate=p.days>CC_GRACE,isEarly=p.days<0;
      const col=isEarly?'#1a8a4a':isLate?(p.days>14?'#d93025':p.days>7?'#e06c00':'#c8b800'):'var(--text3)';
      const bar=isLate?Math.min(p.days/31*100,100):0;
      const lbl=isEarly?`提前${Math.abs(p.days)}天`:p.days===0?'准时':p.days<=CC_GRACE?`+${p.days}天(容忍)`:`逾期${p.days}天`;
      return `<div class="cc-pay-row${isLate?' late':''}">
        <div style="font-size:9px;color:var(--text3);font-family:JetBrains Mono,monospace;text-align:center">${i+1}</div>
        <div><div style="font-size:11px;color:var(--text3)">应付 <span style="color:var(--text)">${esc(p.exp)}</span></div><div style="font-size:11px;color:var(--text3);margin-top:2px">实付 <span style="color:var(--text)">${esc(p.act)}</span> <span style="font-family:JetBrains Mono,monospace;color:var(--text2)">${fmtAED(p.amount)}</span></div>${p.note?`<div style="font-size:10px;color:var(--text3);margin-top:2px">💬 ${esc(p.note)}</div>`:''}</div>
        <div style="display:flex;align-items:center;gap:6px"><div class="cc-bar-wrap"><div class="cc-bar" style="width:${bar}%;background:${col}"></div></div><span style="font-size:10px;color:${col};white-space:nowrap;min-width:72px;text-align:right">${lbl}</span><button onclick="ccDelPayment(${jsArg(c.id)},${jsArg(p.id)})" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:2px 4px;font-size:15px;line-height:1;flex-shrink:0" title="删除">×</button></div>
      </div>`;
    }).join('');
    const verdictMap={excellent:'历史记录极佳，优先续签',good:'偶有小延迟，总体可靠',fair:'存在逾期习惯，建议提前催款',poor:'多次逾期，建议要求增加押金',bad:'高风险，强烈建议不予续签'};
    const verdict=s.grade!=='new'?`<div style="margin-top:10px;padding:9px 12px;border-radius:8px;background:${g.bg};border:1px solid ${g.border};display:flex;align-items:center;gap:8px"><span class="cc-badge" style="background:${g.bg};border:1px solid ${g.border};color:${g.color}">● ${g.label}</span><span style="font-size:11px;color:var(--text2)">${verdictMap[s.grade]||''}</span></div>`:'';
    histHtml=`<div class="cc-body"><div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center"><span>收款时间轴 · 容忍≤${CC_GRACE}天</span><button class="btn btn-ghost" style="font-size:10px;padding:3px 9px" onclick="ccShowAddPayment(${jsArg(c.id)})">＋ 录入收款</button></div>${rows||'<div style="text-align:center;padding:12px;color:var(--text3);font-size:12px">暂无记录，点右上角录入</div>'}${verdict}</div>`;
  }
  return `<div class="cc-card" style="border-color:${open?g.border:'var(--border)'}">
    <div class="cc-card-head" onclick="ccToggle(${jsArg(c.id)})">
      <div style="width:3px;border-radius:2px;background:${g.color};flex-shrink:0;align-self:stretch;min-height:36px"></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
          <span style="font-size:15px;font-weight:700;color:var(--text)">${esc(c.name)}</span>
          <span style="font-size:12px;color:var(--text3)">${esc(c.room)}室</span>
          <span class="cc-badge" style="background:${g.bg};border:1px solid ${g.border};color:${g.color}">● ${g.label}</span>
          ${s.streak>=3?`<span style="font-size:9px;color:var(--green);background:rgba(26,138,74,0.08);border:1px solid rgba(26,138,74,0.2);border-radius:99px;padding:1px 6px">🔥连续${s.streak}次准时</span>`:''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
          <div style="display:flex;gap:3px">${dots}</div>
          <span style="font-size:10px;color:var(--text3)">${s.pmts.length}次记录${s.lateCount>0?` · 逾期${s.lateCount}次(${Math.round(s.lateRate*100)}%) · 均${s.avgDays}天 · 最长${s.maxDays}天`:s.pmts.length>=2?' · 从未逾期 ✓':''}</span>
        </div>
      </div>
      <div style="display:flex;gap:5px;align-items:center">
        <button onclick="event.stopPropagation();ccDelCustomer(${jsArg(c.id)})" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:4px;font-size:16px;line-height:1" title="删除客户">×</button>
        <svg style="width:14px;height:14px;color:var(--text3);transform:${open?'rotate(180deg)':'none'};transition:transform 0.2s;flex-shrink:0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
      </div>
    </div>
    ${histHtml}
  </div>`;
}
function ccDelCustomer(id){
  if(!confirm('确认删除此客户及全部收款记录？'))return;
  state.customers=state.customers.filter(c=>c.id!==id);
  ccSave();if(_ccOpen===id)_ccOpen=null;ccRender();toast('客户已删除');
}
function ccDelPayment(custId,payId){
  const c=state.customers.find(x=>x.id===custId);if(!c)return;
  c.payments=c.payments.filter(p=>p.id!==payId);
  ccSave();ccRender();toast('记录已删除');
}
function ccShowAddCustomer(){
  const ov=document.createElement('div');
  ov.className='cc-modal';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
  ov.innerHTML=`<div style="background:var(--surface);border-radius:16px;padding:24px;width:100%;max-width:360px;box-shadow:0 8px 40px rgba(0,0,0,.2)">
    <div style="font-weight:700;font-size:15px;margin-bottom:16px">👤 添加客户档案</div>
    <div class="field" style="margin-bottom:12px"><label>客户姓名 *</label><input id="_ccN" class="inp" placeholder="如：张三"></div>
    <div class="field" style="margin-bottom:16px"><label>房间号 *</label><input id="_ccR" class="inp" placeholder="如：302"></div>
    <div id="_ccErr" style="display:none;color:var(--red);font-size:12px;margin-bottom:10px"></div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-ghost" style="flex:1" onclick="document.querySelector('.cc-modal')?.remove()">取消</button>
      <button class="btn btn-primary" style="flex:1" onclick="ccSubmitCustomer()">创建档案</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#_ccN').focus();
  ov.addEventListener('keydown',e=>{if(e.key==='Escape')ov.remove();if(e.key==='Enter')ccSubmitCustomer();});
}
function ccSubmitCustomer(){
  const name=(document.getElementById('_ccN')?.value||'').trim();
  const room=(document.getElementById('_ccR')?.value||'').trim();
  const err=document.getElementById('_ccErr');
  if(!name||!room){if(err){err.style.display='block';err.textContent='姓名和房间号均为必填';}return;}
  state.customers.push({id:newId(),name,room,payments:[]});
  ccSave();document.querySelector('.cc-modal')?.remove();ccRender();toast('客户档案已创建');
}
function ccShowAddPayment(custId){
  const cust=state.customers.find(c=>c.id===custId);if(!cust)return;
  const today=fmtD(new Date());
  const ov=document.createElement('div');
  ov.className='cc-modal';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px';
  ov.innerHTML=`<div style="background:var(--surface);border-radius:16px;padding:24px;width:100%;max-width:400px;box-shadow:0 8px 40px rgba(0,0,0,.2)">
    <div style="font-weight:700;font-size:15px;margin-bottom:4px">📋 录入收款记录</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:16px">${esc(cust.name)} · ${esc(cust.room)}室</div>
    <div class="field" style="margin-bottom:12px"><label>应付日期（合同约定）*</label><input id="_ccPExp" class="inp" type="date" style="color-scheme:light" oninput="ccPreviewDays()"></div>
    <div class="field" style="margin-bottom:12px"><label>实际到账日期 *</label><input id="_ccPAct" class="inp" type="date" value="${today}" style="color-scheme:light" oninput="ccPreviewDays()"></div>
    <div id="_ccPrev" style="margin-bottom:12px"></div>
    <div class="field" style="margin-bottom:12px"><label>收款金额 (AED) *</label><input id="_ccPAmt" class="inp mono" placeholder="如：3500" inputmode="decimal"></div>
    <div class="field" style="margin-bottom:16px"><label>备注（选填）</label><input id="_ccPNote" class="inp" placeholder="如：催了3次"></div>
    <div id="_ccPErr" style="display:none;color:var(--red);font-size:12px;margin-bottom:10px"></div>
    <div style="display:flex;gap:10px">
      <button class="btn btn-ghost" style="flex:1" onclick="document.querySelector('.cc-modal')?.remove()">取消</button>
      <button class="btn btn-primary" style="flex:1" onclick="ccSubmitPayment(${jsArg(custId)})">确认录入</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.querySelector('#_ccPExp').focus();
  ov.addEventListener('keydown',e=>{if(e.key==='Escape')ov.remove();});
}
function ccPreviewDays(){
  const exp=document.getElementById('_ccPExp')?.value;
  const act=document.getElementById('_ccPAct')?.value;
  const pre=document.getElementById('_ccPrev');
  if(!pre||!exp||!act){if(pre)pre.innerHTML='';return;}
  const days=Math.round((new Date(act)-new Date(exp))/86400000);
  const late=days>CC_GRACE,early=days<0;
  const col=early?'var(--green)':late?(days>14?'var(--red)':days>7?'var(--orange)':'var(--hl-yellow)'):'var(--text2)';
  const lbl=early?`提前 ${Math.abs(days)} 天`:days===0?'准时':days<=CC_GRACE?`延迟 ${days} 天（容忍范围内）`:`逾期 ${days} 天`;
  const bar=late?Math.min(days/31*100,100):0;
  pre.innerHTML=`<div style="padding:9px 12px;border-radius:8px;background:${late?'rgba(217,48,37,0.05)':'rgba(26,138,74,0.05)'};border:1px solid ${late?'rgba(217,48,37,0.2)':'rgba(26,138,74,0.2)'};display:flex;align-items:center;gap:10px"><div style="flex:1;height:5px;background:var(--surface3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${bar}%;background:${col};border-radius:3px;min-width:${bar>0?4:0}px"></div></div><span style="font-size:12px;color:${col};font-weight:600;white-space:nowrap">${lbl}</span></div>`;
}
function ccSubmitPayment(custId){
  const exp=(document.getElementById('_ccPExp')?.value||'').trim();
  const act=(document.getElementById('_ccPAct')?.value||'').trim();
  const amt=parseMoney(document.getElementById('_ccPAmt')?.value||'');
  const note=(document.getElementById('_ccPNote')?.value||'').trim();
  const err=document.getElementById('_ccPErr');
  if(!exp||!act||amt<=0){if(err){err.style.display='block';err.textContent='应付日期、实付日期和金额均为必填';}return;}
  const cust=state.customers.find(c=>c.id===custId);if(!cust)return;
  cust.payments.push({id:newId(),exp,act,amount:amt,note});
  cust.payments.sort((a,b)=>a.exp.localeCompare(b.exp));
  ccSave();document.querySelector('.cc-modal')?.remove();ccRender();toast('收款记录已录入');
}

/* ── VIEW SWITCH ── */
function switchImportTab(tab){
  ['paste','file','hist'].forEach(t=>{
    document.getElementById('i'+t).classList.toggle('hidden',t!==tab);
    document.getElementById('itab'+t.charAt(0).toUpperCase()+t.slice(1)).classList.toggle('active',t===tab);
  });
  if(tab==='hist') updateHistCount();
}
function switchView(v){
  if(isOwnerShellRole()&&v==='entry'){
    toast('老板端录入入口已移至员工端，请使用员工业务页提交流水。','info');
    v='overview';
  }
  if(role==='staff'&&(v==='overview'||v==='history'||v==='analysis'||v==='clients'||v==='wifi')){toast('员工账户无此权限','err');return;}
  state.view=v;
  document.querySelectorAll('#navTabs .nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===v));
  ['entry','overview','history','analysis','clients','wifi'].forEach(n=>{document.getElementById('view-'+n)?.classList.toggle('hidden',n!==v);});
  if(v==='entry'){renderEntryView();refreshArrearsFromCloud();}
  if(v==='overview'){renderOwnerOverview();updateHistCount();}
  if(v==='history')renderHistory();
  if(v==='analysis'){const bw=document.getElementById('billingWidget');if(bw)bw.innerHTML='';renderFilterControls();renderAnalysis();updateHistCount();}
  if(v==='clients'){ccRender();}
  if(v==='wifi'){wmRenderPage();}
}

/* ── EVENTS ── */
function bindEvents(){
  const empCode=document.getElementById('empCode');
  if(empCode){
    empCode.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submitCode();}});
    const loginBtn=empCode.closest('.code-input-wrap')?.querySelector('button.btn-primary');
    if(loginBtn)loginBtn.addEventListener('click',e=>{e.preventDefault();submitCode();});
  }
  const dashboardBtn=document.getElementById('btnDashboard');
  if(dashboardBtn)dashboardBtn.addEventListener('click',e=>{e.preventDefault();openPanel();});
  const ownerEntryTool=document.getElementById('ownerEntryTool');
  if(ownerEntryTool){
    ownerEntryTool.hidden=true;
    ownerEntryTool.setAttribute('aria-hidden','true');
    ownerEntryTool.addEventListener('click',e=>{e.preventDefault();toast('请使用员工业务页 employee-v3.html 录入流水。','info');});
  }
  document.querySelector('.topbar-right .btn-ghost')?.addEventListener('click',e=>{e.preventDefault();logout();});
  document.getElementById('navTabs').addEventListener('click',e=>{const b=e.target.closest('.nav-btn');if(b)switchView(b.dataset.view);});
  document.getElementById('catTabs').addEventListener('click',e=>{const b=e.target.closest('.cat-tab');if(b){state.activeCat=b.dataset.cat;state.formPayType=null;state.formTag='Old';document.querySelectorAll('#entryForm .tag-btn').forEach(x=>x.classList.toggle('active',x.dataset.tag==='Old'));renderCatTabs();}});
  // Tag buttons + Price buttons (delegated from entryForm)
  document.getElementById('entryForm').addEventListener('click',e=>{
    const tb=e.target.closest('.tag-btn');
    if(tb){
      state._linkedArrearId=null;  // 切换标签清除关联
      const prevTag=state.formTag;
      state.formTag=tb.dataset.tag;
      state.formPayType=null;
      // 从换床位切走：清除预填的50 AED，恢复原标签
      if(prevTag==='Transfer' && state.formTag!=='Transfer'){
        const fDueEl=document.getElementById('fDue');
        if(fDueEl){
          if(fDueEl.value==='50') fDueEl.value='';
          const lbl=fDueEl.closest('.field')?.querySelector('label');
          if(lbl) lbl.innerHTML='应收金额 AED<span class="en-sub">AMOUNT DUE</span>';
        }
        const fPaidEl=document.getElementById('fPaid');
        if(fPaidEl){
          if(fPaidEl.value==='50') fPaidEl.value='';
          const lbl=fPaidEl.closest('.field')?.querySelector('label');
          if(lbl) lbl.innerHTML='实收金额 AED<span class="en-sub">AMOUNT PAID</span>';
        }
        const fNote=document.getElementById('fNote');
        if(fNote) fNote.placeholder='可留空';
        const dd=document.getElementById('deficitDisplay');if(dd)dd.style.display='none';
        const ddw=document.getElementById('dueDateWrap');if(ddw)ddw.style.display='none';
        const fDD=document.getElementById('fDueDate');if(fDD)fDD.value='';
      }
      document.querySelectorAll('#entryForm .tag-btn').forEach(x=>x.classList.toggle('active',x.dataset.tag===state.formTag));
      renderCatTabs();
      return;
    }
    const pb=e.target.closest('.price-btn');
    if(pb){
      const pv=pb.dataset.price;
      state.formPrice=pv==='custom'?'custom':parseFloat(pv);
      state.formPayType=null;
      document.querySelectorAll('.price-btn').forEach(x=>x.classList.toggle('sel',x.dataset.price===pv));
      // Let renderPriceGrid handle show/hide logic for all cases (including Transfer waiver)
      renderPriceGrid();
      return;
    }
  });
  // Live update installment remain on amount or standard price change
  document.addEventListener('input',e=>{
    if(e.target.id==='fAmount'||e.target.id==='fInstStandard') updateInstallRemain();
  });
  document.getElementById('fRoom').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addEntry();}});
  document.getElementById('btnAdd').onclick=addEntry;
  document.getElementById('btnExport').onclick=exportSession;
  document.getElementById('btnNewSession').onclick=newSession;
  document.getElementById('btnPreview').onclick=showPreview;
  document.getElementById('ledgerList').addEventListener('click',e=>{
    const a=e.target.closest('[data-action]');if(!a)return;
    const row=a.closest('[data-id]');if(!row)return;const id=row.dataset.id;
    if(a.dataset.action==='del')delEntry(id);
  });
  document.getElementById('filterTabs').addEventListener('click',e=>{const b=e.target.closest('.ftab');if(!b)return;state.dateMode=b.dataset.mode;document.querySelectorAll('#filterTabs .ftab').forEach(x=>x.classList.toggle('active',x.dataset.mode===state.dateMode));renderFilterControls();renderAnalysis();});
  document.getElementById('btnPaste').onclick=onPaste;
  document.getElementById('btnFromHistory').onclick=fromHistory;
  document.getElementById('dropzone').onclick=()=>document.getElementById('fileInput').click();
  document.getElementById('fileInput').onchange=e=>{onFiles(Array.from(e.target.files||[]));e.target.value='';};
  ['dragover','dragenter'].forEach(ev=>document.getElementById('dropzone').addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();}));
  document.getElementById('dropzone').addEventListener('drop',e=>{e.preventDefault();const f=Array.from(e.dataTransfer.files||[]).filter(f=>/\.txt$|text\/plain/i.test(f.name+f.type));if(f.length)onFiles(f);});

}

/* ── CSP inline event migration ── */
const INLINE_EVENT_TYPES=['click','input','change','keydown'];
const INLINE_ACTIONS=new Set([
  'submitCode','openPanel','logout','showSettings','switchImportTab','calcDeficit','calcDepDeficit','ccRender','ccShowAddCustomer',
  'updateInstallRemain','enterDepositForArrear','enterPaymentForArrear','dismissArrear','rc_removeRoom','rc_applyApt','rc_bulkFill',
  'rc_setAll','rc_addRoom','rc_saveCfgFromUI','rc_toggleCfg','rc_loadLock','rc_check','rc_updateTypeUI','rc_closeResolveModal',
  'rc_submitResolution','rc_selectApt','rc_applySelected','rc_selectEmpty','rc_clearSelection','rc_toggleCfgGroup','wmSetFilter',
  'wmLoadLock','wmSyncFromContinuity','wmCopyAll','wmCopyOne','wmCreateOne','rc_openResolveModal','rc_clearResolution',
  'toggleAnaPanel','showRenewalDetails','toggleClientContinuity','anaToggle','ccDelPayment','ccShowAddPayment','ccToggle',
  'ccDelCustomer','ccSubmitCustomer','ccPreviewDays','ccSubmitPayment','closePanel','cp_toggleStaff','cp_loadAll','cp_exportTxt',
  'cp_openModal','cp_setFilter','cp_closeModal','cp_copyModal','cp_exportModal','cp_applyFilter','cp_toggleRoom'
  ,'toggleHistSelection','clearHistSelection'
]);
function parseInlineArgs(src, el, event){
  const out=[];let cur='',q='',escNext=false;
  const push=()=>{
    const v=cur.trim();cur='';
    if(!v)return;
    if(v==='event')out.push(event);
    else if(v==='this')out.push(el);
    else if(/^[-+]?\d+(\.\d+)?$/.test(v))out.push(Number(v));
    else out.push(v.replace(/^['"]|['"]$/g,''));
  };
  for(const ch of String(src||'')){
    if(escNext){cur+=ch;escNext=false;continue;}
    if(ch==='\\'){escNext=true;continue;}
    if(q){if(ch===q)q='';else cur+=ch;continue;}
    if(ch==="'"||ch==='"'){q=ch;continue;}
    if(ch===','){push();continue;}
    cur+=ch;
  }
  push();
  return out;
}
function runInlineFunction(expr, el, event){
  const m=String(expr||'').trim().match(/^([A-Za-z_$][\w$]*)\(([\s\S]*)\)$/);
  if(!m||!INLINE_ACTIONS.has(m[1]))return false;
  const fn=window[m[1]];
  if(typeof fn!=='function')return false;
  fn(...parseInlineArgs(m[2],el,event));
  return true;
}
function runMigratedInline(expr, el, event){
  const s=String(expr||'').trim();
  if(!s)return;
  if(s==="if(event.key==='Enter')submitCode()"){if(event.key==='Enter')submitCode();return;}
  if(s==='event.stopPropagation()'){event.stopPropagation();return;}
  if(s.startsWith('event.stopPropagation();')){event.stopPropagation();return runMigratedInline(s.slice(24),el,event);}
  if(s.startsWith('event.preventDefault();')){event.preventDefault();return runMigratedInline(s.slice(23),el,event);}
  if(s==="document.querySelector('.cc-modal')?.remove()"){document.querySelector('.cc-modal')?.remove();return;}
  if(s==="document.querySelectorAll('.hist-chk').forEach(c=>c.checked=true)"){document.querySelectorAll('.hist-chk').forEach(c=>c.checked=true);return;}
  if(s==="document.querySelectorAll('.hist-chk').forEach(c=>c.checked=false)"){document.querySelectorAll('.hist-chk').forEach(c=>c.checked=false);return;}
  if(s.includes("data-fold")&&s.includes('nextElementSibling')){
    const b=el.nextElementSibling;if(!b)return;
    b.style.display=b.style.display==='none'?'block':'none';
    const f=el.querySelector('[data-fold]');if(f)f.textContent=b.style.display==='none'?'展开':'收起';
    return;
  }
  if(s==="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'"){
    const b=el.nextElementSibling;if(b)b.style.display=b.style.display==='none'?'block':'none';
    return;
  }
  runInlineFunction(s,el,event);
}
function hydrateInlineHandlers(root=document){
  const nodes=[];
  const collect=node=>{
    if(!node||node.nodeType!==1)return;
    nodes.push(node);
    node.querySelectorAll?.(INLINE_EVENT_TYPES.map(t=>`[data-inline-on${t}],[on${t}]`).join(',')).forEach(n=>nodes.push(n));
  };
  collect(root);
  nodes.forEach(el=>{
    INLINE_EVENT_TYPES.forEach(type=>{
      const dataName=`data-inline-on${type}`,attrName=`on${type}`;
      const expr=el.getAttribute(dataName)||el.getAttribute(attrName);
      if(!expr||el.dataset[`boundInline${type}`])return;
      el.dataset[`boundInline${type}`]='1';
      el.removeAttribute(attrName);
      el.addEventListener(type,event=>runMigratedInline(expr,el,event));
    });
  });
}
new MutationObserver(list=>list.forEach(m=>m.addedNodes.forEach(n=>hydrateInlineHandlers(n)))).observe(document.documentElement,{childList:true,subtree:true});

/* ── INIT ── */
function init(){bindEvents();hydrateInlineHandlers(document);resumeUnifiedOwnerSession();}
init();
