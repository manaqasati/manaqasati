/* مهام المشروع — بطاقة لكل مهمة: تفاصيل + ملاحظات متعددة (نص أو تسجيل صوتي) + مرفقات (صور، PDF، ملفات)
   تُستخدم في jobs.html (المؤسسة) و tech.html (الفني). داخلية — العميل ما يشوف الملاحظات ولا المرفقات. */
(function(){
  if (window.MNQ_TASK) return;
  var OPEN = {};               // المهام المفتوحة (تبقى مفتوحة بعد إعادة الرسم)
  var DRAFT = {};              // مسودة الملاحظة لكل مهمة
  var MAX = 15 * 1024 * 1024;
  var ACC = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.zip,.rar,.7z,.dwg,.dxf';
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  var UI = {};
  function toast(t){ if (UI.toast) return UI.toast(t); var e = document.getElementById('mtk-toast'); if (!e) { e = document.createElement('div'); e.id = 'mtk-toast'; e.setAttribute('role', 'status'); e.style.cssText = 'position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);background:#0f172a;color:#fff;font-weight:800;font-size:14px;padding:11px 18px;border-radius:12px;z-index:99999;max-width:90vw;text-align:center'; document.body.appendChild(e); }
    e.textContent = t; e.style.display = 'block'; clearTimeout(toast._t); toast._t = setTimeout(function(){ e.style.display = 'none'; }, 2600); }
  function ask(o){ if (UI.ask) return UI.ask(o);
    return new Promise(function(done){ var ov = document.createElement('div'); ov.className = 'mtk-ov';
      ov.innerHTML = '<div class="mtk-dg" role="alertdialog" aria-modal="true">' + (o.icon ? '<div class="ic' + (o.danger ? ' dg' : '') + '">' + o.icon + '</div>' : '') + '<b>' + esc(o.title) + '</b>' + (o.msg ? '<div class="ms">' + esc(o.msg) + '</div>' : '') + '<div class="bt"><button type="button" class="mtk-ib" data-r="0">رجوع</button><button type="button" class="mtk-ib go' + (o.danger ? ' dg' : '') + '" data-r="1">' + esc(o.ok || 'تأكيد') + '</button></div></div>';
      var fin = function(v){ ov.remove(); done(v); };
      ov.addEventListener('click', function(e){ if (e.target === ov) return fin(false); var b = e.target.closest('[data-r]'); if (b) fin(b.getAttribute('data-r') === '1'); });
      document.body.appendChild(ov); var f = ov.querySelector('[data-r="1"]'); if (f) f.focus(); }); }
  function when(d){ if (!d) return ''; d = new Date(d); var n = new Date(), s = (n - d) / 1000;
    if (s < 60) return 'الآن'; if (s < 3600) return 'قبل ' + Math.floor(s / 60) + ' د';
    var tm = d.toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === n.toDateString()) return 'اليوم ' + tm;
    var y = new Date(n); y.setDate(n.getDate() - 1); if (d.toDateString() === y.toDateString()) return 'أمس ' + tm;
    return d.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'short' }) + ' · ' + tm; }
  function size(b){ if (!b) return ''; if (b < 1024) return b + ' بايت'; if (b < 1048576) return Math.round(b / 1024) + ' ك.ب'; return (b / 1048576).toFixed(1) + ' م.ب'; }
  function mmss(s){ s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }
  function ico(f){ var n = String(f.name || '').toLowerCase(); if (f.type === 'pdf' || /\.pdf$/.test(n)) return ['PDF', '#b42318'];
    if (/\.(xlsx?|csv)$/.test(n)) return ['XLS', '#067647']; if (/\.docx?$/.test(n)) return ['DOC', '#1d4ed8']; if (/\.pptx?$/.test(n)) return ['PPT', '#c4320a'];
    if (/\.(dwg|dxf)$/.test(n)) return ['CAD', '#6941c6']; if (/\.(zip|rar|7z)$/.test(n)) return ['ZIP', '#475467']; return ['ملف', '#475467']; }

  var css = '.mtk{display:flex;flex-direction:column;gap:8px}'
   + '.mtk-i{border:1.5px solid #e2e8f0;border-radius:16px;background:#fff;overflow:hidden;transition:border-color .15s,box-shadow .15s}'
   + '.mtk-i.on{border-color:#bfd3fe;box-shadow:0 6px 22px -12px rgba(30,58,138,.35)}'
   + '.mtk-i.mtk-br{border-style:dashed;box-shadow:none}.mtk-i.mtk-br .mtk-p{border-top:0}'
   + '.mtk-h{display:flex;align-items:center;gap:10px;padding:10px 12px;min-height:54px}'
   + '.mtk-b{flex:0 0 auto;width:30px;height:30px;border-radius:50%;border:2px solid #cbd5e1;background:#fff;color:#fff;font-weight:900;font-size:15px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:inherit;padding:0;transition:background .15s,border-color .15s}'
   + '.mtk-b:disabled{cursor:default;opacity:.7}.mtk-i.dn .mtk-b{background:#16a34a;border-color:#16a34a}'
   + '.mtk-m{flex:1;min-width:0;background:none;border:0;padding:4px 0;text-align:right;font-family:inherit;color:inherit;cursor:pointer;display:flex;flex-direction:column;gap:4px}'
   + '.mtk-t{font-size:15px;font-weight:800;color:#0f172a;line-height:1.5;word-break:break-word}.mtk-i.dn .mtk-t{color:#64748b;text-decoration:line-through;text-decoration-color:rgba(100,116,139,.5)}'
   + '.mtk-c{display:flex;flex-wrap:wrap;gap:5px;align-items:center}.mtk-c span{font-size:11.5px;font-weight:800;color:#475467;background:#f1f5f9;border-radius:999px;padding:2px 8px;line-height:1.6}'
   + '.mtk-c .by{background:#ecfdf3;color:#067647}'
   + '.mtk-v{flex:0 0 auto;width:30px;height:30px;border-radius:10px;border:0;background:#f1f5f9;color:#1e3a8a;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s;font-family:inherit}'
   + '.mtk-i.on .mtk-v{transform:rotate(180deg);background:#eff4ff}'
   + '.mtk-p{border-top:1px solid #eef2f7;padding:12px;display:flex;flex-direction:column;gap:12px;background:linear-gradient(#fbfcff,#fff)}'
   + '.mtk-sl{font-size:12px;font-weight:900;color:#64748b;display:flex;align-items:center;justify-content:space-between;gap:8px}'
   + '.mtk-d{font-size:14px;font-weight:600;color:#1e293b;line-height:1.9;white-space:pre-wrap;word-break:break-word;background:#fff;border:1px solid #eef2f7;border-radius:12px;padding:10px 12px}'
   + '.mtk-d.em{color:#94a3b8;font-weight:700}'
   + '.mtk-lk{background:none;border:0;color:#1e3a8a;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;padding:4px 6px}'
   + '.mtk-fs{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px}'
   + '.mtk-fw{position:relative;min-width:0}.mtk-f{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;aspect-ratio:1;border-radius:12px;border:1px solid #e2e8f0;background:#f8fafc center/cover no-repeat;text-decoration:none;color:#0f172a;overflow:hidden;padding:6px}'
   + '.mtk-f .k{font-size:11px;font-weight:900;color:#fff;border-radius:6px;padding:3px 7px}.mtk-f .n{font-size:10.5px;font-weight:800;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mtk-f .z{font-size:10px;color:#64748b;font-weight:700}'
   + '.mtk-f.up{border-style:dashed;color:#1e3a8a;font-size:11.5px;font-weight:800;text-align:center}.mtk-f.up i{width:18px;height:18px;border:2.5px solid #bfd3fe;border-top-color:#1e3a8a;border-radius:50%;animation:mtkS .8s linear infinite}'
   + '@keyframes mtkS{to{transform:rotate(360deg)}}'
   + '.mtk-x{position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;border:0;background:rgba(15,23,42,.65);color:#fff;font-size:14px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit}'
   + '.mtk-ns{display:flex;flex-direction:column;gap:8px}'
   + '.mtk-n{background:#fff;border:1px solid #e6ebf3;border-radius:14px 14px 14px 4px;padding:9px 11px;display:flex;flex-direction:column;gap:5px;position:relative}'
   + '.mtk-n.me{background:#eff4ff;border-color:#d6e2ff;border-radius:14px 14px 4px 14px}'
   + '.mtk-nh{display:flex;align-items:center;gap:6px;font-size:11.5px;font-weight:800;color:#64748b}.mtk-nh b{color:#1e3a8a}'
   + '.mtk-nh .mtk-x{position:static;margin-inline-start:auto;width:22px;height:22px;background:transparent;color:#94a3b8;font-size:16px}'
   + '.mtk-nt{font-size:14px;font-weight:600;color:#0f172a;line-height:1.85;white-space:pre-wrap;word-break:break-word}'
   + '.mtk-au{display:flex;align-items:center;gap:9px;min-width:0}.mtk-pl{flex:0 0 auto;width:36px;height:36px;border-radius:50%;border:0;background:#1e3a8a;color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:inherit}'
   + '.mtk-tr{flex:1;height:6px;border-radius:99px;background:#dbe4f3;position:relative;overflow:hidden;cursor:pointer}.mtk-tr i{position:absolute;inset:0 auto 0 0;width:0;background:#1e3a8a;border-radius:99px}'
   + '[dir=rtl] .mtk-tr i{inset:0 0 0 auto}.mtk-du{font-size:12px;font-weight:800;color:#475467;font-variant-numeric:tabular-nums;min-width:34px;text-align:center}'
   + '.mtk-cp{display:flex;flex-direction:column;gap:8px;border:1.5px solid #e2e8f0;border-radius:14px;background:#fff;padding:8px;transition:border-color .15s}.mtk-cp:focus-within{border-color:#1e3a8a}'
   + '.mtk-cp textarea{border:0;outline:0;resize:none;font-family:inherit;font-size:14.5px;font-weight:600;line-height:1.8;min-height:44px;max-height:180px;padding:4px 6px;background:transparent;color:#0f172a;width:100%;box-sizing:border-box}'
   + '.mtk-ca{display:flex;align-items:center;gap:6px}.mtk-ib{flex:0 0 auto;height:38px;min-width:38px;padding:0 10px;border-radius:11px;border:0;background:#f1f5f9;color:#1e3a8a;font-size:13px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;font-family:inherit}'
   + '.mtk-ib.go{margin-inline-start:auto;background:#1e3a8a;color:#fff;padding:0 16px}.mtk-ib:disabled{opacity:.5;cursor:default}'
   + '.mtk-rc{display:flex;align-items:center;gap:10px;padding:6px 4px}.mtk-rc .dot{width:11px;height:11px;border-radius:50%;background:#dc2626;animation:mtkP 1s ease-in-out infinite}.mtk-rc .tm{font-weight:900;color:#b42318;font-variant-numeric:tabular-nums}.mtk-rc .lb{font-size:12.5px;font-weight:700;color:#64748b;flex:1}'
   + '@keyframes mtkP{50%{opacity:.25}}'
   + '.mtk-ft{display:flex;justify-content:flex-end}.mtk-del{background:none;border:0;color:#b42318;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;padding:6px}'
   + '.mtk-add{border:1.5px dashed #bfd3fe;border-radius:16px;padding:10px;display:flex;flex-direction:column;gap:8px;background:#fbfcff}'
   + '.mtk-add input,.mtk-add textarea{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:11px;padding:10px 12px;font-size:14.5px;font-family:inherit;font-weight:600;background:#fff;color:#0f172a}'
   + '.mtk-add textarea{min-height:76px;resize:vertical;line-height:1.8}'
   + '.mtk-em{font-size:13px;font-weight:700;color:#94a3b8;text-align:center;padding:10px}'
   + '.mtk-ed textarea{width:100%;box-sizing:border-box;border:1.5px solid #1e3a8a;border-radius:12px;padding:10px 12px;font-family:inherit;font-size:14px;font-weight:600;line-height:1.8;min-height:110px;resize:vertical}'
   + '.mtk-ed input{width:100%;box-sizing:border-box;border:1.5px solid #1e3a8a;border-radius:11px;padding:9px 12px;font-family:inherit;font-size:14.5px;font-weight:800;margin-bottom:6px}'
   + '.mtk-ov{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:99990;display:flex;align-items:flex-end;justify-content:center;padding:16px}@media(min-width:700px){.mtk-ov{align-items:center}}'
   + '.mtk-dg{background:#fff;border-radius:22px;padding:20px;width:100%;max-width:400px;display:flex;flex-direction:column;gap:10px;text-align:center;box-shadow:0 20px 60px -20px rgba(0,0,0,.4)}.mtk-dg b{font-size:17px;color:#172554}.mtk-dg .ms{font-size:13.5px;color:#475467;font-weight:600;line-height:1.8}.mtk-dg .ic{width:54px;height:54px;border-radius:18px;margin:0 auto;display:flex;align-items:center;justify-content:center;font-size:25px;background:#eff4ff}.mtk-dg .ic.dg{background:#fef3f2}.mtk-dg .bt{display:flex;gap:8px;margin-top:4px}.mtk-dg .bt .mtk-ib{flex:1;height:46px;font-size:14.5px}.mtk-ib.go.dg{background:#b42318}'
   + '@media (hover:hover){.mtk-m:hover .mtk-t{color:#1e3a8a}.mtk-i.dn .mtk-m:hover .mtk-t{color:#64748b}}';
  var st = document.createElement('style'); st.id = 'mtk-css'; st.textContent = css; (document.head || document.documentElement).appendChild(st);

  // ── تسجيل صوتي ──
  var REC = null;
  function stopTracks(r){ try { r.stream.getTracks().forEach(function(t){ t.stop(); }); } catch(e){} }
  function pickMime(){ if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    var L = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']; for (var i = 0; i < L.length; i++) if (MediaRecorder.isTypeSupported(L[i])) return L[i]; return ''; }
  function readData(blob){ return new Promise(function(ok, no){ var fr = new FileReader(); fr.onload = function(){ ok(fr.result); }; fr.onerror = no; fr.readAsDataURL(blob); }); }
  function shrink(file){ // صورة كبيرة → JPEG أخف (أقصى ضلع 1800)
    return new Promise(function(ok){
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 350 * 1024) return readData(file).then(ok, function(){ ok(null); });
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function(){ try { var M = 1800, w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, M / Math.max(w, h)); var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', .84)); } catch(e){ readData(file).then(ok, function(){ ok(null); }); } };
      im.onerror = function(){ URL.revokeObjectURL(u); readData(file).then(ok, function(){ ok(null); }); }; im.src = u; });
  }

  function mount(el, o){
    if (o.toast) UI.toast = o.toast; if (o.ask) UI.ask = o.ask; el.__mtk = o; o.el = el; draw(el);
  }
  function T(o, id){ return (o.tasks || []).filter(function(t){ return t.id === id; })[0]; }
  function draw(el){
    var o = el.__mtk, L = o.tasks || [], ro = !!o.closed;
    var h = '<div class="mtk">';
    if (!L.length && !o.brief) h += '<div class="mtk-em">' + (o.canEdit && !ro ? 'ما فيه مهام — أضف أول مهمة تحت' : 'ما فيه مهام') + '</div>';
    L.forEach(function(t){ h += item(o, t, ro); });
    if (o.canEdit && !ro && !o.brief) h += '<div class="mtk-add"><input data-k="nt" maxlength="120" placeholder="مهمة جديدة — مثال: تمديد النحاس" aria-label="مهمة جديدة"><textarea data-k="nd" maxlength="1500" placeholder="تفاصيل المهمة (اختياري): المقاسات، المواد، تعليمات للفني…" aria-label="تفاصيل المهمة" style="display:none"></textarea><div class="mtk-ca"><button type="button" class="mtk-ib" data-a="nd">＋ تفاصيل</button><button type="button" class="mtk-ib go" data-a="add">أضف المهمة</button></div></div>';
    h += '</div>';
    el.innerHTML = h;
    wire(el);
  }
  function item(o, t, ro){
    if (o.brief) return '<div class="mtk-i on mtk-br" data-id="' + esc(t.id) + '">' + panel(o, t, ro || o.readOnly) + '</div>';
    var on = !!OPEN[t.id], N = t.notes || [], F = t.files || [], v = N.filter(function(n){ return n.v; }).length;
    var chips = (t.d ? '<span>📝 تفاصيل</span>' : '') + (N.length ? '<span>💬 ' + N.length + '</span>' : '') + (v ? '<span>🎤 ' + v + '</span>' : '') + (F.length ? '<span>📎 ' + F.length + '</span>' : '') + (t.done && t.by ? '<span class="by">✓ ' + esc(t.by) + (t.at ? ' · ' + when(t.at) : '') + '</span>' : '');
    var h = '<div class="mtk-i' + (t.done ? ' dn' : '') + (on ? ' on' : '') + '" data-id="' + esc(t.id) + '"><div class="mtk-h">'
      + '<button type="button" class="mtk-b" data-a="done" aria-label="' + (t.done ? 'إلغاء الإنجاز' : 'تم إنجاز المهمة') + '"' + (ro || o.canToggle === false ? ' disabled' : '') + '>' + (t.done ? '✓' : '') + '</button>'
      + '<button type="button" class="mtk-m" data-a="open" aria-expanded="' + on + '"><span class="mtk-t">' + esc(t.t) + '</span>' + (chips ? '<span class="mtk-c">' + chips + '</span>' : '') + '</button>'
      + '<button type="button" class="mtk-v" data-a="open" aria-label="التفاصيل">⌄</button></div>';
    if (on) h += panel(o, t, ro);
    return h + '</div>';
  }
  function panel(o, t, ro){
    var me = o.me, N = t.notes || [], F = t.files || [];
    var h = '<div class="mtk-p">';
    // التفاصيل
    if (o.editing === t.id && !o.brief) h += '<div class="mtk-ed"><div class="mtk-sl">تعديل المهمة</div><input data-k="et" maxlength="120" value="' + esc(t.t) + '" aria-label="عنوان المهمة"><textarea data-k="ed" maxlength="1500" placeholder="تفاصيل المهمة" aria-label="تفاصيل المهمة">' + esc(t.d || '') + '</textarea><div class="mtk-ca" style="margin-top:6px"><button type="button" class="mtk-ib" data-a="ecancel">إلغاء</button><button type="button" class="mtk-ib go" data-a="esave">حفظ</button></div></div>';
    else if (!o.brief && (t.d || (o.canEdit && !ro))) h += '<div><div class="mtk-sl"><span>التفاصيل</span>' + (o.canEdit && !ro ? '<button type="button" class="mtk-lk" data-a="edit">✏️ تعديل</button>' : '') + '</div><div class="mtk-d' + (t.d ? '' : ' em') + '" style="margin-top:5px">' + (t.d ? esc(t.d) : 'ما فيه تفاصيل — اضغط «تعديل» وأضف تعليمات للفني') + '</div></div>';
    // المرفقات
    var up = (o._up && o._up[t.id]) || 0;
    if (F.length || up) { h += '<div><div class="mtk-sl"><span>المرفقات (' + F.length + ')</span></div><div class="mtk-fs" style="margin-top:6px">';
      F.forEach(function(f){ var mine = !ro && (o.canEdit || f.by === me);
        var x = mine ? '<button type="button" class="mtk-x" data-a="fdel" data-f="' + esc(f.id) + '" aria-label="حذف المرفق">×</button>' : '';
        if (f.type === 'img') h += '<div class="mtk-fw"><a class="mtk-f" href="' + esc(f.url) + '" target="_blank" rel="noopener" style="background-image:url(&quot;' + esc(f.url) + '&quot;)" title="' + esc(f.name) + '" aria-label="' + esc(f.name) + '"></a>' + x + '</div>';
        else { var k = ico(f); h += '<div class="mtk-fw"><a class="mtk-f" href="' + esc(f.url) + '" target="_blank" rel="noopener" title="' + esc(f.name) + '"><span class="k" style="background:' + k[1] + '">' + k[0] + '</span><span class="n" dir="auto">' + esc(k[0] === 'ملف' ? f.name : String(f.name).replace(/\.[a-z0-9]{2,5}$/i, '')) + '</span><span class="z">' + size(f.size) + '</span></a>' + x + '</div>'; }
      });
      for (var i = 0; i < up; i++) h += '<div class="mtk-f up"><i></i>جاري الرفع…</div>';
      h += '</div></div>'; }
    // الملاحظات
    h += '<div>' + (o.brief ? '' : '<div class="mtk-sl"><span>الملاحظات' + (N.length ? ' (' + N.length + ')' : '') + '</span></div>') + '<div class="mtk-ns" style="margin-top:6px">';
    if (!N.length && !(o.brief && F.length)) h += '<div class="mtk-em" style="padding:4px">' + (o.brief ? (ro ? '' : 'اكتب التعليمات أو سجّلها بصوتك، وأرفق صور للموقع أو القطعة — يشوفها الفني مع المشروع') : ro ? 'ما فيه ملاحظات' : 'اكتب ملاحظة أو سجّلها بصوتك — تنحفظ مع المهمة ويشوفها الفريق') + '</div>';
    N.forEach(function(n){ var mine = n.by === me, can = !ro && (o.canEdit || mine);
      h += '<div class="mtk-n' + (mine ? ' me' : '') + '"><div class="mtk-nh"><b>' + esc(n.by || '') + '</b><span>' + when(n.at) + '</span>' + (can ? '<button type="button" class="mtk-x" data-a="ndel" data-n="' + esc(n.id) + '" aria-label="حذف الملاحظة">×</button>' : '') + '</div>'
        + (n.v ? '<div class="mtk-au" data-au="' + esc(n.v) + '"><button type="button" class="mtk-pl" data-a="play" aria-label="تشغيل">▶</button><div class="mtk-tr" data-a="seek"><i></i></div><span class="mtk-du">' + mmss(n.dur) + '</span></div>' : '')
        + (n.t ? '<div class="mtk-nt">' + esc(n.t) + '</div>' : '') + '</div>'; });
    h += '</div></div>';
    // كتابة ملاحظة
    if (!ro) {
      var rec = REC && REC.tid === t.id && REC.el === o.el;
      h += '<div class="mtk-cp">' + (rec ? '<div class="mtk-rc"><span class="dot"></span><span class="tm" data-k="rt">' + mmss((Date.now() - REC.t0) / 1000) + '</span><span class="lb">جاري التسجيل…</span><button type="button" class="mtk-ib" data-a="rcancel">إلغاء</button><button type="button" class="mtk-ib go" data-a="rsend">إرسال ⬆</button></div>'
        : '<textarea data-k="nt2" rows="1" maxlength="1000" placeholder="' + (o.brief ? 'اكتب تعليمات للفني…' : 'اكتب ملاحظة…') + '" aria-label="' + (o.brief ? 'تعليمات للفني' : 'ملاحظة جديدة') + '">' + esc(DRAFT[t.id] || '') + '</textarea><div class="mtk-ca"><label class="mtk-ib" role="button" tabindex="0" aria-label="إرفاق صور أو ملفات">📎 مرفق<input type="file" multiple accept="' + ACC + '" data-a="file" style="display:none"></label><button type="button" class="mtk-ib" data-a="rec" aria-label="تسجيل ملاحظة صوتية">🎤 صوت</button><button type="button" class="mtk-ib go" data-a="nsend">إرسال</button></div>')
        + '</div>';
    }
    if (o.canEdit && !ro && !o.brief && o.editing !== t.id) h += '<div class="mtk-ft"><button type="button" class="mtk-del" data-a="tdel">حذف المهمة</button></div>';
    return h + '</div>';
  }

  // وضع «تعليمات للفني» (o.brief): بطاقة وحدة مفتوحة دايم — ملاحظات نصية/صوتية + مرفقات، بدون إنجاز ولا حذف
  function SETR(o, r){ if (o.brief) { if (r && r.brief) o.tasks = [r.brief]; } else if (r && r.tasks) o.tasks = r.tasks; }
  function run(o, body, msg){
    return o.act(body).then(function(r){ SETR(o, r); if (o.onChange) o.onChange(o.tasks); draw(o.el); if (msg) toast(msg); return r; })
      .catch(function(e){ if (e) toast(e.message || 'تعذّر الحفظ'); throw e; });
  }
  function grow(ta){ ta.style.height = 'auto'; ta.style.height = Math.min(180, ta.scrollHeight) + 'px'; }

  function wire(el){
    var o = el.__mtk;
    el.querySelectorAll('textarea[data-k="nt2"]').forEach(function(ta){ grow(ta); ta.addEventListener('input', function(){ grow(ta); var id = ta.closest('.mtk-i').getAttribute('data-id'); DRAFT[id] = ta.value; }); });
    el.querySelectorAll('input[type=file][data-a="file"]').forEach(function(inp){ inp.addEventListener('change', function(){ var id = inp.closest('.mtk-i').getAttribute('data-id'); files(o, id, Array.prototype.slice.call(inp.files || [])); inp.value = ''; }); });
    var nt = el.querySelector('.mtk-add input[data-k="nt"]'); if (nt) nt.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); addTask(o); } });
    if (el.__mtkW) return; el.__mtkW = 1;
    el.addEventListener('click', function(e){
      var b = e.target.closest('[data-a]'); if (!b || !el.contains(b)) return;
      var a = b.getAttribute('data-a'); if (a === 'file') return;
      var it = b.closest('.mtk-i'), id = it && it.getAttribute('data-id'), t = id && T(o, id);
      if (a === 'fdel' || a === 'ndel') { e.preventDefault(); e.stopPropagation(); }
      if (a === 'open') { OPEN[id] = !OPEN[id]; if (!OPEN[id] && o.editing === id) o.editing = null; draw(el); if (OPEN[id]) { var n = el.querySelector('.mtk-i[data-id="' + cssq(id) + '"]'); if (n && n.scrollIntoView) setTimeout(function(){ var r = n.getBoundingClientRect(); if (r.bottom > innerHeight) n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, 30); } return; }
      if (a === 'done') { b.disabled = true; run(o, { act: 'task', tid: id }).catch(function(){}); return; }
      if (a === 'nd') { var ta = el.querySelector('.mtk-add textarea'); ta.style.display = ta.style.display === 'none' ? '' : 'none'; b.textContent = ta.style.display === 'none' ? '＋ تفاصيل' : '− إخفاء التفاصيل'; if (ta.style.display !== 'none') ta.focus(); return; }
      if (a === 'add') return addTask(o);
      if (a === 'edit') { o.editing = id; draw(el); var ei = el.querySelector('.mtk-ed textarea'); if (ei) ei.focus(); return; }
      if (a === 'ecancel') { o.editing = null; draw(el); return; }
      if (a === 'esave') { var et = el.querySelector('.mtk-ed input[data-k="et"]').value, ed = el.querySelector('.mtk-ed textarea[data-k="ed"]').value; b.disabled = true;
        o.editing = null; run(o, { act: 'task_edit', tid: id, t: et, d: ed }, 'انحفظت المهمة').catch(function(){ o.editing = id; b.disabled = false; }); return; }
      if (a === 'tdel') { ask({ icon: '🗑', danger: true, title: 'حذف المهمة «' + (t ? t.t : '') + '»؟', msg: (t && ((t.notes || []).length || (t.files || []).length) ? 'تنحذف معها ملاحظاتها ومرفقاتها. ' : '') + 'ما تقدر ترجعها بعد الحذف.', ok: 'نعم، احذف' }).then(function(y){ if (y) { delete OPEN[id]; run(o, { act: 'task_del', tid: id }, 'انحذفت المهمة').catch(function(){}); } }); return; }
      if (a === 'nsend') { var tx = it.querySelector('textarea[data-k="nt2"]'); var v = (tx && tx.value || '').trim(); if (!v) { if (tx) tx.focus(); return toast('اكتب الملاحظة أو سجّلها بصوتك'); }
        b.disabled = true; run(o, { act: 'task_note', tid: id, t: v }).then(function(){ DRAFT[id] = ''; draw(el); }).catch(function(){ b.disabled = false; }); return; }
      if (a === 'ndel') { ask({ icon: '🗑', danger: true, title: 'حذف الملاحظة؟', ok: 'نعم، احذف' }).then(function(y){ if (y) run(o, { act: 'task_note_del', tid: id, nid: b.getAttribute('data-n') }).catch(function(){}); }); return; }
      if (a === 'fdel') { ask({ icon: '🗑', danger: true, title: 'حذف المرفق؟', ok: 'نعم، احذف' }).then(function(y){ if (y) run(o, { act: 'task_file_del', tid: id, fid: b.getAttribute('data-f') }).catch(function(){}); }); return; }
      if (a === 'rec') return recStart(o, id, it);
      if (a === 'rcancel') return recStop(false);
      if (a === 'rsend') return recStop(true);
      if (a === 'play' || a === 'seek') return play(b.closest('.mtk-au'), a === 'seek' ? e : null);
    });
  }
  function cssq(s){ return String(s).replace(/["\\]/g, '\\$&'); }
  function addTask(o){ var el = o.el, i = el.querySelector('.mtk-add input[data-k="nt"]'), d = el.querySelector('.mtk-add textarea[data-k="nd"]'); var t = (i.value || '').trim();
    if (t.length < 2) { i.focus(); return toast('اكتب المهمة'); }
    var bt = el.querySelector('[data-a="add"]'); bt.disabled = true;
    o.act({ act: 'task_add', t: t, d: d ? d.value : '' }).then(function(r){ if (r && r.tasks) o.tasks = r.tasks; if (o.onChange) o.onChange(o.tasks); draw(el); toast('أُضيفت المهمة'); var n = el.querySelector('.mtk-add input'); if (n) n.focus(); })
      .catch(function(e){ bt.disabled = false; if (e) toast(e.message || 'تعذّر الحفظ'); }); }

  function files(o, id, L){
    if (!L.length) return; var big = L.filter(function(f){ return f.size > MAX; }); if (big.length) toast('«' + big[0].name + '» أكبر من 15 ميجا — ما ينرفع');
    L = L.filter(function(f){ return f.size <= MAX; }).slice(0, 10); if (!L.length) return;
    o._up = o._up || {}; o._up[id] = (o._up[id] || 0) + L.length; draw(o.el);
    var i = 0, okN = 0;
    (function next(){
      if (i >= L.length) { o._up[id] = 0; draw(o.el); if (okN) toast(okN === 1 ? 'انرفع المرفق' : 'انرفعت ' + okN + ' مرفقات'); return; }
      var f = L[i++];
      shrink(f).then(function(data){
        if (!data) { toast('تعذّر قراءة «' + f.name + '»'); return null; }
        return o.act({ act: 'task_file', tid: id, data: data, name: f.name }).then(function(r){ okN++; SETR(o, r); if (o.onChange) o.onChange(o.tasks); }, function(e){ if (e) toast(e.message || 'تعذّر رفع «' + f.name + '»'); });
      }).then(function(){ o._up[id] = Math.max(0, (o._up[id] || 1) - 1); draw(o.el); next(); });
    })();
  }

  function recStart(o, id, it){
    if (REC) return toast('فيه تسجيل شغّال');
    var mime = pickMime();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) return recFallback(o, id);
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }).then(function(stream){
      var mr; try { mr = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 48000 }) : new MediaRecorder(stream); } catch(e){ stream.getTracks().forEach(function(t){ t.stop(); }); return recFallback(o, id); }
      REC = { o: o, el: o.el, tid: id, mr: mr, stream: stream, ch: [], t0: Date.now(), send: false };
      mr.ondataavailable = function(e){ if (e.data && e.data.size) REC && REC.ch.push(e.data); };
      mr.onstop = function(){ var R = REC; REC = null; clearInterval(R.iv); stopTracks(R); var dur = (Date.now() - R.t0) / 1000;
        if (!R.send) { draw(R.el); return; }
        if (dur < 1 || !R.ch.length) { draw(R.el); return toast('التسجيل قصير جداً'); }
        var blob = new Blob(R.ch, { type: (mr.mimeType || mime || 'audio/webm').split(';')[0] });
        R.o._up = R.o._up || {}; draw(R.el);
        readData(blob).then(function(d){ return run(R.o, { act: 'task_note', tid: R.tid, voice: d, dur: Math.round(dur) }, 'انحفظت الملاحظة الصوتية'); }).catch(function(){});
      };
      mr.start(1000);
      REC.iv = setInterval(function(){ var s = (Date.now() - REC.t0) / 1000, tm = REC.el.querySelector('[data-k="rt"]'); if (tm) tm.textContent = mmss(s); if (s >= 180) { toast('وصلت أقصى مدة (3 دقائق) — أرسلناها'); recStop(true); } }, 250);
      draw(o.el);
    }).catch(function(e){
      if (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) toast('اسمح باستخدام المايكروفون من إعدادات الجهاز عشان تسجّل');
      else recFallback(o, id);
    });
  }
  function recStop(send){ if (!REC) return; REC.send = !!send; try { REC.mr.state !== 'inactive' ? REC.mr.stop() : REC.mr.onstop(); } catch(e){ var R = REC; REC = null; stopTracks(R); draw(R.el); } }
  function recFallback(o, id){ // أجهزة ما تدعم التسجيل داخل الصفحة: نفتح مسجّل الجهاز
    var i = document.createElement('input'); i.type = 'file'; i.accept = 'audio/*'; i.setAttribute('capture', ''); i.style.display = 'none'; document.body.appendChild(i);
    i.onchange = function(){ var f = i.files && i.files[0]; i.remove(); if (!f) return; if (f.size > MAX) return toast('التسجيل أكبر من 15 ميجا');
      var a = new Audio(), u = URL.createObjectURL(f); a.preload = 'metadata'; a.src = u;
      var go = function(){ var d = isFinite(a.duration) ? Math.round(a.duration) : 1; URL.revokeObjectURL(u); readData(f).then(function(x){ if (!/^data:audio\//.test(x)) x = x.replace(/^data:[^;,]*/, 'data:audio/mp4'); return run(o, { act: 'task_note', tid: id, voice: x, dur: d }, 'انحفظت الملاحظة الصوتية'); }).catch(function(){}); };
      a.onloadedmetadata = go; a.onerror = go; };
    i.click();
  }
  // مشغّل صوت بسيط
  var CUR = null;
  function play(box, ev){
    if (!box) return; var src = box.getAttribute('data-au'), btn = box.querySelector('.mtk-pl'), bar = box.querySelector('.mtk-tr i'), du = box.querySelector('.mtk-du');
    if (!box.__a) { var a = new Audio(src); a.preload = 'auto'; box.__a = a; var total = du.textContent;
      a.ontimeupdate = function(){ var d = isFinite(a.duration) && a.duration ? a.duration : 0; if (d) bar.style.width = (a.currentTime / d * 100) + '%'; du.textContent = mmss(a.currentTime); };
      a.onended = function(){ btn.textContent = '▶'; bar.style.width = '0'; du.textContent = total; CUR = null; };
      a.onpause = function(){ btn.textContent = '▶'; }; a.onplay = function(){ btn.textContent = '❚❚'; };
      a.onerror = function(){ btn.textContent = '▶'; toast('تعذّر تشغيل التسجيل'); }; }
    var A = box.__a;
    if (ev) { var tr = box.querySelector('.mtk-tr').getBoundingClientRect(), rtl = getComputedStyle(box).direction === 'rtl'; var p = rtl ? (tr.right - ev.clientX) / tr.width : (ev.clientX - tr.left) / tr.width; if (isFinite(A.duration) && A.duration) A.currentTime = Math.max(0, Math.min(1, p)) * A.duration; if (A.paused) A.play().catch(function(){}); return; }
    if (CUR && CUR !== A) CUR.pause();
    if (A.paused) { CUR = A; A.play().catch(function(){ toast('تعذّر تشغيل التسجيل'); }); } else A.pause();
  }
  window.MNQ_TASK = { mount: mount, redraw: function(el, tasks){ if (el && el.__mtk) { if (tasks) el.__mtk.tasks = tasks; draw(el); } } };
})();
