'use strict';

/* ═══════════ SCORING ═══════════ */
function taskScore(t){var td_=today(),u=10;
  if(t.due){var dd=new Date(t.due);dd.setHours(0,0,0,0);var diff=Math.round((dd-td_)/864e5);
    if(diff<0)u=1000+Math.abs(diff)*10;else if(diff===0)u=500;else if(diff===1)u=200;
    else if(diff<=7)u=100+(7-diff)*10;else u=Math.max(0,50-diff)}
  var m=t.importance==='Critical'?3:t.importance==='Important'?2:1;
  var ts=tmrGet(t.id),sb=ts.started?150:(ts.elapsed>0?100:0);
  var score=Math.round((u*m)+(t.est/10)+sb);
  if(S.pins[t.id])score+=5000;
  return score}

/* ═══════════ TIMERS ═══════════ */
function tmrGet(id){return S.timers[id]||{started:null,elapsed:0}}
function tmrElapsed(id){var t=tmrGet(id);return(t.elapsed||0)+(t.started?(Date.now()-t.started)/1000:0)}
function tmrStart(id){var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var t=tmrGet(id);if(t.started)return;t.started=Date.now();S.timers[id]=t;save();
  /* No DB write needed for start — timer is local-only */
  toast('▶ Started: '+task.item,'ok');render();renderSidebar();
  if(gel('detail-modal')&&gel('detail-modal').classList.contains('on')&&gel('d-id')&&gel('d-id').value===id)openDetail(id)}
function tmrPause(id){var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var t=tmrGet(id);if(!t.started)return;t.elapsed=(t.elapsed||0)+(Date.now()-t.started)/1000;t.started=null;S.timers[id]=t;save();
  var mins=Math.round(t.elapsed/60);
  task.duration=mins;
  /* Save duration to database */
  dbUpdateTaskDuration(id,mins);
  toast('⏸ Paused: '+task.item+' ('+fmtM(mins)+')','info');render();renderSidebar();
  if(gel('detail-modal')&&gel('detail-modal').classList.contains('on')&&gel('d-id')&&gel('d-id').value===id)openDetail(id)}
function tmrDone(id){var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var t=tmrGet(id);if(t.started){t.elapsed=(t.elapsed||0)+(Date.now()-t.started)/1000;t.started=null}
  var mins=Math.round((t.elapsed||0)/60);
  if(mins===0&&task.duration>0)mins=task.duration;
  var cards=document.querySelectorAll('[data-task-id]');cards.forEach(function(c){if(c.dataset.taskId===id)c.classList.add('completing')});
  setTimeout(async function(){
    /* Insert into done table */
    var doneData={item:task.item,due:task.due||null,importance:task.importance,category:task.category,
      client:task.client,endClient:task.endClient||'',type:task.type,duration:mins,est:task.est,
      notes:task.notes,campaign:task.campaign||''};
    var result=await dbCompleteTask(doneData);
    if(result){
      /* Delete from tasks table */
      await dbDeleteTask(id);
      /* Update local state */
      S.done.unshift({id:result.id,item:task.item,completed:new Date(),due:task.due||null,importance:task.importance,
        category:task.category,client:task.client,endClient:task.endClient||'',type:task.type,
        duration:mins,est:task.est,notes:task.notes,campaign:task.campaign||''});
      S.tasks=S.tasks.filter(function(tk){return tk.id!==id});delete S.timers[id];save();
      toast('Done: '+task.item+(mins?' ('+fmtM(mins)+')':''),'ok')}
    closeModal();render();renderSidebar()},500)}

/* Timer tick */
setInterval(function(){
  var anyActive=false;
  Object.keys(S.timers).forEach(function(id){if(!S.timers[id].started)return;anyActive=true;
    var els=document.querySelectorAll('[data-tmr="'+CSS.escape(id)+'"]');
    els.forEach(function(el){el.textContent=fmtT(tmrElapsed(id))})});
  if(anyActive)renderSidebar()},1000);

/* ═══════════ SIDEBAR TIMERS ═══════════ */
function renderSidebar(){
  var c=gel('s-active');if(!c)return;
  var h='';
  /* Quick Add */
  h+='<div class="sb-qa"><input type="text" id="qa-item" class="sb-qa-input" placeholder="Quick add task..." onkeydown="if(event.key===\'Enter\')TF.quickAdd()"><button class="sb-qa-btn" onclick="TF.quickAdd()">+</button></div>';
  var active=[];
  Object.keys(S.timers).forEach(function(id){var t=S.timers[id];
    if(t.started||(t.elapsed||0)>0){var task=S.tasks.find(function(tk){return tk.id===id});
      if(task)active.push({task:task,running:!!t.started})}});
  if(!active.length){c.innerHTML=h;return}
  active.sort(function(a,b){if(a.running!==b.running)return a.running?-1:1;return tmrElapsed(b.task.id)-tmrElapsed(a.task.id)});
  h+='<div class="sa-label"><span class="dot pulse" style="margin:0"></span> Active ('+active.length+')</div>';
  active.forEach(function(a){var eid=escAttr(a.task.id);
    h+='<div class="sa-item" onclick="TF.openDetail(\''+eid+'\')">';
    h+='<span class="dot '+(a.running?'pulse':'pau')+'" style="flex-shrink:0"></span>';
    h+='<span class="sa-name">'+esc(a.task.item)+'</span>';
    h+='<span class="sa-time'+(a.running?' running':' paused')+'" data-tmr="'+esc(a.task.id)+'">'+fmtT(tmrElapsed(a.task.id))+'</span>';
    if(a.running)h+='<button class="sa-btn sa-btn-pa" onclick="event.stopPropagation();TF.pause(\''+eid+'\')" title="Pause">⏸</button>';
    else h+='<button class="sa-btn sa-btn-go" onclick="event.stopPropagation();TF.start(\''+eid+'\')" title="Resume">▶</button>';
    h+='</div>'});
  c.innerHTML=h}

/* ═══════════ CHARTS ═══════════ */
function killChart(id){if(charts[id]){charts[id].destroy();delete charts[id]}}
function mkDonut(id,data){var el=gel(id);if(!el)return;killChart(id);var labels=Object.keys(data),vals=labels.map(function(k){return data[k]});var cols=labels.map(function(_,i){return P[i%P.length]});
  charts[id]=new Chart(el,{type:'doughnut',data:{labels:labels,datasets:[{data:vals,backgroundColor:cols,borderWidth:0,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:'#c4b8dc',font:{family:'DM Sans',size:11},padding:10,boxWidth:11}},tooltip:{callbacks:{label:function(c){return c.label+': '+fmtM(c.parsed)}}}}}})}
function mkHBar(id,data){var el=gel(id);if(!el)return;killChart(id);var sorted=Object.keys(data).sort(function(a,b){return data[b]-data[a]});
  charts[id]=new Chart(el,{type:'bar',data:{labels:sorted,datasets:[{data:sorted.map(function(k){return data[k]}),backgroundColor:'rgba(255,0,153,0.45)',hoverBackgroundColor:'rgba(255,0,153,0.65)',borderRadius:6,barThickness:18}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return fmtM(c.parsed.x)}}}},
      scales:{x:{grid:{color:'rgba(130,55,245,0.06)'},ticks:{color:'#8a7ca8',font:{size:10},callback:function(v){return fmtM(v)}}},y:{grid:{display:false},ticks:{color:'#c4b8dc',font:{size:10}}}}}})}
function mkLine(id,labels,vals,color){var el=gel(id);if(!el)return;killChart(id);
  charts[id]=new Chart(el,{type:'line',data:{labels:labels,datasets:[{data:vals,borderColor:color,backgroundColor:color+'12',fill:true,tension:.4,pointRadius:1.5,pointHoverRadius:6,pointBackgroundColor:color,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(130,55,245,0.04)'},ticks:{color:'#8a7ca8',font:{size:9},maxTicksLimit:10}},y:{grid:{color:'rgba(130,55,245,0.04)'},ticks:{color:'#8a7ca8',stepSize:1},beginAtZero:true}}}})}
