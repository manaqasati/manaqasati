// «مزوّدين موثّقين» في الصفحة الرئيسية — المزوّدين الماسيين (20 مشروع موثّق بتقييم 4★ فأعلى)
(function(){
  var D = document;
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function safe(u){ u = String(u || ''); return /^https:\/\/[^\s"'<>]+$/.test(u) ? u : ''; }
  var DIA = '<svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M6 3.5h12l3.5 5.5L12 21 2.5 9z"/></svg>';
  function css(){
    if (D.getElementById('wpt-css')) return; var st = D.createElement('style'); st.id = 'wpt-css';
    st.textContent = '.wpt{max-width:1100px;margin:0 auto;padding:0 20px}.wpt-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}'
      + '.wpt-c{display:block;background:var(--card,#fff);border:1px solid var(--border,#e6e8ec);border-radius:16px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .15s,box-shadow .15s}.wpt-c:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(15,23,42,.08)}'
      + '.wpt-im{height:130px;background:linear-gradient(135deg,#e7dcc6,#c4b08e);background-size:cover;background-position:center}'
      + '.wpt-b{padding:12px 14px 14px;display:flex;gap:10px;align-items:center}.wpt-av{width:42px;height:42px;border-radius:50%;background:#1e293b;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex:none;overflow:hidden;margin-top:-30px;border:3px solid var(--card,#fff)}.wpt-av img{width:100%;height:100%;object-fit:cover}'
      + '.wpt-n{font-weight:800;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wpt-m{font-size:12px;color:var(--muted,#64748b);margin-top:3px}'
      + '.wpt-bd{display:inline-flex;align-items:center;gap:5px;height:22px;border-radius:999px;padding:0 9px 0 4px;font-size:11px;font-weight:800;white-space:nowrap;color:#fff;background:linear-gradient(180deg,#8c7cf7,#4b2fd0 55%,#7a62f2);box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 1px 2px rgba(0,0,0,.18);margin-top:6px}.wpt-bd i{width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.28);display:flex;align-items:center;justify-content:center}';
    D.head.appendChild(st);
  }
  function run(){
    var sec = D.getElementById('wpTop'); if (!sec) return;
    fetch('/api/providers/verified-top').then(function(r){ return r.ok ? r.json() : []; }).then(function(L){
      if (!Array.isArray(L) || !L.length) return; css();
      D.getElementById('wpTopG').innerHTML = L.map(function(p){
        var im = safe(p.img), av = safe(p.av), id = parseInt(p.id) || 0;
        return '<a class="wpt-c" href="/pro/x-' + id + '?id=' + id + '"><div class="wpt-im"' + (im ? ' style="background-image:url(\'' + esc(im) + '\')"' : '') + '></div>'
          + '<div class="wpt-b"><div class="wpt-av">' + (av ? '<img src="' + esc(av) + '" alt="" loading="lazy">' : esc(String(p.name || 'م').charAt(0))) + '</div><div style="min-width:0;flex:1">'
          + '<div class="wpt-n">' + esc(p.name) + '</div><div class="wpt-m">' + (p.rating ? '★ ' + esc(p.rating) + ' · ' : '') + esc(p.works) + ' مشروع موثّق' + (p.city ? ' · ' + esc(p.city) : '') + '</div>'
          + '<span class="wpt-bd"><i>' + DIA + '</i>موثّق ماسي</span></div></div></a>';
      }).join('');
      sec.style.display = '';
    }).catch(function(){});
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', run); else run();
})();
