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
    +'.sb-emp{text-align:center;padding:26px 10px;color:var(--muted);font-weight:700;font-size:13px}';
    document.head.appendChild(st); }
  function sr(r){ r=r||{}; return (parseInt(r.n)>0)?'<span title="تقييم المقاولين" style="color:#6d28d9;font-weight:900">🤝 ★ '+r.avg+' ('+r.n+')</span>':''; }
  function av(name,img){ return '<span class="sb-av">'+(img&&/^https?:/.test(img)?'<img src="'+esc(img)+'" alt="">':esc(String(name||'م').charAt(0)))+'</span>'; }
  function hub(force,seen){ if(S.hub&&!force)return Promise.resolve(S.hub); return api('/api/sub/hub'+(seen?'?seen=1':'')).then(function(d){ if(d&&d.feed){ S.hub=d; } return S.hub||{mine:[],feed:[],partners:[]}; }); }
  // ── بطاقة الرئيسية ──
  function homeCard(){
    css(); var pg=document.getElementById('page-home'); if(!pg)return;
    var k=pg.querySelector('.pa-kpis'); if(!k)return;
    var box=document.getElementById('sb-home'); if(!box){ box=document.createElement('div'); box.id='sb-home'; k.parentNode.insertBefore(box,k.nextSibling); }
    hub(true).then(function(d){
      var open=(d.feed||[]).filter(function(x){return x.status==='open'&&!x.my_offer;});
      var h='<div class="sb-card sb-hero"><div class="sb-row"><span class="sb-ic">🤝</span><div style="flex:1;min-width:0"><div class="sb-t">تحتاج مقاول باطن؟<span class="sb-new" id="sb-hb" style="'+(badgeTxt()?'':'display:none')+'">'+badgeTxt()+'</span></div><div class="sb-s">كهربائي، سبّاك، عازل… من مزوّدين في مدينتك مسجّلين في المنصة</div></div></div>'
        +'<div class="sb-row" style="gap:8px;margin-top:12px"><button type="button" class="sb-b sb-v" style="flex:1" onclick="SubC.form()">＋ اطلب مقاول باطن</button><button type="button" class="sb-b sb-o" onclick="SubC.go(\'partners\')">شركائي'+((d.partners||[]).length?' ('+d.partners.length+')':'')+'</button></div></div>';
      if(open.length) h+='<div class="sb-card"><div class="sb-row" style="justify-content:space-between"><span class="sb-t">🤝 طلبات من مقاولين تناسبك</span><button type="button" class="sb-b" style="padding:4px;background:none;color:#7c3aed;font-size:12.5px" onclick="SubC.go(\'feed\')">الكل ›</button></div>'
        +open.slice(0,2).map(function(x){ return '<div class="sb-it sb-row" onclick="SubC.open('+x.id+')"><div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(x.from_partner?'⭐ ':'')+esc(x.description)+'</div><div class="sb-s">'+esc(x.category)+' · من '+esc(x.owner_name||'مقاول')+(x.city?' · '+esc(x.city):'')+'</div></div><span class="sb-b sb-v" style="padding:8px 12px;font-size:12px">قدّم عرض</span></div>'; }).join('')+'</div>';
      box.innerHTML=h;
    }).catch(function(){});
  }
  // ── صفحة #sub ──
  function go(tab){ S.tab=tab||'feed'; if(W._curPage==='sub') render(); else W.gotoPage('sub'); }
  function load(){ css(); try{ localStorage.setItem('mnq_sub_seen','1'); }catch(e){} setTimeout(markNav,0); var pg=document.getElementById('page-sub'); if(!pg)return; pg.innerHTML='<div class="loading">جاري التحميل...</div>';
    hub(true,1).then(function(){ render(); setTimeout(count,800); if(W._subOpen){ var i=W._subOpen; W._subOpen=0; open(i); } }).catch(function(){ pg.innerHTML='<div class="sb-emp">تعذّر التحميل</div>'; }); }
  function render(){
    var pg=document.getElementById('page-sub'); if(!pg||!S.hub)return; var d=S.hub;
    var nF=(d.feed||[]).filter(function(x){return x.status==='open'&&!x.my_offer;}).length;
    var h='<div class="sb-card sb-hero"><div class="sb-row"><span class="sb-ic">🤝</span><div style="flex:1"><div class="sb-t">المزوّدين يكمّلون بعض</div><div class="sb-s">اطلب مقاول باطن لشغلك، أو قدّم على طلبات المقاولين في تخصصك — يشوفها المزوّدين بس</div></div></div>'
      +'<details style="margin-top:10px"><summary class="sb-s" style="cursor:pointer;color:#6d28d9">كيف تشتغل؟</summary><div class="sb-s" style="margin-top:6px">1. تنشر وش تحتاج (التخصص، المدينة، الشغل، المرفقات).<br>2. يوصل الفنيين المناسبين إشعار — شركاؤك أول.<br>3. يسألونك بالمحادثة ويقدّمون أسعارهم، ويظهر لهم رقمك بعد العرض.<br>4. تعتمد الأنسب، وتتواصلون وتتفقون. والعمولة 3% على الفني اللي تعتمد عرضه.<br>5. تقيّمون بعض، وتحفظه في شركائك لو ارتحت له.<br>الطلب ينقفل تلقائياً بعد 30 يوم.</div></details>'+'<button type="button" class="sb-b sb-v" style="width:100%;margin-top:12px" onclick="SubC.form()">＋ اطلب مقاول باطن</button></div>'
      +'<div class="sb-tabs"><button type="button" class="'+(S.tab==='feed'?'on':'')+'" onclick="SubC.go(\'feed\')">من المقاولين'+(nF?' ('+nF+')':'')+'</button><button type="button" class="'+(S.tab==='mine'?'on':'')+'" onclick="SubC.go(\'mine\')">طلباتي'+(d.mine.length?' ('+d.mine.length+')':'')+'</button><button type="button" class="'+(S.tab==='partners'?'on':'')+'" onclick="SubC.go(\'partners\')">⭐ شركائي'+(d.partners.length?' ('+d.partners.length+')':'')+'</button></div>';
    if(S.tab==='feed'){
      var cities=[]; (d.feed||[]).forEach(function(x){ if(x.city&&cities.indexOf(x.city)<0)cities.push(x.city); });
      if(cities.length>1) h+='<div class="sb-chips" style="margin:-4px 0 12px">'+['الكل'].concat(cities).map(function(c){ var on=(S.city||'الكل')===c; return '<button type="button" class="'+(on?'on':'')+'" onclick="SubC.city(\''+esc(c).replace(/'/g,"\\'")+'\')">'+(c==='الكل'?'كل المدن':'📍 '+esc(c))+'</button>'; }).join('')+'</div>';
      var FL=(d.feed||[]).filter(function(x){ return !S.city||S.city==='الكل'||x.city===S.city; });
      h+=FL.length?FL.map(function(x){ var st=x.my_offer?(x.my_offer.status==='accepted'?'<span class="sb-tag" style="background:#dcfce7;color:#166534">🎉 اعتمد عرضك</span>':(x.my_offer.status==='rejected'?'<span class="sb-tag" style="background:#f1f5f9;color:#64748b">اختار غيرك</span>':'<span class="sb-tag" style="background:#e0ecff;color:#1d4ed8">✓ قدّمت '+fmt(x.my_offer.price)+'</span>')):'';
        return '<div class="sb-card" style="cursor:pointer" onclick="SubC.open('+x.id+')"><div class="sb-row" style="justify-content:space-between"><span class="sb-tag">'+(x.from_partner?'⭐ من شريكك':'🤝 مقاول باطن')+'</span><span class="sb-s">'+esc(ago(x.created_at))+'</span></div>'
          +'<div class="sb-t" style="margin-top:8px">'+esc(x.description)+'</div><div class="sb-s">'+esc(x.category)+(x.city?' · 📍 '+esc(x.city)+(x.district?' · '+esc(x.district):''):'')+(x.start_text?' · يبدأ '+esc(x.start_text):'')+((x.attachments||[]).length?' · 📎 مرفقات':'')+'</div>'
          +'<div class="sb-row" style="margin-top:10px;background:var(--bg,#f8fafc);border-radius:12px;padding:9px">'+av(x.owner_name,x.owner_image)+'<div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13px">'+esc(x.owner_name||'مقاول')+'</div><div class="sb-s">'+(parseFloat(x.owner_rating)>0?'⭐ '+x.owner_rating+' · ':'')+(x.owner_done?x.owner_done+' مشروع على المنصة':'عضو في المنصة')+(sr(x.owner_srate)?' · '+sr(x.owner_srate):'')+'</div></div>'+(st||'<span class="sb-b sb-v" style="padding:8px 12px;font-size:12.5px">قدّم عرضك</span>')+'</div></div>'; }).join('')
        :(d.no_spec?'<div class="sb-card sb-emp">حدّد تخصصاتك عشان توصلك طلبات المقاولين اللي تناسبك.<br><button type="button" class="sb-b sb-v" style="margin-top:12px" onclick="gotoPage(\'profile\')">حدّد تخصصاتك</button></div>':'<div class="sb-card sb-emp">ما فيه طلبات من مقاولين في تخصصك ومدينتك الحين.<br>يوصلك إشعار أول ما ينزل طلب.</div>');
      h+='<div class="sb-card" style="background:#f0fdf4;border-color:#bbf7d0"><div class="sb-t" style="color:#166534">💡 ليش تقدّم؟</div><div class="sb-s">المقاول اللي يرتاح لك يحفظك في «شركائي» — وتوصلك طلباته قبل غيرك بساعتين</div></div>';
    } else if(S.tab==='mine'){
      h+=d.mine.length?'<div class="sb-card">'+d.mine.map(function(x){ var st={open:['مفتوح','#dcfce7','#166534'],awarded:['✓ اعتمدت عرض','#e0ecff','#1d4ed8'],closed:['مغلق','#f1f5f9','#64748b']}[x.status]||['—','#f1f5f9','#64748b'];
        return '<div class="sb-it sb-row" onclick="SubC.open('+x.id+')"><div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13.5px">'+esc(x.description)+'</div><div class="sb-s">'+esc(x.category)+' · '+esc(ago(x.created_at))+'</div></div><div style="text-align:center"><b style="font-size:17px;color:#7c3aed">'+(x.offers||0)+'</b><div class="sb-s" style="font-size:11px">عرض</div></div><span class="sb-tag" style="background:'+st[1]+';color:'+st[2]+'">'+st[0]+'</span></div>'; }).join('')+'</div>'
        +'<div class="sb-s" style="text-align:center">باقي لك '+(d.month_left||0)+' طلبات هالشهر</div>'
        :'<div class="sb-card sb-emp">ما طلبت مقاول باطن للحين.<br><button type="button" class="sb-b sb-v" style="margin-top:12px" onclick="SubC.form()">＋ اطلب أول طلب</button></div>';
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
  function form(ed){
    F={cat:ed?ed.category:'',atts:[],keep:ed?(ed.attachments||[]).slice():[],edit:ed?ed.id:0}; var d=S.hub||{partners:[]}, me=W._prof||{};
    var o=sheet('<div class="sb-row" style="justify-content:space-between"><b style="font-family:Cairo,sans-serif;font-size:18px">'+(ed?'تعديل الطلب':'اطلب مقاول باطن')+'</b><button type="button" class="sb-b sb-o" style="padding:6px 10px" onclick="SubC.x()">✕</button></div>'
      +'<div class="sb-s">يشوفه المزوّدين بس — العملاء ما يشوفونه</div>'
      +(ed?'<label class="sb-l">التخصص</label><span class="sb-tag" style="font-size:12.5px;padding:6px 12px">🤝 '+esc(ed.category)+'</span><div class="sb-s" style="margin-top:4px">التخصص ما يتغيّر — لو تبي تخصص ثاني انشر طلب جديد</div><div id="sb-cats" style="display:none"></div><select id="sb-cat-all" style="display:none"></select>':'<label class="sb-l">وش التخصص اللي تحتاجه؟</label><div class="sb-chips" id="sb-cats">'+TOP.map(function(c){return '<button type="button" data-c="'+esc(c[1])+'">'+c[0]+' '+esc(c[1])+'</button>';}).join('')
        +'<button type="button" data-c="_more">＋ غيرها</button></div><div id="sb-cat-all" style="display:none;margin-top:8px"><input class="sb-f" id="sb-cq" placeholder="🔍 اكتب التخصص… مثلاً: مصاعد" autocomplete="off"><div class="sb-chips" id="sb-cl" style="margin-top:8px;max-height:190px;overflow:auto"></div></div>')
      +'<div class="sb-row" style="gap:8px"><div style="flex:1"><label class="sb-l">المدينة</label>'+cityHtml(ed?(ed.city||''):(me.city||''))+'</div><div style="flex:1"><label class="sb-l">الحي (اختياري)</label><input class="sb-f" id="sb-dist" maxlength="60" value="'+esc(ed&&ed.district||'')+'"></div></div>'
      +'<label class="sb-l">وش الشغل؟</label><textarea class="sb-f" id="sb-desc" rows="3" maxlength="1500" placeholder="مثلاً: تمديدات كهرباء كاملة لفيلا دورين 400م، المخطط جاهز">'+esc(ed&&ed.description||'')+'</textarea>'
      +'<div class="sb-row" style="gap:8px"><div style="flex:1"><label class="sb-l">متى تبدأ؟</label><input class="sb-f" id="sb-start" maxlength="60" placeholder="بعد أسبوعين" value="'+esc(ed&&ed.start_text||'')+'"></div><div style="flex:1"><label class="sb-l">الميزانية (اختياري)</label><input class="sb-f" id="sb-bud" inputmode="numeric" placeholder="ر.س" oninput="var d=this.value.replace(/[٠-٩]/g,function(x){return \'٠١٢٣٤٥٦٧٨٩\'.indexOf(x);}).replace(/[^0-9]/g,\'\');this.value=d?Number(d).toLocaleString(\'en-US\'):\'\'" value="'+(ed&&ed.budget?ed.budget:'')+'"></div></div>'
      +'<label class="sb-l">📎 المرفقات (اختياري) — تساعد الفني يعطيك سعر دقيق</label>'
      +'<label class="sb-up"><input type="file" id="sb-img" accept="image/*" multiple><span class="sb-upi">🖼️</span><span class="sb-upt"><b>اضغط لإضافة صور</b><small>صور الموقع أو الشغل · حتى 6 صور</small></span></label>'
      +'<label class="sb-up" style="margin-top:8px"><input type="file" id="sb-doc" accept=".pdf,.dwg,.dxf,.xlsx,.xls,.docx,.doc,.zip,.rar"><span class="sb-upi">📐</span><span class="sb-upt"><b>ارفع المخطط أو الملفات</b><small>PDF · DWG · Excel · Word · ZIP — حتى 4 ملفات</small></span><span class="sb-upb">مهم للأسعار</span></label>'
      +'<div id="sb-fl"></div><div class="sb-s" id="sb-ft" style="margin-top:4px"></div>'
      +(!ed&&(d.partners||[]).length?'<label class="sb-card sb-row" style="margin:12px 0 0;padding:11px 12px;cursor:pointer;border-color:#ddd6fe"><span>⭐</span><div style="flex:1"><div class="sb-t" style="font-size:13px">أرسله لشركائي أول</div><div class="sb-s">شركاؤك الـ'+d.partners.length+' يشوفونه قبل الباقين بساعتين</div></div><input type="checkbox" id="sb-pf" checked style="width:20px;height:20px;accent-color:#7c3aed"></label>':'')
      +'<button type="button" class="sb-b sb-v" id="sb-send" style="width:100%;margin-top:14px;padding:13px" onclick="SubC.send()">'+(ed?'احفظ التعديل':'انشر الطلب')+'</button>'
      +'<div class="sb-s" style="text-align:center;margin-top:7px">'+(ed?'اللي قدّموا عروض يوصلهم إن الطلب تعدّل':'يوصل الفنيين المناسبين في مدينتك إشعار')+'</div>');
    paintF();
    var nz=function(t){ return String(t||'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/^ال/,'').trim(); };
    var topN=TOP.map(function(t){return t[1];});
    var paintCL=function(){ var q=nz((document.getElementById('sb-cq')||{}).value||''), L=document.getElementById('sb-cl'); if(!L)return;
      var arr=CATS.filter(function(c){ return topN.indexOf(c)<0&&(!q||nz(c).indexOf(q)>=0||c.split(' ').some(function(w){return nz(w).indexOf(q)===0;})); });
      L.innerHTML=arr.length?arr.map(function(c){ return '<button type="button" data-k="'+esc(c)+'" class="'+(F.cat===c?'on':'')+'">'+(F.cat===c?'✓ ':'')+esc(c)+'</button>'; }).join(''):'<div class="sb-s">ما لقينا تخصص بهالاسم — اختر «أخرى» واكتبه في وصف الشغل</div>'; };
    if(!ed) o.querySelector('#sb-cats').addEventListener('click',function(e){ var b=e.target.closest('button[data-c]'); if(!b)return; var c=b.getAttribute('data-c'); [].forEach.call(this.children,function(x){x.classList.remove('on');}); b.classList.add('on'); var box=document.getElementById('sb-cat-all');
      if(c==='_more'){ box.style.display=''; F.cat=''; paintCL(); setTimeout(function(){ var q=document.getElementById('sb-cq'); if(q)q.focus(); },30); } else { box.style.display='none'; F.cat=c; } });
    if(!ed){ o.querySelector('#sb-cq').addEventListener('input',paintCL); o.querySelector('#sb-cl').addEventListener('click',function(e){ var b=e.target.closest('button[data-k]'); if(!b)return; F.cat=b.getAttribute('data-k'); paintCL(); var mb=o.querySelector('#sb-cats button[data-c="_more"]'); if(mb) mb.textContent='✓ '+F.cat; }); }
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
  function send(){
    var v=function(id){ var e=document.getElementById(id); return e?String(e.value||'').trim():''; };
    if(!F.cat){ toast('اختر التخصص اللي تحتاجه','error'); return; }
    if(F.atts.some(function(a){return !a.data;})){ toast('لحظات — نجهّز الملفات','error'); return; }
    if(!v('sb-city')){ toast('اختر المدينة','error'); return; }
    if(v('sb-desc').length<10){ toast('اكتب وش الشغل بالتفصيل','error'); var t=document.getElementById('sb-desc'); if(t)t.focus(); return; }
    var b=document.getElementById('sb-send'); if(b){ b.disabled=true; b.textContent='جاري النشر...'; }
    var pf=document.getElementById('sb-pf');
    if(F.edit){ var eid=F.edit; api('/api/sub/'+eid,{method:'PUT',body:JSON.stringify({city:v('sb-city'),district:v('sb-dist'),description:v('sb-desc'),start_text:v('sb-start'),budget:v('sb-bud'),keep:F.keep.map(function(a){return a.url;}),attachments:F.atts.map(function(a){return {name:a.name,data:a.data};})})}).then(function(r){
      if(r&&r.ok){ toast('تم حفظ التعديل'); S.hub=null; open(eid); if(W._curPage==='sub')load(); } else { toast((r&&r.message)||'تعذّر الحفظ','error'); if(b){ b.disabled=false; b.textContent='احفظ التعديل'; } } }).catch(function(){ toast('تعذّر الاتصال','error'); if(b){ b.disabled=false; b.textContent='احفظ التعديل'; } }); return; }
    api('/api/sub',{method:'POST',body:JSON.stringify({category:F.cat,city:v('sb-city'),district:v('sb-dist'),description:v('sb-desc'),start_text:v('sb-start'),budget:v('sb-bud'),attachments:F.atts.map(function(a){return {name:a.name,data:a.data};}),partners_first:pf?pf.checked:false})}).then(function(r){
      if(r&&r.ok){ closeSheet(); toast(r.partners_first?'تم النشر — وصل شركاءك أول، والباقين بعد ساعتين':'تم النشر — وصل المزوّدين المناسبين إشعار'); S.tab='mine'; if(W._curPage==='sub') load(); else W.gotoPage('sub'); }
      else { toast((r&&r.message)||'تعذّر النشر','error'); if(b){ b.disabled=false; b.textContent='انشر الطلب'; } }
    }).catch(function(){ toast('تعذّر الاتصال','error'); if(b){ b.disabled=false; b.textContent='انشر الطلب'; } });
  }
  // ── تفاصيل طلب ──
  function open(id){
    sheet('<div class="sb-emp">جاري التحميل...</div>');
    api('/api/sub/'+id).then(function(x){
      if(!x||!x.id){ closeSheet(); toast((x&&x.message)||'الطلب غير متاح','error'); return; }
      var h='<div class="sb-row" style="justify-content:space-between"><span class="sb-tag">🤝 '+esc(x.category)+'</span><button type="button" class="sb-b sb-o" style="padding:6px 10px" onclick="SubC.x()">✕</button></div>'
        +'<div class="sb-t" style="font-size:16px;margin-top:8px;line-height:1.7">'+esc(x.description)+'</div>'
        +'<div class="sb-s">'+(x.city?'📍 '+esc(x.city)+(x.district?' · '+esc(x.district):''):'')+(x.start_text?' · يبدأ '+esc(x.start_text):'')+(x.budget?' · الميزانية '+fmt(x.budget)+' ر.س':'')+' · '+esc(ago(x.created_at))+(x.is_owner&&x.expires_days!=null?' · ينقفل بعد '+x.expires_days+' يوم':'')+(x.edited_at?' · معدّل':'')+'</div>'
        +((x.attachments||[]).length?'<div class="sb-row" style="flex-wrap:wrap;gap:8px;margin-top:10px">'+x.attachments.map(function(a){ var im=/\.(jpe?g|png|webp|gif|heic)(\?|$)/i.test(a.url)||/\/image\/upload\//.test(a.url)&&!/\.(pdf|dwg|dxf|xlsx?|docx?|zip|rar)$/i.test(a.name||''); return im?'<a href="'+esc(a.url)+'" target="_blank" rel="noopener"><img src="'+esc(a.url)+'" alt="'+esc(a.name||'صورة')+'" loading="lazy" style="width:72px;height:72px;object-fit:cover;border-radius:11px;border:1px solid var(--border,#e3eaf6)"></a>':'<a class="sb-b sb-o" style="padding:8px 12px;font-size:12.5px" href="'+esc(a.url)+'" target="_blank" rel="noopener">📄 '+esc(a.name||'ملف')+'</a>';}).join('')+'</div>':'');
      if(x.is_owner){
        if(x.nodeal_ask) h+='<div class="sb-card" style="margin-top:12px;border-color:#fde68a;background:#fffbeb"><div class="sb-t">❓ الفني يقول ما تم الاتفاق</div><div class="sb-s">صحيح؟ لو صحيح ينفتح طلبك من جديد وترجع العروض الثانية.</div><div class="sb-row" style="gap:8px;margin-top:10px"><button type="button" class="sb-b sb-v" style="flex:1" onclick="SubC.nd('+x.id+',1)">صحيح، ما اتفقنا</button><button type="button" class="sb-b sb-o" style="flex:1" onclick="SubC.nd('+x.id+',0)">لا، اتفقنا</button></div></div>';
        var acc=(x.offers||[]).filter(function(o){return o.status==='accepted';})[0];
        h+='<div class="sb-t" style="margin:16px 0 8px">'+(x.offers.length?'العروض ('+x.offers.length+')':'ما وصلت عروض للحين')+'</div>';
        h+=(x.offers||[]).map(function(o){ return '<div class="sb-card" style="margin-bottom:9px'+(o.status==='accepted'?';border-color:#86efac':'')+'"><div class="sb-row">'+av(o.name,o.profile_image)+'<div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13.5px">'+esc(o.name)+(o.is_partner?' <span class="sb-tag">⭐ شريكك</span>':'')+'</div><div class="sb-s">'+(parseFloat(o.rating)>0?'⭐ '+o.rating+' · ':'')+(o.done?o.done+' مشروع':'جديد')+(o.city?' · '+esc(o.city):'')+(sr(o.srate)?' · '+sr(o.srate):'')+'</div></div><div style="text-align:left"><b style="font-size:17px">'+fmt(o.price)+'</b><div class="sb-s">ر.س'+(o.days?' · '+o.days+' يوم':'')+'</div></div></div>'
          +(o.note?'<div class="sb-s" style="margin-top:8px;background:var(--bg,#f8fafc);border-radius:10px;padding:8px 10px;white-space:pre-wrap">'+esc(o.note)+'</div>':'')
          +'<div class="sb-row" style="gap:7px;margin-top:10px;flex-wrap:wrap">'
            +(x.status==='open'?'<button type="button" class="sb-b sb-v" style="flex:1" onclick="SubC.acc('+x.id+','+o.id+','+o.provider_id+')">اعتمد العرض</button>':(o.status==='accepted'?'<span class="sb-tag" style="background:#dcfce7;color:#166534;padding:7px 11px">✓ اعتمدته</span>':''))
            +(o.phone?'<a class="sb-b sb-g" style="padding:10px 12px" href="'+esc(wa(o.phone,'السلام عليكم، بخصوص عرضك على طلبي في منصة مناقصة'))+'" target="_blank" rel="noopener">واتساب</a>':'')
            +'<button type="button" class="sb-b sb-o" style="padding:10px 12px" onclick="SubC.chat('+x.id+','+o.provider_id+')">💬</button>'+(!o.is_partner?'<button type="button" class="sb-b sb-o" style="padding:10px 12px" onclick="SubC.addp('+o.provider_id+','+x.id+')">⭐ لشركائي</button>':'')
          +'</div></div>'; }).join('');
        if((x.threads||[]).length) h+='<div class="sb-t" style="margin:14px 0 8px">💬 الرسائل</div><div class="sb-card" style="padding:4px 12px">'+x.threads.map(function(t){ return '<div class="sb-it sb-row" onclick="SubC.chat('+x.id+','+t.other+')">'+av(t.name,t.profile_image)+'<div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13.5px">'+esc(t.name)+'</div><div class="sb-s" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(t.last_body||'')+'</div></div>'+(t.unread?'<span class="sb-tag" style="background:#7c3aed;color:#fff">'+t.unread+'</span>':'')+'</div>'; }).join('')+'</div>';
        if(x.status==='open') h+='<div class="sb-row" style="gap:8px;margin-top:10px"><button type="button" class="sb-b sb-o" style="flex:1" onclick="SubC.edit('+x.id+')">✏️ تعديل</button><button type="button" class="sb-b sb-o" style="flex:1;color:#b91c1c" onclick="SubC.close('+x.id+')">إغلاق الطلب</button></div>'
          +'<div class="sb-card" style="margin-top:10px;border-color:#bbf7d0;background:#f0fdf4"><div class="sb-t" style="color:#166534">🔗 تعرف فني برا المنصة؟</div><div class="sb-s">أرسل له رابط الطلب — يسجّل مجاناً ويقدّم عرضه</div><div class="sb-row" style="gap:8px;margin-top:10px"><a class="sb-b sb-g" style="flex:1" target="_blank" rel="noopener" href="'+esc(waT('مطلوب '+x.category+(x.city?' في '+x.city:'')+':\n'+x.description+'\n\nقدّم عرضك من هنا (التسجيل مجاني):\n'+x.share_url))+'">شارك واتساب</a><button type="button" class="sb-b sb-o" onclick="SubC.cp(\''+esc(x.share_url)+'\')">نسخ الرابط</button></div></div>';
      } else {
        h+='<div class="sb-row" style="margin-top:12px;background:var(--bg,#f8fafc);border-radius:12px;padding:10px">'+av(x.owner_name,x.owner_image)+'<div style="flex:1"><div class="sb-t" style="font-size:13.5px">'+esc(x.owner_name||'مقاول')+'</div><div class="sb-s">صاحب الطلب'+(sr(x.owner_srate)?' · '+sr(x.owner_srate):'')+(x.owner_phone?'':' · رقمه يظهر لك بعد ما تقدّم')+'</div></div>'
          +(x.owner_phone?'<a class="sb-b sb-g" style="padding:9px 12px" href="'+esc(wa(x.owner_phone,'السلام عليكم، قدّمت عرض على طلبك في منصة مناقصة'))+'" target="_blank" rel="noopener">واتساب</a>':'')+'</div>';
        var m=x.my_offer;
        if(x.status==='open'||m) h+='<button type="button" class="sb-b sb-o" style="width:100%;margin-top:8px" onclick="SubC.chat('+x.id+','+x.owner_id+')">💬 '+(m?'راسل المقاول':'اسأل المقاول قبل ما تقدّم')+(x.unread?' <span class="sb-tag" style="background:#7c3aed;color:#fff">'+x.unread+'</span>':'')+'</button>';
        if(m&&m.status==='accepted') h+='<div class="sb-card" style="margin-top:12px;background:#f0fdf4;border-color:#bbf7d0"><div class="sb-t" style="color:#166534">🎉 اعتمد عرضك — '+fmt(m.price)+' ر.س</div><div class="sb-s">تواصلوا واتفقوا على التفاصيل. عمولة المنصة 3% عند الاتفاق.</div></div>';
        else if(m&&m.status==='rejected') h+='<div class="sb-card" style="margin-top:12px"><div class="sb-s">اختار عرض ثاني — شكراً لعرضك.</div></div>';
        else if(x.status==='open'){
          h+='<div class="sb-t" style="margin:16px 0 0">'+(m?'عرضك (تقدر تعدّله)':'قدّم عرضك')+'</div>'
            +'<div class="sb-row" style="gap:8px"><div style="flex:1"><label class="sb-l">السعر (ر.س)</label><input class="sb-f" id="sb-p" inputmode="numeric" oninput="this.value=this.value.replace(/[٠-٩]/g,function(x){return \'٠١٢٣٤٥٦٧٨٩\'.indexOf(x);}).replace(/[^0-9]/g,\'\')" value="'+(m?m.price:'')+'"></div><div style="flex:1"><label class="sb-l">المدة (أيام)</label><input class="sb-f" id="sb-d" inputmode="numeric" oninput="this.value=this.value.replace(/[٠-٩]/g,function(x){return \'٠١٢٣٤٥٦٧٨٩\'.indexOf(x);}).replace(/[^0-9]/g,\'\')" value="'+(m&&m.days?m.days:'')+'"></div></div>'
            +'<label class="sb-l">ملاحظة للمقاول (اختياري)</label><textarea class="sb-f" id="sb-n" rows="2" maxlength="1000" placeholder="خبرتك، وش يشمل سعرك…">'+esc(m&&m.note||'')+'</textarea>'
            +'<label class="sb-row" style="gap:9px;margin-top:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:10px;cursor:pointer"><input type="checkbox" id="sb-fee" style="width:18px;height:18px;accent-color:#d97706"'+(m?' checked':'')+'><span class="sb-s" style="color:#92400e">أتعهد بسداد سعي المنصة 3% من قيمة الاتفاق إذا انعتمد عرضي — ينضاف في محفظة السعي</span></label>'
            +'<button type="button" class="sb-b sb-v" id="sb-ob" style="width:100%;margin-top:12px;padding:13px" onclick="SubC.offer('+x.id+')">'+(m?'حدّث عرضك':'أرسل العرض ← ويظهر لك رقمه')+'</button>'+(m?'<button type="button" class="sb-b sb-o" style="width:100%;margin-top:8px;color:#b91c1c" onclick="SubC.wd('+x.id+')">↩️ اسحب عرضي</button>':'');
        }
      }
      if(!x.is_owner) h+='<button type="button" class="sb-b" style="background:none;color:var(--muted);font-size:12px;margin:12px auto 0;display:block" onclick="SubC.rpt('+x.id+',0)">🚩 بلاغ عن الطلب</button>';
      if(x.rate){
        if(x.rate.can) h+='<div class="sb-card" style="margin-top:12px;border-color:#ddd6fe" id="sb-rate"><div class="sb-t">⭐ قيّم تعاملك</div><div class="sb-s">'+(x.is_owner?'كيف كان شغل المقاول؟':'كيف كان التعامل مع صاحب الطلب؟')+' — يطلع للمزوّدين، ومنفصل عن تقييم العملاء</div>'
          +'<div id="sb-stars" style="display:flex;gap:4px;margin:10px 0">'+[1,2,3,4,5].map(function(i){return '<button type="button" data-s="'+i+'" aria-label="'+i+' نجوم" style="border:0;background:none;font-size:30px;cursor:pointer;color:#cbd5e1;padding:0 2px">★</button>';}).join('')+'</div>'
          +'<textarea class="sb-f" id="sb-rc" rows="2" maxlength="300" placeholder="كلمة عن التعامل (اختياري)"></textarea><button type="button" class="sb-b sb-v" style="width:100%;margin-top:10px" onclick="SubC.rate('+x.id+')">أرسل التقييم</button></div>';
        else if(x.rate.mine) h+='<div class="sb-s" style="margin-top:12px;text-align:center">قيّمت هذا التعامل <span style="color:#f59e0b">'+'★'.repeat(x.rate.mine.stars)+'</span></div>';
      }
      var sh=document.querySelector('#sbOv .sb-sh'); if(sh) sh.innerHTML='<div class="sb-grab"></div>'+h;
      var stb=document.getElementById('sb-stars'); if(stb) stb.addEventListener('click',function(e){ var b=e.target.closest('button[data-s]'); if(!b)return; S.stars=parseInt(b.getAttribute('data-s')); [].forEach.call(stb.children,function(c){ c.style.color=parseInt(c.getAttribute('data-s'))<=S.stars?'#f59e0b':'#cbd5e1'; }); });
    }).catch(function(){ closeSheet(); toast('تعذّر التحميل','error'); });
  }
  function offer(id){
    var p=(document.getElementById('sb-p')||{}).value, d=(document.getElementById('sb-d')||{}).value, n=(document.getElementById('sb-n')||{}).value, f=document.getElementById('sb-fee');
    if(!(parseInt(String(p).replace(/[^\d]/g,''))>=50)){ toast('اكتب سعرك','error'); return; }
    if(!f||!f.checked){ toast('لازم توافق على عمولة المنصة 3%','error'); return; }
    var b=document.getElementById('sb-ob'); if(b){ b.disabled=true; }
    api('/api/sub/'+id+'/offers',{method:'POST',body:JSON.stringify({price:p,days:d,note:n,fee_ok:true})}).then(function(r){
      if(r&&r.ok){ toast('وصل عرضك للمقاول ✓'); S.hub=null; open(id); if(W._curPage==='sub')load(); }
      else { toast((r&&r.message)||'تعذّر الإرسال','error'); if(b)b.disabled=false; }
    }).catch(function(){ toast('تعذّر الاتصال','error'); if(b)b.disabled=false; });
  }
  function acc(id,oid,pid){
    if(!confirm('تعتمد هذا العرض؟ باقي العروض يوصلهم إن الطلب اكتمل.'))return;
    api('/api/sub/'+id+'/accept',{method:'POST',body:JSON.stringify({offer_id:oid})}).then(function(r){
      if(!(r&&r.ok)){ toast((r&&r.message)||'تعذّر','error'); return; }
      toast('تم الاعتماد ✓ — تواصل معه واتفقوا'); var ip=(S.hub&&S.hub.partners||[]).some(function(p){return String(p.id)===String(pid);});
      if(!ip&&confirm('⭐ تضيفه لشركائك؟ توصله طلباتك الجاية قبل غيره.')) addp(pid,id); else { open(id); load(); }
    });
  }
  function addp(pid,sid){ api('/api/partners',{method:'POST',body:JSON.stringify({id:pid})}).then(function(r){ if(r&&r.ok){ toast('⭐ صار من شركائك'); S.hub=null; if(sid)open(sid); if(W._curPage==='sub')load(); } else toast((r&&r.message)||'تعذّر','error'); }); }
  function unp(pid){ if(!confirm('تشيله من شركائك؟'))return; api('/api/partners/'+pid,{method:'DELETE'}).then(function(){ S.hub=null; load(); }); }
  function close(id){ if(!confirm('تقفل الطلب؟ ما عاد يقدر أحد يقدّم عليه.'))return; api('/api/sub/'+id+'/close',{method:'POST',body:'{}'}).then(function(r){ if(r&&r.ok){ toast('تم إغلاق الطلب'); closeSheet(); S.hub=null; load(); } else toast((r&&r.message)||'تعذّر','error'); }); }
  function rate(id){ if(!S.stars){ toast('اختر عدد النجوم','error'); return; }
    api('/api/sub/'+id+'/rate',{method:'POST',body:JSON.stringify({stars:S.stars,comment:(document.getElementById('sb-rc')||{}).value||''})}).then(function(r){ if(r&&r.ok){ toast('شكراً — وصل تقييمك'); S.stars=0; open(id); } else toast((r&&r.message)||'تعذّر','error'); }); }
  function nd(id,y){ api('/api/sub/'+id+'/nodeal-answer',{method:'POST',body:JSON.stringify({yes:!!y})}).then(function(r){ if(r&&r.ok){ toast(y?'تم — طلبك انفتح من جديد':'تم — وصل الفني'); S.hub=null; open(id); if(W._curPage==='sub')load(); } else toast((r&&r.message)||'تعذّر','error'); }); }
  function rmF(i){ F.atts.splice(i,1); paintF(); }
  function rmK(i){ F.keep.splice(i,1); paintF(); }
  function edit(id){ api('/api/sub/'+id).then(function(x){ if(x&&x.is_owner)form(x); }); }
  function wd(id){ if(!confirm('تسحب عرضك؟ يوصل المقاول إنك سحبته.'))return; api('/api/sub/'+id+'/offers',{method:'DELETE'}).then(function(r){ if(r&&r.ok){ toast('تم سحب عرضك'); S.hub=null; open(id); if(W._curPage==='sub')load(); } else toast((r&&r.message)||'تعذّر','error'); }); }
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
  function back(){ clearInterval(CH.t); open(CH.sid); }
  // جا من رابط مشاركة وسجّل/دخل → افتح الطلب
  setTimeout(function(){ try{ var pd=localStorage.getItem('mnq_sub_pending'); if(pd){ localStorage.removeItem('mnq_sub_pending'); var id=parseInt(pd); if(id){ W._subOpen=id; if(W._curPage==='sub') open(id); else if(W.gotoPage) W.gotoPage('sub'); } } }catch(e){} },1200);
  setTimeout(function(){ css(); markNav(); count(); },300);
  setInterval(function(){ if(document.visibilityState!=='hidden') count(); },90000);
  W.SubC={homeCard:homeCard,load:load,go:go,form:form,send:send,open:open,offer:offer,acc:acc,addp:addp,unp:unp,close:close,rate:rate,nd:nd,cmenu:cmenu,blk:blk,rpt:rpt,city:function(c){ S.city=c; render(); },rmF:rmF,rmK:rmK,edit:edit,wd:wd,cp:cp,chat:chat,say:say,back:back,x:function(){ clearInterval(CH.t); closeSheet(); }};
})();
