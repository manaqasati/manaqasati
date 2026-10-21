// ═══ النشر الجاد: سؤال المخطط + «ابدأ بالمخطط» (المكاتب الهندسية) + التعهّد + التزامات العميل ═══
(function(){
  var API = window.API || '';
  var CATS = ['بناء','ترميم مبانٍ','تشطيبات ومقاولات عامة','كلادينج وواجهات','إنشاءات معدنية وهناجر'];
  function esc(s){ var d=document.createElement('div'); d.textContent=String(s==null?'':s); return d.innerHTML.replace(/"/g,'&quot;'); }
  function css(){
    if(document.getElementById('pg-css')) return;
    var st=document.createElement('style'); st.id='pg-css';
    st.textContent=''
      +'.pg-ov{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:10060;display:flex;align-items:flex-end;justify-content:center}'
      +'@media(min-width:640px){.pg-ov{align-items:center;padding:16px}}'
      +'.pg-sh{position:relative;background:var(--white,#fff);color:var(--text,#0f2544);width:min(460px,100%);max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:22px 18px 18px;box-shadow:0 -10px 40px rgba(0,0,0,.25);font-family:Tajawal,sans-serif;box-sizing:border-box}'
      +'@media(min-width:640px){.pg-sh{border-radius:20px}}'
      +'.pg-x{position:absolute;top:10px;left:10px;width:38px;height:38px;border:0;border-radius:10px;background:transparent;color:var(--muted,#64748b);font-size:18px;cursor:pointer}'
      +'.pg-ic{font-size:36px;text-align:center;line-height:1.2}'
      +'.pg-h{font-weight:900;font-size:18px;text-align:center;margin:6px 0}'
      +'.pg-p{text-align:center;color:var(--muted,#475569);font-weight:600;line-height:1.9;font-size:14.5px}'
      +'.pg-box{border:1px solid var(--border,#e3eaf5);border-radius:14px;padding:12px 14px;margin-top:12px;background:var(--bg,#f8fbff)}'
      +'.pg-box small{display:block;color:var(--muted,#64748b);font-weight:700;font-size:12px}'
      +'.pg-box b{display:block;margin-top:4px;font-size:14.5px}'
      +'.pg-note{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:10px 12px;font-weight:700;color:#92400e;font-size:13px;line-height:1.8;margin-top:10px}'
      +'.pg-go{display:block;width:100%;min-height:50px;border:0;border-radius:14px;background:#6d28d9;color:#fff;font-family:inherit;font-weight:900;font-size:15.5px;margin-top:14px;cursor:pointer}'
      +'.pg-go:disabled{opacity:.6}'
      +'.pg-lk{display:block;margin:10px auto 0;background:none;border:0;font-family:inherit;font-weight:800;color:var(--muted,#64748b);text-decoration:underline;cursor:pointer;min-height:36px;font-size:13.5px}'
      +'.pg-li{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--border,#eef2f8)}'
      +'.pg-li:last-of-type{border-bottom:0}.pg-li span{font-size:18px;line-height:1.4}'
      +'.pg-li b{display:block;font-size:14.5px}.pg-li small{display:block;color:var(--muted,#64748b);font-weight:600;font-size:12.5px;line-height:1.7;margin-top:2px}'
      +'.pg-pl{display:flex;gap:10px;align-items:flex-start;background:#fff7ed;border:2px solid #f97316;border-radius:14px;padding:13px;box-shadow:0 0 0 4px rgba(249,115,22,.12);cursor:pointer;text-align:start;margin:4px 0}'
      +'.pg-pl input{position:absolute;opacity:0;width:1px;height:1px}'
      +'.pg-cb{width:22px;height:22px;border-radius:6px;border:2px solid #fb923c;background:#fff;flex-shrink:0;margin-top:2px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:900}'
      +'.pg-pl.on .pg-cb{background:#ea580c;border-color:#ea580c}'
      +'.pg-pl.bad{animation:pgShake .4s}@keyframes pgShake{20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}'
      +'.pg-pl b{display:block;font-size:14.5px;color:#9a3412}'
      +'.pg-pl .pg-t{font-weight:700;line-height:1.85;margin-top:4px;color:#7c2d12;font-size:13px}'
      +'.pg-pl a{color:#c2410c;font-weight:900;text-decoration:underline}'
      +'.pg-bar{display:block;flex:1;min-width:60px;height:7px;border-radius:7px;background:#e5ecf7;overflow:hidden;position:relative}.pg-bar i{position:absolute;top:0;bottom:0;right:0;background:#1d4ed8;border-radius:7px;transition:width .2s}'
      +'.pg-pct{font-size:11.5px;font-weight:900;color:#1d4ed8;min-width:34px;text-align:left;direction:ltr}'
      +'.pg-up{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:10070;display:flex;align-items:center;justify-content:center;padding:20px}'
      +'.pg-up>div{background:var(--white,#fff);color:var(--text,#0f2544);border-radius:18px;padding:22px 20px;width:min(340px,100%);text-align:center;font-family:Tajawal,sans-serif;box-shadow:0 20px 50px rgba(0,0,0,.3)}'
      +'.pg-up b{display:block;font-size:16px;margin:6px 0 12px}.pg-up .r{display:flex;align-items:center;gap:10px}'
      +'[data-theme="dark"] .pg-bar{background:#0f172a}[data-theme="dark"] .pg-pct{color:#93c5fd}'
      +'[data-theme="dark"] .pg-note{background:#2a2210;border-color:#78350f;color:#fcd34d}'
      +'[data-theme="dark"] .pg-pl{background:#2a1a0e;border-color:#c2410c}[data-theme="dark"] .pg-pl b,[data-theme="dark"] .pg-pl .pg-t{color:#fdba74}[data-theme="dark"] .pg-pl a{color:#fb923c}[data-theme="dark"] .pg-cb{background:transparent}';
    document.head.appendChild(st);
  }
  function sheet(html){
    css();
    var o=document.createElement('div'); o.className='pg-ov';
    o.innerHTML='<div class="pg-sh" role="dialog" aria-modal="true"><button type="button" class="pg-x" data-x aria-label="إغلاق">✕</button>'+html+'</div>';
    var close=function(){ o.remove(); document.removeEventListener('keydown',kd); };
    var kd=function(e){ if(e.key==='Escape') close(); };
    o.addEventListener('click',function(e){ if(e.target===o||e.target.closest('[data-x]')) close(); });
    document.addEventListener('keydown',kd);
    document.body.appendChild(o);
    return {el:o,close:close};
  }
  // التزامات العميل (تفتح من «الشروط والأحكام» داخل التعهّد — بدون ما يطلع من الصفحة)
  function terms(){
    sheet('<div class="pg-ic">🤝</div><div class="pg-h">التزاماتك كصاحب مشروع</div>'
      +'<div style="margin-top:8px">'
      +'<div class="pg-li"><span>✅</span><div><b>مشروع حقيقي</b><small>تنشر مشروع تنوي تنفيذه، مو بس عشان تعرف الأسعار.</small></div></div>'
      +'<div class="pg-li"><span>📝</span><div><b>وصف صادق</b><small>المقاسات والموقع والمطلوب مثل ما هو — عشان تجيك أسعار دقيقة.</small></div></div>'
      +'<div class="pg-li"><span>💬</span><div><b>تتجاوب</b><small>تشوف العروض وترد على المزوّدين — حتى لو بالاعتذار.</small></div></div>'
      +'<div class="pg-li"><span>🔒</span><div><b>تقفل لما تخلص</b><small>إذا اخترت مزوّد أو تغيّرت خطتك، تقفل المشروع عشان ما يتعب غيرك.</small></div></div>'
      +'<div class="pg-li"><span>🆓</span><div><b>مجاني لك بالكامل</b><small>لا رسوم عليك إطلاقاً — النشر واستقبال العروض والتواصل.</small></div></div>'
      +'</div><a class="pg-lk" href="/terms.html" target="_blank" rel="noopener" style="text-align:center">اقرأ الشروط كاملة</a>');
  }
  // صندوق التعهّد (checkbox)
  function pledgeHTML(id){
    return '<label class="pg-pl" id="'+id+'"><input type="checkbox" id="'+id+'-c"><span class="pg-cb" aria-hidden="true"></span><span><b>مشروعي حقيقي وأنوي تنفيذه</b><span class="pg-t" style="display:block">المزوّدون يبذلون وقتهم وجهدهم لإعداد عروض الأسعار لمشروعك، لذا نرجو منك الجدية والالتزام بـ<a href="/terms.html" data-pg-terms>الشروط والأحكام</a>.</span></span></label>';
  }
  function pledgeBind(id,onChange){
    css();
    var w=document.getElementById(id), c=document.getElementById(id+'-c'); if(!w||!c) return;
    var sync=function(){ w.classList.toggle('on',c.checked); var m=w.querySelector('.pg-cb'); if(m) m.textContent=c.checked?'✓':''; if(onChange) onChange(c.checked); };
    c.addEventListener('change',sync);
    w.addEventListener('click',function(e){ var a=e.target.closest('[data-pg-terms]'); if(a){ e.preventDefault(); e.stopPropagation(); terms(); } });
    sync();
  }
  function pledged(id){ var c=document.getElementById(id+'-c'); return !!(c&&c.checked); }
  function pledgeNudge(id){ var w=document.getElementById(id); if(!w) return; w.classList.remove('bad'); void w.offsetWidth; w.classList.add('bad'); try{ w.scrollIntoView({behavior:'smooth',block:'center'}); }catch(e){} }
  // إجابات أسئلة المكتب الهندسي (تنعبّى من نافذة «ابدأ بالمخطط» أو من صفحة النشر)
  var DANS=null;
  function dPrefill(body){
    var a={}, t=String((body.title||'')+' '+(body.description||''));
    if(/دبلكس|دوبلكس/.test(t)) a.bt='دبلكس'; else if(/فيلا|فله|فلة/.test(t)) a.bt='فيلا سكنية'; else if(/عمار[ةه]/.test(t)) a.bt='عمارة سكنية'; else if(/استراح[ةه]/.test(t)) a.bt='استراحة';
    if(/دورين|دوران|طابقين/.test(t)) a.fl='دورين'; else if(/(3|٣|ثلاث[ةه]?)\s*(ادوار|أدوار|طوابق)/.test(t)) a.fl='3 أدوار'; else if(/دور واحد|دور أرضي فقط|طابق واحد/.test(t)) a.fl='دور واحد';
    var ax=[]; if(/ملحق/.test(t)) ax.push('ملحق علوي'); if(/قبو|بدروم/.test(t)) ax.push('قبو'); if(ax.length) a.ax=ax;
    return a;
  }
  // «ابدأ بالمخطط»: يحوّل مشروع التنفيذ لطلب مخطط للمكاتب الهندسية، ومشروع التنفيذ ينحفظ عنده
  function designBody(body){
    var t=String(body.title||'').trim(), d=String(body.description||'').trim();
    var ex={title:t,description:d,category:body.category,city:body.city};
    ['district','budget_max','deadline','category_other','extra_categories','geo_lat','geo_lng'].forEach(function(k){ if(body[k]!=null&&body[k]!=='') ex[k]=body[k]; });
    var nt=(window.SQ&&SQ.dashNotes)?SQ.dashNotes():d;   // في لوحة العميل: ملاحظاته بس (بدون أسئلة التنفيذ مثل المواد)
    var dd=String(body.design_desc||'').trim()||(window.SQ&&DANS?SQ.compose('design',DANS):'');
    var out={title:('تصميم مخطط — '+t).slice(0,150),description:'أبي مكتب هندسي يجهّز مخطط لمشروعي:\n'+(dd?dd+(nt?'\n\nملاحظات العميل: '+nt:''):'\n'+d),category:'مكاتب هندسية',city:body.city,exec_draft:ex,pledge:!!body.pledge};
    ['district','geo_lat','geo_lng','images','draft_did'].forEach(function(k){ if(body[k]!=null&&body[k]!=='') out[k]=body[k]; });
    return out;
  }
  // الحد الأدنى اللي يحتاجه المكتب: نوع المبنى + وش المطلوب منه
  function dMiss(a){ a=a||{}; if(!a.bt) return 'اختر نوع المبنى'; if(!(Array.isArray(a.need)&&a.need.length)) return 'اختر وش تبي من المكتب (مخطط معماري، إنشائي…)'; return ''; }
  // يعرض الشاشة ويرجّع وعد بالقرار: true = انشر طلب المخطط
  function designAsk(body){
    return new Promise(function(res){
      var ask=!!(window.SQ&&!String(body.design_desc||'').trim());
      if(ask&&!DANS) DANS=dPrefill(body);
      var b=designBody(body), done=false;
      var s=sheet('<div class="pg-ic">🏛️</div><div class="pg-h">ابدأ بالمخطط</div>'
        +'<div class="pg-p">نرسل طلبك للمكاتب الهندسية'+(body.city?' في <b>'+esc(body.city)+'</b>':'')+' وتجيك عروضهم لتصميم المخطط.</div>'
        +'<div class="pg-box"><small>الطلب اللي بينتشر:</small><b>'+esc(b.title)+'</b><small style="margin-top:3px">مكاتب هندسية'+(body.city?' · '+esc(body.city):'')+(body.district?' · '+esc(body.district):'')+'</small></div>'
        +(ask?'<div data-sq style="margin-top:12px"></div><div data-sqe style="display:none;color:#dc2626;font-weight:800;font-size:13px;margin-top:8px"></div>':'')
        +'<div class="pg-note">📌 مشروع التنفيذ <b>محفوظ عندك</b> — لما يجهز المخطط نذكّرك تكمّله وترفع المخطط فيه.</div>'
        +'<button type="button" class="pg-go" data-go>انشر طلب المخطط</button><button type="button" class="pg-lk" data-x>رجوع</button>');
      if(ask) SQ.render(s.el.querySelector('[data-sq]'),'design',DANS,function(){ var e=s.el.querySelector('[data-sqe]'); if(e) e.style.display='none'; });
      var mo=new MutationObserver(function(){ if(!s.el.isConnected) fin(false); });
      var fin=function(v){ if(done) return; done=true; mo.disconnect(); res(v); };
      s.el.querySelector('[data-go]').addEventListener('click',function(){
        if(ask){ var m=dMiss(DANS); if(m){ var e=s.el.querySelector('[data-sqe]'); e.textContent=m; e.style.display='block'; try{ e.scrollIntoView({behavior:'smooth',block:'center'}); }catch(x){} return; } }
        fin(true); s.close(); });
      mo.observe(document.body,{childList:true});
    });
  }
  // سؤال المخطط كنافذة (لوحة العميل) — cb('has'|'design'|'none')
  function ask(cat,cb){
    var s=sheet('<div class="pg-ic">📐</div><div class="pg-h">عندك مخطط للمشروع؟</div><div class="pg-p">مشاريع «'+esc(cat)+'» تحتاج مخطط عشان تجيك أسعار دقيقة</div>'
      +'<div style="margin-top:10px">'
      +'<button type="button" class="pg-li" data-c="has" style="width:100%;background:none;border:0;border-bottom:1px solid var(--border,#eef2f8);text-align:start;font-family:inherit;color:inherit;cursor:pointer"><span>📐</span><div><b>نعم، عندي مخطط</b><small>ارفعه — المزوّد يسعّر أدق</small></div></button>'
      +'<button type="button" class="pg-li" data-c="design" style="width:100%;background:none;border:0;border-bottom:1px solid var(--border,#eef2f8);text-align:start;font-family:inherit;color:inherit;cursor:pointer"><span>🏛️</span><div><b>لا، أبي مكتب هندسي يسويه لي</b><small>نرسل طلبك للمكاتب الهندسية وتجيك عروضهم</small></div></button>'
      +'<button type="button" class="pg-li" data-c="none" style="width:100%;background:none;border:0;text-align:start;font-family:inherit;color:inherit;cursor:pointer"><span>🔧</span><div><b>مشروع صغير ما يحتاج مخطط</b><small>مثل ترميم بسيط أو تعديل غرفة</small></div></button>'
      +'</div>');
    s.el.addEventListener('click',function(e){ var b=e.target.closest('[data-c]'); if(b){ s.close(); cb(b.getAttribute('data-c')); } });
  }
  // رفع ملف مع نسبة التقدّم (XHR) — onProg(0..100)
  var EXT=/\.(pdf|dwg|dxf|xlsx|xls|docx|doc|zip|rar|7z|csv|jpe?g|png|webp|heic)$/i;
  function xhr(method,url,headers,body,onProg){
    return new Promise(function(res){
      var x=new XMLHttpRequest(); x.open(method,url,true);
      Object.keys(headers||{}).forEach(function(k){ x.setRequestHeader(k,headers[k]); });
      if(onProg&&x.upload) x.upload.onprogress=function(e){ if(e.lengthComputable) onProg(Math.min(99,Math.round(e.loaded*100/e.total))); };
      x.onload=function(){ var d=null; try{ d=JSON.parse(x.responseText); }catch(e){} if(onProg) onProg(100); res({ok:x.status>=200&&x.status<300,status:x.status,d:d||{}}); };
      x.onerror=function(){ res({ok:false,status:0,d:{}}); };
      x.send(body);
    });
  }
  function upload(file,token,onProg){
    return xhr('POST',(window.API||'')+'/api/upload/attachment',{'Authorization':'Bearer '+token,'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},file,onProg);
  }
  // شريط التقدّم (HTML)
  function bar(pct){ css(); pct=Math.max(0,Math.min(100,pct||0)); return '<span class="pg-bar" role="progressbar" aria-valuenow="'+pct+'" aria-valuemin="0" aria-valuemax="100"><i style="width:'+pct+'%"></i></span><span class="pg-pct">'+pct+'%</span>'; }
  function progress(title){ css(); var o=document.createElement('div'); o.className='pg-up'; o.innerHTML='<div><div style="font-size:30px">⏫</div><b>'+esc(title||'جاري رفع الملفات…')+'</b><div class="r">'+bar(0)+'</div><div style="font-size:12px;color:var(--muted,#64748b);font-weight:700;margin-top:10px">لا تسكّر الصفحة لين يخلص</div></div>'; document.body.appendChild(o);
    return {set:function(p){ var r=o.querySelector('.r'); if(r) r.innerHTML=bar(p); }, close:function(){ o.remove(); }}; }
  window.PlanGate={progress:progress,ext:EXT,xhr:xhr,upload:upload,bar:bar,cats:CATS,need:function(c){ return CATS.indexOf(String(c||''))>=0; },terms:terms,pledgeHTML:pledgeHTML,pledgeBind:pledgeBind,pledged:pledged,pledgeNudge:pledgeNudge,designBody:designBody,designAsk:designAsk,ask:ask,dMiss:dMiss,dPrefill:dPrefill,dAns:function(v){ if(v!==undefined) DANS=v; return DANS; }};
})();
