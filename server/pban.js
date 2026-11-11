// منع نشر المشاريع لمزوّد مزعج: لو حاول ينشر (أو فتح صفحة النشر) تطلع له شاشة توجّهه للعروض
(function(){
  if (window.PostBan) return;
  var API = window.API || (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? '' : 'https://manaqasati-production.up.railway.app');
  function tok(){ try { return localStorage.getItem('token') || ''; } catch(e) { return ''; } }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function uid(){ try { var u = JSON.parse(localStorage.getItem('user') || 'null'); return u && u.id; } catch(e) { return null; } }
  function show(d){
    if (document.getElementById('pbScr')) return;
    d = d || {}; var b = d.ban || {};
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    var o = document.createElement('div'); o.id = 'pbScr';
    o.style.cssText = 'position:fixed;inset:0;z-index:2147483000;overflow:auto;background:' + (dark ? '#0b1220' : '#fff') + ';color:' + (dark ? '#e2e8f0' : '#0f172a') + ';font-family:Tajawal,sans-serif;direction:rtl';
    var me = uid();
    o.innerHTML = '<div style="max-width:440px;margin:0 auto;padding:56px 22px 40px;text-align:center;display:flex;flex-direction:column;gap:16px;align-items:center">'
      + '<div style="width:84px;height:84px;border-radius:24px;background:' + (dark ? '#1e293b' : '#eef2fd') + ';display:flex;align-items:center;justify-content:center;font-size:38px">🧰</div>'
      + '<b style="font-size:21px">نشر المشاريع مخصّص للعملاء</b>'
      + '<div style="font-size:15px;line-height:1.9;color:' + (dark ? '#94a3b8' : '#475467') + '">حسابك مزوّد — مكانك تقدّم عروضك على المشاريع المناسبة لك، والتعريف بشغلك في صفحتك العامة.</div>'
      + (b.reason ? '<div style="width:100%;box-sizing:border-box;text-align:right;padding:12px 14px;border-radius:12px;background:' + (dark ? '#111827' : '#f9fafb') + ';border:1px solid ' + (dark ? '#334155' : '#eef0f3') + '"><div style="font-size:12px;font-weight:800;color:#64748b">سبب من الإدارة:</div><div style="font-size:13.5px;margin-top:2px">' + esc(b.reason) + '</div></div>' : '')
      + '<a id="pbGo" href="/dashboard-provider.html#browse" style="width:100%;box-sizing:border-box;display:block;padding:14px;border-radius:12px;background:#1d3faa;color:#fff;font-weight:800;font-size:15px;text-decoration:none">تصفّح المشاريع المناسبة لك</a>'
      + (me ? '<a href="/pro/' + encodeURIComponent(me) + '" style="width:100%;box-sizing:border-box;display:block;padding:13px;border-radius:12px;border:1px solid ' + (dark ? '#334155' : '#d9dee6') + ';color:inherit;font-weight:700;font-size:14px;text-decoration:none">الصفحة العامة</a>' : '')
      + '<div style="font-size:12.5px;color:#64748b">عندك مشروع حقيقي؟ <a href="/chat?support=1&topic=' + encodeURIComponent('منع نشر المشاريع') + '" style="color:#1d3faa;font-weight:800">تواصل مع الإدارة</a></div></div>';
    document.body.appendChild(o);
    try { localStorage.setItem('activeMode', 'provider'); } catch(e) {}
  }
  // أي محاولة نشر ترجع «post_ban» ← الشاشة
  var F = window.fetch;
  if (F) window.fetch = function(u, o){
    var p = F.apply(this, arguments);
    try {
      var url = typeof u === 'string' ? u : (u && u.url) || '', m = ((o && o.method) || (u && u.method) || 'GET').toUpperCase();
      if (m === 'POST' && /\/api\/requests\/?(\?|$)/.test(url)) p.then(function(r){ if (r && r.status === 403) r.clone().json().then(function(d){ if (d && d.code === 'post_ban') show(d); }).catch(function(){}); }).catch(function(){});
    } catch(e) {}
    return p;
  };
  // صفحة النشر نفسها: نفحص أول ما تنفتح (لو مسجّل دخول)
  function check(){
    var t = tok(); if (!t) return;
    F(API + '/api/me/post-ban', { headers: { Authorization: 'Bearer ' + t } }).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){ if (d && d.ban) show(d); }).catch(function(){});
  }
  window.PostBan = { show: show, check: check };
  if (document.currentScript && document.currentScript.hasAttribute('data-check')) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', check); else check(); }
})();
