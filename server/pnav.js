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
