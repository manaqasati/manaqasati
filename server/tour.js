// ═══ الجولة التعريفية — أول دخول (مرة وحدة لكل حساب) وتنعاد من زر «؟» ═══
(function(){
  function A(){ return window.API || ''; }
  var STEPS = {
    client: [
      { sel: ['.bni-fab', '.btn-new'], t: '＋ انشر مشروعك', d: 'اكتب وش تبي تنفّذ، وأضف صور أو مخطط لو عندك. مشروعك يوصل للمزوّدين المناسبين في مدينتك — <b>مجاناً</b>.' },
      { sel: ['#bn-requests', '.nav .ni[onclick*="\'requests\'"]'], t: '📋 مشاريعي', d: 'هنا مشاريعك والعروض اللي جتك. افتح أي مشروع <b>تقارن العروض</b> وتختار الأنسب — وتقدر <b>تدعو مقاول تعرفه</b> برابط مشروعك بالواتساب.' },
      { sel: ['.mob-notif[onclick*="notifs"]', '.nav .ni[onclick*="notifs"]'], t: '🔔 الإشعارات', d: 'يوصلك تنبيه أول ما يجيك عرض أو رسالة — فعّل الإشعارات عشان ما يفوتك شي.' },
      { sel: ['#tourQ', '#tourQd'], t: '؟ تبي الجولة مرة ثانية', d: 'أي وقت تحتاج تتذكر، اضغط هنا وتعيد الجولة.', last: true }
    ],
    provider: [
      { sel: ['.pa-focus'], t: '⚡ أهم شي اليوم', d: 'نقول لك وش أهم خطوة الحين — مشروع جديد يناسب <b>تخصصك ومدينتك</b>، أو عرض يحتاج ردك.' },
      { sel: ['.bni-fab', '.btn-new'], t: '🎯 تصفّح المشاريع وقدّم عرضك', d: 'كل المشاريع المفتوحة. قدّم عرضك بدري — العملاء يشوفون أول العروض أكثر.' },
      { sel: ['.pa-share'], t: '👁️ صفحتك العامة', d: 'صفحتك فيها شغلك وتقييماتك. <b>شاركها</b> بالواتساب والسناب وخل العملاء يوصلونك.' },
      { sel: ['#bn-profile', '#ni-profile'], t: '👤 كمّل صفحتك', d: 'أضف صور أعمالك ونبذة عنك — الصفحة الكاملة تجيب ثقة العميل وعروضك تنقبل أكثر.' },
      { sel: ['#ni-saai'], t: '💰 السعي', d: 'لما ينقبل عرضك، عمولة المنصة <b>3% من قيمة الاتفاق</b> وتدفعها خلال 10 أيام. ترفع إيصال التحويل من هنا بضغطة.' },
      { sel: ['#tourQ', '#tourQd'], t: '؟ تبي الجولة مرة ثانية', d: 'أي وقت تحتاج تتذكر، اضغط هنا وتعيد الجولة.', last: true }
    ]
  };
  var WEL = {
    client: 'جولة سريعة <b>30 ثانية</b> تعرّفك على أهم الأزرار — كيف تنشر مشروعك وتجيك العروض وتختار أفضلها.',
    provider: 'جولة سريعة <b>30 ثانية</b> تعرّفك على أهم الأزرار — كيف تلقى المشاريع وتقدّم عروضك وتكبر صفحتك.'
  };
  var KEY = { client: 'client1', provider: 'provider1' };
  var role = /dashboard-provider/.test(location.pathname) ? 'provider' : 'client';
  var cur = -1, steps = [], els = {};
  function tok(){ try { return localStorage.getItem('token') || ''; } catch(e){ return ''; } }
  function hdr(){ return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok() }; }
  function lsGet(){ try { return localStorage.getItem('mnq_tour_' + KEY[role]); } catch(e){ return null; } }
  function lsSet(){ try { localStorage.setItem('mnq_tour_' + KEY[role], '1'); } catch(e){} }
  function markSeen(){ lsSet(); try { fetch(A() + '/api/tour', { method: 'POST', headers: hdr(), body: JSON.stringify({ key: KEY[role] }) }).catch(function(){}); } catch(e){} }
  function vis(el){ if (!el) return false; var r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; var s = getComputedStyle(el); return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity || 1) > 0.05; }
  function find(st){ for (var i = 0; i < st.sel.length; i++){ var l = document.querySelectorAll(st.sel[i]); for (var j = 0; j < l.length; j++) if (vis(l[j])) return l[j]; } return null; }
  function css(){
    if (document.getElementById('tour-css')) return;
    var s = document.createElement('style'); s.id = 'tour-css';
    s.textContent = '.tr-dim{position:fixed;inset:0;background:rgba(6,13,32,.62);z-index:99990;animation:trF .25s ease}'
      + '.tr-spot{position:fixed;border-radius:14px;box-shadow:0 0 0 9999px rgba(6,13,32,.66),0 0 0 3px #fff,0 0 0 9px rgba(47,107,255,.45);z-index:99991;pointer-events:none;transition:all .35s cubic-bezier(.4,0,.2,1)}'
      + '.tr-blk{position:fixed;inset:0;z-index:99990}'
      + '.tr-pop{position:fixed;z-index:99993;background:#fff;color:#0f1d3a;border-radius:18px;padding:18px 18px 14px;box-shadow:0 24px 60px -12px rgba(0,0,0,.45);width:min(340px,calc(100vw - 32px));font-family:inherit;direction:rtl;animation:trU .3s ease;transition:top .35s,left .35s}'
      + '.tr-pop .st{font-size:11.5px;font-weight:800;color:#2f6bff}.tr-pop h4{margin:6px 0;font-size:17px;font-weight:900}.tr-pop p{margin:0;font-size:13.5px;line-height:1.8;color:#41506f}'
      + '.tr-ft{display:flex;align-items:center;gap:8px;margin-top:14px}.tr-ft button{font-family:inherit;cursor:pointer;min-height:38px}'
      + '.tr-nx{background:#1d4ed8;color:#fff;border:0;border-radius:10px;padding:8px 16px;font-weight:800;font-size:13.5px;white-space:nowrap}'
      + '.tr-pv{background:#fff;color:#41506f;border:1px solid #dfe6f2;border-radius:10px;padding:7px 12px;font-weight:800;font-size:13px}'
      + '.tr-sk{background:none;border:0;color:#8a97b2;font-weight:700;font-size:12.5px;white-space:nowrap;padding:0 4px}'
      + '.tr-dots{display:flex;gap:5px;margin-inline-start:auto}.tr-dots i{width:7px;height:7px;border-radius:5px;background:#dbe3f1;transition:all .3s}.tr-dots i.on{width:20px;background:#2f6bff}'
      + '.tr-ar{position:fixed;width:16px;height:16px;background:#fff;transform:rotate(45deg);z-index:99992;transition:top .35s,left .35s}'
      + '.tr-wel{position:fixed;z-index:99993;left:50%;top:50%;transform:translate(-50%,-50%);width:min(380px,calc(100vw - 40px));background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px -10px rgba(0,0,0,.5);direction:rtl;animation:trU .35s ease;font-family:inherit;color:#0f1d3a}'
      + '.tr-wh{height:140px;background:linear-gradient(135deg,#0b1f4d,#1d4ed8 60%,#3b82f6);display:flex;align-items:center;justify-content:center;font-size:52px;position:relative}'
      + '.tr-wh:after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 20% 20%,rgba(255,255,255,.18),transparent 40%)}'
      + '.tr-wb{padding:22px 22px 18px;text-align:center}.tr-wb h3{margin:0;font-size:21px;font-weight:900}.tr-wb p{margin:8px 0 18px;line-height:1.8;font-size:14px;color:#5b6b8c}.tr-wb p b{color:#0f1d3a}'
      + '.tr-go{width:100%;background:#1d4ed8;color:#fff;border:0;border-radius:13px;padding:14px;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer}'
      + '.tr-lt{background:none;border:0;color:#8a97b2;font-family:inherit;font-weight:700;font-size:13px;margin-top:10px;cursor:pointer;padding:8px}'
      + '.tr-q{display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:15px}'
      + '@keyframes trF{from{opacity:0}}@keyframes trU{from{opacity:0;transform:translateY(8px)}}'
      + '.tr-wel{animation:trW .35s ease}@keyframes trW{from{opacity:0;transform:translate(-50%,-46%)}}'
      + '[data-theme="dark"] .tr-pop,[data-theme="dark"] .tr-wel,[data-theme="dark"] .tr-ar{background:#111a2e;color:#e6ebf5}[data-theme="dark"] .tr-pop p,[data-theme="dark"] .tr-wb p{color:#a9b6d3}[data-theme="dark"] .tr-wb p b{color:#fff}[data-theme="dark"] .tr-pv{background:#111a2e;color:#c9d4ee;border-color:#2a3a5e}';
    document.head.appendChild(s);
  }
  function clear(){ ['tr-dim','tr-spot','tr-pop','tr-ar','tr-wel','tr-blk'].forEach(function(id){ var e = document.getElementById(id); if (e) e.remove(); }); window.removeEventListener('resize', place); document.removeEventListener('keydown', key, true); }
  function end(){ clear(); cur = -1; markSeen(); }
  function key(e){ if (e.key === 'Escape') { e.preventDefault(); end(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur + 1); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(cur - 1); } }
  function welcome(){
    css(); clear();
    var d = document.createElement('div'); d.id = 'tr-dim'; d.className = 'tr-dim'; document.body.appendChild(d);
    var w = document.createElement('div'); w.id = 'tr-wel'; w.className = 'tr-wel'; w.setAttribute('role', 'dialog');
    w.innerHTML = '<div class="tr-wh">👋</div><div class="tr-wb"><h3>أهلاً بك في مناقصة</h3><p>' + WEL[role] + '</p><button type="button" class="tr-go">ابدأ الجولة</button>' + (role === 'provider' ? '<button type="button" class="tr-lt tr-vd" style="color:#1d4ed8">▶️ أو شوف فيديو: كيف تقدّم عرضك (دقيقة)</button>' : '') + '<button type="button" class="tr-lt">لاحقاً</button></div>';
    document.body.appendChild(w);
    w.querySelector('.tr-go').onclick = function(){ start(); };
    [].forEach.call(w.querySelectorAll('.tr-lt'), function(b){ b.onclick = function(){ end(); if (b.classList.contains('tr-vd') && window.Guide) Guide.show('bid', { primary: ['تمام ✓'] }); }; });
    document.addEventListener('keydown', key, true);
  }
  function start(){
    css(); clear();
    steps = STEPS[role].filter(function(st){ return !!find(st); });
    if (!steps.length) { end(); return; }
    var b = document.createElement('div'); b.id = 'tr-blk'; b.className = 'tr-blk'; document.body.appendChild(b);
    var sp = document.createElement('div'); sp.id = 'tr-spot'; sp.className = 'tr-spot'; document.body.appendChild(sp);
    var ar = document.createElement('div'); ar.id = 'tr-ar'; ar.className = 'tr-ar'; document.body.appendChild(ar);
    var p = document.createElement('div'); p.id = 'tr-pop'; p.className = 'tr-pop'; p.setAttribute('role', 'dialog'); document.body.appendChild(p);
    window.addEventListener('resize', place); document.addEventListener('keydown', key, true);
    go(0);
  }
  function go(i){
    if (i < 0) return; if (i >= steps.length) { end(); return; }
    cur = i; var st = steps[i], el = find(st);
    if (!el) { steps.splice(i, 1); go(i); return; }
    var r0 = el.getBoundingClientRect();
    if (r0.top < 60 || r0.bottom > innerHeight - 20) { try { el.scrollIntoView({ block: 'center' }); } catch(e){} }
    var n = steps.length, last = i === n - 1;
    var p = document.getElementById('tr-pop');
    p.innerHTML = '<div class="st">الخطوة ' + (i + 1) + ' من ' + n + '</div><h4>' + st.t + '</h4><p>' + st.d + '</p>'
      + '<div class="tr-ft"><button type="button" class="tr-nx">' + (last ? 'يلا نبدأ 🚀' : 'التالي ←') + '</button>' + (i ? '<button type="button" class="tr-pv">السابق</button>' : '') + (last ? '' : '<button type="button" class="tr-sk">تخطي الجولة</button>')
      + '<div class="tr-dots">' + steps.map(function(_, k){ return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join('') + '</div></div>';
    p.querySelector('.tr-nx').onclick = function(){ go(i + 1); };
    if (p.querySelector('.tr-pv')) p.querySelector('.tr-pv').onclick = function(){ go(i - 1); };
    if (p.querySelector('.tr-sk')) p.querySelector('.tr-sk').onclick = end;
    els.el = el; setTimeout(place, 30); setTimeout(function(){ try { p.querySelector('.tr-nx').focus({ preventScroll: true }); } catch(e){} }, 60);
  }
  function place(){
    var el = els.el, sp = document.getElementById('tr-spot'), p = document.getElementById('tr-pop'), ar = document.getElementById('tr-ar'); if (!el || !sp || !p) return;
    var r = el.getBoundingClientRect(), pad = 6;
    var x = r.left - pad, y = r.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
    sp.style.left = x + 'px'; sp.style.top = y + 'px'; sp.style.width = w + 'px'; sp.style.height = h + 'px';
    var pw = p.offsetWidth, ph = p.offsetHeight, vw = innerWidth, vh = innerHeight, cx = x + w / 2;
    var below = (y + h + 16 + ph) < vh - 8 || y < ph + 24;
    var top = below ? y + h + 15 : y - ph - 15;
    var left = Math.max(16, Math.min(vw - pw - 16, cx - pw / 2));
    p.style.top = Math.max(8, top) + 'px'; p.style.left = left + 'px';
    ar.style.left = Math.max(left + 14, Math.min(left + pw - 30, cx - 8)) + 'px';
    ar.style.top = (below ? y + h + 8 : y - 23) + 'px';
  }
  window.Tour = { start: function(){ welcome(); }, steps: function(){ start(); } };
  // أول دخول: نتأكد من السيرفر (عشان ما تطلع مرة ثانية من جهاز ثاني)
  function boot(){
    if (lsGet() || !tok()) return;
    if (/[?&](open|id|req|tab|exec|new)=/.test(location.search) || (location.hash && !/^#(home)?$/.test(location.hash))) return;
    fetch(A() + '/api/tour', { headers: hdr() }).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){
      if (!d) return; if ((d.seen || []).indexOf(KEY[role]) >= 0) { lsSet(); return; }
      var tries = 0; (function wait(){
        tries++;
        var busy = document.querySelector('.overlay.on,.overlay.show,.modal.on,.sheet.on,#tr-wel,#gv-ov');
        var home = document.getElementById('page-home'); var onHome = !home || home.classList.contains('on') || home.offsetParent !== null;
        if (!busy && onHome && find(STEPS[role][0])) { welcome(); return; }
        if (tries < 20) setTimeout(wait, 700);
      })();
    }).catch(function(){});
  }
  if (document.readyState === 'complete') setTimeout(boot, 1800); else window.addEventListener('load', function(){ setTimeout(boot, 1800); });
})();
