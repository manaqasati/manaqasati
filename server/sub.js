/* ═══ 🤝 مقاول باطن + شركائي — لوحة المزوّد ═══
   SubC.homeCard() بطاقة في الرئيسية · SubC.load() صفحة #sub · SubC.open(id) تفاصيل طلب */
(function(){
  var W=window;
  var CATS=['كهرباء','سباكة','تبريد وتكييف','عوازل مائية','عزل حراري','دهانات وديكور','جبس','بلاط ورخام','نجارة','حدادة','ألمنيوم','زجاج ومرايا','كاميرات مراقبة','شبكات وإنترنت','أنظمة الحريق والسلامة','أنظمة شمسية','مظلات وسواتر','كلادينج وواجهات','إنشاءات معدنية وهناجر','بناء','ترميم مبانٍ','تشطيبات ومقاولات عامة','مكاتب هندسية','تصاميم داخلي وخارجي','هدم','معدات ثقيلة','انترلوك وبلدورات','أعمال الطرق والأسفلت','صرف صحي وبيارات','حفر آبار ومضخات','تحلية ومعالجة مياه','أرضيات إيبوكسي','أرضيات خشبية وباركيه','تركيب مطابخ','تركيب أثاث','أبواب وبوابات','تركيب وصيانة مصاعد','تنسيق حدائق','مسابح','كشف تسربات المياه','تنظيف','تنظيف خزانات','تنظيف واجهات المباني','مكافحة حشرات','نقل عفش','صيانة عامة','أخرى'];
  var TOP=[['⚡','كهرباء'],['🚿','سباكة'],['❄️','تبريد وتكييف'],['💧','عوازل مائية'],['🎨','دهانات وديكور'],['🧱','بلاط ورخام'],['🪵','نجارة'],['🔩','حدادة']];
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function api(p,o){ return W._api(p,o); }
  function toast(m,t){ try{ W.showToast(m,t||'success'); }catch(e){} }
  function fmt(n){ return (parseInt(n)||0).toLocaleString('en-US'); }
  function ago(d){ try{ return W.timeAgoP?W.timeAgoP(d):''; }catch(e){ return ''; } }
  function wa(ph,txt){ var n=String(ph||'').replace(/\D/g,'').replace(/^00/,'').replace(/^0/,'966'); if(!n)return ''; var u='https://wa.me/'+n+(txt?'?text='+encodeURIComponent(txt):''); try{ if(W._waFix)u=W._waFix(u); }catch(e){} return u; }
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
    +'.sb-emp{text-align:center;padding:26px 10px;color:var(--muted);font-weight:700;font-size:13px}';
    document.head.appendChild(st); }
  function sr(r){ r=r||{}; return (parseInt(r.n)>0)?'<span title="تقييم المقاولين" style="color:#6d28d9;font-weight:900">🤝 ★ '+r.avg+' ('+r.n+')</span>':''; }
  function av(name,img){ return '<span class="sb-av">'+(img&&/^https?:/.test(img)?'<img src="'+esc(img)+'" alt="">':esc(String(name||'م').charAt(0)))+'</span>'; }
  function hub(force){ if(S.hub&&!force)return Promise.resolve(S.hub); return api('/api/sub/hub').then(function(d){ if(d&&d.feed){ S.hub=d; } return S.hub||{mine:[],feed:[],partners:[]}; }); }
  // ── بطاقة الرئيسية ──
  function homeCard(){
    css(); var pg=document.getElementById('page-home'); if(!pg)return;
    var k=pg.querySelector('.pa-kpis'); if(!k)return;
    var box=document.getElementById('sb-home'); if(!box){ box=document.createElement('div'); box.id='sb-home'; k.parentNode.insertBefore(box,k.nextSibling); }
    hub(true).then(function(d){
      var open=(d.feed||[]).filter(function(x){return x.status==='open'&&!x.my_offer;});
      var h='<div class="sb-card sb-hero"><div class="sb-row"><span class="sb-ic">🤝</span><div style="flex:1;min-width:0"><div class="sb-t">تحتاج مقاول باطن؟</div><div class="sb-s">كهربائي، سبّاك، عازل… من مدينتك وموثّقين في المنصة</div></div></div>'
        +'<div class="sb-row" style="gap:8px;margin-top:12px"><button type="button" class="sb-b sb-v" style="flex:1" onclick="SubC.form()">＋ اطلب مقاول باطن</button><button type="button" class="sb-b sb-o" onclick="SubC.go(\'partners\')">شركائي'+((d.partners||[]).length?' ('+d.partners.length+')':'')+'</button></div></div>';
      if(open.length) h+='<div class="sb-card"><div class="sb-row" style="justify-content:space-between"><span class="sb-t">🤝 طلبات من مقاولين تناسبك</span><button type="button" class="sb-b" style="padding:4px;background:none;color:#7c3aed;font-size:12.5px" onclick="SubC.go(\'feed\')">الكل ›</button></div>'
        +open.slice(0,2).map(function(x){ return '<div class="sb-it sb-row" onclick="SubC.open('+x.id+')"><div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+(x.from_partner?'⭐ ':'')+esc(x.description)+'</div><div class="sb-s">'+esc(x.category)+' · من '+esc(x.owner_name||'مقاول')+(x.city?' · '+esc(x.city):'')+'</div></div><span class="sb-b sb-v" style="padding:8px 12px;font-size:12px">قدّم عرض</span></div>'; }).join('')+'</div>';
      box.innerHTML=h;
    }).catch(function(){});
  }
  // ── صفحة #sub ──
  function go(tab){ S.tab=tab||'feed'; if(W._curPage==='sub') render(); else W.gotoPage('sub'); }
  function load(){ css(); var pg=document.getElementById('page-sub'); if(!pg)return; pg.innerHTML='<div class="loading">جاري التحميل...</div>';
    hub(true).then(function(){ render(); if(W._subOpen){ var i=W._subOpen; W._subOpen=0; open(i); } }).catch(function(){ pg.innerHTML='<div class="sb-emp">تعذّر التحميل</div>'; }); }
  function render(){
    var pg=document.getElementById('page-sub'); if(!pg||!S.hub)return; var d=S.hub;
    var nF=(d.feed||[]).filter(function(x){return x.status==='open'&&!x.my_offer;}).length;
    var h='<div class="sb-card sb-hero"><div class="sb-row"><span class="sb-ic">🤝</span><div style="flex:1"><div class="sb-t">المزوّدين يكمّلون بعض</div><div class="sb-s">اطلب مقاول باطن لشغلك، أو قدّم على طلبات المقاولين في تخصصك — يشوفها المزوّدين بس</div></div></div>'
      +'<button type="button" class="sb-b sb-v" style="width:100%;margin-top:12px" onclick="SubC.form()">＋ اطلب مقاول باطن</button></div>'
      +'<div class="sb-tabs"><button type="button" class="'+(S.tab==='feed'?'on':'')+'" onclick="SubC.go(\'feed\')">من المقاولين'+(nF?' ('+nF+')':'')+'</button><button type="button" class="'+(S.tab==='mine'?'on':'')+'" onclick="SubC.go(\'mine\')">طلباتي'+(d.mine.length?' ('+d.mine.length+')':'')+'</button><button type="button" class="'+(S.tab==='partners'?'on':'')+'" onclick="SubC.go(\'partners\')">⭐ شركائي'+(d.partners.length?' ('+d.partners.length+')':'')+'</button></div>';
    if(S.tab==='feed'){
      h+=d.feed.length?d.feed.map(function(x){ var st=x.my_offer?(x.my_offer.status==='accepted'?'<span class="sb-tag" style="background:#dcfce7;color:#166534">🎉 اعتمد عرضك</span>':(x.my_offer.status==='rejected'?'<span class="sb-tag" style="background:#f1f5f9;color:#64748b">اختار غيرك</span>':'<span class="sb-tag" style="background:#e0ecff;color:#1d4ed8">✓ قدّمت '+fmt(x.my_offer.price)+'</span>')):'';
        return '<div class="sb-card" style="cursor:pointer" onclick="SubC.open('+x.id+')"><div class="sb-row" style="justify-content:space-between"><span class="sb-tag">'+(x.from_partner?'⭐ من شريكك':'🤝 مقاول باطن')+'</span><span class="sb-s">'+esc(ago(x.created_at))+'</span></div>'
          +'<div class="sb-t" style="margin-top:8px">'+esc(x.description)+'</div><div class="sb-s">'+esc(x.category)+(x.city?' · 📍 '+esc(x.city)+(x.district?' · '+esc(x.district):''):'')+(x.start_text?' · يبدأ '+esc(x.start_text):'')+((x.attachments||[]).length?' · 📎 مرفقات':'')+'</div>'
          +'<div class="sb-row" style="margin-top:10px;background:var(--bg,#f8fafc);border-radius:12px;padding:9px">'+av(x.owner_name,x.owner_image)+'<div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13px">'+esc(x.owner_name||'مقاول')+'</div><div class="sb-s">'+(parseFloat(x.owner_rating)>0?'⭐ '+x.owner_rating+' · ':'')+(x.owner_done?x.owner_done+' مشروع على المنصة':'عضو في المنصة')+(sr(x.owner_srate)?' · '+sr(x.owner_srate):'')+'</div></div>'+(st||'<span class="sb-b sb-v" style="padding:8px 12px;font-size:12.5px">قدّم عرضك</span>')+'</div></div>'; }).join('')
        :'<div class="sb-card sb-emp">ما فيه طلبات من مقاولين في تخصصك ومدينتك الحين.<br>يوصلك إشعار أول ما ينزل طلب.</div>';
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
  function form(){
    F={cat:'',atts:[]}; var d=S.hub||{partners:[]}, me=W._prof||{};
    var o=sheet('<div class="sb-row" style="justify-content:space-between"><b style="font-family:Cairo,sans-serif;font-size:18px">اطلب مقاول باطن</b><button type="button" class="sb-b sb-o" style="padding:6px 10px" onclick="SubC.x()">✕</button></div>'
      +'<div class="sb-s">يشوفه المزوّدين بس — العملاء ما يشوفونه</div>'
      +'<label class="sb-l">وش التخصص اللي تحتاجه؟</label><div class="sb-chips" id="sb-cats">'+TOP.map(function(c){return '<button type="button" data-c="'+esc(c[1])+'">'+c[0]+' '+esc(c[1])+'</button>';}).join('')
        +'<button type="button" data-c="_more">＋ غيرها</button></div><select class="sb-f" id="sb-cat-all" style="display:none;margin-top:8px"><option value="">— اختر التخصص —</option>'+CATS.map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select>'
      +'<div class="sb-row" style="gap:8px"><div style="flex:1"><label class="sb-l">المدينة</label><input class="sb-f" id="sb-city" maxlength="60" value="'+esc(me.city||'')+'"></div><div style="flex:1"><label class="sb-l">الحي (اختياري)</label><input class="sb-f" id="sb-dist" maxlength="60"></div></div>'
      +'<label class="sb-l">وش الشغل؟</label><textarea class="sb-f" id="sb-desc" rows="3" maxlength="1500" placeholder="مثلاً: تمديدات كهرباء كاملة لفيلا دورين 400م، المخطط جاهز"></textarea>'
      +'<div class="sb-row" style="gap:8px"><div style="flex:1"><label class="sb-l">متى تبدأ؟</label><input class="sb-f" id="sb-start" maxlength="60" placeholder="بعد أسبوعين"></div><div style="flex:1"><label class="sb-l">الميزانية (اختياري)</label><input class="sb-f" id="sb-bud" inputmode="numeric" placeholder="ر.س"></div></div>'
      +'<label class="sb-l">📎 مخطط أو صور (اختياري)</label><input type="file" id="sb-file" accept="image/*,application/pdf" multiple class="sb-f" style="font-size:12.5px"><div id="sb-fn" class="sb-s"></div>'
      +((d.partners||[]).length?'<label class="sb-card sb-row" style="margin:12px 0 0;padding:11px 12px;cursor:pointer;border-color:#ddd6fe"><span>⭐</span><div style="flex:1"><div class="sb-t" style="font-size:13px">أرسله لشركائي أول</div><div class="sb-s">شركاؤك الـ'+d.partners.length+' يشوفونه قبل الباقين بساعتين</div></div><input type="checkbox" id="sb-pf" checked style="width:20px;height:20px;accent-color:#7c3aed"></label>':'')
      +'<button type="button" class="sb-b sb-v" id="sb-send" style="width:100%;margin-top:14px;padding:13px" onclick="SubC.send()">انشر الطلب</button>'
      +'<div class="sb-s" style="text-align:center;margin-top:7px">الاتفاق بينكم يخضع لنفس عمولة المنصة 3%</div>');
    o.querySelector('#sb-cats').addEventListener('click',function(e){ var b=e.target.closest('button[data-c]'); if(!b)return; var c=b.getAttribute('data-c'); [].forEach.call(this.children,function(x){x.classList.remove('on');}); b.classList.add('on'); var sel=document.getElementById('sb-cat-all'); if(c==='_more'){ sel.style.display=''; F.cat=sel.value; } else { sel.style.display='none'; F.cat=c; } });
    o.querySelector('#sb-cat-all').addEventListener('change',function(){ F.cat=this.value; });
    o.querySelector('#sb-file').addEventListener('change',function(){ var fs=[].slice.call(this.files||[]).slice(0,4); F.atts=[]; var n=document.getElementById('sb-fn');
      fs.forEach(function(f){ if(f.size>8*1024*1024){ toast('«'+f.name+'» أكبر من 8MB','error'); return; } var r=new FileReader(); r.onload=function(){ F.atts.push({name:f.name,data:r.result}); if(n)n.textContent='✓ '+F.atts.map(function(a){return a.name;}).join('، '); }; r.readAsDataURL(f); }); });
    if(!me.city) api('/api/provider/profile').then(function(p){ W._prof=W._prof||p; var c=document.getElementById('sb-city'); if(c&&!c.value&&p&&p.city)c.value=p.city; }).catch(function(){});
  }
  function send(){
    var v=function(id){ var e=document.getElementById(id); return e?String(e.value||'').trim():''; };
    if(!F.cat){ toast('اختر التخصص اللي تحتاجه','error'); return; }
    if(v('sb-desc').length<10){ toast('اكتب وش الشغل بالتفصيل','error'); var t=document.getElementById('sb-desc'); if(t)t.focus(); return; }
    var b=document.getElementById('sb-send'); if(b){ b.disabled=true; b.textContent='جاري النشر...'; }
    var pf=document.getElementById('sb-pf');
    api('/api/sub',{method:'POST',body:JSON.stringify({category:F.cat,city:v('sb-city'),district:v('sb-dist'),description:v('sb-desc'),start_text:v('sb-start'),budget:v('sb-bud'),attachments:F.atts,partners_first:pf?pf.checked:false})}).then(function(r){
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
        +'<div class="sb-s">'+(x.city?'📍 '+esc(x.city)+(x.district?' · '+esc(x.district):''):'')+(x.start_text?' · يبدأ '+esc(x.start_text):'')+(x.budget?' · الميزانية '+fmt(x.budget)+' ر.س':'')+' · '+esc(ago(x.created_at))+'</div>'
        +((x.attachments||[]).length?'<div class="sb-row" style="flex-wrap:wrap;gap:6px;margin-top:9px">'+x.attachments.map(function(a){return '<a class="sb-b sb-o" style="padding:7px 11px;font-size:12px" href="'+esc(a.url)+'" target="_blank" rel="noopener">📎 '+esc(a.name||'مرفق')+'</a>';}).join('')+'</div>':'');
      if(x.is_owner){
        var acc=(x.offers||[]).filter(function(o){return o.status==='accepted';})[0];
        h+='<div class="sb-t" style="margin:16px 0 8px">'+(x.offers.length?'العروض ('+x.offers.length+')':'ما وصلت عروض للحين')+'</div>';
        h+=(x.offers||[]).map(function(o){ return '<div class="sb-card" style="margin-bottom:9px'+(o.status==='accepted'?';border-color:#86efac':'')+'"><div class="sb-row">'+av(o.name,o.profile_image)+'<div style="flex:1;min-width:0"><div class="sb-t" style="font-size:13.5px">'+esc(o.name)+(o.is_partner?' <span class="sb-tag">⭐ شريكك</span>':'')+'</div><div class="sb-s">'+(parseFloat(o.rating)>0?'⭐ '+o.rating+' · ':'')+(o.done?o.done+' مشروع':'جديد')+(o.city?' · '+esc(o.city):'')+(sr(o.srate)?' · '+sr(o.srate):'')+'</div></div><div style="text-align:left"><b style="font-size:17px">'+fmt(o.price)+'</b><div class="sb-s">ر.س'+(o.days?' · '+o.days+' يوم':'')+'</div></div></div>'
          +(o.note?'<div class="sb-s" style="margin-top:8px;background:var(--bg,#f8fafc);border-radius:10px;padding:8px 10px;white-space:pre-wrap">'+esc(o.note)+'</div>':'')
          +'<div class="sb-row" style="gap:7px;margin-top:10px;flex-wrap:wrap">'
            +(x.status==='open'?'<button type="button" class="sb-b sb-v" style="flex:1" onclick="SubC.acc('+x.id+','+o.id+','+o.provider_id+')">اعتمد العرض</button>':(o.status==='accepted'?'<span class="sb-tag" style="background:#dcfce7;color:#166534;padding:7px 11px">✓ اعتمدته</span>':''))
            +(o.phone?'<a class="sb-b sb-g" style="padding:10px 12px" href="'+esc(wa(o.phone,'السلام عليكم، بخصوص عرضك على طلبي في منصة مناقصة'))+'" target="_blank" rel="noopener">واتساب</a>':'')
            +(!o.is_partner?'<button type="button" class="sb-b sb-o" style="padding:10px 12px" onclick="SubC.addp('+o.provider_id+','+x.id+')">⭐ لشركائي</button>':'')
          +'</div></div>'; }).join('');
        if(x.status==='open') h+='<button type="button" class="sb-b sb-o" style="width:100%;margin-top:6px;color:#b91c1c" onclick="SubC.close('+x.id+')">إغلاق الطلب</button>';
      } else {
        h+='<div class="sb-row" style="margin-top:12px;background:var(--bg,#f8fafc);border-radius:12px;padding:10px">'+av(x.owner_name,x.owner_image)+'<div style="flex:1"><div class="sb-t" style="font-size:13.5px">'+esc(x.owner_name||'مقاول')+'</div><div class="sb-s">صاحب الطلب'+(sr(x.owner_srate)?' · '+sr(x.owner_srate):'')+(x.owner_phone?'':' · رقمه يظهر لك بعد ما تقدّم')+'</div></div>'
          +(x.owner_phone?'<a class="sb-b sb-g" style="padding:9px 12px" href="'+esc(wa(x.owner_phone,'السلام عليكم، قدّمت عرض على طلبك في منصة مناقصة'))+'" target="_blank" rel="noopener">واتساب</a>':'')+'</div>';
        var m=x.my_offer;
        if(m&&m.status==='accepted') h+='<div class="sb-card" style="margin-top:12px;background:#f0fdf4;border-color:#bbf7d0"><div class="sb-t" style="color:#166534">🎉 اعتمد عرضك — '+fmt(m.price)+' ر.س</div><div class="sb-s">تواصلوا واتفقوا على التفاصيل. عمولة المنصة 3% عند الاتفاق.</div></div>';
        else if(m&&m.status==='rejected') h+='<div class="sb-card" style="margin-top:12px"><div class="sb-s">اختار عرض ثاني — شكراً لعرضك.</div></div>';
        else if(x.status==='open'){
          h+='<div class="sb-t" style="margin:16px 0 0">'+(m?'عرضك (تقدر تعدّله)':'قدّم عرضك')+'</div>'
            +'<div class="sb-row" style="gap:8px"><div style="flex:1"><label class="sb-l">السعر (ر.س)</label><input class="sb-f" id="sb-p" inputmode="numeric" value="'+(m?m.price:'')+'"></div><div style="flex:1"><label class="sb-l">المدة (أيام)</label><input class="sb-f" id="sb-d" inputmode="numeric" value="'+(m&&m.days?m.days:'')+'"></div></div>'
            +'<label class="sb-l">ملاحظة للمقاول (اختياري)</label><textarea class="sb-f" id="sb-n" rows="2" maxlength="1000" placeholder="خبرتك، وش يشمل سعرك…">'+esc(m&&m.note||'')+'</textarea>'
            +'<label class="sb-row" style="gap:9px;margin-top:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:10px;cursor:pointer"><input type="checkbox" id="sb-fee" style="width:18px;height:18px;accent-color:#d97706"'+(m?' checked':'')+'><span class="sb-s" style="color:#92400e">أتعهد بسداد عمولة المنصة 3% من قيمة الاتفاق إذا اتفقنا</span></label>'
            +'<button type="button" class="sb-b sb-v" id="sb-ob" style="width:100%;margin-top:12px;padding:13px" onclick="SubC.offer('+x.id+')">'+(m?'حدّث عرضك':'أرسل العرض ← ويظهر لك رقمه')+'</button>';
        }
      }
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
  W.SubC={homeCard:homeCard,load:load,go:go,form:form,send:send,open:open,offer:offer,acc:acc,addp:addp,unp:unp,close:close,rate:rate,x:closeSheet};
})();
