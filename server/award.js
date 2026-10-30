/* ═══ اختيار عرض: بطاقة تأكيد واضحة + «اخترت بالغلط؟ تراجع» خلال 5 دقايق (بدون عدّاد) ═══
   mnqAwardConfirm(o) → Promise<boolean>   ·   mnqAwardMount(reqId, anchorEl, onChange) */
(function(){
  'use strict';
  var W=window, D=document;
  function api(){ return (typeof W.API==='string'&&W.API)||''; }
  function tok(){ try{ return localStorage.getItem('token')||''; }catch(e){ return ''; } }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function num(n){ n=parseFloat(n)||0; return n.toLocaleString('en-US'); }
  function css(){
    if(D.getElementById('aw-css'))return;
    var s=D.createElement('style'); s.id='aw-css';
    s.textContent='.aw-ov{position:fixed;inset:0;z-index:9500;background:rgba(15,29,58,.5);display:flex;align-items:flex-end;justify-content:center;font-family:Tajawal,sans-serif;direction:rtl}'
      +'@media(min-width:700px){.aw-ov{align-items:center}.aw-sh{border-radius:22px!important}}'
      +'.aw-sh{background:#fff;color:#0f1d3a;width:100%;max-width:440px;border-radius:24px 24px 0 0;padding:16px 16px calc(20px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:11px;box-sizing:border-box;animation:awUp .2s ease}'
      +'@keyframes awUp{from{transform:translateY(40px);opacity:0}}'
      +'.aw-gr{width:44px;height:5px;border-radius:9px;background:#e2e8f0;align-self:center}'
      +'.aw-t{font-size:18px;font-weight:900;text-align:center}.aw-s{font-size:13px;color:#5b6b82;font-weight:700;line-height:1.7}'
      +'.aw-c{border:1px solid #e3eaf6;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:6px}'
      +'.aw-p{display:flex;align-items:center;gap:10px}.aw-av{width:40px;height:40px;border-radius:50%;background:#eef2ff;color:#3730a3;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0}'
      +'.aw-kv{display:flex;justify-content:space-between;font-size:13px;font-weight:700;color:#475569}.aw-kv b{color:#0f1d3a}'
      +'.aw-w{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:12px;padding:10px 12px;font-size:12.5px;font-weight:800;line-height:1.7}'
      +'.aw-b{border:0;border-radius:13px;padding:13px;font-family:inherit;font-weight:900;font-size:15px;cursor:pointer;width:100%}'
      +'.aw-g{background:#16a34a;color:#fff}.aw-o{background:#fff;color:#1e3a8a;border:1.5px solid #dbe5f5}.aw-r{background:#dc2626;color:#fff}'
      +'.aw-row{display:flex;gap:8px}.aw-row .aw-b{flex:1}'
      +'.aw-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:14px;padding:11px 13px;margin-bottom:10px;font-family:inherit}'
      +'.aw-bar b{color:#166534;font-size:14px;flex:1;min-width:150px}.aw-bar button{border:0;background:none;color:#64748b;font-family:inherit;font-weight:800;font-size:12.5px;text-decoration:underline;cursor:pointer;padding:4px}'
      +'[data-theme="dark"] .aw-sh{background:#16233f;color:#e6edf8}[data-theme="dark"] .aw-c{border-color:#24365e}[data-theme="dark"] .aw-kv b{color:#e6edf8}[data-theme="dark"] .aw-kv,[data-theme="dark"] .aw-s{color:#a9b6d3}'
      +'[data-theme="dark"] .aw-o{background:transparent;color:#c7d2fe;border-color:#2b4377}[data-theme="dark"] .aw-w{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.35);color:#fcd34d}'
      +'[data-theme="dark"] .aw-bar{background:rgba(22,163,74,.1);border-color:rgba(22,163,74,.35)}[data-theme="dark"] .aw-bar b{color:#86efac}[data-theme="dark"] .aw-bar button{color:#94a3b8}';
    D.head.appendChild(s);
  }
  function sheet(html){
    css(); var o=D.createElement('div'); o.className='aw-ov'; o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true');
    o.innerHTML='<div class="aw-sh"><div class="aw-gr"></div>'+html+'</div>'; D.body.appendChild(o); return o;
  }
  // بطاقة تأكيد القبول — o: {name, price, unit, days, rating, others, note}
  W.mnqAwardConfirm=function(o){
    o=o||{};
    return new Promise(function(res){
      var U={meter:' / للمتر',unit:' / للوحدة'}[o.unit]||'';
      var ov=sheet('<div class="aw-t">تختار هذا المزوّد؟</div>'
        +'<div class="aw-c"><div class="aw-p"><span class="aw-av">'+esc(String(o.name||'؟').charAt(0))+'</span><b style="font-size:15px">'+esc(o.name||'المزوّد')+'</b></div>'
        +(o.price?'<div class="aw-kv"><span>السعر</span><b>'+num(o.price)+' ر.س'+U+'</b></div>':'')
        +(o.days?'<div class="aw-kv"><span>المدة</span><b>'+esc(o.days)+' يوم</b></div>':'')+'</div>'
        +(o.note?'<div class="aw-s">'+esc(o.note)+'</div>':'')
        +(o.others>0?'<div class="aw-w">باقي العروض ('+o.others+') ما راح تُختار — تأكد إن هذا العرض اللي تبيه</div>':'')
        +'<button type="button" class="aw-b aw-g" data-a="y">نعم، اخترته</button><button type="button" class="aw-b aw-o" data-a="n">رجوع — أبي أقارن أكثر</button>');
      var done=function(v){ if(ov.parentNode)ov.remove(); res(v); };
      ov.addEventListener('click',function(e){ if(e.target===ov)return done(false); var b=e.target.closest('[data-a]'); if(b)done(b.getAttribute('data-a')==='y'); });
    });
  };
  // سطر «اخترت X — اخترت بالغلط؟ تراجع» يطلع بس خلال المهلة
  W.mnqAwardMount=function(reqId, anchor, onChange){
    if(!reqId||!anchor||!tok())return;
    fetch(api()+'/api/requests/'+reqId+'/award-state',{headers:{Authorization:'Bearer '+tok()},cache:'no-store'}).then(function(r){return r.ok?r.json():{};}).then(function(d){
      var old=D.getElementById('aw-bar'); if(old)old.remove();
      if(!d||!d.pending||!anchor.parentNode)return;
      css(); var bar=D.createElement('div'); bar.id='aw-bar'; bar.className='aw-bar';
      bar.innerHTML='<b>✅ اخترت '+esc(d.provider||'المزوّد')+'</b><button type="button">اخترت بالغلط؟ تراجع</button>';
      anchor.parentNode.insertBefore(bar,anchor);
      var t=setTimeout(function(){ if(bar.parentNode)bar.remove(); },Math.max(1,d.left_sec)*1000);
      bar.querySelector('button').onclick=function(){
        var ov=sheet('<div style="font-size:16px;font-weight:900">ترجع عن اختيارك؟</div><div class="aw-s">ما وصل للمزوّد شي — العروض كلها ترجع وتقدر تختار من جديد.</div>'
          +'<div class="aw-row"><button type="button" class="aw-b aw-r" data-a="undo">نعم، تراجع</button><button type="button" class="aw-b aw-g" data-a="ok">اعتمد</button></div>');
        ov.addEventListener('click',function(e){
          if(e.target===ov){ ov.remove(); return; }
          var b=e.target.closest('[data-a]'); if(!b)return; var a=b.getAttribute('data-a'); b.disabled=true;
          fetch(api()+'/api/requests/'+reqId+'/award-'+(a==='undo'?'undo':'confirm'),{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok()},body:'{}'})
            .then(function(r){return r.json().then(function(x){return {ok:r.ok,d:x};});}).then(function(r){
              ov.remove();
              if(!r.ok){ alert((r.d&&r.d.message)||'تعذّر'); }
              clearTimeout(t); if(bar.parentNode)bar.remove();
              var msg=a==='undo'?'رجّعنا العروض — تقدر تختار من جديد':'تم ✓ — بلّغنا المزوّد';
              if(r.ok){ if(typeof W.showToast==='function')W.showToast(msg,'success'); else if(typeof W._pjToast==='function')W._pjToast(msg); }
              if(typeof onChange==='function')onChange(a);
            }).catch(function(){ b.disabled=false; alert('تعذّر الاتصال'); });
        });
      };
    }).catch(function(){});
  };
})();
