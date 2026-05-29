
/* ══════════════════════════════════════════
   CORE — 原版逻辑完全保留
══════════════════════════════════════════ */
let token='', roomsData={}, staffVisible=false, currentFilter='all';

/* 新增：各状态租客列表，供弹窗使用 */
let overdueList=[], todayList=[], soonList=[];

function cp_getBedNumber(n){const m=(n||'').match(/^(\d+)/);return m?parseInt(m[1]):999999;}
function cp_isVacant(n){
  const s=(n||'').trim();
  if(!s)return false;
  return /(?:^|\s)e(?:\s|$)/.test(s)||/^\d+\s+empty$/i.test(s)||/^empty$/i.test(s);
}
function cp_isStaff(n){return n&&/(阿布都|阿布杜|阿卜杜|abdul|abdu|bilal|bilali|bilaili|比拉尔|比拉力)/i.test(n);}

function cp_getStatus(card){
  const name=card.cardName||'';
  if(cp_isStaff(name))  return{type:'staff', label:'员工',      cls:'tr-staff'};
  if(cp_isVacant(name)) return{type:'vacant',label:'空置',      cls:'tr-vacant'};
  const now=Date.now(), end=Number(card.endDate||0);
  if(!Number.isFinite(end)||end<=0) return{type:'active',label:'永久',cls:'tr-active'};
  if(now>end){
    const nd=new Date(new Date().toDateString()).getTime();
    const ed=new Date(new Date(end).toDateString()).getTime();
    const days=Math.round((nd-ed)/86400000);
    return{type:'overdue',label:'已过期'+(days>0?days+'天':'')+(days>=2?' 🔥':''),cls:'tr-overdue'};
  }
  const today=new Date(new Date().toDateString()).getTime();
  const ed=new Date(new Date(end).toDateString()).getTime();
  const rem=Math.round((ed-today)/86400000);
  if(rem===0) return{type:'today', label:'今天到期',      cls:'tr-today'};
  if(rem<=3)  return{type:'soon',  label:'剩'+rem+'天',   cls:'tr-soon'};
  return             {type:'active',label:'剩'+rem+'天',   cls:'tr-active'};
}
function cp_fmtEndDate(ts){
  const n=Number(ts||0);
  if(!Number.isFinite(n)||n<=0)return '永久';
  const d=new Date(n);
  return Number.isNaN(d.getTime())?'永久':d.toLocaleDateString('zh-CN');
}

async function cp_loadAll(){
  document.getElementById('roomList').innerHTML='<div class="state-box"><div class="state-icon">⏳</div>正在连接通通锁...</div>';
  document.getElementById('alertStrip').innerHTML='';
  document.getElementById('chartSection').style.display='none';
  try{
    const lr=await apiFetch('/api/lock/cards',{method:'GET'});
    const ld=await lr.json();
    if(lr.status===401){showAuthExpired();return;}
    if(!lr.ok){document.getElementById('roomList').innerHTML=`<div class="state-box"><div class="state-icon">❌</div>通通锁加载失败：${esc(ld.error||lr.status)}</div>`;return;}
    roomsData=ld.roomsData||{};

    cp_computeMetrics();
    cp_buildChart();
    cp_render();
    _ccCache=null; // 通通锁数据更新，使客户评分缓存失效
    document.getElementById('lastUpdate').textContent='最后更新 · '+new Date().toLocaleTimeString('zh-CN');
  }catch(e){
    console.error(e);
    document.getElementById('roomList').innerHTML=`<div class="state-box"><div class="state-icon">❌</div>加载失败：${esc(e.message)}</div>`;
  }
}

/* ── cp_computeMetrics（新增列表收集）── */
function cp_computeMetrics(){
  let t=0,o=0,v=0,over=0,today=0,soon=0;
  overdueList=[]; todayList=[]; soonList=[];

  for(const[room,cards] of Object.entries(roomsData)){
    for(const c of cards){
      const info=cp_getStatus(c);
      if(info.type==='staff')continue;
      t++;
      if(info.type==='vacant'){v++;continue;}
      o++;
      if(info.type==='overdue'){over++;overdueList.push({room,card:c,info});}
      else if(info.type==='today'){today++;todayList.push({room,card:c,info});}
      else if(info.type==='soon'){soon++;soonList.push({room,card:c,info});}
    }
  }
  document.getElementById('mOverdue').textContent=over;
  document.getElementById('mToday').textContent=today;
  document.getElementById('mSoon').textContent=soon;
  document.getElementById('mTotal').textContent=t;
  document.getElementById('mOccupied').textContent=o;
  document.getElementById('mVacant').textContent=v;
  document.getElementById('mRate').textContent=t>0?(o/t*100).toFixed(1)+'%':'0%';

  const strip=document.getElementById('alertStrip');
  strip.innerHTML='';
  if(over>0)strip.innerHTML+=`<div class="alert-item alert-red" onclick="cp_openModal('overdue')"><div class="ai-left"><span class="ai-icon">🚨</span><div><div class="ai-text">${over} 间已过期未续</div><div class="ai-sub">点击查看人员明细</div></div></div><span class="ai-count">${over}</span></div>`;
  if(today>0)strip.innerHTML+=`<div class="alert-item alert-orange" onclick="cp_openModal('today')"><div class="ai-left"><span class="ai-icon">⚠️</span><div><div class="ai-text">${today} 间今天到期</div><div class="ai-sub">点击查看人员明细</div></div></div><span class="ai-count">${today}</span></div>`;
}

/* ════════════════════════════════════
   MODAL — 二级明细弹窗
════════════════════════════════════ */
let currentModalType='';

function cp_modalStatusLabel(info){
  const type=String(info?.type||'');
  if(type==='overdue')return '已逾期';
  if(type==='today')return '今日到期';
  if(type==='soon')return '3天内到期';
  if(type==='active')return '正常';
  if(type==='vacant')return '空置';
  if(type==='staff')return '员工';
  return info?.label||'-';
}
function cp_modalOverdueDays(card){
  const end=Number(card?.endDate||0);
  if(!end)return '-';
  const diff=Math.floor((Date.now()-end)/86400000);
  return diff>0?`${diff} 天`:'未逾期';
}
function cp_modalAmount(card){
  const raw=card?.amount??card?.rent??card?.remain??card?.arrears??card?.totalRent??'';
  const num=Number(raw);
  if(Number.isFinite(num)&&raw!=='')return `AED ${num.toFixed(2)}`;
  return '金额未接入';
}
function cp_overdueDayNumber(card){
  const end=Number(card?.endDate||0);
  if(!end)return 0;
  return Math.max(0,Math.floor((Date.now()-end)/86400000));
}
function cp_overdueText(card){
  const days=cp_overdueDayNumber(card);
  return days>0?`${days} 天`:'未逾期';
}
function cp_generatedAt(){
  const d=new Date();
  const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function cp_reportSuggestion(card,info){
  const days=cp_overdueDayNumber(card);
  if(days>=15)return '重点催收';
  if(days>0)return '提醒续费';
  if(info?.type==='today')return '今日跟进';
  if(info?.type==='soon')return '提前提醒';
  return '核对状态';
}
function cp_buildArrearsReport(title,list,scopeLabel='当前筛选'){
  const aging={d1_7:0,d8_14:0,d15plus:0};
  let longest=0;
  list.forEach(({card})=>{
    const days=cp_overdueDayNumber(card);
    longest=Math.max(longest,days);
    if(days>=15)aging.d15plus++;
    else if(days>=8)aging.d8_14++;
    else if(days>=1)aging.d1_7++;
  });
  const lines=[
    `青旅｜${title}`,
    `生成时间：${cp_generatedAt()}`,
    `统计范围：${scopeLabel}`,
    `总计：${list.length} 人`,
    `最久逾期：${longest} 天`,
    `需优先跟进：逾期超过 14 天共 ${aging.d15plus} 人`,
    '',
    '一、逾期汇总',
    `- 逾期 1-7 天：${aging.d1_7} 人`,
    `- 逾期 8-14 天：${aging.d8_14} 人`,
    `- 逾期 15 天以上：${aging.d15plus} 人`,
    '',
    '二、明细'
  ];
  list.forEach(({room,card,info},idx)=>{
    lines.push(`${idx+1}. 房间/床位：${room||'-'}`);
    lines.push(`   租客/卡片：${card.cardName||'未命名卡片'}`);
    lines.push(`   截止日期：${cp_fmtEndDate(card.endDate)}`);
    lines.push(`   逾期天数：${cp_overdueText(card)}`);
    lines.push(`   金额：${cp_modalAmount(card)}`);
    lines.push(`   状态：${cp_modalStatusLabel(info)}`);
    lines.push(`   建议动作：${cp_reportSuggestion(card,info)}`);
  });
  lines.push('');
  lines.push('三、备注');
  lines.push('- 本清单仅用于内部跟进。');
  lines.push('- 金额字段如显示“金额未接入”，需以财务流水为准。');
  return lines.join('\n');
}

function cp_openModal(type){
  currentModalType=type;
  const map={
    overdue:{title:'欠款明细',sub:'OVERDUE DETAILS',list:overdueList,cls:'red'},
    today:  {title:'今日到期',sub:'DUE TODAY',      list:todayList,  cls:'orange'},
    soon:   {title:'3天内到期',sub:'DUE SOON',      list:soonList,   cls:'amber'},
  };
  const cfg=map[type]; if(!cfg)return;
  document.getElementById('modalTitle').textContent=cfg.title;
  document.getElementById('modalSub').textContent=cfg.sub+' · '+cfg.list.length+'人';

  const tbody=document.getElementById('modalBody');
  if(cfg.list.length===0){
    tbody.innerHTML='<div class="modal-empty">暂无数据</div>';
  } else {
    tbody.innerHTML=cfg.list.map(({room,card,info})=>{
      const endStr=cp_fmtEndDate(card.endDate);
      const status=cp_modalStatusLabel(info);
      const overdue=cp_overdueText(card);
      const amount=cp_modalAmount(card);
      return `<article class="arrears-compact-row">
        <div class="arrears-compact-main">
          <div class="arrears-compact-id">
            <strong>${esc(room||'-')}</strong>
            <span>${esc(card.cardName||'未命名卡片')}</span>
          </div>
          <span class="status-lbl ${cfg.cls}">${esc(status)}</span>
        </div>
        <div class="arrears-compact-meta">
          <span>截止 ${esc(endStr)}</span>
          <span>${esc(overdue)}</span>
          <span>${esc(amount)}</span>
        </div>
        <details class="arrears-compact-detail">
          <summary>详情</summary>
          <div>建议动作：${esc(cp_reportSuggestion(card,info))}</div>
          <div>卡片 / 租客：${esc(card.cardName||'-')}</div>
        </details>
      </article>`;
    }).join('');
  }
  document.getElementById('modalFooter').textContent=`共 ${cfg.list.length} 条 · 数据更新于 ${document.getElementById('lastUpdate').textContent}`;
  document.getElementById('modalOverlay').classList.add('open');
}

function cp_closeModal(e){
  if(e&&e.target!==document.getElementById('modalOverlay'))return;
  document.getElementById('modalOverlay').classList.remove('open');
}

function cp_buildModalText(){
  const listMap={overdue:overdueList,today:todayList,soon:soonList};
  const nameMap={overdue:'逾期欠款清单',today:'今日到期清单',soon:'3天内到期清单'};
  const list=listMap[currentModalType]||[];
  if(list.length===0)return null;
  return cp_buildArrearsReport(nameMap[currentModalType]||'欠款明细',list,nameMap[currentModalType]||'当前明细');
}

function cp_copyModal(){
  const text=cp_buildModalText();
  if(!text){alert('没有可复制的数据');return;}
  navigator.clipboard.writeText(text)
    .then(()=>alert('✅ 已复制到剪贴板'))
    .catch(()=>alert('复制失败，请手动长按选择'));
}

function cp_exportModal(){
  const text=cp_buildModalText();
  if(!text){alert('没有可导出的数据');return;}
  const nameMap={overdue:'已过期清单',today:'今日到期清单',soon:'3天内到期清单'};
  const date=new Date().toLocaleDateString('zh-CN');
  const filename=`青旅_${nameMap[currentModalType]||'明细'}_${date}.txt`;
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);try{document.body.removeChild(a);}catch{}},200);
}

/* ════════════════════════════════════
   MONTHLY LINE CHART（SVG 原生实现）
════════════════════════════════════ */
function cp_buildChart(){
  const now=new Date();
  const year=now.getFullYear(), month=now.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const monthLabel=(month+1)+'月 '+year;

  /* 统计每天到期人数 */
  const counts=Array(daysInMonth+1).fill(0);
  for(const[,cards] of Object.entries(roomsData)){
    for(const c of cards){
      if(!c.endDate||cp_isStaff(c.cardName)||cp_isVacant(c.cardName))continue;
      const d=new Date(c.endDate);
      if(d.getFullYear()===year&&d.getMonth()===month){
        counts[d.getDate()]++;
      }
    }
  }

  const hasData=counts.slice(1).some(n=>n>0);
  const section=document.getElementById('chartSection');
  const wrap=document.getElementById('chartWrap');
  document.getElementById('chartMonth').textContent=monthLabel;

  if(!hasData){wrap.innerHTML='<div class="chart-empty">本月暂无到期记录</div>';section.style.display='block';return;}

  const W=600,H=180,PL=36,PR=16,PT=16,PB=34;
  const cw=W-PL-PR, ch=H-PT-PB;
  const maxVal=Math.max(...counts.slice(1),1);
  const days=Array.from({length:daysInMonth},(_,i)=>i+1);
  const today=now.getDate();

  const xp=d=>PL+(d-1)/(daysInMonth-1)*cw;
  const yp=v=>PT+ch-(v/maxVal)*ch;

  /* 路径 */
  let pathD='', areaD='';
  days.forEach((d,i)=>{
    const px=xp(d),py=yp(counts[d]||0);
    pathD+=(i===0?'M':'L')+`${px.toFixed(1)},${py.toFixed(1)}`;
  });
  areaD=pathD+`L${xp(daysInMonth).toFixed(1)},${(PT+ch).toFixed(1)} L${xp(1).toFixed(1)},${(PT+ch).toFixed(1)} Z`;

  /* 格线 */
  const gridLines=[0,Math.round(maxVal/2),maxVal];
  const grids=gridLines.map(v=>{
    const y=yp(v);
    return `<line x1="${PL}" y1="${y.toFixed(1)}" x2="${PL+cw}" y2="${y.toFixed(1)}" stroke="#E8E8E4" stroke-width="1"/>
    <text x="${(PL-4).toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="9" fill="#9BA3B0" font-family="monospace">${v}</text>`;
  }).join('');

  /* X轴标签（只标5天间隔）*/
  const xLabels=days.filter(d=>d===1||d%5===0||d===daysInMonth).map(d=>{
    const isToday=d===today;
    const col=isToday?'#1A9E3F':'#9BA3B0';
    return `<text x="${xp(d).toFixed(1)}" y="${(PT+ch+18).toFixed(1)}" text-anchor="middle" font-size="9" fill="${col}" font-family="monospace" font-weight="${isToday?700:400}">${d}</text>`;
  }).join('');

  /* 今日竖线 */
  const todayLine=today>=1&&today<=daysInMonth?
    `<line x1="${xp(today).toFixed(1)}" y1="${PT}" x2="${xp(today).toFixed(1)}" y2="${PT+ch}" stroke="#1A9E3F" stroke-width="1" stroke-dasharray="3,3" opacity="0.5"/>`:
    '';

  /* 数据点（只显示有数据的点）*/
  const dots=days.filter(d=>counts[d]>0).map(d=>{
    const px=xp(d),py=yp(counts[d]);
    const isToday=d===today;
    return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${isToday?5:3.5}" fill="${isToday?'#1A9E3F':'#fff'}" stroke="${isToday?'#fff':'#1A9E3F'}" stroke-width="2"/>
    ${counts[d]>0?`<text x="${px.toFixed(1)}" y="${(py-8).toFixed(1)}" text-anchor="middle" font-size="9" fill="#1A9E3F" font-family="monospace" font-weight="600">${counts[d]}</text>`:''}`;
  }).join('');

  const svg=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="agrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1A9E3F" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#1A9E3F" stop-opacity="0.01"/>
      </linearGradient>
    </defs>
    ${grids}
    ${todayLine}
    <path d="${areaD}" fill="url(#agrad)"/>
    <path d="${pathD}" fill="none" stroke="#1A9E3F" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    ${xLabels}
    <text x="${PL}" y="${(H-2).toFixed(1)}" font-size="9" fill="#9BA3B0" font-family="monospace">DAY</text>
  </svg>`;

  wrap.innerHTML=svg;
  section.style.display='block';
}

/* ── cp_render（排序+自动展开）── */
function cp_render(){
  const container=document.getElementById('roomList');
  container.innerHTML='';
  if(Object.keys(roomsData).length===0){
    container.innerHTML='<div class="state-box"><div class="state-icon">🏠</div>暂无房间数据</div>';return;
  }
  const score={overdue:0,today:1,soon:2,active:3,vacant:4,staff:5};
  // 按公寓编号数字排序：X-YYY 中 X 是公寓号，YYY 是门牌号
  const parseRoomKey = name => {
    const parts = (name||'').split('-');
    return [parseInt(parts[0])||0, parseInt(parts[1])||0];
  };
  const sorted=Object.entries(roomsData).sort(([nameA],[nameB])=>{
    const [bA,rA]=parseRoomKey(nameA);
    const [bB,rB]=parseRoomKey(nameB);
    return bA!==bB ? bA-bB : rA-rB;
  });
  const plainSort=currentFilter==='all'&&!((document.getElementById('searchInput')?.value||'').trim());

  for(const[room,cards] of sorted){
    const counts={};
    const processed=cards.map(c=>{const info=cp_getStatus(c);counts[info.type]=(counts[info.type]||0)+1;return{...c,info};});
    processed.sort((a,b)=>{
      const ba=cp_getBedNumber(a.cardName),bb=cp_getBedNumber(b.cardName);
      if(plainSort&&ba!==bb)return ba-bb;
      const sa=score[a.info.type]??5,sb=score[b.info.type]??5;
      if(sa!==sb)return sa-sb;
      if(ba!==bb)return ba-bb;
      return String(a.cardName||'').localeCompare(String(b.cardName||''),undefined,{numeric:true});
    });

    const hasOver=counts.overdue>0, hasToday=counts.today>0, hasSoon=counts.soon>0;
    const allVacant=!counts.overdue&&!counts.today&&!counts.soon&&!counts.active;

    let cls='room-card',icon='🏠';
    if(hasOver){cls+=' has-overdue';icon='🚨';}
    else if(hasToday){cls+=' has-today';icon='⚠️';}
    else if(hasSoon){cls+=' has-soon';icon='📅';}
    else if(allVacant){cls+=' all-vacant';icon='🔓';}
    else{cls+=' all-ok';icon='✅';}

    const autoOpen=hasOver||hasToday;
    const badges=[
      counts.overdue?`<span class="badge badge-red" onclick="event.stopPropagation();cp_setFilter('overdue')">欠${counts.overdue}</span>`:'',
      counts.today?`<span class="badge badge-orange" onclick="event.stopPropagation();cp_setFilter('today')">今日${counts.today}</span>`:'',
      counts.soon?`<span class="badge badge-amber" onclick="event.stopPropagation();cp_setFilter('soon')">即将${counts.soon}</span>`:'',
      counts.vacant?`<span class="badge badge-gray" onclick="event.stopPropagation();cp_setFilter('vacant')">空${counts.vacant}</span>`:'',
      counts.staff?`<span class="badge badge-purple" onclick="event.stopPropagation();cp_setFilter('staff')">员工${counts.staff}</span>`:'',
      (()=>{const n=(counts.overdue||0)+(counts.today||0)+(counts.soon||0)+(counts.active||0);return n?`<span class="badge badge-green" onclick="event.stopPropagation();cp_setFilter('active')">在住${n}</span>`:'';})(  ),
    ].filter(Boolean).join('');

    const rows=processed.map(c=>{
      const endStr=cp_fmtEndDate(c.endDate);
      return`<tr class="${c.info.cls}" data-status="${c.info.type}"><td data-label="卡片 / 租客">${esc(c.cardName)}</td><td data-label="截止日期">${endStr}</td><td data-label="状态">${esc(c.info.label)}</td></tr>`;
    }).join('');

    const el=document.createElement('div');
    el.className=cls; el.dataset.room=room;
    el.innerHTML=`
      <div class="room-header" onclick="cp_toggleRoom(this)">
        <div class="room-left">
          <div class="room-icon">${icon}</div>
          <div class="room-info"><div class="room-name">${esc(room)}</div><div class="room-meta">${cards.length} CARDS</div></div>
        </div>
        <div class="room-right">
          <div class="status-badges">${badges}</div>
          <span class="chevron${autoOpen?' open':''}">▶</span>
        </div>
      </div>
      <div class="room-body${autoOpen?' open':''}">
        <table><thead><tr><th>卡片信息</th><th>截止日期</th><th>状态</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="empty-row" style="display:none">✅ 无符合筛选条件的卡片</div>
      </div>`;
    container.appendChild(el);
  }
  cp_applyFilter();
}

function cp_toggleRoom(h){const b=h.parentElement.querySelector('.room-body'),c=h.querySelector('.chevron');b.classList.toggle('open');c.classList.toggle('open');}

function cp_setFilter(f){
  currentFilter=f;
  document.querySelectorAll('.pill').forEach(p=>p.classList.toggle('active',p.dataset.filter===f));
  const m={all:'kpiTotal',active:'kpiOccupied',vacant:'kpiVacant'};
  document.querySelectorAll('.kpi').forEach(k=>k.classList.remove('active-kpi'));
  if(m[f])document.getElementById(m[f])?.classList.add('active-kpi');
  cp_applyFilter();
}

function cp_applyFilter(){
  const q=(document.getElementById('searchInput')?.value||'').toLowerCase().trim();
  document.querySelectorAll('.room-card').forEach(card=>{
    const rn=(card.dataset.room||'').toLowerCase();
    const rows=card.querySelectorAll('tbody tr');
    const msg=card.querySelector('.empty-row');
    let has=false;
    rows.forEach(row=>{
      const s=row.getAttribute('data-status');
      const ct=row.querySelector('td')?.textContent.toLowerCase()||'';
      const mf=currentFilter==='all'||(currentFilter==='staff'&&s==='staff')||s===currentFilter;
      const ms=!q||rn.includes(q)||ct.includes(q);
      const show=mf&&ms&&(staffVisible||s!=='staff');
      row.style.display=show?'':'none';
      if(show)has=true;
    });
    if(q&&has){card.querySelector('.room-body')?.classList.add('open');card.querySelector('.chevron')?.classList.add('open');}
    card.style.display=(has||(!q&&currentFilter==='all'))?'':'none';
    if(msg)msg.style.display=has?'none':'block';
  });
}

function cp_toggleStaff(){
  staffVisible=!staffVisible;
  document.getElementById('btnStaff').textContent=staffVisible?'👤 隐藏员工':'👤 员工';
  cp_applyFilter();
}


function cp_exportTxt(){
  const fn={all:'全部',overdue:'已过期',today:'今天到期',soon:'3天内到期',active:'正常',vacant:'空置',staff:'员工'};
  const q=(document.getElementById('searchInput')?.value||'').toLowerCase().trim();
  const exportList=[];
  const parseKey=name=>{const p=(name||'').split('-');return[parseInt(p[0])||0,parseInt(p[1])||0];};
  const sortedRooms=Object.entries(roomsData).sort(([a],[b])=>{
    const[bA,rA]=parseKey(a),[bB,rB]=parseKey(b);return bA!==bB?bA-bB:rA-rB;
  });
  for(const[room,cards] of sortedRooms){
    const filtered=cards.filter(c=>{
      const info=cp_getStatus(c);
      const mf=currentFilter==='all'||(currentFilter==='staff'&&info.type==='staff')||info.type===currentFilter;
      const ms=!q||room.toLowerCase().includes(q)||c.cardName.toLowerCase().includes(q);
      return mf&&ms&&(staffVisible||info.type!=='staff');
    });
    if(!filtered.length)continue;
    const ord={overdue:0,today:1,soon:2,active:3,vacant:4,staff:5};
    filtered.sort((a,b)=>(ord[cp_getStatus(a).type]??4)-(ord[cp_getStatus(b).type]??4));
    filtered.forEach(c=>{
      const info=cp_getStatus(c);
      exportList.push({room,card:c,info});
    });
  }
  if(!exportList.length){alert('没有可导出的数据');return;}
  const text=cp_buildArrearsReport(`${fn[currentFilter]}清单`,exportList,fn[currentFilter]||'当前筛选');
  const blob=new Blob([text],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`青旅_${fn[currentFilter]}清单_${cp_generatedAt().replace(/[/: ]/g,'')}.txt`;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);try{document.body.removeChild(a);}catch{}},200);
}


document.getElementById('filterPills').addEventListener('click',e=>{if(e.target.classList.contains('pill'))cp_setFilter(e.target.dataset.filter);});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.getElementById('modalOverlay').classList.remove('open');});

var _cpReady=false;
function openPanel(){document.getElementById('cp-overlay').style.display='block';if(!_cpReady){_cpReady=true;cp_loadAll();}}
function closePanel(){document.getElementById('cp-overlay').style.display='none';var m=document.getElementById('modalOverlay');if(m)m.classList.remove('open');window.scrollTo({top:0,behavior:'smooth'});}

