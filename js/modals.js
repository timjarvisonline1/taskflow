
/* ═══════════ DETAIL MODAL ═══════════ */
function fmtLogTs(ts){if(!ts)return'';var d=new Date(ts);return MO[d.getMonth()]+' '+d.getDate()+', '+(d.getHours()%12||12)+':'+String(d.getMinutes()).padStart(2,'0')+' '+(d.getHours()<12?'AM':'PM')}

function openDetail(id){
  var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var td=today(),ts=tmrGet(id),running=!!ts.started,hasT=running||(ts.elapsed||0)>0;
  var elapsed=tmrElapsed(id),eid=escAttr(id);
  var cliOpts='<option value="">Select...</option>'+S.clients.map(function(c){return'<option'+(c===(task.client||'')?' selected':'')+'>'+esc(c)+'</option>'}).join('');
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
      h+='<button class="btn" onclick="TF.pause(\''+eid+'\')" style="flex:1;padding:12px;font-size:13px">'+icon('pause',12)+' Pause</button>';
    }else{
      h+='<button class="btn btn-go" onclick="TF.start(\''+eid+'\')" style="flex:1;padding:12px;font-size:13px">'+icon('play',12)+' Start</button>';
    }
    h+='<button class="btn btn-p" onclick="TF.markAlreadyCompleted(\''+eid+'\')" style="flex:1;padding:12px;font-size:13px">'+CK_S+' Done</button>';
    h+='<button class="btn" onclick="TF.openFocus(\''+eid+'\')" style="padding:12px;background:rgba(255,0,153,0.1);color:var(--pink);border-color:rgba(255,0,153,0.2)">'+icon('target',12)+'</button>';
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
    if(task.flag)h+='<span class="bg bg-fl">'+icon('flag',12)+'</span>';
    if(task.client)h+='<span class="bg bg-cl">'+esc(task.client)+'</span>';
    if(task.endClient)h+='<span class="bg bg-ec">'+esc(task.endClient)+'</span>';
    if(task.category)h+='<span class="bg bg-ca">'+esc(task.category)+'</span>';
    h+='</div>';

    /* Notes (prominent) */
    h+='<div style="padding:0 16px 12px">';
    h+='<textarea class="edf edf-notes" id="d-notes" placeholder="Notes..." style="min-height:80px;font-size:14px">'+esc(task.notes)+'</textarea></div>';

    /* Details accordion */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">Details <span style="font-size:10px;color:var(--t4)">'+icon('chevron_down',10)+'</span></summary>';
    h+='<div class="ed-grid" style="grid-template-columns:1fr">';
    h+='<div class="ed-fld"><span class="ed-lbl">Due Date</span><input type="datetime-local" class="edf" id="d-due" value="'+(task.due?fmtISO(task.due):'')+'"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="d-imp">'+impOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="d-cat">'+catOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="d-type">'+typeOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="d-est" value="'+(task.est||'')+'" min="0" placeholder="30"></div>';
    h+='</div>';
    var mCli=!!task.client,mCp=!!task.campaign,mOpp=!!task.opportunity,mProj=!!task.project,mMtg=!!task.meetingKey;
    h+='<div class="modal-toggles">';
    h+='<label class="modal-toggle"><input type="checkbox" id="mb-cli"'+(mCli?' checked':'')+' onchange="TF.modalToggle(\'mb-cli-fields\',this.checked)"><span>Client</span></label>';
    h+='<label class="modal-toggle"><input type="checkbox" id="mb-campaign"'+(mCp?' checked':'')+' onchange="TF.modalToggle(\'mb-campaign-fields\',this.checked)"><span>Campaign</span></label>';
    h+='<label class="modal-toggle"><input type="checkbox" id="mb-opp"'+(mOpp?' checked':'')+' onchange="TF.modalToggle(\'mb-opp-fields\',this.checked)"><span>Opportunity</span></label>';
    h+='<label class="modal-toggle"><input type="checkbox" id="mb-proj"'+(mProj?' checked':'')+' onchange="TF.modalToggle(\'mb-proj-fields\',this.checked)"><span>Project</span></label>';
    h+='<label class="modal-toggle"><input type="checkbox" id="mb-mtg"'+(mMtg?' checked':'')+' onchange="TF.modalToggle(\'mb-mtg-fields\',this.checked)"><span>Meeting</span></label>';
    h+='</div>';
    h+='<div class="mt-fields" id="mb-cli-fields" style="'+(mCli?'':'display:none')+'"><div class="ed-grid" style="grid-template-columns:1fr">';
    h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="d-cli" onchange="TF.refreshDetailEndClients()">'+cliOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="d-ec" onchange="TF.refreshDetailCampaigns();TF.ecAddNew(\'d-ec\')">'+buildEndClientOptions(task.endClient||'',task.client)+'</select></div>';
    h+='</div></div>';
    h+='<div class="mt-fields" id="mb-campaign-fields" style="'+(mCp?'':'display:none')+'"><div class="ed-grid" style="grid-template-columns:1fr">';
    h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="d-campaign" onchange="TF.fillFromCampaign();TF.onProjectChange(\'d\',\'campaign\')">'+buildCampaignOptions(task.campaign||'',task.client,task.endClient)+'</select></div>';
    h+='</div></div>';
    h+='<div class="mt-fields" id="mb-opp-fields" style="'+(mOpp?'':'display:none')+'"><div class="ed-grid" style="grid-template-columns:1fr">';
    h+='<div class="ed-fld"><span class="ed-lbl">Opportunity</span><select class="edf" id="d-opportunity" onchange="TF.onProjectChange(\'d\',\'opportunity\')">'+buildOpportunityOptions(task.opportunity||'',task.client)+'</select></div>';
    h+='</div></div>';
    h+='<div class="mt-fields" id="mb-proj-fields" style="'+(mProj?'':'display:none')+'"><div class="ed-grid" style="grid-template-columns:1fr">';
    h+='<div class="ed-fld"><span class="ed-lbl">Project</span><select class="edf" id="d-project" onchange="TF.onProjectChange(\'d\',\'project\');TF.refreshDetailPhases()">'+buildProjectOptions(task.project||'')+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Phase</span><select class="edf" id="d-phase">'+buildPhaseOptions(task.project||'',task.phase||'')+'</select></div>';
    h+='</div></div>';
    h+='<div class="mt-fields" id="mb-mtg-fields" style="'+(mMtg?'':'display:none')+'"><div class="ed-grid" style="grid-template-columns:1fr">';
    h+='<div class="ed-fld"><span class="ed-lbl">Meeting</span><select class="edf" id="d-mtg">'+buildMeetingOptions(task.meetingKey||'')+'</select></div>';
    h+='</div></div>';
    h+='<div class="flag-row" style="margin:8px 0 12px;flex-direction:column;gap:12px;padding:12px">';
    h+='<label class="flag-toggle"><input type="checkbox" id="d-flag"'+(task.flag?' checked':'')+'><span class="flag-box">'+icon('flag',12)+'</span><span class="flag-text">Needs Client Input</span></label>';
    h+='<label class="flag-toggle"><input type="checkbox" id="d-already-done" onchange="var c=this.checked;document.getElementById(\'d-already-dur-wrap\').style.display=c?\'flex\':\'none\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
    h+='<div id="d-already-dur-wrap" style="display:none;align-items:center;gap:8px"><span class="ed-lbl" style="padding:0">Actual Mins</span><input type="number" id="d-already-dur" class="edf" style="width:70px;padding:6px 10px" placeholder="'+(task.est||30)+'" min="0"></div>';
    h+='</div>';
    /* Add Time inline */
    h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg1);border-radius:var(--r);margin:0 0 8px;border:1px solid var(--gborder)">';
    h+='<span style="font-size:11px;font-weight:600;color:var(--t3);white-space:nowrap">'+icon('clock',12)+' Add Time</span>';
    h+='<input type="number" id="d-add-mins" class="edf" style="width:70px;padding:6px 10px;font-size:13px" placeholder="mins" min="1">';
    h+='<button class="btn" onclick="TF.addTimeToTask(\''+eid+'\',parseInt(gel(\'d-add-mins\').value))" style="font-size:12px;padding:6px 14px">+ Add</button>';
    if(elapsed>0)h+='<span style="font-size:11px;color:var(--t4);margin-left:auto">Current: '+fmtM(Math.round(elapsed/60))+'</span>';
    h+='</div>';
    h+='</details>';

    /* Activity Log accordion */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">Activity Log ('+logs.length+') <span style="font-size:10px;color:var(--t4)">'+icon('chevron_down',10)+'</span></summary>';
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
    h+='<button class="btn btn-p" onclick="TF.saveDetail()" style="flex:1;padding:14px;font-size:14px">'+icon('save',12)+' Save</button>';
    h+='<button class="btn" onclick="TF.togglePin(\''+eid+'\')" style="padding:14px;background:'+(isPinned?'rgba(255,176,48,0.15)':'var(--bg4)')+';color:'+(isPinned?'var(--amber)':'var(--t4)')+';border-color:'+(isPinned?'rgba(255,176,48,0.3)':'var(--gborder)')+'">'+icon('pin',12)+'</button>';
    h+='<button class="btn btn-d" onclick="TF.confirmDelete()" style="padding:14px">'+icon('trash',12)+'</button>';
    h+='</div><div id="del-zone" style="padding:0 16px"></div>';

    h+='</div>';/* end mobile wrapper */
  }else{
    /* ═══ DESKTOP: Split-pane layout ═══ */
    h+='<div class="detail-full-header">';
    h+='<div class="tf-modal-top">';
    h+='<input type="text" class="edf edf-name" id="d-item" value="'+esc(task.item)+'">';
    h+='<div style="display:flex;gap:6px;flex-shrink:0;align-items:center">';
    h+='<button class="btn" onclick="TF.togglePin(\''+eid+'\')" style="font-size:11px;padding:5px 12px;background:'+(isPinned?'rgba(255,176,48,0.15)':'var(--bg4)')+';color:'+(isPinned?'var(--amber)':'var(--t4)')+';border-color:'+(isPinned?'rgba(255,176,48,0.3)':'var(--gborder)')+'">'+icon('pin',12)+' '+(isPinned?'Unpin':'Pin')+'</button>';
    h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div></div>';
    h+='<input type="hidden" id="d-id" value="'+esc(task.id)+'">';

    h+='<div class="tf-modal-badges">';
    h+='<span class="bg '+impCls(task.importance)+'">'+esc(task.importance)+'</span>';
    if(task.due){var diff=dayDiff(td,task.due);h+='<span class="bg-du'+(diff<0?' od':(diff===0?' td':''))+'">'+dueLabel(task.due,td)+'</span>'}
    if(task.flag)h+='<span class="bg bg-fl">'+icon('flag',12)+' Needs Client Input</span>';
    if(task.client)h+='<span class="bg bg-cl">'+esc(task.client)+'</span>';
    if(task.endClient)h+='<span class="bg bg-ec">'+esc(task.endClient)+'</span>';
    if(task.campaign){var _cpdet=S.campaigns.find(function(c){return c.id===task.campaign});if(_cpdet)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber)">'+icon('target',12)+' '+esc(_cpdet.name)+'</span>'}
    if(task.category)h+='<span class="bg bg-ca">'+esc(task.category)+'</span>';
    if(task.meetingKey){var _mtgEvt=S.calEvents.find(function(ev){return mtgKey(ev.title,ev.start)===task.meetingKey});if(_mtgEvt)h+='<span class="bg" style="background:rgba(255,0,153,0.08);color:var(--purple50)">'+icon('calendar',12)+' '+esc(_mtgEvt.title)+' '+fmtTime(_mtgEvt.start)+'</span>'}
    if(isPinned)h+='<span class="bg" style="background:rgba(255,176,48,0.1);color:var(--amber)">'+icon('pin',12)+' Pinned</span>';
    if(hasT){h+='<span class="ed-timer-badge"><span class="dot '+(running?'pulse':'pau')+'"></span><span class="'+(running?'go':'')+'" data-tmr="'+esc(id)+'">'+fmtT(elapsed)+'</span></span>'}
    h+='</div></div>';

    h+='<div class="detail-split">';
    h+='<div class="detail-split-left">';
    h+='<div class="ed-grid ed-grid-3">';
    h+='<div class="ed-fld"><span class="ed-lbl">Due Date</span><input type="datetime-local" class="edf" id="d-due" value="'+(task.due?fmtISO(task.due):'')+'"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="d-imp">'+impOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="d-cat">'+catOpts+'</select></div>';
    h+='</div>';
    h+='<div class="ed-grid ed-grid-2">';
    h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="d-type">'+typeOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="d-est" value="'+(task.est||'')+'" min="0" placeholder="30"></div>';
    h+='</div>';
    var hasCli=!!task.client,hasCp=!!task.campaign,hasOpp=!!task.opportunity,hasProj=!!task.project,hasMtg=!!task.meetingKey;
    h+='<div class="modal-toggles">';
    h+='<label class="modal-toggle"><input type="checkbox" id="dt-cli"'+(hasCli?' checked':'')+' onchange="TF.modalToggle(\'dt-cli-fields\',this.checked)"><span>Client</span></label>';
    h+='<label class="modal-toggle"><input type="checkbox" id="dt-campaign"'+(hasCp?' checked':'')+' onchange="TF.modalToggle(\'dt-campaign-fields\',this.checked)"><span>Campaign</span></label>';
    h+='<label class="modal-toggle"><input type="checkbox" id="dt-opp"'+(hasOpp?' checked':'')+' onchange="TF.modalToggle(\'dt-opp-fields\',this.checked)"><span>Opportunity</span></label>';
    h+='<label class="modal-toggle"><input type="checkbox" id="dt-proj"'+(hasProj?' checked':'')+' onchange="TF.modalToggle(\'dt-proj-fields\',this.checked)"><span>Project</span></label>';
    h+='<label class="modal-toggle"><input type="checkbox" id="dt-mtg"'+(hasMtg?' checked':'')+' onchange="TF.modalToggle(\'dt-mtg-fields\',this.checked)"><span>Meeting</span></label>';
    h+='</div>';
    h+='<div class="mt-fields" id="dt-cli-fields" style="'+(hasCli?'':'display:none')+'"><div class="ed-grid ed-grid-2">';
    h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="d-cli" onchange="TF.refreshDetailEndClients()">'+cliOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="d-ec" onchange="TF.refreshDetailCampaigns();TF.ecAddNew(\'d-ec\')">'+buildEndClientOptions(task.endClient||'',task.client)+'</select></div>';
    h+='</div></div>';
    h+='<div class="mt-fields" id="dt-campaign-fields" style="'+(hasCp?'':'display:none')+'"><div class="ed-grid ed-grid-1">';
    h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="d-campaign" onchange="TF.fillFromCampaign();TF.onProjectChange(\'d\',\'campaign\')">'+buildCampaignOptions(task.campaign||'',task.client,task.endClient)+'</select></div>';
    h+='</div></div>';
    h+='<div class="mt-fields" id="dt-opp-fields" style="'+(hasOpp?'':'display:none')+'"><div class="ed-grid ed-grid-1">';
    h+='<div class="ed-fld"><span class="ed-lbl">Opportunity</span><select class="edf" id="d-opportunity" onchange="TF.onProjectChange(\'d\',\'opportunity\')">'+buildOpportunityOptions(task.opportunity||'',task.client)+'</select></div>';
    h+='</div></div>';
    h+='<div class="mt-fields" id="dt-proj-fields" style="'+(hasProj?'':'display:none')+'"><div class="ed-grid ed-grid-2">';
    h+='<div class="ed-fld"><span class="ed-lbl">Project</span><select class="edf" id="d-project" onchange="TF.onProjectChange(\'d\',\'project\');TF.refreshDetailPhases()">'+buildProjectOptions(task.project||'')+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Phase</span><select class="edf" id="d-phase">'+buildPhaseOptions(task.project||'',task.phase||'')+'</select></div>';
    h+='</div></div>';
    h+='<div class="mt-fields" id="dt-mtg-fields" style="'+(hasMtg?'':'display:none')+'"><div class="ed-grid ed-grid-1">';
    h+='<div class="ed-fld"><span class="ed-lbl">Meeting</span><select class="edf" id="d-mtg">'+buildMeetingOptions(task.meetingKey||'')+'</select></div>';
    h+='</div></div>';
    h+='<div class="flag-row ed-flags-inline">';
    h+='<label class="flag-toggle"><input type="checkbox" id="d-flag"'+(task.flag?' checked':'')+'><span class="flag-box">'+icon('flag',12)+'</span><span class="flag-text">Needs Client Input</span></label>';
    h+='<label class="flag-toggle"><input type="checkbox" id="d-already-done" onchange="var c=this.checked;document.getElementById(\'d-already-dur-wrap\').style.display=c?\'flex\':\'none\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
    h+='<div id="d-already-dur-wrap" style="display:none;align-items:center;gap:8px;margin-left:auto"><span class="ed-lbl" style="padding:0">Actual Mins</span><input type="number" id="d-already-dur" class="edf" style="width:70px;padding:6px 10px" placeholder="'+(task.est||30)+'" min="0"></div>';
    h+='</div>';
    /* Add Time inline */
    h+='<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg1);border-radius:var(--r);margin:0 0 8px;border:1px solid var(--gborder)">';
    h+='<span style="font-size:11px;font-weight:600;color:var(--t3);white-space:nowrap">'+icon('clock',12)+' Add Time</span>';
    h+='<input type="number" id="d-add-mins" class="edf" style="width:80px;padding:6px 10px;font-size:13px" placeholder="mins" min="1">';
    h+='<button class="btn" onclick="TF.addTimeToTask(\''+eid+'\',parseInt(gel(\'d-add-mins\').value))" style="font-size:12px;padding:6px 14px">+ Add</button>';
    if(elapsed>0)h+='<span style="font-size:11px;color:var(--t4);margin-left:auto">Current: '+fmtM(Math.round(elapsed/60))+'</span>';
    h+='</div>';
    h+='<div class="ed-actions">';
    h+='<button class="btn btn-p" onclick="TF.saveDetail()">'+icon('save',12)+' Save</button>';
    if(running){
      h+='<button class="btn" onclick="TF.pause(\''+eid+'\')">'+icon('pause',12)+' Pause</button>';
    }else{
      h+='<button class="btn btn-go" onclick="TF.start(\''+eid+'\')">'+icon('play',12)+' Start</button>';
    }
    h+='<button class="btn btn-p" onclick="TF.markAlreadyCompleted(\''+eid+'\')">'+CK_S+' Complete</button>';
    h+='<button class="btn" onclick="TF.openFocus(\''+eid+'\')" style="background:rgba(255,0,153,0.1);color:var(--pink);border-color:rgba(255,0,153,0.2)">'+icon('target',12)+' Focus</button>';
    h+='<span class="spacer"></span>';
    h+='<button class="btn btn-d" onclick="TF.confirmDelete()">'+icon('trash',12)+'</button>';
    h+='</div><div id="del-zone"></div>';
    h+='</div>';

    h+='<div class="detail-split-right">';
    h+='<div class="detail-notes-large"><span class="ed-lbl" style="padding-left:0;margin-bottom:6px;display:block">'+icon('edit',12)+' Notes</span>';
    h+='<textarea class="edf edf-notes" id="d-notes" placeholder="Add notes about your progress, where you left off, what to do next...">'+esc(task.notes)+'</textarea></div>';
    h+='<div class="detail-activity">';
    h+='<span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">Activity Log</span>';
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

function closeModal(){
  /* Check if compose is active — offer to save as draft */
  var editor=gel('compose-body');
  if(window._composeModalActive&&editor){
    var to=window._composeRecipients.to||[];
    var subject=(gel('compose-subject')||{}).value||'';
    var body=editor.innerHTML||'';
    var hasContent=to.length||subject||
      (body&&body!=='<br>'&&body!=='<div><br></div>'&&!body.match(/^(<br\s*\/?>|<div><br><\/div>|\s)*(<br\s*\/?>)?<div class="email-signature">[\s\S]*<\/div>$/));
    if(hasContent){
      var saveDraft=confirm('Save this message as a draft?');
      if(saveDraft){_saveDraft(window._composeDraftId);toast('Draft saved','ok')}
      else if(window._composeDraftId){_deleteDraft(window._composeDraftId)}}
    window._composeModalActive=false;
    /* Clear timer + state */
    if(window._composeDraftTimer){clearInterval(window._composeDraftTimer);window._composeDraftTimer=null}
    window._composeDraftId=null;
    document.removeEventListener('selectionchange',updateComposeToolbar);
    window._composeAttachments=[];
    var inner=gel('modal').querySelector('.tf-modal-inner')||gel('modal');
    inner.classList.remove('tf-modal-wide')}
  /* Only close detail-modal if no email thread is currently open */
  if(!S.gmailThreadId){var dm=gel('detail-modal');dm.classList.remove('on');dm.classList.remove('full-detail')}
  var m=gel('modal');if(m)m.classList.remove('on')}

async function saveDetail(){
  var id=gel('d-id').value;var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  task.item=gel('d-item').value.trim();if(!task.item){toast('Item name required','warn');return}
  task.due=gel('d-due').value?new Date(gel('d-due').value):null;
  task.importance=gel('d-imp').value;task.category=gel('d-cat').value;
  var cliToggle=gel('dt-cli')||gel('mb-cli');
  task.client=(cliToggle&&cliToggle.checked)?(gel('d-cli').value||''):'';
  task.endClient=(cliToggle&&cliToggle.checked)?(gel('d-ec')?gel('d-ec').value:'').trim():'';
  task.type=gel('d-type').value;
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
  task.isInbox=false;
  save();
  await dbEditTask(id,task);
  toast(icon('save',12)+' Saved: '+task.item,'ok');closeModal();render()}

async function markAlreadyCompleted(id){
  var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var alreadyDone=gel('d-already-done')&&gel('d-already-done').checked;
  if(!alreadyDone){/* Normal complete — use timer done */tmrDone(id);closeModal();return}
  /* Save fields from modal first */
  task.item=gel('d-item').value.trim();if(!task.item){toast('Item name required','warn');return}
  task.due=gel('d-due').value?new Date(gel('d-due').value):null;
  task.importance=gel('d-imp').value;task.category=gel('d-cat').value;
  var cliToggle2=gel('dt-cli')||gel('mb-cli');
  task.client=(cliToggle2&&cliToggle2.checked)?(gel('d-cli').value||''):'';
  task.endClient=(cliToggle2&&cliToggle2.checked)?(gel('d-ec')?gel('d-ec').value:'').trim():'';
  task.type=gel('d-type').value;
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
  closeModal();render();renderSidebar();renderActiveWidget()}

function confirmDelete(){
  var id=gel('d-id').value;var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  gel('del-zone').innerHTML='<div class="del-confirm"><span>Permanently delete "'+esc(task.item)+'"?</span><button class="btn btn-d" onclick="TF.doDelete(\''+escAttr(id)+'\')">Yes, Delete</button><button class="btn" onclick="document.getElementById(\'del-zone\').innerHTML=\'\'">Cancel</button></div>'}

async function doDelete(id){var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  await dbDeleteTask(id);
  S.tasks=S.tasks.filter(function(t){return t.id!==id});delete S.timers[id];save();
  toast(icon('trash',12)+' Deleted: '+task.item,'warn');closeModal();render();renderSidebar();renderActiveWidget()}

/* ═══════════ ADD TASK ═══════════ */
function openAddMeetingPrepTask(meetingKey){
  openAddModal({meetingKey:meetingKey,category:'One-on-One',importance:'Important'})}

function openAddModal(prefill){prefill=prefill||{};var now=new Date();now.setHours(17,0,0,0);var iso=now.toISOString().slice(0,16);
  var cliOpts=S.clients.map(function(c){return'<option>'+esc(c)+'</option>'}).join('');
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('plus',12)+' New Task</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  /* ── Item Name ── */
  h+='<div style="padding:6px 0"><input type="text" class="edf" id="f-item" placeholder="What needs doing?" autofocus style="font-size:15px;font-weight:600;padding:11px 14px"></div>';

  /* ── Scheduling ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Due Date</span><input type="datetime-local" class="edf" id="f-due" value="'+iso+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="f-imp">'+IMPS.map(function(i){return'<option'+(i==='Important'?' selected':'')+'>'+i+'</option>'}).join('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="f-cat"><option value="">Select...</option>'+CATS.map(function(c){return'<option>'+c+'</option>'}).join('')+'</select></div>';
  h+='</div>';
  /* ── Details (always visible) ── */
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="f-type">'+TYPES.map(function(t){return'<option>'+t+'</option>'}).join('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="f-est" placeholder="30" min="0"></div>';
  h+='</div>';
  /* ── Toggleable sections ── */
  h+='<div class="modal-toggles">';
  h+='<label class="modal-toggle"><input type="checkbox" id="mt-cli" onchange="TF.modalToggle(\'mt-cli-fields\',this.checked)"><span>Client</span></label>';
  h+='<label class="modal-toggle"><input type="checkbox" id="mt-campaign" onchange="TF.modalToggle(\'mt-campaign-fields\',this.checked)"><span>Campaign</span></label>';
  h+='<label class="modal-toggle"><input type="checkbox" id="mt-opp" onchange="TF.modalToggle(\'mt-opp-fields\',this.checked)"><span>Opportunity</span></label>';
  h+='<label class="modal-toggle"><input type="checkbox" id="mt-proj" onchange="TF.modalToggle(\'mt-proj-fields\',this.checked)"><span>Project</span></label>';
  h+='<label class="modal-toggle"><input type="checkbox" id="mt-mtg" onchange="TF.modalToggle(\'mt-mtg-fields\',this.checked)"><span>Meeting</span></label>';
  h+='</div>';
  /* Client fields */
  h+='<div class="mt-fields" id="mt-cli-fields" style="display:none"><div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="f-cli" onchange="TF.refreshAddEndClients()"><option value="">Select...</option>'+cliOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="f-ec" onchange="TF.refreshAddCampaigns();TF.ecAddNew(\'f-ec\')">'+buildEndClientOptions('')+'</select></div>';
  h+='</div></div>';
  /* Campaign fields */
  h+='<div class="mt-fields" id="mt-campaign-fields" style="display:none"><div class="ed-grid ed-grid-1">';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="f-campaign" onchange="TF.fillFromCampaign();TF.onProjectChange(\'f\',\'campaign\')">'+buildCampaignOptions('','','')+'</select></div>';
  h+='</div></div>';
  /* Opportunity fields */
  h+='<div class="mt-fields" id="mt-opp-fields" style="display:none"><div class="ed-grid ed-grid-1">';
  h+='<div class="ed-fld"><span class="ed-lbl">Opportunity</span><select class="edf" id="f-opportunity" onchange="TF.onProjectChange(\'f\',\'opportunity\')">'+buildOpportunityOptions('','')+'</select></div>';
  h+='</div></div>';
  /* Project fields */
  h+='<div class="mt-fields" id="mt-proj-fields" style="display:none"><div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Project</span><select class="edf" id="f-project" onchange="TF.onProjectChange(\'f\',\'project\');TF.refreshAddPhases()">'+buildProjectOptions('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Phase</span><select class="edf" id="f-phase">'+buildPhaseOptions('','')+'</select></div>';
  h+='</div></div>';
  /* Meeting fields */
  h+='<div class="mt-fields" id="mt-mtg-fields" style="display:none"><div class="ed-grid ed-grid-1">';
  h+='<div class="ed-fld"><span class="ed-lbl">Meeting</span><select class="edf" id="f-mtg">'+buildMeetingOptions('')+'</select></div>';
  h+='</div></div>';

  /* ── Options (single row) ── */
  h+='<div class="flag-row ed-flags-inline">';
  h+='<label class="flag-toggle"><input type="checkbox" id="f-flag"><span class="flag-box">'+icon('flag',12)+'</span><span class="flag-text">Needs Client Input</span></label>';
  h+='<label class="flag-toggle"><input type="checkbox" id="f-done" onchange="var c=this.checked;document.getElementById(\'f-done-dur-wrap\').style.display=c?\'flex\':\'none\';document.getElementById(\'f-btn-add\').textContent=c?\'Add \\u0026 Complete\':\'Add Task\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
  h+='<div id="f-done-dur-wrap" style="display:none;align-items:center;gap:8px;margin-left:auto"><span class="ed-lbl" style="padding:0">Actual Mins</span><input type="number" id="f-done-dur" class="edf" style="width:70px;padding:6px 10px" placeholder="30" min="0"></div>';
  h+='</div>';

  /* ── Notes ── */
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="f-notes" placeholder="Additional context..." rows="2"></textarea></div>';

  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" id="f-btn-add" onclick="TF.addTask()">Add Task</button>';
  h+='<button class="btn btn-go" id="f-btn-start" onclick="TF.addAndStart()">'+icon('play',12)+' Add & Start</button>';
  if(S.templates.length){h+='<select class="per" id="f-tpl" onchange="TF.fillFromTemplate(this.value)"><option value="">Use Template...</option>';
    S.templates.forEach(function(t,i){h+='<option value="'+i+'">'+esc(t.name)+'</option>'});h+='</select>'}
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  /* Pre-fill from context (e.g. adding task from project view) */
  if(prefill.project){var ptg=gel('mt-proj');if(ptg){ptg.checked=true;modalToggle('mt-proj-fields',true)}
    var ps=gel('f-project');if(ps){ps.value=prefill.project;refreshAddPhases();
    setTimeout(function(){if(prefill.phase){var ph=gel('f-phase');if(ph)ph.value=prefill.phase}},50)}}
  if(prefill.client){var ctg=gel('mt-cli');if(ctg){ctg.checked=true;modalToggle('mt-cli-fields',true)}
    var cs=gel('f-cli');if(cs){cs.value=prefill.client;refreshAddEndClients()}
    if(prefill.endClient){setTimeout(function(){var ecs=gel('f-ec');if(ecs)ecs.value=prefill.endClient},50)}}
  if(prefill.campaign){var cptg=gel('mt-campaign');if(cptg){cptg.checked=true;modalToggle('mt-campaign-fields',true)}
    var cp=gel('f-campaign');if(cp)cp.value=prefill.campaign}
  if(prefill.opportunity){var otg=gel('mt-opp');if(otg){otg.checked=true;modalToggle('mt-opp-fields',true)}
    var os=gel('f-opportunity');if(os)os.value=prefill.opportunity}
  if(prefill.meetingKey){var mtg=gel('mt-mtg');if(mtg){mtg.checked=true;modalToggle('mt-mtg-fields',true)}
    var ms=gel('f-mtg');if(ms)ms.value=prefill.meetingKey}
  if(prefill.category){var cs=gel('f-cat');if(cs)cs.value=prefill.category}
  if(prefill.importance){var is=gel('f-imp');if(is)is.value=prefill.importance}
  if(prefill.item){var fi2=gel('f-item');if(fi2)fi2.value=prefill.item}
  if(prefill.notes){var fn=gel('f-notes');if(fn)fn.value=prefill.notes}
  if(prefill.emailThreadId){
    var hid=document.createElement('input');hid.type='hidden';hid.id='f-email-tid';hid.value=prefill.emailThreadId;
    gel('m-body').appendChild(hid)}
  setTimeout(function(){var fi=gel('f-item');if(fi)fi.focus()},100)}

async function addTask(){var item=(gel('f-item')||{}).value;if(!item||!item.trim()){toast('Enter a task name','warn');return}
  var flagged=gel('f-flag').checked;
  var markDone=gel('f-done')&&gel('f-done').checked;
  var isInbox=gel('f-inbox')&&gel('f-inbox').value==='true';
  var cpVal=(gel('f-campaign')||{}).value||'';
  var ecVal=(gel('f-ec')?gel('f-ec').value:'').trim();
  if(cpVal&&!ecVal){var _cpaf=S.campaigns.find(function(c){return c.id===cpVal});if(_cpaf)ecVal=_cpaf.endClient}
  var mtgVal=(gel('f-mtg')||{}).value||'';
  var projVal=(gel('f-project')||{}).value||'';
  var phaseVal=(gel('f-phase')||{}).value||'';
  var oppVal=(gel('f-opportunity')||{}).value||'';
  var data={item:item.trim(),due:gel('f-due').value,importance:gel('f-imp').value,category:gel('f-cat').value,
    client:gel('f-cli').value||'',endClient:ecVal,type:gel('f-type').value,est:parseInt(gel('f-est').value)||0,
    notes:gel('f-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal,meetingKey:mtgVal,
    project:projVal,phase:phaseVal,opportunity:oppVal,isInbox:isInbox};
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
      category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign,meetingKey:data.meetingKey,project:data.project,phase:data.phase,opportunity:data.opportunity,isInbox:isInbox});
      var emailTid=gel('f-email-tid');if(emailTid&&emailTid.value)dbLinkEmailToTask(result.id,emailTid.value)}
    toast('Added: '+data.item,'ok')}
  closeModal();render()}

async function addAndStart(){var item=(gel('f-item')||{}).value;if(!item||!item.trim()){toast('Enter a task name','warn');return}
  var flagged=gel('f-flag').checked;
  var isInbox2=gel('f-inbox')&&gel('f-inbox').value==='true';
  var cpVal=(gel('f-campaign')||{}).value||'';
  var ecVal=(gel('f-ec')?gel('f-ec').value:'').trim();
  if(cpVal&&!ecVal){var _cpas=S.campaigns.find(function(c){return c.id===cpVal});if(_cpas)ecVal=_cpas.endClient}
  var mtgVal2=(gel('f-mtg')||{}).value||'';
  var projVal2=(gel('f-project')||{}).value||'';
  var phaseVal2=(gel('f-phase')||{}).value||'';
  var oppVal2=(gel('f-opportunity')||{}).value||'';
  var data={item:item.trim(),due:gel('f-due').value,importance:gel('f-imp').value,category:gel('f-cat').value,
    client:gel('f-cli').value||'',endClient:ecVal,type:gel('f-type').value,est:parseInt(gel('f-est').value)||0,
    notes:gel('f-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal,meetingKey:mtgVal2,
    project:projVal2,phase:phaseVal2,opportunity:oppVal2,isInbox:isInbox2};
  var result=await dbAddTask(data);
  if(!result){toast('Failed to add task','warn');return}
  var id=result.id;
  S.tasks.push({id:id,item:data.item,due:data.due?new Date(data.due):null,importance:data.importance,est:data.est,
    category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign,meetingKey:data.meetingKey,project:data.project,phase:data.phase,opportunity:data.opportunity,isInbox:isInbox2});
  save();
  /* Start timer + enter Focus Mode */
  var t=tmrGet(id);t.started=Date.now();S.timers[id]=t;save();
  toast('Added & started: '+data.item,'ok');
  focusReturnView=S.view;focusTaskId=id;focusPaused=false;
  closeModal();render();renderFocusOverlay();startFocusTick()}

function fillFromTemplate(idx){idx=parseInt(idx);if(isNaN(idx))return;var t=S.templates[idx];if(!t)return;
  var now=new Date();now.setHours(17,0,0,0);
  if(t.importance)gel('f-imp').value=t.importance;if(t.category)gel('f-cat').value=t.category;
  if(t.client){gel('f-cli').value=t.client;refreshAddEndClients()}
  if(t.endClient&&gel('f-ec'))gel('f-ec').value=t.endClient;if(t.type)gel('f-type').value=t.type;
  if(t.est)gel('f-est').value=t.est;if(t.item)gel('f-item').value=t.item;
  if(t.campaign&&gel('f-campaign'))gel('f-campaign').value=t.campaign;
  if(t.notes)gel('f-notes').value=t.notes;toast('Template loaded: '+t.name,'ok')}

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
  toast('Completed '+count+' tasks','ok');render();renderSidebar();renderActiveWidget()}

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

  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">Log Meeting</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="tf-modal-badges" style="margin-top:4px">';
  h+='<span class="bg" style="background:rgba(255,0,153,0.1);color:var(--pink)">'+icon('calendar',12)+' '+fmtDShort(e.start)+'</span>';
  h+='<span class="bg" style="background:rgba(255,0,153,0.1);color:var(--purple50)">'+fmtTime(e.start)+' – '+fmtTime(e.end)+'</span>';
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
    h+='<div style="margin:12px 0 8px;padding:12px 14px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,0,153,0.1);border-radius:var(--r)">';
    h+='<div style="font-size:11px;font-weight:700;color:var(--purple50);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px">Linked Tasks ('+linkedTasks.length+')</div>';
    linkedTasks.forEach(function(lt,i){
      h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;'+(i<linkedTasks.length-1?'border-bottom:1px solid rgba(255,255,255,0.04);':'')+';font-size:12.5px">';
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
  var cli=(gel('lm-cli')||{}).value||'';
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
  _logMtgEvent=null;closeModal();render();renderSidebar();renderActiveWidget()}

/* ═══════════ TEMPLATES ═══════════ */
function openTplForm(idx){
  var editing=idx!==undefined&&S.templates[idx];var t=editing||{name:'',item:'',importance:'Important',category:'',client:'',endClient:'',type:'Business',est:0,notes:'',setName:''};
  var cliOpts='<option value="">Select...</option>'+S.clients.map(function(c){return'<option'+(c===t.client?' selected':'')+'>'+esc(c)+'</option>'}).join('');
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
  h+='<button class="btn btn-p" onclick="TF.saveTpl()">'+(editing?icon('save',12)+' Update Template':'Create Template')+'</button>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

function saveTpl(){var name=(gel('tpl-name')||{}).value;if(!name||!name.trim()){toast('Enter a template name','warn');return}
  var tpl={name:name.trim(),item:(gel('tpl-item')||{}).value||'',importance:gel('tpl-imp').value,category:gel('tpl-cat').value,
    client:gel('tpl-cli').value||'',endClient:(gel('tpl-ec')?gel('tpl-ec').value:'').trim(),type:gel('tpl-type').value,est:parseInt(gel('tpl-est').value)||0,
    notes:(gel('tpl-notes')||{}).value||'',setName:(gel('tpl-set')||{}).value||'',recurrence:(gel('tpl-recur')||{}).value||''};
  var idx=parseInt(gel('tpl-idx').value);
  if(idx>=0&&S.templates[idx]){S.templates[idx]=tpl;toast(icon('save',12)+' Updated: '+tpl.name,'ok')}
  else{S.templates.push(tpl);toast('Created: '+tpl.name,'ok')}
  save();closeModal();render()}

function delTpl(idx){if(!S.templates[idx])return;var name=S.templates[idx].name;
  S.templates.splice(idx,1);save();toast(icon('trash',12)+' Deleted: '+name,'warn');render()}

async function useTpl(idx){var t=S.templates[idx];if(!t)return;
  var now=new Date();now.setHours(17,0,0,0);
  var item=t.item||t.name;
  var data={item:item,due:now.toISOString(),importance:t.importance||'Important',category:t.category||'',
    client:t.client||'',endClient:t.endClient||'',type:t.type||'Business',est:t.est||0,notes:t.notes||'',status:'Planned',flag:false,campaign:t.campaign||''};
  var result=await dbAddTask(data);
  if(result){S.tasks.push({id:result.id,item:item,due:now,importance:data.importance,est:data.est,category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:'Planned',flag:false,campaign:data.campaign})}
  toast('Added from template: '+item,'ok');render()}

async function useSet(setName){var items=S.templates.filter(function(t){return t.setName===setName});if(!items.length)return;
  var count=0;
  for(var i=0;i<items.length;i++){var t=items[i];
    var now=new Date();now.setHours(17,0,0,0);var item=t.item||t.name;
    var data={item:item,due:now.toISOString(),importance:t.importance||'Important',category:t.category||'',
      client:t.client||'',endClient:t.endClient||'',type:t.type||'Business',est:t.est||0,notes:t.notes||'',status:'Planned',flag:false,campaign:t.campaign||''};
    var result=await dbAddTask(data);
    if(result){S.tasks.push({id:result.id,item:item,due:now,importance:data.importance,est:data.est,category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:'Planned',flag:false,campaign:data.campaign});count++}}
  toast('Added '+count+' tasks from "'+setName+'"','ok');render()}

/* ═══════════ DONE DETAIL ═══════════ */
function openDoneDetail(id){
  var d=S.done.find(function(t){return t.id===id});if(!d)return;
  var td=today(),eid=escAttr(id);
  var cliOpts='<option value="">Select...</option>'+S.clients.map(function(c){return'<option'+(c===(d.client||'')?' selected':'')+'>'+esc(c)+'</option>'}).join('');
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
  if(d.client)h+='<span class="bg bg-cl">'+esc(d.client)+'</span>';
  if(d.endClient)h+='<span class="bg bg-ec">'+esc(d.endClient)+'</span>';
  if(d.campaign){var _cpdd=S.campaigns.find(function(c){return c.id===d.campaign});if(_cpdd)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber)">'+icon('target',12)+' '+esc(_cpdd.name)+'</span>'}
  if(d.opportunity){var _opdd=S.opportunities.find(function(o){return o.id===d.opportunity});if(_opdd)h+='<span class="bg bg-opp">'+icon('gem',12)+' '+esc(_opdd.name)+'</span>'}
  if(d.category)h+='<span class="bg bg-ca">'+esc(d.category)+'</span>';
  if(d.duration)h+='<span class="bg-es" style="color:var(--green);font-weight:600">'+fmtM(d.duration)+'</span>';
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
  h+='<div class="ed-fld"><span class="ed-lbl">Opportunity</span><select class="edf" id="d-opportunity" disabled>'+buildOpportunityOptions(d.opportunity||'',d.client)+'</select></div>';
  h+='</div>';

  /* ── Notes ── */
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="d-notes" placeholder="Add notes...">'+esc(d.notes||'')+'</textarea></div>';

  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" onclick="TF.saveDoneDetail()">'+icon('save',12)+' Save</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.confirmDeleteDone()">'+icon('trash',12)+'</button>';
  h+='</div><div id="del-zone"></div>';

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on')}

async function saveDoneDetail(){
  var id=gel('d-id').value;var d=S.done.find(function(t){return t.id===id});if(!d)return;
  d.item=gel('d-item').value.trim();if(!d.item){toast('Item name required','warn');return}
  d.completed=gel('d-completed').value?new Date(gel('d-completed').value):d.completed;
  d.importance=gel('d-imp').value;d.category=gel('d-cat').value;
  d.client=gel('d-cli').value||'';d.endClient=(gel('d-ec')?gel('d-ec').value:'').trim();d.type=gel('d-type').value;
  d.campaign=gel('d-campaign')?gel('d-campaign').value:'';
  d.duration=parseInt(gel('d-dur').value)||0;d.est=parseInt(gel('d-est').value)||0;
  d.notes=gel('d-notes').value;
  await _sb.from('done').update({item:d.item,completed:d.completed?d.completed.toISOString():null,
    importance:d.importance,category:d.category,client:d.client,end_client:d.endClient||'',type:d.type,
    duration:d.duration,est:d.est,notes:d.notes,campaign:d.campaign||'',opportunity:d.opportunity||''}).eq('id',id);
  toast(icon('save',12)+' Saved: '+d.item,'ok');closeModal();render()}

function confirmDeleteDone(){
  var id=gel('d-id').value;var d=S.done.find(function(t){return t.id===id});if(!d)return;
  gel('del-zone').innerHTML='<div class="del-confirm"><span>Permanently delete "'+esc(d.item)+'"?</span><button class="btn btn-d" onclick="TF.doDeleteDone(\''+escAttr(id)+'\')">Yes, Delete</button><button class="btn" onclick="document.getElementById(\'del-zone\').innerHTML=\'\'">Cancel</button></div>'}

async function doDeleteDone(id){var d=S.done.find(function(t){return t.id===id});if(!d)return;
  await _sb.from('done').delete().eq('id',id);
  S.done=S.done.filter(function(t){return t.id!==id});
  toast(icon('trash',12)+' Deleted: '+d.item,'warn');closeModal();render()}

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
  var cliOpts='<option value="">Select...</option>'+S.clients.map(function(c){return'<option'+(c===(r.client||'')?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var catOpts='<option value="">Select...</option>'+CATS.map(function(c){return'<option'+(c===r.category?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var impOpts=IMPS.map(function(i){return'<option'+(i===r.importance?' selected':'')+'>'+i+'</option>'}).join('');
  var typeOpts=TYPES.map(function(t){return'<option'+(t===r.type?' selected':'')+'>'+t+'</option>'}).join('');

  var h='<div class="tf-modal-top">';
  h+='<input type="text" class="edf edf-name" id="d-item" value="'+esc(r.item)+'">';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<input type="hidden" id="d-id" value="'+esc(r.id)+'">';

  h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:0 4px;margin-bottom:8px">';
  h+='<div class="tf-modal-badges" style="border:none;margin:0;padding:0">';
  var srcIcon=r.source==='Email'?icon('mail',12):r.source==='Read.ai'?icon('mic',12):icon('inbox',12);
  var srcLabel=r.source==='Email'?'Email':r.source==='Read.ai'?'Read.ai':'Review';
  var srcBg=r.source==='Email'?'rgba(59,130,246,0.1)':r.source==='Read.ai'?'rgba(16,185,129,0.1)':'rgba(255,0,153,0.1)';
  var srcClr=r.source==='Email'?'#3b82f6':r.source==='Read.ai'?'#10b981':'var(--pink)';
  h+='<span class="bg" style="background:'+srcBg+';color:'+srcClr+'">'+srcIcon+' '+srcLabel+'</span>';
  h+='<span class="bg '+impCls(r.importance)+'">'+esc(r.importance)+'</span>';
  if(r.created)h+='<span class="bg-du" style="color:var(--t4)">Received '+fmtDShort(r.created)+'</span>';
  h+='</div>';
  if(items.length>1){
    h+='<div style="display:flex;align-items:center;gap:6px">';
    h+='<button class="ab ab-sm" style="background:var(--bg4);color:var(--t3)'+(curIdx<=0?';opacity:.3;pointer-events:none':'')+'" onclick="TF.reviewPrev()" title="Previous">'+icon('chevron_right',11)+'</button>';
    h+='<span style="font-size:11px;color:var(--t3);min-width:40px;text-align:center;font-family:var(--fd);font-weight:600">'+(curIdx+1)+' / '+items.length+'</span>';
    h+='<button class="ab ab-sm" style="background:var(--bg4);color:var(--t3)'+(curIdx>=items.length-1?';opacity:.3;pointer-events:none':'')+'" onclick="TF.reviewNext()" title="Next">'+icon('play',11)+'</button>';
    h+='</div>'}
  h+='</div>';

  if(r.source==='Email'&&r.notes){h+='<div style="padding:12px 16px;margin:10px 0;background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.15);border-radius:var(--r);font-size:12px;color:var(--t3);line-height:1.65"><span style="font-size:9px;font-weight:700;color:#3b82f6;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">'+icon('mail',12)+' Original Email</span>'+esc(r.notes)+'</div>'}
  if(r.source==='Read.ai'&&r.notes){h+='<div style="padding:12px 16px;margin:10px 0;background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.15);border-radius:var(--r);font-size:12px;color:var(--t3);line-height:1.65"><span style="font-size:9px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:8px">'+icon('mic',12)+' Meeting Transcript Notes</span>'+esc(r.notes)+'</div>'}

  /* ── Scheduling ── */
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Due Date</span><input type="datetime-local" class="edf" id="d-due" value="'+(r.due?fmtISO(r.due):'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Importance</span><select class="edf" id="d-imp">'+impOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="d-cat">'+catOpts+'</select></div>';
  h+='</div>';
  /* ── Details (always visible) ── */
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select class="edf" id="d-type">'+typeOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Estimate (mins)</span><input type="number" class="edf" id="d-est" value="'+(r.est||'')+'" min="0" placeholder="30"></div>';
  h+='</div>';
  /* ── Toggleable sections ── */
  var rvCli=!!(r.client),rvCp=!!(r.campaign),rvOpp=!!(r.opportunity),rvProj=!!(r.project),rvMtg=!!(r.meetingKey);
  h+='<div class="modal-toggles">';
  h+='<label class="modal-toggle"><input type="checkbox" id="rv-cli"'+(rvCli?' checked':'')+' onchange="TF.modalToggle(\'rv-cli-fields\',this.checked)"><span>Client</span></label>';
  h+='<label class="modal-toggle"><input type="checkbox" id="rv-campaign"'+(rvCp?' checked':'')+' onchange="TF.modalToggle(\'rv-campaign-fields\',this.checked)"><span>Campaign</span></label>';
  h+='<label class="modal-toggle"><input type="checkbox" id="rv-opp"'+(rvOpp?' checked':'')+' onchange="TF.modalToggle(\'rv-opp-fields\',this.checked)"><span>Opportunity</span></label>';
  h+='<label class="modal-toggle"><input type="checkbox" id="rv-proj"'+(rvProj?' checked':'')+' onchange="TF.modalToggle(\'rv-proj-fields\',this.checked)"><span>Project</span></label>';
  h+='<label class="modal-toggle"><input type="checkbox" id="rv-mtg"'+(rvMtg?' checked':'')+' onchange="TF.modalToggle(\'rv-mtg-fields\',this.checked)"><span>Meeting</span></label>';
  h+='</div>';
  /* Client fields */
  h+='<div class="mt-fields" id="rv-cli-fields" style="'+(rvCli?'':'display:none')+'"><div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="d-cli" onchange="TF.refreshDetailEndClients()">'+cliOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="d-ec" onchange="TF.refreshDetailCampaigns();TF.ecAddNew(\'d-ec\')">'+buildEndClientOptions(r.endClient||'',r.client)+'</select></div>';
  h+='</div></div>';
  /* Campaign fields */
  h+='<div class="mt-fields" id="rv-campaign-fields" style="'+(rvCp?'':'display:none')+'"><div class="ed-grid ed-grid-1">';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="d-campaign" onchange="TF.fillFromCampaign();TF.onProjectChange(\'d\',\'campaign\')">'+buildCampaignOptions(r.campaign||'',r.client,r.endClient)+'</select></div>';
  h+='</div></div>';
  /* Opportunity fields */
  h+='<div class="mt-fields" id="rv-opp-fields" style="'+(rvOpp?'':'display:none')+'"><div class="ed-grid ed-grid-1">';
  h+='<div class="ed-fld"><span class="ed-lbl">Opportunity</span><select class="edf" id="d-opportunity" onchange="TF.onProjectChange(\'d\',\'opportunity\')">'+buildOpportunityOptions(r.opportunity||'',r.client)+'</select></div>';
  h+='</div></div>';
  /* Project fields */
  h+='<div class="mt-fields" id="rv-proj-fields" style="'+(rvProj?'':'display:none')+'"><div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Project</span><select class="edf" id="d-project" onchange="TF.onProjectChange(\'d\',\'project\');TF.refreshDetailPhases()">'+buildProjectOptions(r.project||'')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Phase</span><select class="edf" id="d-phase">'+buildPhaseOptions(r.project||'',r.phase||'')+'</select></div>';
  h+='</div></div>';
  /* Meeting fields */
  h+='<div class="mt-fields" id="rv-mtg-fields" style="'+(rvMtg?'':'display:none')+'"><div class="ed-grid ed-grid-1">';
  h+='<div class="ed-fld"><span class="ed-lbl">Meeting</span><select class="edf" id="d-mtg">'+buildMeetingOptions(r.meetingKey||'')+'</select></div>';
  h+='</div></div>';

  /* ── Options (single row) ── */
  h+='<div class="flag-row ed-flags-inline">';
  h+='<label class="flag-toggle"><input type="checkbox" id="d-flag"><span class="flag-box">'+icon('flag',12)+'</span><span class="flag-text">Needs Client Input</span></label>';
  h+='<label class="flag-toggle"><input type="checkbox" id="d-done" onchange="var c=this.checked;document.getElementById(\'d-done-dur-wrap\').style.display=c?\'flex\':\'none\';document.getElementById(\'d-btn-add\').textContent=c?\'Add \\u0026 Complete\':\'Add as Task\';document.getElementById(\'d-btn-start\').style.display=c?\'none\':\'\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
  h+='<div id="d-done-dur-wrap" style="display:none;align-items:center;gap:8px;margin-left:auto"><span class="ed-lbl" style="padding:0">Actual Mins</span><input type="number" id="d-done-dur" class="edf" style="width:70px;padding:6px 10px" placeholder="'+(r.est||30)+'" min="0"></div>';
  h+='</div>';

  /* ── Notes ── */
  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="d-notes" placeholder="Add notes...">'+esc(r.notes||'')+'</textarea></div>';

  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" id="d-btn-add" onclick="TF.approveFromModal()">Add as Task</button>';
  h+='<button class="btn btn-go" id="d-btn-start" onclick="TF.approveAndStart()">'+icon('play',12)+' Add & Start</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.dismissFromModal()">'+icon('x',12)+' Dismiss</button>';
  h+='</div>';

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on')}

async function approveReview(id){
  var r=S.review.find(function(t){return t.id===id});if(!r)return;
  var data={item:r.item,due:r.due?r.due.toISOString():'',importance:r.importance,category:r.category,
    client:r.client||'',endClient:r.endClient||'',type:r.type,est:r.est,notes:r.notes,status:'Planned',flag:false,campaign:r.campaign||'',meetingKey:'',project:'',phase:'',opportunity:''};
  var result=await dbAddTask(data);
  if(result){S.tasks.push({id:result.id,item:r.item,due:r.due,importance:r.importance,est:r.est,category:r.category,
    client:r.client||'',endClient:r.endClient||'',type:r.type,duration:0,notes:r.notes,status:'Planned',flag:false,campaign:r.campaign||'',meetingKey:'',project:'',phase:'',opportunity:''})}
  await dbDeleteReview(id);
  S.review=S.review.filter(function(rv){return rv.id!==id});
  toast('Added: '+r.item,'ok');advanceReview()}

function reviewGetDue(){var v=gel('d-due').value;if(v)return v;return fmtISO(new Date())}
async function approveFromModal(){
  var id=gel('d-id').value;var r=S.review.find(function(t){return t.id===id});if(!r)return;
  var item=gel('d-item').value.trim();if(!item){toast('Item name required','warn');return}
  /* Disable buttons to prevent double-click */
  var btnAdd=gel('d-btn-add'),btnStart=gel('d-btn-start');
  if(btnAdd)btnAdd.disabled=true;if(btnStart)btnStart.disabled=true;
  try{
  var flagged=gel('d-flag').checked;
  var markDone=gel('d-done')&&gel('d-done').checked;
  var dueVal=reviewGetDue();
  var cpVal2=gel('d-campaign')?gel('d-campaign').value:'';
  var mtgVal3=(gel('d-mtg')||{}).value||'';
  var projVal3=(gel('d-project')||{}).value||'';
  var phaseVal3=(gel('d-phase')||{}).value||'';
  var oppVal3=(gel('d-opportunity')||{}).value||'';
  var rvCliToggle=gel('rv-cli');
  var rvClient=(rvCliToggle&&rvCliToggle.checked)?(gel('d-cli').value||''):'';
  var rvEndClient=(rvCliToggle&&rvCliToggle.checked)?(gel('d-ec')?gel('d-ec').value:'').trim():'';
  var data={item:item,due:dueVal,importance:gel('d-imp').value,category:gel('d-cat').value,
    client:rvClient,endClient:rvEndClient,type:gel('d-type').value,est:parseInt(gel('d-est').value)||0,
    notes:gel('d-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal2,meetingKey:mtgVal3,project:projVal3,phase:phaseVal3,opportunity:oppVal3};
  var success=false;
  if(markDone){
    var mins=parseInt((gel('d-done-dur')||{}).value)||data.est||0;
    var dueDate=dueVal?new Date(dueVal):null;
    var doneData={item:data.item,due:dueDate,importance:data.importance,category:data.category,
      client:data.client,endClient:data.endClient,type:data.type,duration:mins,est:data.est,notes:data.notes,campaign:data.campaign,project:data.project,phase:data.phase,opportunity:data.opportunity};
    var result=await dbCompleteTask(doneData);
    if(result){S.done.unshift({id:result.id,item:data.item,completed:new Date(),due:dueDate,importance:data.importance,category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:mins,est:data.est,notes:data.notes,campaign:data.campaign,project:data.project,phase:data.phase,opportunity:data.opportunity});
      success=true;toast('Completed: '+data.item+(mins?' ('+fmtM(mins)+')':''),'ok')}
    else{toast('Failed to complete task','err')}}
  else{
    var result=await dbAddTask(data);
    if(result){S.tasks.push({id:result.id,item:data.item,due:dueVal?new Date(dueVal):null,importance:data.importance,est:data.est,
      category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign,meetingKey:data.meetingKey,project:data.project,phase:data.phase,opportunity:data.opportunity});
      success=true;toast('Added: '+data.item,'ok')}
    else{toast('Failed to add task','err')}}
  if(success){await dbDeleteReview(id);S.review=S.review.filter(function(rv){return rv.id!==id})}
  }catch(e){console.error('approveFromModal error:',e);toast('Failed to process task','err')}
  if(btnAdd)btnAdd.disabled=false;if(btnStart)btnStart.disabled=false;
  advanceReview()}

async function approveAndStart(){
  /* If already-completed is checked, route through the completed path instead */
  if(gel('d-done')&&gel('d-done').checked){approveFromModal();return}
  var id=gel('d-id').value;var r=S.review.find(function(t){return t.id===id});if(!r)return;
  var item=gel('d-item').value.trim();if(!item){toast('Item name required','warn');return}
  var flagged=gel('d-flag').checked;
  var dueVal=reviewGetDue();
  var cpVal3=gel('d-campaign')?gel('d-campaign').value:'';
  var mtgVal4=(gel('d-mtg')||{}).value||'';
  var projVal4=(gel('d-project')||{}).value||'';
  var phaseVal4=(gel('d-phase')||{}).value||'';
  var oppVal4=(gel('d-opportunity')||{}).value||'';
  var data={item:item,due:dueVal,importance:gel('d-imp').value,category:gel('d-cat').value,
    client:gel('d-cli').value||'',endClient:(gel('d-ec')?gel('d-ec').value:'').trim(),type:gel('d-type').value,est:parseInt(gel('d-est').value)||0,
    notes:gel('d-notes').value,status:flagged?'Need Client Input':'Planned',flag:flagged,campaign:cpVal3,meetingKey:mtgVal4,project:projVal4,phase:phaseVal4,opportunity:oppVal4};
  var result=await dbAddTask(data);
  if(!result)return;
  var taskId=result.id;
  S.tasks.push({id:taskId,item:data.item,due:dueVal?new Date(dueVal):null,importance:data.importance,est:data.est,
    category:data.category,client:data.client,endClient:data.endClient,type:data.type,duration:0,notes:data.notes,status:data.status,flag:flagged,campaign:data.campaign,meetingKey:data.meetingKey,project:data.project,phase:data.phase,opportunity:data.opportunity});
  await dbDeleteReview(id);
  S.review=S.review.filter(function(rv){return rv.id!==id});
  toast('Added & started: '+data.item,'ok');
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

  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">Daily Summary</span>';
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
    inProg.forEach(function(t){h+='<div class="summary-item">'+esc(t.item)+' <span style="color:var(--green);font-family:var(--fd)">'+fmtT(tmrElapsed(t.id))+'</span></div>'});
    h+='</div>'}
  if(carryOver.length){h+='<div class="summary-section"><div class="summary-section-h">Carrying Over</div>';
    carryOver.slice(0,8).forEach(function(t){var od=t.due&&t.due<td;h+='<div class="summary-item"><span class="bg '+impCls(t.importance)+'" style="font-size:10px;padding:2px 7px">'+(t.importance||'I').charAt(0)+'</span> '+esc(t.item)+(od?' <span style="color:var(--red);font-weight:600">overdue</span>':'')+'</div>'});
    if(carryOver.length>8)h+='<div style="font-size:11px;color:var(--t4);padding:4px 0">+ '+(carryOver.length-8)+' more</div>';
    h+='</div>'}
  if(chaseItems.length){h+='<div class="summary-section"><div class="summary-section-h">Needs Chasing</div>';
    chaseItems.forEach(function(t){h+='<div class="summary-item">'+icon('flag',12)+' '+esc(t.item)+(t.client?' <span style="color:var(--pink50)">'+esc(t.client)+'</span>':'')+(t.endClient?' <span style="color:var(--teal)">EC: '+esc(t.endClient)+'</span>':'')+'</div>'});
    h+='</div>'}

  /* Copyable text version */
  var txt=now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'\n\n';
  txt+='DONE ('+todayDone.length+', '+fmtM(todayMins)+'):\n';
  todayDone.forEach(function(d){txt+='  - '+d.item+' ('+fmtM(d.duration)+')\n'});
  if(carryOver.length){txt+='\nCARRY OVER ('+carryOver.length+'):\n';carryOver.slice(0,8).forEach(function(t){txt+='  - '+t.item+'\n'})}
  if(chaseItems.length){txt+='\nNEEDS CHASING ('+chaseItems.length+'):\n';chaseItems.forEach(function(t){txt+='  - '+t.item+(t.client?' ['+t.client+']':'')+(t.endClient?' (EC: '+t.endClient+')':'')+'\n'})}

  h+='<div style="margin-top:16px"><button class="btn btn-p" onclick="navigator.clipboard.writeText('+esc(JSON.stringify(txt)).replace(/'/g,"\\'")+');TF.toast(\'Copied to clipboard\',\'ok\')" style="padding:8px 18px;font-size:12px">Copy Summary</button></div>';

  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

/* ═══════════ CLIENT TIME REPORT ═══════════ */
function openClientReport(){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('dashboard',12)+' Client Time Report</span>';
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

  h+='<button class="btn btn-p" onclick="navigator.clipboard.writeText('+esc(JSON.stringify(txt)).replace(/'/g,"\\'")+');TF.toast(\'Copied!\',\'ok\')" style="margin-top:12px;padding:8px 18px;font-size:12px">Copy Report</button>';
  h+='</div>';
  gel('rpt-output').innerHTML=h}

/* ═══════════ CALENDAR SETUP ═══════════ */
function showCalSetup(){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('calendar',12)+' Connect Google Calendar</span>';
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
  S.opportunities.forEach(function(o){
    if(filterClient&&o.client!==filterClient)return;
    if(o.endClient&&ecs.indexOf(o.endClient)===-1)ecs.push(o.endClient)});
  ecs.sort();
  var isNew=currentValue&&ecs.indexOf(currentValue)===-1;
  var h='<option value="">None</option>';
  ecs.forEach(function(ec){h+='<option value="'+esc(ec)+'"'+(currentValue===ec?' selected':'')+'>'+esc(ec)+'</option>'});
  if(isNew)h+='<option value="'+esc(currentValue)+'" selected>'+esc(currentValue)+'</option>';
  h+='<option value="__addnew__">'+icon('plus',12)+' Add New...</option>';
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

/* Cascade refresh for Contact modal (fc- prefix) */
function refreshContactEndClients(){
  var client='';
  var sel=gel('fc-client-id');
  if(sel){var cid=sel.value;var cr=S.clientRecords.find(function(r){return r.id===cid});client=cr?cr.name:''}
  var ecSel=gel('fc-end-client');
  if(ecSel&&ecSel.tagName==='SELECT'){ecSel.innerHTML=buildEndClientOptions(ecSel.value,client)}}

/* Cascade refresh for Add modal (f- prefix) */
function refreshAddEndClients(){
  var client=gel('f-cli')?gel('f-cli').value:'';
  var ecSel=gel('f-ec');if(ecSel&&ecSel.tagName==='SELECT')ecSel.innerHTML=buildEndClientOptions('',client);
  refreshAddCampaigns();refreshAddOpportunities()}
function refreshAddCampaigns(){
  var client=gel('f-cli')?gel('f-cli').value:'';
  var ec=gel('f-ec')?gel('f-ec').value:'';if(ec==='__addnew__')ec='';
  var sel=gel('f-campaign');if(!sel)return;
  sel.innerHTML=buildCampaignOptions('',client,ec)}
function refreshAddOpportunities(){
  var client=gel('f-cli')?gel('f-cli').value:'';
  var sel=gel('f-opportunity');if(!sel)return;
  sel.innerHTML=buildOpportunityOptions('',client)}

/* Cascade refresh for Detail modal (d- prefix) */
function refreshDetailEndClients(){
  var client=gel('d-cli')?gel('d-cli').value:'';
  var ecSel=gel('d-ec');if(ecSel&&ecSel.tagName==='SELECT'){var cur=ecSel.value;ecSel.innerHTML=buildEndClientOptions(cur,client)}
  refreshDetailCampaigns();refreshDetailOpportunities()}
function refreshDetailCampaigns(){
  var client=gel('d-cli')?gel('d-cli').value:'';
  var ec=gel('d-ec')?gel('d-ec').value:'';if(ec==='__addnew__')ec='';
  var sel=gel('d-campaign');if(!sel)return;
  var cur=sel.value;
  sel.innerHTML=buildCampaignOptions(cur,client,ec)}
function refreshDetailOpportunities(){
  var client=gel('d-cli')?gel('d-cli').value:'';
  var sel=gel('d-opportunity');if(!sel)return;
  var cur=sel.value;
  sel.innerHTML=buildOpportunityOptions(cur,client)}

function fillFromCampaign(){
  var sel=gel('f-campaign')||gel('d-campaign');
  if(!sel||!sel.value)return;
  var cp=S.campaigns.find(function(c){return c.id===sel.value});if(!cp)return;
  var ecField=gel('f-ec')||gel('d-ec');
  if(ecField&&!ecField.value&&cp.endClient)ecField.value=cp.endClient}

/* ═══════════ CAMPAIGN DETAIL MODAL ═══════════ */
function openCampaignDetail(id){
  if(!isMobile()){S.view='campaigns';S.campaignDetailId=id;render();return}
  var cp=S.campaigns.find(function(c){return c.id===id});if(!cp)return;
  var st=getCampaignStats(cp);var td_=today();
  var statusCls=cp.status.toLowerCase().replace(/ /g,'-');
  var PLATFORMS=['Meta','Google Ads','YouTube','LinkedIn','TikTok','Microsoft Ads','Programmatic','Multiple','Other'];
  var STATUSES=['Setup','Active','Paused','Completed','Archived'];
  var TERMS=['1 month','2 months','3 months','4 months','5 months','6 months','7 months','8 months','9 months','10 months','11 months','12 months','18 months','24 months','Ongoing'];
  var isMob=window.innerWidth<=600;
  var oneOff=cp.strategyFee+cp.setupFee;var monthly=cp.monthlyFee+cp.monthlyAdSpend;
  /* Combine direct finance payments + split payments for this campaign */
  var allCpPayments=[];
  st.finPayments.forEach(function(fp){allCpPayments.push({date:fp.date,amount:fp.amount,source:fp.source,desc:fp.description||fp.payerName||'',id:fp.id,type:'direct'})});
  st.finSplits.forEach(function(sp){var parent=S.financePayments.find(function(fp){return fp.id===sp.paymentId});
    allCpPayments.push({date:parent?parent.date:null,amount:sp.amount,source:parent?parent.source:'',desc:sp.notes||(parent?parent.description||parent.payerName||'':''),id:parent?parent.id:'',type:'split'})});
  allCpPayments.sort(function(a,b){return(b.date||0)-(a.date||0)});

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
    var revColor=st.finRevenue>=st.estTotal?'var(--green)':'var(--amber)';
    fh+='<div class="cp-fee-total"><div class="cp-fee-total-label">One-off: '+fmtUSD(oneOff)+' · Monthly: '+fmtUSD(monthly)+'</div>';
    fh+='<div class="cp-fee-total-value" style="display:flex;gap:12px;flex-wrap:wrap">';
    fh+='<span>Estimated: '+fmtUSD(st.estTotal)+'</span>';
    fh+='<span style="color:'+revColor+'">Actual: '+fmtUSD(st.finRevenue)+'</span>';
    fh+='</div></div>';
    /* Billing terms */
    fh+='<div class="cp-fees-grid" style="margin-top:10px">';
    fh+='<div class="cp-fee-item"><div class="cp-fee-label">Billing Frequency</div><select class="edf" id="cp-billingFreq"><option value="monthly"'+(cp.billingFrequency==='monthly'?' selected':'')+'>Monthly</option><option value="quarterly"'+(cp.billingFrequency==='quarterly'?' selected':'')+'>Quarterly</option><option value="annually"'+(cp.billingFrequency==='annually'?' selected':'')+'>Annually</option></select></div>';
    fh+='<div class="cp-fee-item"><div class="cp-fee-label">Next Billing Date</div><input type="date" class="edf" id="cp-nextBilling" value="'+(cp.nextBillingDate||'')+'"></div>';
    fh+='</div>';
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
    h+='<span style="font-size:11px;color:var(--green);font-weight:700"> '+fmtUSD(st.finRevenue)+'</span>';
    h+='<span style="font-size:11px;color:var(--amber);font-weight:700">'+st.openCount+' open</span>';
    h+='</div>';

    /* Notes */
    h+='<div style="padding:0 16px 12px"><textarea class="edf edf-notes" id="cp-notes" placeholder="Campaign notes..." style="min-height:60px;font-size:14px">'+esc(cp.notes||'')+'</textarea></div>';

    /* Open Tasks */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)" open>';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">Open Tasks ('+st.openCount+') <span style="font-size:10px;color:var(--t4)">'+icon('chevron_down',10)+'</span></summary>';
    if(st.openTasks.length){st.openTasks.forEach(function(t){h+=miniRow(t,td_)})}
    h+='<button class="btn" onclick="TF.closeModal();TF.openAddModal();setTimeout(function(){var cs=gel(\'f-cli\');if(cs)cs.value=\''+escAttr(cp.partner)+'\';TF.refreshAddCampaigns();var cc=gel(\'f-campaign\');if(cc)cc.value=\''+escAttr(cp.id)+'\';TF.fillFromCampaign()},200)" style="margin:6px 0 12px;font-size:12px;padding:10px 14px;width:100%;text-align:center">+ Add Task</button>';
    h+='</details>';

    /* Details */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">Details <span style="font-size:10px;color:var(--t4)">'+icon('chevron_down',10)+'</span></summary>';
    h+=cpFieldsHTML('ed-grid');
    h+='</details>';

    /* Fees */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between"> Fees <span style="font-size:10px;color:var(--t4)">'+icon('chevron_down',10)+'</span></summary>';
    h+=cpFeesHTML();
    h+='<div style="margin-bottom:12px"></div></details>';

    /* Finance Payments */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">'+icon('activity',12)+' Revenue ('+allCpPayments.length+') · '+fmtUSD(st.finRevenue)+' <span style="font-size:10px;color:var(--t4)">'+icon('chevron_down',10)+'</span></summary>';
    if(allCpPayments.length){allCpPayments.forEach(function(fp){
      h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px;cursor:pointer" onclick="TF.closeModal();setTimeout(function(){TF.openFinancePaymentDetail(\''+escAttr(fp.id)+'\')},100)">';
      h+='<span style="color:var(--t3)">'+(fp.date?fmtDShort(fp.date):'')+'</span>';
      if(fp.type==='split')h+='<span class="fin-cat fin-cat-split" style="font-size:9px">Split</span>';
      h+='<span style="color:var(--green);font-weight:700">'+fmtUSD(fp.amount)+'</span></div>'})}
    else{h+='<div style="padding:12px;color:var(--t4);font-size:12px;text-align:center">No payments linked to this campaign yet</div>'}
    h+='</details>';

    /* Upcoming Billing (mobile) */
    if(cp.monthlyFee){
      var cycMoM=cp.billingFrequency==='quarterly'?3:cp.billingFrequency==='annually'?12:1;
      var billAmtM=cp.monthlyFee*cycMoM;
      var freqLblM=cp.billingFrequency==='quarterly'?'Quarterly':cp.billingFrequency==='annually'?'Annually':'Monthly';
      h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
      h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">'+icon('calendar',12)+' Upcoming Billing <span style="font-size:10px;color:var(--t4)">'+icon('chevron_down',10)+'</span></summary>';
      h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:13px">';
      h+='<span style="color:var(--t3)">Amount: <strong style="color:var(--blue)">'+fmtUSD(billAmtM)+'</strong> '+freqLblM+'</span>';
      h+='</div>';
      h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:0 0 12px;font-size:13px">';
      h+='<span style="color:var(--t3)">Next: <strong style="color:var(--t1)">'+(cp.nextBillingDate||'Not set')+'</strong></span>';
      h+='</div></details>'}

    /* Links */
    h+='<details style="padding:0 16px;border-top:1px solid var(--gborder)">';
    h+='<summary style="padding:14px 0;font-size:13px;font-weight:700;color:var(--t2);cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">'+icon('link',12)+' Links <span style="font-size:10px;color:var(--t4)">'+icon('chevron_down',10)+'</span></summary>';
    h+=cpLinksHTML();
    h+='<div style="margin-bottom:12px"></div></details>';

    h+='</div>';/* end scrollable */

    /* Bottom bar */
    h+='<div style="display:flex;gap:8px;padding:12px 16px;border-top:1px solid var(--gborder);flex-shrink:0;background:var(--bg1)">';
    h+='<button class="btn btn-p" onclick="TF.saveCampaign()" style="flex:1;padding:14px;font-size:14px">'+icon('save',12)+' Save</button>';
    h+='<button class="btn btn-d" onclick="TF.confirmDeleteCampaign()" style="padding:14px">'+icon('trash',12)+'</button>';
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
    h+='<span class="ed-timer-badge" style="color:var(--green)"> Paid: '+fmtUSD(st.finRevenue)+'</span>';
    h+='<span class="ed-timer-badge" style="color:var(--amber)">'+st.openCount+' open · '+st.doneCount+' done</span>';
    if(st.totalTime)h+='<span class="ed-timer-badge" style="color:var(--pink)">'+fmtM(st.totalTime)+'</span>';
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
  h+='<div style="margin-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block"> Fees</span>';
  h+='<div class="cp-fees-grid">';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Strategy Fee</div><input type="number" class="edf" id="cp-strategyFee" value="'+(cp.strategyFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Set-Up Fee</div><input type="number" class="edf" id="cp-setupFee" value="'+(cp.setupFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Monthly Fee</div><input type="number" class="edf" id="cp-monthlyFee" value="'+(cp.monthlyFee||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Monthly Ad Spend</div><input type="number" class="edf" id="cp-monthlyAdSpend" value="'+(cp.monthlyAdSpend||'')+'" placeholder="0" min="0" step="0.01" style="font-size:16px;font-weight:700"></div>';
  h+='</div>';
  h+='<div class="cp-fee-total"><div class="cp-fee-total-label">One-off: '+fmtUSD(oneOff)+' · Monthly: '+fmtUSD(monthly)+'</div><div class="cp-fee-total-value">Total Paid: '+fmtUSD(st.finRevenue)+'</div></div>';
  /* Billing terms */
  h+='<div class="cp-fees-grid" style="margin-top:10px">';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Billing Frequency</div><select class="edf" id="cp-billingFreq"><option value="monthly"'+(cp.billingFrequency==='monthly'?' selected':'')+'>Monthly</option><option value="quarterly"'+(cp.billingFrequency==='quarterly'?' selected':'')+'>Quarterly</option><option value="annually"'+(cp.billingFrequency==='annually'?' selected':'')+'>Annually</option></select></div>';
  h+='<div class="cp-fee-item"><div class="cp-fee-label">Next Billing Date</div><input type="date" class="edf" id="cp-nextBilling" value="'+(cp.nextBillingDate||'')+'"></div>';
  h+='</div>';
  h+='</div>';

  /* Links */
  h+='<div style="margin-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">'+icon('link',12)+' Links</span><div class="cp-links-grid">';
  var links=[['Proposal','cp-proposalLink',cp.proposalLink],['Monthly Reports','cp-reportsLink',cp.reportsLink],['Video Assets','cp-videoAssetsLink',cp.videoAssetsLink],['Transcripts','cp-transcriptsLink',cp.transcriptsLink],['Contract','cp-contractLink',cp.contractLink],['Awareness LP','cp-awarenessLP',cp.awarenessLP],['Consideration LP','cp-considerationLP',cp.considerationLP],['Decision LP','cp-decisionLP',cp.decisionLP]];
  links.forEach(function(l){
    h+='<div class="cp-link-item"><span class="cp-link-label">'+l[0]+'</span>';
    if(l[2])h+='<a href="'+esc(l[2])+'" target="_blank" onclick="event.stopPropagation()">Open ↗</a>';
    h+='<input type="url" class="edf" id="'+l[1]+'" value="'+esc(l[2])+'" placeholder="https://..." style="flex:1;font-size:11px">';
    h+='</div>'});
  h+='</div></div>';

  /* Actions */
  h+='<div class="ed-actions">';
  h+='<button class="btn btn-p" onclick="TF.saveCampaign()" style="padding:10px 22px">'+icon('save',12)+' Save Campaign</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.confirmDeleteCampaign()" style="padding:10px 16px">'+icon('trash',12)+' Delete</button>';
  h+='</div><div id="del-zone"></div>';
  h+='</div>';/* end detail-split-left */

  /* RIGHT: Payments, Meetings, Tasks, Notes */
  h+='<div class="detail-split-right">';

  /* Revenue — Finance Payments */
  h+='<div><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">'+icon('activity',12)+' Revenue ('+allCpPayments.length+')';
  h+='<span style="font-weight:700;color:var(--green)">'+fmtUSD(st.finRevenue)+'</span></span>';
  /* Estimated vs actual bar */
  if(st.estTotal>0){
    var pct=Math.min(100,Math.round((st.finRevenue/st.estTotal)*100));
    var barColor=pct>=100?'var(--green)':pct>=60?'var(--amber)':'var(--red)';
    h+='<div style="margin-bottom:10px">';
    h+='<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t4);margin-bottom:3px"><span>Actual vs Estimated</span><span>'+pct+'% of '+fmtUSD(st.estTotal)+'</span></div>';
    h+='<div style="background:var(--bg3);border-radius:4px;height:6px;overflow:hidden"><div style="background:'+barColor+';height:100%;width:'+pct+'%;border-radius:4px;transition:width .4s var(--ease)"></div></div>';
    h+='</div>'}
  if(allCpPayments.length){
    h+='<div class="tb-wrap"><table class="tb"><thead><tr><th>Date</th><th class="r">Amount</th><th>Source</th><th>Description</th></tr></thead><tbody>';
    allCpPayments.forEach(function(fp){
      h+='<tr style="cursor:pointer" onclick="TF.closeModal();setTimeout(function(){TF.openFinancePaymentDetail(\''+escAttr(fp.id)+'\')},100)">';
      h+='<td>'+(fp.date?fmtDShort(fp.date):'')+'</td>';
      h+='<td class="nm" style="color:var(--green)">'+fmtUSD(fp.amount)+'</td>';
      h+='<td>';
      if(fp.source)h+='<span class="fin-src fin-src-'+esc(fp.source)+'">'+esc(fp.source==='stripe2'?'Stripe 2':fp.source.charAt(0).toUpperCase()+fp.source.slice(1))+'</span>';
      if(fp.type==='split')h+=' <span class="fin-cat fin-cat-split" style="font-size:9px">Split</span>';
      h+='</td>';
      h+='<td style="color:var(--t3);font-size:11px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(fp.desc)+'</td></tr>'});
    h+='<tr style="font-weight:700"><td>Total</td><td class="nm" style="color:var(--green)">'+fmtUSD(st.finRevenue)+'</td><td></td><td></td></tr>';
    h+='</tbody></table></div>'}
  else{h+='<div style="padding:12px;text-align:center;color:var(--t4);font-size:12px">No payments linked yet — associate payments in Finance view</div>'}
  h+='</div>';

  /* Upcoming Billing */
  if(cp.monthlyFee){
    var cycMo=cp.billingFrequency==='quarterly'?3:cp.billingFrequency==='annually'?12:1;
    var billAmt=cp.monthlyFee*cycMo;
    var freqLbl=cp.billingFrequency==='quarterly'?'Quarterly':cp.billingFrequency==='annually'?'Annually':'Monthly';
    h+='<div style="border-top:1px solid var(--gborder);padding-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">'+icon('calendar',12)+' Upcoming Billing';
    h+='<span style="font-weight:700;color:var(--blue)">'+fmtUSD(billAmt)+' '+freqLbl+'</span></span>';
    h+='<div style="display:flex;gap:12px;align-items:center;font-size:12px;color:var(--t3)">';
    h+='<span>Next billing: <strong style="color:var(--t1)">'+(cp.nextBillingDate||'Not set')+'</strong></span>';
    h+='</div></div>'}

  /* Campaign Meetings */
  h+='<div style="border-top:1px solid var(--gborder);padding-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">'+icon('mic',12)+' Campaign Meetings ('+st.meetings.length+')</span>';
  if(st.meetings.length){
    h+='<div class="tb-wrap"><table class="tb"><thead><tr><th>Date</th><th>Title</th><th>Recording</th><th>Notes</th></tr></thead><tbody>';
    st.meetings.sort(function(a,b){return(b.date?b.date.getTime():0)-(a.date?a.date.getTime():0)}).forEach(function(m){
      h+='<tr><td>'+(m.date?fmtDShort(m.date):'')+'</td><td>'+esc(m.title)+'</td><td>'+(m.recordingLink?'<a href="'+esc(m.recordingLink)+'" target="_blank" onclick="event.stopPropagation()">Watch ↗</a>':'')+'</td><td style="color:var(--t3)">'+esc(m.notes)+'</td></tr>'});
    h+='</tbody></table></div>'}
  h+='<button class="btn" onclick="TF.openAddCampaignMeeting(\''+escAttr(cp.id)+'\')" style="margin-top:6px;font-size:11px;padding:5px 12px">+ Add Meeting</button></div>';

  /* Open Tasks */
  h+='<div style="border-top:1px solid var(--gborder);padding-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">Open Tasks ('+st.openCount+')</span>';
  if(st.openTasks.length){st.openTasks.forEach(function(t){h+=miniRow(t,td_)})}
  h+='<button class="btn" onclick="TF.closeModal();TF.openAddModal();setTimeout(function(){var cs=gel(\'f-cli\');if(cs)cs.value=\''+escAttr(cp.partner)+'\';TF.refreshAddCampaigns();var cc=gel(\'f-campaign\');if(cc)cc.value=\''+escAttr(cp.id)+'\';TF.fillFromCampaign()},200)" style="margin-top:6px;font-size:11px;padding:5px 12px">+ Add Task to Campaign</button></div>';

  /* Completed Tasks */
  h+='<div style="border-top:1px solid var(--gborder);padding-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:8px;display:block">'+CK_S+' Completed Tasks ('+st.doneCount+')</span>';
  if(st.totalTime)h+='<div style="font-size:12px;color:var(--green);font-weight:700;margin-bottom:8px">Total Time: '+fmtM(st.totalTime)+'</div>';
  if(st.doneTasks.length){st.doneTasks.slice(0,20).forEach(function(d){
    h+='<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px">';
    h+='<span style="color:var(--green)">'+fmtM(d.duration)+'</span>';
    h+='<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(d.item)+'</span>';
    if(d.completed)h+='<span style="color:var(--t4);flex-shrink:0;font-size:11px">'+fmtDShort(d.completed)+'</span>';
    h+='</div>'})}
  h+='</div>';

  /* Notes */
  h+='<div class="detail-notes-large" style="border-top:1px solid var(--gborder);padding-top:14px"><span class="ed-lbl" style="padding-left:0;margin-bottom:6px;display:block">'+icon('edit',12)+' Notes</span>';
  h+='<textarea class="edf edf-notes" id="cp-notes" placeholder="Campaign notes, strategy details...">'+esc(cp.notes||'')+'</textarea></div>';

  h+='</div>';/* end detail-split-right */
  h+='</div>';/* end detail-split */
  }/* end desktop else */

  gel('detail-body').innerHTML=h;
  gel('detail-modal').classList.add('on','full-detail')}

async function saveCampaign(){
  var id=gel('cp-id').value;var cp=S.campaigns.find(function(c){return c.id===id});if(!cp)return;
  cp.name=gel('cp-name').value.trim();if(!cp.name){toast('Campaign name required','warn');return}
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
  cp.billingFrequency=(gel('cp-billingFreq')||{}).value||'monthly';
  cp.nextBillingDate=(gel('cp-nextBilling')||{}).value||null;
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
  toast(icon('save',12)+' Saved: '+cp.name,'ok');closeModal();render()}

function openEditCampaignModal(id){
  var cp=S.campaigns.find(function(c){return c.id===id});if(!cp)return;
  var PLATFORMS=['Meta','Google Ads','YouTube','LinkedIn','TikTok','Microsoft Ads','Programmatic','Multiple','Other'];
  var STATUSES=['Setup','Active','Paused','Completed','Archived'];
  var TERMS=['1 month','2 months','3 months','4 months','5 months','6 months','7 months','8 months','9 months','10 months','11 months','12 months','18 months','24 months','Ongoing'];

  var h='<div class="tf-modal-top"><h2>Edit Campaign</h2><button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div style="padding:0 20px 20px;max-height:70vh;overflow-y:auto">';
  h+='<input type="hidden" id="cp-id" value="'+esc(cp.id)+'">';

  /* Campaign Details */
  h+='<div style="font-size:12px;font-weight:700;color:var(--t3);margin:12px 0 8px;text-transform:uppercase;letter-spacing:1px">Campaign Details</div>';
  h+='<div class="ed-grid">';
  h+='<div class="ed-fld full"><span class="ed-lbl">Name</span><input type="text" class="edf" id="cp-name" value="'+escAttr(cp.name)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Partner</span><select class="edf" id="cp-partner"><option value="">Select...</option>';
  S.clients.forEach(function(c){h+='<option'+(c===cp.partner?' selected':'')+'>'+esc(c)+'</option>'});h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="cp-ec" onchange="TF.ecAddNew(\'cp-ec\')">'+buildEndClientOptions(cp.endClient||'')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Status</span><select class="edf" id="cp-status">';
  STATUSES.forEach(function(s){h+='<option'+(s===cp.status?' selected':'')+'>'+s+'</option>'});h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Platform</span><select class="edf" id="cp-platform"><option value="">Select...</option>';
  PLATFORMS.forEach(function(p){h+='<option'+(p===cp.platform?' selected':'')+'>'+p+'</option>'});h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign Term</span><select class="edf" id="cp-term"><option value="">Select...</option>';
  TERMS.forEach(function(t){h+='<option'+(t===cp.campaignTerm?' selected':'')+'>'+t+'</option>'});h+='</select></div>';
  h+='<div class="ed-fld full"><span class="ed-lbl">Goal</span><input type="text" class="edf" id="cp-goal" value="'+escAttr(cp.goal||'')+'" placeholder="Campaign goal..."></div>';
  h+='</div>';

  /* Dates */
  h+='<div style="font-size:12px;font-weight:700;color:var(--t3);margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px">Dates</div>';
  h+='<div class="ed-grid">';
  h+='<div class="ed-fld"><span class="ed-lbl">Planned Launch</span><input type="date" class="edf" id="cp-planned" value="'+(cp.plannedLaunch?cp.plannedLaunch.toISOString().slice(0,10):'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Actual Launch</span><input type="date" class="edf" id="cp-actual" value="'+(cp.actualLaunch?cp.actualLaunch.toISOString().slice(0,10):'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Renewal Date</span><input type="date" class="edf" id="cp-renewal" value="'+(cp.renewalDate?cp.renewalDate.toISOString().slice(0,10):'')+'"></div>';
  h+='</div>';

  /* Fees */
  h+='<div style="font-size:12px;font-weight:700;color:var(--t3);margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px">Fees</div>';
  h+='<div class="ed-grid">';
  h+='<div class="ed-fld"><span class="ed-lbl">Strategy Fee</span><input type="number" class="edf" id="cp-strategyFee" value="'+(cp.strategyFee||'')+'" placeholder="0" min="0" step="0.01"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Setup Fee</span><input type="number" class="edf" id="cp-setupFee" value="'+(cp.setupFee||'')+'" placeholder="0" min="0" step="0.01"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Monthly Fee</span><input type="number" class="edf" id="cp-monthlyFee" value="'+(cp.monthlyFee||'')+'" placeholder="0" min="0" step="0.01"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Monthly Ad Spend</span><input type="number" class="edf" id="cp-monthlyAdSpend" value="'+(cp.monthlyAdSpend||'')+'" placeholder="0" min="0" step="0.01"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Billing Frequency</span><select class="edf" id="cp-billingFreq"><option value="monthly"'+(cp.billingFrequency==='monthly'?' selected':'')+'>Monthly</option><option value="quarterly"'+(cp.billingFrequency==='quarterly'?' selected':'')+'>Quarterly</option><option value="annually"'+(cp.billingFrequency==='annually'?' selected':'')+'>Annually</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Next Billing Date</span><input type="date" class="edf" id="cp-nextBilling" value="'+(cp.nextBillingDate||'')+'"></div>';
  h+='</div>';

  /* Links */
  h+='<div style="font-size:12px;font-weight:700;color:var(--t3);margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px">Links</div>';
  h+='<div class="cp-links-grid">';
  var lnks=[['Proposal','cp-proposalLink',cp.proposalLink],['Monthly Reports','cp-reportsLink',cp.reportsLink],['Video Assets','cp-videoAssetsLink',cp.videoAssetsLink],['Transcripts','cp-transcriptsLink',cp.transcriptsLink],['Contract','cp-contractLink',cp.contractLink],['Awareness LP','cp-awarenessLP',cp.awarenessLP],['Consideration LP','cp-considerationLP',cp.considerationLP],['Decision LP','cp-decisionLP',cp.decisionLP]];
  lnks.forEach(function(l){
    h+='<div class="cp-link-item"><span class="cp-link-label">'+l[0]+'</span>';
    if(l[2])h+='<a href="'+esc(l[2])+'" target="_blank" onclick="event.stopPropagation()" style="color:var(--pink);font-size:11px">Open &#8599;</a>';
    h+='<input type="url" class="edf" id="'+l[1]+'" value="'+escAttr(l[2]||'')+'" placeholder="https://..." style="flex:1;font-size:11px">';
    h+='</div>'});
  h+='</div>';

  /* Notes */
  h+='<div style="font-size:12px;font-weight:700;color:var(--t3);margin:16px 0 8px;text-transform:uppercase;letter-spacing:1px">Notes</div>';
  h+='<textarea class="edf edf-notes" id="cp-notes" placeholder="Campaign notes, strategy details...">'+esc(cp.notes||'')+'</textarea>';

  /* Actions */
  h+='<div class="ed-actions" style="margin-top:16px">';
  h+='<button class="btn btn-p" onclick="TF.saveCampaign()">'+icon('save',14)+' Save</button>';
  h+='<button class="btn" onclick="TF.closeModal()">Cancel</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.confirmDeleteCampaign()">'+icon('trash',12)+' Delete</button>';
  h+='</div><div id="del-zone"></div>';
  h+='</div>';

  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

function openAddCampaign(){
  var PLATFORMS=['Meta','Google Ads','YouTube','LinkedIn','TikTok','Microsoft Ads','Programmatic','Multiple','Other'];
  var TERMS=['1 month','2 months','3 months','4 months','5 months','6 months','7 months','8 months','9 months','10 months','11 months','12 months','18 months','24 months','Ongoing'];
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('target',12)+' New Campaign</span>';
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
  h+='<div class="fld"><label>Billing Frequency</label><select id="ncp-billingFreq"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option></select></div>';
  h+='<div class="fld"><label>Next Billing Date</label><input type="date" id="ncp-nextBilling"></div>';
  h+='<div class="fld full"><label>Notes</label><textarea id="ncp-notes" rows="2" placeholder="Campaign notes..."></textarea></div>';
  h+='</div><button class="btn btn-p" onclick="TF.addCampaign()" style="margin-top:12px">'+icon('target',12)+' Create Campaign</button></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  setTimeout(function(){var fi=gel('ncp-name');if(fi)fi.focus()},100)}

async function addCampaign(){
  var name=(gel('ncp-name')||{}).value;if(!name||!name.trim()){toast('Enter a campaign name','warn');return}
  var cp={name:name.trim(),partner:gel('ncp-partner').value||'',endClient:(gel('ncp-ec')?gel('ncp-ec').value:'').trim(),
    status:gel('ncp-status').value||'Setup',platform:gel('ncp-platform').value||'',
    strategyFee:parseFloat(gel('ncp-strategyFee').value)||0,setupFee:parseFloat(gel('ncp-setupFee').value)||0,
    monthlyFee:parseFloat(gel('ncp-monthlyFee').value)||0,monthlyAdSpend:parseFloat(gel('ncp-monthlyAdSpend').value)||0,
    campaignTerm:gel('ncp-term').value||'',plannedLaunch:null,actualLaunch:null,renewalDate:null,
    goal:(gel('ncp-goal')||{}).value||'',proposalLink:'',reportsLink:'',videoAssetsLink:'',transcriptsLink:'',
    billingFrequency:(gel('ncp-billingFreq')||{}).value||'monthly',nextBillingDate:(gel('ncp-nextBilling')||{}).value||null,
    awarenessLP:'',considerationLP:'',decisionLP:'',contractLink:'',notes:(gel('ncp-notes')||{}).value||''};
  var result=await dbAddCampaign(cp);
  if(result){cp.id=result.id;cp.created=new Date();S.campaigns.push(cp)}
  toast('Created: '+cp.name,'ok');closeModal();nav('campaigns');render()}

function confirmDeleteCampaign(){
  var id=gel('cp-id').value;var cp=S.campaigns.find(function(c){return c.id===id});if(!cp)return;
  gel('del-zone').innerHTML='<div class="del-confirm"><span>Delete campaign "'+esc(cp.name)+'"?</span><button class="btn btn-d" onclick="TF.doDeleteCampaign(\''+escAttr(id)+'\')">Yes, Delete</button><button class="btn" onclick="document.getElementById(\'del-zone\').innerHTML=\'\'">Cancel</button></div>'}

async function doDeleteCampaign(id){
  var cp=S.campaigns.find(function(c){return c.id===id});if(!cp)return;
  await dbDeleteCampaign(id);
  S.campaigns=S.campaigns.filter(function(c){return c.id!==id});
  toast(icon('trash',12)+' Deleted: '+cp.name,'warn');closeModal();render()}

/* ═══════════ PAYMENT MODAL ═══════════ */
function openAddPayment(campaignId){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent"> Add Payment</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="frm" style="margin-top:8px"><div class="frm-grid">';
  h+='<div class="fld full"><label>Campaign *</label><select id="pay-cp">';
  S.campaigns.forEach(function(c){h+='<option value="'+esc(c.id)+'"'+(c.id===campaignId?' selected':'')+'>'+esc(c.name)+' — '+esc(c.partner)+' — '+esc(c.endClient)+'</option>'});
  h+='</select></div>';
  h+='<div class="fld"><label>Date</label><input type="date" id="pay-date" value="'+new Date().toISOString().slice(0,10)+'"></div>';
  h+='<div class="fld"><label>Amount ($)</label><input type="number" id="pay-amount" placeholder="0.00" min="0" step="0.01"></div>';
  h+='<div class="fld"><label>Type</label><select id="pay-type"><option>Strategy</option><option>Set-Up</option><option>Monthly Fee</option><option>Monthly Ad Spend</option><option>Other</option></select></div>';
  h+='<div class="fld full"><label>Notes</label><input type="text" id="pay-notes" placeholder="Optional notes..."></div>';
  h+='</div><button class="btn btn-p" onclick="TF.addPayment()" style="margin-top:12px"> Add Payment</button></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function addPayment(){
  var cpId=gel('pay-cp').value;if(!cpId){toast('Select a campaign','warn');return}
  var amount=parseFloat(gel('pay-amount').value);if(!amount){toast('Enter an amount','warn');return}
  var cp=S.campaigns.find(function(c){return c.id===cpId});if(!cp)return;
  var pay={campaignId:cp.id,date:gel('pay-date').value||new Date().toISOString().slice(0,10),amount:amount,
    type:gel('pay-type').value,notes:(gel('pay-notes')||{}).value||''};
  var result=await dbAddPayment(pay);
  if(result){pay.id=result.id;pay.campaignName=cp.name;pay.partner=cp.partner;pay.endClient=cp.endClient;
    pay.date=pay.date?new Date(pay.date):new Date();S.payments.push(pay)}
  toast(' Payment added: '+fmtUSD(amount),'ok');closeModal();
  if(S.campaignDetailId===cpId){render();return}
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

function buildOpportunityOptions(currentValue,filterClient){
  var opts='<option value="">None</option>';
  S.opportunities.filter(function(o){
    if(o.stage==='Closed Won'||o.stage==='Closed Lost')return false;
    if(filterClient&&o.client!==filterClient)return false;
    return true}).forEach(function(o){
    opts+='<option value="'+esc(o.id)+'"'+(currentValue===o.id?' selected':'')+'>'+esc(o.name)+'</option>'});
  return opts}

/* ═══════════ OPPORTUNITY DETAIL MODAL ═══════════ */
function openOpportunityDetail(id){
  var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  var st=getOpportunityStats(op);
  var eid=escAttr(id);
  var conf=oppTypeConf(op.type);
  var stages=oppAllStages(op.type);
  var cliOpts=S.clients.map(function(c){return'<option'+(c===op.client?' selected':'')+'>'+esc(c)+'</option>'}).join('');
  var isClosed=oppIsClosedStage(op.stage);
  var isRL=op.type==='retain_live';

  var h='<div class="detail-full-header">';
  h+='<div class="tf-modal-top">';
  h+='<input type="text" class="edf edf-name" id="op-name" value="'+esc(op.name)+'"'+(isClosed?' readonly':'')+' style="font-size:18px">';
  h+='<input type="hidden" id="op-id" value="'+esc(op.id)+'">';
  h+='<input type="hidden" id="op-type" value="'+esc(op.type)+'">';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="tf-modal-badges">';
  h+='<span class="bg '+opTypeBadgeCls(op.type)+'">'+conf.label+'</span>';
  h+='<span class="bg '+opStageClass(op.stage,op.type)+'">'+esc(op.stage)+'</span>';
  h+='<span class="op-prob '+probClass(op.probability)+'">'+op.probability+'% prob</span>';
  if(st.totalValue)h+='<span class="bg" style="background:rgba(61,220,132,0.08);color:var(--green)">'+fmtUSD(st.totalValue)+'</span>';
  if(st.weightedValue)h+='<span class="bg" style="background:rgba(255,176,48,0.08);color:var(--amber)">'+fmtUSD(st.weightedValue)+' weighted</span>';
  if(st.openCount)h+='<span class="bg" style="background:rgba(77,166,255,0.08);color:var(--blue)">'+st.openCount+' tasks</span>';
  if(st.meetingCount)h+='<span class="bg" style="background:rgba(168,85,247,0.08);color:var(--purple50)">'+st.meetingCount+' meetings</span>';
  if(op.client)h+='<span class="bg bg-cl">'+esc(op.client)+'</span>';
  if(op.endClient)h+='<span class="bg bg-ec">'+esc(op.endClient)+'</span>';
  if(st.totalTime)h+='<span class="bg" style="background:rgba(77,166,255,0.08);color:var(--blue)">'+icon('clock',12)+' '+fmtM(st.totalTime)+'</span>';
  if(st.revenueRealized>0)h+='<span class="bg" style="background:rgba(61,220,132,0.08);color:var(--green)">'+icon('activity',12)+' '+fmtUSD(st.revenueRealized)+' received</span>';
  if(op.stage==='Closed Lost'&&op.closeReason)h+='<span class="bg" style="background:rgba(255,51,88,0.08);color:var(--red)">'+esc(op.closeReason)+'</span>';
  if(op.convertedCampaignId){var cpLink=S.campaigns.find(function(c){return c.id===op.convertedCampaignId});
    if(cpLink)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber);cursor:pointer" onclick="TF.closeModal();setTimeout(function(){TF.openCampaignDetail(\''+escAttr(cpLink.id)+'\')},100)">'+icon('target',12)+' '+esc(cpLink.name)+'</span>'}
  h+='</div></div>';

  h+='<div class="detail-split">';
  /* LEFT PANE */
  h+='<div class="detail-split-left">';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Stage</span><select class="edf" id="op-stage"'+(isClosed?' disabled':'')+'>'+stages.map(function(s){return'<option'+(s===op.stage?' selected':'')+'>'+s+'</option>'}).join('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">'+(isRL?'Prospect':'Client / Partner')+'</span><select class="edf" id="op-client"><option value="">Select...</option>'+cliOpts+'</select></div>';
  if(!isRL){h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><input type="text" class="edf" id="op-endclient" value="'+esc(op.endClient)+'"></div>'}
  else{h+='<div class="ed-fld"><span class="ed-lbl">Company</span><input type="text" class="edf" id="op-endclient" value="'+esc(op.endClient)+'" placeholder="Company name..."></div>'}
  h+='</div>';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Contact Name</span><input type="text" class="edf" id="op-contact" value="'+esc(op.contactName)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Contact Email</span><input type="email" class="edf" id="op-email" value="'+esc(op.contactEmail)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Source</span><input type="text" class="edf" id="op-source" value="'+esc(op.source)+'" placeholder="e.g. Referral, Inbound..."></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Job Title</span><input type="text" class="edf" id="op-jobtitle" value="'+esc(op.contactJobTitle)+'" placeholder="Contact job title..."></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Website</span><input type="url" class="edf" id="op-website" value="'+esc(op.prospectWebsite)+'" placeholder="https://..."></div>';
  h+='<div></div>';
  h+='</div>';

  /* Fee fields — type-specific */
  if(isRL){
    h+='<div class="ed-grid ed-grid-3">';
    h+='<div class="ed-fld"><span class="ed-lbl">Program Fee</span><input type="number" class="edf" id="op-strategy" value="'+(op.strategyFee||'')+'" min="0" step="0.01"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Payment Plan</span><select class="edf" id="op-payplan">';
    [['one_time','One-time ($5,000)'],['3_monthly','3x Monthly ($2,000)'],['custom','Custom']].forEach(function(pp){
      h+='<option value="'+pp[0]+'"'+((op.paymentPlan||'one_time')===pp[0]?' selected':'')+'>'+pp[1]+'</option>'});
    h+='</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Win Probability %</span><input type="number" class="edf" id="op-prob" value="'+(op.probability||50)+'" min="0" max="100"></div>';
    h+='</div>';
  }else{
    h+='<div class="ed-grid ed-grid-4">';
    h+='<div class="ed-fld"><span class="ed-lbl">Strategy Fee</span><input type="number" class="edf" id="op-strategy" value="'+(op.strategyFee||'')+'" min="0" step="0.01"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Setup Fee</span><input type="number" class="edf" id="op-setup" value="'+(op.setupFee||'')+'" min="0" step="0.01"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Monthly Fee</span><input type="number" class="edf" id="op-monthly" value="'+(op.monthlyFee||'')+'" min="0" step="0.01"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Monthly Ad Spend</span><input type="number" class="edf" id="op-adspend" value="'+(op.monthlyAdSpend||'')+'" min="0" step="0.01"></div>';
    h+='</div>';
    h+='<div class="ed-grid ed-grid-3">';
    h+='<div class="ed-fld"><span class="ed-lbl">Win Probability %</span><input type="number" class="edf" id="op-prob" value="'+(op.probability||50)+'" min="0" max="100"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Expected Close</span><input type="date" class="edf" id="op-close" value="'+(op.expectedClose?op.expectedClose.toISOString().split('T')[0]:'')+'"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Description</span><input type="text" class="edf" id="op-desc" value="'+esc(op.description)+'" placeholder="Brief description..."></div>';
    h+='</div>'}

  /* Common extra fields */
  if(isRL){
    h+='<div class="ed-grid ed-grid-2">';
    h+='<div class="ed-fld"><span class="ed-lbl">Expected Close</span><input type="date" class="edf" id="op-close" value="'+(op.expectedClose?op.expectedClose.toISOString().split('T')[0]:'')+'"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Description</span><input type="text" class="edf" id="op-desc" value="'+esc(op.description)+'" placeholder="Brief description..."></div>';
    h+='</div>'}

  /* Payment & Processing */
  h+='<div class="ed-grid ed-grid-'+(isRL?'2':'4')+'" style="margin-top:4px">';
  h+='<div class="ed-fld"><span class="ed-lbl">Payment Method</span><select class="edf" id="op-paymethod">';
  [['bank_transfer','Bank Transfer'],['card','Card'],['direct_debit','Direct Debit']].forEach(function(pm){h+='<option value="'+pm[0]+'"'+((op.paymentMethod||'bank_transfer')===pm[0]?' selected':'')+'>'+pm[1]+'</option>'});
  h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Receiving Account</span><select class="edf" id="op-recvacct"><option value=""'+(!(op.receivingAccount)?' selected':'')+'>Auto</option><option value="brex"'+((op.receivingAccount||'')==='brex'?' selected':'')+'>Brex</option><option value="mercury"'+((op.receivingAccount||'')==='mercury'?' selected':'')+'>Mercury</option></select></div>';
  if(!isRL){
    h+='<div class="ed-fld"><span class="ed-lbl">Processing Fee %</span><input type="number" class="edf" id="op-procfee" value="'+(op.processingFeePct||0)+'" min="0" max="100" step="0.1"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Monthly Duration</span><input type="number" class="edf" id="op-monthdur" value="'+(op.expectedMonthlyDuration||12)+'" min="1" placeholder="12"></div>'}
  h+='</div>';

  /* Actions */
  h+='<div class="ed-actions" style="margin-top:12px">';
  h+='<button class="btn btn-p" onclick="TF.saveOpportunity()">'+icon('save',12)+' Save</button>';
  if(!isClosed){
    if(conf.conversion==='client'){
      h+='<button class="btn" style="background:rgba(61,220,132,0.1);color:var(--green);border-color:rgba(61,220,132,0.3)" onclick="TF.convertToClient(\''+eid+'\')">'+icon('check',12)+' Convert to Client</button>';
    }else{
      h+='<button class="btn" style="background:rgba(61,220,132,0.1);color:var(--green);border-color:rgba(61,220,132,0.3)" onclick="TF.convertOpportunity(\''+eid+'\')">'+icon('target',12)+' Convert to Campaign</button>'}
    h+='<button class="btn" style="background:rgba(255,51,88,0.1);color:var(--red);border-color:rgba(255,51,88,0.3)" onclick="TF.closeAsLost(\''+eid+'\')">'+icon('x',12)+' Close as Lost</button>'}
  h+='<button class="btn ab-del" style="margin-left:auto" onclick="TF.confirmDeleteOpportunity()">'+icon('trash',12)+' Delete</button>';
  h+='</div>';
  h+='</div>';

  /* RIGHT PANE */
  h+='<div class="detail-split-right">';
  /* AI Assistant — build opportunity live data */
  var opClientRec=S.clientRecords?S.clientRecords.find(function(cr){return cr.name===op.client}):null;
  var _opLive='\nOPPORTUNITY DETAILS:\n';
  _opLive+='- Name: '+op.name+'\n- Client: '+(op.client||'N/A')+'\n- End Client: '+(op.endClient||'N/A')+'\n';
  _opLive+='- Stage: '+op.stage+'\n- Type: '+conf.label+'\n- Probability: '+(op.probability||0)+'%\n';
  _opLive+='- Strategy Fee: '+fmtUSD(op.strategyFee||0)+'\n- Setup Fee: '+fmtUSD(op.setupFee||0)+'\n- Monthly Fee: '+fmtUSD(op.monthlyFee||0)+'/mo\n';
  _opLive+='- Total Value: '+fmtUSD(st.totalValue)+'\n';
  if(op.notes)_opLive+='- Notes: '+op.notes+'\n';
  if(st.openTasks.length){_opLive+='\nOPEN TASKS ('+st.openTasks.length+'):\n';st.openTasks.forEach(function(t){_opLive+='- '+t.item+(t.due?' due '+t.due.toLocaleDateString('en-US',{month:'short',day:'numeric'}):'')+(t.importance?' ['+t.importance+']':'')+'\n'})}
  if(st.doneTasks.length){_opLive+='\nCOMPLETED TASKS ('+Math.min(st.doneTasks.length,10)+'):\n';st.doneTasks.slice(0,10).forEach(function(d){_opLive+='- '+d.item+(d.completed?' ('+d.completed.toLocaleDateString('en-US',{month:'short',day:'numeric'})+')':'')+'\n'})}
  if(st.meetings.length){_opLive+='\nRELATED MEETINGS ('+st.meetings.length+'):\n';st.meetings.slice(0,10).forEach(function(m){_opLive+='- '+m.title+(m.start?' ('+m.start.toLocaleDateString('en-US',{month:'short',day:'numeric'})+')'  :'')+'\n'})}
  if(st.nextDue)_opLive+='\nNEXT DUE: '+st.nextDue.item+' on '+st.nextDue.due.toLocaleDateString('en-US',{month:'short',day:'numeric'})+'\n';

  h+=aiBox('opp-ai',{clientId:opClientRec?opClientRec.id:null,clientName:op.client,
    sourceTypes:['opportunity','meeting','email','task','contact'],
    entityContext:{type:'opportunity',name:op.name,data:{
      stage:op.stage,client:op.client,endClient:op.endClient,
      probability:op.probability+'%',totalValue:fmtUSD(st.totalValue),type:conf.label},
      liveData:_opLive},
    suggestedPrompts:['Summarize all interactions for this deal',
      'What are the next steps for '+op.name+'?',
      'Review meeting notes for '+(op.client||op.endClient||'this prospect'),
      'What is the risk assessment for this opportunity?'],
    placeholder:'Ask about this opportunity...',collapsed:true});
  /* Brief Fields (F&C Partnership) */
  if(op.type==='fc_partnership'){
    var hasBrief=op.previousRelationship||op.companyDescription||op.prospectDescription||op.videoStrategyBenefits;
    h+='<div style="margin-bottom:16px">';
    h+='<span class="ed-lbl" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="var s=this.nextElementSibling;s.style.display=s.style.display===\'none\'?\'block\':\'none\';this.querySelector(\'span\').textContent=s.style.display===\'none\'?\'\u25B6\':\'\u25BC\'">Brief Details <span>'+(hasBrief?'\u25BC':'\u25B6')+'</span></span>';
    h+='<div id="op-brief-section" style="display:'+(hasBrief?'block':'none')+'">';
    h+='<div style="margin-bottom:8px"><span class="ed-lbl" style="font-size:9px;margin-bottom:2px">Previous Relationship</span><textarea class="edf edf-notes" id="op-prevrel" rows="2" placeholder="Previous working relationship...">'+esc(op.previousRelationship)+'</textarea></div>';
    h+='<div style="margin-bottom:8px"><span class="ed-lbl" style="font-size:9px;margin-bottom:2px">Company Description</span><textarea class="edf edf-notes" id="op-compdesc" rows="2" placeholder="Brief company description...">'+esc(op.companyDescription)+'</textarea></div>';
    h+='<div style="margin-bottom:8px"><span class="ed-lbl" style="font-size:9px;margin-bottom:2px">Prospect Description</span><textarea class="edf edf-notes" id="op-prospdesc" rows="2" placeholder="Brief prospect description...">'+esc(op.prospectDescription)+'</textarea></div>';
    h+='<div style="margin-bottom:8px"><span class="ed-lbl" style="font-size:9px;margin-bottom:2px">Video Strategy Benefits</span><textarea class="edf edf-notes" id="op-vidbene" rows="2" placeholder="Benefits of a video strategy...">'+esc(op.videoStrategyBenefits)+'</textarea></div>';
    h+='</div></div>'}

  /* Notes */
  h+='<div style="margin-bottom:16px"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="op-notes" rows="3" placeholder="Notes about this opportunity...">'+esc(op.notes)+'</textarea></div>';

  /* Revenue Realized (for converted opportunities) */
  if(op.convertedCampaignId&&st.revenueRealized>0){
    var pctR=st.totalValue>0?Math.min(100,Math.round((st.revenueRealized/st.totalValue)*100)):0;
    var rColor=pctR>=100?'var(--green)':pctR>=50?'var(--amber)':'var(--t4)';
    h+='<div style="margin-bottom:16px;padding:14px;background:rgba(61,220,132,.04);border:1px solid rgba(61,220,132,.12);border-radius:10px">';
    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">';
    h+='<span class="ed-lbl" style="margin:0">'+icon('activity',12)+' Revenue Realized</span>';
    h+='<span style="font-weight:700;color:var(--green)">'+fmtUSD(st.revenueRealized)+'</span></div>';
    h+='<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--t4);margin-bottom:3px"><span>'+pctR+'% of deal value</span><span>Deal: '+fmtUSD(st.totalValue)+'</span></div>';
    h+='<div style="background:var(--bg3);border-radius:4px;height:6px;overflow:hidden"><div style="background:'+rColor+';height:100%;width:'+pctR+'%;border-radius:4px"></div></div>';
    h+='</div>'}

  /* Meetings */
  h+='<div style="margin-bottom:16px"><span class="ed-lbl" style="display:flex;justify-content:space-between;align-items:center">Meetings ('+st.meetingCount+')<button class="btn" style="font-size:10px;padding:3px 10px" onclick="TF.openAddOpportunityMeeting(\''+eid+'\')">+ Add</button></span>';
  if(st.meetings.length){
    st.meetings.forEach(function(m){
      h+='<div class="op-meeting-row">';
      h+='<span style="font-size:11px;color:var(--t3);min-width:80px">'+fmtDShort(m.date)+'</span>';
      h+='<span style="flex:1;font-size:12px;font-weight:600;color:var(--t1)">'+esc(m.title)+'</span>';
      if(m.recordingLink)h+='<a href="'+esc(m.recordingLink)+'" target="_blank" style="font-size:10px;color:var(--blue)">'+icon('link',10)+' Recording</a>';
      h+='<button class="ab ab-del ab-mini" onclick="event.stopPropagation();TF.deleteOpportunityMeeting(\''+escAttr(m.id)+'\',\''+eid+'\')" title="Delete" style="opacity:.5">'+icon('x',10)+'</button>';
      h+='</div>'})}
  else{h+='<div style="padding:12px;text-align:center;color:var(--t4);font-size:12px">No meetings yet</div>'}
  h+='</div>';

  /* Open Tasks */
  h+='<div style="margin-bottom:16px"><span class="ed-lbl" style="display:flex;justify-content:space-between;align-items:center">Open Tasks ('+st.openCount+')<button class="btn" style="font-size:10px;padding:3px 10px" onclick="TF.closeModal();TF.openAddModal({opportunity:\''+eid+'\',client:\''+escAttr(op.client||'')+'\',endClient:\''+escAttr(op.endClient||'')+'\'})">+ Add</button></span>';
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
  op.name=(gel('op-name').value||'').trim();if(!op.name){toast('Opportunity name required','warn');return}
  op.stage=gel('op-stage').value;
  op.client=gel('op-client').value||'';
  op.endClient=gel('op-endclient')?(gel('op-endclient').value||'').trim():'';
  op.contactName=(gel('op-contact').value||'').trim();
  op.contactEmail=(gel('op-email').value||'').trim();
  op.source=(gel('op-source').value||'').trim();
  op.strategyFee=parseFloat(gel('op-strategy').value)||0;
  op.setupFee=gel('op-setup')?parseFloat(gel('op-setup').value)||0:0;
  op.monthlyFee=gel('op-monthly')?parseFloat(gel('op-monthly').value)||0:0;
  op.monthlyAdSpend=gel('op-adspend')?parseFloat(gel('op-adspend').value)||0:0;
  op.probability=parseInt(gel('op-prob').value)||50;
  op.expectedClose=gel('op-close')&&gel('op-close').value?new Date(gel('op-close').value+'T00:00:00'):null;
  op.description=gel('op-desc')?(gel('op-desc').value||'').trim():'';
  op.notes=gel('op-notes').value||'';
  op.paymentPlan=gel('op-payplan')?gel('op-payplan').value||'':'';
  op.paymentMethod=gel('op-paymethod')?gel('op-paymethod').value||'bank_transfer':'bank_transfer';
  op.processingFeePct=gel('op-procfee')?parseFloat(gel('op-procfee').value)||0:0;
  op.receivingAccount=gel('op-recvacct')?gel('op-recvacct').value||'':'';
  op.expectedMonthlyDuration=gel('op-monthdur')?parseInt(gel('op-monthdur').value)||12:12;
  op.contactJobTitle=gel('op-jobtitle')?(gel('op-jobtitle').value||'').trim():'';
  op.prospectWebsite=gel('op-website')?(gel('op-website').value||'').trim():'';
  op.previousRelationship=gel('op-prevrel')?(gel('op-prevrel').value||'').trim():'';
  op.companyDescription=gel('op-compdesc')?(gel('op-compdesc').value||'').trim():'';
  op.prospectDescription=gel('op-prospdesc')?(gel('op-prospdesc').value||'').trim():'';
  op.videoStrategyBenefits=gel('op-vidbene')?(gel('op-vidbene').value||'').trim():'';
  await dbEditOpportunity(id,op);
  toast('Saved: '+op.name,'ok');closeModal();render()}

function openAddOpportunity(){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('gem',12)+' New Opportunity</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';

  /* Type selector */
  h+='<div class="op-type-selector" id="nop-type-grid">';
  [['retain_live','Retain Live','Paid training program for video production companies','var(--green)'],
   ['fc_partnership','F&C Partnership','Production partner brings opportunity','var(--blue)'],
   ['fc_direct','F&C Direct','Film&Content generates the lead directly','var(--purple50)']].forEach(function(t){
    h+='<div class="op-type-card" data-type="'+t[0]+'" onclick="TF.selectOpType(\''+t[0]+'\')">';
    h+='<div style="font-size:14px;font-weight:700;color:'+t[3]+';margin-bottom:6px">'+t[1]+'</div>';
    h+='<div style="font-size:11px;color:var(--t4)">'+t[2]+'</div></div>'});
  h+='</div>';

  /* Form (hidden until type selected) */
  h+='<div id="nop-form" style="display:none"></div>';

  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

/* Populate add form after type selection */
function selectOpType(type){
  /* Highlight selected card */
  var cards=document.querySelectorAll('.op-type-card');
  cards.forEach(function(c){c.classList.toggle('selected',c.getAttribute('data-type')===type)});

  var conf=oppTypeConf(type);
  var isRL=type==='retain_live';
  var cliOpts=S.clients.map(function(c){return'<option>'+esc(c)+'</option>'}).join('');

  var h='<input type="hidden" id="nop-type" value="'+type+'">';
  h+='<div style="padding:6px 0"><input type="text" class="edf" id="nop-name" placeholder="Opportunity name..." autofocus style="font-size:15px;font-weight:600;padding:11px 14px"></div>';

  h+='<div class="ed-grid ed-grid-3">';
  var allStages=conf.stages.slice();if(conf.awaitingStage)allStages.push(conf.awaitingStage);
  h+='<div class="ed-fld"><span class="ed-lbl">Stage</span><select class="edf" id="nop-stage">'+allStages.map(function(s){return'<option>'+s+'</option>'}).join('')+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">'+(isRL?'Prospect':'Client / Partner')+'</span><select class="edf" id="nop-client"><option value="">Select...</option>'+cliOpts+'</select></div>';
  if(!isRL){h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><input type="text" class="edf" id="nop-endclient" placeholder="End client..."></div>'}
  else{h+='<div class="ed-fld"><span class="ed-lbl">Company</span><input type="text" class="edf" id="nop-endclient" placeholder="Company name..."></div>'}
  h+='</div>';

  h+='<div class="ed-grid ed-grid-3">';
  h+='<div class="ed-fld"><span class="ed-lbl">Contact Name</span><input type="text" class="edf" id="nop-contact" placeholder="Key contact..."></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Contact Email</span><input type="email" class="edf" id="nop-email" placeholder="email@..."></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Source</span><input type="text" class="edf" id="nop-source" placeholder="Referral, Inbound..."></div>';
  h+='</div>';

  /* Fee fields — type-specific */
  if(isRL){
    h+='<div class="ed-grid ed-grid-3">';
    h+='<div class="ed-fld"><span class="ed-lbl">Program Fee</span><input type="number" class="edf" id="nop-strategy" value="5000" min="0" step="0.01"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Payment Plan</span><select class="edf" id="nop-payplan"><option value="one_time">One-time ($5,000)</option><option value="3_monthly">3x Monthly ($2,000)</option><option value="custom">Custom</option></select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Win Probability %</span><input type="number" class="edf" id="nop-prob" value="50" min="0" max="100"></div>';
    h+='</div>';
  }else{
    var isFCP=type==='fc_partnership';
    h+='<div class="ed-grid ed-grid-4">';
    h+='<div class="ed-fld"><span class="ed-lbl">Strategy Fee</span><input type="number" class="edf" id="nop-strategy" min="0" step="0.01" placeholder="0.00"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Setup Fee</span><input type="number" class="edf" id="nop-setup" value="'+(isFCP?'5000':'')+'" min="0" step="0.01" placeholder="0.00"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Monthly Fee</span><input type="number" class="edf" id="nop-monthly" value="'+(isFCP?'2000':'')+'" min="0" step="0.01" placeholder="0.00"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Monthly Ad Spend</span><input type="number" class="edf" id="nop-adspend" min="0" step="0.01" placeholder="0.00"></div>';
    h+='</div>';
    h+='<div class="ed-grid ed-grid-3">';
    h+='<div class="ed-fld"><span class="ed-lbl">Win Probability %</span><input type="number" class="edf" id="nop-prob" value="50" min="0" max="100"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Expected Close</span><input type="date" class="edf" id="nop-close"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Description</span><input type="text" class="edf" id="nop-desc" placeholder="Brief description..."></div>';
    h+='</div>';
    if(isFCP){
      h+='<div style="margin-top:8px;padding:12px;background:var(--bg2);border-radius:10px;border:1px solid var(--bd)">';
      h+='<span class="ed-lbl" style="margin-bottom:8px;display:block">Brief Details</span>';
      h+='<div class="ed-grid ed-grid-2">';
      h+='<div class="ed-fld"><span class="ed-lbl" style="font-size:9px">Job Title</span><input type="text" class="edf" id="nop-jobtitle" placeholder="Contact job title..."></div>';
      h+='<div class="ed-fld"><span class="ed-lbl" style="font-size:9px">Website</span><input type="url" class="edf" id="nop-website" placeholder="https://..."></div>';
      h+='</div>';
      h+='<div class="ed-fld" style="margin-bottom:6px"><span class="ed-lbl" style="font-size:9px">Previous Relationship</span><textarea class="edf edf-notes" id="nop-prevrel" rows="2" placeholder="Previous working relationship..."></textarea></div>';
      h+='<div class="ed-fld" style="margin-bottom:6px"><span class="ed-lbl" style="font-size:9px">Company Description</span><textarea class="edf edf-notes" id="nop-compdesc" rows="2" placeholder="Brief company description..."></textarea></div>';
      h+='<div class="ed-fld" style="margin-bottom:6px"><span class="ed-lbl" style="font-size:9px">Prospect Description</span><textarea class="edf edf-notes" id="nop-prospdesc" rows="2" placeholder="Brief prospect description..."></textarea></div>';
      h+='<div class="ed-fld"><span class="ed-lbl" style="font-size:9px">Video Strategy Benefits</span><textarea class="edf edf-notes" id="nop-vidbene" rows="2" placeholder="Benefits of a video strategy..."></textarea></div>';
      h+='</div>'}}

  if(isRL){
    h+='<div class="ed-grid ed-grid-2">';
    h+='<div class="ed-fld"><span class="ed-lbl">Expected Close</span><input type="date" class="edf" id="nop-close"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Description</span><input type="text" class="edf" id="nop-desc" placeholder="Brief description..."></div>';
    h+='</div>'}

  h+='<div class="ed-notes-wrap"><span class="ed-lbl">Notes</span>';
  h+='<textarea class="edf edf-notes" id="nop-notes" placeholder="Notes about this opportunity..." rows="2"></textarea></div>';
  h+='<div class="ed-actions"><button class="btn btn-p" onclick="TF.addOpportunity()">'+icon('gem',12)+' Create Opportunity</button></div>';

  gel('nop-form').innerHTML=h;
  gel('nop-form').style.display='';
  setTimeout(function(){var fi=gel('nop-name');if(fi)fi.focus()},100)}

async function addOpportunity(){
  var name=(gel('nop-name').value||'').trim();if(!name){toast('Enter opportunity name','warn');return}
  var type=gel('nop-type')?gel('nop-type').value||'fc_partnership':'fc_partnership';
  var isRL=type==='retain_live';
  var data={name:name,type:type,stage:gel('nop-stage').value||oppTypeConf(type).stages[0],
    client:gel('nop-client').value||'',endClient:gel('nop-endclient')?(gel('nop-endclient').value||'').trim():'',
    contactName:(gel('nop-contact').value||'').trim(),contactEmail:(gel('nop-email').value||'').trim(),
    source:(gel('nop-source').value||'').trim(),
    strategyFee:parseFloat(gel('nop-strategy').value)||0,
    setupFee:gel('nop-setup')?parseFloat(gel('nop-setup').value)||0:0,
    monthlyFee:gel('nop-monthly')?parseFloat(gel('nop-monthly').value)||0:0,
    monthlyAdSpend:gel('nop-adspend')?parseFloat(gel('nop-adspend').value)||0:0,
    probability:parseInt(gel('nop-prob').value)||50,
    expectedClose:gel('nop-close')&&gel('nop-close').value?gel('nop-close').value:null,
    description:gel('nop-desc')?(gel('nop-desc').value||'').trim():'',
    notes:gel('nop-notes').value||'',
    paymentPlan:gel('nop-payplan')?gel('nop-payplan').value||'':'',
    paymentMethod:'bank_transfer',processingFeePct:0,receivingAccount:'',
    expectedMonthlyDuration:isRL?1:12,
    contactJobTitle:gel('nop-jobtitle')?(gel('nop-jobtitle').value||'').trim():'',
    prospectWebsite:gel('nop-website')?(gel('nop-website').value||'').trim():'',
    previousRelationship:gel('nop-prevrel')?(gel('nop-prevrel').value||'').trim():'',
    companyDescription:gel('nop-compdesc')?(gel('nop-compdesc').value||'').trim():'',
    prospectDescription:gel('nop-prospdesc')?(gel('nop-prospdesc').value||'').trim():'',
    videoStrategyBenefits:gel('nop-vidbene')?(gel('nop-vidbene').value||'').trim():'',
    closeReason:''};
  var result=await dbAddOpportunity(data);
  if(!result){toast('Failed to create opportunity','warn');return}
  S.opportunities.unshift({id:result.id,name:data.name,description:data.description||'',stage:data.stage,type:data.type,
    client:data.client,endClient:data.endClient,contactName:data.contactName,contactEmail:data.contactEmail,
    strategyFee:data.strategyFee,setupFee:data.setupFee,monthlyFee:data.monthlyFee,monthlyAdSpend:data.monthlyAdSpend,
    probability:data.probability,expectedClose:data.expectedClose?new Date(data.expectedClose+'T00:00:00'):null,
    source:data.source,notes:data.notes,paymentPlan:data.paymentPlan,closedAt:null,convertedCampaignId:'',created:new Date(),
    paymentMethod:data.paymentMethod,processingFeePct:data.processingFeePct,
    receivingAccount:data.receivingAccount,expectedMonthlyDuration:data.expectedMonthlyDuration,
    contactJobTitle:data.contactJobTitle,prospectWebsite:data.prospectWebsite,
    previousRelationship:data.previousRelationship,companyDescription:data.companyDescription,
    prospectDescription:data.prospectDescription,videoStrategyBenefits:data.videoStrategyBenefits,
    closeReason:''});
  toast('Created: '+data.name,'ok');closeModal();
  // If created from a meeting AI suggestion, link opportunity to meeting
  if(S._pendingMtgSuggestion){
    var ps=S._pendingMtgSuggestion;S._pendingMtgSuggestion=null;
    setMeetingCrm(ps.meetingId,'opportunity_id',result.id);
    var mm=S.meetings.find(function(mt){return mt.id===ps.meetingId});
    if(mm&&mm.aiSuggestions&&mm.aiSuggestions[ps.index]){
      _markSuggestion(mm,ps.meetingId,ps.index,'accepted')}}
  render()}

function confirmDeleteOpportunity(){
  var id=gel('op-id').value;var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  gel('detail-body').innerHTML='<div style="padding:40px;text-align:center"><h2 style="margin-bottom:16px;color:var(--t1)">Delete Opportunity?</h2>'+
    '<p style="color:var(--t3);margin-bottom:24px">This will permanently delete <strong>'+esc(op.name)+'</strong>. Tasks linked to this opportunity will be unlinked.</p>'+
    '<button class="btn ab-del" onclick="TF.doDeleteOpportunity(\''+escAttr(id)+'\')">'+icon('trash',12)+' Delete</button>'+
    '<button class="btn" onclick="TF.openOpportunityDetail(\''+escAttr(id)+'\')" style="margin-left:8px">Cancel</button></div>'}

async function doDeleteOpportunity(id){
  await dbDeleteOpportunity(id);
  S.tasks.forEach(function(t){if(t.opportunity===id)t.opportunity=''});
  S.done.forEach(function(d){if(d.opportunity===id)d.opportunity=''});
  S.opportunities=S.opportunities.filter(function(o){return o.id!==id});
  S.oppMeetings=S.oppMeetings.filter(function(m){return m.opportunityId!==id});
  toast('Deleted opportunity','ok');closeModal();render()}

async function convertOpportunity(id){
  var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  if(!confirm('Convert "'+op.name+'" to a Campaign? This will:\n\n\u2022 Create a new Campaign with pre-filled data\n\u2022 Move all linked tasks to the new Campaign\n\u2022 Mark this opportunity as Closed Won'))return;

  var cpData={name:op.name,partner:op.client,endClient:op.endClient,
    status:'Setup',platform:'',strategyFee:op.strategyFee,setupFee:op.setupFee,
    monthlyFee:op.monthlyFee,monthlyAdSpend:op.monthlyAdSpend||0,campaignTerm:'',
    plannedLaunch:null,actualLaunch:null,renewalDate:null,
    goal:op.description,proposalLink:'',reportsLink:'',videoAssetsLink:'',
    transcriptsLink:'',awarenessLP:'',considerationLP:'',decisionLP:'',
    contractLink:'',notes:op.notes};
  var cpResult=await dbAddCampaign(cpData);
  if(!cpResult){toast('Failed to create campaign','warn');return}

  op.stage='Closed Won';op.closedAt=new Date();op.convertedCampaignId=cpResult.id;
  await dbEditOpportunity(id,op);

  var taskIds=S.tasks.filter(function(t){return t.opportunity===id}).map(function(t){return t.id});
  if(taskIds.length){
    await _sb.from('tasks').update({campaign:cpResult.id,opportunity:''}).in('id',taskIds);
    S.tasks.forEach(function(t){if(t.opportunity===id){t.campaign=cpResult.id;t.opportunity=''}})}

  var doneIds=S.done.filter(function(d){return d.opportunity===id}).map(function(d){return d.id});
  if(doneIds.length){
    await _sb.from('done').update({campaign:cpResult.id,opportunity:''}).in('id',doneIds);
    S.done.forEach(function(d){if(d.opportunity===id){d.campaign=cpResult.id;d.opportunity=''}})}

  S.campaigns.unshift({id:cpResult.id,name:cpData.name,partner:cpData.partner,endClient:cpData.endClient,
    status:'Setup',platform:'',strategyFee:cpData.strategyFee,setupFee:cpData.setupFee,
    monthlyFee:cpData.monthlyFee,monthlyAdSpend:cpData.monthlyAdSpend||0,campaignTerm:'',
    plannedLaunch:null,actualLaunch:null,renewalDate:null,goal:cpData.goal,
    proposalLink:'',reportsLink:'',videoAssetsLink:'',transcriptsLink:'',
    awarenessLP:'',considerationLP:'',decisionLP:'',contractLink:'',
    notes:cpData.notes,created:new Date()});

  toast('Converted to campaign: '+op.name,'ok');closeModal();render()}

function closeAsLost(id){
  var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  var h='<div style="padding:40px;text-align:center">';
  h+='<h2 style="margin-bottom:8px;color:var(--t1)">Close as Lost</h2>';
  h+='<p style="color:var(--t3);margin-bottom:20px">Why is <strong>'+esc(op.name)+'</strong> being closed?</p>';
  h+='<input type="hidden" id="cal-opid" value="'+escAttr(id)+'">';
  h+='<div style="max-width:300px;margin:0 auto 20px"><select class="edf" id="cal-reason" style="text-align:center">';
  ['Not Interested','Not a Good Fit','Budget / Timing','Went with Competitor','No Response','Other'].forEach(function(r){
    h+='<option>'+r+'</option>'});
  h+='</select></div>';
  h+='<div style="display:flex;gap:8px;justify-content:center">';
  h+='<button class="btn" style="background:rgba(255,51,88,0.1);color:var(--red);border-color:rgba(255,51,88,0.3)" onclick="TF.doCloseAsLost()">'+icon('x',12)+' Close as Lost</button>';
  h+='<button class="btn" onclick="TF.openOpportunityDetail(\''+escAttr(id)+'\')">Cancel</button>';
  h+='</div></div>';
  gel('detail-body').innerHTML=h}

async function doCloseAsLost(){
  var id=(gel('cal-opid')||{}).value;if(!id)return;
  var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  var reason=(gel('cal-reason')||{}).value||'';
  op.stage='Closed Lost';op.closedAt=new Date();op.closeReason=reason;
  await dbEditOpportunity(id,op);
  toast('Closed Lost: '+op.name,'warn');closeModal();render()}

/* ═══════════ OPPORTUNITY MEETINGS ═══════════ */
function openAddOpportunityMeeting(opId){
  var h='<div class="tf-modal-top"><h2>Add Meeting</h2><button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div style="padding:0 20px 20px">';
  h+='<input type="hidden" id="nom-opid" value="'+esc(opId)+'">';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Date</span><input type="date" class="edf" id="nom-date" value="'+new Date().toISOString().split('T')[0]+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Title</span><input type="text" class="edf" id="nom-title" placeholder="Meeting title..." autofocus></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Recording Link</span><input type="url" class="edf" id="nom-link" placeholder="https://..."></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Notes</span><input type="text" class="edf" id="nom-notes" placeholder="Meeting notes..."></div>';
  h+='</div>';
  h+='<div class="ed-actions" style="margin-top:16px"><button class="btn btn-p" onclick="TF.addOpportunityMeeting()">'+icon('check',14)+' Add Meeting</button></div>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  setTimeout(function(){var fi=gel('nom-title');if(fi)fi.focus()},100)}

async function addOpportunityMeeting(){
  var opId=(gel('nom-opid')||{}).value;if(!opId)return;
  var title=(gel('nom-title').value||'').trim();if(!title){toast('Meeting title required','warn');return}
  var data={opportunityId:opId,date:gel('nom-date').value?new Date(gel('nom-date').value+'T12:00:00').toISOString():new Date().toISOString(),
    title:title,recordingLink:(gel('nom-link').value||'').trim(),notes:(gel('nom-notes').value||'').trim()};
  var result=await dbAddOpportunityMeeting(data);
  if(!result)return;
  S.oppMeetings.unshift({id:result.id,opportunityId:opId,date:new Date(data.date),
    title:data.title,recordingLink:data.recordingLink,notes:data.notes,created:new Date()});
  toast('Meeting added','ok');closeModal();
  setTimeout(function(){openOpportunityDetail(opId)},100)}

async function deleteOpportunityMeeting(meetingId,opId){
  if(!confirm('Delete this meeting?'))return;
  await dbDeleteOpportunityMeeting(meetingId);
  S.oppMeetings=S.oppMeetings.filter(function(m){return m.id!==meetingId});
  toast('Meeting deleted','ok');
  openOpportunityDetail(opId)}

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
  h+='<button class="btn btn-p" onclick="TF.saveProject()">'+icon('save',12)+' Save Project</button>';
  h+='<span class="spacer"></span>';
  h+='<button class="btn btn-d" onclick="TF.confirmDeleteProject()">'+icon('trash',12)+' Delete</button>';
  h+='</div>';
  h+='<div id="pj-del-zone"></div>';
  h+='</div>';

  /* ── Right pane: phases + tasks + charts ── */
  h+='<div class="detail-split-right">';
  /* AI Assistant — build project live data */
  var _pjLive='\nPROJECT: '+proj.name+' ('+proj.status+')\nProgress: '+st.progress+'%\n';
  if(proj.notes)_pjLive+='Notes: '+proj.notes+'\n';
  if(st.openTasks.length){_pjLive+='\nOPEN TASKS ('+st.openTasks.length+'):\n';st.openTasks.forEach(function(t){_pjLive+='- '+t.item+(t.due?' due '+t.due.toLocaleDateString('en-US',{month:'short',day:'numeric'}):'')+(t.importance?' ['+t.importance+']':'')+(t.phase?' Phase: '+t.phase:'')+'\n'})}
  if(st.doneTasks.length){_pjLive+='\nCOMPLETED ('+Math.min(st.doneTasks.length,10)+'):\n';st.doneTasks.slice(0,10).forEach(function(d){_pjLive+='- '+d.item+(d.completed?' ('+d.completed.toLocaleDateString('en-US',{month:'short',day:'numeric'})+')':'')+'\n'})}
  if(st.phases.length){_pjLive+='\nPHASES ('+st.phases.length+'):\n';st.phases.forEach(function(ph){_pjLive+='- '+ph.name+' ('+ph.status+')'+(ph.tasks?' '+ph.tasks.length+' tasks':'')+'\n'})}

  h+=aiBox('proj-ai',{clientId:null,clientName:null,
    sourceTypes:['project','task','meeting'],
    entityContext:{type:'project',name:proj.name,data:{
      status:proj.status,progress:st.progress+'%',openTasks:st.openCount,
      doneTasks:st.doneCount,totalTime:fmtM(st.totalTime)},
      liveData:_pjLive},
    suggestedPrompts:['What is the status of '+proj.name+'?','What are the blockers for this project?',
      'Summarize recent progress on '+proj.name,'What should I work on next?'],
    placeholder:'Ask about '+proj.name+'...',collapsed:true});

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
    h+='<button class="ab ab-mini" onclick="TF.editPhaseInline(\''+phEid+'\')" title="Edit">'+icon('edit',11)+'</button>';
    h+='<button class="ab ab-del ab-mini" onclick="TF.deletePhase(\''+phEid+'\')" title="Delete">×</button>';
    h+='</div></div>';

    /* Phase tasks */
    h+='<div class="proj-phase-tasks" id="phase-tasks-'+esc(ph.id)+'">';
    /* Progress bar */
    if(ps.openCount+ps.doneCount>0){h+='<div class="proj-progress" style="margin:6px 0 8px"><div class="proj-progress-fill" style="width:'+ps.progress+'%;background:'+proj.color+'"></div></div>'}
    ps.doneTasks.forEach(function(d){
      h+='<div class="proj-phase-task" style="opacity:0.5"><span style="color:var(--green)">'+CK_XS+'</span><span class="proj-phase-task-name" style="text-decoration:line-through;color:var(--t4)">'+esc(d.item)+'</span><span style="font-size:10px;color:var(--t4);font-family:var(--fd)">'+fmtM(d.duration)+'</span></div>'});
    var orderedTasks=applyProjTaskOrder(ps.openTasks,ph.id);
    orderedTasks.forEach(function(t){var teid=escAttr(t.id);
      h+='<div class="proj-phase-task" draggable="true" data-task-id="'+esc(t.id)+'" data-phase-id="'+esc(ph.id)+'" ondragstart="TF.projDragStart(event,\''+teid+'\',\''+phEid+'\')" ondragover="TF.projDragOver(event)" ondrop="TF.projDragDrop(event,\''+teid+'\',\''+phEid+'\')">';
      h+='<span class="proj-drag-handle" style="cursor:grab;color:var(--t4);font-size:10px;flex-shrink:0">⠿</span>';
      h+='<span class="bg '+impCls(t.importance)+'" style="font-size:9px;padding:1px 6px">'+esc((t.importance||'I')[0])+'</span>';
      h+='<span class="proj-phase-task-name" onclick="TF.openDetail(\''+teid+'\')">'+esc(t.item)+'</span>';
      if(t.due)h+='<span class="bg-du'+(t.due<today()?' od':'')+'\" style="font-size:9px">'+fmtDShort(t.due)+'</span>';
      h+='<button class="ab ab-dn ab-mini" onclick="TF.done(\''+teid+'\')" title="Complete">'+CK_XS+'</button></div>'});
    h+='<button class="btn" style="margin-top:6px;padding:4px 10px;font-size:10px;width:100%;opacity:0.6" onclick="TF.openAddModal({project:\''+eid+'\',phase:\''+phEid+'\'})">+ Add Task</button>';
    h+='</div></div>'});

  /* Backlog: tasks with project but no phase */
  var backlog=st.openTasks.filter(function(t){return!t.phase});
  var backlogDone=st.doneTasks.filter(function(d){return!d.phase});
  if(backlog.length||backlogDone.length){
    h+='<div class="proj-backlog"><span class="proj-backlog-label">Backlog (no phase)</span>';
    backlogDone.forEach(function(d){
      h+='<div class="proj-phase-task" style="opacity:0.5"><span style="color:var(--green)">'+CK_XS+'</span><span style="text-decoration:line-through;color:var(--t4);font-size:12px">'+esc(d.item)+'</span></div>'});
    var orderedBacklog=applyProjTaskOrder(backlog,'_backlog');
    orderedBacklog.forEach(function(t){var teid=escAttr(t.id);
      h+='<div class="proj-phase-task" draggable="true" data-task-id="'+esc(t.id)+'" data-phase-id="_backlog" ondragstart="TF.projDragStart(event,\''+teid+'\',\'_backlog\')" ondragover="TF.projDragOver(event)" ondrop="TF.projDragDrop(event,\''+teid+'\',\'_backlog\')">';
      h+='<span class="proj-drag-handle" style="cursor:grab;color:var(--t4);font-size:10px;flex-shrink:0">⠿</span>';
      h+='<span class="bg '+impCls(t.importance)+'" style="font-size:9px;padding:1px 6px">'+esc((t.importance||'I')[0])+'</span>';
      h+='<span class="proj-phase-task-name" onclick="TF.openDetail(\''+teid+'\')">'+esc(t.item)+'</span>';
      h+='<button class="ab ab-dn ab-mini" onclick="TF.done(\''+teid+'\')" title="Complete">'+CK_XS+'</button></div>'});
    h+='<button class="btn" style="margin-top:6px;padding:4px 10px;font-size:10px;width:100%;opacity:0.6" onclick="TF.openAddModal({project:\''+eid+'\'})">+ Add Task</button>';
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
  var name=(gel('pj-name')||{}).value;if(!name||!name.trim()){toast('Project name required','warn');return}
  proj.name=name.trim();proj.description=(gel('pj-desc')||{}).value||'';
  proj.status=(gel('pj-status')||{}).value||'Planning';proj.color=(gel('pj-color')||{}).value||'#ff0099';
  proj.startDate=gel('pj-start').value?new Date(gel('pj-start').value+'T00:00:00'):null;
  proj.targetDate=gel('pj-target').value?new Date(gel('pj-target').value+'T00:00:00'):null;
  proj.notes=(gel('pj-notes')||{}).value||'';
  await dbEditProject(id,{name:proj.name,description:proj.description,status:proj.status,color:proj.color,
    startDate:proj.startDate?proj.startDate.toISOString().slice(0,10):null,
    targetDate:proj.targetDate?proj.targetDate.toISOString().slice(0,10):null,notes:proj.notes});
  toast(icon('save',12)+' Saved: '+proj.name,'ok');closeModal();render()}

function openAddProject(){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('folder',12)+' New Project</span>';
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
  h+='<button class="btn btn-p" onclick="TF.addProject()" style="margin-top:16px">'+icon('folder',12)+' Create Project</button>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  setTimeout(function(){var fi=gel('pj-add-name');if(fi)fi.focus()},100)}

async function addProject(){
  var name=(gel('pj-add-name')||{}).value;if(!name||!name.trim()){toast('Enter a project name','warn');return}
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
  toast('Created: '+data.name,'ok');closeModal();nav('projects')}

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
  toast(icon('trash',12)+' Deleted: '+proj.name,'warn');closeModal();render()}

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
  var name=(gel('np-name')||{}).value;if(!name||!name.trim()){toast('Enter a phase name','warn');return}
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
  var name=(gel('ep-name')||{}).value;if(!name||!name.trim()){toast('Phase name required','warn');return}
  phase.name=name.trim();phase.status=(gel('ep-status')||{}).value||'Not Started';
  phase.startDate=gel('ep-start').value?new Date(gel('ep-start').value+'T00:00:00'):null;
  phase.endDate=gel('ep-end').value?new Date(gel('ep-end').value+'T00:00:00'):null;
  await dbEditPhase(phaseId,{name:phase.name,description:phase.description,sortOrder:phase.sortOrder,
    startDate:phase.startDate?phase.startDate.toISOString().slice(0,10):null,
    endDate:phase.endDate?phase.endDate.toISOString().slice(0,10):null,status:phase.status});
  toast(icon('save',12)+' Phase saved','ok');openProjectDetail(phase.projectId)}

async function deletePhase(phaseId){
  var phase=S.phases.find(function(p){return p.id===phaseId});if(!phase)return;
  if(!confirm('Delete phase "'+phase.name+'"?'))return;
  /* Clear phase ref from tasks but keep project ref */
  S.tasks.forEach(function(t){if(t.phase===phaseId){t.phase='';dbEditTask(t.id,t)}});
  S.done.forEach(function(d){if(d.phase===phaseId){d.phase=''}});
  await dbDeletePhase(phaseId);
  S.phases=S.phases.filter(function(p){return p.id!==phaseId});
  toast(icon('trash',12)+' Phase deleted','warn');openProjectDetail(phase.projectId)}

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
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('mic',12)+' Add Campaign Meeting</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="frm" style="margin-top:8px"><div class="frm-grid">';
  h+='<div class="fld full"><label>Campaign *</label><select id="cmtg-cp">';
  S.campaigns.forEach(function(c){h+='<option value="'+esc(c.id)+'"'+(c.id===campaignId?' selected':'')+'>'+esc(c.name)+' — '+esc(c.partner)+' — '+esc(c.endClient)+'</option>'});
  h+='</select></div>';
  h+='<div class="fld"><label>Date</label><input type="date" id="cmtg-date" value="'+new Date().toISOString().slice(0,10)+'"></div>';
  h+='<div class="fld"><label>Title *</label><input type="text" id="cmtg-title" placeholder="e.g. Month 2 Review"></div>';
  h+='<div class="fld full"><label>Recording Link</label><input type="url" id="cmtg-link" placeholder="https://..."></div>';
  h+='<div class="fld full"><label>Notes</label><input type="text" id="cmtg-notes" placeholder="Optional notes..."></div>';
  h+='</div><button class="btn btn-p" onclick="TF.addCampaignMeeting()" style="margin-top:12px">'+icon('mic',12)+' Add Meeting</button></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function addCampaignMeeting(){
  var cpId=gel('cmtg-cp').value;if(!cpId){toast('Select a campaign','warn');return}
  var title=(gel('cmtg-title')||{}).value;if(!title||!title.trim()){toast('Enter a title','warn');return}
  var cp=S.campaigns.find(function(c){return c.id===cpId});if(!cp)return;
  var mtg={campaignId:cp.id,date:gel('cmtg-date').value||new Date().toISOString().slice(0,10),title:title.trim(),
    recordingLink:(gel('cmtg-link')||{}).value||'',notes:(gel('cmtg-notes')||{}).value||''};
  var result=await dbAddCampaignMeeting(mtg);
  if(result){mtg.id=result.id;mtg.campaignName=cp.name;mtg.partner=cp.partner;mtg.endClient=cp.endClient;
    mtg.date=mtg.date?new Date(mtg.date):new Date();S.campaignMeetings.push(mtg)}
  toast(icon('mic',12)+' Meeting added: '+mtg.title,'ok');closeModal();
  if(S.campaignDetailId===cpId){render();return}
  render()}

/* ═══════════ FINANCE MODALS ═══════════ */

/* ─── Payment Detail Modal ─── */
function openFinancePaymentDetail(id){
  var p=S.financePayments.find(function(fp){return fp.id===id});
  if(!p)return;
  var clientName=clientNameById(p.clientId);

  /* Build client options */
  var clOpts='<option value="">— Unmatched —</option>';
  S.clientRecords.forEach(function(c){
    clOpts+='<option value="'+esc(c.id)+'"'+(p.clientId===c.id?' selected':'')+'>'+esc(c.name)+'</option>'});

  /* Build category options */
  var catOpts='<option value="">— None —</option>';
  PAY_CATS.forEach(function(c){
    catOpts+='<option'+(p.category===c?' selected':'')+'>'+esc(c)+'</option>'});

  /* Build end client + campaign options (filtered by current client) */
  var ecOpts=buildEndClientOptions(p.endClient,clientName);
  var cpOpts=buildCampaignOptions(p.campaignId,clientName,p.endClient);

  var srcLbl=srcLabelFull(p);
  var srcClass=srcClsFull(p);
  var isFcCat=p.category&&p.category.indexOf('F&C')===0;

  var h='<div class="detail-full-header">';
  h+='<div class="tf-modal-top">';
  h+='<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">';
  h+='<span class="'+srcClass+'" style="flex-shrink:0">'+esc(srcLbl)+'</span>';
  h+='<span style="font-size:20px;font-weight:700;color:var(--green)">'+fmtUSD(p.amount)+'</span>';
  h+='</div>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<input type="hidden" id="fp-id" value="'+esc(p.id)+'">';
  h+='</div>';

  h+='<div class="detail-split">';

  /* Left pane: edit fields */
  h+='<div class="detail-split-left">';

  var isSplit=p.status==='split';

  /* Section 1: Payment Details */
  h+='<div style="margin-bottom:4px"><span class="ed-lbl" style="font-size:10px;color:var(--t3)">Payment Details</span></div>';
  h+='<div class="ed-grid">';
  h+='<div class="ed-fld"><span class="ed-lbl">Date</span><input type="date" class="edf" id="fp-date" value="'+(p.date?p.date.toISOString().slice(0,10):'')+'"></div>';
  if(!isSplit){h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="fp-category" onchange="TF.fpCatChange()">'+catOpts+'</select></div>'}
  h+='<div class="ed-fld"><span class="ed-lbl">Amount</span><div class="edf" style="color:var(--green);font-weight:600">'+fmtUSD(p.amount)+'</div></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Fee</span><div class="edf" style="color:var(--t4)">'+fmtUSD(p.fee)+'</div></div>';
  if(p.type==='invoice'){h+='<div class="ed-fld"><span class="ed-lbl">Expected Payment</span><input type="date" class="edf" id="fp-expected-date" value="'+(p.expectedPaymentDate||'')+'"></div>'}
  h+='</div>';

  /* Section 2: Client — hidden for Products */
  var isProducts=p.category==='Products';
  h+='<div id="fp-client-section" style="'+(isProducts&&!isSplit?'display:none':'')+'">';
  h+='<div style="margin:12px 0 4px"><span class="ed-lbl" style="font-size:10px;color:var(--t3)">Client</span></div>';
  h+='<div class="ed-grid">';
  h+='<div class="ed-fld"><span class="ed-lbl">Select Client</span><select class="edf" id="fp-client" onchange="TF.fpClientChange()">'+clOpts+'</select></div>';
  h+='<div class="ed-fld" id="fp-newclient-row"'+(p.clientId?' style="display:none"':'')+'><span class="ed-lbl">Or Create New</span><input type="text" class="edf" id="fp-newclient" placeholder="New client name..."></div>';
  h+='<div class="ed-fld" id="fp-newstatus-row"'+(p.clientId?' style="display:none"':'')+'><span class="ed-lbl">Status</span><select class="edf" id="fp-newstatus"><option value="active">Active</option><option value="lapsed">Lapsed</option></select></div>';
  h+='</div></div>';

  if(!isSplit){
  /* Section 3: F&C Details (End Client + Campaign) — hidden in split mode */
  h+='<div id="fp-fc-section" style="'+(isFcCat?'':'display:none')+'">';
  h+='<div style="margin:12px 0 4px"><span class="ed-lbl" style="font-size:10px;color:var(--t3)">F&C Details</span></div>';
  h+='<div class="ed-grid">';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="fp-endclient" onchange="TF.fpEndClientChange()">'+ecOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="fp-campaign" onchange="TF.fpCampaignChange()">'+cpOpts+'</select></div>';
  h+='<div class="ed-fld" id="fp-newcampaign-row"'+(p.campaignId?' style="display:none"':'')+'><span class="ed-lbl">Or Create New Campaign</span><input type="text" class="edf" id="fp-newcampaign" placeholder="New campaign name..."></div>';
  h+='<div class="ed-fld" id="fp-newcpstatus-row"'+(p.campaignId?' style="display:none"':'')+'><span class="ed-lbl">Campaign Status</span><select class="edf" id="fp-newcpstatus"><option>Setup</option><option>Active</option><option>Paused</option><option>Completed</option><option>Archived</option></select></div>';
  h+='</div></div>';
  }

  /* Section 4: Notes */
  h+='<div style="margin:12px 0 4px"><span class="ed-lbl" style="font-size:10px;color:var(--t3)">Notes</span></div>';
  h+='<div class="ed-grid">';
  h+='<div class="ed-fld ed-fld-full"><textarea class="edf" id="fp-notes" rows="3" placeholder="Notes...">'+esc(p.notes)+'</textarea></div>';
  h+='</div>';

  /* Section 5: Split Payment Editor (only when status==='split') */
  var splits=isSplit?getSplitsForPayment(p.id):[];
  if(isSplit){
    h+='<div style="margin:12px 0 4px"><span class="ed-lbl" style="font-size:10px;color:var(--t3)">Payment Splits <span style="font-weight:400;color:var(--t4)">(set category, end client &amp; campaign per split)</span></span></div>';
    h+='<div id="fp-splits-editor">';
    h+=renderSplitEditorRows(splits,p);
    h+='</div>';
  }

  h+='<div class="ed-actions" style="margin-top:16px">';
  if(p.status==='split'){
    h+='<button class="btn btn-p" onclick="TF.saveSplits()" style="gap:6px">'+icon('save',14)+' Save Splits</button>';
    h+='<button class="btn" onclick="TF.unsplitPayment()" style="color:var(--amber);border-color:rgba(255,176,48,.3)">'+icon('refresh',14)+' Unsplit</button>';
  }else{
    h+='<button class="btn btn-p" onclick="TF.saveFinancePayment()" style="gap:6px">'+icon('save',14)+' Save</button>';
    h+='<button class="btn" onclick="TF.openSplitPayment()" style="color:var(--blue);border-color:rgba(77,166,255,.3)">'+icon('activity',14)+' Split Payment</button>';
  }
  h+='<button class="btn" onclick="TF.excludeFinancePayment()" style="color:var(--t4)">Exclude</button>';
  h+='<button class="btn btn-d" onclick="TF.confirmDeleteFinancePayment()">'+icon('trash',14)+' Delete</button>';
  h+='</div>';
  h+='</div>';

  /* Right pane: payer info & related payments */
  h+='<div class="detail-split-right">';
  h+='<div class="ed-section"><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Payer Info</div>';
  if(p.payerName)h+='<div class="ed-fld"><span class="ed-lbl">Name</span><div class="edf">'+esc(p.payerName)+'</div></div>';
  if(p.payerEmail)h+='<div class="ed-fld"><span class="ed-lbl">Email</span><div class="edf">'+esc(p.payerEmail)+'</div></div>';
  if(p.sourceId)h+='<div class="ed-fld"><span class="ed-lbl">Source ID</span><div class="edf" style="font-size:11px;word-break:break-all">'+esc(p.sourceId)+'</div></div>';
  if(p.description)h+='<div class="ed-fld ed-fld-full"><span class="ed-lbl">Description</span><div class="edf" style="font-size:12px">'+esc(p.description)+'</div></div>';
  h+='</div>';

  /* Expense reconciliation section */
  if(p.direction==='outflow'&&p.type!=='transfer'){
    h+='<div class="ed-section" style="margin-top:12px"><div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Expense Reconciliation</div>';
    if(p.scheduledItemId){
      var li=S.scheduledItems.find(function(si){return si.id===p.scheduledItemId});
      h+='<div class="fin-recon-linked" style="padding:10px;margin-bottom:8px">';
      h+='<div style="display:flex;justify-content:space-between;align-items:center">';
      h+='<span style="color:var(--green);font-weight:600;font-size:13px">'+icon('link',12)+' '+(li?esc(li.name):'Linked')+'</span>';
      h+='<button class="btn" onclick="TF.unlinkExpenseFromScheduled(\''+esc(p.id)+'\')" style="font-size:10px;padding:3px 10px">Unlink</button>';
      h+='</div></div>';
    }else{
      h+='<button class="btn" onclick="TF.openExpenseReconcileModal(\''+esc(p.id)+'\')" style="width:100%;padding:8px;font-size:12px;color:var(--amber);border-color:rgba(255,152,0,.3)">'+icon('link',12)+' Reconcile to Recurring Item</button>';
    }
    h+='</div>';}

  /* Other payments from same payer — with checkboxes */
  /* Exclude likely cross-source duplicates (same date ±1 day, same amount, different source) */
  var payerKey=p.payerEmail||p.payerName;
  if(payerKey){
    var related=S.financePayments.filter(function(fp){
      if(fp.id===p.id)return false;
      if(!(p.payerEmail&&fp.payerEmail===p.payerEmail)&&!(p.payerName&&fp.payerName===p.payerName))return false;
      /* Filter out cross-source duplicates (same amount, close date, different source) */
      if(fp.source!==p.source&&Math.abs(fp.amount-p.amount)<0.02){
        if(!fp.date||!p.date)return false;
        var dayDiff=Math.abs((fp.date instanceof Date?fp.date:new Date(fp.date))-(p.date instanceof Date?p.date:new Date(p.date)));
        if(dayDiff<=86400000*2)return false} /* Within 2 days = likely duplicate */
      return true});
    if(related.length){
      var unmatchedRelated=related.filter(function(rp){return rp.status==='unmatched'});
      h+='<div class="ed-section" style="margin-top:16px">';
      h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">';
      h+='<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.5px">Other Payments from This Payer ('+related.length+')</div>';
      if(unmatchedRelated.length>1)h+='<button class="btn" onclick="TF.fpSelectAll()" style="font-size:10px;padding:3px 8px">Select All Unmatched</button>';
      h+='</div>';
      h+='<div style="font-size:11px;color:var(--t4);margin-bottom:8px">Tick payments below to apply the same settings when you Save</div>';
      h+='<div class="fin-related-list">';
      related.sort(function(a,b){return(b.date||0)-(a.date||0)});
      related.forEach(function(rp,idx){
        if(idx>=50)return;
        var cName=clientNameById(rp.clientId);
        var isUnmatched=rp.status==='unmatched';
        h+='<label class="fin-related-item'+(isUnmatched?' fin-related-unmatched':'')+'" style="cursor:pointer">';
        h+='<input type="checkbox" class="fp-batch-cb" value="'+esc(rp.id)+'"'+(isUnmatched?'':' disabled')+' style="accent-color:var(--green);flex-shrink:0">';
        h+='<span class="fin-related-date">'+(rp.date?fmtDShort(rp.date):'—')+'</span>';
        h+='<span class="fin-related-amt" style="color:var(--green)">'+fmtUSD(rp.amount)+'</span>';
        h+='<span style="flex:1;font-size:11px;color:var(--t2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(rp.description||'—')+'</span>';
        if(rp.category)h+='<span class="fin-cat" style="font-size:9px">'+esc(rp.category)+'</span>';
        if(cName)h+='<span style="font-size:10px;color:var(--t3)">'+esc(cName)+'</span>';
        else h+='<span class="fin-status fin-status-unmatched" style="font-size:9px">Unmatched</span>';
        h+='</label>'});
      if(related.length>50)h+='<div style="color:var(--t4);font-size:11px;padding:4px 0">+ '+(related.length-50)+' more</div>';
      h+='</div></div>'}}
  h+='</div>';
  h+='</div>';

  gel('detail-body').innerHTML=h;gel('detail-modal').classList.add('on','full-detail')}

function fpCatChange(){
  var cat=(gel('fp-category')||{}).value||'';
  var isFc=cat.indexOf('F&C')===0;
  var fcSec=gel('fp-fc-section');if(fcSec)fcSec.style.display=isFc?'':'none';
  /* Hide client section for Products */
  var clSec=gel('fp-client-section');if(clSec)clSec.style.display=cat==='Products'?'none':''}

function fpClientChange(){
  var clientId=(gel('fp-client')||{}).value||'';
  var clientName=clientNameById(clientId);
  /* Show/hide create-new fields */
  var ncRow=gel('fp-newclient-row');if(ncRow)ncRow.style.display=clientId?'none':'';
  var nsRow=gel('fp-newstatus-row');if(nsRow)nsRow.style.display=clientId?'none':'';
  /* Cascade end client (non-split mode) */
  var ecSel=gel('fp-endclient');
  if(ecSel&&ecSel.tagName==='SELECT'){ecSel.innerHTML=buildEndClientOptions('',clientName);fpEndClientChange()}
  /* In split mode, refresh split editor dropdowns for the new client */
  var pid=(gel('fp-id')||{}).value;if(!pid)return;
  var p=S.financePayments.find(function(fp){return fp.id===pid});
  if(p&&p.status==='split'){
    _readSplitForm();
    var editor=gel('fp-splits-editor');
    if(editor)editor.innerHTML=renderSplitEditorRows(_splitRows,p)}}

function fpEndClientChange(){
  var clientId=(gel('fp-client')||{}).value||'';
  var clientName=clientNameById(clientId);
  var ec=(gel('fp-endclient')||{}).value||'';
  if(ec==='__addnew__'){ecAddNew('fp-endclient');return}
  var cpSel=gel('fp-campaign');
  if(cpSel){cpSel.innerHTML=buildCampaignOptions('',clientName,ec);fpCampaignChange()}}

function fpCampaignChange(){
  var cpId=(gel('fp-campaign')||{}).value||'';
  var ncpRow=gel('fp-newcampaign-row');if(ncpRow)ncpRow.style.display=cpId?'none':'';
  var ncsRow=gel('fp-newcpstatus-row');if(ncsRow)ncsRow.style.display=cpId?'none':''}

function fpSelectAll(){
  var cbs=document.querySelectorAll('.fp-batch-cb');
  cbs.forEach(function(cb){if(!cb.disabled)cb.checked=true})}

async function saveFinancePayment(){
  var id=(gel('fp-id')||{}).value;if(!id)return;
  var p=S.financePayments.find(function(fp){return fp.id===id});if(!p)return;
  var clientId=(gel('fp-client')||{}).value||null;
  var newName=(gel('fp-newclient')||{}).value||'';

  /* Create new client if specified */
  if(newName.trim()&&!clientId){
    var newClStatus=(gel('fp-newstatus')||{}).value||'active';
    var ok=await dbAddClient(newName.trim(),newClStatus);
    if(!ok)return;
    await loadClientRecords();
    var newCl=S.clientRecords.find(function(c){return c.name===newName.trim()});
    if(newCl)clientId=newCl.id;
    else{toast('Could not find created client','warn');return}}

  var cat=(gel('fp-category')||{}).value||'';
  var isFc=cat.indexOf('F&C')===0;

  /* Products don't need a client */
  if(cat==='Products'){clientId=null}

  /* Resolve end client value (dropdown or typed-in text input) */
  var ecEl=gel('fp-endclient');
  var endClient='';
  if(isFc&&ecEl){
    endClient=ecEl.value||'';
    if(endClient==='__addnew__')endClient=''}

  /* Resolve campaign — either selected or create new */
  var campaignId=(gel('fp-campaign')||{}).value||null;
  var newCpName=(gel('fp-newcampaign')||{}).value||'';

  if(isFc&&newCpName.trim()&&!campaignId){
    var clientForCp=clientNameById(clientId);
    var cpStatus=(gel('fp-newcpstatus')||{}).value||'Setup';
    var cpData={name:newCpName.trim(),partner:clientForCp,endClient:endClient,
      status:cpStatus,platform:'',strategyFee:0,setupFee:0,monthlyFee:0,
      monthlyAdSpend:0,campaignTerm:'',plannedLaunch:null,actualLaunch:null,
      renewalDate:null,goal:'',proposalLink:'',reportsLink:'',videoAssetsLink:'',
      transcriptsLink:'',awarenessLP:'',considerationLP:'',decisionLP:'',
      contractLink:'',notes:''};
    var cpResult=await dbAddCampaign(cpData);
    if(cpResult){
      cpData.id=cpResult.id;cpData.created=new Date();
      S.campaigns.push(cpData);
      campaignId=cpResult.id;
      toast('Campaign created: '+newCpName.trim(),'ok')}
    else{return}}

  var newStatus=clientId?'matched':(cat==='Products'?'matched':p.status);
  var expDateEl=gel('fp-expected-date');
  var data={date:(gel('fp-date')||{}).value||null,category:cat,
    clientId:clientId,campaignId:campaignId,
    endClient:endClient,notes:(gel('fp-notes')||{}).value||'',
    status:newStatus};
  if(expDateEl)data.expectedPaymentDate=expDateEl.value||null;
  var ok2=await dbEditFinancePayment(id,data);
  if(!ok2)return;
  p.date=data.date?new Date(data.date+'T00:00:00'):null;p.category=cat;
  p.clientId=clientId;p.campaignId=campaignId;p.endClient=endClient;
  p.notes=data.notes;p.status=newStatus;
  if('expectedPaymentDate' in data)p.expectedPaymentDate=data.expectedPaymentDate;

  /* Batch update checked related payments */
  var cbs=document.querySelectorAll('.fp-batch-cb:checked');
  var batchCount=0;
  for(var i=0;i<cbs.length;i++){
    var bId=cbs[i].value;
    var bp=S.financePayments.find(function(fp){return fp.id===bId});
    if(!bp)continue;
    var bData={category:cat,clientId:clientId,campaignId:campaignId,
      endClient:endClient,status:clientId?'matched':(cat==='Products'?'matched':'unmatched')};
    var bok=await dbEditFinancePayment(bId,bData);
    if(bok){
      bp.category=cat;bp.clientId=clientId;bp.campaignId=campaignId;
      bp.endClient=endClient;bp.status=bData.status;batchCount++}}

  var msg=batchCount>0?'Payment saved + '+batchCount+' more updated':'Payment saved';
  toast(msg,'ok');closeModal();render()}

async function finBulkApply(){
  var ids=Object.keys(S.finBulkSelected);if(!ids.length){toast('No payments selected','warn');return}
  var cat=(gel('fin-bulk-cat')||{}).value||'';
  var clientId=(gel('fin-bulk-client')||{}).value||null;
  if(!cat&&!clientId){toast('Select a category or client to apply','warn');return}

  var count=0;
  for(var i=0;i<ids.length;i++){
    var p=S.financePayments.find(function(fp){return fp.id===ids[i]});
    if(!p)continue;
    var data={};
    if(cat)data.category=cat;
    if(clientId)data.clientId=clientId;
    /* Determine status */
    var newClientId=clientId||p.clientId||null;
    var newCat=cat||p.category||'';
    data.status=newClientId?'matched':(newCat==='Products'?'matched':p.status);
    /* Keep existing values for fields we're not changing */
    data.date=p.date?p.date.toISOString().slice(0,10):null;
    data.notes=p.notes||'';
    data.endClient=p.endClient||'';
    data.campaignId=p.campaignId||null;
    if(!cat)data.category=p.category||'';
    if(!clientId)data.clientId=p.clientId||null;

    var ok=await dbEditFinancePayment(ids[i],data);
    if(ok){
      if(cat)p.category=cat;
      if(clientId)p.clientId=clientId;
      p.status=data.status;
      count++}
  }
  S.finBulkSelected={};S.finBulkMode=false;
  toast(count+' payment'+(count!==1?'s':'')+' updated','ok');render()}

async function excludeFinancePayment(){
  var id=(gel('fp-id')||{}).value;if(!id)return;
  var ok=await dbEditFinancePayment(id,{status:'excluded',date:null,category:'',clientId:null,campaignId:null,endClient:'',notes:''});
  if(ok){
    var p=S.financePayments.find(function(fp){return fp.id===id});
    if(p)p.status='excluded';
    toast('Payment excluded','info');closeModal();render()}}

function confirmDeleteFinancePayment(){
  var id=(gel('fp-id')||{}).value;if(!id)return;
  var h='<div class="tf-modal-top"><h2>Delete Payment?</h2><button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<p style="color:var(--t3);margin:16px 0">This will permanently delete this payment record.</p>';
  h+='<div class="ed-actions"><button class="btn btn-d" onclick="TF.doDeleteFinancePayment(\''+escAttr(id)+'\')">'+icon('trash',14)+' Delete</button><button class="btn" onclick="TF.closeModal()">Cancel</button></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function doDeleteFinancePayment(id){
  var ok=await dbDeleteFinancePayment(id);
  if(ok){S.financePayments=S.financePayments.filter(function(fp){return fp.id!==id});
    toast('Payment deleted','ok');closeModal();render()}}

/* ─── Associate Modal ─── */
function openAssociateModal(paymentId){
  var p=S.financePayments.find(function(fp){return fp.id===paymentId});
  if(!p)return;
  var payerKey=p.payerEmail||p.payerName;
  /* Count other unmatched from same payer */
  var sameCount=S.financePayments.filter(function(fp){
    return fp.status==='unmatched'&&fp.id!==p.id&&
      ((p.payerEmail&&fp.payerEmail===p.payerEmail)||(p.payerName&&fp.payerName===p.payerName))}).length;

  var clOpts='<option value="">— Select Client —</option>';
  S.clientRecords.forEach(function(c){
    clOpts+='<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>'});

  var catOpts='<option value="">— All keep current —</option>';
  PAY_CATS.forEach(function(c){catOpts+='<option>'+esc(c)+'</option>'});

  var h='<div class="tf-modal-top"><h2>Associate Payer to Client</h2><button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div style="padding:0 20px 20px">';
  h+='<div class="fin-assoc-payer">';
  if(p.payerName)h+='<div style="font-weight:600;font-size:15px">'+esc(p.payerName)+'</div>';
  if(p.payerEmail)h+='<div style="color:var(--t3);font-size:13px">'+esc(p.payerEmail)+'</div>';
  h+='<div style="color:var(--green);font-weight:600;margin-top:4px">'+fmtUSD(p.amount)+' — '+(p.date?fmtDShort(p.date):'')+'</div>';
  if(sameCount>0)h+='<div style="color:var(--amber);font-size:12px;margin-top:6px">+ '+sameCount+' other unmatched payment'+(sameCount>1?'s':'')+' from this payer will also be associated</div>';
  h+='</div>';
  h+='<input type="hidden" id="assoc-pid" value="'+esc(p.id)+'">';
  h+='<input type="hidden" id="assoc-email" value="'+esc(p.payerEmail)+'">';
  h+='<input type="hidden" id="assoc-name" value="'+esc(p.payerName)+'">';

  h+='<div class="ed-grid" style="margin-top:16px">';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="assoc-client">'+clOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Or Create New</span><input type="text" class="edf" id="assoc-newclient" placeholder="New client name..."></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">New Client Status</span><select class="edf" id="assoc-newstatus"><option value="active">Active</option><option value="lapsed">Lapsed</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category (optional)</span><select class="edf" id="assoc-cat">'+catOpts+'</select></div>';
  h+='</div>';

  h+='<div class="ed-actions" style="margin-top:20px">';
  h+='<button class="btn btn-p" onclick="TF.associatePayer()" style="gap:6px">'+icon('check',14)+' Associate'+(sameCount>0?' All ('+(sameCount+1)+')':'')+'</button>';
  h+='<button class="btn" onclick="TF.closeModal()">Cancel</button>';
  h+='</div></div>';

  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function associatePayer(){
  var email=(gel('assoc-email')||{}).value||'';
  var name=(gel('assoc-name')||{}).value||'';
  var clientId=(gel('assoc-client')||{}).value||'';
  var newName=(gel('assoc-newclient')||{}).value||'';
  var cat=(gel('assoc-cat')||{}).value||'';

  /* Create new client if specified */
  if(newName.trim()&&!clientId){
    var newStatus=(gel('assoc-newstatus')||{}).value||'active';
    var ok=await dbAddClient(newName.trim(),newStatus);
    if(!ok)return;
    await loadClientRecords();
    var newCl=S.clientRecords.find(function(c){return c.name===newName.trim()});
    if(newCl)clientId=newCl.id;
    else{toast('Could not find created client','warn');return}}

  if(!clientId){toast('Select or create a client','warn');return}

  var ok=await dbAssociatePayerToClient(email,name,clientId,cat);
  if(ok){
    await loadFinancePayments();await loadPayerMap();
    var clientName=clientNameById(clientId);
    toast('Associated to '+clientName,'ok');closeModal();render()}}

/* ─── Expense Reconciliation ─── */
function openExpenseReconcileModal(paymentId){
  var p=S.financePayments.find(function(fp){return fp.id===paymentId});
  if(!p)return;
  var meta=typeof p.metadata==='string'?JSON.parse(p.metadata||'{}'):p.metadata||{};
  var acct=getExpenseAccount(p);
  var srcLabel=srcLabelFull?srcLabelFull(p):(p.source||'');
  var isOut=p.direction==='outflow';

  /* Score and rank scheduled item suggestions */
  var suggestions=[];
  S.scheduledItems.forEach(function(item){
    var score=scoreExpenseMatch(p,item);
    if(score>=0)suggestions.push({item:item,score:score})});
  suggestions.sort(function(a,b){return a.score-b.score});

  var h='<div class="tf-modal-top"><h2>Reconcile Expense</h2><button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div style="padding:0 20px 20px">';

  /* Expense summary */
  h+='<div style="padding:16px;background:rgba(255,255,255,.03);border:1px solid var(--gborder);border-radius:10px;margin-bottom:16px">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center">';
  h+='<div>';
  h+='<div style="font-weight:600;font-size:15px">'+esc(p.payerName||p.description||'Unknown')+'</div>';
  if(p.description&&p.description!==p.payerName)h+='<div style="color:var(--t3);font-size:12px;margin-top:2px">'+esc(p.description.substring(0,80))+'</div>';
  h+='<div style="margin-top:4px;font-size:12px;color:var(--t4)">'+(p.date?fmtDShort(p.date):'No date')+' • <span class="'+srcClsFull(p)+'" style="font-size:11px;padding:2px 6px">'+esc(srcLabel)+'</span></div>';
  h+='</div>';
  h+='<div style="font-size:22px;font-weight:700;color:var(--red)">-'+fmtUSD(p.amount)+'</div>';
  h+='</div></div>';

  /* Category selector for one-off / uncategorised expenses */
  h+='<div style="margin-bottom:16px">';
  h+='<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Expense Category</div>';
  h+='<select class="edf" id="recon-category" onchange="TF.setExpenseCategory(\''+escAttr(p.id)+'\',this.value)" style="width:100%">';
  h+='<option value="">— Select Category —</option>';
  EXPENSE_CATS.forEach(function(c){h+='<option value="'+esc(c)+'"'+(p.category===c?' selected':'')+'>'+esc(c)+'</option>'});
  h+='</select>';
  h+='</div>';

  /* Already linked? */
  if(p.scheduledItemId){
    var linked=S.scheduledItems.find(function(si){return si.id===p.scheduledItemId});
    h+='<div class="fin-recon-linked" style="padding:12px;background:rgba(61,220,132,.05);border:1px solid rgba(61,220,132,.15);border-radius:8px;margin-bottom:16px">';
    h+='<div style="display:flex;justify-content:space-between;align-items:center">';
    h+='<span style="color:var(--green);font-weight:600">'+icon('link',12)+' Linked to: '+(linked?esc(linked.name):'Unknown')+'</span>';
    h+='<button class="btn" onclick="TF.unlinkExpenseFromScheduled(\''+escAttr(p.id)+'\')" style="font-size:11px;padding:4px 12px">Unlink</button>';
    h+='</div></div>'}

  /* Suggestions */
  if(suggestions.length>0&&!p.scheduledItemId){
    h+='<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--t2)">Match to Recurring Item</div>';
    suggestions.slice(0,8).forEach(function(s){
      var item=s.item;
      var isExact=Math.abs(p.amount-item.amount)/Math.max(item.amount,0.01)<0.005;
      var cls='fin-recon-suggestion'+(isExact?' exact':s.score<30?' close':'');
      h+='<div class="'+cls+'" onclick="TF.linkExpenseToScheduled(\''+escAttr(p.id)+'\',\''+escAttr(item.id)+'\')">';
      h+='<div style="display:flex;justify-content:space-between;align-items:center">';
      h+='<div>';
      h+='<div style="font-weight:600;font-size:14px">'+esc(item.name)+'</div>';
      h+='<div style="font-size:11px;color:var(--t4)">'+esc(item.frequency)+' • '+(item.account||'Any account');
      if(isExact)h+=' • <span style="color:var(--green)">Exact match</span>';
      h+='</div></div>';
      h+='<div style="font-size:16px;font-weight:600;color:var(--red)">-'+fmtUSD(item.amount)+'</div>';
      h+='</div></div>'});
  }else if(!p.scheduledItemId){
    h+='<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--t2)">No Matching Recurring Items</div>';
    h+='<div style="font-size:12px;color:var(--t4);margin-bottom:12px">Create a new recurring item to track this expense.</div>'}

  /* Create new recurring item button */
  if(!p.scheduledItemId){
    h+='<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--gborder)">';
    h+='<button class="btn" onclick="TF.createScheduledFromExpense(\''+escAttr(p.id)+'\')" style="width:100%;padding:10px;font-size:13px;color:var(--blue);border-color:rgba(79,172,254,.3)">';
    h+=icon('plus',14)+' Create New Recurring Item from This Expense</button>';
    h+='<button class="btn" onclick="TF.saveExpenseAsOneOff(\''+escAttr(p.id)+'\')" style="width:100%;padding:10px;font-size:13px;color:var(--purple50);border-color:rgba(168,85,247,.3);margin-top:8px">';
    h+=icon('file',14)+' Save as One-Off Expense</button>';
    h+='</div>'}

  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

function createScheduledFromExpense(paymentId){
  var p=S.financePayments.find(function(fp){return fp.id===paymentId});
  if(!p)return;
  var acct=getExpenseAccount(p);
  /* Open the scheduled item modal */
  openAddScheduledItem();
  /* Pre-fill after DOM renders */
  setTimeout(function(){
    if(gel('si-name'))gel('si-name').value=p.payerName||p.description||'';
    if(gel('si-amount'))gel('si-amount').value=p.amount;
    if(gel('si-direction'))gel('si-direction').value='outflow';
    if(gel('si-account'))gel('si-account').value=acct||'';
    if(gel('si-type'))gel('si-type').value='subscription';
    /* Store payment ID for auto-link after save */
    var hidden=document.createElement('input');
    hidden.type='hidden';hidden.id='si-link-payment';hidden.value=paymentId;
    if(gel('si-name'))gel('si-name').parentNode.appendChild(hidden)},50)}

/* ─── Add Manual Payment ─── */
function openAddFinancePayment(){
  var clOpts='<option value="">— Select Client —</option>';
  S.clientRecords.forEach(function(c){
    clOpts+='<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>'});
  var catOpts='<option value="">— None —</option>';
  PAY_CATS.forEach(function(c){catOpts+='<option>'+esc(c)+'</option>'});
  var cpOpts='<option value="">— None —</option>';
  S.campaigns.forEach(function(c){
    cpOpts+='<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>'});

  var h='<div class="tf-modal-top"><h2>Add Payment</h2><button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div style="padding:0 20px 20px"><div class="ed-grid">';
  h+='<div class="ed-fld"><span class="ed-lbl">Date</span><input type="date" class="edf" id="afp-date" value="'+new Date().toISOString().slice(0,10)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Amount</span><input type="number" class="edf" id="afp-amount" placeholder="0.00" min="0" step="0.01"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Payer Name</span><input type="text" class="edf" id="afp-pname" placeholder="Company or person name..."></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Payer Email</span><input type="text" class="edf" id="afp-pemail" placeholder="email@example.com"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="afp-cat">'+catOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="afp-client">'+clOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="afp-campaign">'+cpOpts+'</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Source</span><select class="edf" id="afp-source"><option value="manual">Manual</option><option value="brex">Brex</option><option value="zoho">Zoho</option><option value="stripe">Stripe</option></select></div>';
  h+='<div class="ed-fld ed-fld-full"><span class="ed-lbl">Notes</span><textarea class="edf" id="afp-notes" rows="2" placeholder="Notes..."></textarea></div>';
  h+='</div>';
  h+='<div class="ed-actions" style="margin-top:16px"><button class="btn btn-p" onclick="TF.addFinancePayment()">'+icon('plus',14)+' Add Payment</button><button class="btn" onclick="TF.closeModal()">Cancel</button></div>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function addFinancePayment(){
  var amt=parseFloat((gel('afp-amount')||{}).value)||0;
  if(amt<=0){toast('Enter an amount','warn');return}
  var clientId=(gel('afp-client')||{}).value||null;
  var data={date:(gel('afp-date')||{}).value||null,amount:amt,fee:0,net:amt,
    source:(gel('afp-source')||{}).value||'manual',sourceId:'',
    payerName:(gel('afp-pname')||{}).value||'',payerEmail:(gel('afp-pemail')||{}).value||'',
    description:'',category:(gel('afp-cat')||{}).value||'',
    clientId:clientId,campaignId:(gel('afp-campaign')||{}).value||null,
    endClient:'',notes:(gel('afp-notes')||{}).value||'',
    status:clientId?'matched':'unmatched'};
  var result=await dbAddFinancePayment(data);
  if(result){await loadFinancePayments();toast('Payment added','ok');closeModal();render()}}

/* ─── Client Edit Modal (enhanced) ─── */
function openEditClient(id){
  var cl=S.clientRecords.find(function(c){return c.id===id});
  if(!cl)return;
  var h='<div class="tf-modal-top"><h2>Edit Client</h2><button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div style="padding:0 20px 20px"><div class="ed-grid">';
  h+='<input type="hidden" id="ecl-id" value="'+esc(cl.id)+'">';
  h+='<div class="ed-fld"><span class="ed-lbl">Name</span><input type="text" class="edf" id="ecl-name" value="'+esc(cl.name)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Status</span><select class="edf" id="ecl-status"><option'+(cl.status==='active'?' selected':'')+'>active</option><option'+(cl.status==='lapsed'?' selected':'')+'>lapsed</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Email</span><input type="text" class="edf" id="ecl-email" value="'+esc(cl.email)+'" placeholder="email@example.com"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Company</span><input type="text" class="edf" id="ecl-company" value="'+esc(cl.company)+'" placeholder="Company name..."></div>';
  h+='<div class="ed-fld ed-fld-full"><span class="ed-lbl">Notes</span><textarea class="edf" id="ecl-notes" rows="3" placeholder="Notes...">'+esc(cl.notes)+'</textarea></div>';
  h+='</div>';
  h+='<div class="ed-actions" style="margin-top:16px"><button class="btn btn-p" onclick="TF.saveClient()">'+icon('save',14)+' Save</button><button class="btn" onclick="TF.closeModal()">Cancel</button></div>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function saveClient(){
  var id=(gel('ecl-id')||{}).value;if(!id)return;
  var data={name:(gel('ecl-name')||{}).value||'',status:(gel('ecl-status')||{}).value||'active',
    email:(gel('ecl-email')||{}).value||'',company:(gel('ecl-company')||{}).value||'',
    notes:(gel('ecl-notes')||{}).value||''};
  if(!data.name.trim()){toast('Client name required','warn');return}
  var ok=await dbEditClient(id,data);
  if(ok){await loadClientRecords();toast('Client updated','ok');closeModal();render();
    if(S.clientDetailName){setTimeout(function(){openClientDetailModal(S.clientDetailName)},50)}}}

/* ─── Add Client Modal ─── */
function openAddClientModal(){
  var h='<div class="tf-modal-top"><h2>Add Client</h2><button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div style="padding:0 20px 20px"><div class="ed-grid">';
  h+='<div class="ed-fld"><span class="ed-lbl">Name</span><input type="text" class="edf" id="ncl-name" placeholder="Client name..."></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Status</span><select class="edf" id="ncl-status"><option value="active" selected>Active</option><option value="lapsed">Lapsed</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Email</span><input type="text" class="edf" id="ncl-email" placeholder="email@example.com"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Company</span><input type="text" class="edf" id="ncl-company" placeholder="Company name..."></div>';
  h+='<div class="ed-fld ed-fld-full"><span class="ed-lbl">Notes</span><textarea class="edf" id="ncl-notes" rows="3" placeholder="Notes..."></textarea></div>';
  h+='</div>';
  h+='<div class="ed-actions" style="margin-top:16px"><button class="btn btn-p" onclick="TF.addNewClient()">'+icon('check',14)+' Create Client</button><button class="btn" onclick="TF.closeModal()">Cancel</button></div>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function addNewClient(){
  var name=(gel('ncl-name')||{}).value||'';
  if(!name.trim()){toast('Client name required','warn');return}
  var status=(gel('ncl-status')||{}).value||'active';
  var ok=await dbAddClient(name.trim(),status);
  if(!ok)return;
  await loadClientRecords();
  /* Also set email, company, notes if provided */
  var newCl=S.clientRecords.find(function(c){return c.name===name.trim()});
  if(newCl){
    var email=(gel('ncl-email')||{}).value||'';
    var company=(gel('ncl-company')||{}).value||'';
    var notes=(gel('ncl-notes')||{}).value||'';
    if(email||company||notes){
      await dbEditClient(newCl.id,{name:newCl.name,status:status,email:email,company:company,notes:notes});
      await loadClientRecords()}}
  toast('Client created','ok');closeModal();render()}

/* ═══════════ INLINE BILLING EDIT ═══════════ */
async function saveCampaignBilling(cpId){
  var data={
    monthlyFee:parseFloat((gel('cpb-fee')||{}).value)||0,
    billingFrequency:(gel('cpb-freq')||{}).value||'monthly',
    nextBillingDate:(gel('cpb-next')||{}).value||null,
    strategyFee:parseFloat((gel('cpb-strategy')||{}).value)||0,
    setupFee:parseFloat((gel('cpb-setup')||{}).value)||0,
    monthlyAdSpend:parseFloat((gel('cpb-adspend')||{}).value)||0};
  var cp=S.campaigns.find(function(c){return c.id===cpId});
  if(cp){cp.monthlyFee=data.monthlyFee;cp.billingFrequency=data.billingFrequency;cp.nextBillingDate=data.nextBillingDate;
    cp.strategyFee=data.strategyFee;cp.setupFee=data.setupFee;cp.monthlyAdSpend=data.monthlyAdSpend}
  await dbEditCampaign(cpId,data);
  toast('Billing updated','ok');render()}

/* ═══════════ NOTES (Campaign + Client) ═══════════ */
async function addCampaignNote(campaignId){
  var el=gel('cpn-input');if(!el)return;
  var text=el.value.trim();if(!text)return;
  el.value='';
  await dbAddCampaignNote(campaignId,text);
  await loadCampaignNotes();render()}

async function addClientNote(clientId){
  var el=gel('cln-input');if(!el)return;
  var text=el.value.trim();if(!text)return;
  el.value='';
  await dbAddClientNote(clientId,text);
  await loadClientNotes();
  if(S.clientDetailName)openClientDetailModal(S.clientDetailName)}

async function deleteCampaignNote(noteId,campaignId){
  await dbDeleteCampaignNote(noteId);
  await loadCampaignNotes();render();
  if(S.campaignDetailId===campaignId)openCampaignDashboard(campaignId)}

async function deleteClientNote(noteId,clientName){
  await dbDeleteClientNote(noteId);
  await loadClientNotes();
  if(S.clientDetailName)openClientDetailModal(S.clientDetailName)}

/* ═══════════ PAYMENT SPLITS ═══════════ */

/* Temp in-memory splits for the editor */
var _splitRows=[];

function renderSplitEditorRows(splits,p){
  /* Build category options */
  var catOptsBase='<option value="">— None —</option>';
  PAY_CATS.forEach(function(c){catOptsBase+='<option>'+esc(c)+'</option>'});

  /* Get client name — prefer live form value over stored p.clientId */
  var formClientId=(gel('fp-client')||{}).value||p.clientId||'';
  var clientName=clientNameById(formClientId);

  var totalSplit=0;
  _splitRows=splits.map(function(sp){return{id:sp.id||'',amount:sp.amount||0,category:sp.category||'',endClient:sp.endClient||'',campaignId:sp.campaignId||'',notes:sp.notes||''}});
  _splitRows.forEach(function(sp){totalSplit+=sp.amount});

  var remaining=p.amount-totalSplit;
  var balCls=Math.abs(remaining)<0.01?'split-bal-ok':(remaining>0?'split-bal-warn':'split-bal-over');

  var h='';
  /* Balance indicator */
  h+='<div class="split-balance '+balCls+'">';
  h+='<span>Parent: <b>'+fmtUSD(p.amount)+'</b></span>';
  h+='<span>Allocated: <b>'+fmtUSD(totalSplit)+'</b></span>';
  h+='<span>Remaining: <b>'+fmtUSD(remaining)+'</b></span>';
  h+='</div>';

  /* Split rows */
  _splitRows.forEach(function(sp,idx){
    var catOpts='<option value="">— None —</option>';
    PAY_CATS.forEach(function(c){catOpts+='<option'+(c===sp.category?' selected':'')+'>'+esc(c)+'</option>'});
    var ecOpts=buildEndClientOptions(sp.endClient,clientName);
    var cpOpts=buildCampaignOptions(sp.campaignId,clientName,sp.endClient);

    h+='<div class="split-line" data-split-idx="'+idx+'">';
    h+='<div class="split-line-head">';
    h+='<span class="split-line-num">Split '+(idx+1)+'</span>';
    h+='<button class="btn btn-d split-line-del" onclick="TF.removeSplitRow('+idx+')" title="Remove split">'+icon('x',12)+'</button>';
    h+='</div>';
    h+='<div class="ed-grid" style="grid-template-columns:1fr 1fr">';
    h+='<div class="ed-fld"><span class="ed-lbl">Amount</span><input type="number" class="edf split-amt" id="sp-amt-'+idx+'" value="'+(sp.amount||'')+'" min="0" step="0.01" placeholder="0.00" oninput="TF.splitAmtChanged()"></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select class="edf" id="sp-cat-'+idx+'">'+catOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="sp-ec-'+idx+'" onchange="TF.splitEcChanged('+idx+')">'+ecOpts+'</select></div>';
    h+='<div class="ed-fld"><span class="ed-lbl">Campaign</span><select class="edf" id="sp-cp-'+idx+'">'+cpOpts+'</select></div>';
    h+='<div class="ed-fld ed-fld-full"><span class="ed-lbl">Notes</span><input type="text" class="edf" id="sp-notes-'+idx+'" value="'+esc(sp.notes||'')+'" placeholder="Split notes..."></div>';
    h+='</div></div>';
  });

  h+='<button class="btn split-add-btn" onclick="TF.addSplitRow()" style="margin-top:8px;width:100%">'+icon('plus',12)+' Add Split Line</button>';
  return h}

function splitAmtChanged(){
  /* Update balance indicator in real time */
  var pid=(gel('fp-id')||{}).value;if(!pid)return;
  var p=S.financePayments.find(function(fp){return fp.id===pid});if(!p)return;
  var total=0;
  _splitRows.forEach(function(sp,idx){
    var el=gel('sp-amt-'+idx);
    total+=el?parseFloat(el.value)||0:sp.amount});
  var remaining=p.amount-total;
  var balEl=document.querySelector('.split-balance');
  if(!balEl)return;
  var balCls=Math.abs(remaining)<0.01?'split-bal-ok':(remaining>0?'split-bal-warn':'split-bal-over');
  balEl.className='split-balance '+balCls;
  balEl.innerHTML='<span>Parent: <b>'+fmtUSD(p.amount)+'</b></span><span>Allocated: <b>'+fmtUSD(total)+'</b></span><span>Remaining: <b>'+fmtUSD(remaining)+'</b></span>'}

function splitEcChanged(idx){
  var pid=(gel('fp-id')||{}).value;if(!pid)return;
  var p=S.financePayments.find(function(fp){return fp.id===pid});if(!p)return;
  var formClientId=(gel('fp-client')||{}).value||p.clientId||'';
  var clientName=clientNameById(formClientId);
  var ecEl=gel('sp-ec-'+idx);
  var ec=ecEl?ecEl.value:'';
  if(ec==='__addnew__'){ecAddNew('sp-ec-'+idx);return}
  var cpSel=gel('sp-cp-'+idx);
  if(cpSel)cpSel.innerHTML=buildCampaignOptions('',clientName,ec)}

function addSplitRow(){
  /* Read current form values into _splitRows first */
  _readSplitForm();
  var pid=(gel('fp-id')||{}).value;if(!pid)return;
  var p=S.financePayments.find(function(fp){return fp.id===pid});if(!p)return;
  /* Calculate remaining */
  var totalSoFar=0;_splitRows.forEach(function(sp){totalSoFar+=sp.amount});
  var remaining=Math.max(0,p.amount-totalSoFar);
  _splitRows.push({id:'',amount:remaining>0?Math.round(remaining*100)/100:0,category:'',endClient:'',campaignId:'',notes:''});
  /* Re-render the split editor */
  var editor=gel('fp-splits-editor');
  if(editor)editor.innerHTML=renderSplitEditorRows(_splitRows,p)}

function removeSplitRow(idx){
  _readSplitForm();
  _splitRows.splice(idx,1);
  var pid=(gel('fp-id')||{}).value;if(!pid)return;
  var p=S.financePayments.find(function(fp){return fp.id===pid});if(!p)return;
  var editor=gel('fp-splits-editor');
  if(editor)editor.innerHTML=renderSplitEditorRows(_splitRows,p)}

function _readSplitForm(){
  _splitRows.forEach(function(sp,idx){
    var amtEl=gel('sp-amt-'+idx);if(amtEl)sp.amount=parseFloat(amtEl.value)||0;
    var catEl=gel('sp-cat-'+idx);if(catEl)sp.category=catEl.value||'';
    var ecEl=gel('sp-ec-'+idx);
    if(ecEl){var ecVal=ecEl.value||'';sp.endClient=(ecVal==='__addnew__'?'':ecVal)}
    var cpEl=gel('sp-cp-'+idx);if(cpEl)sp.campaignId=cpEl.value||'';
    var ntEl=gel('sp-notes-'+idx);if(ntEl)sp.notes=ntEl.value||''})}

async function openSplitPayment(){
  var pid=(gel('fp-id')||{}).value;if(!pid)return;
  var p=S.financePayments.find(function(fp){return fp.id===pid});if(!p)return;

  /* Read current form values — user may have set client/category before clicking Split */
  var formClientId=(gel('fp-client')||{}).value||null;
  var formCat=(gel('fp-category')||{}).value||'';
  var formDate=(gel('fp-date')||{}).value||null;
  var formNotes=(gel('fp-notes')||{}).value||'';
  var formEc='';var ecEl=gel('fp-endclient');
  if(ecEl)formEc=(ecEl.value==='__addnew__'?'':ecEl.value)||'';
  var formCpId=(gel('fp-campaign')||{}).value||null;

  /* Handle new client creation if needed */
  var newName=(gel('fp-newclient')||{}).value||'';
  if(newName.trim()&&!formClientId){
    var newClStatus=(gel('fp-newstatus')||{}).value||'active';
    var cOk=await dbAddClient(newName.trim(),newClStatus);
    if(!cOk)return;
    await loadClientRecords();
    var newCl=S.clientRecords.find(function(c){return c.name===newName.trim()});
    if(newCl)formClientId=newCl.id}

  /* Pre-populate first split from form fields */
  var firstSplit={id:'',amount:p.amount,category:formCat,endClient:formEc,campaignId:formCpId||'',notes:''};

  /* Update parent payment — status to split, clear category/ec/campaign (those live on splits now) */
  var ok=await dbEditFinancePayment(pid,{status:'split',category:'',endClient:'',campaignId:null,
    notes:formNotes,date:formDate,clientId:formClientId});
  if(!ok){toast('Could not switch to split mode','warn');return}
  p.status='split';p.category='';p.endClient='';p.campaignId='';
  p.clientId=formClientId;p.notes=formNotes;
  if(formDate)p.date=new Date(formDate+'T00:00:00');

  /* Save the first split row */
  var res=await dbAddFinancePaymentSplit({paymentId:pid,amount:firstSplit.amount,
    category:firstSplit.category,endClient:firstSplit.endClient,
    campaignId:firstSplit.campaignId||null,notes:firstSplit.notes});
  if(res){
    S.financePaymentSplits.push({id:res.id,paymentId:pid,amount:firstSplit.amount,
      category:firstSplit.category,endClient:firstSplit.endClient,
      campaignId:firstSplit.campaignId||'',notes:firstSplit.notes})}

  toast('Payment converted to split mode','ok');
  openFinancePaymentDetail(pid)}

async function saveSplits(){
  var pid=(gel('fp-id')||{}).value;if(!pid)return;
  var p=S.financePayments.find(function(fp){return fp.id===pid});if(!p)return;

  /* Save client from the parent form */
  var clientId=(gel('fp-client')||{}).value||null;
  var newName=(gel('fp-newclient')||{}).value||'';
  if(newName.trim()&&!clientId){
    var newClStatus=(gel('fp-newstatus')||{}).value||'active';
    var cOk=await dbAddClient(newName.trim(),newClStatus);
    if(!cOk)return;
    await loadClientRecords();
    var newCl=S.clientRecords.find(function(c){return c.name===newName.trim()});
    if(newCl)clientId=newCl.id;
    else{toast('Could not find created client','warn');return}}

  /* Update parent payment with client */
  var parentData={status:'split',category:'',endClient:'',campaignId:null,
    clientId:clientId,notes:(gel('fp-notes')||{}).value||'',
    date:(gel('fp-date')||{}).value||null};
  var pOk=await dbEditFinancePayment(pid,parentData);
  if(pOk){p.clientId=clientId;p.notes=parentData.notes}

  /* Read form */
  _readSplitForm();

  /* Validate total */
  var total=0;
  _splitRows.forEach(function(sp){total+=sp.amount});
  if(Math.abs(total-p.amount)>0.02){
    toast('Splits must total '+fmtUSD(p.amount)+' (currently '+fmtUSD(total)+')','warn');return}

  /* Existing splits in DB */
  var existing=getSplitsForPayment(pid);
  var existingIds={};existing.forEach(function(e){existingIds[e.id]=true});

  /* Process each row */
  for(var i=0;i<_splitRows.length;i++){
    var sp=_splitRows[i];
    var data={paymentId:pid,amount:sp.amount,category:sp.category,
      endClient:sp.endClient,campaignId:sp.campaignId||null,notes:sp.notes};

    if(sp.id){
      /* Update existing */
      var ok=await dbEditFinancePaymentSplit(sp.id,data);
      if(ok){
        var exSp=S.financePaymentSplits.find(function(s){return s.id===sp.id});
        if(exSp){exSp.amount=sp.amount;exSp.category=sp.category;exSp.endClient=sp.endClient;exSp.campaignId=sp.campaignId;exSp.notes=sp.notes}}
      delete existingIds[sp.id];
    }else{
      /* Create new */
      var res=await dbAddFinancePaymentSplit(data);
      if(res){
        S.financePaymentSplits.push({id:res.id,paymentId:pid,amount:sp.amount,
          category:sp.category,endClient:sp.endClient,campaignId:res.campaign_id||sp.campaignId||'',notes:sp.notes})}
    }
  }

  /* Delete removed splits */
  var toDelete=Object.keys(existingIds);
  for(var j=0;j<toDelete.length;j++){
    await dbDeleteFinancePaymentSplit(toDelete[j]);
    S.financePaymentSplits=S.financePaymentSplits.filter(function(s){return s.id!==toDelete[j]})}

  toast('Splits saved','ok');closeModal();render()}

async function unsplitPayment(){
  var pid=(gel('fp-id')||{}).value;if(!pid)return;
  var p=S.financePayments.find(function(fp){return fp.id===pid});if(!p)return;
  var splits=getSplitsForPayment(pid);

  /* Restore first split's details back to the parent */
  var first=splits[0]||{};
  var data={status:first.category||first.campaignId?'matched':'unmatched',
    category:first.category||'',endClient:first.endClient||'',
    campaignId:first.campaignId||null,notes:p.notes||'',
    date:p.date?p.date.toISOString().slice(0,10):null,
    clientId:p.clientId||null};
  var ok=await dbEditFinancePayment(pid,data);
  if(!ok){toast('Could not unsplit payment','warn');return}
  p.status=data.status;p.category=data.category;p.endClient=data.endClient;p.campaignId=data.campaignId;

  /* Delete all splits from DB */
  for(var i=0;i<splits.length;i++){
    await dbDeleteFinancePaymentSplit(splits[i].id)}
  S.financePaymentSplits=S.financePaymentSplits.filter(function(s){return s.paymentId!==pid});

  toast('Payment restored to single','ok');closeModal();render()}

/* ═══════════ INTEGRATIONS MODAL ═══════════ */
var INTG_PLATFORMS=[
  {id:'brex',label:'Brex',color:'#f5a623',desc:'Banking (Tim Jarvis Online LLC)',
    fields:[{key:'api_key',label:'API Key',type:'password'}],
    configFields:[{key:'cash_account_id',label:'Cash Account ID (leave blank to auto-detect)',type:'text'}]},
  {id:'mercury',label:'Mercury',color:'#6c5ce7',desc:'Banking (Film&Content LLC)',
    fields:[{key:'api_key',label:'API Key',type:'password'}],
    configFields:[]},
  {id:'zoho_books',label:'Zoho Books',color:'#2196f3',desc:'Accounting (Film&Content LLC)',
    fields:[{key:'client_id',label:'Client ID',type:'text'},{key:'client_secret',label:'Client Secret',type:'password'},{key:'refresh_token',label:'Refresh Token',type:'password'},{key:'code',label:'Auth Code (first-time only)',type:'text'}],
    configFields:[{key:'organization_id',label:'Organization ID',type:'text'}]},
  {id:'gmail',label:'Gmail',color:'#EA4335',desc:'Email (tim.jarvis@timjarvis.online)',oauth:true,
    fields:[{key:'client_id',label:'Client ID',type:'text'},{key:'client_secret',label:'Client Secret',type:'password'}],
    configFields:[]},
  {id:'anthropic',label:'Anthropic (Claude AI)',color:'#D4A574',desc:'AI-powered email analysis',
    fields:[{key:'api_key',label:'API Key',type:'password'}],
    configFields:[{key:'model',label:'Model (default: claude-sonnet-4-6)',type:'text'}]},
  {id:'openai',label:'OpenAI (Embeddings)',color:'#10A37F',desc:'Knowledge base vector embeddings',
    fields:[{key:'api_key',label:'API Key',type:'password'}],
    configFields:[]},
  {id:'readai',label:'Read.ai',color:'#6366F1',desc:'Meeting transcripts and recordings',
    fields:[],
    configFields:[{key:'webhook_secret',label:'Webhook Secret',type:'text'}]},
];

/* ═══════════ SCHEDULED ITEM MODALS ═══════════ */
function openAddScheduledItem(){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('refresh',14)+' Add Scheduled Item</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="edf-body" style="padding:16px">';
  h+='<div class="ed-grid">';
  h+='<div class="ed-fld"><span class="ed-lbl">Name</span><input id="si-name" class="edf" placeholder="e.g. Office Rent"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Amount ($)</span><input id="si-amount" class="edf" type="number" step="0.01" placeholder="0.00"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Direction</span><select id="si-direction" class="edf"><option value="outflow">Outflow (expense)</option><option value="inflow">Inflow (income)</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Frequency</span><select id="si-frequency" class="edf"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="biweekly">Bi-weekly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option><option value="once">One-time</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Day of Month</span><input id="si-dom" class="edf" type="number" min="1" max="31" placeholder="1"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Next Due Date</span><input id="si-nextdue" class="edf" type="date"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Date</span><input id="si-enddate" class="edf" type="date" placeholder="Optional"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl"># Payments</span><input id="si-numpay" class="edf" type="number" min="1" placeholder="∞"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select id="si-type" class="edf"><option value="expense">Expense</option><option value="subscription">Subscription</option><option value="salary">Salary</option><option value="tax">Tax</option><option value="loan">Loan</option><option value="income">Income</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Account</span><select id="si-account" class="edf"><option value="">Any</option><option value="brex_card">Brex Card</option><option value="brex_cash">Brex Cash</option><option value="mercury">Mercury</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select id="si-category" class="edf"><option value="">—</option>';
  PAY_CATS.forEach(function(c){h+='<option>'+c+'</option>'});
  h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Notes</span><input id="si-notes" class="edf" placeholder="Optional notes"></div>';
  h+='</div>';
  h+='<div class="edf-actions" style="margin-top:16px"><button class="btn btn-p" onclick="TF.saveScheduledItem()">'+icon('save',12)+' Add Item</button></div>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

function openEditScheduledItem(id){
  var item=S.scheduledItems.find(function(i){return i.id===id});
  if(!item)return;
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('refresh',14)+' Edit Scheduled Item</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<input type="hidden" id="si-id" value="'+item.id+'">';
  h+='<div class="edf-body" style="padding:16px">';
  h+='<div class="ed-grid">';
  h+='<div class="ed-fld"><span class="ed-lbl">Name</span><input id="si-name" class="edf" value="'+esc(item.name)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Amount ($)</span><input id="si-amount" class="edf" type="number" step="0.01" value="'+item.amount+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Direction</span><select id="si-direction" class="edf"><option value="outflow"'+(item.direction==='outflow'?' selected':'')+'>Outflow (expense)</option><option value="inflow"'+(item.direction==='inflow'?' selected':'')+'>Inflow (income)</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Frequency</span><select id="si-frequency" class="edf">';
  [['monthly','Monthly'],['weekly','Weekly'],['biweekly','Bi-weekly'],['quarterly','Quarterly'],['annually','Annually'],['once','One-time']].forEach(function(f){
    h+='<option value="'+f[0]+'"'+(item.frequency===f[0]?' selected':'')+'>'+f[1]+'</option>'});
  h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Day of Month</span><input id="si-dom" class="edf" type="number" min="1" max="31" value="'+(item.dayOfMonth||'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Next Due Date</span><input id="si-nextdue" class="edf" type="date" value="'+(item.nextDue||'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">End Date</span><input id="si-enddate" class="edf" type="date" value="'+(item.endDate||'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl"># Payments</span><input id="si-numpay" class="edf" type="number" min="1" value="'+(item.numPayments||'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Type</span><select id="si-type" class="edf">';
  [['expense','Expense'],['subscription','Subscription'],['salary','Salary'],['tax','Tax'],['loan','Loan'],['income','Income']].forEach(function(t){
    h+='<option value="'+t[0]+'"'+(item.type===t[0]?' selected':'')+'>'+t[1]+'</option>'});
  h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Account</span><select id="si-account" class="edf">';
  [['','Any'],['brex_card','Brex Card'],['brex_cash','Brex Cash'],['mercury','Mercury']].forEach(function(a){
    h+='<option value="'+a[0]+'"'+(item.account===a[0]?' selected':'')+'>'+a[1]+'</option>'});
  h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Category</span><select id="si-category" class="edf"><option value="">—</option>';
  PAY_CATS.forEach(function(c){h+='<option'+(item.category===c?' selected':'')+'>'+c+'</option>'});
  h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Active</span><select id="si-active" class="edf"><option value="1"'+(item.isActive?' selected':'')+'>Active</option><option value="0"'+(!item.isActive?' selected':'')+'>Inactive</option></select></div>';
  h+='<div class="ed-fld full"><span class="ed-lbl">Notes</span><input id="si-notes" class="edf" value="'+esc(item.notes)+'"></div>';
  h+='</div>';
  h+='<div class="edf-actions" style="margin-top:16px;display:flex;gap:8px">';
  h+='<button class="btn btn-p" onclick="TF.saveScheduledItem()">'+icon('save',12)+' Save</button>';
  h+='<button class="btn" onclick="TF.confirmDeleteScheduledItem(\''+item.id+'\')" style="color:var(--red)">'+icon('trash',12)+' Delete</button>';
  h+='</div>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function saveScheduledItem(){
  var id=gel('si-id')?gel('si-id').value:'';
  var data={
    name:(gel('si-name').value||'').trim(),
    amount:parseFloat(gel('si-amount').value)||0,
    direction:gel('si-direction').value||'outflow',
    frequency:gel('si-frequency').value||'monthly',
    dayOfMonth:parseInt(gel('si-dom').value)||null,
    nextDue:gel('si-nextdue').value||null,
    type:gel('si-type').value||'expense',
    account:gel('si-account').value||'',
    category:gel('si-category').value||'',
    notes:(gel('si-notes').value||'').trim(),
    endDate:gel('si-enddate')?gel('si-enddate').value||null:null,
    numPayments:gel('si-numpay')?parseInt(gel('si-numpay').value)||null:null
  };
  if(gel('si-active'))data.isActive=gel('si-active').value==='1';
  if(!data.name){toast('Name is required','warn');return}
  if(!data.amount){toast('Amount is required','warn');return}

  var linkPaymentId=gel('si-link-payment')?gel('si-link-payment').value:'';
  if(id){
    var ok=await dbEditScheduledItem(id,data);
    if(ok)toast('Scheduled item updated','ok');
  }else{
    var newId=await dbAddScheduledItem(data);
    if(newId){
      toast('Scheduled item added','ok');
      /* Auto-link expense to the newly created scheduled item */
      if(linkPaymentId&&newId.id){
        await loadScheduledItems();
        await linkExpenseToScheduled(linkPaymentId,newId.id);
        return /* linkExpenseToScheduled handles reload+render */}}}
  await loadScheduledItems();closeModal();render()}

function confirmDeleteScheduledItem(id){
  if(confirm('Delete this scheduled item?'))doDeleteScheduledItem(id)}

async function doDeleteScheduledItem(id){
  var ok=await dbDeleteScheduledItem(id);
  if(ok){
    S.scheduledItems=S.scheduledItems.filter(function(i){return i.id!==id});
    toast('Item deleted','ok');closeModal();render()}}

/* ═══════════ TEAM MEMBER MODALS ═══════════ */
function openAddTeamMember(){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('clients',14)+' Add Team Member</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="edf-body" style="padding:16px">';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Name</span><input id="tm-name" class="edf" placeholder="Full name"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Role</span><input id="tm-role" class="edf" placeholder="e.g. Account Manager"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Monthly Salary ($)</span><input id="tm-salary" class="edf" type="number" step="0.01" placeholder="0.00"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Pay Frequency</span><select id="tm-payfreq" class="edf"><option value="monthly">Monthly</option><option value="biweekly">Bi-weekly</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Pay Day</span><input id="tm-payday" class="edf" type="number" min="1" max="31" value="1" placeholder="1"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Start Date</span><input id="tm-start" class="edf" type="date"></div>';
  h+='</div>';
  /* Commission section */
  h+='<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">';
  h+='<span class="ed-lbl" style="font-size:12px;font-weight:600;margin-bottom:12px;display:block">'+icon('activity',12)+' Commission Structure</span>';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Commission Rate (%)</span><input id="tm-commrate" class="edf" type="number" step="0.1" placeholder="0"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Commission Basis</span><select id="tm-commbasis" class="edf"><option value="">None</option>';
  h+='<option value="Retain Live">Retain Live Fees</option>';
  h+='<option value="F&C Monthly Fees">F&C Monthly Fees</option>';
  h+='<option value="F&C Strategy">F&C Strategy Fees</option>';
  h+='<option value="F&C Campaign Set-Up">F&C Campaign Set-Up</option>';
  h+='<option value="Products">Products</option>';
  h+='<option value="All Revenue">All Revenue</option>';
  h+='<option value="per_deal">Per Deal (flat)</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Commission Frequency</span><select id="tm-commfreq" class="edf"><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Commission Cap ($)</span><input id="tm-commcap" class="edf" type="number" step="0.01" placeholder="No cap"></div>';
  h+='</div></div>';
  h+='<div class="ed-fld" style="margin-top:12px"><span class="ed-lbl">Notes</span><input id="tm-notes" class="edf" placeholder="Optional notes"></div>';
  h+='<div class="edf-actions" style="margin-top:16px"><button class="btn btn-p" onclick="TF.saveTeamMember()">'+icon('save',12)+' Add Member</button></div>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

function openEditTeamMember(id){
  var m=S.teamMembers.find(function(t){return t.id===id});
  if(!m)return;
  var tally=getCommissionTally(m);
  var estMonthly=estimateMonthlyCommission(m);
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('clients',14)+' Edit Team Member</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<input type="hidden" id="tm-id" value="'+m.id+'">';
  h+='<div class="edf-body" style="padding:16px">';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Name</span><input id="tm-name" class="edf" value="'+esc(m.name)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Role</span><input id="tm-role" class="edf" value="'+esc(m.role)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Monthly Salary ($)</span><input id="tm-salary" class="edf" type="number" step="0.01" value="'+m.salary+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Pay Frequency</span><select id="tm-payfreq" class="edf"><option value="monthly"'+(m.payFrequency==='monthly'?' selected':'')+'>Monthly</option><option value="biweekly"'+(m.payFrequency==='biweekly'?' selected':'')+'>Bi-weekly</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Pay Day</span><input id="tm-payday" class="edf" type="number" min="1" max="31" value="'+m.payDay+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Start Date</span><input id="tm-start" class="edf" type="date" value="'+(m.startDate||'')+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Active</span><select id="tm-active" class="edf"><option value="1"'+(m.isActive?' selected':'')+'>Active</option><option value="0"'+(!m.isActive?' selected':'')+'>Inactive</option></select></div>';
  h+='</div>';
  /* Commission section */
  h+='<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">';
  h+='<span class="ed-lbl" style="font-size:12px;font-weight:600;margin-bottom:12px;display:block">'+icon('activity',12)+' Commission Structure</span>';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Commission Rate (%)</span><input id="tm-commrate" class="edf" type="number" step="0.1" value="'+m.commissionRate+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Commission Basis</span><select id="tm-commbasis" class="edf">';
  var basisOpts=[['','None'],['Retain Live','Retain Live Fees'],['F&C Monthly Fees','F&C Monthly Fees'],['F&C Strategy','F&C Strategy Fees'],['F&C Campaign Set-Up','F&C Campaign Set-Up'],['Products','Products'],['All Revenue','All Revenue'],['per_deal','Per Deal (flat)']];
  basisOpts.forEach(function(b){h+='<option value="'+b[0]+'"'+(m.commissionBasis===b[0]?' selected':'')+'>'+b[1]+'</option>'});
  h+='</select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Commission Frequency</span><select id="tm-commfreq" class="edf"><option value="monthly"'+((m.commissionFrequency||'monthly')==='monthly'?' selected':'')+'>Monthly</option><option value="quarterly"'+((m.commissionFrequency||'monthly')==='quarterly'?' selected':'')+'>Quarterly</option></select></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Commission Cap ($)</span><input id="tm-commcap" class="edf" type="number" step="0.01" value="'+(m.commissionCap||'')+'" placeholder="No cap"></div>';
  h+='</div></div>';
  /* Commission tally */
  if(m.commissionRate>0&&m.commissionBasis){
    h+='<div class="comm-tally" style="margin-top:16px">';
    h+='<div class="comm-tally-header"><span>'+icon('activity',12)+' Commission Tally</span></div>';
    h+='<div class="ed-grid ed-grid-3" style="margin-top:8px">';
    h+='<div style="text-align:center"><div style="font-size:18px;font-weight:700;color:var(--amber)">'+fmtUSD(tally.accrued)+'</div><div style="font-size:10px;opacity:0.6">Accrued Unpaid</div></div>';
    h+='<div style="text-align:center"><div style="font-size:18px;font-weight:700;color:var(--blue)">'+fmtUSD(estMonthly)+'</div><div style="font-size:10px;opacity:0.6">Est. Monthly</div></div>';
    h+='<div style="text-align:center"><div style="font-size:14px;font-weight:600;color:var(--t2)">'+(tally.nextPayDate||'—')+'</div><div style="font-size:10px;opacity:0.6">Next Payment</div></div>';
    h+='</div>';
    /* Qualifying payments breakdown */
    if(tally.qualifyingPayments&&tally.qualifyingPayments.length){
      h+='<details style="margin-top:10px"><summary style="cursor:pointer;font-size:11px;opacity:0.6">Qualifying Payments ('+tally.qualifyingPayments.length+')</summary>';
      h+='<div style="max-height:150px;overflow-y:auto;margin-top:6px">';
      tally.qualifyingPayments.slice(0,20).forEach(function(qp){
        h+='<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:11px;border-bottom:1px solid var(--border)">';
        h+='<span style="opacity:0.7">'+esc(qp.name||'Payment')+'</span>';
        h+='<span style="color:var(--green)">'+fmtUSD(qp.amount)+'</span></div>'});
      h+='</div></details>'}
    h+='</div>'}
  h+='<div class="ed-fld" style="margin-top:12px"><span class="ed-lbl">Notes</span><input id="tm-notes" class="edf" value="'+esc(m.notes)+'"></div>';
  h+='<div class="edf-actions" style="margin-top:16px;display:flex;gap:8px">';
  h+='<button class="btn btn-p" onclick="TF.saveTeamMember()">'+icon('save',12)+' Save</button>';
  h+='<button class="btn" onclick="TF.confirmDeleteTeamMember(\''+m.id+'\')" style="color:var(--red)">'+icon('trash',12)+' Delete</button>';
  h+='</div>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

async function saveTeamMember(){
  var id=gel('tm-id')?gel('tm-id').value:'';
  var data={
    name:(gel('tm-name').value||'').trim(),
    role:(gel('tm-role').value||'').trim(),
    salary:parseFloat(gel('tm-salary').value)||0,
    payFrequency:gel('tm-payfreq').value||'monthly',
    payDay:parseInt(gel('tm-payday').value)||1,
    commissionRate:parseFloat(gel('tm-commrate').value)||0,
    commissionBasis:gel('tm-commbasis').value||'',
    commissionFrequency:gel('tm-commfreq')?gel('tm-commfreq').value||'monthly':'monthly',
    commissionCap:gel('tm-commcap')?(parseFloat(gel('tm-commcap').value)||null):null,
    startDate:gel('tm-start').value||null,
    notes:(gel('tm-notes').value||'').trim()
  };
  if(gel('tm-active'))data.isActive=gel('tm-active').value==='1';
  if(!data.name){toast('Name is required','warn');return}

  if(id){
    var ok=await dbEditTeamMember(id,data);
    if(ok)toast('Team member updated','ok');
  }else{
    var newId=await dbAddTeamMember(data);
    if(newId)toast('Team member added','ok');
  }
  await loadTeamMembers();closeModal();render()}

function confirmDeleteTeamMember(id){
  if(confirm('Delete this team member?'))doDeleteTeamMember(id)}

async function doDeleteTeamMember(id){
  var ok=await dbDeleteTeamMember(id);
  if(ok){
    S.teamMembers=S.teamMembers.filter(function(t){return t.id!==id});
    toast('Team member deleted','ok');closeModal();render()}}

function openIntegrationsModal(){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('link',14)+' Integrations</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="intg-modal">';

  INTG_PLATFORMS.forEach(function(plat){
    var existing=S.integrations.find(function(i){return i.platform===plat.id});
    var isConnected=existing&&existing.is_active;
    var lastSync=existing?existing.last_sync_at:null;
    var syncStatus=existing?existing.last_sync_status:'never';
    var syncMsg=existing?existing.last_sync_message:'';

    h+='<div class="intg-card" id="intg-card-'+plat.id+'">';
    h+='<div class="intg-card-head">';
    h+='<div class="intg-card-title" style="border-left:3px solid '+plat.color+';padding-left:10px">';
    h+='<strong>'+esc(plat.label)+'</strong>';
    h+='<span class="intg-card-desc">'+esc(plat.desc)+'</span>';
    h+='</div>';
    h+='<span class="intg-status intg-status-'+(isConnected?'ok':(syncStatus==='error'?'err':'off'))+'">'+
      (isConnected?'Connected':(syncStatus==='error'?'Error':'Not Connected'))+'</span>';
    h+='</div>';

    /* Last sync info */
    if(lastSync){
      h+='<div class="intg-sync-info">';
      h+='<span>Last sync: '+new Date(lastSync).toLocaleString()+'</span>';
      if(syncMsg)h+='<span class="intg-sync-msg'+(syncStatus==='error'?' intg-sync-err':'')+'">'+esc(syncMsg)+'</span>';
      h+='</div>';
    }

    /* Credential fields */
    h+='<div class="intg-fields" id="intg-fields-'+plat.id+'">';
    plat.fields.forEach(function(f){
      var val=existing&&existing.credentials&&existing.credentials[f.key]?existing.credentials[f.key]:'';
      h+='<label class="intg-label">'+esc(f.label);
      h+='<input type="'+f.type+'" class="intg-input" id="intg-'+plat.id+'-'+f.key+'" value="'+esc(val)+'" placeholder="'+esc(f.label)+'">';
      h+='</label>';
    });
    plat.configFields.forEach(function(f){
      var val=existing&&existing.config&&existing.config[f.key]?existing.config[f.key]:'';
      h+='<label class="intg-label">'+esc(f.label);
      h+='<input type="'+f.type+'" class="intg-input" id="intg-cfg-'+plat.id+'-'+f.key+'" value="'+esc(val)+'" placeholder="'+esc(f.label)+'">';
      h+='</label>';
    });
    h+='</div>';

    /* Read.ai webhook URL display */
    if(plat.id==='readai'){
      var wSecret=existing&&existing.config&&existing.config.webhook_secret?existing.config.webhook_secret:'';
      var wUrl=wSecret?'https://taskflow.timjarvis.online/api/webhook/readai?secret='+encodeURIComponent(wSecret):'Save a webhook secret first, then the URL will appear here';
      h+='<div style="margin:8px 0;padding:10px 12px;background:var(--glass);border:1px solid var(--gborder);border-radius:6px">';
      h+='<div style="font-size:10px;color:var(--t4);text-transform:uppercase;font-weight:700;margin-bottom:4px">Webhook URL (copy to Read.ai)</div>';
      h+='<div style="font-size:11px;color:var(--t2);word-break:break-all;font-family:monospace">'+esc(wUrl)+'</div>';
      h+='</div>'}

    /* Action buttons */
    h+='<div class="intg-actions">';
    h+='<button class="btn" onclick="TF.testIntegrationBtn(\''+plat.id+'\')" style="font-size:12px;padding:6px 14px">Test Connection</button>';
    h+='<button class="btn btn-p" onclick="TF.saveIntegrationBtn(\''+plat.id+'\')" style="font-size:12px;padding:6px 14px">Save</button>';
    if(plat.oauth&&!isConnected){
      h+='<button class="btn btn-go" onclick="TF.connectGmail()" style="font-size:12px;padding:6px 14px">'+icon('mail',11)+' Connect Gmail</button>'}
    if(isConnected){
      h+='<button class="btn btn-go" onclick="TF.triggerSync(\''+plat.id.replace(/_/g,'-')+'\')" style="font-size:12px;padding:6px 14px">'+icon('refresh',11)+' Sync Now</button>';
      h+='<button class="btn" onclick="TF.deleteIntegrationBtn(\''+plat.id+'\')" style="font-size:12px;padding:6px 14px;color:var(--red);border-color:rgba(255,0,0,0.2)">Disconnect</button>';
    }
    h+='</div>';

    /* Test result area */
    h+='<div class="intg-test-result" id="intg-result-'+plat.id+'"></div>';

    h+='</div>';
  });

  h+='<div style="margin-top:16px;padding:16px;border-top:1px solid var(--gborder)">';
  h+='<button class="btn" onclick="TF.cleanupDuplicates()" style="font-size:12px;padding:6px 14px;color:var(--t2)">'+icon('refresh',11)+' Remove Duplicate Records</button>';
  h+='<span style="font-size:11px;color:var(--t4);margin-left:8px">Removes records created by live sync that duplicate CSV imports</span>';
  h+='</div>';

  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
}

function intgGetFields(platformId){
  var plat=INTG_PLATFORMS.find(function(p){return p.id===platformId});
  if(!plat)return{credentials:{},config:{}};
  var creds={},config={};
  plat.fields.forEach(function(f){
    var el=gel('intg-'+platformId+'-'+f.key);
    if(el&&el.value)creds[f.key]=el.value;
  });
  plat.configFields.forEach(function(f){
    var el=gel('intg-cfg-'+platformId+'-'+f.key);
    if(el&&el.value)config[f.key]=el.value;
  });
  return{credentials:creds,config:config};
}

async function testIntegrationBtn(platformId){
  var vals=intgGetFields(platformId);
  var resultEl=gel('intg-result-'+platformId);
  if(resultEl)resultEl.innerHTML='<span style="color:var(--t3)">Testing...</span>';
  var result=await testIntegrationConnection(platformId,vals.credentials,vals.config);
  if(!resultEl)return;
  if(result&&result.success){
    var msg='Connection successful!';
    if(result.accounts)msg+=' Found '+result.accounts.length+' account(s).';
    if(result.organization)msg+=' Org: '+result.organization;
    var extraHtml='';
    /* Show organizations list for Zoho Books */
    if(result.organizations&&result.organizations.length){
      msg+=' '+result.organizations.length+' org(s):';
      extraHtml='<div style="margin-top:6px;font-size:11px;color:var(--t2)">';
      result.organizations.forEach(function(o){
        var rec=result.recommended_org_id&&o.id===result.recommended_org_id;
        extraHtml+='<div style="margin:2px 0'+(rec?';font-weight:700;color:var(--green)':'')+'">'
          +esc(o.name)+' — ID: <code>'+esc(String(o.id))+'</code>'
          +(o.invoices!==undefined?' ('+o.invoices+' invoices)':'')
          +(o.is_default?' [default]':'')
          +(rec?' ★ recommended':'')
          +'</div>';
      });
      extraHtml+='</div>';
    }
    resultEl.innerHTML='<span style="color:var(--green)">'+esc(msg)+'</span>'+extraHtml;
    /* If test returned a refresh_token (Zoho code exchange), populate it into the form */
    if(result.refresh_token){
      var rtEl=gel('intg-'+platformId+'-refresh_token');
      if(rtEl)rtEl.value=result.refresh_token;
      /* Clear the auth code field since it's been used */
      var codeEl=gel('intg-'+platformId+'-code');
      if(codeEl)codeEl.value='';
    }
    /* Auto-fill recommended org_id for Zoho Books */
    if(result.recommended_org_id&&platformId==='zoho_books'){
      var orgEl=gel('intg-cfg-zoho_books-organization_id');
      if(orgEl&&!orgEl.value)orgEl.value=result.recommended_org_id;
    }
  }else{
    resultEl.innerHTML='<span style="color:var(--red)">Failed: '+esc((result&&result.error)||'Unknown error')+'</span>';
  }
}

async function saveIntegrationBtn(platformId){
  var vals=intgGetFields(platformId);
  if(!Object.keys(vals.credentials).length&&!Object.keys(vals.config).length){toast('Enter credentials first','warn');return}
  var ok=await saveIntegrationCredentials(platformId,vals.credentials,vals.config);
  if(ok){toast(platformId+' credentials saved','ok');openIntegrationsModal()}
}

async function deleteIntegrationBtn(platformId){
  if(!confirm('Disconnect '+platformId+'? This will remove stored credentials.'))return;
  var ok=await deleteIntegration(platformId);
  if(ok){toast(platformId+' disconnected','ok');openIntegrationsModal()}
}

/* ═══════════ GMAIL OAUTH CONNECT ═══════════ */
async function connectGmail(){
  /* First save client_id & client_secret if entered */
  var vals=intgGetFields('gmail');
  if(!vals.credentials.client_id||!vals.credentials.client_secret){
    toast('Enter your Client ID and Client Secret first','warn');return;
  }
  await saveIntegrationBtn('gmail');

  /* Get the OAuth URL from the server */
  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session){toast('Not signed in','warn');return}
    var token=sess.data.session.access_token;
    var resp=await fetch('/api/auth/gmail-connect',{headers:{'Authorization':'Bearer '+token}});
    var data=await resp.json();
    if(!resp.ok||data.error){toast(data.error||'Failed to get OAuth URL','warn');return}

    /* Open Google consent screen in popup */
    var popup=window.open(data.url,'gmail-oauth','width=600,height=700,left=200,top=100');
    if(!popup){toast('Popup blocked — please allow popups for this site','warn');return}

    /* Listen for the postMessage callback from the OAuth callback page */
    function onGmailConnected(e){
      if(e.data==='gmail-connected'){
        window.removeEventListener('message',onGmailConnected);
        toast('Gmail connected!','ok');
        loadIntegrations().then(function(){loadGmailThreads();openIntegrationsModal()});
      }
    }
    window.addEventListener('message',onGmailConnected);
  }catch(e){toast('Gmail connect error: '+e.message,'warn')}
}

/* ═══════════ COMPOSE EMAIL MODAL ═══════════ */
function openComposeEmail(opts){
  opts=opts||{};
  var isReply=!!opts.replyToThreadId;
  var isForward=!!opts.isForward;
  var title=isReply?'Reply':isForward?'Forward':'New Email';

  /* Flag that compose is active so closeModal() only shows draft prompt for compose */
  window._composeModalActive=true;

  /* Reset compose state */
  window._composeRecipients={to:[],cc:[],bcc:[]};
  window._composeAttachments=[];
  if(opts.to)window._composeRecipients.to=opts.to.split(',').map(function(s){return s.trim()}).filter(Boolean);
  if(opts.cc)window._composeRecipients.cc=opts.cc.split(',').map(function(s){return s.trim()}).filter(Boolean);

  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('mail',14)+' '+title+'</span>';
  h+='<button class="email-toolbar-btn" onclick="TF.openSignatureEditor()" title="Email signature" style="margin-right:4px">'+icon('settings',13)+'</button>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="edf-body" style="padding:12px 16px">';

  /* ── Recipient fields (chip-style) ── */
  function recipientField(field,label,show){
    var s='<div class="ed-fld" id="compose-'+field+'-wrap" style="position:relative;'+(show?'':'display:none')+'">';
    s+='<span class="ed-lbl">'+label+'</span>';
    s+='<div class="compose-recipient-wrap" onclick="var i=gel(\'compose-'+field+'-input\');if(i)i.focus()">';
    s+='<span id="compose-'+field+'-chips"></span>';
    s+='<input class="compose-recipient-input" id="compose-'+field+'-input" placeholder="Add recipients..."';
    s+=' oninput="TF.acRecipient(\''+field+'\')" onkeydown="TF.recipientKeydown(\''+field+'\',event)"';
    s+=' onfocus="TF.acRecipient(\''+field+'\')" onblur="setTimeout(function(){var d=gel(\'compose-'+field+'-ac\');if(d)d.classList.remove(\'open\')},200)">';
    s+='<div class="compose-ac-dropdown" id="compose-'+field+'-ac"></div>';
    s+='</div></div>';
    return s}

  h+=recipientField('to','To',true);
  h+=recipientField('cc','Cc',!!opts.cc);
  h+=recipientField('bcc','Bcc',false);

  /* Toggle links for Cc/Bcc */
  var toggleLinks='';
  if(!opts.cc)toggleLinks+='<a href="#" id="compose-show-cc" onclick="event.preventDefault();gel(\'compose-cc-wrap\').style.display=\'block\';this.style.display=\'none\'" style="font-size:11px;color:var(--accent)">Cc</a>';
  toggleLinks+=' <a href="#" id="compose-show-bcc" onclick="event.preventDefault();gel(\'compose-bcc-wrap\').style.display=\'block\';this.style.display=\'none\'" style="font-size:11px;color:var(--accent)">Bcc</a>';
  if(toggleLinks)h+='<div style="margin-bottom:8px;display:flex;gap:12px">'+toggleLinks+'</div>';

  /* Subject */
  h+='<div class="ed-fld"><span class="ed-lbl">Subject</span>';
  h+='<input type="text" class="edf" id="compose-subject" value="'+escAttr(opts.subject||'')+'" placeholder="Subject">';
  h+='</div>';

  /* ── Formatting toolbar + Editor ── */
  h+='<div class="compose-body-wrap">';
  h+='<div class="compose-toolbar">';
  /* Row 1: Font + Size + Text formatting + Color + Clear */
  h+='<div class="compose-toolbar-row">';
  h+='<select class="compose-font-select" onchange="TF.execComposeCmd(\'fontName\',this.value)" title="Font family">';
  h+='<option value="">Font</option><option value="Arial">Arial</option><option value="Georgia">Georgia</option>';
  h+='<option value="Times New Roman">Times New Roman</option><option value="Courier New">Courier New</option>';
  h+='<option value="Verdana">Verdana</option><option value="Trebuchet MS">Trebuchet MS</option></select>';
  h+='<select class="compose-size-select" onchange="TF.execComposeCmd(\'fontSize\',this.value)" title="Font size">';
  h+='<option value="">Size</option><option value="1">Small</option><option value="3" selected>Normal</option>';
  h+='<option value="4">Large</option><option value="5">Huge</option></select>';
  h+='<div class="compose-toolbar-sep"></div>';
  var row1Btns=[
    {cmd:'bold',icon:'bold',title:'Bold (Ctrl+B)'},
    {cmd:'italic',icon:'italic',title:'Italic (Ctrl+I)'},
    {cmd:'underline',icon:'underline',title:'Underline (Ctrl+U)'},
    {cmd:'strikethrough',icon:'strikethrough',title:'Strikethrough'}
  ];
  row1Btns.forEach(function(b){
    h+='<button class="compose-toolbar-btn" data-compose-cmd="'+b.cmd+'" title="'+b.title+'" onclick="event.preventDefault();TF.execComposeCmd(\''+b.cmd+'\')">'+icon(b.icon,12)+'</button>'});
  h+='<div class="compose-toolbar-sep"></div>';
  /* Color pickers */
  h+='<div class="compose-color-wrap"><button class="compose-toolbar-btn" title="Text color" onclick="event.preventDefault();TF.toggleColorPicker(\'text\')"><span style="border-bottom:3px solid #e06666;display:flex">'+icon('type',12)+'</span></button>';
  h+='<div class="compose-color-picker" id="compose-text-color-picker"></div></div>';
  h+='<div class="compose-color-wrap"><button class="compose-toolbar-btn" title="Highlight color" onclick="event.preventDefault();TF.toggleColorPicker(\'bg\')">'+icon('highlighter',12)+'</button>';
  h+='<div class="compose-color-picker" id="compose-bg-color-picker"></div></div>';
  h+='<div class="compose-toolbar-sep"></div>';
  h+='<button class="compose-toolbar-btn" title="Clear formatting" onclick="event.preventDefault();TF.execComposeCmd(\'removeFormat\')">'+icon('eraser',12)+'</button>';
  h+='</div>';
  /* Row 2: Alignment + Lists/Indent/Quote + Link/Emoji/Image + Undo/Redo */
  h+='<div class="compose-toolbar-row">';
  var row2Btns=[
    {cmd:'justifyLeft',icon:'align_left',title:'Align left'},
    {cmd:'justifyCenter',icon:'align_center',title:'Align center'},
    {cmd:'justifyRight',icon:'align_right',title:'Align right'},
    {sep:true},
    {cmd:'insertUnorderedList',icon:'list_ul',title:'Bullet list'},
    {cmd:'insertOrderedList',icon:'list_ol',title:'Numbered list'},
    {cmd:'indent',icon:'indent',title:'Indent more'},
    {cmd:'outdent',icon:'outdent',title:'Indent less'},
    {cmd:'formatBlock_blockquote',icon:'quote',title:'Quote'},
    {sep:true},
    {cmd:'createLink',icon:'link',title:'Insert link'},
  ];
  row2Btns.forEach(function(b){
    if(b.sep){h+='<div class="compose-toolbar-sep"></div>';return}
    h+='<button class="compose-toolbar-btn" data-compose-cmd="'+b.cmd+'" title="'+b.title+'" onclick="event.preventDefault();TF.execComposeCmd(\''+(b.cmd==='formatBlock_blockquote'?'formatBlock\',\'blockquote':b.cmd+'\',\'')+'\')">'+icon(b.icon,12)+'</button>'});
  /* Emoji picker */
  h+='<div class="compose-color-wrap"><button class="compose-toolbar-btn" title="Insert emoji" onclick="event.preventDefault();TF.toggleEmojiPicker()">'+icon('smile',12)+'</button>';
  h+='<div class="compose-emoji-picker" id="compose-emoji-picker"></div></div>';
  h+='<button class="compose-toolbar-btn" title="Insert image" onclick="event.preventDefault();TF.execComposeCmd(\'insertImage\')">'+icon('image',12)+'</button>';
  h+='<div class="compose-toolbar-sep"></div>';
  h+='<button class="compose-toolbar-btn" title="Undo (Ctrl+Z)" onclick="event.preventDefault();TF.execComposeCmd(\'undo\')">'+icon('undo',12)+'</button>';
  h+='<button class="compose-toolbar-btn" title="Redo (Ctrl+Y)" onclick="event.preventDefault();TF.execComposeCmd(\'redo\')">'+icon('redo',12)+'</button>';
  h+='</div>';
  h+='</div>';

  /* Contenteditable editor */
  var bodyContent=opts.body||'';
  /* Add signature for new emails */
  if(!isReply&&!isForward){
    var sig=getEmailSignature();
    if(sig)bodyContent='<br><br><div class="email-signature">--<br>'+sig+'</div>'}
  else if(isReply){
    var sig2=getEmailSignature();
    if(sig2)bodyContent='<br><div class="email-signature">--<br>'+sig2+'</div>'+bodyContent}
  h+='<div class="compose-editor" contenteditable="true" id="compose-body" data-placeholder="Write your message..." onselectionchange="TF.updateComposeToolbar&&TF.updateComposeToolbar()">'+bodyContent+'</div>';

  /* Attachments area */
  h+='<div class="compose-attach-list" id="compose-attach-list" style="display:none"></div>';
  h+='</div>';

  /* Hidden fields for reply context */
  if(opts.replyToThreadId)h+='<input type="hidden" id="compose-threadId" value="'+escAttr(opts.replyToThreadId)+'">';
  if(opts.replyToMessageId)h+='<input type="hidden" id="compose-messageId" value="'+escAttr(opts.replyToMessageId)+'">';

  /* ── Categorization bar ── */
  h+='<div class="compose-cat-bar" id="compose-cat-bar">';
  h+='<div class="compose-cat-header">'+icon('tag',11)+' Categorize <span style="font-weight:400;color:var(--t4)">(required before sending)</span></div>';
  h+='<div class="compose-cat-grid">';
  h+='<div class="ed-fld" style="margin:0"><span class="ed-lbl" style="font-size:10px">Client</span><select class="edf" id="compose-cat-client" onchange="TF.composeCatClientChange()" style="font-size:11px;padding:5px 8px"><option value="">— Select —</option>';
  S.clientRecords.forEach(function(cr){h+='<option value="'+esc(cr.name)+'">'+esc(cr.name)+'</option>'});
  h+='</select></div>';
  h+='<div class="ed-fld" style="margin:0"><span class="ed-lbl" style="font-size:10px">End Client</span><select class="edf" id="compose-cat-ec" onchange="TF.composeCatValidate()" style="font-size:11px;padding:5px 8px"><option value="">— Select —</option></select></div>';
  h+='<div class="ed-fld" style="margin:0"><span class="ed-lbl" style="font-size:10px">Campaign</span><select class="edf" id="compose-cat-campaign" onchange="TF.composeCatValidate()" style="font-size:11px;padding:5px 8px"><option value="">— Select —</option></select></div>';
  h+='<div class="ed-fld" style="margin:0"><span class="ed-lbl" style="font-size:10px">Opportunity</span><select class="edf" id="compose-cat-opportunity" onchange="TF.composeCatValidate()" style="font-size:11px;padding:5px 8px"><option value="">— Select —</option></select></div>';
  h+='</div>';
  h+='<label style="display:flex;align-items:center;gap:6px;margin-top:6px;font-size:11px;color:var(--t3);cursor:pointer"><input type="checkbox" id="compose-cat-none" onchange="TF.composeCatNoneChange()"> None / Internal</label>';
  h+='</div>';

  /* ── Bottom bar ── */
  h+='<div style="display:flex;align-items:center;gap:8px;margin-top:12px">';
  /* Split send button */
  h+='<div class="compose-split-btn">';
  h+='<button class="btn btn-p compose-send-btn" id="compose-send-btn" onclick="TF.sendEmail()" style="font-size:13px;padding:8px 24px;opacity:.5;pointer-events:none;border-radius:10px 0 0 10px" disabled>'+icon('send',12)+' Send</button>';
  h+='<button class="btn btn-p compose-schedule-toggle" id="compose-schedule-toggle" onclick="TF.toggleScheduleMenu()" style="font-size:11px;padding:8px 6px;opacity:.5;pointer-events:none;border-radius:0 10px 10px 0;border-left:1px solid rgba(255,255,255,.2)" disabled>'+icon('chevron_down',10)+'</button>';
  h+='<div class="compose-schedule-menu" id="compose-schedule-menu">';
  h+='<div class="compose-schedule-header">'+icon('clock',12)+' Schedule Send</div>';
  h+='<div class="compose-schedule-note">Emails send when TaskFlow is open in your browser</div>';
  h+='<div class="compose-schedule-opt" onclick="TF.schedulePreset(\'1h\')">In 1 hour</div>';
  h+='<div class="compose-schedule-opt" onclick="TF.schedulePreset(\'tomorrow_am\')">Tomorrow morning (9:00 AM)</div>';
  h+='<div class="compose-schedule-opt" onclick="TF.schedulePreset(\'tomorrow_pm\')">Tomorrow afternoon (2:00 PM)</div>';
  h+='<div class="compose-schedule-opt" onclick="TF.schedulePreset(\'monday\')">Monday morning (9:00 AM)</div>';
  h+='<div class="compose-schedule-custom">';
  h+='<label style="font-size:11px;color:var(--t3)">Custom date & time</label>';
  h+='<input type="datetime-local" class="edf" id="compose-schedule-dt" style="font-size:12px;padding:5px 8px;margin-top:4px">';
  h+='<button class="btn btn-p" onclick="TF.scheduleCustom()" style="font-size:11px;padding:5px 12px;margin-top:6px;width:100%">Schedule</button>';
  h+='</div></div></div>';
  h+='<button class="btn" onclick="TF.addComposeAttachment()" style="font-size:12px;padding:7px 14px">'+icon('paperclip',12)+' Attach</button>';
  if(isReply){h+='<button class="btn ai-draft-btn" id="ai-draft-btn" onclick="TF.toggleComposeDraftPrompt()" style="font-size:12px;padding:7px 14px;background:rgba(16,163,127,.12);border-color:rgba(16,163,127,.3);color:#10A37F" title="Draft reply using your knowledge base">'+icon('sparkle',12)+' AI Draft</button>'}
  h+='<div style="flex:1"></div>';
  h+='<button class="btn" onclick="TF.closeModal()" style="font-size:12px;padding:7px 14px">Discard</button>';
  h+='</div>';
  /* AI Draft prompt input for compose modal */
  if(isReply){
    h+='<div class="ai-draft-prompt-wrap" id="compose-ai-draft-prompt">';
    h+='<input class="ai-draft-prompt-input" id="compose-ai-draft-input" placeholder="What should the reply focus on? (optional, press Enter or click Draft)"';
    h+=' onkeydown="if(event.key===\'Enter\'){event.preventDefault();TF.aiDraft()}">';
    h+='<button class="ai-draft-prompt-go" onclick="TF.aiDraft()">'+icon('sparkle',10)+' Draft</button>';
    h+='</div>'}
  h+='</div>';

  gel('m-body').innerHTML=h;
  /* Add wide class to modal */
  var modal=gel('modal');modal.classList.add('on');
  var inner=modal.querySelector('.tf-modal-inner')||modal;
  inner.classList.add('tf-modal-wide');

  /* Draft tracking */
  window._composeDraftId=opts._draftId||null;
  if(window._composeDraftTimer)clearInterval(window._composeDraftTimer);
  window._composeDraftTimer=setInterval(function(){
    if(!gel('compose-body')){clearInterval(window._composeDraftTimer);return}
    window._composeDraftId=_saveDraft(window._composeDraftId)},10000);

  /* Render initial chips */
  setTimeout(function(){
    /* Restore draft recipients if coming from a draft */
    if(opts._draftRecipients){
      window._composeRecipients.to=opts._draftRecipients.to||[];
      window._composeRecipients.cc=opts._draftRecipients.cc||[];
      window._composeRecipients.bcc=opts._draftRecipients.bcc||[];
      if(opts._draftRecipients.cc.length){var ccw=gel('compose-cc-wrap');if(ccw)ccw.style.display='block';var ccl=gel('compose-show-cc');if(ccl)ccl.style.display='none'}
      if(opts._draftRecipients.bcc.length){var bccw=gel('compose-bcc-wrap');if(bccw)bccw.style.display='block';var bccl=gel('compose-show-bcc');if(bccl)bccl.style.display='none'}
    }
    renderRecipientChips('to');renderRecipientChips('cc');renderRecipientChips('bcc');
    /* Focus editor for new, or To for forward */
    if(isForward){var ti=gel('compose-to-input');if(ti)ti.focus()}
    else if(!isReply&&!opts._draftId){var ed=gel('compose-body');if(ed){ed.focus();
      /* Move cursor to beginning */
      var sel=window.getSelection();var rng=document.createRange();rng.setStart(ed,0);rng.collapse(true);sel.removeAllRanges();sel.addRange(rng)}}
    /* Listen for selection changes to update toolbar */
    document.addEventListener('selectionchange',updateComposeToolbar);
    /* Close color/emoji pickers on outside click */
    document.addEventListener('mousedown',function _closePickers(e){
      if(!gel('compose-body')){document.removeEventListener('mousedown',_closePickers);return}
      if(!e.target.closest('.compose-color-wrap')){
        document.querySelectorAll('.compose-color-picker,.compose-emoji-picker').forEach(function(p){p.classList.remove('open')})}});
    /* Restore draft categorization */
    if(opts._draftCat){
      var dc=opts._draftCat;
      if(dc.none){var nb=gel('compose-cat-none');if(nb){nb.checked=true;composeCatNoneChange()}}
      else{
        if(dc.client){var cs=gel('compose-cat-client');if(cs){cs.value=dc.client;composeCatClientChange()}}
        setTimeout(function(){
          if(dc.ec){var es=gel('compose-cat-ec');if(es)es.value=dc.ec}
          if(dc.campaign){var cps=gel('compose-cat-campaign');if(cps)cps.value=dc.campaign}
          if(dc.opp){var os=gel('compose-cat-opportunity');if(os)os.value=dc.opp}
          _composeCatValidate()},100)}
    }else{
      /* Auto-detect CRM context from recipients */
      _composeCatAutoDetect();}
  },50)}

function _composeCatAutoDetect(){
  var allRecips=[].concat(window._composeRecipients.to||[],window._composeRecipients.cc||[]);
  if(!allRecips.length)return;
  var ctx=resolveThreadCrmContext('',allRecips.join(','),'');
  if(ctx.primaryClient){
    var sel=gel('compose-cat-client');if(sel){sel.value=ctx.primaryClient.clientName;composeCatClientChange()}}
  if(ctx.primaryEndClient){
    setTimeout(function(){var sel=gel('compose-cat-ec');if(sel)sel.value=ctx.primaryEndClient},50)}
  if(ctx.campaigns.length){
    setTimeout(function(){var sel=gel('compose-cat-campaign');if(sel)sel.value=ctx.campaigns[0].id},100)}
  if(ctx.opportunities.length){
    setTimeout(function(){var sel=gel('compose-cat-opportunity');if(sel)sel.value=ctx.opportunities[0].id},100)}
  setTimeout(_composeCatValidate,150)}

function composeCatClientChange(){
  var client=(gel('compose-cat-client')||{}).value||'';
  /* Refresh end-client options */
  var ecSel=gel('compose-cat-ec');if(ecSel){
    var oh='<option value="">— Select —</option>';
    var ecs=[];
    S.campaigns.forEach(function(c){if(!client||c.partner===client){if(c.endClient&&ecs.indexOf(c.endClient)===-1)ecs.push(c.endClient)}});
    S.tasks.concat(S.done).forEach(function(t){if(!client||t.client===client){if(t.endClient&&ecs.indexOf(t.endClient)===-1)ecs.push(t.endClient)}});
    S.opportunities.forEach(function(o){if(!client||o.client===client){if(o.endClient&&ecs.indexOf(o.endClient)===-1)ecs.push(o.endClient)}});
    ecs.sort().forEach(function(ec){oh+='<option value="'+esc(ec)+'">'+esc(ec)+'</option>'});
    ecSel.innerHTML=oh}
  /* Refresh campaign options */
  var cpSel=gel('compose-cat-campaign');if(cpSel){
    var ch='<option value="">— Select —</option>';
    S.campaigns.filter(function(c){return!client||c.partner===client}).forEach(function(c){
      ch+='<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>'});
    cpSel.innerHTML=ch}
  /* Refresh opportunity options */
  var opSel=gel('compose-cat-opportunity');if(opSel){
    var oph='<option value="">— Select —</option>';
    S.opportunities.filter(function(o){return!o.closedAt&&(!client||o.client===client)}).forEach(function(o){
      oph+='<option value="'+esc(o.id)+'">'+esc(o.name)+'</option>'});
    opSel.innerHTML=oph}
  _composeCatValidate()}

function composeCatNoneChange(){
  var none=gel('compose-cat-none');
  if(none&&none.checked){
    ['compose-cat-client','compose-cat-ec','compose-cat-campaign','compose-cat-opportunity'].forEach(function(id){
      var el=gel(id);if(el){el.value='';el.disabled=true}})
  }else{
    ['compose-cat-client','compose-cat-ec','compose-cat-campaign','compose-cat-opportunity'].forEach(function(id){
      var el=gel(id);if(el)el.disabled=false})
  }
  _composeCatValidate()}

function _composeCatValidate(){
  var btn=gel('compose-send-btn');if(!btn)return;
  var schedBtn=gel('compose-schedule-toggle');
  var none=gel('compose-cat-none');
  var client=(gel('compose-cat-client')||{}).value||'';
  var ec=(gel('compose-cat-ec')||{}).value||'';
  var camp=(gel('compose-cat-campaign')||{}).value||'';
  var opp=(gel('compose-cat-opportunity')||{}).value||'';
  var valid=(none&&none.checked)||client||ec||camp||opp;
  btn.disabled=!valid;
  btn.style.opacity=valid?'1':'.5';
  btn.style.pointerEvents=valid?'auto':'none';
  if(schedBtn){schedBtn.disabled=!valid;schedBtn.style.opacity=valid?'1':'.5';schedBtn.style.pointerEvents=valid?'auto':'none'}}

/* ═══════════ AI DRAFT (Knowledge Base) ═══════════ */
function toggleComposeDraftPrompt(){
  var wrap=gel('compose-ai-draft-prompt');
  if(!wrap)return;
  if(wrap.classList.contains('open')){wrap.classList.remove('open');return}
  wrap.classList.add('open');
  var inp=gel('compose-ai-draft-input');if(inp)inp.focus()}

async function aiDraft(){
  var threadId=(gel('compose-threadId')||{}).value||'';
  if(!threadId){toast('AI Draft is available when replying to an email','info');return}
  var btn=gel('ai-draft-btn');
  if(btn){btn.disabled=true;btn.innerHTML=icon('sparkle',12)+' Drafting...';btn.style.opacity='.6'}

  /* Get custom prompt if present */
  var promptInput=gel('compose-ai-draft-input');
  var customPrompt=promptInput?promptInput.value.trim():'';

  try{
    /* Get auth token */
    var sess=await _sb.auth.getSession();
    if(!sess.data||!sess.data.session){toast('Not authenticated','warn');return}
    var token=sess.data.session.access_token;

    /* Get the cached thread messages */
    var thread=S._gmailCache&&S._gmailCache[threadId];
    var messages=[];
    if(thread&&thread.messages){
      messages=thread.messages.map(function(m){return{from:m.from,fromName:m.fromName,date:m.date,body:m.body,subject:m.subject}})
    }
    if(!messages.length){
      /* Fetch thread from API if not cached */
      var resp=await fetch('/api/gmail/thread?id='+threadId,{headers:{'Authorization':'Bearer '+token}});
      if(resp.ok){
        var data=await resp.json();
        messages=(data.messages||[]).map(function(m){return{from:m.from,fromName:m.fromName,date:m.date,body:m.body,subject:m.subject}})
      }
    }
    if(!messages.length){toast('Could not load email thread','warn');return}

    /* Get subject and client context */
    var subject=(gel('compose-subject')||{}).value||messages[0].subject||'';
    var gmailThread=S.gmailThreads.find(function(t){return t.threadId===threadId});
    var clientId=gmailThread?gmailThread.clientId||gmailThread.client_id:null;

    /* Build payload with optional custom prompt */
    var payload={threadId:threadId,messages:messages,subject:subject,clientId:clientId};
    if(customPrompt)payload.customPrompt=customPrompt;

    /* Call AI Draft endpoint */
    var draftResp=await fetch('/api/knowledge/ai-draft',{
      method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });

    if(!draftResp.ok){
      var errData=await draftResp.json().catch(function(){return{}});
      throw new Error(errData.error||'AI Draft failed (HTTP '+draftResp.status+')')
    }

    var result=await draftResp.json();
    var draft=result.draft||'';
    if(!draft){toast('AI could not generate a draft','warn');return}

    /* Insert draft into editor (before signature if present) */
    var editor=gel('compose-body');
    if(editor){
      var sig=editor.querySelector('.email-signature');
      if(sig){
        /* Insert before signature */
        var draftDiv=document.createElement('div');
        draftDiv.innerHTML=draft;
        editor.insertBefore(draftDiv,sig);
        /* Add spacing */
        var br=document.createElement('br');
        editor.insertBefore(br,sig)
      }else{
        editor.innerHTML=draft+editor.innerHTML
      }
    }

    /* Hide prompt and clear */
    var promptWrap=gel('compose-ai-draft-prompt');
    if(promptWrap)promptWrap.classList.remove('open');
    if(promptInput)promptInput.value='';

    /* Show sources info */
    var sources=result.sources||[];
    if(sources.length>0){
      var srcList=sources.slice(0,5).map(function(s){return s.source_type+': '+s.title+' ('+s.similarity+'%)'});
      /* Show sources panel below editor */
      var srcPanel=gel('ai-draft-sources');
      if(!srcPanel){
        srcPanel=document.createElement('div');
        srcPanel.id='ai-draft-sources';
        srcPanel.style.cssText='margin-top:8px;padding:8px 12px;background:rgba(16,163,127,.06);border:1px solid rgba(16,163,127,.15);border-radius:8px;font-size:11px;color:var(--t3)';
        var editorWrap=editor.closest('.compose-body-wrap');
        if(editorWrap)editorWrap.parentNode.insertBefore(srcPanel,editorWrap.nextSibling)
      }
      srcPanel.innerHTML='<div style="font-weight:600;color:#10A37F;margin-bottom:4px">'+icon('sparkle',10)+' Knowledge sources used ('+sources.length+')</div>'+
        srcList.map(function(s){return '<div style="padding:1px 0">'+s+'</div>'}).join('')
    }

    toast('Draft generated from '+sources.length+' knowledge sources','ok')
  }catch(e){
    console.error('aiDraft error:',e);
    toast(e.message||'AI Draft failed','err')
  }finally{
    if(btn){btn.disabled=false;btn.innerHTML=icon('sparkle',12)+' AI Draft';btn.style.opacity='1'}
  }
}

async function sendEmail(){
  var to=window._composeRecipients.to.join(', ');
  var cc=window._composeRecipients.cc.join(', ');
  var bcc=window._composeRecipients.bcc.join(', ');
  var subject=(gel('compose-subject')||{}).value||'';
  var editor=gel('compose-body');
  var body=editor?editor.innerHTML:'';
  var threadId=(gel('compose-threadId')||{}).value||'';
  var messageId=(gel('compose-messageId')||{}).value||'';

  if(!to){toast('Add at least one recipient','warn');return}
  if(!body||body==='<br>'||body==='<div><br></div>'){toast('Write a message','warn');return}

  /* Wrap in styled div */
  var htmlBody='<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',system-ui,sans-serif;font-size:14px;line-height:1.5">'+body+'</div>';

  var payload={to:to,subject:subject,body:htmlBody};
  if(cc)payload.cc=cc;
  if(bcc)payload.bcc=bcc;
  if(threadId)payload.threadId=threadId;
  if(messageId)payload.messageId=messageId;
  if(window._composeAttachments.length){
    payload.attachments=window._composeAttachments.map(function(a){
      return{filename:a.filename,mimeType:a.mimeType,data:a.data}})}

  try{
    toast('Sending...','info');
    var sess=await _sb.auth.getSession();
    if(!sess.data.session){toast('Not signed in','warn');return}
    var token=sess.data.session.access_token;

    var resp=await fetch('/api/gmail/send',{
      method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(payload)});
    var data=await resp.json();
    if(!resp.ok||data.error){throw new Error(data.error||'Send failed')}

    /* Capture categorization for email timer */
    var _catClient=(gel('compose-cat-client')||{}).value||'';
    var _catEC=(gel('compose-cat-ec')||{}).value||'';
    var _catCampaign=(gel('compose-cat-campaign')||{}).value||'';
    var _catOpp=(gel('compose-cat-opportunity')||{}).value||'';
    if(S._emailTimer&&threadId&&S._emailTimer.threadId===threadId){
      S._emailTimer.categorization={client:_catClient,endClient:_catEC,campaignId:_catCampaign,opportunityId:_catOpp}}

    /* Persist categorization to gmail_threads */
    if(threadId&&(_catClient||_catEC||_catCampaign||_catOpp)){
      var _catClientId='';
      if(_catClient){var _cr=S.clientRecords.find(function(r){return r.name===_catClient});if(_cr)_catClientId=_cr.id}
      _sb.from('gmail_threads').update({
        client_id:_catClientId||null,end_client:_catEC,
        campaign_id:_catCampaign||null,opportunity_id:_catOpp||null
      }).eq('thread_id',threadId).then(function(){
        /* Update local cache too */
        var cached=S.gmailThreads.find(function(t){return t.thread_id===threadId});
        if(cached){cached.client_id=_catClientId;cached.end_client=_catEC;cached.campaign_id=_catCampaign;cached.opportunity_id=_catOpp}
        S._threadCrmCache={}})}

    toast('Email sent!','ok');
    /* Clean up draft */
    if(window._composeDraftTimer){clearInterval(window._composeDraftTimer);window._composeDraftTimer=null}
    if(window._composeDraftId){_deleteDraft(window._composeDraftId);window._composeDraftId=null}
    /* Clean up compose state */
    document.removeEventListener('selectionchange',updateComposeToolbar);
    window._composeAttachments=[];
    var inner=gel('modal').querySelector('.tf-modal-inner')||gel('modal');
    inner.classList.remove('tf-modal-wide');
    /* Close without draft prompt — we already handled it */
    var dm=gel('detail-modal');dm.classList.remove('on');dm.classList.remove('full-detail');var m=gel('modal');if(m)m.classList.remove('on');

    /* Auto-archive replies/forwards */
    if(threadId){archiveEmail(threadId)}
  }catch(e){toast('Send failed: '+e.message,'warn')}}

/* ── Schedule Send helpers ── */
function toggleScheduleMenu(){
  var menu=gel('compose-schedule-menu');if(!menu)return;
  menu.classList.toggle('open');
  /* Set default datetime-local value to tomorrow 9am */
  if(menu.classList.contains('open')){
    var dt=gel('compose-schedule-dt');
    if(dt&&!dt.value){
      var tm=new Date();tm.setDate(tm.getDate()+1);tm.setHours(9,0,0,0);
      dt.value=tm.toISOString().slice(0,16)}}}

function schedulePreset(preset){
  var dt=new Date();
  if(preset==='1h'){dt.setHours(dt.getHours()+1)}
  else if(preset==='tomorrow_am'){dt.setDate(dt.getDate()+1);dt.setHours(9,0,0,0)}
  else if(preset==='tomorrow_pm'){dt.setDate(dt.getDate()+1);dt.setHours(14,0,0,0)}
  else if(preset==='monday'){
    var day=dt.getDay();var add=day===0?1:(8-day);
    dt.setDate(dt.getDate()+add);dt.setHours(9,0,0,0)}
  scheduleEmail(dt.toISOString())}

function scheduleCustom(){
  var dt=gel('compose-schedule-dt');if(!dt||!dt.value){toast('Pick a date and time','warn');return}
  var parsed=new Date(dt.value);
  if(isNaN(parsed.getTime())){toast('Invalid date','warn');return}
  if(parsed<=new Date()){toast('Pick a future date','warn');return}
  scheduleEmail(parsed.toISOString())}

/* ═══════════ EMAIL RULES MODAL ═══════════ */
function openEmailRulesModal(){
  var h='<h2 style="margin-bottom:16px">'+icon('filter',16)+' Email Rules</h2>';
  h+='<p style="font-size:12px;color:var(--t3);margin-bottom:16px">Rules automatically categorize incoming emails based on conditions you define.</p>';
  h+='<button class="btn btn-p" onclick="TF.openAddRuleModal()" style="font-size:12px;padding:7px 14px;margin-bottom:16px">+ Add Rule</button>';
  var rules=S.emailRules||[];
  if(!rules.length){
    h+='<div style="text-align:center;padding:24px;color:var(--t4)">No rules yet. Click "Add Rule" to create one.</div>'}
  else{
    rules.forEach(function(r){
      var condSummary=r.conditions.map(function(c){return _ruleCondLabel(c.type)+' "'+esc(c.value||'')+'"'}).join(' AND ');
      var actSummary=r.actions.map(function(a){return _ruleActLabel(a.type)+' → '+esc(_ruleActValueLabel(a))}).join(', ');
      h+='<div class="rule-card'+(r.isActive?'':' rule-disabled')+'">';
      h+='<div class="rule-card-head">';
      h+='<div class="rule-card-name">'+esc(r.name)+'</div>';
      h+='<div class="rule-card-actions">';
      h+='<label class="rule-toggle"><input type="checkbox" '+(r.isActive?'checked':'')+' onchange="TF.toggleEmailRule(\''+esc(r.id)+'\',this.checked)"><span class="rule-toggle-slider"></span></label>';
      h+='<button class="btn" onclick="TF.openEditRuleModal(\''+esc(r.id)+'\')" style="font-size:10px;padding:3px 8px">Edit</button>';
      h+='<button class="btn" onclick="TF.deleteEmailRule(\''+esc(r.id)+'\')" style="font-size:10px;padding:3px 8px">'+icon('trash',10)+'</button>';
      h+='</div></div>';
      h+='<div class="rule-card-detail"><strong>When:</strong> '+condSummary+'</div>';
      h+='<div class="rule-card-detail"><strong>Then:</strong> '+actSummary+'</div>';
      h+='</div>'})}
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

function _ruleCondLabel(type){
  var map={from_domain_equals:'From domain equals',from_email_contains:'From email contains',
    subject_contains:'Subject contains',to_or_cc_contains:'To/CC contains',
    any_participant_domain:'Any participant domain'};
  return map[type]||type}

function _ruleActLabel(type){
  var map={assign_client:'Assign client',assign_end_client:'Assign end client',
    assign_campaign:'Assign campaign',assign_opportunity:'Assign opportunity',
    auto_archive:'Auto-archive'};
  return map[type]||type}

function _ruleActValueLabel(act){
  if(act.type==='assign_client'){var cr=S.clientRecords.find(function(r){return r.name===act.value});return cr?cr.name:(act.value||'')}
  if(act.type==='assign_campaign'){var cp=S.campaigns.find(function(c){return c.id===act.value});return cp?cp.name:(act.value||'')}
  if(act.type==='assign_opportunity'){var op=S.opportunities.find(function(o){return o.id===act.value});return op?op.name:(act.value||'')}
  if(act.type==='auto_archive')return'Yes';
  return act.value||''}

function openAddRuleModal(){_openRuleEditor(null)}
function openEditRuleModal(id){
  var rule=(S.emailRules||[]).find(function(r){return r.id===id});
  if(!rule){toast('Rule not found','warn');return}
  _openRuleEditor(rule)}

function _openRuleEditor(rule){
  window._editingRule=rule?{id:rule.id,name:rule.name,conditions:JSON.parse(JSON.stringify(rule.conditions)),
    actions:JSON.parse(JSON.stringify(rule.actions)),isActive:rule.isActive,priority:rule.priority}
    :{id:null,name:'',conditions:[{type:'from_domain_equals',value:''}],actions:[{type:'assign_client',value:''}],isActive:true,priority:0};
  _renderRuleEditor()}

function _renderRuleEditor(){
  var r=window._editingRule;if(!r)return;
  var h='<h2 style="margin-bottom:16px">'+(r.id?'Edit':'New')+' Email Rule</h2>';
  h+='<div class="ed-fld"><span class="ed-lbl">Rule Name</span>';
  h+='<input type="text" class="edf" id="rule-name" value="'+escAttr(r.name)+'" placeholder="e.g. Auto-categorize Acme emails" onchange="window._editingRule.name=this.value"></div>';

  /* Conditions */
  h+='<div style="margin-bottom:12px"><span class="ed-lbl">When all of these match:</span></div>';
  r.conditions.forEach(function(cond,i){
    h+='<div class="rule-editor-row">';
    h+='<select class="edf rule-cond-type" onchange="TF.ruleCondTypeChange('+i+',this.value)" style="flex:1;font-size:11px;padding:5px">';
    ['from_domain_equals','from_email_contains','subject_contains','to_or_cc_contains','any_participant_domain'].forEach(function(t){
      h+='<option value="'+t+'"'+(cond.type===t?' selected':'')+'>'+_ruleCondLabel(t)+'</option>'});
    h+='</select>';
    h+='<input type="text" class="edf" value="'+escAttr(cond.value||'')+'" placeholder="Value..." onchange="TF.ruleCondValueChange('+i+',this.value)" style="flex:1;font-size:11px;padding:5px">';
    h+='<button class="btn" onclick="TF.removeRuleCond('+i+')" style="font-size:10px;padding:3px 6px">'+icon('x',10)+'</button>';
    h+='</div>'});
  h+='<button class="btn" onclick="TF.addRuleCond()" style="font-size:11px;padding:4px 10px;margin-bottom:16px">+ Add condition</button>';

  /* Actions */
  h+='<div style="margin-bottom:12px"><span class="ed-lbl">Then do:</span></div>';
  r.actions.forEach(function(act,i){
    h+='<div class="rule-editor-row">';
    h+='<select class="edf rule-act-type" onchange="TF.ruleActTypeChange('+i+',this.value)" style="flex:1;font-size:11px;padding:5px">';
    ['assign_client','assign_end_client','assign_campaign','assign_opportunity','auto_archive'].forEach(function(t){
      h+='<option value="'+t+'"'+(act.type===t?' selected':'')+'>'+_ruleActLabel(t)+'</option>'});
    h+='</select>';
    h+=_ruleActionValueSelector(act,i);
    h+='<button class="btn" onclick="TF.removeRuleAct('+i+')" style="font-size:10px;padding:3px 6px">'+icon('x',10)+'</button>';
    h+='</div>'});
  h+='<button class="btn" onclick="TF.addRuleAct()" style="font-size:11px;padding:4px 10px;margin-bottom:16px">+ Add action</button>';

  h+='<div style="display:flex;gap:8px;margin-top:16px">';
  h+='<button class="btn btn-p" onclick="TF.saveRule()" style="font-size:13px;padding:8px 20px">Save Rule</button>';
  h+='<button class="btn" onclick="TF.openEmailRulesModal()" style="font-size:12px;padding:7px 14px">Cancel</button>';
  h+='</div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

function _ruleActionValueSelector(act,idx){
  if(act.type==='auto_archive')return'<span style="flex:1;font-size:11px;color:var(--t3);padding:5px">Automatically archive</span>';
  if(act.type==='assign_client'){
    var h='<select class="edf" onchange="TF.ruleActValueChange('+idx+',this.value)" style="flex:1;font-size:11px;padding:5px">';
    h+='<option value="">— Select client —</option>';
    S.clientRecords.forEach(function(cr){h+='<option value="'+esc(cr.name)+'"'+(act.value===cr.name?' selected':'')+'>'+esc(cr.name)+'</option>'});
    return h+'</select>'}
  if(act.type==='assign_campaign'){
    var h2='<select class="edf" onchange="TF.ruleActValueChange('+idx+',this.value)" style="flex:1;font-size:11px;padding:5px">';
    h2+='<option value="">— Select campaign —</option>';
    S.campaigns.forEach(function(c){h2+='<option value="'+esc(c.id)+'"'+(act.value===c.id?' selected':'')+'>'+esc(c.name)+'</option>'});
    return h2+'</select>'}
  if(act.type==='assign_opportunity'){
    var h3='<select class="edf" onchange="TF.ruleActValueChange('+idx+',this.value)" style="flex:1;font-size:11px;padding:5px">';
    h3+='<option value="">— Select opportunity —</option>';
    S.opportunities.filter(function(o){return!o.closedAt}).forEach(function(o){h3+='<option value="'+esc(o.id)+'"'+(act.value===o.id?' selected':'')+'>'+esc(o.name)+'</option>'});
    return h3+'</select>'}
  /* assign_end_client — text input */
  return'<input type="text" class="edf" value="'+escAttr(act.value||'')+'" placeholder="End client name..." onchange="TF.ruleActValueChange('+idx+',this.value)" style="flex:1;font-size:11px;padding:5px">'}

/* Rule editor state manipulation */
function addRuleCond(){window._editingRule.conditions.push({type:'from_domain_equals',value:''});_renderRuleEditor()}
function removeRuleCond(i){window._editingRule.conditions.splice(i,1);_renderRuleEditor()}
function ruleCondTypeChange(i,v){window._editingRule.conditions[i].type=v;_renderRuleEditor()}
function ruleCondValueChange(i,v){window._editingRule.conditions[i].value=v}
function addRuleAct(){window._editingRule.actions.push({type:'assign_client',value:''});_renderRuleEditor()}
function removeRuleAct(i){window._editingRule.actions.splice(i,1);_renderRuleEditor()}
function ruleActTypeChange(i,v){window._editingRule.actions[i].type=v;window._editingRule.actions[i].value='';_renderRuleEditor()}
function ruleActValueChange(i,v){window._editingRule.actions[i].value=v}

function saveRule(){
  var r=window._editingRule;if(!r)return;
  r.name=r.name||(gel('rule-name')||{}).value||'Untitled Rule';
  if(!r.conditions.length){toast('Add at least one condition','warn');return}
  if(!r.actions.length){toast('Add at least one action','warn');return}
  /* Validate conditions have values */
  var emptyC=r.conditions.some(function(c){return!c.value});
  if(emptyC){toast('Fill in all condition values','warn');return}
  saveEmailRule(r).then(function(){openEmailRulesModal()})}

function openReplyEmail(msgIdx){
  if(!S.gmailThread||!S.gmailThread.messages||!S.gmailThread.messages.length)return;
  var msgs=S.gmailThread.messages;
  var lastMsg=(typeof msgIdx==='number'&&msgs[msgIdx])?msgs[msgIdx]:msgs[msgs.length-1];
  var subject=lastMsg.subject||'';
  if(subject&&!subject.match(/^Re:/i))subject='Re: '+subject;
  var replyTo=lastMsg.fromEmail||'';
  /* Build HTML reply quote */
  var dateD=new Date(lastMsg.date);
  var dateLabel=MO[dateD.getMonth()]+' '+dateD.getDate()+', '+dateD.getFullYear()+' at '+(dateD.getHours()%12||12)+':'+String(dateD.getMinutes()).padStart(2,'0')+' '+(dateD.getHours()<12?'AM':'PM');
  var quoteBody='<br><br><div style="color:#555">On '+dateLabel+', '+(lastMsg.fromName||lastMsg.fromEmail)+' wrote:<br>';
  quoteBody+='<blockquote style="border-left:3px solid #ccc;padding-left:12px;margin:8px 0;color:#666">'+(lastMsg.body||lastMsg.snippet||'')+'</blockquote></div>';
  openComposeEmail({to:replyTo,subject:subject,body:quoteBody,
    replyToThreadId:S.gmailThread.threadId,replyToMessageId:lastMsg.id})}

/* ── Signature Editor ── */
function openSignatureEditor(){
  var sig=getEmailSignature();
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('settings',14)+' Email Signature</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<div class="edf-body" style="padding:16px">';
  h+='<p style="font-size:12px;color:var(--t3);margin:0 0 12px">Your signature will be automatically added to new emails.</p>';
  h+='<div class="compose-body-wrap">';
  h+='<div class="compose-editor" contenteditable="true" id="sig-editor" data-placeholder="Write your signature..." style="min-height:120px">'+sig+'</div>';
  h+='</div>';
  h+='<div class="intg-actions" style="margin-top:12px">';
  h+='<button class="btn btn-p" onclick="var e=gel(\'sig-editor\');saveEmailSignature(e?e.innerHTML:\'\');TF.closeModal()">Save Signature</button>';
  h+='<button class="btn" onclick="saveEmailSignature(\'\');TF.closeModal()" style="color:var(--red)">Clear Signature</button>';
  h+='</div></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on')}

/* ═══════════ CONTACT MODALS ═══════════ */

function openAddContactModal(clientId,prefill){
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('contact',12)+' Add Contact</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  if(clientId){
    h+='<input type="hidden" id="fc-client-id" value="'+escAttr(clientId)+'">';
  }else{
    /* Client selector — shown when adding from email or global context */
    h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="fc-client-id" onchange="TF.refreshContactEndClients()"><option value="">— No client —</option>';
    (S.clientRecords||[]).forEach(function(cr){
      h+='<option value="'+escAttr(cr.id)+'">'+esc(cr.name)+(cr.status==='lapsed'?' (lapsed)':'')+'</option>'});
    h+='</select></div>';
  }
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">First Name</span><input type="text" class="edf" id="fc-first-name" placeholder="First name" autofocus></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Last Name</span><input type="text" class="edf" id="fc-last-name" placeholder="Last name"></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Email</span><input type="email" class="edf" id="fc-email" placeholder="email@company.com"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Company</span><input type="text" class="edf" id="fc-company" placeholder="Company name"></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Role / Title</span><input type="text" class="edf" id="fc-role" placeholder="e.g. Marketing Manager"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Phone</span><input type="tel" class="edf" id="fc-phone" placeholder="+1 (555) 000-0000"></div>';
  h+='</div>';
  var _fcFilterClient=clientId?(S.clientRecords.find(function(r){return r.id===clientId})||{}).name||'':'';
  var _fcPrefillEC=prefill&&prefill.endClient?prefill.endClient:'';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="fc-end-client" onchange="TF.ecAddNew(\'fc-end-client\')">';
  h+=buildEndClientOptions(_fcPrefillEC,_fcFilterClient);
  h+='</select></div>';
  h+='<div class="ed-actions"><button class="btn btn-p" onclick="TF.saveContact()">Add Contact</button></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  if(prefill){
    if(prefill.email){var fe=gel('fc-email');if(fe)fe.value=prefill.email}
    if(prefill.firstName){var fn=gel('fc-first-name');if(fn)fn.value=prefill.firstName}
    if(prefill.lastName){var ln=gel('fc-last-name');if(ln)ln.value=prefill.lastName}
    if(prefill.clientId&&!clientId){var cs=gel('fc-client-id');if(cs){cs.value=prefill.clientId;if(typeof TF!=='undefined'&&TF.refreshContactEndClients)TF.refreshContactEndClients()}}}
  setTimeout(function(){var n=gel('fc-first-name');if(n)n.focus()},100)}

function openEditContactModal(contactId){
  var c=S.contacts.find(function(cc){return cc.id===contactId});if(!c)return;
  var h='<div class="tf-modal-top"><span class="edf-name" style="flex:1;cursor:default;border-color:transparent;background:transparent">'+icon('contact',12)+' Edit Contact</span>';
  h+='<button class="tf-modal-close" onclick="TF.closeModal()">&times;</button></div>';
  h+='<input type="hidden" id="fc-contact-id" value="'+escAttr(contactId)+'">';
  /* Client selector for edit */
  h+='<div class="ed-fld"><span class="ed-lbl">Client</span><select class="edf" id="fc-client-id" onchange="TF.refreshContactEndClients()"><option value="">— No client —</option>';
  (S.clientRecords||[]).forEach(function(cr){
    h+='<option value="'+escAttr(cr.id)+'"'+(c.clientId===cr.id?' selected':'')+'>'+esc(cr.name)+(cr.status==='lapsed'?' (lapsed)':'')+'</option>'});
  h+='</select></div>';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">First Name</span><input type="text" class="edf" id="fc-first-name" value="'+escAttr(c.firstName)+'" autofocus></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Last Name</span><input type="text" class="edf" id="fc-last-name" value="'+escAttr(c.lastName)+'"></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Email</span><input type="email" class="edf" id="fc-email" value="'+escAttr(c.email)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Company</span><input type="text" class="edf" id="fc-company" value="'+escAttr(c.company)+'"></div>';
  h+='</div>';
  h+='<div class="ed-grid ed-grid-2">';
  h+='<div class="ed-fld"><span class="ed-lbl">Role / Title</span><input type="text" class="edf" id="fc-role" value="'+escAttr(c.role)+'"></div>';
  h+='<div class="ed-fld"><span class="ed-lbl">Phone</span><input type="tel" class="edf" id="fc-phone" value="'+escAttr(c.phone)+'"></div>';
  h+='</div>';
  var _ecFilterClient=(S.clientRecords.find(function(r){return r.id===c.clientId})||{}).name||'';
  h+='<div class="ed-fld"><span class="ed-lbl">End Client</span><select class="edf" id="fc-end-client" onchange="TF.ecAddNew(\'fc-end-client\')">';
  h+=buildEndClientOptions(c.endClient||'',_ecFilterClient);
  h+='</select></div>';
  h+='<div class="ed-actions"><button class="btn btn-p" onclick="TF.saveEditContact()">Save Contact</button>';
  h+='<button class="btn" onclick="TF.confirmDeleteContact(\''+escAttr(contactId)+'\')" style="color:var(--red)">Delete</button></div>';
  gel('m-body').innerHTML=h;gel('modal').classList.add('on');
  setTimeout(function(){var n=gel('fc-first-name');if(n)n.focus()},100)}

async function saveContact(){
  var clientId=(gel('fc-client-id')||{}).value||null;
  var firstName=(gel('fc-first-name')||{}).value||'';
  var lastName=(gel('fc-last-name')||{}).value||'';
  var email=(gel('fc-email')||{}).value||'';
  if(!firstName.trim()&&!lastName.trim()&&!email.trim()){toast('Enter at least a name or email','warn');return}
  var ecVal=(gel('fc-end-client')||{}).value||'';if(ecVal==='__addnew__')ecVal='';
  await dbAddContact(clientId,{firstName:firstName.trim(),lastName:lastName.trim(),email:email.trim(),
    company:(gel('fc-company')||{}).value||'',role:(gel('fc-role')||{}).value||'',phone:(gel('fc-phone')||{}).value||'',
    endClient:ecVal});
  closeModal();
  /* Invalidate CRM + domain caches so pills/smart inboxes update */
  _buildDomainMap();S._threadCrmCache={};
  /* Re-open client dashboard if it was open, otherwise re-render */
  if(S._lastClientDash)openClientDashboard(S._lastClientDash);
  else render()}

async function saveEditContact(){
  var id=(gel('fc-contact-id')||{}).value;if(!id)return;
  var firstName=(gel('fc-first-name')||{}).value||'';
  var lastName=(gel('fc-last-name')||{}).value||'';
  var email=(gel('fc-email')||{}).value||'';
  var ecVal=(gel('fc-end-client')||{}).value||'';if(ecVal==='__addnew__')ecVal='';
  if(!firstName.trim()&&!lastName.trim()&&!email.trim()){toast('Enter at least a name or email','warn');return}
  var clientId=(gel('fc-client-id')||{}).value||null;
  await dbEditContact(id,{firstName:firstName.trim(),lastName:lastName.trim(),email:email.trim(),
    company:(gel('fc-company')||{}).value||'',role:(gel('fc-role')||{}).value||'',phone:(gel('fc-phone')||{}).value||'',
    endClient:ecVal,clientId:clientId});
  closeModal();
  if(S._lastClientDash)openClientDashboard(S._lastClientDash)}

function confirmDeleteContact(id){
  if(!confirm('Delete this contact?'))return;
  dbDeleteContact(id);closeModal();
  if(S._lastClientDash)openClientDashboard(S._lastClientDash)}
