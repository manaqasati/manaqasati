/* ═══ ⭐ «وثّق أعمالك» — لوحة المزوّد ═══
   المزوّد يرفع صور مشروع سواه + اسم وجوال صاحبه ← يرسل له رابط بالواتساب ← صاحب المشروع يأكّد بدخول حسابه ويقيّم
   WP.homeCard() بطاقة الرئيسية · WP.load() صفحة #proof · WP.reviewsCard() بطاقة في «تقييماتي» */
(function(){
  'use strict';
  var W = window, D = document;
  var LV = [[1, 'شارة «أعمال موثّقة ✓»'], [3, 'عروضك تطلع قبل غيرك'], [5, 'تتصدّر دليل مدينتك']];
  var MAXI = 8;
  var S = { d: null, cats: null, form: null };
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function safe(u){ try { return W._safeUrl ? W._safeUrl(u) : (/^(https?:)?\/\//.test(u) ? u : ''); } catch(e) { return ''; } }
  function api(p, o){ return W._api(p, o); }
  function toast(m, t){ try { W.showToast(m, t || 'success'); } catch(e) {} }
  function waUrl(ph, txt){ var u = 'https://wa.me/' + String(ph || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(txt || ''); try { if (W._waFix) u = W._waFix(u); } catch(e) {} return u; }
  function openWa(ph, txt){ var u = waUrl(ph, txt); try { W.open(u, '_blank'); } catch(e) { location.href = u; } }
  function ago(d){ try { return W.timeAgoP ? W.timeAgoP(d) : ''; } catch(e) { return ''; } }
  function css(){
    if (D.getElementById('wp-css')) return;
    var st = D.createElement('style'); st.id = 'wp-css';
    st.textContent = '.wp-hero{background:linear-gradient(135deg,#17254d,#1e40af);color:#fff;border-radius:20px;padding:16px;margin-bottom:12px;position:relative;overflow:hidden}'
      + '.wp-k{color:#fbbf24;font-weight:900;font-size:12.5px}.wp-t{font-size:17.5px;font-weight:900;margin:5px 0;line-height:1.5}.wp-s{opacity:.88;font-size:13px;font-weight:700;line-height:1.75}'
      + '.wp-lv{display:flex;gap:6px;margin-top:12px}.wp-lv div{flex:1;background:rgba(255,255,255,.1);border-radius:12px;padding:8px 5px;text-align:center;font-size:11px;font-weight:800;line-height:1.45}'
      + '.wp-lv b{display:block;font-size:15px}.wp-lv .on{background:#fbbf24;color:#1f2937}.wp-lv .dn{background:#22c55e;color:#fff}'
      + '.wp-b{border:0;border-radius:13px;padding:12px 14px;font-family:inherit;font-weight:900;font-size:14.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;width:100%;text-decoration:none;margin-top:12px}'
      + '.wp-y{background:#fbbf24;color:#1f2937}.wp-p{background:var(--p,#2563eb);color:#fff}.wp-o{background:var(--white,#fff);color:var(--p,#1e3a8a);border:1.5px solid var(--border,#dbe5f5)}.wp-g{background:#22c55e;color:#fff}'
      + '.wp-b:disabled{opacity:.6;cursor:default}'
      + '.wp-card{background:var(--white,#fff);border:1px solid var(--border,#e3eaf6);border-radius:18px;padding:14px;margin-bottom:12px}'
      + '.wp-h{font-weight:900;font-size:15.5px;display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;color:var(--text)}'
      + '.wp-it{display:flex;gap:10px;align-items:center;padding:10px 0;border-top:1px solid var(--border,#eef2f8)}.wp-it:first-of-type{border-top:0}'
      + '.wp-th{width:60px;height:60px;border-radius:13px;flex:none;object-fit:cover;background:var(--bg,#f1f5f9)}'
      + '.wp-n{font-weight:900;font-size:14px;color:var(--text)}.wp-m{font-size:12px;color:var(--muted,#64748b);font-weight:700;margin-top:2px;line-height:1.6}'
      + '.wp-pl{display:inline-block;border-radius:999px;padding:3px 9px;font-size:11px;font-weight:900;white-space:nowrap}.wp-ok{background:#dcfce7;color:#15803d}.wp-wt{background:#fef3c7;color:#92400e}.wp-rm{background:#fee2e2;color:#b91c1c}'
      + '[data-theme="dark"] .wp-ok{background:rgba(34,197,94,.18);color:#86efac}[data-theme="dark"] .wp-wt{background:rgba(245,158,11,.18);color:#fcd34d}'
      + '.wp-sm{border:1px solid var(--border,#dbe5f5);background:var(--white,#fff);color:var(--text);border-radius:10px;padding:7px 10px;font-family:inherit;font-weight:800;font-size:12px;cursor:pointer;white-space:nowrap}'
      + '.wp-f label{display:block;font-size:13px;font-weight:800;color:var(--text2,#334155);margin:11px 0 5px}'
      + '.wp-in{width:100%;border:1.5px solid var(--border,#dbe3ef);border-radius:12px;padding:11px;font-family:inherit;font-size:15px;background:var(--white,#fff);color:var(--text);box-sizing:border-box}'
      + '.wp-ups{display:flex;gap:8px;flex-wrap:wrap}.wp-up{position:relative;width:74px;height:74px}.wp-up img{width:74px;height:74px;border-radius:13px;object-fit:cover}'
      + '.wp-up button{position:absolute;top:-6px;left:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#0f172a;color:#fff;font-size:13px;line-height:22px;cursor:pointer;padding:0}'
      + '.wp-add{width:74px;height:74px;border:2px dashed #93c5fd;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#1d4ed8;font-weight:900;font-size:11.5px;cursor:pointer;background:transparent;font-family:inherit}'
      + '.wp-row{display:flex;gap:8px}.wp-row>div{flex:1;min-width:0}'
      + '.wp-er{display:none;color:#b91c1c;font-weight:800;font-size:13px;margin-top:9px}'
      + '.wp-note{background:var(--p-light,#eff6ff);color:var(--p,#1e40af);border-radius:13px;padding:10px 12px;font-size:12.5px;font-weight:800;line-height:1.7;margin-bottom:12px}'
      + '.wp-mini{display:flex;gap:10px;align-items:center}.wp-mini .ic{width:40px;height:40px;border-radius:12px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:19px;flex:none}';
    D.head.appendChild(st);
  }
  function fetchD(force){
    if (S.d && !force) return Promise.resolve(S.d);
    return api('/api/provider/proofs').then(function(d){ if (d && Array.isArray(d.items)) S.d = d; return S.d; });
  }
  function levels(n){
    return '<div class="wp-lv">' + LV.map(function(l){ var c = n >= l[0] ? 'dn' : (n < l[0] && (LV.filter(function(z){ return n >= z[0]; }).length === LV.indexOf(l)) ? 'on' : ''); return '<div class="' + c + '"><b>' + (n >= l[0] ? '✓' : l[0]) + '</b>' + l[1] + '</div>'; }).join('') + '</div>';
  }
  function nextTxt(n){ for (var i = 0; i < LV.length; i++) if (n < LV[i][0]) return 'باقي ' + (LV[i][0] - n) + ' — ' + LV[i][1]; return 'وصلت لأعلى مستوى 🏆'; }

  // ─── بطاقة الرئيسية ───
  function homeCard(){
    css(); var pg = D.getElementById('page-home'); if (!pg) return;
    var k = pg.querySelector('.pa-kpis'); if (!k) return;
    var box = D.getElementById('wp-home'); if (!box) { box = D.createElement('div'); box.id = 'wp-home'; k.parentNode.insertBefore(box, k.nextSibling); }
    fetchD(true).then(function(d){
      if (!d) { box.innerHTML = ''; return; }
      var n = d.verified || 0, wt = d.items.filter(function(x){ return x.status === 'pending'; }).length;
      if (n >= 5) { box.innerHTML = ''; return; }
      box.innerHTML = '<div class="wp-hero"><div class="wp-k">⭐ ارفع فرص قبول عروضك</div><div class="wp-t">' + (n ? 'عندك ' + n + ' ' + (n === 1 ? 'مشروع موثّق' : 'مشاريع موثّقة') + ' — كمّل' : 'وثّق أعمالك وخلّ عملاءك يقيّمونك') + '</div>'
        + '<div class="wp-s">' + (wt ? '⏳ ' + wt + ' بانتظار تقييم صاحبها · ' : '') + 'ارفع صور مشروع سويته وأرسل الرابط لصاحبه يقيّمك — التقييم يظهر في صفحتك وجنب كل عرض تقدّمه.</div>'
        + levels(n) + '<button type="button" class="wp-b wp-y" onclick="WP.go(1)">＋ وثّق مشروع</button></div>';
    }).catch(function(){ box.innerHTML = ''; });
  }
  // ─── بطاقة «تقييماتي» ───
  function reviewsCard(){
    css(); var pg = D.getElementById('page-reviews'); if (!pg || D.getElementById('wp-rv')) return;
    var c = D.createElement('div'); c.id = 'wp-rv';
    c.innerHTML = '<div class="wp-card"><div class="wp-mini"><span class="ic">⭐</span><div style="flex:1;min-width:0"><div class="wp-n">تبي تقييمات أكثر؟</div><div class="wp-m">وثّق مشروع سويته وأرسل الرابط لصاحبه — يقيّمك بدقيقة</div></div><button type="button" class="wp-sm" onclick="WP.go(1)">وثّق مشروع</button></div></div>';
    var hd = pg.querySelector('.pghd'); if (hd && hd.nextSibling) pg.insertBefore(c, hd.nextSibling); else pg.insertBefore(c, pg.firstChild);
  }
  // ─── الصفحة ───
  function item(x){
    var im = safe((x.images || [])[0]);
    var st = x.status === 'reviewed' ? '<span class="wp-pl wp-ok">✓ موثّق</span>' : x.status === 'removed' ? '<span class="wp-pl wp-rm">انحذف</span>' : '<span class="wp-pl wp-wt">بانتظار تقييمه</span>';
    var m = x.status === 'reviewed' ? '<span style="color:#f59e0b">' + '★★★★★'.slice(0, Math.round(x.rating || 0)) + '</span> · ' + esc(x.client_name || '') + ' قيّمك ' + (x.rating || '') + '/5'
      : x.status === 'pending' ? 'أرسلت الرابط لـ«' + esc(x.client_name || '') + '» ' + esc(ago(x.reminded_at || x.created_at)) : 'انحذف بعد المراجعة';
    var act = x.status === 'pending' ? '<div style="display:flex;gap:6px;margin-top:7px"><button type="button" class="wp-sm" onclick="WP.remind(' + x.id + ')">📲 ذكّره</button><button type="button" class="wp-sm" onclick="WP.copy(' + x.id + ')">🔗 انسخ الرابط</button><button type="button" class="wp-sm" onclick="WP.del(' + x.id + ')" aria-label="حذف">🗑</button></div>' : '';
    return '<div class="wp-it">' + (im ? '<img class="wp-th" src="' + esc(im) + '" alt="" loading="lazy">' : '<div class="wp-th"></div>') + '<div style="flex:1;min-width:0"><div class="wp-n">' + esc(x.title) + '</div><div class="wp-m">' + m + '</div>' + act + '</div>' + st + '</div>';
  }
  function page(){
    var pg = D.getElementById('page-proof'); if (!pg) return;
    var d = S.d || { items: [], verified: 0, month_left: 5 }, n = d.verified || 0;
    var h = '<div class="wp-hero"><div class="wp-k">⭐ وثّق أعمالك</div><div class="wp-t">مشاريعك اللي سويتها — يأكّدها أصحابها بتقييم</div>'
      + '<div class="wp-s">العميل لما يشوف شغل مشابه لمشروعه وأكّده صاحبه، يثق فيك أكثر ويختار عرضك. ' + esc(nextTxt(n)) + '</div>' + levels(n)
      + (d.month_left > 0 ? '<button type="button" class="wp-b wp-y" onclick="WP.form()">＋ وثّق مشروع</button>' : '<div class="wp-s" style="margin-top:10px">وصلت حد هالشهر (' + d.month_max + ' مشاريع) — تقدر تضيف بعدين</div>') + '</div>';
    h += '<div class="wp-card"><div class="wp-h">أعمالي الموثّقة' + (d.items.length ? '<span class="wp-pl wp-ok">' + n + ' موثّق</span>' : '') + '</div>';
    if (d.items.length) h += d.items.map(item).join('');
    else h += '<div class="wp-m" style="padding:14px 0;text-align:center">ما وثّقت أي مشروع للحين — ابدأ بمشروع واحد سويته وصاحبه راضي عنه</div>';
    h += '</div><div class="wp-note">💡 اختار مشاريع أصحابها راضين — التقييم يظهر في صفحتك وما ينحذف بعد ما ينكتب.</div>';
    pg.innerHTML = h;
  }
  function load(){
    css(); var pg = D.getElementById('page-proof'); if (!pg) return;
    if (!S.d) pg.innerHTML = '<div class="loading">جاري التحميل...</div>';
    fetchD(true).then(function(d){ if (!d) throw 0; if (S.form) form(); else page(); })
      .catch(function(){ pg.innerHTML = '<div class="wp-card" style="text-align:center"><div class="wp-n">تعذّر التحميل</div><button type="button" class="wp-b wp-p" onclick="WP.load()">حاول مرة ثانية</button></div>'; });
  }
  function go(openForm){ S.form = openForm ? (S.form || { imgs: [] }) : null; if (W.gotoPage) W.gotoPage('proof'); else load(); }
  // ─── النموذج ───
  function cats(){
    if (S.cats) return Promise.resolve(S.cats);
    return fetch(((typeof W.API === 'string' && W.API) || '') + '/api/categories').then(function(r){ return r.json(); }).then(function(d){ S.cats = (d && d.categories) || []; return S.cats; }).catch(function(){ return []; });
  }
  function form(){
    css(); var pg = D.getElementById('page-proof'); if (!pg) return;
    var F = S.form || (S.form = { imgs: [] });
    Promise.all([cats(), F.me ? Promise.resolve(F.me) : api('/api/provider/profile').catch(function(){ return {}; })]).then(function(r){
      var cs = r[0] || [], me = F.me = r[1] || {};
      var sp = (me.specialties || [])[0] || '', city = me.city || '';
      var CI = W.CITIES || [];
      pg.innerHTML = '<div class="pghd"><div class="pg-t">وثّق مشروع سويته</div><div class="pg-s">دقيقة وحدة — وصاحب المشروع يأكّد بتقييمه</div></div>'
        + '<div class="wp-card wp-f">'
        + '<label>صور المشروع <span style="color:var(--muted);font-weight:700">(3 صور أو أكثر — قبل وبعد أفضل)</span></label><div class="wp-ups" id="wp-ups"></div>'
        + '<input type="file" id="wp-file" accept="image/*" multiple style="display:none">'
        + '<label for="wp-title">وش سويت؟</label><input class="wp-in" id="wp-title" maxlength="120" placeholder="مثلاً: واجهة فيلا حجر رياض" value="' + esc(F.title || '') + '">'
        + '<div class="wp-row"><div><label for="wp-cat">التخصص</label><select class="wp-in" id="wp-cat">' + cs.filter(function(c){ return c !== 'أخرى'; }).map(function(c){ return '<option' + ((F.cat || sp) === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>'
        + '<div style="flex:.75"><label for="wp-city">المدينة</label><select class="wp-in" id="wp-city">' + CI.map(function(c){ return '<option' + ((F.city || city) === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div></div>'
        + '<label>صاحب المشروع</label><div class="wp-row"><div><input class="wp-in" id="wp-name" maxlength="60" placeholder="الاسم" value="' + esc(F.name || '') + '" aria-label="اسم صاحب المشروع"></div>'
        + '<div style="flex:1.15"><input class="wp-in" id="wp-ph" type="tel" inputmode="tel" dir="ltr" style="text-align:right" placeholder="05xxxxxxxx" value="' + esc(F.ph || '') + '" aria-label="جوال صاحب المشروع"></div></div>'
        + '<div class="wp-m" style="margin-top:6px">رقمه ما يظهر لأحد — بس عشان نتأكد إن التقييم منه</div>'
        + '<div class="wp-er" id="wp-er" role="alert"></div>'
        + '<button type="button" class="wp-b wp-g" id="wp-send">💬 أرسل له رابط التقييم بالواتساب</button>'
        + '<button type="button" class="wp-b wp-o" onclick="WP.go(0)">إلغاء</button></div>';
      paintUps();
      var fi = D.getElementById('wp-file');
      fi.onchange = function(){ addFiles(fi); };
      D.getElementById('wp-send').onclick = send;
    });
  }
  function paintUps(){
    var F = S.form, u = D.getElementById('wp-ups'); if (!u) return;
    u.innerHTML = F.imgs.map(function(s, i){ return '<div class="wp-up"><img src="' + esc(s) + '" alt=""><button type="button" onclick="WP.rmImg(' + i + ')" aria-label="شيل الصورة">×</button></div>'; }).join('')
      + (F.imgs.length < MAXI ? '<button type="button" class="wp-add" onclick="document.getElementById(\'wp-file\').click()"' + (F.busy ? ' disabled' : '') + '><span style="font-size:22px">' + (F.busy ? '⏳' : '＋') + '</span>' + (F.busy ? 'لحظة' : 'صورة') + '</button>' : '');
  }
  function shrink(f){ return new Promise(function(res){ var fr = new FileReader(); fr.onload = function(){ var im = new Image(); im.onload = function(){ var m = 1400, w = im.width, h = im.height, k = Math.min(1, m / Math.max(w, h)); var c = D.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .82)); }; im.onerror = function(){ res(null); }; im.src = fr.result; }; fr.onerror = function(){ res(null); }; fr.readAsDataURL(f); }); }
  function keep(){ var F = S.form; if (!F) return; var g = function(id){ var e = D.getElementById(id); return e ? e.value : ''; }; F.title = g('wp-title'); F.cat = g('wp-cat'); F.city = g('wp-city'); F.name = g('wp-name'); F.ph = g('wp-ph'); }
  function addFiles(inp){
    var F = S.form, fs = [].slice.call(inp.files || []).filter(function(f){ return /^image\//.test(f.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(f.name); }); inp.value = '';
    var room = MAXI - F.imgs.length; if (room <= 0) return; F.busy = true; paintUps();
    Promise.all(fs.slice(0, room).map(shrink)).then(function(L){ L.forEach(function(d){ if (d) F.imgs.push(d); }); F.busy = false; paintUps(); });
  }
  function err(m){ var e = D.getElementById('wp-er'); if (e) { e.textContent = m; e.style.display = 'block'; } }
  function send(){
    keep(); var F = S.form;
    if (F.busy) return err('لحظة — الصور تتجهز');
    if (!F.imgs.length) return err('ارفع صورة وحدة على الأقل من المشروع');
    if (String(F.title || '').trim().length < 4) return err('اكتب وش سويت (مثلاً: واجهة فيلا حجر)');
    if (!String(F.name || '').trim()) return err('اكتب اسم صاحب المشروع');
    var ph = String(F.ph || '').replace(/[٠-٩]/g, function(c){ return '٠١٢٣٤٥٦٧٨٩'.indexOf(c); }).replace(/\D/g, '').slice(-9);
    if (!/^5\d{8}$/.test(ph)) return err('اكتب جوال صاحب المشروع صح (05xxxxxxxx)');
    var b = D.getElementById('wp-send'); b.disabled = true; b.textContent = 'جاري الحفظ…';
    // نافذة الواتساب لازم تنفتح من نفس الضغطة (الجوال يمنع النوافذ بعد انتظار) — نحجزها ونعبّيها بعد الحفظ
    var pop = null; try { if (!W.ReactNativeWebView && !/iPhone|iPad|Android/i.test(navigator.userAgent)) pop = W.open('', '_blank'); } catch(e) { pop = null; }
    api('/api/provider/proofs', { method: 'POST', body: JSON.stringify({ title: F.title, category: F.cat, city: F.city, client_name: F.name, client_phone: F.ph, images: F.imgs }) })
      .then(function(r){
        if (!r || !r.ok) { try { pop && pop.close(); } catch(e) {} b.disabled = false; b.textContent = '💬 أرسل له رابط التقييم بالواتساب'; return err((r && r.message) || 'تعذّر الحفظ — حاول مرة ثانية'); }
        S.form = null; S.last = r;
        var u = waUrl(r.wa_phone, r.wa_text);
        if (pop) { try { pop.location.href = u; } catch(e) {} }
        sent(r, !pop);
      })
      .catch(function(e){ try { pop && pop.close(); } catch(_) {} b.disabled = false; b.textContent = '💬 أرسل له رابط التقييم بالواتساب'; err((e && e.message) || 'تعذّر الحفظ — حاول مرة ثانية'); });
  }
  function sent(r, needTap){
    var pg = D.getElementById('page-proof'); if (!pg) return;
    pg.innerHTML = '<div class="wp-card" style="text-align:center;padding:22px 16px"><div style="font-size:44px">✅</div><div class="wp-n" style="font-size:18px;margin-top:6px">انحفظ المشروع</div>'
      + '<div class="wp-m" style="font-size:13.5px">' + (needTap ? 'باقي خطوة: أرسل الرابط لصاحب المشروع' : 'أرسلنا لك الرسالة جاهزة بالواتساب — بس اضغط إرسال') + '</div>'
      + '<a class="wp-b wp-g" href="' + esc(waUrl(r.wa_phone, r.wa_text)) + '" target="_blank" rel="noopener" id="wp-wa">💬 أرسل الرابط بالواتساب</a>'
      + '<button type="button" class="wp-b wp-o" id="wp-cp">🔗 انسخ الرابط</button>'
      + '<button type="button" class="wp-b wp-o" id="wp-done" onclick="WP.go(0)">تم</button>'
      + '<div class="wp-m" style="margin-top:10px">أول ما يقيّمك يوصلك إشعار، والمشروع يظهر في صفحتك</div></div>';
    D.getElementById('wp-cp').onclick = function(){ copyTxt(r.url, this); };
    fetchD(true);
  }
  function copyTxt(t, el){
    var ok = function(){ if (el) el.textContent = '✓ انتسخ'; toast('انتسخ الرابط'); };
    try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(ok, function(){ fb(); }); return; } } catch(e) {}
    fb();
    function fb(){ try { var ta = D.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; D.body.appendChild(ta); ta.select(); D.execCommand('copy'); ta.remove(); ok(); } catch(e) { W.prompt('انسخ الرابط:', t); } }
  }
  function find(id){ return ((S.d && S.d.items) || []).filter(function(x){ return x.id === id; })[0]; }
  W.WP = {
    homeCard: homeCard, reviewsCard: reviewsCard, load: load, go: go, form: function(){ S.form = S.form || { imgs: [] }; form(); },
    rmImg: function(i){ keep(); S.form.imgs.splice(i, 1); paintUps(); },
    remind: function(id){
      api('/api/provider/proofs/' + id + '/remind', { method: 'POST', body: '{}' }).then(function(r){ if (r && r.ok) { openWa(r.wa_phone, r.wa_text); fetchD(true).then(page); } else toast((r && r.message) || 'تعذّر', 'error'); }).catch(function(){ toast('تعذّر', 'error'); });
    },
    copy: function(id){ var x = find(id); if (x) copyTxt(x.url); },
    del: function(id){
      if (!W.confirm('تحذف هالمشروع؟ الرابط اللي أرسلته يوقف')) return;
      api('/api/provider/proofs/' + id, { method: 'DELETE' }).then(function(r){ if (r && r.ok) { toast('انحذف'); fetchD(true).then(page); } else toast((r && r.message) || 'تعذّر', 'error'); }).catch(function(){ toast('تعذّر', 'error'); });
    }
  };
})();
