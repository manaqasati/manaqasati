/* ============================================================
   مناقصة — نظام التتبّع الموحّد (Meta · TikTok · Snapchat · Google)
   طريقة الاستخدام في أي مكان:  track('Register')  ·  track('Lead')
   ============================================================ */
(function () {
  'use strict';

  /* ── ١) ضع مُعرّفات البكسل هنا (اترك الفارغ كما هو لتعطيل منصّة) ── */
  var CONFIG = {
    metaPixelId:  '',   // مثال: '123456789012345'      (Meta / فيسبوك)
    tiktokPixelId:'',   // مثال: 'CXXXXXXXXXXXXXXXXXXX'  (TikTok)
    snapPixelId:  '',   // مثال: 'xxxxxxxx-xxxx-xxxx'    (Snapchat)
    googleId:     ''    // مثال: 'G-XXXXXXXXXX'          (Google GA4)
  };

  /* ── ٢) جدول ترجمة الأحداث الموحّدة لكل منصّة ── */
  var MAP = {
    PageView:      { meta:'PageView',              tt:'Pageview',        snap:'PAGE_VIEW',        g:'page_view' },
    Register:      { meta:'CompleteRegistration',  tt:'CompleteRegistration', snap:'SIGN_UP',    g:'sign_up' },
    Lead:          { meta:'Lead',                   tt:'SubmitForm',      snap:'SUBMIT',           g:'generate_lead' },
    StartPost:     { meta:'InitiateCheckout',        tt:'InitiateCheckout',snap:'START_CHECKOUT',   g:'begin_post' },
    Bid:           { meta:'SubmitApplication',      tt:'SubmitForm',      snap:'CUSTOM_EVENT_1',   g:'submit_application' },
    Search:        { meta:'Search',                 tt:'Search',          snap:'SEARCH',           g:'search' },
    ViewContent:   { meta:'ViewContent',            tt:'ViewContent',     snap:'VIEW_CONTENT',     g:'view_item' },
    Contact:       { meta:'Contact',                tt:'Contact',         snap:'CUSTOM_EVENT_2',   g:'contact' },
    Purchase:      { meta:'Purchase',               tt:'CompletePayment', snap:'PURCHASE',         g:'purchase' },
    /* إشارات الاهتمام */
    Engaged:       { meta:'ViewContent',            tt:'ViewContent',     snap:'CUSTOM_EVENT_3',   g:'engaged_30s' },
    ScrollDeep:    { meta:'ViewContent',            tt:'ViewContent',     snap:'CUSTOM_EVENT_4',   g:'scroll_75' },
    BrowseIntent:  { meta:'ViewContent',            tt:'ClickButton',     snap:'CUSTOM_EVENT_5',   g:'browse_intent' }
  };

  /* ── ٣) تحميل سكربتات المنصّات (فقط المفعّلة) ── */
  function loadMeta(id){
    if(!id) return;
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', id); window.fbq('track','PageView');
  }
  function loadTikTok(id){
    if(!id) return;
    !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
    ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];
    ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
    for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
    ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
    ttq.load=function(e,n){var i='https://analytics.tiktok.com/i18n/pixel/events.js';ttq._i=ttq._i||{};
    ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};
    var o=d.createElement('script');o.type='text/javascript';o.async=!0;o.src=i+'?sdkid='+e+'&lib='+t;
    var a=d.getElementsByTagName('script')[0];a.parentNode.insertBefore(o,a)};
    ttq.load(id);ttq.page();}(window,document,'ttq');
  }
  function loadSnap(id){
    if(!id) return;
    (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?
    a.handleRequest.apply(a,arguments):a.queue.push(arguments)};a.queue=[];var s='script';
    var r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];
    u.parentNode.insertBefore(r,u)})(window,document,'https://sc-static.net/scevent.min.js');
    window.snaptr('init', id); window.snaptr('track','PAGE_VIEW');
  }
  function loadGoogle(id){
    if(!id) return;
    var s=document.createElement('script');s.async=!0;
    s.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.appendChild(s);
    window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};
    window.gtag('js',new Date());window.gtag('config',id);
  }

  loadMeta(CONFIG.metaPixelId);
  loadTikTok(CONFIG.tiktokPixelId);
  loadSnap(CONFIG.snapPixelId);
  loadGoogle(CONFIG.googleId);

  /* ── ٤) الدالة الموحّدة ── */
  window.track = function (eventName, params) {
    params = params || {};
    var m = MAP[eventName];
    if (!m) { console.warn('[track] حدث غير معروف:', eventName); return; }
    try { if (window.fbq && CONFIG.metaPixelId)   window.fbq('track', m.meta, params); } catch (e) {}
    try { if (window.ttq && CONFIG.tiktokPixelId)  window.ttq.track(m.tt, params); } catch (e) {}
    try { if (window.snaptr && CONFIG.snapPixelId) window.snaptr('track', m.snap, params); } catch (e) {}
    try { if (window.gtag && CONFIG.googleId)      window.gtag('event', m.g, params); } catch (e) {}
  };

  /* ── ٥) إشارات الاهتمام التلقائية ── */

  // (أ) زائر مهتمّ: بقي ٣٠ ثانية فعّالة على الصفحة
  var activeMs = 0, lastTick = Date.now(), engagedFired = false;
  function tickEngaged() {
    if (document.visibilityState === 'visible') activeMs += Date.now() - lastTick;
    lastTick = Date.now();
    if (!engagedFired && activeMs >= 30000) { engagedFired = true; window.track('Engaged'); }
  }
  document.addEventListener('visibilitychange', function () { lastTick = Date.now(); });
  setInterval(tickEngaged, 2000);

  // (ب) تمرير عميق: قرأ ٧٥٪ من الصفحة
  var scrollFired = false;
  window.addEventListener('scroll', function () {
    if (scrollFired) return;
    var scrolled = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
    if (scrolled >= 0.75) { scrollFired = true; window.track('ScrollDeep'); }
  }, { passive: true });

  // (ج) نيّة التصفّح: أي رابط/زر فيه data-track-browse أو يشير لأقسام المزودين/المشاريع
  var browseFired = false;
  document.addEventListener('click', function (ev) {
    if (browseFired) return;
    var el = ev.target.closest('[data-track-browse], a[href*="providers"], a[href*="projects"], a[href="#providers"], a[href="#projects"]');
    if (el) { browseFired = true; window.track('BrowseIntent'); }
  }, true);

})();
