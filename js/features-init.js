'use strict';

/* ═══════════ FEATURE: DRAG REORDER ═══════════ */
function applyManualOrder(tasks){
  if(!S.customOrder.length)return tasks;
  var orderMap={};S.customOrder.forEach(function(id,i){orderMap[id]=i});
  return tasks.slice().sort(function(a,b){
    var oa=orderMap[a.id]!==undefined?orderMap[a.id]:999;
    var ob=orderMap[b.id]!==undefined?orderMap[b.id]:999;
    if(oa!==ob)return oa-ob;return(b._score||0)-(a._score||0)})}
var dragId=null;
function dragStart(e,id){dragId=id;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);
  var el=e.target.closest('.reorder-row');if(el)el.classList.add('dragging')}
function dragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move'}
function dragDrop(e,targetId){e.preventDefault();
  if(!dragId||dragId===targetId)return;
  /* Build current order */
  var filtered=applyFilters(S.tasks);filtered.forEach(function(t){t._score=taskScore(t)});
  var ordered=applyManualOrder(filtered);
  var ids=ordered.map(function(t){return t.id});
  var fromIdx=ids.indexOf(dragId),toIdx=ids.indexOf(targetId);
  if(fromIdx<0||toIdx<0)return;
  ids.splice(fromIdx,1);ids.splice(toIdx,0,dragId);
  S.customOrder=ids;save();dragId=null;render()}

/* ═══════════ FEATURE: SCHEDULE REORDER ═══════════ */
var schedDragId=null,schedDragSrcDk=null;
function parseDayKey(dk){var p=dk.split('-');var d=new Date(+p[0],+p[1]-1,+p[2]);d.setHours(0,0,0,0);return d}
function getSchedIds(dk){
  var dayDate=parseDayKey(dk);
  var sched=scheduleTasks(dayDate,{});
  return sched.map(function(s){return s.task.id})}
function schedDragStart(e,id){schedDragId=id;schedDragSrcDk=e.target.closest('[data-sched-day]').dataset.schedDay;
  e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);
  var el=e.target.closest('.cal-panel-row')||e.target.closest('.today-cal-tk');if(el)el.classList.add('dragging');
  /* Highlight panels as drop targets */
  setTimeout(function(){document.querySelectorAll('.cal-panel,.today-cal').forEach(function(p){p.classList.add('drag-target')})},0)}
function schedDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move'}
function schedDragEnd(){schedDragId=null;schedDragSrcDk=null;
  document.querySelectorAll('.cal-panel,.today-cal').forEach(function(p){p.classList.remove('drag-target')});
  document.querySelectorAll('.cal-pr-tk,.today-cal-tk').forEach(function(r){r.classList.remove('dragging','drag-over','drag-over-below')});
  document.querySelectorAll('.cal-panel-drop-zone').forEach(function(z){z.classList.remove('drag-over')})}
function schedRowDragEnter(e,el){e.preventDefault();
  document.querySelectorAll('.cal-pr-tk,.today-cal-tk').forEach(function(r){r.classList.remove('drag-over','drag-over-below')});
  var row=el.closest('.cal-pr-tk')||el.closest('.today-cal-tk');if(row&&!row.classList.contains('dragging')){
    var rect=row.getBoundingClientRect();var midY=rect.top+rect.height/2;
    if(e.clientY>midY)row.classList.add('drag-over-below');else row.classList.add('drag-over')}}
function schedRowDragLeave(e,el){var row=el.closest('.cal-pr-tk')||el.closest('.today-cal-tk');
  if(row&&!row.contains(e.relatedTarget)){row.classList.remove('drag-over','drag-over-below')}}
function schedZoneDragEnter(e){e.target.classList.add('drag-over')}
function schedZoneDragLeave(e){e.target.classList.remove('drag-over')}
function schedDragDrop(e,targetId,dk){e.preventDefault();e.stopPropagation();
  if(!schedDragId)return;
  var srcDk=schedDragSrcDk;
  var sameDay=srcDk===dk;
  if(sameDay&&schedDragId===targetId){schedDragId=null;schedDragSrcDk=null;return}

  if(sameDay){
    /* Reorder within same day */
    var ids=getSchedIds(dk);
    var fromIdx=ids.indexOf(schedDragId),toIdx=ids.indexOf(targetId);
    if(fromIdx<0||toIdx<0){schedDragId=null;schedDragSrcDk=null;return}
    ids.splice(fromIdx,1);ids.splice(toIdx,0,schedDragId);
    S.schedOrder[dk]=ids}
  else{
    /* Cross-day move: remove from source, add to target */
    var srcIds=S.schedOrder[srcDk]||getSchedIds(srcDk);
    srcIds=srcIds.filter(function(id){return id!==schedDragId});
    S.schedOrder[srcDk]=srcIds;

    var tgtIds=S.schedOrder[dk]||getSchedIds(dk);
    tgtIds=tgtIds.filter(function(id){return id!==schedDragId});
    /* Insert at target position */
    if(targetId==='__panel__'){tgtIds.unshift(schedDragId)}
    else{var tgtIdx=tgtIds.indexOf(targetId);
      if(tgtIdx>=0){tgtIds.splice(tgtIdx,0,schedDragId)}
      else{tgtIds.unshift(schedDragId)}}
    S.schedOrder[dk]=tgtIds}

  save();schedDragId=null;schedDragSrcDk=null;render()}
function schedPanelDrop(e,dk){e.preventDefault();e.stopPropagation();
  if(!schedDragId)return;schedDragDrop(e,'__panel__',dk)}
function resetSchedule(dk){delete S.schedOrder[dk];save();toast('Schedule reset to auto','info');render()}
function resetAllSchedules(){S.schedOrder={};save();toast('All schedules reset to auto','info');render()}

/* ═══════════ FEATURE: PIN / STAR ═══════════ */
function togglePin(id){if(S.pins[id])delete S.pins[id];else S.pins[id]=true;save();render();
  var modal=gel('detail-modal');if(modal&&modal.classList.contains('on'))openDetail(id)}

/* ═══════════ FEATURE: ACTIVITY LOG ═══════════ */
function addLog(id){var input=gel('d-log-input');if(!input)return;var text=input.value.trim();if(!text)return;
  if(!S.actLogs[id])S.actLogs[id]=[];
  S.actLogs[id].push({text:text,ts:new Date().toISOString()});
  save();input.value='';openDetail(id)}

/* ═══════════ FEATURE: TASK MODE TOGGLE ═══════════ */
function setTaskMode(m){S.taskMode=m;save();render()}
function setDoneSort(v){S.doneSort=v;save();render()}

/* ═══════════ FEATURE: AUTO MEETING TRACKING ═══════════ */
var mtgCheckTimer=null;
function startMeetingCheck(){
  if(mtgCheckTimer)clearInterval(mtgCheckTimer);
  mtgCheckTimer=setInterval(function(){
    if(!S.calEvents.length)return;
    var ended=getEndedUnloggedMeetings();
    if(!ended.length)return;
    var bannerEl=document.getElementById('mtg-prompt');
    if(!bannerEl){render()}
  },30000)}
function completeMeetingEnd(){openLogMeetingModal()}
function dismissMeetingEnd(){
  var ended=getEndedUnloggedMeetings();
  if(!ended.length)return;
  var e=ended[0];var pk=e.title+'|'+e.start.toISOString();
  mtgPrompted[pk]='dismissed';saveMtgPrompted();
  toast('Dismissed: '+e.title,'info');render()}

/* ═══════════ FEATURE: FOCUS MODE ═══════════ */
var focusInterval=null,focusTaskId=null,focusPaused=false,focusReturnView=null;
function openFocus(id){
  var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  focusTaskId=id;focusPaused=false;focusReturnView=focusReturnView||S.view;
  closeModal();
  /* Auto-start the task timer */
  var ts=tmrGet(id);if(!ts.started){tmrStart(id)}
  renderFocusOverlay();startFocusTick()}
function renderFocusOverlay(){
  var task=S.tasks.find(function(t){return t.id===focusTaskId});if(!task)return;
  var ts=tmrGet(focusTaskId),running=!!ts.started;
  var elapsed=tmrElapsed(focusTaskId);
  var elHrs=Math.floor(elapsed/3600),elMins=Math.floor((elapsed%3600)/60),elSecs=Math.floor(elapsed%60);
  var est=task.est||0;
  var remainSecs=Math.max(0,est*60-elapsed);
  var remHrs=Math.floor(remainSecs/3600),remMins=Math.floor((remainSecs%3600)/60),remSecs=Math.floor(remainSecs%60);
  var pct=est>0?Math.min(100,Math.round(elapsed/(est*60)*100)):0;
  var overEst=elapsed>est*60;
  var eid=escAttr(focusTaskId);

  var h='<div class="focus-overlay" id="focus-overlay">';
  h+='<div class="focus-card">';
  h+='<div class="focus-label">🎯 Focus Mode</div>';
  h+='<div class="focus-task-name">'+esc(task.item)+'</div>';

  /* Task detail badges */
  h+='<div class="focus-details">';
  h+='<span class="bg '+impCls(task.importance)+'">'+esc(task.importance)+'</span>';
  if(task.client&&task.client!=='Internal / N/A')h+='<span class="bg bg-cl">'+esc(task.client)+'</span>';
  if(task.endClient)h+='<span class="bg bg-ec">'+esc(task.endClient)+'</span>';
  if(task.campaign){var _cpfm=S.campaigns.find(function(c){return c.id===task.campaign});if(_cpfm)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber)">🎯 '+esc(_cpfm.name)+'</span>'}
  if(task.category)h+='<span class="bg bg-ca">'+esc(task.category)+'</span>';
  if(task.due)h+='<span class="bg-du">📅 '+fmtDShort(task.due)+'</span>';
  h+='</div>';

  /* Timer display */
  h+='<div class="focus-timer-display" id="focus-timer"'+(overEst?' style="color:var(--red)"':'')+'>'+String(elHrs).padStart(2,'0')+':'+String(elMins).padStart(2,'0')+':'+String(elSecs).padStart(2,'0')+'</div>';

  /* Progress bar */
  h+='<div class="focus-progress"><div class="focus-progress-fill'+(overEst?' over':'')+'" style="width:'+pct+'%"></div></div>';

  /* Remaining / estimate info */
  h+='<div class="focus-stats">';
  if(est>0){
    if(overEst){h+='<span class="focus-stat" style="color:var(--red)">Over estimate by '+fmtM(Math.round((elapsed-est*60)/60))+'</span>'}
    else{h+='<span class="focus-stat">'+fmtM(remMins)+' remaining</span>'}
    h+='<span class="focus-stat-sep">·</span>';
    h+='<span class="focus-stat">'+fmtM(est)+' estimated</span>'}
  else{h+='<span class="focus-stat">No estimate set</span>'}
  h+='</div>';

  /* Actions */
  h+='<div class="focus-actions">';
  if(focusPaused){h+='<button class="btn btn-p" onclick="TF.resumeFocus()" style="padding:10px 28px">▶ Resume</button>'}
  else{h+='<button class="btn" onclick="TF.pauseFocus()" style="padding:10px 28px">⏸ Pause</button>'}
  h+='<button class="btn btn-p" onclick="TF.doneFocus()" style="padding:10px 28px">'+CK_S+' Complete</button>';
  h+='<button class="btn btn-d" onclick="TF.closeFocus()" style="padding:10px 20px">✕ Exit</button>';
  h+='</div>';

  if(task.notes)h+='<div class="focus-notes">'+esc(task.notes)+'</div>';
  h+='</div></div>';
  var existing=gel('focus-overlay');
  if(existing){existing.outerHTML=h}else{document.querySelector('.app').insertAdjacentHTML('beforeend',h)}}
function startFocusTick(){if(focusInterval)clearInterval(focusInterval);
  focusInterval=setInterval(function(){
    if(focusPaused)return;
    var task=S.tasks.find(function(t){return t.id===focusTaskId});if(!task)return;
    var elapsed=tmrElapsed(focusTaskId);
    var est=task.est||0;
    var elHrs=Math.floor(elapsed/3600),elMins=Math.floor((elapsed%3600)/60),elSecs=Math.floor(elapsed%60);
    var overEst=est>0&&elapsed>est*60;
    var el=gel('focus-timer');if(el){
      el.textContent=String(elHrs).padStart(2,'0')+':'+String(elMins).padStart(2,'0')+':'+String(elSecs).padStart(2,'0');
      el.style.color=overEst?'var(--red)':''}
    var pct=est>0?Math.min(100,Math.round(elapsed/(est*60)*100)):0;
    var fill=document.querySelector('.focus-progress-fill');if(fill){fill.style.width=pct+'%';
      if(overEst)fill.classList.add('over');else fill.classList.remove('over')}
    /* Update remaining text */
    var stats=document.querySelector('.focus-stats');if(stats&&est>0){
      var remainSecs=Math.max(0,est*60-elapsed);var remMins=Math.floor(remainSecs/60);
      if(overEst){stats.innerHTML='<span class="focus-stat" style="color:var(--red)">Over estimate by '+fmtM(Math.round((elapsed-est*60)/60))+'</span><span class="focus-stat-sep">\u00b7</span><span class="focus-stat">'+fmtM(est)+' estimated</span>'}
      else{stats.innerHTML='<span class="focus-stat">'+fmtM(remMins)+' remaining</span><span class="focus-stat-sep">\u00b7</span><span class="focus-stat">'+fmtM(est)+' estimated</span>'}}},1000)}
function pauseFocus(){focusPaused=true;if(focusTaskId)tmrPause(focusTaskId);renderFocusOverlay()}
function resumeFocus(){focusPaused=false;if(focusTaskId)tmrStart(focusTaskId);renderFocusOverlay()}
function doneFocus(){if(focusInterval)clearInterval(focusInterval);focusInterval=null;
  var id=focusTaskId;var retView=focusReturnView;focusTaskId=null;focusReturnView=null;closeFocus();
  if(id)tmrDone(id);if(retView){nav(retView);render()}}
function closeFocus(){if(focusInterval)clearInterval(focusInterval);focusInterval=null;focusTaskId=null;focusReturnView=null;
  var el=gel('focus-overlay');if(el)el.remove()}
function setFocusDur(mins){S.focusDuration=mins}

/* ═══════════ FEATURE: COMMAND PALETTE ═══════════ */
var cmdOpen=false;
function openCmdPalette(){
  if(cmdOpen)return;cmdOpen=true;
  var h='<div class="cmd-overlay" id="cmd-overlay" onclick="TF.closeCmdPalette()">';
  h+='<div class="cmd-palette" onclick="event.stopPropagation()">';
  h+='<input class="cmd-input" id="cmd-input" placeholder="Type a command, task name, or view..." autofocus oninput="TF.cmdSearch(this.value)">';
  h+='<div class="cmd-results" id="cmd-results"></div>';
  h+='</div></div>';
  document.querySelector('.app').insertAdjacentHTML('beforeend',h);
  setTimeout(function(){var ci=gel('cmd-input');if(ci)ci.focus()},50);
  cmdSearch('')}
function closeCmdPalette(){cmdOpen=false;var el=gel('cmd-overlay');if(el)el.remove()}
function cmdSearch(q){
  var r=gel('cmd-results');if(!r)return;
  q=q.toLowerCase().trim();var results=[];
  /* Views */
  VIEWS.forEach(function(v){if(!q||v.label.toLowerCase().indexOf(q)>-1)results.push({type:'view',icon:v.icon,label:'Go to '+v.label,action:'TF.nav(\''+v.id+'\');TF.closeCmdPalette()'})});
  /* Actions */
  var actions=[{icon:'➕',label:'Add New Task',action:'TF.openAddModal();TF.closeCmdPalette()'},
    {icon:'📋',label:'Daily Summary',action:'TF.openSummary();TF.closeCmdPalette()'},
    {icon:'📊',label:'Client Report',action:'TF.openClientReport();TF.closeCmdPalette()'},
    {icon:'🔄',label:'Refresh Data',action:'TF.load();TF.closeCmdPalette()'}];
  actions.forEach(function(a){if(!q||a.label.toLowerCase().indexOf(q)>-1)results.push(a)});
  /* Tasks */
  if(q.length>=2){S.tasks.forEach(function(t){if(t.item.toLowerCase().indexOf(q)>-1||t.client.toLowerCase().indexOf(q)>-1||(t.endClient||'').toLowerCase().indexOf(q)>-1)
    results.push({type:'task',icon:'📋',label:t.item,sub:t.client+(t.endClient?' → '+t.endClient:''),action:'TF.openDetail(\''+escAttr(t.id)+'\');TF.closeCmdPalette()'})});
  /* Campaigns */
  S.campaigns.forEach(function(c){if(c.name.toLowerCase().indexOf(q)>-1||c.partner.toLowerCase().indexOf(q)>-1||(c.endClient||'').toLowerCase().indexOf(q)>-1)
    results.push({type:'campaign',icon:'🎯',label:c.name,sub:c.partner+(c.endClient?' → '+c.endClient:''),action:'TF.openCampaignDetail(\''+escAttr(c.id)+'\');TF.closeCmdPalette()'})});
  /* Templates */
  S.templates.forEach(function(t,i){if(t.name.toLowerCase().indexOf(q)>-1)
    results.push({type:'tpl',icon:'📎',label:'Use template: '+t.name,action:'TF.useTpl('+i+');TF.closeCmdPalette()'})})}
  var h='';results.slice(0,12).forEach(function(res){
    h+='<div class="cmd-item" onclick="'+res.action+'">';
    h+='<span class="cmd-icon">'+res.icon+'</span>';
    h+='<span class="cmd-label">'+esc(res.label)+'</span>';
    if(res.sub)h+='<span class="cmd-sub">'+esc(res.sub)+'</span>';
    h+='</div>'});
  if(!results.length)h='<div class="cmd-empty">No matches found</div>';
  r.innerHTML=h}

/* ═══════════ FEATURE: RECURRING TASKS ═══════════ */
async function processRecurring(){
  var td=today(),todayKey=td.toISOString().slice(0,10),dow=td.getDay(),dom=td.getDate();
  var created=0;
  for(var idx=0;idx<S.templates.length;idx++){
    var tpl=S.templates[idx];
    if(!tpl.recurrence)continue;
    var lastRun=S.recurrLast[idx];
    if(lastRun===todayKey)continue;
    var shouldRun=false;
    if(tpl.recurrence==='daily')shouldRun=true;
    else if(tpl.recurrence==='weekdays')shouldRun=dow>=1&&dow<=5;
    else if(tpl.recurrence==='weekly')shouldRun=dow===1;
    else if(tpl.recurrence==='monthly')shouldRun=dom===1;
    if(!shouldRun)continue;
    /* Check if already exists today */
    var item=tpl.item||tpl.name;
    var exists=S.tasks.some(function(t){return t.item===item&&t.due&&dayDiff(td,t.due)===0});
    if(exists)continue;
    var now=new Date();now.setHours(17,0,0,0);
    var data={item:item,due:now.toISOString(),importance:tpl.importance||'Important',category:tpl.category||'',
      client:tpl.client||'Internal / N/A',endClient:tpl.endClient||'',type:tpl.type||'Business',est:tpl.est||0,notes:tpl.notes||'',status:'Planned',flag:false,campaign:tpl.campaign||''};
    var result=await dbAddTask(data);
    if(result){S.tasks.push({id:result.id,item:item,due:now,importance:data.importance,est:data.est,category:data.category,
      client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:'Planned',flag:false,campaign:data.campaign});
      S.recurrLast[idx]=todayKey;created++}}
  if(created){save();toast('🔄 Created '+created+' recurring task'+(created>1?'s':''),'ok')}}

/* ═══════════ SIGN OUT ═══════════ */
async function signOut(){
  await _sb.auth.signOut();
  window.location.href='/login.html'}

/* ═══════════ PUBLIC API ═══════════ */
window.TF={nav:nav,load:loadData,start:tmrStart,pause:tmrPause,done:tmrDone,addTask:addTask,quickAdd:quickAdd,openAddModal:openAddModal,
  openDetail:openDetail,saveDetail:saveDetail,markAlreadyCompleted:markAlreadyCompleted,closeModal:closeModal,confirmDelete:confirmDelete,doDelete:doDelete,
  openDoneDetail:openDoneDetail,saveDoneDetail:saveDoneDetail,confirmDeleteDone:confirmDeleteDone,doDeleteDone:doDeleteDone,
  approveReview:approveReview,approveFromModal:approveFromModal,approveAndStart:approveAndStart,openReviewDetail:openReviewDetail,openReviewAt:openReviewAt,dismissReview:dismissReview,dismissFromModal:dismissFromModal,reviewPrev:reviewPrev,reviewNext:reviewNext,
  filt:function(k,v){S.filters[k]=v;render()},filtSearch:function(v){S.filters.search=v;clearTimeout(S._searchTmr);S._searchTmr=setTimeout(function(){render();var si=document.querySelector('.fl-s');if(si){si.focus();si.selectionStart=si.selectionEnd=si.value.length}},250)},clearF:function(){S.filters={client:'',endClient:'',campaign:'',cat:'',imp:'',type:'',search:'',dateFrom:'',dateTo:''};render()},
  filtNav:function(k,v){S.filters={client:'',endClient:'',campaign:'',cat:'',imp:'',type:'',search:'',dateFrom:'',dateTo:''};S.filters[k]=v;nav('tasks')},
  toggle:function(k){S.collapsed[k]=!S.collapsed[k];save();render()},
  setLayout:function(ly){S.layout=ly;save();render()},dashPer:function(v){S.dashPeriod=parseInt(v);render()},
  setQaImp:function(v){qaImp=v;var pills=document.querySelectorAll('.qa-pill');pills.forEach(function(p){p.classList.toggle('on',p.textContent===v)})},
  setGroup:function(v){S.groupBy=v;save();render()},
  toggleBulk:toggleBulk,toggleSel:toggleSel,bulkComplete:bulkComplete,bulkSelectAll:bulkSelectAll,
  openTplForm:openTplForm,saveTpl:saveTpl,delTpl:delTpl,useTpl:useTpl,useSet:useSet,fillFromTemplate:fillFromTemplate,
  addAndStart:addAndStart,setTaskMode:setTaskMode,setDoneSort:setDoneSort,openMenu:openMenu,closeMenu:closeMenu,
  completeMeetingEnd:completeMeetingEnd,dismissMeetingEnd:dismissMeetingEnd,
  openLogMeetingModal:openLogMeetingModal,logMeeting:logMeeting,refreshLogMtgEC:refreshLogMtgEC,refreshLogMtgCp:refreshLogMtgCp,
  /* New features */
  togglePin:togglePin,addLog:addLog,
  openFocus:openFocus,pauseFocus:pauseFocus,resumeFocus:resumeFocus,doneFocus:doneFocus,closeFocus:closeFocus,setFocusDur:setFocusDur,
  openCmdPalette:openCmdPalette,closeCmdPalette:closeCmdPalette,cmdSearch:cmdSearch,
  openSummary:openDailySummary,openClientReport:openClientReport,genClientReport:genClientReport,
  dragStart:dragStart,dragOver:dragOver,dragDrop:dragDrop,
  schedDragStart:schedDragStart,schedDragEnd:schedDragEnd,schedDragOver:schedDragOver,schedDragDrop:schedDragDrop,
  schedRowDragEnter:schedRowDragEnter,schedRowDragLeave:schedRowDragLeave,
  schedZoneDragEnter:schedZoneDragEnter,schedZoneDragLeave:schedZoneDragLeave,
  schedPanelDrop:schedPanelDrop,resetSchedule:resetSchedule,resetAllSchedules:resetAllSchedules,
  showCalSetup:showCalSetup,
  syncCal:function(){loadCalendar(true)},
  /* Campaign functions */
  openCampaignDetail:openCampaignDetail,saveCampaign:saveCampaign,
  openAddCampaign:openAddCampaign,addCampaign:addCampaign,
  confirmDeleteCampaign:confirmDeleteCampaign,doDeleteCampaign:doDeleteCampaign,
  openAddPayment:openAddPayment,addPayment:addPayment,
  openAddCampaignMeeting:openAddCampaignMeeting,addCampaignMeeting:addCampaignMeeting,
  refreshAddEndClients:refreshAddEndClients,refreshAddCampaigns:refreshAddCampaigns,refreshDetailEndClients:refreshDetailEndClients,refreshDetailCampaigns:refreshDetailCampaigns,fillFromCampaign:fillFromCampaign,ecAddNew:ecAddNew,
  signOut:signOut,
  toast:toast};

/* ═══════════ AUTO-REFRESH ═══════════ */
var arTimer=null;
function startAutoRefresh(){if(arTimer)clearInterval(arTimer);arTimer=setInterval(function(){loadData()},1800000)}

/* ═══════════ INIT (with auth guard) ═══════════ */
(async function(){
  /* Check auth session — redirect to login if not authenticated */
  var sess=await _sb.auth.getSession();
  if(!sess.data.session){window.location.href='/login.html';return}
  restore();S.view='schedule';buildNav();await loadData();startAutoRefresh();startMeetingCheck();
})();
