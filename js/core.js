'use strict';

/* ═══════════ CONSTANTS ═══════════ */
var P=['#ff0099','#7928ca','#ff9800','#3ddc84','#4da6ff','#2dd4bf','#ff3358','#a855f7','#ccff00','#ff66c4','#22d3ee','#e6007a'];
var CATS=['One-on-One','Internal Meeting','Workshop / Training','Deep Work','Content Creation','Communication','Admin / Ops','Finance','Strategy / Planning','Sales / Outreach','Research','Review / QA','Travel / Offsite'];
var IMPS=['Critical','Important','When Time Allows'];
var TYPES=['Business','Personal'];
var DAYNAMES=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
var DAYSHORT=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var MO=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
var charts={};
/* Clean SVG check icons (inherit color via currentColor) */
var CK='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
var CK_S='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';
var CK_XS='<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

var S={tasks:[],done:[],review:[],clients:['Internal / N/A'],campaigns:[],payments:[],campaignMeetings:[],timers:{},view:'overview',layout:'grid',groupBy:'importance',
  templates:[],bulkMode:false,bulkSelected:{},calEvents:[],
  pins:{},actLogs:{},customOrder:[],schedOrder:{},focusTask:null,focusDuration:25,recurrLast:{},
  filters:{client:'',endClient:'',campaign:'',cat:'',imp:'',type:'',search:'',dateFrom:'',dateTo:''},dashPeriod:30,collapsed:{},cpView:'pipeline',taskMode:'open',doneSort:'date'};

var VIEWS=[
  {id:'schedule',icon:'📅',label:'Schedule',kbd:'1'},
  {id:'overview',icon:'⚡',label:'Today',kbd:'2'},
  {id:'tasks',icon:'📋',label:'Tasks',kbd:'3'},
  {id:'review',icon:'📥',label:'Review',kbd:'4'},
  {id:'analytics',icon:'📊',label:'Analytics',kbd:'5'},
  {id:'meetings',icon:'🤝',label:'Meetings',kbd:'6'},
  {id:'weekly',icon:'📅',label:'Weekly',kbd:'7'},
  {id:'templates',icon:'📎',label:'Templates',kbd:'8'},
  {id:'campaigns',icon:'🎯',label:'Campaigns',kbd:'9'}
];

/* ═══════════ UTILS ═══════════ */
function gel(id){return document.getElementById(id)}
function cel(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function escAttr(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
function genID(){var c='abcdefghijklmnopqrstuvwxyz0123456789',id='tf-';for(var i=0;i<6;i++)id+=c.charAt(Math.floor(Math.random()*c.length));return id}
function fmtM(m){m=Math.round(m||0);if(m<=0)return'0m';var h=Math.floor(m/60),r=m%60;return h>0&&r>0?h+'h '+r+'m':h>0?h+'h':r+'m'}
function fmtT(s){s=Math.max(0,Math.round(s||0));var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return(h?h+':':'')+String(m).padStart(h?2:1,'0')+':'+String(ss).padStart(2,'0')}
function pDate(v){if(!v)return null;if(v instanceof Date)return isNaN(v)?null:v;var d=new Date(v);if(!isNaN(d.getTime()))return d;
  var mos={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  var m=String(v).match(/(\d{1,2})\s+(\w{3})\s+(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if(m)return new Date(+m[3],mos[m[2].toLowerCase()]||0,+m[1],+(m[4]||0),+(m[5]||0));return null}
function dayDiff(a,b){var d1=new Date(a);d1.setHours(0,0,0,0);var d2=new Date(b);d2.setHours(0,0,0,0);return Math.round((d2-d1)/864e5)}
function wkStart(d){var dt=new Date(d),dw=dt.getDay();dt.setDate(dt.getDate()-(dw===0?6:dw-1));dt.setHours(0,0,0,0);return dt}
function fmtISO(d){if(!d)return'';var dt=new Date(d);var p=function(n){return String(n).padStart(2,'0')};return dt.getFullYear()+'-'+p(dt.getMonth()+1)+'-'+p(dt.getDate())+'T'+p(dt.getHours())+':'+p(dt.getMinutes())}

/* Date formatting with day name */
function fmtDFull(d){if(!d)return'';return DAYNAMES[d.getDay()]+', '+d.getDate()+' '+MO[d.getMonth()]+' '+d.getFullYear()}
function fmtDShort(d){if(!d)return'';return DAYSHORT[d.getDay()]+', '+d.getDate()+' '+MO[d.getMonth()]}
function dueLabel(d,td){if(!d)return'';var diff=dayDiff(td,d);var ds=fmtDShort(d);
  if(diff<0)return ds+' ('+Math.abs(diff)+'d overdue)';if(diff===0)return ds+' (today)';
  if(diff===1)return ds+' (tomorrow)';return ds+' (in '+diff+' days)'}
function dueLabelFull(d,td){if(!d)return'';var diff=dayDiff(td,d);var ds=fmtDFull(d);
  if(diff<0)return ds+' ('+Math.abs(diff)+' days overdue)';if(diff===0)return ds+' (today)';
  if(diff===1)return ds+' (tomorrow)';return ds+' (in '+diff+' days)'}
function impCls(i){return i==='Critical'?'bg-cr':i==='Important'?'bg-im':i==='Meeting'?'bg-mt':'bg-wt'}/* bg-mt kept for historical done items */
function today(){var d=new Date();d.setHours(0,0,0,0);return d}

/* Effective day for Today tab: shows next working day if past work-end on last schedule day through weekend */
function getEffectiveDay(){
  var now=new Date(),td=today();
  var wE=CONFIG.workEnd||20;
  var schedDays=CONFIG.schedDays||[1,2,3,4];
  var dow=td.getDay(),hr=now.getHours();
  /* Check if we're past work-end on a schedule day, or on a non-schedule day */
  var pastEnd=schedDays.indexOf(dow)!==-1&&hr>=wE;
  var offDay=schedDays.indexOf(dow)===-1;
  if(pastEnd||offDay){
    /* Find next working day */
    for(var i=1;i<=7;i++){
      var d=new Date(td.getTime()+i*864e5);
      if(schedDays.indexOf(d.getDay())!==-1)return d}
  }
  return td}

/* Calendar free-slot calculator */
function calcFreeSlots(events,wS,wE,forDate){
  var baseDate=forDate||today();
  var slots=[];
  var workStart=new Date(baseDate);workStart.setHours(wS,0,0,0);
  var workEnd=new Date(baseDate);workEnd.setHours(wE,0,0,0);
  /* If scheduling for today, start from current time instead of work start */
  var now=new Date();
  if(baseDate.getTime()===today().getTime()&&now>workStart&&now<workEnd){workStart=now}
  /* Sort events by start time */
  var sorted=events.slice().sort(function(a,b){return a.start.getTime()-b.start.getTime()});
  var cursor=workStart.getTime();
  sorted.forEach(function(e){
    var es=Math.min(Math.max(e.start.getTime(),workStart.getTime()),workEnd.getTime());
    var ee=Math.min(e.end.getTime(),workEnd.getTime());
    if(es>cursor){slots.push({start:new Date(cursor),end:new Date(es)})}
    cursor=Math.max(cursor,ee)});
  if(cursor<workEnd.getTime()){slots.push({start:new Date(cursor),end:workEnd})}
  return slots.filter(function(s){return(s.end-s.start)>=300000})}/* Min 5 min slot */

/* Task scheduling engine: fits whole tasks into free slots, no splitting */
function schedDayKey(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function scheduleTasks(dayDate,excludeIds){
  var dow=dayDate.getDay(),schedDays=CONFIG.schedDays||[1,2,3,4];
  var wS=CONFIG.workStart||9,wE=CONFIG.workEnd||20;
  if(schedDays.indexOf(dow)===-1)return[];
  var dayEnd=new Date(dayDate.getTime()+864e5);
  var dayEvents=S.calEvents.filter(function(e){return e.start>=dayDate&&e.start<dayEnd});
  var freeSlots=calcFreeSlots(dayEvents,wS,wE,dayDate);
  if(!freeSlots.length)return[];
  var exc=excludeIds||{};
  var dk=schedDayKey(dayDate);
  /* Build set of task IDs pinned to OTHER days (exclude from this day) */
  var pinnedElsewhere={};
  Object.keys(S.schedOrder).forEach(function(k){if(k===dk)return;
    (S.schedOrder[k]||[]).forEach(function(id){pinnedElsewhere[id]=true})});
  var tasks=S.tasks.filter(function(t){
    return t.est>0&&!exc[t.id]&&!pinnedElsewhere[t.id]
  }).map(function(t){var elapsedMins=Math.round(tmrElapsed(t.id)/60);return{task:t,score:taskScore(t),est:Math.max(5,t.est-elapsedMins)}})
    .filter(function(t){return t.est>0});
  /* Apply manual schedule order if set for this day, otherwise use score */
  var manualIds=S.schedOrder[dk];
  if(manualIds&&manualIds.length){
    var idxMap={};manualIds.forEach(function(id,i){idxMap[id]=i});
    tasks.sort(function(a,b){
      var ia=idxMap[a.task.id]!==undefined?idxMap[a.task.id]:9999;
      var ib=idxMap[b.task.id]!==undefined?idxMap[b.task.id]:9999;
      if(ia!==ib)return ia-ib;return b.score-a.score})}
  else{tasks.sort(function(a,b){return b.score-a.score})}
  var scheduled=[],usedIds={},buffer=5;/* 5-min buffer between tasks */
  for(var ti=0;ti<tasks.length;ti++){
    var t=tasks[ti];
    if(usedIds[t.task.id])continue;
    /* Find first slot that fits the whole task */
    for(var si=0;si<freeSlots.length;si++){
      var slot=freeSlots[si];
      var slotMins=Math.round((slot.end-slot.start)/60000);
      if(slotMins>=t.est){
        var start=new Date(slot.start);
        var end=new Date(Math.min(start.getTime()+t.est*60000,slot.end.getTime()));
        var actualMins=Math.round((end-start)/60000);
        if(actualMins<5)continue;/* skip if clamping made it too short */
        scheduled.push({task:t.task,start:start,end:end,mins:actualMins});
        usedIds[t.task.id]=true;
        /* Shrink slot: remaining time minus buffer */
        var newStart=new Date(end.getTime()+buffer*60000);
        if(newStart<slot.end){freeSlots[si]={start:newStart,end:slot.end}}
        else{freeSlots.splice(si,1)}
        break}}}
  scheduled.sort(function(a,b){return a.start.getTime()-b.start.getTime()});
  return scheduled}

/* Scoring */
function taskScore(t){var td_=today(),u=10;
  if(t.due){var dd=new Date(t.due);dd.setHours(0,0,0,0);var diff=Math.round((dd-td_)/864e5);
    if(diff<0)u=1000+Math.abs(diff)*10;else if(diff===0)u=500;else if(diff===1)u=200;
    else if(diff<=7)u=100+(7-diff)*10;else u=Math.max(0,50-diff)}
  var m=t.importance==='Critical'?3:t.importance==='Important'?2:1;
  var ts=tmrGet(t.id),sb=ts.started?150:(ts.elapsed>0?100:0);
  var score=Math.round((u*m)+(t.est/10)+sb);
  if(S.pins[t.id])score+=5000;
  return score}

/* Persistence (localStorage for UI state only) */
function save(){try{localStorage.setItem('tf_t',JSON.stringify(S.timers));localStorage.setItem('tf_c',JSON.stringify(S.collapsed));localStorage.setItem('tf_ly',S.layout);localStorage.setItem('tf_gb',S.groupBy);localStorage.setItem('tf_tpl',JSON.stringify(S.templates));localStorage.setItem('tf_pins',JSON.stringify(S.pins));localStorage.setItem('tf_ord',JSON.stringify(S.customOrder));localStorage.setItem('tf_so',JSON.stringify(S.schedOrder));localStorage.setItem('tf_rl',JSON.stringify(S.recurrLast));localStorage.setItem('tf_tm',S.taskMode);localStorage.setItem('tf_ds',S.doneSort)}catch(e){}}
function restore(){try{var t=localStorage.getItem('tf_t');if(t)S.timers=JSON.parse(t);
  var c=localStorage.getItem('tf_c');if(c)S.collapsed=JSON.parse(c);
  var ly=localStorage.getItem('tf_ly');if(ly)S.layout=ly;
  var gb=localStorage.getItem('tf_gb');if(gb)S.groupBy=gb;
  var tpl=localStorage.getItem('tf_tpl');if(tpl)S.templates=JSON.parse(tpl);
  var pins=localStorage.getItem('tf_pins');if(pins)S.pins=JSON.parse(pins);
  var ord=localStorage.getItem('tf_ord');if(ord)S.customOrder=JSON.parse(ord);
  var so=localStorage.getItem('tf_so');if(so)S.schedOrder=JSON.parse(so);
  var rl=localStorage.getItem('tf_rl');if(rl)S.recurrLast=JSON.parse(rl);
  var tm=localStorage.getItem('tf_tm');if(tm)S.taskMode=tm;
  var ds=localStorage.getItem('tf_ds');if(ds)S.doneSort=ds}catch(e){}}
function toast(msg,type){var t=cel('div','toast toast-'+(type||'ok'),msg);gel('toasts').appendChild(t);setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t)},3200)}

/* ═══════════ DATA — Supabase queries ═══════════ */
/* Helper to get current user ID */
async function getUserId(){
  var u=await _sb.auth.getUser();
  return u.data.user?u.data.user.id:null}

async function loadTasks(){
  var res=await _sb.from('tasks').select('*').order('sort_order',{ascending:true,nullsFirst:false});
  if(res.error){console.error('loadTasks:',res.error);return}
  S.tasks=(res.data||[]).map(function(r){
    return{id:r.id,item:r.item,due:r.due?new Date(r.due+'T00:00:00'):null,importance:r.importance||'When Time Allows',est:r.est||0,
      category:r.category||'',client:r.client||'',endClient:r.end_client||'',type:r.type||'Business',
      duration:r.duration||0,notes:r.notes||'',status:r.status||'Planned',flag:!!r.flag,campaign:r.campaign||'',meetingKey:r.meeting_key||''}})}

async function loadDone(){
  var res=await _sb.from('done').select('*').order('completed',{ascending:false});
  if(res.error){console.error('loadDone:',res.error);return}
  S.done=(res.data||[]).map(function(r){
    return{id:r.id,item:r.item,completed:r.completed?new Date(r.completed):new Date(),due:r.due?new Date(r.due+'T00:00:00'):null,
      importance:r.importance||'',category:r.category||'',client:r.client||'',endClient:r.end_client||'',
      type:r.type||'Business',duration:r.duration||0,est:r.est||0,notes:r.notes||'',campaign:r.campaign||''}})}

async function loadClients(){
  var res=await _sb.from('clients').select('name').order('name');
  if(res.error){console.error('loadClients:',res.error);return}
  var cls=(res.data||[]).map(function(r){return r.name});
  cls.sort(function(a,b){return a.toLowerCase().localeCompare(b.toLowerCase())});
  cls.unshift('Internal / N/A');
  S.clients=cls}

async function loadReview(){
  var res=await _sb.from('review').select('*').order('created',{ascending:false});
  if(res.error){console.error('loadReview:',res.error);return}
  S.review=(res.data||[]).map(function(r){
    return{id:r.id,item:r.item,notes:r.notes||'',importance:r.importance||'Important',
      category:r.category||'',client:r.client||'Internal / N/A',endClient:r.end_client||'',
      type:r.type||'Business',est:r.est||0,due:r.due?new Date(r.due+'T00:00:00'):null,
      source:r.source||'',created:r.created?new Date(r.created):new Date(),campaign:r.campaign||''}})}

async function loadCampaigns(){
  var res=await _sb.from('campaigns').select('*').order('created_at',{ascending:false});
  if(res.error){console.error('loadCampaigns:',res.error);return}
  S.campaigns=(res.data||[]).map(function(r){
    return{id:r.id,name:r.name||'',partner:r.partner||'',endClient:r.end_client||'',
      status:r.status||'Setup',platform:r.platform||'',
      strategyFee:parseFloat(r.strategy_fee)||0,setupFee:parseFloat(r.setup_fee)||0,
      monthlyFee:parseFloat(r.monthly_fee)||0,monthlyAdSpend:parseFloat(r.monthly_ad_spend)||0,
      campaignTerm:r.campaign_term||'',
      plannedLaunch:r.planned_launch?new Date(r.planned_launch+'T00:00:00'):null,
      actualLaunch:r.actual_launch?new Date(r.actual_launch+'T00:00:00'):null,
      renewalDate:r.renewal_date?new Date(r.renewal_date+'T00:00:00'):null,
      goal:r.goal||'',proposalLink:r.proposal_link||'',reportsLink:r.reports_link||'',
      videoAssetsLink:r.video_assets_link||'',transcriptsLink:r.transcripts_link||'',
      awarenessLP:r.awareness_lp||'',considerationLP:r.consideration_lp||'',
      decisionLP:r.decision_lp||'',contractLink:r.contract_link||'',
      notes:r.notes||'',created:r.created_at?new Date(r.created_at):new Date()}})}

async function loadPayments(){
  var res=await _sb.from('payments').select('*').order('date',{ascending:false});
  if(res.error){console.error('loadPayments:',res.error);return}
  S.payments=(res.data||[]).map(function(r){
    /* Look up campaign details */
    var cp=S.campaigns.find(function(c){return c.id===r.campaign_id});
    return{id:r.id,campaignId:r.campaign_id||'',
      campaignName:cp?cp.name:'',partner:cp?cp.partner:'',endClient:cp?cp.endClient:'',
      date:r.date?new Date(r.date+'T00:00:00'):null,amount:parseFloat(r.amount)||0,
      type:r.type||'',notes:r.notes||''}})}

async function loadCampaignMeetings(){
  var res=await _sb.from('campaign_meetings').select('*').order('date',{ascending:false});
  if(res.error){console.error('loadCampaignMeetings:',res.error);return}
  S.campaignMeetings=(res.data||[]).map(function(r){
    var cp=S.campaigns.find(function(c){return c.id===r.campaign_id});
    return{id:r.id,campaignId:r.campaign_id||'',
      campaignName:cp?cp.name:'',partner:cp?cp.partner:'',endClient:cp?cp.endClient:'',
      date:r.date?new Date(r.date):null,title:r.title||'',
      recordingLink:r.recording_link||'',notes:r.notes||''}})}

async function loadActivityLogs(){
  var res=await _sb.from('activity_logs').select('*').order('ts',{ascending:true});
  if(res.error){console.error('loadActivityLogs:',res.error);return}
  S.actLogs={};
  (res.data||[]).forEach(function(r){
    if(!S.actLogs[r.task_id])S.actLogs[r.task_id]=[];
    S.actLogs[r.task_id].push({text:r.text||'',ts:r.ts||''})})}

function fmtUSD(n){return'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}

async function loadData(){toast('Loading data...','info');
  try{
    /* Load campaigns first (payments/meetings reference them) */
    await Promise.all([loadTasks(),loadDone(),loadClients(),loadReview(),loadCampaigns()]);
    /* Now load payments, campaign meetings & activity logs (payments/meetings need campaigns loaded) */
    await Promise.all([loadPayments(),loadCampaignMeetings(),loadActivityLogs()]);
    /* Restore calendar from cache (silent, no render) then background fetch */
    if(CONFIG.calendarURL){restoreCalCache();setTimeout(function(){loadCalendar()},100)}
    S.tasks.forEach(function(t){
      if(t.duration>0){
        var existing=S.timers[t.id];
        var existingMins=existing?Math.round((existing.elapsed||0)/60):0;
        if(!existing||existingMins<t.duration){
          if(!existing)S.timers[t.id]={started:null,elapsed:t.duration*60};
          else S.timers[t.id].elapsed=t.duration*60;
          save()}}});
    gel('last-refresh').textContent='Updated '+new Date().toLocaleTimeString();
    processRecurring();
    if(typeof cleanMtgPrompted==='function')cleanMtgPrompted();
    toast('Loaded '+S.tasks.length+' tasks, '+S.done.length+' completed'+(S.review.length?', '+S.review.length+' to review':''),'ok')}catch(e){toast('❌ '+e.message,'warn')}
  render()}

/* ═══════════ SUPABASE WRITE HELPERS ═══════════ */
/* These replace the old hook() webhook calls */

async function dbAddTask(taskData){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,item:taskData.item,due:taskData.due||null,importance:taskData.importance||'When Time Allows',
    est:taskData.est||0,category:taskData.category||'',client:taskData.client||'',end_client:taskData.endClient||'',
    type:taskData.type||'Business',notes:taskData.notes||'',status:taskData.status||'Planned',
    flag:!!taskData.flag,campaign:taskData.campaign||'',duration:taskData.duration||0,meeting_key:taskData.meetingKey||''};
  var res=await _sb.from('tasks').insert(row).select().single();
  if(res.error){toast('❌ Save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditTask(id,taskData){
  var row={item:taskData.item,due:taskData.due||null,importance:taskData.importance||'When Time Allows',
    est:taskData.est||0,category:taskData.category||'',client:taskData.client||'',end_client:taskData.endClient||'',
    type:taskData.type||'Business',notes:taskData.notes||'',status:taskData.status||'Planned',
    flag:!!taskData.flag,campaign:taskData.campaign||'',duration:taskData.duration||0,meeting_key:taskData.meetingKey||''};
  var res=await _sb.from('tasks').update(row).eq('id',id);
  if(res.error){toast('❌ Update failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeleteTask(id){
  var res=await _sb.from('tasks').delete().eq('id',id);
  if(res.error){toast('❌ Delete failed: '+res.error.message,'warn');return false}
  return true}

async function dbCompleteTask(taskData){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,item:taskData.item,completed:new Date().toISOString(),
    due:taskData.due?taskData.due.toISOString().split('T')[0]:null,
    importance:taskData.importance||'',category:taskData.category||'',
    client:taskData.client||'',end_client:taskData.endClient||'',type:taskData.type||'Business',
    duration:taskData.duration||0,est:taskData.est||0,notes:taskData.notes||'',campaign:taskData.campaign||''};
  var res=await _sb.from('done').insert(row).select().single();
  if(res.error){toast('❌ Complete failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbUpdateTaskDuration(id,duration){
  var res=await _sb.from('tasks').update({duration:duration}).eq('id',id);
  if(res.error)console.error('dbUpdateTaskDuration:',res.error)}

async function dbUpdateMeetingKey(id,meetingKey){
  var res=await _sb.from('tasks').update({meeting_key:meetingKey}).eq('id',id);
  if(res.error)console.error('dbUpdateMeetingKey:',res.error)}

async function dbDeleteReview(id){
  var res=await _sb.from('review').delete().eq('id',id);
  if(res.error){toast('❌ Delete review failed: '+res.error.message,'warn');return false}
  return true}

async function dbAddCampaign(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,name:data.name,partner:data.partner||'',end_client:data.endClient||'',
    status:data.status||'Setup',platform:data.platform||'',
    strategy_fee:data.strategyFee||0,setup_fee:data.setupFee||0,
    monthly_fee:data.monthlyFee||0,monthly_ad_spend:data.monthlyAdSpend||0,
    campaign_term:data.campaignTerm||'',
    planned_launch:data.plannedLaunch||null,actual_launch:data.actualLaunch||null,
    renewal_date:data.renewalDate||null,goal:data.goal||'',
    proposal_link:data.proposalLink||'',reports_link:data.reportsLink||'',
    video_assets_link:data.videoAssetsLink||'',transcripts_link:data.transcriptsLink||'',
    awareness_lp:data.awarenessLP||'',consideration_lp:data.considerationLP||'',
    decision_lp:data.decisionLP||'',contract_link:data.contractLink||'',
    notes:data.notes||''};
  var res=await _sb.from('campaigns').insert(row).select().single();
  if(res.error){toast('❌ Campaign save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditCampaign(id,data){
  var row={name:data.name,partner:data.partner||'',end_client:data.endClient||'',
    status:data.status||'Setup',platform:data.platform||'',
    strategy_fee:data.strategyFee||0,setup_fee:data.setupFee||0,
    monthly_fee:data.monthlyFee||0,monthly_ad_spend:data.monthlyAdSpend||0,
    campaign_term:data.campaignTerm||'',
    planned_launch:data.plannedLaunch||null,actual_launch:data.actualLaunch||null,
    renewal_date:data.renewalDate||null,goal:data.goal||'',
    proposal_link:data.proposalLink||'',reports_link:data.reportsLink||'',
    video_assets_link:data.videoAssetsLink||'',transcripts_link:data.transcriptsLink||'',
    awareness_lp:data.awarenessLP||'',consideration_lp:data.considerationLP||'',
    decision_lp:data.decisionLP||'',contract_link:data.contractLink||'',
    notes:data.notes||''};
  var res=await _sb.from('campaigns').update(row).eq('id',id);
  if(res.error){toast('❌ Campaign update failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeleteCampaign(id){
  var res=await _sb.from('campaigns').delete().eq('id',id);
  if(res.error){toast('❌ Campaign delete failed: '+res.error.message,'warn');return false}
  return true}

async function dbAddPayment(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,campaign_id:data.campaignId,date:data.date||null,
    amount:data.amount||0,type:data.type||'',notes:data.notes||''};
  var res=await _sb.from('payments').insert(row).select().single();
  if(res.error){toast('❌ Payment save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbAddCampaignMeeting(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,campaign_id:data.campaignId,date:data.date||null,
    title:data.title||'',recording_link:data.recordingLink||'',notes:data.notes||''};
  var res=await _sb.from('campaign_meetings').insert(row).select().single();
  if(res.error){toast('❌ Meeting save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbAddClient(name){
  var uid=await getUserId();if(!uid)return false;
  var res=await _sb.from('clients').insert({user_id:uid,name:name}).select().single();
  if(res.error){
    if(res.error.code==='23505')return true;/* already exists, not an error */
    toast('❌ Client save failed: '+res.error.message,'warn');return false}
  return true}

/* ═══════════ CALENDAR (cached, non-blocking) ═══════════ */
var calLoading=false;
var CAL_CACHE_VER='v4';
function restoreCalCache(){
  try{var raw=localStorage.getItem('tf_calcache');if(!raw)return false;
    var c=JSON.parse(raw);
    if(c.ver!==CAL_CACHE_VER){localStorage.removeItem('tf_calcache');return false}
    var age=(Date.now()-c.ts)/60000;
    if(age>(CONFIG.calCacheMins||10))return false;
    S.calEvents=c.events.map(function(e){return{title:e.title,start:new Date(e.start),end:new Date(e.end),allDay:e.allDay}})
      .filter(function(e){return!e.allDay&&!isNaN(e.start.getTime())&&!isNaN(e.end.getTime())});
    return S.calEvents.length>0}catch(e){localStorage.removeItem('tf_calcache');return false}}
function saveCalCache(){
  try{localStorage.setItem('tf_calcache',JSON.stringify({ver:CAL_CACHE_VER,ts:Date.now(),events:S.calEvents.map(function(e){return{title:e.title,start:e.start.toISOString(),end:e.end.toISOString(),allDay:e.allDay}})}))}catch(e){}}
async function loadCalendar(force){
  /* Try cache first (silently, no render) */
  if(!force&&restoreCalCache()){buildNav();return}
  if(calLoading)return;calLoading=true;
  /* Update just the calendar area if visible */
  updateCalSection();
  try{var r=await fetch(CONFIG.calendarURL+'?mode=week&_='+Date.now());var j=await r.json();
    S.calEvents=(j.events||[]).map(function(e){return{title:e.title||'',start:new Date(e.start),end:new Date(e.end),allDay:!!e.allDay}})
      .filter(function(e){return!e.allDay&&!isNaN(e.start.getTime())&&!isNaN(e.end.getTime())});
    saveCalCache();calLoading=false;
    updateCalSection();buildNav();
    toast('📅 Calendar synced ('+S.calEvents.length+' events)','ok')}
  catch(e){calLoading=false;S.calEvents=[];console.warn('Calendar fetch failed:',e);updateCalSection()}}
function updateCalSection(){
  var el=document.getElementById('cal-section');
  if(!el||S.view!=='overview')return;
  try{el.innerHTML=renderCalSection()}catch(e){el.innerHTML='<div style="padding:12px;color:var(--t4);font-size:12px">Calendar error. <span style="cursor:pointer;color:var(--pink)" onclick="TF.syncCal()">Retry</span></div>';console.warn('Cal render error:',e)}}

async function dbAddLog(taskId,text){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,task_id:taskId,text:text,ts:new Date().toISOString()};
  var res=await _sb.from('activity_logs').insert(row).select().single();
  if(res.error){toast('❌ Log save failed: '+res.error.message,'warn');return null}
  return res.data}

/* ═══════════ WEBHOOK — kept as no-op for backward compat ═══════════ */
async function hook(action,data){/* No-op — all writes now go directly to Supabase */}

/* Filters */
function uniqueVals(arr,key){var m={};arr.forEach(function(r){var v=r[key];if(v)m[v]=1});return Object.keys(m).sort()}
function filterBar(items,showDate){
  var cls=uniqueVals(items,'client'),cas=uniqueVals(items,'category'),ims=uniqueVals(items,'importance');
  /* Build end client list from campaigns + tasks */
  var ecs=[];
  S.campaigns.forEach(function(c){if(c.endClient&&ecs.indexOf(c.endClient)===-1)ecs.push(c.endClient)});
  S.tasks.concat(S.done).forEach(function(t){if(t.endClient&&ecs.indexOf(t.endClient)===-1)ecs.push(t.endClient)});
  ecs.sort();
  /* Build campaign names list */
  var cps=S.campaigns.map(function(c){return c.name});
  var h='<div class="flts">';h+='<input class="fl fl-s" placeholder="🔍 Search... ( / )" value="'+esc(S.filters.search||'')+'" oninput="TF.filtSearch(this.value)">';
  h+=fSel('client',cls,'All Clients');if(ecs.length)h+=fSel('endClient',ecs,'All End Clients');if(cps.length)h+=fSel('campaign',cps,'All Campaigns');h+=fSel('cat',cas,'All Categories');h+=fSel('imp',ims,'All Importance');h+=fSel('type',TYPES,'All Types');
  if(showDate){h+='<input type="date" class="fl" value="'+(S.filters.dateFrom||'')+'" onchange="TF.filt(\'dateFrom\',this.value)" title="From">';
    h+='<input type="date" class="fl" value="'+(S.filters.dateTo||'')+'" onchange="TF.filt(\'dateTo\',this.value)" title="To">'}
  if(S.filters.client||S.filters.endClient||S.filters.campaign||S.filters.cat||S.filters.imp||S.filters.type||S.filters.search||S.filters.dateFrom||S.filters.dateTo)h+='<button class="fl-clr" onclick="TF.clearF()">✕ Clear</button>';
  return h+'</div>'}
function fSel(key,opts,all){var cur=S.filters[key]||'';
  var h='<select class="fl'+(cur?' fl-active':'')+'" onchange="TF.filt(\''+key+'\',this.value)"><option value="">'+all+'</option>';
  opts.forEach(function(o){h+='<option'+(cur===o?' selected':'')+'>'+esc(o)+'</option>'});return h+'</select>'}
function applyFilters(items,useDate){var f=S.filters;return items.filter(function(t){
  if(f.client&&t.client!==f.client)return false;if(f.endClient&&t.endClient!==f.endClient)return false;if(f.cat&&t.category!==f.cat)return false;
  if(f.imp&&t.importance!==f.imp)return false;if(f.type&&t.type!==f.type)return false;
  if(f.campaign){var matchCp=S.campaigns.find(function(c){return c.name===f.campaign});if(matchCp&&t.campaign!==matchCp.id)return false}
  if(f.search){var q=f.search.toLowerCase();if(t.item.toLowerCase().indexOf(q)===-1&&(t.notes||'').toLowerCase().indexOf(q)===-1&&(t.client||'').toLowerCase().indexOf(q)===-1&&(t.endClient||'').toLowerCase().indexOf(q)===-1)return false}
  if(useDate&&f.dateFrom){var d=t.completed||t.due;if(!d||d<new Date(f.dateFrom))return false}
  if(useDate&&f.dateTo){var d2=t.completed||t.due;var to=new Date(f.dateTo);to.setHours(23,59,59);if(!d2||d2>to)return false}
  return true})}
function applyDropdownFilters(items){var f=S.filters;return items.filter(function(t){
  if(f.client&&t.client!==f.client)return false;if(f.endClient&&t.endClient!==f.endClient)return false;if(f.cat&&t.category!==f.cat)return false;
  if(f.imp&&t.importance!==f.imp)return false;if(f.type&&t.type!==f.type)return false;
  if(f.campaign){var matchCp=S.campaigns.find(function(c){return c.name===f.campaign});if(matchCp&&t.campaign!==matchCp.id)return false}
  if(f.search){var q=f.search.toLowerCase();if(t.item.toLowerCase().indexOf(q)===-1&&(t.notes||'').toLowerCase().indexOf(q)===-1&&(t.client||'').toLowerCase().indexOf(q)===-1&&(t.endClient||'').toLowerCase().indexOf(q)===-1)return false}
  return true})}

/* ═══════════ NAV ═══════════ */
function nav(id){S.view=id;document.querySelectorAll('.s-item').forEach(function(n){n.classList.toggle('on',n.dataset.v===id)});render();closeMenu()}
function buildNav(){var h='';VIEWS.forEach(function(v){
    var badge='';if(v.id==='review'&&S.review.length)badge='<span class="nav-badge">'+S.review.length+'</span>';
    h+='<div class="s-item'+(v.id===S.view?' on':'')+'" data-v="'+v.id+'" onclick="TF.nav(\''+v.id+'\')"><span class="ico">'+v.icon+'</span>'+v.label+'<span class="s-right">'+badge+'<span class="kbd">'+v.kbd+'</span></span></div>'});gel('s-nav').innerHTML=h}
function openMenu(){gel('sidebar').classList.add('open');gel('mob-overlay').classList.add('on')}
function closeMenu(){gel('sidebar').classList.remove('open');gel('mob-overlay').classList.remove('on')}
document.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&!e.shiftKey){
    var modal=gel('modal');if(modal&&modal.classList.contains('on')){
      var isTextarea=e.target.tagName==='TEXTAREA';if(!isTextarea){
        e.preventDefault();
        var saveBtn=modal.querySelector('.btn-p');if(saveBtn)saveBtn.click();return}}}
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
  var n=parseInt(e.key);if(n>=0&&n<=9){var v=VIEWS.find(function(vv){return vv.kbd===e.key});if(v)nav(v.id)}
  if(e.key==='Escape'){closeModal();closeCmdPalette();closeFocus()}
  if(e.key==='n'||e.key==='N'){openAddModal()}
  if(e.key==='s'||e.key==='S'){openDailySummary()}
  if(e.key==='/'){e.preventDefault();setTimeout(function(){var si=document.querySelector('.fl-s');if(si)si.focus()},50)}
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openCmdPalette()}
  if((e.ctrlKey||e.metaKey)&&e.key==='b'&&S.view==='tasks'){e.preventDefault();toggleBulk()}});
