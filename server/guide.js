// ═══ مقاطع الشرح: (1) كيف يقدّم المزوّد عرضه  (2) مزوّد سجّل كعميل ← كيف يحوّل حسابه ═══
(function(){
  function A(){ return window.API || ''; }
  function tok(){ try { return localStorage.getItem('token') || ''; } catch(e){ return ''; } }
  function hdr(){ return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok() }; }
  function ss(k, v){ try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch(e){ return null; } }
  function ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch(e){ return null; } }
  var V = {
    bid: { src: '/guide-bid.mp4', poster: '/guide-bid.jpg', t: 'كيف تقدّم عرضك وتوصل للعميل؟', d: 'دقيقة وحدة — وبعدها يظهر لك رقم العميل وتكلّمه مباشرة.' },
    prov: { src: '/guide-provider.mp4', poster: '/guide-provider.jpg', t: 'تقدّم خدمة؟ حوّل حسابك لمزوّد', d: '«انشر مشروع» مخصص لطلب الخدمات. أنت مقدّم خدمة؟ فعّل حساب المزوّد وابدأ تستقبل المشاريع وتقدّم عروضك — شوف كيف بأقل من دقيقة.' }
  };
  var fromLink = location.hash === '#becomeprov';
  var st = null, stP = null;
  function state(){
    if (st) return Promise.resolve(st);
    if (!tok()) return Promise.resolve({ seen: [], isprov: false });
    if (!stP) stP = fetch(A() + '/api/tour', { headers: hdr() }).then(function(r){ return r.ok ? r.json() : {}; }).catch(function(){ return {}; }).then(function(d){ st = { seen: d.seen || [], isprov: !!d.isprov }; return st; });
    return stP;
  }
  function mark(k){ ls('mnq_tour_' + k, '1'); if (st && st.seen.indexOf(k) < 0) st.seen.push(k); try { fetch(A() + '/api/tour', { method: 'POST', headers: hdr(), body: JSON.stringify({ key: k }) }).catch(function(){}); } catch(e){} }
  function css(){
    if (document.getElementById('gv-css')) return;
    var s = document.createElement('style'); s.id = 'gv-css';
    s.textContent = '#gv-ov{position:fixed;inset:0;z-index:100000;background:rgba(6,13,32,.72);display:flex;align-items:center;justify-content:center;padding:14px;animation:gvF .25s ease;backdrop-filter:blur(3px)}'
      + '.gv-c{background:#fff;color:#0f1d3a;border-radius:22px;width:min(420px,100%);max-height:calc(100vh - 28px);overflow:auto;box-shadow:0 30px 80px -10px rgba(0,0,0,.55);direction:rtl;font-family:inherit;position:relative;animation:gvU .3s ease}'
      + '.gv-v{background:#0b1f4d;border-radius:22px 22px 0 0;display:flex;justify-content:center}.gv-v video{display:block;width:100%;max-height:58vh;aspect-ratio:9/16;object-fit:contain;background:#0b1f4d;border-radius:22px 22px 0 0}'
      + '.gv-x{position:absolute;top:10px;left:10px;width:36px;height:36px;border-radius:50%;border:0;background:rgba(255,255,255,.92);color:#0f1d3a;font-size:18px;font-weight:900;cursor:pointer;z-index:2;box-shadow:0 4px 12px rgba(0,0,0,.25)}'
      + '.gv-b{padding:16px 18px 18px}.gv-b h3{margin:0 0 6px;font-size:18px;font-weight:900}.gv-b p{margin:0 0 14px;font-size:13.5px;line-height:1.8;color:#41506f}'
      + '.gv-p{display:block;width:100%;border:0;border-radius:13px;padding:14px;font-family:inherit;font-weight:900;font-size:15px;cursor:pointer;background:#1d4ed8;color:#fff;min-height:48px}'
      + '.gv-s{display:block;width:100%;border:0;background:none;color:#64748b;font-family:inherit;font-weight:800;font-size:13.5px;padding:12px 8px 2px;cursor:pointer}'
      + '@keyframes gvF{from{opacity:0}}@keyframes gvU{from{opacity:0;transform:translateY(12px)}}'
      + '[data-theme="dark"] .gv-c{background:#111a2e;color:#e6ebf5}[data-theme="dark"] .gv-b p{color:#a9b6d3}[data-theme="dark"] .gv-s{color:#94a3b8}';
    document.head.appendChild(s);
  }
  // o: {primary:[label,fn], secondary:[label,fn], onClose:fn}
  function show(key, o){
    o = o || {}; var v = V[key]; if (!v) return; css();
    var old = document.getElementById('gv-ov'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'gv-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', v.t);
    ov.innerHTML = '<div class="gv-c"><button type="button" class="gv-x" aria-label="إغلاق">✕</button><div class="gv-v"><video src="' + v.src + '" poster="' + v.poster + '" playsinline muted autoplay controls preload="auto"></video></div>'
      + '<div class="gv-b"><h3>' + v.t + '</h3><p>' + v.d + '</p>'
      + (o.primary ? '<button type="button" class="gv-p">' + o.primary[0] + '</button>' : '')
      + (o.secondary ? '<button type="button" class="gv-s">' + o.secondary[0] + '</button>' : '') + '</div></div>';
    document.body.appendChild(ov);
    var done = false;
    function close(fn){ if (done) return; done = true; try { ov.querySelector('video').pause(); } catch(e){} ov.remove(); document.removeEventListener('keydown', kd, true); if (fn) try { fn(); } catch(e){} }
    function kd(e){ if (e.key === 'Escape') { e.preventDefault(); close(o.onClose); } }
    document.addEventListener('keydown', kd, true);
    ov.querySelector('.gv-x').onclick = function(){ close(o.onClose); };
    ov.addEventListener('click', function(e){ if (e.target === ov) close(o.onClose); });
    if (o.primary) ov.querySelector('.gv-p').onclick = function(){ close(o.primary[1]); };
    if (o.secondary) ov.querySelector('.gv-s').onclick = function(){ close(o.secondary[1]); };
    try { var p = ov.querySelector('video').play(); if (p && p.catch) p.catch(function(){}); } catch(e){}
  }
  function dismissProv(){ if (st) st.isprov = false; try { fetch(A() + '/api/me/provider-hint/dismiss', { method: 'POST', headers: hdr() }).catch(function(){}); } catch(e){} }
  window.Guide = { show: show, state: state };

  var page = location.pathname;
  function onReady(fn){ if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  // ── لوحة العميل ──
  if (/dashboard-client/.test(page)) (function(){
    var origBP = window.openBecomeProv;
    if (typeof origBP === 'function') {
      window.openBecomeProv = function(){
        var a = arguments, self = this;
        if (ss('gv_prov')) return origBP.apply(self, a);
        state().then(function(s){
          if (!(s.isprov || fromLink)) return origBP.apply(self, a);
          ss('gv_prov', '1');
          show('prov', { primary: ['فعّل حساب المزوّد ←', function(){ origBP.apply(self, a); }], secondary: ['لاحقاً'] });
        });
      };
    }
    var origShow = window.show;
    if (typeof origShow === 'function') {
      window.show = function(pg){
        var a = arguments, self = this;
        if (pg !== 'new' || ss('gv_new')) return origShow.apply(self, a);
        if (st && !st.isprov) return origShow.apply(self, a);
        state().then(function(s){
          if (!s.isprov) return origShow.apply(self, a);
          ss('gv_new', '1'); ss('gv_prov', '1');
          show('prov', { primary: ['فعّل حساب المزوّد ←', function(){ (origBP || window.openBecomeProv)(); }], secondary: ['لا، أنا أطلب خدمة فعلاً', function(){ dismissProv(); origShow.apply(self, a); }] });
        });
      };
    }
    // يدخل لوحته وهو «مزوّد سجّل كعميل» (ما جا من الرابط) ← نوريه المقطع مرة بالجلسة
    if (!fromLink) setTimeout(function(){
      if (ss('gv_prov')) return;
      state().then(function(s){
        if (!s.isprov || document.getElementById('gv-ov') || document.getElementById('tr-wel')) return;
        ss('gv_prov', '1');
        show('prov', { primary: ['فعّل حساب المزوّد ←', function(){ (origBP || window.openBecomeProv)(); }], secondary: ['لا، أنا أطلب خدمة فعلاً', dismissProv] });
      });
    }, 2200);
  })();

  // ── صفحة نشر مشروع ──
  if (/\/new(\.html)?$/.test(page)) onReady(function(){
    if (ss('gv_new') || !tok()) return;
    setTimeout(function(){
      state().then(function(s){
        if (!s.isprov) return;
        ss('gv_new', '1'); ss('gv_prov', '1');
        show('prov', { primary: ['فعّل حساب المزوّد ←', function(){ location.href = '/dashboard-client.html#becomeprov'; }], secondary: ['لا، أنا أطلب خدمة فعلاً', dismissProv] });
      });
    }, 700);
  });

  // ── أول عرض للمزوّد: نوريه مقطع «كيف تقدّم عرضك» مرة وحدة ──
  function wrapBid(name){
    var orig = window[name]; if (typeof orig !== 'function') return;
    window[name] = function(){
      var a = arguments, self = this;
      if (!tok() || ls('mnq_tour_vbid') || window._gvSkip) return orig.apply(self, a);
      state().then(function(s){
        if (s.seen.indexOf('vbid') >= 0) { ls('mnq_tour_vbid', '1'); return orig.apply(self, a); }
        mark('vbid');
        var go = function(){ window._gvSkip = 1; try { orig.apply(self, a); } finally { window._gvSkip = 0; } };
        show('bid', { primary: ['يلا أقدّم عرضي ←', go], secondary: ['تخطي', go], onClose: go });
      });
    };
  }
  if (/dashboard-provider/.test(page)) wrapBid('_openBidModal');
  if (/^\/project/.test(page)) (function(){
    var u = {}; try { u = JSON.parse(localStorage.getItem('user') || '{}'); } catch(e){}
    if (u && (u.role === 'provider' || u.can_provide)) wrapBid('openBid');
  })();
})();
