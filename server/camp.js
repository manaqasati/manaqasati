/* حملة لعملائك — محرّر حملات الإيميل: المستلمين (فئات الدفتر أو قائمة خاصة بلصق/Excel) + قوالب + صورة الإعلان + زر الإجراء + معاينة حيّة + إيميل تجربة */
(function(){
  if (window.MNQ_CAMP) return;
  var S = {}, X = {};   // S: حالة المحرّر · X: أدوات الصفحة (api, toast, back, el)
  var AUD = [['all', 'كل العملاء'], ['repeat', 'المتكررين'], ['idle', 'ما تعاملوا من 6 شهور'], ['plans', 'عندهم خطة صيانة']];
  var TPL = [
    ['🏷 عرض وخصم', 'عرض خاص لعملائنا — خصم 15%', 'يسعدنا نقدّم لك خصم 15% على خدماتنا حتى نهاية الشهر، تقديراً لثقتك فينا.\n\nالعرض لفترة محدودة — احجز موعدك من الحين.'],
    ['☀️ موسم الصيف', 'الصيف قرّب — جهّز مكيفاتك قبل الحر', 'قبل ما يشتد الحر، ننصحك بتنظيف المكيفات وفحصها عشان تبرّد أسرع وتوفّر في الكهرباء.\n\nمواعيدنا هالأسبوع متاحة — احجز موعدك قبل الزحمة.'],
    ['🔧 تذكير صيانة', 'حان وقت الصيانة الدورية', 'مرّ وقت على آخر صيانة عندك، والصيانة الدورية تحافظ على أجهزتك وتمنع الأعطال المفاجئة.\n\nحدّد الوقت اللي يناسبك ونوصلك.'],
    ['✨ خدمة جديدة', 'خدمة جديدة صارت متاحة لك', 'يسعدنا نعلن عن خدمة جديدة: [اكتب اسم الخدمة].\n\n[اكتب سطرين عن الخدمة وفايدتها للعميل]'],
    ['🌙 تهنئة', 'كل عام وأنتم بخير', 'بمناسبة [المناسبة]، نهنّئك ونتمنى لك ولأهلك أياماً سعيدة.\n\nشكراً لثقتك فينا، ودايم نتشرف بخدمتك.']
  ];
  var CTA = [['page', 'صفحة منشأتك'], ['book', 'احجز موعد'], ['wa', 'واتساب'], ['url', 'رابط خاص'], ['none', 'بدون زر']];
  var RX = /[A-Za-z0-9._%+'-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  function esc(v){ return String(v == null ? '' : v).replace(/[&<>"']/g, function(c){ return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]; }); }
  function n2(n){ return Number(n || 0).toLocaleString('en-US'); }
  function dd(x){ if (!x) return ''; x = new Date(x); return x.getDate() + '/' + (x.getMonth() + 1) + '/' + x.getFullYear(); }
  var css = '.cp{display:flex;flex-direction:column;gap:14px}.cp-hd{display:flex;flex-direction:column;gap:4px}.cp-hd .t{font-size:22px;font-weight:900;color:#172554}.cp-hd .s{font-size:13.5px;font-weight:600;color:#64748b;line-height:1.8}'
   + '.cp-c{background:#fff;border:1px solid #e6ebf3;border-radius:20px;padding:16px;display:flex;flex-direction:column;gap:12px}'
   + '.cp-st{display:flex;align-items:center;gap:10px}.cp-st i{flex:0 0 auto;width:28px;height:28px;border-radius:9px;background:#172554;color:#fbbf24;font-style:normal;font-weight:900;font-size:14px;display:flex;align-items:center;justify-content:center}.cp-st b{font-size:16px;color:#172554;font-weight:900}.cp-st span{margin-inline-start:auto;font-size:12.5px;color:#64748b;font-weight:700}'
   + '.cp-ch{display:flex;flex-wrap:wrap;gap:7px}.cp-ch button{border:1.5px solid #e2e8f0;background:#fff;color:#334155;border-radius:999px;padding:8px 13px;font-weight:800;font-size:13px;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:6px;min-height:38px}'
   + '.cp-ch button small{font-size:11.5px;color:#64748b;font-weight:800;background:#f1f5f9;border-radius:99px;padding:1px 7px}.cp-ch button.on{background:#172554;border-color:#172554;color:#fff}.cp-ch button.on small{background:rgba(255,255,255,.18);color:#fff}'
   + '.cp-ch button.add{border-style:dashed;border-color:#93b4fd;color:#1e3a8a;background:#f8faff}'
   + '.cp-gi{display:flex;align-items:center;gap:8px;flex-wrap:wrap;background:#f8faff;border:1px solid #dbe4f3;border-radius:14px;padding:10px 12px;font-size:13px;font-weight:700;color:#334155}.cp-gi b{color:#172554}.cp-gi .sp{flex:1}'
   + '.cp-lk{background:none;border:0;color:#1e3a8a;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;padding:4px 6px}.cp-lk.r{color:#b42318}'
   + '.cp label{display:block;font-size:13px;font-weight:800;color:#334155;margin-bottom:6px}.cp .cnt{float:left;font-size:11.5px;color:#94a3b8;font-weight:700}'
   + '.cp input[type=text],.cp input[type=email],.cp input[type=url],.cp textarea{width:100%;box-sizing:border-box;border:1.5px solid #e2e8f0;border-radius:12px;padding:11px 13px;font-size:15px;font-family:inherit;font-weight:600;background:#fff;color:#0f172a}'
   + '.cp input:focus,.cp textarea:focus{outline:0;border-color:#1e3a8a;box-shadow:0 0 0 3px rgba(30,58,138,.1)}.cp textarea{min-height:150px;line-height:1.9;resize:vertical}'
   + '.cp-tb{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}.cp-tb button{border:0;background:#eff4ff;color:#1e3a8a;border-radius:9px;padding:6px 10px;font-size:12.5px;font-weight:800;cursor:pointer;font-family:inherit}'
   + '.cp-im{border:2px dashed #cbd5e1;border-radius:16px;padding:18px;text-align:center;cursor:pointer;color:#475467;font-weight:800;font-size:14px;display:flex;flex-direction:column;align-items:center;gap:4px;background:#fbfcfe}.cp-im small{font-weight:600;color:#94a3b8;font-size:12px}'
   + '.cp-ip{position:relative;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;background:#f8fafc}.cp-ip img{display:block;width:100%;max-height:340px;object-fit:contain}.cp-ip .b{position:absolute;top:8px;left:8px;display:flex;gap:6px}.cp-ip .b button{border:0;border-radius:10px;background:rgba(15,23,42,.72);color:#fff;font-weight:800;font-size:12.5px;padding:7px 11px;cursor:pointer;font-family:inherit}'
   + '.cp-ip .up{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.75);font-weight:800;color:#1e3a8a}'
   + '.cp-pv{border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;background:#eef2f7}.cp-pvh{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#fff;border-bottom:1px solid #eef2f7;font-size:12.5px;font-weight:700;color:#475467}.cp-pvh b{color:#0f172a}.cp-pvh .sp{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
   + '.cp-dv{display:flex;background:#f1f5f9;border-radius:9px;padding:2px}.cp-dv button{border:0;background:none;border-radius:7px;padding:4px 9px;font-size:13px;cursor:pointer}.cp-dv button.on{background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.1)}'
   + '.cp-pv iframe{display:block;width:100%;height:520px;border:0;background:#eef2f7;margin:0 auto;transition:width .2s}.cp-pv.mob iframe{width:min(375px,100%)}'
   + '.cp-ts{display:flex;gap:8px}.cp-ts input{flex:1;min-width:0}.cp-bt{border:0;border-radius:12px;padding:0 16px;min-height:46px;font-weight:900;font-size:14.5px;cursor:pointer;font-family:inherit;background:#eff4ff;color:#1e3a8a;white-space:nowrap}'
   + '.cp-bt.go{background:linear-gradient(135deg,#1e3a8a,#172554);color:#fff;width:100%;min-height:54px;font-size:16px;box-shadow:0 10px 24px -12px rgba(23,37,84,.6)}.cp-bt:disabled{opacity:.5;cursor:default}'
   + '.cp-q{display:flex;align-items:center;gap:12px}.cp-q .bar{flex:1;height:8px;background:#eef3ff;border-radius:99px;overflow:hidden}.cp-q .bar i{display:block;height:8px;border-radius:99px}'
   + '.cp-h{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid #f1f5f9}.cp-h .th{flex:0 0 auto;width:44px;height:44px;border-radius:10px;background:#eff4ff center/cover;display:flex;align-items:center;justify-content:center;font-size:18px}.cp-h .tx{flex:1;min-width:0}.cp-h .tx b{display:block;font-size:14px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cp-h .tx span{font-size:12px;color:#64748b;font-weight:700}'
   + '.cp-nt{font-size:12.5px;color:#64748b;font-weight:600;line-height:1.8}.cp-ok{display:flex;gap:10px;align-items:flex-start;background:#fffbeb;border:1px solid #fde68a;border-radius:14px;padding:12px;font-size:13px;font-weight:700;color:#713f12;line-height:1.8;cursor:pointer}.cp-ok input{width:20px;height:20px;margin-top:3px;flex:0 0 auto;accent-color:#172554}'
   + '.cp-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.cp-sum div{background:#f8fafc;border-radius:12px;padding:10px;text-align:center}.cp-sum b{display:block;font-size:20px;color:#172554}.cp-sum span{font-size:11.5px;color:#64748b;font-weight:800}.cp-sum .g b{color:#067647}.cp-sum .r b{color:#b42318}'
   + '.cp-tbl{width:100%;border-collapse:collapse;font-size:12.5px}.cp-tbl td{padding:7px 6px;border-top:1px solid #f1f5f9;font-weight:700;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px}.cp-tbl td:last-child{direction:ltr;text-align:left;color:#1e3a8a}'
   + '.cp-tab{display:flex;background:#f1f5f9;border-radius:12px;padding:3px}.cp-tab button{flex:1;border:0;background:none;border-radius:10px;padding:9px;font-weight:800;font-size:13.5px;color:#475467;cursor:pointer;font-family:inherit}.cp-tab button.on{background:#fff;color:#172554;box-shadow:0 1px 4px rgba(0,0,0,.08)}'
   + '.cp-drop{border:2px dashed #93b4fd;border-radius:16px;padding:22px 14px;text-align:center;background:#f8faff;color:#1e3a8a;font-weight:800;cursor:pointer;display:flex;flex-direction:column;gap:4px;align-items:center}.cp-drop small{color:#64748b;font-weight:600}'
   + '@media(min-width:900px){.cp-g{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:14px;align-items:start}.cp-g .cp-sd{position:sticky;top:84px}}.cp-g>div{display:flex;flex-direction:column;gap:14px;min-width:0}';
  var st = document.createElement('style'); st.textContent = css; (document.head || document.documentElement).appendChild(st);

  function toast(t){ X.toast ? X.toast(t) : alert(t); }
  function api(p, o){ return X.api(p, o); }
  function post(p, b){ return api(p, { method: 'POST', body: JSON.stringify(b) }); }
  function sheet(inner){ var o = document.createElement('div'); o.className = 'sheet-ov'; o.onclick = function(e){ if (e.target === o) o.remove(); }; o.innerHTML = '<div class="sheet f cp" style="gap:12px">' + inner + '</div>'; document.body.appendChild(o); return o; }
  function ask(t, msg, ok){ return new Promise(function(done){ var o = sheet('<b style="font-size:17px;color:#172554;text-align:center">' + t + '</b>' + (msg ? '<div class="cp-nt" style="text-align:center;font-size:13.5px">' + msg + '</div>' : '') + '<div style="display:flex;gap:8px"><button class="cp-bt" style="flex:1" data-r="0">رجوع</button><button class="cp-bt go" style="flex:2;width:auto" data-r="1">' + (ok || 'تأكيد') + '</button></div>');
    o.addEventListener('click', function(e){ var b = e.target.closest('[data-r]'); if (b) { o.remove(); done(b.getAttribute('data-r') === '1'); } else if (e.target === o) done(false); }); }); }

  function open(el, tools){ X = tools; X.el = el; load(); }
  function load(keep){ return api('/api/campaigns').then(function(r){ S.r = r; if (!keep) { S.aud = S.aud || 'all'; S.cta = S.cta || (r.book ? 'book' : 'page'); S.to = S.to || r.me_email || ''; }
      if (S.aud === 'grp' && !(r.groups || []).some(function(g){ return g.name === S.grp; })) S.aud = 'all';
      draw(); }).catch(function(e){ if (e) toast(e.message); }); }
  function cnt(){ var r = S.r; if (S.aud === 'grp') { var g = (r.groups || []).filter(function(x){ return x.name === S.grp; })[0]; return g ? g.n : 0; } return r.counts[S.aud] || 0; }
  function draw(){
    var r = S.r, left = Math.max(0, r.limit - r.used), pct = r.limit ? Math.min(100, Math.round(r.used / r.limit * 100)) : 100, n = cnt(), go = Math.min(n, left);
    var h = '<div class="cp"><div class="row" style="gap:8px"><button class="btn sec" style="padding:7px 11px" data-a="back">‹ دفتر العملاء</button></div>'
      + '<div class="cp-hd"><div class="t">حملة لعملائك</div><div class="s">رسالة بالإيميل باسم منشأتك — اختر المستلمين، اكتب رسالتك وأضف صورة الإعلان، وشوف المعاينة قبل الإرسال.</div></div>';
    h += '<div class="cp-c" style="padding:13px 16px"><div class="cp-q"><b style="color:#172554;font-size:14px">رصيد الشهر</b><div class="bar"><i style="width:' + pct + '%;background:' + (left ? '#1e3a8a' : '#b42318') + '"></i></div><span class="mu" style="font-size:12.5px;font-weight:800">' + n2(r.used) + ' / ' + n2(r.limit) + '</span></div>' + (r.addon && left < 100 ? '<div class="cp-nt">تحتاج أكثر؟ <a href="/plan.html" style="color:#1e3a8a;font-weight:800">إضافة «500 إيميل» بـ ' + r.addon + ' ر.س شهرياً</a></div>' : '') + '</div>';
    h += '<div class="cp-g"><div>';
    // ١ المستلمين
    h += '<div class="cp-c"><div class="cp-st"><i>١</i><b>المستلمين</b><span>' + n2(n) + ' إيميل</span></div><div class="cp-ch">'
      + AUD.map(function(a){ return '<button type="button" class="' + (S.aud === a[0] ? 'on' : '') + '" data-a="aud" data-v="' + a[0] + '">' + a[1] + ' <small>' + n2(r.counts[a[0]] || 0) + '</small></button>'; }).join('')
      + (r.groups || []).map(function(g){ return '<button type="button" class="' + (S.aud === 'grp' && S.grp === g.name ? 'on' : '') + '" data-a="grp" data-v="' + esc(g.name) + '">📋 ' + esc(g.name) + ' <small>' + n2(g.n) + '</small></button>'; }).join('')
      + '<button type="button" class="add" data-a="imp">＋ قائمة إيميلات (لصق أو Excel)</button></div>';
    if (S.aud === 'grp') { var g = (r.groups || []).filter(function(x){ return x.name === S.grp; })[0] || {};
      h += '<div class="cp-gi"><span>📋 <b>' + esc(S.grp) + '</b> · ' + n2(g.n) + ' إيميل' + (g.unsub_n ? ' · ' + n2(g.unsub_n) + ' ألغوا الاشتراك' : '') + '</span><span class="sp"></span><button class="cp-lk" data-a="gview">عرض</button><button class="cp-lk" data-a="gadd">＋ إضافة</button><button class="cp-lk r" data-a="gdel">حذف القائمة</button></div>'; }
    else h += '<div class="cp-nt">من دفتر عملائك (' + n2(r.total) + ' عميل) — يوصل بس للي عندهم إيميل وما ألغوا الاشتراك.</div>';
    h += '</div>';
    // ٢ الرسالة
    h += '<div class="cp-c"><div class="cp-st"><i>٢</i><b>الرسالة</b></div><div><label>ابدأ من قالب</label><div class="cp-ch">' + TPL.map(function(t, i){ return '<button type="button" data-a="tpl" data-v="' + i + '">' + t[0] + '</button>'; }).join('') + '</div></div>'
      + '<div><label for="cp-s">العنوان <span class="cnt" id="cp-sc">' + (S.subj || '').length + '/120</span></label><input type="text" id="cp-s" maxlength="120" value="' + esc(S.subj || '') + '" placeholder="مثال: الصيف قرّب — نظّف مكيفاتك قبل الحر"></div>'
      + '<div><label for="cp-b">نص الرسالة <span class="cnt" id="cp-bc">' + (S.body || '').length + '/2000</span></label><textarea id="cp-b" maxlength="2000" placeholder="اكتب رسالتك… يبدأ الإيميل تلقائياً بـ«مرحباً» واسم العميل">' + esc(S.body || '') + '</textarea><div class="cp-tb"><button type="button" data-a="tok">＋ اسم العميل</button><span class="cp-nt" style="align-self:center">{الاسم} يتبدّل باسم كل عميل</span></div></div>'
      + '<div><label>صورة الإعلان <span class="mu" style="font-weight:600">(اختياري — بوستر أو صورة عرض)</span></label>'
      + (S.img ? '<div class="cp-ip"><img src="' + esc(S.img) + '" alt="صورة الإعلان"><div class="b"><button type="button" data-a="img">تغيير</button><button type="button" data-a="imgx">حذف</button></div>' + (S.imgUp ? '<div class="up">جاري الرفع…</div>' : '') + '</div>'
        : '<div class="cp-im" data-a="img" role="button" tabindex="0">' + (S.imgUp ? 'جاري الرفع…' : '🖼 أضف صورة أو بوستر<small>JPG أو PNG · تظهر بأعلى الإيميل وتفتح زر الإجراء</small>') + '</div>')
      + '<input type="file" id="cp-if" accept="image/png,image/jpeg,image/webp" style="display:none"></div>'
      + '<div><label>زر الإجراء في الإيميل</label><div class="cp-ch">' + CTA.filter(function(c){ return (c[0] !== 'book' || r.book) && (c[0] !== 'wa' || r.has_phone); }).map(function(c){ return '<button type="button" class="' + (S.cta === c[0] ? 'on' : '') + '" data-a="cta" data-v="' + c[0] + '">' + c[1] + '</button>'; }).join('') + '</div>'
      + (S.cta === 'url' ? '<input type="url" id="cp-u" dir="ltr" maxlength="400" style="margin-top:8px;text-align:left" placeholder="https://" value="' + esc(S.url || '') + '">' : '')
      + (S.cta !== 'none' ? '<input type="text" id="cp-t" maxlength="30" style="margin-top:8px" placeholder="نص الزر (اختياري) — مثال: احجز بالخصم" value="' + esc(S.ctaT || '') + '">' : '') + '</div>';
    h += '</div></div><div class="cp-sd">';
    // ٣ المعاينة والإرسال
    h += '<div class="cp-c"><div class="cp-st"><i>٣</i><b>المعاينة والإرسال</b></div><div class="cp-pv' + (S.dv === 'pc' ? '' : ' mob') + '"><div class="cp-pvh"><span class="sp"><b id="cp-pf">' + esc(r.from || '') + '</b> · <span id="cp-ps">' + esc(S.subj || 'عنوان الحملة') + '</span></span><div class="cp-dv"><button type="button" class="' + (S.dv === 'pc' ? '' : 'on') + '" data-a="dv" data-v="m" aria-label="جوال">📱</button><button type="button" class="' + (S.dv === 'pc' ? 'on' : '') + '" data-a="dv" data-v="pc" aria-label="كمبيوتر">🖥</button></div></div><iframe id="cp-fr" title="معاينة الإيميل" sandbox="allow-same-origin"></iframe></div>'
      + '<div><label for="cp-to">جرّب الإيميل قبل الإرسال</label><div class="cp-ts"><input type="email" id="cp-to" dir="ltr" maxlength="160" placeholder="your@email.com" value="' + esc(S.to || '') + '" style="text-align:left"><button type="button" class="cp-bt" data-a="test">إرسال تجربة</button></div><div class="cp-nt" style="margin-top:4px">توصلك نسخة مثل اللي يستلمها العميل — ما تنحسب من رصيدك.</div></div>'
      + '<button type="button" class="cp-bt go" data-a="send"' + (go ? '' : ' disabled') + '>' + (go ? 'إرسال الحملة لـ ' + n2(go) + ' مستلم' : (left ? 'اختر مستلمين عندهم إيميل' : 'خلص رصيد الشهر')) + '</button><div class="cp-nt" style="text-align:center">كل إيميل باسم منشأتك وفيه رابط إلغاء الاشتراك.</div></div>';
    if (r.history.length) h += '<div class="cp-c"><b style="color:#172554">الحملات السابقة</b><div>' + r.history.map(function(x){ return '<div class="cp-h"><div class="th"' + (x.image ? ' style="background-image:url(&quot;' + esc(x.image) + '&quot;)"' : '') + '>' + (x.image ? '' : '✉️') + '</div><div class="tx"><b>' + esc(x.subject) + '</b><span>' + n2(x.sent_n) + ' إيميل · ' + (x.audience === 'grp' ? '📋 ' + esc(x.grp || '') : esc((AUD.filter(function(a){ return a[0] === x.audience; })[0] || ['', 'دفتر العملاء'])[1])) + ' · ' + dd(x.created_at) + '</span></div></div>'; }).join('') + '</div></div>';
    h += '</div></div></div>';
    X.el.innerHTML = h; wire(); pv();
  }
  function payload(){ return { audience: S.aud, grp: S.grp, subject: S.subj || '', body: S.body || '', image: S.img || '', cta: S.cta, cta_text: S.ctaT || '', cta_url: S.url || '' }; }
  var pvT = 0, pvN = 0;
  function pv(now){ clearTimeout(pvT); pvT = setTimeout(function(){ var k = ++pvN; post('/api/campaigns/preview', payload()).then(function(r){ if (k !== pvN) return; var f = document.getElementById('cp-fr'); if (f) f.srcdoc = r.html; S.r.from = r.from; var pf = document.getElementById('cp-pf'); if (pf) pf.textContent = r.from || ''; }).catch(function(){}); }, now ? 0 : 450); }
  function wire(){
    var el = X.el, s = document.getElementById('cp-s'), b = document.getElementById('cp-b'), u = document.getElementById('cp-u'), t = document.getElementById('cp-t'), to = document.getElementById('cp-to'), f = document.getElementById('cp-if');
    s.oninput = function(){ S.subj = s.value; document.getElementById('cp-sc').textContent = s.value.length + '/120'; document.getElementById('cp-ps').textContent = s.value || 'عنوان الحملة'; pv(); };
    b.oninput = function(){ S.body = b.value; document.getElementById('cp-bc').textContent = b.value.length + '/2000'; pv(); };
    if (u) u.oninput = function(){ S.url = u.value; pv(); }; if (t) t.oninput = function(){ S.ctaT = t.value; pv(); }; to.oninput = function(){ S.to = to.value; };
    f.onchange = function(){ var x = f.files && f.files[0]; f.value = ''; if (x) img(x); };
    if (el.__cpW) return; el.__cpW = 1;
    el.addEventListener('click', function(e){ var k = e.target.closest('[data-a]'); if (!k || !el.contains(k) || !k.closest('.cp')) return; var a = k.getAttribute('data-a'), v = k.getAttribute('data-v');
      if (a === 'back') return X.back && X.back();
      if (a === 'aud') { S.aud = v; S.grp = null; return draw(); }
      if (a === 'grp') { S.aud = 'grp'; S.grp = v; return draw(); }
      if (a === 'imp') return imp();
      if (a === 'gadd') return imp(S.grp);
      if (a === 'gview') return gview();
      if (a === 'gdel') return ask('حذف القائمة «' + esc(S.grp) + '»؟', 'تنحذف كل إيميلاتها. الحملات اللي انرسلت تبقى بالسجل.', 'نعم، احذف').then(function(y){ if (!y) return; post('/api/campaigns/contacts/del', { grp: S.grp }).then(function(){ toast('انحذفت القائمة'); S.aud = 'all'; S.grp = null; load(true); }).catch(function(e){ if (e) toast(e.message); }); });
      if (a === 'tpl') { var T = TPL[+v]; var put = function(){ S.subj = T[1]; S.body = T[2]; draw(); }; if ((S.body || '').trim() && S.body !== T[2]) return ask('نستبدل الرسالة الحالية بالقالب؟', '', 'استبدل').then(function(y){ if (y) put(); }); return put(); }
      if (a === 'tok') { var ta = document.getElementById('cp-b'), p = ta.selectionStart != null ? ta.selectionStart : ta.value.length; ta.value = ta.value.slice(0, p) + '{الاسم}' + ta.value.slice(ta.selectionEnd != null ? ta.selectionEnd : p); S.body = ta.value; ta.focus(); try { ta.setSelectionRange(p + 7, p + 7); } catch(_){} document.getElementById('cp-bc').textContent = ta.value.length + '/2000'; return pv(); }
      if (a === 'img') return document.getElementById('cp-if').click();
      if (a === 'imgx') { S.img = ''; return draw(); }
      if (a === 'cta') { S.cta = v; return draw(); }
      if (a === 'dv') { S.dv = v; return draw(); }
      if (a === 'test') return test(k);
      if (a === 'send') return send(false);
    });
    el.addEventListener('keydown', function(e){ if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('cp-im')) { e.preventDefault(); document.getElementById('cp-if').click(); } });
  }
  function shrink(file){ return new Promise(function(ok, no){ var u = URL.createObjectURL(file), im = new Image(); im.onload = function(){ var M = 1200, w = im.naturalWidth, h = im.naturalHeight, k = Math.min(1, M / w); var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', .86)); }; im.onerror = function(){ URL.revokeObjectURL(u); no(new Error('الصورة غير صالحة')); }; im.src = u; }); }
  function img(file){ if (!/^image\//.test(file.type)) return toast('اختر صورة JPG أو PNG'); if (file.size > 12 * 1024 * 1024) return toast('الصورة كبيرة — الحد 12 ميجا');
    S.imgUp = 1; var prev = S.img; draw();
    shrink(file).then(function(d){ S.img = d; draw(); return post('/api/campaigns/image', { data: d }); }).then(function(r){ S.imgUp = 0; S.img = r.url; draw(); toast('انضافت الصورة'); })
      .catch(function(e){ S.imgUp = 0; S.img = prev; draw(); toast((e && e.message) || 'تعذّر رفع الصورة'); }); }
  function valid(){ if ((S.subj || '').trim().length < 4) { toast('اكتب عنوان الحملة'); document.getElementById('cp-s').focus(); return false; }
    if ((S.body || '').trim().length < 10) { toast('اكتب نص الرسالة'); document.getElementById('cp-b').focus(); return false; }
    if (S.imgUp) { toast('انتظر رفع الصورة'); return false; }
    if (S.cta === 'url' && !/^https:\/\/[^\s]+\.[^\s]+/.test(S.url || '')) { toast('رابط الزر لازم يبدأ بـ https://'); var u = document.getElementById('cp-u'); if (u) u.focus(); return false; } return true; }
  function test(btn){ if (!valid()) return; var to = (S.to || '').trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) { toast('اكتب إيميلك للتجربة'); document.getElementById('cp-to').focus(); return; }
    btn.disabled = true; btn.textContent = 'جاري الإرسال…'; post('/api/campaigns/test', Object.assign(payload(), { to: to })).then(function(r){ toast(r.message || 'انرسلت التجربة'); }).catch(function(e){ if (e) toast(e.message); }).then(function(){ btn.disabled = false; btn.textContent = 'إرسال تجربة'; }); }
  function send(partial){ if (!valid()) return; var n = Math.min(cnt(), Math.max(0, S.r.limit - S.r.used)), who = S.aud === 'grp' ? 'قائمة «' + esc(S.grp) + '»' : (AUD.filter(function(a){ return a[0] === S.aud; })[0] || ['', ''])[1];
    var go = function(){ var b = X.el.querySelector('[data-a="send"]'); if (b) { b.disabled = true; b.textContent = 'جاري الإرسال…'; }
      post('/api/campaigns', Object.assign(payload(), { partial: partial })).then(function(x){ toast(x.message || 'انرسلت'); S.subj = ''; S.body = ''; S.img = ''; S.ctaT = ''; load(true); })
        .catch(function(e){ if (!e) return; if (e.j && e.j.code === 'partial') return ask('الرصيد ما يكفي الكل', esc(e.message), 'أرسل لـ ' + e.j.left).then(function(y){ if (y) send(true); else draw(); }); draw(); toast(e.message); }); };
    if (partial) return go();
    ask('إرسال «' + esc(S.subj) + '»؟', 'يوصل لـ ' + n2(n) + ' مستلم (' + who + ')' + (S.img ? ' مع صورة الإعلان' : '') + '. ما تقدر توقفها بعد الإرسال.', 'نعم، أرسل').then(function(y){ if (y) go(); });
  }
  // ── قائمة إيميلات: لصق أو ملف ──
  function parseRows(rows){ var seen = {}, ok = [], dup = 0, bad = 0;
    rows.forEach(function(row){ var cells = (Array.isArray(row) ? row : [row]).map(function(c){ return String(c == null ? '' : c).trim(); }); var line = cells.join(' ');
      var ms = line.match(RX); if (!ms) { if (/@/.test(line)) bad++; return; }
      ms.forEach(function(m){ var em = m.toLowerCase().replace(/^[.'-]+|[.'-]+$/g, '');
        if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(em)) { bad++; return; } if (seen[em]) { dup++; return; } seen[em] = 1;
        var nm = ''; if (ms.length === 1) { nm = cells.filter(function(c){ return c && c.indexOf('@') < 0 && !/^[\d\s+()-]{6,}$/.test(c) && c.length < 60; })[0] || ''; if (!nm && !Array.isArray(row)) nm = line.replace(m, '').replace(/[<>"'(),;:\t|]+/g, ' ').trim(); }
        ok.push({ email: em, name: nm.slice(0, 80) }); }); });
    return { ok: ok, dup: dup, bad: bad }; }
  function loadXLSX(){ if (window.XLSX) return Promise.resolve(window.XLSX); return new Promise(function(ok, no){ var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = function(){ window.XLSX ? ok(window.XLSX) : no(); }; s.onerror = function(){ no(new Error('تعذّر تحميل قارئ Excel — احفظ الملف CSV وجرّب')); }; document.head.appendChild(s); }); }
  function readFile(file){
    return new Promise(function(ok, no){ var nm = file.name.toLowerCase(), fr = new FileReader();
      if (/\.(csv|txt)$/.test(nm)) { fr.onload = function(){ ok(String(fr.result).split(/\r?\n/).map(function(l){ return l.split(/[,;\t]/); })); }; fr.onerror = no; fr.readAsText(file); return; }
      if (!/\.(xlsx|xls)$/.test(nm)) return no(new Error('الملف لازم يكون Excel (xlsx) أو CSV'));
      fr.onload = function(){ loadXLSX().then(function(X){ var wb = X.read(new Uint8Array(fr.result), { type: 'array' }), rows = []; wb.SheetNames.forEach(function(sn){ rows = rows.concat(X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: false, defval: '' })); }); ok(rows); }, no); };
      fr.onerror = no; fr.readAsArrayBuffer(file); });
  }
  function imp(grp){
    var P = { tab: 'paste', res: null };
    var o = sheet('<b style="font-size:17px;color:#172554">' + (grp ? 'إضافة إيميلات لقائمة «' + esc(grp) + '»' : 'قائمة إيميلات جديدة') + '</b>'
      + (grp ? '' : '<div><label for="im-n">اسم القائمة</label><input type="text" id="im-n" maxlength="60" placeholder="مثال: زوار معرض الرياض"></div>')
      + '<div class="cp-tab"><button type="button" class="on" data-t="paste">✍️ لصق أو كتابة</button><button type="button" data-t="file">📊 ملف Excel / CSV</button></div>'
      + '<div id="im-p"><textarea id="im-x" style="min-height:140px;direction:ltr;text-align:left" placeholder="name@example.com&#10;محمد أحمد, mohammed@mail.com&#10;…"></textarea><div class="cp-nt">إيميل بكل سطر، أو الاسم ثم الإيميل. نلقط الإيميلات تلقائياً حتى لو نسختها من جدول.</div></div>'
      + '<div id="im-f" style="display:none"><label class="cp-drop">📊 اختر ملف Excel أو CSV<small>نقرأ عمود الإيميل والاسم تلقائياً — أول ورقة وما بعدها</small><input type="file" id="im-fi" accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style="display:none"></label><div id="im-fn" class="cp-nt" style="margin-top:6px"></div></div>'
      + '<div id="im-r"></div>'
      + '<div class="cp-nt">كل إيميل يوصل فيه رابط «إلغاء الاشتراك»، واللي يلغي ما توصله حملاتك بعدها.</div>'
      + '<button type="button" class="cp-bt go" id="im-go" disabled>حفظ القائمة</button>');
    var x = o.querySelector('#im-x'), R = o.querySelector('#im-r'), go = o.querySelector('#im-go');
    function upd(){ var r = P.res; R.innerHTML = r && (r.ok.length || r.bad || r.dup) ? '<div class="cp-sum"><div class="g"><b>' + n2(r.ok.length) + '</b><span>إيميل صحيح</span></div><div><b>' + n2(r.dup) + '</b><span>مكرر</span></div><div class="r"><b>' + n2(r.bad) + '</b><span>غير صحيح</span></div></div>'
        + (r.ok.length ? '<table class="cp-tbl">' + r.ok.slice(0, 5).map(function(z){ return '<tr><td>' + esc(z.name || '—') + '</td><td>' + esc(z.email) + '</td></tr>'; }).join('') + '</table>' + (r.ok.length > 5 ? '<div class="cp-nt">و' + n2(r.ok.length - 5) + ' غيرهم…</div>' : '') : '') : '';
      go.disabled = !(r && r.ok.length); go.textContent = r && r.ok.length ? 'حفظ ' + n2(r.ok.length) + ' إيميل' : 'حفظ القائمة'; }
    var tT; x.oninput = function(){ clearTimeout(tT); tT = setTimeout(function(){ P.res = parseRows(x.value.split(/\r?\n/)); upd(); }, 200); };
    o.querySelectorAll('[data-t]').forEach(function(b){ b.onclick = function(){ P.tab = b.getAttribute('data-t'); o.querySelectorAll('[data-t]').forEach(function(z){ z.classList.toggle('on', z === b); }); o.querySelector('#im-p').style.display = P.tab === 'paste' ? '' : 'none'; o.querySelector('#im-f').style.display = P.tab === 'file' ? '' : 'none'; P.res = P.tab === 'paste' && x.value ? parseRows(x.value.split(/\r?\n/)) : (P.fileRes || null); upd(); }; });
    o.querySelector('#im-fi').onchange = function(){ var f = this.files && this.files[0]; this.value = ''; if (!f) return; var fn = o.querySelector('#im-fn'); fn.textContent = 'جاري قراءة «' + f.name + '»…';
      readFile(f).then(function(rows){ P.fileRes = P.res = parseRows(rows); fn.textContent = '📄 ' + f.name; upd(); if (!P.res.ok.length) toast('ما لقينا إيميلات في الملف'); }).catch(function(e){ fn.textContent = ''; toast((e && e.message) || 'تعذّر قراءة الملف'); }); };
    go.onclick = function(){ var name = grp || (o.querySelector('#im-n').value || '').trim(); if (name.length < 2) { toast('اكتب اسم للقائمة'); o.querySelector('#im-n').focus(); return; }
      go.disabled = true; go.textContent = 'جاري الحفظ…';
      post('/api/campaigns/contacts', { grp: name, items: P.res.ok, consent: true }).then(function(r){ o.remove(); toast(r.message + (r.dup ? ' (' + r.dup + ' موجود من قبل)' : '')); S.aud = 'grp'; S.grp = r.grp; load(true); })
        .catch(function(e){ upd(); if (e) toast(e.message); }); };
  }
  function gview(){ api('/api/campaigns/contacts?grp=' + encodeURIComponent(S.grp)).then(function(r){
      var o = sheet('<b style="font-size:17px;color:#172554">📋 ' + esc(S.grp) + '</b><div style="max-height:56vh;overflow:auto"><table class="cp-tbl">' + r.items.map(function(z){ return '<tr><td>' + esc(z.name || '—') + (z.unsub ? ' <span class="mu">(ألغى الاشتراك)</span>' : '') + '</td><td>' + esc(z.email) + '</td><td style="width:30px"><button class="cp-lk r" data-e="' + esc(z.email) + '" aria-label="حذف">×</button></td></tr>'; }).join('') + '</table>' + (r.items.length >= 300 ? '<div class="cp-nt">نعرض أحدث 300</div>' : '') + '</div><button class="cp-bt" data-x="1">إغلاق</button>');
      o.addEventListener('click', function(e){ if (e.target.closest('[data-x]')) { o.remove(); return; } var b = e.target.closest('[data-e]'); if (!b) return; post('/api/campaigns/contacts/del', { grp: S.grp, email: b.getAttribute('data-e') }).then(function(){ b.closest('tr').remove(); load(true); }).catch(function(e2){ if (e2) toast(e2.message); }); });
    }).catch(function(e){ if (e) toast(e.message); }); }
  window.MNQ_CAMP = { open: open };
})();
