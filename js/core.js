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

/* ═══════════ LUCIDE ICONS ═══════════ */
var ICONS={
  today:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  tasks:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5h8"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/></svg>',
  pipeline:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>',
  clients:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/></svg>',
  dashboard:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  plus:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  play:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
  pause:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/></svg>',
  refresh:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
  logout:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>',
  search:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/></svg>',
  x:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  save:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>',
  trash:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 11v6"/><path d="M14 11v6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  edit:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>',
  pin:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>',
  flag:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>',
  calendar:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>',
  clock:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  target:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  gem:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>',
  folder:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  mail:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
  file:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  flame:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  zap:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>',
  inbox:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  alert:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  activity:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>',
  menu:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>',
  chevron_down:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  chevron_right:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  grip:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
  mic:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>',
  link:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  check:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
};
function icon(name,size){var s=ICONS[name]||'';if(size&&s){s=s.replace(/width="\d+"/,'width="'+size+'"').replace(/height="\d+"/,'height="'+size+'"')}return s}

var PAY_CATS=['Products','Retain Live','F&C Campaign Set-Up','F&C Strategy','F&C Monthly Fees','Other'];
var EXPENSE_CATS=['Software & SaaS','Advertising & Marketing','Travel','Food & Dining','Office & Supplies','Professional Services','Subscriptions','Insurance','Taxes & Fees','Personal','Uncategorised'];

/* ═══════════ OPPORTUNITY TYPE CONFIG ═══════════ */
var OPP_TYPES={
  retain_live:{label:'Retain Live',short:'RL',
    stages:['Meeting Booked','Agreement Sent'],
    closedStages:['Closed Won','Closed Lost'],
    color:'var(--green)',conversion:'client',
    defaultFees:{strategyFee:5000}},
  fc_partnership:{label:'F&C Partnership',short:'F&C-P',
    stages:['Contact Identified','Outreach Initiated','Meeting Booked','Discovery Call','Video Tracking','Audit/Report','Proactive Pitch','Negotiation'],
    closedStages:['Closed Won','Closed Lost'],
    color:'var(--blue)',conversion:'campaign',
    defaultFees:{}},
  fc_direct:{label:'F&C Direct',short:'F&C-D',
    stages:['Lead Generated','Discovery Call','Video Tracking','Proactive Pitch','Negotiation'],
    closedStages:['Closed Won','Closed Lost'],
    color:'var(--purple50)',conversion:'campaign',
    defaultFees:{}}
};
function oppTypeConf(type){return OPP_TYPES[type]||OPP_TYPES.fc_partnership}
function oppAllStages(type){var c=oppTypeConf(type);return c.stages.concat(c.closedStages)}
function oppIsClosedStage(stage){return stage==='Closed Won'||stage==='Closed Lost'}

var S={tasks:[],done:[],review:[],clients:[],campaigns:[],payments:[],campaignMeetings:[],projects:[],phases:[],opportunities:[],oppMeetings:[],timers:{},view:'today',subView:'',layout:'grid',groupBy:'importance',
  templates:[],bulkMode:false,bulkSelected:{},calEvents:[],
  pins:{},actLogs:{},customOrder:[],schedOrder:{},projTaskOrder:{},focusTask:null,focusDuration:25,recurrLast:{},
  filters:{client:'',endClient:'',campaign:'',project:'',opportunity:'',cat:'',imp:'',type:'',search:'',dateFrom:'',dateTo:''},dashPeriod:30,collapsed:{},doneSort:'date',cpShowPaused:false,cpShowCompleted:false,opShowClosed:false,opTypeFilter:'',
  financePayments:[],financePaymentSplits:[],clientRecords:[],payerMap:[],finFilter:'unmatched',finSearch:'',finBulkMode:false,finBulkSelected:{},finRange:'12m',finCatFilter:'',finClientFilter:'',finCustomStart:'',finCustomEnd:'',finDirection:'',integrations:[],
  accountBalances:[],scheduledItems:[],teamMembers:[],forecastHorizon:90,forecastScenario:'expected'};

var SECTIONS=[
  {id:'today',icon:'calendar',label:'Schedule',kbd:'1',subs:[
    {id:'capacity',label:'Weekly Capacity',icon:'activity'},
    {id:'schedule',label:'Suggested Schedule',icon:'calendar'},
    {id:'day',label:"Today's Schedule",icon:'today'},
    {id:'prep',label:'Meeting Prep',icon:'users'}
  ]},
  {id:'tasks',icon:'tasks',label:'Tasks',kbd:'2',subs:[
    {id:'open',label:'Open Tasks',icon:'tasks'},
    {id:'done',label:'Completed',icon:'check'},
    {id:'review',label:'Review Queue',icon:'inbox'}
  ]},
  {id:'opportunities',icon:'gem',label:'Opportunities',kbd:'3',subs:[
    {id:'pipeline',label:'Pipeline',icon:'pipeline'},
    {id:'list',label:'List',icon:'menu'},
    {id:'analytics',label:'Analytics',icon:'dashboard'}
  ]},
  {id:'campaigns',icon:'target',label:'Campaigns',kbd:'4',subs:[
    {id:'pipeline',label:'Pipeline',icon:'target'},
    {id:'list',label:'List',icon:'menu'},
    {id:'performance',label:'Performance',icon:'activity'}
  ]},
  {id:'projects',icon:'folder',label:'Projects',kbd:'5',subs:[
    {id:'board',label:'Board',icon:'grip'},
    {id:'list',label:'List',icon:'menu'},
    {id:'timeline',label:'Timeline',icon:'calendar'}
  ]},
  {id:'clients',icon:'clients',label:'Clients',kbd:'6',subs:[
    {id:'directory',label:'Directory',icon:'clients'},
    {id:'analytics',label:'Analytics',icon:'dashboard'}
  ]},
  {id:'dashboard',icon:'dashboard',label:'Dashboard',kbd:'7'},
  {id:'finance',icon:'activity',label:'Finance',kbd:'8',subs:[
    {id:'overview',label:'Overview',icon:'dashboard'},
    {id:'payments',label:'Transactions',icon:'activity'},
    {id:'invoices',label:'Invoices',icon:'file'},
    {id:'upcoming',label:'Upcoming',icon:'calendar'},
    {id:'recurring',label:'Recurring',icon:'refresh'},
    {id:'forecast',label:'Forecast',icon:'pipeline'},
    {id:'team',label:'Team',icon:'clients'}
  ]}
];
var VIEWS_FLAT=[];
SECTIONS.forEach(function(sec){
  VIEWS_FLAT.push(sec);
  if(sec.subs)sec.subs.forEach(function(sub){
    VIEWS_FLAT.push({id:sec.id,subId:sub.id,icon:sub.icon,label:sec.label+' → '+sub.label})})});

/* ═══════════ SUB-SECTION HELPERS ═══════════ */
function currentSection(){return SECTIONS.find(function(s){return s.id===S.view})}
function hasSubs(sectionId){var sec=SECTIONS.find(function(s){return s.id===(sectionId||S.view)});return sec&&sec.subs&&sec.subs.length>0}
function getDefaultSub(sectionId){var sec=SECTIONS.find(function(s){return s.id===sectionId});return sec&&sec.subs?sec.subs[0].id:''}
function subNav(subId){S.subView=subId;save();render()}

/* ═══════════ MOBILE ═══════════ */
function isMobile(){return window.innerWidth<=860}
var MOB_VIEWS=[
  {id:'mob-add',icon:'plus',label:'Add'},
  {id:'today',icon:'calendar',label:'Schedule'},
  {id:'tasks',icon:'tasks',label:'Tasks'},
  {id:'opportunities',icon:'gem',label:'Opps'}
];

/* ═══════════ UTILS ═══════════ */
function gel(id){return document.getElementById(id)}
function cel(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!==undefined)e.innerHTML=html;return e}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function escAttr(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'")}
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
function fmtDate(d){if(!d)return'';if(typeof d==='string')return d;return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function fmtRelative(d){if(!d)return'';var now=new Date();var dt=d instanceof Date?d:new Date(d);
  var diff=Math.floor((now-dt)/1000);if(diff<60)return'just now';if(diff<3600)return Math.floor(diff/60)+'m ago';
  if(diff<86400)return Math.floor(diff/3600)+'h ago';return Math.floor(diff/86400)+'d ago'}
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

/* ═══════════ TIMERS ═══════════ */
function tmrGet(id){return S.timers[id]||{started:null,elapsed:0}}
function tmrElapsed(id){var t=tmrGet(id);return(t.elapsed||0)+(t.started?(Date.now()-t.started)/1000:0)}
function tmrStart(id){var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var t=tmrGet(id);if(t.started)return;t.started=Date.now();S.timers[id]=t;save();
  toast('Started: '+task.item,'ok');render();renderSidebar();renderActiveWidget();
  if(gel('detail-modal')&&gel('detail-modal').classList.contains('on')&&gel('d-id')&&gel('d-id').value===id)openDetail(id)}
function tmrPause(id){var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var t=tmrGet(id);if(!t.started)return;t.elapsed=(t.elapsed||0)+(Date.now()-t.started)/1000;t.started=null;S.timers[id]=t;save();
  var mins=Math.round(t.elapsed/60);
  task.duration=mins;
  dbUpdateTaskDuration(id,mins);
  toast('Paused: '+task.item+' ('+fmtM(mins)+')','info');render();renderSidebar();renderActiveWidget();
  if(gel('detail-modal')&&gel('detail-modal').classList.contains('on')&&gel('d-id')&&gel('d-id').value===id)openDetail(id)}
function tmrDone(id){var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var t=tmrGet(id);if(t.started){t.elapsed=(t.elapsed||0)+(Date.now()-t.started)/1000;t.started=null}
  var mins=Math.round((t.elapsed||0)/60);
  if(mins===0&&task.duration>0)mins=task.duration;
  var cards=document.querySelectorAll('[data-task-id]');cards.forEach(function(c){if(c.dataset.taskId===id)c.classList.add('completing')});
  setTimeout(async function(){
    var doneData={item:task.item,due:task.due||null,importance:task.importance,category:task.category,
      client:task.client,endClient:task.endClient||'',type:task.type,duration:mins,est:task.est,
      notes:task.notes,campaign:task.campaign||'',project:task.project||'',phase:task.phase||'',opportunity:task.opportunity||''};
    var result=await dbCompleteTask(doneData);
    if(result){
      await dbDeleteTask(id);
      S.done.unshift({id:result.id,item:task.item,completed:new Date(),due:task.due||null,importance:task.importance,
        category:task.category,client:task.client,endClient:task.endClient||'',type:task.type,
        duration:mins,est:task.est,notes:task.notes,campaign:task.campaign||'',project:task.project||'',phase:task.phase||'',opportunity:task.opportunity||''});
      S.tasks=S.tasks.filter(function(tk){return tk.id!==id});delete S.timers[id];save();
      toast('Done: '+task.item+(mins?' ('+fmtM(mins)+')':''),'ok')}
    closeModal();render();renderSidebar();renderActiveWidget()},500)}

async function addTimeToTask(id,mins){
  if(!mins||mins<=0){toast('Enter valid minutes','warn');return}
  var task=S.tasks.find(function(t){return t.id===id});if(!task)return;
  var t=tmrGet(id);t.elapsed=(t.elapsed||0)+(mins*60);S.timers[id]=t;
  task.duration=(task.duration||0)+mins;
  save();
  await dbUpdateTaskDuration(id,task.duration);
  addLog(id,'Added '+mins+' mins manually');
  toast('Added '+mins+' mins','ok');
  openDetail(id)}

/* Timer tick */
setInterval(function(){
  var anyActive=false;
  Object.keys(S.timers).forEach(function(id){if(!S.timers[id].started)return;anyActive=true;
    var els=document.querySelectorAll('[data-tmr="'+CSS.escape(id)+'"]');
    els.forEach(function(el){el.textContent=fmtT(tmrElapsed(id))})});
  if(anyActive){renderSidebar();renderActiveWidget()}},1000);

/* ═══════════ SIDEBAR ═══════════ */
function renderSidebar(){
  var c=gel('s-active');if(!c)return;
  var h='';
  h+='<div class="sb-qa"><input type="text" id="qa-item" class="sb-qa-input" placeholder="Quick add task..." onkeydown="if(event.key===\'Enter\')TF.quickAdd()"><button class="sb-qa-btn" onclick="TF.quickAdd()">+</button></div>';
  c.innerHTML=h}

/* ═══════════ FLOATING ACTIVE TASKS WIDGET ═══════════ */
function getActiveTimers(){
  var active=[];
  Object.keys(S.timers).forEach(function(id){var t=S.timers[id];
    if(t.started||(t.elapsed||0)>0){var task=S.tasks.find(function(tk){return tk.id===id});
      if(task)active.push({task:task,running:!!t.started})}});
  active.sort(function(a,b){if(a.running!==b.running)return a.running?-1:1;return tmrElapsed(b.task.id)-tmrElapsed(a.task.id)});
  return active}

function renderActiveWidget(){
  var w=gel('at-widget');if(!w)return;
  var active=getActiveTimers();
  if(!active.length){w.classList.add('hidden');return}
  w.classList.remove('hidden');
  /* Update title */
  var title=gel('at-title');
  var totalSec=0;active.forEach(function(a){totalSec+=tmrElapsed(a.task.id)});
  if(w.classList.contains('minimized')){
    if(title)title.textContent='Active ('+active.length+') \u00b7 '+fmtT(totalSec);
  }else{
    if(title)title.textContent='Active ('+active.length+')';
  }
  /* Build body */
  var body=gel('at-body');if(!body)return;
  var h='';
  active.forEach(function(a){var eid=escAttr(a.task.id);
    h+='<div class="sa-item" onclick="TF.openDetail(\''+eid+'\')">';
    h+='<span class="dot '+(a.running?'pulse':'pau')+'" style="flex-shrink:0"></span>';
    h+='<span class="sa-name">'+esc(a.task.item)+'</span>';
    h+='<span class="sa-time'+(a.running?' running':' paused')+'" data-tmr="'+esc(a.task.id)+'">'+fmtT(tmrElapsed(a.task.id))+'</span>';
    if(a.running)h+='<button class="sa-btn sa-btn-pa" onclick="event.stopPropagation();TF.pause(\''+eid+'\')" title="Pause">'+icon('pause',12)+'</button>';
    else h+='<button class="sa-btn sa-btn-go" onclick="event.stopPropagation();TF.start(\''+eid+'\')" title="Resume">'+icon('play',12)+'</button>';
    h+='</div>'});
  body.innerHTML=h}

/* Widget minimize toggle */
function atToggleMin(){
  var w=gel('at-widget');if(!w)return;
  var isMin=!w.classList.contains('minimized');
  w.classList.toggle('minimized');
  var btn=gel('at-min-btn');
  if(btn)btn.textContent=isMin?'+':'\u2212';
  if(isMin){
    /* Save current position, snap to bottom-right */
    w._savedPos={left:w.style.left,top:w.style.top,right:w.style.right,bottom:w.style.bottom};
    w.style.left='auto';w.style.top='auto';w.style.right='20px';w.style.bottom='20px';
  }else{
    /* Restore dragged position */
    if(w._savedPos){w.style.left=w._savedPos.left;w.style.top=w._savedPos.top;w.style.right=w._savedPos.right;w.style.bottom=w._savedPos.bottom}
  }
  try{localStorage.setItem('tf_atmin',isMin?'1':'0')}catch(e){}
  renderActiveWidget()}

/* Widget drag */
(function(){
  var dragging=false,offX=0,offY=0,w,hdr;
  function initDrag(){
    w=gel('at-widget');hdr=gel('at-header');if(!w||!hdr)return setTimeout(initDrag,500);
    /* Restore minimized state */
    var isMin=false;
    try{isMin=localStorage.getItem('tf_atmin')==='1'}catch(e){}
    if(isMin){w.classList.add('minimized');var btn=gel('at-min-btn');if(btn)btn.textContent='+';
      /* Keep at bottom-right when minimized */
      w.style.left='auto';w.style.top='auto';w.style.right='20px';w.style.bottom='20px';
    }else{
      /* Restore dragged position only when expanded */
      try{var pos=JSON.parse(localStorage.getItem('tf_atpos'));
        if(pos&&typeof pos.x==='number'){w.style.right='auto';w.style.bottom='auto';w.style.left=Math.min(pos.x,window.innerWidth-100)+'px';w.style.top=Math.min(pos.y,window.innerHeight-50)+'px'}}catch(e){}
    }
    hdr.addEventListener('mousedown',function(e){
      if(e.target.closest('.at-min-btn'))return;
      dragging=true;var rect=w.getBoundingClientRect();offX=e.clientX-rect.left;offY=e.clientY-rect.top;
      w.classList.add('dragging');e.preventDefault()});
    document.addEventListener('mousemove',function(e){if(!dragging)return;
      var x=e.clientX-offX,y=e.clientY-offY;
      x=Math.max(0,Math.min(x,window.innerWidth-60));y=Math.max(0,Math.min(y,window.innerHeight-40));
      w.style.right='auto';w.style.bottom='auto';w.style.left=x+'px';w.style.top=y+'px'});
    document.addEventListener('mouseup',function(){if(!dragging)return;dragging=false;w.classList.remove('dragging');
      try{localStorage.setItem('tf_atpos',JSON.stringify({x:parseInt(w.style.left),y:parseInt(w.style.top)}))}catch(e){}});
    /* Touch support */
    hdr.addEventListener('touchstart',function(e){
      if(e.target.closest('.at-min-btn'))return;
      var touch=e.touches[0];dragging=true;var rect=w.getBoundingClientRect();offX=touch.clientX-rect.left;offY=touch.clientY-rect.top;
      w.classList.add('dragging')},{passive:true});
    document.addEventListener('touchmove',function(e){if(!dragging)return;
      var touch=e.touches[0];var x=touch.clientX-offX,y=touch.clientY-offY;
      x=Math.max(0,Math.min(x,window.innerWidth-60));y=Math.max(0,Math.min(y,window.innerHeight-40));
      w.style.right='auto';w.style.bottom='auto';w.style.left=x+'px';w.style.top=y+'px'},{passive:true});
    document.addEventListener('touchend',function(){if(!dragging)return;dragging=false;w.classList.remove('dragging');
      try{localStorage.setItem('tf_atpos',JSON.stringify({x:parseInt(w.style.left),y:parseInt(w.style.top)}))}catch(e){}})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initDrag);else initDrag()
})()

/* ═══════════ MODAL TOGGLE SECTIONS ═══════════ */
function modalToggle(id,show){var el=gel(id);if(el)el.style.display=show?'':'none'}

/* ═══════════ PROJECT TASK REORDER ═══════════ */
var _projDragId=null,_projDragPhase=null;
function projDragStart(e,taskId,phaseId){_projDragId=taskId;_projDragPhase=phaseId;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',taskId)}
function projDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move'}
function projDragDrop(e,targetId,targetPhase){e.preventDefault();if(!_projDragId||_projDragId===targetId)return;
  /* Only reorder within same phase */
  if(_projDragPhase!==targetPhase){_projDragId=null;return}
  var key=targetPhase;
  var order=S.projTaskOrder[key]||[];
  /* Ensure both IDs are in the order array */
  if(order.indexOf(_projDragId)===-1)order.push(_projDragId);
  if(order.indexOf(targetId)===-1)order.push(targetId);
  /* Remove dragged and insert before target */
  order=order.filter(function(id){return id!==_projDragId});
  var targetIdx=order.indexOf(targetId);
  order.splice(targetIdx,0,_projDragId);
  S.projTaskOrder[key]=order;_projDragId=null;save();
  /* Re-render the project detail */
  var projId=gel('pj-id');if(projId)openProjectDetail(projId.value)}
function applyProjTaskOrder(tasks,phaseId){
  var order=S.projTaskOrder[phaseId];if(!order||!order.length)return tasks;
  var map={};tasks.forEach(function(t){map[t.id]=t});
  var ordered=[];
  order.forEach(function(id){if(map[id]){ordered.push(map[id]);delete map[id]}});
  Object.keys(map).forEach(function(id){ordered.push(map[id])});
  return ordered}

/* ═══════════ CHARTS ═══════════ */
function killChart(id){if(charts[id]){charts[id].destroy();delete charts[id]}}
function mkDonut(id,data){var el=gel(id);if(!el)return;killChart(id);var labels=Object.keys(data),vals=labels.map(function(k){return data[k]});var cols=labels.map(function(_,i){return P[i%P.length]});
  charts[id]=new Chart(el,{type:'doughnut',data:{labels:labels,datasets:[{data:vals,backgroundColor:cols,borderWidth:0,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:'#a1a1aa',font:{family:'Inter',size:11},padding:10,boxWidth:11}},tooltip:{callbacks:{label:function(c){return c.label+': '+fmtM(c.parsed)}}}}}})}
function mkHBar(id,data){var el=gel(id);if(!el)return;killChart(id);var sorted=Object.keys(data).sort(function(a,b){return data[b]-data[a]});
  charts[id]=new Chart(el,{type:'bar',data:{labels:sorted,datasets:[{data:sorted.map(function(k){return data[k]}),backgroundColor:'rgba(255,0,153,0.45)',hoverBackgroundColor:'rgba(255,0,153,0.65)',borderRadius:6,barThickness:18}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return fmtM(c.parsed.x)}}}},
      scales:{x:{grid:{color:'rgba(255,255,255,0.06)'},ticks:{color:'#52525b',font:{size:10},callback:function(v){return fmtM(v)}}},y:{grid:{display:false},ticks:{color:'#a1a1aa',font:{size:10}}}}}})}
function mkLine(id,labels,vals,color){var el=gel(id);if(!el)return;killChart(id);
  charts[id]=new Chart(el,{type:'line',data:{labels:labels,datasets:[{data:vals,borderColor:color,backgroundColor:color+'12',fill:true,tension:.4,pointRadius:1.5,pointHoverRadius:6,pointBackgroundColor:color,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#52525b',font:{size:9},maxTicksLimit:10}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#52525b',stepSize:1},beginAtZero:true}}}})
}
/* Currency-formatted chart variants */
function mkDonutUSD(id,data){var el=gel(id);if(!el)return;killChart(id);var labels=Object.keys(data),vals=labels.map(function(k){return data[k]});var cols=labels.map(function(_,i){return P[i%P.length]});
  charts[id]=new Chart(el,{type:'doughnut',data:{labels:labels,datasets:[{data:vals,backgroundColor:cols,borderWidth:0,hoverOffset:8}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right',labels:{color:'#a1a1aa',font:{family:'Inter',size:11},padding:10,boxWidth:11}},tooltip:{callbacks:{label:function(c){return c.label+': '+fmtUSD(c.parsed)}}}}}})}
function mkHBarUSD(id,data,color){var el=gel(id);if(!el)return;killChart(id);var sorted=Object.keys(data).sort(function(a,b){return data[b]-data[a]}).slice(0,15);
  var barCol=color||'rgba(61,220,132,0.5)';var hoverCol=color?color.replace('0.5','0.7'):'rgba(61,220,132,0.7)';
  charts[id]=new Chart(el,{type:'bar',data:{labels:sorted,datasets:[{data:sorted.map(function(k){return data[k]}),backgroundColor:barCol,hoverBackgroundColor:hoverCol,borderRadius:6,barThickness:18}]},
    options:{responsive:true,maintainAspectRatio:false,indexAxis:'y',plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return fmtUSD(c.parsed.x)}}}},
      scales:{x:{grid:{color:'rgba(255,255,255,0.06)'},ticks:{color:'#52525b',font:{size:10},callback:function(v){return fmtUSD(v)}}},y:{grid:{display:false},ticks:{color:'#a1a1aa',font:{size:10}}}}}})}
function mkLineUSD(id,labels,vals,color){var el=gel(id);if(!el)return;killChart(id);
  charts[id]=new Chart(el,{type:'line',data:{labels:labels,datasets:[{data:vals,borderColor:color,backgroundColor:color+'22',fill:true,tension:.4,pointRadius:3,pointHoverRadius:7,pointBackgroundColor:color,borderWidth:2.5}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return fmtUSD(c.parsed.y)}}}},
      scales:{x:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#52525b',font:{size:9},maxTicksLimit:12}},y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#52525b',font:{size:10},callback:function(v){return fmtUSD(v)}},beginAtZero:true}}}})
}
function mkStackedBarUSD(id,labels,datasets){var el=gel(id);if(!el)return;killChart(id);
  charts[id]=new Chart(el,{type:'bar',data:{labels:labels,datasets:datasets},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top',labels:{color:'#a1a1aa',font:{family:'Inter',size:10},padding:10,boxWidth:10}},tooltip:{callbacks:{label:function(c){return c.dataset.label+': '+fmtUSD(c.parsed.y)}}}},
      scales:{x:{stacked:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#52525b',font:{size:9},maxTicksLimit:12}},y:{stacked:true,grid:{color:'rgba(255,255,255,0.04)'},ticks:{color:'#52525b',font:{size:10},callback:function(v){return fmtUSD(v)}},beginAtZero:true}}}})}

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
function save(){try{localStorage.setItem('tf_t',JSON.stringify(S.timers));localStorage.setItem('tf_c',JSON.stringify(S.collapsed));localStorage.setItem('tf_ly',S.layout);localStorage.setItem('tf_gb',S.groupBy);localStorage.setItem('tf_tpl',JSON.stringify(S.templates));localStorage.setItem('tf_pins',JSON.stringify(S.pins));localStorage.setItem('tf_ord',JSON.stringify(S.customOrder));localStorage.setItem('tf_so',JSON.stringify(S.schedOrder));localStorage.setItem('tf_pto',JSON.stringify(S.projTaskOrder));localStorage.setItem('tf_rl',JSON.stringify(S.recurrLast));localStorage.setItem('tf_ds',S.doneSort);localStorage.setItem('tf_cpsp',S.cpShowPaused?'1':'');localStorage.setItem('tf_cpsc',S.cpShowCompleted?'1':'');localStorage.setItem('tf_opsc',S.opShowClosed?'1':'');localStorage.setItem('tf_optf',S.opTypeFilter||'');localStorage.setItem('tf_sv',S.view);localStorage.setItem('tf_sv2',S.subView);localStorage.setItem('tf_ftg',JSON.stringify(S.forecastToggles||{}));localStorage.setItem('tf_fac',S.forecastAccount||'')}catch(e){}}
function restore(){try{var t=localStorage.getItem('tf_t');if(t)S.timers=JSON.parse(t);
  var c=localStorage.getItem('tf_c');if(c)S.collapsed=JSON.parse(c);
  var ly=localStorage.getItem('tf_ly');if(ly)S.layout=ly;
  var gb=localStorage.getItem('tf_gb');if(gb)S.groupBy=gb;
  var tpl=localStorage.getItem('tf_tpl');if(tpl)S.templates=JSON.parse(tpl);
  var pins=localStorage.getItem('tf_pins');if(pins)S.pins=JSON.parse(pins);
  var ord=localStorage.getItem('tf_ord');if(ord)S.customOrder=JSON.parse(ord);
  var so=localStorage.getItem('tf_so');if(so)S.schedOrder=JSON.parse(so);
  var pto=localStorage.getItem('tf_pto');if(pto)S.projTaskOrder=JSON.parse(pto);
  var rl=localStorage.getItem('tf_rl');if(rl)S.recurrLast=JSON.parse(rl);
  var ds=localStorage.getItem('tf_ds');if(ds)S.doneSort=ds;
  var cpsp=localStorage.getItem('tf_cpsp');if(cpsp)S.cpShowPaused=true;
  var cpsc=localStorage.getItem('tf_cpsc');if(cpsc)S.cpShowCompleted=true;
  var opsc=localStorage.getItem('tf_opsc');if(opsc)S.opShowClosed=true;
  var optf=localStorage.getItem('tf_optf');if(optf)S.opTypeFilter=optf;
  var sv=localStorage.getItem('tf_sv');if(sv)S.view=sv;
  var sv2=localStorage.getItem('tf_sv2');if(sv2)S.subView=sv2;
  var fr=localStorage.getItem('tf_fr');if(fr)S.finRange=fr;
  var fcat=localStorage.getItem('tf_fcat');if(fcat!==null)S.finCatFilter=fcat;
  var fcli=localStorage.getItem('tf_fcli');if(fcli!==null)S.finClientFilter=fcli;
  var fcs=localStorage.getItem('tf_fcs');if(fcs)S.finCustomStart=fcs;
  var fce=localStorage.getItem('tf_fce');if(fce)S.finCustomEnd=fce;
  var ftg=localStorage.getItem('tf_ftg');if(ftg)try{S.forecastToggles=JSON.parse(ftg)}catch(e){}
  var fac=localStorage.getItem('tf_fac');if(fac)S.forecastAccount=fac;
  /* Migrate old view IDs to new structure */
  var viewMap={overview:'today',schedule:'today',analytics:'tasks',meetings:'today',weekly:'tasks',templates:'tasks',pipeline:'opportunities',review:'tasks'};
  if(viewMap[S.view])S.view=viewMap[S.view];
  /* Migrate old sub-view keys to unified S.subView */
  if(!sv2){
    var tm=localStorage.getItem('tf_tm');if(tm&&S.view==='tasks')S.subView=tm;
    var pv=localStorage.getItem('tf_pv');if(pv&&S.view==='projects')S.subView=pv;
    var opv=localStorage.getItem('tf_opvw');if(opv&&S.view==='opportunities')S.subView=opv;
  }
  /* Ensure valid subView */
  if(hasSubs(S.view)&&!S.subView)S.subView=getDefaultSub(S.view)}catch(e){}}
function toast(msg,type){var t=cel('div','toast toast-'+(type||'ok'),msg);gel('toasts').appendChild(t);var dur=(type==='warn'||type==='err')?8000:3200;setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t)},dur)}

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
      duration:r.duration||0,notes:r.notes||'',status:r.status||'Planned',flag:!!r.flag,campaign:r.campaign||'',meetingKey:r.meeting_key||'',project:r.project||'',phase:r.phase||'',opportunity:r.opportunity||''}})}

async function loadDone(){
  var res=await _sb.from('done').select('*').order('completed',{ascending:false});
  if(res.error){console.error('loadDone:',res.error);return}
  S.done=(res.data||[]).map(function(r){
    return{id:r.id,item:r.item,completed:r.completed?new Date(r.completed):new Date(),due:r.due?new Date(r.due+'T00:00:00'):null,
      importance:r.importance||'',category:r.category||'',client:r.client||'',endClient:r.end_client||'',
      type:r.type||'Business',duration:r.duration||0,est:r.est||0,notes:r.notes||'',campaign:r.campaign||'',project:r.project||'',phase:r.phase||'',opportunity:r.opportunity||''}})}

async function loadClients(){
  var res=await _sb.from('clients').select('name').order('name');
  if(res.error){console.error('loadClients:',res.error);return}
  var cls=(res.data||[]).map(function(r){return r.name});
  cls.sort(function(a,b){return a.toLowerCase().localeCompare(b.toLowerCase())});
  S.clients=cls}

async function loadReview(){
  var res=await _sb.from('review').select('*').order('created',{ascending:false});
  if(res.error){console.error('loadReview:',res.error);return}
  S.review=(res.data||[]).map(function(r){
    return{id:r.id,item:r.item,notes:r.notes||'',importance:r.importance||'Important',
      category:r.category||'',client:r.client||'',endClient:r.end_client||'',
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
      billingFrequency:r.billing_frequency||'monthly',nextBillingDate:r.next_billing_date||null,
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

async function loadProjects(){
  var res=await _sb.from('projects').select('*').order('created_at',{ascending:false});
  if(res.error){console.error('loadProjects:',res.error);return}
  S.projects=(res.data||[]).map(function(r){
    return{id:r.id,name:r.name||'',description:r.description||'',status:r.status||'Planning',
      color:r.color||'#ff0099',startDate:r.start_date?new Date(r.start_date+'T00:00:00'):null,
      targetDate:r.target_date?new Date(r.target_date+'T00:00:00'):null,
      notes:r.notes||'',created:r.created_at?new Date(r.created_at):new Date()}})}

async function loadPhases(){
  var res=await _sb.from('project_phases').select('*').order('sort_order',{ascending:true});
  if(res.error){console.error('loadPhases:',res.error);return}
  S.phases=(res.data||[]).map(function(r){
    return{id:r.id,projectId:r.project_id,name:r.name||'',description:r.description||'',
      sortOrder:r.sort_order||0,startDate:r.start_date?new Date(r.start_date+'T00:00:00'):null,
      endDate:r.end_date?new Date(r.end_date+'T00:00:00'):null,
      status:r.status||'Not Started',created:r.created_at?new Date(r.created_at):new Date()}})}

async function loadOpportunities(){
  var res=await _sb.from('opportunities').select('*').order('created_at',{ascending:false});
  if(res.error){console.error('loadOpportunities:',res.error);return}
  S.opportunities=(res.data||[]).map(function(r){
    return{id:r.id,name:r.name||'',description:r.description||'',stage:r.stage||'Lead',
      type:r.type||'fc_partnership',
      client:r.client||'',endClient:r.end_client||'',contactName:r.contact_name||'',contactEmail:r.contact_email||'',
      strategyFee:parseFloat(r.strategy_fee)||0,setupFee:parseFloat(r.setup_fee)||0,
      monthlyFee:parseFloat(r.monthly_fee)||0,monthlyAdSpend:parseFloat(r.monthly_ad_spend)||0,
      probability:r.probability||50,
      expectedClose:r.expected_close?new Date(r.expected_close+'T00:00:00'):null,
      source:r.source||'',notes:r.notes||'',paymentPlan:r.payment_plan||'',
      closedAt:r.closed_at?new Date(r.closed_at):null,
      convertedCampaignId:r.converted_campaign_id||'',
      paymentMethod:r.payment_method||'bank_transfer',processingFeePct:parseFloat(r.processing_fee_pct)||0,
      receivingAccount:r.receiving_account||'',expectedMonthlyDuration:r.expected_monthly_duration||12,
      created:r.created_at?new Date(r.created_at):new Date()}})}

async function loadOpportunityMeetings(){
  var res=await _sb.from('opportunity_meetings').select('*').order('date',{ascending:false});
  if(res.error){console.error('loadOpportunityMeetings:',res.error);return}
  S.oppMeetings=(res.data||[]).map(function(r){
    return{id:r.id,opportunityId:r.opportunity_id,date:r.date?new Date(r.date):new Date(),
      title:r.title||'',recordingLink:r.recording_link||'',notes:r.notes||'',
      created:r.created_at?new Date(r.created_at):new Date()}})}

/* ═══════════ FINANCE DATA ═══════════ */
async function loadFinancePayments(){
  var res=await _sb.from('finance_payments').select('*').order('date',{ascending:false});
  if(res.error){console.error('loadFinancePayments:',res.error);return}
  S.financePayments=(res.data||[]).map(function(r){
    return{id:r.id,date:r.date?new Date(r.date+'T00:00:00'):null,amount:parseFloat(r.amount)||0,
      fee:parseFloat(r.fee)||0,net:parseFloat(r.net)||0,source:r.source||'',sourceId:r.source_id||'',
      payerEmail:r.payer_email||'',payerName:r.payer_name||'',description:r.description||'',
      category:r.category||'',clientId:r.client_id||'',campaignId:r.campaign_id||'',
      endClient:r.end_client||'',notes:r.notes||'',status:r.status||'unmatched',
      direction:r.direction||'inflow',type:r.type||'payment',externalStatus:r.external_status||'',
      linkedTransactionId:r.linked_transaction_id||'',pendingAmount:parseFloat(r.pending_amount)||0,
      metadata:r.metadata||{},expectedPaymentDate:r.expected_payment_date||null,
      scheduledItemId:r.scheduled_item_id||null}})}

async function loadClientRecords(){
  var res=await _sb.from('clients').select('*').order('name');
  if(res.error){console.error('loadClientRecords:',res.error);return}
  S.clientRecords=(res.data||[]).map(function(r){
    return{id:r.id,name:r.name||'',status:r.status||'active',email:r.email||'',company:r.company||'',notes:r.notes||''}});
  /* Also update S.clients string array for backward compat — active clients only */
  var cls=S.clientRecords.filter(function(r){return r.status==='active'}).map(function(r){return r.name});
  cls.sort(function(a,b){return a.toLowerCase().localeCompare(b.toLowerCase())});
  S.clients=cls}

async function loadPayerMap(){
  var res=await _sb.from('payer_client_map').select('*');
  if(res.error){console.error('loadPayerMap:',res.error);return}
  S.payerMap=(res.data||[]).map(function(r){
    return{id:r.id,payerEmail:r.payer_email||'',payerName:r.payer_name||'',clientId:r.client_id||''}})}

/* Finance CRUD */
async function dbAddFinancePayment(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,date:data.date||null,amount:data.amount||0,fee:data.fee||0,
    net:data.net||0,source:data.source||'manual',source_id:data.sourceId||'',
    payer_email:data.payerEmail||'',payer_name:data.payerName||'',description:data.description||'',
    category:data.category||'',client_id:data.clientId||null,campaign_id:data.campaignId||null,
    end_client:data.endClient||'',notes:data.notes||'',status:data.status||'unmatched'};
  var res=await _sb.from('finance_payments').insert(row).select().single();
  if(res.error){toast('Payment save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditFinancePayment(id,data){
  var row={};
  if('date' in data)row.date=data.date||null;
  if('category' in data)row.category=data.category||'';
  if('clientId' in data)row.client_id=data.clientId||null;
  if('campaignId' in data)row.campaign_id=data.campaignId||null;
  if('endClient' in data)row.end_client=data.endClient||'';
  if('notes' in data)row.notes=data.notes||'';
  if('status' in data)row.status=data.status||'unmatched';
  if('expectedPaymentDate' in data)row.expected_payment_date=data.expectedPaymentDate||null;
  if('scheduledItemId' in data)row.scheduled_item_id=data.scheduledItemId||null;
  var res=await _sb.from('finance_payments').update(row).eq('id',id);
  if(res.error){toast('Payment update failed: '+res.error.message,'warn');return false}
  return true}

/* Quick inline update of expected payment date for invoices */
async function setInvExpDate(paymentId,dateVal){
  var p=S.financePayments.find(function(fp){return fp.id===paymentId});
  if(!p)return;
  var ok=await dbEditFinancePayment(paymentId,{expectedPaymentDate:dateVal||null});
  if(!ok)return;
  p.expectedPaymentDate=dateVal||null;
  toast('Expected payment date updated','ok');
  render()}

async function dbDeleteFinancePayment(id){
  var res=await _sb.from('finance_payments').delete().eq('id',id);
  if(res.error){toast('Payment delete failed: '+res.error.message,'warn');return false}
  return true}

/* Finance Payment Splits */
async function loadFinancePaymentSplits(){
  var res=await _sb.from('finance_payment_splits').select('*').order('created_at');
  if(res.error){console.error('loadFinancePaymentSplits:',res.error);return}
  S.financePaymentSplits=(res.data||[]).map(function(r){
    return{id:r.id,paymentId:r.payment_id,amount:parseFloat(r.amount)||0,
      category:r.category||'',endClient:r.end_client||'',campaignId:r.campaign_id||'',
      notes:r.notes||''}})}

async function dbAddFinancePaymentSplit(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,payment_id:data.paymentId,amount:data.amount||0,
    category:data.category||'',end_client:data.endClient||'',
    campaign_id:data.campaignId||null,notes:data.notes||''};
  var res=await _sb.from('finance_payment_splits').insert(row).select().single();
  if(res.error){toast('Split save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditFinancePaymentSplit(id,data){
  var row={amount:data.amount||0,category:data.category||'',
    end_client:data.endClient||'',campaign_id:data.campaignId||null,notes:data.notes||''};
  var res=await _sb.from('finance_payment_splits').update(row).eq('id',id);
  if(res.error){toast('Split update failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeleteFinancePaymentSplit(id){
  var res=await _sb.from('finance_payment_splits').delete().eq('id',id);
  if(res.error){toast('Split delete failed: '+res.error.message,'warn');return false}
  return true}

function getSplitsForPayment(paymentId){
  return S.financePaymentSplits.filter(function(s){return s.paymentId===paymentId})}

/* ── Account Balances ── */
async function loadAccountBalances(){
  var res=await _sb.from('account_balances').select('*').order('captured_at',{ascending:false});
  S.accountBalances=(res.data||[]).map(function(r){
    return{id:r.id,platform:r.platform||'',accountId:r.account_id||'',accountName:r.account_name||'',
      accountType:r.account_type||'checking',currentBalance:parseFloat(r.current_balance)||0,
      availableBalance:parseFloat(r.available_balance)||0,currency:r.currency||'USD',
      capturedAt:r.captured_at?new Date(r.captured_at):null}})}

function getCombinedBalance(){
  return S.accountBalances.reduce(function(s,a){return s+a.currentBalance},0)}

function getBalanceByPlatform(){
  var m={};S.accountBalances.forEach(function(a){
    if(!m[a.platform])m[a.platform]={platform:a.platform,accounts:[],total:0};
    m[a.platform].accounts.push(a);m[a.platform].total+=a.currentBalance});
  return m}

/* ── Scheduled Items (recurring + one-off) ── */
async function loadScheduledItems(){
  var res=await _sb.from('scheduled_items').select('*').order('next_due',{ascending:true});
  S.scheduledItems=(res.data||[]).map(function(r){
    return{id:r.id,name:r.name||'',amount:parseFloat(r.amount)||0,direction:r.direction||'outflow',
      frequency:r.frequency||'monthly',dayOfMonth:r.day_of_month||null,
      nextDue:r.next_due||null,category:r.category||'',account:r.account||'',
      type:r.type||'expense',clientId:r.client_id||null,notes:r.notes||'',
      isActive:r.is_active!==false,lastPaidDate:r.last_paid_date||null,
      endDate:r.end_date||null,numPayments:r.num_payments||null,
      created:r.created_at?new Date(r.created_at):new Date()}})}

async function dbAddScheduledItem(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,name:data.name||'',amount:data.amount||0,direction:data.direction||'outflow',
    frequency:data.frequency||'monthly',day_of_month:data.dayOfMonth||null,
    next_due:data.nextDue||null,category:data.category||'',account:data.account||'',
    type:data.type||'expense',client_id:data.clientId||null,notes:data.notes||'',
    is_active:data.isActive!==false,end_date:data.endDate||null,num_payments:data.numPayments||null};
  var res=await _sb.from('scheduled_items').insert(row).select('id').single();
  if(res.error){toast('Add scheduled item failed: '+res.error.message,'warn');return null}
  return res.data.id}

async function dbEditScheduledItem(id,data){
  var row={};
  if('name' in data)row.name=data.name||'';
  if('amount' in data)row.amount=data.amount||0;
  if('direction' in data)row.direction=data.direction||'outflow';
  if('frequency' in data)row.frequency=data.frequency||'monthly';
  if('dayOfMonth' in data)row.day_of_month=data.dayOfMonth||null;
  if('nextDue' in data)row.next_due=data.nextDue||null;
  if('category' in data)row.category=data.category||'';
  if('account' in data)row.account=data.account||'';
  if('type' in data)row.type=data.type||'expense';
  if('clientId' in data)row.client_id=data.clientId||null;
  if('notes' in data)row.notes=data.notes||'';
  if('isActive' in data)row.is_active=data.isActive!==false;
  if('lastPaidDate' in data)row.last_paid_date=data.lastPaidDate||null;
  if('endDate' in data)row.end_date=data.endDate||null;
  if('numPayments' in data)row.num_payments=data.numPayments||null;
  var res=await _sb.from('scheduled_items').update(row).eq('id',id);
  if(res.error){toast('Update scheduled item failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeleteScheduledItem(id){
  var res=await _sb.from('scheduled_items').delete().eq('id',id);
  if(res.error){toast('Delete scheduled item failed: '+res.error.message,'warn');return false}
  return true}

/* ── Team Members ── */
async function loadTeamMembers(){
  var res=await _sb.from('team_members').select('*').order('name',{ascending:true});
  S.teamMembers=(res.data||[]).map(function(r){
    return{id:r.id,name:r.name||'',role:r.role||'',salary:parseFloat(r.salary)||0,
      payFrequency:r.pay_frequency||'monthly',payDay:r.pay_day||1,
      commissionRate:parseFloat(r.commission_rate)||0,commissionBasis:r.commission_basis||'',
      commissionFrequency:r.commission_frequency||'monthly',commissionCap:parseFloat(r.commission_cap)||null,
      startDate:r.start_date||null,notes:r.notes||'',isActive:r.is_active!==false,
      created:r.created_at?new Date(r.created_at):new Date()}})}

async function dbAddTeamMember(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,name:data.name||'',role:data.role||'',salary:data.salary||0,
    pay_frequency:data.payFrequency||'monthly',pay_day:data.payDay||1,
    commission_rate:data.commissionRate||0,commission_basis:data.commissionBasis||'',
    commission_frequency:data.commissionFrequency||'monthly',commission_cap:data.commissionCap||null,
    start_date:data.startDate||null,notes:data.notes||'',is_active:data.isActive!==false};
  var res=await _sb.from('team_members').insert(row).select('id').single();
  if(res.error){toast('Add team member failed: '+res.error.message,'warn');return null}
  return res.data.id}

async function dbEditTeamMember(id,data){
  var row={};
  if('name' in data)row.name=data.name||'';
  if('role' in data)row.role=data.role||'';
  if('salary' in data)row.salary=data.salary||0;
  if('payFrequency' in data)row.pay_frequency=data.payFrequency||'monthly';
  if('payDay' in data)row.pay_day=data.payDay||1;
  if('commissionRate' in data)row.commission_rate=data.commissionRate||0;
  if('commissionBasis' in data)row.commission_basis=data.commissionBasis||'';
  if('commissionFrequency' in data)row.commission_frequency=data.commissionFrequency||'monthly';
  if('commissionCap' in data)row.commission_cap=data.commissionCap||null;
  if('startDate' in data)row.start_date=data.startDate||null;
  if('notes' in data)row.notes=data.notes||'';
  if('isActive' in data)row.is_active=data.isActive!==false;
  var res=await _sb.from('team_members').update(row).eq('id',id);
  if(res.error){toast('Update team member failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeleteTeamMember(id){
  var res=await _sb.from('team_members').delete().eq('id',id);
  if(res.error){toast('Delete team member failed: '+res.error.message,'warn');return false}
  return true}

/* ── Forecast Engine ── */
function getNextOccurrence(item,afterDate){
  var d=new Date(afterDate);
  if(item.frequency==='once')return item.nextDue?new Date(item.nextDue+'T00:00:00'):null;
  var dom=item.dayOfMonth||1;
  if(item.frequency==='monthly'){
    var nd=new Date(d.getFullYear(),d.getMonth(),dom);
    if(nd<=d)nd=new Date(d.getFullYear(),d.getMonth()+1,dom);
    return nd}
  if(item.frequency==='weekly'){
    var nd=new Date(item.nextDue?item.nextDue+'T00:00:00':d);
    while(nd<=d)nd.setDate(nd.getDate()+7);return nd}
  if(item.frequency==='biweekly'){
    var nd=new Date(item.nextDue?item.nextDue+'T00:00:00':d);
    while(nd<=d)nd.setDate(nd.getDate()+14);return nd}
  if(item.frequency==='quarterly'){
    var nd=new Date(d.getFullYear(),d.getMonth(),dom);
    if(nd<=d)nd.setMonth(nd.getMonth()+3);
    while(nd<=d)nd.setMonth(nd.getMonth()+3);return nd}
  if(item.frequency==='annually'){
    var nd=new Date(d.getFullYear(),d.getMonth(),dom);
    if(nd<=d)nd.setFullYear(nd.getFullYear()+1);return nd}
  return null}

function itemFallsOnDay(item,dayStr){
  /* Check if a scheduled item has an occurrence on this exact date YYYY-MM-DD */
  /* End date guard */
  if(item.endDate){var endD=new Date(item.endDate+'T00:00:00');if(new Date(dayStr+'T00:00:00')>endD)return false}
  if(item.frequency==='once')return item.nextDue===dayStr;
  var dayDate=new Date(dayStr+'T00:00:00');
  var dom=item.dayOfMonth||1;
  if(item.frequency==='monthly')return dayDate.getDate()===dom;
  if(item.frequency==='quarterly')return dayDate.getDate()===dom&&(dayDate.getMonth()%3===((item.nextDue?new Date(item.nextDue+'T00:00:00').getMonth():0)%3));
  if(item.frequency==='annually'){
    if(!item.nextDue)return false;
    var nd=new Date(item.nextDue+'T00:00:00');
    return dayDate.getMonth()===nd.getMonth()&&dayDate.getDate()===nd.getDate()}
  if(item.frequency==='weekly'||item.frequency==='biweekly'){
    if(!item.nextDue)return false;
    var start=new Date(item.nextDue+'T00:00:00');
    var diff=Math.round((dayDate-start)/(86400000));
    if(diff<0)return false;
    var interval=item.frequency==='weekly'?7:14;
    return diff%interval===0}
  return false}

function salaryFallsOnDay(member,dayStr){
  var dayDate=new Date(dayStr+'T00:00:00');
  var pd=member.payDay||1;
  if(member.payFrequency==='monthly')return dayDate.getDate()===pd;
  if(member.payFrequency==='biweekly'){
    if(!member.startDate)return dayDate.getDate()===pd;
    var start=new Date(member.startDate+'T00:00:00');
    var diff=Math.round((dayDate-start)/(86400000));
    return diff>=0&&diff%14===0}
  return false}

function calcTeamCommissions(member,periodStart,periodEnd){
  if(!member.commissionRate||!member.commissionBasis)return 0;
  var rate=member.commissionRate/100;var total=0;
  var basis=member.commissionBasis;
  /* Category-based: filter by PAY_CAT match */
  var catBased=['Retain Live','F&C Monthly Fees','F&C Strategy','F&C Campaign Set-Up','Products'];
  S.financePayments.forEach(function(p){
    if(p.direction!=='inflow'||p.status==='excluded'||!p.date)return;
    var pd=p.date instanceof Date?p.date:new Date(p.date+'T00:00:00');
    if(pd<periodStart||pd>periodEnd)return;
    if(catBased.indexOf(basis)!==-1){
      if(p.category===basis)total+=p.amount*rate;
    }else if(basis==='All Revenue'||basis==='revenue'){
      total+=p.amount*rate;
    }else if(basis==='profit'){
      total+=p.net*rate}});
  if(basis==='per_deal'){
    var deals=new Set();
    S.financePayments.forEach(function(p){
      if(p.direction!=='inflow'||p.status==='excluded'||!p.date)return;
      var pd=p.date instanceof Date?p.date:new Date(p.date+'T00:00:00');
      if(pd<periodStart||pd>periodEnd)return;
      if(p.clientId)deals.add(p.clientId)});
    total=deals.size*member.commissionRate}
  if(member.commissionCap&&total>member.commissionCap)total=member.commissionCap;
  return total}

function getCommissionTally(member){
  /* Calculate accrued unpaid commission since last commission payment */
  if(!member.commissionRate||!member.commissionBasis)return{accrued:0,nextPaymentDate:null};
  var now=new Date();now.setHours(0,0,0,0);
  var freq=member.commissionFrequency||'monthly';
  /* Determine period start: beginning of current commission period */
  var periodStart;
  if(freq==='quarterly'){
    var qm=now.getMonth()-now.getMonth()%3;
    periodStart=new Date(now.getFullYear(),qm,1);
  }else{
    periodStart=new Date(now.getFullYear(),now.getMonth(),1)}
  var accrued=calcTeamCommissions(member,periodStart,now);
  /* Next payment date */
  var nextPay;
  if(freq==='quarterly'){
    nextPay=new Date(periodStart);nextPay.setMonth(nextPay.getMonth()+3);
  }else{
    nextPay=new Date(now.getFullYear(),now.getMonth()+1,member.payDay||1)}
  return{accrued:accrued,nextPaymentDate:nextPay.toISOString().split('T')[0]}}

function commissionFallsOnDay(member,dayStr){
  var freq=member.commissionFrequency||'monthly';
  var dayDate=new Date(dayStr+'T00:00:00');
  var pd=member.payDay||1;
  if(freq==='monthly')return dayDate.getDate()===pd;
  if(freq==='quarterly')return dayDate.getDate()===pd&&dayDate.getMonth()%3===0;
  return false}

function estimateMonthlyCommission(member){
  if(!member.commissionRate||!member.commissionBasis)return 0;
  var now=new Date();
  /* Average of last 3 months */
  var total=0;
  for(var i=1;i<=3;i++){
    var ps=new Date(now.getFullYear(),now.getMonth()-i,1);
    var pe=new Date(now.getFullYear(),now.getMonth()-i+1,0);
    total+=calcTeamCommissions(member,ps,pe)}
  return total/3}

/* ── Zoho Payment Clearing ── */
function addBusinessDays(date,n){
  var result=new Date(date);var added=0;
  while(added<n){result.setDate(result.getDate()+1);var dow=result.getDay();
    if(dow!==0&&dow!==6)added++}
  return result}

function isInClearing(payment){
  if(payment.direction!=='inflow')return false;
  if(payment.source!=='zoho_books'&&payment.source!=='zoho_payments')return false;
  if(!payment.date)return false;
  var payDate=payment.date instanceof Date?payment.date:new Date(payment.date+'T00:00:00');
  var clearDate=addBusinessDays(payDate,2);
  return new Date()<clearDate}

/* ── Forecast Toggles ── */
function toggleForecastSource(key){
  if(!S.forecastToggles)S.forecastToggles={};
  S.forecastToggles[key]=S.forecastToggles[key]===false?true:false;
  save();render()}

function setForecastAccount(acct){
  S.forecastAccount=acct||'';save();render()}

/* ── One-off Quick Add ── */
async function quickAddOneOff(){
  var name=(gel('qo-name')||{}).value;if(!name||!name.trim()){toast('Name required','warn');return}
  var data={name:name.trim(),amount:parseFloat((gel('qo-amount')||{}).value)||0,
    direction:(gel('qo-direction')||{}).value||'outflow',frequency:'once',
    nextDue:(gel('qo-date')||{}).value||null,type:'expense',isActive:true};
  if(!data.amount){toast('Amount required','warn');return}
  if(!data.nextDue){toast('Date required','warn');return}
  await dbAddScheduledItem(data);await loadScheduledItems();
  toast('One-off payment added','ok');render()}

function buildForecast(horizonDays,scenario){
  horizonDays=horizonDays||S.forecastHorizon||90;
  scenario=scenario||S.forecastScenario||'expected';
  var startBal=getCombinedBalance();
  var days=[];
  var today=new Date();today.setHours(0,0,0,0);
  var running=startBal;
  var tg=S.forecastToggles||{};
  var acctFilter=S.forecastAccount||'';

  /* Pre-compute pipeline items */
  var pipelineItems=S.opportunities.filter(function(o){
    return o.stage!=='Closed Won'&&o.stage!=='Closed Lost'&&o.expectedClose});

  /* Pre-compute pending invoices */
  var pendingInvoices=S.financePayments.filter(function(p){
    return p.type==='invoice'&&p.pendingAmount>0&&p.status!=='excluded'});

  for(var i=0;i<horizonDays;i++){
    var d=new Date(today);d.setDate(d.getDate()+i);
    var dayStr=d.toISOString().split('T')[0];
    var dayIn=[];var dayOut=[];

    /* 1. Scheduled items (recurring + one-off) */
    if(tg.scheduled!==false){
      S.scheduledItems.forEach(function(item){
        if(!item.isActive)return;
        if(item.frequency==='once'&&tg.oneoff===false)return;
        if(acctFilter&&item.account&&item.account.indexOf(acctFilter)===-1)return;
        if(itemFallsOnDay(item,dayStr)){
          var entry={name:item.name,amount:item.amount,source:'scheduled',sourceId:item.id,type:item.type,
            frequency:item.frequency};
          if(item.direction==='inflow')dayIn.push(entry);
          else dayOut.push(entry)}})}

    /* 2. Team salaries */
    if(tg.salaries!==false){
      S.teamMembers.forEach(function(m){
        if(!m.isActive||!m.salary)return;
        if(salaryFallsOnDay(m,dayStr)){
          dayOut.push({name:'Salary: '+m.name,amount:m.salary,source:'team',sourceId:m.id,type:'salary'})}})}

    /* 2b. Team commissions */
    if(tg.commissions!==false){
      S.teamMembers.forEach(function(m){
        if(!m.isActive||!m.commissionRate||!m.commissionBasis)return;
        if(commissionFallsOnDay(m,dayStr)){
          var est=estimateMonthlyCommission(m);
          if(m.commissionFrequency==='quarterly')est=est*3;
          if(est>0)dayOut.push({name:'Commission: '+m.name,amount:est,source:'team',sourceId:m.id,type:'commission'})}})}

    /* 3. Pending invoices (confirmed inflows) — with clearing delay */
    if(tg.invoices!==false){
      pendingInvoices.forEach(function(inv){
        var expDate=inv.expectedPaymentDate||null;
        if(!expDate&&inv.date){
          var invDate=inv.date instanceof Date?inv.date:new Date(inv.date+'T00:00:00');
          var fb=new Date(invDate);fb.setDate(fb.getDate()+30);
          expDate=fb.toISOString().split('T')[0]}
        if(expDate===dayStr){
          var clearing=isInClearing(inv);
          dayIn.push({name:'Invoice: '+(inv.payerName||inv.description||'#'+inv.sourceId),
            amount:inv.pendingAmount,source:'invoice',sourceId:inv.id,type:'invoice',clearing:clearing})}})}

    /* 4. Opportunity pipeline (weighted, with processing fees) */
    if(tg.pipeline!==false){
      pipelineItems.forEach(function(op){
        var closeStr=op.expectedClose instanceof Date?op.expectedClose.toISOString().split('T')[0]:op.expectedClose;
        if(acctFilter&&op.receivingAccount&&op.receivingAccount!==acctFilter)return;
        if(closeStr===dayStr){
          var totalVal=(op.strategyFee||0)+(op.setupFee||0);
          var feePct=(op.processingFeePct||0)/100;
          var netVal=totalVal*(1-feePct);
          var prob=(op.probability||0)/100;
          if(scenario==='conservative')prob=prob*0.5;
          else if(scenario==='optimistic')prob=Math.min(prob*1.2,1);
          var weighted=netVal*prob;
          if(weighted>0){
            dayIn.push({name:'Pipeline: '+op.name,amount:weighted,source:'pipeline',sourceId:op.id,
              type:'pipeline',probability:op.probability})}}
        /* Pipeline monthly fee projection (post-close) */
        if(op.monthlyFee&&op.monthlyFee>0){
          var closeDt=new Date(closeStr+'T00:00:00');
          var dur=op.expectedMonthlyDuration||12;
          if(d>closeDt){
            var mDiff=(d.getFullYear()-closeDt.getFullYear())*12+(d.getMonth()-closeDt.getMonth());
            if(mDiff>0&&mDiff<=dur&&d.getDate()===(closeDt.getDate()||1)){
              var mProb=(op.probability||0)/100;
              if(scenario==='conservative')mProb=mProb*0.5;
              else if(scenario==='optimistic')mProb=Math.min(mProb*1.2,1);
              var mFee=op.monthlyFee*mProb*(1-(op.processingFeePct||0)/100);
              if(mFee>0)dayIn.push({name:'Monthly: '+op.name,amount:mFee,source:'pipeline',sourceId:op.id,
                type:'pipeline-monthly',probability:op.probability})}}}})}

    /* 5. Active campaign billing (frequency-aware) */
    if(tg.campaigns!==false){
      S.campaigns.forEach(function(cp){
        if(cp.status!=='Active'&&cp.status!=='Running')return;
        if(!cp.monthlyFee)return;
        if(campaignBillingFallsOnDay(cp,dayStr)){
          var cycleMonths=cp.billingFrequency==='quarterly'?3:cp.billingFrequency==='annually'?12:1;
          var billingAmt=cp.monthlyFee*cycleMonths;
          var prob=scenario==='conservative'?0.8:1;
          dayIn.push({name:'Campaign: '+cp.name,amount:billingAmt*prob,source:'campaign',sourceId:cp.id,
            type:'recurring',frequency:cp.billingFrequency||'monthly'})}})}

    var totalIn=dayIn.reduce(function(s,e){return s+e.amount},0);
    var totalOut=dayOut.reduce(function(s,e){return s+e.amount},0);
    running+=totalIn-totalOut;

    days.push({date:dayStr,balance:running,inflows:dayIn,outflows:dayOut,
      totalIn:totalIn,totalOut:totalOut})}

  return{startingBalance:startBal,days:days,scenario:scenario,horizonDays:horizonDays}}

function getForecastMetrics(fc){
  if(!fc||!fc.days||!fc.days.length)return{balance:0,day30:0,burnRate:0,runway:0,nextBigIn:null,nextBigOut:null};
  var balance=fc.startingBalance;
  var day30=fc.days.length>=30?fc.days[29].balance:fc.days[fc.days.length-1].balance;
  /* Monthly burn = average daily outflows * 30 */
  var totalOut=fc.days.reduce(function(s,d){return s+d.totalOut},0);
  var burnRate=(totalOut/fc.days.length)*30;
  /* Runway: days until balance hits 0 */
  var runway=0;
  for(var i=0;i<fc.days.length;i++){if(fc.days[i].balance<=0){runway=i;break}}
  if(runway===0&&fc.days[fc.days.length-1].balance>0)runway=fc.days.length;
  /* Next big events */
  var nextBigIn=null,nextBigOut=null;
  for(var i=0;i<fc.days.length;i++){
    fc.days[i].inflows.forEach(function(e){
      if(!nextBigIn||e.amount>nextBigIn.amount)nextBigIn={name:e.name,amount:e.amount,date:fc.days[i].date}});
    fc.days[i].outflows.forEach(function(e){
      if(!nextBigOut||e.amount>nextBigOut.amount)nextBigOut={name:e.name,amount:e.amount,date:fc.days[i].date}})}
  return{balance:balance,day30:day30,burnRate:burnRate,runway:runway,nextBigIn:nextBigIn,nextBigOut:nextBigOut}}

function setForecastHorizon(days){S.forecastHorizon=days;render()}
function setForecastScenario(s){S.forecastScenario=s;render()}

/* Check if a campaign billing falls on a given day based on billingFrequency + nextBillingDate */
function campaignBillingFallsOnDay(cp,dayStr){
  var freq=cp.billingFrequency||'monthly';
  var dayDate=new Date(dayStr+'T00:00:00');
  if(cp.nextBillingDate){
    /* Use nextBillingDate as anchor and project forward */
    var anchor=new Date(cp.nextBillingDate+'T00:00:00');
    if(freq==='monthly'){
      return dayDate.getDate()===anchor.getDate()}
    if(freq==='quarterly'){
      if(dayDate.getDate()!==anchor.getDate())return false;
      var monthDiff=(dayDate.getFullYear()-anchor.getFullYear())*12+(dayDate.getMonth()-anchor.getMonth());
      return monthDiff>=0&&monthDiff%3===0}
    if(freq==='annually'){
      return dayDate.getMonth()===anchor.getMonth()&&dayDate.getDate()===anchor.getDate()}
    return dayDate.getDate()===anchor.getDate()
  }
  /* Fallback: 1st of month for monthly, 1st of quarter for quarterly */
  if(freq==='monthly')return dayDate.getDate()===1;
  if(freq==='quarterly')return dayDate.getDate()===1&&dayDate.getMonth()%3===0;
  if(freq==='annually')return dayDate.getMonth()===0&&dayDate.getDate()===1;
  return dayDate.getDate()===1}

/* Build list of all upcoming payments within a horizon (for the Upcoming tab) */
function buildUpcomingPayments(horizonDays){
  horizonDays=horizonDays||90;
  var today=new Date();today.setHours(0,0,0,0);
  var items=[];

  /* 1. Campaign billings */
  S.campaigns.forEach(function(cp){
    if(cp.status!=='Active'&&cp.status!=='Running')return;
    if(!cp.monthlyFee)return;
    var cycleMonths=cp.billingFrequency==='quarterly'?3:cp.billingFrequency==='annually'?12:1;
    var billingAmt=cp.monthlyFee*cycleMonths;
    for(var i=0;i<horizonDays;i++){
      var d=new Date(today);d.setDate(d.getDate()+i);
      var ds=d.toISOString().split('T')[0];
      if(campaignBillingFallsOnDay(cp,ds)){
        items.push({type:'campaign',name:cp.name,amount:billingAmt,date:ds,
          sourceId:cp.id,direction:'inflow',frequency:cp.billingFrequency||'monthly',editable:true})}}});

  /* 2. Scheduled items */
  S.scheduledItems.forEach(function(item){
    if(!item.isActive)return;
    for(var i=0;i<horizonDays;i++){
      var d=new Date(today);d.setDate(d.getDate()+i);
      var ds=d.toISOString().split('T')[0];
      if(itemFallsOnDay(item,ds)){
        items.push({type:'scheduled',name:item.name,amount:item.amount,date:ds,
          sourceId:item.id,direction:item.direction,frequency:item.frequency,editable:true})}}});

  /* 3. Pending invoices */
  S.financePayments.forEach(function(p){
    if(p.type!=='invoice'||p.pendingAmount<=0||p.status==='excluded')return;
    var expDate=p.expectedPaymentDate||null;
    if(!expDate&&p.date){
      var invDate=p.date instanceof Date?p.date:new Date(p.date+'T00:00:00');
      var fb=new Date(invDate);fb.setDate(fb.getDate()+30);
      expDate=fb.toISOString().split('T')[0]}
    if(!expDate)return;
    var ed=new Date(expDate+'T00:00:00');
    var endDate=new Date(today);endDate.setDate(endDate.getDate()+horizonDays);
    if(ed>=today&&ed<=endDate){
      items.push({type:'invoice',name:p.payerName||p.description||'Invoice',amount:p.pendingAmount,date:expDate,
        sourceId:p.id,direction:'inflow',frequency:'once',editable:true})}});

  /* 4. Team salaries */
  S.teamMembers.forEach(function(m){
    if(!m.isActive||!m.salary)return;
    for(var i=0;i<horizonDays;i++){
      var d=new Date(today);d.setDate(d.getDate()+i);
      var ds=d.toISOString().split('T')[0];
      if(salaryFallsOnDay(m,ds)){
        items.push({type:'salary',name:'Salary: '+m.name,amount:m.salary,date:ds,
          sourceId:m.id,direction:'outflow',frequency:m.payFrequency||'monthly',editable:false})}}});

  items.sort(function(a,b){return a.date<b.date?-1:a.date>b.date?1:0});
  return items}

/* Update the underlying record date from the Upcoming tab */
async function setUpcomingDate(type,id,newDate){
  if(type==='campaign'){
    var cp=S.campaigns.find(function(c){return c.id===id});
    if(!cp)return;
    var ok=await dbEditCampaign(id,{nextBillingDate:newDate||null});
    if(!ok)return;
    cp.nextBillingDate=newDate||null;
    toast('Next billing date updated','ok');render();
  }else if(type==='scheduled'){
    var item=S.scheduledItems.find(function(i){return i.id===id});
    if(!item)return;
    var ok=await dbEditScheduledItem(id,{nextDue:newDate||null});
    if(!ok)return;
    item.nextDue=newDate||null;
    toast('Next due date updated','ok');render()}}

/* ── Reconciliation ── */
function autoReconcile(){
  var now=new Date();var monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  var count=0;
  S.scheduledItems.forEach(function(item){
    if(!item.isActive||!item.nextDue)return;
    var nd=new Date(item.nextDue+'T00:00:00');
    if(nd>now)return; /* Not yet due */
    /* Already reconciled this period? */
    if(item.lastPaidDate){
      var lp=new Date(item.lastPaidDate+'T00:00:00');
      if(lp>=monthStart)return}
    /* Search for matching transaction */
    var match=null;var matchScore=Infinity;
    S.financePayments.forEach(function(p){
      if(p.direction!==item.direction||p.status==='excluded'||p.type==='transfer')return;
      if(p.scheduledItemId)return; /* Already linked to a scheduled item */
      if(!p.date)return;
      var pd=p.date instanceof Date?p.date:new Date(p.date+'T00:00:00');
      /* Within 7 days of next_due */
      var dayDiff=Math.abs((pd-nd)/86400000);
      if(dayDiff>7)return;
      /* Amount within 15% */
      var amtDiff=Math.abs(p.amount-item.amount)/item.amount;
      if(amtDiff>0.15)return;
      /* Account match if specified */
      if(item.account){
        var meta=typeof p.metadata==='string'?JSON.parse(p.metadata||'{}'):p.metadata||{};
        if(item.account==='brex_card'&&meta.brex_type!=='card')return;
        if(item.account==='brex_cash'&&(p.source!=='brex'||meta.brex_type==='card'))return;
        if(item.account==='mercury'&&p.source!=='mercury')return}
      var score=dayDiff+amtDiff*10;
      if(score<matchScore){matchScore=score;match=p}});
    if(match){
      item.lastPaidDate=match.date instanceof Date?match.date.toISOString().split('T')[0]:match.date;
      /* Advance next_due */
      if(item.frequency!=='once'){
        var nextDueDate=new Date(item.nextDue+'T00:00:00');
        var nxt=getNextOccurrence(item,nextDueDate);
        if(nxt)item.nextDue=nxt.toISOString().split('T')[0]}
      dbEditScheduledItem(item.id,{lastPaidDate:item.lastPaidDate,nextDue:item.nextDue});
      /* Link the payment to this scheduled item */
      match.scheduledItemId=item.id;
      match.status='matched';
      dbEditFinancePayment(match.id,{scheduledItemId:item.id,status:'matched'});
      count++}});
  if(count>0)toast(count+' item'+(count>1?'s':'')+' reconciled','ok');
  else toast('No new matches found','info');
  render()}

/* ── Expense Reconciliation ── */
async function setExpenseCategory(paymentId,category){
  await dbEditFinancePayment(paymentId,{category:category});
  var p=S.financePayments.find(function(fp){return fp.id===paymentId});
  if(p)p.category=category;
  toast('Category set to '+(category||'none'),'ok')}

async function linkExpenseToScheduled(paymentId,scheduledItemId){
  var ok=await dbEditFinancePayment(paymentId,{scheduledItemId:scheduledItemId,status:'matched'});
  if(!ok)return;
  var p=S.financePayments.find(function(fp){return fp.id===paymentId});
  if(p&&p.date){
    var dateStr=p.date instanceof Date?p.date.toISOString().split('T')[0]:p.date;
    await dbEditScheduledItem(scheduledItemId,{lastPaidDate:dateStr});
    var item=S.scheduledItems.find(function(i){return i.id===scheduledItemId});
    if(item&&item.frequency!=='once'&&item.nextDue){
      var nd=new Date(item.nextDue+'T00:00:00');
      var nxt=getNextOccurrence(item,nd);
      if(nxt)await dbEditScheduledItem(scheduledItemId,{nextDue:nxt.toISOString().split('T')[0]})}}
  await loadFinancePayments();
  await loadScheduledItems();
  var itemName=(S.scheduledItems.find(function(i){return i.id===scheduledItemId})||{}).name||'item';
  toast('Linked to '+itemName,'ok');
  closeModal();render()}

async function unlinkExpenseFromScheduled(paymentId){
  await dbEditFinancePayment(paymentId,{scheduledItemId:null,status:'unmatched'});
  await loadFinancePayments();
  toast('Link removed','ok');
  closeModal();render()}

async function saveExpenseAsOneOff(paymentId){
  var p=S.financePayments.find(function(fp){return fp.id===paymentId});
  if(!p)return;
  var acct=getExpenseAccount(p);
  var dateStr=p.date?(p.date instanceof Date?p.date.toISOString().split('T')[0]:p.date):null;
  var data={
    name:p.payerName||p.description||'One-off expense',
    amount:p.amount,direction:'outflow',frequency:'once',
    nextDue:dateStr,type:'expense',account:acct||'',
    category:p.category||'',
    notes:'From '+(p.source||'unknown')+' — '+(p.description||'')};
  var itemId=await dbAddScheduledItem(data);
  if(itemId){
    await loadScheduledItems();
    await linkExpenseToScheduled(paymentId,itemId);
    return}
  toast('Failed to save one-off','warn')}

function getExpenseAccount(p){
  var meta=typeof p.metadata==='string'?JSON.parse(p.metadata||'{}'):p.metadata||{};
  if(meta.brex_type==='card')return'brex_card';
  if(meta.brex_type==='cash')return'brex_cash';
  if(p.source==='mercury')return'mercury';
  return''}

function scoreExpenseMatch(p,item){
  if(item.direction!=='outflow')return-1;
  if(!item.isActive)return-1;
  /* Amount match: exact=0, close=proportional, >30% off=reject */
  var amtDiff=Math.abs(p.amount-item.amount)/Math.max(item.amount,0.01);
  if(amtDiff>0.30)return-1;
  var score=amtDiff*100;
  /* Account match bonus */
  var acct=getExpenseAccount(p);
  if(item.account&&acct&&item.account===acct)score-=20;
  else if(item.account&&acct&&item.account!==acct)score+=30;
  /* Exact amount match bonus */
  if(amtDiff<0.005)score-=50;
  return score}

/* ── Integration helpers ── */
async function loadIntegrations(){
  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    var resp=await fetch('/api/settings/credentials',{headers:{'Authorization':'Bearer '+token}});
    if(!resp.ok)return;
    var data=await resp.json();
    S.integrations=data.integrations||[];
  }catch(e){console.error('loadIntegrations:',e)}}

async function triggerSync(platform){
  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    toast('Syncing '+platform+'...','info');
    var platId=platform.replace(/-/g,'_');
    var resp=await fetch('/api/sync/'+platform,{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'}});
    var result=await resp.json();
    if(result.success){
      toast(platform+' synced: '+result.inserted+' new, '+result.updated+' updated'+(result.skipped?' ('+result.skipped+' skipped)':''),'ok');
      /* Log sync debug info to console */
      if(result.debug&&result.debug.length){
        console.group('%c'+platform+' sync log','font-weight:bold;color:#3ddc84');
        console.log('Summary:',{fetched:result.fetched,inserted:result.inserted,updated:result.updated,skipped:result.skipped});
        result.debug.forEach(function(d){console.log(d)});
        console.groupEnd()}
      await loadFinancePayments();await loadAccountBalances();await loadIntegrations();render();
    }else{
      var errMsg=result.error||'Unknown error';
      console.error(platform+' sync error:',errMsg);
      toast(platform+' sync failed. Check Integrations modal for details.','warn');
      var el=gel('intg-result-'+platId);
      if(el)el.innerHTML='<span style="color:var(--red);white-space:pre-wrap;word-break:break-all">Sync failed: '+esc(errMsg)+'</span>';
    }
  }catch(e){console.error('Sync error:',e);toast('Sync error: '+e.message,'warn')}}

async function syncAllIntegrations(silent){
  var platformMap={brex:'brex',mercury:'mercury',zoho_books:'zoho-books',zoho_payments:'zoho-payments'};
  var active=S.integrations.filter(function(i){return i.is_active});
  if(!active.length)return;
  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    if(!silent)toast('Syncing all integrations...','info');
    var anyNew=0;
    for(var i=0;i<active.length;i++){
      var slug=platformMap[active[i].platform];
      if(!slug)continue;
      try{
        var resp=await fetch('/api/sync/'+slug,{method:'POST',
          headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'}});
        var result=await resp.json();
        if(result.success){anyNew+=(result.inserted||0);
          console.log('[auto-sync]',slug+':',result.inserted+' new,',result.updated+' updated')}
        else{console.warn('[auto-sync]',slug+' failed:',result.error)}
      }catch(e){console.warn('[auto-sync]',slug+' error:',e.message)}}
    await loadFinancePayments();await loadAccountBalances();await loadIntegrations();render();
    if(!silent&&anyNew)toast(anyNew+' new transactions synced','ok');
    else if(!silent)toast('All integrations up to date','ok');
  }catch(e){console.error('syncAllIntegrations:',e)}}

async function cleanupDuplicates(){
  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    toast('Cleaning up duplicates...','info');
    var resp=await fetch('/api/sync/cleanup-duplicates',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'}});
    var result=await resp.json();
    if(result.success){
      toast('Cleanup: '+(result.deleted||0)+' deleted, '+(result.excluded||0)+' excluded, '+(result.statusRestored||0)+' restored','ok');
      await loadFinancePayments();render();
    }else{
      toast('Cleanup failed: '+(result.error||'Unknown'),'warn');
    }
  }catch(e){console.error('Cleanup error:',e);toast('Cleanup error: '+e.message,'warn')}}

async function saveIntegrationCredentials(platform,credentials,config){
  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session)return false;
    var token=sess.data.session.access_token;
    var resp=await fetch('/api/settings/credentials',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({platform:platform,credentials:credentials,config:config})});
    var result=await resp.json();
    if(result.success){await loadIntegrations();return true}
    else{toast('Save failed: '+(result.error||''),'warn');return false}
  }catch(e){toast('Save error: '+e.message,'warn');return false}}

async function testIntegrationConnection(platform,credentials,config){
  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session)return null;
    var token=sess.data.session.access_token;
    var resp=await fetch('/api/settings/test-connection',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({platform:platform,credentials:credentials,config:config})});
    return await resp.json();
  }catch(e){return{success:false,error:e.message}}}

async function deleteIntegration(platform){
  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session)return false;
    var token=sess.data.session.access_token;
    var resp=await fetch('/api/settings/credentials',{method:'DELETE',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({platform:platform})});
    var result=await resp.json();
    if(result.success){await loadIntegrations();return true}
    return false;
  }catch(e){return false}}

function setFinDirection(v){S.finDirection=v;render()}

async function dbEditClient(id,data){
  var row={name:data.name,status:data.status||'active',email:data.email||'',
    company:data.company||'',notes:data.notes||''};
  var res=await _sb.from('clients').update(row).eq('id',id);
  if(res.error){toast('Client update failed: '+res.error.message,'warn');return false}
  return true}

async function dbAssociatePayerToClient(payerEmail,payerName,clientId,category){
  var uid=await getUserId();if(!uid)return false;
  /* 1. Upsert payer_client_map */
  var mapRow={user_id:uid,payer_email:payerEmail||'',payer_name:payerName||'',client_id:clientId};
  var mapRes=await _sb.from('payer_client_map').upsert(mapRow,{onConflict:'user_id,payer_email,payer_name'});
  if(mapRes.error){toast('Mapping save failed: '+mapRes.error.message,'warn');return false}
  /* 2. Bulk update all unmatched payments from this payer */
  var upd={client_id:clientId,status:'matched'};
  if(category)upd.category=category;
  var query=_sb.from('finance_payments').update(upd).eq('user_id',uid).eq('status','unmatched');
  if(payerEmail)query=query.eq('payer_email',payerEmail);
  else query=query.eq('payer_name',payerName);
  var res=await query;
  if(res.error){toast('Bulk match failed: '+res.error.message,'warn');return false}
  return true}

function fmtUSD(n){return'$'+Number(n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}

async function loadData(){toast('Loading data...','info');
  try{
    /* Load campaigns first (payments/meetings reference them) */
    await Promise.all([loadTasks(),loadDone(),loadClientRecords(),loadReview(),loadCampaigns(),loadProjects(),loadOpportunities()]);
    /* Now load payments, campaign meetings, activity logs, phases & finance (payments/meetings need campaigns, phases need projects) */
    await Promise.all([loadPayments(),loadCampaignMeetings(),loadOpportunityMeetings(),loadActivityLogs(),loadPhases(),loadFinancePayments(),loadFinancePaymentSplits(),loadPayerMap(),loadIntegrations(),loadAccountBalances(),loadScheduledItems(),loadTeamMembers()]);
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
    toast('Loaded '+S.tasks.length+' tasks, '+S.done.length+' completed'+(S.review.length?', '+S.review.length+' to review':''),'ok')}catch(e){toast(''+e.message,'warn')}
  render()}

/* ═══════════ SUPABASE WRITE HELPERS ═══════════ */
/* These replace the old hook() webhook calls */

async function dbAddTask(taskData){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,item:taskData.item,due:taskData.due||null,importance:taskData.importance||'When Time Allows',
    est:taskData.est||0,category:taskData.category||'',client:taskData.client||'',end_client:taskData.endClient||'',
    type:taskData.type||'Business',notes:taskData.notes||'',status:taskData.status||'Planned',
    flag:!!taskData.flag,campaign:taskData.campaign||'',duration:taskData.duration||0,meeting_key:taskData.meetingKey||'',
    project:taskData.project||'',phase:taskData.phase||'',opportunity:taskData.opportunity||''};
  var res=await _sb.from('tasks').insert(row).select().single();
  if(res.error){toast('Save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditTask(id,taskData){
  var row={item:taskData.item,due:taskData.due||null,importance:taskData.importance||'When Time Allows',
    est:taskData.est||0,category:taskData.category||'',client:taskData.client||'',end_client:taskData.endClient||'',
    type:taskData.type||'Business',notes:taskData.notes||'',status:taskData.status||'Planned',
    flag:!!taskData.flag,campaign:taskData.campaign||'',duration:taskData.duration||0,meeting_key:taskData.meetingKey||'',
    project:taskData.project||'',phase:taskData.phase||'',opportunity:taskData.opportunity||''};
  var res=await _sb.from('tasks').update(row).eq('id',id);
  if(res.error){toast('Update failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeleteTask(id){
  var res=await _sb.from('tasks').delete().eq('id',id);
  if(res.error){toast('Delete failed: '+res.error.message,'warn');return false}
  return true}

async function dbCompleteTask(taskData){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,item:taskData.item,completed:new Date().toISOString(),
    due:taskData.due?taskData.due.toISOString().split('T')[0]:null,
    importance:taskData.importance||'',category:taskData.category||'',
    client:taskData.client||'',end_client:taskData.endClient||'',type:taskData.type||'Business',
    duration:taskData.duration||0,est:taskData.est||0,notes:taskData.notes||'',campaign:taskData.campaign||'',
    project:taskData.project||'',phase:taskData.phase||'',opportunity:taskData.opportunity||''};
  var res=await _sb.from('done').insert(row).select().single();
  if(res.error){toast('Complete failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbUpdateTaskDuration(id,duration){
  var res=await _sb.from('tasks').update({duration:duration}).eq('id',id);
  if(res.error)console.error('dbUpdateTaskDuration:',res.error)}

async function dbUpdateMeetingKey(id,meetingKey){
  var res=await _sb.from('tasks').update({meeting_key:meetingKey}).eq('id',id);
  if(res.error)console.error('dbUpdateMeetingKey:',res.error)}

async function dbDeleteReview(id){
  var res=await _sb.from('review').delete().eq('id',id);
  if(res.error){toast('Delete review failed: '+res.error.message,'warn');return false}
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
    billing_frequency:data.billingFrequency||'monthly',next_billing_date:data.nextBillingDate||null,
    notes:data.notes||''};
  var res=await _sb.from('campaigns').insert(row).select().single();
  if(res.error){toast('Campaign save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditCampaign(id,data){
  var row={};
  if('name' in data)row.name=data.name;
  if('partner' in data)row.partner=data.partner||'';
  if('endClient' in data)row.end_client=data.endClient||'';
  if('status' in data)row.status=data.status||'Setup';
  if('platform' in data)row.platform=data.platform||'';
  if('strategyFee' in data)row.strategy_fee=data.strategyFee||0;
  if('setupFee' in data)row.setup_fee=data.setupFee||0;
  if('monthlyFee' in data)row.monthly_fee=data.monthlyFee||0;
  if('monthlyAdSpend' in data)row.monthly_ad_spend=data.monthlyAdSpend||0;
  if('campaignTerm' in data)row.campaign_term=data.campaignTerm||'';
  if('plannedLaunch' in data)row.planned_launch=data.plannedLaunch||null;
  if('actualLaunch' in data)row.actual_launch=data.actualLaunch||null;
  if('renewalDate' in data)row.renewal_date=data.renewalDate||null;
  if('goal' in data)row.goal=data.goal||'';
  if('proposalLink' in data)row.proposal_link=data.proposalLink||'';
  if('reportsLink' in data)row.reports_link=data.reportsLink||'';
  if('videoAssetsLink' in data)row.video_assets_link=data.videoAssetsLink||'';
  if('transcriptsLink' in data)row.transcripts_link=data.transcriptsLink||'';
  if('awarenessLP' in data)row.awareness_lp=data.awarenessLP||'';
  if('considerationLP' in data)row.consideration_lp=data.considerationLP||'';
  if('decisionLP' in data)row.decision_lp=data.decisionLP||'';
  if('contractLink' in data)row.contract_link=data.contractLink||'';
  if('billingFrequency' in data)row.billing_frequency=data.billingFrequency||'monthly';
  if('nextBillingDate' in data)row.next_billing_date=data.nextBillingDate||null;
  if('notes' in data)row.notes=data.notes||'';
  var res=await _sb.from('campaigns').update(row).eq('id',id);
  if(res.error){toast('Campaign update failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeleteCampaign(id){
  var res=await _sb.from('campaigns').delete().eq('id',id);
  if(res.error){toast('Campaign delete failed: '+res.error.message,'warn');return false}
  return true}

async function dbAddPayment(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,campaign_id:data.campaignId,date:data.date||null,
    amount:data.amount||0,type:data.type||'',notes:data.notes||''};
  var res=await _sb.from('payments').insert(row).select().single();
  if(res.error){toast('Payment save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbAddCampaignMeeting(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,campaign_id:data.campaignId,date:data.date||null,
    title:data.title||'',recording_link:data.recordingLink||'',notes:data.notes||''};
  var res=await _sb.from('campaign_meetings').insert(row).select().single();
  if(res.error){toast('Meeting save failed: '+res.error.message,'warn');return null}
  return res.data}

/* ═══════════ PROJECT CRUD ═══════════ */
async function dbAddProject(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,name:data.name,description:data.description||'',status:data.status||'Planning',
    color:data.color||'#ff0099',start_date:data.startDate||null,target_date:data.targetDate||null,notes:data.notes||''};
  var res=await _sb.from('projects').insert(row).select().single();
  if(res.error){toast('Project save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditProject(id,data){
  var row={name:data.name,description:data.description||'',status:data.status||'Planning',
    color:data.color||'#ff0099',start_date:data.startDate||null,target_date:data.targetDate||null,notes:data.notes||''};
  var res=await _sb.from('projects').update(row).eq('id',id);
  if(res.error){toast('Project update failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeleteProject(id){
  var res=await _sb.from('projects').delete().eq('id',id);
  if(res.error){toast('Project delete failed: '+res.error.message,'warn');return false}
  return true}

async function dbAddPhase(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,project_id:data.projectId,name:data.name,description:data.description||'',
    sort_order:data.sortOrder||0,start_date:data.startDate||null,end_date:data.endDate||null,status:data.status||'Not Started'};
  var res=await _sb.from('project_phases').insert(row).select().single();
  if(res.error){toast('Phase save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditPhase(id,data){
  var row={name:data.name,description:data.description||'',sort_order:data.sortOrder||0,
    start_date:data.startDate||null,end_date:data.endDate||null,status:data.status||'Not Started'};
  var res=await _sb.from('project_phases').update(row).eq('id',id);
  if(res.error){toast('Phase update failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeletePhase(id){
  var res=await _sb.from('project_phases').delete().eq('id',id);
  if(res.error){toast('Phase delete failed: '+res.error.message,'warn');return false}
  return true}

/* ═══════════ OPPORTUNITY CRUD ═══════════ */
async function dbAddOpportunity(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,name:data.name,description:data.description||'',stage:data.stage||'Lead',
    type:data.type||'fc_partnership',
    client:data.client||'',end_client:data.endClient||'',contact_name:data.contactName||'',contact_email:data.contactEmail||'',
    strategy_fee:data.strategyFee||0,setup_fee:data.setupFee||0,monthly_fee:data.monthlyFee||0,
    monthly_ad_spend:data.monthlyAdSpend||0,
    probability:data.probability||50,expected_close:data.expectedClose||null,
    source:data.source||'',notes:data.notes||'',payment_plan:data.paymentPlan||'',
    payment_method:data.paymentMethod||'bank_transfer',processing_fee_pct:data.processingFeePct||0,
    receiving_account:data.receivingAccount||'',expected_monthly_duration:data.expectedMonthlyDuration||12};
  var res=await _sb.from('opportunities').insert(row).select().single();
  if(res.error){toast('Opportunity save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditOpportunity(id,data){
  var row={name:data.name,description:data.description||'',stage:data.stage||'Lead',
    type:data.type||'fc_partnership',
    client:data.client||'',end_client:data.endClient||'',contact_name:data.contactName||'',contact_email:data.contactEmail||'',
    strategy_fee:data.strategyFee||0,setup_fee:data.setupFee||0,monthly_fee:data.monthlyFee||0,
    monthly_ad_spend:data.monthlyAdSpend||0,
    probability:data.probability||50,expected_close:data.expectedClose||null,
    source:data.source||'',notes:data.notes||'',payment_plan:data.paymentPlan||'',
    closed_at:data.closedAt||null,converted_campaign_id:data.convertedCampaignId||null,
    payment_method:data.paymentMethod||'bank_transfer',processing_fee_pct:data.processingFeePct||0,
    receiving_account:data.receivingAccount||'',expected_monthly_duration:data.expectedMonthlyDuration||12};
  var res=await _sb.from('opportunities').update(row).eq('id',id);
  if(res.error){toast('Opportunity update failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeleteOpportunity(id){
  var res=await _sb.from('opportunities').delete().eq('id',id);
  if(res.error){toast('Opportunity delete failed: '+res.error.message,'warn');return false}
  return true}

/* ═══════════ OPPORTUNITY MEETINGS CRUD ═══════════ */
async function dbAddOpportunityMeeting(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,opportunity_id:data.opportunityId,date:data.date||new Date().toISOString(),
    title:data.title||'',recording_link:data.recordingLink||'',notes:data.notes||''};
  var res=await _sb.from('opportunity_meetings').insert(row).select().single();
  if(res.error){toast('Meeting save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbDeleteOpportunityMeeting(id){
  var res=await _sb.from('opportunity_meetings').delete().eq('id',id);
  if(res.error){toast('Meeting delete failed: '+res.error.message,'warn');return false}
  return true}

/* ═══════════ RETAIN LIVE → CLIENT CONVERSION ═══════════ */
async function convertToClient(id){
  var op=S.opportunities.find(function(o){return o.id===id});if(!op)return;
  if(!confirm('Convert "'+op.name+'" to a Client?\n\nThis will:\n\n\u2022 Create a client record for '+op.client+'\n\u2022 Mark this opportunity as Closed Won'))return;
  /* 1. Create client */
  var ok=await dbAddClient(op.client,'active');
  if(!ok){toast('Failed to create client','warn');return}
  /* 2. Set extra client fields */
  await loadClientRecords();
  var newCl=S.clientRecords.find(function(c){return c.name===op.client});
  if(newCl&&(op.contactEmail||op.client)){
    await dbEditClient(newCl.id,{name:newCl.name,status:'active',email:op.contactEmail||'',company:op.client,notes:op.notes||''})}
  /* 3. Close opportunity */
  op.stage='Closed Won';op.closedAt=new Date();
  await dbEditOpportunity(id,op);
  await loadClientRecords();
  toast('Client created: '+op.client,'ok');closeModal();render()}

async function dbAddClient(name,status){
  var uid=await getUserId();if(!uid)return false;
  var rec={user_id:uid,name:name};
  if(status)rec.status=status;
  var res=await _sb.from('clients').insert(rec).select().single();
  if(res.error){
    if(res.error.code==='23505')return true;/* already exists, not an error */
    toast('Client save failed: '+res.error.message,'warn');return false}
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
    toast('Calendar synced ('+S.calEvents.length+' events)','ok')}
  catch(e){calLoading=false;S.calEvents=[];console.warn('Calendar fetch failed:',e);updateCalSection()}}
function updateCalSection(){
  var el=document.getElementById('cal-section');
  if(!el||S.view!=='today')return;
  try{el.innerHTML=renderCalSection()}catch(e){el.innerHTML='<div style="padding:12px;color:var(--t4);font-size:12px">Calendar error. <span style="cursor:pointer;color:var(--pink)" onclick="TF.syncCal()">Retry</span></div>';console.warn('Cal render error:',e)}}

async function dbAddLog(taskId,text){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,task_id:taskId,text:text,ts:new Date().toISOString()};
  var res=await _sb.from('activity_logs').insert(row).select().single();
  if(res.error){toast('Log save failed: '+res.error.message,'warn');return null}
  return res.data}

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
  var h='<div class="flts">';h+='<input class="fl fl-s" placeholder="Search... ( / )" value="'+esc(S.filters.search||'')+'" oninput="TF.filtSearch(this.value)">';
  var pjs=S.projects.filter(function(p){return p.status!=='Archived'}).map(function(p){return p.name});
  var ops=S.opportunities.filter(function(o){return o.stage!=='Closed Won'&&o.stage!=='Closed Lost'}).map(function(o){return o.name});
  h+=fSel('client',cls,'All Clients');if(ecs.length)h+=fSel('endClient',ecs,'All End Clients');if(cps.length)h+=fSel('campaign',cps,'All Campaigns');if(pjs.length)h+=fSel('project',pjs,'All Projects');if(ops.length)h+=fSel('opportunity',ops,'All Opportunities');h+=fSel('cat',cas,'All Categories');h+=fSel('imp',ims,'All Importance');h+=fSel('type',TYPES,'All Types');
  if(showDate){h+='<input type="date" class="fl" value="'+(S.filters.dateFrom||'')+'" onchange="TF.filt(\'dateFrom\',this.value)" title="From">';
    h+='<input type="date" class="fl" value="'+(S.filters.dateTo||'')+'" onchange="TF.filt(\'dateTo\',this.value)" title="To">'}
  if(S.filters.client||S.filters.endClient||S.filters.campaign||S.filters.project||S.filters.opportunity||S.filters.cat||S.filters.imp||S.filters.type||S.filters.search||S.filters.dateFrom||S.filters.dateTo)h+='<button class="fl-clr" onclick="TF.clearF()">'+icon('x',12)+' Clear</button>';
  return h+'</div>'}
function fSel(key,opts,all){var cur=S.filters[key]||'';
  var h='<select class="fl'+(cur?' fl-active':'')+'" onchange="TF.filt(\''+key+'\',this.value)"><option value="">'+all+'</option>';
  opts.forEach(function(o){h+='<option'+(cur===o?' selected':'')+'>'+esc(o)+'</option>'});return h+'</select>'}
function applyFilters(items,useDate){var f=S.filters;return items.filter(function(t){
  if(f.client&&t.client!==f.client)return false;if(f.endClient&&t.endClient!==f.endClient)return false;if(f.cat&&t.category!==f.cat)return false;
  if(f.imp&&t.importance!==f.imp)return false;if(f.type&&t.type!==f.type)return false;
  if(f.campaign){var matchCp=S.campaigns.find(function(c){return c.name===f.campaign});if(matchCp&&t.campaign!==matchCp.id)return false}
  if(f.project){var matchPj=S.projects.find(function(p){return p.name===f.project});if(matchPj&&t.project!==matchPj.id)return false}
  if(f.opportunity){var matchOp=S.opportunities.find(function(o){return o.name===f.opportunity});if(matchOp&&t.opportunity!==matchOp.id)return false}
  if(f.search){var q=f.search.toLowerCase();if(t.item.toLowerCase().indexOf(q)===-1&&(t.notes||'').toLowerCase().indexOf(q)===-1&&(t.client||'').toLowerCase().indexOf(q)===-1&&(t.endClient||'').toLowerCase().indexOf(q)===-1)return false}
  if(useDate&&f.dateFrom){var d=t.completed||t.due;if(!d||d<new Date(f.dateFrom))return false}
  if(useDate&&f.dateTo){var d2=t.completed||t.due;var to=new Date(f.dateTo);to.setHours(23,59,59);if(!d2||d2>to)return false}
  return true})}
/* Finance helpers */
function setFinFilter(v){S.finFilter=v;render()}
function finFilteredPayments(){
  var fp=S.financePayments.slice();
  /* Always exclude 'excluded' records */
  fp=fp.filter(function(p){return p.status!=='excluded'});
  /* In the default/all tab, exclude types that have their own views or are noise */
  if(!S.finFilter||S.finFilter==='all'||S.finFilter===''){
    fp=fp.filter(function(p){return p.type!=='invoice'&&p.type!=='transfer'&&p.type!=='bill'})}
  if(S.finFilter==='unmatched'){
    /* Unmatched: actual customer payments needing client matching.
       All inflow payments from any source — Brex (clean: no transfers/settlements),
       Zoho Books (customer payments only), and legacy CSV imports. */
    fp=fp.filter(function(p){
      if(p.status!=='unmatched'||p.direction!=='inflow'||p.type!=='payment')return false;
      return true;
    });
  }
  else if(S.finFilter==='matched')fp=fp.filter(function(p){return p.status==='matched'&&p.type!=='transfer'});
  else if(S.finFilter==='split')fp=fp.filter(function(p){return p.status==='split'&&p.type!=='transfer'});
  else if(S.finFilter==='expenses')fp=fp.filter(function(p){return p.direction==='outflow'&&p.type!=='transfer'});
  if(S.finDirection)fp=fp.filter(function(p){return p.direction===S.finDirection});
  if(S.finSearch){var q=S.finSearch.toLowerCase();
    fp=fp.filter(function(p){return(p.payerEmail||'').toLowerCase().indexOf(q)!==-1||(p.payerName||'').toLowerCase().indexOf(q)!==-1||(p.description||'').toLowerCase().indexOf(q)!==-1||(p.notes||'').toLowerCase().indexOf(q)!==-1})}
  return fp}
function setFinSearch(v){S.finSearch=v;render()}
function finToggleAnalytics(){subNav(S.subView==='dashboard'?'payments':'dashboard')}
function finToggleBulk(){S.finBulkMode=!S.finBulkMode;S.finBulkSelected={};render()}
function finToggleSel(id){if(S.finBulkSelected[id])delete S.finBulkSelected[id];else S.finBulkSelected[id]=true;render()}
function finSelectAllVisible(){var fp=finFilteredPayments();fp.forEach(function(p){S.finBulkSelected[p.id]=true});render()}
function finDeselectAll(){S.finBulkSelected={};render()}
function finBulkCount(){return Object.keys(S.finBulkSelected).length}
function clientNameById(id){if(!id)return'';var c=S.clientRecords.find(function(r){return r.id===id});return c?c.name:''}

/* ═══════════ FINANCE RANGE HELPERS ═══════════ */
function finSetRange(key){
  S.finRange=key;try{localStorage.setItem('tf_fr',key)}catch(e){}
  if(key!=='custom'){S.finCustomStart='';S.finCustomEnd='';
    try{localStorage.removeItem('tf_fcs');localStorage.removeItem('tf_fce')}catch(e){}}
  render()}
function finSetCategory(v){S.finCatFilter=v;try{localStorage.setItem('tf_fcat',v)}catch(e){}render()}
function finSetClient(v){S.finClientFilter=v;try{localStorage.setItem('tf_fcli',v)}catch(e){}render()}
function finSetCustomRange(start,end){
  S.finCustomStart=start;S.finCustomEnd=end;
  try{localStorage.setItem('tf_fcs',start);localStorage.setItem('tf_fce',end)}catch(e){}
  if(start&&end)render()}
function finClearFilters(){
  S.finCatFilter='';S.finClientFilter='';
  if(S.finRange==='custom'){S.finRange='12m';S.finCustomStart='';S.finCustomEnd=''}
  try{localStorage.removeItem('tf_fcat');localStorage.removeItem('tf_fcli');
      localStorage.removeItem('tf_fcs');localStorage.removeItem('tf_fce');
      localStorage.setItem('tf_fr',S.finRange)}catch(e){}
  render()}

function finGetRangeConfig(rangeKey){
  var now=new Date(),curYear=now.getFullYear(),curMonth=now.getMonth();
  var cfg={endDate:null,label:'',granularity:'monthly'};
  switch(rangeKey){
    case'all':
      var earliest=null;
      S.financePayments.forEach(function(p){if(p.date&&(!earliest||p.date<earliest))earliest=p.date});
      cfg.startDate=earliest?new Date(earliest.getFullYear(),earliest.getMonth(),1):new Date(curYear-1,0,1);
      cfg.label='All Time';cfg.granularity='monthly';break;
    case'6m':
      cfg.startDate=new Date(curYear,curMonth-5,1);
      cfg.label='Last 6 Months';cfg.granularity='monthly';break;
    case'3m':
      cfg.startDate=new Date(curYear,curMonth-2,1);
      cfg.label='Last 3 Months';cfg.granularity='weekly';break;
    case'1m':
      cfg.startDate=new Date(curYear,curMonth,1);
      cfg.label='This Month';cfg.granularity='daily';break;
    case'ytd':
      cfg.startDate=new Date(curYear,0,1);
      cfg.label='This Year';cfg.granularity='monthly';break;
    case'ly':
      cfg.startDate=new Date(curYear-1,0,1);
      cfg.endDate=new Date(curYear-1,11,31,23,59,59);
      cfg.label='Last Year';cfg.granularity='monthly';break;
    case'custom':
      var cs=S.finCustomStart?new Date(S.finCustomStart+'T00:00:00'):null;
      var ce=S.finCustomEnd?new Date(S.finCustomEnd+'T00:00:00'):null;
      if(ce)ce.setHours(23,59,59,999);
      cfg.startDate=cs||new Date(curYear,curMonth-11,1);
      cfg.endDate=ce||null;
      cfg.label='Custom Range';
      if(cs&&ce){var spanDays=Math.round((ce-cs)/864e5);
        cfg.granularity=spanDays<=31?'daily':spanDays<=90?'weekly':'monthly'}
      else{cfg.granularity='monthly'}
      break;
    default:/* 12m */
      cfg.startDate=new Date(curYear,curMonth-11,1);
      cfg.label='Last 12 Months';cfg.granularity='monthly';
  }
  return cfg}

function finFilterByRange(payments,cfg){
  var includeNullDates=(cfg.label==='All Time');
  return payments.filter(function(p){
    if(!p.date)return includeNullDates;
    if(p.date<cfg.startDate)return false;
    if(cfg.endDate&&p.date>cfg.endDate)return false;
    return true})}

function finFilterByAnalyticsFilters(payments){
  var cat=S.finCatFilter,cli=S.finClientFilter;
  if(!cat&&!cli)return payments;
  return payments.filter(function(p){
    if(cli&&p.clientId!==cli)return false;
    if(cat){
      if(p.status==='split'){
        var splits=getSplitsForPayment(p.id);
        if(!splits.some(function(sp){return sp.category===cat}))return false
      }else{if(p.category!==cat)return false}
    }
    return true})}

function finAggregateByPeriod(payments,cfg){
  var labels=[],totals=[],buckets=[];
  var now=new Date(),end=cfg.endDate||now;
  var MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  if(cfg.granularity==='monthly'){
    var d=new Date(cfg.startDate.getFullYear(),cfg.startDate.getMonth(),1);
    while(d<=end){
      labels.push(MN[d.getMonth()]+' '+String(d.getFullYear()).slice(2));
      buckets.push({y:d.getFullYear(),m:d.getMonth()});
      totals.push(0);
      d=new Date(d.getFullYear(),d.getMonth()+1,1)}
    payments.forEach(function(p){if(!p.date)return;
      var py=p.date.getFullYear(),pm=p.date.getMonth();
      for(var i=0;i<buckets.length;i++){
        if(buckets[i].y===py&&buckets[i].m===pm){totals[i]+=p.amount;break}}});

  }else if(cfg.granularity==='weekly'){
    var ws=new Date(cfg.startDate);
    var dow=ws.getDay();ws.setDate(ws.getDate()-(dow===0?6:dow-1));/* align to Monday */
    while(ws<=end){
      var we=new Date(ws);we.setDate(we.getDate()+6);
      labels.push((ws.getMonth()+1)+'/'+ws.getDate()+' – '+(we.getMonth()+1)+'/'+we.getDate());
      buckets.push({s:new Date(ws),e:new Date(we.getFullYear(),we.getMonth(),we.getDate(),23,59,59)});
      totals.push(0);
      ws=new Date(ws);ws.setDate(ws.getDate()+7)}
    payments.forEach(function(p){if(!p.date)return;
      for(var i=0;i<buckets.length;i++){
        if(p.date>=buckets[i].s&&p.date<=buckets[i].e){totals[i]+=p.amount;break}}});

  }else if(cfg.granularity==='daily'){
    var dd=new Date(cfg.startDate);
    var DN=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    while(dd<=end){
      labels.push(DN[dd.getDay()]+' '+dd.getDate());
      buckets.push({y:dd.getFullYear(),m:dd.getMonth(),d:dd.getDate()});
      totals.push(0);
      dd=new Date(dd.getFullYear(),dd.getMonth(),dd.getDate()+1)}
    payments.forEach(function(p){if(!p.date)return;
      var py=p.date.getFullYear(),pm=p.date.getMonth(),pd=p.date.getDate();
      for(var i=0;i<buckets.length;i++){
        if(buckets[i].y===py&&buckets[i].m===pm&&buckets[i].d===pd){totals[i]+=p.amount;break}}});
  }
  return{labels:labels,totals:totals,buckets:buckets}}

function _finBucketIndex(date,buckets,granularity){
  if(granularity==='monthly'){
    var py=date.getFullYear(),pm=date.getMonth();
    for(var i=0;i<buckets.length;i++){if(buckets[i].y===py&&buckets[i].m===pm)return i}
  }else if(granularity==='weekly'){
    for(var i=0;i<buckets.length;i++){if(date>=buckets[i].s&&date<=buckets[i].e)return i}
  }else if(granularity==='daily'){
    var py=date.getFullYear(),pm=date.getMonth(),pd=date.getDate();
    for(var i=0;i<buckets.length;i++){if(buckets[i].y===py&&buckets[i].m===pm&&buckets[i].d===pd)return i}
  }
  return-1}

function finAggregateByCatAndPeriod(payments,cfg){
  var base=finAggregateByPeriod([],cfg);/* get empty bucket structure */
  var catSet={};
  payments.forEach(function(p){
    if(p.status==='split'){getSplitsForPayment(p.id).forEach(function(sp){catSet[sp.category||'Uncategorised']=true})}
    else{catSet[p.category||'Uncategorised']=true}});
  var catNames=Object.keys(catSet).sort();
  var stackedData={};catNames.forEach(function(c){
    stackedData[c]=[];for(var i=0;i<base.labels.length;i++)stackedData[c].push(0)});
  payments.forEach(function(p){if(!p.date)return;
    var idx=_finBucketIndex(p.date,base.buckets,cfg.granularity);if(idx===-1)return;
    if(p.status==='split'){
      getSplitsForPayment(p.id).forEach(function(sp){
        var c=sp.category||'Uncategorised';if(stackedData[c])stackedData[c][idx]+=sp.amount});
    }else{
      var c=p.category||'Uncategorised';if(stackedData[c])stackedData[c][idx]+=p.amount}});
  return{labels:base.labels,catNames:catNames,stackedData:stackedData}}

function finGetPreviousPeriodConfig(cfg){
  var end=cfg.endDate||new Date();
  var duration=end.getTime()-cfg.startDate.getTime();
  var prevEnd=new Date(cfg.startDate.getTime()-1);
  var prevStart=new Date(prevEnd.getTime()-duration);
  return{startDate:prevStart,endDate:prevEnd,granularity:cfg.granularity,label:'Previous Period'}}

/* ═══════════ NAV ═══════════ */
function nav(id,sub){
  if(isMobile()){var mobIds=['mob-add','today','tasks','opportunities'];if(mobIds.indexOf(id)===-1)id='mob-add'}
  S.view=id;
  if(hasSubs(id)){S.subView=sub||getDefaultSub(id)}else{S.subView=''}
  save();
  document.querySelectorAll('.s-item').forEach(function(n){
    n.classList.toggle('on',n.dataset.v===id)});
  render();closeMenu()}
function buildNav(){var h='';
  SECTIONS.forEach(function(sec){
    var badge='';
    if(sec.id==='tasks'&&S.review.length)badge='<span class="nav-badge">'+S.review.length+'</span>';
    var isOn=sec.id===S.view;
    if(sec.soon){
      h+='<div class="s-item s-item-soon" data-v="'+sec.id+'">';
      h+='<span class="ico">'+icon(sec.icon)+'</span><span class="s-label">'+sec.label+'</span>';
      h+='<span class="s-right"><span class="s-soon-badge">Soon</span>';
      if(sec.kbd)h+='<span class="kbd">'+sec.kbd+'</span>';
      h+='</span></div>';
      return;
    }
    h+='<div class="s-item'+(isOn?' on':'')+'" data-v="'+sec.id+'" onclick="TF.nav(\''+sec.id+'\')">';
    h+='<span class="ico">'+icon(sec.icon)+'</span><span class="s-label">'+sec.label+'</span>';
    h+='<span class="s-right">'+badge;
    if(sec.kbd)h+='<span class="kbd">'+sec.kbd+'</span>';
    h+='</span></div>';
  });
  gel('s-nav').innerHTML=h;
  /* Position the active indicator */
  setTimeout(function(){var navEl=gel('s-nav');var active=navEl.querySelector('.s-item.on');var ind=navEl.querySelector('.s-nav-indicator');
    if(!ind){ind=document.createElement('div');ind.className='s-nav-indicator';navEl.appendChild(ind)}
    if(active){ind.style.top=active.offsetTop+'px';ind.style.height=active.offsetHeight+'px'}else{ind.style.height='0px'}},0);
  /* Sidebar collapse + sub-nav for sections with subs */
  var sidebar=gel('sidebar');var subNavEl=gel('sub-nav');
  var sec=currentSection();
  if(!isMobile()&&sec&&sec.subs){
    sidebar.classList.add('collapsed');
    buildSubNav(sec);
  }else{
    sidebar.classList.remove('collapsed');
    if(subNavEl){subNavEl.classList.remove('open');subNavEl.innerHTML=''}
  }
  /* Sync bottom tab bar */
  var btmNav=gel('btm-nav');
  if(btmNav){
    if(isMobile()){
      var bh='';MOB_VIEWS.forEach(function(mv){
        var isOn=mv.id===S.view;
        var badge='';if(mv.id==='tasks'&&S.review.length)badge='<span class="btm-badge" id="btm-badge">'+S.review.length+'</span>';
        bh+='<button class="btm-tab'+(isOn?' on':'')+'" data-v="'+mv.id+'" onclick="TF.nav(\''+mv.id+'\')">';
        bh+='<span class="btm-ico">'+icon(mv.icon)+'</span><span class="btm-lbl">'+mv.label+'</span>'+badge+'</button>'});
      btmNav.innerHTML=bh;
    } else {
      btmNav.querySelectorAll('.btm-tab').forEach(function(tab){
        tab.classList.toggle('on',tab.dataset.v===S.view)});
      var btmBadge=gel('btm-badge');if(btmBadge)btmBadge.textContent=S.review.length?S.review.length:'';
    }}}
function buildSubNav(sec){
  var el=gel('sub-nav');if(!el)return;
  var h='<div class="sub-nav-header"><span class="sub-nav-header-ico">'+icon(sec.icon,14)+'</span> '+sec.label+'</div>';
  sec.subs.forEach(function(sub){
    var isOn=S.subView===sub.id;
    h+='<div class="sub-nav-item'+(isOn?' on':'')+'" onclick="TF.subNav(\''+sub.id+'\')">';
    h+='<span class="ico">'+icon(sub.icon,14)+'</span>'+sub.label+'</div>'});
  el.innerHTML=h;el.classList.add('open')}
function openMenu(){if(isMobile())return;gel('sidebar').classList.add('open');gel('mob-overlay').classList.add('on');
  var mt=document.querySelector('.btm-tab[data-v="more"]');if(mt)mt.classList.add('on')}
function closeMenu(){gel('sidebar').classList.remove('open');gel('mob-overlay').classList.remove('on');
  var btmNav=gel('btm-nav');if(btmNav){btmNav.querySelectorAll('.btm-tab').forEach(function(tab){tab.classList.toggle('on',tab.dataset.v===S.view)})}}
document.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&!e.shiftKey){
    var modal=gel('modal');if(modal&&modal.classList.contains('on')){
      var isTextarea=e.target.tagName==='TEXTAREA';if(!isTextarea){
        e.preventDefault();
        var saveBtn=modal.querySelector('.btn-p');if(saveBtn)saveBtn.click();return}}}
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT')return;
  var n=parseInt(e.key);if(n>=0&&n<=9){var v=VIEWS_FLAT.find(function(vv){return vv.kbd===e.key&&!vv.soon});if(v)nav(v.id)}
  if(e.key==='Escape'){closeModal();closeCmdPalette();closeFocus()}
  if(e.key==='n'||e.key==='N'){if(isMobile())nav('mob-add');else openAddModal()}
  if(e.key==='s'||e.key==='S'){openDailySummary()}
  if(e.key==='/'){e.preventDefault();setTimeout(function(){var si=document.querySelector('.fl-s');if(si)si.focus()},50)}
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openCmdPalette()}
  if((e.ctrlKey||e.metaKey)&&e.key==='b'&&S.view==='tasks'){e.preventDefault();toggleBulk()}
  if(e.key==='['||e.key===']'){var _sec=currentSection();if(_sec&&_sec.subs){var _idx=-1;_sec.subs.forEach(function(s,i){if(s.id===S.subView)_idx=i});if(_idx===-1)_idx=0;if(e.key===']')_idx=(_idx+1)%_sec.subs.length;else _idx=(_idx-1+_sec.subs.length)%_sec.subs.length;subNav(_sec.subs[_idx].id)}}});
/* Swipe to close sidebar */
(function(){var ov=gel('mob-overlay'),sx=0;if(!ov)return;
  ov.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});
  ov.addEventListener('touchmove',function(e){if(e.touches[0].clientX-sx<-50)closeMenu()},{passive:true})})();
