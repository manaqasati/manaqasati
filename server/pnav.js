// قائمة المزوّد الموحّدة: مفتاح «السوق | مساعد الفوز» + نفس القائمة الجانبية والشريط السفلي في كل صفحات المزوّد
// مصدر واحد: نفس عناصر لوحة المزوّد (تنقرأ من الصفحة نفسها في اللوحة، وتنجاب من /dashboard-provider.html في الصفحات المستقلة)
(function(){
  var W = window, D = document;
  var K = 'mnq_side';
  // ترتيب الجهتين ومجموعاتهما (المعرّفات نفسها اللي في لوحة المزوّد)
  var SIDES = {
    m: [['عام', ['ni-home', 'ni-browse', 'ni-works', 'ni-chat', 'ni-notifs']],
        ['السمعة والدخل', ['ni-reviews', 'ni-proof', 'ni-stats', 'ni-saai']],
        ['أدوات', ['ni-sub', 'ni-contracts', 'ni-ideas']],
        ['الحساب', ['ni-profile', 'ni-dlg', 'ni-dlgme']]],
    w: [['التشغيل', ['ni-cal', 'ni-jobs', 'ni-att']],
        ['العملاء', ['ni-quotes', 'ni-mypage', 'ni-cust']],
        ['الإدارة', ['ni-branches', 'ni-plan']]]
  };
  // الصفحة الحالية ← جهتها والعنصر المفعّل
  var PAGE = { '/cal.html': 'ni-cal', '/jobs.html': 'ni-jobs', '/att.html': 'ni-att', '/quotes.html': 'ni-quotes', '/quote.html': 'ni-quotes', '/mypage.html': 'ni-mypage', '/customers.html': 'ni-cust', '/branches.html': 'ni-branches', '/plan.html': 'ni-plan', '/stats.html': 'ni-stats', '/ideas.html': 'ni-ideas' };
  function sideOf(id){ return SIDES.w.some(function(g){ return g[1].indexOf(id) >= 0; }) ? 'w' : 'm'; }
  function get(){ try { return localStorage.getItem(K) === 'w' ? 'w' : 'm'; } catch(e){ return 'm'; } }
  function put(s){ try { localStorage.setItem(K, s); } catch(e){} }
  var CSS = '.pnv-sw{display:flex;background:rgba(255,255,255,.1);border-radius:13px;padding:4px;margin:4px 0 6px;gap:2px}'
    + '.pnv-sw button{flex:1;border:0;background:transparent;color:#c9d8ff;font:800 13px Tajawal,sans-serif;padding:9px 4px;border-radius:10px;cursor:pointer}'
    + '.pnv-sw button.on{background:#fff;color:#0b1f4d;box-shadow:0 6px 16px -8px rgba(0,0,0,.5)}'
    + '.pnv-g[hidden]{display:none!important}';

  // ═══ ترتيب القائمة (يشتغل على أي .side .nav فيها عناصر ni-*) ═══
  function arrange(nav, cur){
    if (!nav || nav.getAttribute('data-pnv')) return; nav.setAttribute('data-pnv', '1');
    var st = D.createElement('style'); st.textContent = CSS; D.head.appendChild(st);
    var byId = {}; [].forEach.call(nav.querySelectorAll('.ni[id]'), function(b){ byId[b.id] = b; });
    var rest = [].filter.call(nav.querySelectorAll('.ni[id]'), function(b){ return !SIDES.m.concat(SIDES.w).some(function(g){ return g[1].indexOf(b.id) >= 0; }); });
    [].forEach.call(nav.querySelectorAll('.nav-sec'), function(s){ s.remove(); });
    var sw = D.createElement('div'); sw.className = 'pnv-sw'; sw.setAttribute('role', 'tablist'); sw.style.display = 'none';
    sw.innerHTML = '<button type="button" data-s="m" role="tab">السوق</button><button type="button" data-s="w" role="tab">مساعد الفوز</button>';
    nav.insertBefore(sw, nav.firstChild);
    ['m', 'w'].forEach(function(s){ var box = D.createElement('div'); box.className = 'pnv-g'; box.setAttribute('data-s', s);
      SIDES[s].forEach(function(g){ var h = D.createElement('div'); h.className = 'nav-sec'; h.textContent = g[0]; box.appendChild(h);
        g[1].forEach(function(id){ if (byId[id]) box.appendChild(byId[id]); }); });
      if (s === 'm') rest.forEach(function(b){ box.appendChild(b); });
      nav.appendChild(box); });
    function show(s){ put(s); [].forEach.call(sw.children, function(b){ var on = b.getAttribute('data-s') === s; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
      [].forEach.call(nav.querySelectorAll('.pnv-g'), function(g){ g.hidden = g.getAttribute('data-s') !== s; });
      // عناوين المجموعات الفاضية تختفي
      [].forEach.call(nav.querySelectorAll('.pnv-g .nav-sec'), function(h){ var n = h.nextElementSibling, any = false; while (n && !n.classList.contains('nav-sec')) { if (n.style.display !== 'none') any = true; n = n.nextElementSibling; } h.style.display = any ? '' : 'none'; }); }
    sw.addEventListener('click', function(e){ var b = e.target.closest('button'); if (b) show(b.getAttribute('data-s')); });
    // المفتاح يظهر بس لو فيه عنصر ظاهر في «مساعد الفوز» (الاشتراكات مفتوحة له)
    function sync(){ var any = SIDES.w.some(function(g){ return g[1].some(function(id){ return byId[id] && byId[id].style.display !== 'none'; }); });
      sw.style.display = any ? '' : 'none'; show(any ? (cur ? sideOf(cur) : get()) : 'm'); if (cur) cur = null; }
    sync(); var mo = new MutationObserver(function(){ clearTimeout(sync._t); sync._t = setTimeout(sync, 60); });
    Object.keys(byId).forEach(function(id){ mo.observe(byId[id], { attributes: true, attributeFilter: ['style'] }); });
    W.MNQ_NAV = { show: show, side: get };
  }
  W.MNQ_NAV_SIDES = SIDES; W.MNQ_NAV_SIDEOF = sideOf;

  // ═══ داخل لوحة المزوّد ═══
  var dashNav = D.querySelector('.side .nav');
  if (dashNav) { arrange(dashNav, null);
    // لما يفتح قسم من الجهة الثانية (من رابط أو إشعار) نحوّل الجهة
    D.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('.side .ni[id]'); if (b && W.MNQ_NAV) put(sideOf(b.id)); }, true);
    return; }

  // ═══ الصفحات المستقلة: نجيب القائمة من لوحة المزوّد ═══
  var path = location.pathname.toLowerCase(); var cur = PAGE[path] || null;
  var tok = ''; try { tok = localStorage.getItem('token') || ''; } catch(e){}
  var me = {}; try { me = JSON.parse(localStorage.getItem('user') || '{}') || {}; } catch(e){}
  if (!tok || (me.role !== 'provider' && !me.can_provide && !me.delegate)) return;
  function rules(sheet, keep){ var out = [];
    [].forEach.call(sheet.cssRules, function(r){
      if (r.media) { var inner = []; [].forEach.call(r.cssRules, function(x){ if (x.selectorText && keep.test(x.selectorText)) inner.push(scope(x)); }); if (inner.length) out.push('@media ' + r.media.mediaText + '{' + inner.join('') + '}'); return; }
      if (r.selectorText === ':root') { out.push(r.cssText.replace(/^:root/, '#pnvS,#pnvB')); return; }
      if (r.selectorText && keep.test(r.selectorText)) out.push(scope(r));
      if (r.type === 7) out.push(r.cssText); });
    return out.join('\n'); }
  // نحصر التنسيق في قائمتنا بس (بعض الصفحات فيها .side خاص فيها)
  function scope(r){ var sel = r.selectorText.split(',').map(function(x){ x = x.trim(); if (!KEEP.test(x)) return null;
      if (/\.side(?![\w-])/.test(x)) return x.replace(/\.side(?![\w-])/, '#pnvS'); if (/^\.bnav(?![\w-])/.test(x)) return x.replace(/^\.bnav(?![\w-])/, '#pnvB');
      if (/^\.bnav-/.test(x)) return '#pnvB ' + x; if (/^\.(bni|fab)/.test(x)) return '#pnvB ' + x;
      if (/\[data-theme/.test(x)) return null; return '#pnvS ' + x; }).filter(Boolean).join(',');
    return sel ? sel + r.cssText.slice(r.cssText.indexOf('{')) : ''; }
  var KEEP = /^(\s*|.*,\s*)(\.side|\.nav|\.ni\b|\.ni-|\.ni\.|\.logo|\.side-|\.user-pill|\.av\b|\.av-|\.bnav|\.bni|\.fab|\.logoutbtn|\.dk-app|\.dk-me|\.badge)/;
  function parse(txt){ try { var s = new CSSStyleSheet(); s.replaceSync(txt.replace(/@import[^;]+;/g, '')); return s; } catch(e){ return null; } }
  Promise.all([fetch('/dashboard-provider.html').then(function(r){ return r.text(); }), fetch('/dash-provider.css').then(function(r){ return r.text(); }), fetch('/dash-desk.css').then(function(r){ return r.text(); })])
  .then(function(x){
    var doc = new DOMParser().parseFromString(x[0], 'text/html'); var side = doc.querySelector('.side'), bnav = doc.querySelector('.bnav'); if (!side) return;
    var s1 = parse(x[1]), s2 = parse(x[2]); var css = (s1 ? rules(s1, KEEP) : '') + '\n' + (s2 ? rules(s2, KEEP) : '');
    css += '@media(min-width:769px){body{padding-right:260px!important}.top{display:none!important}#pnvS{display:flex!important}#pnvB{display:none!important}.bar{right:260px!important}}'
      + '@media(max-width:768px){#pnvS{display:none!important}body.pnv-b{padding-bottom:96px!important}}'
      + '#pnvS{font-family:Tajawal,sans-serif;text-align:right}#pnvS .ni{text-decoration:none}#pnvB{font-family:Tajawal,sans-serif}';
    var st = D.createElement('style'); st.id = 'pnv-css'; st.textContent = css; D.head.appendChild(st); D.body.classList.add('mnq-pnv');
    // روابط: أقسام اللوحة ← /dashboard-provider.html#قسم
    function fix(root){ [].forEach.call(root.querySelectorAll('[onclick]'), function(b){ var oc = b.getAttribute('onclick') || ''; var m = /gotoPage\('([a-z]+)'\)/.exec(oc), u = /location\.href='([^']+)'/.exec(oc);
      var href = m ? '/dashboard-provider.html#' + m[1] : (u ? u[1] : null); b.removeAttribute('onclick'); if (href) b.addEventListener('click', function(){ location.href = href; }); }); }
    var sd = D.importNode(side, true); fix(sd); sd.id = 'pnvS'; sd.classList.remove('side');
    // بيانات المستخدم في الكرت
    var nm = sd.querySelector('#userName'); if (nm) nm.textContent = me.business_name || me.name || 'المزوّد';
    var av = sd.querySelector('#userAv'); if (av) av.textContent = String(me.business_name || me.name || 'م').trim().charAt(0);
    var lo = sd.querySelector('.logoutbtn'); if (lo) { lo.removeAttribute('onclick'); lo.addEventListener('click', function(){ try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch(e){} location.href = '/auth.html'; }); }
    D.body.insertBefore(sd, D.body.firstChild);
    // العنصر المفعّل
    [].forEach.call(sd.querySelectorAll('.ni'), function(b){ b.classList.toggle('on', b.id === cur); });
    // صلاحيات: المفوّض ما يشوف عناصر صاحب الحساب
    var dl = me.delegate, hide = function(id){ var e = sd.querySelector('#' + id); if (e) e.style.display = 'none'; };
    if (dl) { ['ni-dlg', 'ni-saai', 'ni-plan', 'ni-ideas', 'ni-branches'].forEach(hide); var p = dl.perms || [];
      if (p.indexOf('quotes') < 0) { hide('ni-mypage'); hide('ni-quotes'); } if (p.indexOf('jobs') < 0) { hide('ni-jobs'); hide('ni-cal'); hide('ni-att'); } if (p.indexOf('customers') < 0) hide('ni-cust'); if (p.indexOf('stats') < 0) hide('ni-stats');
      var dm = sd.querySelector('#ni-dlgme'); if (dm) dm.style.display = ''; }
    else hide('ni-dlgme');
    fetch('/api/subs/open', { headers: { Authorization: 'Bearer ' + tok } }).then(function(r){ return r.ok ? r.json() : null; }).then(function(r){
      if (r && r.open) ['ni-plan', 'ni-mypage', 'ni-quotes', 'ni-jobs', 'ni-cal', 'ni-att', 'ni-cust', 'ni-branches'].forEach(function(id){ var e = sd.querySelector('#' + id); if (e && !(dl && e.style.display === 'none' && id !== 'ni-plan')) e.style.display = dl && id === 'ni-plan' ? 'none' : ''; });
      if (dl) { var p = dl.perms || []; if (p.indexOf('quotes') < 0) { hide('ni-mypage'); hide('ni-quotes'); } if (p.indexOf('jobs') < 0) { hide('ni-jobs'); hide('ni-cal'); hide('ni-att'); } if (p.indexOf('customers') < 0) hide('ni-cust'); }
    }).catch(function(){}).then(function(){ arrange(sd.querySelector('.nav'), cur); });
    // «‹ لوحة التحكم»: لو جاي من اللوحة نرجع لها بنفس حالتها (رجوع) بدل ما نفتحها من جديد
    D.addEventListener('click', function(e){ var a = e.target.closest && e.target.closest('a[href="/dashboard-provider.html"],a[href="dashboard-provider.html"]'); if (!a || e.metaKey || e.ctrlKey) return;
      var ref = ''; try { ref = new URL(D.referrer).origin === location.origin ? new URL(D.referrer).pathname : ''; } catch(_){ }
      if (/dashboard-provider/.test(ref) && history.length > 1) { e.preventDefault(); history.back(); } }, true);
    // الجوال: نفس الشريط السفلي — «المزيد» يفتح قائمة اللوحة
    if (bnav) { var bn = D.importNode(bnav, true); fix(bn); bn.id = 'pnvB'; bn.classList.remove('bnav');
      [].forEach.call(bn.querySelectorAll('.bni'), function(b){ b.classList.remove('on'); });
      var pr = bn.querySelector('#bn-profile'); if (pr) { var c = pr.cloneNode(true); pr.parentNode.replaceChild(c, pr); pr = c;
        var ic = pr.querySelector('.bic'); if (ic) ic.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>';
        var t = pr.querySelector('.bt'); if (t) t.textContent = 'المزيد'; pr.classList.add('on'); pr.addEventListener('click', function(){ location.href = '/dashboard-provider.html#more'; }); }
      var bb = bn.querySelector('#bn-chat-badge'); if (bb) bb.style.display = 'none';
      D.body.appendChild(bn);
      // يختفي لو الصفحة فيها شريط أزرار سفلي أو نافذة مفتوحة (ما يغطّيها)
      function tick(){ var busy = [].some.call(D.querySelectorAll('.bar, .sheet-ov, .qr-ov, #sh'), function(e){ return e.offsetParent !== null || getComputedStyle(e).position === 'fixed' && e.getBoundingClientRect().height > 0; });
        var mob = W.innerWidth <= 768; bn.style.display = mob && !busy ? 'block' : 'none'; D.body.classList.toggle('pnv-b', mob && !busy); }
      tick(); setInterval(tick, 600); W.addEventListener('resize', tick); }
  }).catch(function(){});
})();

/* ═══ بحث شامل للمزوّد: العملاء والمشاريع وعروض الأسعار والفنيين — من أي صفحة (🔍 أو Ctrl/⌘+K أو /) ═══ */
(function(){
  var W = window, D = document; if (W.MQ_SRCH) return;
  var ICON = { cust: '👥', job: '🧰', quote: '📄', tech: '👷' }, KIND = { cust: 'العملاء', job: 'المشاريع', quote: 'عروض الأسعار', tech: 'الفريق' };
  var QUICK = [['📄', 'عرض سعر جديد', '/quotes.html?new=1'], ['🧰', 'مشروع يدوي', '/jobs.html?new=1'], ['👥', 'دفتر العملاء', '/customers.html'], ['🗓', 'تقويم الجدولة', '/cal.html'], ['⏱', 'الحضور والانصراف', '/att.html']];
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function tok(){ try { return localStorage.getItem('token') || ''; } catch(e){ return ''; } }
  function recent(){ try { return JSON.parse(localStorage.getItem('mnq_srch') || '[]'); } catch(e){ return []; } }
  function remember(it){ try { var r = recent().filter(function(x){ return x.u !== it.u; }); r.unshift({ k: it.k, t: it.t, s: it.s, u: it.u }); localStorage.setItem('mnq_srch', JSON.stringify(r.slice(0, 6))); } catch(e){} }
  var css = '.msr-ov{position:fixed;inset:0;z-index:2147483400;background:rgba(15,23,42,.5);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);display:flex;justify-content:center;align-items:flex-start;padding:max(12px,env(safe-area-inset-top)) 12px 12px;direction:rtl;font-family:Tajawal,system-ui,sans-serif;animation:msrF .15s ease-out}'
    + '@keyframes msrF{from{opacity:0}to{opacity:1}}@keyframes msrU{from{transform:translateY(-8px);opacity:0}to{transform:none;opacity:1}}'
    + '.msr{background:#fff;width:min(620px,100%);border-radius:22px;box-shadow:0 30px 70px -20px rgba(0,0,0,.5);overflow:hidden;display:flex;flex-direction:column;max-height:min(80vh,640px);margin-top:min(8vh,70px);animation:msrU .18s cubic-bezier(.2,.8,.2,1)}'
    + '@media(max-width:640px){.msr{margin-top:0;max-height:88vh}}'
    + '.msr-h{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #eef2f7}.msr-h span{font-size:18px}'
    + '.msr-h input{flex:1;min-width:0;border:0;outline:0;font-family:inherit;font-size:17px;font-weight:700;color:#0f172a;background:transparent;padding:6px 0}.msr-h input::placeholder{color:#94a3b8}'
    + '.msr-x{border:0;background:#f1f5f9;border-radius:10px;height:34px;padding:0 12px;font-family:inherit;font-weight:800;font-size:12.5px;color:#475467;cursor:pointer}'
    + '.msr-b{overflow:auto;padding:6px 8px 10px}.msr-g{font-size:11.5px;font-weight:900;color:#64748b;padding:10px 8px 4px}'
    + '.msr-i{display:flex;align-items:center;gap:11px;padding:10px 10px;border-radius:13px;text-decoration:none;color:#0f172a;cursor:pointer}.msr-i:hover,.msr-i.on{background:#eff4ff}'
    + '.msr-i .ic{flex:0 0 auto;width:38px;height:38px;border-radius:11px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:18px}.msr-i.on .ic{background:#fff}'
    + '.msr-i .tx{flex:1;min-width:0}.msr-i b{display:block;font-size:14.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.msr-i small{display:block;font-size:12px;font-weight:700;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '.msr-i mark{background:#fef08a;color:inherit;border-radius:3px;padding:0 1px}.msr-e{padding:26px 12px;text-align:center;color:#64748b;font-weight:700;font-size:13.5px;line-height:1.8}'
    + '.msr-k{display:flex;gap:12px;justify-content:center;padding:8px;border-top:1px solid #eef2f7;font-size:11.5px;font-weight:700;color:#94a3b8}@media(max-width:640px){.msr-k{display:none}}.msr-k kbd{background:#f1f5f9;border-radius:5px;padding:1px 6px;font-family:inherit;color:#475467}'
    + '.msr-btn{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:11px;border:0;background:rgba(255,255,255,.12);color:#fff;cursor:pointer;margin-inline-start:auto;margin-inline-end:10px}.msr-btn svg{width:18px;height:18px}';
  var st = D.createElement('style'); st.textContent = css; (D.head || D.documentElement).appendChild(st);
  var SVG = '<svg fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  function hl(t, q){ t = esc(t); if (!q) return t; var i = t.toLowerCase().indexOf(esc(q).toLowerCase()); return i < 0 ? t : t.slice(0, i) + '<mark>' + t.slice(i, i + esc(q).length) + '</mark>' + t.slice(i + esc(q).length); }
  function open(){
    if (D.querySelector('.msr-ov')) return;
    var ov = D.createElement('div'); ov.className = 'msr-ov'; ov.setAttribute('data-noback', '');
    ov.innerHTML = '<div class="msr" role="dialog" aria-modal="true" aria-label="بحث"><div class="msr-h"><span aria-hidden="true">🔍</span><input type="search" placeholder="ابحث بالاسم أو رقم الجوال أو رقم العرض…" aria-label="بحث" autocomplete="off" enterkeyhint="search"><button type="button" class="msr-x">إغلاق</button></div><div class="msr-b" role="listbox"></div><div class="msr-k"><span><kbd>↑</kbd><kbd>↓</kbd> تنقّل</span><span><kbd>Enter</kbd> فتح</span><span><kbd>Esc</kbd> إغلاق</span></div></div>';
    D.body.appendChild(ov); var inp = ov.querySelector('input'), box = ov.querySelector('.msr-b'), L = [], sel = 0, tm = 0, seq = 0;
    function close(){ ov.remove(); D.removeEventListener('keydown', key, true); }
    function paint(items, q){ L = items; sel = 0;
      if (!q) { var r = recent(); var h = (r.length ? '<div class="msr-g">آخر ما فتحته</div>' + r.map(function(x, i){ return row(x, i, ''); }).join('') : '') + '<div class="msr-g">اختصارات</div>';
        L = r.concat(QUICK.map(function(x){ return { k: 'q', ic: x[0], t: x[1], u: x[2] }; }));
        h += L.slice(r.length).map(function(x, i){ return row(x, r.length + i, ''); }).join(''); box.innerHTML = h; mark(); return; }
      if (!items.length) { box.innerHTML = '<div class="msr-e">ما لقينا شي باسم «' + esc(q) + '»<br><span style="font-size:12.5px">جرّب جزء من الاسم أو آخر 4 أرقام من الجوال</span></div>'; return; }
      var h2 = '', last = ''; items.forEach(function(x, i){ if (x.k !== last) { h2 += '<div class="msr-g">' + KIND[x.k] + '</div>'; last = x.k; } h2 += row(x, i, q); }); box.innerHTML = h2; mark(); }
    function row(x, i, q){ return '<a class="msr-i" role="option" data-i="' + i + '" href="' + esc(x.u) + '"><span class="ic" aria-hidden="true">' + (x.ic || ICON[x.k] || '•') + '</span><span class="tx"><b>' + hl(x.t, q) + '</b>' + (x.s ? '<small>' + hl(x.s, q) + '</small>' : '') + '</span></a>'; }
    function mark(){ [].forEach.call(box.querySelectorAll('.msr-i'), function(a){ var on = +a.getAttribute('data-i') === sel; a.classList.toggle('on', on); a.setAttribute('aria-selected', on); if (on && a.scrollIntoView) a.scrollIntoView({ block: 'nearest' }); }); }
    function go(i){ var x = L[i]; if (!x) return; if (x.k !== 'q') remember(x); location.href = x.u; }
    function search(){ var q = inp.value.trim(); clearTimeout(tm); if (q.length < 2) { paint([], ''); return; }
      tm = setTimeout(function(){ var k = ++seq; box.innerHTML = box.innerHTML || '<div class="msr-e">جاري البحث…</div>';
        fetch('/api/provider/search?q=' + encodeURIComponent(q), { headers: { 'Authorization': 'Bearer ' + tok() } }).then(function(r){ return r.ok ? r.json() : { items: [] }; }).then(function(d){ if (k === seq) paint(d.items || [], q); }).catch(function(){ if (k === seq) box.innerHTML = '<div class="msr-e">تعذّر البحث — تأكد من النت</div>'; }); }, 220); }
    function key(e){ if (e.key === 'Escape') { e.preventDefault(); close(); } else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(L.length - 1, sel + 1); mark(); } else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); mark(); } else if (e.key === 'Enter' && D.activeElement === inp) { e.preventDefault(); go(sel); } }
    inp.addEventListener('input', search); D.addEventListener('keydown', key, true);
    ov.addEventListener('click', function(e){ if (e.target === ov || e.target.closest('.msr-x')) { close(); return; } var a = e.target.closest('.msr-i'); if (a) { e.preventDefault(); go(+a.getAttribute('data-i')); } });
    paint([], ''); setTimeout(function(){ inp.focus(); }, 30);
  }
  W.MQ_SRCH = { open: open };
  D.addEventListener('keydown', function(e){ var t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open(); } else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) { e.preventDefault(); open(); } });
  // زر 🔍: بالشريط العلوي لصفحات الأدوات، وبرأس لوحة المزوّد بالجوال
  function addBtn(){ if (D.querySelector('.msr-btn, #mob-srch')) return;
    var top = D.querySelector('.top'); if (top && top.querySelector('a[href="/dashboard-provider.html"]')) { var b = D.createElement('button'); b.type = 'button'; b.className = 'msr-btn'; b.setAttribute('aria-label', 'بحث'); b.innerHTML = SVG; b.onclick = open; top.insertBefore(b, top.querySelector('a[href="/dashboard-provider.html"]')); return; }
    var mr = D.querySelector('.mob-right'); if (mr) { var n = mr.querySelector('.mob-notif'); var b2 = D.createElement('button'); b2.type = 'button'; b2.className = 'mob-notif'; b2.id = 'mob-srch'; b2.setAttribute('aria-label', 'بحث'); b2.innerHTML = SVG.replace('<svg', '<svg width="20" height="20"'); b2.onclick = open; mr.insertBefore(b2, n || mr.firstChild); } }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', addBtn); else addBtn();
})();
