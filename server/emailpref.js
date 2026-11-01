/* ═══ إعداد الإيميلات (المزوّد): المشاريع الجديدة (ملخّص يومي/أول بأول/لا) + تخصصات الإيميل + باطن/تذكيرات/أخبار ═══
   mnqEmailPrefs() يفتح النافذة · رابط ‎#emails يفتحها مباشرة */
(function(){
  'use strict';
  var W = window, D = document;
  if (W.mnqEmailPrefs) return;
  function api(){ return (typeof W.API === 'string' && W.API) || ''; }
  function tok(){ try { return localStorage.getItem('token') || ''; } catch(e) { return ''; } }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function toast(m, t){ if (typeof W.showToast === 'function') W.showToast(m, t || 'success'); else if (typeof W.toast === 'function') W.toast(m); }
  function css(){
    if (D.getElementById('ep-css')) return;
    var s = D.createElement('style'); s.id = 'ep-css';
    s.textContent = '.ep-ov{position:fixed;inset:0;z-index:9400;background:rgba(15,29,58,.5);display:flex;align-items:flex-end;justify-content:center;font-family:Tajawal,sans-serif;direction:rtl}'
      + '@media(min-width:700px){.ep-ov{align-items:center}.ep-sh{border-radius:22px!important;max-height:88vh!important}}'
      + '.ep-sh{background:#f3f6fb;color:#0f1d3a;width:100%;max-width:460px;max-height:92vh;overflow:auto;border-radius:24px 24px 0 0;padding:0 0 calc(16px + env(safe-area-inset-bottom,0px));box-sizing:border-box;animation:epUp .2s ease;overscroll-behavior:contain}'
      + '@keyframes epUp{from{transform:translateY(40px);opacity:0}}'
      + '.ep-hd{position:sticky;top:0;background:#0f2544;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:15px 16px;z-index:2}.ep-hd b{font-size:17px;font-weight:900}'
      + '.ep-x{border:0;background:rgba(255,255,255,.12);color:#fff;width:34px;height:34px;border-radius:10px;font-size:18px;cursor:pointer;font-family:inherit}'
      + '.ep-bd{padding:14px;display:flex;flex-direction:column;gap:10px}'
      + '.ep-sec{font-size:12.5px;font-weight:900;color:#64748b;margin:4px 2px 0}'
      + '.ep-opt{display:flex;align-items:center;gap:10px;border:1.5px solid #dbe3ef;border-radius:14px;padding:11px 12px;background:#fff;cursor:pointer;text-align:right;font-family:inherit;color:inherit;width:100%}'
      + '.ep-opt.on{border-color:#2563eb;background:#eff6ff;box-shadow:0 0 0 3px #dbeafe}'
      + '.ep-rd{width:18px;height:18px;border-radius:50%;border:2px solid #94a3b8;flex-shrink:0;box-sizing:border-box}.ep-opt.on .ep-rd{border:5px solid #2563eb}'
      + '.ep-opt b{font-size:14.5px;display:block}.ep-opt small{font-size:12.5px;color:#5b6b82;font-weight:700;line-height:1.6;display:block}'
      + '.ep-tg-b{font-size:11px;background:#dcfce7;color:#166534;border-radius:99px;padding:2px 8px;font-weight:900;margin-inline-start:6px;vertical-align:middle}'
      + '.ep-card{background:#fff;border:1px solid #e3eaf6;border-radius:16px;padding:6px 12px}'
      + '.ep-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 2px;border-top:1px solid #eef2f7}.ep-row:first-child{border-top:0}'
      + '.ep-row b{font-size:14px;display:block}.ep-row small{font-size:12px;color:#5b6b82;font-weight:700}'
      + '.ep-sw{width:46px;height:28px;border-radius:99px;background:#cbd5e1;position:relative;flex-shrink:0;border:0;cursor:pointer;padding:0}.ep-sw i{position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:#fff;transition:right .15s}'
      + '.ep-sw[aria-checked="true"]{background:#16a34a}.ep-sw[aria-checked="true"] i{right:22px}'
      + '.ep-chips{display:flex;flex-wrap:wrap;gap:7px;padding:10px 0 6px}'
      + '.ep-chip{border:1.5px solid #dbe3ef;background:#fff;color:#334155;border-radius:999px;padding:8px 13px;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer}'
      + '.ep-chip[aria-pressed="true"]{border-color:#2563eb;background:#eff6ff;color:#1d4ed8}.ep-chip[aria-pressed="true"]::before{content:"✓ "}'
      + '.ep-note{display:flex;gap:10px;align-items:flex-start;background:#f8fafc;border:1px solid #e3eaf6;border-radius:14px;padding:11px 12px;font-size:12.5px;color:#475569;font-weight:700;line-height:1.7}'
      + '.ep-err{display:none;background:#fef2f2;border:1px solid #fecaca;color:#b91c1c;border-radius:12px;padding:9px 12px;font-size:13px;font-weight:800}'
      + '.ep-go{border:0;border-radius:14px;padding:14px;background:#2563eb;color:#fff;font-family:inherit;font-weight:900;font-size:15px;cursor:pointer;width:100%}.ep-go:disabled{opacity:.6}'
      + '.ep-s{font-size:12px;color:#64748b;font-weight:700;text-align:center}.ep-lnk{color:#1d4ed8;text-decoration:underline;cursor:pointer;background:none;border:0;font:inherit;font-weight:800;padding:0}'
      + '.ep-dim{opacity:.45;pointer-events:none}'
      + '[data-theme="dark"] .ep-sh{background:#0b1529;color:#e6edf8}[data-theme="dark"] .ep-opt,[data-theme="dark"] .ep-card,[data-theme="dark"] .ep-chip{background:#16233f;border-color:#24365e;color:#e6edf8}'
      + '[data-theme="dark"] .ep-opt.on,[data-theme="dark"] .ep-chip[aria-pressed="true"]{background:#1e3a8a;border-color:#60a5fa;color:#fff;box-shadow:none}[data-theme="dark"] .ep-opt small,[data-theme="dark"] .ep-row small,[data-theme="dark"] .ep-sec,[data-theme="dark"] .ep-s{color:#a9b6d3}'
      + '[data-theme="dark"] .ep-row{border-color:#24365e}[data-theme="dark"] .ep-note{background:#16233f;border-color:#24365e;color:#cbd5e1}[data-theme="dark"] .ep-lnk{color:#93c5fd}';
    D.head.appendChild(s);
  }
  var st = null, ov = null;
  function close(){ if (ov && ov.parentNode) ov.remove(); ov = null; }
  function paint(){
    var bd = ov.querySelector('.ep-bd');
    var P = [['daily', 'ملخّص واحد باليوم', 'إيميل واحد الساعة 8 الصبح فيه كل المشاريع الجديدة', true],
             ['instant', 'أول بأول', 'إيميل مع كل مشروع جديد — تقدّم قبل غيرك'],
             ['off', 'لا ترسل', 'تشوفها بس في الإشعارات داخل التطبيق']];
    var h = '<div class="ep-sec">المشاريع الجديدة اللي تناسب تخصصك</div>';
    P.forEach(function(o){ h += '<button type="button" class="ep-opt' + (st.proj === o[0] ? ' on' : '') + '" data-p="' + o[0] + '" aria-pressed="' + (st.proj === o[0]) + '"><span class="ep-rd"></span><span><b>' + o[1] + (o[3] ? '<span class="ep-tg-b">الأنسب</span>' : '') + '</b><small>' + o[2] + '</small></span></button>'; });
    var sp = st.specialties || [];
    h += '<div class="ep-sec">توصلك إيميلات مشاريع أي تخصص؟</div><div class="ep-card' + (st.proj === 'off' ? ' ep-dim' : '') + '" id="ep-cats">';
    if (sp.length) {
      h += '<div class="ep-chips">' + sp.map(function(c){ return '<button type="button" class="ep-chip" data-c="' + esc(c) + '" aria-pressed="' + (st.cats.indexOf(c) >= 0) + '">' + esc(c) + '</button>'; }).join('') + '</div>'
        + '<div class="ep-s" style="text-align:right;padding-bottom:8px">' + (sp.length > 1 ? 'شيل اللي ما تبي إيميلاته — ' : '') + 'تخصص ناقص؟ <button type="button" class="ep-lnk" data-a="specs">عدّل تخصصاتك</button></div>';
    } else {
      h += '<div class="ep-s" style="text-align:right;padding:12px 0">ما حددت تخصصاتك — <button type="button" class="ep-lnk" data-a="specs">أضف تخصصاتك</button> عشان توصلك المشاريع المناسبة</div>';
    }
    h += '</div>';
    var T = [['sub', 'طلبات المقاولين (باطن)', 'لما مقاول يطلب تخصصك'], ['tips', 'تذكيرات ونصائح', 'كمّل ملفك، تابع عروضك…'], ['news', 'أخبار مناقصة', 'مزايا جديدة وإعلانات']];
    h += '<div class="ep-sec">إيميلات ثانية</div><div class="ep-card">' + T.map(function(t){ return '<div class="ep-row"><span><b>' + t[1] + '</b><small>' + t[2] + '</small></span><button type="button" class="ep-sw" role="switch" aria-label="' + t[1] + '" aria-checked="' + (!!st[t[0]]) + '" data-t="' + t[0] + '"><i></i></button></div>'; }).join('') + '</div>';
    h += '<div class="ep-note"><span style="font-size:17px">🔒</span><span><b style="color:inherit">المهم يوصلك دايم:</b> قبول عرضك، رسائل العملاء، تفعيل البريد وأمان الحساب.</span></div>'
      + '<div class="ep-err" id="ep-err" role="alert"></div>'
      + '<button type="button" class="ep-go" id="ep-go">حفظ</button><div class="ep-s">الإشعارات داخل التطبيق ما تتأثر</div>';
    bd.innerHTML = h;
  }
  function err(m){ var e = ov && ov.querySelector('#ep-err'); if (!e) return; e.textContent = m || ''; e.style.display = m ? 'block' : 'none'; }
  function save(btn){
    if (st.proj !== 'off' && (st.specialties || []).length && !st.cats.length) return err('اختر تخصص واحد على الأقل — أو اختر «لا ترسل»');
    btn.disabled = true; btn.textContent = 'جاري الحفظ…';
    fetch(api() + '/api/me/email-prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok() }, body: JSON.stringify({ proj: st.proj, cats: st.cats, sub: !!st.sub, tips: !!st.tips, news: !!st.news }) })
      .then(function(r){ return r.json().then(function(d){ return { ok: r.ok, d: d }; }); })
      .then(function(r){
        if (!r.ok) { btn.disabled = false; btn.textContent = 'حفظ'; return err((r.d && r.d.message) || 'ما قدرنا نحفظ — حاول مرة ثانية'); }
        close(); toast(st.proj === 'off' ? 'تم ✓ — وقّفنا إيميلات المشاريع' : st.proj === 'daily' ? 'تم ✓ — يوصلك ملخّص واحد باليوم' : 'تم ✓ — توصلك أول بأول');
        try { var row = D.getElementById('ep-row-sub'); if (row) row.textContent = sumTxt(st); } catch(e) {}
      })
      .catch(function(){ btn.disabled = false; btn.textContent = 'حفظ'; err('تعذّر الاتصال — حاول مرة ثانية'); });
  }
  function sumTxt(s){ return s.proj === 'off' ? 'إيميلات المشاريع موقّفة' : s.proj === 'instant' ? 'المشاريع: أول بأول' : 'المشاريع: ملخّص واحد باليوم'; }
  W.mnqEmailSummary = sumTxt;
  W.mnqEmailPrefs = function(){
    if (!tok()) { location.href = '/auth.html'; return; }
    css(); close();
    ov = D.createElement('div'); ov.className = 'ep-ov'; ov.id = 'ep-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'إعداد الإيميلات');
    ov.innerHTML = '<div class="ep-sh"><div class="ep-hd"><b>📧 الإيميلات</b><button type="button" class="ep-x" aria-label="إغلاق">✕</button></div><div class="ep-bd"><div class="ep-s" style="padding:30px 0">جاري التحميل…</div></div></div>';
    D.body.appendChild(ov);
    ov.addEventListener('click', function(e){
      if (e.target === ov || e.target.closest('.ep-x')) return close();
      if (!st) return;
      var b;
      if ((b = e.target.closest('[data-p]'))) { st.proj = b.getAttribute('data-p'); err(''); return paint(); }
      if ((b = e.target.closest('[data-c]'))) { var c = b.getAttribute('data-c'), i = st.cats.indexOf(c); if (i >= 0) st.cats.splice(i, 1); else st.cats.push(c); b.setAttribute('aria-pressed', i < 0); err(''); return; }
      if ((b = e.target.closest('[data-t]'))) { var k = b.getAttribute('data-t'); st[k] = !st[k]; b.setAttribute('aria-checked', !!st[k]); return; }
      if ((b = e.target.closest('[data-a="specs"]'))) { close(); try { if (typeof W.gotoPage === 'function') W.gotoPage('profile'); setTimeout(function(){ var s = D.getElementById('pf-sec-specs'); if (s) { if (s.tagName === 'DETAILS') s.open = true; s.scrollIntoView({ block: 'start', behavior: 'smooth' }); } }, 500); } catch(_){} return; }
      if (e.target.closest('#ep-go')) return save(e.target.closest('#ep-go'));
    });
    fetch(api() + '/api/me/email-prefs', { headers: { Authorization: 'Bearer ' + tok() }, cache: 'no-store' })
      .then(function(r){ if (!r.ok) throw 0; return r.json(); })
      .then(function(d){ st = { proj: d.proj || 'daily', sub: d.sub !== false, tips: d.tips !== false, news: d.news !== false, specialties: d.specialties || [], cats: (d.cats || []).slice() }; if (ov) paint(); })
      .catch(function(){ if (ov) ov.querySelector('.ep-bd').innerHTML = '<div class="ep-s" style="padding:30px 0">ما قدرنا نجيب الإعداد — <button type="button" class="ep-lnk" onclick="mnqEmailPrefs()">حاول مرة ثانية</button></div>'; });
  };
  // رابط مباشر ‎#emails (من أسفل الإيميل)
  var _deep = location.hash === '#emails' || W._mnqEmailsDeep;
  function deep(){ if (_deep) { _deep = false; setTimeout(function(){ W.mnqEmailPrefs(); }, 900); } }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', deep); else deep();
})();
