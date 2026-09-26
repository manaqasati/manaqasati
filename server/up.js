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
