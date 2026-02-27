
/* ═══════════ DETAIL MODAL ═══════════ */
function fmtLogTs(ts){if(!ts)return'';var d=new Date(ts);return MO[d.getMonth()]+' '+d.getDate()+', '+(d.getHours()%12||12)+':'+String(d.getMinutes()).padStart(2,'0')+' '+(d.getHours()<12?'AM':'PM')}

function openDetail(id){
  var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var td=today(),ts=tmrGet(id),running=!!ts.started,hasT=running||(ts.elapsed||0)>0;
  var elapsed=tmrElapsed(id),eid=escAttr(id);
  var cliOpts=S.clients.map(function(c){return'<option'+(c===(task.client||'Internal / N/A')?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var catOpts='<option value="">Select...</option>'+CATS.map(function(c){return'<option'+(c===task.category?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var impOpts=IMPS.map(function(i){return'<option'+(i===task.importance?' selected':'')+'>'+i+'</option>'}).join('');
  var typeOpts=TYPES.map(function(t){return'<option'+(t===task.type?' selected':'')+'>'+t+'</option>'}).join('');
  var isPinned=!!S.pins[id];
  var isMob=window.innerWidth<=600;
  var logs=S.actLogs[id]||[];

  var h='';

  if(isMob){
    /* ═══ MOBILE: Single-column sheet ═══ */
    h+='<div style="display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0">';

    /* Header: name + close */
    h+='<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--gborder);flex-shrink:0">';
    h+='<input type="text" class="edf edf-name" id="d-item" value="'+esc(task.item)+'" style="font-size:16px;padding:4px 6px">';
    h+='<input type="hidden" id="d-id" value="'+esc(task.id)+'">';
    h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';

    /* Quick actions bar */
    h+='<div style="display:flex;gap:8px;padding:10px 16px;border-bottom:1px solid var(--gborder);flex-shrink:0;background:var(--bg1)">';
    if(running){
      h+='<button class="btn" onclick="TF.pause(\''+eid+'\')" style="flex:1;padding:12px;font-size:13px">⏸ Pause</button>';
    }else{
      h+='<button class="btn btn-go" onclick="TF.start(\''+eid+'\')" style="flex:1;padding:12px;font-size:13px">▶ Start</button>';
    }
    h+='<button class="btn btn-p" onclick="TF.markAlreadyCompleted(\''+eid+'\')" style="flex:1;padding:12px;font-size:13px">'+CK_S+' Done</button>';
    h+='<button class="btn" onclick="TF.openFocus(\''+eid+'\')" style="padding:12px;background:rgba(255,0,153,0.1);color:var(--pink);border-color:rgba(255,0,153,0.2)">🎯</button>';
    h+='</div>';

    /* Scrollable content */
    h+='<div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch">';

    /* Timer if active */
    if(hasT){
      h+='<div style="text-align:center;padding:10px 16px;border-bottom:1px solid var(--gborder)">';
      h+='<span class="tmr '+(running?'go':'')+'" style="font-size:22px"><span class="dot '+(running?'pulse':'pau')+'"></span>';
      h+='<span data-tmr="'+esc(id)+'">'+fmtT(elapsed)+'</span></span></div>';
    }

    /* Badges */
    h+='<div style="display:flex;gap:4px;flex-wrap:wrap;padding:10px 16px">';
    h+='<span class="bg '+impCls(task.importance)+'">'+esc(task.importance)+'</span>';
    if(task.due){var diff=dayDiff(td,task.due);h+='<span class="bg-du'+(diff<0?' od':(diff===0?' td':''))+'">'+dueLabel(task.due,td)+'</span>'}
    if(task.flag)h+='<span class="bg bg-fl">🚩</span>';
    if(task.client&&task.client!=='Internal / N/A')h+='<span class="bg bg-cl">'+esc(task.client)+'</span>';
    if(task.endClient)h+='<span class="bg bg-ec">'+esc(task.endClient)+'</span>';
    if(task.category)h+='<span class="bg bg-ca">'+esc(task.category)+'</span>';
    h+='</div>';

    /* Notes (prominent) */
    h+='<div style="padding:0 16px 12px">';
    h+='<textarea class="edf edf-notes" id="d-notes" placeholder="Notes..." style="min-height:80px;font-size:14px">'+esc(task.notes)+'</textarea></div>';

    /* Details accordion */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">📋 Details <span style="font-size:10px;color:var(--t4)">▼</span></summary>';
    h+='<div class="ed-grid" style="grid-template-columns:1fr">';
    h+='<div class="ed-fld"><span class="ed-lbl">Due Date</span><input type="datetime-local" class="edf" id="d-due" value="'+(task.due?fmtISO(task.due):'')+'"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="d-imp">'+impOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="d-cat">'+catOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="d-type">'+typeOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="d-est" value="'+(task.est||'')+'" min="0" placeholder="30"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="d-cli" onchange="TF.refreshDetailEndClients()">'+cliOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="d-ec" onchange="TF.refreshDetailCampaigns();TF.ecAddNew(\'d-ec\')">'+buildEndClientOptions(task.endClient||'',task.client)+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="d-campaign" onchange="TF.fillFromCampaign();TF.onProjectChange(\'d\',\'campaign\')">'+buildCampaignOptions(task.campaign||'',task.client,task.endClient)+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Project</span><select class="edf" id="d-project" onchange="TF.onProjectChange(\'d\',\'project\');TF.refreshDetailPhases()">'+buildProjectOptions(task.project||'')+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Phase</span><select class="edf" id="d-phase">'+buildPhaseOptions(task.project||'',task.phase||'')+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Opportunity</span><select class="edf" id="d-opportunity" onchange="TF.onProjectChange(\'d\',\'opportunity\')">'+buildOpportunityOptions(task.opportunity||'')+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Meeting</span><select class="edf" id="d-mtg">'+buildMeetingOptions(task.meetingKey||'')+'</select></div>';
    h+='</div>';
    h+='<div class="flag-row" style="margin:8px 0 12px;flex-direction:column;gap:12px;padding:12px">';
    h+='<label class="flag-toggle"><input type="checkbox" id="d-flag"'+(task.flag?' checked':'')+'><span class="flag-box">🚩</span><span class="flag-text">Needs Client Input</span></label>';
    h+='<label class="flag-toggle"><input type="checkbox" id="d-already-done" onchange="var c=this.checked;document.getElementById(\'d-already-dur-wrap\').style.display=c?\'flex\':\'none\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
    h+='<div id="d-already-dur-wrap" style="display:none;align-items:center;gap:8px"><span class="ed-lbl" style="padding:0">Actual Mins</span><input type="number" id="d-already-dur" class="edf" style="width:70px;padding:6px 10px" placeholder="'+(task.est||30)+'" min="0"></div>';
    h+='</div>';
    h+='</details>';

    /* Activity Log accordion */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">📋 Activity Log ('+logs.length+') <span style="font-size:10px;color:var(--t4)">▼</span></summary>';
    h+='<div class="act-log-input"><input type="text" class="edf" id="d-log-input" placeholder="Add a log entry..." style="font-size:14px" onkeydown="if(event.key===\'Enter\'){event.preventDefault();TF.addLog(\''+eid+'\')}">';
    h+='<button class="act-log-add" onclick="TF.addLog(\''+eid+'\')">+</button></div>';
    if(logs.length){
      h+='<div class="act-log-list">';
      logs.slice().reverse().forEach(function(entry){
        h+='<div class="act-log-entry"><span class="act-log-time">'+fmtLogTs(entry.ts)+'</span><span class="act-log-text">'+esc(entry.text)+'</span></div>'});
      h+='</div>';
    }else{
      h+='<div style="text-align:center;padding:16px;color:var(--t4);font-size:12px">No entries yet</div>';
    }
    h+='</details>';

    h+='</div>';/* end scrollable */

    /* Bottom bar: Save + Pin + Delete */
    h+='<div style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--gborder);flex-shrink:0;background:var(--bg1)">';
    h+='<button class="btn btn-p" onclick="TF.saveDetail()" style="flex:1;padding:14px;font-size:14px">💾 Save</button>';
    h+='<button class="btn" onclick="TF.togglePin(\''+eid+'\')" style="padding:14px;background:'+(isPinned?'rgba(255,176,48,0.15)':'var(--bg4)')+';color:'+(isPinned?'var(--amber)':'var(--t4)')+';border-color:'+(isPinned?'rgba(255,176,48,0.3)':'var(--gborder)')+'">📌</button>';
    h+='<button class="btn btn-d" onclick="TF.confirmDelete()" style="padding:14px">🗑️</button>';
    h+='</div><div id="del-zone" style="padding:0 16px"></div>';

    h+='</div>';/* end mobile wrapper */
  }else{
    /* ═══ DESKTOP: Split-pane layout ═══ */
    h+='<div class="detail-full-header">';
    h+='<div class="tf-modal-top">';
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
    if(task.meetingKey){var _mtgEvt=S.calEvents.find(function(ev){return mtgKey(ev.title,ev.start)===task.meetingKey});if(_mtgEvt)h+='<span class="bg" style="background:rgba(130,55,245,0.08);color:var(--purple50)">📅 '+esc(_mtgEvt.title)+' '+fmtTime(_mtgEvt.start)+'</span>'}
    if(isPinned)h+='<span class="bg" style="background:rgba(255,176,48,0.1);color:var(--amber)">📌 Pinned</span>';
    if(hasT){h+='<span class="ed-timer-badge"><span class="dot '+(running?'pulse':'pau')+'"></span><span class="'+(running?'go':'')+'" data-tmr="'+esc(id)+'">'+fmtT(elapsed)+'</span></span>'}
    h+='</div></div>';

    h+='<div class="detail-split">';
    h+='<div class="detail-split-left">';
    h+='<div class="ed-grid ed-grid-3">';
    h+='<div class="ed-fld"><span class="ed-lbl">Due Date</span><input type="datetime-local" class="edf" id="d-due" value="'+(task.due?fmtISO(task.due):'')+'"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="d-imp">'+impOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="d-cat">'+catOpts+'</select></div>';
    h+='</div>';
    h+='<div class="ed-grid ed-grid-3">';
    h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="d-type">'+typeOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="d-est" value="'+(task.est||'')+'" min="0" placeholder="30"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="d-cli" onchange="TF.refreshDetailEndClients()">'+cliOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="d-ec" onchange="TF.refreshDetailCampaigns();TF.ecAddNew(\'d-ec\')">'+buildEndClientOptions(task.endClient||'',task.client)+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="d-campaign" onchange="TF.fillFromCampaign();TF.onProjectChange(\'d\',\'campaign\')">'+buildCampaignOptions(task.campaign||'',task.client,task.endClient)+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Project</span><select class="edf" id="d-project" onchange="TF.onProjectChange(\'d\',\'project\');TF.refreshDetailPhases()">'+buildProjectOptions(task.project||'')+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Phase</span><select class="edf" id="d-phase">'+buildPhaseOptions(task.project||'',task.phase||'')+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Opportunity</span><select class="edf" id="d-opportunity" onchange="TF.onProjectChange(\'d\',\'opportunity\')">'+buildOpportunityOptions(task.opportunity||'')+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Meeting</span><select class="edf" id="d-mtg">'+buildMeetingOptions(task.meetingKey||'')+'</select></div>';
    h+='</div>';
    h+='<div class="flag-row ed-flags-inline">';
    h+='<label class="flag-toggle"><input type="checkbox" id="d-flag"'+(task.flag?' checked':'')+'><span class="flag-box">🚩</span><span class="flag-text">Needs Client Input</span></label>';
    h+='<label class="flag-toggle"><input type="checkbox" id="d-already-done" onchange="var c=this.checked;document.getElementById(\'d-already-dur-wrap\').style.display=c?\'flex\':\'none\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
    h+='<div id="d-already-dur-wrap" style="display:none;align-items:center;gap:8px;margin-left:auto"><span class="ed-lbl" style="padding:0">Actual Mins</span><input type="number" id="d-already-dur" class="edf" style="width:70px;padding:6px 10px" placeholder="'+(task.est||30)+'" min="0"></div>';
    h+='</div>';
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
    h+='</div>';

    h+='<div class="detail-split-right">';
    h+='<div class="detail-notes-large"><span class="ed-lbl" style="padding-left:0;margin-bottom:6px;display:block">📝 Notes</span>';
    h+='<textarea class="edf edf-notes" id="d-notes" placeholder="Add notes about your progress, where you left off, what to do next...">'+esc(task.notes)+'</textarea></div>';
    h+='<div class="detail-activity">';
    h+='<span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">📋 Activity Log</span>';
    h+='<div class="act-log-input"><input type="text" class="edf" id="d-log-input" placeholder="Add a log entry..." onkeydown="if(event.key===\'Enter\'){event.preventDefault();TF.addLog(\''+eid+'\')}">';
    h+='<button class="act-log-add" onclick="TF.addLog(\''+eid+'\')">+</button></div>';
    if(logs.length){
      h+='<div class="act-log-list">';
      logs.slice().reverse().forEach(function(entry){
        h+='<div class="act-log-entry"><span class="act-log-time">'+fmtLogTs(entry.ts)+'</span><span class="act-log-text">'+esc(entry.text)+'</span></div>'});
      h+='</div>';
    }else{
      h+='<div style="text-align:center;padding:20px;color:var(--t4);font-size:12px">No activity log entries yet</div>';
    }
    h+='</div>';
    h+='</div>';
    h+='</div>';
  }

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on','full-detail')}

function closeModal(){var dm=gel('detail-modal');dm.classList.remove('on');dm.classList.remove('full-detail');var m=gel('modal');if(m)m.classList.remove('on')}

async function saveDetail(){
  var id=gel('d-id').value;var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  task.item=gel('d-item').value.trim();if(!task.item){toast('⚠ Item name required','warn');return}
  task.due=gel('d-due').value?new Date(gel('d-due').value):null;
  task.importance=gel('d-imp').value;task.category=gel('d-cat').value;
  task.client=gel('d-cli').value||'Internal / N/A';task.endClient=(gel('d-ec')?gel('d-ec').value:'').trim();task.type=gel('d-type').value;
  task.campaign=gel('d-campaign')?gel('d-campaign').value:'';
  task.project=gel('d-project')?gel('d-project').value:'';
  task.phase=gel('d-phase')?gel('d-phase').value:'';
  task.opportunity=gel('d-opportunity')?gel('d-opportunity').value:'';
  task.meetingKey=gel('d-mtg')?gel('d-mtg').value:'';
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
  task.project=gel('d-project')?gel('d-project').value:'';
  task.phase=gel('d-phase')?gel('d-phase').value:'';
  task.opportunity=gel('d-opportunity')?gel('d-opportunity').value:'';
  if(task.campaign&&!task.endClient){var _cpmac=S.campaigns.find(function(c){return c.id===task.campaign});if(_cpmac)task.endClient=_cpmac.endClient}
  task.est=parseInt(gel('d-est').value)||0;task.notes=gel('d-notes').value;
  task.flag=gel('d-flag').checked;
  var mins=parseInt((gel('d-already-dur')||{}).value)||task.est||0;
  /* Move to done — DB first */
  var doneData={item:task.item,due:task.due,importance:task.importance,category:task.category,
    client:task.client,endClient:task.endClient,type:task.type,duration:mins,est:task.est,notes:task.notes,campaign:task.campaign||'',project:task.project||'',phase:task.phase||'',opportunity:task.opportunity||''};
  var result=await dbCompleteTask(doneData);
  if(result){await dbDeleteTask(id);
    S.tasks=S.tasks.filter(function(t){return t.id!==id});delete S.timers[id];
    S.done.unshift({id:result.id,item:task.item,completed:new Date(),due:task.due,importance:task.importance,
      category:task.category,client:task.client,endClient:task.endClient,type:task.type,
      duration:mins,est:task.est,notes:task.notes,campaign:task.campaign||'',project:task.project||'',phase:task.phase||''});
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
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="f-campaign" onchange="TF.fillFromCampaign();TF.onProjectChange(\'f\',\'campaign\')">'+buildCampaignOptions('','','')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Project</span><select class="edf" id="f-project" onchange="TF.onProjectChange(\'f\',\'project\');TF.refreshAddPhases()">'+buildProjectOptions('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Phase</span><select class="edf" id="f-phase">'+buildPhaseOptions('','')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Opportunity</span><select class="edf" id="f-opportunity" onchange="TF.onProjectChange(\'f\',\'opportunity\')">'+buildOpportunityOptions('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Meeting</span><select class="edf" id="f-mtg">'+buildMeetingOptions('')+'</select></div>';
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
  var mtgVal=(gel('f-mtg')||{}).value||'';
  var projVal=(gel('f-project')||{}).value||'';
  var phaseVal=(gel('f-phase')||{}).value||'';
  var oppVal=(gel('f-opportunity')||{}).value||'';
  var data={item:item.trim(),due:gel('f-due').value,importance:gel('f-imp').value,category:gel('f-cat').value,
    client:gel('f-cli').value||'Internal / N/A',endClient:ecVal,type:gel('f-type').value,est:parseInt(gel('f-est').value)||0,
    notes:gel('f-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal,meetingKey:mtgVal,
    project:projVal,phase:phaseVal,opportunity:oppVal};
  if(markDone){
    var mins=parseInt((gel('f-done-dur')||{}).value)||data.est||0;
    var doneData={item:data.item,due:data.due?new Date(data.due):null,importance:data.importance,category:data.category,
      client:data.client,endClient:data.endClient,type:data.type,duration:mins,est:data.est,notes:data.notes,campaign:data.campaign,project:data.project,phase:data.phase,opportunity:data.opportunity};
    var result=await dbCompleteTask(doneData);
    if(result){S.done.unshift({id:result.id,item:data.item,completed:new Date(),due:doneData.due,importance:data.importance,
      category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:mins,est:data.est,notes:data.notes,campaign:data.campaign,project:data.project,phase:data.phase,opportunity:data.opportunity})}
    toast('Completed: '+data.item+(mins?' ('+fmtM(mins)+')':''),'ok')}
  else{
    var result=await dbAddTask(data);
    if(result){S.tasks.push({id:result.id,item:data.item,due:data.due?new Date(data.due):null,importance:data.importance,est:data.est,
      category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign,meetingKey:data.meetingKey,project:data.project,phase:data.phase,opportunity:data.opportunity})}
    toast('Added: '+data.item,'ok')}
  closeModal();render()}

async function addAndStart(){var item=(gel('f-item')||{}).value;if(!item||!item.trim()){toast('⚠ Enter a task name','warn');return}
  var flagged=gel('f-flag').checked;
  var cpVal=(gel('f-campaign')||{}).value||'';
  var ecVal=(gel('f-ec')?gel('f-ec').value:'').trim();
  if(cpVal&&!ecVal){var _cpas=S.campaigns.find(function(c){return c.id===cpVal});if(_cpas)ecVal=_cpas.endClient}
  var mtgVal2=(gel('f-mtg')||{}).value||'';
  var projVal2=(gel('f-project')||{}).value||'';
  var phaseVal2=(gel('f-phase')||{}).value||'';
  var oppVal2=(gel('f-opportunity')||{}).value||'';
  var data={item:item.trim(),due:gel('f-due').value,importance:gel('f-imp').value,category:gel('f-cat').value,
    client:gel('f-cli').value||'Internal / N/A',endClient:ecVal,type:gel('f-type').value,est:parseInt(gel('f-est').value)||0,
    notes:gel('f-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal,meetingKey:mtgVal2,
    project:projVal2,phase:phaseVal2,opportunity:oppVal2};
  var result=await dbAddTask(data);
  if(!result){toast('❌ Failed to add task','warn');return}
  var id=result.id;
  S.tasks.push({id:id,item:data.item,due:data.due?new Date(data.due):null,importance:data.importance,est:data.est,
    category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign,meetingKey:data.meetingKey,project:data.project,phase:data.phase,opportunity:data.opportunity});
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

  /* Linked Tasks */
  var mKey=mtgKey(e.title,e.start);
  var linkedTasks=S.tasks.filter(function(t){return t.meetingKey===mKey});
  if(linkedTasks.length){
    h+='<div style="margin:12px 0 8px;padding:12px 14px;background:rgba(130,55,245,0.03);border:1px solid rgba(130,55,245,0.1);border-radius:var(--r)">';
    h+='<div style="font-size:11px;font-weight:700;color:var(--purple50);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">📋 Linked Tasks ('+linkedTasks.length+')</div>';
    linkedTasks.forEach(function(lt,i){
      h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;'+(i<linkedTasks.length-1?'border-bottom:1px solid rgba(130,55,245,0.05);':'')+';font-size:12.5px">';
      h+='<input type="checkbox" id="lm-lt-'+i+'" data-task-id="'+escAttr(lt.id)+'" checked>';
      h+='<span class="bg '+impCls(lt.importance)+'" style="font-size:10px;padding:2px 7px">'+esc(lt.importance).charAt(0)+'</span>';
      h+='<span style="flex:1;color:var(--t1)">'+esc(lt.item)+'</span>';
      if(lt.est)h+='<span style="font-size:11px;color:var(--blue)">'+fmtM(lt.est)+'</span>';
      h+='</div>'});
    h+='<div style="font-size:10px;color:var(--t4);margin-top:6px">Checked tasks will be marked complete when you log this meeting</div>';
    h+='</div>'}

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

  /* Complete linked tasks that are checked */
  var linkedChecks=document.querySelectorAll('[id^="lm-lt-"]');
  if(linkedChecks&&linkedChecks.length){
    for(var lci=0;lci<linkedChecks.length;lci++){
      if(!linkedChecks[lci].checked)continue;
      var ltId=linkedChecks[lci].dataset.taskId;
      var lt=S.tasks.find(function(t){return t.id===ltId});
      if(!lt)continue;
      var ltDone={item:lt.item,due:lt.due||null,importance:lt.importance,
        category:lt.category||cat,client:lt.client||cli,endClient:lt.endClient||ec,
        type:lt.type||type,duration:0,est:lt.est,notes:lt.notes,campaign:lt.campaign||cpVal};
      var ltResult=await dbCompleteTask(ltDone);
      if(ltResult){
        await dbDeleteTask(ltId);
        S.tasks=S.tasks.filter(function(tk){return tk.id!==ltId});
        delete S.timers[ltId];
        S.done.unshift({id:ltResult.id,item:lt.item,completed:new Date(),due:lt.due||null,
          importance:lt.importance,category:lt.category||cat,client:lt.client||cli,
          endClient:lt.endClient||ec,type:lt.type||type,duration:0,est:lt.est,
          notes:lt.notes,campaign:lt.campaign||cpVal})}}}

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
  if(d.opportunity){var _opdd=S.opportunities.find(function(o){return o.id===d.opportunity});if(_opdd)h+='<span class="bg bg-opp">💎 '+esc(_opdd.name)+'</span>'}
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
  h+='<div class="ed-fld"><span class="ed-lbl">Project</span><select class="edf" id="d-project" disabled>'+buildProjectOptions(d.project||'')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Opportunity</span><select class="edf" id="d-opportunity" disabled>'+buildOpportunityOptions(d.opportunity||'')+'</select></div>';
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
    duration:d.duration,est:d.est,notes:d.notes,campaign:d.campaign||'',opportunity:d.opportunity||''}).eq('id',id);
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
  var srcIcon=r.source==='Email'?'📧':r.source==='Read.ai'?'🎙':'📥';
  var srcLabel=r.source==='Email'?'Email':r.source==='Read.ai'?'Read.ai':'Review';
  var srcBg=r.source==='Email'?'rgba(59,130,246,0.1)':r.source==='Read.ai'?'rgba(16,185,129,0.1)':'rgba(255,0,153,0.1)';
  var srcClr=r.source==='Email'?'#3b82f6':r.source==='Read.ai'?'#10b981':'var(--pink)';
  h+='<span class="bg" style="background:'+srcBg+';color:'+srcClr+'">'+srcIcon+' '+srcLabel+'</span>';
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

  if(r.source==='Email'&&r.notes){h+='<div style="padding:12px 16px;margin:10px 0;background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.15);border-radius:var(--r);font-size:12px;color:var(--t3);line-height:1.65"><span style="font-size:9px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">📧 Original Email</span>'+esc(r.notes)+'</div>'}
  if(r.source==='Read.ai'&&r.notes){h+='<div style="padding:12px 16px;margin:10px 0;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);border-radius:var(--r);font-size:12px;color:var(--t3);line-height:1.65"><span style="font-size:9px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">🎙 Meeting Transcript Notes</span>'+esc(r.notes)+'</div>'}

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
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="d-campaign" onchange="TF.fillFromCampaign();TF.onProjectChange(\'d\',\'campaign\')">'+buildCampaignOptions(r.campaign||'',r.client,r.endClient)+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Project</span><select class="edf" id="d-project" onchange="TF.onProjectChange(\'d\',\'project\');TF.refreshDetailPhases()">'+buildProjectOptions('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Phase</span><select class="edf" id="d-phase">'+buildPhaseOptions('','')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Opportunity</span><select class="edf" id="d-opportunity" onchange="TF.onProjectChange(\'d\',\'opportunity\')">'+buildOpportunityOptions('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Meeting</span><select class="edf" id="d-mtg">'+buildMeetingOptions('')+'</select></div>';
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
    client:r.client||'Internal / N/A',endClient:r.endClient||'',type:r.type,est:r.est,notes:r.notes,status:'Planned',flag:false,campaign:r.campaign||'',meetingKey:'',project:'',phase:'',opportunity:''};
  var result=await dbAddTask(data);
  if(result){S.tasks.push({id:result.id,item:r.item,due:r.due,importance:r.importance,est:r.est,category:r.category,
    client:r.client||'Internal / N/A',endClient:r.endClient||'',type:r.type,duration:0,notes:r.notes,status:'Planned',flag:false,campaign:r.campaign||'',meetingKey:'',project:'',phase:'',opportunity:''})}
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
  var mtgVal3=(gel('d-mtg')||{}).value||'';
  var projVal3=(gel('d-project')||{}).value||'';
  var phaseVal3=(gel('d-phase')||{}).value||'';
  var oppVal3=(gel('d-opportunity')||{}).value||'';
  var data={item:item,due:dueVal,importance:gel('d-imp').value,category:gel('d-cat').value,
    client:gel('d-cli').value||'Internal / N/A',endClient:(gel('d-ec')?gel('d-ec').value:'').trim(),type:gel('d-type').value,est:parseInt(gel('d-est').value)||0,
    notes:gel('d-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal2,meetingKey:mtgVal3,project:projVal3,phase:phaseVal3,opportunity:oppVal3};
  await dbDeleteReview(id);
  S.review=S.review.filter(function(rv){return rv.id!==id});
  if(markDone){
    var mins=parseInt((gel('d-done-dur')||{}).value)||data.est||0;
    var dueDate=dueVal?new Date(dueVal):null;
    var doneData={item:data.item,due:dueVal||null,importance:data.importance,category:data.category,
      client:data.client,endClient:data.endClient,type:data.type,duration:mins,est:data.est,notes:data.notes,campaign:data.campaign,project:data.project,phase:data.phase,opportunity:data.opportunity};
    var result=await dbCompleteTask(doneData);
    if(result){S.done.unshift({id:result.id,item:data.item,completed:new Date(),due:dueDate,importance:data.importance,category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:mins,est:data.est,notes:data.notes,campaign:data.campaign,project:data.project,phase:data.phase,opportunity:data.opportunity})}
    toast('Completed: '+data.item+(mins?' ('+fmtM(mins)+')':''),'ok')}
  else{
    var result=await dbAddTask(data);
    if(result){S.tasks.push({id:result.id,item:data.item,due:dueVal?new Date(dueVal):null,importance:data.importance,est:data.est,
      category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign,meetingKey:data.meetingKey,project:data.project,phase:data.phase,opportunity:data.opportunity})}
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
  var mtgVal4=(gel('d-mtg')||{}).value||'';
  var projVal4=(gel('d-project')||{}).value||'';
  var phaseVal4=(gel('d-phase')||{}).value||'';
  var oppVal4=(gel('d-opportunity')||{}).value||'';
  var data={item:item,due:dueVal,importance:gel('d-imp').value,category:gel('d-cat').value,
    client:gel('d-cli').value||'Internal / N/A',endClient:(gel('d-ec')?gel('d-ec').value:'').trim(),type:gel('d-type').value,est:parseInt(gel('d-est').value)||0,
    notes:gel('d-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal3,meetingKey:mtgVal4,project:projVal4,phase:phaseVal4,opportunity:oppVal4};
  var result=await dbAddTask(data);
  if(!result)return;
  var taskId=result.id;
  S.tasks.push({id:taskId,item:data.item,due:dueVal?new Date(dueVal):null,importance:data.importance,est:data.est,
    category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign,meetingKey:data.meetingKey,project:data.project,phase:data.phase,opportunity:data.opportunity});
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

function buildMeetingOptions(currentMeetingKey){
  var opts='<option value="">None</option>';
  if(!S.calEvents||!S.calEvents.length)return opts;
  var now=new Date(),td=today();
  var cutoff=new Date(td.getTime()+14*864e5);
  var upcoming=S.calEvents.filter(function(e){
    return !e.allDay&&e.end>now&&e.start<cutoff&&e.title.indexOf('OOO')!==0
  }).sort(function(a,b){return a.start.getTime()-b.start.getTime()});
  var curDay='';
  upcoming.forEach(function(e){
    var dk=fmtDShort(e.start);
    if(dk!==curDay){
      if(curDay)opts+='</optgroup>';
      opts+='<optgroup label="'+esc(dk)+'">';
      curDay=dk}
    var key=mtgKey(e.title,e.start);
    var dur=Math.round((e.end-e.start)/60000);
    var sel=currentMeetingKey===key?' selected':'';
    opts+='<option value="'+escAttr(key)+'"'+sel+'>'+fmtTime(e.start)+' '+esc(e.title)+' ('+fmtM(dur)+')</option>'});
  if(curDay)opts+='</optgroup>';
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
  var isMob=window.innerWidth<=600;
  var oneOff=cp.strategyFee+cp.setupFee;var monthly=cp.monthlyFee+cp.monthlyAdSpend;

  /* Helper: build common fields HTML */
  function cpFieldsHTML(gridCls){
    var fh='<div class="'+gridCls+'">';
    fh+='<div class="ed-fld"><span class="ed-lbl">Partner</span><select class="edf" id="cp-partner">';
    S.clients.forEach(function(c){fh+='<option'+(c===cp.partner?' selected':'')+'>'+esc(c)+'</option>'});fh+='</select></div>';
    fh+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="cp-ec" onchange="TF.ecAddNew(\'cp-ec\')">'+buildEndClientOptions(cp.endClient||'')+'</select></div>';
    fh+='<div class="ed-fld"><span class="ed-lbl">Status</span><select class="edf" id="cp-status">';
    STATUSES.forEach(function(s){fh+='<option'+(s===cp.status?' selected':'')+'>'+s+'</option>'});fh+='</select></div>';
    fh+='<div class="ed-fld"><span class="ed-lbl">Platform</span><select class="edf" id="cp-platform"><option value="">Select...</option>';
    PLATFORMS.forEach(function(p){fh+='<option'+(p===cp.platform?' selected':'')+'>'+p+'</option>'});fh+='</select></div>';
    fh+='<div class="ed-fld"><span class="ed-lbl">Campaign Term</span><select class="edf" id="cp-term"><option value="">Select...</option>';
    TERMS.forEach(function(t){fh+='<option'+(t===cp.campaignTerm?' selected':'')+'>'+t+'</option>'});fh+='</select></div>';
    fh+='<div class="ed-fld"><span class="ed-lbl">Planned Launch</span><input type="date" class="edf" id="cp-planned" value="'+(cp.plannedLaunch?cp.plannedLaunch.toISOString().slice(0,10):'')+'"></div>';
    fh+='<div class="ed-fld"><span class="ed-lbl">Actual Launch</span><input type="date" class="edf" id="cp-actual" value="'+(cp.actualLaunch?cp.actualLaunch.toISOString().slice(0,10):'')+'"></div>';
    fh+='<div class="ed-fld"><span class="ed-lbl">Renewal Date</span><input type="date" class="edf" id="cp-renewal" value="'+(cp.renewalDate?cp.renewalDate.toISOString().slice(0,10):'')+'"></div>';
    fh+='<div class="ed-fld full"><span class="ed-lbl">Goal</span><input type="text" class="edf" id="cp-goal" value="'+esc(cp.goal)+'" placeholder="Campaign goal..."></div>';
    fh+='</div>';return fh}

  /* Helper: fees HTML */
  function cpFeesHTML(){
    var fh='<div class="cp-fees-grid">';
    fh+='<div class="cp-fee-item"><div class="cp-fee-label">Strategy Fee</div><input type="number" class="edf" id="cp-strategyFee" value="'+(cp.strategyFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
    fh+='<div class="cp-fee-item"><div class="cp-fee-label">Set-Up Fee</div><input type="number" class="edf" id="cp-setupFee" value="'+(cp.setupFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
    fh+='<div class="cp-fee-item"><div class="cp-fee-label">Monthly Fee</div><input type="number" class="edf" id="cp-monthlyFee" value="'+(cp.monthlyFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
    fh+='<div class="cp-fee-item"><div class="cp-fee-label">Monthly Ad Spend</div><input type="number" class="edf" id="cp-monthlyAdSpend" value="'+(cp.monthlyAdSpend||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
    fh+='</div>';
    fh+='<div class="cp-fee-total"><div class="cp-fee-total-label">One-off: '+fmtUSD(oneOff)+' · Monthly: '+fmtUSD(monthly)+'</div><div class="cp-fee-total-value">Total Paid: '+fmtUSD(st.totalPaid)+'</div></div>';
    return fh}

  /* Helper: links HTML */
  function cpLinksHTML(){
    var fh='<div class="cp-links-grid">';
    var links=[['Proposal','cp-proposalLink',cp.proposalLink],['Monthly Reports','cp-reportsLink',cp.reportsLink],['Video Assets','cp-videoAssetsLink',cp.videoAssetsLink],['Transcripts','cp-transcriptsLink',cp.transcriptsLink],['Contract','cp-contractLink',cp.contractLink],['Awareness LP','cp-awarenessLP',cp.awarenessLP],['Consideration LP','cp-considerationLP',cp.considerationLP],['Decision LP','cp-decisionLP',cp.decisionLP]];
    links.forEach(function(l){
      fh+='<div class="cp-link-item"><span class="cp-link-label">'+l[0]+'</span>';
      if(l[2])fh+='<a href="'+esc(l[2])+'" target="_blank" onclick="event.stopPropagation()">Open ↗</a>';
      fh+='<input type="url" class="edf" id="'+l[1]+'" value="'+esc(l[2])+'" placeholder="https://..." style="flex:1;font-size:11px">';
      fh+='</div>'});
    fh+='</div>';return fh}

  var h='';

  if(isMob){
    /* ═══ MOBILE: Single-column campaign detail ═══ */
    h+='<div style="display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0">';
    /* Header */
    h+='<div style="display:flex;align-items:center;gap:8px;padding:12px 16px;border-bottom:1px solid var(--gborder);flex-shrink:0">';
    h+='<input type="text" class="edf edf-name" id="cp-name" value="'+esc(cp.name)+'" style="font-size:16px;padding:4px 6px">';
    h+='<input type="hidden" id="cp-id" value="'+esc(cp.id)+'">';
    h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';

    /* Scrollable */
    h+='<div style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch">';

    /* Badges */
    h+='<div style="display:flex;gap:4px;flex-wrap:wrap;padding:10px 16px">';
    h+='<span class="bg bg-'+(cp.status==='Active'?'im':cp.status==='Setup'?'mt':cp.status==='Paused'?'wt':'cr')+'">'+esc(cp.status)+'</span>';
    if(cp.platform)h+='<span class="bg bg-ca">'+esc(cp.platform)+'</span>';
    h+='<span class="bg bg-cl">'+esc(cp.partner)+'</span>';
    if(cp.endClient)h+='<span class="bg bg-ec">'+esc(cp.endClient)+'</span>';
    h+='<span style="font-size:11px;color:var(--green);font-weight:700">💰 '+fmtUSD(st.totalPaid)+'</span>';
    h+='<span style="font-size:11px;color:var(--amber);font-weight:700">📋 '+st.openCount+' open</span>';
    h+='</div>';

    /* Notes */
    h+='<div style="padding:0 16px 12px"><textarea class="edf edf-notes" id="cp-notes" placeholder="Campaign notes..." style="min-height:60px;font-size:14px">'+esc(cp.notes||'')+'</textarea></div>';

    /* Open Tasks */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)" open>';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">📋 Open Tasks ('+st.openCount+') <span style="font-size:10px;color:var(--t4)">▼</span></summary>';
    if(st.openTasks.length){st.openTasks.forEach(function(t){h+=miniRow(t,td_)})}
    h+='<button class="btn" onclick="TF.closeModal();TF.openAddModal();setTimeout(function(){var cs=gel(\'f-cli\');if(cs)cs.value=\''+escAttr(cp.partner)+'\';TF.refreshAddCampaigns();var cc=gel(\'f-campaign\');if(cc)cc.value=\''+escAttr(cp.id)+'\';TF.fillFromCampaign()},200)" style="margin:6px 0 12px;font-size:12px;padding:10px 14px;width:100%;text-align:center">+ Add Task</button>';
    h+='</details>';

    /* Details */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">📋 Details <span style="font-size:10px;color:var(--t4)">▼</span></summary>';
    h+=cpFieldsHTML('ed-grid');
    h+='</details>';

    /* Fees */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">💰 Fees <span style="font-size:10px;color:var(--t4)">▼</span></summary>';
    h+=cpFeesHTML();
    h+='<div style="margin-bottom:12px"></div></details>';

    /* Payments */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">💳 Payments ('+st.payments.length+') <span style="font-size:10px;color:var(--t4)">▼</span></summary>';
    if(st.payments.length){st.payments.sort(function(a,b){return(b.date?b.date.getTime():0)-(a.date?a.date.getTime():0)}).forEach(function(p){
      h+='<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(130,55,245,0.04);font-size:12px">';
      h+='<span>'+(p.date?fmtDShort(p.date):'')+'</span><span style="color:var(--green);font-weight:700">'+fmtUSD(p.amount)+'</span></div>'})}
    h+='<button class="btn" onclick="TF.openAddPayment(\''+escAttr(cp.id)+'\')" style="margin:6px 0 12px;font-size:12px;padding:10px 14px">+ Add Payment</button>';
    h+='</details>';

    /* Links */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">🔗 Links <span style="font-size:10px;color:var(--t4)">▼</span></summary>';
    h+=cpLinksHTML();
    h+='<div style="margin-bottom:12px"></div></details>';

    h+='</div>';/* end scrollable */

    /* Bottom bar */
    h+='<div style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--gborder);flex-shrink:0;background:var(--bg1)">';
    h+='<button class="btn btn-p" onclick="TF.saveCampaign()" style="flex:1;padding:14px;font-size:14px">💾 Save</button>';
    h+='<button class="btn btn-d" onclick="TF.confirmDeleteCampaign()" style="padding:14px">🗑️</button>';
    h+='</div><div id="del-zone" style="padding:0 16px"></div>';

    h+='</div>';/* end mobile wrapper */
  }else{
    /* ═══ DESKTOP: Split-pane layout ═══ */
    h+='<div class="detail-full-header">';
    h+='<div class="tf-modal-top">';
    h+='<input type="text" class="edf edf-name" id="cp-name" value="'+esc(cp.name)+'">';
    h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
    h+='<input type="hidden" id="cp-id" value="'+esc(cp.id)+'">';

    h+='<div class="tf-modal-badges">';
    h+='<span class="bg bg-'+(cp.status==='Active'?'im':cp.status==='Setup'?'mt':cp.status==='Paused'?'wt':'cr')+'">'+esc(cp.status)+'</span>';
    if(cp.platform)h+='<span class="bg bg-ca">'+esc(cp.platform)+'</span>';
    h+='<span class="bg bg-cl">'+esc(cp.partner)+'</span>';
    if(cp.endClient)h+='<span class="bg bg-ec">'+esc(cp.endClient)+'</span>';
    h+='<span class="ed-timer-badge" style="color:var(--green)">💰 Paid: '+fmtUSD(st.totalPaid)+'</span>';
    h+='<span class="ed-timer-badge" style="color:var(--amber)">📋 '+st.openCount+' open · '+st.doneCount+' done</span>';
    if(st.totalTime)h+='<span class="ed-timer-badge" style="color:var(--pink)">⏱ '+fmtM(st.totalTime)+'</span>';
    h+='</div></div>';

  /* ── Split pane ── */
  h+='<div class="detail-split">';

  /* LEFT: Edit fields + Fees + Links + Actions */
  h+='<div class="detail-split-left">';

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
  h+='<div style="margin-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">💰 Fees</span>';
  h+='<div class="cp-fees-grid">';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Strategy Fee</div><input type="number" class="edf" id="cp-strategyFee" value="'+(cp.strategyFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Set-Up Fee</div><input type="number" class="edf" id="cp-setupFee" value="'+(cp.setupFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Monthly Fee</div><input type="number" class="edf" id="cp-monthlyFee" value="'+(cp.monthlyFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Monthly Ad Spend</div><input type="number" class="edf" id="cp-monthlyAdSpend" value="'+(cp.monthlyAdSpend||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='</div>';
  h+='<div class="cp-fee-total"><div class="cp-fee-total-label">One-off: '+fmtUSD(oneOff)+' · Monthly: '+fmtUSD(monthly)+'</div><div class="cp-fee-total-value">Total Paid: '+fmtUSD(st.totalPaid)+'</div></div>';
  h+='</div>';

  /* Links */
  h+='<div style="margin-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">🔗 Links</span><div class="cp-links-grid">';
  var links=[['Proposal','cp-proposalLink',cp.proposalLink],['Monthly Reports','cp-reportsLink',cp.reportsLink],['Video Assets','cp-videoAssetsLink',cp.videoAssetsLink],['Transcripts','cp-transcriptsLink',cp.transcriptsLink],['Contract','cp-contractLink',cp.contractLink],['Awareness LP','cp-awarenessLP',cp.awarenessLP],['Consideration LP','cp-considerationLP',cp.considerationLP],['Decision LP','cp-decisionLP',cp.decisionLP]];
  links.forEach(function(l){
    h+='<div class="cp-link-item"><span class="cp-link-label">'+l[0]+'</span>';
    if(l[2])h+='<a href="'+esc(l[2])+'" target="_blank" onclick="event.stopPropagation()">Open ↗</a>';
    h+='<input type="url" class="edf" id="'+l[1]+'" value="'+esc(l[2])+'" placeholder="https://..." style="flex:1;font-size:11px">';
    h+='</div>'});
  h+='</div></div>';

  /* Actions */
  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" onclick="TF.saveCampaign()" style="padding:10px 22px">💾 Save Campaign</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.confirmDeleteCampaign()" style="padding:10px 16px">🗑️ Delete</button>';
  h+='</div><div id="del-zone"></div>';
  h+='</div>';/* end detail-split-left */

  /* RIGHT: Payments, Meetings, Tasks, Notes */
  h+='<div class="detail-split-right">';

  /* Payments */
  h+='<div><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">💳 Payments ('+st.payments.length+')</span>';
  if(st.payments.length){
    h+='<div class="tb-wrap"><table class="tb"><thead><tr><th>Date</th><th class="r">Amount</th><th>Type</th><th>Notes</th></tr></thead><tbody>';
    st.payments.sort(function(a,b){return(b.date?b.date.getTime():0)-(a.date?a.date.getTime():0)}).forEach(function(p){
      h+='<tr><td>'+(p.date?fmtDShort(p.date):'')+'</td><td class="nm" style="color:var(--green)">'+fmtUSD(p.amount)+'</td><td>'+esc(p.type)+'</td><td style="color:var(--t3)">'+esc(p.notes)+'</td></tr>'});
    h+='<tr style="font-weight:700"><td>Total</td><td class="nm" style="color:var(--green)">'+fmtUSD(st.totalPaid)+'</td><td></td><td></td></tr>';
    h+='</tbody></table></div>'}
  h+='<button class="btn" onclick="TF.openAddPayment(\''+escAttr(cp.id)+'\')" style="margin-top:6px;font-size:11px;padding:5px 12px">+ Add Payment</button></div>';

  /* Campaign Meetings */
  h+='<div style="border-top:1px solid var(--gborder);padding-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">🤝 Campaign Meetings ('+st.meetings.length+')</span>';
  if(st.meetings.length){
    h+='<div class="tb-wrap"><table class="tb"><thead><tr><th>Date</th><th>Title</th><th>Recording</th><th>Notes</th></tr></thead><tbody>';
    st.meetings.sort(function(a,b){return(b.date?b.date.getTime():0)-(a.date?a.date.getTime():0)}).forEach(function(m){
      h+='<tr><td>'+(m.date?fmtDShort(m.date):'')+'</td><td>'+esc(m.title)+'</td><td>'+(m.recordingLink?'<a href="'+esc(m.recordingLink)+'" target="_blank" onclick="event.stopPropagation()">Watch ↗</a>':'')+'</td><td style="color:var(--t3)">'+esc(m.notes)+'</td></tr>'});
    h+='</tbody></table></div>'}
  h+='<button class="btn" onclick="TF.openAddCampaignMeeting(\''+escAttr(cp.id)+'\')" style="margin-top:6px;font-size:11px;padding:5px 12px">+ Add Meeting</button></div>';

  /* Open Tasks */
  h+='<div style="border-top:1px solid var(--gborder);padding-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">📋 Open Tasks ('+st.openCount+')</span>';
  if(st.openTasks.length){st.openTasks.forEach(function(t){h+=miniRow(t,td_)})}
  h+='<button class="btn" onclick="TF.closeModal();TF.openAddModal();setTimeout(function(){var cs=gel(\'f-cli\');if(cs)cs.value=\''+escAttr(cp.partner)+'\';TF.refreshAddCampaigns();var cc=gel(\'f-campaign\');if(cc)cc.value=\''+escAttr(cp.id)+'\';TF.fillFromCampaign()},200)" style="margin-top:6px;font-size:11px;padding:5px 12px">+ Add Task to Campaign</button></div>';

  /* Completed Tasks */
  h+='<div style="border-top:1px solid var(--gborder);padding-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">'+CK_S+' Completed Tasks ('+st.doneCount+')</span>';
  if(st.totalTime)h+='<div style="font-size:12px;color:var(--green);font-weight:700;margin-bottom:8px">⏱ Total Time: '+fmtM(st.totalTime)+'</div>';
  if(st.doneTasks.length){st.doneTasks.slice(0,20).forEach(function(d){
    h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(130,55,245,0.04);font-size:12px">';
    h+='<span style="color:var(--green)">'+fmtM(d.duration)+'</span>';
    h+='<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(d.item)+'</span>';
    if(d.completed)h+='<span style="color:var(--t4);flex-shrink:0;font-size:11px">'+fmtDShort(d.completed)+'</span>';
    h+='</div>'})}
  h+='</div>';

  /* Notes */
  h+='<div class="detail-notes-large" style="border-top:1px solid var(--gborder);padding-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:6px;display:block">📝 Notes</span>';
  h+='<textarea class="edf edf-notes" id="cp-notes" placeholder="Campaign notes, strategy details...">'+esc(cp.notes||'')+'</textarea></div>';

  h+='</div>';/* end detail-split-right */
  h+='</div>';/* end detail-split */
  }/* end desktop else */

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on','full-detail')}

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
/* ═══════════ PROJECT HELPERS ═══════════ */
function buildProjectOptions(currentValue){
  var opts='<option value="">None</option>';
  S.projects.filter(function(p){return p.status!=='Archived'}).forEach(function(p){
    opts+='<option value="'+esc(p.id)+'"'+(currentValue===p.id?' selected':'')+'>'+esc(p.name)+'</option>'});
  return opts}

function buildPhaseOptions(projectId,currentValue){
  var opts='<option value="">No Phase</option>';
  if(!projectId)return opts;
  S.phases.filter(function(ph){return ph.projectId===projectId}).sort(function(a,b){return a.sortOrder-b.sortOrder}).forEach(function(ph){
    opts+='<option value="'+esc(ph.id)+'"'+(currentValue===ph.id?' selected':'')+'>'+esc(ph.name)+'</option>'});
  return opts}

function refreshAddPhases(){
  var projSel=gel('f-project');if(!projSel)return;
  var phaseSel=gel('f-phase');if(!phaseSel)return;
  phaseSel.innerHTML=buildPhaseOptions(projSel.value,'')}

function refreshDetailPhases(){
  var projSel=gel('d-project');if(!projSel)return;
  var phaseSel=gel('d-phase');if(!phaseSel)return;
  phaseSel.innerHTML=buildPhaseOptions(projSel.value,'')}

function onProjectChange(prefix,source){
  /* Mutual exclusion: project, campaign, and opportunity — only one can be set */
  if(source==='project'){
    var projSel=gel(prefix+'-project');if(projSel&&projSel.value){
      var cpSel=gel(prefix+'-campaign');if(cpSel)cpSel.value='';
      var opSel=gel(prefix+'-opportunity');if(opSel)opSel.value=''}}
  else if(source==='campaign'){
    var cpSel2=gel(prefix+'-campaign');if(cpSel2&&cpSel2.value){
      var projSel2=gel(prefix+'-project');if(projSel2){projSel2.value=''}
      var phaseSel2=gel(prefix+'-phase');if(phaseSel2){phaseSel2.innerHTML=buildPhaseOptions('','')}
      var opSel2=gel(prefix+'-opportunity');if(opSel2)opSel2.value=''}}
  else if(source==='opportunity'){
    var opSel3=gel(prefix+'-opportunity');if(opSel3&&opSel3.value){
      var cpSel3=gel(prefix+'-campaign');if(cpSel3)cpSel3.value='';
      var projSel3=gel(prefix+'-project');if(projSel3){projSel3.value=''}
      var phaseSel3=gel(prefix+'-phase');if(phaseSel3){phaseSel3.innerHTML=buildPhaseOptions('','')}}}}

function buildOpportunityOptions(currentValue){
  var opts='<option value="">None</option>';
  S.opportunities.filter(function(o){return o.stage!=='Closed Won'&&o.stage!=='Closed Lost'}).forEach(function(o){
    opts+='<option value="'+esc(o.id)+'"'+(currentValue===o.id?' selected':'')+'>'+esc(o.name)+'</option>'});
  return opts}

/* ═══════════ OPPORTUNITY DETAIL MODAL ═══════════ */
function openOpportunityDetail(id){
  var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  var st=getOpportunityStats(op);
  var eid=escAttr(id);
  var stages=['Lead','Discovery','Video Tracking','Proposal','Negotiation','Closed Won','Closed Lost'];
  var cliOpts=S.clients.map(function(c){return'<option'+(c===op.client?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var isClosed=op.stage==='Closed Won'||op.stage==='Closed Lost';

  var h='<div class="detail-full-header">';
  h+='<div class="tf-modal-top">';
  h+='<input type="text" class="edf edf-name" id="op-name" value="'+esc(op.name)+'"'+(isClosed?' readonly':'')+' style="font-size:18px">';
  h+='<input type="hidden" id="op-id" value="'+esc(op.id)+'">';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="tf-modal-badges">';
  h+='<span class="bg '+opStageClass(op.stage)+'">'+esc(op.stage)+'</span>';
  h+='<span class="op-prob '+probClass(op.probability)+'">'+op.probability+'% prob</span>';
  if(st.totalValue)h+='<span class="bg" style="background:rgba(61,220,132,0.08);color:var(--green)">'+fmtUSD(st.totalValue)+'</span>';
  if(st.weightedValue)h+='<span class="bg" style="background:rgba(255,176,48,0.08);color:var(--amber)">'+fmtUSD(st.weightedValue)+' weighted</span>';
  if(st.openCount)h+='<span class="bg" style="background:rgba(77,166,255,0.08);color:var(--blue)">📋 '+st.openCount+' tasks</span>';
  if(op.client)h+='<span class="bg bg-cl">'+esc(op.client)+'</span>';
  if(op.endClient)h+='<span class="bg bg-ec">'+esc(op.endClient)+'</span>';
  if(op.convertedCampaignId){var cpLink=S.campaigns.find(function(c){return c.id===op.convertedCampaignId});
    if(cpLink)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber);cursor:pointer" onclick="TF.closeModal();setTimeout(function(){TF.openCampaignDetail(\''+escAttr(cpLink.id)+'\')},100)">🎯 '+esc(cpLink.name)+'</span>'}
  h+='</div></div>';

  h+='<div class="detail-split">';
  /* LEFT PANE */
  h+='<div class="detail-split-left">';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Stage</span><select class="edf" id="op-stage"'+(isClosed?' disabled':'')+'>'+stages.map(function(s){return'<option'+(s===op.stage?' selected':'')+'>'+s+'</option>'}).join('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="op-client"><option value="">Select...</option>'+cliOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><input type="text" class="edf" id="op-endclient" value="'+esc(op.endClient)+'"></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Contact Name</span><input type="text" class="edf" id="op-contact" value="'+esc(op.contactName)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Contact Email</span><input type="email" class="edf" id="op-email" value="'+esc(op.contactEmail)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Source</span><input type="text" class="edf" id="op-source" value="'+esc(op.source)+'" placeholder="e.g. Referral, Inbound..."></div>';
  h+='</div>';
  /* Fees */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Strategy Fee</span><input type="number" class="edf" id="op-strategy" value="'+(op.strategyFee||'')+'" min="0" step="0.01"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Setup Fee</span><input type="number" class="edf" id="op-setup" value="'+(op.setupFee||'')+'" min="0" step="0.01"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Monthly Fee</span><input type="number" class="edf" id="op-monthly" value="'+(op.monthlyFee||'')+'" min="0" step="0.01"></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Win Probability %</span><input type="number" class="edf" id="op-prob" value="'+(op.probability||50)+'" min="0" max="100"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Expected Close</span><input type="date" class="edf" id="op-close" value="'+(op.expectedClose?op.expectedClose.toISOString().split('T')[0]:'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Description</span><input type="text" class="edf" id="op-desc" value="'+esc(op.description)+'" placeholder="Brief description..."></div>';
  h+='</div>';

  /* Actions */
  h+='<div class="ed-actions" style="margin-top:12px">';
  h+='<button class="btn btn-p" onclick="TF.saveOpportunity()">💾 Save</button>';
  if(!isClosed){
    h+='<button class="btn" style="background:rgba(61,220,132,0.1);color:var(--green);border-color:rgba(61,220,132,0.3)" onclick="TF.convertOpportunity(\''+eid+'\')">🏆 Convert to Campaign</button>';
    h+='<button class="btn" style="background:rgba(255,51,88,0.1);color:var(--red);border-color:rgba(255,51,88,0.3)" onclick="TF.closeAsLost(\''+eid+'\')">✕ Close as Lost</button>'}
  h+='<button class="btn ab-del" style="margin-left:auto" onclick="TF.confirmDeleteOpportunity()">🗑 Delete</button>';
  h+='</div>';
  h+='</div>';

  /* RIGHT PANE */
  h+='<div class="detail-split-right">';
  /* Notes */
  h+='<div style="margin-bottom:16px"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="op-notes" rows="3" placeholder="Notes about this opportunity...">'+esc(op.notes)+'</textarea></div>';

  /* Open Tasks */
  h+='<div style="margin-bottom:16px"><span class="ed-lbl" style="display:flex;justify-content:space-between;align-items:center">Open Tasks ('+st.openCount+')<button class="btn" style="font-size:10px;padding:3px 10px" onclick="TF.closeModal();TF.openAddModal()">+ Add</button></span>';
  if(st.openTasks.length){st.openTasks.forEach(function(t){
    var eid2=escAttr(t.id);
    h+='<div class="proj-phase-task">';
    h+='<span class="bg '+impCls(t.importance)+'" style="font-size:9px;padding:2px 6px;flex-shrink:0">'+esc(t.importance.charAt(0))+'</span>';
    h+='<span class="proj-phase-task-name" onclick="TF.closeModal();setTimeout(function(){TF.openDetail(\''+eid2+'\')},100)">'+esc(t.item)+'</span>';
    if(t.due)h+='<span style="font-size:10px;color:var(--t4)">'+fmtDShort(t.due)+'</span>';
    h+='<button class="ab ab-dn ab-mini" onclick="event.stopPropagation();TF.done(\''+eid2+'\')" title="Complete">'+CK_XS+'</button>';
    h+='</div>'})}
  else{h+='<div style="padding:12px;text-align:center;color:var(--t4);font-size:12px">No open tasks</div>'}
  h+='</div>';

  /* Completed Tasks */
  if(st.doneTasks.length){
    h+='<div style="margin-bottom:16px"><span class="ed-lbl">Completed ('+st.doneCount+')</span>';
    st.doneTasks.slice(0,20).forEach(function(d){
      h+='<div class="proj-phase-task" style="opacity:.6">';
      h+='<span style="color:var(--green);flex-shrink:0">'+CK_XS+'</span>';
      h+='<span style="flex:1;font-size:12px;color:var(--t3)">'+esc(d.item)+'</span>';
      if(d.duration)h+='<span style="font-size:10px;color:var(--t4)">'+fmtM(d.duration)+'</span>';
      h+='</div>'});
    h+='</div>'}

  h+='</div></div>';

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on','full-detail')}

async function saveOpportunity(){
  var id=gel('op-id').value;var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  op.name=(gel('op-name').value||'').trim();if(!op.name){toast('⚠ Opportunity name required','warn');return}
  op.stage=gel('op-stage').value;
  op.client=gel('op-client').value||'';
  op.endClient=(gel('op-endclient').value||'').trim();
  op.contactName=(gel('op-contact').value||'').trim();
  op.contactEmail=(gel('op-email').value||'').trim();
  op.source=(gel('op-source').value||'').trim();
  op.strategyFee=parseFloat(gel('op-strategy').value)||0;
  op.setupFee=parseFloat(gel('op-setup').value)||0;
  op.monthlyFee=parseFloat(gel('op-monthly').value)||0;
  op.probability=parseInt(gel('op-prob').value)||50;
  op.expectedClose=gel('op-close').value?new Date(gel('op-close').value+'T00:00:00'):null;
  op.description=(gel('op-desc').value||'').trim();
  op.notes=gel('op-notes').value||'';
  await dbEditOpportunity(id,op);
  toast('Saved: '+op.name,'ok');closeModal();render()}

function openAddOpportunity(){
  var cliOpts=S.clients.map(function(c){return'<option>'+esc(c)+'</option>'}).join('');
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">💎 New Opportunity</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div style="padding:6px 0"><input type="text" class="edf" id="nop-name" placeholder="Opportunity name..." autofocus style="font-size:15px;font-weight:600;padding:11px 14px"></div>';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Stage</span><select class="edf" id="nop-stage"><option>Lead</option><option>Discovery</option><option>Video Tracking</option><option>Proposal</option><option>Negotiation</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="nop-client"><option value="">Select...</option>'+cliOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><input type="text" class="edf" id="nop-endclient" placeholder="End client..."></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Contact Name</span><input type="text" class="edf" id="nop-contact" placeholder="Key contact..."></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Contact Email</span><input type="email" class="edf" id="nop-email" placeholder="email@..."></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Source</span><input type="text" class="edf" id="nop-source" placeholder="Referral, Inbound..."></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Strategy Fee</span><input type="number" class="edf" id="nop-strategy" min="0" step="0.01" placeholder="0.00"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Setup Fee</span><input type="number" class="edf" id="nop-setup" min="0" step="0.01" placeholder="0.00"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Monthly Fee</span><input type="number" class="edf" id="nop-monthly" min="0" step="0.01" placeholder="0.00"></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Win Probability %</span><input type="number" class="edf" id="nop-prob" value="50" min="0" max="100"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Expected Close</span><input type="date" class="edf" id="nop-close"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Description</span><input type="text" class="edf" id="nop-desc" placeholder="Brief description..."></div>';
  h+='</div>';
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="nop-notes" placeholder="Notes about this opportunity..." rows="2"></textarea></div>';
  h+='<div class="ed-actions"><button class="btn btn-p" onclick="TF.addOpportunity()">💎 Create Opportunity</button></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  setTimeout(function(){var fi=gel('nop-name');if(fi)fi.focus()},100)}

async function addOpportunity(){
  var name=(gel('nop-name').value||'').trim();if(!name){toast('⚠ Enter opportunity name','warn');return}
  var data={name:name,stage:gel('nop-stage').value||'Lead',
    client:gel('nop-client').value||'',endClient:(gel('nop-endclient').value||'').trim(),
    contactName:(gel('nop-contact').value||'').trim(),contactEmail:(gel('nop-email').value||'').trim(),
    source:(gel('nop-source').value||'').trim(),
    strategyFee:parseFloat(gel('nop-strategy').value)||0,setupFee:parseFloat(gel('nop-setup').value)||0,
    monthlyFee:parseFloat(gel('nop-monthly').value)||0,
    probability:parseInt(gel('nop-prob').value)||50,
    expectedClose:gel('nop-close').value||null,
    description:(gel('nop-desc').value||'').trim(),notes:gel('nop-notes').value||''};
  var result=await dbAddOpportunity(data);
  if(!result){toast('❌ Failed to create opportunity','warn');return}
  S.opportunities.unshift({id:result.id,name:data.name,description:data.description,stage:data.stage,
    client:data.client,endClient:data.endClient,contactName:data.contactName,contactEmail:data.contactEmail,
    strategyFee:data.strategyFee,setupFee:data.setupFee,monthlyFee:data.monthlyFee,
    probability:data.probability,expectedClose:data.expectedClose?new Date(data.expectedClose+'T00:00:00'):null,
    source:data.source,notes:data.notes,closedAt:null,convertedCampaignId:'',created:new Date()});
  toast('Created: '+data.name,'ok');closeModal();render()}

function confirmDeleteOpportunity(){
  var id=gel('op-id').value;var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  gel('detail-body').innerHTML='<div style="padding:40px;text-align:center"><h2 style="margin-bottom:16px;color:var(--t1)">Delete Opportunity?</h2>'+
    '<p style="color:var(--t3);margin-bottom:24px">This will permanently delete <strong>'+esc(op.name)+'</strong>. Tasks linked to this opportunity will be unlinked.</p>'+
    '<button class="btn ab-del" onclick="TF.doDeleteOpportunity(\''+escAttr(id)+'\')">🗑 Delete</button>'+
    '<button class="btn" onclick="TF.openOpportunityDetail(\''+escAttr(id)+'\')" style="margin-left:8px">Cancel</button></div>'}

async function doDeleteOpportunity(id){
  await dbDeleteOpportunity(id);
  /* Unlink tasks */
  S.tasks.forEach(function(t){if(t.opportunity===id)t.opportunity=''});
  S.done.forEach(function(d){if(d.opportunity===id)d.opportunity=''});
  S.opportunities=S.opportunities.filter(function(o){return o.id!==id});
  toast('Deleted opportunity','ok');closeModal();render()}

async function convertOpportunity(id){
  var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  if(!confirm('Convert "'+op.name+'" to a Campaign? This will:\n\n• Create a new Campaign with pre-filled data\n• Move all linked tasks to the new Campaign\n• Mark this opportunity as Closed Won'))return;

  /* 1. Create campaign from opportunity data */
  var cpData={name:op.name,partner:op.client,endClient:op.endClient,
    status:'Setup',platform:'',strategyFee:op.strategyFee,setupFee:op.setupFee,
    monthlyFee:op.monthlyFee,monthlyAdSpend:0,campaignTerm:'',
    plannedLaunch:null,actualLaunch:null,renewalDate:null,
    goal:op.description,proposalLink:'',reportsLink:'',videoAssetsLink:'',
    transcriptsLink:'',awarenessLP:'',considerationLP:'',decisionLP:'',
    contractLink:'',notes:op.notes};
  var cpResult=await dbAddCampaign(cpData);
  if(!cpResult){toast('❌ Failed to create campaign','warn');return}

  /* 2. Update opportunity */
  op.stage='Closed Won';op.closedAt=new Date();op.convertedCampaignId=cpResult.id;
  await dbEditOpportunity(id,op);

  /* 3. Batch migrate tasks */
  var taskIds=S.tasks.filter(function(t){return t.opportunity===id}).map(function(t){return t.id});
  if(taskIds.length){
    await _sb.from('tasks').update({campaign:cpResult.id,opportunity:''}).in('id',taskIds);
    S.tasks.forEach(function(t){if(t.opportunity===id){t.campaign=cpResult.id;t.opportunity=''}})}

  /* 4. Batch migrate done items */
  var doneIds=S.done.filter(function(d){return d.opportunity===id}).map(function(d){return d.id});
  if(doneIds.length){
    await _sb.from('done').update({campaign:cpResult.id,opportunity:''}).in('id',doneIds);
    S.done.forEach(function(d){if(d.opportunity===id){d.campaign=cpResult.id;d.opportunity=''}})}

  /* 5. Add campaign to local state */
  S.campaigns.unshift({id:cpResult.id,name:cpData.name,partner:cpData.partner,endClient:cpData.endClient,
    status:'Setup',platform:'',strategyFee:cpData.strategyFee,setupFee:cpData.setupFee,
    monthlyFee:cpData.monthlyFee,monthlyAdSpend:0,campaignTerm:'',
    plannedLaunch:null,actualLaunch:null,renewalDate:null,goal:cpData.goal,
    proposalLink:'',reportsLink:'',videoAssetsLink:'',transcriptsLink:'',
    awarenessLP:'',considerationLP:'',decisionLP:'',contractLink:'',
    notes:cpData.notes,created:new Date()});

  toast('🏆 Converted to campaign: '+op.name,'ok');closeModal();render()}

async function closeAsLost(id){
  var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  if(!confirm('Close "'+op.name+'" as Lost?'))return;
  op.stage='Closed Lost';op.closedAt=new Date();
  await dbEditOpportunity(id,op);
  toast('Closed Lost: '+op.name,'warn');closeModal();render()}

/* ═══════════ PROJECT DETAIL MODAL ═══════════ */
function openProjectDetail(id){
  var proj=S.projects.find(function(p){return p.id===id});if(!proj)return;
  var st=getProjectStats(proj);
  var eid=escAttr(id);
  var statuses=['Planning','Active','On Hold','Completed','Archived'];

  var h='<div class="detail-full-header">';
  h+='<div class="tf-modal-top">';
  h+='<input type="text" class="edf edf-name" id="pj-name" value="'+esc(proj.name)+'">';
  h+='<input type="hidden" id="pj-id" value="'+esc(proj.id)+'">';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="tf-modal-badges">';
  h+='<span class="bg '+projStatusClass(proj.status)+'">'+esc(proj.status)+'</span>';
  h+='<span class="bg-es">'+st.openCount+' open</span>';
  h+='<span class="bg-es" style="color:var(--green)">'+st.doneCount+' done</span>';
  if(st.totalTime)h+='<span class="bg-es" style="color:var(--pink)">'+fmtM(st.totalTime)+' tracked</span>';
  h+='<span class="proj-card-pct" style="color:'+proj.color+';font-size:14px;margin-left:auto">'+st.progress+'%</span>';
  h+='</div></div>';

  h+='<div class="detail-split">';

  /* ── Left pane: project info ── */
  h+='<div class="detail-split-left">';
  h+='<div class="ed-fld" style="margin-bottom:12px"><span class="ed-lbl">Goal / Description</span>';
  h+='<textarea class="edf edf-notes" id="pj-desc" placeholder="What\'s the big outcome you\'re working toward?">'+esc(proj.description)+'</textarea></div>';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Status</span><select class="edf" id="pj-status">'+statuses.map(function(s){return'<option'+(s===proj.status?' selected':'')+'>'+s+'</option>'}).join('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Color</span><input type="color" class="edf" id="pj-color" value="'+(proj.color||'#ff0099')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Start Date</span><input type="date" class="edf" id="pj-start" value="'+(proj.startDate?proj.startDate.toISOString().slice(0,10):'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Target Date</span><input type="date" class="edf" id="pj-target" value="'+(proj.targetDate?proj.targetDate.toISOString().slice(0,10):'')+'"></div>';
  h+='</div>';
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="pj-notes" placeholder="Additional notes...">'+esc(proj.notes)+'</textarea></div>';
  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" onclick="TF.saveProject()">💾 Save Project</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.confirmDeleteProject()">🗑️ Delete</button>';
  h+='</div>';
  h+='<div id="pj-del-zone"></div>';
  h+='</div>';

  /* ── Right pane: phases + tasks + charts ── */
  h+='<div class="detail-split-right">';

  /* Phases */
  h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
  h+='<span style="font-weight:700;font-size:14px;color:var(--t1)">Phases</span>';
  h+='<button class="btn" style="padding:5px 12px;font-size:11px" onclick="TF.addPhaseToProject(\''+eid+'\')">+ Add Phase</button></div>';
  h+='<div id="pj-phases">';
  if(!st.phases.length){h+='<div style="color:var(--t4);font-size:12px;padding:12px 0">No phases yet. Add phases to break this project into milestones.</div>'}
  st.phases.forEach(function(ph,i){
    var ps=getPhaseStats(ph,st);
    var phEid=escAttr(ph.id);
    var statusCls=ph.status==='Not Started'?'ns':ph.status==='In Progress'?'ip':'cp';
    h+='<div class="proj-phase" id="phase-'+esc(ph.id)+'">';
    h+='<div class="proj-phase-header" onclick="var el=document.getElementById(\'phase-tasks-'+esc(ph.id)+'\');el.style.display=el.style.display===\'none\'?\'block\':\'none\'">';
    h+='<span class="proj-phase-name">'+esc(ph.name)+'</span>';
    h+='<span class="proj-phase-badge '+statusCls+'">'+esc(ph.status)+'</span>';
    if(ph.startDate||ph.endDate){h+='<span style="font-size:10px;color:var(--t4)">';
      if(ph.startDate)h+=fmtDShort(ph.startDate);if(ph.startDate&&ph.endDate)h+=' → ';if(ph.endDate)h+=fmtDShort(ph.endDate);h+='</span>'}
    h+='<span style="font-size:10px;color:var(--t4);font-family:var(--fd);font-weight:600">'+ps.doneCount+'/'+((ps.openCount+ps.doneCount)||0)+'</span>';
    h+='<div class="proj-phase-controls" onclick="event.stopPropagation()">';
    if(i>0)h+='<button class="ab ab-mini" onclick="TF.movePhase(\''+phEid+'\',-1)" title="Move Up">↑</button>';
    if(i<st.phases.length-1)h+='<button class="ab ab-mini" onclick="TF.movePhase(\''+phEid+'\',1)" title="Move Down">↓</button>';
    h+='<button class="ab ab-mini" onclick="TF.editPhaseInline(\''+phEid+'\')" title="Edit">✎</button>';
    h+='<button class="ab ab-del ab-mini" onclick="TF.deletePhase(\''+phEid+'\')" title="Delete">×</button>';
    h+='</div></div>';

    /* Phase tasks */
    h+='<div class="proj-phase-tasks" id="phase-tasks-'+esc(ph.id)+'">';
    /* Progress bar */
    if(ps.openCount+ps.doneCount>0){h+='<div class="proj-progress" style="margin:6px 0 8px"><div class="proj-progress-fill" style="width:'+ps.progress+'%;background:'+proj.color+'"></div></div>'}
    ps.doneTasks.forEach(function(d){
      h+='<div class="proj-phase-task" style="opacity:0.5"><span style="color:var(--green)">'+CK_XS+'</span><span class="proj-phase-task-name" style="text-decoration:line-through;color:var(--t4)">'+esc(d.item)+'</span><span style="font-size:10px;color:var(--t4);font-family:var(--fd)">'+fmtM(d.duration)+'</span></div>'});
    ps.openTasks.forEach(function(t){var teid=escAttr(t.id);
      h+='<div class="proj-phase-task"><span class="bg '+impCls(t.importance)+'" style="font-size:9px;padding:1px 6px">'+esc((t.importance||'I')[0])+'</span>';
      h+='<span class="proj-phase-task-name" onclick="TF.openDetail(\''+teid+'\')">'+esc(t.item)+'</span>';
      if(t.due)h+='<span class="bg-du'+(t.due<today()?' od':'')+'\" style="font-size:9px">'+fmtDShort(t.due)+'</span>';
      h+='<button class="ab ab-dn ab-mini" onclick="TF.done(\''+teid+'\')" title="Complete">'+CK_XS+'</button></div>'});
    h+='</div></div>'});

  /* Backlog: tasks with project but no phase */
  var backlog=st.openTasks.filter(function(t){return!t.phase});
  var backlogDone=st.doneTasks.filter(function(d){return!d.phase});
  if(backlog.length||backlogDone.length){
    h+='<div class="proj-backlog"><span class="proj-backlog-label">Backlog (no phase)</span>';
    backlogDone.forEach(function(d){
      h+='<div class="proj-phase-task" style="opacity:0.5"><span style="color:var(--green)">'+CK_XS+'</span><span style="text-decoration:line-through;color:var(--t4);font-size:12px">'+esc(d.item)+'</span></div>'});
    backlog.forEach(function(t){var teid=escAttr(t.id);
      h+='<div class="proj-phase-task"><span class="bg '+impCls(t.importance)+'" style="font-size:9px;padding:1px 6px">'+esc((t.importance||'I')[0])+'</span>';
      h+='<span class="proj-phase-task-name" onclick="TF.openDetail(\''+teid+'\')">'+esc(t.item)+'</span>';
      h+='<button class="ab ab-dn ab-mini" onclick="TF.done(\''+teid+'\')" title="Complete">'+CK_XS+'</button></div>'});
    h+='</div>'}

  h+='</div>';

  /* Charts */
  h+='<details style="margin-top:12px"><summary style="font-weight:700;font-size:13px;color:var(--t2);cursor:pointer;padding:8px 0">Charts</summary>';
  h+='<div class="proj-chart-grid">';
  h+='<div class="ch-card" style="padding:14px"><h3 style="margin-top:0;font-size:12px;color:var(--t3)">Progress</h3><div class="ch-w" style="height:180px" id="pj-donut"></div></div>';
  h+='<div class="ch-card" style="padding:14px"><h3 style="margin-top:0;font-size:12px;color:var(--t3)">Time by Phase</h3><div class="ch-w" style="height:180px" id="pj-phase-time"></div></div>';
  h+='</div></details>';

  h+='</div></div>';

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on','full-detail');

  /* Initialize charts after render */
  setTimeout(function(){
    /* Progress donut */
    if(st.openCount+st.doneCount>0)mkDonut('pj-donut',{Done:st.doneCount,Open:st.openCount});
    /* Time by phase */
    var phaseTime={};
    st.phases.forEach(function(ph){
      var pts=getPhaseStats(ph,st);
      var time=pts.doneTasks.reduce(function(s,d){return s+(d.duration||0)},0)+pts.openTasks.reduce(function(s,t){return s+(t.duration||0)},0);
      if(time>0)phaseTime[ph.name]=time});
    if(Object.keys(phaseTime).length)mkHBar('pj-phase-time',phaseTime);
  },200)}

async function saveProject(){
  var id=gel('pj-id').value;var proj=S.projects.find(function(p){return p.id===id});if(!proj)return;
  var name=(gel('pj-name')||{}).value;if(!name||!name.trim()){toast('⚠ Project name required','warn');return}
  proj.name=name.trim();proj.description=(gel('pj-desc')||{}).value||'';
  proj.status=(gel('pj-status')||{}).value||'Planning';proj.color=(gel('pj-color')||{}).value||'#ff0099';
  proj.startDate=gel('pj-start').value?new Date(gel('pj-start').value+'T00:00:00'):null;
  proj.targetDate=gel('pj-target').value?new Date(gel('pj-target').value+'T00:00:00'):null;
  proj.notes=(gel('pj-notes')||{}).value||'';
  await dbEditProject(id,{name:proj.name,description:proj.description,status:proj.status,color:proj.color,
    startDate:proj.startDate?proj.startDate.toISOString().slice(0,10):null,
    targetDate:proj.targetDate?proj.targetDate.toISOString().slice(0,10):null,notes:proj.notes});
  toast('💾 Saved: '+proj.name,'ok');closeModal();render()}

function openAddProject(){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">📁 New Project</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="frm" style="margin-top:8px">';
  h+='<div class="frm-grid">';
  h+='<div class="fld full"><label>Project Name *</label><input type="text" id="pj-add-name" placeholder="What\'s the big idea?" autofocus></div>';
  h+='<div class="fld full"><label>Goal / Description</label><textarea id="pj-add-desc" placeholder="What\'s the big outcome you\'re working toward?" rows="3"></textarea></div>';
  h+='<div class="fld"><label>Status</label><select id="pj-add-status"><option selected>Planning</option><option>Active</option></select></div>';
  h+='<div class="fld"><label>Color</label><input type="color" id="pj-add-color" value="#ff0099"></div>';
  h+='<div class="fld"><label>Start Date</label><input type="date" id="pj-add-start" value="'+new Date().toISOString().slice(0,10)+'"></div>';
  h+='<div class="fld"><label>Target Date</label><input type="date" id="pj-add-target"></div>';
  h+='<div class="fld full"><label>Notes</label><textarea id="pj-add-notes" placeholder="Any initial thoughts..." rows="2"></textarea></div>';
  h+='</div>';
  h+='<div style="margin-top:8px"><label style="font-size:10.5px;font-weight:600;color:var(--t3);text-transform:uppercase;letter-spacing:0.7px;display:block;margin-bottom:6px">Initial Phases (optional)</label>';
  h+='<div id="pj-init-phases" style="display:flex;flex-direction:column;gap:6px">';
  h+='<input type="text" class="edf" placeholder="Phase 1 name, e.g. Research" id="pj-ph-1">';
  h+='<input type="text" class="edf" placeholder="Phase 2 name, e.g. Design" id="pj-ph-2">';
  h+='<input type="text" class="edf" placeholder="Phase 3 name, e.g. Build" id="pj-ph-3">';
  h+='</div>';
  h+='<button class="btn" style="margin-top:6px;padding:4px 12px;font-size:11px" onclick="var c=gel(\'pj-init-phases\');var n=c.children.length+1;var inp=document.createElement(\'input\');inp.type=\'text\';inp.className=\'edf\';inp.placeholder=\'Phase \'+n+\' name\';inp.id=\'pj-ph-\'+n;c.appendChild(inp)">+ Add more</button>';
  h+='</div>';
  h+='<button class="btn btn-p" onclick="TF.addProject()" style="margin-top:16px">📁 Create Project</button>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  setTimeout(function(){var fi=gel('pj-add-name');if(fi)fi.focus()},100)}

async function addProject(){
  var name=(gel('pj-add-name')||{}).value;if(!name||!name.trim()){toast('⚠ Enter a project name','warn');return}
  var data={name:name.trim(),description:(gel('pj-add-desc')||{}).value||'',
    status:(gel('pj-add-status')||{}).value||'Planning',color:(gel('pj-add-color')||{}).value||'#ff0099',
    startDate:gel('pj-add-start').value||null,targetDate:gel('pj-add-target').value||null,
    notes:(gel('pj-add-notes')||{}).value||''};
  var result=await dbAddProject(data);
  if(!result){return}
  var projId=result.id;
  S.projects.unshift({id:projId,name:data.name,description:data.description,status:data.status,
    color:data.color,startDate:data.startDate?new Date(data.startDate+'T00:00:00'):null,
    targetDate:data.targetDate?new Date(data.targetDate+'T00:00:00'):null,notes:data.notes,created:new Date()});
  /* Create initial phases */
  var phaseContainer=gel('pj-init-phases');
  if(phaseContainer){
    var inputs=phaseContainer.querySelectorAll('input');
    var order=0;
    for(var i=0;i<inputs.length;i++){
      var pn=inputs[i].value.trim();
      if(pn){
        var phResult=await dbAddPhase({projectId:projId,name:pn,sortOrder:order,status:'Not Started'});
        if(phResult){S.phases.push({id:phResult.id,projectId:projId,name:pn,description:'',sortOrder:order,
          startDate:null,endDate:null,status:'Not Started',created:new Date()})}
        order++}}}
  toast('📁 Created: '+data.name,'ok');closeModal();nav('projects')}

function confirmDeleteProject(){
  var id=gel('pj-id').value;var proj=S.projects.find(function(p){return p.id===id});if(!proj)return;
  gel('pj-del-zone').innerHTML='<div class="del-confirm"><span>Permanently delete "'+esc(proj.name)+'" and all its phases?</span><button class="btn btn-d" onclick="TF.doDeleteProject(\''+escAttr(id)+'\')">Yes, Delete</button><button class="btn" onclick="document.getElementById(\'pj-del-zone\').innerHTML=\'\'">Cancel</button></div>'}

async function doDeleteProject(id){
  var proj=S.projects.find(function(p){return p.id===id});if(!proj)return;
  /* Clear project/phase refs from tasks */
  S.tasks.forEach(function(t){if(t.project===id){t.project='';t.phase='';dbEditTask(t.id,t)}});
  S.done.forEach(function(d){if(d.project===id){d.project='';d.phase=''}});
  await dbDeleteProject(id);
  S.projects=S.projects.filter(function(p){return p.id!==id});
  S.phases=S.phases.filter(function(ph){return ph.projectId!==id});
  toast('🗑️ Deleted: '+proj.name,'warn');closeModal();render()}

/* ═══════════ PHASE CRUD ═══════════ */
function addPhaseToProject(projectId){
  var container=gel('pj-phases');if(!container)return;
  var h='<div class="proj-phase" id="new-phase-form" style="border-color:var(--pink)">';
  h+='<div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px">';
  h+='<input type="text" class="edf" id="np-name" placeholder="Phase name..." autofocus>';
  h+='<div style="display:flex;gap:8px">';
  h+='<input type="date" class="edf" id="np-start" style="flex:1" title="Start date">';
  h+='<input type="date" class="edf" id="np-end" style="flex:1" title="End date">';
  h+='</div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="btn btn-p" style="padding:6px 14px;font-size:11px" onclick="TF.doAddPhase(\''+escAttr(projectId)+'\')">Add Phase</button>';
  h+='<button class="btn" style="padding:6px 14px;font-size:11px" onclick="var f=gel(\'new-phase-form\');if(f)f.remove()">Cancel</button>';
  h+='</div></div></div>';
  container.insertAdjacentHTML('beforeend',h);
  setTimeout(function(){var ni=gel('np-name');if(ni)ni.focus()},50)}

async function doAddPhase(projectId){
  var name=(gel('np-name')||{}).value;if(!name||!name.trim()){toast('⚠ Enter a phase name','warn');return}
  var existingPhases=S.phases.filter(function(p){return p.projectId===projectId});
  var maxOrder=existingPhases.reduce(function(m,p){return Math.max(m,p.sortOrder)},0);
  var data={projectId:projectId,name:name.trim(),sortOrder:maxOrder+1,
    startDate:gel('np-start').value||null,endDate:gel('np-end').value||null,status:'Not Started'};
  var result=await dbAddPhase(data);
  if(result){S.phases.push({id:result.id,projectId:projectId,name:data.name,description:'',sortOrder:data.sortOrder,
    startDate:data.startDate?new Date(data.startDate+'T00:00:00'):null,
    endDate:data.endDate?new Date(data.endDate+'T00:00:00'):null,status:'Not Started',created:new Date()});
    toast('Added phase: '+data.name,'ok');openProjectDetail(projectId)}}

function editPhaseInline(phaseId){
  var phase=S.phases.find(function(p){return p.id===phaseId});if(!phase)return;
  var proj=S.projects.find(function(p){return p.id===phase.projectId});if(!proj)return;
  var statuses=['Not Started','In Progress','Complete'];
  var container=gel('phase-'+phaseId);if(!container)return;
  var h='<div style="padding:12px 16px;display:flex;flex-direction:column;gap:8px;background:var(--bg2)">';
  h+='<input type="text" class="edf" id="ep-name" value="'+esc(phase.name)+'">';
  h+='<div style="display:flex;gap:8px">';
  h+='<select class="edf" id="ep-status" style="flex:1">'+statuses.map(function(s){return'<option'+(s===phase.status?' selected':'')+'>'+s+'</option>'}).join('')+'</select>';
  h+='<input type="date" class="edf" id="ep-start" value="'+(phase.startDate?phase.startDate.toISOString().slice(0,10):'')+'" style="flex:1" title="Start">';
  h+='<input type="date" class="edf" id="ep-end" value="'+(phase.endDate?phase.endDate.toISOString().slice(0,10):'')+'" style="flex:1" title="End">';
  h+='</div>';
  h+='<div style="display:flex;gap:8px">';
  h+='<button class="btn btn-p" style="padding:6px 14px;font-size:11px" onclick="TF.savePhase(\''+escAttr(phaseId)+'\')">Save</button>';
  h+='<button class="btn" style="padding:6px 14px;font-size:11px" onclick="TF.openProjectDetail(\''+escAttr(phase.projectId)+'\')">Cancel</button>';
  h+='</div></div>';
  container.innerHTML=h;
  setTimeout(function(){var ni=gel('ep-name');if(ni)ni.focus()},50)}

async function savePhase(phaseId){
  var phase=S.phases.find(function(p){return p.id===phaseId});if(!phase)return;
  var name=(gel('ep-name')||{}).value;if(!name||!name.trim()){toast('⚠ Phase name required','warn');return}
  phase.name=name.trim();phase.status=(gel('ep-status')||{}).value||'Not Started';
  phase.startDate=gel('ep-start').value?new Date(gel('ep-start').value+'T00:00:00'):null;
  phase.endDate=gel('ep-end').value?new Date(gel('ep-end').value+'T00:00:00'):null;
  await dbEditPhase(phaseId,{name:phase.name,description:phase.description,sortOrder:phase.sortOrder,
    startDate:phase.startDate?phase.startDate.toISOString().slice(0,10):null,
    endDate:phase.endDate?phase.endDate.toISOString().slice(0,10):null,status:phase.status});
  toast('💾 Phase saved','ok');openProjectDetail(phase.projectId)}

async function deletePhase(phaseId){
  var phase=S.phases.find(function(p){return p.id===phaseId});if(!phase)return;
  if(!confirm('Delete phase "'+phase.name+'"?'))return;
  /* Clear phase ref from tasks but keep project ref */
  S.tasks.forEach(function(t){if(t.phase===phaseId){t.phase='';dbEditTask(t.id,t)}});
  S.done.forEach(function(d){if(d.phase===phaseId){d.phase=''}});
  await dbDeletePhase(phaseId);
  S.phases=S.phases.filter(function(p){return p.id!==phaseId});
  toast('🗑️ Phase deleted','warn');openProjectDetail(phase.projectId)}

async function movePhase(phaseId,direction){
  var phase=S.phases.find(function(p){return p.id===phaseId});if(!phase)return;
  var siblings=S.phases.filter(function(p){return p.projectId===phase.projectId}).sort(function(a,b){return a.sortOrder-b.sortOrder});
  var idx=siblings.findIndex(function(p){return p.id===phaseId});
  var swapIdx=idx+direction;
  if(swapIdx<0||swapIdx>=siblings.length)return;
  var other=siblings[swapIdx];
  var tmpOrder=phase.sortOrder;phase.sortOrder=other.sortOrder;other.sortOrder=tmpOrder;
  await dbEditPhase(phase.id,{name:phase.name,description:phase.description,sortOrder:phase.sortOrder,
    startDate:phase.startDate?phase.startDate.toISOString().slice(0,10):null,
    endDate:phase.endDate?phase.endDate.toISOString().slice(0,10):null,status:phase.status});
  await dbEditPhase(other.id,{name:other.name,description:other.description,sortOrder:other.sortOrder,
    startDate:other.startDate?other.startDate.toISOString().slice(0,10):null,
    endDate:other.endDate?other.endDate.toISOString().slice(0,10):null,status:other.status});
  openProjectDetail(phase.projectId)}

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
