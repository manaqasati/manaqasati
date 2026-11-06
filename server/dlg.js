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
      + '.dl-row{display:flex;gap:8px;flex-wrap:wrap}.dl-row .dl-b{flex:1;min-width:150px}';
    D.head.appendChild(st);
  }
  // ─── وضع المفوّض ───
  var PAGE_PERM = { browse: 'bids', works: 'bids', profile: 'profile', proof: 'proofs', sub: 'sub', chat: 'chat' };
  function okPage(p){ if (!S.me) return true; if (p === 'saai' || p === 'dlg') return false; var k = PAGE_PERM[p]; return !k || S.me.perms.indexOf(k) >= 0; }
  function hide(id){ var e = D.getElementById(id); if (e) e.style.display = 'none'; }
  function applyMe(){
    css(); var m = S.me;
    hide('ni-dlg'); hide('ni-saai');
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
      var act = d.status === 'active';
      h += '<div class="dl-c"><div class="dl-me"><span class="dl-av">' + esc(String(d.name || 'م').charAt(0)) + '</span><div style="flex:1;min-width:0"><div class="dl-h" style="margin:0">' + esc(d.name) + '</div><div class="dl-s" dir="ltr" style="text-align:right">' + esc(d.email) + '</div></div>'
        + '<span class="dl-st ' + (act ? 'dl-ok' : 'dl-wt') + '">' + (act ? 'فعّال' : 'بانتظار التفعيل') + '</span></div>'
        + '<div class="dl-s" style="margin-top:8px;font-size:12px">' + (act ? (d.last_login ? 'آخر دخول: ' + fmtD(d.last_login) : 'ما دخل للحين') : 'أرسلنا له رابط التفعيل على إيميله — صالح 3 أيام') + '</div>'
        + '<div class="dl-h" style="font-size:14px;margin-top:14px">صلاحياته</div><div id="dl-perms">' + permRows(d.perms || []) + '</div>'
        + '<button type="button" class="dl-b dl-bp" id="dl-save" style="margin-top:12px">حفظ الصلاحيات</button>'
        + '<div class="dl-row" style="margin-top:10px"><button type="button" class="dl-b dl-bo" id="dl-resend">' + (act ? 'إرسال رابط كلمة سر جديدة' : 'إعادة إرسال رابط التفعيل') + '</button><button type="button" class="dl-b dl-bd" id="dl-del">إزالة المفوّض</button></div></div>';
    }
    h += locked() + '<div class="dl-s" style="text-align:center;font-size:12px">تقدر تضيف مفوّض واحد — أكثر من مفوّض قريباً بالاشتراك</div></div>';
    pg.innerHTML = h;
    var pr = D.getElementById('dl-perms'); if (pr) wire(pr);
    var on = function(id, f){ var e = D.getElementById(id); if (e) e.addEventListener('click', f); };
    on('dl-add', add); on('dl-save', save); on('dl-resend', resend); on('dl-del', del);
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
  W.DLG = { load: load, okPage: okPage, filter: filterTiles, isMe: function(){ return !!S.me; } };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', init); else setTimeout(init, 0);
})();
