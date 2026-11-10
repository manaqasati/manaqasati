// «المفوّض»: صاحب الحساب يضيف مفوّض واحد بصلاحيات يحددها — والمفوّض لما يدخل يشوف بس اللي مسموح له
(function(){
  var W = window, D = document;
  var LBL = { bids: ['العروض', 'تصفّح المشاريع وتقديم عروض وتعديلها'], chat: ['المحادثات', 'الرد على العملاء'], awarded: ['المشاريع المرسّاة', 'متابعة التنفيذ وتأكيد الإنجاز'],
    profile: ['الملف الشخصي', 'النبذة والتخصصات والصور'], proofs: ['وثّق أعمالك', 'رفع مشاريع وطلب تقييمها'], sub: ['مقاول باطن', 'طلب مقاولين ومتابعتهم'] };
  var ORDER = ['bids', 'chat', 'awarded', 'profile', 'proofs', 'sub'];
  var LOCKED = ['حذف الحساب', 'تغيير الجوال والإيميل', 'كلمة السر', 'السعي والمدفوعات', 'إضافة مفوّض'];
  var S = { me: null, d: null, busy: false };
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function api(p, o){ return W._api ? W._api(p, o) : Promise.resolve(null); }
  function toast(m, t){ try { W.showToast(m, t); } catch(e) {} }
  function css(){
    if (D.getElementById('dlg-css')) return; var st = D.createElement('style'); st.id = 'dlg-css';
    st.textContent = '.dl-w{max-width:620px;margin:0 auto;display:flex;flex-direction:column;gap:12px}.dl-c{background:var(--card,#fff);border:1px solid var(--border,#e6e8ec);border-radius:16px;padding:16px}'
      + '.dl-in{background:#eef3ff;border-color:#dbe5ff}[data-theme=dark] .dl-in{background:rgba(59,130,246,.12);border-color:rgba(59,130,246,.3)}.dl-h{font-size:16px;font-weight:900;margin:0 0 4px}.dl-s{font-size:13px;color:var(--text2,#475569);line-height:1.8;font-weight:600}'
      + '.dl-f{width:100%;box-sizing:border-box;border:1.5px solid var(--border,#d5d9e0);border-radius:12px;padding:12px;font:inherit;font-size:14.5px;background:var(--bg,#fff);color:inherit;margin-top:8px}'
      + '.dl-pr{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid var(--border,#eef0f3);cursor:pointer}.dl-pr b{display:block;font-size:14px}.dl-pr small{display:block;font-size:12px;color:var(--muted,#64748b);font-weight:600;margin-top:2px}'
      + '.dl-tg{width:44px;height:26px;border-radius:99px;background:#cbd5e1;position:relative;flex:none;transition:.2s;border:0;padding:0;cursor:pointer}.dl-tg:after{content:"";position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}'
      + '.dl-tg.on{background:#1e3a8a}.dl-tg.on:after{right:21px}[data-theme=dark] .dl-tg.on{background:#3b82f6}'
      + '.dl-b{border:0;border-radius:12px;padding:13px;font:inherit;font-size:14.5px;font-weight:800;cursor:pointer;width:100%}.dl-bp{background:#1e3a8a;color:#fff}.dl-bo{background:var(--card,#fff);border:1.5px solid var(--border,#d5d9e0);color:inherit}.dl-bd{background:transparent;color:#dc2626;border:1.5px solid #fecaca}'
      + '.dl-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.dl-chip{font-size:11.5px;font-weight:700;border-radius:99px;padding:4px 10px;background:var(--bg,#f3f4f6);color:var(--muted,#6b7280)}'
      + '.dl-me{display:flex;align-items:center;gap:12px}.dl-av{width:46px;height:46px;border-radius:50%;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px;flex:none}'
      + '.dl-st{display:inline-block;font-size:11.5px;font-weight:800;border-radius:99px;padding:3px 10px}.dl-ok{background:#dcfce7;color:#15803d}.dl-wt{background:#fef3c7;color:#92400e}'
      + '.dl-ban{display:flex;align-items:center;gap:8px;background:#fff7e6;border:1px solid #fde3a7;color:#7c4a03;border-radius:12px;padding:10px 14px;font-size:13px;font-weight:700;margin:0 0 12px;line-height:1.6}[data-theme=dark] .dl-ban{background:rgba(245,158,11,.12);border-color:rgba(245,158,11,.35);color:#fcd34d}'
      + '.dl-row{display:flex;gap:8px;flex-wrap:wrap}.dl-row .dl-b{flex:1;min-width:140px}.dl-b:disabled{opacity:.5;cursor:not-allowed}.dl-ps{background:#fee2e2;color:#b91c1c}'
      + '.dl-lg{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid var(--border,#eef0f3)}.dl-lg>span{font-size:16px;line-height:1.4}.dl-lg b{display:block;font-size:13.5px;font-weight:800;line-height:1.6}.dl-lg i{font-style:normal;font-weight:600;color:var(--text2,#475569)}.dl-lg small{display:block;font-size:11.5px;color:var(--muted,#64748b);font-weight:600}'
      + '.dl-more{background:none;border:0;color:#1e3a8a;font:inherit;font-weight:800;font-size:13px;cursor:pointer;width:100%;padding:10px 0 0}[data-theme=dark] .dl-more{color:#93c5fd}';
    D.head.appendChild(st);
  }
  // ─── وضع المفوّض ───
  var PAGE_PERM = { browse: 'bids', works: 'bids', profile: 'profile', proof: 'proofs', sub: 'sub', chat: 'chat' };
  function okPage(p){ if (p === 'dlgme') return !!S.me; if (!S.me) return true; if (p === 'saai' || p === 'dlg') return false; var k = PAGE_PERM[p]; return !k || S.me.perms.indexOf(k) >= 0; }
  function hide(id){ var e = D.getElementById(id); if (e) e.style.display = 'none'; }
  function applyMe(){
    css(); var m = S.me;
    hide('ni-dlg'); hide('ni-saai'); hide('ni-plan'); hide('ni-mypage'); hide('ni-quotes'); var nm = D.getElementById('ni-dlgme'); if (nm) nm.style.display = '';
    // bn-profile هو زر «المزيد» بالجوال (فيه الإشعارات والخروج) — ما نخفيه
    ['browse', 'works', 'profile', 'proof', 'sub'].forEach(function(p){ if (!okPage(p)) { hide('ni-' + p); if (p !== 'profile') hide('bn-' + p); } });
    if (!okPage('chat')) { hide('ni-chat'); hide('bn-chat'); }
    var main = D.querySelector('.main');
    if (main && !D.getElementById('dl-ban')) {
      var b = D.createElement('div'); b.id = 'dl-ban'; b.className = 'dl-ban';
      b.innerHTML = '👤 <span>تشتغل باسم <b>' + esc(m.owner_name || 'المؤسسة') + '</b> كمفوّض · صلاحياتك: ' + m.perms.map(function(k){ return esc(LBL[k] ? LBL[k][0] : k); }).join('، ') + '</span>';
      var pg = main.querySelector('.page'); (pg ? pg.parentNode : main).insertBefore(b, pg || main.firstChild);
    }
    if (W.gotoPage && !W.gotoPage._dl) {
      var g = W.gotoPage; W.gotoPage = function(p){ if (!okPage(p)) { toast(p === 'saai' || p === 'dlg' ? 'هذي لصاحب الحساب فقط' : 'ما عندك صلاحية لهالقسم — تواصل مع صاحب الحساب', 'error'); return; } return g.apply(this, arguments); };
      W.gotoPage._dl = 1;
    }
    var h = (location.hash || '').replace('#', ''); if (h && !okPage(h) && W.gotoPage) W.gotoPage('home');
  }
  // «المزيد»: يشيل البلاطات اللي ما تخصه
  function filterTiles(html){
    if (!S.me) return html;
    var t = D.createElement('div'); t.innerHTML = html;
    t.querySelectorAll('[data-act]').forEach(function(b){ var a = b.getAttribute('data-act') || ''; var p = a.indexOf('pg:') === 0 ? a.slice(3) : (a === 'url:/chat' ? 'chat' : null); if ((p && !okPage(p)) || a === 'switch') b.remove(); });
    return t.innerHTML;
  }
  // ─── صفحة صاحب الحساب ───
  function permRows(sel){
    return ORDER.map(function(k){ var on = sel.indexOf(k) >= 0; return '<div class="dl-pr" data-k="' + k + '"><div><b>' + LBL[k][0] + '</b><small>' + LBL[k][1] + '</small></div><button type="button" class="dl-tg' + (on ? ' on' : '') + '" role="switch" aria-checked="' + on + '" aria-label="' + LBL[k][0] + '"></button></div>'; }).join('');
  }
  function locked(){ return '<div class="dl-c"><div class="dl-h" style="font-size:14px">🔒 لك أنت بس (ما تنعطى للمفوّض)</div><div class="dl-chips">' + LOCKED.map(function(x){ return '<span class="dl-chip">' + x + '</span>'; }).join('') + '</div></div>'; }
  function selPerms(box){ var a = []; box.querySelectorAll('.dl-pr').forEach(function(r){ if (r.querySelector('.dl-tg.on')) a.push(r.getAttribute('data-k')); }); return a; }
  function wire(box){ box.querySelectorAll('.dl-pr').forEach(function(r){ r.addEventListener('click', function(){ var t = r.querySelector('.dl-tg'); t.classList.toggle('on'); t.setAttribute('aria-checked', t.classList.contains('on')); }); }); }
  function fmtD(s){ try { var d = new Date(s); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); } catch(e) { return ''; } }
  function render(){
    var pg = D.getElementById('page-dlg'); if (!pg) return; css();
    var d = S.d, h = '<div class="dl-w"><div class="dl-c dl-in"><div class="dl-h">👥 المفوّض — خلّ موظفك يشتغل معك</div><div class="dl-s">يدخل بإيميله وكلمة سرّه هو (ما تعطيه كلمة سرّك)، ويشتغل باسم مؤسستك. أنت تحدد وش يقدر يسوي، وتقدر تشيله بضغطة.</div></div>';
    if (!d) {
      h += '<div class="dl-c" id="dl-form"><div class="dl-h">إضافة مفوّض</div><input class="dl-f" id="dl-name" maxlength="60" placeholder="اسمه — مثل: محمد" autocomplete="off"><input class="dl-f" id="dl-email" type="email" dir="ltr" style="text-align:right" placeholder="إيميله" autocomplete="off">'
        + '<div class="dl-h" style="font-size:14px;margin-top:14px">وش يقدر يسوي؟</div><div id="dl-perms">' + permRows(['bids', 'chat', 'awarded']) + '</div>'
        + '<button type="button" class="dl-b dl-bp" id="dl-add" style="margin-top:12px">إرسال الدعوة</button><div class="dl-s" style="text-align:center;margin-top:8px;font-size:12px">يوصله إيميل يحدد منه كلمة سرّه، وبعدها يحمّل التطبيق ويدخل بإيميله</div></div>';
    } else {
      var act = d.status === 'active', adm = d.paused && d.paused_by === 'admin';
      h += '<div class="dl-c"><div class="dl-me"><span class="dl-av">' + esc(String(d.name || 'م').charAt(0)) + '</span><div style="flex:1;min-width:0"><div class="dl-h" style="margin:0">' + esc(d.name) + '</div><div class="dl-s" dir="ltr" style="text-align:right">' + esc(d.email) + '</div></div>'
        + '<span class="dl-st ' + (d.paused ? 'dl-ps' : act ? 'dl-ok' : 'dl-wt') + '">' + (d.paused ? (adm ? 'أوقفته الإدارة' : 'موقوف مؤقتاً') : act ? 'فعّال' : 'بانتظار التفعيل') + '</span></div>'
        + '<div class="dl-s" style="margin-top:8px;font-size:12px">' + (act ? (d.last_login ? 'آخر دخول: ' + fmtD(d.last_login) : 'ما دخل للحين') : 'أرسلنا له رابط التفعيل على إيميله — صالح 3 أيام') + '</div>'
        + '<div class="dl-h" style="font-size:14px;margin-top:14px">صلاحياته</div><div id="dl-perms">' + permRows(d.perms || []) + '</div>'
        + '<button type="button" class="dl-b dl-bp" id="dl-save" style="margin-top:12px">حفظ الصلاحيات</button>'
        + '<div class="dl-row" style="margin-top:10px"><button type="button" class="dl-b dl-bo" id="dl-pause"' + (adm ? ' disabled title="أوقفته الإدارة"' : '') + '>' + (d.paused ? '▶ رجّعه' : '⏸ إيقاف مؤقت') + '</button><button type="button" class="dl-b dl-bo" id="dl-resend">' + (act ? 'رابط كلمة سر جديدة' : 'إعادة إرسال التفعيل') + '</button></div></div>'
        + '<div class="dl-c"><div class="dl-h" style="font-size:14px">نشاطه</div><div id="dl-log"><div class="dl-s">جاري التحميل...</div></div></div>'
        + '<button type="button" class="dl-b dl-bd" id="dl-del">إزالة المفوّض</button>';
    }
    h += locked() + '<div class="dl-s" style="text-align:center;font-size:12px">تقدر تضيف مفوّض واحد — أكثر من مفوّض قريباً بالاشتراك</div></div>';
    pg.innerHTML = h;
    var pr = D.getElementById('dl-perms'); if (pr) wire(pr);
    var on = function(id, f){ var e = D.getElementById(id); if (e) e.addEventListener('click', f); };
    on('dl-add', add); on('dl-save', save); on('dl-resend', resend); on('dl-del', del); on('dl-pause', pause);
    if (d) loadLog(8);
  }
  var ICO = { 'قدّم عرض': '📝', 'عدّل عرض': '✏️', 'سحب عرض': '↩️', 'أرسل رسالة': '💬', 'دخل من جهاز جديد': '🔑', 'فعّل حسابه': '✅', 'عدّل الصلاحيات': '⚙️', 'أوقف المفوّض مؤقتاً': '⏸', 'رجّع المفوّض': '▶', 'أضاف المفوّض': '➕', 'غيّر كلمة سرّه': '🔐', 'عدّل الملف': '👤', 'وثّق مشروع': '⭐' };
  function when(s){ try { var d = new Date(s), n = new Date(), m = Math.round((n - d) / 60000); if (m < 1) return 'الحين'; if (m < 60) return 'قبل ' + m + ' دقيقة'; var h = Math.round(m / 60); if (h < 24) return 'قبل ' + h + ' ساعة'; return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); } catch(e) { return ''; } }
  function loadLog(n){
    api('/api/provider/delegate/log?limit=' + n).then(function(L){
      var b = D.getElementById('dl-log'); if (!b) return;
      if (!Array.isArray(L) || !L.length) { b.innerHTML = '<div class="dl-s">ما فيه نشاط للحين</div>'; return; }
      b.innerHTML = L.map(function(x){ var who = x.actor === 'owner' ? 'أنت' : x.actor === 'admin' ? 'الإدارة' : (x.name || ''); return '<div class="dl-lg"><span>' + (ICO[x.action] || '•') + '</span><div><b>' + (who ? who + ': ' : '') + esc(x.action) + (x.detail ? ' <i>— ' + esc(x.detail) + '</i>' : '') + '</b><small>' + when(x.created_at) + '</small></div></div>'; }).join('')
        + (L.length >= n && n < 100 ? '<button type="button" class="dl-more" id="dl-lmore">عرض الكل ›</button>' : '');
      var mo = D.getElementById('dl-lmore'); if (mo) mo.addEventListener('click', function(){ loadLog(100); });
    });
  }
  function pause(){
    if (S.busy || !S.d) return; var p = !S.d.paused;
    if (p && !confirm('توقف ' + (S.d.name || 'المفوّض') + ' مؤقتاً؟ يطلع من الحساب لين ترجّعه.')) return;
    S.busy = true; busy('dl-pause', 1, '...');
    api('/api/provider/delegate/pause', { method: 'POST', body: JSON.stringify({ paused: p }) }).then(function(r){ S.busy = false;
      if (!r || !r.ok) { busy('dl-pause', 0); return toast((r && r.message) || 'تعذّر — حاول مرة ثانية', 'error'); }
      S.d = r.delegate; render(); toast(p ? '⏸ أوقفته مؤقتاً' : '▶ رجّع يشتغل', 'success'); });
  }
  // ─── «حسابي» للمفوّض ───
  function loadMe(){
    var pg = D.getElementById('page-dlgme'); if (!pg) return; css();
    if (!S.me) { pg.innerHTML = '<div class="dl-c" style="text-align:center">هذي الصفحة للمفوّض فقط</div>'; return; }
    pg.innerHTML = '<div class="loading">جاري التحميل...</div>';
    api('/api/me/dlg/info').then(function(r){
      if (!r || !r.dlg) { pg.innerHTML = '<div class="dl-c" style="text-align:center">تعذّر التحميل</div>'; return; }
      var m = r.dlg;
      pg.innerHTML = '<div class="dl-w"><div class="dl-c"><div class="dl-me"><span class="dl-av">' + esc(String(m.name || 'م').charAt(0)) + '</span><div style="flex:1;min-width:0"><div class="dl-h" style="margin:0">' + esc(m.name) + '</div><div class="dl-s" dir="ltr" style="text-align:right">' + esc(m.email) + '</div></div></div>'
        + '<div class="dl-s" style="margin-top:10px">مفوّض على حساب <b>' + esc(S.me.owner_name || '') + '</b></div></div>'
        + '<div class="dl-c"><div class="dl-h" style="font-size:14px">صلاحياتي</div><div class="dl-chips">' + m.perms.map(function(k){ return '<span class="dl-chip" style="background:#eff4ff;color:#1e40af">' + esc(LBL[k] ? LBL[k][0] : k) + '</span>'; }).join('') + '</div><div class="dl-s" style="margin-top:8px;font-size:12px">تبي صلاحية زيادة؟ اطلبها من صاحب الحساب</div></div>'
        + '<div class="dl-c"><div class="dl-h" style="font-size:14px">تغيير كلمة سرّي</div><div class="dl-s" style="font-size:12px">كلمة سرّك أنت — ما تأثر على صاحب الحساب</div>'
        + '<input class="dl-f" id="dm-old" type="password" autocomplete="current-password" placeholder="كلمة السر الحالية" dir="ltr"><input class="dl-f" id="dm-new" type="password" autocomplete="new-password" placeholder="كلمة السر الجديدة (8 حروف أو أكثر)" dir="ltr"><input class="dl-f" id="dm-new2" type="password" autocomplete="new-password" placeholder="أعد كتابتها" dir="ltr">'
        + '<button type="button" class="dl-b dl-bp" id="dm-save" style="margin-top:12px">حفظ كلمة السر</button></div>'
        + '<button type="button" class="dl-b dl-bd" id="dm-out">تسجيل الخروج</button></div>';
      D.getElementById('dm-save').addEventListener('click', chPw);
      D.getElementById('dm-out').addEventListener('click', function(){ if (W.doLogout) W.doLogout(); });
    });
  }
  function chPw(){
    if (S.busy) return; var o = D.getElementById('dm-old').value, n = D.getElementById('dm-new').value, n2 = D.getElementById('dm-new2').value;
    if (!o) return toast('اكتب كلمة السر الحالية', 'error'); if (n.length < 8) return toast('كلمة السر الجديدة لازم 8 حروف أو أكثر', 'error'); if (n !== n2) return toast('كلمتين السر مو متطابقة', 'error');
    S.busy = true; busy('dm-save', 1, 'جاري الحفظ...');
    api('/api/me/dlg/password', { method: 'POST', body: JSON.stringify({ old_password: o, new_password: n }) }).then(function(r){ S.busy = false; busy('dm-save', 0);
      if (!r || !r.ok) return toast((r && r.message) || 'تعذّر الحفظ', 'error');
      try { if (W._newSess) W._newSess(r); else localStorage.setItem('token', r.token); } catch(e) {}
      ['dm-old', 'dm-new', 'dm-new2'].forEach(function(id){ D.getElementById(id).value = ''; }); toast('✓ تغيّرت كلمة السر', 'success'); });
  }
  function busy(id, v, txt){ var b = D.getElementById(id); if (!b) return; if (v) { b.dataset.t = b.textContent; b.textContent = txt || '...'; b.disabled = true; } else { b.textContent = b.dataset.t || b.textContent; b.disabled = false; } }
  function add(){
    if (S.busy) return; var name = (D.getElementById('dl-name').value || '').trim(), email = (D.getElementById('dl-email').value || '').trim(), perms = selPerms(D.getElementById('dl-perms'));
    if (name.length < 2) return toast('اكتب اسم المفوّض', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return toast('الإيميل غير صحيح', 'error');
    if (!perms.length) return toast('اختر صلاحية وحدة على الأقل', 'error');
    S.busy = true; busy('dl-add', 1, 'جاري الإرسال...');
    api('/api/provider/delegate', { method: 'POST', body: JSON.stringify({ name: name, email: email, perms: perms }) }).then(function(r){
      S.busy = false; busy('dl-add', 0);
      if (!r || !r.ok) return toast((r && r.message) || 'تعذّر الإرسال — حاول مرة ثانية', 'error');
      S.d = r.delegate; render(); toast('✓ أرسلنا الدعوة على إيميله', 'success');
    });
  }
  function save(){
    if (S.busy) return; var perms = selPerms(D.getElementById('dl-perms'));
    if (!perms.length) return toast('اختر صلاحية وحدة على الأقل', 'error');
    S.busy = true; busy('dl-save', 1, 'جاري الحفظ...');
    api('/api/provider/delegate', { method: 'PUT', body: JSON.stringify({ perms: perms }) }).then(function(r){ S.busy = false; busy('dl-save', 0);
      if (!r || !r.ok) return toast((r && r.message) || 'تعذّر الحفظ', 'error'); S.d = r.delegate; toast('✓ انحفظت الصلاحيات', 'success'); });
  }
  function resend(){
    if (S.busy) return; S.busy = true; busy('dl-resend', 1, 'جاري الإرسال...');
    api('/api/provider/delegate/resend', { method: 'POST' }).then(function(r){ S.busy = false; busy('dl-resend', 0);
      if (!r || !r.ok) return toast((r && r.message) || 'تعذّر الإرسال', 'error'); toast('✓ أرسلنا الرابط على إيميله', 'success'); });
  }
  function del(){
    if (S.busy || !confirm('تشيل ' + (S.d && S.d.name || 'المفوّض') + '؟ يطلع من الحساب على طول.')) return;
    S.busy = true; busy('dl-del', 1, '...');
    api('/api/provider/delegate', { method: 'DELETE' }).then(function(r){ S.busy = false;
      if (!r || !r.ok) { busy('dl-del', 0); return toast('تعذّر — حاول مرة ثانية', 'error'); } S.d = null; render(); toast('✓ انشال المفوّض', 'success'); });
  }
  function load(){
    var pg = D.getElementById('page-dlg'); if (!pg) return;
    if (S.me) { pg.innerHTML = '<div class="dl-c" style="text-align:center">هذي الصفحة لصاحب الحساب فقط</div>'; return; }
    pg.innerHTML = '<div class="loading">جاري التحميل...</div>';
    api('/api/provider/delegate').then(function(r){ if (!r || r.message) { pg.innerHTML = '<div class="dl-c" style="text-align:center">تعذّر التحميل — حاول مرة ثانية</div>'; return; } S.d = r.delegate; render(); });
  }
  function init(){
    var u = null; try { u = JSON.parse(localStorage.getItem('user') || 'null'); } catch(e) {}
    if (u && u.delegate) { S.me = { name: u.delegate.name, perms: u.delegate.perms || [], owner_name: u.business_name || u.name }; applyMe(); }
    api('/api/me/dlg').then(function(r){
      if (!r) return;
      if (r.dlg) { S.me = r.dlg; applyMe(); }
      else { S.me = null; var n = D.getElementById('ni-dlg'); if (n) n.style.display = ''; }
    });
  }
  W.DLG = { load: load, loadMe: loadMe, okPage: okPage, filter: filterTiles, isMe: function(){ return !!S.me; } };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
})();
