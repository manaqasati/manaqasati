/* ═══ ⭐ «وثّق أعمالك» — لوحة المزوّد ═══
   المزوّد يرفع صور مشروع سواه + اسم وجوال صاحبه ← يرسل له رابط بالواتساب ← صاحب المشروع يأكّد بدخول حسابه ويقيّم
   WP.homeCard() بطاقة الرئيسية · WP.load() صفحة #proof · WP.reviewsCard() بطاقة في «التقييمات» */
(function(){
  'use strict';
  var W = window, D = document;
  // سلّم المستويات: [عدد المشاريع، الاسم، المزايا، يحسب 4★ فأعلى فقط]
  var LV = [[1, 'أعمال موثّقة', ['الشارة على كل عرض تقدّمه', 'صور أعمالك تطلع تحت عرضك'], 0],
            [5, 'موثّق فضّي', ['عرضك يطلع قبل المستويات الأقل', 'تتصدّر دليل مدينتك'], 0],
            [10, 'موثّق زمرّدي', ['عرضك يطلع للعميل «مرشّح لك»', 'المشاريع الجديدة توصلك قبل غيرك بـ15 دقيقة'], 1],
            [20, 'موثّق ماسي', ['تظهر في الصفحة الرئيسية «مزوّدين موثّقين»', 'أول من تدعوه الإدارة للمشاريع'], 1]];
  var MG = { 1: ['linear-gradient(180deg,#3b8bf0,#1659c7)', '#fff'], 5: ['linear-gradient(180deg,#eef1f5,#b9c1cc 55%,#dfe4ea)', '#2b3440'], 10: ['linear-gradient(180deg,#fbe7a5,#e0a82e 55%,#f3cf6b)', '#5a3a00'], 20: ['linear-gradient(180deg,#8c7cf7,#4b2fd0 55%,#7a62f2)', '#fff'] };
  var TG = { 0: 'linear-gradient(135deg,#17254d,#1e40af)', 1: 'linear-gradient(135deg,#2d7ff0,#0d47b0)', 5: 'linear-gradient(135deg,#9aa5b4,#4f5b6b)', 10: 'linear-gradient(135deg,#d9a53c,#8a5a0c)', 20: 'linear-gradient(135deg,#7b62f5,#2e1aa0)' };
  var IC = { 1: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>', 5: '<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2 6.4 20.2l1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor"/>', 20: '<path d="M6 3.5h12l3.5 5.5L12 21 2.5 9z" fill="currentColor"/>' };
  IC[10] = IC[5];
  function lvName(l){ for (var i = 0; i < LV.length; i++) if (LV[i][0] === l) return LV[i][1]; return ''; }
  function medal(l, sz, dim){ var m = MG[l]; return '<span class="wp-md" style="width:' + sz + 'px;height:' + sz + 'px;background:' + m[0] + ';color:' + m[1] + (dim ? ';opacity:.38;filter:grayscale(.4)' : '') + '"><svg viewBox="0 0 24 24" style="width:' + Math.round(sz * .44) + 'px;height:' + Math.round(sz * .44) + 'px" aria-hidden="true">' + IC[l] + '</svg></span>'; }
  function badge(l){ if (!l) return ''; var m = MG[l]; return '<span class="wp-lb" style="background:' + m[0] + ';color:' + m[1] + '"><i><svg viewBox="0 0 24 24" aria-hidden="true">' + IC[l] + '</svg></i>' + esc(lvName(l)) + '</span>'; }
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
      + '.wp-tr{font-size:11.5px;font-weight:800;margin-top:4px;line-height:1.6}'
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
      + '.wp-new{display:inline-block;background:#ef4444;color:#fff;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:900;vertical-align:middle;margin-inline-start:6px;animation:wpP 1.6s ease-in-out infinite}@keyframes wpP{50%{transform:scale(1.08)}}'
      + '.wp-pv{border:2px dashed #93c5fd;border-radius:16px;padding:10px;margin-top:10px;background:var(--p-light,#f8fbff)}'
      + '[data-theme="dark"] .wp-pv{border-color:#2b4377;background:rgba(37,99,235,.08)}'
      + '.wp-pvh{display:flex;gap:9px;align-items:center}.wp-av{width:40px;height:40px;border-radius:12px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:17px;flex:none;overflow:hidden}.wp-av img{width:100%;height:100%;object-fit:cover}'
      + '.wp-md{border-radius:50%;display:inline-flex;align-items:center;justify-content:center;flex:none;box-shadow:inset 0 2px 0 rgba(255,255,255,.6),0 4px 12px rgba(0,0,0,.18)}'
      + '.wp-lb{display:inline-flex;align-items:center;gap:5px;height:22px;border-radius:999px;padding:0 9px 0 4px;font-size:11px;font-weight:800;white-space:nowrap;position:relative;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,.55),0 1px 2px rgba(0,0,0,.18)}.wp-lb i{width:16px;height:16px;border-radius:50%;background:rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center}.wp-lb svg{width:10px;height:10px}'
      + '.wp-tier{position:relative;z-index:1}.wp-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.16) 48%,transparent 62%);pointer-events:none}.wp-hero>*{position:relative;z-index:1}'
      + '.wp-tr{display:flex;align-items:center;justify-content:space-between;gap:10px}.wp-tl{font-size:12.5px;font-weight:700;opacity:.85}.wp-tn{font-size:21px;font-weight:900;line-height:1.35}'
      + '.wp-pg{height:7px;background:rgba(255,255,255,.25);border-radius:9px;overflow:hidden;margin:14px 0 7px}.wp-pg i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#f3cf6b,#e0a82e)}'
      + '.wp-pgt{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:800}.wp-pgt span:last-child{opacity:.85}'
      + '.wp-nx{background:rgba(255,255,255,.13);border-radius:14px;padding:11px 12px;margin-top:12px}.wp-nx b{display:block;font-size:14px;font-weight:900;margin-bottom:5px;line-height:1.6}.wp-nx div{font-size:12.5px;font-weight:700;line-height:1.9;opacity:.95}'
      + '.wp-steps{display:flex;justify-content:space-between;margin-top:12px}.wp-steps>span{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10.5px;font-weight:800;opacity:.92}'
      + '.wp-vb{display:inline-flex;align-items:center;background:linear-gradient(90deg,#1d4ed8,#2563eb);color:#fff;border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:900;white-space:nowrap}'
      + '.wp-pvi{display:flex;gap:5px;margin-top:8px}.wp-pvi img,.wp-pvi span{width:52px;height:52px;border-radius:9px;object-fit:cover;flex:none}.wp-pvi span{background:linear-gradient(135deg,#dbe5f5,#c7d2fe);display:flex;align-items:center;justify-content:center;font-size:18px}'
      + '[data-theme="dark"] .wp-pvi span{background:linear-gradient(135deg,#1e2d52,#24365e)}'
      + '.wp-bn{display:flex;align-items:center;gap:10px;border-radius:16px;padding:10px 12px;margin-bottom:12px;background:linear-gradient(90deg,#fff7e0,#fffbeb);border:1.5px solid #fcd34d}'
      + '[data-theme="dark"] .wp-bn{background:rgba(251,191,36,.1);border-color:rgba(251,191,36,.45)}'
      + '.wp-bi{font-size:22px;flex:none}.wp-bt{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.5}.wp-bt b{font-size:13.5px;font-weight:900;color:var(--text)}.wp-bt span{font-size:11.5px;font-weight:700;color:var(--muted,#64748b)}'
      + '.wp-bgo{border:0;border-radius:11px;background:#0f2544;color:#fff;font-family:inherit;font-weight:900;font-size:12.5px;padding:8px 12px;cursor:pointer;white-space:nowrap;flex:none}'
      + '[data-theme="dark"] .wp-bgo{background:#fbbf24;color:#1f2937}'
      + '.wp-bx{width:30px;height:30px;border-radius:50%;border:0;background:rgba(15,29,58,.07);color:var(--muted,#64748b);font-weight:900;font-size:13px;cursor:pointer;flex:none}'
      + '.wp-bs-d{display:none}@media(min-width:769px){.wp-bs-m{display:none}.wp-bs-d{display:inline}.wp-bn{padding:12px 16px}.wp-bt b{font-size:14.5px}.wp-bt span{font-size:12.5px}.wp-bgo{padding:10px 16px;font-size:13.5px}}'
      + '.wp-grid{display:block}@media(min-width:900px){.wp-grid{display:grid;grid-template-columns:minmax(300px,380px) 1fr;gap:14px;align-items:start}.wp-grid .wp-hero{margin-bottom:0}}'
      + '.wp-pvl{font-size:12px;font-weight:800;color:#c7d2fe;margin:12px 0 6px}.wp-hero .wp-pv{background:#fff;border-color:#bfdbfe}.wp-hero .wp-n{color:#0f1d3a}'
      + '.wp-mini{display:flex;gap:10px;align-items:center}.wp-mini .ic{width:40px;height:40px;border-radius:12px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:19px;flex:none}';
    D.head.appendChild(st);
  }
  // «جديد» مثل «مقاول باطن»: تختفي أول ما يفتح القسم
  function isNew(){ try { if (Date.now() > new Date('2027-01-15').getTime()) return false; return !localStorage.getItem('mnq_proof_seen'); } catch(e) { return false; } }
  function markNav(){ css(); var n = D.getElementById('ni-proof'); if (!n) return; var b = n.querySelector('.wp-new');
    if (isNew()) { if (!b) n.insertAdjacentHTML('beforeend', '<span class="wp-new" style="margin-inline-start:auto">جديد</span>'); } else if (b) b.remove();
    D.querySelectorAll('.wp-newc').forEach(function(x){ if (!isNew()) x.remove(); }); }
  function seen(){ try { localStorage.setItem('mnq_proof_seen', '1'); } catch(e) {} markNav(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', markNav); else setTimeout(markNav, 0);
  setTimeout(function(){ try { fillLevel(); } catch(e) {} }, 0);
  function fetchD(force){
    if (S.d && !force) return Promise.resolve(S.d);
    return api('/api/provider/proofs').then(function(d){ if (d && Array.isArray(d.items)) S.d = d; return S.d; });
  }
  // بطاقة المستوى (معدني): المستوى الحالي + التقدّم + وش يفتح لك المستوى الجاي
  function tierCard(d){
    var n = d.count_all != null ? d.count_all : (d.verified || 0), hi = d.count_hi != null ? d.count_hi : (d.verified_hi || 0), lv = parseInt(d.level) || 0, nx = null;
    for (var i = 0; i < LV.length; i++) if (LV[i][0] > lv) { nx = LV[i]; break; }
    var h = '<div class="wp-tier"><div class="wp-tr"><div><div class="wp-tl">' + (lv ? 'مستواك الحالي' : '⭐ وثّق أعمالك') + '</div><div class="wp-tn">' + (lv ? esc(lvName(lv)) : 'ابدأ بأول مشروع موثّق') + '</div></div>' + (lv ? medal(lv, 50) : '') + '</div>';
    if (nx) {
      var have = nx[3] ? hi : n, left = Math.max(1, nx[0] - have), pct = Math.min(100, Math.round(have / nx[0] * 100));
      h += '<div class="wp-pg"><i style="width:' + pct + '%"></i></div><div class="wp-pgt"><span>' + have + ' من ' + nx[0] + (nx[3] ? ' (4★ فأعلى)' : '') + '</span><span>التالي: ' + esc(nx[1]) + '</span></div>'
        + '<div class="wp-nx"><b>باقي ' + left + ' ' + (left === 1 ? 'مشروع' : left <= 10 ? 'مشاريع' : 'مشروع') + ' وتصير «' + esc(nx[1]) + '»' + (nx[3] ? ' — بتقييم 4★ فأعلى' : '') + '</b>' + nx[2].map(function(p){ return '<div>✓ ' + esc(p) + '</div>'; }).join('') + '</div>';
    } else h += '<div class="wp-nx"><b>وصلت لأعلى مستوى 🏆</b><div>عرضك يطلع «مرشّح لك» وتظهر في الصفحة الرئيسية</div></div>';
    h += '<div class="wp-s" style="margin-top:10px;font-size:12px">ينحسب لك: المشاريع اللي توثّقها هنا + المشاريع اللي تخلّصها في المنصة ويقيّمك عليها العميل</div>';
    h += '<div class="wp-steps">' + LV.map(function(l){ return '<span>' + medal(l[0], 30, lv < l[0]) + l[0] + '</span>'; }).join('') + '</div>';
    return h + '</div>';
  }
  function levels(n){
    return '<div class="wp-lv">' + LV.map(function(l){ var c = n >= l[0] ? 'dn' : (n < l[0] && (LV.filter(function(z){ return n >= z[0]; }).length === LV.indexOf(l)) ? 'on' : ''); return '<div class="' + c + '"><b>' + (n >= l[0] ? '✓' : l[0]) + '</b>' + l[1] + '</div>'; }).join('') + '</div>';
  }
  function nextTxt(n){ for (var i = 0; i < LV.length; i++) if (n < LV[i][0]) return 'باقي ' + (LV[i][0] - n) + ' — ' + LV[i][1]; return 'وصلت لأعلى مستوى 🏆'; }

  // ─── معاينة «كذا يشوف العميل عرضك» ───
  function pvHtml(d){
    var me = d.me || {}, im = [];
    (d.items || []).filter(function(x){ return x.status !== 'removed'; }).forEach(function(x){ (x.images || []).forEach(function(u){ u = safe(u); if (u && im.length < 3) im.push(u); }); });
    var av = safe(me.profile_image);
    return '<div class="wp-pv"><div class="wp-pvh"><div class="wp-av">' + (av ? '<img src="' + esc(av) + '" alt="">' : esc(String(me.name || 'م').charAt(0))) + '</div>'
      + '<div style="flex:1;min-width:0"><div class="wp-n" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(me.name || 'اسمك') + '</div>'
      + '<div class="wp-m" style="margin-top:3px">' + (me.rcount ? '<span style="color:#f59e0b">★ ' + esc(me.rating) + '</span> · ' : '') + '' + (badge(parseInt(d.level) || 0) || badge(1)) + '</div></div></div>'
      + '<div class="wp-pvi">' + im.map(function(u){ return '<img src="' + esc(u) + '" alt="" loading="lazy">'; }).join('') + (im.length < 3 ? new Array(3 - im.length + 1).join('<span>📷</span>') : '') + '</div></div>';
  }
  // ─── لوحة المزوّد: شارة المستوى + سطر التقدّم (بدل «نشط/مميّز/خبير» القديمة) ───
  function fillLevel(){
    css(); var bs = D.querySelectorAll('.wp-mylb'), bx = D.getElementById('wp-mylv'); if (!bs.length && !bx) return;
    fetchD().then(function(d){ if (!d) return; var lv = parseInt(d.level) || 0, n = d.count_all || 0, hi = d.count_hi || 0, nx = null;
      for (var i = 0; i < LV.length; i++) if (LV[i][0] > lv) { nx = LV[i]; break; }
      D.querySelectorAll('.wp-mylb').forEach(function(e){ e.innerHTML = badge(lv); });
      bx = D.getElementById('wp-mylv'); if (!bx) return;
      var have = nx ? (nx[3] ? hi : n) : 0, pct = nx ? Math.max(4, Math.min(100, Math.round(have / nx[0] * 100))) : 100, left = nx ? Math.max(1, nx[0] - have) : 0;
      bx.innerHTML = '<div class="pa-st"><span>مستواك: <b>' + (lv ? esc(lvName(lv)) : 'ما بدأت للحين') + '</b></span><small>' + (nx ? 'باقي ' + left + ' لـ«' + esc(nx[1]) + '»' : 'أعلى مستوى 🏆') + '</small></div><div class="pa-bar lv"><i style="width:' + pct + '%"></i></div>'
        + '<button type="button" class="pa-btn" style="margin-top:8px" onclick="WP.go(1)">⭐ ارفع مستواك — وثّق مشروع</button>';
    }).catch(function(){});
  }
  // ─── الرئيسية: شريط صغير بسطر واحد — مؤقت (يختفي لو فتح القسم أو ضغط ✕ أو بعد 3 زيارات) ───
  var BN_MAX = 3;
  function bnGet(k){ try { return localStorage.getItem(k); } catch(e) { return null; } }
  function bnSet(k, v){ try { localStorage.setItem(k, v); } catch(e) {} }
  function bnShow(){
    if (!isNew()) return false;                       // فتح القسم مرة = خلاص
    if (bnGet('mnq_wp_bn_x')) return false;            // قفله بـ✕
    var n = parseInt(bnGet('mnq_wp_bn_n')) || 0;
    var cnt = false; try { cnt = !sessionStorage.getItem('mnq_wp_bn_s'); if (cnt) sessionStorage.setItem('mnq_wp_bn_s', '1'); } catch(e) {}
    if (cnt) { n++; bnSet('mnq_wp_bn_n', String(n)); }
    return n <= BN_MAX;
  }
  function homeCard(){
    css(); var pg = D.getElementById('page-home'); if (!pg) return;
    var k = pg.querySelector('.pa-kpis'); if (!k) return;
    var box = D.getElementById('wp-home'); if (!box) { box = D.createElement('div'); box.id = 'wp-home'; k.parentNode.insertBefore(box, k.nextSibling); }
    if (!bnShow()) { box.innerHTML = ''; return; }
    box.innerHTML = '<div class="wp-bn" role="region" aria-label="ميزة جديدة: وثّق أعمالك"><span class="wp-bi" aria-hidden="true">⭐</span>'
      + '<div class="wp-bt"><b>جديد: وثّق أعمالك</b><span class="wp-bs-m">عملاؤك يقيّمونك ← عروضك تطلع أول</span><span class="wp-bs-d">ارفع صور مشروع سويته، صاحبه يقيّمك — تاخذ شارة «أعمال موثّقة ✓» وعروضك تطلع قبل غيرك</span></div>'
      + '<button type="button" class="wp-bgo" onclick="WP.go(1)"><span class="wp-bs-m">جرّب</span><span class="wp-bs-d">وثّق أول مشروع</span></button>'
      + '<button type="button" class="wp-bx" aria-label="إخفاء" onclick="WP.hideBanner()">✕</button></div>';
  }
  // ─── بطاقة «التقييمات» ───
  function reviewsCard(){
    css(); var pg = D.getElementById('page-reviews'); if (!pg || D.getElementById('wp-rv')) return;
    var c = D.createElement('div'); c.id = 'wp-rv';
    c.innerHTML = '<div class="wp-card"><div class="wp-mini"><span class="ic">⭐</span><div style="flex:1;min-width:0"><div class="wp-n">تبي تقييمات أكثر؟</div><div class="wp-m">وثّق مشروع سويته وأرسل الرابط لصاحبه — يقيّمك بدقيقة</div></div><button type="button" class="wp-sm" onclick="WP.go(1)">وثّق مشروع</button></div></div>';
    var hd = pg.querySelector('.pghd'); if (hd && hd.nextSibling) pg.insertBefore(c, hd.nextSibling); else pg.insertBefore(c, pg.firstChild);
  }
  // ─── الصفحة ───
  // «وين وقف العميل؟» — آخر خطوة وصلها صاحب المشروع
  function trail(x){
    var t, c = '#64748b';
    if (x.last_err && (!x.login_at || new Date(x.err_at) >= new Date(x.login_at))) { t = '⚠️ طلع له خطأ ' + ago(x.err_at) + ': ' + esc(x.last_err); c = '#b91c1c'; }
    else if (x.login_at) { t = '🔐 راح لصفحة الدخول ' + ago(x.login_at) + ' وما كمّل — ذكّره يكمّل الدخول' + (x.inapp ? ' ويفتح الرابط في المتصفح' : ''); c = '#b45309'; }
    else if (x.views) { t = '👀 فتح الرابط' + (x.views > 1 ? ' ' + x.views + ' مرات' : '') + ' وما أرسل التقييم'; c = '#b45309'; }
    else t = '⏳ ما فتح الرابط للحين';
    return '<div class="wp-tr" style="color:' + c + '">' + t + '</div>';
  }
  function item(x){
    var im = safe((x.images || [])[0]);
    var st = x.status === 'reviewed' ? '<span class="wp-pl wp-ok">✓ موثّق</span>' : x.status === 'removed' ? '<span class="wp-pl wp-rm">انحذف</span>' : '<span class="wp-pl wp-wt">بانتظار تقييمه</span>';
    var m = x.status === 'reviewed' ? '<span style="color:#f59e0b">' + '★★★★★'.slice(0, Math.round(x.rating || 0)) + '</span> · ' + esc(x.client_name || '') + ' قيّمك ' + (x.rating || '') + '/5'
      : x.status === 'pending' ? 'أرسلت الرابط لـ«' + esc(x.client_name || '') + '» ' + esc(ago(x.reminded_at || x.created_at)) : 'انحذف بعد المراجعة';
    if (x.status === 'pending') m += trail(x);
    var act = x.status === 'pending' ? '<div style="display:flex;gap:6px;margin-top:7px"><button type="button" class="wp-sm" onclick="WP.remind(' + x.id + ')">📲 ذكّره</button><button type="button" class="wp-sm" onclick="WP.copy(' + x.id + ')">🔗 انسخ الرابط</button><button type="button" class="wp-sm" onclick="WP.del(' + x.id + ')" aria-label="حذف">🗑</button></div>' : '';
    return '<div class="wp-it">' + (im ? '<img class="wp-th" src="' + esc(im) + '" alt="" loading="lazy">' : '<div class="wp-th"></div>') + '<div style="flex:1;min-width:0"><div class="wp-n">' + esc(x.title) + '</div><div class="wp-m">' + m + '</div>' + act + '</div>' + st + '</div>';
  }
  function page(){
    var pg = D.getElementById('page-proof'); if (!pg) return;
    var d = S.d || { items: [], verified: 0, month_left: 5 }, n = d.verified || 0;
    var h = '<div class="wp-grid"><div class="wp-hero" style="background:' + (TG[parseInt(d.level) || 0] || TG[0]) + '">' + tierCard(d)
      + (n ? '' : '<div class="wp-s" style="margin-top:10px">ارفع صور مشروع سويته، صاحبه يأكّده بتقييم — العميل لما يشوف شغل مشابه يثق فيك أكثر ويختار عرضك.</div>')
      + '<div class="wp-pvl">كذا يشوف العميل عرضك:</div>' + pvHtml(d)
      + (d.month_left > 0 ? '<button type="button" class="wp-b wp-y" onclick="WP.form()">＋ وثّق مشروع</button>' : '<div class="wp-s" style="margin-top:10px">وصلت حد هالشهر (' + d.month_max + ' مشاريع) — تقدر تضيف بعدين</div>') + '</div>';
    h += '<div><div class="wp-card"><div class="wp-h">الأعمال الموثّقة' + (d.items.length ? '<span class="wp-pl wp-ok">' + n + ' موثّق</span>' : '') + '</div>';
    if (d.items.length) h += d.items.map(item).join('');
    else h += '<div class="wp-m" style="padding:14px 0;text-align:center">ما وثّقت أي مشروع للحين — ابدأ بمشروع واحد سويته وصاحبه راضي عنه</div>';
    h += '</div><div class="wp-note">💡 اختار مشاريع أصحابها راضين — التقييم يظهر في صفحتك وما ينحذف بعد ما ينكتب.</div></div></div>';
    pg.innerHTML = h;
  }
  function load(){
    css(); seen(); var pg = D.getElementById('page-proof'); if (!pg) return;
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
    homeCard: homeCard, reviewsCard: reviewsCard, isNew: isNew, fillLevel: fillLevel,
    hideBanner: function(){ bnSet('mnq_wp_bn_x', '1'); var b = D.getElementById('wp-home'); if (b) b.innerHTML = ''; }, load: load, go: go, form: function(){ S.form = S.form || { imgs: [] }; form(); },
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
