/* ═══ «تواصل معنا» — زر ثابت يفتح محادثة فريق مناقصة (لوحة العميل والمزوّد) ═══
   الجوال/التطبيق: يفتح صفحة المحادثة · الكمبيوتر: نافذة جنب الصفحة (iframe لنفس صفحة المحادثة) */
(function(){
  'use strict';
  var PROV=/dashboard-provider/.test(location.pathname);
  // الصفحات اللي يطلع فيها الزر (نخفيه في صفحات فيها أزرار ثابتة تحت أو نماذج)
  var SHOW=PROV?['home','browse','works','reviews','notifs','profile','saai']:['home','requests','profile','notifs'];
  var state={n:0,last:null}, panel=null, fab=null, tip=null;
  function tok(){ try{ return localStorage.getItem('token')||''; }catch(e){ return ''; } }
  function isDesk(){ return window.innerWidth>=1024 && !window.ReactNativeWebView; }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function url(ctx){
    ctx=ctx||{}; var q='/chat?support=1';
    if(ctx.link)q+='&link='+encodeURIComponent(ctx.link);
    if(ctx.topic)q+='&topic='+encodeURIComponent(ctx.topic);
    return q;
  }
  function open(ctx){
    try{ localStorage.setItem('mnq_sup_tip','1'); }catch(e){}
    if(tip){ tip.remove(); tip=null; }
    if(!isDesk()){ location.href=url(ctx); return; }
    if(!panel){
      panel=document.createElement('div'); panel.id='supPanel';
      panel.innerHTML='<iframe title="محادثة فريق مناقصة" src="'+esc(url(ctx)+'&embed=1')+'"></iframe>';
      document.body.appendChild(panel);
    } else {
      var f=panel.querySelector('iframe');
      if(ctx&&(ctx.link||ctx.topic)&&f)f.src=url(ctx)+'&embed=1';
      panel.style.display='';
    }
    state.n=0; paint();
    if(fab)fab.style.display='none';
  }
  function close(){ if(panel)panel.style.display='none'; vis(); }
  window.addEventListener('message',function(e){ if(e.origin===location.origin&&e.data&&e.data.type==='mnq_sup_close')close(); });
  window.supOpen=open;
  window.openSupport=function(e){ if(e&&e.preventDefault)e.preventDefault(); open(); };
  // صف «فريق مناقصة» المثبّت أعلى قائمة المحادثات في اللوحة
  window._supPinRow=function(){
    var last=state.last, sub=last?((last.from_admin?'':'أنت: ')+last.text):'عندك سؤال أو مشكلة؟ نرد عليك هنا';
    return '<div class="sup-pinrow" onclick="supOpen()" role="button" tabindex="0">'
      +'<span class="sup-pin-av">م</span><span class="sup-pin-b"><b>فريق مناقصة <i>📌 مثبّتة</i></b><small>'+esc(String(sub).slice(0,60))+'</small></span>'
      +(state.n?'<span class="sup-pin-n">'+state.n+'</span>':'')+'</div>';
  };
  function curPage(){ var p=document.querySelector('.page.on'); return p?p.id.replace('page-',''):''; }
  function vis(){
    if(!fab)return;
    var pg=curPage(), open_=panel&&panel.style.display!=='none';
    var hide=open_||SHOW.indexOf(pg)<0||document.body.classList.contains('in-chat');
    if(pg!==vis._pg){ vis._pg=pg; fab.classList.remove('mini'); }
    fab.style.display=hide?'none':'';
    if(tip)tip.style.display=(hide||pg!=='home')?'none':'';
    place();
  }
  function place(){
    if(!fab)return;
    var b=document.querySelector('.bnav'), off=24;
    if(b&&getComputedStyle(b).display!=='none'){ var r=b.getBoundingClientRect(); if(r.height)off=Math.max(24,window.innerHeight-r.top+12); }
    fab.style.bottom=off+'px';
    if(tip)tip.style.bottom=(off+58)+'px';
  }
  function paint(){
    if(!fab)return;
    var bd=fab.querySelector('.sup-fab-n');
    if(bd){ bd.textContent=state.n; bd.style.display=state.n?'':'none'; }
    var pin=document.querySelector('.sup-pinrow'); if(pin)pin.outerHTML=window._supPinRow();
  }
  function load(){
    if(!tok()||document.hidden)return;
    fetch('/api/support/unread',{headers:{Authorization:'Bearer '+tok()},cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(function(d){ if(!d)return; state.n=d.n||0; state.last=d.last||null; paint(); }).catch(function(){});
  }
  window._supRefresh=load;
  function init(){
    if(!tok())return;
    var st=document.createElement('style');
    st.textContent='#supFab{position:fixed;left:16px;bottom:24px;z-index:90;display:flex;align-items:center;gap:7px;background:#2563eb;color:#fff;border:0;border-radius:999px;padding:12px 17px;font-family:Tajawal,sans-serif;font-weight:900;font-size:14px;cursor:pointer;box-shadow:0 10px 26px rgba(37,99,235,.38)}'
      +'#supFab{transition:padding .2s,gap .2s}#supFab.mini{padding:13px;gap:0}#supFab.mini .sup-fab-t{display:none}#supFab.mini .sup-fab-n{position:absolute;top:-6px;right:-6px}'
      +'#supFab:active{transform:scale(.95)}#supFab .sup-fab-n{background:#ef4444;color:#fff;border-radius:999px;font-size:11px;min-width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;padding:0 6px;border:2px solid #fff}'
      +'#supTip{position:fixed;left:16px;z-index:91;width:220px;background:#0f2544;color:#fff;border-radius:14px;padding:11px 13px;font-family:Tajawal,sans-serif;font-size:12.5px;font-weight:800;line-height:1.6;box-shadow:0 10px 26px rgba(15,37,68,.3)}'
      +'#supTip:after{content:"";position:absolute;bottom:-6px;left:28px;width:12px;height:12px;background:#0f2544;transform:rotate(45deg)}#supTip button{position:absolute;top:6px;right:8px;background:none;border:0;color:#c7d2fe;font-size:14px;cursor:pointer}'
      +'#supPanel{position:fixed;left:24px;bottom:24px;width:400px;height:min(640px,calc(100vh - 48px));z-index:400;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(15,37,68,.3);border:1px solid #dbe3ef;background:#fff}'
      +'#supPanel iframe{width:100%;height:100%;border:0;display:block}'
      +'.sup-pinrow{display:flex;align-items:center;gap:12px;padding:13px 14px;margin-bottom:10px;border:1.5px solid #bfdbfe;background:#f5f9ff;border-radius:14px;cursor:pointer}'
      +'.sup-pin-av{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#0f2544,#1e3a8a);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;flex-shrink:0}'
      +'.sup-pin-b{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.sup-pin-b b{font-size:14px;color:var(--text,#0f1d3a)}.sup-pin-b i{font-style:normal;font-size:10px;color:#1d4ed8;background:#eaf1fe;border-radius:10px;padding:1px 7px;margin-inline-start:4px}'
      +'.sup-pin-b small{font-size:12px;color:var(--muted,#64748b);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sup-pin-n{background:#16a34a;color:#fff;border-radius:999px;font-size:11px;font-weight:900;min-width:21px;height:21px;display:flex;align-items:center;justify-content:center;padding:0 6px}'
      +'[data-theme="dark"] .sup-pinrow{background:#13213d;border-color:#2b4377}[data-theme="dark"] #supPanel{border-color:#24365e;background:#0b1428}';
    document.head.appendChild(st);
    fab=document.createElement('button'); fab.id='supFab'; fab.type='button'; fab.setAttribute('aria-label','تواصل مع فريق مناقصة');
    fab.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/></svg><span class="sup-fab-t">تواصل معنا</span><span class="sup-fab-n" style="display:none">0</span>';
    fab.onclick=function(){ open(); };
    document.body.appendChild(fab);
    var seen=false; try{ seen=!!localStorage.getItem('mnq_sup_tip'); }catch(e){}
    if(!seen){
      tip=document.createElement('div'); tip.id='supTip';
      tip.innerHTML='<button type="button" aria-label="إغلاق">✕</button>عندك سؤال أو مشكلة؟ فريق مناقصة يرد عليك هنا داخل المنصة';
      tip.querySelector('button').onclick=function(){ try{ localStorage.setItem('mnq_sup_tip','1'); }catch(e){} tip.remove(); tip=null; };
      document.body.appendChild(tip);
      setTimeout(function(){ if(tip){ try{ localStorage.setItem('mnq_sup_tip','1'); }catch(e){} tip.remove(); tip=null; } },12000);
    }
    var host=document.querySelector('.page')&&document.querySelector('.page').parentNode;
    try{ new MutationObserver(vis).observe(host||document.body,{attributes:true,subtree:true,attributeFilter:['class']}); }catch(e){ setInterval(vis,1000); }
    try{ new MutationObserver(vis).observe(document.body,{attributes:true,attributeFilter:['class']}); }catch(e){}
    window.addEventListener('resize',function(){ vis(); });
    // يصغر لدائرة لما ينزل بالصفحة (ما يغطي الأزرار)، ويرجع لما يطلع فوق
    document.addEventListener('scroll',function(e){ var t=e.target, y=(t&&t!==document&&t.scrollTop!=null)?t.scrollTop:(window.scrollY||0); fab.classList.toggle('mini',y>60); },true);
    vis(); load();
    setInterval(load,45000);
    document.addEventListener('visibilitychange',function(){ if(!document.hidden)load(); });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){ setTimeout(init,400); }); else setTimeout(init,400);
})();
