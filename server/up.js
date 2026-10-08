/* مناقصة — شريط نسبة الرفع لكل الصفحات
   يلتقط أي طلب يرفع ملفات (نص كبير أو FormData أو Blob) ويعرض «جاري الرفع 45%».
   الصفحات اللي عندها عدّاد خاص (upload.onprogress) ما يتكرر عليها الشريط. */
(function(){
  if (window.__mqUp) return; window.__mqUp = true;
  var BIG = 120000; // ~120KB نص = غالباً فيه صورة/ملف
  function isUpload(body){
    if (!body) return false;
    if (typeof body === 'string') return body.length > BIG;
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      try { var it = body.values(), v; while(!(v = it.next()).done){ if (typeof Blob !== 'undefined' && v.value instanceof Blob) return true; } } catch(e){}
      return false;
    }
    if (typeof Blob !== 'undefined' && body instanceof Blob) return body.size > BIG;
    return false;
  }
  // ── الشريط ──
  var box, bar, txt, active = 0, hideT;
  function ui(){
    if (box) return;
    var st = document.createElement('style');
    st.textContent = '#mq-up{position:fixed;left:50%;top:calc(12px + env(safe-area-inset-top,0px));transform:translate(-50%,-20px);opacity:0;z-index:2147483000;background:#0f1d3d;color:#fff;border-radius:14px;padding:11px 16px 12px;min-width:240px;max-width:calc(100vw - 32px);box-shadow:0 12px 32px rgba(2,8,23,.35);font-family:Tajawal,system-ui,sans-serif;direction:rtl;transition:opacity .2s,transform .2s;pointer-events:none}'
      + '#mq-up.on{opacity:1;transform:translate(-50%,0)}#mq-up b{display:flex;justify-content:space-between;gap:14px;font-size:13.5px;font-weight:800}#mq-up b span{font-variant-numeric:tabular-nums;direction:ltr}'
      + '#mq-up i{display:block;height:6px;border-radius:6px;background:rgba(255,255,255,.18);margin-top:8px;overflow:hidden}#mq-up i s{display:block;height:100%;width:0;background:linear-gradient(90deg,#60a5fa,#22c55e);border-radius:6px;transition:width .15s}'
      + '#mq-up.wait i s{width:100%!important;animation:mqpulse 1s ease-in-out infinite}@keyframes mqpulse{50%{opacity:.45}}';
    document.head.appendChild(st);
    box = document.createElement('div'); box.id = 'mq-up';
    box.innerHTML = '<b><em style="font-style:normal">⬆️ جاري رفع الملفات…</em><span>0%</span></b><i><s></s></i>';
    document.body.appendChild(box);
    txt = box.querySelector('em'); bar = box.querySelector('s');
  }
  function show(){ ui(); clearTimeout(hideT); box.classList.remove('wait'); txt.textContent = '⬆️ جاري رفع الملفات…'; box.querySelector('span').textContent = '0%'; bar.style.width = '0%'; box.classList.add('on'); }
  function prog(p){ if (!box) return; if (p >= 100){ box.classList.add('wait'); txt.textContent = '✓ تم الرفع — جاري الحفظ…'; box.querySelector('span').textContent = '100%'; } else { box.querySelector('span').textContent = p + '%'; bar.style.width = p + '%'; } }
  function hide(){ if (!box) return; if (active > 0) return; hideT = setTimeout(function(){ box.classList.remove('on','wait'); }, 250); }
  // ── XMLHttpRequest ──
  var XO = XMLHttpRequest.prototype, _send = XO.send;
  XO.send = function(body){
    var x = this;
    try {
      if (isUpload(body) && !x.__mqOwn && !(x.upload && x.upload.onprogress)) {
        active++; show();
        x.upload.addEventListener('progress', function(ev){ if (ev.lengthComputable) prog(Math.min(100, Math.round(ev.loaded / ev.total * 100))); });
        x.upload.addEventListener('load', function(){ prog(100); });
        var done = function(){ active = Math.max(0, active - 1); hide(); };
        x.addEventListener('loadend', done);
      }
    } catch(e){}
    return _send.apply(this, arguments);
  };
  // ── fetch → XHR عند الرفع فقط (عشان نقدر نقيس النسبة) ──
  var _fetch = window.fetch;
  if (_fetch) window.fetch = function(input, init){
    init = init || {};
    var body = init.body;
    if (!isUpload(body) || typeof input !== 'string' && !(input instanceof URL)) return _fetch.apply(this, arguments);
    return new Promise(function(resolve, reject){
      var x = new XMLHttpRequest();
      x.open((init.method || 'POST').toUpperCase(), String(input), true);
      var h = init.headers || {};
      try {
        if (typeof Headers !== 'undefined' && h instanceof Headers) h.forEach(function(v,k){ x.setRequestHeader(k, v); });
        else if (Array.isArray(h)) h.forEach(function(p){ x.setRequestHeader(p[0], p[1]); });
        else Object.keys(h).forEach(function(k){ x.setRequestHeader(k, h[k]); });
      } catch(e){}
      if (init.credentials === 'include') x.withCredentials = true;
      x.responseType = 'blob';
      x.onload = function(){
        var hdrs = new Headers();
        String(x.getAllResponseHeaders() || '').trim().split(/[\r\n]+/).forEach(function(l){ var i = l.indexOf(':'); if (i > 0) { try { hdrs.append(l.slice(0, i).trim(), l.slice(i + 1).trim()); } catch(e){} } });
        var nb = [101,204,205,304].indexOf(x.status) >= 0;
        resolve(new Response(nb ? null : x.response, { status: x.status || 200, statusText: x.statusText, headers: hdrs }));
      };
      x.onerror = function(){ reject(new TypeError('Failed to fetch')); };
      x.ontimeout = function(){ reject(new TypeError('Failed to fetch')); };
      x.onabort = function(){ reject(new DOMException('Aborted', 'AbortError')); };
      if (init.signal) { if (init.signal.aborted) { x.abort(); return; } init.signal.addEventListener('abort', function(){ x.abort(); }); }
      x.send(body); // يمر على XO.send فوق → يظهر الشريط
    });
  };
})();

/* مناقصة — عدّاد الزيارات (مرة لكل فتح صفحة). بدون كوكيز، والسيرفر ما يخزّن IP */
(function(){
  try{
    if (window.__mqHit) return; window.__mqHit = true;
    var p = location.pathname || '/';
    if (/^\/dashboard-admin/.test(p) || /^\/api\//.test(p)) return;
    var q = new URLSearchParams(location.search || ''), t = null;
    try { t = localStorage.getItem('token'); } catch(e){}
    var app = !!window.ReactNativeWebView || /ManaqasaApp|Expo/i.test(navigator.userAgent || '');
    var body = JSON.stringify({ p: p, r: document.referrer || '', s: q.get('utm_source') || '', m: q.get('utm_medium') || '', app: app });
    var h = { 'Content-Type': 'application/json' }; if (t) h.Authorization = 'Bearer ' + t;
    var go = function(){ try { fetch('/api/hit', { method: 'POST', headers: h, body: body, keepalive: true, credentials: 'same-origin' }).catch(function(){}); } catch(e){} };
    if (document.readyState === 'complete') setTimeout(go, 300); else window.addEventListener('load', function(){ setTimeout(go, 300); });
  }catch(e){}
})();

/* مناقصة — زر الرجوع يقفل النوافذ المنبثقة
   أي نافذة تنفتح فوق الصفحة (تفاصيل مشروع، تقييم، تأكيد، معرض صور…) تنقفل بزر الرجوع في الجوال/المتصفح
   بدل ما يطلع من الصفحة أو يغيّر القسم اللي تحتها. */
(function(){
  if (window.mqBack) return;
  var W = window, D = document, stack = [], skip = 0, seq = 0;
  function push(close, el){
    var e = { id: ++seq, close: close, el: el || null };
    stack.push(e);
    try { history.pushState({ mqb: e.id }, '', location.href); } catch(_){}
    return e;
  }
  function release(e){
    var i = stack.indexOf(e); if (i < 0) return; stack.splice(i, 1);
    // نرجع خطوة بس إذا آخر شي في السجل هو حقنا (لو الصفحة انتقلت لقسم ثاني نخليه)
    if (history.state && history.state.mqb === e.id) { skip++; try { history.back(); } catch(_){ skip--; } }
  }
  W.addEventListener('popstate', function(ev){
    if (skip > 0) { skip--; ev.stopImmediatePropagation(); return; }
    if (stack.length) { var e = stack.pop(); ev.stopImmediatePropagation(); try { e.close(); } catch(_){} return; }
    // وصلنا لخطوة قديمة حقتنا (النافذة انقفلت بطريقة ثانية) → نكمل رجوع
    if (ev.state && ev.state.mqb) { ev.stopImmediatePropagation(); try { history.back(); } catch(_){} }
  }, true);
  function drop(e){ var i = stack.indexOf(e); if (i >= 0) stack.splice(i, 1); } // انقفلت لأنه انتقل لصفحة/قسم ثاني: نخلي السجل
  W.mqBack = { push: push, release: release, drop: drop };

  // ── مراقبة النوافذ المنبثقة في كل الصفحات ──
  var EX = /^(mqg|mq-fv|mq-up|mqMore|mnav|mnqSplash|toast|app)$/;
  var tracked = [];
  function vis(el){
    if (!el || el.nodeType !== 1 || !el.isConnected) return false;
    var cs = W.getComputedStyle(el);
    if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false;
    var r = el.getBoundingClientRect();
    return r.width >= W.innerWidth * 0.85 && r.height >= W.innerHeight * 0.5;
  }
  function excluded(el){
    return EX.test(el.id || '') || el.hasAttribute('data-noback') || /splash|toast|loader/i.test(el.className && el.className.baseVal == null ? el.className : '') || !!(el.closest && el.closest('#mqg,#mq-fv,#mqMore,#mnav,[data-noback]'));
  }
  function isTracked(el){ for (var i = 0; i < tracked.length; i++) if (tracked[i].el === el) return true; return false; }
  function txt(b){ return (b.textContent || '').replace(/\s+/g, '').trim(); }
  function shut(el){
    // 1) زر الإغلاق داخل النافذة
    var bs = el.querySelectorAll('button,a,[role=button],span,div');
    var btn = null;
    for (var i = 0; i < bs.length && !btn; i++) {
      var b = bs[i], oc = b.getAttribute('onclick') || '', al = b.getAttribute('aria-label') || '', t = txt(b);
      if (b.closest('[data-noback]')) continue;
      if (/إغلاق|اغلاق|close/i.test(al) || /^(✕|×|✖|X|إغلاق|إلغاء|رجوع)$/.test(t) || (/close|Close|cancel|Cancel|hide|Hide|_cl\b/.test(oc) && t.length < 14)) btn = b;
    }
    if (btn) btn.click();
    if (!vis(el)) return;
    // 2) الضغط على الخلفية (أغلب النوافذ تنقفل كذا)
    try { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })); } catch(_){}
    if (!vis(el)) return;
    // 3) آخر حل: نخفيها
    ['show', 'on', 'open', 'active', 'visible'].forEach(function(c){ el.classList.remove(c); });
    if (vis(el)) el.style.display = 'none';
    D.documentElement.style.overflow = ''; D.body.style.overflow = '';
  }
  // نافذة منبثقة فعلاً (مو صفحة كاملة): اسمها يدل، أو خلفيتها شفافة شوي
  function popupish(el){
    var nm = (el.id || '') + ' ' + (typeof el.className === 'string' ? el.className : '');
    if (/overlay|modal|sheet|viewer|dialog|popup|drawer|backdrop|lightbox|(^|[-_ ])ov([-_ A-Z]|$)|Ov\b|wrap/i.test(nm)) return true;
    if (el.getAttribute('role') === 'dialog' || el.getAttribute('aria-modal') === 'true') return true;
    var m = /rgba?\(([^)]+)\)/.exec(W.getComputedStyle(el).backgroundColor || ''); if (!m) return false;
    var p = m[1].split(','); var a = p.length > 3 ? parseFloat(p[3]) : 1;
    return a > 0.05 && a < 0.97;
  }
  function consider(el){
    if (!el || el.nodeType !== 1 || isTracked(el) || excluded(el) || !vis(el) || !popupish(el)) return;
    var t = { el: el }; tracked.push(t);
    t.e = push(function(){ t.byBack = true; shut(el); drop(t); }, el);
  }
  function drop(t){ var i = tracked.indexOf(t); if (i >= 0) tracked.splice(i, 1); }
  function recheck(){
    tracked.slice().forEach(function(t){ if (!vis(t.el)) { drop(t); if (!t.byBack) release(t.e); } });
  }
  var pend = null, cand = [];
  function flush(){
    pend = null; var c = cand; cand = [];
    recheck();
    for (var i = 0; i < c.length; i++) consider(c[i]);
  }
  function start(){
    if (!W.MutationObserver) return;
    new MutationObserver(function(ms){
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'attributes') cand.push(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) { var n = m.addedNodes[j]; if (n.nodeType === 1) { cand.push(n); for (var k = 0; k < n.children.length && k < 8; k++) cand.push(n.children[k]); } }
      }
      if (!pend) pend = setTimeout(flush, 30);
    }).observe(D.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open'] });
  }
  if (D.readyState === 'complete') setTimeout(start, 600); else W.addEventListener('load', function(){ setTimeout(start, 600); });
})();

/* مناقصة — معرض الصور (كل الصفحات، الموقع والتطبيق)
   تضغط أي صورة → تنفتح فوق الصفحة، تسحب يمين/يسار للصورة اللي بعدها، تكبّر بالأصابع أو ضغطتين،
   وتقفل بزر «رجوع» أو زر الرجوع في الجوال أو السحب لتحت أو Esc. ما تطلع من الموقع أبداً. */
(function(){
  if (window.mqGallery) return;
  var W = window, D = document, ua = navigator.userAgent || '';
  var app = !!W.ReactNativeWebView || /ManaqasaApp|Expo|; wv\)/i.test(ua);
  var IMGX = /\.(jpe?g|png|webp|gif|heic|avif)(\?|#|$)/i;
  function isImgUrl(u){
    if (!u) return false; u = String(u);
    if (/^data:image\//i.test(u)) return true;
    if (!/^(https?:)?\/\//i.test(u) && u.charAt(0) !== '/') return false;
    try { var a = new URL(u, location.href); if (a.pathname.indexOf('/api/') === 0) return false; return IMGX.test(a.pathname); } catch(e){ return false; }
  }
  function abs(u){ if (/^data:/i.test(u)) return u; try { return new URL(u, location.href).href; } catch(e){ return u; } }
  var VIEW = /openImgFull|oImg|openViewer|_viewImg|window\.open\(this/;
  // رابط الصورة الكاملة لعنصر (رابط أو صورة أو مربع فيه data-s / data-src)
  function urlOf(el){
    if (!el || el.nodeType !== 1) return '';
    if (el.tagName === 'A') { var h = el.getAttribute('href') || ''; return isImgUrl(h) ? abs(h) : ''; }
    var d = el.getAttribute('data-full') || el.getAttribute('data-s') || el.getAttribute('data-src');
    if (d && isImgUrl(d)) return abs(d);
    if (el.tagName === 'IMG') { var s = el.currentSrc || el.getAttribute('src') || ''; if (isImgUrl(s) || /^https?:/i.test(s)) return abs(s); }
    return '';
  }
  function isItem(el){
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === 'A') return !!urlOf(el);
    var oc = el.getAttribute('onclick') || '';
    if (el.hasAttribute('data-gal')) return !!urlOf(el);
    if ((el.hasAttribute('data-s') || el.hasAttribute('data-src') || el.hasAttribute('data-full')) && urlOf(el)) return true;
    return el.tagName === 'IMG' && VIEW.test(oc) && !!urlOf(el);
  }
  // نجمع الصور اللي جنب الصورة المضغوطة (نفس الشبكة/البطاقة) عشان تتنقل بينها
  function collect(el, u){
    u = abs(u);
    var start = el && el.nodeType === 1 ? (el.closest('a[href],[data-s],[data-src],[data-full],[data-gal],img') || el) : null;
    var p = start, lvl = 0, list = null;
    while (p && p !== D.body && lvl < 6) {
      p = p.parentElement; lvl++;
      if (!p || p === D.body) break;
      var items = [].slice.call(p.querySelectorAll('a[href],img,[data-s],[data-src],[data-full],[data-gal]')).filter(isItem);
      var urls = []; items.forEach(function(x){ var v = urlOf(x); if (v && urls.indexOf(v) < 0 && !x.closest('#mqg')) urls.push(v); });
      if (urls.length >= 2 && urls.indexOf(u) >= 0) { list = urls; break; }
    }
    if (!list) list = [u];
    return { list: list, i: Math.max(0, list.indexOf(u)) };
  }

  var box, track, cnt, thumbs, prevB, nextB, shareB, dlB, imgs = [], cur = 0, open_ = false, bk = null, rtlNeg = null, scale = 1, base = null;
  function css(){
    var st = D.createElement('style');
    st.textContent = '#mqg{position:fixed;inset:0;z-index:2147483640;background:#05080f;display:none;flex-direction:column;direction:rtl;font-family:Tajawal,system-ui,sans-serif;color:#fff;touch-action:none;transition:background .15s}'
      + '#mqg.on{display:flex}'
      + '#mqg .g-h{display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;position:relative;z-index:3;background:linear-gradient(#05080fcc,#05080f00)}'
      + '#mqg .g-bk:focus{outline:none}#mqg .g-bk:focus-visible{outline:3px solid #60a5fa;outline-offset:2px}#mqg .g-bk{display:flex;align-items:center;gap:6px;background:#fff;color:#0f1d3d;border:0;border-radius:12px;padding:9px 14px;font:800 14px Tajawal,system-ui,sans-serif;cursor:pointer;flex-shrink:0;min-height:42px}'
      + '#mqg .g-c{flex:1;text-align:center;font-size:14px;font-weight:800;font-variant-numeric:tabular-nums;opacity:.92}'
      + '#mqg .g-ac{width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;text-decoration:none}#mqg .g-ac[hidden]{display:none}'
      + '#mqg .g-st{flex:1;position:relative;min-height:0;transition:transform .2s,opacity .2s}'
      + '#mqg .g-t{position:absolute;inset:0;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;touch-action:pan-x}'
      + '#mqg .g-t::-webkit-scrollbar{display:none}#mqg.zoom .g-t{overflow-x:hidden;scroll-snap-type:none}'
      + '#mqg .g-s{flex:0 0 100%;width:100%;height:100%;scroll-snap-align:center;scroll-snap-stop:always;display:flex;overflow:hidden;direction:ltr;position:relative}'
      + '#mqg .g-s.z{overflow:auto;touch-action:pan-x pan-y}'
      + '#mqg .g-i{margin:auto;max-width:100%;max-height:100%;object-fit:contain;user-select:none;-webkit-user-select:none;-webkit-user-drag:none;transition:opacity .2s;opacity:0}#mqg .g-i.ok{opacity:1}'
      + '#mqg .g-s.z .g-i{max-width:none;max-height:none;transition:none}'
      + '#mqg .g-sp{position:absolute;top:50%;left:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:mqgr 1s linear infinite}@keyframes mqgr{to{transform:rotate(360deg)}}'
      + '#mqg .g-er{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:14px;font-weight:700;text-align:center;padding:20px}'
      + '#mqg .g-ar{position:absolute;top:50%;transform:translateY(-50%);z-index:2;width:48px;height:48px;border-radius:50%;border:0;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;display:none;align-items:center;justify-content:center;backdrop-filter:blur(6px)}'
      + '#mqg .g-ar:hover{background:rgba(255,255,255,.26)}#mqg .g-ar[disabled]{opacity:.25;cursor:default}#mqg .g-pv{right:14px}#mqg .g-nx{left:14px}'
      + '@media(hover:hover) and (pointer:fine){#mqg.multi .g-ar{display:flex}}'
      + '#mqg .g-th{display:none;gap:6px;padding:8px 12px calc(10px + env(safe-area-inset-bottom,0px));overflow-x:auto;scrollbar-width:none;justify-content:safe center;z-index:3}#mqg .g-th::-webkit-scrollbar{display:none}'
      + '#mqg.multi .g-th{display:flex}#mqg.zoom .g-th{opacity:.25}'
      + '#mqg .g-th button{flex:0 0 auto;width:52px;height:52px;border-radius:10px;overflow:hidden;border:2px solid transparent;padding:0;background:#1e293b;cursor:pointer;opacity:.55}'
      + '#mqg .g-th button.on{border-color:#fff;opacity:1}#mqg .g-th img{width:100%;height:100%;object-fit:cover;display:block}'
      + '#mqg .g-hint{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.55);border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:700;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .3s;z-index:2}#mqg .g-hint.on{opacity:1}';
    D.head.appendChild(st);
  }
  var IC = {
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    r: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    l: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    sh: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6"/></svg>',
    dl: '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>'
  };
  function ui(){
    if (box) return;
    css();
    box = D.createElement('div'); box.id = 'mqg'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'عرض الصور');
    box.innerHTML = '<div class="g-h"><button type="button" class="g-bk" data-a="close">' + IC.x + 'رجوع</button><div class="g-c" aria-live="polite"></div>'
      + '<a class="g-ac" data-a="dl" hidden aria-label="تحميل الصورة">' + IC.dl + '</a><button type="button" class="g-ac" data-a="share" hidden aria-label="مشاركة">' + IC.sh + '</button></div>'
      + '<div class="g-st"><div class="g-t"></div><button type="button" class="g-ar g-pv" data-a="prev" aria-label="الصورة السابقة">' + IC.r + '</button><button type="button" class="g-ar g-nx" data-a="next" aria-label="الصورة التالية">' + IC.l + '</button><div class="g-hint">اسحب يمين أو يسار عشان تتنقّل بين الصور</div></div>'
      + '<div class="g-th"></div>';
    D.body.appendChild(box);
    track = box.querySelector('.g-t'); cnt = box.querySelector('.g-c'); thumbs = box.querySelector('.g-th');
    prevB = box.querySelector('.g-pv'); nextB = box.querySelector('.g-nx'); shareB = box.querySelector('[data-a="share"]'); dlB = box.querySelector('[data-a="dl"]');
    // اتجاه التمرير في RTL (المتصفحات الحديثة: سالب)
    track.style.direction = 'rtl';
    box.addEventListener('click', function(e){
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'close') close();
      else if (a === 'prev') go(cur - 1);
      else if (a === 'next') go(cur + 1);
      else if (a === 'share') share();
      else if (a === 'th') go(+b.getAttribute('data-i'));
    });
    var st;
    track.addEventListener('scroll', function(){ clearTimeout(st); st = setTimeout(sync, 60); }, { passive: true });
    gestures();
  }
  function idxNow(){ var w = track.clientWidth || 1; return Math.max(0, Math.min(imgs.length - 1, Math.round(Math.abs(track.scrollLeft) / w))); }
  function sync(){ if (!open_) return; var i = idxNow(); if (i !== cur) { resetZoom(); cur = i; } paint(); }
  function paint(){
    var n = imgs.length;
    cnt.textContent = n > 1 ? (cur + 1) + ' من ' + n : '';
    prevB.disabled = cur <= 0; nextB.disabled = cur >= n - 1;
    [].forEach.call(thumbs.children, function(b, i){ b.classList.toggle('on', i === cur); });
    var on = thumbs.children[cur]; if (on && thumbs.scrollWidth > thumbs.clientWidth) { try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch(e){} }
    for (var k = cur - 1; k <= cur + 2; k++) load(k);
    var u = imgs[cur] || '';
    shareB.hidden = !(navigator.share && /^https?:/i.test(u));
    var canDl = !app && shareB.hidden && /^https?:/i.test(u) && /\.r2\.dev\/|r2\.cloudflarestorage\.com\/|res\.cloudinary\.com\//i.test(u);
    dlB.hidden = !canDl; if (canDl) dlB.href = '/api/dl?u=' + encodeURIComponent(u) + '&n=' + encodeURIComponent('manaqasa-' + (cur + 1));
  }
  function load(k){
    var s = track.children[k]; if (!s || s._l) return; s._l = 1;
    var im = s.querySelector('img');
    im.onload = function(){ im.classList.add('ok'); var sp = s.querySelector('.g-sp'); if (sp) sp.remove(); };
    im.onerror = function(){ var sp = s.querySelector('.g-sp'); if (sp) sp.remove(); s.insertAdjacentHTML('beforeend', '<div class="g-er">تعذّر تحميل الصورة<br>تأكد من الاتصال</div>'); };
    im.src = imgs[k];
  }
  function go(i, instant){
    if (i < 0 || i >= imgs.length) return;
    resetZoom(); cur = i;
    var w = track.clientWidth;
    track.scrollTo({ left: (rtlNeg ? -1 : 1) * i * w, behavior: instant ? 'auto' : 'smooth' });
    paint();
  }
  function share(){ var u = imgs[cur]; if (!u || !navigator.share) return; navigator.share({ url: u, title: 'صورة من مناقصة' }).catch(function(){}); }
  // ── التكبير ──
  function slide(){ return track.children[cur]; }
  function setScale(s, cx, cy){
    var sl = slide(); if (!sl) return; var im = sl.querySelector('img'); if (!im || !im.naturalWidth) return;
    s = Math.max(1, Math.min(4, s));
    if (s <= 1.02) { resetZoom(); return; }
    if (!base) { var r0 = im.getBoundingClientRect(); base = { w: r0.width, h: r0.height }; }
    var r = sl.getBoundingClientRect(); cx = cx == null ? r.width / 2 : cx - r.left; cy = cy == null ? r.height / 2 : cy - r.top;
    var ow = Math.max(base.w * scale, r.width), oh = Math.max(base.h * scale, r.height);
    var fx = (sl.scrollLeft + cx) / ow, fy = (sl.scrollTop + cy) / oh;
    scale = s; sl.classList.add('z'); box.classList.add('zoom');
    im.style.width = (base.w * s) + 'px'; im.style.height = (base.h * s) + 'px';
    var nw = Math.max(base.w * s, r.width), nh = Math.max(base.h * s, r.height);
    sl.scrollLeft = fx * nw - cx; sl.scrollTop = fy * nh - cy;
  }
  function resetZoom(){
    if (scale === 1 && !base) return;
    var sl = slide(); scale = 1; base = null; box.classList.remove('zoom');
    [].forEach.call(track.querySelectorAll('.g-s.z'), function(x){ x.classList.remove('z'); var im = x.querySelector('img'); if (im) { im.style.width = ''; im.style.height = ''; } x.scrollLeft = 0; x.scrollTop = 0; });
  }
  function gestures(){
    var t0 = 0, tx = 0, ty = 0, pinch = null, drag = null, lastTap = 0;
    track.addEventListener('touchstart', function(e){
      if (e.touches.length === 2) {
        var a = e.touches[0], b = e.touches[1];
        pinch = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), s: scale, x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; drag = null; return;
      }
      if (e.touches.length === 1) { var t = e.touches[0]; tx = t.clientX; ty = t.clientY; t0 = Date.now(); drag = scale === 1 ? { y: t.clientY, x: t.clientX, v: false } : null; }
    }, { passive: true });
    track.addEventListener('touchmove', function(e){
      if (pinch && e.touches.length === 2) {
        var a = e.touches[0], b = e.touches[1], d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        setScale(pinch.s * d / pinch.d, pinch.x, pinch.y); if (e.cancelable) e.preventDefault(); return;
      }
      if (drag && e.touches.length === 1) {
        var t = e.touches[0], dy = t.clientY - drag.y, dx = t.clientX - drag.x;
        if (!drag.v && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx) * 1.4) drag.v = true;
        if (drag.v) { var st = box.querySelector('.g-st'); st.style.transition = 'none'; st.style.transform = 'translateY(' + dy + 'px)'; box.style.background = 'rgba(5,8,15,' + Math.max(0.35, 1 - Math.abs(dy) / 500) + ')'; if (e.cancelable) e.preventDefault(); }
      }
    }, { passive: false });
    track.addEventListener('touchend', function(e){
      if (pinch) { if (e.touches.length < 2) { pinch = null; if (scale < 1.05) resetZoom(); } return; }
      if (drag && drag.v) {
        var st = box.querySelector('.g-st'), dy = (e.changedTouches[0] || {}).clientY - drag.y; st.style.transition = '';
        if (Math.abs(dy) > 110) { st.style.transform = 'translateY(' + (dy > 0 ? 100 : -100) + '%)'; st.style.opacity = '0'; setTimeout(close, 160); }
        else { st.style.transform = ''; box.style.background = ''; }
        drag = null; return;
      }
      drag = null;
      // ضغطتين = تكبير/تصغير
      var t = e.changedTouches[0]; if (!t || Date.now() - t0 > 250 || Math.hypot(t.clientX - tx, t.clientY - ty) > 12) return;
      var now = Date.now();
      if (now - lastTap < 300) { lastTap = 0; if (scale > 1) resetZoom(); else setScale(2.5, t.clientX, t.clientY); if (e.cancelable) e.preventDefault(); }
      else lastTap = now;
    });
    track.addEventListener('dblclick', function(e){ if (e.target.tagName !== 'IMG') return; if (scale > 1) resetZoom(); else setScale(2.5, e.clientX, e.clientY); });
    track.addEventListener('wheel', function(e){ if (!e.ctrlKey) return; e.preventDefault(); setScale(scale * (e.deltaY < 0 ? 1.15 : 0.87), e.clientX, e.clientY); }, { passive: false });
    D.addEventListener('keydown', function(e){
      if (!open_) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur - 1); }
    });
    W.addEventListener('resize', function(){ if (open_) { resetZoom(); go(cur, true); } });
  }
  function show(list, i){
    list = (list || []).map(abs).filter(function(u, k, a){ return u && a.indexOf(u) === k && (/^data:image\//i.test(u) || /^https?:/i.test(u)); });
    if (!list.length) return false;
    ui(); imgs = list; cur = Math.max(0, Math.min(list.length - 1, i || 0)); scale = 1; base = null;
    var st = box.querySelector('.g-st'); st.style.transform = ''; st.style.opacity = ''; box.style.background = '';
    track.innerHTML = list.map(function(){ return '<div class="g-s"><span class="g-sp"></span><img class="g-i" alt="" draggable="false"></div>'; }).join('');
    thumbs.innerHTML = list.length > 1 ? list.map(function(u, k){ return '<button type="button" data-a="th" data-i="' + k + '" aria-label="صورة ' + (k + 1) + '"><img loading="lazy" alt="" src="' + u.replace(/"/g, '%22') + '"></button>'; }).join('') : '';
    box.classList.toggle('multi', list.length > 1); box.classList.remove('zoom');
    box.classList.add('on'); open_ = true;
    if (rtlNeg === null) { track.style.scrollSnapType = 'none'; track.scrollLeft = -10; rtlNeg = track.scrollLeft < 0; track.scrollLeft = 0; track.style.scrollSnapType = ''; }
    D.documentElement.style.overflow = 'hidden';
    if (!bk) bk = W.mqBack ? W.mqBack.push(function(){ bk = null; hide(); }) : null;
    requestAnimationFrame(function(){ go(cur, true); });
    // تلميح السحب أول مرة بس
    if (list.length > 1 && ('ontouchstart' in W)) { var hk = 'mqg_hint'; var seen = false; try { seen = localStorage.getItem(hk); } catch(e){} if (!seen) { var h = box.querySelector('.g-hint'); h.classList.add('on'); setTimeout(function(){ h.classList.remove('on'); }, 2600); try { localStorage.setItem(hk, '1'); } catch(e){} } }
    return true;
  }
  function close(){
    if (!open_) return;
    hide();
    if (bk) { var e = bk; bk = null; W.mqBack.release(e); }
  }
  function hide(){
    open_ = false; resetZoom();
    if (box) { box.classList.remove('on'); track.innerHTML = ''; thumbs.innerHTML = ''; }
    D.documentElement.style.overflow = '';
  }
  // من عنصر مضغوط: نجمع اللي جنبه
  function openFrom(el, u){
    if (!el) { var ev = W.event; el = ev && ev.target && ev.target.nodeType === 1 ? ev.target : null; }
    if (!u) u = urlOf(el && (el.closest('a[href],[data-s],[data-src],[data-full],[data-gal],img') || el));
    if (!u) return false;
    var c = collect(el, u); return show(c.list, c.i);
  }
  W.mqGallery = { open: function(list, i){ return show(Array.isArray(list) ? list : [list], i); }, openFrom: openFrom, isImg: isImgUrl };
  // أي رابط صورة (في الموقع والتطبيق) يفتح هنا بدل ما يطلع من الصفحة
  D.addEventListener('click', function(e){
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.closest('#mqg') || a.hasAttribute('download') || a.hasAttribute('data-raw')) return;
    var h = a.getAttribute('href'); if (!isImgUrl(h)) return;
    if (openFrom(a, abs(h))) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  var _wo = W.open;
  W.open = function(u){ try { if (u && isImgUrl(String(u)) && openFrom(null, abs(String(u)))) return null; } catch(e){} return _wo.apply(W, arguments); };
})();

/* مناقصة — عارض الملفات داخل التطبيق
   داخل التطبيق (WebView) فتح رابط PDF/صورة يستبدل الصفحة كلها وما فيه زر رجوع → المستخدم يعلق.
   هنا نلتقط أي فتح لملف ونعرضه في نافذة فوق الصفحة مع زر «رجوع» واضح (وزر الرجوع في أندرويد يقفلها). */
(function(){
  if (window.__mqViewer) return; window.__mqViewer = true;
  var W = window, D = document, ua = navigator.userAgent || '';
  var app = !!W.ReactNativeWebView || /ManaqasaApp|Expo|; wv\)/i.test(ua);
  var standalone = false; try { standalone = W.navigator.standalone === true || (W.matchMedia && W.matchMedia('(display-mode: standalone)').matches); } catch(e){}
  // كل الأجهزة: PDF والصور تنفتح فوق الصفحة (ما نطلع لتبويب جديد)

  var IMG = /^(jpe?g|png|webp|gif|heic)$/i, OTHER = /^(dwg|dxf|xlsx?|docx?|zip|rar|7z|csv|rvt|pptx?)$/i;
  function kind(u){
    if (!u) return null; u = String(u);
    if (/^data:application\/pdf/i.test(u)) return 'pdf';
    if (/^data:image\//i.test(u)) return 'img';
    if (!/^(https?:)?\/\//i.test(u) && u.charAt(0) !== '/') return null;
    var a; try { a = new URL(u, location.href); } catch(e){ return null; }
    if (a.pathname.indexOf('/api/') === 0) return null;
    var ext = ((a.pathname.match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toLowerCase();
    if (ext === 'pdf') return 'pdf';
    if (IMG.test(ext)) return 'img';
    if (OTHER.test(ext)) return 'other';
    return null;
  }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function nameOf(u, txt){
    txt = String(txt || '').replace(/\s+/g, ' ').trim();
    if (txt && txt.length <= 80 && !/^https?:/i.test(txt)) return txt.replace(/^[📄📎📝📊🖼️\s]+/u, '') || txt;
    if (/^data:/i.test(u)) return 'ملف';
    try { return decodeURIComponent(new URL(u, location.href).pathname.split('/').pop()) || 'ملف'; } catch(e){ return 'ملف'; }
  }

  var box, body, ttl, zoom = 1, isOpen = false, bk = null, curPdf = null, token = 0;
  function ui(){
    if (box) return;
    var st = D.createElement('style');
    st.textContent = '#mq-fv{position:fixed;inset:0;z-index:2147483600;background:#0b1220;display:none;flex-direction:column;direction:rtl;font-family:Tajawal,system-ui,sans-serif}'
      + '#mq-fv.on{display:flex}'
      + '#mq-fv .mqv-h{display:flex;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;background:#0f1d3d;color:#fff;box-shadow:0 2px 12px rgba(0,0,0,.3)}'
      + '#mq-fv .mqv-bk{display:flex;align-items:center;gap:6px;background:#fff;color:#0f1d3d;border:0;border-radius:12px;padding:9px 14px;font:800 14px Tajawal,system-ui,sans-serif;cursor:pointer;flex-shrink:0}'
      + '#mq-fv .mqv-t{flex:1;min-width:0;unicode-bidi:plaintext;text-align:right;font-size:13.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:.9}'
      + '#mq-fv .mqv-z{width:38px;height:38px;border-radius:11px;border:1px solid rgba(255,255,255,.25);background:transparent;color:#fff;font:800 19px system-ui;cursor:pointer;flex-shrink:0}'
      + '#mq-fv .mqv-b{flex:1;overflow:auto;direction:ltr;-webkit-overflow-scrolling:touch;padding:12px 10px calc(16px + env(safe-area-inset-bottom,0px));touch-action:pan-x pan-y pinch-zoom}'
      + '@media(min-width:1000px){#mq-fv .mqv-b{padding-left:calc(50% - 460px);padding-right:calc(50% - 460px)}}'
      + '#mq-fv .mqv-pg{display:block;margin:0 auto 10px;background:#fff;border-radius:4px;box-shadow:0 2px 10px rgba(0,0,0,.4);max-width:none}'
      + '#mq-fv .mqv-msg{color:#cbd5e1;text-align:center;padding:40px 18px;font-size:14.5px;line-height:1.9}'
      + '#mq-fv .mqv-msg b{display:block;color:#fff;font-size:16px;margin-bottom:6px}'
      + '#mq-fv .mqv-ac{background:rgba(255,255,255,.14);color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:11px;padding:8px 11px;font:800 13px Tajawal,system-ui,sans-serif;cursor:pointer;flex-shrink:0}#mq-fv .mqv-ac[hidden]{display:none}'
      + '#mq-fv .mqv-cp{margin-top:14px;background:#2563eb;color:#fff;border:0;border-radius:12px;padding:11px 18px;font:800 14px Tajawal,system-ui,sans-serif;cursor:pointer}';
    D.head.appendChild(st);
    box = D.createElement('div'); box.id = 'mq-fv'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<div class="mqv-h"><button type="button" class="mqv-bk" data-a="close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>رجوع</button><div class="mqv-t"></div>'
      + '<button type="button" class="mqv-ac" data-a="save" hidden>حفظ</button><button type="button" class="mqv-ac" data-a="share" hidden>مشاركة</button>'
      + '<button type="button" class="mqv-z" data-a="out" aria-label="تصغير">−</button><button type="button" class="mqv-z" data-a="in" aria-label="تكبير">+</button></div><div class="mqv-b"></div>';
    D.body.appendChild(box);
    body = box.querySelector('.mqv-b'); ttl = box.querySelector('.mqv-t');
    box.addEventListener('click', function(e){
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'close') close();
      else if (a === 'save') doSave(b);
      else if (a === 'share') doShare(b);
      else if (a === 'in') setZoom(Math.min(3, zoom + 0.5));
      else if (a === 'out') setZoom(Math.max(1, zoom - 0.5));
      else if (a === 'copy') { var u = b.getAttribute('data-u'); try { navigator.clipboard.writeText(u).then(function(){ b.textContent = '✓ تم نسخ الرابط'; }, function(){ prompt('انسخ الرابط:', u); }); } catch(_){ prompt('انسخ الرابط:', u); } }
    });
  }
  function setZoom(z){
    zoom = z;
    [].forEach.call(body.querySelectorAll('.mqv-pg'), function(el){ el.style.width = (zoom * 100) + '%'; });
    var cy = body.scrollTop / Math.max(1, body.scrollHeight); body.scrollLeft = (body.scrollWidth - body.clientWidth) / 2; if (cy) body.scrollTop = cy * body.scrollHeight;
    box.querySelectorAll('.mqv-z')[0].disabled = zoom <= 1;
  }
  function msg(title, text, u){
    body.innerHTML = '<div class="mqv-msg"><b>' + esc(title) + '</b>' + esc(text || '')
      + (u && !/^data:/i.test(u) ? '<br>' + (app ? '' : '<a class="mqv-cp" data-raw="1" target="_blank" rel="noopener" style="display:inline-block;text-decoration:none;margin-left:8px" href="' + esc(u) + '">افتح الملف</a>') + '<button type="button" class="mqv-cp" data-a="copy" data-u="' + esc(u) + '">نسخ رابط الملف</button>' : '') + '</div>';
  }
  var curOpts = null, curUrl = '';
  function flash(b, t){ var o = b.textContent; b.textContent = t; setTimeout(function(){ b.textContent = o; }, 2200); }
  // حفظ: أندرويد ينزّله التطبيق مباشرة؛ آيفون عبر نافذة المشاركة («حفظ في الملفات»)
  function doSave(b){
    var o = curOpts || {}, su = o.save; if (!su) return;
    var ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && 'ontouchend' in D);
    if (ios && navigator.share && W.File) {
      b.disabled = true;
      fetch(su).then(function(r){ return r.blob(); }).then(function(bl){
        var f = new File([bl], (o.fileName || 'manaqasa') + '.pdf', { type: 'application/pdf' });
        b.disabled = false;
        if (navigator.canShare && !navigator.canShare({ files: [f] })) { location.href = su + (su.indexOf('?') > -1 ? '&' : '?') + 'dl=1'; return; }
        return navigator.share({ files: [f], title: o.fileName || '' }).catch(function(){});
      }).catch(function(){ b.disabled = false; flash(b, 'تعذّر الحفظ'); });
      return;
    }
    location.href = su + (su.indexOf('?') > -1 ? '&' : '?') + 'dl=1';
  }
  // مشاركة: نرسل رابط الصفحة (مو الملف) عشان اللي يوصله يحمّله من التطبيق
  function doShare(b){
    var s = (curOpts || {}).share; if (!s) return;
    var txt = s.text + '\n' + s.url;
    if (navigator.share) { navigator.share({ title: s.title || '', text: s.text, url: s.url }).catch(function(){}); return; }
    try { navigator.clipboard.writeText(txt).then(function(){ flash(b, '✓ نسخت الرابط'); }, function(){ prompt('انسخ الرابط وأرسله:', txt); }); }
    catch(e){ prompt('انسخ الرابط وأرسله:', txt); }
  }
  function open(u, txt, opts){
    var k = kind(u); if (!k) return false;
    if (k === 'img' && W.mqGallery && W.mqGallery.openFrom(null, u)) return true; // الصور تنفتح في المعرض (تتنقل بينها)
    if (k === 'other' && !app && !standalone) return false; // متصفح الجوال: الملفات الثانية تنزل عادي
    ui(); token++; var my = token;
    curOpts = opts || null; curUrl = u;
    // المتصفح: زر «حفظ» لملفات المنصة (ينزل الملف بدون ما تطلع من الصفحة)
    if (!curOpts && !app && k === 'pdf' && /\.r2\.dev\/|r2\.cloudflarestorage\.com\/|res\.cloudinary\.com\//i.test(u)) { var fn = nameOf(u, txt).replace(/\.pdf$/i, ''); curOpts = { save: '/api/dl?u=' + encodeURIComponent(u) + '&n=' + encodeURIComponent(fn + '.pdf'), fileName: fn }; }
    box.querySelector('[data-a="save"]').hidden = !(curOpts && curOpts.save);
    box.querySelector('[data-a="share"]').hidden = !(curOpts && curOpts.share);
    zoom = 1; ttl.textContent = nameOf(u, txt);
    box.classList.add('on'); isOpen = true;
    D.documentElement.style.overflow = 'hidden';
    if (!bk) bk = W.mqBack ? W.mqBack.push(function(){ bk = null; hide(); }) : null;
    box.querySelectorAll('.mqv-z').forEach(function(z){ z.style.display = k === 'other' ? 'none' : ''; });
    if (k === 'img') {
      body.innerHTML = '<img class="mqv-pg" alt="">'; body.querySelector('img').src = u; setZoom(1);
    } else if (k === 'other') {
      msg('هذا النوع من الملفات ما ينفتح داخل التطبيق', 'افتحه من الكمبيوتر، أو انسخ الرابط والصقه في المتصفح.', u);
    } else {
      msg('جاري فتح الملف…', '');
      loadPdf(u, my);
    }
    return true;
  }
  function close(){
    if (!isOpen) return;
    hide();
    if (bk) { var e = bk; bk = null; W.mqBack.release(e); }
  }
  function hide(){
    isOpen = false; token++;
    if (curPdf) { try { curPdf.destroy(); } catch(e){} curPdf = null; }
    if (box) { box.classList.remove('on'); body.innerHTML = ''; }
    D.documentElement.style.overflow = '';
  }

  // pdf.js — نحمّله مرة وحدة عند أول ملف
  var pdfP = null;
  function pdfLib(){
    if (pdfP) return pdfP;
    var V = '3.11.174';
    pdfP = new Promise(function(res, rej){
      var s = D.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + V + '/pdf.min.js';
      s.onload = function(){
        var L = W.pdfjsLib; if (!L) return rej(new Error('pdfjs'));
        // العامل (worker) نحمّله كـblob عشان يتوافق مع سياسة الأمان
        fetch('https://cdn.jsdelivr.net/npm/pdfjs-dist@' + V + '/build/pdf.worker.min.js').then(function(r){ return r.text(); }).then(function(t){
          L.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([t], { type: 'text/javascript' })); res(L);
        }).catch(function(){ res(L); });
      };
      s.onerror = function(){ pdfP = null; rej(new Error('pdfjs')); };
      D.head.appendChild(s);
    });
    return pdfP;
  }
  function src(u){
    if (/^data:/i.test(u)) { var b = atob(u.split(',')[1] || ''), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return { data: a }; }
    var abs = new URL(u, location.href);
    if (abs.origin === location.origin) return { url: abs.href };
    return { url: '/api/file-view?u=' + encodeURIComponent(abs.href) };
  }
  function loadPdf(u, my){
    pdfLib().then(function(L){
      if (my !== token) return;
      var task = L.getDocument(Object.assign(src(u), { isEvalSupported: false }));
      task.onProgress = function(p){ if (my !== token || !p.total) return; var m = body.querySelector('.mqv-msg b'); if (m) m.textContent = 'جاري فتح الملف… ' + Math.round(p.loaded / p.total * 100) + '%'; };
      return task.promise.then(function(pdf){
        if (my !== token) { pdf.destroy(); return; }
        curPdf = pdf; body.innerHTML = '';
        var w = Math.max(320, body.clientWidth - 20), dpr = Math.min(2, W.devicePixelRatio || 1);
        var n = 0;
        (function next(){
          if (my !== token || ++n > pdf.numPages) return;
          pdf.getPage(n).then(function(pg){
            if (my !== token) return;
            var v0 = pg.getViewport({ scale: 1 }), sc = (w / v0.width) * dpr * 1.25; // دقة أعلى شوي عشان التكبير
            var vp = pg.getViewport({ scale: Math.min(sc, 1800 / v0.width) });
            var c = D.createElement('canvas'); c.className = 'mqv-pg'; c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
            c.style.width = (zoom * 100) + '%'; c.style.height = 'auto';
            body.appendChild(c);
            pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise.then(next, next);
          }, next);
        })();
        setZoom(zoom);
      });
    }).catch(function(){
      if (my !== token) return;
      msg('تعذّر عرض الملف', 'تأكد من الاتصال وحاول مرة ثانية.', u);
    });
  }

  // التقاط الروابط
  D.addEventListener('click', function(e){
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey) return;
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || a.hasAttribute('data-raw')) return;
    var u = a.getAttribute('href');
    if (!kind(u)) return;
    if (open(a.href && !/^data:/i.test(u) ? a.href : u, a.textContent)) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  // التقاط window.open (صور المحادثة وغيرها)
  var _wo = W.open;
  W.open = function(u){
    try { if (u && kind(u) && open(String(u))) return null; } catch(e){}
    return _wo.apply(W, arguments);
  };
  W.mqOpenFile = open;
})();
