// الفروع: الفرع المختار (للمالك ومدير الحساب) + شريط التبديل + قائمة الفروع للنماذج
(function(){
  var K='mnq_br';
  function tok(){ try{ return localStorage.getItem('token')||''; }catch(e){ return ''; } }
  function sel(){ try{ return parseInt(localStorage.getItem(K))||0; }catch(e){ return 0; } }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  var B={ list:[], forced:false, sel:sel(), ready:null, multi:false };
  // رأس الطلب: الصفحات تضيفه لكل طلب
  B.h=function(){ var s=sel(); return s?{'X-MNQ-Br':String(s)}:{}; };
  B.load=function(){
    if(B.ready) return B.ready;
    B.ready=fetch('/api/branches',{headers:Object.assign({'Authorization':'Bearer '+tok()},B.h())}).then(function(r){ return r.ok?r.json():{items:[]}; }).then(function(d){
      B.list=d.items||[]; B.forced=!!d.forced; B.multi=B.list.length>1; B.data=d;
      if(B.sel && !B.list.some(function(b){return b.id===B.sel;})){ B.sel=0; try{localStorage.removeItem(K);}catch(e){} }
      return B;
    }).catch(function(){ return B; });
    return B.ready;
  };
  B.name=function(id){ var m=B.list.filter(function(b){return b.id===id;})[0]||B.list.filter(function(b){return b.main;})[0]; return m?m.name:''; };
  // id الفعلي (السجلات القديمة/الرئيسي = null)
  B.of=function(id){ if(id) return id; var m=B.list.filter(function(b){return b.main;})[0]; return m?m.id:0; };
  // شريط التبديل: يظهر بس لو أكثر من فرع
  B.bar=function(el,onChange){
    if(!el) return;
    B.load().then(function(){
      if(!B.multi){ el.innerHTML=''; el.style.display='none'; return; }
      el.style.display='';
      if(B.forced){ el.innerHTML='<span class="mnq-br-chip">📍 '+esc(B.list[0]?B.list[0].name:'')+'</span>'; return; }
      var o='<option value="0">📍 كل الفروع</option>'+B.list.map(function(b){ return '<option value="'+b.id+'"'+(b.id===B.sel?' selected':'')+(b.paused?' disabled':'')+'>📍 '+esc(b.name)+(b.paused?' (موقوف)':'')+'</option>'; }).join('');
      el.innerHTML='<select class="mnq-br-sel" aria-label="الفرع">'+o+'</select>';
      el.querySelector('select').onchange=function(){ var v=parseInt(this.value)||0; B.sel=v; try{ if(v)localStorage.setItem(K,v); else localStorage.removeItem(K); }catch(e){} if(onChange) onChange(v); else location.reload(); };
    });
  };
  // قائمة اختيار الفرع للنماذج (إضافة فني، عميل، مشروع، عرض) — فارغة لو فرع واحد أو مشرف فرع
  B.field=function(id,cur,label){
    if(!B.multi||B.forced) return '';
    var v=cur||B.sel||B.of(0);
    return '<div><label for="'+id+'">'+esc(label||'الفرع')+'</label><select id="'+id+'" class="inp">'+B.list.filter(function(b){return !b.paused;}).map(function(b){ return '<option value="'+b.id+'"'+(b.id===v?' selected':'')+'>'+esc(b.name)+'</option>'; }).join('')+'</select></div>';
  };
  B.val=function(id){ var e=document.getElementById(id); return e?parseInt(e.value)||undefined:undefined; };
  B.tag=function(id){ if(!B.multi||B.forced||B.sel) return ''; return '<span class="mnq-br-tag">📍 '+esc(B.name(id))+'</span>'; };
  var st=document.createElement('style');
  st.textContent='.mnq-br-sel{font-family:inherit;font-weight:900;color:#1e3a8a;background:#fff;border:1.5px solid #c7d6f5;border-radius:12px;padding:8px 12px;font-size:13.5px;max-width:100%}.mnq-br-chip{display:inline-flex;align-items:center;gap:4px;background:#e0eaff;color:#1e3a8a;border-radius:99px;padding:5px 12px;font-weight:900;font-size:13px}.mnq-br-tag{display:inline-flex;align-items:center;background:#f1f5f9;color:#475467;border-radius:99px;padding:1px 8px;font-weight:800;font-size:11px;margin-inline-start:6px}';
  (document.head||document.documentElement).appendChild(st);
  window.MNQ_BR=B;
})();
