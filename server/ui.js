/* مناقصة — مكوّنات الواجهة الموحّدة (ui.js)
   MQ.ask    نافذة تأكيد بتصميمنا بدل confirm() → Promise<boolean>
   MQ.alert  رسالة بدل alert() → Promise
   MQ.prompt إدخال بدل prompt() → Promise<string|null>
   MQ.toast  إشعار سريع
   MQ.empty  حالة فاضية برسم وزر إجراء → نص HTML */
(function(W, D){
  if (W.MQ && W.MQ.ask) return;
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function norm(o, def){ if (typeof o === 'string' || typeof o === 'number') o = { msg: String(o) }; o = o || {}; for (var k in def) if (o[k] == null) o[k] = def[k]; return o; }
  // نص طويل بسطر واحد: أول جملة عنوان والباقي تفاصيل
  function split(o){ if (!o.title && o.msg) { var m = String(o.msg), i = m.search(/[؟?.!\n]/); if (i > 0 && i < m.length - 1 && i < 90) { o.title = m.slice(0, i + 1).trim(); o.msg = m.slice(i + 1).trim(); } else { o.title = m; o.msg = ''; } } return o; }
  var open = 0;
  function dialog(o, kind){
    return new Promise(function(done){
      var prev = D.activeElement, ov = D.createElement('div'); ov.className = 'mq-ov'; ov.setAttribute('data-noback', '');
      var ic = o.icon != null ? o.icon : (kind === 'prompt' ? '✏️' : o.danger ? '⚠️' : kind === 'alert' ? 'ℹ️' : '❓');
      var icc = o.danger ? ' dg' : o.tone === 'ok' ? ' ok' : o.tone === 'warn' ? ' wr' : '';
      var inp = kind === 'prompt' ? (o.multiline ? '<textarea class="in" maxlength="' + (o.max || 2000) + '" placeholder="' + esc(o.placeholder || '') + '">' + esc(o.value || '') + '</textarea>'
        : '<input class="in" type="' + (o.type || 'text') + '" maxlength="' + (o.max || 300) + '" placeholder="' + esc(o.placeholder || '') + '" value="' + esc(o.value || '') + '"' + (o.type === 'number' || o.numeric ? ' inputmode="decimal"' : '') + (o.ltr ? ' dir="ltr"' : '') + '>') : '';
      ov.innerHTML = '<div class="mq-dg" role="' + (kind === 'alert' ? 'alertdialog' : 'dialog') + '" aria-modal="true" aria-labelledby="mq-dt">' + (ic ? '<div class="ic' + icc + '" aria-hidden="true">' + ic + '</div>' : '')
        + '<div class="tt" id="mq-dt">' + esc(o.title || '') + '</div>' + (o.msg ? '<div class="ms">' + esc(o.msg) + '</div>' : '') + inp
        + '<div class="bt">' + (kind !== 'alert' ? '<button type="button" class="no">' + esc(o.cancel || 'رجوع') + '</button>' : '') + '<button type="button" class="yes' + (o.danger ? ' dg' : '') + '">' + esc(o.ok || (kind === 'alert' ? 'تمام' : kind === 'prompt' ? 'حفظ' : 'تأكيد')) + '</button></div></div>';
      var fin = function(v){ if (!ov.parentNode) return; ov.remove(); open--; D.removeEventListener('keydown', key, true); try { prev && prev.focus && prev.focus({ preventScroll: true }); } catch(e){} done(v); };
      var val = function(){ var i = ov.querySelector('.in'); return i ? i.value : true; };
      var yes = function(){ if (kind === 'prompt') { var v = val(); if (o.required && !String(v).trim()) { ov.querySelector('.in').focus(); return; } fin(v); } else fin(kind === 'alert' ? undefined : true); };
      var no = function(){ fin(kind === 'prompt' ? null : kind === 'alert' ? undefined : false); };
      function key(e){ if (e.key === 'Escape') { e.preventDefault(); no(); } else if (e.key === 'Enter' && !(e.target && e.target.tagName === 'TEXTAREA')) { e.preventDefault(); yes(); } }
      ov.addEventListener('click', function(e){ if (e.target === ov) return no(); if (e.target.closest('.yes')) yes(); else if (e.target.closest('.no')) no(); });
      D.addEventListener('keydown', key, true);
      (D.body || D.documentElement).appendChild(ov); open++;
      setTimeout(function(){ var f = ov.querySelector('.in') || ov.querySelector(o.danger ? '.no' : '.yes'); try { f.focus(); if (f.select && kind === 'prompt') f.select(); } catch(e){} }, 30);
    });
  }
  var tT = 0, tEl = null;
  function toast(msg, opt){ opt = opt || {}; if (!tEl) { tEl = D.createElement('div'); tEl.setAttribute('role', 'status'); tEl.setAttribute('aria-live', 'polite'); }
    tEl.className = 'mq-tst' + (opt.type ? ' ' + opt.type : ''); tEl.textContent = String(msg == null ? '' : msg);
    if (!tEl.parentNode) (D.body || D.documentElement).appendChild(tEl); else { tEl.style.animation = 'none'; void tEl.offsetWidth; tEl.style.animation = ''; }
    clearTimeout(tT); tT = setTimeout(function(){ if (tEl && tEl.parentNode) tEl.remove(); }, opt.ms || 2800); }
  function empty(o){ o = o || {}; var b = o.btn;
    return '<div class="mq-em">' + '<div class="ei" aria-hidden="true">' + (o.icon || '📭') + '</div><b>' + esc(o.title || '') + '</b>' + (o.text ? '<p>' + esc(o.text) + '</p>' : '')
      + (b ? (b.href ? '<a class="ea" href="' + esc(b.href) + '">' + esc(b.label) + '</a>' : '<button type="button" class="ea"' + (b.onclick ? ' onclick="' + esc(b.onclick) + '"' : '') + '>' + esc(b.label) + '</button>') : '') + '</div>'; }
  W.MQ = W.MQ || {};
  var DNG = /حذف|تحذف|تلغي|إلغاء|ألغ|حظر|تشيل|سحب|ترفض|رفض|إخفاء|نهائي|تطلّع|نطلّع|تطلع بدون|توقف|تعتذر|إزالة/;
  W.MQ.ask = function(o){ o = split(norm(o, {})); if (o.danger == null && DNG.test((o.title || '') + ' ' + (o.msg || ''))) o.danger = true; if (!o.ok) o.ok = o.danger ? 'نعم' : 'نعم، تأكيد'; return dialog(o, 'ask'); };
  W.MQ.alert = function(o){ return dialog(split(norm(o, {})), 'alert'); };
  W.MQ.prompt = function(o, v){ if (typeof o === 'string') o = { title: o, value: v }; return dialog(norm(o, {}), 'prompt'); };
  W.MQ.toast = toast; W.MQ.empty = empty; W.MQ.esc = esc;
  W.MQ.isOpen = function(){ return open > 0; };
  // أخطاء جافاسكربت → لوحة «صحة المنصة» (5 بالحد لكل صفحة، بدون تكرار)
  (function(){ var sent = {}, n = 0;
    function rep(m, src, line, st){ try { m = String(m || '').slice(0, 300); if (!m || n >= 5) return; var k = m + '|' + src + '|' + line; if (sent[k]) return; sent[k] = 1; n++;
      var b = JSON.stringify({ m: m, s: String(src || '').slice(0, 300), l: line || null, st: String(st || '').slice(0, 1500), p: location.pathname + location.search.slice(0, 40), app: !!W.ReactNativeWebView });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/jserr', new Blob([b], { type: 'application/json' })); else fetch('/api/jserr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: b, keepalive: true }).catch(function(){}); } catch(e){} }
    W.addEventListener('error', function(e){ if (!e || !e.message) return; rep(e.message, e.filename, e.lineno, e.error && e.error.stack); });
    W.addEventListener('unhandledrejection', function(e){ var r = e && e.reason; if (!r || !(r instanceof Error)) return; rep(r.message || String(r), (r.stack || '').split('\n')[1] || '', null, r.stack); });
  })();
  // alert() البدائي: نعرض نافذتنا بدله (ما يوقف الكود — نفس سلوكه العملي في الصفحات)
  try { var _na = W.alert; W.alert = function(m){ try { W.MQ.alert(m); } catch(e){ _na.call(W, m); } }; } catch(e){}
})(window, document);
