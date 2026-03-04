/* ═══════════ RENDER ═══════════ */
function render(){
  buildNav();
  var m=gel('main'),html='';
  /* Mobile: focused 4-view experience */
  if(isMobile()){
    var mobIds=['mob-add','tasks','mob-review','opportunities'];
    if(mobIds.indexOf(S.view)===-1)S.view='mob-add';
    switch(S.view){case'mob-add':html=rMobAdd();break;case'tasks':html=rMobTasks();break;case'mob-review':html=rMobReview();break;case'opportunities':html=rMobOpportunities();break}
    m.innerHTML='<section class="vw on">'+html+'</section>';
    renderSidebar();renderActiveWidget();return}
  /* Desktop: 8-view experience */
  if(S.view==='completed'){S.view='tasks';S.subView='done'}
  if(hasSubs(S.view)&&!S.subView)S.subView=getDefaultSub(S.view);
  switch(S.view){case'today':html=rToday();break;case'tasks':html=rTasks();break;case'opportunities':html=rOpportunities();break;case'campaigns':html=rCampaigns();break;case'projects':html=rProjects();break;case'clients':html=rClients();break;case'dashboard':html=rDashboard();break;case'finance':html=rFinance();break}
  m.innerHTML=renderMeetingPromptBanner()+'<section class="vw on">'+html+'</section>';
  if(S.view==='today'){initTodayCharts();if(S.subView==='analytics')initScheduleAnalyticsCharts();if(S.subView==='weekly')initScheduleWeeklyCharts()}
  if(S.view==='dashboard')initDashboardCharts();
  if(S.view==='projects')initProjectCharts();
  if(S.view==='opportunities'){initOpportunityCharts();if(S.opViewMode==='profitability'&&S.subView&&OPP_TYPES[S.subView])initOppProfitabilityCharts(S.subView);if(S.subView==='profitability')initOppProfitabilityDashboard()}
  if(S.view==='clients')initClientsCharts();
  if(S.view==='finance')initFinanceCharts();
  if(S.view==='campaigns'&&S.subView==='performance')initCampaignPerformanceCharts();
  renderSidebar();renderActiveWidget()}


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
  if(isPinned)h+='<span style="font-size:12px;flex-shrink:0;opacity:.7">'+icon('pin',12)+'</span>';
  h+='<span class="bg '+impCls(t.importance)+'" style="flex-shrink:0">'+esc(t.importance)+'</span>';
  h+='<span class="tk-name">'+esc(t.item)+'</span>';
  if(dueTxt)h+='<span class="bg-du'+dueCls+'" style="flex-shrink:0">'+icon('calendar',11)+' '+dueTxt+'</span>';
  if(isFl)h+='<span class="bg bg-fl" style="flex-shrink:0">'+icon('flag',11)+'</span>';
  if(t.meetingKey)h+='<span class="bg" style="background:rgba(255,0,153,0.08);color:var(--purple50);flex-shrink:0;font-size:10px">'+icon('calendar',11)+'</span>';
  h+='</div><div class="tk-right">';
  if(hasT){h+='<span class="tmr tmr-sm'+(running?' go':'')+'">';
    if(running)h+='<span class="dot pulse"></span>';else h+='<span class="dot pau"></span>';
    h+='<span data-tmr="'+esc(t.id)+'">'+fmtT(elapsed)+'</span></span>'}
  if(running)h+='<button class="ab ab-pa ab-sm" onclick="event.stopPropagation();TF.pause(\''+eid+'\')" title="Pause">'+icon('pause',11)+'</button>';
  else h+='<button class="ab ab-go ab-sm" onclick="event.stopPropagation();TF.start(\''+eid+'\')" title="Start">'+icon('play',11)+'</button>';
  h+='<button class="ab ab-dn ab-sm" onclick="event.stopPropagation();TF.done(\''+eid+'\')" title="Complete">'+CK_S+'</button>';
  h+='<span class="tk-score">'+((t._score||0)>999?icon('flame',12):(t._score||0))+'</span>';
  h+='</div></div>';

  /* GRID body */
  h+='<div class="tk-g">';
  h+='<div class="tk-g-head">';
  if(isPinned)h+='<span style="font-size:11px">'+icon('pin',12)+'</span>';
  h+='<span class="bg '+impCls(t.importance)+'">'+esc(t.importance)+'</span>';
  if(dueTxt)h+='<span class="bg-du'+dueCls+'">'+icon('calendar',11)+' '+dueTxt+'</span>';
  if(isFl)h+='<span class="bg bg-fl">'+icon('flag',11)+'</span>';
  h+='</div>';
  h+='<div class="tk-g-name">'+esc(t.item)+'</div>';
  h+='<div class="tk-g-meta">';
  if(t.client)h+='<span class="bg bg-cl">'+esc(t.client)+'</span>';
  if(t.endClient)h+='<span class="bg bg-ec">'+esc(t.endClient)+'</span>';
  if(t.campaign){var _cp=S.campaigns.find(function(c){return c.id===t.campaign});if(_cp)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber)">'+icon('target',11)+' '+esc(_cp.name)+'</span>'}
  if(t.project){var _pj=S.projects.find(function(p){return p.id===t.project});if(_pj)h+='<span class="bg bg-proj" onclick="event.stopPropagation();TF.openProjectDetail(\''+escAttr(_pj.id)+'\')">'+icon('folder',11)+' '+esc(_pj.name)+'</span>'}
  if(t.opportunity){var _op=S.opportunities.find(function(o){return o.id===t.opportunity});if(_op)h+='<span class="bg bg-opp" onclick="event.stopPropagation();TF.openOpportunityDetail(\''+escAttr(_op.id)+'\')">'+icon('gem',11)+' '+esc(_op.name)+'</span>'}
  if(t.meetingKey){var _me=S.calEvents.find(function(ev){return mtgKey(ev.title,ev.start)===t.meetingKey});if(_me)h+='<span class="bg" style="background:rgba(255,0,153,0.08);color:var(--purple50)">'+icon('calendar',11)+' '+esc(_me.title)+' '+fmtTime(_me.start)+'</span>';else h+='<span class="bg" style="background:rgba(255,0,153,0.08);color:var(--purple50)">'+icon('calendar',11)+' Linked meeting</span>'}
  if(t.category)h+='<span class="bg bg-ca">'+esc(t.category)+'</span>';
  if(t.est)h+='<span class="bg-es">'+fmtM(t.est)+'</span>';
  h+='</div>';
  h+='<div class="tk-g-foot"><div class="tk-g-foot-l">';
  if(hasT){h+='<span class="tmr tmr-sm'+(running?' go':'')+'">';
    if(running)h+='<span class="dot pulse"></span>';else h+='<span class="dot pau"></span>';
    h+='<span data-tmr="'+esc(t.id)+'">'+fmtT(elapsed)+'</span></span>'}
  else h+='<span class="tk-score">'+((t._score||0)>999?icon('flame',12):(t._score||0))+'</span>';
  h+='</div><div class="tk-g-foot-r">';
  if(running)h+='<button class="ab ab-pa ab-sm" onclick="event.stopPropagation();TF.pause(\''+eid+'\')" title="Pause">'+icon('pause',11)+'</button>';
  else h+='<button class="ab ab-go ab-sm" onclick="event.stopPropagation();TF.start(\''+eid+'\')" title="Start">'+icon('play',11)+'</button>';
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
  if(t.campaign){var _cp2=S.campaigns.find(function(c){return c.id===t.campaign});if(_cp2)h+='<span style="color:var(--amber)">'+icon('target',11)+' '+esc(_cp2.name)+'</span>'}
  if(t.meetingKey){var _me2=S.calEvents.find(function(ev){return mtgKey(ev.title,ev.start)===t.meetingKey});if(_me2)h+='<span style="color:var(--purple50)">'+icon('calendar',11)+' '+fmtTime(_me2.start)+'</span>'}
  if(isFl)h+='<span>'+icon('flag',11)+'</span>';
  if(hasT)h+='<span data-tmr="'+esc(t.id)+'" style="color:'+(running?'var(--green)':'var(--amber)')+';font-family:var(--fd);font-weight:600;letter-spacing:0.03em">'+fmtT(elapsed)+'</span>';
  h+='</span>';
  h+='<span class="td-mini-acts">';
  if(running)h+='<button class="ab ab-pa ab-mini" onclick="event.stopPropagation();TF.pause(\''+eid+'\')" title="Pause">'+icon('pause',11)+'</button>';
  else h+='<button class="ab ab-go ab-mini" onclick="event.stopPropagation();TF.start(\''+eid+'\')" title="Start">'+icon('play',11)+'</button>';
  h+='<button class="ab ab-dn ab-mini" onclick="event.stopPropagation();TF.done(\''+eid+'\')" title="Done">'+CK_XS+'</button>';
  h+='</span></div>';return h}

/* ═══════════ DASHBOARD ═══════════ */
function dashMet(label,value,color){return'<div class="dash-met"><div class="dash-met-v" style="color:'+color+'">'+value+'</div><div class="dash-met-l">'+label+'</div></div>'}

function rDashboard(){
  var td_=today(),now=new Date();
  var tdEnd=new Date(td_.getTime()+864e5);
  /* Task metrics */
  var openTasks=S.tasks.length;
  var overdueTasks=S.tasks.filter(function(t){return t.due&&t.due<td_}).length;
  var inProgress=0;Object.keys(S.timers).forEach(function(id){if(S.timers[id].started)inProgress++});
  var todayDone=S.done.filter(function(d){return d.completed&&d.completed>=td_&&d.completed<tdEnd});
  var todayMins=0;todayDone.forEach(function(d){todayMins+=d.duration||0});
  var reviewCount=S.review.length;
  var dueTodayTasks=S.tasks.filter(function(t){return t.due&&t.due>=td_&&t.due<tdEnd});
  var todayMeetings=S.calEvents.filter(function(e){return!e.allDay&&e.start>=td_&&e.start<tdEnd&&e.title.indexOf('OOO')!==0});

  /* Weekly metrics */
  var weekStart=new Date(td_);weekStart.setDate(weekStart.getDate()-weekStart.getDay()+1);
  var weekEnd=new Date(weekStart.getTime()+7*864e5);
  var weekDone=S.done.filter(function(d){return d.completed&&d.completed>=weekStart&&d.completed<weekEnd});
  var weekMins=0;weekDone.forEach(function(d){weekMins+=d.duration||0});

  /* Monthly metrics */
  var monthStart=new Date(td_.getFullYear(),td_.getMonth(),1);
  var monthDone=S.done.filter(function(d){return d.completed&&d.completed>=monthStart});

  /* Campaign metrics */
  var activeCampaigns=S.campaigns.filter(function(c){return c.status==='Active'});
  var monthlyRecurring=0;activeCampaigns.forEach(function(c){monthlyRecurring+=(c.monthlyFee||0)+(c.monthlyAdSpend||0)});

  /* Revenue */
  var totalRevenue=0;var recentInflows=0;var cut7d=new Date(td_.getTime()-7*864e5);
  S.financePayments.forEach(function(p){if(p.status!=='excluded'&&p.type!=='transfer'&&p.direction==='inflow'&&p.type==='payment'){totalRevenue+=p.amount;if(p.date&&p.date>=cut7d)recentInflows+=p.amount}});

  /* Opportunity metrics */
  var activeOpps=S.opportunities.filter(function(o){return o.stage!=='Closed Won'&&o.stage!=='Closed Lost'});
  var pipelineValue=0,weightedPipeline=0;
  activeOpps.forEach(function(o){var v=(o.strategyFee||0)+(o.setupFee||0)+((o.monthlyFee||0)*12);pipelineValue+=v;weightedPipeline+=v*(o.probability||0)/100});
  var wonOpps=S.opportunities.filter(function(o){return o.stage==='Closed Won'});
  var closedTotal=wonOpps.length+S.opportunities.filter(function(o){return o.stage==='Closed Lost'}).length;
  var winRate=closedTotal>0?Math.round(wonOpps.length/closedTotal*100):0;

  /* Client metrics */
  var activeClients={};S.clientRecords.forEach(function(cr){if(cr.status==='active')activeClients[cr.name]=true});
  var clientsWithOverdue={};S.tasks.forEach(function(t){if(t.due&&t.due<td_&&t.client)clientsWithOverdue[t.client]=true});

  /* Completion rate */
  var totalCreated=S.tasks.length+S.done.length;
  var completionRate=totalCreated>0?Math.round(S.done.length/totalCreated*100):0;
  var avgDuration=S.done.length>0?Math.round(S.done.reduce(function(s,d){return s+(d.duration||0)},0)/S.done.length):0;

  /* Top clients by time this week */
  var weekClientTime={};weekDone.forEach(function(d){if(d.client)weekClientTime[d.client]=(weekClientTime[d.client]||0)+(d.duration||0)});
  var topClients=Object.keys(weekClientTime).sort(function(a,b){return weekClientTime[b]-weekClientTime[a]}).slice(0,3);

  var h='<div class="pg-head"><h1>'+icon('dashboard',18)+' Dashboard</h1><div class="stats"><div class="st">'+now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'</div></div></div>';

  /* Row 1: Today's Focus */
  h+='<div class="dash-section">Today\'s Focus</div>';
  h+='<div class="dash-mets">';
  h+=dashMet('Due Today',dueTodayTasks.length,dueTodayTasks.length?'var(--amber)':'var(--green)');
  h+=dashMet('Meetings',todayMeetings.length,todayMeetings.length?'var(--purple50)':'var(--t4)');
  h+=dashMet('In Progress',inProgress,inProgress?'var(--green)':'var(--t4)');
  h+=dashMet('Review Queue',reviewCount,reviewCount?'var(--amber)':'var(--t4)');
  h+='</div>';

  /* Today's meetings list */
  if(todayMeetings.length){
    h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">';
    todayMeetings.slice(0,5).forEach(function(m){
      var t1=m.start.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
      h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px;border-left:3px solid var(--pink)">';
      h+='<span style="font-size:11px;font-weight:600;color:var(--pink);font-family:var(--fd)">'+t1+'</span>';
      h+='<span style="font-size:12px;color:var(--t1)">'+esc(m.title)+'</span></div>'});
    h+='</div>'}

  /* Row 2: Productivity */
  h+='<div class="dash-section">Productivity</div>';
  h+='<div class="dash-mets">';
  h+=dashMet('Done Today',todayDone.length,'var(--green)');
  h+=dashMet('Done This Week',weekDone.length,'var(--green)');
  h+=dashMet('Done This Month',monthDone.length,'var(--green)');
  h+=dashMet('Open Tasks',openTasks,'var(--t1)');
  h+=dashMet('Overdue',overdueTasks,overdueTasks?'var(--red)':'var(--green)');
  h+=dashMet('Tracked Today',fmtM(todayMins),'var(--pink)');
  h+=dashMet('Tracked This Week',fmtM(weekMins),'var(--pink)');
  h+=dashMet('Completion Rate',completionRate+'%','var(--blue)');
  h+='</div>';

  /* Row 3: Sales Pipeline */
  h+='<div class="dash-section">Sales Pipeline</div>';
  h+='<div class="dash-mets">';
  h+=dashMet('Pipeline Value',fmtUSD(pipelineValue),'var(--blue)');
  h+=dashMet('Weighted',fmtUSD(weightedPipeline),'var(--amber)');
  h+=dashMet('Active Deals',activeOpps.length,'var(--purple50)');
  h+=dashMet('Win Rate',winRate+'%',winRate>=50?'var(--green)':'var(--amber)');
  h+='</div>';

  /* Row 4: Finance */
  h+='<div class="dash-section">Finance Snapshot</div>';
  h+='<div class="dash-mets">';
  h+=dashMet('Total Revenue',fmtUSD(totalRevenue),'var(--green)');
  h+=dashMet('Monthly Recurring',fmtUSD(monthlyRecurring),'var(--green)');
  h+=dashMet('Recent Inflows (7d)',fmtUSD(recentInflows),'var(--green)');
  h+=dashMet('Active Campaigns',activeCampaigns.length,'var(--amber)');
  h+='</div>';

  /* Row 5: Clients compact */
  h+='<div class="dash-section">Clients</div>';
  h+='<div class="dash-mets">';
  h+=dashMet('Active Clients',Object.keys(activeClients).length,'var(--t1)');
  h+=dashMet('With Overdue',Object.keys(clientsWithOverdue).length,Object.keys(clientsWithOverdue).length?'var(--red)':'var(--green)');
  h+='</div>';
  if(topClients.length){
    h+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">';
    topClients.forEach(function(cl,i){
      h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:8px;padding:8px 14px;display:flex;align-items:center;gap:8px">';
      h+='<span style="font-size:11px;color:var(--t4);font-weight:600">#'+(i+1)+'</span>';
      h+='<span style="font-size:12px;color:var(--t1);font-weight:600">'+esc(cl)+'</span>';
      h+='<span style="font-size:11px;color:var(--pink);font-family:var(--fd)">'+fmtM(weekClientTime[cl])+'</span></div>'});
    h+='</div>'}

  /* Heatmap */
  h+='<div class="dash-section">Activity</div>';
  h+='<div class="dash-heatmap" id="heatmap-cal"></div>';

  /* Charts */
  h+='<div class="dash-charts">';
  h+='<div class="chart-card"><h3>Tasks by Importance</h3><div class="chart-wrap"><canvas id="dash-imp-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Time by Client (7d)</h3><div class="chart-wrap"><canvas id="dash-client-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Pipeline by Type</h3><div class="chart-wrap"><canvas id="dash-pipe-type-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Daily Completions (30d)</h3><div class="chart-wrap"><canvas id="dash-daily-chart"></canvas></div></div>';
  h+='</div>';
  return h}

function initDashboardCharts(){
  setTimeout(function(){
    /* Importance donut */
    var impData={};S.done.forEach(function(d){var imp=d.importance||'When Time Allows';impData[imp]=(impData[imp]||0)+1});
    if(Object.keys(impData).length)mkDonut('dash-imp-chart',impData);
    /* Client time bar (last 7 days) */
    var cutoff=new Date(today().getTime()-7*864e5);
    var clientData={};S.done.filter(function(d){return d.completed&&d.completed>=cutoff}).forEach(function(d){
      var cl=d.client||'Unassigned';clientData[cl]=(clientData[cl]||0)+(d.duration||0)});
    if(Object.keys(clientData).length)mkHBar('dash-client-chart',clientData);
    /* Pipeline by type donut */
    var pipeTypeData={};
    S.opportunities.filter(function(o){return o.stage!=='Closed Won'&&o.stage!=='Closed Lost'}).forEach(function(o){
      var conf=oppTypeConf(o.type);var v=(o.strategyFee||0)+(o.setupFee||0)+((o.monthlyFee||0)*12);
      pipeTypeData[conf.label]=(pipeTypeData[conf.label]||0)+v});
    if(Object.keys(pipeTypeData).length)mkDonut('dash-pipe-type-chart',pipeTypeData);
    /* Daily completions (line chart, last 30 days) */
    var dailyData={};var td_=today();
    for(var i=29;i>=0;i--){var d=new Date(td_.getTime()-i*864e5);var k=fmtDShort(d);dailyData[k]=0}
    var cut30=new Date(td_.getTime()-30*864e5);
    S.done.filter(function(d){return d.completed&&d.completed>=cut30}).forEach(function(d){var k=fmtDShort(d.completed);if(dailyData.hasOwnProperty(k))dailyData[k]++});
    if(Object.keys(dailyData).length)mkLine('dash-daily-chart',dailyData,'Tasks');
    /* Heatmap */
    renderHeatmap();
  },200)}

/* ═══════════ RETAIN CLIENTS ═══════════ */
function buildClientMap(){
  var td_=today();
  var clientMap={};
  function ensureClient(name){
    if(!name||name===''||name==='Internal'||name==='N/A')return;
    if(!clientMap[name])clientMap[name]={name:name,campaigns:0,activeCampaigns:0,monthlyRev:0,
      opportunities:0,pipelineValue:0,openTasks:0,overdueTasks:0,doneTasks:0,timeTracked:0,
      meetings:0,lastActivity:null,campaignList:[],oppList:[],recentDone:[],
      totalRevenue:0,paymentCount:0,clientStatus:'active',clientId:''}}
  S.campaigns.forEach(function(cp){
    ensureClient(cp.partner);if(!cp.partner||cp.partner===''||cp.partner==='Internal'||cp.partner==='N/A')return;
    var c=clientMap[cp.partner];c.campaigns++;
    if(cp.status==='Active'){c.activeCampaigns++;c.monthlyRev+=(cp.monthlyFee||0)}
    c.campaignList.push({name:cp.name,status:cp.status,id:cp.id})});
  S.opportunities.forEach(function(op){
    ensureClient(op.client);if(!op.client||op.client===''||op.client==='Internal'||op.client==='N/A')return;
    var c=clientMap[op.client];
    if(op.stage!=='Closed Won'&&op.stage!=='Closed Lost'){
      c.opportunities++;c.pipelineValue+=(op.strategyFee||0)+(op.setupFee||0)+((op.monthlyFee||0)*12)}
    c.oppList.push({name:op.name,stage:op.stage,id:op.id,type:op.type})});
  S.tasks.forEach(function(t){
    ensureClient(t.client);if(!t.client||t.client===''||t.client==='Internal'||t.client==='N/A')return;
    clientMap[t.client].openTasks++;
    if(t.due&&t.due<td_)clientMap[t.client].overdueTasks++});
  S.done.forEach(function(d){
    ensureClient(d.client);if(!d.client||d.client===''||d.client==='Internal'||d.client==='N/A')return;
    var c=clientMap[d.client];c.doneTasks++;c.timeTracked+=(d.duration||0);
    if(d.completed&&(!c.lastActivity||d.completed>c.lastActivity))c.lastActivity=d.completed;
    if(c.recentDone.length<10)c.recentDone.push({item:d.item,duration:d.duration,completed:d.completed})});
  var cpMap={};S.campaigns.forEach(function(cp){cpMap[cp.id]=cp.partner||''});
  S.campaignMeetings.forEach(function(m){
    var partner=cpMap[m.campaignId]||'';
    ensureClient(partner);if(!partner||partner==='')return;
    clientMap[partner].meetings++});
  S.financePayments.forEach(function(fp){
    if(!fp.clientId||fp.status==='excluded')return;
    var cName=clientNameById(fp.clientId);if(!cName)return;
    ensureClient(cName);
    clientMap[cName].totalRevenue+=fp.amount;
    clientMap[cName].paymentCount++});
  S.clientRecords.forEach(function(cr){
    if(clientMap[cr.name]){
      clientMap[cr.name].clientStatus=cr.status||'active';
      clientMap[cr.name].clientId=cr.id}});
  return clientMap}

function rClients(){
  var td_=today();
  var clientMap=buildClientMap();
  var clients=Object.keys(clientMap).map(function(k){return clientMap[k]});
  clients.sort(function(a,b){return(b.activeCampaigns+b.openTasks+b.opportunities)-(a.activeCampaigns+a.openTasks+a.opportunities)});

  var totalClients=clients.length;
  var totalActive=clients.filter(function(c){return c.clientStatus==='active'}).length;
  var totalOpenTasks=clients.reduce(function(s,c){return s+c.openTasks},0);
  var totalRevenue=clients.reduce(function(s,c){return s+c.totalRevenue},0);

  var h='<div class="pg-head"><h1>'+icon('clients',18)+' Clients</h1>';
  h+='<button class="btn btn-p" onclick="TF.openAddClientModal()" style="font-size:13px;padding:8px 16px;border-radius:10px">+ Add Client</button></div>';

  h+='<div class="dash-mets">';
  h+=dashMet('Total Clients',totalClients,'var(--t1)');
  h+=dashMet('Active',totalActive,'var(--green)');
  h+=dashMet('Total Revenue',fmtUSD(totalRevenue),'var(--green)');
  h+=dashMet('Open Tasks',totalOpenTasks,'var(--blue)');
  h+='</div>';

  if(!clients.length){
    h+='<div style="padding:30px;text-align:center;color:var(--t4);font-size:13px">No client data yet.</div>';
    return h}

  /* If a client detail is open, render full-screen dashboard */
  if(S.clientDetailName){
    var cl=clientMap[S.clientDetailName];
    if(cl)return h+rClientDashboard(cl);
    else S.clientDetailName=''}

  var sub=S.subView||'active';
  if(isMobile()){
    h+='<div class="task-mode-toggle" style="margin-bottom:16px">';
    h+='<button class="tm-btn'+(sub==='active'?' on':'')+'" onclick="TF.subNav(\'active\')">Active</button>';
    h+='<button class="tm-btn'+(sub==='lapsed'?' on':'')+'" onclick="TF.subNav(\'lapsed\')">Lapsed</button>';
    h+='</div>'}

  /* Filter by active/lapsed */
  var filtered=clients.filter(function(c){
    if(sub==='lapsed')return c.clientStatus!=='active';
    return c.clientStatus==='active'});

  /* Client table — simplified 6 columns */
  h+='<div class="tb-wrap"><table class="tb"><thead><tr>';
  h+='<th style="text-align:left">Client</th>';
  h+='<th style="text-align:center;width:70px">Status</th>';
  h+='<th style="text-align:right">Revenue</th>';
  h+='<th style="text-align:right">Open Tasks</th>';
  h+='<th style="text-align:right">Time Tracked</th>';
  h+='<th style="text-align:right">Last Activity</th>';
  h+='</tr></thead><tbody>';

  filtered.forEach(function(c){
    var st=c.clientStatus||'active';
    h+='<tr class="cl-row" style="cursor:pointer" onclick="TF.openClientDashboard(\''+escAttr(c.name)+'\')">';
    h+='<td style="font-weight:600;color:var(--t1)">';
    h+=esc(c.name);
    if(c.clientId)h+=' <span class="cl-edit-btn" onclick="event.stopPropagation();TF.openEditClient(\''+escAttr(c.clientId)+'\')">'+icon('edit',10)+'</span>';
    h+='</td>';
    h+='<td style="text-align:center"><span class="cl-status-dot '+(st==='active'?'cl-status-active':'cl-status-lapsed')+'"></span><span style="font-size:11px;color:var(--t3)">'+esc(st)+'</span></td>';
    h+='<td style="text-align:right;color:'+(c.totalRevenue?'var(--green)':'var(--t4)')+'">'+fmtUSD(c.totalRevenue)+'</td>';
    h+='<td style="text-align:right;color:'+(c.overdueTasks?'var(--red)':'var(--t2)')+'">'+c.openTasks+(c.overdueTasks?' <span style="color:var(--red);font-size:10px">('+c.overdueTasks+')</span>':'')+'</td>';
    h+='<td style="text-align:right;color:var(--pink)">'+fmtM(c.timeTracked)+'</td>';
    h+='<td style="text-align:right;color:var(--t3)">'+(c.lastActivity?fmtDShort(c.lastActivity):'-')+'</td>';
    h+='</tr>'});

  h+='</tbody></table></div>';
  return h}

function openClientDashboard(name){S.clientDetailName=name;render()}
function closeClientDashboard(){S.clientDetailName='';render()}

function rClientDashboard(c){
  var td_=today();
  var h='<div style="margin-bottom:16px;display:flex;align-items:center;gap:12px">';
  h+='<button class="btn" onclick="TF.closeClientDashboard()" style="font-size:11px;padding:5px 12px">'+icon('arrow_left',12)+' Back</button>';
  h+='<h2 style="margin:0;font-size:18px;color:var(--t1)">'+esc(c.name)+'</h2>';
  var st=c.clientStatus||'active';
  h+='<span class="cl-status-dot '+(st==='active'?'cl-status-active':'cl-status-lapsed')+'"></span><span style="font-size:12px;color:var(--t3)">'+esc(st)+'</span>';
  if(c.clientId)h+='<button class="btn" onclick="TF.openEditClient(\''+escAttr(c.clientId)+'\')" style="font-size:11px;padding:5px 12px;margin-left:auto">'+icon('edit',11)+' Edit</button>';
  h+='</div>';

  /* KPI strip */
  h+='<div class="dash-mets">';
  h+=dashMet('Revenue',fmtUSD(c.totalRevenue),'var(--green)');
  h+=dashMet('Open Tasks',c.openTasks,'var(--blue)');
  h+=dashMet('Overdue',c.overdueTasks,c.overdueTasks?'var(--red)':'var(--green)');
  h+=dashMet('Time Tracked',fmtM(c.timeTracked),'var(--pink)');
  h+=dashMet('Campaigns',c.activeCampaigns+'/'+c.campaigns,'var(--amber)');
  h+=dashMet('Pipeline',fmtUSD(c.pipelineValue),'var(--purple50)');
  h+='</div>';

  /* Campaigns */
  if(c.campaignList.length){
    h+='<div class="dash-section">'+icon('target',13)+' Campaigns ('+c.campaignList.length+')</div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">';
    c.campaignList.forEach(function(cp){
      h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:8px;padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:8px" onclick="TF.openCampaignDetail(\''+escAttr(cp.id)+'\')">';
      h+='<span style="font-size:12px;color:var(--t1);font-weight:600">'+esc(cp.name)+'</span>';
      h+='<span class="bg" style="font-size:9px;padding:2px 6px">'+esc(cp.status)+'</span></div>'});
    h+='</div>'}

  /* Opportunities */
  if(c.oppList.length){
    h+='<div class="dash-section">'+icon('gem',13)+' Opportunities ('+c.oppList.length+')</div>';
    h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">';
    c.oppList.forEach(function(op){
      h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:8px;padding:8px 14px;cursor:pointer;display:flex;align-items:center;gap:8px" onclick="TF.openOpportunityDetail(\''+escAttr(op.id)+'\')">';
      h+='<span style="font-size:12px;color:var(--t1);font-weight:600">'+esc(op.name)+'</span>';
      h+='<span class="bg '+opStageClass(op.stage,op.type)+'" style="font-size:9px;padding:2px 6px">'+esc(op.stage)+'</span></div>'});
    h+='</div>'}

  /* Open Tasks */
  var clientTasks=S.tasks.filter(function(t){return t.client===c.name});
  if(clientTasks.length){
    h+='<div class="dash-section">'+icon('tasks',13)+' Open Tasks ('+clientTasks.length+')</div>';
    h+='<div class="tk-list" style="margin-bottom:16px">';
    clientTasks.sort(function(a,b){return(b._score||taskScore(b))-(a._score||taskScore(a))}).forEach(function(t,idx){h+=taskCard(t,td_,idx)});
    h+='</div>'}

  /* Recent Completed */
  if(c.recentDone.length){
    h+='<div class="dash-section">Recent Completed ('+c.doneTasks+' total)</div>';
    h+='<div class="dash-recent" style="margin-bottom:16px">';
    c.recentDone.forEach(function(d){
      h+='<div class="dash-recent-item">';
      h+='<span class="dash-recent-check">'+CK_XS+'</span>';
      h+='<span class="dash-recent-name">'+esc(d.item)+'</span>';
      h+='<span class="dash-recent-meta">';
      if(d.duration)h+='<span>'+fmtM(d.duration)+'</span>';
      if(d.completed)h+='<span>'+fmtDShort(d.completed)+'</span>';
      h+='</span></div>'});
    h+='</div>'}

  /* Payment history */
  var clientPayments=c.clientId?S.financePayments.filter(function(fp){return fp.clientId===c.clientId&&fp.status!=='excluded'})
    .sort(function(a,b){return(b.date||0)-(a.date||0)}).slice(0,10):[];
  if(clientPayments.length){
    h+='<div class="dash-section">'+icon('activity',13)+' Recent Payments ('+c.paymentCount+' total)</div>';
    h+='<div style="margin-bottom:16px">';
    clientPayments.forEach(function(fp){
      h+='<div class="cl-detail-item" style="cursor:pointer;padding:6px 0" onclick="TF.openFinancePaymentDetail(\''+escAttr(fp.id)+'\')">';
      h+='<span style="color:var(--t3);font-size:11px;min-width:75px">'+(fp.date?fmtDShort(fp.date):'-')+'</span>';
      h+='<span style="flex:1;color:var(--t1)">'+esc(fp.description||fp.payerName||fp.payerEmail||'Payment')+'</span>';
      h+='<span class="fin-src fin-src-'+esc(fp.source)+'">'+esc(fp.source)+'</span>';
      h+='<span style="font-weight:600;color:var(--green);min-width:80px;text-align:right">'+fmtUSD(fp.amount)+'</span>';
      h+='</div>'});
    h+='</div>'}

  /* Summary */
  h+='<div class="dash-section">Summary</div>';
  h+='<div class="dash-mets">';
  h+=dashMet('Total Done',c.doneTasks,'var(--t1)');
  if(c.monthlyRev)h+=dashMet('Monthly Revenue',fmtUSD(c.monthlyRev),'var(--green)');
  h+=dashMet('Meetings',c.meetings,'var(--amber)');
  h+='</div>';
  return h}

function initClientsCharts(){
  if(S.subView&&S.subView!=='analytics')return;
  setTimeout(function(){
    var timeData={},pipeData={},revData={};
    S.done.forEach(function(d){if(!d.client||d.client==='')return;timeData[d.client]=(timeData[d.client]||0)+(d.duration||0)});
    S.opportunities.forEach(function(o){if(!o.client||o.client==='')return;
      if(o.stage==='Closed Won'||o.stage==='Closed Lost')return;
      var val=(o.strategyFee||0)+(o.setupFee||0)+((o.monthlyFee||0)*12);
      pipeData[o.client]=(pipeData[o.client]||0)+val});
    S.financePayments.forEach(function(fp){if(!fp.clientId||fp.status==='excluded')return;
      var cName=clientNameById(fp.clientId);if(cName)revData[cName]=(revData[cName]||0)+fp.amount});
    if(Object.keys(timeData).length)mkHBar('clients-time-chart',timeData);
    if(Object.keys(pipeData).length)mkDonut('clients-pipeline-chart',pipeData);
    if(Object.keys(revData).length)mkHBarUSD('clients-revenue-chart',revData);
  },200)}

/* Schedule capacity planning is integrated into rToday() */

function rToday(){
  var td=today(),now=new Date(),effDay=getEffectiveDay();
  var isShifted=effDay.getTime()!==td.getTime();
  S.tasks.forEach(function(t){t._score=taskScore(t)});
  var sorted=S.tasks.slice().sort(function(a,b){return(b._score||0)-(a._score||0)});

  /* Shared data prep */
  var effDayEnd=new Date(effDay.getTime()+864e5);
  var prog=0;
  S.tasks.forEach(function(t){
    var ts=tmrGet(t.id);if(ts.started||ts.elapsed>0)prog++});
  var todayDone=S.done.filter(function(d){return d.completed&&d.completed>=effDay&&d.completed<effDayEnd});
  var todayMins=0;todayDone.forEach(function(d){todayMins+=d.duration});
  todayDone.sort(function(a,b){return(b.completed?b.completed.getTime():0)-(a.completed?a.completed.getTime():0)});

  var inProg=[],inProgIds={};
  sorted.forEach(function(t){var ts=tmrGet(t.id);if(ts.started||ts.elapsed>0){inProg.push(t);inProgIds[t.id]=true}});
  var focus=sorted.filter(function(t){if(inProgIds[t.id])return false;if(!t.due)return false;return dayDiff(effDay,t.due)<=0});
  var dayCalEventsAll=S.calEvents.filter(function(e){return!e.allDay&&e.start>=effDay&&e.start<effDayEnd&&e.title.indexOf('OOO')!==0});
  var dayCalEvents=dayCalEventsAll;
  dayCalEvents.sort(function(a,b){return a.start.getTime()-b.start.getTime()});

  var ctx={td:td,now:now,effDay:effDay,effDayEnd:effDayEnd,isShifted:isShifted,sorted:sorted,
    prog:prog,todayDone:todayDone,todayMins:todayMins,inProg:inProg,inProgIds:inProgIds,
    focus:focus,dayCalEvents:dayCalEvents,dayCalEventsAll:dayCalEventsAll};

  /* HEADER */
  var dayTitle=isShifted?fmtDFull(effDay):'Schedule';
  var h='<div class="pg-head"><h1>'+dayTitle+'</h1><div class="stats">';
  if(isShifted)h+='<div class="st" style="color:var(--amber)">Showing next working day</div>';
  else h+='<div class="st">'+now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'</div>';
  h+='<button class="btn" onclick="TF.openSummary()" style="font-size:11px;padding:5px 12px;margin-left:8px">Daily Summary</button>';
  h+='</div></div>';

  /* METRIC STRIP */
  h+='<div class="td-metrics">';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--green)">'+todayDone.length+'</div><div class="td-met-l">Done</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--pink)">'+fmtM(todayMins)+'</div><div class="td-met-l">Tracked</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--purple50)">'+dayCalEvents.length+'</div><div class="td-met-l">Meetings</div></div>';
  h+='<div class="td-met"><div class="td-met-v" style="color:var(--red)">'+focus.length+'</div><div class="td-met-l">Due</div></div>';
  if(prog)h+='<div class="td-met"><div class="td-met-v" style="color:var(--green)">'+prog+'</div><div class="td-met-l">Running</div></div>';
  h+='</div>';

  /* SUB-VIEW DISPATCH */
  var sv=S.subView||'schedule';
  switch(sv){
    case'capacity':h+=rScheduleCapacity(ctx);break;
    case'schedule':h+=rSchedulePlanner(ctx);break;
    case'day':h+=rScheduleDay(ctx);break;
    case'prep':h+=rSchedulePrep(ctx);break;
    case'analytics':h+=rScheduleAnalytics(ctx);break;
    case'daily':h+=rScheduleDaily(ctx);break;
    case'weekly':h+=rScheduleWeekly(ctx);break;
    default:h+=rSchedulePlanner(ctx)}
  return h}

/* ── Sub-view: Weekly Capacity ── */
function rScheduleCapacity(ctx){
  var h='';
  var td=ctx.td;
  var schedDaysConf=CONFIG.schedDays||[1,2,3,4];
  var wSC=CONFIG.workStart||9,wEC=CONFIG.workEnd||20;
  var workMinsPerDay=(wEC-wSC)*60;
  var capDays=[],capWeekUsed={};
  var capWeekFreeMins=0,capWeekBusyMins=0,capWeekSchedMins=0,capWeekSchedCount=0;
  var capWeekMtgMins=0,capWeekOooMins=0,capWeekSchedCrit=0,capWeekSchedImp=0,capWeekSchedWta=0;
  for(var wd=0;wd<7;wd++){
    var wdd=new Date(td.getTime()+wd*864e5);
    if(schedDaysConf.indexOf(wdd.getDay())===-1)continue;
    var wdEnd=new Date(wdd.getTime()+864e5);
    var wdEvents=S.calEvents.filter(function(e){return e.start>=wdd&&e.start<wdEnd});
    var wdFreeSlots=calcFreeSlots(wdEvents,wSC,wEC,wdd);
    var wdFreeMins=0;wdFreeSlots.forEach(function(s){wdFreeMins+=Math.round((s.end-s.start)/60000)});
    var wdMtgMins=0,wdOooMins=0;wdEvents.forEach(function(e){
      var es=Math.max(e.start.getTime(),new Date(wdd).setHours(wSC,0,0,0));
      var ee=Math.min(e.end.getTime(),new Date(wdd).setHours(wEC,0,0,0));
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

  if(capDays.length){
    h+='<div class="cap-section">';
    h+='<div class="cap-week">';
    h+='<div class="cap-week-head">';
    h+='<span class="cap-week-title">'+icon('activity',12)+' Weekly Capacity ('+capDays.length+' work days)</span>';
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
    if(capWeekOooMins>0)h+='<span>OOO <b style="color:var(--purple50)">'+fmtM(capWeekOooMins)+'</b></span>';
    h+='<span>Meetings <b style="color:var(--pink)">'+fmtM(capWeekMtgMins)+'</b></span>';
    if(capWeekSchedCrit>0)h+='<span>Critical <b style="color:var(--red)">'+fmtM(capWeekSchedCrit)+'</b></span>';
    if(capWeekSchedImp>0)h+='<span>Important <b style="color:var(--blue)">'+fmtM(capWeekSchedImp)+'</b></span>';
    if(capWeekSchedWta>0)h+='<span>Flex <b style="color:var(--green)">'+fmtM(capWeekSchedWta)+'</b></span>';
    h+='<span>Free <b style="color:var(--green)">'+fmtM(Math.max(0,capWeekFreeMins-capWeekSchedMins))+'</b></span>';
    if(capUnscheduled>0)h+='<span>'+icon('alert',11)+' Overflow <b style="color:var(--red)">'+capUnscheduled+' tasks</b> ('+fmtM(capUnschedMins)+')</span>';
    else h+='<span>'+icon('check',11)+' <b style="color:var(--green)">All scheduled</b></span>';
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
    h+='</div></div>'}
  else{h+='<div class="no-data" style="padding:36px">No working days configured for capacity planning.</div>'}
  return h}

/* ── Sub-view: Suggested Schedule (Calendar + Day Planner) ── */
function rSchedulePlanner(ctx){
  var h='';
  var effDay=ctx.effDay,isShifted=ctx.isShifted,now=ctx.now;
  var dayCalEvents=ctx.dayCalEvents,dayCalEventsAll=ctx.dayCalEventsAll;

  /* CALENDAR + 2-DAY PLANNER */
  h+='<div id="cal-section">'+renderCalSection()+'</div>';

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

  /* Determine visible time window */
  var nowHr=now.getHours()+now.getMinutes()/60;
  var visStart=wS;
  if(!isShifted&&nowHr>=wS&&nowHr<wE){
    visStart=Math.floor(nowHr);
    if(visStart>wE-1)visStart=wE-1}
  var visHrs=wE-visStart;

  /* Calendar-style container */
  h+='<div class="today-cal" ondragover="TF.schedDragOver(event)" ondrop="TF.schedPanelDrop(event,\''+tdDk+'\')">';
  h+='<div class="today-cal-head">';
  h+='<span class="today-cal-title">'+icon('calendar',11)+' '+(!isShifted?'Today\'s':'Day\'s')+' Schedule</span>';
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
        if(item.task.client)h+=' · '+esc(item.task.client);
        if(item.task.endClient)h+=' · <span style="color:var(--teal)">'+esc(item.task.endClient)+'</span>';
        if(item.task.campaign){var _cptd=S.campaigns.find(function(c){return c.id===item.task.campaign});if(_cptd)h+=' · <span style="color:var(--amber)">'+icon('target',11)+' '+esc(_cptd.name)+'</span>'}
        if(hasT)h+=' · <span style="color:'+(running?'var(--green)':'var(--amber)')+';font-family:var(--fd);font-weight:600">'+fmtT(elapsed)+'</span>';
        h+='</div>'}
      h+='</div>';
      h+='<div class="today-cal-block-acts">';
      if(running)h+='<button class="ab ab-pa ab-sm" onclick="event.stopPropagation();TF.pause(\''+eid+'\')" title="Pause" style="width:22px;height:22px;font-size:9px">'+icon('pause',11)+'</button>';
      else h+='<button class="ab ab-go ab-sm" onclick="event.stopPropagation();TF.start(\''+eid+'\')" title="Start" style="width:22px;height:22px;font-size:9px">'+icon('play',11)+'</button>';
      h+='<button class="ab ab-dn ab-sm" onclick="event.stopPropagation();TF.done(\''+eid+'\')" title="Done" style="width:22px;height:22px;font-size:9px">'+CK_XS+'</button>';
      h+='</div></div>'}});

  if(!dayItems.length){
    h+='<div class="today-cal-empty">No meetings or tasks scheduled</div>'}
  h+='</div></div>';
  return h}

/* ── Sub-view: Today's Schedule (Alerts + Pinned) ── */
function rScheduleDay(ctx){
  var h='';
  var effDay=ctx.effDay,effDayEnd=ctx.effDayEnd,isShifted=ctx.isShifted,sorted=ctx.sorted;

  /* Chase items */
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

  /* In-progress tasks */
  var inProg=ctx.inProg;
  if(inProg.length){
    h+='<div class="td-panel" style="border-color:rgba(16,185,129,0.15);margin-bottom:18px"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--green)">'+icon('play',12)+' In Progress</span><span class="td-panel-c">'+inProg.length+'</span></div>';
    inProg.forEach(function(t){h+=miniRow(t,effDay)});h+='</div>'}

  /* Alerts row */
  if(chaseItems.length||S.review.length){
    var alertsBoth=chaseItems.length&&S.review.length;
    h+='<div class="'+(alertsBoth?'td-row':'td-alerts-single')+'">';
    if(chaseItems.length){
      h+='<div class="chase" style="margin-bottom:0"><div class="chase-title">'+icon('alert',14)+' Needs Chasing ('+chaseItems.length+')</div>';
      chaseItems.slice(0,5).forEach(function(c){
        h+='<div class="chase-item" onclick="TF.openDetail(\''+escAttr(c.task.id)+'\')">';
        h+='<span class="bg bg-fl">'+icon('flag',11)+'</span><span class="chase-item-name">'+esc(c.task.item)+'</span>';
        if(c.task.client)h+='<span class="bg bg-cl" style="font-size:10px">'+esc(c.task.client)+'</span>';
        h+='<span class="chase-item-meta" style="color:'+(c.ov?'var(--red)':'var(--amber)')+';font-weight:600">'+c.ds+'</span></div>'});
      if(chaseItems.length>5)h+='<div style="font-size:11px;color:var(--t4);padding-top:6px">+ '+(chaseItems.length-5)+' more</div>';
      h+='</div>'}
    if(S.review.length){
      var rvItems=reviewSorted();
      h+='<div class="chase" style="margin-bottom:0;background:rgba(255,0,153,0.025);border-color:rgba(255,0,153,0.15)"><div class="chase-title" style="color:var(--pink)">'+icon('inbox',14)+' '+S.review.length+' to Review</div>';
      rvItems.slice(0,4).forEach(function(r,i){h+='<div class="chase-item" onclick="TF.openReviewAt('+i+')"><span class="bg '+impCls(r.importance)+'" style="font-size:10px">'+esc(r.importance).charAt(0)+'</span><span class="chase-item-name">'+esc(r.item)+'</span></div>'});
      if(rvItems.length>4)h+='<div style="font-size:11px;color:var(--t4);padding-top:6px;cursor:pointer" onclick="TF.nav(\'tasks\',\'review\')">+ '+(rvItems.length-4)+' more...</div>';
      h+='</div>'}
    h+='</div>'}

  /* Pinned tasks */
  var pinnedTasks=sorted.filter(function(t){return S.pins[t.id]});
  if(pinnedTasks.length){
    h+='<div class="td-panel" style="border-color:rgba(255,176,48,0.15);margin-bottom:18px"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--amber)">'+icon('pin',12)+' Pinned</span><span class="td-panel-c">'+pinnedTasks.length+'</span></div>';
    pinnedTasks.forEach(function(t){h+=miniRow(t,effDay)});h+='</div>'}

  /* Recently completed today */
  if(ctx.todayDone.length){
    h+='<div class="td-panel" style="border-color:rgba(16,185,129,0.15);margin-bottom:18px"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--green)">'+icon('check',12)+' Completed Today</span><span class="td-panel-c">'+ctx.todayDone.length+'</span></div>';
    ctx.todayDone.slice(0,10).forEach(function(d){
      h+='<div class="mini-row" onclick="TF.openDoneDetail(\''+escAttr(d.id)+'\')">';
      h+='<span class="mini-row-name" style="text-decoration:line-through;opacity:0.7">'+esc(d.item)+'</span>';
      if(d.duration)h+='<span class="mini-row-meta" style="color:var(--green)">'+fmtM(d.duration)+'</span>';
      h+='</div>'});
    if(ctx.todayDone.length>10)h+='<div style="font-size:11px;color:var(--t4);padding-top:6px">+ '+(ctx.todayDone.length-10)+' more</div>';
    h+='</div>'}

  if(!inProg.length&&!chaseItems.length&&!pinnedTasks.length&&!ctx.todayDone.length){
    h+='<div class="no-data" style="padding:36px">All clear! No tasks for '+(isShifted?fmtDShort(effDay):'today')+'.</div>'}
  return h}

/* ── Sub-view: Meeting Prep ── */
function rSchedulePrep(ctx){
  var h='';
  var now=ctx.now,effDay=ctx.effDay,effDayEnd=ctx.effDayEnd;

  var prepCutoff=new Date(now.getTime()+7*24*3600000);
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
    h+='<div class="td-panel" style="border-color:rgba(255,0,153,0.15);margin-bottom:18px">';
    h+='<div class="td-panel-h"><span class="td-panel-t" style="color:var(--purple50)">'+icon('users',12)+' Meeting Prep</span>';
    var totalPrepTasks=0;prepKeys.forEach(function(k){totalPrepTasks+=mtgPrepGroups[k].tasks.length});
    h+='<span class="td-panel-c">'+totalPrepTasks+' task'+(totalPrepTasks>1?'s':'')+' across '+prepKeys.length+' meeting'+(prepKeys.length>1?'s':'')+'</span></div>';
    prepKeys.forEach(function(key){
      var grp=mtgPrepGroups[key];
      var me=grp.event;
      var isToday_=me.start>=effDay&&me.start<effDayEnd;
      var isTomorrow_=me.start>=effDayEnd&&me.start<new Date(effDayEnd.getTime()+864e5);
      var urgClr=isToday_?'var(--red)':isTomorrow_?'var(--amber)':'var(--t3)';
      var urgLabel=isToday_?'TODAY':isTomorrow_?'TOMORROW':fmtDShort(me.start);
      var timeUntil=Math.round((me.start-now)/60000);
      h+='<div style="padding:10px 0;'+(key!==prepKeys[prepKeys.length-1]?'border-bottom:1px solid rgba(255,255,255,0.04);':'')+'">';
      h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
      h+='<span style="font-size:10px;font-weight:700;color:'+urgClr+';text-transform:uppercase;letter-spacing:0.5px">'+urgLabel+'</span>';
      h+='<span style="font-size:12.5px;font-weight:600;color:var(--t1)">'+esc(me.title)+'</span>';
      h+='<span style="font-size:11px;color:var(--t3);margin-left:auto">'+fmtTime(me.start);
      if(timeUntil>0&&timeUntil<480)h+=' (in '+fmtM(timeUntil)+')';
      h+='</span></div>';
      grp.tasks.forEach(function(t){h+=miniRow(t,effDay)});
      h+='</div>'});
    h+='</div>'}
  else{
    h+='<div class="no-data" style="padding:36px">'+icon('check',16)+' No meeting prep tasks in the next 7 days.</div>'}

  /* ALL forthcoming meetings (next 7 days) */
  var allUpcoming=S.calEvents.filter(function(e){return!e.allDay&&e.start>=now&&e.start<=prepCutoff&&e.title.indexOf('OOO')!==0})
    .sort(function(a,b){return a.start.getTime()-b.start.getTime()});
  var meetingsWithoutPrep=allUpcoming.filter(function(e){return!mtgPrepGroups[mtgKey(e.title,e.start)]});
  if(meetingsWithoutPrep.length){
    h+='<div class="td-panel" style="border-color:rgba(255,255,255,0.06);margin-bottom:18px">';
    h+='<div class="td-panel-h"><span class="td-panel-t" style="color:var(--t2)">'+icon('calendar',12)+' Upcoming Meetings (no prep tasks)</span><span class="td-panel-c">'+meetingsWithoutPrep.length+'</span></div>';
    meetingsWithoutPrep.forEach(function(e){
      var isToday_=e.start>=effDay&&e.start<effDayEnd;
      var isTomorrow_=e.start>=effDayEnd&&e.start<new Date(effDayEnd.getTime()+864e5);
      var urgLabel=isToday_?'TODAY':isTomorrow_?'TOMORROW':fmtDShort(e.start);
      var urgClr=isToday_?'var(--red)':isTomorrow_?'var(--amber)':'var(--t3)';
      h+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0">';
      h+='<span style="font-size:10px;font-weight:700;color:'+urgClr+';text-transform:uppercase;letter-spacing:0.5px;min-width:65px">'+urgLabel+'</span>';
      h+='<span style="font-size:12px;color:var(--t1)">'+esc(e.title)+'</span>';
      h+='<span style="font-size:11px;color:var(--t3);margin-left:auto">'+fmtTime(e.start)+'</span>';
      h+='<button class="btn" onclick="TF.openAddMeetingPrepTask(\''+escAttr(mtgKey(e.title,e.start))+'\')" style="font-size:10px;padding:3px 10px;white-space:nowrap">+ Prep Task</button>';
      h+='</div>'});
    h+='</div>'}
  return h}

/* ── Sub-view: Schedule Analytics ── */
function rScheduleAnalytics(ctx){
  var h='';
  var td_=today();

  /* KPI calculations */
  var allTimeDone=S.done.length;
  var totalMins=0;S.done.forEach(function(d){totalMins+=d.duration||0});
  var avgPerDay=0;
  if(S.done.length){
    var earliest=S.done.reduce(function(min,d){return d.completed&&(!min||d.completed<min)?d.completed:min},null);
    if(earliest){var daySpan=Math.max(1,Math.ceil((td_.getTime()-earliest.getTime())/864e5));avgPerDay=Math.round(allTimeDone/daySpan*10)/10}}
  var avgDuration=allTimeDone>0?Math.round(totalMins/allTimeDone):0;

  /* Streak calc */
  var streak=0,checkDate=new Date(td_);
  for(var si=0;si<365;si++){
    var ds=new Date(checkDate.getTime()-si*864e5);
    var de=new Date(ds.getTime()+864e5);
    var hasDone=S.done.some(function(d){return d.completed&&d.completed>=ds&&d.completed<de});
    if(hasDone)streak++;else if(si>0)break}

  h+='<div class="dash-mets">';
  h+=dashMet('All Time Done',allTimeDone,'var(--green)');
  h+=dashMet('Avg / Day',avgPerDay,'var(--blue)');
  h+=dashMet('Avg Duration',fmtM(avgDuration),'var(--pink)');
  h+=dashMet('Current Streak',streak+'d','var(--amber)');
  h+=dashMet('Total Tracked',fmtM(totalMins),'var(--purple50)');
  h+='</div>';

  /* Heatmap */
  h+='<div class="dash-section">Completion Heatmap</div>';
  h+='<div class="dash-heatmap" id="heatmap-cal"></div>';

  /* Charts */
  h+='<div class="dash-charts">';
  h+='<div class="chart-card"><h3>Time of Day</h3><div class="chart-wrap"><canvas id="sched-tod-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Daily Completions (30d)</h3><div class="chart-wrap"><canvas id="sched-daily-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Category Breakdown</h3><div class="chart-wrap"><canvas id="sched-cat-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Time by Client (30d)</h3><div class="chart-wrap"><canvas id="sched-client-chart"></canvas></div></div>';
  h+='</div>';
  return h}

function initScheduleAnalyticsCharts(){
  setTimeout(function(){
    renderHeatmap();
    /* Time-of-day bar chart */
    var todData={};for(var i=0;i<24;i++){todData[(i<10?'0':'')+i+':00']=0}
    S.done.forEach(function(d){if(d.completed){var hr=d.completed.getHours();todData[(hr<10?'0':'')+hr+':00']++}});
    mkHBar('sched-tod-chart',todData);
    /* Daily completions */
    var td_=today();var dailyData={};
    for(var j=29;j>=0;j--){var d=new Date(td_.getTime()-j*864e5);dailyData[fmtDShort(d)]=0}
    var cut30=new Date(td_.getTime()-30*864e5);
    S.done.filter(function(d){return d.completed&&d.completed>=cut30}).forEach(function(d){var k=fmtDShort(d.completed);if(dailyData.hasOwnProperty(k))dailyData[k]++});
    mkLine('sched-daily-chart',dailyData,'Tasks');
    /* Category donut */
    var catData={};S.done.forEach(function(d){var c=d.category||'Uncategorised';catData[c]=(catData[c]||0)+1});
    if(Object.keys(catData).length)mkDonut('sched-cat-chart',catData);
    /* Client time bar */
    var clientData={};S.done.filter(function(d){return d.completed&&d.completed>=cut30}).forEach(function(d){
      var cl=d.client||'Unassigned';clientData[cl]=(clientData[cl]||0)+(d.duration||0)});
    if(Object.keys(clientData).length)mkHBar('sched-client-chart',clientData);
  },200)}

/* ── Sub-view: Daily Summary (inline, beautiful cards) ── */
function rScheduleDaily(ctx){
  var h='';
  var effDay=ctx.effDay,effDayEnd=ctx.effDayEnd;
  var todayDone=ctx.todayDone,todayMins=ctx.todayMins;
  var inProg=ctx.inProg;

  /* Carrying over: tasks with due <= today not completed */
  var carryOver=S.tasks.filter(function(t){return t.due&&t.due<=effDay&&!ctx.inProgIds[t.id]});
  /* Needs chasing */
  var chasing=S.tasks.filter(function(t){return t.flag||t.status==='Need Client Input'});

  h+='<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="btn" onclick="TF.openSummary()" style="font-size:11px;padding:5px 12px">'+icon('mail',11)+' Copy Summary</button></div>';

  /* KPI strip */
  h+='<div class="dash-mets">';
  h+=dashMet('Done Today',todayDone.length,'var(--green)');
  h+=dashMet('Time Tracked',fmtM(todayMins),'var(--pink)');
  h+=dashMet('Carrying Over',carryOver.length,carryOver.length?'var(--amber)':'var(--green)');
  h+=dashMet('Needs Chasing',chasing.length,chasing.length?'var(--red)':'var(--green)');
  h+='</div>';

  /* Done today */
  if(todayDone.length){
    h+='<div class="td-panel" style="border-color:rgba(16,185,129,0.15);margin-bottom:14px"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--green)">'+icon('check',12)+' Completed Today</span><span class="td-panel-c">'+todayDone.length+'</span></div>';
    todayDone.forEach(function(d){
      h+='<div class="mini-row" onclick="TF.openDoneDetail(\''+escAttr(d.id)+'\')">';
      h+='<span class="bg '+impCls(d.importance||'When Time Allows')+'" style="font-size:8px;padding:1px 5px">'+(d.importance||'W').charAt(0)+'</span>';
      h+='<span class="mini-row-name">'+esc(d.item)+'</span>';
      if(d.duration)h+='<span class="mini-row-meta" style="color:var(--green)">'+fmtM(d.duration)+'</span>';
      h+='</div>'});
    h+='</div>'}

  /* In Progress */
  if(inProg.length){
    h+='<div class="td-panel" style="border-color:rgba(16,185,129,0.15);margin-bottom:14px"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--blue)">'+icon('play',12)+' In Progress</span><span class="td-panel-c">'+inProg.length+'</span></div>';
    inProg.forEach(function(t){h+=miniRow(t,effDay)});
    h+='</div>'}

  /* Carrying Over */
  if(carryOver.length){
    h+='<div class="td-panel" style="border-color:rgba(255,176,48,0.15);margin-bottom:14px"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--amber)">'+icon('alert',12)+' Carrying Over</span><span class="td-panel-c">'+carryOver.length+'</span></div>';
    carryOver.forEach(function(t){
      var diff=dayDiff(effDay,t.due);
      h+='<div class="mini-row" onclick="TF.openDetail(\''+escAttr(t.id)+'\')">';
      h+='<span class="mini-row-name">'+esc(t.item)+'</span>';
      if(diff<0)h+='<span class="mini-row-meta" style="color:var(--red)">'+Math.abs(diff)+'d overdue</span>';
      h+='</div>'});
    h+='</div>'}

  /* Needs Chasing */
  if(chasing.length){
    h+='<div class="td-panel" style="border-color:rgba(239,68,68,0.15);margin-bottom:14px"><div class="td-panel-h"><span class="td-panel-t" style="color:var(--red)">'+icon('flag',12)+' Needs Chasing</span><span class="td-panel-c">'+chasing.length+'</span></div>';
    chasing.forEach(function(t){
      h+='<div class="mini-row" onclick="TF.openDetail(\''+escAttr(t.id)+'\')">';
      h+='<span class="bg bg-fl" style="font-size:8px">'+icon('flag',9)+'</span>';
      h+='<span class="mini-row-name">'+esc(t.item)+'</span>';
      if(t.client)h+='<span class="bg bg-cl" style="font-size:9px;padding:1px 6px">'+esc(t.client)+'</span>';
      h+='</div>'});
    h+='</div>'}

  if(!todayDone.length&&!inProg.length&&!carryOver.length&&!chasing.length){
    h+='<div class="no-data" style="padding:36px">Nothing to report yet for today.</div>'}
  return h}

/* ── Sub-view: Weekly Summary ── */
function rScheduleWeekly(ctx){
  var h='';
  var td_=today();
  /* This week: Mon to Sun */
  var thisWeekStart=new Date(td_);thisWeekStart.setDate(thisWeekStart.getDate()-((thisWeekStart.getDay()+6)%7));
  thisWeekStart.setHours(0,0,0,0);
  var thisWeekEnd=new Date(thisWeekStart.getTime()+7*864e5);
  /* Last week */
  var lastWeekStart=new Date(thisWeekStart.getTime()-7*864e5);
  var lastWeekEnd=new Date(thisWeekStart);

  var thisWeekDone=S.done.filter(function(d){return d.completed&&d.completed>=thisWeekStart&&d.completed<thisWeekEnd});
  var lastWeekDone=S.done.filter(function(d){return d.completed&&d.completed>=lastWeekStart&&d.completed<lastWeekEnd});

  var twMins=0;thisWeekDone.forEach(function(d){twMins+=d.duration||0});
  var lwMins=0;lastWeekDone.forEach(function(d){lwMins+=d.duration||0});
  var twAvgDur=thisWeekDone.length>0?Math.round(twMins/thisWeekDone.length):0;
  var lwAvgDur=lastWeekDone.length>0?Math.round(lwMins/lastWeekDone.length):0;

  function pctChange(curr,prev){if(prev===0)return curr>0?'+100%':'0%';var ch=Math.round((curr-prev)/prev*100);return(ch>=0?'+':'')+ch+'%'}
  function chClr(curr,prev){return curr>=prev?'var(--green)':'var(--red)'}

  /* Comparison cards */
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px">';
  /* This week */
  h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:18px">';
  h+='<div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:14px">This Week</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
  h+='<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--green);font-family:var(--fd)">'+thisWeekDone.length+'</div><div style="font-size:10px;color:var(--t4)">Tasks</div></div>';
  h+='<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--pink);font-family:var(--fd)">'+fmtM(twMins)+'</div><div style="font-size:10px;color:var(--t4)">Time</div></div>';
  h+='<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--blue);font-family:var(--fd)">'+fmtM(twAvgDur)+'</div><div style="font-size:10px;color:var(--t4)">Avg Duration</div></div>';
  h+='</div></div>';
  /* Last week */
  h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:18px">';
  h+='<div style="font-size:13px;font-weight:700;color:var(--t2);margin-bottom:14px">Last Week</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">';
  h+='<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--t2);font-family:var(--fd)">'+lastWeekDone.length+'</div><div style="font-size:10px;color:var(--t4)">Tasks</div></div>';
  h+='<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--t2);font-family:var(--fd)">'+fmtM(lwMins)+'</div><div style="font-size:10px;color:var(--t4)">Time</div></div>';
  h+='<div style="text-align:center"><div style="font-size:20px;font-weight:700;color:var(--t2);font-family:var(--fd)">'+fmtM(lwAvgDur)+'</div><div style="font-size:10px;color:var(--t4)">Avg Duration</div></div>';
  h+='</div></div>';
  h+='</div>';

  /* Change indicators */
  h+='<div class="dash-mets" style="margin-bottom:20px">';
  h+=dashMet('Tasks '+pctChange(thisWeekDone.length,lastWeekDone.length),thisWeekDone.length+' vs '+lastWeekDone.length,chClr(thisWeekDone.length,lastWeekDone.length));
  h+=dashMet('Time '+pctChange(twMins,lwMins),fmtM(twMins)+' vs '+fmtM(lwMins),chClr(twMins,lwMins));
  h+=dashMet('Avg Dur '+pctChange(twAvgDur,lwAvgDur),fmtM(twAvgDur)+' vs '+fmtM(lwAvgDur),chClr(twAvgDur,lwAvgDur));
  h+='</div>';

  /* Streak */
  var streak=0,checkDate=new Date(td_);
  for(var si=0;si<365;si++){
    var ds=new Date(checkDate.getTime()-si*864e5);
    var de=new Date(ds.getTime()+864e5);
    var hasDone=S.done.some(function(d){return d.completed&&d.completed>=ds&&d.completed<de});
    if(hasDone)streak++;else if(si>0)break}
  h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;gap:12px">';
  h+='<span style="font-size:20px">🔥</span><span style="font-size:14px;font-weight:700;color:var(--amber)">'+streak+' day streak</span>';
  h+='<span style="font-size:12px;color:var(--t3)">consecutive days with completed tasks</span></div>';

  /* Charts */
  h+='<div class="dash-charts">';
  h+='<div class="chart-card"><h3>Daily Breakdown (This Week vs Last)</h3><div class="chart-wrap"><canvas id="weekly-daily-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Category Comparison</h3><div class="chart-wrap"><canvas id="weekly-cat-chart"></canvas></div></div>';
  h+='</div>';
  return h}

function initScheduleWeeklyCharts(){
  setTimeout(function(){
    var td_=today();
    var thisWeekStart=new Date(td_);thisWeekStart.setDate(thisWeekStart.getDate()-((thisWeekStart.getDay()+6)%7));
    thisWeekStart.setHours(0,0,0,0);
    var lastWeekStart=new Date(thisWeekStart.getTime()-7*864e5);
    /* Daily breakdown: grouped */
    var days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var thisWeekData={},lastWeekData={};
    days.forEach(function(d){thisWeekData[d]=0;lastWeekData[d]=0});
    S.done.forEach(function(d){
      if(!d.completed)return;
      if(d.completed>=thisWeekStart&&d.completed<new Date(thisWeekStart.getTime()+7*864e5)){
        var di=(d.completed.getDay()+6)%7;thisWeekData[days[di]]++}
      else if(d.completed>=lastWeekStart&&d.completed<thisWeekStart){
        var di2=(d.completed.getDay()+6)%7;lastWeekData[days[di2]]++}});
    /* Use mkLine or manual Chart.js for grouped bars */
    var el=document.getElementById('weekly-daily-chart');
    if(el){
      var ctx2=el.getContext('2d');
      if(charts['weekly-daily-chart'])charts['weekly-daily-chart'].destroy();
      charts['weekly-daily-chart']=new Chart(ctx2,{type:'bar',data:{labels:days,datasets:[
        {label:'This Week',data:days.map(function(d){return thisWeekData[d]}),backgroundColor:'rgba(255,0,153,0.4)',borderColor:'var(--pink)',borderWidth:1},
        {label:'Last Week',data:days.map(function(d){return lastWeekData[d]}),backgroundColor:'rgba(255,255,255,0.1)',borderColor:'rgba(255,255,255,0.3)',borderWidth:1}
      ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#999',font:{size:10}}}},scales:{x:{ticks:{color:'#666',font:{size:10}},grid:{display:false}},y:{ticks:{color:'#666',font:{size:10}},grid:{color:'rgba(255,255,255,0.04)'}}}}})}
    /* Category comparison donut */
    var catData={};S.done.filter(function(d){return d.completed&&d.completed>=thisWeekStart}).forEach(function(d){
      var c=d.category||'Uncategorised';catData[c]=(catData[c]||0)+1});
    if(Object.keys(catData).length)mkDonut('weekly-cat-chart',catData);
  },200)}

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
  if(deepM)balD['Deep Work']=deepM;
  if(quickM)balD['Quick Tasks']=quickM;
  var avail=8*60,used=doneMins+deepM+quickM;
  if(used<avail)balD['Available']=avail-used;
  mkDonut('td-bal',balD)}

async function quickAdd(){var input=gel('qa-item');if(!input)return;var item=input.value.trim();if(!item){toast('Enter a task name','warn');return}
  var now=new Date();now.setHours(17,0,0,0);
  var data={item:item,due:now.toISOString(),importance:qaImp,category:'',client:'',endClient:'',type:'Business',est:0,notes:'',status:'Planned',flag:false,campaign:'',meetingKey:'',isInbox:true};
  var result=await dbAddTask(data);
  if(result){S.tasks.push({id:result.id,item:item,due:now,importance:qaImp,est:0,category:'',client:'',endClient:'',type:'Business',duration:0,notes:'',status:'Planned',flag:false,campaign:'',meetingKey:'',isInbox:true})}
  input.value='';toast('Added: '+item,'ok');render()}

/* ═══════════ TASKS (UNIFIED: Open / Completed / All) ═══════════ */
function rTasks(){
  var td=today(),mode=S.subView||'open';

  /* ── Header ── */
  var rvCount=S.review.length;
  var ibxCount=S.tasks.filter(function(t){return t.isInbox}).length;
  var h='<div class="pg-head"><h1>Tasks</h1>';
  if(isMobile()){
    h+='<div class="task-mode-toggle">';
    h+='<button class="tm-btn'+(mode==='inbox'?' on':'')+'" onclick="TF.subNav(\'inbox\')">Inbox'+(ibxCount?'<span class="nav-badge" style="margin-left:6px">'+ibxCount+'</span>':'')+'</button>';
    h+='<button class="tm-btn'+(mode==='open'?' on':'')+'" onclick="TF.subNav(\'open\')">Open</button>';
    h+='<button class="tm-btn'+(mode==='done'?' on':'')+'" onclick="TF.subNav(\'done\')">Completed</button>';
    h+='<button class="tm-btn'+(mode==='review'?' on':'')+'" onclick="TF.subNav(\'review\')">Review'+(rvCount?'<span class="nav-badge" style="margin-left:6px">'+rvCount+'</span>':'')+'</button>';
    h+='</div>'}
  h+='</div>';

  /* ── Toolbar: filters + view controls ── */
  h+='<div class="task-toolbar">';
  if(mode==='open')h+=filterBar(S.tasks.filter(function(t){return !t.isInbox}));
  else if(mode==='inbox')h+=filterBar(S.tasks.filter(function(t){return t.isInbox}));
  else if(mode==='done')h+=filterBar(S.done,true);
  else h+=filterBar(S.tasks.concat(S.done),true);
  h+='<div class="task-controls">';
  if(mode!=='done'){
    h+='<div class="vt"><select class="vt-sel" onchange="TF.setGroup(this.value)" style="background:var(--bg3);border:1px solid var(--gborder);color:var(--t1);padding:6px 11px;border-radius:7px;font-size:12px;font-family:var(--f);cursor:pointer;letter-spacing:0.01em">';
    [{v:'importance',l:'By Importance'},{v:'estimate',l:'By Estimate'},{v:'client',l:'By Client'},{v:'due',l:'By Due Date'},{v:'status',l:'By Status'},{v:'manual',l:'⇅ Manual Order'}].forEach(function(o){
      h+='<option value="'+o.v+'"'+(S.groupBy===o.v?' selected':'')+'>'+o.l+'</option>'});
    h+='</select></div>';
    h+='<div class="vt"><button class="vt-btn'+(S.layout==='list'?' on':'')+'" onclick="TF.setLayout(\'list\')">'+icon('menu',12)+' List</button>';
    h+='<button class="vt-btn'+(S.layout==='grid'?' on':'')+'" onclick="TF.setLayout(\'grid\')">'+icon('grip',12)+' Grid</button></div>';
    if(mode==='open')h+='<button class="vt-btn'+(S.bulkMode?' on':'')+'" onclick="TF.toggleBulk()" title="Bulk select">'+icon('check',12)+' Bulk</button>';
  } else {
    h+='<div class="vt"><select class="vt-sel" onchange="TF.setDoneSort(this.value)" style="background:var(--bg3);border:1px solid var(--gborder);color:var(--t1);padding:6px 11px;border-radius:7px;font-size:12px;font-family:var(--f);cursor:pointer;letter-spacing:0.01em">';
    h+='<option value="date"'+(S.doneSort==='date'||!S.doneSort?' selected':'')+'>By Date</option>';
    h+='<option value="client"'+(S.doneSort==='client'?' selected':'')+'>By Client</option>';
    h+='<option value="duration"'+(S.doneSort==='duration'?' selected':'')+'>By Duration</option>';
    h+='</select></div>';
  }
  h+='</div></div>';

  /* ═══ INBOX MODE ═══ */
  if(mode==='inbox'){
    var inboxTasks=applyFilters(S.tasks.filter(function(t){return t.isInbox}));
    inboxTasks.forEach(function(t){t._score=taskScore(t)});
    inboxTasks.sort(function(a,b){return(b._score||0)-(a._score||0)});
    var ibxEst=0;inboxTasks.forEach(function(t){ibxEst+=t.est});

    h+='<div class="td-metrics">';
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--t1)">'+inboxTasks.length+'</div><div class="td-met-l">In Inbox</div></div>';
    h+='<div class="td-met"><div class="td-met-v" style="color:var(--amber)">'+fmtM(ibxEst)+'</div><div class="td-met-l">Estimated</div></div>';
    h+='</div>';

    if(!inboxTasks.length){
      h+='<div class="no-data" style="padding:64px 20px"><div style="font-size:16px;color:var(--t2);margin-bottom:10px;font-weight:500">Inbox is empty</div><div style="font-size:13px;color:var(--t4)">Tasks added via Quick Add will appear here for review.</div></div>';
    } else {
      h+='<div class="tk-'+S.layout+'">';
      inboxTasks.forEach(function(t,i){h+=taskCard(t,td,i)});
      h+='</div>';
    }
  }

  /* ═══ OPEN MODE ═══ */
  else if(mode==='open'){
    var filtered=applyFilters(S.tasks.filter(function(t){return !t.isInbox}));
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
          var key=d.client||'';
          if(!groups[key])groups[key]={label:key,items:[],mins:0};groups[key].items.push(d);groups[key].mins+=d.duration});
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
          if(d.client)h+='<span class="bg bg-cl">'+esc(d.client)+'</span>';
          if(d.endClient)h+='<span class="bg bg-ec">'+esc(d.endClient)+'</span>';
          if(d.campaign){var _cpd=S.campaigns.find(function(c){return c.id===d.campaign});if(_cpd)h+='<span class="bg" style="background:rgba(255,153,0,0.08);color:var(--amber)">'+icon('target',11)+' '+esc(_cpd.name)+'</span>'}
          if(d.opportunity){var _opd=S.opportunities.find(function(o){return o.id===d.opportunity});if(_opd)h+='<span class="bg bg-opp">'+icon('gem',11)+' '+esc(_opd.name)+'</span>'}
          if(d.category)h+='<span class="bg bg-ca">'+esc(d.category)+'</span>';
          h+='<span class="done-dur">'+fmtM(d.duration)+'</span>';
          h+='</div></div>'})});
      h+='</div>';
    }
  }

  /* ═══ REVIEW MODE ═══ */
  else if(mode==='review'){
    if(!S.review.length){
      h+='<div class="no-data" style="padding:64px 20px"><div style="font-size:16px;color:var(--t2);margin-bottom:10px;font-weight:500">No tasks to review</div><div style="font-size:13px;color:var(--t4)">Items from email and Read.ai will appear here automatically.</div></div>';
    } else {
      var items=reviewSorted();
      h+='<div class="rv-list">';
      items.forEach(function(r,i){
        h+='<div class="rv-card" onclick="TF.openReviewAt('+i+')">';
        h+='<div class="rv-card-left">';
        if(r.source==='Email'){h+='<span class="bg" style="background:rgba(59,130,246,0.1);color:#3b82f6;font-size:10px">'+icon('mail',12)+'</span>'}
        else if(r.source==='Read.ai'){h+='<span class="bg" style="background:rgba(16,185,129,0.1);color:#10b981;font-size:10px">'+icon('mic',12)+'</span>'}
        h+='<span class="bg '+impCls(r.importance)+'">'+esc(r.importance)+'</span>';
        h+='<span class="rv-name">'+esc(r.item)+'</span>';
        h+='</div>';
        h+='<div class="rv-card-right">';
        if(r.client)h+='<span class="bg bg-cl">'+esc(r.client)+'</span>';
        if(r.endClient)h+='<span class="bg bg-ec">'+esc(r.endClient)+'</span>';
        if(r.category)h+='<span class="bg bg-ca">'+esc(r.category)+'</span>';
        if(r.est)h+='<span class="bg-es">'+fmtM(r.est)+'</span>';
        if(r.due)h+='<span class="bg-du">'+fmtDShort(r.due)+'</span>';
        h+='</div></div>'});
      h+='</div>';
    }
  }
  return h}

function buildTaskGroups(tasks,td){
  var gb=S.groupBy,grps={},order=[];
  tasks.forEach(function(t){
    var key,label,color;
    if(gb==='importance'){
      key=t.importance||'Important';label=key;
      var map={Critical:{k:'critical',l:'Critical',c:'var(--red)'},Important:{k:'important',l:'Important',c:'var(--amber)'},
        'When Time Allows':{k:'wta',l:'When Time Allows',c:'var(--green)'}};
      var m=map[key]||{k:key,l:key,c:'var(--t3)'};key=m.k;label=m.l;color=m.c;
    } else if(gb==='estimate'){
      var est=t.est||0;
      if(est===0){key='no_est';label='No Estimate';color='var(--t4)'}
      else if(est<=10){key='quick';label='Quick (≤10m)';color='var(--green)'}
      else if(est<=30){key='medium';label='Medium (10-30m)';color='var(--amber)'}
      else{key='deep';label='Deep Work (30m+)';color='var(--purple50)'}
    } else if(gb==='client'){
      key=t.client||'';label=key||'No Client';color=key?'var(--pink50)':'var(--t3)';
    } else if(gb==='due'){
      if(!t.due){key='no_date';label='No Due Date';color='var(--t4)'}
      else{var diff=dayDiff(td,t.due);
        if(diff<0){key='overdue';label='Overdue';color='var(--red)'}
        else if(diff===0){key='today';label='Due Today';color='var(--amber)'}
        else if(diff<=7){key='this_week';label='This Week';color='var(--blue)'}
        else if(diff<=14){key='next_week';label='Next Week';color='var(--teal)'}
        else{key='later';label='Later';color='var(--t3)'}}
    } else if(gb==='status'){
      var st=t.status||'Planned';
      var ts=tmrGet(t.id);if(ts.started)st='In Progress';else if(ts.elapsed>0)st='Paused';
      if(t.flag||t.status==='Need Client Input')st='Need Client Input';
      var sMap={'In Progress':{k:'in_prog',l:'In Progress',c:'var(--green)'},Paused:{k:'paused',l:'Paused',c:'var(--amber)'},
        'Need Client Input':{k:'nci',l:'Needs Client Input',c:'var(--cyan)'},Planned:{k:'planned',l:'Planned',c:'var(--t3)'}};
      var sm=sMap[st]||{k:'planned',l:st,c:'var(--t3)'};key=sm.k;label=sm.l;color=sm.c;
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
  h+='<div class="mtg-prompt-icon">'+icon('mic',14)+'</div>';
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

/* Meetings and Templates views removed — meetings in Today, templates via command palette */

/* ═══════════ UTILITIES ═══════════ */
function metCard(l,v,c){return'<div class="met"><div class="met-l">'+l+'</div><div class="met-v" style="color:'+c+'">'+v+'</div></div>'}
function cmpDelta(cur,prev){if(prev===0&&cur===0)return{txt:'--',clr:'var(--t4)'};if(prev===0)return{txt:'+'+cur,clr:'var(--green)'};
  var d=cur-prev,p=Math.round(d/prev*100);return{txt:(d>=0?'+':'')+d+' ('+((d>=0?'+':'')+p)+'%)',clr:d>0?'var(--green)':d<0?'var(--red)':'var(--t3)'}}
function applyDropdownFilters(items){var f=S.filters;return items.filter(function(t){
  if(f.client&&t.client!==f.client)return false;if(f.endClient&&t.endClient!==f.endClient)return false;if(f.cat&&t.category!==f.cat)return false;
  if(f.imp&&t.importance!==f.imp)return false;if(f.type&&t.type!==f.type)return false;
  if(f.campaign){var matchCp=S.campaigns.find(function(c){return c.name===f.campaign});if(matchCp&&t.campaign!==matchCp.id)return false}
  if(f.search){var q=f.search.toLowerCase();if(t.item.toLowerCase().indexOf(q)===-1&&(t.notes||'').toLowerCase().indexOf(q)===-1&&(t.client||'').toLowerCase().indexOf(q)===-1&&(t.endClient||'').toLowerCase().indexOf(q)===-1)return false}
  return true})}

/* Analytics view removed — key metrics in Dashboard */
/* ═══════════ REVIEW ═══════════ */
var reviewIdx=0;
function reviewSorted(){return S.review.slice().sort(function(a,b){return(b.created?b.created.getTime():0)-(a.created?a.created.getTime():0)})}

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
    return'<div class="cal-connect" onclick="TF.showCalSetup()" style="margin-bottom:18px;padding:10px 16px;background:var(--bg1);border:1px solid var(--gborder);border-radius:var(--r);cursor:pointer;display:flex;align-items:center;gap:10px;transition:border-color .15s"><span style="font-size:16px">'+icon('calendar',11)+'</span><span style="font-size:12px;color:var(--t3)">Connect Google Calendar to see your free time</span><span style="margin-left:auto;font-size:10px;color:var(--t4);font-weight:600">SETUP ›</span></div>'}
  var td=today(),now=new Date();
  var wS=CONFIG.workStart||9,wE=CONFIG.workEnd||20;
  var schedDays=CONFIG.schedDays||[1,2,3,4];

  var h='<div class="cal-timeline-wrap">';
  h+='<div class="cal-timeline-head">';
  h+='<span class="cal-timeline-title">'+icon('calendar',11)+' Calendar + Planner</span>';

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
    var dayEvents=dayEventsAll;

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
      if(s.task.client)h+=' · '+esc(s.task.client);
      if(s.task.endClient)h+=' · EC: '+esc(s.task.endClient);
      if(s.task.campaign){var _cptt=S.campaigns.find(function(c){return c.id===s.task.campaign});if(_cptt)h+=' · '+icon('target',11)+' '+esc(_cptt.name)}
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
  var dayEvents=dayEventsAll;
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
      if(item.task.client)h+='<span class="cal-pr-client">'+esc(item.task.client)+'</span>';
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
      var bg=count===0?'rgba(255,255,255,0.04)':intensity>.6?'rgba(255,0,153,0.45)':intensity>.3?'rgba(255,0,153,0.25)':'rgba(255,0,153,0.1)';
      var title=cursor.getDate()+' '+MO[cursor.getMonth()]+': '+count+' task'+(count!==1?'s':'');
      h+='<div class="hm-cell" style="background:'+bg+'" title="'+title+'"></div>';
      cursor.setDate(cursor.getDate()+1)}
    h+='</div>'}
  h+='</div></div>';
  h+='<div class="hm-legend"><span style="color:var(--t4);font-size:10px">Less</span>';
  ['rgba(255,255,255,0.04)','rgba(255,0,153,0.1)','rgba(255,0,153,0.25)','rgba(255,0,153,0.45)'].forEach(function(c){h+='<div class="hm-cell" style="background:'+c+';width:12px;height:12px"></div>'});
  h+='<span style="color:var(--t4);font-size:10px">More</span></div>';
  el.innerHTML=h}

/* ═══════════ OPPORTUNITIES ═══════════ */
function getOpportunityStats(op){
  var openTasks=S.tasks.filter(function(t){return t.opportunity===op.id});
  var doneTasks=S.done.filter(function(d){return d.opportunity===op.id});
  var totalTime=openTasks.reduce(function(s,t){return s+(t.duration||0)},0)+doneTasks.reduce(function(s,d){return s+(d.duration||0)},0);
  var meetings=S.oppMeetings.filter(function(m){return m.opportunityId===op.id});
  /* Total value depends on type */
  var totalValue;
  if(op.type==='retain_live'){totalValue=op.strategyFee||0}
  else{totalValue=(op.strategyFee||0)+(op.setupFee||0)+((op.monthlyFee||0)*(op.expectedMonthlyDuration||12))}
  var weightedValue=totalValue*((op.probability||0)/100);
  var nextDue=openTasks.filter(function(t){return t.due}).sort(function(a,b){return a.due-b.due})[0];
  var revenueRealized=0;
  if(op.convertedCampaignId){
    var cpSt=getCampaignStats({id:op.convertedCampaignId,strategyFee:op.strategyFee||0,setupFee:op.setupFee||0,monthlyFee:op.monthlyFee||0});
    revenueRealized=cpSt.finRevenue}
  return{openTasks:openTasks,doneTasks:doneTasks,totalTime:totalTime,meetings:meetings,
    totalValue:totalValue,weightedValue:weightedValue,revenueRealized:revenueRealized,
    openCount:openTasks.length,doneCount:doneTasks.length,meetingCount:meetings.length,
    nextDue:nextDue?nextDue.due:null}}

/* Stage badge class — uses position within type's stages for color progression */
var _stageColors=['var(--t4)','var(--blue)','rgba(77,166,255,0.8)','var(--purple50)','rgba(168,85,247,0.8)','var(--amber)','rgba(255,176,48,0.8)','var(--pink)'];
function opStageClass(stage,type){
  if(stage==='Closed Won')return'op-st-won';
  if(stage==='Closed Lost')return'op-st-lost';
  var conf=oppTypeConf(type);
  var idx=conf.stages.indexOf(stage);
  if(idx<0)return'op-st-0';
  return'op-st-'+idx}

function opCardClass(stage,type){
  if(stage==='Closed Won')return'op-won';
  if(stage==='Closed Lost')return'op-lost';
  var conf=oppTypeConf(type);
  var idx=conf.stages.indexOf(stage);
  if(idx<0)return'op-st0-card';
  return'op-st'+idx+'-card'}

function probClass(p){return p>=70?'op-prob-high':p>=40?'op-prob-mid':'op-prob-low'}

function opTypeBadgeCls(type){
  if(type==='retain_live')return'op-type-rl';
  if(type==='fc_direct')return'op-type-fcd';
  return'op-type-fcp'}

function rMobOpportunities(){return rOpportunities()}

function rOpportunities(){return '<div class="pg-head"><h1>'+icon('gem',18)+' Sales</h1><button class="btn btn-p" onclick="TF.openAddOpportunity()" style="font-size:12px;padding:8px 18px">+ Add Opportunity</button></div>'+rOpportunitiesBody()}

function rOpportunitiesBody(){
  var sub=S.subView||'analytics';

  /* Mobile sub-nav */
  if(isMobile()){
    var h='<div class="task-mode-toggle" style="margin-bottom:16px">';
    [['analytics','Analytics'],['retain_live','Retain Live'],['fc_partnership','F&C Partnerships'],['fc_direct','F&C Direct'],['profitability','Profitability']].forEach(function(s){
      h+='<button class="tm-btn'+(sub===s[0]?' on':'')+'" onclick="TF.subNav(\''+s[0]+'\')">'+s[1]+'</button>'});
    h+='</div>';
  }else{var h=''}

  if(sub==='analytics')return h+rOppAnalytics();
  if(sub==='profitability')return h+rOppProfitabilityDashboard();
  if(OPP_TYPES[sub])return h+rOppTypeSection(sub);
  return h+rOppAnalytics()}

function opCardCompact(op,td_,idx,compact){
  var st=getOpportunityStats(op);
  var conf=oppTypeConf(op.type);
  var stageIdx=conf.stages.indexOf(op.stage);
  var borderColor=oppIsClosedStage(op.stage)?(op.stage==='Closed Won'?'var(--green)':'var(--red)'):(stageIdx>=0&&stageIdx<_stageColors.length?_stageColors[stageIdx]:'var(--t4)');
  var delay=typeof idx==='number'?Math.min(idx*0.03,0.45):0;
  var cls=compact?'op-card op-card-compact':'op-card';
  var h='<div class="'+cls+'" onclick="TF.openOpportunityDetail(\''+escAttr(op.id)+'\')" style="animation-delay:'+delay+'s">';
  h+='<div style="position:absolute;top:0;left:0;bottom:0;width:3px;border-radius:3px 0 0 3px;background:'+borderColor+'"></div>';
  if(!compact){
    h+='<span class="op-card-meta" style="margin-bottom:2px"><span class="bg '+opTypeBadgeCls(op.type)+'" style="font-size:8px;padding:1px 6px">'+conf.short+'</span></span>'}
  /* Name: in compact mode strip client prefix (e.g. "Client — EndClient" → "EndClient") */
  var displayName=op.name;
  if(compact&&op.client&&displayName.indexOf(op.client+' \u2014 ')===0){displayName=displayName.substring(op.client.length+3)}
  if(compact){
    /* Single-row layout: name on left, client pill + probability on right */
    h+='<span class="op-card-row">';
    h+='<span class="op-card-name">'+esc(displayName)+'</span>';
    h+='<span class="op-card-row-r">';
    if(op.client)h+='<span class="bg bg-cl" style="font-size:8px;padding:1px 6px">'+esc(op.client)+'</span>';
    h+='<span class="op-prob '+probClass(op.probability)+'" style="font-size:9px">'+op.probability+'%</span>';
    h+='</span></span>';
  }else{
    h+='<span class="op-card-name">'+esc(displayName)+'</span>';
    h+='<span class="op-card-meta">';
    if(op.client)h+='<span class="bg bg-cl" style="font-size:9px;padding:2px 8px">'+esc(op.client)+'</span>';
    if(op.endClient)h+='<span class="bg bg-ec" style="font-size:9px;padding:2px 8px">'+esc(op.endClient)+'</span>';
    h+='</span>';
    h+='<span class="op-card-meta">';
    if(st.totalValue)h+='<span class="op-card-val">'+fmtUSD(st.totalValue)+'</span>';
    h+='<span class="op-prob '+probClass(op.probability)+'">'+op.probability+'%</span>';
    if(st.openCount)h+='<span class="op-card-stat" style="color:var(--blue)">'+st.openCount+'</span>';
    if(op.expectedClose)h+='<span class="op-card-stat">'+icon('calendar',11)+' '+fmtDShort(op.expectedClose)+'</span>';
    h+='</span>';
  }
  h+='</div>';
  return h}

/* Sort opps within columns */
function sortOpps(arr){
  arr.sort(function(a,b){
    if(b.probability!==a.probability)return b.probability-a.probability;
    var aClose=a.expectedClose?a.expectedClose.getTime():Infinity;
    var bClose=b.expectedClose?b.expectedClose.getTime():Infinity;
    if(aClose!==bClose)return aClose-bClose;
    return(b.created?b.created.getTime():0)-(a.created?a.created.getTime():0)});
  return arr}

/* Render a single type's pipeline columns */
function renderTypePipeline(typeKey,opps,td_){
  var conf=oppTypeConf(typeKey);
  var stages=conf.stages;
  var grouped={};stages.forEach(function(s){grouped[s]=[]});
  var awSt=conf.awaitingStage||'';
  opps.forEach(function(op){
    if(oppIsClosedStage(op.stage))return;
    if(awSt&&op.stage===awSt)return;
    if(grouped[op.stage])grouped[op.stage].push(op);
    else grouped[stages[0]].push(op)});
  stages.forEach(function(s){sortOpps(grouped[s])});
  var colCount=stages.length;
  var h='<div class="op-pipeline" style="grid-template-columns:repeat('+colCount+',1fr)">';
  stages.forEach(function(s){
    var items=grouped[s]||[];
    h+='<div class="op-column">';
    h+='<div class="op-column-head">'+esc(s)+' <span class="op-column-count">'+items.length+'</span></div>';
    if(!items.length){h+='<div style="text-align:center;padding:30px 10px;color:var(--t4);font-size:12px">No opportunities</div>'}
    items.forEach(function(op,idx){h+=opCardCompact(op,td_,idx,true)});
    h+='</div>'});
  h+='</div>';
  return h}

/* ── Opportunity metrics helper ── */
function oppTypeMetrics(typeKey,partnerFilter){
  var opps=S.opportunities.filter(function(o){return o.type===typeKey});
  if(partnerFilter)opps=opps.filter(function(o){return o.client===partnerFilter});
  var conf=oppTypeConf(typeKey);var awSt=conf.awaitingStage||'';
  var active=opps.filter(function(o){return!oppIsClosedStage(o.stage)});
  var awaiting=awSt?opps.filter(function(o){return o.stage===awSt}):[];
  var pipelineActive=active.filter(function(o){return!awSt||o.stage!==awSt});
  var won=opps.filter(function(o){return o.stage==='Closed Won'});
  var lost=opps.filter(function(o){return o.stage==='Closed Lost'});
  var total=0,weighted=0,tasks=0,totalTime=0;
  active.forEach(function(op){var st=getOpportunityStats(op);total+=st.totalValue;weighted+=st.weightedValue;tasks+=st.openCount;totalTime+=st.totalTime});
  var winRate=won.length+lost.length>0?Math.round(won.length/(won.length+lost.length)*100):0;
  return{opps:opps,active:active,pipelineActive:pipelineActive,awaiting:awaiting,won:won,lost:lost,total:total,weighted:weighted,tasks:tasks,totalTime:totalTime,winRate:winRate}}

/* ═══════════ ANALYTICS OVERVIEW ═══════════ */
function rOppAnalytics(){
  var allOpps=S.opportunities.slice();
  var active=allOpps.filter(function(o){return!oppIsClosedStage(o.stage)});
  var won=allOpps.filter(function(o){return o.stage==='Closed Won'});
  var lost=allOpps.filter(function(o){return o.stage==='Closed Lost'});
  var totalPipeline=0,weightedPipeline=0,openTaskCount=0,totalTimeAll=0;
  active.forEach(function(op){var st=getOpportunityStats(op);totalPipeline+=st.totalValue;weightedPipeline+=st.weightedValue;openTaskCount+=st.openCount;totalTimeAll+=st.totalTime});
  var winRate=won.length+lost.length>0?Math.round(won.length/(won.length+lost.length)*100):0;
  var avgDeal=active.length>0?Math.round(totalPipeline/active.length):0;

  /* KPIs */
  var h='<div class="op-dash">';
  h+='<div class="op-dash-met" style="animation-delay:0s"><div class="op-dash-met-v" style="color:var(--green)">'+fmtUSD(totalPipeline)+'</div><div class="op-dash-met-l">Pipeline Value</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.05s"><div class="op-dash-met-v" style="color:var(--amber)">'+fmtUSD(weightedPipeline)+'</div><div class="op-dash-met-l">Weighted Pipeline</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.1s"><div class="op-dash-met-v" style="color:var(--t1)">'+active.length+'</div><div class="op-dash-met-l">Active Opps</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.15s"><div class="op-dash-met-v" style="color:'+(winRate>=50?'var(--green)':'var(--amber)')+'">'+winRate+'%</div><div class="op-dash-met-l">Win Rate</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.2s"><div class="op-dash-met-v" style="color:var(--blue)">'+openTaskCount+'</div><div class="op-dash-met-l">Open Tasks</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.25s"><div class="op-dash-met-v" style="color:var(--purple50)">'+fmtUSD(avgDeal)+'</div><div class="op-dash-met-l">Avg Deal Size</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.3s"><div class="op-dash-met-v" style="color:var(--pink)">'+fmtM(totalTimeAll)+'</div><div class="op-dash-met-l">Total Time</div></div>';
  h+='</div>';

  /* Type summary cards */
  h+='<div class="op-type-cards">';
  ['retain_live','fc_partnership','fc_direct'].forEach(function(typeKey,i){
    var conf=oppTypeConf(typeKey);
    var m=oppTypeMetrics(typeKey);
    h+='<div class="op-type-summary" onclick="TF.subNav(\''+typeKey+'\')" style="animation-delay:'+(i*0.05)+'s;border-top:3px solid '+conf.color+'">';
    h+='<div class="op-type-summary-head"><span style="font-size:14px;font-weight:700;color:'+conf.color+'">'+conf.label+'</span>';
    h+='<span style="font-size:22px;font-weight:800;color:var(--t1);font-family:var(--fd)">'+m.active.length+'</span></div>';
    h+='<div class="op-type-summary-row"><span>Pipeline</span><span style="color:var(--green);font-weight:700">'+fmtUSD(m.total)+'</span></div>';
    h+='<div class="op-type-summary-row"><span>Weighted</span><span style="color:var(--amber);font-weight:700">'+fmtUSD(m.weighted)+'</span></div>';
    h+='<div class="op-type-summary-row"><span>Win Rate</span><span style="color:'+(m.winRate>=50?'var(--green)':'var(--t3)')+'">'+m.winRate+'%</span></div>';
    h+='<div class="op-type-summary-row"><span>Open Tasks</span><span>'+m.tasks+'</span></div>';
    h+='<div class="op-type-summary-row"><span>Time</span><span style="color:var(--pink)">'+fmtM(m.totalTime)+'</span></div>';
    h+='</div>'});
  h+='</div>';

  /* Charts */
  h+='<div class="op-chart-grid">';
  h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:18px"><div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:12px">Pipeline Value by Stage</div><div style="height:220px"><canvas id="opp-stage-chart"></canvas></div></div>';
  h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:18px"><div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:12px">Weighted Pipeline</div><div style="height:220px"><canvas id="opp-weighted-chart"></canvas></div></div>';
  h+='</div>';

  /* Recent opportunities table */
  var recent=allOpps.slice().sort(function(a,b){return(b.created?b.created.getTime():0)-(a.created?a.created.getTime():0)}).slice(0,15);
  if(recent.length){
    h+='<div style="margin-top:20px"><span class="ed-lbl" style="margin-bottom:10px;display:block">Recent Opportunities</span>';
    h+='<div class="tb-wrap"><table class="tb"><thead><tr>';
    h+='<th>Name</th><th>Type</th><th>Client</th><th>Stage</th><th class="r">Value</th><th class="c">Prob</th><th>Created</th>';
    h+='</tr></thead><tbody>';
    recent.forEach(function(op){
      var st=getOpportunityStats(op);var conf=oppTypeConf(op.type);
      h+='<tr class="op-list-row" onclick="TF.openOpportunityDetail(\''+escAttr(op.id)+'\')">';
      h+='<td><strong>'+esc(op.name)+'</strong></td>';
      h+='<td><span class="bg '+opTypeBadgeCls(op.type)+'" style="font-size:9px;padding:2px 8px">'+conf.short+'</span></td>';
      h+='<td>'+esc(op.client)+'</td>';
      h+='<td><span class="bg '+opStageClass(op.stage,op.type)+'">'+esc(op.stage)+'</span></td>';
      h+='<td class="nm" style="color:var(--green)">'+fmtUSD(st.totalValue)+'</td>';
      h+='<td class="tc"><span class="op-prob '+probClass(op.probability)+'">'+op.probability+'%</span></td>';
      h+='<td>'+fmtDShort(op.created)+'</td></tr>'});
    h+='</tbody></table></div></div>'}
  return h}

/* ═══════════ PER-TYPE PIPELINE SECTION ═══════════ */
function rOppTypeSection(typeKey){
  var td_=today();
  var conf=oppTypeConf(typeKey);
  var pf=typeKey==='fc_partnership'?S.opPartnerFilter:'';
  var m=oppTypeMetrics(typeKey,pf);
  var vm=S.opViewMode||'pipeline';

  /* Type-specific KPIs (5 cards) */
  var h='<div class="op-dash" style="grid-template-columns:repeat(5,1fr)">';
  h+='<div class="op-dash-met" style="animation-delay:0s;border-top:2px solid '+conf.color+'"><div class="op-dash-met-v" style="color:var(--green)">'+fmtUSD(m.total)+'</div><div class="op-dash-met-l">Pipeline Value</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.05s"><div class="op-dash-met-v" style="color:var(--amber)">'+fmtUSD(m.weighted)+'</div><div class="op-dash-met-l">Weighted Pipeline</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.1s"><div class="op-dash-met-v" style="color:var(--t1)">'+m.active.length+'</div><div class="op-dash-met-l">Active Opps</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.15s"><div class="op-dash-met-v" style="color:var(--pink)">'+fmtM(m.totalTime)+'</div><div class="op-dash-met-l">Time Spent</div></div>';
  h+='<div class="op-dash-met" style="animation-delay:0.2s"><div class="op-dash-met-v" style="color:'+(m.winRate>=50?'var(--green)':'var(--amber)')+'">'+m.winRate+'%</div><div class="op-dash-met-l">Win Rate</div></div>';
  h+='</div>';

  /* Toolbar: view toggle + partner filter + active/closed toggle */
  h+='<div class="op-toolbar">';
  h+='<div style="display:flex;align-items:center;gap:10px">';
  h+='<div class="op-view-toggle">';
  h+='<button class="op-vt-btn'+(vm==='pipeline'?' on':'')+'" onclick="TF.setOpViewMode(\'pipeline\')">'+icon('pipeline',12)+' Pipeline</button>';
  h+='<button class="op-vt-btn'+(vm==='list'?' on':'')+'" onclick="TF.setOpViewMode(\'list\')">'+icon('menu',12)+' List</button>';
  h+='</div>';
  /* Partner filter for F&C Partnership */
  if(typeKey==='fc_partnership'){
    var activeClients=S.clientRecords.filter(function(c){return c.status==='active'}).map(function(c){return c.name}).sort();
    h+='<select class="edf" style="font-size:11px;padding:5px 10px;min-width:160px" onchange="TF.setOpPartnerFilter(this.value)">';
    h+='<option value=""'+(pf?'':' selected')+'>All Production Companies</option>';
    activeClients.forEach(function(c){h+='<option value="'+esc(c)+'"'+(pf===c?' selected':'')+'>'+esc(c)+'</option>'});
    h+='</select>'}
  h+='</div>';
  h+='<div class="cp-status-filters">';
  h+='<span class="cp-status-toggle always">Active <span style="opacity:.6;margin-left:2px">'+m.active.length+'</span></span>';
  if(m.awaiting.length)h+='<span class="cp-status-toggle always" style="color:var(--amber)">Awaiting <span style="opacity:.6;margin-left:2px">'+m.awaiting.length+'</span></span>';
  h+='<span class="cp-status-toggle'+(S.opShowClosed?' active':'')+'" onclick="TF.toggleOpShowClosed()" style="cursor:pointer">Closed <span style="opacity:.6;margin-left:2px">'+(m.won.length+m.lost.length)+'</span></span>';
  h+='</div></div>';

  /* Pipeline, List, or Profitability view */
  if(vm==='list'){
    h+=rOppTypeList(typeKey,m);
  }else if(vm==='profitability'){
    h+=rOppProfitability(typeKey,m);
  }else{
    h+=renderTypePipeline(typeKey,m.pipelineActive,td_);
  }

  /* Awaiting section (collapsible) */
  if(m.awaiting.length){
    h+='<div style="margin-top:16px">';
    h+='<details><summary style="cursor:pointer;color:var(--amber);font-size:12px;font-weight:600">'+icon('clock',11)+' Awaiting ('+m.awaiting.length+')</summary>';
    h+='<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:10px">';
    m.awaiting.forEach(function(op,idx){h+='<div style="flex:1;min-width:260px;max-width:340px">'+opCardCompact(op,td_,idx,true)+'</div>'});
    h+='</div></details></div>'}

  /* Closed Won / Closed Lost */
  if(S.opShowClosed&&(m.won.length||m.lost.length)){
    h+='<div style="margin-top:16px">';
    if(m.won.length){
      h+='<details style="margin-bottom:8px"><summary style="cursor:pointer;color:var(--green);font-size:12px;font-weight:600">'+icon('check',11)+' Closed Won ('+m.won.length+')</summary>';
      h+='<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:10px">';
      m.won.forEach(function(op,idx){h+='<div style="flex:1;min-width:260px;max-width:340px">'+opCardCompact(op,td_,idx,true)+'</div>'});
      h+='</div></details>'}
    if(m.lost.length){
      h+='<details><summary style="cursor:pointer;color:var(--red);font-size:12px;font-weight:600">'+icon('x',11)+' Closed Lost ('+m.lost.length+')</summary>';
      h+='<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:10px">';
      m.lost.forEach(function(op,idx){h+='<div style="flex:1;min-width:260px;max-width:340px">'+opCardCompact(op,td_,idx,true)+'</div>'});
      h+='</div></details>'}
    h+='</div>'}

  /* Charts */
  h+='<div class="op-chart-grid" style="margin-top:20px">';
  h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:18px"><div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:12px">Pipeline Value by Stage</div><div style="height:200px"><canvas id="opp-stage-chart"></canvas></div></div>';
  h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:18px"><div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:12px">Weighted Pipeline</div><div style="height:200px"><canvas id="opp-weighted-chart"></canvas></div></div>';
  h+='</div>';
  return h}

/* ── Per-type list view ── */
function rOppTypeList(typeKey,m){
  var conf=oppTypeConf(typeKey);
  var stages=conf.stages;
  var stageOrder={};stages.forEach(function(s,i){stageOrder[s]=i});
  if(conf.awaitingStage)stageOrder[conf.awaitingStage]=stages.length;
  stageOrder['Closed Won']=stages.length+1;stageOrder['Closed Lost']=stages.length+2;

  var sorted=m.opps.slice();
  sorted.sort(function(a,b){
    var oa=stageOrder[a.stage]!==undefined?stageOrder[a.stage]:99;
    var ob=stageOrder[b.stage]!==undefined?stageOrder[b.stage]:99;
    if(oa!==ob)return oa-ob;return b.probability-a.probability});
  if(!S.opShowClosed)sorted=sorted.filter(function(o){return!oppIsClosedStage(o.stage)});

  var h='<div class="tb-wrap"><table class="tb"><thead><tr>';
  h+='<th style="width:20%">Name</th><th style="width:12%">Client</th><th style="width:12%">End Client</th>';
  h+='<th style="width:12%">Stage</th><th class="r" style="width:10%">Value</th>';
  h+='<th class="c" style="width:7%">Prob</th><th class="r" style="width:10%">Weighted</th>';
  h+='<th style="width:10%">Expected Close</th><th class="c" style="width:5%">Tasks</th>';
  h+='</tr></thead><tbody>';

  sorted.forEach(function(op){
    var st=getOpportunityStats(op);
    h+='<tr class="op-list-row" onclick="TF.openOpportunityDetail(\''+escAttr(op.id)+'\')">';
    h+='<td><strong>'+esc(op.name)+'</strong></td>';
    h+='<td>'+esc(op.client)+'</td>';
    h+='<td>'+esc(op.endClient)+'</td>';
    h+='<td><span class="bg '+opStageClass(op.stage,op.type)+'">'+esc(op.stage)+'</span></td>';
    h+='<td class="nm" style="color:var(--green)">'+fmtUSD(st.totalValue)+'</td>';
    h+='<td class="tc"><span class="op-prob '+probClass(op.probability)+'">'+op.probability+'%</span></td>';
    h+='<td class="nm" style="color:var(--amber)">'+fmtUSD(st.weightedValue)+'</td>';
    h+='<td>'+(op.expectedClose?fmtDShort(op.expectedClose):'\u2014')+'</td>';
    h+='<td class="tc">'+st.openCount+'</td>';
    h+='</tr>'});
  h+='</tbody></table></div>';
  return h}

/* ── Per-type profitability view ── */
function rOppProfitability(typeKey,m){
  var conf=oppTypeConf(typeKey);
  /* Gather stats across all opps (active + won) for this type */
  var allRelevant=m.opps.filter(function(o){return o.stage!=='Closed Lost'});
  var totalRevenue=0,totalTime=0,totalDone=0;
  allRelevant.forEach(function(op){var st=getOpportunityStats(op);totalRevenue+=st.revenueRealized;totalTime+=st.totalTime;totalDone+=st.doneCount});
  var avgTime=allRelevant.length>0?Math.round(totalTime/allRelevant.length):0;

  /* KPI cards */
  var h='<div class="cp-dash" style="margin-bottom:16px">';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:var(--green)">'+fmtUSD(totalRevenue)+'</div><div class="cp-dash-met-l">Total Revenue</div></div>';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:var(--pink)">'+fmtM(totalTime)+'</div><div class="cp-dash-met-l">Total Time</div></div>';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:var(--t1)">'+m.active.length+'</div><div class="cp-dash-met-l">Active Opps</div></div>';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:var(--purple50)">'+fmtM(avgTime)+'</div><div class="cp-dash-met-l">Avg Time/Opp</div></div>';
  h+='</div>';

  /* Charts */
  h+='<div class="dash-charts" style="margin-bottom:16px">';
  h+='<div class="chart-card"><h3>Revenue by Opportunity</h3><div class="chart-wrap"><canvas id="op-prof-rev-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Time by Opportunity</h3><div class="chart-wrap"><canvas id="op-prof-time-chart"></canvas></div></div>';
  h+='</div>';

  /* Per-opportunity breakdown table */
  h+='<div class="tb-wrap"><table class="tb"><thead><tr>';
  h+='<th>Opportunity</th><th>Client</th><th>Stage</th><th class="r">Revenue</th><th class="r">Time Spent</th><th class="r">Tasks Done</th><th class="r">Weighted Value</th>';
  h+='</tr></thead><tbody>';
  var sorted=allRelevant.slice().sort(function(a,b){return getOpportunityStats(b).revenueRealized-getOpportunityStats(a).revenueRealized});
  sorted.forEach(function(op){
    var st=getOpportunityStats(op);
    h+='<tr class="op-list-row" onclick="TF.openOpportunityDetail(\''+escAttr(op.id)+'\')">';
    h+='<td><strong>'+esc(op.name)+'</strong></td>';
    h+='<td>'+esc(op.client)+'</td>';
    h+='<td><span class="bg '+opStageClass(op.stage,op.type)+'">'+esc(op.stage)+'</span></td>';
    h+='<td class="r nm" style="color:var(--green)">'+fmtUSD(st.revenueRealized)+'</td>';
    h+='<td class="r nm" style="color:var(--pink)">'+fmtM(st.totalTime)+'</td>';
    h+='<td class="r">'+st.doneCount+'</td>';
    h+='<td class="r nm" style="color:var(--amber)">'+fmtUSD(st.weightedValue)+'</td>';
    h+='</tr>'});
  h+='</tbody></table></div>';
  return h}

function initOppProfitabilityCharts(typeKey){
  setTimeout(function(){
    var pf=typeKey==='fc_partnership'?S.opPartnerFilter:'';
    var opps=S.opportunities.filter(function(o){return o.type===typeKey&&o.stage!=='Closed Lost'});
    if(pf)opps=opps.filter(function(o){return o.client===pf});
    var revData={},timeData={};
    opps.forEach(function(op){
      var st=getOpportunityStats(op);
      if(st.revenueRealized>0)revData[op.name]=st.revenueRealized;
      if(st.totalTime>0)timeData[op.name]=st.totalTime});
    if(Object.keys(revData).length)mkHBarUSD('op-prof-rev-chart',revData);
    if(Object.keys(timeData).length)mkHBar('op-prof-time-chart',timeData);
  },200)}

/* ── Overall Profitability Dashboard (sub-section) ── */
function rOppProfitabilityDashboard(){
  var totalRevenue=0,totalTime=0,activeCount=0,totalDone=0;
  var typeData={};
  Object.keys(OPP_TYPES).forEach(function(tk){
    var conf=oppTypeConf(tk);
    var opps=S.opportunities.filter(function(o){return o.type===tk&&o.stage!=='Closed Lost'});
    var rev=0,tm=0,dn=0;
    opps.forEach(function(op){var st=getOpportunityStats(op);rev+=st.revenueRealized;tm+=st.totalTime;dn+=st.doneCount});
    var ac=opps.filter(function(o){return!oppIsClosedStage(o.stage)}).length;
    typeData[tk]={label:conf.label,color:conf.color,revenue:rev,time:tm,done:dn,active:ac,total:opps.length};
    totalRevenue+=rev;totalTime+=tm;totalDone+=dn;activeCount+=ac});

  var h='<div class="op-dash" style="grid-template-columns:repeat(4,1fr);margin-bottom:20px">';
  h+='<div class="op-dash-met" style="border-top:2px solid var(--green)"><div class="op-dash-met-v" style="color:var(--green)">'+fmtUSD(totalRevenue)+'</div><div class="op-dash-met-l">Total Revenue</div></div>';
  h+='<div class="op-dash-met"><div class="op-dash-met-v" style="color:var(--pink)">'+fmtM(totalTime)+'</div><div class="op-dash-met-l">Total Time</div></div>';
  h+='<div class="op-dash-met"><div class="op-dash-met-v" style="color:var(--t1)">'+activeCount+'</div><div class="op-dash-met-l">Active Opps</div></div>';
  h+='<div class="op-dash-met"><div class="op-dash-met-v" style="color:var(--purple50)">'+totalDone+'</div><div class="op-dash-met-l">Tasks Completed</div></div>';
  h+='</div>';

  /* Revenue & Time by type charts */
  h+='<div class="dash-charts" style="margin-bottom:20px">';
  h+='<div class="chart-card"><h3>Revenue by Type</h3><div class="chart-wrap"><canvas id="prof-rev-type-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Time by Type</h3><div class="chart-wrap"><canvas id="prof-time-type-chart"></canvas></div></div>';
  h+='</div>';

  /* Per-type sections */
  Object.keys(OPP_TYPES).forEach(function(tk){
    var d=typeData[tk];
    var avgTime=d.total>0?Math.round(d.time/d.total):0;
    h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:18px;margin-bottom:14px">';
    h+='<div style="font-size:13px;font-weight:700;color:var(--t1);margin-bottom:12px;display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:'+d.color+'"></span>'+d.label+'</div>';
    h+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">';
    h+='<div style="text-align:center"><div style="font-size:16px;font-weight:700;color:var(--green);font-family:var(--fd)">'+fmtUSD(d.revenue)+'</div><div style="font-size:10px;color:var(--t4)">Revenue</div></div>';
    h+='<div style="text-align:center"><div style="font-size:16px;font-weight:700;color:var(--pink);font-family:var(--fd)">'+fmtM(d.time)+'</div><div style="font-size:10px;color:var(--t4)">Time</div></div>';
    h+='<div style="text-align:center"><div style="font-size:16px;font-weight:700;color:var(--t1);font-family:var(--fd)">'+d.active+'</div><div style="font-size:10px;color:var(--t4)">Active</div></div>';
    h+='<div style="text-align:center"><div style="font-size:16px;font-weight:700;color:var(--purple50);font-family:var(--fd)">'+fmtM(avgTime)+'</div><div style="font-size:10px;color:var(--t4)">Avg Time/Opp</div></div>';
    h+='</div>';
    h+='<div class="dash-charts"><div class="chart-card" style="margin:0"><h3>Revenue by Opp</h3><div class="chart-wrap"><canvas id="prof-rev-'+tk+'-chart"></canvas></div></div>';
    h+='<div class="chart-card" style="margin:0"><h3>Time by Opp</h3><div class="chart-wrap"><canvas id="prof-time-'+tk+'-chart"></canvas></div></div></div>';
    h+='</div>'});
  return h}

function initOppProfitabilityDashboard(){
  setTimeout(function(){
    var revByType={},timeByType={};
    Object.keys(OPP_TYPES).forEach(function(tk){
      var conf=oppTypeConf(tk);
      var opps=S.opportunities.filter(function(o){return o.type===tk&&o.stage!=='Closed Lost'});
      var rev=0,tm=0;
      opps.forEach(function(op){var st=getOpportunityStats(op);rev+=st.revenueRealized;tm+=st.totalTime});
      if(rev>0)revByType[conf.label]=rev;
      if(tm>0)timeByType[conf.label]=tm;
      /* Per-type breakdown charts */
      var revData={},timeData={};
      opps.forEach(function(op){var st=getOpportunityStats(op);if(st.revenueRealized>0)revData[op.name]=st.revenueRealized;if(st.totalTime>0)timeData[op.name]=st.totalTime});
      if(Object.keys(revData).length)mkHBarUSD('prof-rev-'+tk+'-chart',revData);
      if(Object.keys(timeData).length)mkHBar('prof-time-'+tk+'-chart',timeData)});
    if(Object.keys(revByType).length)mkDonut('prof-rev-type-chart',revByType);
    if(Object.keys(timeByType).length)mkDonut('prof-time-type-chart',timeByType);
  },200)}

/* ── Charts ── */
function initOpportunityCharts(){setTimeout(function(){
  var sub=S.subView||'analytics';
  var opps=OPP_TYPES[sub]?S.opportunities.filter(function(o){return o.type===sub}):S.opportunities;
  if(sub==='fc_partnership'&&S.opPartnerFilter)opps=opps.filter(function(o){return o.client===S.opPartnerFilter});

  /* Pipeline value by stage */
  var stageVals={};
  opps.forEach(function(op){
    if(oppIsClosedStage(op.stage))return;
    var st=getOpportunityStats(op);
    if(!stageVals[op.stage])stageVals[op.stage]=0;
    stageVals[op.stage]+=st.totalValue});
  var filteredStage={};Object.keys(stageVals).forEach(function(k){if(stageVals[k]>0)filteredStage[k]=stageVals[k]});
  if(Object.keys(filteredStage).length){
    var el=gel('opp-stage-chart');if(el){killChart('opp-stage-chart');
      var labels=Object.keys(filteredStage),vals=labels.map(function(k){return filteredStage[k]});
      var cols=labels.map(function(_,i){return P[i%P.length]});
      charts['opp-stage-chart']=new Chart(el,{type:'bar',data:{labels:labels,datasets:[{data:vals,backgroundColor:cols,borderRadius:6,barThickness:24}]},
        options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},
          tooltip:{callbacks:{label:function(c){return fmtUSD(c.parsed.x)}}}},
          scales:{x:{grid:{color:'rgba(255,255,255,0.06)'},ticks:{color:'#52525b',font:{size:10},callback:function(v){return fmtUSD(v)}}},
            y:{grid:{display:false},ticks:{color:'#a1a1aa',font:{size:10}}}}}})}}

  /* Weighted pipeline donut */
  var weightedByStage={};
  opps.forEach(function(op){
    if(oppIsClosedStage(op.stage))return;
    var st=getOpportunityStats(op);
    if(!weightedByStage[op.stage])weightedByStage[op.stage]=0;
    weightedByStage[op.stage]+=st.weightedValue});
  var filteredWeighted={};Object.keys(weightedByStage).forEach(function(k){if(weightedByStage[k]>0)filteredWeighted[k]=weightedByStage[k]});
  if(Object.keys(filteredWeighted).length){
    var el2=gel('opp-weighted-chart');if(el2){killChart('opp-weighted-chart');
      var labels2=Object.keys(filteredWeighted),vals2=labels2.map(function(k){return filteredWeighted[k]});
      var cols2=labels2.map(function(_,i){return P[i%P.length]});
      charts['opp-weighted-chart']=new Chart(el2,{type:'doughnut',data:{labels:labels2,datasets:[{data:vals2,backgroundColor:cols2,borderWidth:0,hoverOffset:8}]},
        options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:'#a1a1aa',font:{family:'Inter',size:11},padding:10,boxWidth:11}},
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
  /* Finance payments linked to this campaign (direct + splits) */
  var finPayments=S.financePayments.filter(function(fp){return fp.campaignId===cp.id&&fp.status!=='excluded'});
  var finSplits=S.financePaymentSplits.filter(function(sp){return sp.campaignId===cp.id});
  var finRevenue=0;
  finPayments.forEach(function(fp){finRevenue+=fp.amount});
  finSplits.forEach(function(sp){finRevenue+=sp.amount});
  /* Estimated revenue: one-off fees + monthly × months active */
  var estOneOff=(cp.strategyFee||0)+(cp.setupFee||0);
  var estMonthly=(cp.monthlyFee||0);
  var monthsActive=0;
  if(cp.actualLaunch){var now=new Date();monthsActive=Math.max(1,Math.round((now-cp.actualLaunch)/(30.44*86400000)))}
  else if(cp.plannedLaunch){var now2=new Date();monthsActive=Math.max(1,Math.round((now2-cp.plannedLaunch)/(30.44*86400000)))}
  var estTotal=estOneOff+(estMonthly*Math.max(monthsActive,1));
  return{openTasks:openTasks,doneTasks:doneTasks,payments:payments,meetings:meetings,
    totalTime:totalTime,totalPaid:totalPaid,nextDue:nextDue?nextDue.due:null,
    openCount:openTasks.length,doneCount:doneTasks.length,
    finPayments:finPayments,finSplits:finSplits,finRevenue:finRevenue,
    estOneOff:estOneOff,estMonthly:estMonthly,estTotal:estTotal}}

function rCampaigns(){return '<div class="pg-head"><h1>'+icon('target',18)+' Campaigns</h1><button class="btn btn-p" onclick="TF.openAddCampaign()" style="font-size:12px;padding:8px 18px">+ Add Campaign</button></div>'+rCampaignsBody()}
function rCampaignsBody(){
  var td_=today();
  var sub=S.subView||'pipeline';
  var campaigns=S.campaigns.slice();

  /* Counts & metrics */
  var activeCount=campaigns.filter(function(c){return c.status==='Active'}).length;
  var setupCount=campaigns.filter(function(c){return c.status==='Setup'}).length;
  var pausedCount=campaigns.filter(function(c){return c.status==='Paused'}).length;
  var completedCount=campaigns.filter(function(c){return c.status==='Completed'}).length;
  var monthlyRecurring=0;
  campaigns.forEach(function(c){if(c.status==='Active')monthlyRecurring+=c.monthlyFee+c.monthlyAdSpend});
  var openTaskCount=0,totalTimeSpent=0,upcoming7d=0,overdueCount=0,totalFinRevenue=0;
  campaigns.forEach(function(cp){
    var st=getCampaignStats(cp);
    openTaskCount+=st.openCount;totalTimeSpent+=st.totalTime;totalFinRevenue+=st.finRevenue;
    st.openTasks.forEach(function(t){
      if(t.due){var diff=dayDiff(td_,t.due);if(diff<0)overdueCount++;else if(diff<=7)upcoming7d++}})});

  var h='';

  /* DASHBOARD METRICS */
  h+='<div class="cp-dash">';
  h+='<div class="cp-dash-met" style="animation-delay:0s"><div class="cp-dash-met-v" style="color:var(--green)">'+fmtUSD(totalFinRevenue)+'</div><div class="cp-dash-met-l">Actual Revenue</div></div>';
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
  if(isMobile()){
    h+='<div style="display:flex;gap:6px;align-items:center">';
    h+='<button class="btn'+(sub==='pipeline'?' btn-p':'')+'" onclick="TF.subNav(\'pipeline\')" style="font-size:11px;padding:5px 12px">Pipeline</button>';
    h+='<button class="btn'+(sub==='list'?' btn-p':'')+'" onclick="TF.subNav(\'list\')" style="font-size:11px;padding:5px 12px">List</button>';
    h+='<button class="btn'+(sub==='performance'?' btn-p':'')+'" onclick="TF.subNav(\'performance\')" style="font-size:11px;padding:5px 12px">Performance</button>';
    h+='</div>'}
  h+='</div>';

  /* Filter campaigns by toggled statuses */
  var filtered=campaigns;

  if(sub==='list') return h+rCampaignList(filtered,td_);
  if(sub==='performance') return h+rCampaignPerformance(filtered,td_);
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
  if(st.openCount)h+='<span class="cp-card-compact-stat" style="color:var(--blue)">'+st.openCount+'</span>';
  if(st.finRevenue)h+='<span class="cp-card-compact-stat" style="color:var(--green)">'+fmtUSD(st.finRevenue)+'</span>';
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
  h+='<th class="r" style="width:10%">Paid</th><th style="width:8%">Next Billing</th><th style="width:8%">Renewal</th>';
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
    h+='<td class="nm" style="color:var(--green)">'+fmtUSD(st.finRevenue)+'</td>';
    h+='<td>'+(cp.nextBillingDate?cp.nextBillingDate:'—');
    if(cp.billingFrequency&&cp.billingFrequency!=='monthly')h+=' <span style="font-size:9px;color:var(--blue);font-weight:600">'+cp.billingFrequency.charAt(0).toUpperCase()+'</span>';
    h+='</td>';
    h+='<td>'+(cp.renewalDate?fmtDShort(cp.renewalDate):'—')+'</td>';
    h+='</tr>'});
  h+='</tbody></table></div>';
  return h}

function rCampaignPerformance(campaigns,td_){
  var active=campaigns.filter(function(c){return c.status==='Active'||c.status==='Setup'});
  var totalRevenue=0,totalTime=0;
  active.forEach(function(cp){var st=getCampaignStats(cp);totalRevenue+=st.finRevenue;totalTime+=st.totalTime});

  var h='<div class="cp-dash">';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:var(--green)">'+fmtUSD(totalRevenue)+'</div><div class="cp-dash-met-l">Total Revenue</div></div>';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:var(--pink)">'+fmtM(totalTime)+'</div><div class="cp-dash-met-l">Total Time</div></div>';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:var(--t1)">'+active.length+'</div><div class="cp-dash-met-l">Active Campaigns</div></div>';
  h+='</div>';

  /* Revenue by campaign */
  h+='<div class="dash-charts">';
  h+='<div class="chart-card"><h3>Revenue by Campaign</h3><div class="chart-wrap"><canvas id="cp-revenue-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Time by Campaign</h3><div class="chart-wrap"><canvas id="cp-time-chart"></canvas></div></div>';
  h+='</div>';

  /* Per-campaign breakdown table */
  h+='<div class="tb-wrap" style="margin-top:16px"><table class="tb"><thead><tr>';
  h+='<th>Campaign</th><th>Partner</th><th>Status</th><th class="r">Revenue</th><th class="r">Monthly Fee</th><th class="r">Time Spent</th><th class="r">Tasks Done</th>';
  h+='</tr></thead><tbody>';
  var sorted=active.slice().sort(function(a,b){return getCampaignStats(b).finRevenue-getCampaignStats(a).finRevenue});
  sorted.forEach(function(cp){
    var st=getCampaignStats(cp);
    h+='<tr class="cp-list-row" onclick="TF.openCampaignDetail(\''+escAttr(cp.id)+'\')">';
    h+='<td><strong>'+esc(cp.name)+'</strong></td>';
    h+='<td>'+esc(cp.partner)+'</td>';
    h+='<td><span class="bg bg-'+(cp.status==='Active'?'im':'mt')+'">'+esc(cp.status)+'</span></td>';
    h+='<td class="r nm" style="color:var(--green)">'+fmtUSD(st.finRevenue)+'</td>';
    h+='<td class="r nm">'+fmtUSD(cp.monthlyFee||0)+'</td>';
    h+='<td class="r nm" style="color:var(--pink)">'+fmtM(st.totalTime)+'</td>';
    h+='<td class="r">'+st.doneCount+'</td>';
    h+='</tr>'});
  h+='</tbody></table></div>';
  return h}

function initCampaignPerformanceCharts(){
  setTimeout(function(){
    var active=S.campaigns.filter(function(c){return c.status==='Active'||c.status==='Setup'});
    var revData={},timeData={};
    active.forEach(function(cp){
      var st=getCampaignStats(cp);
      if(st.finRevenue>0)revData[cp.name]=st.finRevenue;
      if(st.totalTime>0)timeData[cp.name]=st.totalTime});
    if(Object.keys(revData).length)mkHBarUSD('cp-revenue-chart',revData);
    if(Object.keys(timeData).length)mkHBar('cp-time-chart',timeData);
  },200)}

/* ═══════════ MOBILE VIEWS ═══════════ */
var mobAddImp='Important';

function mobDefaultDue(){var d=new Date();d.setHours(17,0,0,0);return d.toISOString().slice(0,16)}

/* ── Quick Add ── */
function rMobAdd(){
  var iso=mobDefaultDue();
  var cliOpts=S.clients.map(function(c){return'<option>'+esc(c)+'</option>'}).join('');
  var h='<div class="mob-add-view">';
  h+='<h1 style="margin-bottom:20px">Quick Add</h1>';
  h+='<input type="hidden" id="f-inbox" value="true">';
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
  h+='<label class="flag-toggle"><input type="checkbox" id="f-flag"><span class="flag-box">'+icon('flag',11)+'</span><span class="flag-text">Needs Client Input</span></label>';
  h+='<label class="flag-toggle"><input type="checkbox" id="f-done" onchange="var c=this.checked;document.getElementById(\'f-done-dur-wrap\').style.display=c?\'flex\':\'none\';document.getElementById(\'f-btn-add\').textContent=c?\'Add \\u0026 Complete\':\'Add Task\'"><span class="flag-box">'+CK_XS+'</span><span class="flag-text">Already Completed</span></label>';
  h+='<div id="f-done-dur-wrap" style="display:none;align-items:center;gap:8px"><span class="mob-add-lbl" style="margin:0">Actual Mins</span><input type="number" id="f-done-dur" class="edf" style="width:80px;padding:8px 10px" placeholder="30" min="0"></div>';
  h+='</div>';
  h+='</div></details>';
  /* Action buttons */
  h+='<div class="mob-add-actions">';
  h+='<button class="mob-add-btn" id="f-btn-add" onclick="TF.mobAddTask()">Add Task</button>';
  h+='<button class="mob-add-btn-alt" onclick="TF.mobAddAndStart()">'+icon('play',11)+' Add &amp; Start</button>';
  h+='</div>';
  if(S.templates.length){h+='<select class="edf" id="f-tpl" onchange="TF.fillFromTemplate(this.value)" style="margin-top:12px"><option value="">Use Template...</option>';
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

function rProjects(){return '<div class="pg-head"><h1>'+icon('folder',18)+' Projects</h1><button class="btn btn-p" onclick="TF.openAddProject()">+ New Project</button></div>'+rProjectsBody()}
function rProjectsBody(){
  var sub=S.subView||'board';
  var activeProjects=S.projects.filter(function(p){return p.status!=='Archived'});
  var totalOpen=0,totalTime=0,totalOverdue=0,activeCount=0;
  activeProjects.forEach(function(p){var st=getProjectStats(p);totalOpen+=st.openCount;totalTime+=st.totalTime;totalOverdue+=st.overdue;if(p.status==='Active')activeCount++});

  var h='<div style="display:flex;justify-content:flex-end;gap:8px;margin-bottom:12px;align-items:center">';
  if(isMobile()){
    h+='<div class="task-mode-toggle">';
    h+='<button class="tm-btn'+(sub==='board'?' on':'')+'" onclick="TF.subNav(\'board\')">Board</button>';
    h+='<button class="tm-btn'+(sub==='list'?' on':'')+'" onclick="TF.subNav(\'list\')">List</button>';
    h+='<button class="tm-btn'+(sub==='timeline'?' on':'')+'" onclick="TF.subNav(\'timeline\')">Timeline</button>';
    h+='</div>'}
  h+='</div>';

  /* Metrics */
  h+='<div class="proj-mets">';
  h+='<div class="met"><div class="met-l">Active</div><div class="met-v" style="color:var(--green)">'+activeCount+'</div></div>';
  h+='<div class="met"><div class="met-l">Open Tasks</div><div class="met-v">'+totalOpen+'</div></div>';
  h+='<div class="met"><div class="met-l">Time Tracked</div><div class="met-v" style="color:var(--pink)">'+fmtM(totalTime)+'</div></div>';
  h+='<div class="met"><div class="met-l">Overdue</div><div class="met-v" style="color:'+(totalOverdue?'var(--red)':'var(--t4)')+'">'+totalOverdue+'</div></div>';
  h+='</div>';

  if(!activeProjects.length){h+='<div class="no-data">No projects yet. Create one to start organizing your big ideas into actionable phases.</div>';return h}

  if(sub==='list')h+=rProjectList(activeProjects);
  else if(sub==='timeline')h+=rProjectTimeline(activeProjects);
  else h+=rProjectBoard(activeProjects);

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
    if(p.targetDate)h+='<span class="proj-list-stat">'+icon('calendar',11)+' '+fmtDShort(p.targetDate)+'</span>';
    h+='</div>'});
  h+='</div>';return h}

function rProjectTimeline(projects){
  var td_=today();
  var h='<div style="display:flex;flex-direction:column;gap:20px">';
  projects.forEach(function(p){
    var st=getProjectStats(p);
    h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:16px;position:relative;cursor:pointer" onclick="TF.openProjectDetail(\''+escAttr(p.id)+'\')">';
    h+='<div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:'+p.color+';border-radius:var(--r) 0 0 var(--r)"></div>';
    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    h+='<span style="font-weight:600;color:var(--t1)">'+esc(p.name)+'</span>';
    h+='<span class="'+projStatusClass(p.status)+'">'+esc(p.status)+'</span>';
    h+='</div>';
    /* Phase timeline bar */
    if(st.phases.length){
      h+='<div style="display:flex;gap:2px;height:24px;border-radius:6px;overflow:hidden">';
      st.phases.forEach(function(ph){
        var ps=getPhaseStats(ph,st);
        var bg=ph.status==='Completed'?p.color:ph.status==='In Progress'?p.color+'88':'var(--bg3)';
        h+='<div style="flex:1;background:'+bg+';display:flex;align-items:center;justify-content:center;font-size:9px;color:var(--t1);font-weight:500;min-width:30px" title="'+esc(ph.name)+' — '+ps.progress+'%">'+esc(ph.name)+'</div>'});
      h+='</div>'}
    h+='<div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:var(--t3)">';
    h+='<span style="color:'+p.color+'">'+st.progress+'%</span>';
    h+='<span>'+st.openCount+' open</span>';
    h+='<span>'+st.doneCount+' done</span>';
    if(p.targetDate)h+='<span>'+icon('calendar',11)+' '+fmtDShort(p.targetDate)+'</span>';
    h+='</div>';
    h+='</div>'});
  h+='</div>';
  return h}

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
  if(p.targetDate)h+='<div style="font-size:10px;color:var(--t4);margin-top:6px">'+icon('calendar',11)+' '+fmtDShort(p.targetDate)+'</div>';
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
          scales:{x:{max:100,grid:{color:'rgba(255,255,255,0.06)'},ticks:{color:'#52525b',font:{size:10},callback:function(v){return v+'%'}}},y:{grid:{display:false},ticks:{color:'#a1a1aa',font:{size:10}}}}}})}}
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
  var nonInbox=S.tasks.filter(function(t){return !t.isInbox});
  nonInbox.forEach(function(t){t._score=taskScore(t)});
  var sorted=nonInbox.slice().sort(function(a,b){return(b._score||0)-(a._score||0)});
  var td=today();
  var h='<h1 style="margin-bottom:12px">Tasks</h1>';
  h+='<input class="edf" placeholder="Search tasks..." style="width:100%;margin-bottom:16px;padding:12px 14px;font-size:14px;box-sizing:border-box" oninput="TF.mobSearchTasks(this.value)" id="mob-task-search">';
  h+='<div class="mob-task-list" id="mob-task-list">';
  if(!sorted.length){h+='<div style="text-align:center;color:var(--t4);padding:40px 0;font-size:14px">No open tasks</div>'}
  else{sorted.forEach(function(t){h+=mobTaskRow(t,td)})}
  h+='</div>';return h}

function rMobReview(){
  var h='<h1 style="margin-bottom:12px">Review Queue</h1>';
  if(!S.review.length){
    h+='<div style="text-align:center;padding:60px 0"><div style="font-size:40px;margin-bottom:12px">✅</div>';
    h+='<div style="font-size:16px;color:var(--t2);font-weight:600;margin-bottom:4px">All caught up!</div>';
    h+='<div style="font-size:13px;color:var(--t4)">No tasks to review right now.</div></div>';
    return h}
  var sorted=reviewSorted();
  h+='<div style="margin-bottom:8px;font-size:13px;color:var(--t3)">'+sorted.length+' task'+(sorted.length>1?'s':'')+' to review</div>';
  sorted.forEach(function(r,i){
    h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:14px;margin-bottom:8px">';
    h+='<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
    h+='<span class="bg '+impCls(r.importance)+'" style="font-size:10px;padding:2px 8px">'+esc(r.importance)+'</span>';
    h+='<span style="font-size:13px;font-weight:600;color:var(--t1);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(r.item)+'</span>';
    h+='</div>';
    if(r.client)h+='<div style="font-size:11px;color:var(--t3);margin-bottom:8px">'+esc(r.client)+(r.endClient?' → '+esc(r.endClient):'')+'</div>';
    h+='<div style="display:flex;gap:6px">';
    h+='<button class="btn btn-p" onclick="TF.openReviewAt('+i+')" style="font-size:12px;padding:8px 16px;flex:1">Review</button>';
    h+='<button class="btn" onclick="TF.approveReview('+i+')" style="font-size:12px;padding:8px 16px;flex:1;color:var(--green)">'+CK_S+' Approve</button>';
    h+='</div></div>'});
  return h}

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

/* ═══════════ FINANCE VIEW ═══════════ */
var SRC_LABELS={stripe:'Stripe',stripe2:'Stripe 2',zoho:'Zoho',brex:'Brex',mercury:'Mercury',zoho_books:'Zoho Books',zoho_payments:'Zoho Pay',manual:'Manual'};
var TYPE_LABELS={payment:'Payment',invoice:'Invoice',bill:'Bill',expense:'Expense',transfer:'Transfer',payout:'Payout'};
function srcLabel(s){return SRC_LABELS[s]||s.charAt(0).toUpperCase()+s.slice(1)}
function srcLabelFull(p){
  if(p.source==='brex'){
    var meta=typeof p.metadata==='string'?JSON.parse(p.metadata||'{}'):p.metadata||{};
    return meta.brex_type==='card'?'Brex Card':'Brex Cash'}
  return srcLabel(p.source)}
function srcClsFull(p){
  if(p.source==='brex'){
    var meta=typeof p.metadata==='string'?JSON.parse(p.metadata||'{}'):p.metadata||{};
    return meta.brex_type==='card'?'fin-src fin-src-brex-card':'fin-src fin-src-brex'}
  return'fin-src fin-src-'+p.source}

function rFinance(){
  var sub=S.subView||'overview';
  var h='<div class="pg-head"><h1>'+icon('activity',18)+' Finance</h1>';
  h+='<div style="display:flex;gap:8px;align-items:center">';
  h+='<button class="btn" onclick="TF.openIntegrationsModal()" style="font-size:12px;padding:7px 14px;border-radius:10px">'+icon('link',12)+' Integrations</button>';
  if(sub==='payments')h+='<button class="btn btn-p" onclick="TF.openAddFinancePayment()" style="font-size:13px;padding:8px 16px;border-radius:10px">+ Add Payment</button>';
  if(sub==='recurring')h+='<button class="btn btn-p" onclick="TF.openAddScheduledItem()" style="font-size:13px;padding:8px 16px;border-radius:10px">+ Add Item</button>';
  if(sub==='team')h+='<button class="btn btn-p" onclick="TF.openAddTeamMember()" style="font-size:13px;padding:8px 16px;border-radius:10px">+ Add Member</button>';
  h+='</div></div>';
  if(isMobile()){h+=rFinanceMobileSubs(sub)}
  if(sub==='overview')h+=rFinanceOverview();
  else if(sub==='payments')h+=rFinancePayments();
  else if(sub==='invoices')h+=rFinanceInvoices();
  else if(sub==='upcoming')h+=rFinanceUpcoming();
  else if(sub==='recurring')h+=rFinanceRecurring();
  else if(sub==='forecast')h+=rFinanceForecast();
  else if(sub==='team')h+=rFinanceTeam();
  return h}

function rFinanceMobileSubs(sub){
  var h='<div class="task-mode-toggle" style="margin-bottom:16px">';
  var subs=[['overview','Overview'],['payments','Transactions'],['invoices','Invoices'],['upcoming','Upcoming'],['recurring','Recurring'],['forecast','Forecast'],['team','Team']];
  subs.forEach(function(s){h+='<button class="tm-btn'+(sub===s[0]?' on':'')+'" onclick="TF.subNav(\''+s[0]+'\')">'+s[1]+'</button>'});
  return h+'</div>'}

function rFinancePayments(){
  var fp=S.financePayments.filter(function(p){return p.status!=='excluded'});
  var unmatchedCount=0,splitCount=0,unreconciledCount=0;
  fp.forEach(function(p){
    if(p.status==='unmatched'&&p.direction==='inflow'&&p.type==='payment')unmatchedCount++;
    else if(p.status==='split')splitCount++;
    if(p.direction==='outflow'&&p.type!=='transfer'&&!p.scheduledItemId)unreconciledCount++});
  var filtered=finFilteredPayments();
  var bulkCount=finBulkCount();

  var h='';
  /* Filter bar */
  h+='<div class="fin-filters">';
  h+='<div class="fin-tabs">';
  var tabs=[['all','All'],['unmatched','Unmatched'],['expenses','Expenses'],['matched','Matched']];
  tabs.forEach(function(t){
    var cnt=t[0]==='unmatched'?unmatchedCount:t[0]==='split'?splitCount:t[0]==='expenses'?unreconciledCount:0;
    h+='<button class="fin-tab'+(S.finFilter===t[0]?' on':'')+'" onclick="TF.setFinFilter(\''+t[0]+'\')">'+t[1];
    if(cnt>0)h+=' <span class="fin-tab-count">'+cnt+'</span>';
    h+='</button>'});
  h+='</div>';
  /* Direction filter */
  h+='<div class="fin-dir-tabs">';
  h+='<button class="fin-dir-tab'+(S.finDirection===''?' on':'')+'" onclick="TF.setFinDirection(\'\')">All</button>';
  h+='<button class="fin-dir-tab fin-dir-in'+(S.finDirection==='inflow'?' on':'')+'" onclick="TF.setFinDirection(\'inflow\')">Inflows</button>';
  h+='<button class="fin-dir-tab fin-dir-out'+(S.finDirection==='outflow'?' on':'')+'" onclick="TF.setFinDirection(\'outflow\')">Outflows</button>';
  h+='</div>';
  h+='<input class="fl fl-s" placeholder="Search payments..." value="'+esc(S.finSearch||'')+'" oninput="TF.setFinSearch(this.value)" style="max-width:260px">';
  h+='<button class="btn'+(S.finBulkMode?' btn-p':'')+'" onclick="TF.finToggleBulk()" style="font-size:12px;padding:7px 14px;border-radius:10px">'+(S.finBulkMode?icon('x',12)+' Exit Bulk':'Bulk Edit')+'</button>';
  h+='</div>';

  /* Bulk action bar */
  if(S.finBulkMode){
    var catBulkOpts='<option value="">— Category —</option>';
    PAY_CATS.forEach(function(c){catBulkOpts+='<option>'+esc(c)+'</option>'});
    var clBulkOpts='<option value="">— No Client —</option>';
    S.clientRecords.forEach(function(c){clBulkOpts+='<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>'});

    h+='<div class="fin-bulk-bar">';
    h+='<span class="fin-bulk-count">'+bulkCount+' selected</span>';
    h+='<button class="btn" onclick="TF.finSelectAllVisible()" style="font-size:11px;padding:5px 12px">Select All ('+filtered.length+')</button>';
    if(bulkCount>0)h+='<button class="btn" onclick="TF.finDeselectAll()" style="font-size:11px;padding:5px 12px">Deselect</button>';
    h+='<select class="edf" id="fin-bulk-cat" style="font-size:12px;padding:5px 10px;max-width:180px">'+catBulkOpts+'</select>';
    h+='<select class="edf" id="fin-bulk-client" style="font-size:12px;padding:5px 10px;max-width:180px">'+clBulkOpts+'</select>';
    if(bulkCount>0)h+='<button class="btn btn-p" onclick="TF.finBulkApply()" style="font-size:12px;padding:6px 16px">Apply to '+bulkCount+'</button>';
    h+='</div>';
  }

  /* Table */
  if(!filtered.length){
    h+='<div style="text-align:center;padding:60px 20px;color:var(--t4)">No payments found</div>';
    return h}

  h+='<div class="tb-wrap"><table class="tb fin-tb">';
  h+='<thead><tr>';
  if(S.finBulkMode)h+='<th style="width:30px"><input type="checkbox" onclick="TF.finSelectAllVisible()" '+(bulkCount===filtered.length&&bulkCount>0?'checked':'')+' style="accent-color:var(--pink);cursor:pointer"></th>';
  h+='<th>Date</th><th>Payer</th><th class="r">Amount</th><th>Type</th><th>Source</th><th>Category</th><th>Client</th><th>Description</th><th></th></tr></thead>';
  h+='<tbody>';
  filtered.forEach(function(p,idx){
    var eid=escAttr(p.id);
    var clientName=clientNameById(p.clientId);
    var srcCls=srcClsFull(p);
    var splits=p.status==='split'?getSplitsForPayment(p.id):[];
    var rowCls='fin-row'+(p.status==='unmatched'?' fin-unmatched':'')+(p.status==='split'?' fin-split-parent':'');
    var isOut=p.direction==='outflow';
    var amtColor=isOut?'var(--red)':'var(--green)';
    var amtPrefix=isOut?'-':'';

    var isExpenseRow=S.finFilter==='expenses'&&p.direction==='outflow'&&p.type!=='transfer';
    var rowClick=S.finBulkMode?'TF.finToggleSel(\''+eid+'\')':(isExpenseRow?'TF.openExpenseReconcileModal(\''+eid+'\')':'TF.openFinancePaymentDetail(\''+eid+'\')');
    h+='<tr class="'+rowCls+(S.finBulkSelected[p.id]?' fin-bulk-sel':'')+'" onclick="'+rowClick+'">';
    if(S.finBulkMode)h+='<td onclick="event.stopPropagation();TF.finToggleSel(\''+eid+'\')"><input type="checkbox" '+(S.finBulkSelected[p.id]?'checked':'')+' style="accent-color:var(--pink);cursor:pointer"></td>';
    h+='<td class="fin-date">'+(p.date?fmtDShort(p.date):'')+'</td>';
    h+='<td class="fin-payer"><span class="fin-payer-name">'+esc(p.payerName||p.payerEmail||'Unknown')+'</span>';
    if(p.payerEmail&&p.payerName)h+='<span class="fin-payer-email">'+esc(p.payerEmail)+'</span>';
    h+='</td>';
    h+='<td class="r nm" style="color:'+amtColor+';font-weight:600">'+amtPrefix+fmtUSD(p.amount)+'</td>';
    h+='<td><span class="fin-type fin-type-'+p.type+'">'+(TYPE_LABELS[p.type]||p.type)+'</span></td>';
    h+='<td><span class="'+srcCls+'">'+esc(srcLabelFull(p))+'</span></td>';
    h+='<td>';
    if(p.status==='split')h+='<span class="fin-cat fin-cat-split">Split ('+splits.length+')</span>';
    else if(p.category)h+='<span class="fin-cat">'+esc(p.category)+'</span>';
    else h+='<span style="color:var(--t5)">—</span>';
    h+='</td>';
    h+='<td>';
    if(clientName)h+='<span class="fin-client-name">'+esc(clientName)+'</span>';
    else h+='<button class="btn fin-match-btn" onclick="event.stopPropagation();TF.openAssociateModal(\''+eid+'\')">Associate</button>';
    h+='</td>';
    h+='<td class="fin-desc">'+esc((p.description||'').substring(0,60))+(p.description&&p.description.length>60?'...':'')+'</td>';
    h+='<td>';
    if(p.direction==='outflow'&&p.scheduledItemId){
      var li=S.scheduledItems.find(function(si){return si.id===p.scheduledItemId});
      h+='<span class="fin-status fin-status-matched" title="Linked to: '+(li?esc(li.name):'')+'">'+icon('link',10)+' '+(li?esc(li.name.length>18?li.name.substring(0,18)+'…':li.name):'Linked')+'</span>';
    }else if(p.direction==='outflow'&&p.type!=='transfer'&&S.finFilter==='expenses'){
      h+='<button class="btn fin-recon-btn" onclick="event.stopPropagation();TF.openExpenseReconcileModal(\''+eid+'\')" style="font-size:10px;padding:3px 10px;color:var(--amber);border-color:rgba(255,152,0,.3)">'+icon('link',10)+' Reconcile</button>';
    }else if(p.status==='unmatched')h+='<span class="fin-status fin-status-unmatched">Unmatched</span>';
    else if(p.status==='split')h+='<span class="fin-status fin-status-split">Split</span>';
    else h+='<span class="fin-status fin-status-matched">Matched</span>';
    h+='</td>';
    h+='</tr>';

    if(splits.length){
      splits.forEach(function(sp){
        var cpName='';if(sp.campaignId){var cp=S.campaigns.find(function(c){return c.id===sp.campaignId});if(cp)cpName=cp.name}
        h+='<tr class="fin-split-row" onclick="TF.openFinancePaymentDetail(\''+eid+'\')">';
        h+='<td></td><td class="fin-split-indent">↳</td>';
        h+='<td class="r nm" style="color:var(--green)">'+fmtUSD(sp.amount)+'</td>';
        h+='<td></td><td></td>';
        h+='<td>'+(sp.category?'<span class="fin-cat">'+esc(sp.category)+'</span>':'')+'</td>';
        h+='<td style="font-size:11px;color:var(--t3)">'+(sp.endClient?esc(sp.endClient):'')+(sp.endClient&&cpName?' / ':'')+(cpName?esc(cpName):'')+'</td>';
        h+='<td colspan="2" class="fin-desc" style="font-size:11px">'+esc(sp.notes||'')+'</td>';
        h+='</tr>'})
    }
  });
  h+='</tbody></table></div>';
  return h}

function rFinanceDashboard(){
  var fp=S.financePayments.filter(function(p){return p.status!=='excluded'});
  /* Revenue = inflow payments only (not invoices, payouts, bills, expenses) */
  var revPayments=fp.filter(function(p){return p.direction==='inflow'&&p.type==='payment'});
  var outPayments=fp.filter(function(p){return p.direction==='outflow'&&p.type!=='transfer'});
  var totalRev=0,totalOut=0,unmatchedCount=0,matchedCount=0,splitCount=0;
  revPayments.forEach(function(p){totalRev+=p.amount});
  outPayments.forEach(function(p){totalOut+=p.amount});
  fp.forEach(function(p){
    if(p.status==='unmatched'&&p.direction==='inflow'&&p.type==='payment')unmatchedCount++;
    else if(p.status==='matched')matchedCount++;
    else if(p.status==='split')splitCount++});

  var rangeCfg=finGetRangeConfig(S.finRange);
  var rfp=finFilterByAnalyticsFilters(finFilterByRange(revPayments,rangeCfg));
  var rangeRev=0;rfp.forEach(function(p){rangeRev+=p.amount});
  var avgPayment=rfp.length?rangeRev/rfp.length:0;
  var undatedCount=0,undatedRev=0;
  revPayments.forEach(function(p){if(!p.date){undatedCount++;undatedRev+=p.amount}});
  var prevCfg=finGetPreviousPeriodConfig(rangeCfg);
  var prevFp=finFilterByAnalyticsFilters(finFilterByRange(revPayments,prevCfg));
  var prevRev=0;prevFp.forEach(function(p){prevRev+=p.amount});
  var periodGrowth=prevRev>0?((rangeRev-prevRev)/prevRev*100):0;

  var h='';
  /* Metrics row */
  h+='<div class="cp-dash">';
  h+='<div class="cp-dash-met" style="animation-delay:0s"><div class="cp-dash-met-v" style="color:var(--green)">'+fmtUSD(rangeRev)+'</div><div class="cp-dash-met-l">'+esc(rangeCfg.label)+' Revenue</div></div>';
  h+='<div class="cp-dash-met" style="animation-delay:0.05s"><div class="cp-dash-met-v" style="color:var(--t1)">'+rfp.length+'</div><div class="cp-dash-met-l">Payments</div></div>';
  h+='<div class="cp-dash-met" style="animation-delay:0.1s"><div class="cp-dash-met-v" style="color:var(--blue)">'+fmtUSD(avgPayment)+'</div><div class="cp-dash-met-l">Avg Payment</div></div>';
  if(prevRev>0)h+='<div class="cp-dash-met" style="animation-delay:0.15s"><div class="cp-dash-met-v" style="color:'+(periodGrowth>=0?'var(--green)':'var(--red)')+'">'+(periodGrowth>=0?'+':'')+periodGrowth.toFixed(1)+'%</div><div class="cp-dash-met-l">vs Previous Period</div></div>';
  if(totalOut>0)h+='<div class="cp-dash-met" style="animation-delay:0.15s"><div class="cp-dash-met-v" style="color:var(--red)">'+fmtUSD(totalOut)+'</div><div class="cp-dash-met-l">Total Outflows</div></div>';
  h+='<div class="cp-dash-met" style="animation-delay:0.2s"><div class="cp-dash-met-v" style="color:'+(unmatchedCount>0?'var(--amber)':'var(--t4)')+'">'+unmatchedCount+'</div><div class="cp-dash-met-l">Unmatched</div></div>';
  if(splitCount>0)h+='<div class="cp-dash-met" style="animation-delay:0.25s"><div class="cp-dash-met-v" style="color:var(--blue)">'+splitCount+'</div><div class="cp-dash-met-l">Split</div></div>';
  if(undatedCount>0&&S.finRange!=='all')h+='<div class="cp-dash-met" style="animation-delay:0.3s"><div class="cp-dash-met-v" style="color:var(--t3);font-size:16px">'+undatedCount+'</div><div class="cp-dash-met-l">Undated ('+fmtUSD(undatedRev)+')</div></div>';
  h+='</div>';

  /* Analytics */
  h+='<div class="fin-analytics">';
  h+='<div class="fin-controls-bar">';
  h+='<div class="fin-range-pills-group">';
  h+='<div class="fin-range-bar">';
  var ranges=[['all','All Time'],['12m','12 Months'],['6m','6 Months'],['3m','3 Months'],['1m','This Month'],['ytd','This Year'],['ly','Last Year'],['custom','Custom']];
  ranges.forEach(function(r){
    h+='<button class="fin-range-pill'+(S.finRange===r[0]?' on':'')+'" onclick="TF.finSetRange(\''+r[0]+'\')">'+r[1]+'</button>'});
  h+='</div>';
  if(S.finRange==='custom'){
    h+='<div class="fin-custom-range">';
    h+='<input type="date" class="fin-custom-date" id="fin-cs" value="'+esc(S.finCustomStart||'')+'" onchange="TF.finSetCustomRange(this.value,document.getElementById(\'fin-ce\').value)" title="Start date">';
    h+='<span class="fin-custom-sep">→</span>';
    h+='<input type="date" class="fin-custom-date" id="fin-ce" value="'+esc(S.finCustomEnd||'')+'" onchange="TF.finSetCustomRange(document.getElementById(\'fin-cs\').value,this.value)" title="End date">';
    h+='</div>'}
  h+='</div>';

  var catFOpts='<option value="">All Categories</option>';
  PAY_CATS.forEach(function(c){catFOpts+='<option value="'+esc(c)+'"'+(S.finCatFilter===c?' selected':'')+'>'+esc(c)+'</option>'});
  catFOpts+='<option value="Uncategorised"'+(S.finCatFilter==='Uncategorised'?' selected':'')+'>Uncategorised</option>';
  h+='<select class="fin-filter-sel'+(S.finCatFilter?' fin-filter-active':'')+'" onchange="TF.finSetCategory(this.value)">'+catFOpts+'</select>';

  var cliFOpts='<option value="">All Clients</option>';
  var sortedClients=S.clientRecords.slice().sort(function(a,b){return a.name.localeCompare(b.name)});
  sortedClients.forEach(function(c){cliFOpts+='<option value="'+esc(c.id)+'"'+(S.finClientFilter===c.id?' selected':'')+'>'+esc(c.name)+'</option>'});
  h+='<select class="fin-filter-sel'+(S.finClientFilter?' fin-filter-active':'')+'" onchange="TF.finSetClient(this.value)">'+cliFOpts+'</select>';

  if(S.finCatFilter||S.finClientFilter||(S.finRange==='custom'&&(S.finCustomStart||S.finCustomEnd))){
    h+='<button class="fin-filter-clear" onclick="TF.finClearFilters()">'+icon('x',11)+' Clear</button>'}
  h+='</div>';

  var granLabel=rangeCfg.granularity==='weekly'?'Weekly':rangeCfg.granularity==='daily'?'Daily':'Monthly';
  h+='<div class="fin-chart-grid">';
  h+='<div class="chart-card fin-chart-lg"><h3>'+granLabel+' Revenue</h3><div class="chart-wrap" style="height:260px"><canvas id="fin-monthly-chart"></canvas></div></div>';
  h+='<div class="chart-card fin-chart-lg"><h3>Cumulative Revenue</h3><div class="chart-wrap" style="height:260px"><canvas id="fin-cumulative-chart"></canvas></div></div>';
  h+='</div>';

  h+='<div class="fin-chart-grid fin-chart-grid-3">';
  h+='<div class="chart-card"><h3>Revenue by Category</h3><div class="chart-wrap" style="height:240px"><canvas id="fin-cat-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Revenue by Source</h3><div class="chart-wrap" style="height:240px"><canvas id="fin-src-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Top Clients</h3><div class="chart-wrap" style="height:240px"><canvas id="fin-client-chart"></canvas></div></div>';
  h+='</div>';

  h+='<div class="fin-chart-grid">';
  h+='<div class="chart-card" style="grid-column:1/-1"><h3>'+granLabel+' Revenue by Category</h3><div class="chart-wrap" style="height:300px"><canvas id="fin-stacked-chart"></canvas></div></div>';
  h+='</div>';

  var topPayments=rfp.slice().sort(function(a,b){return b.amount-a.amount}).slice(0,10);
  if(topPayments.length){
    h+='<div class="chart-card" style="margin-top:16px"><h3>Top Payments</h3>';
    h+='<div class="tb-wrap" style="max-height:none"><table class="tb fin-tb fin-top-tb">';
    h+='<thead><tr><th>Date</th><th>Payer</th><th class="r">Amount</th><th>Type</th><th>Source</th><th>Category</th><th>Client</th></tr></thead><tbody>';
    topPayments.forEach(function(p){
      var cName=clientNameById(p.clientId)||'—';
      var amtColor=p.direction==='outflow'?'var(--red)':'var(--green)';
      var amtPrefix=p.direction==='outflow'?'-':'';
      h+='<tr class="fin-row" onclick="TF.openFinancePaymentDetail(\''+escAttr(p.id)+'\')" style="cursor:pointer">';
      h+='<td class="fin-date">'+(p.date?fmtDShort(p.date):'')+'</td>';
      h+='<td>'+esc(p.payerName||p.payerEmail||'Unknown')+'</td>';
      h+='<td class="r nm" style="color:'+amtColor+';font-weight:700">'+amtPrefix+fmtUSD(p.amount)+'</td>';
      h+='<td><span class="fin-type fin-type-'+p.type+'">'+(TYPE_LABELS[p.type]||p.type)+'</span></td>';
      h+='<td><span class="fin-src fin-src-'+p.source+'">'+esc(srcLabel(p.source))+'</span></td>';
      h+='<td>'+(p.category?'<span class="fin-cat">'+esc(p.category)+'</span>':'—')+'</td>';
      h+='<td>'+esc(cName)+'</td>';
      h+='</tr>'});
    h+='</tbody></table></div></div>';
  }
  h+='</div>';
  return h}

function rFinanceInvoices(){
  /* Only show outstanding invoices — paid invoices are already matched & received */
  var invoices=S.financePayments.filter(function(p){return p.status!=='excluded'&&p.type==='invoice'&&p.pendingAmount>0});
  invoices.sort(function(a,b){return(b.date||0)-(a.date||0)});
  var now=new Date();

  var totalPending=0;
  invoices.forEach(function(p){totalPending+=p.pendingAmount||0});

  var overdueList=invoices.filter(function(p){
    var expDate=p.expectedPaymentDate?new Date(p.expectedPaymentDate+'T00:00:00'):null;
    if(!expDate&&p.date){expDate=new Date(p.date);expDate.setDate(expDate.getDate()+30)}
    return expDate&&expDate<now});

  var h='';
  h+='<div class="cp-dash">';
  h+=dashMet('Outstanding',invoices.length+' ('+fmtUSD(totalPending)+')',invoices.length>0?'var(--amber)':'var(--green)');
  h+=dashMet('Overdue',overdueList.length,overdueList.length>0?'var(--red)':'var(--green)');
  h+='</div>';

  if(!invoices.length){return h+'<div style="text-align:center;padding:60px 20px;color:var(--t4)">No outstanding invoices.<br><span style="font-size:12px;opacity:0.5">All invoices are paid. Invoices sync from Zoho Books automatically.</span></div>'}

  h+=rInvoiceTable(invoices,now);
  return h}

function rInvoiceTable(invoices,now){
  var h='<div class="tb-wrap"><table class="tb fin-tb">';
  h+='<thead><tr><th>Date</th><th>Customer</th><th>Invoice #</th><th class="r">Amount</th>';
  h+='<th class="r">Outstanding</th><th>Expected Payment</th>';
  h+='<th>Client</th><th>Status</th></tr></thead>';
  h+='<tbody>';
  invoices.forEach(function(p){
    var eid=escAttr(p.id);
    var clientName=clientNameById(p.clientId);
    var expDate=p.expectedPaymentDate||'';
    var isOverdue=false;
    var ed=expDate?new Date(expDate+'T00:00:00'):null;
    if(!ed&&p.date){ed=new Date(p.date);ed.setDate(ed.getDate()+30)}
    isOverdue=ed&&ed<now;

    /* Parse invoice number from description */
    var invNum=(p.description||'').split(' - ')[0]||p.description||'';

    h+='<tr class="fin-row'+(isOverdue?' fin-unmatched':'')+'" onclick="TF.openFinancePaymentDetail(\''+eid+'\')">';
    h+='<td class="fin-date">'+(p.date?fmtDShort(p.date):'')+'</td>';
    h+='<td>'+esc(p.payerName||p.payerEmail||'Unknown')+'</td>';
    h+='<td style="font-family:monospace;font-size:12px">'+esc(invNum)+'</td>';
    h+='<td class="r nm" style="color:var(--green);font-weight:600">'+fmtUSD(p.amount)+'</td>';
    h+='<td class="r nm"><span style="color:var(--amber);font-weight:600">'+fmtUSD(p.pendingAmount)+'</span></td>';
    h+='<td onclick="event.stopPropagation()">';
    h+='<input type="date" class="edf inv-exp-date" value="'+expDate+'" ';
    h+='onchange="TF.setInvExpDate(\''+eid+'\',this.value)" ';
    h+='style="font-size:11px;padding:3px 4px;background:transparent;border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:var(--t2);width:130px">';
    if(isOverdue)h+=' <span style="color:var(--red);font-size:10px;font-weight:600">OVERDUE</span>';
    h+='</td>';
    h+='<td>'+(clientName?'<span class="fin-client-name">'+esc(clientName)+'</span>':'—')+'</td>';
    var statusLabel=p.externalStatus||p.status||'';
    var statusColor=statusLabel==='overdue'?'var(--red)':statusLabel==='sent'||statusLabel==='unpaid'||statusLabel==='partially_paid'?'var(--amber)':'var(--t3)';
    h+='<td><span style="font-size:11px;font-weight:500;color:'+statusColor+';text-transform:capitalize">'+esc(statusLabel)+'</span></td>';
    h+='</tr>'});
  h+='</tbody></table></div>';
  return h}

function rFinanceUpcoming(){
  var items=buildUpcomingPayments(90);
  var totalIn=0,totalOut=0;
  items.forEach(function(it){if(it.direction==='inflow')totalIn+=it.amount;else totalOut+=it.amount});

  var h='';

  /* One-off payments section */
  var oneOffs=S.scheduledItems.filter(function(i){return i.frequency==='once'&&i.isActive});
  if(oneOffs.length||true){
    h+='<div class="chart-card" style="margin-bottom:20px">';
    h+='<h3 style="margin-bottom:12px">'+icon('file',14)+' One-Off Payments</h3>';
    if(oneOffs.length){
      h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr>';
      h+='<th>Name</th><th>Amount</th><th>Direction</th><th>Due Date</th><th></th>';
      h+='</tr></thead><tbody>';
      oneOffs.sort(function(a,b){return(a.nextDue||'9999').localeCompare(b.nextDue||'9999')}).forEach(function(item){
        var dirCol=item.direction==='inflow'?'var(--green)':'var(--red)';
        h+='<tr class="fin-row" onclick="TF.openEditScheduledItem(\''+item.id+'\')" style="cursor:pointer">';
        h+='<td>'+esc(item.name)+'</td>';
        h+='<td style="color:'+dirCol+';font-weight:600">'+(item.direction==='outflow'?'-':'')+fmtUSD(item.amount)+'</td>';
        h+='<td><span style="font-size:11px;color:'+dirCol+'">'+esc(item.direction==='inflow'?'Inflow':'Outflow')+'</span></td>';
        h+='<td class="fin-date">'+(item.nextDue||'—')+'</td>';
        h+='<td><button class="btn" onclick="event.stopPropagation();TF.confirmDeleteScheduledItem(\''+item.id+'\')" style="font-size:11px;padding:4px 8px;border-radius:6px">'+icon('trash',11)+'</button></td>';
        h+='</tr>'});
      h+='</tbody></table></div>'}
    else{h+='<div style="opacity:0.5;font-size:13px;text-align:center;padding:12px">No one-off payments yet</div>'}
    /* Inline quick-add row */
    h+='<div class="fin-quick-add" style="margin-top:8px">';
    h+='<input id="oo-name" class="edf" placeholder="Name..." style="flex:2">';
    h+='<input id="oo-amount" class="edf" type="number" step="0.01" placeholder="Amount" style="flex:1">';
    h+='<select id="oo-direction" class="edf" style="flex:1"><option value="outflow">Outflow</option><option value="inflow">Inflow</option></select>';
    h+='<input id="oo-date" class="edf" type="date" style="flex:1">';
    h+='<button class="btn btn-p" onclick="TF.quickAddOneOff()" style="padding:6px 14px;font-size:12px">'+icon('save',11)+' Add</button>';
    h+='</div></div>'}

  /* Expense Reconciliation Review */
  var reconExps=S.financePayments.filter(function(p){return p.direction==='outflow'&&p.scheduledItemId&&p.status!=='excluded'&&p.type!=='transfer'});
  var unreconExps=S.financePayments.filter(function(p){return p.direction==='outflow'&&!p.scheduledItemId&&p.status!=='excluded'&&p.type!=='transfer'});
  h+='<div class="chart-card" style="margin-bottom:20px">';
  h+='<h3 style="margin-bottom:12px">'+icon('link',14)+' Expense Reconciliation</h3>';
  h+='<div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap">';
  h+='<div style="flex:1;min-width:140px;padding:12px;background:rgba(61,220,132,.05);border:1px solid rgba(61,220,132,.15);border-radius:8px;text-align:center">';
  h+='<div style="font-size:22px;font-weight:700;color:var(--green)">'+reconExps.length+'</div>';
  h+='<div style="font-size:11px;color:var(--t4);margin-top:2px">Reconciled</div>';
  var reconTotal=0;reconExps.forEach(function(p){reconTotal+=p.amount});
  h+='<div style="font-size:12px;color:var(--green);margin-top:4px">'+fmtUSD(reconTotal)+'</div>';
  h+='</div>';
  h+='<div style="flex:1;min-width:140px;padding:12px;background:rgba(248,113,113,.05);border:1px solid rgba(248,113,113,.15);border-radius:8px;text-align:center;cursor:'+(unreconExps.length?'pointer':'default')+'" '+(unreconExps.length?'onclick="TF.nav(\'finance\');setTimeout(function(){TF.setFinFilter(\'expenses\')},100)"':'')+'>';
  h+='<div style="font-size:22px;font-weight:700;color:var(--red)">'+unreconExps.length+'</div>';
  h+='<div style="font-size:11px;color:var(--t4);margin-top:2px">Unreconciled</div>';
  var unreconTotal=0;unreconExps.forEach(function(p){unreconTotal+=p.amount});
  h+='<div style="font-size:12px;color:var(--red);margin-top:4px">'+fmtUSD(unreconTotal)+'</div>';
  h+='</div></div>';
  /* Recent reconciled table */
  if(reconExps.length){
    var recent=reconExps.slice().sort(function(a,b){return(b.date||'').localeCompare(a.date||'')}).slice(0,8);
    h+='<div style="font-size:11px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px">Recently Reconciled</div>';
    h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr><th>Date</th><th>Expense</th><th class="r">Amount</th><th>Linked To</th></tr></thead><tbody>';
    recent.forEach(function(p){
      var linked=S.scheduledItems.find(function(si){return si.id===p.scheduledItemId});
      h+='<tr class="fin-row" onclick="TF.openExpenseReconcileModal(\''+escAttr(p.id)+'\')" style="cursor:pointer">';
      h+='<td class="fin-date">'+(p.date?fmtDShort(p.date):'—')+'</td>';
      h+='<td>'+esc(p.payerName||p.description||'Unknown')+'</td>';
      h+='<td class="r" style="color:var(--red);font-weight:600">-'+fmtUSD(p.amount)+'</td>';
      h+='<td style="font-size:12px;color:var(--purple50)">'+icon('link',10)+' '+(linked?esc(linked.name):'—')+'</td>';
      h+='</tr>'});
    h+='</tbody></table></div>'}
  else{h+='<div style="opacity:0.5;font-size:13px;text-align:center;padding:12px">No reconciled expenses yet. Match expenses to recurring items to track them here.</div>'}
  h+='</div>';

  h+='<div class="cp-dash">';
  h+=dashMet('Expected Inflows',fmtUSD(totalIn),'var(--green)');
  h+=dashMet('Expected Outflows',fmtUSD(totalOut),'var(--red)');
  h+=dashMet('Net',fmtUSD(totalIn-totalOut),totalIn-totalOut>=0?'var(--green)':'var(--red)');
  h+=dashMet('Items',items.length,'var(--t1)');
  h+='</div>';

  if(!items.length){
    return h+'<div style="text-align:center;padding:60px 20px;color:var(--t4)">No upcoming payments in the next 90 days.<br><span style="font-size:12px;opacity:0.5">Add campaigns, recurring items, or invoices to see upcoming payments.</span></div>'}

  h+='<div class="tb-wrap"><table class="tb fin-tb">';
  h+='<thead><tr><th>Date</th><th>Type</th><th>Name</th><th>Direction</th><th class="r">Amount</th><th>Frequency</th><th></th></tr></thead>';
  h+='<tbody>';

  items.forEach(function(it){
    var eid=escAttr(it.sourceId);
    var typeColors={campaign:'var(--blue)',scheduled:'var(--purple50)',invoice:'var(--green)',salary:'var(--pink)',pipeline:'var(--amber)',pipeline_monthly:'var(--amber)'};
    var typeLabels={campaign:'Campaign',scheduled:'Recurring',invoice:'Invoice',salary:'Salary',pipeline:'Pipeline',pipeline_monthly:'Pipeline (Mo)'};
    var typeColor=typeColors[it.type]||'var(--t3)';
    var typeLabel=typeLabels[it.type]||it.type;
    var dirColor=it.direction==='inflow'?'var(--green)':'var(--red)';
    var dirSign=it.direction==='inflow'?'+':'-';

    /* Row click opens the relevant detail */
    var rowClick='';
    if(it.type==='campaign')rowClick='TF.openCampaignDetail(\''+eid+'\')';
    else if(it.type==='scheduled')rowClick='TF.openEditScheduledItem(\''+eid+'\')';
    else if(it.type==='invoice')rowClick='TF.openFinancePaymentDetail(\''+eid+'\')';
    else if(it.type==='salary')rowClick='TF.openEditTeamMember(\''+eid+'\')';
    else if(it.type==='pipeline'||it.type==='pipeline_monthly')rowClick='TF.openOpportunityDetail(\''+eid+'\')';

    h+='<tr class="fin-row" onclick="'+rowClick+'">';

    /* Date column — editable for campaign/scheduled/invoice, read-only for salary */
    h+='<td onclick="event.stopPropagation()">';
    if(it.editable){
      var dateHandler='';
      if(it.type==='campaign')dateHandler='TF.setUpcomingDate(\'campaign\',\''+eid+'\',this.value)';
      else if(it.type==='scheduled')dateHandler='TF.setUpcomingDate(\'scheduled\',\''+eid+'\',this.value)';
      else if(it.type==='invoice')dateHandler='TF.setInvExpDate(\''+eid+'\',this.value)';
      h+='<input type="date" class="edf inv-exp-date" value="'+it.date+'" onchange="'+dateHandler+'" ';
      h+='style="font-size:11px;padding:3px 4px;background:transparent;border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:var(--t2);width:130px">';
    }else{
      h+='<span class="fin-date">'+fmtDShort(new Date(it.date+'T00:00:00'))+'</span>'}
    h+='</td>';

    h+='<td><span style="font-size:11px;font-weight:600;color:'+typeColor+';padding:2px 8px;border:1px solid '+typeColor+';border-radius:6px;opacity:0.8">'+typeLabel+'</span></td>';
    h+='<td style="font-weight:500">'+esc(it.name)+'</td>';
    h+='<td><span style="font-size:11px;font-weight:500;color:'+dirColor+'">'+esc(it.direction==='inflow'?'Inflow':'Outflow')+'</span></td>';
    h+='<td class="r nm" style="color:'+dirColor+';font-weight:600">'+dirSign+fmtUSD(it.amount)+'</td>';
    h+='<td style="font-size:11px;color:var(--t3);text-transform:capitalize">'+esc(it.frequency)+'</td>';
    h+='<td></td>';
    h+='</tr>'});

  h+='</tbody></table></div>';
  return h}

function rFinanceCashFlow(){
  var fp=S.financePayments.filter(function(p){return p.status!=='excluded'&&p.type!=='transfer'&&p.type!=='invoice'&&p.type!=='bill'});
  var rangeCfg=finGetRangeConfig(S.finRange);
  var rfp=finFilterByRange(fp,rangeCfg);

  var totalIn=0,totalOut=0;
  rfp.forEach(function(p){if(p.direction==='outflow')totalOut+=p.amount;else totalIn+=p.amount});
  var net=totalIn-totalOut;

  var h='';
  /* Range controls */
  h+='<div class="fin-controls-bar" style="margin-bottom:16px">';
  h+='<div class="fin-range-pills-group"><div class="fin-range-bar">';
  var ranges=[['all','All Time'],['12m','12 Months'],['6m','6 Months'],['3m','3 Months'],['1m','This Month'],['ytd','This Year'],['ly','Last Year']];
  ranges.forEach(function(r){
    h+='<button class="fin-range-pill'+(S.finRange===r[0]?' on':'')+'" onclick="TF.finSetRange(\''+r[0]+'\')">'+r[1]+'</button>'});
  h+='</div></div></div>';

  /* Metrics */
  h+='<div class="cp-dash">';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:var(--green)">'+fmtUSD(totalIn)+'</div><div class="cp-dash-met-l">Inflows</div></div>';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:var(--red)">'+fmtUSD(totalOut)+'</div><div class="cp-dash-met-l">Outflows</div></div>';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:'+(net>=0?'var(--green)':'var(--red)')+'">'+fmtUSD(Math.abs(net))+'</div><div class="cp-dash-met-l">Net '+(net>=0?'Positive':'Negative')+'</div></div>';
  h+='<div class="cp-dash-met"><div class="cp-dash-met-v" style="color:var(--t1)">'+rfp.length+'</div><div class="cp-dash-met-l">Transactions</div></div>';
  h+='</div>';

  /* Charts */
  h+='<div class="fin-chart-grid">';
  h+='<div class="chart-card fin-chart-lg"><h3>Cash Flow Over Time</h3><div class="chart-wrap" style="height:280px"><canvas id="fin-cashflow-chart"></canvas></div></div>';
  h+='<div class="chart-card fin-chart-lg"><h3>Cumulative Cash Flow</h3><div class="chart-wrap" style="height:280px"><canvas id="fin-cashflow-cumulative"></canvas></div></div>';
  h+='</div>';

  /* Inflow/outflow by category */
  h+='<div class="fin-chart-grid">';
  h+='<div class="chart-card"><h3>Inflows by Category</h3><div class="chart-wrap" style="height:240px"><canvas id="fin-inflow-cat-chart"></canvas></div></div>';
  h+='<div class="chart-card"><h3>Outflows by Category</h3><div class="chart-wrap" style="height:240px"><canvas id="fin-outflow-cat-chart"></canvas></div></div>';
  h+='</div>';
  return h}

function initFinanceCharts(){
  var sub=S.subView||'overview';
  if(sub==='overview')initFinanceOverviewCharts();
  else if(sub==='forecast')initForecastCharts()}

function initFinanceDashboardCharts(){
  setTimeout(function(){
    /* Revenue = inflow payments only, excluding excluded records */
    var fp=S.financePayments.filter(function(p){return p.status!=='excluded'&&p.direction==='inflow'&&p.type==='payment'});
    var rangeCfg=finGetRangeConfig(S.finRange);
    var rfp=finFilterByAnalyticsFilters(finFilterByRange(fp,rangeCfg));
    var agg=finAggregateByPeriod(rfp,rangeCfg);

    mkLineUSD('fin-monthly-chart',agg.labels,agg.totals,'#3ddc84');

    var cumTotals=[];var runSum=0;
    agg.totals.forEach(function(v){runSum+=v;cumTotals.push(runSum)});
    mkLineUSD('fin-cumulative-chart',agg.labels,cumTotals,'#4da6ff');

    var catRevenue={};
    rfp.forEach(function(p){
      if(p.status==='split'){getSplitsForPayment(p.id).forEach(function(sp){var c=sp.category||'Uncategorised';catRevenue[c]=(catRevenue[c]||0)+sp.amount})}
      else{var c=p.category||'Uncategorised';catRevenue[c]=(catRevenue[c]||0)+p.amount}});
    if(Object.keys(catRevenue).length)mkDonutUSD('fin-cat-chart',catRevenue);

    var srcRevenue={};
    rfp.forEach(function(p){var s=p.source==='stripe2'?'Stripe 2':p.source.charAt(0).toUpperCase()+p.source.slice(1);
      srcRevenue[s]=(srcRevenue[s]||0)+p.amount});
    if(Object.keys(srcRevenue).length)mkDonutUSD('fin-src-chart',srcRevenue);

    var clientRevenue={};
    rfp.forEach(function(p){var cName=clientNameById(p.clientId)||'Unassigned';
      clientRevenue[cName]=(clientRevenue[cName]||0)+p.amount});
    if(Object.keys(clientRevenue).length)mkHBarUSD('fin-client-chart',clientRevenue);

    var catAgg=finAggregateByCatAndPeriod(rfp,rangeCfg);
    var datasets=catAgg.catNames.map(function(c,ci){
      return{label:c,data:catAgg.stackedData[c],backgroundColor:P[ci%P.length]+'88',borderColor:P[ci%P.length],borderWidth:1,borderRadius:4}});
    if(datasets.length)mkStackedBarUSD('fin-stacked-chart',catAgg.labels,datasets);
  },200)}

function initFinanceCashFlowCharts(){
  setTimeout(function(){
    var fp=S.financePayments.filter(function(p){return p.status!=='excluded'&&p.type!=='transfer'&&p.type!=='invoice'&&p.type!=='bill'});
    var rangeCfg=finGetRangeConfig(S.finRange);
    var rfp=finFilterByRange(fp,rangeCfg);
    var agg=finAggregateByPeriod(rfp,rangeCfg);

    /* Cash flow over time: inflows vs outflows */
    var inflows=rfp.filter(function(p){return p.direction!=='outflow'});
    var outflows=rfp.filter(function(p){return p.direction==='outflow'});
    var inAgg=finAggregateByPeriod(inflows,rangeCfg);
    var outAgg=finAggregateByPeriod(outflows,rangeCfg);

    var cfEl=gel('fin-cashflow-chart');
    if(cfEl){killChart('fin-cashflow-chart');
      charts['fin-cashflow-chart']=new Chart(cfEl,{type:'bar',data:{labels:agg.labels,datasets:[
        {label:'Inflows',data:inAgg.totals,backgroundColor:'rgba(61,220,132,0.6)',borderColor:'#3ddc84',borderWidth:1,borderRadius:4},
        {label:'Outflows',data:outAgg.totals.map(function(v){return-v}),backgroundColor:'rgba(255,51,88,0.6)',borderColor:'#ff3358',borderWidth:1,borderRadius:4}
      ]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#a1a1aa',font:{size:11}}},
        tooltip:{callbacks:{label:function(c){return c.dataset.label+': '+fmtUSD(Math.abs(c.parsed.y))}}}},
        scales:{x:{stacked:true,grid:{color:'rgba(255,255,255,0.06)'},ticks:{color:'#52525b',font:{size:10}}},
          y:{stacked:true,grid:{color:'rgba(255,255,255,0.06)'},ticks:{color:'#52525b',font:{size:10},callback:function(v){return fmtUSD(Math.abs(v))}}}}}})}

    /* Cumulative cash flow */
    var cumNet=[];var runNet=0;
    agg.labels.forEach(function(_,i){
      var inV=inAgg.totals[i]||0;var outV=outAgg.totals[i]||0;
      runNet+=inV-outV;cumNet.push(runNet)});
    mkLineUSD('fin-cashflow-cumulative',agg.labels,cumNet,'#4da6ff');

    /* Inflow by category */
    var inCat={};inflows.forEach(function(p){var c=p.category||'Uncategorised';inCat[c]=(inCat[c]||0)+p.amount});
    if(Object.keys(inCat).length)mkDonutUSD('fin-inflow-cat-chart',inCat);

    /* Outflow by category */
    var outCat={};outflows.forEach(function(p){var c=p.category||'Uncategorised';outCat[c]=(outCat[c]||0)+p.amount});
    if(Object.keys(outCat).length)mkDonutUSD('fin-outflow-cat-chart',outCat);
  },200)}

/* ═══════════ FINANCE: OVERVIEW ═══════════ */
function rFinanceOverview(){
  var h='<div class="fin-analytics">';
  var bal=getCombinedBalance();
  var byPlat=getBalanceByPlatform();
  var platKeys=Object.keys(byPlat);
  var lastSync=S.accountBalances.length?S.accountBalances[0].capturedAt:null;

  /* Recent card spending (last 7 days) */
  var weekAgo=new Date(Date.now()-7*86400000);
  var recentCardSpend=S.financePayments.filter(function(p){
    var meta=typeof p.metadata==='string'?JSON.parse(p.metadata||'{}'):p.metadata||{};
    return meta.brex_type==='card'&&p.status!=='excluded'&&p.date&&p.date>=weekAgo;
  }).reduce(function(s,p){return s+p.amount},0);
  var unreconciledExp=S.financePayments.filter(function(p){return p.direction==='outflow'&&p.type!=='transfer'&&!p.scheduledItemId&&p.status!=='excluded'}).length;

  /* Row 1 — 3 bank cards: Combined (hero) + Brex + Mercury, expandable sub-accounts */
  var combinedAvail=S.accountBalances.reduce(function(s,a){
    return s+(a.platform==='brex'&&a.availableBalance?a.availableBalance:a.currentBalance)},0);
  /* Compute clearing total */
  var clearingTotal=S.financePayments.filter(function(p){return typeof isInClearing==='function'&&isInClearing(p)}).reduce(function(s,p){return s+p.amount},0);

  var gridCols=unreconciledExp>0?4:3;
  h+='<div style="display:grid;grid-template-columns:repeat('+gridCols+',1fr);gap:16px;margin-bottom:20px">';

  /* Combined Balance — hero card */
  h+='<div class="fin-bank-card" style="background:linear-gradient(135deg,var(--card) 0%,rgba(61,220,132,0.06) 100%);border:1px solid rgba(61,220,132,0.2)">';
  h+='<div style="font-size:12px;opacity:0.6;margin-bottom:4px">Combined Balance</div>';
  h+='<div style="font-size:28px;font-weight:700;color:var(--green)">'+fmtUSD(combinedAvail)+'</div>';
  if(clearingTotal>0)h+='<div class="fin-clearing-badge" style="margin-top:8px"><span class="fin-clearing-dot"></span> Clearing: '+fmtUSD(clearingTotal)+'</div>';
  if(lastSync)h+='<div style="font-size:10px;opacity:0.4;margin-top:6px">Last synced '+fmtRelative(lastSync)+'</div>';
  h+='</div>';

  /* Brex card — expandable */
  var brexData=byPlat.brex||{total:0,accounts:[]};
  var brexAvail=brexData.accounts.reduce(function(s,a){return s+(a.availableBalance||a.currentBalance)},0);
  var brexPendingHolds=brexData.accounts.reduce(function(s,a){return s+(a.currentBalance-(a.availableBalance||a.currentBalance))},0);
  h+='<div class="fin-bank-card">';
  h+='<details>';
  h+='<summary style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;list-style:none">';
  h+='<div><div style="font-size:12px;opacity:0.6;margin-bottom:4px">Brex</div>';
  h+='<div style="font-size:22px;font-weight:700">'+fmtUSD(brexAvail)+'</div></div>';
  h+='<span class="fin-expand-icon">'+icon('chevron-down',14)+'</span></summary>';
  if(recentCardSpend>0)h+='<div style="font-size:11px;color:var(--t4);margin-top:4px">Card spend (7d): -'+fmtUSD(recentCardSpend)+'</div>';
  if(brexPendingHolds>1)h+='<div style="font-size:11px;color:var(--amber);margin-top:2px">Pending holds: -'+fmtUSD(brexPendingHolds)+'</div>';
  brexData.accounts.forEach(function(a){
    var dispBal=a.availableBalance||a.currentBalance;
    h+='<div class="fin-bank-sub">';
    h+='<span style="flex:1">'+esc(a.accountName||'Account')+' <span style="font-size:10px;opacity:0.4">'+esc(a.accountType)+'</span></span>';
    h+='<span style="font-weight:600">'+fmtUSD(dispBal)+'</span></div>'});
  h+='</details></div>';

  /* Mercury card — expandable */
  var mercData=byPlat.mercury||{total:0,accounts:[]};
  var mercTotal=mercData.accounts.reduce(function(s,a){return s+a.currentBalance},0);
  h+='<div class="fin-bank-card">';
  h+='<details>';
  h+='<summary style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;list-style:none">';
  h+='<div><div style="font-size:12px;opacity:0.6;margin-bottom:4px">Mercury</div>';
  h+='<div style="font-size:22px;font-weight:700">'+fmtUSD(mercTotal)+'</div></div>';
  h+='<span class="fin-expand-icon">'+icon('chevron-down',14)+'</span></summary>';
  mercData.accounts.forEach(function(a){
    h+='<div class="fin-bank-sub">';
    h+='<span style="flex:1">'+esc(a.accountName||'Account')+' <span style="font-size:10px;opacity:0.4">'+esc(a.accountType)+'</span></span>';
    h+='<span style="font-weight:600">'+fmtUSD(a.currentBalance)+'</span></div>'});
  h+='</details></div>';

  /* Unreconciled expenses CTA */
  if(unreconciledExp>0){
    h+='<div class="fin-bank-card" style="cursor:pointer;border-color:rgba(255,152,0,.25)" onclick="TF.setFinFilter(\'expenses\');TF.subNav(\'payments\')">';
    h+='<div style="font-size:24px;font-weight:700;color:var(--amber)">'+unreconciledExp+'</div>';
    h+='<div style="font-size:12px;opacity:0.6">Unreconciled Expenses</div>';
    h+='<div style="font-size:10px;color:var(--amber);margin-top:4px">Click to reconcile →</div>';
    h+='</div>'}
  h+='</div>';

  /* Row 2 — Key metrics */
  var fc=buildForecast(90,'expected');
  var metrics=getForecastMetrics(fc);
  var activeScheduled=S.scheduledItems.filter(function(i){return i.isActive});
  var monthlyOut=activeScheduled.filter(function(i){return i.direction==='outflow'}).reduce(function(s,i){
    if(i.frequency==='monthly')return s+i.amount;
    if(i.frequency==='weekly')return s+i.amount*4.33;
    if(i.frequency==='biweekly')return s+i.amount*2.17;
    if(i.frequency==='quarterly')return s+i.amount/3;
    if(i.frequency==='annually')return s+i.amount/12;
    return s},0);
  var teamMonthly=S.teamMembers.filter(function(m){return m.isActive}).reduce(function(s,m){return s+m.salary},0);
  var burnRate=monthlyOut+teamMonthly;
  var runway=burnRate>0?Math.floor(bal/burnRate):999;
  var unmatchedCount=S.financePayments.filter(function(p){return p.status==='unmatched'&&p.direction==='inflow'&&p.type==='payment'}).length;
  var pendingInv=S.financePayments.filter(function(p){return p.type==='invoice'&&p.pendingAmount>0&&p.status!=='excluded'});
  var pendingTotal=pendingInv.reduce(function(s,p){return s+p.pendingAmount},0);
  var overdueItems=activeScheduled.filter(function(i){
    if(!i.nextDue)return false;
    var nd=new Date(i.nextDue+'T00:00:00');
    return nd<new Date()&&(!i.lastPaidDate||new Date(i.lastPaidDate+'T00:00:00')<nd)});

  h+='<div class="cp-dash" style="margin-bottom:20px">';
  h+=dashMet('Monthly Burn',fmtUSD(burnRate),'var(--red)');
  h+=dashMet('Runway',runway>=999?'∞':runway+' months',runway<3?'var(--red)':runway<6?'var(--amber)':'var(--green)');
  h+=dashMet('30-Day Net',fmtUSD(metrics.day30-bal),(metrics.day30-bal)>=0?'var(--green)':'var(--red)');
  h+=dashMet('Unmatched',unmatchedCount,unmatchedCount>0?'var(--amber)':'var(--muted)');
  h+=dashMet('Pending Invoices',pendingInv.length+' ('+fmtUSD(pendingTotal)+')',pendingInv.length>0?'var(--blue)':'var(--muted)');
  h+=dashMet('Overdue Items',overdueItems.length,overdueItems.length>0?'var(--red)':'var(--green)');
  h+='</div>';

  /* Row 3 — Mini forecast chart */
  h+='<div class="chart-card" style="margin-bottom:20px;cursor:pointer" onclick="TF.subNav(\'forecast\')">';
  h+='<h3 style="margin-bottom:12px">90-Day Forecast <span style="font-size:11px;opacity:0.5;font-weight:400">→ Click for full forecast</span></h3>';
  h+='<div class="chart-wrap" style="height:200px"><canvas id="fin-overview-forecast"></canvas></div>';
  h+='</div>';

  /* Row 4 — Recent activity + Upcoming */
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">';

  /* Recent transactions */
  h+='<div class="chart-card">';
  h+='<h3 style="margin-bottom:12px">Recent Transactions</h3>';
  var recentAll=S.financePayments.filter(function(p){return p.status!=='excluded'&&p.type!=='transfer'&&p.type!=='bill'&&p.source!=='zoho_books'});
  var seen={};recentAll=recentAll.filter(function(p){var key=(p.date?fmtDate(p.date):'')+'_'+Math.round(p.amount*100);if(seen[key])return false;seen[key]=true;return true});
  var recent=recentAll.slice(0,10);
  if(!recent.length)h+='<div style="opacity:0.5;font-size:13px">No transactions yet</div>';
  else{
    recent.forEach(function(p){
      var col=p.direction==='inflow'?'var(--green)':'var(--red)';
      var sign=p.direction==='inflow'?'+':'-';
      var clearing=typeof isInClearing==='function'&&isInClearing(p);
      h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">';
      h+='<div style="flex:1;min-width:0;display:flex;align-items:center;gap:6px">';
      if(clearing)h+='<span class="fin-clearing-dot" title="Clearing (2 business days)"></span>';
      h+='<div style="min-width:0;flex:1">';
      h+='<div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.payerName||p.description||'Unknown')+'</div>';
      h+='<div style="font-size:11px;opacity:0.5">'+(p.date?fmtDate(p.date):'No date')+' • '+esc(p.source)+(clearing?' • Clearing':'')+'</div>';
      h+='</div></div>';
      h+='<div style="font-size:14px;font-weight:600;color:'+(clearing?'var(--amber)':col)+';margin-left:12px">'+sign+fmtUSD(p.amount)+'</div>';
      h+='</div>'})}
  h+='</div>';

  /* Upcoming scheduled items */
  h+='<div class="chart-card">';
  h+='<h3 style="margin-bottom:12px">Upcoming (Next 7 Days)</h3>';
  var now=new Date();var weekOut=new Date();weekOut.setDate(weekOut.getDate()+7);
  var upcoming=activeScheduled.filter(function(i){
    if(!i.nextDue)return false;
    var nd=new Date(i.nextDue+'T00:00:00');
    return nd>=now&&nd<=weekOut}).sort(function(a,b){return(a.nextDue||'').localeCompare(b.nextDue||'')});
  if(!upcoming.length)h+='<div style="opacity:0.5;font-size:13px">Nothing due this week</div>';
  else{
    upcoming.forEach(function(i){
      var col=i.direction==='inflow'?'var(--green)':'var(--red)';
      h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">';
      h+='<div style="flex:1;min-width:0">';
      h+='<div style="font-size:13px">'+esc(i.name)+'</div>';
      h+='<div style="font-size:11px;opacity:0.5">'+(i.nextDue||'')+(i.frequency!=='once'?' • '+i.frequency:'')+'</div>';
      h+='</div>';
      h+='<div style="font-size:14px;font-weight:600;color:'+col+'">'+(i.direction==='outflow'?'-':'')+fmtUSD(i.amount)+'</div>';
      h+='</div>'})}
  h+='</div>';
  h+='</div>';

  /* Row 5 — Existing dashboard charts (revenue analytics) */
  h+='<h3 style="margin:20px 0 12px;font-size:14px;opacity:0.7">Revenue Analytics</h3>';
  h+=rFinanceDashboard();

  h+='</div>';
  return h}

function initFinanceOverviewCharts(){
  setTimeout(function(){
    /* Mini forecast chart */
    var fc=buildForecast(90,'expected');
    if(!fc.days.length)return;
    var labels=[];var balances=[];
    fc.days.forEach(function(d,i){
      if(i%3===0||i===fc.days.length-1){labels.push(d.date.substring(5));balances.push(d.balance)}});
    var el=document.getElementById('fin-overview-forecast');
    if(el)mkLineUSD('fin-overview-forecast',labels,balances,balances[balances.length-1]>=0?'#3ddc84':'#ff3358');
    /* Also init the dashboard charts below */
    initFinanceDashboardCharts();
  },200)}

/* ═══════════ FINANCE: RECURRING ═══════════ */
function rFinanceRecurring(){
  var h='<div class="fin-analytics">';
  var items=S.scheduledItems;
  var active=items.filter(function(i){return i.isActive});
  var inactive=items.filter(function(i){return !i.isActive});

  /* Summary cards */
  var monthlyOut=0,monthlyIn=0;
  active.forEach(function(i){
    var monthly=i.amount;
    if(i.frequency==='weekly')monthly=i.amount*4.33;
    else if(i.frequency==='biweekly')monthly=i.amount*2.17;
    else if(i.frequency==='quarterly')monthly=i.amount/3;
    else if(i.frequency==='annually')monthly=i.amount/12;
    else if(i.frequency==='once')monthly=0;
    if(i.direction==='outflow')monthlyOut+=monthly;
    else monthlyIn+=monthly});

  var now=new Date();var weekOut=new Date();weekOut.setDate(weekOut.getDate()+7);
  var dueSoon=active.filter(function(i){
    if(!i.nextDue)return false;
    var nd=new Date(i.nextDue+'T00:00:00');
    return nd>=now&&nd<=weekOut}).length;
  var overdue=active.filter(function(i){
    if(!i.nextDue)return false;
    var nd=new Date(i.nextDue+'T00:00:00');
    return nd<now&&(!i.lastPaidDate||new Date(i.lastPaidDate+'T00:00:00')<nd)}).length;

  h+='<div class="cp-dash" style="margin-bottom:20px">';
  h+=dashMet('Monthly Outflows',fmtUSD(monthlyOut),'var(--red)');
  h+=dashMet('Monthly Inflows',fmtUSD(monthlyIn),'var(--green)');
  h+=dashMet('Net Monthly',fmtUSD(monthlyIn-monthlyOut),(monthlyIn-monthlyOut)>=0?'var(--green)':'var(--red)');
  h+=dashMet('Due This Week',dueSoon,dueSoon>0?'var(--amber)':'var(--muted)');
  h+=dashMet('Overdue',overdue,overdue>0?'var(--red)':'var(--green)');
  h+='</div>';

  /* Reconciliation button */
  h+='<div style="display:flex;gap:8px;margin-bottom:16px">';
  h+='<button class="btn" onclick="TF.autoReconcile()" style="font-size:12px;padding:7px 14px;border-radius:10px">'+icon('refresh',12)+' Auto-Reconcile</button>';
  h+='</div>';

  /* Active items table */
  h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr>';
  h+='<th>Name</th><th>Amount</th><th>Frequency</th><th>Next Due</th><th>Account</th>';
  h+='<th>Type</th><th>Last Paid</th><th>Status</th><th></th>';
  h+='</tr></thead><tbody>';

  if(!active.length)h+='<tr><td colspan="9" style="text-align:center;opacity:0.5;padding:32px">No scheduled items yet. Click "+ Add Item" to add recurring expenses.</td></tr>';

  active.sort(function(a,b){return(a.nextDue||'9999').localeCompare(b.nextDue||'9999')}).forEach(function(item){
    var isOverdue=false;
    if(item.nextDue){
      var nd=new Date(item.nextDue+'T00:00:00');
      isOverdue=nd<now&&(!item.lastPaidDate||new Date(item.lastPaidDate+'T00:00:00')<nd)}
    var isPaid=item.lastPaidDate&&item.nextDue&&new Date(item.lastPaidDate+'T00:00:00')>=new Date(item.nextDue+'T00:00:00');
    var statusCls=isOverdue?'fin-status-unmatched':(isPaid?'fin-status-matched':'');
    var statusLabel=isOverdue?'Overdue':(isPaid?'Paid':'Upcoming');
    var dirCol=item.direction==='inflow'?'var(--green)':'var(--red)';

    h+='<tr class="fin-row'+(isOverdue?' fin-unmatched':'')+'" onclick="TF.openEditScheduledItem(\''+item.id+'\')" style="cursor:pointer">';
    h+='<td><span class="fin-payer-name">'+esc(item.name)+'</span></td>';
    h+='<td style="color:'+dirCol+';font-weight:600">'+(item.direction==='outflow'?'-':'')+fmtUSD(item.amount)+'</td>';
    h+='<td><span style="font-size:11px;opacity:0.7">'+esc(item.frequency)+'</span></td>';
    h+='<td class="fin-date">'+(item.nextDue||'—')+'</td>';
    h+='<td><span style="font-size:11px;opacity:0.7">'+esc(item.account||'Any')+'</span></td>';
    h+='<td><span class="fin-type-'+item.type+'">'+esc(item.type)+'</span></td>';
    h+='<td class="fin-date">'+(item.lastPaidDate||'—')+'</td>';
    h+='<td><span class="'+statusCls+'">'+statusLabel+'</span></td>';
    h+='<td><button class="btn" onclick="event.stopPropagation();TF.confirmDeleteScheduledItem(\''+item.id+'\')" style="font-size:11px;padding:4px 8px;border-radius:6px">'+icon('trash',11)+'</button></td>';
    h+='</tr>'});

  h+='</tbody></table></div>';

  /* Inactive items (collapsed) */
  if(inactive.length){
    h+='<details style="margin-top:16px"><summary style="cursor:pointer;font-size:13px;opacity:0.6">'+inactive.length+' inactive item'+(inactive.length>1?'s':'')+'</summary>';
    h+='<div class="tb-wrap" style="margin-top:8px"><table class="tb fin-tb"><tbody>';
    inactive.forEach(function(item){
      h+='<tr class="fin-row" style="opacity:0.5;cursor:pointer" onclick="TF.openEditScheduledItem(\''+item.id+'\')">';
      h+='<td>'+esc(item.name)+'</td><td>'+fmtUSD(item.amount)+'</td><td>'+esc(item.frequency)+'</td>';
      h+='<td>'+(item.nextDue||'—')+'</td><td colspan="5"></td></tr>'});
    h+='</tbody></table></div></details>'}

  h+='</div>';
  return h}

/* ═══════════ FINANCE: FORECAST ═══════════ */
function rFinanceForecast(){
  var h='<div class="fin-analytics">';
  var horizon=S.forecastHorizon||90;
  var scenario=S.forecastScenario||'expected';
  var tg=S.forecastToggles||{};
  var acctFilter=S.forecastAccount||'';

  /* Forecast toolbar — compact single row */
  h+='<div style="background:var(--glass);border:1px solid var(--gborder);border-radius:var(--r);padding:12px 16px;margin-bottom:16px">';
  h+='<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">';
  /* Horizon */
  h+='<div style="display:flex;align-items:center;gap:6px"><span style="font-size:10px;color:var(--t4);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Horizon</span>';
  h+='<div class="fin-range-pills-group">';
  [30,60,90,180,365].forEach(function(d){
    h+='<button class="fin-range-pill'+(horizon===d?' on':'')+'" onclick="TF.setForecastHorizon('+d+')" style="font-size:10px;padding:3px 8px">'+d+'d</button>'});
  h+='</div></div>';
  /* Scenario */
  h+='<div style="display:flex;align-items:center;gap:6px"><span style="font-size:10px;color:var(--t4);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Scenario</span>';
  h+='<div class="fin-range-pills-group">';
  [['conservative','Conserv.'],['expected','Expected'],['optimistic','Optimist.']].forEach(function(s){
    h+='<button class="fin-range-pill'+(scenario===s[0]?' on':'')+'" onclick="TF.setForecastScenario(\''+s[0]+'\')" style="font-size:10px;padding:3px 8px">'+s[1]+'</button>'});
  h+='</div></div>';
  /* Account */
  h+='<div style="display:flex;align-items:center;gap:6px"><span style="font-size:10px;color:var(--t4);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Account</span>';
  h+='<select class="fl" style="font-size:10px;padding:3px 8px;min-width:80px;border-radius:6px" onchange="TF.setForecastAccount(this.value)">';
  [['','All'],['brex','Brex'],['mercury','Mercury']].forEach(function(a){
    h+='<option value="'+a[0]+'"'+(acctFilter===a[0]?' selected':'')+'>'+a[1]+'</option>'});
  h+='</select></div>';
  var lastSync=S.accountBalances.length?S.accountBalances[0].capturedAt:null;
  if(lastSync)h+='<span style="font-size:10px;opacity:0.4;margin-left:auto">Synced '+fmtRelative(lastSync)+'</span>';
  h+='</div>';
  /* Sources — collapsible */
  h+='<details style="margin-top:8px"><summary style="cursor:pointer;font-size:10px;color:var(--t4);font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Sources</summary>';
  h+='<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">';
  var toggleDefs=[
    ['campaigns','Campaigns','var(--blue)'],['scheduled','Scheduled','var(--purple50)'],
    ['invoices','Invoices','var(--green)'],['salaries','Salaries','var(--pink)'],
    ['pipeline','Pipeline','var(--amber)'],['oneoff','One-Off','var(--t2)'],
    ['commissions','Commissions','var(--amber)']];
  toggleDefs.forEach(function(td){
    var isOn=tg[td[0]]!==false;
    h+='<button class="fin-toggle'+(isOn?' on':'')+'" style="font-size:10px;padding:2px 8px;'+(isOn?'border-color:'+td[2]+';color:'+td[2]:'')+ '" onclick="TF.toggleForecastSource(\''+td[0]+'\')">'+td[1]+'</button>'});
  h+='</div></details>';
  h+='</div>';

  /* Build forecast */
  var fc=buildForecast(horizon,scenario);
  var metrics=getForecastMetrics(fc);

  /* Metric cards — bigger, gradient borders */
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:20px">';
  h+='<div class="chart-card" style="text-align:center;padding:20px;border-left:3px solid var(--blue)"><div style="font-size:11px;opacity:0.5;margin-bottom:4px">Current Balance</div><div style="font-size:22px;font-weight:700;color:var(--blue)">'+fmtUSD(fc.startingBalance)+'</div></div>';
  h+='<div class="chart-card" style="text-align:center;padding:20px;border-left:3px solid '+(metrics.day30>=0?'var(--green)':'var(--red)')+'"><div style="font-size:11px;opacity:0.5;margin-bottom:4px">30-Day Forecast</div><div style="font-size:22px;font-weight:700;color:'+(metrics.day30>=0?'var(--green)':'var(--red)')+'">'+fmtUSD(metrics.day30)+'</div></div>';
  h+='<div class="chart-card" style="text-align:center;padding:20px;border-left:3px solid var(--red)"><div style="font-size:11px;opacity:0.5;margin-bottom:4px">Monthly Burn</div><div style="font-size:22px;font-weight:700;color:var(--red)">'+fmtUSD(metrics.burnRate)+'</div></div>';
  var rwColor=metrics.runway<30?'var(--red)':metrics.runway<90?'var(--amber)':'var(--green)';
  h+='<div class="chart-card" style="text-align:center;padding:20px;border-left:3px solid '+rwColor+'"><div style="font-size:11px;opacity:0.5;margin-bottom:4px">Runway</div><div style="font-size:22px;font-weight:700;color:'+rwColor+'">'+(metrics.runway>=fc.horizonDays?'> '+fc.horizonDays+'d':metrics.runway+' days')+'</div></div>';
  if(metrics.nextBigIn)h+='<div class="chart-card" style="text-align:center;padding:20px;border-left:3px solid var(--green)"><div style="font-size:11px;opacity:0.5;margin-bottom:4px">Next Big Inflow</div><div style="font-size:18px;font-weight:700;color:var(--green)">'+fmtUSD(metrics.nextBigIn.amount)+'</div><div style="font-size:10px;opacity:0.5;margin-top:2px">'+esc(metrics.nextBigIn.name)+'</div></div>';
  if(metrics.nextBigOut)h+='<div class="chart-card" style="text-align:center;padding:20px;border-left:3px solid var(--red)"><div style="font-size:11px;opacity:0.5;margin-bottom:4px">Next Big Outflow</div><div style="font-size:18px;font-weight:700;color:var(--red)">'+fmtUSD(metrics.nextBigOut.amount)+'</div><div style="font-size:10px;opacity:0.5;margin-top:2px">'+esc(metrics.nextBigOut.name)+'</div></div>';
  h+='</div>';

  /* Main forecast chart */
  h+='<div class="chart-card" style="margin-bottom:20px">';
  h+='<h3 style="margin-bottom:12px">Projected Balance</h3>';
  h+='<div class="chart-wrap" style="height:300px"><canvas id="fin-forecast-chart"></canvas></div>';
  h+='</div>';

  /* Weekly inflows vs outflows */
  h+='<div class="chart-card" style="margin-bottom:20px">';
  h+='<h3 style="margin-bottom:12px">Weekly Cash Flow Breakdown</h3>';
  h+='<div class="chart-wrap" style="height:250px"><canvas id="fin-forecast-cashflow"></canvas></div>';
  h+='</div>';

  /* Forecast detail breakdown */
  h+='<h3 style="margin:20px 0 12px;font-size:14px;opacity:0.7">Forecast Sources</h3>';

  /* Scheduled expenses */
  var schedOut=S.scheduledItems.filter(function(i){return i.isActive&&i.direction==='outflow'&&i.frequency!=='once'});
  var schedIn=S.scheduledItems.filter(function(i){return i.isActive&&i.direction==='inflow'&&i.frequency!=='once'});

  h+='<details open style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600;font-size:13px;padding:8px 0">'+icon('refresh',14)+' Scheduled Expenses ('+schedOut.length+')'+(tg.scheduled===false?' <span style="font-size:10px;color:var(--amber);margin-left:6px">OFF</span>':'')+'</summary>';
  if(schedOut.length){
    h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr><th>Name</th><th>Amount</th><th>Frequency</th><th>Next Due</th><th>End Date</th><th>Confidence</th></tr></thead><tbody>';
    schedOut.forEach(function(i){
      h+='<tr class="fin-row"><td>'+esc(i.name)+'</td><td style="color:var(--red)">-'+fmtUSD(i.amount)+'</td>';
      h+='<td>'+esc(i.frequency)+'</td><td>'+(i.nextDue||'—')+'</td><td>'+(i.endDate||'—')+'</td><td>100%</td></tr>'});
    h+='</tbody></table></div>'}
  else h+='<div style="opacity:0.5;font-size:13px;padding:8px">No scheduled expenses</div>';
  h+='</details>';

  /* Team costs */
  var activeTeam=S.teamMembers.filter(function(m){return m.isActive&&m.salary>0});
  h+='<details style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600;font-size:13px;padding:8px 0">'+icon('clients',14)+' Team Costs ('+activeTeam.length+')'+(tg.salaries===false?' <span style="font-size:10px;color:var(--amber);margin-left:6px">OFF</span>':'')+'</summary>';
  if(activeTeam.length){
    h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr><th>Name</th><th>Salary</th><th>Pay Frequency</th><th>Pay Day</th><th>Est. Commission</th><th>Confidence</th></tr></thead><tbody>';
    activeTeam.forEach(function(m){
      var est=estimateMonthlyCommission(m);
      h+='<tr class="fin-row"><td>'+esc(m.name)+'</td><td style="color:var(--red)">-'+fmtUSD(m.salary)+'</td>';
      h+='<td>'+esc(m.payFrequency)+'</td><td>'+m.payDay+'</td>';
      h+='<td style="color:var(--amber)">'+(est>0?'-'+fmtUSD(est)+'/mo':'—')+'</td>';
      h+='<td>100%</td></tr>'});
    h+='</tbody></table></div>'}
  else h+='<div style="opacity:0.5;font-size:13px;padding:8px">No team members</div>';
  h+='</details>';

  /* Confirmed inflows (pending invoices) */
  var pendInv=S.financePayments.filter(function(p){return p.type==='invoice'&&p.pendingAmount>0&&p.status!=='excluded'});
  h+='<details style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600;font-size:13px;padding:8px 0">'+icon('file',14)+' Confirmed Inflows ('+pendInv.length+')'+(tg.invoices===false?' <span style="font-size:10px;color:var(--amber);margin-left:6px">OFF</span>':'')+'</summary>';
  if(pendInv.length){
    h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr><th>Payer</th><th>Amount</th><th>Expected Date</th><th>Status</th><th>Confidence</th></tr></thead><tbody>';
    pendInv.forEach(function(p){
      var expDate=p.expectedPaymentDate||(p.date?fmtDate(new Date(new Date(p.date).getTime()+30*86400000)):'Unknown');
      var clearing=typeof isInClearing==='function'&&isInClearing(p);
      h+='<tr class="fin-row"><td>'+esc(p.payerName||p.description)+'</td><td style="color:var(--green)">+'+fmtUSD(p.pendingAmount)+'</td>';
      h+='<td>'+esc(expDate)+'</td>';
      h+='<td>'+(clearing?'<span class="fin-clearing-badge"><span class="fin-clearing-dot"></span> Clearing</span>':'Confirmed')+'</td>';
      h+='<td>100%</td></tr>'});
    h+='</tbody></table></div>'}
  else h+='<div style="opacity:0.5;font-size:13px;padding:8px">No pending invoices</div>';
  h+='</details>';

  /* Pipeline — with net after fees */
  var pipeItems=S.opportunities.filter(function(o){return o.stage!=='Closed Won'&&o.stage!=='Closed Lost'&&o.expectedClose});
  h+='<details style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600;font-size:13px;padding:8px 0">'+icon('gem',14)+' Pipeline ('+pipeItems.length+')'+(tg.pipeline===false?' <span style="font-size:10px;color:var(--amber);margin-left:6px">OFF</span>':'')+'</summary>';
  if(pipeItems.length){
    h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr><th>Opportunity</th><th>Value</th><th>Fee %</th><th>Net (after fees)</th><th>Expected Close</th><th>Probability</th><th>Weighted</th></tr></thead><tbody>';
    pipeItems.sort(function(a,b){
      var ad=a.expectedClose instanceof Date?a.expectedClose.toISOString():a.expectedClose||'';
      var bd=b.expectedClose instanceof Date?b.expectedClose.toISOString():b.expectedClose||'';
      return ad.localeCompare(bd)}).forEach(function(o){
      var val=(o.strategyFee||0)+(o.setupFee||0);
      var feePct=o.processingFeePct||0;
      var netVal=val*(1-feePct/100);
      var prob=o.probability||0;
      var weighted=netVal*(prob/100);
      var closeStr=o.expectedClose instanceof Date?fmtDate(o.expectedClose):(o.expectedClose||'');
      h+='<tr class="fin-row"><td>'+esc(o.name)+'</td><td>'+fmtUSD(val)+'</td>';
      h+='<td>'+(feePct>0?feePct+'%':'—')+'</td>';
      h+='<td>'+fmtUSD(netVal)+'</td>';
      h+='<td>'+closeStr+'</td><td>'+prob+'%</td><td style="color:var(--green)">+'+fmtUSD(weighted)+'</td></tr>';
      /* Monthly fee projection */
      if(o.monthlyFee>0){
        var dur=o.expectedMonthlyDuration||12;
        var monthlyNet=o.monthlyFee*(1-feePct/100);
        h+='<tr class="fin-row" style="opacity:0.6"><td style="padding-left:24px">↳ Monthly fee × '+dur+'mo</td>';
        h+='<td>'+fmtUSD(o.monthlyFee)+'/mo</td><td></td>';
        h+='<td>'+fmtUSD(monthlyNet)+'/mo</td>';
        h+='<td colspan="2"></td><td style="color:var(--green)">+'+fmtUSD(monthlyNet*dur*(prob/100))+'</td></tr>'}});
    h+='</tbody></table></div>'}
  else h+='<div style="opacity:0.5;font-size:13px;padding:8px">No pipeline opportunities with expected close dates</div>';
  h+='</details>';

  /* Scheduled inflows */
  if(schedIn.length){
    h+='<details style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600;font-size:13px;padding:8px 0">'+icon('activity',14)+' Scheduled Inflows ('+schedIn.length+')</summary>';
    h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr><th>Name</th><th>Amount</th><th>Frequency</th><th>Next Due</th><th>End Date</th><th>Confidence</th></tr></thead><tbody>';
    schedIn.forEach(function(i){
      h+='<tr class="fin-row"><td>'+esc(i.name)+'</td><td style="color:var(--green)">+'+fmtUSD(i.amount)+'</td>';
      h+='<td>'+esc(i.frequency)+'</td><td>'+(i.nextDue||'—')+'</td><td>'+(i.endDate||'—')+'</td><td>100%</td></tr>'});
    h+='</tbody></table></div></details>'}

  /* One-off payments */
  var oneOffs=S.scheduledItems.filter(function(i){return i.frequency==='once'&&i.isActive});
  if(oneOffs.length){
    h+='<details style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600;font-size:13px;padding:8px 0">'+icon('file',14)+' One-Off Payments ('+oneOffs.length+')'+(tg.oneoff===false?' <span style="font-size:10px;color:var(--amber);margin-left:6px">OFF</span>':'')+'</summary>';
    h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr><th>Name</th><th>Amount</th><th>Direction</th><th>Due Date</th><th>Confidence</th></tr></thead><tbody>';
    oneOffs.forEach(function(i){
      var dirCol=i.direction==='inflow'?'var(--green)':'var(--red)';
      h+='<tr class="fin-row"><td>'+esc(i.name)+'</td><td style="color:'+dirCol+'">'+(i.direction==='outflow'?'-':'+')+fmtUSD(i.amount)+'</td>';
      h+='<td>'+esc(i.direction)+'</td><td>'+(i.nextDue||'—')+'</td><td>100%</td></tr>'});
    h+='</tbody></table></div></details>'}

  /* Campaign revenue breakdown */
  var activeCampaigns=S.campaigns.filter(function(c){return c.status==='Active'||c.status==='Setup'});
  if(activeCampaigns.length&&tg.campaigns!==false){
    h+='<details style="margin-bottom:12px"><summary style="cursor:pointer;font-weight:600;font-size:13px;padding:8px 0">'+icon('target',14)+' Campaign Revenue ('+activeCampaigns.length+')</summary>';
    h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr><th>Campaign</th><th>Billing Frequency</th><th>Next Billing</th><th>Monthly Fees</th></tr></thead><tbody>';
    activeCampaigns.forEach(function(c){
      var monthlyFee=(c.monthlyFee||0);
      h+='<tr class="fin-row"><td>'+esc(c.name)+'</td>';
      h+='<td>'+esc(c.billingFrequency||'monthly')+'</td>';
      h+='<td>'+(c.nextBillingDate||'—')+'</td>';
      h+='<td style="color:var(--green)">+'+fmtUSD(monthlyFee)+'/mo</td></tr>'});
    h+='</tbody></table></div></details>'}

  h+='</div>';
  return h}

function initForecastCharts(){
  setTimeout(function(){
    var horizon=S.forecastHorizon||90;
    var scenario=S.forecastScenario||'expected';
    var fc=buildForecast(horizon,scenario);
    if(!fc.days.length)return;

    /* Balance line chart */
    var labels=[];var balances=[];
    var step=Math.max(1,Math.floor(fc.days.length/60));
    fc.days.forEach(function(d,i){
      if(i%step===0||i===fc.days.length-1){labels.push(d.date.substring(5));balances.push(d.balance)}});

    var el=document.getElementById('fin-forecast-chart');
    if(el){
      var ctx=el.getContext('2d');
      if(charts['fin-forecast-chart']){charts['fin-forecast-chart'].destroy()}
      charts['fin-forecast-chart']=new Chart(ctx,{type:'line',
        data:{labels:labels,datasets:[{
          label:'Projected Balance',data:balances,
          borderColor:balances[balances.length-1]>=0?'#3ddc84':'#ff3358',
          backgroundColor:function(context){
            var chart=context.chart;var{ctx:c,chartArea}=chart;
            if(!chartArea)return null;
            var gradient=c.createLinearGradient(0,chartArea.top,0,chartArea.bottom);
            gradient.addColorStop(0,'rgba(61,220,132,0.15)');
            gradient.addColorStop(1,'rgba(61,220,132,0)');
            return gradient},
          fill:true,tension:0.3,pointRadius:0,borderWidth:2}]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:false},
            tooltip:{callbacks:{label:function(ctx){return'Balance: '+fmtUSD(ctx.parsed.y)}}},
            annotation:{annotations:{zero:{type:'line',yMin:0,yMax:0,borderColor:'rgba(255,51,88,0.5)',borderWidth:1,borderDash:[5,5]}}}},
          scales:{x:{ticks:{maxTicksLimit:12,font:{size:10}},grid:{display:false}},
            y:{ticks:{callback:function(v){return'$'+Math.round(v/1000)+'k'},font:{size:10}},grid:{color:'rgba(255,255,255,0.05)'}}}}
      })}

    /* Weekly cash flow bar chart */
    var weekLabels=[];var weekIn=[];var weekOut=[];
    var weekSize=7;
    for(var w=0;w<fc.days.length;w+=weekSize){
      var end=Math.min(w+weekSize,fc.days.length);
      var wIn=0,wOut=0;
      for(var d=w;d<end;d++){wIn+=fc.days[d].totalIn;wOut+=fc.days[d].totalOut}
      weekLabels.push(fc.days[w].date.substring(5));weekIn.push(wIn);weekOut.push(-wOut)}

    var el2=document.getElementById('fin-forecast-cashflow');
    if(el2){
      var ctx2=el2.getContext('2d');
      if(charts['fin-forecast-cashflow']){charts['fin-forecast-cashflow'].destroy()}
      charts['fin-forecast-cashflow']=new Chart(ctx2,{type:'bar',
        data:{labels:weekLabels,datasets:[
          {label:'Inflows',data:weekIn,backgroundColor:'rgba(61,220,132,0.7)',stack:'a'},
          {label:'Outflows',data:weekOut,backgroundColor:'rgba(255,51,88,0.7)',stack:'a'}
        ]},
        options:{responsive:true,maintainAspectRatio:false,
          plugins:{legend:{labels:{font:{size:10},usePointStyle:true,color:'rgba(255,255,255,0.6)'}},
            tooltip:{callbacks:{label:function(ctx){return ctx.dataset.label+': '+fmtUSD(Math.abs(ctx.parsed.y))}}}},
          scales:{x:{stacked:true,ticks:{maxTicksLimit:12,font:{size:10}},grid:{display:false}},
            y:{stacked:true,ticks:{callback:function(v){return'$'+Math.round(v/1000)+'k'},font:{size:10}},grid:{color:'rgba(255,255,255,0.05)'}}}}
      })}
  },250)}

/* ═══════════ FINANCE: TEAM ═══════════ */
function rFinanceTeam(){
  var h='<div class="fin-analytics">';
  var members=S.teamMembers;
  var active=members.filter(function(m){return m.isActive});
  var inactive=members.filter(function(m){return !m.isActive});

  /* Summary cards */
  var totalPayroll=active.reduce(function(s,m){return s+m.salary},0);
  var totalAccruedComm=0;
  var totalEstMonthlyComm=0;
  active.forEach(function(m){
    var tally=getCommissionTally(m);
    totalAccruedComm+=tally.accrued;
    totalEstMonthlyComm+=estimateMonthlyCommission(m)});

  h+='<div class="cp-dash" style="margin-bottom:20px">';
  h+=dashMet('Monthly Payroll',fmtUSD(totalPayroll),'var(--red)');
  h+=dashMet('Annual Payroll',fmtUSD(totalPayroll*12),'var(--red)');
  h+=dashMet('Team Size',active.length,'var(--blue)');
  h+=dashMet('Accrued Commission',fmtUSD(totalAccruedComm),totalAccruedComm>0?'var(--amber)':'var(--muted)');
  h+=dashMet('Est. Monthly Commission',fmtUSD(totalEstMonthlyComm),totalEstMonthlyComm>0?'var(--amber)':'var(--muted)');
  h+='</div>';

  /* Active members table */
  h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr>';
  h+='<th>Name</th><th>Role</th><th>Salary</th><th>Pay Schedule</th>';
  h+='<th>Commission</th><th>Commission Owed</th><th>Annual Cost</th><th></th>';
  h+='</tr></thead><tbody>';

  if(!active.length)h+='<tr><td colspan="8" style="text-align:center;opacity:0.5;padding:32px">No team members yet. Click "+ Add Member" to get started.</td></tr>';

  active.forEach(function(m){
    var annualSalary=m.salary*12;
    var tally=getCommissionTally(m);
    var estMonthly=estimateMonthlyCommission(m);
    var estAnnual=annualSalary+(estMonthly*12);

    h+='<tr class="fin-row" onclick="TF.openEditTeamMember(\''+m.id+'\')" style="cursor:pointer">';
    h+='<td><span class="fin-payer-name">'+esc(m.name)+'</span></td>';
    h+='<td><span style="font-size:11px;opacity:0.7">'+esc(m.role||'—')+'</span></td>';
    h+='<td style="font-weight:600">'+fmtUSD(m.salary)+'/mo</td>';
    h+='<td><span style="font-size:11px;opacity:0.7">'+esc(m.payFrequency)+' (day '+m.payDay+')</span></td>';
    h+='<td>';
    if(m.commissionRate>0){
      h+=m.commissionRate+'% of '+esc(m.commissionBasis||'revenue');
      h+='<div style="font-size:10px;opacity:0.5">'+esc((m.commissionFrequency||'monthly'))+(m.commissionCap?' • Cap: '+fmtUSD(m.commissionCap):'')+'</div>'}
    else h+='<span style="opacity:0.4">None</span>';
    h+='</td>';
    h+='<td>';
    if(tally.accrued>0)h+='<span style="font-weight:600;color:var(--amber)">'+fmtUSD(tally.accrued)+'</span>';
    else h+='<span style="opacity:0.4">—</span>';
    h+='</td>';
    h+='<td style="font-weight:600;color:var(--red)">'+fmtUSD(estAnnual)+'/yr</td>';
    h+='<td><button class="btn" onclick="event.stopPropagation();TF.confirmDeleteTeamMember(\''+m.id+'\')" style="font-size:11px;padding:4px 8px;border-radius:6px">'+icon('trash',11)+'</button></td>';
    h+='</tr>'});

  h+='</tbody></table></div>';

  /* Commission forecast section */
  if(active.some(function(m){return m.commissionRate>0})){
    h+='<div class="chart-card" style="margin-top:16px">';
    h+='<h3 style="margin-bottom:12px">'+icon('activity',14)+' Commission Forecast</h3>';
    h+='<div class="tb-wrap"><table class="tb fin-tb"><thead><tr>';
    h+='<th>Name</th><th>Basis</th><th>Rate</th><th>Est. Monthly</th><th>Frequency</th><th>Next Payment</th>';
    h+='</tr></thead><tbody>';
    active.filter(function(m){return m.commissionRate>0}).forEach(function(m){
      var tally=getCommissionTally(m);
      var est=estimateMonthlyCommission(m);
      h+='<tr class="fin-row">';
      h+='<td>'+esc(m.name)+'</td>';
      h+='<td>'+esc(m.commissionBasis||'—')+'</td>';
      h+='<td>'+m.commissionRate+'%</td>';
      h+='<td style="color:var(--amber);font-weight:600">'+fmtUSD(est)+'</td>';
      h+='<td>'+esc(m.commissionFrequency||'monthly')+'</td>';
      h+='<td>'+(tally.nextPayDate||'—')+'</td></tr>'});
    h+='</tbody></table></div></div>'}

  /* Inactive members */
  if(inactive.length){
    h+='<details style="margin-top:16px"><summary style="cursor:pointer;font-size:13px;opacity:0.6">'+inactive.length+' inactive member'+(inactive.length>1?'s':'')+'</summary>';
    h+='<div class="tb-wrap" style="margin-top:8px"><table class="tb fin-tb"><tbody>';
    inactive.forEach(function(m){
      h+='<tr class="fin-row" style="opacity:0.5;cursor:pointer" onclick="TF.openEditTeamMember(\''+m.id+'\')">';
      h+='<td>'+esc(m.name)+'</td><td>'+esc(m.role)+'</td><td>'+fmtUSD(m.salary)+'</td>';
      h+='<td colspan="5"></td></tr>'});
    h+='</tbody></table></div></details>'}

  h+='</div>';
  return h}

