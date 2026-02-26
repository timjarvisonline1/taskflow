
/* ═══════════ DETAIL MODAL ═══════════ */
function openDetail(id){
  var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var td=today(),ts=tmrGet(id),running=!!ts.started,hasT=running||(ts.elapsed||0)>0;
  var elapsed=tmrElapsed(id),eid=escAttr(id);
  var cliOpts=S.clients.map(function(c){return'<option'+(c===(task.client||'Internal / N/A')?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var catOpts='<option value="">Select...</option>'+CATS.map(function(c){return'<option'+(c===task.category?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var impOpts=IMPS.map(function(i){return'<option'+(i===task.importance?' selected':'')+'>'+i+'</option>'}).join('');
  var typeOpts=TYPES.map(function(t){return'<option'+(t===task.type?' selected':'')+'>'+t+'</option>'}).join('');
  var isPinned=!!S.pins[id];

  var h='<div class="tf-modal-top">';
  h+='<input type="text" class="edf edf-name" id="d-item" value="'+esc(task.item)+'">';
  h+='<div style="display:flex;gap:6px;flex-shrink:0;align-items:center">';
  h+='<button class="btn" onclick="TF.togglePin(\''+eid+'\')" style="font-size:11px;padding:5px 12px;background:'+(isPinned?'rgba(255,176,48,0.15)':'var(--bg4)')+';color:'+(isPinned?'var(--amber)':'var(--t4)')+';border-color:'+(isPinned?'rgba(255,176,48,0.3)':'var(--gborder)')+'">📌 '+(isPinned?'Unpin':'Pin')+'</button>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div></div>';
  h+='<input type="hidden" id="d-id" value="'+esc(task.id)+'">';

  h+='<div class="tf-modal-badges">';
  h+='<span class="bg '+impCls(task.importance)+'">'+esc(task.importance)+'</span>';
  if(task.due){var diff=dayDiff(td,task.due);h+='<span class="bg-du'+(diff<0?' od':(diff===0?' td':''))+'">'+dueLabel(task.due,td)+'</span>'}
  if(task.flag)h+='<span class="bg bg-fl">🚩 Needs Client Input</span>';
  if(task.client&&task.client!=='Internal / N/A')h+='<span class="bg bg-cl">'+esc(task.client)+'</span>';
  if(task.endClient)h+='<span class="bg bg-ec">'+esc(task.endClient)+'</span>';
  if(task.campaign){var _cpdet=S.campaigns.find(function(c){return c.id===task.campaign});if(_cpdet)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber)">🎯 '+esc(_cpdet.name)+'</span>'}
  if(task.category)h+='<span class="bg bg-ca">'+esc(task.category)+'</span>';
  if(isPinned)h+='<span class="bg" style="background:rgba(255,176,48,0.1);color:var(--amber)">📌 Pinned</span>';
  if(hasT){h+='<span class="ed-timer-badge"><span class="dot '+(running?'pulse':'pau')+'"></span><span class="'+(running?'go':'')+'" data-tmr="'+esc(id)+'">'+fmtT(elapsed)+'</span></span>'}
  h+='</div>';

  /* ── Scheduling ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Due Date</span><input type="datetime-local" class="edf" id="d-due" value="'+(task.due?fmtISO(task.due):'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="d-imp">'+impOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="d-cat">'+catOpts+'</select></div>';
  h+='</div>';
  /* ── Details ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="d-type">'+typeOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="d-est" value="'+(task.est||'')+'" min="0" placeholder="30"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="d-cli" onchange="TF.refreshDetailEndClients()">'+cliOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="d-ec" onchange="TF.refreshDetailCampaigns();TF.ecAddNew(\'d-ec\')">'+buildEndClientOptions(task.endClient||'',task.client)+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="d-campaign" onchange="TF.fillFromCampaign()">'+buildCampaignOptions(task.campaign||'',task.client,task.endClient)+'</select></div>';
  h+='</div>';

  /* ── Options (single row) ── */
  h+='<div class="flag-row ed-flags-inline">';
  h+='<label class="flag-toggle"><input type="checkbox" id="d-flag"'+(task.flag?' checked':'')+'><span class="flag-box">🚩</span><span class="flag-text">Needs Client Input</span></label>';
  h+='<label class="flag-toggle"><input type="checkbox" id="d-already-done" onchange="var c=this.checked;document.getElementById(\'d-already-dur-wrap\').style.display=c?\'flex\':\'none\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
  h+='<div id="d-already-dur-wrap" style="display:none;align-items:center;gap:8px;margin-left:auto"><span class="ed-lbl" style="padding:0">Actual Mins</span><input type="number" id="d-already-dur" class="edf" style="width:70px;padding:6px 10px" placeholder="'+(task.est||30)+'" min="0"></div>';
  h+='</div>';

  /* ── Notes ── */
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="d-notes" placeholder="Add notes...">'+esc(task.notes)+'</textarea></div>';

  /* ── Actions: primary left, secondary right ── */
  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" onclick="TF.saveDetail()">💾 Save</button>';
  if(running){
    h+='<button class="btn" onclick="TF.pause(\''+eid+'\')">⏸ Pause</button>';
  }else{
    h+='<button class="btn btn-go" onclick="TF.start(\''+eid+'\')">▶ Start</button>';
  }
  h+='<button class="btn btn-p" onclick="TF.markAlreadyCompleted(\''+eid+'\')">'+CK_S+' Complete</button>';
  h+='<button class="btn" onclick="TF.openFocus(\''+eid+'\')" style="background:rgba(255,0,153,0.1);color:var(--pink);border-color:rgba(255,0,153,0.2)">🎯 Focus</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.confirmDelete()">🗑️</button>';
  h+='</div><div id="del-zone"></div>';

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on')}

function closeModal(){gel('detail-modal').classList.remove('on');var m=gel('modal');if(m)m.classList.remove('on')}

async function saveDetail(){
  var id=gel('d-id').value;var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  task.item=gel('d-item').value.trim();if(!task.item){toast('⚠ Item name required','warn');return}
  task.due=gel('d-due').value?new Date(gel('d-due').value):null;
  task.importance=gel('d-imp').value;task.category=gel('d-cat').value;
  task.client=gel('d-cli').value||'Internal / N/A';task.endClient=(gel('d-ec')?gel('d-ec').value:'').trim();task.type=gel('d-type').value;
  task.campaign=gel('d-campaign')?gel('d-campaign').value:'';
  if(task.campaign&&!task.endClient){var _cpsd=S.campaigns.find(function(c){return c.id===task.campaign});if(_cpsd)task.endClient=_cpsd.endClient}
  task.est=parseInt(gel('d-est').value)||0;task.notes=gel('d-notes').value;
  var wasFlagged=task.flag;
  task.flag=gel('d-flag').checked;
  if(task.flag){task.status='Need Client Input'}
  else if(wasFlagged&&!task.flag){task.status='Planned'}
  save();
  await dbEditTask(id,task);
  toast('💾 Saved: '+task.item,'ok');closeModal();render()}

async function markAlreadyCompleted(id){
  var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var alreadyDone=gel('d-already-done')&&gel('d-already-done').checked;
  if(!alreadyDone){/* Normal complete — use timer done */tmrDone(id);closeModal();return}
  /* Save fields from modal first */
  task.item=gel('d-item').value.trim();if(!task.item){toast('⚠ Item name required','warn');return}
  task.due=gel('d-due').value?new Date(gel('d-due').value):null;
  task.importance=gel('d-imp').value;task.category=gel('d-cat').value;
  task.client=gel('d-cli').value||'Internal / N/A';task.endClient=(gel('d-ec')?gel('d-ec').value:'').trim();task.type=gel('d-type').value;
  task.campaign=gel('d-campaign')?gel('d-campaign').value:'';
  if(task.campaign&&!task.endClient){var _cpmac=S.campaigns.find(function(c){return c.id===task.campaign});if(_cpmac)task.endClient=_cpmac.endClient}
  task.est=parseInt(gel('d-est').value)||0;task.notes=gel('d-notes').value;
  task.flag=gel('d-flag').checked;
  var mins=parseInt((gel('d-already-dur')||{}).value)||task.est||0;
  /* Move to done — DB first */
  var doneData={item:task.item,due:task.due,importance:task.importance,category:task.category,
    client:task.client,endClient:task.endClient,type:task.type,duration:mins,est:task.est,notes:task.notes,campaign:task.campaign||''};
  var result=await dbCompleteTask(doneData);
  if(result){await dbDeleteTask(id);
    S.tasks=S.tasks.filter(function(t){return t.id!==id});delete S.timers[id];
    S.done.unshift({id:result.id,item:task.item,completed:new Date(),due:task.due,importance:task.importance,
      category:task.category,client:task.client,endClient:task.endClient,type:task.type,
      duration:mins,est:task.est,notes:task.notes,campaign:task.campaign||''});
    save();
    toast('Completed: '+task.item+(mins?' ('+fmtM(mins)+')':''),'ok')}
  closeModal();render();renderSidebar()}

function confirmDelete(){
  var id=gel('d-id').value;var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  gel('del-zone').innerHTML='<div class="del-confirm"><span>Permanently delete "'+esc(task.item)+'"?</span><button class="btn btn-d" onclick="TF.doDelete(\''+escAttr(id)+'\')">Yes, Delete</button><button class="btn" onclick="document.getElementById(\'del-zone\').innerHTML=\'\'">Cancel</button></div>'}

async function doDelete(id){var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  await dbDeleteTask(id);
  S.tasks=S.tasks.filter(function(t){return t.id!==id});delete S.timers[id];save();
  toast('🗑️ Deleted: '+task.item,'warn');closeModal();render();renderSidebar()}

/* ═══════════ ADD TASK ═══════════ */
function openAddModal(){var now=new Date();now.setHours(17,0,0,0);var iso=now.toISOString().slice(0,16);
  var cliOpts=S.clients.map(function(c){return'<option>'+esc(c)+'</option>'}).join('');
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">➕ New Task</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  /* ── Item Name ── */
  h+='<div style="padding:6px 0"><input type="text" class="edf" id="f-item" placeholder="What needs doing?" autofocus style="font-size:15px;font-weight:600;padding:11px 14px"></div>';

  /* ── Scheduling ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Due Date</span><input type="datetime-local" class="edf" id="f-due" value="'+iso+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="f-imp">'+IMPS.map(function(i){return'<option'+(i==='Important'?' selected':'')+'>'+i+'</option>'}).join('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="f-cat"><option value="">Select...</option>'+CATS.map(function(c){return'<option>'+c+'</option>'}).join('')+'</select></div>';
  h+='</div>';
  /* ── Details ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="f-type">'+TYPES.map(function(t){return'<option>'+t+'</option>'}).join('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="f-est" placeholder="30" min="0"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="f-cli" onchange="TF.refreshAddEndClients()"><option value="">Select...</option>'+cliOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="f-ec" onchange="TF.refreshAddCampaigns();TF.ecAddNew(\'f-ec\')">'+buildEndClientOptions('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="f-campaign" onchange="TF.fillFromCampaign()">'+buildCampaignOptions('','','')+'</select></div>';
  h+='</div>';

  /* ── Options (single row) ── */
  h+='<div class="flag-row ed-flags-inline">';
  h+='<label class="flag-toggle"><input type="checkbox" id="f-flag"><span class="flag-box">🚩</span><span class="flag-text">Needs Client Input</span></label>';
  h+='<label class="flag-toggle"><input type="checkbox" id="f-done" onchange="var c=this.checked;document.getElementById(\'f-done-dur-wrap\').style.display=c?\'flex\':\'none\';document.getElementById(\'f-btn-add\').textContent=c?\'Add \\u0026 Complete\':\'Add Task\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
  h+='<div id="f-done-dur-wrap" style="display:none;align-items:center;gap:8px;margin-left:auto"><span class="ed-lbl" style="padding:0">Actual Mins</span><input type="number" id="f-done-dur" class="edf" style="width:70px;padding:6px 10px" placeholder="30" min="0"></div>';
  h+='</div>';

  /* ── Notes ── */
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="f-notes" placeholder="Additional context..." rows="2"></textarea></div>';

  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" id="f-btn-add" onclick="TF.addTask()">Add Task</button>';
  h+='<button class="btn btn-go" id="f-btn-start" onclick="TF.addAndStart()">▶ Add & Start</button>';
  if(S.templates.length){h+='<select class="per" id="f-tpl" onchange="TF.fillFromTemplate(this.value)"><option value="">📎 Use Template...</option>';
    S.templates.forEach(function(t,i){h+='<option value="'+i+'">'+esc(t.name)+'</option>'});h+='</select>'}
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  setTimeout(function(){var fi=gel('f-item');if(fi)fi.focus()},100)}

async function addTask(){var item=(gel('f-item')||{}).value;if(!item||!item.trim()){toast('⚠ Enter a task name','warn');return}
  var flagged=gel('f-flag').checked;
  var markDone=gel('f-done')&&gel('f-done').checked;
  var cpVal=(gel('f-campaign')||{}).value||'';
  var ecVal=(gel('f-ec')?gel('f-ec').value:'').trim();
  if(cpVal&&!ecVal){var _cpaf=S.campaigns.find(function(c){return c.id===cpVal});if(_cpaf)ecVal=_cpaf.endClient}
  var data={item:item.trim(),due:gel('f-due').value,importance:gel('f-imp').value,category:gel('f-cat').value,
    client:gel('f-cli').value||'Internal / N/A',endClient:ecVal,type:gel('f-type').value,est:parseInt(gel('f-est').value)||0,
    notes:gel('f-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal};
  if(markDone){
    var mins=parseInt((gel('f-done-dur')||{}).value)||data.est||0;
    var doneData={item:data.item,due:data.due?new Date(data.due):null,importance:data.importance,category:data.category,
      client:data.client,endClient:data.endClient,type:data.type,duration:mins,est:data.est,notes:data.notes,campaign:data.campaign};
    var result=await dbCompleteTask(doneData);
    if(result){S.done.unshift({id:result.id,item:data.item,completed:new Date(),due:doneData.due,importance:data.importance,
      category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:mins,est:data.est,notes:data.notes,campaign:data.campaign})}
    toast('Completed: '+data.item+(mins?' ('+fmtM(mins)+')':''),'ok')}
  else{
    var result=await dbAddTask(data);
    if(result){S.tasks.push({id:result.id,item:data.item,due:data.due?new Date(data.due):null,importance:data.importance,est:data.est,
      category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign})}
    toast('Added: '+data.item,'ok')}
  closeModal();render()}

async function addAndStart(){var item=(gel('f-item')||{}).value;if(!item||!item.trim()){toast('⚠ Enter a task name','warn');return}
  var flagged=gel('f-flag').checked;
  var cpVal=(gel('f-campaign')||{}).value||'';
  var ecVal=(gel('f-ec')?gel('f-ec').value:'').trim();
  if(cpVal&&!ecVal){var _cpas=S.campaigns.find(function(c){return c.id===cpVal});if(_cpas)ecVal=_cpas.endClient}
  var data={item:item.trim(),due:gel('f-due').value,importance:gel('f-imp').value,category:gel('f-cat').value,
    client:gel('f-cli').value||'Internal / N/A',endClient:ecVal,type:gel('f-type').value,est:parseInt(gel('f-est').value)||0,
    notes:gel('f-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal};
  var result=await dbAddTask(data);
  if(!result){toast('❌ Failed to add task','warn');return}
  var id=result.id;
  S.tasks.push({id:id,item:data.item,due:data.due?new Date(data.due):null,importance:data.importance,est:data.est,
    category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign});
  save();
  /* Start timer + enter Focus Mode */
  var t=tmrGet(id);t.started=Date.now();S.timers[id]=t;save();
  toast('▶ Added & started: '+data.item,'ok');
  focusReturnView=S.view;focusTaskId=id;focusPaused=false;
  closeModal();render();renderFocusOverlay();startFocusTick()}

function fillFromTemplate(idx){idx=parseInt(idx);if(isNaN(idx))return;var t=S.templates[idx];if(!t)return;
  var now=new Date();now.setHours(17,0,0,0);
  if(t.importance)gel('f-imp').value=t.importance;if(t.category)gel('f-cat').value=t.category;
  if(t.client){gel('f-cli').value=t.client;refreshAddEndClients()}
  if(t.endClient&&gel('f-ec'))gel('f-ec').value=t.endClient;if(t.type)gel('f-type').value=t.type;
  if(t.est)gel('f-est').value=t.est;if(t.item)gel('f-item').value=t.item;
  if(t.campaign&&gel('f-campaign'))gel('f-campaign').value=t.campaign;
  if(t.notes)gel('f-notes').value=t.notes;toast('📎 Template loaded: '+t.name,'ok')}

/* ═══════════ BULK SELECT ═══════════ */
function toggleBulk(){S.bulkMode=!S.bulkMode;if(!S.bulkMode)S.bulkSelected={};render()}
function toggleSel(id){if(S.bulkSelected[id])delete S.bulkSelected[id];else S.bulkSelected[id]=true;render()}
function bulkSelectAll(){var td=today(),filtered=applyFilters(S.tasks);
  var allSelected=filtered.every(function(t){return S.bulkSelected[t.id]});
  if(allSelected){S.bulkSelected={}}else{filtered.forEach(function(t){S.bulkSelected[t.id]=true})}render()}
async function bulkComplete(){var ids=Object.keys(S.bulkSelected);if(!ids.length)return;
  var count=0;
  for(var i=0;i<ids.length;i++){var id=ids[i];var task=S.tasks.find(function(t){return t.id===id});if(!task)continue;
    var t=tmrGet(id);if(t.started){t.elapsed=(t.elapsed||0)+(Date.now()-t.started)/1000;t.started=null}
    var mins=Math.round((t.elapsed||0)/60);if(mins===0&&task.duration>0)mins=task.duration;
    var doneData={item:task.item,due:task.due,importance:task.importance,category:task.category,
      client:task.client,endClient:task.endClient||'',type:task.type,duration:mins,est:task.est,notes:task.notes,campaign:task.campaign||''};
    var result=await dbCompleteTask(doneData);
    if(result){await dbDeleteTask(id);
      S.done.unshift({id:result.id,item:task.item,completed:new Date(),due:task.due||null,importance:task.importance,category:task.category,
        client:task.client,endClient:task.endClient||'',type:task.type,duration:mins,est:task.est,notes:task.notes,campaign:task.campaign||''});
      delete S.timers[id];count++}}
  S.tasks=S.tasks.filter(function(t){return!S.bulkSelected[t.id]});
  S.bulkSelected={};S.bulkMode=false;save();
  toast('Completed '+count+' tasks','ok');render();renderSidebar()}

/* ═══════════ LOG ENDED MEETING MODAL ═══════════ */
var _logMtgEvent=null;
function openLogMeetingModal(){
  var ended=getEndedUnloggedMeetings();
  if(!ended.length)return;
  var e=ended[0];_logMtgEvent=e;
  var dur=Math.round((e.end-e.start)/60000);
  var cliOpts='<option value="">Select...</option>'+S.clients.map(function(c){return'<option>'+esc(c)+'</option>'}).join('');
  var catOpts='<option value="">Select...</option>'+CATS.map(function(c){return'<option'+(c==='One-on-One'?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var typeOpts=TYPES.map(function(t){return'<option'+(t==='Business'?' selected':'')+'>'+t+'</option>'}).join('');

  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">📋 Log Meeting</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="tf-modal-badges" style="margin-top:4px">';
  h+='<span class="bg" style="background:rgba(255,0,153,0.1);color:var(--pink)">📅 '+fmtDShort(e.start)+'</span>';
  h+='<span class="bg" style="background:rgba(130,55,245,0.1);color:var(--purple50)">'+fmtTime(e.start)+' – '+fmtTime(e.end)+'</span>';
  h+='<span class="bg" style="background:rgba(77,166,255,0.1);color:var(--blue)">'+fmtM(dur)+' scheduled</span>';
  h+='</div>';

  /* Meeting name */
  h+='<div style="padding:6px 0"><input type="text" class="edf" id="lm-item" value="'+esc(e.title)+'" style="font-size:15px;font-weight:600;padding:11px 14px"></div>';

  /* Fields grid */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Duration (mins)</span><input type="number" class="edf" id="lm-dur" value="'+dur+'" min="0"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="lm-cat">'+catOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="lm-type">'+typeOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="lm-cli" onchange="TF.refreshLogMtgEC()">'+cliOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="lm-ec" onchange="TF.refreshLogMtgCp()">'+buildEndClientOptions('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="lm-cp">'+buildCampaignOptions('','','')+'</select></div>';
  h+='</div>';

  /* Notes */
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="lm-notes" placeholder="Meeting notes, outcomes..." rows="2"></textarea></div>';

  /* Actions */
  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" onclick="TF.logMeeting()">'+CK_S+' Log Meeting</button>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  setTimeout(function(){var fi=gel('lm-dur');if(fi)fi.focus()},100)}

function refreshLogMtgEC(){
  var cli=(gel('lm-cli')||{}).value||'';
  var ecSel=gel('lm-ec');if(!ecSel)return;
  ecSel.innerHTML=buildEndClientOptions('');refreshLogMtgCp()}
function refreshLogMtgCp(){
  var cli=(gel('lm-cli')||{}).value||'';
  var ec=(gel('lm-ec')||{}).value||'';
  var cpSel=gel('lm-cp');if(!cpSel)return;
  cpSel.innerHTML=buildCampaignOptions('',ec,cli)}

async function logMeeting(){
  var e=_logMtgEvent;if(!e)return;
  var item=(gel('lm-item')||{}).value||e.title;
  var mins=parseInt((gel('lm-dur')||{}).value)||0;
  var cat=(gel('lm-cat')||{}).value||'One-on-One';
  var type=(gel('lm-type')||{}).value||'Business';
  var cli=(gel('lm-cli')||{}).value||'Internal / N/A';
  var ec=(gel('lm-ec')||{}).value||'';
  var cpVal=(gel('lm-cp')||{}).value||'';
  var notes=(gel('lm-notes')||{}).value||'';
  var calDur=Math.round((e.end-e.start)/60000);
  var pk=e.title+'|'+e.start.toISOString();

  /* Check if a pre-created task exists */
  var existingTask=findMtgTask(e.title,e.start);
  var doneData={item:item,due:e.start,importance:'Meeting',category:cat,
    client:cli,endClient:ec,type:type,duration:mins,est:calDur,notes:notes,campaign:cpVal};
  var result=await dbCompleteTask(doneData);
  if(result){
    if(existingTask){
      await dbDeleteTask(existingTask.id);
      S.tasks=S.tasks.filter(function(tk){return tk.id!==existingTask.id});
      delete S.timers[existingTask.id]}
    S.done.unshift({id:result.id,item:item,completed:new Date(),due:e.start,
      importance:'Meeting',category:cat,client:cli,endClient:ec,type:type,
      duration:mins,est:calDur,notes:notes,campaign:cpVal})}

  mtgPrompted[pk]='confirmed';saveMtgPrompted();save();
  toast('Logged: '+item+' ('+fmtM(mins)+')','ok');
  _logMtgEvent=null;closeModal();render();renderSidebar()}

/* ═══════════ TEMPLATES ═══════════ */
function openTplForm(idx){
  var editing=idx!==undefined&&S.templates[idx];var t=editing||{name:'',item:'',importance:'Important',category:'',client:'Internal / N/A',endClient:'',type:'Business',est:0,notes:'',setName:''};
  var cliOpts=S.clients.map(function(c){return'<option'+(c===t.client?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var catOpts='<option value="">Select...</option>'+CATS.map(function(c){return'<option'+(c===t.category?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var impOpts=IMPS.map(function(i){return'<option'+(i===t.importance?' selected':'')+'>'+i+'</option>'}).join('');

  var h='<div class="tf-modal-top"><input type="text" class="edf edf-name" id="tpl-name" value="'+esc(t.name)+'" placeholder="Template name...">';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<input type="hidden" id="tpl-idx" value="'+(editing?idx:'-1')+'">';
  /* ── Default Task Name ── */
  h+='<div style="padding:6px 0"><input type="text" class="edf" id="tpl-item" value="'+esc(t.item||'')+'" placeholder="Leave blank to enter each time" style="font-size:15px;font-weight:600;padding:11px 14px"></div>';

  /* ── Defaults ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="tpl-imp">'+impOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="tpl-cat">'+catOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="tpl-est" value="'+(t.est||'')+'" placeholder="30" min="0"></div>';
  h+='</div>';
  /* ── Details ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="tpl-type"><option'+(t.type==='Business'?' selected':'')+'>Business</option><option'+(t.type==='Personal'?' selected':'')+'>Personal</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="tpl-cli">'+cliOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="tpl-ec">'+buildEndClientOptions(t.endClient||'')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Set Name</span><input type="text" class="edf" id="tpl-set" value="'+esc(t.setName||'')+'" placeholder="e.g. Monday Morning"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Recurrence</span><select class="edf" id="tpl-recur"><option value="">None</option><option'+(t.recurrence==='daily'?' selected':'')+' value="daily">Daily</option><option'+(t.recurrence==='weekdays'?' selected':'')+' value="weekdays">Weekdays</option><option'+(t.recurrence==='weekly'?' selected':'')+' value="weekly">Weekly</option><option'+(t.recurrence==='monthly'?' selected':'')+' value="monthly">Monthly</option></select></div>';
  h+='</div>';

  /* ── Notes ── */
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="tpl-notes" rows="2" placeholder="Default notes...">'+esc(t.notes||'')+'</textarea></div>';

  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" onclick="TF.saveTpl()">'+(editing?'💾 Update Template':'Create Template')+'</button>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

function saveTpl(){var name=(gel('tpl-name')||{}).value;if(!name||!name.trim()){toast('⚠ Enter a template name','warn');return}
  var tpl={name:name.trim(),item:(gel('tpl-item')||{}).value||'',importance:gel('tpl-imp').value,category:gel('tpl-cat').value,
    client:gel('tpl-cli').value||'Internal / N/A',endClient:(gel('tpl-ec')?gel('tpl-ec').value:'').trim(),type:gel('tpl-type').value,est:parseInt(gel('tpl-est').value)||0,
    notes:(gel('tpl-notes')||{}).value||'',setName:(gel('tpl-set')||{}).value||'',recurrence:(gel('tpl-recur')||{}).value||''};
  var idx=parseInt(gel('tpl-idx').value);
  if(idx>=0&&S.templates[idx]){S.templates[idx]=tpl;toast('💾 Updated: '+tpl.name,'ok')}
  else{S.templates.push(tpl);toast('Created: '+tpl.name,'ok')}
  save();closeModal();render()}

function delTpl(idx){if(!S.templates[idx])return;var name=S.templates[idx].name;
  S.templates.splice(idx,1);save();toast('🗑️ Deleted: '+name,'warn');render()}

async function useTpl(idx){var t=S.templates[idx];if(!t)return;
  var now=new Date();now.setHours(17,0,0,0);
  var item=t.item||t.name;
  var data={item:item,due:now.toISOString(),importance:t.importance||'Important',category:t.category||'',
    client:t.client||'Internal / N/A',endClient:t.endClient||'',type:t.type||'Business',est:t.est||0,notes:t.notes||'',status:'Planned',flag:false,campaign:t.campaign||''};
  var result=await dbAddTask(data);
  if(result){S.tasks.push({id:result.id,item:item,due:now,importance:data.importance,est:data.est,category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:'Planned',flag:false,campaign:data.campaign})}
  toast('Added from template: '+item,'ok');render()}

async function useSet(setName){var items=S.templates.filter(function(t){return t.setName===setName});if(!items.length)return;
  var count=0;
  for(var i=0;i<items.length;i++){var t=items[i];
    var now=new Date();now.setHours(17,0,0,0);var item=t.item||t.name;
    var data={item:item,due:now.toISOString(),importance:t.importance||'Important',category:t.category||'',
      client:t.client||'Internal / N/A',endClient:t.endClient||'',type:t.type||'Business',est:t.est||0,notes:t.notes||'',status:'Planned',flag:false,campaign:t.campaign||''};
    var result=await dbAddTask(data);
    if(result){S.tasks.push({id:result.id,item:item,due:now,importance:data.importance,est:data.est,category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:'Planned',flag:false,campaign:data.campaign});count++}}
  toast('Added '+count+' tasks from "'+setName+'"','ok');render()}

/* ═══════════ DONE DETAIL ═══════════ */
function openDoneDetail(id){
  var d=S.done.find(function(t){return t.id===id});if(!d)return;
  var td=today(),eid=escAttr(id);
  var cliOpts=S.clients.map(function(c){return'<option'+(c===(d.client||'Internal / N/A')?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var catOpts='<option value="">Select...</option>'+CATS.map(function(c){return'<option'+(c===d.category?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var impOpts=IMPS.map(function(i){return'<option'+(i===d.importance?' selected':'')+'>'+i+'</option>'}).join('');
  var typeOpts=TYPES.map(function(t){return'<option'+(t===d.type?' selected':'')+'>'+t+'</option>'}).join('');

  var h='<div class="tf-modal-top">';
  h+='<input type="text" class="edf edf-name" id="d-item" value="'+esc(d.item)+'">';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<input type="hidden" id="d-id" value="'+esc(d.id)+'">';

  h+='<div class="tf-modal-badges">';
  h+='<span class="bg" style="background:rgba(61,220,132,0.1);color:var(--green)">Completed</span>';
  if(d.importance)h+='<span class="bg '+impCls(d.importance)+'">'+esc(d.importance)+'</span>';
  if(d.completed)h+='<span class="bg-du">'+fmtDFull(d.completed)+'</span>';
  if(d.client&&d.client!=='Internal / N/A')h+='<span class="bg bg-cl">'+esc(d.client)+'</span>';
  if(d.endClient)h+='<span class="bg bg-ec">'+esc(d.endClient)+'</span>';
  if(d.campaign){var _cpdd=S.campaigns.find(function(c){return c.id===d.campaign});if(_cpdd)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber)">🎯 '+esc(_cpdd.name)+'</span>'}
  if(d.category)h+='<span class="bg bg-ca">'+esc(d.category)+'</span>';
  if(d.duration)h+='<span class="bg-es" style="color:var(--green);font-weight:600">⏱ '+fmtM(d.duration)+'</span>';
  h+='</div>';

  /* ── Scheduling ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Completed Date</span><input type="datetime-local" class="edf" id="d-completed" value="'+(d.completed?fmtISO(d.completed):'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="d-imp">'+impOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="d-cat">'+catOpts+'</select></div>';
  h+='</div>';
  /* ── Details ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="d-type">'+typeOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Duration (mins)</span><input type="number" class="edf" id="d-dur" value="'+(d.duration||'')+'" min="0" placeholder="Actual"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="d-est" value="'+(d.est||'')+'" min="0"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="d-cli" onchange="TF.refreshDetailEndClients()">'+cliOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="d-ec" onchange="TF.refreshDetailCampaigns();TF.ecAddNew(\'d-ec\')">'+buildEndClientOptions(d.endClient||'',d.client)+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="d-campaign" onchange="TF.fillFromCampaign()">'+buildCampaignOptions(d.campaign||'',d.client,d.endClient)+'</select></div>';
  h+='</div>';

  /* ── Notes ── */
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="d-notes" placeholder="Add notes...">'+esc(d.notes||'')+'</textarea></div>';

  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" onclick="TF.saveDoneDetail()">💾 Save</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.confirmDeleteDone()">🗑️</button>';
  h+='</div><div id="del-zone"></div>';

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on')}

async function saveDoneDetail(){
  var id=gel('d-id').value;var d=S.done.find(function(t){return t.id===id});if(!d)return;
  d.item=gel('d-item').value.trim();if(!d.item){toast('⚠ Item name required','warn');return}
  d.completed=gel('d-completed').value?new Date(gel('d-completed').value):d.completed;
  d.importance=gel('d-imp').value;d.category=gel('d-cat').value;
  d.client=gel('d-cli').value||'Internal / N/A';d.endClient=(gel('d-ec')?gel('d-ec').value:'').trim();d.type=gel('d-type').value;
  d.campaign=gel('d-campaign')?gel('d-campaign').value:'';
  d.duration=parseInt(gel('d-dur').value)||0;d.est=parseInt(gel('d-est').value)||0;
  d.notes=gel('d-notes').value;
  await _sb.from('done').update({item:d.item,completed:d.completed?d.completed.toISOString():null,
    importance:d.importance,category:d.category,client:d.client,end_client:d.endClient||'',type:d.type,
    duration:d.duration,est:d.est,notes:d.notes,campaign:d.campaign||''}).eq('id',id);
  toast('💾 Saved: '+d.item,'ok');closeModal();render()}

function confirmDeleteDone(){
  var id=gel('d-id').value;var d=S.done.find(function(t){return t.id===id});if(!d)return;
  gel('del-zone').innerHTML='<div class="del-confirm"><span>Permanently delete "'+esc(d.item)+'"?</span><button class="btn btn-d" onclick="TF.doDeleteDone(\''+escAttr(id)+'\')">Yes, Delete</button><button class="btn" onclick="document.getElementById(\'del-zone\').innerHTML=\'\'">Cancel</button></div>'}

async function doDeleteDone(id){var d=S.done.find(function(t){return t.id===id});if(!d)return;
  await _sb.from('done').delete().eq('id',id);
  S.done=S.done.filter(function(t){return t.id!==id});
  toast('🗑️ Deleted: '+d.item,'warn');closeModal();render()}

/* ═══════════ REVIEW MODALS ═══════════ */
function openReviewAt(idx){
  var items=reviewSorted();if(!items.length)return;
  reviewIdx=Math.max(0,Math.min(idx,items.length-1));
  openReviewDetail(items[reviewIdx].id)}

function openReviewDetail(id){
  var r=S.review.find(function(t){return t.id===id});if(!r)return;
  var items=reviewSorted();
  var curIdx=items.findIndex(function(t){return t.id===id});
  reviewIdx=curIdx>=0?curIdx:0;
  var eid=escAttr(id);
  var cliOpts=S.clients.map(function(c){return'<option'+(c===(r.client||'Internal / N/A')?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var catOpts='<option value="">Select...</option>'+CATS.map(function(c){return'<option'+(c===r.category?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var impOpts=IMPS.map(function(i){return'<option'+(i===r.importance?' selected':'')+'>'+i+'</option>'}).join('');
  var typeOpts=TYPES.map(function(t){return'<option'+(t===r.type?' selected':'')+'>'+t+'</option>'}).join('');

  var h='<div class="tf-modal-top">';
  h+='<input type="text" class="edf edf-name" id="d-item" value="'+esc(r.item)+'">';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<input type="hidden" id="d-id" value="'+esc(r.id)+'">';

  h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px;margin-bottom:8px">';
  h+='<div class="tf-modal-badges" style="border:none;margin:0;padding:0">';
  h+='<span class="bg" style="background:rgba(255,0,153,0.1);color:var(--pink)">📥 Review</span>';
  h+='<span class="bg '+impCls(r.importance)+'">'+esc(r.importance)+'</span>';
  if(r.created)h+='<span class="bg-du" style="color:var(--t4)">Received '+fmtDShort(r.created)+'</span>';
  h+='</div>';
  if(items.length>1){
    h+='<div style="display:flex;align-items:center;gap:6px">';
    h+='<button class="ab ab-sm" style="background:var(--bg4);color:var(--t3)'+(curIdx<=0?';opacity:.3;pointer-events:none':'')+'" onclick="TF.reviewPrev()" title="Previous">◀</button>';
    h+='<span style="font-size:11px;color:var(--t3);min-width:40px;text-align:center;font-family:var(--fd);font-weight:600">'+(curIdx+1)+' / '+items.length+'</span>';
    h+='<button class="ab ab-sm" style="background:var(--bg4);color:var(--t3)'+(curIdx>=items.length-1?';opacity:.3;pointer-events:none':'')+'" onclick="TF.reviewNext()" title="Next">▶</button>';
    h+='</div>'}
  h+='</div>';

  if(r.source){h+='<div style="padding:12px 16px;margin:10px 0;background:var(--bg1);border:1px solid var(--gborder);border-radius:var(--r);font-size:12px;color:var(--t3);line-height:1.65"><span style="font-size:9px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">📧 Original Email</span>'+esc(r.source)+'</div>'}

  /* ── Scheduling ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Due Date</span><input type="datetime-local" class="edf" id="d-due" value="'+(r.due?fmtISO(r.due):'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="d-imp">'+impOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="d-cat">'+catOpts+'</select></div>';
  h+='</div>';
  /* ── Details ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="d-type">'+typeOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="d-est" value="'+(r.est||'')+'" min="0" placeholder="30"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="d-cli" onchange="TF.refreshDetailEndClients()">'+cliOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="d-ec" onchange="TF.refreshDetailCampaigns();TF.ecAddNew(\'d-ec\')">'+buildEndClientOptions(r.endClient||'',r.client)+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="d-campaign" onchange="TF.fillFromCampaign()">'+buildCampaignOptions(r.campaign||'',r.client,r.endClient)+'</select></div>';
  h+='</div>';

  /* ── Options (single row) ── */
  h+='<div class="flag-row ed-flags-inline">';
  h+='<label class="flag-toggle"><input type="checkbox" id="d-flag"><span class="flag-box">🚩</span><span class="flag-text">Needs Client Input</span></label>';
  h+='<label class="flag-toggle"><input type="checkbox" id="d-done" onchange="var c=this.checked;document.getElementById(\'d-done-dur-wrap\').style.display=c?\'flex\':\'none\';document.getElementById(\'d-btn-add\').textContent=c?\'Add \\u0026 Complete\':\'Add as Task\';document.getElementById(\'d-btn-start\').style.display=c?\'none\':\'\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
  h+='<div id="d-done-dur-wrap" style="display:none;align-items:center;gap:8px;margin-left:auto"><span class="ed-lbl" style="padding:0">Actual Mins</span><input type="number" id="d-done-dur" class="edf" style="width:70px;padding:6px 10px" placeholder="'+(r.est||30)+'" min="0"></div>';
  h+='</div>';

  /* ── Notes ── */
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="d-notes" placeholder="Add notes...">'+esc(r.notes||'')+'</textarea></div>';

  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" id="d-btn-add" onclick="TF.approveFromModal()">Add as Task</button>';
  h+='<button class="btn btn-go" id="d-btn-start" onclick="TF.approveAndStart()">▶ Add & Start</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.dismissFromModal()">✕ Dismiss</button>';
  h+='</div>';

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on')}

async function approveReview(id){
  var r=S.review.find(function(t){return t.id===id});if(!r)return;
  var data={item:r.item,due:r.due?r.due.toISOString():'',importance:r.importance,category:r.category,
    client:r.client||'Internal / N/A',endClient:r.endClient||'',type:r.type,est:r.est,notes:r.notes,status:'Planned',flag:false,campaign:r.campaign||''};
  var result=await dbAddTask(data);
  if(result){S.tasks.push({id:result.id,item:r.item,due:r.due,importance:r.importance,est:r.est,category:r.category,
    client:r.client||'Internal / N/A',endClient:r.endClient||'',type:r.type,duration:0,notes:r.notes,status:'Planned',flag:false,campaign:r.campaign||''})}
  await dbDeleteReview(id);
  S.review=S.review.filter(function(rv){return rv.id!==id});
  toast('Added: '+r.item,'ok');advanceReview()}

function reviewGetDue(){var v=gel('d-due').value;if(v)return v;return fmtISO(new Date())}
async function approveFromModal(){
  var id=gel('d-id').value;var r=S.review.find(function(t){return t.id===id});if(!r)return;
  var item=gel('d-item').value.trim();if(!item){toast('⚠ Item name required','warn');return}
  var flagged=gel('d-flag').checked;
  var markDone=gel('d-done')&&gel('d-done').checked;
  var dueVal=reviewGetDue();
  var cpVal2=gel('d-campaign')?gel('d-campaign').value:'';
  var data={item:item,due:dueVal,importance:gel('d-imp').value,category:gel('d-cat').value,
    client:gel('d-cli').value||'Internal / N/A',endClient:(gel('d-ec')?gel('d-ec').value:'').trim(),type:gel('d-type').value,est:parseInt(gel('d-est').value)||0,
    notes:gel('d-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal2};
  await dbDeleteReview(id);
  S.review=S.review.filter(function(rv){return rv.id!==id});
  if(markDone){
    var mins=parseInt((gel('d-done-dur')||{}).value)||data.est||0;
    var dueDate=dueVal?new Date(dueVal):null;
    var doneData={item:data.item,due:dueVal||null,importance:data.importance,category:data.category,
      client:data.client,endClient:data.endClient,type:data.type,duration:mins,est:data.est,notes:data.notes,campaign:data.campaign};
    var result=await dbCompleteTask(doneData);
    if(result){S.done.unshift({id:result.id,item:data.item,completed:new Date(),due:dueDate,importance:data.importance,category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:mins,est:data.est,notes:data.notes,campaign:data.campaign})}
    toast('Completed: '+data.item+(mins?' ('+fmtM(mins)+')':''),'ok')}
  else{
    var result=await dbAddTask(data);
    if(result){S.tasks.push({id:result.id,item:data.item,due:dueVal?new Date(dueVal):null,importance:data.importance,est:data.est,
      category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign})}
    toast('Added: '+data.item,'ok')}
  advanceReview()}

async function approveAndStart(){
  /* If already-completed is checked, route through the completed path instead */
  if(gel('d-done')&&gel('d-done').checked){approveFromModal();return}
  var id=gel('d-id').value;var r=S.review.find(function(t){return t.id===id});if(!r)return;
  var item=gel('d-item').value.trim();if(!item){toast('⚠ Item name required','warn');return}
  var flagged=gel('d-flag').checked;
  var dueVal=reviewGetDue();
  var cpVal3=gel('d-campaign')?gel('d-campaign').value:'';
  var data={item:item,due:dueVal,importance:gel('d-imp').value,category:gel('d-cat').value,
    client:gel('d-cli').value||'Internal / N/A',endClient:(gel('d-ec')?gel('d-ec').value:'').trim(),type:gel('d-type').value,est:parseInt(gel('d-est').value)||0,
    notes:gel('d-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal3};
  var result=await dbAddTask(data);
  if(!result)return;
  var taskId=result.id;
  S.tasks.push({id:taskId,item:data.item,due:dueVal?new Date(dueVal):null,importance:data.importance,est:data.est,
    category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign});
  await dbDeleteReview(id);
  S.review=S.review.filter(function(rv){return rv.id!==id});
  toast('▶ Added & started: '+data.item,'ok');
  /* Start timer on the new task — timer is local only, no DB write needed */
  var t=tmrGet(taskId);t.started=Date.now();S.timers[taskId]=t;save();
  render();
  /* Set return view to review so user returns there after completing focus */
  focusReturnView='review';focusTaskId=taskId;focusPaused=false;
  closeModal();renderFocusOverlay();startFocusTick()}

async function dismissReview(id){
  var r=S.review.find(function(t){return t.id===id});if(!r)return;
  await dbDeleteReview(id);
  S.review=S.review.filter(function(rv){return rv.id!==id});
  toast('Dismissed','info');advanceReview()}

async function dismissFromModal(){
  var id=gel('d-id').value;
  await dbDeleteReview(id);
  S.review=S.review.filter(function(rv){return rv.id!==id});
  toast('Dismissed','info');advanceReview()}

function advanceReview(){
  var items=reviewSorted();
  if(!items.length){closeModal();render();return}
  if(reviewIdx>=items.length)reviewIdx=items.length-1;
  render();openReviewDetail(items[reviewIdx].id)}

function reviewPrev(){
  var items=reviewSorted();if(reviewIdx>0){reviewIdx--;openReviewDetail(items[reviewIdx].id)}}
function reviewNext(){
  var items=reviewSorted();if(reviewIdx<items.length-1){reviewIdx++;openReviewDetail(items[reviewIdx].id)}}

/* ═══════════ DAILY SUMMARY ═══════════ */
function openDailySummary(){
  var td=today(),now=new Date();
  var todayDone=S.done.filter(function(d){return d.completed&&d.completed>=td});
  var todayMins=0;todayDone.forEach(function(d){todayMins+=d.duration});
  var carryOver=S.tasks.filter(function(t){return t.due&&t.due<=now}).sort(function(a,b){return(b._score||0)-(a._score||0)});
  var chaseItems=S.tasks.filter(function(t){return t.flag||t.status==='Need Client Input'});
  var inProg=[];Object.keys(S.timers).forEach(function(id){var tm=S.timers[id];if(tm.started||tm.elapsed>0){var tk=S.tasks.find(function(t){return t.id===id});if(tk)inProg.push(tk)}});

  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">📋 Daily Summary</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';

  h+='<div class="summary-date">'+now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})+'</div>';

  h+='<div class="summary-stats">';
  h+='<div class="summary-stat"><div class="summary-stat-v" style="color:var(--green)">'+todayDone.length+'</div><div class="summary-stat-l">Completed</div></div>';
  h+='<div class="summary-stat"><div class="summary-stat-v" style="color:var(--pink)">'+fmtM(todayMins)+'</div><div class="summary-stat-l">Tracked</div></div>';
  h+='<div class="summary-stat"><div class="summary-stat-v" style="color:var(--amber)">'+carryOver.length+'</div><div class="summary-stat-l">Carry Over</div></div>';
  h+='<div class="summary-stat"><div class="summary-stat-v" style="color:var(--cyan)">'+chaseItems.length+'</div><div class="summary-stat-l">Chasing</div></div>';
  h+='</div>';

  if(todayDone.length){h+='<div class="summary-section"><div class="summary-section-h">Done Today</div>';
    todayDone.forEach(function(d){h+='<div class="summary-item"><span class="bg '+impCls(d.importance||'Important')+'" style="font-size:10px;padding:2px 7px">'+(d.importance||'I').charAt(0)+'</span> '+esc(d.item)+' <span style="color:var(--green);font-weight:600;font-family:var(--fd)">'+fmtM(d.duration)+'</span></div>'});
    h+='</div>'}
  if(inProg.length){h+='<div class="summary-section"><div class="summary-section-h">In Progress</div>';
    inProg.forEach(function(t){h+='<div class="summary-item">🟢 '+esc(t.item)+' <span style="color:var(--green);font-family:var(--fd)">'+fmtT(tmrElapsed(t.id))+'</span></div>'});
    h+='</div>'}
  if(carryOver.length){h+='<div class="summary-section"><div class="summary-section-h">Carrying Over</div>';
    carryOver.slice(0,8).forEach(function(t){var od=t.due&&t.due<td;h+='<div class="summary-item"><span class="bg '+impCls(t.importance)+'" style="font-size:10px;padding:2px 7px">'+(t.importance||'I').charAt(0)+'</span> '+esc(t.item)+(od?' <span style="color:var(--red);font-weight:600">overdue</span>':'')+'</div>'});
    if(carryOver.length>8)h+='<div style="font-size:11px;color:var(--t4);padding:4px 0">+ '+(carryOver.length-8)+' more</div>';
    h+='</div>'}
  if(chaseItems.length){h+='<div class="summary-section"><div class="summary-section-h">Needs Chasing</div>';
    chaseItems.forEach(function(t){h+='<div class="summary-item">🚩 '+esc(t.item)+(t.client&&t.client!=='Internal / N/A'?' <span style="color:var(--pink50)">'+esc(t.client)+'</span>':'')+(t.endClient?' <span style="color:var(--teal)">EC: '+esc(t.endClient)+'</span>':'')+'</div>'});
    h+='</div>'}

  /* Copyable text version */
  var txt=now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'\n\n';
  txt+='DONE ('+todayDone.length+', '+fmtM(todayMins)+'):\n';
  todayDone.forEach(function(d){txt+='  - '+d.item+' ('+fmtM(d.duration)+')\n'});
  if(carryOver.length){txt+='\nCARRY OVER ('+carryOver.length+'):\n';carryOver.slice(0,8).forEach(function(t){txt+='  - '+t.item+'\n'})}
  if(chaseItems.length){txt+='\nNEEDS CHASING ('+chaseItems.length+'):\n';chaseItems.forEach(function(t){txt+='  - '+t.item+(t.client&&t.client!=='Internal / N/A'?' ['+t.client+']':'')+(t.endClient?' (EC: '+t.endClient+')':'')+'\n'})}

  h+='<div style="margin-top:16px"><button class="btn btn-p" onclick="navigator.clipboard.writeText('+esc(JSON.stringify(txt)).replace(/'/g,"\\'")+');TF.toast(\'Copied to clipboard\',\'ok\')" style="padding:8px 18px;font-size:12px">📋 Copy Summary</button></div>';

  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

/* ═══════════ CLIENT TIME REPORT ═══════════ */
function openClientReport(){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">📊 Client Time Report</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="frm" style="margin-top:8px"><div class="frm-grid">';
  h+='<div class="fld"><label>Client</label><select id="rpt-cli"><option value="">All Clients</option>';
  S.clients.forEach(function(c){h+='<option>'+esc(c)+'</option>'});h+='</select></div>';
  h+='<div class="fld"><label>Campaign</label><select id="rpt-cp"><option value="">All Campaigns</option>';
  S.campaigns.forEach(function(c){h+='<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>'});h+='</select></div>';
  h+='<div class="fld"><label>From</label><input type="date" id="rpt-from"></div>';
  h+='<div class="fld"><label>To</label><input type="date" id="rpt-to"></div>';
  h+='</div><button class="btn btn-p" onclick="TF.genClientReport()" style="margin-top:12px">Generate Report</button></div>';
  h+='<div id="rpt-output"></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}
function genClientReport(){
  var cli=gel('rpt-cli').value,cpFilter=gel('rpt-cp')?gel('rpt-cp').value:'',from=gel('rpt-from').value?new Date(gel('rpt-from').value):null,to=gel('rpt-to').value?new Date(gel('rpt-to').value):null;
  if(to){to.setHours(23,59,59)}
  var items=S.done.filter(function(d){
    if(cli&&d.client!==cli)return false;
    if(cpFilter&&d.campaign!==cpFilter)return false;
    if(from&&d.completed&&d.completed<from)return false;
    if(to&&d.completed&&d.completed>to)return false;return true});
  if(!items.length){gel('rpt-output').innerHTML='<div class="no-data" style="padding:20px">No tasks found for this filter.</div>';return}
  var totalMins=0;items.forEach(function(d){totalMins+=d.duration});
  var catBreak={};items.forEach(function(d){var c=d.category||'Uncategorised';catBreak[c]=(catBreak[c]||0)+d.duration});
  var catKeys=Object.keys(catBreak).sort(function(a,b){return catBreak[b]-catBreak[a]});
  var maxCat=catKeys.length?catBreak[catKeys[0]]:1;

  var h='<div class="rpt-summary">';
  h+='<div class="rpt-title">'+esc(cli||'All Clients')+' Time Report</div>';
  if(from||to)h+='<div class="rpt-period">'+(from?from.toLocaleDateString('en-GB'):'Start')+' - '+(to?to.toLocaleDateString('en-GB'):'Now')+'</div>';
  h+='<div class="summary-stats" style="margin:16px 0">';
  h+='<div class="summary-stat"><div class="summary-stat-v" style="color:var(--green)">'+items.length+'</div><div class="summary-stat-l">Tasks</div></div>';
  h+='<div class="summary-stat"><div class="summary-stat-v" style="color:var(--pink)">'+fmtM(totalMins)+'</div><div class="summary-stat-l">Total Time</div></div>';
  h+='<div class="summary-stat"><div class="summary-stat-v" style="color:var(--blue)">'+fmtM(Math.round(totalMins/items.length))+'</div><div class="summary-stat-l">Avg / Task</div></div>';
  h+='</div>';

  h+='<div style="margin-bottom:14px">';
  catKeys.forEach(function(c,i){var pct=Math.round(catBreak[c]/maxCat*100);
    h+='<div class="cb-row"><span class="cb-lbl">'+esc(c)+'</span><div class="cb-trk"><div class="cb-fill" style="width:'+pct+'%;background:'+P[i%P.length]+'"></div></div><span class="cb-val" style="color:'+P[i%P.length]+'">'+fmtM(catBreak[c])+'</span></div>'});
  h+='</div>';

  h+='<div class="tb-wrap"><table class="tb"><thead><tr><th style="width:30%">Task</th><th style="width:15%">Category</th><th style="width:12%">End Client</th><th style="width:13%">Date</th><th class="r" style="width:10%">Est.</th><th class="r" style="width:10%">Actual</th></tr></thead><tbody>';
  items.sort(function(a,b){return(b.completed?b.completed.getTime():0)-(a.completed?a.completed.getTime():0)});
  items.forEach(function(d){
    h+='<tr><td>'+esc(d.item)+'</td><td style="color:var(--t3)">'+esc(d.category)+'</td>';
    h+='<td style="color:var(--teal)">'+esc(d.endClient||'')+'</td>';
    h+='<td style="color:var(--t3)">'+(d.completed?fmtDShort(d.completed):'')+'</td>';
    h+='<td class="nm" style="color:var(--blue)">'+fmtM(d.est)+'</td><td class="nm" style="color:var(--pink50)">'+fmtM(d.duration)+'</td></tr>'});
  h+='</tbody></table></div>';

  /* Copyable */
  var txt=esc(cli||'All Clients')+' Time Report\n';
  if(from||to)txt+=(from?from.toLocaleDateString('en-GB'):'Start')+' - '+(to?to.toLocaleDateString('en-GB'):'Now')+'\n';
  txt+='\nTotal: '+items.length+' tasks, '+fmtM(totalMins)+'\n\n';
  catKeys.forEach(function(c){txt+=c+': '+fmtM(catBreak[c])+'\n'});
  txt+='\nDetail:\n';items.forEach(function(d){txt+='  - '+d.item+' ('+fmtM(d.duration)+')\n'});

  h+='<button class="btn btn-p" onclick="navigator.clipboard.writeText('+esc(JSON.stringify(txt)).replace(/'/g,"\\'")+');TF.toast(\'Copied!\',\'ok\')" style="margin-top:12px;padding:8px 18px;font-size:12px">📋 Copy Report</button>';
  h+='</div>';
  gel('rpt-output').innerHTML=h}

/* ═══════════ CALENDAR SETUP ═══════════ */
function showCalSetup(){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">📅 Connect Google Calendar</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div style="padding:4px 0;font-size:13px;color:var(--t2);line-height:1.7">';
  h+='<p style="margin-bottom:14px">Connect your Google Calendar to see your busy/free time on the Today view. TaskFlow will automatically calculate your real available capacity.</p>';
  h+='<div class="summary-section"><div class="summary-section-h">Setup Steps</div>';
  h+='<div class="summary-item" style="gap:10px"><span style="font-weight:700;color:var(--pink);min-width:20px">1</span> Go to <a href="https://script.google.com" target="_blank" style="color:var(--pink)">script.google.com</a> and create a new project</div>';
  h+='<div class="summary-item" style="gap:10px"><span style="font-weight:700;color:var(--pink);min-width:20px">2</span> Paste the Calendar Bridge script (provided separately)</div>';
  h+='<div class="summary-item" style="gap:10px"><span style="font-weight:700;color:var(--pink);min-width:20px">3</span> Click Deploy > New Deployment > Web App</div>';
  h+='<div class="summary-item" style="gap:10px"><span style="font-weight:700;color:var(--pink);min-width:20px">4</span> Set "Execute as: Me" and "Who has access: Anyone"</div>';
  h+='<div class="summary-item" style="gap:10px"><span style="font-weight:700;color:var(--pink);min-width:20px">5</span> Copy the deployment URL</div>';
  h+='<div class="summary-item" style="gap:10px"><span style="font-weight:700;color:var(--pink);min-width:20px">6</span> Paste it into <code style="background:var(--bg3);padding:2px 6px;border-radius:4px;font-size:11px">CONFIG.calendarURL</code> in your JS code block</div>';
  h+='</div>';
  h+='<p style="margin-top:14px;font-size:11px;color:var(--t4)">The script only reads event titles and times from your primary calendar. No descriptions, attendees, or private data is exposed.</p>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

/* ═══════════ CASCADING DROPDOWN HELPERS ═══════════ */
/* Order: Client → End Client → Campaign */
/* Client filters which End Clients appear; End Client filters which Campaigns appear */

function buildEndClientOptions(currentValue,filterClient){
  var ecs=[];
  S.campaigns.forEach(function(c){
    if(filterClient&&c.partner!==filterClient)return;
    if(c.endClient&&ecs.indexOf(c.endClient)===-1)ecs.push(c.endClient)});
  S.tasks.concat(S.done).forEach(function(t){
    if(filterClient&&t.client!==filterClient)return;
    if(t.endClient&&ecs.indexOf(t.endClient)===-1)ecs.push(t.endClient)});
  ecs.sort();
  var isNew=currentValue&&ecs.indexOf(currentValue)===-1;
  var h='<option value="">None</option>';
  ecs.forEach(function(ec){h+='<option value="'+esc(ec)+'"'+(currentValue===ec?' selected':'')+'>'+esc(ec)+'</option>'});
  if(isNew)h+='<option value="'+esc(currentValue)+'" selected>'+esc(currentValue)+'</option>';
  h+='<option value="__addnew__">➕ Add New...</option>';
  return h}

function buildCampaignOptions(currentValue,filterClient,filterEC){
  var opts='<option value="">None</option>';
  S.campaigns.filter(function(c){
    if(filterClient&&c.partner!==filterClient)return false;
    if(filterEC&&c.endClient!==filterEC)return false;
    return true}).forEach(function(c){
    opts+='<option value="'+esc(c.id)+'"'+(currentValue===c.id?' selected':'')+'>'+esc(c.name)+'</option>'});
  return opts}

function ecAddNew(selId){
  var sel=gel(selId);if(!sel||sel.value!=='__addnew__')return;
  var inp=cel('input');inp.type='text';inp.id=selId;inp.className=sel.className||'edf';
  inp.placeholder='Type new End Client name...';inp.style.cssText=sel.style.cssText||'';
  sel.parentNode.replaceChild(inp,sel);inp.focus()}

/* Cascade refresh for Add modal (f- prefix) */
function refreshAddEndClients(){
  var client=gel('f-cli')?gel('f-cli').value:'';
  var ecSel=gel('f-ec');if(ecSel&&ecSel.tagName==='SELECT')ecSel.innerHTML=buildEndClientOptions('',client);
  refreshAddCampaigns()}
function refreshAddCampaigns(){
  var client=gel('f-cli')?gel('f-cli').value:'';
  var ec=gel('f-ec')?gel('f-ec').value:'';if(ec==='__addnew__')ec='';
  var sel=gel('f-campaign');if(!sel)return;
  sel.innerHTML=buildCampaignOptions('',client,ec)}

/* Cascade refresh for Detail modal (d- prefix) */
function refreshDetailEndClients(){
  var client=gel('d-cli')?gel('d-cli').value:'';
  var ecSel=gel('d-ec');if(ecSel&&ecSel.tagName==='SELECT'){var cur=ecSel.value;ecSel.innerHTML=buildEndClientOptions(cur,client)}
  refreshDetailCampaigns()}
function refreshDetailCampaigns(){
  var client=gel('d-cli')?gel('d-cli').value:'';
  var ec=gel('d-ec')?gel('d-ec').value:'';if(ec==='__addnew__')ec='';
  var sel=gel('d-campaign');if(!sel)return;
  var cur=sel.value;
  sel.innerHTML=buildCampaignOptions(cur,client,ec)}

function fillFromCampaign(){
  var sel=gel('f-campaign')||gel('d-campaign');
  if(!sel||!sel.value)return;
  var cp=S.campaigns.find(function(c){return c.id===sel.value});if(!cp)return;
  var ecField=gel('f-ec')||gel('d-ec');
  if(ecField&&!ecField.value&&cp.endClient)ecField.value=cp.endClient}

/* ═══════════ CAMPAIGN DETAIL MODAL ═══════════ */
function openCampaignDetail(id){
  var cp=S.campaigns.find(function(c){return c.id===id});if(!cp)return;
  var st=getCampaignStats(cp);var td_=today();
  var statusCls=cp.status.toLowerCase().replace(/ /g,'-');
  var PLATFORMS=['Meta','Google Ads','YouTube','LinkedIn','TikTok','Microsoft Ads','Programmatic','Multiple','Other'];
  var STATUSES=['Setup','Active','Paused','Completed','Archived'];
  var TERMS=['1 month','2 months','3 months','4 months','5 months','6 months','7 months','8 months','9 months','10 months','11 months','12 months','18 months','24 months','Ongoing'];

  var h='<div class="tf-modal-top">';
  h+='<input type="text" class="edf edf-name" id="cp-name" value="'+esc(cp.name)+'">';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<input type="hidden" id="cp-id" value="'+esc(cp.id)+'">';

  h+='<div class="tf-modal-badges">';
  h+='<span class="bg bg-'+(cp.status==='Active'?'im':cp.status==='Setup'?'mt':cp.status==='Paused'?'wt':'cr')+'">'+esc(cp.status)+'</span>';
  if(cp.platform)h+='<span class="bg bg-ca">'+esc(cp.platform)+'</span>';
  h+='<span class="bg bg-cl">'+esc(cp.partner)+'</span>';
  if(cp.endClient)h+='<span class="bg bg-ec">'+esc(cp.endClient)+'</span>';
  h+='</div>';

  /* Edit grid */
  h+='<div class="ed-grid">';
  h+='<div class="ed-fld"><span class="ed-lbl">Partner</span><select class="edf" id="cp-partner">';
  S.clients.forEach(function(c){h+='<option'+(c===cp.partner?' selected':'')+'>'+esc(c)+'</option>'});h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="cp-ec" onchange="TF.ecAddNew(\'cp-ec\')">'+buildEndClientOptions(cp.endClient||'')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Status</span><select class="edf" id="cp-status">';
  STATUSES.forEach(function(s){h+='<option'+(s===cp.status?' selected':'')+'>'+s+'</option>'});h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Platform</span><select class="edf" id="cp-platform"><option value="">Select...</option>';
  PLATFORMS.forEach(function(p){h+='<option'+(p===cp.platform?' selected':'')+'>'+p+'</option>'});h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign Term</span><select class="edf" id="cp-term"><option value="">Select...</option>';
  TERMS.forEach(function(t){h+='<option'+(t===cp.campaignTerm?' selected':'')+'>'+t+'</option>'});h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Planned Launch</span><input type="date" class="edf" id="cp-planned" value="'+(cp.plannedLaunch?cp.plannedLaunch.toISOString().slice(0,10):'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Actual Launch</span><input type="date" class="edf" id="cp-actual" value="'+(cp.actualLaunch?cp.actualLaunch.toISOString().slice(0,10):'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Renewal Date</span><input type="date" class="edf" id="cp-renewal" value="'+(cp.renewalDate?cp.renewalDate.toISOString().slice(0,10):'')+'"></div>';
  h+='<div class="ed-fld full"><span class="ed-lbl">Goal</span><input type="text" class="edf" id="cp-goal" value="'+esc(cp.goal)+'" placeholder="Campaign goal..."></div>';
  h+='</div>';

  /* Fees */
  h+='<div class="cp-detail-section"><h3>💰 Fees</h3>';
  h+='<div class="cp-fees-grid">';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Strategy Fee</div><input type="number" class="edf" id="cp-strategyFee" value="'+(cp.strategyFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Set-Up Fee</div><input type="number" class="edf" id="cp-setupFee" value="'+(cp.setupFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Monthly Fee</div><input type="number" class="edf" id="cp-monthlyFee" value="'+(cp.monthlyFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Monthly Ad Spend</div><input type="number" class="edf" id="cp-monthlyAdSpend" value="'+(cp.monthlyAdSpend||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='</div>';
  var oneOff=cp.strategyFee+cp.setupFee;var monthly=cp.monthlyFee+cp.monthlyAdSpend;
  h+='<div class="cp-fee-total"><div class="cp-fee-total-label">One-off: '+fmtUSD(oneOff)+' · Monthly: '+fmtUSD(monthly)+'</div><div class="cp-fee-total-value">Total Paid: '+fmtUSD(st.totalPaid)+'</div></div>';
  h+='</div>';

  /* Links */
  h+='<div class="cp-detail-section"><h3>🔗 Links</h3><div class="cp-links-grid">';
  var links=[['Proposal','cp-proposalLink',cp.proposalLink],['Monthly Reports','cp-reportsLink',cp.reportsLink],['Video Assets','cp-videoAssetsLink',cp.videoAssetsLink],['Transcripts','cp-transcriptsLink',cp.transcriptsLink],['Contract','cp-contractLink',cp.contractLink],['Awareness LP','cp-awarenessLP',cp.awarenessLP],['Consideration LP','cp-considerationLP',cp.considerationLP],['Decision LP','cp-decisionLP',cp.decisionLP]];
  links.forEach(function(l){
    h+='<div class="cp-link-item"><span class="cp-link-label">'+l[0]+'</span>';
    if(l[2])h+='<a href="'+esc(l[2])+'" target="_blank" onclick="event.stopPropagation()">Open ↗</a>';
    h+='<input type="url" class="edf" id="'+l[1]+'" value="'+esc(l[2])+'" placeholder="https://..." style="flex:1;font-size:11px">';
    h+='</div>'});
  h+='</div></div>';

  /* Payments */
  h+='<div class="cp-detail-section"><h3>💳 Payments ('+st.payments.length+')</h3>';
  if(st.payments.length){
    h+='<div class="tb-wrap"><table class="tb"><thead><tr><th>Date</th><th class="r">Amount</th><th>Type</th><th>Notes</th></tr></thead><tbody>';
    st.payments.sort(function(a,b){return(b.date?b.date.getTime():0)-(a.date?a.date.getTime():0)}).forEach(function(p){
      h+='<tr><td>'+(p.date?fmtDShort(p.date):'')+'</td><td class="nm" style="color:var(--green)">'+fmtUSD(p.amount)+'</td><td>'+esc(p.type)+'</td><td style="color:var(--t3)">'+esc(p.notes)+'</td></tr>'});
    h+='<tr style="font-weight:700"><td>Total</td><td class="nm" style="color:var(--green)">'+fmtUSD(st.totalPaid)+'</td><td></td><td></td></tr>';
    h+='</tbody></table></div>'}
  h+='<button class="btn" onclick="TF.openAddPayment(\''+escAttr(cp.id)+'\')" style="margin-top:8px;font-size:11px;padding:5px 12px">+ Add Payment</button></div>';

  /* Campaign Meetings */
  h+='<div class="cp-detail-section"><h3>🤝 Campaign Meetings ('+st.meetings.length+')</h3>';
  if(st.meetings.length){
    h+='<div class="tb-wrap"><table class="tb"><thead><tr><th>Date</th><th>Title</th><th>Recording</th><th>Notes</th></tr></thead><tbody>';
    st.meetings.sort(function(a,b){return(b.date?b.date.getTime():0)-(a.date?a.date.getTime():0)}).forEach(function(m){
      h+='<tr><td>'+(m.date?fmtDShort(m.date):'')+'</td><td>'+esc(m.title)+'</td><td>'+(m.recordingLink?'<a href="'+esc(m.recordingLink)+'" target="_blank" onclick="event.stopPropagation()">Watch ↗</a>':'')+'</td><td style="color:var(--t3)">'+esc(m.notes)+'</td></tr>'});
    h+='</tbody></table></div>'}
  h+='<button class="btn" onclick="TF.openAddCampaignMeeting(\''+escAttr(cp.id)+'\')" style="margin-top:8px;font-size:11px;padding:5px 12px">+ Add Meeting</button></div>';

  /* Linked Open Tasks */
  h+='<div class="cp-detail-section"><h3>📋 Open Tasks ('+st.openCount+')</h3>';
  if(st.openTasks.length){st.openTasks.forEach(function(t){h+=miniRow(t,td_)})}
  h+='<button class="btn" onclick="TF.closeModal();TF.openAddModal();setTimeout(function(){var cs=gel(\'f-cli\');if(cs)cs.value=\''+escAttr(cp.partner)+'\';TF.refreshAddCampaigns();var cc=gel(\'f-campaign\');if(cc)cc.value=\''+escAttr(cp.id)+'\';TF.fillFromCampaign()},200)" style="margin-top:8px;font-size:11px;padding:5px 12px">+ Add Task to Campaign</button></div>';

  /* Linked Done Tasks */
  h+='<div class="cp-detail-section"><h3>✅ Completed Tasks ('+st.doneCount+')</h3>';
  if(st.totalTime)h+='<div style="font-size:13px;color:var(--green);font-weight:700;margin-bottom:8px">⏱ Total Time: '+fmtM(st.totalTime)+'</div>';
  if(st.doneTasks.length){st.doneTasks.slice(0,20).forEach(function(d){
    h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gborder);font-size:12px">';
    h+='<span style="color:var(--green)">'+fmtM(d.duration)+'</span>';
    h+='<span>'+esc(d.item)+'</span>';
    if(d.completed)h+='<span style="color:var(--t4);margin-left:auto">'+fmtDShort(d.completed)+'</span>';
    h+='</div>'})}
  h+='</div>';

  /* Notes */
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="cp-notes" placeholder="Campaign notes...">'+esc(cp.notes||'')+'</textarea></div>';

  /* Actions */
  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" onclick="TF.saveCampaign()" style="padding:10px 22px">💾 Save Campaign</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.confirmDeleteCampaign()" style="padding:10px 16px">🗑️ Delete</button>';
  h+='</div><div id="del-zone"></div>';

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on')}

async function saveCampaign(){
  var id=gel('cp-id').value;var cp=S.campaigns.find(function(c){return c.id===id});if(!cp)return;
  cp.name=gel('cp-name').value.trim();if(!cp.name){toast('⚠ Campaign name required','warn');return}
  cp.partner=gel('cp-partner').value;cp.endClient=(gel('cp-ec')?gel('cp-ec').value:'').trim();
  cp.status=gel('cp-status').value;cp.platform=gel('cp-platform').value;
  cp.campaignTerm=gel('cp-term').value;
  cp.plannedLaunch=gel('cp-planned').value?new Date(gel('cp-planned').value):null;
  cp.actualLaunch=gel('cp-actual').value?new Date(gel('cp-actual').value):null;
  cp.renewalDate=gel('cp-renewal').value?new Date(gel('cp-renewal').value):null;
  cp.goal=gel('cp-goal').value.trim();
  cp.strategyFee=parseFloat(gel('cp-strategyFee').value)||0;
  cp.setupFee=parseFloat(gel('cp-setupFee').value)||0;
  cp.monthlyFee=parseFloat(gel('cp-monthlyFee').value)||0;
  cp.monthlyAdSpend=parseFloat(gel('cp-monthlyAdSpend').value)||0;
  cp.proposalLink=(gel('cp-proposalLink')||{}).value||'';
  cp.reportsLink=(gel('cp-reportsLink')||{}).value||'';
  cp.videoAssetsLink=(gel('cp-videoAssetsLink')||{}).value||'';
  cp.transcriptsLink=(gel('cp-transcriptsLink')||{}).value||'';
  cp.contractLink=(gel('cp-contractLink')||{}).value||'';
  cp.awarenessLP=(gel('cp-awarenessLP')||{}).value||'';
  cp.considerationLP=(gel('cp-considerationLP')||{}).value||'';
  cp.decisionLP=(gel('cp-decisionLP')||{}).value||'';
  cp.notes=gel('cp-notes').value;
  await dbEditCampaign(id,cp);
  toast('💾 Saved: '+cp.name,'ok');closeModal();render()}

function openAddCampaign(){
  var PLATFORMS=['Meta','Google Ads','YouTube','LinkedIn','TikTok','Microsoft Ads','Programmatic','Multiple','Other'];
  var TERMS=['1 month','2 months','3 months','4 months','5 months','6 months','7 months','8 months','9 months','10 months','11 months','12 months','18 months','24 months','Ongoing'];
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">🎯 New Campaign</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="frm" style="margin-top:8px"><div class="frm-grid">';
  h+='<div class="fld full"><label>Campaign Name *</label><input type="text" id="ncp-name" placeholder="e.g. HonorHealth Ortho Campaign" autofocus></div>';
  h+='<div class="fld"><label>Partner</label><select id="ncp-partner"><option value="">Select...</option>';
  S.clients.forEach(function(c){h+='<option>'+esc(c)+'</option>'});h+='</select></div>';
  h+='<div class="fld"><label>End Client</label><select id="ncp-ec" onchange="TF.ecAddNew(\'ncp-ec\')">'+buildEndClientOptions('')+'</select></div>';
  h+='<div class="fld"><label>Status</label><select id="ncp-status"><option selected>Setup</option><option>Active</option><option>Paused</option></select></div>';
  h+='<div class="fld"><label>Platform</label><select id="ncp-platform"><option value="">Select...</option>';
  PLATFORMS.forEach(function(p){h+='<option>'+p+'</option>'});h+='</select></div>';
  h+='<div class="fld"><label>Campaign Term</label><select id="ncp-term"><option value="">Select...</option>';
  TERMS.forEach(function(t){h+='<option>'+t+'</option>'});h+='</select></div>';
  h+='<div class="fld full"><label>Goal</label><input type="text" id="ncp-goal" placeholder="Campaign objective..."></div>';
  h+='<div class="fld"><label>Strategy Fee ($)</label><input type="number" id="ncp-strategyFee" placeholder="0" min="0" step="0.01"></div>';
  h+='<div class="fld"><label>Set-Up Fee ($)</label><input type="number" id="ncp-setupFee" placeholder="0" min="0" step="0.01"></div>';
  h+='<div class="fld"><label>Monthly Fee ($)</label><input type="number" id="ncp-monthlyFee" placeholder="0" min="0" step="0.01"></div>';
  h+='<div class="fld"><label>Monthly Ad Spend ($)</label><input type="number" id="ncp-monthlyAdSpend" placeholder="0" min="0" step="0.01"></div>';
  h+='<div class="fld full"><label>Notes</label><textarea id="ncp-notes" rows="2" placeholder="Campaign notes..."></textarea></div>';
  h+='</div><button class="btn btn-p" onclick="TF.addCampaign()" style="margin-top:12px">🎯 Create Campaign</button></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  setTimeout(function(){var fi=gel('ncp-name');if(fi)fi.focus()},100)}

async function addCampaign(){
  var name=(gel('ncp-name')||{}).value;if(!name||!name.trim()){toast('⚠ Enter a campaign name','warn');return}
  var cp={name:name.trim(),partner:gel('ncp-partner').value||'',endClient:(gel('ncp-ec')?gel('ncp-ec').value:'').trim(),
    status:gel('ncp-status').value||'Setup',platform:gel('ncp-platform').value||'',
    strategyFee:parseFloat(gel('ncp-strategyFee').value)||0,setupFee:parseFloat(gel('ncp-setupFee').value)||0,
    monthlyFee:parseFloat(gel('ncp-monthlyFee').value)||0,monthlyAdSpend:parseFloat(gel('ncp-monthlyAdSpend').value)||0,
    campaignTerm:gel('ncp-term').value||'',plannedLaunch:null,actualLaunch:null,renewalDate:null,
    goal:(gel('ncp-goal')||{}).value||'',proposalLink:'',reportsLink:'',videoAssetsLink:'',transcriptsLink:'',
    awarenessLP:'',considerationLP:'',decisionLP:'',contractLink:'',notes:(gel('ncp-notes')||{}).value||''};
  var result=await dbAddCampaign(cp);
  if(result){cp.id=result.id;cp.created=new Date();S.campaigns.push(cp)}
  toast('🎯 Created: '+cp.name,'ok');closeModal();nav('campaigns');render()}

function confirmDeleteCampaign(){
  var id=gel('cp-id').value;var cp=S.campaigns.find(function(c){return c.id===id});if(!cp)return;
  gel('del-zone').innerHTML='<div class="del-confirm"><span>Delete campaign "'+esc(cp.name)+'"?</span><button class="btn btn-d" onclick="TF.doDeleteCampaign(\''+escAttr(id)+'\')">Yes, Delete</button><button class="btn" onclick="document.getElementById(\'del-zone\').innerHTML=\'\'">Cancel</button></div>'}

async function doDeleteCampaign(id){
  var cp=S.campaigns.find(function(c){return c.id===id});if(!cp)return;
  await dbDeleteCampaign(id);
  S.campaigns=S.campaigns.filter(function(c){return c.id!==id});
  toast('🗑️ Deleted: '+cp.name,'warn');closeModal();render()}

/* ═══════════ PAYMENT MODAL ═══════════ */
function openAddPayment(campaignId){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">💳 Add Payment</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="frm" style="margin-top:8px"><div class="frm-grid">';
  h+='<div class="fld full"><label>Campaign *</label><select id="pay-cp">';
  S.campaigns.forEach(function(c){h+='<option value="'+esc(c.id)+'"'+(c.id===campaignId?' selected':'')+'>'+esc(c.name)+' — '+esc(c.partner)+' — '+esc(c.endClient)+'</option>'});
  h+='</select></div>';
  h+='<div class="fld"><label>Date</label><input type="date" id="pay-date" value="'+new Date().toISOString().slice(0,10)+'"></div>';
  h+='<div class="fld"><label>Amount ($)</label><input type="number" id="pay-amount" placeholder="0.00" min="0" step="0.01"></div>';
  h+='<div class="fld"><label>Type</label><select id="pay-type"><option>Strategy</option><option>Set-Up</option><option>Monthly Fee</option><option>Monthly Ad Spend</option><option>Other</option></select></div>';
  h+='<div class="fld full"><label>Notes</label><input type="text" id="pay-notes" placeholder="Optional notes..."></div>';
  h+='</div><button class="btn btn-p" onclick="TF.addPayment()" style="margin-top:12px">💳 Add Payment</button></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function addPayment(){
  var cpId=gel('pay-cp').value;if(!cpId){toast('⚠ Select a campaign','warn');return}
  var amount=parseFloat(gel('pay-amount').value);if(!amount){toast('⚠ Enter an amount','warn');return}
  var cp=S.campaigns.find(function(c){return c.id===cpId});if(!cp)return;
  var pay={campaignId:cp.id,date:gel('pay-date').value||new Date().toISOString().slice(0,10),amount:amount,
    type:gel('pay-type').value,notes:(gel('pay-notes')||{}).value||''};
  var result=await dbAddPayment(pay);
  if(result){pay.id=result.id;pay.campaignName=cp.name;pay.partner=cp.partner;pay.endClient=cp.endClient;
    pay.date=pay.date?new Date(pay.date):new Date();S.payments.push(pay)}
  toast('💳 Payment added: '+fmtUSD(amount),'ok');closeModal();
  /* Refresh campaign detail if it was open */
  if(gel('cp-id')&&gel('cp-id').value===cpId){openCampaignDetail(cpId)}
  render()}

/* ═══════════ CAMPAIGN MEETING MODAL ═══════════ */
function openAddCampaignMeeting(campaignId){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">🤝 Add Campaign Meeting</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="frm" style="margin-top:8px"><div class="frm-grid">';
  h+='<div class="fld full"><label>Campaign *</label><select id="cmtg-cp">';
  S.campaigns.forEach(function(c){h+='<option value="'+esc(c.id)+'"'+(c.id===campaignId?' selected':'')+'>'+esc(c.name)+' — '+esc(c.partner)+' — '+esc(c.endClient)+'</option>'});
  h+='</select></div>';
  h+='<div class="fld"><label>Date</label><input type="date" id="cmtg-date" value="'+new Date().toISOString().slice(0,10)+'"></div>';
  h+='<div class="fld"><label>Title *</label><input type="text" id="cmtg-title" placeholder="e.g. Month 2 Review"></div>';
  h+='<div class="fld full"><label>Recording Link</label><input type="url" id="cmtg-link" placeholder="https://..."></div>';
  h+='<div class="fld full"><label>Notes</label><input type="text" id="cmtg-notes" placeholder="Optional notes..."></div>';
  h+='</div><button class="btn btn-p" onclick="TF.addCampaignMeeting()" style="margin-top:12px">🤝 Add Meeting</button></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function addCampaignMeeting(){
  var cpId=gel('cmtg-cp').value;if(!cpId){toast('⚠ Select a campaign','warn');return}
  var title=(gel('cmtg-title')||{}).value;if(!title||!title.trim()){toast('⚠ Enter a title','warn');return}
  var cp=S.campaigns.find(function(c){return c.id===cpId});if(!cp)return;
  var mtg={campaignId:cp.id,date:gel('cmtg-date').value||new Date().toISOString().slice(0,10),title:title.trim(),
    recordingLink:(gel('cmtg-link')||{}).value||'',notes:(gel('cmtg-notes')||{}).value||''};
  var result=await dbAddCampaignMeeting(mtg);
  if(result){mtg.id=result.id;mtg.campaignName=cp.name;mtg.partner=cp.partner;mtg.endClient=cp.endClient;
    mtg.date=mtg.date?new Date(mtg.date):new Date();S.campaignMeetings.push(mtg)}
  toast('🤝 Meeting added: '+mtg.title,'ok');closeModal();
  if(gel('cp-id')&&gel('cp-id').value===cpId){openCampaignDetail(cpId)}
  render()}
