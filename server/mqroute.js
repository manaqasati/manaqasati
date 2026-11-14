/* أفضل مسار للفني
   MQROUTE.open(techId, 'YYYY-MM-DD', onDone) ← نافذة المسؤول: الترتيب الحالي مقابل المقترح، وما يتغير شي إلا بموافقته
   MQROUTE.tech(el)                            ← جوال الفني: مسار يومه بالخريطة والمسافات وزر الملاحة */
(function(){
  var W = window, D = document;
  function TOK(){ try { return localStorage.getItem('token') || ''; } catch(e){ return ''; } }
  function api(p, o){ o = o || {}; o.headers = Object.assign({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK() }, o.headers || {});
    return fetch(p, o).then(function(r){ return r.json().then(function(j){ if (!r.ok) { var e = new Error(j.message || 'تعذّر تحميل المسار'); e.j = j; throw e; } return j; }); }); }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tm(d){ try { return new Date(d).toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' }); } catch(e){ return ''; } }
  function mn(r){ return r === 1 ? 'دقيقة' : r === 2 ? 'دقيقتين' : r + (r <= 10 ? ' دقايق' : ' دقيقة'); }
  function dur(m){ m = Math.round(m || 0); if (m < 60) return mn(m); var h = Math.floor(m / 60), r = m % 60; return (h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h + (h <= 10 ? ' ساعات' : ' ساعة')) + (r ? ' و' + mn(r) : ''); }
  function km(v){ return (Math.round((v || 0) * 10) / 10) + ' كم'; }
  function css(){ if (D.getElementById('mqr-css')) return; var s = D.createElement('style'); s.id = 'mqr-css';
    s.textContent = '.mqr-ov{position:fixed;inset:0;background:rgba(15,28,63,.55);z-index:9000;display:flex;align-items:flex-end;justify-content:center;direction:rtl;font-family:inherit}'
      + '@media(min-width:760px){.mqr-ov{align-items:center;padding:20px}}'
      + '.mqr{background:#eef3fc;width:min(1040px,100%);max-height:94vh;overflow:auto;border-radius:22px 22px 0 0;padding:18px;color:#172554}@media(min-width:760px){.mqr{border-radius:22px}}'
      + '.mqr-h{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px}.mqr-h b{font-size:19px;font-weight:900}.mqr-h small{display:block;font-size:12.5px;font-weight:700;color:#64748b;margin-top:2px}'
      + '.mqr-x{border:0;background:#fff;width:40px;height:40px;border-radius:12px;font-size:16px;cursor:pointer;flex:none;color:#172554}'
      + '.mqr-save{display:inline-block;background:#e3f6ea;color:#166534;border-radius:999px;padding:7px 14px;font-size:13.5px;font-weight:800;margin-bottom:10px}'
      + '.mqr-g{display:grid;grid-template-columns:1fr;gap:12px}@media(min-width:760px){.mqr-g{grid-template-columns:1fr 1fr}}'
      + '.mqr-c{background:#fff;border:1px solid #e3eaf6;border-radius:18px;padding:14px;min-width:0}.mqr-c.best{border:2px solid #1e3a8a}'
      + '.mqr-ct{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}.mqr-ct b{font-size:15.5px;font-weight:900}.mqr-ct span{font-size:12.5px;font-weight:800;color:#64748b}.mqr-c.best .mqr-ct span{color:#166534}'
      + '.mqr-map{height:150px;border-radius:14px;background:#e6edf9;overflow:hidden;position:relative;z-index:1;margin-bottom:6px}'
      + '.mqr-s{display:flex;align-items:center;gap:10px;padding:9px 0;border-top:1px solid #eaf0fa}.mqr-s:first-of-type{border-top:0}'
      + '.mqr-n{width:28px;height:28px;border-radius:50%;background:#1e3a8a;color:#fff;font-weight:900;font-size:12.5px;display:flex;align-items:center;justify-content:center;flex:none}.mqr-s.mv .mqr-n{background:#b45309}'
      + '.mqr-s .c{flex:1;min-width:0}.mqr-s .c b{display:block;font-size:13.5px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mqr-s .c span{display:block;font-size:12px;font-weight:700;color:#64748b}'
      + '.mqr-s .t{font-size:13px;font-weight:800;white-space:nowrap}.mqr-s.mv .t{color:#b45309}'
      + '.mqr-w{background:#fffaf0;border:1px solid #f1cf8f;border-radius:18px;padding:14px;margin-top:12px}.mqr-w b{font-size:14px;color:#9a4a00;font-weight:900}.mqr-w p{margin:4px 0 10px;font-size:12.5px;font-weight:700;color:#64748b;line-height:1.7}'
      + '.mqr-b{display:flex;flex-wrap:wrap;gap:8px}.mqr-btn{border:1.5px solid #cdd8ec;background:#fff;color:#1e3a8a;border-radius:13px;min-height:44px;padding:10px 16px;font-family:inherit;font-weight:800;font-size:14px;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}'
      + '.mqr-btn.pri{background:#1e3a8a;border-color:#1e3a8a;color:#fff}.mqr-btn.wa{color:#15803d}.mqr-btn:disabled{opacity:.6}'
      + '.mqr-e{background:#fff;border-radius:18px;padding:22px;text-align:center}.mqr-e b{display:block;font-size:16px;font-weight:900}.mqr-e span{display:block;font-size:13px;font-weight:700;color:#64748b;margin-top:6px;line-height:1.7}'
      + '.mqr-tag{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:800;background:#e3f6ea;color:#166534;margin-inline-start:4px}.mqr-tag.no{background:#f1f5f9;color:#475569}'
      + '.mqr-pin{width:26px;height:26px;border-radius:50%;background:#1e3a8a;color:#fff;font:900 12px/20px system-ui;text-align:center;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.3);box-sizing:border-box}.mqr-pin.st{background:#0f766e}'
      + '.mqr-tk{background:#fff;border:1px solid #e3eaf6;border-radius:18px;padding:14px;margin-bottom:12px;color:#172554}.mqr-tk .mqr-map{height:170px}'
      + '.mqr-leg{display:flex;gap:12px;align-items:flex-start}.mqr-leg .ln{display:flex;flex-direction:column;align-items:center}.mqr-leg .ln i{width:2px;height:30px;background:#cdd8ec;display:block}.mqr-leg:last-child .ln i{display:none}'
      + '.mqr-leg .c{flex:1;min-width:0;padding-bottom:8px}.mqr-leg .c b{font-size:14.5px;font-weight:800}.mqr-leg .c span{display:block;font-size:12.5px;font-weight:700;color:#64748b}.mqr-leg .c .dr{color:#0f766e}'
      + '@media(prefers-color-scheme:dark){html:not([data-theme=light]) .mqr{background:#0f172a;color:#e2e8f0}html:not([data-theme=light]) .mqr-c,html:not([data-theme=light]) .mqr-e,html:not([data-theme=light]) .mqr-tk,html:not([data-theme=light]) .mqr-x,html:not([data-theme=light]) .mqr-btn:not(.pri){background:#1e293b;border-color:#334155;color:#e2e8f0}html:not([data-theme=light]) .mqr-w{background:#3b2f14;border-color:#7c5a12}html:not([data-theme=light]) .mqr-w b{color:#fcd34d}}';
    D.head.appendChild(s); }
  function leaflet(){ if (W.L) return Promise.resolve(); if (W._llP) return W._llP; W._llP = new Promise(function(ok, no){ var c = D.createElement('link'); c.rel = 'stylesheet'; c.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; D.head.appendChild(c); var s = D.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = ok; s.onerror = no; D.head.appendChild(s); }); return W._llP; }
  function base(m){ function go(){ if (W.MQMAP) W.MQMAP.base(m, { def: 'std', ctl: false }); else L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m); }
    if (W.MQMAP) return go(); if (!W._mqmP) W._mqmP = new Promise(function(ok){ var s = D.createElement('script'); s.src = '/mqmap.js?v=1'; s.onload = ok; s.onerror = ok; D.head.appendChild(s); }); W._mqmP.then(go); }
  // خريطة صغيرة: نقطة البداية + المشاريع مرقمة + خط المسار (الحقيقي من الطرق، وإلا خط مستقيم متقطع)
  function draw(el, start, v){ if (!el || !v || !v.stops.length) return; leaflet().then(function(){ if (!el.isConnected) return;
      var m = L.map(el, { zoomControl: false, attributionControl: false, dragging: !L.Browser.mobile, scrollWheelZoom: false }); base(m); var pts = [];
      if (start) { pts.push([start.lat, start.lng]); L.marker([start.lat, start.lng], { icon: L.divIcon({ className: '', html: '<div class="mqr-pin st">●</div>', iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(m); }
      v.stops.forEach(function(s, i){ pts.push([s.lat, s.lng]); L.marker([s.lat, s.lng], { icon: L.divIcon({ className: '', html: '<div class="mqr-pin">' + (i + 1) + '</div>', iconSize: [26, 26], iconAnchor: [13, 13] }) }).addTo(m); });
      if (v.path && v.path.length > 1) L.polyline(v.path, { color: '#1e3a8a', weight: 4, opacity: .85 }).addTo(m); else if (pts.length > 1) L.polyline(pts, { color: '#1e3a8a', weight: 3, opacity: .7, dashArray: '6 8' }).addTo(m);
      if (pts.length > 1) m.fitBounds(pts, { padding: [24, 24], maxZoom: 15 }); else m.setView(pts[0], 14);
      setTimeout(function(){ try { m.invalidateSize(); if (pts.length > 1) m.fitBounds(pts, { padding: [24, 24], maxZoom: 15 }); } catch(e){} }, 250);
    }).catch(function(){ el.style.display = 'none'; }); }
  function rows(v, best){ return v.stops.map(function(s, i){ var mv = best && s.moved;
      return '<div class="mqr-s' + (mv ? ' mv' : '') + '"><span class="mqr-n">' + (i + 1) + '</span><div class="c"><b>' + esc(s.title) + (s.address ? ' — ' + esc(s.address) : '') + (s.locked ? ' 🔒' : '') + '</b><span>'
        + (mv ? 'كان ' + tm(s.was) + ' — ' + (new Date(s.at) < new Date(s.was) ? 'يتقدّم' : 'يتأخر') : (best && s.fixed ? 'ما يتحرك' : esc(s.client || ''))) + '</span></div><span class="t">' + tm(s.at) + '</span></div>'; }).join(''); }
  function open(techId, day, onDone){ css(); var ov = D.createElement('div'); ov.className = 'mqr-ov'; ov.onclick = function(e){ if (e.target === ov) ov.remove(); };
    ov.innerHTML = '<div class="mqr" role="dialog" aria-label="أفضل مسار"><div class="mqr-e"><b>جاري حساب المسار…</b></div></div>'; D.body.appendChild(ov); var box = ov.firstChild;
    var head = function(r){ return '<div class="mqr-h"><div><b>أفضل مسار — ' + esc(r.tech.name) + '</b><small>نرتب مشاريع اليوم بأقصر طريق — وما يتغير شي إلا بموافقتك</small></div><button class="mqr-x" aria-label="إغلاق">✕</button></div>'; };
    var bind = function(){ var x = box.querySelector('.mqr-x'); if (x) x.onclick = function(){ ov.remove(); }; };
    var nogeo = function(r){ return r.nogeo && r.nogeo.length ? '<p style="font-size:12.5px;font-weight:700;color:#9a4a00;margin:10px 2px 0">⚠️ ' + r.nogeo.length + ' مشروع بدون موقع على الخريطة ما دخل في الحساب: ' + r.nogeo.map(function(x){ return '«' + esc(x.title) + '»'; }).join('، ') + '</p>' : ''; };
    api('/api/route/day?tech=' + techId + '&d=' + encodeURIComponent(day || '')).then(function(r){
      if (r.n < 2) { box.innerHTML = head(r) + '<div class="mqr-e"><b>' + (r.n ? 'مشروع واحد فقط اليوم' : 'ما فيه مشاريع بمواقع اليوم') + '</b><span>ترتيب المسار يحتاج مشروعين أو أكثر عليها موقع على الخريطة في نفس اليوم.</span></div>' + nogeo(r); return bind(); }
      var h = head(r); var est = r.cur.real ? '' : ' (تقديري)';
      if (!r.best) { h += '<span class="mqr-save">✓ الترتيب الحالي هو الأفضل</span><div class="mqr-c"><div class="mqr-ct"><b>مسار اليوم</b><span>' + km(r.cur.km) + ' · ' + dur(r.cur.min) + est + '</span></div><div class="mqr-map" id="mqr-m1"></div>' + rows(r.cur) + '</div>' + (r.start ? '' : '<p style="font-size:12.5px;font-weight:700;color:#64748b;margin:10px 2px 0">حدد موقع المؤسسة من إعدادات الحضور عشان المسار ينحسب من نقطة انطلاق الفني.</p>') + nogeo(r);
        box.innerHTML = h; bind(); draw(D.getElementById('mqr-m1'), r.start, r.cur); return; }
      h += '<span class="mqr-save">يوفّر ' + km(r.save_km) + ' · ' + dur(Math.max(0, r.save_min)) + '</span><div class="mqr-g">'
        + '<div class="mqr-c"><div class="mqr-ct"><b>الترتيب الحالي</b><span>' + km(r.cur.km) + ' · ' + dur(r.cur.min) + est + '</span></div><div class="mqr-map" id="mqr-m1"></div>' + rows(r.cur) + '</div>'
        + '<div class="mqr-c best"><div class="mqr-ct"><b>الترتيب المقترح</b><span>' + km(r.best.km) + ' · ' + dur(r.best.min) + est + '</span></div><div class="mqr-map" id="mqr-m2"></div>' + rows(r.best, true) + '</div></div>'
        + '<div class="mqr-w"><b>' + (r.changes === 1 ? 'موعد واحد يتغيّر' : r.changes === 2 ? 'موعدين يتغيّرون' : r.changes + ' مواعيد تتغيّر') + ' — العملاء يتبلغون بعد موافقتك</b><p>كل عميل تغيّر موعده يوصله إشعار وإيميل بالموعد الجديد، وتقدر ترسل له واتساب بعد الاعتماد · المشروع اللي عليه 🔒 «موعد ثابت» ما يتحرك</p>'
        + '<div class="mqr-b"><button class="mqr-btn pri" data-a="1">اعتمد الترتيب وبلّغ العملاء</button><button class="mqr-btn" data-a="0">اعتمد بدون تبليغ</button><button class="mqr-btn" data-a="x">خلّه مثل ما هو</button></div></div>' + nogeo(r);
      box.innerHTML = h; bind(); draw(D.getElementById('mqr-m1'), r.start, r.cur); draw(D.getElementById('mqr-m2'), r.start, r.best);
      [].forEach.call(box.querySelectorAll('.mqr-b [data-a]'), function(b){ b.onclick = function(){ var a = b.getAttribute('data-a'); if (a === 'x') return ov.remove();
          [].forEach.call(box.querySelectorAll('.mqr-b button'), function(z){ z.disabled = true; }); b.textContent = 'جارٍ الاعتماد…';
          api('/api/route/day/apply', { method: 'POST', body: JSON.stringify({ tech: techId, d: r.day, order: r.order, notify: a === '1' }) }).then(function(x){ done(r, x, a === '1'); if (onDone) try { onDone(x); } catch(e){} })
            .catch(function(e){ box.innerHTML = head(r) + '<div class="mqr-e"><b>' + esc(e.message) + '</b></div>'; bind(); }); }; });
    }).catch(function(e){ box.innerHTML = '<div class="mqr-h"><div><b>أفضل مسار</b></div><button class="mqr-x" aria-label="إغلاق">✕</button></div><div class="mqr-e"><b>' + esc(e && e.message || 'تعذّر تحميل المسار') + '</b></div>'; bind(); });
    // بعد الاعتماد: وين وصل الطلب لكل عميل + زر واتساب برسالة جاهزة
    function done(r, x, told){ var h = head(r) + '<span class="mqr-save">✓ ترتّب المسار — ' + (x.moved === 1 ? 'موعد واحد تغيّر' : x.moved === 2 ? 'موعدين تغيّروا' : x.moved + ' مواعيد تغيّرت') + '</span><div class="mqr-c"><div class="mqr-ct"><b>وين وصل التبليغ للعملاء؟</b></div>'
        + (x.list || []).map(function(s){ return '<div class="mqr-s"><div class="c"><b>' + esc(s.client || s.title) + ' — ' + esc(s.title) + '</b><span>كان ' + tm(s.was) + ' ← صار ' + tm(s.at) + '</span><span>'
            + (told ? '<i class="mqr-tag' + (s.notif ? '' : ' no') + '" style="font-style:normal">🔔 إشعار ' + (s.notif ? '✓' : '— ما عنده حساب') + '</i><i class="mqr-tag' + (s.email ? '' : ' no') + '" style="font-style:normal">✉️ إيميل ' + (s.email ? '✓' : '— ما فيه إيميل') + '</i>' : '<i class="mqr-tag no" style="font-style:normal">ما أُرسل تبليغ</i>') + '</span></div>'
            + (s.wa ? '<a class="mqr-btn wa" target="_blank" rel="noopener" href="' + esc(s.wa) + '">واتساب</a>' : '') + '</div>'; }).join('')
        + '</div><div class="mqr-b" style="margin-top:12px"><button class="mqr-btn pri" data-c="1">تم</button></div>';
      box.innerHTML = h; bind(); box.querySelector('[data-c]').onclick = function(){ ov.remove(); }; }
  }
  // جوال الفني
  function tech(el){ if (!el) return; css(); var render = function(from){ api('/api/tech/route' + (from ? '?lat=' + from.lat + '&lng=' + from.lng : '')).then(function(r){
        if (!r.n) { el.innerHTML = ''; return; }
        var first = r.stops[0]; var h = '<div class="mqr-tk"><div class="mqr-ct" style="flex-direction:column;align-items:flex-start;gap:2px"><b>🧭 مسار اليوم</b><span>' + (r.n === 1 ? 'مشروع واحد' : r.n === 2 ? 'مشروعين' : r.n + ' مشاريع') + ' · ' + km(r.km) + ' · ' + dur(r.min) + ' قيادة' + (r.real ? '' : ' (تقديري)') + '</span></div><div class="mqr-map" id="mqr-tm"></div>'
          + '<a class="mqr-btn pri" style="width:100%;margin:6px 0 12px" target="_blank" rel="noopener" href="' + esc(first.nav) + '">🧭 ابدأ الملاحة للمشروع الأول</a>'
          + r.stops.map(function(s, i){ return '<div class="mqr-leg"><div class="ln"><span class="mqr-n">' + (i + 1) + '</span><i></i></div><div class="c"><div style="display:flex;justify-content:space-between;gap:8px"><b>' + esc(s.title) + '</b><b style="font-size:13px;color:#1e3a8a;white-space:nowrap">' + tm(s.at) + '</b></div><span>' + esc(s.address || '') + '</span>'
              + (s.km || i || r.start ? '<span class="dr">🚗 ' + km(s.km) + ' · ' + dur(s.drive) + ' ' + (i ? 'من المشروع السابق' : (r.start_src === 'me' ? 'من موقعك' : 'من المؤسسة')) + '</span>' : '')
              + '<div class="mqr-b" style="margin-top:6px"><a class="mqr-btn" style="min-height:38px;padding:7px 12px;font-size:12.5px" target="_blank" rel="noopener" href="' + esc(s.nav) + '">الملاحة</a><a class="mqr-btn" style="min-height:38px;padding:7px 12px;font-size:12.5px" href="/tech.html?id=' + s.id + '">التفاصيل</a></div></div></div>'; }).join('')
          + (r.nogeo ? '<p style="font-size:12px;font-weight:700;color:#9a4a00;margin:8px 0 0">⚠️ ' + r.nogeo + ' مشروع بدون موقع على الخريطة ما دخل في المسار</p>' : '') + '</div>';
        el.innerHTML = h; draw(D.getElementById('mqr-tm'), r.start, r);
      }).catch(function(){ el.innerHTML = ''; }); };
    render(null);
    // لو سمح بالموقع نحسب من مكانه الحالي (بدون ما نلحّ عليه)
    try { if (navigator.permissions && navigator.geolocation) navigator.permissions.query({ name: 'geolocation' }).then(function(p){ if (p.state === 'granted') navigator.geolocation.getCurrentPosition(function(g){ render({ lat: g.coords.latitude, lng: g.coords.longitude }); }, function(){}, { maximumAge: 120000, timeout: 6000 }); }).catch(function(){}); } catch(e){}
  }
  W.MQROUTE = { open: open, tech: tech };
})();
