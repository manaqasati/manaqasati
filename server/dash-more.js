/* زر «المزيد» في الجوال (لوحة المزوّد والعميل): قائمة بلاطات تطلع من تحت والشريط السفلي يبقى ظاهر */
(function(){
  'use strict';
  var W = window, D = document;
  if (W.__mnqMore) return; W.__mnqMore = true;
  var PROV = /dashboard-provider/.test(location.pathname);
  function me(){ try { return JSON.parse(localStorage.getItem('user') || '{}') || {}; } catch(e){ return {}; } }
  function tok(){ try { return localStorage.getItem('token') || ''; } catch(e){ return ''; } }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function badgeOf(ids){ for (var i = 0; i < ids.length; i++){ var el = D.getElementById(ids[i]); if (el && el.style.display !== 'none'){ var n = parseInt(el.textContent, 10); if (n > 0) return n; } } return 0; }
  function fmt(n){ try { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 }); } catch(e){ return String(n); } }

  var SV = {
    search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    doc:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
    money:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
    star:'<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    bell:'<path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
    eye:'<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    contract:'<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
    chat:'<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
    map:'<path d="M12 22s7-6.4 7-12a7 7 0 10-14 0c0 5.6 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
    help:'<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01"/>'
  };
  function ic(k){ return '<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">' + SV[k] + '</svg>'; }

  var CSS = ''
    + '#mqMore{position:fixed;inset:0;z-index:99;display:none}#mqMore.on{display:block}'
    + '#mqMore .mm-dim{position:absolute;inset:0;background:rgba(11,31,77,.5);opacity:0;transition:opacity .2s}#mqMore.in .mm-dim{opacity:1}'
    + '#mqMore .mm-sh{position:absolute;left:0;right:0;bottom:0;max-height:calc(100% - 40px);overflow-y:auto;-webkit-overflow-scrolling:touch;background:var(--white,#fff);border-radius:26px 26px 0 0;padding:10px 14px calc(104px + env(safe-area-inset-bottom,0px));box-shadow:0 -20px 50px rgba(0,0,0,.25);transform:translateY(100%);transition:transform .24s cubic-bezier(.2,.8,.2,1);direction:rtl;font-family:Tajawal,sans-serif}'
    + '#mqMore.in .mm-sh{transform:none}'
    + '#mqMore .mm-grip{width:44px;height:5px;border-radius:5px;background:#cbd5e1;margin:0 auto 10px}'
    + '#mqMore .mm-me{display:flex;align-items:center;gap:11px;border-radius:18px;padding:12px 13px;background:linear-gradient(135deg,#0b1f4d,#1e3a8a);color:#fff;margin-bottom:10px}'
    + '#mqMore .mm-av{width:44px;height:44px;border-radius:13px;background:#fff;color:#1e3a8a;font:900 19px Cairo,sans-serif;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}#mqMore .mm-av img{width:100%;height:100%;object-fit:cover}'
    + '#mqMore .mm-nm{flex:1;min-width:0}#mqMore .mm-nm b{display:block;font-size:15.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#mqMore .mm-nm small{font-size:12px;font-weight:800;color:#bfdbfe}'
    + '#mqMore .mm-share{background:#fff;color:#0b1f4d;border:0;border-radius:11px;padding:8px 12px;font:900 12.5px Tajawal,sans-serif;cursor:pointer;flex-shrink:0}'
    + '#mqMore .mm-new{display:block;width:100%;border:0;background:#1d4ed8;color:#fff;border-radius:15px;padding:13px;font:900 15px Tajawal,sans-serif;margin-bottom:10px;cursor:pointer}'
    + '#mqMore .mm-g{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}'
    + '#mqMore .mm-t{position:relative;border:0;border-radius:16px;padding:11px 10px;display:flex;flex-direction:column;align-items:flex-start;gap:5px;text-align:right;cursor:pointer;min-height:92px;font-family:inherit;transition:transform .12s}'
    + '#mqMore .mm-t:active{transform:scale(.96)}'
    + '#mqMore .mm-i{width:34px;height:34px;border-radius:11px;background:#fff;display:flex;align-items:center;justify-content:center}'
    + '#mqMore .mm-t b{font-size:13px;font-weight:900;color:#0f2544;line-height:1.35}'
    + '#mqMore .mm-t small{font-size:10.5px;font-weight:700;color:#475569;line-height:1.4}'
    + '#mqMore .mm-t small.red{color:#b91c1c;font-weight:900}'
    + '#mqMore .mm-bd{position:absolute;top:8px;left:8px;background:#ef4444;color:#fff;font-size:10.5px;font-weight:900;border-radius:999px;padding:1px 7px;min-width:18px;text-align:center}'
    + '#mqMore .mm-f{display:flex;gap:8px;margin-top:10px}'
    + '#mqMore .mm-f button,#mqMore .mm-f a{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;border:1.5px solid var(--border,#dbe5f5);background:var(--white,#fff);color:var(--text,#334766);border-radius:13px;padding:11px 6px;font:900 13px Tajawal,sans-serif;text-decoration:none;cursor:pointer}'
    + '#mqMore .mm-out{display:block;width:100%;background:none;border:0;color:#dc2626;font:900 14px Tajawal,sans-serif;padding:12px;margin-top:4px;cursor:pointer}'
    + '#mqMore .c1{background:#dbeafe}#mqMore .c1 .mm-i{color:#1d4ed8}#mqMore .c2{background:#ede9fe}#mqMore .c2 .mm-i{color:#6d28d9}#mqMore .c3{background:#fee2e2}#mqMore .c3 .mm-i{color:#b91c1c}'
    + '#mqMore .c4{background:#fef3c7}#mqMore .c4 .mm-i{color:#b45309}#mqMore .c5{background:#e0f2fe}#mqMore .c5 .mm-i{color:#0369a1}#mqMore .c6{background:#dcfce7}#mqMore .c6 .mm-i{color:#15803d}'
    + '#mqMore .c7{background:#fef9c3}#mqMore .c7 .mm-i{color:#a16207}#mqMore .c8{background:#f1f5f9}#mqMore .c8 .mm-i{color:#334766}'
    + '[data-theme="dark"] #mqMore .mm-t{background:rgba(255,255,255,.06)}[data-theme="dark"] #mqMore .mm-t b{color:#e2e8f0}[data-theme="dark"] #mqMore .mm-t small{color:#94a3b8}[data-theme="dark"] #mqMore .mm-i{background:rgba(255,255,255,.08)}'
    + '.bnav .bni.mm-on{background:rgba(14,165,233,.16)}.bnav .bni.mm-on .bt{color:var(--sky,#38bdf8)}.bnav .bni.mm-on .bic svg{stroke:var(--sky,#38bdf8)}'
    + '@media(min-width:769px){#mqMore{display:none!important}}'
    + '@media(prefers-reduced-motion:reduce){#mqMore .mm-sh,#mqMore .mm-dim{transition:none}}';

  function tile(cls, k, name, sub, badge, act, red){
    return '<button type="button" class="mm-t ' + cls + '" data-act="' + act + '">' + (badge ? '<span class="mm-bd">' + badge + '</span>' : '')
      + '<span class="mm-i">' + ic(k) + '</span><b>' + name + '</b><small' + (red ? ' class="red"' : '') + '>' + sub + '</small></button>';
  }
  var state = { saai: null };
  function tilesProv(){
    var nOpen = badgeOf(['nb-open']), nNot = badgeOf(['nb-notif', 'mob-nb']);
    var p = W._prof || {}, rat = parseFloat(p.avg_rating) || 0;
    var due = state.saai && state.saai.pending_total > 0 ? state.saai.pending_total : 0;
    return tile('c1', 'search', 'تصفح المشاريع', nOpen ? nOpen + ' مشروع يناسبك' : 'مشاريع تناسب تخصصك', nOpen, 'pg:browse')
      + tile('c2', 'doc', 'عروضي ومشاريعي', 'عروضك وحالة كل واحد', 0, 'pg:works')
      + tile('c3', 'money', 'محفظة السعي', due ? 'عليك ' + fmt(due) + ' ريال — سدّد' : 'ما عليك شي ✓', due ? '!' : 0, 'pg:saai', !!due)
      + tile('c4', 'star', 'تقييماتي', rat ? '★ ' + rat.toFixed(1) + ' من عملائك' : 'تقييمات عملائك', 0, 'pg:reviews')
      + tile('c5', 'bell', 'الإشعارات', nNot ? nNot + ' جديدة' : 'كل التنبيهات', nNot, 'pg:notifs')
      + tile('c6', 'eye', 'صفحتي العامة', 'شاركها واكسب عملاء', 0, 'pub')
      + tile('c7', 'contract', 'عقود المقاولات', '36 عقد جاهز مجاناً', 0, 'url:/contracts?src=more')
      + tile('c8', 'user', 'ملفي والإعدادات', 'تخصصك ومدينتك وبياناتك', 0, 'pg:profile')
      + tile('c6', 'help', 'الدعم الفني', 'واتساب مباشر', 0, 'wa');
  }
  function tilesCli(){
    var nNot = badgeOf(['notifBadge', 'mob-notif-badge']), nChat = badgeOf(['bn-chat-badge']);
    return tile('c1', 'doc', 'مشاريعي', 'مشاريعك وعروضها', 0, 'sh:requests')
      + tile('c6', 'chat', 'المحادثات', nChat ? nChat + ' رسالة ما قريتها' : 'محادثاتك مع المزوّدين', nChat, 'url:/chat')
      + tile('c5', 'bell', 'الإشعارات', nNot ? nNot + ' جديدة' : 'كل التنبيهات', nNot, 'sh:notifs')
      + tile('c7', 'contract', 'عقود المقاولات', '36 عقد جاهز مجاناً', 0, 'url:/contracts?src=more')
      + tile('c2', 'map', 'مزوّدين قريبين', 'تصفّح المزوّدين', 0, 'url:/#providers')
      + tile('c8', 'user', 'حسابي', 'بياناتك وإعداداتك', 0, 'sh:profile');
  }
  function head(){
    var u = me(), p = W._prof || {}, nm = p.name || u.name || 'حسابي', img = p.profile_image || u.profile_image || '';
    var ch = esc(String(nm).trim().charAt(0) || 'م');
    var av = img && /^(https?:|\/)/.test(img) ? '<img src="' + esc(img) + '" alt="" onerror="this.parentNode.textContent=this.parentNode.getAttribute(\'data-ch\')">' : ch;
    if (PROV) {
      var lvl = (p.badge === 'verified' || u.badge === 'verified') ? 'موثّق ✓' : 'مزوّد';
      return '<div class="mm-me"><div class="mm-av" data-ch="' + ch + '">' + av + '</div><div class="mm-nm"><b>' + esc(nm) + '</b><small>' + lvl + (p.city || u.city ? ' · ' + esc(p.city || u.city) : '') + '</small></div><button type="button" class="mm-share" data-act="share">شارك صفحتي</button></div>';
    }
    return '<div class="mm-me"><div class="mm-av" data-ch="' + ch + '">' + av + '</div><div class="mm-nm"><b>' + esc(nm) + '</b><small>عميل' + (u.city ? ' · ' + esc(u.city) : '') + '</small></div></div>'
      + '<button type="button" class="mm-new" data-act="sh:new">+ انشر مشروع جديد</button>';
  }
  function foot(){
    var sw = D.getElementById('switchDash'), canSw = sw && sw.style.display !== 'none';
    var u = me(); if (!canSw) canSw = PROV ? !!u.can_request : !!u.can_provide;
    var dark = D.documentElement.getAttribute('data-theme') === 'dark';
    return '<div class="mm-f">' + (PROV ? '' : '<button type="button" data-act="wa">💬 تواصل معنا</button>')
      + '<button type="button" data-act="theme">' + (dark ? '☀️ فاتح' : '🌙 ليلي') + '</button>'
      + (canSw ? '<button type="button" data-act="switch">⇄ ' + (PROV ? 'حساب العميل' : 'حساب المزوّد') + '</button>' : '') + '</div>'
      + '<button type="button" class="mm-out" data-act="out">تسجيل الخروج</button>';
  }

  var box, pushed = false, bk = null;
  function build(){
    if (box) return;
    var st = D.createElement('style'); st.textContent = CSS; D.head.appendChild(st);
    box = D.createElement('div'); box.id = 'mqMore'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'المزيد');
    box.innerHTML = '<div class="mm-dim"></div><div class="mm-sh"></div>';
    D.body.appendChild(box);
    box.querySelector('.mm-dim').addEventListener('click', function(){ close(); });
    box.addEventListener('click', function(e){ var b = e.target.closest('[data-act]'); if (b) act(b.getAttribute('data-act')); });
    // سحب لتحت للإغلاق
    var sh = box.querySelector('.mm-sh'), y0 = null;
    sh.addEventListener('touchstart', function(e){ if (sh.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
    sh.addEventListener('touchmove', function(e){ if (y0 == null) return; var dy = e.touches[0].clientY - y0; if (dy > 0) sh.style.transform = 'translateY(' + dy + 'px)'; }, { passive: true });
    sh.addEventListener('touchend', function(e){ if (y0 == null) return; var dy = (e.changedTouches[0].clientY - y0); y0 = null; sh.style.transform = ''; if (dy > 90) close(); });
  }
  function render(){
    box.querySelector('.mm-sh').innerHTML = '<div class="mm-grip"></div>' + head() + '<div class="mm-g">' + (PROV ? tilesProv() : tilesCli()) + '</div>' + foot();
  }
  function setOn(on){ var b = D.getElementById('bn-profile'); if (b) b.classList.toggle('mm-on', !!on); }
  function open(){
    build(); render();
    box.classList.add('on'); requestAnimationFrame(function(){ requestAnimationFrame(function(){ box.classList.add('in'); }); });
    D.documentElement.style.overflow = 'hidden'; setOn(true);
    if (W.mqBack) { if (!bk) bk = W.mqBack.push(function(){ bk = null; hide(); }); }
    else if (!pushed) { try { history.pushState({ mqMore: 1 }, ''); pushed = true; } catch(e){} }
    if (PROV && tok()) {
      fetch('/api/provider/saai', { headers: { Authorization: 'Bearer ' + tok() } }).then(function(r){ return r.ok ? r.json() : null; })
        .then(function(d){ if (d) { state.saai = d; if (box.classList.contains('on')) render(); } }).catch(function(){});
    }
  }
  function hide(){
    if (!box || !box.classList.contains('on')) return;
    box.classList.remove('in'); D.documentElement.style.overflow = ''; setOn(false);
    setTimeout(function(){ if (!box.classList.contains('in')) box.classList.remove('on'); }, 240);
  }
  function close(nav){
    if (!box || !box.classList.contains('on')) return;
    hide();
    if (bk) { var e = bk; bk = null; if (nav) W.mqBack.drop(e); else W.mqBack.release(e); }
    if (pushed) { pushed = false; if (!nav) { try { history.back(); } catch(e){} } }
  }
  W.addEventListener('popstate', function(){ if (pushed) { pushed = false; hide(); } });
  D.addEventListener('keydown', function(e){ if (e.key === 'Escape') close(); });

  function go(fn){ close(true); setTimeout(fn, 30); }
  function act(a){
    if (a.indexOf('pg:') === 0) return go(function(){ if (typeof W.gotoPage === 'function') W.gotoPage(a.slice(3)); });
    if (a.indexOf('sh:') === 0) return go(function(){ if (typeof W.show === 'function') W.show(a.slice(3), null, a.slice(3)); });
    if (a.indexOf('url:') === 0) { close(true); location.href = a.slice(4); return; }
    if (a === 'wa') { close(true); location.href = 'https://wa.me/966594011313'; return; }
    if (a === 'theme') { if (typeof W.toggleTheme === 'function') W.toggleTheme(); render(); return; }
    if (a === 'switch') { var sw = D.getElementById('switchDash'); close(true); if (sw) sw.click(); else location.href = PROV ? '/dashboard-client.html' : '/dashboard-provider.html'; return; }
    if (a === 'out') { close(true); if (typeof W.doLogout === 'function') W.doLogout(); else if (typeof W.logout === 'function') W.logout(); return; }
    if (a === 'pub' || a === 'share') {
      var u = (typeof W._pfLinkUrl === 'function') ? W._pfLinkUrl() : (location.origin + '/pro/' + (me().id || ''));
      if (a === 'pub') { close(true); location.href = u; return; }
      var txt = 'شوف أعمالنا وتقييمات عملائنا على منصة مناقصة 👇';
      if (navigator.share) { navigator.share({ title: 'صفحتي على مناقصة', text: txt, url: u }).catch(function(){}); return; }
      try { navigator.clipboard.writeText(txt + '\n' + u).then(function(){ var b = box.querySelector('.mm-share'); if (b) { b.textContent = '✓ نسخت الرابط'; setTimeout(function(){ b.textContent = 'شارك صفحتي'; }, 2000); } }); } catch(e){ prompt('انسخ الرابط:', u); }
    }
  }

  // زر «حسابي» في الشريط السفلي يصير «المزيد»
  function wire(){
    var b = D.getElementById('bn-profile'); if (!b || b.getAttribute('data-more')) return;
    b.setAttribute('data-more', '1'); b.removeAttribute('onclick');
    var ic_ = b.querySelector('.bic'); if (ic_) ic_.innerHTML = '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>';
    var t = b.querySelector('.bt'); if (t) t.textContent = 'المزيد';
    b.setAttribute('aria-label', 'المزيد'); b.setAttribute('aria-haspopup', 'dialog');
    b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); if (box && box.classList.contains('on')) close(); else open(); });
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', wire); else wire();
  D.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('.bnav .bni, .bnav .bni-fab'); if (b && b.id !== 'bn-profile') close(true); }, true);
  W.mqMoreOpen = open;
})();
