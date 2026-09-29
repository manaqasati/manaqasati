/* مناقصة — دعوة تحميل التطبيق (اللوحات)
   - شريط في الرئيسية: سطر على الجوال، وبطاقة QR على الكمبيوتر
   - لو انقفل يرجع بعد أسبوعين، وبعد 3 قفلات يوقف نهائياً
   - ما يطلع داخل التطبيق، ولا لمن سجّل دخول في التطبيق (السيرفر يعرف من رموز الإشعارات)
   - «اللحظة المناسبة»: بعد نشر مشروع أو تقديم عرض (مرة كل 7 أيام) */
(function(){
  var W=window, D=document;
  var K='mnq_appdl';
  function st(){ try{ return JSON.parse(localStorage.getItem(K)||'{}')||{}; }catch(e){ return {}; } }
  function save(s){ try{ localStorage.setItem(K,JSON.stringify(s)); }catch(e){} }
  function os(){ var u=navigator.userAgent||''; if(/iPhone|iPad|iPod/i.test(u)||(/Macintosh/.test(u)&&'ontouchend' in D)) return 'ios'; if(/Android/i.test(u)) return 'android'; return 'desktop'; }
  function inApp(){ return !!W.ReactNativeWebView || /ManaqasaApp|; wv\)/i.test(navigator.userAgent||''); }
  function base(){ return (typeof W.API==='string') ? W.API : ''; }
  function isProv(){ return !!D.getElementById('page-browse'); }
  function go(o,src){ return '/app/go?os='+o+'&src='+encodeURIComponent(src); }
  function qr(src){ return 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data='+encodeURIComponent(location.origin+'/app?src='+src); }
  var SVG_PHONE='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/></svg>';
  var SVG_X='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  var APPLE='<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.2 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8s1.9.8 3.2.8c1.3 0 2.1-1.2 2.9-2.4.9-1.4 1.3-2.7 1.3-2.8-.1 0-2.5-1-2.4-3.9zM14 5.4c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>';
  var PLAY='<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="#00C4FF" d="M3.6 2.4 13.3 12 3.6 21.6c-.35-.2-.6-.58-.6-1.06V3.46c0-.48.25-.86.6-1.06z"/><path fill="#00E676" d="M16.6 8.7 13.3 12 3.6 2.4l.2-.1 12.8 6.4z"/><path fill="#FF3A44" d="M16.6 15.3 3.8 21.7l-.2-.1 9.7-9.6z"/><path fill="#FFD400" d="m20.3 10.6-3.7-1.9-3.3 3.3 3.3 3.3 3.7-1.9c.5-.3.8-.8.8-1.4s-.3-1.1-.8-1.4z"/></svg>';

  // هل عنده التطبيق؟ (نخزّن «نعم» يوم كامل عشان ما نسأل كل مرة)
  var _has=null;
  function hasApp(cb){
    if(_has!==null) return cb(_has);
    var s=st(); if(s.has && Date.now()-(s.hasAt||0)<86400000){ _has=true; return cb(true); }
    var t=null; try{ t=localStorage.getItem('token'); }catch(e){}
    if(!t){ _has=false; return cb(false); }
    fetch(base()+'/api/me/app-status',{headers:{'Authorization':'Bearer '+t},cache:'no-store'}).then(function(r){ return r.json(); }).then(function(d){
      _has=!!(d&&d.has_app); if(_has){ var s2=st(); s2.has=1; s2.hasAt=Date.now(); save(s2); } cb(_has);
    }).catch(function(){ _has=false; cb(false); });
  }
  function eligible(){ var s=st(); return !inApp() && (s.dism||0)<3 && Date.now()>(s.until||0); }

  // ── الشريط في الرئيسية ──
  W.dismissAppDl=function(){ var s=st(); s.dism=(s.dism||0)+1; s.until=Date.now()+14*86400000; save(s); var c=D.getElementById('appDlCard'); if(c)c.remove(); };
  W.initAppDownload=function(){
    if(!eligible() || D.getElementById('appDlCard')) return;
    var ph=D.getElementById('page-home'); if(!ph) return;
    hasApp(function(h){
      if(h || D.getElementById('appDlCard')) return;
      var o=os(), prov=isProv(), card=D.createElement('div'); card.id='appDlCard';
      // Safari على الآيفون يعرض شريط Apple الرسمي فوق الصفحة — ما نكرر
      if(o==='ios' && /Safari/i.test(navigator.userAgent||'') && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent||'')) return;
      if(o==='desktop'){
        if(!(W.matchMedia&&W.matchMedia('(min-width: 900px)').matches)) return;
        card.style.cssText='display:flex;align-items:center;gap:18px;background:var(--card,#fff);border:1px solid var(--border,#e1e9f6);border-radius:18px;padding:16px 18px;margin:0 0 14px';
        card.innerHTML='<img src="'+qr('qr')+'" alt="رمز QR لتحميل تطبيق مناقصة" width="96" height="96" style="border-radius:10px;background:#fff;flex-shrink:0">'
          +'<div style="flex:1;min-width:0"><b style="display:block;font-size:15.5px;color:var(--text,#14223d);margin-bottom:3px">حمّل التطبيق على جوالك</b>'
          +'<span style="font-size:13px;font-weight:700;color:var(--muted,#5b6b85);line-height:1.8">'+(prov?'امسح الرمز بكاميرا جوالك — يوصلك المشروع الجديد بتخصصك لحظة نشره، وتقدّم قبل غيرك.':'امسح الرمز بكاميرا جوالك — توصلك العروض والرسائل على جوالك أول بأول.')+'</span></div>'
          +'<button onclick="dismissAppDl()" aria-label="إغلاق" style="border:0;background:none;color:#94a3b8;padding:6px;cursor:pointer;display:flex;align-self:flex-start">'+SVG_X+'</button>';
      } else {
        card.style.cssText='display:flex;align-items:center;gap:10px;background:var(--card,#fff);border:1px solid var(--border,#e1e9f6);border-radius:14px;padding:9px 12px;margin:0 0 12px';
        card.innerHTML='<span style="color:#1d4ed8;display:flex;flex-shrink:0">'+SVG_PHONE+'</span>'
          +'<span style="flex:1;font-size:13px;font-weight:800;color:var(--text,#14223d);line-height:1.5">'+(prov?'حمّل التطبيق ويوصلك المشروع لحظة نشره':'حمّل التطبيق وتوصلك العروض فوراً')+'</span>'
          +'<a href="'+go(o,'banner')+'" style="background:#1d4ed8;color:#fff;border-radius:999px;padding:7px 14px;font-family:Tajawal,sans-serif;font-weight:800;font-size:12.5px;text-decoration:none;white-space:nowrap">تحميل</a>'
          +'<button onclick="dismissAppDl()" aria-label="إغلاق" style="border:0;background:none;color:#94a3b8;padding:6px;cursor:pointer;display:flex">'+SVG_X+'</button>';
      }
      // قبل الرئيسية (عشان ما ينمسح لما تتحدّث)، ويختفي في باقي الصفحات
      if(!D.getElementById('appDlCss')){ var cs=D.createElement('style'); cs.id='appDlCss'; cs.textContent='#appDlCard:not(:has(+ #page-home.on)){display:none!important}'; D.head.appendChild(cs); }
      ph.parentNode.insertBefore(card, ph);
    });
  };

  // ── اللحظة المناسبة: بعد نشر مشروع / تقديم عرض ──
  W.mnqAppMoment=function(kind){
    if(inApp()) return;
    var s=st(); if(Date.now()-(s.momentAt||0)<7*86400000) return;
    hasApp(function(h){
      if(h || D.getElementById('appMoment')) return;
      var o=os(), s2=st(); s2.momentAt=Date.now(); save(s2);
      var T={posted:['مشروعك انرسل للمزوّدين','حمّل تطبيق مناقصة عشان يوصلك أول عرض على جوالك لحظة وصوله — بدون ما تحتاج تفتح الموقع وتدوّر.'],
             bid:['عرضك وصل للعميل','حمّل التطبيق عشان يوصلك رد العميل فوراً، وتوصلك المشاريع الجديدة بتخصصك لحظة نشرها — المزوّد اللي يقدّم أول له الأفضلية.']}[kind]||['حمّل تطبيق مناقصة','توصلك الإشعارات على جوالك أول بأول.'];
      var btn=function(k){ return k==='ios'
        ? '<a href="'+go('ios','moment_'+kind)+'" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#0f172a;color:#fff;border-radius:13px;padding:13px;font-family:Tajawal,sans-serif;font-weight:800;font-size:15px;text-decoration:none;flex:1">'+APPLE+' App Store</a>'
        : '<a href="'+go('android','moment_'+kind)+'" style="display:flex;align-items:center;justify-content:center;gap:8px;background:#0f172a;color:#fff;border-radius:13px;padding:13px;font-family:Tajawal,sans-serif;font-weight:800;font-size:15px;text-decoration:none;flex:1">'+PLAY+' Google Play</a>'; };
      var body=o==='desktop'
        ? '<div style="display:flex;align-items:center;gap:14px"><img src="'+qr('moment_'+kind)+'" alt="رمز QR لتحميل التطبيق" width="120" height="120" style="border-radius:10px;flex-shrink:0"><span style="font-size:13.5px;font-weight:700;color:#5b6b85;line-height:1.8">امسح الرمز بكاميرا جوالك ويفتح لك المتجر المناسب.</span></div>'
        : '<div style="display:flex;gap:8px">'+(o==='ios'?btn('ios'):btn('android'))+'</div>';
      var ov=D.createElement('div'); ov.id='appMoment';
      ov.style.cssText='position:fixed;inset:0;z-index:99990;background:rgba(15,23,42,.5);display:flex;align-items:flex-end;justify-content:center';
      ov.innerHTML='<div role="dialog" aria-modal="true" aria-label="'+T[0]+'" style="background:#fff;width:100%;max-width:480px;border-radius:22px 22px 0 0;padding:20px 18px calc(20px + env(safe-area-inset-bottom));font-family:Tajawal,sans-serif;display:flex;flex-direction:column;gap:12px;color:#14223d">'
        +'<div style="width:44px;height:5px;border-radius:5px;background:#e2e8f0;align-self:center"></div>'
        +'<div style="display:flex;align-items:center;gap:12px"><span style="width:46px;height:46px;border-radius:14px;background:#dcfce7;color:#15803d;display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg></span><b style="font-size:18px">'+T[0]+'</b></div>'
        +'<div style="font-size:14.5px;font-weight:700;color:#334766;line-height:1.9">'+T[1]+'</div>'
        +body
        +'<button id="appMomentLater" style="border:0;background:none;font-family:inherit;font-size:14px;font-weight:800;color:#5b6b85;padding:8px;cursor:pointer">لاحقاً</button></div>';
      ov.addEventListener('click',function(e){ if(e.target===ov||e.target.id==='appMomentLater') ov.remove(); });
      D.body.appendChild(ov);
    });
  };
  // لحظة مؤجلة من صفحة ثانية (مثل النشر كزائر ثم التحويل للوحة)
  function pending(){ try{ var k=localStorage.getItem('mnq_app_moment'); if(k){ localStorage.removeItem('mnq_app_moment'); setTimeout(function(){ W.mnqAppMoment(k); },1800); } }catch(e){} }
  D.addEventListener('DOMContentLoaded',function(){ setTimeout(W.initAppDownload,1200); pending(); });
})();
