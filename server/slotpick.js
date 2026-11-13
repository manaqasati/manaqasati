/* مختار المواعيد — بدل حقل التاريخ والوقت حق الجوال
   MQ_SLOT.field(el, {value, dur, tech:()=>id, jobId, disabled, onChange})  → زر يعرض الموعد ويفتح المختار
   MQ_SLOT.pick({at, dur, tech, jobId}) → Promise<{at:Date, dur:min}|null>
   أيام بأزرار، أوقات كل نص ساعة، المدة، ومشغولية الفني من التقويم (/api/cal): دوام، إجازة، مواعيده الثانية */
(function(W, D){
  if (W.MQ_SLOT) return;
  var DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  var MON = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var DURS = [[60, 'ساعة'], [120, 'ساعتين'], [180, '3 ساعات'], [240, '4 ساعات'], [480, 'يوم كامل']];
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  // كل الحسابات بتوقيت الرياض (+3) بغض النظر عن توقيت الجهاز
  var OFF = 180;
  function ry(d){ return new Date(d.getTime() + OFF * 60000); }            // تاريخ «محلي الرياض» بقيم UTC
  function ymd(d){ var r = ry(d); return r.getUTCFullYear() + '-' + ('0' + (r.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + r.getUTCDate()).slice(-2); }
  function mins(d){ var r = ry(d); return r.getUTCHours() * 60 + r.getUTCMinutes(); }
  function at(y, m){ var p = y.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 0, m) - OFF * 60000); }
  function dow(y){ var p = y.split('-'); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])).getUTCDay(); }
  function hm(s){ var p = String(s || '0:0').split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
  function t12(m){ m = ((m % 1440) + 1440) % 1440; var h = Math.floor(m / 60), mm = m % 60, pm = h >= 12; h = h % 12 || 12; return h + (mm ? ':' + ('0' + mm).slice(-2) : '') + (pm ? ' م' : ' ص'); }
  function durT(d){ for (var i = 0; i < DURS.length; i++) if (DURS[i][0] === d) return DURS[i][1]; return d >= 60 ? (d / 60) + ' ساعات' : d + ' دقيقة'; }
  function dayT(y, today){ var p = y.split('-'), dd = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); var tm = new Date(Date.UTC(+today.split('-')[0], +today.split('-')[1] - 1, +today.split('-')[2]));
    var diff = Math.round((dd - tm) / 864e5); return diff === 0 ? 'اليوم' : diff === 1 ? 'بكرة' : DAYS[dd.getUTCDay()]; }
  function fmt(d, dur){ if (!d) return ''; var y = ymd(d), p = y.split('-'); return dayT(y, ymd(new Date())) + ' ' + (+p[2]) + ' ' + MON[+p[1] - 1] + ' · ' + t12(mins(d)) + (dur ? ' – ' + t12(mins(d) + dur) : ''); }
  function hdr(){ var t = ''; try { t = localStorage.getItem('token') || ''; } catch(e){} var h = { 'Authorization': 'Bearer ' + t }; try { if (W.MNQ_BR && MNQ_BR.h) Object.assign(h, MNQ_BR.h()); } catch(e){} return h; }
  var CACHE = {};
  function day(y){ if (CACHE[y] && Date.now() - CACHE[y].t < 30000) return Promise.resolve(CACHE[y].d);
    return fetch('/api/cal?from=' + y + '&days=1', { headers: hdr() }).then(function(r){ return r.ok ? r.json() : null; }).then(function(d){ CACHE[y] = { t: Date.now(), d: d }; return d; }).catch(function(){ return null; }); }
  var css = '.msl{display:flex;flex-direction:column;gap:12px}.msl-h{display:flex;align-items:center;gap:10px}.msl-h b{font-size:17px;color:#172554;font-weight:900;flex:1}'
   + '.msl-x{width:36px;height:36px;border-radius:11px;border:0;background:#f1f5f9;font-size:18px;cursor:pointer;color:#334155}'
   + '.msl-sl{font-size:12.5px;font-weight:900;color:#64748b}'
   + '.msl-days{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding:2px 2px 4px;scroll-snap-type:x proximity}.msl-days::-webkit-scrollbar{display:none}'
   + '.msl-d{flex:0 0 auto;min-width:62px;border:1.5px solid #e2e8f0;background:#fff;border-radius:14px;padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:1px;cursor:pointer;font-family:inherit;color:#334155;scroll-snap-align:start}'
   + '.msl-d small{font-size:11px;font-weight:800;color:#64748b}.msl-d b{font-size:19px;font-weight:900;line-height:1.2}.msl-d i{font-style:normal;font-size:10.5px;font-weight:800;color:#94a3b8}'
   + '.msl-d.on{background:#172554;border-color:#172554;color:#fff}.msl-d.on small,.msl-d.on i{color:rgba(255,255,255,.75)}.msl-d.off{opacity:.55}.msl-d.off i{color:#b42318}'
   + '.msl-durs{display:flex;gap:6px;flex-wrap:wrap}.msl-durs button{border:1.5px solid #e2e8f0;background:#fff;border-radius:999px;padding:7px 12px;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;color:#334155}.msl-durs button.on{background:#eff4ff;border-color:#1e3a8a;color:#1e3a8a}'
   + '.msl-g{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;max-height:min(38vh,330px);overflow:auto;padding:2px}'
   + '.msl-t{min-width:0;overflow:hidden;border:1.5px solid #e2e8f0;background:#fff;border-radius:12px;min-height:44px;padding:4px 2px;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit;color:#0f172a;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;line-height:1.2}'
   + '.msl-t small{font-size:9.5px;font-weight:800;color:#94a3b8;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 3px}'
   + '.msl-t.busy{background:#fef3f2;border-color:#fcd4cf;color:#b42318}.msl-t.busy small{color:#b42318}.msl-t.out{background:#f8fafc;color:#94a3b8;border-style:dashed}.msl-t.past{opacity:.35;cursor:not-allowed}'
   + '.msl-t.on{background:linear-gradient(135deg,#1e3a8a,#172554);border-color:#172554;color:#fff}.msl-t.on small{color:rgba(255,255,255,.8)}.msl-t.rng{background:#eff4ff;border-color:#bfd3fe}'
   + '.msl-lg{display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;font-weight:800;color:#64748b}.msl-lg span{display:inline-flex;align-items:center;gap:5px}.msl-lg i{width:12px;height:12px;border-radius:4px;display:inline-block}'
   + '.msl-w{background:#fffaeb;border:1px solid #fde68a;border-radius:12px;padding:9px 11px;font-size:12.5px;font-weight:800;color:#93370d;line-height:1.8}.msl-ok{background:#ecfdf3;border:1px solid #abefc6;border-radius:12px;padding:9px 11px;font-size:12.5px;font-weight:800;color:#067647}'
   + '.msl-ft{display:flex;flex-direction:column;gap:8px;border-top:1px solid #eef2f7;padding-top:10px}.msl-sum{font-size:14px;font-weight:900;color:#172554;text-align:center}'
   + '.msl-go{border:0;border-radius:14px;min-height:50px;background:linear-gradient(135deg,#1e3a8a,#172554);color:#fff;font-weight:900;font-size:15.5px;cursor:pointer;font-family:inherit;box-shadow:0 10px 22px -12px rgba(23,37,84,.7)}.msl-go:disabled{opacity:.45}'
   + '.msl-ld{text-align:center;color:#94a3b8;font-weight:800;font-size:13px;padding:18px}'
   + '.msl-f{width:100%;display:flex;align-items:center;gap:10px;border:1.5px solid #d3deef;border-radius:12px;background:#fff;padding:10px 12px;min-height:46px;cursor:pointer;font-family:inherit;text-align:right;color:#0f172a}'
   + '.msl-f:disabled{background:#f8fafc;cursor:default}.msl-f .ic{font-size:18px}.msl-f .tx{flex:1;min-width:0;font-weight:800;font-size:14px}.msl-f .tx.em{color:#94a3b8;font-weight:700}.msl-f .ch{color:#1e3a8a;font-weight:900;font-size:12.5px}'
   + '.msl-ov{position:fixed;inset:0;z-index:2147483500;background:rgba(15,23,42,.5);-webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);display:flex;align-items:flex-end;justify-content:center;direction:rtl;font-family:Tajawal,system-ui,sans-serif}'
   + '@media(min-width:700px){.msl-ov{align-items:center}}'
   + '.msl-sh{background:#fff;width:min(520px,100%);max-height:94vh;overflow:auto;border-radius:24px 24px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px -20px rgba(0,0,0,.4)}@media(min-width:700px){.msl-sh{border-radius:24px}}';
  var st = D.createElement('style'); st.textContent = css; (D.head || D.documentElement).appendChild(st);

  function pick(o){
    o = o || {};
    return new Promise(function(done){
      var today = ymd(new Date()), now = mins(new Date());
      var S = { y: o.at ? ymd(new Date(o.at)) : today, m: o.at ? mins(new Date(o.at)) : null, dur: o.dur || 120, data: null };
      var ov = D.createElement('div'); ov.className = 'msl-ov'; ov.setAttribute('data-noback', '');
      ov.innerHTML = '<div class="msl-sh" role="dialog" aria-modal="true" aria-label="اختيار الموعد"><div class="msl"></div></div>';
      D.body.appendChild(ov); var box = ov.querySelector('.msl');
      var fin = function(v){ ov.remove(); done(v); };
      ov.addEventListener('click', function(e){ if (e.target === ov) fin(null); });
      function tech(){ var id = typeof o.tech === 'function' ? o.tech() : o.tech; return id ? parseInt(id) : null; }
      function load(){ S.data = null; draw(); day(S.y).then(function(d){ S.data = d || { techs: [], jobs: [], leaves: [] }; draw(); }); }
      function info(){ // مشغولية كل نص ساعة للفني المختار (أو كم فني فاضي لو ما اخترت فني)
        var d = S.data, T = tech(), y = S.y, out = {};
        if (!d) return out;
        var ts = d.techs || [], lv = d.leaves || [], js = (d.jobs || []).filter(function(j){ return j.id !== o.jobId && j.at && j.status !== 'cancelled'; });
        var t = T ? ts.filter(function(x){ return x.id === T; })[0] : null;
        var onLv = function(id){ return lv.some(function(l){ return l.tech_id === id && l.d1 <= y && l.d2 >= y; }); };
        out.tech = t; out.leave = t && onLv(t.id); out.offDay = t && t.sched && t.sched.days && t.sched.days.indexOf(dow(y)) < 0;
        out.from = t && t.sched ? hm(t.sched.from) : 7 * 60; out.to = t && t.sched ? hm(t.sched.to) : 23 * 60;
        out.busy = function(m){ var e = m + S.dur;
          if (t) return js.filter(function(j){ if (j.tech_id !== t.id) return false; var a = mins(new Date(j.at)), b = a + (j.dur || 120); return a < e && b > m; })[0] || null;
          return null; };
        out.freeN = function(m){ var e = m + S.dur; return ts.filter(function(x){ if (onLv(x.id)) return false; var sc = x.sched || {}; if (sc.days && sc.days.indexOf(dow(y)) < 0) return false; if (sc.from && (m < hm(sc.from) || e > hm(sc.to))) return false;
          return !js.some(function(j){ if (j.tech_id !== x.id) return false; var a = mins(new Date(j.at)), b = a + (j.dur || 120); return a < e && b > m; }); }).length; };
        out.n = ts.length; return out;
      }
      function draw(){
        var I = info(), t = I.tech, h = '<div class="msl-h"><b>موعد الزيارة' + (t ? ' · ' + esc(t.name) : '') + '</b><button type="button" class="msl-x" data-a="x" aria-label="إغلاق">×</button></div>';
        // الأيام
        h += '<div class="msl-sl">اليوم</div><div class="msl-days">';
        for (var k = 0; k < 21; k++) { var dd = new Date(Date.now() + k * 864e5), y = ymd(dd), p = y.split('-');
          var wk = t && t.sched && t.sched.days && t.sched.days.indexOf(dow(y)) < 0;
          h += '<button type="button" class="msl-d' + (y === S.y ? ' on' : '') + (wk ? ' off' : '') + '" data-a="day" data-v="' + y + '"><small>' + dayT(y, today) + '</small><b>' + (+p[2]) + '</b><i>' + (wk ? 'إجازة' : MON[+p[1] - 1]) + '</i></button>'; }
        h += '</div>';
        // المدة
        h += '<div class="msl-sl">المدة المتوقعة</div><div class="msl-durs">' + DURS.map(function(x){ return '<button type="button" class="' + (S.dur === x[0] ? 'on' : '') + '" data-a="dur" data-v="' + x[0] + '">' + x[1] + '</button>'; }).join('') + '</div>';
        // الأوقات
        h += '<div class="msl-sl">الوقت</div>';
        if (!S.data) h += '<div class="msl-ld">جاري تحميل المواعيد…</div>';
        else {
          if (I.leave) h += '<div class="msl-w">⚠️ ' + esc(t.name) + ' إجازة هذا اليوم</div>';
          else if (I.offDay) h += '<div class="msl-w">⚠️ هذا اليوم مو من أيام دوام ' + esc(t.name) + '</div>';
          var g0 = Math.min(I.from, 7 * 60), g1 = Math.max(I.to, 22 * 60), slots = [];
          for (var m = g0; m + 30 <= g1 + 1 && m < 1440; m += 30) slots.push(m);
          h += '<div class="msl-g" role="listbox" aria-label="الأوقات">';
          slots.forEach(function(m){ var past = S.y === today && m < now + 15, b = I.busy(m), out = t && (m < I.from || m + S.dur > I.to);
            var on = S.m === m, rng = S.m != null && m > S.m && m < S.m + S.dur;
            var sub = b ? esc(b.title || 'موعد') : out ? 'خارج الدوام' : (!t && I.n ? (function(){ var f = I.freeN(m); return f + ' فني فاضي'; })() : '');
            h += '<button type="button" role="option" aria-selected="' + on + '" class="msl-t' + (on ? ' on' : rng ? ' rng' : b ? ' busy' : out ? ' out' : '') + (past ? ' past' : '') + '" data-a="tm" data-v="' + m + '"' + (past ? ' disabled' : '') + '>' + t12(m) + (sub ? '<small>' + sub + '</small>' : '') + '</button>'; });
          h += '</div>';
          h += '<div class="msl-lg">' + (t ? '<span><i style="background:#fef3f2;border:1px solid #fcd4cf"></i>مشغول</span><span><i style="background:#f8fafc;border:1px dashed #cbd5e1"></i>خارج الدوام</span>' : '<span>اختر فني من «الفني» عشان تشوف مشغوليته</span>') + '</div>';
        }
        // الملخص
        var warn = [];
        if (S.m != null && S.data) { var b2 = I.busy(S.m); if (b2) warn.push(esc(t.name) + ' عنده «' + esc(b2.title || 'موعد') + '» ' + t12(mins(new Date(b2.at))) + ' ويتداخل معه');
          if (t && !I.leave && !I.offDay && (S.m < I.from || S.m + S.dur > I.to)) warn.push('خارج دوام ' + esc(t.name) + ' (' + t12(I.from) + ' – ' + t12(I.to) + ')');
          if (I.leave) warn.push(esc(t.name) + ' إجازة'); else if (I.offDay) warn.push('مو من أيام دوامه'); }
        h += '<div class="msl-ft">' + (S.m != null ? '<div class="msl-sum">' + esc(fmt(at(S.y, S.m), S.dur)) + '</div>' : '')
          + (warn.length ? '<div class="msl-w">⚠️ ' + warn.join('<br>⚠️ ') + '</div>' : (S.m != null && t ? '<div class="msl-ok">✓ ' + esc(t.name) + ' فاضي هذا الوقت</div>' : ''))
          + '<button type="button" class="msl-go" data-a="ok"' + (S.m == null ? ' disabled' : '') + '>' + (warn.length ? 'اعتماد الموعد رغم التنبيه' : 'اعتماد الموعد') + '</button>'
          + (o.at ? '<button type="button" class="msl-x" style="width:auto;padding:0 14px;align-self:center;font-size:13px;font-weight:800" data-a="clr">بدون موعد</button>' : '') + '</div>';
        var sc = box.querySelector('.msl-g'), top = sc ? sc.scrollTop : null, dsc = box.querySelector('.msl-days'), dl = dsc ? dsc.scrollLeft : null;
        box.innerHTML = h;
        var g = box.querySelector('.msl-g');
        if (g) { if (top != null && S._keep) g.scrollTop = top; else { var f = box.querySelector('.msl-t.on') || box.querySelector('.msl-t:not(.past):not(.out)'); if (f) g.scrollTop = Math.max(0, f.offsetTop - g.offsetTop - 50); } }
        var dd2 = box.querySelector('.msl-days'); if (dd2) { if (dl != null && S._keep) dd2.scrollLeft = dl; else { var od = box.querySelector('.msl-d.on'); if (od && od.scrollIntoView) od.scrollIntoView({ block: 'nearest', inline: 'center' }); } }
        S._keep = false;
      }
      box.addEventListener('click', function(e){ var b = e.target.closest('[data-a]'); if (!b || b.disabled) return; var a = b.getAttribute('data-a'), v = b.getAttribute('data-v');
        if (a === 'x') return fin(null);
        if (a === 'clr') return fin({ at: null, dur: S.dur });
        if (a === 'day') { S.y = v; S._keep = false; if (S.y === today && S.m != null && S.m < now + 15) S.m = null; return load(); }
        if (a === 'dur') { S.dur = +v; S._keep = true; return draw(); }
        if (a === 'tm') { S.m = +v; S._keep = true; return draw(); }
        if (a === 'ok') return fin({ at: at(S.y, S.m), dur: S.dur });
      });
      D.addEventListener('keydown', function k(e){ if (!ov.parentNode) { D.removeEventListener('keydown', k, true); return; } if (e.key === 'Escape') { e.preventDefault(); fin(null); } }, true);
      load();
    });
  }
  // الحقل: زر يعرض الموعد + قيمة مخفية بنفس صيغة datetime-local (عشان كود الحفظ القديم يشتغل)
  function field(el, o){
    o = o || {}; var input = typeof o.input === 'string' ? D.getElementById(o.input) : o.input;
    var S = { at: o.value ? new Date(o.value) : null, dur: o.dur || 120 };
    function iso(d){ if (!d) return ''; var r = ry(d); return r.getUTCFullYear() + '-' + ('0' + (r.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + r.getUTCDate()).slice(-2) + 'T' + ('0' + r.getUTCHours()).slice(-2) + ':' + ('0' + r.getUTCMinutes()).slice(-2); }
    function sync(){ if (input) { input.value = S.at ? S.at.toISOString() : ''; input.setAttribute('data-dur', S.dur); }
      el.innerHTML = '<button type="button" class="msl-f"' + (o.disabled ? ' disabled' : '') + '><span class="ic" aria-hidden="true">🗓</span><span class="tx' + (S.at ? '' : ' em') + '">' + (S.at ? esc(fmt(S.at, S.dur)) : 'اختر اليوم والوقت') + '</span>' + (o.disabled ? '' : '<span class="ch">' + (S.at ? 'تغيير' : 'اختيار') + '</span>') + '</button>'; }
    el.addEventListener('click', function(e){ if (!e.target.closest('.msl-f') || o.disabled) return;
      pick({ at: S.at, dur: S.dur, tech: o.tech, jobId: o.jobId }).then(function(r){ if (!r) return; S.at = r.at; S.dur = r.dur; sync(); if (o.onChange) o.onChange(S); }); });
    sync(); return { get: function(){ return { at: S.at, dur: S.dur }; }, iso: function(){ return iso(S.at); } };
  }
  W.MQ_SLOT = { pick: pick, field: field, fmt: fmt };
})(window, document);
