/* مناقصة — كود post.html (مفصول عشان يتخزّن في الجوال ويفتح أسرع) */

// ═══════════════════════════════════
// INIT
// ═══════════════════════════════════
var API='https://manaqasati-production.up.railway.app';
// المصدر الموحّد للتخصصات (مع احتياطي القائمة الثابتة)
(function(){ fetch(API+'/api/categories').then(function(r){return r.json();}).then(function(d){
  var sel=document.getElementById('n-cat');
  if(sel&&d&&Array.isArray(d.categories)&&d.categories.length){ sel.innerHTML='<option value="">اختر التصنيف</option>'+d.categories.map(function(c){return '<option>'+esc(c)+'</option>';}).join(''); }
}).catch(function(){}); })();
var _pollPaused=false;
document.addEventListener('visibilitychange',function(){_pollPaused=document.hidden;});
var user=JSON.parse(localStorage.getItem('user')||'{}');
var token=localStorage.getItem('token')||'';
if(!token||!user.id){location.href='/auth.html';}

// ═══ إرسال مسودّة الطلب تلقائياً بعد التسجيل (تدفّق: انشر أولاً ← سجّل ← يُرسل) ═══
(function(){
  try{
    var qp=new URLSearchParams(location.search);
    if(qp.get('postdraft')!=='1') return;
    var raw=null; try{ raw=sessionStorage.getItem('mnq_req_draft'); }catch(e){}
    if(!raw) return;
    var draft=JSON.parse(raw);
    if(!draft||!draft.title||!draft.category){ try{sessionStorage.removeItem('mnq_req_draft');}catch(e){} return; }
    // نظّف المسودّة فوراً لمنع الإرسال المكرّر
    try{ sessionStorage.removeItem('mnq_req_draft'); }catch(e){}
    // جسم الطلب — نفس شكل submitReq بالضبط
    var body={ title:String(draft.title).slice(0,200), description:String(draft.description||'').slice(0,4000), category:draft.category, city:draft.city||null };
    if(draft.budget_max) body.budget_max=Number(draft.budget_max)||undefined;
    if(draft.deadline) body.deadline=draft.deadline;
    fetch(API+'/api/requests',Object.assign({method:'POST',body:JSON.stringify(body)},hdr()))
      .then(function(r){ return r.json().then(function(d){ return {ok:r.ok,d:d}; }); })
      .then(function(res){
        if(res.ok && res.d && res.d.id){
          if(window.track) track('StartPost');
          showToast('تم نشر طلبك بنجاح! 🎉','success');
          // نظّف الرابط
          try{ history.replaceState(null,'','/dashboard-client.html'); }catch(e){}
          setTimeout(function(){ if(typeof loadHome==='function') loadHome(); },400);
        } else {
          showToast((res.d&&res.d.message)||'تعذّر نشر الطلب، حاول من جديد','error');
        }
      })
      .catch(function(){ showToast('تعذّر نشر الطلب، تأكّد من اتصالك','error'); });
  }catch(e){}
})();


// isImg — يقبل URL وbase64
function isImg(s){return !!_safeUrl(s);} // يرفض الروابط اللي فيها علامات تنصيص/مسافات
function _pubBadge(key){
  if(!key||key==='none')return '';
  var M={verified:{l:'موثّق',c:'#2E90FA',bg:'#EFF8FF'},premium:{l:'مميز',c:'#B8780A',bg:'#FFF7E6'},gold_partner:{l:'شريك ذهبي',c:'#B8780A',bg:'#FFF7E6'},top_rated:{l:'الأعلى تقييماً',c:'#15803d',bg:'#dcfce7'},fast_response:{l:'سريع الاستجابة',c:'#0369a1',bg:'#e0f2fe'},trusted_client:{l:'عميل موثوق',c:'#1e3a8a',bg:'#dbeafe'}};
  var m=M[key];if(!m)return '';
  return '<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;background:'+m.bg+';color:'+m.c+';margin-right:4px;vertical-align:middle"><svg width="9" height="9" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'+m.l+'</span>';
}
function _tierBadge(t){
  if(!t||t==='new')return '';
  var M={active:{l:'مزود نشط',c:'#9a6a2e',bg:'#f6ead9'},distinguished:{l:'مزود مميّز',c:'#5b6b7d',bg:'#eceff3'},expert:{l:'خبير معتمد',c:'#97710d',bg:'#fdf1cf'}};
  var m=M[t];if(!m)return '';
  return '<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;background:'+m.bg+';color:'+m.c+';margin-right:4px;vertical-align:middle"><svg width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/></svg>'+m.l+'</span>';
}

function esc(s){var d=document.createElement('div');d.textContent=String(s||'');return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// روابط آمنة فقط (http/https/مسار داخلي/صورة base64)
function _safeUrl(u){u=String(u==null?'':u).trim();return /^(https?:\/\/|\/(?!\/)|data:image\/)/i.test(u)&&!/["'<>`\s]/.test(u)?u:'';}
// نص آمن داخل onclick
function _jsa(s){return esc(JSON.stringify(String(s==null?'':s)));}
function fmtN(n){return n?String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g,','):'0';}
function fmtDate(d){if(!d)return'';try{return new Date(d).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'2-digit',month:'short',year:'numeric'});}catch(e){return d;}}
function timeAgo(d){var s=(Date.now()-new Date(d))/1000;if(s<60)return'الآن';if(s<3600)return Math.floor(s/60)+' د';if(s<86400)return Math.floor(s/3600)+' س';return Math.floor(s/86400)+' يوم';}
function hdr(){return{headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},cache:'no-store'};}
// كاش خفيف: يعرض آخر بيانات محفوظة فوراً (سرعة)، ثم يحدّثها من الخادم
function _cGet(key){ try{ var v=sessionStorage.getItem('mnq_c_'+key); return v?JSON.parse(v):null; }catch(e){ return null; } }
function _cSet(key,val){ try{ sessionStorage.setItem('mnq_c_'+key,JSON.stringify(val)); }catch(e){} }
function jFetch(path,opts){
  return fetch(API+path,Object.assign({headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},cache:'no-store'},opts||{}))
    .then(function(r){
      if(r.status===401){ _sessionExpired(); throw new Error('انتهت الجلسة'); }
      if(!r.ok)throw new Error('HTTP '+r.status);
      return r.json();
    });
}
// انتهاء الجلسة: يُعلم المستخدم ويوجّهه لتسجيل الدخول (بدل أخطاء غامضة)
var _sessionExpiredShown=false;
function _sessionExpired(){
  if(_sessionExpiredShown)return; _sessionExpiredShown=true;
  try{ if(typeof showToast==='function')showToast('انتهت جلستك — يرجى تسجيل الدخول من جديد','error'); }catch(e){}
  setTimeout(function(){ try{localStorage.removeItem('token');localStorage.removeItem('user');}catch(e){} location.href='/auth.html'; }, 1500);
}
function showToast(msg,type){
  var w=document.getElementById('_tw');
  if(!w){w=document.createElement('div');w.id='_tw';w.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:99999;pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:6px';document.body.appendChild(w);}
  var t=document.createElement('div');
  t.style.cssText='padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.2);opacity:0;transition:opacity .3s;white-space:nowrap;background:'+(type==='error'?'#DC2626':type==='success'?'#16A34A':'#172554')+';font-family:Tajawal,sans-serif';
  t.textContent=msg;w.appendChild(t);
  setTimeout(function(){t.style.opacity='1';},10);
  setTimeout(function(){t.style.opacity='0';setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},400);},3000);
}
function stTag(s){
  var m={open:'<span class="tag t-open">● مفتوح</span>',in_progress:'<span class="tag t-prog">⟳ جارٍ</span>',completed:'<span class="tag t-done"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="display:inline-block;vertical-align:-1px"><polyline points="20 6 9 17 4 12"/></svg> مكتمل</span>',pending_review:'<span class="tag t-rev">⧖ مراجعة</span>',review:'<span class="tag t-rev">⧖ مراجعة</span>',needs_edit:'<span class="tag" style="background:#ffedd5;color:#c2410e;border:1px solid #fed7aa;font-weight:800">✕ مطلوب تعديل</span>',rejected:'<span class="tag" style="background:#fee2e2;color:#dc2626;border:1px solid #fecaca;font-weight:800">✕ مرفوض</span>'};
  return m[s]||'<span class="tag t-rev">'+esc(s)+'</span>';
}
function emptyH(t,s){return '<div class="empty"><div class="empty-ic"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><h4>'+t+'</h4>'+(s?'<p>'+s+'</p>':'')+'</div>';}
function errH(retryFn){
  var id='_retry_'+Math.random().toString(36).slice(2,8);
  if(retryFn)window[id]=retryFn;
  return '<div class="empty"><h4 style="color:var(--red)">تعذّر التحميل</h4>'
    +'<div style="font-size:12px;color:var(--muted);margin:6px 0 12px">تحقّق من اتصالك بالإنترنت</div>'
    +(retryFn?'<button onclick="(window[\''+id+'\']||function(){})()" style="background:var(--p);color:#fff;border:none;padding:9px 22px;border-radius:9px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>حاول مرة ثانية</button>':'')
    +'</div>';
}
function _skCard(){return '<div class="sk-box"><div style="display:flex;gap:8px;align-items:center"><div style="width:4px;height:50px;border-radius:4px;background:#dbe6fa;flex-shrink:0"></div><div style="flex:1"><div class="sk sk-line md" style="margin-bottom:7px"></div><div class="sk sk-line sm"></div></div><div class="sk sk-line" style="width:60px"></div></div></div>';}
function _skCards(n){var h='<div class="card card-accent"><div class="ch"><div class="sk sk-line" style="width:120px;height:16px"></div></div>';for(var i=0;i<(n||4);i++)h+=_skCard();return h+'</div>';}

// ═══════════════════════════════════
// AVATAR
// ═══════════════════════════════════
function applyAvatar(img){
  if(!isImg(img))return;
  ['userAv','mobAv','profileAv','phAv'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    el.innerHTML='<img loading="lazy" src="'+esc(_safeUrl(img))+'" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">';
  });
}

// Init user display
(function(){
  var n=user.name||'—';
  document.getElementById('userName').textContent=n;
  var _hi=document.getElementById('phHi');if(_hi)_hi.textContent='أهلاً، '+n.split(' ')[0];
  ['userAv','mobAv','profileAv','phAv'].forEach(function(id){var el=document.getElementById(id);if(el)el.textContent=n[0]||'ع';});
  var cached=localStorage.getItem('client_avatar_'+user.id);
  if(isImg(cached))applyAvatar(cached);
  jFetch('/api/client/profile').then(function(p){
    if(p&&isImg(p.profile_image)){localStorage.setItem('client_avatar_'+user.id,p.profile_image);applyAvatar(p.profile_image);}
    if(p&&p.name){document.getElementById('prof-name').value=p.name||'';document.getElementById('prof-phone').value=p.phone||'';document.getElementById('profNameDisp').textContent=p.name;}
  }).catch(function(){});
})();

// ═══════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════
var _pageTitles={home:'الرئيسية',requests:'طلباتي',new:'طلب جديد',notifs:'الإشعارات',detail:'تفاصيل الطلب',profile:'حسابي',chat:'المحادثات'};
var curRequestId=null;
function show(pg,el,key){
  document.querySelectorAll('.page').forEach(function(p){p.className='page';});
  document.querySelectorAll('.ni').forEach(function(m){m.className='ni';});
  document.querySelectorAll('.bni').forEach(function(m){m.className='bni';});
  var target=document.getElementById('page-'+pg);if(target)target.className='page on';
  if(el)el.className='ni on';
  if(key){var b=document.getElementById('bn-'+key);if(b)b.className='bni on';}
  document.getElementById('pageTitle').textContent=_pageTitles[pg]||'';
  if(pg==='new'&&window.track)track('StartPost');
  if(pg==='home')loadHome();
  if(pg==='requests')loadReqs();
  if(pg==='notifs')loadNotifs();
  if(pg==='profile')loadProfile();
  if(pg==='chat')loadChatPage();
  if(pg==='new'){fillCitySelect(document.getElementById('n-city'));loadNotifCount();_restoreReqDraft();_bindReqDraft();}
  // أخفِ الشريط السفلي داخل المحادثة فقط
  if(pg==='chat'){document.body.classList.add('in-chat');}else{document.body.classList.remove('in-chat');}
  // احفظ الحالة في URL ليبقى المكان بعد التحديث + يخدم زر الرجوع
  if(!window._skipHash){
    var hash='#'+pg;
    if(pg==='detail'&&curRequestId)hash='#detail/'+curRequestId;
    if(location.hash!==hash){
      // pushState (وليس replace) ليُحفظ التنقّل → زر الرجوع يرجّع للقسم السابق داخل اللوحة
      if(window._navReplace){ history.replaceState({pg:pg},'',hash); window._navReplace=false; }
      else { history.pushState({pg:pg},'',hash); }
    }
  }
  window.scrollTo(0,0);
}
// زر رجوع المتصفّح: يرجّع للقسم السابق داخل اللوحة بدل الخروج منها
window.addEventListener('popstate',function(ev){
  var h=(location.hash||'').replace('#','');
  if(!h||h==='home'){ window._skipHash=true; show('home',document.getElementById('ni-home')); window._skipHash=false; return; }
  if(h.indexOf('detail/')===0){ var rid=h.split('/')[1]; if(rid&&typeof openDetail==='function'){window._skipHash=true;curRequestId=rid;openDetail(rid,null);show('detail',null,'detail');window._skipHash=false;} return; }
  var known=['home','requests','notifs','profile','chat','new','detail'];
  if(known.indexOf(h)>=0){ window._skipHash=true; show(h,document.getElementById('ni-'+h)); window._skipHash=false; }
});
function showTab(t,el){
  document.querySelectorAll('.tab').forEach(function(x){x.className='tab';});
  document.querySelectorAll('.tab-btn').forEach(function(x){x.className='tab-btn';});
  document.getElementById('tab-'+t).className='tab on';
  if(el)el.className='tab-btn on';
  if(t==='bids')loadBids(curRequestId);
  if(t==='actions')loadActions(curRequestId);
  if(t==='timeline')loadTimeline(curRequestId);
  if(t==='cq')loadClientQuestions(curRequestId);
}
function logout(){
  try{
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('mnq_role');
    sessionStorage.clear();
  }catch(e){}
  // بعد الخروج → الصفحة الرئيسية (زي باقي المنصات)، replace يمنع الرجوع للوحة
  location.replace('/');
}

// ═══ الأسئلة والتوضيحات (لوحة العميل) ═══
function loadClientQuestions(id){
  var el=document.getElementById('cq-list'); if(!el)return;
  el.innerHTML='<div class="loading">جارٍ تحميل الأسئلة...</div>';
  jFetch('/api/requests/'+id+'/questions').then(function(qs){
    if(!Array.isArray(qs))qs=[];
    renderClientQuestions(qs,id);
  }).catch(function(){ if(el)el.innerHTML=errH(); });
}
function _cqPending(q){ return !(q.answer&&String(q.answer).trim()); }
// تتبّع "الأسئلة المُشاهَدة" — يختفي النبيه بمجرّد الاطّلاع (حتى لو ما جاوب)
function _qSeenKey(){ try{ return 'mnq_q_seen_'+(user.id||''); }catch(e){ return 'mnq_q_seen'; } }
function _getQSeen(){ try{ return JSON.parse(localStorage.getItem(_qSeenKey())||'{}'); }catch(e){ return {}; } }
function _markReqQuestionsSeen(reqId){ try{ var s=_getQSeen(); s[reqId]=Date.now(); localStorage.setItem(_qSeenKey(),JSON.stringify(s)); }catch(e){} }
function _isReqQSeen(reqId){ var s=_getQSeen(); return !!s[reqId]; }
function renderClientQuestions(qs,id){
  var el=document.getElementById('cq-list'); if(!el)return;
  qs=qs.slice().sort(function(a,b){
    var ua=_cqPending(a), ub=_cqPending(b);
    if(ua!==ub) return ua?-1:1;
    return new Date(a.created_at)-new Date(b.created_at);
  });
  var pending=qs.filter(_cqPending).length;
  var cnt=document.getElementById('cq-count');
  if(cnt){ cnt.textContent=qs.length; cnt.style.background=pending>0?'var(--red)':''; cnt.style.color=pending>0?'#fff':''; }
  if(!qs.length){ el.innerHTML=emptyH('لا توجد أسئلة','عندما يسأل مزوّد عن هذا الطلب سيظهر هنا'); return; }
  var headTxt = pending>0 ? '<div style="font-size:12px;font-weight:800;color:var(--red);margin:0 2px 11px;display:flex;align-items:center;gap:5px"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>لديك '+pending+' '+(pending===1?'سؤال':'أسئلة')+' بانتظار ردّك</div>' : '';
  el.innerHTML = headTxt + qs.map(function(q){
    var nm=q.asker_name||'مزود';
    var ans=(q.answer&&String(q.answer).trim())?q.answer:'';
    var av='<div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--sky));display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;flex-shrink:0;font-family:\'Cairo\',sans-serif">'+esc(nm.charAt(0))+'</div>';
    var role=(q.asker_role==='provider')?' <span style="font-size:10px;font-weight:800;color:var(--p);background:var(--p-light);padding:1px 7px;border-radius:20px">مزود</span>':'';
    var head='<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">'+av+'<div><div style="font-size:13px;font-weight:800;color:var(--text)">'+esc(nm)+role+'</div><div style="font-size:11px;color:var(--muted)">'+timeAgo(q.created_at)+'</div></div></div>';
    var body='<div style="font-size:13.5px;color:var(--text);line-height:1.7">'+esc(q.body||'')+'</div>';
    var tail;
    if(ans){
      tail='<div style="background:var(--gold-l);border-radius:9px;padding:11px 13px;margin-top:10px"><div style="font-size:11px;font-weight:800;color:var(--gold-d);margin-bottom:3px">ردّك:</div><div style="font-size:13px;color:var(--text)">'+esc(ans)+'</div></div>';
    } else {
      tail='<div style="margin-top:10px"><textarea id="cq-ans-'+q.id+'" placeholder="اكتب ردّك على هذا السؤال..." style="width:100%;min-height:54px;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-family:inherit;font-size:13px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box"></textarea><button onclick="cqSubmitAnswer('+q.id+')" style="margin-top:7px;background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;border:none;border-radius:9px;padding:8px 18px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer">إرسال الرد</button></div>';
    }
    var hi = ans ? '' : 'border-right:4px solid var(--star);background:#fffdf5;';
    return '<div style="background:var(--white);border:1px solid var(--border);'+hi+'border-radius:13px;padding:14px;margin-bottom:11px">'+head+body+tail+'</div>';
  }).join('');
}
function cqSubmitAnswer(qid){
  var inp=document.getElementById('cq-ans-'+qid); if(!inp)return;
  var txt=(inp.value||'').trim(); if(!txt){ showToast('اكتب الرد أولاً','error'); return; }
  fetch(API+'/api/requests/'+curRequestId+'/questions/'+qid+'/answer',Object.assign({method:'POST',body:JSON.stringify({answer:txt})},hdr()))
    .then(function(r){ if(!r.ok)throw new Error(); return r.json(); })
    .then(function(){ showToast('تم إرسال الرد'); loadClientQuestions(curRequestId); renderQuestionNudgeRefresh(); })
    .catch(function(){ showToast('تعذّر إرسال الرد','error'); });
}
function openQuestionsTab(id,ev){
  _markReqQuestionsSeen(id);          // علّم أسئلة هذا الطلب كمُشاهَدة → يختفي النبيه
  var slot=document.getElementById('ph-q-nudge'); if(slot)slot.innerHTML='';
  openDetail(id,ev);
  setTimeout(function(){
    var btns=document.querySelectorAll('#page-detail .tab-btn'); var cqBtn=null;
    btns.forEach(function(b){ if(/showTab\('cq'/.test(b.getAttribute('onclick')||'')) cqBtn=b; });
    if(cqBtn) showTab('cq',cqBtn);
  },140);
}
// نبيه "أسئلة بانتظار ردّك" في الرئيسية
var _qNudgeReqs=null;
function renderQuestionNudge(all){ _qNudgeReqs=all||[]; scanQuestions(all,true); }
function paintQBadge(id,pn){
  var els=document.querySelectorAll('[data-qid="'+id+'"]'); if(!els.length)return;
  els.forEach(function(el){
    if(pn>0){
      el.innerHTML='<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>'+pn+' '+(pn===1?'سؤال بانتظار ردّك':'أسئلة بانتظار ردّك');
      el.style.display='flex';
    } else { el.style.display='none'; el.innerHTML=''; }
  });
}
function scanQuestions(all,doNudge){
  all=all||[];
  // نفحص أحدث 8 طلبات فقط (كان 30 = حتى 30 طلب شبكة متزامن يسبب بطئاً ملموساً)
  var cand=all.slice(0,8);
  if(!cand.length){ if(doNudge){ paintQNudge(0,null); } return; }
  var total=0, topReq=null, topN=0, done=0;
  cand.forEach(function(r){
    jFetch('/api/requests/'+r.id+'/questions').then(function(qs){
      var pn=Array.isArray(qs)?qs.filter(_cqPending).length:0;
      paintQBadge(r.id,pn);
      // النبيه العلوي يتجاهل الطلبات التي اطّلع عليها المستخدم (حتى لو لم يجب)
      if(pn>0 && !_isReqQSeen(r.id)){ total+=pn; if(pn>topN){ topN=pn; topReq=r; } }
    }).catch(function(){ paintQBadge(r.id,0); }).then(function(){
      done++;
      if(done===cand.length && doNudge){ paintQNudge(total,topReq); }
    });
  });
}
function renderQuestionNudgeRefresh(){ if(_qNudgeReqs) renderQuestionNudge(_qNudgeReqs); }
function paintQNudge(total,topReq){
  var slot=document.getElementById('ph-q-nudge'); if(!slot)return;
  if(!total||!topReq){ slot.innerHTML=''; return; }
  var chev='<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>';
  slot.innerHTML='<div class="nudge" style="border-right-color:var(--red);margin-bottom:8px" onclick="openQuestionsTab('+topReq.id+',event)">'
    +'<div class="nudge-ic" style="background:var(--red-l);color:var(--red)"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>'
    +'<div class="nudge-body"><div class="nudge-t">'+total+' '+(total===1?'سؤال':'أسئلة')+' بانتظار ردّك</div><div class="nudge-s">مزوّدون يسألون عن طلباتك — ردّ عليهم لتسريع العروض</div></div>'
    +'<div class="nudge-cta" style="color:var(--red)">رد '+chev+'</div></div>';
}

// ═══════════════════════════════════
// REQUEST CARD
// ═══════════════════════════════════
// حالة فارغة تعلّم بدل ما تعتذر
function emptyReqsH(){
  return '<div class="empty-teach">'
    +'<div class="et-ic"><svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>'
    +'<h4>ابدأ أول طلب لك</h4>'
    +'<p>انشر طلبك، استقبل عروضاً من مزودين موثوقين، واختر الأنسب — كل شيء في مكان واحد.</p>'
    +'<div class="et-steps"><span><b>1</b> انشر الطلب</span><span><b>2</b> قارن العروض</span><span><b>3</b> اختر ونفّذ</span></div>'
    +'<button class="et-cta" onclick="show(\'new\',null,\'new\')">+ طلب جديد</button>'
  +'</div>';
}

// أيقونة كل تخصّص (منقولة من الصفحة التسويقية)
function catSvg(cat,size){
  size=size||26;
  var p={
    'تبريد وتكييف':'<path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/>',
    'كهرباء':'<path d="M13 2L3 14h7v8l10-12h-7z"/>',
    'سباكة':'<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94z"/>',
    'نجارة':'<path d="M3 21l3-3m0 0l9-9 3 3-9 9zm12-12l3-3-3-3-3 3"/>',
    'تنظيف':'<path d="M3 21l6-6m2-7l4 4M14 4l6 6-9 9H5v-6z"/>',
    'نقل عفش':'<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>',
    'بناء':'<path d="M2 20h20M4 20V8l8-5 8 5v12M9 20v-6h6v6"/>',
    'كاميرات مراقبة':'<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    'مسابح':'<path d="M2 12h20M2 17h20M5 7l3 3M12 6l3 3M2 7c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2"/>',
    'مكافحة حشرات':'<circle cx="12" cy="12" r="4"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>',
    'عزل حراري':'<path d="M14 4v10.5a4 4 0 11-4 0V4a2 2 0 014 0z"/>',
    'مظلات وسواتر':'<path d="M3 18h18M5 18l7-12 7 12M12 6V3"/>',
    'حدادة':'<circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.2 4.2l4.3 4.3M15.5 15.5l4.3 4.3M1 12h6M17 12h6"/>',
    'شبكات وإنترنت':'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>',
    'ألمنيوم':'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h18M12 3v18"/>',
    'جبس':'<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>'
  };
  var d=p[cat]||'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/>';
  return '<svg width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">'+d+'</svg>';
}

function riCard(r,actions){
  var open=r.status==='open',prog=r.status==='in_progress',done=r.status==='completed'||r.status==='done',rev=r.status==='pending_review'||r.status==='review';
  var bidCount=parseInt(r.bid_count)||0;
  var icCls=open?'s-open':prog?'s-prog':done?'s-done':rev?'s-rev':'s-prog';
  var bolt='<svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
  var clock='<svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>';
  // الخطوة التالية حسب حالة الطلب
  var nextTxt='',nextWait=false;
  if(open&&bidCount>0){nextTxt='استعرض العروض واختر الأنسب';}
  else if(open){nextTxt='ننتظر وصول أول عرض';nextWait=true;}
  else if(prog){nextTxt='العمل جارٍ — تابع أو أكمل عند الانتهاء';}
  else if(rev){nextTxt='قيد المراجعة';nextWait=true;}
  else if(done){nextTxt='مكتمل — لا تنسَ تقييم المزود';}

  var h='<div class="hzp" onclick="openDetail('+r.id+',event)">'
    +'<div class="hzp-ic '+icCls+'">'+catSvg(r.category,26)+'</div>'
    +'<div class="hzp-body">'
      +'<div class="hzp-title">'+esc(r.title)+'</div>'
      +'<div class="hzp-meta">'
        +(r.category?'<span class="hzp-cat">'+esc(r.category)+'</span>':'')
        +(r.city?'<span>'+esc(r.city)+'</span>':'')
        +(r.budget_max?'<span>'+fmtN(r.budget_max)+' ر.س</span>':'')
        +'<span'+(open&&bidCount>0?' class="hzp-bidsN"':'')+'>'+bidCount+' '+(bidCount===1?'عرض':'عروض')+'</span>'
        +'<span>'+timeAgo(r.created_at)+'</span>'
      +'</div>'
      +(nextTxt?'<div class="hzp-next'+(nextWait?' wait':'')+'">'+(nextWait?clock:bolt)+'<span>'+esc(nextTxt)+'</span></div>':'')
      +'<div class="hzp-qbadge" data-qid="'+r.id+'" style="display:none"></div>'
    +'</div>'
    +'<div class="hzp-side">'
      +stTag(r.status)
      +(actions&&(open||rev)?'<div class="hzp-acts">'
        +(open?'<button class="ri-icon-btn" title="تعديل" onclick="openEditReq('+r.id+',event)"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg></button>':'')
        +'<button class="ri-icon-btn danger" title="حذف" onclick="deleteReq('+r.id+',event)"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/></svg></button>'
      +'</div>':'')
    +'</div>'
  +'</div>';
  return h;
}

// ═══════════════════════════════════
// LOAD HOME
// ═══════════════════════════════════
function _cliReport(provId,reqId){
  if(!provId)return;
  _cliRptTarget={pid:provId,rid:reqId};
  var reasons=['خدمة غير لائقة','معلومات مضلّلة','سلوك غير مهني','محتوى مخالف','أخرى'];
  var rh=reasons.map(function(r,i){return '<label style="display:flex;align-items:center;gap:8px;padding:9px;border:1px solid #e2e8f0;border-radius:9px;margin-bottom:6px;cursor:pointer;font-size:13px"><input type="radio" name="crpt" value="'+r+'"'+(i===0?' checked':'')+'>'+r+'</label>';}).join('');
  var ov=document.createElement('div');ov.id='cliRptOv';
  ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.5);display:flex;align-items:flex-end;justify-content:center;font-family:Tajawal,sans-serif';
  ov.innerHTML='<div style="background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;padding:20px">'
    +'<div style="width:36px;height:4px;background:#d1d5db;border-radius:2px;margin:0 auto 14px"></div>'
    +'<div style="font-size:15px;font-weight:800;color:#1e293b;margin-bottom:14px">الإبلاغ عن المزوّد</div>'
    +'<div style="font-size:12px;font-weight:700;color:#475569;margin-bottom:8px">سبب البلاغ</div>'+rh
    +'<textarea id="crpt-details" placeholder="تفاصيل إضافية (اختياري)" style="width:100%;padding:10px;border:1.5px solid #e2e8f0;border-radius:10px;font-family:Tajawal;font-size:13px;min-height:70px;margin-top:8px;box-sizing:border-box"></textarea>'
    +'<div style="display:flex;gap:8px;margin-top:14px"><button onclick="_closeCliRpt()" style="padding:11px 18px;border-radius:10px;background:#fff;border:1px solid #e2e8f0;color:#64748b;font-weight:700;font-family:Tajawal;cursor:pointer">إلغاء</button>'
    +'<button id="crpt-send" onclick="_sendCliReport()" style="flex:1;padding:11px;border-radius:10px;background:#dc2626;color:#fff;border:none;font-weight:800;font-family:Tajawal;cursor:pointer">إرسال البلاغ</button></div></div>';
  document.body.appendChild(ov);
  ov.onclick=function(e){if(e.target===ov)_closeCliRpt();};
}
// بلاغ صاحب المشروع على عرض → يختفي من قائمته ويروح لمراقبة العروض
var _BREP=[['spam','📋','عرض عشوائي أو منسوخ','ما قرأ مشروعي — نص عام أو فيه فراغات'],['scope','🧭','خارج التخصص','ما يشتغل في نوع الخدمة المطلوبة'],['price','💸','سعر غير منطقي','مبالغ فيه جداً أو غير واقعي'],['abuse','⚠️','إساءة أو إزعاج','كلام غير لائق أو رسائل متكررة']];
function _bidRep(bidId,reqId){
  var ov=document.createElement('div');ov.id='bidRepOv';
  ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.5);display:flex;align-items:flex-end;justify-content:center;font-family:Tajawal,sans-serif';
  ov.innerHTML='<div role="dialog" aria-label="بلاغ عن عرض" style="background:#fff;border-radius:20px 20px 0 0;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;padding:20px;box-sizing:border-box">'
    +'<div style="width:36px;height:4px;background:#d1d5db;border-radius:2px;margin:0 auto 14px"></div>'
    +'<div style="font-size:15.5px;font-weight:800;color:#1e293b">العرض غير مناسب؟</div><div style="font-size:12.5px;color:#64748b;font-weight:600;margin:3px 0 12px">اختر السبب — نخفيه من قائمتك ونراجعه</div>'
    +_BREP.map(function(r){return '<label style="display:flex;align-items:center;gap:10px;padding:11px;border:1.5px solid #e2e8f0;border-radius:12px;margin-bottom:7px;cursor:pointer"><input type="radio" name="brep" value="'+r[0]+'" style="accent-color:#b91c1c;width:18px;height:18px"><span style="font-size:17px">'+r[1]+'</span><span style="flex:1;font-size:13.5px;font-weight:800;color:#1e293b">'+r[2]+'<small style="display:block;font-size:11.5px;font-weight:600;color:#64748b;margin-top:2px">'+r[3]+'</small></span></label>';}).join('')
    +'<button id="brep-send" onclick="_bidRepSend('+bidId+','+reqId+')" style="width:100%;margin-top:8px;padding:13px;border-radius:12px;background:#b91c1c;color:#fff;border:none;font-weight:800;font-size:14px;font-family:Tajawal;cursor:pointer">إخفاء العرض وإرسال البلاغ</button>'
    +'<div style="font-size:11.5px;color:#64748b;font-weight:600;text-align:center;margin-top:9px">المزوّد ما يعرف مين بلّغ · تقدر تتراجع وترجّع العرض</div></div>';
  document.body.appendChild(ov);
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
}
function _bidRepSend(bidId,reqId){
  var sel=document.querySelector('input[name="brep"]:checked');
  if(!sel){showToast('اختر السبب','error');return;}
  var btn=document.getElementById('brep-send');if(btn){btn.disabled=true;btn.textContent='...';}
  jFetch('/api/bids/'+bidId+'/report',{method:'POST',body:JSON.stringify({reason:sel.value})})
    .then(function(){var o=document.getElementById('bidRepOv');if(o)o.remove();showToast('أخفينا العرض وشكراً على البلاغ','success');loadBids(reqId);})
    .catch(function(){if(btn){btn.disabled=false;btn.textContent='إخفاء العرض وإرسال البلاغ';}showToast('تعذّر الإرسال','error');});
}
function _bidRepUndo(bidId,reqId){
  jFetch('/api/bids/'+bidId+'/report',{method:'DELETE'})
    .then(function(){showToast('رجّعنا العرض لقائمتك','success');loadBids(reqId);})
    .catch(function(){showToast('تعذّر التراجع','error');});
}
function _closeCliRpt(){var o=document.getElementById('cliRptOv');if(o)o.remove();}
function _sendCliReport(){
  var sel=document.querySelector('input[name="crpt"]:checked');
  if(!sel){showToast('اختر سبباً','error');return;}
  var btn=document.getElementById('crpt-send');if(btn){btn.disabled=true;btn.textContent='جارٍ الإرسال...';}
  var payload={reported_id:_cliRptTarget.pid,type:'user',reason:sel.value};
  var det=(document.getElementById('crpt-details')||{}).value;if(det&&det.trim())payload.details=det.trim();
  if(_cliRptTarget.rid)payload.request_id=_cliRptTarget.rid;
  jFetch('/api/reports',{method:'POST',body:JSON.stringify(payload)})
    .then(function(r){_closeCliRpt();showToast('تم إرسال البلاغ — ستتم المراجعة','success');})
    .catch(function(){if(btn){btn.disabled=false;btn.textContent='إرسال البلاغ';}showToast('تعذّر الإرسال — تحقّق من اتصالك','error');});
}
var _cliRptTarget={};
function loadHome(){
  var el=document.getElementById('home-reqs');
  // اعرض آخر بيانات محفوظة فوراً (سرعة)، ثم حدّث من الخادم
  var cached=_cGet('my_reqs');
  if(cached&&Array.isArray(cached)&&cached.length){ try{_paintHome(cached);}catch(e){ if(el)el.innerHTML=_skCards(3);} }
  else if(el)el.innerHTML=_skCards(3);
  try{_reqDraftNudge();}catch(e){}
  jFetch('/api/requests/my').then(function(all){
    if(!Array.isArray(all)){if(el)el.innerHTML=errH(loadReqs);return;}
    _cSet('my_reqs',all);
    var _sg=all.map(function(r){return r.id+':'+r.status+':'+(r.bid_count||0);}).join(',');
    if(_sg===window._homeSig && cached && cached.length) return;   // لا تغيير → لا إعادة رسم
    window._homeSig=_sg;
    _paintHome(all);
  }).catch(function(){ if(!cached)el&&(el.innerHTML=errH(loadHome)); });
  loadNotifCount();
}
// عرض بيانات الرئيسية (يُستخدم للكاش والخادم)
function _paintHome(all){
  window._allMyReqs=all||[];        // متاح لمعالج النبيه
  var el=document.getElementById('home-reqs');
  var so=document.getElementById('s-open'),sd=document.getElementById('s-done'),sof=document.getElementById('s-offers');
  var openN=all.filter(function(r){return r.status==='open';}).length;
  var doneN=all.filter(function(r){return r.status==='completed'||r.status==='done';}).length;
  var offers=all.reduce(function(a,r){return a+(parseInt(r.bid_count)||0);},0);
  if(so)so.textContent=openN;
  if(sd)sd.textContent=doneN;
  if(sof)sof.textContent=offers;
  var hl=document.getElementById('phHl');
  if(hl)hl.innerHTML='<span class="ph-dot"></span> '+(offers>0?'لديك <b>'+offers+' عرض</b> جديد على طلباتك':'ابدأ بنشر أول طلب واستقبل العروض');
  if(el)el.innerHTML=all.length?all.slice(0,5).map(function(r){return riCard(r,false);}).join(''):emptyReqsH();
  renderNudges(all);
  renderQuestionNudge(all);
  renderBestOffer(all);
}
// شريط النبيهات الذكية — مستنتج من حالة طلبات العميل ورسائله
// تتبّع "العروض المُشاهَدة" — النبيه يختفي بمجرّد الاطّلاع عليها
function _offSeenKey(){ try{ return 'mnq_off_seen_'+(user.id||''); }catch(e){ return 'mnq_off_seen'; } }
function _getOffSeen(){ try{ return JSON.parse(localStorage.getItem(_offSeenKey())||'{}'); }catch(e){ return {}; } }
function _markOffersSeen(all){
  try{
    var s=_getOffSeen();
    (all||[]).forEach(function(r){ if((parseInt(r.bid_count)||0)>0) s[r.id]=parseInt(r.bid_count)||0; });
    localStorage.setItem(_offSeenKey(),JSON.stringify(s));
    var slot=document.getElementById('ph-nudges');
    var n=slot?slot.querySelector('.nudge'):null; // أزل نبيه العروض فوراً
    if(n&&/عرض جديد|عروض جديدة/.test(n.textContent||'')) n.remove();
  }catch(e){}
}
// هل وصل عرض جديد لم يُشاهَد بعد؟ (يقارن العدد الحالي بالمُشاهَد)
function _hasUnseenOffers(r){
  var s=_getOffSeen(); var cur=parseInt(r.bid_count)||0;
  return cur > (parseInt(s[r.id])||0);
}
function renderNudges(all){
  var slot=document.getElementById('ph-nudges');if(!slot)return;
  all=all||[];
  // النبيه يظهر فقط للطلبات التي فيها عروض لم يطّلع عليها بعد
  var openBid=all.filter(function(r){return r.status==='open'&&(parseInt(r.bid_count)||0)>0&&_hasUnseenOffers(r);});
  var totalOffers=openBid.reduce(function(a,r){return a+(parseInt(r.bid_count)||0);},0);
  var inProg=all.filter(function(r){return r.status==='in_progress';});
  var doneR=all.filter(function(r){return r.status==='completed'||r.status==='done';});
  var chev='<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>';
  var reqItems=[];
  if(totalOffers>0){
    reqItems.push('<div class="nudge" style="border-right-color:var(--p)" onclick="_markOffersSeen(window._allMyReqs||[]);show(\'requests\',null,\'requests\')">'
      +'<div class="nudge-ic" style="background:var(--p-light);color:var(--p)"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg></div>'
      +'<div class="nudge-body"><div class="nudge-t">لديك '+totalOffers+' '+(totalOffers===1?'عرض جديد':'عروض جديدة')+'</div><div class="nudge-s">على '+openBid.length+' '+(openBid.length===1?'طلب':'طلبات')+' — راجعها واختر الأنسب</div></div>'
      +'<div class="nudge-cta">عرض '+chev+'</div></div>');
  }
  inProg.slice(0,2).forEach(function(r){
    reqItems.push('<div class="nudge" style="border-right-color:var(--green)" onclick="openDetail('+r.id+',event)">'
      +'<div class="nudge-ic" style="background:var(--green-l);color:var(--green)"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg></div>'
      +'<div class="nudge-body"><div class="nudge-t">أكمل مشروعك</div><div class="nudge-s">'+esc(r.title)+' — اضغط عند انتهاء العمل</div></div>'
      +'<div class="nudge-cta">إكمال '+chev+'</div></div>');
  });
  doneR.slice(0,2).forEach(function(r){
    reqItems.push('<div class="nudge" style="border-right-color:#F0A500" onclick="openDetail('+r.id+',event)">'
      +'<div class="nudge-ic" style="background:var(--gold-l);color:#F0A500"><svg width="18" height="18" fill="#F0A500" stroke="none" viewBox="0 0 24 24"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"/></svg></div>'
      +'<div class="nudge-body"><div class="nudge-t">قيّم المزود</div><div class="nudge-s">'+esc(r.title)+' — شاركنا تجربتك</div></div>'
      +'<div class="nudge-cta">تقييم '+chev+'</div></div>');
  });
  function paint(msgItem){
    var items=(msgItem?[msgItem]:[]).concat(reqItems).slice(0,4);
    slot.innerHTML=items.length
      ?'<div class="nudges-h"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> يحتاج انتباهك</div>'+items.join('')
      :'';
  }
  jFetch('/api/client/conversations').then(function(convs){
    convs=Array.isArray(convs)?convs:[];
    var unread=convs.reduce(function(a,c){return a+(parseInt(c.unread)||0);},0);
    var msgItem=unread>0?('<div class="nudge" style="border-right-color:var(--sky)" onclick="show(\'chat\',null,\'chat\')">'
      +'<div class="nudge-ic" style="background:#e0f2fe;color:var(--sky)"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>'
      +'<div class="nudge-body"><div class="nudge-t">لديك '+unread+' '+(unread===1?'رسالة غير مقروءة':'رسائل غير مقروءة')+'</div><div class="nudge-s">من المزودين — افتح المحادثات للرد</div></div>'
      +'<div class="nudge-cta">المحادثات '+chev+'</div></div>'):null;
    paint(msgItem);
  }).catch(function(){paint(null);});
}
// بطاقة "أفضل عرض على طلبك" — تُستنتج من أحدث طلب له عروض
function _boSeenKey(){ try{ return 'mnq_bo_seen_'+(user.id||''); }catch(e){ return 'mnq_bo_seen'; } }
function _getBOSeen(){ try{ return JSON.parse(localStorage.getItem(_boSeenKey())||'{}'); }catch(e){ return {}; } }
function _markBestOfferSeen(reqId){ try{ var s=_getBOSeen(); s[reqId]=Date.now(); localStorage.setItem(_boSeenKey(),JSON.stringify(s)); var slot=document.getElementById('ph-feat-slot'); if(slot)slot.innerHTML=''; }catch(e){} }
function _isBestOfferSeen(reqId){ var s=_getBOSeen(); return !!s[reqId]; }
function renderBestOffer(all){
  var slot=document.getElementById('ph-feat-slot');if(!slot)return;
  // تجاهل الطلبات التي اطّلع عليها المستخدم (شاف العرض) — البطاقة تختفي بعد المشاهدة
  var withB=(all||[]).filter(function(r){return (parseInt(r.bid_count)||0)>0 && !_isBestOfferSeen(r.id);});
  if(!withB.length){slot.innerHTML='';return;}
  var req=withB[0];
  jFetch('/api/requests/'+req.id+'/bids').then(function(bids){
    if(Array.isArray(bids))bids=bids.filter(function(b){return !b.is_hidden;});
    if(!Array.isArray(bids)||!bids.length){slot.innerHTML='';return;}
    var best=bids.slice().sort(function(a,b){
      var ra=parseFloat(a.provider_rating)||0,rb=parseFloat(b.provider_rating)||0;
      if(rb!==ra)return rb-ra;
      return (parseFloat(a.price)||0)-(parseFloat(b.price)||0);
    })[0];
    var nm=best.provider_business_name||best.provider_name||'مزود';
    var rating=parseFloat(best.provider_rating)||0;
    var reviews=parseInt(best.provider_reviews)||0;
    var stars='';for(var i=1;i<=5;i++){stars+=(i<=Math.round(rating)?'★':'☆');}
    var price=best.price?fmtN(best.price):'—';
    var avHtml=isImg(best.provider_image)?'<img loading="lazy" src="'+esc(_safeUrl(best.provider_image))+'">':esc(nm.charAt(0));
    slot.innerHTML='<div class="ph-feat" style="padding-top:20px" onclick="_markBestOfferSeen('+req.id+');openDetail('+req.id+',event)">'
      +'<span class="ph-fb">أفضل عرض على طلبك</span>'
      +'<div style="font-size:12px;color:var(--muted);font-weight:700;margin:2px 0 11px">'+esc(req.title||'')+(req.city?' — '+esc(req.city):'')+'</div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">'
        +'<div style="display:flex;align-items:center;gap:9px">'
          +'<div class="ph-feat-sq">'+avHtml+'</div>'
          +'<div><div style="font-size:14px;font-weight:800;color:var(--text)">'+esc(nm)+'</div>'
          +'<div style="font-size:12px;margin-top:2px;color:#F0A500">'+stars+' <span style="color:var(--muted)">'+(rating?rating.toFixed(1):'—')+' · '+reviews+' تقييم</span></div></div>'
        +'</div>'
        +'<div style="text-align:left"><div style="font-family:Cairo,sans-serif;font-size:18px;font-weight:900;color:var(--green)">'+price+' <span style="font-size:12px">ر.س</span></div>'+(best.days?'<div style="font-size:11px;color:var(--muted)">خلال '+best.days+' يوم</div>':'')+'</div>'
      +'</div>'
      +'<button class="ph-feat-cta" onclick="event.stopPropagation();_markBestOfferSeen('+req.id+');openDetail('+req.id+',event)">استعرض كل العروض</button>'
    +'</div>';
  }).catch(function(){slot.innerHTML='';});
}

// ═══════════════════════════════════
// LOAD REQUESTS
// ═══════════════════════════════════
function loadReqs(){
  var el=document.getElementById('all-reqs');
  if(el)el.innerHTML=_skCards(5);
  jFetch('/api/requests/my').then(function(all){
    if(!Array.isArray(all)){if(el)el.innerHTML=errH(loadReqs);return;}
    if(el)el.innerHTML=all.length?all.map(function(r){return riCard(r,true);}).join(''):emptyReqsH();
    scanQuestions(all,false);
  }).catch(function(){if(el)el.innerHTML=errH(loadReqs);});
}

// ═══════════════════════════════════
// OPEN DETAIL
// ═══════════════════════════════════
function openDetail(id,e){
  if(e)e.stopPropagation();
  curRequestId=id;
  // اطّلع على الطلب ⇒ عروضه تُعدّ مُشاهَدة (يختفي نبيه "لديك عرض جديد")
  try{
    var r=(window._allMyReqs||[]).filter(function(x){return String(x.id)===String(id);})[0];
    if(r&&(parseInt(r.bid_count)||0)>0){
      var s=_getOffSeen(); s[id]=parseInt(r.bid_count)||0;
      localStorage.setItem(_offSeenKey(),JSON.stringify(s));
    }
  }catch(err){}
  show('detail',null,'detail');
  if(!window._skipHash&&location.hash!=='#detail/'+id){history.replaceState(null,'','#detail/'+id);}
  jFetch('/api/requests/'+id).then(function(req){
    var pin='<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:inline-block;vertical-align:-2px"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';
    var money='<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:inline-block;vertical-align:-2px"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>';
    var cal='<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:inline-block;vertical-align:-2px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    var tag='<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:inline-block;vertical-align:-2px"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
    var h='<div class="req-detail-head">'
      +'<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:12px">'
      +'<div class="rdh-title" style="margin-bottom:0;flex:1">'+esc(req.title)+'</div>'
      +stTag(req.status)
      +'</div>'
      +'<div class="rdh-meta">'
      +(req.category?'<span>'+tag+' '+esc(req.category)+'</span>':'')
      +(req.city?'<span>'+pin+' '+esc(req.city)+'</span>':'')
      +(req.budget_max?'<span>'+money+' '+fmtN(req.budget_max)+' ر.س</span>':'')
      +(req.deadline?'<span>'+cal+' '+fmtDate(req.deadline)+'</span>':'')
      +'</div>'
      +(req.description?'<div class="rdh-desc fmt-text">'+fmtText(req.description)+'</div>':'')
    +'</div>';
    document.getElementById('det-head').innerHTML=h;
  }).catch(function(){
    // المشروع غير موجود أو ليس للعميل → ارجع للرئيسية
    showToast('المشروع غير متاح','error');
    if(location.hash)history.replaceState(null,'','#home');
    show('home',null,'home');
  });
  loadBids(id);
  loadClientQuestions(id);
}

// ═══════════════════════════════════
// LOAD BIDS — النسخة المصلحة
// ═══════════════════════════════════
function loadBids(id){
  var el=document.getElementById('bids-list');
  if(!el)return;
  el.innerHTML='<div class="loading">جاري تحميل العروض...</div>';

  fetch(API+'/api/requests/'+id+'/bids',hdr())
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(bids){
      if(!Array.isArray(bids)){el.innerHTML=errH(function(){loadBids(curRequestId);});return;}
      var _hidN=bids.filter(function(b){return !!b.is_hidden;}).length;
      if(!window._showHidBids)bids=bids.filter(function(b){return !b.is_hidden;});
      document.getElementById('bids-count').textContent=bids.filter(function(b){return !b.is_hidden;}).length;
      var _hb=document.getElementById('bids-hidbar');
      if(!_hb){_hb=document.createElement('div');_hb.id='bids-hidbar';el.parentNode.insertBefore(_hb,el);}
      _hb.innerHTML=_hidN?'<div style="font-size:12.5px;font-weight:700;color:var(--muted);margin:0 2px 10px">'+(_hidN===1?'عرض مخفي واحد':(_hidN===2?'عرضين مخفيين':(_hidN<=10?_hidN+' عروض مخفية':_hidN+' عرضاً مخفياً')))+' · <button onclick="window._showHidBids=!window._showHidBids;loadBids('+id+')" style="border:0;background:none;color:var(--p);font-family:inherit;font-weight:800;font-size:12.5px;cursor:pointer;text-decoration:underline;padding:4px 2px">'+(window._showHidBids?'إخفاء':'إظهار')+'</button></div>':'';
      if(!bids.length){el.innerHTML=emptyH('لا يوجد عروض بعد','سيصلك إشعار عند وصول أول عرض');return;}
      window._currentBids=bids;
      window._curBids=bids;
      // زر مقارنة العروض (يظهر عند وجود عرضين فأكثر)
      var cmpSlot=document.getElementById('bids-compare');
      if(!cmpSlot){
        cmpSlot=document.createElement('div'); cmpSlot.id='bids-compare';
        el.parentNode.insertBefore(cmpSlot,el);
      }
      cmpSlot.innerHTML = bids.length>=2
        ? '<button onclick="_compareBids()" style="width:100%;margin-bottom:11px;padding:11px;background:var(--p-light);color:var(--p);border:1.5px solid var(--p-mid);border-radius:12px;font-family:Tajawal;font-size:13.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>قارن العروض جنباً لجنب</button>'
        : '';

      // الأفضل = أعلى تقييم ثم الأقل سعراً، والأرخص = أقل سعر
      var sorted=bids.slice().sort(function(a,b){var ra=parseFloat(a.provider_rating)||0,rb=parseFloat(b.provider_rating)||0;if(rb!==ra)return rb-ra;return (parseFloat(a.price)||0)-(parseFloat(b.price)||0);});
      var bestId=sorted[0]&&sorted[0].id;
      var minPrice=Math.min.apply(null,bids.map(function(b){return parseFloat(b.price)||Infinity;}));
      var cheapId=null;bids.forEach(function(b){if(cheapId===null&&(parseFloat(b.price)||Infinity)===minPrice)cheapId=b.id;});

      el.innerHTML=bids.map(function(b){
        var isAcc=b.status==='accepted',isRej=b.status==='rejected';
        var isBest=b.id===bestId&&!isRej&&!isAcc&&bids.length>1;
        var isCheap=b.id===cheapId&&bids.length>1&&isFinite(minPrice);
        var rating=parseFloat(b.provider_rating)||0;
        var reviews=parseInt(b.provider_reviews)||0;
        var stars='';for(var i=1;i<=5;i++){stars+=(i<=Math.round(rating)?'★':'☆');}
        var safeProvId=String(b.provider_id||'');
        var safeName=(b.provider_business_name||b.provider_name||'مزود');
        var safeSlug=encodeURIComponent(safeName.replace(/\s+/g,'-'))+'-'+safeProvId;
        var proUrl=safeProvId?'/pro/'+safeSlug+'?id='+safeProvId:'#';
        var verified=(isImg(b.provider_image)&&rating>0&&reviews>0);
        var avHtml=isImg(b.provider_image)?'<img src="'+esc(_safeUrl(b.provider_image))+'" loading="lazy">':esc(safeName.charAt(0));
        var vBadge=verified?'<span class="bid-verif" title="موثّق"><svg width="15" height="15" viewBox="-2 -2 28 28" aria-label="موثّق"><polygon points="12.00,0.60 14.28,3.50 17.70,2.13 18.22,5.78 21.87,6.30 20.50,9.72 23.40,12.00 20.50,14.28 21.87,17.70 18.22,18.22 17.70,21.87 14.28,20.50 12.00,23.40 9.72,20.50 6.30,21.87 5.78,18.22 2.13,17.70 3.50,14.28 0.60,12.00 3.50,9.72 2.13,6.30 5.78,5.78 6.30,2.13 9.72,3.50" fill="#3897f0" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.4 12.4 10.6 15.5 16.7 8.8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>':'';

        var chips='';
        if(isAcc)chips+='<span class="bid-chip acc"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>مقبول</span>';
        else if(isRej)chips+='<span class="bid-chip rej">مرفوض</span>';
        if(isCheap)chips+='<span class="bid-chip cheap"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>أقل سعر</span>';
        if(safeProvId)chips+='<a href="'+esc(proUrl)+'" class="bid-chip prof"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>عرض الملف</a>';
        chips+='<button class="_chatbtn bid-chip chat" data-pid="'+esc(safeProvId)+'"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>محادثة</button>';
        if(safeProvId&&!isAcc&&!isRej)chips+='<button class="bid-chip" onclick="_negotiate('+(parseInt(safeProvId)||0)+','+id+','+_jsa(b.provider_name||'المزوّد')+','+(parseFloat(b.price)||0)+','+b.id+')" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;font-weight:800"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M12 1v22"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>تفاوض</button>';
        if(b.is_hidden)chips+='<button class="bid-chip" onclick="_bidRepUndo('+b.id+','+id+')" style="background:#eef3ff;color:#1d4ed8;border:1px solid #c7d7fe">↺ إرجاع العرض</button>';
        else if(safeProvId)chips+='<button class="bid-chip" onclick="'+(isAcc?'_cliReport('+(parseInt(safeProvId)||0)+','+id+')':'_bidRep('+b.id+','+id+')')+'" style="color:var(--red)"><svg width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>إبلاغ</button>';

        var note=b.note?'<div class="bid-note fmt-text">'+fmtText(b.note)+'</div>':'<div class="bid-note empty">لم يُضف المزود رسالة مع العرض</div>';

        var acts='';
        if(!isAcc&&!isRej){
          acts='<div class="bid-acts">'
            +'<button class="bid-accept" onclick="acceptBid('+b.id+','+id+')">قبول العرض</button>'
            +'<button class="bid-reject" onclick="rejectBid('+b.id+','+id+')">رفض</button>'
            +'</div>';
        }

        return '<div'+(b.is_hidden?' style="opacity:.6;border-style:dashed"':'')+' class="bid-item'+(isAcc?' accepted':'')+(isRej?' rejected':'')+(isBest?' best':'')+'">'
          +(isBest?'<span class="bid-best">الأفضل لك</span>':'')
          +'<div class="bid-top">'
            +'<div class="bid-av">'+avHtml+'</div>'
            +'<div class="bid-id">'
              +'<div class="bid-name">'+esc(safeName)+vBadge+_tierBadge(b.provider_tier)+_pubBadge(b.provider_badge)+_onlineDot(b.provider_last_seen)+'</div>'
              +'<div class="bid-stars">'+stars+'<span class="rn">'+(rating?rating.toFixed(1):'—')+'</span><span class="rc">('+reviews+' تقييم)</span></div>'
              +(b.provider_city?'<div class="bid-city"><svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>'+esc(b.provider_city)+'</div>':'')
            +'</div>'
            +'<div class="bid-price"><div class="pn">'+fmtN(b.price)+'</div><div class="pu">ر.س</div>'+(b.days?'<div class="pd">خلال '+b.days+' يوم</div>':'')+'</div>'
          +'</div>'
          +'<div class="bid-chips">'+chips+'</div>'
          +'<div class="bid-note-h">رسالة المزود</div>'+note
          +acts
        +'</div>';
      }).join('');

      el.querySelectorAll('._chatbtn').forEach(function(btn){
        btn.addEventListener('click',function(){
          var pid=btn.getAttribute('data-pid');if(!pid)return;
          // المحادثة على نفس المشروع المعروض → افتحها مباشرة
          if(curRequestId){ location.href='/chat?req='+curRequestId+'&with='+pid; return; }
          fetch(API+'/api/direct-message',Object.assign({method:'POST',body:JSON.stringify({provider_id:pid})},hdr()))
            .then(function(r){return r.json();})
            .then(function(d){ if(d.request_id)location.href='/chat?req='+d.request_id+'&with='+pid; })
            .catch(function(){showToast('تعذّر فتح المحادثة — حاول مجدداً','error');});
        });
      });
    })
    .catch(function(e){
      el.innerHTML='<div style="padding:30px;text-align:center"><div style="color:var(--red);font-size:13px;margin-bottom:12px">تعذر تحميل العروض</div>'
        +'<button onclick="loadBids('+id+')" style="padding:9px 18px;background:var(--p);color:#fff;border:none;border-radius:9px;font-family:Tajawal;font-size:13px;font-weight:700;cursor:pointer">إعادة المحاولة</button></div>';
    });
}

// ═══════════════════════════════════
// BID ACTIONS
// ═══════════════════════════════════
function acceptBid(bidId,reqId){
  if(window._acceptingBid)return;              // حماية من الضغط المزدوج
  if(!confirm('هل تؤكد قبول هذا العرض؟'))return;
  window._acceptingBid=true;
  showToast('جاري القبول...','info');
  fetch(API+'/api/bids/'+bidId+'/accept',Object.assign({method:'PUT'},hdr()))
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(){showToast('تم قبول العرض','success');loadBids(reqId);loadHome();})
    .catch(function(){showToast('تعذّر القبول — تحقّق من اتصالك','error');})
    .finally(function(){window._acceptingBid=false;});
}
function rejectBid(bidId,reqId){
  if(!confirm('هل تؤكد رفض هذا العرض؟'))return;
  fetch(API+'/api/bids/'+bidId+'/reject',Object.assign({method:'PUT'},hdr()))
    .then(function(r){ return r.json().catch(function(){return {};}).then(function(d){ if(!r.ok){var e=new Error(d.message||'');e.srv=1;throw e;} return d; }); })
    .then(function(){showToast('تم الرفض','success');loadBids(reqId);})
    .catch(function(err){showToast((err&&err.srv&&err.message)?err.message:'تعذّر الرفض — تحقّق من اتصالك','error');});
}

// ═══════════════════════════════════
// LOAD ACTIONS / TIMELINE
// ═══════════════════════════════════
function loadActions(id){
  var el=document.getElementById('actions-wrap');if(!el)return;
  el.innerHTML='<div class="loading">جاري التحميل...</div>';
  fetch(API+'/api/requests/'+id,hdr()).then(function(r){return r.json();}).then(function(req){
    var h='';
    var check='<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" style="display:inline-block;vertical-align:-2px"><polyline points="20 6 9 17 4 12"/></svg>';
    var star='<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="display:inline-block;vertical-align:-2px"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"/></svg>';
    if(req.status==='in_progress'){
      var _asked=!!req.confirm_requested_at;
      if(_asked){
        // النظام طلب التأكيد — بطاقة واضحة بزرّين
        h='<div class="card" style="border:2px solid var(--p);background:var(--p-l)"><div class="ch"><h3>هل تمّ تنفيذ مشروعك؟</h3></div>'
          +'<p style="font-size:12.5px;color:var(--muted);margin-bottom:14px;line-height:1.7">أكّد حالة مشروعك. إن لم ترد، سيُعتبر منتهياً تلقائياً — وتقدر تعترض باختيار «لم يتم بعد».</p>'
          +'<button class="btn-sm bs-g" onclick="markDone('+id+')" style="width:100%;padding:14px;margin-bottom:9px">'+check+' نعم، تم التنفيذ</button>'
          +'<button class="btn-sm" onclick="markNotDone('+id+')" style="width:100%;padding:12px;background:#fff;border:1px solid var(--border);color:var(--muted)">لم يتم بعد</button></div>';
      } else {
        h='<div class="card"><div class="ch"><h3>إجراءات الطلب</h3></div>'
          +'<p style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.7">عند انتهاء المزود من العمل، اضغط لإكمال الطلب ثم يمكنك تقييمه.</p>'
          +'<button class="btn-sm bs-g" onclick="markDone('+id+')" style="width:100%;padding:13px">'+check+' تم الإنجاز — أكمل الطلب</button></div>';
      }
    } else if(req.status==='completed'||req.status==='done'){
      // مكتمل: أظهر زر التقييم
      h='<div class="card"><div class="ch"><h3>إجراءات الطلب</h3></div>'
        +'<div style="text-align:center;padding:10px 0 16px"><div style="display:inline-flex;align-items:center;gap:6px;color:var(--green);font-size:14px;font-weight:800">'+check+' الطلب مكتمل</div></div>'
        +'<button class="btn-sm bs-p" id="rate-action-btn" onclick="openRate('+id+')" style="width:100%;padding:13px;background:var(--p);color:#fff;margin-bottom:9px">'+star+' تقييم المزود</button>'
        +'<button class="btn-sm" onclick="shareAchievement('+id+')" style="width:100%;padding:12px;background:var(--white);border:1px solid var(--border);color:var(--text2);font-weight:800"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px;margin-left:5px"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>شارك تجربتك</button></div>';
      // تحقق إذا قيّم مسبقاً
      fetch(API+'/api/requests/'+id+'/my-review',hdr()).then(function(r){return r.ok?r.json():null;}).then(function(rv){
        var btn=document.getElementById('rate-action-btn');
        if(rv&&rv.id&&btn){btn.outerHTML='<div style="text-align:center;padding:12px;background:var(--green-l);border-radius:10px;color:var(--green);font-size:13px;font-weight:700">'+check+' تم تقييم المزود</div>';}
      }).catch(function(){});
    } else if(req.status==='closed_auto'||req.status==='cancelled'||req.status==='expired'){
      h='<div class="card"><div class="ch"><h3>إجراءات الطلب</h3></div>'
        +'<div style="text-align:center;padding:8px 0 14px"><div style="display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:13px;font-weight:700">هذا الطلب مُغلق</div></div>'
        +'<p style="font-size:12px;color:var(--muted);margin-bottom:12px;line-height:1.7;text-align:center">تقدر تعيد نشره ليظهر للمزوّدين من جديد وتستقبل عروضاً.</p>'
        +'<button class="btn-sm bs-p" onclick="repostReq('+id+')" style="width:100%;padding:13px;background:var(--p);color:#fff"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px;margin-left:5px"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>إعادة نشر الطلب</button></div>';
    } else {
      h='<div class="card"><p style="text-align:center;font-size:13px;color:var(--muted);padding:10px">انتظر العروض ثم اقبل العرض المناسب</p></div>';
    }
    el.innerHTML=h||emptyH('لا يوجد إجراءات','');
  }).catch(function(){if(el)el.innerHTML=errH(function(){loadActions(curRequestId);});});
}
function loadTimeline(id){
  var el=document.getElementById('timeline-list');if(!el)return;
  el.innerHTML='<div class="loading">جاري التحميل...</div>';
  fetch(API+'/api/requests/'+id+'/timeline',hdr())
    .then(function(r){
      if(!r.ok){el.innerHTML=emptyH('لا توجد أنشطة مسجّلة','');return null;}
      return r.json();
    })
    .then(function(events){
      if(!events)return;
      if(!Array.isArray(events)||!events.length){el.innerHTML=emptyH('لا توجد أنشطة','');return;}
      el.innerHTML='<div style="padding:8px">'
        +events.map(function(ev){return'<div style="display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">'
          +'<div style="width:8px;height:8px;border-radius:50%;background:var(--sky);flex-shrink:0;margin-top:5px"></div>'
          +'<div><div style="font-size:13px;font-weight:700;color:var(--text)">'+esc(ev.description||ev.action||'نشاط')+'</div>'
          +'<div style="font-size:10px;color:var(--hint);margin-top:2px">'+timeAgo(ev.created_at)+'</div></div></div>';}).join('')
        +'</div>';
    })
    .catch(function(){el.innerHTML=emptyH('لا توجد أنشطة','');});
}
function shareAchievement(id){
  var msg='✅ أنجزت مشروعي عبر منصة مناقصة بأفضل سعر!\nانشر طلبك واستقبل عروضاً من عدة مزودين واختر الأنسب:\nhttps://www.manaqasa.com';
  if(navigator.share){navigator.share({title:'مناقصة',text:msg,url:'https://www.manaqasa.com'}).catch(function(){});}
  else if(navigator.clipboard){navigator.clipboard.writeText(msg).then(function(){showToast('تم نسخ رسالة المشاركة','success');});}
}
function repostReq(id){
  if(!confirm('إعادة نشر هذا الطلب ليستقبل عروضاً جديدة؟'))return;
  fetch(API+'/api/requests/'+id+'/repost',Object.assign({method:'PUT'},hdr()))
    .then(function(r){return r.json();})
    .then(function(d){ if(d&&d.ok){showToast('تم إعادة نشر الطلب','success');loadActions(id);loadHome();if(window.track)track('StartPost');} else showToast((d&&d.message)||'تعذر إعادة النشر','error'); })
    .catch(function(){showToast('تعذّر الاتصال بالخادم — تحقّق من الإنترنت','error');});
}
function markNotDone(id){
  fetch(API+'/api/requests/'+id+'/not-done',Object.assign({method:'PUT'},hdr()))
    .then(function(r){return r.json();})
    .then(function(d){ if(d&&d.ok){showToast('تم — سنذكّرك لاحقاً','success');loadActions(id);loadHome();} else showToast((d&&d.message)||'تعذر التحديث','error'); })
    .catch(function(){showToast('تعذّر التحديث — تحقّق من اتصالك','error');});
}
function markDone(id){
  if(!confirm('هل تؤكد إتمام هذا الطلب؟'))return;
  // بدون مسار بديل: إذا رفض الخادم نعرض رسالته وما نقول "تم"
  fetch(API+'/api/requests/'+id+'/complete',Object.assign({method:'PUT'},hdr()))
    .then(function(r){ return r.json().catch(function(){return {};}).then(function(d){ if(!r.ok){var e=new Error(d.message||'');e.srv=1;throw e;} return d; }); })
    .then(function(){showToast('تم تحديث حالة الطلب','success');loadBids(id);loadActions(id);loadHome();})
    .catch(function(err){showToast((err&&err.srv&&err.message)?err.message:'تعذّر التحديث — تحقّق من اتصالك','error');});
}
function openRate(reqId){
  var bids=window._currentBids||[];
  var ab=bids.find(function(b){return b.status==='accepted';});
  if(!ab)ab=bids[0]; // fallback to first bid
  if(ab){selProviderId=ab.provider_id||ab.user_id;selRequestId=reqId;}
  // اعرض اسم وصورة المزود
  var pv=document.getElementById('rate-provider');
  if(pv&&ab){
    var pname=ab.provider_business_name||ab.provider_name||'المزود';
    var pimg=ab.provider_image;
    var avHtml=isImg(pimg)
      ?'<div style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:3px solid var(--sky)"><img loading="lazy" src="'+esc(_safeUrl(pimg))+'" style="width:100%;height:100%;object-fit:cover"></div>'
      :'<div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:900;border:3px solid var(--sky)">'+esc(pname.charAt(0))+'</div>';
    pv.innerHTML=avHtml+'<div style="text-align:center"><div style="font-size:16px;font-weight:900;color:var(--text)">'+esc(pname)+'</div><div style="font-size:12px;color:var(--muted)">كيف كانت تجربتك معه؟</div></div>';
  } else if(pv){ pv.innerHTML=''; }
  selRating=0;
  document.querySelectorAll('.sp').forEach(function(s){s.className='sp';});
  var _rl=document.getElementById('rate-label');if(_rl){_rl.textContent='';}
  document.getElementById('rate-comment').value='';
  document.getElementById('rate-msg').className='alert';
  document.getElementById('rateOverlay').className='overlay show';
}

// ═══════════════════════════════════
// NEW REQUEST
// ═══════════════════════════════════
var _reqImages=[];
function toggleExtra(){
  var f=document.getElementById('extra-fields'),t=document.getElementById('extraToggle');
  if(!f)return;
  var hidden=(f.style.display==='none'||f.style.display==='');
  f.style.display=hidden?'block':'none';
  if(t)t.classList.toggle('open',hidden);
}
// «تقصد: …؟» — يقترح تخصص من قائمتنا لما العميل يكتب في «أخرى»
var _CAT_SYN=[['مصعد','تركيب وصيانة مصاعد'],['مصاعد','تركيب وصيانة مصاعد'],['اسانسير','تركيب وصيانة مصاعد'],['مكيف','تبريد وتكييف'],['تكييف','تبريد وتكييف'],['تبريد','تبريد وتكييف'],['دهان','دهانات وديكور'],['بويه','دهانات وديكور'],['ديكور','دهانات وديكور'],['كهرب','كهرباء'],['سباك','سباكة'],['تسرب','كشف تسربات المياه'],['تسريب','كشف تسربات المياه'],['خزان','تنظيف خزانات'],['حشرات','مكافحة حشرات'],['نمل','مكافحة حشرات'],['صراصير','مكافحة حشرات'],['عفش','نقل عفش'],['كاميرا','كاميرات مراقبة'],['كاميرات','كاميرات مراقبة'],['انترنت','شبكات وإنترنت'],['شبكه','شبكات وإنترنت'],['مظل','مظلات وسواتر'],['ساتر','مظلات وسواتر'],['سواتر','مظلات وسواتر'],['عزل','عزل حراري'],['عازل','عوازل مائية'],['مسبح','مسابح'],['مطبخ','تركيب مطابخ'],['مطابخ','تركيب مطابخ'],['حديقه','تنسيق حدائق'],['حدائق','تنسيق حدائق'],['عشب','تنسيق حدائق'],['زجاج','زجاج ومرايا'],['مرايا','زجاج ومرايا'],['بلاط','بلاط ورخام'],['رخام','بلاط ورخام'],['سيراميك','بلاط ورخام'],['باركيه','أرضيات خشبية وباركيه'],['سجاد','تنظيف سجاد وكنب'],['كنب','تنظيف سجاد وكنب'],['بوابه','أبواب وبوابات أوتوماتيكية'],['ابواب','أبواب وبوابات أوتوماتيكية'],['باب','أبواب وبوابات أوتوماتيكية'],['ترميم','ترميم مبانٍ'],['واجهه','كلادينج وواجهات'],['واجهات','كلادينج وواجهات'],['كلادينج','كلادينج وواجهات'],['بير','حفر آبار ومضخات'],['ابار','حفر آبار ومضخات'],['مضخه','حفر آبار ومضخات'],['غطاس','حفر آبار ومضخات'],['حريق','أنظمة الحريق والسلامة'],['شمسي','أنظمة شمسية'],['شمسيه','أنظمة شمسية'],['هنجر','إنشاءات معدنية وهناجر'],['هناجر','إنشاءات معدنية وهناجر'],['مستودع','إنشاءات معدنية وهناجر'],['اسفلت','أعمال الطرق والأسفلت'],['سفلته','أعمال الطرق والأسفلت'],['بياره','صرف صحي وبيارات'],['صرف','صرف صحي وبيارات'],['ايبوكسي','أرضيات إيبوكسي'],['تحليه','تحلية ومعالجة مياه'],['فلتر','تحلية ومعالجة مياه'],['تشطيب','تشطيبات ومقاولات عامة'],['مقاول','تشطيبات ومقاولات عامة'],['هندسي','مكاتب هندسية'],['مخطط','مكاتب هندسية'],['تصميم','تصاميم داخلي وخارجي'],['المنيوم','ألمنيوم'],['نوافذ','ألمنيوم'],['شبابيك','ألمنيوم'],['حداد','حدادة'],['نجار','نجارة'],['خشب','نجارة'],['جبس','جبس'],['بناء','بناء'],['عظم','بناء'],['ملحق','بناء'],['شيول','معدات ثقيلة'],['رافعه','معدات ثقيلة'],['كرين','معدات ثقيلة'],['تنظيف','تنظيف'],['صيانه','صيانة عامة'],['اثاث','تركيب أثاث'],['مواقف','تخطيط المواقف والسلامة المرورية']];
function _catNorm(t){return String(t||'').replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase();}
function _catSug(){
  var inp=document.getElementById('n-cat-other'),box=document.getElementById('n-cat-sug'),sel=document.getElementById('n-cat');
  if(!inp||!box||!sel)return;
  var t=_catNorm(inp.value); if(t.replace(/\s/g,'').length<3){box.innerHTML='';return;}
  var have={}; [].forEach.call(sel.options,function(o){var v=o.value||o.text; if(v&&v!=='أخرى')have[v]=1;});
  var out=[];
  var add=function(c){ if(have[c]&&out.indexOf(c)<0)out.push(c); };
  _CAT_SYN.forEach(function(p){ if(t.indexOf(_catNorm(p[0]))>=0)add(p[1]); });
  var _stop={'تركيب':1,'وصيانه':1,'صيانه':1,'اعمال':1,'انظمه':1,'عامه':1,'ومقاولات':1,'مقاولات':1,'والسلامه':1,'السلامه':1,'المروريه':1,'ومعالجه':1,'مياه':1,'المياه':1,'المباني':1,'داخلي':1,'وخارجي':1};
  Object.keys(have).forEach(function(c){ _catNorm(c).split(/\s+/).forEach(function(w){ w=w.replace(/^و/,''); if(w.length>=4&&!_stop[w]&&!_stop['و'+w]&&t.indexOf(w.replace(/^ال/,''))>=0)add(c); }); });
  out=out.slice(0,3);
  box.innerHTML=out.length?'<div style="margin-top:8px;font-size:13px;font-weight:800;color:#1e3a8a">تقصد:</div><div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:6px">'+out.map(function(c){return '<button type="button" onclick="_catPick(this.getAttribute(\'data-c\'))" data-c="'+esc(c)+'" style="border:1.5px solid #93c5fd;background:#eff6ff;color:#1d4ed8;border-radius:999px;padding:8px 14px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer">'+esc(c)+' ✓</button>';}).join('')+'</div><div style="font-size:11.5px;color:#64748b;margin-top:6px">اختيار تخصص من القائمة يوصّل مشروعك للمزوّدين المختصين مباشرة</div>':'';
}
function _catPick(c){
  var sel=document.getElementById('n-cat'); if(!sel)return;
  sel.value=c; sel.dispatchEvent(new Event('change'));
  var box=document.getElementById('n-cat-sug'); if(box)box.innerHTML='';
  try{ (typeof showToast==='function'?showToast:(typeof toast==='function'?toast:function(){}))('تم اختيار «'+c+'» ✓','success'); }catch(e){}
}
function checkOther(){document.getElementById('other-wrap').style.display=document.getElementById('n-cat').value==='أخرى'?'block':'none';}
function fillCitySelect(sel){
  if(!sel||sel.children.length>1)return;
  var regions=[
    {n:'منطقة الرياض',c:['الرياض','الخرج','الدوادمي','المجمعة','القويعية','الزلفي','الدرعية','الدلم','المزاحمية','الحريق','حوطة بني تميم','وادي الدواسر','السليل','الأفلاج','الغاط','ثادق','حريملاء','مرات','ضرما','شقراء','عفيف','ضرماء','رماح']},
    {n:'منطقة مكة المكرمة',c:['جدة','مكة المكرمة','الطائف','رابغ','القنفذة','الليث','خليص','تربة','المويه','الخرمة','رنية','الجموم','الكامل','أضم','بحرة']},
    {n:'منطقة المدينة المنورة',c:['المدينة المنورة','ينبع','العلا','الوجه','ضباء','أملج','المهد','بدر','خيبر','مهد الذهب','الحناكية','العيص']},
    {n:'منطقة القصيم',c:['بريدة','عنيزة','الرس','البكيرية','الأسياح','رياض الخبراء','النبهانية','الشماسية','البدائع','المذنب','عيون الجواء','ضرية','عقلة الصقور','الخبراء']},
    {n:'المنطقة الشرقية',c:['الدمام','الخبر','الظهران','الأحساء','القطيف','الجبيل','حفر الباطن','الخفجي','بقيق','النعيرية','رأس تنورة','صفوى','سيهات','قرية العليا','العوامية']},
    {n:'منطقة عسير',c:['أبها','خميس مشيط','بيشة','النماص','محايل عسير','أحد رفيدة','ظهران الجنوب','تثليث','بلقرن','رجال ألمع','المجاردة','سراة عبيدة','تنومة','الحرجة','قيال']},
    {n:'منطقة تبوك',c:['تبوك','تيماء','حقل','ضباء','الوجه','أملج','البدع']},
    {n:'منطقة حائل',c:['حائل','بقعاء','الشنان','الغزالة','السليمي','موقق','الشملي']},
    {n:'منطقة الحدود الشمالية',c:['عرعر','طريف','رفحاء','العويقيلة']},
    {n:'منطقة الجوف',c:['سكاكا','دومة الجندل','القريات','طبرجل','صوير']},
    {n:'منطقة الباحة',c:['الباحة','بلجرشي','المندق','العقيق','قلوة','المخواة','القرى','غامد الزناد']},
    {n:'منطقة جازان',c:['جازان','صبيا','أبو عريش','صامطة','الدرب','ضمد','الريث','الحرث','أحد المسارحة','بيش','فيفاء','العارضة']},
    {n:'منطقة نجران',c:['نجران','شرورة','حبونا','بدر الجنوب','يدمة','ثار']}
  ];
  sel.innerHTML='<option value="">— اختر المدينة —</option>';
  regions.forEach(function(reg){
    var grp=document.createElement('optgroup');grp.label=reg.n;
    reg.c.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;grp.appendChild(o);});
    sel.appendChild(grp);
  });
}
function previewImages(input){
  var files=[].slice.call(input.files).slice(0,3-_reqImages.length);
  files.forEach(function(f){
    if(f.size>10*1024*1024){showToast('الحجم الأقصى 10MB','error');return;}
    compressImage(f,function(dataUrl){_reqImages.push({name:f.name,data:dataUrl});renderImgGrid();});
  });
  input.value='';
}
// ضغط الصورة تلقائياً (يصغّرها لتسريع الرفع وتوفير الاستهلاك)
function compressImage(file,cb){
  if(!/^image\//.test(file.type)){ var rr=new FileReader();rr.onload=function(e){cb(e.target.result);};rr.readAsDataURL(file);return; }
  var r=new FileReader();
  r.onload=function(e){
    var img=new Image();
    img.onload=function(){
      var max=1280, w=img.width, h=img.height;
      if(w>max||h>max){ if(w>h){h=Math.round(h*max/w);w=max;}else{w=Math.round(w*max/h);h=max;} }
      var c=document.createElement('canvas');c.width=w;c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      try{ cb(c.toDataURL('image/jpeg',0.8)); }catch(err){ cb(e.target.result); }
    };
    img.onerror=function(){cb(e.target.result);};
    img.src=e.target.result;
  };
  r.readAsDataURL(file);
}
function renderImgGrid(){
  var g=document.getElementById('img-grid');if(!g)return;
  g.innerHTML=_reqImages.map(function(img,i){return'<div style="position:relative;border-radius:9px;overflow:hidden;aspect-ratio:1"><img loading="lazy" src="'+img.data+'" style="width:100%;height:100%;object-fit:cover"><button onclick="removeReqImg('+i+')" style="position:absolute;top:4px;left:4px;width:22px;height:22px;border-radius:50%;background:rgba(220,38,38,.85);border:none;color:#fff;font-size:13px;cursor:pointer"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';}).join('');
}
function removeReqImg(i){_reqImages.splice(i,1);renderImgGrid();}
var _reqFiles=[];
window._geoLat=null; window._geoLng=null;
function _parseMapLoc(){
  var v=(document.getElementById('n-maploc')||{}).value||'';
  var m=v.match(/(-?\d{1,2}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})/);
  var ok=document.getElementById('maploc-ok');
  if(m){ var la=parseFloat(m[1]), ln=parseFloat(m[2]); if(la>=-90&&la<=90&&ln>=-180&&ln<=180){ window._geoLat=la; window._geoLng=ln; if(ok)ok.style.display='block'; return; } }
  window._geoLat=null; window._geoLng=null; if(ok)ok.style.display='none';
}
function useMyLocation(){
  if(!navigator.geolocation){showToast('المتصفح لا يدعم تحديد الموقع','error');return;}
  showToast('جارٍ تحديد موقعك...','info');
  navigator.geolocation.getCurrentPosition(function(pos){
    window._geoLat=pos.coords.latitude; window._geoLng=pos.coords.longitude;
    var inp=document.getElementById('n-maploc'); if(inp)inp.value='https://www.google.com/maps?q='+window._geoLat+','+window._geoLng;
    var ok=document.getElementById('maploc-ok'); if(ok)ok.style.display='block';
    showToast('تم تحديد موقعك ✓','success');
  }, function(){ showToast('تعذّر تحديد الموقع — تأكد من إذن الموقع','error'); }, {enableHighAccuracy:true,timeout:10000});
}
function previewFiles(input){
  var files=[].slice.call(input.files).slice(0,3-_reqFiles.length);
  files.forEach(function(f){
    if(!/\.(pdf|dwg|dxf|xlsx|xls|docx|doc|zip|csv)$/i.test(f.name)){showToast('صيغة غير مدعومة (PDF/DWG/Excel/Word/ZIP)','error');return;}
    if(f.size>30*1024*1024){showToast('الحجم الأقصى 30MB','error');return;}
    var r=new FileReader();
    r.onload=function(e){_reqFiles.push({name:f.name,data:e.target.result});renderFileList();};
    r.readAsDataURL(f);
  });
  input.value='';
}
function renderFileList(){
  var g=document.getElementById('file-list');if(!g)return;
  g.innerHTML=_reqFiles.map(function(f,i){return'<div style="display:flex;align-items:center;gap:8px;padding:8px 11px;background:#fef2f2;border:1px solid #fecaca;border-radius:9px;font-size:12.5px"><span style="font-size:16px">📄</span><span style="flex:1;min-width:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(f.name)+'</span><button onclick="removeReqFile('+i+')" style="width:22px;height:22px;border-radius:50%;background:rgba(220,38,38,.85);border:none;color:#fff;cursor:pointer;flex-shrink:0"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';}).join('');
}
function removeReqFile(i){_reqFiles.splice(i,1);renderFileList();}
function _reqDraftGet(){try{return JSON.parse(localStorage.getItem('nreq_draft')||'null');}catch(e){return null;}}
function _saveReqDraft(){
  try{
    var d={t:(document.getElementById('n-title')||{}).value||'',
           d:(document.getElementById('n-desc')||{}).value||'',
           c:(document.getElementById('n-cat')||{}).value||'',
           city:(document.getElementById('n-city')||{}).value||'', ts:Date.now()};
    if(d.t.trim()||d.d.trim()) localStorage.setItem('nreq_draft',JSON.stringify(d));
  }catch(e){}
}
function _restoreReqDraft(){
  var d=_reqDraftGet();if(!d)return;
  var t=document.getElementById('n-title'),ds=document.getElementById('n-desc'),c=document.getElementById('n-cat'),ci=document.getElementById('n-city');
  if(t&&!t.value&&d.t)t.value=d.t;
  if(ds&&!ds.value&&d.d)ds.value=d.d;
  try{if(c&&d.c){c.value=d.c;if(typeof checkOther==='function')checkOther();}}catch(e){}
  try{if(ci&&d.city)ci.value=d.city;}catch(e){}
}
function _bindReqDraft(){
  ['n-title','n-desc','n-cat','n-city'].forEach(function(id){
    var el=document.getElementById(id);
    if(el&&!el._draftBound){el._draftBound=true;el.addEventListener('input',_saveReqDraft);el.addEventListener('change',_saveReqDraft);}
  });
}
function _clearReqDraft(){try{localStorage.removeItem('nreq_draft');}catch(e){}}
function _reqDraftNudge(){
  var d=_reqDraftGet();if(!d||!(d.t||'').trim())return;
  var host=document.getElementById('page-home');if(!host)return;
  if(document.getElementById('draftNudge'))return;
  var el=document.createElement('div');el.id='draftNudge';
  el.style.cssText='background:linear-gradient(135deg,#eff6ff,#e0edff);border:1px solid #bfdbfe;border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap';
  el.innerHTML='<div style="flex:1;min-width:160px"><div style="font-weight:800;color:#1e3a8a;font-size:14px;margin-bottom:2px">لديك طلب لم يكتمل ✍️</div>'
    +'<div style="font-size:12px;color:#64748b">"'+String(d.t).replace(/</g,"&lt;").slice(0,40)+'" — أكمل نشره لتصلك العروض</div></div>'
    +'<div style="display:flex;gap:8px"><button onclick="show(\'new\',null,\'new\')" style="background:#1d4ed8;color:#fff;border:none;padding:9px 16px;border-radius:9px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:Tajawal">أكمل الطلب</button>'
    +'<button onclick="_clearReqDraft();var n=document.getElementById(\'draftNudge\');if(n)n.remove();" style="background:transparent;border:none;color:#94a3b8;font-size:12px;cursor:pointer;font-family:Tajawal">تجاهل</button></div>';
  host.insertBefore(el, host.firstChild);
}
var _reqTemplates=[
  {label:'تركيب مكيف',cat:'تبريد وتكييف',title:'تركيب مكيف سبليت',desc:'- نوع المكيف: سبليت\n- عدد الوحدات: \n- الدور/الموقع: \n- توفّر نقطة كهرباء: '},
  {label:'صيانة مكيف',cat:'تبريد وتكييف',title:'صيانة وتنظيف مكيفات',desc:'- عدد المكيفات: \n- نوعها: \n- المشكلة (إن وجدت): '},
  {label:'نقل عفش',cat:'نقل عفش',title:'نقل أثاث منزل',desc:'- من حي: \n- إلى حي: \n- عدد الغرف: \n- يحتاج فك وتركيب: \n- الدور ووجود مصعد: '},
  {label:'تسليك مجاري',cat:'سباكة',title:'تسليك وإصلاح سباكة',desc:'- المشكلة: \n- الموقع (مطبخ/حمام): \n- منذ متى: '},
  {label:'أعمال كهرباء',cat:'كهرباء',title:'أعمال كهربائية',desc:'- المطلوب: \n- عدد النقاط: \n- الموقع: '},
  {label:'تنظيف منزل',cat:'تنظيف',title:'تنظيف منزل شامل',desc:'- عدد الغرف: \n- المساحة تقريباً: \n- تنظيف عادي/بالبخار: '},
  {label:'كاميرات مراقبة',cat:'كاميرات مراقبة',title:'تركيب كاميرات مراقبة',desc:'- عدد الكاميرات: \n- داخلية/خارجية: \n- الموقع: '},
  {label:'مظلات وسواتر',cat:'مظلات وسواتر',title:'تركيب مظلات/سواتر',desc:'- النوع: \n- المساحة (طول×عرض): \n- الموقع: '}
];
function _renderReqTemplates(){
  var box=document.getElementById('req-templates');if(!box||box._filled)return;box._filled=true;
  box.innerHTML=_reqTemplates.map(function(t,i){
    return '<button type="button" onclick="_applyTemplate('+i+')" style="background:var(--p-l,#eff6ff);color:var(--p,#1d4ed8);border:1px solid #bfdbfe;border-radius:20px;padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">'+t.label+'</button>';
  }).join('');
}
function _applyTemplate(i){
  var t=_reqTemplates[i];if(!t)return;
  var cat=document.getElementById('n-cat');
  if(cat){var found=false;for(var j=0;j<cat.options.length;j++){if(cat.options[j].value===t.cat||cat.options[j].text===t.cat){cat.selectedIndex=j;found=true;break;}}if(typeof checkOther==='function')checkOther();}
  var ti=document.getElementById('n-title');if(ti&&!ti.value.trim())ti.value=t.title;
  var d=document.getElementById('n-desc');if(d&&!d.value.trim())d.value=t.desc;
  if(typeof _saveReqDraft==='function')_saveReqDraft();
  showToast('تم تعبئة القالب — أكمل التفاصيل','success');
}
var _reqGeo={lat:null,lng:null};
function pickMyLocation(){
  var btn=document.getElementById('n-loc-btn'), hint=document.getElementById('n-loc-hint');
  if(!navigator.geolocation){ showToast('متصفحك لا يدعم تحديد الموقع','error'); return; }
  if(btn){btn.textContent='\u23F3';btn.disabled=true;}
  navigator.geolocation.getCurrentPosition(function(pos){
    _reqGeo.lat=pos.coords.latitude; _reqGeo.lng=pos.coords.longitude;
    if(btn){btn.textContent='\u2705';btn.disabled=false;}
    if(hint)hint.innerHTML='<span style="color:var(--green);font-weight:700">\u2713 تم تحديد موقعك</span> \u2014 لن يظهر إلا للمزوّد الذي تقبل عرضه';
    showToast('تم تحديد موقعك \u2713','success');
  },function(){
    if(btn){btn.textContent='\uD83D\uDCCD';btn.disabled=false;}
    showToast('تعذّر تحديد الموقع \u2014 تأكّد من السماح للمتصفح','error');
  },{enableHighAccuracy:true,timeout:10000});
}
function submitReq(){
  var cat=document.getElementById('n-cat').value;
  var catOther=cat==='أخرى'?document.getElementById('n-cat-other').value.trim():'';
  var title=(document.getElementById('n-title').value||'').trim();
  var desc=(document.getElementById('n-desc').value||'').trim();
  var city=document.getElementById('n-city').value;
  var budget=document.getElementById('n-budget').value;
  var deadline=document.getElementById('n-deadline').value;
  var msg=document.getElementById('new-msg');
  var cityErr=document.getElementById('city-err');
  var err='';
  if(!title)err='يرجى كتابة عنوان الطلب';
  else if(!cat){err='حدّد التخصص — اضغط «اختر التخصص» تحت العنوان';try{var _cb=document.getElementById('n-catbox');if(_cb){_cb.scrollIntoView({behavior:'smooth',block:'center'});_cb.style.outline='2px solid #dc2626';_cb.style.borderRadius='14px';setTimeout(function(){_cb.style.outline='';},2500);}}catch(e){}}
  else if(!desc)err='يرجى كتابة تفاصيل الطلب';
  else if(!city){err='يرجى اختيار المدينة';document.getElementById('n-city').style.borderColor='var(--red)';if(cityErr)cityErr.style.display='block';}
  if(err){if(msg){msg.textContent=err;msg.className='alert err';}return;}
  if(cityErr)cityErr.style.display='none';
  document.getElementById('n-city').style.borderColor='';
  // افتح اتفاقية الرسوم قبل النشر
  var ac=document.getElementById('agreeCheck');if(ac){ac.checked=false;}
  var ab=document.getElementById('agreeBtn');if(ab){ab.disabled=true;}
  document.getElementById('agreeOverlay').className='overlay show';
}

function closeAgree(){
  document.getElementById('agreeOverlay').className='overlay';
}

function acceptAgree(){
  closeAgree();
  var cat=document.getElementById('n-cat').value;
  var catOther=cat==='أخرى'?document.getElementById('n-cat-other').value.trim():'';
  var title=(document.getElementById('n-title').value||'').trim();
  var desc=(document.getElementById('n-desc').value||'').trim();
  var city=document.getElementById('n-city').value;
  var budget=document.getElementById('n-budget').value;
  var deadline=document.getElementById('n-deadline').value;
  var msg=document.getElementById('new-msg');
  var btn=document.getElementById('submitBtn');if(btn){btn.disabled=true;btn.textContent='جاري النشر...';}
  var body={title:title,description:desc,category:cat,city:city}; if(catOther)body.category_other=catOther; try{ if(window._cpExtras){ var _ex=_cpExtras(); if(_ex.length)body.extra_categories=_ex; } }catch(e){}
  var _cd=(document.getElementById('n-closedur')||{}).value; if(_cd)body.close_days=parseInt(_cd);
  if(window._geoLat!=null&&window._geoLng!=null){body.geo_lat=window._geoLat;body.geo_lng=window._geoLng;}
  var _d=(document.getElementById('n-district')||{}).value||''; if(_d.trim())body.district=_d.trim();
  if(_reqGeo.lat&&_reqGeo.lng){ body.geo_lat=_reqGeo.lat; body.geo_lng=_reqGeo.lng; }
  if(budget)body.budget_max=Number(budget);
  if(deadline)body.deadline=deadline;
  if(_reqImages.length)body.images=_reqImages.map(function(i){return i.data;});
  if(_reqFiles.length)body.attachments=_reqFiles.map(function(f){return {name:f.name,data:f.data};});
  fetch(API+'/api/requests',Object.assign({method:'POST',body:JSON.stringify(body)},hdr()))
    .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
    .then(function(r){
      if(r&&r.id){
        _reqImages=[];renderImgGrid();
        _reqFiles=[];renderFileList();
        ['n-cat','n-title','n-desc','n-budget','n-deadline','n-district'].forEach(function(id){var el=document.getElementById(id);if(el)el.value='';});if(window._cpReset)_cpReset();
        if(msg)msg.className='alert';
        showToast('تم نشر الطلب','success');
        if(window.track)track('Lead');
        _clearReqDraft();
        loadHome();loadReqs();show('requests',null,'requests');
      }else{if(msg){msg.textContent=r.message||'حدث خطأ';msg.className='alert err';}}
    })
    .catch(function(e){if(msg){msg.textContent=''+e.message;msg.className='alert err';}})
    .finally(function(){if(btn){btn.disabled=false;btn.textContent='نشر الطلب';}});
}

// ═══════════════════════════════════
// EDIT REQUEST
// ═══════════════════════════════════
var _editReqId=null;
function openEditReq(id,e){
  if(e)e.stopPropagation();_editReqId=id;
  jFetch('/api/requests/'+id).then(function(req){
    document.getElementById('e-title').value=req.title||'';
    document.getElementById('e-desc').value=req.description||'';
    document.getElementById('e-budget').value=req.budget_max||'';
    document.getElementById('e-deadline').value=req.deadline?req.deadline.substring(0,10):'';
    document.getElementById('edit-msg').className='alert';
    document.getElementById('editReqOverlay').className='overlay show';
  }).catch(function(){showToast('تعذّر تحميل الطلب — حدّث الصفحة','error');});
}
function closeEditReq(){document.getElementById('editReqOverlay').className='overlay';}
function submitEditReq(){
  var title=document.getElementById('e-title').value.trim();
  var desc=document.getElementById('e-desc').value.trim();
  if(!title||!desc){var e=document.getElementById('edit-msg');e.textContent='العنوان والتفاصيل مطلوبة';e.className='alert err';return;}
  var btn=document.getElementById('edit-btn');btn.disabled=true;btn.textContent='جاري الحفظ...';
  var body={title:title,description:desc,budget_max:parseInt(document.getElementById('e-budget').value||0)||null,deadline:document.getElementById('e-deadline').value||null};
  fetch(API+'/api/requests/'+_editReqId,Object.assign({method:'PUT',body:JSON.stringify(body)},hdr()))
    .then(function(r){return r.json();})
    .then(function(r){btn.disabled=false;btn.textContent='حفظ التعديلات';if(r.id){closeEditReq();showToast('تم التحديث','success');loadReqs();loadHome();}else{var e=document.getElementById('edit-msg');e.textContent=r.message||'حدث خطأ';e.className='alert err';}})
    .catch(function(){btn.disabled=false;btn.textContent='حفظ التعديلات';showToast('تعذّر التحديث — تحقّق من اتصالك','error');});
}
function deleteReq(id,e){
  if(e)e.stopPropagation();
  if(!confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟'))return;
  fetch(API+'/api/requests/'+id,Object.assign({method:'DELETE'},hdr()))
    .then(function(r){return r.json();})
    .then(function(r){if(r.ok||r.id){showToast('تم الحذف','success');loadReqs();loadHome();}else showToast(r.message||'تعذر الحذف','error');})
    .catch(function(){showToast('تعذّر الحذف — تحقّق من اتصالك','error');});
}
function openImgFull(src){var v=document.getElementById('imgViewer'),i=document.getElementById('imgViewerImg');if(v&&i){i.src=src;v.style.display='flex';}}

// ═══════════════════════════════════
// RATE
// ═══════════════════════════════════
var selRating=0,selProviderId=null,selRequestId=null;
var _rateLabels={1:['سيئ','#DC2626'],2:['مقبول','#D97706'],3:['جيد','#D97706'],4:['جيد جداً','#16A34A'],5:['ممتاز','#16A34A']};
function paintStars(n){document.querySelectorAll('.sp').forEach(function(s,i){s.className='sp'+(i<n?' on':'');});}
function setStar(n){selRating=n;paintStars(n);var lb=document.getElementById('rate-label');if(lb&&_rateLabels[n]){lb.textContent=_rateLabels[n][0];lb.style.color=_rateLabels[n][1];}}
function hoverStar(n){if(n===0){paintStars(selRating);var lb=document.getElementById('rate-label');if(lb&&selRating&&_rateLabels[selRating]){lb.textContent=_rateLabels[selRating][0];lb.style.color=_rateLabels[selRating][1];}else if(lb){lb.textContent='';}return;}paintStars(n);var lb2=document.getElementById('rate-label');if(lb2&&_rateLabels[n]){lb2.textContent=_rateLabels[n][0];lb2.style.color=_rateLabels[n][1];}}
function submitRate(){
  if(!selRating){showToast('اختر تقييماً','error');return;}
  var comment=document.getElementById('rate-comment').value.trim();
  fetch(API+'/api/reviews',Object.assign({method:'POST',body:JSON.stringify({request_id:selRequestId,reviewed_id:selProviderId,rating:selRating,comment:comment})},hdr()))
    .then(function(r){return r.json();})
    .then(function(r){
      if(r.id){document.getElementById('rateOverlay').className='overlay';showToast('شكراً على تقييمك','success');}
      else{var e=document.getElementById('rate-msg');e.textContent=r.message||'حدث خطأ';e.className='alert err';}
    }).catch(function(){showToast('تعذّر إرسال التقييم — تحقّق من اتصالك','error');});
}

// ═══════════════════════════════════
// PROFILE
// ═══════════════════════════════════
function loadProfile(){
  jFetch('/api/client/profile').then(function(p){
    if(!p)return;
    if(isImg(p.profile_image)){localStorage.setItem('client_avatar_'+user.id,p.profile_image);applyAvatar(p.profile_image);}
    document.getElementById('prof-name').value=p.name||'';
    document.getElementById('prof-phone').value=p.phone||'';
    var emEl=document.getElementById('prof-email');if(emEl)emEl.value=p.email||'';
    var ctEl=document.getElementById('prof-city');if(ctEl){if(!ctEl.options.length)fillCitySelect(ctEl);ctEl.value=p.city||'';}
    document.getElementById('profNameDisp').textContent=p.name||'—';
  }).catch(function(){});
  updatePushToggleUI();
}
function uploadClientAvatar(input){
  var f=input.files[0];if(!f)return;
  if(f.size>5*1024*1024){showToast('الحجم الأقصى 5MB','error');return;}
  var r=new FileReader();
  r.onload=function(e){
    var img=e.target.result;
    applyAvatar(img);
    localStorage.setItem('client_avatar_'+user.id,img);
    fetch(API+'/api/client/profile',Object.assign({method:'PUT',body:JSON.stringify({profile_image:img})},hdr()))
      .then(function(r){if(!r.ok)throw new Error();return r.json();})
      .then(function(){showToast('تم تحديث الصورة','success');})
      .catch(function(){showToast('تعذر حفظ الصورة','error');});
  };
  r.readAsDataURL(f);
}
function saveClientProfile(btn){
  var name=(document.getElementById('prof-name').value||'').trim();
  var phone=(document.getElementById('prof-phone').value||'').trim();
  var email=(document.getElementById('prof-email').value||'').trim();
  var cityEl=document.getElementById('prof-city');var city=cityEl?cityEl.value:'';
  if(!name){showToast('الاسم مطلوب','error');return;}
  if(email&&(!email.includes('@')||!email.includes('.'))){showToast('بريد إلكتروني غير صحيح','error');return;}
  if(btn){btn.disabled=true;btn.textContent='جاري الحفظ...';}
  fetch(API+'/api/client/profile',Object.assign({method:'PUT',body:JSON.stringify({name:name,phone:phone,email:email,city:city})},hdr()))
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(p){
      showToast('تم الحفظ','success');
      if(p&&p.name){user.name=p.name;localStorage.setItem('user',JSON.stringify(user));document.getElementById('userName').textContent=p.name;document.getElementById('profNameDisp').textContent=p.name;}
    })
    .catch(function(){showToast('تعذّر الحفظ — تحقّق من اتصالك','error');})
    .finally(function(){if(btn){btn.disabled=false;btn.textContent='حفظ التغييرات';}});
}
function changeClientPw(){
  var oldEl=document.getElementById('old-pw');
  var oldPw=oldEl?(oldEl.value||''):'';
  var pw=(document.getElementById('new-pw').value||'').trim();
  if(!oldPw){showToast('اكتب كلمة المرور الحالية','error');return;}
  if(pw.length<6){showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل','error');return;}
  // المسار الصحيح لتغيير كلمة المرور (يتحقق من الحالية)
  fetch(API+'/api/auth/change-password',Object.assign({method:'PUT',body:JSON.stringify({old_password:oldPw,new_password:pw})},hdr()))
    .then(function(r){ return r.json().catch(function(){return {};}).then(function(d){ if(!r.ok){var e=new Error(d.message||'');e.srv=1;throw e;} return d; }); })
    .then(function(){showToast('تم تغيير كلمة المرور','success');document.getElementById('new-pw').value='';if(oldEl)oldEl.value='';})
    .catch(function(err){showToast((err&&err.srv&&err.message)?err.message:'تعذّر التغيير — تحقّق من اتصالك','error');});
}

// ═══════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════
function urlBase64ToUint8Array(b){var p='='.repeat((4-b.length%4)%4),s=(b+p).replace(/-/g,'+').replace(/_/g,'/'),d=window.atob(s),o=new Uint8Array(d.length);for(var i=0;i<d.length;i++)o[i]=d.charCodeAt(i);return o;}
async function isPushActive(){if(!('serviceWorker' in navigator&&'PushManager' in window))return false;try{var r=await navigator.serviceWorker.ready;var sub=await r.pushManager.getSubscription();return!!sub;}catch(e){return false;}}
async function updatePushToggleUI(){
  // نقرأ حالة الإذن فقط — طلب الإذن يكون من ضغطة المستخدم (togglePush)
  try{
    if(!('serviceWorker' in navigator&&'PushManager' in window))return;
    if(!('Notification' in window))return;
    var active=await isPushActive();
    if(active)return; // مشترك بالفعل
    if(Notification.permission==='granted'){await pushSubscribe();return;}
  }catch(e){}
}
async function togglePush(){
  if(!('serviceWorker' in navigator&&'PushManager' in window)){showToast('جهازك لا يدعم إشعارات المتصفح','error');return;}
  var active=await isPushActive();
  if(active){await pushUnsubscribe();}
  else{
    if('Notification' in window&&Notification.permission==='denied'){
      var hint=document.getElementById('push-hint');
      if(hint){hint.style.display='block';hint.textContent='الإشعارات محظورة من إعدادات المتصفح. فعّلها من إعدادات الموقع في متصفحك ثم أعد المحاولة.';}
      showToast('الإشعارات محظورة من المتصفح','error');return;
    }
    await pushSubscribe();
  }
}
async function pushSubscribe(){
  try{
    var r=await navigator.serviceWorker.ready;
    var vk=await jFetch('/api/push/vapid-public-key').then(function(d){return d.publicKey||d.key;}).catch(function(){return null;});
    if(!vk){showToast('الإشعارات غير مفعّلة في هذه البيئة','error');return;}
    var sub=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(vk)});
    await fetch(API+'/api/push/subscribe',Object.assign({method:'POST',body:JSON.stringify({subscription:sub,platform:'web'})},hdr()));
    showToast('تم تفعيل الإشعارات','success');updatePushToggleUI();
  }catch(e){showToast('تعذر تفعيل الإشعارات','error');}
}
async function pushUnsubscribe(){
  try{var r=await navigator.serviceWorker.ready;var sub=await r.pushManager.getSubscription();if(sub)await sub.unsubscribe();showToast('تم إيقاف الإشعارات','success');updatePushToggleUI();}catch(e){}
}

// ═══════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════
function loadNotifCount(){
  fetch(API+'/api/notifications',hdr()).then(function(r){return r.ok?r.json():[];}).then(function(d){
    var arr=Array.isArray(d)?d:[];
    var cnt=arr.filter(function(n){return!n.is_read;}).length;
    ['notifBadge','mob-notif-badge'].forEach(function(id){var el=document.getElementById(id);if(el){el.textContent=cnt;el.style.display=cnt?'flex':'none';}});
  }).catch(function(){});
  jFetch('/api/client/conversations').then(function(convs){
    var cnt=Array.isArray(convs)?convs.reduce(function(s,c){return s+(parseInt(c.unread)||0);},0):0;
    ['chatBadge','bn-chat-badge'].forEach(function(id){var el=document.getElementById(id);if(el){el.textContent=cnt;el.style.display=cnt?'flex':'none';}});
  }).catch(function(){});
}
function notifMeta(type){
  var bell='<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';
  var m={
    new_bid:{bg:'var(--p-light)',c:'var(--p)',ic:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>'},
    bid_accepted:{bg:'var(--green-l)',c:'var(--green)',ic:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'},
    message:{bg:'#e0f2fe',c:'var(--sky)',ic:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>'},
    review:{bg:'var(--gold-l)',c:'#F0A500',ic:'<svg width="18" height="18" fill="#F0A500" stroke="none" viewBox="0 0 24 24"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"/></svg>'}
  };
  return m[type]||{bg:'var(--p-light)',c:'var(--p)',ic:bell};
}
function loadNotifs(){
  var el=document.getElementById('notifs-list');if(!el)return;
  el.innerHTML='<div class="loading">جاري التحميل...</div>';
  fetch(API+'/api/notifications',hdr()).then(function(r){return r.ok?r.json():[];}).then(function(ns){
    var notifs=Array.isArray(ns)?ns:(ns&&ns.data)?ns.data:[];
    if(!notifs.length){el.innerHTML=emptyH('لا توجد إشعارات بعد','نعلمك هنا عند وصول عرض أو رسالة أو تحديث على طلبك');return;}
    el.innerHTML=notifs.map(function(n){
      var mt=notifMeta(n.type);
      return'<div class="notif-item'+(n.is_read?'':' unread')+'" id="notif-'+n.id+'">'
        +'<div class="notif-ic" style="background:'+mt.bg+';color:'+mt.c+'" onclick="notifOpen('+n.id+','+(n.ref_id||'null')+')">'+mt.ic+'</div>'
        +'<div style="flex:1;min-width:0;cursor:pointer" onclick="notifOpen('+n.id+','+(n.ref_id||'null')+')"><div style="font-size:13px;font-weight:800;margin-bottom:2px;color:var(--text)">'+esc(n.title||'')+'</div>'
        +'<div style="font-size:11.5px;color:var(--muted);line-height:1.6">'+esc(n.body||'')+'</div>'
        +'<div style="font-size:10px;color:var(--hint);margin-top:3px">'+timeAgo(n.created_at)+'</div></div>'
        +(n.is_read?'':'<div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0;align-self:center"><button onclick="event.stopPropagation();notifMarkOne('+n.id+')" title="تعليم كمقروء" style="background:var(--green-l);color:var(--green);border:none;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">✓</button><button onclick="event.stopPropagation();notifSnooze('+n.id+')" title="تأجيل" style="background:var(--bg);color:var(--muted);border:1px solid var(--border);width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center">⏰</button></div>')
      +'</div>';
    }).join('');
  }).catch(function(){if(el)el.innerHTML=errH(loadNotifs);});
}
// فتح الإشعار (يعلّمه مقروءاً ويروح للتفاصيل)
function notifOpen(id,refId){
  notifMarkOne(id,true);
  if(refId){openDetail(refId,null);show('detail',null,'detail');}
}
// تعليم إشعار واحد كمقروء (بدون فتح)
function notifMarkOne(id,silent){
  var el=document.getElementById('notif-'+id); if(el)el.classList.remove('unread');
  var btns=el?el.querySelector('div[style*="flex-direction:column"]'):null; if(btns)btns.remove();
  fetch(API+'/api/notifications/'+id+'/read',Object.assign({method:'PUT'},hdr())).catch(function(){});
  _notifRecount();
  if(!silent&&typeof showToast==='function')showToast('تم ✓','success');
}
// تأجيل إشعار (يخفيه من القائمة لهذه الجلسة فقط، يرجع عند التحديث)
function notifSnooze(id){
  var el=document.getElementById('notif-'+id);
  if(el){ el.style.transition='opacity .25s,transform .25s'; el.style.opacity='0'; el.style.transform='translateX(-20px)'; setTimeout(function(){if(el)el.style.display='none';},260); }
  if(typeof showToast==='function')showToast('تم التأجيل — يظهر لاحقاً','success');
}
// إعادة حساب الشارة بعد تعليم مقروء
function _notifRecount(){
  var unread=document.querySelectorAll('.notif-item.unread').length;
  ['notifBadge','mob-notif-badge'].forEach(function(bid){var b=document.getElementById(bid);if(b){if(unread>0){b.textContent=unread;b.style.display='flex';}else{b.style.display='none';}}});
}
function markAllRead(){
  fetch(API+'/api/notifications/read',Object.assign({method:'PUT'},hdr())).then(function(){
    document.querySelectorAll('.notif-item').forEach(function(el){el.classList.remove('unread');});
    ['notifBadge','mob-notif-badge'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display='none';});
    showToast('تم تحديد الكل كمقروء','success');
  }).catch(function(){});
}
function deleteAllNotifs(){
  if(!confirm('حذف كل الإشعارات نهائياً؟'))return;
  fetch(API+'/api/notifications',Object.assign({method:'DELETE'},hdr())).then(function(r){
    if(!r.ok)throw new Error();
    var el=document.getElementById('notifs-list'); if(el)el.innerHTML=emptyH('لا توجد إشعارات','نعلمك هنا عند وصول عرض أو رسالة أو تحديث على طلبك');
    ['notifBadge','mob-notif-badge'].forEach(function(id){var b=document.getElementById(id);if(b)b.style.display='none';});
    showToast('تم حذف كل الإشعارات','success');
  }).catch(function(){showToast('تعذّر الحذف، حاول مجدداً','error');});
}

// ═══════════════════════════════════
// CHAT
// ═══════════════════════════════════
var _chatReqId=null,_chatWith=null,_chatMsgs=[],_chatPoll=null;
function goChatHome(){show('home',null,'home');}
function loadChatPage(){
  var el=document.getElementById('chat-container');if(!el)return;
  if(window._openChatReqId){
    var _rid=window._openChatReqId,_pid=window._openChatPid,_nm=window._openChatName;
    window._openChatReqId=null;window._openChatPid=null;window._openChatName=null;
    // اجلب بيانات المحادثة لمعرفة اسم المزود
    fetch(API+'/api/client/conversations',hdr()).then(function(r){return r.ok?r.json():[];}).then(function(convs){
      convs=Array.isArray(convs)?convs:(convs&&convs.data)?convs.data:[];
      var cv=convs.find(function(x){return String(x.request_id||x.id)===String(_rid);});
      if(cv){openChat(cv.request_id||cv.id,cv.provider_id,cv.provider_name||_nm,cv.request_title||'محادثة');}
      else{openChat(_rid,_pid,_nm||'مزود','محادثة');}
    }).catch(function(){openChat(_rid,_pid,_nm||'مزود','محادثة');});
    return;
  }
  el.innerHTML='<div class="loading">جاري التحميل...</div>';
  fetch(API+'/api/client/conversations',hdr()).then(function(r){return r.ok?r.json():[];}).then(function(convs){
    var convs=Array.isArray(convs)?convs:(convs&&convs.data)?convs.data:[];
    if(!convs.length){
      el.innerHTML='<button onclick="goChatHome()" class="chat-home-back" style="display:none;background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:7px 12px;font-family:Tajawal;font-size:12px;font-weight:700;cursor:pointer;align-items:center;gap:4px;color:var(--text);margin-bottom:12px"><svg width=\"12\" height=\"12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" viewBox=\"0 0 24 24\" style=\"display:inline-block\"><polyline points=\"15 18 9 12 15 6\"/></svg> الرئيسية</button><div class="card card-accent"><div class="ch"><h3>المحادثات</h3></div>'+newChatBtnHtml()+emptyH('لا توجد محادثات','ستظهر محادثاتك مع المزودين هنا')+'</div>';
      bindNewChatBtn();
      return;
    }
    var h='<button onclick="goChatHome()" class="chat-home-back" style="display:none;background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:7px 12px;font-family:Tajawal;font-size:12px;font-weight:700;cursor:pointer;align-items:center;gap:4px;color:var(--text);margin-bottom:12px"><svg width=\"12\" height=\"12\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.5\" viewBox=\"0 0 24 24\" style=\"display:inline-block\"><polyline points=\"15 18 9 12 15 6\"/></svg> الرئيسية</button><div class="card card-accent"><div class="ch"><h3>المحادثات</h3></div>'+newChatBtnHtml()+'<div style="background:var(--white);border:1px solid var(--border);border-radius:14px">';
    convs.forEach(function(cv){
      var name=cv.provider_name||'مزود';
      var avHtml=isImg(cv.provider_image)?'<img loading="lazy" src="'+esc(_safeUrl(cv.provider_image))+'" style="width:100%;height:100%;object-fit:cover">':esc(name[0]);
      h+='<div style="display:flex;align-items:center;gap:12px;padding:14px;border-bottom:1px solid var(--border);cursor:pointer;transition:.15s'+(cv.unread>0?';background:var(--p-light)':'')+'" onmouseover="this.style.background=\'var(--bg)\'" onmouseout="this.style.background=\''+(cv.unread>0?'var(--p-light)':'var(--white)')+'\'" onclick=\'location.href="/chat?req='+cv.request_id+'&with='+cv.provider_id+'"\'>'
        +'<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--sky));color:#fff;font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden">'+avHtml+'</div>'
        +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:13px;font-weight:800;margin-bottom:2px">'+esc(name)+'</div>'
          +'<div style="font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(cv.request_title||'')+'</div>'
          +(cv.last_message?'<div style="font-size:11px;color:var(--hint);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(cv.last_message)+'</div>':'')
        +'</div>'
        +'<div style="text-align:center;flex-shrink:0">'
          +(cv.unread>0?'<div style="background:var(--red);color:#fff;font-size:10px;font-weight:900;width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 3px">'+cv.unread+'</div>':'')
          +'<div style="font-size:10px;color:var(--hint)">'+timeAgo(cv.last_time)+'</div>'
        +'</div>'
      +'</div>';
    });
    h+='</div></div>';
    el.innerHTML=h;
    bindNewChatBtn();
  }).catch(function(){if(el)el.innerHTML='<div class="card card-accent"><div class="ch"><h3>المحادثات</h3></div>'+errH(loadChatPage)+'</div>';});
}

function newChatBtnHtml(){
  return '<button id="cl-new-chat" style="width:100%;padding:13px;background:var(--p);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:Tajawal,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>محادثة جديدة مع مزود</button>';
}

function bindNewChatBtn(){
  var btn=document.getElementById('cl-new-chat');
  if(btn)btn.onclick=openClientChatSearch;
}

function openClientChatSearch(){
  var ov=document.createElement('div');
  ov.id='clChatSearchOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:600;display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)';
  ov.innerHTML='<div style="background:#fff;border-radius:16px;width:100%;max-width:440px;overflow:hidden;max-height:80vh;display:flex;flex-direction:column">'
    +'<div style="background:linear-gradient(135deg,var(--p3),var(--p));padding:16px 20px;display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid var(--sky)"><span style="font-size:15px;font-weight:900;color:#fff">محادثة جديدة</span><button onclick="document.getElementById(\'clChatSearchOv\').remove()" style="background:rgba(255,255,255,.1);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:16px">\u2715</button></div>'
    +'<div style="padding:16px"><input id="cl-chat-inp" placeholder="ابحث باسم المزود..." style="width:100%;padding:11px 13px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:Tajawal,sans-serif;outline:none;background:var(--bg)"><div id="cl-chat-res" style="max-height:300px;overflow-y:auto;margin-top:12px"></div></div>'
    +'</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click',function(e){if(e.target===ov)ov.remove();});
  var inp=document.getElementById('cl-chat-inp');var res=document.getElementById('cl-chat-res');
  inp.focus();var timer=null;
  inp.addEventListener('input',function(){
    clearTimeout(timer);timer=setTimeout(function(){
      var q=inp.value.trim();if(!q){res.innerHTML='';return;}
      res.innerHTML='<div style="padding:12px;text-align:center;color:var(--muted);font-size:12px">جاري البحث...</div>';
      jFetch('/api/users/search?q='+encodeURIComponent(q)).then(function(users){
        if(!users||!users.length){res.innerHTML='<div style="padding:12px;text-align:center;color:var(--muted);font-size:12px">لا توجد نتائج</div>';return;}
        var h='';
        users.forEach(function(u){
          var av=isImg(u.profile_image)?'<img loading="lazy" src="'+esc(_safeUrl(u.profile_image))+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':esc((u.name||'م')[0]);
          h+='<div style="display:flex;align-items:center;gap:10px;padding:10px;border-bottom:1px solid var(--border)">'
            +'<div style="width:38px;height:38px;border-radius:50%;background:var(--p);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;flex-shrink:0;overflow:hidden">'+av+'</div>'
            +'<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800">'+esc(u.business_name||u.name||'مزود')+'</div><div style="font-size:11px;color:var(--muted)">'+esc(u.city||'')+'</div></div>'
            +'<button data-uid="'+(parseInt(u.id)||0)+'" style="padding:7px 14px;background:var(--p);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">محادثة</button>'
            +'</div>';
        });
        res.innerHTML=h;
        res.querySelectorAll('button[data-uid]').forEach(function(btn){
          btn.onclick=function(){
            var uid=btn.getAttribute('data-uid');
            var pname=btn.parentNode.querySelector('div div').textContent||'مزود';
            jFetch('/api/direct-message',{method:'POST',body:JSON.stringify({provider_id:parseInt(uid)})}).then(function(d){
              var ovEl=document.getElementById('clChatSearchOv');if(ovEl)ovEl.remove();
              if(d&&d.request_id){showToast('تم فتح المحادثة','success');gotoMessagesAndOpen(d.request_id,parseInt(uid),pname);}
              else{showToast('تعذّر فتح المحادثة — حاول مجدداً','error');}
            }).catch(function(){showToast('تعذّر فتح المحادثة — حاول مجدداً','error');});
          };
        });
      }).catch(function(){res.innerHTML='<div style="padding:12px;text-align:center;color:var(--red);font-size:12px">تعذر البحث</div>';});
    },400);
  });
}
// ── ضبط المحادثة مع كيبورد الجوّال (الحل الصحيح لـ iOS Safari) ──
// visualViewport هي الوسيلة الوحيدة لمعرفة ارتفاع الكيبورد فعلياً؛ CSS وحده لا يكفي
var _kbBound=false;
function _bindKeyboardFix(){
  if(!window.visualViewport)return;
  var vv=window.visualViewport;
  function apply(){
    var pg=document.getElementById('page-chat');
    if(!pg||!pg.classList.contains('on'))return;
    // ثبّت الطبقة أعلى الشاشة، واجعل ارتفاعها = المساحة المرئية فعلياً (فوق الكيبورد)
    pg.style.position='fixed';
    pg.style.top='0px';
    pg.style.left='0px';
    pg.style.right='0px';
    pg.style.bottom='auto';
    pg.style.height=vv.height+'px';
    // امنع الصفحة من الانزلاق تحت الكيبورد (iOS يزحزح النافذة أحياناً)
    if(window.scrollY!==0){ window.scrollTo(0,0); }
    var m=document.getElementById('chatMsgs'); if(m)m.scrollTop=m.scrollHeight;
  }
  window._kbApply=apply;                 // متاح للاستدعاء عند كل فتح محادثة
  if(!_kbBound){                          // اربط المستمعات مرة واحدة فقط
    _kbBound=true;
    vv.addEventListener('resize',apply);
    vv.addEventListener('scroll',apply);
    document.addEventListener('focusin',function(e){
      if(e.target&&(e.target.id==='chatInp')){
        [80,200,400,700].forEach(function(t){setTimeout(apply,t);});
        [250,500,800].forEach(function(t){
          setTimeout(function(){
            try{ e.target.scrollIntoView({block:'end',behavior:'smooth'}); }catch(err){}
            var m=document.getElementById('chatMsgs'); if(m)m.scrollTop=m.scrollHeight;
          },t);
        });
      }
    });
    document.addEventListener('focusout',function(){ [80,250].forEach(function(t){setTimeout(apply,t);}); });
  }
  // اضبط فوراً عند فتح المحادثة (يمنع الفراغ قبل ظهور الكيبورد)
  [0,50,150,350].forEach(function(t){setTimeout(apply,t);});
}
// ── التفاوض على العرض: اتصال · واتساب · محادثة ──
// مؤشّر النشاط: متصل الآن / نشط قريباً
function _onlineDot(lastSeen){
  if(!lastSeen)return '';
  var mins=(Date.now()-new Date(lastSeen).getTime())/60000;
  if(mins<5) return '<span title="متصل الآن" style="display:inline-flex;align-items:center;gap:3px;background:#dcfce7;color:#16a34a;font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:20px;margin-inline-start:5px"><span style="width:6px;height:6px;border-radius:50%;background:#16a34a;display:inline-block"></span>متصل</span>';
  if(mins<60) return '<span style="font-size:9.5px;color:var(--muted);font-weight:700;margin-inline-start:5px">نشط قبل '+Math.floor(mins)+' د</span>';
  if(mins<1440) return '<span style="font-size:9.5px;color:var(--hint);font-weight:700;margin-inline-start:5px">نشط قبل '+Math.floor(mins/60)+' س</span>';
  return '';
}
// ── مقارنة العروض جنباً لجنب ──
function _compareBids(){
  var list=(window._curBids||[]).filter(function(b){return b.status!=='rejected';});
  if(list.length<2){ showToast('تحتاج عرضين على الأقل للمقارنة','error'); return; }
  var minP=Math.min.apply(null,list.map(function(b){return parseFloat(b.price)||Infinity;}));
  var minD=Math.min.apply(null,list.map(function(b){return parseInt(b.days)||Infinity;}));
  var maxR=Math.max.apply(null,list.map(function(b){return parseFloat(b.provider_rating)||0;}));
  var d=document.createElement('div');
  d.id='cmpModal';
  d.style.cssText='position:fixed;inset:0;z-index:500;background:rgba(15,23,42,.45);display:flex;align-items:flex-end;justify-content:center';
  var best='background:#dcfce7;color:#15803d;font-weight:900;border-radius:6px';
  var rows=list.slice(0,6).map(function(b){
    var p=parseFloat(b.price)||0, dy=parseInt(b.days)||0, rt=parseFloat(b.provider_rating)||0;
    return '<tr style="border-bottom:1px solid var(--border)">'
      +'<td style="padding:11px 8px;font-size:12.5px;font-weight:800;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(b.provider_business_name||b.provider_name||'مزوّد')+'</td>'
      +'<td style="padding:11px 6px;text-align:center;font-size:13px;'+(p===minP?best:'')+'">'+(p?p.toLocaleString('en-US'):'—')+'</td>'
      +'<td style="padding:11px 6px;text-align:center;font-size:12.5px;'+(dy===minD?best:'')+'">'+(dy?dy+' يوم':'—')+'</td>'
      +'<td style="padding:11px 6px;text-align:center;font-size:12.5px;'+(rt&&rt===maxR?best:'')+'">'+(rt?'⭐'+rt.toFixed(1):'جديد')+'</td>'
      +'<td style="padding:11px 6px;text-align:center"><button onclick="document.getElementById(\'cmpModal\').remove();acceptBid('+b.id+','+b.request_id+')" style="background:var(--p);color:#fff;border:none;padding:6px 12px;border-radius:8px;font-family:Tajawal;font-size:11.5px;font-weight:800;cursor:pointer">قبول</button></td>'
    +'</tr>';
  }).join('');
  d.innerHTML='<div style="background:var(--white);width:100%;max-width:560px;border-radius:22px 22px 0 0;max-height:82vh;overflow-y:auto;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 14px)">'
    +'<div style="width:38px;height:4px;background:var(--border);border-radius:3px;margin:10px auto 12px"></div>'
    +'<div style="padding:0 16px 12px"><div style="font-size:16px;font-weight:900">مقارنة العروض</div><div style="font-size:12px;color:var(--muted);margin-top:3px">الأفضل في كل عمود مظلّل بالأخضر</div></div>'
    +'<table style="width:100%;border-collapse:collapse">'
      +'<thead><tr style="background:var(--bg)"><th style="padding:9px 8px;font-size:11.5px;color:var(--muted);text-align:right">المزوّد</th><th style="padding:9px 6px;font-size:11.5px;color:var(--muted)">السعر</th><th style="padding:9px 6px;font-size:11.5px;color:var(--muted)">المدة</th><th style="padding:9px 6px;font-size:11.5px;color:var(--muted)">التقييم</th><th style="padding:9px 6px;font-size:11.5px;color:var(--muted)"></th></tr></thead>'
      +'<tbody>'+rows+'</tbody></table>'
    +'<div style="padding:14px 16px 0"><button onclick="document.getElementById(\'cmpModal\').remove()" style="width:100%;padding:13px;background:var(--bg);border:1px solid var(--border);border-radius:12px;font-family:Tajawal;font-size:14px;font-weight:700;cursor:pointer">إغلاق</button></div>'
    +'</div>';
  d.onclick=function(e){ if(e.target===d)d.remove(); };
  document.body.appendChild(d);
}
function _negotiate(provId,reqId,provName,price,bidId){
  window._negBidId=bidId||0;
  var m=document.getElementById('negModal');
  if(m)m.remove();
  var d=document.createElement('div');
  d.id='negModal';
  d.style.cssText='position:fixed;inset:0;z-index:500;background:rgba(15,23,42,.42);display:flex;align-items:flex-end;justify-content:center';
  var btn='display:flex;align-items:center;gap:13px;width:100%;padding:15px 20px;background:none;border:none;font-family:Tajawal,sans-serif;font-size:15px;font-weight:700;cursor:pointer;text-align:right;color:var(--text);border-bottom:1px solid var(--border)';
  d.innerHTML='<div style="background:var(--white);width:100%;max-width:470px;border-radius:22px 22px 0 0;overflow:hidden;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 8px)">'
    +'<div style="width:38px;height:4px;background:var(--border);border-radius:3px;margin:10px auto"></div>'
    +'<div style="padding:4px 20px 12px;text-align:center"><div style="font-size:15.5px;font-weight:900;margin-bottom:3px">التفاوض مع '+esc(provName)+'</div><div style="font-size:12.5px;color:var(--muted);line-height:1.7">عرضه الحالي <b style="color:var(--green)">'+(price?Number(price).toLocaleString('en-US'):'—')+' ر.س</b><br>تواصل معه لتتفقا على السعر أو التفاصيل</div></div>'
    +'<button style="'+btn+'" onclick="_counterOffer('+provId+','+reqId+','+(price||0)+')"><span style="font-size:20px">💰</span><div><div>اقترح سعراً (عرض مضاد)</div><div style="font-size:11px;color:var(--muted);font-weight:600">أسرع طريقة — يصله إشعار فوري</div></div></button>'
    +'<button style="'+btn+'" onclick="_negoGo(\'chat\','+provId+','+reqId+')"><span style="font-size:20px">💬</span><div><div>محادثة داخل المنصة</div><div style="font-size:11px;color:var(--muted);font-weight:600">موثّقة ومحفوظة</div></div></button>'
    +'<button style="'+btn+'" onclick="_negoGo(\'call\','+provId+','+reqId+')"><span style="font-size:20px">📞</span><div><div>اتصال مباشر</div><div style="font-size:11px;color:var(--muted);font-weight:600">أسرع للتفاهم على التفاصيل</div></div></button>'
    +'<button style="'+btn+'" onclick="_negoGo(\'wa\','+provId+','+reqId+')"><span style="font-size:20px">📱</span><div><div>واتساب</div><div style="font-size:11px;color:var(--muted);font-weight:600">تواصل خارج المنصة</div></div></button>'
    +'<button style="'+btn+';border-bottom:none;justify-content:center;color:var(--muted)" onclick="document.getElementById(\'negModal\').remove()">إلغاء</button>'
    +'</div>';
  d.onclick=function(e){ if(e.target===d)d.remove(); };
  document.body.appendChild(d);
}
// عرض مضاد: العميل يقترح سعراً → يصل المزوّد إشعار + رسالة موثّقة
function _counterOffer(provId,reqId,curPrice){
  var m=document.getElementById('negModal'); if(m)m.remove();
  var bidId=window._negBidId||0;
  var d=document.createElement('div');
  d.id='negModal';
  d.style.cssText='position:fixed;inset:0;z-index:500;background:rgba(15,23,42,.42);display:flex;align-items:flex-end;justify-content:center';
  var fin='width:100%;padding:13px 15px;border:1.5px solid var(--border);border-radius:12px;font-family:Tajawal,sans-serif;font-size:15px;outline:none;box-sizing:border-box';
  d.innerHTML='<div style="background:var(--white);width:100%;max-width:470px;border-radius:22px 22px 0 0;padding:0 20px calc(env(safe-area-inset-bottom,0px) + 18px)">'
    +'<div style="width:38px;height:4px;background:var(--border);border-radius:3px;margin:10px auto 14px"></div>'
    +'<div style="font-size:16px;font-weight:900;margin-bottom:4px">اقترح سعرك</div>'
    +'<div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;line-height:1.7">عرضه الحالي <b style="color:var(--green)">'+(curPrice?Number(curPrice).toLocaleString('en-US'):'—')+' ر.س</b> — اكتب السعر الذي تراه مناسباً</div>'
    +'<input id="co-price" type="number" inputmode="numeric" placeholder="السعر المقترح (ر.س)" style="'+fin+';margin-bottom:10px">'
    +'<textarea id="co-note" rows="2" placeholder="تفاصيل إضافية (اختياري) — مثال: الثابت 80 والمتحرك 120" style="'+fin+';resize:none;margin-bottom:14px"></textarea>'
    +'<div style="display:flex;gap:9px">'
      +'<button onclick="document.getElementById(\'negModal\').remove()" style="flex:1;padding:13px;background:var(--bg);border:1px solid var(--border);border-radius:12px;font-family:Tajawal;font-size:14px;font-weight:700;cursor:pointer">إلغاء</button>'
      +'<button id="co-send" onclick="_sendCounter('+bidId+','+provId+','+reqId+')" style="flex:1.4;padding:13px;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;border-radius:12px;font-family:Tajawal;font-size:14px;font-weight:800;cursor:pointer">إرسال الاقتراح</button>'
    +'</div></div>';
  d.onclick=function(e){ if(e.target===d)d.remove(); };
  document.body.appendChild(d);
  setTimeout(function(){var i=document.getElementById('co-price');if(i)i.focus();},150);
}
function _sendCounter(bidId,provId,reqId){
  var price=parseFloat((document.getElementById('co-price')||{}).value||0);
  var note=((document.getElementById('co-note')||{}).value||'').trim();
  if(!price||price<=0){ showToast('أدخل سعراً صحيحاً','error'); return; }
  var btn=document.getElementById('co-send'); if(btn){btn.disabled=true;btn.textContent='جاري الإرسال...';}
  jFetch('/api/bids/'+bidId+'/negotiate',{method:'POST',body:JSON.stringify({counter_price:price,note:note})})
    .then(function(){
      var m=document.getElementById('negModal'); if(m)m.remove();
      showToast('تم إرسال اقتراحك ✓ — وصله إشعار','success');
      setTimeout(function(){ location.href='/chat?req='+reqId+'&with='+provId; },900);
    })
    .catch(function(){ showToast('تعذّر الإرسال — تحقّق من اتصالك','error'); if(btn){btn.disabled=false;btn.textContent='إرسال الاقتراح';} });
}
function _negoGo(mode,provId,reqId){
  var m=document.getElementById('negModal'); if(m)m.remove();
  if(mode==='chat'){ location.href='/chat?req='+reqId+'&with='+provId; return; }
  // اتصال/واتساب: نجلب رقم المزوّد
  jFetch('/api/providers/'+provId).then(function(p){
    var phone=(p&&(p.phone||p.mobile))||'';
    if(!phone){ showToast('رقم المزوّد غير متاح — استخدم المحادثة','error'); return; }
    var digits=String(phone).replace(/\D/g,'');
    if(digits.indexOf('966')!==0)digits=digits.replace(/^0/,'966');
    if(mode==='call') location.href='tel:+'+digits;
    else window.open('https://wa.me/'+digits+'?text='+encodeURIComponent('السلام عليكم، بخصوص عرضك على مشروعي في منصة مناقصة'),'_blank');
  }).catch(function(){ showToast('تعذّر جلب رقم المزوّد — استخدم المحادثة','error'); });
}
function toggleBlockUser(uid,name){
  if(!uid)return;
  var btn=document.getElementById('chatBlockBtn');
  var isBlocked=btn&&btn.getAttribute('data-blocked')==='1';
  if(!isBlocked){
    if(!confirm('حظر '+(name||'هذا المستخدم')+'؟\nلن تصلك رسائله ولن تصله رسائلك.'))return;
  }
  var method=isBlocked?'DELETE':'POST';
  fetch(API+'/api/blocks/'+uid,Object.assign({method:method},hdr()))
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(d){
      _paintBlockBtn(!!d.blocked);
      showToast(d.blocked?'تم الحظر — لن تصلك رسائله':'تم فك الحظر','success');
    })
    .catch(function(){showToast('تعذّر التنفيذ — تحقّق من اتصالك','error');});
}
function _paintBlockBtn(blocked){
  var btn=document.getElementById('chatBlockBtn'); if(!btn)return;
  btn.setAttribute('data-blocked',blocked?'1':'0');
  btn.textContent=blocked?'محظور — فكّ الحظر':'حظر';
  btn.style.color=blocked?'var(--red)':'var(--muted)';
  btn.style.borderColor=blocked?'var(--red)':'var(--border)';
  var inp=document.getElementById('chatInp'), snd=document.querySelector('.chat-send');
  if(inp){inp.disabled=blocked;inp.placeholder=blocked?'لا يمكن المراسلة (محظور)':'اكتب رسالة...';}
  if(snd){snd.disabled=blocked;snd.style.opacity=blocked?'.5':'';}
}
// افحص حالة الحظر عند فتح المحادثة
function _checkBlockState(uid){
  if(!uid)return;
  jFetch('/api/blocks?check='+uid).then(function(d){_paintBlockBtn(!!(d&&d.blocked));}).catch(function(){});
}
function openChat(reqId,providerId,providerName,reqTitle){
  _chatReqId=reqId;_chatWith=providerId;
  _bindKeyboardFix();                                  // ضبط المحادثة مع الكيبورد (iOS)
  var el=document.getElementById('chat-container');if(!el)return;
  var name=providerName||'مزود';
  el.innerHTML='<div class="chat-head">'
    +'<button onclick="_chatReqId=null;_chatWith=null;loadChatPage()" style="background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:7px 12px;font-family:Tajawal;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;color:var(--text);flex-shrink:0"><svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>رجوع</button>'
    +'<div style="min-width:0;flex:1"><div style="font-size:14px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(name)+'</div>'+(reqTitle?'<div style="font-size:11px;color:var(--muted);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(reqTitle)+'</div>':'')+'</div>'
    +'<button id="chatBlockBtn" onclick="toggleBlockUser('+(parseInt(providerId)||0)+','+_jsa(name)+')" title="حظر هذا المستخدم" style="background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:7px 10px;font-family:Tajawal;font-size:11.5px;font-weight:700;cursor:pointer;color:var(--muted);flex-shrink:0">حظر</button>'
    +'</div>'
    +'<div class="chat-wrap"><div class="chat-msgs" id="chatMsgs"><div class="loading">جاري التحميل...</div></div>'
    +'<div id="replyBar" style="display:none;align-items:center;gap:8px;background:var(--bg);border-radius:10px;padding:7px 9px;margin-bottom:6px"></div>'
    +'<div class="chat-input">'
    +'<input type="file" id="chatFile" accept="image/*,.pdf,.doc,.docx" style="display:none" onchange="_attachFile(this)">'
    +'<button class="chat-attach" onclick="document.getElementById(\'chatFile\').click()" title="إرفاق"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button>'
    +'<input class="chat-inp" id="chatInp" maxlength="2000" placeholder="اكتب رسالة..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendChatMsg();}">'
    +'<button class="chat-send" onclick="sendChatMsg()" title="إرسال"><svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" style="transform:scaleX(-1)"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button></div></div>';
  loadChatMsgs();
  _checkBlockState(providerId);
  if(_chatPoll)clearInterval(_chatPoll);
  _chatPoll=setInterval(function(){if(_chatReqId){if(_pollPaused)return;if(window._wsLive&&(++_pollTick%5))return;loadChatMsgs();}else clearInterval(_chatPoll);},6000);
}
function loadChatMsgs(){
  if(!_chatReqId)return;
  var url='/api/messages/'+_chatReqId+(_chatWith?'?with='+_chatWith:'');
  jFetch(url).then(function(msgs){
    if(!Array.isArray(msgs))return;
    // لا نعيد الرسم إلا لو فيه تغيير فعلي (جديد/مقروء/محذوف)
    var sig=msgs.map(function(m){return m.id+':'+(m.is_read?1:0)+':'+(m.deleted_at?1:0);}).join(',')+'@'+_chatReqId+'-'+_chatWith;
    if(sig===_chatSig && document.querySelector('#chatMsgs .msg-bubble'))return;
    _chatSig=sig;
    _chatMsgs=msgs;renderChatMsgs();
  }).catch(function(){});
}
var _chatSig='',_wsChatT=null,_pollTick=0;
// هل محادثة هذا الشخص مفتوحة قدام المستخدم؟ (عشان ما نطلع تنبيه لرسالة يشوفها أصلاً)
window._chatViewing=function(uid){ return !!(_chatReqId && !document.hidden && document.getElementById('chatMsgs') && (_chatWith?String(_chatWith)===String(uid):false)); };
// تحديث لحظي: رسالة جديدة / قراءة / حذف من الطرف الثاني → نحمّل فوراً
window.addEventListener('ws_message',function(e){
  var m=e.detail||{}; if(!_chatReqId||!document.getElementById('chatMsgs'))return;
  var other=m.type==='new_message'?m.sender_id:m.type==='messages_read'?m.reader_id:m.type==='message_deleted'?m.sender_id:m.type==='message_sent'?(m.message&&m.message.receiver_id):null;
  if(other==null)return;
  var hit=_chatWith?String(other)===String(_chatWith):String(m.request_id)===String(_chatReqId);
  if(hit){ clearTimeout(_wsChatT); _wsChatT=setTimeout(loadChatMsgs,250); }
});
// فاصل التاريخ (اليوم / أمس / التاريخ)
function _dayLabel(d){
  var dt=new Date(d), now=new Date();
  var s=function(x){return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();};
  var diff=(s(now)-s(dt))/86400000;
  if(diff===0)return 'اليوم';
  if(diff===1)return 'أمس';
  return dt.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'long'});
}
function renderChatMsgs(){
  var el=document.getElementById('chatMsgs');if(!el)return;
  if(!_chatMsgs.length){el.innerHTML='<div style="text-align:center;color:var(--muted);font-size:12.5px;padding:30px 20px;line-height:1.9;margin:auto"><div style="font-size:28px;margin-bottom:8px">💬</div><div style="font-weight:700;color:var(--text);margin-bottom:4px">ابدأ المحادثة</div><div>اسأل عن التفاصيل، الأسعار، أو موعد التنفيذ</div></div>';return;}
  var lastDay='';
  // ننزل لتحت بس لو كان المستخدم قريب من الأسفل، أو آخر رسالة منه
  var _lm=_chatMsgs[_chatMsgs.length-1]||{};
  var _stick=!el.querySelector('.msg-bubble')||(el.scrollHeight-el.scrollTop-el.clientHeight)<120||String(_lm.sender_id)===String((typeof user!=='undefined'&&user&&user.id)||'');
  el.innerHTML=_chatMsgs.map(function(m){
    var out='';
    // فاصل التاريخ
    var dl=_dayLabel(m.created_at);
    if(dl!==lastDay){ lastDay=dl; out+='<div style="align-self:center;background:rgba(30,58,138,.07);color:var(--muted);font-size:10.5px;font-weight:800;padding:4px 12px;border-radius:20px;margin:6px 0">'+dl+'</div>'; }
    var isMe=String(m.sender_id)===String(user.id);
    // رسالة محذوفة
    if(m.deleted_at){
      out+='<div class="msg-bubble '+(isMe?'msg-me':'msg-other')+'" style="opacity:.55;font-style:italic">🚫 حُذفت هذه الرسالة</div>';
      return out;
    }
    var ticks='';
    if(isMe){
      var read=(m.is_read===true||m.is_read==='t'||m.is_read===1);
      ticks='<span style="font-size:11px;margin-inline-start:4px;color:'+(read?'#53bdeb':'rgba(255,255,255,.6)')+';font-weight:900;letter-spacing:-2px">'+(read?'✓✓':'✓')+'</span>';
    }
    var body='';
    // اقتباس الرد
    if(m.reply_to&&m.reply_content){
      body+='<div style="background:rgba(0,0,0,.09);border-inline-start:3px solid '+(isMe?'rgba(255,255,255,.5)':'var(--p)')+';border-radius:7px;padding:5px 8px;margin-bottom:6px;font-size:11px;opacity:.85"><div style="font-weight:800;margin-bottom:1px">'+esc(m.reply_sender||'رسالة')+'</div><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">'+esc(String(m.reply_content).slice(0,60))+'</div></div>';
    }
    // مرفق
    if(m.attachment_url){
      if((m.attachment_type||'').indexOf('image')===0){
        body+='<img loading="lazy" src="'+esc(_safeUrl(m.attachment_url))+'" onclick="window.open(this.src,\'_blank\')" style="max-width:100%;border-radius:10px;margin-bottom:'+(m.content?'6px':'0')+';cursor:pointer;display:block">';
      } else {
        body+='<a href="'+esc(_safeUrl(m.attachment_url))+'" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:7px;background:rgba(0,0,0,.08);border-radius:9px;padding:8px 10px;margin-bottom:'+(m.content?'6px':'0')+';text-decoration:none;color:inherit;font-size:12px"><span style="font-size:17px">📎</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+esc(m.attachment_name||'ملف مرفق')+'</span></a>';
      }
    }
    if(m.content)body+=esc(m.content);
    // الأزرار مخفية — تظهر بالضغط المطوّل (أسلوب واتساب)
    var canDel=isMe&&!String(m.id).startsWith('tmp_')&&((Date.now()-new Date(m.created_at).getTime())/60000<60);
    var payload=encodeURIComponent(JSON.stringify({id:m.id,txt:String(m.content||(m.attachment_url?'مرفق':'')).slice(0,60),who:(m.sender_name||(isMe?'أنت':'')),del:canDel}));
    out+='<div class="msg-bubble '+(isMe?'msg-me':'msg-other')+'" data-m="'+payload+'" oncontextmenu="return _msgMenu(event,this)">'
      +(!isMe?'<div style="font-size:10px;font-weight:700;opacity:.65;margin-bottom:2px">'+esc(m.sender_name||'مزود')+'</div>':'')
      +body
      +'<div class="msg-time">'+timeAgo(m.created_at)+ticks+'</div>'
    +'</div>';
    return out;
  }).join('');
  if(_stick)el.scrollTop=el.scrollHeight;
  _bindLongPress();
}
// ── الضغط المطوّل على الرسالة يفتح قائمة إجراءات (بدل أزرار مكشوفة) ──
function _bindLongPress(){
  var el=document.getElementById('chatMsgs'); if(!el)return;
  el.querySelectorAll('.msg-bubble[data-m]').forEach(function(b){
    if(b._lpBound)return; b._lpBound=true;
    var t=null, moved=false;
    b.addEventListener('touchstart',function(e){ moved=false; t=setTimeout(function(){ if(!moved)_msgMenu(e,b); },420); },{passive:true});
    b.addEventListener('touchmove',function(){ moved=true; clearTimeout(t); },{passive:true});
    b.addEventListener('touchend',function(){ clearTimeout(t); },{passive:true});
    b.addEventListener('dblclick',function(e){ _msgMenu(e,b); });
  });
}
function _msgMenu(e,el){
  if(e&&e.preventDefault)e.preventDefault();
  var d={}; try{ d=JSON.parse(decodeURIComponent(el.getAttribute('data-m')||'{}')); }catch(err){}
  if(navigator.vibrate)try{navigator.vibrate(12);}catch(err){}
  var sheet=document.createElement('div');
  sheet.id='msgSheet';
  sheet.style.cssText='position:fixed;inset:0;z-index:400;background:rgba(15,23,42,.35);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn .15s';
  var btn='display:flex;align-items:center;gap:12px;width:100%;padding:15px 18px;background:none;border:none;font-family:Tajawal,sans-serif;font-size:14.5px;font-weight:700;cursor:pointer;text-align:right;color:var(--text);border-bottom:1px solid var(--border)';
  sheet.innerHTML='<div style="background:var(--white);width:100%;max-width:460px;border-radius:20px 20px 0 0;overflow:hidden;animation:sheetUp .22s cubic-bezier(.4,0,.2,1);padding-bottom:calc(env(safe-area-inset-bottom,0px) + 6px)">'
    +'<div style="width:38px;height:4px;background:var(--border);border-radius:3px;margin:9px auto"></div>'
    +'<button style="'+btn+'" onclick="_sheetAct(\'reply\')"><span style="font-size:19px">↩️</span> رد على الرسالة</button>'
    +'<button style="'+btn+'" onclick="_sheetAct(\'copy\')"><span style="font-size:19px">📋</span> نسخ النص</button>'
    +(d.del?'<button style="'+btn+';color:var(--red)" onclick="_sheetAct(\'delete\')"><span style="font-size:19px">🗑️</span> حذف الرسالة</button>':'')
    +'<button style="'+btn+';border-bottom:none;justify-content:center;color:var(--muted)" onclick="_closeSheet()">إلغاء</button>'
    +'</div>';
  sheet.onclick=function(ev){ if(ev.target===sheet)_closeSheet(); };
  window._sheetData=d;
  document.body.appendChild(sheet);
  return false;
}
function _closeSheet(){ var s=document.getElementById('msgSheet'); if(s)s.remove(); }
function _sheetAct(act){
  var d=window._sheetData||{}; _closeSheet();
  if(act==='reply') _replyTo(d.id,d.txt,d.who);
  else if(act==='copy'){ _copyMsgText(d.txt); }
  else if(act==='delete') _deleteMsg(d.id);
}
function _copyMsgText(t){
  if(navigator.clipboard&&window.isSecureContext){ navigator.clipboard.writeText(t).then(function(){showToast('تم نسخ النص ✓','success');}).catch(function(){}); }
  else { try{ var ta=document.createElement('textarea'); ta.value=t; ta.style.cssText='position:fixed;top:-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); showToast('تم نسخ النص ✓','success'); }catch(e){} }
}
// الرد على رسالة
var _replyCtx=null;
function _replyTo(id,preview,who){
  _replyCtx={id:id,preview:preview,who:who};
  var bar=document.getElementById('replyBar');
  if(bar){
    bar.style.display='flex';
    bar.innerHTML='<div style="flex:1;min-width:0;border-inline-start:3px solid var(--p);padding-inline-start:8px"><div style="font-size:10.5px;font-weight:800;color:var(--p)">رد على '+esc(who||'')+'</div><div style="font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(preview||'')+'</div></div><button onclick="_cancelReply()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted);padding:0 6px">×</button>';
  }
  var inp=document.getElementById('chatInp'); if(inp)inp.focus();
}
function _cancelReply(){ _replyCtx=null; var bar=document.getElementById('replyBar'); if(bar){bar.style.display='none';bar.innerHTML='';} }
// حذف رسالة
function _deleteMsg(id){
  if(!confirm('حذف هذه الرسالة؟'))return;
  fetch(API+'/api/messages/'+id,Object.assign({method:'DELETE'},hdr()))
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(){ loadChatMsgs(); showToast('تم الحذف','success'); })
    .catch(function(){ showToast('تعذّر الحذف (يمكن حذف الرسائل خلال ساعة فقط)','error'); });
}
// إرفاق ملف/صورة (يُضغط الصور تلقائياً ثم يُرسل)
var _pendingAttach=null;
function _attachFile(inp){
  var f=inp.files&&inp.files[0]; inp.value='';
  if(!f)return;
  if(f.size>10*1024*1024){showToast('الحجم الأقصى 10MB','error');return;}
  showToast('جاري رفع الملف...','info');
  var send=function(dataUrl){
    _pendingAttach={data:dataUrl,type:f.type||'application/octet-stream',name:f.name};
    sendChatMsg();   // يُرسل مباشرة (مع أي نص مكتوب)
  };
  if(/^image\//.test(f.type)) compressImage(f,send);
  else { var r=new FileReader(); r.onload=function(e){send(e.target.result);}; r.readAsDataURL(f); }
}
function sendChatMsg(){
  if(window._sendingMsg)return;                       // منع الإرسال المزدوج
  var inp=document.getElementById('chatInp');if(!inp)return;
  var msg=inp.value.trim();
  var att=_pendingAttach; _pendingAttach=null;
  if((!msg&&!att)||!_chatReqId)return;                // نص أو مرفق على الأقل
  var rep=_replyCtx; _cancelReply();
  var btn=document.querySelector('.chat-send');
  window._sendingMsg=true;
  inp.value='';
  if(btn){btn.disabled=true;btn.style.opacity='.6';}
  var payload={request_id:_chatReqId,receiver_id:_chatWith,content:msg};
  if(att){payload.attachment_url=att.data;payload.attachment_type=att.type;payload.attachment_name=att.name;}
  if(rep&&rep.id)payload.reply_to=rep.id;
  // اعرض الرسالة فوراً (إحساس سريع)، وتُستبدل بالمؤكّدة من الخادم
  var tmp={id:'tmp_'+Date.now(),sender_id:user.id,content:msg,created_at:new Date().toISOString(),is_read:false,
           attachment_url:att?att.data:null,attachment_type:att?att.type:null,attachment_name:att?att.name:null,
           reply_to:rep?rep.id:null,reply_content:rep?rep.preview:null,reply_sender:rep?rep.who:null};
  _chatMsgs.push(tmp);renderChatMsgs();
  fetch(API+'/api/messages',Object.assign({method:'POST',body:JSON.stringify(payload)},hdr()))
    .then(function(r){if(!r.ok)throw new Error();return r.json();})
    .then(function(){ loadChatMsgs(); })   // أعِد الجلب ليصل المرفق وبيانات الرد كاملة
    .catch(function(){
      _chatMsgs=_chatMsgs.filter(function(x){return x.id!==tmp.id;});renderChatMsgs();
      showToast('تعذّر الإرسال — تحقّق من اتصالك','error');inp.value=msg;
    })
    .finally(function(){
      window._sendingMsg=false;
      if(btn){btn.disabled=false;btn.style.opacity='';}
      inp.focus();
    });
}

// ═══════════════════════════════════
// INIT
// ═══════════════════════════════════
fillCitySelect(document.getElementById('n-city'));
// استرجع القسم من الـ URL عند التحميل/التحديث
function restoreFromHash(){
  // إذا فيه محادثة معلّقة، اتركها لـ openPendingChat
  try{if(localStorage.getItem('pending_contact_provider')||localStorage.getItem('open_chat_request')){return;}}catch(e){}
  var h=(location.hash||'').replace('#','');
  if(!h){show('home',null,'home');return;}
  if(h.indexOf('detail/')===0){
    var rid=parseInt(h.split('/')[1]);
    if(rid){
      // تحقق إن المشروع للعميل قبل فتحه
      jFetch('/api/requests/my').then(function(list){
        var mine=Array.isArray(list)&&list.some(function(r){return r.id===rid;});
        if(mine){window._skipHash=true;openDetail(rid);window._skipHash=false;}
        else{history.replaceState(null,'','#home');show('home',null,'home');}
      }).catch(function(){history.replaceState(null,'','#home');show('home',null,'home');});
      return;
    }
  }
  var valid=['home','requests','new','notifs','profile','chat'];
  var pg=valid.indexOf(h)>=0?h:'home';
  window._skipHash=true;
  show(pg,null,pg);
  window._skipHash=false;
}
restoreFromHash();
window.addEventListener('hashchange',restoreFromHash);
loadNotifCount();
setInterval(function(){if(!_pollPaused)loadNotifCount();},30000);

// فتح محادثة معلّقة (قادم من صفحة المزود أو بعد تسجيل الدخول)
(function openPendingChat(){
  var provId=null,reqId=null;
  try{
    provId=localStorage.getItem('pending_contact_provider');
    reqId=localStorage.getItem('open_chat_request')||localStorage.getItem('mnq_open_chat_id');
    localStorage.removeItem('pending_contact_provider');
    localStorage.removeItem('open_chat_request');
    localStorage.removeItem('mnq_open_chat_id');
  }catch(e){}
  if(!provId&&!reqId)return;
  // افتح قسم الرسائل
  setTimeout(function(){
    if(provId){
      // أنشئ/افتح محادثة مع المزود
      fetch(API+'/api/direct-message',Object.assign({method:'POST',body:JSON.stringify({provider_id:parseInt(provId)})},hdr()))
        .then(function(r){return r.json();})
        .then(function(d){if(d.request_id){gotoMessagesAndOpen(d.request_id,parseInt(provId),null);}})
        .catch(function(){});
    } else if(reqId){
      gotoMessagesAndOpen(parseInt(reqId),null,null);
    }
  },600);
})();

function gotoMessagesAndOpen(reqId,provId,provName){
  // احفظ المحادثة المطلوبة ثم انتقل لقسم المحادثات
  window._openChatReqId=reqId;
  window._openChatPid=provId||null;
  window._openChatName=provName||null;
  // انتقل لتبويب المحادثات (سيقرأ loadChatPage القيم ويفتح المحادثة)
  var chatNav=document.getElementById('bn-chat')||document.querySelector('[onclick*="\'chat\'"]');
  if(typeof show==='function'){try{location.href='/chat';}catch(e){}}
}
