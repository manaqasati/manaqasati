/* مناقصة — تعدد اللغات (عربي / English / اردو)
   - اللغة من الكوكي mnq_lang أو localStorage (والسيرفر يحفظها في الحساب)
   - العربي هو الأصل: ما نلمس الصفحة أبداً
   - غير العربي: نحمّل القاموس ونترجم النصوص والسمات والتنبيهات، ونتابع أي نص يضاف بعدين */
(function(){
  var W = window, D = document, H = D.documentElement;
  var LANGS = { ar: 'العربية', en: 'English', ur: 'اردو' };
  function ck(n){ var m = D.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
  var L = ck('mnq_lang'); if (!L) { try { L = localStorage.getItem('mnq_lang') || ''; } catch(e){} }
  var _u = null; try { _u = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e){}
  if (!L && _u && LANGS[_u.lang]) { L = _u.lang; try { localStorage.setItem('mnq_lang', L); } catch(e){} D.cookie = 'mnq_lang=' + L + '; path=/; max-age=31536000; SameSite=Lax'; }
  if (!LANGS[L]) L = 'ar';
  // اختيار اللغة قبل الدخول ← نحفظه في الحساب أول ما يدخل
  try { var _tk = localStorage.getItem('token'); if (_tk && _u && (_u.lang || 'ar') !== L && !sessionStorage.getItem('mnq_lang_sync') && W.fetch) { sessionStorage.setItem('mnq_lang_sync', '1'); fetch('/api/me/lang', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + _tk }, body: JSON.stringify({ lang: L }) }).then(function(r){ if (r.ok) { _u.lang = L; localStorage.setItem('user', JSON.stringify(_u)); } }, function(){}); } } catch(e){}
  W.MNQ_LANG = L;

  // ── اختيار اللغة (شيت بنفس هوية مناقصة) ──
  function setLang(l){
    if (!LANGS[l]) return;
    try { localStorage.setItem('mnq_lang', l); } catch(e){}
    D.cookie = 'mnq_lang=' + l + '; path=/; max-age=31536000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
    var t = ''; try { t = localStorage.getItem('token') || ''; } catch(e){}
    var go = function(){ location.reload(); };
    if (t && W.fetch) { try { fetch('/api/me/lang', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify({ lang: l }) }).then(function(){ try { var u = JSON.parse(localStorage.getItem('user') || 'null'); if (u) { u.lang = l; localStorage.setItem('user', JSON.stringify(u)); } } catch(e){} go(); }, go); setTimeout(go, 1500); return; } catch(e){} }
    go();
  }
  function pick(){
    var old = D.getElementById('mnq-lang-sh'); if (old) old.remove();
    var ov = D.createElement('div'); ov.id = 'mnq-lang-sh'; ov.className = 'notranslate'; ov.setAttribute('translate', 'no');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:2147483000;display:flex;align-items:flex-end;justify-content:center;font-family:Tajawal,system-ui,sans-serif';
    var bx = '<div style="background:#fff;width:100%;max-width:420px;border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));direction:rtl">'
      + '<div style="width:40px;height:4px;border-radius:4px;background:#cbd5e1;margin:0 auto 14px"></div>'
      + '<div style="font-weight:900;color:#0f2544;font-size:16px;text-align:center;margin-bottom:12px">🌐 اللغة · Language · زبان</div>';
    ['ar','en','ur'].forEach(function(k){
      var on = k === L;
      bx += '<button type="button" data-l="' + k + '" style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:8px;padding:14px 16px;border-radius:13px;border:1.5px solid ' + (on ? '#1e3a8a' : '#e2e8f4') + ';background:' + (on ? '#eff4ff' : '#fff') + ';font-family:inherit;font-size:15px;font-weight:800;color:#0f2544;cursor:pointer;direction:' + (k === 'en' ? 'ltr' : 'rtl') + '"><span>' + LANGS[k] + '</span><span style="color:#1e3a8a">' + (on ? '✓' : '') + '</span></button>';
    });
    bx += '</div>';
    ov.innerHTML = bx;
    ov.addEventListener('click', function(e){
      var b = e.target.closest && e.target.closest('button[data-l]');
      if (b) { var l = b.getAttribute('data-l'); if (l !== L) setLang(l); else ov.remove(); return; }
      if (e.target === ov) ov.remove();
    });
    (D.body || H).appendChild(ov);
  }
  (function(){ var s0 = D.createElement('style'); s0.textContent = '.mnq-lang-cur::after{content:"العربية"}html.mnq-en .mnq-lang-cur::after{content:"English"}html.mnq-ur .mnq-lang-cur::after{content:"اردو"}'; (D.head || H).appendChild(s0); })();
  W.MNQ_I18N = { lang: L, names: LANGS, pick: pick, set: setLang, t: function(s){ return s; } };
  // أي عنصر عليه data-mnq-lang يفتح الاختيار، ونكتب فيه اسم اللغة الحالية
  D.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('[data-mnq-lang]'); if (b) { e.preventDefault(); pick(); } }, true);

  if (L === 'ar') return;

  // ── لغة غير العربي ──
  H.setAttribute('lang', L);
  H.setAttribute('dir', L === 'en' ? 'ltr' : 'rtl');
  H.classList.add('mnq-' + L);
  if (L === 'en') {
    var st = D.createElement('style');
    st.textContent = 'html.mnq-en body{direction:ltr}'
      + 'html.mnq-en [style*="text-align:right"],html.mnq-en [style*="text-align: right"]{text-align:left!important}'
      + 'html.mnq-en [style*="direction:rtl"],html.mnq-en [style*="direction: rtl"]{direction:ltr!important}'
      + 'html.mnq-en input,html.mnq-en textarea,html.mnq-en select{direction:ltr}'
      + '@media(min-width:769px){html.mnq-en .side,html.mnq-en #pnvS{right:auto!important;left:0!important}'
      + 'html.mnq-en .main{margin-right:0!important;margin-left:260px}'
      + 'html.mnq-en #pnvS{text-align:left!important}'
      + 'html.mnq-en body.mnq-pnv{padding-right:0!important;padding-left:260px!important}html.mnq-en body.mnq-pnv .bar{right:0!important;left:260px!important}}';
    (D.head || H).appendChild(st);
  }
  if (L === 'ur') {
    var su = D.createElement('style');
    su.textContent = 'html.mnq-ur body{line-height:1.9}';
    (D.head || H).appendChild(su);
  }

  // ── محرّك الترجمة: مطابقة كاملة ← قالب أرقام ← عبارات كاملة ← مقاطع (بين الفواصل) ──
  // أي مقطع ما نقدر نترجمه كامل يبقى مثل ما هو (غالباً اسم أو عنوان كتبه المستخدم) — ما نخلط كلمات
  var SEP = /(\s*[·،,:|—–•«»“”"()\[\]!؟?\/…]+\s*)/;
  function mkT(DICT, L){
    var NK = Object.create(null), nk = function(t){ return t.replace(/[\u064B-\u065F\u0670\u0640]/g, ''); };
    for (var k0 in DICT) if (Object.prototype.hasOwnProperty.call(DICT, k0)) { var n0 = nk(k0); if (NK[n0] == null) NK[n0] = DICT[k0]; }
    function sg(o){ return L === 'en' && o ? String(o).replace(/(^|[^0-9.,])1 ((?:new|more|active|open|extra|verified|hidden|free|campaign) )?([a-z]+?)(ies|s)\b/g, function(m, a, j, w, e){ return /s$/.test(w) ? m : a + '1 ' + (j || '') + w + (e === 'ies' ? 'y' : ''); }) : o; }
    function dk(t){ var v = DICT[t]; if (v == null) v = NK[nk(t)]; return v != null && /1/.test(t) ? sg(v) : v; }
    var IDX = Object.create(null), TPL = Object.create(null), NUMS = '[0-9٠-٩]+(?:[.,٫٬][0-9٠-٩]+)*';
    var NUM = new RegExp(NUMS, 'g'), HASN = new RegExp(NUMS), ARX = /[؀-ۿ]/;
    for (var k in DICT) {
      if (!Object.prototype.hasOwnProperty.call(DICT, k)) continue;
      if (HASN.test(k)) { var ka = k.match(NUM) || [], va = String(DICT[k]).match(NUM) || []; var tk = k.replace(NUM, '#'); if (ka.length === va.length && !TPL[tk]) TPL[tk] = DICT[k]; }
      if (k.length < 4 || k.indexOf(' ') === -1) continue;
      var fw = k.split(' ')[0]; (IDX[fw] = IDX[fw] || []).push(k);
    }
    for (var f in IDX) IDX[f].sort(function(a, b){ return b.length - a.length; });
    function tpl(t){ if (!HASN.test(t)) return null; var v = TPL[t.replace(NUM, '#')]; if (v == null) return null; var ns = t.match(NUM) || [], i = 0; var o = v.replace(NUM, function(m){ return i < ns.length ? ns[i++] : m; }); return sg(o); }
    function full(t){   // كل الكلمات العربية لازم تتغطى بعبارات معروفة (كلمتين فأكثر) — ما نترجم كلمة كلمة
      var out = '', i = 0, n = t.length, any = false;
      while (i < n) {
        var j = t.indexOf(' ', i); if (j === -1) j = n;
        var c = IDX[t.slice(i, j)], hit = null;
        if (c) for (var q = 0; q < c.length; q++) { var p = c[q]; if (t.substr(i, p.length) === p) { var e = t.charAt(i + p.length); if (!e || !/[؀-ۿ\w]/.test(e)) { hit = p; break; } } }
        if (hit) { out += DICT[hit]; i += hit.length; any = true; continue; }
        var w = t.slice(i, j);
        if (ARX.test(w)) return null; out += w;
        if (j < n) out += ' '; i = j + 1;
      }
      return any ? out : null;
    }
    function one(t){   // مقطع واحد بدون فواصل
      if (!ARX.test(t)) return t;
      var m = /^([^؀-ۿ\w]*)([\s\S]*?)([^؀-ۿ\w.]*)$/.exec(t), a = m[1], core = m[2], z = m[3];
      if (!core) return t;
      var r = dk(core); if (r == null) r = tpl(core);
      if (r == null) { var pm = /^(في|من|إلى|الى|لـ?)\s+(.+)$/.exec(core); if (pm) { var rr = dk(pm[2]); if (rr != null) { var pp = { 'في': ['in ', ' میں'], 'من': ['from ', ' سے'], 'إلى': ['to ', ' تک'], 'الى': ['to ', ' تک'], 'ل': ['for ', ' کے لیے'], 'لـ': ['for ', ' کے لیے'] }[pm[1]]; r = L === 'en' ? pp[0] + rr : rr + pp[1]; } } }
      if (r == null && core.indexOf(' ') !== -1 && core.split(' ').length <= 6) r = full(core);
      return r == null ? null : a + r + z;
    }
    return function T(s){
      if (s == null) return s; s = String(s);
      if (!ARX.test(s)) return s;
      var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
      var t = s.slice(lead.length, s.length - trail.length).replace(/[ \t ]+/g, ' ');
      if (!t) return s;
      var r = dk(t); if (r == null) r = tpl(t);
      if (r == null && t.indexOf('\n') !== -1) r = t.split('\n').map(function(x){ return T(x); }).join('\n');
      if (r == null) {
        var parts = t.split(SEP), ch = false;
        if (parts.length === 1) { r = one(t); if (r == null) r = t; }
        else {
          for (var i = 0; i < parts.length; i++) {
            if (i % 2) { if (L === 'en') parts[i] = parts[i].replace(/،/g, ',').replace(/؟/g, '?').replace(/«/g, '“').replace(/»/g, '”'); continue; }
            var x = parts[i]; if (!x || !ARX.test(x)) continue;
            var lw = x.match(/^\s*/)[0], tw = x.match(/\s*$/)[0], y = one(x.trim());
            if (y != null) { parts[i] = lw + y + tw; ch = true; }
          }
          r = ch ? parts.join('') : t;
        }
      }
      return lead + r + trail;
    };
  }
  var T = function(s){ return s; }, DICT = null, SEEN = new WeakMap(), AR = /[\u0600-\u06FF]/;
  function build(){ DICT = W.MNQ_DICT || {}; T = mkT(DICT, L); W.MNQ_I18N.t = T; }


  var SKIP = { SCRIPT:1, STYLE:1, NOSCRIPT:1, TEXTAREA:1, CODE:1, PRE:1, svg:1, SVG:1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip'];
  function skipEl(el){
    for (var e = el; e && e !== D; e = e.parentNode) {
      if (e.nodeType !== 1) continue;
      if (SKIP[e.nodeName] || e.isContentEditable) return true;
      if (e.getAttribute('translate') === 'no' || (e.classList && e.classList.contains('notranslate'))) return true;
    }
    return false;
  }
  function trText(n){
    var v = n.data; if (!v || !AR.test(v) || SEEN.get(n) === v) return;
    if (n.parentNode && skipEl(n.parentNode)) return;
    var r = T(v); SEEN.set(n, r); if (r !== v) n.data = r;
  }
  function trAttrs(el){
    if (el.nodeType !== 1 || (el.nodeName !== 'TEXTAREA' && el.nodeName !== 'INPUT' ? skipEl(el) : (el.parentNode && skipEl(el.parentNode)))) return;
    for (var i = 0; i < ATTRS.length; i++) { var a = el.getAttribute(ATTRS[i]); if (a && AR.test(a)) { var r = T(a); if (r !== a) el.setAttribute(ATTRS[i], r); } }
    if (el.nodeName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && AR.test(el.value)) el.value = T(el.value);
    if (L === 'en' && el.getAttribute('dir') === 'rtl' && el !== H) el.setAttribute('dir', 'auto');
  }
  function walk(root){
    if (!root) return;
    if (root.nodeType === 3) return trText(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { trAttrs(root); if (SKIP[root.nodeName]) return; }
    var tw = D.createTreeWalker(root, 5, null), n;
    while ((n = tw.nextNode())) { if (n.nodeType === 3) trText(n); else trAttrs(n); }
  }
  function title(){ var t0 = D.title; if (AR.test(t0)) { var t1 = T(t0); if (t1 !== t0) D.title = t1; } }

  // التنبيهات والتأكيدات
  var _al = W.alert, _cf = W.confirm, _pr = W.prompt;
  W.alert = function(m){ return _al.call(W, T(m)); };
  W.confirm = function(m){ return _cf.call(W, T(m)); };
  W.prompt = function(m, d){ return _pr.call(W, T(m), d); };

  var mo = null;
  function start(){
    if (DICT) return; build();
    walk(D.documentElement); title();
    mo = new MutationObserver(function(ms){
      for (var i = 0; i < ms.length; i++) {
        var m = ms[i];
        if (m.type === 'characterData') trText(m.target);
        else if (m.type === 'attributes') { if (m.target.nodeType === 1 && ATTRS.indexOf(m.attributeName) !== -1) trAttrs(m.target); }
        else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
      title();
    });
    mo.observe(D.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  W.__mnqI18nInit = start;
  if (W.MNQ_DICT && W.MNQ_DICT_LANG === L) start();
  else D.write('<script src="/i18n-' + L + '.js?v=' + (W.__MNQ_I18N_V || '1') + '"><\/script>');
})();
