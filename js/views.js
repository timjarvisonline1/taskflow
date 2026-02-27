/* ═══════════ RENDER ═══════════ */
function render(){
  buildNav();
  var m=gel('main'),html='';
  /* Mobile: focused 4-view experience */
  if(isMobile()){
    var mobIds=['mob-add','overview','tasks','review'];
    if(mobIds.indexOf(S.view)===-1)S.view='mob-add';
    switch(S.view){case'mob-add':html=rMobAdd();break;case'overview':html=rMobToday();break;case'tasks':html=rMobTasks();break;case'review':html=rReview();break}
    m.innerHTML='<section class="vw on">'+html+'</section>';
    renderSidebar();return}
  /* Desktop: full experience */
  if(S.view==='completed'){S.view='tasks';S.taskMode='done'}
  switch(S.view){case'schedule':html=rSchedule();break;case'overview':html=rOverview();break;case'tasks':html=rTasks();break;case'review':html=rReview();break;
    case'analytics':html=rAnalytics();break;case'meetings':html=rMeetings();break;case'weekly':html=rWeekly();break;case'templates':html=rTemplates();break;case'campaigns':html=rCampaigns();break;case'projects':html=rProjects();break;case'opportunities':html=rOpportunities();break}
  m.innerHTML=renderMeetingPromptBanner()+'<section class="vw on">'+html+'</section>';
  if(S.view==='schedule')initScheduleCharts();
  if(S.view==='overview')initTodayCharts();
  if(S.view==='analytics')initAnalyticsCharts();if(S.view==='projects')initProjectCharts();if(S.view==='opportunities')initOpportunityCharts();renderSidebar()}

/* ═══════════ TASK CARD ═══════════ */
function taskCard(t,td,idx){
  var ts=tmrGet(t.id),running=!!ts.started,hasT=running||(ts.elapsed||0)>0;
  var elapsed=tmrElapsed(t.id),isOd=t.due&&t.due<td,isFl=t.flag||t.status==='Need Client Input';
  var isPinned=!!S.pins[t.id];
  var cls='tk'+(isOd?' od':'')+(running?' wk':'')+(isFl?' fl':'')+(S.bulkSelected[t.id]?' sel':'')+(isPinned?' pinned':'');
  var eid=escAttr(t.id);
  var dueTxt=t.due?dueLabel(t.due,td):'';
  var dueCls=t.due?(isOd?' od':(dayDiff(td,t.due)===0?' td':'')):'';
  var clickAction=S.bulkMode?'TF.toggleSel(\''+eid+'\')':'TF.openDetail(\''+eid+'\')';
  var delay=typeof idx==='number'?Math.min(idx*0.03,0.45):0;

  var h='<div class="'+cls+'" data-task-id="'+esc(t.id)+'" onclick="'+clickAction+'"'+(delay?' style="animation-delay:'+delay+'s"':'')+'>';

  /* LIST compact row */
  h+='<div class="tk-compact">';
  h+='<div class="tk-left">';
  if(S.bulkMode)h+='<input type="checkbox" class="tk-check" '+(S.bulkSelected[t.id]?'checked':'')+' onclick="event.stopPropagation();TF.toggleSel(\''+eid+'\')">';
  if(isPinned)h+='<span style="font-size:12px;flex-shrink:0;opacity:.7">📌</span>';
  h+='<span class="bg '+impCls(t.importance)+'" style="flex-shrink:0">'+esc(t.importance)+'</span>';
  h+='<span class="tk-name">'+esc(t.item)+'</span>';
  if(dueTxt)h+='<span class="bg-du'+dueCls+'" style="flex-shrink:0">📅 '+dueTxt+'</span>';
  if(isFl)h+='<span class="bg bg-fl" style="flex-shrink:0">🚩</span>';
  if(t.meetingKey)h+='<span class="bg" style="background:rgba(130,55,245,0.08);color:var(--purple50);flex-shrink:0;font-size:10px">📅</span>';
  h+='</div><div class="tk-right">';
  if(hasT){h+='<span class="tmr tmr-sm'+(running?' go':'')+'">';
    if(running)h+='<span class="dot pulse"></span>';else h+='<span class="dot pau"></span>';
    h+='<span data-tmr="'+esc(t.id)+'">'+fmtT(elapsed)+'</span></span>'}
  if(running)h+='<button class="ab ab-pa ab-sm" onclick="event.stopPropagation();TF.pause(\''+eid+'\')" title="Pause">⏸</button>';
  else h+='<button class="ab ab-go ab-sm" onclick="event.stopPropagation();TF.start(\''+eid+'\')" title="Start">▶</button>';
  h+='<button class="ab ab-dn ab-sm" onclick="event.stopPropagation();TF.done(\''+eid+'\')" title="Complete">'+CK_S+'</button>';
  h+='<span class="tk-score">'+((t._score||0)>999?'🔥':(t._score||0))+'</span>';
  h+='</div></div>';

  /* GRID body */
  h+='<div class="tk-g">';
  h+='<div class="tk-g-head">';
  if(isPinned)h+='<span style="font-size:11px">📌</span>';
  h+='<span class="bg '+impCls(t.importance)+'">'+esc(t.importance)+'</span>';
  if(dueTxt)h+='<span class="bg-du'+dueCls+'">📅 '+dueTxt+'</span>';
  if(isFl)h+='<span class="bg bg-fl">🚩</span>';
  h+='</div>';
  h+='<div class="tk-g-name">'+esc(t.item)+'</div>';
  h+='<div class="tk-g-meta">';
  if(t.client&&t.client!=='Internal / N/A')h+='<span class="bg bg-cl">'+esc(t.client)+'</span>';
  if(t.endClient)h+='<span class="bg bg-ec">'+esc(t.endClient)+'</span>';
  if(t.campaign){var _cp=S.campaigns.find(function(c){return c.id===t.campaign});if(_cp)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber)">🎯 '+esc(_cp.name)+'</span>'}
  if(t.project){var _pj=S.projects.find(function(p){return p.id===t.project});if(_pj)h+='<span class="bg bg-proj" onclick="event.stopPropagation();TF.openProjectDetail(\''+escAttr(_pj.id)+'\')">📁 '+esc(_pj.name)+'</span>'}
  if(t.opportunity){var _op=S.opportunities.find(function(o){return o.id===t.opportunity});if(_op)h+='<span class="bg bg-opp" onclick="event.stopPropagation();TF.openOpportunityDetail(\''+escAttr(_op.id)+'\')">💎 '+esc(_op.name)+'</span>'}
  if(t.meetingKey){var _me=S.calEvents.find(function(ev){return mtgKey(ev.title,ev.start)===t.meetingKey});if(_me)h+='<span class="bg" style="background:rgba(130,55,245,0.08);color:var(--purple50)">📅 '+esc(_me.title)+' '+fmtTime(_me.start)+'</span>';else h+='<span class="bg" style="background:rgba(130,55,245,0.08);color:var(--purple50)">📅 Linked meeting</span>'}
  if(t.category)h+='<span class="bg bg-ca">'+esc(t.category)+'</span>';
  if(t.est)h+='<span class="bg-es">⏱ '+fmtM(t.est)+'</span>';
  h+='</div>';
  h+='<div class="tk-g-foot"><div class="tk-g-foot-l">';
  if(hasT){h+='<span class="tmr tmr-sm'+(running?' go':'')+'">';
    if(running)h+='<span class="dot pulse"></span>';else h+='<span class="dot pau"></span>';
    h+='<span data-tmr="'+esc(t.id)+'">'+fmtT(elapsed)+'</span></span>'}
  else h+='<span class="tk-score">'+((t._score||0)>999?'🔥':(t._score||0))+'</span>';
  h+='</div><div class="tk-g-foot-r">';
  if(running)h+='<button class="ab ab-pa ab-sm" onclick="event.stopPropagation();TF.pause(\''+eid+'\')" title="Pause">⏸</button>';
  else h+='<button class="ab ab-go ab-sm" onclick="event.stopPropagation();TF.start(\''+eid+'\')" title="Start">▶</button>';
  h+='<button class="ab ab-dn ab-sm" onclick="event.stopPropagation();TF.done(\''+eid+'\')" title="Complete">'+CK_S+'</button>';
  h+='</div></div></div>';
  h+='</div>';return h}

/* ═══════════ TODAY VIEW ═══════════ */
var qaImp='Important';
function miniRow(t,td){
  var ts=tmrGet(t.id),running=!!ts.started,hasT=running||(ts.elapsed||0)>0;
  var elapsed=tmrElapsed(t.id),isOd=t.due&&t.due<td,isFl=t.flag||t.status==='Need Client Input';
  var eid=escAttr(t.id);
  var h='<div class="td-mini" onclick="TF.openDetail(\''+eid+'\')">';
  h+='<span class="bg '+impCls(t.importance)+'" style="flex-shrink:0;font-size:10px;padding:2px 7px">'+esc(t.importance).charAt(0)+'</span>';
  h+='<span class="td-mini-name">'+esc(t.item)+'</span>';
  h+='<span class="td-mini-meta">';
  if(t.est)h+='<span style="color:var(--blue);font-weight:600">'+fmtM(t.est)+'</span>';
  if(t.due){var dl=dueLabel(t.due,td);h+='<span style="color:'+(isOd?'var(--red)':'var(--t4)')+'">'+dl+'</span>'}
  if(t.campaign){var _cp2=S.campaigns.find(function(c){return c.id===t.campaign});if(_cp2)h+='<span style="color:var(--amber)">🎯 '+esc(_cp2.name)+'</span>'}
  if(t.meetingKey){var _me2=S.calEvents.find(function(ev){return mtgKey(ev.title,ev.start)===t.meetingKey});if(_me2)h+='<span style="color:var(--purple50)">📅 '+fmtTime(_me2.start)+'</span>'}
  if(isFl)h+='<span>🚩</span>';
  if(hasT)h+='<span data-tmr="'+esc(t.id)+'" style="color:'+(running?'var(--green)':'var(--amber)')+';font-family:var(--fd);font-weight:600;letter-spacing:0.03em">'+fmtT(elapsed)+'</span>';
  h+='</span>';
  h+='<span class="td-mini-acts">';
  if(running)h+='<button class="ab ab-pa ab-mini" onclick="event.stopPropagation();TF.pause(\''+eid+'\')" title="Pause">⏸</button>';
  else h+='<button class="ab ab-go ab-mini" onclick="event.stopPropagation();TF.start(\''+eid+'\')" title="Start">▶</button>';
  h+='<button class="ab ab-dn ab-mini" onclick="event.stopPropagation();TF.done(\''+eid+'\')" title="Done">'+CK_XS+'</button>';
  h+='</span></div>';return h}

function rSchedule(){
  var td=today(),now=new Date();S.tasks.forEach(function(t){t._score=taskScore(t)});
  var sorted=S.tasks.slice().sort(function(a,b){return(b._score||0)-(a._score||0)});

  /* HEADER */
  var h='<div class="pg-head"><h1>Schedule</h1><div class="stats"><div class="st">'+now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'</div>';
  h+='<button class="btn" onclick="TF.openSummary()" style="font-size:11px;padding:5px 12px;margin-left:8px">📋 Daily Summary</button>';
  h+='</div></div>';

  /* CAPACITY COMPUTATION (shared by metrics + calendar) */
  var schedDays=CONFIG.schedDays||[1,2,3,4];
  var wS=CONFIG.workStart||9,wE=CONFIG.workEnd||20;
  var workMinsPerDay=(wE-wS)*60;
  var capDays=[],capWeekUsed={};
  var capWeekFreeMins=0,capWeekBusyMins=0,capWeekSchedMins=0,capWeekSchedCount=0;
  var capWeekMtgMins=0,capWeekOooMins=0,capWeekSchedCrit=0,capWeekSchedImp=0,capWeekSchedWta=0;
  for(var wd=0;wd<7;wd++){
    var wdd=new Date(td.getTime()+wd*864e5);
    if(schedDays.indexOf(wdd.getDay())===-1)continue;
    var wdEnd=new Date(wdd.getTime()+864e5);
    var wdEvents=S.calEvents.filter(function(e){return e.start>=wdd&&e.start<wdEnd});
    var wdFreeSlots=calcFreeSlots(wdEvents,wS,wE,wdd);
    var wdFreeMins=0;wdFreeSlots.forEach(function(s){wdFreeMins+=Math.round((s.end-s.start)/60000)});
    var wdMtgMins=0,wdOooMins=0;wdEvents.forEach(function(e){
      var es=Math.max(e.start.getTime(),new Date(wdd).setHours(wS,0,0,0));
      var ee=Math.min(e.end.getTime(),new Date(wdd).setHours(wE,0,0,0));
      if(ee>es){var m=Math.round((ee-es)/60000);if(e.title&&e.title.indexOf('OOO')===0)wdOooMins+=m;else wdMtgMins+=m}});
    var wdBusyMins=wdMtgMins+wdOooMins;
    var wdSched=scheduleTasks(wdd,capWeekUsed);
    var wdSchedMins=0,wdSchedCrit=0,wdSchedImp=0,wdSchedWta=0;
    wdSched.forEach(function(s){wdSchedMins+=s.mins;capWeekUsed[s.task.id]=true;
      if(s.task.importance==='Critical')wdSchedCrit+=s.mins;
      else if(s.task.importance==='When Time Allows')wdSchedWta+=s.mins;
      else wdSchedImp+=s.mins});
    capWeekFreeMins+=wdFreeMins;capWeekBusyMins+=wdBusyMins;
    capWeekSchedMins+=wdSchedMins;capWeekSchedCount+=wdSched.length;
    capWeekMtgMins+=wdMtgMins;capWeekOooMins+=wdOooMins;
    capWeekSchedCrit+=wdSchedCrit;capWeekSchedImp+=wdSchedImp;capWeekSchedWta+=wdSchedWta;
    var dayPct=workMinsPerDay>0?Math.round((wdBusyMins+wdSchedMins)/workMinsPerDay*100):0;
    capDays.push({date:wdd,label:DAYSHORT[wdd.getDay()]+' '+wdd.getDate(),
      mtg:wdMtgMins,ooo:wdOooMins,busy:wdBusyMins,sched:wdSchedMins,
      schedCrit:wdSchedCrit,schedImp:wdSchedImp,schedWta:wdSchedWta,
      free:Math.max(0,wdFreeMins-wdSchedMins),tasks:wdSched.length,pct:dayPct,isToday:wd===0})}
  var capTotalTasks=S.tasks.filter(function(t){return t.est>0&&(t.est-(t.duration||0))>0}).length;
  var capUnscheduled=capTotalTasks-capWeekSchedCount;
  var capUnschedMins=0;if(capUnscheduled>0)S.tasks.forEach(function(t){if(t.est>0&&!capWeekUsed[t.id]){capUnschedMins+=Math.max(5,t.est-(t.duration||0))}});
  var capWeekWorkMins=capDays.length*workMinsPerDay;
  var capWeekUsedMins=capWeekBusyMins+capWeekSchedMins;
  var capWeekPct=capWeekWorkMins>0?Math.round(capWeekUsedMins/capWeekWorkMins*100):0;
  var capWeekClr=capWeekPct>95?'var(--red)':capWeekPct>70?'var(--amber)':'var(--green)';
  var od=0;S.tasks.forEach(function(t){if(t.due&&t.due<td)od++});

  /* METRIC STRIP */
  h+='<div class="td-metrics">';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--t1)">'+S.tasks.length+'</div><div class="td-met-l">Open Tasks</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:'+(od?'var(--red)':'var(--green)')+'">'+od+'</div><div class="td-met-l">Overdue</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:'+capWeekClr+'">'+capWeekPct+'%</div><div class="td-met-l">Capacity</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:'+(capUnscheduled>0?'var(--amber)':'var(--green)')+'">'+capWeekSchedCount+'/'+capTotalTasks+'</div><div class="td-met-l">Scheduled</div></div>';
  h+='</div>';

  /* CAPACITY PLANNING (Weekly + Daily breakdown) */
  h+='<div class="cap-section">';
  h+='<div class="cap-week">';
  h+='<div class="cap-week-head">';
  h+='<span class="cap-week-title">📊 Weekly Capacity ('+capDays.length+' work days)</span>';
  h+='<span class="cap-week-pct" style="color:'+capWeekClr+'">'+capWeekPct+'%</span>';
  h+='</div>';
  var cwP=function(v){return capWeekWorkMins>0?Math.round(v/capWeekWorkMins*100):0};
  h+='<div class="cap-day-bar cap-week-bar">';
  if(capWeekOooMins>0)h+='<div class="cap-bar-seg ooo" style="width:'+cwP(capWeekOooMins)+'%" title="OOO: '+fmtM(capWeekOooMins)+'"></div>';
  if(capWeekMtgMins>0)h+='<div class="cap-bar-seg mtg" style="width:'+cwP(capWeekMtgMins)+'%" title="Meetings: '+fmtM(capWeekMtgMins)+'"></div>';
  if(capWeekSchedCrit>0)h+='<div class="cap-bar-seg crit" style="width:'+cwP(capWeekSchedCrit)+'%" title="Critical: '+fmtM(capWeekSchedCrit)+'"></div>';
  if(capWeekSchedImp>0)h+='<div class="cap-bar-seg imp" style="width:'+cwP(capWeekSchedImp)+'%" title="Important: '+fmtM(capWeekSchedImp)+'"></div>';
  if(capWeekSchedWta>0)h+='<div class="cap-bar-seg wta" style="width:'+cwP(capWeekSchedWta)+'%" title="When Time Allows: '+fmtM(capWeekSchedWta)+'"></div>';
  h+='</div>';
  h+='<div class="cap-week-stats">';
  if(capWeekOooMins>0)h+='<span>🟣 OOO <b style="color:var(--purple50)">'+fmtM(capWeekOooMins)+'</b></span>';
  h+='<span>📅 Meetings <b style="color:var(--pink)">'+fmtM(capWeekMtgMins)+'</b></span>';
  if(capWeekSchedCrit>0)h+='<span>🔴 Critical <b style="color:var(--red)">'+fmtM(capWeekSchedCrit)+'</b></span>';
  if(capWeekSchedImp>0)h+='<span>🔵 Important <b style="color:var(--blue)">'+fmtM(capWeekSchedImp)+'</b></span>';
  if(capWeekSchedWta>0)h+='<span>🟢 Flex <b style="color:var(--green)">'+fmtM(capWeekSchedWta)+'</b></span>';
  h+='<span>✅ Free <b style="color:var(--green)">'+fmtM(Math.max(0,capWeekFreeMins-capWeekSchedMins))+'</b></span>';
  if(capUnscheduled>0)h+='<span>⚠️ Overflow <b style="color:var(--red)">'+capUnscheduled+' tasks</b> ('+fmtM(capUnschedMins)+')</span>';
  else h+='<span>✓ <b style="color:var(--green)">All scheduled</b></span>';
  h+='</div></div>';
  h+='<div class="cap-days">';
  capDays.forEach(function(d){
    var dayClr=d.pct>95?'var(--red)':d.pct>70?'var(--amber)':'var(--green)';
    var pM=function(v){return workMinsPerDay>0?Math.round(v/workMinsPerDay*100):0};
    h+='<div class="cap-day'+(d.isToday?' cap-day-today':'')+'">';
    h+='<div class="cap-day-label">'+d.label+'</div>';
    h+='<div class="cap-day-bar">';
    if(d.ooo>0)h+='<div class="cap-bar-seg ooo" style="width:'+pM(d.ooo)+'%" title="OOO: '+fmtM(d.ooo)+'"></div>';
    if(d.mtg>0)h+='<div class="cap-bar-seg mtg" style="width:'+pM(d.mtg)+'%" title="Meetings: '+fmtM(d.mtg)+'"></div>';
    if(d.schedCrit>0)h+='<div class="cap-bar-seg crit" style="width:'+pM(d.schedCrit)+'%" title="Critical: '+fmtM(d.schedCrit)+'"></div>';
    if(d.schedImp>0)h+='<div class="cap-bar-seg imp" style="width:'+pM(d.schedImp)+'%" title="Important: '+fmtM(d.schedImp)+'"></div>';
    if(d.schedWta>0)h+='<div class="cap-bar-seg wta" style="width:'+pM(d.schedWta)+'%" title="When Time Allows: '+fmtM(d.schedWta)+'"></div>';
    h+='</div>';
    h+='<div class="cap-day-meta">';
    h+='<span class="cap-day-pct" style="color:'+dayClr+'">'+d.pct+'%</span>';
    if(d.mtg>0)h+='<span class="cap-day-info"><b style="color:var(--pink)">'+fmtM(d.mtg)+'</b> mtg</span>';
    if(d.ooo>0)h+='<span class="cap-day-info"><b style="color:var(--purple50)">'+fmtM(d.ooo)+'</b> OOO</span>';
    h+='<span class="cap-day-info"><b style="color:var(--blue)">'+fmtM(d.sched)+'</b> tasks ('+d.tasks+')</span>';
    if(d.free>0)h+='<span class="cap-day-info"><b style="color:var(--green)">'+fmtM(d.free)+'</b> free</span>';
    h+='</div></div>'});
  h+='</div></div>';

  /* CALENDAR + PLANNER SECTION */
  h+='<div id="cal-section">'+renderCalSection()+'</div>';

  /* ── 2-COL GRID: Meetings + This Week | Overdue + Chase ── */
  var weekEnd=new Date(td.getTime()+7*864e5);

  /* Upcoming tracked meetings */
  var trackedMtgs=S.calEvents.filter(function(e){
    return!e.allDay&&e.start>=td&&e.start<weekEnd&&e.title.indexOf('OOO')!==0&&
      !!findMtgDone(e.title,e.start)});
  trackedMtgs.sort(function(a,b){return a.start.getTime()-b.start.getTime()});

  /* This Week tasks */
  var upcoming=sorted.filter(function(t){if(!t.due)return false;var diff=dayDiff(td,t.due);return diff>0&&diff<=7});

  /* Overdue tasks */
  var overdue=sorted.filter(function(t){return t.due&&t.due<td});

  /* Chase items */
  var chaseItems=[];
  S.tasks.forEach(function(t){
    if(t.flag!==true&&t.status!=='Need Client Input')return;
    var ds='no date',ov=false,urgency=0;
    if(t.due instanceof Date){var diff=dayDiff(td,t.due);
      if(diff<0){ds=Math.abs(diff)+'d overdue';ov=true;urgency=Math.abs(diff)}
      else if(diff===0){ds='due today'}else{ds=diff+'d left';urgency=-diff}}
    chaseItems.push({task:t,ds:ds,ov:ov,urgency:urgency})});
  chaseItems.sort(function(a,b){return b.urgency-a.urgency});

  var hasLeft=trackedMtgs.length||upcoming.length;
  var hasRight=overdue.length||chaseItems.length;
  if(hasLeft||hasRight){
    h+='<div class="sched-grid">';

    /* LEFT COL */
    h+='<div class="sched-grid-col">';
    if(trackedMtgs.length){
      var tmMins=0;trackedMtgs.forEach(function(e){tmMins+=Math.round((e.end-e.start)/60000)});
      h+='<div class="sched-section">';
      h+='<div class="sched-section-head">';
      h+='<span class="sched-section-title">🤝 Upcoming Meetings ('+trackedMtgs.length+')</span>';
      h+='<span class="sched-section-meta">'+fmtM(tmMins)+' total</span>';
      h+='</div>';
      var mtgByDay={};
      trackedMtgs.forEach(function(e){
        var dk=e.start.toISOString().slice(0,10);
        if(!mtgByDay[dk])mtgByDay[dk]={date:e.start,events:[]};
        mtgByDay[dk].events.push(e)});
      Object.keys(mtgByDay).sort().forEach(function(dk){
        var grp=mtgByDay[dk];
        h+='<div class="sched-day-group">';
        h+='<div class="sched-day-label">'+fmtDShort(grp.date)+'</div>';
        grp.events.forEach(function(e){
          var dur=Math.round((e.end-e.start)/60000);
          h+='<div class="sched-mtg-row">';
          h+='<span class="sched-mtg-time">'+fmtTime(e.start)+' - '+fmtTime(e.end)+'</span>';
          h+='<span class="sched-mtg-name">'+esc(e.title)+'</span>';
          h+='<span class="sched-mtg-dur">'+fmtM(dur)+'</span>';
          h+='<span class="sched-mtg-tracked">'+CK_XS+'</span>';
          h+='</div>'});
        h+='</div>'});
      h+='</div>'}
    if(upcoming.length){
      h+='<div class="sched-section">';
      h+='<div class="sched-section-head">';
      h+='<span class="sched-section-title">📋 This Week ('+upcoming.length+')</span>';
      h+='</div>';
      h+='<div class="tb-wrap"><table class="tb"><thead><tr><th style="width:40%">Task</th><th style="width:15%">Importance</th><th style="width:20%">Due</th><th class="r" style="width:15%">Est.</th><th style="width:10%"></th></tr></thead><tbody>';
      upcoming.forEach(function(t){
        h+='<tr style="cursor:pointer" onclick="TF.openDetail(\''+escAttr(t.id)+'\')">';
        h+='<td data-label="Task">'+esc(t.item)+'</td>';
        h+='<td data-label="Importance"><span class="bg '+impCls(t.importance)+'">'+esc(t.importance)+'</span></td>';
        h+='<td data-label="Due" style="color:var(--t3)">'+dueLabel(t.due,td)+'</td>';
        h+='<td data-label="Est." class="nm">'+fmtM(t.est)+'</td>';
        h+='<td><button class="ab ab-go ab-mini" onclick="event.stopPropagation();TF.start(\''+escAttr(t.id)+'\')" title="Start">▶</button></td>';
        h+='</tr>'});
      h+='</tbody></table></div></div>'}
    h+='</div>';

    /* RIGHT COL */
    h+='<div class="sched-grid-col">';
    if(overdue.length){
      h+='<div class="sched-section">';
      h+='<div class="sched-section-head">';
      h+='<span class="sched-section-title" style="color:var(--red)">🔴 Overdue ('+overdue.length+')</span>';
      h+='</div>';
      h+='<div class="tb-wrap"><table class="tb"><thead><tr><th style="width:40%">Task</th><th style="width:15%">Importance</th><th style="width:20%">Due</th><th class="r" style="width:15%">Est.</th><th style="width:10%"></th></tr></thead><tbody>';
      overdue.slice(0,10).forEach(function(t){
        h+='<tr style="cursor:pointer" onclick="TF.openDetail(\''+escAttr(t.id)+'\')">';
        h+='<td data-label="Task">'+esc(t.item)+'</td>';
        h+='<td data-label="Importance"><span class="bg '+impCls(t.importance)+'">'+esc(t.importance)+'</span></td>';
        h+='<td data-label="Due" style="color:var(--red)">'+dueLabel(t.due,td)+'</td>';
        h+='<td data-label="Est." class="nm">'+fmtM(t.est)+'</td>';
        h+='<td><button class="ab ab-go ab-mini" onclick="event.stopPropagation();TF.start(\''+escAttr(t.id)+'\')" title="Start">▶</button></td>';
        h+='</tr>'});
      if(overdue.length>10)h+='<tr><td colspan="5" style="text-align:center;color:var(--t4);font-size:12px;cursor:pointer" onclick="TF.nav(\'tasks\')">+ '+(overdue.length-10)+' more</td></tr>';
      h+='</tbody></table></div></div>'}
    if(chaseItems.length){
      h+='<div class="chase"><div class="chase-title">🔔 Needs Chasing ('+chaseItems.length+')</div>';
      chaseItems.slice(0,8).forEach(function(c){
        h+='<div class="chase-item" onclick="TF.openDetail(\''+escAttr(c.task.id)+'\')">';
        h+='<span class="bg bg-fl">🚩</span><span class="chase-item-name">'+esc(c.task.item)+'</span>';
        if(c.task.client&&c.task.client!=='Internal / N/A')h+='<span class="bg bg-cl" style="font-size:10px">'+esc(c.task.client)+'</span>';
        h+='<span class="chase-item-meta" style="color:'+(c.ov?'var(--red)':'var(--amber)')+';font-weight:600">'+c.ds+'</span></div>'});
      if(chaseItems.length>8)h+='<div style="font-size:11px;color:var(--t4);padding-top:6px">+ '+(chaseItems.length-8)+' more</div>';
      h+='</div>'}
    h+='</div>';

    h+='</div>'}/* end .sched-grid */

  /* PLANNING CHARTS */
  if(S.tasks.length){
    h+='<div class="td-charts">';
    h+='<div class="td-chart-card"><div class="td-chart-title">🎯 By Importance</div><div class="td-chart-w"><canvas id="sched-imp"></canvas></div></div>';
    h+='<div class="td-chart-card"><div class="td-chart-title">📂 By Category</div><div class="td-chart-w"><canvas id="sched-cat"></canvas></div></div>';
    h+='<div class="td-chart-card"><div class="td-chart-title">⏱ Week Balance</div><div class="td-chart-w"><canvas id="sched-bal"></canvas></div></div>';
    h+='</div>'}

  if(!S.tasks.length&&!S.calEvents.length){
    h+='<div class="no-data" style="padding:36px">No tasks or calendar events yet. Add tasks to start planning your schedule.</div>'}
  return h}

function initScheduleCharts(){
  if(!S.tasks.length)return;
  var impD={};S.tasks.forEach(function(t){var im=t.importance||'Important';impD[im]=(impD[im]||0)+t.est});
  mkDonut('sched-imp',impD);
  var catD={};S.tasks.forEach(function(t){var c=t.category||'Uncategorised';catD[c]=(catD[c]||0)+t.est});
  mkDonut('sched-cat',catD);
  var td=today();
  var schedDays=CONFIG.schedDays||[1,2,3,4];
  var wS=CONFIG.workStart||9,wE=CONFIG.workEnd||20;
  var mtgM=0,taskM=0,freeM=0;
  for(var wd=0;wd<7;wd++){
    var wdd=new Date(td.getTime()+wd*864e5);
    if(schedDays.indexOf(wdd.getDay())===-1)continue;
    var wdEnd=new Date(wdd.getTime()+864e5);
    var wdEvents=S.calEvents.filter(function(e){return e.start>=wdd&&e.start<wdEnd});
    var bm=0;wdEvents.forEach(function(e){
      var es=Math.max(e.start.getTime(),new Date(wdd).setHours(wS,0,0,0));
      var ee=Math.min(e.end.getTime(),new Date(wdd).setHours(wE,0,0,0));
      if(ee>es)bm+=Math.round((ee-es)/60000)});
    mtgM+=bm;freeM+=Math.max(0,(wE-wS)*60-bm)}
  taskM=0;S.tasks.forEach(function(t){taskM+=t.est});
  var balD={};
  if(mtgM)balD['📅 Meetings']=mtgM;
  if(taskM)balD['⚡ Tasks']=taskM;
  var remain=Math.max(0,freeM-taskM);
  if(remain)balD['💤 Available']=remain;
  mkDonut('sched-bal',balD)}

function rOverview(){
  var td=today(),now=new Date(),effDay=getEffectiveDay();
  var isShifted=effDay.getTime()!==td.getTime();
  S.tasks.forEach(function(t){t._score=taskScore(t)});
  var sorted=S.tasks.slice().sort(function(a,b){return(b._score||0)-(a._score||0)});

  /* Filter to effective day only */
  var effDayEnd=new Date(effDay.getTime()+864e5);
  var prog=0;
  S.tasks.forEach(function(t){
    var ts=tmrGet(t.id);if(ts.started||ts.elapsed>0)prog++});
  var todayDone=S.done.filter(function(d){return d.completed&&d.completed>=effDay&&d.completed<effDayEnd});
  var todayMins=0;todayDone.forEach(function(d){todayMins+=d.duration});
  todayDone.sort(function(a,b){return(b.completed?b.completed.getTime():0)-(a.completed?a.completed.getTime():0)});

  var inProg=[],inProgIds={};
  sorted.forEach(function(t){var ts=tmrGet(t.id);if(ts.started||ts.elapsed>0){inProg.push(t);inProgIds[t.id]=true}});
  /* Due on effective day or overdue */
  var focus=sorted.filter(function(t){if(inProgIds[t.id])return false;if(!t.due)return false;return dayDiff(effDay,t.due)<=0});
  var impOrder={Critical:0,Important:1,'When Time Allows':2};
  /* Quick hits due on or before effective day */
  var quickHits=sorted.filter(function(t){if(inProgIds[t.id])return false;if(!t.est||t.est>30)return false;if(t.due&&dayDiff(effDay,t.due)>1)return false;return true})
    .sort(function(a,b){var ia=(impOrder[a.importance]!=null?impOrder[a.importance]:9),ib=(impOrder[b.importance]!=null?impOrder[b.importance]:9);return ia!==ib?ia-ib:(b._score||0)-(a._score||0)});
  /* Calendar events for effective day (logged meetings for display) */
  var dayCalEventsAll=S.calEvents.filter(function(e){return!e.allDay&&e.start>=effDay&&e.start<effDayEnd&&e.title.indexOf('OOO')!==0});
  var dayCalEvents=dayCalEventsAll.filter(function(e){return!!findMtgDone(e.title,e.start)});
  dayCalEvents.sort(function(a,b){return a.start.getTime()-b.start.getTime()});

  /* Chase items due on effective day */
  var chaseItems=[];
  S.tasks.forEach(function(t){
    if(t.flag!==true&&t.status!=='Need Client Input')return;
    if(t.due&&dayDiff(effDay,t.due)>0)return;
    var ds='no date',ov=false,urgency=0;
    if(t.due instanceof Date){var diff=dayDiff(effDay,t.due);
      if(diff<0){ds=Math.abs(diff)+'d overdue';ov=true;urgency=Math.abs(diff)}
      else if(diff===0){ds='due today'}else{ds=diff+'d left';urgency=-diff}}
    chaseItems.push({task:t,ds:ds,ov:ov,urgency:urgency})});
  chaseItems.sort(function(a,b){return b.urgency-a.urgency});

  /* HEADER */
  var dayTitle=isShifted?fmtDFull(effDay):'Today';
  var h='<div class="pg-head"><h1>'+dayTitle+'</h1><div class="stats">';
  if(isShifted)h+='<div class="st" style="color:var(--amber)">Showing next working day</div>';
  else h+='<div class="st">'+now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'</div>';
  h+='<button class="btn" onclick="TF.openSummary()" style="font-size:11px;padding:5px 12px;margin-left:8px">📋 Daily Summary</button>';
  h+='</div></div>';

  /* METRIC STRIP */
  h+='<div class="td-metrics">';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--green)">'+todayDone.length+'</div><div class="td-met-l">Done</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--pink)">'+fmtM(todayMins)+'</div><div class="td-met-l">Tracked</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--purple50)">'+dayCalEvents.length+'</div><div class="td-met-l">Meetings</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--red)">'+focus.length+'</div><div class="td-met-l">Due</div></div>';
  if(prog)h+='<div class="td-met"><div class="td-met-v" style="color:var(--green)">'+prog+'</div><div class="td-met-l">Running</div></div>';
  h+='</div>';

  /* TODAY'S SCHEDULE (calendar-style day planner) */
  var wS=CONFIG.workStart||9,wE=CONFIG.workEnd||20;
  var daySched=scheduleTasks(effDay,{});
  var dayItems=[];
  dayCalEvents.forEach(function(e){
    var sH=e.start.getHours()+e.start.getMinutes()/60;
    if(sH>=wS-1&&sH<wE+1)dayItems.push({type:'event',title:e.title,start:e.start,end:e.end,mins:Math.round((e.end-e.start)/60000)})});
  daySched.forEach(function(s){
    dayItems.push({type:'task',title:s.task.item,start:s.start,end:s.end,mins:s.mins,task:s.task})});
  dayItems.sort(function(a,b){return a.start.getTime()-b.start.getTime()});

  var tdDk=schedDayKey(effDay);
  var tdHasManual=S.schedOrder[tdDk]&&S.schedOrder[tdDk].length>0;
  var schedMins=0;daySched.forEach(function(s){schedMins+=s.mins});
  var busyMins=0;dayCalEventsAll.forEach(function(e){
    var es=Math.max(e.start.getTime(),new Date(effDay).setHours(wS,0,0,0));
    var ee=Math.min(e.end.getTime(),new Date(effDay).setHours(wE,0,0,0));
    if(ee>es)busyMins+=Math.round((ee-es)/60000)});
  var freeMins=Math.max(0,(wE-wS)*60-busyMins);
  var totalWorkMins=(wE-wS)*60;

  /* Determine visible time window — start at current hour if mid-day */
  var nowHr=now.getHours()+now.getMinutes()/60;
  var visStart=wS;
  if(!isShifted&&nowHr>=wS&&nowHr<wE){
    visStart=Math.floor(nowHr);
    if(visStart>wE-1)visStart=wE-1}
  var visHrs=wE-visStart;

  /* Calendar-style container */
  h+='<div class="today-cal" ondragover="TF.schedDragOver(event)" ondrop="TF.schedPanelDrop(event,\''+tdDk+'\')">';
  h+='<div class="today-cal-head">';
  h+='<span class="today-cal-title">📅 '+(!isShifted?'Today\'s':'Day\'s')+' Schedule</span>';
  h+='<div class="today-cal-stats">';
  h+='<span style="color:var(--green)">'+fmtM(freeMins)+' free</span>';
  h+='<span style="color:var(--red)">'+fmtM(busyMins)+' booked</span>';
  if(daySched.length)h+='<span style="color:var(--blue)">'+daySched.length+' tasks · '+fmtM(schedMins)+'</span>';
  if(tdHasManual)h+='<button class="cal-reset-all-btn" onclick="event.stopPropagation();TF.resetSchedule(\''+tdDk+'\')" style="margin-left:6px">↺ Reset Order</button>';
  h+='</div></div>';

  /* Hour grid */
  h+='<div class="today-cal-body" style="min-height:'+Math.max(300,visHrs*55)+'px">';
  for(var hr=visStart;hr<wE;hr++){
    var hrPct=((hr-visStart)/visHrs)*100;
    h+='<div class="today-cal-hour" style="top:'+hrPct+'%">';
    h+='<div class="today-cal-hour-label">'+(hr<10?'0':'')+hr+':00</div>';
    h+='</div>'}

  /* Now marker */
  if(!isShifted&&nowHr>=visStart&&nowHr<=wE){
    var nowPct=((nowHr-visStart)/visHrs)*100;
    h+='<div class="today-cal-now" style="top:'+nowPct+'%">';
    h+='<span class="today-cal-now-dot"></span>';
    h+='<span class="today-cal-now-line"></span>';
    h+='</div>'}

  /* Compute overlap columns (Google Calendar style) */
  dayItems.forEach(function(item){
    item._startHr=item.start.getHours()+item.start.getMinutes()/60;
    item._endHr=item.end.getHours()+item.end.getMinutes()/60});
  /* Group overlapping items into clusters */
  var clusters=[];
  dayItems.forEach(function(item){
    var placed=false;
    for(var ci=0;ci<clusters.length;ci++){
      var cl=clusters[ci];
      for(var j=0;j<cl.length;j++){
        if(item._startHr<cl[j]._endHr&&item._endHr>cl[j]._startHr){
          cl.push(item);placed=true;break}}
      if(placed)break}
    if(!placed)clusters.push([item])});
  /* Assign columns within each cluster */
  clusters.forEach(function(cl){
    var cols=[];
    cl.sort(function(a,b){return a._startHr-b._startHr||a._endHr-b._endHr});
    cl.forEach(function(item){
      var placed=false;
      for(var c=0;c<cols.length;c++){
        var lastInCol=cols[c][cols[c].length-1];
        if(item._startHr>=lastInCol._endHr){
          cols[c].push(item);item._col=c;placed=true;break}}
      if(!placed){item._col=cols.length;cols.push([item])}});
    var totalCols=cols.length;
    cl.forEach(function(item){item._totalCols=totalCols})});

  /* Render items as positioned blocks */
  dayItems.forEach(function(item){
    /* Skip items that ended before the visible window */
    if(item._endHr<=visStart)return;
    var topPct=((Math.max(item._startHr,visStart)-visStart)/visHrs)*100;
    var heightPct=((Math.min(item._endHr,wE)-Math.max(item._startHr,visStart))/visHrs)*100;
    if(heightPct<0.5)heightPct=0.5;
    var col=item._col||0,totalCols=item._totalCols||1;
    var colWidthPct=100/totalCols;
    var leftPct=col*colWidthPct;
    var blockStyle='top:'+topPct+'%;height:'+heightPct+'%;left:calc('+leftPct+'% + 8px);width:calc('+colWidthPct+'% - '+(col===totalCols-1?'20':'12')+'px)';
    var compact=item.mins<=30;
    if(item.type==='event'){
      h+='<div class="today-cal-block today-cal-ev'+(compact?' tcb-compact':'')+'" style="'+blockStyle+'">';
      h+='<div class="today-cal-block-content"><div class="today-cal-block-name">'+fmtTime(item.start)+' '+esc(item.title)+'</div>';
      if(!compact)h+='<div class="today-cal-block-time">'+fmtM(item.mins)+'</div>';
      h+='</div></div>'}
    else{
      var imp=item.task.importance;
      var eid=escAttr(item.task.id);
      var ts=tmrGet(item.task.id),running=!!ts.started,hasT=running||(ts.elapsed||0)>0;
      var elapsed=tmrElapsed(item.task.id);
      h+='<div class="today-cal-block today-cal-tk today-cal-tk-'+impCls(imp)+(compact?' tcb-compact':'')+'" style="'+blockStyle+'"';
      h+=' draggable="true" data-sched-id="'+eid+'" data-sched-day="'+tdDk+'"';
      h+=' ondragstart="TF.schedDragStart(event,\''+eid+'\')" ondragend="TF.schedDragEnd()"';
      h+=' ondragover="TF.schedDragOver(event)" ondragenter="TF.schedRowDragEnter(event,this)"';
      h+=' ondragleave="TF.schedRowDragLeave(event,this)" ondrop="TF.schedDragDrop(event,\''+eid+'\',\''+tdDk+'\')"';
      h+=' onclick="TF.openDetail(\''+eid+'\')">';
      h+='<div class="today-cal-block-grip">⠿</div>';
      h+='<div class="today-cal-block-content">';
      h+='<div class="today-cal-block-name">'+fmtTime(item.start)+' '+esc(item.title)+'</div>';
      if(!compact){h+='<div class="today-cal-block-meta">';
        h+='<span class="bg '+impCls(imp)+'" style="font-size:8px;padding:1px 5px">'+imp.charAt(0)+'</span>';
        h+=fmtM(item.mins);
        if(item.task.client&&item.task.client!=='Internal / N/A')h+=' · '+esc(item.task.client);
        if(item.task.endClient)h+=' · <span style="color:var(--teal)">'+esc(item.task.endClient)+'</span>';
        if(item.task.campaign){var _cptd=S.campaigns.find(function(c){return c.id===item.task.campaign});if(_cptd)h+=' · <span style="color:var(--amber)">🎯 '+esc(_cptd.name)+'</span>'}
        if(hasT)h+=' · <span style="color:'+(running?'var(--green)':'var(--amber)')+';font-family:var(--fd);font-weight:600">'+fmtT(elapsed)+'</span>';
        h+='</div>'}
      h+='</div>';
      h+='<div class="today-cal-block-acts">';
      if(running)h+='<button class="ab ab-pa ab-sm" onclick="event.stopPropagation();TF.pause(\''+eid+'\')" title="Pause" style="width:22px;height:22px;font-size:9px">⏸</button>';
      else h+='<button class="ab ab-go ab-sm" onclick="event.stopPropagation();TF.start(\''+eid+'\')" title="Start" style="width:22px;height:22px;font-size:9px">▶</button>';
      h+='<button class="ab ab-dn ab-sm" onclick="event.stopPropagation();TF.done(\''+eid+'\')" title="Done" style="width:22px;height:22px;font-size:9px">'+CK_XS+'</button>';
      h+='</div></div>'}});

  if(!dayItems.length){
    h+='<div class="today-cal-empty">No meetings or tasks scheduled</div>'}
  h+='</div></div>'

  /* ALERTS ROW */
  if(chaseItems.length||S.review.length){
    var alertsBoth=chaseItems.length&&S.review.length;
    h+='<div class="'+(alertsBoth?'td-row':'td-alerts-single')+'">';
    if(chaseItems.length){
      h+='<div class="chase" style="margin-bottom:0"><div class="chase-title">🔔 Needs Chasing ('+chaseItems.length+')</div>';
      chaseItems.slice(0,5).forEach(function(c){
        h+='<div class="chase-item" onclick="TF.openDetail(\''+escAttr(c.task.id)+'\')">';
        h+='<span class="bg bg-fl">🚩</span><span class="chase-item-name">'+esc(c.task.item)+'</span>';
        if(c.task.client&&c.task.client!=='Internal / N/A')h+='<span class="bg bg-cl" style="font-size:10px">'+esc(c.task.client)+'</span>';
        h+='<span class="chase-item-meta" style="color:'+(c.ov?'var(--red)':'var(--amber)')+';font-weight:600">'+c.ds+'</span></div>'});
      if(chaseItems.length>5)h+='<div style="font-size:11px;color:var(--t4);padding-top:6px">+ '+(chaseItems.length-5)+' more</div>';
      h+='</div>'}
    if(S.review.length){
      var rvItems=reviewSorted();
      h+='<div class="chase" style="margin-bottom:0;background:rgba(255,0,153,0.025);border-color:rgba(255,0,153,0.15)"><div class="chase-title" style="color:var(--pink)">📥 '+S.review.length+' to Review</div>';
      rvItems.slice(0,4).forEach(function(r,i){h+='<div class="chase-item" onclick="TF.openReviewAt('+i+')"><span class="bg '+impCls(r.importance)+'" style="font-size:10px">'+esc(r.importance).charAt(0)+'</span><span class="chase-item-name">'+esc(r.item)+'</span></div>'});
      if(rvItems.length>4)h+='<div style="font-size:11px;color:var(--t4);padding-top:6px;cursor:pointer" onclick="TF.nav(\'review\')">+ '+(rvItems.length-4)+' more...</div>';
      h+='</div>'}
    h+='</div>'}

  /* MEETING PREP WIDGET */
  var prepCutoff=new Date(now.getTime()+48*3600000);
  var mtgPrepGroups={};
  S.tasks.forEach(function(t){
    if(!t.meetingKey)return;
    var mtgEvt=S.calEvents.find(function(e){return mtgKey(e.title,e.start)===t.meetingKey});
    if(!mtgEvt||mtgEvt.start>prepCutoff||mtgEvt.end<now)return;
    if(!mtgPrepGroups[t.meetingKey])mtgPrepGroups[t.meetingKey]={event:mtgEvt,tasks:[]};
    mtgPrepGroups[t.meetingKey].tasks.push(t)});
  var prepKeys=Object.keys(mtgPrepGroups).sort(function(a,b){
    return mtgPrepGroups[a].event.start.getTime()-mtgPrepGroups[b].event.start.getTime()});
  if(prepKeys.length){
    h+='<div class="td-panel" style="border-color:rgba(130,55,245,0.15);margin-bottom:18px">';
    h+='<div class="td-panel-h"><span class="td-panel-t" style="color:var(--purple50)">📋 Meeting Prep</span>';
    var totalPrepTasks=0;prepKeys.forEach(function(k){totalPrepTasks+=mtgPrepGroups[k].tasks.length});
    h+='<span class="td-panel-c">'+totalPrepTasks+' task'+(totalPrepTasks>1?'s':'')+'</span></div>';
    prepKeys.forEach(function(key){
      var grp=mtgPrepGroups[key];
      var me=grp.event;
      var isToday_=me.start>=effDay&&me.start<effDayEnd;
      var urgClr=isToday_?'var(--red)':'var(--amber)';
      var urgLabel=isToday_?'TODAY':'TOMORROW';
      var timeUntil=Math.round((me.start-now)/60000);
      h+='<div style="padding:8px 0;'+(key!==prepKeys[prepKeys.length-1]?'border-bottom:1px solid rgba(130,55,245,0.05);':'')+'">';
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
      h+='<span style="font-size:10px;font-weight:700;color:'+urgClr+';text-transform:uppercase;letter-spacing:0.5px">'+urgLabel+'</span>';
      h+='<span style="font-size:12.5px;font-weight:600;color:var(--t1)">'+esc(me.title)+'</span>';
      h+='<span style="font-size:11px;color:var(--t3);margin-left:auto">'+fmtTime(me.start);
      if(timeUntil>0&&timeUntil<480)h+=' (in '+fmtM(timeUntil)+')';
      h+='</span></div>';
      grp.tasks.forEach(function(t){h+=miniRow(t,effDay)});
      h+='</div>'});
    h+='</div>'}

  /* PINNED TASKS */
  var pinnedTasks=sorted.filter(function(t){return S.pins[t.id]});
  if(pinnedTasks.length){
    h+='<div class="td-panel" style="border-color:rgba(255,176,48,0.15);margin-bottom:18px"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--amber)">📌 Pinned</span><span class="td-panel-c">'+pinnedTasks.length+'</span></div>';
    pinnedTasks.forEach(function(t){h+=miniRow(t,effDay)});h+='</div>'}

  /* MAIN 2-COL WORKSPACE */
  h+='<div class="td-row">';

  /* LEFT COLUMN */
  h+='<div class="td-col">';
  if(inProg.length){
    h+='<div class="td-panel" style="border-color:rgba(61,220,132,0.15)"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--green)">🟢 In Progress</span><span class="td-panel-c">'+inProg.length+'</span></div>';
    inProg.forEach(function(t){h+=miniRow(t,effDay)});h+='</div>'}
  if(focus.length){
    h+='<div class="td-panel" style="border-color:rgba(255,51,88,0.12)"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--red)">🔴 Due & Overdue</span><span class="td-panel-c">'+focus.length+'</span></div>';
    focus.slice(0,8).forEach(function(t){h+=miniRow(t,effDay)});
    if(focus.length>8)h+='<div style="text-align:center;padding:8px"><span style="font-size:11px;color:var(--t4);cursor:pointer;letter-spacing:0.02em" onclick="TF.filtNav(\'imp\',\'\')">+ '+(focus.length-8)+' more</span></div>';
    h+='</div>'}
  h+='</div>';

  /* RIGHT COLUMN */
  h+='<div class="td-col">';
  if(quickHits.length){
    var qhEst=0;quickHits.forEach(function(t){qhEst+=t.est});
    h+='<div class="td-panel" style="border-color:rgba(77,166,255,0.12)"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--blue)">⚡ Quick Hits (≤30m)</span><span class="td-panel-c">'+quickHits.length+' tasks, '+fmtM(qhEst)+'</span></div>';
    quickHits.slice(0,8).forEach(function(t){h+=miniRow(t,effDay)});
    if(quickHits.length>8)h+='<div style="text-align:center;padding:8px"><span style="font-size:11px;color:var(--t4);cursor:pointer;letter-spacing:0.02em" onclick="TF.nav(\'tasks\')">+ '+(quickHits.length-8)+' more</span></div>';
    h+='</div>'}
  if(todayDone.length){
    h+='<div class="td-panel" style="border-color:rgba(61,220,132,0.08)"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--green)">● Done</span><span class="td-panel-c">'+todayDone.length+' tasks, '+fmtM(todayMins)+'</span></div>';
    todayDone.slice(0,6).forEach(function(d){
      h+='<div class="td-mini" onclick="TF.openDoneDetail(\''+escAttr(d.id)+'\')">';
      h+='<span class="bg '+impCls(d.importance||'Important')+'" style="flex-shrink:0;font-size:10px;padding:2px 7px">'+(d.importance||'I').charAt(0)+'</span>';
      h+='<span class="td-mini-name" style="color:var(--t2);text-decoration:line-through;opacity:.65">'+esc(d.item)+'</span>';
      h+='<span class="td-mini-meta"><span style="color:var(--green);font-weight:600;font-family:var(--fd)">'+fmtM(d.duration)+'</span></span></div>'});
    if(todayDone.length>6)h+='<div style="text-align:center;padding:8px"><span style="font-size:11px;color:var(--t4);cursor:pointer;letter-spacing:0.02em" onclick="TF.nav(\'completed\')">+ '+(todayDone.length-6)+' more</span></div>';
    h+='</div>'}
  h+='</div>';

  h+='</div>';

  /* DAY PLAN CHARTS */
  if(S.tasks.length){
    h+='<div class="td-charts">';
    h+='<div class="td-chart-card"><div class="td-chart-title">🎯 By Importance</div><div class="td-chart-w"><canvas id="td-imp"></canvas></div></div>';
    h+='<div class="td-chart-card"><div class="td-chart-title">📂 By Category</div><div class="td-chart-w"><canvas id="td-cat"></canvas></div></div>';
    h+='<div class="td-chart-card"><div class="td-chart-title">⏱ Day Balance</div><div class="td-chart-w"><canvas id="td-bal"></canvas></div></div>';
    h+='</div>'}

  if(!focus.length&&!inProg.length&&!quickHits.length&&!todayDone.length){
    h+='<div class="no-data" style="padding:36px">🎉 All clear! No tasks for '+(isShifted?fmtDShort(effDay):'today')+'.</div>'}
  return h}

function initTodayCharts(){
  if(!S.tasks.length)return;
  var impD={};S.tasks.forEach(function(t){var im=t.importance||'Important';impD[im]=(impD[im]||0)+t.est});
  mkDonut('td-imp',impD);
  var catD={};S.tasks.forEach(function(t){var c=t.category||'Uncategorised';catD[c]=(catD[c]||0)+t.est});
  mkDonut('td-cat',catD);
  var td=today();
  var todayDone=S.done.filter(function(d){return d.completed&&d.completed>=td});
  var doneMins=0;todayDone.forEach(function(d){doneMins+=d.duration});
  var deepM=0,quickM=0;
  S.tasks.forEach(function(t){if(t.est>=25)deepM+=t.est;else quickM+=t.est});
  var balD={};
  if(doneMins)balD['Done ('+fmtM(doneMins)+')']=doneMins;
  if(deepM)balD['🧠 Deep Work']=deepM;
  if(quickM)balD['⚡ Quick Tasks']=quickM;
  var avail=8*60,used=doneMins+deepM+quickM;
  if(used<avail)balD['💤 Available']=avail-used;
  mkDonut('td-bal',balD)}

async function quickAdd(){var input=gel('qa-item');if(!input)return;var item=input.value.trim();if(!item){toast('⚠ Enter a task name','warn');return}
  var now=new Date();now.setHours(17,0,0,0);
  var data={item:item,due:now.toISOString(),importance:qaImp,category:'',client:'Internal / N/A',endClient:'',type:'Business',est:0,notes:'',status:'Planned',flag:false,campaign:'',meetingKey:''};
  var result=await dbAddTask(data);
  if(result){S.tasks.push({id:result.id,item:item,due:now,importance:qaImp,est:0,category:'',client:'Internal / N/A',endClient:'',type:'Business',duration:0,notes:'',status:'Planned',flag:false,campaign:'',meetingKey:''})}
  input.value='';toast('Added: '+item,'ok');render()}

/* ═══════════ TASKS (UNIFIED: Open / Completed / All) ═══════════ */
function rTasks(){
  var td=today(),mode=S.taskMode||'open';

  /* ── Header: Title + Mode Toggle (always stable) ── */
  var h='<div class="pg-head"><h1>Tasks</h1><div class="task-mode-toggle">';
  h+='<button class="tm-btn'+(mode==='open'?' on':'')+'" onclick="TF.setTaskMode(\'open\')">Open</button>';
  h+='<button class="tm-btn'+(mode==='done'?' on':'')+'" onclick="TF.setTaskMode(\'done\')">Completed</button>';
  h+='<button class="tm-btn'+(mode==='all'?' on':'')+'" onclick="TF.setTaskMode(\'all\')">All</button>';
  h+='</div></div>';

  /* ── Toolbar: filters + view controls ── */
  h+='<div class="task-toolbar">';
  if(mode==='open')h+=filterBar(S.tasks);
  else if(mode==='done')h+=filterBar(S.done,true);
  else h+=filterBar(S.tasks.concat(S.done),true);
  h+='<div class="task-controls">';
  if(mode!=='done'){
    h+='<div class="vt"><select class="vt-sel" onchange="TF.setGroup(this.value)" style="background:var(--bg3);border:1px solid var(--gborder);color:var(--t1);padding:6px 11px;border-radius:7px;font-size:12px;font-family:var(--f);cursor:pointer;letter-spacing:0.01em">';
    [{v:'importance',l:'By Importance'},{v:'estimate',l:'By Estimate'},{v:'client',l:'By Client'},{v:'due',l:'By Due Date'},{v:'status',l:'By Status'},{v:'manual',l:'⇅ Manual Order'}].forEach(function(o){
      h+='<option value="'+o.v+'"'+(S.groupBy===o.v?' selected':'')+'>'+o.l+'</option>'});
    h+='</select></div>';
    h+='<div class="vt"><button class="vt-btn'+(S.layout==='list'?' on':'')+'" onclick="TF.setLayout(\'list\')">☰ List</button>';
    h+='<button class="vt-btn'+(S.layout==='grid'?' on':'')+'" onclick="TF.setLayout(\'grid\')">▦ Grid</button></div>';
    if(mode==='open')h+='<button class="vt-btn'+(S.bulkMode?' on':'')+'" onclick="TF.toggleBulk()" title="Bulk select">☑ Bulk</button>';
  } else {
    h+='<div class="vt"><select class="vt-sel" onchange="TF.setDoneSort(this.value)" style="background:var(--bg3);border:1px solid var(--gborder);color:var(--t1);padding:6px 11px;border-radius:7px;font-size:12px;font-family:var(--f);cursor:pointer;letter-spacing:0.01em">';
    h+='<option value="date"'+(S.doneSort==='date'||!S.doneSort?' selected':'')+'>By Date</option>';
    h+='<option value="client"'+(S.doneSort==='client'?' selected':'')+'>By Client</option>';
    h+='<option value="duration"'+(S.doneSort==='duration'?' selected':'')+'>By Duration</option>';
    h+='</select></div>';
  }
  h+='</div></div>';

  /* ═══ OPEN MODE ═══ */
  if(mode==='open'){
    var filtered=applyFilters(S.tasks);
    filtered.forEach(function(t){t._score=taskScore(t)});
    var totEst=0,od=0,totRemain=0;
    filtered.forEach(function(t){totEst+=t.est;if(t.due&&t.due<td)od++;totRemain+=Math.max(0,t.est-Math.round(tmrElapsed(t.id)/60))});

    /* Stat cards */
    h+='<div class="td-metrics">';
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--t1)">'+filtered.length+'</div><div class="td-met-l">Tasks</div></div>';
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--amber)">'+fmtM(totEst)+'</div><div class="td-met-l">Estimated</div></div>';
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--blue)">'+fmtM(totRemain)+'</div><div class="td-met-l">Remaining</div></div>';
    h+='<div class="td-met"><div class="td-met-v" style="color:'+(od?'var(--red)':'var(--green)')+'">'+od+'</div><div class="td-met-l">Overdue</div></div>';
    h+='</div>';

    if(S.bulkMode){var selCount=Object.keys(S.bulkSelected).length;
      h+='<div class="bulk-bar"><span>'+selCount+' selected</span>';
      if(selCount)h+='<button class="bulk-done" onclick="TF.bulkComplete()">Complete '+selCount+'</button>';
      h+='<button class="bulk-cancel" onclick="TF.toggleBulk()">Cancel</button>';
      if(filtered.length)h+='<button class="bulk-cancel" onclick="TF.bulkSelectAll()" style="margin-left:auto">Select All</button>';
      h+='</div>'}

    if(S.groupBy==='manual'){
      var manualFiltered=applyManualOrder(filtered);
      h+='<div class="reorder-info" style="padding:8px 14px;margin-bottom:12px;font-size:11px;color:var(--t3);background:var(--bg1);border:1px solid var(--gborder);border-radius:var(--r);display:flex;align-items:center;gap:8px"><span>⇅</span> Drag tasks to reorder your day. Order is saved automatically.</div>';
      h+='<div class="tk-list reorder-list">';
      manualFiltered.forEach(function(t,idx){
        var eid=escAttr(t.id);
        h+='<div class="reorder-row" data-task-id="'+esc(t.id)+'" draggable="true" ondragstart="TF.dragStart(event,\''+eid+'\')" ondragover="TF.dragOver(event)" ondrop="TF.dragDrop(event,\''+eid+'\')">';
        h+='<span class="reorder-handle" title="Drag to reorder">⠿</span>';
        h+='<span class="reorder-num">'+(idx+1)+'</span>';
        h+=taskCard(t,td,idx);
        h+='</div>'});
      h+='</div>';
    } else {
      var sections=buildTaskGroups(filtered,td);
      sections.forEach(function(s){if(!s.items.length)return;var coll=S.collapsed[s.key];
        h+='<div class="sec"><div class="sec-h" onclick="TF.toggle(\''+s.key+'\')"><span class="sec-t" style="color:'+s.color+'">'+s.label+'</span>';
        h+='<span class="sec-c">'+s.items.length+'</span><span class="sec-toggle">'+(coll?'▸':'▾')+'</span></div>';
        h+='<div class="sec-body'+(coll?' collapsed':'')+'"><div class="tk-'+S.layout+'">';
        s.items.forEach(function(t,i){h+=taskCard(t,td,i)});h+='</div></div></div>'});
    }
    if(!filtered.length)h+='<div class="no-data">No tasks match your filters</div>';
  }

  /* ═══ COMPLETED MODE ═══ */
  else if(mode==='done'){
    var doneFiltered=applyFilters(S.done,true);
    var totalMins=0;doneFiltered.forEach(function(d){totalMins+=d.duration});

    /* Stat cards */
    h+='<div class="td-metrics">';
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--green)">'+doneFiltered.length+'</div><div class="td-met-l">Completed</div></div>';
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--pink)">'+fmtM(totalMins)+'</div><div class="td-met-l">Total Time</div></div>';
    if(doneFiltered.length)h+='<div class="td-met"><div class="td-met-v" style="color:var(--blue)">'+fmtM(Math.round(totalMins/doneFiltered.length))+'</div><div class="td-met-l">Avg / Task</div></div>';
    var totDoneEst=0;doneFiltered.forEach(function(d){totDoneEst+=(d.est||0)});
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--amber)">'+fmtM(totDoneEst)+'</div><div class="td-met-l">Estimated</div></div>';
    h+='</div>';

    if(!doneFiltered.length){h+='<div class="no-data">No completed tasks match your filters.</div>'}
    else{
      var dsort=S.doneSort||'date';
      /* Build groups based on sort mode */
      var groups={};
      if(dsort==='client'){
        doneFiltered.sort(function(a,b){return(a.client||'').localeCompare(b.client||'')});
        doneFiltered.forEach(function(d){
          var key=d.client||'Internal / N/A';
          if(!groups[key])groups[key]={label:'👤 '+key,items:[],mins:0};groups[key].items.push(d);groups[key].mins+=d.duration});
      } else if(dsort==='duration'){
        doneFiltered.sort(function(a,b){return(b.duration||0)-(a.duration||0)});
        doneFiltered.forEach(function(d){
          var dur=d.duration||0;var key;
          if(dur>=120)key='2h+';else if(dur>=60)key='1-2h';else if(dur>=30)key='30-60m';else if(dur>=15)key='15-30m';else key='<15m';
          if(!groups[key])groups[key]={label:key,items:[],mins:0};groups[key].items.push(d);groups[key].mins+=d.duration});
      } else {
        doneFiltered.sort(function(a,b){var da=a.completed?a.completed.getTime():0,db=b.completed?b.completed.getTime():0;return db-da});
        doneFiltered.forEach(function(d){
          var key=d.completed?d.completed.toISOString().slice(0,10):'unknown';
          if(!groups[key])groups[key]={date:d.completed,items:[],mins:0};groups[key].items.push(d);groups[key].mins+=d.duration});
      }
      var gKeys;
      if(dsort==='duration'){gKeys=['2h+','1-2h','30-60m','15-30m','<15m'].filter(function(k){return!!groups[k]})}
      else if(dsort==='client'){gKeys=Object.keys(groups).sort()}
      else{gKeys=Object.keys(groups).sort().reverse()}
      h+='<div class="done-list">';
      gKeys.forEach(function(key){
        var g=groups[key];
        var label=g.label||key;
        if(dsort==='date'){
          label=key==='unknown'?'No date':fmtDFull(g.date);
          var diff=g.date?dayDiff(td,g.date):null;
          if(diff===0)label='Today';else if(diff===-1)label='Yesterday'}
        h+='<div class="done-date-group">'+label+'<span class="done-group-count">'+g.items.length+' tasks, '+fmtM(g.mins)+'</span></div>';
        g.items.forEach(function(d){
          var eid=escAttr(d.id);
          h+='<div class="done-card" onclick="TF.openDoneDetail(\''+eid+'\')">';
          h+='<div class="done-left">';
          h+='<span style="color:var(--green);font-size:13px;flex-shrink:0">'+CK_S+'</span>';
          h+='<span class="bg '+impCls(d.importance||'Important')+'">'+esc(d.importance||'')+'</span>';
          h+='<span class="done-name">'+esc(d.item)+'</span>';
          h+='</div>';
          h+='<div class="done-right">';
          if(d.client&&d.client!=='Internal / N/A')h+='<span class="bg bg-cl">'+esc(d.client)+'</span>';
          if(d.endClient)h+='<span class="bg bg-ec">'+esc(d.endClient)+'</span>';
          if(d.campaign){var _cpd=S.campaigns.find(function(c){return c.id===d.campaign});if(_cpd)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber)">🎯 '+esc(_cpd.name)+'</span>'}
          if(d.opportunity){var _opd=S.opportunities.find(function(o){return o.id===d.opportunity});if(_opd)h+='<span class="bg bg-opp">💎 '+esc(_opd.name)+'</span>'}
          if(d.category)h+='<span class="bg bg-ca">'+esc(d.category)+'</span>';
          h+='<span class="done-dur">'+fmtM(d.duration)+'</span>';
          h+='</div></div>'})});
      h+='</div>';
    }
  }

  /* ═══ ALL MODE ═══ */
  else{
    var openFiltered=applyFilters(S.tasks,true);
    openFiltered.forEach(function(t){t._score=taskScore(t)});
    var doneAll=applyFilters(S.done,true);
    var totalAll=openFiltered.length+doneAll.length;
    var totalDoneMins=0;doneAll.forEach(function(d){totalDoneMins+=d.duration});
    var totalEstAll=0;openFiltered.forEach(function(t){totalEstAll+=t.est});doneAll.forEach(function(d){totalEstAll+=(d.est||0)});
    var totalTracked=totalDoneMins;openFiltered.forEach(function(t){totalTracked+=Math.round(tmrElapsed(t.id)/60)});
    var pctDone=totalAll>0?Math.round(doneAll.length/totalAll*100):0;

    /* Stat cards */
    h+='<div class="td-metrics">';
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--t1)">'+totalAll+'</div><div class="td-met-l">Total Tasks</div></div>';
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--green)">'+pctDone+'%</div><div class="td-met-l">Complete</div></div>';
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--pink)">'+fmtM(totalTracked)+'</div><div class="td-met-l">Time Tracked</div></div>';
    if(totalAll)h+='<div class="td-met"><div class="td-met-v" style="color:var(--blue)">'+fmtM(Math.round(totalTracked/totalAll))+'</div><div class="td-met-l">Avg / Task</div></div>';
    h+='</div>';

    /* Open tasks section */
    if(openFiltered.length){
      var coll=S.collapsed['all-open'];
      h+='<div class="sec"><div class="sec-h" onclick="TF.toggle(\'all-open\')"><span class="sec-t" style="color:var(--amber)">📋 Open Tasks</span>';
      h+='<span class="sec-c">'+openFiltered.length+'</span><span class="sec-toggle">'+(coll?'▸':'▾')+'</span></div>';
      h+='<div class="sec-body'+(coll?' collapsed':'')+'"><div class="tk-'+S.layout+'">';
      var sortedOpen=openFiltered.slice().sort(function(a,b){return(b._score||0)-(a._score||0)});
      sortedOpen.forEach(function(t,i){h+=taskCard(t,td,i)});
      h+='</div></div></div>';
    }
    /* Completed tasks section */
    if(doneAll.length){
      doneAll.sort(function(a,b){var da=a.completed?a.completed.getTime():0,db=b.completed?b.completed.getTime():0;return db-da});
      var collD=S.collapsed['all-done'];
      h+='<div class="sec"><div class="sec-h" onclick="TF.toggle(\'all-done\')"><span class="sec-t" style="color:var(--green)">'+CK_S+' Completed</span>';
      h+='<span class="sec-c">'+doneAll.length+'</span><span class="sec-toggle">'+(collD?'▸':'▾')+'</span></div>';
      h+='<div class="sec-body'+(collD?' collapsed':'')+'"><div class="done-list">';
      doneAll.slice(0,50).forEach(function(d){
        var eid=escAttr(d.id);
        h+='<div class="done-card" onclick="TF.openDoneDetail(\''+eid+'\')">';
        h+='<div class="done-left">';
        h+='<span style="color:var(--green);font-size:13px;flex-shrink:0">'+CK_S+'</span>';
        h+='<span class="bg '+impCls(d.importance||'Important')+'">'+esc(d.importance||'')+'</span>';
        h+='<span class="done-name">'+esc(d.item)+'</span>';
        h+='</div>';
        h+='<div class="done-right">';
        if(d.client&&d.client!=='Internal / N/A')h+='<span class="bg bg-cl">'+esc(d.client)+'</span>';
        if(d.endClient)h+='<span class="bg bg-ec">'+esc(d.endClient)+'</span>';
        if(d.category)h+='<span class="bg bg-ca">'+esc(d.category)+'</span>';
        h+='<span class="done-dur">'+fmtM(d.duration)+'</span>';
        h+='</div></div>'});
      if(doneAll.length>50)h+='<div style="font-size:11px;color:var(--t4);padding:10px 0;text-align:center">+ '+(doneAll.length-50)+' more completed tasks</div>';
      h+='</div></div></div>';
    }
    if(!totalAll)h+='<div class="no-data">No tasks match your filters</div>';
  }
  return h}

function buildTaskGroups(tasks,td){
  var gb=S.groupBy,grps={},order=[];
  tasks.forEach(function(t){
    var key,label,color;
    if(gb==='importance'){
      key=t.importance||'Important';label=key;
      var map={Critical:{k:'critical',l:'🔴 Critical',c:'var(--red)'},Important:{k:'important',l:'🟠 Important',c:'var(--amber)'},
        'When Time Allows':{k:'wta',l:'🟢 When Time Allows',c:'var(--green)'}};
      var m=map[key]||{k:key,l:key,c:'var(--t3)'};key=m.k;label=m.l;color=m.c;
    } else if(gb==='estimate'){
      var est=t.est||0;
      if(est===0){key='no_est';label='❓ No Estimate';color='var(--t4)'}
      else if(est<=10){key='quick';label='⚡ Quick (≤10m)';color='var(--green)'}
      else if(est<=30){key='medium';label='🔶 Medium (10-30m)';color='var(--amber)'}
      else{key='deep';label='🧠 Deep Work (30m+)';color='var(--purple50)'}
    } else if(gb==='client'){
      key=t.client||'Internal / N/A';label=key==='Internal / N/A'?'🏠 Internal / N/A':'👤 '+key;color=key==='Internal / N/A'?'var(--t3)':'var(--pink50)';
    } else if(gb==='due'){
      if(!t.due){key='no_date';label='📭 No Due Date';color='var(--t4)'}
      else{var diff=dayDiff(td,t.due);
        if(diff<0){key='overdue';label='🔴 Overdue';color='var(--red)'}
        else if(diff===0){key='today';label='📅 Due Today';color='var(--amber)'}
        else if(diff<=7){key='this_week';label='📆 This Week';color='var(--blue)'}
        else if(diff<=14){key='next_week';label='🗓️ Next Week';color='var(--teal)'}
        else{key='later';label='📋 Later';color='var(--t3)'}}
    } else if(gb==='status'){
      var st=t.status||'Planned';
      var ts=tmrGet(t.id);if(ts.started)st='In Progress';else if(ts.elapsed>0)st='Paused';
      if(t.flag||t.status==='Need Client Input')st='Need Client Input';
      var sMap={'In Progress':{k:'in_prog',l:'🟢 In Progress',c:'var(--green)'},Paused:{k:'paused',l:'⏸️ Paused',c:'var(--amber)'},
        'Need Client Input':{k:'nci',l:'🚩 Needs Client Input',c:'var(--cyan)'},Planned:{k:'planned',l:'📋 Planned',c:'var(--t3)'}};
      var sm=sMap[st]||{k:'planned',l:'📋 '+st,c:'var(--t3)'};key=sm.k;label=sm.l;color=sm.c;
    }
    if(!grps[key])grps[key]={key:key,label:label,color:color,items:[]};grps[key].items.push(t)});
  var orderMap={
    importance:['critical','important','wta'],
    estimate:['quick','medium','deep','no_est'],
    due:['overdue','today','this_week','next_week','later','no_date'],
    status:['in_prog','paused','nci','planned']
  };
  var keys=orderMap[gb]||Object.keys(grps).sort();
  if(gb==='client'){keys=Object.keys(grps).sort(function(a,b){return grps[b].items.length-grps[a].items.length})}
  var result=[];keys.forEach(function(k){if(grps[k]){
    grps[k].items.sort(function(a,b){return(b._score||0)-(a._score||0)});result.push(grps[k])}});
  Object.keys(grps).forEach(function(k){if(!result.some(function(r){return r.key===k})){
    grps[k].items.sort(function(a,b){return(b._score||0)-(a._score||0)});result.push(grps[k])}});
  return result}

/* ═══════════ MEETINGS TAB ═══════════ */
/* Match meeting to task by name + same calendar day + same time */
function mtgKey(name,date){return(name||'').toLowerCase().trim()+'|'+(date?date.getFullYear()+'-'+(date.getMonth()+1)+'-'+date.getDate()+'-'+date.getHours()+':'+date.getMinutes():'')}
function findMtgTask(title,start){
  var key=mtgKey(title,start);
  return S.tasks.find(function(t){return mtgKey(t.item,t.due)===key})||null}
function findMtgDone(title,start){
  /* Match on name + due date (original meeting time preserved on completion) */
  var key=mtgKey(title,start);
  return S.done.find(function(d){return mtgKey(d.item,d.due)===key})||null}

/* ═══════════ AUTO MEETING TRACKING ═══════════ */
var mtgPrompted={};
try{mtgPrompted=JSON.parse(localStorage.getItem('tf_mtgprompted')||'{}')}catch(e){mtgPrompted={}}
function saveMtgPrompted(){try{localStorage.setItem('tf_mtgprompted',JSON.stringify(mtgPrompted))}catch(e){}}
function cleanMtgPrompted(){var cutoff=new Date();cutoff.setDate(cutoff.getDate()-7);var changed=false;
  Object.keys(mtgPrompted).forEach(function(k){var parts=k.split('|');if(parts.length>=2){
    var d=new Date(parts[parts.length-1]);if(!isNaN(d.getTime())&&d<cutoff){delete mtgPrompted[k];changed=true}}});
  if(changed)saveMtgPrompted()}

function getEndedUnloggedMeetings(){
  if(!S.calEvents.length)return[];
  var now=new Date(),td=today();
  return S.calEvents.filter(function(e){
    if(e.allDay)return false;
    if(e.title.indexOf('OOO')===0)return false;
    if(e.start<td)return false;
    if(e.end>now)return false;
    var pk=e.title+'|'+e.start.toISOString();
    if(mtgPrompted[pk])return false;
    if(findMtgDone(e.title,e.start))return false;
    return true;
  }).sort(function(a,b){return a.end.getTime()-b.end.getTime()})
}

function renderMeetingPromptBanner(){
  var ended=getEndedUnloggedMeetings();
  if(!ended.length)return'';
  var e=ended[0];
  var dur=Math.round((e.end-e.start)/60000);
  var queueCount=ended.length;
  var h='<div class="mtg-prompt" id="mtg-prompt">';
  h+='<div class="mtg-prompt-icon">🤝</div>';
  h+='<div class="mtg-prompt-body">';
  h+='<div class="mtg-prompt-title">Meeting ended: '+esc(e.title)+'</div>';
  h+='<div class="mtg-prompt-meta">';
  h+='<span>'+fmtTime(e.start)+' – '+fmtTime(e.end)+'</span>';
  h+='<span>'+fmtM(dur)+'</span>';
  h+='</div></div>';
  h+='<div class="mtg-prompt-actions">';
  h+='<button class="btn btn-go mtg-prompt-btn" onclick="TF.completeMeetingEnd()">'+CK_S+' Complete</button>';
  h+='<button class="btn mtg-prompt-skip" onclick="TF.dismissMeetingEnd()">&times; Dismiss</button>';
  if(queueCount>1)h+='<span class="mtg-prompt-queue">+'+(queueCount-1)+' more</span>';
  h+='</div></div>';
  return h;
}

function rMeetings(){
  var td=today(),now=new Date();
  var h='<div class="pg-head"><h1>🤝 Meetings</h1></div>';

  if(!S.calEvents.length){
    h+='<div class="no-data" style="padding:64px 20px"><div style="font-size:40px;margin-bottom:18px">📅</div>';
    h+='<div style="font-size:16px;color:var(--t2);margin-bottom:10px;font-weight:500">No calendar connected</div>';
    h+='<div style="font-size:13px;color:var(--t4);margin-bottom:16px">Connect your Google Calendar to see meetings here.</div>';
    h+='<button class="btn btn-p" onclick="TF.showCalSetup()" style="padding:8px 18px;font-size:12px">Connect Calendar</button>';
    h+='</div>';return h}

  /* Gather stats */
  var weekEnd=new Date(td.getTime()+7*864e5);
  var allMeetings=S.calEvents.filter(function(e){return!e.allDay&&e.start>=td&&e.start<weekEnd&&e.title.indexOf('OOO')!==0});
  allMeetings.sort(function(a,b){return a.start.getTime()-b.start.getTime()});
  var weekMins=0;allMeetings.forEach(function(e){weekMins+=Math.round((e.end-e.start)/60000)});
  var loggedCount=0;
  allMeetings.forEach(function(e){if(findMtgDone(e.title,e.start))loggedCount++});
  var todayEnd=new Date(td.getTime()+864e5);
  var todayCount=allMeetings.filter(function(e){return e.start<todayEnd}).length;

  /* Stats strip */
  h+='<div class="td-metrics">';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--pink)">'+todayCount+'</div><div class="td-met-l">Today</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--t1)">'+allMeetings.length+'</div><div class="td-met-l">This Week</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--purple50)">'+fmtM(weekMins)+'</div><div class="td-met-l">Booked</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--green)">'+loggedCount+'</div><div class="td-met-l">Logged</div></div>';
  h+='</div>';

  /* WEEKLY SCHEDULE - one unified view grouped by day */
  if(allMeetings.length){
    h+='<div class="mtg-section">';
    h+='<div class="mtg-section-head"><span class="mtg-section-title">📅 This Week</span></div>';
    var curDay='';
    allMeetings.forEach(function(e){
      var dk=fmtDShort(e.start);
      if(dk!==curDay){curDay=dk;h+='<div class="mtg-day-hdr">'+dk+'</div>'}
      var dur=Math.round((e.end-e.start)/60000);
      var isPast=e.end<now;
      var isNow=e.start<=now&&e.end>now;
      var matchedDone=findMtgDone(e.title,e.start);
      h+='<div class="mtg-row'+(isPast?' mtg-past':'')+(isNow?' mtg-now':'')+'">';
      h+='<div class="mtg-row-time">'+fmtTime(e.start)+'</div>';
      h+='<div class="mtg-row-bar'+(isNow?' now':'')+'"></div>';
      h+='<div class="mtg-row-body">';
      h+='<div class="mtg-row-name">'+esc(e.title)+'</div>';
      h+='<div class="mtg-row-tags">';
      h+='<span class="mtg-tag dur">'+fmtM(dur)+'</span>';
      if(matchedDone&&matchedDone.client&&matchedDone.client!=='Internal / N/A')h+='<span class="mtg-tag cli">'+esc(matchedDone.client)+'</span>';
      if(matchedDone&&matchedDone.endClient)h+='<span class="mtg-tag" style="background:rgba(45,212,191,0.08);color:var(--teal)">'+esc(matchedDone.endClient)+'</span>';
      if(matchedDone)h+='<span class="mtg-tag done">✓ Logged</span>';
      var mKey_=mtgKey(e.title,e.start);
      var linkedCount=S.tasks.filter(function(t){return t.meetingKey===mKey_}).length;
      if(linkedCount)h+='<span class="mtg-tag" style="background:rgba(130,55,245,0.08);color:var(--purple50)">📋 '+linkedCount+' task'+(linkedCount>1?'s':'')+'</span>';
      h+='</div></div></div>'});
    h+='</div>'}

  return h}
/* ═══════════ TEMPLATES ═══════════ */
function rTemplates(){
  var h='<div class="pg-head"><h1>Templates</h1><div class="stats"><div class="st"><b style="color:var(--t1)">'+S.templates.length+'</b> templates</div>';
  var sets=S.templates.filter(function(t){return t.setName});var setNames={};sets.forEach(function(t){setNames[t.setName]=true});
  if(Object.keys(setNames).length)h+='<div class="st"><b style="color:var(--pink)">'+Object.keys(setNames).length+'</b> sets</div>';
  h+='</div></div>';

  h+='<button class="btn btn-p" onclick="TF.openTplForm()" style="margin-bottom:22px">➕ New Template</button>';

  var setGroups={};S.templates.forEach(function(t,i){if(!t.setName)return;if(!setGroups[t.setName])setGroups[t.setName]=[];setGroups[t.setName].push({tpl:t,idx:i})});
  Object.keys(setGroups).sort().forEach(function(setName){
    var items=setGroups[setName];var totEst=0;items.forEach(function(i){totEst+=i.tpl.est||0});
    h+='<div class="tpl-set"><div class="tpl-set-head"><span class="tpl-set-name">📦 '+esc(setName)+'</span>';
    h+='<span style="font-size:12px;color:var(--t3)">'+items.length+' tasks, '+fmtM(totEst)+' est.</span>';
    h+='<button class="btn btn-p" style="padding:7px 15px;font-size:11px" onclick="TF.useSet(\''+escAttr(setName)+'\')">▶ Run Set</button></div>';
    h+='<div class="tpl-set-list">';
    items.forEach(function(i){h+='<div class="tpl-set-item"><span class="bg '+impCls(i.tpl.importance)+'">'+esc(i.tpl.importance)+'</span>'+esc(i.tpl.item||i.tpl.name);
      if(i.tpl.est)h+=' <span style="color:var(--t4)">'+fmtM(i.tpl.est)+'</span>';h+='</div>'});
    h+='</div></div>'});

  var singles=S.templates.filter(function(t){return!t.setName});
  if(singles.length||!S.templates.length){
    h+='<div class="tpl-grid">';
    S.templates.forEach(function(t,i){
      h+='<div class="tpl-card"><div class="tpl-card-head"><span class="tpl-card-name">'+esc(t.name)+'</span></div>';
      h+='<div class="tpl-card-meta">';
      h+='<span class="bg '+impCls(t.importance)+'">'+esc(t.importance||'Important')+'</span>';
      if(t.category)h+='<span class="bg bg-ca">'+esc(t.category)+'</span>';
      if(t.client&&t.client!=='Internal / N/A')h+='<span class="bg bg-cl">'+esc(t.client)+'</span>';
      if(t.est)h+='<span class="bg-es">⏱ '+fmtM(t.est)+'</span>';
      if(t.setName)h+='<span class="bg" style="background:rgba(255,0,153,0.08);color:var(--pink)">📦 '+esc(t.setName)+'</span>';
      if(t.recurrence)h+='<span class="bg" style="background:rgba(61,220,132,0.08);color:var(--green)">🔄 '+esc(t.recurrence)+'</span>';
      h+='</div><div class="tpl-card-acts">';
      h+='<button class="tpl-use" onclick="event.stopPropagation();TF.useTpl('+i+')">▶ Use</button>';
      h+='<button onclick="event.stopPropagation();TF.openTplForm('+i+')">✏️ Edit</button>';
      h+='<button onclick="event.stopPropagation();TF.delTpl('+i+')">🗑️</button>';
      h+='</div></div>'});
    h+='</div>'}
  if(!S.templates.length)h+='<div class="no-data" style="padding:44px">📎 No templates yet. Create one to save time on recurring tasks.</div>';
  return h}

/* ═══════════ ANALYTICS ═══════════ */
function metCard(l,v,c){return'<div class="met"><div class="met-l">'+l+'</div><div class="met-v" style="color:'+c+'">'+v+'</div></div>'}
function cmpDelta(cur,prev){if(prev===0&&cur===0)return{txt:'--',clr:'var(--t4)'};if(prev===0)return{txt:'+'+cur,clr:'var(--green)'};
  var d=cur-prev,p=Math.round(d/prev*100);return{txt:(d>=0?'+':'')+d+' ('+((d>=0?'+':'')+p)+'%)',clr:d>0?'var(--green)':d<0?'var(--red)':'var(--t3)'}}
function applyDropdownFilters(items){var f=S.filters;return items.filter(function(t){
  if(f.client&&t.client!==f.client)return false;if(f.endClient&&t.endClient!==f.endClient)return false;if(f.cat&&t.category!==f.cat)return false;
  if(f.imp&&t.importance!==f.imp)return false;if(f.type&&t.type!==f.type)return false;
  if(f.campaign){var matchCp=S.campaigns.find(function(c){return c.name===f.campaign});if(matchCp&&t.campaign!==matchCp.id)return false}
  if(f.search){var q=f.search.toLowerCase();if(t.item.toLowerCase().indexOf(q)===-1&&(t.notes||'').toLowerCase().indexOf(q)===-1&&(t.client||'').toLowerCase().indexOf(q)===-1&&(t.endClient||'').toLowerCase().indexOf(q)===-1)return false}
  return true})}

function rAnalytics(){
  var td_=today();
  var cutoff=S.dashPeriod>0?new Date(td_.getTime()-S.dashPeriod*864e5):null;
  var periodDone=S.done.filter(function(d){return!cutoff||!d.completed||d.completed>=cutoff});
  var done=applyFilters(periodDone,true);
  var allDoneUnfiltered=S.done;
  var totTrk=0,tt=done.length;done.forEach(function(d){totTrk+=d.duration});
  var openFiltered0=applyDropdownFilters(S.tasks);
  var openC=openFiltered0.length,odC=0;openFiltered0.forEach(function(t){if(t.due&&t.due<td_)odC++});
  var days=S.dashPeriod||30;

  var cur=0,longest=0,tmp2=0;
  for(var s=0;s<90;s++){var cd=new Date(td_);cd.setDate(td_.getDate()-s);var dw=cd.getDay();if(dw===0||dw===6)continue;
    var key=cd.toISOString().slice(0,10);var had=allDoneUnfiltered.some(function(d){return d.completed&&d.completed.toISOString().slice(0,10)===key});
    if(had){tmp2++;if(tmp2>longest)longest=tmp2}else{if(s<=2)cur=tmp2;tmp2=0}}if(cur===0&&tmp2>0)cur=tmp2;

  var todayAll=allDoneUnfiltered.filter(function(d){return d.completed&&d.completed>=td_});
  var todayMins=0;todayAll.forEach(function(d){todayMins+=d.duration});
  var scT=Math.min(todayAll.length*15,30),scM=Math.min(Math.round(todayMins/240*30),30),scS=Math.min(cur*5,20);
  var wEAll=allDoneUnfiltered.filter(function(d){return d.est>0&&d.duration>0});
  var scA=0;if(wEAll.length){var eA=0,aA=0;wEAll.forEach(function(d){eA+=d.est;aA+=d.duration});var r2=aA/eA;scA=r2>=0.8&&r2<=1.2?20:r2>=0.6&&r2<=1.5?10:0}
  var prodScore=Math.min(scT+scM+scS+scA,100);
  var prodClr=prodScore>=70?'var(--green)':prodScore>=40?'var(--amber)':'var(--red)';

  var h='<div class="pg-head"><h1>Analytics</h1><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><select class="per" onchange="TF.dashPer(this.value)">';
  [7,14,30,90,0].forEach(function(v){h+='<option value="'+v+'"'+(S.dashPeriod===v?' selected':'')+'>'+(v?'Last '+v+' Days':'All Time')+'</option>'});
  h+='</select>';
  h+='<button class="btn" onclick="TF.openClientReport()" style="font-size:11px;padding:5px 12px">📊 Client Report</button>';
  h+='</div></div>';h+=filterBar(S.done,true);

  h+='<div class="str-row"><div class="str"><div class="str-v" style="color:'+prodClr+'">'+prodScore+'</div><div class="str-l">Today\'s Score</div></div>';
  h+='<div class="str"><div class="str-v" style="color:'+(cur>=5?'var(--green)':'var(--amber)')+'">'+cur+'</div><div class="str-l">Streak</div></div>';
  h+='<div class="str"><div class="str-v" style="color:var(--pink)">'+longest+'</div><div class="str-l">Best Streak</div></div>';
  h+='<div class="str"><div class="str-v" style="color:var(--green)">'+todayAll.length+'</div><div class="str-l">Done Today</div></div>';
  h+='<div class="str"><div class="str-v" style="color:var(--purple50)">'+fmtM(todayMins)+'</div><div class="str-l">Tracked Today</div></div></div>';

  /* HEATMAP CALENDAR */
  h+='<h2>🗓️ Activity Heatmap</h2><div class="heatmap-cal" id="heatmap-cal"></div>';

  h+='<div class="mets">';h+=metCard('Tasks Done',tt,'var(--green)')+metCard('Time Tracked',fmtM(totTrk),'var(--pink)');
  h+=metCard('Avg / Task',tt?fmtM(Math.round(totTrk/tt)):'0m','var(--blue)')+metCard('Open',openC,'var(--t1)')+metCard('Overdue',odC,odC?'var(--red)':'var(--green)');h+='</div>';

  var thisWkStart=wkStart(td_),lastWkStart=new Date(thisWkStart);lastWkStart.setDate(lastWkStart.getDate()-7);
  var twD=applyDropdownFilters(S.done.filter(function(d){return d.completed&&d.completed>=thisWkStart}));
  var lwD=applyDropdownFilters(S.done.filter(function(d){return d.completed&&d.completed>=lastWkStart&&d.completed<thisWkStart}));
  var twM=0,lwM=0;twD.forEach(function(d){twM+=d.duration});lwD.forEach(function(d){lwM+=d.duration});
  var dTasks=cmpDelta(twD.length,lwD.length),dTime=cmpDelta(twM,lwM);
  var twAvg=twD.length?(twM/twD.length):0,lwAvg=lwD.length?(lwM/lwD.length):0;
  var dAvg=cmpDelta(Math.round(twAvg),Math.round(lwAvg));
  h+='<h2>📈 Week-over-Week</h2><div class="cmp-grid">';
  h+='<div class="cmp"><div class="cmp-l">This Week Tasks</div><div class="cmp-v" style="color:var(--green)">'+twD.length+'</div><div class="cmp-d" style="color:'+dTasks.clr+'">vs last: '+dTasks.txt+'</div></div>';
  h+='<div class="cmp"><div class="cmp-l">This Week Time</div><div class="cmp-v" style="color:var(--pink)">'+fmtM(twM)+'</div><div class="cmp-d" style="color:'+dTime.clr+'">vs last: '+dTime.txt+'</div></div>';
  h+='<div class="cmp"><div class="cmp-l">Avg / Task</div><div class="cmp-v" style="color:var(--blue)">'+fmtM(Math.round(twAvg))+'</div><div class="cmp-d" style="color:'+dAvg.clr+'">vs last: '+dAvg.txt+'m</div></div>';
  h+='<div class="cmp"><div class="cmp-l">Throughput / Day</div><div class="cmp-v" style="color:var(--teal)">'+(tt&&days>0?(tt/days).toFixed(1):tt>0?tt:'0')+'</div><div class="cmp-d" style="color:var(--t4)">avg across period</div></div>';
  h+='</div>';

  var chartDays=Math.min(days||30,90)||30;
  h+='<h2>📊 Activity Trends</h2>';
  h+='<div class="ch-grid">';
  h+='<div class="ch-card"><h3>📈 Daily Completions</h3><div class="ch-w"><canvas id="ac-daily"></canvas></div></div>';
  h+='<div class="ch-card"><h3>⏱ Daily Time Tracked</h3><div class="ch-w"><canvas id="ac-time"></canvas></div></div>';
  h+='<div class="ch-card"><h3>📉 7-Day Rolling Avg</h3><div class="ch-w"><canvas id="ac-rolling"></canvas></div></div>';
  h+='<div class="ch-card"><h3>💰 Cumulative Hours</h3><div class="ch-w"><canvas id="ac-cumul"></canvas></div></div>';
  h+='</div>';

  h+='<h2>⏱ Time Distribution</h2>';
  h+='<div class="ch-grid"><div class="ch-card"><h3>📂 By Category</h3><div class="ch-w"><canvas id="ac-cat"></canvas></div></div>';
  h+='<div class="ch-card"><h3>👤 By Client</h3><div class="ch-w"><canvas id="ac-cli"></canvas></div></div>';
  h+='<div class="ch-card"><h3>🏢 By End Client</h3><div class="ch-w"><canvas id="ac-ec"></canvas></div></div>';
  h+='<div class="ch-card"><h3>💼 Business vs Personal</h3><div class="ch-w"><canvas id="ac-type"></canvas></div></div>';
  h+='<div class="ch-card"><h3>🎯 By Importance</h3><div class="ch-w"><canvas id="ac-imp"></canvas></div></div></div>';

  var catD={},catN={};done.forEach(function(d){var c=d.category||'Uncategorised';catD[c]=(catD[c]||0)+d.duration;catN[c]=(catN[c]||0)+1});
  var catK=Object.keys(catD).sort(function(a,b){return catD[b]-catD[a]});var maxC=catK.length?catD[catK[0]]:1;
  var catTotal=0;catK.forEach(function(c){catTotal+=catD[c]});
  h+='<div class="tb-wrap"><table class="tb"><thead><tr><th style="width:25%">Category</th><th class="r" style="width:10%">Time</th><th class="r" style="width:8%">%</th><th class="c" style="width:8%">Tasks</th><th class="r" style="width:10%">Avg</th><th style="width:39%">Visual</th></tr></thead><tbody>';
  catK.forEach(function(c,i){var pct=Math.round(catD[c]/maxC*100),share=catTotal?Math.round(catD[c]/catTotal*100):0;
    h+='<tr><td data-label="Category">'+esc(c)+'</td><td data-label="Time" class="nm" style="color:'+P[i%P.length]+'">'+fmtM(catD[c])+'</td><td data-label="%" class="nm" style="color:var(--t3)">'+share+'%</td><td data-label="Tasks" class="tc">'+catN[c]+'</td><td data-label="Avg" class="nm" style="color:var(--t3)">'+fmtM(Math.round(catD[c]/catN[c]))+'</td><td class="bar-c"><div class="bar" style="width:'+pct+'%;background:'+P[i%P.length]+'"></div></td></tr>'});
  h+='</tbody></table></div>';

  var cliD={},cliN={};done.forEach(function(d){var c=d.client||'Unassigned';cliD[c]=(cliD[c]||0)+d.duration;cliN[c]=(cliN[c]||0)+1});
  var cliK=Object.keys(cliD).sort(function(a,b){return cliD[b]-cliD[a]});var maxCl=cliK.length?cliD[cliK[0]]:1;
  var cliTotal=0;cliK.forEach(function(c){cliTotal+=cliD[c]});
  h+='<div class="tb-wrap" style="margin-top:16px"><table class="tb"><thead><tr><th style="width:25%">Client</th><th class="r" style="width:10%">Time</th><th class="r" style="width:8%">%</th><th class="c" style="width:8%">Tasks</th><th class="r" style="width:10%">Avg</th><th style="width:39%">Visual</th></tr></thead><tbody>';
  cliK.forEach(function(c,i){var pct=Math.round(cliD[c]/maxCl*100),share=cliTotal?Math.round(cliD[c]/cliTotal*100):0;
    h+='<tr><td data-label="Client">'+esc(c)+'</td><td data-label="Time" class="nm" style="color:var(--pink50)">'+fmtM(cliD[c])+'</td><td data-label="%" class="nm" style="color:var(--t3)">'+share+'%</td><td data-label="Tasks" class="tc">'+cliN[c]+'</td><td data-label="Avg" class="nm" style="color:var(--t3)">'+fmtM(cliN[c]?Math.round(cliD[c]/cliN[c]):0)+'</td><td class="bar-c"><div class="bar" style="width:'+pct+'%;background:var(--pink)"></div></td></tr>'});
  h+='</tbody></table></div>';

  var ecD={},ecN={};done.forEach(function(d){var ec=d.endClient||'';if(!ec)return;ecD[ec]=(ecD[ec]||0)+d.duration;ecN[ec]=(ecN[ec]||0)+1});
  var ecK=Object.keys(ecD).sort(function(a,b){return ecD[b]-ecD[a]});
  if(ecK.length){
    var maxEc=ecK.length?ecD[ecK[0]]:1;var ecTotal=0;ecK.forEach(function(c){ecTotal+=ecD[c]});
    h+='<div class="tb-wrap" style="margin-top:16px"><table class="tb"><thead><tr><th style="width:25%">End Client</th><th class="r" style="width:10%">Time</th><th class="r" style="width:8%">%</th><th class="c" style="width:8%">Tasks</th><th class="r" style="width:10%">Avg</th><th style="width:39%">Visual</th></tr></thead><tbody>';
    ecK.forEach(function(c,i){var pct=Math.round(ecD[c]/maxEc*100),share=ecTotal?Math.round(ecD[c]/ecTotal*100):0;
      h+='<tr><td data-label="End Client">'+esc(c)+'</td><td data-label="Time" class="nm" style="color:var(--teal)">'+fmtM(ecD[c])+'</td><td data-label="%" class="nm" style="color:var(--t3)">'+share+'%</td><td data-label="Tasks" class="tc">'+ecN[c]+'</td><td data-label="Avg" class="nm" style="color:var(--t3)">'+fmtM(ecN[c]?Math.round(ecD[c]/ecN[c]):0)+'</td><td class="bar-c"><div class="bar" style="width:'+pct+'%;background:var(--teal)"></div></td></tr>'});
    h+='</tbody></table></div>'}

  /* Campaign breakdown */
  var cpD={},cpN={},cpPay={};
  done.forEach(function(d){if(!d.campaign)return;var cp=S.campaigns.find(function(c){return c.id===d.campaign});if(!cp)return;var nm=cp.name;cpD[nm]=(cpD[nm]||0)+d.duration;cpN[nm]=(cpN[nm]||0)+1});
  S.payments.forEach(function(p){cpPay[p.campaignName]=(cpPay[p.campaignName]||0)+p.amount});
  var cpK=Object.keys(cpD).sort(function(a,b){return cpD[b]-cpD[a]});
  if(cpK.length){
    h+='<h2>🎯 Campaign Breakdown</h2>';
    h+='<div class="ch-grid"><div class="ch-card"><h3>🎯 By Campaign</h3><div class="ch-w"><canvas id="ac-cp"></canvas></div></div></div>';
    var maxCp=cpK.length?cpD[cpK[0]]:1;var cpTotal=0;cpK.forEach(function(c){cpTotal+=cpD[c]});
    h+='<div class="tb-wrap" style="margin-top:16px"><table class="tb"><thead><tr><th style="width:22%">Campaign</th><th class="r" style="width:10%">Time</th><th class="r" style="width:8%">%</th><th class="c" style="width:8%">Tasks</th><th class="r" style="width:12%">Payments</th><th style="width:40%">Visual</th></tr></thead><tbody>';
    cpK.forEach(function(c,i){var pct=Math.round(cpD[c]/maxCp*100),share=cpTotal?Math.round(cpD[c]/cpTotal*100):0;
      h+='<tr><td data-label="Campaign">'+esc(c)+'</td><td data-label="Time" class="nm" style="color:var(--amber)">'+fmtM(cpD[c])+'</td><td data-label="%" class="nm" style="color:var(--t3)">'+share+'%</td><td data-label="Tasks" class="tc">'+cpN[c]+'</td><td data-label="Payments" class="nm" style="color:var(--green)">'+fmtUSD(cpPay[c]||0)+'</td><td class="bar-c"><div class="bar" style="width:'+pct+'%;background:var(--amber)"></div></td></tr>'});
    h+='</tbody></table></div>'}

  h+='<h2>🧠 Productivity Patterns</h2>';

  var dowData={};for(var di=0;di<7;di++)dowData[di]={tasks:0,mins:0};
  done.forEach(function(d){if(!d.completed)return;var dw2=d.completed.getDay();dowData[dw2].tasks++;dowData[dw2].mins+=d.duration});
  var maxDow=0,bestDay=-1,bestTasks=0;
  Object.keys(dowData).forEach(function(k){if(dowData[k].tasks>maxDow)maxDow=dowData[k].tasks;if(dowData[k].tasks>bestTasks){bestTasks=dowData[k].tasks;bestDay=parseInt(k)}});
  h+='<h3 style="margin-bottom:12px">📅 Day-of-Week</h3><div class="dow-grid">';
  [1,2,3,4,5,6,0].forEach(function(d){var dd=dowData[d],pct=maxDow?Math.round(dd.tasks/maxDow*100):0;
    h+='<div class="dow-card'+(d===bestDay?' best':'')+'"><div class="dow-day">'+DAYSHORT[d]+'</div>';
    h+='<div class="dow-val" style="color:'+(d===bestDay?'var(--green)':'var(--t1)')+'">'+dd.tasks+'</div>';
    h+='<div class="dow-sub">'+fmtM(dd.mins)+'</div>';
    h+='<div class="dow-bar-wrap"><div class="dow-bar-fill" style="width:'+pct+'%;background:'+(d===bestDay?'var(--green)':'var(--pink)')+'"></div></div></div>'});
  h+='</div>';

  h+='<div class="ins-grid"><div class="ins-card"><h3>🕐 Peak Hours</h3><div class="heatmap" id="ac-peak"></div></div>';
  h+='<div class="ins-card"><h3>🎯 Focus vs Quick</h3><div class="ch-w"><canvas id="ac-focus"></canvas></div></div></div>';

  var focusCount=0,focusMins=0,fragCount=0,fragMins=0;
  done.forEach(function(d){if(d.duration>=25){focusCount++;focusMins+=d.duration}else{fragCount++;fragMins+=d.duration}});
  var focusPct=done.length?Math.round(focusCount/done.length*100):0;
  h+='<div class="cmp-grid">';
  h+='<div class="cmp"><div class="cmp-l">Deep Focus (25m+)</div><div class="cmp-v" style="color:var(--green)">'+focusCount+'</div><div class="cmp-d" style="color:var(--t3)">'+fmtM(focusMins)+' total</div></div>';
  h+='<div class="cmp"><div class="cmp-l">Quick Tasks (&lt;25m)</div><div class="cmp-v" style="color:var(--amber)">'+fragCount+'</div><div class="cmp-d" style="color:var(--t3)">'+fmtM(fragMins)+' total</div></div>';
  h+='<div class="cmp"><div class="cmp-l">Focus Ratio</div><div class="cmp-v" style="color:'+(focusPct>=50?'var(--green)':'var(--amber)')+'">'+focusPct+'%</div><div class="cmp-d" style="color:var(--t4)">of tasks are deep work</div></div>';
  h+='<div class="cmp"><div class="cmp-l">Avg Focus Session</div><div class="cmp-v" style="color:var(--blue)">'+(focusCount?fmtM(Math.round(focusMins/focusCount)):'--')+'</div><div class="cmp-d" style="color:var(--t4)">per deep work task</div></div>';
  h+='</div>';

  var wE=done.filter(function(d){return d.est>0&&d.duration>0});
  if(wE.length){
    var totEst=0,totAct=0;wE.forEach(function(d){totEst+=d.est;totAct+=d.duration});
    var avgAcc=Math.round(totAct/totEst*100);
    h+='<h2>🎯 Estimation Intelligence</h2>';
    h+='<div class="cmp-grid">';
    h+='<div class="cmp"><div class="cmp-l">Overall Accuracy</div><div class="cmp-v" style="color:'+(avgAcc>120?'var(--red)':avgAcc<80?'var(--blue)':'var(--green)')+'">'+avgAcc+'%</div><div class="cmp-d">'+fmtM(totAct)+' actual vs '+fmtM(totEst)+' est.</div></div>';
    h+='<div class="cmp"><div class="cmp-l">Under-estimated</div><div class="cmp-v" style="color:var(--red)">'+wE.filter(function(d){return d.duration>d.est*1.2}).length+'</div><div class="cmp-d" style="color:var(--t4)">took 20%+ longer</div></div>';
    h+='<div class="cmp"><div class="cmp-l">Over-estimated</div><div class="cmp-v" style="color:var(--blue)">'+wE.filter(function(d){return d.duration<d.est*0.8}).length+'</div><div class="cmp-d" style="color:var(--t4)">finished 20%+ faster</div></div>';
    h+='<div class="cmp"><div class="cmp-l">Spot On (±20%)</div><div class="cmp-v" style="color:var(--green)">'+wE.filter(function(d){var r=d.duration/d.est;return r>=0.8&&r<=1.2}).length+'</div><div class="cmp-d" style="color:var(--t4)">'+Math.round(wE.filter(function(d){var r=d.duration/d.est;return r>=0.8&&r<=1.2}).length/wE.length*100)+'% of estimated tasks</div></div>';
    h+='</div>';

    h+='<div class="ins-grid" style="margin-bottom:18px"><div class="ins-card" style="grid-column:1/-1"><h3>📉 Accuracy Trend (by week)</h3><div style="height:170px"><canvas id="ac-acc-trend"></canvas></div></div></div>';

    var catAcc={};wE.forEach(function(d){var c=d.category||'Uncategorised';if(!catAcc[c])catAcc[c]={est:0,act:0,n:0};catAcc[c].est+=d.est;catAcc[c].act+=d.duration;catAcc[c].n++});
    var caK=Object.keys(catAcc).sort(function(a,b){return catAcc[b].n-catAcc[a].n});
    if(caK.length>1){
      h+='<h3 style="margin-bottom:10px">📂 Accuracy by Category</h3><div class="tb-wrap"><table class="tb"><thead><tr><th style="width:25%">Category</th><th class="r" style="width:12%">Tasks</th><th class="r" style="width:12%">Est.</th><th class="r" style="width:12%">Actual</th><th class="r" style="width:12%">Accuracy</th><th style="width:27%">Tendency</th></tr></thead><tbody>';
      caK.forEach(function(c){var ca=catAcc[c],acc=Math.round(ca.act/ca.est*100);
        var tend=acc>120?'🔴 Under-estimating':acc<80?'🔵 Over-estimating':'🟢 Good';
        h+='<tr><td>'+esc(c)+'</td><td class="nm">'+ca.n+'</td><td class="nm" style="color:var(--blue)">'+fmtM(ca.est)+'</td><td class="nm" style="color:var(--pink50)">'+fmtM(ca.act)+'</td><td class="nm" style="color:'+(acc>120?'var(--red)':acc<80?'var(--blue)':'var(--green)')+';font-weight:700">'+acc+'%</td><td style="font-size:12px">'+tend+'</td></tr>'});
      h+='</tbody></table></div>'}

    h+='<h3 style="margin:20px 0 12px">📋 Task Detail</h3><div class="tb-wrap"><table class="tb"><thead><tr><th style="width:28%">Task</th><th style="width:14%">Category</th><th class="r" style="width:10%">Est.</th><th class="r" style="width:10%">Actual</th><th class="r" style="width:10%">Diff</th><th class="r" style="width:10%">Accuracy</th></tr></thead><tbody>';
    wE.sort(function(a,b){return Math.abs(b.duration/b.est-1)-Math.abs(a.duration/a.est-1)});
    wE.slice(0,20).forEach(function(d){var diff=d.duration-d.est,acc=Math.round(d.duration/d.est*100);
      h+='<tr><td>'+esc(d.item)+'</td><td style="color:var(--t3)">'+esc(d.category)+'</td><td class="nm" style="color:var(--blue)">'+fmtM(d.est)+'</td><td class="nm" style="color:var(--pink50)">'+fmtM(d.duration)+'</td><td class="nm" style="color:'+(diff>0?'var(--red)':'var(--green)')+'">'+(diff>0?'+':'')+diff+'m</td><td class="nm" style="color:'+(acc>120?'var(--red)':acc<80?'var(--blue)':'var(--green)')+';font-weight:700">'+acc+'%</td></tr>'});
    if(wE.length>20)h+='<tr><td colspan="6" style="text-align:center;color:var(--t4);font-size:12px">Showing top 20 of '+wE.length+' estimated tasks</td></tr>';
    h+='</tbody></table></div>'}

  var wV={};done.forEach(function(d){if(!d.completed)return;var ws=wkStart(d.completed),k=ws.toISOString().slice(0,10);
    if(!wV[k])wV[k]={date:ws,tasks:0,mins:0};wV[k].tasks++;wV[k].mins+=d.duration});var vK=Object.keys(wV).sort().slice(-12);
  if(vK.length>=2){
    h+='<h2>🚀 Velocity & Trends</h2>';
    h+='<div class="ins-grid" style="margin-bottom:18px"><div class="ins-card" style="grid-column:1/-1"><h3>📈 Weekly Tasks Trend</h3><div style="height:170px"><canvas id="ac-vel-trend"></canvas></div></div></div>';
    h+='<div class="tb-wrap"><table class="tb"><thead><tr><th style="width:22%">Week</th><th class="r" style="width:10%">Tasks</th><th class="r" style="width:12%">Time</th><th class="r" style="width:12%">Avg/Task</th><th class="r" style="width:10%">Δ Tasks</th><th style="width:34%">Visual</th></tr></thead><tbody>';
    var maxV=0;vK.forEach(function(k){if(wV[k].tasks>maxV)maxV=wV[k].tasks});
    vK.reverse().forEach(function(k,idx){var w=wV[k],pct=Math.round(w.tasks/maxV*100);
      var prevK=vK[idx+1],delta='';
      if(prevK&&wV[prevK]){var d2=w.tasks-wV[prevK].tasks;delta='<span style="color:'+(d2>0?'var(--green)':d2<0?'var(--red)':'var(--t4)')+';font-weight:600">'+(d2>0?'▲ +':d2<0?'▼ ':'')+(d2===0?'--':Math.abs(d2))+'</span>'}
      h+='<tr><td>'+fmtDFull(w.date)+'</td><td class="nm" style="color:var(--pink50)">'+w.tasks+'</td><td class="nm">'+fmtM(w.mins)+'</td><td class="nm" style="color:var(--t3)">'+fmtM(w.tasks?Math.round(w.mins/w.tasks):0)+'</td><td class="tc">'+delta+'</td><td class="bar-c"><div class="bar" style="width:'+pct+'%;background:var(--pink)"></div></td></tr>'});
    h+='</tbody></table></div>'}

  var moData={};done.forEach(function(d){if(!d.completed)return;var mk=d.completed.getFullYear()+'-'+String(d.completed.getMonth()+1).padStart(2,'0');
    if(!moData[mk])moData[mk]={tasks:0,mins:0,month:d.completed.getMonth(),year:d.completed.getFullYear()};moData[mk].tasks++;moData[mk].mins+=d.duration});
  var moKeys=Object.keys(moData).sort().reverse().slice(0,12);
  if(moKeys.length>1){h+='<h3 style="margin:20px 0 12px">📅 Monthly Summary</h3><div class="mo-grid">';
    moKeys.forEach(function(mk){var m=moData[mk];
      h+='<div class="mo-card"><div class="mo-month">'+MO[m.month]+' '+m.year+'</div>';
      h+='<div class="mo-val">'+m.tasks+'</div>';
      h+='<div class="mo-sub">tasks, '+fmtM(m.mins)+' tracked</div></div>'});
    h+='</div>'}

  var openFiltered=applyDropdownFilters(S.tasks);
  if(openFiltered.length){
    h+='<h2>🔮 Pipeline Health</h2>';
    var oImp={};openFiltered.forEach(function(t){var imp=t.importance||'Important';oImp[imp]=(oImp[imp]||0)+1});
    var oEst=0;openFiltered.forEach(function(t){oEst+=t.est});
    var avgDaily=tt&&days>0?totTrk/days:0;
    var daysToClear=avgDaily>0?Math.ceil(oEst/avgDaily):0;
    var odOpen=openFiltered.filter(function(t){return t.due&&t.due<td_}).length;
    var noDue=openFiltered.filter(function(t){return!t.due}).length;

    h+='<div class="cmp-grid">';
    h+='<div class="cmp"><div class="cmp-l">Open Tasks</div><div class="cmp-v" style="color:var(--t1)">'+openFiltered.length+'</div><div class="cmp-d" style="color:var(--t4)">'+fmtM(oEst)+' estimated</div></div>';
    h+='<div class="cmp"><div class="cmp-l">Days to Clear</div><div class="cmp-v" style="color:'+(daysToClear>10?'var(--red)':daysToClear>5?'var(--amber)':'var(--green)')+'">'+daysToClear+'</div><div class="cmp-d" style="color:var(--t4)">at current throughput</div></div>';
    h+='<div class="cmp"><div class="cmp-l">Overdue</div><div class="cmp-v" style="color:'+(odOpen?'var(--red)':'var(--green)')+'">'+odOpen+'</div><div class="cmp-d" style="color:var(--t4)">'+(noDue?noDue+' with no date':'all dated')+'</div></div>';
    h+='<div class="cmp"><div class="cmp-l">Flagged / Chasing</div><div class="cmp-v" style="color:var(--cyan)">'+openFiltered.filter(function(t){return t.flag||t.status==='Need Client Input'}).length+'</div><div class="cmp-d" style="color:var(--t4)">awaiting client input</div></div>';
    h+='</div>';

    h+='<div class="ins-grid"><div class="ins-card"><h3>🎯 Open by Importance</h3><div class="ch-w"><canvas id="ac-pipe-imp"></canvas></div></div>';
    h+='<div class="ins-card"><h3>👤 Open by Client</h3><div class="ch-w"><canvas id="ac-pipe-cli"></canvas></div></div></div>';

    var aging=openFiltered.filter(function(t){return t.due&&t.due<td_});
    if(aging.length){
      aging.sort(function(a,b){return a.due.getTime()-b.due.getTime()});
      var totalOverdueDays=0;aging.forEach(function(t){totalOverdueDays+=Math.abs(dayDiff(td_,t.due))});
      h+='<h3 style="margin:16px 0 12px">⏳ Aging Analysis ('+aging.length+' overdue, avg '+Math.round(totalOverdueDays/aging.length)+' days)</h3>';
      h+='<div class="tb-wrap"><table class="tb"><thead><tr><th style="width:30%">Task</th><th style="width:12%">Importance</th><th style="width:15%">Client</th><th class="r" style="width:12%">Due</th><th class="r" style="width:10%">Days Late</th><th class="r" style="width:10%">Est.</th></tr></thead><tbody>';
      aging.slice(0,10).forEach(function(t){var late=Math.abs(dayDiff(td_,t.due));
        h+='<tr style="cursor:pointer" onclick="TF.openDetail(\''+escAttr(t.id)+'\')"><td>'+esc(t.item)+'</td><td><span class="bg '+impCls(t.importance)+'">'+esc(t.importance)+'</span></td>';
        h+='<td style="color:var(--t3)">'+esc(t.client||'')+'</td><td class="nm" style="color:var(--red)">'+dueLabel(t.due,td_)+'</td><td class="nm" style="color:var(--red);font-weight:700">'+late+'</td><td class="nm">'+fmtM(t.est)+'</td></tr>'});
      if(aging.length>10)h+='<tr><td colspan="6" style="text-align:center;color:var(--t4);font-size:12px">+ '+(aging.length-10)+' more overdue</td></tr>';
      h+='</tbody></table></div>'}}

  if(done.length>=5){
    h+='<h2>🏆 Highlights</h2>';
    var fastest=done.filter(function(d){return d.est>0&&d.duration>0}).slice().sort(function(a,b){return(a.duration/a.est)-(b.duration/b.est)}).slice(0,5);
    var biggest=done.slice().sort(function(a,b){return b.duration-a.duration}).slice(0,5);
    h+='<div class="ins-grid">';
    if(fastest.length>=3){h+='<div class="ins-card"><h3>⚡ Most Efficient</h3>';
      fastest.forEach(function(d){var acc=Math.round(d.duration/d.est*100);
        h+='<div class="ov-item" style="cursor:default"><span class="bg '+impCls(d.importance||'Important')+'">'+acc+'%</span><span class="ov-item-name">'+esc(d.item)+'</span><span class="ov-item-meta" style="color:var(--green);font-weight:600">'+fmtM(d.duration)+'</span></div>'});
      h+='</div>'}
    h+='<div class="ins-card"><h3>🕐 Biggest Time Investments</h3>';
    biggest.forEach(function(d){
      h+='<div class="ov-item" style="cursor:default"><span class="bg bg-cl">'+esc(d.client||'--')+'</span><span class="ov-item-name">'+esc(d.item)+'</span><span class="ov-item-meta" style="color:var(--pink);font-weight:600">'+fmtM(d.duration)+'</span></div>'});
    h+='</div></div>'}

  if(!done.length)h+='<div class="no-data" style="margin-top:30px">No completed tasks match your filters for this period.</div>';
  return h}

/* ═══════════ ANALYTICS CHARTS ═══════════ */
function initAnalyticsCharts(){
  var td_=today();
  var cutoff=S.dashPeriod>0?new Date(td_.getTime()-S.dashPeriod*864e5):null;
  var periodDone=S.done.filter(function(d){return!cutoff||!d.completed||d.completed>=cutoff});
  var done=applyFilters(periodDone,true);
  var days=Math.min(S.dashPeriod||30,90)||30;

  var dayD={},dayT={},labels=[],vals=[],tvals=[];
  for(var i=days-1;i>=0;i--){var dt=new Date(td_);dt.setDate(td_.getDate()-i);var k=dt.toISOString().slice(0,10);dayD[k]=0;dayT[k]=0;labels.push(fmtDShort(dt))}
  done.forEach(function(d){if(!d.completed)return;var k=d.completed.toISOString().slice(0,10);if(k in dayD){dayD[k]++;dayT[k]+=d.duration}});
  Object.keys(dayD).sort().forEach(function(k){vals.push(dayD[k]);tvals.push(Math.round(dayT[k]/60*10)/10)});
  mkLine('ac-daily',labels,vals,'#ff0099');
  mkLine('ac-time',labels,tvals,'#7928ca');

  var rolling=[];for(var r=0;r<vals.length;r++){var s2=0,c2=0;for(var j=Math.max(0,r-6);j<=r;j++){s2+=vals[j];c2++}rolling.push(Math.round(s2/c2*10)/10)}
  mkLine('ac-rolling',labels,rolling,'#3ddc84');

  var cumLabels=[],cumVals=[],cumTotal=0;
  var sortedDone=done.filter(function(d){return d.completed}).slice().sort(function(a,b){return a.completed.getTime()-b.completed.getTime()});
  var cumByDay={};sortedDone.forEach(function(d){var k=d.completed.toISOString().slice(0,10);cumByDay[k]=(cumByDay[k]||0)+d.duration});
  Object.keys(dayD).sort().forEach(function(k){cumTotal+=(cumByDay[k]||0);cumLabels.push(fmtDShort(new Date(k)));cumVals.push(Math.round(cumTotal/60*10)/10)});
  mkLine('ac-cumul',cumLabels,cumVals,'#4da6ff');

  var catD={};done.forEach(function(d){catD[d.category||'Uncategorised']=(catD[d.category||'Uncategorised']||0)+d.duration});mkDonut('ac-cat',catD);
  var cliD={};done.forEach(function(d){cliD[d.client||'Unassigned']=(cliD[d.client||'Unassigned']||0)+d.duration});mkHBar('ac-cli',cliD);
  var ecD2={};done.forEach(function(d){if(d.endClient)ecD2[d.endClient]=(ecD2[d.endClient]||0)+d.duration});if(Object.keys(ecD2).length)mkHBar('ac-ec',ecD2);
  var cpD2={};done.forEach(function(d){if(!d.campaign)return;var cp=S.campaigns.find(function(c){return c.id===d.campaign});if(cp)cpD2[cp.name]=(cpD2[cp.name]||0)+d.duration});if(Object.keys(cpD2).length)mkHBar('ac-cp',cpD2);
  var typeD={};done.forEach(function(d){typeD[d.type||'Other']=(typeD[d.type||'Other']||0)+d.duration});mkDonut('ac-type',typeD);
  var impD={};done.forEach(function(d){impD[d.importance||'Important']=(impD[d.importance||'Important']||0)+d.duration});mkDonut('ac-imp',impD);

  var hD={};for(var h2=6;h2<=22;h2++)hD[h2]={c:0,m:0};
  done.forEach(function(d){if(!d.completed)return;var hr=d.completed.getHours();if(hr>=6&&hr<=22){hD[hr].c++;hD[hr].m+=d.duration}});
  var mxH=0;Object.values(hD).forEach(function(v){if(v.c>mxH)mxH=v.c});
  var ph='';for(var h3=6;h3<=22;h3++){var int=mxH>0?hD[h3].c/mxH:0;
    var bg=int>.6?'rgba(255,0,153,0.3)':int>.3?'rgba(121,40,202,0.2)':int>0?'rgba(121,40,202,0.08)':'rgba(28,20,80,0.35)';
    ph+='<div class="heat" style="background:'+bg+'"><div style="font-weight:700;color:var(--t1);font-family:var(--fd);letter-spacing:0.02em">'+(h3<10?'0':'')+h3+':00</div><div style="color:var(--t3);font-size:9px">'+hD[h3].c+' tasks</div>'+(hD[h3].m?'<div style="color:var(--pink50);font-size:9px;font-weight:600">'+fmtM(hD[h3].m)+'</div>':'')+'</div>'}
  var peakEl=gel('ac-peak');if(peakEl)peakEl.innerHTML=ph;

  var fD={'Deep Focus (25m+)':0,'Quick Tasks':0};
  done.forEach(function(d){if(d.duration>=25)fD['Deep Focus (25m+)']+=d.duration;else fD['Quick Tasks']+=d.duration});
  mkDonut('ac-focus',fD);

  var wE=done.filter(function(d){return d.est>0&&d.duration>0&&d.completed});
  if(wE.length>=3){var accWks={};wE.forEach(function(d){var ws=wkStart(d.completed),k=ws.toISOString().slice(0,10);
    if(!accWks[k])accWks[k]={est:0,act:0};accWks[k].est+=d.est;accWks[k].act+=d.duration});
    var aK=Object.keys(accWks).sort().slice(-12),aL=[],aV=[];
    aK.forEach(function(k){aL.push(fmtDShort(new Date(k)));aV.push(Math.round(accWks[k].act/accWks[k].est*100))});
    mkLine('ac-acc-trend',aL,aV,'#3ddc84')}

  var wV={};done.forEach(function(d){if(!d.completed)return;var ws=wkStart(d.completed),k=ws.toISOString().slice(0,10);
    if(!wV[k])wV[k]={date:ws,tasks:0};wV[k].tasks++});
  var velK=Object.keys(wV).sort().slice(-12);
  if(velK.length>=2){var vL=[],vV=[];velK.forEach(function(k){vL.push(fmtDShort(wV[k].date));vV.push(wV[k].tasks)});mkLine('ac-vel-trend',vL,vV,'#ff0099')}

  var openFiltered=applyDropdownFilters(S.tasks);
  var oImp={};openFiltered.forEach(function(t){oImp[t.importance||'Important']=(oImp[t.importance||'Important']||0)+1});mkDonut('ac-pipe-imp',oImp);
  var oCli={};openFiltered.forEach(function(t){oCli[t.client||'Internal / N/A']=(oCli[t.client||'Internal / N/A']||0)+1});mkHBar('ac-pipe-cli',oCli);

  /* HEATMAP CALENDAR */
  renderHeatmap()}

/* ═══════════ WEEKLY ═══════════ */
function rWeekly(){if(!S.done.length&&!S.tasks.length)return'<div class="pg-head"><h1>Weekly Review</h1></div><div class="no-data">No data yet.</div>';
  var td_=today(),thisWk=wkStart(td_),nextWk=new Date(thisWk);nextWk.setDate(nextWk.getDate()+7);
  var nextWkEnd=new Date(nextWk);nextWkEnd.setDate(nextWkEnd.getDate()+7);
  var filtered=applyFilters(S.done,true);
  var weeks={};filtered.forEach(function(d){if(!d.completed)return;var ws=wkStart(d.completed),key=ws.toISOString().slice(0,10);
    if(!weeks[key])weeks[key]={start:ws,items:[],dur:0,est:0,cats:{},clients:{}};weeks[key].items.push(d);weeks[key].dur+=d.duration;weeks[key].est+=(d.est||0);
    var cat=d.category||'Uncategorised';weeks[key].cats[cat]=(weeks[key].cats[cat]||0)+d.duration;
    var cli=d.client||'Internal / N/A';weeks[key].clients[cli]=(weeks[key].clients[cli]||0)+d.duration});
  var wks=Object.keys(weeks).sort().reverse();
  var h='<div class="pg-head"><h1>Weekly Review</h1><div class="stats"><div class="st"><b style="color:var(--t1)">'+wks.length+'</b> weeks tracked</div></div></div>';
  h+=filterBar(S.done,true);

  /* ── Side-by-side: Unfinished Business + Next Week Preview ── */
  var unfinished=S.tasks.filter(function(t){return t.due&&t.due<nextWk});
  var nextWeekTasks=S.tasks.filter(function(t){return t.due&&t.due>=nextWk&&t.due<nextWkEnd});
  if(unfinished.length||nextWeekTasks.length){
    h+='<div class="wkr-duo">';
    /* Left: Unfinished */
    if(unfinished.length){
      unfinished.sort(function(a,b){var da=a.due?a.due.getTime():Infinity,db=b.due?b.due.getTime():Infinity;return da-db});
      var odCount=unfinished.filter(function(t){return t.due&&t.due<td_}).length;
      var ufEst=0;unfinished.forEach(function(t){ufEst+=t.est});
      h+='<div class="wkr-panel wkr-warn">';
      h+='<div class="wkr-panel-head"><span class="wkr-panel-icon">⚠️</span><span class="wkr-panel-title">Unfinished Business</span></div>';
      h+='<div class="wkr-panel-stats">';
      h+='<span><b>'+unfinished.length+'</b> tasks</span>';
      if(odCount)h+='<span style="color:var(--red)"><b>'+odCount+'</b> overdue</span>';
      h+='<span><b>'+fmtM(ufEst)+'</b> est.</span>';
      h+='</div>';
      h+='<div class="wkr-panel-list">';
      unfinished.slice(0,6).forEach(function(t){var isOd=t.due&&t.due<td_;
        h+='<div class="wkr-row" onclick="TF.openDetail(\''+escAttr(t.id)+'\')">';
        h+='<span class="bg '+impCls(t.importance)+'" style="font-size:9px;padding:2px 7px;flex-shrink:0">'+esc(t.importance).charAt(0)+'</span>';
        h+='<span class="wkr-row-name">'+esc(t.item)+'</span>';
        h+='<span class="wkr-row-meta" style="color:'+(isOd?'var(--red)':'var(--t4)')+'">'+dueLabel(t.due,td_).split('(').pop().replace(')','')+'</span>';
        h+='</div>'});
      if(unfinished.length>6)h+='<div style="font-size:10px;color:var(--t4);padding:4px 0;text-align:center">+ '+(unfinished.length-6)+' more</div>';
      h+='</div></div>';
    } else {
      h+='<div class="wkr-panel wkr-ok">';
      h+='<div class="wkr-panel-head"><span class="wkr-panel-icon">✅</span><span class="wkr-panel-title">All Caught Up</span></div>';
      h+='<div style="text-align:center;padding:20px 0;color:var(--t4);font-size:12px">No overdue or due-this-week tasks</div>';
      h+='</div>';
    }
    /* Right: Next Week */
    if(nextWeekTasks.length){
      nextWeekTasks.sort(function(a,b){return a.due.getTime()-b.due.getTime()});
      var nwEst=0;nextWeekTasks.forEach(function(t){nwEst+=t.est});
      var nwCrit=nextWeekTasks.filter(function(t){return t.importance==='Critical'}).length;
      h+='<div class="wkr-panel wkr-info">';
      h+='<div class="wkr-panel-head"><span class="wkr-panel-icon">🔮</span><span class="wkr-panel-title">Next Week Preview</span></div>';
      h+='<div class="wkr-panel-stats">';
      h+='<span><b>'+nextWeekTasks.length+'</b> tasks</span>';
      h+='<span><b>'+fmtM(nwEst)+'</b> est.</span>';
      if(nwCrit)h+='<span style="color:var(--red)"><b>'+nwCrit+'</b> critical</span>';
      h+='</div>';
      h+='<div class="wkr-panel-list">';
      nextWeekTasks.slice(0,6).forEach(function(t){
        h+='<div class="wkr-row" onclick="TF.openDetail(\''+escAttr(t.id)+'\')">';
        h+='<span class="bg '+impCls(t.importance)+'" style="font-size:9px;padding:2px 7px;flex-shrink:0">'+esc(t.importance).charAt(0)+'</span>';
        h+='<span class="wkr-row-name">'+esc(t.item)+'</span>';
        h+='<span class="wkr-row-meta">'+fmtDShort(t.due).split(',')[0]+'</span>';
        h+='</div>'});
      if(nextWeekTasks.length>6)h+='<div style="font-size:10px;color:var(--t4);padding:4px 0;text-align:center">+ '+(nextWeekTasks.length-6)+' more</div>';
      h+='</div></div>';
    } else {
      h+='<div class="wkr-panel wkr-info">';
      h+='<div class="wkr-panel-head"><span class="wkr-panel-icon">🔮</span><span class="wkr-panel-title">Next Week Preview</span></div>';
      h+='<div style="text-align:center;padding:20px 0;color:var(--t4);font-size:12px">No tasks due next week yet</div>';
      h+='</div>';
    }
    h+='</div>';
  }

  /* ── Per-week cards ── */
  wks.forEach(function(wk,idx){var w=weeks[wk];
    var prevKey=wks[idx+1],prev=prevKey?weeks[prevKey]:null;
    var isCurrent=wk===thisWk.toISOString().slice(0,10);

    /* Deltas */
    var taskD=0,durD=0;if(prev){taskD=w.items.length-prev.items.length;durD=w.dur-prev.dur}
    function delta(v,unit){if(!prev)return'';var c=v>0?'var(--green)':v<0?'var(--red)':'var(--t4)';var a=v>0?'▲':v<0?'▼':'';return' <span style="color:'+c+';font-size:10px;font-weight:600">'+a+(v===0?'—':(v>0?'+':'')+v+(unit||''))+'</span>'}

    /* Avg per task */
    var avgDur=w.items.length?Math.round(w.dur/w.items.length):0;
    /* Accuracy: est vs actual */
    var accuracy=w.est>0?Math.round(w.dur/w.est*100):0;

    h+='<div class="wkr-week'+(isCurrent?' wkr-current':'')+'">';

    /* Week header */
    h+='<div class="wkr-week-head">';
    h+='<div class="wkr-week-title">'+(isCurrent?'📌 This Week':'Week of '+fmtDFull(w.start))+'</div>';
    h+='</div>';

    /* Stat cards */
    h+='<div class="wkr-stats">';
    h+='<div class="wkr-stat"><div class="wkr-stat-v" style="color:var(--t1)">'+w.items.length+delta(taskD)+'</div><div class="wkr-stat-l">Completed</div></div>';
    h+='<div class="wkr-stat"><div class="wkr-stat-v" style="color:var(--pink)">'+fmtM(w.dur)+'</div><div class="wkr-stat-l">Tracked</div></div>';
    h+='<div class="wkr-stat"><div class="wkr-stat-v" style="color:var(--blue)">'+fmtM(avgDur)+'</div><div class="wkr-stat-l">Avg / Task</div></div>';
    h+='<div class="wkr-stat"><div class="wkr-stat-v" style="color:var(--amber)">'+fmtM(w.est)+'</div><div class="wkr-stat-l">Estimated</div></div>';
    if(accuracy>0)h+='<div class="wkr-stat"><div class="wkr-stat-v" style="color:'+(accuracy>120?'var(--red)':accuracy>90?'var(--amber)':'var(--green)')+'">'+accuracy+'%</div><div class="wkr-stat-l">Est. Accuracy</div></div>';
    h+='</div>';

    /* Category + Client breakdown side by side */
    var catKeys=Object.keys(w.cats).sort(function(a,b){return w.cats[b]-w.cats[a]});
    var cliKeys=Object.keys(w.clients).sort(function(a,b){return w.clients[b]-w.clients[a]});
    h+='<div class="wkr-breakdowns">';

    /* Categories */
    h+='<div class="wkr-breakdown">';
    h+='<div class="wkr-bd-title">By Category</div>';
    var maxCat=0;Object.values(w.cats).forEach(function(v){if(v>maxCat)maxCat=v});
    catKeys.slice(0,5).forEach(function(c,ci){var pct=maxCat?Math.round(w.cats[c]/maxCat*100):0;
      h+='<div class="cb-row"><span class="cb-lbl">'+esc(c)+'</span><div class="cb-trk"><div class="cb-fill" style="width:'+pct+'%;background:'+P[ci%P.length]+'"></div></div><span class="cb-val" style="color:'+P[ci%P.length]+'">'+fmtM(w.cats[c])+'</span></div>'});
    if(catKeys.length>5)h+='<div style="font-size:10px;color:var(--t4);padding:2px 0 0 4px">+ '+(catKeys.length-5)+' more</div>';
    h+='</div>';

    /* Clients */
    h+='<div class="wkr-breakdown">';
    h+='<div class="wkr-bd-title">By Client</div>';
    var maxCli=0;Object.values(w.clients).forEach(function(v){if(v>maxCli)maxCli=v});
    cliKeys.slice(0,5).forEach(function(c,ci){var pct=maxCli?Math.round(w.clients[c]/maxCli*100):0;
      h+='<div class="cb-row"><span class="cb-lbl">'+esc(c)+'</span><div class="cb-trk"><div class="cb-fill" style="width:'+pct+'%;background:'+P[(ci+6)%P.length]+'"></div></div><span class="cb-val" style="color:'+P[(ci+6)%P.length]+'">'+fmtM(w.clients[c])+'</span></div>'});
    if(cliKeys.length>5)h+='<div style="font-size:10px;color:var(--t4);padding:2px 0 0 4px">+ '+(cliKeys.length-5)+' more</div>';
    h+='</div></div>';

    /* Collapsible task list */
    var wkCollKey='wkr-'+wk;
    var wkColl=S.collapsed[wkCollKey];
    h+='<div class="wkr-tasks-toggle" onclick="TF.toggle(\''+wkCollKey+'\')">';
    h+='<span>📋 '+w.items.length+' tasks</span><span class="sec-toggle">'+(wkColl?'▸':'▾')+'</span></div>';
    h+='<div class="'+(wkColl?'collapsed':'')+'">';
    h+='<div class="wkr-task-list">';
    w.items.forEach(function(it){
      h+='<div class="wkr-task-row">';
      h+='<span style="color:var(--green);font-size:11px;flex-shrink:0">'+CK_XS+'</span>';
      h+='<span class="bg '+impCls(it.importance||'Important')+'" style="font-size:9px;padding:2px 7px;flex-shrink:0">'+esc(it.importance||'').charAt(0)+'</span>';
      h+='<span class="wkr-task-name">'+esc(it.item)+'</span>';
      if(it.client&&it.client!=='Internal / N/A')h+='<span class="bg bg-cl" style="font-size:9px">'+esc(it.client)+'</span>';
      if(it.category)h+='<span class="bg bg-ca" style="font-size:9px">'+esc(it.category)+'</span>';
      h+='<span class="wkr-task-dur">'+fmtM(it.duration)+'</span>';
      h+='</div>'});
    h+='</div></div></div>'});
  if(!wks.length)h+='<div class="no-data">No completed tasks match your filters.</div>';
  return h}
/* ═══════════ REVIEW TAB ═══════════ */
var reviewIdx=0;
function rReview(){
  var h='<div class="pg-head"><h1>📥 Review</h1>';
  if(S.review.length)h+='<div class="stats"><div class="st"><b style="color:var(--pink)">'+S.review.length+'</b> pending</div></div>';
  h+='</div>';
  if(!S.review.length)return h+'<div class="no-data" style="padding:64px 20px"><div style="font-size:40px;margin-bottom:18px">📭</div><div style="font-size:16px;color:var(--t2);margin-bottom:10px;font-weight:500">No tasks to review</div><div style="font-size:13px;color:var(--t4)">Items from email and Read.ai will appear here automatically.</div></div>';
  var items=reviewSorted();
  h+='<div class="rv-list">';
  items.forEach(function(r,i){
    h+='<div class="rv-card" onclick="TF.openReviewAt('+i+')">';
    h+='<div class="rv-card-left">';
    if(r.source==='Email'){h+='<span class="bg" style="background:rgba(59,130,246,0.1);color:#3b82f6;font-size:10px">📧</span>'}
    else if(r.source==='Read.ai'){h+='<span class="bg" style="background:rgba(16,185,129,0.1);color:#10b981;font-size:10px">🎙</span>'}
    h+='<span class="bg '+impCls(r.importance)+'">'+esc(r.importance)+'</span>';
    h+='<span class="rv-name">'+esc(r.item)+'</span>';
    h+='</div>';
    h+='<div class="rv-card-right">';
    if(r.client&&r.client!=='Internal / N/A')h+='<span class="bg bg-cl">'+esc(r.client)+'</span>';
    if(r.endClient)h+='<span class="bg bg-ec">'+esc(r.endClient)+'</span>';
    if(r.category)h+='<span class="bg bg-ca">'+esc(r.category)+'</span>';
    if(r.est)h+='<span class="bg-es">⏱ '+fmtM(r.est)+'</span>';
    if(r.due)h+='<span class="bg-du">📅 '+fmtDShort(r.due)+'</span>';
    h+='</div></div>'});
  h+='</div>';return h}

function reviewSorted(){return S.review.slice().sort(function(a,b){return(b.created?b.created.getTime():0)-(a.created?a.created.getTime():0)})}

/* ═══════════ COMPLETED TAB ═══════════ */
function rCompleted(){
  var filtered=applyFilters(S.done,true);
  var totalMins=0;filtered.forEach(function(d){totalMins+=d.duration});
  var td=today();

  filtered.sort(function(a,b){
    var da=a.completed?a.completed.getTime():0,db=b.completed?b.completed.getTime():0;return db-da});

  var h='<div class="pg-head"><h1>Completed</h1><div class="stats">';
  h+='<div class="st"><b style="color:var(--green)">'+filtered.length+'</b> tasks</div>';
  h+='<div class="st"><b style="color:var(--pink)">'+fmtM(totalMins)+'</b> tracked</div>';
  if(filtered.length)h+='<div class="st"><b style="color:var(--blue)">'+fmtM(Math.round(totalMins/filtered.length))+'</b> avg</div>';
  h+='</div></div>';
  h+=filterBar(S.done,true);
  if(!filtered.length)return h+'<div class="no-data">No completed tasks match your filters.</div>';

  var groups={};
  filtered.forEach(function(d){
    var key=d.completed?d.completed.toISOString().slice(0,10):'unknown';
    if(!groups[key])groups[key]={date:d.completed,items:[]};groups[key].items.push(d)});
  var gKeys=Object.keys(groups).sort().reverse();

  h+='<div class="done-list">';
  gKeys.forEach(function(key){
    var g=groups[key];
    var label=key==='unknown'?'No date':fmtDFull(g.date);
    var diff=g.date?dayDiff(td,g.date):null;
    if(diff===0)label='Today';
    else if(diff===-1)label='Yesterday';
    var groupMins=0;g.items.forEach(function(d){groupMins+=d.duration});
    h+='<div class="done-date-group">'+label+'<span class="done-group-count">'+g.items.length+' tasks, '+fmtM(groupMins)+'</span></div>';
    g.items.forEach(function(d){
      var eid=escAttr(d.id);
      h+='<div class="done-card" onclick="TF.openDoneDetail(\''+eid+'\')">';
      h+='<div class="done-left">';
      h+='<span class="bg '+impCls(d.importance||'Important')+'">'+esc(d.importance||'')+'</span>';
      h+='<span class="done-name">'+esc(d.item)+'</span>';
      h+='</div>';
      h+='<div class="done-right">';
      if(d.client&&d.client!=='Internal / N/A')h+='<span class="bg bg-cl">'+esc(d.client)+'</span>';
      if(d.endClient)h+='<span class="bg bg-ec">'+esc(d.endClient)+'</span>';
      if(d.campaign){var _cpd=S.campaigns.find(function(c){return c.id===d.campaign});if(_cpd)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber)">🎯 '+esc(_cpd.name)+'</span>'}
      if(d.opportunity){var _opd2=S.opportunities.find(function(o){return o.id===d.opportunity});if(_opd2)h+='<span class="bg bg-opp">💎 '+esc(_opd2.name)+'</span>'}
      if(d.category)h+='<span class="bg bg-ca">'+esc(d.category)+'</span>';
      h+='<span class="done-dur">'+fmtM(d.duration)+'</span>';
      h+='</div></div>'})});
  h+='</div>';
  return h}

/* ═══════════ CALENDAR: VIEW FUNCTIONS ═══════════ */
function fmtTime(d){return(d.getHours()<10?'0':'')+d.getHours()+':'+(d.getMinutes()<10?'0':'')+d.getMinutes()}

/* Determine which two work days to show schedule panels for */
function getScheduleDays(td){
  var schedDays=CONFIG.schedDays||[1,2,3,4];
  var wE=CONFIG.workEnd||20;
  var now=new Date();
  var first=null,second=null;
  for(var i=0;i<8;i++){
    var d=new Date(td.getTime()+i*864e5);
    if(schedDays.indexOf(d.getDay())===-1)continue;
    /* Skip today if we're past work end time */
    if(i===0&&now.getHours()>=wE)continue;
    if(!first){first=d}
    else if(!second){second=d;break}}
  return{first:first,second:second}}

function renderCalSection(){
  if(!CONFIG.calendarURL){
    return'<div class="cal-connect" onclick="TF.showCalSetup()" style="margin-bottom:18px;padding:10px 16px;background:var(--bg1);border:1px solid var(--gborder);border-radius:var(--r);cursor:pointer;display:flex;align-items:center;gap:10px;transition:border-color .15s"><span style="font-size:16px">📅</span><span style="font-size:12px;color:var(--t3)">Connect Google Calendar to see your free time</span><span style="margin-left:auto;font-size:10px;color:var(--t4);font-weight:600">SETUP ›</span></div>'}
  var td=today(),now=new Date();
  var wS=CONFIG.workStart||9,wE=CONFIG.workEnd||20;
  var schedDays=CONFIG.schedDays||[1,2,3,4];

  var h='<div class="cal-timeline-wrap">';
  h+='<div class="cal-timeline-head">';
  h+='<span class="cal-timeline-title">📅 Calendar + Planner</span>';

  if(!S.calEvents.length&&calLoading){
    h+='<span style="font-size:11px;color:var(--t4)">Loading...</span></div>';
    h+='<div class="cal-skeleton">';
    for(var sk=0;sk<5;sk++)h+='<div class="cal-skel-row"><div class="cal-skel-label"></div><div class="cal-skel-track"></div></div>';
    h+='</div></div>';
    return h}

  if(!S.calEvents.length){
    h+='<button class="cal-sync-btn" onclick="TF.syncCal()">↻ Sync Calendar</button>';
    h+='</div></div>';
    return h}

  var hasAnyManualOrder=Object.keys(S.schedOrder).some(function(k){return S.schedOrder[k]&&S.schedOrder[k].length>0});
  if(hasAnyManualOrder)h+='<button class="cal-reset-all-btn" onclick="TF.resetAllSchedules()">↺ Reset Schedule</button>';
  h+='<button class="cal-sync-btn" onclick="TF.syncCal()">↻ Sync</button>';
  h+='</div>';

  /* ── WEEK TIMELINE (24h) ── */
  h+=renderCalWeek24(td,now,wS,wE,schedDays);

  /* ── SCHEDULE PANELS (side by side) ── */
  var days=getScheduleDays(td);
  if(days.first||days.second){
    h+='<div class="cal-panels">';
    var firstUsed={};
    if(days.first){var r=renderSchedulePanel(days.first,td,wS,wE,{});h+=r.html;firstUsed=r.usedIds}
    if(days.second){var r2=renderSchedulePanel(days.second,td,wS,wE,firstUsed);h+=r2.html}
    h+='</div>'}

  h+='</div>';
  return h}

function renderCalWeek24(td,now,wS,wE,schedDays){
  var h='',totalBusy=0,totalFree=0;
  var tlS=8,tlE=21;/* Timeline: 8am to 9pm */
  var tlSpan=tlE-tlS;
  h+='<div class="cal-7d">';
  h+='<div class="cal-7d-header"><div class="cal-7d-label"></div><div class="cal-7d-track-wrap">';
  h+='<div class="cal-tl-hours" style="position:relative;height:14px">';
  for(var hr=tlS;hr<=tlE;hr+=2){
    h+='<span class="cal-tl-hour" style="left:'+((hr-tlS)/tlSpan*100)+'%">'+(hr<10?'0':'')+hr+'</span>'};
  h+='</div></div></div>';

  var weekUsed={};
  for(var dayOff=0;dayOff<7;dayOff++){
    var dayDate=new Date(td.getTime()+dayOff*864e5);
    var dayEnd=new Date(dayDate.getTime()+864e5);
    var isToday=dayOff===0;
    var isWorkDay=schedDays.indexOf(dayDate.getDay())!==-1;
    var dayEventsAll=S.calEvents.filter(function(e){return e.start>=dayDate&&e.start<dayEnd});
    dayEventsAll.sort(function(a,b){return a.start.getTime()-b.start.getTime()});
    /* Tracked-only events for display */
    var dayEvents=dayEventsAll.filter(function(e){return!!findMtgDone(e.title,e.start)});

    var dayBusy=0;dayEventsAll.forEach(function(e){
      var es=Math.max(e.start.getTime(),new Date(dayDate).setHours(wS,0,0,0));
      var ee=Math.min(e.end.getTime(),new Date(dayDate).setHours(wE,0,0,0));
      if(ee>es)dayBusy+=Math.round((ee-es)/60000)});
    var workMins=(wE-wS)*60;
    var dayFree=isWorkDay?Math.max(0,workMins-dayBusy):0;
    if(isWorkDay){totalBusy+=dayBusy;totalFree+=dayFree}

    /* Get scheduled tasks for this day (exclude already-scheduled from earlier days) */
    var sched=isWorkDay?scheduleTasks(dayDate,weekUsed):[];
    sched.forEach(function(s){weekUsed[s.task.id]=true});

    h+='<div class="cal-7d-row'+(isToday?' cal-7d-today':'')+(!isWorkDay?' cal-7d-off':'')+'">';
    h+='<div class="cal-7d-label"><span class="cal-7d-day">'+DAYSHORT[dayDate.getDay()]+' '+dayDate.getDate()+'</span>';
    if(isWorkDay)h+='<span class="cal-7d-free" style="color:'+(dayFree>120?'var(--green)':dayFree>30?'var(--amber)':'var(--red)')+'">'+fmtM(dayFree)+'</span>';
    else h+='<span class="cal-7d-free" style="color:var(--t4);font-size:9px">off</span>';
    h+='</div>';
    h+='<div class="cal-7d-track-wrap"><div class="cal-7d-track">';

    /* Dark zones outside work hours (clipped inside track) */
    h+='<div class="cal-7d-dark" style="left:0;width:'+((wS-tlS)/tlSpan*100)+'%"></div>';
    h+='<div class="cal-7d-dark" style="right:0;width:'+((tlE-wE)/tlSpan*100)+'%"></div>';

    /* Work zone green tint */
    if(isWorkDay){
      h+='<div class="cal-7d-workzone" style="left:'+((wS-tlS)/tlSpan*100)+'%;width:'+((wE-wS)/tlSpan*100)+'%"></div>'}

    h+='</div>';/* end .cal-7d-track */
    /* Overlay for blocks + tooltips (overflow visible) */
    h+='<div class="cal-7d-overlay">';

    /* Now marker */
    if(isToday){var nowHr=now.getHours()+now.getMinutes()/60;
      if(nowHr>=tlS&&nowHr<=tlE){
        h+='<div class="cal-tl-now" style="left:'+((nowHr-tlS)/tlSpan*100)+'%"><div class="cal-tl-now-dot"></div></div>'}}

    /* Event blocks (pink) - tracked only */
    dayEvents.forEach(function(e){
      var sH=e.start.getHours()+e.start.getMinutes()/60;
      var eH=e.end.getHours()+e.end.getMinutes()/60;
      if(eH<=sH)eH=sH+0.25;
      sH=Math.max(tlS,sH);eH=Math.min(tlE,eH);
      if(eH<=sH)return;
      var l=((sH-tlS)/tlSpan)*100,w=Math.max(0.3,((eH-sH)/tlSpan)*100);
      var dur=Math.round((e.end-e.start)/60000);
      h+='<div class="cal-tl-event" style="left:'+l+'%;width:'+w+'%">';
      h+='<div class="cal-tl-tip"><div class="cal-tl-tip-title">'+esc(e.title)+'</div>';
      h+='<div class="cal-tl-tip-meta">'+fmtTime(e.start)+' - '+fmtTime(e.end)+' · '+fmtM(dur)+'</div></div>';
      h+='</div>'});

    /* Scheduled task blocks (colour-coded by importance) */
    sched.forEach(function(s){
      var sH=s.start.getHours()+s.start.getMinutes()/60;
      var eH=s.end.getHours()+s.end.getMinutes()/60;
      sH=Math.max(tlS,sH);eH=Math.min(tlE,eH);
      if(eH<=sH)return;
      var l=((sH-tlS)/tlSpan)*100,w=Math.max(0.3,((eH-sH)/tlSpan)*100);
      var imp=s.task.importance;
      var clr=imp==='Critical'?'crit':imp==='Important'?'imp':'wta';
      h+='<div class="cal-tl-task '+clr+'" style="left:'+l+'%;width:'+w+'%" onclick="event.stopPropagation();TF.openDetail(\''+escAttr(s.task.id)+'\')">';
      h+='<div class="cal-tl-tip"><div class="cal-tl-tip-title">'+esc(s.task.item)+'</div>';
      h+='<div class="cal-tl-tip-meta">'+fmtTime(s.start)+' - '+fmtTime(s.end)+' · '+fmtM(s.mins)+'</div>';
      h+='<div class="cal-tl-tip-meta">'+esc(imp);
      if(s.task.client&&s.task.client!=='Internal / N/A')h+=' · '+esc(s.task.client);
      if(s.task.endClient)h+=' · EC: '+esc(s.task.endClient);
      if(s.task.campaign){var _cptt=S.campaigns.find(function(c){return c.id===s.task.campaign});if(_cptt)h+=' · 🎯 '+esc(_cptt.name)}
      h+='</div></div></div>'});

    h+='</div></div></div>';}
  h+='</div>';

  h+='<div class="cal-7d-summary">';
  h+='<span style="color:var(--red)">'+fmtM(totalBusy)+' booked</span>';
  h+='<span style="color:var(--green)">'+fmtM(totalFree)+' free (Mon-Thu)</span>';
  h+='</div>';
  return h}

function renderSchedulePanel(dayDate,td,wS,wE,excludeIds){
  var isToday=dayDate.getTime()===td.getTime();
  var dayEnd=new Date(dayDate.getTime()+864e5);
  var dayEventsAll=S.calEvents.filter(function(e){return e.start>=dayDate&&e.start<dayEnd});
  dayEventsAll.sort(function(a,b){return a.start.getTime()-b.start.getTime()});
  /* Tracked-only events for display */
  var dayEvents=dayEventsAll.filter(function(e){return!!findMtgDone(e.title,e.start)});
  var sched=scheduleTasks(dayDate,excludeIds||{});
  var usedIds={};sched.forEach(function(s){usedIds[s.task.id]=true});

  /* Merge events (within work hours) + tasks */
  var items=[];
  dayEvents.forEach(function(e){
    var sH=e.start.getHours()+e.start.getMinutes()/60;
    if(sH>=wS-1&&sH<wE+1)items.push({type:'event',title:e.title,start:e.start,end:e.end,mins:Math.round((e.end-e.start)/60000)})});
  sched.forEach(function(s){
    items.push({type:'task',title:s.task.item,start:s.start,end:s.end,mins:s.mins,task:s.task})});
  items.sort(function(a,b){return a.start.getTime()-b.start.getTime()});

  var dayLabel=DAYSHORT[dayDate.getDay()]+' '+dayDate.getDate()+' '+MO[dayDate.getMonth()];
  var dk=schedDayKey(dayDate);
  var hasManualOrder=S.schedOrder[dk]&&S.schedOrder[dk].length>0;
  var schedMins=0;sched.forEach(function(s){schedMins+=s.mins});
  var busyMins=0;dayEventsAll.forEach(function(e){
    var es=Math.max(e.start.getTime(),new Date(dayDate).setHours(wS,0,0,0));
    var ee=Math.min(e.end.getTime(),new Date(dayDate).setHours(wE,0,0,0));
    if(ee>es)busyMins+=Math.round((ee-es)/60000)});
  var freeMins=Math.max(0,(wE-wS)*60-busyMins);

  var h='<div class="cal-panel'+(isToday?' cal-panel-today':'')+'" ondragover="TF.schedDragOver(event)" ondrop="TF.schedPanelDrop(event,\''+dk+'\')">';
  h+='<div class="cal-panel-head">';
  h+='<div class="cal-panel-day">'+(isToday?'Today':'Next')+' · <b>'+dayLabel+'</b></div>';
  h+='<div class="cal-panel-stats">';
  h+='<span class="cal-ps" style="color:var(--green)">'+fmtM(freeMins)+' free</span>';
  h+='<span class="cal-ps" style="color:var(--red)">'+fmtM(busyMins)+' booked</span>';
  if(sched.length)h+='<span class="cal-ps" style="color:var(--blue)">'+sched.length+' tasks · '+fmtM(schedMins)+'</span>';
  h+='</div></div>';

  if(!items.length){
    h+='<div class="cal-panel-empty">No meetings or tasks</div></div>';
    return{html:h,usedIds:usedIds}}

  h+='<div class="cal-panel-list">';
  items.forEach(function(item){
    if(item.type==='event'){
      h+='<div class="cal-panel-row cal-pr-ev">';
      h+='<span class="cal-pr-time">'+fmtTime(item.start)+'</span>';
      h+='<span class="cal-pr-dot ev"></span>';
      h+='<span class="cal-pr-name">'+esc(item.title)+'</span>';
      h+='<span class="cal-pr-dur">'+fmtM(item.mins)+'</span>';
      h+='</div>'}
    else{
      var imp=item.task.importance;
      h+='<div class="cal-panel-row cal-pr-tk" draggable="true" data-sched-id="'+escAttr(item.task.id)+'" data-sched-day="'+dk+'" ondragstart="TF.schedDragStart(event,\''+escAttr(item.task.id)+'\')" ondragend="TF.schedDragEnd()" ondragover="TF.schedDragOver(event)" ondragenter="TF.schedRowDragEnter(event,this)" ondragleave="TF.schedRowDragLeave(event,this)" ondrop="TF.schedDragDrop(event,\''+escAttr(item.task.id)+'\',\''+dk+'\')" onclick="TF.openDetail(\''+escAttr(item.task.id)+'\')">';
      h+='<span class="cal-pr-grip" title="Drag to reorder">⠿</span>';
      h+='<span class="cal-pr-time">'+fmtTime(item.start)+'</span>';
      h+='<span class="cal-pr-dot tk"></span>';
      h+='<span class="cal-pr-name">'+esc(item.title)+'</span>';
      h+='<span class="bg '+impCls(imp)+'" style="font-size:8px;padding:1px 5px">'+imp.charAt(0)+'</span>';
      if(item.task.client&&item.task.client!=='Internal / N/A')h+='<span class="cal-pr-client">'+esc(item.task.client)+'</span>';
      if(item.task.endClient)h+='<span class="cal-pr-client" style="color:var(--teal)">'+esc(item.task.endClient)+'</span>';
      h+='<span class="cal-pr-dur">'+fmtM(item.mins)+'</span>';
      h+='</div>'}});
  h+='<div class="cal-panel-drop-zone" ondragover="TF.schedDragOver(event)" ondragenter="TF.schedZoneDragEnter(event)" ondragleave="TF.schedZoneDragLeave(event)" ondrop="TF.schedPanelDrop(event,\''+dk+'\')">Drop task here</div>';
  h+='</div></div>';
  return{html:h,usedIds:usedIds}}
/* ═══════════ FEATURE: HEATMAP CALENDAR ═══════════ */
function renderHeatmap(){
  var el=gel('heatmap-cal');if(!el)return;
  var td=today(),doneByDay={};
  S.done.forEach(function(d){if(!d.completed)return;var k=d.completed.toISOString().slice(0,10);doneByDay[k]=(doneByDay[k]||0)+1});
  var maxD=0;Object.values(doneByDay).forEach(function(v){if(v>maxD)maxD=v});
  var weeks=12,days=weeks*7;
  var startDate=new Date(td);startDate.setDate(startDate.getDate()-days+1);
  /* Align to Monday */
  var startDow=startDate.getDay();startDate.setDate(startDate.getDate()-(startDow===0?6:startDow-1));
  var h='<div class="hm-row"><div class="hm-labels">';
  ['Mon','','Wed','','Fri','',''].forEach(function(d){h+='<div class="hm-label">'+d+'</div>'});
  h+='</div><div class="hm-grid">';
  var cursor=new Date(startDate);
  for(var w=0;w<weeks+1;w++){h+='<div class="hm-week">';
    for(var d=0;d<7;d++){var k=cursor.toISOString().slice(0,10);var count=doneByDay[k]||0;
      var intensity=maxD>0?count/maxD:0;
      var bg=count===0?'rgba(130,55,245,0.04)':intensity>.6?'rgba(255,0,153,0.45)':intensity>.3?'rgba(255,0,153,0.25)':'rgba(255,0,153,0.1)';
      var title=cursor.getDate()+' '+MO[cursor.getMonth()]+': '+count+' task'+(count!==1?'s':'');
      h+='<div class="hm-cell" style="background:'+bg+'" title="'+title+'"></div>';
      cursor.setDate(cursor.getDate()+1)}
    h+='</div>'}
  h+='</div></div>';
  h+='<div class="hm-legend"><span style="color:var(--t4);font-size:10px">Less</span>';
  ['rgba(130,55,245,0.04)','rgba(255,0,153,0.1)','rgba(255,0,153,0.25)','rgba(255,0,153,0.45)'].forEach(function(c){h+='<div class="hm-cell" style="background:'+c+';width:12px;height:12px"></div>'});
  h+='<span style="color:var(--t4);font-size:10px">More</span></div>';
  el.innerHTML=h}

/* ═══════════ OPPORTUNITIES ═══════════ */
function getOpportunityStats(op){
  var openTasks=S.tasks.filter(function(t){return t.opportunity===op.id});
  var doneTasks=S.done.filter(function(d){return d.opportunity===op.id});
  var totalTime=doneTasks.reduce(function(s,d){return s+(d.duration||0)},0);
  var totalValue=(op.strategyFee||0)+(op.setupFee||0)+((op.monthlyFee||0)*12);
  var weightedValue=totalValue*((op.probability||0)/100);
  var nextDue=openTasks.filter(function(t){return t.due}).sort(function(a,b){return a.due-b.due})[0];
  return{openTasks:openTasks,doneTasks:doneTasks,totalTime:totalTime,
    totalValue:totalValue,weightedValue:weightedValue,
    openCount:openTasks.length,doneCount:doneTasks.length,
    nextDue:nextDue?nextDue.due:null}}

function opStageClass(s){
  if(s==='Lead')return'op-st-lead';if(s==='Discovery')return'op-st-discovery';
  if(s==='Video Tracking')return'op-st-video';if(s==='Proposal')return'op-st-proposal';
  if(s==='Negotiation')return'op-st-negotiation';if(s==='Closed Won')return'op-st-won';
  if(s==='Closed Lost')return'op-st-lost';return'op-st-lead'}

function opCardClass(s){
  if(s==='Lead')return'op-lead';if(s==='Discovery')return'op-discovery';
  if(s==='Video Tracking')return'op-video-tracking';if(s==='Proposal')return'op-proposal';
  if(s==='Negotiation')return'op-negotiation';if(s==='Closed Won')return'op-won';
  if(s==='Closed Lost')return'op-lost';return'op-lead'}

function probClass(p){return p>=70?'op-prob-high':p>=40?'op-prob-mid':'op-prob-low'}

function rOpportunities(){
  var td_=today();
  var opps=S.opportunities.slice();

  /* Counts & metrics */
  var activeOpps=opps.filter(function(o){return o.stage!=='Closed Won'&&o.stage!=='Closed Lost'});
  var wonOpps=opps.filter(function(o){return o.stage==='Closed Won'});
  var lostOpps=opps.filter(function(o){return o.stage==='Closed Lost'});
  var totalPipeline=0,weightedPipeline=0,openTaskCount=0;
  activeOpps.forEach(function(op){
    var st=getOpportunityStats(op);
    totalPipeline+=st.totalValue;weightedPipeline+=st.weightedValue;openTaskCount+=st.openCount});
  var winRate=wonOpps.length+lostOpps.length>0?Math.round(wonOpps.length/(wonOpps.length+lostOpps.length)*100):0;
  var avgDeal=activeOpps.length>0?Math.round(totalPipeline/activeOpps.length):0;

  /* HEADER */
  var h='<div class="pg-head"><h1>💎 Opportunities</h1>';
  h+='<button class="btn btn-p" onclick="TF.openAddOpportunity()" style="font-size:12px;padding:8px 18px">+ Add Opportunity</button>';
  h+='</div>';

  /* DASHBOARD METRICS */
  h+='<div class="op-dash">';
  h+='<div class="op-dash-met" style="animation-delay:0s"><div class="op-dash-met-v" style="color:var(--green)">'+fmtUSD(totalPipeline)+'</div><div class="op-dash-met-l">Pipeline Value</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.05s"><div class="op-dash-met-v" style="color:var(--amber)">'+fmtUSD(weightedPipeline)+'</div><div class="op-dash-met-l">Weighted Pipeline</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.1s"><div class="op-dash-met-v" style="color:var(--t1)">'+activeOpps.length+'</div><div class="op-dash-met-l">Active Opps</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.15s"><div class="op-dash-met-v" style="color:'+(winRate>=50?'var(--green)':'var(--amber)')+'">'+winRate+'%</div><div class="op-dash-met-l">Win Rate</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.2s"><div class="op-dash-met-v" style="color:var(--blue)">'+openTaskCount+'</div><div class="op-dash-met-l">Open Tasks</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.25s"><div class="op-dash-met-v" style="color:var(--purple50)">'+fmtUSD(avgDeal)+'</div><div class="op-dash-met-l">Avg Deal Size</div></div>';
  h+='</div>';

  /* STAGE TOGGLE + VIEW TOGGLE */
  h+='<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap;justify-content:space-between">';
  h+='<div class="cp-status-filters">';
  h+='<span class="cp-status-toggle always">Active <span style="opacity:.6;margin-left:2px">'+activeOpps.length+'</span></span>';
  h+='<span class="cp-status-toggle'+(S.opShowClosed?' active':'')+'" onclick="TF.toggleOpShowClosed()" style="cursor:pointer">Closed <span style="opacity:.6;margin-left:2px">'+(wonOpps.length+lostOpps.length)+'</span></span>';
  h+='</div>';
  h+='<div style="display:flex;gap:6px;align-items:center">';
  h+='<button class="btn'+(S.opView==='pipeline'?' btn-p':'')+'" onclick="TF.setOpView(\'pipeline\')" style="font-size:11px;padding:5px 12px">Pipeline</button>';
  h+='<button class="btn'+(S.opView==='list'?' btn-p':'')+'" onclick="TF.setOpView(\'list\')" style="font-size:11px;padding:5px 12px">List</button>';
  h+='</div></div>';

  if(S.opView==='list')return h+rOpportunityList(opps,td_);
  return h+rOpportunityPipeline(opps,td_)+rOpportunityChartsHTML()}

function opCardCompact(op,td_,idx){
  var st=getOpportunityStats(op);
  var stageCls=opCardClass(op.stage);
  var delay=typeof idx==='number'?Math.min(idx*0.03,0.45):0;
  var h='<div class="op-card '+stageCls+'" onclick="TF.openOpportunityDetail(\''+escAttr(op.id)+'\')"'+(delay?' style="animation-delay:'+delay+'s"':'')+'>';
  h+='<span class="op-card-name">'+esc(op.name)+'</span>';
  h+='<span class="op-card-meta">';
  if(op.client)h+='<span class="bg bg-cl" style="font-size:9px;padding:2px 8px">'+esc(op.client)+'</span>';
  if(op.endClient)h+='<span class="bg bg-ec" style="font-size:9px;padding:2px 8px">'+esc(op.endClient)+'</span>';
  h+='</span>';
  h+='<span class="op-card-meta">';
  if(st.totalValue)h+='<span class="op-card-val">'+fmtUSD(st.totalValue)+'</span>';
  h+='<span class="op-prob '+probClass(op.probability)+'">'+op.probability+'%</span>';
  if(st.openCount)h+='<span class="op-card-stat" style="color:var(--blue)">📋 '+st.openCount+'</span>';
  if(op.expectedClose)h+='<span class="op-card-stat">📅 '+fmtDShort(op.expectedClose)+'</span>';
  h+='</span></div>';
  return h}

function rOpportunityPipeline(opps,td_){
  var OPP_STAGES=['Lead','Discovery','Video Tracking','Proposal','Negotiation'];
  var grouped={};OPP_STAGES.forEach(function(s){grouped[s]=[]});
  var closedWon=[],closedLost=[];
  opps.forEach(function(op){
    if(op.stage==='Closed Won'){closedWon.push(op);return}
    if(op.stage==='Closed Lost'){closedLost.push(op);return}
    if(grouped[op.stage])grouped[op.stage].push(op);
    else grouped['Lead'].push(op)});

  /* Sort within columns: probability DESC → expected close ASC → created DESC */
  OPP_STAGES.forEach(function(s){
    if(!grouped[s])return;
    grouped[s].sort(function(a,b){
      if(b.probability!==a.probability)return b.probability-a.probability;
      var aClose=a.expectedClose?a.expectedClose.getTime():Infinity;
      var bClose=b.expectedClose?b.expectedClose.getTime():Infinity;
      if(aClose!==bClose)return aClose-bClose;
      return(b.created?b.created.getTime():0)-(a.created?a.created.getTime():0)})});

  var h='<div class="op-pipeline">';
  OPP_STAGES.forEach(function(s){
    var items=grouped[s]||[];
    h+='<div class="op-column">';
    h+='<div class="op-column-head">'+esc(s)+' <span class="op-column-count">'+items.length+'</span></div>';
    if(!items.length){h+='<div style="text-align:center;padding:30px 10px;color:var(--t4);font-size:12px">No opportunities</div>'}
    items.forEach(function(op,idx){h+=opCardCompact(op,td_,idx)});
    h+='</div>'});
  h+='</div>';

  /* Closed Won / Closed Lost */
  if(S.opShowClosed&&(closedWon.length||closedLost.length)){
    h+='<div class="op-closed-section">';
    if(closedWon.length){
      h+='<details style="margin-top:16px"><summary style="cursor:pointer;color:var(--green);font-size:12px;font-weight:600">🏆 Closed Won ('+closedWon.length+')</summary>';
      h+='<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:10px">';
      closedWon.forEach(function(op,idx){h+='<div style="flex:1;min-width:260px;max-width:340px">'+opCardCompact(op,td_,idx)+'</div>'});
      h+='</div></details>'}
    if(closedLost.length){
      h+='<details style="margin-top:12px"><summary style="cursor:pointer;color:var(--red);font-size:12px;font-weight:600">✕ Closed Lost ('+closedLost.length+')</summary>';
      h+='<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:10px">';
      closedLost.forEach(function(op,idx){h+='<div style="flex:1;min-width:260px;max-width:340px">'+opCardCompact(op,td_,idx)+'</div>'});
      h+='</div></details>'}
    h+='</div>'}
  return h}

function rOpportunityList(opps,td_){
  var sorted=opps.slice();
  var stageOrder={'Lead':0,'Discovery':1,'Video Tracking':2,'Proposal':3,'Negotiation':4,'Closed Won':5,'Closed Lost':6};
  sorted.sort(function(a,b){
    var oa=stageOrder[a.stage]!==undefined?stageOrder[a.stage]:9;
    var ob=stageOrder[b.stage]!==undefined?stageOrder[b.stage]:9;
    if(oa!==ob)return oa-ob;return b.probability-a.probability});
  if(!S.opShowClosed)sorted=sorted.filter(function(o){return o.stage!=='Closed Won'&&o.stage!=='Closed Lost'});

  var h='<div class="tb-wrap"><table class="tb"><thead><tr>';
  h+='<th style="width:18%">Name</th><th style="width:12%">Client</th><th style="width:12%">End Client</th>';
  h+='<th style="width:10%">Stage</th><th class="r" style="width:10%">Value</th>';
  h+='<th class="c" style="width:6%">Prob</th><th class="r" style="width:10%">Weighted</th>';
  h+='<th style="width:10%">Expected Close</th><th class="c" style="width:6%">Tasks</th>';
  h+='</tr></thead><tbody>';

  sorted.forEach(function(op){
    var st=getOpportunityStats(op);
    h+='<tr class="op-list-row" onclick="TF.openOpportunityDetail(\''+escAttr(op.id)+'\')">';
    h+='<td><strong>'+esc(op.name)+'</strong></td>';
    h+='<td>'+esc(op.client)+'</td>';
    h+='<td>'+esc(op.endClient)+'</td>';
    h+='<td><span class="bg '+opStageClass(op.stage)+'">'+esc(op.stage)+'</span></td>';
    h+='<td class="nm" style="color:var(--green)">'+fmtUSD(st.totalValue)+'</td>';
    h+='<td class="tc"><span class="op-prob '+probClass(op.probability)+'">'+op.probability+'%</span></td>';
    h+='<td class="nm" style="color:var(--amber)">'+fmtUSD(st.weightedValue)+'</td>';
    h+='<td>'+(op.expectedClose?fmtDShort(op.expectedClose):'—')+'</td>';
    h+='<td class="tc">'+st.openCount+'</td>';
    h+='</tr>'});
  h+='</tbody></table></div>';
  return h+rOpportunityChartsHTML()}

function rOpportunityChartsHTML(){
  return'<div class="op-chart-grid">'+
    '<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:18px"><div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:12px">Pipeline Value by Stage</div><div style="height:200px"><canvas id="opp-stage-chart"></canvas></div></div>'+
    '<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:18px"><div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:12px">Weighted Pipeline</div><div style="height:200px"><canvas id="opp-weighted-chart"></canvas></div></div>'+
    '</div>'}

function initOpportunityCharts(){setTimeout(function(){
  /* Pipeline value by stage */
  var stageVals={};
  var OPP_STAGES=['Lead','Discovery','Video Tracking','Proposal','Negotiation'];
  OPP_STAGES.forEach(function(s){stageVals[s]=0});
  S.opportunities.forEach(function(op){
    if(op.stage!=='Closed Won'&&op.stage!=='Closed Lost'){
      var v=(op.strategyFee||0)+(op.setupFee||0)+((op.monthlyFee||0)*12);
      if(stageVals[op.stage]!==undefined)stageVals[op.stage]+=v}});
  /* Filter out zero stages */
  var filteredStage={};Object.keys(stageVals).forEach(function(k){if(stageVals[k]>0)filteredStage[k]=stageVals[k]});
  if(Object.keys(filteredStage).length){
    var el=gel('opp-stage-chart');if(el){killChart('opp-stage-chart');
      var labels=Object.keys(filteredStage),vals=labels.map(function(k){return filteredStage[k]});
      var cols=labels.map(function(_,i){return P[i%P.length]});
      charts['opp-stage-chart']=new Chart(el,{type:'bar',data:{labels:labels,datasets:[{data:vals,backgroundColor:cols,borderRadius:6,barThickness:24}]},
        options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},
          tooltip:{callbacks:{label:function(c){return fmtUSD(c.parsed.x)}}}},
          scales:{x:{grid:{color:'rgba(130,55,245,0.06)'},ticks:{color:'#8a7ca8',font:{size:10},callback:function(v){return fmtUSD(v)}}},
            y:{grid:{display:false},ticks:{color:'#c4b8dc',font:{size:10}}}}}})}}

  /* Weighted pipeline donut */
  var weightedByStage={};
  S.opportunities.forEach(function(op){
    if(op.stage!=='Closed Won'&&op.stage!=='Closed Lost'){
      var v=((op.strategyFee||0)+(op.setupFee||0)+((op.monthlyFee||0)*12))*((op.probability||0)/100);
      if(!weightedByStage[op.stage])weightedByStage[op.stage]=0;
      weightedByStage[op.stage]+=v}});
  var filteredWeighted={};Object.keys(weightedByStage).forEach(function(k){if(weightedByStage[k]>0)filteredWeighted[k]=weightedByStage[k]});
  if(Object.keys(filteredWeighted).length){
    var el2=gel('opp-weighted-chart');if(el2){killChart('opp-weighted-chart');
      var labels2=Object.keys(filteredWeighted),vals2=labels2.map(function(k){return filteredWeighted[k]});
      var cols2=labels2.map(function(_,i){return P[i%P.length]});
      charts['opp-weighted-chart']=new Chart(el2,{type:'doughnut',data:{labels:labels2,datasets:[{data:vals2,backgroundColor:cols2,borderWidth:0,hoverOffset:8}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:'#c4b8dc',font:{family:'DM Sans',size:11},padding:10,boxWidth:11}},
          tooltip:{callbacks:{label:function(c){return c.label+': '+fmtUSD(c.parsed)}}}}}})}}
},200)}

/* ═══════════ CAMPAIGNS ═══════════ */
function getCampaignStats(cp){
  var openTasks=S.tasks.filter(function(t){return t.campaign===cp.id});
  var doneTasks=S.done.filter(function(d){return d.campaign===cp.id});
  var payments=S.payments.filter(function(p){return p.campaignId===cp.id});
  var meetings=S.campaignMeetings.filter(function(m){return m.campaignId===cp.id});
  var totalTime=doneTasks.reduce(function(sum,d){return sum+(d.duration||0)},0);
  var totalPaid=payments.reduce(function(sum,p){return sum+p.amount},0);
  var nextDue=openTasks.filter(function(t){return t.due}).sort(function(a,b){return a.due-b.due})[0];
  return{openTasks:openTasks,doneTasks:doneTasks,payments:payments,meetings:meetings,
    totalTime:totalTime,totalPaid:totalPaid,nextDue:nextDue?nextDue.due:null,
    openCount:openTasks.length,doneCount:doneTasks.length}}

function rCampaigns(){
  var td_=today();
  var campaigns=S.campaigns.slice();

  /* Counts & metrics */
  var activeCount=campaigns.filter(function(c){return c.status==='Active'}).length;
  var setupCount=campaigns.filter(function(c){return c.status==='Setup'}).length;
  var pausedCount=campaigns.filter(function(c){return c.status==='Paused'}).length;
  var completedCount=campaigns.filter(function(c){return c.status==='Completed'}).length;
  var totalPaid=S.payments.reduce(function(s,p){return s+p.amount},0);
  var monthlyRecurring=0;
  campaigns.forEach(function(c){if(c.status==='Active')monthlyRecurring+=c.monthlyFee+c.monthlyAdSpend});
  var openTaskCount=0,totalTimeSpent=0,upcoming7d=0,overdueCount=0;
  campaigns.forEach(function(cp){
    var st=getCampaignStats(cp);
    openTaskCount+=st.openCount;totalTimeSpent+=st.totalTime;
    st.openTasks.forEach(function(t){
      if(t.due){var diff=dayDiff(td_,t.due);if(diff<0)overdueCount++;else if(diff<=7)upcoming7d++}})});

  /* HEADER */
  var h='<div class="pg-head"><h1>🎯 Campaigns</h1>';
  h+='<button class="btn btn-p" onclick="TF.openAddCampaign()" style="font-size:12px;padding:8px 18px">+ Add Campaign</button>';
  h+='</div>';

  /* DASHBOARD METRICS */
  h+='<div class="cp-dash">';
  h+='<div class="cp-dash-met" style="animation-delay:0s"><div class="cp-dash-met-v" style="color:var(--green)">'+fmtUSD(totalPaid)+'</div><div class="cp-dash-met-l">Total Revenue</div></div>';
  h+='<div class="cp-dash-met" style="animation-delay:0.05s"><div class="cp-dash-met-v" style="color:var(--amber)">'+fmtUSD(monthlyRecurring)+'</div><div class="cp-dash-met-l">Monthly Recurring</div></div>';
  h+='<div class="cp-dash-met" style="animation-delay:0.1s"><div class="cp-dash-met-v" style="color:var(--t1)">'+openTaskCount+'</div><div class="cp-dash-met-l">Open Tasks</div></div>';
  h+='<div class="cp-dash-met" style="animation-delay:0.15s"><div class="cp-dash-met-v" style="color:var(--pink)">'+fmtM(totalTimeSpent)+'</div><div class="cp-dash-met-l">Time Spent</div></div>';
  h+='<div class="cp-dash-met" style="animation-delay:0.2s"><div class="cp-dash-met-v" style="color:'+(upcoming7d?'var(--blue)':'var(--green)')+'">'+upcoming7d+'</div><div class="cp-dash-met-l">Upcoming (7d)</div></div>';
  h+='<div class="cp-dash-met" style="animation-delay:0.25s"><div class="cp-dash-met-v" style="color:'+(overdueCount?'var(--red)':'var(--green)')+'">'+overdueCount+'</div><div class="cp-dash-met-l">Overdue</div></div>';
  h+='</div>';

  /* STATUS FILTERS + VIEW TOGGLE */
  h+='<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px;flex-wrap:wrap;justify-content:space-between">';
  h+='<div class="cp-status-filters">';
  h+='<span class="cp-status-toggle always">Setup <span style="opacity:.6;margin-left:2px">'+setupCount+'</span></span>';
  h+='<span class="cp-status-toggle always">Active <span style="opacity:.6;margin-left:2px">'+activeCount+'</span></span>';
  h+='<span class="cp-status-toggle'+(S.cpShowPaused?' active':'')+'" onclick="TF.toggleCpStatus(\'paused\')" style="cursor:pointer">Paused <span style="opacity:.6;margin-left:2px">'+pausedCount+'</span></span>';
  h+='<span class="cp-status-toggle'+(S.cpShowCompleted?' active':'')+'" onclick="TF.toggleCpStatus(\'completed\')" style="cursor:pointer">Completed <span style="opacity:.6;margin-left:2px">'+completedCount+'</span></span>';
  h+='</div>';
  h+='<div style="display:flex;gap:6px;align-items:center">';
  h+='<button class="btn'+(S.cpView==='pipeline'?' btn-p':'')+'" onclick="S.cpView=\'pipeline\';render()" style="font-size:11px;padding:5px 12px">Pipeline</button>';
  h+='<button class="btn'+(S.cpView==='list'?' btn-p':'')+'" onclick="S.cpView=\'list\';render()" style="font-size:11px;padding:5px 12px">List</button>';
  h+='</div></div>';

  /* Filter campaigns by toggled statuses */
  var filtered=campaigns;

  if(S.cpView==='list') return h+rCampaignList(filtered,td_);
  return h+rCampaignPipeline(filtered,td_)}

function cpCardCompact(cp,td_,idx){
  var st=getCampaignStats(cp);
  var statusCls=cp.status.toLowerCase().replace(/ /g,'-');
  var delay=typeof idx==='number'?Math.min(idx*0.03,0.45):0;
  var h='<div class="cp-card-compact cp-'+statusCls+'" onclick="TF.openCampaignDetail(\''+escAttr(cp.id)+'\')"'+(delay?' style="animation-delay:'+delay+'s"':'')+'>';
  h+='<span class="cp-card-compact-name">'+esc(cp.name)+'</span>';
  h+='<span class="cp-card-compact-meta">';
  if(cp.partner)h+='<span class="bg bg-cl" style="font-size:9px;padding:2px 8px">'+esc(cp.partner)+'</span>';
  if(cp.endClient)h+='<span class="bg bg-ec" style="font-size:9px;padding:2px 8px">'+esc(cp.endClient)+'</span>';
  if(st.openCount)h+='<span class="cp-card-compact-stat" style="color:var(--blue)">📋 '+st.openCount+'</span>';
  if(st.totalPaid)h+='<span class="cp-card-compact-stat" style="color:var(--green)">'+fmtUSD(st.totalPaid)+'</span>';
  h+='</span></div>';
  return h}

function rCampaignPipeline(campaigns,td_){
  /* Build visible statuses */
  var visibleStatuses=['Setup','Active'];
  if(S.cpShowPaused)visibleStatuses.push('Paused');
  if(S.cpShowCompleted)visibleStatuses.push('Completed');

  var grouped={};visibleStatuses.forEach(function(s){grouped[s]=[]});
  var archived=[];
  campaigns.forEach(function(cp){
    if(cp.status==='Archived'){archived.push(cp);return}
    if(grouped[cp.status])grouped[cp.status].push(cp)});

  /* Sort within columns */
  visibleStatuses.forEach(function(s){
    if(!grouped[s])return;
    grouped[s].sort(function(a,b){
      var sa=getCampaignStats(a),sb2=getCampaignStats(b);
      var aOd=sa.openTasks.filter(function(t){return t.due&&t.due<td_}).length;
      var bOd=sb2.openTasks.filter(function(t){return t.due&&t.due<td_}).length;
      if(aOd!==bOd)return bOd-aOd;
      var aNext=sa.nextDue?sa.nextDue.getTime():Infinity;
      var bNext=sb2.nextDue?sb2.nextDue.getTime():Infinity;
      if(aNext!==bNext)return aNext-bNext;
      return(b.created?b.created.getTime():0)-(a.created?a.created.getTime():0)})});

  var colCount=visibleStatuses.length;
  var h='<div class="cp-pipeline" style="grid-template-columns:repeat('+colCount+',1fr)">';
  visibleStatuses.forEach(function(s){
    var items=grouped[s]||[];
    h+='<div class="cp-column">';
    h+='<div class="cp-column-head">'+esc(s)+' <span class="cp-column-count">'+items.length+'</span></div>';
    if(!items.length){h+='<div style="text-align:center;padding:30px 10px;color:var(--t4);font-size:12px">No campaigns</div>'}
    items.forEach(function(cp,idx){h+=cpCardCompact(cp,td_,idx)});
    h+='</div>'});
  h+='</div>';

  if(archived.length){
    h+='<details style="margin-top:16px"><summary style="cursor:pointer;color:var(--t4);font-size:12px">Show archived ('+archived.length+')</summary>';
    h+='<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:10px">';
    archived.forEach(function(cp,idx){h+='<div style="flex:1;min-width:260px;max-width:340px">'+cpCardCompact(cp,td_,idx)+'</div>'});
    h+='</div></details>'}
  return h}

function rCampaignList(campaigns,td_){
  var sorted=campaigns.filter(function(c){return c.status!=='Archived'}).slice();
  sorted.sort(function(a,b){
    var order={Active:0,Setup:1,Paused:2,Completed:3};
    var oa=order[a.status]!==undefined?order[a.status]:4;
    var ob=order[b.status]!==undefined?order[b.status]:4;
    if(oa!==ob)return oa-ob;return(a.name||'').localeCompare(b.name||'')});

  var h='<div class="tb-wrap"><table class="tb cp-list-table"><thead><tr>';
  h+='<th style="width:20%">Name</th><th style="width:12%">Partner</th><th style="width:12%">End Client</th>';
  h+='<th style="width:8%">Status</th><th style="width:8%">Platform</th>';
  h+='<th class="c" style="width:8%">Open</th><th class="r" style="width:8%">Time</th>';
  h+='<th class="r" style="width:10%">Paid</th><th style="width:8%">Next Due</th><th style="width:8%">Renewal</th>';
  h+='</tr></thead><tbody>';

  sorted.forEach(function(cp){
    var st=getCampaignStats(cp);
    h+='<tr class="cp-list-row" onclick="TF.openCampaignDetail(\''+escAttr(cp.id)+'\')">';
    h+='<td><strong>'+esc(cp.name)+'</strong></td>';
    h+='<td>'+esc(cp.partner)+'</td>';
    h+='<td>'+esc(cp.endClient)+'</td>';
    h+='<td><span class="bg bg-'+(cp.status==='Active'?'im':cp.status==='Setup'?'mt':cp.status==='Paused'?'wt':'cr')+'">'+esc(cp.status)+'</span></td>';
    h+='<td>'+esc(cp.platform)+'</td>';
    h+='<td class="tc">'+st.openCount+'</td>';
    h+='<td class="nm" style="color:var(--pink)">'+fmtM(st.totalTime)+'</td>';
    h+='<td class="nm" style="color:var(--green)">'+fmtUSD(st.totalPaid)+'</td>';
    h+='<td>'+(st.nextDue?fmtDShort(st.nextDue):'—')+'</td>';
    h+='<td>'+(cp.renewalDate?fmtDShort(cp.renewalDate):'—')+'</td>';
    h+='</tr>'});
  h+='</tbody></table></div>';
  return h}

/* ═══════════ MOBILE VIEWS ═══════════ */
var mobAddImp='Important';

function mobDefaultDue(){var d=new Date();d.setHours(17,0,0,0);return d.toISOString().slice(0,16)}

/* ── Quick Add ── */
function rMobAdd(){
  var iso=mobDefaultDue();
  var cliOpts=S.clients.map(function(c){return'<option>'+esc(c)+'</option>'}).join('');
  var h='<div class="mob-add-view">';
  h+='<h1 style="margin-bottom:20px">Quick Add</h1>';
  /* Task name */
  h+='<input type="text" class="mob-add-input" id="f-item" placeholder="What needs doing?" autofocus>';
  /* Importance pills */
  h+='<div class="mob-add-pills" id="mob-add-pills">';
  IMPS.forEach(function(imp){var cls=imp===mobAddImp?' on':'';
    h+='<button class="mob-pill'+cls+'" onclick="TF.setMobAddImp(\''+escAttr(imp)+'\')">'+esc(imp)+'</button>'});
  h+='</div>';
  /* Hidden select synced by pills */
  h+='<select class="edf" id="f-imp" style="display:none">'+IMPS.map(function(i){return'<option'+(i===mobAddImp?' selected':'')+'>'+i+'</option>'}).join('')+'</select>';
  /* More options */
  h+='<details class="mob-add-detail"><summary class="mob-add-more">+ More options</summary>';
  h+='<div class="mob-add-fields">';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Due Date</span><input type="datetime-local" class="edf" id="f-due" value="'+iso+'"></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Category</span><select class="edf" id="f-cat"><option value="">Select...</option>'+CATS.map(function(c){return'<option>'+esc(c)+'</option>'}).join('')+'</select></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Type</span><select class="edf" id="f-type">'+TYPES.map(function(t){return'<option>'+t+'</option>'}).join('')+'</select></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Estimate (mins)</span><input type="number" class="edf" id="f-est" placeholder="30" min="0"></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Client</span><select class="edf" id="f-cli" onchange="TF.refreshAddEndClients()"><option value="">Select...</option>'+cliOpts+'</select></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">End Client</span><select class="edf" id="f-ec" onchange="TF.refreshAddCampaigns();TF.ecAddNew(\'f-ec\')">'+buildEndClientOptions('')+'</select></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Campaign</span><select class="edf" id="f-campaign" onchange="TF.fillFromCampaign();TF.onProjectChange(\'f\',\'campaign\')">'+buildCampaignOptions('','','')+'</select></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Project</span><select class="edf" id="f-project" onchange="TF.onProjectChange(\'f\',\'project\');TF.refreshAddPhases()">'+buildProjectOptions('')+'</select></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Phase</span><select class="edf" id="f-phase">'+buildPhaseOptions('','')+'</select></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Opportunity</span><select class="edf" id="f-opportunity" onchange="TF.onProjectChange(\'f\',\'opportunity\')">'+buildOpportunityOptions('')+'</select></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Meeting</span><select class="edf" id="f-mtg">'+buildMeetingOptions('')+'</select></div>';
  h+='<div class="mob-add-fld"><span class="mob-add-lbl">Notes</span><textarea class="edf mob-add-notes" id="f-notes" placeholder="Additional context..." rows="2"></textarea></div>';
  /* Flags */
  h+='<div class="mob-add-flags">';
  h+='<label class="flag-toggle"><input type="checkbox" id="f-flag"><span class="flag-box">🚩</span><span class="flag-text">Needs Client Input</span></label>';
  h+='<label class="flag-toggle"><input type="checkbox" id="f-done" onchange="var c=this.checked;document.getElementById(\'f-done-dur-wrap\').style.display=c?\'flex\':\'none\';document.getElementById(\'f-btn-add\').textContent=c?\'Add \\u0026 Complete\':\'Add Task\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
  h+='<div id="f-done-dur-wrap" style="display:none;align-items:center;gap:8px"><span class="mob-add-lbl" style="margin:0">Actual Mins</span><input type="number" id="f-done-dur" class="edf" style="width:80px;padding:8px 10px" placeholder="30" min="0"></div>';
  h+='</div>';
  h+='</div></details>';
  /* Action buttons */
  h+='<div class="mob-add-actions">';
  h+='<button class="mob-add-btn" id="f-btn-add" onclick="TF.mobAddTask()">Add Task</button>';
  h+='<button class="mob-add-btn-alt" onclick="TF.mobAddAndStart()">▶ Add &amp; Start</button>';
  h+='</div>';
  if(S.templates.length){h+='<select class="edf" id="f-tpl" onchange="TF.fillFromTemplate(this.value)" style="margin-top:12px"><option value="">📎 Use Template...</option>';
    S.templates.forEach(function(t,i){h+='<option value="'+i+'">'+esc(t.name)+'</option>'});h+='</select>'}
  h+='</div>';
  /* Recently added */
  var recent=S.tasks.slice(-5).reverse();
  if(recent.length){
    h+='<div class="mob-recent"><div class="mob-section-h">Recently Added</div>';
    recent.forEach(function(t){var eid=escAttr(t.id);
      h+='<div class="mob-recent-item" onclick="TF.openDetail(\''+eid+'\')">';
      h+='<span class="bg '+impCls(t.importance)+'">'+esc((t.importance||'I')[0])+'</span>';
      h+='<span class="mob-recent-name">'+esc(t.item)+'</span></div>'});
    h+='</div>'}
  return h}

/* ── Quick Add submit (reuses desktop addTask/addAndStart logic) ── */
async function mobAddTask(){
  /* Sync importance pill selection to hidden select */
  var impSel=gel('f-imp');if(impSel)impSel.value=mobAddImp;
  await addTask();
  /* addTask() calls render() which rebuilds the form — refocus for rapid adds */
  setTimeout(function(){var i=gel('f-item');if(i)i.focus()},100)}
async function mobAddAndStart(){
  var impSel=gel('f-imp');if(impSel)impSel.value=mobAddImp;
  await addAndStart()}

/* ═══════════ PROJECTS VIEW ═══════════ */

function getProjectStats(proj){
  var openTasks=S.tasks.filter(function(t){return t.project===proj.id});
  var doneTasks=S.done.filter(function(d){return d.project===proj.id});
  var phases=S.phases.filter(function(p){return p.projectId===proj.id}).sort(function(a,b){return a.sortOrder-b.sortOrder});
  var openCount=openTasks.length,doneCount=doneTasks.length,total=openCount+doneCount;
  var progress=total>0?Math.round(doneCount/total*100):0;
  var totalTime=doneTasks.reduce(function(s,d){return s+(d.duration||0)},0)+openTasks.reduce(function(s,t){return s+(t.duration||0)},0);
  var totalEst=openTasks.reduce(function(s,t){return s+(t.est||0)},0)+doneTasks.reduce(function(s,d){return s+(d.est||0)},0);
  var td_=today();
  var nextDue=null,overdue=0;
  openTasks.forEach(function(t){if(t.due){if(t.due<td_)overdue++;if(!nextDue||t.due<nextDue)nextDue=t.due}});
  return{openTasks:openTasks,doneTasks:doneTasks,phases:phases,totalTime:totalTime,totalEst:totalEst,
    openCount:openCount,doneCount:doneCount,progress:progress,nextDue:nextDue,overdue:overdue}}

function getPhaseStats(phase,projStats){
  var open=projStats.openTasks.filter(function(t){return t.phase===phase.id});
  var done=projStats.doneTasks.filter(function(d){return d.phase===phase.id});
  var oc=open.length,dc=done.length,total=oc+dc;
  return{openTasks:open,doneTasks:done,openCount:oc,doneCount:dc,progress:total>0?Math.round(dc/total*100):0}}

function projStatusClass(s){
  if(s==='Planning')return'proj-st-planning';if(s==='Active')return'proj-st-active';
  if(s==='On Hold')return'proj-st-hold';if(s==='Completed')return'proj-st-completed';return'proj-st-archived'}

function rProjects(){
  var activeProjects=S.projects.filter(function(p){return p.status!=='Archived'});
  var totalOpen=0,totalTime=0,totalOverdue=0,activeCount=0;
  activeProjects.forEach(function(p){var st=getProjectStats(p);totalOpen+=st.openCount;totalTime+=st.totalTime;totalOverdue+=st.overdue;if(p.status==='Active')activeCount++});

  var h='<div class="vw-head"><h1>Projects</h1><div style="display:flex;gap:8px;align-items:center">';
  h+='<div class="task-mode-toggle">';
  h+='<button class="tm-btn'+(S.projView==='board'?' on':'')+'" onclick="TF.setProjView(\'board\')">Board</button>';
  h+='<button class="tm-btn'+(S.projView==='list'?' on':'')+'" onclick="TF.setProjView(\'list\')">List</button>';
  h+='</div>';
  h+='<button class="btn btn-p" onclick="TF.openAddProject()">+ New Project</button></div></div>';

  /* Metrics */
  h+='<div class="proj-mets">';
  h+='<div class="met"><div class="met-l">Active</div><div class="met-v" style="color:var(--green)">'+activeCount+'</div></div>';
  h+='<div class="met"><div class="met-l">Open Tasks</div><div class="met-v">'+totalOpen+'</div></div>';
  h+='<div class="met"><div class="met-l">Time Tracked</div><div class="met-v" style="color:var(--pink)">'+fmtM(totalTime)+'</div></div>';
  h+='<div class="met"><div class="met-l">Overdue</div><div class="met-v" style="color:'+(totalOverdue?'var(--red)':'var(--t4)')+'">'+totalOverdue+'</div></div>';
  h+='</div>';

  if(!activeProjects.length){h+='<div class="no-data">No projects yet. Create one to start organizing your big ideas into actionable phases.</div>';return h}

  if(S.projView==='board')h+=rProjectBoard(activeProjects);
  else h+=rProjectList(activeProjects);

  /* Charts */
  h+='<div class="proj-chart-grid">';
  h+='<div class="ch-card"><h3 style="margin-top:0;font-size:14px;color:var(--t2)">Project Progress</h3><div class="ch-w" id="proj-progress-chart"></div></div>';
  h+='<div class="ch-card"><h3 style="margin-top:0;font-size:14px;color:var(--t2)">Time by Project</h3><div class="ch-w" id="proj-time-chart"></div></div>';
  h+='</div>';

  return h}

function rProjectBoard(projects){
  var statuses=['Planning','Active','On Hold','Completed'];
  var h='<div class="proj-board">';
  statuses.forEach(function(status){
    var items=projects.filter(function(p){return p.status===status});
    h+='<div class="proj-col">';
    h+='<div class="proj-col-header">'+status+'<span class="proj-col-count">'+items.length+'</span></div>';
    items.forEach(function(p){h+=projCardCompact(p)});
    h+='</div>'});
  h+='</div>';return h}

function rProjectList(projects){
  var h='<div style="display:flex;flex-direction:column;gap:6px">';
  projects.forEach(function(p){
    var st=getProjectStats(p),eid=escAttr(p.id);
    h+='<div class="proj-list-row" onclick="TF.openProjectDetail(\''+eid+'\')" style="border-left-color:'+p.color+'">';
    h+='<div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:'+p.color+'"></div>';
    h+='<span class="proj-list-name">'+esc(p.name)+'</span>';
    h+='<span class="proj-list-status '+projStatusClass(p.status)+'">'+esc(p.status)+'</span>';
    h+='<span class="proj-list-stat">'+st.phases.length+' phases</span>';
    h+='<span class="proj-list-stat">'+st.openCount+' open</span>';
    h+='<span class="proj-list-stat" style="color:var(--green)">'+st.doneCount+' done</span>';
    h+='<span class="proj-list-stat" style="color:var(--pink)">'+fmtM(st.totalTime)+'</span>';
    h+='<div style="width:80px"><div class="proj-progress"><div class="proj-progress-fill" style="width:'+st.progress+'%;background:'+p.color+'"></div></div></div>';
    h+='<span class="proj-card-pct" style="color:'+p.color+'">'+st.progress+'%</span>';
    if(p.targetDate)h+='<span class="proj-list-stat">📅 '+fmtDShort(p.targetDate)+'</span>';
    h+='</div>'});
  h+='</div>';return h}

function projCardCompact(p){
  var st=getProjectStats(p),eid=escAttr(p.id);
  var h='<div class="proj-card" onclick="TF.openProjectDetail(\''+eid+'\')">';
  h+='<div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:'+p.color+';border-radius:4px 0 0 4px"></div>';
  h+='<div class="proj-card-name">'+esc(p.name)+'</div>';
  if(p.description)h+='<div class="proj-card-desc">'+esc(p.description)+'</div>';
  h+='<div class="proj-progress"><div class="proj-progress-fill" style="width:'+st.progress+'%;background:'+p.color+'"></div></div>';
  h+='<div class="proj-card-meta">';
  h+='<span class="proj-card-pct" style="color:'+p.color+'">'+st.progress+'%</span>';
  h+='<span class="proj-card-stat">'+st.openCount+' open</span>';
  h+='<span class="proj-card-stat">'+st.doneCount+' done</span>';
  if(st.totalTime)h+='<span class="proj-card-stat" style="color:var(--pink)">'+fmtM(st.totalTime)+'</span>';
  h+='</div>';
  if(st.phases.length){
    h+='<div class="proj-card-phases">';
    st.phases.forEach(function(ph){
      var cls=ph.status==='Not Started'?'ns':ph.status==='In Progress'?'ip':'cp';
      h+='<span class="proj-phase-badge '+cls+'">'+esc(ph.name)+'</span>'});
    h+='</div>'}
  if(p.targetDate)h+='<div style="font-size:10px;color:var(--t4);margin-top:6px">📅 '+fmtDShort(p.targetDate)+'</div>';
  h+='</div>';return h}

function initProjectCharts(){
  var activeProjects=S.projects.filter(function(p){return p.status!=='Archived'&&p.status!=='Completed'});
  /* Progress donut */
  var progData={};
  activeProjects.forEach(function(p){var st=getProjectStats(p);if(st.openCount+st.doneCount>0)progData[p.name]=st.progress});
  if(Object.keys(progData).length){
    var el=gel('proj-progress-chart');if(el){killChart('proj-progress-chart');
      var labels=Object.keys(progData),vals=labels.map(function(k){return progData[k]});
      var cols=activeProjects.filter(function(p){return progData[p.name]!==undefined}).map(function(p){return p.color});
      charts['proj-progress-chart']=new Chart(el,{type:'bar',data:{labels:labels,datasets:[{data:vals,backgroundColor:cols.map(function(c){return c+'88'}),hoverBackgroundColor:cols,borderRadius:6,barThickness:22}]},
        options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.parsed.x+'% complete'}}}},
          scales:{x:{max:100,grid:{color:'rgba(130,55,245,0.06)'},ticks:{color:'#8a7ca8',font:{size:10},callback:function(v){return v+'%'}}},y:{grid:{display:false},ticks:{color:'#c4b8dc',font:{size:10}}}}}})}}
  /* Time bar chart */
  var timeData={};
  activeProjects.forEach(function(p){var st=getProjectStats(p);if(st.totalTime>0)timeData[p.name]=st.totalTime});
  if(Object.keys(timeData).length)mkHBar('proj-time-chart',timeData)}

/* ── Mobile Today ── */
function rMobToday(){
  var td=today(),effDay=getEffectiveDay();
  var isShifted=effDay.getTime()!==td.getTime();
  S.tasks.forEach(function(t){t._score=taskScore(t)});
  var effEnd=new Date(effDay.getTime()+864e5);
  var todayDone=S.done.filter(function(d){return d.completed&&d.completed>=effDay&&d.completed<effEnd});
  var todayMins=0;todayDone.forEach(function(d){todayMins+=d.duration||0});
  /* In-progress */
  var inProg=S.tasks.filter(function(t){var ts=tmrGet(t.id);return ts.started||(ts.elapsed||0)>0});
  /* Due today or overdue */
  var focus=S.tasks.filter(function(t){if(!t.due)return false;return dayDiff(effDay,t.due)<=0})
    .sort(function(a,b){return(b._score||0)-(a._score||0)});
  /* Upcoming (due within 3 days) */
  var upcoming=S.tasks.filter(function(t){if(!t.due)return false;var dd=dayDiff(effDay,t.due);return dd>0&&dd<=3})
    .sort(function(a,b){return(a.due||0)-(b.due||0)});

  var dayTitle=isShifted?fmtDFull(effDay):'Today';
  var h='<h1 style="margin-bottom:16px">'+dayTitle+'</h1>';
  /* Metrics */
  h+='<div class="mob-mets">';
  h+='<div class="mob-met"><div class="mob-met-v" style="color:var(--green)">'+todayDone.length+'</div><div class="mob-met-l">Done</div></div>';
  h+='<div class="mob-met"><div class="mob-met-v" style="color:var(--pink)">'+fmtM(todayMins)+'</div><div class="mob-met-l">Tracked</div></div>';
  h+='<div class="mob-met"><div class="mob-met-v" style="color:var(--red)">'+focus.length+'</div><div class="mob-met-l">Due</div></div>';
  h+='</div>';
  /* In progress */
  if(inProg.length){h+='<div class="mob-section-h">In Progress</div><div class="mob-task-list">';
    inProg.forEach(function(t){h+=mobTaskRow(t,td)});h+='</div>'}
  /* Due / overdue */
  if(focus.length){h+='<div class="mob-section-h">Due Today</div><div class="mob-task-list">';
    focus.forEach(function(t){h+=mobTaskRow(t,td)});h+='</div>'}
  /* Upcoming */
  if(upcoming.length){h+='<div class="mob-section-h">Coming Up</div><div class="mob-task-list">';
    upcoming.forEach(function(t){h+=mobTaskRow(t,td)});h+='</div>'}
  /* Completed */
  if(todayDone.length){h+='<div class="mob-section-h">Completed Today</div><div class="mob-task-list">';
    todayDone.forEach(function(d){
      h+='<div class="mob-done-row">';
      h+='<span class="bg '+impCls(d.importance||'Important')+'">'+esc((d.importance||'I')[0])+'</span>';
      h+='<span class="mob-task-name" style="text-decoration:line-through;color:var(--t3)">'+esc(d.item)+'</span>';
      if(d.duration)h+='<span style="font-size:11px;color:var(--green);font-weight:600;margin-left:auto">'+fmtM(d.duration)+'</span>';
      h+='</div>'});h+='</div>'}
  if(!inProg.length&&!focus.length&&!upcoming.length&&!todayDone.length){
    h+='<div style="text-align:center;color:var(--t4);padding:40px 0;font-size:14px">Nothing on today yet. Tap <b>Add</b> to capture a task.</div>'}
  return h}

/* ── Mobile Tasks ── */
function rMobTasks(){
  S.tasks.forEach(function(t){t._score=taskScore(t)});
  var sorted=S.tasks.slice().sort(function(a,b){return(b._score||0)-(a._score||0)});
  var td=today();
  var h='<h1 style="margin-bottom:12px">Tasks</h1>';
  h+='<input class="edf" placeholder="Search tasks..." style="width:100%;margin-bottom:16px;padding:12px 14px;font-size:14px;box-sizing:border-box" oninput="TF.mobSearchTasks(this.value)" id="mob-task-search">';
  h+='<div class="mob-task-list" id="mob-task-list">';
  if(!sorted.length){h+='<div style="text-align:center;color:var(--t4);padding:40px 0;font-size:14px">No open tasks</div>'}
  else{sorted.forEach(function(t){h+=mobTaskRow(t,td)})}
  h+='</div>';return h}

/* ── Shared task row ── */
function mobTaskRow(t,td){
  var ts=tmrGet(t.id),running=!!ts.started,hasT=running||(ts.elapsed||0)>0;
  var elapsed=tmrElapsed(t.id);var eid=escAttr(t.id);
  var isOd=t.due&&t.due<td;
  var h='<div class="mob-task-row'+(isOd?' od':'')+'" onclick="TF.openDetail(\''+eid+'\')">';
  h+='<div class="mob-task-left">';
  h+='<span class="bg '+impCls(t.importance)+'" style="flex-shrink:0;width:28px;height:28px;font-size:12px;border-radius:8px;display:flex;align-items:center;justify-content:center">'+esc((t.importance||'I')[0])+'</span>';
  h+='<span class="mob-task-name">'+esc(t.item)+'</span></div>';
  h+='<div class="mob-task-right">';
  if(hasT){h+='<span class="tmr tmr-sm'+(running?' go':'')+'" style="font-size:11px">';
    h+='<span class="dot '+(running?'pulse':'pau')+'"></span>';
    h+='<span data-tmr="'+esc(t.id)+'">'+fmtT(elapsed)+'</span></span>'}
  h+='<button class="ab ab-dn ab-sm" onclick="event.stopPropagation();TF.done(\''+eid+'\')" title="Complete" style="width:36px;height:36px">'+CK_S+'</button>';
  h+='</div></div>';return h}
