// ═══ أسئلة سريعة حسب التخصص — العميل يجاوب بالضغط، والوصف ينكتب منها تلقائياً ═══
// SQ.has(key) · SQ.render(el,key,ans,onChange) · SQ.compose(key,ans) · SQ.answered(key,ans) · SQ.missing(key,ans)
// key = التخصص، أو 'design' لطلب المكتب الهندسي (مخطط)
(function(){
  var P5=['شقة','فيلا','عمارة','محل / تجاري','مستودع'];
  var MAT=['المزوّد يوفّرها','أنا أوفّرها (عمالة فقط)'];
  function one(k,l,o,d){ return {k:k,l:l,t:'one',o:o,d:d}; }
  function multi(k,l,o,d){ return {k:k,l:l,t:'multi',o:o,d:d}; }
  function num(k,l,u,ph){ return {k:k,l:l,t:'num',u:u,ph:ph||''}; }
  var B={t:'📋',s:'المزوّد يسعّر عليها مباشرة'};
  var C={
    'design':{t:'🏛️',h:'المكتب الهندسي يحتاج يعرف',s:'أسئلة سريعة — بالضغط',q:[
      one('bt','نوع المبنى',['فيلا سكنية','دبلكس','عمارة سكنية','استراحة','مبنى تجاري','أخرى']),
      one('fl','عدد الأدوار',['دور واحد','دورين','3 أدوار','أكثر من 3']),
      multi('ax','الملاحق',['ملحق علوي','ملحق أرضي','قبو','سور وبوابة']),
      num('la','مساحة الأرض','م²','مثال: 300'),
      multi('need','وش تبي من المكتب؟',['مخطط معماري','إنشائي','كهرباء','سباكة وصرف','تكييف','واجهة 3D','تصميم داخلي','استخراج الرخصة','إشراف على التنفيذ'],'المطلوب من المكتب'),
      one('lic','رخصة البناء',['موجودة','ما عندي — أبيها من المكتب','ما أدري'])]},
    'بناء':{t:'🏗️',s:'المقاول يسعّر عليها مباشرة',q:[one('sc','نطاق العمل',['عظم فقط','عظم + تشطيب','تسليم مفتاح']),one('mt','المواد',['المقاول يوفّرها','أنا أوفّرها (عمالة فقط)']),one('bt','نوع المبنى',['فيلا','دبلكس','عمارة','ملحق','استراحة','تجاري']),num('ar','مسطّح البناء التقريبي','م²','مثال: 420')]},
    'ترميم مبانٍ':{q:[multi('w','وش يحتاج ترميم؟',['تشققات','رطوبة وتسربات','حمامات ومطابخ','واجهات','كهرباء وسباكة','دهانات'],'يحتاج ترميم'),one('bt','المبنى',['شقة','فيلا','عمارة','تجاري']),num('ar','المساحة التقريبية','م²'),one('mt','المواد',MAT)]},
    'تشطيبات ومقاولات عامة':{q:[multi('w','الأعمال المطلوبة',['لياسة','بلاط','دهانات','جبس','كهرباء وسباكة','أبواب ونوافذ']),one('bt','المبنى',['شقة','فيلا','عمارة','تجاري']),num('ar','المساحة التقريبية','م²'),one('mt','المواد',MAT)]},
    'كلادينج وواجهات':{q:[one('w','الشغل',['كلادينج جديد','حجر','زجاج','صيانة واجهة']),one('bt','المبنى',['فيلا','عمارة','تجاري']),num('ar','مساحة الواجهة','م²')]},
    'إنشاءات معدنية وهناجر':{q:[one('w','وش تبي؟',['هنجر / مستودع','مظلة كبيرة','ميزانين','ملحق حديد'],'المطلوب'),num('ar','المساحة','م²'),num('h','الارتفاع','م')]},
    'تبريد وتكييف':{q:[one('w','الخدمة',['تركيب جديد','صيانة / عطل','تعبئة فريون','غسيل وتنظيف','فك ونقل']),one('ty','نوع المكيف',['سبليت','شباك','مركزي','دولابي','كاسيت']),num('n','عدد الوحدات','وحدة','مثال: 4')]},
    'كهرباء':{q:[one('w','الخدمة',['تأسيس كامل','عطل / صيانة','تركيب إنارة','لوحة كهرباء','تمديدات إضافية']),one('pl','المكان',P5),num('n','عدد النقاط أو القطع (تقريباً)','نقطة')]},
    'سباكة':{q:[one('w','الخدمة',['تأسيس','تسريب / عطل','تركيب أدوات صحية','سخانات','تسليك مجاري']),one('pl','المكان',P5),num('n','عدد دورات المياه','دورة')]},
    'نجارة':{q:[one('w','الشغل',['أبواب','دواليب وخزائن','مطبخ','ديكور خشبي','صيانة']),num('n','العدد','قطعة'),one('mt','المواد',MAT)]},
    'تنظيف':{q:[one('pl','المكان',['شقة','فيلا','مكتب / محل','بعد التشطيب','استراحة']),num('ar','المساحة التقريبية','م²'),multi('w','يشمل',['تنظيف عام','زجاج','مطابخ','دورات مياه','كنب وسجاد'])]},
    'نقل عفش':{q:[one('rt','النقل',['داخل المدينة','بين مدينتين']),one('sz','الحجم',['غرفة / استديو','شقة','فيلا','مكتب']),multi('w','يشمل',['فك وتركيب','تغليف','رفع بالونش'])]},
    'حدادة':{q:[one('w','الشغل',['أبواب وبوابات','شبابيك وحماية','مظلات وهياكل','درج ودرابزين','لحام وصيانة']),num('n','العدد أو الطول','قطعة / م')]},
    'ألمنيوم':{q:[one('w','الشغل',['نوافذ','أبواب','واجهات زجاج','مطبخ ألمنيوم','صيانة']),num('n','العدد','قطعة')]},
    'مسابح':{q:[one('w','الشغل',['إنشاء مسبح جديد','صيانة وتنظيف','تبليط وعزل','فلاتر ومضخات']),num('ar','المقاس التقريبي','م²')]},
    'كاميرات مراقبة':{q:[num('n','عدد الكاميرات','كاميرا'),one('pl','المكان',['بيت','محل','مستودع','عمارة']),multi('w','المطلوب',['داخلي','خارجي','تسجيل وشاشة','مشاهدة من الجوال'])]},
    'شبكات وإنترنت':{q:[one('w','الشغل',['تمديد شبكة جديدة','تقوية الواي فاي','سنترال','صيانة']),one('pl','المكان',['بيت','مكتب','مستودع','عمارة']),num('n','عدد النقاط','نقطة')]},
    'مظلات وسواتر':{q:[one('w','النوع',['مظلات سيارات','سواتر','برجولات','مظلات حدائق']),num('ar','المساحة أو الطول','م²')]},
    'عزل حراري':{q:[one('pl','المكان',['سطح','جدران','خزان']),num('ar','المساحة','م²')]},
    'مكافحة حشرات':{q:[multi('w','الحشرات',['صراصير','نمل أبيض','بق الفراش','قوارض','رش عام']),one('pl','المكان',['شقة','فيلا','محل / مطعم','مستودع'])]},
    'جبس':{q:[one('w','الشغل',['أسقف جبس بورد','جدران وقواطع','كرانيش وديكور','صيانة']),num('ar','المساحة','م²'),one('mt','المواد',MAT)]},
    'كشف تسربات المياه':{q:[one('pl','المكان',['شقة','فيلا','عمارة','مسبح / خزان']),multi('w','وش الملاحظ؟',['فاتورة مرتفعة','رطوبة بالجدران','تسريب من السقف','صوت ماء'],'الملاحظ')]},
    'تنظيف خزانات':{q:[one('w','الخزان',['أرضي','علوي','الاثنين']),num('n','الحجم التقريبي','م³')]},
    'دهانات وديكور':{q:[one('pl','المكان',['داخلي','خارجي','الاثنين']),num('ar','المساحة التقريبية','م²'),multi('w','الشغل',['دهان جديد','ورق جدران','بديل خشب / رخام','معالجة تشققات']),one('mt','المواد',MAT)]},
    'تصاميم داخلي وخارجي':{q:[multi('w','المطلوب',['تصميم داخلي','واجهة خارجية','صور 3D','تنفيذ بعد التصميم']),one('pl','المكان',['شقة','فيلا','مكتب / تجاري']),num('ar','المساحة','م²')]},
    'تركيب مطابخ':{q:[one('w','الشغل',['مطبخ جديد كامل','تركيب مطبخ جاهز','تعديل / صيانة']),num('ln','الطول التقريبي','م طولي'),one('mt','الخامة',['خشب','ألمنيوم','ما أدري'])]},
    'تنسيق حدائق':{q:[multi('w','المطلوب',['عشب صناعي','عشب طبيعي','أشجار ونباتات','شبكة ري','إنارة','جلسات']),num('ar','المساحة','م²')]},
    'زجاج ومرايا':{q:[one('w','الشغل',['واجهات زجاج','شاور وفواصل','مرايا','استبدال زجاج مكسور']),num('n','العدد','قطعة')]},
    'بلاط ورخام':{q:[one('w','الشغل',['تركيب جديد','فك وتركيب','جلي وتلميع','صيانة']),one('pl','المكان',['أرضيات','جدران','درج','خارجي']),num('ar','المساحة','م²'),one('mt','المواد',MAT)]},
    'تركيب أثاث':{q:[one('w','الشغل',['تركيب أثاث جديد','فك وتركيب','غرف نوم','مكاتب']),num('n','عدد القطع','قطعة')]},
    'أرضيات خشبية وباركيه':{q:[one('w','الشغل',['تركيب جديد','صيانة وتلميع','استبدال']),num('ar','المساحة','م²'),one('mt','المواد',MAT)]},
    'تنظيف سجاد وكنب':{q:[multi('w','المطلوب',['كنب','سجاد','موكيت','مراتب','ستائر']),num('n','عدد المقاعد أو القطع','قطعة')]},
    'تركيب وصيانة مصاعد':{q:[one('w','الخدمة',['تركيب مصعد جديد','صيانة دورية','عطل']),one('bt','المبنى',['فيلا','عمارة','تجاري']),num('n','عدد الأدوار','دور')]},
    'أبواب وبوابات':{q:[one('w','النوع',['بوابة رئيسية','بوابة كراج أوتوماتيك','أبواب داخلية','أبواب حديد']),num('n','العدد','باب')]},
    'هدم':{q:[one('w','الشغل',['هدم كامل','هدم جزئي / جدران','تكسير بلاط وحمامات']),one('rm','المخلفات',['مع نقل المخلفات','بدون نقل']),num('ar','المساحة','م²')]},
    'تنظيف واجهات المباني':{q:[one('bt','المبنى',['فيلا','عمارة','برج / تجاري']),one('w','الواجهة',['زجاج','حجر / كلادينج','دهان']),num('n','عدد الأدوار','دور')]},
    'حفر آبار ومضخات':{q:[one('w','الشغل',['حفر بئر جديد','تركيب / صيانة مضخة','تنظيف بئر']),num('d','العمق المتوقع','م')]},
    'أنظمة الحريق والسلامة':{q:[multi('w','المطلوب',['إنذار','طفايات','رشاشات','مخارج طوارئ','شهادة الدفاع المدني']),one('bt','المبنى',['محل','مستودع','مصنع','عمارة']),num('ar','المساحة','م²')]},
    'تخطيط المواقف والسلامة المرورية':{q:[multi('w','المطلوب',['تخطيط مواقف','مطبات','لوحات','صدّادات']),num('ar','المساحة','م²')]},
    'معدات ثقيلة':{q:[one('w','المعدة',['شيول','بوكلين','رافعة / كرين','قلاب','بلدوزر']),one('du','المدة',['يوم','أسبوع','شهر'])]},
    'عوازل مائية':{q:[one('pl','المكان',['سطح','حمامات','خزان','أساسات']),num('ar','المساحة','م²'),one('ty','النوع',['لفائف (رول)','رش / دهان','ما أدري'])]},
    'أنظمة شمسية':{q:[one('pl','الاستخدام',['بيت','مزرعة','مضخة بئر','تجاري']),num('bill','الفاتورة الشهرية التقريبية','ر.س')]},
    'صيانة عامة':{q:[multi('w','المطلوب',['كهرباء','سباكة','تكييف','نجارة','دهان']),one('pl','المكان',P5)]},
    'أعمال الطرق والأسفلت':{q:[one('w','الشغل',['سفلتة جديدة','ترقيع وصيانة','تمهيد وتسوية']),num('ar','المساحة','م²')]},
    'انترلوك وبلدورات':{q:[one('w','الشغل',['تركيب جديد','فك وتركيب','صيانة']),num('ar','المساحة','م²'),one('mt','المواد',MAT)]},
    'صرف صحي وبيارات':{q:[one('w','الشغل',['شفط بيارة','إنشاء بيارة','تمديد صرف','تسليك'])]},
    'أرضيات إيبوكسي':{q:[one('pl','المكان',['مستودع / مصنع','كراج','تجاري','سكني']),num('ar','المساحة','م²')]},
    'تحلية ومعالجة مياه':{q:[one('w','الشغل',['فلتر للبيت','محطة تحلية','صيانة'])]}
  };
  C['مكاتب هندسية']=C.design;
  function cfg(k){ return C[String(k||'')]||null; }
  function esc(s){ var d=document.createElement('div'); d.textContent=String(s==null?'':s); return d.innerHTML.replace(/"/g,'&quot;'); }
  function dig(s){ return String(s==null?'':s).replace(/[٠-٩]/g,function(d){ return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).replace(/[۰-۹]/g,function(d){ return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/[^\d.]/g,''); }
  function val(q,a){ var v=a&&a[q.k]; if(q.t==='multi') return Array.isArray(v)?v.filter(function(x){ return q.o.indexOf(x)>=0; }):[]; if(q.t==='num'){ var n=dig(v); return n&&parseFloat(n)>0?n:''; } return (v&&q.o.indexOf(v)>=0)?v:''; }
  function has(q,a){ var v=val(q,a); return q.t==='multi'?v.length>0:!!v; }
  var CNT=/^(وحدة|قطعة|كاميرا|نقطة|دورة|دور|باب)$/;
  function txt(q,a){ var v=val(q,a); if(q.t==='multi') return v.join('، '); if(q.t==='num') return v?(Number(v).toLocaleString('en-US')+(CNT.test(q.u)?'':' '+q.u)):''; return v; }
  function lab(q){ return (q.d||q.l).replace(/\s*[؟?]$/,''); }
  function compose(k,a){
    var c=cfg(k); if(!c) return '';
    var lines=[], fl=null;
    c.q.forEach(function(q){
      if(!has(q,a)) return;
      if(k==='design'||k==='مكاتب هندسية'){   // نجمع الأدوار والملاحق بسطر واحد مع نوع المبنى
        if(q.k==='fl'||q.k==='ax') return;
        if(q.k==='bt'){ var extra=[txt(c.q[1],a)].concat(val(c.q[2],a).map(function(x){ return '+ '+x; })).filter(Boolean).join(' '); lines.push('• '+lab(q)+': '+txt(q,a)+(extra?' — '+extra:'')); return; }
      }
      lines.push('• '+lab(q)+': '+txt(q,a));
    });
    if((k==='design'||k==='مكاتب هندسية')&&!has(c.q[0],a)){ var fx=[txt(c.q[1],a)].concat(val(c.q[2],a).map(function(x){ return '+ '+x; })).filter(Boolean).join(' '); if(fx) lines.unshift('• الأدوار: '+fx); }
    return lines.join('\n');
  }
  function answered(k,a){ var c=cfg(k); if(!c) return 0; return c.q.filter(function(q){ return has(q,a); }).length; }
  function missing(k,a){ var c=cfg(k); if(!c) return []; return c.q.filter(function(q){ return !has(q,a)&&q.k!=='ax'; }).map(function(q){ return q.l; }); }
  function total(k){ var c=cfg(k); return c?c.q.filter(function(q){ return q.k!=='ax'; }).length:0; }
  function css(){
    if(document.getElementById('sq-css')) return;
    var s=document.createElement('style'); s.id='sq-css';
    s.textContent='.sq{background:#f5f9ff;border:1.5px solid #dbeafe;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:14px;text-align:start}'
      +'.sq.dz{background:#faf7ff;border-color:#ddd6fe}'
      +'.sq-h{display:flex;gap:10px;align-items:center}.sq-h .i{width:36px;height:36px;border-radius:10px;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}.sq.dz .sq-h .i{background:#ede9fe}'
      +'.sq-h b{font-size:15px;font-weight:900;display:block;color:inherit}.sq-h small{font-size:12px;color:#1d4ed8;font-weight:800}.sq.dz .sq-h small{color:#6d28d9}'
      +'.sq-l{font-size:13.5px;font-weight:900;margin-bottom:8px;display:block}.sq-l small{font-weight:700;color:#5b6b85;font-size:12px}'
      +'.sq-c{display:flex;flex-wrap:wrap;gap:7px}'
      +'.sq-c button{border:1.5px solid #dbe5f5;background:#fff;border-radius:999px;padding:8px 13px;min-height:38px;font-family:inherit;font-size:13px;font-weight:800;color:#14223d;cursor:pointer;line-height:1.3}'
      +'.sq-c button.on{border-color:#1d4ed8;background:#1d4ed8;color:#fff}'
      +'.sq-c.m button.on{background:#eff4ff;color:#1d4ed8}'
      +'.sq-u{display:flex;align-items:center;border:1.5px solid #dbe5f5;border-radius:13px;background:#fff;overflow:hidden;max-width:260px}'
      +'.sq-u input{border:0;flex:1;padding:11px 13px;font-size:15px;font-family:inherit;outline:none;text-align:right;min-width:0;background:transparent;color:inherit}'
      +'.sq-u span{padding:0 12px;color:#5b6b85;font-weight:800;font-size:13px;border-right:1px solid #e5ecf7;align-self:stretch;display:flex;align-items:center;background:#f8fafd;white-space:nowrap}'
      +'.sq-u:focus-within{border-color:#1d4ed8}'
      +'[data-theme="dark"] .sq{background:#0f1a30;border-color:#1e3a8a}[data-theme="dark"] .sq.dz{background:#1a1430;border-color:#4c1d95}'
      +'[data-theme="dark"] .sq-c button{background:#111a2e;border-color:#2a3a5c;color:#e6ebf5}[data-theme="dark"] .sq-c button.on{background:#2563eb;border-color:#2563eb;color:#fff}[data-theme="dark"] .sq-c.m button.on{background:#172554;color:#93c5fd;border-color:#3b82f6}'
      +'[data-theme="dark"] .sq-u{background:#111a2e;border-color:#2a3a5c}[data-theme="dark"] .sq-u span{background:#0f172a;border-color:#2a3a5c;color:#94a3b8}[data-theme="dark"] .sq-h small{color:#93c5fd}[data-theme="dark"] .sq.dz .sq-h small{color:#c4b5fd}[data-theme="dark"] .sq-l small{color:#94a3b8}';
    document.head.appendChild(s);
  }
  // يرسم الأسئلة داخل el — ans كائن يتعدّل مكانه، onChange بعد كل تغيير
  function render(el,k,ans,onChange,opt){
    opt=opt||{}; var c=cfg(k); if(!el) return false;
    if(!c){ el.innerHTML=''; el.style.display='none'; return false; }
    css(); el.style.display='';
    var dz=(k==='design'||k==='مكاتب هندسية');
    var h='<div class="sq'+(dz?' dz':'')+'"><div class="sq-h"><span class="i">'+(c.t||B.t)+'</span><div><b>'+esc(c.h||opt.title||('أسئلة سريعة عن «'+k+'»'))+'</b><small>'+esc(c.s||B.s)+'</small></div></div>';
    c.q.forEach(function(q){
      h+='<div data-q="'+q.k+'"><span class="sq-l">'+esc(q.l)+(q.t==='multi'?' <small>(اختر كل اللي ينطبق)</small>':'')+'</span>';
      if(q.t==='num'){ var v=ans[q.k]||''; h+='<div class="sq-u"><input type="text" inputmode="decimal" maxlength="9" dir="ltr" value="'+esc(v)+'" placeholder="'+esc(q.ph)+'" aria-label="'+esc(q.l)+'"><span>'+esc(q.u)+'</span></div>'; }
      else { var cur=ans[q.k]; h+='<div class="sq-c'+(q.t==='multi'?' m':'')+'" role="'+(q.t==='multi'?'group':'radiogroup')+'" aria-label="'+esc(q.l)+'">'+q.o.map(function(o){ var on=q.t==='multi'?(Array.isArray(cur)&&cur.indexOf(o)>=0):cur===o; return '<button type="button" data-o="'+esc(o)+'" class="'+(on?'on':'')+'" aria-pressed="'+(on?'true':'false')+'">'+(on&&q.t==='multi'?'✓ ':'')+esc(o)+'</button>'; }).join('')+'</div>'; }
      h+='</div>';
    });
    el.innerHTML=h+'</div>';
    el.onclick=function(e){
      var b=e.target.closest('button[data-o]'); if(!b||!el.contains(b)) return;
      var w=b.closest('[data-q]'), q=c.q.filter(function(x){ return x.k===w.getAttribute('data-q'); })[0]; if(!q) return;
      var o=b.getAttribute('data-o');
      if(q.t==='multi'){ var a=Array.isArray(ans[q.k])?ans[q.k].slice():[]; var i=a.indexOf(o); if(i>=0) a.splice(i,1); else a.push(o); ans[q.k]=a; }
      else ans[q.k]=(ans[q.k]===o?'':o);
      [].forEach.call(w.querySelectorAll('button[data-o]'),function(x){ var v=x.getAttribute('data-o'), on=q.t==='multi'?ans[q.k].indexOf(v)>=0:ans[q.k]===v; x.classList.toggle('on',on); x.setAttribute('aria-pressed',on?'true':'false'); x.textContent=(on&&q.t==='multi'?'✓ ':'')+v; });
      if(onChange) onChange();
    };
    el.oninput=function(e){ var i=e.target; if(i.tagName!=='INPUT') return; var w=i.closest('[data-q]'); if(!w) return; ans[w.getAttribute('data-q')]=dig(i.value); if(onChange) onChange(); };
    return true;
  }
  window.SQ={has:function(k){ return !!cfg(k); },render:render,compose:compose,answered:answered,missing:missing,total:total};
  // ── لوحة العميل (post.html / dashboard-client.html): الأسئلة فوق «التفاصيل» والوصف ينبني منها وقت النشر ──
  var me=document.currentScript;
  if(me&&me.hasAttribute('data-dash')){
    var DA={}, DK='', lbl0=null, ph0=null;
    var $=function(id){ return document.getElementById(id); };
    function paint(){
      var sel=$('n-cat'), ds=$('n-desc'); if(!sel||!ds) return;
      var lb=ds.parentNode.querySelector('label');
      var host=$('n-sq'); if(!host){ host=document.createElement('div'); host.id='n-sq'; host.style.marginBottom='14px'; ds.parentNode.insertBefore(host,lb||ds); } if(lb&&lbl0===null){ lbl0=lb.innerHTML; ph0=ds.getAttribute('placeholder')||''; }
      var k=cfg(sel.value)?sel.value:'';
      if(k!==DK){ DK=k; if(k) render(host,k,DA[k]||(DA[k]={})); else { host.innerHTML=''; host.style.display='none'; } }
      if(lb) lb.innerHTML=k?'تفاصيل إضافية <small style="color:var(--muted,#64748b);font-weight:600">(اختياري)</small>':lbl0;
      ds.setAttribute('placeholder',k?'أي شي ثاني يهمّك المزوّد يعرفه…':ph0);
      ds.style.minHeight=k?'80px':'';
    }
    SQ.dashDesc=function(){
      var ds=$('n-desc'), notes=((ds&&ds.value)||'').trim(); if(!DK) return notes;
      var c=compose(DK,DA[DK]||{}); return c?(c+(notes?'\n\n'+notes:'')):notes;
    };
    SQ.dashNotes=function(){ var ds=$('n-desc'); return ((ds&&ds.value)||'').trim(); };
    SQ.dashReset=function(){ DA={}; DK='~'; paint(); };
    var boot=function(){ var sel=$('n-cat'); if(!sel) return; sel.addEventListener('change',paint); paint(); };
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  }
})();
