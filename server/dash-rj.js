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
+'.rj-opt.off .rj-cb{background:#fff;border:2px solid #cbd5e1;color:transparent}'
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
})();
