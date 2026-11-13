/* مناقصة — طبقة الخريطة: «قمر صناعي | عادي» (Esri بمفتاح من السيرفر، وبدونه الخريطة العادية الحالية)
   الاستخدام: MQMAP.base(map, { def:'sat'|'std', ctl:true })  — يتذكّر اختيار المستخدم */
(function (W) {
  'use strict';
  if (W.MQMAP) return;
  var OSM = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  var ST = 'https://static-map-tiles-api.arcgis.com/arcgis/rest/services/static-basemap-tiles-service/v1/';
  var IMG = 'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  var cfgP = null;
  function cfg() {
    if (!cfgP) cfgP = fetch('/api/map/cfg').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    return cfgP;
  }
  function lang() { var l = ''; try { l = (localStorage.getItem('mnq_lang') || document.documentElement.lang || 'ar').slice(0, 2); } catch (_) { l = 'ar'; } return l === 'ur' ? 'ur' : (l === 'en' ? 'en' : 'ar'); }
  function getPref() { try { return localStorage.getItem('mq_maptype') || ''; } catch (_) { return ''; } }
  function setPref(v) { try { localStorage.setItem('mq_maptype', v); } catch (_) {} }
  var CSS = '.mqm-t{display:flex;background:#fff;border-radius:14px;padding:4px;gap:3px;box-shadow:0 8px 20px -6px rgba(15,23,42,.45);font-family:inherit;direction:rtl}'
    + '.mqm-t button{border:0;background:transparent;color:#334766;border-radius:11px;height:38px;padding:0 11px;font:800 13px/1 inherit;font-family:inherit;display:flex;align-items:center;gap:6px;cursor:pointer;min-width:44px}'
    + '.mqm-t button[aria-pressed="true"]{background:#1e3a8a;color:#fff}'
    + '.mqm-t button:focus-visible{outline:3px solid #38bdf8;outline-offset:1px}'
    + '.mqm-t svg{flex:none}'
    + '[data-theme="dark"] .mqm-t{background:#0f172a;box-shadow:0 8px 20px -6px rgba(0,0,0,.7)}[data-theme="dark"] .mqm-t button{color:#cbd5e1}[data-theme="dark"] .mqm-t button[aria-pressed="true"]{background:#2563eb;color:#fff}';
  function css() { if (document.getElementById('mqm-css')) return; var s = document.createElement('style'); s.id = 'mqm-css'; s.textContent = CSS; document.head.appendChild(s); }
  var I_SAT = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 7L9 3 5 7l4 4M17 11l4 4-4 4-4-4M8 12l4 4M16 8l-4-4"/><circle cx="12" cy="12" r="2"/></svg>';
  var I_STD = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>';

  function base(map, o) {
    o = o || {};
    var cur = null, layers = [], ctlEl = null, fails = 0;
    function clear() { layers.forEach(function (l) { try { map.removeLayer(l); } catch (_) {} }); layers = []; }
    function osm() { clear(); layers.push(L.tileLayer(OSM, { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)); }
    function esri(k, mode) {
      clear(); fails = 0;
      var q = '?token=' + encodeURIComponent(k) + '&language=' + lang();
      var att = 'Powered by <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a>';
      var main;
      if (mode === 'sat') {
        main = L.tileLayer(IMG + '?token=' + encodeURIComponent(k), { maxZoom: 19, maxNativeZoom: 19, attribution: att + ' · Maxar, Earthstar Geographics' });
        layers.push(main.addTo(map));
        layers.push(L.tileLayer(ST + 'arcgis/imagery/labels/static/tile/{z}/{y}/{x}' + q, { tileSize: 512, zoomOffset: -1, maxZoom: 20, minZoom: 1 }).addTo(map));
      } else {
        main = L.tileLayer(ST + 'arcgis/navigation/static/tile/{z}/{y}/{x}' + q, { tileSize: 512, zoomOffset: -1, maxZoom: 20, minZoom: 1, attribution: att });
        layers.push(main.addTo(map));
      }
      // المفتاح منتهي أو مرفوض: نرجع للخريطة العادية بدل شاشة فاضية
      main.on('tileerror', function () { if (++fails === 6) { osm(); if (ctlEl) ctlEl.style.display = 'none'; } });
    }
    function paint() { if (!ctlEl) return; [].forEach.call(ctlEl.querySelectorAll('button'), function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-m') === cur ? 'true' : 'false'); }); }
    osm(); // تظهر فوراً وتتبدّل لما يوصل الإعداد
    var api = { set: function () {}, get: function () { return cur || 'std'; } };
    cfg().then(function (c) {
      var k = c && c.esri; if (!k) return;
      cur = getPref() || o.def || 'std';
      esri(k, cur);
      api.set = function (m) { cur = m; setPref(m); esri(k, m); paint(); };
      if (o.ctl === false) return;
      css();
      var C = L.Control.extend({ options: { position: o.pos || 'topright' }, onAdd: function () {
        var d = L.DomUtil.create('div', 'mqm-t'); d.setAttribute('role', 'group'); d.setAttribute('aria-label', 'نوع الخريطة');
        d.innerHTML = '<button type="button" data-m="sat">' + I_SAT + '<span>قمر صناعي</span></button><button type="button" data-m="std">' + I_STD + '<span>عادي</span></button>';
        L.DomEvent.disableClickPropagation(d); L.DomEvent.disableScrollPropagation(d);
        [].forEach.call(d.querySelectorAll('button'), function (b) { b.onclick = function () { var m = b.getAttribute('data-m'); if (m !== cur) api.set(m); }; });
        ctlEl = d; return d; } });
      map.addControl(new C()); paint();
    });
    return api;
  }
  W.MQMAP = { base: base, cfg: cfg };
})(window);
