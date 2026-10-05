/* مناقصة — شكل الكمبيوتر (النموذج 1): يضيف بطاقة التطبيق والمستخدم أسفل القائمة،
   وسطر تحت عنوان الصفحة، ويقسم الرئيسية لعمودين (المحتوى + عمود جانبي) */
(function(){
  var W=window, D=document;
  function wide(){ return W.matchMedia&&W.matchMedia('(min-width:769px)').matches; }
  function vwide(){ return W.matchMedia&&W.matchMedia('(min-width:1200px)').matches; }
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function user(){ try{return JSON.parse(localStorage.getItem('user')||'{}')||{};}catch(e){return {};} }
  var isProv=!!D.getElementById('page-browse');
  function sideExtras(){
    var foot=D.querySelector('.side .side-foot'); if(!foot||D.getElementById('dkMe'))return;
    var u=user(), un=D.getElementById('userName'), nm=u.business_name||u.name||(un&&un.textContent&&un.textContent.trim()!=='...'?un.textContent.trim():'')||(isProv?'المزوّد':'العميل');
    var img=u.profile_image&&/^https?:\/\//.test(u.profile_image)?'<img src="'+esc(u.profile_image)+'" alt="">':esc(String(nm).trim().charAt(0)||'م');
    var qr='https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data='+encodeURIComponent(location.origin+'/app?src=desk_side');
    var app='<a class="dk-app" id="dkApp" href="/app?src=desk_side" target="_blank" rel="noopener"><img src="'+qr+'" alt="رمز تحميل التطبيق" loading="lazy"><span>امسح وحمّل التطبيق — '+(isProv?'يوصلك إشعار أول ما العميل يشوف عرضك':'يوصلك إشعار مع كل عرض جديد')+'</span></a>';
    var me='<div class="dk-me" id="dkMe"><div class="dk-av">'+img+'</div><div style="flex:1;min-width:0"><b>'+esc(nm)+'</b><small>'+(isProv?'مزوّد':'عميل')+(u.city?' · '+esc(u.city):'')+'</small></div></div>';
    foot.insertAdjacentHTML('afterbegin',(W.ReactNativeWebView?'':app)+me);
  }
  var SUB={home:function(){ return isProv?'فرص جديدة تناسب تخصصك ومدينتك':'تابع مشاريعك والعروض اللي وصلتك'; },browse:'المشاريع المفتوحة — الأقرب لك أول',works:'عروضك ومشاريعك وحالة كل واحد',saai:'سعي المنصة 3% من مبلغ الاتفاق',profile:'ملفك وصفحتك العامة وإعداداتك',notifs:'كل التنبيهات',reviews:'تقييمات عملائك',requests:'كل مشاريعك وعروضها',chat:'محادثاتك مع '+(isProv?'العملاء':'المزوّدين')};
  function subLine(){
    var t=D.getElementById('pageTitle'); if(!t)return;
    var pg=(location.hash||'#home').slice(1).split('/')[0]||'home', s=SUB[pg]; if(typeof s==='function')s=s();
    var el=D.getElementById('dkSub');
    if(!el){ el=D.createElement('div'); el.id='dkSub'; el.className='dk-sub'; var w=D.createElement('div'); t.parentNode.insertBefore(w,t); w.appendChild(t); w.appendChild(el); }
    el.textContent=s||''; el.style.display=s?'':'none';
  }
  // صفحات تنقسم لعمودين (المحتوى + عمود جانبي) بدون ما نغيّر طريقة رسمها
  var GRIDS=isProv?{'page-home':['.hh-kpi','.hh-lvl','#ph-sharecard','#appDlCard'],'page-profile':['#pf-wal','#pf-link','#cp-card']}
                  :{'page-home':['.hh-stats','#ph-role-slot','#appDlCard']};
  var busy=false;
  function gridify(id){
    var pg=D.getElementById(id), RAIL=GRIDS[id]; if(!pg||!RAIL||busy)return;
    busy=true;
    try{
      var g=pg.querySelector(':scope > .dk-grid');
      if(!vwide()){ if(g){ var m=g.querySelector('.dk-main'), r=g.querySelector('.dk-rail'); [].slice.call(m.children).concat([].slice.call(r.children)).forEach(function(c){ pg.insertBefore(c,g); }); g.remove(); } return; }
      var loose=[].slice.call(pg.children).filter(function(c){ return !c.classList.contains('dk-grid'); });
      if(!loose.length)return;
      if(loose.length===1&&loose[0].classList.contains('loading'))return;
      if(!loose.some(function(c){ return RAIL.some(function(sel){ try{return c.matches(sel);}catch(e){return false;} }); })&&!g)return; // لسا ما انرسم
      if(!g){ g=D.createElement('div'); g.className='dk-grid'; g.innerHTML='<div class="dk-main"></div><div class="dk-rail"></div>'; pg.appendChild(g); }
      var main=g.querySelector('.dk-main'), rail=g.querySelector('.dk-rail');
      loose.forEach(function(c){ var isR=RAIL.some(function(sel){ try{return c.matches(sel);}catch(e){return false;} }); (isR?rail:main).appendChild(c); });
    } finally { busy=false; }
  }
  function homeGrid(){ Object.keys(GRIDS).forEach(gridify); }
  // مشروع جديد: معاينة حية «هكذا يشوفه المزوّدين»
  function newPreview(){
    var pg=D.getElementById('page-new'); if(!pg||pg.querySelector('.dk-new'))return;
    var card=pg.querySelector(':scope > .card'); if(!card||!D.getElementById('n-title'))return;
    var g=D.createElement('div'); g.className='dk-new'; pg.insertBefore(g,card); g.appendChild(card);
    var pv=D.createElement('div'); pv.className='dk-prev'; g.appendChild(pv);
    pv.innerHTML='<div class="dk-pl">هكذا يشوفه المزوّدين 👇</div><div class="dk-pc"><div class="dk-pimg" id="dkPI">صور المشروع تطلع هنا</div><div class="dk-pb"><span class="dk-chip">جديد</span><div class="dk-pt" id="dkPT"></div><div class="dk-pm" id="dkPM"></div><div class="dk-pd" id="dkPD"></div></div></div>'
      +'<div class="dk-tip">💡 العنوان الواضح والتفاصيل والصور تجيب عروض أكثر وأدق.</div>';
    var v=function(id){ var e=D.getElementById(id); return e?String(e.value||'').trim():''; };
    function upd(){
      D.getElementById('dkPT').textContent=v('n-title')||'عنوان مشروعك';
      var c=v('n-cat'), city=v('n-city'), dist=v('n-district'), b=v('n-budget');
      D.getElementById('dkPM').textContent=[c,[city,dist].filter(Boolean).join(' · '),b?('ميزانية '+Number(b).toLocaleString('en-US')+' ر.س'):''].filter(Boolean).join(' · ')||'التخصص · المدينة';
      D.getElementById('dkPD').textContent=v('n-desc')||'التفاصيل اللي تكتبها تطلع هنا…';
      var im=(W._reqImages&&W._reqImages[0]&&W._reqImages[0].data)||null, pi=D.getElementById('dkPI');
      if(im){ if(!pi.firstChild||pi.firstChild.tagName!=='IMG'||pi.firstChild.src!==im)pi.innerHTML='<img alt="" src="'+esc(im)+'">'; } else if(pi.firstChild&&pi.firstChild.tagName==='IMG') pi.textContent='صور المشروع تطلع هنا';
    }
    pg.addEventListener('input',upd); pg.addEventListener('change',upd); setInterval(function(){ if(pg.offsetParent)upd(); },1500); upd();
  }
  function boot(){
    if(!wide())return;
    sideExtras(); subLine(); if(vwide())newPreview();
    // الاسم يتحدث بعد ما تحمّل اللوحة بيانات الحساب
    setTimeout(function(){ var un=D.getElementById('userName'), b=D.querySelector('#dkMe b'); if(un&&b&&un.textContent&&un.textContent.trim()!=='...'&&!user().name)b.textContent=un.textContent.trim(); },3000);
    Object.keys(GRIDS).forEach(function(id){ var pg=D.getElementById(id); if(pg&&W.MutationObserver){ new MutationObserver(function(){ if(!busy)setTimeout(function(){gridify(id);},0); }).observe(pg,{childList:true}); } });
    homeGrid();
  }
  W.addEventListener('hashchange',function(){ if(wide())subLine(); });
  W.addEventListener('resize',function(){ clearTimeout(W._dkR); W._dkR=setTimeout(function(){ if(wide()){ sideExtras(); subLine(); } homeGrid(); },200); });
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot); else boot();
})();
