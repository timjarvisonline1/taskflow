'use strict';

/* ═══════════ CONSTANTS ═══════════ */
var P=['#ff0099','#7928ca','#ff9800','#3ddc84','#4da6ff','#2dd4bf','#ff3358','#a855f7','#ccff00','#ff66c4','#22d3ee','#e6007a'];
var CATS=['One-on-One','Internal Meeting','Workshop / Training','Deep Work','Content Creation','Communication','Email','Admin / Ops','Finance','Strategy / Planning','Sales / Outreach','Research','Review / QA','Travel / Offsite'];
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
  sparkle:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>',
  inbox:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  alert:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  activity:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/></svg>',
  menu:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/></svg>',
  chevron_down:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  chevron_right:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  grip:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>',
  mic:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>',
  link:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  check:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  users:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  briefcase:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>',
  bar_chart:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></svg>',
  sun:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  layers:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22.54 12.43-1.96-.89-8.58 3.91a2 2 0 0 1-1.66 0l-8.58-3.9-1.96.89a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22.54 16.43-1.96-.89-8.58 3.91a2 2 0 0 1-1.66 0l-8.58-3.9-1.96.89a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/></svg>',
  arrow_left:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
  archive:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>',
  eye:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>',
  eye_off:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>',
  send:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>',
  phone:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  contact:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 2v2"/><path d="M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><path d="M8 2v2"/><rect width="16" height="18" x="4" y="2" rx="2"/><circle cx="12" cy="11" r="3"/></svg>',
  bold:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8"/></svg>',
  italic:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="10" y1="4" y2="4"/><line x1="14" x2="5" y1="20" y2="20"/><line x1="15" x2="9" y1="4" y2="20"/></svg>',
  underline:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4v6a6 6 0 0 0 12 0V4"/><line x1="4" x2="20" y1="20" y2="20"/></svg>',
  strikethrough:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" x2="20" y1="12" y2="12"/></svg>',
  list_ul:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
  list_ol:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" x2="21" y1="6" y2="6"/><line x1="10" x2="21" y1="12" y2="12"/><line x1="10" x2="21" y1="18" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
  quote:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 6H3"/><path d="M21 12H8"/><path d="M21 18H8"/><path d="M3 12v6"/></svg>',
  paperclip:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
  forward:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>',
  reply_all:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 17 2 12 7 7"/><polyline points="12 17 7 12 12 7"/><path d="M22 18v-2a4 4 0 0 0-4-4H7"/></svg>',
  reply:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>',
  download:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  settings:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  align_left:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="15" x2="3" y1="12" y2="12"/><line x1="17" x2="3" y1="18" y2="18"/></svg>',
  align_center:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="17" x2="7" y1="12" y2="12"/><line x1="19" x2="5" y1="18" y2="18"/></svg>',
  align_right:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="21" x2="3" y1="6" y2="6"/><line x1="21" x2="9" y1="12" y2="12"/><line x1="21" x2="7" y1="18" y2="18"/></svg>',
  indent:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8 7 12 3 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/></svg>',
  outdent:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 8 3 12 7 16"/><line x1="21" x2="11" y1="12" y2="12"/><line x1="21" x2="11" y1="6" y2="6"/><line x1="21" x2="11" y1="18" y2="18"/></svg>',
  eraser:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>',
  undo:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>',
  redo:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/></svg>',
  smile:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>',
  image:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>',
  type:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" x2="15" y1="20" y2="20"/><line x1="12" x2="12" y1="4" y2="20"/></svg>',
  highlighter:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 11-6 6v3h9l3-3"/><path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4"/></svg>',
  filter:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  building:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>'
};
function icon(name,size){var s=ICONS[name]||'';if(size&&s){s=s.replace(/width="\d+"/,'width="'+size+'"').replace(/height="\d+"/,'height="'+size+'"')}return s}

var PAY_CATS=['Products','Retain Live','F&C Campaign Set-Up','F&C Strategy','F&C Monthly Fees','Other'];
var EXPENSE_CATS=['Software & SaaS','Advertising & Marketing','Travel','Food & Dining','Office & Supplies','Professional Services','Subscriptions','Insurance','Taxes & Fees','Personal','Uncategorised'];

/* ═══════════ OPPORTUNITY TYPE CONFIG ═══════════ */
var OPP_TYPES={
  retain_live:{label:'Retain Live',short:'RL',
    stages:['Meeting Booked','Interested','Agreement Generated','Agreement Sent'],
    closedStages:['Closed Won','Closed Lost'],
    color:'var(--green)',conversion:'client',
    defaultFees:{strategyFee:5000}},
  fc_partnership:{label:'F&C Partnerships',short:'F&C-P',
    stages:['Brief Received','Meeting Booked','Meeting Complete','Video Tracking','Pitch Development','Proposal Delivered'],
    closedStages:['Closed Won','Closed Lost'],awaitingStage:'Awaiting',
    color:'var(--blue)',conversion:'campaign',
    defaultFees:{setupFee:5000,monthlyFee:2000}},
  fc_direct:{label:'F&C Direct',short:'F&C-D',
    stages:['Lead Generated','Discovery Call','Video Tracking','Proactive Pitch','Negotiation'],
    closedStages:['Closed Won','Closed Lost'],
    color:'var(--purple50)',conversion:'campaign',
    defaultFees:{}}
};
function oppTypeConf(type){return OPP_TYPES[type]||OPP_TYPES.fc_partnership}
function oppAllStages(type){var c=oppTypeConf(type);var all=c.stages.concat(c.closedStages);if(c.awaitingStage)all.push(c.awaitingStage);return all}
function oppIsClosedStage(stage){return stage==='Closed Won'||stage==='Closed Lost'}

var S={tasks:[],done:[],review:[],clients:[],campaigns:[],payments:[],campaignMeetings:[],projects:[],phases:[],opportunities:[],oppMeetings:[],timers:{},view:'dashboard',subView:'',layout:'grid',groupBy:'importance',clientDetailName:'',campaignDetailId:'',
  templates:[],bulkMode:false,bulkSelected:{},calEvents:[],
  pins:{},actLogs:{},customOrder:[],schedOrder:{},projTaskOrder:{},focusTask:null,focusDuration:25,recurrLast:{},
  filters:{client:'',endClient:'',campaign:'',project:'',opportunity:'',cat:'',imp:'',type:'',search:'',dateFrom:'',dateTo:''},dashPeriod:30,collapsed:{},doneSort:'date',cpShowPaused:false,cpShowCompleted:false,opShowClosed:false,opTypeFilter:'',opViewMode:'pipeline',opPartnerFilter:'',
  financePayments:[],financePaymentSplits:[],clientRecords:[],payerMap:[],finFilter:'unmatched',finSearch:'',finBulkMode:false,finBulkSelected:{},finRange:'12m',finCatFilter:'',finClientFilter:'',finCustomStart:'',finCustomEnd:'',finDirection:'',integrations:[],
  accountBalances:[],scheduledItems:[],teamMembers:[],forecastHorizon:90,forecastScenario:'expected',weeklyRange:'all',clientSort:'name',campaignTab:'overview',campaignNotes:{},clientNotes:{},
  gmailThreads:[],gmailSearch:'',gmailFilter:'inbox',gmailThread:null,gmailThreadId:'',gmailUnread:0,_gmailFetching:false,_gmailCache:{},
  emailFilters:{client:'',endClient:'',opportunity:'',campaign:''},emailFilterExclude:{client:false,endClient:false,opportunity:false,campaign:false},
  emailBulkMode:false,emailBulkSelected:{},
  contacts:[],scheduledEmails:[],emailRules:[],
  meetings:[],meetingDetail:null,meetingSearch:'',meetingsPage:1,meetingFilter:'',
  endClients:[],ecSort:'name',
  prospectCompanies:[],prospects:[],pcSort:'name',pSort:'name',
  _ecCandidates:[],
  clientTab:'overview',endClientTab:'overview',opportunityTab:'overview'};

var SECTIONS=[
  {id:'dashboard',icon:'dashboard',label:'Dashboard',kbd:'1'},
  {id:'today',icon:'calendar',label:'Schedule',kbd:'2',subs:[
    {id:'schedule',label:'Suggested Schedule',icon:'calendar'},
    {id:'day',label:"Today's Schedule",icon:'today'},
    {id:'prep',label:'Meeting Prep',icon:'users'},
    {id:'analytics',label:'Analytics',icon:'bar_chart'},
    {id:'daily',label:'Daily Summary',icon:'sun'},
    {id:'weekly',label:'Weekly Summary',icon:'layers'},
    {id:'capacity',label:'Weekly Capacity',icon:'activity'}
  ]},
  {id:'tasks',icon:'tasks',label:'Tasks',kbd:'3',subs:[
    {id:'open',label:'Open Tasks',icon:'tasks'},
    {id:'done',label:'Completed',icon:'check'},
    {id:'review',label:'Review Queue',icon:'mail'},
    {id:'inbox',label:'Quick Add Queue',icon:'inbox'}
  ]},
  {id:'opportunities',icon:'gem',label:'Sales',kbd:'4',subs:[
    {id:'analytics',label:'Analytics',icon:'dashboard'},
    {id:'retain_live',label:'Retain Live',icon:'users'},
    {id:'fc_partnership',label:'F&C Partnerships',icon:'briefcase'},
    {id:'fc_direct',label:'F&C Direct',icon:'zap'},
    {id:'profitability',label:'Profitability',icon:'activity'}
  ]},
  {id:'campaigns',icon:'target',label:'Campaigns',kbd:'5',subs:[
    {id:'pipeline',label:'Pipeline',icon:'target'},
    {id:'list',label:'List',icon:'menu'},
    {id:'performance',label:'Performance',icon:'activity'}
  ]},
  {id:'projects',icon:'folder',label:'Projects',kbd:'6',subs:[
    {id:'board',label:'Board',icon:'grip'},
    {id:'list',label:'List',icon:'menu'},
    {id:'timeline',label:'Timeline',icon:'calendar'}
  ]},
  {id:'clients',icon:'clients',label:'Clients',kbd:'7',subs:[
    {id:'active',label:'Active',icon:'clients'},
    {id:'lapsed',label:'Lapsed',icon:'clock'},
    {id:'end_clients',label:'End Clients',icon:'building'},
    {id:'prospects',label:'Prospects',icon:'target'},
    {id:'people',label:'People',icon:'users'},
    {id:'ec_review',label:'Contact Review',icon:'sparkle'}
  ]},
  {id:'finance',icon:'activity',label:'Finance',kbd:'8',subs:[
    {id:'overview',label:'Overview',icon:'dashboard'},
    {id:'payments',label:'Transactions',icon:'activity'},
    {id:'invoices',label:'Invoices',icon:'file'},
    {id:'upcoming',label:'Upcoming',icon:'calendar'},
    {id:'recurring',label:'Recurring',icon:'refresh'},
    {id:'forecast',label:'Forecast',icon:'pipeline'},
    {id:'team',label:'Team',icon:'clients'}
  ]},
  {id:'email',icon:'mail',label:'Email',kbd:'9',subs:[
    {id:'e-action',label:'Action Required',icon:'zap'},
    {id:'inbox',label:'Inbox',icon:'inbox'},
    {id:'sent',label:'Sent',icon:'mail'},
    {id:'all',label:'All Mail',icon:'folder'},
    {id:'e-drafts',label:'Drafts',icon:'edit'},
    {id:'e-scheduled',label:'Scheduled',icon:'clock'},
    {id:'e-active',label:'Clients (Active)',icon:'users',smart:true},
    {id:'e-lapsed',label:'Clients (Lapsed)',icon:'clock',smart:true},
    {id:'e-prospects',label:'Prospects',icon:'gem',smart:true},
    {id:'e-campaigns',label:'By Campaign',icon:'target',smart:true},
    {id:'e-opportunities',label:'By Opportunity',icon:'trending_up',smart:true},
    {id:'e-other',label:'Other',icon:'mail',smart:true}
  ]},
  {id:'meetings',icon:'mic',label:'Meetings',kbd:'0'}
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
function subNav(subId){
  if(S.gmailThreadId)_flushEmailTimer();
  if(S.view==='email'){
    /* Use setGmailFilter for email views — handles caching, fetching, and state sync */
    setGmailFilter(subId);return}
  S.subView=subId;
  save();render()}

/* ═══════════ MOBILE ═══════════ */
function isMobile(){return window.innerWidth<=860}
var MOB_VIEWS=[
  {id:'mob-add',icon:'plus',label:'Add'},
  {id:'tasks',icon:'tasks',label:'Tasks'},
  {id:'mob-review',icon:'inbox',label:'Review'},
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
  /* Skip rebuild if quick-add input is focused (prevents losing typed text) */
  var qa=gel('qa-item');if(qa&&document.activeElement===qa)return;
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

/* ═══════════ OPPORTUNITY DRAG & DROP ═══════════ */
var _oppDragId=null;

function oppDragStart(e,oppId){
  if(window.innerWidth<=480){e.preventDefault();return}
  _oppDragId=oppId;
  e.dataTransfer.effectAllowed='move';
  e.dataTransfer.setData('text/plain',oppId);
  var card=e.target.closest('.op-card');if(card)card.classList.add('dragging');
  setTimeout(function(){document.querySelectorAll('.op-column').forEach(function(col){col.classList.add('op-col-drop-target')})},0)}

function oppDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move'}

function oppDragEnter(e){
  var col=e.target.closest('.op-column');
  if(col){document.querySelectorAll('.op-column').forEach(function(c){c.classList.remove('op-col-drag-over')});col.classList.add('op-col-drag-over')}}

function oppDragLeave(e){
  var col=e.target.closest('.op-column');
  if(col&&!col.contains(e.relatedTarget)){col.classList.remove('op-col-drag-over')}}

function oppDragEnd(){
  _oppDragId=null;
  document.querySelectorAll('.op-column').forEach(function(c){c.classList.remove('op-col-drop-target','op-col-drag-over')});
  document.querySelectorAll('.op-card').forEach(function(c){c.classList.remove('dragging')})}

async function oppDragDrop(e,targetStage,targetType){
  e.preventDefault();e.stopPropagation();
  if(!_oppDragId)return;
  var op=S.opportunities.find(function(o){return o.id===_oppDragId});
  if(!op){_oppDragId=null;return}
  /* Only allow drops within the same pipeline type */
  if(op.type!==targetType){toast('Cannot move between different pipelines','warn');oppDragEnd();return}
  if(op.stage===targetStage){oppDragEnd();return}
  var oldStage=op.stage;
  op.stage=targetStage;
  var ok=await dbUpdateOpStage(op.id,targetStage);
  if(!ok){op.stage=oldStage;toast('Failed to update stage','warn')}
  else{toast(op.name+' → '+targetStage,'ok')}
  oppDragEnd();render()}

async function dbUpdateOpStage(id,stage){
  var res=await _sb.from('opportunities').update({stage:stage}).eq('id',id);
  if(res.error){console.error('Stage update failed:',res.error);return false}
  save();return true}

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
      category:r.category||'',client:r.client||'',endClient:r.end_client||'',endClientId:r.end_client_id||null,type:r.type||'Business',
      duration:r.duration||0,notes:r.notes||'',status:r.status||'Planned',flag:!!r.flag,campaign:r.campaign||'',meetingKey:r.meeting_key||'',project:r.project||'',phase:r.phase||'',opportunity:r.opportunity||'',isInbox:!!r.is_inbox,emailThreadId:r.email_thread_id||''}})}

async function loadDone(){
  var res=await _sb.from('done').select('*').order('completed',{ascending:false});
  if(res.error){console.error('loadDone:',res.error);return}
  S.done=(res.data||[]).map(function(r){
    return{id:r.id,item:r.item,completed:r.completed?new Date(r.completed):new Date(),due:r.due?new Date(r.due+'T00:00:00'):null,
      importance:r.importance||'',category:r.category||'',client:r.client||'',endClient:r.end_client||'',endClientId:r.end_client_id||null,
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
      category:r.category||'',client:r.client||'',endClient:r.end_client||'',endClientId:r.end_client_id||null,
      type:r.type||'Business',est:r.est||0,due:r.due?new Date(r.due+'T00:00:00'):null,
      source:r.source||'',created:r.created?new Date(r.created):new Date(),campaign:r.campaign||''}})}

async function loadCampaigns(){
  var res=await _sb.from('campaigns').select('*').order('created_at',{ascending:false});
  if(res.error){console.error('loadCampaigns:',res.error);return}
  S.campaigns=(res.data||[]).map(function(r){
    return{id:r.id,name:r.name||'',partner:r.partner||'',endClient:r.end_client||'',endClientId:r.end_client_id||null,
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
      client:r.client||'',endClient:r.end_client||'',endClientId:r.end_client_id||null,contactName:r.contact_name||'',contactEmail:r.contact_email||'',
      strategyFee:parseFloat(r.strategy_fee)||0,setupFee:parseFloat(r.setup_fee)||0,
      monthlyFee:parseFloat(r.monthly_fee)||0,monthlyAdSpend:parseFloat(r.monthly_ad_spend)||0,
      probability:r.probability||50,
      expectedClose:r.expected_close?new Date(r.expected_close+'T00:00:00'):null,
      source:r.source||'',notes:r.notes||'',paymentPlan:r.payment_plan||'',
      closedAt:r.closed_at?new Date(r.closed_at):null,
      convertedCampaignId:r.converted_campaign_id||'',
      paymentMethod:r.payment_method||'bank_transfer',processingFeePct:parseFloat(r.processing_fee_pct)||0,
      receivingAccount:r.receiving_account||'',expectedMonthlyDuration:r.expected_monthly_duration||12,
      contactJobTitle:r.contact_job_title||'',prospectWebsite:r.prospect_website||'',
      previousRelationship:r.previous_relationship||'',companyDescription:r.company_description||'',
      prospectDescription:r.prospect_description||'',videoStrategyBenefits:r.video_strategy_benefits||'',
      closeReason:r.close_reason||'',
      prospectCompanyId:r.prospect_company_id||null,prospectId:r.prospect_id||null,
      created:r.created_at?new Date(r.created_at):new Date()}})}

async function loadOpportunityMeetings(){
  var res=await _sb.from('opportunity_meetings').select('*').order('date',{ascending:false});
  if(res.error){console.error('loadOpportunityMeetings:',res.error);return}
  S.oppMeetings=(res.data||[]).map(function(r){
    return{id:r.id,opportunityId:r.opportunity_id,date:r.date?new Date(r.date):new Date(),
      title:r.title||'',recordingLink:r.recording_link||'',notes:r.notes||'',
      created:r.created_at?new Date(r.created_at):new Date()}})}

async function loadCampaignNotes(){
  var res=await _sb.from('campaign_notes').select('*').order('created_at',{ascending:false});
  if(res.error){console.error('loadCampaignNotes:',res.error);return}
  S.campaignNotes={};
  (res.data||[]).forEach(function(r){
    var cid=r.campaign_id;if(!cid)return;
    if(!S.campaignNotes[cid])S.campaignNotes[cid]=[];
    S.campaignNotes[cid].push({id:r.id,text:r.text||'',created:r.created_at?new Date(r.created_at):new Date()})})}

async function loadClientNotes(){
  var res=await _sb.from('client_notes').select('*').order('created_at',{ascending:false});
  if(res.error){console.error('loadClientNotes:',res.error);return}
  S.clientNotes={};
  (res.data||[]).forEach(function(r){
    var cid=r.client_id;if(!cid)return;
    if(!S.clientNotes[cid])S.clientNotes[cid]=[];
    S.clientNotes[cid].push({id:r.id,text:r.text||'',created:r.created_at?new Date(r.created_at):new Date()})})}

/* ═══════════ FINANCE DATA ═══════════ */
async function loadFinancePayments(){
  var res=await _sb.from('finance_payments').select('*').order('date',{ascending:false});
  if(res.error){console.error('loadFinancePayments:',res.error);return}
  S.financePayments=(res.data||[]).map(function(r){
    return{id:r.id,date:r.date?new Date(r.date+'T00:00:00'):null,amount:parseFloat(r.amount)||0,
      fee:parseFloat(r.fee)||0,net:parseFloat(r.net)||0,source:r.source||'',sourceId:r.source_id||'',
      payerEmail:r.payer_email||'',payerName:r.payer_name||'',description:r.description||'',
      category:r.category||'',clientId:r.client_id||'',campaignId:r.campaign_id||'',
      endClient:r.end_client||'',endClientId:r.end_client_id||null,notes:r.notes||'',status:r.status||'unmatched',
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

async function loadEndClients(){
  var res=await _sb.from('end_clients').select('*').order('name');
  if(res.error){console.error('loadEndClients:',res.error);return}
  S.endClients=(res.data||[]).map(function(r){
    return{id:r.id,name:r.name||'',clientId:r.client_id||'',notes:r.notes||'',status:r.status||'active',createdAt:r.created_at||''}})}

async function loadContacts(){
  var res=await _sb.from('contacts').select('*').order('last_name');
  if(res.error){console.error('loadContacts:',res.error);return}
  S.contacts=(res.data||[]).map(function(r){
    return{id:r.id,clientId:r.client_id||'',firstName:r.first_name||'',lastName:r.last_name||'',
      email:r.email||'',role:r.role||'',phone:r.phone||'',company:r.company||'',
      website:r.website||'',status:r.status||'active',endClient:r.end_client||'',endClientId:r.end_client_id||null}});
  _buildDomainMap()}

async function loadProspectCompanies(){
  var res=await _sb.from('prospect_companies').select('*').order('name');
  if(res.error){console.error('loadProspectCompanies:',res.error);return}
  S.prospectCompanies=(res.data||[]).map(function(r){
    return{id:r.id,name:r.name||'',website:r.website||'',description:r.description||'',
      status:r.status||'active',notes:r.notes||'',source:r.source||'',createdAt:r.created_at||''}})}

async function loadProspects(){
  var res=await _sb.from('prospects').select('*').order('last_name');
  if(res.error){console.error('loadProspects:',res.error);return}
  S.prospects=(res.data||[]).map(function(r){
    return{id:r.id,prospectCompanyId:r.prospect_company_id||'',firstName:r.first_name||'',lastName:r.last_name||'',
      email:r.email||'',phone:r.phone||'',role:r.role||'',linkedinUrl:r.linkedin_url||'',
      source:r.source||'',notes:r.notes||'',status:r.status||'active',
      lastContactedAt:r.last_contacted_at?new Date(r.last_contacted_at):null,createdAt:r.created_at||''}})}

/* Build domain → end-client/client map from contacts with endClient + email */
var _FREE_DOMAINS={'gmail.com':1,'yahoo.com':1,'hotmail.com':1,'outlook.com':1,'icloud.com':1,'aol.com':1,'live.com':1,'me.com':1,'msn.com':1,'protonmail.com':1,'mail.com':1,'zoho.com':1};
function _buildDomainMap(){
  S._domainMap={};
  (S.contacts||[]).forEach(function(c){
    if(!c.email||!c.endClient)return;
    var domain=c.email.toLowerCase().split('@')[1];
    if(!domain||_FREE_DOMAINS[domain])return;
    if(S._domainMap[domain])return;
    var cr=S.clientRecords.find(function(r){return r.id===c.clientId});
    S._domainMap[domain]={clientId:c.clientId,clientName:cr?cr.name:'',endClient:c.endClient,clientStatus:cr?cr.status:'active'}});
  /* Invalidate CRM context cache — contact/domain data changed */
  S._threadCrmCache={}}

/* Discover external contacts with a client but no end-client assigned */
function discoverEcCandidates(){
  var ue=S._userEmails||[];
  if(!ue.length){var _uf=(S._userEmail||'').toLowerCase();if(_uf)ue=[_uf]}
  var dismissed={};
  try{dismissed=JSON.parse(localStorage.getItem('tf_ecr_dismissed')||'{}')}catch(e){}
  var knownEmails={};
  (S.contacts||[]).forEach(function(c){if(c.email)knownEmails[c.email.toLowerCase()]=true});
  (S.prospects||[]).forEach(function(p){if(p.email)knownEmails[p.email.toLowerCase()]=true});
  var clientEmails={};
  (S.clientRecords||[]).forEach(function(c){if(c.email)clientEmails[c.email.toLowerCase().trim()]=true});

  /* ── Build domain→EC map from multiple signals ── */
  var domainEC={};
  function addDomainSignal(domain,ecName,ecId){
    if(!domain||!ecName||_FREE_DOMAINS[domain])return;
    if(!domainEC[domain])domainEC[domain]={};
    var k=ecName.toLowerCase();
    if(!domainEC[domain][k])domainEC[domain][k]={name:ecName,id:ecId||null,count:0};
    domainEC[domain][k].count++;
    if(ecId&&!domainEC[domain][k].id)domainEC[domain][k].id=ecId}
  (S.contacts||[]).forEach(function(c){
    if(!c.email||!c.endClient)return;
    addDomainSignal(c.email.toLowerCase().split('@')[1],c.endClient,c.endClientId)});
  (S.gmailThreads||[]).forEach(function(t){
    if(!t.end_client)return;
    var ecId=t.end_client_id||null;
    function td(email){if(!email)return;addDomainSignal(email.toLowerCase().trim().split('@')[1],t.end_client,ecId)}
    td(t.from_email);_parseEmails(t.to_emails||'').forEach(td);_parseEmails(t.cc_emails||'').forEach(td)});
  var bestDomainEC={};
  Object.keys(domainEC).forEach(function(d){
    var best=null;
    Object.keys(domainEC[d]).forEach(function(k){var e=domainEC[d][k];if(!best||e.count>best.count)best=e});
    if(best)bestDomainEC[d]=best});
  /* Per-email EC from threads */
  var emailThreadEC={};
  (S.gmailThreads||[]).forEach(function(t){
    if(!t.end_client)return;
    function te(email){if(!email)return;var el=email.toLowerCase().trim();
      if(!emailThreadEC[el])emailThreadEC[el]={};
      var k=t.end_client.toLowerCase();
      if(!emailThreadEC[el][k])emailThreadEC[el][k]={name:t.end_client,id:t.end_client_id||null,count:0};
      emailThreadEC[el][k].count++}
    te(t.from_email);_parseEmails(t.to_emails||'').forEach(te);_parseEmails(t.cc_emails||'').forEach(te)});
  /* Domain→client map from contacts (for client suggestion) */
  var domainClient={};
  (S.contacts||[]).forEach(function(c){
    if(!c.email||!c.clientId)return;
    var d=c.email.toLowerCase().split('@')[1];
    if(!d||_FREE_DOMAINS[d])return;
    if(!domainClient[d])domainClient[d]={};
    if(!domainClient[d][c.clientId])domainClient[d][c.clientId]=0;
    domainClient[d][c.clientId]++});
  /* Also build domain→client from contact website fields */
  (S.contacts||[]).forEach(function(ct){
    if(!ct.website||!ct.clientId)return;
    var d=ct.website.toLowerCase().replace(/^https?:\/\//,'').replace(/^www\./,'').split('/')[0].trim();
    if(!d||_FREE_DOMAINS[d])return;
    if(!domainClient[d])domainClient[d]={};
    domainClient[d][ct.clientId]=(domainClient[d][ct.clientId]||0)+10});

  /* ── Build candidates keyed by email ── */
  var cmap={};
  function addCandidate(email,name,clientId,source){
    if(!email)return;
    var el=email.toLowerCase().trim();
    if(ue.indexOf(el)!==-1)return;
    var domain=el.split('@')[1];
    if(!domain||_FREE_DOMAINS[domain])return;
    if(clientEmails[el])return;
    if(knownEmails[el])return;
    if(dismissed[el])return;
    if(!cmap[el])cmap[el]={email:el,name:name||'',clientIds:{},emailCount:0,meetingCount:0,lastSeen:null};
    if(source==='email')cmap[el].emailCount++;
    if(source==='meeting')cmap[el].meetingCount++;
    if(name&&name.length>(cmap[el].name||'').length)cmap[el].name=name;
    if(clientId){if(!cmap[el].clientIds[clientId])cmap[el].clientIds[clientId]=0;cmap[el].clientIds[clientId]++}}
  /* Scan gmail threads with client_id */
  (S.gmailThreads||[]).forEach(function(t){
    if(!t.client_id)return;
    var cid=t.client_id;
    if(t.from_email)addCandidate(t.from_email,t.from_name||'',cid,'email');
    _parseEmails(t.to_emails||'').forEach(function(e){addCandidate(e,'',cid,'email')});
    _parseEmails(t.cc_emails||'').forEach(function(e){addCandidate(e,'',cid,'email')});
    if(t.last_message_at){
      var dt=new Date(t.last_message_at);
      if(cmap[((t.from_email||'').toLowerCase().trim())]){var _c=cmap[(t.from_email||'').toLowerCase().trim()];if(!_c.lastSeen||dt>_c.lastSeen)_c.lastSeen=dt}
      _parseEmails(t.to_emails||'').forEach(function(e){if(cmap[e]&&(!cmap[e].lastSeen||dt>cmap[e].lastSeen))cmap[e].lastSeen=dt});
      _parseEmails(t.cc_emails||'').forEach(function(e){if(cmap[e]&&(!cmap[e].lastSeen||dt>cmap[e].lastSeen))cmap[e].lastSeen=dt})}});
  /* Scan ALL meetings with participants */
  (S.meetings||[]).forEach(function(m){
    if(!m.participants||!m.participants.length)return;
    var cid=m.clientId||null;
    var ownEmail=(m.ownerEmail||'').toLowerCase().trim();
    (m.participants||[]).forEach(function(p){
      if(!p.email)return;
      var pe=p.email.toLowerCase().trim();
      if(pe===ownEmail)return;
      addCandidate(pe,p.name||'',cid,'meeting');
      if(m.startTime&&cmap[pe]&&(!cmap[pe].lastSeen||m.startTime>cmap[pe].lastSeen))cmap[pe].lastSeen=m.startTime})});

  /* ── Resolve best client + EC suggestion per candidate ── */
  var arr=[];
  var clientMap={};
  (S.clientRecords||[]).forEach(function(c){clientMap[c.id]=c.name});
  Object.keys(cmap).forEach(function(email){
    var c=cmap[email];
    /* Pick best clientId from interactions */
    var bestCid=null,bestCnt=0;
    Object.keys(c.clientIds).forEach(function(cid){if(c.clientIds[cid]>bestCnt){bestCid=cid;bestCnt=c.clientIds[cid]}});
    /* Fallback: check domain→client map */
    if(!bestCid){
      var d=c.email.split('@')[1];
      if(domainClient[d]){
        Object.keys(domainClient[d]).forEach(function(cid){if(domainClient[d][cid]>bestCnt){bestCid=cid;bestCnt=domainClient[d][cid]}})}}
    c.clientId=bestCid;c.clientName=clientMap[bestCid]||'';
    delete c.clientIds;
    /* Suggest EC */
    c.suggestedEC='';c.suggestedECId=null;
    if(emailThreadEC[c.email]){
      var best=null;
      Object.keys(emailThreadEC[c.email]).forEach(function(k){var e=emailThreadEC[c.email][k];if(!best||e.count>best.count)best=e});
      if(best){c.suggestedEC=best.name;c.suggestedECId=best.id||resolveEndClientId(best.name)}}
    if(!c.suggestedEC){
      var dm=bestDomainEC[c.email.split('@')[1]];
      if(dm){c.suggestedEC=dm.name;c.suggestedECId=dm.id||resolveEndClientId(dm.name)}}
    arr.push(c)});
  arr.sort(function(a,b){return(b.emailCount+b.meetingCount)-(a.emailCount+a.meetingCount)});
  S._ecCandidates=arr}

function matchEmailToClient(email){
  if(!email)return null;
  var e=email.toLowerCase().trim();
  /* Check contacts first */
  var cc=S.contacts.find(function(c){return c.email&&c.email.toLowerCase()===e});
  if(cc){
    var cr=S.clientRecords.find(function(r){return r.id===cc.clientId});
    var cName=(cc.firstName+' '+cc.lastName).trim();
    return{clientId:cc.clientId,clientName:cr?cr.name:'',contactName:cName,contactRole:cc.role,
      contactId:cc.id,contactEmail:cc.email,contactPhone:cc.phone,contactCompany:cc.company,contactWebsite:cc.website,
      endClient:cc.endClient||'',clientStatus:cr?cr.status:'active'}}
  /* Fall back to client.email field */
  var cl=S.clientRecords.find(function(r){return r.email&&r.email.toLowerCase()===e});
  if(cl)return{clientId:cl.id,clientName:cl.name,contactName:'',contactRole:'',
    contactId:'',contactEmail:cl.email,contactPhone:'',contactCompany:cl.company||cl.name,contactWebsite:'',
    endClient:'',clientStatus:cl.status||'active'};
  /* Domain-based end-client matching */
  var domain=e.split('@')[1];
  if(domain&&S._domainMap&&S._domainMap[domain]){
    var dm=S._domainMap[domain];
    return{clientId:dm.clientId,clientName:dm.clientName,contactName:'',contactRole:'',
      contactId:'',contactEmail:email,contactPhone:'',contactCompany:'',contactWebsite:'',
      endClient:dm.endClient,clientStatus:dm.clientStatus,domainMatch:true}}
  return null}

/* Parse email addresses from a raw header string (e.g. "Name <email>, Other <email2>") */
function _parseEmails(raw){
  if(!raw)return[];
  return raw.split(/[,;]/).map(function(s){var m=s.match(/<(.+?)>/);return m?m[1].trim().toLowerCase():s.trim().toLowerCase()}).filter(function(e){return e&&e.indexOf('@')!==-1})}

/* Resolve full CRM context for a thread by checking all email addresses (From + To + CC) */
function resolveThreadCrmContext(fromEmail,toEmails,ccEmails){
  var allAddrs=[];
  if(fromEmail)allAddrs.push(fromEmail.toLowerCase().trim());
  _parseEmails(toEmails).forEach(function(e){if(allAddrs.indexOf(e)===-1)allAddrs.push(e)});
  _parseEmails(ccEmails).forEach(function(e){if(allAddrs.indexOf(e)===-1)allAddrs.push(e)});
  /* Remove user's own email(s) — Supabase login + connected Gmail */
  var ue=S._userEmails||[];
  if(!ue.length){var _uf=(S._userEmail||'').toLowerCase();if(_uf)ue=[_uf]}
  if(ue.length)allAddrs=allAddrs.filter(function(a){return ue.indexOf(a)===-1});

  var clients=[],endClients=[],contacts=[],unknownAddrs=[],seenClients={},seenEC={};
  allAddrs.forEach(function(addr){
    var m=matchEmailToClient(addr);
    if(!m){unknownAddrs.push(addr);return}
    if(m.clientId&&!seenClients[m.clientId]){
      seenClients[m.clientId]=true;
      var cr=S.clientRecords.find(function(r){return r.id===m.clientId});
      clients.push({clientId:m.clientId,clientName:m.clientName,status:cr?cr.status:'active'})}
    if(m.endClient&&!seenEC[m.endClient]){
      seenEC[m.endClient]=true;
      endClients.push({name:m.endClient,clientName:m.clientName})}
    if(m.contactId)contacts.push({contactName:m.contactName,contactEmail:m.contactEmail,contactRole:m.contactRole,
      contactPhone:m.contactPhone,contactCompany:m.contactCompany,endClient:m.endClient,clientId:m.clientId,clientName:m.clientName})
  });

  var clientNames=clients.map(function(c){return c.clientName});
  var ecNames=endClients.map(function(e){return e.name});

  /* Opportunities: any open opp where an address on this thread is the opp's contactEmail,
     OR the opp's client/endClient matches a resolved client/endClient on this thread */
  var opps=S.opportunities.filter(function(o){
    if(o.closedAt)return false;
    if(o.contactEmail){var oe=o.contactEmail.toLowerCase();if(allAddrs.indexOf(oe)!==-1)return true}
    if(clientNames.indexOf(o.client)!==-1)return true;
    if(o.endClient&&ecNames.indexOf(o.endClient)!==-1)return true;
    return false
  }).map(function(o){return{id:o.id,name:o.name,stage:o.stage,value:o.monthlyFee,client:o.client,endClient:o.endClient}});

  /* Campaigns: any active/setup campaign where client or endClient matches */
  var camps=S.campaigns.filter(function(c){
    if(c.status!=='Active'&&c.status!=='Setup')return false;
    if(clientNames.indexOf(c.partner)!==-1)return true;
    if(c.endClient&&ecNames.indexOf(c.endClient)!==-1)return true;
    return false
  }).map(function(c){return{id:c.id,name:c.name,status:c.status,client:c.partner,endClient:c.endClient}});

  /* Prospect: an address on this thread is directly the contactEmail on an open opportunity */
  var isProspect=S.opportunities.some(function(o){
    if(o.closedAt)return false;
    if(!o.contactEmail)return false;
    return allAddrs.indexOf(o.contactEmail.toLowerCase())!==-1});

  /* Classification flags for smart inboxes */
  var hasActiveClient=clients.some(function(c){return c.status==='active'});
  var hasLapsedClient=clients.some(function(c){return c.status!=='active'})&&!hasActiveClient;

  return{
    clients:clients,endClients:endClients,opportunities:opps,campaigns:camps,contacts:contacts,
    unknownAddrs:unknownAddrs,
    hasUnknown:unknownAddrs.length>0,
    isProspect:isProspect,
    hasActiveClient:hasActiveClient,
    hasLapsedClient:hasLapsedClient,
    hasCampaign:camps.length>0,
    hasOpportunity:opps.length>0,
    primaryClient:clients.length?clients[0]:null,
    primaryEndClient:endClients.length?endClients[0].name:''}
}

/* Thread CRM cache — invalidated on loadData */
S._threadCrmCache={};
function getThreadCrmContext(t){
  var tid=t.thread_id||t.threadId;if(!tid)return null;
  if(S._threadCrmCache[tid])return S._threadCrmCache[tid];
  var from=t.from_email||t.fromEmail||'';
  var to=t.to_emails||t.toEmails||'';
  var cc=t.cc_emails||t.ccEmails||'';
  var ctx=resolveThreadCrmContext(from,to,cc);

  /* Merge saved CRM fields — override email-based matching with explicit categorization */
  var savedClient=t.client_id||'';
  var savedEC=t.end_client||'';
  var savedCamp=t.campaign_id||'';
  var savedOpp=t.opportunity_id||'';

  if(savedClient){
    var cr=S.clientRecords.find(function(r){return r.id===savedClient});
    /* Backward compat: if client_id is a name string (corrupted data), try name match */
    if(!cr)cr=S.clientRecords.find(function(r){return r.name===savedClient});
    if(cr){
      /* Ensure saved client is primaryClient (first in list) */
      var alreadyHas=ctx.clients.some(function(c){return c.clientId===cr.id});
      if(!alreadyHas)ctx.clients.unshift({clientId:cr.id,clientName:cr.name,status:cr.status||'active'});
      else{/* Move to front */var idx=ctx.clients.findIndex(function(c){return c.clientId===cr.id});
        if(idx>0){var item=ctx.clients.splice(idx,1)[0];ctx.clients.unshift(item)}}
      ctx.primaryClient=ctx.clients[0];
      ctx.hasActiveClient=ctx.clients.some(function(c){return c.status==='active'})}}

  /* ── Unified CRM filtering ──
     When ANY specific CRM field is saved (end-client, campaign, or opportunity),
     narrow ALL arrays to only the explicitly saved/derived values.
     This prevents email-resolved campaigns, opportunities, and end-clients
     from other parts of the same client showing up in the pills. */
  if(savedEC||savedCamp||savedOpp){
    /* 1. Determine effective end-client: explicit > from campaign > from opportunity */
    var _effEC=savedEC||'';
    var _campObj=savedCamp?S.campaigns.find(function(c){return c.id===savedCamp}):null;
    var _oppObj=savedOpp?S.opportunities.find(function(o){return o.id===savedOpp}):null;
    if(!_effEC&&_campObj&&_campObj.endClient)_effEC=_campObj.endClient;
    if(!_effEC&&_oppObj&&_oppObj.endClient)_effEC=_oppObj.endClient;

    /* 2. End-clients: only the effective one */
    if(_effEC){
      var ecClient=ctx.primaryClient?ctx.primaryClient.clientName:'';
      ctx.endClients=[{name:_effEC,clientName:ecClient}];
      ctx.primaryEndClient=_effEC}
    else{ctx.endClients=[];ctx.primaryEndClient=''}

    /* 3. Campaigns: only the explicitly saved one */
    if(_campObj){
      ctx.campaigns=[{id:_campObj.id,name:_campObj.name,status:_campObj.status,client:_campObj.partner,endClient:_campObj.endClient}];
      ctx.hasCampaign=true}
    else{ctx.campaigns=[];ctx.hasCampaign=false}

    /* 4. Opportunities: only the explicitly saved one */
    if(_oppObj){
      ctx.opportunities=[{id:_oppObj.id,name:_oppObj.name,stage:_oppObj.stage,value:_oppObj.monthlyFee,client:_oppObj.client,endClient:_oppObj.endClient}];
      ctx.hasOpportunity=true}
    else{ctx.opportunities=[];ctx.hasOpportunity=false}
  }

  S._threadCrmCache[tid]=ctx;
  return ctx}

async function dbAddContact(clientId,data){
  var uid=await getUserId();if(!uid)return null;
  var _ecId=resolveEndClientId(data.endClient)||data.endClientId||null;
  var _ecName=_ecId?endClientNameById(_ecId):data.endClient||'';
  if(data.endClient&&!_ecId){
    var _cr=clientId?(S.clientRecords||[]).find(function(r){return r.id===clientId}):null;
    var _ecRec=await ensureEndClientExists(data.endClient,_cr?_cr.name:'');
    if(_ecRec){_ecId=_ecRec.id;_ecName=_ecRec.name}}
  var row={user_id:uid,client_id:clientId||null,first_name:data.firstName||'',last_name:data.lastName||'',
    email:data.email||'',role:data.role||'',phone:data.phone||'',
    company:data.company||'',website:data.website||'',status:data.status||'active',
    end_client:_ecName,end_client_id:_ecId};
  var res=await _sb.from('contacts').insert(row).select().single();
  if(res.error){toast('Add contact failed: '+res.error.message,'warn');return null}
  await loadContacts();render();toast('Contact added','ok');return res.data}

async function dbEditContact(id,data){
  if(data.endClient!==undefined||data.endClientId!==undefined){
    var _ecId2=resolveEndClientId(data.endClient)||data.endClientId||null;
    var _ecName2=_ecId2?endClientNameById(_ecId2):data.endClient||'';
    if(data.endClient&&!_ecId2){
      var _ec=data.clientId?(S.clientRecords||[]).find(function(r){return r.id===data.clientId}):null;
      var _ecRec2=await ensureEndClientExists(data.endClient,_ec?_ec.name:'');
      if(_ecRec2){_ecId2=_ecRec2.id;_ecName2=_ecRec2.name}}
    data.endClient=_ecName2;data.endClientId=_ecId2}
  var upd={};
  if(data.firstName!==undefined)upd.first_name=data.firstName;
  if(data.lastName!==undefined)upd.last_name=data.lastName;
  if(data.email!==undefined)upd.email=data.email;
  if(data.role!==undefined)upd.role=data.role;
  if(data.phone!==undefined)upd.phone=data.phone;
  if(data.company!==undefined)upd.company=data.company;
  if(data.website!==undefined)upd.website=data.website;
  if(data.status!==undefined)upd.status=data.status;
  if(data.endClient!==undefined)upd.end_client=data.endClient;
  if(data.endClientId!==undefined)upd.end_client_id=data.endClientId||null;
  if(data.clientId!==undefined)upd.client_id=data.clientId||null;
  var res=await _sb.from('contacts').update(upd).eq('id',id);
  if(res.error){toast('Edit contact failed: '+res.error.message,'warn');return false}
  await loadContacts();render();toast('Contact updated','ok');return true}

async function dbDeleteContact(id){
  var res=await _sb.from('contacts').delete().eq('id',id);
  if(res.error){toast('Delete contact failed: '+res.error.message,'warn');return false}
  await loadContacts();render();toast('Contact deleted','ok');return true}

/* ═══════════ MEETINGS ═══════════ */
async function loadMeetings(){
  try{
    var uid=await getUserId();if(!uid)return;
    /* Load only list-view fields (no transcript/summary — too large for 1000+ meetings).
       Full data is fetched on-demand when a meeting is opened.
       Paginate past Supabase 1000-row default limit. */
    var cols='id,session_id,title,start_time,end_time,duration_minutes,participants,owner_name,owner_email,report_url,video_storage_path,video_size_bytes,client_id,end_client,end_client_id,campaign_id,opportunity_id,source,ai_tasks_generated,ai_suggestions,action_items,is_group_call,group_call_type,created_at';
    var allRows=[],pageSize=1000,from=0;
    while(true){
      var res=await _sb.from('meetings').select(cols).order('start_time',{ascending:false}).range(from,from+pageSize-1);
      if(res.error)throw res.error;
      var batch=res.data||[];
      allRows=allRows.concat(batch);
      if(batch.length<pageSize)break;
      from+=pageSize}
    S.meetings=allRows.map(function(r){return{
      id:r.id,sessionId:r.session_id,title:r.title,
      startTime:r.start_time?new Date(r.start_time):null,
      endTime:r.end_time?new Date(r.end_time):null,
      durationMinutes:r.duration_minutes||0,
      participants:r.participants||[],
      ownerName:r.owner_name||'',ownerEmail:r.owner_email||'',
      summary:'',transcript:'',
      actionItems:r.action_items||[],keyQuestions:[],
      topics:[],chapterSummaries:[],
      reportUrl:r.report_url||'',
      videoStoragePath:r.video_storage_path||'',videoSizeBytes:r.video_size_bytes||0,
      clientId:r.client_id,endClient:r.end_client||'',endClientId:r.end_client_id||null,
      campaignId:r.campaign_id,opportunityId:r.opportunity_id,
      source:r.source||'readai',aiTasksGenerated:!!r.ai_tasks_generated,aiSuggestions:r.ai_suggestions||[],
      isGroupCall:!!r.is_group_call,groupCallType:r.group_call_type||'',kajabiReportHtml:'',createdAt:r.created_at}});
    S.meetingsPage=1;
  }catch(e){console.error('loadMeetings:',e)}}

async function dbEditMeeting(id,data){
  var upd={updated_at:new Date().toISOString()};
  if(data.clientId!==undefined)upd.client_id=data.clientId||null;
  if(data.endClient!==undefined)upd.end_client=data.endClient;
  if(data.endClientId!==undefined)upd.end_client_id=data.endClientId||null;
  if(data.campaignId!==undefined)upd.campaign_id=data.campaignId||null;
  if(data.opportunityId!==undefined)upd.opportunity_id=data.opportunityId||null;
  if(data.actionItems!==undefined)upd.action_items=data.actionItems;
  if(data.aiSuggestions!==undefined)upd.ai_suggestions=data.aiSuggestions;
  if(data.isGroupCall!==undefined)upd.is_group_call=!!data.isGroupCall;
  if(data.groupCallType!==undefined)upd.group_call_type=data.groupCallType||'';
  if(data.kajabiReportHtml!==undefined)upd.kajabi_report_html=data.kajabiReportHtml||'';
  var res=await _sb.from('meetings').update(upd).eq('id',id);
  if(res.error){toast('Update failed: '+res.error.message,'warn');return false}
  return true}

async function dbDeleteMeeting(id){
  var res=await _sb.from('meetings').delete().eq('id',id);
  if(res.error){toast('Delete failed: '+res.error.message,'warn');return false}
  return true}

async function openMeeting(id){
  var m=S.meetings.find(function(mt){return mt.id===id});
  if(!m){toast('Meeting not found','warn');return}
  /* Fetch full data (transcript, summary, etc.) on demand */
  if(!m._fullLoaded){
    try{
      var res=await _sb.from('meetings').select('summary,transcript,key_questions,topics,chapter_summaries,kajabi_report_html').eq('id',id).single();
      if(res.data){
        m.summary=res.data.summary||'';
        m.transcript=res.data.transcript||'';
        m.keyQuestions=res.data.key_questions||[];
        m.topics=res.data.topics||[];
        m.chapterSummaries=res.data.chapter_summaries||[];
        m.kajabiReportHtml=res.data.kajabi_report_html||'';
        m._fullLoaded=true}
    }catch(e){console.error('openMeeting full load:',e)}}
  S.meetingDetail=m;render()}

function closeMeeting(){
  S.meetingDetail=null;render()}

function setMeetingSearch(v){
  S.meetingSearch=v;S.meetingsPage=1;
  clearTimeout(S._mtgSearchTmr);
  S._mtgSearchTmr=setTimeout(function(){render();var si=gel('meeting-search');if(si){si.focus();si.selectionStart=si.selectionEnd=si.value.length}},250)}

function setMeetingsPage(p){S.meetingsPage=p;render();window.scrollTo(0,0)}

async function setMeetingCrm(meetingId,field,value){
  var data={};
  if(field==='client_id')data.clientId=value||null;
  else if(field==='end_client'){var _ecId=resolveEndClientId(value)||null;data.endClient=_ecId?endClientNameById(_ecId):value||'';data.endClientId=_ecId}
  else if(field==='campaign_id')data.campaignId=value||null;
  else if(field==='opportunity_id')data.opportunityId=value||null;
  var ok=await dbEditMeeting(meetingId,data);
  if(!ok)return;
  var m=S.meetings.find(function(mt){return mt.id===meetingId});
  if(m){
    if(data.clientId!==undefined)m.clientId=data.clientId;
    if(data.endClient!==undefined){m.endClient=data.endClient;m.endClientId=data.endClientId||null}
    if(data.campaignId!==undefined)m.campaignId=data.campaignId;
    if(data.opportunityId!==undefined)m.opportunityId=data.opportunityId;
    if(S.meetingDetail&&S.meetingDetail.id===meetingId)S.meetingDetail=m}
  render();toast('Updated','ok')}

function refreshMtgCrm(){
  var sel=gel('mtg-cli');if(!sel)return;
  var clientId=sel.value;var clientName='';
  if(clientId){var cr=S.clientRecords.find(function(c){return c.id===clientId});if(cr)clientName=cr.name}
  var ecSel=gel('mtg-ec');if(ecSel)ecSel.innerHTML=buildEndClientOptions('',clientName);
  var cpSel=gel('mtg-cp');if(cpSel)cpSel.innerHTML=buildCampaignOptions('',clientName,'');
  var opSel=gel('mtg-op');if(opSel)opSel.innerHTML=buildOpportunityOptions('',clientName)}

function refreshMtgCampaigns(){
  var sel=gel('mtg-cli');if(!sel)return;
  var clientId=sel.value;var clientName='';
  if(clientId){var cr=S.clientRecords.find(function(c){return c.id===clientId});if(cr)clientName=cr.name}
  var ec=gel('mtg-ec')?gel('mtg-ec').value:'';if(ec==='__addnew__')ec='';
  var cpSel=gel('mtg-cp');if(cpSel)cpSel.innerHTML=buildCampaignOptions('',clientName,ec)}

async function createTaskFromMeetingAction(meetingId,actionIndex){
  var m=S.meetings.find(function(mt){return mt.id===meetingId});
  if(!m)return;
  var items=m.actionItems||[];
  if(actionIndex<0||actionIndex>=items.length)return;
  var ai=items[actionIndex];
  var dt=m.startTime;
  var dateStr=dt?fmtDShort(dt):'';
  var clientName='';
  if(m.clientId){
    var cr=S.clientRecords.find(function(r){return r.id===m.clientId});
    if(cr)clientName=cr.name}
  var taskData={
    item:ai.text||'',
    notes:'From meeting: '+(m.title||'Untitled')+' on '+dateStr,
    client:clientName,endClient:m.endClient||'',
    campaign:m.campaignId||'',opportunity:m.opportunityId||'',
    importance:'Important',type:'Business'};
  var newTask=await dbAddTask(taskData);
  if(!newTask)return;
  items[actionIndex].created_task_id=newTask.id;
  await dbEditMeeting(meetingId,{actionItems:items});
  m.actionItems=items;
  await loadTasks();render();
  toast('Task created from action item','ok')}

async function acceptMeetingSuggestion(meetingId,index){
  var m=S.meetings.find(function(mt){return mt.id===meetingId});
  if(!m||!m.aiSuggestions||!m.aiSuggestions[index])return;
  var sug=m.aiSuggestions[index];
  if(sug.type==='link_campaign'&&sug.campaign_id){
    await setMeetingCrm(meetingId,'campaign_id',sug.campaign_id);
    _markSuggestion(m,meetingId,index,'accepted');toast('Campaign linked','ok')
  }else if(sug.type==='link_opportunity'&&sug.opportunity_id){
    await setMeetingCrm(meetingId,'opportunity_id',sug.opportunity_id);
    _markSuggestion(m,meetingId,index,'accepted');toast('Opportunity linked','ok')
  }else if(sug.type==='create_opportunity'){
    // Open the Add Opportunity modal pre-filled
    S._pendingMtgSuggestion={meetingId:meetingId,index:index};
    openAddOpportunity();
    // Wait for modal to render, then select type and pre-fill
    setTimeout(function(){
      var t=sug.suggested_type||'fc_partnership';
      selectOpType(t);
      setTimeout(function(){
        var f=gel('nop-name');if(f)f.value=sug.suggested_name||'';
        var cs=gel('nop-client');if(cs){cs.value=sug.client||'';refreshNopEndClients()}
        var ec=gel('nop-endclient');if(ec){
          var _ecName=sug.end_client||'';
          if(ec.tagName==='SELECT'&&_ecName){
            var _ecRec=(S.endClients||[]).find(function(e){return e.name===_ecName});
            if(_ecRec){ec.value=_ecRec.id}
            else{ec.value='__addnew__';ecAddNew('nop-endclient');var _ecInp=gel('nop-endclient');if(_ecInp)_ecInp.value=_ecName}
          }else{ec.value=_ecName}
        }
        var cn=gel('nop-contact');if(cn)cn.value=sug.contact_name||'';
        var ce=gel('nop-email');if(ce)ce.value=sug.contact_email||'';
        var ns=gel('nop-notes');if(ns)ns.value=(sug.reason||'')+'\nSource: Meeting — '+(m.title||'');
        var src=gel('nop-source');if(src)src.value='Meeting'
      },50)},50)
  }else if(sug.type==='suggest_client'){
    var cr=S.clientRecords.find(function(c){return c.name.toLowerCase()===(sug.client_name||'').toLowerCase()});
    if(cr){await setMeetingCrm(meetingId,'client_id',cr.id);_markSuggestion(m,meetingId,index,'accepted');toast('Client set','ok')}
  }else if(sug.type==='suggest_end_client'){
    await setMeetingCrm(meetingId,'end_client',sug.end_client||'');
    _markSuggestion(m,meetingId,index,'accepted');toast('End client set','ok')
  }}

async function _markSuggestion(m,meetingId,index,status){
  m.aiSuggestions[index].status=status;
  await dbEditMeeting(meetingId,{aiSuggestions:m.aiSuggestions});
  if(S.meetingDetail&&S.meetingDetail.id===meetingId)S.meetingDetail=m;
  render()}

async function dismissMeetingSuggestion(meetingId,index){
  var m=S.meetings.find(function(mt){return mt.id===meetingId});
  if(!m||!m.aiSuggestions||!m.aiSuggestions[index])return;
  m.aiSuggestions[index].status='dismissed';
  await dbEditMeeting(meetingId,{aiSuggestions:m.aiSuggestions});
  if(S.meetingDetail&&S.meetingDetail.id===meetingId)S.meetingDetail=m;
  render()}

function addMeetingParticipantAsContact(meetingId,participantIndex){
  var m=S.meetings.find(function(mt){return mt.id===meetingId});
  if(!m)return;
  var p=(m.participants||[])[participantIndex];
  if(!p)return;
  var parts=(p.name||'').split(' ');
  var firstName=parts[0]||'';
  var lastName=parts.slice(1).join(' ')||'';
  openAddContactModal(null,{email:p.email||'',firstName:firstName,lastName:lastName})}

function setMeetingFilter(f){S.meetingFilter=f;S.meetingsPage=1;render()}

async function toggleGroupCall(meetingId,isGroupCall){
  var m=S.meetings.find(function(mt){return mt.id===meetingId});
  if(!m)return;
  var data={isGroupCall:!!isGroupCall};
  if(!isGroupCall)data.groupCallType='';
  var ok=await dbEditMeeting(meetingId,data);
  if(!ok)return;
  m.isGroupCall=!!isGroupCall;
  if(!isGroupCall)m.groupCallType='';
  if(S.meetingDetail&&S.meetingDetail.id===meetingId)S.meetingDetail=m;
  render();toast('Updated','ok')}

async function setGroupCallType(meetingId,type){
  var m=S.meetings.find(function(mt){return mt.id===meetingId});
  if(!m)return;
  var data={groupCallType:type||''};
  if(type)data.isGroupCall=true;
  var ok=await dbEditMeeting(meetingId,data);
  if(!ok)return;
  m.groupCallType=type||'';
  if(type)m.isGroupCall=true;
  if(S.meetingDetail&&S.meetingDetail.id===meetingId)S.meetingDetail=m;
  render();toast('Updated','ok')}

async function generateKajabiReport(meetingId){
  var m=S.meetings.find(function(mt){return mt.id===meetingId});
  if(!m)return;
  if(!m.isGroupCall||!m.groupCallType){toast('Set a group call type first','warn');return}
  /* Ensure full data is loaded */
  if(!m._fullLoaded){
    try{
      var res=await _sb.from('meetings').select('summary,transcript,key_questions,topics,chapter_summaries,kajabi_report_html').eq('id',meetingId).single();
      if(res.data){
        m.summary=res.data.summary||'';m.transcript=res.data.transcript||'';
        m.keyQuestions=res.data.key_questions||[];m.topics=res.data.topics||[];
        m.chapterSummaries=res.data.chapter_summaries||[];
        m.kajabiReportHtml=res.data.kajabi_report_html||'';m._fullLoaded=true}
    }catch(e){console.error('generateKajabiReport load:',e)}}
  if(!m.transcript){toast('No transcript available for this meeting','warn');return}
  /* Show loading state */
  var btn=gel('kajabi-gen-btn');if(btn){btn.disabled=true;btn.innerHTML=icon('loader',13)+' Generating\u2026'}
  try{
    var sess=await _sb.auth.getSession();
    var token=sess.data.session.access_token;
    var resp=await fetch('/api/meetings/generate-report',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({meetingId:meetingId})});
    /* Check for non-streaming error responses (4xx etc) */
    var ct=resp.headers.get('content-type')||'';
    console.log('[KajabiReport] Response status:',resp.status,'content-type:',ct);
    if(!resp.ok&&ct.indexOf('text/event-stream')<0){
      var errText=await resp.text();
      console.log('[KajabiReport] Error response body:',errText);
      var errObj;try{errObj=JSON.parse(errText)}catch(_){errObj={error:errText||'Server error ('+resp.status+')'}}
      toast(errObj.error||'Generation failed ('+resp.status+')','warn');render();return}
    /* Read SSE stream — HTML arrives in chunk events */
    var reader=resp.body.getReader();
    var decoder=new TextDecoder();
    var html='';var buf='';var chunkCount=0;var eventCount=0;var gotDone=false;
    while(true){
      var chunk=await reader.read();
      if(chunk.done){console.log('[KajabiReport] Stream ended. Chunks:',chunkCount,'Events:',eventCount,'gotDone:',gotDone,'HTML length:',html.length);break}
      chunkCount++;
      var raw=decoder.decode(chunk.value,{stream:true});
      buf+=raw;
      var lines=buf.split('\n');buf=lines.pop()||'';
      for(var i=0;i<lines.length;i++){
        var line=lines[i];if(line.indexOf('data: ')!==0)continue;
        try{var evt=JSON.parse(line.slice(6));
          eventCount++;
          if(evt.t==='c'&&evt.h){html+=evt.h}
          else if(evt.t==='d'){gotDone=true;console.log('[KajabiReport] Done. HTML length:',html.length)}
          else if(evt.t==='e'){console.error('[KajabiReport] Error:',evt.error);toast(evt.error||'Generation failed','warn');render();return}
        }catch(_){}}}
    if(!html){toast('No report was generated','warn');render();return}
    m.kajabiReportHtml=html;
    if(S.meetingDetail&&S.meetingDetail.id===meetingId)S.meetingDetail=m;
    /* If stream ended without done event (function timeout), save from client */
    if(!gotDone&&html){
      console.log('[KajabiReport] No done event — saving from client');
      await dbEditMeeting(meetingId,{kajabiReportHtml:html});
      render();toast('Report generated (may be incomplete — server timed out)','warn');
    }else{
      render();toast('Report generated','ok')}
  }catch(e){
    console.error('generateKajabiReport:',e);toast('Generation failed: '+(e.message||'Unknown error'),'warn');render()}}

function copyKajabiReport(meetingId){
  /* Copy from editor if available (may have unsaved edits), else from state */
  var ed=gel('kajabi-report-editor');
  var html=ed?ed.value:'';
  if(!html){var m=S.meetings.find(function(mt){return mt.id===meetingId});html=m&&m.kajabiReportHtml||''}
  if(!html){toast('No report to copy','warn');return}
  navigator.clipboard.writeText(html).then(function(){
    toast('HTML copied to clipboard','ok')
  }).catch(function(){
    var ta=document.createElement('textarea');ta.value=html;
    document.body.appendChild(ta);ta.select();document.execCommand('copy');
    document.body.removeChild(ta);toast('HTML copied to clipboard','ok')})}

async function saveKajabiReport(meetingId){
  var el=gel('kajabi-report-editor');if(!el)return;
  var html=el.value;
  var m=S.meetings.find(function(mt){return mt.id===meetingId});
  if(!m)return;
  var ok=await dbEditMeeting(meetingId,{kajabiReportHtml:html});
  if(!ok)return;
  m.kajabiReportHtml=html;
  if(S.meetingDetail&&S.meetingDetail.id===meetingId)S.meetingDetail=m;
  /* Update preview if visible */
  var prev=gel('kajabi-preview');if(prev&&!prev.classList.contains('hidden'))prev.innerHTML=html;
  toast('Report saved','ok')}

function toggleKajabiPreview(){
  var el=gel('kajabi-preview');if(!el)return;
  el.classList.toggle('hidden');
  var btn=gel('kajabi-preview-toggle');
  if(btn)btn.textContent=el.classList.contains('hidden')?'Show Preview':'Hide Preview'}

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
    end_client:data.endClient||'',end_client_id:resolveEndClientId(data.endClient)||data.endClientId||null,notes:data.notes||'',status:data.status||'unmatched'};
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
  if('endClient' in data||'endClientId' in data)row.end_client_id=resolveEndClientId(data.endClient)||data.endClientId||null;
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
      category:r.category||'',endClient:r.end_client||'',endClientId:r.end_client_id||null,campaignId:r.campaign_id||'',
      notes:r.notes||''}})}

async function dbAddFinancePaymentSplit(data){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,payment_id:data.paymentId,amount:data.amount||0,
    category:data.category||'',end_client:data.endClient||'',end_client_id:resolveEndClientId(data.endClient)||data.endClientId||null,
    campaign_id:data.campaignId||null,notes:data.notes||''};
  var res=await _sb.from('finance_payment_splits').insert(row).select().single();
  if(res.error){toast('Split save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditFinancePaymentSplit(id,data){
  var row={amount:data.amount||0,category:data.category||'',
    end_client:data.endClient||'',end_client_id:resolveEndClientId(data.endClient)||data.endClientId||null,campaign_id:data.campaignId||null,notes:data.notes||''};
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
function setWeeklyRange(v){S.weeklyRange=v;render()}
function setCampaignTab(tab){
  S.campaignTab=tab;
  var el=gel('detail-body');
  if(el&&gel('detail-modal')&&gel('detail-modal').classList.contains('on')){
    var cp=S.campaigns.find(function(c){return c.id===(S._lastCampaignId||S.campaignDetailId)});
    if(cp){el.innerHTML=rCampaignDashboard(cp,getCampaignStats(cp));setTimeout(function(){initEntityCharts('campaign')},50);return}
  }
  render()}
function setClientTab(tab){
  S.clientTab=tab;
  var el=gel('detail-body');if(!el)return;
  var clientMap=buildClientMap();
  var c=clientMap[S.clientDetailName||S._lastClientDash];if(!c)return;
  el.innerHTML=rClientDashboard(c);
  setTimeout(function(){initEntityCharts('client')},50)}
function setEndClientTab(tab){
  S.endClientTab=tab;
  var el=gel('detail-body');if(!el)return;
  var ecMap=buildEndClientMap();
  var ec=ecMap[S._lastEndClientDash];if(!ec)return;
  el.innerHTML=rEndClientDashboard(ec);
  setTimeout(function(){initEntityCharts('endClient')},50)}
function setOpportunityTab(tab){
  S.opportunityTab=tab;
  var el=gel('detail-body');if(!el)return;
  var op=S.opportunities.find(function(o){return o.id===S._lastOpportunityId});if(!op)return;
  el.innerHTML=rOpportunityDashboard(op,getOpportunityStats(op));
  setTimeout(function(){initEntityCharts('opportunity')},50)}

function setProspectCompanyTab(tab){
  S.prospectCompanyTab=tab;
  var el=gel('detail-body');if(!el)return;
  var pc=(S.prospectCompanies||[]).find(function(p){return p.id===S._lastProspectCompanyId});if(!pc)return;
  el.innerHTML=rProspectCompanyDashboard(pc);
  setTimeout(function(){initEntityCharts('prospectCompany')},50)}

async function saveEditProspectCompanyFromDash(){
  var id=S._lastProspectCompanyId;if(!id)return;
  var name=(gel('pc-name')||{}).value||'';
  if(!name.trim()){toast('Enter a company name','warn');return}
  var data={name:name.trim(),website:(gel('pc-website')||{}).value||'',
    description:(gel('pc-description')||{}).value||'',
    source:(gel('pc-source')||{}).value||'',notes:(gel('pc-notes')||{}).value||'',
    status:(gel('pc-status')||{}).value||'active'};
  var ok=await dbEditProspectCompany(id,data);
  if(ok){toast('Prospect company updated','ok');setProspectCompanyTab('details')}}

function deleteProspectCompanyFromDash(id){
  if(!confirm('Delete this prospect company? Linked prospects will lose their company association.'))return;
  dbDeleteProspectCompany(id);closeModal()}

/* ═══════════ CONTACT EMAIL SELECTOR HANDLERS ═══════════ */
function cesToggleGroup(selectorId,group,checked){
  var wrap=gel(selectorId);if(!wrap)return;
  wrap.querySelectorAll('.ces-item').forEach(function(cb){
    if(cb.getAttribute('data-group')===group)cb.checked=checked})}

function cesToggleAll(selectorId,checked){
  var wrap=gel(selectorId);if(!wrap)return;
  wrap.querySelectorAll('.ces-item').forEach(function(cb){cb.checked=checked})}
function cesCompose(selectorId,entityType,entityName){
  var wrap=gel(selectorId);if(!wrap)return;
  var emails=[];
  wrap.querySelectorAll('.ces-item:checked').forEach(function(cb){
    var email=cb.getAttribute('data-email');if(email)emails.push(email)});
  if(!emails.length){toast('Select at least one contact','warn');return}
  var subjectEl=gel(selectorId+'-subject');
  var subject=subjectEl?subjectEl.value:'Re: '+entityName;
  openComposeEmail({to:emails.join(','),subject:subject})}

function setClientSort(v){
  var cur=S.clientSort||'name';
  var col=cur.replace(/^-/,'');
  if(col===v){S.clientSort=cur.charAt(0)==='-'?v:'-'+v}
  else{S.clientSort=(v==='name')?v:'-'+v}
  render()}

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

  /* 5. Pipeline opportunities (weighted by probability, requires expectedClose) */
  var endDate=new Date(today);endDate.setDate(endDate.getDate()+horizonDays);
  S.opportunities.forEach(function(op){
    if(op.stage==='Closed Won'||op.stage==='Closed Lost')return;
    if(!op.expectedClose)return;
    var closeStr=op.expectedClose instanceof Date?op.expectedClose.toISOString().split('T')[0]:op.expectedClose;
    var closeDate=new Date(closeStr+'T00:00:00');
    if(closeDate<today||closeDate>endDate)return;
    /* Upfront fees (excludes monthlyAdSpend) */
    var totalVal=(op.strategyFee||0)+(op.setupFee||0);
    var feePct=(op.processingFeePct||0)/100;
    var netVal=totalVal*(1-feePct);
    var prob=(op.probability||0)/100;
    var weighted=Math.round(netVal*prob);
    if(weighted>0){
      items.push({type:'pipeline',name:op.name,amount:weighted,date:closeStr,
        sourceId:op.id,direction:'inflow',frequency:'once',editable:false})}
    /* Monthly fee projections post-close */
    if(op.monthlyFee&&op.monthlyFee>0){
      var dur=op.expectedMonthlyDuration||12;
      var monthlyNet=op.monthlyFee*(1-feePct);
      var monthlyWeighted=Math.round(monthlyNet*prob);
      if(monthlyWeighted>0){
        for(var mi=1;mi<=dur;mi++){
          var md=new Date(closeDate);md.setMonth(md.getMonth()+mi);
          if(md>endDate)break;
          var mds=md.toISOString().split('T')[0];
          items.push({type:'pipeline_monthly',name:op.name+' (monthly)',amount:monthlyWeighted,date:mds,
            sourceId:op.id,direction:'inflow',frequency:'monthly',editable:false})}}}});

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

async function loadGmailThreads(){
  try{
    var uid=await getUserId();if(!uid)return;
    var{data,error}=await _sb.from('gmail_threads').select('*').eq('user_id',uid).order('last_message_at',{ascending:false}).limit(500);
    if(error)throw error;
    S.gmailThreads=data||[];
    S.gmailUnread=S.gmailThreads.filter(function(t){return t.is_unread}).length;
  }catch(e){console.error('loadGmailThreads:',e)}}

/* ═══════════ EMAIL FUNCTIONS ═══════════ */

/* Fetch with timeout + retry (prevents infinite hangs on slow/failed requests) */
async function fetchWithTimeout(url,opts,timeoutMs){
  timeoutMs=timeoutMs||15000;
  var controller=new AbortController();
  var timer=setTimeout(function(){controller.abort()},timeoutMs);
  try{
    var resp=await fetch(url,Object.assign({},opts,{signal:controller.signal}));
    clearTimeout(timer);return resp
  }catch(e){
    clearTimeout(timer);
    if(e.name==='AbortError')throw new Error('Request timed out');
    throw e}}

async function fetchWithRetry(url,opts,timeoutMs,retries){
  retries=retries||2;timeoutMs=timeoutMs||15000;
  var lastErr;
  for(var attempt=0;attempt<=retries;attempt++){
    try{return await fetchWithTimeout(url,opts,timeoutMs)}
    catch(e){lastErr=e;if(attempt<retries)await new Promise(function(r){setTimeout(r,1000*Math.pow(2,attempt))})}}
  throw lastErr}

async function fetchGmailThreads(label,search,pageToken){
  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session)return null;
    var token=sess.data.session.access_token;
    var params='?label='+(label||'inbox')+'&maxResults=50';
    if(search)params+='&q='+encodeURIComponent(search);
    if(pageToken)params+='&pageToken='+encodeURIComponent(pageToken);
    var resp=await fetchWithTimeout('/api/gmail/threads'+params,{headers:{'Authorization':'Bearer '+token}},20000);
    if(!resp.ok){var err=await resp.json();throw new Error(err.error||'Failed')}
    return await resp.json();
  }catch(e){toast('Gmail: '+e.message,'warn');return null}}

async function openEmailThread(threadId){
  /* Exit bulk mode on thread open */
  if(S.emailBulkMode){S.emailBulkMode=false;S.emailBulkSelected={}}
  /* Flush any existing email timer before starting a new one */
  _flushEmailTimer();
  /* Start silent email timer */
  S._emailTimer={threadId:threadId,started:Date.now(),subject:'',categorization:null};

  S.gmailThreadId=threadId;S.gmailThread=null;

  /* ── Inline split view mode ── */
  var detailPanel=gel('email-detail-panel');
  if(detailPanel){
    var splitView=document.querySelector('.email-split-view');
    if(splitView)splitView.classList.add('has-detail');
    detailPanel.innerHTML=rEmailDetailInline(threadId);
    _highlightActiveThread(threadId);
  }else{
    /* Fallback: modal mode */
    gel('detail-body').innerHTML=rEmailThreadModal(threadId);
    gel('detail-modal').classList.add('on','full-detail');
  }

  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    var resp=await fetchWithRetry('/api/gmail/thread?id='+encodeURIComponent(threadId),{headers:{'Authorization':'Bearer '+token}},15000,1);
    if(!resp.ok){var err=await resp.json();throw new Error(err.error||'Failed')}
    S.gmailThread=await resp.json();
    /* Capture subject for timer task */
    if(S._emailTimer&&S.gmailThread&&S.gmailThread.messages&&S.gmailThread.messages.length){
      S._emailTimer.subject=S.gmailThread.messages[0].subject||S.gmailThread.subject||''}
    /* Mark as read locally + update live threads + call API */
    var cached=S.gmailThreads.find(function(t){return t.thread_id===threadId});
    /* Fallback: thread loaded from Gmail API but not in Supabase cache — build from live data */
    if(!cached&&S._gmailLiveThreads){
      var _live=S._gmailLiveThreads.find(function(t){return(t.threadId||t.thread_id)===threadId});
      if(_live){
        cached={thread_id:threadId,from_email:_live.fromEmail||_live.from_email||'',
          to_emails:_live.toEmails||_live.to_emails||'',cc_emails:_live.ccEmails||_live.cc_emails||'',
          subject:_live.subject||'',is_unread:false,client_id:null,end_client:'',
          end_client_id:null,campaign_id:null,opportunity_id:null,labels:_live.labels||'',
          snippet:_live.snippet||'',from_name:_live.fromName||'',
          last_message_at:_live.date||'',message_count:_live.messageCount||1};
        S.gmailThreads.push(cached)}}
    if(cached){cached.is_unread=false;cached.isUnread=false}
    if(S._gmailLiveThreads)S._gmailLiveThreads.forEach(function(t){if((t.threadId||t.thread_id)===threadId){t.isUnread=false;t.is_unread=false}});
    S.gmailUnread=S.gmailThreads.filter(function(t){return t.is_unread}).length;
    /* Fire-and-forget mark-read API call */
    fetch('/api/gmail/mark-read',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({threadId:threadId,unread:false})}).catch(function(){});
    /* Instantly refresh list panel to remove unread dot */
    _refreshEmailListPanel();buildNav();
    /* Apply email rules if completely uncategorized */
    if(cached&&!cached.client_id&&!cached.end_client&&!cached.campaign_id&&!cached.opportunity_id){
      var ruleActions=applyEmailRules(cached);
      if(ruleActions)_applyRuleActionsToThread(threadId,ruleActions);
      else _autoCategorizeFromContacts(threadId,cached)}
    /* Auto-fill remaining empty fields from contacts (e.g. sync set client but not end-client) */
    else if(cached&&(!cached.client_id||!cached.end_client)){
      _autoCategorizeFromContacts(threadId,cached)}

    /* Re-render with loaded data */
    detailPanel=gel('email-detail-panel');
    if(detailPanel){
      detailPanel.innerHTML=rEmailDetailInline(threadId);
      _highlightActiveThread(threadId);
    }else{
      gel('detail-body').innerHTML=rEmailThreadModal(threadId);
    }
    initEmailIframes();
    /* Restore draft if exists */
    _loadInlineDraft(threadId);
  }catch(e){toast('Gmail: '+e.message,'warn')}}

function _flushEmailTimer(){
  if(!S._emailTimer||!S._emailTimer.started)return;
  var elapsed=Math.round((Date.now()-S._emailTimer.started)/1000);
  if(elapsed<5){S._emailTimer=null;return}  /* Ignore misclicks under 5 seconds */
  var mins=Math.max(1,Math.round(elapsed/60));
  var cat=S._emailTimer.categorization;
  var taskData={
    item:'Email: '+(S._emailTimer.subject||'(no subject)'),
    category:'Email',type:'Business',
    duration:mins,importance:'When Time Allows',
    client:cat?cat.client:'',
    endClient:cat?cat.endClient:'',
    campaign:cat?cat.campaignId:'',
    opportunity:cat?cat.opportunityId:''};
  dbCompleteTask(taskData).then(function(res){
    if(res){S.done.unshift({id:res.id,item:taskData.item,completed:new Date(),
      duration:taskData.duration,category:'Email',type:'Business',
      client:taskData.client,endClient:taskData.endClient,
      campaign:taskData.campaign,opportunity:taskData.opportunity,
      importance:'When Time Allows',est:0,notes:''})}});
  S._emailTimer=null}

function closeEmailThread(){
  _flushEmailTimer();S.gmailThread=null;S.gmailThreadId='';

  /* ── Inline split view: update panels without full render() ── */
  var detailPanel=gel('email-detail-panel');
  if(detailPanel){
    detailPanel.innerHTML=rEmailEmptyDetail();
    var splitView=document.querySelector('.email-split-view');
    if(splitView)splitView.classList.remove('has-detail');
    /* Remove active highlight from thread list */
    document.querySelectorAll('.email-row.email-active').forEach(function(el){el.classList.remove('email-active')});
    /* Update unread count in list */
    _refreshEmailListPanel();
    buildNav();
  }else{
    /* Fallback: modal mode */
    gel('detail-modal').classList.remove('on','full-detail');
    render();
  }}

/* ── Highlight active thread in list panel ── */
function _highlightActiveThread(threadId){
  document.querySelectorAll('.email-row.email-active').forEach(function(el){el.classList.remove('email-active')});
  if(!threadId)return;
  var row=document.querySelector('.email-row[data-tid="'+threadId+'"]');
  if(row)row.classList.add('email-active');
}

/* ── Refresh only the list panel (no full render) ── */
function _refreshEmailListPanel(){
  var listPanel=gel('email-list-panel');
  if(!listPanel)return;
  var scrollTop=listPanel.scrollTop;
  /* Suppress cardIn animation on refresh (only animate on initial load) */
  if(!listPanel.classList.contains('no-anim'))listPanel.classList.add('no-anim');
  listPanel.innerHTML=rEmailListPanel();
  listPanel.scrollTop=scrollTop;
  /* Re-apply active highlight */
  if(S.gmailThreadId)_highlightActiveThread(S.gmailThreadId);
}

/* ── Draft auto-save ── */
var _draftSaveTimer=null;
function _saveInlineDraft(threadId){
  clearTimeout(_draftSaveTimer);
  _draftSaveTimer=setTimeout(function(){
    /* Guard: verify thread hasn't changed during debounce */
    if(S.gmailThreadId!==threadId)return;
    var editor=gel('email-inline-reply-editor');
    if(!editor||!threadId)return;
    var html=editor.innerHTML||'';
    if(!html||html==='<br>')html='';
    var modeLabel=gel('inline-reply-mode-label');
    var mode=modeLabel?modeLabel.textContent:'Reply';
    var data={html:html,mode:mode,ts:Date.now()};
    if(html){
      try{localStorage.setItem('tf_email_draft_'+threadId,JSON.stringify(data))}catch(e){}
    }else{
      try{localStorage.removeItem('tf_email_draft_'+threadId)}catch(e){}
    }
  },1000);
}

function _loadInlineDraft(threadId){
  if(!threadId)return;
  try{
    var raw=localStorage.getItem('tf_email_draft_'+threadId);
    if(!raw)return;
    var data=JSON.parse(raw);
    if(!data||!data.html)return;
    /* Don't restore stale drafts (>24 hours) */
    if(data.ts&&Date.now()-data.ts>86400000){localStorage.removeItem('tf_email_draft_'+threadId);return}
    var editor=gel('email-inline-reply-editor');
    if(editor){
      editor.innerHTML=data.html;
      toast('Draft restored','ok');
    }
  }catch(e){}
}

function _clearInlineDraft(threadId){
  if(!threadId)return;
  try{localStorage.removeItem('tf_email_draft_'+threadId)}catch(e){}
}

/* ═══════════ THREAD CRM CATEGORIZATION ═══════════ */
function threadCrmClientChange(){
  var client=(gel('thread-crm-client')||{}).value||'';
  /* Refresh end-client options */
  var ecSel=gel('thread-crm-ec');if(ecSel){
    var oh='<option value="">— Select —</option>';
    var ecs=[];
    (S.endClients||[]).forEach(function(e){
      if(!client){if(e.name&&ecs.indexOf(e.name)===-1)ecs.push(e.name)}
      else{if(e.clientId){var _ecCr=S.clientRecords.find(function(r){return r.id===e.clientId});
        if(_ecCr&&_ecCr.name===client&&e.name&&ecs.indexOf(e.name)===-1)ecs.push(e.name)}
        else{if(e.name&&ecs.indexOf(e.name)===-1)ecs.push(e.name)}}});
    S.campaigns.forEach(function(c){if(!client||c.partner===client){if(c.endClient&&ecs.indexOf(c.endClient)===-1)ecs.push(c.endClient)}});
    S.tasks.concat(S.done).forEach(function(t){if(!client||t.client===client){if(t.endClient&&ecs.indexOf(t.endClient)===-1)ecs.push(t.endClient)}});
    S.opportunities.forEach(function(o){if(!client||o.client===client){if(o.endClient&&ecs.indexOf(o.endClient)===-1)ecs.push(o.endClient)}});
    ecs.sort().forEach(function(ec){oh+='<option value="'+esc(ec)+'">'+esc(ec)+'</option>'});
    ecSel.innerHTML=oh}
  /* Refresh campaign options */
  var cpSel=gel('thread-crm-campaign');if(cpSel){
    var ch='<option value="">— Select —</option>';
    S.campaigns.filter(function(c){return!client||c.partner===client}).forEach(function(c){
      ch+='<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>'});
    cpSel.innerHTML=ch}
  /* Refresh opportunity options */
  var opSel=gel('thread-crm-opportunity');if(opSel){
    var oph='<option value="">— Select —</option>';
    S.opportunities.filter(function(o){return!o.closedAt&&(!client||o.client===client)}).forEach(function(o){
      oph+='<option value="'+esc(o.id)+'">'+esc(o.name)+'</option>'});
    opSel.innerHTML=oph}
  threadCrmSave()}

async function threadCrmSave(){
  var threadId=S.gmailThreadId;if(!threadId)return;
  var uid=await getUserId();if(!uid)return;
  var client=(gel('thread-crm-client')||{}).value||'';
  var ec=(gel('thread-crm-ec')||{}).value||'';
  var campId=(gel('thread-crm-campaign')||{}).value||'';
  var oppId=(gel('thread-crm-opportunity')||{}).value||'';
  var none=gel('thread-crm-none');
  var isNone=none&&none.checked;
  var _ecId=resolveEndClientId(ec)||null;
  var _clientId=resolveClientId(client)||null;
  var updates={
    client_id:isNone?null:_clientId,
    end_client:isNone?'':(ec||''),
    end_client_id:isNone?null:_ecId,
    campaign_id:isNone?null:(campId||null),
    opportunity_id:isNone?null:(oppId||null)};
  try{
    var res=await _sb.from('gmail_threads').update(updates).eq('user_id',uid).eq('thread_id',threadId);
    if(res.error){toast('CRM save failed: '+res.error.message,'warn');return}
  }catch(e){toast('CRM save error: '+e.message,'warn');return}
  /* Update local cache */
  var cached=S.gmailThreads.find(function(t){return t.thread_id===threadId});
  if(cached){cached.client_id=updates.client_id;cached.end_client=updates.end_client;cached.end_client_id=updates.end_client_id;
    cached.campaign_id=updates.campaign_id;cached.opportunity_id=updates.opportunity_id}
  S._threadCrmCache={};
  /* Update email timer categorization */
  if(S._emailTimer&&S._emailTimer.threadId===threadId){
    S._emailTimer.categorization={client:client,endClient:ec,campaignId:campId,opportunityId:oppId}}
  /* Refresh the right pane context */
  _refreshThreadCrmContext();
  /* Refresh list panel so smart inbox assignments update immediately */
  _refreshEmailListPanel()}

function threadCrmNoneChange(){
  var none=gel('thread-crm-none');
  if(none&&none.checked){
    ['thread-crm-client','thread-crm-ec','thread-crm-campaign','thread-crm-opportunity'].forEach(function(id){
      var el=gel(id);if(el){el.value='';el.disabled=true}})
  }else{
    ['thread-crm-client','thread-crm-ec','thread-crm-campaign','thread-crm-opportunity'].forEach(function(id){
      var el=gel(id);if(el)el.disabled=false})
  }
  threadCrmSave()}

function _refreshThreadCrmContext(){
  var ctx=gel('thread-crm-context');if(!ctx)return;
  var client=(gel('thread-crm-client')||{}).value||'';
  var ec=(gel('thread-crm-ec')||{}).value||'';
  var campId=(gel('thread-crm-campaign')||{}).value||'';
  var oppId=(gel('thread-crm-opportunity')||{}).value||'';
  ctx.innerHTML=rThreadCrmContext(client,ec,campId,oppId)}

async function searchGmail(query){
  S.gmailSearch=query;
  toast('Searching...','info');
  var data=await fetchGmailThreads(S.gmailFilter==='all'?'':S.gmailFilter,query);
  if(data){S._gmailLiveThreads=data.threads||[];S._gmailNextPage=data.nextPageToken||null;
    S._gmailCache[S.gmailFilter]={threads:S._gmailLiveThreads,nextPage:S._gmailNextPage}}
  render()}

function setGmailFilter(filter){
  /* Exit bulk mode on view switch */
  if(S.emailBulkMode){S.emailBulkMode=false;S.emailBulkSelected={}}
  /* Save current view's live threads into per-filter cache */
  if(S.gmailFilter&&S._gmailLiveThreads){
    S._gmailCache[S.gmailFilter]={threads:S._gmailLiveThreads,nextPage:S._gmailNextPage}}
  S.gmailFilter=filter;S.subView=filter;S.gmailSearch='';
  S.gmailThread=null;S.gmailThreadId='';S._filteredEmailResults=null;
  /* Restore from cache if available, otherwise mark as fetching to show skeleton */
  var cached=S._gmailCache[filter];
  var isSmartInbox=filter.indexOf('e-')===0;
  if(cached){S._gmailLiveThreads=cached.threads;S._gmailNextPage=cached.nextPage}
  else if(!isSmartInbox&&filter!=='all'){S._gmailLiveThreads=null;S._gmailNextPage=null}
  else{S._gmailLiveThreads=null;S._gmailNextPage=null}
  save();render();
  /* Re-query server-side filtered results if filters are active */
  if(emailHasActiveFilters())loadFilteredEmailThreads();
  /* Smart inboxes and All Mail use Supabase data, not live fetch */
  else if(!isSmartInbox&&filter!=='all')ensureGmailThreads()}

/* ═══════════ EMAIL FILTERS ═══════════ */
function setEmailFilter(field,value){
  S.emailFilters[field]=value;S._filteredEmailResults=null;render();loadFilteredEmailThreads()}
function toggleEmailFilterExclude(field){
  S.emailFilterExclude[field]=!S.emailFilterExclude[field];S._filteredEmailResults=null;render();loadFilteredEmailThreads()}
function clearEmailFilters(){
  S.emailFilters={client:'',endClient:'',opportunity:'',campaign:''};
  S.emailFilterExclude={client:false,endClient:false,opportunity:false,campaign:false};
  S._filteredEmailResults=null;render()}
function emailHasActiveFilters(){
  return S.emailFilters.client!==''||S.emailFilters.endClient!==''||
    S.emailFilters.opportunity!==''||S.emailFilters.campaign!==''}
function applyEmailFilters(threads){
  if(!emailHasActiveFilters())return threads;
  return threads.filter(function(t){
    var ctx=getThreadCrmContext(t);if(!ctx)return false;
    /* Client filter */
    if(S.emailFilters.client){
      var match=false;
      if(S.emailFilters.client==='__none__')match=!ctx.primaryClient;
      else match=ctx.primaryClient&&ctx.primaryClient.clientId===S.emailFilters.client;
      if(S.emailFilterExclude.client)match=!match;
      if(!match)return false}
    /* End-Client filter */
    if(S.emailFilters.endClient){
      var match2=false;
      if(S.emailFilters.endClient==='__none__')match2=!ctx.primaryEndClient;
      else match2=ctx.primaryEndClient===S.emailFilters.endClient;
      if(S.emailFilterExclude.endClient)match2=!match2;
      if(!match2)return false}
    /* Opportunity filter */
    if(S.emailFilters.opportunity){
      var match3=false;
      if(S.emailFilters.opportunity==='__none__')match3=ctx.opportunities.length===0;
      else match3=ctx.opportunities.some(function(o){return o.id===S.emailFilters.opportunity});
      if(S.emailFilterExclude.opportunity)match3=!match3;
      if(!match3)return false}
    /* Campaign filter */
    if(S.emailFilters.campaign){
      var match4=false;
      if(S.emailFilters.campaign==='__none__')match4=ctx.campaigns.length===0;
      else match4=ctx.campaigns.some(function(c){return c.id===S.emailFilters.campaign});
      if(S.emailFilterExclude.campaign)match4=!match4;
      if(!match4)return false}
    return true})}

/* Server-side filtered email loading — queries Supabase directly with filter conditions
   so filtered views get a full page of results instead of filtering the pre-loaded 500 */
var _loadingFiltered=false;
async function loadFilteredEmailThreads(){
  if(!emailHasActiveFilters()){S._filteredEmailResults=null;return}
  if(_loadingFiltered)return;
  _loadingFiltered=true;
  try{
    var uid=await getUserId();if(!uid){_loadingFiltered=false;return}
    var query=_sb.from('gmail_threads').select('*').eq('user_id',uid)
      .order('last_message_at',{ascending:false}).limit(500);
    /* Label filter based on current view */
    var sub=S.gmailFilter||'inbox';
    if(sub==='inbox')query=query.ilike('labels','%INBOX%');
    else if(sub==='sent')query=query.ilike('labels','%SENT%');
    /* Client filter server-side (reliable — set during sync via email matching) */
    if(S.emailFilters.client){
      if(S.emailFilters.client==='__none__'){
        if(S.emailFilterExclude.client)query=query.not('client_id','is',null);
        else query=query.is('client_id',null)
      }else{
        if(S.emailFilterExclude.client)query=query.neq('client_id',S.emailFilters.client);
        else query=query.eq('client_id',S.emailFilters.client)}}
    var res=await query;
    if(res.error){console.warn('loadFilteredEmailThreads:',res.error);_loadingFiltered=false;return}
    var threads=res.data||[];
    /* Apply remaining filters (end-client, opportunity, campaign) client-side via CRM context */
    threads=applyEmailFilters(threads);
    S._filteredEmailResults=threads;
    _loadingFiltered=false;
    render()
  }catch(e){console.warn('loadFilteredEmailThreads:',e);_loadingFiltered=false}}

/* ═══════════ EMAIL BULK MODE ═══════════ */
function emailToggleBulk(){
  S.emailBulkMode=!S.emailBulkMode;S.emailBulkSelected={};render()}
function emailToggleSel(threadId){
  if(S.emailBulkSelected[threadId])delete S.emailBulkSelected[threadId];
  else S.emailBulkSelected[threadId]=true;render()}
function emailSelectAll(){
  var rows=document.querySelectorAll('.email-row[data-tid]');
  rows.forEach(function(r){var tid=r.getAttribute('data-tid');if(tid)S.emailBulkSelected[tid]=true});
  render()}
function emailDeselectAll(){S.emailBulkSelected={};render()}
function emailBulkCount(){return Object.keys(S.emailBulkSelected).length}
async function bulkArchiveEmails(){
  var ids=Object.keys(S.emailBulkSelected);
  if(!ids.length)return;
  /* Optimistic: remove from UI immediately */
  ids.forEach(function(tid){
    if(S._gmailLiveThreads)S._gmailLiveThreads=S._gmailLiveThreads.filter(function(t){return(t.threadId||t.thread_id)!==tid});
    var st=S.gmailThreads.find(function(t){return t.thread_id===tid});
    if(st)st.labels=(st.labels||'').split(',').filter(function(l){return l!=='INBOX'}).join(',')});
  S._gmailCache={};
  S.emailBulkMode=false;S.emailBulkSelected={};
  S.gmailUnread=(S._gmailLiveThreads||S.gmailThreads).filter(function(t){return t.isUnread||t.is_unread}).length;
  render();
  toast('Archiving '+ids.length+' email'+(ids.length>1?'s':'')+'...','info');
  /* Use batch endpoint for parallel processing */
  try{
    var sess=await _sb.auth.getSession();if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    var resp=await fetchWithTimeout('/api/gmail/batch-archive',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({threadIds:ids})},30000);
    if(!resp.ok){var err=await resp.json();throw new Error(err.error||'Batch archive failed')}
    var result=await resp.json();
    toast('Archived '+result.succeeded.length+' email'+(result.succeeded.length!==1?'s':'')+(result.failed?' ('+result.failed+' failed)':''),'ok')
  }catch(e){toast('Batch archive error: '+e.message,'warn')}
  if(emailHasActiveFilters())loadFilteredEmailThreads()}

async function loadMoreGmailThreads(){
  if(!S._gmailNextPage)return;
  toast('Loading more...','info');
  var data=await fetchGmailThreads(S.gmailFilter==='all'?'':S.gmailFilter,S.gmailSearch,S._gmailNextPage);
  if(data){
    S._gmailLiveThreads=(S._gmailLiveThreads||[]).concat(data.threads||[]);
    S._gmailNextPage=data.nextPageToken||null;
    S._gmailCache[S.gmailFilter]={threads:S._gmailLiveThreads,nextPage:S._gmailNextPage};
    render()}}

var _refreshing=false;
async function refreshGmailInbox(){
  if(_refreshing)return;
  _refreshing=true;
  toast('Refreshing inbox...','info');
  /* Clear all cached views so stale data doesn't persist */
  S._gmailCache={};
  /* Fetch live threads immediately (don't wait for sync) */
  var data=await fetchGmailThreads(S.gmailFilter==='all'?'':S.gmailFilter,S.gmailSearch);
  if(data){S._gmailLiveThreads=data.threads||[];S._gmailNextPage=data.nextPageToken||null;
    S.gmailUnread=(S._gmailLiveThreads||[]).filter(function(t){return t.isUnread}).length;
    S._gmailCache[S.gmailFilter]={threads:S._gmailLiveThreads,nextPage:S._gmailNextPage}}
  _refreshing=false;
  render();
  /* Sync Gmail metadata to Supabase in background (for smart inboxes, CRM, rules) */
  _sb.auth.getSession().then(function(sess){
    if(!sess.data.session)return;
    fetch('/api/sync/gmail',{method:'POST',
      headers:{'Authorization':'Bearer '+sess.data.session.access_token}})
    .then(function(){return loadGmailThreads()})
    .then(function(){render();analyzeNewEmails();embedNewEmails()})
    .catch(function(e){console.warn('Background Gmail sync:',e)})
  })}

/* ═══════════ KNOWLEDGE BASE AUTO-EMBED ═══════════ */
var _embeddingEmails=false;
async function embedNewEmails(){
  if(_embeddingEmails)return;
  _embeddingEmails=true;
  try{
    var sess=await _sb.auth.getSession();if(!sess.data.session){_embeddingEmails=false;return}
    var token=sess.data.session.access_token;
    await fetch('/api/knowledge/ingest-emails',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({batchSize:25})});
  }catch(e){console.warn('Email embed:',e)}
  _embeddingEmails=false}

/* ═══════════ KNOWLEDGE BASE PERIODIC SYNC ═══════════ */
var _knowledgeEntityTypes=['task','task_done','client','campaign','contact',
  'project','opportunity','activity_log','finance','scheduled_item','team_member'];
var _knowledgeSyncIdx=0;
var _knowledgeSyncTimer=null;
var _knowledgeSyncing=false;

function startKnowledgeSync(){
  if(_knowledgeSyncTimer)return;
  /* First sync after 15 seconds (let data load), then every 90 seconds */
  setTimeout(function(){
    doKnowledgeSync();
    _knowledgeSyncTimer=setInterval(doKnowledgeSync,90000)
  },15000)}

async function doKnowledgeSync(){
  if(_knowledgeSyncing)return;
  _knowledgeSyncing=true;
  var entityType=_knowledgeEntityTypes[_knowledgeSyncIdx%_knowledgeEntityTypes.length];
  _knowledgeSyncIdx++;
  try{
    var sess=await _sb.auth.getSession();if(!sess.data.session){_knowledgeSyncing=false;return}
    var token=sess.data.session.access_token;
    var resp=await fetch('/api/knowledge/sync-entities',{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({entityType:entityType})});
    var data=await resp.json();
    if(data.embedded>0)console.log('Knowledge sync ['+entityType+']: '+data.embedded+' embedded, '+data.skipped+' unchanged')
  }catch(e){console.warn('Knowledge sync error:',e.message)}
  _knowledgeSyncing=false}

/* ═══════════ AI BOX FUNCTIONS ═══════════ */

function aiToggle(id){
  var body=gel('ai-body-'+id);
  var chev=gel('ai-chev-'+id);
  if(!body)return;
  var showing=body.style.display==='none';
  body.style.display=showing?'block':'none';
  if(chev)chev.innerHTML=icon(showing?'chevron-down':'chevron-right',14);
  /* Auto-focus input when expanding */
  if(showing){var inp=gel('ai-input-'+id);if(inp)setTimeout(function(){inp.focus()},100)}}

async function aiAsk(id,promptOverride){
  var config=window._aiBoxConfigs[id];
  if(!config)return;
  var question=promptOverride||(gel('ai-input-'+id)?gel('ai-input-'+id).value:'');
  question=question.trim();
  if(!question)return;

  var history=gel('ai-history-'+id);
  var input=gel('ai-input-'+id);
  var sendBtn=gel('ai-send-'+id);
  var prompts=gel('ai-prompts-'+id);

  /* Clear input */
  if(input)input.value='';
  /* Hide suggested prompts after first use */
  if(prompts)prompts.style.display='none';
  /* Disable send */
  if(sendBtn)sendBtn.disabled=true;

  /* Show user message */
  if(history)history.innerHTML+='<div class="ai-msg ai-msg-user">'+esc(question)+'</div>';

  /* Show loading */
  var loadingId='ai-load-'+Date.now();
  if(history)history.innerHTML+='<div class="ai-msg-loading" id="'+loadingId+'"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span><span style="margin-left:4px">Thinking...</span></div>';
  if(history)history.scrollTop=history.scrollHeight;

  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data.session)throw new Error('Not authenticated');
    var token=sess.data.session.access_token;

    var resp=await fetch('/api/knowledge/ai-ask',{method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
      body:JSON.stringify({
        question:question,
        context:{
          clientId:config.clientId||null,
          sourceTypes:config.sourceTypes||null,
          entityContext:config.entityContext||null,
          conversationHistory:window._aiConversations[id]||[]
        }
      })});

    var data=await resp.json();
    /* Remove loading indicator */
    var loadEl=gel(loadingId);if(loadEl)loadEl.remove();

    if(data.error){
      if(history)history.innerHTML+='<div class="ai-msg ai-msg-ai" style="color:var(--red)"><p>'+esc(data.error)+'</p></div>';
    }else{
      /* Show AI answer */
      if(history)history.innerHTML+='<div class="ai-msg ai-msg-ai">'+data.answer+'</div>';
      /* Show sources */
      if(data.sources&&data.sources.length>0){
        var srcHtml='<div class="ai-msg-sources"><span>Sources: </span>';
        data.sources.slice(0,5).forEach(function(s){
          srcHtml+='<span class="ai-src">'+esc(s.type)+': '+esc(s.title.substring(0,40))+(s.title.length>40?'...':'')+' ('+s.similarity+'%)</span>'});
        srcHtml+='</div>';
        if(history)history.innerHTML+=srcHtml}
      /* Track conversation for follow-ups */
      if(!window._aiConversations[id])window._aiConversations[id]=[];
      window._aiConversations[id].push({role:'user',content:question});
      window._aiConversations[id].push({role:'assistant',content:data.answer.replace(/<[^>]+>/g,' ').substring(0,500)});
      /* Update badge */
      var badge=gel('ai-badge-'+id);
      if(badge){badge.textContent=window._aiConversations[id].length/2+' Q&A';badge.style.display='inline'}
    }
  }catch(e){
    var loadEl2=gel(loadingId);if(loadEl2)loadEl2.remove();
    if(history)history.innerHTML+='<div class="ai-msg ai-msg-ai" style="color:var(--red)"><p>Error: '+esc(e.message)+'</p></div>';
  }
  if(sendBtn)sendBtn.disabled=false;
  if(history)history.scrollTop=history.scrollHeight}

function aiClearHistory(id){
  window._aiConversations[id]=[];
  var history=gel('ai-history-'+id);if(history)history.innerHTML='';
  var prompts=gel('ai-prompts-'+id);if(prompts)prompts.style.display='flex';
  var badge=gel('ai-badge-'+id);if(badge)badge.style.display='none'}

/* ═══════════ AUTO-FETCH & POLLING ═══════════ */
async function ensureGmailThreads(){
  if(_refreshing)return;
  if(S._gmailFetching)return;
  if(S._gmailLiveThreads&&S._gmailLiveThreads.length>0)return;
  S._gmailFetching=true;
  var data=await fetchGmailThreads(S.gmailFilter==='all'?'':S.gmailFilter,S.gmailSearch);
  S._gmailFetching=false;
  if(data){S._gmailLiveThreads=data.threads||[];S._gmailNextPage=data.nextPageToken||null;
    S.gmailUnread=(S._gmailLiveThreads||[]).filter(function(t){return t.isUnread}).length;
    S._gmailCache[S.gmailFilter]={threads:S._gmailLiveThreads,nextPage:S._gmailNextPage}}
  render()}

var _emailPollTimer=null;
function startEmailPolling(){
  stopEmailPolling();
  _emailPollTimer=setInterval(function(){
    /* Check scheduled emails regardless of view */
    _checkScheduledEmails();
    if(S.view!=='email')return;
    /* Allow polling even when thread is open — list panel updates independently */
    if(S._gmailFetching)return;
    pollGmailInbox()
  },60000)}
function stopEmailPolling(){
  if(_emailPollTimer){clearInterval(_emailPollTimer);_emailPollTimer=null}}

async function pollGmailInbox(){
  try{
    var data=await fetchGmailThreads(S.gmailFilter==='all'?'':S.gmailFilter,S.gmailSearch);
    if(!data)return;
    var newThreads=data.threads||[];
    var oldThreads=S._gmailLiveThreads||[];
    var oldIds={};oldThreads.forEach(function(t){oldIds[t.threadId]=true});
    var newCount=0;newThreads.forEach(function(t){if(!oldIds[t.threadId])newCount++});
    S._gmailLiveThreads=newThreads;
    S._gmailNextPage=data.nextPageToken||null;
    S.gmailUnread=newThreads.filter(function(t){return t.isUnread}).length;
    S._gmailCache[S.gmailFilter]={threads:S._gmailLiveThreads,nextPage:S._gmailNextPage};
    /* Reload Supabase threads so smart inboxes stay in sync */
    await loadGmailThreads();
    /* If thread is open, only refresh the list panel (preserve detail) */
    if(S.gmailThreadId){
      _refreshEmailListPanel();
      if(newCount>0)buildNav();
    }else{
      if(newCount>0){showNewEmailIndicator(newCount);buildNav()}
      else{buildNav()}
    }
    /* Trigger AI analysis for new threads */
    analyzeNewEmails();
  }catch(e){console.warn('Email poll:',e)}}

function showNewEmailIndicator(count){
  var existing=gel('email-new-indicator');if(existing)existing.remove();
  var bar=document.createElement('div');bar.id='email-new-indicator';bar.className='email-new-bar';
  bar.innerHTML=icon('mail',12)+' '+count+' new email'+(count>1?'s':'')+
    '<button onclick="TF.applyNewEmails()" class="email-new-btn">Show</button>';
  var list=document.querySelector('.email-thread-list');
  if(list)list.parentElement.insertBefore(bar,list);
  else{var main=gel('main');if(main){var search=main.querySelector('.email-search');
    if(search)search.parentElement.insertBefore(bar,search.nextSibling)}}}
function applyNewEmails(){
  var el=gel('email-new-indicator');if(el)el.remove();render()}

/* ═══════════ EMAIL AI ANALYSIS ═══════════ */
var _analyzingEmails=false;
async function analyzeNewEmails(){
  if(_analyzingEmails)return;
  /* Find threads needing analysis: not yet analyzed, in INBOX */
  var ue=S._userEmails||[];if(!ue.length){var _uf=(S._userEmail||'').toLowerCase();if(_uf)ue=[_uf]}
  var toAnalyze=S.gmailThreads.filter(function(t){
    if(t.needs_reply!==null&&t.needs_reply!==undefined)return false;
    if((t.labels||'').indexOf('INBOX')===-1)return false;
    return true
  });
  if(!toAnalyze.length)return;
  _analyzingEmails=true;
  try{
    var sess=await _sb.auth.getSession();if(!sess.data.session){_analyzingEmails=false;return}
    var token=sess.data.session.access_token;
    /* Build client + contact context */
    var clients=(S.clientRecords||[]).map(function(c){return{name:c.name,email:c.email||'',status:c.status||'active'}});
    var contacts=(S.contacts||[]).slice(0,50).map(function(c){
      var cr=S.clientRecords.find(function(r){return r.id===c.clientId});
      return{firstName:c.firstName||'',lastName:c.lastName||'',email:c.email||'',
        clientName:cr?cr.name:'',endClient:c.endClient||''}});
    /* Build thread payloads */
    var threadPayloads=toAnalyze.map(function(t){
      var lastFrom=(t.last_message_from||'').toLowerCase();
      var userSentLast=lastFrom&&ue.indexOf(lastFrom)!==-1;
      return{
      threadId:t.thread_id,subject:t.subject||'',snippet:t.snippet||'',
      fromEmail:t.from_email||'',fromName:t.from_name||'',
      toEmails:t.to_emails||'',ccEmails:t.cc_emails||'',
      labels:t.labels||'',messageCount:t.message_count||1,
      lastMessageAt:t.last_message_at||'',userSentLast:userSentLast}});
    /* Build campaign + opportunity context for smart CRM matching */
    var campPayloads=(S.campaigns||[]).filter(function(c){return c.status==='Active'||c.status==='Setup'}).map(function(c){
      return{id:c.id,name:c.name||'',partner:c.partner||'',endClient:c.endClient||'',status:c.status||''}});
    var oppPayloads=(S.opportunities||[]).filter(function(o){return!o.closedAt}).map(function(o){
      return{id:o.id,name:o.name||'',client:o.client||'',endClient:o.endClient||'',
        contactName:o.contactName||'',contactEmail:o.contactEmail||'',stage:o.stage||''}});
    var resp=await fetch('/api/gmail/analyze',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({threads:threadPayloads,clients:clients,contacts:contacts,campaigns:campPayloads,opportunities:oppPayloads})});
    if(!resp.ok){var errData=await resp.json();console.warn('Email analysis:',errData.error);_analyzingEmails=false;return}
    var result=await resp.json();
    /* Merge results into local state */
    if(result.results&&result.results.length){
      result.results.forEach(function(r){
        var t=S.gmailThreads.find(function(th){return th.thread_id===r.threadId});
        if(t){t.needs_reply=r.needs_reply;t.ai_summary=r.ai_summary||'';
          t.ai_urgency=r.ai_urgency||'';t.ai_category=r.ai_category||'';
          t.ai_sentiment=r.ai_sentiment||'';t.has_meeting=r.has_meeting||false;
          t.meeting_details=r.meeting_details||'';t.needs_followup=r.needs_followup||false;
          t.followup_details=r.followup_details||'';t.ai_client_name=r.ai_client_name||'';
          t.ai_suggested_task=r.ai_suggested_task||'';
          t.ai_analyzed_at=r.ai_analyzed_at||'';
          if(r.client_id)t.client_id=r.client_id;
          if(r.end_client)t.end_client=r.end_client;
          if(r.campaign_id)t.campaign_id=r.campaign_id;
          if(r.opportunity_id)t.opportunity_id=r.opportunity_id}});
      /* Invalidate CRM cache so thread modals show updated data */
      S._threadCrmCache={};
      render();buildNav()}
  }catch(e){console.warn('analyzeNewEmails:',e)}
  _analyzingEmails=false}

function getActionRequiredCount(){
  var now=new Date();
  var replies=S.gmailThreads.filter(function(t){
    return t.needs_reply===true&&t.reply_status==='pending'
      &&(!t.snoozed_until||new Date(t.snoozed_until)<=now)
      &&(t.labels||'').indexOf('INBOX')!==-1
  }).length;
  var followups=S.gmailThreads.filter(function(t){
    return t.needs_followup===true&&(t.labels||'').indexOf('INBOX')!==-1
  }).length;
  return replies+followups}

function getActionRequiredThreads(){
  var now=new Date();
  var threads=S.gmailThreads.filter(function(t){
    return t.needs_reply===true&&t.reply_status==='pending'
      &&(!t.snoozed_until||new Date(t.snoozed_until)<=now)
      &&(t.labels||'').indexOf('INBOX')!==-1});
  /* Sort by urgency: critical > high > normal > low */
  var urgOrder={critical:0,high:1,normal:2,low:3};
  threads.sort(function(a,b){
    var ua=urgOrder[a.ai_urgency]!==undefined?urgOrder[a.ai_urgency]:2;
    var ub=urgOrder[b.ai_urgency]!==undefined?urgOrder[b.ai_urgency]:2;
    if(ua!==ub)return ua-ub;
    return new Date(b.last_message_at||0)-new Date(a.last_message_at||0)});
  return threads}

async function dismissEmailAction(threadId){
  var t=S.gmailThreads.find(function(th){return th.thread_id===threadId});
  if(t)t.reply_status='dismissed';
  render();buildNav();
  try{
    var uid=await getUserId();if(!uid)return;
    await _sb.from('gmail_threads').update({reply_status:'dismissed'}).eq('user_id',uid).eq('thread_id',threadId);
  }catch(e){console.error('dismissEmailAction:',e)}
  toast('Dismissed','info')}

async function snoozeEmailAction(threadId,until){
  var t=S.gmailThreads.find(function(th){return th.thread_id===threadId});
  if(t){t.reply_status='snoozed';t.snoozed_until=until}
  render();buildNav();
  try{
    var uid=await getUserId();if(!uid)return;
    await _sb.from('gmail_threads').update({reply_status:'snoozed',snoozed_until:until}).eq('user_id',uid).eq('thread_id',threadId);
  }catch(e){console.error('snoozeEmailAction:',e)}
  toast('Snoozed until '+new Date(until).toLocaleString(),'info')}

function openSnoozeMenu(threadId,evt){
  evt.stopPropagation();
  /* Close any existing snooze menu */
  var existing=document.querySelector('.snooze-dropdown');if(existing)existing.remove();
  var now=new Date();
  var inOneHour=new Date(now.getTime()+3600000).toISOString();
  var tomorrow9am=new Date(now);tomorrow9am.setDate(tomorrow9am.getDate()+1);tomorrow9am.setHours(9,0,0,0);
  var tomorrow2pm=new Date(now);tomorrow2pm.setDate(tomorrow2pm.getDate()+1);tomorrow2pm.setHours(14,0,0,0);
  var nextMon=new Date(now);nextMon.setDate(nextMon.getDate()+((8-nextMon.getDay())%7||7));nextMon.setHours(9,0,0,0);
  var btn=evt.currentTarget;var rect=btn.getBoundingClientRect();
  var menu=document.createElement('div');menu.className='snooze-dropdown';
  menu.style.top=(rect.bottom+4)+'px';menu.style.left=rect.left+'px';
  menu.innerHTML='<div class="snooze-item" onclick="TF.snoozeEmailAction(\''+threadId+'\',\''+inOneHour+'\');this.parentElement.remove()">'+icon('clock',12)+' In 1 hour</div>'+
    '<div class="snooze-item" onclick="TF.snoozeEmailAction(\''+threadId+'\',\''+tomorrow9am.toISOString()+'\');this.parentElement.remove()">'+icon('sun',12)+' Tomorrow morning</div>'+
    '<div class="snooze-item" onclick="TF.snoozeEmailAction(\''+threadId+'\',\''+tomorrow2pm.toISOString()+'\');this.parentElement.remove()">'+icon('calendar',12)+' Tomorrow afternoon</div>'+
    '<div class="snooze-item" onclick="TF.snoozeEmailAction(\''+threadId+'\',\''+nextMon.toISOString()+'\');this.parentElement.remove()">'+icon('briefcase',12)+' Next Monday</div>'+
    '<div class="snooze-item" style="border-top:1px solid var(--gborder);padding-top:6px;margin-top:4px"><input type="datetime-local" class="snooze-custom" onchange="TF.snoozeEmailAction(\''+threadId+'\',new Date(this.value).toISOString());this.closest(\'.snooze-dropdown\').remove()" style="font-size:11px;background:transparent;border:1px solid var(--gborder);color:var(--t1);border-radius:6px;padding:4px 8px;width:100%"></div>';
  document.body.appendChild(menu);
  /* Close on outside click */
  setTimeout(function(){document.addEventListener('click',function _cls(e){
    if(!menu.contains(e.target)){menu.remove();document.removeEventListener('click',_cls)}},true)},10)}

/* ═══════════ FOLLOW-UP & SUMMARIZE & TASK SUGGESTION ═══════════ */
async function dismissFollowup(threadId){
  var t=S.gmailThreads.find(function(th){return th.thread_id===threadId});
  if(t)t.needs_followup=false;
  render();buildNav();
  try{
    var uid=await getUserId();if(!uid)return;
    await _sb.from('gmail_threads').update({needs_followup:false}).eq('user_id',uid).eq('thread_id',threadId);
  }catch(e){console.error('dismissFollowup:',e)}
  toast('Follow-up cleared','ok')}

async function summarizeThread(threadId){
  var t=S.gmailThreads.find(function(th){return th.thread_id===threadId});
  if(t&&t.full_summary)return t.full_summary;
  try{
    var sess=await _sb.auth.getSession();if(!sess.data.session)return null;
    var token=sess.data.session.access_token;
    toast('Summarizing thread...','info');
    var resp=await fetch('/api/gmail/summarize',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({threadId:threadId})});
    if(!resp.ok){toast('Summarization failed','warn');return null}
    var result=await resp.json();
    if(t)t.full_summary=result.summary;
    toast('Summary ready','ok');
    return result.summary;
  }catch(e){toast('Summarization error: '+e.message,'warn');return null}}

async function doSummarize(threadId){
  var summary=await summarizeThread(threadId);
  if(summary)render()}

async function resummarizeThread(threadId){
  var t=S.gmailThreads.find(function(th){return th.thread_id===threadId});
  if(t)t.full_summary='';
  doSummarize(threadId)}

async function createTaskFromSuggestion(threadId){
  var t=S.gmailThreads.find(function(th){return th.thread_id===threadId});
  if(!t||!t.ai_suggested_task)return;
  var suggestion;
  try{suggestion=JSON.parse(t.ai_suggested_task)}catch(e){toast('Invalid task data','warn');return}
  /* Resolve client from CRM context */
  var ctx=getThreadCrmContext(t);
  var clientName=(ctx&&ctx.primaryClient)?ctx.primaryClient.clientName:'';
  var endClientName=(ctx&&ctx.primaryEndClient)?ctx.primaryEndClient:'';
  var taskData={
    item:suggestion.item||'Email task',
    notes:suggestion.notes||'',
    importance:suggestion.importance||'Important',
    category:suggestion.category||t.ai_category||'',
    client:clientName,endClient:endClientName,
    type:'Business',est:suggestion.est||0,
    status:'Planned'};
  var result=await dbAddTask(taskData);
  if(result){
    /* Clear suggestion from thread */
    t.ai_suggested_task='';
    try{
      var uid=await getUserId();if(uid)
        await _sb.from('gmail_threads').update({ai_suggested_task:''}).eq('user_id',uid).eq('thread_id',threadId);
    }catch(e){}
    await loadData();
    toast('Task created: '+suggestion.item,'ok');
  }}

/* ═══════════ ARCHIVE ═══════════ */
async function archiveEmail(threadId){
  if(!threadId)return;
  /* Optimistic: update UI immediately before API call */
  var removedLive=null,removedLiveIdx=-1,removedSt=null,removedStLabels=null,wasOpen=S.gmailThreadId===threadId;
  if(S.gmailFilter==='inbox'&&S._gmailLiveThreads){
    removedLiveIdx=S._gmailLiveThreads.findIndex(function(t){return(t.threadId||t.thread_id)===threadId});
    if(removedLiveIdx>=0)removedLive=S._gmailLiveThreads.splice(removedLiveIdx,1)[0];
    if(S._gmailCache['inbox'])S._gmailCache['inbox'].threads=S._gmailLiveThreads}
  else{delete S._gmailCache['inbox']}
  var st=S.gmailThreads.find(function(t){return t.thread_id===threadId});
  if(st){removedStLabels=st.labels;st.labels=(st.labels||'').split(',').filter(function(l){return l!=='INBOX'}).join(',')}
  S.gmailUnread=(S._gmailLiveThreads||S.gmailThreads).filter(function(t){return t.isUnread||t.is_unread}).length;
  if(wasOpen){S.gmailThread=null;S.gmailThreadId='';
    var _dp=gel('email-detail-panel');
    if(_dp){_dp.innerHTML=rEmailEmptyDetail();var _sv=document.querySelector('.email-split-view');if(_sv)_sv.classList.remove('has-detail')}
    else{gel('detail-modal').classList.remove('on','full-detail')}}
  _refreshEmailListPanel();buildNav();
  toast('Email archived','ok');
  /* Fire API call in background — roll back on failure */
  try{
    var sess=await _sb.auth.getSession();if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    var resp=await fetchWithTimeout('/api/gmail/archive',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({threadId:threadId})},15000);
    if(!resp.ok){var err=await resp.json();throw new Error(err.error||'Archive failed')}
    if(emailHasActiveFilters())loadFilteredEmailThreads()
  }catch(e){
    /* Roll back optimistic update */
    if(removedLive&&S._gmailLiveThreads){S._gmailLiveThreads.splice(removedLiveIdx,0,removedLive);
      if(S._gmailCache['inbox'])S._gmailCache['inbox'].threads=S._gmailLiveThreads}
    if(st&&removedStLabels!==null)st.labels=removedStLabels;
    S.gmailUnread=(S._gmailLiveThreads||S.gmailThreads).filter(function(t){return t.isUnread||t.is_unread}).length;
    _refreshEmailListPanel();buildNav();
    toast('Archive failed: '+e.message,'warn')}}

function toggleEmailMsg(idx){
  var el=document.querySelector('.email-message[data-msg-idx="'+idx+'"]');if(!el)return;
  el.classList.toggle('collapsed');
  var btn=el.querySelector('.email-msg-collapse');
  if(btn)btn.textContent=el.classList.contains('collapsed')?'Expand':'Collapse'}

async function toggleEmailRead(threadId,markUnread){
  if(!threadId)return;
  /* Optimistic: update UI immediately */
  var prevState=!!markUnread;
  var updateThread=function(t){if((t.threadId||t.thread_id)===threadId){t.isUnread=!!markUnread;t.is_unread=!!markUnread}};
  S.gmailThreads.forEach(updateThread);
  if(S._gmailLiveThreads)S._gmailLiveThreads.forEach(updateThread);
  S.gmailUnread=(S._gmailLiveThreads||S.gmailThreads).filter(function(t){return t.isUnread||t.is_unread}).length;
  if(markUnread){S.gmailThread=null;S.gmailThreadId='';
    var _dp=gel('email-detail-panel');
    if(_dp){_dp.innerHTML=rEmailEmptyDetail();var _sv=document.querySelector('.email-split-view');if(_sv)_sv.classList.remove('has-detail')}
    else{gel('detail-modal').classList.remove('on','full-detail')}}
  render();toast(markUnread?'Marked as unread':'Marked as read','ok');
  /* Fire API call in background — roll back on failure */
  try{
    var sess=await _sb.auth.getSession();if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    var resp=await fetchWithTimeout('/api/gmail/mark-read',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({threadId:threadId,unread:!!markUnread})},15000);
    if(!resp.ok){var err=await resp.json();throw new Error(err.error||'Mark read failed')}
  }catch(e){
    /* Roll back: revert to opposite state */
    var revertThread=function(t){if((t.threadId||t.thread_id)===threadId){t.isUnread=!prevState;t.is_unread=!prevState}};
    S.gmailThreads.forEach(revertThread);
    if(S._gmailLiveThreads)S._gmailLiveThreads.forEach(revertThread);
    S.gmailUnread=(S._gmailLiveThreads||S.gmailThreads).filter(function(t){return t.isUnread||t.is_unread}).length;
    render();toast('Failed: '+e.message,'warn')}}

async function trashEmail(threadId){
  if(!threadId)return;
  if(!confirm('Move this email to trash?'))return;
  /* Optimistic: remove from UI immediately */
  var removedLive=null,removedLiveIdx=-1,removedSup=null,removedSupIdx=-1;
  if(S._gmailLiveThreads){
    removedLiveIdx=S._gmailLiveThreads.findIndex(function(t){return(t.threadId||t.thread_id)===threadId});
    if(removedLiveIdx>=0)removedLive=S._gmailLiveThreads.splice(removedLiveIdx,1)[0]}
  removedSupIdx=S.gmailThreads.findIndex(function(t){return(t.threadId||t.thread_id)===threadId});
  if(removedSupIdx>=0)removedSup=S.gmailThreads.splice(removedSupIdx,1)[0];
  S.gmailUnread=(S._gmailLiveThreads||S.gmailThreads).filter(function(t){return t.isUnread||t.is_unread}).length;
  S.gmailThread=null;S.gmailThreadId='';
  var _dp=gel('email-detail-panel');
  if(_dp){_dp.innerHTML=rEmailEmptyDetail();var _sv=document.querySelector('.email-split-view');if(_sv)_sv.classList.remove('has-detail')}
  else{gel('detail-modal').classList.remove('on','full-detail')}
  render();toast('Email moved to trash','ok');
  /* Fire API call in background — roll back on failure */
  try{
    var sess=await _sb.auth.getSession();if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    var resp=await fetchWithTimeout('/api/gmail/trash',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify({threadId:threadId})},15000);
    if(!resp.ok){var err=await resp.json();throw new Error(err.error||'Trash failed')}
  }catch(e){
    /* Roll back: re-insert removed items */
    if(removedLive&&S._gmailLiveThreads)S._gmailLiveThreads.splice(removedLiveIdx,0,removedLive);
    if(removedSup)S.gmailThreads.splice(removedSupIdx,0,removedSup);
    S.gmailUnread=(S._gmailLiveThreads||S.gmailThreads).filter(function(t){return t.isUnread||t.is_unread}).length;
    render();toast('Trash failed: '+e.message,'warn')}}

async function quickReplyEmail(){
  /* Support both old textarea and new contenteditable inline reply */
  var editor=gel('email-inline-reply-editor');
  var ta=gel('email-quick-reply');
  var body='';
  if(editor){
    body=editor.innerHTML||'';
    if(!body||body==='<br>'||body==='<div><br></div>'){toast('Type a reply first','warn');return}
  }else if(ta){
    if(!ta.value.trim()){toast('Type a reply first','warn');return}
    body='<div>'+ta.value.trim().replace(/\n/g,'<br>')+'</div>';
  }else{toast('Type a reply first','warn');return}
  var thread=S.gmailThread;if(!thread)return;
  var msgs=thread.messages||[];
  var lastMsg=msgs[msgs.length-1];if(!lastMsg)return;
  var mode=window._inlineReplyMode||'reply';
  var subject=lastMsg.subject||'';

  /* Build payload based on mode */
  var payload={body:'<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',system-ui,sans-serif;font-size:14px;line-height:1.5">'+body+'</div>'};
  if(mode==='forward'){
    /* Forward: use inline recipients, Fwd: prefix, NO threadId */
    if(!window._inlineRecipients.to.length){toast('Add at least one recipient','warn');return}
    payload.to=window._inlineRecipients.to.join(',');
    if(window._inlineRecipients.cc.length)payload.cc=window._inlineRecipients.cc.join(',');
    if(window._inlineRecipients.bcc.length)payload.bcc=window._inlineRecipients.bcc.join(',');
    payload.subject=subject.indexOf('Fwd:')===0?subject:'Fwd: '+subject;
  }else if(mode==='replyAll'){
    /* Reply All: use inline recipients, Re: prefix, include threadId */
    payload.to=window._inlineRecipients.to.join(',')||lastMsg.fromEmail||'';
    if(window._inlineRecipients.cc.length)payload.cc=window._inlineRecipients.cc.join(',');
    if(window._inlineRecipients.bcc.length)payload.bcc=window._inlineRecipients.bcc.join(',');
    payload.subject=subject.indexOf('Re:')===0?subject:'Re: '+subject;
    payload.threadId=S.gmailThreadId;
    payload.messageId=lastMsg.messageId||lastMsg.id||'';
  }else{
    /* Simple reply */
    payload.to=lastMsg.fromEmail||'';
    payload.subject=subject.indexOf('Re:')===0?subject:'Re: '+subject;
    payload.threadId=S.gmailThreadId;
    payload.messageId=lastMsg.messageId||lastMsg.id||'';
  }
  /* Include inline attachments */
  if(window._inlineAttachments&&window._inlineAttachments.length){
    payload.attachments=window._inlineAttachments}
  /* Disable send button to prevent double-sends */
  var _sendBtns=document.querySelectorAll('.email-inline-reply-send');
  _sendBtns.forEach(function(b){b.disabled=true;b.style.opacity='.5';b.style.pointerEvents='none';b.textContent='Sending...'});
  try{
    var sess=await _sb.auth.getSession();if(!sess.data.session){_sendBtns.forEach(function(b){b.disabled=false;b.style.opacity='';b.style.pointerEvents='';b.innerHTML=icon('send',12)+' Send'});return}
    var token=sess.data.session.access_token;
    var resp=await fetchWithTimeout('/api/gmail/send',{method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(payload)},30000);
    if(!resp.ok){var err=await resp.json();throw new Error(err.error||'Send failed')}
    toast(mode==='forward'?'Email forwarded':'Reply sent','ok');
    if(editor)editor.innerHTML='';
    if(ta)ta.value='';
    /* Clear saved draft */
    _clearInlineDraft(S.gmailThreadId);
    /* Reset inline state */
    window._inlineReplyMode='reply';
    window._inlineRecipients={to:[],cc:[],bcc:[]};
    window._inlineAttachments=[];
    var recSec=gel('inline-recipients-section');if(recSec)recSec.style.display='none';
    var attBar=gel('inline-attachments-bar');if(attBar){attBar.innerHTML='';attBar.style.display='none'}
    /* Refresh thread to show the new message */
    openEmailThread(S.gmailThreadId)
  }catch(e){
    /* Re-enable send buttons on failure */
    document.querySelectorAll('.email-inline-reply-send').forEach(function(b){b.disabled=false;b.style.opacity='';b.style.pointerEvents='';b.innerHTML=icon('send',12)+' Send'});
    toast((mode==='forward'?'Forward':'Reply')+' failed: '+e.message,'warn')}}

/* ── Inline AI Draft (in thread quick reply) ── */
function inlineAiDraft(){
  var wrap=gel('inline-ai-draft-prompt');
  if(!wrap)return;
  if(wrap.classList.contains('open')){
    wrap.classList.remove('open');return}
  wrap.classList.add('open');
  var inp=gel('inline-ai-draft-input');if(inp)inp.focus()}

async function inlineAiDraftGo(){
  var threadId=S.gmailThreadId;
  if(!threadId){toast('No thread open','warn');return}
  var promptInput=gel('inline-ai-draft-input');
  var customPrompt=promptInput?promptInput.value.trim():'';
  var goBtn=gel('inline-ai-draft-go');
  if(goBtn){goBtn.disabled=true;goBtn.innerHTML=icon('sparkle',10)+' Drafting...'}
  try{
    var sess=await _sb.auth.getSession();
    if(!sess.data||!sess.data.session){toast('Not authenticated','warn');return}
    var token=sess.data.session.access_token;
    /* Get thread messages */
    var thread=S._gmailCache&&S._gmailCache[threadId];
    var messages=[];
    if(thread&&thread.messages){
      messages=thread.messages.map(function(m){return{from:m.from,fromName:m.fromName,date:m.date,body:m.body,subject:m.subject}})}
    if(!messages.length){
      var resp=await fetch('/api/gmail/thread?id='+threadId,{headers:{'Authorization':'Bearer '+token}});
      if(resp.ok){var data=await resp.json();messages=(data.messages||[]).map(function(m){return{from:m.from,fromName:m.fromName,date:m.date,body:m.body,subject:m.subject}})}}
    if(!messages.length){toast('Could not load thread','warn');return}
    var subject=messages[0].subject||'';
    var gmailThread=S.gmailThreads.find(function(t){return t.threadId===threadId||t.thread_id===threadId});
    var clientId=gmailThread?gmailThread.clientId||gmailThread.client_id:null;
    var payload={threadId:threadId,messages:messages,subject:subject,clientId:clientId};
    if(customPrompt)payload.customPrompt=customPrompt;
    var draftResp=await fetch('/api/knowledge/ai-draft',{
      method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(payload)});
    if(!draftResp.ok){var errData=await draftResp.json().catch(function(){return{}});throw new Error(errData.error||'AI Draft failed')}
    var result=await draftResp.json();
    var draft=result.draft||'';
    if(!draft){toast('AI could not generate a draft','warn');return}
    /* Insert into inline reply editor */
    var editor=gel('email-inline-reply-editor');
    if(editor)editor.innerHTML=draft;
    /* Hide prompt */
    var wrap=gel('inline-ai-draft-prompt');if(wrap)wrap.classList.remove('open');
    if(promptInput)promptInput.value='';
    var sources=result.sources||[];
    toast('Draft generated from '+sources.length+' knowledge sources','ok')
  }catch(e){console.error('inlineAiDraft error:',e);toast(e.message||'AI Draft failed','err')
  }finally{if(goBtn){goBtn.disabled=false;goBtn.innerHTML=icon('sparkle',10)+' Draft'}}}

/* ── Toggle action card expand (for compact cards) ── */
function toggleActionExpand(el){
  var card=el.closest('.action-card-compact');
  if(card)card.classList.toggle('expanded')}

function createTaskFromEmail(){
  if(!S.gmailThread)return;
  var msgs=S.gmailThread.messages||[];
  var firstMsg=msgs[0]||{};
  var lastMsg=msgs[msgs.length-1]||{};
  var subject=firstMsg.subject||'(no subject)';
  var snippet=lastMsg.snippet||'';
  if(snippet.length>200)snippet=snippet.substring(0,200)+'...';
  /* Try to match sender to a client */
  var senderEmail=lastMsg.fromEmail||firstMsg.fromEmail||'';
  var match=matchEmailToClient(senderEmail);
  var clientName=match?match.clientName:'';
  openAddModal({item:subject,notes:'From email: '+snippet,client:clientName,emailThreadId:S.gmailThreadId})}

/* ── Forward email ── */
function forwardEmail(msgIdx){
  if(!S.gmailThread||!S.gmailThread.messages||!S.gmailThread.messages.length)return;
  var msgs=S.gmailThread.messages;
  var lastMsg=(typeof msgIdx==='number'&&msgs[msgIdx])?msgs[msgIdx]:msgs[msgs.length-1];
  var subject=lastMsg.subject||'';
  if(subject&&!subject.match(/^Fwd:/i))subject='Fwd: '+subject;
  var dateD=new Date(lastMsg.date);
  var dateLabel=MO[dateD.getMonth()]+' '+dateD.getDate()+', '+dateD.getFullYear()+' at '+(dateD.getHours()%12||12)+':'+String(dateD.getMinutes()).padStart(2,'0')+' '+(dateD.getHours()<12?'AM':'PM');
  var fwdHeader='<br><br><div style="color:#555">---------- Forwarded message ---------<br>';
  fwdHeader+='From: <b>'+(lastMsg.fromName||lastMsg.fromEmail)+'</b> &lt;'+lastMsg.fromEmail+'&gt;<br>';
  fwdHeader+='Date: '+dateLabel+'<br>';
  fwdHeader+='Subject: '+subject+'<br>';
  if(lastMsg.to)fwdHeader+='To: '+lastMsg.to+'<br>';
  fwdHeader+='</div><br>';
  var body=fwdHeader+(lastMsg.body||lastMsg.snippet||'');
  openComposeEmail({subject:subject,body:body,isForward:true})}

/* ── Reply All ── */
function replyAllEmail(msgIdx){
  if(!S.gmailThread||!S.gmailThread.messages||!S.gmailThread.messages.length)return;
  var msgs=S.gmailThread.messages;
  var lastMsg=(typeof msgIdx==='number'&&msgs[msgIdx])?msgs[msgIdx]:msgs[msgs.length-1];
  var subject=lastMsg.subject||'';
  if(subject&&!subject.match(/^Re:/i))subject='Re: '+subject;
  /* Determine recipients */
  var replyTo=lastMsg.fromEmail||'';
  var allRecipients=[];
  /* Parse To and Cc to get all emails */
  function parseEmails(str){if(!str)return[];return str.split(',').map(function(s){var m=s.match(/<(.+?)>/);return m?m[1].trim():s.trim()}).filter(Boolean)}
  var toEmails=parseEmails(lastMsg.to);
  var ccEmails=parseEmails(lastMsg.cc);
  /* Remove user's own email(s) */
  var _ueList=S._userEmails||[];if(!_ueList.length){var _uf2=(S._userEmail||'').toLowerCase();if(_uf2)_ueList=[_uf2]}
  var allCC=toEmails.concat(ccEmails).filter(function(e){
    var el=e.toLowerCase();return _ueList.indexOf(el)===-1&&el!==replyTo.toLowerCase()});
  /* Build reply quote */
  var dateD=new Date(lastMsg.date);
  var dateLabel=MO[dateD.getMonth()]+' '+dateD.getDate()+', '+dateD.getFullYear()+' at '+(dateD.getHours()%12||12)+':'+String(dateD.getMinutes()).padStart(2,'0')+' '+(dateD.getHours()<12?'AM':'PM');
  var quoteBody='<br><br><div style="color:#555">On '+dateLabel+', '+(lastMsg.fromName||lastMsg.fromEmail)+' wrote:<br>';
  quoteBody+='<blockquote style="border-left:3px solid #ccc;padding-left:12px;margin:8px 0;color:#666">'+(lastMsg.body||lastMsg.snippet||'')+'</blockquote></div>';
  openComposeEmail({to:replyTo,cc:allCC.join(', '),subject:subject,body:quoteBody,
    replyToThreadId:S.gmailThread.threadId,replyToMessageId:lastMsg.id})}

/* ── Compose command helper ── */
function execComposeCmd(cmd,val){
  var editor=gel('compose-body');if(!editor)return;
  editor.focus();
  if(cmd==='createLink'){
    val=prompt('Enter URL:','https://');if(!val)return}
  if(cmd==='insertImage'){
    val=prompt('Enter image URL:','https://');if(!val)return}
  document.execCommand(cmd,false,val||null);
  updateComposeToolbar()}

function updateComposeToolbar(){
  /* Toggle-style commands */
  var cmds=['bold','italic','underline','strikethrough','insertUnorderedList','insertOrderedList','justifyLeft','justifyCenter','justifyRight'];
  cmds.forEach(function(c){
    var btn=document.querySelector('[data-compose-cmd="'+c+'"]');
    if(btn){try{btn.classList.toggle('active',document.queryCommandState(c))}catch(e){}}});
  /* Sync font family select */
  var fontSel=document.querySelector('.compose-font-select');
  if(fontSel){try{var fv=document.queryCommandValue('fontName').replace(/['"]/g,'');
    if(fv){var opts=fontSel.options;for(var i=0;i<opts.length;i++){if(opts[i].value&&fv.toLowerCase().indexOf(opts[i].value.toLowerCase())!==-1){fontSel.selectedIndex=i;break}}}}catch(e){}}
  /* Sync font size select */
  var sizeSel=document.querySelector('.compose-size-select');
  if(sizeSel){try{var sv=document.queryCommandValue('fontSize');
    if(sv){sizeSel.value=sv}}catch(e){}}}

/* ── Color picker toggle ── */
var _COLOR_PRESETS=['#000000','#434343','#666666','#999999','#cccccc','#e06666','#f6b26b','#ffd966','#93c47d','#76a5af','#6fa8dc','#8e7cc3','#c27ba0','#cc0000','#e69138','#f1c232','#6aa84f','#45818e','#3d85c6','#674ea7'];
function toggleColorPicker(type){
  var id=type==='text'?'compose-text-color-picker':'compose-bg-color-picker';
  var panel=gel(id);if(!panel)return;
  /* Close other pickers */
  document.querySelectorAll('.compose-color-picker,.compose-emoji-picker').forEach(function(p){if(p.id!==id)p.classList.remove('open')});
  if(panel.classList.contains('open')){panel.classList.remove('open');return}
  /* Populate if empty */
  if(!panel.innerHTML){
    var h='';
    _COLOR_PRESETS.forEach(function(c){
      h+='<div class="color-swatch" style="background:'+c+'" title="'+c+'" onclick="event.preventDefault();event.stopPropagation();TF.selectColor(\''+type+'\',\''+c+'\')"></div>'});
    panel.innerHTML=h}
  panel.classList.add('open')}
function selectColor(type,color){
  var editor=gel('compose-body');if(!editor)return;
  editor.focus();
  var cmd=type==='text'?'foreColor':'hiliteColor';
  document.execCommand(cmd,false,color);
  /* Update color indicator */
  if(type==='text'){var ind=document.querySelector('.compose-color-wrap .compose-toolbar-btn span[style]');if(ind)ind.style.borderBottomColor=color}
  document.querySelectorAll('.compose-color-picker').forEach(function(p){p.classList.remove('open')})}

/* ── Emoji picker ── */
var _EMOJIS=['😀','😂','🤣','😊','😍','🥰','😘','😎','🤩','🥳','😇','🤔','🤗','😏','😬','😱','😢','😭','😤','🤯','🙄','😴','🤮','🤡','💀','👻','👽','🤖','💩','👋','👍','👎','👏','🙌','🤝','✌️','🤞','🤙','💪','🙏','❤️','🧡','💛','💚','💙','💜','🖤','💯','💥','🔥','⭐','✨','🎉','🎊','🎯','💡','📌','📎','✅','❌','⚡','💬','👀','🚀','🏆','💰','📊','📈','🗓️','⏰','🔔','🔗','📧','💻','☕','🍕','🎵','🌟','🌈','🎨','📝','🔍'];
function toggleEmojiPicker(){
  var panel=gel('compose-emoji-picker');if(!panel)return;
  /* Close other pickers */
  document.querySelectorAll('.compose-color-picker,.compose-emoji-picker').forEach(function(p){if(p.id!=='compose-emoji-picker')p.classList.remove('open')});
  if(panel.classList.contains('open')){panel.classList.remove('open');return}
  /* Populate if empty */
  if(!panel.innerHTML){
    var h='<div class="emoji-grid">';
    _EMOJIS.forEach(function(e){
      h+='<div class="emoji-item" onclick="event.preventDefault();event.stopPropagation();TF.insertEmoji(\''+e+'\')">'+e+'</div>'});
    h+='</div>';
    panel.innerHTML=h}
  panel.classList.add('open')}
function insertEmoji(emoji){
  var editor=gel('compose-body');if(!editor)return;
  editor.focus();
  document.execCommand('insertText',false,emoji);
  var panel=gel('compose-emoji-picker');if(panel)panel.classList.remove('open')}

/* ── Email Drafts (localStorage) ── */
function _loadDrafts(){try{return JSON.parse(localStorage.getItem('tf_email_drafts')||'[]')}catch(e){return[]}}
function _saveDrafts(arr){try{var str=JSON.stringify(arr);if(str.length>4000000){/* strip attachment data if too large */arr.forEach(function(d){if(d.attachments)d.attachments=d.attachments.map(function(a){return{filename:a.filename,mimeType:a.mimeType,size:a.size}})});str=JSON.stringify(arr)}localStorage.setItem('tf_email_drafts',str)}catch(e){}}

function _saveDraft(existingId){
  var editor=gel('compose-body');if(!editor)return null;
  var to=window._composeRecipients.to||[];
  var cc=window._composeRecipients.cc||[];
  var bcc=window._composeRecipients.bcc||[];
  var subject=(gel('compose-subject')||{}).value||'';
  var body=editor.innerHTML||'';
  /* Skip saving empty drafts */
  if(!to.length&&!cc.length&&!subject&&(!body||body==='<br>'||body==='<div><br></div>'))return existingId;

  var drafts=_loadDrafts();
  var now=new Date().toISOString();
  var draft;
  if(existingId){draft=drafts.find(function(d){return d.id===existingId})}
  if(!draft){
    draft={id:'draft_'+Date.now()+'_'+Math.random().toString(36).substr(2,5),createdAt:now};
    drafts.push(draft)}
  draft.to=to;draft.cc=cc;draft.bcc=bcc;
  draft.subject=subject;draft.body=body;
  draft.attachments=(window._composeAttachments||[]).map(function(a){return{filename:a.filename,mimeType:a.mimeType,size:a.size,data:a.data}});
  draft.threadId=(gel('compose-threadId')||{}).value||'';
  draft.messageId=(gel('compose-messageId')||{}).value||'';
  draft.isReply=!!draft.threadId;
  /* Categorization */
  draft.catClient=(gel('compose-cat-client')||{}).value||'';
  draft.catEC=(gel('compose-cat-ec')||{}).value||'';
  draft.catCampaign=(gel('compose-cat-campaign')||{}).value||'';
  draft.catOpp=(gel('compose-cat-opportunity')||{}).value||'';
  draft.catNone=!!(gel('compose-cat-none')&&gel('compose-cat-none').checked);
  draft.updatedAt=now;
  _saveDrafts(drafts);
  return draft.id}

function _deleteDraft(draftId){
  if(!draftId)return;
  var drafts=_loadDrafts().filter(function(d){return d.id!==draftId});
  _saveDrafts(drafts)}

function openDraft(draftId){
  var drafts=_loadDrafts();
  var draft=drafts.find(function(d){return d.id===draftId});
  if(!draft){toast('Draft not found','warn');return}
  openComposeEmail({
    to:(draft.to||[])[0]||'',
    cc:(draft.cc||[]).join(', '),
    bcc:(draft.bcc||[]).join(', '),
    subject:draft.subject||'',
    body:draft.body||'',
    replyToThreadId:draft.threadId||'',
    replyToMessageId:draft.messageId||'',
    _draftId:draft.id,
    _draftRecipients:{to:draft.to||[],cc:draft.cc||[],bcc:draft.bcc||[]},
    _draftCat:{client:draft.catClient||'',ec:draft.catEC||'',campaign:draft.catCampaign||'',opp:draft.catOpp||'',none:draft.catNone||false}
  })}

function deleteDraft(draftId){
  _deleteDraft(draftId);
  toast('Draft deleted','ok');
  render()}

function getDraftCount(){return _loadDrafts().length}

/* ── Scheduled Emails (Supabase) ── */
async function loadScheduledEmails(){
  var uid=await getUserId();if(!uid)return;
  var res=await _sb.from('scheduled_emails').select('*').eq('user_id',uid).order('scheduled_at',{ascending:true});
  S.scheduledEmails=(res.data||[]).map(function(r){return{
    id:r.id,to:r.to_emails,cc:r.cc_emails||'',bcc:r.bcc_emails||'',
    subject:r.subject,body:r.body,attachments:r.attachments||[],
    threadId:r.thread_id||'',messageId:r.message_id||'',
    categorization:r.categorization||{},
    scheduledAt:r.scheduled_at,status:r.status,sentAt:r.sent_at,
    error:r.error,createdAt:r.created_at}})}

async function scheduleEmail(scheduledAt){
  var editor=gel('compose-body');if(!editor)return;
  var to=window._composeRecipients.to.join(', ');
  var cc=window._composeRecipients.cc.join(', ');
  var bcc=window._composeRecipients.bcc.join(', ');
  var subject=(gel('compose-subject')||{}).value||'';
  var body=editor.innerHTML||'';
  if(!to){toast('Add at least one recipient','warn');return}
  if(!body||body==='<br>'||body==='<div><br></div>'){toast('Write a message','warn');return}

  var htmlBody='<div style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',system-ui,sans-serif;font-size:14px;line-height:1.5">'+body+'</div>';
  var uid=await getUserId();if(!uid)return;

  var catClient=(gel('compose-cat-client')||{}).value||'';
  var catEC=(gel('compose-cat-ec')||{}).value||'';
  var catCampaign=(gel('compose-cat-campaign')||{}).value||'';
  var catOpp=(gel('compose-cat-opportunity')||{}).value||'';

  var row={user_id:uid,to_emails:to,cc_emails:cc,bcc_emails:bcc,
    subject:subject,body:htmlBody,
    attachments:(window._composeAttachments||[]).map(function(a){return{filename:a.filename,mimeType:a.mimeType,data:a.data}}),
    thread_id:(gel('compose-threadId')||{}).value||'',
    message_id:(gel('compose-messageId')||{}).value||'',
    categorization:{client:catClient,endClient:catEC,campaignId:catCampaign,opportunityId:catOpp},
    scheduled_at:scheduledAt};

  var res=await _sb.from('scheduled_emails').insert(row).select().single();
  if(res.error){toast('Schedule failed: '+res.error.message,'warn');return}

  /* Clean up compose */
  if(window._composeDraftTimer){clearInterval(window._composeDraftTimer);window._composeDraftTimer=null}
  if(window._composeDraftId){_deleteDraft(window._composeDraftId);window._composeDraftId=null}
  document.removeEventListener('selectionchange',updateComposeToolbar);
  window._composeAttachments=[];
  var inner=gel('modal').querySelector('.tf-modal-inner')||gel('modal');
  inner.classList.remove('tf-modal-wide');
  var dm=gel('detail-modal');dm.classList.remove('on');dm.classList.remove('full-detail');var m=gel('modal');if(m)m.classList.remove('on');

  var dt=new Date(scheduledAt);
  var lbl=(dt.getMonth()+1)+'/'+dt.getDate()+' at '+(dt.getHours()%12||12)+':'+String(dt.getMinutes()).padStart(2,'0')+(dt.getHours()<12?' AM':' PM');
  toast('Email scheduled for '+lbl,'ok');
  loadScheduledEmails().then(render)}

async function cancelScheduledEmail(id){
  var res=await _sb.from('scheduled_emails').delete().eq('id',id);
  if(res.error){toast('Cancel failed: '+res.error.message,'warn');return}
  S.scheduledEmails=(S.scheduledEmails||[]).filter(function(e){return e.id!==id});
  toast('Scheduled email cancelled','ok');
  render()}

async function _checkScheduledEmails(){
  var uid=await getUserId();if(!uid)return;
  var now=new Date().toISOString();
  var res=await _sb.from('scheduled_emails').select('*').eq('user_id',uid).eq('status','pending').lte('scheduled_at',now);
  if(!res.data||!res.data.length)return;
  for(var i=0;i<res.data.length;i++){
    var se=res.data[i];
    try{
      var sess=await _sb.auth.getSession();if(!sess.data.session)continue;
      var token=sess.data.session.access_token;
      var payload={to:se.to_emails,subject:se.subject,body:se.body};
      if(se.cc_emails)payload.cc=se.cc_emails;
      if(se.bcc_emails)payload.bcc=se.bcc_emails;
      if(se.thread_id)payload.threadId=se.thread_id;
      if(se.message_id)payload.messageId=se.message_id;
      if(se.attachments&&se.attachments.length)payload.attachments=se.attachments;
      var resp=await fetch('/api/gmail/send',{method:'POST',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
      var data=await resp.json();
      if(!resp.ok||data.error)throw new Error(data.error||'Send failed');
      await _sb.from('scheduled_emails').update({status:'sent',sent_at:new Date().toISOString()}).eq('id',se.id);
      toast('Scheduled email sent: '+esc(se.subject||'(no subject)'),'ok');
    }catch(e){
      await _sb.from('scheduled_emails').update({status:'failed',error:e.message}).eq('id',se.id);
      toast('Scheduled send failed: '+e.message,'warn')}}}

/* ── Email Rules (Supabase) ── */
async function loadEmailRules(){
  var uid=await getUserId();if(!uid)return;
  var res=await _sb.from('email_rules').select('*').eq('user_id',uid).order('priority',{ascending:false});
  S.emailRules=(res.data||[]).map(function(r){return{
    id:r.id,name:r.name,conditions:r.conditions||[],actions:r.actions||[],
    isActive:r.is_active,priority:r.priority||0,createdAt:r.created_at}})}

function applyEmailRules(thread){
  if(!S.emailRules||!S.emailRules.length)return null;
  var rules=S.emailRules.filter(function(r){return r.isActive}).sort(function(a,b){return(b.priority||0)-(a.priority||0)});
  for(var i=0;i<rules.length;i++){
    var rule=rules[i];
    if(!rule.conditions.length)continue;
    var allMatch=true;
    for(var j=0;j<rule.conditions.length;j++){
      var cond=rule.conditions[j];
      var val=(cond.value||'').toLowerCase();
      if(!val){allMatch=false;break}
      /* Gather thread participants */
      var from=((thread.from_email||thread.fromEmail||'')).toLowerCase();
      var fromDomain=from.indexOf('@')!==-1?from.split('@')[1]:'';
      var subj=((thread.subject||'')).toLowerCase();
      var toCc=((thread.to||'')+ ' '+(thread.cc||'')).toLowerCase();
      var allParticipants=(from+' '+toCc).toLowerCase();

      if(cond.type==='from_domain_equals'&&fromDomain!==val){allMatch=false;break}
      else if(cond.type==='from_email_contains'&&from.indexOf(val)===-1){allMatch=false;break}
      else if(cond.type==='subject_contains'&&subj.indexOf(val)===-1){allMatch=false;break}
      else if(cond.type==='to_or_cc_contains'&&toCc.indexOf(val)===-1){allMatch=false;break}
      else if(cond.type==='any_participant_domain'){
        var hasDomain=allParticipants.indexOf('@'+val)!==-1;
        if(!hasDomain){allMatch=false;break}}}
    if(allMatch)return rule.actions}
  return null}

async function _applyRuleActionsToThread(threadId,actions){
  if(!actions||!actions.length||!threadId)return;
  var uid=await getUserId();if(!uid)return;
  var updates={};
  actions.forEach(function(act){
    if(act.type==='assign_client')updates.client_id=resolveClientId(act.value)||null;
    else if(act.type==='assign_end_client'){updates.end_client=act.value||'';updates.end_client_id=resolveEndClientId(act.value)||null}
    else if(act.type==='assign_campaign')updates.campaign_id=act.value||null;
    else if(act.type==='assign_opportunity')updates.opportunity_id=act.value||null});
  if(Object.keys(updates).length){
    await _sb.from('gmail_threads').update(updates).eq('user_id',uid).eq('thread_id',threadId);
    /* Update local cache */
    var cached=S.gmailThreads.find(function(t){return(t.thread_id||t.threadId)===threadId});
    if(cached){Object.keys(updates).forEach(function(k){cached[k]=updates[k]})}
    S._threadCrmCache={}}
  /* Handle auto-archive */
  var archiveAct=actions.find(function(a){return a.type==='auto_archive'});
  if(archiveAct)archiveEmail(threadId)}

/* Auto-populate empty CRM fields from contact matching.
   Updates local cache synchronously (so re-render shows values immediately),
   then fire-and-forget writes to DB. */
function _autoCategorizeFromContacts(threadId,cached){
  if(!cached||!threadId)return;
  var from=cached.from_email||'';
  var to=cached.to_emails||'';
  var cc=cached.cc_emails||'';
  var ctx=resolveThreadCrmContext(from,to,cc);

  var updates={};
  var hasChanges=false;

  /* Auto-fill client_id from primary contact match */
  if(!cached.client_id&&ctx.primaryClient){
    updates.client_id=ctx.primaryClient.clientId;
    hasChanges=true}

  /* Auto-fill end_client from primary end-client match */
  if(!cached.end_client&&ctx.primaryEndClient){
    updates.end_client=ctx.primaryEndClient;
    updates.end_client_id=resolveEndClientId(ctx.primaryEndClient)||null;
    hasChanges=true}

  /* Auto-fill campaign_id if exactly one campaign resolved */
  if(!cached.campaign_id&&ctx.campaigns.length===1){
    updates.campaign_id=ctx.campaigns[0].id;
    hasChanges=true}

  /* Auto-fill opportunity_id if exactly one opportunity resolved */
  if(!cached.opportunity_id&&ctx.opportunities.length===1){
    updates.opportunity_id=ctx.opportunities[0].id;
    hasChanges=true}

  if(!hasChanges)return;
  /* Update local cache synchronously so re-render picks up values */
  Object.keys(updates).forEach(function(k){cached[k]=updates[k]});
  S._threadCrmCache={};

  /* Update email timer categorization so completed task gets correct CRM */
  if(S._emailTimer&&S._emailTimer.threadId===threadId){
    var _cr=updates.client_id?S.clientRecords.find(function(r){return r.id===updates.client_id}):null;
    S._emailTimer.categorization={
      client:_cr?_cr.name:(S._emailTimer.categorization?S._emailTimer.categorization.client:''),
      endClient:updates.end_client||(S._emailTimer.categorization?S._emailTimer.categorization.endClient:''),
      campaignId:updates.campaign_id||(S._emailTimer.categorization?S._emailTimer.categorization.campaignId:''),
      opportunityId:updates.opportunity_id||(S._emailTimer.categorization?S._emailTimer.categorization.opportunityId:'')}}

  /* Fire-and-forget database write */
  getUserId().then(function(uid){
    if(!uid)return;
    _sb.from('gmail_threads').update(updates).eq('user_id',uid).eq('thread_id',threadId)
      .then(function(res){if(res.error)console.warn('Auto-categorize save:',res.error.message)})
      .catch(function(e){console.warn('Auto-categorize error:',e.message)})});
  /* Refresh list panel so smart inbox reflects new categorization */
  _refreshEmailListPanel()}

async function saveEmailRule(ruleData){
  var uid=await getUserId();if(!uid)return;
  var row={user_id:uid,name:ruleData.name||'Untitled Rule',
    conditions:ruleData.conditions||[],actions:ruleData.actions||[],
    is_active:ruleData.isActive!==false,priority:ruleData.priority||0};
  if(ruleData.id){
    var res=await _sb.from('email_rules').update(row).eq('id',ruleData.id);
    if(res.error){toast('Save failed: '+res.error.message,'warn');return}}
  else{
    var res2=await _sb.from('email_rules').insert(row);
    if(res2.error){toast('Save failed: '+res2.error.message,'warn');return}}
  await loadEmailRules();toast('Rule saved','ok')}

async function deleteEmailRule(id){
  var res=await _sb.from('email_rules').delete().eq('id',id);
  if(res.error){toast('Delete failed: '+res.error.message,'warn');return}
  await loadEmailRules();toast('Rule deleted','ok');render()}

async function toggleEmailRule(id,active){
  await _sb.from('email_rules').update({is_active:active}).eq('id',id);
  await loadEmailRules();render()}

/* ── Contact autocomplete ── */
window._composeRecipients={to:[],cc:[],bcc:[]};

/* ── Inline reply state ── */
window._inlineReplyMode='reply';
window._inlineRecipients={to:[],cc:[],bcc:[]};
window._inlineAttachments=[];

function acRecipient(field,prefix){
  var p=prefix||'compose';
  var recs=p==='inline'?window._inlineRecipients:window._composeRecipients;
  var input=gel(p+'-'+field+'-input');if(!input)return;
  var q=input.value.toLowerCase().trim();
  var dd=gel(p+'-'+field+'-ac');if(!dd)return;
  if(!q||q.length<1){dd.classList.remove('open');return}
  /* Search contacts */
  var results=S.contacts.filter(function(c){
    var fn=(c.firstName||'').toLowerCase();
    var ln=(c.lastName||'').toLowerCase();
    var em=(c.email||'').toLowerCase();
    return em.indexOf(q)!==-1||fn.indexOf(q)!==-1||ln.indexOf(q)!==-1||(fn+' '+ln).indexOf(q)!==-1;
  }).slice(0,8);
  if(!results.length){dd.classList.remove('open');return}
  var h='';
  results.forEach(function(c,i){
    var fullName=((c.firstName||'')+' '+(c.lastName||'')).trim();
    var initial=(c.firstName||c.email||'?').charAt(0).toUpperCase();
    var bg=emailAvatarColor(c.email);
    h+='<div class="compose-ac-item" onclick="TF.acSelect(\''+field+'\',\''+escAttr(c.email)+'\',\''+escAttr(fullName)+'\',\''+p+'\')">';
    h+='<div class="compose-ac-avatar" style="background:'+bg+'">'+initial+'</div>';
    h+='<div><span class="compose-ac-name">'+esc(fullName)+'</span> <span class="compose-ac-email">'+esc(c.email)+'</span></div>';
    h+='</div>'});
  dd.innerHTML=h;dd.classList.add('open')}

function acSelect(field,email,name,prefix){
  var p=prefix||'compose';
  var recs=p==='inline'?window._inlineRecipients:window._composeRecipients;
  recs[field].push(email);
  renderRecipientChips(field,p);
  var input=gel(p+'-'+field+'-input');if(input){input.value='';input.focus()}
  var dd=gel(p+'-'+field+'-ac');if(dd)dd.classList.remove('open')}

function acRemoveChip(field,idx,prefix){
  var p=prefix||'compose';
  var recs=p==='inline'?window._inlineRecipients:window._composeRecipients;
  recs[field].splice(idx,1);
  renderRecipientChips(field,p)}

function renderRecipientChips(field,prefix){
  var p=prefix||'compose';
  var recs=p==='inline'?window._inlineRecipients:window._composeRecipients;
  var wrap=gel(p+'-'+field+'-chips');if(!wrap)return;
  var h='';
  recs[field].forEach(function(email,i){
    /* Find contact name for display */
    var c=S.contacts.find(function(ct){return ct.email&&ct.email.toLowerCase()===email.toLowerCase()});
    var display=c?((c.firstName||'')+' '+(c.lastName||'')).trim():email;
    if(!display)display=email;
    h+='<span class="compose-chip">'+esc(display)+' <span class="compose-chip-x" onclick="event.stopPropagation();TF.acRemoveChip(\''+field+'\','+i+',\''+p+'\')">&times;</span></span>'});
  wrap.innerHTML=h}

function recipientKeydown(field,e,prefix){
  var p=prefix||'compose';
  var recs=p==='inline'?window._inlineRecipients:window._composeRecipients;
  var input=gel(p+'-'+field+'-input');if(!input)return;
  if(e.key==='Enter'||e.key===','||e.key==='Tab'){
    e.preventDefault();
    var val=input.value.trim().replace(/,$/,'');
    if(val&&val.indexOf('@')!==-1){
      recs[field].push(val);
      renderRecipientChips(field,p);
      input.value=''}
    var dd=gel(p+'-'+field+'-ac');if(dd)dd.classList.remove('open')}
  else if(e.key==='Backspace'&&!input.value&&recs[field].length>0){
    recs[field].pop();
    renderRecipientChips(field,p)}}

/* ── Inline Reply / Reply All / Forward ── */
function inlineReply(msgIdx){
  window._inlineReplyMode='reply';
  var thread=S.gmailThread;if(!thread)return;
  var msgs=thread.messages||[];
  var msg=typeof msgIdx==='number'?msgs[msgIdx]:msgs[msgs.length-1];
  if(!msg)return;
  window._inlineRecipients={to:[msg.fromEmail||''],cc:[],bcc:[]};
  window._inlineAttachments=[];
  _showInlineRecipients();
  var editor=gel('email-inline-reply-editor');
  if(editor){editor.innerHTML='';editor.focus()}}

function inlineReplyAll(msgIdx){
  window._inlineReplyMode='replyAll';
  var thread=S.gmailThread;if(!thread)return;
  var msgs=thread.messages||[];
  var msg=typeof msgIdx==='number'?msgs[msgIdx]:msgs[msgs.length-1];
  if(!msg)return;
  var ue=S._userEmails||[];if(!ue.length){var _u=(S._userEmail||'').toLowerCase();if(_u)ue=[_u]}
  /* To = original sender */
  var to=[msg.fromEmail||''];
  /* CC = all other recipients minus user */
  var cc=[];
  var allRecips=((msg.to||'')+',' +(msg.cc||'')).split(',');
  allRecips.forEach(function(r){
    r=r.trim();if(!r)return;
    var emailMatch=r.match(/<(.+?)>/);
    var addr=(emailMatch?emailMatch[1]:r).trim().toLowerCase();
    if(!addr)return;
    if(ue.indexOf(addr)!==-1)return;
    if(to.indexOf(addr)!==-1)return;
    if(cc.indexOf(addr)===-1)cc.push(addr)});
  window._inlineRecipients={to:to,cc:cc,bcc:[]};
  window._inlineAttachments=[];
  _showInlineRecipients();
  var editor=gel('email-inline-reply-editor');
  if(editor){editor.innerHTML='';editor.focus()}}

function inlineForward(msgIdx){
  window._inlineReplyMode='forward';
  var thread=S.gmailThread;if(!thread)return;
  var msgs=thread.messages||[];
  var msg=typeof msgIdx==='number'?msgs[msgIdx]:msgs[msgs.length-1];
  if(!msg)return;
  window._inlineRecipients={to:[],cc:[],bcc:[]};
  window._inlineAttachments=[];
  _showInlineRecipients();
  var editor=gel('email-inline-reply-editor');
  if(editor){
    /* Insert forwarded message body */
    var fwdHeader='<div style="color:var(--t4);border-top:1px solid var(--gborder);padding-top:12px;margin-top:12px;font-size:12px">';
    fwdHeader+='---------- Forwarded message ----------<br>';
    fwdHeader+='From: '+esc(msg.fromName||'')+' &lt;'+esc(msg.fromEmail||'')+'&gt;<br>';
    fwdHeader+='Date: '+esc(msg.date||'')+'<br>';
    fwdHeader+='Subject: '+esc(msg.subject||'')+'<br>';
    if(msg.to)fwdHeader+='To: '+esc(msg.to)+'<br>';
    fwdHeader+='</div><br>';
    editor.innerHTML='<br>'+fwdHeader+(msg.body||esc(msg.snippet||''));
    /* Move cursor to the beginning */
    var range=document.createRange();var sel=window.getSelection();
    range.setStart(editor,0);range.collapse(true);sel.removeAllRanges();sel.addRange(range)}
  /* Focus on the To field */
  var toInput=gel('inline-to-input');if(toInput)toInput.focus()}

function _showInlineRecipients(){
  var wrap=gel('inline-recipients-section');if(!wrap)return;
  wrap.style.display='block';
  /* Update mode label */
  var label=gel('inline-reply-mode-label');
  if(label){
    var labels={reply:'Reply',replyAll:'Reply All',forward:'Forward'};
    label.textContent=labels[window._inlineReplyMode]||'Reply'}
  /* Render chips */
  renderRecipientChips('to','inline');
  renderRecipientChips('cc','inline');
  renderRecipientChips('bcc','inline');
  /* Show/hide CC/BCC based on content */
  var ccWrap=gel('inline-cc-wrap');
  var bccWrap=gel('inline-bcc-wrap');
  if(ccWrap)ccWrap.style.display=window._inlineRecipients.cc.length||window._inlineReplyMode!=='reply'?'flex':'none';
  if(bccWrap)bccWrap.style.display=window._inlineRecipients.bcc.length?'flex':'none';
  renderInlineAttachments()}

function addInlineAttachment(){
  var fi=gel('inline-file-input');
  if(!fi){fi=document.createElement('input');fi.type='file';fi.multiple=true;fi.id='inline-file-input';fi.style.display='none';
    fi.onchange=function(){_handleInlineFiles(fi.files);fi.value=''};document.body.appendChild(fi)}
  fi.click()}

function _handleInlineFiles(files){
  if(!files||!files.length)return;
  Array.from(files).forEach(function(f){
    var reader=new FileReader();
    reader.onload=function(){
      var base64=reader.result.split(',')[1];
      window._inlineAttachments.push({filename:f.name,mimeType:f.type,size:f.size,data:base64});
      renderInlineAttachments()};
    reader.readAsDataURL(f)})}

function renderInlineAttachments(){
  var wrap=gel('inline-attachments-bar');if(!wrap)return;
  if(!window._inlineAttachments.length){wrap.innerHTML='';wrap.style.display='none';return}
  wrap.style.display='flex';
  var h='';
  window._inlineAttachments.forEach(function(att,i){
    var sizeStr='';
    if(att.size>1048576)sizeStr=(att.size/1048576).toFixed(1)+' MB';
    else if(att.size>1024)sizeStr=Math.round(att.size/1024)+' KB';
    else sizeStr=att.size+' B';
    h+='<span class="inline-att-chip">'+icon('paperclip',10)+' '+esc(att.filename)+' <span style="opacity:.5;font-size:10px">'+sizeStr+'</span>';
    h+=' <span class="compose-chip-x" onclick="event.stopPropagation();TF.removeInlineAttachment('+i+')">&times;</span></span>'});
  wrap.innerHTML=h}

function removeInlineAttachment(idx){
  window._inlineAttachments.splice(idx,1);
  renderInlineAttachments()}

function toggleInlineCcBcc(field){
  var wrap=gel('inline-'+field+'-wrap');if(!wrap)return;
  wrap.style.display=wrap.style.display==='none'?'flex':'none';
  var input=gel('inline-'+field+'-input');if(input)input.focus()}

/* ── Compose attachments ── */
window._composeAttachments=[];

function addComposeAttachment(){
  var fi=gel('compose-file-input');
  if(!fi){fi=document.createElement('input');fi.type='file';fi.multiple=true;fi.id='compose-file-input';fi.style.display='none';
    fi.onchange=function(){handleComposeFiles(fi.files);fi.value=''};document.body.appendChild(fi)}
  fi.click()}

function handleComposeFiles(files){
  if(!files||!files.length)return;
  Array.from(files).forEach(function(f){
    var reader=new FileReader();
    reader.onload=function(){
      var base64=reader.result.split(',')[1];
      window._composeAttachments.push({filename:f.name,mimeType:f.type||'application/octet-stream',size:f.size,data:base64});
      renderComposeAttachments()};
    reader.readAsDataURL(f)})}

function removeComposeAttachment(idx){
  window._composeAttachments.splice(idx,1);
  renderComposeAttachments()}

function renderComposeAttachments(){
  var wrap=gel('compose-attach-list');if(!wrap)return;
  if(!window._composeAttachments.length){wrap.style.display='none';return}
  wrap.style.display='flex';
  var h='';
  window._composeAttachments.forEach(function(a,i){
    var sizeStr=a.size<1024?(a.size+'B'):a.size<1048576?(Math.round(a.size/1024)+'KB'):(Math.round(a.size/1048576*10)/10+'MB');
    h+='<span class="compose-attach-chip">'+icon('paperclip',10)+' '+esc(a.filename)+' <span style="color:var(--t4)">('+sizeStr+')</span>';
    h+=' <span class="compose-chip-x" onclick="TF.removeComposeAttachment('+i+')">&times;</span></span>'});
  wrap.innerHTML=h}

/* ── Download attachment ── */
async function downloadAttachment(messageId,attachmentId,filename,mimeType){
  try{
    toast('Downloading...','info');
    var sess=await _sb.auth.getSession();if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    var resp=await fetch('/api/gmail/attachment?messageId='+encodeURIComponent(messageId)+'&attachmentId='+encodeURIComponent(attachmentId),{
      headers:{'Authorization':'Bearer '+token}});
    var data=await resp.json();
    if(!resp.ok||data.error)throw new Error(data.error||'Download failed');
    /* Convert base64 to blob and trigger download */
    var raw=atob(data.data.replace(/-/g,'+').replace(/_/g,'/'));
    var arr=new Uint8Array(raw.length);
    for(var i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i);
    var blob=new Blob([arr],{type:mimeType||'application/octet-stream'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download=filename||'download';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast('Downloaded '+filename,'ok')
  }catch(e){toast('Download failed: '+e.message,'warn')}}

/* ── Email keyboard shortcuts ── */
function handleEmailKeyboard(e){
  if(S.view!=='email')return;
  /* Bail if any modal is open or focus is in an editable element */
  var modal=gel('modal');var detModal=gel('detail-modal');
  if((modal&&modal.classList.contains('on'))||(detModal&&detModal.classList.contains('on')))return;
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable)return;
  if(e.metaKey||e.ctrlKey||e.altKey)return;
  switch(e.key){
    case 'c':e.preventDefault();openComposeEmail();break;
    case 'e':if(S.gmailThreadId){e.preventDefault();archiveEmail(S.gmailThreadId)}break;
    case '#':if(S.gmailThreadId){e.preventDefault();trashEmail(S.gmailThreadId)}break;
    case 'r':if(S.gmailThreadId&&S.gmailThread){e.preventDefault();openReplyEmail()}break;
    case 'a':if(S.gmailThreadId&&S.gmailThread){e.preventDefault();replyAllEmail()}break;
    case 'f':if(S.gmailThreadId&&S.gmailThread){e.preventDefault();forwardEmail()}break;
    case 'Escape':if(S.gmailThreadId){e.preventDefault();closeEmailThread()}break;
  }}
document.addEventListener('keydown',handleEmailKeyboard);

/* ── Email signature ── */
function getEmailSignature(){return localStorage.getItem('tf_email_signature')||''}
function saveEmailSignature(html){localStorage.setItem('tf_email_signature',html);toast('Signature saved','ok')}

/* ── Cache user email(s) — Supabase + Gmail ── */
S._userEmails=[];
async function cacheUserEmail(){
  if(S._userEmail)return;
  try{
    var sess=await _sb.auth.getSession();if(!sess.data.session)return;
    var token=sess.data.session.access_token;
    S._userEmail=sess.data.session.user.email||'';
    var emails=[S._userEmail.toLowerCase()];
    /* Also grab Gmail address from a sent thread (may differ from Supabase email) */
    var resp=await fetch('/api/gmail/threads?maxResults=1&label=sent',{headers:{'Authorization':'Bearer '+token}});
    if(resp.ok){
      var data=await resp.json();
      if(data.threads&&data.threads.length){
        var gmailAddr=(data.threads[0].fromEmail||'').toLowerCase().trim();
        if(gmailAddr&&emails.indexOf(gmailAddr)===-1)emails.push(gmailAddr)}}
    S._userEmails=emails.filter(function(e){return!!e});
  }catch(e){}}

/* ── Add contact from email sender ── */
function addContactFromEmail(email,optName){
  var name=optName||'';
  if(!name&&S.gmailThread&&S.gmailThread.messages){
    var msgs=S.gmailThread.messages;
    for(var i=0;i<msgs.length;i++){
      if(msgs[i].fromEmail&&msgs[i].fromEmail.toLowerCase()===email.toLowerCase()){
        name=msgs[i].fromName||'';break}}}
  var parts=name.split(' ');
  var firstName=parts[0]||'';
  var lastName=parts.slice(1).join(' ')||'';
  /* Pre-fill client from thread CRM context if available */
  var prefill={email:email,firstName:firstName,lastName:lastName};
  if(S.gmailThreadId){
    var cached=S.gmailThreads.find(function(t){return t.thread_id===S.gmailThreadId});
    if(cached&&cached.client_id)prefill.clientId=cached.client_id}
  openAddContactModal(null,prefill)}

/* ── Add client note from email sidebar ── */
function openAddNoteFromEmail(clientId){
  var text=prompt('Add a note for this client:');
  if(!text||!text.trim())return;
  addClientNote(clientId,text.trim())}

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

function checkStaleBalances(){
  if(S._balanceSyncPending)return;
  var last=S.accountBalances.length?S.accountBalances[0].capturedAt:null;
  if(!last||Date.now()-last.getTime()>30*60*1000){
    S._balanceSyncPending=true;
    syncAllIntegrations(true).finally(function(){S._balanceSyncPending=false})}}

async function syncAllIntegrations(silent){
  var platformMap={brex:'brex',mercury:'mercury',zoho_books:'zoho-books',zoho_payments:'zoho-payments'};
  var active=S.integrations.filter(function(i){return i.is_active});
  if(!active.length){console.warn('[sync] No active integrations found. S.integrations:',S.integrations.map(function(i){return{platform:i.platform,is_active:i.is_active}}));return}
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
    await Promise.all([loadTasks(),loadDone(),loadClientRecords(),loadReview(),loadCampaigns(),loadProjects(),loadOpportunities(),loadEndClients(),loadProspectCompanies()]);
    /* Now load payments, campaign meetings, activity logs, phases & finance (payments/meetings need campaigns, phases need projects) */
    await Promise.all([loadPayments(),loadCampaignMeetings(),loadOpportunityMeetings(),loadActivityLogs(),loadPhases(),loadFinancePayments(),loadFinancePaymentSplits(),loadPayerMap(),loadIntegrations(),loadAccountBalances(),loadScheduledItems(),loadTeamMembers(),loadCampaignNotes(),loadClientNotes(),loadGmailThreads(),loadContacts(),cacheUserEmail(),loadScheduledEmails(),loadEmailRules(),loadMeetings(),loadProspects()]);
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
    S._threadCrmCache={};  /* Invalidate CRM context cache */
    gel('last-refresh').textContent='Updated '+new Date().toLocaleTimeString();
    processRecurring();
    if(typeof cleanMtgPrompted==='function')cleanMtgPrompted();
    toast('Loaded '+S.tasks.length+' tasks, '+S.done.length+' completed'+(S.review.length?', '+S.review.length+' to review':''),'ok');
    /* Trigger AI email analysis for unanalyzed threads (background, non-blocking) */
    setTimeout(function(){analyzeNewEmails()},500);
    /* Backfill end_clients table from string data across all entities */
    setTimeout(function(){syncEndClientRecords().then(backfillEndClientIds)},200);
    /* Sync RL opportunity company names into prospect_companies */
    setTimeout(function(){syncRlProspectCompanies()},400);
    /* Start periodic knowledge base sync (embeds all entity data) */
    startKnowledgeSync();
  }catch(e){toast(''+e.message,'warn')}
  render()}

/* ═══════════ SUPABASE WRITE HELPERS ═══════════ */
/* These replace the old hook() webhook calls */

async function dbAddTask(taskData){
  var uid=await getUserId();if(!uid)return null;
  var _ecId=resolveEndClientId(taskData.endClient)||taskData.endClientId||null;
  var _ecName=_ecId?endClientNameById(_ecId):taskData.endClient||'';
  if(taskData.endClient&&!_ecId){var _ecRec=await ensureEndClientExists(taskData.endClient,taskData.client||'');if(_ecRec){_ecId=_ecRec.id;_ecName=_ecRec.name}}
  var row={user_id:uid,item:taskData.item,due:taskData.due||null,importance:taskData.importance||'When Time Allows',
    est:taskData.est||0,category:taskData.category||'',client:taskData.client||'',end_client:_ecName,end_client_id:_ecId,
    type:taskData.type||'Business',notes:taskData.notes||'',status:taskData.status||'Planned',
    flag:!!taskData.flag,campaign:taskData.campaign||'',duration:taskData.duration||0,meeting_key:taskData.meetingKey||'',
    project:taskData.project||'',phase:taskData.phase||'',opportunity:taskData.opportunity||'',is_inbox:!!taskData.isInbox};
  var res=await _sb.from('tasks').insert(row).select().single();
  if(res.error){toast('Save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditTask(id,taskData){
  var _ecId=resolveEndClientId(taskData.endClient)||taskData.endClientId||null;
  var _ecName=_ecId?endClientNameById(_ecId):taskData.endClient||'';
  if(taskData.endClient&&!_ecId){var _ecRec=await ensureEndClientExists(taskData.endClient,taskData.client||'');if(_ecRec){_ecId=_ecRec.id;_ecName=_ecRec.name}}
  var row={item:taskData.item,due:taskData.due||null,importance:taskData.importance||'When Time Allows',
    est:taskData.est||0,category:taskData.category||'',client:taskData.client||'',end_client:_ecName,end_client_id:_ecId,
    type:taskData.type||'Business',notes:taskData.notes||'',status:taskData.status||'Planned',
    flag:!!taskData.flag,campaign:taskData.campaign||'',duration:taskData.duration||0,meeting_key:taskData.meetingKey||'',
    project:taskData.project||'',phase:taskData.phase||'',opportunity:taskData.opportunity||'',is_inbox:!!taskData.isInbox};
  var res=await _sb.from('tasks').update(row).eq('id',id);
  if(res.error){toast('Update failed: '+res.error.message,'warn');return false}
  return true}

async function dbLinkEmailToTask(taskId,threadId){
  var res=await _sb.from('tasks').update({email_thread_id:threadId||''}).eq('id',taskId);
  if(res.error){toast('Link failed: '+res.error.message,'warn');return false}
  /* Update local state */
  var t=S.tasks.find(function(tk){return tk.id===taskId});
  if(t)t.emailThreadId=threadId||'';
  render();toast(threadId?'Email linked to task':'Email unlinked','ok');return true}

async function dbDeleteTask(id){
  var res=await _sb.from('tasks').delete().eq('id',id);
  if(res.error){toast('Delete failed: '+res.error.message,'warn');return false}
  return true}

async function dbCompleteTask(taskData){
  var uid=await getUserId();if(!uid)return null;
  var _ecId=resolveEndClientId(taskData.endClient)||taskData.endClientId||null;
  var _ecName=_ecId?endClientNameById(_ecId):taskData.endClient||'';
  var row={user_id:uid,item:taskData.item,completed:new Date().toISOString(),
    due:taskData.due?taskData.due.toISOString().split('T')[0]:null,
    importance:taskData.importance||'',category:taskData.category||'',
    client:taskData.client||'',end_client:_ecName,end_client_id:_ecId,type:taskData.type||'Business',
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
  var _ecId=resolveEndClientId(data.endClient)||data.endClientId||null;
  var _ecName=_ecId?endClientNameById(_ecId):data.endClient||'';
  if(data.endClient&&!_ecId){var _ecRec=await ensureEndClientExists(data.endClient,data.partner||'');if(_ecRec){_ecId=_ecRec.id;_ecName=_ecRec.name}}
  var row={user_id:uid,name:data.name,partner:data.partner||'',end_client:_ecName,end_client_id:_ecId,
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
  if('endClient' in data||'endClientId' in data){
    var _ecId=resolveEndClientId(data.endClient)||data.endClientId||null;
    var _ecName=_ecId?endClientNameById(_ecId):data.endClient||'';
    if(data.endClient&&!_ecId){var _ecRec=await ensureEndClientExists(data.endClient,data.partner||'');if(_ecRec){_ecId=_ecRec.id;_ecName=_ecRec.name}}
    data.endClient=_ecName;data.endClientId=_ecId}
  var row={};
  if('name' in data)row.name=data.name;
  if('partner' in data)row.partner=data.partner||'';
  if('endClient' in data)row.end_client=data.endClient||'';
  if('endClientId' in data)row.end_client_id=data.endClientId||null;
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

async function dbAddCampaignNote(campaignId,text){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,campaign_id:campaignId,text:text};
  var res=await _sb.from('campaign_notes').insert(row).select().single();
  if(res.error){toast('Note save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbDeleteCampaignNote(id){
  var res=await _sb.from('campaign_notes').delete().eq('id',id);
  if(res.error){toast('Delete failed: '+res.error.message,'warn');return false}
  return true}

async function dbAddClientNote(clientId,text){
  var uid=await getUserId();if(!uid)return null;
  var row={user_id:uid,client_id:clientId,text:text};
  var res=await _sb.from('client_notes').insert(row).select().single();
  if(res.error){toast('Note save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbDeleteClientNote(id){
  var res=await _sb.from('client_notes').delete().eq('id',id);
  if(res.error){toast('Delete failed: '+res.error.message,'warn');return false}
  return true}

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
  var _ecId=resolveEndClientId(data.endClient)||data.endClientId||null;
  var _ecName=_ecId?endClientNameById(_ecId):data.endClient||'';
  if(data.endClient&&!_ecId){var _ecRec=await ensureEndClientExists(data.endClient,data.client||'');if(_ecRec){_ecId=_ecRec.id;_ecName=_ecRec.name}}
  var row={user_id:uid,name:data.name,description:data.description||'',stage:data.stage||'Lead',
    type:data.type||'fc_partnership',
    client:data.client||'',end_client:_ecName,end_client_id:_ecId,contact_name:data.contactName||'',contact_email:data.contactEmail||'',
    strategy_fee:data.strategyFee||0,setup_fee:data.setupFee||0,monthly_fee:data.monthlyFee||0,
    monthly_ad_spend:data.monthlyAdSpend||0,
    probability:data.probability||50,expected_close:data.expectedClose||null,
    source:data.source||'',notes:data.notes||'',payment_plan:data.paymentPlan||'',
    payment_method:data.paymentMethod||'bank_transfer',processing_fee_pct:data.processingFeePct||0,
    receiving_account:data.receivingAccount||'',expected_monthly_duration:data.expectedMonthlyDuration||12,
    contact_job_title:data.contactJobTitle||'',prospect_website:data.prospectWebsite||'',
    previous_relationship:data.previousRelationship||'',company_description:data.companyDescription||'',
    prospect_description:data.prospectDescription||'',video_strategy_benefits:data.videoStrategyBenefits||'',
    close_reason:data.closeReason||'',
    prospect_company_id:data.prospectCompanyId||null,prospect_id:data.prospectId||null};
  var res=await _sb.from('opportunities').insert(row).select().single();
  if(res.error){toast('Opportunity save failed: '+res.error.message,'warn');return null}
  return res.data}

async function dbEditOpportunity(id,data){
  var _ecId=resolveEndClientId(data.endClient)||data.endClientId||null;
  var _ecName=_ecId?endClientNameById(_ecId):data.endClient||'';
  if(data.endClient&&!_ecId){var _ecRec=await ensureEndClientExists(data.endClient,data.client||'');if(_ecRec){_ecId=_ecRec.id;_ecName=_ecRec.name}}
  var row={name:data.name,description:data.description||'',stage:data.stage||'Lead',
    type:data.type||'fc_partnership',
    client:data.client||'',end_client:_ecName,end_client_id:_ecId,contact_name:data.contactName||'',contact_email:data.contactEmail||'',
    strategy_fee:data.strategyFee||0,setup_fee:data.setupFee||0,monthly_fee:data.monthlyFee||0,
    monthly_ad_spend:data.monthlyAdSpend||0,
    probability:data.probability||50,expected_close:data.expectedClose||null,
    source:data.source||'',notes:data.notes||'',payment_plan:data.paymentPlan||'',
    closed_at:data.closedAt||null,converted_campaign_id:data.convertedCampaignId||null,
    payment_method:data.paymentMethod||'bank_transfer',processing_fee_pct:data.processingFeePct||0,
    receiving_account:data.receivingAccount||'',expected_monthly_duration:data.expectedMonthlyDuration||12,
    contact_job_title:data.contactJobTitle||'',prospect_website:data.prospectWebsite||'',
    previous_relationship:data.previousRelationship||'',company_description:data.companyDescription||'',
    prospect_description:data.prospectDescription||'',video_strategy_benefits:data.videoStrategyBenefits||'',
    close_reason:data.closeReason||'',
    prospect_company_id:data.prospectCompanyId||null,prospect_id:data.prospectId||null};
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
  /* 3. Convert prospect_company → end_client if linked */
  if(op.prospectCompanyId){
    var pc=(S.prospectCompanies||[]).find(function(p){return p.id===op.prospectCompanyId});
    if(pc){
      await ensureEndClientExists(pc.name,op.client);
      await dbEditProspectCompany(pc.id,{status:'converted'})}}
  /* 4. Convert prospect → contact if linked */
  if(op.prospectId){
    var pr=(S.prospects||[]).find(function(p){return p.id===op.prospectId});
    if(pr&&newCl){
      await dbAddContact(newCl.id,{firstName:pr.firstName,lastName:pr.lastName,email:pr.email,phone:pr.phone,role:pr.role});
      await dbEditProspect(pr.id,{status:'converted'})}}
  /* 5. Close opportunity */
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

/* ═══════════ END CLIENTS CRUD ═══════════ */
async function dbAddEndClient(data){
  var uid=await getUserId();if(!uid)return false;
  var rec={user_id:uid,name:data.name,client_id:data.clientId||null,notes:data.notes||'',status:data.status||'active'};
  var res=await _sb.from('end_clients').insert(rec).select().single();
  if(res.error){
    if(res.error.code==='23505'){toast('End client "'+data.name+'" already exists','warn');return false}
    toast('End client save failed: '+res.error.message,'warn');return false}
  await loadEndClients();render();return true}

async function dbEditEndClient(id,data){
  var row={};
  if(data.name!==undefined)row.name=data.name;
  if(data.clientId!==undefined)row.client_id=data.clientId||null;
  if(data.notes!==undefined)row.notes=data.notes;
  if(data.status!==undefined)row.status=data.status;
  var res=await _sb.from('end_clients').update(row).eq('id',id);
  if(res.error){toast('End client update failed: '+res.error.message,'warn');return false}
  await loadEndClients();render();return true}

async function dbDeleteEndClient(id){
  var res=await _sb.from('end_clients').delete().eq('id',id);
  if(res.error){toast('End client delete failed: '+res.error.message,'warn');return false}
  await loadEndClients();render();return true}

/* Resolve an end-client value (UUID or name string) to a UUID. Returns null if not found. */
function resolveEndClientId(val){
  if(!val||val==='__addnew__')return null;
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))return val;
  var ec=(S.endClients||[]).find(function(e){return e.name===val});
  return ec?ec.id:null}

/* Resolve a client value (UUID or name string) to a UUID. Returns null if not found. */
function resolveClientId(val){
  if(!val)return null;
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))return val;
  var cr=(S.clientRecords||[]).find(function(r){return r.name===val});
  return cr?cr.id:null}

/* Look up end-client name by UUID. Returns '' if not found. */
function endClientNameById(id){
  if(!id)return '';
  var ec=(S.endClients||[]).find(function(e){return e.id===id});
  return ec?ec.name:''}

/* Ensure an end_clients record exists for a given name. Lightweight — skips if already in S.endClients.
   Returns the end_clients record {id, name, clientId} or null. Does NOT render/reload — caller handles that. */
async function ensureEndClientExists(ecName,clientName){
  if(!ecName||ecName==='__addnew__')return null;
  var existing=(S.endClients||[]).find(function(ec){return ec.name.toLowerCase()===ecName.toLowerCase()});
  if(existing)return existing;
  /* Resolve clientName to clientId */
  var clientId=null;
  if(clientName){
    var cr=(S.clientRecords||[]).find(function(r){return r.name===clientName});
    if(cr)clientId=cr.id}
  /* Insert silently — no toast, no render */
  var uid=await getUserId();if(!uid)return null;
  var rec={user_id:uid,name:ecName,client_id:clientId,notes:'',status:'active'};
  var res=await _sb.from('end_clients').upsert(rec,{onConflict:'user_id,name',ignoreDuplicates:true}).select().single();
  if(res.error&&res.error.code!=='23505')return null;
  /* Refresh end clients in memory */
  await loadEndClients();
  return(S.endClients||[]).find(function(ec){return ec.name.toLowerCase()===ecName.toLowerCase()})||null}

/* Backfill: scan all end-client strings across tasks, campaigns, opportunities, contacts, done
   and create end_clients records for any that don't already exist. Runs silently. */
async function syncEndClientRecords(){
  var names={};/* {ecName: clientName} — collect unique end-client names with best client guess */
  function add(ecName,clientName){
    if(!ecName||ecName==='__addnew__')return;
    if(!names[ecName])names[ecName]=clientName||'';
    else if(!names[ecName]&&clientName)names[ecName]=clientName}
  (S.campaigns||[]).forEach(function(c){if(c.endClient)add(c.endClient,c.partner)});
  (S.opportunities||[]).forEach(function(o){if(o.endClient)add(o.endClient,o.client)});
  (S.tasks||[]).forEach(function(t){if(t.endClient)add(t.endClient,t.client)});
  (S.done||[]).forEach(function(d){if(d.endClient)add(d.endClient,d.client)});
  (S.contacts||[]).forEach(function(c){
    if(!c.endClient)return;
    var cr=c.clientId?(S.clientRecords||[]).find(function(r){return r.id===c.clientId}):null;
    add(c.endClient,cr?cr.name:'')});
  /* Filter to only names not already in end_clients */
  var existing={};
  (S.endClients||[]).forEach(function(ec){existing[ec.name.toLowerCase()]=true});
  var missing=Object.keys(names).filter(function(n){return!existing[n.toLowerCase()]});
  if(!missing.length)return;
  /* Batch insert missing records */
  var uid=await getUserId();if(!uid)return;
  var rows=missing.map(function(ecName){
    var clientName=names[ecName];
    var cr=clientName?(S.clientRecords||[]).find(function(r){return r.name===clientName}):null;
    return{user_id:uid,name:ecName,client_id:cr?cr.id:null,notes:'',status:'active'}});
  await _sb.from('end_clients').upsert(rows,{onConflict:'user_id,name',ignoreDuplicates:true});
  await loadEndClients()}

/* Backfill: set end_client_id on any rows that have end_client text but null end_client_id */
async function backfillEndClientIds(){
  var tables=['tasks','done','review','campaigns','opportunities','contacts','finance_payments','finance_payment_splits','knowledge_chunks','meetings','gmail_threads'];
  var updated=false;
  for(var i=0;i<(S.endClients||[]).length;i++){
    var ec=S.endClients[i];
    for(var j=0;j<tables.length;j++){
      var res=await _sb.from(tables[j]).update({end_client_id:ec.id}).eq('end_client',ec.name).is('end_client_id',null).select('id');
      if(res.data&&res.data.length>0)updated=true}}
  /* Refresh in-memory campaign endClientIds so filters work immediately */
  if(updated){
    S.campaigns.forEach(function(c){
      if(c.endClient&&!c.endClientId){
        var ec=(S.endClients||[]).find(function(e){return e.name===c.endClient});
        if(ec)c.endClientId=ec.id}})}}

function setEcSort(v){
  var cur=S.ecSort||'name';
  var col=cur.replace(/^-/,'');
  if(col===v){S.ecSort=cur.charAt(0)==='-'?v:'-'+v}
  else{S.ecSort=(v==='name')?v:'-'+v}
  render()}

/* ═══════════ PROSPECT COMPANIES CRUD ═══════════ */
async function dbAddProspectCompany(data){
  var uid=await getUserId();if(!uid)return false;
  var rec={user_id:uid,name:data.name,website:data.website||'',description:data.description||'',
    notes:data.notes||'',source:data.source||'',status:data.status||'active'};
  var res=await _sb.from('prospect_companies').insert(rec).select().single();
  if(res.error){
    if(res.error.code==='23505'){toast('Prospect company "'+data.name+'" already exists','warn');return false}
    toast('Prospect company save failed: '+res.error.message,'warn');return false}
  await loadProspectCompanies();render();return res.data}

async function dbEditProspectCompany(id,data){
  var row={};
  if(data.name!==undefined)row.name=data.name;
  if(data.website!==undefined)row.website=data.website;
  if(data.description!==undefined)row.description=data.description;
  if(data.notes!==undefined)row.notes=data.notes;
  if(data.source!==undefined)row.source=data.source;
  if(data.status!==undefined)row.status=data.status;
  var res=await _sb.from('prospect_companies').update(row).eq('id',id);
  if(res.error){toast('Prospect company update failed: '+res.error.message,'warn');return false}
  await loadProspectCompanies();render();return true}

async function dbDeleteProspectCompany(id){
  var res=await _sb.from('prospect_companies').delete().eq('id',id);
  if(res.error){toast('Prospect company delete failed: '+res.error.message,'warn');return false}
  await loadProspectCompanies();render();return true}

/* ═══════════ PROSPECTS CRUD ═══════════ */
async function dbAddProspect(data){
  var uid=await getUserId();if(!uid)return null;
  var rec={user_id:uid,prospect_company_id:data.prospectCompanyId||null,
    first_name:data.firstName||'',last_name:data.lastName||'',
    email:data.email||'',phone:data.phone||'',role:data.role||'',
    linkedin_url:data.linkedinUrl||'',source:data.source||'',notes:data.notes||'',
    status:data.status||'active'};
  var res=await _sb.from('prospects').insert(rec).select().single();
  if(res.error){toast('Prospect save failed: '+res.error.message,'warn');return null}
  await loadProspects();render();return res.data}

async function dbEditProspect(id,data){
  var row={};
  if(data.prospectCompanyId!==undefined)row.prospect_company_id=data.prospectCompanyId||null;
  if(data.firstName!==undefined)row.first_name=data.firstName;
  if(data.lastName!==undefined)row.last_name=data.lastName;
  if(data.email!==undefined)row.email=data.email;
  if(data.phone!==undefined)row.phone=data.phone;
  if(data.role!==undefined)row.role=data.role;
  if(data.linkedinUrl!==undefined)row.linkedin_url=data.linkedinUrl;
  if(data.source!==undefined)row.source=data.source;
  if(data.notes!==undefined)row.notes=data.notes;
  if(data.status!==undefined)row.status=data.status;
  if(data.lastContactedAt!==undefined)row.last_contacted_at=data.lastContactedAt;
  var res=await _sb.from('prospects').update(row).eq('id',id);
  if(res.error){toast('Prospect update failed: '+res.error.message,'warn');return false}
  await loadProspects();render();return true}

async function dbDeleteProspect(id){
  var res=await _sb.from('prospects').delete().eq('id',id);
  if(res.error){toast('Prospect delete failed: '+res.error.message,'warn');return false}
  await loadProspects();render();return true}

/* Helpers */
function resolveProspectCompanyId(val){
  if(!val||val==='__addnew__')return null;
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val))return val;
  var pc=(S.prospectCompanies||[]).find(function(p){return p.name===val});
  return pc?pc.id:null}

function prospectCompanyNameById(id){
  if(!id)return '';
  var pc=(S.prospectCompanies||[]).find(function(p){return p.id===id});
  return pc?pc.name:''}

async function ensureProspectCompanyExists(name){
  if(!name||name==='__addnew__')return null;
  var existing=(S.prospectCompanies||[]).find(function(pc){return pc.name.toLowerCase()===name.toLowerCase()});
  if(existing)return existing;
  var uid=await getUserId();if(!uid)return null;
  var rec={user_id:uid,name:name,website:'',description:'',notes:'',source:'',status:'active'};
  var res=await _sb.from('prospect_companies').upsert(rec,{onConflict:'user_id,name',ignoreDuplicates:true}).select().single();
  if(res.error&&res.error.code!=='23505')return null;
  await loadProspectCompanies();
  return(S.prospectCompanies||[]).find(function(pc){return pc.name.toLowerCase()===name.toLowerCase()})||null}

/* Sync existing RL opportunity company names into prospect_companies table */
async function syncRlProspectCompanies(){
  var rlOpps=(S.opportunities||[]).filter(function(o){
    return o.type==='retain_live'&&o.client&&!o.prospectCompanyId});
  if(!rlOpps.length)return;
  /* Collect unique company names */
  var names={};
  rlOpps.forEach(function(o){var n=o.client.trim();if(n)names[n.toLowerCase()]={name:n,opps:[]}});
  rlOpps.forEach(function(o){var k=o.client.trim().toLowerCase();if(names[k])names[k].opps.push(o)});
  var keys=Object.keys(names);if(!keys.length)return;
  /* Ensure each company exists and link opps */
  for(var i=0;i<keys.length;i++){
    var entry=names[keys[i]];
    var pc=await ensureProspectCompanyExists(entry.name);
    if(!pc)continue;
    /* Update website/description from first opp that has them */
    var firstOp=entry.opps.find(function(o){return o.prospectWebsite||o.companyDescription});
    if(firstOp&&(!pc.website&&firstOp.prospectWebsite||!pc.description&&firstOp.companyDescription)){
      var upd={};
      if(firstOp.prospectWebsite&&!pc.website)upd.website=firstOp.prospectWebsite;
      if(firstOp.companyDescription&&!pc.description)upd.description=firstOp.companyDescription;
      if(Object.keys(upd).length)await dbEditProspectCompany(pc.id,upd)}
    /* Link each opp */
    for(var j=0;j<entry.opps.length;j++){
      var op=entry.opps[j];
      await _sb.from('opportunities').update({prospect_company_id:pc.id}).eq('id',op.id);
      op.prospectCompanyId=pc.id}}
  await loadProspectCompanies();
  console.log('Synced '+keys.length+' prospect companies from RL opportunities')}

function setPcSort(v){
  var cur=S.pcSort||'name';
  var col=cur.replace(/^-/,'');
  if(col===v){S.pcSort=cur.charAt(0)==='-'?v:'-'+v}
  else{S.pcSort=(v==='name')?v:'-'+v}
  render()}

function setPSort(v){
  var cur=S.pSort||'name';
  var col=cur.replace(/^-/,'');
  if(col===v){S.pSort=cur.charAt(0)==='-'?v:'-'+v}
  else{S.pSort=(v==='name')?v:'-'+v}
  render()}

function setPeopleFilter(v){S.peopleFilter=v;render()}
function setPeopleSort(v){
  var cur=S.peopleSort||'name';
  var col=cur.replace(/^-/,'');
  if(col===v){S.peopleSort=cur.charAt(0)==='-'?v:'-'+v}
  else{S.peopleSort=(v==='name')?v:'-'+v}
  render()}

/* ── Opportunity form helpers for prospect dropdowns ── */
function nopPcChange(){
  var sel=gel('nop-pc');if(!sel)return;
  if(sel.value==='__manual__'){
    var inp=document.createElement('input');inp.type='text';inp.className='edf';inp.id='nop-pc';
    inp.placeholder='Company name...';sel.parentNode.replaceChild(inp,sel);inp.focus();return}
  /* Filter prospect dropdown to match selected company */
  var prSel=gel('nop-prospect');if(!prSel||prSel.tagName!=='SELECT')return;
  var pcId=sel.value;
  var h='<option value="">Select prospect...</option>';
  (S.prospects||[]).filter(function(p){return p.status==='active'&&(!pcId||p.prospectCompanyId===pcId)}).forEach(function(p){
    var pName=(p.firstName+' '+p.lastName).trim()||p.email;
    h+='<option value="'+escAttr(p.id)+'">'+esc(pName)+(p.email?' ('+esc(p.email)+')':'')+'</option>'});
  h+='<option value="__manual__">Enter manually...</option>';
  prSel.innerHTML=h}

function nopProspectChange(){
  var sel=gel('nop-prospect');if(!sel)return;
  if(sel.value==='__manual__'){
    var inp=document.createElement('input');inp.type='text';inp.className='edf';inp.id='nop-prospect';
    inp.placeholder='Prospect name...';sel.parentNode.replaceChild(inp,sel);inp.focus();return}
  /* Auto-fill contact name/email from selected prospect */
  var pr=(S.prospects||[]).find(function(p){return p.id===sel.value});
  if(!pr)return;
  var cn=gel('nop-contact');if(cn&&!cn.value)cn.value=(pr.firstName+' '+pr.lastName).trim();
  var ce=gel('nop-email');if(ce&&!ce.value)ce.value=pr.email||'';
  /* Auto-select prospect company if not set */
  if(pr.prospectCompanyId){
    var pcSel=gel('nop-pc');
    if(pcSel&&pcSel.tagName==='SELECT'&&!pcSel.value){pcSel.value=pr.prospectCompanyId}}}

/* ═══════════ CONTACT REVIEW ═══════════ */
function refreshEcReview(){
  discoverEcCandidates();
  buildNav();render();
  toast((S._ecCandidates||[]).length+' contacts to review','ok')}

function dismissEcReview(idx){
  /* Find candidate by email from card data-attr (immune to index shifting after splices) */
  var card=gel('cr-card-'+idx);if(!card)return;
  var email=card.getAttribute('data-email');
  var c=email?(S._ecCandidates||[]).find(function(x){return x.email===email}):S._ecCandidates[idx];
  if(!c)return;
  var dismissed={};
  try{dismissed=JSON.parse(localStorage.getItem('tf_ecr_dismissed')||'{}')}catch(e){}
  dismissed[c.email]=1;
  localStorage.setItem('tf_ecr_dismissed',JSON.stringify(dismissed));
  var realIdx=S._ecCandidates.indexOf(c);
  if(realIdx>=0)S._ecCandidates.splice(realIdx,1);
  card.style.transition='opacity .2s,max-height .3s,margin .3s,padding .3s';
  card.style.opacity='0';card.style.maxHeight='0';card.style.marginBottom='0';card.style.padding='0';card.style.overflow='hidden';
  setTimeout(function(){card.remove();_crUpdateCount()},300);
  toast('Dismissed','ok')}


function _crModeChange(idx,mode){
  var ecWrap=gel('cr-ec-wrap-'+idx);
  var pcWrap=gel('cr-pc-wrap-'+idx);
  var cliWrap=gel('cr-cli-wrap-'+idx);
  if(mode==='ec'){
    if(ecWrap)ecWrap.style.display='';
    if(pcWrap)pcWrap.style.display='none';
    if(cliWrap)cliWrap.style.display=''}
  else if(mode==='prospect'){
    if(ecWrap)ecWrap.style.display='none';
    if(pcWrap)pcWrap.style.display='';
    if(cliWrap)cliWrap.style.display='none'}
  else{
    if(ecWrap)ecWrap.style.display='none';
    if(pcWrap)pcWrap.style.display='none';
    if(cliWrap)cliWrap.style.display=''}}

function _crClientAc(idx){
  var input=gel('cr-client-'+idx);
  var dd=gel('cr-client-ac-'+idx);
  if(!input||!dd)return;
  var q=(input.value||'').toLowerCase().trim();
  /* Clear hidden ID if typed text no longer matches selected client */
  var hidden=gel('cr-client-id-'+idx);
  if(hidden&&hidden.value){
    var selCr=(S.clientRecords||[]).find(function(r){return r.id===hidden.value});
    if(!selCr||selCr.name!==input.value)hidden.value=''}
  var matches=(S.clientRecords||[]).filter(function(cr){
    return !q||cr.name.toLowerCase().indexOf(q)!==-1}).slice(0,8);
  if(!matches.length){dd.style.display='none';return}
  var h='';
  matches.forEach(function(cr){
    h+='<div onmousedown="TF._crClientSelect('+idx+',\''+escAttr(cr.id)+'\',\''+escAttr(cr.name)+'\')" style="padding:6px 10px;font-size:12px;cursor:pointer;color:var(--t1);border-bottom:1px solid var(--gborder)" onmouseover="this.style.background=\'var(--hover)\'" onmouseout="this.style.background=\'none\'">'+esc(cr.name)+'</div>'});
  dd.innerHTML=h;dd.style.display='';
  /* Close on blur after short delay (let mousedown fire first) */
  input.onblur=function(){setTimeout(function(){dd.style.display='none'},150)}}

function _crClientKey(idx,e){
  if(e.key!=='Enter')return;
  e.preventDefault();
  var input=gel('cr-client-'+idx);if(!input)return;
  var q=(input.value||'').toLowerCase().trim();
  var matches=(S.clientRecords||[]).filter(function(cr){
    return !q||cr.name.toLowerCase().indexOf(q)!==-1});
  if(matches.length===1){
    _crClientSelect(idx,matches[0].id,matches[0].name);
    _crSubmit(idx)}}

function _crClientSelect(idx,id,name){
  var input=gel('cr-client-'+idx);
  var hidden=gel('cr-client-id-'+idx);
  var dd=gel('cr-client-ac-'+idx);
  if(input)input.value=name;
  if(hidden)hidden.value=id;
  if(dd)dd.style.display='none';
  /* Update EC dropdown filtered by selected client */
  var ecSel=gel('cr-ec-'+idx);
  if(ecSel&&ecSel.tagName==='SELECT')ecSel.innerHTML=buildEndClientOptions('',name)}

function _crPcAc(idx){
  var input=gel('cr-pc-'+idx);
  var dd=gel('cr-pc-ac-'+idx);
  if(!input||!dd)return;
  var q=(input.value||'').toLowerCase().trim();
  /* Clear hidden ID if typed text no longer matches selected company */
  var hidden=gel('cr-pc-id-'+idx);
  if(hidden&&hidden.value){
    var selPc=(S.prospectCompanies||[]).find(function(pc){return pc.id===hidden.value});
    if(!selPc||selPc.name!==input.value)hidden.value=''}
  var matches=(S.prospectCompanies||[]).filter(function(pc){
    return !q||pc.name.toLowerCase().indexOf(q)!==-1}).slice(0,8);
  if(!matches.length&&q){
    /* Show "+ Create" option for new company */
    dd.innerHTML='<div onmousedown="TF._crPcCreate('+idx+')" style="padding:6px 10px;font-size:12px;cursor:pointer;color:var(--accent);border-bottom:1px solid var(--gborder)" onmouseover="this.style.background=\'var(--hover)\'" onmouseout="this.style.background=\'none\'">'+icon('plus',11)+' Create &ldquo;'+esc(q)+'&rdquo;</div>';
    dd.style.display='';
    input.onblur=function(){setTimeout(function(){dd.style.display='none'},150)};return}
  if(!matches.length){dd.style.display='none';return}
  var h='';
  matches.forEach(function(pc){
    h+='<div onmousedown="TF._crPcSelect('+idx+',\''+escAttr(pc.id)+'\',\''+escAttr(pc.name)+'\')" style="padding:6px 10px;font-size:12px;cursor:pointer;color:var(--t1);border-bottom:1px solid var(--gborder)" onmouseover="this.style.background=\'var(--hover)\'" onmouseout="this.style.background=\'none\'">'+esc(pc.name)+'</div>'});
  dd.innerHTML=h;dd.style.display='';
  input.onblur=function(){setTimeout(function(){dd.style.display='none'},150)}}

function _crPcKey(idx,e){
  if(e.key!=='Enter')return;
  e.preventDefault();
  var input=gel('cr-pc-'+idx);if(!input)return;
  var q=(input.value||'').toLowerCase().trim();
  var matches=(S.prospectCompanies||[]).filter(function(pc){
    return !q||pc.name.toLowerCase().indexOf(q)!==-1});
  if(matches.length===1){
    _crPcSelect(idx,matches[0].id,matches[0].name);
    _crSubmit(idx)}}

function _crPcSelect(idx,id,name){
  var input=gel('cr-pc-'+idx);
  var hidden=gel('cr-pc-id-'+idx);
  var dd=gel('cr-pc-ac-'+idx);
  if(input)input.value=name;
  if(hidden)hidden.value=id;
  if(dd)dd.style.display='none'}

async function _crPcCreate(idx){
  var input=gel('cr-pc-'+idx);if(!input)return;
  var name=input.value.trim();if(!name)return;
  var pc=await ensureProspectCompanyExists(name);
  if(pc)_crPcSelect(idx,pc.id,pc.name)}

async function _crSubmit(idx){
  /* Find candidate by email from card data-attr (immune to index shifting after splices) */
  var card=gel('cr-card-'+idx);
  if(!card)return;
  var email=card.getAttribute('data-email');
  var c=email?(S._ecCandidates||[]).find(function(x){return x.email===email}):S._ecCandidates[idx];
  if(!c)return;
  /* Disable button immediately to prevent double-clicks */
  var btns=card.querySelectorAll('button');
  btns.forEach(function(b){b.disabled=true});
  var mode=document.querySelector('input[name="cr-mode-'+idx+'"]:checked');
  var modeVal=mode?mode.value:'client';
  var uid=await getUserId();if(!uid)return;
  var parts=(c.name||'').split(' ');

  if(modeVal==='prospect'){
    /* ── PROSPECT MODE ── */
    var pcHidden=gel('cr-pc-id-'+idx);
    var pcInput=gel('cr-pc-'+idx);
    var pcId=pcHidden?pcHidden.value:null;
    /* If typed a name but didn't select from dropdown, ensure company exists */
    if(!pcId&&pcInput){
      var pcName=(pcInput.value||'').trim();
      if(pcName){var pcRec=await ensureProspectCompanyExists(pcName);if(pcRec)pcId=pcRec.id}}
    /* Insert into prospects table */
    var pRow={user_id:uid,prospect_company_id:pcId,first_name:parts[0]||'',last_name:parts.slice(1).join(' ')||'',
      email:c.email||'',phone:'',role:'',linkedin_url:'',source:'contact_review',notes:'',status:'active'};
    var pRes=await _sb.from('prospects').insert(pRow).select().single();
    if(pRes.error){toast('Failed: '+pRes.error.message,'warn');btns.forEach(function(b){b.disabled=false});return}
    S.prospects.push({id:pRes.data.id,prospectCompanyId:pcId,firstName:parts[0]||'',lastName:parts.slice(1).join(' ')||'',
      email:c.email||'',phone:'',role:'',linkedinUrl:'',source:'contact_review',notes:'',status:'active',lastContactedAt:null,createdAt:''});
    /* Animate removal */
    var _ri=S._ecCandidates.indexOf(c);if(_ri>=0)S._ecCandidates.splice(_ri,1);
    card.style.transition='opacity .2s,max-height .3s,margin .3s,padding .3s';
    card.style.opacity='0';card.style.maxHeight='0';card.style.marginBottom='0';card.style.padding='0';card.style.overflow='hidden';
    setTimeout(function(){card.remove();_crUpdateCount()},300);
    var pcLabel=pcId?prospectCompanyNameById(pcId):'';
    toast('Added as prospect'+(pcLabel?' for '+pcLabel:''),'ok');
    /* Batch-add same-domain candidates */
    setTimeout(function(){_crBatchDomain(c.email,'prospect',null,null,null,null,pcId,uid)},350);
    return}

  /* ── CLIENT / END-CLIENT MODE ── */
  var isEC=modeVal==='ec';
  var cliHidden=gel('cr-client-id-'+idx);
  var selectedClientId=cliHidden?cliHidden.value:c.clientId;
  var cr=S.clientRecords.find(function(r){return r.id===selectedClientId});
  var selectedClientName=cr?cr.name:'';
  var ecName='',ecId=null;
  if(isEC){
    var ecSel=gel('cr-ec-'+idx);
    var ecRaw=ecSel?ecSel.value:'';
    if(ecSel&&ecSel.tagName==='INPUT')ecRaw=ecSel.value.trim();
    if(!ecRaw||ecRaw==='__addnew__'){toast('Select an end client','warn');btns.forEach(function(b){b.disabled=false});return}
    ecId=resolveEndClientId(ecRaw)||null;
    ecName=ecId?endClientNameById(ecId):ecRaw;
    /* If new EC name, ensure record exists (fast — checks S.endClients first) */
    if(!ecId){var ecRec=await ensureEndClientExists(ecName,selectedClientName);if(ecRec)ecId=ecRec.id}}
  /* Build contact row and insert directly — skip loadContacts/render */
  var row={user_id:uid,client_id:selectedClientId||null,first_name:parts[0]||'',last_name:parts.slice(1).join(' ')||'',
    email:c.email||'',role:'',phone:'',company:'',website:'',status:'active',
    end_client:ecName,end_client_id:ecId};
  var res=await _sb.from('contacts').insert(row).select().single();
  if(res.error){toast('Failed: '+res.error.message,'warn');btns.forEach(function(b){b.disabled=false});return}
  /* Update local state without full reload */
  S.contacts.push({id:res.data.id,clientId:selectedClientId,firstName:parts[0]||'',lastName:parts.slice(1).join(' ')||'',
    email:c.email||'',role:'',phone:'',company:'',website:'',status:'active',endClient:ecName,endClientId:ecId});
  /* Remove card from DOM with animation */
  var _ri=S._ecCandidates.indexOf(c);if(_ri>=0)S._ecCandidates.splice(_ri,1);
  card.style.transition='opacity .2s,max-height .3s,margin .3s,padding .3s';
  card.style.opacity='0';card.style.maxHeight='0';card.style.marginBottom='0';card.style.padding='0';card.style.overflow='hidden';
  setTimeout(function(){card.remove();_crUpdateCount()},300);
  toast(isEC?'Linked to '+ecName:'Added for '+selectedClientName,'ok');
  /* Batch-add same-domain candidates — pass values directly, no closure delay */
  var _batchMode=modeVal,_batchCli=selectedClientId,_batchCliName=selectedClientName,_batchEcId=ecId,_batchEcName=ecName;
  setTimeout(function(){_crBatchDomain(c.email,_batchMode,_batchCli,_batchCliName,_batchEcId,_batchEcName,null,uid)},350);
  /* Rebuild domain map in background */
  setTimeout(function(){_buildDomainMap()},500)}

async function _crBatchDomain(triggerEmail,mode,clientId,clientName,ecId,ecName,pcId,uid){
  var domain=triggerEmail.split('@')[1];
  if(!domain||_FREE_DOMAINS[domain])return;
  /* Find remaining candidates with the same domain */
  var same=(S._ecCandidates||[]).filter(function(c){return c.email.split('@')[1]===domain});
  if(!same.length)return;
  var count=0;
  for(var i=0;i<same.length;i++){
    var c=same[i];
    var parts=(c.name||'').split(' ');
    if(mode==='prospect'){
      var pRow={user_id:uid,prospect_company_id:pcId||null,first_name:parts[0]||'',last_name:parts.slice(1).join(' ')||'',
        email:c.email||'',phone:'',role:'',linkedin_url:'',source:'contact_review',notes:'',status:'active'};
      var pRes=await _sb.from('prospects').insert(pRow).select().single();
      if(pRes.error)continue;
      S.prospects.push({id:pRes.data.id,prospectCompanyId:pcId||null,firstName:parts[0]||'',lastName:parts.slice(1).join(' ')||'',
        email:c.email||'',phone:'',role:'',linkedinUrl:'',source:'contact_review',notes:'',status:'active',lastContactedAt:null,createdAt:''});
    }else{
      var row={user_id:uid,client_id:clientId||null,first_name:parts[0]||'',last_name:parts.slice(1).join(' ')||'',
        email:c.email||'',role:'',phone:'',company:'',website:'',status:'active',
        end_client:ecName||'',end_client_id:ecId||null};
      var res=await _sb.from('contacts').insert(row).select().single();
      if(res.error)continue;
      S.contacts.push({id:res.data.id,clientId:clientId,firstName:parts[0]||'',lastName:parts.slice(1).join(' ')||'',
        email:c.email||'',role:'',phone:'',company:'',website:'',status:'active',endClient:ecName||'',endClientId:ecId||null});
    }
    /* Remove from candidates and animate card */
    var ri=S._ecCandidates.indexOf(c);if(ri>=0)S._ecCandidates.splice(ri,1);
    var card=document.querySelector('[data-email="'+c.email+'"]');
    if(card){card.style.transition='opacity .2s,max-height .3s,margin .3s,padding .3s';
      card.style.opacity='0';card.style.maxHeight='0';card.style.marginBottom='0';card.style.padding='0';card.style.overflow='hidden';
      (function(el){setTimeout(function(){el.remove()},300)})(card)}
    count++}
  if(count){_crUpdateCount();
    var label;
    if(mode==='prospect')label=prospectCompanyNameById(pcId)||domain;
    else if(mode==='ec'&&ecName)label=ecName+' ('+clientName+')';
    else label=clientName||domain;
    toast('+'+count+' more from @'+domain+' added to '+label,'ok')}}

function _crUpdateCount(){
  var cnt=(S._ecCandidates||[]).length;
  var el=gel('cr-count');if(el)el.textContent='('+cnt+')';
  buildNav()}

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
  else if(S.finFilter==='matched')fp=fp.filter(function(p){return(p.status==='matched'||p.status==='split')&&p.type!=='transfer'});
  else if(S.finFilter==='expenses')fp=fp.filter(function(p){return p.direction==='outflow'&&p.type!=='transfer'});
  if(S.finDirection)fp=fp.filter(function(p){return p.direction===S.finDirection});
  if(S.finSearch){var q=S.finSearch.toLowerCase();
    fp=fp.filter(function(p){return(p.payerEmail||'').toLowerCase().indexOf(q)!==-1||(p.payerName||'').toLowerCase().indexOf(q)!==-1||(p.description||'').toLowerCase().indexOf(q)!==-1||(p.notes||'').toLowerCase().indexOf(q)!==-1})}
  return fp}
function setFinSearch(v){S.finSearch=v;clearTimeout(S._finSearchTmr);S._finSearchTmr=setTimeout(function(){render();var si=gel('fin-search');if(si){si.focus();si.selectionStart=si.selectionEnd=si.value.length}},250)}
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
  _flushEmailTimer();  /* Log email time when navigating away */
  if(isMobile()){var mobIds=['mob-add','tasks','mob-review','opportunities'];if(mobIds.indexOf(id)===-1)id='mob-add'}
  S.view=id;
  if(hasSubs(id)){S.subView=sub||getDefaultSub(id)}else{S.subView=''}
  save();
  document.querySelectorAll('.s-item').forEach(function(n){
    n.classList.toggle('on',n.dataset.v===id)});
  render();closeMenu()}
function buildNav(){var h='';
  SECTIONS.forEach(function(sec){
    var badge='';
    if(sec.id==='tasks'){var _ib=S.tasks.filter(function(t){return t.isInbox}).length+S.review.length;if(_ib)badge='<span class="nav-badge">'+_ib+'</span>'}
    if(sec.id==='email'&&S.gmailUnread>0){badge='<span class="nav-badge" style="background:#EA4335">'+S.gmailUnread+'</span>'}
    var isOn=sec.id===S.view;
    if(sec.soon){
      h+='<div class="s-item s-item-soon" data-v="'+sec.id+'">';
      h+='<span class="ico">'+icon(sec.icon)+'</span><span class="s-label">'+sec.label+'</span>';
      h+='<span class="s-right"><span class="s-soon-badge">Soon</span>';
      if(sec.kbd)h+='<span class="kbd">'+sec.kbd+'</span>';
      h+='</span></div>';
      return;
    }
    h+='<div class="s-item'+(isOn?' on':'')+'" data-v="'+sec.id+'" title="'+esc(sec.label)+'" onclick="TF.nav(\''+sec.id+'\')">';
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
        var badge='';if(mv.id==='tasks'){var _mib=S.tasks.filter(function(t){return t.isInbox}).length+S.review.length;if(_mib)badge='<span class="btm-badge" id="btm-badge">'+_mib+'</span>'}
        bh+='<button class="btm-tab'+(isOn?' on':'')+'" data-v="'+mv.id+'" onclick="TF.nav(\''+mv.id+'\')">';
        bh+='<span class="btm-ico">'+icon(mv.icon)+'</span><span class="btm-lbl">'+mv.label+'</span>'+badge+'</button>'});
      btmNav.innerHTML=bh;
    } else {
      btmNav.querySelectorAll('.btm-tab').forEach(function(tab){
        tab.classList.toggle('on',tab.dataset.v===S.view)});
      var btmBadge=gel('btm-badge');if(btmBadge){var _bib=S.tasks.filter(function(t){return t.isInbox}).length+S.review.length;btmBadge.textContent=_bib?_bib:''}
    }}}
function buildSubNav(sec){
  var el=gel('sub-nav');if(!el)return;
  var h='<div class="sub-nav-header"><span class="sub-nav-header-ico">'+icon(sec.icon,14)+'</span> '+sec.label+'</div>';
  var _smartDivShown=false;
  sec.subs.forEach(function(sub){
    /* Smart inbox divider */
    if(sub.smart&&!_smartDivShown){_smartDivShown=true;h+='<div class="sub-nav-divider"><span>Smart Inboxes</span></div>'}
    var isOn=S.subView===sub.id;
    h+='<div class="sub-nav-item'+(isOn?' on':'')+'" onclick="TF.subNav(\''+sub.id+'\')">';
    h+='<span class="ico">'+icon(sub.icon,14)+'</span>'+sub.label;
    if(sub.id==='inbox'){var _sib=S.tasks.filter(function(t){return t.isInbox}).length;if(_sib>0)h+='<span class="sub-badge">'+_sib+'</span>'}
    if(sub.id==='review'&&S.review.length>0)h+='<span class="sub-badge">'+S.review.length+'</span>';
    if(sub.id==='e-action'){var _ac=getActionRequiredCount();if(_ac>0)h+='<span class="sub-badge" style="background:#EA4335;color:#fff">'+_ac+'</span>'}
    if(sub.id==='e-drafts'){var _dc=getDraftCount();if(_dc>0)h+='<span class="sub-badge">'+_dc+'</span>'}
    if(sub.id==='e-scheduled'){var _sc2=(S.scheduledEmails||[]).filter(function(e){return e.status==='pending'}).length;if(_sc2>0)h+='<span class="sub-badge">'+_sc2+'</span>'}
    if(sub.id==='ec_review'){var _ecrc=(S._ecCandidates||[]).length;if(_ecrc>0)h+='<span class="sub-badge">'+_ecrc+'</span>'}
    /* Smart inbox badges */
    if(sub.smart&&sec.id==='email'){
      var _sc=_countSmartInbox(sub.id);
      if(_sc>0)h+='<span class="sub-badge">'+_sc+'</span>'}
    h+='</div>'});
  el.innerHTML=h;el.classList.add('open')}

function _countSmartInbox(subId){
  var threads=S.gmailThreads;if(!threads||!threads.length)return 0;
  var count=0;
  threads.forEach(function(t){
    /* Only count inbox threads (exclude archived) */
    if((t.labels||'').indexOf('INBOX')===-1)return;
    var ctx=getThreadCrmContext(t);if(!ctx)return;
    if(subId==='e-active')     {if(ctx.hasActiveClient)count++}
    else if(subId==='e-lapsed'){if(ctx.hasLapsedClient)count++}
    else if(subId==='e-prospects'){if(ctx.isProspect)count++}
    else if(subId==='e-campaigns'){if(ctx.hasCampaign)count++}
    else if(subId==='e-opportunities'){if(ctx.hasOpportunity)count++}
    else if(subId==='e-other'){if(!ctx.hasActiveClient&&!ctx.hasLapsedClient&&!ctx.isProspect&&!ctx.hasCampaign&&!ctx.hasOpportunity)count++}
  });
  return count}
function openMenu(){if(isMobile())return;gel('sidebar').classList.add('open');gel('mob-overlay').classList.add('on');
  var mt=document.querySelector('.btm-tab[data-v="more"]');if(mt)mt.classList.add('on')}
function closeMenu(){gel('sidebar').classList.remove('open');gel('mob-overlay').classList.remove('on');
  var btmNav=gel('btm-nav');if(btmNav){btmNav.querySelectorAll('.btm-tab').forEach(function(tab){tab.classList.toggle('on',tab.dataset.v===S.view)})}}
document.addEventListener('keydown',function(e){
  if(e.key==='Enter'&&!e.shiftKey){
    var modal=gel('modal');if(modal&&modal.classList.contains('on')){
      var isTextarea=e.target.tagName==='TEXTAREA';
      var isEditable=e.target.isContentEditable;
      var isComposeInput=e.target.classList.contains('compose-recipient-input');
      if(!isTextarea&&!isEditable&&!isComposeInput){
        e.preventDefault();
        var saveBtn=modal.querySelector('.btn-p');if(saveBtn)saveBtn.click();return}}}
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT'||e.target.isContentEditable)return;
  /* Skip all single-key shortcuts when a modal is open or on the email view */
  var _modal=gel('modal');var _detModal=gel('detail-modal');
  var _modalOpen=(_modal&&_modal.classList.contains('on'))||(_detModal&&_detModal.classList.contains('on'));
  var _inEmail=S.view==='email';
  var n=parseInt(e.key);if(!_modalOpen&&!_inEmail&&n>=0&&n<=9){var v=VIEWS_FLAT.find(function(vv){return vv.kbd===e.key&&!vv.soon});if(v)nav(v.id)}
  if(e.key==='Escape'){closeModal();closeCmdPalette();closeFocus()}
  if(!_modalOpen&&!_inEmail&&(e.key==='n'||e.key==='N')){if(isMobile())nav('mob-add');else openAddModal()}
  if(!_modalOpen&&!_inEmail&&(e.key==='s'||e.key==='S')){openDailySummary()}
  if(!_modalOpen&&!_inEmail&&e.key==='/'){e.preventDefault();setTimeout(function(){var si=document.querySelector('.fl-s');if(si)si.focus()},50)}
  if((e.ctrlKey||e.metaKey)&&e.key==='k'){e.preventDefault();openCmdPalette()}
  if((e.ctrlKey||e.metaKey)&&e.key==='b'&&S.view==='tasks'){e.preventDefault();toggleBulk()}
  if(!_modalOpen&&!_inEmail&&(e.key==='['||e.key===']')){var _sec=currentSection();if(_sec&&_sec.subs){var _idx=-1;_sec.subs.forEach(function(s,i){if(s.id===S.subView)_idx=i});if(_idx===-1)_idx=0;if(e.key===']')_idx=(_idx+1)%_sec.subs.length;else _idx=(_idx-1+_sec.subs.length)%_sec.subs.length;subNav(_sec.subs[_idx].id)}}});
/* Swipe to close sidebar */
(function(){var ov=gel('mob-overlay'),sx=0;if(!ov)return;
  ov.addEventListener('touchstart',function(e){sx=e.touches[0].clientX},{passive:true});
  ov.addEventListener('touchmove',function(e){if(e.touches[0].clientX-sx<-50)closeMenu()},{passive:true})})();
