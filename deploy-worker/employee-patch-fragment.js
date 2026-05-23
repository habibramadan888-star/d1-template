// EMPLOYEE_API_PATCH_START
const EMP_TX_COLUMNS = [
  "id","corpid","userid","session_id","cat","room","amount","due","paid","deficit","tag","note","room_to",
  "start_date","dep_due","dep_paid","dep_def","due_date","dep_date","pay_type","discount_reason","deposit_collection",
  "period_start","period_end","cycle","reason_code","operator_id","src","tenant_name","created_at"
];
const EMP_TASK_COLUMNS = [
  "task_id","corpid","userid","entry_id","bed","tenant_name","arrear_amount","arrear_reason","created_at",
  "followup_status","promise_date","promise_amount","actual_received","close_status","updated_by","updated_at"
];
const EMP_EVENT_COLUMNS = [
  "event_id","corpid","userid","ref_id","ref_type","event_type","field_name","old_value","new_value","operator_id","ts"
];
async function empTableColumns(env, table){
  const r=await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((r.results||[]).map(x=>x.name));
}
__name(empTableColumns,"empTableColumns");
async function empTableExists(env, table){
  const r=await env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").bind(table).first();
  return !!r;
}
__name(empTableExists,"empTableExists");
async function empAddColumn(env, table, col, ddl){
  const cols=await empTableColumns(env,table);
  if(cols.has(col))return false;
  await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${ddl}`).run();
  return true;
}
__name(empAddColumn,"empAddColumn");
async function empEnsureSchema(env){
  if(await empTableExists(env,"transactions")){
    await empAddColumn(env,"transactions","period_start","TEXT");
    await empAddColumn(env,"transactions","period_end","TEXT");
    await empAddColumn(env,"transactions","cycle","TEXT");
    await empAddColumn(env,"transactions","reason_code","TEXT");
    await empAddColumn(env,"transactions","operator_id","TEXT");
    await empAddColumn(env,"transactions","src","TEXT DEFAULT 'EMP'");
    await empAddColumn(env,"transactions","tenant_name","TEXT");
  }
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS arrear_tasks (
    task_id TEXT PRIMARY KEY,
    corpid TEXT,
    userid TEXT,
    entry_id TEXT,
    bed TEXT,
    tenant_name TEXT,
    arrear_amount REAL,
    arrear_reason TEXT,
    created_at TEXT,
    followup_status TEXT DEFAULT '待跟进',
    promise_date TEXT,
    promise_amount REAL,
    actual_received REAL DEFAULT 0,
    close_status TEXT,
    updated_by TEXT,
    updated_at TEXT
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS entry_events (
    event_id TEXT PRIMARY KEY,
    corpid TEXT,
    userid TEXT,
    ref_id TEXT,
    ref_type TEXT,
    event_type TEXT,
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,
    operator_id TEXT,
    ts TEXT
  )`).run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_period ON transactions(corpid, period_start, period_end)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_transactions_operator ON transactions(corpid, operator_id)").run().catch(()=>{});
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_arrear_tasks_status ON arrear_tasks(corpid, followup_status, promise_date)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_entry_events_ref ON entry_events(corpid, ref_type, ref_id, ts)").run();
}
__name(empEnsureSchema,"empEnsureSchema");
function empId(prefix){return prefix+"-"+Date.now().toString(36)+"-"+crypto.randomUUID().slice(0,8);}
__name(empId,"empId");
function empNow(){return new Date().toISOString();}
__name(empNow,"empNow");
async function empInsertDynamic(env, table, values, allowed){
  const cols=await empTableColumns(env,table);
  const names=[];
  const vals=[];
  for(const k of allowed){
    if(cols.has(k)&&values[k]!==void 0){names.push(k);vals.push(values[k]);}
  }
  if(!names.length)return {inserted:false,columns:[]};
  await env.DB.prepare(`INSERT OR REPLACE INTO ${table} (${names.join(",")}) VALUES (${names.map(()=>"?").join(",")})`).bind(...vals).run();
  return {inserted:true,columns:names};
}
__name(empInsertDynamic,"empInsertDynamic");
async function empEvent(env,user,event){
  await empInsertDynamic(env,"entry_events",{
    event_id:empId("evt"),corpid:user.corpid,userid:user.userid,ref_id:event.ref_id,ref_type:event.ref_type,
    event_type:event.event_type,field_name:event.field_name||"",old_value:event.old_value==null?"":String(event.old_value),
    new_value:event.new_value==null?"":String(event.new_value),operator_id:event.operator_id||user.userid||"",ts:event.ts||empNow()
  },EMP_EVENT_COLUMNS);
}
__name(empEvent,"empEvent");
async function handleEmployeeMigrate(request,env,user){
  if(!requireManager(user))return forbidden();
  await empEnsureSchema(env);
  await audit(env,user,"employee.schema.migrate","employee").catch(()=>{});
  return json({success:true,migrated:true});
}
__name(handleEmployeeMigrate,"handleEmployeeMigrate");
async function handleEmployeeLockCards(request,env,user){
  const result=await loadLockCards(env);
  if(result.error)return json({error:result.error},result.status||500);
  await audit(env,user,"employee.lock.cards.load","",{locksCount:result.locksCount}).catch(()=>{});
  return json(result);
}
__name(handleEmployeeLockCards,"handleEmployeeLockCards");
async function handleEmployeeEntry(request,env,user){
  await empEnsureSchema(env);
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const entry=body?.entry||{};
  const session=body?.session||{};
  const amount=Number(entry.amount||0);
  const room=cleanText(entry.room,40).replace(/^#+/,"");
  if(!room||!Number.isFinite(amount)||amount<=0)return badRequest("room_amount_required");
  const entryId=cleanId(entry.id)||empId("ent");
  const sessionId=cleanId(session.id)||empId("emp");
  const now=cleanText(entry.created_at,40)||empNow();
  await env.DB.prepare(`INSERT OR REPLACE INTO sessions (id, corpid, anchor_id, date, entries_count, created_by)
    VALUES (?, ?, ?, ?, ?, ?)`).bind(
      sessionId,user.corpid,cleanText(session.anchorId||session.anchor_id||("EMP-"+now.slice(0,10).replaceAll("-","")),80),
      cleanDate(session.date||now),1,user.userid
    ).run();
  const inserted=await empInsertDynamic(env,"transactions",{
    id:entryId,corpid:user.corpid,userid:user.userid,session_id:sessionId,cat:cleanText(entry.cat||"cash",20),
    room,amount,tag:cleanText(entry.tag||"Old",20),note:cleanText(entry.note,500),room_to:cleanText(entry.roomTo||entry.room_to,40),
    period_start:cleanText(entry.period_start,20),period_end:cleanText(entry.period_end,20),cycle:cleanText(entry.cycle,20),
    reason_code:cleanText(entry.reason_code,30),operator_id:cleanText(entry.operator_id||user.userid,80),src:cleanText(entry.src||"EMP",20),
    tenant_name:cleanText(entry.tenant_name,120),created_at:now
  },EMP_TX_COLUMNS);
  await empEvent(env,user,{ref_id:entryId,ref_type:"transaction",event_type:"create",field_name:"*",new_value:JSON.stringify(entry),operator_id:entry.operator_id||user.userid,ts:now});
  await audit(env,user,"employee.entry.create",entryId,{room,amount}).catch(()=>{});
  return json({success:true,entry_id:entryId,session_id:sessionId,inserted});
}
__name(handleEmployeeEntry,"handleEmployeeEntry");
async function handleArrearTasks(request,env,user){
  await empEnsureSchema(env);
  const taskRows=await env.DB.prepare(`SELECT * FROM arrear_tasks WHERE corpid=? AND COALESCE(close_status,'') NOT IN ('结清','作废') ORDER BY COALESCE(updated_at,created_at) DESC`).bind(user.corpid).all();
  let tasks=taskRows.results||[];
  if(!tasks.length && await empTableExists(env,"arrears")){
    const ar=await env.DB.prepare("SELECT * FROM arrears WHERE corpid=? AND cleared=0 ORDER BY created_at DESC").bind(user.corpid).all();
    tasks=(ar.results||[]).map(a=>({task_id:a.id,corpid:a.corpid,userid:a.userid,entry_id:a.entry_id,bed:a.room,tenant_name:a.tenant_name||"",arrear_amount:a.remain,arrear_reason:a.note||"欠款",created_at:a.created_at,followup_status:"待跟进",promise_date:"",promise_amount:"",actual_received:0,close_status:"",updated_by:"",updated_at:""}));
  }
  return json({success:true,tasks});
}
__name(handleArrearTasks,"handleArrearTasks");
async function handleArrearTaskUpdate(request,env,user){
  await empEnsureSchema(env);
  let body;
  try{body=await request.json();}catch{return badRequest("invalid_json");}
  const taskId=cleanId(body?.task_id);
  const patch=body?.patch||{};
  if(!taskId)return badRequest("task_id_required");
  let old=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first();
  if(!old){
    const fallback=await env.DB.prepare("SELECT * FROM arrears WHERE id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first().catch(()=>null);
    await empInsertDynamic(env,"arrear_tasks",{
      task_id:taskId,corpid:user.corpid,userid:user.userid,entry_id:fallback?.entry_id||patch.entry_id||"",bed:fallback?.room||patch.bed||"",
      tenant_name:patch.tenant_name||fallback?.tenant_name||"",arrear_amount:Number(fallback?.remain||patch.arrear_amount||0),
      arrear_reason:patch.arrear_reason||fallback?.note||"欠款",created_at:fallback?.created_at||empNow(),followup_status:"待跟进"
    },EMP_TASK_COLUMNS);
    old=await env.DB.prepare("SELECT * FROM arrear_tasks WHERE task_id=? AND corpid=? LIMIT 1").bind(taskId,user.corpid).first();
  }
  const allowed=["followup_status","promise_date","promise_amount","actual_received","arrear_reason","tenant_name","close_status","updated_by","updated_at"];
  const updates=[];const vals=[];
  for(const k of allowed){if(patch[k]!==void 0){updates.push(`${k}=?`);vals.push(patch[k]);}}
  if(patch.updated_by===void 0){updates.push("updated_by=?");vals.push(user.userid);}
  if(patch.updated_at===void 0){updates.push("updated_at=?");vals.push(empNow());}
  vals.push(taskId,user.corpid);
  await env.DB.prepare(`UPDATE arrear_tasks SET ${updates.join(",")} WHERE task_id=? AND corpid=?`).bind(...vals).run();
  for(const k of allowed){
    if(patch[k]!==void 0 && String(old?.[k]??"")!==String(patch[k]??"")){
      await empEvent(env,user,{ref_id:taskId,ref_type:"arrear_task",event_type:"update",field_name:k,old_value:old?.[k],new_value:patch[k],operator_id:patch.updated_by||user.userid,ts:patch.updated_at||empNow()});
    }
  }
  await audit(env,user,"employee.arrear_task.update",taskId,{status:patch.followup_status||""}).catch(()=>{});
  return json({success:true});
}
__name(handleArrearTaskUpdate,"handleArrearTaskUpdate");
async function handleEmployeeApi(request,env,user){
  const path=new URL(request.url).pathname;
  if(path==="/api/employee/migrate"&&request.method==="POST")return handleEmployeeMigrate(request,env,user);
  if(path==="/api/employee/lock/cards"&&request.method==="GET")return handleEmployeeLockCards(request,env,user);
  if(path==="/api/employee/entry"&&request.method==="POST")return handleEmployeeEntry(request,env,user);
  if(path==="/api/arrear_tasks"&&request.method==="GET")return handleArrearTasks(request,env,user);
  if(path==="/api/arrear_tasks/update"&&request.method==="POST")return handleArrearTaskUpdate(request,env,user);
  return null;
}
__name(handleEmployeeApi,"handleEmployeeApi");
// EMPLOYEE_API_PATCH_END
