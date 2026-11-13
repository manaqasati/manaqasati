/* مناقصة — اختيار الموقع على الخريطة (مكوّن موحّد)
   MNQ_GEO.pick({lat,lng,city,title}) ← وعد يرجّع {lat,lng,address,maps} أو null لو ألغى
   MNQ_GEO.field(el,{value,lat,lng,address,onChange,disabled}) ← حقل موقع: خريطة مصغّرة + «حدّد على الخريطة» + «الصق رابط قوقل ماب»
   - بحث بالعنوان أو الحي أو اسم المكان
   - «موقعي الحالي»
   - لصق رابط قوقل ماب (حتى الروابط المختصرة) */
(function(W, D){
  if (W.MNQ_GEO) return;
  var CTY = {'الرياض':[24.7136,46.6753],'جدة':[21.5433,39.1728],'مكة المكرمة':[21.3891,39.8579],'المدينة المنورة':[24.5247,39.5692],'الدمام':[26.4207,50.0888],'الخبر':[26.2172,50.1971],'بريدة':[26.326,43.975],'عنيزة':[26.0843,43.9935],'أبها':[18.2164,42.5053],'تبوك':[28.3838,36.555],'الطائف':[21.2703,40.4158],'حائل':[27.5114,41.7208],'جازان':[16.8892,42.5511],'نجران':[17.5656,44.2289],'الأحساء':[25.3833,49.5833],'الجبيل':[27.0046,49.646],'ينبع':[24.0895,38.0618],'خميس مشيط':[18.3,42.7333]};
  var TOK = function(){ try { return localStorage.getItem('token') || ''; } catch(e){ return ''; } };
  function api(p){ return fetch(p, { headers: { Authorization: 'Bearer ' + TOK() } }).then(function(r){ return r.json().then(function(j){ if (!r.ok) throw new Error(j.message || 'حدث خطأ'); return j; }); }); }
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function ll(){ if (W.L) return Promise.resolve(); if (W._llP) return W._llP; W._llP = new Promise(function(ok, no){ var c = D.createElement('link'); c.rel = 'stylesheet'; c.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'; D.head.appendChild(c); var s = D.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'; s.onload = ok; s.onerror = function(){ W._llP = null; no(); }; D.head.appendChild(s); }); return W._llP; }
  function murl(la, ln){ return 'https://www.google.com/maps/search/?api=1&query=' + la + ',' + ln; }
  function parse(u){ u = String(u || ''); try { u = decodeURIComponent(u); } catch(e){}
    var m = u.match(/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/) || u.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/) || u.match(/[?&](?:q|ll|query|destination|daddr|center)=(-?\d{1,2}\.\d+),\s*\+?(-?\d{1,3}\.\d+)/) || u.match(/^\s*(-?\d{1,2}\.\d{3,})\s*[,،]\s*(-?\d{1,3}\.\d{3,})\s*$/);
    return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : null; }
  var CSS = '.gpk{position:fixed;inset:0;z-index:10050;background:#fff;display:flex;flex-direction:column;font-family:Tajawal,system-ui,sans-serif;direction:rtl}'
   + '.gpk-h{padding:10px 12px calc(10px);display:flex;gap:8px;align-items:center;border-bottom:1px solid #e6eefb;background:#fff;position:relative;z-index:2}'
   + '.gpk-x{border:0;background:#f1f5f9;border-radius:12px;width:42px;height:42px;font-size:18px;cursor:pointer;flex:none;color:#172554}'
   + '.gpk-s{flex:1;display:flex;align-items:center;gap:8px;border:1.5px solid #e2e8f0;border-radius:12px;padding:0 12px;background:#f8fafc}.gpk-s input{flex:1;min-width:0;border:0;outline:0;background:transparent;font-family:inherit;font-size:16px;padding:11px 0;color:#1e293b}'
   + '.gpk-r{position:absolute;top:100%;left:12px;right:12px;background:#fff;border:1px solid #e6eefb;border-radius:14px;box-shadow:0 16px 40px -12px rgba(15,23,42,.35);overflow:hidden;max-height:50vh;overflow-y:auto}'
   + '.gpk-r button{display:block;width:100%;text-align:right;border:0;border-bottom:1px solid #f1f5f9;background:#fff;padding:12px 14px;font-family:inherit;cursor:pointer}.gpk-r button:active{background:#f5f8ff}.gpk-r b{display:block;font-size:14.5px;color:#172554}.gpk-r small{display:block;color:#64748b;font-size:12px;margin-top:2px}'
   + '.gpk-m{position:relative;flex:1;background:#e2e8f0}.gpk-map{position:absolute;inset:0}'
   + '.gpk-pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);z-index:500;pointer-events:none;transition:transform .15s}.gpk-m.mv .gpk-pin{transform:translate(-50%,-112%)}'
   + '.gpk-pin svg{filter:drop-shadow(0 6px 8px rgba(15,23,42,.35))}.gpk-dot{position:absolute;left:50%;top:50%;width:10px;height:5px;margin:-2px 0 0 -5px;border-radius:50%;background:rgba(15,23,42,.35);z-index:499;pointer-events:none}'
   + '.gpk-me{position:absolute;bottom:16px;left:14px;z-index:600;border:0;background:#fff;border-radius:14px;padding:11px 14px;font-family:inherit;font-weight:800;font-size:13.5px;color:#1e3a8a;box-shadow:0 8px 20px -6px rgba(15,23,42,.35);cursor:pointer}'
   + '.gpk-f{padding:12px 14px calc(14px + env(safe-area-inset-bottom));border-top:1px solid #e6eefb;display:flex;flex-direction:column;gap:10px;background:#fff}'
   + '.gpk-ad{display:flex;gap:10px;align-items:flex-start;min-height:40px}.gpk-ad i{font-style:normal;font-size:20px}.gpk-ad b{display:block;font-size:14.5px;color:#172554}.gpk-ad small{display:block;color:#64748b;font-size:12px;margin-top:2px}'
   + '.gpk-row{display:flex;gap:8px}.gpk-btn{flex:1;border:0;border-radius:14px;padding:14px;font-family:inherit;font-weight:800;font-size:15px;cursor:pointer}.gpk-ok{background:#1e3a8a;color:#fff}.gpk-ln{background:#fff;border:1.5px solid #e2e8f0;color:#1e293b;flex:none;padding:14px 14px}'
   + '.gpk-lk{display:none;gap:8px;flex-direction:column}.gpk-lk.on{display:flex}.gpk-lk input{border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;font-family:inherit;font-size:16px;direction:ltr;text-align:left}.gpk-err{color:#b42318;font-size:12.5px;font-weight:700}'
   + '.gfd{display:flex;flex-direction:column;gap:8px}.gfd-p{position:relative;height:150px;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;background:#eef2f7;cursor:pointer}.gfd-p .leaflet-control-container{display:none}.gfd-e{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#64748b;font-weight:700;font-size:13px}'
   + '.gfd-a{font-size:13px;color:#172554;font-weight:700;display:flex;gap:6px;align-items:flex-start;line-height:1.6}.gfd-b{display:flex;gap:8px}.gfd-b button{flex:1;border:1.5px solid #e2e8f0;background:#fff;border-radius:12px;padding:10px 8px;font-family:inherit;font-weight:800;font-size:13px;color:#1e3a8a;cursor:pointer}'
   + '.gfd-pin{position:absolute;left:50%;top:50%;transform:translate(-50%,-100%);z-index:500;pointer-events:none}';
  function css(){ if (D.getElementById('gpk-css')) return; var s = D.createElement('style'); s.id = 'gpk-css'; s.textContent = CSS; D.head.appendChild(s); }
  var PIN = '<svg width="38" height="48" viewBox="0 0 38 48"><path d="M19 47C19 47 36 29.5 36 18A17 17 0 0 0 2 18C2 29.5 19 47 19 47Z" fill="#1e3a8a"/><circle cx="19" cy="18" r="7" fill="#fff"/></svg>';

  function pick(o){ o = o || {}; css();
    return new Promise(function(done){
      var st = { lat: o.lat, lng: o.lng, address: o.address || '' }, mp = null, rvT = 0, sT = 0, closed = false;
      var ov = D.createElement('div'); ov.className = 'gpk'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'حدّد الموقع');
      ov.innerHTML = '<div class="gpk-h"><button type="button" class="gpk-x" aria-label="إغلاق">✕</button><div class="gpk-s"><span>🔎</span><input type="search" placeholder="ابحث عن حي أو شارع أو مكان" enterkeyhint="search" autocomplete="off"></div><div class="gpk-r" hidden></div></div>'
        + '<div class="gpk-m"><div class="gpk-map"></div><div class="gpk-dot"></div><div class="gpk-pin">' + PIN + '</div><button type="button" class="gpk-me">📍 موقعي الحالي</button></div>'
        + '<div class="gpk-f"><div class="gpk-ad"><i>📍</i><div><b class="gpk-at">حرّك الخريطة لين يكون الدبوس على المكان</b><small class="gpk-as"></small></div></div>'
        + '<div class="gpk-lk"><input type="url" inputmode="url" placeholder="https://maps.app.goo.gl/..." aria-label="رابط قوقل ماب"><div class="gpk-err" hidden></div><button type="button" class="gpk-btn gpk-ok gpk-lgo">اعرض الموقع من الرابط</button></div>'
        + '<div class="gpk-row"><button type="button" class="gpk-btn gpk-ln" title="الصق رابط قوقل ماب">🔗 رابط قوقل ماب</button><button type="button" class="gpk-btn gpk-ok gpk-done">تأكيد الموقع</button></div></div>';
      D.body.appendChild(ov); var prevOv = D.documentElement.style.overflow; D.documentElement.style.overflow = 'hidden';
      var $ = function(s){ return ov.querySelector(s); };
      function close(v){ if (closed) return; closed = true; D.documentElement.style.overflow = prevOv; ov.remove(); done(v); }
      $('.gpk-x').onclick = function(){ close(null); };
      function addr(t, sub){ $('.gpk-at').textContent = t; $('.gpk-as').textContent = sub || ''; }
      function reverse(){ clearTimeout(rvT); addr('جارٍ قراءة العنوان…'); rvT = setTimeout(function(){ var c = mp.getCenter();
        api('/api/geo/reverse?lat=' + c.lat.toFixed(6) + '&lng=' + c.lng.toFixed(6)).then(function(r){ st.address = r.address || ''; st.district = r.district || ''; addr(r.address || 'موقع محدد على الخريطة', c.lat.toFixed(5) + ', ' + c.lng.toFixed(5)); }).catch(function(){ addr('موقع محدد على الخريطة', c.lat.toFixed(5) + ', ' + c.lng.toFixed(5)); }); }, 450); }
      ll().then(function(){
        var c = st.lat ? [st.lat, st.lng] : (CTY[o.city] || CTY['الرياض']);
        mp = L.map($('.gpk-map'), { zoomControl: false, attributionControl: true }).setView(c, st.lat ? 17 : 12);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mp);
        mp.on('movestart', function(){ $('.gpk-m').classList.add('mv'); }); mp.on('moveend', function(){ $('.gpk-m').classList.remove('mv'); reverse(); });
        if (st.lat) reverse(); else if (!o.city && navigator.geolocation) locate(true);
      }).catch(function(){ $('.gpk-map').innerHTML = '<div style="padding:24px;font-weight:800;color:#172554">تعذّر تحميل الخريطة — جرّب «موقعي الحالي» أو الصق رابط قوقل ماب</div>'; });
      function locate(quiet){ if (!navigator.geolocation){ if (!quiet) addr('جهازك ما يدعم تحديد الموقع'); return; } if (!quiet) addr('جارٍ تحديد موقعك…');
        navigator.geolocation.getCurrentPosition(function(p){ if (mp) mp.setView([p.coords.latitude, p.coords.longitude], 17); }, function(){ if (!quiet) addr('ما قدرنا نحدد موقعك — اسمح للمتصفح بالموقع أو ابحث بالعنوان'); }, { enableHighAccuracy: true, timeout: 9000 }); }
      $('.gpk-me').onclick = function(){ locate(false); };
      // البحث
      var inp = $('.gpk-s input'), res = $('.gpk-r');
      inp.oninput = function(){ clearTimeout(sT); var q = inp.value.trim(); if (q.length < 2){ res.hidden = true; return; }
        var p = parse(q); if (p){ res.hidden = true; if (mp) mp.setView([p.lat, p.lng], 17); return; }
        sT = setTimeout(function(){ res.hidden = false; res.innerHTML = '<button type="button" disabled><small>جارٍ البحث…</small></button>';
          api('/api/geo/search?q=' + encodeURIComponent(q + (o.city && q.indexOf(o.city) < 0 ? ' ' + o.city : ''))).then(function(r){ if (inp.value.trim() !== q) return;
            res.innerHTML = (r.items || []).length ? r.items.map(function(x, i){ return '<button type="button" data-i="' + i + '"><b>' + esc(x.name) + '</b><small>' + esc(x.sub) + '</small></button>'; }).join('') : '<button type="button" disabled><small>ما لقينا نتائج — جرّب اسم الحي أو حرّك الخريطة</small></button>';
            [].forEach.call(res.querySelectorAll('[data-i]'), function(b){ b.onclick = function(){ var x = r.items[+b.getAttribute('data-i')]; res.hidden = true; inp.blur(); if (mp) mp.setView([x.lat, x.lng], 17); }; });
          }).catch(function(){ res.innerHTML = '<button type="button" disabled><small>تعذّر البحث الآن — حرّك الخريطة لموقعك</small></button>'; }); }, 500); };
      inp.onkeydown = function(e){ if (e.key === 'Enter'){ var b = res.querySelector('[data-i]'); if (b) b.click(); } };
      // رابط قوقل ماب
      $('.gpk-ln').onclick = function(){ var lk = $('.gpk-lk'); lk.classList.toggle('on'); if (lk.classList.contains('on')){ var i = lk.querySelector('input'); i.focus(); if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(function(t){ if (/goo\.gl|google\.[a-z.]+\/maps|maps\.app/.test(t) && !i.value) i.value = t.trim(); }).catch(function(){}); } };
      $('.gpk-lgo').onclick = function(){ var i = $('.gpk-lk input'), er = $('.gpk-err'), u = i.value.trim(); er.hidden = true; if (!u) { i.focus(); return; }
        var p = parse(u); var go = function(g){ $('.gpk-lk').classList.remove('on'); st.maps = /^https?:/.test(u) ? u : ''; if (mp) mp.setView([g.lat, g.lng], 17); };
        if (p) return go(p); var b = this; b.disabled = true; b.textContent = 'جارٍ قراءة الرابط…';
        api('/api/geo/resolve?u=' + encodeURIComponent(u)).then(go).catch(function(e){ er.textContent = e.message; er.hidden = false; }).then(function(){ b.disabled = false; b.textContent = 'اعرض الموقع من الرابط'; }); };
      $('.gpk-done').onclick = function(){ if (!mp) return; var c = mp.getCenter(), la = Math.round(c.lat * 1e6) / 1e6, ln = Math.round(c.lng * 1e6) / 1e6;
        close({ lat: la, lng: ln, address: st.address || '', district: st.district || '', maps: murl(la, ln) }); };
      // زر الرجوع في الجوال يقفل الخريطة
      if (W.mqBack) { try { var bk = W.mqBack.push(function(){ close(null); }); var _c = close; close = function(v){ try { W.mqBack.release(bk); } catch(_){} _c(v); }; } catch(_){} }
    });
  }

  function field(el, o){ o = o || {}; css(); var st = { lat: o.lat, lng: o.lng, maps: o.value || '', address: o.address || '' }, mini = null;
    if (!st.lat && st.maps){ var p = parse(st.maps); if (p){ st.lat = p.lat; st.lng = p.lng; } }
    function render(){
      el.innerHTML = '<div class="gfd"><div class="gfd-p" role="button" tabindex="0" aria-label="حدّد الموقع على الخريطة">' + (st.lat ? '<div class="gfd-mm" style="position:absolute;inset:0"></div><div class="gfd-pin">' + PIN.replace('width="38" height="48"', 'width="28" height="36"') + '</div>' : '<div class="gfd-e"><span style="font-size:26px">🗺</span>اضغط لتحديد الموقع على الخريطة</div>') + '</div>'
        + (st.lat ? '<div class="gfd-a"><span>📍</span><span>' + esc(st.address || (st.lat.toFixed(5) + ', ' + st.lng.toFixed(5))) + '</span></div>' : '')
        + (o.disabled ? '' : '<div class="gfd-b"><button type="button" data-a="pick">' + (st.lat ? '✏️ تعديل على الخريطة' : '🗺 حدّد على الخريطة') + '</button>' + (st.lat ? '<button type="button" data-a="open">↗ فتح في قوقل ماب</button><button type="button" data-a="clr" style="flex:none;color:#b42318">✕</button>' : '<button type="button" data-a="link">🔗 الصق رابط قوقل ماب</button>') + '</div>') + '</div>';
      var pv = el.querySelector('.gfd-p'); if (!o.disabled) { pv.onclick = go; pv.onkeydown = function(e){ if (e.key === 'Enter') go(); }; }
      var b = el.querySelectorAll('[data-a]'); [].forEach.call(b, function(x){ x.onclick = function(){ var a = x.getAttribute('data-a'); if (a === 'pick' || a === 'link') go(a === 'link'); else if (a === 'open') W.open(st.maps || murl(st.lat, st.lng), '_blank'); else if (a === 'clr'){ st = {}; render(); if (o.onChange) o.onChange(null); } }; });
      if (st.lat) ll().then(function(){ var m = el.querySelector('.gfd-mm'); if (!m) return; if (mini) { try { mini.remove(); } catch(_){} }
        mini = L.map(m, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false, touchZoom: false }).setView([st.lat, st.lng], 16);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mini); }).catch(function(){});
    }
    function go(link){ pick({ lat: st.lat, lng: st.lng, address: st.address, city: typeof o.city === 'function' ? o.city() : o.city }).then(function(r){ if (!r) return; st = r; render(); if (o.onChange) o.onChange(r); });
      if (link === true) setTimeout(function(){ var b = D.querySelector('.gpk .gpk-ln'); if (b) b.click(); }, 60); }
    render();
    return { get: function(){ return st.lat ? st : null; }, set: function(v){ st = v || {}; render(); } };
  }
  W.MNQ_GEO = { pick: pick, field: field, parse: parse };
})(window, document);
