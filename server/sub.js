/* ═══ 🤝 مقاول باطن + شركائي — لوحة المزوّد ═══
   SubC.homeCard() بطاقة في الرئيسية · SubC.load() صفحة #sub · SubC.open(id) تفاصيل طلب */
(function(){
  var W=window;
  var CATS=['كهرباء','سباكة','تبريد وتكييف','عوازل مائية','عزل حراري','دهانات وديكور','جبس','بلاط ورخام','نجارة','حدادة','ألمنيوم','زجاج ومرايا','كاميرات مراقبة','شبكات وإنترنت','أنظمة الحريق والسلامة','أنظمة شمسية','مظلات وسواتر','كلادينج وواجهات','إنشاءات معدنية وهناجر','بناء','ترميم مبانٍ','تشطيبات ومقاولات عامة','مكاتب هندسية','تصاميم داخلي وخارجي','هدم','معدات ثقيلة','انترلوك وبلدورات','أعمال الطرق والأسفلت','صرف صحي وبيارات','حفر آبار ومضخات','تحلية ومعالجة مياه','أرضيات إيبوكسي','أرضيات خشبية وباركيه','تركيب مطابخ','تركيب أثاث','أبواب وبوابات','تركيب وصيانة مصاعد','تنسيق حدائق','مسابح','كشف تسربات المياه','تنظيف','تنظيف خزانات','تنظيف واجهات المباني','مكافحة حشرات','نقل عفش','تنظيف سجاد وكنب','تخطيط المواقف والسلامة المرورية','صيانة عامة','أخرى'];
  try{ fetch(((typeof W.API==='string'&&W.API)||'')+'/api/categories').then(function(r){return r.json();}).then(function(d){ if(d&&Array.isArray(d.categories)&&d.categories.length>20){ var o=d.categories.filter(function(c){return c!=='أخرى';}); CATS=o.concat(['أخرى']); } }).catch(function(){}); }catch(e){}
  var TOP=[['⚡','كهرباء'],['🚿','سباكة'],['❄️','تبريد وتكييف'],['💧','عوازل مائية'],['🎨','دهانات وديكور'],['🧱','بلاط ورخام'],['🪵','نجارة'],['🔩','حدادة']];
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function api(p,o){ return W._api(p,o); }
  function toast(m,t){ try{ W.showToast(m,t||'success'); }catch(e){} }
  function fmt(n){ return (parseInt(n)||0).toLocaleString('en-US'); }
  function ago(d){ try{ return W.timeAgoP?W.timeAgoP(d):''; }catch(e){ return ''; } }
  function wa(ph,txt){ var n=String(ph||'').replace(/\D/g,'').replace(/^00/,'').replace(/^0/,'966'); if(!n)return ''; var u='https://wa.me/'+n+(txt?'?text='+encodeURIComponent(txt):''); try{ if(W._waFix)u=W._waFix(u); }catch(e){} return u; }
  function waT(txt){ var u='https://wa.me/?text='+encodeURIComponent(txt); try{ if(W._waFix)u=W._waFix(u); }catch(e){} return u; }
  function isNew(){ try{ if(Date.now()>new Date('2026-12-15').getTime())return false; return !localStorage.getItem('mnq_sub_seen'); }catch(e){ return false; } }
  var NEWB='<span class="sb-new">جديد</span>';
  W._subIsNew=isNew;
  W._subCount=0;
  function badgeTxt(){ return W._subCount>0?(W._subCount>99?'99+':String(W._subCount)):(isNew()?'جديد':''); }
  function markNav(){ var n=document.getElementById('ni-sub'); if(!n)return; var b=n.querySelector('.sb-new'), t=badgeTxt();
    if(t){ if(!b){ n.insertAdjacentHTML('beforeend','<span class="sb-new" style="margin-inline-start:auto"></span>'); b=n.querySelector('.sb-new'); } b.textContent=t; b.style.animation=W._subCount>0?'none':''; } else if(b) b.remove();
    var hb=document.getElementById('sb-hb'); if(hb){ hb.textContent=t; hb.style.display=t?'':'none'; } }
  function count(){ if(!W._api)return; api('/api/sub-count').then(function(r){ if(r&&typeof r.n==='number'){ W._subCount=r.n; W._subCountD=r; markNav(); } }).catch(function(){}); }
  W._subRecount=count;
  var S={hub:null,tab:'feed'};
  function css(){ if(document.getElementById('sub-css'))return; var st=document.createElement('style'); st.id='sub-css';
    st.textContent='.sb-card{background:var(--white,#fff);border:1px solid var(--border,#e3eaf6);border-radius:16px;padding:14px;margin-bottom:12px}'
    +'.sb-hero{border-color:#ddd6fe;background:linear-gradient(160deg,#f5f3ff,var(--white,#fff) 70%)}'
    +'[data-theme="dark"] .sb-hero{border-color:rgba(139,92,246,.4);background:linear-gradient(160deg,rgba(139,92,246,.14),var(--white) 70%)}'
    +'.sb-row{display:flex;align-items:center;gap:10px}.sb-ic{width:40px;height:40px;border-radius:12px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0}'
    +'[data-theme="dark"] .sb-ic{background:rgba(139,92,246,.2)}'
    +'.sb-t{font-weight:900;font-size:14.5px;color:var(--text)}.sb-s{font-size:12px;color:var(--muted);font-weight:700;line-height:1.6}'
    +'.sb-b{border:0;border-radius:12px;padding:11px 14px;font-family:inherit;font-weight:900;font-size:13.5px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none}'
    +'.sb-v{background:#7c3aed;color:#fff}.sb-o{background:var(--white,#fff);border:1px solid var(--border,#dbe5f5);color:var(--text)}.sb-g{background:#25d366;color:#fff}'
    +'.sb-tag{display:inline-block;border-radius:999px;padding:3px 9px;font-size:11px;font-weight:900;background:#ede9fe;color:#6d28d9}'
    +'[data-theme="dark"] .sb-tag{background:rgba(139,92,246,.22);color:#c4b5fd}'
    +'.sb-tabs{display:flex;gap:6px;margin-bottom:12px;overflow-x:auto}.sb-tabs button{border:1px solid var(--border,#dbe5f5);background:var(--white,#fff);color:var(--text);border-radius:999px;padding:8px 13px;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer;white-space:nowrap}'
    +'.sb-tabs button.on{background:#7c3aed;border-color:#7c3aed;color:#fff}'
    +'.sb-it{border-top:1px solid var(--border,#f1f5f9);padding:11px 0;cursor:pointer}.sb-it:first-of-type{border-top:0}'
    +'.sb-chips{display:flex;flex-wrap:wrap;gap:6px}.sb-chips button{border:1px solid var(--border,#dbe5f5);background:var(--white,#fff);color:var(--text);border-radius:999px;padding:7px 11px;font-family:inherit;font-size:12.5px;font-weight:800;cursor:pointer}'
    +'.sb-chips button.on{border-color:#7c3aed;background:#f5f3ff;color:#6d28d9}[data-theme="dark"] .sb-chips button.on{background:rgba(139,92,246,.2);color:#c4b5fd}'
    +'.sb-f{width:100%;border:1px solid var(--border,#dbe5f5);border-radius:12px;padding:11px 12px;font-family:inherit;font-size:14px;background:var(--white,#fff);color:var(--text)}'
    +'.sb-l{display:block;font-size:12.5px;font-weight:900;margin:10px 2px 5px;color:var(--text)}'
    +'.sb-ov{position:fixed;inset:0;z-index:9000;background:rgba(15,23,42,.5);display:flex;align-items:flex-end;justify-content:center}'
    +'.sb-sh{background:var(--white,#fff);color:var(--text);width:100%;max-width:560px;max-height:90vh;overflow:auto;border-radius:22px 22px 0 0;padding:14px 16px calc(22px + env(safe-area-inset-bottom,0px))}'
    +'@media(min-width:769px){.sb-ov{align-items:center}.sb-sh{border-radius:20px}}'
    +'.sb-grab{width:42px;height:5px;border-radius:5px;background:#dbe3ef;margin:0 auto 12px}'
    +'.sb-av{width:40px;height:40px;border-radius:12px;background:#e0ecff;color:#1e3a8a;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0;overflow:hidden}.sb-av img{width:100%;height:100%;object-fit:cover}'
    +'.sb-up{position:relative;display:flex;align-items:center;gap:12px;padding:15px 16px;border:2px dashed #c4b5fd;border-radius:14px;background:#faf5ff;cursor:pointer}.sb-up:hover{border-color:#7c3aed}'
    +'.sb-up input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.sb-upi{font-size:24px;line-height:1}.sb-upt{display:flex;flex-direction:column;gap:3px;min-width:0}.sb-upt b{font-size:14px;font-weight:900;color:#6d28d9}.sb-upt small{font-size:11.5px;color:var(--muted);font-weight:700}'
    +'.sb-upb{margin-inline-start:auto;font-size:11px;font-weight:900;color:#b45309;background:#fef3c7;border:1px solid #fde68a;border-radius:20px;padding:3px 9px;white-space:nowrap}'
    +'[data-theme="dark"] .sb-up{background:rgba(139,92,246,.1);border-color:rgba(139,92,246,.45)}[data-theme="dark"] .sb-upt b{color:#c4b5fd}'
    +'.sb-fi{display:flex;align-items:center;gap:10px;border:1px solid var(--border,#e3eaf6);border-radius:12px;padding:8px 10px;margin-top:8px;background:var(--white,#fff)}.sb-fi img,.sb-fx{width:42px;height:42px;border-radius:9px;object-fit:cover;flex-shrink:0;background:#eef2f9;display:flex;align-items:center;justify-content:center;font-size:20px}'
    +'.sb-fi b{display:block;font-size:12.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}.sb-fi small{font-size:11.5px;color:var(--muted);font-weight:700}.sb-fi button{border:0;background:#fee2e2;color:#b91c1c;width:28px;height:28px;border-radius:8px;cursor:pointer;font-weight:900}'
    +'.sb-new{display:inline-block;background:linear-gradient(135deg,#ef4444,#f97316);color:#fff;font-size:10.5px;font-weight:900;border-radius:999px;padding:2px 8px;line-height:1.5;vertical-align:middle;margin-inline-start:6px;animation:sbPulse 2s ease-in-out infinite}@keyframes sbPulse{50%{transform:scale(1.08)}}@media(prefers-reduced-motion:reduce){.sb-new{animation:none}}'
    +'.sb-emp{text-align:center;padding:26px 10px;color:var(--muted);font-weight:700;font-size:13px}'
    // ── نفس قوالب تجربة العميل ──
    +'.sb-stp{display:flex;justify-content:space-between;position:relative;margin:12px 0 4px}.sb-stl,.sb-stf{position:absolute;top:13px;right:28px;height:3px;border-radius:3px}.sb-stl{left:28px;background:var(--border,#e2e8f0)}.sb-stf{background:#7c3aed}'
    +'.sb-sp{width:56px;text-align:center;position:relative;z-index:1}.sb-sp span{width:28px;height:28px;border-radius:50%;margin:auto;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;background:var(--border,#e2e8f0);color:var(--muted,#64748b)}'
    +'.sb-sp.d span{background:#7c3aed;color:#fff}.sb-sp.c span{background:#f59e0b;color:#fff;box-shadow:0 0 0 4px rgba(245,158,11,.22)}.sb-sp.w span{background:#ef4444;color:#fff;box-shadow:0 0 0 4px rgba(239,68,68,.2)}.sb-sp small{display:block;font-size:10.5px;font-weight:800;color:var(--muted,#64748b);margin-top:4px;white-space:nowrap}'
    +'.sb-stp.dk .sb-stl{background:rgba(255,255,255,.22)}.sb-stp.dk .sb-sp small{color:#c7d2fe}.sb-stp.dk .sb-sp span{background:rgba(255,255,255,.18);color:#e0e7ff}.sb-stp.dk .sb-sp.d span{background:#8b5cf6;color:#fff}.sb-stp.dk .sb-sp.c span{background:#f59e0b;color:#fff}'
    +'.sb-bx{color:#fff;border-radius:20px;padding:16px;margin-bottom:12px;background-color:#0f2544;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(135deg,#0f2544,#2e1065);background-size:22px 22px,22px 22px,auto}'
    +'.sb-srch{display:flex;align-items:center;gap:8px;background:#fff;border-radius:14px;padding:4px 12px;margin-top:12px}.sb-srch input{flex:1;border:0;outline:0;background:none;font-family:inherit;font-size:14px;padding:9px 0;color:#0f1d3a;min-width:0}'
    +'.sb-fchip{border:0;border-radius:999px;padding:7px 12px;font-family:inherit;font-size:12.5px;font-weight:900;cursor:pointer;background:rgba(255,255,255,.13);color:#fff;white-space:nowrap}.sb-fchip.on{background:#fff;color:#0f2544}'
    +'.sb-fchip.lt{background:var(--white,#fff);color:var(--text);border:1px solid var(--border,#dbe5f5)}.sb-fchip.lt.on{background:#7c3aed;border-color:#7c3aed;color:#fff}.sb-fchip b{opacity:.75;margin-inline-start:2px}'
    +'.sb-seg{background:var(--white,#fff);border:1px solid var(--border,#e3eaf6);border-radius:14px;padding:4px;gap:4px}.sb-seg button{flex:1;border:0;border-radius:11px;padding:9px 6px}.sb-seg button b{font-size:11px;background:rgba(124,58,237,.15);color:#7c3aed;border-radius:99px;padding:1px 6px;margin-inline-start:3px}.sb-seg button.on b{background:rgba(255,255,255,.25);color:#fff}'
    +'.sb-fc{cursor:pointer;transition:box-shadow .15s}.sb-fc:hover{box-shadow:0 10px 24px -14px rgba(15,23,42,.35)}'
    +'.sb-th{width:70px;height:70px;border-radius:13px;flex-shrink:0;object-fit:cover;border:1px solid var(--border,#e3eaf6)}.sb-bp{display:flex;align-items:center;justify-content:center;font-size:26px;background-color:#f5f3ff;background-image:linear-gradient(#ddd6fe 1px,transparent 1px),linear-gradient(90deg,#ddd6fe 1px,transparent 1px);background-size:10px 10px}'
    +'[data-theme="dark"] .sb-bp{background-color:rgba(139,92,246,.12);background-image:linear-gradient(rgba(139,92,246,.3) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,.3) 1px,transparent 1px)}'
    +'.sb-cl2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-top:2px}'
    +'.sb-cells{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--border,#e3eaf6);border-radius:12px;margin-top:12px;text-align:center}.sb-cells div{padding:8px 4px;font-size:13.5px;font-weight:900;color:var(--text)}.sb-cells div+div{border-inline-start:1px solid var(--border,#e3eaf6)}.sb-cells small{display:block;font-size:11px;color:var(--muted);font-weight:800}'
    +'.sb-nx{display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--bg,#f8fafc);border-radius:12px;padding:9px 11px;margin-top:10px}.sb-nx span{font-size:12.5px;font-weight:800;color:var(--text)}'
    +'.sb-pbar{margin-bottom:10px}'
    +'.sb-box{border-radius:12px;padding:11px 12px;margin-top:10px;font-size:12.5px;font-weight:700;line-height:1.8;border:1px solid;color:var(--text)}.sb-box b{font-size:13.5px}'
    +'.sb-box.gr{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.35)}.sb-box.gr b{color:#16a34a}.sb-box.am{background:rgba(245,158,11,.09);border-color:rgba(245,158,11,.4)}.sb-box.am b{color:#b45309}'
    +'.sb-box.bl{background:rgba(59,130,246,.08);border-color:rgba(59,130,246,.35)}.sb-box.bl b{color:#2563eb}.sb-box.rd{background:rgba(239,68,68,.08);border-color:rgba(239,68,68,.35)}.sb-box.rd b{color:#dc2626}'
    +'.sb-box.pv{background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.35)}.sb-box.pv b{color:#7c3aed}.sb-box.gy{background:var(--bg,#f8fafc);border-color:var(--border,#e3eaf6)}'
    +'.sb-cbx{display:flex;align-items:center;gap:10px;border:1.5px solid var(--border,#dbe5f5);border-radius:14px;padding:10px 12px}.sb-cbx b{font-size:15px;color:var(--text)}.sb-cbx.ok{border-color:rgba(34,197,94,.5);background:rgba(34,197,94,.07)}'
    +'.sb-otabs{gap:6px;margin-bottom:12px;overflow-x:auto}.sb-otabs button{flex:1;border:1px solid var(--border,#dbe5f5);background:var(--white,#fff);color:var(--text);border-radius:12px;padding:10px 8px;font-family:inherit;font-weight:900;font-size:13px;cursor:pointer;white-space:nowrap}.sb-otabs button.on{background:#7c3aed;border-color:#7c3aed;color:#fff}.sb-otabs b{font-size:11px;opacity:.85}'
    +'.sb-mini{flex:1;background:var(--bg,#f8fafc);border-radius:11px;padding:8px 10px;font-weight:900;font-size:13.5px;color:var(--text)}.sb-mini small{display:block;font-size:11px;color:var(--muted);font-weight:800}'
    +'.sb-stick{position:sticky;bottom:calc(84px + env(safe-area-inset-bottom,0px));z-index:5;display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--white,#fff);border:1px solid var(--border,#e3eaf6);border-radius:16px;padding:10px 12px;margin-top:4px;box-shadow:0 12px 30px -12px rgba(15,23,42,.35)}'
    +'@media(min-width:769px){.sb-stick{bottom:14px}}'
    +'.sb-grid{display:block}@media(min-width:1000px){.sb-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start}.sb-grid>.sb-card{margin-bottom:0}.sb-grid+*{margin-top:12px}}';
    document.head.appendChild(st); }
  function sr(r){ r=r||{}; return (parseInt(r.n)>0)?'<span title="تقييم المقاولين" style="color:#6d28d9;font-weight:900">🤝 ★ '+r.avg+' ('+r.n+')</span>':''; }
  function av(name,img){ return '<span class="sb-av">'+(img&&/^https?:/.test(img)?'<img src="'+esc(img)+'" alt="">':esc(String(name||'م').charAt(0)))+'</span>'; }
  function hub(force,seen){ if(S.hub&&!force)return Promise.resolve(S.hub); return api('/api/sub/hub'+(seen?'?seen=1':'')).then(function(d){ if(d&&d.feed){ S.hub=d; } return S.hub||{mine:[],feed:[],partners:[]}; }); }
  // ── أدوات مشتركة: نفس شكل تجربة العميل (مراحل · حالة · بطاقات) بلون بنفسجي ──
  var EMO={'كهرباء':'⚡','سباكة':'🚿','تبريد وتكييف':'❄️','عوازل مائية':'💧','عزل حراري':'🧊','دهانات وديكور':'🎨','جبس':'🧱','بلاط ورخام':'🧱','نجارة':'🪵','حدادة':'🔩','ألمنيوم':'🪟','زجاج ومرايا':'🪟','كاميرات مراقبة':'📹','شبكات وإنترنت':'📶','أنظمة شمسية':'☀️','بناء':'🏗️','ترميم مبانٍ':'🛠️','تنظيف':'🧽','مكافحة حشرات':'🐜','نقل عفش':'🚚','تنسيق حدائق':'🌿','مسابح':'🏊','تركيب مطابخ':'🍳','أبواب وبوابات':'🚪','هدم':'⛏️'};
  function emo(c){ return EMO[c]||'🛠️'; }
  function ttl(x){ var t=String(x.title||'').trim(); if(t)return t; var d=String(x.description||'').replace(/\s+/g,' ').trim(); return d.length>70?d.slice(0,70)+'…':d; }
  function leftDays(x){ var e=x.expires_at?new Date(x.expires_at).getTime():new Date(x.created_at).getTime()+30*864e5; return Math.max(0,Math.ceil((e-Date.now())/864e5)); }
  var STAT={review:['تحت المراجعة','#dbeafe','#1d4ed8'],needs_edit:['يحتاج تعديل','#fef3c7','#92400e'],rejected:['ما انتشر','#fee2e2','#b91c1c'],open:['يستقبل عروض','#dcfce7','#166534'],awarded:['قيد التنفيذ','#ede9fe','#6d28d9'],closed:['انقفل','#f1f5f9','#64748b']};
  function pill(x){ var s=STAT[x.status]||STAT.closed; if(x.status==='awarded'&&x.work_state==='done') s=['اكتمل','#dcfce7','#166534']; return '<span class="sb-tag" style="background:'+s[1]+';color:'+s[2]+';white-space:nowrap">'+(x.status==='open'?'● ':'')+s[0]+'</span>'; }
  // المراحل: أرسلته ← المراجعة ← العروض ← اخترت فني ← اكتمل
  function stage(x){ if(x.status==='review'||x.status==='needs_edit'||x.status==='rejected')return 2; if(x.status==='open'||x.status==='closed')return 3; if(x.status==='awarded')return x.work_state==='done'?6:4; return 1; }
  function steps(x,dark){ var cur=stage(x), L=['أرسلته','المراجعة','العروض','اخترت فني','اكتمل'], warn=x.status==='needs_edit'||x.status==='rejected';
    var f=((Math.min(cur,5)-1)/4).toFixed(3);
    return '<div class="sb-stp'+(dark?' dk':'')+'"><i class="sb-stl"></i><i class="sb-stf" style="width:calc((100% - 56px) * '+f+')"></i>'+L.map(function(l,i){ var n=i+1, c=n<cur?'d':(n===cur?(warn?'w':'c'):''); return '<div class="sb-sp '+c+'"><span>'+(c==='d'?'✓':(c==='w'?'!':n))+'</span><small>'+l+'</small></div>'; }).join('')+'</div>'; }
  function next(x){ var n=parseInt(x.offers)||0;
    if(x.status==='review')return ['🕐 فريق مناقصة يراجعه','تعديل','SubC.edit('+x.id+')'];
    if(x.status==='needs_edit')return ['📝 '+String(x.review_note||'يحتاج تعديل بسيط').slice(0,60),'عدّل','SubC.edit('+x.id+')'];
    if(x.status==='rejected')return ['ℹ️ ما انتشر','التفاصيل','SubC.open('+x.id+')'];
    if(x.status==='open')return n?['💬 وصلك '+n+(n===1?' عرض':' عروض')+' — قارنها','شاهد العروض','SubC.open('+x.id+')']:['⏳ ننتظر أول عرض','شارك الرابط','SubC.open('+x.id+',\'share\')'];
    if(x.status==='awarded')return x.work_state==='done'?['✅ اكتمل الشغل','التفاصيل','SubC.open('+x.id+')']:['🛠️ '+(x.work_state==='started'?'الشغل بدأ — خلص؟':'بدأ الشغل؟'),'حدّث','SubC.open('+x.id+')'];
    return ['🔒 انقفل — تقدر تفتحه أسبوع ثاني','افتحه','SubC.ext('+x.id+')']; }
  function saved(){ try{ return JSON.parse(localStorage.getItem('mnq_sub_saved')||'[]'); }catch(e){ return []; } }
  function toggleSave(id,ev){ if(ev)ev.stopPropagation(); var L=saved(), i=L.indexOf(id); if(i>=0)L.splice(i,1); else L.unshift(id); try{ localStorage.setItem('mnq_sub_saved',JSON.stringify(L.slice(0,100))); }catch(e){} toast(i>=0?'انشال من المحفوظة':'🔖 انحفظ'); render(); }
  // ── بطاقة الرئيسية ──
  function homeCard(){
    css(); var pg=document.getElementById('page-home'); if(!pg)return;
    var k=pg.querySelector('.pa-kpis'); if(!k)return;
    var box=document.getElementById('sb-home'); if(!box){ box=document.createElement('div'); box.id='sb-home'; k.parentNode.insertBefore(box,k.nextSibling); }
    hub(true).then(function(d){
      var open=(d.feed||[]).filter(function(x){return x.status==='open'&&!x.my_offer;});
      var cur=(d.mine||[]).filter(function(x){ return ['review','needs_edit','open'].indexOf(x.status)>=0||(x.status==='awarded'&&x.work_state!=='done'); })[0];
      var h='';
      if(cur){ var nx=next(cur);
        h+='<div class="sb-bx" style="margin-bottom:12px"><div class="sb-row" style="justify-content:space-between;align-items:flex-start"><div style="min-width:0"><div style="font-size:11.5px;font-weight:800;opacity:.75">🤝 طلبك الحالي · مقاول باطن</div><div style="font-weight:900;font-size:16px;line-height:1.5;margin-top:2px">'+esc(ttl(cur))+'</div></div>'+pill(cur)+'</div>'+steps(cur,true)
          +'<div style="background:rgba(255,255,255,.1);border-radius:12px;padding:9px 11px;font-size:12.5px;font-weight:800;margin-top:6px">'+esc(nx[0])+'</div>'
          +'<div class="sb-row" style="gap:8px;margin-top:10px"><button type="button" class="sb-b" style="flex:2;background:#fff;color:#0f2544" onclick="SubC.open('+cur.id+')">'+(cur.status==='open'&&cur.offers?'شاهد العروض':'افتح طلبك')+'</button><button type="button" class="sb-b" style="flex:1;background:rgba(255,255,255,.14);color:#fff" onclick="SubC.form()">＋ طلب جديد</button></div></div>';
      } else h+='<div class="sb-card sb-hero"><div class="sb-row"><span class="sb-ic">🤝</span><div style="flex:1;min-width:0"><div class="sb-t">تحتاج مقاول باطن؟<span class="sb-new" id="sb-hb" style="'+(badgeTxt()?'':'display:none')+'">'+badgeTxt()+'</span></div><div class="sb-s">كمّل مشاريعك بفنيين من مدينتك — بدون ما تدوّر</div></div></div>'
        +'<div class="sb-row" style="gap:8px;margin-top:12px"><button type="button" class="sb-b sb-v" style="flex:1" onclick="SubC.form()">＋ اطلب مقاول باطن</button><button type="button" class="sb-b sb-o" onclick="SubC.go(\'partners\')">شركائي'+((d.partners||[]).length?' ('+d.partners.length+')':'')+'</button></div></div>';
      var st=d.stats||{};
      if(st.worked||st.saved_me||st.offers_made) h+='<div class="sb-card sb-row" style="justify-content:space-around;text-align:center;padding:11px 8px"><div><b style="font-size:19px;color:#7c3aed">'+(st.worked||0)+'</b><div class="sb-s" style="font-size:11px">مقاولين اشتغلت معهم</div></div><div><b style="font-size:19px;color:#7c3aed">'+(st.saved_me||0)+'</b><div class="sb-s" style="font-size:11px">حفظوك شريك</div></div><div><b style="font-size:19px;color:#7c3aed">'+(st.offers_made||0)+'</b><div class="sb-s" style="font-size:11px">عروض قدّمتها</div></div></div>';
      if(open.length) h+='<div class="sb-card"><div class="sb-row" style="justify-content:space-between"><span class="sb-t">🤝 طلبات من مقاولين تناسبك</span><button type="button" class="sb-b" style="padding:4px;background:none;color:#7c3aed;font-size:12.5px" onclick="SubC.go(\'feed\')">الكل ›</button></div>'
        +open.slice(0,2).map(function(x){ return '<div class="sb-it sb-row" onclick="SubC.open('+x.id+')"><div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(x.from_partner?'⭐ ':'')+esc(ttl(x))+'</div><div class="sb-s">'+esc(x.category)+' · من '+esc(x.owner_name||'مقاول')+(x.city?' · '+esc(x.city):'')+'</div></div><span class="sb-b sb-v" style="padding:8px 12px;font-size:12px">قدّم عرض</span></div>'; }).join('')+'</div>';
      box.innerHTML=h;
    }).catch(function(){});
  }
  // ── صفحة #sub ──
  function go(tab){ S.tab=tab||'feed'; S.view=null; if(W._curPage==='sub'){ try{ if((location.hash||'')!=='#sub') history.pushState({pg:'sub'},'','#sub'); }catch(e){} render(); } else W.gotoPage('sub'); }
  function load(){ css(); try{ localStorage.setItem('mnq_sub_seen','1'); }catch(e){} setTimeout(markNav,0); var pg=document.getElementById('page-sub'); if(!pg)return; S.view=null;
    if(!S.hub) pg.innerHTML='<div class="loading">جاري التحميل...</div>';
    hub(true,1).then(function(){ if(W._subOpen){ var i=W._subOpen; W._subOpen=0; open(i,null,true); } else if(S.formNext){ var f=S.formNext; S.formNext=0; S.introPass=true; form(f===1?null:f); } else render(); setTimeout(count,800); }).catch(function(){ pg.innerHTML='<div class="sb-emp">تعذّر التحميل</div>'; }); }
  function tabs(d){ var nF=(d.feed||[]).filter(function(x){return x.status==='open'&&!x.my_offer;}).length;
    return '<div class="sb-tabs sb-seg"><button type="button" class="'+(S.tab==='feed'?'on':'')+'" onclick="SubC.go(\'feed\')">طلبات المقاولين'+(nF?' <b>'+nF+'</b>':'')+'</button><button type="button" class="'+(S.tab==='mine'?'on':'')+'" onclick="SubC.go(\'mine\')">طلباتي'+(d.mine.length?' <b>'+d.mine.length+'</b>':'')+'</button><button type="button" class="'+(S.tab==='partners'?'on':'')+'" onclick="SubC.go(\'partners\')">⭐ شركائي'+(d.partners.length?' <b>'+d.partners.length+'</b>':'')+'</button></div>'; }
  function feedCard(x){ var my=x.my_offer, sv=saved().indexOf(x.id)>=0, img=(x.attachments||[]).filter(isImg)[0], age=(Date.now()-new Date(x.created_at))/36e5;
    var st=my?(my.status==='accepted'?'<span class="sb-tag" style="background:#dcfce7;color:#166534;padding:8px 12px">🎉 اعتمد عرضك</span>':(my.status==='rejected'?'<span class="sb-tag" style="background:#f1f5f9;color:#64748b;padding:8px 12px">اختار غيرك</span>':'<span class="sb-tag" style="background:#e0ecff;color:#1d4ed8;padding:8px 12px">✓ قدّمت '+fmt(my.price)+(my.seen_at?' · 👀 شاف عرضك':'')+'</span>')):'';
    return '<div class="sb-card sb-fc" onclick="SubC.open('+x.id+')"><div class="sb-row" style="justify-content:space-between"><span class="sb-row" style="gap:6px"><span class="sb-tag">'+emo(x.category)+' '+esc(x.category)+'</span>'+(x.from_partner?'<span class="sb-tag" style="background:#fef3c7;color:#92400e">⭐ من شريكك</span>':'')+'</span><span class="sb-tag" style="background:#dbeafe;color:#1d4ed8">'+(age<24&&x.status==='open'?'🆕 ':'')+'نزل '+esc(ago(x.created_at))+'</span></div>'
      +'<div class="sb-row" style="align-items:flex-start;margin-top:10px;gap:12px"><div style="flex:1;min-width:0"><div class="sb-t" style="font-size:15.5px;line-height:1.55">'+esc(ttl(x))+'</div>'+(x.title?'<div class="sb-s sb-cl2">'+esc(x.description)+'</div>':'')+'</div>'
        +(img?'<img class="sb-th" src="'+esc(img.url)+'" alt="" loading="lazy">':'<span class="sb-th sb-bp">'+emo(x.category)+'</span>')+'</div>'
      +'<div class="sb-cells"><div><small>المدينة</small>'+esc(x.city||'—')+'</div><div><small>العروض</small><span style="color:'+(x.offers?'inherit':'#16a34a')+'">'+(x.offers?x.offers:'كن الأول')+'</span></div><div><small>الميزانية</small>'+(x.budget?fmt(x.budget):'غير محددة')+'</div></div>'
      +'<div class="sb-row" style="margin-top:12px;gap:8px">'+(st?'<div style="flex:1">'+st+'</div>':'<span class="sb-b sb-v" style="flex:1;padding:12px">قدّم عرضك</span>')+'<button type="button" class="sb-b sb-o" style="padding:11px 13px'+(sv?';color:#7c3aed;border-color:#c4b5fd':'')+'" aria-label="حفظ" onclick="SubC.save('+x.id+',event)">'+(sv?'🔖 محفوظ':'🔖')+'</button></div></div>'; }
  function render(){
    var pg=document.getElementById('page-sub'); if(!pg||!S.hub)return; var d=S.hub; S.view=null;
    var h=tabs(d);
    if(S.tab==='feed'){
      var F2=S.ff||'all', q=String(S.q||'').trim(), sv=saved();
      h+='<div class="sb-bx"><div class="sb-row" style="justify-content:space-between;align-items:flex-start"><div><div style="font-family:Cairo,sans-serif;font-weight:900;font-size:20px">🤝 طلبات المقاولين</div><div style="font-size:12.5px;font-weight:700;opacity:.85">شغل إضافي يجيك من مقاولين — بدون تسويق</div></div><button type="button" class="sb-b" style="background:rgba(255,255,255,.14);color:#fff;padding:7px 11px;font-size:12px;white-space:nowrap" onclick="SubC.form()">＋ اطلب</button></div>'
        +'<div class="sb-srch"><span>🔍</span><input id="sb-q" placeholder="ابحث: كهرباء، سباكة، جبس…" value="'+esc(q)+'" oninput="SubC.q(this.value)"></div>'
        +'<div class="sb-row" style="gap:6px;flex-wrap:wrap;margin-top:10px">'+[['all','يناسبني'],['partner','⭐ من شركائي'],['low','منافسة قليلة'],['saved','المحفوظة']].map(function(f){ return '<button type="button" class="sb-fchip'+(F2===f[0]?' on':'')+'" onclick="SubC.ff(\''+f[0]+'\')">'+f[1]+'</button>'; }).join('')+'</div></div>';
      var qn=q.replace(/[أإآ]/g,'ا').replace(/ة/g,'ه');
      var FL=(d.feed||[]).filter(function(x){ if(F2==='partner'&&!x.from_partner)return false; if(F2==='low'&&(parseInt(x.offers)||0)>2)return false; if(F2==='saved'&&sv.indexOf(x.id)<0)return false;
        if(qn){ var hay=((x.title||'')+' '+(x.description||'')+' '+(x.category||'')+' '+(x.city||'')).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه'); if(hay.indexOf(qn)<0)return false; } return true; });
      h+=FL.length?'<div class="sb-grid">'+FL.map(feedCard).join('')+'</div>'
        :(d.no_spec?'<div class="sb-card sb-emp">حدّد تخصصاتك عشان توصلك طلبات المقاولين اللي تناسبك.<br><button type="button" class="sb-b sb-v" style="margin-top:12px" onclick="gotoPage(\'profile\')">حدّد تخصصاتك</button></div>':'<div class="sb-card sb-emp">'+(F2!=='all'||q?'ما فيه طلبات بهالفلتر.':'ما فيه طلبات من مقاولين في تخصصك ومدينتك الحين.<br>يوصلك إشعار أول ما ينزل طلب.')+'</div>');
      h+='<div class="sb-card" style="background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.35)"><div class="sb-s"><b style="color:#16a34a">💡 ليش تقدّم؟</b> المقاول اللي يرتاح لك يحفظك في شركائه — ويوصلك شغله قبل غيرك بساعتين</div></div>';
    } else if(S.tab==='mine'){
      var MT=S.mt||'all', cnt={all:d.mine.length,open:0,work:0};
      d.mine.forEach(function(x){ if(['review','needs_edit','open'].indexOf(x.status)>=0)cnt.open++; if(x.status==='awarded'&&x.work_state!=='done')cnt.work++; });
      h+='<div class="sb-row" style="justify-content:space-between;margin:2px 0 10px"><b style="font-family:Cairo,sans-serif;font-size:19px">طلباتي</b><button type="button" class="sb-b sb-v" style="padding:8px 14px" onclick="SubC.form()">＋ جديد</button></div>'
        +'<div class="sb-row" style="gap:6px;margin-bottom:12px;overflow-x:auto">'+[['all','الكل'],['open','يستقبل عروض'],['work','قيد التنفيذ']].map(function(t){ return '<button type="button" class="sb-fchip lt'+(MT===t[0]?' on':'')+'" onclick="SubC.mt(\''+t[0]+'\')">'+t[1]+' <b>'+cnt[t[0]]+'</b></button>'; }).join('')+'</div>';
      var ML=d.mine.filter(function(x){ if(MT==='open')return ['review','needs_edit','open'].indexOf(x.status)>=0; if(MT==='work')return x.status==='awarded'&&x.work_state!=='done'; return true; });
      h+=ML.length?'<div class="sb-grid">'+ML.map(function(x){ var nx=next(x);
        return '<div class="sb-card sb-fc" onclick="SubC.open('+x.id+')"><div class="sb-row" style="align-items:flex-start"><span class="sb-ic" style="width:46px;height:46px;font-size:22px">'+emo(x.category)+'</span><div style="flex:1;min-width:0"><div class="sb-t" style="font-size:15px;line-height:1.5">'+esc(ttl(x))+'</div><div class="sb-s">'+esc(x.category)+(x.city?' · '+esc(x.city):'')+' · '+esc(ago(x.status==='open'||x.status==='awarded'||x.status==='closed'?x.created_at:(x.submitted_at||x.created_at)))+'</div></div>'+pill(x)+'</div>'
          +steps(x)
          +(x.pending_desc?'<div class="sb-s" style="color:#6d28d9;margin-top:4px">✏️ تعديلك تحت المراجعة</div>':'')
          +'<div class="sb-nx"><span>'+esc(nx[0])+'</span><button type="button" class="sb-b sb-o" style="padding:7px 12px;font-size:12px" onclick="event.stopPropagation();'+nx[2]+'">'+nx[1]+'</button></div></div>'; }).join('')+'</div>'
        +'<div class="sb-s" style="text-align:center">باقي لك '+(d.month_left||0)+' طلبات هالشهر</div>'
        :'<div class="sb-card sb-emp">'+(MT==='all'?'ما طلبت مقاول باطن للحين.<br><button type="button" class="sb-b sb-v" style="margin-top:12px" onclick="SubC.form()">＋ اطلب أول طلب</button>':'ما فيه طلبات هنا.')+'</div>';
    } else {
      h+=d.partners.length?'<div class="sb-card">'+d.partners.map(function(p){ return '<div class="sb-it sb-row" style="cursor:default">'+av(p.name,p.profile_image)+'<div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13.5px">'+esc(p.name)+'</div><div class="sb-s">'+esc((p.specialties||[]).slice(0,2).join('، '))+(p.city?' · '+esc(p.city):'')+(parseFloat(p.rating)>0?' · ⭐ '+p.rating:'')+(sr(p.srate)?' · '+sr(p.srate):'')+'</div></div>'
          +(p.phone?'<a class="sb-b sb-g" style="padding:8px 11px" href="'+esc(wa(p.phone,'السلام عليكم، معك من منصة مناقصة'))+'" target="_blank" rel="noopener" aria-label="واتساب">واتساب</a>':'')
          +'<button type="button" class="sb-b sb-o" style="padding:8px 10px" onclick="SubC.unp('+p.id+')" aria-label="إزالة">✕</button></div>'; }).join('')+'</div>'
        +'<div class="sb-s" style="text-align:center">شركاؤك توصلهم طلباتك قبل غيرهم بساعتين</div>'
        :'<div class="sb-card sb-emp">⭐ شركاؤك هم المزوّدين اللي اشتغلت معهم وارتحت لهم.<br>بعد ما تعتمد عرض على طلبك، نسألك: تضيفه لشركائك؟</div>';
    }
    pg.innerHTML=h;
  }
  // ── نموذج الطلب ──
  var F={cat:'',atts:[]};
  function sheet(html){ css(); var o=document.getElementById('sbOv'); if(o)o.remove(); o=document.createElement('div'); o.id='sbOv'; o.className='sb-ov'; o.innerHTML='<div class="sb-sh" role="dialog"><div class="sb-grab"></div>'+html+'</div>'; o.addEventListener('click',function(e){ if(e.target===o)o.remove(); }); document.body.appendChild(o); return o; }
  function closeSheet(){ var o=document.getElementById('sbOv'); if(o)o.remove(); }
  function isImg(a){ return /\.(jpe?g|png|webp|gif|heic)(\?|$)/i.test(a.url||'')||(/\/image\/upload\//.test(a.url||'')&&!/\.(pdf|dwg|dxf|xlsx?|docx?|zip|rar)$/i.test(a.name||'')); }
  function sz(b){ b=+b||0; if(b>=1048576)return (b/1048576).toFixed(b>=10485760?0:1)+' MB'; return Math.max(1,Math.round(b/1024))+' KB'; }
  function paintF(){ var L=document.getElementById('sb-fl'), T=document.getElementById('sb-ft'); if(!L)return;
    L.innerHTML=(F.keep||[]).map(function(a,i){ return '<div class="sb-fi">'+(isImg(a)?'<img src="'+esc(a.url)+'" alt="">':'<span class="sb-fx">📄</span>')+'<div style="flex:1;min-width:0"><b>'+esc(a.name||'مرفق')+'</b><small>مرفوع</small></div><button type="button" aria-label="إزالة" onclick="SubC.rmK('+i+')">✕</button></div>'; }).join('')+F.atts.map(function(a,i){ return '<div class="sb-fi">'+(a.kind==='img'&&a.data?'<img src="'+a.data+'" alt="">':'<span class="sb-fx">'+(a.kind==='img'?'🖼️':'📄')+'</span>')+'<div style="flex:1;min-width:0"><b>'+esc(a.name)+'</b><small>'+(a.data?sz(a.size):'جاري التجهيز…')+'</small></div><button type="button" aria-label="إزالة" onclick="SubC.rmF('+i+')">✕</button></div>'; }).join('');
    var tot=F.atts.reduce(function(s,a){return s+(a.size||0);},0); if(T) T.textContent=F.atts.length?('المجموع: '+F.atts.length+' ملف · '+sz(tot)+(tot>25*1048576?' — كبير، ممكن يتأخر الرفع':'')):''; }
  function cityHtml(v){ var R=W._PROV_REGIONS||{}, has=false, h='';
    Object.keys(R).forEach(function(r){ h+='<optgroup label="'+esc('منطقة '+r)+'">'+R[r].map(function(c){ if(c===v)has=true; return '<option'+(c===v?' selected':'')+'>'+esc(c)+'</option>'; }).join('')+'</optgroup>'; });
    return '<select class="sb-f" id="sb-city"><option value="">— اختر المدينة —</option>'+(v&&!has?'<option selected>'+esc(v)+'</option>':'')+h+'</select>'; }
  // بطاقة تعريف: تطلع أول مرة يضغط «اطلب مقاول باطن» (وتنفتح بعدها من «وش هو؟» داخل النموذج)
  function introSeen(){ try{ return !!localStorage.getItem('mnq_sub_intro'); }catch(e){ return false; } }
  function intro(fromForm){ css();
    var st=function(n,t,d){ return '<div class="sb-row" style="align-items:flex-start;gap:10px;margin-top:10px"><span style="width:26px;height:26px;border-radius:50%;background:#ede9fe;color:#6d28d9;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px">'+n+'</span><div><div class="sb-t" style="font-size:13.5px">'+t+'</div><div class="sb-s">'+d+'</div></div></div>'; };
    var old=document.getElementById('sbIntro'); if(old)old.remove();
    var o=document.createElement('div'); o.id='sbIntro'; o.className='sb-ov'; o.style.zIndex='9100'; o.onclick=function(e){ if(e.target===o)o.remove(); };
    o.innerHTML='<div class="sb-sh" role="dialog" aria-label="وش هو مقاول باطن">'+('<div class="sb-row" style="gap:12px"><span style="width:48px;height:48px;border-radius:14px;background:#ede9fe;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🤝</span><div style="flex:1"><div class="sb-t" style="font-size:17px">«مقاول باطن» — وش هو؟</div><div class="sb-s">تطلب مزوّد يكمّل معك شغل عندك</div></div><button type="button" class="sb-b sb-o" style="padding:6px 10px" onclick="var i=document.getElementById(\'sbIntro\');if(i)i.remove()" aria-label="إغلاق">✕</button></div>'
      +'<div style="background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.35);border-radius:12px;padding:10px 12px;font-size:12.5px;font-weight:800;line-height:1.8;margin-top:12px"><b style="color:#16a34a">✓ مثال صحيح:</b> «أحتاج كهربائي لتمديدات فيلا دورين 40 نقطة في الرياض، أبدأ الأسبوع الجاي»</div>'
      +'<div style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.35);border-radius:12px;padding:10px 12px;font-size:12.5px;font-weight:800;line-height:1.8;margin-top:8px"><b style="color:#dc2626">✗ مو للإعلان</b> عن خدماتك وأسعارك — مكانها صفحتك العامة</div>'
      +st(1,'تنشر وش تحتاج','التخصص، المدينة، الشغل بالتفصيل، والمخطط لو عندك')
      +st(2,'نراجعه بسرعة','فريق مناقصة يتأكد إنه واضح، وبعدها يوصل شركاءك أول ثم الفنيين في مدينتك')
      +st(3,'توصلك العروض','يسألونك بالمحادثة ويقدّمون أسعارهم — ورقمك يظهر بس للي يقدّم')
      +st(4,'تعتمد الأنسب','تتواصلون وتتفقون، وتحفظه في «شركائي» لو ارتحت له')
      +'<button type="button" class="sb-b sb-v" style="width:100%;margin-top:16px;padding:13px" onclick="SubC.introGo()">'+(fromForm?'فهمت — كمّل طلبي':'فهمت — اطلب الحين')+'</button>'
      +(fromForm?'':'<label class="sb-s" style="display:flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;cursor:pointer"><input type="checkbox" id="sb-intro-no" checked style="width:16px;height:16px;accent-color:#7c3aed"> لا تعرضها لي مرة ثانية</label>'))+'</div>';
    document.body.appendChild(o); S.introForm=!!fromForm; }
  function introGo(){ var c=document.getElementById('sb-intro-no'), i=document.getElementById('sbIntro'); if(i)i.remove(); if(S.introForm)return;
    try{ if(!c||c.checked) localStorage.setItem('mnq_sub_intro','1'); }catch(e){} S.introPass=true; form(); }
  // صفحة كاملة داخل «مقاول باطن» (بدل النافذة) — نفس شعور صفحات العميل
  function page(html,back){ css(); closeSheet(); var pg=document.getElementById('page-sub'); if(!pg)return null;
    pg.innerHTML='<div class="sb-pbar"><button type="button" class="sb-b sb-o" style="padding:7px 12px" onclick="'+(back||'SubC.back2()')+'">› رجوع</button></div>'+html; try{ window.scrollTo(0,0); }catch(e){} return pg; }
  function form(ed){
    if(!ed&&!introSeen()&&!S.introPass){ intro(false); return; }
    S.introPass=false;
    if(W._curPage!=='sub'){ S.formNext=ed||1; W.gotoPage('sub'); return; }
    F={cat:ed?ed.category:'',catAuto:false,catManual:!!ed,cands:[],atts:[],keep:ed?(ed.attachments||[]).slice():[],edit:ed?ed.id:0}; var d=S.hub||{partners:[]}, me=W._prof||{};
    S.view={form:ed?ed.id:'new'};
    try{ var hh=ed?'#sub/'+ed.id+'/edit':'#sub/new'; if(location.hash!==hh) history.pushState({pg:'sub'},'',hh); }catch(e){}
    var o=page('<div class="sb-row" style="justify-content:space-between;margin:4px 0 10px"><b style="font-family:Cairo,sans-serif;font-size:19px">'+(ed?'✏️ تعديل الطلب':'🤝 طلب مقاول باطن')+'</b><a href="#" class="sb-s" style="color:#6d28d9;font-weight:900" onclick="event.preventDefault();SubC.introF()">ℹ️ وش هو؟</a></div>'
      +(ed?'':'<div class="sb-card" style="background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.35)"><div class="sb-t" style="color:#7c3aed;font-size:14px">✍️ اكتب طلب يجيب لك أفضل الفنيين</div><div class="sb-s" style="margin-top:4px">📝 اشرح الشغل بالضبط — الكمية، المساحة، المواصفات<br>📎 أرفق المخطط أو صورة — العروض تجي أدق<br>⏱️ قل متى تبي تبدأ</div></div>')
      +'<div class="sb-card">'
      +'<label class="sb-l" style="margin-top:0;font-size:14.5px">وش تحتاج؟ <span style="color:#ef4444">*</span></label><input class="sb-f" id="sb-title" maxlength="150" placeholder="مثال: تمديدات كهرباء فيلا دورين 40 نقطة" value="'+esc(ed&&ed.title||'')+'" autocomplete="off">'
      +'<div id="sb-catbox" style="margin-top:8px"></div>'
      +'<div id="sb-catpick" style="display:none;margin-top:8px"><div class="sb-chips" id="sb-cats">'+TOP.map(function(c){return '<button type="button" data-c="'+esc(c[1])+'">'+c[0]+' '+esc(c[1])+'</button>';}).join('')+'<button type="button" data-c="_more">＋ غيرها</button></div><div id="sb-cat-all" style="display:none;margin-top:8px"><input class="sb-f" id="sb-cq" placeholder="🔍 اكتب التخصص… مثلاً: مصاعد" autocomplete="off"><div class="sb-chips" id="sb-cl" style="margin-top:8px;max-height:190px;overflow:auto"></div></div></div>'
      +'<label class="sb-l">التفاصيل <span style="color:#ef4444">*</span></label><textarea class="sb-f" id="sb-desc" rows="4" maxlength="1500" placeholder="اشرح الشغل بالتفصيل…&#10;مثال: مع تركيب اللوحة الرئيسية، التوريد عليّ والتركيب على الفني، المخطط جاهز">'+esc(ed&&ed.description||'')+'</textarea>'
      +'<div class="sb-row" style="gap:8px"><div style="flex:1"><label class="sb-l">المدينة <span style="color:#ef4444">*</span></label>'+cityHtml(ed?(ed.city||''):(me.city||''))+'</div><div style="flex:1"><label class="sb-l">الحي</label><input class="sb-f" id="sb-dist" maxlength="60" placeholder="اختياري" value="'+esc(ed&&ed.district||'')+'"></div></div>'
      +'<div class="sb-row" style="gap:8px"><div style="flex:1"><label class="sb-l">متى تبدأ؟</label><input class="sb-f" id="sb-start" maxlength="60" placeholder="مثال: الأسبوع الجاي" value="'+esc(ed&&ed.start_text||'')+'"></div><div style="flex:1"><label class="sb-l">الميزانية (اختياري)</label><input class="sb-f" id="sb-bud" inputmode="numeric" placeholder="ر.س" oninput="var d=this.value.replace(/[٠-٩]/g,function(x){return \'٠١٢٣٤٥٦٧٨٩\'.indexOf(x);}).replace(/[^0-9]/g,\'\');this.value=d?Number(d).toLocaleString(\'en-US\'):\'\'" value="'+(ed&&ed.budget?fmt(ed.budget):'')+'"></div></div>'
      +'<label class="sb-l">📎 المرفقات — تساعد الفني يعطيك سعر دقيق</label>'
      +'<label class="sb-up"><input type="file" id="sb-img" accept="image/*" multiple><span class="sb-upi">🖼️</span><span class="sb-upt"><b>اضغط لإضافة صور</b><small>صور الموقع أو الشغل · حتى 6 صور</small></span></label>'
      +'<label class="sb-up" style="margin-top:8px"><input type="file" id="sb-doc" accept=".pdf,.dwg,.dxf,.xlsx,.xls,.docx,.doc,.zip,.rar"><span class="sb-upi">📐</span><span class="sb-upt"><b>ارفع المخطط أو الملفات</b><small>PDF · DWG · Excel · Word · ZIP — حتى 4 ملفات</small></span><span class="sb-upb">مهم للأسعار</span></label>'
      +'<div id="sb-fl"></div><div class="sb-s" id="sb-ft" style="margin-top:4px"></div></div>'
      +(!ed&&(d.partners||[]).length?'<label class="sb-card sb-row" style="padding:11px 12px;cursor:pointer;border-color:#ddd6fe"><span>⭐</span><div style="flex:1"><div class="sb-t" style="font-size:13px">شركائي أول</div><div class="sb-s">شركاؤك الـ'+d.partners.length+' يوصلهم قبل غيرهم بساعتين</div></div><input type="checkbox" id="sb-pf" checked style="width:20px;height:20px;accent-color:#7c3aed"></label>':'')
      +'<button type="button" class="sb-b sb-v" id="sb-send" style="width:100%;padding:14px;font-size:15px" onclick="SubC.send()">'+(ed?'احفظ التعديل':'انشر الطلب')+'</button>'
      +'<div class="sb-s" style="text-align:center;margin:8px 0 90px">'+(ed?(ed.status==='open'?'تعديل العنوان أو الوصف يراجعه فريق مناقصة، والباقي يتعدّل مباشرة':'يرجع لفريق مناقصة يراجعه وينشره'):'يراجعه فريق مناقصة، وبعدها يوصل الفنيين المناسبين في مدينتك')+'</div>',
      ed?'SubC.open('+ed.id+')':'SubC.back2()');
    if(!o)return;
    paintF(); paintCat();
    var nz=function(t){ return String(t||'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/^ال/,'').trim(); };
    var topN=TOP.map(function(t){return t[1];});
    var paintCL=function(){ var q=nz((document.getElementById('sb-cq')||{}).value||''), L=document.getElementById('sb-cl'); if(!L)return;
      var arr=CATS.filter(function(c){ return topN.indexOf(c)<0&&(!q||nz(c).indexOf(q)>=0||c.split(' ').some(function(w){return nz(w).indexOf(q)===0;})); });
      L.innerHTML=arr.length?arr.map(function(c){ return '<button type="button" data-k="'+esc(c)+'" class="'+(F.cat===c?'on':'')+'">'+(F.cat===c?'✓ ':'')+esc(c)+'</button>'; }).join(''):'<div class="sb-s">ما لقينا تخصص بهالاسم — اختر «أخرى» واكتبه في التفاصيل</div>'; };
    var pick=function(c){ F.cat=c; F.catManual=true; F.catAuto=false; document.getElementById('sb-catpick').style.display='none'; paintCat(); };
    if(!ed){
      var tmr=null; o.querySelector('#sb-title').addEventListener('input',function(){ clearTimeout(tmr); var v=this.value; tmr=setTimeout(function(){ detectCat(v); },300); });
      o.querySelector('#sb-cats').addEventListener('click',function(e){ var b=e.target.closest('button[data-c]'); if(!b)return; var c=b.getAttribute('data-c'); var box=document.getElementById('sb-cat-all');
        if(c==='_more'){ box.style.display=''; paintCL(); setTimeout(function(){ var q=document.getElementById('sb-cq'); if(q)q.focus(); },30); } else pick(c); });
      o.querySelector('#sb-cq').addEventListener('input',paintCL);
      o.querySelector('#sb-cl').addEventListener('click',function(e){ var b=e.target.closest('button[data-k]'); if(!b)return; pick(b.getAttribute('data-k')); });
      o.querySelector('#sb-catbox').addEventListener('click',function(e){ var b=e.target.closest('[data-cb]'); if(!b)return; var k=b.getAttribute('data-cb');
        if(k==='chg'){ var p=document.getElementById('sb-catpick'); p.style.display=p.style.display==='none'?'':'none'; } else pick(k); });
    }
    var add=function(inp,kind){ var fs=[].slice.call(inp.files||[]); inp.value='';
      fs.forEach(function(f){
        var n=F.atts.filter(function(a){return a.kind===kind;}).length+(kind==='img'?F.keep.filter(isImg).length:F.keep.filter(function(a){return !isImg(a);}).length); if(n>=(kind==='img'?6:4)){ toast(kind==='img'?'الحد 6 صور':'الحد 4 ملفات','error'); return; }
        if(f.size>15*1024*1024){ toast('«'+f.name+'» أكبر من 15MB','error'); return; }
        var it={kind:kind,name:f.name,size:f.size,data:null}; F.atts.push(it); paintF();
        var r=new FileReader(); r.onload=function(){
          if(kind==='img'&&/^image\//.test(f.type)&&f.size>600*1024){ var im=new Image(); im.onload=function(){ var m=1600,w=im.width,h=im.height; if(w>m||h>m){ if(w>h){h=Math.round(h*m/w);w=m;}else{w=Math.round(w*m/h);h=m;} } var c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(im,0,0,w,h); it.data=c.toDataURL('image/jpeg',.85); it.size=Math.round(it.data.length*.75); paintF(); }; im.src=r.result; }
          else { it.data=r.result; paintF(); } };
        r.readAsDataURL(f); }); };
    o.querySelector('#sb-img').addEventListener('change',function(){ add(this,'img'); });
    o.querySelector('#sb-doc').addEventListener('change',function(){ add(this,'doc'); });
    if(!ed&&!me.city) api('/api/provider/profile').then(function(p){ W._prof=W._prof||p; var c=document.getElementById('sb-city'); if(c&&!c.value&&p&&p.city){ c.value=p.city; try{ c.dispatchEvent(new Event('change')); }catch(e){} } }).catch(function(){});
  }
  // التخصص يتحدّد تلقائياً من «وش تحتاج؟» (نفس فكرة نموذج العميل)
  function detectCat(v){ if(F.catManual)return; var L=[]; try{ if(W._cpDetect) L=W._cpDetect(v,CATS)||[]; }catch(e){}
    F.cands=L.slice(0,4); F.cat=L[0]||''; F.catAuto=!!F.cat; paintCat(); }
  function paintCat(){ var b=document.getElementById('sb-catbox'), p=document.getElementById('sb-catpick'); if(!b)return;
    if(F.edit){ b.innerHTML='<div class="sb-cbx"><div style="flex:1"><div class="sb-s">التخصص</div><b>'+emo(F.cat)+' '+esc(F.cat)+'</b></div><span class="sb-s">ما يتغيّر — لتخصص ثاني انشر طلب جديد</span></div>'; return; }
    var t=((document.getElementById('sb-title')||{}).value||'').trim();
    if(F.cat){ var alt=(F.cands||[]).filter(function(c){return c!==F.cat;}).slice(0,3);
      b.innerHTML='<div class="sb-cbx ok"><div style="flex:1;min-width:0"><div class="sb-s" style="color:#16a34a">'+(F.catAuto?'✓ فهمنا طلبك — التخصص:':'التخصص:')+'</div><b>'+emo(F.cat)+' '+esc(F.cat)+'</b></div><button type="button" class="sb-b sb-o" style="padding:7px 12px;font-size:12.5px" data-cb="chg">تغيير</button></div>'
        +(alt.length&&F.catAuto?'<div class="sb-row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><span class="sb-s">أو:</span>'+alt.map(function(c){return '<button type="button" class="sb-tag" style="cursor:pointer;border:0;padding:5px 10px" data-cb="'+esc(c)+'">'+emo(c)+' '+esc(c)+'</button>';}).join('')+'</div>':'');
      if(p&&!F.catManual)p.style.display='none';
    } else { b.innerHTML=t.length>=3?'<div class="sb-s" style="color:#92400e">اختر التخصص اللي تحتاجه:</div>':''; if(p) p.style.display=t.length>=3?'':'none'; } }
  function send(){
    var v=function(id){ var e=document.getElementById(id); return e?String(e.value||'').trim():''; };
    if(v('sb-title').length<5){ toast('اكتب وش تحتاج (عنوان قصير)','error'); var ti=document.getElementById('sb-title'); if(ti)ti.focus(); return; }
    if(!F.cat){ toast('اختر التخصص اللي تحتاجه','error'); var cp=document.getElementById('sb-catpick'); if(cp)cp.style.display=''; return; }
    if(F.atts.some(function(a){return !a.data;})){ toast('لحظات — نجهّز الملفات','error'); return; }
    if(!v('sb-city')){ toast('اختر المدينة','error'); return; }
    if(v('sb-desc').length<10){ toast('اكتب وش الشغل بالتفصيل','error'); var t=document.getElementById('sb-desc'); if(t)t.focus(); return; }
    var b=document.getElementById('sb-send'); if(b){ b.disabled=true; b.textContent='جاري النشر...'; }
    var pf=document.getElementById('sb-pf');
    if(F.edit){ var eid=F.edit; api('/api/sub/'+eid,{method:'PUT',body:JSON.stringify({title:v('sb-title'),city:v('sb-city'),district:v('sb-dist'),description:v('sb-desc'),start_text:v('sb-start'),budget:v('sb-bud'),keep:F.keep.map(function(a){return a.url;}),attachments:F.atts.map(function(a){return {name:a.name,data:a.data};})})}).then(function(r){
      if(r&&r.ok){ toast(r.review?'تم الحفظ — رجع لفريق مناقصة يراجعه':(r.pending?'التعديل يراجعه فريق مناقصة — طلبك باقي ظاهر بالوصف السابق':'تم حفظ التعديل')); hub(true); open(eid); } else { toast((r&&r.message)||'تعذّر الحفظ','error'); if(b){ b.disabled=false; b.textContent='احفظ التعديل'; } } }).catch(function(){ toast('تعذّر الاتصال','error'); if(b){ b.disabled=false; b.textContent='احفظ التعديل'; } }); return; }
    api('/api/sub',{method:'POST',body:JSON.stringify({title:v('sb-title'),category:F.cat,city:v('sb-city'),district:v('sb-dist'),description:v('sb-desc'),start_text:v('sb-start'),budget:v('sb-bud'),attachments:F.atts.map(function(a){return {name:a.name,data:a.data};}),partners_first:pf?pf.checked:false})}).then(function(r){
      if(r&&r.ok){ S.tab='mine'; hub(true); S.view={done:r.id};
        page('<div class="sb-card" style="text-align:center;padding:26px 16px"><div style="font-size:46px">🕐</div><div class="sb-t" style="font-size:18px;margin-top:6px">وصلنا طلبك — تحت المراجعة</div><div class="sb-s" style="margin-top:6px;font-size:13px">فريق مناقصة يراجعه ويساعدك توضّحه إذا احتاج، وبعدها يوصل '+(r.partners_first?'شركاءك أول، وبعدهم ':'')+'الفنيين المناسبين في مدينتك.</div>'+steps({status:'review'})+'<button type="button" class="sb-b sb-v" style="width:100%;margin-top:14px;padding:12px" onclick="SubC.open('+r.id+')">افتح طلبي</button><button type="button" class="sb-b sb-o" style="width:100%;margin-top:8px" onclick="SubC.go(\'mine\')">طلباتي</button></div>','SubC.go(\'mine\')'); }
      else { toast((r&&r.message)||'تعذّر النشر','error'); if(b){ b.disabled=false; b.textContent='انشر الطلب'; } }
    }).catch(function(){ toast('تعذّر الاتصال','error'); if(b){ b.disabled=false; b.textContent='انشر الطلب'; } });
  }
  // ── صفحة الطلب: لصاحبه (نفس تفاصيل مشروع العميل) وللي يقدّم (نفس صفحة المشروع) ──
  function back2(){ S.view=null; try{ if(history.state&&history.state.sbIn){ history.back(); return; } }catch(e){} try{ history.pushState({pg:'sub'},'','#sub'); }catch(e){} if(S.hub) render(); else load(); }
  function att(x){ return (x.attachments||[]).length?'<div class="sb-row" style="flex-wrap:wrap;gap:8px;margin-top:10px">'+x.attachments.map(function(a){ return isImg(a)?'<a href="'+esc(a.url)+'" target="_blank" rel="noopener"><img src="'+esc(a.url)+'" alt="'+esc(a.name||'صورة')+'" loading="lazy" style="width:72px;height:72px;object-fit:cover;border-radius:11px;border:1px solid var(--border,#e3eaf6)"></a>':'<a class="sb-b sb-o" style="padding:8px 12px;font-size:12.5px" href="'+esc(a.url)+'" target="_blank" rel="noopener">📄 '+esc(a.name||'ملف')+'</a>';}).join('')+'</div>':''; }
  function open(id,focus,noPush){
    if(W._curPage!=='sub'){ W._subOpen=id; W.gotoPage('sub'); return; }
    clearInterval(CH.t); closeSheet();
    S.view={id:id}; if(focus) S.focus=focus;
    if(!noPush){ try{ if(location.hash!=='#sub/'+id) history.pushState({pg:'sub',sbIn:1},'','#sub/'+id); }catch(e){} }
    var pg=document.getElementById('page-sub'); if(pg&&!pg.querySelector('#sb-dp')) page('<div id="sb-dp"><div class="sb-emp">جاري التحميل...</div></div>');
    api('/api/sub/'+id).then(function(x){
      if(!S.view||S.view.id!==id)return;
      if(!x||!x.id){ toast((x&&x.message)||'الطلب غير متاح','error'); back2(); return; }
      if(x.is_owner) S.last=x;
      var h=x.is_owner?ownerPage(x):offerPage(x);
      if(x.rate){
        if(x.rate.can) h+='<div class="sb-card" style="border-color:#ddd6fe" id="sb-rate"><div class="sb-t">⭐ قيّم تعاملك</div><div class="sb-s">'+(x.is_owner?'كيف كان شغل الفني؟':'كيف كان التعامل مع صاحب الطلب؟')+' — يطلع للمزوّدين، ومنفصل عن تقييم العملاء</div>'
          +'<div id="sb-stars" style="display:flex;gap:4px;margin:10px 0">'+[1,2,3,4,5].map(function(i){return '<button type="button" data-s="'+i+'" aria-label="'+i+' نجوم" style="border:0;background:none;font-size:30px;cursor:pointer;color:#cbd5e1;padding:0 2px">★</button>';}).join('')+'</div>'
          +'<textarea class="sb-f" id="sb-rc" rows="2" maxlength="300" placeholder="كلمة عن التعامل (اختياري)"></textarea><button type="button" class="sb-b sb-v" style="width:100%;margin-top:10px" onclick="SubC.rate('+x.id+')">أرسل التقييم</button></div>';
        else if(x.rate.mine) h+='<div class="sb-s" style="text-align:center;margin-bottom:12px">قيّمت هذا التعامل <span style="color:#f59e0b">'+'★'.repeat(x.rate.mine.stars)+'</span></div>';
      }
      page('<div id="sb-dp">'+h+'</div>');
      paintPh();
      var stb=document.getElementById('sb-stars'); if(stb) stb.addEventListener('click',function(e){ var b=e.target.closest('button[data-s]'); if(!b)return; S.stars=parseInt(b.getAttribute('data-s')); [].forEach.call(stb.children,function(c){ c.style.color=parseInt(c.getAttribute('data-s'))<=S.stars?'#f59e0b':'#cbd5e1'; }); });
      var f=S.focus; S.focus=null; if(f){ var el=document.getElementById(f==='share'?'sb-share':(f==='offer'?'sb-offer':f)); if(el) setTimeout(function(){ el.scrollIntoView({behavior:'smooth',block:'center'}); },60); }
    }).catch(function(){ toast('تعذّر التحميل','error'); });
  }
  function ownerPage(x){
    var n=(x.offers||[]).length, nT=(x.threads||[]).length, uT=(x.threads||[]).reduce(function(a,t){return a+(t.unread||0);},0), ot=S.otab||'offers';
    var box='';
    if(x.status==='review') box='<div class="sb-box bl"><b>🕐 طلبك تحت المراجعة</b><br>فريق مناقصة يراجعه بسرعة، وبعدها يوصل الفنيين المناسبين. تقدر تعدّله قبل النشر.</div>';
    else if(x.status==='needs_edit') box='<div class="sb-box am"><b>📝 طلبك يحتاج تعديل بسيط</b><br>ملاحظة من فريق مناقصة: '+esc(x.review_note||'')+'<button type="button" class="sb-b sb-v" style="width:100%;margin-top:10px" onclick="SubC.edit('+x.id+')">عدّل طلبك</button></div>';
    else if(x.status==='rejected') box='<div class="sb-box rd"><b>ℹ️ طلبك ما انتشر</b><br>'+(x.reject_kind==='ad'?'«مقاول باطن» مخصص لطلب مزوّد يكمّل معك شغل عندك (كهربائي، سبّاك، نجار…). التعريف بخدماتك وأسعارك مكانه صفحتك العامة — شاركها مع عملائك.':esc(x.review_note||''))+(x.reject_kind==='ad'?'<a class="sb-b sb-v" style="display:flex;margin-top:10px" href="/pro/'+(x.owner_id||'')+'" target="_blank" rel="noopener">صفحتي العامة</a>':'')+'</div>';
    else if(x.status==='open') box='<div class="sb-box gr"><b>✅ طلبك منشور ويستقبل عروض</b><br>'+(n?'وصلك '+n+(n===1?' عرض':' عروض')+' — قارن بينها تحت':'الفنيين المناسبين وصلهم طلبك — أول عرض غالباً يوصل خلال ساعات')+(x.expires_days!=null?' · ينقفل بعد '+x.expires_days+' يوم':'')
      +(x.expires_days!=null&&x.expires_days<=5?'<button type="button" class="sb-b sb-o" style="width:100%;margin-top:8px" onclick="SubC.ext('+x.id+')">⏳ مدّد أسبوع</button>':'')+'</div>';
    else if(x.status==='closed') box='<div class="sb-box gy"><b>🔒 الطلب انقفل'+(x.close_kind==='expired'?' — انتهت مدته':'')+'</b><br>لو لسا تحتاجه، افتحه أسبوع ثاني والعروض اللي وصلتك تبقى.<button type="button" class="sb-b sb-v" style="width:100%;margin-top:8px" onclick="SubC.ext('+x.id+')">🔓 افتحه أسبوع ثاني</button></div>';
    var h='<div class="sb-card"><div class="sb-row" style="justify-content:space-between">'+pill(x)+'<span class="sb-s">#'+x.id+'</span></div>'
      +'<div class="sb-t" style="font-size:19px;margin-top:8px;line-height:1.5">'+esc(ttl(x))+'</div><div class="sb-s">أرسلته '+esc(ago(x.submitted_at||x.created_at))+(x.edited_at?' · معدّل':'')+'</div>'
      +'<div class="sb-row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><span class="sb-tag">'+emo(x.category)+' '+esc(x.category)+'</span>'+(x.city?'<span class="sb-tag" style="background:#f1f5f9;color:#475569">📍 '+esc(x.city)+(x.district?' · '+esc(x.district):'')+'</span>':'')+'</div>'
      +steps(x)+box
      +(x.status==='open'&&!(x.attachments||[]).length?'<div class="sb-box am sb-row" style="align-items:center"><div style="flex:1"><b>📐 ما أرفقت المخطط أو صور</b><br>الفني يشوفه ويعطيك سعر أدق</div><button type="button" class="sb-b" style="background:#f59e0b;color:#fff;padding:8px 13px" onclick="SubC.edit('+x.id+')">أرفق</button></div>':'')
      +(x.pending_desc?'<div class="sb-box pv"><b>✏️ تعديلك تحت المراجعة</b><br>«'+esc(x.pending_title||'')+(x.pending_title?' — ':'')+esc(String(x.pending_desc).slice(0,140))+'»<br>طلبك باقي ظاهر بالوصف السابق لين نعتمده.</div>':'')
      +(x.status==='open'&&x.approve_note?'<div class="sb-box gr">💡 من فريق مناقصة: '+esc(x.approve_note)+'</div>':'')
      +(x.nodeal_ask?'<div class="sb-box am"><b>❓ الفني يقول ما تم الاتفاق</b><br>صحيح؟ لو صحيح ينفتح طلبك من جديد وترجع العروض الثانية.<div class="sb-row" style="gap:8px;margin-top:10px"><button type="button" class="sb-b sb-v" style="flex:1" onclick="SubC.nd('+x.id+',1)">صحيح، ما اتفقنا</button><button type="button" class="sb-b sb-o" style="flex:1" onclick="SubC.nd('+x.id+',0)">لا، اتفقنا</button></div></div>':'')
      +(['review','open'].indexOf(x.status)>=0?'<div class="sb-row" style="gap:8px;margin-top:10px"><button type="button" class="sb-b sb-o" style="flex:1" onclick="SubC.edit('+x.id+')">✏️ تعديل</button>'+'<button type="button" class="sb-b sb-o" style="flex:1" onclick="SubC.pv('+x.id+')">👁 معاينة</button>'+(x.status==='open'?'<button type="button" class="sb-b sb-o" style="flex:1" onclick="document.getElementById(\'sb-share\').scrollIntoView({behavior:\'smooth\',block:\'center\'})">🔗 مشاركة</button>':'')+'</div>':'')
      +'</div>';
    if(x.party&&x.status==='awarded') h+=work(x);
    if(['review','needs_edit','rejected'].indexOf(x.status)>=0){ h+='<div class="sb-card"><b>تفاصيل طلبك</b>'+details(x)+'</div>'; return h; }
    h+='<div class="sb-row sb-otabs">'+[['offers','العروض',n],['details','التفاصيل',0],['chats','المحادثات',uT||nT]].map(function(t){ return '<button type="button" class="'+(ot===t[0]?'on':'')+'" onclick="SubC.otab('+x.id+',\''+t[0]+'\')">'+t[1]+(t[2]?' <b>'+t[2]+'</b>':'')+'</button>'; }).join('')+'</div>';
    if(ot==='details') h+='<div class="sb-card">'+details(x)+(x.status==='open'?'<button type="button" class="sb-b sb-o" style="width:100%;margin-top:12px;color:#b91c1c" onclick="SubC.close('+x.id+')">إغلاق الطلب</button>':'')+'</div>';
    else if(ot==='chats') h+=nT?'<div class="sb-card" style="padding:4px 12px">'+x.threads.map(function(t){ return '<div class="sb-it sb-row" onclick="SubC.chat('+x.id+','+t.other+')">'+av(t.name,t.profile_image)+'<div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13.5px">'+esc(t.name)+'</div><div class="sb-s" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(t.last_body||'')+'</div></div>'+(t.unread?'<span class="sb-tag" style="background:#7c3aed;color:#fff">'+t.unread+'</span>':'')+'</div>'; }).join('')+'</div>':'<div class="sb-card sb-emp">ما فيه محادثات للحين — الفنيين يقدرون يسألونك قبل ما يقدّمون</div>';
    else h+=offersList(x);
    if(x.status==='open') h+='<div class="sb-card" id="sb-share" style="border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.07)"><div class="sb-t" style="color:#16a34a">🔗 ادعُ فني تعرفه</div><div class="sb-s">أرسل له رابط الطلب — يسجّل مجاناً ويقدّم عرضه، وتقارن بينه وبين عروض المنصة</div><div class="sb-row" style="gap:8px;margin-top:10px"><a class="sb-b sb-g" style="flex:1" target="_blank" rel="noopener" href="'+esc(waT('مطلوب '+x.category+(x.city?' في '+x.city:'')+':\n'+ttl(x)+'\n\nقدّم عرضك من هنا (التسجيل مجاني):\n'+x.share_url))+'">📤 واتساب</a><button type="button" class="sb-b sb-o" style="flex:1" onclick="SubC.cp(\''+esc(x.share_url)+'\')">نسخ الرابط</button></div></div>';
    return h;
  }
  function details(x){ return (x.title?'<div class="sb-t" style="margin-top:8px">'+esc(x.title)+'</div>':'')+'<div style="font-size:14px;line-height:1.9;white-space:pre-wrap;margin-top:6px;color:var(--text)">'+esc(x.description)+'</div>'
      +'<div class="sb-row" style="gap:8px;margin-top:10px"><div class="sb-mini"><small>الميزانية</small>'+(x.budget?fmt(x.budget)+' ر.س':'غير محددة')+'</div><div class="sb-mini"><small>يبدأ</small>'+esc(x.start_text||'مرن')+'</div></div>'+att(x); }
  function offersList(x){
    var OF=(x.offers||[]).slice(), srt=S.osort||'cheap', h='';
    if(!OF.length) return '<div class="sb-card sb-emp">'+(x.status==='open'?'⏳ ننتظر أول عرض — يوصلك إشعار أول ما يقدّم أحد':'ما وصلت عروض')+'</div>';
    var minP=OF.length>1?Math.min.apply(null,OF.map(function(o){return +o.price;})):null, dd=OF.filter(function(o){return +o.days>0;}).map(function(o){return +o.days;}), minD=OF.length>1&&dd.length?Math.min.apply(null,dd):null;
    var cP=OF.filter(function(o){return +o.price===minP;}).length===1, cD=OF.filter(function(o){return +o.days===minD;}).length===1;
    OF.sort(function(a,b){ if((a.status==='accepted')!==(b.status==='accepted'))return a.status==='accepted'?-1:1; if((a.status==='rejected')!==(b.status==='rejected'))return a.status==='rejected'?1:-1; if(srt==='fast')return (+a.days||999)-(+b.days||999)||a.price-b.price; if(srt==='rate')return (parseFloat(b.rating)||0)-(parseFloat(a.rating)||0)||(b.done||0)-(a.done||0); return a.price-b.price; });
    if(OF.length>1&&x.status==='open') h+='<div class="sb-row" style="gap:6px;margin:0 0 10px"><span class="sb-s">رتّب:</span>'+[['cheap','الأرخص'],['fast','الأسرع'],['rate','التقييم']].map(function(c){return '<button type="button" class="sb-fchip lt'+(srt===c[0]?' on':'')+'" onclick="SubC.osort('+x.id+',\''+c[0]+'\')">'+c[1]+'</button>';}).join('')+'</div>';
    return h+OF.map(function(o){ var best=cP&&+o.price===minP, bdg=(best?'<span class="sb-tag" style="background:#dcfce7;color:#166534">💰 الأرخص</span>':'')+(cD&&+o.days===minD?'<span class="sb-tag" style="background:#dbeafe;color:#1d4ed8">⚡ الأسرع</span>':'')+(o.is_partner?'<span class="sb-tag">⭐ شريكك</span>':'');
      var tr=[o.verified?'✓ موثّق':'',o.done?o.done+' عمل منجز':'جديد على المنصة',parseFloat(o.rating)>0?'⭐ '+o.rating:'',o.city?esc(o.city):''].filter(Boolean).join(' · ');
      if(o.status==='rejected') return '<div class="sb-card sb-row" style="opacity:.6">'+av(o.name,o.profile_image)+'<div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13.5px">'+esc(o.name)+'</div><div class="sb-s">رفضته'+(x.status==='open'?'':'')+'</div></div><b>'+fmt(o.price)+' ر.س</b></div>';
      return '<div class="sb-card" style="'+(o.status==='accepted'?'border:2px solid #86efac':(best?'border:2px solid rgba(34,197,94,.4)':''))+'">'+(bdg?'<div class="sb-row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px">'+bdg+'</div>':'')+'<div class="sb-row">'+av(o.name,o.profile_image)+'<div style="flex:1;min-width:0"><div class="sb-t" style="font-size:14px">'+esc(o.name)+'</div><div class="sb-s">'+tr+(sr(o.srate)?' · '+sr(o.srate):'')+'</div></div><div style="text-align:left"><b style="font-size:19px;color:#7c3aed">'+fmt(o.price)+'</b><div class="sb-s">ر.س'+(o.days?' · '+o.days+' يوم':'')+'</div></div></div>'
        +(o.note?'<div class="sb-s" style="margin-top:8px;background:var(--bg,#f8fafc);border-radius:10px;padding:8px 10px;white-space:pre-wrap;color:var(--text)">'+esc(o.note)+'</div>':'')
        +((o.photos||[]).length?'<div class="sb-s" style="margin-top:8px">📷 من أعماله:</div><div class="sb-row" style="gap:6px;margin-top:4px">'+o.photos.map(function(u){return '<a href="'+esc(u)+'" target="_blank" rel="noopener"><img src="'+esc(u)+'" alt="من أعماله" loading="lazy" style="width:64px;height:64px;object-fit:cover;border-radius:10px;border:1px solid var(--border,#e3eaf6)"></a>';}).join('')+'</div>':'')
        +'<div class="sb-row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><a class="sb-tag" style="background:#f1f5f9;color:#475569;padding:6px 10px;text-decoration:none" href="/pro/'+o.provider_id+'" target="_blank" rel="noopener">👤 الملف</a><button type="button" class="sb-tag" style="background:#f1f5f9;color:#475569;padding:6px 10px;border:0;cursor:pointer" onclick="SubC.chat('+x.id+','+o.provider_id+')">💬 محادثة</button>'+(!o.is_partner?'<button type="button" class="sb-tag" style="background:#f1f5f9;color:#475569;padding:6px 10px;border:0;cursor:pointer" onclick="SubC.addp('+o.provider_id+','+x.id+')">⭐ لشركائي</button>':'')+'</div>'
        +'<div class="sb-row" style="gap:8px;margin-top:10px">'+(x.status==='open'?'<button type="button" class="sb-b sb-v" style="flex:1" onclick="SubC.acc('+x.id+','+o.id+','+o.provider_id+')">اعتمد العرض</button><button type="button" class="sb-b sb-o" style="padding:10px 12px;color:#b91c1c" onclick="SubC.rej('+x.id+','+o.id+')">رفض</button>':(o.status==='accepted'?'<span class="sb-tag" style="background:#dcfce7;color:#166534;padding:9px 12px">✓ اعتمدته</span>':''))
          +(o.phone?'<a class="sb-b sb-g" style="padding:10px 14px" href="'+esc(wa(o.phone,'السلام عليكم، بخصوص عرضك على طلبي في منصة مناقصة'))+'" target="_blank" rel="noopener">واتساب</a>':'')+'</div></div>'; }).join('');
  }
  function offerPage(x){
    var m=x.my_offer, n=parseInt(x.offers_count!=null?x.offers_count:0)||0, left=x.status==='open'?leftDays(x):0, os=x.owner_stats||{};
    var lvl=n<=2?['منخفضة','#16a34a']:(n<=5?['متوسطة','#d97706']:['عالية','#dc2626']);
    var h='<div class="sb-card"><div class="sb-row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><span class="sb-tag">🤝 مقاول باطن · '+emo(x.category)+' '+esc(x.category)+'</span>'+(x.city?'<span class="sb-tag" style="background:#dcfce7;color:#166534">📍 '+esc(x.city)+'</span>':'')+'</div>'
      +'<div class="sb-t" style="font-size:19px;margin-top:8px;line-height:1.5">'+esc(ttl(x))+'</div><div class="sb-s">'+(x.status==='open'?'<span style="color:#16a34a">● مفتوح للعروض</span> · باقي '+left+' يوم':'🔒 انقفل')+' · نزل '+esc(ago(x.created_at))+'</div></div>'
      +(x.status==='open'?'<div class="sb-row" style="gap:10px;margin-bottom:12px"><div class="sb-card" style="flex:1;margin:0;background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.35)"><div class="sb-s">الوقت المتبقي</div><b style="font-size:16px">'+left+' يوم</b></div><div class="sb-card" style="flex:1;margin:0"><div class="sb-s">المنافسة</div><b style="font-size:16px">'+(n?n+(n===1?' عرض':' عروض'):'ما فيه عروض')+' · <span style="color:'+lvl[1]+'">'+lvl[0]+'</span></b></div></div>':'')
      +'<div class="sb-card"><b>تفاصيل الطلب</b>'+details(x)+'</div>';
    if(x.party&&x.status==='awarded') h+=work(x);
    h+='<div class="sb-card"><b>صاحب الطلب</b><div class="sb-row" style="margin-top:10px">'+av(x.owner_name,x.owner_image)+'<div style="flex:1;min-width:0"><div class="sb-t">'+esc(x.owner_name||'مقاول')+'</div><div class="sb-s">مقاول'+(os.since?' · عضو منذ '+new Date(os.since).getFullYear():'')+(os.city?' · '+esc(os.city):'')+'</div></div></div>'
      +'<div class="sb-row" style="justify-content:space-around;text-align:center;background:var(--bg,#f8fafc);border-radius:12px;padding:9px;margin-top:10px"><div><b>'+(os.posted||0)+'</b><div class="sb-s" style="font-size:11px">طلبات نشرها</div></div><div><b style="color:#16a34a">'+(os.awarded||0)+'</b><div class="sb-s" style="font-size:11px">اعتمد فيها فني</div></div><div><b>'+(x.owner_srate&&parseInt(x.owner_srate.n)>0?'🤝 '+x.owner_srate.avg:'—')+'</b><div class="sb-s" style="font-size:11px">تقييم المزوّدين</div></div></div>'
      +(x.owner_phone?'<a class="sb-b sb-g" style="display:flex;margin-top:10px" href="'+esc(wa(x.owner_phone,'السلام عليكم، قدّمت عرض على طلبك في منصة مناقصة'))+'" target="_blank" rel="noopener">💬 واتساب المقاول</a>':'<div class="sb-box am" style="text-align:center;margin-top:10px"><b>🔒 رقمه يظهر لك بعد ما تقدّم عرضك</b></div>')
      +((x.status==='open'||m)?'<button type="button" class="sb-b sb-o" style="width:100%;margin-top:8px" onclick="SubC.chat('+x.id+','+x.owner_id+')">💬 '+(m?'راسل المقاول':'اسأل المقاول قبل ما تقدّم')+(x.unread?' <span class="sb-tag" style="background:#7c3aed;color:#fff">'+x.unread+'</span>':'')+'</button>':'')+'</div>';
    if(m&&m.status==='accepted') h+='<div class="sb-box gr"><b>🎉 اعتمد عرضك — '+fmt(m.price)+' ر.س</b><br>تواصلوا واتفقوا على التفاصيل. سعي المنصة 3% انضاف في محفظة السعي.</div>';
    else if(m&&m.status==='rejected') h+='<div class="sb-box gy">اختار عرض ثاني — شكراً لعرضك.</div>';
    else if(x.status==='open'){
      O={keep:m&&m.photos?m.photos.slice():[],add:[]};
      h+='<div class="sb-card" id="sb-offer"><div class="sb-t" style="font-size:16px">'+(m?'عرضك (تقدر تعدّله)':'قدّم عرضك')+'</div>'+(m?'<div class="sb-s" style="margin-top:2px">'+(m.seen_at?'👀 المقاول شاف عرضك':'🕐 المقاول ما فتح عرضك للحين')+'</div>':'<div class="sb-s">'+(x.from_partner?'⭐ هذا طلب من شريكك — ':'')+'المقاول اللي يرتاح لك يحفظك في شركائه ويوصلك شغله قبل غيرك</div>')
        +'<div class="sb-row" style="gap:8px"><div style="flex:1"><label class="sb-l">السعر (ر.س)</label><input class="sb-f" id="sb-p" inputmode="numeric" oninput="this.value=this.value.replace(/[٠-٩]/g,function(x){return \'٠١٢٣٤٥٦٧٨٩\'.indexOf(x);}).replace(/[^0-9]/g,\'\')" value="'+(m?m.price:'')+'"></div><div style="flex:1"><label class="sb-l">المدة (أيام)</label><input class="sb-f" id="sb-d" inputmode="numeric" oninput="this.value=this.value.replace(/[٠-٩]/g,function(x){return \'٠١٢٣٤٥٦٧٨٩\'.indexOf(x);}).replace(/[^0-9]/g,\'\')" value="'+(m&&m.days?m.days:'')+'"></div></div>'
        +'<label class="sb-l">ملاحظة للمقاول (اختياري)</label><textarea class="sb-f" id="sb-n" rows="2" maxlength="1000" placeholder="خبرتك، وش يشمل سعرك…">'+esc(m&&m.note||'')+'</textarea>'
        +'<label class="sb-l">📷 صور من أعمالك السابقة (اختياري — حتى 3)</label><div class="sb-row" style="gap:6px;flex-wrap:wrap" id="sb-ph"></div>'
        +'<label class="sb-row" style="gap:9px;margin-top:12px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.4);border-radius:12px;padding:10px;cursor:pointer"><input type="checkbox" id="sb-fee" style="width:18px;height:18px;accent-color:#d97706"'+(m?' checked':'')+'><span class="sb-s" style="color:#b45309">أتعهد بسداد سعي المنصة 3% من قيمة الاتفاق إذا انعتمد عرضي — ينضاف في محفظة السعي</span></label>'
        +'<button type="button" class="sb-b sb-v" id="sb-ob" style="width:100%;margin-top:12px;padding:13px" onclick="SubC.offer('+x.id+')">'+(m?'حدّث عرضك':'أرسل العرض ← ويظهر لك رقمه')+'</button>'+(m?'<button type="button" class="sb-b sb-o" style="width:100%;margin-top:8px;color:#b91c1c" onclick="SubC.wd('+x.id+')">↩️ اسحب عرضي</button>':'')+'</div>';
      if(!m) h+='<div class="sb-stick"><div class="sb-s"><b style="color:var(--text)">باقي '+left+' يوم · '+(n?n+(n===1?' عرض':' عروض'):'ما فيه عروض')+'</b><br>'+(n?'قدّم عرض واضح ومتميّز':'كن أول المتقدّمين')+'</div><button type="button" class="sb-b sb-v" style="padding:12px 22px" onclick="document.getElementById(\'sb-offer\').scrollIntoView({behavior:\'smooth\',block:\'start\'});setTimeout(function(){var i=document.getElementById(\'sb-p\');if(i)i.focus();},400)">قدّم عرضك</button></div>';
    }
    h+='<button type="button" class="sb-b" style="background:none;color:var(--muted);font-size:12px;margin:4px auto 90px;display:block" onclick="SubC.rpt('+x.id+',0)">🚩 بلاغ عن الطلب</button>';
    return h;
  }
  var O={keep:[],add:[]};
  function paintPh(){ var el=document.getElementById('sb-ph'); if(!el)return; var n=O.keep.length+O.add.length;
    el.innerHTML=O.keep.map(function(u,i){return '<span style="position:relative"><img src="'+esc(u)+'" alt="" style="width:62px;height:62px;object-fit:cover;border-radius:10px"><button type="button" onclick="SubC.phRm(0,'+i+')" aria-label="حذف" style="position:absolute;top:-6px;left:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#ef4444;color:#fff;font-size:12px;cursor:pointer">✕</button></span>';}).join('')
      +O.add.map(function(u,i){return '<span style="position:relative"><img src="'+u+'" alt="" style="width:62px;height:62px;object-fit:cover;border-radius:10px"><button type="button" onclick="SubC.phRm(1,'+i+')" aria-label="حذف" style="position:absolute;top:-6px;left:-6px;width:22px;height:22px;border-radius:50%;border:0;background:#ef4444;color:#fff;font-size:12px;cursor:pointer">✕</button></span>';}).join('')
      +(n<3?'<label style="width:62px;height:62px;border:1.5px dashed var(--border,#cbd5e1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;color:#7c3aed;cursor:pointer">+<input type="file" accept="image/*" multiple hidden onchange="SubC.phAdd(this)"></label>':''); }
  function shrink(f){ return new Promise(function(res){ var fr=new FileReader(); fr.onload=function(){ var im=new Image(); im.onload=function(){ var m=1280, w=im.width, h=im.height, k=Math.min(1,m/Math.max(w,h)); var c=document.createElement('canvas'); c.width=Math.round(w*k); c.height=Math.round(h*k); c.getContext('2d').drawImage(im,0,0,c.width,c.height); res(c.toDataURL('image/jpeg',.82)); }; im.onerror=function(){res(null);}; im.src=fr.result; }; fr.onerror=function(){res(null);}; fr.readAsDataURL(f); }); }
  function phAdd(inp){ var fs=[].slice.call(inp.files||[]); inp.value=''; O.busy=true; var room=3-O.keep.length-O.add.length; Promise.all(fs.slice(0,Math.max(0,room)).map(shrink)).then(function(L){ L.forEach(function(d){ if(d)O.add.push(d); }); O.busy=false; paintPh(); }); }
  function phRm(k,i){ (k?O.add:O.keep).splice(i,1); paintPh(); }
  // متابعة الشغل بعد الاعتماد (للطرفين)
  function work(x){ var ws=x.work_state||'', step=ws==='done'?4:(ws==='started'?3:2), lb=['اعتمدت','بدأ الشغل','خلص','التقييم'];
    var bar='<div class="sb-row" style="justify-content:space-between;margin:12px 0 10px;position:relative"><div style="position:absolute;top:13px;right:16px;left:16px;height:3px;background:var(--border,#e2e8f0)"></div><div style="position:absolute;top:13px;right:16px;width:'+Math.round((step-1)/3*92)+'%;height:3px;background:#7c3aed"></div>'
      +lb.map(function(t,i){ var on=i<step; return '<div style="text-align:center;z-index:1;flex:0 0 auto"><span style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:auto;font-size:12px;font-weight:900;background:'+(on?'#7c3aed':'var(--border,#e2e8f0)')+';color:'+(on?'#fff':'#64748b')+'">'+(on&&i<step-1||ws==='done'&&i<3?'✓':i+1)+'</span><div class="sb-s" style="font-size:11px">'+t+'</div></div>'; }).join('')+'</div>';
    var q=ws==='done'?'<div class="sb-s" style="text-align:center;color:#166534">✅ خلص الشغل'+(x.rate&&x.rate.can?' — قيّم تعاملك تحت':'')+'</div>'
      :'<div class="sb-s">'+(ws==='started'?'خلص الشغل؟':'بدأ الشغل؟')+'</div><div class="sb-row" style="gap:8px;margin-top:6px"><button type="button" class="sb-b sb-v" style="flex:1" onclick="SubC.prog('+x.id+',\''+(ws==='started'?'done':'started')+'\')">✓ '+(ws==='started'?'خلص':'بدأ')+'</button><button type="button" class="sb-b sb-o" style="flex:1" onclick="SubC.prog('+x.id+',\'later\')">لسا</button>'
        +(!ws&&x.saai_lid?'<button type="button" class="sb-b sb-o" style="flex:1;color:#b91c1c" onclick="SubC.nd2('+x.saai_lid+','+x.id+')">ما اتفقنا</button>':'')+'</div>';
    return '<div class="sb-card" style="margin-top:12px;border-color:#c7d2fe"><div class="sb-t">🛠️ متابعة الشغل'+(x.peer_name?' مع '+esc(x.peer_name):'')+'</div>'+bar+q+'</div>'; }
  function prog(id,st){ api('/api/sub/'+id+'/progress',{method:'POST',body:JSON.stringify({state:st})}).then(function(r){ if(r&&r.ok){ toast(st==='later'?'تمام — نذكّرك بعد 3 أيام':(st==='done'?'✅ تم — قيّم تعاملك':'🛠️ تم — بالتوفيق')); hub(true); open(id,null,true); } else toast((r&&r.message)||'تعذّر','error'); }).catch(function(){ toast('تعذّر الاتصال','error'); }); }
  function nd2(lid,id){ var n=prompt('ما تم الاتفاق مع المقاول؟ اكتب السبب باختصار (يوصل المقاول يأكّد):'); if(n===null)return; api('/api/sub/saai/'+lid+'/nodeal',{method:'POST',body:JSON.stringify({note:n})}).then(function(r){ if(r&&r.ok){ toast('وصل المقاول — ننتظر تأكيده'); open(id,null,true); } else toast((r&&r.message)||'تعذّر','error'); }); }
  function ext(id){ api('/api/sub/'+id+'/extend',{method:'POST',body:'{}'}).then(function(r){ if(r&&r.ok){ toast(r.reopened?'🔓 انفتح طلبك أسبوع ثاني':'⏳ تمدّد أسبوع'); hub(true); open(id,null,true); } else toast((r&&r.message)||'تعذّر','error'); }).catch(function(){ toast('تعذّر الاتصال','error'); }); }
  function rej(id,oid){ if(!confirm('ترفض هذا العرض؟ يوصله إنك اخترت تكمل بعروض ثانية.'))return; api('/api/sub/'+id+'/offers/'+oid+'/reject',{method:'POST',body:'{}'}).then(function(r){ if(r&&r.ok){ toast('تم'); open(id,null,true); } else toast((r&&r.message)||'تعذّر','error'); }); }
  // معاينة: كذا يشوف الفنيين طلبك في قائمتهم
  function pv(id){ var x=S.last; if(!x||x.id!==id)return; var y=Object.assign({},x,{offers:(x.offers||[]).length,my_offer:null,from_partner:false});
    var o=sheet('<div class="sb-row" style="justify-content:space-between"><b style="font-size:16px">👁 كذا يشوفه الفنيين</b><button type="button" class="sb-b sb-o" style="padding:6px 10px" onclick="SubC.x()">✕</button></div><div class="sb-s" style="margin:4px 0 12px">في قائمة «طلبات المقاولين» — ولما يفتحونه يشوفون التفاصيل والمرفقات وأرقامك على المنصة (مو رقم جوالك)</div>'+(x.status!=='open'?'<div class="sb-box am" style="margin-top:0;margin-bottom:10px">طلبك مو منشور للحين — هذا شكله بعد الاعتماد</div>':'')+'<div id="sb-pvc" style="pointer-events:none">'+feedCard(y)+'</div>');
    return o; }
  function offer(id){
    var p=(document.getElementById('sb-p')||{}).value, d=(document.getElementById('sb-d')||{}).value, n=(document.getElementById('sb-n')||{}).value, f=document.getElementById('sb-fee');
    if(!(parseInt(String(p).replace(/[^\d]/g,''))>=50)){ toast('اكتب سعرك','error'); return; }
    if(!f||!f.checked){ toast('لازم توافق على عمولة المنصة 3%','error'); return; }
    var b=document.getElementById('sb-ob'); if(b){ b.disabled=true; }
    if(O.busy){ toast('لحظات — نجهّز الصور','error'); return; }
    api('/api/sub/'+id+'/offers',{method:'POST',body:JSON.stringify({price:p,days:d,note:n,fee_ok:true,keep_photos:O.keep,photos:O.add})}).then(function(r){
      if(r&&r.ok){ toast('وصل عرضك للمقاول ✓'); hub(true); open(id,null,true); }
      else if(r&&r.code==='bid_ban'&&window.mnqBanSheet){ window.mnqBanSheet(r.ban); if(b)b.disabled=false; }
      else { toast((r&&r.message)||'تعذّر الإرسال','error'); if(b)b.disabled=false; }
    }).catch(function(){ toast('تعذّر الاتصال','error'); if(b)b.disabled=false; });
  }
  function acc(id,oid,pid){
    if(!confirm('تعتمد هذا العرض؟ باقي العروض يوصلهم إن الطلب اكتمل.'))return;
    api('/api/sub/'+id+'/accept',{method:'POST',body:JSON.stringify({offer_id:oid})}).then(function(r){
      if(!(r&&r.ok)){ toast((r&&r.message)||'تعذّر','error'); return; }
      toast('تم الاعتماد ✓ — تواصل معه واتفقوا'); var ip=(S.hub&&S.hub.partners||[]).some(function(p){return String(p.id)===String(pid);});
      hub(true); if(!ip&&confirm('⭐ تضيفه لشركائك؟ توصله طلباتك الجاية قبل غيره.')) addp(pid,id); else open(id,null,true);
    });
  }
  function addp(pid,sid){ api('/api/partners',{method:'POST',body:JSON.stringify({id:pid})}).then(function(r){ if(r&&r.ok){ toast('⭐ صار من شركائك'); hub(true); if(sid&&S.view&&S.view.id===sid)open(sid,null,true); else if(W._curPage==='sub')render(); } else toast((r&&r.message)||'تعذّر','error'); }); }
  function unp(pid){ if(!confirm('تشيله من شركائك؟'))return; api('/api/partners/'+pid,{method:'DELETE'}).then(function(){ S.hub=null; load(); }); }
  function close(id){ if(!confirm('تقفل الطلب؟ ما عاد يقدر أحد يقدّم عليه.'))return; api('/api/sub/'+id+'/close',{method:'POST',body:'{}'}).then(function(r){ if(r&&r.ok){ toast('تم إغلاق الطلب'); hub(true); open(id,null,true); } else toast((r&&r.message)||'تعذّر','error'); }); }
  function rate(id){ if(!S.stars){ toast('اختر عدد النجوم','error'); return; }
    api('/api/sub/'+id+'/rate',{method:'POST',body:JSON.stringify({stars:S.stars,comment:(document.getElementById('sb-rc')||{}).value||''})}).then(function(r){ if(r&&r.ok){ toast('شكراً — وصل تقييمك'); S.stars=0; open(id,null,true); } else toast((r&&r.message)||'تعذّر','error'); }); }
  function nd(id,y){ api('/api/sub/'+id+'/nodeal-answer',{method:'POST',body:JSON.stringify({yes:!!y})}).then(function(r){ if(r&&r.ok){ toast(y?'تم — طلبك انفتح من جديد':'تم — وصل الفني'); hub(true); open(id,null,true); } else toast((r&&r.message)||'تعذّر','error'); }); }
  function rmF(i){ F.atts.splice(i,1); paintF(); }
  function rmK(i){ F.keep.splice(i,1); paintF(); }
  function edit(id){ api('/api/sub/'+id).then(function(x){ if(x&&x.is_owner){ if(x.pending_desc){ x.description=x.pending_desc; if(x.pending_title)x.title=x.pending_title; } form(x); } }); }
  function wd(id){ if(!confirm('تسحب عرضك؟ يوصل المقاول إنك سحبته.'))return; api('/api/sub/'+id+'/offers',{method:'DELETE'}).then(function(r){ if(r&&r.ok){ toast('تم سحب عرضك'); hub(true); open(id,null,true); } else toast((r&&r.message)||'تعذّر','error'); }); }
  function cp(u){ try{ navigator.clipboard.writeText(u).then(function(){ toast('تم نسخ الرابط'); }); }catch(e){ prompt('انسخ الرابط:',u); } }
  // ── المحادثة ──
  var CH={sid:0,w:0,t:null,n:-1};
  function chat(sid,w){
    CH.sid=sid; CH.w=w; CH.n=-1; clearInterval(CH.t);
    var sh=document.querySelector('#sbOv .sb-sh'); if(!sh){ sheet(''); sh=document.querySelector('#sbOv .sb-sh'); }
    sh.innerHTML='<div class="sb-grab"></div><div class="sb-row" style="justify-content:space-between"><button type="button" class="sb-b sb-o" style="padding:6px 11px" onclick="SubC.back()">› رجوع</button><b id="sb-cn" style="font-size:15px"></b><button type="button" class="sb-b sb-o" style="padding:6px 11px" aria-label="خيارات" onclick="SubC.cmenu()">⋯</button></div><div id="sb-cm" style="display:none;margin-top:8px" class="sb-row"><button type="button" class="sb-b sb-o" style="flex:1;font-size:12.5px" onclick="SubC.rpt(\''+sid+'\',\''+w+'\')">🚩 بلاغ</button><button type="button" class="sb-b sb-o" id="sb-blk" style="flex:1;font-size:12.5px;color:#b91c1c" onclick="SubC.blk()">🚫 حظر</button></div>'
      +'<div id="sb-ms" style="height:min(52vh,430px);overflow:auto;padding:10px 2px;display:flex;flex-direction:column;gap:7px"><div class="sb-emp">…</div></div>'
      +'<div class="sb-s" style="text-align:center;font-size:11px;margin-bottom:6px">🔒 الأرقام والروابط ما تنرسل هنا — تظهر بعد العرض</div>'
      +'<div class="sb-row" style="gap:8px"><textarea class="sb-f" id="sb-mi" rows="1" maxlength="1000" placeholder="اكتب رسالتك…" style="resize:none"></textarea><button type="button" class="sb-b sb-v" id="sb-msb" onclick="SubC.say()">إرسال</button></div>';
    var ov=document.getElementById('sbOv'); if(ov) ov.addEventListener('click',function(e){ if(e.target===ov) clearInterval(CH.t); });
    var mi=document.getElementById('sb-mi'); if(mi) mi.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); say(); } });
    pull(); CH.t=setInterval(function(){ if(!document.getElementById('sb-ms')){ clearInterval(CH.t); return; } pull(); },7000);
  }
  function pull(){
    api('/api/sub/'+CH.sid+'/msgs?with='+CH.w).then(function(d){
      var b=document.getElementById('sb-ms'); if(!b)return; if(!d||!d.msgs){ b.innerHTML='<div class="sb-emp">'+esc((d&&d.message)||'تعذّر التحميل')+'</div>'; return; }
      var n=document.getElementById('sb-cn'); if(n) n.textContent=(d.other&&d.other.name)||''; CH.blocked=!!d.blocked; var bb=document.getElementById('sb-blk'); if(bb) bb.textContent=CH.blocked?'فك الحظر':'🚫 حظر';
      if(d.msgs.length===CH.n)return; CH.n=d.msgs.length;
      b.innerHTML=d.msgs.length?d.msgs.map(function(m){ return '<div style="'+(m.mine?'margin-left:auto':'margin-right:auto')+';max-width:80%;background:'+(m.mine?'#7c3aed':'var(--bg,#f1f5f9)')+';color:'+(m.mine?'#fff':'var(--text)')+';border-radius:14px;padding:8px 12px;font-size:13.5px;font-weight:600;line-height:1.7;white-space:pre-wrap;word-break:break-word">'+esc(m.body)+'<div style="font-size:10.5px;opacity:.7;margin-top:2px">'+esc(ago(m.at))+'</div></div>'; }).join(''):'<div class="sb-emp">ابدأ المحادثة — اسأل عن أي تفصيل</div>';
      b.scrollTop=b.scrollHeight;
    });
  }
  function say(){ var i=document.getElementById('sb-mi'), v=i?String(i.value||'').trim():''; if(!v)return; var bt=document.getElementById('sb-msb'); if(bt)bt.disabled=true;
    api('/api/sub/'+CH.sid+'/msgs',{method:'POST',body:JSON.stringify({with:CH.w,body:v})}).then(function(r){ if(bt)bt.disabled=false; if(r&&r.ok){ i.value=''; CH.n=-1; pull(); } else toast((r&&r.message)||'تعذّر الإرسال','error'); }); }
  function cmenu(){ var m=document.getElementById('sb-cm'); if(m) m.style.display=m.style.display==='none'?'flex':'none'; }
  function blk(){ if(!CH.w)return; if(!CH.blocked&&!confirm('تحظره؟ ما يقدر يراسلك ولا يقدّم على طلباتك، وما تشوف طلباته.'))return;
    api('/api/blocks/'+CH.w,{method:CH.blocked?'DELETE':'POST'}).then(function(r){ if(r&&r.ok){ CH.blocked=!CH.blocked; toast(CH.blocked?'تم الحظر':'تم فك الحظر'); var bb=document.getElementById('sb-blk'); if(bb) bb.textContent=CH.blocked?'فك الحظر':'🚫 حظر'; S.hub=null; } else toast((r&&r.message)||'تعذّر','error'); }); }
  function rpt(sid,uid){ sid=parseInt(sid); uid=parseInt(uid)||0; clearInterval(CH.t);
    var R=['طلب وهمي أو غير جاد','إزعاج أو رسائل مزعجة','يطلب التواصل برا المنصة','محتوى غير لائق','أخرى'];
    var sh=document.querySelector('#sbOv .sb-sh'); if(!sh){ sheet(''); sh=document.querySelector('#sbOv .sb-sh'); }
    sh.innerHTML='<div class="sb-grab"></div><div class="sb-row" style="justify-content:space-between"><b style="font-size:16px">🚩 '+(uid?'بلاغ عن المحادثة':'بلاغ عن الطلب')+'</b><button type="button" class="sb-b sb-o" style="padding:6px 10px" onclick="SubC.x()">✕</button></div>'
      +'<div class="sb-s" style="margin:4px 0 10px">يوصل الإدارة وتراجعه — اسمك ما يظهر للطرف الثاني</div><div class="sb-chips" id="sb-rr">'+R.map(function(r){return '<button type="button" data-r="'+esc(r)+'">'+esc(r)+'</button>';}).join('')+'</div>'
      +'<label class="sb-l">تفاصيل (اختياري)</label><textarea class="sb-f" id="sb-rd" rows="3" maxlength="500"></textarea><button type="button" class="sb-b sb-v" style="width:100%;margin-top:12px" id="sb-rs">أرسل البلاغ</button>';
    var sel=''; document.getElementById('sb-rr').addEventListener('click',function(e){ var b=e.target.closest('button[data-r]'); if(!b)return; sel=b.getAttribute('data-r'); [].forEach.call(this.children,function(c){c.classList.toggle('on',c===b);}); });
    document.getElementById('sb-rs').onclick=function(){ if(!sel){ toast('اختر السبب','error'); return; } this.disabled=true;
      api('/api/sub/'+sid+'/report',{method:'POST',body:JSON.stringify({reason:sel,details:(document.getElementById('sb-rd')||{}).value||'',user_id:uid||null})}).then(function(r){ if(r&&r.ok){ toast('وصل بلاغك — شكراً'); closeSheet(); } else toast((r&&r.message)||'تعذّر','error'); }); };
  }
  function back(){ clearInterval(CH.t); closeSheet(); if(S.view&&S.view.id) open(S.view.id,null,true); }
  // جا من رابط مشاركة وسجّل/دخل → افتح الطلب
  setTimeout(function(){ try{ var pd=localStorage.getItem('mnq_sub_pending'); if(pd){ localStorage.removeItem('mnq_sub_pending'); var id=parseInt(pd); if(id){ W._subOpen=id; if(W._curPage==='sub') open(id); else if(W.gotoPage) W.gotoPage('sub'); } } }catch(e){} },1200);
  setTimeout(function(){ css(); markNav(); count(); },300);
  setInterval(function(){ if(document.visibilityState!=='hidden') count(); },90000);
  W.SubC={ext:ext,rej:rej,pv:pv,list:function(){ closeSheet(); clearInterval(CH.t); S.view=null; if(S.hub)render(); else load(); },osort:function(id,k){ S.osort=k; open(id,null,true); },otab:function(id,t){ S.otab=t; open(id,null,true); },back2:back2,save:toggleSave,ff:function(f){ S.ff=f; render(); },mt:function(t){ S.mt=t; render(); },q:function(v){ S.q=v; clearTimeout(S.qt); S.qt=setTimeout(function(){ render(); var i=document.getElementById('sb-q'); if(i){ i.focus(); try{ i.setSelectionRange(i.value.length,i.value.length); }catch(e){} } },250); },phAdd:phAdd,phRm:phRm,prog:prog,nd2:nd2,intro:intro,introGo:introGo,introF:function(){ intro(true); },homeCard:homeCard,load:load,go:go,form:form,send:send,open:open,offer:offer,acc:acc,addp:addp,unp:unp,close:close,rate:rate,nd:nd,cmenu:cmenu,blk:blk,rpt:rpt,city:function(c){ S.city=c; render(); },rmF:rmF,rmK:rmK,edit:edit,wd:wd,cp:cp,chat:chat,say:say,back:back,x:function(){ clearInterval(CH.t); closeSheet(); }};
})();
