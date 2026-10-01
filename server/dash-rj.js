// ═══ سبب عدم اختيار العرض + الفرصة الثانية (سعر أفضل مرة وحدة) — مشترك بين لوحة العميل وصفحة المشروع ولوحة المزوّد ═══
(function(){
var API_=(typeof API!=='undefined'?API:'');
function _tok(){try{return localStorage.getItem('token')||'';}catch(e){return '';}}
function E(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function N(n){return (Number(n)||0).toLocaleString('en-US');}
function _msg(t,ok){ if(typeof showToast==='function')showToast(t,ok?'success':'error'); else alert(t); }
var CSS='.rj-ov{position:fixed;inset:0;overflow:hidden;z-index:600;background:rgba(15,23,42,.45);display:flex;align-items:flex-end;justify-content:center;font-family:Tajawal,sans-serif}'
+'.rj-sh{box-sizing:border-box;overflow-wrap:anywhere;min-width:0;background:var(--white,var(--card,#fff));color:var(--text,#14223d);width:100%;max-width:480px;max-height:92vh;overflow:auto;border-radius:22px 22px 0 0;padding:14px 18px calc(env(safe-area-inset-bottom,0px) + 18px);display:flex;flex-direction:column;gap:12px;box-shadow:0 -10px 30px rgba(15,37,68,.18)}'
+'@media(min-width:700px){.rj-ov{align-items:center}.rj-sh{border-radius:20px}}'
+'.rj-grab{width:40px;height:4px;border-radius:4px;background:var(--border,#dbe3ef);margin:0 auto}'
+'.rj-h{font-size:17px;font-weight:900}.rj-s{font-size:12.5px;color:var(--muted,#64748b);font-weight:700;margin-top:-6px;line-height:1.7}'
+'.rj-chips{display:flex;flex-wrap:wrap;gap:7px}'
+'.rj-chip{border:1.5px solid var(--border,#dbe5f5);background:var(--white,var(--card,#fff));color:var(--text,#334766);border-radius:999px;padding:9px 13px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;min-height:40px}'
+'.rj-chip.on{border-color:#1d4ed8;background:#eff6ff;color:#1d4ed8}'
+'.rj-lb{font-size:12.5px;font-weight:800;color:var(--text2,#334766);margin-bottom:7px;display:block}.rj-lb span{color:var(--muted,#94a3b8);font-weight:700}'
+'.rj-opt{display:flex;gap:10px;align-items:flex-start;background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:12px;cursor:pointer;text-align:right;font-family:inherit;width:100%}'
+'.rj-opt.off{background:var(--bg,#f8fafc);border-color:var(--border,#e2e8f0)}'
+'.rj-cb{width:20px;height:20px;border-radius:6px;background:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;font-size:13px;font-weight:900}'
+'.rj-opt.off .rj-cb{background:#fff!important;border:2px solid #cbd5e1;color:transparent}'
+'.rj-opt b{font-size:14px;color:#14532d;display:block}.rj-opt.off b{color:var(--text,#334766)}.rj-opt small{font-size:12px;color:#166534;font-weight:700;line-height:1.7}.rj-opt.off small{color:var(--muted,#64748b)}'
+'.rj-go{border:0;border-radius:13px;padding:13px;font-family:inherit;font-weight:900;font-size:15px;min-height:48px;cursor:pointer;color:#fff;background:#b91c1c}.rj-go.g{background:#15803d}.rj-go:disabled{opacity:.6}'
+'.rj-no{border:1.5px solid var(--border,#dbe5f5);background:none;color:var(--text,#1e3a8a);border-radius:13px;padding:12px;font-family:inherit;font-weight:800;font-size:14px;min-height:46px;cursor:pointer}'
+'.rj-in{width:100%;box-sizing:border-box;border:1.5px solid var(--border,#dbe5f5);border-radius:12px;padding:12px 14px;font-family:inherit;font-size:15px;background:var(--white,var(--card,#fff));color:var(--text,#14223d)}'
+'.rj-in:focus{outline:none;border-color:#16a34a}'
+'.rj-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:800;color:var(--muted,#64748b)}'
+'.rj-old{text-decoration:line-through;color:#94a3b8;font-weight:800}'
+'.rj-q{background:var(--bg,#f8fafd);border:1px solid var(--border,#e1e9f6);border-radius:12px;padding:10px 12px;font-size:12.5px;line-height:1.8;color:var(--text2,#334766);font-weight:700}'
+'.rj-err{background:#fef2f2;color:#b91c1c;border-radius:10px;padding:9px 12px;font-size:12.5px;font-weight:800;display:none}'
+'.rj-imp{overflow-wrap:anywhere;display:flex;flex-direction:column;gap:7px;background:linear-gradient(135deg,#fffbeb,#fef3c7);border:1.5px solid #fcd34d;border-radius:12px;padding:10px 12px;margin:8px 0}'
+'.rj-imp .t{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12.5px;font-weight:900;color:#92400e}'
+'.rj-imp .n{font-size:13px;line-height:1.8;color:#78350f;font-weight:700;white-space:pre-line}'
+'.rj-ch{overflow-wrap:anywhere;background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:11px 13px;margin:9px 0;display:flex;flex-direction:column;gap:8px}'
+'.rj-ch .t{font-size:13px;font-weight:900;color:#14532d;line-height:1.7}.rj-ch .s{font-size:12px;font-weight:700;color:#166534;line-height:1.7}'
+'.rj-ch button{border:0;background:#15803d;color:#fff;border-radius:11px;padding:11px;font-family:inherit;font-weight:900;font-size:14px;cursor:pointer;min-height:44px}'
+'.rj-why{background:var(--bg,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:9px 12px;margin:8px 0;font-size:12.5px;font-weight:700;color:var(--text2,#475569);line-height:1.7}';
function _css(){ if(document.getElementById('rj-css'))return; var s=document.createElement('style'); s.id='rj-css'; s.textContent=CSS; document.head.appendChild(s); }
var R={price:'💰 السعر أعلى من ميزانيتي',duration:'⏱ المدة طويلة',unclear:'📄 العرض ناقص أو غير واضح',specialty:'🔧 ما يناسب تخصص المشروع',postponed:'📅 أجّلت المشروع',other:'سبب آخر'};
var RP={price:'السعر أعلى من ميزانيته',duration:'مدة التنفيذ طويلة',unclear:'العرض ناقص أو غير واضح',specialty:'العرض ما يناسب تخصص المشروع',postponed:'أجّل المشروع',other:''};
var CH=['price','duration','unclear','other'];
function _nice(v){ if(v<1000)return Math.round(v/50)*50; var p=Math.pow(10,Math.floor(Math.log10(v))-1); return Math.round(v/p)*p; }
function _k(v){ return v>=1000?(Math.round(v/100)/10).toLocaleString('en-US')+' ألف':N(v); }
window._rjBudgetTxt=function(b){ var m=/^(\d+)-(\d+)$/.exec(String(b||'')); if(!m)return ''; return +m[1]>0?_k(+m[1])+' – '+_k(+m[2])+' ر.س':'أقل من '+_k(+m[2])+' ر.س'; };
function _budgets(p){ p=Number(p)||0; if(p<300)return []; var a=_nice(p*.6),b=_nice(p*.8),c=_nice(p*.95); if(!(a<b&&b<c))return []; return [['0-'+a,'أقل من '+_k(a)],[a+'-'+b,_k(a)+' – '+_k(b)],[b+'-'+c,_k(b)+' – '+_k(c)]]; }
function _close(){ var o=document.getElementById('rj-ov'); if(o)o.remove(); }
window._rjClose=_close;

// ── العميل: «ما يناسبني» مع السبب ──
window._rjOpen=function(o){
  _css(); _close();
  var st={reason:null,budget:null,allow:true}, unit=o.unit||'total';
  var ov=document.createElement('div'); ov.id='rj-ov'; ov.className='rj-ov';
  ov.onclick=function(e){ if(e.target===ov)_close(); };
  function draw(){
    var elig=!o.improved&&st.reason&&CH.indexOf(st.reason)>=0;
    var bud=(st.reason==='price'&&unit==='total')?_budgets(o.price):[];
    var h='<div class="rj-sh" role="dialog" aria-modal="true" aria-label="سبب عدم الاختيار"><div class="rj-grab"></div>'
      +'<div class="rj-h">ما يناسبك عرض '+E(o.name||'المزوّد')+'؟</div>'
      +'<div class="rj-s">'+(o.improved?'هذا عرضه المحسّن — إذا ما ناسبك ينقفل نهائياً.':'اختر السبب — يساعد المزوّد يقدّم لك أفضل (اختياري)')+'</div>'
      +'<div class="rj-chips">'+Object.keys(R).map(function(k){return '<button type="button" class="rj-chip'+(st.reason===k?' on':'')+'" data-r="'+k+'">'+R[k]+'</button>';}).join('')+'</div>';
    if(bud.length)h+='<div><span class="rj-lb">ميزانيتك تقريباً؟ <span>(اختياري — تظهر للمزوّد كنطاق)</span></span><div class="rj-chips">'+bud.map(function(x){return '<button type="button" class="rj-chip'+(st.budget===x[0]?' on':'')+'" data-b="'+x[0]+'">'+x[1]+'</button>';}).join('')+'</div></div>';
    if(elig)h+='<button type="button" class="rj-opt'+(st.allow?'':' off')+'" data-al="1"><span class="rj-cb">✓</span><span><b>أعطه فرصة يقدّم عرض أفضل</b><small>مرة وحدة بس، خلال 48 ساعة. إذا ما يناسبك تتجاهله.</small></span></button>';
    h+='<button type="button" class="rj-go" data-go="1">تأكيد — ما يناسبني</button><button type="button" class="rj-no" data-x="1">رجوع</button></div>';
    ov.innerHTML=h;
    ov.querySelectorAll('[data-r]').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-r');st.reason=(st.reason===k?null:k);if(st.reason!=='price')st.budget=null;draw();};});
    ov.querySelectorAll('[data-b]').forEach(function(b){b.onclick=function(){var k=b.getAttribute('data-b');st.budget=(st.budget===k?null:k);draw();};});
    var al=ov.querySelector('[data-al]'); if(al)al.onclick=function(){st.allow=!st.allow;draw();};
    ov.querySelector('[data-x]').onclick=_close;
    ov.querySelector('[data-go]').onclick=function(){ var btn=this; btn.disabled=true; btn.textContent='جاري…';
      fetch(API_+'/api/bids/'+o.bidId+'/reject',{method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_tok()},body:JSON.stringify({reason:st.reason,budget:st.budget,allow:!!(st.allow&&elig)})})
        .then(function(r){return r.json().catch(function(){return {};}).then(function(d){ if(!r.ok)throw new Error(d.message||'تعذّر'); return d; });})
        .then(function(d){ _close(); _msg(d.chance?'تم — وصل المزوّد إنه يقدر يقدّم عرض أفضل خلال 48 ساعة':'تم — ما راح يظهر لك هذا العرض كخيار',true); if(o.onDone)o.onDone(d); })
        .catch(function(e){ btn.disabled=false; btn.textContent='تأكيد — ما يناسبني'; _msg(e.message||'تعذّر — تحقّق من اتصالك'); });
    };
  }
  draw(); document.body.appendChild(ov);
};

// ── العميل: شارة «عرض محسّن» داخل بطاقة العرض ──
window._rjImpHtml=function(b){
  if(!b||!b.improved_at)return '';
  var op=Number(b.improved_from_price)||0, np=Number(b.price)||0, cut=op>np?op-np:0;
  var h='<div class="rj-imp"><div class="t"><span>✨ عرض محسّن بناءً على ملاحظتك</span>';
  if(op&&op!==np)h+='<span><span class="rj-old">'+N(op)+'</span> ← <b style="color:#15803d">'+N(np)+' ر.س</b>'+(cut?' · وفّرت '+N(cut):'')+'</span>';
  if(b.improved_from_days&&b.days&&+b.improved_from_days!==+b.days)h+='<span>المدة: <span class="rj-old">'+b.improved_from_days+'</span> ← '+b.days+' يوم</span>';
  h+='</div>'; if(b.improve_note)h+='<div class="n"><b>وش تغيّر:</b> '+E(b.improve_note)+'</div>';
  return _css(),h+'</div>';
};

// ── المزوّد: بطاقة الفرصة الثانية / سبب عدم الاختيار ──
function _left(t){ var s=Math.max(0,(new Date(t)-Date.now())/1000); var h=Math.floor(s/3600); return h>=1?('باقي '+h+' ساعة'):('باقي '+Math.max(1,Math.floor(s/60))+' دقيقة'); }
window._rjProvHtml=function(b){
  if(!b)return ''; _css();
  if(b.improved_at&&b.status==='pending')return '<div class="rj-why" style="background:#fffbeb;border-color:#fde68a;color:#92400e">✨ أرسلت عرض محسّن'+(b.improved_from_price?' (<span class="rj-old">'+N(b.improved_from_price)+'</span> ← '+N(b.price)+' ر.س)':'')+' — بانتظار صاحب المشروع</div>';
  if(b.status!=='rejected')return '';
  var why=RP[b.reject_reason]||'', bt=b.reject_reason==='price'&&b.reject_budget?window._rjBudgetTxt(b.reject_budget):'';
  if(b.chance_open)return '<div class="rj-ch"><div class="t">🎯 صاحب المشروع ما اختار عرضك — وسمح لك تقدّم عرض أفضل مرة وحدة</div>'
    +(why?'<div class="s">السبب: <b>'+E(why)+'</b>'+(bt?' · ميزانيته تقريباً <b>'+E(bt)+'</b>':'')+'</div>':'')
    +'<div class="s">⏳ '+_left(b.chance_until)+'</div><button type="button" onclick="_rjImproveOpen('+(parseInt(b.id)||0)+')">قدّم عرض أفضل</button></div>';
  if(b.improved_at)return '<div class="rj-why">صاحب المشروع ما اختار عرضك المحسّن — انقفل على هذا المشروع.</div>';
  if(!b.reject_reason)return '<div class="rj-why">رست على مزوّد آخر هالمرة — فرص جديدة تنتظرك.</div>';
  return '<div class="rj-why">صاحب المشروع ما اختار عرضك'+(why?' — السبب: <b>'+E(why)+'</b>'+(bt?' (ميزانيته تقريباً '+E(bt)+')':''):'')+'</div>';
};

// ── المزوّد: نافذة «قدّم عرض أفضل» ──
window._rjImproveOpen=function(id,list,onDone){
  _css(); _close();
  var arr=list||window._myBids||window._bids||[]; var b=null; for(var i=0;i<arr.length;i++){ if(String(arr[i].id)===String(id)){b=arr[i];break;} }
  if(!b){_msg('حدّث الصفحة وحاول مرة ثانية');return;}
  var why=RP[b.reject_reason]||'', bt=b.reject_reason==='price'&&b.reject_budget?window._rjBudgetTxt(b.reject_budget):'';
  var ov=document.createElement('div'); ov.id='rj-ov'; ov.className='rj-ov'; ov.onclick=function(e){ if(e.target===ov)_close(); };
  var dFirst=b.reject_reason==='duration';
  var pf='<div><span class="rj-lb">السعر الجديد (ر.س)</span><input class="rj-in" id="rj-p" type="number" inputmode="numeric" min="1" value="" placeholder="أقل من '+N(b.price)+'" style="font-size:19px;font-weight:900"></div>';
  var df='<div><span class="rj-lb">مدة التنفيذ (يوم)</span><input class="rj-in" id="rj-d" type="number" inputmode="numeric" min="1" value="'+(parseInt(b.days)||'')+'"></div>';
  ov.innerHTML='<div class="rj-sh" role="dialog" aria-modal="true" aria-label="قدّم عرض أفضل"><div class="rj-grab"></div>'
    +'<div class="rj-h">قدّم عرض أفضل</div><div class="rj-s">'+E(b.request_title||'')+'</div>'
    +(why?'<div class="rj-q">ليش ما اختاره العميل: <b>'+E(why)+'</b>'+(bt?'<br>ميزانيته تقريباً: <b>'+E(bt)+'</b>':'')+'</div>':'')
    +'<div class="rj-row"><span>عرضك السابق</span><span><span class="rj-old" style="font-size:16px">'+N(b.price)+' ر.س</span>'+(b.days?' · '+b.days+' يوم':'')+'</span></div>'
    +(dFirst?df+pf:pf+df)
    +'<div><span class="rj-lb">وش تغيّر؟ <span>(يشوفه صاحب المشروع)</span></span><textarea class="rj-in" id="rj-n" rows="3" maxlength="1500" placeholder="مثال: نزّلنا السعر بنفس الخامات، والضمان سنة."></textarea></div>'
    +'<div class="rj-q">⚠️ <b>فرصة وحدة</b> — بعد الإرسال ما تقدر تعدّل. '+(b.reject_reason==='price'?'لازم السعر يكون أقل من عرضك السابق.':'قلّل السعر أو المدة، أو وضّح التحسين بالتفاصيل.')+'</div>'
    +'<div class="rj-err" id="rj-e"></div>'
    +'<button type="button" class="rj-go g" id="rj-s">أرسل العرض المحسّن</button><button type="button" class="rj-no" data-x="1">إلغاء</button></div>';
  document.body.appendChild(ov);
  ov.querySelector('[data-x]').onclick=_close;
  var pi=ov.querySelector('#rj-p'); pi.value=''; if(!dFirst)setTimeout(function(){try{pi.focus();}catch(e){}},50);
  ov.querySelector('#rj-s').onclick=function(){
    var btn=this, er=ov.querySelector('#rj-e'); var p=parseInt(pi.value||b.price), d=parseInt(ov.querySelector('#rj-d').value)||b.days, n=ov.querySelector('#rj-n').value.trim();
    var fail=function(m){er.textContent=m;er.style.display='block';};
    if(!(p>0))return fail('اكتب السعر الجديد');
    if(p>b.price)return fail('السعر الجديد لازم ما يزيد عن عرضك السابق');
    if(b.reject_reason==='price'&&!(p<b.price))return fail('لازم يكون السعر أقل من '+N(b.price));
    if(n.replace(/\s+/g,'').length<10)return fail('اكتب لصاحب المشروع وش تغيّر في عرضك');
    er.style.display='none'; btn.disabled=true; btn.textContent='جاري الإرسال…';
    fetch(API_+'/api/bids/'+b.id+'/improve',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_tok()},body:JSON.stringify({price:p,days:d,note:n})})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(x){ if(!r.ok)throw new Error(x.message||'تعذّر الإرسال'); return x; });})
      .then(function(x){ _close(); _msg(x.held?'تم — عرضك المحسّن بيظهر للعميل بعد مراجعة الإدارة':'تم — وصل صاحب المشروع عرضك المحسّن',true); if(onDone)onDone(x); else if(typeof loadWorks==='function')loadWorks(); else location.reload(); })
      .catch(function(e){ btn.disabled=false; btn.textContent='أرسل العرض المحسّن'; fail(e.message||'تعذّر الإرسال'); });
  };
};

// ═══════════ المزوّد يطلب التقييم / يوثّق المشروع — العميل يأكّد ═══════════
var CCSS='.cl-gold{border:0;background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border-radius:13px;padding:12px;font-family:inherit;font-weight:900;font-size:14.5px;min-height:46px;width:100%;cursor:pointer;box-shadow:0 6px 16px -8px rgba(217,119,6,.7)}'
+'.cl-ben{display:flex;gap:10px;align-items:center;font-size:13.5px;font-weight:800;line-height:1.6}.cl-ben i{width:30px;height:30px;border-radius:9px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-style:normal;flex-shrink:0}'
+'.cl-out{background:var(--bg,#f8fafd);border:1px dashed #cbd5e1;border-radius:12px;padding:10px 12px;margin-top:10px;display:flex;flex-direction:column;gap:8px}'
+'.cl-out b{font-size:13px;color:var(--text2,#334766)}.cl-out button{border:1.5px solid #fcd34d;background:#fffbeb;color:#b45309;border-radius:11px;padding:10px;font-family:inherit;font-weight:900;font-size:13.5px;cursor:pointer;min-height:42px}'
+'.cl-st{margin-top:10px;border-radius:10px;padding:9px 12px;font-size:12.5px;font-weight:800;line-height:1.7}'
+'.cl-tier{background:linear-gradient(135deg,#fffbeb,var(--white,#fff));border:1px solid #fde68a;border-radius:14px;padding:12px 14px;margin-bottom:14px;display:flex;flex-direction:column;gap:7px}'
+'.cl-tier .h{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:900;color:var(--text,#14223d)}.cl-tier .h span{font-size:12px;color:#b45309}'
+'.cl-bar{height:9px;border-radius:9px;background:#eef2f8;overflow:hidden}.cl-bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,#f59e0b,#d97706)}'
+'.cl-tier .s{font-size:12.5px;font-weight:700;color:#92400e;line-height:1.7}'
+'.cl-when{display:flex;gap:6px;flex-wrap:wrap}'
+'.cl-card{background:var(--white,#fff);border:2px solid #f59e0b;border-radius:18px;padding:16px;display:flex;flex-direction:column;gap:11px;margin-bottom:12px;box-shadow:0 10px 26px -18px rgba(217,119,6,.6);font-family:Tajawal,sans-serif}'
+'.cl-card.cl-mini{flex-direction:row;align-items:center;gap:10px;padding:12px 14px}'
+'.cl-card .q{font-size:15px;font-weight:800;line-height:1.8;color:var(--text,#14223d)}'
+'.cl-av{width:46px;height:46px;border-radius:46px;background:#1e3a8a;color:#fff;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden}.cl-av img{width:100%;height:100%;object-fit:cover}'
+'.cl-ok{border:0;background:#15803d;color:#fff;border-radius:13px;padding:13px;font-family:inherit;font-weight:900;font-size:14.5px;min-height:48px;cursor:pointer}'
+'.cl-b{border:1.5px solid var(--border,#dbe5f5);background:var(--white,#fff);color:var(--text,#1e3a8a);border-radius:13px;padding:11px;font-family:inherit;font-weight:800;font-size:13.5px;min-height:44px;cursor:pointer;flex:1}'
+'.cl-stars{display:flex;justify-content:center;gap:6px;direction:ltr}.cl-stars button{border:0;background:none;font-size:34px;line-height:1;cursor:pointer;color:#cbd5e1;padding:2px;min-width:44px;min-height:44px}.cl-stars button.on{color:#f59e0b}';
function _ccss(){ _css(); if(document.getElementById('cl-css'))return; var s=document.createElement('style'); s.id='cl-css'; s.textContent=CCSS; document.head.appendChild(s); }
var TIERS=[[3,'نشط'],[10,'مميّز'],[25,'خبير معتمد']];
window._clmTierHtml=function(done){
  _ccss(); done=parseInt(done)||0; var nx=null,prev=0; for(var i=0;i<TIERS.length;i++){ if(done<TIERS[i][0]){nx=TIERS[i];break;} prev=TIERS[i][0]; }
  if(!nx)return '';
  var left=nx[0]-done, pc=Math.round((done-prev)/(nx[0]-prev)*100);
  return '<div class="cl-tier"><div class="h">🏅 طريقك لمستوى «'+nx[1]+'»<span>'+done+' من '+nx[0]+'</span></div><div class="cl-bar"><i style="width:'+Math.max(4,pc)+'%"></i></div>'
    +'<div class="s">باقي لك <b>'+(left===1?'مشروع موثّق واحد':(left===2?'مشروعين موثّقين':left+' مشاريع موثّقة'))+'</b> وتصير «'+nx[1]+'» — عروضك تطلع أعلى عند العملاء</div></div>';
};
// مشروع رسى عليه (قيد التنفيذ / مكتمل)
window._clmProjHtml=function(p){
  _ccss(); if(!p)return '';
  if(p.claim_status==='pending')return '<div class="cl-st" style="background:#eef2ff;color:#3730a3">⏳ أرسلت طلب التقييم — بانتظار تأكيد العميل</div>';
  if(p.status==='completed')return p.has_review?'':'<div class="cl-st" style="background:#fffbeb;color:#92400e">⭐ المشروع مكتمل — العميل يقدر يقيّمك من لوحته</div>';
  if(p.status!=='in_progress')return '';
  var h=p.claim_status==='not_done'?'<div class="cl-st" style="background:#f1f5f9;color:#475569">العميل قال إن المشروع لسا ما خلص</div>':'';
  return h+'<button type="button" class="cl-gold" style="margin-top:10px" onclick="_clmProvOpen('+(parseInt(p.id)||0)+',\'awarded\')">⭐ خلّصت المشروع؟ اطلب تقييمك</button>';
};
// عرض ما انقبل في المنصة — يمكن اتفقوا برا
var OUT=['open','closed_auto','closed','expired'];
window._clmBidHtml=function(b){
  _ccss(); if(!b||b.status==='accepted'||!b.unassigned||OUT.indexOf(b.req_status)<0||b.hold_state==='held')return '';
  if(b.claim_status==='pending')return '<div class="cl-st" style="background:#eef2ff;color:#3730a3">⏳ طلبت توثيق المشروع — بانتظار تأكيد العميل</div>';
  if(b.claim_status==='denied')return '<div class="cl-st" style="background:#fef2f2;color:#b91c1c">العميل قال إنه ما تعامل معك على هذا المشروع</div>';
  if(b.claim_status==='confirmed'||b.claim_status==='expired')return '';
  if(b.req_status==='open')return '';   // المشروع مفتوح: «اطلب اعتماد عرضك» الموجود يغطيه
  return '<div class="cl-out"><b>تعاملت مع هذا العميل؟ لا تضيّع تقييمك</b><button type="button" onclick="_clmProvOpen('+(parseInt(b.request_id)||0)+',\'outside\')">✓ وثّق المشروع واطلب التقييم</button></div>';
};
window._clmProvOpen=function(rid,kind){
  _ccss(); _close();
  var src=kind==='awarded'?(window._myProjs||[]):(window._myBids||[]), it=null;
  for(var i=0;i<src.length;i++){ var x=src[i]; if(String(kind==='awarded'?x.id:x.request_id)===String(rid)){it=x;break;} }
  if(!it){_msg('حدّث الصفحة وحاول مرة ثانية');return;}
  var title=it.title||it.request_title||'', cname=it.client_name||'', val=parseInt(it.price)||'', when='week';
  var ov=document.createElement('div'); ov.id='rj-ov'; ov.className='rj-ov'; ov.onclick=function(e){ if(e.target===ov)_close(); };
  var h='<div class="rj-sh" role="dialog" aria-modal="true" aria-label="اطلب تقييمك"><div class="rj-grab"></div>'
    +'<div class="rj-h" style="text-align:center">شغلك على «'+E(title)+'» يستاهل يبان ⭐</div>'
    +'<div class="rj-s" style="text-align:center;margin:-4px 0 2px">العميل اللي رضى عن شغلك هو أقوى دعاية لك. تقييمه يطلع في صفحتك مع شارة «مشروع موثّق ✓»، ويشوفه كل عميل جاي.</div>'
    +'<div class="cl-ben"><i>📈</i><span>عروضك تطلع فوق المنافسين عند أصحاب المشاريع</span></div>'
    +'<div class="cl-ben"><i>🏅</i><span>يقرّبك من مستوى «مميّز» و«خبير»</span></div>'
    +'<div class="rj-q"><b>'+E(title)+'</b>'+(cname?' · العميل: '+E(cname):'')+'</div>';
  if(kind==='outside'){
    h+='<div><span class="rj-lb">قيمة الاتفاق النهائية (ر.س)</span><input class="rj-in" id="cl-v" type="number" inputmode="numeric" min="1" value="'+E(val)+'" style="font-size:19px;font-weight:900"></div>'
      +'<div><span class="rj-lb">متى خلّصت؟</span><div class="cl-when">'+[['week','هالأسبوع'],['month','هالشهر'],['older','قبل كذا']].map(function(w){return '<button type="button" class="rj-chip'+(w[0]===when?' on':'')+'" data-w="'+w[0]+'">'+w[1]+'</button>';}).join('')+'</div></div>';
  }
  h+='<div class="rj-err" id="cl-e"></div><button type="button" class="cl-gold" id="cl-s">أرسل طلب التقييم للعميل</button><div class="rj-s" style="text-align:center;margin:0">يوصل العميل سؤال بضغطة وحدة يأكّد فيه</div><button type="button" class="rj-no" data-x="1">إلغاء</button></div>';
  ov.innerHTML=h; document.body.appendChild(ov);
  ov.querySelector('[data-x]').onclick=_close;
  ov.querySelectorAll('[data-w]').forEach(function(bt){bt.onclick=function(){when=bt.getAttribute('data-w');ov.querySelectorAll('[data-w]').forEach(function(z){z.classList.toggle('on',z===bt);});};});
  ov.querySelector('#cl-s').onclick=function(){
    var btn=this, er=ov.querySelector('#cl-e'), vi=ov.querySelector('#cl-v'), v=vi?parseInt(vi.value)||0:0;
    if(kind==='outside'&&!(v>0)){er.textContent='اكتب قيمة الاتفاق';er.style.display='block';return;}
    btn.disabled=true; btn.textContent='جاري الإرسال…';
    fetch(API_+'/api/provider/claims',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_tok()},body:JSON.stringify({request_id:rid,value:v||undefined,done_when:kind==='outside'?when:undefined})})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(x){ if(!r.ok)throw new Error(x.message||'تعذّر الإرسال'); return x; });})
      .then(function(){ _close(); _msg('تم — وصل العميل طلب التأكيد والتقييم',true); if(typeof loadWorks==='function')loadWorks(); })
      .catch(function(e){ btn.disabled=false; btn.textContent='أرسل طلب التقييم للعميل'; er.textContent=e.message||'تعذّر الإرسال'; er.style.display='block'; });
  };
};
// ── العميل: بطاقات التأكيد في الرئيسية ──
var _cl=[];
window._clmClientLoad=function(){
  var el=document.getElementById('ph-claims'); if(!el||!_tok())return;
  fetch(API_+'/api/client/claims',{headers:{'Authorization':'Bearer '+_tok()},cache:'no-store'}).then(function(r){return r.ok?r.json():[];}).then(function(d){ _cl=Array.isArray(d)?d:[]; _clPaint(); }).catch(function(){});
};
function _clPaint(){
  var el=document.getElementById('ph-claims'); if(!el)return; _ccss();
  el.innerHTML=_cl.map(function(c){
    var nm=c.provider_name||'المزوّد';
    return '<div class="cl-card cl-mini" data-cl="'+c.id+'"><span style="font-size:22px">⭐</span><div style="flex:1;min-width:0"><b style="font-size:13.5px;line-height:1.7;display:block">'+E(nm)+' '+(c.kind==='outside'?'يقول إنه نفّذ':'يقول إنه خلّص')+' «'+E(c.title)+'»'+(c.value?' بقيمة '+N(c.value)+' ر.س':'')+'</b><span class="rj-s" style="margin:0">أكّد بضغطة وقيّمه</span></div><button type="button" class="cl-ok" data-open="1" style="padding:9px 14px;min-height:40px;font-size:13px">أكّد</button></div>';
  }).join('');
  el.querySelectorAll('[data-open]').forEach(function(b){ b.onclick=function(){ var card=b.closest('[data-cl]'); _clFull(card); }; });
  try{ if(window._phDecideHead)window._phDecideHead(); }catch(e){}
}
function _clFull(card){
  var id=card.getAttribute('data-cl'), c=_cl.filter(function(x){return String(x.id)===String(id);})[0]; if(!c)return;
  var nm=c.provider_name||'المزوّد', av=c.provider_image?'<img src="'+E(c.provider_image)+'" alt="">':E(nm.charAt(0));
  var sub=[]; if(+c.provider_rating)sub.push('★ '+(+c.provider_rating).toFixed(1)); if(+c.provider_done)sub.push(c.provider_done+' مشروع منجز');
  card.classList.remove('cl-mini');
  card.innerHTML='<div style="display:flex;gap:11px;align-items:center"><div class="cl-av">'+av+'</div><div><b style="font-size:15px">'+E(nm)+'</b>'+(sub.length?'<div class="rj-s" style="margin:2px 0 0">'+sub.join(' · ')+'</div>':'')+'</div></div>'
    +'<div class="q">'+(c.kind==='outside'?'يقول إنه نفّذ مشروعك':'يقول إنه خلّص مشروعك')+'<br>«'+E(c.title)+'»'+(c.value?' بقيمة <b style="color:#1e3a8a">'+N(c.value)+' ر.س</b>':'')+' — صحيح؟</div>'
    +'<button type="button" class="cl-ok" data-a="done">إيه، خلّص — وأبي أقيّمه</button>'
    +(c.value?'<button type="button" class="cl-b" data-a="value">صحيح، بس القيمة مختلفة</button>':'')
    +'<div style="display:flex;gap:8px"><button type="button" class="cl-b" data-a="not_done">لسا ما خلص</button><button type="button" class="cl-b" data-a="denied" style="color:#b91c1c;border-color:#fecaca">ما تعاملت معه</button></div>';
  card.querySelectorAll('[data-a]').forEach(function(b){ b.onclick=function(){ var a=b.getAttribute('data-a');
    if(a==='value'){ var v=prompt('اكتب القيمة الصحيحة للمشروع (ر.س)', c.value||''); if(v===null)return; v=parseInt(String(v).replace(/[^0-9]/g,'')); if(!(v>0)){_msg('اكتب رقم صحيح');return;} _clAnswer(c,'done',v,card); }
    else if(a==='denied'){ if(!confirm('متأكد إنك ما تعاملت مع '+(c.provider_name||'هذا المزوّد')+' على هذا المشروع؟'))return; _clAnswer(c,'denied',null,card); }
    else _clAnswer(c,a,null,card);
  };});
}
function _clAnswer(c,a,v,card){
  card.querySelectorAll('button').forEach(function(b){b.disabled=true;});
  fetch(API_+'/api/client/claims/'+c.id+'/answer',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_tok()},body:JSON.stringify({answer:a,value:v||undefined})})
    .then(function(r){return r.json().catch(function(){return {};}).then(function(x){ if(!r.ok)throw new Error(x.message||'تعذّر'); return x; });})
    .then(function(x){
      if(a==='done'&&x.review){ _clRate(c,x.review,card); if(typeof loadHome==='function')setTimeout(function(){try{window._homeSig=null;}catch(e){}},0); return; }
      _cl=_cl.filter(function(z){return z.id!==c.id;}); _clPaint(); _msg(a==='denied'?'شكراً — بلّغنا الإدارة':'تم — بلّغنا المزوّد',true);
    })
    .catch(function(e){ card.querySelectorAll('button').forEach(function(b){b.disabled=false;}); _msg(e.message||'تعذّر — تحقّق من اتصالك'); });
}
function _clRate(c,rv,card){
  var sel=0;
  card.innerHTML='<div style="text-align:center;display:flex;flex-direction:column;gap:10px"><b style="font-size:15.5px">كيف كانت تجربتك مع '+E(c.provider_name||'المزوّد')+'؟</b>'
    +'<div class="cl-stars">'+[1,2,3,4,5].map(function(n){return '<button type="button" data-s="'+n+'" aria-label="'+n+' نجوم">★</button>';}).join('')+'</div>'
    +'<textarea class="rj-in" id="cl-cm-'+c.id+'" rows="2" maxlength="600" placeholder="اكتب كلمتين عن الشغل (اختياري)" style="font-size:14px"></textarea>'
    +'<button type="button" class="cl-ok" data-go="1" style="background:#1d4ed8">أرسل التقييم</button></div>';
  var st=card.querySelectorAll('[data-s]');
  st.forEach(function(b){ b.onclick=function(){ sel=+b.getAttribute('data-s'); st.forEach(function(z){z.classList.toggle('on',+z.getAttribute('data-s')<=sel);}); }; });
  card.querySelector('[data-go]').onclick=function(){
    if(!sel){_msg('اختر عدد النجوم');return;} var btn=this; btn.disabled=true;
    fetch(API_+'/api/reviews',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_tok()},body:JSON.stringify({request_id:rv.request_id,reviewed_id:rv.reviewed_id,rating:sel,comment:(document.getElementById('cl-cm-'+c.id)||{}).value||''})})
      .then(function(r){return r.json().catch(function(){return {};}).then(function(x){ if(!r.ok)throw new Error(x.message||'تعذّر'); return x; });})
      .then(function(){ card.innerHTML='<div style="text-align:center;display:flex;flex-direction:column;gap:8px"><div style="font-size:30px">🎉</div><b style="font-size:15px">شكراً على تقييمك</b><div class="rj-s" style="margin:0">عندك مشروع ثاني؟ انشره واستقبل عروض من مزوّدين موثّقين</div><button type="button" class="cl-b" style="flex:none" onclick="if(typeof show===\'function\')show(\'new\',null,\'new\');else location.href=\'/dashboard-client.html\'">+ مشروع جديد</button></div>';
        _cl=_cl.filter(function(z){return z.id!==c.id;}); })
      .catch(function(e){ btn.disabled=false; _msg(e.message||'تعذّر إرسال التقييم'); });
  };
}
function _clAuto(){ if(document.getElementById('ph-claims'))window._clmClientLoad(); }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',_clAuto); else _clAuto();

// ═══ المزوّد: تأكيد «اتفقت مع العميل» + تعديل السعر/المدة قبل طلب الاعتماد ═══
window._askConfirmOpen=function(b,send){
  _ccss(); _close();
  var unit=(b.price_unit&&b.price_unit!=='total')?(b.price_unit==='meter'?' / متر':' / وحدة'):'';
  var st={edit:false,ok:false};
  var ov=document.createElement('div'); ov.id='rj-ov'; ov.className='rj-ov'; ov.onclick=function(e){ if(e.target===ov)_close(); };
  ov.innerHTML='<div class="rj-sh" role="dialog" aria-modal="true" aria-label="تأكيد الاتفاق"><div class="rj-grab"></div>'
    +'<div class="rj-h">متأكد إنكم اتفقتوا على السعر والمدة؟</div>'
    +'<div class="rj-s">'+E(b.request_title||'')+(b.client_name?' · العميل: '+E(b.client_name):'')+'</div>'
    +'<div class="rj-q" style="display:flex;flex-direction:column;gap:8px"><span>العميل بيوصله طلب يعتمد عرضك بـ:</span>'
    +'<div id="ak-view" style="display:flex;align-items:center;gap:10px;justify-content:space-between"><b style="font-size:16px;color:var(--text,#14223d)">'+N(b.price)+' ر.س'+unit+(b.days?' · '+b.days+' يوم':'')+'</b><button type="button" id="ak-ed" style="border:1.5px solid #dbe5f5;background:var(--white,#fff);color:#1d4ed8;border-radius:10px;padding:7px 12px;font-family:inherit;font-weight:900;font-size:13px;cursor:pointer;min-height:36px">✎ عدّل</button></div>'
    +'<div id="ak-edit" style="display:none;gap:8px"><div style="flex:1"><span class="rj-lb">السعر (ر.س'+unit+')</span><input class="rj-in" id="ak-p" type="number" inputmode="numeric" min="1" value="'+(parseInt(b.price)||'')+'"></div><div style="flex:1"><span class="rj-lb">المدة (يوم)</span><input class="rj-in" id="ak-d" type="number" inputmode="numeric" min="1" value="'+(parseInt(b.days)||'')+'"></div></div></div>'
    +'<div class="rj-s" style="margin:0;color:#b45309">إذا ردّ العميل «ما اتفقنا»، ما تقدر ترسل له مرة ثانية على هذا المشروع، وتكرارها يأثر على ظهور عروضك.</div>'
    +'<button type="button" class="rj-opt off" id="ak-cb"><span class="rj-cb">✓</span><span><b>أأكد إني اتفقت مع العميل</b></span></button>'
    +'<div class="rj-err" id="ak-e"></div>'
    +'<button type="button" class="rj-go g" id="ak-s" disabled>أرسل الطلب</button><button type="button" class="rj-no" data-x="1">إلغاء</button></div>';
  document.body.appendChild(ov);
  var go=ov.querySelector('#ak-s'), cb=ov.querySelector('#ak-cb'), er=ov.querySelector('#ak-e');
  ov.querySelector('[data-x]').onclick=_close;
  ov.querySelector('#ak-ed').onclick=function(){ st.edit=true; ov.querySelector('#ak-view').style.display='none'; ov.querySelector('#ak-edit').style.display='flex'; try{ov.querySelector('#ak-p').focus();}catch(e){} };
  cb.onclick=function(){ st.ok=!st.ok; cb.classList.toggle('off',!st.ok); go.disabled=!st.ok; };
  go.onclick=function(){
    var pl={confirm:true};
    if(st.edit){ var p=parseInt(ov.querySelector('#ak-p').value), d=parseInt(ov.querySelector('#ak-d').value);
      if(!(p>0)){er.textContent='اكتب السعر المتفق عليه';er.style.display='block';return;}
      if(!(d>0)){er.textContent='اكتب المدة بالأيام';er.style.display='block';return;}
      pl.price=p; pl.days=d; }
    go.disabled=true; go.textContent='جاري الإرسال…'; er.style.display='none';
    send(pl,function(ok,msg){ if(ok){_close();return;} go.disabled=false; go.textContent='أرسل الطلب'; er.textContent=msg||'تعذّر الإرسال'; er.style.display='block'; });
  };
};

// ═══ إغلاق المشروع: «ما لقيت عرض مناسب» → وش الناقص + أبي مساعدة ═══
var _nso={missing:null,help:false};
window._nsoGet=function(){ return {missing:_nso.missing, help:!!_nso.help}; };
window._nsoMount=function(radioName){
  _ccss(); _nso={missing:null,help:false};
  var inp=document.querySelector('input[name="'+radioName+'"][value="no_suitable_offers"]'); if(!inp)return;
  var lbl=inp.closest('label')||inp.parentNode, box=document.createElement('div');
  box.id='nso-box'; box.style.cssText='display:none;margin:-2px 0 9px;padding:2px 4px 0';
  var M=[['price','💰 الأسعار أعلى من ميزانيتي'],['far','📍 ما فيه مزوّد قريب مني'],['few','🔢 العروض قليلة'],['weak','📄 العروض ضعيفة / ما فهموا المشروع']];
  box.innerHTML='<span class="rj-lb" style="margin-top:4px">وش كان ناقص؟ <span>(اختياري)</span></span><div class="rj-chips">'+M.map(function(m){return '<button type="button" class="rj-chip" data-m="'+m[0]+'" style="font-size:12.5px;padding:8px 11px">'+m[1]+'</button>';}).join('')+'</div>'
    +'<button type="button" class="rj-opt off" data-h="1" style="margin-top:9px;background:#eff6ff;border-color:#93c5fd"><span class="rj-cb" style="background:#1d4ed8">✓</span><span><b style="color:#1e3a8a">أبي مساعدة فريق مناقصة</b><small style="color:#1e40af">نتواصل معك ونرشّح لك مزوّدين مناسبين — بدون أي رسوم عليك</small></span></button>';
  lbl.parentNode.insertBefore(box, lbl.nextSibling);
  box.querySelectorAll('[data-m]').forEach(function(b){ b.onclick=function(){ var k=b.getAttribute('data-m'); _nso.missing=(_nso.missing===k?null:k); box.querySelectorAll('[data-m]').forEach(function(z){z.classList.toggle('on',z.getAttribute('data-m')===_nso.missing);}); }; });
  var hb=box.querySelector('[data-h]'); hb.onclick=function(){ _nso.help=!_nso.help; hb.classList.toggle('off',!_nso.help); };
  document.querySelectorAll('input[name="'+radioName+'"]').forEach(function(r){ r.addEventListener('change',function(){ box.style.display=inp.checked?'block':'none'; }); });
};
})();
