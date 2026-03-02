'use strict';

/* ═══════════ PUBLIC API ═══════════ */
window.TF={nav:nav,load:loadData,start:tmrStart,pause:tmrPause,done:tmrDone,addTask:addTask,quickAdd:quickAdd,openAddModal:openAddModal,
  openDetail:openDetail,saveDetail:saveDetail,markAlreadyCompleted:markAlreadyCompleted,closeModal:closeModal,confirmDelete:confirmDelete,doDelete:doDelete,
  openDoneDetail:openDoneDetail,saveDoneDetail:saveDoneDetail,confirmDeleteDone:confirmDeleteDone,doDeleteDone:doDeleteDone,
  approveReview:approveReview,approveFromModal:approveFromModal,approveAndStart:approveAndStart,openReviewDetail:openReviewDetail,openReviewAt:openReviewAt,dismissReview:dismissReview,dismissFromModal:dismissFromModal,reviewPrev:reviewPrev,reviewNext:reviewNext,
  filt:function(k,v){S.filters[k]=v;render()},filtSearch:function(v){S.filters.search=v;clearTimeout(S._searchTmr);S._searchTmr=setTimeout(function(){render();var si=document.querySelector('.fl-s');if(si){si.focus();si.selectionStart=si.selectionEnd=si.value.length}},250)},clearF:function(){S.filters={client:'',endClient:'',campaign:'',project:'',opportunity:'',cat:'',imp:'',type:'',search:'',dateFrom:'',dateTo:''};render()},
  filtNav:function(k,v){S.filters={client:'',endClient:'',campaign:'',project:'',opportunity:'',cat:'',imp:'',type:'',search:'',dateFrom:'',dateTo:''};S.filters[k]=v;nav('tasks')},
  toggle:function(k){S.collapsed[k]=!S.collapsed[k];save();render()},
  setLayout:function(ly){S.layout=ly;save();render()},dashPer:function(v){S.dashPeriod=parseInt(v);render()},
  setQaImp:function(v){qaImp=v;var pills=document.querySelectorAll('.qa-pill');pills.forEach(function(p){p.classList.toggle('on',p.textContent===v)})},
  setGroup:function(v){S.groupBy=v;save();render()},
  toggleBulk:toggleBulk,toggleSel:toggleSel,bulkComplete:bulkComplete,bulkSelectAll:bulkSelectAll,
  openTplForm:openTplForm,saveTpl:saveTpl,delTpl:delTpl,useTpl:useTpl,useSet:useSet,fillFromTemplate:fillFromTemplate,
  addAndStart:addAndStart,setTaskMode:setTaskMode,setDoneSort:setDoneSort,openMenu:openMenu,closeMenu:closeMenu,
  completeMeetingEnd:completeMeetingEnd,dismissMeetingEnd:dismissMeetingEnd,
  openLogMeetingModal:openLogMeetingModal,logMeeting:logMeeting,refreshLogMtgEC:refreshLogMtgEC,refreshLogMtgCp:refreshLogMtgCp,
  togglePin:togglePin,addLog:addLog,toggleCpStatus:toggleCpStatus,
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
  openCampaignDetail:openCampaignDetail,saveCampaign:saveCampaign,
  openAddCampaign:openAddCampaign,addCampaign:addCampaign,
  confirmDeleteCampaign:confirmDeleteCampaign,doDeleteCampaign:doDeleteCampaign,
  openAddPayment:openAddPayment,addPayment:addPayment,
  openAddCampaignMeeting:openAddCampaignMeeting,addCampaignMeeting:addCampaignMeeting,
  refreshAddEndClients:refreshAddEndClients,refreshAddCampaigns:refreshAddCampaigns,refreshDetailEndClients:refreshDetailEndClients,refreshDetailCampaigns:refreshDetailCampaigns,fillFromCampaign:fillFromCampaign,ecAddNew:ecAddNew,
  /* Projects */
  openProjectDetail:openProjectDetail,saveProject:saveProject,openAddProject:openAddProject,addProject:addProject,
  confirmDeleteProject:confirmDeleteProject,doDeleteProject:doDeleteProject,
  addPhaseToProject:addPhaseToProject,doAddPhase:doAddPhase,editPhaseInline:editPhaseInline,savePhase:savePhase,deletePhase:deletePhase,movePhase:movePhase,
  refreshAddPhases:refreshAddPhases,refreshDetailPhases:refreshDetailPhases,onProjectChange:onProjectChange,
  setProjView:function(v){S.projView=v;save();render()},
  /* Opportunities */
  openOpportunityDetail:openOpportunityDetail,saveOpportunity:saveOpportunity,
  openAddOpportunity:openAddOpportunity,addOpportunity:addOpportunity,
  confirmDeleteOpportunity:confirmDeleteOpportunity,doDeleteOpportunity:doDeleteOpportunity,
  convertOpportunity:convertOpportunity,closeAsLost:closeAsLost,
  setOpView:function(v){S.opView=v;save();render()},
  toggleOpShowClosed:function(){S.opShowClosed=!S.opShowClosed;save();render()},
  /* Finance */
  openFinancePaymentDetail:openFinancePaymentDetail,saveFinancePayment:saveFinancePayment,
  openAddFinancePayment:openAddFinancePayment,addFinancePayment:addFinancePayment,
  confirmDeleteFinancePayment:confirmDeleteFinancePayment,doDeleteFinancePayment:doDeleteFinancePayment,
  excludeFinancePayment:excludeFinancePayment,fpCatChange:fpCatChange,
  fpClientChange:fpClientChange,fpEndClientChange:fpEndClientChange,fpCampaignChange:fpCampaignChange,fpSelectAll:fpSelectAll,
  openSplitPayment:openSplitPayment,saveSplits:saveSplits,addSplitRow:addSplitRow,removeSplitRow:removeSplitRow,splitAmtChanged:splitAmtChanged,splitEcChanged:splitEcChanged,unsplitPayment:unsplitPayment,
  openAssociateModal:openAssociateModal,associatePayer:associatePayer,
  setFinFilter:setFinFilter,setFinSearch:setFinSearch,finToggleBulk:finToggleBulk,finToggleSel:finToggleSel,finSelectAllVisible:finSelectAllVisible,finDeselectAll:finDeselectAll,finBulkApply:finBulkApply,
  openEditClient:openEditClient,saveClient:saveClient,
  openAddClientModal:openAddClientModal,addNewClient:addNewClient,
  signOut:signOut,
  toast:toast,
  /* Mobile */
  mobAddTask:mobAddTask,
  mobAddAndStart:mobAddAndStart,
  setMobAddImp:function(v){mobAddImp=v;var pills=document.querySelectorAll('.mob-pill');pills.forEach(function(p){p.classList.toggle('on',p.textContent===v)});var sel=gel('f-imp');if(sel)sel.value=v},
  mobSearchTasks:function(v){clearTimeout(S._mobSearchTmr);S._mobSearchTmr=setTimeout(function(){var list=gel('mob-task-list');if(!list)return;var q=v.toLowerCase();list.querySelectorAll('.mob-task-row').forEach(function(row){var name=row.querySelector('.mob-task-name');if(!name)return;row.style.display=name.textContent.toLowerCase().indexOf(q)!==-1?'':'none'})},150)}};

/* ═══════════ AUTO-REFRESH ═══════════ */
var arTimer=null;
function startAutoRefresh(){if(arTimer)clearInterval(arTimer);arTimer=setInterval(function(){loadData()},1800000)}


/* ═══════════ INIT (with auth guard) ═══════════ */
(async function(){
  var sess=await _sb.auth.getSession();
  if(!sess.data.session){window.location.href='/login.html';return}
  restore();S.view=isMobile()?'mob-add':'today';buildNav();await loadData();startAutoRefresh();startMeetingCheck();
})();
