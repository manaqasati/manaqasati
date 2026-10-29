/* ═══ «حسابك موقوف عن تقديم العروض» — يطلع للمزوّد الموقوف بدل نموذج العرض ═══
   يُستخدم في لوحة المزوّد وصفحة المشروع. السيرفر يرفض العرض أصلاً (code: bid_ban)؛ هذا للعرض الواضح فقط. */
(function(){
  'use strict';
  var cache=null, at=0;
  function tok(){ try{ return localStorage.getItem('token')||''; }catch(e){ return ''; } }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function get(force){
    if(!tok())return Promise.resolve(null);
    if(!force&&cache&&Date.now()-at<60000)return Promise.resolve(cache);
    return fetch('/api/provider/bid-standing',{headers:{Authorization:'Bearer '+tok()},cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).then(function(d){ cache=d; at=Date.now(); return d; }).catch(function(){ return null; });
  }
  function left(h){ if(h==null)return ''; if(h<=1)return 'باقي أقل من ساعة'; if(h<24)return 'باقي '+h+' ساعة'; var d=Math.floor(h/24), r=h%24; return 'باقي '+(d===1?'يوم':(d===2?'يومين':d+' أيام'))+(r?' و'+r+' ساعة':''); }
  function sheet(b){
    if(!b)return;
    var old=document.getElementById('mnqBan'); if(old)old.remove();
    if(!document.getElementById('mnqBanCss')){
      var st=document.createElement('style'); st.id='mnqBanCss';
      st.textContent='#mnqBan{position:fixed;inset:0;z-index:9000;background:rgba(15,29,58,.5);display:flex;align-items:flex-end;justify-content:center;font-family:Tajawal,sans-serif}'
        +'#mnqBan .bb{background:#fff;color:#0f1d3a;width:100%;max-width:480px;border-radius:24px 24px 0 0;padding:20px 18px calc(env(safe-area-inset-bottom,0px) + 22px);display:flex;flex-direction:column;gap:12px;animation:mbUp .22s ease}'
        +'@keyframes mbUp{from{transform:translateY(100%)}to{transform:none}}'
        +'#mnqBan .gr{width:44px;height:5px;border-radius:9px;background:#e2e8f0;align-self:center}'
        +'#mnqBan .hd{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px}'
        +'#mnqBan .ic{width:60px;height:60px;border-radius:18px;background:#fee2e2;color:#b91c1c;display:flex;align-items:center;justify-content:center}'
        +'#mnqBan b.t{font-size:18px;font-weight:900}#mnqBan .s{font-size:13px;color:#5b6b82;font-weight:700}#mnqBan .lf{background:#fee2e2;color:#b91c1c;border-radius:999px;padding:5px 12px;font-size:12px;font-weight:900}'
        +'#mnqBan .rs{background:#f8fafc;border:1px solid #e3eaf6;border-radius:14px;padding:12px}#mnqBan .rs small{display:block;font-size:11.5px;color:#64748b;font-weight:700}#mnqBan .rs b{font-size:14px}'
        +'#mnqBan .nt{text-align:center;font-size:12.5px;color:#5b6b82;font-weight:700;line-height:1.7}'
        +'#mnqBan .go{display:flex;align-items:center;justify-content:center;gap:7px;background:#2563eb;color:#fff;border:0;border-radius:13px;padding:14px;font-family:inherit;font-weight:900;font-size:15px;cursor:pointer;text-decoration:none}'
        +'#mnqBan .cl{background:none;border:0;color:#64748b;font-family:inherit;font-weight:800;font-size:13px;cursor:pointer;padding:6px}'
        +'[data-theme="dark"] #mnqBan .bb{background:#16233f;color:#e6edf8}[data-theme="dark"] #mnqBan .rs{background:#0f1a33;border-color:#24365e}';
      document.head.appendChild(st);
    }
    var perm=b.kind==='ban';
    var o=document.createElement('div'); o.id='mnqBan'; o.setAttribute('role','dialog'); o.setAttribute('aria-modal','true');
    o.innerHTML='<div class="bb"><div class="gr"></div><div class="hd"><span class="ic"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg></span>'
      +'<b class="t">'+(perm?'حسابك موقوف عن تقديم العروض':'حسابك موقوف مؤقتاً عن تقديم العروض')+'</b>'
      +(b.until_txt?'<span class="s">يرجع تلقائياً <b style="color:#0f1d3a">'+esc(b.until_txt)+'</b></span><span class="lf">'+esc(left(b.left_h))+'</span>':'<span class="s">لين تراجع الإدارة حسابك</span>')+'</div>'
      +(b.reason?'<div class="rs"><small>السبب</small><b>'+esc(b.reason)+'</b></div>':'')
      +'<div class="nt">تقدر تدخل حسابك وترد على محادثاتك وتكمّل مشاريعك عادي — الإيقاف على تقديم العروض بس.</div>'
      +'<a class="go" href="/chat?support=1&amp;topic='+encodeURIComponent('اعتراض على إيقاف')+'"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/></svg>تواصل مع الإدارة</a>'
      +'<button type="button" class="cl" onclick="document.getElementById(\'mnqBan\').remove()">إغلاق</button></div>';
    o.addEventListener('click',function(e){ if(e.target===o)o.remove(); });
    document.body.appendChild(o);
  }
  window.mnqBanSheet=sheet;
  window.mnqBanGate=function(cb){ get().then(function(d){ if(d&&d.ban){ sheet(d.ban); return; } cb(); }); };
  function init(){ get(); }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
