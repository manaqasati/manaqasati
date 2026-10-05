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

/* مناقصة — عارض الملفات داخل التطبيق
   داخل التطبيق (WebView) فتح رابط PDF/صورة يستبدل الصفحة كلها وما فيه زر رجوع → المستخدم يعلق.
   هنا نلتقط أي فتح لملف ونعرضه في نافذة فوق الصفحة مع زر «رجوع» واضح (وزر الرجوع في أندرويد يقفلها). */
(function(){
  if (window.__mqViewer) return; window.__mqViewer = true;
  var W = window, D = document, ua = navigator.userAgent || '';
  var app = !!W.ReactNativeWebView || /ManaqasaApp|Expo|; wv\)/i.test(ua);
  var standalone = false; try { standalone = W.navigator.standalone === true || (W.matchMedia && W.matchMedia('(display-mode: standalone)').matches); } catch(e){}
  if (!app && !standalone && !/[?&]mqviewer=1/.test(location.search)) return;

  var IMG = /^(jpe?g|png|webp|gif|heic)$/i, OTHER = /^(dwg|dxf|xlsx?|docx?|zip|csv|rvt|pptx?)$/i;
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

  var box, body, ttl, zoom = 1, isOpen = false, pushed = false, curPdf = null, token = 0;
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
      + (u && !/^data:/i.test(u) ? '<br><button type="button" class="mqv-cp" data-a="copy" data-u="' + esc(u) + '">نسخ رابط الملف</button>' : '') + '</div>';
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
    ui(); token++; var my = token;
    curOpts = opts || null; curUrl = u;
    box.querySelector('[data-a="save"]').hidden = !(curOpts && curOpts.save);
    box.querySelector('[data-a="share"]').hidden = !(curOpts && curOpts.share);
    zoom = 1; ttl.textContent = nameOf(u, txt);
    box.classList.add('on'); isOpen = true;
    D.documentElement.style.overflow = 'hidden';
    if (!pushed) { try { history.pushState({ mqfv: 1 }, ''); pushed = true; } catch(e){} }
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
    if (pushed) { pushed = false; try { history.back(); return; } catch(e){} }
    hide();
  }
  function hide(){
    isOpen = false; token++;
    if (curPdf) { try { curPdf.destroy(); } catch(e){} curPdf = null; }
    if (box) { box.classList.remove('on'); body.innerHTML = ''; }
    D.documentElement.style.overflow = '';
  }
  W.addEventListener('popstate', function(){ if (isOpen) { pushed = false; hide(); } });

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
    var a = e.target.closest && e.target.closest('a[href]'); if (!a) return;
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
