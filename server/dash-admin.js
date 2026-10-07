/* مناقصة — كود dashboard-admin.html (مفصول عشان يتخزّن في الجوال ويفتح أسرع) */

var API='https://manaqasati-production.up.railway.app';
var token=localStorage.getItem('token')||'';
var user=JSON.parse(localStorage.getItem('user')||'{}');
if(!token||user.role!=='admin'){location.href='/auth.html';}
window.addEventListener('pageshow',function(){ if(!localStorage.getItem('token'))location.replace('/auth.html'); });

var _allUsers=[],_roleFilter='all',_searchTerm='',_allReq=[],_reqFilter='all',_editReqId=null;
var _selUsers={};

function esc(s){var d=document.createElement('div');d.textContent=String(s||'');return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// روابط المستخدم: نسمح بس بـ http/https والمسارات الداخلية وصور data
function _safeUrl(u){u=String(u==null?'':u).trim();return /^(https?:\/\/|\/(?!\/)|data:image\/)/i.test(u)&&!/["'<>`\s]/.test(u)?u:'';}
function _jsa(s){return esc(JSON.stringify(String(s==null?'':s)));}
function fmtDate(d){if(!d)return'';try{return new Date(d).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return d;}}
function hdr(){return{headers:{'Content-Type':'application/json','Authorization':'Bearer '+token}};}
function isImg(s){return !!(s&&typeof s==='string'&&(s.startsWith('http')||s.startsWith('data:'))&&_safeUrl(s));}
function toggleSide(){document.getElementById('sidebar').classList.toggle('open');document.getElementById('backdrop').classList.toggle('show');}
function toast(msg,type){var t=document.createElement('div');t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9999;padding:12px 24px;border-radius:11px;font-size:13px;font-weight:700;color:#fff;font-family:Tajawal;box-shadow:0 8px 24px rgba(15,23,42,.2);background:'+(type==='error'?'#DC2626':type==='success'?'#059669':'#1e3a8a');t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.style.opacity='0';t.style.transition='.3s';setTimeout(function(){t.remove();},300);},2600);}
function spinner(){return '<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';}
function emptyState(msg){return '<div class="empty"><div class="empty-ic"><svg fill="none" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div><h4>'+msg+'</h4></div>';}

(function(){var n=user.name||'المدير';document.getElementById('adminName').textContent=n;document.getElementById('adminAv').textContent=n[0]||'م';
  var sn=document.getElementById('sideUserName'); if(sn)sn.textContent=n;
  var sav=document.getElementById('sideUserAv'); if(sav){ if(user.profile_image&&(user.profile_image.startsWith('http')||user.profile_image.startsWith('data:'))){sav.innerHTML='<img src="'+esc(_safeUrl(user.profile_image))+'">';}else{sav.textContent=n[0]||'م';} }
  var sr=document.getElementById('sideUserRole'); if(sr)sr.textContent=(user.email==='wled-111@hotmail.com')?'مالك المنصة':'مشرف';
})();

(function(){ fetch(API+'/api/categories').then(function(r){return r.json();}).then(function(d){
  if(!d||!Array.isArray(d.categories)||!d.categories.length)return;
  window._CATS=d.categories;
  var sel=document.getElementById('re-cat');
  if(sel){ sel.innerHTML='<option value="">اختر التصنيف</option>'+d.categories.map(function(c){return '<option>'+esc(c)+'</option>';}).join(''); }
  var bcs=document.getElementById('bc-specialty');
  if(bcs){ bcs.innerHTML='<option value="">كل التخصصات</option>'+d.categories.map(function(c){return '<option>'+esc(c)+'</option>';}).join(''); }
}).catch(function(){}); })();
// ═══ مجموعات القائمة: فتح/طي + مجموع الشارات ═══
function _navOpenSet(){try{return JSON.parse(localStorage.getItem('adm_nav_open')||'[]')||[];}catch(e){return [];}}
function _navSave(){try{var a=[];document.querySelectorAll('.nav .ng.open').forEach(function(g){a.push(g.getAttribute('data-g'));});localStorage.setItem('adm_nav_open',JSON.stringify(a));}catch(e){}}
function _navSet(g,open){if(!g)return;g.classList.toggle('open',!!open);var h=g.querySelector('.ng-h');if(h)h.setAttribute('aria-expanded',open?'true':'false');}
function _navTog(id){var g=document.querySelector('.nav .ng[data-g="'+id+'"]');if(!g)return;_navSet(g,!g.classList.contains('open'));_navSave();}
function _navOpenFor(el){var g=el&&el.closest?el.closest('.ng'):null;if(g&&!g.classList.contains('open')){_navSet(g,true);_navSave();}}
// مجموع أرقام الشارات الظاهرة داخل كل مجموعة
function _navSums(){
  document.querySelectorAll('.nav .ng').forEach(function(g){
    var sum=0;
    g.querySelectorAll('.ng-b .ni').forEach(function(n){
      if(n.style.display==='none')return;
      var b=n.querySelector('.ni-badge'); if(!b||b.style.display==='none')return;
      var v=parseInt((b.textContent||'').replace(/[^0-9]/g,''),10); if(v>0)sum+=v;
    });
    var e=g.querySelector('.ng-n'); if(e){e.textContent=sum;e.style.display=sum?'flex':'none';}
  });
}
// إخفاء المجموعة لو كل عناصرها مخفية بالصلاحيات
function _navGroupsVis(){
  document.querySelectorAll('.nav .ng').forEach(function(g){
    var any=false; g.querySelectorAll('.ng-b .ni').forEach(function(n){if(n.style.display!=='none')any=true;});
    g.style.display=any?'':'none';
  });
  _navSums();
}
(function(){
  var open=_navOpenSet();
  document.querySelectorAll('.nav .ng').forEach(function(g){if(open.indexOf(g.getAttribute('data-g'))>=0)_navSet(g,true);});
  var on=document.querySelector('.nav .ni.on'); if(on)_navOpenFor(on);
  _navSums();
  try{var mo=new MutationObserver(function(){_navSums();});document.querySelectorAll('.nav .ni-badge').forEach(function(b){mo.observe(b,{attributes:true,attributeFilter:['style'],childList:true,characterData:true,subtree:true});});}catch(e){setInterval(_navSums,3000);}
})();
// ═══ الصفحات المدموجة: كل مجموعة صفحة وحدة بتبويبات فوق ═══
var GRPS={mod:{l:'البلاغات والمحتوى',t:['reports','questions','reviews']},projects:{l:'المشاريع',t:['requests','closereasons']},bidsg:{l:'العروض',t:['bids','offerwatch','bids@prov','bidreasons']},saaig:{l:'السعي',t:['saai','claims','contactlog']},follow:{l:'المتابعة',t:['inbox','engagement','followup']},analyticsg:{l:'التحليلات',t:['analytics','marketing','appstats','ctstats','vstats']},outreachg:{l:'الاستقطاب',t:['outreach','agents']},syslog:{l:'سجل النظام',t:['logs','health']}};
var _PG2GRP={};Object.keys(GRPS).forEach(function(g){GRPS[g].t.forEach(function(t){var b=t.split('@')[0];if(!_PG2GRP[b])_PG2GRP[b]=g;});});
function _gtVisible(g){var bar=document.querySelector('#gtabsHost .gtabs[data-grp="'+g+'"]');if(!bar)return [];return [].filter.call(bar.querySelectorAll('.gt'),function(b){return b.style.display!=='none';}).map(function(b){return b.getAttribute('data-tab');});}
function showGroup(g){
  var vis=_gtVisible(g);if(!vis.length)return;
  var last=null;try{last=sessionStorage.getItem('adm_gt_'+g);}catch(e){}
  _gtGo(vis.indexOf(last)>=0?last:vis[0]);
}
function _gtGo(tab){
  var pg=tab.split('@')[0],v=tab.split('@')[1];
  if(pg==='bids'){ _bidView=(v==='prov')?'prov':'list'; }
  showPage(pg);
  if(pg==='bids'&&typeof renderBids==='function'&&window._allBids)renderBids();
  _gtSync(pg);
}
function _gtSync(pg){
  var g=_PG2GRP[pg];
  document.querySelectorAll('#gtabsHost .gtabs').forEach(function(b){b.style.display=(b.getAttribute('data-grp')===g)?'flex':'none';});
  if(!g)return;
  var key=(pg==='bids'&&_bidView==='prov')?'bids@prov':pg;
  document.querySelectorAll('#gtabsHost .gt').forEach(function(b){b.classList.toggle('on',b.parentNode.getAttribute('data-grp')===g&&b.getAttribute('data-tab')===key);});
  try{sessionStorage.setItem('adm_gt_'+g,key);}catch(e){}
}
function _grpSums(){
  Object.keys(GRPS).forEach(function(g){
    var sum=0,bar=document.querySelector('#gtabsHost .gtabs[data-grp="'+g+'"]');
    if(bar)bar.querySelectorAll('.gt').forEach(function(t){if(t.style.display==='none')return;var b=t.querySelector('.ni-badge');if(!b||b.style.display==='none')return;var v=parseInt((b.textContent||'').replace(/[^0-9]/g,''),10);if(v>0)sum+=v;});
    var e=document.getElementById('grp-'+g+'-badge');if(e){var t=sum>999?'999+':String(sum);if(e.textContent!==t)e.textContent=t;var d=sum?'flex':'none';if(e.style.display!==d)e.style.display=d;}
  });
}
function _gtGate(){
  document.querySelectorAll('#gtabsHost .gt').forEach(function(t){var perm=NAV_PERM[(t.getAttribute('data-tab')||'').split('@')[0]];t.style.display=(perm&&!permOK(perm))?'none':'';});
  document.querySelectorAll('.nav .ni[data-grp]').forEach(function(n){n.style.display=_gtVisible(n.getAttribute('data-grp')).length?'':'none';});
  _grpSums();
}
(function(){
  _grpSums();
  try{var mo=new MutationObserver(_grpSums);document.querySelectorAll('#gtabsHost .ni-badge').forEach(function(b){mo.observe(b,{attributes:true,attributeFilter:['style'],childList:true,characterData:true,subtree:true});});}catch(e){setInterval(_grpSums,3000);}
})();
function showPage(pg,el){
  var _g=_PG2GRP[pg]; if(_g){var _gb=document.querySelector('.nav .ni[data-grp="'+_g+'"]'); if(_gb)el=_gb;}
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');});
  if(pg!=='health' && typeof _healthTimer!=='undefined' && _healthTimer){clearInterval(_healthTimer);_healthTimer=null;}
  document.getElementById('page-'+pg).classList.add('on');
  document.querySelectorAll('.ni').forEach(function(n){n.classList.remove('on');});
  if(el)el.classList.add('on');
  if(el)_navOpenFor(el);
  var meta={vstats:['تفعيل البريد','مين فعّل وبأي طريقة — ومين علق وتحتاج تتابعه'],appstats:['التطبيق','كم واحد عنده التطبيق ومن وين ضغطوا «حمّل»'],ctstats:['عقود المقاولات','مين حمّل العقود — للتسويق'],dashboard:['لوحة المعلومات','نظرة عامة على المنصة'],users:['المستخدمون','إدارة العملاء والمزودين'],requests:['المشاريع','جميع المشاريع المنشورة'],projreview:['مراجعة المشاريع','اعتماد المشاريع الجديدة أو إعادتها للتعديل قبل النشر'],bids:['العروض','جميع العروض المقدّمة من المزودين'],questions:['الأسئلة','أسئلة وتوضيحات المنصة'],logs:['سجل النشاط','سجل إجراءات المدراء'],reviews:['التقييمات','تقييمات المستخدمين'],reports:['البلاغات','البلاغات المقدمة'],analytics:['التحليلات','إحصائيات وتقارير المنصة'],settings:['الإعدادات','إعدادات المنصة'],admins:['المشرفون','إدارة المشرفين والصلاحيات'],marketing:['التسويق','البكسلات وإحصائيات التسويق'],health:['صحة النظام','حالة الأنظمة الحيوية'],outreach:['الاستقطاب','صيد العملاء والمزودين وتتبّع التواصل'],followup:['متابعة العملاء','تذكير العملاء حسب مرحلة مشروعهم عبر واتساب'],claims:['المشاريع الموثّقة','مشاريع طلب المزوّد تأكيدها — وسعيها'],bidreasons:['ليش ما انختارت العروض؟','أسباب عدم اختيار العروض والفرص الثانية'],closereasons:['أسباب إغلاق المشاريع','لماذا يغلق العملاء مشاريعهم — لكشف التسريب وتحسين المنصة'],agents:['المناديب','المناديب وعمولاتهم على المشاريع'],inbox:['رسائل العملاء','ردود العملاء على رسائلك في مكان واحد'],saai:['سداد السعي','اعتماد سداد عمولة المزوّدين'],offerwatch:['تحتاج قرارك','عروض معلّقة قبل النشر · بلاغات العملاء · الرصد التلقائي'],engagement:['متابعة التفاعل','من وصله عرض/رسالة ولم يفتحها، مع تنبيه يدوي'],contactlog:['سجل التواصل','سجل فتح أرقام العملاء للمزوّدين — حماية العمولة']};
  document.getElementById('pageTitle').textContent=_g?GRPS[_g].l:meta[pg][0];
  _gtSync(pg);
  document.getElementById('pageSub').textContent=meta[pg][1];
  if(document.getElementById('sidebar').classList.contains('open'))toggleSide();
  if(pg==='dashboard'){loadDashboard();}
  if(pg==='analytics')loadAnalytics();
  // مؤجّلة: لو فتحت الصفحة مباشرة من الرابط (#ctstats) تنفّذ قبل تعريف إعدادات الفترة
  if(pg==='appstats')setTimeout(function(){_perMini('per-app');_loadAppStats();},0);
  if(pg==='ctstats')setTimeout(function(){_perMini('per-ct');_loadCtStats();},0);
  if(pg==='vstats')setTimeout(function(){_perMini('per-vs');_loadVStats();},0);
  if(pg==='inbox')loadInbox();
  if(pg==='saai')loadSaaiAdmin();
  if(pg==='settings')loadSettings();
  if(pg==='marketing')loadMarketing();
  if(pg==='outreach')loadOutreach();
  if(pg==='health')loadHealth();
  if(pg==='followup')loadFollowups();
  if(pg==='closereasons')loadCloseReasons();
  if(pg==='bidreasons')loadBidReasons();
  if(pg==='claims')loadClaims();
  if(pg==='admins')loadAdmins();
  if(pg==='bids')loadBids();
  if(pg==='logs')loadLogs();
  if(pg==='users')loadUsers();
  if(pg==='requests')loadRequests();
  if(pg==='projreview')loadProjReview();
  if(pg==='offerwatch')loadOfferWatch();
  if(pg==='engagement')loadEngagement();
  if(pg==='contactlog')loadContactLog();
  if(pg==='agents')loadAgents();
  if(pg==='reviews')loadReviews();
  if(pg==='questions')loadQuestions();
  if(pg==='reports')loadReports();
  if(!window._skipHash){var _cur=(location.hash||'').replace('#','').split('?')[0];if(_cur!==pg){history.replaceState(null,'','#'+pg);}}
}
function logout(){
  try{
    Object.keys(localStorage).forEach(function(k){ if(k!=='theme')localStorage.removeItem(k); });
    if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage)window.ReactNativeWebView.postMessage(JSON.stringify({type:'AUTH_LOGOUT'}));
  }catch(e){}
  location.replace('/auth.html');
}
function closeModal(id){document.getElementById(id).classList.remove('show');}


// شبكة الكوكبة الحيّة (هوية مناقصة)
function _phmc(v,icon,num,label,delta){
  var d=parseInt(delta)||0;
  var dh=d>0?'<div class="ph-md">▲ +'+d+' هذا الأسبوع</div>':'';
  return '<div class="ph-mc"><div class="ph-mi '+v+'"><svg width="17" height="17" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">'+icon+'</svg></div><div class="ph-mn">'+(num||0)+'</div><div class="ph-ml">'+label+'</div>'+dh+'</div>';
}
function _dashStChip(st){
  var m={open:['مفتوح','var(--green)','var(--green-l)'],in_progress:['جارٍ','var(--p)','var(--p-light)'],completed:['مكتمل','var(--star)','var(--gold-l)'],done:['مكتمل','var(--star)','var(--gold-l)'],pending_review:['مراجعة','var(--amber)','var(--amber-l)'],review:['مراجعة','var(--amber)','var(--amber-l)'],needs_edit:['مطلوب تعديل','#c2410e','#ffedd5'],rejected:['مرفوض','var(--red)','#fee2e2']};
  var x=m[st]||['—','var(--muted)','var(--bg)'];
  return '<span style="font-size:10.5px;font-weight:800;padding:4px 10px;border-radius:20px;background:'+x[2]+';color:'+x[1]+'">'+x[0]+'</span>';
}
function _drTime(s){ try{ return new Date(s).toLocaleTimeString('ar-SA-u-nu-latn-ca-gregory',{hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } }
function _drToggle(key){
  var box=document.getElementById('dr-detail'); if(!box)return;
  document.querySelectorAll('[data-drkey]').forEach(function(c){ c.setAttribute('data-on','0'); c.style.borderColor='var(--border)'; });
  if(box.getAttribute('data-open')===key){ box.innerHTML=''; box.removeAttribute('data-open'); return; }
  box.setAttribute('data-open',key);
  var active=document.querySelector('[data-drkey="'+key+'"]'); if(active){ active.setAttribute('data-on','1'); active.style.borderColor=(active.querySelector('div')||{}).style.color||'var(--p)'; }
  var list=((window._drLists||{})[key])||[];
  if(!list.length){ box.innerHTML='<div style="background:var(--bg);border:1px dashed var(--border);border-radius:12px;padding:16px;text-align:center;font-size:12.5px;color:var(--muted)">لا يوجد شيء اليوم في هذا القسم</div>'; return; }
  var row=function(inner){ return '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border)">'+inner+'</div>'; };
  var html='<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden">';
  list.forEach(function(x){
    if(key==='projects') html+=row('<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800;color:var(--text)">'+esc(x.title||'—')+'</div><div style="font-size:11px;color:var(--muted);margin-top:2px">صاحبه: '+esc(x.owner||'—')+'</div></div><div style="font-size:11px;color:var(--muted)">'+_drTime(x.created_at)+'</div>');
    else if(key==='bids') html+=row('<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800;color:var(--text)">'+esc(x.provider||'—')+'</div><div style="font-size:11px;color:var(--muted);margin-top:2px">قدّم عرضاً على: '+esc(x.project||'—')+'</div></div><div style="font-size:11px;color:var(--muted)">'+_drTime(x.created_at)+'</div>');
    else if(key==='providers'||key==='clients') html+=row('<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800;color:var(--text)">'+esc(x.name||'—')+'</div><div style="font-size:11px;color:var(--muted);margin-top:2px" dir="ltr">'+esc(x.phone||'')+'</div></div><div style="font-size:11px;color:var(--muted)">'+_drTime(x.created_at)+'</div>');
    else if(key==='chats') html+=row('<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800;color:var(--text)">'+esc(x.sender||'—')+' <span style="color:var(--muted)">←</span> '+esc(x.receiver||'—')+'</div><div style="font-size:11px;color:var(--muted);margin-top:2px">على: '+esc(x.project||'—')+' · '+(x.msgs||1)+' رسالة</div></div><div style="font-size:11px;color:var(--muted)">'+_drTime(x.created_at)+'</div>');
  });
  html+='</div>';
  box.innerHTML=html;
}
var _ibClient=null, _ibName='';
var _SA={items:[],tab:'submitted',sum:{},monthly:[]};
function _saState(x){ if(x.status==='approved')return 'approved'; if(x.status==='submitted')return 'submitted'; if(x.status==='deferred')return 'deferred'; if(x.status==='cancelled')return 'cancelled'; return (x.age_days||0)>10?'overdue':'due'; }
function loadSaaiAdmin(){
  var box=document.getElementById('saai-list'); if(!box)return;
  box.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  fetch(API+'/api/admin/saai',hdr()).then(function(r){return r.json();}).then(function(d){
    d=d||{}; _SA.items=d.items||[]; _SA.sum=d.summary||{}; _SA.monthly=d.monthly||[];
    var sm=_SA.sum;
    var bd=document.getElementById('saai-badge'); var _bn=(sm.awaiting_n||0)+(sm.deferred_attn||0); if(bd){ if(_bn>0){bd.textContent=_bn;bd.style.display='flex';}else bd.style.display='none'; }
    if(!sm.awaiting_n && _SA.tab==='submitted') _SA.tab = sm.overdue_n?'overdue':(sm.due_n?'due':'all');
    var coll=sm.collected_month||0, dueAll=(sm.due||0)+(sm.overdue||0), pct=(coll+dueAll)>0?Math.round(coll/(coll+dueAll)*100):0;
    var comp=sm.c90_total?Math.round(sm.c90_ok/sm.c90_total*100):null;
    var el=document.getElementById('saai-sum');
    if(el) el.innerHTML='<div class="kp">'
      +'<div><span class="l">محصّل هذا الشهر</span><span class="n" style="color:#15803d">'+fmtNum(coll)+' <small>ر.س</small></span><div class="bar"><i style="width:'+pct+'%;background:#16a34a"></i></div><span class="s">'+pct+'% من المستحق</span></div>'
      +'<div class="'+(sm.awaiting_n?'blu':'')+'"><span class="l">بانتظار اعتمادك</span><span class="n" style="color:#1d4ed8">'+(sm.awaiting_n||0)+' <small>· '+fmtNum(sm.awaiting||0)+' ر.س</small></span><span class="s" style="color:#1d4ed8">'+(sm.awaiting_n?'إيصالات مرفوعة':'ما فيه شي')+'</span></div>'
      +'<div class="'+(sm.due_n?'amb':'')+'"><span class="l">مستحق في المهلة</span><span class="n" style="color:#b45309">'+(sm.due_n||0)+' <small>· '+fmtNum(sm.due||0)+' ر.س</small></span><span class="s">خلال 10 أيام من القبول</span></div>'
      +'<div class="'+(sm.overdue_n?'red':'')+'"><span class="l">متأخر</span><span class="n" style="color:'+(sm.overdue_n?'#dc2626':'var(--text)')+'">'+(sm.overdue_n||0)+' <small>· '+fmtNum(sm.overdue||0)+' ر.س</small></span><span class="s" style="color:'+(sm.overdue_n?'#dc2626':'')+'">'+(sm.overdue_n?'أقدمها '+sm.oldest_days+' يوم':'ما فيه متأخرين')+'</span></div>'
      +'<div><span class="l">نسبة الالتزام</span><span class="n">'+(comp==null?'—':comp+'%')+'</span><span class="s">سدّدوا خلال المهلة · 90 يوم</span></div>'
      +'</div>';
    var rb=document.getElementById('sa-remind-all'); if(rb){ rb.textContent='تذكير كل المتأخرين'+(sm.overdue_n?' ('+sm.overdue_n+')':''); rb.disabled=!sm.overdue_n; rb.style.opacity=sm.overdue_n?'1':'.5'; }
    _saRender(); _saSide();
  }).catch(function(){ box.innerHTML='<div style="text-align:center;color:var(--red);padding:20px">تعذّر التحميل</div>'; });
}
async function _saDefer(id,act){
  var T={approve_defer:['اعتماد التأجيل','السعي يتوقف لين موعد التأجيل ويوصل المزوّد إشعار.','اعتمد'],resume:['رجّعه مستحق','السعي يرجع مستحق بمهلته الأصلية ويوصل المزوّد إشعار.','رجّعه'],cancel:['إلغاء السعي','ينلغى السعي على هالمشروع نهائياً ويوصل المزوّد إشعار.','ألغِ السعي']}[act];
  if(!await askConfirm({title:T[0],message:T[1],confirmText:T[2]}))return;
  fetch(API+'/api/admin/saai/'+id+'/defer-action',Object.assign({method:'POST',body:JSON.stringify({action:act})},hdr())).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(x){ if(!x.ok){toast((x.d&&x.d.message)||'تعذّر','error');return;} toast((x.d&&x.d.message)||'تم','success'); loadSaaiAdmin(); })
    .catch(function(){toast('تعذّر الاتصال','error');});
}
function _saTab(t){ _SA.tab=t; _saRender(); }
function _saRender(){
  var box=document.getElementById('saai-list'); if(!box)return;
  var c={submitted:0,due:0,overdue:0,approved:0,deferred:0,cancelled:0}; _SA.items.forEach(function(x){c[_saState(x)]++;});
  var tabs=[['submitted','بانتظار الاعتماد'],['due','مستحق'],['overdue','متأخر'],['deferred','مؤجّل'],['approved','معتمد'],['cancelled','ملغي'],['all','الكل']];
  var tb=document.getElementById('sa-tabs');
  if(tb) tb.innerHTML=tabs.map(function(t){return '<button class="ftab'+(_SA.tab===t[0]?' on':'')+'" onclick="_saTab(\''+t[0]+'\')"'+(t[0]==='overdue'&&c.overdue?' style="color:#dc2626"':(t[0]==='deferred'&&_SA.items.some(function(x){return x.status==='deferred'&&(x.defer_state==='noreply'||x.defer_state==='await_admin');})?' style="color:#b45309"':''))+'>'+t[1]+(t[0]!=='all'?'<span class="fc">'+c[t[0]]+'</span>':'<span class="fc">'+_SA.items.length+'</span>')+'</button>';}).join('');
  var list=_SA.items.filter(function(x){return _SA.tab==='all'||_saState(x)===_SA.tab;});
  if(!list.length){ box.innerHTML='<div style="padding:30px">'+emptyState(_SA.tab==='submitted'?'ما فيه إيصالات تنتظر اعتمادك ✓':'لا يوجد شي هنا')+'</div>'; return; }
  var stPill=function(x){ var st=_saState(x), left=10-(x.age_days||0);
    if(st==='approved')return '<span class="pl" style="background:#e3f5e9;color:#166534">معتمد ✓</span>';
    if(st==='cancelled')return '<span class="pl" style="background:#f1f5f9;color:#64748b">ملغي'+(x.defer_state==='client_cancel'?' — العميل أكّد':(x.defer_state==='admin_cancel'?' — بقرارك':''))+'</span>';
    if(st==='deferred'){ var du=x.defer_until?new Date(x.defer_until).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short'}):'';
      var ds=x.defer_state, lbl=x.defer_kind==='cancel'?'يقول انلغى':'مؤجّل لـ '+du;
      if(ds==='confirmed')return '<span class="pl" style="background:#e0e7ff;color:#3730a3">⏸ '+lbl+'</span><div style="font-size:11px;color:#15803d;font-weight:800;margin-top:3px">✓ العميل أكّد</div>';
      if(ds==='await_admin')return '<span class="pl" style="background:#fef3c7;color:#92400e">تأجيل ثاني — ينتظرك</span><div style="font-size:11px;color:#15803d;font-weight:800;margin-top:3px">✓ العميل أكّد</div>';
      if(ds==='noreply')return '<span class="pl" style="background:#fef2f2;color:#b91c1c">'+lbl+'</span><div style="font-size:11px;color:#b91c1c;font-weight:800;margin-top:3px">العميل ما رد — قرّر</div>';
      return '<span class="pl" style="background:#fef9c3;color:#854d0e">'+lbl+'</span><div style="font-size:11px;color:var(--muted);font-weight:700;margin-top:3px">ننتظر تأكيد العميل</div>'; }
    if(x.defer_state==='conflict')return '<span class="pl" style="background:#fef2f2;color:#b91c1c">⚠️ تعارض</span><div style="font-size:11px;color:#b91c1c;font-weight:700;margin-top:3px;max-width:150px">المزوّد قال '+(x.defer_kind==='cancel'?'«انلغى»':'«أجّل»')+' والعميل قال '+(x.client_answer==='started'?'«بدأنا»':'«قائم»')+'</div>';
    if(st==='submitted')return '<span class="pl" style="background:#e6eeff;color:#1d4ed8">بانتظار الاعتماد</span>';
    if(st==='overdue')return '<span class="pl" style="background:#fef2f2;color:#b91c1c">متأخر '+((x.age_days||0)-10)+' يوم</span>';
    return '<span class="pl" style="background:#fef3c7;color:#92400e">'+(left<=0?'آخر يوم':'باقي '+left+(left===1?' يوم':(left===2?' يومين':' أيام')))+'</span>'; };
  box.innerHTML='<table class="sa-tbl"><thead><tr><th>المزوّد</th><th>المشروع</th><th>سعر العرض</th><th>مبلغ الاتفاق</th><th>السعي</th><th>الإيصال</th><th>الحالة</th><th></th></tr></thead><tbody>'+list.map(function(x){
    var offer=parseFloat(x.offer_price)||0, cv=parseFloat(x.contract_value)||0, unit=x.price_unit&&x.price_unit!=='total';
    var diff=(offer&&cv&&!unit)?cv-offer:0;
    var agreed=cv?'<b>'+fmtNum(cv)+'</b>'+(diff?'<div style="font-size:11.5px;font-weight:800;color:'+(diff<0?'#b45309':'#15803d')+'">عدّله '+(diff<0?'↓ ':'↑ ')+fmtNum(Math.abs(diff))+(function(){var lg=x.edits_log;try{if(typeof lg==='string')lg=JSON.parse(lg);}catch(e){lg=[];}var r=(Array.isArray(lg)?lg:[]).filter(function(e){return e&&e.reason;}).pop();return r?' · '+esc(r.reason):'';})()+'</div>':(x.status==='pending'?'<div style="font-size:11.5px;color:var(--muted)">تقديري من العرض</div>':'<div style="font-size:11.5px;color:var(--muted)">بدون تعديل</div>')):'<span style="color:#b45309;font-weight:800">لم يحدده بعد</span>';
    var proof=x.proof_url?(/\.(png|jpe?g|webp|gif)(\?|$)/i.test(x.proof_url)?'<a class="sa-proof" href="'+esc(_safeUrl(x.proof_url))+'" target="_blank" rel="noopener"><img src="'+esc(_safeUrl(x.proof_url))+'" alt="إيصال"></a>':'<a class="sa-proof" href="'+esc(_safeUrl(x.proof_url))+'" target="_blank" rel="noopener">PDF</a>'):'<span style="color:var(--muted)">—</span>';
    var ph=String(x.provider_phone||'').replace(/\D/g,''); if(ph.indexOf('05')===0)ph='966'+ph.slice(1);
    var _ed=(x.status!=='approved'&&x.request_id)?'<button class="act-btn ab-default" title="فتح المشروع وتعديل قيمة العقد" onclick="_saOpenProj('+x.request_id+',1)">✏️ تعديل</button>':'';
    var da='';
    var cph=String(x.client_phone||'').replace(/\D/g,''); if(cph.indexOf('05')===0)cph='966'+cph.slice(1);
    if(x.status==='deferred'||x.defer_state==='conflict'){
      var da='<div style="display:flex;gap:6px;flex-wrap:wrap">'
        +((x.status==='deferred'&&(x.defer_state==='noreply'||x.defer_state==='await_admin')&&x.defer_kind!=='cancel')?'<button class="act-btn" style="background:#3730a3;color:#fff;border-color:#3730a3" onclick="_saDefer('+x.id+',\'approve_defer\')">اعتمد التأجيل</button>':'')
        +(x.status==='deferred'?'<button class="act-btn ab-default" onclick="_saDefer('+x.id+',\'resume\')">رجّعه مستحق</button>':'')
        +((x.status==='deferred'&&x.defer_kind==='cancel')||x.defer_state==='conflict'||x.defer_state==='noreply'?'<button class="act-btn ab-default" style="color:#b91c1c;border-color:#fecaca" onclick="_saDefer('+x.id+',\'cancel\')">ألغِ السعي</button>':'')
        +(cph?'<a class="act-btn ab-default" style="color:#15803d;border-color:#a7f3d0" target="_blank" rel="noopener" href="https://wa.me/'+cph+'">واتساب العميل</a>':'')
        +(ph?'<a class="act-btn ab-default" style="color:#15803d;border-color:#a7f3d0" target="_blank" rel="noopener" href="https://wa.me/'+ph+'">واتساب المزوّد</a>':'')+'</div>';
    }
    var act=da?da:x.status==='submitted'?'<div style="display:flex;gap:6px"><button class="act-btn" style="background:#16a34a;color:#fff;border-color:#16a34a" onclick="approveSaai('+x.id+','+(x.source==='self'&&x.request_id&&!x.req_assigned?1:0)+')">'+(x.source==='self'&&x.request_id&&!x.req_assigned?'اعتماد + ترسية':'اعتماد')+'</button><button class="act-btn ab-default" onclick="_saReject('+x.id+')">رفض</button>'+_ed+'</div>'
      :(x.status==='pending'?'<div style="display:flex;gap:6px"><button class="act-btn ab-default" onclick="_saRemind(['+x.id+'])">تذكير</button>'+(ph?'<a class="act-btn ab-default" style="color:#15803d;border-color:#a7f3d0" target="_blank" rel="noopener" href="https://wa.me/'+ph+'">واتساب</a>':'')+_ed+'</div>':'');
    return '<tr><td><b><a class="pro-name" href="/pro/'+(parseInt(x.provider_id)||0)+'" target="_blank" rel="noopener" title="صفحته العامة">'+esc(x.provider_name||'مزوّد')+' ↗</a></b><div style="font-size:12px;color:var(--muted)">'+(x.provider_paid_n?'سدّد '+x.provider_paid_n+' مرات قبل':'أول سداد له')+'</div></td>'
      +'<td>'+(x.request_id?'<button type="button" class="sa-pj" onclick="_saOpenProj('+x.request_id+')">'+esc(x.project_title||'مشروع')+'</button>':'<b>'+esc(x.project_title||'مشروع')+'</b>')+'<div style="font-size:12px;color:var(--muted)">'+(x.request_id?'#'+x.request_id:'خارج القائمة')+(x.city?' · '+esc(x.city):'')+(x.source==='self'?' · <span style="color:#7c3aed;font-weight:800">سداد ذاتي</span>':'')+'</div>'+(x.self_reason?'<div style="font-size:11.5px;color:var(--text2);margin-top:3px">'+esc(x.self_reason)+'</div>':'')+'</td>'
      +'<td style="'+(diff?'color:var(--muted);text-decoration:line-through':'')+'">'+(offer?fmtNum(offer)+(unit?(x.price_unit==='meter'?'/متر':'/وحدة'):''):'—')+'</td>'
      +'<td>'+agreed+'</td><td><b style="font-size:15px">'+fmtNum(x.saai_amount)+'</b> ر.س</td><td>'+proof+'</td><td>'+stPill(x)+'</td><td>'+act+'</td></tr>'
      +(diff<0&&x.status==='submitted'?'<tr><td colspan="8" style="background:#fffbeb;color:#92400e;font-size:12.5px;font-weight:700">تنبيه: «'+esc(x.provider_name||'')+'» نزّل مبلغ الاتفاق من '+fmtNum(offer)+' إلى '+fmtNum(cv)+' — تأكد من العميل قبل الاعتماد لو شاك.</td></tr>':'');
  }).join('')+'</tbody></table>';
}
function _saSide(){
  var late=_SA.items.filter(function(x){return _saState(x)==='overdue';});
  var by={}; late.forEach(function(x){ var k=x.provider_id; if(!by[k])by[k]={name:x.provider_name,n:0,amt:0,days:0,phone:x.provider_phone,ids:[]}; by[k].n++; by[k].amt+=parseFloat(x.saai_amount)||0; by[k].days=Math.max(by[k].days,(x.age_days||0)-10); by[k].ids.push(x.id); });
  var arr=Object.keys(by).map(function(k){return by[k];}).sort(function(a,b){return b.days-a.days;}).slice(0,6);
  var el=document.getElementById('sa-late');
  if(el) el.innerHTML='<div class="ad-ch"><h3>أكثر المتأخرين</h3></div>'+(arr.length?arr.map(function(p){ var ph=String(p.phone||'').replace(/\D/g,''); if(ph.indexOf('05')===0)ph='966'+ph.slice(1);
      return '<div class="ad-row" style="cursor:default"><b>'+esc(p.name||'مزوّد')+'</b><span style="color:var(--muted);font-size:12.5px">'+(p.n===1?'مشروع':(p.n===2?'مشروعين':p.n+' مشاريع'))+' · '+fmtNum(p.amt)+' ر.س</span><span class="pl" style="background:#fef2f2;color:#b91c1c;margin-right:auto">'+p.days+' يوم</span><button class="act-btn ab-default" onclick="_saRemind(['+p.ids.join(',')+'])">تذكير</button>'+(ph?'<a class="act-btn" style="background:#25d366;color:#fff;border-color:#25d366" target="_blank" rel="noopener" href="https://wa.me/'+ph+'">واتساب</a>':'')+'</div>'; }).join(''):'<div style="font-size:13px;color:var(--muted);padding:10px 0">ما فيه متأخرين ✓</div>');
  var ch=document.getElementById('sa-chart'); var mx=Math.max.apply(null,_SA.monthly.map(function(m){return m.collected;}).concat([1]));
  var MN=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  if(ch) ch.innerHTML='<div class="ad-ch"><h3>المحصّل آخر 6 أشهر</h3></div><div class="sa-bars">'+_SA.monthly.map(function(m,i){ var last=i===_SA.monthly.length-1; return '<div title="'+fmtNum(m.collected)+' ر.س"><b style="font-size:11px;color:var(--muted)">'+(m.collected?fmtNum(m.collected):'')+'</b><i style="height:'+Math.max(3,Math.round(m.collected/mx*90))+'px;'+(last?'background:#1d4ed8':'')+'"></i><span'+(last?' style="color:#1d4ed8;font-weight:900"':'')+'>'+MN[(+m.month.split('-')[1])-1]+'</span></div>'; }).join('')+'</div>';
}
function _saReject(id){
  var reason=prompt('سبب رفض الإيصال (يوصل للمزوّد):','الإيصال غير واضح أو المبلغ غير مطابق');
  if(reason===null)return;
  fetch(API+'/api/admin/saai/'+id+'/reject',Object.assign({method:'POST',body:JSON.stringify({reason:reason})},hdr())).then(function(r){return r.json();}).then(function(d){ if(d&&d.ok){toast('رُفض الإيصال وبلّغنا المزوّد','success');loadSaaiAdmin();} else toast((d&&d.message)||'تعذّر','error'); }).catch(function(){toast('تعذّر الاتصال','error');});
}
function _saRemind(ids){
  var n=ids?ids.length:(_SA.sum.overdue_n||0); if(!n)return;
  if(!confirm(ids?'إرسال تذكير (إشعار + إيميل) لهذا المزوّد؟':'إرسال تذكير لكل المتأخرين ('+n+')؟'))return;
  fetch(API+'/api/admin/saai/remind',Object.assign({method:'POST',body:JSON.stringify(ids?{ids:ids}:{})},hdr())).then(function(r){return r.json();}).then(function(d){ toast(d&&d.ok?('أُرسل '+(d.sent||0)+' تذكير ✓'):((d&&d.message)||'تعذّر'), d&&d.ok?'success':'error'); }).catch(function(){toast('تعذّر الاتصال','error');});
}
function _saExport(){
  var rows=[['المزوّد','المشروع','رقم المشروع','المدينة','سعر العرض','مبلغ الاتفاق','السعي','الحالة','تاريخ القبول','تاريخ الإرسال','تاريخ الاعتماد']];
  var L={approved:'معتمد',submitted:'بانتظار الاعتماد',due:'مستحق',overdue:'متأخر'};
  _SA.items.forEach(function(x){ rows.push([x.provider_name||'',x.project_title||'',x.request_id,x.city||'',x.offer_price||'',x.contract_value||'',x.saai_amount||'',L[_saState(x)],(x.created_at||'').slice(0,10),(x.submitted_at||'').slice(0,10),(x.approved_at||'').slice(0,10)]); });
  var csv='﻿'+rows.map(function(r){return r.map(function(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}).join(',');}).join('\n');
  var a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download='saai-'+new Date().toISOString().slice(0,10)+'.csv'; document.body.appendChild(a); a.click(); a.remove();
}
function approveSaai(id,deal){
  if(!confirm(deal?'اعتماد السعي واعتبار المشروع «تمت الترسية» لهالمزوّد؟':'اعتماد استلام هذا السعي؟'))return;
  fetch(API+'/api/admin/saai/'+id+'/approve',Object.assign({method:'POST',body:JSON.stringify({mark_deal:!!deal})},hdr()))
    .then(function(r){return r.json();})
    .then(function(d){ if(d&&d.ok){ toast('تم الاعتماد','success'); loadSaaiAdmin(); } else toast((d&&d.message)||'تعذّر','error'); })
    .catch(function(){ toast('تعذّر الاتصال','error'); });
}
function loadInbox(){
  var box=document.getElementById('inbox-list'); if(!box)return;
  fetch(API+'/api/admin/inbox',hdr()).then(function(r){return r.json();}).then(function(list){
    if(!list.length){ box.innerHTML='<div style="text-align:center;padding:30px;color:var(--muted);font-size:13px">لا توجد رسائل بعد. أرسل رسالة لعميل من صفحة «المستخدمون».</div>'; return; }
    var totalUnread=0;
    box.innerHTML=list.map(function(c){
      var un=c.unread||0; totalUnread+=un;
      var last=String(c.last_message||'').replace(/^\[\[qr:[^\]]*\]\]/,'📋 طلب عرض').slice(0,60);
      return '<div onclick="openInboxThread('+c.client_id+','+_jsa(c.client_name||'عميل')+')" style="display:flex;align-items:center;gap:12px;padding:13px 14px;border-bottom:1px solid var(--border);cursor:pointer">'
        +'<div style="width:42px;height:42px;border-radius:50%;background:var(--p);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0">'+esc(String(c.client_name||'؟').charAt(0))+'</div>'
        +'<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><div style="font-weight:800;font-size:14px;color:var(--text)">'+esc(c.client_name||'عميل')+'</div><div style="font-size:10.5px;color:var(--muted)">'+_ibTime(c.last_time)+'</div></div><div style="font-size:12px;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(last)+'</div></div>'
        +(un?'<div style="background:#dc2626;color:#fff;font-size:11px;font-weight:800;min-width:20px;height:20px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0">'+un+'</div>':'')
      +'</div>';
    }).join('');
    var bd=document.getElementById('inbox-badge');
    if(bd){ if(totalUnread>0){bd.textContent=totalUnread;bd.style.display='flex';}else bd.style.display='none'; }
  }).catch(function(){ box.innerHTML='<div style="text-align:center;padding:20px;color:var(--red)">تعذّر التحميل</div>'; });
}
function _ibTime(s){ try{ return new Date(s).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short'}); }catch(e){ return ''; } }
function openInboxThread(cid,name){
  _ibClient=cid; _ibName=name||'';
  document.getElementById('ib-name').textContent=name||'محادثة';
  document.getElementById('ib-reply').value='';
  var t=document.getElementById('ib-thread'); t.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  document.getElementById('inboxModal').classList.add('show');
  fetch(API+'/api/admin/inbox/'+cid,hdr()).then(function(r){return r.json();}).then(function(msgs){
    if(!msgs.length){ t.innerHTML='<div style="text-align:center;color:var(--muted);font-size:12.5px;padding:16px">لا رسائل</div>'; return; }
    t.innerHTML=msgs.map(function(m){
      var mine=(m.mine===true||m.mine==='t');
      return '<div style="align-self:'+(mine?'flex-start':'flex-end')+';max-width:80%;background:'+(mine?'var(--p)':'var(--bg)')+';color:'+(mine?'#fff':'var(--text)')+';border:1px solid '+(mine?'var(--p)':'var(--border)')+';border-radius:13px;padding:9px 13px;font-size:13.5px;line-height:1.6">'+esc(m.content)+'<div style="font-size:9.5px;opacity:.6;margin-top:3px">'+(mine?'أنت (الإدارة)':name)+'</div></div>';
    }).join('');
    t.scrollTop=t.scrollHeight;
    loadInbox(); // تحديث عدّاد غير المقروء
  }).catch(function(){ t.innerHTML='<div style="text-align:center;color:var(--red);padding:16px">تعذّر التحميل</div>'; });
}
function sendInboxReply(){
  if(!_ibClient)return;
  var ta=document.getElementById('ib-reply'), content=ta.value.trim();
  if(!content){toast('اكتب ردّك','error');return;}
  var btn=document.getElementById('ib-send'); btn.disabled=true; btn.textContent='...';
  fetch(API+'/api/admin/message-client',Object.assign({method:'POST',body:JSON.stringify({client_id:_ibClient,content:content,email:false})},hdr()))
    .then(function(r){return r.json();})
    .then(function(d){ if(d&&d.ok){ ta.value=''; openInboxThread(_ibClient,_ibName); } else toast((d&&d.message)||'تعذّر','error'); })
    .catch(function(){toast('تعذّر الإرسال','error');})
    .finally(function(){btn.disabled=false;btn.textContent='إرسال';});
}
function loadDailyReport(){
  var box=document.getElementById('daily-report'); if(!box)return;
  fetch(API+'/api/admin/daily-report',hdr()).then(function(r){return r.json();}).then(function(d){
    var t=d.today||{}, p=d.pending||{}, f=d.followup||{};
    window._drLists=d.lists||{};
    var chip=function(key,label,val,color){ return '<div onclick="_drToggle(\''+key+'\')" style="flex:1;min-width:100px;cursor:pointer;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px;text-align:center;transition:border-color .15s" onmouseover="this.style.borderColor=\''+color+'\'" onmouseout="if(this.getAttribute(\'data-on\')!==\'1\')this.style.borderColor=\'var(--border)\'" data-drkey="'+key+'"><div style="font-size:23px;font-weight:900;color:'+(color||'var(--p)')+';line-height:1">'+val+'</div><div style="font-size:11.5px;color:var(--muted);margin-top:4px">'+label+' ▾</div></div>'; };
    var h='<div class="card card-accent" style="margin-bottom:16px"><div class="card-head"><h3>📅 تقرير اليوم</h3><span style="font-size:11px;color:var(--muted)">'+new Date().toLocaleDateString('ar-SA-u-nu-latn-ca-gregory')+'</span></div><div style="padding:14px">';
    h+='<div style="font-size:12px;font-weight:800;color:var(--muted);margin-bottom:9px">نشاط اليوم <span style="font-weight:600;color:var(--muted)">— اضغط الرقم لعرض التفاصيل</span></div>';
    h+='<div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:10px">'
      +chip('projects','مشاريع جديدة',t.projects||0,'#2563eb')+chip('bids','عروض جديدة',t.bids||0,'#059669')
      +chip('providers','مزودون جدد',t.providers||0,'#7c3aed')+chip('clients','عملاء جدد',t.clients||0,'#d97706')
      +chip('chats','محادثات اليوم',t.chats||0,'#0891b2')+'</div>';
    h+='<div id="dr-detail" style="margin-bottom:16px"></div>';
    h+='<div style="font-size:12px;font-weight:800;color:var(--muted);margin-bottom:9px">نظرة على المشاريع</div>';
    h+='<div style="display:flex;gap:9px;flex-wrap:wrap">';
    var pr=(p.review||0);
    h+='<div onclick="_niGo(\'requests\')" style="flex:1;min-width:130px;cursor:pointer;background:'+(pr>0?'#fef3c7':'var(--card)')+';border:1px solid '+(pr>0?'#fcd34d':'var(--border)')+';border-radius:14px;padding:13px 15px;box-shadow:0 1px 3px rgba(15,23,42,.05);transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 16px rgba(15,23,42,.09)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 1px 3px rgba(15,23,42,.05)\'"><div style="font-size:22px;font-weight:900;color:#b45309;line-height:1">'+pr+'</div><div style="font-size:11.5px;color:var(--muted);margin-top:5px">مشاريع بانتظار المراجعة</div></div>';
    var ft=(f.total||0);
    h+='<div onclick="showPage(\'followup\',[].filter.call(document.querySelectorAll(\'.ni\'),function(x){return /متابعة العملاء/.test(x.textContent);})[0])" style="flex:1;min-width:130px;cursor:pointer;background:'+(ft>0?'#dbeafe':'var(--card)')+';border:1px solid '+(ft>0?'#93c5fd':'var(--border)')+';border-radius:14px;padding:13px 15px;box-shadow:0 1px 3px rgba(15,23,42,.05);transition:transform .15s,box-shadow .15s" onmouseover="this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'0 6px 16px rgba(15,23,42,.09)\'" onmouseout="this.style.transform=\'\';this.style.boxShadow=\'0 1px 3px rgba(15,23,42,.05)\'"><div style="font-size:22px;font-weight:900;color:#1d4ed8;line-height:1">'+ft+'</div><div style="font-size:11.5px;color:var(--muted);margin-top:5px">عملاء ينتظرون متابعة ←</div></div>';
    h+='<div style="flex:1;min-width:130px;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:13px 15px;box-shadow:0 1px 3px rgba(15,23,42,.05)"><div style="font-size:22px;font-weight:900;color:var(--text);line-height:1">'+(p.open||0)+'</div><div style="font-size:11.5px;color:var(--muted);margin-top:5px">مشاريع مفتوحة للعروض</div></div>';
    h+='</div></div></div>';
    box.innerHTML=h;
  }).catch(function(){ box.innerHTML=''; });
}
function fmtNum(n){return Math.round(Number(n)||0).toLocaleString('en-US');}
function _adIcon(p){return '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';}
function _adAgo(d){ if(!d)return ''; var s=Math.floor((Date.now()-new Date(d))/1000); if(s<60)return 'الآن'; var m=Math.floor(s/60); if(m<60)return 'قبل '+m+' د'; var h=Math.floor(m/60); if(h<24)return 'قبل '+h+' س'; var dd=Math.floor(h/24); if(dd===1)return 'أمس'; if(dd<30)return 'قبل '+dd+' يوم'; return new Date(d).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short'}); }
function _adTrend(t,y,unitTxt){ if(!y&&!t)return '<div class="ad-kt">لا نشاط أمس</div>'; if(!y)return '<div class="ad-kt up">▲ جديد اليوم</div>'; var d=Math.round((t-y)/y*100); return '<div class="ad-kt '+(d>=0?'up':'dn')+'">'+(d>=0?'▲ ':'▼ ')+Math.abs(d)+'% عن أمس</div>'; }
function _adSpark(arr,color){ var mx=Math.max.apply(null,arr.concat([1])); var pts=arr.map(function(v,i){return Math.round(i*(120/Math.max(1,arr.length-1)))+','+Math.round(28-v/mx*24);}).join(' '); return '<svg viewBox="0 0 120 30" preserveAspectRatio="none" style="width:100%;height:30px"><polyline points="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/></svg>'; }
function loadDashboard(){
  var hero=document.getElementById('dash-hero');
  if(hero){
    var firstName=((document.getElementById('adminName')||document.getElementById('sideUserName')||{}).textContent||'').trim().split(' ')[0]||'';
    var hr=new Date().getHours();
    hero.innerHTML='<div class="ad-hi"><div><small>'+new Date().toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{weekday:'long',day:'numeric',month:'long'})+'</small><h2>'+(hr<12?'صباح الخير':'مساء الخير')+(firstName?'، '+esc(firstName):'')+'</h2><div class="ad-hi-n" id="ad-needs-hi"></div></div><button class="ftab" title="يوصلك كل يوم الساعة 8 صباحاً" onclick="_digestTest(this)">📧 جرّب الملخص الصباحي</button></div>';
  }
  fetch(API+'/api/admin/overview',hdr()).then(function(r){return r.json();}).then(function(o){
    if(!o||!o.kpi){ var kp=document.getElementById('dash-kpis'); if(kp)kp.innerHTML=emptyState('تعذر تحميل الإحصائيات'); return; }
    window._overview=o; _renderDash(o); try{_perRender();_loadVisits();_loadAppStats();_loadCtStats();}catch(e){}
  }).catch(function(){ var kp=document.getElementById('dash-kpis'); if(kp)kp.innerHTML=emptyState('تعذر تحميل الإحصائيات'); });
  fetch(API+'/api/admin/reports',hdr()).then(function(r){return r.json();}).then(function(reps){
    var pending=Array.isArray(reps)?reps.filter(function(r){return r.status==='pending'||!r.status;}).length:0;
    _loadFresh();
  }).catch(function(){});
}
function _digestTest(b){ b.disabled=true; fetch(API+'/api/admin/digest/test',Object.assign({method:'POST'},hdr())).then(function(r){return r.json();}).then(function(d){ toast(d&&d.ok?'أُرسل الملخص لإيميلك ✓':'تعذّر الإرسال', d&&d.ok?'success':'error'); }).catch(function(){toast('تعذّر الإرسال','error');}).finally(function(){b.disabled=false;}); }
function _adFunnel(f,lbl){
  var fnl=document.getElementById('dash-funnel'); if(!fnl||!f)return;
  var P=f.published||0, steps=[['نُشر',P,'#1e3a8a',null],['جاه عرض',f.got_bid||0,'#1d4ed8',P],['تمت الترسية',f.awarded||0,'#0891b2',f.got_bid||0],['اكتمل',f.completed||0,'#16a34a',f.awarded||0],['سدّد السعي',f.saai_paid||0,'#f59e0b',f.awarded||0]];
  var worst=null; for(var i=1;i<4;i++){ var a=steps[i-1][1], b=steps[i][1]; if(a>0){ var r=b/a; if(!worst||r<worst.r)worst={r:r,from:steps[i-1][0],to:steps[i][0]}; } }
  fnl.innerHTML='<div class="ad-ch"><h3>مسار المشاريع</h3><span class="ad-fp">'+esc(lbl)+'</span></div>'+(P?'<div class="ad-fn">'
    +steps.map(function(x){ var w=Math.max(8,Math.round(x[1]/P*100)); var cp=(x[3]!=null&&x[3]>0)?Math.round(x[1]/x[3]*100)+'%':''; return '<div class="ad-fr"><div class="ad-fb" style="width:'+w+'%;background:'+x[2]+'">'+x[0]+' '+x[1]+'</div>'+(cp?'<span class="ad-fp">'+cp+'</span>':'')+'</div>'; }).join('')
    +'</div>'+(worst&&P>=3?'<div class="ad-note">أكبر تسرّب: من «'+worst.from+'» إلى «'+worst.to+'» — '+Math.round(worst.r*100)+'% بس يكملون.</div>':''):'<div style="color:var(--muted);font-size:13px;padding:18px 0">ما نُشر مشاريع في هالفترة.</div>');
}
function _renderDash(o){
  var n=o.needs||{}, k=o.kpi||{}, f=o.funnel||{}, sa=o.saai||{}, cv=o.cover||{}, fr=o.fresh||null;
  // شارات القائمة
  (function(){var b=document.getElementById('projreview-badge');if(b){b.textContent=n.review||0;b.style.display=n.review?'flex':'none';}})();
  (function(){var b=document.getElementById('saai-badge');if(b&&n.saai_submitted!=null){b.textContent=n.saai_submitted||0;b.style.display=n.saai_submitted?'flex':'none';}})();
  if(window.loadOwBadge)loadOwBadge(); if(window.loadEngBadge)loadEngBadge();
  // يحتاج إجراء
  var q=[];
  var st=n.storage||{};
  [['قاعدة البيانات',st.dbPct],['تخزين الملفات',st.r2Pct]].forEach(function(x){ var p=parseFloat(x[1])||0; if(p>=70) q.push({c:p>=85?'red':'org',t:x[0]+' ممتلئة',s:'راجع صفحة صحة النظام',n:Math.round(p)+'%',pg:'health',ic:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.7-4 3-9 3s-9-1.3-9-3M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>'}); });
  // الترتيب حسب الأولوية: الأهم أول
  if(n.held_bids) q.push({c:'red',t:'عروض تنتظر مراجعتك',s:n.held_next_sec!=null?'أقربها ينعتمد تلقائياً '+_owLeft(n.held_next_sec).replace(/^باقي /,'بعد '):'',n:n.held_bids,pg:'offerwatch',ic:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',tab:'held',go:'راجع الآن'});
  if(n.review) q.push({c:'red',t:'مشاريع تنتظر المراجعة',s:n.review_oldest?'أقدمها '+_adAgo(n.review_oldest):'',n:n.review,pg:'projreview',go:'افتح المراجعة',ic:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'});
  var _brN=fr?fr.bid_report_providers:n.bid_report_providers; if(_brN) q.push({c:'org',t:'بلاغات عملاء على عروض',s:fr?'جديدة منذ آخر مرة فتحتها':'مزوّدين تحتاج قرارك',n:_brN,pg:'offerwatch',ic:'<path d="M4 21V4h11l-1 4h6v9h-9l1-4H4"/>',tab:'reports',seen:'bidrep'});
  var _rpN=fr?fr.reports:n.reports; if(_rpN) q.push({c:'amb',t:'بلاغات مفتوحة',s:fr?'جديدة منذ آخر مرة فتحتها':'تحتاج مراجعة وإجراء',n:_rpN,pg:'reports',seen:'reports',ic:'<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'});
  var _qN=fr?fr.questions:n.questions; if(_qN) q.push({c:'amb',t:'أسئلة بدون رد',s:fr?'جديدة منذ آخر مرة فتحتها':'عملاء ومزوّدون ينتظرون',n:_qN,pg:'questions',seen:'questions',ic:'<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>'});
  if(n.saai_submitted) q.push({c:'blu',t:'سداد ينتظر الاعتماد',s:fmtNum(n.saai_submitted_sum)+' ر.س',n:n.saai_submitted,pg:'saai',ic:'<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>'});
  if(n.inbox_unread) q.push({c:'blu',t:'رسائل عملاء بدون رد',s:'ردود العملاء على رسائلك',n:n.inbox_unread,pg:'inbox',ic:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>',go:'ردّ'});
  if(n.review_providers) q.push({c:'blu',t:'مزوّدين تحت المراجعة',s:'عروضهم تنتظر قرارك',n:n.review_providers,pg:'offerwatch',ic:'<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>',tab:'held'});
  if(n.close_help) q.push({c:'blu',t:'عملاء يبون مساعدة يلقون مزوّد',s:'قفلوا مشاريعهم «ما لقيت عرض مناسب» وطلبوا مساعدة',n:n.close_help,pg:'closereasons',ic:'<path d="M12 21s-7-4.5-9-9a5 5 0 019-3 5 5 0 019 3c-2 4.5-9 9-9 9z"/>',go:'تواصل'});
  if(n.ask_penalized) q.push({c:'org',t:'مزوّدين كثّروا طلبات الاعتماد',s:'3 «ما اتفقنا» خلال شهر — عروضهم نازلة 10 أيام',n:n.ask_penalized,pg:'bidreasons',ic:'<path d="M12 5v14M5 12l7 7 7-7"/>',go:'راجع'});
  if(n.claims_denied) q.push({c:'red',t:'عميل نفى تعامله مع مزوّد',s:'مزوّد طلب توثيق مشروع والعميل قال «ما تعاملت معه»',n:n.claims_denied,pg:'claims',ic:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>',go:'راجع'});
  var _fN=fr?fr.flags:n.flags; if(_fN) q.push({c:'org',t:'عروض مرصودة',s:((fr?fr.flag_providers:n.flag_providers)||0)+' مزوّد'+(fr?' · جديدة':''),n:_fN,seen:'flags',pg:'offerwatch',ic:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',tab:'auto'});
  if(fr&&fr.unver3) q.push({c:'blu',t:'ما فعّلوا بريدهم بعد 3 أيام',s:'وصلهم تذكير تلقائي وما فعّلوا — كلّمهم واتساب',n:fr.unver3,pg:'vstats',seen:'unver3',go:'تابعهم',ic:'<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/>'});
  if(fr){_FRESH=fr;_applyFresh();}
  var na=document.getElementById('needs-action');
  // سطر الترحيب: كم شي ينتظرك
  (function(){var tot=0;q.forEach(function(x){var v=Number(x.n);if(v>0)tot+=v;});var e=document.getElementById('ad-needs-hi');if(e)e.textContent=tot?'عندك '+tot+' شي ينتظرك':'ما فيه شي ينتظرك اليوم';})();
  if(na) na.innerHTML='<div class="ad-q">'+(q.length?q.map(function(x){return '<button class="ad-qc '+x.c+'" onclick="'+(x.seen?'_adSeen(\''+x.seen+'\');':'')+(x.tab?'_owCur=\''+x.tab+'\';':'')+'_niGo(\''+x.pg+'\')"><span class="ad-qi">'+_adIcon(x.ic)+'</span><span><div class="ad-qt">'+x.t+'</div><div class="ad-qs">'+esc(x.s||'')+'</div></span><span class="ad-qn">'+x.n+'</span><span class="ad-qgo">'+esc(x.go||'افتح')+'</span></button>';}).join(''):'<div class="ad-qc ok"><span class="ad-qi">'+_adIcon('<path d="M20 6L9 17l-5-5"/>')+'</span><span><div class="ad-qt">ما فيه شي ينتظرك</div><div class="ad-qs">كل المراجعات والبلاغات منتهية</div></span></div>')+'</div>';
  // المؤشرات
  var ser=o.series||[];
  var pc=cv.n?Math.round(cv.with_bids/cv.n*100):0;
  var coll=sa.collected_month||0, due=sa.due||0, collPct=(coll+due)>0?Math.round(coll/(coll+due)*100):0;
  var kp=document.getElementById('dash-kpis');
  if(kp) kp.innerHTML='<div class="ad-k">'
    +'<div class="ad-kc"><div class="ad-kl">مستخدمون جدد اليوم</div><div class="ad-kn">'+(k.users_t||0)+'</div>'+_adTrend(k.users_t||0,k.users_y||0)+_adSpark(ser.map(function(x){return x.users;}),'#1d4ed8')+'</div>'
    +'<div class="ad-kc"><div class="ad-kl">مشاريع اليوم</div><div class="ad-kn">'+(k.req_t||0)+'</div>'+_adTrend(k.req_t||0,k.req_y||0)+_adSpark(ser.map(function(x){return x.requests;}),'#d97706')+'</div>'
    +'<div class="ad-kc"><div class="ad-kl">عروض اليوم</div><div class="ad-kn">'+(k.bids_t||0)+'</div>'+_adTrend(k.bids_t||0,k.bids_y||0)+_adSpark(ser.map(function(x){return x.bids;}),'#16a34a')+'</div>'
    +'<div class="ad-kc go" role="button" tabindex="0" onclick="_niGo(\'requests\')"><div class="ad-kl">مشاريع جاها عرض</div><div class="ad-kn" style="color:#15803d">'+pc+'%</div><div class="ad-kt">'+(cv.with_bids||0)+' من '+(cv.n||0)+' · آخر 30 يوم</div><div class="ad-kbar"><i style="width:'+pc+'%;background:#16a34a"></i></div></div>'
    +'<div class="ad-kc"><div class="ad-kl">سعي محصّل هذا الشهر</div><div class="ad-kn">'+fmtNum(coll)+' <small>ر.س</small></div><div class="ad-kt" style="color:#b45309">'+fmtNum(due)+' ر.س مستحق'+(sa.due_n?' · '+sa.due_n+' مشروع':'')+'</div><div class="ad-kbar"><i style="width:'+collPct+'%;background:#f59e0b"></i></div></div>'
    +'</div>';
  // مسار المشاريع
  _adFunnel(f,'آخر 30 يوم');
  // يحدث الآن
  var fd=document.getElementById('dash-feed');
  if(fd){
    var FL={outside_region:'عرض خارج المنطقة',spam_speed:'عروض سريعة متتالية',contact_share:'رقم تواصل في العرض'};
    var rows=(o.feed||[]).map(function(x){
      var dot={request:'#1d4ed8',bid:'#16a34a',award:'#f59e0b',flag:'#dc2626'}[x.k]||'#94a3b8', t='';
      if(x.k==='request') t='<b>'+esc(x.who)+'</b> نشر مشروع «'+esc(x.what)+'»';
      else if(x.k==='bid') t='<b>'+esc(x.who)+'</b> قدّم عرض '+fmtNum(x.amount)+' ر.س'+(x.unit&&x.unit!=='total'?(x.unit==='meter'?' للمتر':' للوحدة'):'')+' على «'+esc(x.what)+'»';
      else if(x.k==='award') t='<b>'+esc(x.who)+'</b> اختار «'+esc(x.what)+'»';
      else t='رصد: '+esc(FL[x.what]||x.what||'مخالفة')+' — <b>'+esc(x.who)+'</b>';
      return '<div class="ad-row" onclick="gsOpenReq('+(x.rid||0)+')"><i class="ad-dot" style="background:'+dot+'"></i><span style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+t+'</span><span class="t">'+_adAgo(x.at)+'</span></div>';
    }).join('');
    fd.innerHTML='<div class="ad-ch"><h3>يحدث الآن</h3><span class="ad-live"><i class="ad-dot" style="background:#16a34a"></i>آخر النشاط</span></div>'+(rows||'<div style="color:var(--muted);font-size:13px;padding:14px 0">لا يوجد نشاط بعد</div>');
  }
  // أحدث المستخدمين
  var ru=document.getElementById('recent-users');
  if(ru){
    var ur=(o.recent||[]).map(function(u){
      var nm=u.business_name||u.name||'—';
      var sub=(u.role==='provider'?'مزوّد':'عميل')+(u.city?' · '+esc(u.city):'')+(u.role==='provider'&&u.profile_pct!=null?' · ملفه '+u.profile_pct+'%':'');
      return '<div class="ad-row" onclick="gsOpenUser('+_jsa(u.email||'')+')"><span class="ad-av">'+(isImg(u.profile_image)?'<img src="'+esc(_safeUrl(u.profile_image))+'">':esc(nm.charAt(0)))+'</span><span style="min-width:0"><b>'+esc(nm)+'</b><div style="font-size:12px;color:'+(u.looks_prov?'#b45309;font-weight:800':'var(--muted)')+'">'+(u.looks_prov?'عميل · يبدو مزوّد ⚠︎':sub)+'</div></span><span class="t">'+_adAgo(u.created_at)+'</span></div>';
    }).join('');
    ru.innerHTML='<div class="ad-ch"><h3>أحدث المستخدمين</h3><button class="ftab" onclick="_niGo(\'users\')">عرض الكل</button></div>'+ur;
  }
}

// ═══ تقسيم الجداول لصفحات ═══
var _PG={u:{page:1,size:50,sig:''},r:{page:1,size:50,sig:''}};
try{ ['u','r'].forEach(function(k){ var v=parseInt(localStorage.getItem('adm_ps_'+k)); if(v>=0)_PG[k].size=v; }); }catch(e){}
function _pgSlice(key,list,sig){
  var P=_PG[key]; if(sig!==P.sig){ P.sig=sig; P.page=1; }
  var size=P.size||list.length||1, pages=Math.max(1,Math.ceil(list.length/size));
  if(P.page>pages)P.page=pages;
  var from=(P.page-1)*size; return list.slice(from, from+size);
}
function _pager(key,total){
  var P=_PG[key], size=P.size||total||1, pages=Math.max(1,Math.ceil(total/size)), cur=P.page;
  var from=total?((cur-1)*size+1):0, to=Math.min(total,cur*size);
  var nums=[], add=function(n){ nums.push('<button class="'+(n===cur?'on':'')+'" onclick="_pgGo(\''+key+'\','+n+')">'+n+'</button>'); };
  if(pages<=7){ for(var i=1;i<=pages;i++)add(i); }
  else{ add(1); if(cur>3)nums.push('<span>…</span>'); for(var j=Math.max(2,cur-1);j<=Math.min(pages-1,cur+1);j++)add(j); if(cur<pages-2)nums.push('<span>…</span>'); add(pages); }
  var opts=[50,100,200,500,0].map(function(v){return '<option value="'+v+'"'+(P.size===v?' selected':'')+'>'+(v?v:'الكل')+'</option>';}).join('');
  return '<div class="pgr"><div class="pgr-i">عرض <b>'+from+'–'+to+'</b> من <b>'+total.toLocaleString('en-US')+'</b></div>'
    +(pages>1?'<div class="pgr-n"><button '+(cur<=1?'disabled':'')+' onclick="_pgGo(\''+key+'\','+(cur-1)+')" aria-label="السابق">›</button>'+nums.join('')+'<button '+(cur>=pages?'disabled':'')+' onclick="_pgGo(\''+key+'\','+(cur+1)+')" aria-label="التالي">‹</button></div>':'<div class="pgr-n"></div>')
    +'<label class="pgr-s">عدد الصفوف <select onchange="_pgSize(\''+key+'\',this.value)">'+opts+'</select></label></div>';
}
function _pgRender(key){ if(key==='u')renderUsers(); else renderRequests(); var el=document.getElementById(key==='u'?'users-table':'requests-table'); if(el&&el.getBoundingClientRect().top<0)el.scrollIntoView({block:'start'}); }
function _pgGo(key,n){ _PG[key].page=n; _pgRender(key); }
function _pgSize(key,v){ _PG[key].size=parseInt(v)||0; _PG[key].page=1; try{localStorage.setItem('adm_ps_'+key,String(_PG[key].size));}catch(e){} _pgRender(key); }
function _uLooksProv(u){ return u.role==='client'&&!u.can_provide&&!!((u.business_name&&String(u.business_name).trim())||(u.bio&&String(u.bio).trim().length>=20)); }
function _uIdle(u){ if(u.role!=='provider')return false; var t=u.last_seen?new Date(u.last_seen).getTime():0; return !t || (Date.now()-t)>30*86400000; }
function _uPct(u){ if(u.role!=='provider')return null; var n=0; if(u.profile_image)n++; if((u.specialties||[]).length)n++; if(u.bio&&String(u.bio).trim())n++; if((parseInt(u.port_n)||0)>0)n++; if(u.experience_years)n++; return n*20; }
function _uSeen(u){ if(!u.last_seen)return '<span class="u-seen'+(u.role==='provider'?' idle':'')+'">ما دخل</span>'; var d=Math.floor((Date.now()-new Date(u.last_seen))/86400000); var t=d<=0?'اليوم':(d===1?'أمس':(d<30?'قبل '+d+' يوم':'قبل '+Math.floor(d/30)+' شهر')); return '<span class="u-seen'+(u.role==='provider'&&d>30?' idle':'')+'">'+t+'</span>'; }
function loadUsers(){
  fetch(API+'/api/admin/users',hdr()).then(function(r){return r.json();}).then(function(users){
    if(!Array.isArray(users)){document.getElementById('users-table').innerHTML=emptyState('تعذر التحميل');return;}
    _allUsers=users;fillUserFilters();applyUserFiltersFromHash();renderUsers();
  }).catch(function(){document.getElementById('users-table').innerHTML=emptyState('تعذر التحميل');});
}
function filterRole(role,el){_roleFilter=role;document.querySelectorAll('#page-users .ftab').forEach(function(t){t.classList.remove('on');});if(el)el.classList.add('on');renderUsers();}
// رقم الجوال بأي صيغة: 05… / 9665… / +966 / 00966 / أرقام عربية / مسافات → آخر الأرقام بدون مفتاح الدولة والصفر
function _phNorm(x){ x=String(x||'').replace(/[٠-٩]/g,function(d){return '٠١٢٣٤٥٦٧٨٩'.indexOf(d);}).replace(/[۰-۹]/g,function(d){return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d);}).replace(/\D/g,''); return x.replace(/^(00966|966|0)/,''); }
function filterUsers(){_searchTerm=document.getElementById('user-search').value.toLowerCase();renderUsers();}
function getFilteredUsers(){
  var ci=msVals('city');
  var sp=msVals('spec');
  var stt=(document.getElementById('uf-status')||{}).value||'';
  var bd=(document.getElementById('uf-badge')||{}).value||'';
  var ofr=(document.getElementById('uf-offers')||{}).value||'';
  return (_allUsers||[]).filter(function(u){
    if(u.role==='admin')return false;
    if(_roleFilter==='looksprov'){ if(!_uLooksProv(u))return false; }
    else if(_roleFilter==='idle'){ if(!_uIdle(u))return false; }
    else if(_roleFilter!=='all'&&u.role!==_roleFilter)return false;
    if(_searchTerm){ var _qd=_phNorm(_searchTerm); var _hit=(u.name||'').toLowerCase().includes(_searchTerm)||(u.email||'').toLowerCase().includes(_searchTerm)||(u.business_name||'').toLowerCase().includes(_searchTerm)||(_qd.length>=3&&_phNorm(u.phone).indexOf(_qd)>=0); if(!_hit)return false; }
    if(ci.length){ var _eff={}; ci.forEach(function(v){ if(v.indexOf('منطقة ')===0){(INV_REGIONS[v.slice(6)]||[]).forEach(function(c){_eff[c]=1;});} else _eff[v]=1; }); if(!_eff[u.city])return false; }
    if(sp.length){var _a=(u.specialties||[]).concat(u.notify_categories||[]);if(!sp.some(function(x){return _a.indexOf(x)>=0;}))return false;}
    if(stt==='active'&&!u.is_active)return false;
    if(stt==='banned'&&u.is_active)return false;
    if(bd){if(bd==='none'){if(u.badge&&u.badge!=='none')return false;}else if(u.badge!==bd)return false;}
    if(ofr){var _bc=parseInt(u.bid_count)||0; if(ofr==='has'&&_bc<1)return false; if(ofr==='none'&&_bc>0)return false;}
    return true;
  });
}
// ═══ رابط صفحة المزوّد العامة (تبويب جديد) ═══
var _PRO_IC='<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/></svg>';
function _proLink(pid,small){ if(!pid)return ''; return '<a class="act-btn ab-default pro-lnk" href="/pro/'+(parseInt(pid)||0)+'" target="_blank" rel="noopener"'+(small?' style="padding:6px 10px;font-size:11.5px"':'')+'>'+_PRO_IC+'صفحته <span aria-hidden="true">↗</span></a>'; }
function renderUsers(){
  syncUserFiltersToHash();
  var filtered=getFilteredUsers();
  var cnt=document.getElementById('uf-count');if(cnt)cnt.textContent=filtered.length+' نتيجة';
  var tbl=document.getElementById('users-table');
  if(!filtered.length){tbl.innerHTML=emptyState('لا يوجد مستخدمون مطابقون');updateSelBar();return;}
  var _total=filtered.length;
  var _sig=[_roleFilter,_searchTerm,msVals('city').join(','),msVals('spec').join(','),(document.getElementById('uf-status')||{}).value,(document.getElementById('uf-badge')||{}).value,(document.getElementById('uf-offers')||{}).value].join('|');
  filtered=_pgSlice('u',filtered,_sig);
  var allSel=filtered.every(function(u){return _selUsers[u.id];});
  tbl.innerHTML='<table><thead><tr>'
    +'<th style="width:34px"><input type="checkbox" class="uchk" '+(allSel?'checked':'')+' onclick="toggleSelectAll(this.checked)" title="تحديد كل المعروض"></th>'
    +'<th>المستخدم</th><th>الدور</th><th>المدينة</th><th>النشاط</th><th>اكتمال الملف</th><th>آخر ظهور</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>'+filtered.map(function(u){
    var activity=u.role==='provider'?(u.bid_count||0)+' عرض':(u.request_count||0)+' طلب';
    return '<tr>'
      +'<td><input type="checkbox" class="uchk" '+(_selUsers[u.id]?'checked':'')+' onclick="toggleUserSel('+u.id+',this.checked)"></td>'
      +'<td><div class="u-cell"><div class="u-av">'+(isImg(u.profile_image)?'<img src="'+esc(_safeUrl(u.profile_image))+'">':esc((u.name||'?')[0]))+'</div><div><div class="u-name">'+esc(u.name)+(_uLooksProv(u)?'<span class="u-lp">يبدو مزوّد</span>':'')+(u.tier&&u.tier!=='new'?' '+tierChip(u.tier)+(u.tier_locked?'<span title="مثبّت" style="color:var(--p);margin-right:2px"><svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24" style="vertical-align:middle"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg></span>':''):'')+(u.badge&&u.badge!=='none'?' '+badgeChip(u.badge):'')+'</div><div class="u-email">'+esc(u.email)+'</div></div></div></td>'
      +'<td><span class="badge b-'+u.role+'">'+(u.role==='client'?'عميل':'مزود')+'</span></td>'
      +'<td style="font-size:12.5px;color:var(--muted)">'+esc(u.city||'—')+'</td>'
      +'<td style="font-size:12.5px;color:var(--muted)">'+activity+'</td>'
      +'<td>'+(function(){var p=_uPct(u); if(p==null)return '<span style="color:var(--muted)">—</span>'; var c=p>=80?'#16a34a':(p>=50?'#f59e0b':'#dc2626'); return '<div class="u-pc"><div class="b"><i style="width:'+p+'%;background:'+c+'"></i></div><span>'+p+'%</span></div>';})()+'</td>'
      +'<td>'+_uSeen(u)+'</td>'
      +'<td><span class="status '+(u.is_active?'s-on':'s-off')+'">'+(u.is_active?'نشط':'محظور')+'</span></td>'
      +'<td><div style="display:flex;gap:6px">'+(u.role==='provider'?_proLink(u.id):'')+'<button class="act-btn ab-default" onclick="openUserView('+u.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>عرض</button><button class="act-btn ab-primary" onclick="openUserModal('+u.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>إدارة</button></div></td>'
    +'</tr>';
  }).join('')+'</tbody></table>'+_pager('u',_total);
  updateSelBar();
}
var _MS={};
function msSetup(key,labelAll,opts,cb){ _MS[key]={sel:(_MS[key]&&_MS[key].sel)||[],opts:opts||[],labelAll:labelAll,cb:cb}; msRender(key); }
function msRender(key){
  var m=_MS[key],panel=document.getElementById('ms-'+key+'-panel'); if(!m||!panel)return;
  var _q=(m.opts.length>12)?'<div style="position:sticky;top:-6px;background:var(--card,#fff);padding:2px 0 6px;z-index:1"><input class="ms-q" type="search" autocomplete="off" placeholder="ابحث… مثل: خف، الشرقية" style="width:100%;box-sizing:border-box;border:1.5px solid var(--border,#e2e8f0);border-radius:9px;padding:8px 10px;font-family:inherit;font-size:13px;outline:none"></div>':'';
  panel.innerHTML=_q+(m.opts.map(function(o,i){return '<label class="ms-item" data-n="'+esc(_msNorm(o))+'"><input type="checkbox" data-i="'+i+'"'+(m.sel.indexOf(o)>=0?' checked':'')+'><span>'+esc(o)+'</span></label>';}).join('')||'<div style="padding:8px;color:var(--muted);font-size:12px">لا خيارات</div>');
  var _qi=panel.querySelector('.ms-q'); if(_qi){ _qi.addEventListener('click',function(e){e.stopPropagation();}); _qi.addEventListener('input',function(){ var q=_msNorm(_qi.value).replace(/^ال/,''); panel.querySelectorAll('.ms-item').forEach(function(it){ var n=it.getAttribute('data-n'); it.style.display=(!q||n.indexOf(q)>=0)?'':'none'; }); }); }
  panel.querySelectorAll('input').forEach(function(inp){ inp.onchange=function(){ var o=m.opts[+inp.getAttribute('data-i')]; var k=m.sel.indexOf(o); if(inp.checked){if(k<0)m.sel.push(o);}else{if(k>=0)m.sel.splice(k,1);} msLabel(key); if(m.cb)m.cb(); }; });
  msLabel(key);
}
function msLabel(key){ var m=_MS[key],l=document.getElementById('ms-'+key+'-lbl'); if(m&&l)l.textContent=m.sel.length?(m.sel.length+' محدّد'):m.labelAll; }
function _msNorm(t){ return String(t||'').replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase(); }
function msToggle(key){ var p=document.getElementById('ms-'+key+'-panel'); if(!p)return; var open=p.style.display==='block'; document.querySelectorAll('.ms-panel').forEach(function(x){x.style.display='none';}); p.style.display=open?'none':'block'; if(!open){ var q=p.querySelector('.ms-q'); if(q){ q.value=''; q.dispatchEvent(new Event('input')); setTimeout(function(){try{q.focus();}catch(e){}},30); } } }
function msVals(key){ return (_MS[key]&&_MS[key].sel)||[]; }
function msClear(key){ if(_MS[key]){_MS[key].sel=[];msRender(key);} }
document.addEventListener('click',function(e){ if(!e.target.closest('.ms')){ document.querySelectorAll('.ms-panel').forEach(function(x){x.style.display='none';}); } });
function fillUserFilters(){
  var cityset={},specset={}, _isAr=function(x){return /[\u0600-\u06FF]/.test(x);};
  (_allUsers||[]).forEach(function(u){
    if(u.role==='admin')return;
    if(u.city)cityset[u.city]=1;
    (u.specialties||[]).concat(u.notify_categories||[]).forEach(function(sp){if(sp&&_isAr(sp))specset[sp]=1;});
  });
  var baseCities=['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الظهران','بريدة','عنيزة','الرس','حائل','تبوك','أبها','خميس مشيط','نجران','جازان','الطائف','ينبع','الأحساء','القطيف','الجبيل','عرعر','سكاكا','الباحة','القريات','رفحاء','حفر الباطن','الخرج','المجمعة','الزلفي','شقراء','الدوادمي','القويعية','وادي الدواسر','بيشة','محايل عسير','صبيا','أبو عريش','الليث','القنفذة','رابغ','ضباء','الوجه','تيماء','دومة الجندل','طريف','الأفلاج','حوطة بني تميم','عفيف','الغاط','ثادق','حريملاء','ضرماء','المزاحمية','رماح','الدرعية','الدلم','الحريق','السليل','مرات','ضرما','المذنب','البكيرية','البدائع','رياض الخبراء','عيون الجواء','الأسياح','النبهانية','الشماسية','ضرية','عقلة الصقور','الخبراء','خليص','الجموم','الكامل','تربة','رنية','أضم','بحرة','المويه','الخرمة','العلا','بدر','مهد الذهب','خيبر','الحناكية','العيص','المهد','الخفجي','رأس تنورة','بقيق','النعيرية','قرية العليا','صفوى','سيهات','العوامية','النماص','تثليث','سراة عبيدة','رجال ألمع','ظهران الجنوب','تنومة','بلقرن','أحد رفيدة','المجاردة','الحرجة','قيال','حقل','أملج','البدع','بقعاء','الغزالة','الشنان','السليمي','موقق','الشملي','العويقيلة','صامطة','أحد المسارحة','بيش','فيفاء','ضمد','الدرب','العارضة','الريث','الحرث','شرورة','حبونا','بدر الجنوب','يدمة','ثار','بلجرشي','المندق','المخواة','قلوة','العقيق','القرى','غامد الزناد','طبرجل','صوير'];
  var citySet2={}; baseCities.forEach(function(c){citySet2[c]=1;}); Object.keys(cityset).forEach(function(c){citySet2[c]=1;});
  var cityOpts=Object.keys(citySet2).sort(function(a,b){return a.localeCompare(b,'ar');});
  var regionOpts=Object.keys(INV_REGIONS).map(function(rg){return 'منطقة '+rg;});
  msSetup('city','كل المدن',regionOpts.concat(cityOpts),renderUsers);
  fetch(API+'/api/categories').then(function(r){return r.json();}).then(function(d){
    var canon=(d&&(d.categories||d))||[]; var set={}; canon.forEach(function(c){set[c]=1;}); Object.keys(specset).forEach(function(c){set[c]=1;});
    msSetup('spec','كل التخصصات',Object.keys(set).sort(function(a,b){return a.localeCompare(b,'ar');}),renderUsers);
  }).catch(function(){ msSetup('spec','كل التخصصات',Object.keys(specset).sort(),renderUsers); });
  var bSel=document.getElementById('uf-badge');
  if(bSel&&bSel.options.length<=1){(typeof BADGE_CATALOG!=='undefined'?BADGE_CATALOG:[]).forEach(function(b){var o=document.createElement('option');o.value=b.key;o.textContent=b.label;bSel.appendChild(o);});var no=document.createElement('option');no.value='none';no.textContent='بدون لقب';bSel.appendChild(no);}
}
function resetUserFilters(){msClear('city');msClear('spec');['uf-status','uf-badge','uf-offers'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});var srch=document.getElementById('user-search');if(srch)srch.value='';_searchTerm='';syncUserFiltersToHash();renderUsers();}
function applyUserFiltersFromHash(){
  var ps=_parseHashParams();
  [['status','uf-status'],['badge','uf-badge']].forEach(function(m){
    var e=document.getElementById(m[1]); if(e&&ps[m[0]]!=null){ e.value=ps[m[0]]; }
  });
  ['city','spec'].forEach(function(k){ if(ps[k]!=null&&_MS[k]){ String(ps[k]).split(',').forEach(function(x){ x=x.trim(); if(x&&_MS[k].opts.indexOf(x)<0)_MS[k].opts.push(x); if(x&&_MS[k].sel.indexOf(x)<0)_MS[k].sel.push(x); }); msRender(k); } });
  var srch=document.getElementById('user-search'); if(srch&&ps.q!=null){ srch.value=ps.q; _searchTerm=(ps.q||'').toLowerCase(); }
}
function syncUserFiltersToHash(){
  if(window._skipHash)return;
  var v=function(id){return (document.getElementById(id)||{}).value||'';};
  var parts=[];
  if(msVals('city').length)parts.push('city='+encodeURIComponent(msVals('city').join(',')));
  if(msVals('spec').length)parts.push('spec='+encodeURIComponent(msVals('spec').join(',')));
  if(v('uf-status'))parts.push('status='+encodeURIComponent(v('uf-status')));
  if(v('uf-badge'))parts.push('badge='+encodeURIComponent(v('uf-badge')));
  var q=((document.getElementById('user-search')||{}).value||'').trim();
  if(q)parts.push('q='+encodeURIComponent(q));
  var hash='#users'+(parts.length?'?'+parts.join('&'):'');
  if(location.hash!==hash){window._skipHash=true;history.replaceState(null,'',hash);window._skipHash=false;}
}
function toggleUserSel(id,on){if(on)_selUsers[id]=1;else delete _selUsers[id];updateSelBar();var h=document.querySelector('#users-table thead .uchk');if(h){var f=getFilteredUsers();h.checked=f.length>0&&f.every(function(u){return _selUsers[u.id];});}}
function toggleSelectAll(on){getFilteredUsers().forEach(function(u){if(on)_selUsers[u.id]=1;else delete _selUsers[u.id];});renderUsers();}
function clearUserSel(){_selUsers={};renderUsers();}
function updateSelBar(){var n=Object.keys(_selUsers).length;var bar=document.getElementById('sel-bar');var el=document.getElementById('sel-n');if(el)el.textContent=n;if(bar)bar.style.display=n?'flex':'none';}
var MSG_TEMPLATES=[
  {name:'لمن حمّل عقد',subject:'مشروعك جاهز؟ خذ عروض أسعار مجاناً',body:'مرحباً،\nشكراً لتحميلك عقد المقاولات من مناقصة. إذا مشروعك جاهز، انشره الحين واستقبل عروض أسعار من مقاولين ومزوّدين في مدينتك — مجاناً وبدون التزام.\nانشر مشروعك: manaqasa.com'},
  {name:'ترحيب',subject:'أهلاً بك في مناقصة',body:'مرحباً،\nيسعدنا انضمامك إلى منصة مناقصة. إذا احتجت أي مساعدة في استخدام المنصة، فريقنا جاهز لخدمتك.\nبالتوفيق!'},
  {name:'تذكير',subject:'تذكير من مناقصة',body:'مرحباً،\nنذكّرك بمتابعة حسابك على منصة مناقصة — قد تكون هناك فرص أو طلبات جديدة بانتظارك.\nنتمنى لك التوفيق.'},
  {name:'عرض/تحديث',subject:'جديد على منصة مناقصة',body:'مرحباً،\nلدينا تحديث قد يهمّك على منصة مناقصة. ادخل حسابك للاطلاع على التفاصيل.\nشكراً لكونك جزءاً من مناقصة.'},
  {name:'تنبيه مهم',subject:'تنبيه من إدارة مناقصة',body:'مرحباً،\nنودّ تنبيهك بأمر يخص حسابك على المنصة. يرجى الاطلاع والتفاعل عند الحاجة.\nمع تحيات فريق مناقصة.'}
];
function fillMsgTemplates(){
  var wrap=document.getElementById('sm-templates'); if(!wrap)return;
  wrap.innerHTML=MSG_TEMPLATES.map(function(t,i){
    return '<button type="button" class="act-btn ab-default" style="padding:7px 13px;font-size:12px" onclick="applyMsgTemplate('+i+')">'+t.name+'</button>';
  }).join('')+'<button type="button" class="act-btn ab-default" style="padding:7px 13px;font-size:12px;color:var(--muted)" onclick="applyMsgTemplate(-1)">مسح</button>';
}
function applyMsgTemplate(i){
  var subj=document.getElementById('sm-subject'),msg=document.getElementById('sm-message');
  if(i<0){ if(subj)subj.value='';if(msg)msg.value=''; return; }
  var t=MSG_TEMPLATES[i]; if(!t)return;
  if(subj)subj.value=t.subject; if(msg)msg.value=t.body;
}
function broadcastSelected(){
  window._ctFrom=0;
  var n=Object.keys(_selUsers).length;if(!n){toast('لم تحدّد أي مستخدم','error');return;}
  document.getElementById('sm-count').textContent=n;
  document.getElementById('sm-subject').value='';document.getElementById('sm-message').value='';document.getElementById('sm-channel').value='app';
  fillMsgTemplates();
  document.getElementById('selMsgModal').classList.add('show');
}
function sendSelectedMsg(){
  var ids=Object.keys(_selUsers).map(Number).filter(Boolean);
  if(!ids.length){toast('لم تحدّد أي مستخدم','error');return;}
  var title=document.getElementById('sm-subject').value.trim();
  var body=document.getElementById('sm-message').value.trim();
  if(!title||!body){toast('العنوان والنص مطلوبان','error');return;}
  var channel=document.getElementById('sm-channel').value||'app';
  var btn=document.getElementById('sm-send');btn.disabled=true;btn.textContent='جاري الإرسال...';
  fetch(API+'/api/admin/notify',Object.assign({method:'POST',body:JSON.stringify({user_ids:ids,title:title,body:body,channel:channel})},hdr()))
    .then(function(r){if(!r.ok)return r.json().then(function(e){throw new Error(e.message||'');});return r.json();})
    .then(function(d){toast('تم الإرسال إلى '+(d.sent_count!=null?d.sent_count:ids.length)+' مستخدم','success');closeModal('selMsgModal');if(window._ctFrom){window._ctFrom=0;_selUsers={};_ctAll(false);}else clearUserSel();})
    .catch(function(e){toast(e.message||'تعذر الإرسال','error');})
    .finally(function(){btn.disabled=false;btn.textContent='إرسال الرسالة';});
}

function openUserView(uid){
  var u=_allUsers.find(function(x){return x.id===uid;});if(!u)return;
  var hasProvData = !!(u.business_name || u.bio);
  var roleTxt = u.role==='provider'?'مزوّد خدمة':(u.role==='client'?'عميل (طالب خدمة)':(u.role==='admin'?'مشرف':u.role));
  var roleColor = u.role==='provider'?'#334155':(u.role==='client'?'#1e3a8a':'#7c3aed');
  var row=function(label,val){ return '<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)"><span style="color:var(--muted);font-size:12.5px;font-weight:700">'+label+'</span><span style="font-size:13.5px;font-weight:700;text-align:left;word-break:break-word">'+esc(val||'—')+'</span></div>'; };
  var warn = (u.role==='client'&&!u.can_provide&&hasProvData) ? '<div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:10px;padding:10px 12px;margin-bottom:12px;font-size:12.5px;font-weight:700;display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span style="flex:1;min-width:200px">⚠️ دوره «عميل» لكن عنده بيانات مزوّد (اسم نشاط/نبذة) — غالباً سجّل كمزوّد واختار عميل بالغلط.</span><button onclick="_makeProvider('+u.id+',this)" style="background:#c2410c;color:#fff;border:0;border-radius:9px;padding:8px 14px;font-family:inherit;font-weight:800;font-size:12.5px;cursor:pointer">حوّله لمزوّد</button></div>' : '';
  document.getElementById('um-title').textContent='عرض بيانات المستخدم';
  document.getElementById('um-body').innerHTML=''
    +'<div class="usr-header"><div class="u-av">'+(isImg(u.profile_image)?'<img src="'+esc(_safeUrl(u.profile_image))+'">':esc((u.name||'?')[0]))+'</div><div><div style="font-size:16px;font-weight:900">'+esc(u.name)+'</div><div style="font-size:12.5px;color:var(--muted);margin-top:1px">'+esc(u.email)+'</div></div></div>'
    +warn
    +'<div style="display:inline-block;background:'+roleColor+';color:#fff;font-size:12px;font-weight:800;padding:5px 14px;border-radius:20px;margin-bottom:10px">'+roleTxt+'</div>'
    +row('الجوال', u.phone)
    +row('المدينة', u.city)
    +(hasProvData||u.role==='provider'?row('اسم النشاط', u.business_name):'')
    +(hasProvData||u.role==='provider'?row('النبذة', u.bio):'')
    +row('الحالة', u.is_active?'نشط':'موقوف')
    +row('تاريخ التسجيل', u.created_at?String(u.created_at).slice(0,10):'')
    +'<div id="um-mail" style="margin-top:12px"></div>'
    +'<button class="act-btn ab-primary" style="width:100%;justify-content:center;padding:12px;margin-top:14px" onclick="openUserModal('+u.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>إدارة / تعديل</button>';
  document.getElementById('userModal').classList.add('show');
  _umMail(u);
}
var _MST={sending:['جاري الإرسال','#64748b','#f1f5f9'],sent:['انرسل','#1d4ed8','#dbeafe'],delayed:['متأخر','#92400e','#fef3c7'],delivered:['وصل ✓','#15803d','#dcfce7'],opened:['فتحه ✓','#15803d','#dcfce7'],clicked:['ضغط الرابط ✓','#15803d','#dcfce7'],bounced:['رجع ✗','#b91c1c','#fee2e2'],complained:['سبام ✗','#b91c1c','#fee2e2'],failed:['فشل ✗','#b91c1c','#fee2e2'],suppressed:['محظور — البريد غير موجود ✗','#b91c1c','#fee2e2']};
function _umMail(u){
  var el=document.getElementById('um-mail'); if(!el)return;
  el.innerHTML='<div style="font-size:12.5px;color:var(--muted)">جاري تحميل الإيميلات…</div>';
  fetch(API+'/api/admin/users/'+u.id+'/emails',hdr()).then(function(r){return r.json();}).then(function(list){
    list=Array.isArray(list)?list:[];
    var unv=(u.email_verified===false);
    var h='<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="font-size:13.5px">📧 الإيميلات</b>'+(unv?'<span style="background:#fef3c7;color:#92400e;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:800">البريد غير مفعّل</span>':'<span style="background:#dcfce7;color:#15803d;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:800">البريد مفعّل</span>')+'</div>';
    if(!list.length) h+='<div style="font-size:12.5px;color:var(--muted)">ما فيه إيميلات مسجّلة له (التسجيل بدأ مع هالتحديث)</div>';
    else h+=list.slice(0,6).map(function(m){var st=_MST[m.status]||[m.status,'#334766','#f1f5f9'];return '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border);font-size:12.5px"><span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700" title="'+esc(m.to_email)+'">'+esc(m.subject||'')+'</span><span style="color:var(--muted);white-space:nowrap">'+esc(String(m.created_at||'').slice(5,16).replace('T',' '))+'</span><span title="'+esc(m.error||'')+'" style="background:'+st[2]+';color:'+st[1]+';border-radius:999px;padding:2px 9px;font-weight:800;white-space:nowrap">'+st[0]+'</span></div>';}).join('');
    if(unv) h+='<div style="display:flex;gap:8px;margin-top:10px"><button class="act-btn ab-default" style="flex:1;justify-content:center" onclick="_umResend('+u.id+',this)">إعادة إرسال التفعيل</button><button class="act-btn ab-primary" style="flex:1;justify-content:center" onclick="verifyUserEmail('+u.id+')">تفعيل يدوي</button></div>';
    el.innerHTML=h;
  }).catch(function(){el.innerHTML='';});
}
function _umResend(uid,btn){ btn.disabled=true;btn.textContent='...';
  fetch(API+'/api/admin/users/'+uid+'/resend-verification',Object.assign({method:'POST',body:'{}'},hdr())).then(function(r){return r.json();}).then(function(d){
    if(d&&d.already){toast('بريده مفعّل','success');} else if(d&&d.ok){toast('انرسل ✓','success');} else toast((d&&d.message)||'تعذّر الإرسال','error');
    var u=_allUsers.find(function(x){return x.id===uid;}); if(u)setTimeout(function(){_umMail(u);},1500);
  }).catch(function(){toast('تعذّر الاتصال','error');}).finally(function(){btn.disabled=false;btn.textContent='إعادة إرسال التفعيل';});
}
function verifyUserEmail(uid){
  if(!confirm('توثيق بريد هذا المستخدم يدوياً؟ (يتمكّن من النشر/تقديم العروض فوراً بدون رابط إيميل)'))return;
  fetch(API+'/api/admin/users/'+uid+'/verify-email',Object.assign({method:'PUT'},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){if(!res.ok){toast((res.d&&res.d.message)||'تعذّر التوثيق','error');return;}toast('تم توثيق البريد ✓','success');})
    .catch(function(){toast('تعذّر الاتصال','error');});
}
function resetUserPassword(uid){
  var u=_allUsers.find(function(x){return x.id===uid;});
  var np=prompt('كلمة المرور الجديدة لـ«'+((u&&u.name)||'المستخدم')+'» (٦ أحرف على الأقل):');
  if(np===null)return;
  np=(np||'').trim();
  if(np.length<6){toast('كلمة المرور ٦ أحرف على الأقل','error');return;}
  fetch(API+'/api/admin/users/'+uid+'/reset-password',Object.assign({method:'PUT',body:JSON.stringify({password:np})},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){ if(!res.ok){toast((res.d&&res.d.message)||'تعذّر التعيين','error');return;} toast('تم تعيين كلمة المرور ✓ سلّمها للمستخدم','success'); })
    .catch(function(){toast('تعذّر الاتصال','error');});
}
function openUserModal(uid){
  var u=_allUsers.find(function(x){return x.id===uid;});if(!u)return;
  var verified=u.badge==='verified'||u.badge==='موثق';
  document.getElementById('um-title').textContent='إدارة المستخدم';
  document.getElementById('um-body').innerHTML=''
    +'<div class="usr-header"><div class="u-av">'+(isImg(u.profile_image)?'<img src="'+esc(_safeUrl(u.profile_image))+'">':esc((u.name||'?')[0]))+'</div><div><div style="font-size:16px;font-weight:900">'+esc(u.name)+'</div><div style="font-size:12.5px;color:var(--muted);margin-top:1px">'+esc(u.email)+'</div><div style="font-size:11.5px;color:var(--hint);margin-top:2px">'+esc(u.phone||'لا يوجد رقم')+'</div></div></div>'
    +(u.role==='provider'?'<a class="act-btn ab-default pro-lnk" style="width:100%;justify-content:center;padding:11px;margin-bottom:6px;box-sizing:border-box" href="/pro/'+u.id+'" target="_blank" rel="noopener">'+_PRO_IC+'صفحته العامة ↗</a>':'')
    +'<button class="act-btn ab-default" style="width:100%;justify-content:center;padding:11px;margin-bottom:6px" onclick="openUserEdit('+u.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>تعديل البيانات</button>'
    +'<button class="act-btn ab-default" style="width:100%;justify-content:center;padding:11px;margin-bottom:6px" onclick="resetUserPassword('+u.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>إعادة تعيين كلمة المرور</button>'
    +'<button class="act-btn ab-default" style="width:100%;justify-content:center;padding:11px;margin-bottom:6px;color:#059669;border-color:#a7f3d0" onclick="verifyUserEmail('+u.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>توثيق البريد يدوياً</button>'
    +'<div class="sec-label">الدور</div>'
    +'<div class="opt-row'+(u.role==='client'?' sel':'')+'" onclick="changeRole('+u.id+',\'client\')"><div><div class="opt-row-label">عميل</div><div class="opt-row-desc">ينشر مشاريع ويستقبل عروض</div></div>'+(u.role==='client'?'<svg class="check" fill="none" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>':'')+'</div>'
    +'<div class="opt-row'+(u.role==='provider'?' sel':'')+'" onclick="changeRole('+u.id+',\'provider\')"><div><div class="opt-row-label">مزود</div><div class="opt-row-desc">يقدّم عروض على المشاريع</div></div>'+(u.role==='provider'?'<svg class="check" fill="none" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>':'')+'</div>'
    +'<div class="sec-label">الألقاب</div>'
    +_badgePicker(u)
    +(u.role==='provider'?('<div class="sec-label">المستوى (تلقائي حسب الصفقات — يمكن تجاوزه)</div>'+_tierPicker(u)):'')
    +'<div class="sec-label">المراسلة</div>'
    +'<button class="act-btn ab-default" style="width:100%;justify-content:center;padding:11px;margin-bottom:4px" onclick="openNotify('+u.id+','+_jsa(u.name)+','+_jsa(u.role||'')+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>إرسال رسالة / إشعار</button>'
    +(((u.role==='client'||u.role==='provider'))?('<div class="sec-label">تحكّم الإدارة</div>'+'<button class="act-btn ab-default" style="width:100%;justify-content:center;padding:11px;margin-bottom:6px" onclick="enterClientAccount('+u.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>دخول كحساب '+(u.role==='provider'?'المزود':'العميل')+'</button>'+((u.role==='client')?('<button class="act-btn ab-primary" style="width:100%;justify-content:center;padding:11px;margin-bottom:6px" onclick="addProjectForClient('+u.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>أضف مشروعاً لهذا العميل</button>'):'')):'')+'<div class="sec-label">إجراءات الحساب</div>'
    +'<div style="display:flex;gap:8px">'
      +'<button class="act-btn '+(u.is_active?'ab-default':'ab-primary')+'" style="flex:1;justify-content:center;padding:11px" onclick="toggleActive('+u.id+')">'+(u.is_active?'حظر المستخدم':'إلغاء الحظر')+'</button>'
      +'<button class="act-btn ab-danger" style="flex:1;justify-content:center;padding:11px" onclick="deleteUser('+u.id+')">حذف نهائي</button>'
    +'</div>';
  document.getElementById('userModal').classList.add('show');
}
function changeRole(uid,role){
  fetch(API+'/api/admin/users/'+uid+'/role',Object.assign({method:'PUT',body:JSON.stringify({role:role})},hdr())).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(){toast('تم تحويل الدور إلى '+(role==='client'?'عميل':'مزود'),'success');closeModal('userModal');loadUsers();}).catch(function(){toast('تعذر تحويل الدور','error');});
}
var BADGE_CATALOG=[
  {key:'verified',label:'موثّق',color:'#2E90FA',bg:'#EFF8FF',scope:'all'},
  {key:'premium',label:'مميز',color:'#B8780A',bg:'#FFF7E6',scope:'all'},
  {key:'gold_partner',label:'شريك ذهبي',color:'#B8780A',bg:'#FFF7E6',scope:'provider'},
  {key:'top_rated',label:'الأعلى تقييماً',color:'#12B76A',bg:'#ECFDF3',scope:'provider'},
  {key:'fast_response',label:'سريع الاستجابة',color:'#0EA5E9',bg:'#E0F2FE',scope:'provider'},
  {key:'trusted_client',label:'عميل موثوق',color:'#1e3a8a',bg:'#eef2fb',scope:'client'}
];
function badgeMeta(key){ for(var i=0;i<BADGE_CATALOG.length;i++){ if(BADGE_CATALOG[i].key===key) return BADGE_CATALOG[i]; } return null; }
function badgeChip(key){
  var m=badgeMeta(key); if(!m) return '';
  var ic=(key==='verified')
    ? '<svg width="12" height="12" viewBox="-2 -2 28 28"><polygon points="12.00,0.60 14.28,3.50 17.70,2.13 18.22,5.78 21.87,6.30 20.50,9.72 23.40,12.00 20.50,14.28 21.87,17.70 18.22,18.22 17.70,21.87 14.28,20.50 12.00,23.40 9.72,20.50 6.30,21.87 5.78,18.22 2.13,17.70 3.50,14.28 0.60,12.00 3.50,9.72 2.13,6.30 5.78,5.78 6.30,2.13 9.72,3.50" fill="#3897f0" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.4 12.4 10.6 15.5 16.7 8.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>';
  return '<span class="badge" style="background:'+m.bg+';color:'+m.color+'">'+ic+m.label+'</span>';
}
function _badgePicker(u){
  var cur=u.badge||'none';
  var list=BADGE_CATALOG.filter(function(b){ return b.scope==='all'||b.scope===u.role; });
  var rows=list.map(function(b){
    var sel=cur===b.key;
    return '<div class="opt-row'+(sel?' sel':'')+'" onclick="setUserBadge('+u.id+',\''+(sel?'none':b.key)+'\')"><div class="opt-row-label"><span style="width:18px;height:18px;border-radius:5px;background:'+b.bg+';display:inline-flex;align-items:center;justify-content:center"><svg width="11" height="11" fill="none" stroke="'+b.color+'" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span>'+b.label+(sel?' — اضغط للإلغاء':'')+'</div>'+(sel?'<svg class="check" fill="none" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>':'')+'</div>';
  }).join('');
  return rows+'<div style="font-size:11.5px;color:var(--muted);margin-top:4px;line-height:1.7">لقب واحد أساسي لكل مستخدم. الألقاب الخاصة بالمزودين لا تظهر للعملاء والعكس.</div>';
}
function setUserBadge(uid,key){
  fetch(API+'/api/admin/users/'+uid+'/badge',Object.assign({method:'PUT',body:JSON.stringify({badge:key})},hdr()))
    .then(function(r){if(!r.ok)return r.json().then(function(e){throw new Error(e.message||'');});return r.json();})
    .then(function(){var m=badgeMeta(key);toast(key==='none'?'تم إزالة اللقب':'تم منح لقب «'+(m?m.label:key)+'»','success');closeModal('userModal');loadUsers();})
    .catch(function(e){toast(e.message||'تعذر التحديث','error');});
}
var TIER_CATALOG=[
  {key:'new',label:'مزود جديد',color:'#64748b',bg:'#f1f5f9',min:0},
  {key:'active',label:'مزود نشط',color:'#9a6a2e',bg:'#f6ead9',min:3},
  {key:'distinguished',label:'مزود مميّز',color:'#5b6b7d',bg:'#eceff3',min:10},
  {key:'expert',label:'خبير معتمد',color:'#97710d',bg:'#fdf1cf',min:25}
];
function tierMeta(key){ for(var i=0;i<TIER_CATALOG.length;i++){ if(TIER_CATALOG[i].key===key) return TIER_CATALOG[i]; } return TIER_CATALOG[0]; }
function tierChip(key){ var m=tierMeta(key||'new'); if(m.key==='new')return ''; return '<span class="badge" style="background:'+m.bg+';color:'+m.color+'"><svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/></svg>'+m.label+'</span>'; }
function _tierPicker(u){
  var cur=u.tier||'new';
  var locked=!!u.tier_locked;
  var done=parseInt(u.completed_projects)||0;
  var rows=TIER_CATALOG.map(function(t){
    var sel=cur===t.key;
    var auto=done>=t.min;
    return '<div class="opt-row'+(sel?' sel':'')+'" onclick="setUserTier('+u.id+',\''+t.key+'\')"><div class="opt-row-label"><span style="width:18px;height:18px;border-radius:5px;background:'+t.bg+';display:inline-flex;align-items:center;justify-content:center"><svg width="11" height="11" fill="none" stroke="'+t.color+'" stroke-width="2.4" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/></svg></span>'+t.label+' <span style="font-size:10.5px;color:var(--hint)">('+t.min+'+ صفقة'+(auto?' ✓':'')+')</span></div>'+(sel?'<svg class="check" fill="none" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>':'')+'</div>';
  }).join('');
  var lockBanner = locked
    ? '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--gold-l);border:1px solid var(--p-mid);border-radius:10px;padding:9px 12px;margin-top:8px"><span style="font-size:12px;font-weight:800;color:var(--p);display:inline-flex;align-items:center;gap:6px"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>المستوى مثبّت يدوياً — لا يتغيّر تلقائياً</span><button class="act-btn ab-default" style="padding:6px 12px;font-size:11.5px" onclick="unlockUserTier('+u.id+')">فكّ التثبيت</button></div>'
    : '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px"><span style="font-size:11.5px;color:var(--muted)">تلقائي حسب الصفقات</span><button class="act-btn ab-default" style="padding:6px 12px;font-size:11.5px" onclick="lockUserTier('+u.id+')"><svg fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>تثبيت الحالي</button></div>';
  return rows+lockBanner+'<div style="font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.7">الصفقات المكتملة: <b>'+done+'</b>. '+(locked?'المستوى مثبّت ولن يتغيّر مهما أكمل من صفقات حتى تفكّ التثبيت.':'اختيار مستوى يدوياً يثبّته تلقائياً. وبدون تثبيت، يُحدَّث حسب الصفقات.')+'</div>';
}
function _tierApi(uid,payload,okMsg){
  fetch(API+'/api/admin/users/'+uid+'/tier',Object.assign({method:'PUT',body:JSON.stringify(payload)},hdr()))
    .then(function(r){if(!r.ok)return r.json().then(function(e){throw new Error(e.message||'');});return r.json();})
    .then(function(){toast(okMsg,'success');closeModal('userModal');loadUsers();})
    .catch(function(e){toast(e.message||'تعذر التحديث','error');});
}
function setUserTier(uid,key){ var m=tierMeta(key); _tierApi(uid,{tier:key},'تم ضبط المستوى إلى «'+m.label+'» (مثبّت)'); }
function lockUserTier(uid){ _tierApi(uid,{lock_only:true},'تم تثبيت المستوى'); }
function unlockUserTier(uid){ _tierApi(uid,{auto:true},'تم فكّ التثبيت — رجع تلقائياً'); }
function toggleBadge(uid,badge){
  fetch(API+'/api/admin/users/'+uid+'/badge',Object.assign({method:'PUT',body:JSON.stringify({badge:badge})},hdr())).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(){toast(badge==='premium'?'تم منح شارة عميل مميز':'تم إلغاء التمييز','success');closeModal('userModal');loadUsers();}).catch(function(){toast('تعذر التحديث','error');});
}
function toggleVerified(uid,mk){
  fetch(API+'/api/admin/users/'+uid+'/badge',Object.assign({method:'PUT',body:JSON.stringify({badge:mk?'verified':'none'})},hdr())).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(){toast(mk?'تم منح شارة موثّق':'تم إلغاء التوثيق','success');closeModal('userModal');loadUsers();}).catch(function(){toast('تعذر التحديث','error');});
}
function toggleActive(uid){
  fetch(API+'/api/admin/users/'+uid+'/toggle',Object.assign({method:'PUT'},hdr())).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(){toast('تم تحديث الحالة','success');closeModal('userModal');loadUsers();}).catch(function(){toast('تعذر التحديث','error');});
}
async function deleteUser(uid){
  if(!await askConfirm({title:'حذف المستخدم',message:'سيُحذف المستخدم وكل بياناته نهائياً. لا يمكن التراجع.',confirmText:'نعم، احذف'}))return;
  fetch(API+'/api/admin/users/'+uid,Object.assign({method:'DELETE'},hdr())).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(){toast('تم الحذف','success');closeModal('userModal');loadUsers();}).catch(function(){toast('تعذر الحذف','error');});
}

var _notifyUid=null;
function openNotify(uid,name,role){
  _notifyUid=uid;
  document.getElementById('nm-title').textContent='رسالة إلى '+name;
  document.getElementById('nm-subject').value='';
  document.getElementById('nm-message').value='';
  document.getElementById('nm-app').checked=true;
  document.getElementById('nm-email').checked=true;
  var isCli=(role==='client');
  var chatRow=document.getElementById('nm-chat-row');
  chatRow.style.display=isCli?'flex':'none';
  document.getElementById('nm-chat').checked=false;
  document.getElementById('nm-proj-wrap').style.display='none';
  var sel=document.getElementById('nm-project'); sel.innerHTML='<option value="">عام — بدون مشروع</option>';
  if(isCli){ fetch(API+'/api/admin/client-projects?uid='+uid,hdr()).then(function(r){return r.json();}).then(function(list){ (list||[]).forEach(function(p){ var o=document.createElement('option'); o.value=p.id; o.textContent=p.title||('مشروع #'+p.id); sel.appendChild(o); }); }).catch(function(){}); }
  closeModal('userModal');
  document.getElementById('notifyModal').classList.add('show');
}
function sendNotify(){
  if(!_notifyUid)return;
  var title=document.getElementById('nm-subject').value.trim();
  var message=document.getElementById('nm-message').value.trim();
  var chat=document.getElementById('nm-chat').checked;
  var email=document.getElementById('nm-email').checked;
  if(!message){toast('الرسالة مطلوبة','error');return;}
  var btn=document.getElementById('nm-send');btn.disabled=true;btn.textContent='جاري الإرسال...';
  var fin=function(){btn.disabled=false;btn.textContent='إرسال';};
  if(chat){
    var proj=document.getElementById('nm-project').value||null;
    var content=title?(title+' — '+message):message;
    fetch(API+'/api/admin/message-client',Object.assign({method:'POST',body:JSON.stringify({client_id:_notifyUid,content:content,request_id:proj,email:email})},hdr()))
      .then(function(r){if(!r.ok)throw new Error();return r.json();})
      .then(function(){toast('تم الإرسال كمحادثة'+(email?' + إيميل':'')+' + إشعار','success');closeModal('notifyModal');})
      .catch(function(){toast('تعذر الإرسال','error');}).finally(fin);
    return;
  }
  var app=document.getElementById('nm-app').checked;
  if(!app&&!email){toast('اختر قناة واحدة على الأقل','error');fin();return;}
  if(!title){toast('العنوان مطلوب للإشعار','error');fin();return;}
  var channel=app&&email?'both':(email?'email':'app');
  fetch(API+'/api/admin/notify',Object.assign({method:'POST',body:JSON.stringify({user_id:_notifyUid,title:title,body:message,channel:channel})},hdr()))
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(d){var parts=[];if(d.app_count)parts.push('إشعار');if(d.email_count)parts.push('إيميل');toast(parts.length?'تم الإرسال ('+parts.join(' + ')+')':'تم الإرسال','success');closeModal('notifyModal');})
    .catch(function(){toast('تعذر الإرسال','error');})
    .finally(fin);
}

var _bcTarget='all';
function openBroadcast(){
  setTimeout(function(){fillBcCity();updateBcCount();},50);
  document.getElementById('bc-subject').value='';
  document.getElementById('bc-message').value='';
  setBcTarget('all');
  document.getElementById('broadcastModal').classList.add('show');
}
function setBcTarget(t){
  _bcTarget=t;
  ['all','client','provider'].forEach(function(x){
    document.getElementById('bc-target-'+x).classList.toggle('sel',x===t);
    document.getElementById('bc-check-'+x).style.display=(x===t)?'block':'none';
  });
  var labels={all:'إرسال للجميع',client:'إرسال للعملاء',provider:'إرسال للمزودين'};
  document.getElementById('bc-send').textContent=labels[t];
  if(typeof updateBcCount==='function')updateBcCount();
}
function bcFilters(){
  return {
    target:_bcTarget,
    specialty:(document.getElementById('bc-specialty')||{}).value||'',
    city:(document.getElementById('bc-city')||{}).value||'',
    verifiedOnly:(document.getElementById('bc-verified')||{}).checked||false
  };
}
function updateBcCount(){
  var el=document.getElementById('bc-count');if(!el)return;
  el.textContent='...';
  fetch(API+'/api/admin/broadcast/count',Object.assign({method:'POST',body:JSON.stringify(bcFilters())},hdr()))
    .then(function(r){return r.json();})
    .then(function(d){el.textContent=(d.count||0);})
    .catch(function(){el.textContent='—';});
}
function fillBcCity(){
  var sel=document.getElementById('bc-city');if(!sel||sel.children.length>1)return;
  var regions=_regionsList();
  sel.innerHTML='<option value="">كل المدن</option>';
  regions.forEach(function(reg){var g=document.createElement('optgroup');g.label=reg.n;reg.c.forEach(function(ct){var o=document.createElement('option');o.value=ct;o.textContent=ct;g.appendChild(o);});sel.appendChild(g);});
}
async function sendBroadcast(){
  var title=document.getElementById('bc-subject').value.trim();
  var message=document.getElementById('bc-message').value.trim();
  if(!title||!message){toast('العنوان والرسالة مطلوبان','error');return;}
  var channels={app:document.getElementById('bc-app').checked,email:document.getElementById('bc-email').checked};
  if(!channels.app&&!channels.email){toast('اختر قناة واحدة على الأقل','error');return;}
  var f=bcFilters();
  var desc=f.specialty?('مزودي '+f.specialty):(_bcTarget==='all'?'جميع المستخدمين':_bcTarget==='client'?'كل العملاء':'كل المزودين');
  if(f.city)desc+=' في '+f.city;
  if(f.verifiedOnly)desc+=' (الموثّقون)';
  if(!await askConfirm({title:'تأكيد الإرسال',message:'إرسال الرسالة إلى '+desc+'؟',confirmText:'إرسال',safe:true}))return;
  var btn=document.getElementById('bc-send');btn.disabled=true;btn.textContent='جاري الإرسال...';
  fetch(API+'/api/admin/broadcast',Object.assign({method:'POST',body:JSON.stringify(Object.assign({title:title,message:message,channels:channels},f))},hdr()))
    .then(function(r){if(!r.ok)return r.json().catch(function(){return{};}).then(function(e){throw new Error(e.message||'');});return r.json();})
    .then(function(d){toast('تم الإرسال إلى '+(d.total||0)+' مستخدم','success');closeModal('broadcastModal');})
    .catch(function(e){toast((e&&e.message)||'تعذر الإرسال','error');})
    .finally(function(){btn.disabled=false;setBcTarget(_bcTarget);});
}

// نحمّل مكتبة Excel وقت الحاجة بس — ترجع true لو جاهزة، وإلا تحمّلها وتعيد استدعاء fn
var _xlsxTried=false,_xlsxQ=null;
function _xlsxReady(fn){
  if((typeof XLSX!=='undefined'&&XLSX.utils)||_xlsxTried)return true;
  if(_xlsxQ){_xlsxQ.push(fn);return false;}
  _xlsxQ=[fn];
  var s=document.createElement('script');
  // بصمة الملف (SRI): لو تغيّر الملف في الموقع الخارجي ما يشتغل، ويرجع التصدير لملف CSV
  s.integrity='sha384-OUW9euuUyxyHcAhTqbhI+Iyb8LMssXt/cpz0yXhs9UWG2/R/uaWdakx/4cfww7Vb'; s.crossOrigin='anonymous';
  s.src='https://cdn.jsdelivr.net/npm/xlsx-js-style@1.2.0/dist/xlsx.bundle.js';
  s.onload=s.onerror=function(){_xlsxTried=true;var q=_xlsxQ||[];_xlsxQ=null;q.forEach(function(f){try{f();}catch(e){}});};
  document.head.appendChild(s);
  return false;
}
function _downloadXlsx(headers,rows,opts){
  if(typeof XLSX==='undefined'||!XLSX.utils) return false;
  try{
    var aoa=[headers].concat(rows);
    var ws=XLSX.utils.aoa_to_sheet(aoa);
    if(opts.cols)ws['!cols']=opts.cols;
    ws['!rows']=[{hpt:26}];
    ws['!views']=[{rightToLeft:true}];
    var range=XLSX.utils.decode_range(ws['!ref']);
    for(var C=range.s.c;C<=range.e.c;C++){
      var hc=XLSX.utils.encode_cell({r:0,c:C});
      if(ws[hc])ws[hc].s={font:{bold:true,color:{rgb:'FFFFFF'},sz:12,name:'Arial'},fill:{fgColor:{rgb:'1E3A8A'}},alignment:{horizontal:'center',vertical:'center'},border:_xlBorder()};
    }
    for(var Rr=1;Rr<=range.e.r;Rr++){
      for(var Cc=range.s.c;Cc<=range.e.c;Cc++){
        var ad=XLSX.utils.encode_cell({r:Rr,c:Cc});var cell=ws[ad];if(!cell)continue;
        var base={font:{name:'Arial',sz:11,color:{rgb:'1E293B'}},alignment:{horizontal:'center',vertical:'center'},border:_xlBorder()};
        if(Rr%2===0)base.fill={fgColor:{rgb:'F0F5FF'}};
        var cs=opts.cellStyle?opts.cellStyle(Rr-1,Cc,cell.v):null;
        if(cs&&cs.color)base.font={name:'Arial',sz:11,bold:!!cs.bold,color:{rgb:cs.color}};
        cell.s=base;
      }
    }
    var wb=XLSX.utils.book_new();wb.Workbook={Views:[{RTL:true}]};
    XLSX.utils.book_append_sheet(wb,ws,opts.sheet||'Sheet1');
    XLSX.writeFile(wb,opts.filename);
    return true;
  }catch(e){return false;}
}
function _badgeLabel(key){ if(!key||key==='none')return '—'; var m=(typeof badgeMeta==='function')?badgeMeta(key):null; return m?m.label:key; }
function _xlBorder(){var b={style:'thin',color:{rgb:'D9E2F0'}};return {top:b,bottom:b,left:b,right:b};}
function openDuplicates(){
  var m=document.getElementById('dupModal'); if(!m){
    m=document.createElement('div'); m.id='dupModal'; m.className='modal-overlay';
    m.innerHTML='<div class="modal" style="max-width:640px"><div class="modal-head"><h3>الحسابات المكرّرة</h3><button class="modal-x" onclick="closeModal(\'dupModal\')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div><div id="dupBody" style="padding:6px 2px"><div class="loading"><div class="spinner"></div>جاري الفحص...</div></div></div>';
    document.body.appendChild(m);
  }
  m.classList.add('on'); document.body.style.overflow='hidden';
  fetch(API+'/api/admin/duplicates',hdr()).then(function(r){return r.json();}).then(renderDuplicates).catch(function(){ var b=document.getElementById('dupBody'); if(b)b.innerHTML='<div style="padding:24px;text-align:center;color:var(--muted)">تعذّر الفحص</div>'; });
}
function _dupGroup(g, keyLabel){
  var members=(g.members||[]).map(function(u){
    var roleAr=u.role==='provider'?'مزوّد':(u.role==='client'?'عميل':u.role);
    var act=(u.requests||0)+(u.bids||0);
    var when=u.created_at?new Date(u.created_at).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory'):'';
    return '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 11px;border:1px solid var(--border);border-radius:9px;margin-top:7px">'
      +'<div style="min-width:0"><div style="font-weight:800;font-size:13px">'+esc(u.name||'—')+' <span style="font-size:11px;color:var(--muted);font-weight:600">('+roleAr+')</span></div>'
      +'<div style="font-size:11px;color:var(--muted);margin-top:2px">'+esc(u.email||'')+(u.phone?' · '+esc(u.phone):'')+'</div>'
      +'<div style="font-size:10.5px;color:var(--muted);margin-top:2px">أُنشئ '+when+' · '+act+' نشاط'+(u.is_active===false?' · <span style="color:#dc2626">موقوف</span>':'')+'</div></div>'
      +'<button onclick="closeModal(\'dupModal\');openUserModal('+u.id+')" style="flex-shrink:0;background:var(--p);color:#fff;border:none;border-radius:8px;padding:7px 12px;font-family:Tajawal,sans-serif;font-weight:700;font-size:12px;cursor:pointer">إدارة</button>'
      +'</div>';
  }).join('');
  return '<div style="background:var(--card);border:1px solid var(--border);border-right:4px solid #d97706;border-radius:12px;padding:12px 14px;margin-bottom:11px">'
    +'<div style="font-size:12.5px;font-weight:800;color:#b45309">⚠️ '+keyLabel+': '+esc(g.key||'')+' <span style="color:var(--muted);font-weight:600">('+g.c+' حسابات)</span></div>'
    +members+'</div>';
}
function renderDuplicates(d){
  var b=document.getElementById('dupBody'); if(!b)return;
  var em=(d&&d.byEmail)||[], ph=(d&&d.byPhone)||[];
  if(!em.length&&!ph.length){ b.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">✅ لا توجد حسابات مكرّرة</div>'; return; }
  var h='<div style="font-size:12px;color:var(--muted);margin:2px 2px 12px;line-height:1.6">حسابات تشترك في نفس البريد أو نفس رقم الجوال. راجعها وادمج/أوقف المكرّر عبر «إدارة».</div>';
  if(ph.length)h+='<div style="font-weight:900;font-size:13px;margin:4px 0 8px">📱 مكرّر بالجوال ('+ph.length+')</div>'+ph.map(function(g){return _dupGroup(g,'الجوال');}).join('');
  if(em.length)h+='<div style="font-weight:900;font-size:13px;margin:14px 0 8px">📧 مكرّر بالبريد ('+em.length+')</div>'+em.map(function(g){return _dupGroup(g,'البريد');}).join('');
  b.innerHTML=h;
}
function exportUsers(){
  var list=getFilteredUsers();
  if(!list.length){toast('لا توجد بيانات للتصدير','error');return;}
  if(!_xlsxReady(exportUsers))return;
  if(typeof XLSX==='undefined'||!XLSX.utils){ exportUsersCSV(list); return; }
  var headers=['الاسم','البريد الإلكتروني','الجوال','الدور','المدينة','التخصصات','اللقب','المستوى','موثّق','الحالة','الطلبات','العروض','التقييم','تاريخ التسجيل'];
  var aoa=[headers];
  list.forEach(function(u){
    aoa.push([
      u.name||'', u.email||'', u.phone||'',
      u.role==='client'?'عميل':'مزود',
      u.city||'', (u.specialties||[]).join(' / '),
      _badgeLabel(u.badge), (typeof tierMeta==='function'&&u.tier&&u.tier!=='new'?tierMeta(u.tier).label:'—'), (u.badge==='verified'?'✓ موثّق':'—'),
      u.is_active?'نشط':'محظور',
      u.request_count||0, u.bid_count||0,
      (parseFloat(u.avg_rating)||0).toFixed(1),
      u.created_at?new Date(u.created_at).toLocaleDateString('en-GB'):''
    ]);
  });
  var ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=[{wch:22},{wch:28},{wch:14},{wch:8},{wch:14},{wch:26},{wch:14},{wch:13},{wch:11},{wch:9},{wch:9},{wch:9},{wch:8},{wch:14}];
  ws['!rows']=[{hpt:26}];
  ws['!views']=[{rightToLeft:true}];
  var range=XLSX.utils.decode_range(ws['!ref']);
  for(var C=range.s.c;C<=range.e.c;C++){
    var hc=XLSX.utils.encode_cell({r:0,c:C});
    if(ws[hc])ws[hc].s={font:{bold:true,color:{rgb:'FFFFFF'},sz:12,name:'Arial'},fill:{fgColor:{rgb:'1E3A8A'}},alignment:{horizontal:'center',vertical:'center'},border:_xlBorder()};
  }
  for(var Rr=1;Rr<=range.e.r;Rr++){
    for(var Cc=range.s.c;Cc<=range.e.c;Cc++){
      var ad=XLSX.utils.encode_cell({r:Rr,c:Cc});var cell=ws[ad];if(!cell)continue;
      cell.s={font:{name:'Arial',sz:11,color:{rgb:'1E293B'}},alignment:{horizontal:'center',vertical:'center'},border:_xlBorder()};
      if(Rr%2===0)cell.s.fill={fgColor:{rgb:'F0F5FF'}};
    }
    var vc=XLSX.utils.encode_cell({r:Rr,c:8});
    if(ws[vc]&&ws[vc].v==='✓ موثّق'){ws[vc].s.font={name:'Arial',sz:11,bold:true,color:{rgb:'1D4ED8'}};}
    var sc=XLSX.utils.encode_cell({r:Rr,c:9});
    if(ws[sc]){ws[sc].s.font={name:'Arial',sz:11,bold:true,color:{rgb:(ws[sc].v==='نشط'?'16A34A':'DC2626')}};}
    var rc=XLSX.utils.encode_cell({r:Rr,c:3});
    if(ws[rc]){ws[rc].s.font={name:'Arial',sz:11,bold:true,color:{rgb:(ws[rc].v==='مزود'?'1E3A8A':'0EA5E9')}};}
  }
  var wb=XLSX.utils.book_new();wb.Workbook={Views:[{RTL:true}]};
  XLSX.utils.book_append_sheet(wb,ws,'المستخدمون');
  try{ XLSX.writeFile(wb,'manaqasa-users-'+new Date().toISOString().slice(0,10)+'.xlsx'); toast('تم تصدير ملف Excel ('+list.length+' مستخدم)','success'); }
  catch(e){ exportUsersCSV(list); }
}
function exportUsersCSV(list){
  var rows=list.map(function(u){return {
    'الاسم':u.name||'','البريد':u.email||'','الجوال':u.phone||'',
    'الدور':u.role==='client'?'عميل':'مزود',
    'المدينة':u.city||'','التخصصات':(u.specialties||[]).join(' / '),
    'اللقب':_badgeLabel(u.badge),'موثّق':u.badge==='verified'?'نعم':'لا','الحالة':u.is_active?'نشط':'محظور',
    'الطلبات':u.request_count||0,'العروض':u.bid_count||0,
    'التاريخ':u.created_at?new Date(u.created_at).toLocaleDateString('en-GB'):''
  };});
  downloadCSV(rows,'manaqasa-users-'+new Date().toISOString().slice(0,10)+'.csv');
}


// ── النشر بالوكالة: نشر مشروع نيابة عن عميل (بتوكيله) ──

// ── مرفقات النشر بالوكالة ──
var _pxImgs=[], _pxFiles=[];
function _pxCompress(file,cb){
  if(!/^image\//.test(file.type)){var rr=new FileReader();rr.onload=function(e){cb(e.target.result);};rr.readAsDataURL(file);return;}
  var r=new FileReader();
  r.onload=function(e){var img=new Image();img.onload=function(){var max=1280,w=img.width,hh=img.height;if(w>max||hh>max){if(w>hh){hh=Math.round(hh*max/w);w=max;}else{w=Math.round(w*max/hh);hh=max;}}var c=document.createElement('canvas');c.width=w;c.height=hh;c.getContext('2d').drawImage(img,0,0,w,hh);try{cb(c.toDataURL('image/jpeg',0.8));}catch(err){cb(e.target.result);}};img.onerror=function(){cb(e.target.result);};img.src=e.target.result;};
  r.readAsDataURL(file);
}
function _pxPickImages(inp){
  var files=[].slice.call(inp.files).slice(0,5-_pxImgs.length); inp.value='';
  files.forEach(function(f){
    if(f.size>10*1024*1024){toast(f.name+': أكبر من 10MB','error');return;}
    _pxCompress(f,function(d){ _pxImgs.push(d); _pxRenderPreview(); });
  });
}
// رفع مرفق مباشرة لحظة اختياره (حتى 30MB) — يحفظ {name,url}؛ لو تعذّر وكان ≤10MB يرجع للطريقة القديمة
function _mqUpAtt(f,slot,done){
  var tk=(typeof token!=='undefined'&&token)||localStorage.getItem('token')||'';
  function fb(msg){ if(f.size<=10*1024*1024){var r=new FileReader();r.onload=function(e){slot.data=e.target.result;slot.up=false;done(true);};r.onerror=function(){done(false,msg);};r.readAsDataURL(f);} else done(false,msg); }
  fetch(API+'/api/upload/attachment',{method:'POST',headers:{'Authorization':'Bearer '+tk,'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(f.name)},body:f})
    .then(function(r){return r.json().catch(function(){return {};}).then(function(d){
      if(r.ok&&d.url){slot.url=d.url;slot.up=false;done(true);}
      else if(r.status===400||r.status===413)done(false,d.message);
      else fb(d.message);
    });}).catch(function(){fb('');});
}
function _pxPickFiles(inp){
  var files=[].slice.call(inp.files).slice(0,3-_pxFiles.length); inp.value='';
  files.forEach(function(f){
    if(f.size>30*1024*1024){toast(f.name+': أكبر من 30MB','error');return;}
    var slot={name:f.name,up:true}; _pxFiles.push(slot); _pxRenderPreview();
    _mqUpAtt(f,slot,function(ok,msg){ if(!ok){var i=_pxFiles.indexOf(slot);if(i>-1)_pxFiles.splice(i,1);toast(msg||('تعذّر رفع «'+f.name+'»'),'error');} _pxRenderPreview(); });
  });
}
function _pxRenderPreview(){
  var el=document.getElementById('px-preview'); if(!el)return;
  var h='';
  _pxImgs.forEach(function(src,i){
    h+='<div style="position:relative;width:62px;height:62px;border-radius:9px;overflow:hidden;border:1px solid var(--border)"><img src="'+esc(_safeUrl(src))+'" style="width:100%;height:100%;object-fit:cover"><button type="button" onclick="_pxDelImg('+i+')" style="position:absolute;top:2px;left:2px;width:19px;height:19px;border-radius:50%;background:rgba(220,38,38,.9);border:none;color:#fff;font-size:12px;cursor:pointer;line-height:1">×</button></div>';
  });
  _pxFiles.forEach(function(f,i){
    h+='<div style="display:flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:7px 10px;font-size:11.5px;font-weight:700"><span>📎</span><span style="max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(f.up?'⏳ ':'')+esc(f.name)+'</span><button type="button" onclick="_pxDelFile('+i+')" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:14px;padding:0">×</button></div>';
  });
  el.innerHTML=h;
}
function _pxDelImg(i){ _pxImgs.splice(i,1); _pxRenderPreview(); }
function _pxDelFile(i){ _pxFiles.splice(i,1); _pxRenderPreview(); }


// ── المزوّدون بملفات ناقصة ──
function openIncomplete(){
  document.getElementById('um-title').textContent='مزوّدون بملفات ناقصة';
  document.getElementById('um-body').innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  document.getElementById('userModal').classList.add('show');
  fetch(API+'/api/admin/incomplete-providers',hdr()).then(function(r){return r.json();}).then(function(d){
    var list=(d&&d.providers)||[];
    if(!list.length){ document.getElementById('um-body').innerHTML='<div style="text-align:center;padding:40px;color:var(--muted)"><div style="font-size:34px;margin-bottom:8px">🎉</div><div style="font-weight:800;color:var(--text)">كل الملفات مكتملة</div></div>'; return; }
    var h='<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:11px;padding:11px 13px;margin-bottom:14px;font-size:12.5px;color:#7c2d12;line-height:1.75">📋 <b>'+list.length+' مزوّد</b> بملف ناقص — الملف المكتمل يضاعف فرص وصول العملاء إليه.</div>';
    list.forEach(function(p){
      var color = p.pct>=60?'#16a34a':(p.pct>=40?'#d97706':'#dc2626');
      var wa='https://wa.me/'+String(p.phone||'').replace(/\D/g,'').replace(/^0/,'966')+'?text='+encodeURIComponent('السلام عليكم '+(p.name||'')+'،\nمعك فريق منصة مناقصة.\n\nلاحظنا أن ملفك في المنصة ناقص: '+(p.missing||[]).join('، ')+'.\n\nالمزوّدون بملف مكتمل تصلهم مشاريع أكثر بكثير — لأن العميل يختار من يشوف خبرته وأعماله بوضوح.\n\nأكمل ملفك من: https://manaqasa.com/dashboard-provider.html\nودقيقتين تكفي 👌');
      h+='<div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:13px;margin-bottom:10px">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px">'
          +'<div style="font-size:14px;font-weight:800">'+esc(p.name||'مزوّد')+'</div>'
          +'<div style="font-size:12px;font-weight:900;color:'+color+'">'+p.pct+'%</div>'
        +'</div>'
        +'<div style="height:6px;background:var(--bg);border-radius:4px;overflow:hidden;margin-bottom:9px"><div style="height:100%;width:'+p.pct+'%;background:'+color+'"></div></div>'
        +'<div style="font-size:11.5px;color:var(--muted);margin-bottom:10px;line-height:1.7">ناقص: '+esc((p.missing||[]).join(' · '))+'</div>'
        +'<div style="display:flex;gap:7px">'
          +'<button onclick="remindProvider('+p.id+',this)" style="flex:1;padding:9px;background:var(--p);color:#fff;border:none;border-radius:9px;font-family:Tajawal,sans-serif;font-size:12.5px;font-weight:800;cursor:pointer">🔔 تذكير داخل المنصة</button>'
          +(p.phone?'<a href="'+esc(wa)+'" target="_blank" style="flex:1;padding:9px;background:#25d366;color:#fff;border-radius:9px;font-family:Tajawal,sans-serif;font-size:12.5px;font-weight:800;text-align:center;text-decoration:none">📱 واتساب</a>':'')
        +'</div></div>';
    });
    document.getElementById('um-body').innerHTML=h;
  }).catch(function(){ document.getElementById('um-body').innerHTML='<div style="text-align:center;padding:30px;color:var(--muted)">تعذّر التحميل</div>'; });
}
function remindProvider(id,btn){
  if(btn){btn.disabled=true;btn.textContent='جاري الإرسال...';}
  fetch(API+'/api/admin/remind-provider/'+id,Object.assign({method:'POST',body:JSON.stringify({})},hdr()))
    .then(function(r){return r.json();})
    .then(function(d){ if(!d.ok)throw new Error(); if(btn){btn.textContent='✓ تم الإرسال';btn.style.background='var(--green)';} toast('وصله التذكير ✓','success'); })
    .catch(function(){ toast('تعذّر الإرسال','error'); if(btn){btn.disabled=false;btn.textContent='🔔 تذكير داخل المنصة';} });
}

function enterClientAccount(uid){
  fetch(API+'/api/admin/users/'+uid+'/magic-link',hdr()).then(function(r){return r.json();}).then(function(d){
    if(!d||!d.magic_link){toast((d&&d.message)||'تعذّر توليد الرابط','error');return;}
    var wa='https://wa.me/'+(d.phone_norm||'')+'?text='+encodeURIComponent('رابط الدخول لحسابك في منصة مناقصة (بدون كلمة مرور):\n'+d.magic_link);
    _showProxyDone(d.magic_link, wa);
    toast('افتح الرابط في نافذة متخفّية حتى لا تُخرج نفسك من حساب الإدارة','info');
  }).catch(function(){toast('تعذّر الاتصال','error');});
}
function addProjectForClient(uid){
  var u=_allUsers.find(function(x){return x.id===uid;});if(!u)return;
  openProxyPost();
  var nm=document.getElementById('px-name'); if(nm){nm.value=u.name||'';nm.readOnly=true;nm.style.background='#f1f5f9';}
  var ph=document.getElementById('px-phone'); if(ph){ph.value=u.phone||'';ph.readOnly=true;ph.style.background='#f1f5f9';}
  var em=document.getElementById('px-email'); if(em&&u.email&&!/@manaqasa\.local$/i.test(u.email)){em.value=u.email;}
}
window._pxGeoLat=null; window._pxGeoLng=null;
function _pxParseGeo(){
  var v=(document.getElementById('px-maploc')||{}).value||'';
  var m=v.match(/(-?\d{1,2}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})/);
  var ok=document.getElementById('px-geo-ok');
  if(m){var la=parseFloat(m[1]),ln=parseFloat(m[2]);if(la>=-90&&la<=90&&ln>=-180&&ln<=180){window._pxGeoLat=la;window._pxGeoLng=ln;if(ok)ok.style.display='block';return;}}
  window._pxGeoLat=null;window._pxGeoLng=null;if(ok)ok.style.display='none';
}
function openProxyPost(){
  window._pxGeoLat=null; window._pxGeoLng=null;
  _pxImgs=[]; _pxFiles=[];
  var fin='width:100%;padding:11px 13px;border:1.5px solid var(--border);border-radius:10px;font-family:Tajawal,sans-serif;font-size:13.5px;outline:none;box-sizing:border-box;margin-bottom:10px';
  var cats=(window._CATS&&window._CATS.length)?window._CATS:['تبريد وتكييف','كهرباء','سباكة','نجارة','تنظيف','نقل عفش','حدادة','ألمنيوم','مسابح','كاميرات مراقبة','شبكات وإنترنت','مظلات وسواتر','عزل حراري','مكافحة حشرات','بناء','جبس','كشف تسربات المياه','تنظيف خزانات','دهانات وديكور','تصاميم داخلي وخارجي','تركيب مطابخ','تنسيق حدائق','زجاج ومرايا','بلاط ورخام','تركيب أثاث','أرضيات خشبية وباركيه','تنظيف سجاد وكنب','تركيب وصيانة مصاعد','أبواب وبوابات أوتوماتيكية','ترميم مبانٍ','تنظيف واجهات المباني','حفر آبار ومضخات','أخرى'];
  var cities=['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الظهران','بريدة','عنيزة','الرس','حائل','تبوك','أبها','خميس مشيط','نجران','جازان','الطائف','ينبع','الأحساء','القطيف','الجبيل','عرعر','سكاكا','الباحة','القريات','رفحاء','حفر الباطن','الخرج','المجمعة','الزلفي','شقراء','الدوادمي','القويعية','وادي الدواسر','بيشة','محايل عسير','صبيا','أبو عريش','الليث','القنفذة','رابغ','ضباء','الوجه','تيماء','دومة الجندل','طريف','الأفلاج','حوطة بني تميم','عفيف','الغاط','ثادق','حريملاء','ضرماء','المزاحمية','رماح','الدرعية','الدلم','الحريق','السليل','مرات','ضرما','المذنب','البكيرية','البدائع','رياض الخبراء','عيون الجواء','الأسياح','النبهانية','الشماسية','ضرية','عقلة الصقور','الخبراء','خليص','الجموم','الكامل','تربة','رنية','أضم','بحرة','المويه','الخرمة','العلا','بدر','مهد الذهب','خيبر','الحناكية','العيص','المهد','الخفجي','رأس تنورة','بقيق','النعيرية','قرية العليا','صفوى','سيهات','العوامية','النماص','تثليث','سراة عبيدة','رجال ألمع','ظهران الجنوب','تنومة','بلقرن','أحد رفيدة','المجاردة','الحرجة','قيال','حقل','أملج','البدع','بقعاء','الغزالة','الشنان','السليمي','موقق','الشملي','العويقيلة','صامطة','أحد المسارحة','بيش','فيفاء','ضمد','الدرب','العارضة','الريث','الحرث','شرورة','حبونا','بدر الجنوب','يدمة','ثار','بلجرشي','المندق','المخواة','قلوة','العقيق','القرى','غامد الزناد','طبرجل','صوير'];
  var body='<div style="max-height:70vh;overflow-y:auto;padding:2px">'
    +'<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#1e40af;line-height:1.8">📋 تنشر المشروع <b>نيابة عن العميل بتوكيله</b>. يُنشأ له حساب تلقائياً إن لم يكن مسجّلاً، وتصله العروض على جواله.</div>'
    +'<div style="font-size:12.5px;font-weight:900;color:var(--p);margin-bottom:8px">بيانات العميل</div>'
    +'<input id="px-name" placeholder="اسم العميل / الجهة *" style="'+fin+'">'
    +'<input id="px-phone" placeholder="جوال العميل * (05xxxxxxxx)" inputmode="tel" style="'+fin+'">'
    +'<input id="px-email" placeholder="البريد (اختياري)" style="'+fin+'">'
    +'<div style="font-size:12.5px;font-weight:900;color:var(--p);margin:14px 0 8px">تفاصيل المشروع</div>'
    +'<input id="px-title" placeholder="عنوان المشروع *" style="'+fin+'">'
    +fmtBar('px-desc')
    +'<textarea id="px-desc" rows="6" placeholder="وصف تفصيلي — استخدم أزرار التنسيق أعلاه&#10;مثال:&#10;المطلوب:&#10;- تركيب 4 كاميرات خارجية&#10;- شاشة عرض + تخزين شهر&#10;التفاصيل:&#10;- المبنى دورين&#10;- التنفيذ نهاية الأسبوع" style="'+fin+';resize:vertical;line-height:1.9"></textarea>'
    +'<select id="px-cat" style="'+fin+';cursor:pointer"><option value="">التصنيف *</option>'+cats.map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select>'
    +'<select id="px-city" style="'+fin+';cursor:pointer"><option value="">المدينة *</option>'+cities.map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select>'
    +'<input id="px-budget" type="number" inputmode="numeric" placeholder="الميزانية التقريبية (اختياري)" style="'+fin+'">'
    +'<input id="px-district" placeholder="الحي / الموقع (اختياري)" style="'+fin+'">'
    +'<label style="font-size:12px;color:var(--muted);font-weight:700;display:block;margin:4px 0 4px">مدة استقبال العروض</label>'
    +'<select id="px-closedur" style="'+fin+'"><option value="">افتراضي المنصة</option><option value="7">أسبوع</option><option value="14">أسبوعان</option><option value="30">شهر</option><option value="60">شهران</option><option value="90">3 أشهر</option><option value="120">4 أشهر</option><option value="180">6 أشهر</option></select>'
    +'<input id="px-maploc" placeholder="الموقع على الخريطة (رابط جوجل أو إحداثيات — اختياري)" oninput="_pxParseGeo()" style="'+fin+'">'
    +'<div id="px-geo-ok" style="display:none;font-size:11px;color:#059669;font-weight:700;margin:-4px 0 8px">✓ تم تحديد الموقع على الخريطة</div>'
    +'<div style="font-size:12.5px;font-weight:900;color:var(--p);margin:14px 0 8px">صور وملفات المشروع (اختياري)</div>'
    +'<input type="file" id="px-images" accept="image/*" multiple style="display:none" onchange="_pxPickImages(this)">'
    +'<input type="file" id="px-files" accept=".pdf,.doc,.docx,.xls,.xlsx" multiple style="display:none" onchange="_pxPickFiles(this)">'
    +'<div style="display:flex;gap:8px;margin-bottom:10px">'
      +'<button type="button" onclick="document.getElementById(\'px-images\').click()" style="flex:1;padding:11px;background:var(--bg);border:1.5px dashed var(--border);border-radius:10px;font-family:Tajawal,sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;color:var(--muted)">🖼️ إضافة صور</button>'
      +'<button type="button" onclick="document.getElementById(\'px-files\').click()" style="flex:1;padding:11px;background:var(--bg);border:1.5px dashed var(--border);border-radius:10px;font-family:Tajawal,sans-serif;font-size:12.5px;font-weight:700;cursor:pointer;color:var(--muted)">📎 إضافة ملفات</button>'
    +'</div>'
    +'<div id="px-preview" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:6px"></div>'
    +'</div>';
  body += '<div style="display:flex;gap:9px;margin-top:14px">'
    +'<button onclick="closeModal(\'userModal\')" style="flex:1;padding:12px;background:var(--bg);border:1px solid var(--border);border-radius:10px;font-family:Tajawal,sans-serif;font-size:13.5px;font-weight:700;cursor:pointer">إلغاء</button>'
    +'<button id="px-save" onclick="submitProxyPost()" style="flex:1.4;padding:12px;background:var(--p);color:#fff;border:none;border-radius:10px;font-family:Tajawal,sans-serif;font-size:13.5px;font-weight:800;cursor:pointer">إرسال للمراجعة</button>'
    +'</div>';
  document.getElementById('um-title').textContent='نشر مشروع بالوكالة';
  document.getElementById('um-body').innerHTML=body;
  document.getElementById('userModal').classList.add('show');
}
function submitProxyPost(){
  var g=function(id){return (document.getElementById(id)||{}).value||'';};
  var data={client_name:g('px-name').trim(),client_phone:g('px-phone').trim(),client_email:g('px-email').trim(),
            title:g('px-title').trim(),description:g('px-desc').trim(),category:g('px-cat'),city:g('px-city'),
            budget_max:parseFloat(g('px-budget'))||null,
            district:g('px-district').trim()||null,geo_lat:window._pxGeoLat||null,geo_lng:window._pxGeoLng||null,close_days:parseInt(g('px-closedur'))||0};
  if(_pxImgs.length)data.images=_pxImgs;
  if(_pxFiles.some(function(f){return f.up;})){toast('انتظر حتى يكتمل رفع الملفات','error');return;}
  if(_pxFiles.length)data.attachments=_pxFiles.map(function(f){return f.url?{name:f.name,url:f.url}:{name:f.name,data:f.data};});
  if(!data.client_name||!data.client_phone){toast('اسم وجوال العميل مطلوبان','error');return;}
  if(!data.title||!data.category||!data.city){toast('عنوان المشروع والتصنيف والمدينة مطلوبة','error');return;}
  var btn=document.getElementById('px-save'); if(btn){btn.disabled=true;btn.textContent='جاري النشر...';}
  fetch(API+'/api/admin/proxy-request',Object.assign({method:'POST',body:JSON.stringify(data)},hdr()))
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok)throw new Error(d.message||'فشل');
      closeModal('userModal');
      toast('تم إرسال المشروع للمراجعة'+(d.is_new_client?' وإنشاء حساب للعميل':'')+' ✓','success');
      var _entry=d.magic_link||('https://manaqasa.com/project/m-'+d.request_id+'?id='+d.request_id);
      var wa='https://wa.me/'+d.phone_norm+'?text='+encodeURIComponent('السلام عليكم، استلمنا مشروعك «'+data.title+'» في منصة مناقصة ✓\nهو الآن قيد المراجعة، وسيُنشر للمنفذين فور اعتماده وتصلك عروضهم.\n\nلمتابعة مشروعك، ادخل من الرابط التالي مباشرة (بدون كلمة مرور):\n'+_entry);
      _showProxyDone(_entry, wa);
      loadRequests();
    })
    .catch(function(e){ toast(e.message||'تعذّر النشر','error'); if(btn){btn.disabled=false;btn.textContent='إرسال للمراجعة';} });
}

var REVIEW_REASONS=[
  {k:'نقص الوصف',v:'وضّح تفاصيل المطلوب بدقة أكبر.'},
  {k:'لا يوجد مخطط',v:'أرفق مخطط المشروع أو صورة توضيحية.'},
  {k:'الموقع غير واضح',v:'حدّد موقع المشروع أو معلماً قريباً.'},
  {k:'الكمية/المساحة',v:'حدّد الكمية أو المساحة المطلوبة.'},
  {k:'نوع/مواصفات',v:'وضّح النوع أو المواصفات المطلوبة.'},
  {k:'الوقت المناسب',v:'وضّح الوقت المناسب للتنفيذ.'}
];
function reasonChips(t){return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">'+REVIEW_REASONS.map(function(r,i){return '<button type="button" onclick="addReason(\''+t+'\','+i+')" style="background:#fff7ed;color:#c2410e;border:1px solid #fed7aa;border-radius:20px;padding:5px 11px;font-family:Tajawal,sans-serif;font-size:11.5px;font-weight:800;cursor:pointer">+ '+esc(r.k)+'</button>';}).join('')+'</div>';}
var APPROVE_TIPS=[
  {k:'أرفق المخططات',v:'إرفاق المخططات يساعد المنفّذين على تسعير أدق.'},
  {k:'وضّح الميزانية',v:'تحديد ميزانية تقريبية يجذب عروضاً أنسب.'},
  {k:'حدّد المدة',v:'توضيح الوقت المناسب للتنفيذ يسرّع العروض.'},
  {k:'أضف صوراً',v:'إضافة صور للموقع أو الوضع الحالي تعطي المنفّذ تصوّراً أوضح.'}
];
function tipChips(t){return '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0">'+APPROVE_TIPS.map(function(r,i){return '<button type="button" onclick="addTip(\''+t+'\','+i+')" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;padding:5px 11px;font-family:Tajawal,sans-serif;font-size:11.5px;font-weight:800;cursor:pointer">💡 '+esc(r.k)+'</button>';}).join('')+'</div>';}
function addTip(t,i){var ta=document.getElementById(t);if(!ta||!APPROVE_TIPS[i])return;var txt=APPROVE_TIPS[i].v;var cur=(ta.value||'').trim();if(cur.indexOf(txt)>=0){ta.focus();return;}ta.value=(cur?cur+'\n':'')+'- '+txt;ta.focus();}
function addReason(t,i){var ta=document.getElementById(t);if(!ta||!REVIEW_REASONS[i])return;var txt=REVIEW_REASONS[i].v;var cur=(ta.value||'').trim();if(cur.indexOf(txt)>=0){ta.focus();return;}ta.value=(cur?cur+'\n':'')+'- '+txt;ta.focus();}
function showWaFollowup(link){if(!link)return;var a=document.getElementById('wa-follow-link');if(a)a.href=link;var m=document.getElementById('waFollowModal');if(m)m.classList.add('show');}
var OW_PRESETS=[
  {t:'خارج نطاق الخدمة',m:'تنبيه: نرجو تقديم العروض فقط للمشاريع الواقعة في المدن التي تقدمون فيها خدماتكم. وذلك لضمان وصول العروض للمشاريع المناسبة، وزيادة فرص اختياركم من قبل صاحب المشروع، وتجنب تقديم عروض على مشاريع خارج نطاق خدمتكم.'},
  {t:'تذكير ودّي (أول مخالفة)',m:'مرحباً، لاحظنا تقديمكم عرضاً على مشروع خارج مدن خدمتكم. لتحصلوا على أفضل النتائج، ننصح بالتركيز على المشاريع ضمن نطاقكم. ولو كنتم تخدمون مدناً إضافية، حدّثوا «مدن الخدمة» في ملفكم.'},
  {t:'تحديث الملف',m:'نرجو تحديث «مدن الخدمة» في ملفكم لتظهر لكم المشاريع المناسبة تلقائياً، وتصل عروضكم لأصحاب المشاريع الصحيحين.'},
  {t:'عروض عشوائية',m:'نرجو تقديم عروض جادّة ومدروسة مع سعر وتفاصيل واضحة. العروض العشوائية أو المكررة تُضعف فرصكم وقد تؤدي لتقييد الحساب.'},
  {t:'تحذير أخير',m:'هذا تنبيه أخير بخصوص تقديم عروض خارج نطاق خدمتكم بشكل متكرر. الاستمرار قد يؤدي إلى تقييد حسابكم مؤقتاً. نقدّر التزامكم.'}
];
var _owFlags=[], _owFlagId=null;
var _engList=[];
function loadEngBadge(){
  fetch(API+'/api/admin/engagement',hdr()).then(function(r){return r.json();}).then(function(l){
    _loadFresh();
  }).catch(function(){});
}
var _rbList=[];
function openNotifyBidders(){
  document.getElementById('notifyBiddersModal').classList.add('show');
  var host=document.getElementById('nb-list');host.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/real-bidders',hdr()).then(function(r){return r.json();}).then(function(list){
    if(!Array.isArray(list)){host.innerHTML=emptyState('تعذر التحميل');return;}
    _rbList=list;
    if(!list.length){host.innerHTML=emptyState('لا يوجد مزوّدون بعروض حقيقية حالياً');return;}
    host.innerHTML='<div style="font-size:12px;font-weight:800;color:#334155;margin-bottom:8px">'+list.length+' مزوّد:</div>'+list.map(function(p){
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--border)">'
        +'<div><span style="font-weight:700;font-size:13px">'+esc(p.provider_name||'مزوّد')+'</span> <span style="font-size:11px;color:var(--muted)">('+(parseInt(p.real_offers)||0)+' عرض)</span></div>'
        +'<button class="act-btn ab-default" style="color:#059669;border-color:#a7f3d0;padding:5px 11px;font-size:11px" onclick="rbWa('+p.provider_id+')">واتساب</button>'
      +'</div>';
    }).join('');
  }).catch(function(){host.innerHTML=emptyState('تعذر التحميل');});
}
function rbWa(pid){
  var p=(_rbList||[]).find(function(x){return x.provider_id===pid;});
  var ph=_waNorm(p&&p.provider_phone);
  if(!ph){toast('لا يوجد رقم واتساب صالح','error');return;}
  var msg='🎉 خبر يهمك من منصة مناقصة: عروضك الحقيقية صارت تتيح لك التواصل المباشر (اتصال + واتساب) مع أصحاب المشاريع! افتح المشروع أو «مشاريعي وعروضي» وبتلقى أزرار التواصل مفتوحة.';
  window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(msg),'_blank');
}
function notifyAllBidders(){
  var btn=document.getElementById('nb-sendall');if(btn){btn.disabled=true;btn.textContent='...جاري الإرسال';}
  fetch(API+'/api/admin/notify-real-bidders',Object.assign({method:'POST'},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){if(btn){btn.disabled=false;btn.textContent='📩 إرسال إشعار + إيميل للكل';}if(!res.ok){toast((res.d&&res.d.message)||'تعذّر الإرسال','error');return;}toast('تم إرسال التنبيه لـ'+(res.d.sent||0)+' مزوّد ✓','success');})
    .catch(function(){if(btn){btn.disabled=false;btn.textContent='📩 إرسال إشعار + إيميل للكل';}toast('تعذّر الاتصال','error');});
}
var _clList=[],_cuD=null,_cuDays=30,_cuF=null;
var _CU_OC={won:['✓ رسى على مزوّد فتح الرقم','#dcfce7','#15803d'],other:['رسى على مزوّد آخر','#f1f5f9','#475569'],risk:['⚠️ انقفل بدون ترسية','#fee2e2','#b91c1c'],open:['مفتوح للعروض','#e0f2fe','#0369a1']};
function loadContactLog(days){
  if(typeof days==='number')_cuDays=days; else if(_cuDays==null)_cuDays=30;
  var host=document.getElementById('contactlog-list');if(!host)return;
  var sg=document.getElementById('cu-seg'); if(sg)sg.innerHTML='<div class="br-seg">'+[[7,'7 أيام'],[30,'30 يوم'],[90,'3 شهور'],[0,'الكل']].map(function(x){return '<button type="button" class="'+(x[0]===_cuDays?'on':'')+'" onclick="loadContactLog('+x[0]+')">'+x[1]+'</button>';}).join('')+'</div>';
  if(!host.querySelector('.cu-ks'))host.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  var to=new Date(Date.now()+3*3600000), f=function(d){return d.toISOString().slice(0,10);};
  var qs=_cuDays?('from='+f(new Date(to.getTime()-(_cuDays-1)*86400000))+'&to='+f(to)):'all=1&to='+f(to);
  fetch(API+'/api/admin/contact-unlocks?'+qs,hdr()).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d||!d.totals){host.innerHTML=emptyState('تعذر التحميل');return;}
    _cuD=d; _clList=d.projects||[]; if(_cuF==null)_cuF=(d.totals.risk?'risk':'all');
    _cuPaint();
  }).catch(function(){host.innerHTML=emptyState('تعذر التحميل');});
}
function _cuPaint(){
  var host=document.getElementById('contactlog-list'), d=_cuD; if(!host||!d)return;
  var t=d.totals, tot=t.opens||0;
  var k=function(l,n,s,c){return '<div class="br-k'+(c?' '+c:'')+'"><span class="l">'+l+'</span><b>'+n+'</b><span class="s">'+s+'</span></div>';};
  var pc=function(n){return tot?Math.round(n/tot*100):0;};
  var h='<div class="br-ks cu-ks">'
    +k('أرقام انفتحت',fmtNum(tot),'لـ '+fmtNum(t.clients)+' عميل · من '+fmtNum(t.providers)+' مزوّد')
    +k('رست على نفس المزوّد',fmtNum(t.won)+(tot?' <small style="font-size:15px">· '+pc(t.won)+'%</small>':''),'سعيها محمي داخل المنصة','g')
    +k('خطر تسريب',fmtNum(t.risk),'المشروع انقفل بدون ترسية بعد ما انفتح الرقم',t.risk?'r':'')
    +k('سعي محمي',fmtNum(t.saai_protected)+' <small style="font-size:14px">ر.س</small>','من المشاريع اللي رست بعد فتح الرقم','a')+'</div>';
  if(!tot){host.innerHTML=h+'<div class="ad-card" style="padding:34px;text-align:center;color:var(--muted);font-weight:700;margin-top:14px">ما انفتح رقم أي عميل في هالفترة.</div>';return;}
  var seg=[['won','#16a34a','رست على نفس المزوّد'],['other','#94a3b8','رست على مزوّد آخر'],['risk','#dc2626','انقفلت بدون ترسية'],['open','#38bdf8','لسا مفتوحة']];
  h+='<div class="ad-card cu-dist"><div class="cu-dh"><b>وين انتهت الأرقام اللي انفتحت؟</b><span>'+fmtNum(tot)+' رقم</span></div><div class="cu-stk">'
    +seg.map(function(x){var v=t[x[0]]||0;return v?'<i style="width:'+pc(v)+'%;background:'+x[1]+'" title="'+x[2]+': '+v+'"></i>':'';}).join('')+'</div><div class="cu-lg">'
    +seg.map(function(x){return '<span><b style="background:'+x[1]+'"></b>'+x[2]+' '+fmtNum(t[x[0]]||0)+'</span>';}).join('')+'</div></div>';
  var P=_clList, cnt=function(o){return P.filter(function(p){return p.outcome===o;}).length;};
  var chips=[['risk','⚠️ خطر تسريب',cnt('risk')],['gone','🚩 حذف عرضه',P.filter(function(p){return p.gone;}).length],['all','الكل',P.length],['won','رست عليه',cnt('won')],['open','مفتوحة',cnt('open')],['other','رست على غيره',cnt('other')]];
  h+='<div class="cu-2"><div class="ad-card cu-list"><div class="cu-bar"><div class="cu-chips">'+chips.map(function(c){return '<button type="button" class="cu-chip'+(c[0]===_cuF?' on':'')+(c[0]==='risk'?' rk':'')+'" onclick="_cuF=\''+c[0]+'\';_cuPaint()">'+c[1]+' '+c[2]+'</button>';}).join('')+'</div>'
    +'<input id="cl-search" class="cu-srch" oninput="clSearch()" placeholder="🔍 مزوّد، عميل، أو مشروع…"></div><div id="cl-cards"></div></div>';
  var pv=d.providers||[], mx=Math.max.apply(null,pv.map(function(x){return x.opens;}).concat([1]));
  h+='<div class="cu-side"><div class="ad-card"><b style="font-size:14px">مزوّدين يستحقون المتابعة</b><div class="cu-sub">فتحوا أرقام كثير — كم منها رسى عليهم في المنصة؟</div>'
    +(pv.length?pv.map(function(p){var col=p.won===0?'#dc2626':(p.won/p.opens<.3?'#f59e0b':'#16a34a');var ph=_waNorm(p.phone);
      return '<div class="cu-lb"><div style="flex:1;min-width:0"><div class="cu-lt"><button type="button" class="br-nm" onclick="gsOpenUser('+_jsa(p.email||'')+')">'+esc(p.name||'—')+'</button><span style="color:'+col+'">'+p.opens+' رقم · '+p.won+' ترسية</span></div><div class="cu-b"><i style="width:'+Math.round(p.opens/mx*100)+'%;background:'+col+'"></i></div></div>'
        +(ph?'<a class="cu-ic" href="https://wa.me/'+ph+'" target="_blank" rel="noopener" title="واتساب">💬</a>':'')+'</div>';}).join(''):'<div class="cu-sub" style="margin:8px 0 0">ما فيه مزوّد فتح 3 أرقام أو أكثر في هالفترة.</div>')
    +'</div><div class="br-note">«اسأل العميل» يفتح واتساب برسالة جاهزة تسأله إذا اتفق مع أحد. «ذكّر المزوّدين» يرسل لهم إشعار: «تعاملت معه؟ وثّق المشروع واحصل على تقييمه» — وإذا وثّقوه وأكّده العميل يدخل «مشاريع موثّقة» بسعيه.</div></div></div>';
  host.innerHTML=h; clSearch();
}
function _clRenderCards(list){
  var box=document.getElementById('cl-cards');if(!box)return;
  if(!list.length){box.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted);font-weight:700">'+(_cuF==='risk'?'ما فيه مشاريع انقفلت بدون ترسية بعد فتح الرقم 👌':'لا نتائج')+'</div>';return;}
  box.innerHTML=list.slice(0,150).map(function(p){
    var oc=_CU_OC[p.outcome]||_CU_OC.open, risk=p.outcome==='risk';
    var provs=p.provs.map(function(v){var ph=_waNorm(v.phone);return '<'+(ph?'a href="https://wa.me/'+ph+'" target="_blank" rel="noopener" title="واتساب '+esc(v.name||'')+'"':'span')+' class="cu-pv"><i>'+esc((v.name||'م').charAt(0))+'</i>'+esc(v.name||'—')+'<small>· '+fmtDate(v.at)+'</small>'+(v.won?'<b>✓ رسى عليه</b>':'')+(v.bid_gone?(v.gone_by==='admin'?'<b style="color:#64748b">العرض حذفته الإدارة</b>':'<b style="color:#dc2626">⚠️ حذف عرضه بعد ما أخذ الرقم</b>'):'')+'</'+(ph?'a':'span')+'>';}).join('');
    var cph=_waNorm(p.client_phone), acts='';
    if(p.outcome==='risk'||p.outcome==='open'){
      if(cph)acts+='<a class="act-btn ab-default cu-w" href="https://wa.me/'+cph+'?text='+encodeURIComponent('السلام عليكم '+(p.client_name||'')+'،\nمعك منصة مناقصة بخصوص مشروعك «'+(p.title||'')+'». هل اتفقت مع أحد من المزوّدين اللي قدّموا عروضهم؟ إذا تم، نقدر نوثّق المشروع ونفتح لك تقييم المزوّد.')+'" target="_blank" rel="noopener">💬 اسأل العميل</a>';
      acts+='<button class="act-btn ab-default" onclick="_cuRemind('+(parseInt(p.request_id)||0)+',this)"'+(p.reminded_at&&(Date.now()-new Date(p.reminded_at))<864e5?' disabled title="ذكّرتهم اليوم"':'')+'>🔔 ذكّر المزوّدين</button>';
    } else if(p.outcome==='won') acts='<button class="act-btn ab-default" onclick="_gtGo(\'saai\')">فتح السعي</button>';
    return '<div class="cu-pj'+(risk?' rk':'')+'"><div style="flex:1;min-width:0"><div class="cu-t"><button type="button" class="br-nm" onclick="gsOpenReq('+(parseInt(p.request_id)||0)+')">'+esc(p.title||'مشروع')+'</button><span class="br-p" style="background:'+oc[1]+';color:'+oc[2]+'">'+oc[0]+'</span></div>'
      +'<div class="cu-m">العميل: '+esc(p.client_name||'—')+(p.city?' · '+esc(p.city):'')+' · آخر فتح '+_adAgo(p.last_at)+(p.reminded_at?' · ذكّرناهم '+_adAgo(p.reminded_at):'')+'</div><div class="cu-pvs">'+provs+'</div></div>'
      +(acts?'<div class="cu-acts">'+acts+'</div>':'')+'</div>';
  }).join('')+(list.length>150?'<div style="padding:12px;text-align:center;color:var(--muted);font-size:12.5px;font-weight:700">يعرض أول 150 — استخدم البحث</div>':'');
}
function clSearch(){
  var q=((document.getElementById('cl-search')||{}).value||'').trim().toLowerCase();
  var L=_clList.filter(function(p){return _cuF==='all'||(_cuF==='gone'?p.gone:p.outcome===_cuF);});
  if(q)L=L.filter(function(p){return ((p.title||'')+' '+(p.client_name||'')+' '+p.provs.map(function(v){return v.name||'';}).join(' ')).toLowerCase().indexOf(q)>=0;});
  _clRenderCards(L);
}
function _cuRemind(rid,btn){ if(btn)btn.disabled=true;
  fetch(API+'/api/admin/contact-unlocks/'+rid+'/remind',Object.assign({method:'POST'},hdr())).then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});})
    .then(function(x){ toast(x.ok?('تم تذكير '+x.d.sent+' مزوّد'):(x.d.message||'تعذّر'),x.ok?'success':'error'); if(x.ok){var p=_clList.filter(function(z){return z.request_id===rid;})[0];if(p)p.reminded_at=new Date().toISOString();} else if(btn)btn.disabled=false; })
    .catch(function(){ if(btn)btn.disabled=false; toast('تعذّر الاتصال','error'); });
}
function clWa(id){
  var c=(_clList||[]).find(function(x){return x.id===id;});
  var ph=_waNorm(c&&c.provider_phone);
  if(!ph){toast('لا يوجد رقم واتساب صالح','error');return;}
  var msg='السلام عليكم، بخصوص تواصلك مع صاحب مشروع عبر منصة مناقصة — نذكّرك بأن رسوم المنصة (٣٪) تُطبَّق عند إتمام الاتفاق. شكراً لالتزامك 🌟';
  window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(msg),'_blank');
}
function loadEngagement(){
  var host=document.getElementById('engagement-list');if(!host)return;
  host.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/engagement',hdr()).then(function(r){return r.json();}).then(function(list){
    if(!Array.isArray(list)){host.innerHTML=emptyState('تعذر التحميل');return;}
    _engList=list;
    _adSeen('engagement');
    var cnt=document.getElementById('ow-eng-count');if(cnt)cnt.textContent=list.length?(list.length+' شخص لم يتفاعل'):'';
    if(!list.length){host.innerHTML=emptyState('الكل تفاعلوا مع تنبيهاتهم 🎉');return;}
    host.innerHTML=list.map(function(u){
      var bids=parseInt(u.bids)||0, msgs=parseInt(u.messages)||0, rem=parseInt(u.reminders_sent)||0;
      var parts=[]; if(msgs)parts.push('📩 '+msgs+' رسالة'); if(bids)parts.push('💼 '+bids+' عرض');
      var ignored=rem>=5;
      var remInfo = rem?('<span style="color:#c2410e;font-weight:700"> · أُرسل له '+rem+' تذكير</span>'):'';
      var ignoredBadge = ignored?'<span class="badge b-rej" style="white-space:nowrap">🔴 متجاهل</span>':'';
      return '<div class="card" id="eng-'+u.user_id+'" style="margin-bottom:10px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'
          +'<div><span style="font-weight:800;font-size:14px">'+esc(u.user_name||'مستخدم')+'</span> <span style="font-size:11px;color:var(--muted);font-weight:600">'+(u.user_role==='provider'?'مزوّد':'عميل')+'</span>'
            +'<div style="font-size:12.5px;color:var(--red);font-weight:800;margin-top:3px">● لم يفتح: '+parts.join(' + ')+remInfo+'</div></div>'
          +(ignoredBadge||'')
        +'</div>'
        +'<div style="display:flex;gap:9px;margin-top:11px">'
          +'<button class="act-btn ab-default" style="color:#1d4ed8;border-color:#bfdbfe" onclick="openEngRemind('+u.user_id+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>تذكير</button>'
          +'<button class="act-btn ab-default" style="color:#059669;border-color:#a7f3d0" onclick="engWa('+u.user_id+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>واتساب</button>'
        +'</div>'
      +'</div>';
    }).join('');
  }).catch(function(){host.innerHTML=emptyState('تعذر التحميل');});
}
var ENG_PRESETS=[
  {t:'ودّي',m:'👋 لديك رسائل وعروض بانتظارك، ادخل وتفاعل معها لتصلك أفضل النتائج.'},
  {t:'تحفيزي',m:'⏰ عروضك ورسائلك تنتظرك! المزوّدون بانتظار ردّك — سرعة تفاعلك ترفع فرصك في أفضل صفقة.'},
  {t:'تذكير أخير',m:'تنبيه: لديك رسائل وعروض لم تفتحها منذ فترة. ننصح بالدخول والتفاعل معها حتى لا تفوتك الفرص المناسبة.'}
];
var _engRid=null;
function openEngRemind(uid){
  _engRid=uid;
  var u=(_engList||[]).find(function(x){return x.user_id===uid;});
  document.getElementById('eng-r-name').textContent='إلى: '+((u&&u.user_name)||'المستخدم');
  var sel=document.getElementById('eng-r-preset');
  if(sel){sel.innerHTML=ENG_PRESETS.map(function(p,i){return '<option value="'+i+'">'+esc(p.t)+'</option>';}).join('')+'<option value="custom">✏️ نص مخصّص</option>';sel.value='0';}
  document.getElementById('eng-r-msg').value=ENG_PRESETS[0].m;
  document.getElementById('eng-r-notify').checked=true;
  document.getElementById('eng-r-email').checked=false;
  document.getElementById('engRemindModal').classList.add('show');
}
function _engPreset(){var v=document.getElementById('eng-r-preset').value;if(v==='custom'){var t=document.getElementById('eng-r-msg');t.value='';t.focus();return;}var p=ENG_PRESETS[parseInt(v)];if(p)document.getElementById('eng-r-msg').value=p.m;}
function sendEngRemind(){
  var msg=(document.getElementById('eng-r-msg').value||'').trim();
  var doNotify=document.getElementById('eng-r-notify').checked, doEmail=document.getElementById('eng-r-email').checked;
  if(!doNotify&&!doEmail){toast('اختر قناة واحدة على الأقل','error');return;}
  if(!msg){toast('اكتب نص التذكير','error');return;}
  var btn=document.getElementById('eng-r-send');if(btn){btn.disabled=true;btn.textContent='...جاري الإرسال';}
  fetch(API+'/api/admin/engagement/'+_engRid+'/remind',Object.assign({method:'POST',body:JSON.stringify({notify:doNotify,email:doEmail,message:msg})},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){if(btn){btn.disabled=false;btn.textContent='📣 أرسل التذكير';}if(!res.ok){toast((res.d&&res.d.message)||'تعذّر الإرسال','error');return;}toast('تم إرسال التذكير ✓','success');closeModal('engRemindModal');loadEngagement();})
    .catch(function(){if(btn){btn.disabled=false;btn.textContent='📣 أرسل التذكير';}toast('تعذّر الاتصال','error');});
}
function _waNorm(p){if(!p)return null;var d=(''+p).replace(/[^\d]/g,'');if(d.indexOf('00966')===0)d=d.slice(2);else if(d.indexOf('966')===0){}else if(d.indexOf('05')===0)d='966'+d.slice(1);else if(d.length===9&&d.charAt(0)==='5')d='966'+d;else if(d.charAt(0)==='0')d='966'+d.slice(1);if(d.indexOf('966')!==0)return null;var r=d.slice(3);if(r.length!==9||r.charAt(0)!=='5')return null;return d;}
function engWa(uid){var u=(_engList||[]).find(function(x){return x.user_id===uid;});var ph=_waNorm(u&&u.user_phone);if(!ph){toast('لا يوجد رقم واتساب صالح لهذا المستخدم','error');return;}var msg='السلام عليكم، لديك رسائل وعروض بانتظارك في منصة مناقصة — ادخل وتفاعل معها.';window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(msg),'_blank');}
// ═══ مراقبة العروض: بلاغات العملاء + الكشف التلقائي + تحت المراجعة قبل النشر ═══
var _owRSel={};
var _owCur='all', _owCounts={}, _owRep=[], _owHeld=null, _owDetCur=null;
function loadOfferWatch(){ _owLoadCounts(); _owTab(_owCur); }
function _owLoadCounts(cb){
  fetch(API+'/api/admin/bid-watch-counts',hdr()).then(function(r){return r.json();}).then(function(c){
    _owCounts=c||{}; _owTabsRender(); _owBadge(); if(cb)cb();
  }).catch(function(){});
}
function _owBadge(){
  var n=(parseInt(_owCounts.held)||0)+(_FRESH?(parseInt(_FRESH.bid_report_providers)||0)+(parseInt(_FRESH.flags)||0):(parseInt(_owCounts.report_providers)||0));
  var b=document.getElementById('offerwatch-badge');if(b){b.textContent=n;b.style.display=n?'flex':'none';}
}
function _owTabsRender(){
  var host=document.getElementById('ow-tabs');if(!host)return;
  var c=_owCounts||{};
  var T=[['all','الكل',(parseInt(c.held)||0)+(parseInt(c.report_providers)||0)+(parseInt(c.flags)||0)],['held','معلّقة قبل النشر',c.held],['reports','بلاغات العملاء',c.report_providers],['auto','رصد تلقائي',c.flags],['done','تمت معالجتها',null]];
  host.innerHTML=T.map(function(t){var on=_owCur===t[0];var hot=(t[0]==='held'&&t[2]);
    return '<button class="ow-tab'+(on?' on':'')+'" onclick="_owTab(\''+t[0]+'\')">'+t[1]+(t[2]!=null?' · <b'+(hot&&!on?' style="color:#dc2626"':'')+'>'+(t[2]||0)+'</b>':'')+'</button>';}).join('');
}
function _owTab(t){
  _owCur=t; _owTabsRender();
  ['all','reports','auto','held','done'].forEach(function(k){var p=document.getElementById('ow-t-'+k);if(p)p.style.display=(k===t||(k==='reports'&&t==='done'))?'':'none';});
  if(t==='all')_owLoadAll();
  else if(t==='auto')loadOfferFlags();
  else if(t==='held')_owLoadHeld();
  else _owLoadReports();
}
var OW_RS_COL={spam:['#fff7ed','#c2410c'],scope:['#eff6ff','#1d4ed8'],price:['#fefce8','#a16207'],abuse:['#fef2f2','#b91c1c']};
var OW_RS_SHORT={spam:'عشوائي/منسوخ',scope:'خارج التخصص',price:'سعر غير منطقي',abuse:'إساءة أو إزعاج'};
function _owPill(t,bg,fg){return '<span style="display:inline-block;font-size:11px;font-weight:900;padding:3px 10px;border-radius:999px;white-space:nowrap;background:'+bg+';color:'+fg+'">'+t+'</span>';}
function _owState(p){
  var pc=(p.open_reports===0&&p.pending_close>0)?' · بانتظار إغلاقك':'';
  if(p.is_active===false)return _owPill('موقوف'+pc,'#1f2937','#fff');
  if(p.bid_review)return _owPill('عروضه تحت المراجعة'+pc,'#fef3c7','#92400e');
  if(p.open_reports===0&&p.dismissed>=p.reports)return _owPill('البلاغات غير صحيحة','#f1f5f9','#475569');
  if(p.bid_warned_at)return _owPill('أُرسل له تنبيه'+pc,'#eff6ff','#1d4ed8');
  if(pc)return _owPill('تم الإجراء'+pc,'#f0fdf4','#15803d');
  return _owPill('جديد','#fef2f2','#b91c1c');
}
function _owLoadReports(){
  if(_owCur==='all'){_owLoadAll();return;}
  var host=document.getElementById('ow-t-reports');if(!host)return;
  host.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/bid-reports',hdr()).then(function(r){return r.json();}).then(function(list){
    if(!Array.isArray(list)){host.innerHTML=emptyState('تعذر التحميل');return;}
    _owRep=list;
    var done=_owCur==='done';
    var arr=list.filter(function(p){var live=p.open_reports>0||p.pending_close>0;return done?!live:live;});
    if(!done)_adSeen('bidrep'); window._owRArr=arr; _owRSel={};
    if(!arr.length){host.innerHTML=emptyState(done?'ما فيه بلاغات معالجة بعد':'ما فيه بلاغات جديدة من العملاء 🎉');return;}
    host.innerHTML=(done?'':'<div class="ow-rbar" id="ow-rbar"></div>')+'<div class="card" style="padding:0;overflow:hidden">'
      +'<div class="ow-rw ow-hdw">'+(done?'':'<span class="ow-ckw"></span>')+'<div class="ow-row ow-hd"><span>المزوّد</span><span>البلاغات</span><span>من عملاء</span><span>الأسباب</span><span>الحالة</span></div></div>'
      +arr.map(function(p){
        var nm=p.business_name||p.name||'مزوّد';
        var rs=(p.reasons||[]).map(function(x){var c=OW_RS_COL[x.key]||['#f1f5f9','#475569'];return _owPill(esc(OW_RS_SHORT[x.key]||x.label)+' · '+x.n,c[0],c[1]);}).join(' ');
        return '<div class="ow-rw" id="owr-'+p.id+'">'+(done?'':'<span class="ow-ckw"><input type="checkbox" aria-label="تحديد" onchange="_owRSelOne('+p.id+',this.checked)"></span>')+'<button class="ow-row" onclick="_owRepOpen('+p.id+')">'
          +'<span style="display:flex;align-items:center;gap:10px;min-width:0"><span class="ow-av">'+esc(nm.charAt(0))+'</span><span style="min-width:0"><b style="display:block;font-size:14px">'+esc(nm)+'</b><small style="color:var(--muted);font-weight:700;font-size:11.5px">'+_fuN(p.bids_30d,'عرض واحد','عرضين','عروض','عرض')+' خلال شهر'+(p.city?' · '+esc(p.city):'')+'</small></span></span>'
          +'<span class="ow-num">'+p.reports+'</span><span class="ow-num">'+p.clients+'</span>'
          +'<span style="display:flex;gap:4px;flex-wrap:wrap">'+rs+'</span><span>'+_owState(p)+'</span></button></div>';
      }).join('')+'</div>'
      +'<div class="ow-foot">العقوبات تلقائية ومتدرجة: بلاغين من عميلين مختلفين ← تنبيه للمزوّد · 3 عملاء خلال 30 يوم ← عروضه الجديدة تنتظر موافقتك قبل ما تظهر (مهلة 7 ساعات ثم تنعتمد تلقائياً) · الإيقاف قرارك أنت. العميل الواحد ينحسب مرة وحدة لكل مزوّد. «البلاغات غير صحيحة» يلغي أثرها.</div>';
    _owRBar();
  }).catch(function(){host.innerHTML=emptyState('تعذر التحميل');});
}
function _owRBar(){ var b=document.getElementById('ow-rbar'); if(!b)return; var A=window._owRArr||[], n=A.filter(function(p){return _owRSel[p.id];}).length;
  b.innerHTML='<label class="sel-all"><input type="checkbox" '+(n&&n===A.length?'checked':'')+' onchange="_owRSelAll(this.checked)"> تحديد الكل ('+A.length+')</label>'
    +(n?'<button class="act-btn ab-default" style="color:#15803d;border-color:#bbf7d0" onclick="_owRClose(false)">✓ شيل المحدد من القائمة ('+n+')</button>':'')
    +'<button class="act-btn ab-default" style="color:#dc2626;border-color:#fecaca;margin-inline-start:auto" onclick="_owRClose(true)">🗑️ شيل الكل وابدأ من جديد</button>'; }
function _owRSelOne(id,on){ if(on)_owRSel[id]=1; else delete _owRSel[id]; var r=document.getElementById('owr-'+id); if(r)r.classList.toggle('ow-sel',!!on); _owRBar(); }
function _owRSelAll(on){ _owRSel={}; (window._owRArr||[]).forEach(function(p){ if(on)_owRSel[p.id]=1; var r=document.getElementById('owr-'+p.id); if(r){r.classList.toggle('ow-sel',!!on); var k=r.querySelector('input'); if(k)k.checked=!!on;} }); _owRBar(); }
async function _owRClose(all){ var ids=(window._owRArr||[]).filter(function(p){return _owRSel[p.id];}).map(function(p){return p.id;}); if(!all&&!ids.length)return;
  if(!await askConfirm({title:all?'شيل كل البلاغات':'شيل من القائمة',message:(all?'كل البلاغات':ids.length+' مزوّد')+' تنتقل لـ«تمت معالجتها». العقوبات اللي سويتها (تنبيه/مراجعة/إيقاف) تبقى زي ما هي.',confirmText:'تأكيد',safe:true}))return;
  fetch(API+'/api/admin/bid-reports/close',Object.assign({method:'POST',body:JSON.stringify(all?{all:true}:{ids:ids})},hdr())).then(function(r){return r.json();}).then(function(d){ if(!d||!d.ok){toast((d&&d.message)||'تعذّر','error');return;} toast('انشال '+d.n+' بلاغ ✓','success'); _owLoadReports(); _owLoadCounts(); }).catch(function(){toast('تعذّر الاتصال','error');}); }
function _owHl(t){ return esc(t||'').replace(/\(([^)]{0,60})\)/g,'<mark class="ow-blank">($1)</mark>'); }
// رسالة واتساب جاهزة للمزوّد حسب الإجراء
function _owWaLink(u,kind){ var ph=_waNorm(u&&u.phone); if(!ph)return ''; var nm=(u.business_name||u.name||'').trim();
  var hi='السلام عليكم '+nm+'، معك إدارة منصة مناقصة 👋\n\n', tips='\n\nعشان تزيد فرصك بالترسية:\n• اذكر تفاصيل من وصف المشروع نفسه (المساحة، المواد، المدة)\n• عبّ أي فراغ في النص قبل الإرسال\n• قدّم على المشاريع اللي في تخصصك ومدينتك بس\n• وضّح وش يشمل السعر ووش ما يشمل';
  var M={
    warn:hi+'وصلتنا ملاحظات من أصحاب مشاريع إن بعض عروضك عامة ومتشابهة وما تخص مشاريعهم.'+tips+'\n\nلو استمرت البلاغات، عروضك الجديدة بتنتظر مراجعة الإدارة قبل ما تظهر للعملاء.\nنتمنى لك التوفيق 🌷',
    review:hi+'بسبب بلاغات متكررة إن عروضك عامة وما تخص المشاريع، صارت عروضك الجديدة تمر على مراجعة الإدارة قبل ما تظهر للعملاء (خلال ساعات).'+tips+'\n\nأول ما تتحسن عروضك نرفع المراجعة 👍',
    lift:hi+'رفعنا المراجعة عن عروضك ✅ وعروضك الجديدة ترجع تظهر للعملاء مباشرة.\nشكراً على التحسين، واستمر بكتابة عرض يخص كل مشروع 🌷'
  };
  return M[kind]?'https://wa.me/'+ph+'?text='+encodeURIComponent(M[kind]):''; }
function _owClose(){ var o=document.getElementById('owDr'); if(o)o.remove(); _owDetCur=null; }
function _owRepOpen(pid){
  _owClose(); _owDetCur=pid;
  var ov=document.createElement('div'); ov.id='owDr';
  ov.style.cssText='position:fixed;inset:0;z-index:900;background:rgba(15,23,42,.35);display:flex;justify-content:flex-end';
  ov.onclick=function(e){ if(e.target===ov)_owClose(); };
  ov.innerHTML='<div id="owDrBox" style="width:680px;max-width:100%;height:100%;background:var(--card);color:var(--text);box-shadow:20px 0 50px rgba(15,23,42,.2);display:flex;flex-direction:column;overflow:auto"><div style="padding:40px;text-align:center;color:var(--muted)">جاري التحميل...</div></div>';
  document.body.appendChild(ov);
  fetch(API+'/api/admin/bid-reports/provider/'+pid,hdr()).then(function(r){return r.json();}).then(function(d){
    if(!d||!d.user){document.getElementById('owDrBox').innerHTML='<div style="padding:40px;text-align:center">تعذر التحميل</div>';return;}
    _owDrawer(d);
  }).catch(function(){var b=document.getElementById('owDrBox');if(b)b.innerHTML='<div style="padding:40px;text-align:center">تعذر التحميل</div>';});
}
function _owDrawer(d){
  var box=document.getElementById('owDrBox');if(!box)return;
  var u=d.user, nm=u.business_name||u.name||'مزوّد';
  var open=d.reports.filter(function(r){return r.status!=='dismissed';});
  var clients={};open.forEach(function(r){clients[r.client_name||r.request_id]=1;});
  var since=u.created_at?new Date(u.created_at).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{month:'long',year:'numeric'}):'';
  var sim=d.similarity||{};
  var gb='border:1.5px solid var(--border);background:var(--card);color:var(--text2);border-radius:11px;padding:10px 13px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap';
  var h='<div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;gap:12px;align-items:flex-start;position:sticky;top:0;background:var(--card);z-index:1">'
    +'<span class="ow-av" style="width:46px;height:46px;font-size:18px">'+esc(nm.charAt(0))+'</span>'
    +'<div style="flex:1;min-width:0"><div style="font-family:Cairo,sans-serif;font-size:19px;font-weight:900">'+esc(nm)+'</div>'
    +'<div style="font-size:12.5px;color:var(--muted);font-weight:700;margin-top:2px">'+(since?'عضو منذ '+since+' · ':'')+_fuN(u.bids_total,'عرض واحد','عرضين','عروض','عرض')+' · '+(u.accepted?_fuN(u.accepted,'ترسية واحدة','ترسيتين','ترسيات','ترسية'):'0 ترسية')+' · '+(u.reviews?_fuN(u.reviews,'تقييم واحد','تقييمين','تقييمات','تقييم'):'لا تقييمات')+(u.city?' · '+esc(u.city):'')+'</div>'
    +'<div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">'+_owPill(_fuN(open.length,'بلاغ واحد','بلاغين','بلاغات','بلاغ')+' · '+_fuN(Object.keys(clients).length,'عميل واحد','عميلين','عملاء','عميل'),'#fef2f2','#b91c1c')+(u.bid_review?_owPill('عروضه تحت المراجعة','#fef3c7','#92400e'):'')+(u.is_active===false?_owPill('موقوف','#1f2937','#fff'):'')+'</div></div>'
    +'<button onclick="_owClose()" style="border:0;background:var(--bg);color:var(--text);border-radius:10px;width:36px;height:36px;font-size:16px;cursor:pointer" aria-label="إغلاق">✕</button></div>';
  h+='<div style="padding:16px 20px;display:flex;flex-direction:column;gap:16px">';
  // التطابق
  var simCol=sim.pct>=60?'#b91c1c':(sim.pct>=30?'#c2410c':'#15803d');
  h+='<div style="background:var(--bg);border:1px solid var(--border);border-radius:14px;padding:13px 15px;font-size:13px;font-weight:700;line-height:1.9">تطابق النصوص بين عروضه: <b style="font-size:20px;color:'+simCol+'">'+(sim.pct||0)+'%</b>'
    +(sim.total>1?' — نفس القالب في '+sim.same+' من '+sim.total+' عرض':' — عرض واحد فقط')
    +(d.blanks?'، وفيه فراغات ما تعبّت في '+_fuN(d.blanks,'عرض واحد','عرضين','عروض','عرض'):'')+'</div>';
  // آخر العروض جنب بعض
  h+='<div><div style="font-size:13px;font-weight:900;margin-bottom:8px">آخر عروضه جنب بعض</div><div class="ow-bgrid">'
    +(d.bids||[]).map(function(b){
      var hs=b.hold_state==='held'?_owPill('معلّق','#fef3c7','#92400e'):(b.hold_state==='rejected'?_owPill('مرفوض','#fef2f2','#b91c1c'):'');
      return '<div class="ow-bc"><div style="display:flex;gap:6px;align-items:center;justify-content:space-between"><b style="font-size:12.5px">'+esc(b.request_title||'مشروع')+(b.request_city?' · '+esc(b.request_city):'')+'</b>'+(b.reported?_owPill('مُبلّغ','#fef2f2','#b91c1c'):'')+hs+'</div>'
        +'<div class="ow-bn">'+_owHl(b.note||'—')+'</div><div style="font-size:11.5px;color:var(--muted);font-weight:700">'+(b.price?fmtNum(b.price)+' ر.س':'')+(b.days?' · '+b.days+' يوم':'')+' · '+_fuAgo(b.created_at)+'</div></div>';
    }).join('')+'</div></div>';
  // البلاغات
  h+='<div><div style="font-size:13px;font-weight:900;margin-bottom:8px">البلاغات</div>'
    +d.reports.map(function(r){ return '<div style="font-size:12.5px;font-weight:700;padding:7px 0;border-bottom:1px dashed var(--border);'+(r.status==='dismissed'?'opacity:.5;text-decoration:line-through':'')+'">• '+esc(r.reason_label)+' — '+esc(r.client_name||'عميل')+' على مشروع «'+esc(r.request_title||'')+'» · '+_fuAgo(r.created_at)+(r.status==='actioned'?' · <span style="color:var(--green)">تمت المعالجة</span>':'')+'</div>'; }).join('')+'</div>';
  // الإجراءات
  var af=(window._owAfter&&window._owAfter.pid===u.id)?window._owAfter:null, waK=af?af.kind:(u.bid_review?'review':'warn');
  if(af){ window._owAfter=null; h+='<div class="ow-wab"><span>✓ '+esc(af.msg)+' — وصله إشعار داخل المنصة.</span>'+(_owWaLink(u,af.kind)?'<a class="ow-wa" target="_blank" rel="noopener" href="'+_owWaLink(u,af.kind)+'">💬 أرسله واتساب كمان</a>':'<small>ما عنده رقم جوال صحيح للواتساب</small>')+'</div>'; }
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<button style="'+gb+';color:#1d4ed8;border-color:#bfdbfe" onclick="_owAct('+u.id+',\'warn\',this)">📩 أرسل تنبيه + نصائح</button>'
    +(!af&&_owWaLink(u,waK)?'<a class="ow-wa" target="_blank" rel="noopener" href="'+_owWaLink(u,waK)+'" title="'+(waK==='review'?'رسالة: عروضه تحت المراجعة':'رسالة: تنبيه + نصائح')+'">💬 '+(waK==='review'?'واتساب: عروضه تحت المراجعة':'التنبيه + النصائح واتساب')+'</a>':'')
    +(u.bid_review?'<button style="'+gb+';color:#15803d;border-color:#bbf7d0" onclick="_owAct('+u.id+',\'lift\',this)">▶ رفع المراجعة</button>':'<button style="'+gb+';color:#92400e;border-color:#fde68a" onclick="_owAct('+u.id+',\'review\',this)">⏸ عروضه تنتظر موافقتي</button>')
    +(u.is_active!==false?'<button style="'+gb+';color:#dc2626;border-color:#fecaca" onclick="_owAct('+u.id+',\'suspend\',this)">⛔ إيقاف الحساب</button>':'')
    +'<button style="'+gb+'" onclick="_owAct('+u.id+',\'dismiss\',this)">✓ البلاغات غير صحيحة</button>'
    +(d.reports.some(function(r){return r.status==='actioned'&&!r.closed_at;})?'<button style="'+gb+';color:#15803d;border-color:#bbf7d0;background:#f0fdf4" onclick="_owAct('+u.id+',\'close\',this)">✓ خلصت — شيله من القائمة</button>':'')
    +'</div>';
  h+='<div class="ow-foot" style="margin:0">المزوّد ما يشوف اسم المبلّغ ولا المشروع اللي انبلّغ منه.</div></div>';
  box.innerHTML=h;
}
async function _owAct(pid,act,btn){
  if(act==='suspend'){ var ok=await askConfirm({title:'إيقاف الحساب',message:'إيقاف حساب هذا المزوّد؟ ما يقدر يدخل المنصة لين ترجّعه من صفحة المستخدمين.',confirmText:'إيقاف'}); if(!ok)return; }
  if(act==='dismiss'){ var ok2=await askConfirm({title:'البلاغات غير صحيحة',message:'يلغي أثر كل بلاغاته (التنبيه والمراجعة) ويعتمد عروضه المعلّقة.',confirmText:'تأكيد',safe:true}); if(!ok2)return; }
  if(btn){btn.disabled=true;}
  fetch(API+'/api/admin/bid-reports/provider/'+pid+'/action',Object.assign({method:'POST',body:JSON.stringify({action:act})},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(x){
      if(btn)btn.disabled=false;
      if(!x.ok){toast((x.d&&x.d.message)||'تعذّر التنفيذ','error');return;}
      toast((x.d&&x.d.message)||'تم ✓','success');
      if(act==='warn'||act==='review'||act==='lift')window._owAfter={pid:pid,kind:act,msg:(x.d&&x.d.message)||'تم'};
      _owLoadCounts(); if(_owCur==='held')_owLoadHeld(); else if(_owCur!=='auto')_owLoadReports();
      if(_owDetCur===pid)_owRepOpen(pid);
    }).catch(function(){if(btn)btn.disabled=false;toast('تعذّر الاتصال','error');});
}
// ─── تحت المراجعة قبل النشر ───
// sec: الثواني المتبقية (محسوبة في السيرفر — تتفادى فرق التوقيت)
function _owLeft(sec){
  var ms=(parseInt(sec)||0)*1000; if(ms<=0)return 'ينعتمد الآن';
  var m=Math.round(ms/60000), h=Math.floor(m/60); m=m%60;
  var hs=h===0?'':(h===1?'ساعة':(h===2?'ساعتين':h+' ساعات'));
  var ms2=m===0?'':(m===1?'دقيقة':(m===2?'دقيقتين':(m<=10?m+' دقائق':m+' دقيقة')));
  return 'باقي '+(hs&&ms2?hs+' و'+ms2:(hs||ms2));
}
// ═══ «الكل»: كل اللي ينتظر قرارك في قائمة وحدة، الأقدم أولاً ═══
function _owTag(t,bg,fg){return '<div style="margin-bottom:8px"><span style="display:inline-block;font-size:11.5px;font-weight:900;padding:3px 10px;border-radius:8px;background:'+bg+';color:'+fg+'">'+t+'</span></div>';}
function _owRepCard(p){
  var nm=p.business_name||p.name||'مزوّد';
  var rs=(p.reasons||[]).map(function(x){var c=OW_RS_COL[x.key]||['#f1f5f9','#475569'];return _owPill(esc(OW_RS_SHORT[x.key]||x.label)+' · '+x.n,c[0],c[1]);}).join(' ');
  return '<div class="card ow-hc" style="margin-bottom:12px">'+_owTag('🚩 بلاغات من العملاء','#ffedd5','#9a3412')
    +'<div style="display:flex;gap:10px;align-items:flex-start"><span class="ow-av">'+esc(nm.charAt(0))+'</span><div style="flex:1;min-width:0"><b style="font-size:14.5px">'+esc(nm)+'</b>'
    +'<div style="font-size:12.5px;color:#b91c1c;font-weight:800;margin-top:2px">'+(p.open_reports?_fuN(p.open_reports,'بلاغ جديد','بلاغين جداد','بلاغات جديدة','بلاغ جديد'):'<span style="color:#15803d">✓ اتخذت إجراء — باقي تتابعه (واتساب) وتشيله من القائمة</span>')+' من '+_fuN(p.clients,'عميل واحد','عميلين','عملاء','عميل')+'</div>'
    +'<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">'+rs+'</div></div><span>'+_owState(p)+'</span></div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">'
    +'<button class="act-btn ab-default" style="background:#1e3a8a;border-color:#1e3a8a;color:#fff" onclick="_owRepOpen('+p.id+')">'+(p.open_reports?'افتح البلاغات وقرّر':'افتح الملف')+'</button>'
    +(!p.open_reports&&p.pending_close?'<button class="act-btn ab-default" style="color:#15803d;border-color:#bbf7d0" onclick="_owAct('+p.id+',\'close\',this)">✓ خلصت — شيله من القائمة</button>':'')
    +'<button class="act-btn ab-default" onclick="_provDrawer('+p.id+')">👤 ملف المزوّد</button></div></div>';
}
function _owLoadAll(){
  var host=document.getElementById('ow-t-all');if(!host)return;
  host.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  var j=function(u){return fetch(API+u,hdr()).then(function(r){return r.json();}).catch(function(){return null;});};
  Promise.all([j('/api/admin/held-bids'),j('/api/admin/bid-reports'),j('/api/admin/offer-flags')]).then(function(r){
    var held=(r[0]&&r[0].bids)||[], reps=Array.isArray(r[1])?r[1]:[], flags=Array.isArray(r[2])?r[2]:[];
    if(r[0])_owHeld=r[0]; _owRep=reps; _owFlags=flags; _adSeen('flags'); _adSeen('bidrep');
    var items=[];
    held.forEach(function(b){items.push({t:new Date(b.created_at||0).getTime(),h:_owHeldCard(b).replace(/^(<div class="card[^>]*>)/,'$1'+_owTag('⏸ معلّق قبل النشر','#dbeafe','#1e40af'))});});
    reps.filter(function(p){return p.open_reports>0||p.pending_close>0;}).forEach(function(p){items.push({t:new Date(p.last_at||0).getTime(),h:_owRepCard(p)});});
    flags.forEach(function(f){items.push({t:new Date(f.created_at||0).getTime(),h:_owFlagCard(f).replace(/^(<div class="card[^>]*>)/,'$1'+_owTag('🔎 رصد تلقائي','#ede9fe','#6d28d9'))});});
    items.sort(function(a,b){return a.t-b.t;});
    host.innerHTML=items.length?('<div class="ow-note">كل اللي ينتظر قرارك في مكان واحد — الأقدم أولاً عشان ما يتأخر أحد. العروض المعلّقة تنعتمد تلقائياً إذا ما راجعتها في الوقت.</div>'+items.map(function(x){return x.h;}).join('')):emptyState('ما فيه شي ينتظرك 🎉');
  });
}
function _owHeldCard(b){
      var nm=b.provider_business_name||b.provider_name||'مزوّد';
      var urgent=(parseInt(b.left_sec)||0)<2*3600;
      return '<div class="card ow-hc" id="owh-'+b.id+'">'
        +'<div style="display:flex;gap:10px;align-items:flex-start"><span class="ow-av">'+esc(nm.charAt(0))+'</span><div style="flex:1;min-width:0"><b style="font-size:14.5px">'+esc(nm)+'</b>'
        +'<div style="font-size:12.5px;color:var(--muted);font-weight:700">← على مشروع «'+esc(b.request_title||'')+'»'+(b.request_city?' · '+esc(b.request_city):'')+'</div>'
        +(b.reports?'<div style="font-size:12px;color:#b91c1c;font-weight:800;margin-top:2px">'+_fuN(b.reports,'بلاغ واحد','بلاغين','بلاغات','بلاغ')+' من '+_fuN(b.clients,'عميل واحد','عميلين','عملاء','عميل')+(b.top_reason?' · '+esc(OW_RS_SHORT[b.top_reason]||b.top_reason_label):'')+'</div>':'')
        +'</div>'+_owPill('⏱ '+_owLeft(b.left_sec),urgent?'#fef2f2':'#f1f5f9',urgent?'#b91c1c':'#475569')+'</div>'
        +'<div style="display:flex;gap:18px;margin:10px 0 6px;font-size:12.5px;font-weight:700;color:var(--muted)"><span><b style="color:var(--text);font-size:15px">'+(b.price?fmtNum(b.price):'—')+'</b> السعر'+(b.price_visibility!=='public'?' (خاص)':'')+'</span><span><b style="color:var(--text);font-size:15px">'+(b.days||'—')+'</b> يوم مدة التنفيذ</span></div>'
        +'<div class="ow-bn" style="-webkit-line-clamp:unset">'+_owHl(b.note||'—')+'</div>'
        +(b.attachment_url?'<a href="'+esc(_safeUrl(b.attachment_url))+'" target="_blank" rel="noopener" style="font-size:12px;font-weight:800">📎 الملف المرفق</a>':'')
        +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;position:relative">'
        +'<button class="act-btn ab-default" style="color:#fff;background:#16a34a;border-color:#16a34a" onclick="_owHeldOk('+b.id+',this)">✓ اعتماد — يظهر للعميل</button>'
        +'<button class="act-btn ab-default" style="color:#dc2626;border-color:#fecaca" onclick="_owRejMenu('+b.id+',this)">✕ رفض ▾</button>'
        +'<a class="act-btn ab-default" style="text-decoration:none" href="/project/x-'+b.request_id+'?id='+b.request_id+'" target="_blank" rel="noopener">فتح المشروع</a>'
        +'<button class="act-btn ab-default" onclick="_owRepOpen('+b.provider_id+')">ملف البلاغات</button>'
        +'</div></div>';
}
function _owLoadHeld(){
  if(_owCur==='all'){_owLoadAll();return;}
  var host=document.getElementById('ow-t-held');if(!host)return;
  host.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/held-bids',hdr()).then(function(r){return r.json();}).then(function(d){
    if(!d||!Array.isArray(d.bids)){host.innerHTML=emptyState('تعذر التحميل');return;}
    _owHeld=d;
    var hrs=d.hours||7;
    var h='<div class="ow-note">هذي العروض مخفية عن العملاء لين تراجعها. إذا ما راجعتها خلال '+hrs+' ساعات <b>تنعتمد تلقائياً</b> وتظهر للعميل — ويوصلك تنبيه.</div>';
    if(!d.bids.length)h+=emptyState('ما فيه عروض تنتظر مراجعتك');
    h+=d.bids.map(_owHeldCard).join('');
    if(d.providers&&d.providers.length){
      h+='<div class="card" style="margin-top:6px"><div style="font-size:14px;font-weight:900;margin-bottom:8px">المزوّدين تحت المراجعة</div>'
        +d.providers.map(function(p){var nm=p.business_name||p.name||'مزوّد';
          return '<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid var(--border)"><span class="ow-av">'+esc(nm.charAt(0))+'</span><div style="flex:1;min-width:0"><b>'+esc(nm)+'</b><div style="font-size:12px;color:var(--muted);font-weight:700">'+(p.held?_fuN(p.held,'عرض معلّق','عرضين معلّقين','عروض معلّقة','عرض معلّق'):'ما عنده عروض معلّقة')+(p.bid_review_at?' · من '+_fuAgo(p.bid_review_at).replace(/^قبل /,''):'')+'</div></div>'
            +'<button class="act-btn ab-default" style="color:#15803d;border-color:#bbf7d0" onclick="_owAct('+p.id+',\'lift\',this)">رفع المراجعة</button></div>';}).join('')+'</div>';
    }
    h+='<div class="ow-foot">«رفع المراجعة» يعتمد كل عروضه المعلّقة ويرجّع عروضه الجديدة تظهر مباشرة. المراجعة ترتفع تلقائياً بعد 30 يوم بدون بلاغات جديدة.</div>';
    host.innerHTML=h;
  }).catch(function(){host.innerHTML=emptyState('تعذر التحميل');});
}
function _owHeldOk(id,btn){
  if(btn)btn.disabled=true;
  fetch(API+'/api/admin/held-bids/'+id+'/approve',Object.assign({method:'POST'},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(x){ if(!x.ok){if(btn)btn.disabled=false;toast((x.d&&x.d.message)||'تعذّر','error');_owLoadHeld();return;} toast('اعتُمد العرض ووصل العميل إشعار ✓','success'); var c=document.getElementById('owh-'+id);if(c)c.remove(); _owLoadCounts(); })
    .catch(function(){if(btn)btn.disabled=false;toast('تعذّر الاتصال','error');});
}
function _owRejMenu(id,btn){
  var old=document.getElementById('owRejM');if(old){old.remove();if(old._id===id)return;}
  var R=(_owHeld&&_owHeld.rej_reasons)||{};
  var m=document.createElement('div');m.id='owRejM';m._id=id;
  var rc=btn.getBoundingClientRect();
  m.style.cssText='position:fixed;top:'+Math.min(rc.bottom+6,window.innerHeight-260)+'px;left:'+Math.max(8,Math.min(rc.right-280,window.innerWidth-290))+'px;z-index:950;background:var(--card);border:1px solid var(--border);border-radius:14px;box-shadow:0 12px 30px rgba(15,23,42,.18);padding:8px;width:280px;max-width:90vw';
  m.innerHTML='<div style="font-size:11.5px;font-weight:800;color:var(--muted);padding:4px 8px">أسباب الرفض</div>'
    +Object.keys(R).map(function(k){return '<button class="ow-mi" onclick="_owHeldRej('+id+',\''+k+'\')">'+esc(R[k])+'</button>';}).join('')
    +'<button class="ow-mi" onclick="_owHeldRejOther('+id+')">سبب آخر… (تكتبه)</button>'
    +'<div style="font-size:11px;color:var(--muted);font-weight:700;padding:6px 8px 2px;line-height:1.6">المزوّد يوصله السبب مع نصيحة، والعرض ما يظهر للعميل.</div>';
  document.body.appendChild(m);
  setTimeout(function(){document.addEventListener('click',function _c(e){if(!m.contains(e.target)&&e.target!==btn){m.remove();document.removeEventListener('click',_c);}});},0);
}
function _owHeldRejOther(id){
  var t=prompt('اكتب سبب الرفض (يوصل للمزوّد):');
  if(t&&t.trim())_owHeldRej(id,null,t.trim());
}
function _owHeldRej(id,key,text){
  var m=document.getElementById('owRejM');if(m)m.remove();
  fetch(API+'/api/admin/held-bids/'+id+'/reject',Object.assign({method:'POST',body:JSON.stringify(key?{reason:key}:{text:text})},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(x){ if(!x.ok){toast((x.d&&x.d.message)||'تعذّر','error');_owLoadHeld();return;} toast('رُفض العرض ووصل المزوّد السبب','success'); var c=document.getElementById('owh-'+id);if(c)c.remove(); _owLoadCounts(); })
    .catch(function(){toast('تعذّر الاتصال','error');});
}
var _owFSel={};
function _owFlagCard(f,selMode){
      var v=parseInt(f.violations)||1;
      var spam=(f.reason==='spam_speed');
      var spread=(f.reason==='spam_spread');
      var contact=(f.reason==='contact_share');
      var badge=contact?'<span class="badge" style="background:#fff1f2;color:#be123c;white-space:nowrap">📞 تواصل خارج المنصة</span>':(spread?'<span class="badge" style="background:#fef2f2;color:#b91c1c;white-space:nowrap">🌐 انتشار مشبوه</span>':(spam?'<span class="badge" style="background:#f3e8ff;color:#7c3aed;white-space:nowrap">نشاط مشبوه</span>':'<span class="badge b-rej" style="white-space:nowrap">خارج النطاق</span>'));
      var detail=contact?('رقم تواصل داخل نص العرض — محاولة تواصل خارج المنصة (تفادي العمولة) · '+esc(f.project_title||'مشروع')):(spread?('عروض في مناطق متعددة خلال 24 ساعة (احتمال «كل المدن» مزعج) · '+esc(f.project_title||'مشروع')):(spam?('عروض كثيرة في وقت قصير · '+esc(f.project_title||'مشروع')):('قدّم على: <b style="color:#334155">'+esc(f.project_title||'مشروع')+'</b> في <b style="color:var(--red)">'+esc(f.request_city||'—')+'</b>')));
      return '<div class="card" id="owf-'+f.id+'" style="margin-bottom:12px">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'
          +'<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
            +(selMode?'<input type="checkbox" class="ow-ck" aria-label="تحديد" '+(_owFSel[f.id]?'checked':'')+' onchange="_owFSelOne('+f.id+',this.checked)">':'')
            +'<span style="background:#dbeafe;color:#1d4ed8;font-size:10.5px;font-weight:800;padding:2px 9px;border-radius:20px">مزوّد</span>'
            +'<span style="font-weight:800;font-size:14px">'+esc(f.provider_name||'—')+'</span>'
            +'<span style="font-size:11px;color:var(--muted);font-weight:600">'+(f.provider_city?('مدينته: '+esc(f.provider_city)):'')+'</span>'
          +'</div>'
          +badge
        +'</div>'
        +'<div style="font-size:12.5px;color:var(--muted);margin-top:7px;line-height:1.9">'+detail+(f.auto_notified?' · <span style="color:var(--green)">✓ أُرسل التنبيه التلقائي</span>':'')+(v>1?' · <span style="color:#c2410e;font-weight:800">إجمالي مخالفاته: '+v+'</span>':'')+'</div>'
        +'<div style="display:flex;gap:9px;margin-top:12px;flex-wrap:wrap">'
          +'<button class="act-btn ab-default" style="color:#1d4ed8;border-color:#bfdbfe" onclick="openOwAlert('+f.id+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>تنبيه</button>'
          +'<button class="act-btn ab-default" style="color:#059669;border-color:#a7f3d0" onclick="owWa('+f.id+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>واتساب</button>'
          +(f.bid_id?'<button class="act-btn ab-default" style="color:#dc2626;border-color:#fecaca" onclick="owDeleteBid('+f.bid_id+','+f.id+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>حذف العرض</button>':'')
          +'<button class="act-btn ab-default" style="color:#b45309;border-color:#fde68a" onclick="owSuspend('+f.provider_id+')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.9" y1="4.9" x2="19.1" y2="19.1"/></svg>إيقاف المزوّد</button>'
        +'</div>'
      +'</div>';
}
function loadOfferFlags(){
  if(_owCur==='all'){_owLoadAll();return;}
  var host=document.getElementById('offerwatch-list');if(!host)return;
  host.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/offer-flags',hdr()).then(function(r){return r.json();}).then(function(list){
    if(!Array.isArray(list)){host.innerHTML=emptyState('تعذر التحميل');return;}
    _owFlags=list; _owFSel={}; _adSeen('flags');
    var cnt=document.getElementById('ow-count');if(cnt)cnt.textContent=list.length?(list.length+' مخالفة'):'';
    _owFBar();
    if(!list.length){host.innerHTML=emptyState('لا توجد مخالفات — كل العروض ضمن النطاق 🎉');return;}
    host.innerHTML=list.map(function(f){return _owFlagCard(f,true);}).join('');
  }).catch(function(){host.innerHTML=emptyState('تعذر التحميل');});
}
function loadOwBadge(){ _owLoadCounts(); }
function _owFBar(){ var b=document.getElementById('ow-fbar'); if(!b)return; var L=_owFlags||[], n=L.filter(function(f){return _owFSel[f.id];}).length;
  b.innerHTML=L.length?'<label class="sel-all"><input type="checkbox" '+(n&&n===L.length?'checked':'')+' onchange="_owFSelAll(this.checked)"> تحديد الكل ('+L.length+')</label>'
    +(n?'<button class="act-btn ab-default" style="color:#dc2626;border-color:#fecaca" onclick="_owFDel()">🗑️ حذف المحدد ('+n+')</button>':'')
    +'<button class="act-btn ab-default" style="color:#dc2626;border-color:#fecaca;margin-inline-start:auto" onclick="clearOfferFlags()">🗑️ حذف الكل وابدأ من جديد</button>':''; }
function _owFSelOne(id,on){ if(on)_owFSel[id]=1; else delete _owFSel[id]; var c=document.querySelector('#offerwatch-list #owf-'+id); if(c)c.classList.toggle('ow-sel',!!on); _owFBar(); }
function _owFSelAll(on){ _owFSel={}; (_owFlags||[]).forEach(function(f){ if(on)_owFSel[f.id]=1; var c=document.querySelector('#offerwatch-list #owf-'+f.id); if(c){c.classList.toggle('ow-sel',!!on); var k=c.querySelector('.ow-ck'); if(k)k.checked=!!on;} }); _owFBar(); }
async function _owFDel(){ var ids=(_owFlags||[]).filter(function(f){return _owFSel[f.id];}).map(function(f){return f.id;}); if(!ids.length)return;
  if(!await askConfirm({title:'حذف من القائمة',message:'يحذف '+ids.length+' رصد من القائمة. العروض نفسها ما تتأثر.',confirmText:'حذف',safe:true}))return;
  fetch(API+'/api/admin/offer-flags/delete',Object.assign({method:'POST',body:JSON.stringify({ids:ids})},hdr())).then(function(r){return r.json();}).then(function(d){ if(!d||!d.ok){toast((d&&d.message)||'تعذّر','error');return;} toast('انحذف '+d.n+' ✓','success'); loadOfferFlags(); _owLoadCounts(); }).catch(function(){toast('تعذّر الاتصال','error');}); }
function openOwAlert(id){
  _owFlagId=id;
  var f=_owFlags.find(function(x){return x.id===id;});
  document.getElementById('ow-alert-prov').textContent='إلى: '+((f&&f.provider_name)||'المزوّد');
  var sel=document.getElementById('ow-preset');
  if(sel){ sel.innerHTML=OW_PRESETS.map(function(p,i){return '<option value="'+i+'">'+esc(p.t)+'</option>';}).join('')+'<option value="custom">✏️ نص مخصّص</option>'; sel.value='0'; }
  document.getElementById('ow-msg').value=OW_PRESETS[0].m;
  document.getElementById('owAlertModal').classList.add('show');
}
function _owPreset(){
  var v=document.getElementById('ow-preset').value;
  if(v==='custom'){var t=document.getElementById('ow-msg');t.value='';t.focus();return;}
  var p=OW_PRESETS[parseInt(v)]; if(p)document.getElementById('ow-msg').value=p.m;
}
function sendOwAlert(){
  var msg=(document.getElementById('ow-msg').value||'').trim();
  if(!msg){toast('اكتب نص التنبيه','error');return;}
  var btn=document.getElementById('ow-send'); if(btn){btn.disabled=true;btn.textContent='...جاري الإرسال';}
  fetch(API+'/api/admin/offer-flags/'+_owFlagId+'/alert',Object.assign({method:'POST',body:JSON.stringify({message:msg})},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){ if(btn){btn.disabled=false;btn.textContent='📣 أرسل التنبيه';} if(!res.ok){toast((res.d&&res.d.message)||'تعذّر الإرسال','error');return;} toast('تم إرسال التنبيه للمزوّد ✓','success'); closeModal('owAlertModal'); })
    .catch(function(){ if(btn){btn.disabled=false;btn.textContent='📣 أرسل التنبيه';} toast('تعذّر الاتصال','error'); });
}
function owWa(flagId){
  var f=(_owFlags||[]).find(function(x){return x.id===flagId;});
  var ph=_waNorm(f&&f.provider_phone);
  if(!ph){toast('لا يوجد رقم واتساب صالح لهذا المزوّد','error');return;}
  var msg='السلام عليكم، نرجو تقديم العروض فقط للمشاريع ضمن مناطق خدمتكم — لضمان وصول عروضكم للمشاريع المناسبة. منصة مناقصة.';
  window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(msg),'_blank');
}
function clearOfferFlags(){
  if(!confirm('حذف كل الرصد وتبدأ من جديد؟ (العروض نفسها ما تتأثر)'))return;
  fetch(API+'/api/admin/offer-flags/clear',Object.assign({method:'POST'},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){if(!res.ok){toast((res.d&&res.d.message)||'تعذّر المسح','error');return;}toast('تم مسح '+(res.d.cleared||0)+' مخالفة','success');loadOfferFlags();_owLoadCounts();})
    .catch(function(){toast('تعذّر الاتصال','error');});
}
function owDeleteBid(bidId,flagId){
  if(!confirm('حذف هذا العرض نهائياً؟'))return;
  fetch(API+'/api/admin/bids/'+bidId,Object.assign({method:'DELETE'},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};}).catch(function(){return{ok:r.ok,d:{}};});})
    .then(function(res){ if(!res.ok){toast((res.d&&res.d.message)||'تعذّر الحذف','error');return;} toast('تم حذف العرض','success'); var c=document.getElementById('owf-'+flagId); if(c)c.remove(); })
    .catch(function(){toast('تعذّر الاتصال','error');});
}
function owSuspend(pid){
  var f=(_owFlags||[]).find(function(x){return x.provider_id===pid;});
  var nm=(f&&f.provider_name)||'المزوّد';
  if(!confirm('إيقاف حساب «'+nm+'»؟ لن يتمكن من الدخول أو التقديم حتى تعيد تفعيله.'))return;
  fetch(API+'/api/admin/users/'+pid+'/toggle',Object.assign({method:'PUT'},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){ if(!res.ok){toast((res.d&&res.d.message)||'تعذّر الإيقاف','error');return;} toast(res.d&&res.d.is_active===false?'تم إيقاف المزوّد ⛔':'تم تفعيل المزوّد','success'); })
    .catch(function(){toast('تعذّر الاتصال','error');});
}
var _invReqId=null;
function _regionsList(){ return Object.keys(INV_REGIONS).map(function(k){ return {n:k,c:INV_REGIONS[k]}; }); }
var INV_REGIONS={
  'الرياض':['الرياض','الخرج','الدوادمي','المجمعة','الزلفي','شقراء','القويعية','وادي الدواسر','الأفلاج','حوطة بني تميم','عفيف','الغاط','ثادق','حريملاء','ضرماء','المزاحمية','رماح','الدرعية','الدلم','الحريق','السليل','مرات','ضرما'],
  'القصيم':['بريدة','عنيزة','الرس','المذنب','البكيرية','البدائع','رياض الخبراء','عيون الجواء','الأسياح','النبهانية','الشماسية','ضرية','عقلة الصقور','الخبراء'],
  'مكة المكرمة':['مكة المكرمة','جدة','الطائف','رابغ','القنفذة','الليث','خليص','الجموم','الكامل','تربة','رنية','أضم','بحرة','المويه','الخرمة'],
  'المدينة المنورة':['المدينة المنورة','ينبع','العلا','بدر','مهد الذهب','خيبر','الحناكية','العيص','المهد'],
  'الشرقية':['الدمام','الخبر','الظهران','الأحساء','الجبيل','القطيف','حفر الباطن','الخفجي','رأس تنورة','بقيق','النعيرية','قرية العليا','صفوى','سيهات','العوامية'],
  'عسير':['أبها','خميس مشيط','بيشة','محايل عسير','النماص','تثليث','سراة عبيدة','رجال ألمع','ظهران الجنوب','تنومة','بلقرن','أحد رفيدة','المجاردة','الحرجة','قيال'],
  'تبوك':['تبوك','ضباء','الوجه','تيماء','حقل','أملج','البدع'],
  'حائل':['حائل','بقعاء','الغزالة','الشنان','السليمي','موقق','الشملي'],
  'الحدود الشمالية':['عرعر','رفحاء','طريف','العويقيلة'],
  'جازان':['جازان','صبيا','أبو عريش','صامطة','أحد المسارحة','بيش','فيفاء','ضمد','الدرب','العارضة','الريث','الحرث'],
  'نجران':['نجران','شرورة','حبونا','بدر الجنوب','يدمة','ثار'],
  'الباحة':['الباحة','بلجرشي','المندق','المخواة','قلوة','العقيق','القرى','غامد الزناد'],
  'الجوف':['سكاكا','دومة الجندل','القريات','طبرجل','صوير']
};
function _invScopeBody(){
  var sc=((document.getElementById('inv-scope')||{}).value)||'city';
  var body={};
  if(sc==='all')body.all_cities=true;
  else if(sc.indexOf('region:')===0)body.cities=INV_REGIONS[sc.slice(7)]||[];
  var cats=[];
  Array.prototype.forEach.call(document.querySelectorAll('#inv-cats input[type=checkbox]:checked'),function(c){cats.push(c.value);});
  if(cats.length)body.categories=cats;
  return body;
}
function openInvite(id){
  _invReqId=id;
  var rr=(_allReq||[]).find(function(x){return x.id===id;});
  document.getElementById('inv-title').textContent=(rr?rr.title:'مشروع')+(rr&&rr.city?' · '+rr.city:'');
  var sc=document.getElementById('inv-scope');
  if(sc){
    var cityLbl=(rr&&rr.city)?('مدينة المشروع ('+esc(rr.city)+')'):'مدينة المشروع فقط';
    var opts='<option value="city">'+cityLbl+'</option>';
    Object.keys(INV_REGIONS).forEach(function(rn){opts+='<option value="region:'+rn+'">منطقة '+esc(rn)+' — كل مدنها</option>';});
    opts+='<option value="all">كل المدن</option>';
    sc.innerHTML=opts; sc.value='city';
  }
  var cbox=document.getElementById('inv-cats');
  if(cbox){
    var cats=(window._CATS&&window._CATS.length)?window._CATS:[];
    var projCat=rr&&rr.category?rr.category:'';
    var projCats=[projCat].concat((rr&&rr.extra_categories)||[]).filter(Boolean);
    cats=projCats.concat(cats.filter(function(c){return projCats.indexOf(c)<0;}));
    cbox.innerHTML=cats.map(function(c){var ck=(projCats.indexOf(c)>=0)?' checked':'';return '<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:#334155;cursor:pointer;white-space:nowrap"><input type="checkbox" value="'+esc(c)+'" onchange="_invCount()"'+ck+'> '+esc(c)+'</label>';}).join('');
  }
  document.getElementById('inv-notify').checked=true;
  document.getElementById('inv-email').checked=true;
  document.getElementById('inviteModal').classList.add('show');
  _invCount();
}
function _invCount(){
  var el=document.getElementById('inv-count'); if(el)el.textContent='...جاري الحساب';
  fetch(API+'/api/admin/requests/'+_invReqId+'/match-count',Object.assign({method:'POST',body:JSON.stringify(_invScopeBody())},hdr()))
    .then(function(r){return r.json();})
    .then(function(d){ if(!el)return; if(d&&typeof d.count==='number'){ el.textContent = d.count? ('يطابق مشروعك '+d.count+' مزوّداً') : 'لا يوجد مزوّد مطابق في هذا النطاق — جرّب منطقة أوسع'; } else el.textContent='تعذّر الحساب'; })
    .catch(function(){ if(el)el.textContent='تعذّر الحساب'; });
}
function sendInvite(){
  var btn=document.getElementById('inv-send');
  var body=Object.assign({ notify:document.getElementById('inv-notify').checked, email:document.getElementById('inv-email').checked }, _invScopeBody());
  if(!body.notify&&!body.email){ toast('اختر قناة واحدة على الأقل','error'); return; }
  if(btn){btn.disabled=true;btn.textContent='...جاري الإرسال';}
  fetch(API+'/api/admin/requests/'+_invReqId+'/invite-providers',Object.assign({method:'POST',body:JSON.stringify(body)},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){
      if(btn){btn.disabled=false;btn.textContent='📣 أرسل الدعوة';}
      if(!res.ok){ toast((res.d&&res.d.message)||'تعذّر الإرسال','error'); return; }
      if(!res.d.matched){ toast('لا يوجد مزوّد مطابق','error'); return; }
      toast('تم إرسال الدعوة لـ'+res.d.matched+' مزوّد ✓','success');
      closeModal('inviteModal');
    })
    .catch(function(){ if(btn){btn.disabled=false;btn.textContent='📣 أرسل الدعوة';} toast('تعذّر الاتصال','error'); });
}
function toggleFeaturedRow(id){
  var rr=(_allReq||[]).find(function(x){return x.id===id;});
  var on=!(rr&&rr.featured);
  fetch(API+'/api/admin/requests/'+id+'/featured',Object.assign({method:'POST',body:JSON.stringify({featured:on})},hdr()))
    .then(function(r){return r.json();})
    .then(function(d){ if(d&&d.ok){ if(rr)rr.featured=d.featured; toast(d.featured?'ثُبّت في المعرض ★':'أُزيل من المعرض','success'); } else toast((d&&d.message)||'تعذّر التحديث','error'); })
    .catch(function(){toast('تعذّر الاتصال','error');});
}
function _rowMenu(btn,id,status){
  try{event.stopPropagation();}catch(e){}
  var m=document.getElementById('rowMenu');
  if(!m){m=document.createElement('div');m.id='rowMenu';m.className='rowdd-menu';document.body.appendChild(m);}
  if(m.classList.contains('open')&&m._rid===id){m.classList.remove('open');return;}
  m._rid=id;
  var _rr=(_allReq||[]).find(function(x){return x.id===id;});
  var _invItem=(status==='open')?'<button class="rowdd-item" onclick="_rmClose();openInvite('+id+')" style="color:#1d4ed8"><svg viewBox="0 0 24 24"><path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/></svg>دعوة المزودين</button>':'';
  var _ftItem=(status==='completed')?'<button class="rowdd-item" onclick="_rmClose();toggleFeaturedRow('+id+')" style="color:#a16207"><svg viewBox="0 0 24 24"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"/></svg>'+((_rr&&_rr.featured)?'إزالة من المعرض':'تثبيت في المعرض')+'</button>':'';
  m.innerHTML=_invItem+_ftItem
    +'<button class="rowdd-item" onclick="_rmClose();printOffersReport('+id+')"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>تقرير العروض</button>'
    +'<button class="rowdd-item" onclick="_rmClose();sendOffersReport('+id+')"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>إرسال للعميل</button>'
    +'<button class="rowdd-item" onclick="_rmClose();_oBriefFromReq('+id+')"><svg viewBox="0 0 24 24"><path d="M9 2h6a2 2 0 012 2v16a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/></svg>كراسة لمزودين</button>'
    +'<button class="rowdd-item" onclick="_rmClose();_clientLoginLink('+id+')"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>رابط دخول العميل</button>'
    +'<button class="rowdd-item" onclick="_rmClose();openReqEdit('+id+')"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>تعديل المشروع</button>'
    +'<button class="rowdd-item danger" onclick="_rmClose();deleteRequest('+id+')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>حذف المشروع</button>';
  m.classList.add('open');
  var r=btn.getBoundingClientRect();
  var mw=m.offsetWidth||190, mh=m.offsetHeight||260;
  var left=r.left; if(left+mw>window.innerWidth-8)left=window.innerWidth-mw-8; if(left<8)left=8;
  var top=r.bottom+6; if(top+mh>window.innerHeight-8)top=Math.max(8,r.top-mh-6);
  m.style.left=left+'px'; m.style.top=top+'px';
}
function _rmClose(){var m=document.getElementById('rowMenu');if(m)m.classList.remove('open');}
document.addEventListener('click',_rmClose);
window.addEventListener('scroll',function(){_rmClose();},true);
function pullbackFromRow(id){
  openReqEdit(id);
  setTimeout(function(){var blk=document.getElementById('re-pullback');if(blk&&blk.style.display==='none')togglePullback();},260);
}
function remindClient(id){
  fetch(API+'/api/admin/requests/'+id+'/remind',Object.assign({method:'POST'},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){
      if(!res.ok){toast((res.d&&res.d.message)||'تعذّر التنفيذ','error');return;}
      toast('تم إرسال التذكير للعميل','success');
      if(res.d&&res.d.wa_link)showWaFollowup(res.d.wa_link);
      setTimeout(_prHist,300);
    })
    .catch(function(){toast('تعذّر الاتصال','error');});
}
var _projReview=[];
function setProjReviewBadge(n){var b=document.getElementById('projreview-badge');if(b){b.textContent=n;b.style.display=n?'flex':'none';}}
function loadProjReview(){
  var host=document.getElementById('projreview-list');if(!host)return;
  host.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/requests?status=pending_review',hdr()).then(function(r){return r.json();}).then(function(list){
    if(!Array.isArray(list)){host.innerHTML=emptyState('تعذر التحميل');return;}
    _projReview=list;setProjReviewBadge(list.length);renderProjReview();_prHist();
  }).catch(function(){host.innerHTML=emptyState('تعذر التحميل');});
}
var _PR_PHONE=/(\+?966|0)\s?5\d(?:[\s-]?\d){7}|\b05\d{8}\b|[\w.+-]+@[\w-]+\.[a-z]{2,}/i;
function _prImgs(r){ var out=[]; try{ var a=r.images; if(typeof a==='string'){try{a=JSON.parse(a);}catch(e){a=null;}} if(Array.isArray(a))out=a.filter(function(u){return typeof u==='string'&&u.indexOf('http')===0;}); if(r.image_url&&String(r.image_url).indexOf('http')===0&&out.indexOf(r.image_url)<0)out.unshift(r.image_url); }catch(e){} return out; }
function _prQuality(r,info){
  var words=String(r.description||'').trim().split(/\s+/).filter(Boolean).length;
  var imgs=_prImgs(r).length+((Array.isArray(r.attachments)?r.attachments.length:0));
  var hasPhone=_PR_PHONE.test((r.title||'')+' '+(r.description||''));
  var ck=[
    {t:words>=15?'الوصف واضح ('+words+' كلمة)':(words>=6?'الوصف قصير ('+words+' كلمات)':'الوصف ناقص جداً'),s:words>=15?'ok':(words>=6?'warn':'bad')},
    {t:_prImgs(r).length?'فيه صور ('+_prImgs(r).length+')':'ما فيه صور',s:_prImgs(r).length?'ok':'warn'},
    {t:_prAtts(r).length?'فيه مخططات/ملفات ('+_prAtts(r).length+')':(['بناء','ترميم مبانٍ','تصاميم داخلي وخارجي','تشطيبات ومقاولات عامة'].indexOf(r.category)>=0?'ما أرفق مخطط — مشاريع «'+r.category+'» تحتاجه':'ما فيه مخططات أو ملفات'),s:_prAtts(r).length?'ok':(['بناء','ترميم مبانٍ','تصاميم داخلي وخارجي','تشطيبات ومقاولات عامة'].indexOf(r.category)>=0?'bad':'warn')},
    {t:(r.geo_lat&&r.geo_lng)?'الموقع محدد على الخريطة':'ما حدّد الموقع على الخريطة',s:(r.geo_lat&&r.geo_lng)?'ok':'warn'},
    {t:r.city?'المدينة محددة'+(r.district?' والحي':''):'ما حدّد المدينة',s:r.city?'ok':'bad'},
    {t:hasPhone?'فيه رقم جوال أو إيميل':'ما فيه أرقام تواصل',s:hasPhone?'bad':'ok'},
    {t:r.budget_max?'حدّد ميزانية تقريبية':'ما حدّد ميزانية تقريبية',s:r.budget_max?'ok':'warn'}
  ];
  if(info&&info.duplicates) ck.push({t:info.duplicates.length?'يشبه مشروع سابق له (#'+info.duplicates[0].id+')':'مو مكرر مع مشروع سابق',s:info.duplicates.length?'warn':'ok'});
  var sc=Math.round(ck.reduce(function(a,c){return a+(c.s==='ok'?1:(c.s==='warn'?.5:0));},0)/ck.length*100);
  return {score:sc,checks:ck,phone:hasPhone};
}

function _prAtts(r){ var a=r.attachments; if(typeof a==='string'){try{a=JSON.parse(a);}catch(e){a=[];}} return Array.isArray(a)?a.filter(function(x){return x&&x.url&&_safeUrl(x.url);}):[]; }
function _prExtras(r){
  var h=[];
  var ex=Array.isArray(r.extra_categories)?r.extra_categories.filter(function(c){return c&&c!==r.category;}):[];
  if(ex.length) h.push('<span class="pr-tag">تخصصات إضافية: '+ex.map(esc).join('، ')+'</span>');
  if(r.category==='أخرى'&&r.category_other) h.push('<span class="pr-tag">الخدمة: '+esc(r.category_other)+'</span>');
  if(r.geo_lat&&r.geo_lng) h.push('<a class="pr-tag" style="background:#ecfdf5;color:#047857;text-decoration:none" href="https://www.google.com/maps?q='+Number(r.geo_lat)+','+Number(r.geo_lng)+'" target="_blank" rel="noopener">📍 الموقع على الخريطة ↗</a>');
  else h.push('<span class="pr-tag" style="background:#fffbeb;color:#92400e">📍 ما حدّد الموقع على الخريطة</span>');
  return '<div style="display:flex;flex-wrap:wrap;gap:8px">'+h.join('')+'</div>';
}
function _prZip(id,btn){ var o=btn.textContent; btn.disabled=true; btn.textContent='جاري التجهيز…';
  fetch(API+'/api/requests/'+id+'/files.zip',hdr()).then(function(r){ if(!r.ok) throw 0; return r.blob(); }).then(function(b){ var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='مشروع-'+id+'-الملفات.zip'; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},4000); }).catch(function(){ showToast('تعذّر تجهيز الملفات','error'); }).finally(function(){ btn.disabled=false; btn.textContent=o; }); }
function _prFiles(r){
  var at=_prAtts(r); if(!at.length) return '<div class="pr-sec"><div class="pr-sh">📎 المخططات والملفات <span>0</span></div><div style="font-size:13px;color:var(--muted);font-weight:700">ما أرفق العميل أي ملف أو مخطط</div></div>';
  var C={pdf:['#fee2e2','#b91c1c','PDF'],dwg:['#dbeafe','#1d4ed8','DWG'],dxf:['#dbeafe','#1d4ed8','DXF'],rar:['#ede9fe','#6d28d9','RAR'],zip:['#ede9fe','#6d28d9','ZIP'],'7z':['#ede9fe','#6d28d9','7Z'],xlsx:['#dcfce7','#15803d','XLS'],xls:['#dcfce7','#15803d','XLS'],csv:['#dcfce7','#15803d','CSV'],docx:['#e0f2fe','#0369a1','DOC'],doc:['#e0f2fe','#0369a1','DOC']};
  return '<div class="pr-sec"><div class="pr-sh">📎 المخططات والملفات <span>'+at.length+'</span>'+(at.length>1?'<button type="button" onclick="_prZip('+r.id+',this)" style="margin-right:auto;border:1.5px solid var(--border);background:var(--card,#fff);color:#1d4ed8;border-radius:10px;padding:5px 11px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">⬇ تحميل الكل</button>':'')+'</div><div class="pr-files">'+at.map(function(a){
    var u=_safeUrl(a.url), nm=String(a.name||'ملف'), ext=((nm.match(/\.([a-z0-9]+)$/i)||u.match(/\.([a-z0-9]{2,4})(?:[?#]|$)/i)||[])[1]||'').toLowerCase();
    var img=/^(jpe?g|png|webp|gif|heic)$/.test(ext), c=C[ext]||['#f1f5f9','#334766',(ext||'ملف').toUpperCase()];
    var view=(ext==='pdf'||img);
    var ic=img?'<img src="'+esc(u)+'" alt="" loading="lazy" style="width:38px;height:38px;border-radius:9px;object-fit:cover;flex-shrink:0">':'<span class="pr-fx" style="background:'+c[0]+';color:'+c[1]+'">'+esc(c[2])+'</span>';
    return '<a class="pr-file" href="'+esc(u)+'" target="_blank" rel="noopener"'+(view?'':' download')+'>'+ic+'<span class="pr-fn" title="'+esc(nm)+'">'+esc(nm)+'</span><span class="pr-fa">'+(view?'فتح ↗':'تحميل ↓')+'</span></a>';
  }).join('')+'</div>'+(at.some(function(a){return /\.(rar|zip|7z)$/i.test(a.name||a.url);})?'<div style="font-size:11.5px;color:var(--muted);margin-top:6px;font-weight:700">الملفات المضغوطة (RAR/ZIP) تتحمّل عندك وتفتحها من جهازك</div>':'')+'</div>';
}
window._prInfo=window._prInfo||{};
function renderProjReview(){
  var host=document.getElementById('projreview-list');if(!host)return;
  var list=(_projReview||[]).slice().sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at);});
  var cnt=document.getElementById('pr-count');
  if(!list.length){ if(cnt)cnt.textContent='ما فيه مشاريع تنتظرك'; host.innerHTML='<div class="ad-card" style="text-align:center;padding:40px">'+emptyState('لا توجد مشاريع بانتظار المراجعة 🎉')+'</div>'; return; }
  if(cnt)cnt.textContent=list.length+(list.length===1?' مشروع ينتظرك':(list.length===2?' مشروعان ينتظرونك':' مشاريع تنتظرك'))+' · الأقدم أولاً';
  var sel=list.filter(function(r){return r.id===window._prSel;})[0]||list[0]; window._prSel=sel.id;
  var info=window._prInfo[sel.id];
  if(!info){ fetch(API+'/api/admin/requests/'+sel.id+'/review-info',hdr()).then(function(r){return r.json();}).then(function(d){ window._prInfo[sel.id]=d||{}; if(window._prSel===sel.id)renderProjReview(); }).catch(function(){ window._prInfo[sel.id]={}; }); }
  var q=_prQuality(sel,info);
  var queue=list.map(function(r){ var qq=_prQuality(r,window._prInfo[r.id]); var pill=qq.phone?'<span class="pl" style="background:#fef3c7;color:#92400e">فيه رقم تواصل</span>':'<span class="pl" style="background:'+(qq.score>=80?'#e3f5e9;color:#166534':(qq.score>=55?'#fef3c7;color:#92400e':'#fef2f2;color:#b91c1c'))+'">'+(qq.score>=80?'جاهز ':(qq.score>=55?'متوسط ':'ضعيف '))+qq.score+'%</span>';
    return '<button class="pr-qi'+(r.id===sel.id?' on':'')+'" onclick="window._prSel='+r.id+';renderProjReview()"><div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><b style="font-size:14px;line-height:1.4">'+esc(r.title||'مشروع')+'</b>'+pill+'</div><div style="font-size:12px;color:var(--muted);font-weight:700">'+[esc(r.client_name||'عميل'),r.city?esc(r.city):'بدون مدينة',_adAgo(r.created_at)].join(' · ')+'</div></button>'; }).join('');
  var imgs=_prImgs(sel);
  var hl=function(t){ return esc(t).replace(new RegExp(_PR_PHONE.source,'gi'),function(m){return '<mark style="background:#fee2e2;color:#b91c1c;border-radius:4px;padding:0 3px">'+m+'</mark>';}); };
  if(!(_allReq||[]).some(function(x){return x.id===sel.id;})){ try{ _allReq=(_allReq||[]).concat([sel]); }catch(e){} }
  host.innerHTML='<div class="pr3">'
    +'<div class="pr-q"><div class="pr-qh">الطابور<span style="color:var(--muted)">'+list.length+'</span></div>'+queue+'<div class="pr-qf" id="pr-today"></div></div>'
    +'<div class="pr-main" id="prc-'+sel.id+'">'
      +'<div style="display:flex;align-items:flex-start;gap:12px"><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:800;color:var(--muted)">#'+sel.id+' · '+(_catLbl(sel)||'بدون تصنيف')+' · '+(sel.city?esc(sel.city)+(sel.district?'، '+esc(sel.district):''):'بدون مدينة')+' · '+_adAgo(sel.created_at)+'</div><div style="font-size:21px;font-weight:900;line-height:1.4">'+hl(sel.title||'مشروع')+'</div></div>'
        +'<button class="btn-g" onclick="openReqEdit('+sel.id+')">تعديل النص</button><a class="btn-g" style="text-decoration:none" href="/project/x-'+sel.id+'?id='+sel.id+'" target="_blank" rel="noopener">معاينة ↗</a></div>'
      +'<div class="pr-desc">'+(sel.description?hl(sel.description):'<span style="color:var(--muted)">بدون وصف</span>')+'</div>'
      +_prExtras(sel)
      +(imgs.length?'<div class="pr-sec"><div class="pr-sh">🖼️ الصور <span>'+imgs.length+'</span></div><div class="pr-imgs">'+imgs.map(function(u){return '<a href="'+esc(_safeUrl(u))+'" target="_blank" rel="noopener"><img src="'+esc(_safeUrl(u))+'" alt="صورة المشروع" loading="lazy"></a>';}).join('')+'</div></div>':'')
      +_prFiles(sel)
      +'<div class="pr-facts"><div><small>الميزانية</small>'+(sel.budget_max?fmtNum(sel.budget_max)+' ر.س':'غير محددة')+'</div><div><small>الموعد</small>'+(sel.deadline?new Date(sel.deadline).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short'}):'مرن')+'</div><div><small>المزوّدون المطابقون</small><span style="color:#1d4ed8">'+(info&&info.matches!=null?info.matches+' مزوّد':'…')+'</span></div><div><small>العميل</small>'+(info&&info.client_prev!=null?(info.client_prev?info.client_prev+' مشاريع سابقة':'أول مشروع له'):'…')+'</div></div>'
      +'<details style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:12px;padding:10px 12px"><summary style="cursor:pointer;font-size:12.5px;font-weight:800;color:#166534">💡 ملاحظة للعميل مع النشر (اختيارية — تظهر له في صفحة مشروعه)</summary>'+tipChips('rv-tip-'+sel.id)+'<textarea id="rv-tip-'+sel.id+'" placeholder="مثال: أرفق المخططات لتحصل على عروض أدق..." style="width:100%;padding:9px 11px;border:1.5px solid #bbf7d0;border-radius:10px;font-family:Tajawal,sans-serif;font-size:12.5px;min-height:44px;resize:vertical;background:#fff;box-sizing:border-box"></textarea></details>'
      +'<div style="border-top:1px solid var(--border);padding-top:12px"><div style="font-size:13px;font-weight:900">لو تبي تطلب تعديل أو ترفض — اختر السبب:</div>'+reasonChips('rv-notes-'+sel.id)
        +'<textarea id="rv-notes-'+sel.id+'" placeholder="ملاحظات التعديل للعميل، أو سبب الرفض النهائي..." style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-family:Tajawal,sans-serif;font-size:13px;min-height:54px;resize:vertical;box-sizing:border-box"></textarea></div>'
      +'<div class="pr-btns"><button style="background:#16a34a;color:#fff" onclick="reviewAct('+sel.id+',\'approve\')">اعتماد ونشر</button><button style="background:#d97706;color:#fff" onclick="reviewAct('+sel.id+',\'needs_edit\')">طلب تعديل</button><button style="background:#fff;color:#dc2626;border:1.5px solid #fecaca;flex:0 1 auto;min-width:100px" onclick="reviewAct('+sel.id+',\'reject\')">رفض</button></div>'
    +'</div>'
    +'<div class="pr-side"><div class="pr-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><b style="font-size:15px">فحص الجودة</b><span class="pl" style="background:'+(q.score>=80?'#e3f5e9;color:#166534':(q.score>=55?'#fef3c7;color:#92400e':'#fef2f2;color:#b91c1c'))+'">'+q.score+'%</span></div>'
      +q.checks.map(function(c){return '<div class="pr-ck"><span class="pr-dot '+c.s+'">'+(c.s==='ok'?'✓':(c.s==='warn'?'!':'×'))+'</span>'+esc(c.t)+'</div>';}).join('')+'</div>'
      +'<div class="pr-card"><b style="font-size:15px">بعد الاعتماد</b><div style="font-size:13px;line-height:1.8;color:var(--text2);margin-top:6px">'+(info&&info.matches!=null?'يوصل إشعار لـ <b>'+info.matches+' مزوّد</b>'+(sel.category?' في «'+esc(sel.category)+'»':' (بدون تصنيف — يوصل لكل التخصصات)')+(sel.city?' بـ'+esc(sel.city)+' والمدن اللي يخدمونها':'')+'، ويوصل العميل «تم نشر مشروعك».':'…')+'</div>'
      +(info&&info.duplicates&&info.duplicates.length?'<div style="margin-top:8px;font-size:12.5px;font-weight:700;color:#92400e;background:#fffbeb;border-radius:10px;padding:8px 10px">مشاريع مشابهة له خلال 30 يوم: '+info.duplicates.map(function(d){return '#'+d.id+' «'+esc(d.title||'')+'»';}).join('، ')+'</div>':'')+'</div></div>'
  +'</div>';
}
function _prMove(dir){ var list=(_projReview||[]).slice().sort(function(a,b){return new Date(a.created_at)-new Date(b.created_at);}); if(!list.length)return; var i=list.findIndex(function(r){return r.id===window._prSel;}); i=Math.max(0,Math.min(list.length-1,i+dir)); window._prSel=list[i].id; renderProjReview(); }
document.addEventListener('keydown',function(e){
  var pg=document.getElementById('page-projreview'); if(!pg||!pg.classList.contains('on'))return;
  if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return; if(e.metaKey||e.ctrlKey||e.altKey)return;
  if(document.querySelector('.overlay.on,.overlay.show'))return;
  var id=window._prSel; if(!id)return;
  if(e.code==='KeyA'){e.preventDefault();reviewAct(id,'approve');}
  else if(e.code==='KeyE'){e.preventDefault();var t=document.getElementById('rv-notes-'+id); if(t&&!t.value.trim()){t.focus();toast('اكتب أو اختر سبب التعديل ثم اضغط «طلب تعديل»');} else reviewAct(id,'needs_edit');}
  else if(e.code==='KeyJ'){e.preventDefault();_prMove(1);}
  else if(e.code==='KeyK'){e.preventDefault();_prMove(-1);}
});

// ═══ آخر المراجعات — تقدر ترسل للعميل واتساب حتى بعد ما تراجع ═══
function _prHist(){
  var host=document.getElementById('projreview-list'); if(!host)return;
  var el=document.getElementById('pr-hist');
  if(!el){ el=document.createElement('div'); el.id='pr-hist'; el.style.marginTop='16px'; host.parentNode.insertBefore(el,host.nextSibling); }
  fetch(API+'/api/admin/review-history',hdr()).then(function(r){return r.json();}).then(function(list){
    list=Array.isArray(list)?list:[];
    if(!list.length){el.innerHTML='';return;}
    var L={approve:['اعتمدته','#dcfce7','#15803d'],needs_edit:['طلبت تعديل','#fef3c7','#92400e'],reject:['رفضته','#fee2e2','#b91c1c']};
    var STT={open:'منشور',pending_review:'رجع للمراجعة',review:'رجع للمراجعة',needs_edit:'ينتظر تعديل العميل',rejected:'مرفوض',in_progress:'قيد التنفيذ',completed:'مكتمل'};
    var show=window._prHistAll?list:list.slice(0,8);
    el.innerHTML='<div class="ad-card" style="padding:16px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><b style="font-size:15px">🕘 آخر المراجعات</b><span style="font-size:12.5px;color:var(--muted);font-weight:700">تقدر ترسل للعميل واتساب في أي وقت</span></div>'
      +show.map(function(x){var l=L[x.action]||L.approve;
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--border)">'
          +'<span style="background:'+l[1]+';color:'+l[2]+';border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:900;white-space:nowrap">'+l[0]+'</span>'
          +'<div style="flex:1;min-width:0"><a href="/project/x-'+x.rid+'?id='+x.rid+'" target="_blank" rel="noopener" style="font-weight:900;font-size:13.5px">'+esc(x.title||('#'+x.rid))+'</a>'
          +'<div style="font-size:12px;color:var(--muted);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+[esc(x.client_name||'عميل'),_adAgo(x.at),'الحين: '+(STT[x.status]||esc(x.status||'')),x.note?('«'+esc(String(x.note).slice(0,70))+'»'):''].filter(Boolean).join(' · ')+'</div></div>'
          +(x.wa_link?'<a class="act-btn ab-default" style="color:#15803d;border-color:#a7f3d0;white-space:nowrap" target="_blank" rel="noopener" href="'+esc(x.wa_link)+'">واتساب</a>':'<span style="font-size:11.5px;color:var(--muted)">بدون جوال</span>')
          +'</div>';}).join('')
      +(list.length>8?'<div style="text-align:center;padding-top:8px"><a href="#" onclick="event.preventDefault();window._prHistAll=!window._prHistAll;_prHist()" style="font-weight:900;font-size:13px">'+(window._prHistAll?'عرض أقل':'عرض الكل ('+list.length+')')+'</a></div>':'')
      +'</div>';
  }).catch(function(){});
}
async function reviewAct(id,action){
  var ta=document.getElementById('rv-notes-'+id);
  var tip=document.getElementById('rv-tip-'+id);
  var reason=(action==='approve'?((tip&&tip.value)||''):((ta&&ta.value)||'')).trim();
  if(action!=='approve'&&!reason){toast(action==='needs_edit'?'اكتب ملاحظات التعديل أولاً':'اكتب سبب الرفض أولاً','error');if(ta)ta.focus();return;}
  if(action==='approve'&&!await askConfirm({title:'اعتماد ونشر',message:'سيُنشر المشروع للمزوّدين مباشرة.',confirmText:'نعم، انشر'}))return;
  if(action==='reject'&&!await askConfirm({title:'رفض نهائي',message:'الرفض النهائي لا يُعاد، وسيُبلَّغ العميل بالسبب. متأكد؟',confirmText:'نعم، ارفض'}))return;
  var card=document.getElementById('prc-'+id);
  fetch(API+'/api/admin/requests/'+id+'/review',Object.assign({method:'PUT',body:JSON.stringify({action:action,reason:reason||null})},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){
      if(!res.ok){toast((res.d&&res.d.message)||'تعذّر التنفيذ','error');return;}
      toast(action==='approve'?'تم الاعتماد والنشر ✓':action==='needs_edit'?'أُرسل طلب التعديل للعميل':'تم الرفض النهائي','success');
      if(res.d&&res.d.wa_link)showWaFollowup(res.d.wa_link);
      if(card){card.style.transition='.25s';card.style.opacity='0';setTimeout(function(){card.remove();},250);}
      _projReview=(_projReview||[]).filter(function(x){return x.id!==id;});
      setProjReviewBadge(_projReview.length);
      window._prDone=(window._prDone||0)+1; renderProjReview(); var _pt=document.getElementById('pr-today'); if(_pt)_pt.textContent='راجعت في هذي الجلسة: '+window._prDone;
      var cnt=document.getElementById('pr-count');if(cnt)cnt.textContent=_projReview.length?(_projReview.length+' مشروع بانتظار المراجعة'):'';
      if(!_projReview.length){var host=document.getElementById('projreview-list');if(host)host.innerHTML=emptyState('لا توجد مشاريع بانتظار المراجعة 🎉');}
    })
    .catch(function(){toast('تعذّر الاتصال','error');});
}
function loadRequests(){
  fetch(API+'/api/admin/requests',hdr()).then(function(r){return r.json();}).then(function(reqs){
    if(!Array.isArray(reqs)){document.getElementById('requests-table').innerHTML=emptyState('تعذر التحميل');return;}
    _allReq=reqs;fillReqFilters();applyReqFiltersFromHash();renderRequests();
  }).catch(function(){document.getElementById('requests-table').innerHTML=emptyState('تعذر التحميل');});
}
function filterReq(st,el){_reqFilter=st;document.querySelectorAll('#page-requests .ftab').forEach(function(t){t.classList.remove('on');});if(el)el.classList.add('on');renderRequests();}
function getFilteredRequests(){
  var term=((document.getElementById('req-search')||{}).value||'').toLowerCase();
  var ci=(document.getElementById('rf-city')||{}).value||'';
  var cat=(document.getElementById('rf-cat')||{}).value||'';
  return (_allReq||[]).filter(function(r){
    if(_reqFilter==='stale'){ if(!_rqStale(r))return false; }
    else if(_reqFilter==='notes'){ if(!(r.client_note&&!r.client_note_done_at))return false; }
    else if(_reqFilter==='nosaai'){ if(!_noSaai(r))return false; }
    else if(_reqFilter==='closed'){ if(_RQ_CLOSED.indexOf(r.status)<0)return false; }
    else if(_reqFilter!=='all'&&r.status!==_reqFilter)return false;
    if(ci&&r.city!==ci)return false;
    if(cat&&r.category!==cat)return false;
    if(term){var hay=((r.title||'')+(r.client_name||'')+(r.category||'')+(r.category_other||'')).toLowerCase();if(hay.indexOf(term)<0)return false;}
    return true;
  });
}
function fillReqFilters(){
  var cities={},cats={};
  (_allReq||[]).forEach(function(r){if(r.city)cities[r.city]=1;if(r.category)cats[r.category]=1;});
  var cSel=document.getElementById('rf-city');
  if(cSel&&cSel.options.length<=1){Object.keys(cities).sort().forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;cSel.appendChild(o);});}
  var kSel=document.getElementById('rf-cat');
  if(kSel&&kSel.options.length<=1){Object.keys(cats).sort().forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;kSel.appendChild(o);});}
}
function resetReqFilters(){['rf-city','rf-cat'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});var sr=document.getElementById('req-search');if(sr)sr.value='';syncReqFiltersToHash();renderRequests();}
function applyReqFiltersFromHash(){
  var ps=_parseHashParams();
  [['city','rf-city'],['cat','rf-cat']].forEach(function(m){var e=document.getElementById(m[1]);if(e&&ps[m[0]]!=null)e.value=ps[m[0]];});
  var sr=document.getElementById('req-search');if(sr&&ps.q!=null)sr.value=ps.q;
  if(ps.status){_reqFilter=ps.status;document.querySelectorAll('#page-requests .ftab').forEach(function(t){t.classList.remove('on');var oc=t.getAttribute('onclick')||'';if(oc.indexOf("'"+ps.status+"'")>=0)t.classList.add('on');});}
}
function syncReqFiltersToHash(){
  if(window._skipHash)return;
  var v=function(id){return (document.getElementById(id)||{}).value||'';};
  var parts=[];
  if(_reqFilter&&_reqFilter!=='all')parts.push('status='+encodeURIComponent(_reqFilter));
  if(v('rf-city'))parts.push('city='+encodeURIComponent(v('rf-city')));
  if(v('rf-cat'))parts.push('cat='+encodeURIComponent(v('rf-cat')));
  var q=(v('req-search')||'').trim();if(q)parts.push('q='+encodeURIComponent(q));
  var hash='#requests'+(parts.length?'?'+parts.join('&'):'');
  if(location.hash!==hash){window._skipHash=true;history.replaceState(null,'',hash);window._skipHash=false;}
}
function _rqAge(r){ return r.created_at?Math.floor((Date.now()-new Date(r.created_at))/86400000):null; }
function _rqStale(r){ var d=_rqAge(r); return r.status==='open' && (parseInt(r.bid_count)||0)===0 && d!=null && d>=3; }
function _rqThumb(r){ var im=null; try{ var a=r.images; if(typeof a==='string'){try{a=JSON.parse(a);}catch(e){a=null;}} if(Array.isArray(a)){ for(var i=0;i<a.length;i++){ if(typeof a[i]==='string'&&a[i].indexOf('http')===0){im=a[i];break;} } } }catch(e){} return im; }
function _rqKpis(){
  var all=_allReq||[], now=Date.now(), m0=new Date(); m0.setDate(1); m0.setHours(0,0,0,0);
  var open=all.filter(function(r){return r.status==='open';}), prog=all.filter(function(r){return r.status==='in_progress'||r.status==='assigned'||r.status==='executing';});
  var weekOpen=open.filter(function(r){return r.created_at&&(now-new Date(r.created_at))<7*86400000;}).length;
  var doneM=all.filter(function(r){return r.status==='completed'&&new Date(r.completed_at||r.updated_at||r.created_at)>=m0;});
  var doneVal=doneM.reduce(function(a,r){return a+(parseFloat(r.accepted_price)||0);},0);
  var stale=all.filter(_rqStale).length;
  var d30=all.filter(function(r){return r.created_at&&(now-new Date(r.created_at))<30*86400000&&['open','in_progress','completed','assigned'].indexOf(r.status)>=0;});
  var avg=d30.length?(d30.reduce(function(a,r){return a+(parseInt(r.bid_count)||0);},0)/d30.length):0;
  var el=document.getElementById('rq-kpis'); if(!el)return;
  el.innerHTML='<div class="kp">'
    +'<div><span class="l">مفتوحة للعروض</span><span class="n">'+open.length+'</span><span class="s" style="color:#15803d">+'+weekOpen+' هذا الأسبوع</span></div>'
    +'<div><span class="l">قيد التنفيذ</span><span class="n" style="color:#1d4ed8">'+prog.length+'</span><span class="s">بعد الترسية</span></div>'
    +'<div><span class="l">مكتملة هذا الشهر</span><span class="n" style="color:#15803d">'+doneM.length+'</span><span class="s">'+(doneVal?'قيمة '+fmtNum(doneVal)+' ر.س':'—')+'</span></div>'
    +'<div class="'+(stale?'red':'')+'" style="cursor:pointer" onclick="filterReq(\'stale\',[].filter.call(document.querySelectorAll(\'#page-requests .ftab\'),function(x){return /بلا عروض/.test(x.textContent);})[0])"><span class="l">بدون عروض +3 أيام</span><span class="n" style="color:'+(stale?'#dc2626':'var(--text)')+'">'+stale+'</span><span class="s" style="color:'+(stale?'#dc2626':'')+'">'+(stale?'تحتاج دفعة للمزوّدين':'كل المشاريع جاها عروض')+'</span></div>'
    +'<div><span class="l">متوسط العروض لكل مشروع</span><span class="n">'+(Math.round(avg*10)/10)+'</span><span class="s">آخر 30 يوم</span></div>'
    +'</div>';
  // عدّادات التبويبات
  var cnt={all:all.length,stale:stale,notes:all.filter(function(r){return r.client_note&&!r.client_note_done_at;}).length,nosaai:all.filter(_noSaai).length,closed:all.filter(function(r){return _RQ_CLOSED.indexOf(r.status)>=0;}).length};
  all.forEach(function(r){cnt[r.status]=(cnt[r.status]||0)+1;});
  document.querySelectorAll('#page-requests .ftab').forEach(function(t){
    var m=(t.getAttribute('onclick')||'').match(/filterReq\('([a-z_]+)'/); if(!m)return;
    var c=t.querySelector('.fc'); if(!c){c=document.createElement('span');c.className='fc';t.appendChild(c);} c.textContent=cnt[m[1]]||0;
  });
}
function renderRequests(){
  syncReqFiltersToHash();
  try{_rqKpis();}catch(e){}
  var filtered=getFilteredRequests();
  var cnt=document.getElementById('rf-count');if(cnt)cnt.textContent=filtered.length+' نتيجة';
  if(!filtered.length){document.getElementById('requests-table').innerHTML=emptyState('لا يوجد مشاريع مطابقة');return;}
  var _rTotal=filtered.length;
  var _rSig=[(document.getElementById('req-search')||{}).value,(document.getElementById('rf-city')||{}).value,(document.getElementById('rf-cat')||{}).value,(typeof _reqFilter!=='undefined'?_reqFilter:''),filtered.length].join('|');
  filtered=_pgSlice('r',filtered,_rSig);
  var sm={open:['مفتوح','b-open'],in_progress:['قيد التنفيذ','b-progress'],executing:['قيد التنفيذ','b-progress'],assigned:['تم الإسناد','b-progress'],completed:['مكتمل','b-completed'],pending_review:['مراجعة','b-review'],review:['مراجعة','b-review'],needs_edit:['مطلوب تعديل','b-edit'],rejected:['مرفوض','b-rej'],closed:['مغلق','b-rej'],closed_auto:['مغلق','b-rej'],cancelled:['ملغى','b-rej'],expired:['منتهي','b-rej']};
  var eye='<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  document.getElementById('requests-table').innerHTML='<table><thead><tr><th>المشروع</th><th>العميل</th><th>الحالة</th><th style="text-align:center">العروض</th><th style="text-align:center" title="زيارات صفحة المشروع (بدون صاحب المشروع والإدارة)">الزيارات</th><th>منشور منذ</th><th>يُغلق بعد</th><th>إجراءات</th></tr></thead><tbody>'+filtered.map(function(r){
    var st=sm[r.status]||[r.status,'b-completed'];
    var _days=_rqAge(r), _bc=parseInt(r.bid_count)||0, _stale=_rqStale(r);
    var _ago=_days==null?'—':(_days<=0?'اليوم':(_days===1?'أمس':(_days===2?'يومين':(_days<=10?_days+' أيام':_days+' يوم'))));var _left=_rqLeft(r);
    var th=_rqThumb(r);
    var sel=(window._rqSel===r.id)?' class="sel"':'';
    return '<tr'+sel+' data-rid="'+r.id+'" onclick="_rqRowClick(event,'+r.id+')"'+(_stale?' style="background:#fffafa"':'')+'>'
      +'<td><div style="display:flex;gap:10px;align-items:center;min-width:0"><div class="rq-th">'+(th?'<img loading="lazy" src="'+esc(_safeUrl(th))+'" alt="">':'<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>')+'</div><div style="min-width:0"><div style="font-weight:800;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px">'+esc(r.title)+'</div><div style="font-size:11.5px;color:var(--muted);margin-top:2px"><b style="color:var(--p)">#'+r.id+'</b> · '+_catLbl(r)+(r.city?' · '+esc(r.city):'')+_cnPill(r)+(_noSaai(r)?' <span class="pl" style="background:#fef2f2;color:#b91c1c;font-size:10.5px">💰 بدون سعي</span>':'')+'</div></div></div></td>'
      +'<td style="font-size:12.5px">'+esc(r.client_name||'—')+'</td>'
      +'<td><span class="badge '+st[1]+'">'+st[0]+'</span>'+(r.close_info?'<div style="font-size:11px;font-weight:800;margin-top:5px;max-width:160px;line-height:1.45;color:'+(r.close_info.by==='client'?'#b45309':(r.close_info.by==='admin'?'#0f766e':'#64748b'))+'">'+esc(r.close_info.short)+'</div>':'')+'</td>'
      +'<td style="text-align:center">'+(_stale?'<span class="rq-stale">0 · '+_days+' أيام</span>':(_bc===0?'<span style="color:var(--muted);font-weight:600">0</span>':'<span style="font-weight:900;color:#059669">'+_bc+'</span>'))+'</td>'
      +'<td style="text-align:center;white-space:nowrap" title="'+(parseInt(r.views_total)||0)+' زيارة · '+(parseInt(r.views_unique)||0)+' زائر مختلف · '+(parseInt(r.views_prov)||0)+' مزوّد">'+((parseInt(r.views_unique)||0)?'<b style="font-size:14px">'+(parseInt(r.views_unique)||0)+'</b>'+((parseInt(r.views_prov)||0)?'<div style="font-size:11px;font-weight:800;color:#c2410c">'+(parseInt(r.views_prov)||0)+' مزوّد</div>':''):'<span style="color:var(--muted);font-weight:600">0</span>')+'</td>'
      +'<td style="font-size:13px;font-weight:800;'+(_stale?'color:#b91c1c':'')+'">'+_ago+'</td>'
      +'<td style="font-size:12.5px;font-weight:800;color:'+_left[1]+'">'+_left[0]+'</td>'
      +'<td><div class="act-btns"><button class="act-btn ab-default" onclick="_rqOpen('+r.id+')">'+eye+'تفاصيل</button>'
+'</div></td>'
    +'</tr>';
  }).join('')+'</tbody></table>'+_pager('r',_rTotal);
}
// ═══ كل إجراءات المشروع داخل لوحة التفاصيل ═══
function _rqActs(r){
  var id=r.id, st=r.status;
  var ic=function(d){return '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">'+d+'</svg>';};
  var b=function(label,fn,svg,col){return '<button class="btn-g" onclick="_rqClose();'+fn+'" style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;padding:9px 8px'+(col?';color:'+col+';border-color:'+col+'33':'')+'">'+ic(svg)+label+'</button>';};
  var items=[];
  var _apv=(st==='needs_edit'||st==='pending_review'||st==='rejected')?'<button class="btn-g" onclick="_rqApprove('+id+')" style="width:100%;display:flex;align-items:center;justify-content:center;gap:7px;font-size:14px;font-weight:900;padding:12px;margin-bottom:7px;background:#16a34a;color:#fff;border-color:#16a34a">'+ic('<polyline points="20 6 9 17 4 12"/>')+'اعتماد ونشر للمزوّدين</button>':'';
  if(st==='open') items.push(b('دعوة المزوّدين','openInvite('+id+')','<path d="M3 11l18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 11-5.8-1.6"/>','#1d4ed8'));
  if(st==='needs_edit') items.push(b('تذكير العميل','remindClient('+id+')','<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>','#059669'));
  if(st==='completed') items.push(b(r.featured?'إزالة من المعرض':'تثبيت في المعرض','toggleFeaturedRow('+id+')','<polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"/>','#a16207'));
  items.push(b('تقرير العروض','printOffersReport('+id+')','<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>'));
  items.push(b('إرسال للعميل','sendOffersReport('+id+')','<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>'));
  items.push(b('كراسة لمزوّدين','_oBriefFromReq('+id+')','<path d="M9 2h6a2 2 0 012 2v16a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/>'));
  items.push(b('رابط دخول العميل','_clientLoginLink('+id+')','<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>'));
  if(st==='open'||st==='pending_review'||st==='needs_edit') items.push(b('إغلاق المشروع','_rqCloseProj('+id+')','<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>','#b45309'));
  items.push(b('حذف المشروع','deleteRequest('+id+')','<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>','#dc2626'));
  return '<div class="rq-ds"><h4>⚡ إجراءات</h4>'+_apv+'<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px">'+items.join('')+'</div></div>';
}
function _catLbl(r){ if(!r||!r.category)return ''; return (r.category==='أخرى'&&r.category_other)?'⚠️ أخرى: '+esc(r.category_other):esc(r.category); }
async function _rqApprove(id){
  var r=(_allReq||[]).find(function(x){return x.id===id;})||{};
  var msg=(r.status==='rejected'?'المشروع مرفوض سابقاً — ':'')+'سيُنشر المشروع ويُرسل إشعار للعميل وللمزوّدين المطابقين ('+(r.category||'')+(r.city?' · '+r.city:'')+').';
  if(!await askConfirm({title:'اعتماد ونشر',message:msg,confirmText:'نعم، انشر'}))return;
  fetch(API+'/api/admin/requests/'+id+'/review',Object.assign({method:'PUT',body:JSON.stringify({action:'approve',reason:null})},hdr()))
    .then(function(x){return x.json().then(function(d){return{ok:x.ok,d:d};});})
    .then(function(res){
      if(!res.ok){toast((res.d&&res.d.message)||'تعذّر الاعتماد','error');return;}
      toast('تم الاعتماد والنشر ✓ — وصل إشعار للمزوّدين المطابقين','success');
      r.status='open'; _rqClose(); loadRequests(); setTimeout(function(){try{_rqOpen(id);}catch(e){}},700);
    }).catch(function(){toast('تعذّر الاعتماد','error');});
}
// ═══ إعادة فتح / تمديد مدة العروض ═══
var _RQ_CLOSED=['closed_auto','expired','cancelled','closed'];
var _RO_REASONS={chose_outside:'اتفق مع مزوّد من برا المنصة',price_high:'الأسعار عالية',postponed:'أجّل المشروع',no_suitable_offers:'ما لقى عرض مناسب',other:'سبب آخر',admin_closed:'أغلقته الإدارة'};
function _rqLeft(r){
  if(_RQ_CLOSED.indexOf(r.status)>=0) return ['مغلق','#64748b'];
  if(r.status!=='open') return ['—','var(--muted)'];
  if(!r.close_time) return ['—','var(--muted)'];
  var d=Math.ceil((new Date(r.close_time)-Date.now())/86400000);
  if(d<=0) return ['اليوم','#b91c1c'];
  return [d===1?'يوم':(d===2?'يومين':(d<=10?d+' أيام':d+' يوم')), d<=3?'#b91c1c':(d<=7?'#b45309':'#15803d')];
}
function _roSection(r){
  var closed=_RQ_CLOSED.indexOf(r.status)>=0, open=r.status==='open';
  if(!(closed||open)||r.assigned_provider_id) return '';
  var dd=r.close_time?new Date(r.close_time):null;
  var left=dd?Math.ceil((dd-Date.now())/86400000):null;
  var chips=[7,14,30,60,90].map(function(n){return '<button type="button" class="ftab ro-d" data-d="'+n+'" onclick="_roPick('+r.id+','+n+')" style="border:1.5px solid var(--border)">'+n+' يوم</button>';}).join('');
  var h='<div class="rq-ds" style="border:1.5px solid '+(closed?'#93c5fd':'var(--border)')+';background:'+(closed?'#f5f9ff':'#fff')+';border-radius:14px;padding:12px 14px">'
    +'<h4 style="color:#1e3a8a">'+(closed?'🔓 إعادة فتح المشروع':'⏳ مدة استقبال العروض')+'</h4>';
  if(closed){
    var ci=r.close_info||{};
    var who={client:['👤 العميل أغلقه','#b45309','#fffbeb'],admin:['🛡 الإدارة أغلقته','#0f766e','#f0fdfa'],auto:['⏱ أُغلق تلقائياً','#475569','#f8fafc']}[ci.by]||['مغلق','#475569','#f8fafc'];
    h+='<div style="background:'+who[2]+';border:1px solid #e2e8f0;border-radius:11px;padding:9px 11px;display:flex;flex-direction:column;gap:4px">'
      +'<b style="font-size:13px;color:'+who[1]+'">'+who[0]+'</b>'
      +'<div style="font-size:12.5px;font-weight:700;color:var(--text2);line-height:1.7">'+esc(ci.text||'انتهت المدة بدون اختيار عرض')+'</div>'
      +'<div style="font-size:11.5px;font-weight:700;color:var(--muted)">'+[r.created_at?'نُشر '+new Date(r.created_at).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short'}):'',r.closed_at?'أُغلق '+new Date(r.closed_at).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short'}):'',ci.open_days!=null?'ظل مفتوح '+ci.open_days+' يوم':''].filter(Boolean).join(' · ')+'</div></div>';
  } else {
    h+='<div style="font-size:12.5px;font-weight:700;color:var(--muted)">'+(dd?'يُغلق '+(left<=0?'اليوم':'بعد <b style="color:'+(left<=3?'#b91c1c':'#15803d')+'">'+left+' يوم</b>')+' · '+dd.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'long'}):'')+'</div>';
  }
  h+='<div style="font-size:12.5px;font-weight:800;margin-top:8px">'+(closed?'افتحه لمدة:':'مدّد بـ:')+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px" id="ro-chips-'+r.id+'">'+chips+'<label style="font-size:12.5px;font-weight:700;display:inline-flex;align-items:center;gap:5px">أو <input id="ro-d-'+r.id+'" type="number" min="1" max="365" placeholder="أيام" oninput="_roPick('+r.id+',0)" style="width:70px;padding:7px 9px;border:1.5px solid var(--border);border-radius:9px;font-family:inherit;font-weight:800"></label></div>';
  if(closed){
    h+='<div style="display:flex;flex-direction:column;gap:5px;margin-top:9px;font-size:12.5px;font-weight:700"><label><input type="checkbox" id="ro-nc-'+r.id+'" checked> أبلّغ العميل إن مشروعه انفتح</label><label><input type="checkbox" id="ro-np-'+r.id+'"> أرسل تنبيه للمزوّدين المطابقين اللي ما قدّموا</label></div>';
  }
  h+='<button id="ro-btn-'+r.id+'" onclick="_roGo('+r.id+','+(closed?1:0)+')" style="margin-top:10px;width:100%;border:0;background:#1d4ed8;color:#fff;border-radius:11px;padding:11px;font-family:inherit;font-weight:900;font-size:14px;cursor:pointer">'+(closed?'إعادة فتح المشروع':'تمديد المدة')+'</button></div>';
  return h;
}
function _roPick(id,n){
  var box=document.getElementById('ro-chips-'+id); if(!box)return;
  box.querySelectorAll('.ro-d').forEach(function(b){ var on=n&&+b.getAttribute('data-d')===n; b.style.background=on?'#1e3a8a':''; b.style.color=on?'#fff':''; b.style.borderColor=on?'#1e3a8a':''; });
  if(n){ var i=document.getElementById('ro-d-'+id); if(i)i.value=''; window._roDays=n; } else { window._roDays=parseInt((document.getElementById('ro-d-'+id)||{}).value)||0; }
}
async function _roGo(id,closed){
  var d=window._roDays||parseInt((document.getElementById('ro-d-'+id)||{}).value)||0;
  if(!(d>=1&&d<=365)){toast('اختر المدة (أيام)','error');return;}
  if(!await askConfirm({title:closed?'إعادة فتح المشروع':'تمديد المدة',message:(closed?'يرجع المشروع مفتوح للعروض لمدة ':'يتمدد استقبال العروض ')+d+' يوم.',confirmText:closed?'افتحه':'مدّد'}))return;
  var b=document.getElementById('ro-btn-'+id); if(b){b.disabled=true;b.textContent='...';}
  var body={days:d,notify_client:!!(document.getElementById('ro-nc-'+id)||{}).checked,notify_providers:!!(document.getElementById('ro-np-'+id)||{}).checked};
  fetch(API+'/api/admin/requests/'+id+'/reopen',Object.assign({method:'POST',body:JSON.stringify(body)},hdr()))
    .then(function(r){return r.json().then(function(x){return {ok:r.ok,d:x};});})
    .then(function(x){
      if(!x.ok){toast((x.d&&x.d.message)||'تعذّر التنفيذ','error'); if(b){b.disabled=false;b.textContent=closed?'إعادة فتح المشروع':'تمديد المدة';} return;}
      window._roDays=0;
      toast((x.d.reopened?'انفتح المشروع':'تم التمديد')+' — يُغلق '+new Date(x.d.close_at).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'long'})+(x.d.sent?' · وصل تنبيه لـ '+x.d.sent+' مزوّد':''),'success');
      (_allReq||[]).forEach(function(r){ if(r.id===id){ r.status='open'; r.close_at=x.d.close_at; r.close_time=x.d.close_at; } });
      try{renderRequests();}catch(e){}
      _rqOpen(id);
    }).catch(function(){toast('تعذّر الاتصال','error'); if(b){b.disabled=false;}});
}
function _saOpenProj(rid,edit){
  _rqOpen(rid);
  if(!edit)return;
  var n=0;(function f(){var b=document.querySelector('#rqDrawer [id^="sa-edb-"]');if(b){b.click();b.scrollIntoView({block:'center',behavior:'smooth'});return;}if(++n<40)setTimeout(f,150);})();
}
function _saEditShow(sid,hide){var f=document.getElementById('sa-ed-'+sid),b=document.getElementById('sa-edb-'+sid);if(f)f.style.display=hide?'none':'block';if(b)b.style.display=hide?'':'none';if(!hide){var i=document.getElementById('sa-e-cv-'+sid);if(i){i.focus();try{i.select();}catch(e){}}}}
function _saEditCalc(sid){var cv=document.getElementById('sa-e-cv-'+sid),am=document.getElementById('sa-e-am-'+sid);if(!cv||!am)return;var c=parseFloat(cv.value)||0;am.textContent=c>=50?fmtNum(Math.round(c*0.03))+' ر.س':'—';}
function _saEditSave(sid,rid){
  var c=Math.round(parseFloat((document.getElementById('sa-e-cv-'+sid)||{}).value)||0);
  var nt=((document.getElementById('sa-e-nt-'+sid)||{}).value||'').trim();
  if(c<50){toast('اكتب قيمة عقد صحيحة','error');return;}
  var b=document.getElementById('sa-e-sv-'+sid);if(b){b.disabled=true;b.textContent='جاري الحفظ...';}
  fetch(API+'/api/admin/saai/'+sid+'/edit',Object.assign({method:'POST',body:JSON.stringify({contract_value:c,note:nt})},hdr()))
    .then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});})
    .then(function(x){
      if(!x.ok){toast((x.d&&x.d.message)||'تعذّر الحفظ','error');if(b){b.disabled=false;b.textContent='حفظ ويوصل المزوّد إشعار';}return;}
      toast('تم تعديل السعي: '+fmtNum(x.d.saai_amount)+' ر.س ✓','success');
      _rqOpen(rid);
      try{if(document.getElementById('page-saai').classList.contains('on'))loadSaaiAdmin();}catch(e){}
    }).catch(function(){toast('تعذّر الاتصال','error');if(b){b.disabled=false;b.textContent='حفظ ويوصل المزوّد إشعار';}});
}
// ═══ إنشاء سعي يدوي مع اقتراح القيمة ═══
function _noSaai(r){ return (r.status==='in_progress'||r.status==='completed')&&r.assigned_provider_id&&!r.saai_id; }
function _saSection(r,sa,sg){
  if(sa){
    var stl={pending:['بانتظار السداد','#fef3c7','#92400e'],submitted:['أرسل إثبات — راجعه','#e6eeff','#1d4ed8'],approved:['مسدّد ✓','#dcfce7','#15803d'],rejected:['مرفوض','#fef2f2','#b91c1c'],deferred:['⏸ مؤجّل'+(sa.defer_until?' لـ '+new Date(sa.defer_until).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short'}):''),'#e0e7ff','#3730a3'],cancelled:['ملغي','#f1f5f9','#64748b']}[sa.status]||[sa.status,'#f1f5f9','#334766'];
    var act='';
    if(sa.status!=='approved'&&sa.status!=='cancelled'){
      act='<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button id="sa-ap-'+sa.id+'" onclick="_saApprove('+sa.id+','+r.id+')" style="flex:1;border:0;background:#16a34a;color:#fff;border-radius:11px;padding:10px;font-family:inherit;font-weight:900;font-size:13.5px;cursor:pointer">✅ تأكيد استلام السعي</button><button class="btn-g" onclick="_rqClose();_niGo(\'saai\')">صفحة سداد السعي</button></div>'
        +'<div style="font-size:11.5px;color:var(--muted);margin-top:6px">'+(sa.status==='submitted'?'المزوّد أرسل إثبات السداد — راجعه في «سداد السعي» قبل التأكيد.':'اضغط التأكيد لما يوصلك المبلغ (تحويل أو غيره)، حتى لو المزوّد ما رفع إثبات.')+'</div>';
    }
    var edit=(sa.status!=='approved'&&sa.status!=='cancelled')?('<button type="button" class="btn-g" id="sa-edb-'+sa.id+'" style="margin-top:10px;width:100%" onclick="_saEditShow('+sa.id+')">✏️ تعديل قيمة العقد</button>'
      +'<div id="sa-ed-'+sa.id+'" style="display:none;margin-top:10px;background:#f8fafc;border:1px solid var(--border);border-radius:12px;padding:12px">'
      +'<label style="font-size:12px;font-weight:800;display:block">قيمة العقد النهائية (ر.س)<input id="sa-e-cv-'+sa.id+'" type="number" inputmode="numeric" min="50" value="'+Math.round(sa.contract_value)+'" oninput="_saEditCalc('+sa.id+')" style="width:100%;margin-top:4px;padding:9px;border:1px solid var(--border);border-radius:9px;font-family:inherit;font-size:14px;box-sizing:border-box"></label>'
      +'<div style="margin-top:8px;font-size:13px;font-weight:800">السعي (3%): <b id="sa-e-am-'+sa.id+'" style="color:#15803d;font-size:15px">'+fmtNum(Math.round(sa.contract_value*0.03))+' ر.س</b></div>'
      +'<input id="sa-e-nt-'+sa.id+'" placeholder="سبب التعديل (اختياري — يوصل للمزوّد)" style="width:100%;margin-top:8px;padding:9px;border:1px solid var(--border);border-radius:9px;font-family:inherit;font-size:13px;box-sizing:border-box">'
      +'<div style="display:flex;gap:8px;margin-top:10px"><button type="button" id="sa-e-sv-'+sa.id+'" onclick="_saEditSave('+sa.id+','+r.id+')" style="flex:1;border:0;background:#1e3a8a;color:#fff;border-radius:10px;padding:10px;font-family:inherit;font-weight:900;font-size:13.5px;cursor:pointer">حفظ ويوصل المزوّد إشعار</button><button type="button" class="btn-g" onclick="_saEditShow('+sa.id+',1)">إلغاء</button></div></div>'):'';
    return '<div class="rq-ds"><h4>💰 سعي المنصة<span class="pl" style="background:'+stl[1]+';color:'+stl[2]+'">'+stl[0]+'</span></h4><div style="display:flex;gap:16px;font-size:13.5px"><div>قيمة العقد <b>'+fmtNum(sa.contract_value)+'</b></div><div>السعي <b style="color:#15803d">'+fmtNum(sa.saai_amount)+' ر.س</b></div></div>'+edit+act+'</div>';
  }
  if(!sg) return '';
  var opts=(sg.options||[]).map(function(o){
    if(o.key==='accepted'&&!o.ok){ return '<span style="font-size:12px;font-weight:800;color:#b45309;background:#fffbeb;border:1px dashed #fcd34d;border-radius:999px;padding:6px 11px">العرض المقبول '+fmtNum(o.raw)+(o.unit&&o.unit!=='total'?(o.unit==='meter'?' /متر':' /وحدة'):'')+' — ما يصلح كقيمة عقد</span>'; }
    return '<button type="button" class="ftab" onclick="_saPick('+r.id+','+Number(o.value)+')" style="border:1.5px solid #bbf7d0;background:#f0fdf4;color:#166534">'+esc(o.label)+' · '+fmtNum(o.value)+'</button>';
  }).join('');
  var v=sg.best||'';
  return '<div class="rq-ds" style="border:1.5px solid #fecaca;background:#fffafa;border-radius:14px;padding:12px 14px"><h4 style="color:#b91c1c">💰 بدون سعي<span style="font-size:11px;color:#64748b;font-weight:700">المزوّد: '+esc(sg.provider_name||r.provider_name||'—')+'</span></h4>'
    +'<div style="font-size:12.5px;color:var(--muted);font-weight:700">المشروع انقبل وما له سجل سعي. اختر اقتراح أو اكتب قيمة العقد الحقيقية:</div>'
    +(opts?'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+opts+'</div>':'')
    +(sg.unit&&sg.unit!=='total'&&sg.unit_price?'<div style="margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:11px;padding:10px 12px"><div style="font-size:12.5px;font-weight:900;color:#1e40af;margin-bottom:6px">🧮 العرض '+(sg.unit==='meter'?'بالمتر':'بالوحدة')+' — احسب قيمة العقد:</div><div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:13px;font-weight:800"><input id="sa-qty-'+r.id+'" type="number" inputmode="numeric" min="1" placeholder="'+(sg.unit==='meter'?'المساحة م²':'العدد')+'" oninput="_saQty('+r.id+','+sg.unit_price+')" style="width:110px;padding:8px 10px;border:1.5px solid #bfdbfe;border-radius:9px;font-family:inherit;font-size:14px;font-weight:800"> × '+fmtNum(sg.unit_price)+' ر.س <span id="sa-qtyres-'+r.id+'" style="color:#1e40af"></span></div><div style="font-size:11.5px;color:#475569;margin-top:5px">اسأل العميل أو المزوّد عن '+(sg.unit==='meter'?'المساحة الفعلية':'العدد الفعلي')+'.</div></div>':'')
    +'<div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap"><label style="font-size:12.5px;font-weight:800">قيمة العقد <input id="sa-cv-'+r.id+'" type="number" inputmode="numeric" min="50" value="'+esc(v)+'" oninput="_saCalc('+r.id+')" style="width:120px;padding:8px 10px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:14px;font-weight:800"> ر.س</label>'
    +'<span id="sa-fee-'+r.id+'" style="font-size:13px;font-weight:900;color:#15803d">'+(v?'السعي '+fmtNum(Math.round(v*sg.rate))+' ر.س':'')+'</span></div>'
    +'<button id="sa-btn-'+r.id+'" onclick="_saCreate('+r.id+')" style="margin-top:10px;width:100%;border:0;background:#dc2626;color:#fff;border-radius:11px;padding:11px;font-family:inherit;font-weight:900;font-size:14px;cursor:pointer">إنشاء سعي</button>'
    +'<div style="font-size:11.5px;color:var(--muted);margin-top:6px">يوصل المزوّد إشعار بالمبلغ، ويظهر في محفظته ويقدر يعدّله لو الاتفاق النهائي مختلف.</div></div>';
}
async function _saApprove(sid,rid){
  if(!await askConfirm({title:'تأكيد استلام السعي',message:'يتسجّل السعي «مسدّد» ويوصل المزوّد إشعار شكر.',confirmText:'تأكيد الاستلام'}))return;
  var b=document.getElementById('sa-ap-'+sid); if(b){b.disabled=true;b.textContent='...';}
  fetch(API+'/api/admin/saai/'+sid+'/approve',Object.assign({method:'POST'},hdr())).then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});})
    .then(function(x){ if(!x.ok){toast((x.d&&x.d.message)||'تعذّر','error'); if(b){b.disabled=false;b.textContent='✅ تأكيد استلام السعي';} return;} toast('تم تأكيد استلام السعي ✓','success'); _rqOpen(rid); })
    .catch(function(){toast('تعذّر الاتصال','error'); if(b)b.disabled=false;});
}
function _saQty(id,up){ var q=parseFloat((document.getElementById('sa-qty-'+id)||{}).value)||0, v=Math.round(q*up), r=document.getElementById('sa-qtyres-'+id); if(r)r.textContent=q?'= '+fmtNum(v)+' ر.س':''; if(q)_saPick(id,v); }
function _saPick(id,v){ var i=document.getElementById('sa-cv-'+id); if(i){i.value=v;_saCalc(id);} }
function _saCalc(id){ var i=document.getElementById('sa-cv-'+id),f=document.getElementById('sa-fee-'+id); if(!i||!f)return; var v=parseFloat(i.value)||0; f.textContent=v>=50?'السعي '+fmtNum(Math.round(v*0.03))+' ر.س':''; }
async function _saCreate(id){
  var v=Math.round(parseFloat((document.getElementById('sa-cv-'+id)||{}).value)||0);
  if(v<50){toast('اكتب قيمة عقد صحيحة','error');return;}
  if(!await askConfirm({title:'إنشاء سعي',message:'قيمة العقد '+fmtNum(v)+' ر.س — السعي '+fmtNum(Math.round(v*0.03))+' ر.س. يوصل المزوّد إشعار بالمبلغ.',confirmText:'أنشئ السعي'}))return;
  var b=document.getElementById('sa-btn-'+id); if(b){b.disabled=true;b.textContent='جاري الإنشاء...';}
  fetch(API+'/api/admin/requests/'+id+'/saai',Object.assign({method:'POST',body:JSON.stringify({contract_value:v})},hdr()))
    .then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});})
    .then(function(x){
      if(!x.ok){toast((x.d&&x.d.message)||'تعذّر الإنشاء','error'); if(b){b.disabled=false;b.textContent='إنشاء سعي';} return;}
      toast('تم إنشاء السعي '+fmtNum(x.d.saai_amount)+' ر.س ✓','success');
      (_allReq||[]).forEach(function(r){ if(r.id===id) r.saai_id=x.d.id; });
      try{renderRequests();}catch(e){}
      _rqOpen(id);
    }).catch(function(){toast('تعذّر الاتصال','error'); if(b){b.disabled=false;b.textContent='إنشاء سعي';}});
}
// ═══ ملاحظات الإدارة للعميل (تظهر لصاحب المشروع فقط، بدون إشعار) ═══
var _CN_TPL=[['📐 المساحة','أضف المساحة التقريبية بالمتر المربع'],['🗺️ مخطط','أرفق مخطط أو كروكي — حتى لو رسمة يد بالجوال'],['📷 صور','أضف صور واضحة للموقع الحالي'],['🧱 المواد','حدّد المواد المطلوبة ومستوى الجودة'],['📅 الموعد','وضّح الموعد المطلوب للتنفيذ'],['📍 الموقع','حدّد موقع المشروع على الخريطة'],['📝 التفاصيل','اشرح المطلوب بتفصيل أكثر (الكميات والأبعاد)']];
function _cnState(r){ if(!r||!r.client_note)return null; if(r.client_note_done_at)return ['عدّل ✓','#dcfce7','#15803d']; if(r.client_note_hidden)return ['أخفاها','#f1f5f9','#475569']; if(r.client_note_seen_at)return ['شافها','#fef3c7','#92400e']; return ['ما شافها بعد','#eef3fb','#334766']; }
function _cnPill(r){ var st=_cnState(r); return st?' <span class="pl" style="background:'+st[1]+';color:'+st[2]+';font-size:10.5px">💡 '+st[0]+'</span>':''; }
function _cnFmt(d){ if(!d)return ''; try{ return new Date(d).toLocaleString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'}); }catch(e){ return ''; } }
function _cnSection(r){
  var has=!!r.client_note;
  var h='<div class="rq-ds" style="border:1.5px solid '+(has?'#f59e0b':'#fde68a')+';background:#fffdf7;border-radius:14px;padding:12px 14px"><h4 style="color:#92400e">💡 ملاحظة للعميل<span style="font-size:11px;color:#1e3a8a;background:#eef3ff;border-radius:999px;padding:2px 8px">🔒 لصاحب المشروع فقط</span></h4>';
  if(has){
    h+='<div style="font-size:13px;line-height:1.8;white-space:pre-wrap;color:var(--text2);background:#fff;border:1px solid #fde68a;border-radius:10px;padding:8px 10px">'+esc(r.client_note)+'</div>';
    h+='<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;font-weight:800;margin-top:6px"><span style="color:#15803d">✓ أُضيفت '+_cnFmt(r.client_note_at)+'</span>'
      +(r.client_note_seen_at?'<span style="color:#15803d">👁 شافها '+_cnFmt(r.client_note_seen_at)+'</span>':'<span style="color:#94a3b8">○ ما شافها بعد</span>')
      +(r.client_note_done_at?'<span style="color:#15803d">✏️ عدّل المشروع '+_cnFmt(r.client_note_done_at)+'</span>':(r.client_note_hidden?'<span style="color:#64748b">أخفاها بدون تعديل</span>':'<span style="color:#94a3b8">○ ما عدّل بعد</span>'))+'</div>';
  } else {
    h+='<div style="font-size:12.5px;color:var(--muted);font-weight:700">المشروع ناقص معلومات؟ اترك له ملاحظة تظهر في صفحة مشروعه فوق العروض — بدون إشعار ولا إزعاج.</div>';
  }
  h+='<div style="display:flex;gap:8px;margin-top:8px"><button class="btn-g" style="flex:1;color:#92400e;border-color:#fcd34d" onclick="_cnOpen('+r.id+')">'+(has?'تعديل الملاحظة':'+ إضافة ملاحظة')+'</button>'+(has?'<button class="btn-g" style="color:#dc2626;border-color:#fecaca" onclick="_cnSave('+r.id+',true)">حذف</button>':'')+'</div></div>';
  return h;
}
function _cnFind(id){ return (_allReq||[]).filter(function(x){return x.id===id;})[0]||(window._projReview||[]).filter(function(x){return x.id===id;})[0]||{id:id}; }
function _cnOpen(id){
  var r=_cnFind(id);
  var old=document.getElementById('cnModal'); if(old)old.remove();
  var d=document.createElement('div'); d.id='cnModal';
  d.style.cssText='position:fixed;inset:0;z-index:3000;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:16px';
  d.innerHTML='<div style="background:#fff;border-radius:18px;width:100%;max-width:560px;max-height:90vh;overflow:auto;padding:20px;display:flex;flex-direction:column;gap:12px;direction:rtl">'
    +'<div style="display:flex;align-items:center;gap:8px"><span style="font-size:20px">💡</span><b style="font-size:17px;flex:1">ملاحظة للعميل · #'+id+'</b><span class="pl" style="background:#eef3ff;color:#1e3a8a">🔒 لصاحب المشروع فقط</span><button onclick="document.getElementById(\'cnModal\').remove()" style="border:0;background:#f1f5f9;border-radius:10px;width:32px;height:32px;cursor:pointer">✕</button></div>'
    +(r.title?'<div style="font-size:13px;color:var(--muted);font-weight:700">'+esc(r.title)+'</div>':'')
    +'<div style="font-size:12.5px;font-weight:800;color:var(--muted)">قوالب سريعة — اضغط لإضافتها:</div>'
    +'<div style="display:flex;gap:7px;flex-wrap:wrap">'+_CN_TPL.map(function(t,i){return '<button type="button" class="ftab" onclick="_cnAdd('+i+')" style="border:1.5px solid #fde68a;background:#fffbeb;color:#92400e">'+t[0]+'</button>';}).join('')+'</div>'
    +'<textarea id="cn-text" rows="6" placeholder="اكتب الملاحظة — كل نقطة في سطر" style="width:100%;box-sizing:border-box;padding:12px;border:1.5px solid var(--border);border-radius:12px;font-family:inherit;font-size:14px;line-height:1.9;resize:vertical">'+esc(r.client_note||'')+'</textarea>'
    +'<div style="font-size:12px;color:var(--muted);font-weight:700;background:#f8fafd;border-radius:10px;padding:8px 10px">تظهر للعميل في صفحة مشروعه فوق العروض، مع زر «أضف المعلومات الآن». ما يوصله إشعار ولا رسالة، ولا تظهر لأي مزوّد.</div>'
    +'<div style="display:flex;gap:8px"><button id="cn-save" onclick="_cnSave('+id+')" style="flex:1;border:0;background:#f59e0b;color:#fff;border-radius:11px;padding:12px;font-family:inherit;font-weight:900;font-size:14px;cursor:pointer">حفظ وإظهارها للعميل</button>'
    +(r.client_note?'<button onclick="_cnSave('+id+',true)" class="btn-g" style="color:#dc2626;border-color:#fecaca">حذف الملاحظة</button>':'')+'</div></div>';
  d.onclick=function(e){if(e.target===d)d.remove();};
  document.body.appendChild(d);
  setTimeout(function(){var t=document.getElementById('cn-text');if(t)t.focus();},50);
}
function _cnAdd(i){ var t=document.getElementById('cn-text'); if(!t)return; var line=_CN_TPL[i][1]; if(t.value.indexOf(line)>=0)return; t.value=(t.value.trim()?t.value.replace(/\s+$/,'')+'\n':'')+line; t.focus(); }
async function _cnSave(id,del){
  var note='';
  if(!del){ note=((document.getElementById('cn-text')||{}).value||'').trim(); if(!note){toast('اكتب الملاحظة أو اختر قالب','error');return;} }
  else if(!await askConfirm({title:'حذف الملاحظة',message:'تختفي الملاحظة من صفحة العميل.',confirmText:'احذف'}))return;
  var b=document.getElementById('cn-save'); if(b){b.disabled=true;b.textContent='جاري الحفظ...';}
  fetch(API+'/api/admin/requests/'+id+'/client-note',Object.assign({method:'PUT',body:JSON.stringify({note:note})},hdr()))
    .then(function(r){return r.json().then(function(x){return {ok:r.ok,d:x};});})
    .then(function(x){
      if(!x.ok){toast((x.d&&x.d.message)||'تعذّر الحفظ','error'); if(b){b.disabled=false;b.textContent='حفظ وإظهارها للعميل';} return;}
      var m=document.getElementById('cnModal'); if(m)m.remove();
      toast(del?'حُذفت الملاحظة':'تم — تظهر للعميل في صفحة مشروعه ✓','success');
      [_allReq||[],window._projReview||[]].forEach(function(list){list.forEach(function(r){ if(r.id===id){ r.client_note=del?null:note; r.client_note_at=del?null:new Date().toISOString(); r.client_note_seen_at=null; r.client_note_done_at=null; r.client_note_hidden=false; } });});
      if(window._rqSel===id&&document.getElementById('rqDrawer')&&document.getElementById('rqDrawer').classList.contains('on'))_rqOpen(id);
      try{renderRequests();}catch(e){}
    }).catch(function(){toast('تعذّر الاتصال','error'); if(b){b.disabled=false;b.textContent='حفظ وإظهارها للعميل';}});
}
function _rqRowClick(e,id){ if(e.target.closest('.act-btns,a,button,input'))return; _rqOpen(id); }
function _rqClose(){ var d=document.getElementById('rqDrawer'),o=document.getElementById('rqOv'); if(d)d.classList.remove('on'); if(o)o.style.display='none'; window._rqSel=null; document.querySelectorAll('#requests-table tr.sel').forEach(function(x){x.classList.remove('sel');}); }
function _rqOpen(id){
  window._rqSel=id;
  document.querySelectorAll('#requests-table tbody tr').forEach(function(x){ x.classList.toggle('sel', +x.getAttribute('data-rid')===id); });
  var d=document.getElementById('rqDrawer');
  if(!d){ var o=document.createElement('div'); o.id='rqOv'; o.className='rq-ov'; o.onclick=_rqClose; document.body.appendChild(o); d=document.createElement('aside'); d.id='rqDrawer'; d.className='rq-dr'; d.setAttribute('aria-label','تفاصيل المشروع'); document.body.appendChild(d); document.addEventListener('keydown',function(e){ if(e.key==='Escape')_rqClose(); }); }
  document.getElementById('rqOv').style.display='block';
  d.innerHTML='<div class="loading" style="padding:40px"><div class="spinner"></div></div>';
  requestAnimationFrame(function(){ d.classList.add('on'); });
  fetch(API+'/api/admin/requests/'+id+'/detail',hdr()).then(function(r){return r.json();}).then(function(x){
    if(!x||!x.request){ d.innerHTML='<div style="padding:30px">'+emptyState('تعذّر التحميل')+'</div>'; return; }
    var r=x.request, bids=x.bids||[], tl=x.timeline||[];
    var sm={open:['مفتوح','#e3f5e9','#166534'],in_progress:['قيد التنفيذ','#e6eeff','#1d4ed8'],completed:['مكتمل','#f1f5f9','#334766'],pending_review:['مراجعة','#fef3c7','#92400e'],needs_edit:['مطلوب تعديل','#fff7ed','#c2410c'],rejected:['مرفوض','#fef2f2','#b91c1c'],closed_auto:['مغلق','#f1f5f9','#475569'],expired:['منتهي','#f1f5f9','#475569'],cancelled:['ملغي','#f1f5f9','#475569'],closed:['مغلق','#f1f5f9','#475569']}[r.status]||[r.status,'#f1f5f9','#334766'];
    var ph=String(r.client_phone||'').replace(/\D/g,''); if(ph.indexOf('05')===0)ph='966'+ph.slice(1);
    var prices=bids.filter(function(b){return (!b.price_unit||b.price_unit==='total')&&parseFloat(b.price)>0;}).map(function(b){return parseFloat(b.price);});
    var mn=prices.length?Math.min.apply(null,prices):0, av=prices.length?prices.reduce(function(a,b){return a+b;},0)/prices.length:0;
    var FL={outside_region:'خارج المنطقة',spam_speed:'عروض سريعة',contact_share:'رقم في العرض'};
    var atts=[]; try{ var at=r.attachments; if(typeof at==='string')at=JSON.parse(at); if(Array.isArray(at))atts=at.filter(function(a){return a&&a.url;}); }catch(e){}
    var imgs=[]; try{ var a=r.images; if(typeof a==='string')a=JSON.parse(a); if(Array.isArray(a))imgs=a.filter(function(u){return typeof u==='string'&&u.indexOf('http')===0;}); }catch(e){}
    var h='<div class="rq-dh"><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:800;color:var(--muted)">#'+r.id+' · نُشر '+_adAgo(r.created_at)+'</div><div style="font-size:18px;font-weight:900;line-height:1.4">'+esc(r.title||'')+'</div>'
      +'<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><span class="pl" style="background:'+sm[1]+';color:'+sm[2]+'">'+sm[0]+'</span>'+(r.category?'<span class="pl" style="background:'+(r.category==='أخرى'?'#fff7ed;color:#c2410c':'#eef3fb;color:#334766')+'" title="'+(r.category==='أخرى'?'تصنيف غير محدد — عدّل واختر تخصص عشان يوصل للمزوّدين':'')+'">'+_catLbl(r)+'</span>':'')+((r.extra_categories||[]).map(function(c){return '<span class="pl" style="background:#f5f9ff;color:#1e3a8a;border:1px dashed #93c5fd" title="تخصص إضافي">+ '+esc(c)+'</span>';}).join(''))+(r.city?'<span class="pl" style="background:#eef3fb;color:#334766">'+esc(r.city)+'</span>':'')+'</div></div><button class="rq-x" onclick="_rqClose()" aria-label="إغلاق">×</button></div>'
      +'<div class="rq-ds" style="flex-direction:row;flex-wrap:wrap;gap:8px"><button class="btn-g" style="flex:1" onclick="_rqClose();openReqEdit('+r.id+')">تعديل</button><a class="btn-g" style="flex:1;text-align:center;text-decoration:none" href="/project/x-'+r.id+'?id='+r.id+'" target="_blank" rel="noopener">فتح الصفحة</a>'
        +(r.status==='open'?'<button class="btn-g" style="flex:1;color:#c2410c" onclick="_rqClose();pullbackFromRow('+r.id+')">طلب تعديل</button>':'')+'</div>'
      +_rqActs(r)
      +_roSection(r)
      +_saSection(r,x.saai,x.saai_suggest)
      +_cnSection(r)
      +(r.description?'<div class="rq-ds"><h4>الوصف</h4><div style="font-size:13.5px;line-height:1.8;white-space:pre-wrap;max-height:180px;overflow:auto;color:var(--text2)">'+esc(r.description)+'</div>'
        +(imgs.length?'<div style="display:flex;gap:8px;flex-wrap:wrap">'+imgs.slice(0,4).map(function(u){return '<a href="'+esc(_safeUrl(u))+'" target="_blank" rel="noopener"><img src="'+esc(_safeUrl(u))+'" alt="" style="width:86px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--border)"></a>';}).join('')+'</div>':'')+'</div>':'')
      +(atts.length?'<div class="rq-ds"><h4>📎 المرفقات والمخططات ('+atts.length+')</h4>'+atts.map(function(a){return '<a href="'+esc(_safeUrl(a.url))+'" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid var(--border);border-radius:10px;padding:9px 12px;font-size:13px;font-weight:800;color:var(--p);text-decoration:none">📄 <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(a.name||'ملف')+'</span><span style="font-size:11.5px;color:var(--muted)">فتح ↗</span></a>';}).join('')+'</div>':'')
      +'<div class="rq-ds"><h4>العميل</h4><div style="display:flex;align-items:center;gap:10px"><span class="ad-av">'+esc((r.client_name||'?').charAt(0))+'</span><div style="flex:1;min-width:0"><b>'+esc(r.client_name||'—')+'</b><div style="font-size:12px;color:var(--muted);direction:ltr;text-align:right">'+esc(r.client_phone||'')+(r.client_prev?' · '+r.client_prev+' مشاريع سابقة':'')+'</div></div>'+(ph?'<a class="act-btn ab-default" style="color:#15803d;border-color:#a7f3d0" href="https://wa.me/'+ph+'" target="_blank" rel="noopener">واتساب</a>':'')+'</div></div>'
      +'<div class="rq-ds"><h4>العروض ('+bids.length+')'+(prices.length?'<span style="color:#15803d">الأقل '+fmtNum(mn)+' · المتوسط '+fmtNum(av)+'</span>':'')+'</h4>'
        +(bids.length?bids.map(function(b){ var fl=(b.flags||'').split(',').filter(Boolean); var unit=b.price_unit&&b.price_unit!=='total'?(b.price_unit==='meter'?'/متر':'/وحدة'):'';
            return '<div class="rq-bid'+(fl.length?' bad':'')+'"><div style="flex:1;min-width:0"><b><a class="pro-name" href="/pro/'+(parseInt(b.provider_id)||0)+'" target="_blank" rel="noopener" title="صفحته العامة">'+esc(b.provider_name||'مزوّد')+' ↗</a></b>'+(b.status==='accepted'?' <span class="pl" style="background:#e3f5e9;color:#166534">مقبول</span>':'')+fl.map(function(x){return ' <span class="pl" style="background:#fef2f2;color:#b91c1c">'+esc(FL[x]||x)+'</span>';}).join('')+'<div style="font-size:11.5px;color:var(--muted)">'+(b.days?b.days+' يوم':'')+(b.rating>0?' · ★'+(Math.round(b.rating*10)/10):'')+' · '+_adAgo(b.created_at)+'</div></div><b style="white-space:nowrap">'+(b.price?fmtNum(b.price)+unit:'—')+'</b></div>'; }).join('')
          :'<div style="font-size:13px;color:var(--muted)">ما وصل أي عرض بعد</div>')
      +'</div>'
      +(tl.length?'<div class="rq-ds"><h4>السجل</h4>'+tl.map(function(t){return '<div class="rq-tl"><i></i><div><b>'+esc(t.event||'')+'</b>'+(t.description?' — '+esc(t.description):'')+'<div style="font-size:11.5px;color:var(--muted)">'+new Date(t.created_at).toLocaleString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})+'</div></div></div>';}).join('')+'</div>':'');
    d.innerHTML=h;
  }).catch(function(){ d.innerHTML='<div style="padding:30px">'+emptyState('تعذّر التحميل')+'</div>'; });
}
function _updAgentDue(){var el=document.getElementById('re-agent-due');if(!el)return;var pct=parseFloat((document.getElementById('re-agent-pct')||{}).value||0);var ap=window._reAcceptedPrice||0;if(!pct){el.textContent='';return;}if(pct>=3){el.textContent='⚠️ النسبة '+pct+'٪ تساوي أو تتجاوز رسوم المنصة (٣٪) — لن يتبقى لك ربح.';el.style.color='#dc2626';return;}if(ap>0){var due=Math.round(ap*pct/100);el.textContent='المستحق للمندوب: '+due.toLocaleString('en-US')+' ر.س ('+pct+'% من '+Math.round(ap).toLocaleString('en-US')+' ر.س — العرض المعتمد)';el.style.color='#059669';}else{el.textContent='يُحتسب المستحق ('+pct+'%) تلقائياً عند اعتماد عرض على المشروع.';el.style.color='#64748b';}}
function _cdPrefill(sel,close_at,created_at){ if(!sel)return; var o=sel.querySelector('option[value="keep"]'); if(o)o.remove(); sel.value=''; if(close_at&&created_at){ var d=Math.round((new Date(close_at)-new Date(created_at))/86400000); if([7,14,30,60,90,120,180].indexOf(d)>=0) sel.value=String(d); else { var op=document.createElement('option'); op.value='keep'; op.textContent='مدة حالية مخصصة (حتى '+new Date(close_at).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'long'})+')'; sel.insertBefore(op,sel.firstChild); sel.value='keep'; } } sel.setAttribute('data-init',sel.value); }
function _cdVal(id){ var s=document.getElementById(id); if(!s)return undefined; if(s.value==='keep'||s.value===s.getAttribute('data-init'))return undefined; return parseInt(s.value)||0; }
function openReqEdit(id){
  var r=_allReq.find(function(x){return x.id===id;});if(!r)return;
  _editReqId=id;
  document.getElementById('re-title').value=r.title||'';
  document.getElementById('re-desc').value=r.description||'';
  var _rc=document.getElementById('re-cat');
  if(_rc && window._CATS && window._CATS.length){ _rc.innerHTML='<option value="">اختر التصنيف</option>'+window._CATS.map(function(c){return '<option>'+esc(c)+'</option>';}).join(''); }
  document.getElementById('re-cat').value=r.category||'';
  document.getElementById('re-cat-other').value=r.category_other||'';
  var _exo='<option value="">— بدون —</option>'+((window._CATS&&window._CATS.length)?window._CATS:[].map.call(document.getElementById('re-cat').options,function(o){return o.value;})).filter(function(c){return c&&c!=='أخرى';}).map(function(c){return '<option>'+esc(c)+'</option>';}).join('');
  var _exs=r.extra_categories||[]; ['re-ex1','re-ex2'].forEach(function(id,i){var el=document.getElementById(id); el.innerHTML=_exo; el.value=_exs[i]||'';});
  var _rcs=document.getElementById('re-cat'); _rcs.onchange=function(){ document.getElementById('re-cat-other-w').style.display=_rcs.value==='أخرى'?'':'none'; }; _rcs.onchange();
  _cdPrefill(document.getElementById('re-closedur'),r.close_at,r.created_at);
  var citySel=document.getElementById('re-city');
  if(citySel&&citySel.options.length<=1){
    var regions=_regionsList();
    regions.forEach(function(reg){var og=document.createElement('optgroup');og.label=reg.n;reg.c.forEach(function(ct){var o=document.createElement('option');o.textContent=ct;og.appendChild(o);});citySel.appendChild(og);});
  }
  if(r.city&&citySel&&![].some.call(citySel.options,function(o){return (o.value||o.text)===r.city;})){var _xo=document.createElement('option');_xo.textContent=r.city;citySel.insertBefore(_xo,citySel.options[1]||null);}
  document.getElementById('re-city').value=r.city||'';
  document.getElementById('re-budget').value=r.budget_max||'';
  document.getElementById('re-deadline').value=r.deadline?String(r.deadline).slice(0,10):'';
  document.getElementById('re-district').value=r.district||'';
  var _im=r.images; if(typeof _im==='string'){try{_im=JSON.parse(_im);}catch(e){_im=[];}}
  _reImgs=(Array.isArray(_im)?_im:[]).filter(Boolean).map(function(u){return {url:u};});
  var _at=r.attachments; if(typeof _at==='string'){try{_at=JSON.parse(_at);}catch(e){_at=[];}}
  _reAtts=(Array.isArray(_at)?_at:[]).filter(function(a){return a&&a.url;}).map(function(a){return {name:a.name||'ملف',url:a.url};});
  _reMediaRender();
  document.getElementById('re-notes').value=r.admin_notes||'';
  document.getElementById('re-agent-name').value=r.agent_name||'';
  document.getElementById('re-agent-phone').value=r.agent_phone||'';
  document.getElementById('re-agent-pct').value=(r.agent_pct!=null&&r.agent_pct!==''?r.agent_pct:'');
  window._reAcceptedPrice=parseFloat(r.accepted_price)||0;
  window._reStatus=r.status||'';
  (function(){
    var pb=document.getElementById('re-pullbtn'),blk=document.getElementById('re-pullback');
    if(blk)blk.style.display='none';
    var nt=document.getElementById('re-pullnotes');if(nt)nt.value='';
    if(pb)pb.style.display=(String(r.status)==='open')?'inline-flex':'none';
  })();
  _updAgentDue();
  document.getElementById('reqModal').classList.add('show');
  // زر التثبيت في المعرض — للمشاريع المكتملة فقط
  var _ft=document.getElementById('re-feature');
  if(_ft){
    if(String(r.status)==='completed'){
      _ft.style.display='inline-flex'; _ft.dataset.on=r.featured?'1':'0';
      _ft.textContent=r.featured?'★ مثبّت في المعرض':'☆ تثبيت في المعرض';
      _ft.style.background=r.featured?'#fef9c3':'var(--bg)'; _ft.style.color=r.featured?'#a16207':'var(--muted)'; _ft.style.border='1px solid '+(r.featured?'#fde047':'var(--border)');
    } else { _ft.style.display='none'; }
  }
}
function toggleFeatured(){
  if(!_editReqId)return;
  var ft=document.getElementById('re-feature'); var on=(ft.dataset.on!=='1');
  ft.disabled=true;
  fetch(API+'/api/admin/requests/'+_editReqId+'/featured',Object.assign({method:'POST',body:JSON.stringify({featured:on})},hdr()))
    .then(function(r){return r.json();})
    .then(function(d){
      if(d&&d.ok){
        ft.dataset.on=d.featured?'1':'0';
        ft.textContent=d.featured?'★ مثبّت في المعرض':'☆ تثبيت في المعرض';
        ft.style.background=d.featured?'#fef9c3':'var(--bg)'; ft.style.color=d.featured?'#a16207':'var(--muted)'; ft.style.border='1px solid '+(d.featured?'#fde047':'var(--border)');
        toast(d.featured?'ثُبّت في المعرض':'أُزيل من المعرض','success');
        var rr=_allReq.find(function(x){return x.id===_editReqId;}); if(rr)rr.featured=d.featured;
      } else toast((d&&d.message)||'تعذّر التحديث','error');
    })
    .catch(function(){toast('تعذّر الاتصال','error');})
    .finally(function(){ft.disabled=false;});
}
function togglePullback(){
  var b=document.getElementById('re-pullback');if(!b)return;
  var show=(b.style.display==='none'||!b.style.display);
  b.style.display=show?'block':'none';
  if(show){
    var w=document.getElementById('re-pullwarn');
    var r=_allReq.find(function(x){return x.id===_editReqId;});
    var bc=r?(parseInt(r.bid_count)||0):0;
    if(w){ if(bc>0){w.style.display='block';w.textContent='⚠️ هذا المشروع عليه '+bc+' '+(bc===1?'عرض':'عروض')+' — سيُخفى عن المزوّدين مؤقتاً حتى يُصلحه العميل ويُعتمد ثانية (العروض تبقى محفوظة).';}else{w.style.display='none';w.textContent='';} }
    var ch=document.getElementById('re-pullchips');if(ch)ch.innerHTML=reasonChips('re-pullnotes');
    var nt=document.getElementById('re-pullnotes');if(nt)nt.focus();
  }
}
function submitAdvise(){
  var ta=document.getElementById('re-pullnotes');
  var note=((ta&&ta.value)||'').trim();
  if(!note){toast('اكتب الملاحظة للعميل أولاً','error');if(ta)ta.focus();return;}
  fetch(API+'/api/admin/requests/'+_editReqId+'/advise',Object.assign({method:'POST',body:JSON.stringify({note:note})},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){
      if(!res.ok){toast((res.d&&res.d.message)||'تعذّر الإرسال','error');return;}
      toast('أُرسلت الملاحظة للعميل — المشروع باقٍ منشوراً ✓','success');
      closeModal('reqModal');
      if(res.d&&res.d.wa_link)showWaFollowup(res.d.wa_link);
    })
    .catch(function(){toast('تعذّر الاتصال','error');});
}
function submitPullback(){
  var ta=document.getElementById('re-pullnotes');
  var reason=((ta&&ta.value)||'').trim();
  if(!reason){toast('اكتب ملاحظات التعديل للعميل أولاً','error');if(ta)ta.focus();return;}
  fetch(API+'/api/admin/requests/'+_editReqId+'/review',Object.assign({method:'PUT',body:JSON.stringify({action:'needs_edit',reason:reason})},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){
      if(!res.ok){toast((res.d&&res.d.message)||'تعذّر التنفيذ','error');return;}
      toast('تم سحب المشروع وإرسال طلب التعديل للعميل','success');
      closeModal('reqModal');loadRequests();
      if(res.d&&res.d.wa_link)showWaFollowup(res.d.wa_link);
      if(typeof loadProjReview==='function')loadProjReview();
    })
    .catch(function(){toast('تعذّر الاتصال','error');});
}
function closeReqAdmin(){ if(!_editReqId)return; var id=_editReqId; closeModal('reqModal'); _rqCloseProj(id); }
// ═══ إغلاق مشروع من الإدارة — مع السبب (يظهر في «أسباب الإغلاق») وخيار إشعار العميل ═══
var _CLOSE_ADM_REASONS=['اتفق مع مزوّد من برا المنصة','طلب العميل إغلاقه','مشروع مكرر','مشروع تجريبي أو غير جاد','بيانات غير كافية والعميل ما تجاوب','تأجّل أو أُلغي'];
function _rqCloseProj(id){
  var r=(_allReq||[]).find(function(x){return x.id===id;})||{};
  var old=document.getElementById('clsAdm'); if(old)old.remove();
  var ov=document.createElement('div'); ov.id='clsAdm';
  ov.style.cssText='position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.5);display:flex;align-items:center;justify-content:center;padding:16px';
  ov.onclick=function(e){ if(e.target===ov)ov.remove(); };
  var chip='border:1.5px solid var(--border);background:var(--white);color:var(--text2);border-radius:999px;padding:8px 13px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer';
  ov.innerHTML='<div style="width:480px;max-width:100%;background:var(--white);color:var(--text);border-radius:18px;box-shadow:0 24px 60px rgba(2,8,23,.3);overflow:hidden">'
    +'<div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px"><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:800;color:var(--muted)">#'+id+'</div><div style="font-size:16px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">إغلاق: '+esc(r.title||'مشروع')+'</div></div><button onclick="document.getElementById(\'clsAdm\').remove()" aria-label="إغلاق" style="border:0;background:var(--bg);border-radius:10px;width:34px;height:34px;cursor:pointer;color:var(--text)">✕</button></div>'
    +'<div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">'
    +'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:11px;padding:9px 12px;font-size:12.5px;font-weight:800;color:#9a3412;line-height:1.7">يتوقف استقبال العروض ويختفي من المشاريع المفتوحة. العروض الموجودة تبقى، وتقدر تعيد فتحه لاحقاً من نفس اللوحة.'+(r.bid_count?' <b>عليه '+r.bid_count+' عرض.</b>':'')+'</div>'
    +'<div><div style="font-size:13px;font-weight:900;margin-bottom:7px">السبب</div><div id="cls-chips" style="display:flex;gap:6px;flex-wrap:wrap">'+_CLOSE_ADM_REASONS.map(function(t){return '<button type="button" data-r="'+esc(t)+'" onclick="document.getElementById(\'cls-note\').value=this.getAttribute(\'data-r\');[].forEach.call(document.querySelectorAll(\'#cls-chips button\'),function(x){x.style.borderColor=\'var(--border)\';x.style.background=\'var(--white)\';x.style.color=\'var(--text2)\';});this.style.borderColor=\'#b45309\';this.style.background=\'#fff7ed\';this.style.color=\'#9a3412\'" style="'+chip+'">'+esc(t)+'</button>';}).join('')+'</div></div>'
    +'<textarea id="cls-note" maxlength="300" placeholder="أو اكتب السبب…" style="width:100%;box-sizing:border-box;min-height:64px;border:1.5px solid var(--border);border-radius:11px;padding:9px 11px;font-family:inherit;font-size:13px;background:var(--white);color:var(--text);resize:vertical"></textarea>'
    +'<label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:800;cursor:pointer"><input type="checkbox" id="cls-notify" style="width:17px;height:17px"> أرسل إشعار للعميل بالإغلاق والسبب</label>'
    +'<div style="display:flex;gap:8px"><button id="cls-go" onclick="_rqCloseGo('+id+')" style="flex:1;border:0;background:#b45309;color:#fff;border-radius:11px;padding:12px;font-family:inherit;font-size:14.5px;font-weight:900;cursor:pointer">🔒 إغلاق المشروع</button><button onclick="document.getElementById(\'clsAdm\').remove()" style="border:1.5px solid var(--border);background:var(--white);color:var(--text2);border-radius:11px;padding:12px 18px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer">إلغاء</button></div>'
    +'</div></div>';
  document.body.appendChild(ov);
}
function _rqCloseGo(id){
  var note=(document.getElementById('cls-note')||{}).value||'', ntf=!!(document.getElementById('cls-notify')||{}).checked;
  if(!note.trim()){ toast('اختر السبب أو اكتبه','error'); return; }
  var btn=document.getElementById('cls-go'); if(btn){btn.disabled=true;btn.textContent='جاري الإغلاق…';}
  fetch(API+'/api/admin/requests/'+id+'/close',Object.assign({method:'POST',body:JSON.stringify({reason:note.trim(),notify_client:ntf})},hdr())).then(function(r){return r.json();}).then(function(d){
    if(d&&d.ok){ toast('تم إغلاق المشروع'+(ntf?' وإشعار العميل':''),'success'); var o=document.getElementById('clsAdm'); if(o)o.remove(); try{_rqClose();}catch(e){} loadRequests(); setTimeout(function(){try{_rqOpen(id);}catch(e){}},700); }
    else { toast((d&&d.message)||'تعذّر الإغلاق','error'); if(btn){btn.disabled=false;btn.textContent='🔒 إغلاق المشروع';} }
  }).catch(function(){ toast('تعذّر الإغلاق','error'); if(btn){btn.disabled=false;btn.textContent='🔒 إغلاق المشروع';} });
}
var _reImgs=[],_reAtts=[];
function _reMediaRender(){
  var bi=document.getElementById('re-imgs'); if(!bi)return;
  bi.innerHTML=_reImgs.map(function(m,i){var src=m.url||m.data;return '<div class="re-th"><img src="'+esc(_safeUrl(src))+'" onclick="window.open(this.src)"><button type="button" class="x" title="حذف" onclick="_reImgs.splice('+i+',1);_reMediaRender()">✕</button>'+(m.data?'<span class="nw">جديدة</span>':'')+'</div>';}).join('');
  document.getElementById('re-imgs-n').textContent='('+_reImgs.length+'/10)';
  document.getElementById('re-atts').innerHTML=_reAtts.map(function(a,i){return '<div class="re-at">📄 '+(a.url?'<a href="'+esc(_safeUrl(a.url))+'" target="_blank" rel="noopener">'+esc(a.name)+'</a>':'<span style="flex:1">'+esc(a.name)+'</span><span style="font-size:10.5px;background:'+(a.up?'#d97706':'#16a34a')+';color:#fff;border-radius:6px;padding:1px 6px">'+(a.up?'⏳ جاري الرفع':'جديد')+'</span>')+'<button type="button" class="x" title="حذف" onclick="_reAtts.splice('+i+',1);_reMediaRender()">✕</button></div>';}).join('');
  document.getElementById('re-atts-n').textContent='('+_reAtts.length+'/12)';
}
function _reShrink(file){return new Promise(function(res){var fr=new FileReader();fr.onload=function(){var img=new Image();img.onload=function(){var m=1600,w=img.width,h=img.height;if(w>m||h>m){var k=m/Math.max(w,h);w=Math.round(w*k);h=Math.round(h*k);}var c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);res(c.toDataURL('image/jpeg',0.82));};img.onerror=function(){res(fr.result);};img.src=fr.result;};fr.onerror=function(){res(null);};fr.readAsDataURL(file);});}
async function _reImgAdd(inp){
  var fs=[].slice.call(inp.files||[]); inp.value='';
  for(var i=0;i<fs.length;i++){ if(_reImgs.length>=10){toast('الحد الأقصى 10 صور','error');break;} var d=await _reShrink(fs[i]); if(d)_reImgs.push({data:d}); }
  _reMediaRender();
}
function _reAttAdd(inp){
  var fs=[].slice.call(inp.files||[]); inp.value='';
  fs.forEach(function(f){
    if(_reAtts.length>=12){toast('الحد الأقصى 12 ملف','error');return;}
    if(f.size>30*1024*1024){toast('«'+f.name+'» أكبر من 30MB','error');return;}
    var slot={name:f.name,up:true}; _reAtts.push(slot);
    _mqUpAtt(f,slot,function(ok,msg){ if(!ok){var i=_reAtts.indexOf(slot);if(i>-1)_reAtts.splice(i,1);toast(msg||('تعذّر رفع «'+f.name+'»'),'error');} _reMediaRender(); });
  });
  _reMediaRender();
}
function saveReqEdit(){
  if(!_editReqId)return;
  var btn=document.getElementById('re-save');btn.disabled=true;btn.textContent='جاري الحفظ...';
  var body={title:document.getElementById('re-title').value.trim(),description:document.getElementById('re-desc').value.trim(),category:document.getElementById('re-cat').value.trim()||null,category_other:(document.getElementById('re-cat').value==='أخرى'?document.getElementById('re-cat-other').value.trim():'')||null,extra_categories:[document.getElementById('re-ex1').value,document.getElementById('re-ex2').value].filter(Boolean),city:document.getElementById('re-city').value.trim()||null,budget_max:parseInt(document.getElementById('re-budget').value)||null,admin_notes:document.getElementById('re-notes').value.trim()||null,agent_name:document.getElementById('re-agent-name').value.trim()||null,agent_phone:document.getElementById('re-agent-phone').value.trim()||null,agent_pct:document.getElementById('re-agent-pct').value.trim()||null,close_days:_cdVal('re-closedur'),deadline:document.getElementById('re-deadline').value||null,district:document.getElementById('re-district').value.trim()||null,images:_reImgs.map(function(m){return m.url||m.data;}),attachments:_reAtts.map(function(a){return a.url?{name:a.name,url:a.url}:{name:a.name,data:a.data};})};
  if(_reAtts.some(function(a){return a.up||(!a.url&&!a.data);})){toast('انتظر حتى يكتمل رفع الملفات','error');btn.disabled=false;btn.textContent='حفظ التعديلات';return;}
  if(body.images.some(function(x){return String(x).indexOf('data:')===0;})||body.attachments.some(function(a){return a.data;}))btn.textContent='جاري رفع الملفات... 0%';
  var _hasUp=body.images.some(function(x){return String(x).indexOf('data:')===0;})||body.attachments.some(function(a){return a.data;});
  var _done=function(){btn.disabled=false;btn.textContent='حفظ التعديلات';};
  var xhr=new XMLHttpRequest(); xhr.open('PUT',API+'/api/admin/requests/'+_editReqId);
  var _hh=(hdr().headers)||{}; Object.keys(_hh).forEach(function(k){try{xhr.setRequestHeader(k,_hh[k]);}catch(e){}});
  xhr.upload.onprogress=function(ev){ if(!_hasUp||!ev.lengthComputable)return; var pct=Math.round(ev.loaded/ev.total*100); btn.textContent=pct<100?('جاري رفع الملفات... '+pct+'%'):'تم الرفع — جاري الحفظ...'; };
  xhr.onload=function(){ _done(); var d={}; try{d=JSON.parse(xhr.responseText);}catch(e){}
    if(xhr.status<200||xhr.status>=300){toast((d&&d.message)||'تعذر الحفظ','error');return;}
    if(d&&d._dropped)toast('تم الحفظ — لكن '+d._dropped+' ملف ما انرفع (نوع غير مسموح أو مشكلة رفع)','error');else toast('تم حفظ التعديلات','success');
    var _id=_editReqId; closeModal('reqModal');loadRequests(); setTimeout(function(){try{_rqOpen(_id);}catch(e){}},700); };
  xhr.onerror=function(){_done();toast('تعذّر الحفظ — تحقّق من اتصالك','error');};
  xhr.ontimeout=function(){_done();toast('انتهت المهلة — الملف كبير أو الاتصال بطيء','error');};
  xhr.timeout=180000; xhr.send(JSON.stringify(body));
}
async function deleteRequest(id){
  if(!await askConfirm({title:'حذف المشروع',message:'سيُحذف المشروع نهائياً. لا يمكن التراجع.',confirmText:'نعم، احذف'}))return;
  fetch(API+'/api/admin/requests/'+id,Object.assign({method:'DELETE'},hdr())).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(){toast('تم الحذف','success');loadRequests();}).catch(function(){toast('تعذر الحذف','error');});
}

function loadReviews(){
  fetch(API+'/api/admin/reviews',hdr()).then(function(r){return r.json();}).then(function(revs){
    if(!Array.isArray(revs)||!revs.length){document.getElementById('reviews-table').innerHTML=emptyState('لا يوجد تقييمات');return;}
    document.getElementById('reviews-table').innerHTML='<table><thead><tr><th>المُقيِّم</th><th>المُقيَّم</th><th>التقييم</th><th>التعليق</th><th></th></tr></thead><tbody>'+revs.map(function(rv){
      var stars='';for(var i=1;i<=5;i++)stars+='<svg width="13" height="13" fill="'+(i<=rv.rating?'#F0A500':'#D1D5DB')+'" viewBox="0 0 24 24" style="display:inline-block"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></svg>';
      return '<tr><td style="font-size:12.5px">'+esc(rv.reviewer_name||'—')+'</td><td style="font-size:12.5px;font-weight:700">'+esc(rv.reviewed_name||'—')+'</td><td style="white-space:nowrap">'+stars+'</td><td style="font-size:12.5px;color:var(--muted);max-width:220px">'+esc(rv.comment||'—')+'</td><td><button class="act-btn ab-danger" onclick="deleteReview('+rv.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>حذف</button></td></tr>';
    }).join('')+'</tbody></table>';
  }).catch(function(){document.getElementById('reviews-table').innerHTML=emptyState('تعذر التحميل');});
}
async function deleteReview(id){
  if(!await askConfirm({title:'حذف التقييم',message:'سيُحذف هذا التقييم نهائياً.',confirmText:'نعم، احذف'}))return;
  fetch(API+'/api/admin/reviews/'+id,Object.assign({method:'DELETE'},hdr())).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(){toast('تم الحذف','success');loadReviews();}).catch(function(){toast('تعذر الحذف','error');});
}

function loadReports(){
  _adSeen('reports');
  fetch(API+'/api/admin/reports',hdr()).then(function(r){return r.json();}).then(function(reps){
    if(!Array.isArray(reps)||!reps.length){document.getElementById('reports-table').innerHTML=emptyState('لا يوجد بلاغات');return;}
    document.getElementById('reports-table').innerHTML='<table><thead><tr><th>النوع</th><th>المُبلِّغ</th><th>السبب</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>'+reps.map(function(rp){
      var resolved=rp.status==='resolved';
      return '<tr><td style="font-size:12.5px">'+esc(rp.type||rp.target_type||'—')+'</td><td style="font-size:12.5px">'+esc(rp.reporter_name||'—')+'</td><td style="font-size:12.5px;color:var(--muted);max-width:240px">'+esc(rp.reason||rp.description||'—')+'</td><td><span class="badge '+(resolved?'b-completed':'b-review')+'">'+(resolved?'محلول':'جديد')+'</span></td><td style="font-size:11.5px;color:var(--muted)">'+fmtDate(rp.created_at)+'</td></tr>';
    }).join('')+'</tbody></table>';
  }).catch(function(){document.getElementById('reports-table').innerHTML=emptyState('تعذر التحميل');});
}

// ═══ الأسئلة والتوضيحات (الإدارة) ═══
var _allQ=[],_qFilter='all';
function _qAnswered(q){return !!(q.answer&&String(q.answer).trim());}
var _qSel={};
function loadQuestions(){
  fetch(API+'/api/admin/questions',hdr()).then(function(r){return r.json();}).then(function(qs){
    if(!Array.isArray(qs)){document.getElementById('questions-table').innerHTML=emptyState('تعذر التحميل');return;}
    _allQ=qs;_qSel={};renderQuestions();updateQBadge();_adSeen('questions');
  }).catch(function(){document.getElementById('questions-table').innerHTML=emptyState('تعذر التحميل');});
}
function filterQ(f,el){_qFilter=f;document.querySelectorAll('#page-questions .ftab').forEach(function(t){t.classList.remove('on');});if(el)el.classList.add('on');renderQuestions();}
function renderQuestions(){
  var term=((document.getElementById('q-search')||{}).value||'').toLowerCase();
  var list=_allQ.filter(function(q){
    if(_qFilter==='archived')return !!q.archived; if(q.archived)return false;
    if(_qFilter==='pending'&&(_qAnswered(q)||q.request_active===false))return false;
    if(_qFilter==='answered'&&!_qAnswered(q))return false;
    if(term){var hay=((q.body||'')+(q.answer||'')+(q.asker_name||'')+(q.request_title||'')).toLowerCase();if(hay.indexOf(term)<0)return false;}
    return true;
  });
  window._qList=list; var arch=_qFilter==='archived', selN=list.filter(function(q){return _qSel[q.id];}).length, totV=_allQ.filter(function(q){return !q.archived;}).length;
  var bar=document.getElementById('q-bar'); if(bar) bar.innerHTML=list.length?'<label class="sel-all"><input type="checkbox" '+(selN&&selN===list.length?'checked':'')+' onchange="_qSelAll(this.checked)"> تحديد الكل ('+list.length+')</label>'
    +(selN?'<button class="act-btn ab-default" onclick="_qArchive(false)">'+(arch?'↩︎ إرجاع المحدد':'🗑️ إخفاء المحدد')+' ('+selN+')</button>':'')
    +(!arch&&totV?'<button class="act-btn ab-default" style="color:#dc2626;border-color:#fecaca;margin-inline-start:auto" onclick="_qArchive(true)">🗑️ إخفاء الكل وابدأ من جديد</button>':'')
    +'<span class="sel-note">'+(arch?'الأسئلة المخفية — ترجعها متى ما تبي':'الإخفاء يشيلها من قائمتك بس — السؤال يبقى في المشروع عند العميل والمزوّد')+'</span>':'';
  if(!list.length){document.getElementById('questions-table').innerHTML=emptyState(arch?'ما فيه أسئلة مخفية':'لا توجد أسئلة');return;}
  document.getElementById('questions-table').innerHTML='<table><thead><tr><th style="width:34px"></th><th>السائل</th><th>المشروع</th><th>السؤال</th><th>الرد</th><th>الحالة</th><th></th></tr></thead><tbody>'+
    list.map(function(q){
      var ans=_qAnswered(q);
      return '<tr'+(_qSel[q.id]?' class="sel"':'')+'>'+
        '<td><input type="checkbox" aria-label="تحديد" '+(_qSel[q.id]?'checked':'')+' onchange="_qSelOne('+q.id+',this.checked)"></td>'+
        '<td><div class="u-name">'+esc(q.asker_name||'—')+'</div><div class="u-email">'+(q.asker_role==='provider'?'مزود':q.asker_role==='client'?'عميل':'')+'</div></td>'+
        '<td style="font-size:12.5px;max-width:160px">'+esc(q.request_title||'—')+'</td>'+
        '<td style="font-size:12.5px;color:var(--text2);max-width:240px">'+esc(q.body||'')+'</td>'+
        '<td style="font-size:12.5px;color:var(--muted);max-width:240px">'+(ans?esc(q.answer):'—')+'</td>'+
        '<td><span class="badge '+(ans?'b-done':(q.request_active===false?'':'b-review'))+'"'+(!ans&&q.request_active===false?' style="background:#f1f5f9;color:#64748b"':'')+'>'+(ans?'مُجاب':(q.request_active===false?'المشروع مقفل':'بانتظار رد'))+'</span></td>'+
        '<td style="white-space:nowrap">'+(!ans&&q.request_active!==false&&_waNorm(q.owner_phone)?'<a class="act-btn ab-default" style="color:#15803d;border-color:#bbf7d0;text-decoration:none" target="_blank" rel="noopener" href="'+_qWa(q)+'">واتساب للعميل</a> ':'')+'<button class="act-btn ab-danger" onclick="deleteQuestion('+q.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>حذف</button></td>'+
        '</tr>';
    }).join('')+'</tbody></table>';
}
function _qWa(q){ var m='السلام عليكم '+(q.owner_name||'')+'، معك منصة مناقصة 👋\nوصلك سؤال من مزوّد على مشروعك «'+(q.request_title||'')+'»:\n«'+String(q.body||'').slice(0,200)+'»\nردّك ياخذ دقيقة ويجيب لك عروض أدق — تقدر ترد من لوحتك في المنصة.'; return 'https://wa.me/'+_waNorm(q.owner_phone)+'?text='+encodeURIComponent(m); }
function _qSelAll(on){ _qSel={}; if(on)(window._qList||[]).forEach(function(q){_qSel[q.id]=1;}); renderQuestions(); }
function _qSelOne(id,on){ if(on)_qSel[id]=1; else delete _qSel[id]; renderQuestions(); }
async function _qArchive(all){
  var arch=_qFilter==='archived', ids=(window._qList||[]).filter(function(q){return _qSel[q.id];}).map(function(q){return q.id;});
  if(all){ if(!await askConfirm({title:'إخفاء كل الأسئلة',message:'تنشال كل الأسئلة من قائمتك وتبدأ من جديد. الأسئلة نفسها تبقى في المشاريع، وتقدر ترجعها من «المخفية».',confirmText:'إخفاء الكل',safe:true}))return; }
  else if(!ids.length)return;
  fetch(API+'/api/admin/questions/archive',Object.assign({method:'POST',body:JSON.stringify(all?{all:true}:{ids:ids,undo:arch})},hdr())).then(function(r){return r.json();}).then(function(d){ if(!d||!d.ok){toast((d&&d.message)||'تعذّر','error');return;} toast((arch?'رجع ':'انشال ')+d.n+' سؤال ✓','success'); loadQuestions(); }).catch(function(){toast('تعذّر الاتصال','error');});
}
async function deleteQuestion(id){
  if(!await askConfirm({title:'حذف السؤال',message:'سيُحذف هذا السؤال (ورده إن وجد) نهائياً.',confirmText:'نعم، احذف'}))return;
  fetch(API+'/api/admin/questions/'+id,Object.assign({method:'DELETE'},hdr())).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(){toast('تم حذف السؤال','success');loadQuestions();}).catch(function(){toast('تعذر الحذف','error');});
}
function updateQBadge(){
  var pend=0;
  _loadFresh();
}

function _parseHashParams(){
  var h=(location.hash||'').replace('#','');
  var qi=h.indexOf('?'); if(qi<0)return {};
  var out={}; h.slice(qi+1).split('&').forEach(function(kv){var p=kv.split('=');if(p[0])out[decodeURIComponent(p[0])]=decodeURIComponent(p[1]||'');});
  return out;
}
function restoreAdminHash(){
  var raw=(location.hash||'').replace('#','');
  var h=raw.split('?')[0];
  // تحقّق بوجود الصفحة فعلياً في DOM (يشمل كل الصفحات تلقائياً)
  var pg=(h && document.getElementById('page-'+h)) ? h : 'dashboard';
  // زر القائمة المطابق (بحث بالـonclick بدل فهرس ثابت هشّ)
  var btn=null;
  document.querySelectorAll('.ni').forEach(function(n){
    var oc=n.getAttribute('onclick')||'';
    if(oc.indexOf("showPage('"+pg+"'")>=0) btn=n;
  });
  window._skipHash=true;
  showPage(pg, btn);
  window._skipHash=false;
}
loadMe();
restoreAdminHash();
window.addEventListener('hashchange',restoreAdminHash);

// ═══ إدارة العروض (الإدارة) ═══
function fmtN(n){if(n==null||n==='')return'';return Number(n).toLocaleString('en-US');}
var _allBids=[],_bidStatusFilter='all';
function loadBids(){
  fetch(API+'/api/admin/bids',hdr()).then(function(r){return r.json();}).then(function(bids){
    if(!Array.isArray(bids)){document.getElementById('bids-table').innerHTML=emptyState('تعذر التحميل');return;}
    if(window._bidsSeenPrev==null){var _pv=0;try{_pv=parseInt(localStorage.getItem('mnq_bids_seen')||'0')||0;}catch(e){}window._bidsSeenPrev=_pv;try{localStorage.setItem('mnq_bids_seen',String(Date.now()));}catch(e){}}
    _allBids=bids;fillBidFilters();applyBidFiltersFromHash();renderBids();
  }).catch(function(){document.getElementById('bids-table').innerHTML=emptyState('تعذر التحميل');});
}
function filterBidStatus(s,el){_bidStatusFilter=s;document.querySelectorAll('#page-bids .ftab').forEach(function(t){t.classList.remove('on');});if(el)el.classList.add('on');renderBids();}
function _bidAgo(d){if(!d)return '';var s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return 'الآن';var m=Math.floor(s/60);if(m<60)return 'منذ '+m+' د';var h=Math.floor(m/60);if(h<24)return 'منذ '+h+' س';var dy=Math.floor(h/24);if(dy<30)return 'منذ '+dy+' يوم';return fmtDate(d);}
function getFilteredBids(){
  var term=((document.getElementById('bid-search')||{}).value||'').toLowerCase();
  var ci=(document.getElementById('bf-city')||{}).value||'';
  return (_allBids||[]).filter(function(b){
    if(_bidStatusFilter!=='all'&&b.status!==_bidStatusFilter)return false;
    if(ci&&b.provider_city!==ci)return false;
    if(term){var hay=((b.provider_name||'')+(b.provider_business||'')+(b.request_title||'')+(b.client_name||'')+(b.note||'')).toLowerCase();if(hay.indexOf(term)<0)return false;}
    var _tm=(document.getElementById('bf-time')||{}).value||'';
    if(_tm){var _ts=b.created_at?new Date(b.created_at).getTime():0;
      if(_tm==='seen'){if(!(window._bidsSeenPrev&&_ts>window._bidsSeenPrev))return false;}
      else if(Date.now()-_ts>parseInt(_tm)*864e5)return false;}
    var _fl=(document.getElementById('bf-flag')||{}).value||'';
    if(_fl==='watch'){if(!b.provider_watch)return false;}
    else if(_fl==='watchnew'){if(!(b.provider_watch&&window._bidsSeenPrev&&new Date(b.created_at).getTime()>window._bidsSeenPrev))return false;}
    else if(_fl==='warned'){if(!b.warning)return false;}
    else if(_fl==='warnopen'){if(!(b.warning&&!b.warning.edited_at&&b.status!=='accepted'))return false;}
    else if(_fl){var _ff=_bidFlags(b), _sv=_bidSev(_ff);
      if(_fl==='sus'){if(_sv!=='high')return false;}
      else if(_fl==='any'){if(!_ff.length)return false;}
      else if(_fl==='clean'){if(_ff.length)return false;}
      else if(!_ff.some(function(x){return x.k===_fl&&(x.k!=='copy'&&x.k!=='attdup'||x.sev==='high'||_fl===x.k);}))return false;}
    var _at=(document.getElementById('bf-att')||{}).value||'';
    if(_at==='yes'&&!b.attachment_url)return false;
    if(_at==='no'&&b.attachment_url)return false;
    var _vs=(document.getElementById('bf-vis')||{}).value||'';
    if(_vs==='public'&&b.price_visibility!=='public')return false;
    if(_vs==='private'&&b.price_visibility==='public')return false;
    return true;
  });
}
function fillBidFilters(){
  var cities={};
  (_allBids||[]).forEach(function(b){if(b.provider_city)cities[b.provider_city]=1;});
  var cSel=document.getElementById('bf-city');
  if(cSel&&cSel.options.length<=1){Object.keys(cities).sort().forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;cSel.appendChild(o);});}
}
function resetBidFilters(){['bf-time','bf-flag','bf-att','bf-vis'].forEach(function(i){var x=document.getElementById(i);if(x)x.value='';});var _so=document.getElementById('bf-sort');if(_so)_so.value='new';var e=document.getElementById('bf-city');if(e)e.value='';var sr=document.getElementById('bid-search');if(sr)sr.value='';syncBidFiltersToHash();renderBids();}
function applyBidFiltersFromHash(){
  var ps=_parseHashParams();
  var e=document.getElementById('bf-city');if(e&&ps.city!=null)e.value=ps.city;
  var sr=document.getElementById('bid-search');if(sr&&ps.q!=null)sr.value=ps.q;
  if(ps.status){_bidStatusFilter=ps.status;document.querySelectorAll('#page-bids .ftab').forEach(function(t){t.classList.remove('on');var oc=t.getAttribute('onclick')||'';if(oc.indexOf("'"+ps.status+"'")>=0)t.classList.add('on');});}
}
function syncBidFiltersToHash(){
  if(window._skipHash)return;
  var v=function(id){return (document.getElementById(id)||{}).value||'';};
  var parts=[];
  if(_bidStatusFilter&&_bidStatusFilter!=='all')parts.push('status='+encodeURIComponent(_bidStatusFilter));
  if(v('bf-city'))parts.push('city='+encodeURIComponent(v('bf-city')));
  var q=(v('bid-search')||'').trim();if(q)parts.push('q='+encodeURIComponent(q));
  var hash='#bids'+(parts.length?'?'+parts.join('&'):'');
  if(location.hash!==hash){window._skipHash=true;history.replaceState(null,'',hash);window._skipHash=false;}
}
function adminBidReject(id){
  var reason=prompt('سبب الرفض (اختياري، يصل للمزوّد):');
  if(reason===null)return;
  fetch(API+'/api/admin/bids/'+id+'/reject',Object.assign({method:'PUT',body:JSON.stringify({reason:(reason||'').trim()})},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){if(!res.ok){toast((res.d&&res.d.message)||'تعذّر الرفض','error');return;}toast('تم رفض العرض وإشعار المزوّد','success');if(typeof loadBids==='function')loadBids();})
    .catch(function(){toast('تعذّر الاتصال','error');});
}
function adminBidEdit(id){
  var reason=prompt('ملاحظة التعديل للمزوّد (مثال: لا تكتب السعر في نص العرض عند اختيار «السعر خاص»):');
  if(reason===null)return;
  fetch(API+'/api/admin/bids/'+id+'/request-edit',Object.assign({method:'PUT',body:JSON.stringify({reason:(reason||'').trim()})},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){if(!res.ok){toast((res.d&&res.d.message)||'تعذّر الإرسال','error');return;}toast('أُرسل طلب التعديل للمزوّد','success');try{loadBids();}catch(e){}})
    .catch(function(){toast('تعذّر الاتصال','error');});
}
var WARN_PRESETS=[
  'السعر اللي كتبته (مثل 1 ريال) مو سعر حقيقي — اكتب سعرك الفعلي للمشروع، العميل يبي يقارن أسعار واضحة. تكرارها يعرّض حسابك للإيقاف.',
  'المرفق غير واضح أو لا علاقة له بالمشروع — أعد رفع ملف مناسب أو احذفه.',
  'لا تكتب السعر داخل نص العرض عند اختيار «السعر خاص».',
  'عرضك مختصر جداً — أضف تفاصيل خبرتك وطريقة التنفيذ والمدة.',
  'العرض خارج نطاق/تخصص المشروع المطلوب.',
  'نص عرضك منسوخ من عروض أخرى — اكتب عرضاً خاصاً بهذا المشروع يوضّح فهمك لمتطلباته.',
  'أرسلت القالب بدون تعبئة — استبدل ما بين الأقواس بمعلوماتك الحقيقية.',
  'العرض عشوائي أو غير مكتمل — يرجى تقديم عرض احترافي. التكرار يعرّض حسابك للحظر.'
];
var _warnBidId=null;
function warnBid(id){
  var b=(_allBids||[]).find(function(x){return x.id===id;});if(!b)return;
  _warnBidId=id;
  document.getElementById('wb-prov').textContent=(b.provider_business||b.provider_name||'المزوّد');
  document.getElementById('wb-note').value='';
  document.getElementById('wb-chips').innerHTML=WARN_PRESETS.map(function(t,i){return '<button type="button" onclick="_addWarn('+i+')" style="background:#fff;border:1px solid #fecaca;color:#b91c1c;padding:6px 10px;border-radius:999px;font-family:Tajawal;font-size:11.5px;font-weight:700;cursor:pointer;text-align:right;line-height:1.5">'+esc(t.length>42?t.slice(0,42)+'…':t)+'</button>';}).join('');
  document.getElementById('warnBidModal').classList.add('show');
}
function _addWarn(i){var t=document.getElementById('wb-note');var v=t.value.trim();t.value=(v?v+'\n':'')+WARN_PRESETS[i];t.focus();}
async function submitWarnBid(){
  if(_warnBidId==null)return;
  var note=(document.getElementById('wb-note').value||'').trim();
  if(!note){toast('اكتب نص التحذير أو اختر من الجاهز','error');return;}
  var btn=document.querySelector('#warnBidModal button[onclick="submitWarnBid()"]');if(btn){btn.disabled=true;btn.textContent='جاري الإرسال...';}
  try{
    var res=await fetch(API+'/api/admin/bids/'+_warnBidId+'/warn',Object.assign({method:'PUT',body:JSON.stringify({reason:note})},hdr())).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});});
    if(!res.ok){toast((res.d&&res.d.message)||'تعذّر الإرسال','error');if(btn){btn.disabled=false;btn.textContent='🚨 إرسال التحذير';}return;}
    closeModal('warnBidModal');toast('أُرسل التحذير للمزوّد (إشعار + إيميل)','success');try{loadBids();if(window._pdOpen)_provDrawer(window._pdOpen);}catch(e){}
    if(res.d&&res.d.wa_link)showWaFollowup(res.d.wa_link);
  }catch(e){toast('تعذّر الاتصال','error');if(btn){btn.disabled=false;btn.textContent='🚨 إرسال التحذير';}}
  if(btn){btn.disabled=false;btn.textContent='🚨 إرسال التحذير';}
}
function _bidMenu(btn,id,status){
  try{event.stopPropagation();}catch(e){}
  var m=document.getElementById('rowMenu');
  if(!m){m=document.createElement('div');m.id='rowMenu';m.className='rowdd-menu';document.body.appendChild(m);}
  if(m.classList.contains('open')&&m._rid==='b'+id){m.classList.remove('open');return;}
  m._rid='b'+id;
  var _pend=(status==='pending');
  m.innerHTML=''
    +'<button class="rowdd-item" onclick="_rmClose();openBidView('+id+')"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>عرض التفاصيل</button>'
    +(_pend?'<button class="rowdd-item" style="color:#c2410e" onclick="_rmClose();adminBidEdit('+id+')"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>طلب تعديل</button>':'')
    +(_pend?'<button class="rowdd-item danger" onclick="_rmClose();adminBidReject('+id+')"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>رفض العرض</button>':'')
    +'<button class="rowdd-item" onclick="_rmClose();editBid('+id+')"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>تعديل</button>'
    +'<button class="rowdd-item danger" onclick="_rmClose();delBid('+id+')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg>حذف</button>';
  m.classList.add('open');
  var r=btn.getBoundingClientRect();
  var mw=m.offsetWidth||190, mh=m.offsetHeight||240;
  var left=r.left; if(left+mw>window.innerWidth-8)left=window.innerWidth-mw-8; if(left<8)left=8;
  var top=r.bottom+6; if(top+mh>window.innerHeight-8)top=Math.max(8,r.top-mh-6);
  m.style.left=left+'px'; m.style.top=top+'px';
}
function openBidView(id){
  var b=(_allBids||[]).find(function(x){return x.id===id;}); if(!b)return;
  var vis=(b.price_visibility==='public')?'عام (يظهر للكل)':'خاص (لصاحب المشروع فقط)';
  var unit=(b.price_unit==='total'||!b.price_unit)?'إجمالي':b.price_unit;
  var body='<div style="font-size:13px;line-height:2.1">'
    +'<div><b>المزود:</b> '+esc(b.provider_business||b.provider_name||'—')+(b.provider_city?(' · '+esc(b.provider_city)):'')+'</div>'
    +'<div><b>المشروع:</b> '+esc(b.request_title||'—')+(b.client_name?(' · العميل: '+esc(b.client_name)):'')+'</div>'
    +'<div><b>السعر:</b> '+(b.price?fmtN(b.price)+' ر.س':'—')+' <span style="color:var(--muted);font-size:12px">('+esc(vis)+' · '+esc(unit)+')</span></div>'
    +'<div><b>المدة:</b> '+(b.days?b.days+' يوم':'—')+'</div>'
    +'</div>'
    +'<div style="margin-top:14px;font-weight:800;font-size:13px;color:#334155">نص العرض:</div>'
    +'<div style="background:var(--bg,#f8fafc);border:1px solid var(--border);border-radius:11px;padding:12px 14px;margin-top:6px;font-size:13px;line-height:1.9;white-space:pre-wrap;max-height:300px;overflow:auto">'+esc(b.note||'— لا يوجد نص —')+'</div>'
    +(b.attachment_url?('<a href="'+esc(_safeUrl(b.attachment_url))+'" target="_blank" rel="noopener" style="display:inline-block;margin-top:12px;color:#1d4ed8;font-weight:800;font-size:13px;text-decoration:none">📎 عرض ملف السعر المرفق ↗</a>'):'');
  document.getElementById('bidview-body').innerHTML=body;
  document.getElementById('bidview-title').textContent='عرض من '+((b.provider_business||b.provider_name)||'مزوّد');
  var ft=document.getElementById('bidview-foot');
  if(ft){
    var acts='';
    if(b.status==='pending'){acts+='<button class="btn-s" style="color:#c2410e;border:1px solid #fed7aa" onclick="closeModal(\'bidViewModal\');adminBidEdit('+id+')">🟠 طلب تعديل</button><button class="btn-s" style="color:#dc2626;border:1px solid #fecaca" onclick="closeModal(\'bidViewModal\');adminBidReject('+id+')">🔴 رفض</button>';}
    acts+='<button class="btn-s" onclick="closeModal(\'bidViewModal\')">إغلاق</button>';
    ft.innerHTML=acts;
  }
  document.getElementById('bidViewModal').classList.add('show');
}
// ═══ رصد جودة العروض: فهرس التكرار (نص/مرفق) عبر المشاريع ═══
var _bidx=null,_bidxSrc=null;
function _bidIndex(){
  if(_bidxSrc===_allBids&&_bidx)return _bidx;
  var txt={},att={};
  (_allBids||[]).forEach(function(x){
    var n=_bidNormNote(x.note);
    if(n.length>=15){var k=x.provider_id+'|'+n;(txt[k]=txt[k]||{})[x.request_id]=1;}
    var h=x.attachment_hash;
    if(h&&h!=='x'){var k2=x.provider_id+'|'+h;(att[k2]=att[k2]||{})[x.request_id]=1;}
  });
  _bidx={txt:txt,att:att};_bidxSrc=_allBids;return _bidx;
}
function _bidNormNote(s){return String(s||'').replace(/[ً-ْـ]/g,'').replace(/\s+/g,' ').trim();}
var _TPL_RE=/\(\s*(?:عدد|اشرح[^)]{0,40}|نوعها[^)]{0,40}|اذكر[^)]{0,40}|حدد[^)]{0,40})\s*\)/;
// كل راية: k=مفتاح الفلتر، t=النص، sev=high (مزعج فعلاً) / med (يستاهل نظرة)
function _bidFlags(b){
  var f=[], ix=_bidIndex(), note=(b.note||'').trim(), nn=_bidNormNote(note);
  if(!note) f.push({k:'empty',t:'نص فارغ',sev:'high'});
  if(_TPL_RE.test(note)) f.push({k:'tpl',t:'قالب غير معبّأ',sev:'high'});
  var tc=nn.length>=15?Object.keys(ix.txt[b.provider_id+'|'+nn]||{}).length:0;
  if(tc>=2) f.push({k:'copy',t:'نص منسوخ في '+tc+' مشاريع',sev:tc>=3?'high':'med'});
  var ac=(b.attachment_hash&&b.attachment_hash!=='x')?Object.keys(ix.att[b.provider_id+'|'+b.attachment_hash]||{}).length:0;
  if(ac>=2) f.push({k:'attdup',t:'نفس المرفق في '+ac+' مشاريع',sev:ac>=3?'high':'med'});
  if(note && nn.replace(/\s/g,'').length<40 && !f.some(function(x){return x.k==='tpl';})) f.push({k:'short',t:'نص قصير جداً',sev:'med'});
  if(b.price!=null&&b.price>0&&b.price<50&&(!b.price_unit||b.price_unit==='total')) f.push({k:'fake',t:'سعر وهمي ('+Math.round(b.price)+' ر.س)',sev:'high'});
  else if(b.price!=null&&b.price>0&&b.price<100&&(!b.price_unit||b.price_unit==='total')) f.push({k:'token',t:'سعر رمزي',sev:'med'});
  return f;
}
function _bidSev(fl){return fl.some(function(x){return x.sev==='high';})?'high':(fl.length?'med':'');}
function _bidAttKind(u){u=String(u||'').toLowerCase().split('?')[0];if(/\.(jpe?g|png|webp|gif|heic)$/.test(u))return 'img';if(/\.pdf$/.test(u))return 'pdf';return u?'file':'';}
var _bidView='list';
function setBidView(v){_bidView=v;try{_gtSync('bids');}catch(e){}document.querySelectorAll('#bid-viewtabs button').forEach(function(x){x.classList.toggle('on',x.getAttribute('data-v')===v);});renderBids();}
function _bidQuick(kind){
  var fl=document.getElementById('bf-flag'),tm=document.getElementById('bf-time');
  if(kind==='all'){if(fl)fl.value='';if(tm)tm.value='';}
  else if(kind==='new'){if(tm)tm.value='seen';if(fl)fl.value='';}
  else{if(fl)fl.value=kind;}
  renderBids();
}
function _bidCss(){
  if(document.getElementById('bid-css'))return;
  var st=document.createElement('style');st.id='bid-css';
  st.textContent=''
  +'.bkpis{display:flex;gap:8px;flex-wrap:wrap;padding:12px 0 4px}'
  +'.bkpi{flex:1;min-width:92px;background:var(--card,#fff);border:1px solid var(--border);border-radius:12px;padding:10px 12px;cursor:pointer;transition:.15s;text-align:right}'
  +'.bkpi:hover{border-color:#94a3b8;transform:translateY(-1px)}.bkpi.on{border-color:#1e3a8a;box-shadow:0 0 0 2px rgba(30,58,138,.12)}'
  +'.bkpi b{display:block;font-size:20px;font-weight:900;line-height:1.1}.bkpi span{font-size:11px;color:var(--muted);font-weight:700}'
  +'#bid-viewtabs{display:inline-flex;background:var(--bg,#f1f5f9);border-radius:10px;padding:3px;gap:2px}'
  +'#bid-viewtabs button{border:none;background:transparent;padding:7px 14px;border-radius:8px;font-family:inherit;font-size:12.5px;font-weight:800;color:var(--muted);cursor:pointer}'
  +'#bid-viewtabs button.on{background:var(--card,#fff);color:#1e3a8a;box-shadow:0 1px 3px rgba(0,0,0,.08)}'
  +'.bcard{background:var(--card,#fff);border:1px solid var(--border);border-radius:14px;padding:14px 16px;border-right:4px solid #cbd5e1;transition:box-shadow .15s}'
  +'.bcard:hover{box-shadow:0 4px 16px -8px rgba(15,23,42,.18)}'
  +'.bcard.sev-high{border-right-color:#dc2626;background:linear-gradient(90deg,rgba(254,242,242,0) 60%,rgba(254,242,242,.9))}'
  +'.bcard.sev-med{border-right-color:#f59e0b}'
  +'.bc-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}'
  +'.bc-av{width:36px;height:36px;border-radius:50%;background:#e0e7ff;color:#3730a3;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;flex:none}'
  +'.bc-name{font-weight:800;font-size:14px;line-height:1.3}.bc-sub{font-size:11.5px;color:var(--muted)}'
  +'.bc-pill{font-size:11px;font-weight:800;padding:3px 10px;border-radius:999px;white-space:nowrap}'
  +'.bc-proj{font-size:12.5px;color:#334155;margin:10px 0 0;display:flex;gap:6px;flex-wrap:wrap;align-items:center}'
  +'.bc-body{display:flex;gap:12px;margin-top:10px;align-items:flex-start}'
  +'.bc-note{flex:1;min-width:0;background:var(--bg,#f8fafc);border:1px solid var(--border);border-radius:10px;padding:9px 12px;font-size:13px;line-height:1.85;color:#1e293b;white-space:pre-wrap;word-break:break-word;max-height:7.6em;overflow:hidden;position:relative;cursor:pointer}'
  +'.bc-note.open{max-height:none}.bc-note.empty{color:#9a3412;background:#fff7ed;border-style:dashed;cursor:default}'
  +'.bc-note:not(.open):not(.empty).long:after{content:"… عرض الكل";position:absolute;left:0;bottom:0;padding:2px 10px;background:linear-gradient(90deg,var(--bg,#f8fafc) 70%,rgba(248,250,252,0));font-size:11px;font-weight:800;color:#1d4ed8}'
  +'.bc-att{width:104px;flex:none}.bc-att a{display:block;width:104px;height:104px;border-radius:10px;overflow:hidden;border:1px solid var(--border);background:#f1f5f9}'
  +'.bc-att img{width:100%;height:100%;object-fit:cover;display:block}'
  +'.bc-att .bc-doc{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-decoration:none;color:#b91c1c;font-weight:900;font-size:13px;gap:4px}'
  +'.bc-att small{display:block;text-align:center;font-size:10.5px;color:var(--muted);margin-top:4px}'
  +'.bc-meta{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px}'
  +'.bc-chip{font-size:12px;font-weight:700;padding:4px 10px;border-radius:8px;background:var(--bg,#f1f5f9);color:#334155;white-space:nowrap}'
  +'.bc-flag{font-size:11.5px;font-weight:800;padding:4px 10px;border-radius:999px;white-space:nowrap}'
  +'.bc-flag.high{background:#dc2626;color:#fff}.bc-flag.med{background:#fef3c7;color:#92400e}'
  +'.bc-act{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px;padding-top:10px;border-top:1px dashed var(--border)}'
  +'.bc-act button{padding:6px 11px;font-size:11.5px}'
  +'.pv-row{background:var(--card,#fff);border:1px solid var(--border);border-radius:14px;padding:13px 16px;display:flex;gap:14px;align-items:center;flex-wrap:wrap}'
  +'.pv-rank{width:30px;height:30px;border-radius:50%;background:#f1f5f9;color:#475569;font-weight:900;display:flex;align-items:center;justify-content:center;font-size:13px;flex:none}'
  +'.pv-bar{height:7px;background:#eef2f7;border-radius:6px;overflow:hidden;width:130px}.pv-bar i{display:block;height:100%}'
  +'.bkpi.bk-blue{background:#eef3ff;border-color:#c7d6fb}.bkpi.bk-amber{background:#fffbeb;border-color:#fde68a}'
  +'.bc-watch{background:#1e3a8a;color:#fff}'
  +'.bc-name.lnk{cursor:pointer}.bc-name.lnk:hover{color:#1d4ed8;text-decoration:underline;text-underline-offset:3px}'
  +'.bc-trail{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:11px;padding:8px 11px;font-size:12px;font-weight:800;color:#78350f}'
  +'.bc-trail .ar{color:#d6b25e}.bc-trail q{margin-inline-start:auto;color:#92400e;font-weight:700;max-width:46%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;quotes:"«" "»"}'
  +'.wst{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:11.5px;font-weight:900;white-space:nowrap}'
  +'.wst.ok{background:#dcfce7;color:#15803d}.wst.no{background:#fee2e2;color:#b91c1c}.wst.wait{background:#f1f5f9;color:#64748b}.wst.sn{background:#dbeafe;color:#1d4ed8}'
  +'#provDrawer{position:fixed;inset:0;z-index:900;display:flex}#provDrawer .pd-bg{flex:1;background:rgba(15,23,42,.35)}'
  +'#provDrawer .pd{width:min(620px,100vw);background:var(--card,#fff);height:100%;overflow-y:auto;padding:20px 22px 30px;box-sizing:border-box;box-shadow:20px 0 60px -20px rgba(15,37,68,.35);display:flex;flex-direction:column;gap:14px;order:-1}'
  +'.pd-hd{display:flex;gap:12px;align-items:center}.pd-av{width:52px;height:52px;border-radius:50%;background:#eef3ff;color:#1e3a8a;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:20px;flex:none}'
  +'.pd-x{margin-inline-start:auto;border:0;background:none;font-size:24px;color:#94a3b8;cursor:pointer;width:40px;height:40px;border-radius:10px}.pd-x:hover{background:#f1f5f9}'
  +'.pd-acts{display:flex;gap:8px;flex-wrap:wrap}.pd-acts .act-btn{padding:9px 14px;font-size:12.5px}'
  +'.pd-watch-on{background:#1e3a8a!important;color:#fff!important;border-color:#1e3a8a!important}'
  +'.pd-k{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.pd-k div{border:1px solid var(--border);border-radius:12px;padding:10px 12px}.pd-k b{display:block;font-size:20px;font-weight:900}.pd-k span{font-size:11.5px;font-weight:700;color:var(--muted)}'
  +'.pd-alert{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:10px 13px;font-size:12.5px;font-weight:800;color:#9a3412;line-height:1.8}'
  +'.pd-sec{font-size:14.5px;font-weight:900;margin-top:4px}'
  +'.pd-w{display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--border)}.pd-w .ic{width:30px;height:30px;border-radius:50%;background:#fef3c7;display:flex;align-items:center;justify-content:center;flex:none;font-size:14px}'
  +'.pd-b{display:flex;align-items:center;gap:8px;padding:9px 0;border-bottom:1px solid var(--border);font-size:12.5px;font-weight:800;flex-wrap:wrap}'
  +'@media(max-width:640px){.pd-k{grid-template-columns:repeat(2,1fr)}.bc-trail q{max-width:100%;margin-inline-start:0}}'
  +'@media(max-width:640px){.bc-body{flex-direction:column}.bc-att,.bc-att a{width:100%}.bc-att a{height:180px}}';
  document.head.appendChild(st);
}
function _bidKpis(){
  var host=document.getElementById('bid-kpis');if(!host)return;
  var all=_allBids||[], c={all:all.length,neu:0,sus:0,tpl:0,copy:0,attdup:0,contact:0,watch:0,watchnew:0,warnopen:0}, _wp={};
  all.forEach(function(b){if(b.provider_watch)_wp[b.provider_id]=1;if(b.provider_watch&&window._bidsSeenPrev&&b.created_at&&new Date(b.created_at).getTime()>window._bidsSeenPrev)c.watchnew++;if(b.warning&&!b.warning.edited_at&&b.status!=='accepted')c.warnopen++;});c.watch=Object.keys(_wp).length;
  all.forEach(function(b){
    var fl=_bidFlags(b);
    if(window._bidsSeenPrev&&b.created_at&&new Date(b.created_at).getTime()>window._bidsSeenPrev)c.neu++;
    if(_bidSev(fl)==='high')c.sus++;
    fl.forEach(function(x){if(c[x.k]!=null)c[x.k]++;});
  });
  var cur=(document.getElementById('bf-flag')||{}).value||'', tm=(document.getElementById('bf-time')||{}).value||'';
  var k=function(key,n,lbl,col){var on=(key==='new'?tm==='seen':(key==='all'?(!cur&&!tm):cur===key));return '<div class="bkpi'+(on?' on':'')+'" onclick="_bidQuick(\''+key+'\')"><b style="color:'+col+'">'+n+'</b><span>'+lbl+'</span></div>';};
  host.innerHTML=k('all',c.all,'كل العروض','#0f172a')+k('new',c.neu,'🆕 جديد منذ آخر زيارة','#16a34a')+(c.watch?k('watch',c.watch,'👁 مزوّدين تحت المراقبة','#1e3a8a').replace('class="bkpi','class="bkpi bk-blue'):'')+(c.watch?k('watchnew',c.watchnew,'عروض جديدة من المراقَبين','#1e3a8a').replace('class="bkpi','class="bkpi bk-blue'):'')+k('warnopen',c.warnopen,'⚠️ حذّرناهم وما عدّلوا','#b45309').replace('class="bkpi','class="bkpi bk-amber')+k('sus',c.sus,'🚩 مزعجة','#dc2626')+k('tpl',c.tpl,'قالب غير معبّأ','#b91c1c')+k('copy',c.copy,'نص منسوخ','#7c3aed')+k('attdup',c.attdup,'مرفق مكرر','#c2410e');
}
function renderBids(){
  _bidCss();
  syncBidFiltersToHash();
  _bidKpis();
  var list=getFilteredBids();
  var host=document.getElementById('bids-table');
  var _tsf=function(b){return b.created_at?new Date(b.created_at).getTime():0;};
  var _newN=window._bidsSeenPrev?(_allBids||[]).filter(function(b){return _tsf(b)>window._bidsSeenPrev;}).length:0;
  var cnt=document.getElementById('bf-count');
  if(_bidView==='prov'){ _renderBidProviders(list,host,cnt); return; }
  if(cnt)cnt.innerHTML=list.length+' عرض'+(_newN?' · <span style="color:#16a34a;cursor:pointer" onclick="_bidQuick(\'new\')">🆕 '+_newN+' جديد</span>':'');
  if(!list.length){host.innerHTML=emptyState('لا توجد عروض مطابقة');return;}
  var srt=(document.getElementById('bf-sort')||{}).value||'new', rank={high:2,med:1,'':0};
  var fc={};list.forEach(function(b){fc[b.id]=_bidFlags(b);});
  list=list.slice().sort(function(a,b){
    if(srt==='old')return _tsf(a)-_tsf(b);
    if(srt==='pdesc')return (b.price||0)-(a.price||0);
    if(srt==='pasc')return (a.price||0)-(b.price||0);
    if(srt==='sus'){var d=rank[_bidSev(fc[b.id])]-rank[_bidSev(fc[a.id])];if(d)return d;d=fc[b.id].length-fc[a.id].length;if(d)return d;}
    return _tsf(b)-_tsf(a);
  });
  var stMap={pending:['معلّق','#fef3c7','#92400e'],accepted:['مقبول','#dcfce7','#166534'],rejected:['مرفوض','#fee2e2','#991b1b']};
  var unitMap={total:'',meter:' / متر',unit:' / وحدة'};
  host.innerHTML='<div style="display:flex;flex-direction:column;gap:10px;padding:6px">'+list.slice(0,300).map(function(b){
    var fl=fc[b.id], sev=_bidSev(fl), st=stMap[b.status]||[b.status,'#f1f5f9','#334155'];
    var nm=b.provider_business||b.provider_name||'مزوّد', note=(b.note||'').trim();
    var isNew=window._bidsSeenPrev&&_tsf(b)>window._bidsSeenPrev;
    var ak=_bidAttKind(b.attachment_url), att='';
    if(ak==='img')att='<div class="bc-att"><a href="'+esc(_safeUrl(b.attachment_url))+'" target="_blank" rel="noopener"><img loading="lazy" src="'+esc(_safeUrl(b.attachment_url))+'" alt="مرفق"></a><small>🖼️ صورة مرفقة</small></div>';
    else if(ak)att='<div class="bc-att"><a href="'+esc(_safeUrl(b.attachment_url))+'" target="_blank" rel="noopener"><span class="bc-doc"><span style="font-size:26px">📄</span>'+(ak==='pdf'?'PDF':'ملف')+'</span></a><small>'+(ak==='pdf'?'عرض سعر PDF':'ملف مرفق')+'</small></div>';
    var long=note.split('\n').length>4||note.length>320;
    return '<div class="bcard'+(sev?' sev-'+sev:'')+'">'
      +'<div class="bc-top"><div class="bc-av">'+esc(nm.trim().charAt(0)||'؟')+'</div>'
        +'<div style="min-width:0"><div class="bc-name lnk" onclick="_provDrawer('+b.provider_id+')">'+esc(nm)+(b.provider_watch?' <span class="bc-pill bc-watch">👁 تحت المراقبة</span>':'')+(b.provider_active===false?' <span class="bc-pill" style="background:#fee2e2;color:#991b1b">⛔ موقوف</span>':'')+'</div><div class="bc-sub">'+esc(b.provider_city||'—')+'</div></div>'
        +'<div style="margin-inline-start:auto;display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
          +(isNew?'<span class="bc-pill" style="background:#16a34a;color:#fff">🆕 جديد</span>':'')
          +'<span class="bc-sub" title="'+esc(b.created_at?new Date(b.created_at).toLocaleString('ar-SA-u-nu-latn-ca-gregory'):'')+'">🕒 '+_bidAgo(b.created_at)+'</span>'
          +'<span class="bc-pill" style="background:'+st[1]+';color:'+st[2]+'">'+st[0]+'</span></div></div>'
      +'<div class="bc-proj"><span>📋 <b>'+esc(b.request_title||'—')+'</b></span><span class="bc-sub">· العميل: '+esc(b.client_name||'—')+(b.request_city?' · '+esc(b.request_city):'')+'</span></div>'
      +'<div class="bc-body"><div class="bc-note'+(note?(long?' long':''):' empty')+'" onclick="if(!this.classList.contains(\'empty\'))this.classList.toggle(\'open\')">'+(note?esc(note):'⚠️ لا يوجد نص عرض')+'</div>'+att+'</div>'
      +'<div class="bc-meta"><span class="bc-chip" style="color:#0f172a">💰 '+(b.price?fmtN(b.price)+' ر.س'+(unitMap[b.price_unit]||''):'—')+'</span><span class="bc-chip">⏱ '+(b.days?b.days+' يوم':'—')+'</span><span class="bc-chip">'+(b.price_visibility==='public'?'🌐 السعر ظاهر':'🔒 السعر خاص')+'</span>'
        +fl.map(function(x){return '<span class="bc-flag '+x.sev+'">🚩 '+esc(x.t)+'</span>';}).join('')+'</div>'
      +_bidTrail(b.warning)
      +'<div class="bc-act">'
        +'<button class="act-btn ab-default" style="color:#b91c1c;border-color:#fecaca;background:#fef2f2" onclick="warnBid('+b.id+')">⚠️ تحذير</button>'
        +(b.status==='pending'?'<button class="act-btn ab-default" style="color:#c2410e;border-color:#fed7aa" onclick="adminBidEdit('+b.id+')">طلب تعديل</button><button class="act-btn ab-danger" onclick="adminBidReject('+b.id+')">رفض</button>':'')
        +'<button class="act-btn ab-default" onclick="editBid('+b.id+')">تعديل</button>'
        +'<button class="act-btn ab-danger" onclick="delBid('+b.id+')">حذف</button>'
        +'<button class="act-btn ab-default" style="margin-inline-start:auto" onclick="_bidOfProvider('+b.provider_id+')">كل عروضه</button><button class="act-btn ab-default" onclick="_provDrawer('+b.provider_id+')">👤 ملف المزوّد</button>'+_proLink(b.provider_id)
      +'</div></div>';
  }).join('')+(list.length>300?'<div style="text-align:center;color:var(--muted);font-size:12px;padding:10px">يعرض أول 300 — ضيّق الفلاتر لرؤية الباقي</div>':'')+'</div>';
}

// ===== سجل التحذير تحت العرض: أُرسل ← شافه ← عدّل =====
function _wAgo(d){var a=_bidAgo(d);return a==='الآن'?a:a.replace('منذ','قبل');}
function _wSteps(w){
  var s=['<span class="wst ok">'+(w.kind==='edit'?'✏️ طلب تعديل':'⚠️ حذّرناه')+' · '+_wAgo(w.created_at)+'</span>'];
  s.push(w.seen_at?'<span class="wst sn">👁 شافه · '+_wAgo(w.seen_at)+'</span>':'<span class="wst wait">👁 ما شافه للحين</span>');
  if(w.edited_at)s.push('<span class="wst ok">✏️ عدّل العرض · '+_wAgo(w.edited_at)+'</span>');
  else if(w.seen_at)s.push(w.ack_at?'<span class="wst no">ضغط «فهمت» وما عدّل</span>':'<span class="wst no">✏️ ما عدّل للحين</span>');
  return s.join('<span class="ar">←</span>');
}
function _bidTrail(w){
  if(!w)return '';
  return '<div class="bc-trail">'+_wSteps(w)+(w.n>1?' <span class="wst wait">'+w.n+' مرات</span>':'')+'<q title="'+esc(w.reason||'')+'">'+esc(w.reason||'')+'</q></div>';
}
// ===== ملف المزوّد (يفتح من الجنب) =====
function _provDrawer(pid){
  window._pdOpen=pid;
  var d=document.getElementById('provDrawer');
  if(!d){d=document.createElement('div');d.id='provDrawer';document.body.appendChild(d);document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('provDrawer'))_provDrawerClose();});}
  d.innerHTML='<div class="pd" role="dialog" aria-label="ملف المزوّد"><div style="padding:40px;text-align:center;color:var(--muted)">جاري التحميل...</div></div><div class="pd-bg" onclick="_provDrawerClose()"></div>';
  fetch(API+'/api/admin/providers/'+pid+'/bid-profile',hdr()).then(function(r){return r.json();}).then(function(x){
    if(!x||!x.user){d.querySelector('.pd').innerHTML='<div style="padding:40px;text-align:center">تعذّر التحميل</div>';return;}
    var u=x.user,nm=u.business_name||u.name||'مزوّد';
    var mine=(_allBids||[]).filter(function(b){return b.provider_id===pid;}), sus=0;
    mine.forEach(function(b){var sv=_bidSev(_bidFlags(b));if(sv==='high'||sv==='med')sus++;});
    var susPct=mine.length?Math.round(sus/mine.length*100):0;
    var ph=String(u.phone||'').replace(/\D/g,'');if(ph.indexOf('05')===0)ph='966'+ph.slice(1);else if(ph.indexOf('5')===0&&ph.length===9)ph='966'+ph;
    var since=u.created_at?Math.max(0,Math.round((Date.now()-new Date(u.created_at))/864e5/30)):0;
    var alerts=[];
    if(x.similarity&&x.similarity.total>2&&x.similarity.pct>=40)alerts.push('🔁 '+x.similarity.pct+'% من عروضه نفس النص تقريباً');
    if(u.burst>=5)alerts.push('🕒 قدّم '+u.burst+' عروض في ساعة وحدة (آخر أسبوعين)');
    if(u.reports)alerts.push('🚩 '+u.reports+' بلاغ من عملاء');
    var stMap={pending:'معلّق',accepted:'مقبول',rejected:'مرفوض'};
    var h='<div class="pd-hd"><span class="pd-av">'+esc(nm.trim().charAt(0)||'؟')+'</span><div style="min-width:0"><b style="font-size:18px;display:block">'+esc(nm)+(u.is_active?'':' <span class="bc-pill" style="background:#fee2e2;color:#991b1b">⛔ موقوف</span>')+'</b><span class="bc-sub">'+esc(u.city||'—')+' · مسجّل '+(since<1?'هالشهر':(since===1?'من شهر':(since===2?'من شهرين':'من '+since+' '+(since<=10?'شهور':'شهر'))))+(u.phone?' · <span dir="ltr">'+esc(u.phone)+'</span>':'')+'</span></div><button class="pd-x" aria-label="إغلاق" onclick="_provDrawerClose()">×</button></div>'
      +'<div class="pd-acts"><button class="act-btn ab-default'+(u.admin_watch?' pd-watch-on':'')+'" onclick="_provWatch('+pid+','+(u.admin_watch?0:1)+')">'+(u.admin_watch?'👁 تحت المراقبة ✓':'👁 راقب هذا المزوّد')+'</button>'
        +'<button class="act-btn ab-default" onclick="_provReview('+pid+','+(u.bid_review?0:1)+')">'+(u.bid_review?'▶️ رفع المراجعة عن عروضه':'⏸ عروضه تنتظر موافقتي')+'</button>'
        +_proLink(pid)+(ph.length>=11?'<a class="act-btn ab-default" style="text-decoration:none" target="_blank" rel="noopener" href="https://wa.me/'+ph+'">💬 واتساب</a>':'')
        +'<button class="act-btn ab-danger" onclick="_provToggle('+pid+','+(u.is_active?1:0)+');setTimeout(function(){_provDrawer('+pid+')},900)">'+(u.is_active?'⛔ إيقاف':'✅ تفعيل')+'</button></div>'
      +'<div class="pd-k"><div><b>'+u.bids_30d+'</b><span>عرض آخر 30 يوم</span></div><div><b style="color:#b91c1c">'+sus+'</b><span>مشبوهة'+(mine.length?' ('+susPct+'%)':'')+'</span></div><div><b style="color:#b45309">'+u.warnings+'</b><span>تحذيرات</span></div><div><b style="color:#16a34a">'+u.accepted+'</b><span>مقبول</span></div></div>'
      +(alerts.length?'<div class="pd-alert">'+alerts.join(' · ')+'</div>':'')
      +'<div class="pd-sec">سجل التحذيرات</div>'
      +(x.warnings.length?x.warnings.map(function(w){return '<div class="pd-w"><span class="ic">'+(w.kind==='edit'?'✏️':'⚠️')+'</span><div style="flex:1;min-width:0"><b style="font-size:13px">'+(w.kind==='edit'?'طلب تعديل على':'تحذير على')+' «'+esc(w.request_title||'—')+'» · '+_wAgo(w.created_at)+'</b><div style="font-size:12.5px;color:var(--muted);font-weight:700;margin-top:2px;line-height:1.7">«'+esc(w.reason||'')+'»</div><div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;align-items:center">'+_wSteps(w).replace(/<span class="ar">←<\/span>/g,'')+'</div></div></div>';}).join(''):'<div style="font-size:12.5px;color:var(--muted);padding:6px 0">ما أرسلت له أي تحذير للحين.</div>')
      +'<div class="pd-sec">آخر عروضه</div>'
      +x.bids.map(function(b){var bb=mine.find(function(m){return m.id===b.id;}),fl=bb?_bidFlags(bb):[];return '<div class="pd-b"><span style="flex:1;min-width:140px">'+esc(b.request_title||'—')+'</span>'+fl.slice(0,2).map(function(f){return '<span class="bc-flag '+f.sev+'">🚩 '+esc(f.t)+'</span>';}).join('')+'<span class="bc-chip">'+(b.price?fmtN(b.price)+' ر.س'+(b.price_unit==='meter'?' / متر':(b.price_unit==='unit'?' / وحدة':'')):'—')+'</span><span class="bc-pill" style="background:#f1f5f9;color:#475569">'+(stMap[b.status]||esc(b.status||''))+'</span></div>';}).join('')
      +'<button class="act-btn ab-default" style="align-self:flex-start" onclick="_provDrawerClose();_bidOfProvider('+pid+')">عرض كل عروضه في القائمة</button>';
    d.querySelector('.pd').innerHTML=h;
  }).catch(function(){d.querySelector('.pd').innerHTML='<div style="padding:40px;text-align:center">تعذّر الاتصال</div>';});
}
function _provDrawerClose(){var d=document.getElementById('provDrawer');if(d)d.remove();window._pdOpen=null;}
function _provWatch(pid,on){
  fetch(API+'/api/admin/providers/'+pid+'/watch',Object.assign({method:'POST',body:JSON.stringify({on:!!on})},hdr())).then(function(r){return r.json();}).then(function(d){
    if(!d||!d.ok){toast('تعذّر التنفيذ','error');return;}
    (_allBids||[]).forEach(function(x){if(x.provider_id===pid)x.provider_watch=!!on;});
    toast(on?'صار تحت المراقبة — يوصلك إشعار مع كل عرض جديد منه 👁':'أُلغيت المراقبة','success');renderBids();_provDrawer(pid);
  }).catch(function(){toast('تعذّر الاتصال','error');});
}
function _provReview(pid,on){
  if(on&&!confirm('عروضه الجديدة ما تظهر للعملاء إلا بعد موافقتك. متأكد؟'))return;
  fetch(API+'/api/admin/bid-reports/provider/'+pid+'/action',Object.assign({method:'POST',body:JSON.stringify({action:on?'review':'lift'})},hdr())).then(function(r){return r.json();}).then(function(d){
    toast((d&&d.message)||'تم',d&&d.ok?'success':'error');_provDrawer(pid);
  }).catch(function(){toast('تعذّر الاتصال','error');});
}
function _bidOfProvider(pid){
  var b=(_allBids||[]).find(function(x){return x.provider_id===pid;});if(!b)return;
  var sr=document.getElementById('bid-search');if(sr)sr.value=(b.provider_business||b.provider_name||'');
  ['bf-flag','bf-time','bf-att','bf-vis','bf-city'].forEach(function(i){var x=document.getElementById(i);if(x)x.value='';});
  setBidView('list');window.scrollTo({top:0,behavior:'smooth'});
}
function _renderBidProviders(list,host,cnt){
  var P={};
  list.forEach(function(b){
    var p=P[b.provider_id]=P[b.provider_id]||{id:b.provider_id,name:b.provider_business||b.provider_name||'مزوّد',city:b.provider_city,active:b.provider_active!==false,total:0,high:0,med:0,reasons:{},last:0,worst:null,worstSev:0};
    var fl=_bidFlags(b), sev=_bidSev(fl), t=b.created_at?new Date(b.created_at).getTime():0;
    p.total++; if(sev==='high')p.high++; else if(sev==='med')p.med++;
    fl.forEach(function(x){var key=x.k==='copy'?'نص منسوخ':(x.k==='attdup'?'مرفق مكرر':x.t);p.reasons[key]=(p.reasons[key]||0)+1;});
    if(t>p.last)p.last=t;
    var sv=sev==='high'?2:(sev==='med'?1:0); if(sv>p.worstSev||(sv===p.worstSev&&sv>0&&t>(p.worstT||0))){p.worstSev=sv;p.worst=b.id;p.worstT=t;}
  });
  var arr=Object.keys(P).map(function(k){return P[k];}).filter(function(p){return p.high+p.med>0;});
  arr.sort(function(a,b){return (b.high-a.high)||(b.med-a.med)||(b.total-a.total);});
  if(cnt)cnt.innerHTML=arr.length+' مزوّد عنده عروض مشبوهة';
  if(!arr.length){host.innerHTML=emptyState('ما فيه مزوّدين عندهم عروض مشبوهة في هالفلاتر 🎉');return;}
  host.innerHTML='<div style="display:flex;flex-direction:column;gap:9px;padding:6px">'+arr.slice(0,150).map(function(p,i){
    var pct=Math.round((p.high+p.med)/p.total*100), col=p.high?'#dc2626':'#f59e0b';
    var rs=Object.keys(p.reasons).sort(function(a,b){return p.reasons[b]-p.reasons[a];}).slice(0,5);
    return '<div class="pv-row" style="border-right:4px solid '+col+'">'
      +'<div class="pv-rank">'+(i+1)+'</div>'
      +'<div style="min-width:170px;flex:1"><div class="bc-name">'+esc(p.name)+(p.active?'':' <span class="bc-pill" style="background:#fee2e2;color:#991b1b">⛔ موقوف</span>')+'</div><div class="bc-sub">'+esc(p.city||'—')+' · آخر عرض '+_bidAgo(new Date(p.last))+'</div></div>'
      +'<div style="min-width:170px"><div style="font-size:12.5px;font-weight:800"><span style="color:#dc2626">'+p.high+' مزعج</span>'+(p.med?' · <span style="color:#b45309">'+p.med+' متوسط</span>':'')+' <span style="color:var(--muted);font-weight:600">من '+p.total+'</span></div><div class="pv-bar" style="margin-top:5px"><i style="width:'+pct+'%;background:'+col+'"></i></div></div>'
      +'<div style="display:flex;gap:5px;flex-wrap:wrap;flex:2;min-width:200px">'+rs.map(function(r){return '<span class="bc-flag med" style="background:#f1f5f9;color:#334155">'+esc(r)+' ×'+p.reasons[r]+'</span>';}).join('')+'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
        +'<button class="act-btn ab-default" style="padding:6px 11px;font-size:11.5px" onclick="_provDrawer('+p.id+')">👤 ملف المزوّد</button>'+'<button class="act-btn ab-default" style="padding:6px 11px;font-size:11.5px" onclick="_bidOfProvider('+p.id+')">عروضه</button>'
        +(p.worst?'<button class="act-btn ab-default" style="padding:6px 11px;font-size:11.5px;color:#b91c1c;border-color:#fecaca;background:#fef2f2" onclick="warnBid('+p.worst+')">⚠️ تحذير</button>':'')
        +'<button class="act-btn ab-danger" style="padding:6px 11px;font-size:11.5px" onclick="_provToggle('+p.id+','+(p.active?1:0)+')">'+(p.active?'⛔ إيقاف':'✅ تفعيل')+'</button>'
      +'</div></div>';
  }).join('')+'</div>';
}
function _provToggle(pid,isActive){
  var b=(_allBids||[]).find(function(x){return x.provider_id===pid;}), nm=b?(b.provider_business||b.provider_name):'المزوّد';
  if(!confirm((isActive?'إيقاف':'تفعيل')+' حساب «'+nm+'»؟'+(isActive?' لن يتمكن من الدخول أو التقديم حتى تعيد تفعيله.':'')))return;
  fetch(API+'/api/admin/users/'+pid+'/toggle',Object.assign({method:'PUT'},hdr()))
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});})
    .then(function(res){if(!res.ok){toast((res.d&&res.d.message)||'تعذّر التنفيذ','error');return;}
      var act=!(res.d&&res.d.is_active===false);(_allBids||[]).forEach(function(x){if(x.provider_id===pid)x.provider_active=act;});
      toast(act?'تم تفعيل المزوّد':'تم إيقاف المزوّد ⛔','success');renderBids();})
    .catch(function(){toast('تعذّر الاتصال','error');});
}

async function printOffersReport(reqId){
  try{
    var d=await fetch(API+'/api/admin/requests/'+reqId+'/report-link',hdr()).then(function(r){return r.json();});
    if(!d||!d.url){toast('تعذّر توليد التقرير','error');return;}
    var w=window.open(d.url,'_blank');
    if(!w)toast('اسمح بالنوافذ المنبثقة لعرض التقرير','error');
  }catch(e){toast('تعذّر الاتصال','error');}
}
function loadAgents(){
  fetch(API+'/api/admin/agents',hdr()).then(function(r){return r.json();}).then(function(list){
    var el=document.getElementById('agents-list');
    if(!Array.isArray(list)||!list.length){el.innerHTML='<div style="padding:26px;text-align:center;color:#94a3b8">لا يوجد مناديب بعد — اربط مندوباً بمشروع من تبويب المشاريع</div>';return;}
    el.innerHTML=list.map(renderAgentCard).join('');
  }).catch(function(){document.getElementById('agents-list').innerHTML='<div style="padding:26px;text-align:center;color:#dc2626">تعذّر التحميل</div>';});
}
function _agEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function renderAgentCard(a){
  var pend=0,due=0,paid=0;
  var rows=(a.projects||[]).map(function(p){
    var pct=Number(p.pct)||0, ap=Number(p.accepted_price)||0;
    var done=(p.status==='in_progress'||p.status==='completed'||p.status==='done')&&ap>0;
    var d=done?Math.round(ap*pct/100):0;
    var badge,col,act='';
    if(p.paid_at){badge='مدفوعة';col='#059669';paid+=d;act='<button onclick="markAgentPaid('+p.id+',false)" style="background:none;border:1px solid #e2e8f0;color:#64748b;padding:5px 11px;border-radius:8px;font-family:Tajawal;font-size:11px;font-weight:700;cursor:pointer">إلغاء الدفع</button>';}
    else if(done){badge='مستحقة';col='#1e40af';due+=d;act='<button onclick="markAgentPaid('+p.id+',true)" style="background:#059669;border:none;color:#fff;padding:5px 12px;border-radius:8px;font-family:Tajawal;font-size:11px;font-weight:800;cursor:pointer">تعليم كمدفوع</button>';}
    else{badge='قيد استقبال العروض';col='#b45309';pend++;}
    return '<tr><td style="padding:9px;font-size:12px"><div style="font-weight:700;color:#0f2a4f">'+_agEsc(p.title||'—')+'</div><div style="font-size:10.5px;color:#94a3b8">#'+p.id+' · '+pct+'٪</div></td>'
      +'<td style="padding:9px;text-align:center"><span style="background:'+col+'1a;color:'+col+';padding:2px 9px;border-radius:20px;font-size:10.5px;font-weight:800">'+badge+'</span></td>'
      +'<td style="padding:9px;text-align:center;font-weight:900;color:'+(p.paid_at?'#059669':(d?'#1e40af':'#cbd5e1'))+';white-space:nowrap">'+(d?d.toLocaleString('en-US')+' ر.س':'—')+'</td>'
      +'<td style="padding:9px;text-align:left">'+act+'</td></tr>';
  }).join('');
  return '<div style="border:1px solid #e2e8f0;border-radius:13px;padding:15px;margin-bottom:13px">'
    +'<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px">'
    +'<div><div style="font-size:15px;font-weight:900;color:#0f2a4f">'+_agEsc(a.name)+'</div><div style="font-size:12px;color:#64748b">'+_agEsc(a.phone||'بلا جوال')+' · '+((a.projects||[]).length)+' مشروع</div></div>'
    +'<button onclick="copyAgentLink('+_jsa(a.link)+','+_jsa(a.phone||'')+')" style="background:#0f2a4f;color:#fff;border:none;padding:8px 14px;border-radius:9px;font-family:Tajawal;font-size:12px;font-weight:800;cursor:pointer">رابط التتبّع</button></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">'
    +'<div style="background:#fffbeb;border-radius:10px;padding:9px;text-align:center"><div style="font-size:16px;font-weight:900;color:#b45309">'+pend+'</div><div style="font-size:10.5px;color:#92400e">قيد الانتظار</div></div>'
    +'<div style="background:#eff6ff;border-radius:10px;padding:9px;text-align:center"><div style="font-size:16px;font-weight:900;color:#1e40af">'+due.toLocaleString('en-US')+'</div><div style="font-size:10.5px;color:#1e40af">مستحق (ر.س)</div></div>'
    +'<div style="background:#ecfdf5;border-radius:10px;padding:9px;text-align:center"><div style="font-size:16px;font-weight:900;color:#059669">'+paid.toLocaleString('en-US')+'</div><div style="font-size:10.5px;color:#059669">مدفوع (ر.س)</div></div></div>'
    +(rows?('<table style="width:100%;border-collapse:collapse"><thead><tr><th style="padding:8px;text-align:right;font-size:10.5px;color:#64748b;border-bottom:1px solid #e2e8f0">المشروع</th><th style="padding:8px;text-align:center;font-size:10.5px;color:#64748b;border-bottom:1px solid #e2e8f0">الحالة</th><th style="padding:8px;text-align:center;font-size:10.5px;color:#64748b;border-bottom:1px solid #e2e8f0">العمولة</th><th style="border-bottom:1px solid #e2e8f0"></th></tr></thead><tbody>'+rows+'</tbody></table>'):'<div style="font-size:12px;color:#94a3b8;text-align:center;padding:8px">لا مشاريع</div>')
    +'</div>';
}
function markAgentPaid(reqId,paid){
  fetch(API+'/api/admin/requests/'+reqId+'/agent-paid',Object.assign({method:'PUT',body:JSON.stringify({paid:paid})},hdr()))
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(){toast(paid?'تم تعليم العمولة مدفوعة ✓':'تم إلغاء الدفع','success');loadAgents();})
    .catch(function(){toast('تعذّر التحديث','error');});
}
function copyAgentLink(url,phone){
  var wa='https://wa.me/'+(phone||'')+'?text='+encodeURIComponent('رابط متابعة مشاريعك وعمولاتك في مناقصة:\n'+url);
  _showProxyDone(url,wa);
}
function sendAgentLink(reqId){
  fetch(API+'/api/admin/requests/'+reqId+'/agent-link',hdr()).then(function(r){return r.json();}).then(function(d){
    if(!d||!d.ok||!d.url){toast((d&&d.message)||'لا يوجد مندوب مرتبط — احفظ اسم المندوب أولاً','error');return;}
    var wa='https://wa.me/'+(d.phone_norm||'')+'?text='+encodeURIComponent('مرحباً '+(d.name||'')+'، هذا رابط متابعة مشاريعك وعمولاتك في مناقصة:\n'+d.url);
    _showProxyDone(d.url, wa);
  }).catch(function(){toast('تعذّر الاتصال','error');});
}
function sendOffersReport(reqId){
  fetch(API+'/api/admin/requests/'+reqId+'/send-report',Object.assign({method:'POST'},hdr())).then(function(r){return r.json();}).then(function(d){
    if(!d||!d.ok){toast((d&&d.message)||'تعذّر الإرسال','error');return;}
    toast(d.emailed?'تم إرسال التقرير لإيميل العميل ✓':'العميل بلا إيميل — أرسله واتساب','success');
    var wa='https://wa.me/'+(d.phone_norm||'')+'?text='+encodeURIComponent('عروض مشروعك جاهزة — شوف التقرير:\n'+d.link);
    _showProxyDone(d.link, wa);
  }).catch(function(){toast('تعذّر الاتصال','error');});
}
var _editBidId=null;
function editBid(id){
  var b=_allBids.find(function(x){return x.id===id;});if(!b)return;_editBidId=id;
  document.getElementById('eb-price').value=b.price||'';
  document.getElementById('eb-days').value=b.days||'';
  document.getElementById('eb-unit').value=b.price_unit||'total';
  document.getElementById('eb-vis').value=(b.price_visibility==='public')?'public':'client';
  document.getElementById('eb-note').value=b.note||'';
  document.getElementById('eb-prov').textContent=(b.provider_business_name||b.provider_name||'المزود');
  document.getElementById('editBidModal').classList.add('show');
}
async function saveBidEdit(){
  if(_editBidId==null)return;
  var price=Number(document.getElementById('eb-price').value);
  var days=parseInt(document.getElementById('eb-days').value);
  if(!(price>0)||!(days>0)){toast('السعر والمدة مطلوبان','error');return;}
  var body={price:price,days:days,note:document.getElementById('eb-note').value,price_unit:document.getElementById('eb-unit').value,price_visibility:document.getElementById('eb-vis').value};
  if(!await askConfirm({title:'حفظ تعديل العرض',message:'سيُحدَّث عرض المزود بالقيم الجديدة. هل تؤكد؟',confirmText:'نعم، احفظ'}))return;
  fetch(API+'/api/admin/bids/'+_editBidId,Object.assign({method:'PUT',body:JSON.stringify(body)},hdr()))
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(){toast('تم تعديل العرض','success');closeModal('editBidModal');loadBids();})
    .catch(function(){toast('تعذر التعديل','error');});
}
async function delBid(id){
  if(!await askConfirm({title:'حذف العرض',message:'سيُحذف عرض المزود نهائياً.',confirmText:'نعم، احذف'}))return;
  fetch(API+'/api/admin/bids/'+id,Object.assign({method:'DELETE'},hdr()))
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(){toast('تم حذف العرض','success');loadBids();})
    .catch(function(){toast('تعذر الحذف','error');});
}

function downloadCSV(rows, filename){
  if(!rows||!rows.length){toast('لا توجد بيانات للتصدير','error');return;}
  var headers=Object.keys(rows[0]);
  var csv=headers.join(',')+'\n';
  rows.forEach(function(r){
    csv+=headers.map(function(h){
      var v=r[h]==null?'':String(r[h]);
      v=v.replace(/"/g,'""');
      return /[",\n]/.test(v)?'"'+v+'"':v;
    }).join(',')+'\n';
  });
  var blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=filename;a.click();
  toast('تم تصدير الملف','success');
}
function exportBids(){
  var list=getFilteredBids();
  if(!list.length){toast('لا توجد بيانات للتصدير','error');return;}
  if(!_xlsxReady(exportBids))return;
  var stLbl={pending:'معلّق',accepted:'مقبول',rejected:'مرفوض'};
  var headers=['المزود','مدينة المزود','المشروع','العميل','السعر (ر.س)','المدة (يوم)','الحالة','تاريخ العرض'];
  var rows=list.map(function(b){return [b.provider_business||b.provider_name||'',b.provider_city||'',b.request_title||'',b.client_name||'',b.price||'',b.days||'',(stLbl[b.status]||b.status||''),b.created_at?new Date(b.created_at).toLocaleDateString('en-GB'):''];});
  var ok=_downloadXlsx(headers,rows,{cols:[{wch:22},{wch:14},{wch:26},{wch:16},{wch:12},{wch:11},{wch:10},{wch:13}],filename:'manaqasa-bids-'+new Date().toISOString().slice(0,10)+'.xlsx',sheet:'العروض',cellStyle:function(ri,ci,v){
    if(ci===6){var c={'مقبول':'16A34A','مرفوض':'DC2626','معلّق':'D97706'}[v];if(c)return{color:c,bold:true};}
    return null;
  }});
  if(ok)toast('تم تصدير ملف Excel ('+list.length+' عرض)','success');
  else{ downloadCSV(list.map(function(b){return {'المزود':b.provider_business||b.provider_name||'','المدينة':b.provider_city||'','المشروع':b.request_title||'','العميل':b.client_name||'','السعر':b.price||'','المدة':b.days||'','الحالة':(stLbl[b.status]||b.status||''),'التاريخ':b.created_at?new Date(b.created_at).toLocaleDateString('en-GB'):''};}),'manaqasa-bids-'+new Date().toISOString().slice(0,10)+'.csv'); }
}
function exportRequests(){
  var list=getFilteredRequests();
  if(!list.length){toast('لا توجد بيانات للتصدير','error');return;}
  if(!_xlsxReady(exportRequests))return;
  var stLbl={open:'مفتوح',in_progress:'قيد التنفيذ',completed:'مكتمل',pending_review:'مراجعة',review:'مراجعة'};
  var headers=['العنوان','التصنيف','المدينة','الميزانية','الحالة','عدد العروض','العميل','المزود المنفّذ','تاريخ النشر'];
  var rows=list.map(function(r){return [r.title||'',r.category||'',r.city||'',r.budget_max||'',(stLbl[r.status]||r.status||''),r.bid_count||0,r.client_name||'',r.provider_name||'—',r.created_at?new Date(r.created_at).toLocaleDateString('en-GB'):''];});
  var ok=_downloadXlsx(headers,rows,{cols:[{wch:28},{wch:14},{wch:13},{wch:11},{wch:13},{wch:10},{wch:18},{wch:16},{wch:13}],filename:'manaqasa-requests-'+new Date().toISOString().slice(0,10)+'.xlsx',sheet:'المشاريع',cellStyle:function(ri,ci,v){
    if(ci===4){var c={'مفتوح':'16A34A','قيد التنفيذ':'1E3A8A','مكتمل':'F0A500','مراجعة':'D97706'}[v];if(c)return{color:c,bold:true};}
    return null;
  }});
  if(ok)toast('تم تصدير ملف Excel ('+list.length+' مشروع)','success');
  else{ downloadCSV(list.map(function(r){return {'العنوان':r.title||'','التصنيف':r.category||'','المدينة':r.city||'','الميزانية':r.budget_max||'','الحالة':(stLbl[r.status]||r.status||''),'عدد العروض':r.bid_count||0,'العميل':r.client_name||'','التاريخ':r.created_at?new Date(r.created_at).toLocaleDateString('en-GB'):''};}),'manaqasa-requests-'+new Date().toISOString().slice(0,10)+'.csv'); }
}

var _cfResolve=null;
function askConfirm(opts){
  opts=opts||{};
  document.getElementById('cf-title').textContent=opts.title||'تأكيد';
  document.getElementById('cf-msg').textContent=opts.message||'هل أنت متأكد؟';
  var ok=document.getElementById('cf-ok');
  ok.textContent=opts.confirmText||'تأكيد';
  ok.className='cf-btn cf-confirm'+(opts.safe?' safe':'');
  document.getElementById('confirmOverlay').classList.add('show');
  return new Promise(function(res){_cfResolve=res;});
}
function cfClose(val){
  document.getElementById('confirmOverlay').classList.remove('show');
  if(_cfResolve){_cfResolve(val);_cfResolve=null;}
}

function updateOnline(){
  var bar=document.getElementById('offlineBar');if(!bar)return;
  if(navigator.onLine)bar.classList.remove('show');else bar.classList.add('show');
}
window.addEventListener('online',updateOnline);
window.addEventListener('offline',updateOnline);
updateOnline();

// ═══ سجل نشاط الإدارة ═══
var _allLogs=[];
var _logActions={
  delete_user:['حذف مستخدم','b-rej'],change_role:['تغيير دور','b-prog'],
  delete_bid:['حذف عرض','b-rej'],edit_bid:['تعديل عرض','b-prog'],
  ban_user:['إيقاف حساب','b-rej'],activate_user:['تفعيل حساب','b-done'],
  set_badge:['تغيير توثيق','b-prog'],delete_request:['حذف مشروع','b-rej'],
  delete_review:['حذف تقييم','b-rej'],delete_question:['حذف سؤال','b-rej'],update_settings:['تعديل الإعدادات','b-prog'],add_admin:['إضافة مشرف','b-done'],edit_admin:['تعديل مشرف','b-prog'],remove_admin:['إزالة مشرف','b-rej'],edit_user:['تعديل مستخدم','b-prog'],edit_request:['تعديل مشروع','b-prog'],review_request:['مراجعة مشروع','b-done'],complete_request:['إنهاء مشروع','b-done'],resolve_report:['معالجة بلاغ','b-done'],broadcast:['رسالة جماعية','b-done']
};
function loadLogs(){
  fetch(API+'/api/admin/logs',hdr()).then(function(r){return r.json();}).then(function(logs){
    if(!Array.isArray(logs)){document.getElementById('logs-table').innerHTML=emptyState('تعذر التحميل');return;}
    _allLogs=logs;renderLogs();
  }).catch(function(){document.getElementById('logs-table').innerHTML=emptyState('تعذر التحميل');});
}
function renderLogs(){
  var term=((document.getElementById('log-search')||{}).value||'').toLowerCase();
  var list=_allLogs.filter(function(l){
    if(!term)return true;
    var hay=((l.admin_name||'')+(l.details||'')+(l.action||'')).toLowerCase();
    return hay.indexOf(term)>=0;
  });
  if(!list.length){document.getElementById('logs-table').innerHTML=emptyState('لا يوجد نشاط مسجّل');return;}
  document.getElementById('logs-table').innerHTML='<table><thead><tr><th>المدير</th><th>الإجراء</th><th>التفاصيل</th><th>التاريخ</th></tr></thead><tbody>'+
    list.map(function(l){
      var act=_logActions[l.action]||[l.action,'b-completed'];
      var d=l.created_at?new Date(l.created_at):null;
      var dateStr=d?d.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory')+' · '+d.toLocaleTimeString('ar-SA-u-nu-latn-ca-gregory',{hour:'2-digit',minute:'2-digit'}):'';
      return '<tr>'+
        '<td><div class="u-name">'+esc(l.admin_name||'الإدارة')+'</div></td>'+
        '<td><span class="badge '+act[1]+'">'+act[0]+'</span></td>'+
        '<td style="font-size:12.5px;color:var(--text2)">'+esc(l.details||'—')+'</td>'+
        '<td style="font-size:12px;color:var(--muted);white-space:nowrap">'+dateStr+'</td>'+
        '</tr>';
    }).join('')+'</tbody></table>';
}


// ═══ يحتاج إجراء (لوحة المعلومات) ═══
function loadNeedsAction(){
  fetch(API+'/api/admin/analytics',hdr()).then(function(r){return r.json();}).then(function(a){
    window._analytics=a;renderNeedsAction(a.needs_action||{});
  }).catch(function(){});
}
function _niBtn(pg){var b=null;document.querySelectorAll('.ni').forEach(function(n){if((n.getAttribute('onclick')||'').indexOf("showPage('"+pg+"'")>=0)b=n;});return b;}
function _niGo(pg){showPage(pg,_niBtn(pg));}
// «شفته»: تختفي بطاقة التنبيه من اللوحة لين يجي شي جديد (القائمة نفسها تبقى)
var _adSeenAt={}, _FRESH=null;
function _adSeen(k){ var t=Date.now(); if(_adSeenAt[k]&&t-_adSeenAt[k]<20000)return; _adSeenAt[k]=t; if(_FRESH&&_FRESH[k==='bidrep'?'bid_report_providers':k]!=null){_FRESH[k==='bidrep'?'bid_report_providers':k]=0; if(k==='flags')_FRESH.flag_providers=0; _applyFresh();} try{fetch(API+'/api/admin/seen',Object.assign({method:'POST',body:JSON.stringify({k:k})},hdr())).then(function(){_loadFresh();}).catch(function(){});}catch(e){} }
// أرقام القائمة الجانبية = الجديد بس (منذ آخر مرة فتحت القسم)
function _loadFresh(){ fetch(API+'/api/admin/fresh',hdr()).then(function(r){return r.ok?r.json():null;}).then(function(f){ if(f){_FRESH=f;_applyFresh();} }).catch(function(){}); }
function _setBadge(id,n){ var b=document.getElementById(id); if(b){ n=parseInt(n)||0; b.textContent=n>999?'999+':n; b.style.display=n?'flex':'none'; } }
function _applyFresh(){ var f=_FRESH; if(!f)return; _setBadge('questions-badge',f.questions); _setBadge('reports-badge',f.reports); _setBadge('engagement-badge',f.engagement); try{_owBadge();}catch(e){} }
function renderNeedsAction(na){
  (function(){var b=document.getElementById('projreview-badge');if(b){var n=na.review||0;b.textContent=n;b.style.display=n?'flex':'none';}})();
  if(window.loadOwBadge)loadOwBadge();
  if(window.loadEngBadge)loadEngBadge();
  var el=document.getElementById('needs-action');if(!el)return;
  var chev='<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>';
  var items=[
    {label:'طلبات قيد المراجعة',sub:'بانتظار موافقتك على نشرها',n:na.review||0,pg:'projreview',navIdx:3,ic:'<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/>',c:'var(--amber)',bg:'var(--amber-l)'},
    {label:'بلاغات جديدة',sub:'تحتاج مراجعة وإجراء',n:na.reports||0,pg:'reports',navIdx:7,ic:'<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',c:'var(--red)',bg:'var(--red-l)'},
    {label:'مزودون بانتظار توثيق',sub:'راجع ملفاتهم وفعّل التوثيق',n:na.verify||0,pg:'users',navIdx:2,ic:'<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>',c:'var(--sky)',bg:'var(--accent-l)'},
    {label:'أسئلة بانتظار رد',sub:'عملاء ومزودون ينتظرون',n:na.questions||0,pg:'questions',navIdx:6,ic:'<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>',c:'var(--p)',bg:'var(--p-light)'}
  ];
  var active=items.filter(function(i){return i.n>0;});
  // تنبيه امتلاء التخزين: يظهر من 70٪، ويصير أحمر من 85٪
  var _st=na.storage||{};
  [['db','قاعدة البيانات',_st.dbPct,_st.dbMB,_st.dbCapMB],['r2','تخزين الملفات (R2)',_st.r2Pct,_st.r2MB,_st.r2CapMB]].forEach(function(x){
    var p=parseFloat(x[2])||0; if(p<70)return;
    var hot=p>=85;
    active.unshift({label:(hot?'🚨 ':'⚠️ ')+x[1]+' ممتلئة',n:p+'٪',sub:x[3]+' ميجا من '+Math.round((x[4]||0)/1000)+' جيجا — '+(hot?'وسّع القرص من Railway أو نظّف الآن قبل ما يتوقّف الموقع':'راقبها وخطّط للتوسعة أو التنظيف'),pg:'health',ic:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',c:hot?'#dc2626':'var(--amber)',bg:hot?'#fef2f2':'var(--amber-l)'});
  });
  if(_st.r2Connected===false)active.unshift({label:'🚨 تخزين الملفات R2 غير متصل',n:'',sub:'رفع الصور والملفات متوقّف — راجع مفاتيح R2 في Railway',pg:'health',ic:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',c:'#dc2626',bg:'#fef2f2'});
  if(!active.length){el.innerHTML='';return;}
  el.innerHTML='<div class="nudges"><div class="nudges-h"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> يحتاج انتباهك اليوم</div>'+
    active.map(function(i){
      return '<div class="nudge" style="border-right-color:'+i.c+'" onclick="_niGo(\''+i.pg+'\')">'+
        '<div class="nudge-ic" style="background:'+i.bg+';color:'+i.c+'"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">'+i.ic+'</svg></div>'+
        '<div class="nudge-body"><div class="nudge-t">'+i.n+' '+i.label+'</div><div class="nudge-s">'+i.sub+'</div></div>'+
        '<div class="nudge-cta" style="color:'+i.c+'">فتح '+chev+'</div></div>';
    }).join('')+'</div>';
}

// ═══ التحليلات ═══
function pct(cur,prev){ if(!prev) return {t:(cur>0?'+100%':'0%'),up:true}; var d=((cur-prev)/prev)*100; return {t:(d>=0?'+':'')+Math.round(d)+'%',up:d>=0}; }
function _kpiCard(label,val,color,bg,icon){
  return '<div class="kpi"><div class="kpi-top"><div class="kpi-ic" style="background:'+bg+'"><svg fill="none" stroke="'+color+'" stroke-width="2" viewBox="0 0 24 24">'+icon+'</svg></div></div><div class="kpi-v">'+val+'</div><div class="kpi-l">'+label+'</div></div>';
}
function _rankCard(title,items,unit){
  if(!items.length) return '<div class="card"><div class="card-head"><h3>'+title+'</h3></div><div class="card-body"><div style="color:var(--muted);font-size:13px;padding:14px 0;text-align:center">لا يوجد بيانات</div></div></div>';
  var max=Math.max.apply(null,items.map(function(x){return x.raw;}))||1;
  return '<div class="card"><div class="card-head"><h3>'+title+'</h3></div><div class="card-body">'+
    items.map(function(x,i){
      return '<div class="rank-row"><div class="rank-num">'+(i+1)+'</div><div class="rank-name">'+esc(x.name||'—')+'</div><div class="rank-bar-wrap"><div class="rank-bar" style="width:'+Math.round((x.raw/max)*100)+'%"></div></div><div class="rank-val">'+x.val+(unit?' '+unit:'')+'</div></div>';
    }).join('')+'</div></div>';
}
function _compareBlock(tm,lm){
  var rows=[
    {l:'مستخدمون جدد',c:tm.users||0,p:lm.users||0,money:false},
    {l:'مشاريع جديدة',c:tm.requests||0,p:lm.requests||0,money:false},
    {l:'عروض جديدة',c:tm.bids||0,p:lm.bids||0,money:false},
    {l:'الإيرادات',c:tm.revenue||0,p:lm.revenue||0,money:true}
  ];
  return '<div class="card"><div class="card-head"><h3>هذا الشهر مقابل الشهر السابق</h3></div><div class="card-body" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:14px">'+
    rows.map(function(r){
      var ch=pct(r.c,r.p);
      return '<div style="padding:14px;border:1px solid var(--border);border-radius:12px"><div style="font-size:12.5px;color:var(--muted);margin-bottom:6px">'+r.l+'</div><div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap"><div style="font-size:22px;font-weight:800;color:var(--text);letter-spacing:-1px">'+(r.money?fmtN(Math.round(r.c)):r.c)+(r.money?' ر.س':'')+'</div><span class="chart-badge '+(ch.up?'up':'down')+'" style="font-size:11px;padding:3px 9px">'+(ch.up?'\u25B2':'\u25BC')+' '+ch.t+'</span></div><div style="font-size:11px;color:var(--hint);margin-top:4px">السابق: '+(r.money?fmtN(Math.round(r.p))+' ر.س':r.p)+'</div></div>';
    }).join('')+'</div></div>';
}
function _funnelBlock(f){
  var stages=[
    {l:'طلبات منشورة',n:f.requests||0,c:'var(--p)'},
    {l:'عروض مقدّمة',n:f.bids||0,c:'var(--accent)'},
    {l:'عروض مقبولة',n:f.accepted||0,c:'var(--gold-d)'},
    {l:'صفقات مكتملة',n:f.completed||0,c:'var(--green)'}
  ];
  var max=stages[0].n||1;
  return '<div class="card"><div class="card-head"><h3>قمع التحويل</h3><span style="font-size:12px;color:var(--muted)">من طلب إلى صفقة مكتملة</span></div><div class="card-body">'+
    stages.map(function(s,i){
      var w=Math.max(4,Math.round((s.n/max)*100));
      var conv=(i>0&&stages[i-1].n)?Math.round((s.n/stages[i-1].n)*100):null;
      return '<div style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><span style="font-size:13px;font-weight:700;color:var(--text)">'+s.l+'</span><span style="font-size:13px;font-weight:800;color:var(--text)">'+s.n+(conv!=null?' <span style="font-size:11px;color:var(--muted);font-weight:600">('+conv+'%)</span>':'')+'</span></div><div style="height:12px;background:var(--bg);border-radius:7px;overflow:hidden"><div style="height:100%;width:'+w+'%;background:'+s.c+';border-radius:7px;transition:.6s cubic-bezier(.4,0,.2,1)"></div></div></div>';
    }).join('')+'</div></div>';
}
function _revChart(data){
  if(!data.length) return '';
  var monthsAr=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var max=Math.max.apply(null,data.map(function(d){return d.revenue;}))||1;
  return '<div class="card"><div class="card-head"><h3>الإيرادات الشهرية</h3><span style="font-size:12px;color:var(--muted)">آخر 6 أشهر · قيمة العروض المقبولة</span></div><div class="card-body"><div class="chart-bars" style="min-height:200px">'+
    data.map(function(d){
      var h=Math.max(4,Math.round((d.revenue/max)*150));
      var m=parseInt(d.period.split('-')[1])-1;
      var lbl=d.revenue>=1000?(Math.round(d.revenue/100)/10)+'ك':Math.round(d.revenue);
      return '<div class="chart-col"><div class="chart-v">'+lbl+'</div><div class="chart-bar" style="height:'+h+'px" title="'+fmtN(Math.round(d.revenue))+' ر.س · '+(d.deals||0)+' صفقة"></div><div class="chart-d">'+(monthsAr[m]||'')+'</div></div>';
    }).join('')+'</div></div></div>';
}
function _dashDonut(segments,centerVal,centerLbl,title){
  var size=88,sw=11,r=(size-sw)/2,cx=size/2,cy=size/2,circ=2*Math.PI*r;
  var total=segments.reduce(function(a,x){return a+x.v;},0)||1;
  var off=0,arcs='';
  segments.forEach(function(x){
    var len=(x.v/total)*circ;
    arcs+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="'+x.c+'" stroke-width="'+sw+'" stroke-dasharray="'+len+' '+(circ-len)+'" stroke-dashoffset="'+(-off)+'" transform="rotate(-90 '+cx+' '+cy+')" stroke-linecap="round"/>';
    off+=len;
  });
  var leg=segments.map(function(x){return '<div class="dleg"><span class="dleg-dot" style="background:'+x.c+'"></span><span class="dleg-label">'+x.l+'</span><span class="dleg-val">'+x.v+'</span></div>';}).join('');
  return '<div class="donut-card"><div class="donut-svg"><svg width="'+size+'" height="'+size+'"><circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--bg)" stroke-width="'+sw+'"/>'+arcs+'</svg><div class="donut-center"><div class="dv">'+centerVal+'</div><div class="dl">'+centerLbl+'</div></div></div><div class="donut-legend"><div class="donut-title">'+title+'</div>'+leg+'</div></div>';
}
function _signupChartSVG(data){
  if(!data||!data.length) return '<div style="margin:auto;color:var(--muted);font-size:13px;padding:40px;text-align:center">لا توجد بيانات</div>';
  var max=Math.max.apply(null,data.map(function(d){return d.n;}))||1;
  var W=520,H=190,padX=24,padT=28,padB=34,n=data.length;
  var stepX=(W-padX*2)/(Math.max(1,n-1));
  var pts=data.map(function(d,i){return {x:padX+i*stepX,y:H-padB-((d.n/max)*(H-padT-padB)),n:d.n,label:d.label};});
  function smooth(pp){if(pp.length<2)return pp.length?'M'+pp[0].x+','+pp[0].y:'';var dd='M'+pp[0].x+','+pp[0].y;for(var i=0;i<pp.length-1;i++){var c=(pp[i].x+pp[i+1].x)/2;dd+=' C'+c+','+pp[i].y+' '+c+','+pp[i+1].y+' '+pp[i+1].x+','+pp[i+1].y;}return dd;}
  var grid='';for(var g=0;g<=3;g++){var gy=padT+(H-padT-padB)*g/3;grid+='<line x1="'+padX+'" y1="'+gy+'" x2="'+(W-padX)+'" y2="'+gy+'" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>';}
  var line=smooth(pts);
  var area=line+' L'+pts[n-1].x+','+(H-padB)+' L'+pts[0].x+','+(H-padB)+' Z';
  var dots=pts.map(function(pp){return '<circle cx="'+pp.x+'" cy="'+pp.y+'" r="4.5" fill="#fff" stroke="var(--accent)" stroke-width="2.5"><title>'+pp.label+': '+pp.n+'</title></circle>';}).join('');
  var labels=pts.map(function(pp){return '<text x="'+pp.x+'" y="'+(H-12)+'" text-anchor="middle" font-size="10.5" fill="var(--muted)" font-family="Tajawal" font-weight="600">'+pp.label+'</text>';}).join('');
  var vlabels=pts.map(function(pp){return pp.n>0?'<text x="'+pp.x+'" y="'+(pp.y-11)+'" text-anchor="middle" font-size="11" font-weight="800" fill="var(--p)" font-family="Tajawal">'+pp.n+'</text>':'';}).join('');
  return '<svg viewBox="0 0 '+W+' '+H+'" width="100%" preserveAspectRatio="xMidYMid meet" style="overflow:visible"><defs><linearGradient id="anAreaG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0.01"/></linearGradient></defs>'+grid+'<path d="'+area+'" fill="url(#anAreaG)"/><path d="'+line+'" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>'+dots+labels+vlabels+'</svg>';
}
function _statsVisuals(s){
  if(!s)return '';
  var clients=s.clients||0,provs=s.providers||0;
  var inprog=s.in_progress||0,done=s.completed||0,openP=(s.requests||0)-inprog-done;
  var donuts='<div class="donut-row">'+
    _dashDonut([{l:'عملاء',v:clients,c:'var(--accent)'},{l:'مزودون',v:provs,c:'var(--p)'}],(clients+provs),'مستخدم','توزيع المستخدمين')+
    _dashDonut([{l:'مفتوحة',v:openP>0?openP:0,c:'var(--green)'},{l:'جارية',v:inprog,c:'var(--blue)'},{l:'مكتملة',v:done,c:'var(--muted)'}],(s.requests||0),'مشروع','حالة المشاريع')+
    _dashDonut([{l:'موثّقون',v:s.verified||0,c:'var(--star)'},{l:'غير موثّق',v:Math.max(0,provs-(s.verified||0)),c:'var(--p-mid)'}],(s.verified||0),'موثّق','توثيق المزودين')+
  '</div>';
  var days=['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
  var dd=(s.daily_signups||[]).map(function(d){var lbl='';try{lbl=days[new Date(d.day).getDay()];}catch(e){}return {n:(d.users!=null?d.users:d.n)||0,label:lbl};});
  var chart='<div class="card"><div class="card-head"><h3>نمو التسجيلات</h3><span style="font-size:12px;color:var(--muted)">يومي · مستخدمون جدد</span></div><div class="card-body"><div class="chart-bars">'+_signupChartSVG(dd)+'</div></div></div>';
  return donuts+chart;
}
function loadAnalytics(){
  var box=document.getElementById('analytics-body');if(box)box.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  Promise.all([
    fetch(API+'/api/admin/analytics',hdr()).then(function(r){return r.json();}),
    fetch(API+'/api/admin/stats',hdr()).then(function(r){return r.json();}).catch(function(){return {};})
  ]).then(function(res){
    window._analytics=res[0];renderAnalytics(res[0],res[1]||{});
  }).catch(function(){if(box)box.innerHTML=emptyState('تعذر تحميل التحليلات');});
}
function _tierDistroCard(rows){
  rows=rows||[];
  if(!rows.length)return '';
  var total=rows.reduce(function(s,r){return s+(r.n||0);},0)||1;
  var COL={new:['#64748b','#f1f5f9'],active:['#9a6a2e','#f6ead9'],distinguished:['#5b6b7d','#eceff3'],expert:['#97710d','#fdf1cf']};
  var star='<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/></svg>';
  var cells=rows.map(function(r){
    var c=COL[r.key]||['#64748b','#f1f5f9'];
    var pct=Math.round((r.n||0)/total*100);
    return '<div style="flex:1;min-width:0;background:var(--white);border:1px solid var(--border);border-radius:13px;padding:14px 10px;text-align:center">'
      +'<div style="width:34px;height:34px;border-radius:9px;background:'+c[1]+';color:'+c[0]+';display:flex;align-items:center;justify-content:center;margin:0 auto 8px">'+star+'</div>'
      +'<div style="font-family:\'Cairo\',sans-serif;font-size:22px;font-weight:900;color:'+c[0]+';line-height:1">'+(r.n||0)+'</div>'
      +'<div style="font-size:11px;color:var(--muted);font-weight:700;margin-top:3px">'+r.label+'</div>'
      +'<div style="font-size:10px;color:var(--hint);margin-top:1px">'+pct+'%</div>'
    +'</div>';
  }).join('');
  return '<div class="card"><div class="card-head"><h3>توزيع مستويات المزودين</h3><span style="font-size:12px;color:var(--muted)">'+total+' مزوّد</span></div><div class="card-body"><div style="display:flex;gap:10px;flex-wrap:wrap">'+cells+'</div></div></div>';
}
function renderAnalytics(a,statsData){
  var box=document.getElementById('analytics-body');if(!box)return;
  var rev=a.revenue||{},f=a.funnel||{},tm=a.this_month||{},lm=a.last_month||{};
  var html='';
  html+='<div class="kpi-grid">'+
    _kpiCard('إجمالي قيمة الصفقات',fmtN(Math.round(rev.total||0))+' ر.س','var(--green)','var(--green-l)','<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>')+
    _kpiCard('متوسط قيمة الصفقة',fmtN(Math.round(rev.avg||0))+' ر.س','var(--p)','var(--p-light)','<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>')+
    _kpiCard('صفقات مكتملة',(rev.deals||0),'var(--gold-d)','var(--gold-l)','<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>')+
  '</div>';
  html+=_compareBlock(tm,lm);
  html+='<div class="dash-2col">'+_funnelBlock(f)+_revChart(a.revenue_monthly||[])+'</div>';
  html+='<div class="dash-2col">'+
    _rankCard('أكثر المزودين دخلاً',(a.top_earners||[]).map(function(x){return {name:x.name,val:fmtN(Math.round(x.earnings||0)),raw:x.earnings||0};}),'ر.س')+
    _rankCard('أكثر المزودين نشاطاً',(a.top_active||[]).map(function(x){return {name:x.name,val:(x.bids||0),raw:x.bids||0};}),'عرض')+
  '</div>';
  html+='<div class="dash-2col">'+
    _rankCard('توزيع المشاريع حسب المدينة',(a.by_city||[]).map(function(x){return {name:x.city,val:x.n,raw:x.n};}),'')+
    _rankCard('توزيع المشاريع حسب الفئة',(a.by_category||[]).map(function(x){return {name:x.category,val:x.n,raw:x.n};}),'')+
  '</div>';
  html+=_tierDistroCard(a.by_tier||[]);
  html+=_statsVisuals(statsData||{});
  box.innerHTML=html;
}

// ═══ إعدادات المنصة ═══
function loadMarketing(){ loadPixels(); loadMkStats(); loadReminders(); loadRange('day'); loadChart(30); }
var _healthTimer=null;
/* ═══════════ محرّك الاستقطاب ═══════════ */
var _ORT='provider', _OQ=[], _OQi=0, _OSearch=[];
var _OSTAT={new:'لم يُتواصل',contacted:'أُرسلت',replied:'ردّ',interested:'مهتم',converted:'سجّل ✅',rejected:'رفض',followup:'متابعة'};

/* ═══════════ متابعة العملاء — قائمة عمل يومية مرتّبة بالأولوية ═══════════ */
var _fuData=null, _fuTab='few';
var _fuStage='', _fuFilter='due', _fuQ='', _fuCity='', _fuSort='prio', _fuDet={}, _fuCur=null;
var FU_STAGES=[
  {k:'few',label:'عروض قليلة',bg:'#ecfeff',fg:'#0e7490'},
  {k:'offers',label:'وصلته عروض',bg:'#eef3ff',fg:'#1e3a8a'},
  {k:'delayed',label:'تأخر الاختيار',bg:'#fff7ed',fg:'#c2410c'},
  {k:'executing',label:'قيد التنفيذ',bg:'#f5f3ff',fg:'#6d28d9'},
  {k:'review',label:'بانتظار التقييم',bg:'#ecfdf5',fg:'#047857'}
];
var FU_OUT={replied:'ردّ وبيختار قريب',no_reply:'ما ردّ',needs_time:'يبي وقت',outside:'اتفق برا المنصة',postponed:'أجّل المشروع'};
function _fuSt(k){ return FU_STAGES.filter(function(s){return s.k===k;})[0]||{label:k,bg:'#f1f5f9',fg:'#475569'}; }
function _fuPill(t,bg,fg){ return '<span style="font-size:11px;font-weight:900;padding:4px 10px;border-radius:999px;white-space:nowrap;display:inline-block;background:'+bg+';color:'+fg+'">'+t+'</span>'; }
function _fuN(n,one,two,few,many){ n=n||0; if(n===1)return one; if(n===2)return two; if(n===0||(n>=3&&n<=10))return n+' '+few; return n+' '+(many||one.replace(/ واحد(ة)?$/,'')); }
function _fuDate(iso){ if(!iso)return ''; var d=_fuD(iso); return 'نُشر '+new Date(iso).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short'})+' · '+(d===0?'اليوم':d===1?'أمس':'قبل '+_fuN(d,'يوم','يومين','أيام','يوم')); }
function _fuD(iso){ if(!iso)return null; return Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/86400000)); }
function _fuAgo(iso){ var d=_fuD(iso); if(d===null)return ''; if(d<=0)return 'اليوم'; if(d===1)return 'أمس'; if(d===2)return 'قبل يومين'; return 'قبل '+d+' أيام'; }
function _fuLink(p){ return 'https://manaqasa.com/project/x-'+p.id+'?id='+p.id; }
function _fuAll(){ var out=[]; if(!_fuData)return out; FU_STAGES.forEach(function(s){ (_fuData[s.k]||[]).forEach(function(p){ p.stage=s.k; out.push(p); }); }); return out; }
function _fuFind(id){ var a=_fuAll().concat((_fuData&&_fuData.moved)||[]); for(var i=0;i<a.length;i++){ if(a[i].id===id)return a[i]; } return null; }
// الأولوية + السبب
function _fuInfo(p){
  var age=_fuD(p.created_at)||0, since=_fuD(p.reminder_at), n=p.bid_count||0, ue=p.unseen_bids||0, um=p.unread_msgs||0;
  var snoozed=!!(p.followup_snooze_until&&new Date(p.followup_snooze_until)>new Date());
  var why=[], hot=false, need=true;
  if(p.stage==='few'){ why.push('<b>'+(n?_fuN(n,'عرض واحد','عرضين','عروض'):'بدون عروض')+'</b> '+(age===0?'من اليوم':'خلال '+_fuN(age,'يوم','يومين','أيام','يوم'))); if(age<1)need=false; if(age>=3&&!n){hot=true;why.push('<span style="color:#c2410c">يحتاج تفاصيل أوضح أو مخطط</span>');} }
  else if(p.stage==='offers'||p.stage==='delayed'){
    why.push('<b>'+_fuN(n,'عرض واحد','عرضين','عروض')+'</b>');
    if(ue>0){ why.push('<span style="color:#b91c1c">'+(ue>=n?'ما فتح العروض أبداً':_fuN(ue,'عرض','عرضين','عروض')+' ما شافها')+'</span>'); hot=true; }
    else if(p.last_seen_bids_at){ why.push('<span style="color:#c2410c">فتح العروض '+_fuAgo(p.last_seen_bids_at)+' وما اختار</span>'); if(p.stage==='delayed')hot=true; }
  }
  else if(p.stage==='executing'){ var ex=_fuD(p.assigned_at)||0; why.push('<b>'+ex+' يوم في التنفيذ</b>'); why.push('ما حدّث الحالة'); if(ex>=21)hot=true; }
  else if(p.stage==='review'){ var cd=_fuD(p.completed_at||p.created_at)||0; why.push('<b>اكتمل '+(cd===0?'اليوم':'قبل '+cd+' يوم')+'</b>'); why.push('ما قيّم المزوّد'); }
  if(um>0){ why.push('<span style="color:#b91c1c">'+_fuN(um,'رسالة','رسالتين','رسائل')+' من مزوّدين ما قرأها</span>'); hot=true; }
  var ul=p.unlocks||0;
  if(ul>0&&(p.stage==='offers'||p.stage==='delayed'||p.stage==='few')){ why.unshift('<span style="color:#0f766e">📞 '+(ul===1?'مزوّد أخذ رقمه':(ul===2?'مزوّدين أخذوا رقمه':ul+' مزوّدين أخذوا رقمه'))+' — يتواصلون معه</span>'); hot=false; need=false; }
  else if((p.silent_stage||0)>=1&&(p.stage==='offers'||p.stage==='delayed'||p.stage==='few')) why.push('<span style="color:#be123c">'+((p.silent_stage||0)>=3?'⏳ وصلته الرسالة الأخيرة — بينقفل تلقائياً':'🤖 وصله تذكير تلقائي بالأرقام')+'</span>');
  var level;
  if(snoozed||!need) level='later';
  else if(since===null) level=(hot||age>=2)?'now':'today';
  else if(since>=3) level=hot?'now':'today';
  else level='later';
  var nextIn=snoozed?Math.max(1,Math.ceil((new Date(p.followup_snooze_until)-Date.now())/86400000)):(since!==null&&since<3?3-since:0);
  return {level:level, why:why, hot:hot, snoozed:snoozed, nextIn:nextIn, since:since, age:age};
}
var _FU_RANK={now:0,today:1,later:2};
function _fuNextHtml(i){
  if(i.level==='now')return _fuPill('الآن','#fef2f2','#b91c1c');
  if(i.level==='today')return _fuPill('اليوم','#fff7ed','#c2410c');
  return _fuPill(i.snoozed?('مؤجّل '+i.nextIn+' ي'):(i.nextIn?'بعد '+(i.nextIn===1?'يوم':i.nextIn===2?'يومين':i.nextIn+' أيام'):'لاحقاً'),'#f1f5f9','#475569');
}
function _fuDotC(l){ return l==='now'?'#dc2626':(l==='today'?'#f59e0b':'#cbd5e1'); }
// ── الرسائل ──
function _fuPrice(b){ var p=Math.round(parseFloat(b.price)||0).toLocaleString('en-US'); var u=b.price_unit&&b.price_unit!=='total'?(b.price_unit==='meter'?' للمتر':' للوحدة'):''; return p+' ر.س'+u; }
function _fuKinds(p){
  var ue=p.unseen_bids||0, um=p.unread_msgs||0, k=[];
  if(p.stage==='few'){ k.push((p.bid_count||0)?'few':'few0'); k.push('help'); }
  else if(p.stage==='offers'||p.stage==='delayed'){
    if(ue&&um)k.push('unseen_unread'); if(ue)k.push('unseen'); if(um)k.push('unread');
    k.push('friendly'); k.push('help');
  }
  else if(p.stage==='executing'){ k.push('executing'); if(um)k.push('unread'); }
  else { k.push('review'); }
  var seen={}; return k.filter(function(x){ if(seen[x])return false; seen[x]=1; return true; });
}
var FU_KIND_LBL={unseen_unread:'عروض ورسائل ما شافها',unseen:'عروض ما شافها',unread:'رسائل ما قرأها',top3:'مع أفضل 3 عروض',friendly:'ودّية قصيرة',help:'عرض مساعدة',few0:'بدون عروض — أضف تفاصيل',few:'عروض قليلة',executing:'تحديث التنفيذ',review:'طلب التقييم'};
function _fuMsg(p,kind,det){
  // بدون أسعار وبدون تقييمات، وبدون إيموجي (تطلع � في واتساب الكمبيوتر). الرابط = صفحة تسجيل الدخول (العميل يسجّل دخوله بنفسه)
  var nm=(p.client_name&&p.client_name!=='عميل')?' '+p.client_name:'', t=p.title||'مشروعك', n=p.bid_count||0, ue=p.unseen_bids||0, um=p.unread_msgs||0;
  var L='https://manaqasa.com/auth.html';
  var go='\nسجّل دخولك للمنصة من هنا:\n'+L;
  var hi='السلام عليكم'+nm+'\n';
  var offers=function(x){ return _fuN(x,'عرض سعر واحد','عرضين','عروض أسعار','عرض سعر'); };
  // الإجمالي أولاً، وبعده كم منها ما شافه (عشان ما يفهم إن كل اللي وصله هو اللي ما شافه)
  var unseenTxt=function(){ return ''; }; // نذكر العدد الكامل فقط
  var msgs=function(x){ return _fuN(x,'رسالة من مزوّد','رسالتين من مزوّدين','رسائل من مزوّدين','رسالة من مزوّدين'); };
  var ask=function(x){ return 'توجد محادثات من منفّذين يرغبون بالتواصل معك، اطّلع عليها في قسم المحادثات — بانتظار ردّك.'; };
  if(kind==='unseen_unread') return hi+'مشروعك «'+t+'» وصله '+offers(n)+unseenTxt()+'.\n'+ask(um)+'\nكل ما تأخر الرد ممكن تتغيّر العروض.'+go;
  // أي رسالة ثانية: إذا عنده رسائل ما قرأها نضيف سطر الاستفسارات قبل الرابط
  var extra=(um>0&&kind!=='unseen_unread'&&kind!=='unread')?'\n'+ask(um):'';
  go=extra+go;
  if(kind==='unseen') return hi+'وصلك '+offers(n)+' على مشروعك «'+t+'»'+unseenTxt()+'.\nقارن العروض ومدة التنفيذ واختر اللي يناسبك.'+go;
  if(kind==='unread') return hi+'بخصوص مشروعك «'+t+'»:\n'+ask(um)+'\nردّك يساعدهم يعطونك عرض أدق.'+go;

  if(kind==='friendly') return hi+'ما زالت العروض متاحة على مشروعك «'+t+'» ('+offers(n)+').\nاختر المزوّد الأنسب للانتقال للتنفيذ، فبعض العروض قد تتغيّر مع الوقت.'+go;
  if(kind==='help') return hi+'معك فريق منصة مناقصة بخصوص مشروعك «'+t+'».\nإذا محتار بين العروض أو تحتاج مساعدة في المقارنة أو تعديل تفاصيل المشروع، رد علينا هنا ونساعدك.'+go;
  if(kind==='few0') return hi+'كلما كانت تفاصيل المشروع أوضح، زادت فرص الحصول على عروض دقيقة ومنافسة.\nمشروعك «'+t+'» لم يستقبل عروضًا حتى الآن، لذلك ننصح بإضافة أي تفاصيل أو صور أو مخططات متاحة لمساعدة المزوّدين على التسعير.'+go;
  if(kind==='few') return hi+'مشروعك «'+t+'» استقبل '+offers(n)+' حتى الآن.\nإذا ناسبك أحدها تقدر تقبله مباشرة، وإن رغبت بعروض أكثر أضف تفاصيل أو ملفات أوضح.'+go;
  if(kind==='executing') return hi+'نأمل أن أعمال مشروعك «'+t+'» تسير كما هو مخطط لها.\nفي حال تم الانتهاء من التنفيذ، يرجى تحديث حالة المشروع إلى مكتمل من لوحة التحكم.'+go;
  return hi+'تم الانتهاء من مشروعك «'+t+'» بنجاح.\nنسعد بمشاركتك لتجربتك عبر تقييم المزوّد، فملاحظاتك تساعد أصحاب المشاريع الآخرين على اتخاذ قرارات أفضل.'+go;
}
function _fuDetail(id,cb){ if(_fuDet[id]){cb(_fuDet[id]);return;} fetch(API+'/api/admin/followups/'+id,hdr()).then(function(r){return r.json();}).then(function(d){ _fuDet[id]=d||{}; cb(_fuDet[id]); }).catch(function(){ cb({}); }); }
function _fuPhone(p){ var ph=String(p.client_phone||'').replace(/[^0-9]/g,''); if(!ph)return ''; if(ph.indexOf('966')!==0){ ph=ph.replace(/^0+/,''); ph='966'+ph; } return ph; }
function _fuSend(id,text,after){
  var p=_fuFind(id); if(!p)return;
  var ph=_fuPhone(p); if(!ph){ toast('لا يوجد رقم جوال لهذا العميل','error'); return; }
  window.open('https://wa.me/'+ph+'?text='+encodeURIComponent(text),'_blank');
  fetch(API+'/api/admin/requests/'+id+'/mark-reminded',Object.assign({method:'POST',body:JSON.stringify({stage:p.stage})},hdr())).then(function(r){return r.json();}).then(function(){
    p.reminder_at=new Date().toISOString(); p.reminder_stage=p.stage; p.reminder_count=(p.reminder_count||0)+1; p.followup_snooze_until=null;
    if(_fuData.kpi)_fuData.kpi.sent_today=(_fuData.kpi.sent_today||0)+1; delete _fuDet[id];
    renderFollowups(); if(after)after();
  }).catch(function(){ toast('انفتح واتساب — لكن تعذّر تسجيل التذكير','error'); });
}
function _fuSnooze(id,days){
  fetch(API+'/api/admin/requests/'+id+'/followup-snooze',Object.assign({method:'POST',body:JSON.stringify({days:days})},hdr())).then(function(r){return r.json();}).then(function(d){
    if(!d||!d.ok){toast('تعذّر التأجيل','error');return;}
    var p=_fuFind(id); if(p)p.followup_snooze_until=days?new Date(Date.now()+days*86400000).toISOString():null;
    toast(days?('تأجّل التذكير '+(days===1?'يوم':days+' أيام')):'رجع للقائمة','success'); renderFollowups(); if(_fuCur===id)_fuOpen(id);
  }).catch(function(){ toast('تعذّر التأجيل','error'); });
}
function _fuOutcome(id,o,btn){
  fetch(API+'/api/admin/requests/'+id+'/followup-outcome',Object.assign({method:'POST',body:JSON.stringify({outcome:o})},hdr())).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});}).then(function(x){
    if(!x.ok){ toast((x.d&&x.d.message)||'تعذّر الحفظ','error'); return; }
    toast('تم تسجيل النتيجة: '+FU_OUT[o],'success'); delete _fuDet[id];
    if(o==='outside'||o==='postponed'){ _fuSnooze(id,14); } else if(o==='needs_time'){ _fuSnooze(id,5); } else if(_fuCur===id){ _fuOpen(id); }
  }).catch(function(){ toast('تعذّر الحفظ','error'); });
}
// ── التحميل والعرض ──
function loadFollowups(){
  var b=document.getElementById('followup-body'); if(b&&!_fuData)b.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/followups',hdr()).then(function(r){return r.json();}).then(function(d){ _fuData=d||{}; _fuDet={}; renderFollowups(); })
    .catch(function(){ if(b)b.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">تعذّر التحميل</div>'; });
}
function _fuList(){
  var all=_fuAll(), q=(_fuQ||'').trim().toLowerCase(), qd=(typeof _phNorm==='function')?_phNorm(q):'';
  if(_fuFilter==='moved') all=((_fuData&&_fuData.moved)||[]).map(function(p){ p.stage=p.stage||'moved'; return p; });
  return all.filter(function(p){
    var i=p._i=(p.stage==='moved'?{level:'later',why:[],nextIn:0}:_fuInfo(p));
    if(_fuStage&&p.stage!==_fuStage)return false;
    if(_fuCity&&p.city!==_fuCity)return false;
    if(q){ var hit=(p.title||'').toLowerCase().indexOf(q)>=0||(p.client_name||'').toLowerCase().indexOf(q)>=0||(qd.length>=3&&typeof _phNorm==='function'&&_phNorm(p.client_phone).indexOf(qd)>=0)||String(p.id)===q.replace('#',''); if(!hit)return false; }
    if(_fuFilter==='due')return i.level!=='later';
    if(_fuFilter==='never')return !p.reminder_at;
    if(_fuFilter==='nomove')return !!p.reminder_at;
    if(_fuFilter==='unseen')return (p.unseen_bids||0)>0;
    if(_fuFilter==='unread')return (p.unread_msgs||0)>0;
    if(_fuFilter==='phone')return (p.unlocks||0)>0;
    return true;
  }).sort(function(a,b){
    if(_fuSort==='old')return new Date(a.created_at)-new Date(b.created_at);
    if(_fuSort==='new')return new Date(b.created_at)-new Date(a.created_at);
    var r=_FU_RANK[a._i.level]-_FU_RANK[b._i.level]; if(r)return r;
    var h=(b._i.hot?1:0)-(a._i.hot?1:0); if(h)return h;
    return (b._i.age||0)-(a._i.age||0);
  });
}
function _fuQueue(){ return _fuAll().filter(function(p){ p._i=_fuInfo(p); return p._i.level!=='later'; }).sort(function(a,b){ var r=_FU_RANK[a._i.level]-_FU_RANK[b._i.level]; if(r)return r; var h=(b._i.hot?1:0)-(a._i.hot?1:0); if(h)return h; return (b._i.age||0)-(a._i.age||0); }); }
function renderFollowups(){
  var b=document.getElementById('followup-body'); if(!b||!_fuData)return;
  var all=_fuAll(); all.forEach(function(p){ p._i=_fuInfo(p); });
  var due=all.filter(function(p){return p._i.level!=='later';}), late=due.filter(function(p){return p._i.age>7;}).length;
  var k=_fuData.kpi||{}, sent=k.sent_today||0, rate=k.reminded_30?Math.round((k.moved_30||0)/k.reminded_30*100):null;
  var c=function(f){ return all.filter(f).length; };
  var focusEl=document.activeElement, hadQ=focusEl&&focusEl.id==='fu-q', qPos=hadQ?focusEl.selectionStart:0;
  var h='';
  // الرأس
  h+='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px">'
    +'<div style="font-size:13px;color:var(--muted);font-weight:700">مين يحتاج تذكير اليوم — ومين تحرّك بعد التذكير</div>'
    +'<div style="margin-right:auto;display:flex;gap:8px;align-items:center;flex-wrap:wrap">'
    +'<input id="fu-q" value="'+esc(_fuQ)+'" oninput="_fuQ=this.value;renderFollowups()" placeholder="ابحث بالاسم أو الجوال أو المشروع…" style="width:260px;max-width:100%;border:1.5px solid var(--border);background:var(--card);color:var(--text);border-radius:11px;padding:10px 13px;font-family:inherit;font-size:13px;outline:none">'
    +'<button onclick="_fuQuick()" '+(due.length?'':'disabled ')+'style="border:0;background:'+(due.length?'#1d4ed8':'#94a3b8')+';color:#fff;border-radius:11px;padding:11px 16px;font-family:inherit;font-weight:900;font-size:13.5px;cursor:pointer;box-shadow:0 8px 20px rgba(29,78,216,.22)">⚡ الإرسال السريع · '+due.length+'</button>'
    +'</div></div>';
  // المؤشرات
  var kp=function(lbl,val,sub,st){ return '<div style="flex:1;min-width:170px;background:var(--card);border:1px solid '+(st||'var(--border)')+';border-radius:15px;padding:13px 15px;display:flex;flex-direction:column;gap:5px"><div style="font-size:12px;font-weight:800;color:var(--muted)">'+lbl+'</div><div style="font-family:Cairo,sans-serif;font-size:26px;font-weight:900;line-height:1.1">'+val+'</div>'+sub+'</div>'; };
  h+='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">'
    +kp('يحتاج تذكير الآن','<span style="color:#b91c1c">'+due.length+'</span>','<div style="font-size:12px;font-weight:800;color:'+(late?'#b91c1c':'var(--muted)')+'">'+(late?late+' منها عمرها أكثر من أسبوع':'ما فيه متأخر كثير 👍')+'</div>','#fecaca')
    +kp('أُرسل اليوم',sent+' <span style="font-size:14px;color:var(--muted)">/ '+(sent+due.length)+'</span>','<div style="height:7px;border-radius:7px;background:var(--border)"><div style="width:'+((sent+due.length)?Math.round(sent/(sent+due.length)*100):0)+'%;height:7px;border-radius:7px;background:#1d4ed8"></div></div>')
    +kp('تحرّكوا بعد التذكير <span style="color:#94a3b8">· 30 يوم</span>','<span style="color:#15803d">'+(rate===null?'—':rate+'%')+'</span>','<div style="font-size:12px;font-weight:800;color:var(--muted)">'+(k.reminded_30?(k.moved_30||0)+' من '+k.reminded_30+' اختاروا مزوّد خلال 3 أيام':'يبدأ الحساب مع أول تذكير')+'</div>')
    +kp('ترسيات بعد تذكير <span style="color:#94a3b8">· 30 يوم</span>',(k.awarded_30||0),'<div style="font-size:12px;font-weight:800;color:#15803d">'+(k.awarded_total_30?'≈ '+Math.round(k.awarded_total_30).toLocaleString('en-US')+' ر.س قيمة عقود':'—')+'</div>')
    +'</div>';
  // المراحل
  h+='<div style="display:flex;gap:6px;align-items:stretch;margin-bottom:14px;overflow-x:auto">';
  FU_STAGES.forEach(function(s,ix){
    var n=(_fuData[s.k]||[]).length, dn=all.filter(function(p){return p.stage===s.k&&p._i.level!=='later';}).length, on=_fuStage===s.k;
    if(ix)h+='<span style="color:#9fb0cc;font-size:17px;font-weight:900;align-self:center">←</span>';
    h+='<button onclick="_fuStage=(_fuStage===\''+s.k+'\'?\'\':\''+s.k+'\');renderFollowups()" style="flex:1;min-width:128px;text-align:right;background:'+(on?'#eef3ff':'var(--card)')+';border:1.5px solid '+(on?'#1d4ed8':'var(--border)')+';border-radius:13px;padding:10px 12px;font-family:inherit;cursor:pointer;display:flex;flex-direction:column;gap:2px'+(on?';box-shadow:0 6px 16px rgba(29,78,216,.12)':'')+'">'
      +'<span style="font-size:12.5px;font-weight:900;color:'+(on?'#1e3a8a':'var(--text2)')+'">'+s.label+'</span><span style="font-family:Cairo,sans-serif;font-size:22px;font-weight:900;color:'+(on?'#1e3a8a':'var(--text)')+'">'+n+'</span>'
      +'<span style="font-size:11.5px;font-weight:800;color:'+(dn?'#b91c1c':'#15803d')+'">'+(dn?dn+' يحتاج تذكير':'كلها تمام ✓')+'</span></button>';
  });
  h+='</div>';
  // الفلاتر
  var chips=[['due','يحتاج تذكير الآن',due.length],['never','ما ذُكّر أبداً',c(function(p){return !p.reminder_at;})],['nomove','ذُكّر وما تحرّك',c(function(p){return !!p.reminder_at;})],['unseen','ما فتح العروض',c(function(p){return (p.unseen_bids||0)>0;})],['unread','رسائل ما قرأها',c(function(p){return (p.unread_msgs||0)>0;})],['phone','📞 أخذوا رقمه',c(function(p){return (p.unlocks||0)>0;})],['moved','تحرّك ✓',((_fuData.moved)||[]).length],['all','الكل',all.length]];
  var cities={}; all.forEach(function(p){ if(p.city)cities[p.city]=1; });
  h+='<div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-bottom:12px">'+chips.map(function(x){ var on=_fuFilter===x[0]; return '<button onclick="_fuFilter=\''+x[0]+'\';renderFollowups()" style="border:1.5px solid '+(on?'#1d4ed8':'var(--border)')+';background:'+(on?'#1d4ed8':'var(--card)')+';color:'+(on?'#fff':'var(--text2)')+';border-radius:999px;padding:7px 13px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer;display:inline-flex;gap:6px;align-items:center">'+x[1]+' <span style="font-size:11px;background:'+(on?'rgba(255,255,255,.22)':'rgba(15,23,42,.07)')+';border-radius:999px;padding:0 7px">'+x[2]+'</span></button>'; }).join('')
    +'<span style="margin-right:auto;display:flex;gap:7px">'
    +'<select id="fu-city" onchange="_fuCity=this.value;renderFollowups()" style="border:1.5px solid var(--border);background:var(--card);color:var(--text);border-radius:10px;padding:8px 10px;font-family:inherit;font-size:12.5px;font-weight:800"><option value="">كل المدن</option>'+Object.keys(cities).sort(function(a,b){return a.localeCompare(b,'ar');}).map(function(ct){return '<option'+(ct===_fuCity?' selected':'')+'>'+esc(ct)+'</option>';}).join('')+'</select>'
    +'<select onchange="_fuSort=this.value;renderFollowups()" style="border:1.5px solid var(--border);background:var(--card);color:var(--text);border-radius:10px;padding:8px 10px;font-family:inherit;font-size:12.5px;font-weight:800"><option value="prio"'+(_fuSort==='prio'?' selected':'')+'>الأهم أولاً</option><option value="old"'+(_fuSort==='old'?' selected':'')+'>الأقدم أولاً</option><option value="new"'+(_fuSort==='new'?' selected':'')+'>الأحدث أولاً</option></select>'
    +'</span></div>';
  // الجدول
  var rows=_fuList();
  var G='display:grid;grid-template-columns:14px minmax(0,2.2fr) 118px minmax(0,1.8fr) 120px 98px 150px;gap:12px;align-items:center;padding:0 16px';
  h+='<div style="background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden"><div class="fu-tbl" style="overflow-x:auto"><div style="min-width:980px">'
    +'<div style="'+G+';padding:10px 16px;font-size:11.5px;font-weight:900;color:var(--muted);background:var(--bg);border-bottom:1px solid var(--border)"><span></span><span>المشروع والعميل</span><span>المرحلة</span><span>الوضع — ليش يحتاج متابعة</span><span>آخر تذكير</span><span>التذكير التالي</span><span style="text-align:left">إجراء</span></div>';
  if(!rows.length) h+='<div style="padding:42px;text-align:center;color:var(--muted);font-weight:700">'+(_fuFilter==='due'?'ما فيه أحد يحتاج تذكير الحين 👍':'ما فيه مشاريع بهذا الفلتر')+'</div>';
  rows.forEach(function(p){
    var i=p._i, st=p.stage==='moved'?{label:'تحرّك ✓',bg:'#dcfce7',fg:'#15803d'}:_fuSt(p.stage), sel=_fuCur===p.id;
    var why=p.stage==='moved'?'<span style="color:#15803d">اختار مزوّد '+_fuAgo(p.assigned_at)+' بعد التذكير</span>':i.why.join(' · ');
    var last=p.reminder_at?(_fuAgo(p.reminder_at)+' <span style="color:var(--muted)">· مرة '+(p.reminder_count||1)+'</span>'):'<span style="color:#94a3b8">ما ذُكّر أبداً</span>';
    var act=p.stage==='moved'?'<a href="/project/x-'+p.id+'?id='+p.id+'" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="border:1.5px solid var(--border);background:var(--card);color:var(--text2);border-radius:10px;padding:8px 11px;font-size:12.5px;font-weight:800;text-decoration:none">عرض</a>'
      :'<button onclick="event.stopPropagation();_fuOpen('+p.id+')" style="border:0;background:#16a34a;color:#fff;border-radius:10px;padding:9px 13px;font-family:inherit;font-size:13px;font-weight:900;cursor:pointer;white-space:nowrap">💬 ذكّره</button>';
    h+='<div onclick="_fuOpen('+p.id+')" style="'+G+';padding:12px 16px;border-bottom:1px solid var(--border);cursor:pointer;'+(sel?'background:#f5f8ff;box-shadow:inset -4px 0 0 #1d4ed8':'')+'" onmouseover="this.style.background=\'#f8fafd\'" onmouseout="this.style.background=\''+(sel?'#f5f8ff':'')+'\'">'
      +'<span style="width:10px;height:10px;border-radius:10px;background:'+(p.stage==='moved'?'#16a34a':_fuDotC(i.level))+'"></span>'
      +'<div style="min-width:0"><div style="font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.title||'مشروع')+'</div><div style="font-size:12px;font-weight:700;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.client_name||'عميل')+(p.client_phone?' · <span dir="ltr">'+esc(p.client_phone)+'</span>':'')+(p.city?' · '+esc(p.city):'')+'</div><div style="font-size:11.5px;font-weight:800;color:#64748b;margin-top:2px">📅 '+_fuDate(p.created_at)+'</div></div>'
      +'<div>'+_fuPill(st.label,st.bg,st.fg)+'</div>'
      +'<div style="font-size:12.5px;font-weight:800;line-height:1.55">'+why+'</div>'
      +'<div style="font-size:12.5px;font-weight:800">'+last+'</div>'
      +'<div>'+(p.stage==='moved'?'<span style="font-size:12px;font-weight:800;color:#15803d">نجح ✓</span>':_fuNextHtml(i))+'</div>'
      +'<div style="display:flex;gap:6px;justify-content:flex-end">'+act+'</div></div>';
  });
  h+='</div></div><div style="padding:10px 16px;font-size:12.5px;font-weight:800;color:var(--muted);background:var(--bg)">'+rows.length+' مشروع · '+({prio:'مرتّبة: الأهم أولاً',old:'الأقدم أولاً',new:'الأحدث أولاً'}[_fuSort])+'</div></div>';
  h+='<div style="font-size:11.5px;color:var(--muted);font-weight:700;margin-top:10px;line-height:1.8">🔴 الآن = ما ذُكّر أو مرّ 3+ أيام على آخر تذكير والمشكلة قائمة (عروض/رسائل ما شافها، أو تأخر) · 🟠 اليوم · ⚪ لاحقاً أو مؤجّل. «تحرّك ✓» = اختار مزوّد بعد التذكير.</div>';
  b.innerHTML=h;
  if(hadQ){ var nq=document.getElementById('fu-q'); if(nq){ nq.focus(); try{nq.setSelectionRange(qPos,qPos);}catch(e){} } }
}
// ── لوحة التفاصيل والرسالة ──
function _fuClose(){ var d=document.getElementById('fuDr'); if(d)d.remove(); _fuCur=null; renderFollowups(); }
function _fuOpen(id){
  var p=_fuFind(id); if(!p)return; _fuCur=id; if(!p._i)p._i=_fuInfo(p);
  var old=document.getElementById('fuDr'); if(old)old.remove();
  var ov=document.createElement('div'); ov.id='fuDr';
  ov.style.cssText='position:fixed;inset:0;z-index:900;background:rgba(15,23,42,.35);display:flex;justify-content:flex-end';
  ov.onclick=function(e){ if(e.target===ov)_fuClose(); };
  ov.innerHTML='<div style="width:600px;max-width:100%;height:100%;background:var(--card);color:var(--text);box-shadow:20px 0 50px rgba(15,23,42,.2);display:flex;flex-direction:column" id="fuDrBox"><div style="padding:40px;text-align:center;color:var(--muted)">جاري التحميل…</div></div>';
  document.body.appendChild(ov);
  renderFollowups();
  _fuDetail(id,function(det){ _fuDrawer(p,det); });
}
function _fuDrawer(p,det){
  var box=document.getElementById('fuDrBox'); if(!box)return;
  var i=p.stage==='moved'?{level:'later',why:[]}:_fuInfo(p), st=_fuSt(p.stage), s=det.stats||{};
  var kinds=_fuKinds(p), kind=p._kind||kinds[0];
  var ph=_fuPhone(p);
  var tl=[['#16a34a','نُشر المشروع',new Date(p.created_at).toLocaleString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'long',hour:'numeric',minute:'2-digit'})]];
  if(s.first_bid_at){ var hrs=Math.max(0,Math.round((new Date(s.first_bid_at)-new Date(p.created_at))/3600000)); tl.push(['#16a34a','أول عرض وصل',hrs<1?'خلال أقل من ساعة':(hrs<24?'بعد '+_fuN(hrs,'ساعة','ساعتين','ساعات'):'بعد '+_fuN(Math.round(hrs/24),'يوم','يومين','أيام'))]); }
  if(s.n) tl.push(['#1d4ed8','وصل '+_fuN(s.n,'عرض واحد','عرضين','عروض'),(p.min_price?'أقل سعر '+Math.round(p.min_price).toLocaleString('en-US'):'')+(s.avg_price?' · المتوسط '+Math.round(s.avg_price).toLocaleString('en-US'):'')]);
  if(s.first_seen_at) tl.push(['#1d4ed8','صاحب المشروع فتح العروض',_fuAgo(s.first_seen_at)+((p.unseen_bids||0)?' — باقي '+p.unseen_bids+' ما شافها':'')]);
  else if(s.n) tl.push(['#dc2626','ما فتح العروض أبداً','']);
  if(p.unread_msgs) tl.push(['#dc2626',p.unread_msgs+' رسائل من مزوّدين ما قرأها','']);
  (det.log||[]).slice().reverse().forEach(function(l,ix){ tl.push(['#f59e0b','تذكير '+(ix+1)+' — '+(_fuSt(l.stage).label||''),_fuAgo(l.created_at)+(l.admin_name?' · '+l.admin_name:'')+(l.outcome?' · النتيجة: '+(FU_OUT[l.outcome]||l.outcome):'')]); });
  if(i.snoozed) tl.push(['#94a3b8','مؤجّل','يرجع بعد '+i.nextIn+' يوم']);
  var tlh=tl.map(function(x){ return '<div style="display:flex;gap:10px;align-items:flex-start"><span style="width:11px;height:11px;border-radius:11px;background:'+x[0]+';margin-top:5px;flex-shrink:0"></span><div><div style="font-size:13px;font-weight:900">'+esc(x[1])+'</div>'+(x[2]?'<div style="font-size:12px;font-weight:700;color:var(--muted)">'+esc(x[2])+'</div>':'')+'</div></div>'; }).join('');
  var lastLog=(det.log||[])[0];
  var ch=function(lbl,on,oc){ return '<button onclick="'+oc+'" style="border:1.5px solid '+(on?'#1d4ed8':'var(--border)')+';background:'+(on?'#1d4ed8':'var(--card)')+';color:'+(on?'#fff':'var(--text2)')+';border-radius:999px;padding:6px 11px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer">'+lbl+'</button>'; };
  var gb='border:1.5px solid var(--border);background:var(--card);color:var(--text2);border-radius:10px;padding:10px 13px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap';
  var h='<div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;gap:10px;align-items:flex-start">'
    +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:800;color:var(--muted)">#'+p.id+' · '+_fuDate(p.created_at)+(p.city?' · '+esc(p.city):'')+'</div><div style="font-family:Cairo,sans-serif;font-size:19px;font-weight:900;line-height:1.4">'+esc(p.title||'مشروع')+'</div>'
    +'<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">'+_fuPill(st.label,st.bg,st.fg)+(p.stage!=='moved'?_fuNextHtml(i):'')+'</div></div>'
    +'<button onclick="_fuClose()" aria-label="إغلاق" style="border:0;background:var(--bg);border-radius:10px;width:36px;height:36px;font-size:16px;cursor:pointer;color:var(--text)">✕</button></div>'
    +'<div style="padding:14px 20px;display:flex;flex-direction:column;gap:13px;overflow-y:auto;flex:1">'
    +'<div style="display:flex;align-items:center;gap:11px;background:var(--bg);border:1px solid var(--border);border-radius:13px;padding:11px 13px">'
    +'<span style="width:40px;height:40px;border-radius:40px;background:#1e3a8a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0">'+esc((p.client_name||'?').charAt(0))+'</span>'
    +'<div style="flex:1;min-width:0"><div style="font-size:14.5px;font-weight:900">'+esc(p.client_name||'عميل')+'</div><div style="font-size:12.5px;font-weight:700;color:var(--muted)"><span dir="ltr">'+esc(p.client_phone||'بدون جوال')+'</span>'+(p.client_last_seen?' · آخر دخول: '+_fuAgo(p.client_last_seen):'')+'</div></div>'
    +(ph?'<a href="tel:+'+ph+'" style="'+gb+';text-decoration:none">📞 اتصال</a>':'')+'</div>';
  if(i.why&&i.why.length) h+='<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:13px;padding:11px 13px"><div style="font-size:12px;font-weight:900;color:#c2410c">ليش يحتاج متابعة؟</div><div style="font-size:13.5px;font-weight:800;color:#7c2d12;margin-top:3px;line-height:1.7">'+i.why.join(' · ')+'</div></div>';
  h+='<div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.25fr);gap:14px">'
    +'<div style="display:flex;flex-direction:column;gap:10px"><div style="font-size:13.5px;font-weight:900">رحلة المشروع</div>'+tlh+'</div>'
    +'<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><div style="font-size:13.5px;font-weight:900">الرسالة</div>'
    +'<div style="display:flex;gap:5px;flex-wrap:wrap">'+kinds.map(function(k){ return ch(FU_KIND_LBL[k]||k,k===kind,'_fuKind('+p.id+',\''+k+'\')'); }).join('')+'</div>'
    +'<textarea id="fu-msg" style="width:100%;box-sizing:border-box;min-height:230px;border:1.5px solid var(--border);border-radius:12px;padding:10px 12px;font-family:inherit;font-size:13px;line-height:1.85;color:var(--text);background:var(--card);resize:vertical">'+esc(_fuMsg(p,kind,det))+'</textarea>'
    +'</div></div>';
  if(p.stage!=='moved'){
    h+='<div style="display:flex;gap:7px;flex-wrap:wrap">'
      +'<button onclick="_fuSend('+p.id+',document.getElementById(\'fu-msg\').value,function(){_fuOpen('+p.id+')})" style="flex:1;min-width:160px;border:0;background:#16a34a;color:#fff;border-radius:11px;padding:13px;font-family:inherit;font-size:14.5px;font-weight:900;cursor:pointer">💬 أرسل واتساب</button>'
      +'<button onclick="var t=document.getElementById(\'fu-msg\');try{navigator.clipboard.writeText(t.value);toast(\'نُسخت الرسالة\',\'success\');}catch(e){t.select();document.execCommand(\'copy\');}" style="'+gb+'">نسخ</button>'
      +'<select onchange="if(this.value!==\'\')_fuSnooze('+p.id+',parseInt(this.value));this.value=\'\'" style="'+gb+'"><option value="">⏰ أجّل</option><option value="1">يوم</option><option value="3">3 أيام</option><option value="7">أسبوع</option>'+(i.snoozed?'<option value="0">إلغاء التأجيل</option>':'')+'</select>'
      +((p.stage==='few'||p.stage==='offers'||p.stage==='delayed')?'<button onclick="_fuTab=\''+p.stage+'\';_fuMoveMenu(event,'+p.id+')" style="'+gb+'">نقل ▾</button>':'')
      +'<a href="/project/x-'+p.id+'?id='+p.id+'" target="_blank" rel="noopener" style="'+gb+';text-decoration:none">فتح المشروع</a>'
      +'</div>';
    if(lastLog){
      h+='<div style="background:var(--bg);border:1px solid var(--border);border-radius:13px;padding:11px 13px;display:flex;flex-direction:column;gap:8px">'
        +'<div style="font-size:12.5px;font-weight:900;color:var(--muted)">آخر تذكير '+_fuAgo(lastLog.created_at)+' — وش صار؟ <span style="font-weight:700">(اختياري، يرتّب الأولويات)</span></div>'
        +'<div style="display:flex;gap:6px;flex-wrap:wrap">'+Object.keys(FU_OUT).map(function(o){ return ch(FU_OUT[o],lastLog.outcome===o,'_fuOutcome('+p.id+',\''+o+'\')'); }).join('')+'</div>'
        +'<div style="font-size:11.5px;color:var(--muted);font-weight:700">«يبي وقت» يأجّله 5 أيام · «اتفق برا» و«أجّل المشروع» يأجّلونه أسبوعين</div></div>';
    }
  }
  h+='</div>';
  box.innerHTML=h;
}
function _fuKind(id,k){ var p=_fuFind(id); if(!p)return; p._kind=k; _fuDetail(id,function(det){ _fuDrawer(p,det); }); }
// ── الإرسال السريع ──
var _fuQ_list=[], _fuQ_i=0, _fuQ_sent=0;
function _fuQuick(){
  _fuQ_list=_fuQueue().map(function(p){return p.id;}); _fuQ_i=0; _fuQ_sent=0;
  if(!_fuQ_list.length){ toast('ما فيه أحد يحتاج تذكير الحين','success'); return; }
  var old=document.getElementById('fuQk'); if(old)old.remove();
  var ov=document.createElement('div'); ov.id='fuQk';
  ov.style.cssText='position:fixed;inset:0;z-index:950;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
  ov.innerHTML='<div id="fuQkBox" style="width:760px;max-width:100%;max-height:92vh;overflow-y:auto;background:var(--card);color:var(--text);border-radius:22px;box-shadow:0 30px 80px rgba(2,8,23,.35)"></div>';
  ov.onclick=function(e){ if(e.target===ov)_fuQuickClose(); };
  document.body.appendChild(ov);
  document.addEventListener('keydown',_fuQuickKey);
  _fuQuickShow();
}
function _fuQuickClose(){ var o=document.getElementById('fuQk'); if(o)o.remove(); document.removeEventListener('keydown',_fuQuickKey); renderFollowups(); }
function _fuQuickKey(e){
  if(!document.getElementById('fuQk'))return;
  if(e.target&&e.target.id==='fuqk-msg'&&e.key!=='Escape'&&!(e.key==='Enter'&&(e.ctrlKey||e.metaKey)))return;
  if(e.key==='Escape'){ e.preventDefault(); _fuQuickClose(); }
  else if(e.key==='Enter'){ e.preventDefault(); _fuQuickSend(); }
  else if(e.key==='s'||e.key==='S'||e.key==='س'){ e.preventDefault(); _fuQuickNext(); }
  else if(e.key==='l'||e.key==='L'||e.key==='م'){ e.preventDefault(); _fuQuickLater(); }
}
function _fuQuickShow(){
  var box=document.getElementById('fuQkBox'); if(!box)return;
  if(_fuQ_i>=_fuQ_list.length){
    box.innerHTML='<div style="padding:40px 28px;text-align:center"><div style="font-size:44px">🎉</div><div style="font-family:Cairo,sans-serif;font-size:21px;font-weight:900;margin-top:8px">خلصت قائمة اليوم</div><div style="font-size:14px;color:var(--muted);font-weight:700;margin-top:6px">أُرسل '+_fuQ_sent+' تذكير من '+_fuQ_list.length+'</div><button onclick="_fuQuickClose()" style="margin-top:18px;border:0;background:#1d4ed8;color:#fff;border-radius:12px;padding:12px 26px;font-family:inherit;font-size:14.5px;font-weight:900;cursor:pointer">تم</button></div>';
    return;
  }
  var id=_fuQ_list[_fuQ_i], p=_fuFind(id); if(!p){ _fuQ_i++; return _fuQuickShow(); }
  var i=_fuInfo(p), st=_fuSt(p.stage), pct=Math.round(_fuQ_i/_fuQ_list.length*100);
  var up=_fuQ_list.slice(_fuQ_i+1,_fuQ_i+4).map(function(x,ix){ var q=_fuFind(x); if(!q)return ''; return '<div style="display:flex;align-items:center;gap:10px;padding:8px 2px;border-bottom:1px solid var(--border)"><span style="width:22px;height:22px;border-radius:22px;background:#eef3ff;color:#1e3a8a;font-size:11.5px;font-weight:900;display:flex;align-items:center;justify-content:center">'+(_fuQ_i+ix+2)+'</span><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(q.title||'')+'</div><div style="font-size:11.5px;font-weight:700;color:var(--muted)">'+esc(_fuSt(q.stage).label)+'</div></div></div>'; }).join('');
  var gb='border:1.5px solid var(--border);background:var(--card);color:var(--text2);border-radius:11px;padding:13px 16px;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;white-space:nowrap';
  box.innerHTML='<div style="padding:16px 22px;background:linear-gradient(135deg,#1e3a8a,#2554c7);color:#fff;border-radius:22px 22px 0 0">'
    +'<div style="display:flex;align-items:center;gap:10px"><b style="font-family:Cairo,sans-serif;font-size:18px;flex:1">⚡ الإرسال السريع</b><span style="font-size:13px;font-weight:800;opacity:.92">'+(_fuQ_i+1)+' من '+_fuQ_list.length+' · أُرسل '+_fuQ_sent+'</span><button onclick="_fuQuickClose()" aria-label="إغلاق" style="border:0;background:rgba(255,255,255,.15);color:#fff;border-radius:9px;width:32px;height:32px;cursor:pointer">✕</button></div>'
    +'<div style="height:7px;border-radius:7px;background:rgba(255,255,255,.2);margin-top:11px"><div style="width:'+pct+'%;height:7px;border-radius:7px;background:#4ade80"></div></div></div>'
    +'<div style="padding:16px 22px;display:flex;flex-direction:column;gap:11px">'
    +'<div style="display:flex;align-items:center;gap:10px"><div style="flex:1;min-width:0"><div style="font-family:Cairo,sans-serif;font-size:18px;font-weight:900">'+esc(p.title||'')+'</div><div style="font-size:13px;font-weight:700;color:var(--muted)">'+esc(p.client_name||'')+' · <span dir="ltr">'+esc(p.client_phone||'بدون جوال')+'</span>'+(p.city?' · '+esc(p.city):'')+' · 📅 '+_fuDate(p.created_at)+'</div></div>'+_fuPill(st.label,st.bg,st.fg)+'</div>'
    +'<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:11px;padding:9px 12px;font-size:13px;font-weight:800;color:#7c2d12">'+i.why.join(' · ')+' · '+(p.reminder_at?'آخر تذكير '+_fuAgo(p.reminder_at):'ما ذُكّر أبداً')+'</div>'
    +'<textarea id="fuqk-msg" style="width:100%;box-sizing:border-box;min-height:190px;border:1.5px solid var(--border);border-radius:12px;padding:10px 12px;font-family:inherit;font-size:13px;line-height:1.85;color:var(--text);background:var(--card);resize:vertical">جاري تجهيز الرسالة…</textarea>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap"><button onclick="_fuQuickSend()" style="flex:1;min-width:200px;border:0;background:#16a34a;color:#fff;border-radius:11px;padding:14px;font-family:inherit;font-size:15px;font-weight:900;cursor:pointer">💬 أرسل واتساب والتالي ←</button><button onclick="_fuQuickNext()" style="'+gb+'">تخطّي</button><button onclick="_fuQuickLater()" style="'+gb+'">⏰ بعد 3 أيام</button></div>'
    +'<div style="font-size:11.5px;font-weight:800;color:var(--muted);text-align:center">Enter = أرسل والتالي · S = تخطّي · L = أجّل 3 أيام · Esc = إغلاق</div>'
    +(up?'<div style="font-size:12.5px;font-weight:900;color:var(--muted);margin-top:2px">اللي بعده</div>'+up:'')
    +'</div>';
  _fuDetail(id,function(det){ var t=document.getElementById('fuqk-msg'); if(t&&_fuQ_list[_fuQ_i]===id){ var k=_fuKinds(p)[0]; t.value=_fuMsg(p,k,det); } });
}
function _fuQuickSend(){ var id=_fuQ_list[_fuQ_i], t=document.getElementById('fuqk-msg'); if(!id||!t||/^جاري تجهيز/.test(t.value))return; _fuQ_sent++; _fuSend(id,t.value); _fuQ_i++; _fuQuickShow(); }
function _fuQuickNext(){ _fuQ_i++; _fuQuickShow(); }
function _fuQuickLater(){ var id=_fuQ_list[_fuQ_i]; if(id)_fuSnooze(id,3); _fuQ_i++; _fuQuickShow(); }

function _fuMoveMenu(ev, id){
  ev.stopPropagation();
  document.querySelectorAll('.fu-move-pop').forEach(function(x){x.remove();});
  var opts=[['few','\ud83c\udd95 عروض قليلة'],['offers','\ud83d\udce5 وصول عروض'],['delayed','\u23f3 تأخر الاختيار']].filter(function(o){return o[0]!==_fuTab;});
  var pop=document.createElement('div'); pop.className='fu-move-pop';
  pop.style.cssText='position:fixed;z-index:9999;background:var(--card);border:1px solid var(--border);border-radius:11px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:6px;min-width:175px';
  var html='<div style="font-size:11px;color:var(--muted);padding:5px 9px">نقل إلى:</div>';
  opts.forEach(function(o){ html+='<button onclick="_fuMove('+id+',\''+o[0]+'\')" style="display:block;width:100%;text-align:right;background:none;border:none;padding:9px 11px;border-radius:8px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:700;color:var(--text);cursor:pointer">'+o[1]+'</button>'; });
  html+='<button onclick="_fuMove('+id+',\'\')" style="display:block;width:100%;text-align:right;background:none;border:none;padding:9px 11px;border-radius:8px;font-family:Tajawal,sans-serif;font-size:12px;color:var(--muted);cursor:pointer;border-top:1px solid var(--border);margin-top:3px">\u21ba إرجاع للتلقائي</button>';
  pop.innerHTML=html; document.body.appendChild(pop);
  var r=ev.target.getBoundingClientRect();
  pop.style.top=(r.bottom+6)+'px'; pop.style.right=Math.max(8,(window.innerWidth-r.right))+'px';
  setTimeout(function(){ document.addEventListener('click', function _c(){ pop.remove(); document.removeEventListener('click',_c); }); }, 10);
}
function _fuMove(id, stage){
  document.querySelectorAll('.fu-move-pop').forEach(function(x){x.remove();});
  fetch(API+'/api/admin/requests/'+id+'/followup-stage',Object.assign({method:'POST',body:JSON.stringify({stage:stage})},hdr())).then(function(r){return r.json();}).then(function(d){
    if(d&&d.ok){ toast(stage?'تم نقل المشروع':'رجع للتلقائي','success'); loadFollowups(); }
    else toast((d&&d.message)||'تعذّر النقل','error');
  }).catch(function(){ toast('تعذّر النقل','error'); });
}
var CR_LABELS={auto_silent:'تلقائي: العميل ما تفاعل (أسبوعين)',chose_outside:'العميل: اتفق مع مزوّد من برا المنصة',price_high:'العميل: الأسعار أعلى من ميزانيته',postponed:'العميل: أجّل أو ألغى المشروع',no_suitable_offers:'العميل: ما لقى عرض مناسب',other:'العميل: سبب آخر',admin_closed:'أغلقته الإدارة',auto_client:'تلقائي: انتهت مدة اختارها العميل',auto_default:'تلقائي: انتهت مدة المنصة الافتراضية',auto_admin:'تلقائي: انتهت مدة حددتها الإدارة',auto_client_extend:'تلقائي: انتهت بعد تمديد العميل',auto_expired:'تلقائي: انتهت المدة',completed:'تمت الترسية بنجاح ✓'};
var CR_COLORS={auto_silent:'#be123c',chose_outside:'#dc2626',price_high:'#d97706',postponed:'#64748b',no_suitable_offers:'#7c3aed',other:'#0891b2',admin_closed:'#0f766e',auto_client:'#475569',auto_default:'#94a3b8',auto_admin:'#0f766e',auto_client_extend:'#64748b',auto_expired:'#94a3b8',completed:'#16a34a'};
// ═══ المشاريع الموثّقة: المزوّد طلب التأكيد والعميل أكّد ═══
var _clDays=30;
var _CL_ST={pending:['⏳ بانتظار العميل','#e0e7ff','#3730a3'],confirmed:['✓ أكّد العميل','#dcfce7','#15803d'],not_done:['لسا ما خلص','#f1f5f9','#475569'],denied:['✗ العميل: ما تعاملت معه','#fee2e2','#b91c1c'],expired:['ما رد العميل','#f1f5f9','#64748b']};
function loadClaims(days){
  if(typeof days==='number'&&days>0)_clDays=days; else if(!_clDays)_clDays=30;
  var b=document.getElementById('claims-body'); if(!b)return;
  if(!b.querySelector('.br-wrap'))b.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  var to=new Date(Date.now()+3*3600000), fr=new Date(to.getTime()-(_clDays-1)*86400000), f=function(d){return d.toISOString().slice(0,10);};
  fetch(API+'/api/admin/claims?from='+f(fr)+'&to='+f(to),hdr()).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d){b.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">تعذّر التحميل</div>';return;}
    var t=d.totals||{}, L=d.list||[];
    var seg='<div class="br-seg">'+[[7,'7 أيام'],[30,'30 يوم'],[90,'3 شهور'],[365,'سنة']].map(function(x){return '<button type="button" class="'+(x[0]===_clDays?'on':'')+'" onclick="loadClaims('+x[0]+')">'+x[1]+'</button>';}).join('')+'</div>';
    var k=function(l,n,sub,cls){return '<div class="br-k'+(cls?' '+cls:'')+'"><span class="l">'+l+'</span><b>'+n+'</b><span class="s">'+sub+'</span></div>';};
    var h='<div class="br-wrap"><div class="br-top">'+seg+'</div><div class="br-ks">'
      +k('طلبات توثيق',fmtNum(t.total||0),fmtNum(t.pending||0)+' بانتظار العميل')
      +k('أكّدها العملاء',fmtNum(t.confirmed||0),(t.outside?'منها '+fmtNum(t.outside)+' كانت برا المنصة':'—'),'g')
      +k('سعي جديد من التوثيق',fmtNum(t.new_saai||0)+' <small style="font-size:14px">ر.س</small>',(t.new_saai?'كان بيضيع':'—'),'a')
      +k('العميل قال «ما تعاملت معه»',fmtNum(t.denied||0),(t.denied?'راجعها تحت':'—'),t.denied?'r':'')+'</div>';
    if(!L.length){h+='<div class="ad-card" style="padding:34px;text-align:center;color:var(--muted);font-weight:700">ما فيه طلبات توثيق في هالفترة.<div style="font-size:12.5px;margin-top:6px">المزوّد يطلبها من «عروضي» لما يخلّص المشروع، أو إذا تعامل مع العميل برا المنصة.</div></div></div>';b.innerHTML=h;return;}
    h+='<div class="ad-card" style="padding:0"><div class="tbl-wrap" style="overflow-x:auto"><table class="br-t"><thead><tr><th>المشروع</th><th>المزوّد</th><th>العميل</th><th>القيمة</th><th>السعي 3%</th><th>الحالة</th><th></th></tr></thead><tbody>'
      +L.map(function(c){
        var st=_CL_ST[c.status]||[c.status,'#f1f5f9','#475569'];
        var val=c.client_value||c.value||0, diff=c.client_value&&c.value&&+c.client_value!==+c.value;
        var ph=String(c.client_phone||'').replace(/[^0-9]/g,'');if(ph.indexOf('0')===0)ph='966'+ph.slice(1);else if(ph&&ph.indexOf('966')!==0)ph='966'+ph;
        var act='';
        if(c.status==='denied'&&!c.admin_done)act=(ph?'<a class="act-btn ab-default" href="https://wa.me/'+ph+'" target="_blank" rel="noopener">واتساب العميل</a> ':'')+'<button class="act-btn ab-default" onclick="_clDone('+(parseInt(c.id)||0)+')">تمت المراجعة</button>';
        return '<tr'+(c.status==='denied'&&!c.admin_done?' class="warn"':'')+'><td><button type="button" class="br-nm" onclick="gsOpenReq('+(parseInt(c.request_id)||0)+')">'+esc(c.title||'مشروع')+'</button>'+(c.kind==='outside'?' <span class="br-p" style="background:#fef3c7;color:#92400e">كان برا المنصة</span>':'')+'</td>'
          +'<td><button type="button" class="br-nm" onclick="gsOpenUser('+_jsa(c.provider_email||'')+')">'+esc(c.provider_name||'—')+'</button></td><td>'+esc(c.client_name||'—')+'</td>'
          +'<td>'+(val?fmtNum(val):'—')+(diff?' <span style="font-size:11.5px;color:#b45309">(المزوّد: '+fmtNum(c.value)+')</span>':'')+'</td>'
          +'<td>'+(c.status==='confirmed'&&val?fmtNum(Math.round(val*0.03)):'—')+'</td>'
          +'<td><span class="br-p" style="background:'+st[1]+';color:'+st[2]+'">'+st[0]+(c.status==='pending'&&c.reminded_at?' · ذكّرناه':'')+'</span></td><td style="white-space:nowrap">'+act+'</td></tr>';
      }).join('')+'</tbody></table></div></div>';
    h+='<div class="br-note">المشاريع المؤكّدة تدخل «السداد» تلقائياً بالقيمة اللي أكّدها العميل. «ما تعاملت معه» يطلع لك في «تحتاج إجراء»، وإذا تكرر مرتين عند نفس المزوّد خلال 3 شهور يوقف عنده التوثيق تلقائياً.</div></div>';
    b.innerHTML=h;
  }).catch(function(){b.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">تعذّر التحميل</div>';});
}
function _clDone(id){ fetch(API+'/api/admin/claims/'+id+'/done',Object.assign({method:'PUT'},hdr())).then(function(){toast('تم','success');loadClaims();if(window.loadDashboard&&document.getElementById('page-dashboard').classList.contains('on'))loadDashboard();}); }
// ═══ ليش ما انختارت العروض؟ (سبب العميل + الفرصة الثانية) ═══
var _BR_COL={price:'#dc2626',unclear:'#f59e0b',duration:'#0891b2',specialty:'#7c3aed',postponed:'#64748b',other:'#94a3b8'};
var _BR_ICO={price:'💰',unclear:'📄',duration:'⏱',specialty:'🔧',postponed:'📅',other:'•'};
var _brDays=30;
function loadBidReasons(days){
  if(typeof days==='number'&&days>0)_brDays=days; else if(!_brDays)_brDays=30;
  var b=document.getElementById('bidreasons-body'); if(!b)return;
  if(!b.querySelector('.br-wrap'))b.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  var to=new Date(Date.now()+3*3600000), fr=new Date(to.getTime()-((_brDays||30)-1)*86400000), f=function(d){return d.toISOString().slice(0,10);};
  fetch(API+'/api/admin/bid-reasons?from='+f(fr)+'&to='+f(to),hdr()).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d){b.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">تعذّر التحميل</div>';return;}
    var t=d.totals||{}, L=d.labels||{}, rs=d.reasons||[], rsT=rs.reduce(function(a,x){return a+x.n;},0)||1;
    var seg='<div class="br-seg">'+[[7,'7 أيام'],[30,'30 يوم'],[90,'3 شهور'],[365,'سنة']].map(function(x){return '<button type="button" class="'+(x[0]===_brDays?'on':'')+'" onclick="loadBidReasons('+x[0]+')">'+x[1]+'</button>';}).join('')+'</div>';
    var k=function(l,n,sub,cls){return '<div class="br-k'+(cls?' '+cls:'')+'"><span class="l">'+l+'</span><b>'+fmtNum(n||0)+'</b><span class="s">'+sub+'</span></div>';};
    var h='<div class="br-wrap"><div class="br-top">'+seg+'</div><div class="br-ks">'
      +k('عروض ما انختارت',t.rejected,fmtNum(t.with_reason||0)+' منها ذكروا السبب')
      +k('أخذوا فرصة ثانية',t.chances,fmtNum(t.improved||0)+' قدّموا عرض محسّن')
      +k('انقبلت بعد التحسين',t.won,(t.won?'صفقات ما كانت بتصير':'—'),'g')
      +k('عملاء أجّلوا',t.postponed,(t.postponed?'تحت — تواصل معهم':'—'),'a')+'</div>';
    if(!t.rejected&&!(d.ask_penalized||[]).length){h+='<div class="ad-card" style="padding:34px;text-align:center;color:var(--muted);font-weight:700">ما فيه عروض انرفضت من العملاء في هالفترة.<div style="font-size:12.5px;margin-top:6px">الأسباب تبدأ تتجمع من الحين — كل ما رفض عميل عرض يختار السبب.</div></div></div>';b.innerHTML=h;return;}
    h+='<div class="br-2"><div class="ad-card br-c"><h3>ليش ما انختارت العروض؟</h3>'
      +(rs.length?rs.map(function(x){var pc=Math.round(x.n/rsT*100);return '<div class="br-r"><div class="t"><span>'+(_BR_ICO[x.k]||'')+' '+esc(L[x.k]||x.k)+'</span><b>'+x.n+' <small>'+pc+'%</small></b></div><div class="bar"><i style="width:'+Math.max(3,pc)+'%;background:'+(_BR_COL[x.k]||'#94a3b8')+'"></i></div></div>';}).join(''):'<div style="color:var(--muted);font-size:13px">العملاء ما ذكروا أسباب بعد</div>')
      +'</div><div class="ad-card br-c" style="padding:0"><h3 style="padding:16px 18px 6px">حسب المزوّد</h3><div class="tbl-wrap"><table class="br-t"><thead><tr><th>المزوّد</th><th>ما انختار</th><th>أكثر سبب</th><th>حسّن وانقبل</th><th></th></tr></thead><tbody>'
      +(d.providers||[]).map(function(p){
        var warn=p.specialty>=3;
        var pill=p.top?'<span class="br-p" style="background:'+(_BR_COL[p.top]||'#94a3b8')+'1a;color:'+(_BR_COL[p.top]||'#475569')+'">'+esc(L[p.top]||p.top)+(p.top_n>1?' · '+p.top_n:'')+'</span>':'<span style="color:var(--muted);font-size:12px">—</span>';
        return '<tr'+(warn?' class="warn"':'')+'><td><button type="button" class="br-nm" onclick="gsOpenUser('+_jsa(p.email||'')+')">'+esc(p.name||'—')+'</button>'+(warn?'<div class="br-w">⚠️ يقدّم خارج تخصصه ('+p.specialty+' مرات)</div>':'')+'</td><td>'+p.n+'</td><td>'+pill+'</td><td>'+(p.improved?p.won+' من '+p.improved:'—')+'</td><td>'+_proLink(p.id,1)+'</td></tr>';
      }).join('')+'</tbody></table></div></div></div>';
    var ap=d.ask_penalized||[];
    if(ap.length){
      h+='<div class="ad-card br-c" style="border-color:#fed7aa"><h3>مزوّدين كثّروا طلبات الاعتماد <small>3 عملاء أو أكثر ردّوا «ما اتفقنا» خلال شهر — عروضهم نازلة لآخر القائمة</small></h3>'
        +ap.map(function(p){var ph=_waNorm(p.phone);return '<div class="br-po"><div style="min-width:0;flex:1"><button type="button" class="br-nm" onclick="gsOpenUser('+_jsa(p.email||'')+')">'+esc(p.name||'—')+'</button><div class="sm">'+p.declines+' «ما اتفقنا» · ترجع طبيعية '+new Date(p.ask_penalty_until).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'long'})+'</div></div>'
          +(ph?'<a class="act-btn ab-default" href="https://wa.me/'+ph+'" target="_blank" rel="noopener">واتساب</a>':'')+'<button class="act-btn ab-default" onclick="_brClearPen('+(parseInt(p.id)||0)+')">رجّع ترتيبه</button></div>';}).join('')+'</div>';
    }
    var po=d.postponed||[];
    if(po.length){
      h+='<div class="ad-card br-c"><h3>عملاء أجّلوا مشاريعهم <small>تواصل معهم بعد فترة — ممكن يرجعون</small></h3>'
        +po.map(function(p){var ph=String(p.client_phone||'').replace(/[^0-9]/g,'');if(ph.indexOf('0')===0)ph='966'+ph.slice(1);else if(ph&&ph.indexOf('966')!==0)ph='966'+ph;
          var wt='السلام عليكم '+(p.client_name||'')+'،\nمعك منصة مناقصة بخصوص مشروعك «'+(p.title||'')+'». هل صار وقت مناسب تبدأ؟ نقدر نساعدك تلقى أفضل عرض.';
          return '<div class="br-po"><div style="min-width:0;flex:1"><button type="button" class="br-nm" onclick="gsOpenReq('+(parseInt(p.id)||0)+')">'+esc(p.title||'مشروع')+'</button><div class="sm">'+esc(p.client_name||'')+(p.city?' · '+esc(p.city):'')+' · أجّل '+_adAgo(p.rejected_at)+'</div></div>'+(ph?'<a class="act-btn ab-default" href="https://wa.me/'+ph+'?text='+encodeURIComponent(wt)+'" target="_blank" rel="noopener">واتساب</a>':'')+'</div>';}).join('')+'</div>';
    }
    h+='<div class="br-note">العميل يختار السبب لما يضغط «ما يناسبني». إذا السبب السعر أو المدة أو العرض ناقص، يقدر يعطي المزوّد فرصة وحدة يقدّم عرض أفضل خلال 48 ساعة. «يقدّم خارج تخصصه» يطلع إذا تكرر 3 مرات أو أكثر.</div></div>';
    b.innerHTML=h;
  }).catch(function(){b.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">تعذّر التحميل</div>';});
}
function _brClearPen(id){ if(!confirm('ترجع عروض هذا المزوّد لترتيبها الطبيعي الحين؟'))return; fetch(API+'/api/admin/users/'+id+'/ask-penalty/clear',Object.assign({method:'PUT'},hdr())).then(function(r){toast(r.ok?'تم':'تعذّر',r.ok?'success':'error');loadBidReasons();}); }
function loadCloseReasons(){
  var b=document.getElementById('closereasons-body'); if(b)b.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/close-reasons',hdr()).then(function(r){return r.json();}).then(function(d){ renderCloseReasons(d); })
    .catch(function(){ if(b)b.innerHTML='<div style="padding:30px;text-align:center;color:var(--muted)">تعذّر التحميل</div>'; });
}
var _CR_MISS={price:'💰 الأسعار أعلى من ميزانيته',far:'📍 ما فيه مزوّد قريب',few:'🔢 العروض قليلة',weak:'📄 العروض ضعيفة / ما فهموا المشروع'};
function _crRow(p){
  var _fd=function(d){return d?new Date(d).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short'}):'';};
  var ph=_waNorm(p.client_phone), wt='السلام عليكم '+(p.client_name||'')+'،\nمعك فريق منصة مناقصة بخصوص مشروعك «'+(p.title||'')+'». وش اللي كان ناقص في العروض؟ نقدر نرشّح لك مزوّدين مناسبين'+(p.city?' في '+p.city:'')+'.';
  var hp=p.close_help?(p.close_help_done?'<span class="br-p" style="background:#f1f5f9;color:#64748b">✓ تواصلت معه</span>':'<span class="br-p" style="background:#dbeafe;color:#1d4ed8">🙋 يبي مساعدة</span>'):'';
  return '<div class="nso-row'+(p.close_help&&!p.close_help_done?' hl':'')+'"><div style="flex:1;min-width:0"><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap"><button type="button" class="br-nm" style="font-size:13.5px;font-weight:900" onclick="gsOpenReq('+(parseInt(p.id)||0)+')">'+esc(p.title||'مشروع')+'</button><span class="br-p" style="background:#ede9fe;color:#6d28d9">ما لقى عرض مناسب</span>'+hp+'</div>'
    +'<div style="font-size:11.5px;color:var(--muted);font-weight:700;margin-top:3px">'+esc(p.client_name||'عميل')+(p.city?' · '+esc(p.city):'')+' · '+(p.bid_count||0)+' عروض'+(p.closed_at?' · أُغلق '+_fd(p.closed_at):'')+'</div>'
    +(p.close_missing?'<div style="margin-top:6px;font-size:12.5px;font-weight:800">الناقص: <span style="color:#b45309">'+(_CR_MISS[p.close_missing]||'')+'</span></div>':'')
    +(p.close_reason_note?'<div style="margin-top:5px;font-size:12px;font-weight:700;color:var(--text2);background:var(--bg);border-radius:9px;padding:6px 9px">'+esc(p.close_reason_note)+'</div>':'')+(typeof _crExtra==='function'?_crExtra(p):'')+'</div>'
    +'<div class="nso-acts">'+(ph?'<a class="act-btn ab-default" style="color:#047857;border-color:#a7f3d0;text-decoration:none" href="https://wa.me/'+ph+'?text='+encodeURIComponent(wt)+'" target="_blank" rel="noopener">💬 كلّم العميل</a>':'')
    +'<button class="act-btn ab-default" onclick="gsOpenReq('+(parseInt(p.id)||0)+')" title="منه تعيد فتحه وتدعو مزوّدين">📂 افتح المشروع</button>'
    +(p.close_help&&!p.close_help_done?'<button class="act-btn ab-default" onclick="_crHelpDone('+(parseInt(p.id)||0)+')">✓ تواصلت</button>':'')+'</div></div>';
}
function _crHelpDone(id){ fetch(API+'/api/admin/requests/'+id+'/help-done',Object.assign({method:'PUT'},hdr())).then(function(r){toast(r.ok?'تم':'تعذّر',r.ok?'success':'error');loadCloseReasons();}); }
function _crRecruit(cat,city){ try{sessionStorage.setItem('adm_recruit',JSON.stringify({cat:cat,city:city}));}catch(e){} toast('ابحث عن مزوّدين: '+cat+' · '+city,'info'); _gtGo('outreach'); }
function renderCloseReasons(d){
  var b=document.getElementById('closereasons-body'); if(!b)return;
  var sum=(d&&d.summary)||[], list=(d&&d.list)||[];
  var total=sum.reduce(function(a,x){return a+(x.c||0);},0);
  if(!total){ b.innerHTML='<div style="padding:40px;text-align:center;color:var(--muted)">لا توجد مشاريع مُغلقة بأسباب بعد</div>'; return; }
  var leak=(sum.filter(function(x){return x.close_reason==='chose_outside';})[0]||{}).c||0;
  var h='<div style="display:flex;gap:11px;flex-wrap:wrap;margin-bottom:18px">';
  h+='<div style="flex:1;min-width:150px;background:var(--card);border:1px solid var(--border);border-radius:13px;padding:15px"><div style="font-size:24px;font-weight:900;color:var(--p)">'+total+'</div><div style="font-size:12px;color:var(--muted);margin-top:3px">إجمالي المشاريع المُغلقة</div></div>';
  h+='<div style="flex:1;min-width:150px;background:#fef2f2;border:1px solid #fecaca;border-radius:13px;padding:15px"><div style="font-size:24px;font-weight:900;color:#dc2626">'+leak+' <span style="font-size:14px">('+(total?Math.round(leak/total*100):0)+'%)</span></div><div style="font-size:12px;color:#b91c1c;margin-top:3px">اختاروا من خارج المنصة (تسريب)</div></div>';
  h+='</div>';
  h+='<div style="background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:18px"><div style="font-weight:900;font-size:14px;margin-bottom:12px">توزيع الأسباب</div>';
  sum.forEach(function(x){
    var pct=total?Math.round(x.c/total*100):0; var lbl=CR_LABELS[x.close_reason]||x.close_reason; var col=CR_COLORS[x.close_reason]||'#64748b';
    h+='<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin-bottom:4px"><span>'+esc(lbl)+'</span><span style="color:var(--muted)">'+x.c+' ('+pct+'%)</span></div><div style="height:9px;background:var(--bg);border-radius:6px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+col+';border-radius:6px"></div></div></div>';
  });
  h+='</div>';
  // «ما لقى عرض مناسب»: عملاء يبون مساعدة + وين ينقصنا مزوّدين
  var helps=list.filter(function(p){return p.close_help&&!p.close_help_done;}), gp=(d&&d.gaps)||[];
  if(helps.length||gp.length){
    h+='<div class="nso-2">';
    h+='<div class="ad-card nso-c"><h3>🙋 عملاء يبون مساعدة'+(helps.length?' <i class="ak-cnt" style="font-style:normal;background:#dc2626;color:#fff;font-size:11px;border-radius:999px;padding:1px 8px">'+helps.length+'</i>':'')+'</h3>'
      +(helps.length?helps.map(_crRow).join(''):'<div style="color:var(--muted);font-size:13px;font-weight:700;padding:6px 0">ما فيه طلبات مساعدة جديدة 👌</div>')+'</div>';
    h+='<div class="ad-card nso-c"><h3>وين ينقصنا مزوّدين؟</h3><div style="font-size:12px;color:var(--muted);font-weight:700;margin:-4px 0 4px">مشاريع ضاعت آخر 30 يوم («ما لقى عرض مناسب» أو انقفلت بعرض أو أقل)</div>'
      +(gp.length?'<table class="br-t"><thead><tr><th>التخصص · المدينة</th><th>ضاعت</th><th>مزوّدين نشطين</th><th></th></tr></thead><tbody>'+gp.map(function(g){var c=g.lost>=5?['#fee2e2','#b91c1c']:(g.lost>=3?['#ffedd5','#c2410c']:['#fef3c7','#b45309']);
        return '<tr><td>'+esc(g.category||'')+' · '+esc(g.city||'')+'</td><td><span style="display:inline-block;min-width:26px;text-align:center;border-radius:8px;padding:2px 6px;font-weight:900;background:'+c[0]+';color:'+c[1]+'">'+g.lost+'</span></td><td>'+g.active+'</td><td><button class="act-btn ab-default" style="background:#1d4ed8;color:#fff;border-color:#1d4ed8" onclick="_crRecruit('+_jsa(g.category||'')+','+_jsa(g.city||'')+')">استقطب</button></td></tr>';}).join('')+'</tbody></table>'
        :'<div style="color:var(--muted);font-size:13px;font-weight:700;padding:6px 0">ما فيه مشاريع ضاعت هالشهر 👌</div>')+'</div></div>';
  }
  window._crList=list;
  h+='<div id="cr-list"></div>';
  b.innerHTML=h;
  _crListRender();
}
var _crF='all';
function _crCat(p){ var r=p.close_reason||''; if(r==='completed')return 'done'; if(r==='deal_cancelled')return 'deal'; if(r==='postponed')return 'post'; if(r.indexOf('auto_')===0)return 'auto'; return 'client'; }
function _crListRender(){
  var el=document.getElementById('cr-list'); if(!el)return; var list=window._crList||[];
  var C={all:'الكل',auto:'تلقائي',client:'العميل أغلقه',post:'مؤجّل',deal:'الاتفاق انلغى',done:'تمت الترسية'};
  var cnt={}; list.forEach(function(p){ var c=_crCat(p); cnt[c]=(cnt[c]||0)+1; });
  var h='<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px"><div style="font-weight:900;font-size:15px;margin-left:auto">المشاريع المُغلقة — الأحدث أول</div>'
    +Object.keys(C).filter(function(k){return k==='all'||cnt[k];}).map(function(k){ var on=_crF===k; return '<button type="button" onclick="_crF=\''+k+'\';_crListRender()" style="border:1px solid '+(on?'#1d4ed8':'var(--border)')+';background:'+(on?'#1d4ed8':'var(--card)')+';color:'+(on?'#fff':'var(--text)')+';border-radius:999px;padding:6px 12px;font-family:inherit;font-weight:800;font-size:12px;cursor:pointer">'+C[k]+' <span style="opacity:.75">'+(k==='all'?list.length:cnt[k])+'</span></button>'; }).join('')+'</div>';
  var rows=list.filter(function(p){ return _crF==='all'||_crCat(p)===_crF; });
  var dk=function(d){ return d?new Date(new Date(d).getTime()+3*3600000).toISOString().slice(0,10):'—'; };
  var today=dk(new Date()), yest=dk(new Date(Date.now()-86400000)), last='';
  rows.forEach(function(p){
    var k=dk(p.closed_at);
    if(k!==last){ last=k; var n=rows.filter(function(x){return dk(x.closed_at)===k;}).length;
      var lbl=k==='—'?'بدون تاريخ':((k===today?'اليوم · ':(k===yest?'أمس · ':''))+new Date(k+'T12:00:00Z').toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{weekday:'long',day:'numeric',month:'long'}));
      h+='<div style="display:flex;align-items:center;gap:10px;margin:16px 2px 9px"><b style="font-size:13.5px'+(k===today?';color:#1d4ed8':'')+'">'+lbl+'</b><span style="flex:1;height:1px;background:var(--border)"></span><span style="font-size:12px;color:var(--muted);font-weight:700">'+n+(n===1?' مشروع':(n===2?' مشروعين':' مشاريع'))+'</span></div>'; }
    h+=_crCard(p);
  });
  if(!rows.length)h+='<div style="padding:30px;text-align:center;color:var(--muted)">ما فيه مشاريع بهالتصنيف</div>';
  el.innerHTML=h;
}
function _crExtra(p){
  var x=[], fd=function(d){return new Date(d).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'long'});};
  var rm=p.reminded||[]; if(rm.length)x.push('<span style="color:#15803d">✓ ذكّرناه بالعروض '+(rm.length===1?'مرة':(rm.length===2?'مرتين':rm.length+' مرات'))+'</span>');
  if(p.revisit_at)x.push('<span style="color:#3730a3">⏰ نذكّره '+fd(p.revisit_at)+'</span>');
  if(p.self_pay)x.push('<span style="color:#b45309">💰 «'+esc(p.self_pay.name||'مزوّد')+'» سدّد سعي على هالمشروع'+(p.self_pay.status==='approved'?' (معتمد)':' — بانتظار اعتمادك')+'</span>');
  return x.length?'<div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px;font-weight:800;margin-top:7px">'+x.join('')+'</div>':'';
}
function _crTime(p){ return p.closed_at?'<span style="font-size:11.5px;font-weight:800;color:var(--muted);direction:ltr;unicode-bidi:isolate">'+new Date(p.closed_at).toLocaleTimeString('ar-SA-u-nu-latn',{hour:'numeric',minute:'2-digit'})+'</span>':''; }
function _crCard(p){
    if(p.close_reason==='no_suitable_offers')return '<div style="margin-bottom:9px">'+_crRow(p)+'</div>';
    var lbl=CR_LABELS[p.close_reason]||p.close_reason; var col=CR_COLORS[p.close_reason]||'#64748b';
    var _fd=function(d){return d?new Date(d).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short',year:'numeric'}):'';};
    var when=p.closed_at?'أُغلق '+_fd(p.closed_at):'';
    var ci=p.close_info||{};
    var who={client:['👤 العميل أغلقه','#b45309'],admin:['🛡 الإدارة','#0f766e'],auto:['⏱ تلقائي','#475569'],done:['✓ ترسية','#15803d'],deal:['🚫 بعد الترسية','#b91c1c']}[ci.by]||['',''];
    if(p.close_reason==='deal_cancelled'){ lbl='الاتفاق انلغى'; col='#b91c1c'; }
    if(_crTime(p))when='الساعة '+_crTime(p);
    var expl=(ci.text&&ci.by!=='done')?'<div style="font-size:12px;font-weight:700;color:var(--text2);margin-top:6px;line-height:1.7;background:var(--bg);border-radius:9px;padding:6px 9px"><b style="color:'+who[1]+'">'+who[0]+':</b> '+esc(ci.text)+(ci.open_days!=null?' · <span style="color:var(--muted)">ظل مفتوح '+ci.open_days+' يوم</span>':'')+'</div>':'';
    return '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;padding:13px 15px;margin-bottom:9px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div style="min-width:0"><div style="font-weight:800;font-size:13.5px">'+esc(p.title||'مشروع')+'</div><div style="font-size:11.5px;color:var(--muted);margin-top:3px">'+esc(p.client_name||'عميل')+' · '+(p.bid_count||0)+' عروض'+(p.created_at?' · نُشر '+_fd(p.created_at):'')+(when?' · '+when:'')+'</div>'+expl+(p.close_reason==='deal_cancelled'&&p.close_reason_note?'<div style="font-size:12px;font-weight:700;color:var(--text2);margin-top:5px">ملاحظة المزوّد: «'+esc(p.close_reason_note)+'»</div>':'')+_crExtra(p)+'</div><span style="flex-shrink:0;background:'+col+'1a;color:'+col+';font-size:11px;font-weight:800;padding:5px 11px;border-radius:14px;height:fit-content">'+esc(lbl)+'</span></div></div>';
}
function loadOutreach(){
  var b=document.getElementById('outreach-body');if(!b)return;
  b.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  Promise.all([
    fetch(API+'/api/admin/leads/stats',hdr()).then(function(r){return r.json();}).catch(function(){return{};}),
    fetch(API+'/api/admin/coverage-gaps',hdr()).then(function(r){return r.json();}).catch(function(){return{gaps:[]};})
  ]).then(function(res){ _renderOutreach(res[0]||{}, res[1]||{}); });
}

function _oDemCell(l,v){return '<div style="text-align:center"><div style="font-family:Cairo,sans-serif;font-size:30px;font-weight:900;line-height:1">'+(v||0)+'</div><div style="font-size:11px;opacity:.92;margin-top:4px;font-weight:700">'+l+'</div></div>';}
function _renderOutreach(st, cov){
  var b=document.getElementById('outreach-body');if(!b)return;
  var gaps=(cov.gaps||[]);
  var h='';
  // ═══ شريط الطلب — الرقم اللي يهم فعلاً ═══
  h+='<div style="margin-bottom:18px;padding:16px 16px 12px;background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:16px;color:#fff;box-shadow:0 8px 24px rgba(30,58,138,.22)">'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'
      +_oDemCell('📥 طلبات اليوم', st.req_today)
      +_oDemCell('🗓️ هذا الأسبوع', st.req_week)
      +_oDemCell('📅 هذا الشهر', st.req_month)
      +_oDemCell('🔴 مفتوحة الآن', st.req_open)
    +'</div>'
    +'<div style="font-size:11.5px;opacity:.85;text-align:center;margin-top:11px;border-top:1px solid rgba(255,255,255,.18);padding-top:9px">🎯 هذا هو الرقم الحقيقي — هدف الاستقطاب توليد الطلب، مو جمع الحسابات</div>'
  +'</div>';
  // ═══ أداة كراسة المشروع ═══
  h+='<div class="card"><div class="card-head"><h3>📋 كراسة مشروع — أرسلها لمزودين مطابقين</h3></div><div class="card-body">'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px">'
      +'<input id="o-brief-id" type="number" placeholder="رقم المشروع (id)" style="width:170px;padding:10px 12px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal;background:var(--white);color:var(--text)" onkeydown="if(event.key===\'Enter\')_oBriefLoad()">'
      +'<button onclick="_oBriefLoad()" style="background:var(--p);color:#fff;border:none;padding:10px 20px;border-radius:9px;font-family:Tajawal;font-weight:800;cursor:pointer">🎯 جِب المطابقين</button>'
      +'<span style="font-size:11.5px;color:var(--muted)">النظام يقترح مزودي الاستقطاب المطابقين (تخصص + مدينة) وأنت تختار وترسل.</span>'
    +'</div>'
    +'<div id="o-brief-out"></div>'
  +'</div></div>';
  // عدّاد الحد اليومي (حماية من الحظر)
  h+='<div id="o-daylimit" style="margin-bottom:16px"></div>';
  // الإحصائيات
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:12px;margin-bottom:20px">'
    +_oStat('👥 المستهدفين', st.total||0, 'var(--p)', 'var(--p-light)')
    +_oStat('📤 أُرسلت', st.sent||0, '#0284c7', '#e0f2fe')
    +_oStat('💬 ردّوا', (st.replied||0), '#d97706', '#fef3c7')
    +_oStat('✅ سجّلوا', st.converted||0, '#16a34a', '#dcfce7')
    +_oStat('📈 نسبة الرد', (st.reply_rate||0)+'%', '#0284c7', '#e0f2fe')
    +_oStat('🎯 نسبة التحويل', (st.convert_rate||0)+'%', '#16a34a', '#dcfce7')
    +_oStat('⏰ متابعات', st.due||0, '#dc2626', '#fee2e2')
    +'</div>';

  // طلبات بلا تغطية (تظهر فقط إن وُجدت)
  if(gaps.length){
    h+='<div class="card" style="border-right:3px solid #dc2626;margin-bottom:20px"><div class="card-head"><h3>🚨 طلبات بحاجة لمزودين</h3><span style="font-size:12px;color:var(--muted)">'+gaps.length+' طلب</span></div><div class="card-body" style="display:grid;gap:8px">';
    gaps.slice(0,6).forEach(function(g){
      h+='<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--bg);border-radius:10px;flex-wrap:wrap">'
        +'<div style="flex:1;min-width:180px"><div style="font-weight:800;font-size:13px">'+esc(g.title||'طلب')+'</div>'
        +'<div style="font-size:11.5px;color:var(--muted)">'+esc(g.category||'—')+' · '+esc(g.city||'—')+' · <span style="color:#dc2626;font-weight:800">'+(g.providers||0)+' مزوّد فقط</span></div></div>'
        +'<button onclick="_oHunt('+_jsa(encodeURIComponent(((g.category||'')+' '+(g.city||'')).trim()||(g.title||'')))+')" style="background:var(--p);color:#fff;border:none;padding:8px 14px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:12px;cursor:pointer">🎯 اصطد مزودين</button>'
        +'</div>';
    });
    h+='</div></div>';
  }

  // الصيد (بحث + طابور معاً في بطاقة)
  h+='<div class="card" style="margin-bottom:20px"><div class="card-head"><h3>🎯 الصيد</h3>'
    +'<div style="display:flex;gap:7px">'
    +'<button class="ftab" onclick="_oManualAdd()">➕ إضافة يدوية</button>'
    +'<button class="ftab" onclick="window._oImportType=\'provider\';document.getElementById(\'o-csv\').click()">📄 استيراد مزودين</button>'
    +'<button class="ftab" onclick="window._oImportType=\'client\';document.getElementById(\'o-csv\').click()">📄 استيراد عملاء</button>'
    +'<button class="ftab" onclick="_oDownloadTemplate()">⬇️ تحميل النموذج</button>'
    +'<input type="file" id="o-csv" accept=".csv,.xlsx,.xls" style="display:none" onchange="_oImportCSV(this)">'
    +'</div></div><div class="card-body">'
    +'<div style="display:flex;flex-wrap:wrap;gap:7px;align-items:center;margin-bottom:12px;padding:11px 13px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border:1px solid #bfdbfe;border-radius:10px">'
      +'<span style="font-size:12.5px;font-weight:800;color:#1e40af;width:100%;margin-bottom:2px">🎯 مولّدات الطلب (B2B) — اضغط فئة ثم اكنس مدينة:</span>'
      +Object.keys(_OB2B).map(function(k){return '<button onclick="_oB2Bset(\''+k+'\')" style="background:#fff;border:1px solid #bfdbfe;color:#1e40af;padding:7px 13px;border-radius:20px;font-family:Tajawal;font-size:12.5px;font-weight:800;cursor:pointer">'+_OB2B[k].emoji+' '+_OB2B[k].label+'</button>';}).join('')
    +'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
      +'<select id="o-type" style="padding:10px 12px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal;font-weight:700;background:var(--white);color:var(--text)"><option value="provider">مزوّد خدمة</option><option value="client">عميل B2B</option></select>'
      +'<input id="o-q" placeholder="مثال: تكييف الرياض · شركات إدارة أملاك جدة" style="flex:1;min-width:220px;padding:10px 12px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal;background:var(--white);color:var(--text)" onkeydown="if(event.key===\'Enter\')_oSearch()">'
      +'<button onclick="_oSearch()" style="background:var(--p);color:#fff;border:none;padding:10px 20px;border-radius:9px;font-family:Tajawal;font-weight:800;cursor:pointer">بحث</button>'
    +'</div>'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;padding:10px 12px;background:linear-gradient(135deg,#ecfdf5,#d1fae5);border:1px solid #a7f3d0;border-radius:10px">'
      +'<span style="font-size:12.5px;font-weight:800;color:#065f46">🧹 كنس مدينة أو منطقة كاملة</span>'
      +'<select id="o-sweep-city" style="padding:8px 10px;border:1px solid #a7f3d0;border-radius:9px;font-family:Tajawal;font-size:12.5px;font-weight:700;background:#fff;color:var(--text);cursor:pointer"><optgroup label="🗺️ مناطق كاملة">'+Object.keys(INV_REGIONS).map(function(rg){var cnt=INV_REGIONS[rg].length;return '<option value="region:'+rg+'">'+rg+' — كل مدنها ('+cnt+' مدينة)</option>';}).join('')+'</optgroup>'+Object.keys(INV_REGIONS).map(function(rg){return '<optgroup label="'+rg+'">'+INV_REGIONS[rg].map(function(c){return '<option value="'+c+'">'+c+(_OAREAS[c]?' ('+_OAREAS[c].length+' حي)':' (المدينة كاملة)')+'</option>';}).join('')+'</optgroup>';}).join('')+'</select>'
      +'<span style="font-size:11.5px;color:#065f46;font-weight:700">الهدف:</span>'
      +'<input id="o-sweep-target" type="number" value="300" min="20" max="1000" style="width:74px;padding:8px 10px;border:1px solid #a7f3d0;border-radius:9px;font-family:Tajawal;font-size:12.5px;background:#fff;color:var(--text);text-align:center">'
      +'<button id="o-sweep-btn" onclick="_oSweep()" style="background:#059669;color:#fff;border:none;padding:9px 16px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:12.5px;cursor:pointer">🧹 ابدأ الكنس</button>'
      +'<button id="o-sweep-stop" onclick="_oSweepStopFn()" style="display:none;background:#dc2626;color:#fff;border:none;padding:9px 16px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:12.5px;cursor:pointer">⏹ إيقاف</button>'
      +'<span style="font-size:11px;color:#065f46;width:100%;line-height:1.5">يستخدم التخصص المكتوب بالأعلى (مثال: <b>مكيفات</b>) ويكنس أحياء المدينة تلقائياً حتى يبلغ الهدف. كل حي = طلب مدفوع على رصيد Google.</span>'
    +'</div>'
    +'<div id="o-sweep-prog" style="display:none;font-size:12px;color:var(--text2);margin-bottom:10px;padding:9px 12px;background:var(--bg);border-radius:8px"></div>'
    +'<div id="o-results" style="margin-bottom:8px"></div>'
    +'<div style="border-top:1px solid var(--border);margin:4px 0 14px"></div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><div style="font-family:Cairo,sans-serif;font-weight:800;font-size:14px">📋 طابور الصيد</div><button class="ftab" onclick="_oLoadQueue()">تحديث</button></div>'
    +'<div id="o-queue"></div>'
    +'</div></div>';

  // المتابعة
  var _fsel='padding:8px 10px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal;font-size:12.5px;font-weight:700;background:var(--white);color:var(--text);cursor:pointer';
  var _fin='padding:8px 12px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal;font-size:12.5px;background:var(--white);color:var(--text)';
  var _statOpts=''; Object.keys(_OSTAT).forEach(function(k){ _statOpts+='<option value="'+k+'">'+_OSTAT[k]+'</option>'; });
  h+='<div class="card"><div class="card-head"><h3>📊 المتابعة</h3>'
    +'<div style="display:flex;gap:8px;align-items:center">'
    +'<span id="o-count" style="font-size:12px;color:var(--muted);font-weight:700"></span>'
    +'<button class="ftab" onclick="_oExport()">📥 تصدير</button>'
    +'<button class="ftab" onclick="_oDeleteByFilter()" style="background:#fef2f2;color:#dc2626;border-color:#fecaca">🗑️ حذف المطابق</button>'
    +'</div></div>'
    +'<div class="card-body">'
    +'<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:14px;padding:12px;background:var(--bg);border-radius:12px">'
      +'<input id="o-f-q" placeholder="🔍 بحث بالاسم أو الجوال" oninput="_oDeb(_oLoadList)" style="'+_fin+';flex:1;min-width:170px">'
      +'<select id="o-f-status" onchange="_oLoadList()" style="'+_fsel+'"><option value="">كل الحالات</option>'+_statOpts+'</select>'
      +'<select id="o-f-type" onchange="_oLoadList()" style="'+_fsel+'"><option value="">كل الأنواع</option><option value="provider">مزوّد</option><option value="client">عميل B2B</option></select>'
      +'<select id="o-f-tag" onchange="_oLoadList()" style="'+_fsel+'"><option value="">كل التصنيفات</option><option value="serious">جاد</option><option value="interested">مهتم</option><option value="potential">محتمل</option></select>'
      +'<select id="o-f-prio" onchange="_oLoadList()" style="'+_fsel+'"><option value="">كل الأولويات</option><option value="high">عالية (70+)</option><option value="mid">متوسطة (45–69)</option><option value="low">منخفضة (&lt;45)</option></select>'
      +'<select id="o-f-city" onchange="_oLoadList()" style="'+_fsel+'"><option value="">كل المدن</option></select>'
      +'<button id="o-f-maybe" data-on="0" onclick="_oToggleMaybe()" title="عرض المحتمل تسجيلهم فقط" style="'+_fsel+';border-color:#fde68a;color:#b45309">⚠️ محتمل سجّل</button>'
      +'<button class="ftab" onclick="_oClearFilters()" title="مسح كل الفلاتر" style="font-size:12px">✕ مسح</button>'
    +'</div>'
    +'<div id="o-list"></div></div></div>';

  b.innerHTML=h;
  _oFillCities();
  _oLoadList();
  _oLoadQueue();
  _oDayLimit();
}
function _oStat(l,v,c,bg){
  return '<div style="background:var(--white);border:1px solid var(--border);border-radius:14px;padding:14px 16px;box-shadow:var(--sh1);position:relative;overflow:hidden">'
    +'<div style="position:absolute;top:-8px;left:-8px;width:44px;height:44px;border-radius:50%;background:'+(bg||'var(--bg)')+';opacity:.6"></div>'
    +'<div style="font-size:11.5px;color:var(--muted);font-weight:700;margin-bottom:8px;position:relative">'+l+'</div>'
    +'<div style="font-family:Cairo,sans-serif;font-size:24px;font-weight:900;color:'+c+';letter-spacing:-.5px;position:relative">'+v+'</div></div>';
}
function _oHunt(q){
  var query=decodeURIComponent(q).trim();
  var el=document.getElementById('o-q');
  if(!el){ showPage('outreach'); setTimeout(function(){ _oHunt(q); }, 600); return; }
  var typeSel=document.getElementById('o-type'); if(typeSel)typeSel.value='provider';
  el.value=query;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  if(query)_oSearch(); else { el.focus(); toast('اكتب عبارة البحث','error'); }
}
// ═══ كراسة المشروع (توليد الطلب) ═══
var _oBrief=null;
// قفزة من صف مشروع في صفحة المشاريع إلى أداة الكراسة (معبّاة وجاهزة)
function _oBriefFromReq(id){
  var navBtn=null;
  document.querySelectorAll('.ni').forEach(function(n){ if((n.getAttribute('onclick')||'').indexOf("showPage('outreach'")>=0) navBtn=n; });
  showPage('outreach', navBtn);
  var tries=0;
  var iv=setInterval(function(){
    var f=document.getElementById('o-brief-id');
    if(f){ clearInterval(iv); f.value=id; _oBriefLoad(); var out=document.getElementById('o-brief-out'); if(out)out.scrollIntoView({behavior:'smooth',block:'center'}); }
    else if(++tries>25){ clearInterval(iv); }
  },150);
}
function _oBriefLoad(){
  var id=parseInt((document.getElementById('o-brief-id')||{}).value)||0;
  var out=document.getElementById('o-brief-out'); if(!out)return;
  if(!id){ toast('اكتب رقم المشروع','error'); return; }
  // اقرأ الفلاتر اليدوية إن كانت ظاهرة (بعد أول تحميل)
  var g=function(k){var e=document.getElementById(k);return e?e.value:null;};
  var qs=[], fc=g('o-bf-city'), fk=g('o-bf-cat'), fs=g('o-bf-score');
  if(fc!==null)qs.push('city='+encodeURIComponent(fc));
  if(fk!==null)qs.push('cat='+encodeURIComponent(fk));
  if(fs!==null&&fs!=='')qs.push('min_score='+encodeURIComponent(fs));
  out.innerHTML='<div style="text-align:center;padding:14px;color:var(--muted);font-size:12px">جاري الجلب...</div>';
  fetch(API+'/api/admin/requests/'+id+'/match-leads'+(qs.length?'?'+qs.join('&'):''),hdr()).then(function(r){return r.json();}).then(function(d){
    if(d.message||!d.project){ out.innerHTML='<div style="color:#dc2626;font-size:12.5px;padding:8px">'+esc(d.message||'المشروع غير موجود')+'</div>'; return; }
    _oBrief=d; var p=d.project, L=d.leads||[], f=d.filters||{};
    var ms=parseInt(f.min_score)||0;
    var fin='padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-family:Tajawal;font-size:12px;background:#fff;color:var(--text)';
    var h='<div style="background:var(--bg);border-radius:12px;padding:12px 14px;margin-bottom:12px">'
      +'<div style="font-weight:800;color:var(--p);margin-bottom:4px;font-size:13px">'+esc(p.title||'مشروع')+'</div>'
      +'<div style="color:var(--muted);font-size:12px">'+[p.category,p.city].filter(Boolean).map(esc).join(' · ')+(p.budget_max?' · '+Number(p.budget_max).toLocaleString('en-US')+' ر.س':'')+'</div>'
      +'<div style="margin-top:9px;display:flex;gap:6px;flex-wrap:wrap">'
        +'<input readonly value="'+esc(d.brief_url)+'" onclick="this.select()" style="flex:1;min-width:170px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:11.5px;direction:ltr;text-align:left;background:#fff;color:var(--text)">'
        +'<button onclick="_oBriefCopy()" style="background:var(--p);color:#fff;border:none;padding:8px 14px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer">📋 نسخ</button>'
        +'<a href="'+esc(_safeUrl(d.brief_url))+'" target="_blank" style="background:#fff;border:1px solid var(--border);color:var(--text);padding:8px 12px;border-radius:8px;font-size:12px;font-weight:800;text-decoration:none">🔗 فتح</a>'
      +'</div></div>';
    // شريط البحث المرن عن المزودين
    h+='<div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center;margin-bottom:12px;padding:11px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px">'
      +'<span style="font-size:12px;font-weight:800;color:#1e40af;width:100%;margin-bottom:2px">🔍 عدّل التخصص أو المدينة لمطابقة مزودين مختلفين:</span>'
      +'<input id="o-bf-city" value="'+esc(f.city||'')+'" placeholder="المدينة (فارغ=الكل)" style="'+fin+';flex:1;min-width:120px">'
      +'<input id="o-bf-cat" list="o-bf-cat-list" value="'+esc(f.cat||'')+'" placeholder="اكتب التخصص (مثال: سكوريت، زجاج، شاور)" style="'+fin+';flex:1.4;min-width:150px">'
      +'<datalist id="o-bf-cat-list"><option value="زجاج ومرايا"><option value="سكوريت"><option value="شاور"><option value="واجهات زجاجية"><option value="تبريد وتكييف"><option value="سباكة"><option value="كهرباء"><option value="نجارة"><option value="تنظيف"><option value="نقل عفش"><option value="حدادة"><option value="ألمنيوم"><option value="مسابح"><option value="كاميرات مراقبة"><option value="دهانات وديكور"><option value="بلاط ورخام"><option value="تركيب أثاث"><option value="باركيه"><option value="تنظيف سجاد وكنب"><option value="مكافحة حشرات"><option value="عزل حراري"><option value="جبس"><option value="تركيب مطابخ"><option value="تركيب وصيانة مصاعد"><option value="ترميم مبانٍ"></datalist>'
      +'<select id="o-bf-score" style="'+fin+';cursor:pointer"><option value="0"'+(ms===0?' selected':'')+'>كل الأولويات</option><option value="45"'+(ms===45?' selected':'')+'>متوسطة (45+)</option><option value="70"'+(ms===70?' selected':'')+'>عالية (70+)</option></select>'
      +'<button onclick="_oBriefLoad()" style="background:#1e40af;color:#fff;border:none;padding:8px 18px;border-radius:8px;font-family:Tajawal;font-size:12.5px;font-weight:800;cursor:pointer">🔍 بحث</button>'
      +'<span style="font-size:11px;color:#64748b;width:100%;margin-top:3px">💡 تقدر تكتب أي كلمة في خانة التخصص (مثل «سكوريت» بدل «زجاج») ليطابق مزودين أدق، ثم اضغط بحث.</span>'
    +'</div>';
    if(!L.length){
      h+='<div style="color:var(--muted);font-size:12.5px;text-align:center;padding:14px;line-height:1.9;background:#fffbeb;border:1px solid #fde68a;border-radius:10px">✅ <b>تم البحث</b> — لكن ما فيه مزوّد بهذا التخصص «'+esc(f.cat||'')+'»'+(f.city?' في «'+esc(f.city)+'»':'')+'.<br><span style="font-size:11.5px">جرّب كلمة أعم (مثل «زجاج» بدل «سكوريت»)، أو امسح الفلاتر، أو اصطد مزودين جدد من قسم الصيد.</span><br><button onclick="_oBriefWiden()" style="margin-top:9px;background:#1e40af;color:#fff;border:none;padding:8px 18px;border-radius:8px;font-family:Tajawal;font-size:12px;font-weight:800;cursor:pointer">↺ وسّع البحث (امسح الفلاتر)</button></div>';
    } else {
      h+='<div style="font-size:12px;color:var(--muted);margin-bottom:8px">'+L.length+' مزوّد — أرسل لهم الكراسة:</div><div style="display:grid;gap:7px;max-height:320px;overflow:auto">';
      L.forEach(function(l){
        h+='<div style="display:flex;align-items:center;gap:8px;padding:9px 11px;background:var(--bg);border-radius:9px;font-size:12.5px">'
          +'<div style="flex:1;min-width:0"><div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(l.name||'مزود')+'</div><div style="font-size:11px;color:var(--muted)">'+[l.category,l.city].filter(Boolean).map(esc).join(' · ')+'</div></div>'
          +'<span style="font-size:11px;font-weight:800;color:'+(l.score>=70?'#16a34a':l.score>=45?'#d97706':'var(--muted)')+'">'+(l.score||0)+'</span>'
          +(l.phone_norm?'<button onclick="_oBriefSend('+l.id+')" style="background:#25D366;color:#fff;border:none;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap">💬 أرسل</button>':'')
          +'</div>';
      });
      h+='</div>';
    }
    out.innerHTML=h;
  }).catch(function(){ out.innerHTML='<div style="color:#dc2626;font-size:12.5px;padding:8px">تعذّر الجلب</div>'; });
}
function _oBriefCopy(){ if(_oBrief&&_oBrief.brief_url)navigator.clipboard.writeText(_oBrief.brief_url).then(function(){toast('تم نسخ رابط الكراسة','success');}).catch(function(){}); }
// وسّع البحث: امسح فلاتر المدينة والتخصص وابحث من جديد
function _oBriefWiden(){
  var c=document.getElementById('o-bf-city'); if(c)c.value='';
  var k=document.getElementById('o-bf-cat'); if(k)k.value='';
  var s=document.getElementById('o-bf-score'); if(s)s.value='0';
  _oBriefLoad();
}
function _oBriefSend(id){
  if(!_oBrief)return;
  var l=(_oBrief.leads||[]).find(function(x){return x.id===id;}); if(!l||!l.phone_norm)return;
  var p=_oBrief.project;
  var msg='السلام عليكم '+(l.name||'')+' 👋\nفيه مشروع «'+(p.title||'')+'»'+(p.city?' في '+p.city:'')+' يدوّر عروض أسعار'+(p.budget_max?' (ميزانية تقريبية '+Number(p.budget_max).toLocaleString('en-US')+' ر.س)':'')+'.\nشوف التفاصيل والصور وقدّم عرضك 👇\n'+_oBrief.brief_url+'\nالتسجيل مجاني، وتوصلك مشاريع في تخصصك ومدينتك.';
  window.open('https://api.whatsapp.com/send?phone='+l.phone_norm+'&text='+encodeURIComponent(msg)+'&type=phone_number&app_absent=0','_blank');
}
// ═══ مولّدات الطلب (B2B) — جهات تحتاج خدمات متكررة ═══
var _OB2B={
  realestate:{emoji:'🏢',label:'إدارات أملاك',term:'شركات إدارة أملاك عقارية'},
  hotels:{emoji:'🏨',label:'فنادق وشقق',term:'شقق مفروشة وفنادق'},
  restaurants:{emoji:'🍽️',label:'مطاعم وكافيهات',term:'مطاعم وكافيهات'},
  clinics:{emoji:'🏥',label:'عيادات ومجمعات طبية',term:'عيادات ومجمعات طبية'},
  contractors:{emoji:'🏗️',label:'مقاولون',term:'شركات مقاولات عامة'},
  malls:{emoji:'🏬',label:'مجمعات تجارية',term:'مجمعات ومراكز تجارية'}
};
function _oB2Bset(k){
  var b=_OB2B[k]; if(!b)return;
  var t=document.getElementById('o-type'); if(t)t.value='client';
  var q=document.getElementById('o-q'); if(q){ q.value=b.term; q.focus(); }
  toast('جاهز: '+b.label+' — اضغط «بحث» أو اكنس مدينة كاملة','success');
}
// ═══ قوائم أحياء المدن (للكنس التلقائي) ═══
var _OAREAS={
'الرياض':['العليا','الملقا','النرجس','الياسمين','الملز','النخيل','السليمانية','المروج','الورود','حطين','الربيع','الصحافة','القيروان','العارض','النفل','الغدير','الوادي','المغرزات','الرحمانية','الرائد','السويدي','العزيزية','المنصورة','الشفا','بدر','الحمراء','الروضة','النسيم','اليرموك','قرطبة','إشبيلية','المونسية','الرمال','طويق','ظهرة لبن','عرقة','ديراب','لبن','الخزامى','السفارات','المعذر','أم الحمام','الديرة','الفيصلية'],
'الخرج':['السلام','الفيصلية','النسيم','الروضة','الملك فهد','الخزامى','المنتزه','العزيزية','نعجان','اليمامة','الهدى','المروج','الناصفة','الرابية'],
'جدة':['الروضة','السلامة','الشاطئ','الحمراء','النعيم','المرجان','البساتين','الصفا','المروة','النزهة','الفيصلية','الأندلس','السامر','النسيم','الربوة','الرحاب','الزهراء','بني مالك','الفيحاء','مشرفة','الخالدية','الرويس','البوادي','الواحة','أبحر الشمالية','أبحر الجنوبية','الشرفية','البلد','الكندرة','الثغر','الجامعة','الأجواد','الصواري','اللؤلؤ','الفلاح','المحمدية','البغدادية','النهضة','الحمدانية'],
'مكة المكرمة':['العزيزية','الشوقية','النسيم','الششة','العوالي','بطحاء قريش','الزاهر','الرصيفة','الكعكية','جرول','المسفلة','الهجرة','العتيبية','ريع ذاخر','الخالدية','الروضة','النزهة','المعابدة','الهنداوية','الشرائع'],
'المدينة المنورة':['قباء','العنابس','العزيزية','الدفاع','شظاة','الحرة الشرقية','الحرة الغربية','بني حارثة','الأزهري','الرانوناء','السيح','النخيل','سلطانة','طيبة','الخالدية','العريض','أبو كبير','بني ظفر','قربان','المطار'],
'الدمام':['الشاطئ','الفيصلية','النور','الجلوية','البادية','الأمانة','الروضة','المزروعية','الأنوار','بدر','الفنار','الزهور','أحد','النخيل','الطبيشي','غرناطة','قرطبة','الإسكان','المنار','الجامعيين','الضباب','الواحة','الريان','طيبة','الحمراء'],
'الخبر':['العقربية','الثقبة','الراكة','الخبر الشمالية','الخبر الجنوبية','الحزام الذهبي','الحزام الأخضر','الجسر','الأندلس','الكورنيش','اليرموك','الدوحة','الهدا','اللؤلؤ','التحلية','البندرية','الجوهرة','الخزامى','الروابي','الصواري'],
'الظهران':['الدوحة الشمالية','الدوحة الجنوبية','القشلة','هجر','تلال','الجامعة','الحزم','السلام'],
'الأحساء':['النايفية','الصالحية','الراشدية','المزروع','الحزم','محاسن','السلمانية','البصيرة','الخالدية','الرقيقة','السنيدية','العزيزية'],
'الطائف':['الشهار','الحوية','السلامة','الفيصلية','الوسام','القيم','معشي','الردف','نخب','السداد','الشرقية','قروى','الملص','السليمانية'],
'تبوك':['العزيزية','المروج','الورود','سلطانة','الفيصلية','الروضة','المصيف','الأخضر','السلام','الريان','الخالدية','النخيل'],
'بريدة':['الصفراء','الأخضر','الريان','الرحاب','الفايزية','النهضة','الروضة','الإسكان','الشماس','الصالحية','الوسيطاء','الرمال'],
'عنيزة':['المطار','الشرقية','الروضة','النهضة','الفايزية','السالمية','الخبيب','المروج'],
'حائل':['النقرة','السمراء','البدنة','المطار','الوسيطى','الزبارة','لبدة','صبابة','المنتزه','بقعاء'],
'أبها':['المنسك','المفتاحة','الموظفين','النصب','السد','الخالدية','الأندلس','الربوة','شعف','المروج'],
'خميس مشيط':['الراقي','شكر','الموسى','الربوة','النزهة','الواحة','تندحة','الأندلس','الخالدية','الفتح'],
'نجران':['الفهد','الغويلاء','الفيصلية','الأمير مشعل','الملك فهد','أبا السعود','نهوقة','الحصينية'],
'جازان':['الروضة','الصفا','المطار','الشاطئ','الرحاب','النهضة','مطلع','الملك فهد'],
'ينبع':['الشرم','الهيئة الملكية','الصبيا','الناصفة','البلد','رضوى','الفيصلية','السميري'],
'الجبيل':['الفناتير','الدفي','الهيئة الملكية','البلد','مطرفية','الحويلات','الجلمودة','الصناعية'],
'القطيف':['القلعة','الشويكة','الكويكب','الناصرة','الجارودية','الملاحة','الجش','صفوى'],
'عرعر':['المنتزه','المساعدية','البلدية','الفيصلية','الروضة','النخيل'],
'سكاكا':['العزيزية','الشلهوب','الفيصلية','الروضة','القادسية','النسيم'],
'الرس':['الملك فهد','النهضة','الروضة','الفايزية','العزيزية','الصفراء','المنتزه','الخالدية'],
'حفر الباطن':['المحمدية','العزيزية','الفيصلية','النخيل','الروضة','المنتزه','الخالدية','النسيم','الجامعيين','الصناعية'],
'المجمعة':['الملك فهد','النسيم','الروضة','الفيصلية','العزيزية','المنتزه','الخالدية','البستان'],
'الزلفي':['الروضة','النهضة','الفايزية','الملك فهد','المنتزه','النسيم','العزيزية'],
'شقراء':['الروضة','النهضة','الملك فهد','العزيزية','المنتزه','الفيصلية'],
'الدوادمي':['الملك فهد','النهضة','الروضة','الفيصلية','العزيزية','المنتزه','النسيم','الخالدية'],
'القويعية':['الروضة','النهضة','الملك فهد','العزيزية','المنتزه','الفيصلية'],
'وادي الدواسر':['اللدام','الخماسين','النسيم','الروضة','الفيصلية','المنتزه','الملك فهد'],
'القريات':['الأندلس','النسيم','الروضة','الفيصلية','المحمدية','العزيزية','الملك فهد','السلام'],
'دومة الجندل':['الروضة','النسيم','الملك فهد','الفيصلية','العزيزية','المنتزه'],
'رفحاء':['المطار','الروضة','النسيم','الفيصلية','المنتزه','الصناعية'],
'طريف':['الروضة','النسيم','الملك فهد','الفيصلية','المنتزه','الصناعية'],
'الباحة':['المنتزه','الروضة','شكران','الظفير','الزرقاء','بني سار','الشرف','العمود'],
'بيشة':['الروضة','النسيم','الملك فهد','الفيصلية','العزيزية','المنتزه','الربوة','الخالدية'],
'محايل عسير':['المجاردة','الروضة','النسيم','الفيصلية','المنتزه','الخالدية'],
'صبيا':['الروضة','النسيم','الملك فهد','الفيصلية','العزيزية','المنتزه'],
'أبو عريش':['الروضة','النسيم','الملك فهد','الفيصلية','العزيزية','المنتزه'],
'الليث':['الروضة','النسيم','الملك فهد','الفيصلية','الكورنيش','المنتزه'],
'القنفذة':['الروضة','النسيم','الملك فهد','الفيصلية','الكورنيش','المنتزه','الخالدية'],
'رابغ':['الروضة','النسيم','الملك فهد','الفيصلية','الكورنيش','المنتزه'],
'ضباء':['الروضة','النسيم','الملك فهد','الفيصلية','الكورنيش','المنتزه'],
'الوجه':['الروضة','النسيم','الملك فهد','الفيصلية','الكورنيش','المنتزه'],
'تيماء':['الروضة','النسيم','الملك فهد','الفيصلية','العزيزية','المنتزه']
};
var _oSweepStop=false;
function _oSweepStopFn(){ _oSweepStop=true; var s=document.getElementById('o-sweep-stop'); if(s)s.textContent='...جارٍ الإيقاف'; }
async function _oSweep(){
  var term=((document.getElementById('o-q')||{}).value||'').trim();
  if(!term){ toast('اكتب التخصص أولاً بالأعلى (مثال: مكيفات)','error'); var qi=document.getElementById('o-q'); if(qi)qi.focus(); return; }
  var sel=(document.getElementById('o-sweep-city')||{}).value||'';
  var targets=[];
  if(sel.indexOf('region:')===0){
    var _rg=sel.slice(7); (INV_REGIONS[_rg]||[]).forEach(function(c){ if(_OAREAS[c]) _OAREAS[c].forEach(function(a){ targets.push({city:c,area:a}); }); else targets.push({city:c,area:''}); });
    if(!targets.length){ toast('لا توجد مدن في هذه المنطقة','error'); return; }
  } else {
    if(!sel){ toast('اختر مدينة أو منطقة','error'); return; }
    // مدينة بدون قائمة أحياء: نبحث فيها كاملة
    if(_OAREAS[sel]) _OAREAS[sel].forEach(function(a){ targets.push({city:sel,area:a}); }); else targets.push({city:sel,area:''});
  }
  var target=parseInt((document.getElementById('o-sweep-target')||{}).value)||300;
  _oSweepStop=false;
  var btn=document.getElementById('o-sweep-btn'), stop=document.getElementById('o-sweep-stop'), prog=document.getElementById('o-sweep-prog');
  if(btn){ btn.disabled=true; btn.style.opacity='.5'; }
  if(stop){ stop.style.display='inline-block'; stop.textContent='⏹ إيقاف'; }
  if(prog)prog.style.display='block';
  var seen={}, acc=[], newCnt=0;
  var rbox=document.getElementById('o-results'); if(rbox)rbox.innerHTML='';
  for(var i=0;i<targets.length;i++){
    if(_oSweepStop) break;
    if(acc.length>=target) break;
    var _tc=targets[i].city, area=targets[i].area;
    if(prog)prog.innerHTML='⏳ يكنس: <b>'+esc(area||'المدينة كاملة')+'</b> — '+esc(_tc)+' ('+(i+1)+'/'+targets.length+') · جُمِع <b style="color:#059669">'+acc.length+'</b> · جديد بأرقام <b style="color:#16a34a">'+newCnt+'</b>';
    try{
      var d=await fetch(API+'/api/admin/leads/search',{method:'POST',headers:hdr().headers,body:JSON.stringify({query:(term+' '+(area?area+' ':'')+_tc).trim(),pages:area?2:3})}).then(function(r){return r.json();});
      (d.results||[]).forEach(function(p){
        if(p.place_id && !seen[p.place_id]){ seen[p.place_id]=1; acc.push(p); if(!p.exists && p.phone_norm) newCnt++; }
      });
    }catch(e){}
  }
  _oRenderResults(acc);
  if(btn){ btn.disabled=false; btn.style.opacity='1'; }
  if(stop)stop.style.display='none';
  if(prog)prog.innerHTML=(_oSweepStop?'⏹ أُوقف الكنس':'✅ انتهى الكنس')+' · جُمِع <b>'+acc.length+'</b> منشأة (بعد إزالة التكرار) · جديد بأرقام <b style="color:#16a34a">'+newCnt+'</b> — راجع القائمة بالأسفل واضغط «➕ أضف الجدد».';
}
function _oSearch(){
  var q=(document.getElementById('o-q')||{}).value||'';
  var box=document.getElementById('o-results');
  if(!q.trim()){ if(box)box.innerHTML='<div style="color:var(--muted);font-size:12.5px">اكتب عبارة البحث</div>'; return; }
  box.innerHTML='<div class="loading"><div class="spinner"></div>جاري البحث في Google Maps...</div>';
  fetch(API+'/api/admin/leads/search',{method:'POST',headers:hdr().headers,body:JSON.stringify({query:q,pages:3})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.message){ box.innerHTML='<div style="color:#dc2626;font-size:12.5px;padding:10px;background:rgba(220,38,38,.08);border-radius:8px">'+esc(d.message)+'</div>'; return; }
      _oRenderResults(d.results||[]);
    }).catch(function(){ box.innerHTML='<div style="color:#dc2626;font-size:12.5px">تعذّر البحث</div>'; });
}
function _oRenderResults(list){
  var box=document.getElementById('o-results'); if(!box)return;
  _OSearch=list||[];
  if(!_OSearch.length){ box.innerHTML='<div style="color:var(--muted);font-size:12.5px">لا نتائج</div>'; return; }
  var neu=_OSearch.filter(function(x){return !x.exists && x.phone_norm;});
  var h='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">'
    +'<div style="font-size:12.5px;color:var(--muted)">وُجد <b style="color:var(--text2)">'+_OSearch.length+'</b> · جديد بأرقام: <b style="color:#16a34a">'+neu.length+'</b></div>'
    +'<button onclick="_oAddAll()" style="background:#16a34a;color:#fff;border:none;padding:9px 18px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:12.5px;cursor:pointer">➕ أضف الجدد ('+neu.length+')</button></div>';
  h+='<div style="display:grid;gap:7px;max-height:340px;overflow:auto">';
  _OSearch.forEach(function(p){
    h+='<div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bg);border-radius:9px;font-size:12.5px;'+(p.exists?'opacity:.5':'')+'">'
      +'<div style="flex:1;min-width:0"><div style="font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.name)+'</div>'
      +'<div style="font-size:11px;color:var(--muted)">'+(p.rating?'⭐'+p.rating+' ('+p.reviews_count+')':'بلا تقييم')+(p.phone?' · '+esc(p.phone):' · <span style="color:#dc2626">بلا رقم</span>')+'</div></div>'
      +'<span style="font-size:11px;font-weight:800;color:'+(p.score>=70?'#16a34a':p.score>=45?'#d97706':'var(--muted)')+'">'+p.score+'</span>'
      +(p.exists?'<span style="font-size:10.5px;color:var(--muted)">موجود</span>':'')
      +'</div>';
  });
  h+='</div>';
  box.innerHTML=h;
}
function _oAddAll(){
  var type=(document.getElementById('o-type')||{}).value||'provider';
  var items=_OSearch.filter(function(x){return !x.exists && x.phone_norm;}).map(function(x){
    return { lead_type:type, name:x.name, phone:x.phone, category:x.type||null, city:_oCity(x.address), address:x.address, rating:x.rating, reviews_count:x.reviews_count, website:x.website, place_id:x.place_id };
  });
  if(!items.length){ toast('لا يوجد جديد بأرقام','error'); return; }
  fetch(API+'/api/admin/leads',{method:'POST',headers:hdr().headers,body:JSON.stringify({items:items,lead_type:type})})
    .then(function(r){return r.json();}).then(function(d){
      toast('أُضيف '+(d.added||0)+' مستهدف','success');
      loadOutreach();
    }).catch(function(){ toast('تعذّر الحفظ','error'); });
}
function _oCity(addr){
  if(!addr) return null;
  // الأطول أولاً (عشان «رياض الخبراء» ما تنقرأ «الخبر») — بعدها أسماء مختصرة شائعة في العناوين
  var cities=["المدينة المنورة", "حوطة بني تميم", "وادي الدواسر", "رياض الخبراء", "ظهران الجنوب", "أحد المسارحة", "عيون الجواء", "عقلة الصقور", "مكة المكرمة", "قرية العليا", "غامد الزناد", "دومة الجندل", "حفر الباطن", "محايل عسير", "سراة عبيدة", "بدر الجنوب", "المزاحمية", "النبهانية", "مهد الذهب", "رأس تنورة", "خميس مشيط", "رجال ألمع", "أحد رفيدة", "العويقيلة", "الدوادمي", "القويعية", "البكيرية", "الشماسية", "الحناكية", "النعيرية", "العوامية", "المجاردة", "أبو عريش", "المجمعة", "الأفلاج", "حريملاء", "الدرعية", "البدائع", "الأسياح", "الخبراء", "القنفذة", "الظهران", "الأحساء", "الغزالة", "السليمي", "العارضة", "المخواة", "القريات", "الرياض", "الزلفي", "الحريق", "السليل", "المذنب", "الطائف", "الجموم", "الكامل", "المويه", "الخرمة", "الدمام", "الجبيل", "القطيف", "الخفجي", "النماص", "الحرجة", "الشنان", "الشملي", "الباحة", "بلجرشي", "المندق", "العقيق", "الخرج", "شقراء", "الغاط", "ضرماء", "الدلم", "بريدة", "عنيزة", "الليث", "العلا", "العيص", "المهد", "الخبر", "سيهات", "تثليث", "تنومة", "بلقرن", "الوجه", "تيماء", "البدع", "بقعاء", "رفحاء", "جازان", "صامطة", "فيفاء", "الدرب", "الريث", "الحرث", "نجران", "شرورة", "حبونا", "القرى", "سكاكا", "طبرجل", "عفيف", "ثادق", "رماح", "مرات", "ضرما", "الرس", "ضرية", "رابغ", "خليص", "تربة", "رنية", "بحرة", "ينبع", "خيبر", "بقيق", "صفوى", "أبها", "بيشة", "قيال", "تبوك", "ضباء", "أملج", "حائل", "موقق", "عرعر", "طريف", "صبيا", "يدمة", "قلوة", "صوير", "جدة", "أضم", "بدر", "حقل", "بيش", "ضمد", "ثار"];
  for(var i=0;i<cities.length;i++){ if(addr.indexOf(cities[i])>-1) return cities[i]; }
  var alias=[['الهفوف','الأحساء'],['مكة','مكة المكرمة'],['المدينة','المدينة المنورة']];
  for(var j=0;j<alias.length;j++){ if(addr.indexOf(alias[j][0])>-1) return alias[j][1]; }
  return null;
}
function _oLoadQueue(){
  var box=document.getElementById('o-queue');if(!box)return;
  box.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  var type=(document.getElementById('o-type')||{}).value||'provider';
  fetch(API+'/api/admin/leads/queue?type='+type,hdr()).then(function(r){return r.json();}).then(function(d){
    _OQ=d.leads||[]; _OQi=0;
    if(!_OQ.length){ box.innerHTML='<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">✅ لا أحد في الطابور — اصطد مستهدفين جدد</div>'; return; }
    _oRenderCard();
  }).catch(function(){ box.innerHTML='<div style="color:#dc2626;font-size:12.5px">تعذّر الجلب</div>'; });
}
function _oRenderCard(){
  var box=document.getElementById('o-queue');if(!box)return;
  if(_OQi>=_OQ.length){ box.innerHTML='<div style="text-align:center;padding:24px;color:#16a34a;font-size:14px;font-weight:800">🎉 خلّصت الطابور!</div>'; return; }
  var l=_OQ[_OQi];
  var msg=_oMsg(l);
  box.innerHTML='<div style="border:1.5px solid var(--p);border-radius:14px;padding:16px">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap">'
      +'<div style="font-family:Cairo,sans-serif;font-weight:900;font-size:16px;color:var(--p)">'+esc(l.name)+'</div>'
      +'<span style="background:'+(l.score>=70?'rgba(22,163,74,.12)':'rgba(217,119,6,.12)')+';color:'+(l.score>=70?'#16a34a':'#d97706')+';font-size:11.5px;font-weight:800;padding:4px 10px;border-radius:20px">أولوية '+l.score+'</span></div>'
    +'<div style="font-size:12px;color:var(--muted);margin-bottom:10px">'+(l.rating?'⭐ '+l.rating+' ('+(l.reviews_count||0)+' مراجعة) · ':'')+esc(l.category||'—')+' · '+esc(l.city||'—')+' · '+esc(l.phone||'')+'</div>'
    +(l.matched_request?'<div style="background:var(--p-light,rgba(37,99,235,.08));border-radius:10px;padding:10px 12px;margin-bottom:10px;font-size:12px"><b style="color:var(--p)">📋 طلب مطابق:</b> '+esc(l.matched_request.title)+(l.matched_request.budget_max?' — <b>'+Number(l.matched_request.budget_max).toLocaleString('en-US')+' ر.س</b>':'')+'</div>':'')
    +'<textarea id="o-msg" style="width:100%;min-height:110px;padding:11px;border:1px solid var(--border);border-radius:10px;font-family:Tajawal;font-size:12.5px;line-height:1.7;background:var(--white);color:var(--text);resize:vertical">'+esc(msg)+'</textarea>'
    +'<button onclick="_oGenMsg('+l.id+',this)" style="margin-top:8px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;padding:8px 14px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:12px;cursor:pointer">✨ رسالة ذكية (Claude)</button>'
    +'<div style="display:flex;gap:8px;margin-top:11px;flex-wrap:wrap">'
      +'<button onclick="_oSend()" style="flex:1;min-width:150px;background:#25D366;color:#fff;border:none;padding:12px;border-radius:10px;font-family:Tajawal;font-weight:800;font-size:13.5px;cursor:pointer">📤 إرسال واتساب</button>'
      +'<button onclick="_oSkip()" style="background:var(--bg);border:1px solid var(--border);color:var(--text2);padding:12px 18px;border-radius:10px;font-family:Tajawal;font-weight:800;font-size:13px;cursor:pointer">تخطّي</button>'
      +'<button onclick="_oSetStatus('+l.id+',\'rejected\')" style="background:var(--bg);border:1px solid var(--border);color:#dc2626;padding:12px 16px;border-radius:10px;font-family:Tajawal;font-weight:800;font-size:13px;cursor:pointer">رفض</button>'
    +'</div>'
    +'<div style="text-align:center;margin-top:10px;font-size:11.5px;color:var(--muted)">'+(_OQi+1)+' من '+_OQ.length+'</div></div>';
}
// رسالة الاستقطاب + رابط صفحة التطبيق المختصر (للمزوّدين): يوصلهم كل مشروع جديد لحظة نشره
function _oMsg(l){
  var m=_oMsgBase(l);
  if(l&&l.lead_type!=='client') m+='\n\n📱 حمّل تطبيق مناقصة ويوصلك كل مشروع جديد بتخصصك لحظة نشره:\nmanaqasa.com/app/p';
  return m;
}
function _oMsgBase(l){
  var nm=l.name||'';
  if(l.lead_type==='client'){
    return 'السلام عليكم '+nm+' 👋\n\nتحتاجون خدمات صيانة أو تنفيذ بشكل متكرّر؟\nفي منصة مناقصة تنشرون طلبكم مجاناً، وتوصلكم عروض أسعار من عدة مزودين معتمدين خلال ساعات — تقارنون وتختارون الأنسب.\n\nشوفوا كيف تخدمكم المنصة 👇\nhttps://www.manaqasa.com/b2b';
  }
  if(l.matched_request){
    var r=l.matched_request;
    return 'السلام عليكم '+nm+' 👋\n\nعندنا عميل في '+(r.city||l.city||'')+' يبي «'+r.title+'»'+(r.budget_max?' بميزانية '+Number(r.budget_max).toLocaleString('en-US')+' ر.س':'')+' 🔥\n\nتبون تقدّمون عرض؟ التسجيل مجاني وتوصلكم الطلبات في تخصصكم أول بأول:\nhttps://www.manaqasa.com';
  }
  return 'السلام عليكم '+nm+' 👋\n\nشفنا تقييمكم الممتاز في '+(l.city||'')+' لخدمات '+(l.category||'')+'.\nفي منصة مناقصة عملاء يبحثون عن خدمتكم يومياً — نضيفكم مجاناً وتوصلكم الطلبات مباشرة؟\n\nhttps://www.manaqasa.com';
}
function _oSend(){
  var l=_OQ[_OQi]; if(!l) return;
  var msg=(document.getElementById('o-msg')||{}).value||_oMsg(l);
  var url='https://api.whatsapp.com/send?phone='+l.phone_norm+'&text='+encodeURIComponent(msg)+'&type=phone_number&app_absent=0';
  window.open(url,'_blank');
  _oSetStatus(l.id,'contacted',3);
  setTimeout(_oDayLimit, 800);
}
function _oSkip(){ _OQi++; _oRenderCard(); }

// ═══ عدّاد الحد اليومي ═══
function _oDayLimit(){
  var box=document.getElementById('o-daylimit');if(!box)return;
  fetch(API+'/api/admin/leads/sent-today',hdr()).then(function(r){return r.json();}).then(function(d){
    var n=d.count||0, lim=d.limit||50, pct=Math.min(100,Math.round(n/lim*100));
    var col=n>=lim?'#dc2626':n>=lim*0.8?'#d97706':'#16a34a';
    var msg=n>=lim?'⛔ وصلت الحد اليومي — وقّف الإرسال لحماية رقمك':n>=lim*0.8?'⚠️ اقتربت من الحد — تبقّى '+(lim-n):'✅ آمن — أرسلت '+n+' اليوم';
    box.innerHTML='<div style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:12px 16px;box-shadow:var(--sh1)">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:12.5px;font-weight:800;color:'+col+'">'+msg+'</span><span style="font-size:12px;color:var(--muted);font-weight:700">'+n+' / '+lim+'</span></div>'
      +'<div style="background:var(--bg);border-radius:100px;height:8px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:'+col+';border-radius:100px;transition:width .5s"></div></div></div>';
  }).catch(function(){});
}

// ═══ إضافة يدوية ═══
function _oManualAdd(){
  var m=document.createElement('div');
  m.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML='<div style="background:var(--white);border-radius:16px;padding:22px;max-width:440px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3)">'
    +'<div style="font-family:Cairo,sans-serif;font-weight:900;font-size:16px;margin-bottom:16px">➕ إضافة مستهدف يدوياً</div>'
    +'<div style="display:grid;gap:10px">'
    +'<input id="ma-name" placeholder="اسم المنشأة *" style="padding:11px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal;background:var(--white);color:var(--text)">'
    +'<input id="ma-phone" placeholder="رقم الجوال * (05xxxxxxxx)" dir="ltr" style="padding:11px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal;background:var(--white);color:var(--text);text-align:right">'
    +'<div style="display:flex;gap:8px"><input id="ma-cat" placeholder="التخصص" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal;background:var(--white);color:var(--text)"><input id="ma-city" placeholder="المدينة" style="flex:1;padding:11px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal;background:var(--white);color:var(--text)"></div>'
    +'<select id="ma-type" style="padding:11px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal;font-weight:700;background:var(--white);color:var(--text)"><option value="provider">مزوّد خدمة</option><option value="client">عميل B2B</option></select>'
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-top:16px">'
    +'<button onclick="_oManualSave(this)" style="flex:1;background:var(--p);color:#fff;border:none;padding:11px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:13px;cursor:pointer">إضافة</button>'
    +'<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:var(--bg);border:1px solid var(--border);color:var(--text2);padding:11px 18px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:13px;cursor:pointer">إلغاء</button>'
    +'</div></div>';
  m.onclick=function(e){ if(e.target===m)m.remove(); };
  document.body.appendChild(m);
  setTimeout(function(){ var n=document.getElementById('ma-name'); if(n)n.focus(); },100);
}
function _oManualSave(btn){
  var name=(document.getElementById('ma-name')||{}).value||'';
  var phone=(document.getElementById('ma-phone')||{}).value||'';
  if(!name.trim()||!phone.trim()){ toast('الاسم والجوال مطلوبان','error'); return; }
  var item={ name:name.trim(), phone:phone.trim(), category:(document.getElementById('ma-cat')||{}).value||null, city:(document.getElementById('ma-city')||{}).value||null, lead_type:(document.getElementById('ma-type')||{}).value||'provider' };
  btn.disabled=true; btn.textContent='...';
  fetch(API+'/api/admin/leads/manual',{method:'POST',headers:hdr().headers,body:JSON.stringify(item)})
    .then(function(r){return r.json();}).then(function(d){
      if(d.dup){ toast('هذا الرقم موجود مسبقاً','error'); btn.disabled=false; btn.textContent='إضافة'; return; }
      if(d.invalid){ toast('رقم غير صالح','error'); btn.disabled=false; btn.textContent='إضافة'; return; }
      toast('أُضيف المستهدف','success');
      btn.closest('[style*=fixed]').remove();
      loadOutreach();
    }).catch(function(){ toast('تعذّر','error'); btn.disabled=false; btn.textContent='إضافة'; });
}

// ═══ استيراد CSV/Excel ═══
function _oDownloadTemplate(){
  downloadCSV([
    {'الاسم':'مؤسسة العتيبي للحدادة','الجوال':'0501234567','التخصص':'حدادة','المدينة':'بريدة'},
    {'الاسم':'سعد القحطاني','الجوال':'0559876543','التخصص':'','المدينة':'الرياض'}
  ],'نموذج-الاستقطاب.csv');
  toast('حمّلت النموذج — احذف صفوف المثال واكتب بياناتك ثم استورده','info');
}
function _oImportCSV(input){
  var file=input.files[0]; if(!file)return;
  var name=file.name.toLowerCase();
  if(name.endsWith('.csv')){ _oReadCSV(file); }
  else { _oReadXLSX(file); }
  input.value='';
}
function _oReadCSV(file){
  var reader=new FileReader();
  reader.onload=function(e){ _oParseRows(_oCSVtoRows(e.target.result)); };
  reader.readAsText(file,'utf-8');
}
function _oCSVtoRows(text){
  var lines=text.split(/\r?\n/).filter(function(l){return l.trim();});
  return lines.map(function(l){
    // دعم الفواصل والفاصلة المنقوطة
    var sep = l.indexOf(';')>-1 && l.indexOf(',')===-1 ? ';' : ',';
    return l.split(sep).map(function(c){return c.replace(/^"|"$/g,'').trim();});
  });
}
function _oReadXLSX(file){
  if(!_xlsxReady(function(){ _oReadXLSX(file); }))return;
  if(typeof XLSX==='undefined'){ toast('تعذّر تحميل قارئ Excel','error'); return; }
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
      var ws=wb.Sheets[wb.SheetNames[0]];
      var rows=XLSX.utils.sheet_to_json(ws,{header:1});
      _oParseRows(rows);
    }catch(err){ toast('تعذّر قراءة الملف','error'); }
  };
  reader.readAsArrayBuffer(file);
}
function _oShowPreview(items){
  window._oPreviewItems=items;
  var type=window._oImportType||'provider';
  var tl=type==='client'?'عملاء':'مزودين';
  var isP=type==='provider';
  var body=items.slice(0,1000).map(function(it,i){
    return '<tr><td style="padding:7px 9px;color:#94a3b8;font-weight:700;text-align:center;border-bottom:1px solid #eef2f7">'+(i+1)+'</td>'
      +'<td style="padding:7px 9px;font-weight:700;color:#0f2a4f;border-bottom:1px solid #eef2f7">'+_agEsc(it.name)+'</td>'
      +'<td style="padding:7px 9px;color:#334155;border-bottom:1px solid #eef2f7;white-space:nowrap">'+_agEsc(it.phone)+'</td>'
      +(isP?'<td style="padding:7px 9px;color:#64748b;border-bottom:1px solid #eef2f7">'+_agEsc(it.category||'—')+'</td>':'')
      +'<td style="padding:7px 9px;color:#64748b;border-bottom:1px solid #eef2f7">'+_agEsc(it.city||'—')+'</td></tr>';
  }).join('');
  var th='<th style="padding:9px;background:#0f2a4f;color:#fff;font-size:11px;text-align:right;font-weight:700">';
  var d=document.createElement('div'); d.id='oPreviewModal';
  d.style.cssText='position:fixed;inset:0;z-index:2000;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
  d.innerHTML='<div style="background:#fff;width:100%;max-width:640px;max-height:88vh;display:flex;flex-direction:column;border-radius:16px;overflow:hidden;font-family:Tajawal,sans-serif">'
    +'<div style="padding:15px 20px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0;font-size:16px;color:#0f2a4f">معاينة الاستيراد — '+items.length+' '+tl+'</h3><button onclick="_oClosePreview()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#94a3b8;line-height:1">\u00d7</button></div>'
    +'<div style="padding:9px 20px 0;font-size:12px;color:#64748b">راجع البيانات قبل الإضافة. المكرّر بالجوال يُتخطّى تلقائياً.</div>'
    +'<div style="overflow-y:auto;flex:1;padding:12px 20px"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'+th+'#</th>'+th+'الاسم</th>'+th+'الجوال</th>'+(isP?th+'التخصص</th>':'')+th+'المدينة</th></tr></thead><tbody>'+body+'</tbody></table></div>'
    +'<div style="padding:14px 20px;border-top:1px solid #e2e8f0;display:flex;gap:10px">'
    +'<button onclick="_oConfirmImport()" style="flex:1;background:#1e40af;color:#fff;border:none;padding:12px;border-radius:11px;font-family:Tajawal;font-weight:800;font-size:14px;cursor:pointer">تأكيد الإضافة ('+items.length+')</button>'
    +'<button onclick="_oClosePreview()" style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;padding:12px 22px;border-radius:11px;font-family:Tajawal;font-weight:800;font-size:14px;cursor:pointer">إلغاء</button></div></div>';
  d.onclick=function(e){if(e.target===d)_oClosePreview();};
  document.body.appendChild(d);
}
function _oClosePreview(){ var d=document.getElementById('oPreviewModal'); if(d)d.remove(); }
function _oConfirmImport(){
  var items=window._oPreviewItems||[]; if(!items.length){ _oClosePreview(); return; }
  _oClosePreview();
  toast('جاري استيراد '+items.length+' صف...','info');
  fetch(API+'/api/admin/leads/manual',{method:'POST',headers:hdr().headers,body:JSON.stringify({items:items,lead_type:(window._oImportType||'provider')})})
    .then(function(r){return r.json();}).then(function(d){
      toast('أُضيف '+(d.added||0)+' · مكرر '+(d.dup||0)+' · غير صالح '+(d.invalid||0),'success');
      loadOutreach();
    }).catch(function(){ toast('تعذّر الاستيراد','error'); });
}
function _oParseRows(rows){
  if(!rows||rows.length<1){ toast('الملف فارغ','error'); return; }
  // اكتشاف الأعمدة من العناوين (اسم، جوال، تخصص، مدينة)
  var header=rows[0].map(function(c){return String(c||'').toLowerCase();});
  function col(names){ for(var i=0;i<header.length;i++){ for(var j=0;j<names.length;j++){ if(header[i].indexOf(names[j])>-1)return i; } } return -1; }
  var iName=col(['اسم','name','منشأة','شركة']);
  var iPhone=col(['جوال','هاتف','رقم','phone','tel','mobile']);
  var iCat=col(['تخصص','خدمة','category','نوع']);
  var iCity=col(['مدينة','city','منطقة']);
  var hasHeader = iName>-1 || iPhone>-1;
  var start = hasHeader ? 1 : 0;
  if(!hasHeader){ iName=0; iPhone=1; iCat=2; iCity=3; }  // بلا عناوين: افتراض الترتيب
  var items=[];
  for(var r=start;r<rows.length;r++){
    var row=rows[r]; if(!row||!row.length)continue;
    var nm=iName>-1?String(row[iName]||'').trim():'';
    var ph=iPhone>-1?String(row[iPhone]||'').trim():'';
    if(!nm||!ph)continue;
    items.push({ name:nm, phone:ph, category:iCat>-1?String(row[iCat]||'').trim()||null:null, city:iCity>-1?String(row[iCity]||'').trim()||null:null, lead_type:(window._oImportType||'provider') });
  }
  if(!items.length){ toast('لم أجد صفوفاً صالحة (تأكّد من عمودَي الاسم والجوال)','error'); return; }
  _oShowPreview(items);
}

// ═══ تصدير ═══
function _oFilterParams(){
  var p={}, m={status:'o-f-status',type:'o-f-type',tag:'o-f-tag',prio:'o-f-prio',city:'o-f-city'};
  Object.keys(m).forEach(function(k){ var val=g(m[k]); if(val)p[k]=val; });
  var q=g('o-f-q').trim(); if(q)p.q=q;
  var mb=document.getElementById('o-f-maybe'); if(mb&&mb.getAttribute('data-on')==='1')p.maybe='1';
  return p;
}
function _oDeleteByFilter(){
  var p=_oFilterParams();
  if(!Object.keys(p).length){ toast('حدّد فلتراً أولاً (بحث/مدينة/تخصص) — للحماية من حذف الكل','error'); return; }
  var cnt=((document.getElementById('o-count')||{}).textContent||'').trim();
  if(!confirm('حذف كل النتائج المطابقة للفلتر نهائياً؟ '+cnt+'\nلا يمكن التراجع.')) return;
  fetch(API+'/api/admin/leads/delete-by-filter',Object.assign({method:'POST',body:JSON.stringify(p)},hdr())).then(function(r){return r.json();}).then(function(d){
    if(d.ok){ toast('تم حذف '+d.deleted+' عميل','success'); _oCityCache=null; _oLoadList(); }
    else toast(d.message||'تعذّر الحذف','error');
  }).catch(function(){ toast('تعذّر الحذف','error'); });
}
function _oExport(){
  if(!_xlsxReady(_oExport))return;
  fetch(API+'/api/admin/leads/export'+_oQueryStr(),hdr()).then(function(r){return r.json();}).then(function(d){
    var L=d.leads||[];
    var _selIds=Object.keys(_oSel).filter(function(k){return _oSel[k];});
    if(_selIds.length){ var _ss={}; _selIds.forEach(function(id){_ss[id]=1;}); L=L.filter(function(l){return _ss[l.id];}); }
    if(!L.length){ toast('لا يوجد ما يُصدّر','error'); return; }
    if(_selIds.length) toast('تصدير '+L.length+' محدّد','success');
    var cols=['name','phone','category','city','rating','reviews_count','status','tag','score','notes'];
    var headers=['الاسم','الجوال','التخصص','المدينة','التقييم','المراجعات','الحالة','الوسم','الأولوية','ملاحظات'];
    try{
      // ملف Excel حقيقي (.xlsx) — يفصل الأعمدة صح مهما كانت إعدادات Excel العربي
      var aoa=[headers];
      L.forEach(function(l){
        aoa.push(cols.map(function(c){
          var v=l[c];
          if(v==null) return '';
          // الجوال بصيغة دولية تبدأ بـ966 (من phone_norm الجاهز، أو تحويل احتياطي)
          if(c==='phone'){
            var pn=l.phone_norm ? String(l.phone_norm).replace(/[^0-9]/g,'') : '';
            if(!pn){ var raw=String(v).replace(/[^0-9]/g,''); if(raw.indexOf('966')===0)pn=raw; else if(raw.indexOf('05')===0)pn='966'+raw.slice(1); else if(raw.indexOf('5')===0&&raw.length===9)pn='966'+raw; else if(raw.indexOf('0')===0)pn='966'+raw.slice(1); else pn=raw; }
            return pn;
          }
          return v;
        }));
      });
      var ws=XLSX.utils.aoa_to_sheet(aoa);
      // عرض الأعمدة
      ws['!cols']=[{wch:28},{wch:15},{wch:16},{wch:12},{wch:8},{wch:9},{wch:10},{wch:10},{wch:8},{wch:30}];
      // اتجاه الورقة من اليمين لليسار
      if(!ws['!sheetViews']) ws['!sheetViews']=[{}];
      ws['!sheetViews'][0].rightToLeft=true;
      var wb=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'المستهدفون');
      XLSX.writeFile(wb, 'مستهدفين-'+new Date().toISOString().slice(0,10)+'.xlsx');
      toast('تم تصدير '+L.length+' مستهدف إلى Excel','success');
    }catch(e){
      // احتياطي: CSV بفاصلة منقوطة (يتوافق مع Excel العربي)
      var csv='\ufeff'+headers.join(';')+'\n';
      L.forEach(function(l){
        csv+=cols.map(function(c){ var v=l[c]==null?'':String(l[c]); if(c==='phone'){ var pn=l.phone_norm?String(l.phone_norm).replace(/[^0-9]/g,''):''; if(!pn){var raw=v.replace(/[^0-9]/g,'');if(raw.indexOf('966')===0)pn=raw;else if(raw.indexOf('05')===0)pn='966'+raw.slice(1);else if(raw.indexOf('5')===0&&raw.length===9)pn='966'+raw;else if(raw.indexOf('0')===0)pn='966'+raw.slice(1);else pn=raw;} v=pn; } v=v.replace(/"/g,'""'); return /[;"\n]/.test(v)?'"'+v+'"':v; }).join(';')+'\n';
      });
      var blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
      var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
      a.download='مستهدفين-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
      toast('تم تصدير '+L.length+' مستهدف','success');
    }
  }).catch(function(){ toast('تعذّر التصدير','error'); });
}

// ═══ وسم ═══
function _oSetTag(id,tag){
  fetch(API+'/api/admin/leads/'+id+'/tag',{method:'PUT',headers:hdr().headers,body:JSON.stringify({tag:tag})})
    .then(function(){ _oLoadList(); }).catch(function(){});
}
var _OTAGS={serious:['جاد','#16a34a','#dcfce7'],interested:['مهتم','#d97706','#fef3c7'],potential:['محتمل','#0284c7','#e0f2fe']};
function _oTagCell(l){
  var t=l.tag;
  if(t&&_OTAGS[t]){
    var m=_OTAGS[t];
    return '<span onclick="_oTagMenu('+l.id+',this)" style="cursor:pointer;background:'+m[2]+';color:'+m[1]+';font-size:11px;font-weight:800;padding:4px 11px;border-radius:16px;white-space:nowrap">'+m[0]+'</span>';
  }
  return '<button onclick="_oTagMenu('+l.id+',this)" style="background:var(--bg);border:1px dashed var(--border);color:var(--muted);font-size:11px;font-weight:700;padding:4px 10px;border-radius:16px;cursor:pointer">+ تصنيف</button>';
}
function _oTagMenu(id,el){
  var ex=document.getElementById('o-tagmenu'); if(ex)ex.remove();
  var menu=document.createElement('div'); menu.id='o-tagmenu';
  var rect=el.getBoundingClientRect();
  menu.style.cssText='position:fixed;top:'+(rect.bottom+4)+'px;right:'+(window.innerWidth-rect.right)+'px;background:var(--white);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:9999;padding:5px;min-width:120px';
  var opts=[['serious','جاد','#16a34a'],['interested','مهتم','#d97706'],['potential','محتمل','#0284c7'],['','بلا تصنيف','var(--muted)']];
  menu.innerHTML=opts.map(function(o){ return '<div onclick="_oSetTag('+id+',\''+o[0]+'\');document.getElementById(\'o-tagmenu\').remove()" style="padding:8px 12px;font-size:12.5px;font-weight:700;color:'+o[2]+';cursor:pointer;border-radius:7px" onmouseover="this.style.background=\'var(--bg)\'" onmouseout="this.style.background=\'transparent\'">'+o[1]+'</div>'; }).join('');
  document.body.appendChild(menu);
  setTimeout(function(){ document.addEventListener('click',function _c(e){ if(!menu.contains(e.target)&&e.target!==el){ menu.remove(); document.removeEventListener('click',_c); } }); },50);
}
function _oGenMsg(id,btn){
  var ta=document.getElementById('o-msg'); if(!ta)return;
  var _o=btn.textContent; btn.textContent='⏳ يكتب...'; btn.disabled=true;
  fetch(API+'/api/admin/leads/'+id+'/gen-message',{method:'POST',headers:hdr().headers,body:'{}'})
    .then(function(r){return r.json();})
    .then(function(d){
      btn.textContent=_o; btn.disabled=false;
      if(d.fallback){ toast('فعّل ANTHROPIC_API_KEY لاستخدام الرسائل الذكية','error'); return; }
      if(d.message){ ta.value=d.message; toast('تم توليد رسالة ذكية','success'); }
      else toast('تعذّر التوليد','error');
    }).catch(function(){ btn.textContent=_o; btn.disabled=false; toast('تعذّر التوليد','error'); });
}
function _oAnalyze(id){
  var reply=prompt('الصق رد المزوّد هنا:');
  if(!reply||!reply.trim())return;
  toast('جاري التحليل...','info');
  fetch(API+'/api/admin/leads/'+id+'/analyze-reply',{method:'POST',headers:hdr().headers,body:JSON.stringify({reply:reply})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.fallback){ toast('فعّل ANTHROPIC_API_KEY للتحليل الذكي','error'); return; }
      if(!d.analysis){ toast('تعذّر التحليل','error'); return; }
      var a=d.analysis;
      var labels={interested:'🟢 مهتم',price_question:'🟡 يسأل عن السعر',hesitant:'🟠 متردد',rejected:'🔴 رفض',later:'⏳ لاحقاً',unclear:'⚪ غير واضح'};
      _oShowAnalysis(labels[a.intent]||a.intent, a.summary||'', a.suggested_reply||'', id, a.followup_days);
      _oLoadList();
    }).catch(function(){ toast('تعذّر التحليل','error'); });
}
function _oShowAnalysis(intent,summary,reply,id,fdays){
  var m=document.createElement('div');
  m.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML='<div style="background:var(--white);border-radius:16px;padding:22px;max-width:460px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3)">'
    +'<div style="font-family:Cairo,sans-serif;font-weight:900;font-size:16px;margin-bottom:6px">تحليل الرد</div>'
    +'<div style="font-size:20px;font-weight:900;margin-bottom:10px">'+esc(intent)+'</div>'
    +'<div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;line-height:1.6">'+esc(summary)+'</div>'
    +(reply?'<div style="font-size:12px;font-weight:800;color:var(--text2);margin-bottom:6px">💬 الرد المقترح:</div>'
      +'<textarea id="o-sugreply" style="width:100%;min-height:100px;padding:11px;border:1px solid var(--border);border-radius:10px;font-family:Tajawal;font-size:12.5px;line-height:1.7;background:var(--bg);color:var(--text);resize:vertical;margin-bottom:12px">'+esc(reply)+'</textarea>':'')
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +(reply?'<button onclick="_oSendReply('+id+')" style="flex:1;min-width:140px;background:#25D366;color:#fff;border:none;padding:11px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:13px;cursor:pointer">📤 إرسال الرد</button>':'')
    +'<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:var(--bg);border:1px solid var(--border);color:var(--text2);padding:11px 18px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:13px;cursor:pointer">إغلاق</button>'
    +'</div></div>';
  m.onclick=function(e){ if(e.target===m)m.remove(); };
  document.body.appendChild(m);
  m._leadId=id; m._phone=null;
  // اجلب رقم المستهدف للرد
  var lead=(_OQ||[]).filter(function(x){return x.id===id;})[0];
  if(lead)m._phone=lead.phone_norm;
}
function _oSendReply(id){
  var ta=document.getElementById('o-sugreply'); if(!ta)return;
  var lead=(_OQ||[]).filter(function(x){return x.id===id;})[0];
  var phone=lead?lead.phone_norm:(window._oReplyPhone||null);
  if(!phone){ toast('رقم غير متوفّر','error'); return; }
  window.open('https://api.whatsapp.com/send?phone='+phone+'&text='+encodeURIComponent(ta.value)+'&type=phone_number&app_absent=0','_blank');
}
function _oAnalyzeList(id,phone){
  window._oReplyPhone=phone;
  var reply=prompt('الصق رد المزوّد هنا:');
  if(!reply||!reply.trim())return;
  toast('جاري التحليل...','info');
  fetch(API+'/api/admin/leads/'+id+'/analyze-reply',{method:'POST',headers:hdr().headers,body:JSON.stringify({reply:reply})})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.fallback){ toast('فعّل ANTHROPIC_API_KEY للتحليل الذكي','error'); return; }
      if(!d.analysis){ toast('تعذّر التحليل','error'); return; }
      var a=d.analysis;
      var labels={interested:'🟢 مهتم',price_question:'🟡 يسأل عن السعر',hesitant:'🟠 متردد',rejected:'🔴 رفض',later:'⏳ لاحقاً',unclear:'⚪ غير واضح'};
      _oShowAnalysisPhone(labels[a.intent]||a.intent, a.summary||'', a.suggested_reply||'', phone);
      _oLoadList();
    }).catch(function(){ toast('تعذّر التحليل','error'); });
}
function _oShowAnalysisPhone(intent,summary,reply,phone){
  window._oReplyPhone=phone;
  var m=document.createElement('div');
  m.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML='<div style="background:var(--white);border-radius:16px;padding:22px;max-width:460px;width:100%;box-shadow:0 20px 50px rgba(0,0,0,.3)">'
    +'<div style="font-family:Cairo,sans-serif;font-weight:900;font-size:16px;margin-bottom:6px">تحليل الرد</div>'
    +'<div style="font-size:20px;font-weight:900;margin-bottom:10px">'+esc(intent)+'</div>'
    +'<div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;line-height:1.6">'+esc(summary)+'</div>'
    +(reply?'<div style="font-size:12px;font-weight:800;color:var(--text2);margin-bottom:6px">💬 الرد المقترح:</div>'
      +'<textarea id="o-sugreply2" style="width:100%;min-height:100px;padding:11px;border:1px solid var(--border);border-radius:10px;font-family:Tajawal;font-size:12.5px;line-height:1.7;background:var(--bg);color:var(--text);resize:vertical;margin-bottom:12px">'+esc(reply)+'</textarea>':'')
    +'<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +(reply&&phone?'<button onclick="window.open(\'https://api.whatsapp.com/send?phone=\'+encodeURIComponent(window._oReplyPhone||\'\')+\'&text=\'+encodeURIComponent(document.getElementById(\'o-sugreply2\').value)+\'&type=phone_number&app_absent=0\',\'_blank\')" style="flex:1;min-width:140px;background:#25D366;color:#fff;border:none;padding:11px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:13px;cursor:pointer">📤 إرسال الرد</button>':'')
    +'<button onclick="this.closest(\'[style*=fixed]\').remove()" style="background:var(--bg);border:1px solid var(--border);color:var(--text2);padding:11px 18px;border-radius:9px;font-family:Tajawal;font-weight:800;font-size:13px;cursor:pointer">إغلاق</button>'
    +'</div></div>';
  m.onclick=function(e){ if(e.target===m)m.remove(); };
  document.body.appendChild(m);
}
function _oSetStatus(id,status,fdays){
  var body={status:status}; if(fdays)body.followup_days=fdays;
  fetch(API+'/api/admin/leads/'+id,{method:'PUT',headers:hdr().headers,body:JSON.stringify(body)})
    .then(function(){ _OQi++; _oRenderCard(); _oLoadList(); })
    .catch(function(){ toast('تعذّر التحديث','error'); });
}
// يبني سلسلة الاستعلام من كل الفلاتر الفعّالة (مشترك بين القائمة والتصدير)
function _oQueryStr(){
  var g=function(id){return (document.getElementById(id)||{}).value||'';};
  var p=[], m={status:'o-f-status',type:'o-f-type',tag:'o-f-tag',prio:'o-f-prio',city:'o-f-city'};
  Object.keys(m).forEach(function(k){ var val=g(m[k]); if(val)p.push(k+'='+encodeURIComponent(val)); });
  var q=g('o-f-q').trim(); if(q)p.push('q='+encodeURIComponent(q));
  var mb=document.getElementById('o-f-maybe'); if(mb&&mb.getAttribute('data-on')==='1')p.push('maybe=1');
  if(window._oLimit) p.push('limit='+window._oLimit);
  return p.length ? '?'+p.join('&') : '';
}
function _oToggleMaybe(){
  var b=document.getElementById('o-f-maybe'); if(!b)return;
  var on=b.getAttribute('data-on')==='1'?'0':'1';
  b.setAttribute('data-on',on);
  b.style.background=on==='1'?'#fef3c7':'var(--white)';
  b.style.fontWeight=on==='1'?'900':'700';
  _oLoadList();
}
// تأخير بسيط لحقل البحث (لتفادي طلب مع كل حرف)
var _oDebT=null;
function _oDeb(fn){ clearTimeout(_oDebT); _oDebT=setTimeout(fn,350); }
// مسح كل الفلاتر
function _oClearFilters(){
  ['o-f-q','o-f-status','o-f-type','o-f-tag','o-f-prio','o-f-city'].forEach(function(id){ var e=document.getElementById(id); if(e)e.value=''; });
  var mb=document.getElementById('o-f-maybe'); if(mb){ mb.setAttribute('data-on','0'); mb.style.background='var(--white)'; mb.style.fontWeight='700'; }
  _oLoadList();
}
// تعبئة قائمة المدن (مرّة واحدة، مع تخزين مؤقّت)
var _oCityCache=null;
var _oBaseCities=['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الظهران','بريدة','عنيزة','الرس','حائل','تبوك','أبها','خميس مشيط','نجران','جازان','الطائف','ينبع','الأحساء','القطيف','الجبيل','عرعر','سكاكا','الباحة','القريات','رفحاء','حفر الباطن','الخرج','المجمعة','الزلفي','شقراء','الدوادمي','القويعية','وادي الدواسر','بيشة','محايل عسير','صبيا','أبو عريش','الليث','القنفذة','رابغ','ضباء','الوجه','تيماء','دومة الجندل','طريف','الأفلاج','حوطة بني تميم','عفيف','الغاط','ثادق','حريملاء','ضرماء','المزاحمية','رماح','الدرعية','الدلم','الحريق','السليل','مرات','ضرما','المذنب','البكيرية','البدائع','رياض الخبراء','عيون الجواء','الأسياح','النبهانية','الشماسية','ضرية','عقلة الصقور','الخبراء','خليص','الجموم','الكامل','تربة','رنية','أضم','بحرة','المويه','الخرمة','العلا','بدر','مهد الذهب','خيبر','الحناكية','العيص','المهد','الخفجي','رأس تنورة','بقيق','النعيرية','قرية العليا','صفوى','سيهات','العوامية','النماص','تثليث','سراة عبيدة','رجال ألمع','ظهران الجنوب','تنومة','بلقرن','أحد رفيدة','المجاردة','الحرجة','قيال','حقل','أملج','البدع','بقعاء','الغزالة','الشنان','السليمي','موقق','الشملي','العويقيلة','صامطة','أحد المسارحة','بيش','فيفاء','ضمد','الدرب','العارضة','الريث','الحرث','شرورة','حبونا','بدر الجنوب','يدمة','ثار','بلجرشي','المندق','المخواة','قلوة','العقيق','القرى','غامد الزناد','طبرجل','صوير'];
function _oFillCities(){
  var sel=document.getElementById('o-f-city'); if(!sel)return;
  var fill=function(arr){
    var cur=sel.value, h='<option value="">كل المدن</option>';
    arr.forEach(function(c){ h+='<option value="'+esc(c)+'">'+esc(c)+'</option>'; });
    sel.innerHTML=h; sel.value=cur;
  };
  if(_oCityCache){ fill(_oCityCache); return; }
  fetch(API+'/api/admin/leads',hdr()).then(function(r){return r.json();}).then(function(d){
    var set={}; _oBaseCities.forEach(function(c){set[c]=1;}); (d.leads||[]).forEach(function(l){ if(l.city)set[l.city]=1; });
    _oCityCache=Object.keys(set).sort(function(a,b){return a.localeCompare(b,'ar');});
    fill(_oCityCache);
  }).catch(function(){});
}
// تعديل / حذف مستهدف
var _oLeads=[], _oEditId=null;
function _oEdit(id){
  var l=(_oLeads||[]).find(function(x){return x.id===id;}); if(!l)return;
  _oEditId=id;
  document.getElementById('le-name').value=l.name||'';
  document.getElementById('le-phone').value=l.phone||'';
  document.getElementById('le-city').value=l.city||'';
  document.getElementById('le-cat').value=l.category||'';
  document.getElementById('leadEditModal').classList.add('show');
}
function _oEditSave(){
  if(!_oEditId)return;
  var name=document.getElementById('le-name').value.trim();
  if(!name){ toast('الاسم مطلوب','error'); return; }
  var body={ name:name, phone:document.getElementById('le-phone').value.trim(),
    city:document.getElementById('le-city').value.trim()||null,
    category:document.getElementById('le-cat').value.trim()||null };
  var btn=document.getElementById('le-save'); btn.disabled=true; btn.textContent='جاري الحفظ...';
  fetch(API+'/api/admin/leads/'+_oEditId,{method:'PUT',headers:hdr().headers,body:JSON.stringify(body)})
    .then(function(r){ if(!r.ok)return r.json().then(function(e){throw new Error(e.message||'');}); return r.json(); })
    .then(function(){ toast('تم حفظ التعديلات','success'); closeModal('leadEditModal'); _oCityCache=null; _oFillCities(); _oLoadList(); })
    .catch(function(e){ toast(e.message||'تعذّر الحفظ','error'); })
    .finally(function(){ btn.disabled=false; btn.textContent='حفظ التعديلات'; });
}
function _oDelete(id){
  var l=(_oLeads||[]).find(function(x){return x.id===id;});
  if(!confirm('حذف «'+((l&&l.name)||'')+'» نهائياً؟ لا يمكن التراجع.'))return;
  fetch(API+'/api/admin/leads/'+id,{method:'DELETE',headers:hdr().headers})
    .then(function(r){return r.json();})
    .then(function(){ toast('تم الحذف','success'); _oLoadList(); })
    .catch(function(){ toast('تعذّر الحذف','error'); });
}
function _oConfirmMatch(id){
  var l=(_oLeads||[]).find(function(x){return x.id===id;});
  if(!confirm('تأكيد أن «'+((l&&l.name)||'')+'» سجّل فعلاً؟ سيُحوَّل إلى «سجّل ✅».'))return;
  fetch(API+'/api/admin/leads/'+id+'/confirm-match',{method:'POST',headers:hdr().headers})
    .then(function(r){return r.json();})
    .then(function(){ toast('تم التأكيد — سجّل ✅','success'); loadOutreach(); })
    .catch(function(){ toast('تعذّر التأكيد','error'); });
}
function _oDismissMatch(id){
  fetch(API+'/api/admin/leads/'+id+'/dismiss-match',{method:'POST',headers:hdr().headers})
    .then(function(r){return r.json();})
    .then(function(){ toast('أُزيلت الإشارة','success'); _oLoadList(); })
    .catch(function(){ toast('تعذّر','error'); });
}
var _oCardUrl='', _oCardLeadId=null;
function _oCard(id){
  _oCardLeadId=id;
  fetch(API+'/api/admin/leads/'+id+'/card',{method:'POST',headers:hdr().headers})
    .then(function(r){return r.json();})
    .then(function(d){
      if(!d.url){ toast('تعذّر توليد الرابط','error'); return; }
      _oCardUrl=d.url;
      var inp=document.getElementById('cardLinkInput'); if(inp)inp.value=d.url;
      var st=document.getElementById('cardStats'); if(st)st.innerHTML='👁 '+(d.views||0)+' مشاهدة · '+(d.published?'<span style="color:#16a34a;font-weight:800">منشور</span>':'<span style="color:#dc2626;font-weight:800">مخفي</span>');
      document.getElementById('leadCardModal').classList.add('show');
    }).catch(function(){ toast('تعذّر','error'); });
}
function _oCardCopy(){ if(!_oCardUrl)return; navigator.clipboard.writeText(_oCardUrl).then(function(){toast('تم نسخ الرابط','success');}).catch(function(){toast(_oCardUrl,'success');}); }
function _oCardOpen(){ if(_oCardUrl)window.open(_oCardUrl,'_blank'); }
function _oCardWa(){
  var l=(_oLeads||[]).find(function(x){return x.id===_oCardLeadId;});
  var wa=l&&l.phone_norm; if(!wa){ toast('لا يوجد رقم واتساب لهذا المستهدف','error'); return; }
  var msg='أهلاً '+((l&&l.name)||'')+' 👋\nخل عنك الورقي — بطاقتكم الرقمية جاهزة 📲\nهذا رابط المعاينة (خاص فيكم — ما يطلع بقوقل لحد ما تفعّلونه):\n'+_oCardUrl+'\n① افتحوا الرابط وشوفوا بطاقتكم\n② حالياً مسودّة — أنتم بس تشوفونها\n③ فعّلوها مجاناً ← تصير صفحتكم الرسمية وتبدأ تظهر في قوقل يلقاكم فيها العملاء\nتعدّلونها أو تخفونها وقت ما تبون.';
  window.open('https://api.whatsapp.com/send?phone='+wa+'&text='+encodeURIComponent(msg)+'&type=phone_number&app_absent=0','_blank');
}
function _oInviteWa(){
  var l=(_oLeads||[]).find(function(x){return x.id===_oCardLeadId;});
  var wa=l&&l.phone_norm; if(!wa){ toast('لا يوجد رقم واتساب','error'); return; }
  var token=(_oCardUrl||'').split('?')[0].split('/').filter(Boolean).pop()||'';
  var role=(l&&l.lead_type==='client')?'client':'provider';
  var link='https://manaqasa.com/auth.html?register=1&role='+role+(token?('&card='+encodeURIComponent(token)):'');
  var isP=role==='provider';
  var msg='أهلاً '+((l&&l.name)||'')+' 👋\nمعك فريق منصة مناقصة.\n\n'+(isP?'سجّل حسابك كمزوّد وتبدأ تستقبل مشاريع تناسب تخصصك في منطقتك:':'سجّل حسابك وانشر مشروعك واستقبل عروض أسعار من عدة مزوّدين وتختار الأفضل:')+'\n'+link+'\n\nالتسجيل مجاني ودقيقة وحدة تكفي 👌';
  window.open('https://api.whatsapp.com/send?phone='+wa+'&text='+encodeURIComponent(msg)+'&type=phone_number&app_absent=0','_blank');
}
function _oLoadList(){
  var box=document.getElementById('o-list');if(!box)return;
  box.innerHTML='<div style="text-align:center;padding:16px;color:var(--muted);font-size:12px">جاري التحميل...</div>';
  fetch(API+'/api/admin/leads'+_oQueryStr(),hdr()).then(function(r){return r.json();}).then(function(d){
    var L=d.leads||[]; _oLeads=L;
    var cnt=document.getElementById('o-count'); if(cnt)cnt.textContent=L.length?(L.length+' نتيجة'):'';
    if(!L.length){ box.innerHTML='<div style="text-align:center;padding:20px;color:var(--muted);font-size:12.5px">لا يوجد نتائج مطابقة للفلاتر</div>'; _oRenderLimitBar(0,d.total||0); return; }
    var h='<div id="o-bulkbar" style="display:none;align-items:center;gap:10px;margin-bottom:10px;padding:9px 13px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px">'
      +'<span id="o-selcount" style="font-size:12.5px;font-weight:800;color:#b91c1c"></span>'
      +'<button onclick="_oBulkDelete()" style="background:#dc2626;color:#fff;border:none;padding:7px 16px;border-radius:8px;font-family:Tajawal;font-weight:800;font-size:12.5px;cursor:pointer">🗑️ حذف المحدد</button>'
      +'<button onclick="_oClearSel()" style="background:#fff;border:1px solid var(--border);color:var(--text2);padding:7px 12px;border-radius:8px;font-family:Tajawal;font-weight:700;font-size:12px;cursor:pointer">إلغاء التحديد</button>'
      +'</div>'
      +'<div class="tbl-wrap"><table><thead><tr>'
      +'<th style="width:34px"><input type="checkbox" id="o-selall" onclick="_oToggleSelAll(this.checked)" title="تحديد الكل" style="width:17px;height:17px;accent-color:var(--p);cursor:pointer"></th>'
      +'<th>المستهدف</th><th>النوع</th><th>التخصص / المدينة</th><th>الأولوية</th><th>التصنيف</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>';
    L.forEach(function(l){
      var stCol=l.status==='converted'?'b-done':l.status==='rejected'?'b-rej':l.status==='interested'||l.status==='replied'?'b-review':l.status==='followup'?'b-progress':'b-completed';
      var sc=l.score||0;
      var scCol=sc>=70?'#16a34a':sc>=45?'#d97706':'var(--muted)';
      var scBg=sc>=70?'#dcfce7':sc>=45?'#fef3c7':'var(--bg)';
      var initial=esc((l.name||'?').trim()[0]||'?');
      var isMaybe = l.maybe_user_id && l.status!=='converted';
      h+='<tr>'
        +'<td><input type="checkbox" class="ochk" '+(_oSel[l.id]?'checked':'')+' onclick="_oToggleSel('+l.id+',this.checked)" style="width:17px;height:17px;accent-color:var(--p);cursor:pointer"></td>'
        +'<td><div class="u-cell"><div class="u-av" style="background:linear-gradient(135deg,'+(l.lead_type==='client'?'#0284c7,#38bdf8':'var(--p),var(--p2)')+')">'+initial+'</div>'
          +'<div><div class="u-name">'+esc(l.name)+'</div><div class="u-email" dir="ltr" style="text-align:right">'+esc(l.phone||'—')+'</div></div></div></td>'
        +'<td><span class="badge '+(l.lead_type==='client'?'b-client':'b-provider')+'">'+(l.lead_type==='client'?'عميل':'مزوّد')+'</span></td>'
        +'<td><div style="font-size:12.5px;font-weight:600">'+esc(l.category||'—')+'</div><div style="font-size:11.5px;color:var(--muted)">'+esc(l.city||'—')+'</div></td>'
        +'<td><span style="display:inline-flex;align-items:center;justify-content:center;min-width:38px;padding:4px 8px;border-radius:20px;background:'+scBg+';color:'+scCol+';font-weight:900;font-size:13px;font-family:Cairo,sans-serif">'+sc+'</span></td>'
        +'<td>'+_oTagCell(l)+'</td>'
        +'<td><span class="badge '+stCol+'">'+(_OSTAT[l.status]||l.status)+'</span>'+(isMaybe?'<div style="margin-top:5px"><span style="display:inline-block;padding:2px 7px;border-radius:20px;background:#fef3c7;color:#b45309;font-size:10.5px;font-weight:800;border:1px solid #fde68a">⚠️ محتمل سجّل</span></div>':'')+'</td>'
        +'<td><div style="display:flex;gap:6px;align-items:center">'
          +(isMaybe?'<button onclick="_oConfirmMatch('+l.id+')" title="أكّد أنه سجّل فعلاً" style="background:#16a34a;color:#fff;border:none;padding:0 10px;height:30px;border-radius:8px;cursor:pointer;font-size:11.5px;font-weight:800">✅ أكّد</button><button onclick="_oDismissMatch('+l.id+')" title="ليس هو — أزل الإشارة" style="background:#f1f5f9;color:#64748b;border:1px solid var(--border);padding:0 9px;height:30px;border-radius:8px;cursor:pointer;font-size:12px;font-weight:800">✗</button>':'')
          +(l.phone_norm?'<button onclick="_oWaRow('+l.id+')" title="واتساب" style="background:#25D366;color:#fff;border:none;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px">💬</button>':'')
          +'<button onclick="_oAnalyzeList('+l.id+','+(l.phone_norm?"'"+l.phone_norm+"'":'null')+')" title="حلّل الرد بالذكاء" style="background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border:none;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px">✨</button>'
          +'<button onclick="_oEdit('+l.id+')" title="تعديل البيانات" style="background:var(--bg);border:1px solid var(--border);color:var(--text2);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px">✏️</button>'
          +'<button onclick="_oDelete('+l.id+')" title="حذف نهائي" style="background:#fee2e2;border:none;color:#dc2626;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px">🗑️</button>'
          +'<button onclick="_oCard('+l.id+')" title="الكرت الرقمي — رابط للإرسال" style="background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:14px">🔗</button>'
          +'<select onchange="_oSetStatus('+l.id+',this.value);this.selectedIndex=0" style="padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-family:Tajawal;font-size:11.5px;font-weight:700;background:var(--white);color:var(--text);cursor:pointer"><option>تغيير الحالة</option><option value="replied">ردّ</option><option value="interested">مهتم</option><option value="converted">سجّل ✅</option><option value="rejected">رفض</option></select>'
        +'</div></td></tr>';
    });
    h+='</tbody></table></div>';
    box.innerHTML=h;
    _oUpdateSelBar();
    _oRenderLimitBar(_oLeads.length, d.total||_oLeads.length);
  }).catch(function(){ box.innerHTML='<div style="color:#dc2626;font-size:12.5px">تعذّر الجلب</div>'; });
}

// شريط التحكم بعدد النتائج المعروضة (أسفل القائمة)
function _oRenderLimitBar(shown, total){
  var box=document.getElementById('o-list'); if(!box) return;
  var cur=window._oLimit||300;
  var opts=[{v:100,t:'100'},{v:500,t:'500'},{v:2000,t:'2000'},{v:10000,t:'الكل'}];
  var btns=opts.map(function(o){
    var on=(cur==o.v)||(o.v===10000&&cur>=10000);
    return '<button onclick="_oSetLimit('+o.v+')" style="padding:7px 14px;border-radius:9px;border:1.5px solid '+(on?'var(--p)':'var(--border)')+';background:'+(on?'var(--p)':'#fff')+';color:'+(on?'#fff':'var(--text2)')+';font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer">'+o.t+'</button>';
  }).join('');
  var info = total>shown ? ('عرض '+shown+' من '+total) : ('عرض الكل ('+total+')');
  var bar='<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:14px;padding:12px 14px;background:#f7faff;border:1px solid var(--border);border-radius:12px">'
    +'<span style="font-size:12.5px;color:var(--muted);font-weight:700">'+info+'</span>'
    +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span style="font-size:12px;color:var(--muted)">اعرض:</span>'+btns+'</div>'
    +'</div>';
  box.insertAdjacentHTML('beforeend', bar);
}
function _oSetLimit(n){ window._oLimit=n; _oLoadList(); }
// ═══ تحديد جماعي + حذف + واتساب بالرسالة الصحيحة ═══
var _oSel={};
function _oWaRow(id){
  var l=(_oLeads||[]).find(function(x){return x.id===id;});
  if(!l||!l.phone_norm){ toast('لا يوجد رقم واتساب','error'); return; }
  var msg=_oMsg(l);
  window.open('https://api.whatsapp.com/send?phone='+l.phone_norm+'&text='+encodeURIComponent(msg)+'&type=phone_number&app_absent=0','_blank');
  _oSetStatus(id,'contacted',3);
}
function _oSelCount(){ return Object.keys(_oSel).filter(function(k){return _oSel[k];}).length; }
function _oUpdateSelBar(){
  var n=_oSelCount();
  var bar=document.getElementById('o-bulkbar'); if(bar)bar.style.display=n?'flex':'none';
  var c=document.getElementById('o-selcount'); if(c)c.textContent='محدّد: '+n;
}
function _oToggleSel(id,checked){ if(checked)_oSel[id]=true; else delete _oSel[id]; _oUpdateSelBar(); }
function _oToggleSelAll(checked){
  _oSel={};
  if(checked)(_oLeads||[]).forEach(function(l){ _oSel[l.id]=true; });
  document.querySelectorAll('.ochk').forEach(function(cb){ cb.checked=checked; });
  _oUpdateSelBar();
}
function _oClearSel(){
  _oSel={};
  document.querySelectorAll('.ochk').forEach(function(cb){ cb.checked=false; });
  var sa=document.getElementById('o-selall'); if(sa)sa.checked=false;
  _oUpdateSelBar();
}
function _oBulkDelete(){
  var ids=Object.keys(_oSel).filter(function(k){return _oSel[k];});
  if(!ids.length){ toast('ما فيه محدّد','error'); return; }
  if(!confirm('حذف '+ids.length+' مستهدف نهائياً؟ لا يمكن التراجع.')) return;
  var btn=document.querySelector('#o-bulkbar button');
  toast('جارٍ حذف '+ids.length+'...','success');
  fetch(API+'/api/admin/leads/bulk-delete',Object.assign({method:'POST',body:JSON.stringify({ids:ids})},hdr()))
    .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,d:d}; }); })
    .then(function(res){
      if(res.ok && res.d && res.d.ok){
        toast('تم حذف '+(res.d.deleted||ids.length)+' مستهدف ✓','success');
        _oSel={}; _oLoadList();
      } else {
        toast((res.d&&res.d.message)||'تعذّر الحذف — تأكّد من صلاحياتك','error');
      }
    })
    .catch(function(){ toast('تعذّر الاتصال بالخادم','error'); });
}

function _refreshHealth(btn){
  if(btn){btn.disabled=true;btn.textContent='جاري التحديث...';btn.style.opacity='.6';}
  fetch(API+'/api/admin/health',hdr()).then(function(r){return r.json();}).then(function(d){
    renderHealth(d);
  }).catch(function(){ if(btn){btn.disabled=false;btn.textContent='تعذّر — أعد المحاولة';btn.style.opacity='1';} });
}
// بطاقة «حماية المتصفح (CSP)» — وضع المراقبة: تعرض أي مصدر غير متوقع حاولت صفحة تحمّله
function _loadCsp(){
  var box=document.getElementById('csp-card'); if(!box)return;
  fetch(API+'/api/admin/csp-reports',hdr()).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d){box.innerHTML='';return;}
    var DN={'script-src-elem':'سكربت','script-src':'سكربت','script-src-attr':'سكربت داخلي','style-src-elem':'تنسيق','style-src':'تنسيق','img-src':'صورة','connect-src':'اتصال','font-src':'خط','frame-src':'إطار','media-src':'صوت/فيديو','worker-src':'عامل خلفي','form-action':'نموذج','frame-ancestors':'تضمين الموقع','base-uri':'رابط أساسي','object-src':'كائن'};
    var rows=(d.rows||[]).slice(0,30).map(function(r){
      var ago=Math.max(0,Math.round((Date.now()-new Date(r.last_at))/60000)); var t=ago<1?'الآن':('قبل '+(ago<60?(ago+' د'):(ago<1440?Math.round(ago/60)+' س':Math.round(ago/1440)+' يوم')));
      return '<tr><td style="padding:7px 6px;font-weight:700">'+esc(DN[r.directive]||r.directive)+'</td><td style="padding:7px 6px;direction:ltr;text-align:left;font-size:11.5px;word-break:break-all">'+esc(r.blocked||'—')+(r.sample?'<div style="color:var(--muted);font-size:10.5px;margin-top:2px">'+esc(r.sample)+'</div>':'')+'</td><td style="padding:7px 6px;direction:ltr;text-align:left;font-size:11.5px">'+esc(r.page||'—')+'</td><td style="padding:7px 6px;text-align:center;font-weight:800">'+(parseInt(r.n)||0)+'</td><td style="padding:7px 6px;color:var(--muted);font-size:11.5px;white-space:nowrap">'+t+'</td></tr>';
    }).join('');
    var ok=!d.kinds;
    box.innerHTML='<div class="card" style="margin-bottom:14px;border:1px solid var(--border);border-radius:14px;padding:16px 18px">'
      +'<div style="display:flex;align-items:center;gap:9px;margin-bottom:10px;padding-bottom:12px;border-bottom:1px solid var(--border)">'+_hDot(ok)+'<h3 style="margin:0;font-size:15px;color:var(--text)">حماية المتصفح (CSP)</h3>'
      +'<span style="margin-inline-start:auto;font-size:11.5px;font-weight:800;padding:3px 10px;border-radius:20px;background:rgba(37,99,235,.1);color:#1d4ed8">'+(d.mode==='off'?'متوقفة':'مراقبة فقط')+'</span></div>'
      +'<div style="font-size:12.5px;color:var(--muted);line-height:1.8;margin-bottom:10px">المتصفح يبلّغنا إذا صفحة حاولت تحمّل شي من مصدر غير معروف (بدون ما يمنعه). إذا ظهر مصدر تعرفه (أداة تحليل أضفتها مثلاً) نضيفه للقائمة المسموحة. وإذا ظهر مصدر غريب، هذا مؤشر محاولة اختراق.</div>'
      +(ok?'<div style="color:#16a34a;font-weight:800;font-size:13px">✓ ما فيه أي تنبيه</div>'
        :'<div style="font-size:12.5px;margin-bottom:8px"><b>'+d.kinds+'</b> نوع · <b>'+d.total+'</b> تنبيه</div><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12.5px"><thead><tr style="color:var(--muted);font-size:11.5px;text-align:right"><th style="padding:6px">النوع</th><th style="padding:6px">المصدر</th><th style="padding:6px">الصفحة</th><th style="padding:6px">مرات</th><th style="padding:6px">آخر مرة</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
        +'<button onclick="_clearCsp()" style="margin-top:10px;background:#fff;border:1px solid var(--border);border-radius:9px;padding:7px 14px;font-weight:700;font-size:12px;cursor:pointer;font-family:Tajawal">مسح التنبيهات</button>')
      +'</div>';
  }).catch(function(){});
}
function _clearCsp(){
  if(!confirm('مسح كل تنبيهات CSP؟'))return;
  fetch(API+'/api/admin/csp-reports',Object.assign({method:'DELETE'},hdr())).then(function(){_loadCsp();}).catch(function(){});
}
function loadHealth(){
  _loadCsp();
  var box=document.getElementById('health-body');if(box&&!box.querySelector('.card'))box.innerHTML='<div class="loading"><div class="spinner"></div>جاري الفحص...</div>';
  fetch(API+'/api/admin/health',hdr()).then(function(r){return r.json();}).then(renderHealth).catch(function(){if(box&&!box.querySelector('.card'))box.innerHTML=emptyState('تعذر الفحص');});
  if(_healthTimer)clearInterval(_healthTimer);
  _healthTimer=setInterval(function(){
    var ph=document.getElementById('page-health');
    if(!ph||!ph.classList.contains('on')){clearInterval(_healthTimer);_healthTimer=null;return;}
    fetch(API+'/api/admin/health',hdr()).then(function(r){return r.json();}).then(renderHealth).catch(function(){});
  },60000);
}
function _hDot(ok){return '<span style="width:11px;height:11px;border-radius:50%;background:'+(ok?'#16a34a':'#dc2626')+';display:inline-block;box-shadow:0 0 0 3px '+(ok?'rgba(22,163,74,.15)':'rgba(220,38,38,.15)')+'"></span>';}
function _hCard(title,ok,rows){
  return '<div class="card" style="margin-bottom:14px;border:1px solid var(--border);border-radius:14px;padding:16px 18px">'
    +'<div style="display:flex;align-items:center;gap:9px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border)">'+_hDot(ok)+'<h3 style="margin:0;font-size:15px;color:var(--text2);font-weight:800">'+title+'</h3>'
    +'<span style="margin-inline-start:auto;font-size:11.5px;font-weight:800;padding:3px 10px;border-radius:20px;background:'+(ok?'rgba(22,163,74,.12)':'rgba(220,38,38,.12)')+';color:'+(ok?'#16a34a':'#dc2626')+'">'+(ok?'يعمل':'تحقّق')+'</span></div>'
    +'<div style="display:grid;gap:10px;max-width:420px">'+rows.map(function(r){return '<div style="display:flex;align-items:center;gap:14px;font-size:13px"><span style="color:var(--muted);min-width:110px">'+r[0]+'</span><span dir="ltr" style="font-weight:800;color:var(--text2);direction:ltr;unicode-bidi:isolate;text-align:right;white-space:nowrap">'+r[1]+'</span></div>';}).join('')+'</div></div>';
}
function _hBar(label, usedMB, capMB){
  var pct = capMB>0 ? Math.min(100, usedMB/capMB*100) : 0;
  var col = pct<60?'#16a34a':(pct<85?'#d97706':'#dc2626');
  var lbl = pct<60?'مرتاح':(pct<85?'تنبّه':'راجع الترقية');
  var fmt=function(mb){ return mb>=1000?((mb/1000).toFixed(mb/1000<10?2:1)+' GB'):(Math.round(mb*10)/10+' MB'); };
  return '<div style="margin-bottom:16px">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;margin-bottom:7px">'
    +'<span style="font-weight:800;color:var(--text2)">'+label+'</span>'
    +'<span dir="ltr" style="font-weight:800;color:'+col+'">'+fmt(usedMB)+' / '+fmt(capMB)+'</span></div>'
    +'<div style="height:13px;background:#eef2f7;border-radius:9px;overflow:hidden"><div style="height:100%;width:'+Math.max(2,pct)+'%;background:'+col+';border-radius:9px;transition:width .5s"></div></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:10.5px;margin-top:5px"><span style="color:'+col+';font-weight:800">'+lbl+' · '+(Math.round(pct*10)/10)+'%</span><span style="color:var(--muted)">باقٍ ~'+fmt(Math.max(0,capMB-usedMB))+'</span></div></div>';
}
function _hBox(title,inner){return '<div style="background:var(--bg,#f8fafc);border:1px solid var(--border);border-radius:12px;padding:12px 14px;margin:12px 0">'+'<div style="font-size:12.5px;font-weight:800;color:var(--text2);margin-bottom:9px">'+title+'</div>'+inner+'</div>';}
function _hGrowth(g){
  if(!g||!(g.historyDays>=2)){return _hBox('📈 سرعة النمو','<div style="font-size:12px;color:var(--muted);line-height:1.8">بدأ تسجيل حجم القاعدة يومياً. بعد يومين تطلع هنا سرعة النمو، وبعد أسبوع يصير التوقّع أدق.</div>');}
  var d=g.daysToFull, col, txt;
  if(d==null){col='#16a34a';txt='القاعدة ما تكبر تقريباً — ما فيه خطر امتلاء';}
  else if(d>365){col='#16a34a';txt='بهالسرعة تمتلي بعد ~'+(Math.round(d/36.5)/10)+' سنة';}
  else if(d>90){col='#16a34a';txt='بهالسرعة تمتلي بعد ~'+Math.round(d/30)+' شهر';}
  else if(d>30){col='#d97706';txt='بهالسرعة تمتلي بعد ~'+d+' يوم — خطّط للتوسعة';}
  else {col='#dc2626';txt='⚠️ بهالسرعة تمتلي بعد ~'+d+' يوم فقط — تصرّف الآن';}
  var wk=(g.weekMB>=0?'+':'')+g.weekMB+' ميجا';
  return _hBox('📈 سرعة النمو','<div style="display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px;align-items:center"><span>آخر 7 أيام: <b dir="ltr">'+wk+'</b></span><span>باليوم: <b dir="ltr">'+(g.perDayMB>=0?'+':'')+g.perDayMB+' MB</b></span><span style="font-weight:800;color:'+col+'">'+txt+'</span></div>'+(g.historyDays<7?'<div style="font-size:10.5px;color:var(--muted);margin-top:6px">مبني على '+g.historyDays+' يوم بيانات — يصير أدق بعد أسبوع.</div>':''));
}
function _hTopTables(list,total){
  if(!list.length)return '';
  var names={users:'المستخدمون',messages:'الرسائل',bids:'العروض',requests:'المشاريع',notifications:'الإشعارات',leads:'الاستقطاب',admin_logs:'سجل النشاط',push_subscriptions:'أجهزة الإشعارات',request_timeline:'سجل المشاريع',offer_flags:'مراقبة العروض',contact_unlocks:'سجل التواصل',reviews:'التقييمات',saved_requests:'المحفوظات'};
  var mx=list[0].mb||1;
  return _hBox('🗂️ أكبر الجداول (وش ماكل المساحة)',list.map(function(t){var w=Math.max(3,t.mb/mx*100);return '<div style="display:flex;align-items:center;gap:10px;font-size:12px;margin-bottom:6px"><span style="width:130px;flex-shrink:0;font-weight:700">'+esc(names[t.name]||t.name)+' <span style="color:var(--muted);font-weight:500;font-size:10.5px" dir="ltr">'+esc(t.name)+'</span></span><div style="flex:1;height:8px;background:#eef2f7;border-radius:6px;overflow:hidden"><div style="height:100%;width:'+w+'%;background:#3b82f6;border-radius:6px"></div></div><span dir="ltr" style="width:70px;text-align:left;font-weight:800">'+t.mb+' MB</span></div>';}).join(''));
}
function _hInline(im){
  if(!im||!im.count)return _hBox('🖼️ صور محفوظة داخل القاعدة','<div style="font-size:12px;color:#16a34a;font-weight:700">✅ لا توجد — كل الصور في R2</div>');
  return _hBox('🖼️ صور قديمة محفوظة داخل القاعدة','<div style="font-size:12.5px;margin-bottom:6px"><b>'+im.count+' صورة</b> تاخذ <b dir="ltr">~'+im.mb+' MB</b> من القاعدة — المفروض تنتقل إلى R2 (تنظيف مؤجّل).</div>'+(im.parts||[]).map(function(p){return '<div style="font-size:11.5px;color:var(--muted)">• '+esc(p.label)+': '+p.count+' صورة · '+p.mb+' MB</div>';}).join(''));
}
function _hStorageCard(st){
  return '<div class="card" style="margin-bottom:14px;border:1px solid var(--border);border-radius:14px;padding:16px 18px">'
    +'<div style="display:flex;align-items:center;gap:9px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border)">'
    +'<svg width="17" height="17" fill="none" stroke="var(--text2)" stroke-width="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>'
    +'<h3 style="margin:0;font-size:15px;color:var(--text2);font-weight:800">التخزين والحجم</h3></div>'
    +_hBar('تخزين الملفات والمخططات (R2)', st.r2UsedMB||0, st.r2CapMB||10000)
    +(st.r2Objects?'<div style="font-size:11px;color:var(--muted);margin:-8px 0 14px">'+st.r2Objects+' ملف في المخزن'+(st.r2BackupMB?' · منها نسخ احتياطية '+st.r2BackupMB+' MB':'')+(st.r2SyncedAt?' · آخر مطابقة مع Cloudflare: '+new Date(st.r2SyncedAt).toLocaleString('ar-SA-u-nu-latn-ca-gregory',{dateStyle:'short',timeStyle:'short'}):'')+'</div>':'')
    +_hBar('قرص قاعدة البيانات', st.dbSizeMB||0, st.dbCapMB||5000)
    +((st.dbDataMB!=null)?'<div style="font-size:11px;color:var(--muted);margin:-8px 0 14px">البيانات '+st.dbDataMB+' MB · سجلات Postgres الداخلية (WAL) '+(st.dbWalMB||0)+' MB</div>':'')
    +_hGrowth(st.growth||{})
    +_hTopTables(st.topTables||[], st.dbSizeMB||0)
    +_hInline(st.inlineImages||{})
    +'<div style="display:flex;gap:16px;font-size:11.5px;color:var(--muted);margin-top:4px"><span>مشاريع فيها ملفات: <b style="color:var(--text2)">'+(st.projectsWithFiles||0)+'</b></span><span>صور مرفوعة: <b style="color:var(--text2)">'+(st.imagesCount||0)+'</b></span></div>'
    +'<div style="font-size:10.5px;color:var(--muted);margin-top:10px;line-height:1.7">🟢 مرتاح · 🟡 تنبّه · 🔴 راجع الترقية · تخزين الملفات يُحسب تراكمياً من الآن — والرقم الدقيق في لوحة Cloudflare R2.</div></div>';
}
function _fmtUp(s){var d=Math.floor(s/86400),h=Math.floor(s%86400/3600),m=Math.floor(s%3600/60);return (d?d+'ي ':'')+(h?h+'س ':'')+m+'د';}
function _fmtBytes(b){b=b||0;return b>=1e9?(b/1e9).toFixed(2)+' GB':(b>=1e6?(b/1e6).toFixed(1)+' MB':Math.round(b/1e3)+' KB');}
var _imPoll=null;
function loadInlineMig(){
  var el=document.getElementById('inline-mig-box');if(!el)return;
  fetch(API+'/api/admin/inline-migrate',hdr()).then(function(r){return r.json();}).then(function(d){
    var f=(d.found||[]).filter(function(x){return x.mb>0.05||/image|logo|photo|attach|proof|portfolio/i.test(x.column);});
    var tot=f.reduce(function(a,x){return a+(x.mb||0);},0), st=d.state||{};
    if(!d.running&&!f.length&&!st.finishedAt){el.innerHTML='';return;}
    var h='<div class="card" style="margin-bottom:14px;border:1px solid var(--border);border-radius:14px;padding:16px 18px">'
      +'<div style="display:flex;align-items:center;gap:9px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<h3 style="margin:0;font-size:15px;color:var(--text2);font-weight:800">📤 نقل الصور القديمة من القاعدة إلى R2</h3>'
      +(!d.running&&f.length?'<button class="act-btn ab-default" style="margin-inline-start:auto;padding:6px 12px;font-size:12px" onclick="runInlineMig()"'+(!d.backupFresh||!d.r2?' disabled':'')+'>📤 ابدأ النقل</button>':'')+'</div>';
    if(d.running){
      h+='<div style="font-size:13px;font-weight:800;color:#1d4ed8">⏳ جاري النقل... انتقلت '+st.images+' صورة ('+st.mb+' MB)</div><div style="font-size:11.5px;color:var(--muted);margin-top:4px">الحين في: <span dir="ltr">'+esc(st.current||'')+'</span> — تقدر تسكّر الصفحة، يكمل بالسيرفر.</div>';
      clearTimeout(_imPoll);_imPoll=setTimeout(loadInlineMig,5000);
    } else {
      if(st.finishedAt)h+='<div style="background:'+(st.error?'#fef2f2':'#f0fdf4')+';border:1px solid '+(st.error?'#fecaca':'#bbf7d0')+';border-radius:9px;padding:9px 11px;font-size:12.5px;color:'+(st.error?'#991b1b':'#166534')+';margin-bottom:10px">'+(st.error?'⚠️ توقّف: '+esc(st.error):'✅ خلص النقل: '+st.images+' صورة ('+st.mb+' MB) في '+st.rows+' سجل')+(st.failed?' · '+st.failed+' عنصر ما انتقل (نوع غير مسموح، تُرك كما هو)':'')+'</div>';
      if(f.length){
        h+='<div style="font-size:12.5px;margin-bottom:8px">فيه <b dir="ltr">~'+(Math.round(tot*10)/10)+' MB</b> صور محفوظة داخل القاعدة:</div>'
          +f.map(function(x){return '<div style="font-size:11.5px;color:var(--muted)">• <span dir="ltr">'+esc(x.table)+'.'+esc(x.column)+'</span>: '+x.rows+' سجل · '+x.mb+' MB</div>';}).join('')
          +'<div style="font-size:11.5px;color:var(--muted);line-height:1.8;margin-top:10px">النقل يرفع كل صورة لـ R2 ويحط رابطها مكانها — الصور تظهر للمستخدمين نفسها بدون أي فرق. ما يستبدل شي إلا لو الرفع نجح.</div>'
          +(!d.backupFresh?'<div style="font-size:12px;color:#b45309;font-weight:700;margin-top:8px">⚠️ لازم نسخة احتياطية خلال آخر 24 ساعة قبل النقل — اضغط «نسخة الآن» فوق أول.</div>':'');
      } else if(!st.finishedAt){ h+='<div style="font-size:12.5px;color:#16a34a;font-weight:700">✅ لا توجد صور داخل القاعدة</div>'; }
    }
    el.innerHTML=h+'</div>';
  }).catch(function(){el.innerHTML='';});
}
async function runInlineMig(){
  if(!await askConfirm({title:'نقل الصور القديمة إلى R2',message:'بيرفع كل الصور المحفوظة داخل القاعدة إلى R2 ويستبدلها بروابط. فيه نسخة احتياطية حديثة لو احتجت ترجع. تبدأ؟',confirmText:'نعم، ابدأ'}))return;
  fetch(API+'/api/admin/inline-migrate/run',Object.assign({method:'POST'},hdr())).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});}).then(function(res){
    toast(res.ok?'بدأ النقل — ياخذ دقايق':((res.d&&res.d.message)||'تعذّر البدء'),res.ok?'success':'error');setTimeout(loadInlineMig,1500);
  }).catch(function(){toast('تعذّر الاتصال','error');});
}
function loadOffsite(){
  var el=document.getElementById('offsite-box');if(!el)return;
  fetch(API+'/api/admin/offsite-backups',hdr()).then(function(r){return r.json();}).then(function(d){
    var bl=d.backups||[], last=d.last, err=d.error;
    var ago=function(t){if(!t)return '—';var h=(Date.now()-new Date(t).getTime())/36e5;return h<1?'قبل أقل من ساعة':(h<48?'قبل '+Math.round(h)+' ساعة':'قبل '+Math.round(h/24)+' يوم');};
    var newest=bl[0], stale=!newest||(Date.now()-new Date(newest.at).getTime()>36*36e5);
    var col=!d.r2?'#dc2626':(stale?'#d97706':'#16a34a');
    var status=!d.r2?'R2 غير متصل — النسخ متوقفة':(d.running?'⏳ جاري إنشاء نسخة الآن...':(newest?('آخر نسخة '+ago(newest.at)+' · '+_fmtBytes(newest.bytes)):'لا توجد نسخ بعد — أول نسخة تلقائية خلال ساعات، أو اضغط «نسخة الآن»'));
    var h='<div class="card" style="margin-bottom:14px;border:1px solid var(--border);border-radius:14px;padding:16px 18px">'
      +'<div style="display:flex;align-items:center;gap:9px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<span style="width:10px;height:10px;border-radius:50%;background:'+col+'"></span>'
      +'<h3 style="margin:0;font-size:15px;color:var(--text2);font-weight:800">💾 نسخ احتياطية خارج Railway (R2)</h3>'
      +'<button class="act-btn ab-default" style="margin-inline-start:auto;padding:6px 12px;font-size:12px" id="offsite-run" onclick="runOffsiteNow()"'+(d.running||!d.r2?' disabled':'')+'>💾 نسخة الآن</button></div>'
      +'<div style="font-size:13px;font-weight:800;color:'+col+';margin-bottom:6px">'+status+'</div>'
      +'<div style="font-size:11.5px;color:var(--muted);line-height:1.8;margin-bottom:10px">نسخة كاملة من القاعدة يومياً إلى Cloudflare — لو صار شي لحساب Railway نفسه، بياناتك موجودة هنا. يحتفظ بآخر 7 أيام + نسخة كل جمعة لآخر 4 أسابيع.'+(last&&last.rows?' آخر نسخة فيها '+last.tables+' جدول و'+Number(last.rows).toLocaleString('en-US')+' سجل.':'')+'</div>'
      +(err&&(!newest||new Date(err.at)>new Date(newest.at))?'<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:9px;padding:9px 11px;font-size:12px;color:#991b1b;margin-bottom:10px">⚠️ آخر محاولة فشلت ('+ago(err.at)+'): '+esc(err.msg||'')+'</div>':'')
      +(bl.length?'<div style="display:flex;flex-direction:column;gap:6px">'+bl.slice(0,12).map(function(b){var dt=new Date(b.at);return '<div style="display:flex;align-items:center;gap:10px;font-size:12px;background:var(--bg,#f8fafc);border:1px solid var(--border);border-radius:9px;padding:8px 11px"><span style="font-weight:800">'+dt.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{weekday:'short',day:'numeric',month:'short'})+'</span><span style="color:var(--muted)">'+dt.toLocaleTimeString('ar-SA-u-nu-latn-ca-gregory',{hour:'2-digit',minute:'2-digit'})+'</span><span dir="ltr" style="margin-inline-start:auto;color:var(--muted)">'+_fmtBytes(b.bytes)+'</span>'+(b.url?'<a href="'+esc(_safeUrl(b.url))+'" download style="color:#1d4ed8;font-weight:800;text-decoration:none">⬇ تحميل</a>':'')+'</div>';}).join('')+'</div>':'')
      +(function(f){f=f||{};var L=f.last,E=f.error;
        if(!f.configured)return '<div style="margin-top:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:10px 12px;font-size:12px;color:#92400e;line-height:1.8">📁 <b>نسخة الصور والمرفقات: غير مفعّلة.</b> تحتاج مخزن ثاني في Cloudflare + متغيّر <span dir="ltr">R2_BACKUP_BUCKET</span> في Railway.</div>';
        var bad=E&&(!L||new Date(E.at)>new Date(L.at));
        var txt=f.running?'⏳ جاري نسخ الملفات...':(L?('📁 الصور والمرفقات: '+(L.backupCount||0)+' ملف في النسخة · آخر مزامنة '+new Date(L.at).toLocaleString('ar-SA-u-nu-latn-ca-gregory',{dateStyle:'short',timeStyle:'short'})+(L.copied?' · نُسخ '+L.copied+' جديد':'')+(L.remaining?' · باقي '+L.remaining+' تكمل المرة الجاية':'')):'📁 الصور والمرفقات: مفعّلة — أول مزامنة خلال ساعات أو اضغط «نسخة الآن»');
        return '<div style="margin-top:12px;background:'+(bad?'#fef2f2':'#f0fdf4')+';border:1px solid '+(bad?'#fecaca':'#bbf7d0')+';border-radius:10px;padding:10px 12px;font-size:12px;color:'+(bad?'#991b1b':'#166534')+';line-height:1.8">'+txt+(bad?'<br>⚠️ آخر محاولة فشلت: '+esc(E.msg||''):'')+'<div style="color:var(--muted);font-size:11px">المخزن الاحتياطي: <span dir="ltr">'+esc(f.bucket||'')+'</span> — ينسخ الجديد يومياً ولا يحذف منه أبداً.</div></div>';
      })(d.files)
      +'<div style="font-size:10.5px;color:var(--muted);margin-top:10px;line-height:1.8">🔒 الملف فيه بيانات المستخدمين — لا تشارك رابط التحميل. الاسترجاع يحتاج خطوات تقنية: تواصل مع المطوّر.</div>'
      +'</div>';
    el.innerHTML=h;
    if(d.running)setTimeout(loadOffsite,8000);
  }).catch(function(){el.innerHTML='';});
}
function runOffsiteNow(){
  var b=document.getElementById('offsite-run');if(b){b.disabled=true;b.textContent='⏳ جاري...';}
  fetch(API+'/api/admin/offsite-backups/run',Object.assign({method:'POST'},hdr())).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});}).then(function(res){
    toast(res.ok?'بدأت النسخة — تاخذ دقيقة أو دقيقتين':((res.d&&res.d.message)||'تعذّر البدء'),res.ok?'success':'error');
    setTimeout(loadOffsite,1500);
  }).catch(function(){toast('تعذّر الاتصال','error');if(b){b.disabled=false;b.textContent='💾 نسخة الآن';}});
}
function renderHealth(d){
  d=d||{};var box=document.getElementById('health-body');if(!box)return;
  var db=d.db||{},em=d.email||{},pu=d.push||{},sv=d.server||{},dt=d.data||{};
  var banner='<div style="background:'+(d.allOk?'linear-gradient(135deg,#e8f7ee,#d1f0dd)':'linear-gradient(135deg,#fdeaea,#fbd5d5)')+';border-radius:14px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">'
    +'<div style="font-size:26px">'+(d.allOk?'✅':'⚠️')+'</div><div><div style="font-weight:900;font-size:16px;color:'+(d.allOk?'#16a34a':'#dc2626')+'">'+(d.allOk?'كل الأنظمة تعمل':'يوجد ما يحتاج انتباه')+'</div>'
    +'<div style="font-size:12px;color:#64748b">آخر فحص: الآن</div></div>'
    +'<button onclick="_refreshHealth(this)" style="margin-inline-start:auto;background:#fff;border:1px solid var(--border);border-radius:9px;padding:8px 14px;font-weight:700;font-size:12px;cursor:pointer;font-family:Tajawal">تحديث</button></div>';
  setTimeout(loadOffsite,50);
  setTimeout(loadInlineMig,80);
  box.innerHTML=banner
    +'<div id="offsite-box"></div>'
    +'<div id="inline-mig-box"></div>'
    +_hCard('قاعدة البيانات', db.ok, [['الحالة', db.ok?'متصلة':'غير متصلة'],['زمن الاستجابة', (db.latencyMs!=null?db.latencyMs+' ms':'—')]])
    +_hCard('الإيميل (Resend)', em.ok, [['الإعداد', em.configured?'مضبوط':'غير مضبوط'],['المُرسِل', em.from||'—']])
    +_hCard('الإشعارات (Push)', pu.ok, [['أجهزة مسجّلة', (pu.tokens||0)],['مستخدمون', (pu.users||0)]])
    +_hCard('الخادم', sv.ok, [['مدة التشغيل', _fmtUp(sv.uptimeSec||0)],['إصدار Node', sv.node||'—'],['الذاكرة', (sv.memMB||0)+' MB']])
    +_hStorageCard(d.storage||{})
    +'<div class="card"><div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><h3 style="margin:0;font-size:15px;color:var(--text2)">لمحة سريعة</h3></div>'
    +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px">'
    +_mkStat(dt.users||0,'مستخدمون')+_mkStat(dt.providers||0,'مزودون','#d97706')+_mkStat(dt.requests||0,'مشاريع','#6366f1')+_mkStat(dt.openRequests||0,'مفتوحة','#0ea5e9')+_mkStat(dt.completedRequests||0,'مكتملة','#16a34a')+_mkStat(dt.bids||0,'عروض','#8b5cf6')+_mkStat(dt.leads||0,'استقطاب','#0891b2')+_mkStat(dt.pendingReports||0,'بلاغات معلّقة',(dt.pendingReports>0?'#dc2626':'#16a34a'))
    +'</div><div style="font-size:11px;color:var(--muted);margin-top:12px;line-height:1.7">💡 حجم تخزين الملفات الدقيق (R2) والطلبات في لوحة Cloudflare R2 · استهلاك المعالج/الذاكرة التفصيلي في Railway → Metrics.</div></div>';
}
function setChart(btn,days){
  var tabs=document.querySelectorAll('#chart-tabs .rtab');for(var i=0;i<tabs.length;i++)tabs[i].className='rtab';
  if(btn)btn.className='rtab on';loadChart(days);
}
function loadChart(days){
  var box=document.getElementById('chart-body');if(box)box.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/analytics-series?days='+days,hdr()).then(function(r){return r.json();}).then(renderChart).catch(function(){if(box)box.innerHTML=emptyState('تعذر التحميل');});
}
function _linePath(vals,W,H,pad,maxV){
  if(!vals.length)return '';
  var n=vals.length,iw=W-pad*2,ih=H-pad*2;
  return vals.map(function(v,i){
    var x=pad+(n===1?iw/2:iw*i/(n-1));
    var y=pad+ih-(maxV?ih*v/maxV:0);
    return (i===0?'M':'L')+x.toFixed(1)+' '+y.toFixed(1);
  }).join(' ');
}
function renderChart(d){
  var box=document.getElementById('chart-body');if(!box)return;
  if(!d||!d.labels||!d.labels.length){box.innerHTML=emptyState('لا توجد بيانات');return;}
  var W=680,H=240,pad=28;
  var series=[
    {name:'مشاريع',vals:d.projects||[],color:'#2563eb'},
    {name:'عملاء',vals:d.clients||[],color:'#16a34a'},
    {name:'مزودون',vals:d.providers||[],color:'#d97706'},
    {name:'عروض',vals:d.bids||[],color:'#0ea5e9'},
    {name:'مكتملة',vals:d.completed||[],color:'#7c3aed'}
  ];
  var maxV=1;series.forEach(function(s){s.vals.forEach(function(v){if(v>maxV)maxV=v;});});
  var grid='';for(var g=0;g<=4;g++){var gy=pad+(H-pad*2)*g/4;grid+='<line x1="'+pad+'" y1="'+gy+'" x2="'+(W-pad)+'" y2="'+gy+'" stroke="var(--border)" stroke-width="1"/>';grid+='<text x="'+(W-pad+4)+'" y="'+(gy+4)+'" font-size="10" fill="var(--muted)">'+Math.round(maxV*(4-g)/4)+'</text>';}
  var lines=series.map(function(s){return '<path d="'+_linePath(s.vals,W,H,pad,maxV)+'" fill="none" stroke="'+s.color+'" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';}).join('');
  var legend=series.map(function(s){return '<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--text2);margin:0 8px 6px 0"><span style="width:11px;height:11px;border-radius:3px;background:'+s.color+'"></span>'+s.name+'</span>';}).join('');
  var first=d.labels[0],last=d.labels[d.labels.length-1];
  box.innerHTML='<div style="margin-bottom:10px">'+legend+'</div>'
    +'<div style="overflow-x:auto"><svg viewBox="0 0 '+W+' '+H+'" style="width:100%;min-width:520px;height:auto;font-family:Tajawal,sans-serif">'+grid+lines+'</svg></div>'
    +'<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);padding:0 '+pad+'px">'
    +'<span>'+last+'</span><span>'+first+'</span></div>';
}
function setRange(btn,p){
  var tabs=document.querySelectorAll('#range-tabs .rtab'); for(var i=0;i<tabs.length;i++)tabs[i].className='rtab';
  if(btn)btn.className='rtab on';
  loadRange(p);
}
function loadRange(p){
  var box=document.getElementById('range-body');if(box)box.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/stats-range?period='+encodeURIComponent(p),hdr()).then(function(r){return r.json();}).then(renderRange).catch(function(){if(box)box.innerHTML=emptyState('تعذر التحميل');});
}
function renderRange(s){
  s=s||{};var box=document.getElementById('range-body');if(!box)return;
  box.innerHTML='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">'
    +_mkStat(s.projects||0,'مشاريع منشورة')
    +_mkStat(s.clients||0,'تسجيل عملاء','#16a34a')
    +_mkStat(s.providers||0,'تسجيل مزودين','#d97706')
    +_mkStat(s.bids||0,'عروض مقدّمة','#0ea5e9')
    +'</div>';
}
function loadReminders(){
  var box=document.getElementById('reminders-body');if(box)box.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/reminders',hdr()).then(function(r){return r.json();}).then(renderReminders).catch(function(){if(box)box.innerHTML=emptyState('تعذر التحميل');});
}
function _remRow(id,label,days,on){
  return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
    +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:150px">'+label+'</div>'
    +'<div style="display:flex;align-items:center;gap:10px">'
      +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">بعد <input type="number" min="0" id="rem-'+id+'-d" value="'+days+'" style="width:64px"> يوم</label>'
      +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="rem-'+id+'-on" '+(on?'checked':'')+'> مفعّل</label>'
    +'</div></div>';
}
function renderReminders(c){
  c=c||{};var box=document.getElementById('reminders-body');if(!box)return;
  box.innerHTML=
    _remRow('offers','تذكير: عندك عروض ولم تختر (عميل)',c.offersDays!=null?c.offersDays:2,c.offersOn!==false)
   +_remRow('deal','تذكير: أتمم صفقتك (عميل)',c.dealDays!=null?c.dealDays:5,c.dealOn!==false)
   +_remRow('review','تذكير: قيّم المزوّد (عميل)',c.reviewDays!=null?c.reviewDays:1,c.reviewOn!==false)
   +_remRow('profile','تذكير: أكمل ملفك (مزوّد)',c.profileDays!=null?c.profileDays:1,c.profileOn!==false)
   +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
     +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:150px">بطاقة «أكمل ملفك» العائمة</div>'
     +'<div style="display:flex;align-items:center;gap:10px">'
       +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">تظهر بعد <input type="number" min="0" id="rem-delay" value="'+(c.nudgeDelaySec!=null?c.nudgeDelaySec:20)+'" style="width:64px"> ثانية</label>'
       +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">كتم <input type="number" min="0" id="rem-snooze" value="'+(c.nudgeSnoozeDays!=null?c.nudgeSnoozeDays:3)+'" style="width:56px"> يوم</label>'
     +'</div></div>'
   +'<button class="btn-p" style="max-width:220px;margin-top:14px" onclick="saveReminders()">حفظ الإعدادات</button>';
  renderLifecycle(c);
}
function renderLifecycle(c){
  c=c||{};var box=document.getElementById('lifecycle-body');if(!box)return;
  box.innerHTML=
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">إغلاق مشروع بعروض لم يُختر</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">بعد <input type="number" min="1" id="lc-close-d" value="'+(c.lcCloseDays!=null?c.lcCloseDays:20)+'" style="width:60px"> يوم</label>'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">تنبيه قبل <input type="number" min="0" id="lc-close-w" value="'+(c.lcCloseWarn!=null?c.lcCloseWarn:2)+'" style="width:52px"> يوم</label>'
        +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="lc-close-on" '+(c.lcCloseOn!==false?'checked':'')+'> مفعّل</label>'
      +'</div></div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">تأكيد إتمام (موافقة ضمنية)</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">يُسأل بعد <input type="number" min="1" id="lc-conf-d" value="'+(c.lcConfirmDays!=null?c.lcConfirmDays:20)+'" style="width:60px"> يوم</label>'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">مهلة الرد <input type="number" min="1" id="lc-conf-g" value="'+(c.lcConfirmGrace!=null?c.lcConfirmGrace:3)+'" style="width:52px"> يوم</label>'
        +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="lc-conf-on" '+(c.lcConfirmOn!==false?'checked':'')+'> مفعّل</label>'
      +'</div></div>'
    +'<div style="font-size:11px;color:var(--muted);background:var(--p-light);border-radius:10px;padding:10px;margin-top:8px;line-height:1.7">إن لم يرد العميل خلال مهلة الرد، يُعتبر المشروع منتهياً تلقائياً (موافقة ضمنية) — لا يُغلق قسراً، والعميل يقدر يعترض.</div>'
    +'<button class="btn-p" style="max-width:220px;margin-top:14px" onclick="saveReminders()">حفظ إعدادات الأتمتة</button>';
  renderReact(c);
}
function renderReact(c){
  c=c||{};var box=document.getElementById('react-body');if(!box)return;
  box.innerHTML=
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">مزوّد لم يدخل «اشتقنا لك»</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">بعد <input type="number" min="1" id="react-in-d" value="'+(c.reactInactiveDays!=null?c.reactInactiveDays:30)+'" style="width:60px"> يوم</label>'
        +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="react-in-on" '+(c.reactInactiveOn!==false?'checked':'')+'> مفعّل</label>'
      +'</div></div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">مزوّد لم يقدّم عروضاً «لا تفوّت الفرص»</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">بعد <input type="number" min="1" id="react-nb-d" value="'+(c.reactNobidsDays!=null?c.reactNobidsDays:21)+'" style="width:60px"> يوم</label>'
        +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="react-nb-on" '+(c.reactNobidsOn!==false?'checked':'')+'> مفعّل</label>'
      +'</div></div>'
    +'<div style="font-size:11px;color:var(--muted);background:var(--p-light);border-radius:10px;padding:10px;margin-top:8px;line-height:1.7">تُرسل بشكل دوري (لا تتكرر يومياً) لإعادة تنشيط المزوّد بلطف.</div>'
    +'<button class="btn-p" style="max-width:220px;margin-top:14px" onclick="saveReminders()">حفظ إعدادات التنشيط</button>';
  renderQuality(c);
}
function renderQuality(c){
  c=c||{};var box=document.getElementById('quality-body');if(!box)return;
  box.innerHTML=
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">طلب بلا عروض «حسّن وصفك» (عميل)</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">بعد <input type="number" min="1" id="q-no-d" value="'+(c.qNooffersDays!=null?c.qNooffersDays:3)+'" style="width:60px"> يوم</label>'
        +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="q-no-on" '+(c.qNooffersOn!==false?'checked':'')+'> مفعّل</label>'
      +'</div></div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">تقييم منخفض «لنرتقِ بخدمتك» (مزوّد)</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">أقل من <input type="number" min="1" max="5" step="0.5" id="q-lr-t" value="'+(c.qLowRatingThreshold!=null?c.qLowRatingThreshold:3)+'" style="width:56px"> نجوم</label>'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">بعد <input type="number" min="1" id="q-lr-m" value="'+(c.qLowRatingMin!=null?c.qLowRatingMin:3)+'" style="width:52px"> تقييم</label>'
        +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="q-lr-on" '+(c.qLowRatingOn!==false?'checked':'')+'> مفعّل</label>'
      +'</div></div>'
    +'<button class="btn-p" style="max-width:220px;margin-top:14px" onclick="saveReminders()">حفظ إعدادات الجودة</button>';
  renderAdminAlerts(c);
}
function renderAdminAlerts(c){
  c=c||{};var box=document.getElementById('adminalerts-body');if(!box)return;
  box.innerHTML=
    '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">تذكير العميل بالرد على الأسئلة</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">بعد <input type="number" min="1" id="qa-d" value="'+(c.qaAnswerDays!=null?c.qaAnswerDays:2)+'" style="width:56px"> يوم</label>'
        +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="qa-on" '+(c.qaAnswerOn!==false?'checked':'')+'> مفعّل</label>'
      +'</div></div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">تذكير المزوّد بعرضه المعلّق</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">بعد <input type="number" min="1" id="bf-d" value="'+(c.bidFollowupDays!=null?c.bidFollowupDays:7)+'" style="width:56px"> يوم</label>'
        +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="bf-on" '+(c.bidFollowupOn!==false?'checked':'')+'> مفعّل</label>'
      +'</div></div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">إشعار المزودين بالمشاريع المطابقة</div>'
      +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="match-on" '+(c.matchNotifyOn!==false?'checked':'')+'> مفعّل</label>'
    +'</div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">ملخّص يومي بالإيميل</div>'
      +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="adm-sum-on" '+(c.adminSummaryOn!==false?'checked':'')+'> مفعّل</label>'
    +'</div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;flex-wrap:wrap">'
      +'<div style="font-size:13px;font-weight:700;color:var(--text2);min-width:180px">تنبيه طفرة تسجيلات</div>'
      +'<div style="display:flex;align-items:center;gap:10px">'
        +'<label style="font-size:12px;color:var(--muted);display:inline-flex;align-items:center;gap:5px">إذا تجاوز <input type="number" min="3" id="adm-an-t" value="'+(c.adminAnomalyThreshold!=null?c.adminAnomalyThreshold:15)+'" style="width:56px"> حساب/ساعة</label>'
        +'<label style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="adm-an-on" '+(c.adminAnomalyOn!==false?'checked':'')+'> مفعّل</label>'
      +'</div></div>'
    +'<div style="font-size:11px;color:var(--muted);background:var(--p-light);border-radius:10px;padding:10px;margin-top:8px;line-height:1.7">تُرسل التنبيهات لبريد كل مشرف (admin). الملخّص مرّة يومياً، والشذوذ فوري عند تجاوز الحد.</div>'
    +'<button class="btn-p" style="max-width:220px;margin-top:14px" onclick="saveReminders()">حفظ تنبيهات الإدارة</button>';
}
function saveReminders(){
  var v=function(id){return document.getElementById(id);};
  var val=function(id,d){var e=v(id);return e?e.value:d;};
  var chk=function(id,d){var e=v(id);return e?e.checked:d;};
  var body={
    offersDays:+val('rem-offers-d',2), dealDays:+val('rem-deal-d',5), reviewDays:+val('rem-review-d',1), profileDays:+val('rem-profile-d',1),
    offersOn:chk('rem-offers-on',true), dealOn:chk('rem-deal-on',true), reviewOn:chk('rem-review-on',true), profileOn:chk('rem-profile-on',true),
    nudgeDelaySec:+val('rem-delay',20), nudgeSnoozeDays:+val('rem-snooze',3),
    lcCloseOn:chk('lc-close-on',true), lcCloseDays:+val('lc-close-d',20), lcCloseWarn:+val('lc-close-w',2),
    lcConfirmOn:chk('lc-conf-on',true), lcConfirmDays:+val('lc-conf-d',20), lcConfirmGrace:+val('lc-conf-g',3),
    reactInactiveOn:chk('react-in-on',true), reactInactiveDays:+val('react-in-d',30),
    reactNobidsOn:chk('react-nb-on',true), reactNobidsDays:+val('react-nb-d',21),
    qNooffersOn:chk('q-no-on',true), qNooffersDays:+val('q-no-d',3),
    qLowRatingOn:chk('q-lr-on',true), qLowRatingThreshold:+val('q-lr-t',3), qLowRatingMin:+val('q-lr-m',3),
    adminSummaryOn:chk('adm-sum-on',true), adminAnomalyOn:chk('adm-an-on',true), adminAnomalyThreshold:+val('adm-an-t',15),
    matchNotifyOn:chk('match-on',true),
    qaAnswerOn:chk('qa-on',true), qaAnswerDays:+val('qa-d',2),
    bidFollowupOn:chk('bf-on',true), bidFollowupDays:+val('bf-d',7)
  };
  fetch(API+'/api/admin/reminders',Object.assign({method:'PUT',body:JSON.stringify(body)},hdr()))
    .then(function(r){return r.json();}).then(function(d){ toast(d.ok?'تم حفظ الإعدادات':(d.message||'تعذر الحفظ'), d.ok?'success':'error'); })
    .catch(function(){ toast('تعذر الاتصال','error'); });
}
function loadPixels(){
  var box=document.getElementById('pixels-body');if(box)box.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/pixels',hdr()).then(function(r){return r.json();}).then(renderPixels).catch(function(){if(box)box.innerHTML=emptyState('تعذر التحميل');});
}
function _pxRow(id,label,val,on,ph){
  return '<div style="margin-bottom:14px">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
      +'<label style="font-size:13px;font-weight:700;color:var(--text2)">'+label+'</label>'
      +'<label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--muted);cursor:pointer"><input type="checkbox" id="px-'+id+'-on" '+(on?'checked':'')+'> مفعّل</label>'
    +'</div>'
    +'<input id="px-'+id+'" value="'+String(val||'').replace(/"/g,'&quot;')+'" placeholder="'+ph+'" style="width:100%">'
  +'</div>';
}
function renderPixels(p){
  p=p||{};var box=document.getElementById('pixels-body');if(!box)return;
  box.innerHTML=
    _pxRow('meta','Meta / فيسبوك وإنستغرام',p.metaPixelId,p.metaOn!==false,'123456789012345')
   +_pxRow('tiktok','TikTok',p.tiktokPixelId,p.tiktokOn!==false,'CXXXXXXXXXXXXXXXXXXX')
   +_pxRow('snap','Snapchat',p.snapPixelId,p.snapOn!==false,'xxxxxxxx-xxxx-xxxx')
   +_pxRow('google','Google GA4',p.googleId,p.googleOn!==false,'G-XXXXXXXXXX')
   +'<button class="btn-p" style="max-width:200px" onclick="savePixels()">حفظ البكسلات</button>';
}
function savePixels(){
  var body={
    metaPixelId:document.getElementById('px-meta').value.trim(),
    tiktokPixelId:document.getElementById('px-tiktok').value.trim(),
    snapPixelId:document.getElementById('px-snap').value.trim(),
    googleId:document.getElementById('px-google').value.trim(),
    metaOn:document.getElementById('px-meta-on').checked,
    tiktokOn:document.getElementById('px-tiktok-on').checked,
    snapOn:document.getElementById('px-snap-on').checked,
    googleOn:document.getElementById('px-google-on').checked
  };
  fetch(API+'/api/admin/pixels',Object.assign({method:'PUT',body:JSON.stringify(body)},hdr()))
    .then(function(r){return r.json();}).then(function(d){ toast(d.ok?'تم حفظ البكسلات':(d.message||'تعذر الحفظ'), d.ok?'success':'error'); })
    .catch(function(){ toast('تعذر الاتصال','error'); });
}
function loadMkStats(){
  var box=document.getElementById('mkstats-body');if(box)box.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/marketing-stats',hdr()).then(function(r){return r.json();}).then(renderMkStats).catch(function(){if(box)box.innerHTML=emptyState('تعذر التحميل');});
}
function _mkStat(v,l,c){return '<div style="background:var(--p-light);border-radius:12px;padding:14px;text-align:center"><div style="font-size:22px;font-weight:900;color:'+(c||'var(--accent)')+'">'+v+'</div><div style="font-size:11px;color:var(--muted);margin-top:3px">'+l+'</div></div>';}
function renderMkStats(s){
  s=s||{};var r=s.registrations||{},p=s.projects||{},b=s.bids||{},cv=s.conversion||{};
  var box=document.getElementById('mkstats-body');if(!box)return;
  var cities=(s.topCities||[]).map(function(x){return '<span style="display:inline-block;background:var(--p-light);border-radius:20px;padding:4px 12px;font-size:12px;margin:3px">'+esc(x.city)+' ('+x.count+')</span>';}).join('');
  box.innerHTML=
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px">'
    +_mkStat(r.total||0,'إجمالي التسجيلات')
    +_mkStat(r.clients||0,'عملاء','#16a34a')
    +_mkStat(r.providers||0,'مزودون','#d97706')
    +_mkStat(r.last24h||0,'تسجيل (24 ساعة)')
    +_mkStat(p.total||0,'مشاريع منشورة')
    +_mkStat(b.total||0,'عروض مقدّمة')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">'
    +_mkStat(cv.projectsPerClient||0,'مشاريع لكل عميل')
    +_mkStat(cv.bidsPerProject||0,'عروض لكل مشروع')
    +'</div>'
    +(cities?'<div><div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px">المدن الأكثر نشاطاً</div>'+cities+'</div>':'');
}
function loadSettings(){
  var box=document.getElementById('settings-body');if(box)box.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  fetch(API+'/api/admin/settings',hdr()).then(function(r){return r.json();}).then(function(st){renderSettings(st||{});}).catch(function(){if(box)box.innerHTML=emptyState('تعذر التحميل');});
}
function renderSettings(st){
  var box=document.getElementById('settings-body');if(!box)return;
  var rm=parseInt(st.review_minutes);if(isNaN(rm))rm=1440;
  var opts=[{v:0,t:'بدون نشر تلقائي — مراجعة يدوية فقط'},{v:60,t:'ساعة'},{v:360,t:'٦ ساعات'},{v:720,t:'١٢ ساعة'},{v:1440,t:'٢٤ ساعة (شبكة أمان)'}];
  if(!opts.some(function(o){return o.v===rm;}))opts.push({v:rm,t:rm+' دقيقة'});
  var sel='<select id="set-review-min">'+opts.map(function(o){return '<option value="'+o.v+'"'+(o.v===rm?' selected':'')+'>'+o.t+'</option>';}).join('')+'</select>';
  box.innerHTML=''+
    '<div class="fld" style="margin-bottom:6px"><label>النشر التلقائي بعد المراجعة</label>'+sel+'</div>'+
    '<div style="font-size:12.5px;color:var(--muted);line-height:1.8;margin-bottom:18px;background:var(--p-light);padding:13px 15px;border-radius:11px">كل مشروع جديد يدخل «قيد المراجعة» ولا يُنشر حتى تعتمده من تبويب «مراجعة المشاريع». الخيار أعلاه شبكة أمان: لو غفلت عن المراجعة، يُنشر تلقائياً بعد المدة المحددة. اختر <b>«مراجعة يدوية فقط»</b> لإيقاف النشر التلقائي نهائياً — لن يُنشر أي مشروع إلا باعتمادك.</div>'+
    '<div class="fld" style="margin-bottom:6px"><label>خدمة العملاء (رقم واتساب)</label>'+
    '<input id="set-support-wa" type="text" dir="ltr" placeholder="05xxxxxxxx" value="'+esc(st.support_whatsapp||'')+'"></div>'+
    '<div style="font-size:12.5px;color:var(--muted);line-height:1.8;margin-bottom:18px;background:var(--p-light);padding:13px 15px;border-radius:11px">الرقم اللي يوصل له العملاء عبر زر «خدمة العملاء» في كل الصفحات. تغيّره هنا مرة → يتحدّث في كل مكان تلقائياً.</div>'+
    '<button class="btn-p" style="max-width:210px" onclick="saveSettings()">حفظ الإعدادات</button>';
}
function saveSettings(){
  var inp=document.getElementById('set-review-min');var v=parseInt(inp.value);
  if(isNaN(v)||v<0)v=0;
  if(v>1440)v=1440;
  var _wa=((document.getElementById('set-support-wa')||{}).value||'').trim();
  fetch(API+'/api/admin/settings',Object.assign({method:'PUT',body:JSON.stringify({review_minutes:v,support_whatsapp:_wa})},hdr()))
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(){toast('تم حفظ الإعدادات','success');})
    .catch(function(){toast('تعذر الحفظ','error');});
}

// ═══ تعديل بيانات المستخدم ═══
var _editUserId=null;
function openUserEdit(uid){
  var u=_allUsers.find(function(x){return x.id===uid;});if(!u)return;
  _editUserId=uid;
  document.getElementById('ue-name').value=u.name||'';
  document.getElementById('ue-email').value=u.email||'';
  document.getElementById('ue-phone').value=u.phone||'';
  _ueCityFill(u.city||'');
  window._ueSpecs=(u.specialties||[]).slice(); window._ueSvc=(u.service_cities||[]).slice();
  document.getElementById('ue-all').checked=!!u.serves_all_cities; document.getElementById('ue-exp').value=u.experience_years!=null?u.experience_years:'';
  _ueSpecsRender(); _ueSvcRender(); _ueAllTog();
  document.getElementById('ue-biz').value=u.business_name||'';
  document.getElementById('ue-bio').value=u.bio||'';
  // نعرض بيانات المزوّد دائماً لو فيها محتوى (يكشف من سجّل كمزوّد لكن دوره عميل) أو لو الدور مزوّد
  var hasProvData = !!(u.business_name || u.bio || (u.specialties&&u.specialties.length) || u.category);
  document.getElementById('ue-biz-wrap').style.display=(u.role==='provider'||hasProvData)?'block':'none';
  // مؤشّر تنبيه لو فيه تعارض: دوره عميل لكن عنده بيانات مزوّد
  var warn=document.getElementById('ue-role-warn');
  if(warn) warn.style.display=(u.role==='client'&&hasProvData)?'block':'none';
  // اعرض الدور الحالي في قائمة الاختيار لو موجودة
  var rSel=document.getElementById('ue-role'); if(rSel) rSel.value=u.role||'client';
  closeModal('userModal');
  document.getElementById('uEditModal').classList.add('show');
}
var UE_CITIES=['الرياض','الخرج','الدوادمي','المجمعة','القويعية','الزلفي','الدرعية','الدلم','المزاحمية','الحريق','حوطة بني تميم','وادي الدواسر','السليل','الأفلاج','الغاط','ثادق','حريملاء','مرات','ضرما','جدة','مكة المكرمة','الطائف','رابغ','القنفذة','الليث','خليص','تربة','المويه','الخرمة','رنية','المدينة المنورة','ينبع','العلا','الوجه','ضباء','أملج','المهد','بدر','خيبر','بريدة','عنيزة','الرس','البكيرية','الأسياح','رياض الخبراء','عيون الجواء','النبهانية','الشماسية','البدائع','المذنب','الخبراء','الدمام','الخبر','الظهران','الأحساء','القطيف','الجبيل','حفر الباطن','الخفجي','بقيق','النعيرية','رأس تنورة','صفوى','سيهات','العوامية','أبها','خميس مشيط','بيشة','النماص','محايل عسير','أحد رفيدة','سراة عبيدة','ظهران الجنوب','تثليث','بلقرن','رجال ألمع','المجاردة','الحرجة','تبوك','تيماء','قيال','حقل','حائل','بقعاء','الشنان','الغزالة','عرعر','طريف','رفحاء','سكاكا','دومة الجندل','القريات','الباحة','بلجرشي','المندق','العقيق','قلوة','المخواة','غامد الزناد','جازان','صبيا','أبو عريش','صامطة','الدرب','ضمد','أحد المسارحة','العارضة','الريث','الحرث','نجران','شرورة','شقراء','عفيف','ضرماء','رماح','ضرية','عقلة الصقور','الجموم','الكامل','أضم','بحرة','مهد الذهب','الحناكية','العيص','قرية العليا','تنومة','البدع','السليمي','موقق','الشملي','العويقيلة','بيش','فيفاء','حبونا','بدر الجنوب','يدمة','ثار','القرى','طبرجل','صوير'];
function _ueCityFill(cur){var s=document.getElementById('ue-city');if(!s)return;var list=UE_CITIES.slice();if(cur&&list.indexOf(cur)<0)list.unshift(cur);s.innerHTML='<option value="">—</option>'+list.map(function(c){return '<option'+(c===cur?' selected':'')+'>'+esc(c)+'</option>';}).join('');}
function _ueSpecsRender(){
  var box=document.getElementById('ue-specs');if(!box)return;var a=window._ueSpecs||[];
  var cats=(window._CATS||[]).filter(function(c){return a.indexOf(c)<0;});
  box.innerHTML=(a.length?a.map(function(c,i){return '<span class="ue-chip on">'+esc(c)+'<button type="button" aria-label="حذف" onclick="_ueSpecDel('+i+')">×</button></span>';}).join(''):'<span class="ue-hint" style="color:#b91c1c">ما عنده تخصص — ما يوصله أي مشروع</span>')
    +'<select onchange="_ueSpecAdd(this)" style="margin-top:4px;width:100%"><option value="">+ أضف تخصص</option>'+cats.map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select>';
}
function _ueSpecAdd(sel){var v=sel.value;if(!v)return;window._ueSpecs=window._ueSpecs||[];if(window._ueSpecs.indexOf(v)<0)window._ueSpecs.push(v);_ueSpecsRender();}
function _ueSpecDel(i){(window._ueSpecs||[]).splice(i,1);_ueSpecsRender();}
function _ueSvcRender(){
  var box=document.getElementById('ue-svc'),sel=document.getElementById('ue-svc-add');if(!box||!sel)return;var a=window._ueSvc||[];
  box.innerHTML=a.length?a.map(function(c,i){return '<span class="ue-chip on">'+esc(c)+'<button type="button" aria-label="حذف" onclick="_ueSvcDel('+i+')">×</button></span>';}).join(''):'<span class="ue-hint">ما حدد مدن — تُستخدم مدينته فقط</span>';
  sel.innerHTML='<option value="">+ أضف مدينة</option>'+UE_CITIES.filter(function(c){return a.indexOf(c)<0;}).map(function(c){return '<option>'+esc(c)+'</option>';}).join('');
}
function _ueSvcAdd(sel){var v=sel.value;if(!v)return;window._ueSvc=(window._ueSvc||[]);if(window._ueSvc.indexOf(v)<0)window._ueSvc.push(v);_ueSvcRender();}
function _ueSvcDel(i){(window._ueSvc||[]).splice(i,1);_ueSvcRender();}
function _ueAllTog(){var w=document.getElementById('ue-svcwrap');if(w)w.style.display=document.getElementById('ue-all').checked?'none':'';}
function saveUserEdit(){
  if(!_editUserId)return;
  var body={name:document.getElementById('ue-name').value.trim(),email:document.getElementById('ue-email').value.trim(),phone:document.getElementById('ue-phone').value.trim()||null,city:document.getElementById('ue-city').value.trim()||null,business_name:document.getElementById('ue-biz').value.trim()||null,bio:document.getElementById('ue-bio').value.trim()||null};
  var rSel=document.getElementById('ue-role'); if(rSel&&rSel.value) body.role=rSel.value;
  if(document.getElementById('ue-biz-wrap').style.display!=='none'||body.role==='provider'){
    body.specialties=(window._ueSpecs||[]).slice(); body.serves_all_cities=document.getElementById('ue-all').checked;
    body.service_cities=body.serves_all_cities?[]:(window._ueSvc||[]).slice(); body.experience_years=document.getElementById('ue-exp').value;
    if(body.role==='provider'&&!body.specialties.length){toast('اختر تخصص واحد على الأقل للمزوّد','error');return;}
  }
  var btn=document.getElementById('ue-save');btn.disabled=true;btn.textContent='جاري الحفظ...';
  fetch(API+'/api/admin/users/'+_editUserId,Object.assign({method:'PUT',body:JSON.stringify(body)},hdr()))
    .then(function(r){if(!r.ok)return r.json().then(function(e){throw new Error(e.message||'');});return r.json();})
    .then(function(){toast('تم حفظ البيانات','success');closeModal('uEditModal');loadUsers();})
    .catch(function(e){toast(e.message||'تعذر الحفظ','error');})
    .finally(function(){btn.disabled=false;btn.textContent='حفظ التعديلات';});
}

// ═══ البحث الشامل (الشريط العلوي) ═══
var _gsT=null;
function globalSearch(q){
  clearTimeout(_gsT);
  var box=document.getElementById('gs-results');
  if(!q||q.trim().length<2){if(box)box.style.display='none';return;}
  _gsT=setTimeout(function(){
    fetch(API+'/api/admin/search?q='+encodeURIComponent(q.trim()),hdr()).then(function(r){return r.json();}).then(function(d){
      var us=d.users||[],rs=d.requests||[],html='';
      if(us.length){
        html+='<div style="font-size:11px;font-weight:700;color:var(--hint);padding:10px 14px 4px">مستخدمون</div>';
        html+=us.slice(0,6).map(function(u){return '<div onmousedown="gsOpenUser('+_jsa(u.email)+')" style="display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer" onmouseover="this.style.background=\'var(--bg)\'" onmouseout="this.style.background=\'transparent\'"><div class="u-av" style="width:30px;height:30px;font-size:12px">'+esc((u.name||'?')[0])+'</div><div style="min-width:0"><div style="font-size:13px;font-weight:700">'+esc(u.name)+'</div><div style="font-size:11px;color:var(--muted)">'+esc(u.email)+' · '+(u.role==='client'?'عميل':u.role==='provider'?'مزود':'الإدارة')+'</div></div></div>';}).join('');
      }
      if(rs.length){
        html+='<div style="font-size:11px;font-weight:700;color:var(--hint);padding:10px 14px 4px;border-top:1px solid var(--border)">مشاريع</div>';
        html+=rs.slice(0,6).map(function(r){return '<div onmousedown="gsOpenReq('+r.id+')" style="display:flex;align-items:center;gap:10px;padding:9px 14px;cursor:pointer" onmouseover="this.style.background=\'var(--bg)\'" onmouseout="this.style.background=\'transparent\'"><div style="width:30px;height:30px;border-radius:8px;background:var(--p-light);color:var(--p);display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div style="min-width:0"><div style="font-size:13px;font-weight:700">'+esc(r.title)+'</div><div style="font-size:11px;color:var(--muted)">'+esc(r.client_name||'')+'</div></div></div>';}).join('');
      }
      if(!html)html='<div style="padding:18px;text-align:center;color:var(--muted);font-size:13px">لا توجد نتائج</div>';
      box.innerHTML=html;box.style.display='block';
    }).catch(function(){if(box)box.style.display='none';});
  },280);
}
function gsOpenUser(email){
  var d=document.getElementById('gs-results');if(d)d.style.display='none';
  var gi=document.getElementById('global-search');if(gi)gi.value='';
  _niGo('users');
  setTimeout(function(){var inp=document.getElementById('user-search');if(inp){inp.value=email;filterUsers();}},350);
}
function gsOpenReq(id){
  var d=document.getElementById('gs-results');if(d)d.style.display='none';
  var gi=document.getElementById('global-search');if(gi)gi.value='';
  _niGo('requests');
  setTimeout(function(){ if(typeof openReqEdit==='function') openReqEdit(id); },400);
}

// ═══ هوية الإدارة + تقييد الواجهة حسب الصلاحية ═══
var _me=null,_myPerms=[];
var NAV_PERM={vstats:'users.view',appstats:'analytics.view',ctstats:'analytics.view',claims:'requests.view',bidreasons:'bids.view',dashboard:'dashboard.view',analytics:'analytics.view',users:'users.view',requests:'requests.view',projreview:'requests.review',offerwatch:'requests.view',engagement:'requests.view',contactlog:'requests.view',bids:'bids.view',reviews:'reviews.view',questions:'questions.view',reports:'reports.view',logs:'logs.view',settings:'settings.manage',admins:'admins.manage',outreach:'outreach.manage'};
function permOK(p){ return _myPerms.indexOf('*')>=0 || _myPerms.indexOf(p)>=0; }
function gateUI(){
  document.querySelectorAll('.ni').forEach(function(btn){
    var m=(btn.getAttribute('onclick')||'').match(/showPage\('([a-z]+)'/);
    if(!m)return; var perm=NAV_PERM[m[1]];
    btn.style.display=(perm&&!permOK(perm))?'none':'';
  });
  try{_gtGate();}catch(e){}
  if(window._navGroupsVis)_navGroupsVis();
}
function loadMe(){
  return fetch(API+'/api/admin/me',hdr()).then(function(r){return r.json();}).then(function(me){
    _me=me; _myPerms=me.permissions||[];
    gateUI();
    var RL={super_admin:'مدير كامل',content_manager:'مدير محتوى',support:'مشرف دعم',analyst:'محلّل',outreach_specialist:'مختص استقطاب'};
    var sub=document.getElementById('adminRole'); if(sub)sub.textContent=me.is_owner?'المالك':(RL[me.admin_role]||'مشرف');
    // لو الصفحة الحالية غير مصرّح بها، ارجع للوحة المعلومات
    var cur=document.querySelector('.page.on'); 
    if(cur){var id=cur.id.replace('page-','');var perm=NAV_PERM[id];if(perm&&!permOK(perm)){var b=document.querySelector('.ni');showPage('dashboard',b);}}
  }).catch(function(){});
}

// ═══ المشرفون والصلاحيات ═══
var _admins=[],_permCatalog=null,_adminMode='create',_editAdminId=null;
function loadAdmins(){
  fetch(API+'/api/admin/admins',hdr()).then(function(r){if(!r.ok)throw new Error();return r.json();}).then(function(list){
    if(!Array.isArray(list)){document.getElementById('admins-table').innerHTML=emptyState('تعذر التحميل');return;}
    _admins=list;renderAdmins();
  }).catch(function(){document.getElementById('admins-table').innerHTML=emptyState('لا تملك صلاحية عرض المشرفين');});
  if(!_permCatalog){fetch(API+'/api/admin/permissions-catalog',hdr()).then(function(r){return r.json();}).then(function(c){_permCatalog=c;}).catch(function(){});}
}
function renderAdmins(){
  if(!_admins.length){document.getElementById('admins-table').innerHTML=emptyState('لا يوجد مشرفون');return;}
  document.getElementById('admins-table').innerHTML='<table><thead><tr><th>المشرف</th><th>الدور</th><th>الصلاحيات</th><th>الحالة</th><th></th></tr></thead><tbody>'+
   _admins.map(function(a){
     var pc=(a.perms&&a.perms.indexOf('*')>=0)?'كل الصلاحيات':((a.perms||[]).length+' صلاحية');
     return '<tr>'+
      '<td><div class="u-cell"><div class="u-av">'+esc((a.name||'?')[0])+'</div><div><div class="u-name">'+esc(a.name)+(a.is_owner?' <span class="badge b-admin">المالك</span>':'')+'</div><div class="u-email">'+esc(a.email)+'</div></div></div></td>'+
      '<td><span class="badge b-admin">'+esc(a.role_label||'الإدارة')+'</span></td>'+
      '<td style="font-size:12.5px;color:var(--muted)">'+pc+'</td>'+
      '<td><span class="status '+(a.is_active!==false?'s-on':'s-off')+'">'+(a.is_active!==false?'نشط':'معطّل')+'</span></td>'+
      '<td>'+(a.is_owner?'<span style="font-size:12px;color:var(--hint);font-weight:700">محمي</span>':'<div style="display:flex;gap:6px"><button class="act-btn ab-default" onclick="openEditAdmin('+a.id+')"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>صلاحيات</button><button class="act-btn ab-danger" onclick="removeAdmin('+a.id+','+_jsa(a.name)+')">إزالة</button></div>')+'</td>'+
     '</tr>';
   }).join('')+'</tbody></table>';
}
function _roleOptions(sel){
  var roles=(_permCatalog&&_permCatalog.role_labels)||{super_admin:'مدير كامل',content_manager:'مدير محتوى',support:'مشرف دعم',analyst:'محلّل',outreach_specialist:'مختص استقطاب'};
  return Object.keys(roles).map(function(k){return '<option value="'+k+'"'+(k===sel?' selected':'')+'>'+roles[k]+'</option>';}).join('');
}
function _permChecks(selected){
  var cat=_permCatalog||{all:[],labels:{}};
  var sel=selected||[]; var allSel=sel.indexOf('*')>=0;
  if(!cat.all.length)return '<div style="font-size:12px;color:var(--muted)">جاري تحميل الصلاحيات...</div>';
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">'+
   cat.all.map(function(pm){
     var ck=allSel||sel.indexOf(pm)>=0;
     return '<label style="display:flex;align-items:center;gap:7px;font-size:12px;padding:7px 9px;border:1px solid var(--border);border-radius:8px;cursor:pointer"><input type="checkbox" class="perm-cb" value="'+pm+'" '+(ck?'checked':'')+' style="accent-color:var(--p);flex-shrink:0">'+esc((cat.labels&&cat.labels[pm])||pm)+'</label>';
   }).join('')+'</div>';
}
function _applyRolePerms(){
  var role=document.getElementById('am2-role').value;
  var rp=(_permCatalog&&_permCatalog.roles&&_permCatalog.roles[role])||[];
  var allSel=rp.indexOf('*')>=0;
  document.querySelectorAll('#am2-body .perm-cb').forEach(function(cb){ cb.checked=allSel||rp.indexOf(cb.value)>=0; });
}
function openAddAdmin(){
  _adminMode='create';_editAdminId=null;
  document.getElementById('am2-title').textContent='إضافة مشرف';
  document.getElementById('am2-save').textContent='إنشاء';
  document.getElementById('am2-body').innerHTML=''+
   '<div style="display:flex;gap:8px;margin-bottom:16px">'+
     '<button type="button" id="mode-create" class="ftab on" onclick="_setAdminMode(\'create\')" style="flex:1;text-align:center">حساب جديد</button>'+
     '<button type="button" id="mode-promote" class="ftab" onclick="_setAdminMode(\'promote\')" style="flex:1;text-align:center">ترقية مستخدم</button>'+
   '</div>'+
   '<div id="am2-create">'+
     '<div class="fld"><label>الاسم</label><input id="am2-name" placeholder="اسم المشرف"></div>'+
     '<div class="fld"><label>الإيميل</label><input id="am2-email" type="email" placeholder="admin@example.com"></div>'+
     '<div class="fld"><label>كلمة المرور المؤقتة</label><input id="am2-pass" type="text" placeholder="6 أحرف على الأقل"></div>'+
   '</div>'+
   '<div id="am2-promote" style="display:none">'+
     '<div class="fld"><label>إيميل المستخدم الموجود</label><input id="am2-promote-email" type="email" placeholder="user@example.com"><div style="font-size:11.5px;color:var(--muted);margin-top:6px">سيُحوّل هذا المستخدم إلى عضو إدارة بالدور والصلاحيات المختارة.</div></div>'+
   '</div>'+
   '<div class="fld"><label>الدور</label><select id="am2-role" onchange="_applyRolePerms()">'+_roleOptions('support')+'</select></div>'+
   '<div class="sec-label">الصلاحيات</div><div id="am2-perms">'+_permChecks((_permCatalog&&_permCatalog.roles&&_permCatalog.roles.support)||[])+'</div>';
  if(!_permCatalog){ setTimeout(function(){ document.getElementById('am2-perms').innerHTML=_permChecks((_permCatalog&&_permCatalog.roles&&_permCatalog.roles.support)||[]); },400); }
  document.getElementById('adminModal').classList.add('show');
}
function _setAdminMode(m){
  _adminMode=m;
  document.getElementById('mode-create').classList.toggle('on',m==='create');
  document.getElementById('mode-promote').classList.toggle('on',m==='promote');
  document.getElementById('am2-create').style.display=m==='create'?'block':'none';
  document.getElementById('am2-promote').style.display=m==='promote'?'block':'none';
}
function openEditAdmin(id){
  var a=_admins.find(function(x){return x.id===id;});if(!a)return;
  _adminMode='edit';_editAdminId=id;
  document.getElementById('am2-title').textContent='صلاحيات: '+esc(a.name);
  document.getElementById('am2-save').textContent='حفظ التعديلات';
  document.getElementById('am2-body').innerHTML=''+
   '<div class="fld"><label>الدور</label><select id="am2-role" onchange="_applyRolePerms()">'+_roleOptions(a.admin_role)+'</select></div>'+
   '<div class="sec-label">الصلاحيات</div><div id="am2-perms">'+_permChecks(a.perms||[])+'</div>';
  document.getElementById('adminModal').classList.add('show');
}
function _collectPerms(){
  var arr=[];document.querySelectorAll('#am2-body .perm-cb:checked').forEach(function(cb){arr.push(cb.value);});return arr;
}
function saveAdmin(){
  var role=document.getElementById('am2-role').value;
  var perms=_collectPerms();
  var btn=document.getElementById('am2-save');btn.disabled=true;
  var done=function(){btn.disabled=false;};
  if(_adminMode==='edit'){
    fetch(API+'/api/admin/admins/'+_editAdminId,Object.assign({method:'PUT',body:JSON.stringify({admin_role:role,permissions:perms})},hdr()))
      .then(function(r){if(!r.ok)return r.json().then(function(e){throw new Error(e.message||'');});return r.json();})
      .then(function(){toast('تم حفظ الصلاحيات','success');closeModal('adminModal');loadAdmins();})
      .catch(function(e){toast(e.message||'تعذر الحفظ','error');}).finally(done);
    return;
  }
  var body={mode:_adminMode,admin_role:role,permissions:perms};
  if(_adminMode==='create'){
    body.name=(document.getElementById('am2-name').value||'').trim();
    body.email=(document.getElementById('am2-email').value||'').trim();
    body.password=(document.getElementById('am2-pass').value||'').trim();
    if(!body.name||!body.email||!body.password){toast('الاسم والإيميل وكلمة المرور مطلوبة','error');done();return;}
  } else {
    body.email=(document.getElementById('am2-promote-email').value||'').trim();
    if(!body.email){toast('أدخل إيميل المستخدم','error');done();return;}
  }
  fetch(API+'/api/admin/admins',Object.assign({method:'POST',body:JSON.stringify(body)},hdr()))
    .then(function(r){if(!r.ok)return r.json().then(function(e){throw new Error(e.message||'');});return r.json();})
    .then(function(){toast(_adminMode==='create'?'تم إنشاء المشرف':'تمت ترقية المستخدم','success');closeModal('adminModal');loadAdmins();})
    .catch(function(e){toast(e.message||'تعذر الحفظ','error');}).finally(done);
}
async function removeAdmin(id,name){
  if(!await askConfirm({title:'إزالة مشرف',message:'سيُزال «'+name+'» من الإدارة ويعود مستخدماً عادياً (لا يُحذف حسابه).',confirmText:'نعم، أزل'}))return;
  fetch(API+'/api/admin/admins/'+id,Object.assign({method:'DELETE'},hdr()))
    .then(function(r){if(!r.ok)return r.json().then(function(e){throw new Error(e.message||'');});return r.json();})
    .then(function(){toast('تمت الإزالة','success');loadAdmins();})
    .catch(function(e){toast(e.message||'تعذر الإزالة','error');});
}

// ═══ تحديث الشارات تلقائياً (بلاغات + أسئلة) — كل 25 ثانية وعند العودة للصفحة ═══
function refreshAdminBadges(){ _loadFresh(); }
setTimeout(_loadFresh,1200);
setInterval(function(){ if(document.visibilityState==='visible') refreshAdminBadges(); },30000);
document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') refreshAdminBadges(); });
setTimeout(refreshAdminBadges, 1500);

// تفعيل حساب المزوّد لعميل سجّل بالغلط — يبقى حساب العميل، ودخوله الجاي يفتح لوحة المزوّد
function _makeProvider(uid,btn){
  if(!confirm('تفعيل حساب المزوّد لهذا المستخدم؟ يوصله إشعار، ودخوله الجاي يفتح لوحة المزوّد.'))return;
  if(btn){btn.disabled=true;btn.textContent='جاري…';}
  fetch(API+'/api/admin/users/'+uid+'/make-provider',Object.assign({method:'POST'},hdr())).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});}).then(function(x){
    if(!x.ok){toast((x.d&&x.d.message)||'تعذّر التحويل','error');if(btn){btn.disabled=false;btn.textContent='حوّله لمزوّد';}return;}
    toast('تم — صار عنده حساب مزوّد','success');
    var u=(_allUsers||[]).find(function(z){return z.id===uid;}); if(u)u.can_provide=true;
    try{closeModal('userModal');}catch(e){} try{renderUsers();}catch(e){}
  }).catch(function(){toast('تعذّر الاتصال','error');if(btn){btn.disabled=false;btn.textContent='حوّله لمزوّد';}});
}

// ═══ الفترة الزمنية للإحصائيات (اليوم / أمس / 7 أيام / 30 يوم / الشهر / السنة / مخصص) ═══
var _PER=(function(){try{return JSON.parse(localStorage.getItem('adm_period')||'null')||{k:'today'};}catch(e){return {k:'today'};}})();
function _ymd(d){return new Date(d.getTime()+3*3600000).toISOString().slice(0,10);}
function _perRange(){
  var now=new Date(), t=_ymd(now), d=function(n){return _ymd(new Date(now.getTime()-n*86400000));};
  var k=_PER.k;
  if(k==='yesterday')return {from:d(1),to:d(1),lbl:'أمس',cmp:'عن اليوم اللي قبله'};
  if(k==='7d')return {from:d(6),to:t,lbl:'آخر 7 أيام',cmp:'عن الأسبوع اللي قبله'};
  if(k==='30d')return {from:d(29),to:t,lbl:'آخر 30 يوم',cmp:'عن الـ30 يوم اللي قبلها'};
  if(k==='month')return {from:t.slice(0,8)+'01',to:t,lbl:'هالشهر',cmp:'عن نفس المدة قبلها'};
  if(k==='year')return {from:t.slice(0,5)+'01-01',to:t,lbl:'هالسنة',cmp:'عن نفس المدة قبلها'};
  if(k==='custom'&&_PER.from&&_PER.to)return {from:_PER.from,to:_PER.to,lbl:_PER.from+' ← '+_PER.to,cmp:'عن نفس المدة قبلها'};
  return {from:t,to:t,lbl:'اليوم',cmp:'عن أمس'};
}
function _perSet(k){ _PER={k:k}; if(k==='custom'){var f=(document.getElementById('per-from')||{}).value,t=(document.getElementById('per-to')||{}).value; if(!f||!t){_perRender(true);return;} _PER={k:'custom',from:f,to:t};} try{localStorage.setItem('adm_period',JSON.stringify(_PER));}catch(e){} _perRender(); _perMini('per-app'); _perMini('per-ct'); _perMini('per-vs'); _loadVisits(); _loadAppStats(); _loadCtStats(); try{if(document.getElementById('page-vstats').classList.contains('on'))_loadVStats();}catch(e){} }
function _perRender(showCustom){
  var old=document.getElementById('dash-period'); if(old)old.innerHTML='';
  var box=document.getElementById('vs-seg'); if(!box)return; var R=_perRange();
  var ks=[['today','اليوم'],['yesterday','أمس'],['7d','7 أيام'],['30d','30 يوم'],['month','هالشهر'],['year','هالسنة']];
  var cust=showCustom||_PER.k==='custom';
  box.innerHTML='<div class="vs-seg" role="tablist" aria-label="الفترة">'+ks.map(function(x){return '<button type="button" role="tab" aria-selected="'+(_PER.k===x[0])+'" class="'+(_PER.k===x[0]?'on':'')+'" onclick="_perSet(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')
    +'<button type="button" class="'+(cust?'on':'')+'" onclick="_perRender(true)">📅 مخصص</button></div>';
  var cb=document.getElementById('vs-cust');
  if(cb) cb.innerHTML=cust?'<div class="vs-custrow"><span>من</span><input type="date" id="per-from" value="'+(_PER.from||R.from)+'" max="'+_ymd(new Date())+'"><span>إلى</span><input type="date" id="per-to" value="'+(_PER.to||R.to)+'" max="'+_ymd(new Date())+'"><button type="button" onclick="_perSet(\'custom\')">عرض</button>'+(_PER.k==='custom'?'<span class="vs-s" style="margin-inline-start:auto">'+esc(R.lbl)+'</span>':'')+'</div>':'';
}
var _VS_SRC={google:['جوجل','#2563eb'],whatsapp:['واتساب','#16a34a'],snap:['سناب شات','#eab308'],tiktok:['تيك توك','#0f172a'],instagram:['انستقرام','#db2777'],facebook:['فيسبوك','#1d4ed8'],x:['إكس (تويتر)','#334155'],bing:['بينق','#0891b2'],linkedin:['لينكدإن','#0369a1'],youtube:['يوتيوب','#dc2626'],email:['الإيميلات','#7c3aed'],campaign:['حملات (رابط مُعلَّم)','#c2410c'],other:['مواقع ثانية','#64748b'],direct:['دخلوا مباشرة','#94a3b8']};
var _VS_PG={home:'الرئيسية',project:'صفحات المشاريع',pro:'صفحات المزوّدين',dash_client:'لوحة العميل',dash_provider:'لوحة المزوّد',auth:'التسجيل والدخول',post:'نشر مشروع',app:'صفحة التطبيق',b2b:'للأعمال',info:'من نحن والشروط',chat:'المحادثات',guide:'دليل المزوّدين',other:'صفحات ثانية'};
var _VS_DEV={mobile:'📱 جوال',desktop:'💻 كمبيوتر',app:'📲 التطبيق'};
var _vsLiveT=null;
function _spark(vals,w,h,c){ if(!vals.length)return ''; var mx=Math.max.apply(null,vals)||1, n=vals.length; if(n===1)vals=[vals[0],vals[0]],n=2;
  var pts=vals.map(function(v,i){return Math.round(i*w/(n-1))+','+Math.round(h-4-(v/mx)*(h-10));}).join(' ');
  return '<svg width="100%" height="'+h+'" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" aria-hidden="true"><polyline points="'+pts+'" fill="none" stroke="'+c+'" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>'; }
var _VS_ICO={google:['G','#4285f4'],whatsapp:['W','#25d366'],snap:['S','#facc15'],tiktok:['T','#111827'],instagram:['I','#db2777'],facebook:['f','#1877f2'],x:['X','#0f172a'],bing:['b','#0891b2'],linkedin:['in','#0a66c2'],youtube:['▶','#dc2626'],email:['@','#7c3aed'],campaign:['#','#c2410c'],other:['↗','#64748b'],direct:['→','#94a3b8']};
function _vsDelta(c,p,pct){ if(!p&&!c)return ''; if(!p)return '<span class="vs-dl up">جديد</span>'; var d=pct?Math.round((c-p)*10)/10:Math.round((c-p)/p*100); if(d===0)return '<span class="vs-dl eq">=</span>'; return '<span class="vs-dl '+(d>0?'up':'dn')+'">'+(d>0?'▲ ':'▼ ')+Math.abs(d)+(pct?'':'%')+'</span>'; }
function _vsSpark(vals,c){ if(!vals||vals.length<2)return ''; var w=120,h=30,mx=Math.max.apply(null,vals),mn=Math.min.apply(null,vals),rg=(mx-mn)||1;
  var pts=vals.map(function(v,i){return Math.round(w-i*w/(vals.length-1))+','+Math.round(h-3-((v-mn)/rg)*(h-6));}).join(' ');
  return '<svg class="vs-spk" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'" aria-hidden="true"><polyline points="'+pts+'" fill="none" stroke="'+c+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>'; }
var _vsSer=[], _vsMonthly=false;
function _vsChart(ser,monthly,selKey){
  _vsSer=ser; _vsMonthly=monthly; if(!ser.length)return '';
  var W=1000,H=210,T=12,B=28,n=ser.length, mx=Math.max.apply(null,ser.map(function(x){return x.n;}).concat([4]));
  var step=[1,2,5,10,20,25,50,100,200,250,500,1000,2000,5000].find(function(s){return mx/s<=4;})||Math.ceil(mx/4); var top=Math.ceil(mx/step)*step;
  var X=function(i){return n===1?W/2:Math.round(W-12-i*(W-40)/(n-1));}, Y=function(v){return Math.round(T+(H-T-B)*(1-v/top));};
  var grid='',yl='',g; for(g=0;g<=top;g+=step){grid+='<line x1="0" x2="'+W+'" y1="'+Y(g)+'" y2="'+Y(g)+'" stroke="currentColor" stroke-opacity=".08" vector-effect="non-scaling-stroke"/>';yl+='<span class="vs-yl" style="top:'+(Y(g)/H*100).toFixed(2)+'%">'+fmtNum(g)+'</span>';}
  var pts=ser.map(function(x,i){return X(i)+','+Y(x.n);}).join(' ');
  var area='M'+X(0)+','+(H-B)+' L'+ser.map(function(x,i){return X(i)+','+Y(x.n);}).join(' L')+' L'+X(n-1)+','+(H-B)+' Z';
  var ev=Math.max(1,Math.ceil(n/8)), xl='';
  ser.forEach(function(x,i){ if(i%ev&&i!==n-1)return; if(i===n-1&&i%ev&&i%ev<ev/2)return; var p=x.k.split('-'); xl+='<span class="vs-xl" style="left:'+(X(i)/(W+34)*100).toFixed(2)+'%">'+(monthly?(+p[1])+'/'+p[0].slice(2):(+p[2])+'/'+(+p[1]))+'</span>'; });
  var sel=ser.findIndex(function(x){return x.k===selKey;});
  var dot=sel>=0?'<i class="vs-cd" style="display:block;left:'+(X(sel)/(W+34)*100).toFixed(2)+'%;top:'+(Y(ser[sel].n)/H*100).toFixed(2)+'%"></i>':'';
  return '<div class="vs-chart" id="vs-chart" onmousemove="_vsHover(event)" onmouseleave="_vsHover(null)"><svg viewBox="0 0 '+(W+34)+' '+H+'" preserveAspectRatio="none" role="img" aria-label="رسم الزوار"><defs><linearGradient id="vsG" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3b82f6" stop-opacity=".26"/><stop offset="1" stop-color="#3b82f6" stop-opacity="0"/></linearGradient></defs>'+grid+'<path d="'+area+'" fill="url(#vsG)"/><polyline points="'+pts+'" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/><line id="vs-cx" x1="0" x2="0" y1="'+T+'" y2="'+(H-B)+'" stroke="currentColor" stroke-opacity=".35" stroke-dasharray="3 3" style="display:none" vector-effect="non-scaling-stroke"/></svg>'+yl+xl+dot+'<i class="vs-cd" id="vs-cd"></i><div class="vs-tip" id="vs-tip"></div></div>';
}
function _vsHover(e){
  var tip=document.getElementById('vs-tip'), cx=document.getElementById('vs-cx'), cd=document.getElementById('vs-cd'), box=document.getElementById('vs-chart');
  if(!tip||!box)return; if(!e||!_vsSer.length){tip.style.display='none';if(cx)cx.style.display='none';if(cd)cd.style.display='none';return;}
  var r=box.getBoundingClientRect(), W=1000, n=_vsSer.length, fx=(e.clientX-r.left)/r.width*(W+34);
  var i=n===1?0:Math.round((W-12-fx)*(n-1)/(W-40)); i=Math.max(0,Math.min(n-1,i)); var x=_vsSer[i];
  var px=n===1?W/2:W-12-i*(W-40)/(n-1), mx=Math.max.apply(null,_vsSer.map(function(z){return z.n;}).concat([4]));
  var step=[1,2,5,10,20,25,50,100,200,250,500,1000,2000,5000].find(function(s){return mx/s<=4;})||Math.ceil(mx/4), top=Math.ceil(mx/step)*step, py=12+(210-12-28)*(1-x.n/top);
  if(cx){cx.setAttribute('x1',px);cx.setAttribute('x2',px);cx.style.display='';} if(cd){cd.style.left=(px/(W+34)*100)+'%';cd.style.top=(py/210*100)+'%';cd.style.display='block';}
  var p=x.k.split('-'), dt=_vsMonthly?new Date(+p[0],+p[1]-1,1).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{month:'long',year:'numeric'}):new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{weekday:'long',day:'numeric',month:'long'});
  tip.innerHTML='<b>'+dt+'</b><br>'+fmtNum(x.n)+' زائر'+(x.s?' · سجّل '+x.s:'')+(x.r?' · '+x.r+' مشروع':'')+(x.b?' · '+x.b+' عرض':'');
  tip.style.display='block'; var tl=(px/(W+34))*r.width; tip.style.left=Math.min(r.width-tip.offsetWidth-4,Math.max(4,tl+12))+'px'; tip.style.top=Math.max(0,(py/210)*r.height-20)+'px';
}
function _loadVisits(){
  var box=document.getElementById('dash-visits'); if(!box)return; var R=_perRange();
  if(!document.getElementById('vs-body')) box.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  fetch(API+'/api/admin/visits?from='+R.from+'&to='+R.to,hdr()).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d||!d.cur){box.style.display='none';return;} box.style.display='';
    var c=d.cur, p=d.prev, one=d.range.days===1, sp=d.spark||[];
    var conv=c.visitors?Math.round(c.tracked_signups/c.visitors*1000)/10:0, pconv=p.visitors?Math.round(p.tracked_signups/p.visitors*1000)/10:0;
    var signups=(c.new_clients||0)+(c.new_providers||0), psign=(p.new_clients||0)+(p.new_providers||0);
    var logged=(c.logged_p||0)+(c.logged_c||0), plog=(p.logged_p||0)+(p.logged_c||0);
    var prevLbl=R.cmp.replace('عن ','');
    var tile=function(on,l,n,dl,spk,sub){return '<div class="vs-kt'+(on?' on':'')+'"><span class="l">'+l+'</span><span class="n">'+n+' '+dl+'</span>'+spk+'<span class="s">'+sub+'</span></div>';};
    var srcT=(d.sources||[]).reduce(function(a,x){return a+x.n;},0)||1;
    var src=(d.sources||[]).slice(0,6).map(function(x){var m=_VS_SRC[x.src]||[x.src],ic=_VS_ICO[x.src]||['•','#94a3b8'],pc=Math.round(x.n/srcT*100);
      return '<div class="vs-sr"><span class="ico" style="background:'+ic[1]+(x.src==='snap'?';color:#111':'')+'">'+ic[0]+'</span><div class="nm"><span>'+m[0]+(x.signups?'<span class="chip">سجّل '+x.signups+'</span>':'')+'</span><span class="bar"><i style="width:'+Math.max(2,pc)+'%"></i></span></div><span class="v">'+fmtNum(x.n)+'</span><span class="p">'+pc+'%</span></div>';}).join('');
    var f=d.funnel, fp=function(a){return f.visitors?Math.round(a/f.visitors*1000)/10:0;};
    var drop=function(a,b){return a?Math.round((a-b)/a*100):0;};
    var devT=(d.devices||[]).reduce(function(a,x){return a+x.n;},0)||1, DC={mobile:'#2563eb',desktop:'#93c5fd',app:'#1e3a8a'}, DN={mobile:'جوال',desktop:'كمبيوتر',app:'التطبيق'};
    var stk=(d.devices||[]).map(function(x){return '<i style="width:'+(x.n/devT*100)+'%;background:'+(DC[x.dev]||'#94a3b8')+'" title="'+(DN[x.dev]||x.dev)+'"></i>';}).join('');
    var lg=(d.devices||[]).map(function(x){return '<span><b style="background:'+(DC[x.dev]||'#94a3b8')+'"></b>'+(DN[x.dev]||x.dev)+' '+Math.round(x.n/devT*100)+'%</span>';}).join('');
    var pg=(d.pages||[]).map(function(x,i,a){return '<div class="vs-pg"'+(i===a.length-1?' style="border:0"':'')+'><span>'+(_VS_PG[x.page]||x.page)+'</span><b>'+fmtNum(x.n)+'</b></div>';}).join('');
    var best=(d.sources||[]).filter(function(x){return x.n>=10&&x.signups>0;}).map(function(x){return {k:x.src,r:x.signups/x.n,n:x.n};}).sort(function(a,b){return b.r-a.r;});
    var big=(d.sources||[])[0], ins='';
    if(best.length&&big&&best[0].k!==big.src){ ins='💡 '+(_VS_SRC[best[0].k]||[best[0].k])[0]+' يجيب زوار أقل من '+(_VS_SRC[big.src]||[big.src])[0]+'، بس اللي يسجلون منه أكثر ('+Math.round(best[0].r*100)+'% مقابل '+Math.round(big.signups/big.n*100)+'%).'; }
    else if(best.length){ ins='💡 أفضل مصدر يجيب ناس يسجلون: '+(_VS_SRC[best[0].k]||[best[0].k])[0]+' ('+Math.round(best[0].r*100)+'% من زواره سجّلوا).'; }
    else if(c.visitors&&c.visitors<30){ ins='💡 الأرقام لسا قليلة — بعد كم يوم بتبان لك الصورة أوضح (أي مصدر يجيب ناس يسجلون).'; }
    var chartSer=(one||d.series.length<2)?sp:d.series;
    box.innerHTML='<div class="vs-hd"><h3>الزيارات</h3><span class="vs-livep" id="vs-live"><i></i><b>'+d.live+'</b> متواجد الحين</span><div id="vs-seg" style="margin-inline-start:auto"></div></div><div id="vs-cust"></div>'
      +'<div id="vs-body"><div class="vs-k4">'
        +tile(true,'الزوار',fmtNum(c.visitors),_vsDelta(c.visitors,p.visitors),_vsSpark(sp.map(function(x){return x.n;}),'#2563eb'),(p.visitors?prevLbl+' '+fmtNum(p.visitors):'كل زائر مرة وحدة باليوم'))
        +tile(false,'دخلوا حساباتهم',fmtNum(logged),_vsDelta(logged,plog),_vsSpark(sp.map(function(x){return x.l;}),'#64748b'),fmtNum(c.logged_p||0)+' مزوّد · '+fmtNum(c.logged_c||0)+' عميل')
        +tile(false,'تسجيلات جديدة',fmtNum(signups),_vsDelta(signups,psign),_vsSpark(sp.map(function(x){return x.s;}),'#64748b'),fmtNum(c.new_clients||0)+' عميل · '+fmtNum(c.new_providers||0)+' مزوّد')
        +tile(false,'نسبة التسجيل',conv+'%',(c.visitors&&p.visitors?_vsDelta(conv,pconv,true):''),_vsSpark(sp.map(function(x){return x.n?x.ts/x.n*100:0;}),'#64748b'),'من كل 100 زائر')
      +'</div>'
      +(chartSer.length>1?'<div class="vs-chwrap"><div class="vs-cht">'+(one?'آخر 14 يوم':(d.monthly?'حسب الشهر':'حسب اليوم'))+'<span>مرّر على الرسم لتفاصيل كل '+(d.monthly?'شهر':'يوم')+'</span></div>'+_vsChart(chartSer,d.monthly&&!one,one?R.to:null)+'</div>':'')
      +'<div class="vs-3">'
        +'<div><div class="vs-st">من وين جوا؟<small>زوار · النسبة</small></div>'+(src||'<div class="vs-s">ما فيه زيارات في هالفترة</div>')+'</div>'
        +'<div><div class="vs-st">مسار الزائر</div>'
          +'<div class="vs-fr"><div class="t"><span>زار الموقع</span><b>'+fmtNum(f.visitors)+'</b></div><div class="b"><i style="width:100%"></i></div></div>'
          +'<span class="vs-drop">↓ '+drop(f.visitors,f.signups)+'% ما سجّلوا</span>'
          +'<div class="vs-fr"><div class="t"><span>سجّل حساب</span><b>'+fmtNum(f.signups)+' <small>'+fp(f.signups)+'%</small></b></div><div class="b"><i style="width:'+fp(f.signups)+'%"></i></div></div>'
          +'<span class="vs-drop">↓ '+drop(f.signups,f.acted)+'% ما كمّلوا</span>'
          +'<div class="vs-fr"><div class="t"><span>نشر مشروع أو قدّم عرض</span><b>'+fmtNum(f.acted)+' <small>'+fp(f.acted)+'%</small></b></div><div class="b"><i style="width:'+fp(f.acted)+'%"></i></div></div></div>'
        +'<div>'+(stk?'<div class="vs-st">الأجهزة</div><div class="vs-stk">'+stk+'</div><div class="vs-lg">'+lg+'</div>':'')+(pg?'<div class="vs-st" style="margin-top:18px">أكثر الصفحات</div>'+pg:'')+'</div>'
      +'</div>'
      +(ins?'<div class="vs-ins">'+ins+'</div>':'')
      +'<div class="vs-foot">كل زائر ينحسب مرة وحدة باليوم · ما نخزّن IP · نستبعد محركات البحث والإدارة</div></div>';
    _perRender(); _vsKpis(d);
    clearInterval(_vsLiveT); _vsLiveT=setInterval(function(){ var pgx=document.getElementById('page-dashboard'); if(!pgx||!pgx.classList.contains('on'))return; fetch(API+'/api/admin/visits/live',hdr()).then(function(r){return r.json();}).then(function(x){var e=document.querySelector('#vs-live b');if(e&&x)e.textContent=x.live;}).catch(function(){}); },30000);
  }).catch(function(){ box.style.display='none'; });
}
// صف المؤشرات تحت: يتبع الفترة المختارة
function _vsKpis(d){
  var kp=document.getElementById('dash-kpis'); if(!kp)return; var c=d.cur,p=d.prev,o=window._overview||{},cv=o.cover||{},sa=o.saai||{},R=_perRange();
  var sp=d.spark||[], pc=cv.n?Math.round(cv.with_bids/cv.n*100):0, cmp=R.cmp;
  var T=function(l,n,dl,spk,pg){return '<div class="ad-kc go" role="button" tabindex="0" onclick="_niGo(\''+pg+'\')"><div class="ad-kl">'+l+'</div><div class="ad-kn">'+n+'</div>'+dl+spk+'</div>';};
  var tr=function(a,b){ if(!a&&!b)return '<div class="ad-kt">ما فيه نشاط</div>'; if(!b)return '<div class="ad-kt up">▲ ما كان فيه شي '+esc(cmp.replace('عن ',''))+'</div>'; var dd=Math.round((a-b)/b*100); return '<div class="ad-kt '+(dd>=0?'up':'dn')+'">'+(dd>=0?'▲ ':'▼ ')+Math.abs(dd)+'% '+esc(cmp)+'</div>'; };
  kp.innerHTML='<div class="ad-k">'
    +T('مشاريع جديدة — '+esc(R.lbl),fmtNum(c.requests),tr(c.requests,p.requests),_adSpark(sp.map(function(x){return x.r;}),'#d97706'),'requests')
    +T('عروض — '+esc(R.lbl),fmtNum(c.bids),tr(c.bids,p.bids),_adSpark(sp.map(function(x){return x.b;}),'#16a34a'),'bids')
    +T('صفقات (قبول عرض)',fmtNum(c.deals),tr(c.deals,p.deals),_adSpark(sp.map(function(x){return x.dl;}),'#1d4ed8'),'saai')
    +'<div class="ad-kc go" role="button" tabindex="0" onclick="_niGo(\'requests\')"><div class="ad-kl">مشاريع جاها عرض</div><div class="ad-kn" style="color:#15803d">'+pc+'%</div><div class="ad-kt">'+(cv.with_bids||0)+' من '+(cv.n||0)+' · آخر 30 يوم</div><div class="ad-kbar"><i style="width:'+pc+'%;background:#16a34a"></i></div></div>'
    +'<div class="ad-kc go" role="button" tabindex="0" onclick="_niGo(\'saai\')"><div class="ad-kl">سعي محصّل — '+esc(R.lbl)+'</div><div class="ad-kn">'+fmtNum(Math.round(c.collected||0))+' <small>ر.س</small></div><div class="ad-kt" style="color:#b45309">'+fmtNum(sa.due||0)+' ر.س مستحق'+(sa.due_n?' · '+sa.due_n+' مشروع':'')+'</div></div>'
    +'</div>';
  if(d.pfunnel) _adFunnel(d.pfunnel,R.lbl);
}
// ═══ بطاقة «التطبيق»: كم عندهم التطبيق + ضغطات «حمّل من المتجر» حسب المكان ═══
var _APP_SRC={direct:'روابط مختصرة (واتساب/سناب)',email:'الإيميلات',banner:'شريط «حمّل التطبيق» في اللوحة',qr:'رمز QR',moment_posted:'بعد نشر مشروع',moment_bid:'بعد تقديم عرض',outreach:'رسائل الاستقطاب',contracts:'مكتبة العقود (للتحميل من التطبيق)',mnav:'قائمة الجوال في الرئيسية',mnav_card:'بطاقة التطبيق في قائمة الجوال',more:'زر «المزيد» في اللوحة',nav:'القائمة العلوية',home:'قسم التطبيق في الرئيسية',footer:'أسفل الموقع',profile:'«تطبيق الجوال» في حسابي',app:'صفحة التطبيق نفسها'};
function _nClk(n){return n===1?'ضغطة وحدة':(n===2?'ضغطتين':(n>=3&&n<=10?fmtNum(n)+' ضغطات':fmtNum(n)+' ضغطة'));}
function _loadAppStats(){
  var box=document.getElementById('dash-app'); if(!box)return; var R=_perRange();
  fetch(API+'/api/admin/app-stats?from='+R.from+'&to='+R.to,hdr()).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d||!d.own){box.style.display='none';return;}
    box.style.display='';
    try{var _o=d.own;_miniSet('app','📱 التطبيق','<b>'+(_o.providers?Math.round(_o.providers_app/_o.providers*100):0)+'%</b> من المزوّدين · <b>'+(_o.clients?Math.round(_o.clients_app/_o.clients*100):0)+'%</b> من العملاء عندهم التطبيق','appstats');}catch(e){}
    var o=d.own, pc=function(a,b){return b?Math.round(a/b*100):0;};
    var kb=function(lbl,a,b,c){var p=pc(a,b);return '<div class="vs-b"><span class="t">'+lbl+'</span><span class="big" style="color:'+c+'">'+p+'%</span><div class="ap-bar"><i style="width:'+p+'%;background:'+c+'"></i></div><span class="vs-s">'+fmtNum(a)+' من '+fmtNum(b)+' نزّلوه</span></div>';};
    var views=0,clicks=0,cl={},vw={};
    (d.hits||[]).forEach(function(h){ if(h.kind==='view'){views+=h.n;vw[h.src]=(vw[h.src]||0)+h.n;} else {clicks+=h.n;cl[h.src]=(cl[h.src]||0)+h.n;} });
    var ks=Object.keys(cl).sort(function(a,b){return cl[b]-cl[a];}), mx=ks.length?cl[ks[0]]:1;
    var topView=Object.keys(vw).sort(function(a,b){return vw[b]-vw[a];})[0];
    var f=d.fresh||{};
    var kp=function(lbl,v,sub,c,bar){return '<div class="ct2-k"><small>'+lbl+'</small><b style="color:'+c+'">'+v+'</b>'+(bar!=null?'<div class="ct2-bar" style="flex:none;margin:4px 0 3px"><i style="width:'+bar+'%;background:'+c+'"></i></div>':'')+'<span>'+sub+'</span></div>';};
    var src=ks.slice(0,8).map(function(k,i){return '<div class="ct2-r"><span class="ct2-i">'+(i+1)+'</span><span class="ct2-n" title="'+esc(_APP_SRC[k]||k)+'">'+esc(_APP_SRC[k]||k)+'</span><span class="ct2-bar"><i style="width:'+Math.max(4,Math.round(cl[k]/mx*100))+'%;background:#16a34a"></i></span><b>'+fmtNum(cl[k])+'</b></div>';}).join('');
    var os={}; (d.byOs||[]).forEach(function(x){os[x.os]=x.clicks||0;}); var tot=(os.ios||0)+(os.android||0)+(os.desktop||0);
    var dev=tot?[['ios','🍎 آيفون','#0f172a'],['android','🤖 أندرويد','#16a34a'],['desktop','💻 كمبيوتر','#64748b']].filter(function(x){return os[x[0]];}).map(function(x){var p=Math.round(os[x[0]]/tot*100);return '<div class="ct2-r"><span class="ct2-n" style="width:30%">'+x[1]+'</span><span class="ct2-bar"><i style="width:'+p+'%;background:'+x[2]+'"></i></span><b style="width:70px">'+fmtNum(os[x[0]])+' <small style="color:var(--muted)">('+p+'%)</small></b></div>';}).join(''):'<div class="vs-s">ما فيه ضغطات</div>';
    var dl=d.daily||[], dayH='';
    if(dl.length>1){ var dmx=Math.max.apply(null,dl.map(function(x){return x.clicks||0;}))||1;
      dayH='<div class="ct2-h" style="margin-top:14px">يوم بيوم</div><div style="display:flex;align-items:flex-end;gap:3px;height:90px;border-bottom:1px solid var(--border)">'+dl.map(function(x){var v=x.clicks||0;return '<div title="'+esc(x.day)+': '+v+' ضغطة" style="flex:1;min-width:3px;max-width:26px;height:'+Math.max(2,Math.round(v/dmx*100))+'%;background:#1d4ed8;border-radius:3px 3px 0 0;opacity:'+(v?1:.25)+'"></div>';}).join('')+'</div><div class="vs-s" style="display:flex;justify-content:space-between;margin-top:4px"><span>'+esc(dl[0].day.slice(5))+'</span><span>'+esc(dl[dl.length-1].day.slice(5))+'</span></div>'; }
    box.innerHTML='<div class="vs-h"><h3>📱 التطبيق</h3><a href="/app" target="_blank" rel="noopener" style="margin-inline-start:auto;font-size:12.5px;font-weight:800">manaqasa.com/app ↗</a></div>'
      +'<div class="ct2-kp">'
        +kp('مزوّدين عندهم التطبيق',pc(o.providers_app,o.providers)+'%',fmtNum(o.providers_app)+' من '+fmtNum(o.providers),'#c2410c',pc(o.providers_app,o.providers))
        +kp('عملاء عندهم التطبيق',pc(o.clients_app,o.clients)+'%',fmtNum(o.clients_app)+' من '+fmtNum(o.clients),'#1d4ed8',pc(o.clients_app,o.clients))
        +kp('ضغطات «حمّل» · '+esc(R.lbl),fmtNum(clicks),'الصفحة انفتحت '+fmtNum(views)+' مرة','#16a34a')
        +kp('جدد على التطبيق · '+esc(R.lbl),fmtNum((f.providers||0)+(f.clients||0)),fmtNum(f.providers||0)+' مزوّد · '+fmtNum(f.clients||0)+' عميل','#0f2544')
      +'</div>'
      +'<div class="ct2-g">'
        +'<div class="ct2-c"><div class="ct2-h">من وين ضغطوا «حمّل»</div>'+(src||'<div class="vs-s">ما فيه ضغطات في هالفترة</div>')+'</div>'
        +'<div class="ct2-c"><div class="ct2-h">حسب الجهاز</div>'+dev+dayH+'</div>'
      +'</div>'
      +'<div class="vs-s" style="margin-top:10px">💡 كثير يضغطون زر المتجر مباشرة بدون ما يفتحون صفحة التطبيق، عشان كذا الضغطات ممكن تكون أكثر من الزيارات.</div>';
  }).catch(function(){ box.style.display='none'; });
}


// ═══ تفعيل البريد: إحصائيات + قائمة اللي ما فعّلوا للمتابعة ═══
var _VS=null,_vsF='all';
function _loadVStats(){
  var box=document.getElementById('dash-vstats'); if(!box)return; var R=_perRange();
  if(!_VS)box.innerHTML='<div class="loading"><div class="spinner"></div>جاري التحميل...</div>';
  var LR=_vsLRange(); fetch(API+'/api/admin/verify-stats?from='+R.from+'&to='+R.to+(LR?'&lfrom='+LR.from+'&lto='+LR.to:''),hdr()).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d){box.innerHTML=emptyState('تعذر التحميل');return;} _VS=d; _vsPaint(); _adSeen('unver3');
    try{var u=(d.all_unverified||[]).reduce(function(a,x){return a+x.n;},0);_miniSet('vs','✉️ تفعيل البريد','<b>'+fmtNum(u)+'</b> ما فعّلوا للحين','vstats');}catch(e){}
  }).catch(function(){box.innerHTML=emptyState('تعذر التحميل');});
}
function _vsPaint(){
  _vsSave(); var box=document.getElementById('dash-vstats'), d=_VS; if(!box||!d)return; var R=_perRange();
  var sum=function(arr,f,role){return (arr||[]).filter(function(x){return !role||x.role===role;}).reduce(function(a,x){return a+(x[f]||0);},0);};
  var reg=sum(d.reg,'n'), ver=sum(d.reg,'ver'), un=sum(d.reg,'unver');
  var V={link:0,code:0,admin:0,other:0}, mins=[], cnt=0; (d.via||[]).forEach(function(x){V[x.via]=(V[x.via]||0)+x.n; if(x.avg_min!=null){mins.push(x.avg_min*x.n);cnt+=x.n;}});
  var vt=V.link+V.code+V.admin+V.other, avg=cnt?Math.round(mins.reduce(function(a,b){return a+b;},0)/cnt):null;
  var avgT=avg==null?'—':(avg<60?avg+' دقيقة':(avg<1440?Math.round(avg/60)+' ساعة':Math.round(avg/1440)+' يوم'));
  var pc=function(a,b){return b?Math.round(a/b*100):0;};
  var M={}; (d.mail||[]).forEach(function(x){M[x.status]=x.n;});
  var kp=function(l,v,s,c){return '<div class="ct2-k"><small>'+l+'</small><b'+(c?' style="color:'+c+'"':'')+'>'+v+'</b><span>'+s+'</span></div>';};
  var bar=function(lbl,n,tot,col){var p=pc(n,tot);return '<div class="ct2-r"><span class="ct2-n" style="width:38%">'+lbl+'</span><span class="ct2-bar"><i style="width:'+Math.max(n?4:0,p)+'%;background:'+col+'"></i></span><b style="width:74px">'+fmtNum(n)+' <small style="color:var(--muted)">('+p+'%)</small></b></div>';};
  var role=function(r,lbl){var n=sum(d.reg,'n',r),v=sum(d.reg,'ver',r);return '<div class="ct2-r"><span class="ct2-n" style="width:38%">'+lbl+'</span><span class="ct2-bar"><i style="width:'+pc(v,n)+'%;background:'+(r==='client'?'#1d4ed8':'#0f766e')+'"></i></span><b style="width:74px">'+fmtNum(v)+' من '+fmtNum(n)+'</b></div>';};
  var mtot=(M.delivered||0)+(M.opened||0)+(M.clicked||0)+(M.bounced||0)+(M.suppressed||0)+(M.complained||0)+(M.failed||0)+(M.sent||0)+(M.delayed||0)+(M.sending||0);
  var allU=sum(d.all_unverified,'n');
  var h='<div class="vs-h"><h3>✉️ تفعيل البريد</h3></div>'
    +'<div class="ct2-kp">'+kp('سجّلوا · '+esc(R.lbl),fmtNum(reg),'عملاء ومزوّدين')+kp('فعّلوا منهم',pc(ver,reg)+'%',fmtNum(ver)+' من '+fmtNum(reg),'#15803d')+kp('ما فعّلوا منهم',fmtNum(un),'تحتاج متابعة',un?'#b91c1c':'')+kp('متوسط وقت التفعيل',avgT,'من التسجيل إلى التفعيل')+'</div>'
    +'<div class="vs-s" style="margin:-6px 0 12px">ℹ️ طريقة التفعيل (رابط / رمز / إدارة) تنحسب من تاريخ هالتحديث وطالع. والحسابات القديمة اللي سجّلت قبل نظام التفعيل تنحسب مفعّلة.</div>'
    +'<div class="ct2-g">'
      +'<div class="ct2-c"><div class="ct2-h">كيف فعّلوا؟ <span style="color:var(--muted);font-weight:700">('+esc(R.lbl)+' · '+fmtNum(vt)+')</span></div>'
        +(vt?bar('🔗 ضغطوا رابط الإيميل',V.link,vt,'#1d4ed8')+bar('🔢 كتبوا الرمز',V.code,vt,'#7c3aed')+bar('🛠️ فعّلتهم الإدارة',V.admin,vt,'#f59e0b')+(V.other?bar('قبل بدء التتبّع',V.other,vt,'#94a3b8'):''):'<div class="vs-s">ما فيه تفعيل في هالفترة</div>')
        +'<div class="ct2-h" style="margin-top:14px">حسب النوع <span style="color:var(--muted);font-weight:700">(فعّلوا من اللي سجّلوا)</span></div>'+role('client','👤 عملاء')+role('provider','🧰 مزوّدين')
      +'</div>'
      +'<div class="ct2-c"><div class="ct2-h">وش صار لإيميلات التفعيل؟ <span style="color:var(--muted);font-weight:700">('+fmtNum(mtot)+' شخص)</span></div>'
        +(mtot?bar('✓ وصل',(M.delivered||0)+(M.opened||0)+(M.clicked||0),mtot,'#16a34a')+bar('⏳ انرسل — لسا ما تأكد',(M.sent||0)+(M.delayed||0)+(M.sending||0),mtot,'#94a3b8')+bar('✗ رجع / محظور',(M.bounced||0)+(M.suppressed||0)+(M.failed||0),mtot,'#dc2626')+bar('🚫 سبام',M.complained||0,mtot,'#b91c1c'):'<div class="vs-s">ما انرسلت إيميلات تفعيل في هالفترة</div>')
        +'<div class="vs-s" style="margin-top:8px">«رجع / محظور» = البريد غالباً مكتوب غلط — كلّمهم واتساب يصحّحونه أو فعّلهم يدوي.</div>'
      +'</div>'
    +'</div>';
  h+=_vsList(d);
  box.innerHTML=h;
}
// ═══ قائمة اللي ما فعّلوا: فترة خاصة + تشخيص «ليش ما فعّل» + إرسال جماعي ═══
var _vsLP={k:'all'}, _vsMode='pend', _vsVia='', _vsW='', _vsSel={}, _vsCh={email:true,notify:true};
// تذكّر اختياراتك (الفترة والقائمة والفلاتر) بعد تحديث الصفحة
try{ var _vsS=JSON.parse(localStorage.getItem('adm_vsl')||'null'); if(_vsS){ if(_vsS.lp&&_vsS.lp.k)_vsLP=_vsS.lp; if(_vsS.m)_vsMode=_vsS.m; if(_vsS.f)_vsF=_vsS.f; if(_vsS.w)_vsW=_vsS.w; if(_vsS.v)_vsVia=_vsS.v; } }catch(e){}
function _vsSave(){ try{ localStorage.setItem('adm_vsl',JSON.stringify({lp:_vsLP,m:_vsMode,f:_vsF,w:_vsW,v:_vsVia})); }catch(e){} }
var _VSWHY={
  invalid:['✗ البريد غير صالح','#b91c1c','مكتوب بشكل خاطئ — كلّمه واتساب ياخذ بريده الصحيح أو فعّله يدوي'],
  typo:['✍️ غلطة إملائية في البريد','#b91c1c','مثل gmial بدل gmail — الإيميل ما راح يوصله. كلّمه واتساب يصحّحه'],
  bad:['✗ البريد رجع / غير موجود','#b91c1c','Resend رفضه — البريد غلط أو مقفل. واتساب يصحّحه أو فعّله يدوي'],
  spam:['🚫 حط إيميلنا سبام','#b91c1c','ما نقدر نرسل له إيميل — كلّمه واتساب'],
  nosend:['📭 ما انرسل له إيميل تفعيل','#64748b','غالباً سجّل قبل تتبّع الإيميلات — أرسل له الحين'],
  code_wrong:['🔢 حاول يكتب الرمز وغلط','#92400e','يبي يفعّل بس الرمز ما ضبط — أرسل له رمز جديد'],
  opened:['👀 فتح الإيميل وما كمّل','#92400e','شاف الإيميل وما ضغط — ذكّره بإشعار أو واتساب'],
  waiting:['⏳ انرسل له قريب','#1d4ed8','الإيميل انرسل خلال آخر 6 ساعات — انتظر شوي'],
  ignored:['🙈 يدخل المنصة ومتجاهل التفعيل','#7c3aed','يستخدم المنصة بس ما فعّل — إشعار + واتساب'],
  gone:['💤 سجّل وما رجع','#64748b','ما رجع للمنصة بعد التسجيل — إيميل تذكير + واتساب']
};
var _VSORD=['typo','invalid','bad','spam','nosend','code_wrong','opened','ignored','gone','waiting'];
function _vsLRange(){ var now=new Date(),t=_ymd(now),dd=function(n){return _ymd(new Date(now.getTime()-n*86400000));},k=_vsLP.k;
  if(k==='today')return {from:t,to:t,lbl:'اليوم'}; if(k==='yesterday')return {from:dd(1),to:dd(1),lbl:'أمس'};
  if(k==='7d')return {from:dd(6),to:t,lbl:'آخر 7 أيام'}; if(k==='month')return {from:t.slice(0,8)+'01',to:t,lbl:'هالشهر'};
  if(k==='custom'&&_vsLP.from&&_vsLP.to)return {from:_vsLP.from,to:_vsLP.to,lbl:_vsLP.from+' ← '+_vsLP.to};
  return null; }
function _vsLSet(k){ if(k==='custom'){ var f=(document.getElementById('vsl-f')||{}).value,t=(document.getElementById('vsl-t')||{}).value; if(!f||!t){_vsLP={k:'custom'};_vsPaint();return;} _vsLP={k:'custom',from:f,to:t}; } else _vsLP={k:k}; _vsSel={}; window._vsAll=false; _loadVStats(); }
function _vsWhyTxt(u){ var w=_VSWHY[u.why]||['—','#64748b',''], t=w[0];
  if(u.why==='typo'){ var p=String(u.email||'').split('@'); t+=' <span dir="ltr" style="font-weight:700">('+esc(p[1]||'')+')</span>'; }
  if(u.why==='code_wrong')t+=' ('+u.tries+' مرات)';
  if(u.why==='gone'&&/delivered|opened/.test(u.mail_status||''))t='💤 وصله الإيميل وما رجع';
  return '<b style="color:'+w[1]+'">'+t+'</b>'; }
function _vsMins(a,b){ var m=Math.round((new Date(b)-new Date(a))/60000); if(!(m>=0))return ''; return m<1?'أقل من دقيقة':(m<60?m+' دقيقة':(m<1440?Math.round(m/60)+' ساعة':Math.round(m/1440)+' يوم')); }
function _vsTabs(d,LR){ var seg=[['all','الكل'],['today','اليوم'],['yesterday','أمس'],['7d','7 أيام'],['month','هالشهر'],['custom','تخصيص']];
  var np=(d.pending||[]).length, nv=(d.verified||[]).length;
  return '<div class="vsm"><button type="button" class="'+(_vsMode==='pend'?'on':'')+'" onclick="_vsMode=\'pend\';_vsF=\'all\';_vsPaint()">⏳ ما فعّلوا <b>'+fmtNum(np)+'</b></button><button type="button" class="'+(_vsMode==='done'?'on ok':'')+'" onclick="_vsMode=\'done\';_vsF=\'all\';window._vsAll=false;_vsPaint()">✓ سجّلوا وفعّلوا <b>'+fmtNum(nv)+'</b></button></div>'
    +'<div class="vs-s" style="margin:2px 0 8px">ℹ️ التفعيل إلزامي للحسابات من 19 سبتمبر · تتبّع «كيف فعّل ومتى» بدأ 6 أكتوبر · '+(LR?'اللي سجّلوا '+esc(LR.lbl):'من كل الفترات')+(np+nv?' · نسبة التفعيل: <b style="color:#15803d">'+Math.round(nv/(np+nv)*100)+'%</b>':'')+'</div>'
    +'<div class="vs-seg" style="margin-bottom:8px;align-self:flex-start">'+seg.map(function(x){return '<button type="button" class="'+(_vsLP.k===x[0]?'on':'')+'" onclick="_vsLSet(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'</div>'
    +(_vsLP.k==='custom'?'<div class="vsl-cus"><label>من <input type="date" id="vsl-f" value="'+(_vsLP.from||'')+'"></label><label>إلى <input type="date" id="vsl-t" value="'+(_vsLP.to||'')+'"></label><button class="ct2-b pri" onclick="_vsLSet(\'custom\')">عرض</button></div>':''); }
function _vsDone(d){
  var V=d.verified||[], LR=_vsLRange();
  var VIA={link:['🔗 رابط الإيميل','#1d4ed8','#dbeafe'],code:['🔢 الرمز','#7c3aed','#ede9fe'],admin:['🛠️ الإدارة','#b45309','#fef3c7'],other:['فعّل قبل 6 أكتوبر','#64748b','#f1f5f9']};
  var base=V.filter(function(u){return _vsF==='all'||u.role===_vsF;}), L=base.filter(function(u){return !_vsVia||u.via===_vsVia;});
  var C={}; base.forEach(function(u){C[u.via]=(C[u.via]||0)+1;});
  var h='<div class="ct2-c" id="vs-list" style="margin-top:14px"><div class="ct2-h">متابعة التفعيل</div>'+_vsTabs(d,LR);
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 6px">'+[['all','الكل',V.length],['client','عملاء',V.filter(function(u){return u.role==='client';}).length],['provider','مزوّدين',V.filter(function(u){return u.role==='provider';}).length]].map(function(c){return '<button type="button" class="ct2-b'+(c[0]===_vsF?' pri':'')+'" onclick="_vsF=\''+c[0]+'\';window._vsAll=false;_vsPaint()">'+c[1]+' '+c[2]+'</button>';}).join('')+'</div>'
    +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px"><span class="vs-s" style="align-self:center">فعّل عن طريق:</span>'+['','link','code','admin','other'].filter(function(k){return !k||C[k];}).map(function(k){var v=VIA[k];return '<button type="button" class="ct2-b'+(_vsVia===k?' pri':'')+'" onclick="_vsVia=\''+k+'\';window._vsAll=false;_vsPaint()">'+(k?v[0]+' '+C[k]:'الكل '+base.length)+'</button>';}).join('')+'</div>';
  h+=(L.length?L.slice(0,window._vsAll?1000:15).map(function(u){var prov=u.role==='provider',v=VIA[u.via]||VIA.other,t=u.email_verified_at?_vsMins(u.created_at,u.email_verified_at):'';
      return '<div class="ct2-u"><span class="ct2-av" style="background:'+(prov?'#0f766e':'#1d4ed8')+'">'+esc(String(u.name||'؟').trim().charAt(0))+'</span>'
        +'<div class="ct2-ui"><div><a href="#" onclick="event.preventDefault();_vsOpen('+u.id+')">'+esc(u.name||'—')+'</a> <span class="ct2-pl '+(prov?'p':'c')+'">'+(prov?'مزوّد':'عميل')+'</span> <span class="ct2-pl" style="background:'+v[2]+';color:'+v[1]+'">'+v[0]+'</span>'+((u.projects||u.bids)?' <span class="ct2-pl" style="background:#dcfce7;color:#15803d">'+(prov?u.bids+' عرض':u.projects+' مشروع')+'</span>':'')+'</div>'
        +'<small class="vs-why"><b style="color:#15803d">✓ فعّل'+(u.email_verified_at?' '+_adAgo(u.email_verified_at):'')+'</b>'+(t?' · بعد '+t+' من التسجيل':'')+(u.sends>1?' · احتاج '+u.sends+' إيميلات':'')+'</small>'
        +'<small><span dir="ltr">'+esc(u.email||'')+'</span> · سجّل '+_adAgo(u.created_at)+'</small></div></div>';}).join('')
      +(L.length>15?'<a href="#" class="ct2-more" onclick="event.preventDefault();window._vsAll=!window._vsAll;_vsPaint()">'+(window._vsAll?'عرض أقل':'عرض الكل ('+L.length+')')+'</a>':'')
      :'<div class="vs-s" style="padding:10px 0">ما فيه أحد فعّل في هالفترة</div>')+'</div>';
  return h;
}
function _vsList(d){
  if(_vsMode==='done')return _vsDone(d);
  var P=d.pending||[], LR=_vsLRange(), work=function(u){return u.projects||u.bids;};
  var old3=function(u){return Date.now()-new Date(u.created_at)>3*86400000;};
  var base=P.filter(function(u){return _vsF==='all'||(_vsF==='work'?work(u):(_vsF==='old3'?old3(u):u.role===_vsF));});
  var L=base.filter(function(u){return !_vsW||u.why===_vsW;});
  var W={}; base.forEach(function(u){W[u.why]=(W[u.why]||0)+1;});
  var h='<div class="ct2-c" id="vs-list" style="margin-top:14px"><div class="ct2-h">متابعة التفعيل</div>'+_vsTabs(d,LR);
  // وين المشكلة؟
  var wt=base.length;
  h+='<div class="vsw"><div class="vsw-h">🔍 وين المشكلة؟ <small>اضغط أي سبب يطلع لك أصحابه</small></div>'
    +(wt?_VSORD.filter(function(k){return W[k];}).map(function(k){var w=_VSWHY[k],n=W[k],pc=Math.round(n/wt*100);
      return '<button type="button" class="vsw-r'+(_vsW===k?' on':'')+'" onclick="_vsW=_vsW===\''+k+'\'?\'\':\''+k+'\';_vsSel={};window._vsAll=false;_vsPaint()"><span class="vsw-n"><b style="color:'+w[1]+'">'+w[0]+'</b><small>'+w[2]+'</small></span><span class="ct2-bar"><i style="width:'+Math.max(4,pc)+'%;background:'+w[1]+'"></i></span><b class="vsw-c">'+fmtNum(n)+' <small>('+pc+'%)</small></b></button>';}).join('')
      :'<div class="vs-s">ما فيه أحد 👌</div>')+'</div>';
  var chips=[['all','الكل',P.length],['client','عملاء',P.filter(function(u){return u.role==='client';}).length],['provider','مزوّدين',P.filter(function(u){return u.role==='provider';}).length],['work','عندهم مشروع/عرض معلّق',P.filter(work).length],['old3','تجاوزوا 3 أيام',P.filter(old3).length]];
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 6px">'+chips.map(function(c){return '<button type="button" class="ct2-b'+(c[0]===_vsF?' pri':'')+'" onclick="_vsF=\''+c[0]+'\';_vsSel={};window._vsAll=false;_vsPaint()">'+c[1]+' '+c[2]+'</button>';}).join('')
    +(_vsW?'<button type="button" class="ct2-b" style="border-color:#fca5a5;color:#b91c1c" onclick="_vsW=\'\';_vsSel={};_vsPaint()">'+_VSWHY[_vsW][0]+' ✕</button>':'')+'</div>';
  // شريط الإرسال الجماعي
  var selN=L.filter(function(u){return _vsSel[u.id];}).length, allOn=L.length&&selN===L.length;
  var appN=L.filter(function(u){return _vsSel[u.id]&&u.has_app;}).length;
  h+='<div class="vsb'+(selN?' on':'')+'"><label class="vsb-all"><input type="checkbox" '+(allOn?'checked':'')+' onchange="_vsSelAll(this.checked)"> تحديد الكل ('+fmtNum(L.length)+')</label>'
    +(selN?'<span class="vsb-n">محدد <b>'+fmtNum(selN)+'</b></span>'
      +'<label class="vsb-c"><input type="checkbox" '+(_vsCh.email?'checked':'')+' onchange="_vsCh.email=this.checked"> ✉️ إيميل تفعيل</label>'
      +'<label class="vsb-c" title="يوصل كإشعار داخل المنصة، وإشعار جوال للي عندهم التطبيق"><input type="checkbox" '+(_vsCh.notify?'checked':'')+' onchange="_vsCh.notify=this.checked"> 🔔 إشعار <small>('+fmtNum(appN)+' عندهم التطبيق)</small></label>'
      +'<button class="ct2-b pri" onclick="_vsBulk(this)">إرسال للمحددين</button>':'<span class="vs-s">حدد أشخاص عشان ترسل لهم إيميل أو إشعار دفعة وحدة</span>')+'</div>';
  var wa=function(u){var ph=_waNorm(u.phone); if(!ph)return ''; var why=u.role==='provider'?'عشان تقدر تقدّم عروضك على المشاريع':'عشان يُنشر مشروعك ويوصلك عروض';
    var fix=/typo|invalid|bad|spam/.test(u.why)?'\nيبدو إن بريدك مكتوب غلط والإيميل ما يوصلك — أرسل لنا بريدك الصحيح هنا ونصحّحه ونفعّله لك.':'\nلو ما وصلك إيميل التفعيل (شيّك على البريد المزعج)، رد علينا هنا ونفعّله لك.';
    var m='السلام عليكم '+(u.name||'')+'، معك منصة مناقصة 👋\nلاحظنا إن بريدك '+(u.email||'')+' ما تفعّل للحين — فعّله '+why+'.'+fix;
    return '<a class="ct2-b wa" target="_blank" rel="noopener" href="https://wa.me/'+ph+'?text='+encodeURIComponent(m)+'">واتساب</a>';};
  h+=(L.length?L.slice(0,window._vsAll?1000:15).map(function(u){var prov=u.role==='provider';
      return '<div class="ct2-u'+(_vsSel[u.id]?' sel':'')+'"><input type="checkbox" aria-label="تحديد" '+(_vsSel[u.id]?'checked':'')+' onchange="_vsSelOne('+u.id+',this.checked)"><span class="ct2-av" style="background:'+(prov?'#0f766e':'#1d4ed8')+'">'+esc(String(u.name||'؟').trim().charAt(0))+'</span>'
        +'<div class="ct2-ui"><div><a href="#" onclick="event.preventDefault();_vsOpen('+u.id+')">'+esc(u.name||'—')+'</a> <span class="ct2-pl '+(prov?'p':'c')+'">'+(prov?'مزوّد':'عميل')+'</span>'+(work(u)?' <span class="ct2-pl" style="background:#fef3c7;color:#92400e">'+(prov?u.bids+' عرض':u.projects+' مشروع')+' معلّق</span>':'')+(u.has_app?' <span class="ct2-pl" style="background:#ede9fe;color:#6d28d9">📱 التطبيق</span>':'')+'</div>'
        +'<small class="vs-why">'+_vsWhyTxt(u)+'</small>'
        +'<small><span dir="ltr">'+esc(u.email||'')+'</span> · سجّل '+_adAgo(u.created_at)+(u.last_seen?' · آخر دخول '+_adAgo(u.last_seen):'')+(u.sends?' · أرسلنا '+u.sends+(u.sends>1?' مرات':' مرة'):'')+(u.reminded_at?' · 🔔 وصله تذكير '+_adAgo(u.reminded_at):'')+'</small></div>'
        +'<div class="ct2-acts">'+wa(u)+'<button class="ct2-b" onclick="_vsResend('+u.id+',this)">إعادة الإرسال</button><button class="ct2-b pri" onclick="_vsVerify('+u.id+',this)">تفعيل يدوي</button></div></div>';}).join('')
      +(L.length>15?'<a href="#" class="ct2-more" onclick="event.preventDefault();window._vsAll=!window._vsAll;_vsPaint()">'+(window._vsAll?'عرض أقل':'عرض الكل ('+L.length+')')+'</a>':'')
      :'<div class="vs-s" style="padding:10px 0">ما فيه أحد في هالقائمة 👌</div>')
    +'</div>';
  return h;
}
function _vsCur(){ var P=(_VS&&_VS.pending)||[]; return P.filter(function(u){return (_vsF==='all'||(_vsF==='work'?(u.projects||u.bids):(_vsF==='old3'?Date.now()-new Date(u.created_at)>3*86400000:u.role===_vsF)))&&(!_vsW||u.why===_vsW);}); }
function _vsSelAll(on){ _vsSel={}; if(on)_vsCur().forEach(function(u){_vsSel[u.id]=1;}); _vsPaint(); }
function _vsSelOne(id,on){ if(on)_vsSel[id]=1; else delete _vsSel[id]; _vsPaint(); }
function _vsBulk(btn){
  var ids=_vsCur().filter(function(u){return _vsSel[u.id];}).map(function(u){return u.id;});
  if(!ids.length){toast('حدد أشخاص أول','error');return;}
  if(!_vsCh.email&&!_vsCh.notify){toast('اختر إيميل أو إشعار','error');return;}
  var what=[_vsCh.email?'إيميل تفعيل':'',_vsCh.notify?'إشعار':''].filter(Boolean).join(' + ');
  if(!confirm('إرسال '+what+' لـ '+ids.length+' شخص؟'))return;
  btn.disabled=true;btn.textContent='جاري الإرسال...';
  fetch(API+'/api/admin/verify-bulk',Object.assign({method:'POST',body:JSON.stringify({ids:ids,email:_vsCh.email,notify:_vsCh.notify})},hdr())).then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});}).then(function(x){
    if(!x.ok){toast((x.d&&x.d.message)||'تعذّر','error');return;} var d=x.d, m=[];
    if(_vsCh.notify)m.push('🔔 '+d.notified+' إشعار');
    if(_vsCh.email)m.push('✉️ '+d.emailed+' إيميل');
    var sk=[]; if(d.skip_recent)sk.push(d.skip_recent+' انرسل لهم خلال 6 ساعات'); if(d.skip_bad)sk.push(d.skip_bad+' بريدهم مرفوض'); if(d.skip_typo)sk.push(d.skip_typo+' بريدهم فيه غلطة');
    toast('تم ✓ '+m.join(' · ')+(sk.length?' — تخطّينا: '+sk.join('، ')+' (كلّمهم واتساب)':''),'success');
    _vsSel={}; setTimeout(_loadVStats,2500);
  }).catch(function(){toast('تعذّر الاتصال','error');}).finally(function(){btn.disabled=false;btn.textContent='إرسال للمحددين';});
}
function _vsOpen(id){ try{ if((_allUsers||[]).some(function(x){return x.id===id;})){openUserView(id);return;} }catch(e){} location.hash='#users'; }
function _vsResend(id,btn){ btn.disabled=true;btn.textContent='...';
  fetch(API+'/api/admin/users/'+id+'/resend-verification',Object.assign({method:'POST',body:'{}'},hdr())).then(function(r){return r.json();}).then(function(d){ toast(d&&d.already?'بريده مفعّل':(d&&d.ok?'انرسل ✓':((d&&d.message)||'تعذّر الإرسال')),d&&d.ok?'success':'error'); setTimeout(_loadVStats,1500); })
  .catch(function(){toast('تعذّر الاتصال','error');}).finally(function(){btn.disabled=false;btn.textContent='إعادة الإرسال';}); }
function _vsVerify(id,btn){ if(!confirm('تفعيل بريد هذا المستخدم يدوياً؟'))return; btn.disabled=true;
  fetch(API+'/api/admin/users/'+id+'/verify-email',Object.assign({method:'PUT'},hdr())).then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});}).then(function(x){ if(!x.ok){toast((x.d&&x.d.message)||'تعذّر','error');btn.disabled=false;return;} toast('تم التفعيل ✓','success'); _loadVStats(); })
  .catch(function(){toast('تعذّر الاتصال','error');btn.disabled=false;}); }
// ═══ بطاقة «عقود المقاولات»: مين حمّل وأي عقد — للتسويق ═══
var _CT={};
function _loadCtStats(){
  var box=document.getElementById('dash-contracts'); if(!box)return; var R=_perRange();
  fetch(API+'/api/admin/contract-stats?from='+R.from+'&to='+R.to,hdr()).then(function(r){return r.ok?r.json():null;}).then(function(d){
    if(!d||!d.tot){box.style.display='none';return;} box.style.display=''; _CT=d;
    try{_miniSet('ct','📄 عقود المقاولات','<b>'+fmtNum(d.tot.n)+'</b> تحميل · <b>'+fmtNum(d.tot.users)+'</b> شخص ('+esc(_perRange().lbl)+')','ctstats');}catch(e){}
    var t=d.tot, nm=function(s){return (d.names&&d.names[s])||s;};
    var mx=d.top.length?d.top[0].n:1, showAllCt=!!window._ctAllTop, showAllU=!!window._ctAllU;
    var top=(showAllCt?d.top:d.top.slice(0,6)).map(function(x,i){return '<div class="ct2-r"><span class="ct2-i">'+(i+1)+'</span><span class="ct2-n" title="'+esc(nm(x.slug))+'">'+esc(nm(x.slug).replace(/^عقد /,''))+'</span><span class="ct2-bar"><i style="width:'+Math.max(4,Math.round(x.n/mx*100))+'%"></i></span><b>'+fmtNum(x.n)+'</b></div>';}).join('');
    var ph=function(p){p=String(p||'').replace(/\D/g,''); if(p.indexOf('05')===0)p='966'+p.slice(1); return p;};
    var COL=['#1d4ed8','#0f766e','#7c3aed','#be185d','#c2410c','#0369a1'];
    var us=showAllU?d.users.slice(0,300):d.users.slice(0,8);
    var list=us.map(function(u,i){var p=ph(u.phone), prov=u.role==='provider';
      return '<div class="ct2-u"><input type="checkbox" class="ct-ck" data-id="'+u.id+'" onchange="_ctSelUpd()"'+(_ctSel[u.id]?' checked':'')+'>'
        +'<span class="ct2-av" style="background:'+COL[(u.id||i)%COL.length]+'">'+esc(String(u.name||'؟').trim().charAt(0))+'</span>'
        +'<div class="ct2-ui"><div><a href="#" onclick="event.preventDefault();openUserView('+u.id+')">'+esc(u.name||'—')+'</a> <span class="ct2-pl '+(prov?'p':'c')+'">'+(prov?'مزوّد':'عميل')+'</span></div>'
        +'<small>'+[u.city?esc(u.city):'',u.slugs.map(function(s){return esc(nm(s).replace(/^عقد /,''));}).join('، '),esc(String(u.last_at||'').slice(5,10).replace('-','/'))].filter(Boolean).join(' · ')+'</small></div>'
        +'<div class="ct2-acts">'+(p?'<a class="ct2-b wa" target="_blank" rel="noopener" href="https://wa.me/'+p+'">واتساب</a>':'')+'<button class="ct2-b" onclick="_ctMsg1('+u.id+')">رسالة</button></div></div>';}).join('');
    var kp=function(lbl,v,sub,c){return '<div class="ct2-k"><small>'+lbl+'</small><b'+(c?' style="color:'+c+'"':'')+'>'+v+'</b><span>'+sub+'</span></div>';};
    var pct=function(a){return t.users?Math.round(a/t.users*100)+'% من اللي حمّلوا':'—';};
    box.innerHTML='<div class="vs-h"><h3>📄 عقود المقاولات</h3><a href="/contracts" target="_blank" rel="noopener" style="margin-inline-start:auto;font-size:12.5px;font-weight:800">manaqasa.com/contracts ↗</a></div>'
      +'<div class="ct2-kp">'+kp('تحميلات · '+esc(R.lbl),fmtNum(t.n),'الإجمالي من البداية '+fmtNum(d.all.n))+kp('أشخاص حمّلوا',fmtNum(t.users),'عملاء محتملين للتسويق','#1d4ed8')+kp('عملاء',fmtNum(t.clients),pct(t.clients),'#1d4ed8')+kp('مزوّدين',fmtNum(t.providers),pct(t.providers),'#0f766e')+'</div>'
      +'<div class="ct2-g">'
        +'<div class="ct2-c"><div class="ct2-h">أكثر العقود تحميلاً'+(d.top.length>6?'<a href="#" onclick="event.preventDefault();window._ctAllTop=!window._ctAllTop;_loadCtStats()">'+(showAllCt?'أقل':'عرض الكل ('+d.top.length+')')+'</a>':'')+'</div>'+(top||'<div class="vs-s">ما فيه تحميلات في هالفترة</div>')+'</div>'
        +'<div class="ct2-c"><div class="ct2-h">آخر من حمّل <span style="color:var(--muted);font-weight:700">('+fmtNum(d.users.length)+')</span><span class="ct2-hb"><button class="ct2-b pri" id="ct-send" onclick="_ctMsg()">📣 رسالة للكل ('+fmtNum(d.users.length)+')</button><button class="ct2-b" onclick="_ctCsv()">⬇ Excel</button></span></div>'
          +(list?'<label class="ct2-all"><input type="checkbox" id="ct-all" onchange="_ctAll(this.checked)"> تحديد الكل</label>'+list:'<div class="vs-s">ما أحد حمّل في هالفترة</div>')
          +(d.users.length>8?'<a href="#" class="ct2-more" onclick="event.preventDefault();window._ctAllU=!window._ctAllU;_loadCtStats()">'+(showAllU?'عرض أقل':'عرض الكل ('+fmtNum(d.users.length)+') ‹')+'</a>':'')
          +(showAllU&&d.users.length>300?'<div class="vs-s">يظهر أول 300 — صدّر Excel للقائمة كاملة</div>':'')
        +'</div>'
      +'</div>';
    _ctSelUpd(true);
  }).catch(function(){ box.style.display='none'; });
}
function _ctCsv(){
  var d=_CT; if(!d||!d.users)return; var nm=function(s){return (d.names&&d.names[s])||s;};
  var q=function(v){v=String(v==null?'':v); if(/^[=+\-@]/.test(v))v="'"+v; return '"'+v.replace(/"/g,'""')+'"';};
  var L=[['الاسم','الجوال','الإيميل','النوع','المدينة','عدد التحميلات','العقود','آخر تحميل'].map(q).join(',')];
  d.users.forEach(function(u){ L.push([u.name,u.phone,u.email,u.role==='provider'?'مزوّد':'عميل',u.city,u.n,u.slugs.map(nm).join(' | '),String(u.last_at||'').slice(0,16).replace('T',' ')].map(q).join(',')); });
  var b=new Blob(['﻿'+L.join('\r\n')],{type:'text/csv;charset=utf-8'}); var a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download='contracts-downloads-'+d.range.from+'_'+d.range.to+'.csv'; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
}

// رسالة تسويقية (إشعار التطبيق و/أو إيميل بقالب مناقصة) لمن حمّل العقود — يستخدم نافذة «رسالة للمحدّدين»
var _ctSel={};
function _ctAll(on){ _ctSel={}; if(on&&_CT.users)_CT.users.forEach(function(u){_ctSel[u.id]=1;}); [].forEach.call(document.querySelectorAll('.ct-ck'),function(c){c.checked=!!on;}); _ctSelUpd(true); }
function _ctSelUpd(skip){
  if(!skip){ [].forEach.call(document.querySelectorAll('.ct-ck'),function(c){ var id=c.getAttribute('data-id'); if(c.checked)_ctSel[id]=1; else delete _ctSel[id]; }); }
  var n=Object.keys(_ctSel).length, b=document.getElementById('ct-send'); if(!b)return;
  b.textContent=n?('📣 أرسل رسالة للمحدّدين ('+fmtNum(n)+')'):('📣 أرسل رسالة للكل ('+fmtNum((_CT.users||[]).length)+')');
}
function _ctMsg1(id){ window._ctFrom=1; _selUsers={}; _selUsers[String(id)]=true; document.getElementById('sm-count').textContent=1; fillMsgTemplates(); applyMsgTemplate(0); document.getElementById('sm-channel').value='both'; document.getElementById('selMsgModal').classList.add('show'); }
function _ctMsg(){
  var ids=Object.keys(_ctSel); if(!ids.length&&_CT.users)ids=_CT.users.map(function(u){return String(u.id);});
  if(!ids.length){toast('ما فيه أحد حمّل في هالفترة','error');return;}
  window._ctFrom=1; _selUsers={}; ids.forEach(function(id){_selUsers[id]=true;});
  document.getElementById('sm-count').textContent=ids.length;
  fillMsgTemplates(); applyMsgTemplate(0);
  document.getElementById('sm-channel').value='both';
  document.getElementById('selMsgModal').classList.add('show');
}

// ملخص صغير في لوحة المعلومات + روابط لصفحات التفاصيل (التطبيق / العقود)
var _MINI={};
function _miniSet(k,t,html,pg){
  _MINI[k]={t:t,h:html,pg:pg};
  var box=document.getElementById('dash-mini'); if(!box)return;
  box.innerHTML='<div class="vs-h"><h3>📊 متابعة سريعة</h3></div>'+['app','ct'].filter(function(x){return _MINI[x];}).map(function(x){var m=_MINI[x];
    return '<button type="button" onclick="_gtGo(\''+m.pg+'\')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:right;border:1px solid var(--border);background:var(--bg);border-radius:14px;padding:13px 14px;margin-top:10px;cursor:pointer;font-family:inherit;color:inherit"><div style="flex:1"><div style="font-weight:900;font-size:14.5px">'+m.t+'</div><div class="vs-s" style="font-size:13px;margin-top:3px">'+m.h+'</div></div><span style="font-weight:900;color:var(--p);font-size:13px;white-space:nowrap">التفاصيل ←</span></button>';}).join('');
}
function _perMini(id){
  var box=document.getElementById(id); if(!box)return;
  var ks=[['today','اليوم'],['yesterday','أمس'],['7d','7 أيام'],['30d','30 يوم'],['month','هالشهر'],['year','هالسنة']];
  box.innerHTML='<div class="vs-seg" role="tablist" aria-label="الفترة" style="margin-bottom:14px">'+ks.map(function(x){return '<button type="button" class="'+(_PER.k===x[0]?'on':'')+'" onclick="_perSet(\''+x[0]+'\')">'+x[1]+'</button>';}).join('')+'</div>';
}

// إضافات صفحة التطبيق: جديد في الفترة، آيفون/أندرويد، والضغطات يوم بيوم
function _appExtra(d,R){
  var h='', f=d.fresh||{};
  h+='<div class="vs-st" style="margin-top:16px">فعّلوا التطبيق لأول مرة ('+esc(R.lbl)+')</div><div class="vs-k">'
    +'<div class="vs-b"><span class="t">مزوّدين جدد على التطبيق</span><span class="big" style="color:#c2410c">'+fmtNum(f.providers||0)+'</span></div>'
    +'<div class="vs-b"><span class="t">عملاء جدد على التطبيق</span><span class="big" style="color:#1d4ed8">'+fmtNum(f.clients||0)+'</span></div></div>';
  var os={}; (d.byOs||[]).forEach(function(x){os[x.os]=x.clicks||0;});
  var tot=(os.ios||0)+(os.android||0)+(os.desktop||0);
  if(tot){ var pc=function(v){return Math.round(v/tot*100);};
    h+='<div class="vs-st" style="margin-top:16px">الضغطات حسب الجهاز</div>'
      +[['ios','🍎 آيفون','#0f172a'],['android','🤖 أندرويد','#16a34a'],['desktop','💻 كمبيوتر','#64748b']].filter(function(x){return os[x[0]];}).map(function(x){return '<div class="vs-br"><span class="nm">'+x[1]+'</span><span class="bar"><i style="width:'+pc(os[x[0]])+'%;background:'+x[2]+'"></i></span><span class="v">'+fmtNum(os[x[0]])+' ('+pc(os[x[0]])+'%)</span></div>';}).join(''); }
  var dl=d.daily||[];
  if(dl.length>1){ var mx=Math.max.apply(null,dl.map(function(x){return x.clicks||0;}))||1;
    h+='<div class="vs-st" style="margin-top:16px">الضغطات يوم بيوم</div><div style="display:flex;align-items:flex-end;gap:3px;height:110px;padding:6px 0;border-bottom:1px solid var(--border)">'
      +dl.map(function(x){var v=x.clicks||0;return '<div title="'+esc(x.day)+': '+v+' ضغطة" style="flex:1;min-width:3px;height:'+Math.max(2,Math.round(v/mx*100))+'%;background:#1d4ed8;border-radius:4px 4px 0 0;opacity:'+(v?1:.25)+'"></div>';}).join('')
      +'</div><div class="vs-s" style="display:flex;justify-content:space-between;margin-top:4px"><span>'+esc(dl[0].day.slice(5))+'</span><span>'+esc(dl[dl.length-1].day.slice(5))+'</span></div>'; }
  return h;
}
