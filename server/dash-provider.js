/* مناقصة — كود dashboard-provider.html (مفصول عشان يتخزّن في الجوال ويفتح أسرع) */

function fmtN(n){ return n?String(Math.round(Number(n))).replace(/\B(?=(\d{3})+(?!\d))/g,','):'0'; }

'use strict';
var API='https://manaqasati-production.up.railway.app';
function isImg(s){return !!(s&&(s.startsWith('http')||s.startsWith('data:')));}
function _pubBadge(key){
  if(!key||key==='none')return '';
  var M={verified:{l:'موثّق',c:'#2E90FA',bg:'#EFF8FF'},premium:{l:'مميز',c:'#B8780A',bg:'#FFF7E6'},gold_partner:{l:'شريك ذهبي',c:'#B8780A',bg:'#FFF7E6'},top_rated:{l:'الأعلى تقييماً',c:'#15803d',bg:'#dcfce7'},fast_response:{l:'سريع الاستجابة',c:'#0369a1',bg:'#e0f2fe'},trusted_client:{l:'عميل موثوق',c:'#1e3a8a',bg:'#dbeafe'}};
  var m=M[key];if(!m)return '';
  return '<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;background:'+m.bg+';color:'+m.c+';margin-right:4px;vertical-align:middle"><svg width="9" height="9" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'+m.l+'</span>';
}
function _tierBadge(t){
  if(!t||t==='new')return '';
  var M={active:{l:'مزود نشط',c:'#9a6a2e',bg:'#f6ead9'},distinguished:{l:'مزود مميّز',c:'#5b6b7d',bg:'#eceff3'},expert:{l:'خبير معتمد',c:'#97710d',bg:'#fdf1cf'}};
  var m=M[t];if(!m)return '';
  return '<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;font-weight:800;padding:2px 8px;border-radius:20px;background:'+m.bg+';color:'+m.c+';margin-right:4px;vertical-align:middle"><svg width="9" height="9" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.5 12.9 17 22l-5-3-5 3 1.5-9.1"/></svg>'+m.l+'</span>';
}


if('serviceWorker' in navigator){
  navigator.serviceWorker.register('/sw.js').then(function(reg){console.log('SW registered:',reg.scope);}).catch(function(err){console.log('SW register error:',err);});
}

var _token=localStorage.getItem('token')||'';
var _me={};
try{_me=JSON.parse(localStorage.getItem('user')||'{}')||{};}catch(e){_me={};}
function _pvCheckVerify(){ try{ _vbRender(); }catch(e){} }
// ===== بطاقة تفعيل البريد =====
var _vbCd=0,_vbTm=null;
function _vbMail(e){e=String(e||'').toLowerCase();var d=e.split('@')[1]||'';
  if(/^(hotmail|outlook|live|msn)\./.test(d))return['Outlook','https://outlook.live.com/mail/'];
  if(/^(gmail|googlemail)\./.test(d))return['Gmail','https://mail.google.com/'];
  if(/^(icloud|me|mac)\./.test(d))return['iCloud','https://www.icloud.com/mail'];
  if(/^yahoo\./.test(d))return['Yahoo','https://mail.yahoo.com/'];
  return null;}
function _vbEsc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function _vbRender(){
  var b=document.getElementById('verify-banner');if(!b)return;var u=_me;
  if(!u||u.email_verified!==false){b.style.display='none';return;}
  var em=u.email||'',mp=_vbMail(em),hid=false;
  try{hid=(+sessionStorage.getItem('mnq_vb_hide')||0)>0;}catch(e){}
  b.className=''; // ما ينخفي: بدون التفعيل ما يقدر يقدّم/ينشر
  b.innerHTML='<div class="vb-full"><div class="vb-ic"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5l8.5 6 8.5-6"/></svg><i></i></div>'
   +'<div class="vb-b"><div class="vb-t">باقي خطوة: فعّل بريدك</div>'
   +'<div class="vb-s">'+(em?'أرسلنا رابط التفعيل إلى <b>'+_vbEsc(em)+'</b>':'أرسلنا رابط التفعيل إلى بريدك')+'</div>'
   +'<div class="vb-n">بدون التفعيل ما تقدر تقدّم عروض — اضغط الرابط في الإيميل أو اكتب الرمز</div>'
   +'<div class="vb-acts">'+(mp?'<a class="vb-btn vb-pri" href="'+mp[1]+'" target="_blank" rel="noopener">افتح '+mp[0]+' <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M7 17L17 7M8 7h9v9"/></svg></a>':'')
   +'<button class="vb-btn '+(mp?'vb-sec':'vb-pri')+'" id="verify-resend" onclick="resendVerify()">إعادة الإرسال</button>'
   +'<button class="vb-lnk" onclick="_vbChange()">البريد غلط؟ غيّره</button></div>'
   +'<div style="display:flex;gap:8px;margin-top:10px;max-width:360px"><input id="vb-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="عندك الرمز؟ اكتبه هنا" style="flex:1;min-width:0;border:1.5px solid #dbe5f5;border-radius:11px;padding:10px 12px;font-family:inherit;font-size:15px;font-weight:800;text-align:center;direction:ltr"><button class="vb-btn vb-pri" onclick="_evCode(\'vb-code\',this)">تأكيد</button></div></div></div>';
  b.style.display='block';_vbTick();
}
function _vbHide(){try{sessionStorage.setItem('mnq_vb_hide','1');}catch(e){}var b=document.getElementById('verify-banner');if(b)b.className='vb-min';}
function _vbShow(){try{sessionStorage.removeItem('mnq_vb_hide');}catch(e){}var b=document.getElementById('verify-banner');if(b)b.className='';gotoPage('profile');window.scrollTo({top:0,behavior:'smooth'});}
function _vbChange(){gotoPage('profile');var n=0;(function f(){var i=document.getElementById('p-email');if(i&&i.offsetParent){i.focus();try{i.select();}catch(e){}i.scrollIntoView({block:'center',behavior:'smooth'});return;}if(++n<40)setTimeout(f,100);})();}
function _vbTick(){var btn=document.getElementById('verify-resend');if(!btn)return;clearTimeout(_vbTm);var left=Math.ceil((_vbCd-Date.now())/1000);
  if(left>0){btn.disabled=true;btn.classList.add('ok');btn.textContent=left>55?'أرسلناه ✓':'إعادة الإرسال ('+left+')';_vbTm=setTimeout(_vbTick,1000);}
  else{btn.disabled=false;btn.classList.remove('ok');btn.textContent='إعادة الإرسال';}}
function resendVerify(){
  var btn=document.getElementById('verify-resend');if(!btn||Date.now()<_vbCd)return;
  btn.disabled=true;btn.textContent='...جاري الإرسال';
  _api('/api/auth/resend-verification',{method:'POST',body:JSON.stringify({})}).then(function(d){
    if(d&&d.ok){ if(d.already){var u=_me;if(u)u.email_verified=true;try{var lu=JSON.parse(localStorage.getItem('user')||'{}');lu.email_verified=true;localStorage.setItem('user',JSON.stringify(lu));}catch(e){}var bb=document.getElementById('verify-banner');if(bb)bb.style.display='none';showToast('بريدك مفعّل مسبقاً','success');return;}
      _vbCd=Date.now()+60000;_vbTick(); }
    else { btn.disabled=false;btn.textContent='إعادة الإرسال'; if(typeof showToast==='function')showToast((d&&d.message)||'تعذّر الإرسال','error'); }
  }).catch(function(){ btn.disabled=false;btn.textContent='إعادة الإرسال'; if(typeof showToast==='function')showToast('تعذّر الاتصال','error'); });
}
window.addEventListener('load',function(){try{_pvCheckVerify();}catch(e){}});
// ===== تحذيرات الإدارة على عروض المزوّد (أول ما تظهر تنحسب «شافه»، والتعديل يخفيها) =====
var _pvWarns=[];
function _pvWarnLoad(){
  _api('/api/provider/warnings').then(function(d){ _pvWarns=Array.isArray(d)?d:[]; _pvWarnRender(); }).catch(function(){});
}
function _pvWarnRender(){
  var b=document.getElementById('pvWarn'); if(!b)return;
  if(!_pvWarns.length){ b.style.display='none'; b.innerHTML=''; return; }
  var w=_pvWarns[0], more=_pvWarns.length-1, isEdit=w.kind==='edit';
  b.innerHTML='<div class="pw-card"><div class="pw-hd"><span class="pw-ic">'+(isEdit?'✏️':'⚠️')+'</span><div style="min-width:0"><b>'+(isEdit?'الإدارة طلبت تعديل عرضك':'تنبيه من الإدارة على عرضك')+'</b><small>على مشروع «'+_esc(w.request_title||'')+'» · '+(function(a){return a==='الآن'?a:'قبل '+a;})(_ago(w.created_at))+'</small></div></div>'
    +'<div class="pw-msg">'+_esc(w.reason||'')+'</div>'
    +(w.note?'<div class="pw-cur">عرضك الحالي: «'+_esc(w.note)+(w.note.length>=160?'…':'')+'»</div>':'')
    +'<div class="pw-acts"><button class="pw-pri" onclick="_pvWarnEdit('+w.bid_id+')">✏️ عدّل العرض الحين</button><button class="pw-sec" onclick="_pvWarnAck('+w.id+')">فهمت</button></div>'
    +(more>0?'<div class="pw-more">وعندك '+more+' '+(more===1?'تنبيه ثاني':'تنبيهات ثانية')+' — تطلع بعد هذا</div>':'')+'</div>';
  b.style.display='block';
}
async function _pvWarnEdit(bid){
  try{ if(!(_myBids||[]).some(function(x){return String(x.id)===String(bid);})){ var bs=await _api('/api/provider/bids'); if(Array.isArray(bs))_myBids=bs; } }catch(e){}
  if((_myBids||[]).some(function(x){return String(x.id)===String(bid);})) _editBidById(bid);
  else { gotoPage('works'); showToast('افتح العرض من «مشاريعي وعروضي» وعدّله','info'); }
}
function _pvWarnAck(id){
  _pvWarns=_pvWarns.filter(function(x){return x.id!==id;}); _pvWarnRender();
  _api('/api/provider/warnings/'+id+'/ack',{method:'POST',body:'{}'}).catch(function(){});
}
window.addEventListener('load',function(){ setTimeout(function(){ try{ if(localStorage.getItem('token'))_pvWarnLoad(); }catch(e){} },600); });
// زر «صفحتي» — يفتح الصفحة العامة للمزوّد في تبويب جديد
(function(){ try{ var u=JSON.parse(localStorage.getItem('user')||'{}'); if(u&&u.id)document.querySelectorAll('a.my-page-btn').forEach(function(a){a.href='/pro/'+u.id;}); }catch(e){} })();

if(!_token){location.replace('/auth.html');}else if(_me.role&&_me.role!=='provider'&&!(_me.role==='client'&&_me.can_provide)){location.replace(_me.role==='admin'?'/dashboard-admin.html':_me.role==='client'?'/dashboard-client.html':'/auth.html');}
// حارس ضد ذاكرة المتصفح (bfcache): لو رجع للصفحة بعد الخروج بدون توكن، حوّله للدخول
window.addEventListener('pageshow',function(){ if(!localStorage.getItem('token'))location.replace('/auth.html'); });
var _myId=_me.id||null;

(function(){
  var params=new URLSearchParams(location.search);
  var bidId=params.get('bid')||localStorage.getItem('mnq_auto_bid');
  var chatId=params.get('chat')||localStorage.getItem('mnq_auto_chat_req')||localStorage.getItem('open_chat_request');
  localStorage.removeItem('mnq_auto_bid');localStorage.removeItem('mnq_auto_chat_req');localStorage.removeItem('open_chat_request');
  if(params.get('bid')||params.get('chat')) history.replaceState(null,'',location.pathname);
  if(bidId){setTimeout(function(){ _openBidModal(bidId); },1000);return;}
  var directChatId=localStorage.getItem('mnq_open_chat_id');
  var directOtherId=localStorage.getItem('mnq_open_chat_other');
  if(directChatId){localStorage.removeItem('mnq_open_chat_id');localStorage.removeItem('mnq_open_chat_other');chatId=directChatId;}
  if(chatId){
    setTimeout(function(){
      location.href='/chat';
      setTimeout(function(){
        _api('/api/requests/'+chatId).then(function(req){
          if(req&&req.id){openChatRoom(String(req.id),String(req.client_id||directOtherId||''),req.client_name||'',req.title||'محادثة');}
          else{openChatRoom(String(chatId),String(directOtherId||''),'','محادثة مباشرة');}
        }).catch(function(){openChatRoom(String(chatId),String(directOtherId||''),'','محادثة مباشرة');});
      },600);
    },600);
  }
})();

function urlBase64ToUint8Array(base64String){
  var padding='='.repeat((4-base64String.length%4)%4);
  var base64=(base64String+padding).replace(/-/g,'+').replace(/_/g,'/');
  var rawData=window.atob(base64);
  var outputArray=new Uint8Array(rawData.length);
  for(var i=0;i<rawData.length;++i){outputArray[i]=rawData.charCodeAt(i);}
  return outputArray;
}
async function pushSubscribe(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)){showToast('متصفحك لا يدعم الإشعارات الفورية','error');return false;}
  try{
    var perm=await Notification.requestPermission();if(perm!=='granted'){showToast('يجب السماح بالإشعارات من إعدادات المتصفح','error');return false;}
    var reg=await navigator.serviceWorker.ready;
    var existing=await reg.pushManager.getSubscription();
    if(existing){await fetch(API+'/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_token},body:JSON.stringify({subscription:existing.toJSON()})});return true;}
    var keyResp=await fetch(API+'/api/push/vapid-public-key');
    var keyData=await keyResp.json();if(!keyData.publicKey)return false;
    var sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(keyData.publicKey)});
    var resp=await fetch(API+'/api/push/subscribe',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_token},body:JSON.stringify({subscription:sub.toJSON()})});
    var r=await resp.json();return r.ok===true;
  }catch(e){console.error('push subscribe error:',e);return false;}
}
async function pushUnsubscribe(){
  try{var reg=await navigator.serviceWorker.ready;var sub=await reg.pushManager.getSubscription();if(sub){var endpoint=sub.endpoint;await sub.unsubscribe();await fetch(API+'/api/push/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_token},body:JSON.stringify({endpoint:endpoint})});}return true;}
  catch(e){return false;}
}
async function isPushActive(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window))return false;
  try{if(Notification.permission!=='granted')return false;var reg=await navigator.serviceWorker.ready;var sub=await reg.pushManager.getSubscription();return !!sub;}catch(e){return false;}
}
function showPushBanner(){var b=document.getElementById('pushBanner');if(b)b.classList.add('show');}
function dismissPushBanner(){var b=document.getElementById('pushBanner');if(b)b.classList.remove('show');localStorage.setItem('manaqasa_push_dismissed_'+_me.id,Date.now());}
async function enablePushFromBanner(){
  var btn=document.querySelector('.push-banner-yes');if(btn){btn.disabled=true;btn.textContent='جاري التفعيل...';}
  var ok=await pushSubscribe();
  if(ok){var b=document.getElementById('pushBanner');if(b)b.classList.remove('show');localStorage.setItem('manaqasa_push_enabled_'+_me.id,'1');showToast('تم تفعيل الإشعارات بنجاح ✓','success');}
  else{if(btn){btn.disabled=false;btn.textContent='السماح بالإشعارات';}}
}
async function maybeShowPushBanner(){
  try{
    if(!('serviceWorker' in navigator)||!('PushManager' in window))return;
    if(!('Notification' in window))return;
    var active=await isPushActive();
    if(active){localStorage.setItem('manaqasa_push_enabled_'+_me.id,'1');return;}
    if(Notification.permission==='granted'){await pushSubscribe();return;}
    if(Notification.permission==='default'){var p=await Notification.requestPermission();if(p==='granted')await pushSubscribe();}
  }catch(e){}
}

function _rCatHit(r,specs){ if(specs.indexOf(r.category)>=0)return true; var x=r.extra_categories||[]; for(var i=0;i<x.length;i++){ if(specs.indexOf(x[i])>=0)return true; } return false; }
var CATS=['تبريد وتكييف','كهرباء','سباكة','نجارة','تنظيف','نقل عفش','حدادة','ألمنيوم','كلادينج وواجهات','مسابح','كاميرات مراقبة','شبكات وإنترنت','مظلات وسواتر','عزل حراري','مكافحة حشرات','بناء','جبس','كشف تسربات المياه','تنظيف خزانات','دهانات وديكور','تركيب مطابخ','تنسيق حدائق','زجاج ومرايا','بلاط ورخام','تركيب أثاث','أرضيات خشبية وباركيه','تنظيف سجاد وكنب','تركيب وصيانة مصاعد','أبواب وبوابات أوتوماتيكية','ترميم مبانٍ','تنظيف واجهات المباني','حفر آبار ومضخات','أنظمة الحريق والسلامة','تخطيط المواقف والسلامة المرورية','معدات ثقيلة','عوازل مائية','أنظمة شمسية','صيانة عامة','إنشاءات معدنية وهناجر','أعمال الطرق والأسفلت','صرف صحي وبيارات','أرضيات إيبوكسي','تحلية ومعالجة مياه','تشطيبات ومقاولات عامة','أخرى'];
// المصدر الموحّد: حدّث التخصصات من السيرفر (وأعد تعبئة قائمة الملف إن كانت مفتوحة)
fetch(API+'/api/categories').then(function(r){return r.json();}).then(function(d){
  if(d&&Array.isArray(d.categories)&&d.categories.length){
    CATS=d.categories;
    var sel=document.getElementById('pspec-sel');
    if(sel){ var cur=(window._provSpecSel||[]); sel.innerHTML='<option value="">أضف تخصصاً...</option>'+CATS.map(function(c){return '<option>'+c+'</option>';}).join(''); }
  }
}).catch(function(){});
var CITIES=['الرياض','الخرج','الدوادمي','المجمعة','القويعية','الزلفي','الدرعية','الدلم','المزاحمية','الحريق','حوطة بني تميم','وادي الدواسر','السليل','الأفلاج','الغاط','ثادق','حريملاء','مرات','ضرما','جدة','مكة المكرمة','الطائف','رابغ','القنفذة','الليث','خليص','تربة','المويه','الخرمة','رنية','المدينة المنورة','ينبع','العلا','الوجه','ضباء','أملج','المهد','بدر','خيبر','بريدة','عنيزة','الرس','البكيرية','الأسياح','رياض الخبراء','عيون الجواء','النبهانية','الشماسية','البدائع','المذنب','الخبراء','الدمام','الخبر','الظهران','الأحساء','القطيف','الجبيل','حفر الباطن','الخفجي','بقيق','النعيرية','رأس تنورة','صفوى','سيهات','العوامية','أبها','خميس مشيط','بيشة','النماص','محايل عسير','أحد رفيدة','سراة عبيدة','ظهران الجنوب','تثليث','بلقرن','رجال ألمع','المجاردة','الحرجة','تبوك','تيماء','قيال','حقل','حائل','بقعاء','الشنان','الغزالة','عرعر','طريف','رفحاء','سكاكا','دومة الجندل','القريات','الباحة','بلجرشي','المندق','العقيق','قلوة','المخواة','غامد الزناد','جازان','صبيا','أبو عريش','صامطة','الدرب','ضمد','أحد المسارحة','العارضة','الريث','الحرث','نجران','شرورة','شقراء','عفيف','ضرماء','رماح','ضرية','عقلة الصقور','الجموم','الكامل','أضم','بحرة','مهد الذهب','الحناكية','العيص','قرية العليا','تنومة','البدع','السليمي','موقق','الشملي','العويقيلة','بيش','فيفاء','حبونا','بدر الجنوب','يدمة','ثار','القرى','طبرجل','صوير'];

var _allProjs=[], _myBids=[], _myProjs=[], _pCache={};
var _curPage='home';
var _chatPolling=null, _chatReqId=null, _chatReceiverId=null, _chatMsgs=[];
var _provConvPolling=null;

var _dataCache={};
var _CACHE_TTL={home_data:45000,browse:30000,works:45000,reviews:120000,profile:120000,notifs:15000};
function _cacheGet(key){var c=_dataCache[key];var ttl=_CACHE_TTL[key]||60000;return(c&&Date.now()-c.t<ttl)?c.v:null;}
function _cacheSet(key,val){_dataCache[key]={v:val,t:Date.now()};}
function _cacheClear(key){if(key)delete _dataCache[key];else _dataCache={};}

function _el(id){return document.getElementById(id);}
function _esc(s){var d=document.createElement('div');d.textContent=String(s||'');return d.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// روابط المستخدم: نقبل http/https والمسارات الداخلية وصور data بس
function _safeUrl(u){u=String(u==null?'':u).trim();return /^(https?:\/\/|\/(?!\/)|data:image\/)/i.test(u)&&!/["'<>`\s]/.test(u)?u:'';}
function _jsa(s){return _esc(JSON.stringify(String(s==null?'':s)));}
function _fpr(p){return p?fmtN(p)+' ر.س':'—';}
function _fdt(d){if(!d)return'—';try{return new Date(d).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'short',year:'numeric'});}catch(e){return d;}}
function _ago(d){if(!d)return'';var diff=(Date.now()-new Date(d))/1000;if(diff<60)return 'الآن';if(diff<3600)return Math.floor(diff/60)+' د';if(diff<86400)return Math.floor(diff/3600)+' س';return Math.floor(diff/86400)+' يوم';}
function _stars(n){var s='';for(var i=1;i<=5;i++)s+='<span style="color:'+(i<=Math.round(n)?'#F0A500':'#e4e4e7')+';font-size:13px">&#9733;</span>';return s;}
function _empty(t,s){return '<div class="empty"><div class="empty-ic"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><h4>'+t+'</h4>'+(s?'<p>'+s+'</p>':'')+'</div>';}
var _supportNum=null;
function _waNorm(x){ var n=String(x||'').replace(/[^0-9]/g,''); if(!n)return ''; if(n.charAt(0)==='0')n='966'+n.slice(1); else if(n.slice(0,3)!=='966')n='966'+n; return n; }
function openSupport(e){ if(e&&e.preventDefault)e.preventDefault();
  if(_supportNum){ window.open('https://wa.me/'+_supportNum,'_blank'); return; }
  fetch(API+'/api/support-contact').then(function(r){return r.json();}).then(function(d){
    var n=_waNorm(d&&d.whatsapp); if(!n){ if(typeof showToast==='function')showToast('خدمة العملاء غير متاحة حالياً','error'); return; }
    _supportNum=n; window.open('https://wa.me/'+n,'_blank');
  }).catch(function(){ if(typeof showToast==='function')showToast('تعذّر الاتصال','error'); });
}
function doLogout(){
  try{
    Object.keys(localStorage).forEach(function(k){ if(k!=='theme')localStorage.removeItem(k); });
    if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage)window.ReactNativeWebView.postMessage(JSON.stringify({type:'AUTH_LOGOUT'}));
  }catch(e){}
  location.replace('/');
}

function _api(path,opts){
  var headers={'Authorization':'Bearer '+(localStorage.getItem('token')||_token||''),'Content-Type':'application/json'};
  function doFetch(){var fetchOpts=Object.assign({headers:headers,cache:'no-store'},opts||{});return fetch(API+path,fetchOpts).then(function(r){if(r.status===401){_sessionExpired();return null;}return r.json();}).catch(function(){return null;});}
  // نعيد المحاولة للـGET بس عشان ما يتكرر الإرسال/الحفظ
  var _m=String((opts&&opts.method)||'GET').toUpperCase();
  var req=doFetch().then(function(r){if(r!==null||_m!=='GET')return r;return new Promise(function(res){setTimeout(res,1000);}).then(doFetch);});
  var _big=opts&&typeof opts.body==='string'&&opts.body.length>100000;
  var timeout=new Promise(function(res){setTimeout(function(){res(null);},_big?60000:12000);});
  return Promise.race([req,timeout]);
}
// انتهاء الجلسة: يُعلم المزوّد ويوجّهه لتسجيل الدخول
var _sessionExpiredShown=false;
function _sessionExpired(){
  if(_sessionExpiredShown)return; _sessionExpiredShown=true;
  try{ if(typeof showToast==='function')showToast('انتهت جلستك — يرجى تسجيل الدخول من جديد','error'); }catch(e){}
  setTimeout(function(){ try{localStorage.removeItem('token');localStorage.removeItem('user');}catch(e){} location.href='/auth.html'; }, 1500);
}

var _lb={t:null,v:0,
  start:function(){clearTimeout(this.t);this.v=5;_el('lbar-wrap').className='on';this._set(5);this._run();},
  done:function(){clearTimeout(this.t);this._set(100);var self=this;setTimeout(function(){_el('lbar-wrap').className='';self._set(0);},400);},
  _set:function(v){_el('lbar').style.width=v+'%';},
  _run:function(){var self=this;if(self.v<90){self.v+=Math.random()*12+3;if(self.v>90)self.v=90;self._set(self.v);self.t=setTimeout(function(){self._run();},200+Math.random()*200);}}
};

var _tTimer;
function enableRequestRole(btn){
  if(!confirm('تفعيل نشر المشاريع؟ ستقدر تنشر مشاريعك وتستقبل عروضاً من نفس الحساب.'))return;
  btn.disabled=true; var _t=btn.textContent; btn.textContent='جارٍ التفعيل...';
  _api('/api/me/enable-request',{method:'POST',body:JSON.stringify({})}).then(function(r){
    if(r&&r.ok){ try{var _u=JSON.parse(localStorage.getItem('user')||'{}');_u.can_request=true;localStorage.setItem('user',JSON.stringify(_u));}catch(e){} showToast('تم التفعيل! تقدر تنشر مشاريع الآن','success'); setTimeout(function(){ location.href='/dashboard-client.html'; },900); }
    else { btn.disabled=false; btn.textContent=_t; showToast((r&&r.message)||'تعذّر التفعيل','error'); }
  }).catch(function(){ btn.disabled=false; btn.textContent=_t; showToast('تعذّر التفعيل','error'); });
}
function showToast(msg,type){
  var el=_el('toast'),ic=_el('tIc'),tm=_el('tMsg');if(!el)return;
  ic.textContent=type==='success'?'':type==='error'?'':'i';
  ic.style.background=type==='success'?'var(--green)':type==='error'?'var(--red)':'var(--p)';
  tm.textContent=msg;
  el.style.opacity='1';el.style.transform='translateX(-50%) translateY(0)';
  clearTimeout(_tTimer);
  _tTimer=setTimeout(function(){el.style.opacity='0';el.style.transform='translateX(-50%) translateY(14px)';},3200);
}

function openModal(title,body,foot){_el('mTit').textContent=title;_el('mBd').innerHTML=body;_el('mFt').innerHTML=foot||'';_el('ov').classList.add('show');}
function closeModal(){_el('ov').classList.remove('show');}
document.addEventListener('DOMContentLoaded',function(){
  _el('ov').addEventListener('click',function(e){if(e.target===this)closeModal();});
});

function _setAvatar(img){
  ['userAv','mobAv'].forEach(function(id){
    var el=_el(id);if(!el)return;
    if(img&&_safeUrl(img)){el.innerHTML='<img loading="lazy" src="'+_esc(_safeUrl(img))+'" style="width:100%;height:100%;object-fit:cover">';}
    else{el.innerHTML='';el.textContent=(_me.name||'م')[0];}
  });
}

(function(){
  var av=_el('userAv');if(av)av.textContent=(_me.name||'م')[0];
  var un=_el('userName');if(un)un.textContent=_me.name||'المزود';
  var ma=_el('mobAv');if(ma)ma.textContent=(_me.name||'م')[0];
  var cached=localStorage.getItem('pav_'+_me.id);if(cached)_setAvatar(cached);
  _api('/api/provider/profile').then(function(p){
    try{ if(p&&p.can_request){ var _sb=document.getElementById('switchDash'); if(_sb)_sb.style.display='flex'; } }catch(e){}
    try{ var _u=JSON.parse(localStorage.getItem('user')||'{}'); if(p){ _u.can_request=!!p.can_request; _u.can_provide=true; localStorage.setItem('user',JSON.stringify(_u)); } }catch(e){}
    if(p&&p.profile_image){localStorage.setItem('pav_'+_me.id,p.profile_image);_setAvatar(p.profile_image);}
  });
})();

var _pages={home:'الرئيسية',browse:'تصفح المشاريع',works:'مشاريعي وعروضي',reviews:'تقييماتي',notifs:'الإشعارات',profile:'الملف الشخصي',chat:'المحادثات',saai:'محفظة السعي'};

var _prefetchTimer={};
function prefetchPage(page){
  if(_cacheGet(page==='home'?'home_data':page))return;
  clearTimeout(_prefetchTimer[page]);
  _prefetchTimer[page]=setTimeout(function(){
    if(page==='browse')_api('/api/requests').then(function(d){if(d)_cacheSet('browse',d);});
    else if(page==='works')Promise.all([_api('/api/provider/bids'),_api('/api/provider/projects')]).then(function(r){var hc=_cacheGet('home_data')||{profile:{}};_cacheSet('home_data',{profile:hc.profile,bids:r[0]||[],projs:r[1]||[]});});
    else if(page==='notifs')_api('/api/notifications').then(function(d){if(d)_cacheSet('notifs',d);});
  },150);
}

function gotoPage(page){_lb.start();setTimeout(function(){_gotoPageInner(page);},30);}
function _gotoPageInner(page){
  document.querySelectorAll('.page').forEach(function(p){p.className='page';});
  var pg=_el('page-'+page);if(pg)pg.className='page on';
  document.querySelectorAll('.ni,.bni').forEach(function(b){b.classList.remove('on');});
  var ni=_el('ni-'+page);if(ni)ni.classList.add('on');
  var bn=_el('bn-'+page);if(bn)bn.classList.add('on');
  var pt=_el('pageTitle');if(pt)pt.textContent=_pages[page]||page;
  _curPage=page;
  sessionStorage.setItem('mnq_prov_page',page);
  // احفظ التنقّل في تاريخ المتصفّح → زر الرجوع يرجّع للقسم السابق داخل اللوحة
  if(!window._pSkipHash){
    var hash='#'+page;
    if(location.hash!==hash){
      if(window._pNavReplace){history.replaceState({pg:page},'',hash);window._pNavReplace=false;}
      else{history.pushState({pg:page},'',hash);}
    }
  }
  window.scrollTo(0,0);
  if(page==='home')loadHome();
  else if(page==='browse')loadBrowse();
  else if(page==='works')loadWorks();
  else if(page==='reviews')loadReviews();
  else if(page==='notifs')loadNotifs();
  else if(page==='profile')loadProfile();
  else if(page==='chat'){loadChat();}
  else if(page==='saai')loadSaai();
  if(page!=='chat'){clearInterval(_provConvPolling);}
}
// زر رجوع المتصفّح: يرجّع للقسم السابق داخل لوحة المزوّد بدل الخروج
window.addEventListener('popstate',function(){
  var h=(location.hash||'').replace('#','');
  var known=['home','browse','works','notifs','profile','chat','saai'];
  var target=known.indexOf(h)>=0?h:'home';
  window._pSkipHash=true; gotoPage(target); window._pSkipHash=false;
});

function _skRow(){return '<div class="sk-box" style="display:flex;gap:10px;align-items:center"><div style="width:4px;height:44px;border-radius:4px;background:#e6e2d9"></div><div style="flex:1"><div class="sk sk-line md" style="margin-bottom:7px"></div><div class="sk sk-line sm"></div></div><div class="sk sk-line" style="width:60px"></div></div>';}
function _skList(n){var h='<div class="card card-accent"><div class="sk sk-line" style="width:120px;margin-bottom:14px"></div>';for(var i=0;i<(n||4);i++)h+=_skRow();return h+'</div>';}

var _PROV_REGIONS={
  'الرياض':['الرياض','الخرج','الدوادمي','المجمعة','الزلفي','شقراء','القويعية','وادي الدواسر','الأفلاج','حوطة بني تميم','عفيف','الغاط','ثادق','حريملاء','ضرماء','المزاحمية','رماح','الدرعية','الدلم','الحريق','السليل','مرات','ضرما'],
  'القصيم':['بريدة','عنيزة','الرس','المذنب','البكيرية','البدائع','رياض الخبراء','عيون الجواء','الأسياح','النبهانية','الشماسية','ضرية','عقلة الصقور','الخبراء'],
  'مكة المكرمة':['مكة المكرمة','جدة','الطائف','رابغ','القنفذة','الليث','خليص','الجموم','الكامل','تربة','رنية','أضم','بحرة','المويه','الخرمة'],
  'المدينة المنورة':['المدينة المنورة','ينبع','العلا','بدر','مهد الذهب','خيبر','الحناكية','العيص','المهد'],
  'الشرقية':['الدمام','الخبر','الظهران','الأحساء','الجبيل','القطيف','حفر الباطن','الخفجي','رأس تنورة','بقيق','النعيرية','قرية العليا','صفوى','سيهات','العوامية'],
  'عسير':['أبها','خميس مشيط','بيشة','محايل عسير','النماص','تثليث','سراة عبيدة','رجال ألمع','ظهران الجنوب','تنومة','بلقرن','أحد رفيدة','المجاردة','الحرجة','قيال'],
  'تبوك':['تبوك','ضباء','الوجه','تيماء','حقل','أملج','البدع'],
  'حائل':['حائل','بقعاء','الغزالة','الشنان','السليمي','موقق','الشملي'],
  'الحدود الشمالية':['عرعر','رفحاء','طريف','العويقيلة'],
  'جازان':['جازان','صبيا','أبو عريش','صامطة','أحد المسارحة','بيش','فيفاء','ضمد','الدرب','العارضة','الريث','الحرث'],
  'نجران':['نجران','شرورة','حبونا','بدر الجنوب','يدمة','ثار'],
  'الباحة':['الباحة','بلجرشي','المندق','المخواة','قلوة','العقيق','القرى','غامد الزناد'],
  'الجوف':['سكاكا','دومة الجندل','القريات','طبرجل','صوير']
};
var _C2R={};for(var _rg in _PROV_REGIONS){_PROV_REGIONS[_rg].forEach(function(c){_C2R[c]=_rg;});}
function _sameRegionP(a,b){if(!a||!b)return false;var ra=_C2R[(''+a).trim()],rb=_C2R[(''+b).trim()];return !!ra&&ra===rb;}
function _isVerified(p){return !!(p&&p.profile_image&&p.bio&&(p.specialties||[]).length>0&&(parseFloat(p.avg_rating)||0)>0);}
function _renderHome(data){
  var pg=_el('page-home');if(!pg)return;
  var profile=data.profile||{},bids=data.bids||[],projs=data.projs||[],allReq=Array.isArray(data.requests)?data.requests:[];
  window._prof=profile;
  _myBids=Array.isArray(bids)?bids:[];_myProjs=Array.isArray(projs)?projs:[];
  var acc=_myBids.filter(function(b){return b.status==='accepted';}).length;
  var pend=_myBids.filter(function(b){return b.status==='pending';}).length;
  var prog=_myProjs.filter(function(p){return p.status==='in_progress';}).length;
  var done=_myProjs.filter(function(p){return p.status==='completed';}).length;
  var rat=(profile&&profile.avg_rating)?Number(profile.avg_rating).toFixed(1):'—';
  var verified=_isVerified(profile);
  var acceptRate=_myBids.length?Math.round((acc/_myBids.length)*100):0;
  var specs=profile.specialties||[];
  var _servesAll=!!profile.serves_all_cities;
  var _svc=Array.isArray(profile.service_cities)?profile.service_cities:[];
  var _myCity=profile.city||'';
  function _inMyArea(city){
    if(_servesAll)return true;
    if(!city)return false;
    if(_myCity&&city===_myCity)return true;
    if(_svc.indexOf(city)>=0)return true;
    if(_sameRegionP(_myCity,city))return true;
    if(_svc.some(function(c){return _sameRegionP(c,city);}))return true;
    return false;
  }
  var _bidIds={};_myBids.forEach(function(b){_bidIds[b.request_id]=1;});
  var openAll=allReq.filter(function(r){return r&&r.status==='open'&&!_bidIds[r.id];});
  var matches=specs.length?openAll.filter(function(r){return _rCatHit(r,specs)&&_inMyArea(r.city);}):[];
  var matchedBySpec=matches.length>0;
  var pool=matchedBySpec?matches:openAll;
  var featured=pool.slice().sort(function(a,b){var ba=parseInt(a.bid_count||0),bb=parseInt(b.bid_count||0);if(ba!==bb)return ba-bb;return new Date(b.created_at||0)-new Date(a.created_at||0);})[0]||null;
  var newCount=pool.length;
  var avHtml=(profile&&_safeUrl(profile.profile_image))?'<img loading="lazy" src="'+_esc(_safeUrl(profile.profile_image))+'" style="width:100%;height:100%;object-fit:cover">':'<span style="font-size:20px;font-weight:900;color:#fff">'+_esc((_me.name||'م')[0])+'</span>';
  var firstName=String(_me.name||'المزود').split(' ')[0];
  var html='<div id="ph-invites"></div>';

  // ── الرئيسية الجديدة ──
  var _lowComp=pool.filter(function(r){return (parseInt(r.bid_count)||0)<=1;}).length;
  var _now=new Date();
  var _monthBids=_myBids.filter(function(b){var d=new Date(b.created_at);return d.getFullYear()===_now.getFullYear()&&d.getMonth()===_now.getMonth();}).length;
  var _accVal=_myBids.filter(function(b){return b.status==='accepted';}).reduce(function(a,b){return a+(parseFloat(b.price)||0);},0);
  function _pl(n,a){n=parseInt(n)||0;if(n===1)return a[0];if(n===2)return a[1];if(n<=10)return n+' '+a[2];return n+' '+a[3];}
  var _PRJ=['مشروع جديد','مشروعان جديدان','مشاريع جديدة','مشروعاً جديداً'];
  html+='<div class="hh-hero">'
    +'<div class="hh-top"><div class="ph-av hh-av">'+avHtml.replace('color:#fff','color:#1e3a8a')+'</div>'
      +'<div style="min-width:0"><div class="hh-greet">أهلاً، '+_esc(firstName)+'</div><div class="hh-hi">'+_esc(profile.business_name||_me.name||'')+' '+_tierBadge(profile.tier)+_pubBadge(profile.badge)+'</div></div>'
      +'<span class="hh-rate"><span style="color:#F0A500">★</span>'+rat+'</span></div>'
    +'<div class="hh-hl">'+(newCount>0?(_pl(newCount,_PRJ)+(matchedBySpec?' تناسب تخصصك':' متاحة الآن')):'لا مشاريع جديدة الآن')+'</div>'
    +'<div class="hh-sub">'+(newCount>0?(matchedBySpec?'في مدينتك والمدن اللي تخدمها':'أضف تخصصاتك ليظهر لك الأنسب')+(_lowComp>0?' · '+_lowComp+' منها قليلة المنافسة':''):'تجيك إشعارات أول ما ينزل مشروع في تخصصك')+'</div>'
    +'<div class="hh-acts"><button class="hh-b1" onclick="gotoPage(&quot;browse&quot;)">تصفّح المشاريع</button><button class="hh-b2" onclick="gotoPage(&quot;works&quot;)">عروضي'+(pend?' ('+pend+')':'')+'</button></div>'
  +'</div>';
  html+='<div class="hh-kpi">'
    +'<div><div class="hh-n">'+_monthBids+'</div><div class="hh-l">عروض هذا الشهر</div></div>'
    +'<div><div class="hh-n g">'+(_myBids.length?acceptRate+'%':'—')+'</div><div class="hh-l">نسبة القبول</div></div>'
    +'<div><div class="hh-n">'+(_accVal?fmtN(_accVal):'0')+'</div><div class="hh-l">ر.س أعمال مقبولة</div></div>'
  +'</div>';
  html+='<div id="ph-qa-nudge"></div>';
  html+='<div class="nudges" id="ph-nudges"></div>';

  // المستوى
  var _tiers=[{n:'مزود جديد',s:'جديد',m:0},{n:'مزود نشط',s:'نشط',m:3},{n:'مزود مميّز',s:'مميّز',m:10},{n:'خبير معتمد',s:'خبير معتمد',m:25}];
  var _ci=0;for(var _ti=0;_ti<_tiers.length;_ti++){if(done>=_tiers[_ti].m)_ci=_ti;}
  var _next=_tiers[_ci+1]||null;
  var _lvlNote=_next?(function(r){return (r===1?'صفقة واحدة':r===2?'صفقتان':r+' صفقات')+' للمستوى التالي';})(_next.m-done):'أعلى مستوى 🏅';
  html+='<div class="hh-lvl"><div class="hh-lvl-h">مستواك: '+_tiers[_ci].n+'<span>'+_lvlNote+'</span></div>'
    +'<div class="hh-lvl-bar">'+_tiers.map(function(t,k){return '<i class="'+(k<=_ci?'on':(k===_ci+1?'cur':''))+'"></i>';}).join('')+'</div>'
    +'<div class="hh-lvl-l">'+_tiers.map(function(t,k){return '<span'+(k===_ci?' class="on"':'')+'>'+t.s+'</span>';}).join('')+'</div></div>';

  // اكتمال الملف
  var _pcItems=[
    {l:'الصورة الشخصية',d:!!profile.profile_image},
    {l:'التخصصات',d:(profile.specialties||[]).length>0},
    {l:'نبذة عنك',d:!!profile.bio},
    {l:'صور أعمالك',d:(profile.portfolio_images||[]).length>0},
    {l:'سنوات الخبرة',d:!!profile.experience_years}
  ];
  var _pcPct=Math.round(_pcItems.filter(function(x){return x.d;}).length/_pcItems.length*100);
  if(_pcPct<100){
    html+='<div class="hh-pc" onclick="gotoPage(&quot;profile&quot;)">'
      +'<div class="hh-ring" style="background:conic-gradient(#f5a524 '+_pcPct+'%,#fde9c4 0)"><span>'+_pcPct+'%</span></div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:900;color:var(--text)">أكمل ملفك يزيد قبول عروضك</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px">'+_pcItems.filter(function(x){return !x.d;}).map(function(x){return '<span class="hh-pc-chip">+ '+x.l+'</span>';}).join('')+'</div></div></div>';
  }

  // فرص تناسبك
  var _listPool=pool.slice().sort(function(a,b){var ba=parseInt(a.bid_count||0),bb=parseInt(b.bid_count||0);if(ba!==bb)return ba-bb;return new Date(b.created_at||0)-new Date(a.created_at||0);}).slice(0,6);
  html+='<div class="hh-sec"><h3>'+(matchedBySpec?'فرص تناسبك':'أحدث المشاريع المتاحة')+'</h3><button class="ch-link" onclick="gotoPage(&quot;browse&quot;)">عرض الكل</button></div>';
  if(_listPool.length){
    var f=_listPool[0],fbc=parseInt(f.bid_count)||0,fnew=(Date.now()-new Date(f.created_at))<86400000;
    var fimg=f.thumbnail||f.image_url||(f.images&&f.images[0])||null;
    var fsaved=window._savedIds&&window._savedIds.indexOf(f.id)>=0;
    html+='<div class="hh-op">'
      +'<div class="hh-row" style="cursor:pointer" onclick="_viewProj('+f.id+')"><div class="hh-ic">'+(_safeUrl(fimg)?'<img loading="lazy" src="'+_esc(_safeUrl(fimg))+'" alt="">':catSvg(f.category,24))+'</div>'
      +'<div class="hh-body"><div class="hh-chips">'+(fbc<=1?'<span class="hh-pill open">قليل المنافسة</span>':'')+(fnew?'<span class="hh-pill prog">جديد</span>':'')+'</div>'
      +'<div class="hh-t">'+_esc(f.title||'')+'</div>'
      +'<div class="hh-note">'+[f.city?_esc(f.city):'',timeAgoP(f.created_at),_arN(fbc,'b')].filter(Boolean).join(' · ')+'</div></div></div>'
      +'<div style="display:flex;gap:8px"><button class="hh-cta" style="flex:1" onclick="openBidFormDirectly('+f.id+')">قدّم عرضك</button>'
      +'<button class="hh-save'+(fsaved?' on':'')+'" title="'+(fsaved?'محفوظ':'حفظ للاحقاً')+'" aria-label="حفظ" onclick="_toggleSave('+f.id+',this)"><svg width="18" height="18" viewBox="0 0 24 24" fill="'+(fsaved?'currentColor':'none')+'" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></button></div>'+_CTL
    +'</div>';
    if(_listPool.length>1) html+=_renderBrowseList(_listPool.slice(1,5));
  }else{
    html+='<div class="hh-op" style="text-align:center;align-items:center;padding:24px 14px"><div style="font-size:13.5px;font-weight:800;color:var(--text)">ما فيه مشاريع جديدة الآن</div><div class="hh-note">'+(matchedBySpec?'تجيك إشعارات بالمشاريع الجديدة في تخصصك':'تابع لاحقاً أو وسّع تخصصاتك من ملفك')+'</div><button class="hh-cta" style="padding:10px 20px" onclick="gotoPage(&quot;browse&quot;)">تصفّح كل المشاريع</button></div>';
  }

  var lastBump=profile.last_bumped_at;
  var _savedPool=(allReq||[]).filter(function(r){return r&&r.status==='open'&&window._savedIds&&window._savedIds.indexOf(r.id)>=0;});
  if(_savedPool.length){
    html+='<div class="hh-sec"><h3>🔖 محفوظاتي</h3><button class="ch-link" onclick="_gotoSaved()">عرض الكل</button></div>';
    html+=_renderBrowseList(_savedPool.slice(0,4));
  }

  // آخر عروضي
  html+='<div class="hh-sec"><h3>آخر عروضي</h3><button class="ch-link" onclick="gotoPage(&quot;works&quot;)">متابعة الكل</button></div>';
  if(_myBids.length){
    html+='<div class="hh-bl">';
    _myBids.slice(0,5).forEach(function(b){
      var pc=b.status==='accepted'?'open':b.status==='rejected'?'done':'rev';
      var pl=b.status==='accepted'?'مقبول':b.status==='rejected'?'غير مختار':'قيد المراجعة';
      html+='<div class="hh-bi" onclick="gotoPage(&quot;works&quot;)"><div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:800;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_esc(b.request_title||'—')+'</div><div class="hh-note" style="font-size:11.5px">'+_fpr(b.price)+' · '+timeAgoP(b.created_at)+'</div></div><span class="hh-pill '+pc+'">'+pl+'</span></div>';
    });
    html+='</div>';
  }else{html+=_empty('لا يوجد عروض بعد','ابدأ بتصفح المشاريع');}

  html+='<div id="ph-sharecard"></div>';

  pg.innerHTML=html;_lb.done();_loadNotifCount();_loadChatBadge();
  _renderInvites();
  _renderProvNudges(_myBids,pool,matchedBySpec);
  _renderProvAnswerNudge();
  _profileNudge(profile);
  _renderShareCard(profile);
}

var _pnudgeTimer=null;
function _renderShareCard(profile){
  // مختصرة: سطر «رفع ترتيبك» فقط — المشاركة والـQR موجودة في الزر الذهبي «صفحتي» وصفحته العامة
  try{
    var slot=document.getElementById('ph-sharecard');if(!slot)return;
    var lastBump=profile&&profile.last_bumped_at;
    var hoursLeft=lastBump?Math.max(0,24-Math.floor((Date.now()-new Date(lastBump))/3600000)):0;
    var up='<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    slot.innerHTML='<div class="bump-row'+(hoursLeft>0?' wait':'')+'"><span class="bump-ic">'+up+'</span><div style="flex:1;min-width:0"><b>رفع ترتيبك في القائمة</b><small>'+(hoursLeft>0?'متاح مرة ثانية بعد '+hoursLeft+' ساعة':'تصدّر أمام العملاء — مرة كل 24 ساعة')+'</small></div>'
      +(hoursLeft>0?'':'<button type="button" onclick="_doBump()">ارفعني</button>')+'</div>';
  }catch(e){}
}
function _shareMyPage(url){
  var ref=url+(url.indexOf('?')>-1?'&':'?')+'ref=pro'+url.split('/pro/')[1];
  var msgText='✨ صفحتي على منصة مناقصة\nشوف أعمالي وتقييماتي وتواصل معي مباشرة:';
  var msg=msgText+'\n'+ref;
  if(navigator.share){
    navigator.share({title:'مناقصة',text:msgText,url:ref}).catch(function(){ _copyText(msg); });
  } else { _copyText(msg); }
}
// نسخ موثوق: يجرّب الطريقة الحديثة ثم البديل القديم (يعمل في كل الحالات)
function _copyText(txt){
  function ok(){ if(typeof showToast==='function')showToast('تم نسخ رابط المشاركة ✓','success'); }
  function fail(){
    // آخر بديل: أظهر الرابط ليتم نسخه يدوياً
    try{ prompt('انسخ الرابط:', txt); }catch(e){ if(typeof showToast==='function')showToast('تعذّر النسخ — انسخ الرابط يدوياً','error'); }
  }
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(txt).then(ok).catch(function(){ _legacyCopy(txt)?ok():fail(); });
  } else {
    _legacyCopy(txt)?ok():fail();
  }
}
function _legacyCopy(txt){
  try{
    var ta=document.createElement('textarea');
    ta.value=txt; ta.setAttribute('readonly','');
    ta.style.cssText='position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0,999999);
    var done=document.execCommand('copy');
    document.body.removeChild(ta);
    return done;
  }catch(e){ return false; }
}
function _showMyQR(url){
  var ref=url+(url.indexOf('?')>-1?'&':'?')+'ref=pro'+url.split('/pro/')[1];
  var q='https://api.qrserver.com/v1/create-qr-code/?size=240x240&data='+encodeURIComponent(ref);
  var ov=document.createElement('div');ov.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.6);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Tajawal,sans-serif';
  ov.innerHTML='<div style="background:#fff;border-radius:20px;padding:24px;text-align:center;max-width:300px"><div style="font-weight:900;color:#1e3a8a;font-size:16px;margin-bottom:14px;font-family:Cairo,sans-serif">رمز صفحتك</div><img loading="lazy" src="'+q+'" style="width:220px;height:220px;border-radius:12px" alt="QR"/><div style="font-size:11.5px;color:#64748b;margin:12px 0 14px;line-height:1.6">امسح الرمز للوصول لصفحتك — ضعه في كرت عملك أو حساباتك</div><button onclick="this.closest(\'div\').parentNode.remove()" style="width:100%;background:#2563eb;color:#fff;border:none;padding:11px;border-radius:11px;font-weight:800;font-family:Tajawal;cursor:pointer">إغلاق</button></div>';
  ov.onclick=function(e){if(e.target===ov)ov.remove();};
  document.body.appendChild(ov);
}
function _profileNudge(profile){
  try{
    if(_pnudgeTimer){clearTimeout(_pnudgeTimer);_pnudgeTimer=null;}
    var ex=document.getElementById('pnudge-ov'); if(ex)ex.remove();
    if(!profile)return;
    var items=[
      {l:'الصورة الشخصية',d:!!profile.profile_image},
      {l:'التخصصات',d:(profile.specialties||[]).length>0},
      {l:'نبذة عنك',d:!!profile.bio},
      {l:'صور أعمالك',d:(profile.portfolio_images||[]).length>0},
      {l:'سنوات الخبرة',d:!!profile.experience_years}
    ];
    var done=items.filter(function(x){return x.d;}).length;
    var pct=Math.round(done/items.length*100);
    if(pct>=100)return;
    var until=parseInt(localStorage.getItem('pnudge_until')||'0');
    if(Date.now()<until)return;
    var miss=items.filter(function(x){return !x.d;}).slice(0,3).map(function(x){return x.l;}).join(' · ');
    fetch(API+'/api/nudge-config',{cache:'no-store'}).then(function(r){return r.ok?r.json():{};}).catch(function(){return {};}).then(function(cfg){
      var delay=(parseInt(cfg&&cfg.delaySec)||20)*1000;
      var snooze=(parseInt(cfg&&cfg.snoozeDays)||3);
      _pnudgeTimer=setTimeout(function(){ _showPnudge(pct,miss,snooze); }, delay);
    });
  }catch(e){}
}
function _showPnudge(pct,miss,snoozeDays){
  if(document.getElementById('pnudge-ov'))return;
  var ov=document.createElement('div');ov.id='pnudge-ov';
  ov.style.cssText='position:fixed;inset:0;z-index:9998;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Tajawal,sans-serif';
  ov.innerHTML='<div style="background:#fff;border-radius:22px;max-width:340px;width:100%;padding:26px 22px;text-align:center;box-shadow:0 20px 50px rgba(15,23,42,.3);position:relative">'
    +'<button id="pnudge-x" style="position:absolute;top:12px;left:12px;background:#f1f5f9;border:none;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:17px;color:#64748b;line-height:1">×</button>'
    +'<div style="width:70px;height:70px;border-radius:20px;margin:4px auto 14px;background:linear-gradient(145deg,#2563eb,#172554);display:flex;align-items:center;justify-content:center;font-size:32px">📋</div>'
    +'<div style="font-family:Cairo,sans-serif;font-weight:900;font-size:19px;color:#1e3a8a;margin-bottom:6px">أكمل ملفك التعريفي</div>'
    +'<div style="font-size:13px;color:#64748b;line-height:1.7;margin-bottom:16px">المزوّدون بملفات مكتملة يحصلون على <b style="color:#0ea5e9">فرص وعروض أكثر</b>. ملفك مكتمل '+pct+'% فقط.</div>'
    +'<div style="background:#e5edff;border-radius:100px;height:10px;overflow:hidden;margin-bottom:8px"><div style="width:'+pct+'%;height:100%;background:linear-gradient(90deg,#2563eb,#0ea5e9)"></div></div>'
    +'<div style="font-size:12px;color:#64748b;margin-bottom:18px">ينقصك: '+_esc(miss)+'</div>'
    +'<button id="pnudge-go" style="width:100%;background:linear-gradient(135deg,#2563eb,#1e3a8a);color:#fff;border:none;padding:13px;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:Tajawal,sans-serif;margin-bottom:8px">أكمل ملفي الآن</button>'
    +'<button id="pnudge-later" style="width:100%;background:transparent;border:none;color:#94a3b8;font-size:12.5px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif;padding:4px">لاحقاً</button>'
    +'</div>';
  document.body.appendChild(ov);
  function snooze(){try{localStorage.setItem('pnudge_until',String(Date.now()+(snoozeDays||3)*86400000));}catch(e){}ov.remove();}
  document.getElementById('pnudge-x').onclick=snooze;
  document.getElementById('pnudge-later').onclick=snooze;
  document.getElementById('pnudge-go').onclick=function(){ov.remove();if(typeof gotoPage==='function')gotoPage('profile');};
  ov.onclick=function(e){if(e.target===ov)snooze();};
}

// شريط النبيهات الذكية للمزود — مستنتج من عروضه وفرصه ورسائله
function _renderProvNudges(bids,pool,matchedBySpec){
  var slot=_el('ph-nudges');if(!slot)return;
  bids=bids||[];pool=pool||[];
  var accepted=bids.filter(function(b){return b.status==='accepted';});
  var newMatch=pool.length;
  var chev='<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>';
  var reqItems=[];
  accepted.slice(0,2).forEach(function(b){
    reqItems.push('<div class="nudge" style="border-right-color:var(--green)" onclick="_viewProj('+b.request_id+')">'
      +'<div class="nudge-ic" style="background:var(--green-l);color:var(--green)"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>'
      +'<div class="nudge-body"><div class="nudge-t">تم قبول عرضك</div><div class="nudge-s">'+_esc(b.request_title||'مشروع')+' — تواصل مع العميل وابدأ التنفيذ</div></div>'
      +'<div class="nudge-cta">فتح '+chev+'</div></div>');
  });
  function paint(msgItem){
    var items=(msgItem?[msgItem]:[]).concat(reqItems).slice(0,3);
    slot.innerHTML=items.length
      ?'<div class="nudges-h"><svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="vertical-align:-2px"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg> يحتاج إجراء منك</div>'+items.join('')
      :'';
  }
  _api('/api/provider/conversations').then(function(convs){
    convs=Array.isArray(convs)?convs:[];
    var unread=convs.reduce(function(a,c){return a+(parseInt(c.unread)||0);},0);
    var msgItem=unread>0?('<div class="nudge" style="border-right-color:var(--sky)" onclick="gotoPage(\'chat\')">'
      +'<div class="nudge-ic" style="background:#e0f2fe;color:var(--sky)"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>'
      +'<div class="nudge-body"><div class="nudge-t">لديك '+unread+' '+(unread===1?'رسالة غير مقروءة':'رسائل غير مقروءة')+'</div><div class="nudge-s">من العملاء — افتح المحادثات للرد</div></div>'
      +'<div class="nudge-cta">المحادثات '+chev+'</div></div>'):null;
    paint(msgItem);
  }).catch(function(){paint(null);});
}

async function _doBump(){
  var btn=document.querySelector('[onclick="_doBump()"]');if(btn){btn.disabled=true;btn.textContent='جاري التحديث...';}
  var r=await _api('/api/provider/bump',{method:'PUT'});
  if(r&&r.ok){showToast('تم تحديث موقعك — أنت الآن في الأعلى','success');var cached=_cacheGet('home_data');if(cached&&cached.profile)cached.profile.last_bumped_at=new Date().toISOString();loadHome();}
  else{showToast(r&&r.message?r.message:'تعذر التحديث','error');if(btn){btn.disabled=false;btn.innerHTML='تحديث <svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';}}
}

async function loadHome(){
  var pg=_el('page-home');if(!pg)return;
  _loadInvites();
  var cached=_cacheGet('home_data');if(cached){_renderHome(cached);}else{pg.innerHTML=_skList(4);}
  try{
    var r=await Promise.all([_api('/api/provider/profile'),_api('/api/provider/bids'),_api('/api/provider/projects'),_api('/api/requests'),_api('/api/saved-requests/ids')]);
    window._savedIds=Array.isArray(r[4])?r[4]:[];
    var fresh={profile:r[0]||{},bids:r[1]||[],projs:r[2]||[],requests:Array.isArray(r[3])?r[3]:[]};
    _cacheSet('home_data',fresh);
    var _sg=''; try{_sg=JSON.stringify(fresh).length+':'+((fresh.bids||[]).length);}catch(e){}
    if(_sg && _sg===window._provHomeSig && cached) return;   // لا تغيير → لا إعادة رسم
    window._provHomeSig=_sg;
    _renderHome(fresh);
  }catch(e){}
}

function openBidFormDirectly(reqId){_openBidModal(reqId);}
var _CTL='<div style="display:flex;gap:6px;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#15803d;margin-top:8px;line-height:1.6">📞 بعد عرضك يظهر لك رقم العميل وتكلّمه واتساب مباشرة</div>';

// المشاريع الموجّهة لي بالاسم — بطاقة مميزة أعلى الرئيسية (تفشل بصمت)
window._provInvites=[];
function _loadInvites(){
  _api('/api/provider/invites').then(function(d){ window._provInvites=Array.isArray(d)?d:[]; _renderInvites(); }).catch(function(){});
}
function _invLeft(sec){
  sec=parseInt(sec)||0;
  if(sec<3600){ var m=Math.max(1,Math.ceil(sec/60)); return m+' دقيقة'; }
  return Math.ceil(sec/3600)+' ساعة';
}
function _renderInvites(){
  var box=_el('ph-invites'); if(!box) return;
  var arr=window._provInvites||[], h='';
  arr.forEach(function(x){
    if(!x||!x.id) return;
    var id=parseInt(x.id)||0; if(!id) return;
    if(x.invite_state==='exclusive' && !x.has_bid){
      var meta=[x.category,x.city].filter(Boolean).map(_esc).join(' · ');
      h+='<div style="background:linear-gradient(135deg,#fffbeb,#fff);border:2px solid #f59e0b;border-radius:18px;padding:16px;margin-bottom:14px;box-shadow:0 6px 18px rgba(245,158,11,.15)">'
        +'<span style="display:inline-block;font-size:11.5px;font-weight:900;padding:4px 11px;border-radius:999px;background:#fef3c7;color:#92400e">⭐ مشروع طلبك أنت بالاسم</span>'
        +'<div style="font-family:Cairo,sans-serif;font-weight:900;font-size:16px;color:#14223d;margin-top:9px;line-height:1.5">'+_esc(x.title||'مشروع')+'</div>'
        +(meta?'<div style="font-size:12.5px;color:#5b6b85;font-weight:700;margin-top:2px">'+meta+'</div>':'')
        +'<div style="font-size:13px;color:#334766;font-weight:700;line-height:1.8;margin-top:8px">العميل اختارك من صفحتك. المشروع لك وحدك الحين — ينفتح لباقي المزوّدين بعد '+_invLeft(x.left_sec)+' لو ما قدّمت.</div>'
        +'<button onclick="openBidFormDirectly('+id+')" style="width:100%;margin-top:12px;background:#1d4ed8;color:#fff;border:none;border-radius:13px;padding:13px;min-height:46px;font-family:Tajawal,sans-serif;font-weight:800;font-size:14.5px;cursor:pointer">قدّم عرضك الآن</button>'+_CTL
        +'</div>';
    } else if(x.has_bid){
      h+='<div onclick="_viewProj('+id+')" style="cursor:pointer;background:#fff;border:1px solid #e1e9f6;border-radius:12px;padding:10px 13px;margin-bottom:10px;font-size:12.5px;font-weight:700;color:#5b6b85">⭐ قدّمت على مشروع موجّه لك: <b style="color:#14223d">'+_esc(x.title||'مشروع')+'</b></div>';
    }
  });
  box.innerHTML=h;
}

async function loadBrowse(){
  var pg=_el('page-browse');if(!pg)return;
  if(!Array.isArray(_allProjs)||_allProjs.length===0){pg.innerHTML='<div class="pghd"><div class="pg-t">تصفح المشاريع</div></div>'+_skList(5);}
  var failed=false;
  try{var fresh=await _api('/api/requests');if(fresh===null){failed=true;}else{_allProjs=Array.isArray(fresh)?fresh:[];}}catch(e){failed=true;}
  if(!window._prof||!window._prof.city){ try{ var _p=await _api('/api/provider/profile'); if(_p&&_p.id)window._prof=_p; }catch(e){} }
  try{ await _loadSavedIds(); }catch(e){}
  // فشل شبكة حقيقي + لا بيانات مخزّنة → زر إعادة محاولة (بدل حالة فاضية مضلّلة)
  if(failed && (!Array.isArray(_allProjs)||_allProjs.length===0)){
    pg.innerHTML='<div class="pghd"><div class="pg-t">تصفح المشاريع</div></div><div style="text-align:center;padding:40px 20px"><div style="font-size:15px;font-weight:800;color:var(--red);margin-bottom:6px">تعذّر التحميل</div><div style="font-size:12.5px;color:var(--muted);margin-bottom:14px">تحقّق من اتصالك بالإنترنت</div><button onclick="loadBrowse()" style="background:var(--p3);color:#fff;border:none;padding:10px 24px;border-radius:9px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>حاول مرة ثانية</button></div>';
    return;
  }
  _renderBrowse();
}
function _renderBrowse(){
  try{
    var pg=_el('page-browse');if(!pg)return;if(!Array.isArray(_allProjs))_allProjs=[];
    var open=_allProjs.filter(function(p){return p&&p.status==='open';});
    var nb=_el('nb-open');if(nb){nb.style.display=open.length?'':'none';nb.textContent=open.length;}
    var html='<div class="pghd"><div class="pg-t">تصفح المشاريع</div><div class="pg-s">'+open.length+' مشروع متاح</div></div>';
    html+='<div class="card card-accent">';
    html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">';
    html+='<div style="flex:1;min-width:160px;display:flex;align-items:center;gap:7px;background:var(--bg);border:1px solid var(--border);border-radius:9px;padding:0 12px"><svg width="13" height="13" fill="none" stroke="var(--muted)" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><input type="text" id="bQ" placeholder="ابحث..." oninput="_filterBrowse()" style="border:none;background:transparent;font-size:12px;padding:8px 0;flex:1;outline:none;font-family:Tajawal,sans-serif"></div>';
    html+='<select id="bCat" onchange="_filterBrowse()" style="padding:8px 11px;border:1px solid var(--border);border-radius:9px;font-size:11px;font-weight:600;background:var(--bg);color:var(--p);cursor:pointer;font-family:Tajawal,sans-serif;outline:none"><option value="">كل التصنيفات</option></select>';
    html+='<select id="bCit" onchange="_filterBrowse()" style="padding:8px 11px;border:1px solid var(--border);border-radius:9px;font-size:11px;font-weight:600;background:var(--bg);color:var(--p);cursor:pointer;font-family:Tajawal,sans-serif;outline:none"><option value="">كل المدن</option></select>';
    html+='<select id="bSort" onchange="_filterBrowse()" style="padding:8px 11px;border:1px solid var(--border);border-radius:9px;font-size:11px;font-weight:600;background:var(--bg);color:var(--p);cursor:pointer;font-family:Tajawal,sans-serif;outline:none"><option value="new">الأحدث</option><option value="old">الأقدم</option><option value="budget">الأعلى ميزانية</option></select>';
    html+='<button id="bSmart" onclick="_toggleSmart()" style="padding:8px 14px;border:1.5px solid #c7d2fe;border-radius:9px;font-size:11.5px;font-weight:800;background:#eef2ff;color:#4338ca;cursor:pointer;font-family:Tajawal,sans-serif;white-space:nowrap;transition:all .15s">✨ الأنسب لي</button>';
    html+='<button id="bSaved" onclick="_toggleSavedFilter()" style="padding:8px 14px;border:1.5px solid #c7d2fe;border-radius:9px;font-size:11.5px;font-weight:800;background:#eef2ff;color:#4338ca;cursor:pointer;font-family:Tajawal,sans-serif;white-space:nowrap;transition:all .15s">🔖 المحفوظة</button>';
    html+='</div><div id="bList">'+_renderBrowseList(open)+'</div></div>';
    pg.innerHTML=html;
    var catSel=_el('bCat');CATS.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;catSel.appendChild(o);});
    var citSel=_el('bCit');CITIES.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;citSel.appendChild(o);});
    _lb.done();
  }catch(e){console.error('_renderBrowse error:',e);_lb.done();}
}
window._savedIds=window._savedIds||[];
var _savedOn=false;
function _loadSavedIds(){ return _api('/api/saved-requests/ids').then(function(ids){window._savedIds=Array.isArray(ids)?ids:[];}).catch(function(){}); }
function _gotoSaved(){ gotoPage('browse'); setTimeout(function(){ if(!_savedOn&&typeof _toggleSavedFilter==='function')_toggleSavedFilter(); },450); }
function _toggleSave(id,btn){
  _api('/api/saved-requests/'+id,{method:'POST'}).then(function(r){
    var saved=r&&r.saved;
    if(saved){ if(window._savedIds.indexOf(id)<0)window._savedIds.push(id); }
    else { var i=window._savedIds.indexOf(id); if(i>=0)window._savedIds.splice(i,1); }
    if(btn){ btn.classList.toggle('on',saved); var svg=btn.querySelector('svg'); if(svg)svg.setAttribute('fill',saved?'currentColor':'none'); btn.title=saved?'محفوظ':'حفظ للاحقاً'; }
    if(typeof showToast==='function')showToast(saved?'تم الحفظ في المحفوظة 🔖':'أُزيل من المحفوظة','success');
    if(_savedOn)_filterBrowse();
  }).catch(function(){ if(typeof showToast==='function')showToast('تعذّر الحفظ','error'); });
}
function _toggleSavedFilter(){_savedOn=!_savedOn;var b=_el('bSaved');if(b){b.style.background=_savedOn?'#4338ca':'#eef2ff';b.style.color=_savedOn?'#fff':'#4338ca';b.style.borderColor=_savedOn?'#4338ca':'#c7d2fe';}_filterBrowse();}
var _smartOn=false;
function _toggleSmart(){_smartOn=!_smartOn;var b=_el('bSmart');if(b){b.style.background=_smartOn?'#4338ca':'#eef2ff';b.style.color=_smartOn?'#fff':'#4338ca';b.style.borderColor=_smartOn?'#4338ca':'#c7d2fe';}_filterBrowse();}
function _inMyAreaG(city){
  var p=window._prof||{};
  if(p.serves_all_cities)return true;
  if(!city)return false; // بلا مدينة مؤكّدة = لا يظهر في «الأنسب لي»
  var svc=Array.isArray(p.service_cities)?p.service_cities:[];
  if(p.city&&city===p.city)return true;
  if(svc.indexOf(city)>=0)return true;
  if(typeof _sameRegionP==='function'){ if(_sameRegionP(p.city,city))return true; if(svc.some(function(c){return _sameRegionP(c,city);}))return true; }
  return false;
}
function _filterBrowse(){
  var q=(_el('bQ')||{value:''}).value.toLowerCase();var cat=(_el('bCat')||{value:''}).value;var cit=(_el('bCit')||{value:''}).value;var srt=(_el('bSort')||{value:'new'}).value;
  var f=_allProjs.filter(function(p){
    if(p.status!=='open')return false;
    if(q&&!((p.title||'').toLowerCase().includes(q)||(p.description||'').toLowerCase().includes(q)))return false;
    if(cat&&p.category!==cat&&(p.extra_categories||[]).indexOf(cat)<0)return false;
    if(cit&&p.city!==cit)return false;
    if(_savedOn&&!(window._savedIds&&window._savedIds.indexOf(p.id)>=0))return false;
    if(_smartOn){
      var specs=(window._prof&&window._prof.specialties)||[];
      if(specs.length&&!_rCatHit(p,specs))return false;
      if(!_inMyAreaG(p.city))return false;
    }
    return true;
  });
  f.sort(function(a,b){
    if(_smartOn){var ba=parseInt(a.bid_count||0),bb=parseInt(b.bid_count||0);if(ba!==bb)return ba-bb;return new Date(b.created_at||0)-new Date(a.created_at||0);}
    if(srt==='budget')return (parseFloat(b.budget_max)||0)-(parseFloat(a.budget_max)||0);
    var ta=new Date(a.created_at||0).getTime(),tb=new Date(b.created_at||0).getTime();
    return srt==='old'?(ta-tb):(tb-ta);
  });
  var el=_el('bList');if(el){ if(_savedOn&&!f.length){ el.innerHTML=_empty('لا مشاريع محفوظة','احفظ أي مشروع بالضغط على 🔖 لتجده هنا لاحقاً'); } else if(_smartOn&&!f.length){ el.innerHTML=_empty('لا مشاريع تناسب تخصصك في منطقتك حالياً','ألغِ «الأنسب لي» لتصفّح كل المشاريع، أو وسّع مدن خدمتك من ملفك'); } else { el.innerHTML=_renderBrowseList(f); } }
}
function catSvg(cat,size){
  size=size||26;
  var pths={
    'تبريد وتكييف':'<path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/>',
    'كهرباء':'<path d="M13 2L3 14h7v8l10-12h-7z"/>',
    'سباكة':'<path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94z"/>',
    'نجارة':'<path d="M3 21l3-3m0 0l9-9 3 3-9 9zm12-12l3-3-3-3-3 3"/>',
    'تنظيف':'<path d="M3 21l6-6m2-7l4 4M14 4l6 6-9 9H5v-6z"/>',
    'نقل عفش':'<rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>',
    'بناء':'<path d="M2 20h20M4 20V8l8-5 8 5v12M9 20v-6h6v6"/>',
    'كاميرات مراقبة':'<path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/>',
    'مسابح':'<path d="M2 12h20M2 17h20M5 7l3 3M12 6l3 3M2 7c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2"/>',
    'مكافحة حشرات':'<circle cx="12" cy="12" r="4"/><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/>',
    'عزل حراري':'<path d="M14 4v10.5a4 4 0 11-4 0V4a2 2 0 014 0z"/>',
    'مظلات وسواتر':'<path d="M3 18h18M5 18l7-12 7 12M12 6V3"/>',
    'حدادة':'<circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.2 4.2l4.3 4.3M15.5 15.5l4.3 4.3M1 12h6M17 12h6"/>',
    'شبكات وإنترنت':'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>',
    'ألمنيوم':'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h18M12 3v18"/>',
    'أبواب':'<rect x="4" y="2" width="16" height="20" rx="1"/><circle cx="16" cy="12" r="1"/>',
    'جبس':'<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>',
    'مكاتب هندسية':'<path d="M4 4v16h16"/><path d="M4 4l16 16"/><path d="M7.5 20v-3M4 12.5h3"/>'
  };
  var d=pths[cat]||'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/>';
  return '<svg width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">'+d+'</svg>';
}
function _renderBrowseList(list){
  if(!list||!list.length)return _empty('لا يوجد مشاريع متاحة حالياً. تفقد لاحقاً!','');
  return list.map(function(r){
    var img=r.thumbnail||r.image_url||(r.images&&r.images[0])||null;
    var meta=[];
    if(r.city)meta.push(_esc(r.city));
    meta.push(timeAgoP(r.created_at));
    meta.push(_arN(r.bid_count,'b'));
    img=_safeUrl(img);
    var imgHtml=img
      ?'<div class="hz-img"><img src="'+_esc(img)+'" loading="lazy"></div>'
      :'<div class="hz-img hz-noimg">'+catSvg(r.category,28)+'</div>';
    var h='<div class="hz-item" onclick="_viewProj('+r.id+')">';
    h+=imgHtml;
    h+='<div class="hz-body">';
    h+='<div class="hz-title">'+_esc(r.title)+'</div>';
    if(parseInt(r.bid_count||0)===0)h+='<div style="display:inline-block;background:#fef3c7;color:#b45309;font-size:9.5px;font-weight:800;padding:2px 9px;border-radius:20px;margin-top:2px">🔥 فرصة ذهبية</div>';
    if(r.category)h+='<div class="hz-cat">'+_esc(r.category)+'</div>';
    h+='<div class="hz-meta">'+meta.map(function(m){return '<span>'+m+'</span>';}).join('')+'</div>';
    h+='</div>';
    if(r.budget_max)h+='<div class="hz-price">'+fmtN(r.budget_max)+'<span>ر.س</span></div>';
    var _sv=(window._savedIds&&window._savedIds.indexOf(r.id)>=0);
    h+='<button class="hz-save'+(_sv?' on':'')+'" onclick="event.stopPropagation();_toggleSave('+r.id+',this)" title="'+(_sv?'محفوظ':'حفظ للاحقاً')+'"><svg viewBox="0 0 24 24" width="17" height="17" fill="'+(_sv?'currentColor':'none')+'" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></button>';
    h+='</div>';
    return h;
  }).join('');
}

// ── نص اتفاقية عمولة المنصة (كامل) ──
function _showFeeAgreement(){
  var p=parseFloat((_el('bid-price')||{}).value||0);
  var _unit=((_el('bid-unit')||{}).value||'total');
  var feeTxt = (_unit==='total' && p>0) ? ('<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:11px;margin-top:14px;text-align:center;font-size:13px;font-weight:900;color:#9a3412">على سعرك الحالي ('+Math.round(p).toLocaleString('en-US')+' ر.س) تكون العمولة التقديرية <span style="font-size:16px">'+Math.round(p*0.03).toLocaleString('en-US')+'</span> ر.س<div style="font-size:11.5px;font-weight:700;margin-top:4px">والنهائية تُحسب على مبلغ الاتفاق الفعلي مع العميل</div></div>') : '';
  var d=document.createElement('div');
  d.id='feeAgrModal';
  d.style.cssText='position:fixed;inset:0;z-index:1500;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:16px';
  d.innerHTML='<div style="background:#fff;width:100%;max-width:560px;max-height:86vh;overflow-y:auto;border-radius:18px;padding:22px">'
    +'<div style="text-align:center;font-family:Cairo,Tajawal,sans-serif;font-size:17px;font-weight:900;color:var(--p3);margin-bottom:4px">اتفاقية عمولة المنصة</div>'
    +'<div style="text-align:center;font-size:13px;font-weight:800;color:#9a3412;margin-bottom:14px">بسم الله الرحمن الرحيم</div>'
    +'<div style="background:#f8fafc;border-right:4px solid var(--p);border-radius:10px;padding:14px;margin-bottom:16px">'
      +'<div style="font-size:12px;color:var(--muted);font-weight:700;margin-bottom:6px">قال الله تعالى:</div>'
      +'<div style="font-family:Cairo,Tajawal,sans-serif;font-size:14.5px;line-height:2;color:var(--p3);font-weight:700;text-align:center">﴿وَأَوْفُوا بِعَهْدِ اللَّهِ إِذَا عَاهَدتُّمْ وَلَا تَنقُضُوا الْأَيْمَانَ بَعْدَ تَوْكِيدِهَا وَقَدْ جَعَلْتُمُ اللَّهَ عَلَيْكُمْ كَفِيلًا﴾</div>'
      +'<div style="text-align:center;font-size:11.5px;color:var(--muted);font-weight:700;margin-top:7px">صدق الله العظيم</div>'
    +'</div>'
    +'<div style="font-size:13px;line-height:2.05;color:var(--text);text-align:justify">'
      +'أتعهد أنا مزود الخدمة بالالتزام بسداد عمولة المنصة وقدرها <b>3% من قيمة الاتفاق</b>، إذا استفدت من هذه الفرصة وترتب عليها اتفاق أو تعاقد أو تنفيذ للمشروع، سواء تم ذلك من خلال المنصة أو خارجها، بشكل مباشر أو غير مباشر، متى كان سبب التعارف أو الوصول إلى العميل هو هذه المنصة.'
      +'<br><br>كما أتعهد بسداد عمولة المنصة خلال <b>10 أيام</b> من تاريخ إبرام الاتفاق أو البدء في تنفيذ المشروع أو تنفيذه، أيها أسبق.'
    +'</div>'
    +'<div style="background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:13px;margin-top:15px">'
      +'<div style="font-size:12.5px;font-weight:900;color:var(--p);margin-bottom:6px">ملاحظة</div>'
      +'<div style="font-size:12px;line-height:1.95;color:var(--text2);text-align:justify">تُعد عمولة المنصة حقًا مستحقًا بمجرد الاستفادة من الفرصة التي وفرتها المنصة، ولا يؤثر على استحقاقها تغيير وسيلة التواصل، أو إتمام الاتفاق خارج المنصة، أو تعديل قيمة الاتفاق، أو تنفيذ المشروع جزئيًا أو كليًا، أو التعامل مع العميل مباشرة بعد التعارف من خلال المنصة. ولا تبرأ الذمة من هذه العمولة إلا بعد سدادها كاملًا.</div>'
    +'</div>'
    +feeTxt
    +'<button onclick="document.getElementById(\'feeAgrModal\').remove()" style="width:100%;margin-top:16px;padding:13px;background:var(--p3);color:#fff;border:none;border-radius:11px;font-family:Tajawal,sans-serif;font-size:14px;font-weight:800;cursor:pointer">إغلاق</button>'
    +'</div>';
  d.onclick=function(e){ if(e.target===d)d.remove(); };
  document.body.appendChild(d);
}

function _bindFeeLive(){
  var inp=_el('bid-price'), out=_el('feeLive'); if(!inp||!out)return;
  var upd=function(){
    var p=parseFloat(inp.value||0);
    var unit=((_el('bid-unit')||{}).value||'total');
    if(unit!=='total'){ out.style.display='block'; out.innerHTML='السعي 3% من <b>المبلغ الإجمالي</b> اللي تتفق عليه مع العميل — يتحدد بعد الاتفاق (سعرك هنا '+(unit==='meter'?'للمتر':'للوحدة')+').'; }
    else if(p>0){ out.style.display='block'; out.innerHTML='سعي تقديري على سعرك الحالي: <span style="font-size:14.5px">'+Math.round(p*0.03).toLocaleString('en-US')+'</span> ر.س<div style="font-size:11px;font-weight:700;color:#b45309;margin-top:3px">المبلغ النهائي يُحسب على قيمة اتفاقك الفعلية مع العميل — وتقدر تعدّله عند السداد.</div>'; }
    else out.style.display='none';
  };
  inp.addEventListener('input',upd); var _u=_el('bid-unit'); if(_u)_u.addEventListener('change',upd); upd();
}
function _openBidNudge(projId,bidCount){
  var count=bidCount||0;
  var countText=count>0?'فيه <strong>'+count+'</strong> مزود قدّم عرضه على هذا المشروع.':'كن أول من يقدّم عرضه على هذا المشروع.';
  var body='<div style="text-align:center;padding:8px 0 16px"><div style="width:52px;height:52px;background:var(--gold-l);border:2px solid var(--gold-soft);border-radius:16px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--gold-d)" stroke-width="2" stroke-linecap="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg></div><div style="font-size:15px;font-weight:900;color:var(--p);margin-bottom:10px">منافسة حقيقية</div><div style="font-size:13px;color:var(--muted);margin-bottom:20px;line-height:1.8">'+countText+'</div><div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:right;margin-bottom:4px"><div style="font-size:12px;font-weight:800;color:var(--p);margin-bottom:10px">العملاء يختارون بناءً على:</div><div style="font-size:12px;color:#374151;line-height:2.2"><div style="display:flex;align-items:center;gap:8px"><span style="width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0"></span>السعر المناسب</div><div style="display:flex;align-items:center;gap:8px"><span style="width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0"></span>مدة التنفيذ الواضحة</div><div style="display:flex;align-items:center;gap:8px"><span style="width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0"></span>ملاحظة احترافية</div></div></div></div>';
  body+=_CTL;
  var foot='<button class="btn-sm bs-p" onclick="closeModal()" style="flex:1;padding:10px">إلغاء</button><button onclick="closeModal();_openBidModal('+projId+')" style="flex:1;padding:10px;background:var(--p);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:800;cursor:pointer;font-family:Tajawal,sans-serif">قدّم أفضل عرض</button>';
  openModal('',body,foot);
}

function _openBidModal(projId){ if(window._areaGate&&!window._agSkip){ _areaGate(projId,function(){ window._agSkip=1; try{_openBidModal(projId);}finally{window._agSkip=0;} }); return; }
  var body='<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px"><div class="fg" style="margin:0"><label>السعر (ر.س) *</label><input type="number" id="bid-price" placeholder="5000"></div><div class="fg" style="margin:0"><label>المدة (أيام) *</label><input type="number" id="bid-days" placeholder="7"></div></div>'+'<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:9px 12px;margin-bottom:12px;font-size:11.5px;color:#166534;line-height:1.75">💡 <strong>سعر منافس يرفع فرصتك في الفوز.</strong> العميل يقارن القيمة كاملة — خبرتك وجودتك ومدة تنفيذك — مو السعر وحده. قدّم أفضل سعر تقدر عليه، وأبرز ما يميّزك.</div>'+'<div class="fg"><label>نوع السعر</label><select id="bid-unit" style="width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal,sans-serif;font-size:13px;background:var(--white)"><option value="total">إجمالي للمشروع</option><option value="meter">للمتر</option><option value="unit">للوحدة/القطعة</option></select></div>'+'<div class="fg"><label>شامل المواد؟ <span style="font-weight:600;color:var(--muted)">(اختياري — يساعد العميل يقارن)</span></label><select id="bid-mat" style="width:100%;padding:9px 11px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal,sans-serif;font-size:13px;background:var(--white)"><option value="">— اختر —</option><option value="yes">نعم، السعر شامل المواد</option><option value="no">لا، السعر للشغل فقط (بدون مواد)</option></select></div>'+'<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:11px;padding:11px 13px;margin-bottom:11px"><div onclick="_toggleBidTip()" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between;font-size:12.5px;font-weight:800;color:#1e40af"><span>💡 كيف تكتب عرضاً يفوز؟ (مثال)</span><span id="bid-tip-ar" style="font-size:11px">▾</span></div><div id="bid-tip-body" style="display:none;margin-top:9px;font-size:11.5px;color:#334155;line-height:1.9"><div style="font-weight:800;margin-bottom:5px;color:#1e293b">عرضك القوي يذكر باختصار:</div>خبرتك · كيف ستنفّذ العمل والمواد · مدة البدء · الضمان بعد التنفيذ.<div style="background:#fff;border:1px solid #e2e8f0;border-radius:9px;padding:10px 12px;margin-top:9px;line-height:2;color:#475569">«لدي خبرة … سنوات في هذا المجال. سأنفّذ المشروع بـ… باستخدام مواد …، مع الالتزام بالمقاسات المطلوبة. أبدأ خلال … أيام، وأقدّم ضماناً لمدة … .»</div><button type="button" onclick="_useBidTemplate()" style="margin-top:10px;background:#1e40af;color:#fff;border:none;padding:8px 15px;border-radius:8px;font-family:Tajawal,sans-serif;font-size:12px;font-weight:800;cursor:pointer">✍️ استخدام هذا القالب</button></div></div>'+'<div style="background:#fef2f2;border:1.5px solid #fecaca;border-right:4px solid #dc2626;border-radius:11px;padding:11px 13px;margin-bottom:11px"><div style="font-size:12.5px;font-weight:900;color:#b91c1c;margin-bottom:4px">⚠️ عرض احترافي فقط</div><div style="font-size:11.5px;color:#7f1d1d;line-height:1.8">قدّم عرضاً يوضّح خبرتك وطريقة تنفيذك ليساعد العميل على الاختيار. <b>العروض العشوائية أو الفارغة تُرفض تلقائياً، وقد يُحظر الحساب عند تكرارها.</b></div></div>'+'<div class="fg"><label>رسالتك للعميل *</label>'+fmtBar('bid-note')+'<textarea id="bid-note" placeholder="اشرح خبرتك وكيف ستنفذ المشروع...&#10;مثال:&#10;- خبرة 8 سنوات في هذا المجال&#10;- ضمان سنة على التنفيذ&#10;- البدء خلال 3 أيام" style="min-height:110px"></textarea></div>'+'<div style="font-size:10.5px;color:var(--muted);margin:-4px 0 12px;line-height:1.6">💡 لو اخترت إخفاء سعرك، لا تذكر الرقم داخل الرسالة حتى يبقى مخفياً عن المنافسين.</div>'+'<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:11px;padding:11px 13px;margin-bottom:12px;font-size:12px;color:#166534;line-height:1.85">📞 <strong>عرضك الحقيقي يفتح لك بيانات العميل للتواصل المباشر</strong> — سعر واضح + تفاصيل كافية في الرسالة (أو أرفق ملف عرض سعر). العروض الفاضية أو العبث تعرّض حسابك للإيقاف.</div>'
    +'<div style="background:linear-gradient(135deg,#fff7ed,#fffbeb);border:1px solid #fed7aa;border-radius:12px;padding:13px;margin-bottom:11px">'
      +'<div style="font-size:12.5px;font-weight:900;color:#9a3412;margin-bottom:6px">💰 اتفاقية عمولة المنصة — 3%</div>'
      +'<div style="font-size:11.5px;color:#7c2d12;line-height:1.85">أتعهد بسداد <b>3% من قيمة الاتفاق</b> إذا استفدت من هذه الفرصة وترتب عليها اتفاق أو تنفيذ — سواء داخل المنصة أو خارجها — خلال <b>10 أيام</b> من الاتفاق أو بدء التنفيذ.</div>'
      +'<div id="feeLive" style="margin-top:8px;font-size:12px;font-weight:800;color:#9a3412;display:none"></div>'
      +'<button type="button" onclick="_showFeeAgreement()" style="margin-top:9px;background:none;border:none;color:#9a3412;font-family:Tajawal,sans-serif;font-size:11.5px;font-weight:800;cursor:pointer;text-decoration:underline;padding:0">📜 اقرأ الاتفاقية كاملة</button>'
      +'<label style="display:flex;align-items:flex-start;gap:9px;margin-top:11px;padding:10px 11px;background:#fff;border:1.5px solid #fed7aa;border-radius:10px;cursor:pointer">'
        +'<input type="checkbox" id="feeAgree" style="margin-top:2px;width:17px;height:17px;flex-shrink:0;accent-color:#d97706">'
        +'<span style="font-size:12px;font-weight:800;color:#7c2d12;line-height:1.6">أقرّ بأنني اطّلعت على اتفاقية عمولة المنصة وأتعهد بالالتزام بها</span>'
      +'</label>'
    +'</div>'
    +'<div style="background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:12px 13px">'
    +'<div style="font-size:12.5px;font-weight:800;margin-bottom:9px">🔒 من يشوف سعرك؟</div>'
    +'<label style="display:flex;align-items:flex-start;gap:9px;padding:9px 10px;background:var(--white);border:1.5px solid var(--p-mid);border-radius:10px;cursor:pointer;margin-bottom:7px"><input type="radio" name="bidVis" value="client" checked style="margin-top:3px"><div><div style="font-size:13px;font-weight:800">صاحب المشروع فقط</div><div style="font-size:11px;color:var(--muted);margin-top:1px">منافسوك لا يرون سعرك — يُنصح به</div></div></label>'
    +'<label style="display:flex;align-items:flex-start;gap:9px;padding:9px 10px;background:var(--white);border:1px solid var(--border);border-radius:10px;cursor:pointer"><input type="radio" name="bidVis" value="public" style="margin-top:3px"><div><div style="font-size:13px;font-weight:800">الجميع</div><div style="font-size:11px;color:var(--muted);margin-top:1px">يظهر للزوّار — قد يجذب انتباهاً أكثر</div></div></label>'
    +'</div>'
    +'<div style="background:var(--bg);border:1px dashed var(--border);border-radius:12px;padding:12px 13px;margin-top:11px">'
    +'<div style="font-size:12.5px;font-weight:800;margin-bottom:6px">📄 عرض السعر لهذا المشروع <span style="color:var(--muted);font-weight:600">(صورة أو PDF — اختياري)</span></div>'
    +'<div style="font-size:11px;color:var(--muted);margin-bottom:9px;line-height:1.7">لو عندك عرض سعر رسمي بورق مؤسستك ارفعه هنا — يشوفه صاحب المشروع فقط.</div>'
    +'<input type="file" id="bid-file" accept="image/*,application/pdf" onchange="_onBidFile(this)" style="font-size:12px;font-family:Tajawal,sans-serif;width:100%">'
    +'<div id="bid-file-name" style="font-size:11.5px;color:var(--green);font-weight:700;margin-top:7px;display:none"></div>'
    +'</div><div id="bx-box"></div>';
  body='<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:11px;padding:9px 11px;margin-bottom:12px;font-size:12.5px;font-weight:800;color:#15803d;text-align:center">📞 بعد عرضك يظهر لك رقم العميل وتكلّمه واتساب مباشرة</div>'+body;
  var foot='<button class="btn-sm bs-p" onclick="closeModal()" style="flex:1;padding:10px">إلغاء</button><button onclick="_submitBid('+projId+')" style="flex:1;padding:10px;background:var(--p);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">إرسال العرض</button>';
  openModal('تقديم عرض',body,foot);
  setTimeout(_bindFeeLive,60);
  try{ if(window._bxMount)_bxMount(); }catch(e){}
}
window._bidAttach=null;
function _onBidFile(inp){
  var f=inp.files&&inp.files[0];var lbl=_el('bid-file-name');
  if(!f){window._bidAttach=null;if(lbl)lbl.style.display='none';return;}
  var ok=['image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','application/pdf'];
  if(ok.indexOf(f.type)<0){showToast('نوع الملف غير مدعوم (صورة أو PDF)','error');inp.value='';window._bidAttach=null;if(lbl)lbl.style.display='none';return;}
  if(f.size>10*1024*1024){showToast('حجم الملف كبير (الحد 10MB)','error');inp.value='';window._bidAttach=null;if(lbl)lbl.style.display='none';return;}
  var rd=new FileReader();rd.onload=function(){window._bidAttach=rd.result;if(lbl){lbl.textContent='✓ '+f.name;lbl.style.display='block';}};rd.readAsDataURL(f);
}
function _toggleBidTip(){var b=document.getElementById('bid-tip-body'),a=document.getElementById('bid-tip-ar');if(!b)return;var o=b.style.display!=='none';b.style.display=o?'none':'block';if(a)a.textContent=o?'▾':'▴';}
function _useBidTemplate(){var t=document.getElementById('bid-note');if(!t)return;if(t.value.trim()&&!confirm('استبدال ما كتبته بالقالب؟'))return;t.value='لدي خبرة (عدد) سنوات في هذا المجال.\nسأنفّذ المشروع كالتالي: (اشرح طريقتك باختصار).\nالمواد المستخدمة: (نوعها وجودتها).\nأبدأ خلال (عدد) أيام، وأقدّم ضماناً لمدة (اذكر المدة).';t.focus();}
async function _submitBid(projId){
  var priceStr=(_el('bid-price')||{}).value;var daysStr=(_el('bid-days')||{}).value;var note=((_el('bid-note')||{}).value||'').trim();
  var priceNum=parseFloat(priceStr);var daysNum=parseInt(daysStr);
  if(!priceStr||isNaN(priceNum)||priceNum<=0){showToast('أدخل سعر العرض','error');return;}
  if(((_el('bid-unit')||{}).value||'total')==='total'&&priceNum<50){showToast('اكتب سعرك الحقيقي للمشروع — أقل سعر إجمالي 50 ريال. لو سعرك للمتر أو للقطعة غيّر «نوع السعر»','error');var _bp=_el('bid-price');if(_bp)_bp.focus();return;}
  if(!daysStr||isNaN(daysNum)||daysNum<=0){showToast('أدخل مدة التنفيذ','error');return;}
  if(!note){showToast('أدخل رسالتك للعميل','error');return;}
  var _nb=note.replace(/\s+/g,'');
  if(_nb.length<15||/^[\d\s.,\-ريالر.س﷼]+$/.test(note)||/^(.)\1{4,}$/.test(_nb)){showToast('اكتب رسالة احترافية توضّح خبرتك وطريقة تنفيذك (١٥ حرفاً على الأقل) — العروض العشوائية تُرفض','error');try{_el('bid-note').style.borderColor='#dc2626';_el('bid-note').focus();}catch(e){}return;}
  var _ag=_el('feeAgree');
  if(_ag && !_ag.checked){ showToast('يجب الإقرار بالموافقة على اتفاقية عمولة المنصة','error');
    try{ _ag.closest('label').style.borderColor='#dc2626'; _ag.scrollIntoView({block:'center',behavior:'smooth'}); }catch(e){} return; }
  // خطوة تأكيد قبل الإرسال — يشوف المزوّد عرضه فعلياً ويتعهّد بالجودة
  var vis=((document.querySelector('input[name="bidVis"]:checked')||{}).value||'client');
  var unit=((_el('bid-unit')||{}).value||'total');
  window._pendingBid={projId:projId,price:Math.max(1,Math.round(priceNum)),days:Math.max(1,Math.round(daysNum)),note:note,vis:vis,unit:unit,mat:((_el('bid-mat')||{}).value||'')};
  _showBidConfirm();
}
function _showBidConfirm(){
  var d=window._pendingBid;if(!d)return;
  var unitTxt={total:'إجمالي للمشروع',meter:'للمتر',unit:'للوحدة/القطعة'}[d.unit]||'';
  var visTxt=(d.vis==='public')?'🌐 يظهر للجميع':'🔒 لصاحب المشروع فقط';
  var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var html='<div class="overlay show" id="bidConfirmOv" style="z-index:400;align-items:center;padding:16px">'+
    '<div style="background:#fff;border-radius:18px;max-width:440px;width:100%;max-height:88vh;overflow:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)">'+
    '<div style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:#fff;padding:15px 18px;border-radius:18px 18px 0 0"><div style="font-size:16px;font-weight:900">📋 تأكيد إرسال العرض</div><div style="font-size:12px;opacity:.9;margin-top:3px">راجع عرضك — هذا اللي بيوصل العميل</div></div>'+
    '<div style="padding:16px 18px">'+
      '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px;margin-bottom:13px">'+
        '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-bottom:9px;font-size:13.5px"><span style="font-weight:900">💰 '+d.price.toLocaleString('en-US')+' ر.س</span><span style="color:#64748b">'+esc(unitTxt)+'</span><span style="color:#64748b">⏱ '+d.days+' يوم</span></div>'+
        '<div style="font-size:11.5px;color:#475569;margin-bottom:8px">'+visTxt+'</div>'+
        '<div style="font-size:11px;font-weight:800;color:#64748b;margin-bottom:4px">نص عرضك:</div>'+
        '<div style="background:#fff;border:1px dashed #cbd5e1;border-radius:8px;padding:9px 11px;font-size:12.5px;color:#334155;line-height:1.8;white-space:pre-wrap;word-break:break-word;max-height:150px;overflow:auto">'+esc(d.note)+'</div>'+
      '</div>'+
      '<div style="background:#fef2f2;border:1.5px solid #fecaca;border-right:4px solid #dc2626;border-radius:12px;padding:12px 14px;margin-bottom:15px">'+
        '<div style="font-size:12.5px;font-weight:900;color:#b91c1c;margin-bottom:7px">قبل الإرسال، تأكّد:</div>'+
        '<div style="font-size:11.5px;color:#7f1d1d;line-height:2">✓ العرض احترافي ويوضّح خبرتك وطريقة التنفيذ<br>✓ لا أرقام تواصل داخل النص<br>✓ لا سعر داخل النص عند «السعر خاص»<br>✓ لا مرفقات غير متعلقة بالمشروع</div>'+
        '<div style="font-size:11px;font-weight:800;color:#b91c1c;margin-top:8px;padding-top:8px;border-top:1px solid #fecaca">⚠️ العروض العشوائية أو التلاعب تُرفض وقد يُحظر الحساب.</div>'+
      '</div>'+
      '<div style="display:flex;gap:9px">'+
        '<button onclick="_closeBidConfirm()" style="flex:1;padding:12px;background:#fff;color:#475569;border:1.5px solid #cbd5e1;border-radius:11px;font-family:Tajawal;font-weight:800;font-size:13.5px;cursor:pointer">↩ رجوع وأعدّل</button>'+
        '<button id="bidConfirmBtn" onclick="_reallySubmitBid()" style="flex:1.4;padding:12px;background:#16a34a;color:#fff;border:none;border-radius:11px;font-family:Tajawal;font-weight:900;font-size:13.5px;cursor:pointer">✅ تأكيد وإرسال</button>'+
      '</div>'+
    '</div></div></div>';
  var old=document.getElementById('bidConfirmOv');if(old)old.remove();
  document.body.insertAdjacentHTML('beforeend',html);
}
function _closeBidConfirm(){var o=document.getElementById('bidConfirmOv');if(o)o.remove();}
async function _reallySubmitBid(){
  var d=window._pendingBid;if(!d)return;
  var btn=document.getElementById('bidConfirmBtn');if(btn){btn.disabled=true;btn.textContent='جاري الإرسال...';}
  try{
    var _bb=JSON.stringify(Object.assign({price:d.price,days:d.days,note:d.note,price_visibility:d.vis,price_unit:d.unit,materials:(d.mat||null),attachment:(window._bidAttach||null),area_mode:(window._areaMode||null)},(window._bxGet?_bxGet():{})));
    var r=await _api('/api/requests/'+d.projId+'/bids',{method:'POST',body:_bb});
    if(r&&r.code==='email_unverified'&&window._evOpen){ if(_bb.length<4000000)_evSavePending('/api/requests/'+d.projId+'/bids',_bb); _closeBidConfirm();closeModal(); _evOpen({saved:_bb.length<4000000,onChange:_vbChange}); return; }
    if(r&&(r.id||r.request_id)){window._bidAttach=null;window._pendingBid=null;_closeBidConfirm();closeModal();showToast('تم إرسال عرضك بنجاح','success');try{ if(window.mnqAppMoment) setTimeout(function(){ mnqAppMoment('bid'); },900); }catch(e){}loadBrowse();}
    else{showToast((r&&r.message)||'حدث خطأ','error');if(btn){btn.disabled=false;btn.textContent='✅ تأكيد وإرسال';}}
  }catch(e){showToast('تعذّر الاتصال بالخادم — تحقّق من الإنترنت','error');if(btn){btn.disabled=false;btn.textContent='✅ تأكيد وإرسال';}}
}

async function _viewProj(id){
  location.href='/project.html?id='+id; return; // #١: المزود يشوف الصفحة الجميلة كاملة مع عروض المنافسين
  openModal('تفاصيل المشروع','<div class="loading">جاري التحميل...</div>','');
  var r=await _api('/api/requests/'+id);
  if(!r||!r.id){_el('mBd').innerHTML=_empty('تعذر التحميل','');return;}
  window._currentViewReq=r; var imgs=r.images||[];
  var body='<div style="background:var(--p);border-radius:12px;padding:16px;margin-bottom:14px;position:relative"><div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:var(--gold)"></div>';
  body+='<div style="font-size:14px;font-weight:800;color:#fff;margin-bottom:8px">'+_esc(r.title)+'</div>';
  body+='<div style="display:flex;gap:5px;flex-wrap:wrap">';
  if(r.city)body+='<span style="background:rgba(255,255,255,.12);color:rgba(255,255,255,.8);padding:3px 10px;border-radius:20px;font-size:10px">'+_esc(r.city)+'</span>';
  if(r.category)body+='<span style="background:rgba(255,255,255,.08);color:rgba(255,255,255,.6);padding:3px 10px;border-radius:20px;font-size:10px">'+_esc(r.category)+'</span>';
  body+='</div></div>';
  if(imgs.length){body+='<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px">';imgs.forEach(function(img){body+='<div style="border-radius:8px;overflow:hidden;aspect-ratio:1;cursor:pointer" onclick="openImgFull(this.dataset.s)" data-s="'+img+'"><img loading="lazy" src="'+img+'" style="width:100%;height:100%;object-fit:cover"></div>';});body+='</div>';}
  if(r.description)body+='<div style="background:var(--bg);border-right:3px solid var(--border);border-radius:0 8px 8px 0;padding:10px 13px;margin-bottom:12px;font-size:12px;line-height:1.8;color:var(--text2);white-space:pre-wrap;word-wrap:break-word">'+_esc(r.description)+'</div>';
  body+='<div style="background:var(--bg);border-radius:9px;padding:12px 14px"><div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;color:var(--muted)">الميزانية</span><span style="font-size:11px;font-weight:700;color:var(--p)">'+_fpr(r.budget_max)+'</span></div><div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="font-size:11px;color:var(--muted)">الموعد النهائي</span><span style="font-size:11px;font-weight:700;color:var(--p)">'+_fdt(r.deadline)+'</span></div><div style="display:flex;justify-content:space-between;padding:5px 0"><span style="font-size:11px;color:var(--muted)">صاحب المشروع</span><span style="font-size:11px;font-weight:700;color:var(--p)">'+_esc(r.client_name||'—')+'</span></div></div>';
  _el('mBd').innerHTML=body;
  _loadProjQuestions(id);
  var cname=_esc(r.client_name||'العميل').replace(/'/g,'');var ctitle=_esc(r.title||'').replace(/'/g,'');
  var foot='<div style="display:grid;grid-template-columns:1fr'+(r.client_id?' 1fr':'')+';gap:8px;margin-bottom:8px;width:100%">';
  foot+='<button onclick="closeModal();_openBidNudge('+r.id+','+(r.bid_count||0)+')" style="padding:12px;background:var(--p);color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;font-family:Tajawal,sans-serif">تقديم عرض</button>';
  if(r.client_id){foot+='<button class="_vchat" data-rid="'+r.id+'" data-cid="'+r.client_id+'" style="padding:12px;background:var(--gold-l);color:var(--gold-d);border:1px solid var(--gold-soft);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif;display:flex;align-items:center;justify-content:center;gap:6px"><svg width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" viewBox=\"0 0 24 24\"><path d=\"M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z\"/></svg>محادثة</button>';}
  foot+='</div>';
  if(r.client_phone){
    var phoneClean=String(r.client_phone).replace(/[^0-9]/g,'');
    var waNum=phoneClean.startsWith('966')?phoneClean:(phoneClean.startsWith('0')?'966'+phoneClean.slice(1):'966'+phoneClean);
    var waText='مرحباً '+(r.client_name||'')+'،\nأتواصل معك عبر منصة مناقصة بشأن مشروعكم: '+(r.title||'')+'\nأنا '+(_me.name||'المزود')+'.';
    foot+='<div style="display:grid;grid-template-columns:1fr 1fr'+(r.client_id?' 1fr':'')+';gap:8px;width:100%;margin-bottom:8px">';
    foot+='<a href="https://wa.me/'+waNum+'?text='+encodeURIComponent(waText)+'" target="_blank" style="padding:11px;background:#25d366;color:#fff;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;font-family:Tajawal,sans-serif;display:flex;align-items:center;justify-content:center;gap:5px">واتساب</a>';
    foot+='<a href="tel:'+_esc(r.client_phone)+'" style="padding:11px;background:var(--green-l);color:var(--green);border:1px solid #bbf7d0;border-radius:10px;font-size:12px;font-weight:700;text-decoration:none;font-family:Tajawal,sans-serif;display:flex;align-items:center;justify-content:center;gap:5px">اتصال</a>';
    if(r.client_id){foot+='<button onclick="closeModal();_rptFromView('+r.client_id+','+r.id+')" style="padding:11px;background:var(--red-l);color:var(--red);border:1px solid #fecaca;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">إبلاغ</button>';}
    foot+='</div>';
  } else if(r.client_id){
    foot+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%"><button onclick="closeModal();_rptFromView('+r.client_id+','+r.id+')" style="padding:11px;background:var(--red-l);color:var(--red);border:1px solid #fecaca;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">إبلاغ</button><button onclick="closeModal()" style="padding:11px;background:var(--bg);color:var(--muted);border:1px solid var(--border);border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">إغلاق</button></div>';
  }
  _el('mFt').style.cssText='padding:12px 20px;border-top:1px solid var(--border);display:block;background:var(--bg)';
  _el('mFt').innerHTML=foot;
  _el('mFt').querySelectorAll('._vchat').forEach(function(btn){
    btn.addEventListener('click',function(){
      var rid=parseInt(btn.getAttribute('data-rid'));
      var cid=parseInt(btn.getAttribute('data-cid'));
      closeModal();
      location.href='/chat?req='+rid+'&with='+cid;
    });
  });
}

var _rptTarget={id:0,name:'',reqId:null};
var _RPT_REASONS=['سلوك غير لائق','احتيال أو نصب','عدم الاستجابة','معلومات مضللة','محتوى مسيء','بيانات مزيفة','أخرى'];
function openReportModal(reportedId,reportedName,requestId){
  var old=document.getElementById('rpt-modal-wrap');if(old)old.remove();
  _rptTarget={id:reportedId,name:reportedName||'المستخدم',reqId:requestId||null};
  var reasonsHtml=_RPT_REASONS.map(function(rs){return '<label style="display:flex;align-items:center;gap:10px;padding:10px 13px;border:1.5px solid var(--border);border-radius:10px;cursor:pointer;margin-bottom:6px;background:var(--white);transition:.15s"><input type="radio" name="rpt-radio" value="'+_esc(rs)+'" style="width:16px;height:16px;accent-color:var(--red);flex-shrink:0"><span style="font-size:13px;font-weight:600;color:var(--text)">'+_esc(rs)+'</span></label>';}).join('');
  var wrap=document.createElement('div');wrap.id='rpt-modal-wrap';wrap.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px)';
  wrap.innerHTML='<div style="background:var(--white);border-radius:22px 22px 0 0;width:100%;max-width:520px;max-height:90vh;overflow-y:auto"><div style="width:36px;height:4px;background:#d1d5db;border-radius:2px;margin:12px auto"></div><div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;border-bottom:1px solid var(--border)"><span style="font-size:14px;font-weight:800;color:var(--text)">إبلاغ عن: '+_esc(reportedName||'المستخدم')+'</span><button onclick="_closeRptModal()" style="width:28px;height:28px;border-radius:8px;background:var(--bg);border:1px solid var(--border);cursor:pointer;font-size:18px;color:var(--muted);display:flex;align-items:center;justify-content:center">&#215;</button></div><div style="padding:18px 20px"><div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:10px">سبب البلاغ *</div><div id="rpt-reasons-wrap">'+reasonsHtml+'</div><div style="font-size:12px;font-weight:700;color:var(--text2);margin-bottom:6px;margin-top:12px">تفاصيل إضافية <span style="font-weight:400;color:var(--hint)">(اختياري)</span></div><textarea id="rpt-details-inp" placeholder="اشرح المشكلة..." style="width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-family:Tajawal,sans-serif;font-size:13px;outline:none;min-height:80px;resize:vertical;box-sizing:border-box"></textarea></div><div style="padding:12px 20px;border-top:1px solid var(--border);display:flex;gap:8px;background:var(--bg)"><button onclick="_closeRptModal()" style="padding:11px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif;background:var(--white);color:var(--muted);border:1px solid var(--border)">إلغاء</button><button id="rpt-send-btn" onclick="_submitReport()" style="flex:1;padding:11px;border-radius:10px;font-size:13px;font-weight:800;cursor:pointer;font-family:Tajawal,sans-serif;background:var(--red);color:#fff;border:none">إرسال البلاغ</button></div></div>';
  wrap.addEventListener('click',function(e){if(e.target===wrap)_closeRptModal();});
  document.body.appendChild(wrap);document.body.style.overflow='hidden';
  wrap.querySelectorAll('input[name="rpt-radio"]').forEach(function(inp){inp.addEventListener('change',function(){wrap.querySelectorAll('label').forEach(function(l){l.style.borderColor='var(--border)';l.style.background='var(--white)';});var lbl=inp.closest('label');if(lbl){lbl.style.borderColor='var(--red)';lbl.style.background='var(--red-l)';}});});
}
function _closeRptModal(){var w=document.getElementById('rpt-modal-wrap');if(w)w.remove();document.body.style.overflow='';}
async function _submitReport(){
  var sel=document.querySelector('#rpt-reasons-wrap input[name="rpt-radio"]:checked');
  if(!sel){document.querySelectorAll('#rpt-reasons-wrap label').forEach(function(l){l.style.borderColor='#fca5a5';});setTimeout(function(){document.querySelectorAll('#rpt-reasons-wrap label').forEach(function(l){l.style.borderColor='var(--border)';});},1200);return;}
  var btn=_el('rpt-send-btn');if(btn){btn.disabled=true;btn.textContent='جاري الإرسال...';}
  var details=((document.getElementById('rpt-details-inp')||{}).value||'').trim();
  var payload={reported_id:_rptTarget.id,type:'user',reason:sel.value};if(details)payload.details=details;if(_rptTarget.reqId)payload.request_id=_rptTarget.reqId;
  try{var r=await _api('/api/reports',{method:'POST',body:JSON.stringify(payload)});_closeRptModal();if(r&&r.ok){showToast('تم إرسال البلاغ — ستتم المراجعة خلال 24 ساعة','success');}else{showToast((r&&r.message)||'حدث خطأ','error');}}
  catch(e){if(btn){btn.disabled=false;btn.textContent='إرسال البلاغ';}showToast('تعذّر الاتصال بالخادم — تحقّق من الإنترنت','error');}
}

function openImgFull(src){var v=_el('imgViewer'),i=_el('imgViewerImg');if(!v||!i)return;i.src=src;v.style.display='flex';}

async function loadWorks(){
  var pg=_el('page-works');if(!pg)return;
  var cached=_cacheGet('home_data');
  if(cached){_myBids=Array.isArray(cached.bids)?cached.bids:[];_myProjs=Array.isArray(cached.projs)?cached.projs:[];}
  else{pg.innerHTML=_skList(4);}
  try{
    var r=await Promise.all([_api('/api/provider/bids'),_api('/api/provider/projects'),_api('/api/provider/bid-standing').catch(function(){return null;})]);
    _myBids=Array.isArray(r[0])?r[0]:[];_myProjs=Array.isArray(r[1])?r[1]:[];
    window._bidStanding=r[2]||null;
    var hc=_cacheGet('home_data')||{profile:{}};_cacheSet('home_data',{profile:hc.profile,bids:_myBids,projs:_myProjs});
  }catch(e){}
  var acc=_myBids.filter(function(b){return b.status==='accepted';}).length;
  var pend=_myBids.filter(function(b){return b.status==='pending';}).length;
  var prog=_myProjs.filter(function(p){return p.status==='in_progress';}).length;
  var done=_myProjs.filter(function(p){return p.status==='completed';}).length;
  var html='<div class="pghd"><div class="pg-t">مشاريعي وعروضي</div><div class="pg-s">'+_myBids.length+' عرض · '+_myProjs.length+' مشروع</div></div>';
  if(_myBids.some(function(b){return b.contact_unlocked;}) && !(function(){try{return localStorage.getItem('mnq_contact_banner_seen');}catch(e){return 0;}})()){
    html+='<div id="contact-banner" style="background:linear-gradient(135deg,#065f46,#059669);color:#fff;border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">'
      +'<div style="flex:1;min-width:200px"><div style="font-weight:800;font-size:14px;margin-bottom:3px">✨ جديد: تواصل مباشر مع أصحاب مشاريعك</div><div style="font-size:12px;opacity:.92;line-height:1.7">عروضك الحقيقية تتيح لك الآن الاتصال والواتساب مباشرة مع العميل — افتح العرض بالأسفل وبتلقى أزرار التواصل.</div></div>'
      +'<button onclick="var e=document.getElementById(&quot;contact-banner&quot;);if(e)e.remove();try{localStorage.setItem(&quot;mnq_contact_banner_seen&quot;,&quot;1&quot;);}catch(x){}" style="background:rgba(255,255,255,.2);color:#fff;border:none;border-radius:9px;padding:8px 14px;font-family:Tajawal,sans-serif;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap">فهمت ✓</button>'
    +'</div>';
  }
  html+=_bidStandingBanner();
  if(typeof _clmTierHtml==='function'){
    try{ var _dn=_myProjs.filter(function(p){return p.status==='completed';}).length; if(_myBids.length||_myProjs.length)html+=_clmTierHtml(_dn);
      _myProjs.filter(function(p){return p.status==='in_progress'&&!p.claim_status;}).slice(0,2).forEach(function(p){ html+='<div style="background:var(--white,#fff);border:1px solid #fde68a;border-radius:14px;padding:12px 14px;margin-bottom:12px"><div style="font-size:14px;font-weight:900">'+_esc(p.title||'')+'</div><div style="font-size:12px;color:var(--muted);font-weight:700;margin-top:2px">قيد التنفيذ'+(p.client_name?' · '+_esc(p.client_name):'')+'</div>'+_clmProjHtml(p)+'</div>'; });
    }catch(e){}
  }
  html+=_askMotivCard();
  html+='<div style="display:flex;gap:6px;margin-bottom:16px;background:var(--bg);border-radius:12px;padding:4px"><button class="tab-btn on" id="wtab-bids" onclick="_wTab(&quot;bids&quot;,this)">العروض ('+_myBids.length+')</button><button class="tab-btn" id="wtab-projs" onclick="_wTab(&quot;projs&quot;,this)">المشاريع ('+_myProjs.length+')</button></div>';
  html+='<div id="wtab-bids-wrap">'+_renderBids(_myBids)+'</div>';
  html+='<div id="wtab-projs-wrap" style="display:none">'+_renderProjs(_myProjs)+'</div>';
  pg.innerHTML=html;_lb.done();
  pg.querySelectorAll('._bchat,._pchat').forEach(function(btn){
    btn.addEventListener('click',function(){
      openChatRoom(parseInt(btn.getAttribute('data-rid')),parseInt(btn.getAttribute('data-cid')),'','');
    });
  });
}
function _wTab(tab,btn){
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('on');});if(btn)btn.classList.add('on');
  var bw=_el('wtab-bids-wrap'),pw=_el('wtab-projs-wrap');
  if(bw)bw.style.display=tab==='bids'?'':'none';if(pw)pw.style.display=tab==='projs'?'':'none';
}
// تعديل عرض قائم (متاح ما دام لم يُقبل أو يُرفض)
function _editBid(id,price,days,note,pvis,mat){
  window._ebAttach=null;
  var fin='padding:11px 13px;border:1.5px solid var(--border);border-radius:11px;font-family:Tajawal,sans-serif;font-size:13.5px;outline:none;width:100%;box-sizing:border-box';
  var body='<div style="display:flex;flex-direction:column;gap:12px">'
    +'<div><label style="font-size:12px;font-weight:800;color:var(--muted);display:block;margin-bottom:6px">السعر (ر.س)</label><input id="eb-price" type="number" inputmode="numeric" value="'+(price||'')+'" style="'+fin+'"></div>'
    +'<div><label style="font-size:12px;font-weight:800;color:var(--muted);display:block;margin-bottom:6px">مدة التنفيذ (أيام)</label><input id="eb-days" type="number" inputmode="numeric" value="'+(days||'')+'" style="'+fin+'"></div>'
    +'<div><label style="font-size:12px;font-weight:800;color:var(--muted);display:block;margin-bottom:6px">ملاحظة للعميل</label><textarea id="eb-note" rows="3" style="'+fin+';resize:vertical">'+_esc(note||'')+'</textarea></div>'
    +'<div><label style="font-size:12px;font-weight:800;color:var(--muted);display:block;margin-bottom:6px">ظهور السعر</label><select id="eb-pvis" style="'+fin+';cursor:pointer"><option value="client"'+(pvis!=='public'?' selected':'')+'>خاص بصاحب المشروع فقط</option><option value="public"'+(pvis==='public'?' selected':'')+'>ظاهر للجميع</option></select></div>'
    +'<div><label style="font-size:12px;font-weight:800;color:var(--muted);display:block;margin-bottom:6px">شامل المواد؟</label><select id="eb-mat" style="'+fin+';cursor:pointer"><option value=""'+(!mat?' selected':'')+'>— غير محدد —</option><option value="yes"'+(mat==='yes'?' selected':'')+'>نعم، السعر شامل المواد</option><option value="no"'+(mat==='no'?' selected':'')+'>لا، السعر للشغل فقط</option></select></div>'
    +'<div><label style="font-size:12px;font-weight:800;color:var(--muted);display:block;margin-bottom:6px">📄 عرض السعر لهذا المشروع <span style="color:var(--muted);font-weight:600">(صورة أو PDF — اختياري)</span></label><input id="eb-file" type="file" accept="image/*,application/pdf" onchange="_ebFile(this)" style="'+fin+'"><div id="eb-file-note" style="font-size:11px;color:var(--muted);margin-top:5px">استبدل الملف السابق برفع ملف جديد.</div></div>'
    +'<div id="bx-box" style="margin-top:-12px"></div>'
    +'<div style="font-size:11.5px;color:var(--muted);background:var(--bg);padding:9px 11px;border-radius:9px;line-height:1.6">💡 تعديل سعرك أو مدتك أو إرفاق عرض سعر يرفع فرصتك — العميل يشوف العرض المحدّث فوراً.</div>'
    +'</div>';
  var foot='<button class="btn-sm bs-p" onclick="closeModal()" style="flex:1;padding:10px">إلغاء</button>'
    +'<button id="eb-save" onclick="_saveBidEdit('+id+')" style="flex:1;padding:10px;background:var(--p3);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">حفظ التعديل</button>';
  openModal('تعديل العرض',body,foot);
  try{ if(window._bxMount)_bxMount((_myBids||[]).filter(function(b){return b.id===id;})[0]||{show_profile:true}); }catch(e){}
}
function _ebFile(inp){
  var f=inp.files&&inp.files[0]; window._ebAttach=null;
  var note=_el('eb-file-note');
  if(!f){if(note)note.textContent='استبدل الملف السابق برفع ملف جديد.';return;}
  if(f.size>5*1024*1024){if(note){note.textContent='⚠️ الحجم أكبر من 5MB';note.style.color='#dc2626';}inp.value='';return;}
  var rd=new FileReader();
  rd.onload=function(){window._ebAttach={data:rd.result,type:f.type,name:f.name};if(note){note.textContent='✓ '+f.name;note.style.color='#059669';}};
  rd.readAsDataURL(f);
}
async function _saveBidEdit(id){
  var btn=_el('eb-save'); if(btn){btn.disabled=true;btn.textContent='جاري الحفظ...';}
  var price=parseFloat((_el('eb-price')||{}).value||0);
  var days=parseInt((_el('eb-days')||{}).value||0);
  var note=((_el('eb-note')||{}).value||'').trim();
  if(!price||price<=0){ if(typeof showToast==='function')showToast('أدخل سعراً صحيحاً','error'); if(btn){btn.disabled=false;btn.textContent='حفظ التعديل';} return; }
  try{
    var _pv=((_el('eb-pvis')||{}).value==='public')?'public':'client';
    var _pl={price:price,days:days||null,note:note||null,price_visibility:_pv};
    if(_el('eb-mat'))_pl.materials=(_el('eb-mat').value||null);
    if(window._ebAttach&&window._ebAttach.data){_pl.attachment=window._ebAttach.data;_pl.attachment_name=window._ebAttach.name;}
    if(window._bxGet)Object.assign(_pl,_bxGet());
    var r=await _api('/api/bids/'+id,{method:'PUT',body:JSON.stringify(_pl)});
    if(r&&r.message){ if(typeof showToast==='function')showToast(r.message,'error'); if(btn){btn.disabled=false;btn.textContent='حفظ التعديل';} return; }
    if(!r)throw new Error();
    closeModal();
    if(typeof showToast==='function')showToast('تم تحديث عرضك ✓','success');
    _cacheSet('home_data',null); loadWorks(); try{_pvWarnLoad();}catch(e){}
  }catch(e){
    if(typeof showToast==='function')showToast('تعذّر الحفظ — تحقّق من اتصالك','error');
    if(btn){btn.disabled=false;btn.textContent='حفظ التعديل';}
  }
}
// تنبيه جودة العروض (بعد بلاغات من أصحاب مشاريع) — بدون اسم المبلّغ ولا المشروع
function _bidStandingBanner(){
  var st=window._bidStanding;if(!st||!st.warned)return '';
  return '<div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:16px;padding:15px;margin-bottom:14px;display:flex;gap:12px;align-items:flex-start">'
    +'<div style="width:32px;height:32px;border-radius:32px;background:#ea580c;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0">!</div>'
    +'<div style="flex:1;min-width:0"><div style="font-weight:900;font-size:14.5px;color:#9a3412;margin-bottom:4px">'+(st.review?'عروضك الجديدة تحت المراجعة':'عروضك تحتاج تحسين')+'</div>'
    +'<div style="font-size:12.5px;color:#7c2d12;line-height:1.8;font-weight:600">أصحاب مشاريع أبلغوا إن بعض عروضك عامة وما تخص مشاريعهم. العروض المنسوخة نادراً تنقبل.</div>'
    +'<div style="display:flex;flex-direction:column;gap:5px;margin-top:9px;font-size:12.5px;font-weight:800;color:#15803d"><span>✓ اذكر تفاصيل من وصف المشروع نفسه</span><span>✓ عبّ أي فراغ في النص مثل «(عدد)» قبل الإرسال</span><span>✓ قدّم على المشاريع اللي في تخصصك بس</span></div>'
    +'<div style="font-size:12px;color:#9a3412;font-weight:700;margin-top:9px;line-height:1.7">'+(st.review?'عروضك الجديدة تظهر للعملاء بعد موافقة الإدارة (خلال ساعات).':'لو استمرت البلاغات، عروضك الجديدة بتنتظر مراجعة الإدارة قبل ما تظهر للعملاء.')+'</div></div></div>';
}
function _renderBids(list){
  if(!list.length)return _empty('لا يوجد عروض','ابدأ بتصفح المشاريع');
  list=list.slice().sort(function(a,b){return (b.chance_open?1:0)-(a.chance_open?1:0);});
  return list.map(function(b){
    var isAcc=b.status==='accepted',isRej=b.status==='rejected';
    var stCls=isAcc?'wst-acc':isRej?'wst-rej':'wst-pend';
    var stLbl=isAcc?'مقبول':isRej?(b.chance_open?'فرصة ثانية':'غير مختار'):(b.improved_at?'✨ عرض محسّن':'قيد المراجعة');
    if(isRej&&b.chance_open)stCls='wst-acc';
    var isHeld=b.hold_state==='held',isHRej=b.hold_state==='rejected';
    var stSty=isHeld?' style="background:#fef3c7;color:#92400e"':(isHRej?' style="background:#fef2f2;color:#b91c1c"':'');
    if(isHeld)stLbl='تحت المراجعة';else if(isHRej)stLbl='لم يُعتمد';
    var _wn=(_pvWarns||[]).some(function(w){return String(w.bid_id)===String(b.id);});
    if(_wn&&!isAcc){stLbl='⚠️ يحتاج تعديل';stSty=' style="background:#fee2e2;color:#b91c1c"';}
    var h='<div class="wz-item">';
    h+='<div class="wz-head"><div class="wz-title">'+_esc(b.request_title||'مشروع #'+b.request_id)+'</div><span class="wz-status '+stCls+'"'+stSty+'>'+stLbl+'</span></div>';
    if(typeof _rjProvHtml==='function')h+=_rjProvHtml(b);
    if(typeof _clmBidHtml==='function')h+=_clmBidHtml(b);
    if(isHeld)h+='<div style="background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:9px 12px;font-size:12.5px;font-weight:700;margin-bottom:8px;line-height:1.7">⏳ عرضك بانتظار موافقة الإدارة — بيظهر لصاحب المشروع بعد المراجعة</div>';
    if(isHRej)h+='<div style="background:#fef2f2;border:1px solid #fecaca;color:#991b1b;border-radius:10px;padding:9px 12px;font-size:12.5px;font-weight:700;margin-bottom:8px;line-height:1.7">عرضك ما ظهر لصاحب المشروع'+(b.hold_reason?' — السبب: '+_esc(b.hold_reason):'')+'. عدّله بتفاصيل تخص المشروع ويرجع للمراجعة.</div>';
    h+='<div class="wz-summary">';
    h+='<div class="wz-cell"><div class="wz-lbl">المبلغ</div><div class="wz-val gold">'+fmtN(b.price)+' <span class="wz-u">ر.س</span></div></div>';
    if(b.days)h+='<div class="wz-cell"><div class="wz-lbl">مدة التنفيذ</div><div class="wz-val">'+b.days+' <span class="wz-u">يوم</span></div></div>';
    h+='<div class="wz-cell"><div class="wz-lbl">تاريخ العرض</div><div class="wz-val sm">'+_fdt(b.created_at)+'</div></div>';
    h+='</div>';
    if(b.note)h+='<div class="wz-note fmt-text">'+fmtText(b.note)+'</div>';
    if((b.status==='pending'||!b.status)&&!isHeld&&!isHRej){h+=b.seen_at?'<div style="margin-top:8px;display:inline-flex;align-items:center;gap:5px;background:#dcfce7;color:#15803d;font-size:11.5px;font-weight:800;padding:4px 11px;border-radius:999px">👁 العميل شاف عرضك — وقت مناسب تتواصل</div>':'<div style="margin-top:8px;display:inline-flex;align-items:center;gap:5px;background:var(--bg);color:var(--muted);font-size:11.5px;font-weight:800;padding:4px 11px;border-radius:999px">لم يطّلع عليه العميل بعد</div>';}
    if(b.contact_unlocked && b.client_phone){
      var _pc=String(b.client_phone).replace(/[^0-9]/g,'');
      var _wn=_pc.indexOf('966')===0?_pc:(_pc.indexOf('0')===0?'966'+_pc.slice(1):'966'+_pc);
      var _wt='مرحباً '+(b.client_name||'')+'،\nأتواصل معك عبر منصة مناقصة بشأن مشروعكم: '+(b.request_title||'')+'\nأنا '+((typeof _me!=='undefined'&&_me&&_me.name)||'المزود')+'.';
      h+='<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:11px 13px;margin-top:10px">';
      h+='<div style="font-size:12px;font-weight:800;color:#166534;margin-bottom:8px">📞 تواصل مع '+_esc(b.client_name||'العميل')+'</div>';
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
      h+='<a href="https://wa.me/'+_wn+'?text='+encodeURIComponent(_wt)+'" target="_blank" style="padding:10px;background:#25d366;color:#fff;border-radius:9px;font-size:12px;font-weight:700;text-decoration:none;text-align:center;font-family:Tajawal,sans-serif">واتساب</a>';
      h+='<a href="tel:'+_esc(b.client_phone)+'" style="padding:10px;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:9px;font-size:12px;font-weight:700;text-decoration:none;text-align:center;font-family:Tajawal,sans-serif">اتصال</a>';
      h+='</div>';
      h+='<div style="font-size:10.5px;color:#64748b;margin-top:8px;line-height:1.6">💡 التعامل داخل المنصة يحفظ حقوقك والضمان.</div>';
      h+='</div>';
    } else if(!isRej){
      h+='<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:11px 13px;margin-top:10px;font-size:11.5px;color:#92620e;line-height:1.7">⚠️ لمشاهدة بيانات العميل والتواصل معه: أرفق عرضاً حقيقياً وواضحاً (سعر + تفاصيل كافية أو ملف عرض سعر). العروض الفاضية أو العبث تعرّض حسابك للإيقاف.</div>';
    }
    h+=_askBlock(b);
    h+='<div class="card-actions"><button onclick="_viewProj('+b.request_id+')" class="ca-btn ca-view">عرض المشروع</button>';
    if(b.client_id)h+='<button class="_bchat ca-btn ca-chat" data-rid="'+b.request_id+'" data-cid="'+b.client_id+'">محادثة</button>';
    if(!isAcc&&!isRej){
      h+='<button onclick="_editBidById('+(parseInt(b.id)||0)+')" class="ca-btn ca-view">تعديل العرض</button>';
      h+='<button onclick="_delBid('+b.id+')" class="ca-btn ca-del">سحب</button>';
    }
    h+='</div></div>';
    return h;
  }).join('');
}

async function _delBid(id){if(!confirm('سحب هذا العرض؟'))return;var r=await _api('/api/bids/'+id,{method:'DELETE'});
  // نتأكد إن السحب نجح فعلاً قبل رسالة النجاح
  if(!r||!r.ok){showToast((r&&r.message)||'تعذّر سحب العرض — حاول مرة ثانية','error');return;}
  showToast('تم سحب العرض','success');loadWorks();}
// تعديل العرض: نجيب بيانات العرض من _myBids بدل ما نحطها داخل onclick
function _editBidById(id){var b=(_myBids||[]).find(function(x){return String(x.id)===String(id);});if(!b)return;
  _editBid(b.id,b.price||0,b.days||0,String(b.note||'').replace(/\n/g,' '),b.price_visibility||'client',b.materials||'');}
function _renderProjs(list){
  if(!list.length)return _empty('لا يوجد مشاريع','');
  return list.map(function(r){
    var isProg=r.status==='in_progress';
    var stCls=isProg?'wst-prog':'wst-acc';var stLbl=isProg?'جارٍ':'مكتمل';
    var h='<div class="wz-item">';
    h+='<div class="wz-head"><div class="wz-titwrap">';
    if(r.category)h+='<div class="wz-cat">'+_esc(r.category)+'</div>';
    h+='<div class="wz-title">'+_esc(r.title)+'</div>';
    h+='<div class="wz-sub">'+(r.project_number||'#'+r.id)+(r.city?' · '+_esc(r.city):'')+'</div>';
    h+='</div><span class="wz-status '+stCls+'">'+stLbl+'</span></div>';
    if(r.price)h+='<div class="wz-summary"><div class="wz-cell"><div class="wz-lbl">قيمة المشروع</div><div class="wz-val gold">'+fmtN(r.price)+' <span class="wz-u">ر.س</span></div></div></div>';
    if(typeof _clmProjHtml==='function')h+=_clmProjHtml(r);
    h+='<div class="card-actions"><button onclick="_viewProj('+r.id+')" class="ca-btn ca-view">عرض التفاصيل</button>';
    if(r.client_id)h+='<button class="_pchat ca-btn ca-chat" data-rid="'+r.id+'" data-cid="'+r.client_id+'">محادثة</button>';
    h+='</div></div>';
    return h;
  }).join('');
}

async function loadReviews(){
  var pg=_el('page-reviews');if(!pg)return;pg.innerHTML=_skList(4);
  var list=[];try{list=await _api('/api/provider/reviews')||[];}catch(e){}
  if(!Array.isArray(list))list=[];
  var avg=list.length?(list.reduce(function(s,r){return s+(r.rating||0);},0)/list.length).toFixed(1):'—';
  var html='<div class="pghd"><div class="pg-t">تقييماتي</div><div class="pg-s">'+list.length+' تقييم</div></div>';
  if(list.length){
    var fullStars=Math.round(parseFloat(avg)||0);
    var starsHtml='';for(var si=1;si<=5;si++){starsHtml+='<span style="color:'+(si<=fullStars?'var(--gold)':'var(--border2)')+'">&#9733;</span>';}
    html+='<div class="rev-avg"><div class="rev-avg-num">'+avg+'</div><div class="rev-avg-stars">'+starsHtml+'</div><div class="rev-avg-lbl">معدل التقييم من '+list.length+' تقييم</div></div>';
  }
  html+='<div class="card card-accent">';
  if(list.length){
    list.forEach(function(r){
      var initials=_esc((r.reviewer_name||'ع')[0]);
      html+='<div style="background:var(--white);border-radius:12px;margin-bottom:8px;border:1px solid var(--border);padding:12px 14px"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><div style="display:flex;align-items:center;gap:10px"><div style="width:36px;height:36px;border-radius:10px;background:var(--p);color:#fff;font-size:14px;font-weight:900;display:flex;align-items:center;justify-content:center">'+initials+'</div><div><div style="font-size:13px;font-weight:800;color:var(--text)">'+_esc(r.reviewer_name||'عميل')+'</div><div style="font-size:10px;color:var(--muted)">'+_fdt(r.created_at)+'</div></div></div><div>'+_stars(r.rating)+'</div></div>';
      if(r.comment)html+='<div style="font-size:12px;color:var(--text2);background:var(--bg);padding:8px 12px;border-radius:8px;border-right:3px solid var(--gold);line-height:1.8">'+_esc(r.comment)+'</div>';
      if(r.images&&r.images.length){
        html+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';
        r.images.forEach(function(img){img=_safeUrl(img);if(!img)return;html+='<div onclick="_viewImg(this.dataset.s)" data-s="'+_esc(img)+'" style="width:60px;height:60px;border-radius:8px;overflow:hidden;cursor:pointer;border:1px solid var(--border)"><img loading="lazy" src="'+_esc(img)+'" style="width:100%;height:100%;object-fit:cover"></div>';});
        html+='</div>';
      }
      if(r.provider_reply){
        html+='<div style="margin-top:8px;background:var(--p-light);border-radius:8px;padding:8px 12px;border-right:3px solid var(--p)"><div style="font-size:10px;font-weight:800;color:var(--p);margin-bottom:3px">ردّك</div><div style="font-size:12px;color:var(--text2);line-height:1.7">'+_esc(r.provider_reply)+'</div></div>';
      } else {
        html+='<button onclick="openReply('+r.id+')" style="margin-top:8px;background:none;border:1px solid var(--border);border-radius:8px;padding:7px 14px;font-family:Tajawal;font-size:12px;font-weight:700;color:var(--p);cursor:pointer">الرد على التقييم</button>';
      }
      html+='</div>';
    });
  }else{html+=_empty('لا يوجد تقييمات بعد','أنجز مشاريع لتحصل على تقييمات');}
  html+='</div>';
  pg.innerHTML=html;_lb.done();
}

function _notifMeta(type){
  var bell='<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>';
  var m={
    new_bid:{bg:'var(--p-light)',c:'var(--p)',ic:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>'},
    new_request:{bg:'var(--p-light)',c:'var(--p)',ic:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'},
    bid_accepted:{bg:'var(--green-l)',c:'var(--green)',ic:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'},
    bid_rejected:{bg:'#f1f5f9',c:'var(--muted)',ic:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'},
    message:{bg:'#e0f2fe',c:'var(--sky)',ic:'<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>'},
    review:{bg:'var(--gold-l)',c:'#F0A500',ic:'<svg width="18" height="18" fill="#F0A500" stroke="none" viewBox="0 0 24 24"><polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9"/></svg>'}
  };
  return m[type]||{bg:'var(--p-light)',c:'var(--p)',ic:bell};
}
// تعليم إشعار واحد كمقروء (المزوّد)
function _pNotifMarkOne(id){
  var el=_el('pnotif-'+id); if(el){el.style.background='';el.style.margin='';el.querySelector('div[style*="flex-direction:column"]').innerHTML='';}
  _api('/api/notifications/'+id+'/read',{method:'PUT'});
  _loadNotifCount();
  if(typeof showToast==='function')showToast('تم ✓','success');
}
// تأجيل إشعار (المزوّد)
function _pNotifSnooze(id){
  var el=_el('pnotif-'+id);
  if(el){el.style.transition='opacity .25s';el.style.opacity='0';setTimeout(function(){if(el)el.style.display='none';},260);}
  if(typeof showToast==='function')showToast('تم التأجيل','success');
}
// حذف كل الإشعارات (المزوّد)
function _deleteAllNotifs(){
  if(!confirm('حذف كل الإشعارات نهائياً؟'))return;
  _api('/api/notifications',{method:'DELETE'}).then(function(){
    _cacheSet('notifs',[]);
    if(_curPage==='notifs')loadNotifs();
    ['nb-notif','mob-nb'].forEach(function(id){var el=_el(id);if(el)el.style.display='none';});
    if(typeof showToast==='function')showToast('تم حذف كل الإشعارات','success');
  }).catch(function(){if(typeof showToast==='function')showToast('تعذّر الحذف — تحقّق من اتصالك','error');});
}
async function _markRead(){
  await _api('/api/notifications/read',{method:'PUT'});
  ['nb-notif','mob-nb'].forEach(function(id){var el=_el(id);if(el)el.style.display='none';});
  if(_curPage==='notifs')loadNotifs();
}
function _loadNotifCount(){
  _api('/api/notifications').then(function(ns){
    if(!Array.isArray(ns))return;
    var u=ns.filter(function(n){return !n.is_read;}).length;
    ['nb-notif','mob-nb'].forEach(function(id){var el=_el(id);if(!el)return;el.style.display=u?'':'none';el.textContent=u;});
  });
}

// إيقاف التحديث عند إخفاء الصفحة (توفير بطارية وشبكة)
var _pollPaused=false;
document.addEventListener('visibilitychange',function(){
  _pollPaused=document.hidden;
});
setInterval(function(){if(!_pollPaused){_loadNotifCount();_loadChatBadge();}},35000);

// ═══ PROFILE — مُصلح: dangerZone مُعرَّف قبل insertBefore ═══
async function loadProfile(){
  var pg=_el('page-profile');if(!pg)return;
  pg.innerHTML=_skList(3);
  var p=await _api('/api/provider/profile')||{};
  var reviews=await _api('/api/provider/reviews')||[];
  var projs=await _api('/api/provider/projects')||[];
  var totalBids=_myBids.length||0;
  try{if(!_myBids.length){var bids=await _api('/api/provider/bids')||[];if(Array.isArray(bids)){_myBids=bids;totalBids=bids.length;}}}catch(e){}
  var completed=Array.isArray(projs)?projs.filter(function(x){return x.status==='completed';}).length:0;
  var avgR=Array.isArray(reviews)&&reviews.length?(reviews.reduce(function(s,r){return s+(r.rating||0);},0)/reviews.length).toFixed(1):(p.avg_rating?Number(p.avg_rating).toFixed(1):'—');
  var avHtml=_safeUrl(p.profile_image)?'<img loading="lazy" src="'+_esc(_safeUrl(p.profile_image))+'" style="width:100%;height:100%;object-fit:cover">':'<span style="font-size:28px;font-weight:900;color:var(--p2)">'+_esc((p.name||'م')[0])+'</span>';
  var portImgs=p.portfolio_images||[];
  pg.innerHTML='';

  var hdr=document.createElement('div');
  var _pci=[{l:'الصورة الشخصية',d:!!p.profile_image,t:'av'},{l:'التخصصات',d:(p.specialties||[]).length>0,t:'specs'},{l:'نبذة عنك',d:!!(p.bio&&String(p.bio).trim()),t:'info'},{l:'صور أعمالك',d:portImgs.length>0,t:'port'},{l:'سنوات الخبرة',d:!!p.experience_years,t:'info'}];
  var _pcp=Math.round(_pci.filter(function(x){return x.d;}).length/_pci.length*100);
  hdr.className='pf-hero';
  hdr.innerHTML='<div class="pf-top">'
    +'<div class="pf-avw"><div id="av-preview" class="pf-av" onclick="document.getElementById(&quot;av-inp&quot;).click()">'+avHtml+'</div>'
    +'<button class="pf-cam" aria-label="تغيير الصورة" onclick="document.getElementById(&quot;av-inp&quot;).click()"><svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg></button>'
    +'<input type="file" id="av-inp" accept="image/*" style="display:none" onchange="_uploadAvatar(this)"></div>'
    +'<div style="flex:1;min-width:0"><div class="pf-name">'+_esc(p.business_name||p.name||'المزود')+'</div>'
    +'<div class="pf-badges">'+_tierBadge(p.tier)+_pubBadge(p.badge)+'</div>'
    +'<div class="pf-sub">'+[p.city?_esc(p.city):'',(p.specialties||[]).slice(0,2).map(_esc).join('، ')].filter(Boolean).join(' · ')+'</div></div></div>'
    +'<div class="pf-stats"><div><b>'+totalBids+'</b><span>عروض</span></div><div><b class="g">'+completed+'</b><span>مكتملة</span></div><div><b>'+avgR+(avgR!=='—'?' <i>★</i>':'')+'</b><span>'+(Array.isArray(reviews)&&reviews.length?reviews.length+' تقييم':'التقييم')+'</span></div></div>'
    +(_pcp<100?'<div class="pf-pc"><div class="pf-pc-h"><span>اكتمال ملفك</span><b>'+_pcp+'%</b></div><div class="pf-pc-bar"><i style="width:'+_pcp+'%"></i></div>'
      +'<div class="pf-pc-chips">'+_pci.filter(function(x){return !x.d;}).map(function(x){return '<button onclick="_pfGo(\''+x.t+'\')">+ '+x.l+'</button>';}).join('')+'</div>'
      +'<div class="pf-pc-note">الملف المكتمل يزيد ثقة العملاء وفرص قبول عروضك</div></div>'
      :'<div class="pf-pc done">✓ ملفك مكتمل — العملاء يشوفونك بأفضل صورة</div>');
  pg.appendChild(hdr);

  // بطاقة «صفحتك العامة» انشالت — يكفي الزر الذهبي «صفحتي» فوق (العنصر يبقى مخفي كنقطة ربط لترتيب المحفظة)
  var previewCard=document.createElement('div');previewCard.className='pf-pub';previewCard.style.display='none';
  pg.appendChild(previewCard);

  var infoCard=document.createElement('div');infoCard.className='card card-accent';
  infoCard.innerHTML='<div class="ch"><div class="ch-l"><h3>معلومات المنشأة</h3></div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
    +'<div class="fg"><label>الاسم أو اسم النشاط التجاري</label><input id="p-name" placeholder="محمد العمري أو مؤسسة العمري للمقاولات"></div>'
    +'<input type="hidden" id="p-bname">'
    +'<div class="fg"><label>رقم الجوال</label><input id="p-phone"></div>'
    +'<div class="fg"><label>سنوات الخبرة</label><input type="number" id="p-exp"></div>'
    +'<div class="fg" style="grid-column:1/-1"><label>البريد الإلكتروني</label><input type="email" id="p-email" placeholder="example@email.com"></div>'
    +'<div class="fg" style="grid-column:1/-1" id="cityWrap"><label>المدينة</label></div>'
    +'<div class="fg" style="grid-column:1/-1"><label style="display:flex;align-items:center;gap:9px;cursor:pointer;font-weight:600"><input type="checkbox" id="p-allcities" style="width:18px;height:18px;flex-shrink:0"><span>أخدم كل المدن — تصلني مشاريع من جميع المدن</span></label></div>'
    +'<div class="fg" style="grid-column:1/-1" id="p-svcwrap"><label>مدن أخرى تخدمها (اختياري)</label><select id="p-svc-sel" onchange="_pSvcAdd()" style="width:100%;padding:11px;border:1px solid var(--border);border-radius:9px;font-family:Tajawal,sans-serif"><option value="">أضف مدينة تخدمها...</option></select><div id="p-svc-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px"></div></div>'
    +'<div class="fg" style="grid-column:1/-1"><label>نبذة عن الأعمال</label><textarea id="p-bio" style="min-height:80px" placeholder="اكتب نبذة احترافية..."></textarea></div>'
    +'</div>';
  pg.appendChild(infoCard);
  _el('p-name').value=p.name||'';_el('p-bname').value=p.business_name||'';_el('p-phone').value=p.phone||'';_el('p-exp').value=p.experience_years||'';_el('p-email').value=p.email||'';_el('p-bio').value=p.bio||'';var _ac=_el('p-allcities');if(_ac)_ac.checked=!!p.serves_all_cities;window._pSvc=Array.isArray(p.service_cities)?p.service_cities.slice():[];var _ss=_el('p-svc-sel');if(_ss&&typeof CITIES!=='undefined'){CITIES.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;_ss.appendChild(o);});}_pSvcRender();var _pw=_el('p-svcwrap');if(_pw)_pw.style.display=(_ac&&_ac.checked)?'none':'';if(_ac)_ac.onchange=function(){var w=_el('p-svcwrap');if(w)w.style.display=this.checked?'none':'';};
  var citySelect=document.createElement('select');citySelect.id='p-city';
  var defOpt=document.createElement('option');defOpt.value='';defOpt.textContent='اختر المدينة';citySelect.appendChild(defOpt);
  CITIES.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;if(c===p.city)o.selected=true;citySelect.appendChild(o);});
  _el('cityWrap').appendChild(citySelect);

  var specsCard=document.createElement('div');specsCard.className='card';
  var specsList=p.specialties||[];
  specsCard.innerHTML='<div class="ch"><div class="ch-l"><h3>التخصصات</h3></div><span id="specs-count" style="font-size:12px;font-weight:800;color:#fff;background:var(--p);padding:4px 10px;border-radius:20px">'+specsList.length+'/5</span></div>'
    +'<select id="pspec-sel" onchange="_pSpecAdd()" style="width:100%;padding:11px;border:1.5px solid var(--border);border-radius:10px;font-family:Tajawal,sans-serif;background:var(--bg)"><option value="">أضف تخصصاً...</option></select>'
    +'<div id="pspec-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px"></div>'
    +'<div style="font-size:10px;color:var(--muted);margin-top:8px">اختر حتى 5 تخصصات — تصلك إشعارات المشاريع المطابقة لها</div>';
  pg.appendChild(specsCard);
  window._provSpecSel=(specsList||[]).slice();
  var _psel=_el('pspec-sel'); if(_psel){CATS.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;_psel.appendChild(o);});}
  _pSpecRender();

  var portCard=document.createElement('div');portCard.className='card';
  var portHtml='<div class="ch"><div class="ch-l"><h3>معرض الأعمال</h3></div><span style="font-size:11px;color:var(--muted)">'+portImgs.length+'/6</span></div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">';
  portImgs.forEach(function(img,i){img=_esc(_safeUrl(img));portHtml+='<div style="position:relative;border-radius:8px;overflow:hidden;aspect-ratio:1"><img loading="lazy" src="'+img+'" style="width:100%;height:100%;object-fit:cover;cursor:pointer" onclick="openImgFull(this.dataset.s)" data-s="'+img+'"><button onclick="_delPortImg('+i+')" style="position:absolute;top:4px;left:4px;background:rgba(220,38,38,.85);border:none;cursor:pointer;width:22px;height:22px;border-radius:50%;color:#fff;font-size:13px;display:flex;align-items:center;justify-content:center">&#215;</button></div>';});
  if(portImgs.length<6){portHtml+='<div onclick="document.getElementById(&quot;port-inp&quot;).click()" style="border:2px dashed var(--border);border-radius:8px;aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;gap:5px;background:var(--bg)"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--muted)" stroke-width="1.8"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg><span style="font-size:11px;color:var(--muted)">إضافة</span></div>';}
  portHtml+='</div><input type="file" id="port-inp" accept="image/*" multiple style="display:none" onchange="_uploadPort(this)">';
  portCard.innerHTML=portHtml;pg.appendChild(portCard);

  // ── بروفايل الشركة: يُرفع مرة وحدة ويطلع مع العروض ──
  var cpCard=document.createElement('div');cpCard.className='card';cpCard.id='cp-card';cpCard.style.cssText='margin-bottom:14px';
  cpCard.innerHTML=_cpCardHtml(p);pg.appendChild(cpCard);

  var socialCard=document.createElement('div');socialCard.className='card';socialCard.style.cssText='margin-bottom:14px';
  var socFields=[
    {id:'p-website',   label:'الموقع الإلكتروني', val:p.website||'',   ph:'https://example.com'},
    {id:'p-location',  label:'الموقع الجغرافي (خرائط جوجل)', val:p.location_url||'', ph:'https://maps.google.com/...'},
    {id:'p-instagram', label:'انستقرام',           val:p.instagram||'', ph:'https://instagram.com/username'},
    {id:'p-twitter',   label:'تويتر / X',          val:p.twitter||'',   ph:'https://x.com/username'},
    {id:'p-snapchat',  label:'سناب شات',           val:p.snapchat||'',  ph:'https://snapchat.com/add/username'},
    {id:'p-tiktok',    label:'تيك توك',             val:p.tiktok||'',    ph:'https://tiktok.com/@username'},
    {id:'p-youtube',   label:'يوتيوب',             val:p.youtube||'',   ph:'https://youtube.com/...'},
  ];
  var socHtml='<div style="font-size:14px;font-weight:900;color:var(--text);margin-bottom:4px">روابط التواصل</div><div style="font-size:11px;color:var(--muted);margin-bottom:14px">اختيارية — تظهر في بطاقتك الشخصية</div>';
  socFields.forEach(function(f){
    socHtml+='<div style="margin-bottom:10px"><label style="font-size:12px;font-weight:700;color:var(--muted);display:block;margin-bottom:4px">'+f.label+'</label>'
      +'<div style="display:flex;align-items:center;gap:6px">'
      +'<input id="'+f.id+'" type="text" placeholder="'+f.ph+'" value="'+_esc(f.val)+'" style="flex:1;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;font-family:Tajawal,sans-serif;background:var(--bg);direction:ltr;text-align:left">'
      +'<button class="_soc-prev" data-id="'+f.id+'" style="padding:10px 12px;background:var(--bg);border:1.5px solid var(--border);border-radius:10px;cursor:pointer;font-size:14px;flex-shrink:0;line-height:1" title="معاينة">&#8599;</button>'
      +'</div></div>';
  });
  socialCard.innerHTML=socHtml;
  pg.appendChild(socialCard);
  socialCard.querySelectorAll('._soc-prev').forEach(function(btn){
    btn.addEventListener('click',function(){
      var val=(document.getElementById(btn.getAttribute('data-id'))||{}).value||'';
      if(!val){showToast('أدخل الرابط أولاً','error');return;}
      window.open(val.startsWith('http')?val:'https://'+val,'_blank');
    });
  });

  // إصلاح 1: dangerZone مُعرَّف قبل pg.appendChild
  var dangerZone=document.createElement('div');dangerZone.className='danger-zone';dangerZone.style.marginTop='4px';
  dangerZone.innerHTML='<div class="danger-zone-title"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>منطقة الخطر</div>'
    +'<div class="danger-zone-desc">حذف الحساب إجراء نهائي ولا يمكن التراجع عنه. سيتم حذف جميع بياناتك وعروضك وصور المعرض ورسائلك بشكل دائم. إذا كان لديك مشاريع قيد التنفيذ، يجب إكمالها أولاً.</div>'
    +'<button class="btn-delete-account" onclick="openDeleteAccount()"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/></svg>حذف الحساب نهائياً</button>';
  pg.appendChild(dangerZone);

  var pwCard=document.createElement('div');pwCard.className='card';pwCard.style.cssText='margin-bottom:14px';
  pwCard.innerHTML='<div style="font-size:14px;font-weight:900;color:var(--text);margin-bottom:14px">تغيير كلمة المرور</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px"><div class="fg"><label>الحالية</label><input type="password" id="pw-old"></div><div class="fg"><label>الجديدة</label><input type="password" id="pw-new"></div></div><button class="btn-sm bs-p" onclick="_changePw()">تغيير كلمة المرور</button>';
  pg.appendChild(pwCard);

  var saveWrap=document.createElement('div');saveWrap.style.cssText='padding:14px 0 20px';
  saveWrap.innerHTML='<button id="save-btn" onclick="_saveProfile()" style="width:100%;padding:14px;background:var(--p3);border:none;color:#fff;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:Tajawal,sans-serif">حفظ جميع التغييرات</button>';
  pg.appendChild(saveWrap);

  var acctWrap=document.createElement('div');acctWrap.style.cssText='padding:0 0 26px';
  acctWrap.innerHTML=
    '<button onclick="location.href=\'/\'" style="width:100%;margin-bottom:10px;padding:13px;background:var(--p-light);color:var(--p2);border:1px solid #bfdbfe;border-radius:12px;font-family:Tajawal,sans-serif;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>الصفحة الرئيسية</button>'
    +(p.can_request?'<a href="/dashboard-client.html" style="display:flex;width:100%;margin-bottom:12px;padding:13px;background:var(--p-light);color:var(--p2);border:1px solid #bfdbfe;border-radius:12px;font-family:Tajawal,sans-serif;font-size:14px;font-weight:800;text-decoration:none;align-items:center;justify-content:center;gap:8px;box-sizing:border-box">اذهب إلى لوحة العميل ←</a>':'<div style="margin-bottom:12px;border:1.5px solid #bfdbfe;border-radius:14px;padding:16px;background:linear-gradient(135deg,#eff6ff,#f8fafc)"><div style="font-weight:900;font-size:15px;color:var(--p2);margin-bottom:5px">تحتاج تنشر مشروعاً؟</div><div style="font-size:12.5px;color:#475569;line-height:1.7;margin-bottom:12px">فعّل «نشر المشاريع» لتنشر مشاريعك وتستقبل عروضاً — من نفس الحساب.</div><button onclick="enableRequestRole(this)" style="width:100%;padding:12px;background:var(--p2);color:#fff;border:none;border-radius:11px;font-family:Tajawal,sans-serif;font-weight:800;font-size:14px;cursor:pointer">فعّل نشر المشاريع</button></div>')+'<a id="supportBtn" href="#" onclick="openSupport(event)" style="display:flex;width:100%;margin-bottom:12px;padding:13px;background:#25D366;color:#fff;border-radius:12px;font-family:Tajawal,sans-serif;font-size:14px;font-weight:800;cursor:pointer;align-items:center;justify-content:center;gap:8px;text-decoration:none;box-sizing:border-box"><svg width="17" height="17" viewBox="0 0 24 24" fill="#fff"><path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg>تواصل مع خدمة العملاء</a>'+'<button onclick="doLogout()" style="width:100%;padding:13px;background:var(--red-l);color:var(--red);border:1px solid #fecaca;border-radius:12px;font-family:Tajawal,sans-serif;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>تسجيل الخروج</button>';
  pg.appendChild(acctWrap);
  try{_pfEnhance(pg,{info:infoCard,specs:specsCard,port:portCard,social:socialCard,pw:pwCard,save:saveWrap,acct:acctWrap,danger:dangerZone,pub:previewCard});}catch(e){console.error(e);}
  _lb.done();
}


// ═══ «حسابي» — تنظيم الأقسام + شريط حفظ ثابت ═══
function _pfSection(key,title,sub,icon,node,open){
  var d=document.createElement('details');d.className='pf-sec';d.id='pf-sec-'+key;if(open)d.open=true;
  d.innerHTML='<summary><span class="pf-sec-ic">'+icon+'</span><span class="pf-sec-tx"><b>'+title+'</b><small>'+sub+'</small></span><svg class="pf-chev" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></summary><div class="pf-sec-b"></div>';
  var body=d.querySelector('.pf-sec-b');
  // انقل محتوى البطاقة القديمة (بدون عنوانها المكرر)
  var h=node.querySelector(':scope > .ch'); if(h){ var cnt=h.querySelector('span'); if(cnt){cnt.classList.add('pf-cnt'); d.querySelector('summary').insertBefore(cnt,d.querySelector('.pf-chev'));} h.remove(); }
  var first=node.firstElementChild; if(first&&!first.id&&/روابط التواصل|تغيير كلمة المرور/.test(first.textContent||'')&&first.children.length===0) first.remove();
  while(node.firstChild) body.appendChild(node.firstChild);
  node.replaceWith(d);
  return d;
}

function _pfWallet(){
  var box=_el('pf-wal'); if(!box)return;
  _api('/api/provider/saai').then(function(d){
    d=d||{}; var items=Array.isArray(d.items)?d.items:[];
    var pend=items.filter(function(x){return x.status==='pending';});
    var subm=items.filter(function(x){return x.status==='submitted';});
    var unpaid=items.filter(function(x){return x.status==='pending'||x.status==='deferred';});
    var due=pend.reduce(function(a,x){return a+(parseFloat(x.saai_amount)||0);},0);
    var noAmt=pend.filter(function(x){return !(parseFloat(x.contract_value)>0);}).length;
    var I='<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M20 12V8H6a2 2 0 010-4h12v4"/><path d="M4 6v12a2 2 0 002 2h14v-4"/><path d="M18 12a2 2 0 000 4h4v-4z"/></svg>';
    var st,pill,body='';
    if(pend.length){
      var oldest=pend.reduce(function(m,x){var t=new Date(x.due_from||x.created_at).getTime();return (!m||t<m)?t:m;},0);
      var left=Math.ceil((oldest+10*86400000-Date.now())/86400000);
      var late=left<0; st=late?'late':'due';
      pill=late?'<span class="pf-wal-pill late">متأخر</span>':'<span class="pf-wal-pill due">مستحق</span>';
      var pct=Math.min(100,Math.max(4,Math.round((Date.now()-oldest)/(10*86400000)*100)));
      body='<div class="pf-wal-amt"><div><div class="pf-wal-k">المبلغ المستحق عليك <span class="pf-wal-est">تقديري</span></div><div class="pf-wal-n">'+fmtN(due)+' <small>ر.س</small></div></div>'
        +'<div class="pf-wal-days'+(late?' late':'')+'">'+(late?'متأخر '+Math.abs(left)+' يوم':(left<=0?'آخر يوم اليوم':'باقي '+left+(left===1?' يوم':(left===2?' يومين':' أيام'))))+'</div></div>'
        +'<div class="pf-wal-bar"><i style="width:'+pct+'%"></i></div><div class="pf-wal-bl"><span>تاريخ الاتفاق</span><span>آخر موعد للسداد</span></div>'
        +(noAmt?'<div class="pf-wal-note">'+(noAmt===1?'مشروع واحد':noAmt+' مشاريع')+' يحتاج تحدد مبلغ الاتفاق النهائي</div>':'');
    }else if(unpaid.length){
      st='due'; pill='<span class="pf-wal-pill wait">مؤجّل</span>';
      body='<div class="pf-wal-msg">'+(unpaid.length===1?'مشروع مؤجّل':unpaid.length+' مشاريع مؤجّلة')+' — اتفقتوا؟ سدّد الحين بدون ما تنتظر.</div>';
    }else if(subm.length){
      st='wait'; pill='<span class="pf-wal-pill wait">بانتظار الاعتماد</span>';
      body='<div class="pf-wal-msg">أرسلت إيصال السداد — تراجعه الإدارة وتعتمده قريباً.</div>';
    }else{
      st='ok'; pill='<span class="pf-wal-pill ok">ما عليك شي ✓</span>';
      body='<div class="pf-wal-msg">ما عليك سعي مستحق داخل المنصة. اتفقت مع عميل برا العروض؟ سدّد من الزر تحت.</div>';
    }
    box.className='pf-wal '+st;
    box.innerHTML='<div class="pf-wal-h"><span class="pf-wal-ic">'+I+'</span><div style="flex:1;min-width:0"><div class="pf-wal-t">محفظة السعي</div><div class="pf-wal-s">سعي المنصة 3% من مبلغ الاتفاق النهائي</div></div>'+pill+'</div>'
      +body
      +(items.length?'<div class="pf-wal-stats"><div><b>'+fmtN(d.contract_total||0)+'</b><span>إجمالي العقود</span></div><div><b class="g">'+fmtN(d.approved_total||0)+'</b><span>مدفوع ومعتمد</span></div><div><b class="b">'+pend.length+'</b><span>مشروع مستحق</span></div></div>':'')
      +(unpaid.length?'<div class="pf-wal-btns"><button class="pf-wal-b1" style="flex:1" onclick="gotoPage(\'saai\')">سدّد وارفع الإيصال</button></div>'
        :'<div class="pf-wal-btns"><button class="pf-wal-b1" style="flex:1" onclick="_spSelfOpen()">سدّد السعي</button></div><div style="font-size:11.5px;color:var(--muted);font-weight:700;text-align:center;margin-top:8px;line-height:1.7">اتفقت مع عميل من المنصة؟ سدّد سعيك هنا حتى لو ما قبل عرضك داخل المنصة</div>');
  }).catch(function(){ box.innerHTML=''; box.style.display='none'; });
}
function _pfGo(t){
  if(t==='av'){ var i=document.getElementById('av-inp'); if(i)i.click(); return; }
  var d=document.getElementById('pf-sec-'+t); if(!d)return; d.open=true; d.scrollIntoView({behavior:'smooth',block:'start'});
}
// ═══ رابط صفحتي: نسخ + مشاركة + وين يحطه ═══
function _pfLinkUrl(){ var id=(_me&&_me.id)||(window._prof&&window._prof.id); return location.origin+'/pro/'+id; }
function _pfLinkHtml(){
  var u=_pfLinkUrl(), shown=u.replace(/^https?:\/\//,'').replace(/^www\./,'');
  var txt='شوف أعمالنا وتقييمات عملائنا على منصة مناقصة 👇';
  var ic=function(bg,svg,lbl,on){ return '<button type="button" onclick="'+on+'" style="border:0;background:none;padding:0;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:5px"><span style="width:46px;height:46px;border-radius:14px;background:'+bg+';display:flex;align-items:center;justify-content:center">'+svg+'</span><span style="font-size:11.5px;font-weight:800;color:#334766">'+lbl+'</span></button>'; };
  var W='<svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.4.6-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.1z"/></svg>';
  var T='<svg width="22" height="22" viewBox="0 0 24 24"><path d="M14 3c.4 2.6 2 4.3 4.6 4.5v3.1c-1.7 0-3.2-.5-4.6-1.4v6.3a5.5 5.5 0 11-5.5-5.5c.3 0 .6 0 .9.1v3.2a2.4 2.4 0 102 2.3V3H14z" fill="#fff"/></svg>';
  var I='<svg width="22" height="22" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="#fff" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="#fff"/></svg>';
  var X='<svg width="20" height="20" viewBox="0 0 24 24"><path d="M4 4l16 16M20 4L4 20" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var D='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1e3a8a" stroke-width="2.2" stroke-linecap="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
  return '<div class="card" style="padding:16px;margin-bottom:14px;display:flex;flex-direction:column;gap:11px">'
    +'<div style="display:flex;gap:10px;align-items:center"><span style="width:40px;height:40px;border-radius:12px;background:#eff6ff;display:flex;align-items:center;justify-content:center;font-size:18px">🔗</span><div><div style="font-weight:900;font-size:15px;color:#0f2544">رابط صفحتك</div><div style="font-size:12px;color:var(--muted);font-weight:700">صفحتك العامة — أعمالك وتقييماتك</div></div></div>'
    +'<div style="display:flex;gap:8px;align-items:center;background:#f8fafd;border:1px solid var(--border);border-radius:12px;padding:9px 12px"><span style="flex:1;min-width:0;direction:ltr;text-align:left;font-weight:900;font-size:13px;color:#1d4ed8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_esc(shown)+'</span><button type="button" onclick="_copyText(\''+_esc(u)+'\')" style="border:0;background:#dbeafe;color:#1d4ed8;border-radius:9px;padding:6px 13px;font-family:inherit;font-weight:900;font-size:12.5px;cursor:pointer">نسخ</button></div>'
    +'<div style="font-size:12.5px;font-weight:700;color:#475569;line-height:1.8">حطّه في <b>بايو انستقرام وتيك توك وسناب</b> وفي حالة وتوقيع الواتساب — أي عميل يضغطه يشوف أعمالك ويطلب منك عرض سعر مباشرة.</div>'
    +'<div style="display:flex;justify-content:space-between;padding:2px 4px">'
      +ic('#25d366',W,'واتساب',"window.open('https://wa.me/?text='+encodeURIComponent('"+txt+"\\n"+_esc(u)+"'),'_blank')")
      +ic('#000',T,'تيك توك',"_pfLinkBio('تيك توك')")
      +ic('radial-gradient(circle at 30% 107%,#fdf497 0%,#fd5949 45%,#d6249f 60%,#285AEB 90%)',I,'انستقرام',"_pfLinkBio('انستقرام')")
      +ic('#000',X,'إكس',"window.open('https://x.com/intent/post?text='+encodeURIComponent('"+txt+"')+'&url='+encodeURIComponent('"+_esc(u)+"'),'_blank')")
      +ic('#eef3fb',D,'صورة للنشر',"window.open('"+location.origin+"/og/pro/"+((_me&&_me.id)||'')+"','_blank')")
    +'</div>'
    +'<a href="'+_esc(u)+'" target="_blank" rel="noopener" style="display:block;text-align:center;border:1.5px solid #dbe5f5;border-radius:12px;padding:11px;font-weight:900;font-size:13.5px;color:#1e3a8a;text-decoration:none">👁 شوف صفحتك مثل ما يشوفها العميل</a></div>';
}
// تيك توك وانستقرام ما يقبلون روابط في المنشور — ننسخ الرابط ونقول له يحطه في البايو
function _pfLinkBio(app){ _copyText(_pfLinkUrl()); setTimeout(function(){ showToast('نسخنا الرابط — الصقه في البايو حق '+app,'success'); },300); }
function _pfEnhance(pg,n){
  var I=function(p){return '<svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">'+p+'</svg>';};
  var wal=document.createElement('div'); wal.className='pf-wal'; wal.id='pf-wal'; wal.innerHTML='<div class="sk-card" style="height:120px;border-radius:18px"></div>';
  n.pub.parentNode.insertBefore(wal,n.pub.nextSibling); _pfWallet();
  try{ var lk=document.createElement('div'); lk.id='pf-link'; lk.innerHTML=_pfLinkHtml(); wal.parentNode.insertBefore(lk,wal.nextSibling); }catch(e){}
  var head=document.createElement('div');head.className='pf-grp';head.textContent='إعدادات الملف';
  n.info.parentNode.insertBefore(head,n.info);
  _pfSection('info','معلومات المنشأة','الاسم، التواصل، المدن، النبذة',I('<path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1"/>'),n.info,true);
  _pfSection('specs','التخصصات','تحدد المشاريع اللي توصلك',I('<path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/>'),n.specs,true);
  _pfSection('port','معرض الأعمال','صور من شغلك السابق — أهم شي يشوفه العميل',I('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'),n.port,true);
  _pfSection('social','روابط التواصل','اختيارية — تظهر في صفحتك العامة',I('<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>'),n.social,false);
  // شريط الحفظ الثابت بعد الأقسام القابلة للحفظ
  var sv=n.save; sv.className='pf-save'; sv.style.cssText='';
  sv.innerHTML='<span id="pf-dirty">عدّلت بياناتك؟ لا تنسَ الحفظ</span><button id="save-btn" onclick="_saveProfile().then(function(){var w=document.querySelector(\'.pf-save\');if(w)w.classList.remove(\'dirty\');})">حفظ التغييرات</button>';
  var socSec=document.getElementById('pf-sec-social'); socSec.parentNode.insertBefore(sv,socSec.nextSibling);
  pg.addEventListener('input',function(e){ if(e.target&&e.target.closest&&e.target.closest('#pf-sec-info,#pf-sec-specs,#pf-sec-social')) sv.classList.add('dirty'); });
  pg.addEventListener('change',function(e){ if(e.target&&e.target.closest&&e.target.closest('#pf-sec-info,#pf-sec-specs,#pf-sec-social')) sv.classList.add('dirty'); });
  // الأمان والحساب
  var head2=document.createElement('div');head2.className='pf-grp';head2.textContent='الحساب';
  sv.parentNode.insertBefore(head2,sv.nextSibling);
  var nt=document.createElement('div'); nt.className='pf-sec pf-nt';
  var _pushOK=('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
  nt.innerHTML='<div class="pf-nt-h"><span class="pf-sec-ic">'+I('<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>')+'</span><span class="pf-sec-tx"><b>الإشعارات الفورية</b><small>'+(_pushOK?'مشاريع جديدة في تخصصك، رسائل، قبول العروض':'تُدار من إعدادات جهازك أو التطبيق')+'</small></span>'
    +(_pushOK?'<span id="pushStatusBadge" class="push-status-badge"></span><button type="button" id="pushToggleSwitch" class="push-toggle-switch" aria-label="تفعيل الإشعارات" onclick="togglePush().then(updatePushToggleUI)"></button>':'')+'</div>';
  head2.parentNode.insertBefore(nt,head2.nextSibling);
  if(_pushOK){ try{ updatePushToggleUI(); }catch(e){} }
  nt.parentNode.insertBefore(n.pw,nt.nextSibling);
  _pfSection('pw','كلمة المرور','غيّر كلمة المرور',I('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>'),n.pw,false);
  // قائمة الحساب: صفوف بدل أزرار كبيرة
  var a=n.acct; a.className='pf-menu'; a.style.cssText='';
  [].slice.call(a.children).forEach(function(el){ if(el.tagName==='BUTTON'||el.tagName==='A'){ el.removeAttribute('style'); el.classList.add('pf-row'); if(/تسجيل الخروج/.test(el.textContent))el.classList.add('out'); if(el.id==='supportBtn')el.classList.add('wa'); } });
  var pw=document.getElementById('pf-sec-pw'); pw.parentNode.insertBefore(a,pw.nextSibling);
  // حذف الحساب: آخر شي ومطوي
  var dz=n.danger; var dd=document.createElement('details'); dd.className='pf-del'; dd.innerHTML='<summary>حذف الحساب</summary>'; dz.style.marginTop='10px'; a.parentNode.insertBefore(dd,a.nextSibling); dd.appendChild(dz);
}
async function updatePushToggleUI(){
  var sw=document.getElementById('pushToggleSwitch');var bg=document.getElementById('pushStatusBadge');if(!sw||!bg)return;
  var active=await isPushActive();
  if(active){sw.classList.add('on');bg.className='push-status-badge active';bg.textContent='مفعّلة';}
  else{sw.classList.remove('on');bg.className='push-status-badge inactive';bg.textContent='معطّلة';}
}
async function togglePush(){
  var sw=document.getElementById('pushToggleSwitch');if(!sw||sw.disabled)return;sw.disabled=true;
  var active=await isPushActive();
  if(active){if(await askConfirm({title:'إيقاف الإشعارات',message:'لن تصلك إشعارات فورية بالمشاريع الجديدة.',confirmText:'إيقاف'})){var ok=await pushUnsubscribe();if(ok)localStorage.removeItem('manaqasa_push_enabled_'+_me.id);}}
  else{var ok=await pushSubscribe();if(ok){localStorage.setItem('manaqasa_push_enabled_'+_me.id,'1');showToast('تم تفعيل الإشعارات بنجاح ✓','success');}}
  sw.disabled=false;
}

function _pSpecRender(){
  var box=_el('pspec-chips'); if(box){box.innerHTML=(window._provSpecSel||[]).map(function(c){return '<span class="spec-pill on" style="cursor:default">'+_esc(c)+' <span onclick="_pSpecDel('+_jsa(c)+')" style="cursor:pointer;font-weight:900;margin-inline-start:4px">\u00d7</span></span>';}).join('');}
  var sc=_el('specs-count'); if(sc)sc.textContent=(window._provSpecSel||[]).length+'/5';
}
function _pSpecAdd(){var s=_el('pspec-sel');var c=s.value;s.value='';if(!c)return;window._provSpecSel=window._provSpecSel||[];if(window._provSpecSel.length>=5){showToast('الحد الأقصى 5 تخصصات','error');return;}if(window._provSpecSel.indexOf(c)<0){window._provSpecSel.push(c);_pSpecRender();}}
function _pSpecDel(c){window._provSpecSel=(window._provSpecSel||[]).filter(function(x){return x!==c;});_pSpecRender();}

function _pSvcRender(){var b=_el('p-svc-chips');if(!b)return;b.innerHTML=(window._pSvc||[]).map(function(c){return '<span style="display:inline-flex;align-items:center;gap:5px;background:#eff6ff;color:#1e40af;padding:5px 10px;border-radius:20px;font-size:12px;font-weight:700">'+_esc(c)+' <span onclick="_pSvcDel('+_jsa(c)+')" style="cursor:pointer;font-weight:900">\u00d7</span></span>';}).join('');}
function _pSvcAdd(){var sel=_el('p-svc-sel');var c=sel.value;sel.value='';if(!c)return;var prim=(_el('p-city')||{}).value;if(c===prim)return;window._pSvc=window._pSvc||[];if(window._pSvc.indexOf(c)<0){window._pSvc.push(c);_pSvcRender();}}
function _pSvcDel(c){window._pSvc=(window._pSvc||[]).filter(function(x){return x!==c;});_pSvcRender();}
async function _saveProfile(){
  var btn=_el('save-btn');
  var email=((_el('p-email')||{}).value||'').trim();
  if(!email||!email.includes('@')||!email.includes('.')){showToast('يرجى إدخال بريد إلكتروني صحيح','error');return;}
  if(btn){btn.disabled=true;btn.textContent='جاري الحفظ...';}
  var specs=(window._provSpecSel||[]).slice();
  var body={name:(_el('p-name')||{}).value,business_name:(_el('p-name')||{}).value||null,phone:(_el('p-phone')||{}).value||null,email:email,city:(_el('p-city')||{}).value||null,bio:(_el('p-bio')||{}).value||null,experience_years:parseInt((_el('p-exp')||{}).value)||null,specialties:specs,notify_categories:specs,website:(_el('p-website')||{}).value||null,location_url:(_el('p-location')||{}).value||null,instagram:(_el('p-instagram')||{}).value||null,twitter:(_el('p-twitter')||{}).value||null,snapchat:(_el('p-snapchat')||{}).value||null,tiktok:(_el('p-tiktok')||{}).value||null,youtube:(_el('p-youtube')||{}).value||null,serves_all_cities:(_el('p-allcities')||{}).checked||false,service_cities:((_el('p-allcities')||{}).checked?[]:(window._pSvc||[]))};
  var r=await _api('/api/provider/profile',{method:'PUT',body:JSON.stringify(body)});
  if(btn){btn.disabled=false;btn.textContent='حفظ جميع التغييرات';}
  if(r&&r.id){_me.name=r.name;if(r.email)_me.email=r.email;localStorage.setItem('user',JSON.stringify(_me));var un=_el('userName');if(un)un.textContent=r.name;showToast('تم الحفظ بنجاح','success');}
  else{showToast((r&&r.message)||'حدث خطأ','error');}
}

async function _changePw(){
  var o=(_el('pw-old')||{}).value;var n=(_el('pw-new')||{}).value;
  if(!o||!n){showToast('اكمل الحقلين','error');return;}if(n.length<6){showToast('كلمة المرور 6 أحرف على الأقل','error');return;}
  var r=await _api('/api/auth/change-password',{method:'PUT',body:JSON.stringify({old_password:o,new_password:n})});
  if(r&&r.ok){showToast('تم تغيير كلمة المرور','success');_el('pw-old').value='';_el('pw-new').value='';}
  else{showToast((r&&r.message)||'كلمة المرور الحالية غير صحيحة','error');}
}

function _uploadAvatar(inp){
  var f=inp.files[0];if(!f)return;if(f.size>3*1024*1024){showToast('الحجم الأقصى 3MB','error');return;}
  var rd=new FileReader();
  rd.onload=async function(e){
    var img=e.target.result;var pr=_el('av-preview');if(pr)pr.innerHTML='<img loading="lazy" src="'+img+'" style="width:100%;height:100%;object-fit:cover">';
    _setAvatar(img);localStorage.setItem('pav_'+_me.id,img);
    await _api('/api/provider/profile',{method:'PUT',body:JSON.stringify({profile_image:img})});showToast('تم حفظ الصورة','success');
  };
  rd.readAsDataURL(f);
}
function _pCompress(file,cb){
  if(!/^image\//.test(file.type)){var rr=new FileReader();rr.onload=function(e){cb(e.target.result);};rr.readAsDataURL(file);return;}
  var r=new FileReader();
  r.onload=function(e){var img=new Image();img.onload=function(){var max=1280,w=img.width,h=img.height;if(w>max||h>max){if(w>h){h=Math.round(h*max/w);w=max;}else{w=Math.round(w*max/h);h=max;}}var c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);try{cb(c.toDataURL('image/jpeg',0.8));}catch(err){cb(e.target.result);}};img.onerror=function(){cb(e.target.result);};img.src=e.target.result;};
  r.readAsDataURL(file);
}
function _uploadPort(inp){
  var files=[].slice.call(inp.files);inp.value='';
  files.forEach(function(f){
    if(f.size>10*1024*1024){showToast(f.name+': أكبر من 10MB','error');return;}
    _pCompress(f,async function(data){var r=await _api('/api/provider/profile/portfolio',{method:'POST',body:JSON.stringify({image:data})});if(r&&(r.ok||r.count))showToast('تم رفع الصورة','success');else showToast((r&&r.message)||'فشل الرفع','error');});
  });
  setTimeout(loadProfile,1500);
}
function _cpCardHtml(p){
  var u=_safeUrl(p.company_profile_url);
  return '<div class="ch"><div class="ch-l"><h3>📁 بروفايل الشركة</h3></div></div>'
    +'<div style="font-size:12.5px;color:var(--muted);line-height:1.8;margin-bottom:10px">ارفعه مرة وحدة، ويطلع مع عروضك تلقائياً — وخانة المرفق في العرض تبقى لعرض السعر.</div>'
    +(u?'<div style="display:flex;align-items:center;gap:9px;background:var(--bg);border:1px solid var(--border);border-radius:11px;padding:10px 12px"><span>📄</span><a href="'+_esc(u)+'" target="_blank" rel="noopener" style="flex:1;min-width:0;font-weight:800;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_esc(p.company_profile_name||'بروفايل الشركة')+'</a>'
      +'<button type="button" onclick="document.getElementById(\'cp-inp\').click()" style="border:1px solid var(--border);background:#fff;border-radius:9px;padding:6px 10px;font-family:inherit;font-weight:800;font-size:12px;cursor:pointer">تغيير</button>'
      +'<button type="button" onclick="_cpSave(null,null)" style="border:0;background:none;color:#dc2626;font-weight:900;font-size:16px;cursor:pointer" aria-label="حذف">×</button></div>'
     :'<button type="button" id="cp-btn" onclick="document.getElementById(\'cp-inp\').click()" style="width:100%;border:1.8px dashed #93c5fd;background:#f8fbff;color:#1e3a8a;border-radius:12px;padding:13px;font-family:inherit;font-weight:800;font-size:13.5px;cursor:pointer">📎 ارفع بروفايل الشركة (PDF — حتى 30MB)</button>')
    +'<input type="file" id="cp-inp" accept="application/pdf,.pdf" style="display:none" onchange="_cpUpload(this)">';
}
function _cpUpload(inp){
  var f=inp.files&&inp.files[0]; inp.value=''; if(!f)return;
  if(!/\.pdf$/i.test(f.name)){showToast('البروفايل لازم يكون PDF','error');return;}
  if(f.size>30*1024*1024){showToast('حجم الملف أكبر من 30MB','error');return;}
  var b=_el('cp-btn'); if(b){b.disabled=true;b.textContent='⏳ جاري الرفع…';}
  fetch(API+'/api/upload/attachment',{method:'POST',headers:{'Authorization':'Bearer '+_token,'Content-Type':'application/octet-stream','X-File-Name':encodeURIComponent(f.name)},body:f})
    .then(function(r){return r.json().then(function(d){return {ok:r.ok,d:d};});})
    .then(function(x){ if(x.ok&&x.d.url) _cpSave(x.d.url,f.name.replace(/\.pdf$/i,'')); else { showToast((x.d&&x.d.message)||'تعذّر الرفع','error'); if(b){b.disabled=false;b.textContent='📎 ارفع بروفايل الشركة';} } })
    .catch(function(){ showToast('تعذّر الرفع','error'); if(b){b.disabled=false;b.textContent='📎 ارفع بروفايل الشركة';} });
}
function _cpSave(url,name){
  _api('/api/provider/profile',{method:'PUT',body:JSON.stringify({company_profile_url:url,company_profile_name:name})}).then(function(d){
    if(d&&d.id){ showToast(url?'تم رفع البروفايل — يطلع مع عروضك':'تم حذف البروفايل','success'); if(window._prof){window._prof.company_profile_url=url;window._prof.company_profile_name=name;} var c=_el('cp-card'); if(c)c.innerHTML=_cpCardHtml({company_profile_url:url,company_profile_name:name}); }
    else showToast((d&&d.message)||'تعذّر الحفظ','error');
  }).catch(function(){showToast('تعذّر الحفظ','error');});
}
async function _delPortImg(i){await _api('/api/provider/profile/portfolio/'+i,{method:'DELETE'});showToast('تم حذف الصورة','success');loadProfile();}

function openDeleteAccount(){
  _el('deleteConfirmInput').value='';_el('deleteAccountBtn').disabled=true;_el('delete-msg').className='alert';
  _el('deletion-stats-wrap').innerHTML='<div class="loading">جاري تحميل البيانات...</div>';
  _el('deleteAccountOverlay').className='overlay show';
  _api('/api/account/deletion-preview').then(function(d){
    if(d&&d.stats){
      var s=d.stats;var html='<div class="delete-stats-grid">';
      if(typeof s.bids!=='undefined')html+='<div class="delete-stat-box"><div class="delete-stat-num">'+s.bids+'</div><div class="delete-stat-lbl">عرض</div></div>';
      if(typeof s.projects!=='undefined')html+='<div class="delete-stat-box"><div class="delete-stat-num">'+s.projects+'</div><div class="delete-stat-lbl">مشروع</div></div>';
      if(typeof s.messages!=='undefined')html+='<div class="delete-stat-box"><div class="delete-stat-num">'+s.messages+'</div><div class="delete-stat-lbl">رسالة</div></div>';
      if(typeof s.reviews!=='undefined')html+='<div class="delete-stat-box"><div class="delete-stat-num">'+s.reviews+'</div><div class="delete-stat-lbl">تقييم</div></div>';
      html+='</div>';
      if(d.warning)html='<div style="background:#fef3c7;border:1px solid #fde68a;border-right:3px solid #d97706;border-radius:11px;padding:12px 14px;margin-bottom:10px"><div style="font-size:12px;font-weight:800;color:#92400e;margin-bottom:5px">تنبيه</div><p style="font-size:11px;color:#78350f;line-height:1.7">'+_esc(d.warning)+'</p></div>'+html;
      _el('deletion-stats-wrap').innerHTML=html;
    }else{_el('deletion-stats-wrap').innerHTML='';}
  }).catch(function(){_el('deletion-stats-wrap').innerHTML='';});
}
function closeDeleteAccount(){_el('deleteAccountOverlay').className='overlay';}
function checkDeleteConfirmation(){var val=_el('deleteConfirmInput').value.trim();_el('deleteAccountBtn').disabled=(val!=='حذف'&&val!=='DELETE');}
function confirmDeleteAccount(){
  var confirmation=_el('deleteConfirmInput').value.trim();
  if(confirmation!=='حذف'&&confirmation!=='DELETE'){var e=_el('delete-msg');e.textContent='يجب كتابة "حذف" للتأكيد';e.className='alert err';return;}
  var btn=_el('deleteAccountBtn');btn.disabled=true;btn.textContent='جاري حذف الحساب...';
  fetch(API+'/api/account/delete',{method:'DELETE',headers:{'Content-Type':'application/json','Authorization':'Bearer '+_token},body:JSON.stringify({confirmation:confirmation})})
    .then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});}).then(function(r){
      if(r.ok){var e=_el('delete-msg');e.textContent='تم حذف حسابك بنجاح. سيتم تسجيل خروجك...';e.className='alert ok';
        setTimeout(function(){localStorage.removeItem('token');localStorage.removeItem('user');Object.keys(localStorage).forEach(function(k){if(k.indexOf('pav_')===0)localStorage.removeItem(k);});location.href='/auth.html';},2000);}
      else{var e=_el('delete-msg');e.textContent=(r.d&&r.d.message)||'حدث خطأ';e.className='alert err';btn.disabled=false;btn.textContent='حذف الحساب نهائياً';}
    }).catch(function(){var e=_el('delete-msg');e.textContent='تعذر الاتصال';e.className='alert err';btn.disabled=false;btn.textContent='حذف الحساب نهائياً';});
}

async function _loadChatBadge(){
  try{
    var convs=await _api('/api/provider/conversations')||[];if(!Array.isArray(convs))return;
    var unread=convs.filter(function(c){return parseInt(c.unread)>0;}).length;
    var b1=_el('nb-chat');if(b1){b1.style.display=unread?'':'none';b1.textContent=unread;}
    var b2=_el('bn-chat-badge');if(b2){b2.style.display=unread?'flex':'none';b2.textContent=unread;}
  }catch(e){}
}
// (دُمج تحديث شارة الرسائل مع الإشعارات في مؤقّت واحد أعلاه — تخفيف الحمل)

function _openNewChatSearch(){
  var body='<div style="margin-bottom:12px"><input id="p-chat-inp" placeholder="ابحث باسم العميل..." style="width:100%;padding:11px 13px;border:1.5px solid var(--p-light);border-radius:10px;font-size:13px;font-family:Tajawal,sans-serif;background:var(--bg)"></div><div id="p-chat-res" style="max-height:240px;overflow-y:auto"></div>';
  var foot='<button onclick="closeModal()" style="flex:1;padding:11px;background:var(--bg);border:1px solid var(--border);border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">إلغاء</button>';
  openModal('محادثة جديدة',body,foot);
  setTimeout(function(){
    var inp=document.getElementById('p-chat-inp');var res=document.getElementById('p-chat-res');if(!inp)return;
    inp.focus();var timer=null;
    inp.addEventListener('input',function(){
      clearTimeout(timer);timer=setTimeout(function(){
        var q=inp.value.trim();if(!q){res.innerHTML='';return;}
        res.innerHTML='<div style="padding:10px;text-align:center;color:var(--muted);font-size:12px">جاري البحث...</div>';
        _api('/api/users/search?q='+encodeURIComponent(q)).then(function(users){
          if(!users||!users.length){res.innerHTML='<div style="padding:10px;text-align:center;color:var(--muted);font-size:12px">لا توجد نتائج</div>';return;}
          var h='';
          users.forEach(function(u){
            h+='<div style="display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;cursor:pointer;border-bottom:1px solid var(--border)">';
            h+='<div style="width:38px;height:38px;border-radius:50%;background:var(--p3);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;flex-shrink:0">'+(_safeUrl(u.profile_image)?'<img loading="lazy" src="'+_esc(_safeUrl(u.profile_image))+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">':_esc((u.name||'ع')[0]))+'</div>';
            h+='<div style="flex:1"><div style="font-size:13px;font-weight:800;color:var(--text)">'+_esc(u.name||'عميل')+'</div><div style="font-size:11px;color:var(--muted)">'+_esc(u.city||'')+'</div></div>';
            h+='<button data-uid="'+(parseInt(u.id)||0)+'" style="padding:7px 14px;background:var(--p);color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:Tajawal,sans-serif">محادثة</button>';
            h+='</div>';
          });
          res.innerHTML=h;
          res.querySelectorAll('button[data-uid]').forEach(function(btn){
            btn.addEventListener('click',function(){
              var uid=btn.getAttribute('data-uid');closeModal();
              _api('/api/direct-message',{method:'POST',body:JSON.stringify({provider_id:uid})}).then(function(d){
                if(d&&d.request_id){showToast('تم فتح المحادثة','success');loadChat();}
              });
            });
          });
        });
      },400);
    });
  },200);
}

function loadSaai(){
  var pg=_el('page-saai'); if(!pg)return;
  pg.innerHTML='<div class="loading">جاري التحميل...</div>';
  _api('/api/provider/saai').then(function(d){
    d=d||{items:[],pending_total:0,approved_total:0,contract_total:0};
    var items=d.items||[];
    var wallet='<div style="background:linear-gradient(135deg,#172554,#1e3a8a 60%,#2563eb);color:#fff;border-radius:18px;padding:22px;margin-bottom:16px">'
      +'<div style="font-size:12.5px;opacity:.85">سعي مستحق عليك <span style="background:rgba(255,255,255,.16);border-radius:20px;padding:2px 8px;font-size:11px;font-weight:800">تقديري</span></div>'
      +'<div style="font-family:Cairo,sans-serif;font-size:38px;font-weight:900;line-height:1.1;margin:4px 0">'+fmtN(d.pending_total)+' <small style="font-size:15px">ر.س</small></div>'
      +'<div style="font-size:12px;opacity:.8;line-height:1.7">سعي المنصة 3% من مبلغ الاتفاق النهائي — يُسدَّد خلال 10 أيام. المبلغ محسوب من سعر عرضك — وعند السداد تأكد منه أو صحّحه.</div>'
      +'<div style="display:flex;gap:18px;margin-top:14px;padding-top:14px;border-top:1px solid rgba(255,255,255,.15)">'
        +'<div style="flex:1"><div style="font-weight:800;font-size:17px">'+fmtN(d.contract_total)+'</div><div style="font-size:11px;opacity:.8">إجمالي العقود</div></div>'
        +'<div style="flex:1"><div style="font-weight:800;font-size:17px">'+fmtN(d.approved_total)+'</div><div style="font-size:11px;opacity:.8">مدفوع ومعتمد ✓</div></div>'
      +'</div></div>';
    var list='';
    if(!items.length){ list='<div style="text-align:center;color:var(--muted);padding:30px;font-size:13.5px">لا يوجد سعي مستحق بعد. يظهر هنا عند قبول العميل لعرضك.</div>'; }
    else {
      list=items.map(function(x){
        var st=x.status, pill, act='', due='';
        if(st==='approved'){ pill='<span style="font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:20px;background:#dcfce7;color:#16a34a">مدفوع ومعتمد ✓ · '+fmtN(x.saai_amount)+' ر.س</span>'; }
        else if(st==='submitted'){ pill='<span style="font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:20px;background:#dbeafe;color:#1d4ed8">بانتظار اعتماد الإدارة · '+fmtN(x.saai_amount)+' ر.س</span>'; }
        else if(st==='cancelled'){ pill='<span style="font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:20px;background:#f1f5f9;color:#64748b">ملغي — ما عليك سعي</span>'; }
        else if(st==='deferred'){ var ds=x.defer_state, du=x.defer_until?new Date(x.defer_until).toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'long'}):'';
          pill=(ds==='confirmed')?'<span class="saai-pl" style="background:#e0e7ff;color:#3730a3">⏸ مؤجّل لين '+du+' · '+fmtN(x.saai_amount)+' ر.س</span>'
            :(ds==='await_admin'?'<span class="saai-pl" style="background:#e0e7ff;color:#3730a3">⏳ التأجيل ينتظر موافقة الإدارة</span>'
            :'<span class="saai-pl" style="background:#fef9c3;color:#854d0e">⏳ بانتظار تأكيد العميل '+(x.defer_kind==='cancel'?'(إلغاء)':'(تأجيل'+(du?' لين '+du:'')+')')+'</span>');
          due='<div style="font-size:11px;color:var(--muted);margin-top:4px">اتفقتوا وتبي تسدد الحين؟ ما يحتاج تنتظر</div>';
          act='<div class="saai-acts"><button class="btn-new" style="padding:9px 14px;font-size:12.5px" onclick="openSaaiSubmit('+x.id+','+(parseFloat(x.contract_value)||0)+','+_jsa(x.project_title||'مشروع')+')">سدّد وارفع الإيصال</button></div>'; }
        else { pill='<span style="font-size:10.5px;font-weight:800;padding:3px 9px;border-radius:20px;background:#fef3c7;color:#d97706">'+((parseFloat(x.contract_value)||0)>0?'مستحق (تقديري) · '+fmtN(x.saai_amount)+' ر.س':'حدّد مبلغ الاتفاق')+'</span>'; act='<div class="saai-acts"><button class="btn-new" style="padding:9px 16px;font-size:12.5px" onclick="openSaaiSubmit('+x.id+','+(parseFloat(x.contract_value)||0)+','+_jsa(x.project_title||'مشروع')+')">سدّد وارفع الإيصال</button>'+((x.defer_state==='conflict')?'':'<button class="saai-defer" onclick="_saaiDeferOpen('+x.id+','+_jsa(x.project_title||'مشروع')+')">العميل أجّل أو ألغى؟</button>')+'</div>'; due=_saaiDue(x.due_from||x.created_at)+(x.defer_state==='conflict'?'<div style="font-size:11.5px;color:#b91c1c;font-weight:800;margin-top:4px">العميل ذكر إن '+(x.client_answer==='started'?'التنفيذ بدأ':'الاتفاق قائم')+' — لو فيه لبس تواصل معنا</div>':(x.defer_state==='resumed'?'<div style="font-size:11.5px;color:#3730a3;font-weight:800;margin-top:4px">انتهى التأجيل — المهلة بدأت من جديد</div>':'')); }
        return '<div style="display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--border)"><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:14px;color:#0f2544">'+_esc(x.project_title||'مشروع')+'</div><div style="font-size:11.5px;color:var(--muted);margin-top:2px">'+(x.status==='pending'?((parseFloat(x.contract_value)||0)>0?'سعر عرضك: '+fmtN(x.contract_value)+' ر.س':'سعرك كان بالمتر/الوحدة — أدخل المبلغ الإجمالي'):'مبلغ الاتفاق: '+fmtN(x.contract_value)+' ر.س')+(x.city?' · '+_esc(x.city):'')+'</div><div style="margin-top:5px">'+pill+due+'</div></div>'+act+'</div>';
      }).join('');
      list='<div class="card" style="padding:6px 18px">'+list+'</div>';
    }
    var selfBtn='<button class="btn-new" style="width:100%;margin-bottom:14px;padding:13px;font-size:14px" onclick="_spSelfOpen()">سدّد سعي على مشروع ثاني</button><div style="font-size:11.5px;color:var(--muted);font-weight:700;text-align:center;margin:-8px 0 14px">اتفقت مع عميل والعرض ما انقبل داخل المنصة؟ سدّد من هنا</div>';
    pg.innerHTML='<div style="max-width:640px;margin:0 auto">'+wallet+selfBtn+list+'<div id="saai-bank"></div></div>';
    // بيانات التحويل + الحاسبة (لمن يحوّل مباشرة)
    _api('/api/bank-info').then(function(bk){
      bk=bk||{}; var bx=_el('saai-bank'); if(!bx)return;
      var row=function(lbl,val,copy){ return '<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:1px solid var(--border);gap:10px"><div style="font-size:12px;font-weight:700;color:var(--muted);flex-shrink:0">'+lbl+'</div><div style="display:flex;align-items:center;gap:8px"><div style="font-size:13.5px;font-weight:800;'+(copy?'direction:ltr;':'')+'word-break:break-all">'+_esc(val||'')+'</div>'+(copy?'<button onclick="_copyTxt('+_jsa(val)+',this)" style="background:var(--bg,#eef2f9);border:1px solid var(--border);border-radius:8px;padding:5px 10px;font-size:11px;font-weight:800;color:var(--p);cursor:pointer;font-family:Tajawal,sans-serif">نسخ</button>':'')+'</div></div>'; };
      bx.innerHTML=''
        +'<div class="card" style="margin-top:14px;padding:20px">'
        +'<div style="font-weight:900;font-size:15px;color:var(--p);margin-bottom:6px">🏦 بيانات التحويل</div>'
        +'<div style="font-size:12px;color:var(--muted);margin-bottom:12px">حوّل على الحساب ثم اضغط «سدّد وارفع الإيصال» على المشروع — يوصلنا مباشرة ونأكد الاستلام.</div>'
        +row('اسم صاحب الحساب', bk.account_name)
        +row('رقم الحساب', bk.account_number, true)
        +row('الآيبان (IBAN)', bk.iban, true)
        +row('البنك', bk.bank_name)
        +(bk.whatsapp?'<div style="text-align:center;margin-top:12px"><a href="https://wa.me/'+_esc(String(bk.whatsapp).replace(/[^0-9]/g,''))+'" target="_blank" rel="noopener" style="font-size:12px;font-weight:700;color:var(--muted);text-decoration:underline">تحتاج مساعدة؟ واتساب</a></div>':'')
        +'</div>';
    }).catch(function(){});
  }).catch(function(){ pg.innerHTML='<div style="text-align:center;color:#dc2626;padding:30px">تعذّر تحميل المحفظة</div>'; });
}
// آخر موعد للسداد: 10 أيام من تاريخ الاستحقاق
function _saaiDue(iso){
  var t=Date.parse(iso||''); if(!t) return '';
  var d=Math.ceil((t+10*86400000-Date.now())/86400000);
  if(d<0) return '<span style="font-size:11px;font-weight:800;color:#dc2626;margin-right:8px">متأخر '+(-d)+' '+(-d===1?'يوم':'أيام')+'</span>';
  return '<span style="font-size:11px;font-weight:800;color:#b45309;margin-right:8px">آخر موعد: '+(d===0?'اليوم':'بعد '+d+' '+(d===1?'يوم':'أيام'))+'</span>';
}
function _copyTxt(t,btn){ if(navigator.clipboard){navigator.clipboard.writeText(t).then(function(){var o=btn.textContent;btn.textContent='تم النسخ';setTimeout(function(){btn.textContent=o;},1500);});} }
window._saaiProof=null;
// ═══ سداد السعي: تأكيد المبلغ أول ← (تصحيح لو مختلف) ← بيانات التحويل + الإيصال ═══
function openSaaiSubmit(id, contract, title){
  window._saaiId=id; window._saaiProof=null; window._sp={contract:parseFloat(contract)||0,title:title||'',amt:parseFloat(contract)||0,diff:false,reason:''};
  var m=_el('saaiModal'); if(!m){ m=document.createElement('div'); m.id='saaiModal'; document.body.appendChild(m); }
  m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)';
  m.onclick=function(e){ if(e.target===m) m.remove(); };
  if(!window._bankInfo) _api('/api/bank-info').then(function(b){ window._bankInfo=b||{}; if(window._spStep===2)_spRender(2); }).catch(function(){});
  _spRender(window._sp.contract>0?1:2, window._sp.contract>0?false:true);
}
function _spRender(step, diff){
  var m=_el('saaiModal'); if(!m)return; var S=window._sp; window._spStep=step; if(diff!==undefined)S.diff=diff;
  var hd='<div class="sd-t">سداد سعي «'+_esc(S.title)+'»</div>';
  if(step===1){
    m.innerHTML='<div class="sd-box" role="dialog" aria-label="تأكيد المبلغ">'+hd
      +'<div class="sd-s" style="margin-top:0;text-align:center;font-size:13.5px">هل اتفقت مع العميل على هذا المبلغ؟</div>'
      +'<div style="font-family:Cairo,sans-serif;font-size:30px;font-weight:900;color:#0f2544;text-align:center">'+fmtN(S.contract)+' <small style="font-size:14px">ر.س</small></div>'
      +'<div class="sd-s" style="margin-top:-8px;text-align:center">محسوب من سعر عرضك</div>'
      +'<button type="button" class="sd-send" onclick="window._sp.amt=window._sp.contract;window._sp.reason=\'\';_spRender(2,false)">✓ نعم، هذا المبلغ</button>'
      +'<button type="button" class="sd-opt" style="justify-content:center;font-weight:900;font-size:14px;color:#1e3a8a" onclick="_spRender(2,true)">لا، المبلغ مختلف</button>'
      +'<button type="button" class="sd-x" onclick="_el(\'saaiModal\').remove()">إلغاء</button></div>';
    return;
  }
  var bk=window._bankInfo||{};
  var R=['خصم للعميل','تقليل الأعمال','زيادة الأعمال','غيره'];
  var cp=function(v){ return v?'<button type="button" class="sd-ch" style="padding:4px 10px;font-size:11.5px" onclick="_copyTxt(\''+_esc(String(v).replace(/'/g,''))+'\',this)">نسخ</button>':''; };
  m.innerHTML='<div class="sd-box" role="dialog" aria-label="سداد السعي">'+hd
    +(S.diff?'<div><label style="display:block;font-size:12.5px;font-weight:800;color:#334766;margin-bottom:6px">المبلغ النهائي المتفق عليه (ر.س)</label>'
      +'<input id="saai-amt" type="number" inputmode="numeric" value="'+(S.amt||'')+'" oninput="window._sp.amt=parseFloat(this.value)||0;_spFee()" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid var(--border);border-radius:12px;font-family:Tajawal,sans-serif;font-size:16px;font-weight:900">'
      +(S.contract>0?'<div class="sd-s" style="margin-top:5px">سعر عرضك كان '+fmtN(S.contract)+' ر.س</div>':'<div class="sd-s" style="margin-top:5px">سعرك كان بالمتر/الوحدة — أدخل المبلغ الإجمالي</div>')+'</div>'
      +(S.contract>0?'<div class="sd-when" style="padding:0"><span>وش السبب؟</span><div>'+R.map(function(r){return '<button type="button" class="sd-ch'+(S.reason===r?' on':'')+'" onclick="window._sp.reason=\''+r+'\';[].forEach.call(this.parentNode.children,function(x){x.classList.remove(\'on\')});this.classList.add(\'on\')">'+r+'</button>';}).join('')+'</div></div>':'')
      :'<div class="sd-info" style="display:flex;justify-content:space-between;align-items:center"><span>المبلغ المتفق عليه</span><b>'+fmtN(S.amt)+' ر.س</b></div>')
    +'<div style="background:#eff4ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:11px;text-align:center"><div style="font-size:12px;color:#1d4ed8;font-weight:800">السعي المستحق (3%)</div><div id="sp-fee" style="font-family:Cairo,sans-serif;font-size:24px;font-weight:900;color:#0f2544">'+fmtN(Math.round((S.amt||0)*0.03))+' ر.س</div></div>'
    +(bk.iban?'<div class="sd-info"><b>حوّل على:</b> '+_esc(bk.bank_name||'')+(bk.account_name?' · '+_esc(bk.account_name):'')
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:5px"><span style="direction:ltr;font-weight:900;word-break:break-all">'+_esc(bk.iban)+'</span>'+cp(bk.iban)+'</div></div>':'')
    +'<label style="display:flex;gap:10px;align-items:center;border:1.8px dashed #93c5fd;background:#f8fbff;border-radius:13px;padding:13px;font-size:13px;font-weight:800;color:#1e3a8a;cursor:pointer">📎 <span id="saai-proof-lbl">ارفع إيصال التحويل</span><span style="margin-right:auto;font-size:11.5px;color:#64748b">صورة أو PDF</span>'
      +'<input type="file" id="saai-proof" accept="image/*,application/pdf" onchange="_onSaaiProof(this)" style="display:none"></label>'
    +'<button type="button" id="saai-send" class="sd-send" onclick="submitSaai()">إرسال للاعتماد</button>'
    +(S.contract>0?'<button type="button" class="sd-x" onclick="_spRender(1)">رجوع</button>':'<button type="button" class="sd-x" onclick="_el(\'saaiModal\').remove()">إلغاء</button>')
    +'<div class="sd-s" style="text-align:center;margin-top:-4px">بعد الإرسال تراجع الإدارة الإيصال وتعتمد الاستلام.</div></div>';
}
// ═══ السداد الذاتي: يختار المشروع (من عروضه حتى المقفلة) أو يكتب اسمه ← المبلغ ← الإيصال ═══
window._ss={rid:null,title:'',amt:0,list:[]};
function _spSelfOpen(){
  window._ss={rid:null,title:'',amt:0,list:null}; window._saaiProof=null;
  var m=_el('saaiModal'); if(!m){ m=document.createElement('div'); m.id='saaiModal'; document.body.appendChild(m); }
  m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)';
  m.onclick=function(e){ if(e.target===m) m.remove(); };
  m.innerHTML='<div class="sd-box"><div class="sd-t">سداد السعي</div><div class="sd-s">جاري تحميل مشاريعك…</div></div>';
  if(!window._bankInfo) _api('/api/bank-info').then(function(b){ window._bankInfo=b||{}; _ssRender(); }).catch(function(){});
  _api('/api/provider/saai/projects').then(function(l){ window._ss.list=Array.isArray(l)?l:[]; _ssRender(); }).catch(function(){ window._ss.list=[]; _ssRender(); });
}
function _ssPick(i){
  var S=window._ss; S.rid=null;
  if(i>=0){ var x=S.list[i]; S.rid=x.id; if(!S.amt&&x.price_unit==='total'&&parseFloat(x.price)>0)S.amt=Math.round(parseFloat(x.price)); }
  else S.rid=-1;
  _ssRender();
}
function _ssRender(){
  var m=_el('saaiModal'); var S=window._ss; if(!m||S.list===null)return;
  var bk=window._bankInfo||{};
  var st={open:'مفتوح',in_progress:'قيد التنفيذ',completed:'مكتمل'};
  var rows=S.list.slice(0,12).map(function(x,i){ var on=S.rid===x.id;
    var meta=(x.price?'عرضك '+fmtN(x.price)+(x.price_unit&&x.price_unit!=='total'?'/'+(x.price_unit==='meter'?'م':'وحدة'):''):'')+(x.city?' · '+_esc(x.city):'')+' · '+(st[x.status]||'انقفل');
    return '<button type="button" class="sd-opt'+(on?' on':'')+'" onclick="_ssPick('+i+')"><span class="sd-rd"></span><span><b>'+_esc(x.title||'مشروع')+'</b><small>'+meta+'</small></span></button>'; }).join('');
  var other=S.rid===-1;
  m.innerHTML='<div class="sd-box" role="dialog" aria-label="سداد السعي"><div class="sd-t">على أي مشروع اتفقت؟</div><div class="sd-s">مشاريع قدّمت عليها — حتى لو انقفلت</div>'
    +(rows||'<div class="sd-info">ما لقينا عروض لك في آخر 6 شهور — اكتب اسم المشروع تحت.</div>')
    +'<button type="button" class="sd-opt'+(other?' on':'')+'" onclick="_ssPick(-1)"><span class="sd-rd"></span><span><b>مشروع ما هو في القائمة</b><small>اكتب اسمه ونربطه حنا</small></span></button>'
    +(other?'<input id="ss-title" maxlength="120" placeholder="اسم المشروع أو العميل" value="'+_esc(S.title)+'" oninput="window._ss.title=this.value" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid var(--border);border-radius:12px;font-family:Tajawal,sans-serif;font-size:14px">':'')
    +(S.rid?'<div><label style="display:block;font-size:12.5px;font-weight:800;color:#334766;margin-bottom:6px">المبلغ اللي اتفقتوا عليه (ر.س)</label><input id="ss-amt" type="number" inputmode="numeric" value="'+(S.amt||'')+'" oninput="window._ss.amt=parseFloat(this.value)||0;var e=_el(\'ss-fee\');if(e)e.textContent=fmtN(Math.round(window._ss.amt*0.03))+\' ر.س\'" style="width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid var(--border);border-radius:12px;font-family:Tajawal,sans-serif;font-size:16px;font-weight:900"></div>'
      +'<div style="background:#eff4ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:10px;text-align:center"><div style="font-size:12px;color:#1d4ed8;font-weight:800">السعي (3%)</div><div id="ss-fee" style="font-family:Cairo,sans-serif;font-size:22px;font-weight:900;color:#0f2544">'+fmtN(Math.round((S.amt||0)*0.03))+' ر.س</div></div>'
      +(bk.iban?'<div class="sd-info"><b>حوّل على:</b> '+_esc(bk.bank_name||'')+(bk.account_name?' · '+_esc(bk.account_name):'')+'<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:5px"><span style="direction:ltr;font-weight:900;word-break:break-all">'+_esc(bk.iban)+'</span><button type="button" class="sd-ch" style="padding:4px 10px;font-size:11.5px" onclick="_copyTxt(\''+_esc(String(bk.iban).replace(/\'/g,''))+'\',this)">نسخ</button></div></div>':'')
      +'<label style="display:flex;gap:10px;align-items:center;border:1.8px dashed #93c5fd;background:#f8fbff;border-radius:13px;padding:13px;font-size:13px;font-weight:800;color:#1e3a8a;cursor:pointer">📎 <span id="saai-proof-lbl">'+(window._saaiProof?'✓ تم إرفاق الإيصال':'ارفع إيصال التحويل')+'</span><span style="margin-right:auto;font-size:11.5px;color:#64748b">صورة أو PDF</span><input type="file" accept="image/*,application/pdf" onchange="_onSaaiProof(this)" style="display:none"></label>'
      +'<button type="button" id="ss-send" class="sd-send" onclick="_ssSend()">إرسال للاعتماد</button>'
      +'<div class="sd-s" style="text-align:center;margin-top:-4px">بعد اعتماد الإدارة ينحسب المشروع لك وتقدر تطلب تقييم العميل</div>':'')
    +'<button type="button" class="sd-x" onclick="_el(\'saaiModal\').remove()">إلغاء</button></div>';
}
function _ssSend(){
  var S=window._ss, amt=Math.round(parseFloat(S.amt)||0);
  if(S.rid===-1&&String(S.title||'').trim().length<3){ showToast('اكتب اسم المشروع','error'); return; }
  if(amt<50){ showToast('أدخل المبلغ اللي اتفقتوا عليه','error'); return; }
  if(!window._saaiProof){ showToast('ارفع إيصال التحويل','error'); return; }
  var b=_el('ss-send'); if(b){b.disabled=true;b.textContent='جاري الإرسال...';}
  var body={contract_value:amt,proof:window._saaiProof}; if(S.rid>0)body.request_id=S.rid; else body.title=S.title;
  _api('/api/provider/saai/self',{method:'POST',body:JSON.stringify(body)}).then(function(d){
    if(d&&d.ok){ showToast('وصل الإيصال — بانتظار اعتماد الإدارة','success'); var m=_el('saaiModal'); if(m)m.remove(); try{ if(_el('page-saai')&&_el('page-saai').offsetParent)loadSaai(); _pfWallet(); }catch(e){} }
    else { showToast((d&&d.message)||'تعذّر الإرسال','error'); if(b){b.disabled=false;b.textContent='إرسال للاعتماد';} }
  }).catch(function(){ showToast('تعذّر الإرسال','error'); if(b){b.disabled=false;b.textContent='إرسال للاعتماد';} });
}
function _spFee(){ var e=_el('sp-fee'); if(e)e.textContent=fmtN(Math.round((window._sp.amt||0)*0.03))+' ر.س'; }
// ═══ العميل أجّل البدء أو ألغى الاتفاق ═══
window._sdK='postpone'; window._sdD=30;
function _saaiDeferOpen(id,title){
  window._sdId=id; window._sdK='postpone'; window._sdD=30;
  var m=_el('saaiModal'); if(!m){ m=document.createElement('div'); m.id='saaiModal'; document.body.appendChild(m); }
  m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(3px)';
  m.onclick=function(e){ if(e.target===m) m.remove(); };
  _saaiDeferRender(title);
}
function _saaiDeferRender(title){
  var m=_el('saaiModal'); if(!m)return; if(title)window._sdT=title;
  var K=window._sdK, D=window._sdD;
  var opt=function(k,t,s){var on=K===k;return '<button type="button" class="sd-opt'+(on?' on':'')+'" onclick="window._sdK=\''+k+'\';_saaiDeferRender()"><span class="sd-rd"></span><span><b>'+t+'</b><small>'+s+'</small></span></button>';};
  var dd=[[14,'أسبوعين'],[30,'شهر'],[45,'شهر ونص'],[60,'شهرين']];
  m.innerHTML='<div class="sd-box" role="dialog" aria-label="وش صار مع العميل">'
    +'<div class="sd-t">وش صار مع العميل؟</div><div class="sd-s">'+_esc(window._sdT||'')+'</div>'
    +opt('postpone','أجّل البدء','الاتفاق قائم بس التنفيذ بيبدأ بعدين')
    +(K==='postpone'?'<div class="sd-when"><span>متى متوقع تبدأون؟</span><div>'+dd.map(function(d){return '<button type="button" class="sd-ch'+(D===d[0]?' on':'')+'" onclick="window._sdD='+d[0]+';_saaiDeferRender()">'+d[1]+'</button>';}).join('')+'</div></div>':'')
    +opt('cancel','ألغى الاتفاق','ما راح يتم التنفيذ معي')
    +'<textarea id="sd-note" maxlength="300" placeholder="ملاحظة (اختياري)"></textarea>'
    +'<button type="button" id="sd-send" class="sd-send" onclick="_saaiDeferSend()">أرسل — نتأكد من العميل</button>'
    +'<div class="sd-info">نرسل للعميل سؤال سريع يأكد فيه. لين يرد: <b>التذكيرات توقف</b> والسعي ما ينحسب متأخر.</div>'
    +'<button type="button" class="sd-x" onclick="_el(\'saaiModal\').remove()">إلغاء</button></div>';
}
function _saaiDeferSend(){
  var b=_el('sd-send'); if(b){b.disabled=true;b.textContent='جاري الإرسال...';}
  var body={kind:window._sdK,days:window._sdD,note:((_el('sd-note')||{}).value||'').trim()};
  _api('/api/provider/saai/'+window._sdId+'/defer',{method:'POST',body:JSON.stringify(body)}).then(function(d){
    if(d&&d.ok){ showToast('وصلنا — سألنا العميل، والتذكيرات متوقفة لين يرد','success'); var m=_el('saaiModal'); if(m)m.remove(); loadSaai(); }
    else { showToast((d&&d.message)||'تعذّر الإرسال','error'); if(b){b.disabled=false;b.textContent='أرسل — نتأكد من العميل';} }
  }).catch(function(){ showToast('تعذّر الاتصال','error'); if(b){b.disabled=false;b.textContent='أرسل — نتأكد من العميل';} });
}
function _onSaaiProof(inp){ var f=inp.files&&inp.files[0]; if(!f)return; var rd=new FileReader(); rd.onload=function(){ window._saaiProof=rd.result; var l=_el('saai-proof-lbl'); if(l){l.textContent='✓ '+f.name;l.style.display='block';} }; rd.readAsDataURL(f); }
function submitSaai(){
  var S=window._sp||{}; var amt=parseFloat(S.amt)||0;
  if(amt<=0){ showToast('أدخل المبلغ المتفق عليه','error'); return; }
  if(S.diff&&S.contract>0&&amt!==S.contract&&!S.reason){ showToast('اختر سبب اختلاف المبلغ','error'); return; }
  if(!window._saaiProof){ showToast('ارفع إيصال التحويل','error'); return; }
  var b=_el('saai-send'); if(b){b.disabled=true;b.textContent='جاري الإرسال...';}
  _api('/api/provider/saai/'+window._saaiId+'/submit',{method:'POST',body:JSON.stringify({contract_value:amt,proof:window._saaiProof,confirmed:true,reason:(S.diff&&amt!==S.contract)?S.reason:''})})
    .then(function(d){ if(d&&d.ok){ showToast('تم الإرسال — بانتظار اعتماد الإدارة','success'); var m=_el('saaiModal'); if(m)m.remove(); loadSaai(); try{_pfWallet();}catch(e){} } else { showToast((d&&d.message)||'تعذّر الإرسال','error'); if(b){b.disabled=false;b.textContent='إرسال للاعتماد';} } })
    .catch(function(){ showToast('تعذّر الإرسال','error'); if(b){b.disabled=false;b.textContent='إرسال للاعتماد';} });
}
async function loadChat(){
  var pg=_el('page-chat');if(!pg)return;
  pg.innerHTML='<div class="pghd"><div class="pg-t">المحادثات</div></div>'+_skList(3);
  var convs=[];try{convs=await _api('/api/provider/conversations')||[];}catch(e){}
  if(!Array.isArray(convs))convs=[];
  convs.sort(function(a,b){return new Date(b.last_time||0)-new Date(a.last_time||0);});
  window._lastConvs=convs; _renderProvConvList(convs,pg);_lb.done();
  clearInterval(_provConvPolling);
  _provConvPolling=setInterval(function(){if(!_pollPaused)_refreshProvConvList();},30000);
}

async function _refreshProvConvList(){
  var pg=_el('page-chat');if(!pg||_el('prov-chat-overlay'))return;
  try{var convs=await _api('/api/provider/conversations')||[];if(!Array.isArray(convs))return;convs.sort(function(a,b){return new Date(b.last_time||0)-new Date(a.last_time||0);});_renderProvConvList(convs,pg);}catch(e){}
}

// إصلاح 3: ربط زر المحادثة الجديدة بعد innerHTML
function _renderProvConvList(convs,pg){
  var html='<div class="pghd"><div class="pg-t">المحادثات</div><div class="pg-s">'+convs.length+' محادثة</div></div>';
  html+='<div style="margin-bottom:12px"><button id="prov-new-chat-btn" style="width:100%;padding:13px;background:var(--p);color:#fff;border:none;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:Tajawal,sans-serif;display:flex;align-items:center;justify-content:center;gap:8px"><svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>محادثة جديدة مع عميل</button></div>';
  html+='<div class="card card-accent">';
  if(convs.length){
    convs.forEach(function(cv){
      var unread=parseInt(cv.unread)>0;var initials=(cv.client_name||'ع')[0];
      var cname=String(cv.client_name||'عميل').replace(/'/g,'');var ctitle=String(cv.request_title||'').replace(/'/g,'');
      html+='<div onclick="_openChatConv('+cv.request_id+','+cv.client_id+')" style="display:flex;align-items:center;gap:12px;padding:13px 0;border-bottom:1px solid var(--border);cursor:pointer'+(unread?';background:var(--bg);margin:0 -16px;padding-left:16px;padding-right:16px':'')+'">';
      html+='<div style="width:44px;height:44px;border-radius:50%;background:var(--p3);color:#fff;font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;position:relative">';
      if(_safeUrl(cv.client_image))html+='<img loading="lazy" src="'+_esc(_safeUrl(cv.client_image))+'" style="width:100%;height:100%;object-fit:cover">';
      else html+=_esc(initials);
      if(unread)html+='<div style="position:absolute;top:1px;left:1px;width:12px;height:12px;border-radius:50%;background:var(--gold);border:2px solid var(--white)"></div>';
      html+='</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:'+(unread?'900':'700')+';color:var(--text);margin-bottom:2px">'+_esc(cv.client_name||'عميل')+'</div><div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_esc(cv.last_message||'')+'</div></div>';
      html+='<div style="font-size:10px;color:var(--hint);flex-shrink:0">'+_ago(cv.last_time)+'</div></div>';
    });
  }else{html+=_empty('لا يوجد محادثات بعد','ستظهر محادثاتك مع العملاء هنا');}
  html+='</div>';
  pg.innerHTML=html;
  // ربط الزر مباشرة بعد innerHTML
  var ncb=document.getElementById('prov-new-chat-btn');
  if(ncb)ncb.addEventListener('click',function(){_openNewChatSearch();});
}

// ── ضبط محادثة المزوّد مع كيبورد الجوّال (visualViewport — الحل الصحيح لـ iOS Safari) ──
// ── الحظر بين المستخدمين (المزوّد) ──
async function _pToggleBlock(uid){
  if(!uid)return;
  var btn=document.getElementById('p-chat-block');
  var isBlocked=btn&&btn.getAttribute('data-blocked')==='1';
  if(!isBlocked && !confirm('حظر هذا المستخدم؟\nلن تصلك رسائله ولن تصله رسائلك.'))return;
  try{
    var d=await _api('/api/blocks/'+uid,{method:isBlocked?'DELETE':'POST'});
    if(d===null)throw new Error();
    _pPaintBlockBtn(!!d.blocked);
    if(typeof showToast==='function')showToast(d.blocked?'تم الحظر':'تم فك الحظر','success');
  }catch(e){ if(typeof showToast==='function')showToast('تعذّر التنفيذ — تحقّق من اتصالك','error'); }
}
function _pPaintBlockBtn(blocked){
  var btn=document.getElementById('p-chat-block'); if(!btn)return;
  btn.setAttribute('data-blocked',blocked?'1':'0');
  btn.textContent=blocked?'فكّ الحظر':'حظر';
  btn.style.background=blocked?'rgba(220,38,38,.85)':'rgba(255,255,255,.12)';
  var inp=document.getElementById('p-chat-inp'), snd=document.getElementById('p-chat-send');
  if(inp){inp.disabled=blocked;inp.placeholder=blocked?'لا يمكن المراسلة (محظور)':'اكتب رسالتك...';}
  if(snd){snd.disabled=blocked;snd.style.opacity=blocked?'.5':'';}
}
async function _pCheckBlock(uid){
  if(!uid)return;
  try{ var d=await _api('/api/blocks?check='+uid); if(d)_pPaintBlockBtn(!!d.blocked); }catch(e){}
}
function _pBindKeyboardFix(overlay){
  if(!window.visualViewport||!overlay)return;
  var vv=window.visualViewport;
  function apply(){
    if(!document.body.contains(overlay))return;
    overlay.style.position='fixed';
    overlay.style.top='0px';
    overlay.style.left='0px';
    overlay.style.right='0px';
    overlay.style.bottom='auto';
    overlay.style.height=vv.height+'px';
    if(window.scrollY!==0){ window.scrollTo(0,0); }
    var m=document.getElementById('p-chat-msgs'); if(m)m.scrollTop=m.scrollHeight;
  }
  vv.addEventListener('resize',apply);
  vv.addEventListener('scroll',apply);
  // اضبط فوراً عند فتح المحادثة (يمنع الفراغ قبل ظهور الكيبورد)
  [0,50,150,350].forEach(function(t){setTimeout(apply,t);});
  setTimeout(function(){
    var inp=document.getElementById('p-chat-inp');
    if(inp){
      inp.addEventListener('focus',function(){
        [80,200,400,700].forEach(function(t){setTimeout(apply,t);});
        // ضمانة قاطعة: أجبر المتصفّح على إظهار الصندوق فوق الكيبورد
        [250,500,800].forEach(function(t){
          setTimeout(function(){
            try{ inp.scrollIntoView({block:'end',behavior:'smooth'}); }catch(err){}
            var m=document.getElementById('p-chat-msgs'); if(m)m.scrollTop=m.scrollHeight;
          },t);
        });
      });
      inp.addEventListener('blur',function(){ [80,250].forEach(function(t){setTimeout(apply,t);}); });
    }
  },50);
}
// العميل ما رد على رسالتك خلال يوم ورقمه مفتوح لك ← واتساب أسرع
function _pNoReplyNudge(){
  var ex=_el('p-nr'); var rb=_el('p-reply-bar'); if(!rb)return;
  if(!(_myBids||[]).length&&!window._nrF){ window._nrF=1; _api('/api/provider/bids').then(function(b){ if(Array.isArray(b)&&b.length){ _myBids=b; _pNoReplyNudge(); } }).catch(function(){}); return; }
  var real=(_chatMsgs||[]).filter(function(m){return m&&m.id!=null&&String(m.id).indexOf('tmp_')!==0;});
  var last=real[real.length-1];
  var bid=(_myBids||[]).filter(function(b){return String(b.request_id)===String(_chatReqId)&&b.contact_unlocked&&b.client_phone;})[0];
  var show=!!(last&&bid&&_me&&String(last.sender_id)===String(_me.id)&&(Date.now()-new Date(last.created_at).getTime())>24*3600000);
  if(!show){ if(ex)ex.remove(); return; }
  if(ex)return;
  var pc=String(bid.client_phone).replace(/[^0-9]/g,''); var wn=pc.indexOf('966')===0?pc:(pc.indexOf('0')===0?'966'+pc.slice(1):'966'+pc);
  var wt='مرحباً '+(bid.client_name||'')+'،\nأتواصل معك عبر منصة مناقصة بشأن مشروعكم: '+(bid.request_title||'')+'\nأنا '+((_me&&_me.name)||'المزود')+'.';
  var d=document.createElement('div'); d.id='p-nr';
  d.style.cssText='flex:0 0 auto;display:flex;align-items:center;gap:10px;background:#fffbeb;border-top:1px solid #fde68a;padding:9px 12px';
  d.innerHTML='<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:900;color:#92400e">العميل ما رد؟ رقمه عندك</div><div style="font-size:11.5px;font-weight:700;color:#92400e">كلّمه واتساب — أسرع</div></div>'
    +'<a href="https://wa.me/'+wn+'?text='+encodeURIComponent(wt)+'" target="_blank" rel="noopener" style="background:#25d366;color:#fff;border-radius:10px;padding:9px 16px;font-weight:900;font-size:13px;text-decoration:none;font-family:Tajawal,sans-serif">واتساب</a>';
  rb.parentNode.insertBefore(d,rb);
}
async function openChatRoom(reqId,receiverId,receiverName,reqTitle){
  reqId=parseInt(reqId);receiverId=parseInt(receiverId);
  _chatReqId=reqId;_chatReceiverId=receiverId;_chatMsgs=[];
  clearInterval(_chatPolling);
  var old=_el('prov-chat-overlay');if(old)old.remove();
  var overlay=document.createElement('div');overlay.id='prov-chat-overlay';
  overlay.style.cssText='position:fixed;left:0;right:0;top:0;height:100dvh;background:var(--bg);z-index:999;display:flex;flex-direction:column;overflow:hidden';
  overlay.innerHTML=''
    +'<div style="background:var(--p3);padding:14px 16px;display:flex;align-items:center;gap:12px;flex:0 0 auto">'
    +'<button id="p-chat-close" style="background:rgba(255,255,255,.1);border:none;color:#fff;width:32px;height:32px;border-radius:9px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">&#215;</button>'
    +'<div style="min-width:0;flex:1"><div style="font-size:14px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_esc(receiverName||'العميل')+'</div>'+(reqTitle?'<div style="font-size:10px;color:rgba(255,255,255,.6);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_esc(reqTitle)+'</div>':'')+'</div>'
    +'<button id="p-chat-block" onclick="_pToggleBlock('+(receiverId||0)+')" title="حظر" style="background:rgba(255,255,255,.12);border:none;color:#fff;border-radius:8px;padding:6px 10px;font-family:Tajawal;font-size:11px;font-weight:700;cursor:pointer;flex-shrink:0">حظر</button>'
    +'</div>'
    +'<div id="p-chat-msgs" style="flex:1 1 auto;min-height:0;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:2px;background:var(--bg)"><div style="text-align:center;padding:20px;color:var(--muted);font-size:12px">جاري التحميل...</div></div>'
    +'<div id="p-reply-bar" style="display:none;align-items:center;gap:8px;background:var(--bg);padding:7px 12px;border-top:1px solid var(--border);flex:0 0 auto"></div>'
    +'<div style="display:flex;gap:9px;align-items:flex-end;padding:10px 12px calc(env(safe-area-inset-bottom,0px) + 10px);background:var(--white);border-top:1px solid var(--border);flex:0 0 auto">'
    +'<input type="file" id="p-chat-file" accept="image/*,.pdf,.doc,.docx" style="display:none" onchange="_pAttachFile(this)">'
    +'<button onclick="document.getElementById(\'p-chat-file\').click()" title="إرفاق" style="width:46px;height:46px;flex-shrink:0;border:1.5px solid var(--border);border-radius:50%;background:var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted)"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg></button>'
    +'<textarea id="p-chat-inp" maxlength="2000" placeholder="اكتب رسالتك..." rows="1" style="flex:1;padding:12px 16px;border:1.5px solid var(--border);border-radius:22px;font-family:Tajawal,sans-serif;font-size:14px;outline:none;resize:none;max-height:90px;background:var(--bg);line-height:1.5"></textarea>'
    +'<button id="p-chat-send" title="إرسال" style="width:46px;height:46px;flex-shrink:0;border:none;border-radius:50%;background:linear-gradient(135deg,var(--p3),#2563eb);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 10px rgba(30,58,138,.28)"><svg width="19" height="19" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" style="transform:scaleX(-1)"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>'
    +'</div>';
  document.body.appendChild(overlay);
  _pBindKeyboardFix(overlay);
  _pCheckBlock(receiverId);
  _el('p-chat-close').onclick=function(){overlay.remove();clearInterval(_chatPolling);};
  _el('p-chat-send').onclick=_sendChatMsg;
  _el('p-chat-inp').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();_sendChatMsg();}});
  try{
    var url='/api/messages/'+reqId+(receiverId&&!isNaN(receiverId)?'?with='+receiverId:'');
    var msgs=await _api(url)||[];
    if(Array.isArray(msgs)&&msgs.length>=_chatMsgs.filter(function(m){return !String(m.id).startsWith('tmp_');}).length){_chatMsgs=msgs;_renderChatMsgs();}
  }catch(e){}
  // التحديث كل 6 ثواني، ويوقف لو الصفحة مخفية، وما يعيد الرسم إلا لو فيه جديد
  _chatPolling=setInterval(async function(){
    if(!_el('prov-chat-overlay')){clearInterval(_chatPolling);return;}
    if(document.hidden||(typeof _pollPaused!=='undefined'&&_pollPaused))return;
    if(window._wsLive&&(++_pollTick%5))return; // الاتصال اللحظي شغّال: نكتفي بتحقق كل 30 ثانية
    try{var msgs=await _api('/api/messages/'+reqId+'?with='+receiverId)||[];if(Array.isArray(msgs)&&_pMsgsSig(msgs)!==_pMsgsSig(_chatMsgs)){_chatMsgs=msgs;_renderChatMsgs();}}catch(e){}
  },6000);
}

function _pDayLabel(d){
  var dt=new Date(d), now=new Date();
  var s=function(x){return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();};
  var diff=(s(now)-s(dt))/86400000;
  if(diff===0)return 'اليوم';
  if(diff===1)return 'أمس';
  return dt.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{day:'numeric',month:'long'});
}
// بصمة الرسائل: العدد + آخر رسالة + المقروء/المحذوف (عشان ما نعيد الرسم بدون داعي)
function _pMsgsSig(list){list=list||[];var last=list[list.length-1]||{};var rd=0,dl=0;list.forEach(function(m){if(m.is_read===true||m.is_read==='t'||m.is_read===1)rd++;if(m.deleted_at)dl++;});return list.length+'|'+(last.id||'')+'|'+rd+'|'+dl;}
var _pLastMsgId=null;
function _renderChatMsgs(){
  setTimeout(_pNoReplyNudge,0);
  var wrap=_el('p-chat-msgs');if(!wrap)return;
  // ننزل لتحت بس لو المستخدم كان قريب من الأسفل أو أرسل رسالة جديدة
  var _nearBottom=(wrap.scrollHeight-wrap.scrollTop-wrap.clientHeight)<120;
  var _lastM=_chatMsgs[_chatMsgs.length-1]||{};
  var _newFromMe=_lastM.id!=null&&String(_lastM.id)!==String(_pLastMsgId)&&String(_lastM.sender_id)===String(_me.id);
  if(String(_lastM.id)!==String(_pLastMsgId)&&String(_lastM.id).indexOf('tmp_')!==0)_pLastMsgId=_lastM.id;
  var _stick=_nearBottom||_newFromMe||String(_lastM.id).indexOf('tmp_')===0;
  if(!_chatMsgs.length){wrap.innerHTML='<div style="text-align:center;padding:30px 20px;color:var(--muted);font-size:12.5px;line-height:1.9;margin:auto"><div style="font-size:28px;margin-bottom:8px">💬</div><div style="font-weight:700;color:var(--text);margin-bottom:4px">ابدأ المحادثة</div><div>اسأل عن تفاصيل المشروع أو وضّح عرضك</div></div>';return;}
  var seen={},unique=[];
  _chatMsgs.forEach(function(m){var k=m.id||(m.content+m.created_at);if(!seen[k]){seen[k]=1;unique.push(m);}});
  var lastDay='';
  wrap.innerHTML=unique.map(function(m){
    var h='';
    var dl=_pDayLabel(m.created_at);
    if(dl!==lastDay){ lastDay=dl; h+='<div style="align-self:center;background:rgba(30,58,138,.07);color:var(--muted);font-size:10.5px;font-weight:800;padding:4px 12px;border-radius:20px;margin:6px auto">'+dl+'</div>'; }
    var isMe=(String(m.sender_id)===String(_me.id));
    var align=isMe?'flex-start':'flex-end';var radius=isMe?'16px 16px 16px 4px':'16px 16px 4px 16px';
    var bg=isMe?'var(--p3)':'var(--white)';var color=isMe?'#fff':'var(--text)';var border=isMe?'none':'1px solid var(--border)';
    if(m.deleted_at){
      h+='<div style="display:flex;flex-direction:column;align-items:'+align+';margin-bottom:6px"><div style="max-width:78%;padding:10px 13px;border-radius:'+radius+';background:'+bg+';color:'+color+';border:'+border+';font-size:12.5px;opacity:.55;font-style:italic">🚫 حُذفت هذه الرسالة</div></div>';
      return h;
    }
    var canDel=isMe&&!String(m.id).startsWith('tmp_')&&((Date.now()-new Date(m.created_at).getTime())/60000<60);
    var pl=encodeURIComponent(JSON.stringify({id:m.id,txt:String(m.content||(m.attachment_url?'مرفق':'')).slice(0,60),who:(m.sender_name||(isMe?'أنت':'')),del:canDel}));
    h+='<div style="display:flex;flex-direction:column;align-items:'+align+';margin-bottom:6px"><div class="pmsg" data-m="'+pl+'" oncontextmenu="return _pMsgMenu(event,this)" style="max-width:78%;padding:10px 13px;border-radius:'+radius+';background:'+bg+';color:'+color+';border:'+border+';font-size:13px;line-height:1.7;word-break:break-word">';
    if(!isMe)h+='<div style="font-size:10px;opacity:.55;margin-bottom:3px;font-weight:700">'+_esc(m.sender_name||'')+'</div>';
    // اقتباس الرد
    if(m.reply_to&&m.reply_content){
      h+='<div style="background:rgba(0,0,0,.09);border-inline-start:3px solid '+(isMe?'rgba(255,255,255,.5)':'var(--p3)')+';border-radius:7px;padding:5px 8px;margin-bottom:6px;font-size:11px;opacity:.85"><div style="font-weight:800;margin-bottom:1px">'+_esc(m.reply_sender||'رسالة')+'</div><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:190px">'+_esc(String(m.reply_content).slice(0,60))+'</div></div>';
    }
    // مرفق
    if(m.attachment_url){
      if((m.attachment_type||'').indexOf('image')===0){
        h+='<img loading="lazy" src="'+_esc(_safeUrl(m.attachment_url))+'" onclick="window.open(this.getAttribute(\'src\'),\'_blank\')" style="max-width:100%;border-radius:10px;margin-bottom:'+(m.content?'6px':'0')+';cursor:pointer;display:block">';
      } else {
        h+='<a href="'+_esc(_safeUrl(m.attachment_url))+'" target="_blank" style="display:flex;align-items:center;gap:7px;background:rgba(0,0,0,.08);border-radius:9px;padding:8px 10px;margin-bottom:'+(m.content?'6px':'0')+';text-decoration:none;color:inherit;font-size:12px"><span style="font-size:17px">📎</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+_esc(m.attachment_name||'ملف مرفق')+'</span></a>';
      }
    }
    if(m.content)h+=_esc(m.content);
    var tk='';
    if(isMe && !String(m.id).startsWith('tmp_')){
      var rd=(m.is_read===true||m.is_read==='t'||m.is_read===1);
      tk='<span style="margin-inline-start:4px;color:'+(rd?'#53bdeb':'rgba(255,255,255,.6)')+';font-weight:900;letter-spacing:-2px">'+(rd?'✓✓':'✓')+'</span>';
    }
    h+='<div style="font-size:10px;opacity:.55;margin-top:4px;text-align:left">'+_ago(m.created_at)+tk+'</div>';
    h+='</div></div>';
    return h;
  }).join('');
  if(_stick)setTimeout(function(){wrap.scrollTop=wrap.scrollHeight;},30);
  _pBindLongPress();
}
// ── الضغط المطوّل على الرسالة (المزوّد) ──
function _pBindLongPress(){
  var el=_el('p-chat-msgs'); if(!el)return;
  el.querySelectorAll('.pmsg[data-m]').forEach(function(b){
    if(b._lpBound)return; b._lpBound=true;
    var t=null, moved=false;
    b.addEventListener('touchstart',function(e){ moved=false; t=setTimeout(function(){ if(!moved)_pMsgMenu(e,b); },420); },{passive:true});
    b.addEventListener('touchmove',function(){ moved=true; clearTimeout(t); },{passive:true});
    b.addEventListener('touchend',function(){ clearTimeout(t); },{passive:true});
    b.addEventListener('dblclick',function(e){ _pMsgMenu(e,b); });
  });
}
function _pMsgMenu(e,el){
  if(e&&e.preventDefault)e.preventDefault();
  var d={}; try{ d=JSON.parse(decodeURIComponent(el.getAttribute('data-m')||'{}')); }catch(err){}
  if(navigator.vibrate)try{navigator.vibrate(12);}catch(err){}
  var sheet=document.createElement('div');
  sheet.id='pMsgSheet';
  sheet.style.cssText='position:fixed;inset:0;z-index:1200;background:rgba(15,23,42,.35);display:flex;align-items:flex-end;justify-content:center';
  var btn='display:flex;align-items:center;gap:12px;width:100%;padding:15px 18px;background:none;border:none;font-family:Tajawal,sans-serif;font-size:14.5px;font-weight:700;cursor:pointer;text-align:right;color:var(--text);border-bottom:1px solid var(--border)';
  sheet.innerHTML='<div style="background:var(--white);width:100%;max-width:460px;border-radius:20px 20px 0 0;overflow:hidden;padding-bottom:calc(env(safe-area-inset-bottom,0px) + 6px)">'
    +'<div style="width:38px;height:4px;background:var(--border);border-radius:3px;margin:9px auto"></div>'
    +'<button style="'+btn+'" onclick="_pSheetAct(\'reply\')"><span style="font-size:19px">↩️</span> رد على الرسالة</button>'
    +'<button style="'+btn+'" onclick="_pSheetAct(\'copy\')"><span style="font-size:19px">📋</span> نسخ النص</button>'
    +(d.del?'<button style="'+btn+';color:var(--red)" onclick="_pSheetAct(\'delete\')"><span style="font-size:19px">🗑️</span> حذف الرسالة</button>':'')
    +'<button style="'+btn+';border-bottom:none;justify-content:center;color:var(--muted)" onclick="_pCloseSheet()">إلغاء</button>'
    +'</div>';
  sheet.onclick=function(ev){ if(ev.target===sheet)_pCloseSheet(); };
  window._pSheetData=d;
  document.body.appendChild(sheet);
  return false;
}
function _pCloseSheet(){ var s=_el('pMsgSheet'); if(s)s.remove(); }
function _pSheetAct(act){
  var d=window._pSheetData||{}; _pCloseSheet();
  if(act==='reply') _pReplyTo(d.id,d.txt,d.who);
  else if(act==='copy'){ _copyText(d.txt); }
  else if(act==='delete') _pDeleteMsg(d.id);
}
// الرد على رسالة (المزوّد)
var _pReplyCtx=null;
function _pReplyTo(id,preview,who){
  _pReplyCtx={id:id,preview:preview,who:who};
  var bar=_el('p-reply-bar');
  if(bar){
    bar.style.display='flex';
    bar.innerHTML='<div style="flex:1;min-width:0;border-inline-start:3px solid var(--p3);padding-inline-start:8px"><div style="font-size:10.5px;font-weight:800;color:var(--p3)">رد على '+_esc(who||'')+'</div><div style="font-size:11.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+_esc(preview||'')+'</div></div><button onclick="_pCancelReply()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted);padding:0 6px">×</button>';
  }
  var inp=_el('p-chat-inp'); if(inp)inp.focus();
}
function _pCancelReply(){ _pReplyCtx=null; var bar=_el('p-reply-bar'); if(bar){bar.style.display='none';bar.innerHTML='';} }
function _pDeleteMsg(id){
  if(!confirm('حذف هذه الرسالة؟'))return;
  _api('/api/messages/'+id,{method:'DELETE'}).then(function(r){
    if(!r||r.message)throw new Error();
    if(typeof showToast==='function')showToast('تم الحذف','success');
    // نحدّث الرسائل بعد الحذف (أي خطأ هنا ما يعني إن الحذف فشل)
    try{ if(_chatReqId&&typeof _renderChatMsgs==='function'){ _api('/api/messages/'+_chatReqId+'?with='+_chatReceiverId).then(function(msgs){ if(Array.isArray(msgs)){_chatMsgs=msgs;_renderChatMsgs();} }).catch(function(){}); } }catch(e){}
  }).catch(function(){ if(typeof showToast==='function')showToast('تعذّر الحذف (خلال ساعة فقط)','error'); });
}
// إرفاق ملف (المزوّد)
var _pPendingAttach=null;
function _pAttachFile(inp){
  var f=inp.files&&inp.files[0]; inp.value='';
  if(!f)return;
  if(f.size>10*1024*1024){ if(typeof showToast==='function')showToast('الحجم الأقصى 10MB','error'); return; }
  if(typeof showToast==='function')showToast('جاري رفع الملف...','info');
  var send=function(dataUrl){ _pPendingAttach={data:dataUrl,type:f.type||'application/octet-stream',name:f.name}; _sendChatMsg(); };
  if(/^image\//.test(f.type)) _pCompress(f,send);
  else { var r=new FileReader(); r.onload=function(e){send(e.target.result);}; r.readAsDataURL(f); }
}

async function _sendChatMsg(){
  if(window._pSendingMsg)return;                      // منع الإرسال المزدوج
  var inp=_el('p-chat-inp');if(!inp)return;var content=inp.value.trim();
  var att=_pPendingAttach; _pPendingAttach=null;
  if(!content&&!att)return;
  var rep=_pReplyCtx; _pCancelReply();
  var btn=_el('p-chat-send');
  window._pSendingMsg=true;
  inp.value='';inp.style.height='auto';
  if(btn){btn.disabled=true;btn.style.opacity='.6';}
  var payload={request_id:_chatReqId,receiver_id:_chatReceiverId,content:content};
  if(att){payload.attachment_url=att.data;payload.attachment_type=att.type;payload.attachment_name=att.name;}
  if(rep&&rep.id)payload.reply_to=rep.id;
  var tempMsg={id:'tmp_'+Date.now(),sender_id:_myId,content:content,created_at:new Date().toISOString(),sender_name:'أنت',attachment_url:att?att.data:null,attachment_type:att?att.type:null,attachment_name:att?att.name:null,reply_to:rep?rep.id:null,reply_content:rep?rep.preview:null,reply_sender:rep?rep.who:null};
  _chatMsgs.push(tempMsg);_renderChatMsgs();
  try{
    await _api('/api/messages',{method:'POST',body:JSON.stringify(payload)});
    var msgs=await _api('/api/messages/'+_chatReqId+'?with='+_chatReceiverId)||[];
    if(Array.isArray(msgs)){_chatMsgs=msgs;_renderChatMsgs();}
  }catch(e){
    _chatMsgs=_chatMsgs.filter(function(m){return m.id!==tempMsg.id;});_renderChatMsgs();
    inp.value=content;                                 // أعِد النص ليحاول مجدداً
    if(typeof showToast==='function')showToast('تعذّر الإرسال — تحقّق من اتصالك','error');
  }finally{
    window._pSendingMsg=false;
    if(btn){btn.disabled=false;btn.style.opacity='';}
    inp.focus();
  }
}

document.addEventListener('DOMContentLoaded',function(){
  var saved=sessionStorage.getItem('mnq_prov_page');
  // رابط مباشر لقسم (مثل #saai من صفحة السداد) يتقدّم على آخر قسم محفوظ
  var _h=(location.hash||'').replace('#','');
  var pg=(_h&&_pages[_h])?_h:((saved&&_pages[saved])?saved:'home');
  gotoPage(pg);
});

var _wsChatT=null,_pollTick=0;
function _pReloadChat(){
  if(!_el('prov-chat-overlay')||!_chatReqId)return;
  _api('/api/messages/'+_chatReqId+'?with='+_chatReceiverId).then(function(msgs){
    if(Array.isArray(msgs)&&_pMsgsSig(msgs)!==_pMsgsSig(_chatMsgs)){_chatMsgs=msgs;_renderChatMsgs();}
  }).catch(function(){});
}
// هل محادثة هذا الشخص مفتوحة قدام المزوّد؟
window._chatViewing=function(uid){ return !!(_el('prov-chat-overlay') && !document.hidden && String(_chatReceiverId)===String(uid)); };
// تحديث لحظي للمحادثة المفتوحة وقائمة المحادثات
window.addEventListener('ws_message', function(e) {
  try {
    var m = e.detail || {};
    var other = m.type==='new_message'?m.sender_id:m.type==='messages_read'?m.reader_id:m.type==='message_deleted'?m.sender_id:m.type==='message_sent'?(m.message&&m.message.receiver_id):null;
    if (other == null) return;
    if (_el('prov-chat-overlay') && String(_chatReceiverId) === String(other)) { clearTimeout(_wsChatT); _wsChatT=setTimeout(_pReloadChat,250); }
    if (m.type === 'new_message') {
      if (_el('page-chat') && !_el('prov-chat-overlay') && typeof _refreshProvConvList==='function') _refreshProvConvList();
      _loadChatBadge();
    }
  } catch(e) {}
});

// Helper: chat from project modal

// Helpers لإصلاح onclick مع المتغيرات المعقدة
function _rptFromView(cid, rid){
  var r = window._currentViewReq || {};
  openReportModal(cid, r.client_name||'عميل', rid);
}
function _openChatConv(reqId, clientId){
  // جلب الاسم من قائمة المحادثات
  var convs = window._lastConvs || [];
  var cv = convs.find(function(c){ return String(c.request_id)===String(reqId); }) || {};
  openChatRoom(reqId, clientId, cv.client_name||'', cv.request_title||'');
}

function _chatFromProj(reqId, clientId){
  closeModal();
  openChatRoom(reqId, clientId, '', '');
}

var _cfResolve=null;
function askConfirm(opts){
  opts=opts||{};
  document.getElementById('cf-title').textContent=opts.title||'تأكيد';
  document.getElementById('cf-msg').textContent=opts.message||'هل أنت متأكد؟';
  var ok=document.getElementById('cf-ok');
  ok.textContent=opts.confirmText||'تأكيد';
  ok.className='cf-btn cf-confirm'+(opts.safe?' safe':'');
  var ic=document.getElementById('cf-ic');
  if(opts.safe){ic.style.background='var(--p-light,#dbeafe)';ic.querySelector('svg').setAttribute('stroke','var(--p,#1e3a8a)');}
  else{ic.style.background='#FEE2E2';ic.querySelector('svg').setAttribute('stroke','#DC2626');}
  document.getElementById('confirmOverlay').classList.add('show');
  return new Promise(function(res){_cfResolve=res;});
}
function cfClose(val){
  document.getElementById('confirmOverlay').classList.remove('show');
  if(_cfResolve){_cfResolve(val);_cfResolve=null;}
}


function openReply(reviewId){
  var reply=prompt('اكتب ردك على هذا التقييم:');
  if(reply===null||!reply.trim())return;
  _api('/api/reviews/'+reviewId+'/reply',{method:'POST',body:JSON.stringify({reply:reply.trim()})})
    .then(function(){if(window.showToast)showToast('تم نشر ردك','success');loadReviews();})
    .catch(function(){if(window.showToast)showToast('تعذر النشر','error');});
}
function _viewImg(src){
  var o=document.createElement('div');
  o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;cursor:pointer';
  o.onclick=function(){o.remove();};
  o.innerHTML='<img loading="lazy" src="'+_esc(_safeUrl(src))+'" style="max-width:100%;max-height:100%;border-radius:12px">';
  document.body.appendChild(o);
}


function _arN(n,u){var f={m:['دقيقة','دقيقتين','دقائق','دقيقة'],h:['ساعة','ساعتين','ساعات','ساعة'],d:['يوم','يومين','أيام','يوماً'],mo:['شهر','شهرين','أشهر','شهراً'],b:['عرض واحد','عرضين','عروض','عرضاً']}[u];n=parseInt(n)||0;if(n===0)return u==='b'?'لا عروض':'0 '+f[3];if(n===1)return f[0];if(n===2)return f[1];if(n<=10)return n+' '+f[2];return n+' '+f[3];}
function timeAgoP(d){if(!d)return '';var s=Math.floor((Date.now()-new Date(d))/1000);if(s<60)return 'الآن';var m=Math.floor(s/60);if(m<60)return 'منذ '+_arN(m,'m');var h=Math.floor(m/60);if(h<24)return 'منذ '+_arN(h,'h');var dy=Math.floor(h/24);if(dy<30)return 'منذ '+_arN(dy,'d');return 'منذ '+_arN(Math.floor(dy/30),'mo');}

// ═══ الأسئلة والتوضيحات (لوحة المزود) ═══
function _provPending(q){ return !(q.answer&&String(q.answer).trim()); }
function _loadProjQuestions(id){
  var bd=_el('mBd'); if(!bd)return;
  var slot=_el('prov-qa-slot');
  if(!slot){ slot=document.createElement('div'); slot.id='prov-qa-slot'; slot.style.marginTop='14px'; bd.appendChild(slot); }
  slot.innerHTML='<div style="font-size:12px;color:var(--muted)">جارٍ تحميل الأسئلة…</div>';
  _api('/api/requests/'+id+'/questions').then(function(qs){
    if(!Array.isArray(qs))qs=[];
    var mine=_me&&_me.id;
    var html='<div style="font-size:13px;font-weight:800;color:var(--text);margin-bottom:9px;display:flex;align-items:center;gap:6px"><svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>الأسئلة والتوضيحات</div>';
    if(qs.length){
      qs.forEach(function(q){
        var nm=q.asker_name||'مزود'; var ans=(q.answer&&String(q.answer).trim())?q.answer:'';
        var isMine=mine&&String(q.asker_id)===String(mine);
        html+='<div style="background:var(--bg);border:1px solid var(--border);'+(isMine?'border-right:3px solid var(--p);':'')+'border-radius:10px;padding:11px 13px;margin-bottom:9px">';
        html+='<div style="font-size:12px;font-weight:800;color:var(--text);margin-bottom:4px">'+_esc(nm)+(isMine?' <span style="font-size:9px;color:var(--p);background:var(--p-light);padding:1px 6px;border-radius:10px">سؤالك</span>':'')+' <span style="font-size:10px;color:var(--muted);font-weight:600">'+timeAgoP(q.created_at)+'</span></div>';
        html+='<div style="font-size:12.5px;color:var(--text);line-height:1.6">'+_esc(q.body||'')+'</div>';
        if(ans){ html+='<div style="background:var(--gold-l);border-radius:8px;padding:9px 11px;margin-top:8px"><div style="font-size:10px;font-weight:800;color:var(--gold-d);margin-bottom:2px">رد صاحب المشروع:</div><div style="font-size:12.5px;color:var(--text)">'+_esc(ans)+'</div></div>'; }
        else { html+='<div style="font-size:11px;color:var(--muted);margin-top:6px">بانتظار رد صاحب المشروع…</div>'; }
        html+='</div>';
      });
    } else {
      html+='<div style="font-size:12px;color:var(--muted);margin-bottom:10px">لا توجد أسئلة بعد — كن أول من يسأل.</div>';
    }
    // صندوق طرح سؤال
    html+='<textarea id="prov-q-input-'+id+'" placeholder="اطرح سؤالاً لصاحب المشروع..." style="width:100%;min-height:48px;padding:9px 11px;border:1.5px solid var(--border);border-radius:9px;font-family:inherit;font-size:12px;color:var(--text);outline:none;resize:vertical;box-sizing:border-box"></textarea>';
    html+='<button onclick="_provAskQuestion('+id+')" style="margin-top:6px;background:var(--p);color:#fff;border:none;border-radius:8px;padding:7px 16px;font-family:inherit;font-size:12px;font-weight:800;cursor:pointer">إرسال السؤال</button>';
    if(slot) slot.innerHTML=html;
    // عند فتح المشروع، علّم ردوده كمقروءة
    var mineSeen=[]; qs.forEach(function(q){ if(mine&&String(q.asker_id)===String(mine)&&(q.answer&&String(q.answer).trim())) mineSeen.push(q.id); });
    if(mineSeen.length) _seenAnsAdd(mineSeen);
  }).catch(function(){ if(slot)slot.innerHTML=''; });
}
function _provAskQuestion(id){
  var inp=_el('prov-q-input-'+id); if(!inp)return; var txt=(inp.value||'').trim();
  if(!txt){ showToast('اكتب سؤالك أولاً','error'); return; }
  _api('/api/requests/'+id+'/questions',{method:'POST',body:JSON.stringify({body:txt})}).then(function(r){
    if(r&&!r.message){ showToast('تم إرسال سؤالك'); _loadProjQuestions(id); }
    else { showToast((r&&r.message)||'تعذّر إرسال السؤال','error'); }
  }).catch(function(){ showToast('تعذّر إرسال السؤال','error'); });
}

// تتبّع الردود المقروءة (localStorage)
function _seenAnsGet(){ try{ return JSON.parse(localStorage.getItem('_seenAns')||'[]'); }catch(e){ return []; } }
function _seenAnsAdd(ids){ try{ var st=_seenAnsGet(); ids.forEach(function(i){ if(st.indexOf(i)<0)st.push(i); }); localStorage.setItem('_seenAns',JSON.stringify(st.slice(-500))); }catch(e){} }

// نبيه "ردود جديدة على أسئلتك" في الرئيسية
var _provAnsState=null;
function _renderProvAnswerNudge(){
  var slot=_el('ph-qa-nudge'); if(!slot)return; slot.innerHTML='';
  var mine=_me&&_me.id; if(!mine)return;
  var reqs=[]; (_myBids||[]).forEach(function(b){ if(b.request_id&&reqs.indexOf(b.request_id)<0)reqs.push(b.request_id); });
  reqs=reqs.slice(0,25); if(!reqs.length)return;
  var seen=_seenAnsGet();
  var total=0, topReq=null, topTs=-1, allQids=[], done=0;
  reqs.forEach(function(rid){
    _api('/api/requests/'+rid+'/questions').then(function(qs){
      if(Array.isArray(qs)){
        qs.forEach(function(q){
          var ans=(q.answer&&String(q.answer).trim());
          if(ans && String(q.asker_id)===String(mine) && seen.indexOf(q.id)<0){
            total++; allQids.push(q.id);
            var ts=new Date(q.answered_at||q.created_at).getTime()||0;
            if(ts>=topTs){ topTs=ts; topReq=rid; }
          }
        });
      }
    }).catch(function(){}).then(function(){
      done++; if(done===reqs.length) _paintProvAnsNudge(total,topReq,allQids);
    });
  });
}
function _paintProvAnsNudge(total,topReq,qids){
  var slot=_el('ph-qa-nudge'); if(!slot)return;
  if(!total||!topReq){ slot.innerHTML=''; return; }
  _provAnsState={req:topReq,qids:qids};
  var chev='<svg width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>';
  slot.innerHTML='<div class="nudge" style="border-right-color:var(--green);margin-bottom:8px" onclick="_provOpenAnswers()">'
    +'<div class="nudge-ic" style="background:var(--green-l);color:var(--green)"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div>'
    +'<div class="nudge-body"><div class="nudge-t">'+total+' '+(total===1?'رد جديد على سؤالك':'ردود جديدة على أسئلتك')+'</div><div class="nudge-s">صاحب المشروع ردّ — اضغط لقراءة الرد</div></div>'
    +'<div class="nudge-cta" style="color:var(--green)">قراءة '+chev+'</div></div>';
}
function _provOpenAnswers(){
  if(!_provAnsState)return;
  _seenAnsAdd(_provAnsState.qids||[]);
  var rid=_provAnsState.req;
  var slot=_el('ph-qa-nudge'); if(slot)slot.innerHTML='';
  _viewProj(rid);
}


// ═══ طلب اعتماد العرض داخل المنصة ═══
// بطاقة تحفيز: التقييم ما يُفتح إلا لما العميل يعتمد العرض داخل المنصة
function _askMotivCard(){
  var eligible=_myBids.filter(function(b){return b.ask_can||b.ask_status==='pending';}).length;
  if(!eligible)return '';
  var pr=((_cacheGet('home_data')||{}).profile)||{};
  var rating=parseFloat(pr.avg_rating||pr.rating||0)||0, rc=parseInt(pr.review_count||0)||0;
  var docs=_myBids.filter(function(b){return b.status==='accepted';}).length;
  var cell=function(v,l){return '<div style="flex:1;background:rgba(255,255,255,.13);border-radius:12px;padding:9px 6px;text-align:center"><b style="font-size:19px;display:block;font-family:Cairo,Tajawal,sans-serif">'+v+'</b><span style="font-size:11.5px;font-weight:700;color:#fed7aa">'+l+'</span></div>';};
  return '<div style="display:flex;align-items:center;gap:10px;background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:10px 12px;margin-bottom:14px;font-size:13px;font-weight:700;color:#7c2d12;line-height:1.6">'
    +'<svg width="20" height="20" viewBox="0 0 24 24" fill="#f59e0b" stroke="#b45309" stroke-width="1.5" stroke-linejoin="round" style="flex-shrink:0" aria-hidden="true"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>'
    +'<span style="flex:1"><b>'+eligible+(eligible===1?' عرض ينتظر':' عروض تنتظر')+' اعتماد العميل</b> — اعتماده يفتح لك التقييم'+(rating?' · تقييمك '+rating.toFixed(1)+(rc?' ('+rc+')':''):'')+'</span></div>';
}
function _askBlock(b){
  if(b.status==='accepted'||b.status==='rejected')return '';
  var btn=function(dis,txt){return '<button onclick="_askAccept('+(parseInt(b.id)||0)+',this)" '+(dis?'disabled ':'')+'style="width:100%;margin-top:10px;padding:12px;border:0;border-radius:11px;font-family:Tajawal,sans-serif;font-size:14px;font-weight:800;cursor:'+(dis?'default':'pointer')+';background:'+(dis?'#f1f5f9':'#b45309')+';color:'+(dis?'#94a3b8':'#fff')+'">'+txt+'</button>';};
  if(b.ask_status==='declined')return '<div style="margin-top:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;font-size:12.5px;font-weight:700;color:#475569;line-height:1.7">العميل رد إنكم ما اتفقتوا بعد على طلب الاعتماد. كمّل التواصل معه — ولو اتفقتوا يقدر يعتمد عرضك من لوحته.</div>';
  if(b.ask_status==='other')return '';
  if(b.ask_status==='pending'){
    var h='<div style="margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 12px;font-size:12.5px;font-weight:700;color:#1e40af;line-height:1.7">أرسلت طلب الاعتماد للعميل'+(b.ask_last_at?' '+_fdt(b.ask_last_at):'')+'. يوصله إشعار ورسالة، ويقدر يعتمده بضغطة.</div>';
    if(b.ask_can)h+=btn(false,'ذكّر العميل باعتماد عرضك ('+b.ask_left+' متبقية)');
    else if(b.ask_why==='cooldown'&&b.ask_next_at){var hrs=Math.max(1,Math.ceil((new Date(b.ask_next_at)-Date.now())/3600000));h+=btn(true,'تذكير العميل (متاح بعد '+hrs+' ساعة)');}
    return h;
  }
  if(!b.ask_can)return '';
  return '<div style="margin-top:10px;background:#fffbeb;border:1.5px solid #fbbf24;border-radius:12px;padding:12px 13px">'
    +'<div style="font-size:13.5px;font-weight:800;color:#78350f;margin-bottom:6px">اتفقت مع العميل؟</div>'
    +'<div style="font-size:12.5px;font-weight:700;color:#92400e;line-height:1.85">اطلب منه يعتمد عرضك بضغطة — يوصله إشعار ورسالة. بعدها يقدر يقيّمك وتطلع النجوم في صفحتك، والمشروع ينحسب «عمل موثّق» ويرفع ترتيبك.</div>'
    +btn(false,'اطلب من العميل اعتماد عرضك')
    +'<div style="font-size:11.5px;font-weight:700;color:#92400e;text-align:center;margin-top:7px;opacity:.85">بعد الاعتماد يُحسب سعي المنصة 3% من قيمة الاتفاق</div></div>';
}
function _askAccept(id,btn){
  var b=_myBids.find(function(x){return String(x.id)===String(id);});
  if(typeof _askConfirmOpen==='function'&&b){ _askConfirmOpen(b,function(pl,done){ _askAcceptSend(id,btn,pl,done); }); return; }
  _askAcceptSend(id,btn,{confirm:true});
}
async function _askAcceptSend(id,btn,payload,done){
  if(btn){btn.disabled=true;btn.textContent='جاري الإرسال…';}
  try{
    var r=await fetch(API+'/api/bids/'+id+'/ask-accept',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+localStorage.getItem('token')},body:JSON.stringify(payload||{confirm:true})});
    var d=await r.json().catch(function(){return {};});
    if(!r.ok){ if(typeof showToast==='function')showToast(d.message||'تعذّر الإرسال','error'); if(btn){btn.disabled=false;btn.textContent='اطلب من العميل اعتماد عرضك';} if(done)done(false,d.message); return; }
    if(done)done(true);
    if(typeof showToast==='function')showToast('أرسلنا طلبك للعميل ✓','success');
    var b=_myBids.find(function(x){return String(x.id)===String(id);});
    if(b&&payload){ if(payload.price)b.price=payload.price; if(payload.days)b.days=payload.days; }
    if(b){ b.ask_status='pending'; b.ask_can=false; b.ask_why='cooldown'; b.ask_next_at=d.next_at; b.ask_left=d.left; b.ask_last_at=new Date().toISOString(); b.ask_sends=d.sends; }
    var w=_el('wtab-bids-wrap'); if(w){ w.innerHTML=_renderBids(_myBids); w.querySelectorAll('._bchat').forEach(function(bt){ bt.addEventListener('click',function(){ openChatRoom(parseInt(bt.getAttribute('data-rid')),parseInt(bt.getAttribute('data-cid')),'',''); }); }); }
  }catch(e){ if(typeof showToast==='function')showToast('تعذّر الاتصال','error'); if(btn){btn.disabled=false;btn.textContent='اطلب من العميل اعتماد عرضك';} if(done)done(false); }
}
// ═══ الإشعارات (تصميم جديد): فلترة حسب النوع + تجميع حسب اليوم + أيقونة ولون لكل نوع ═══
var _nfList=[],_nfFilter='all';
var _NF_I={
  money:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  hand:'<path d="M8 13V5a1.5 1.5 0 013 0v6"/><path d="M11 11V4a1.5 1.5 0 013 0v7"/><path d="M14 11V6a1.5 1.5 0 013 0v8c0 4-3 7-7 7-3 0-5-2-6-4l-2-4a1.5 1.5 0 012.5-1.5L8 14"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>', doc:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>', check:'<path d="M5 12l5 5 9-10"/>',
  star:'<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>', x:'<path d="M6 6l12 12M18 6L6 18"/>', q:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5"/><path d="M12 17h.01"/>'
};
function _nfKind(t){
  t=String(t||'');
  if(t==='accept_ask')return {g:'offers',i:'hand',c:'#b45309',b:'#fef3c7'};
  if(t==='bid_rejected')return {g:'offers',i:'x',c:'#b91c1c',b:'#fee2e2'};
  if(t==='bid_accepted'||t==='completed')return {g:t==='completed'?'projects':'offers',i:'check',c:'#15803d',b:'#dcfce7'};
  if(t==='new_bid'||t==='bid'||t==='negotiate')return {g:'offers',i:'money',c:'#15803d',b:'#dcfce7'};
  if(t==='message'||t==='admin_message')return {g:'messages',i:'chat',c:'#1d4ed8',b:'#dbeafe'};
  if(t==='review'||t==='review_reply')return {g:'projects',i:'star',c:'#b45309',b:'#fef3c7'};
  if(t==='new_question'||t==='question_answered')return {g:'projects',i:'q',c:'#0369a1',b:'#e0f2fe'};
  if(t==='request'||t==='new_request'||t==='request_published'||t==='request_closed')return {g:'projects',i:'doc',c:'#6d28d9',b:'#ede9fe'};
  if(t==='reminder'||t==='saai')return {g:'system',i:'clock',c:'#b45309',b:'#fef3c7'};
  return {g:'system',i:'shield',c:'#475569',b:'#f1f5f9'};
}
function _nfDay(d){
  var dt=new Date(d),now=new Date(); var s=function(x){return new Date(x.getFullYear(),x.getMonth(),x.getDate()).getTime();};
  var diff=Math.round((s(now)-s(dt))/86400000);
  return diff<=0?'اليوم':diff===1?'أمس':diff<7?'هذا الأسبوع':'أقدم';
}
function _nfTime(d){
  try{ var dt=new Date(d), diff=(Date.now()-dt)/1000; if(diff<60)return 'الآن'; if(diff<3600)return 'قبل '+Math.floor(diff/60)+' د'; if(diff<86400&&_nfDay(d)==='اليوم')return 'قبل '+Math.floor(diff/3600)+' س';
    return dt.toLocaleDateString('ar-SA-u-nu-latn-ca-gregory',{weekday:'short',day:'numeric',month:'short'})+' · '+dt.toLocaleTimeString('ar-SA-u-nu-latn-ca-gregory',{hour:'numeric',minute:'2-digit'}); }catch(e){ return ''; }
}
function _nfHTML(filters,openFn){
  var E=function(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});};
  var unread=_nfList.filter(function(n){return !n.is_read;}).length;
  var h='<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px">';
  filters.forEach(function(f){ var on=_nfFilter===f[0]; var cnt=f[0]==='all'?0:_nfList.filter(function(n){return !n.is_read&&_nfKind(n.type).g===f[0];}).length;
    h+='<button onclick="_nfSet(&quot;'+f[0]+'&quot;)" style="border:1.5px solid '+(on?'#1d4ed8':'var(--border,#dbe5f5)')+';background:'+(on?'#1d4ed8':'var(--card,#fff)')+';color:'+(on?'#fff':'var(--text,#334766)')+';border-radius:999px;padding:7px 14px;font-family:Tajawal,sans-serif;font-size:13px;font-weight:800;cursor:pointer">'+f[1]+(cnt?' <span style="background:'+(on?'rgba(255,255,255,.25)':'#dbeafe')+';color:'+(on?'#fff':'#1e40af')+';border-radius:999px;padding:0 7px;font-size:11px">'+cnt+'</span>':'')+'</button>'; });
  h+='</div>';
  var list=_nfList.filter(function(n){return _nfFilter==='all'||_nfKind(n.type).g===_nfFilter;});
  if(!list.length) return h+'<div style="text-align:center;padding:40px 16px;color:var(--muted,#5b6b85);font-size:13.5px;font-weight:700;background:var(--card,#fff);border:1px solid var(--border,#e1e9f6);border-radius:18px">'+(_nfList.length?'ما فيه إشعارات من هذا النوع':'ما فيه إشعارات للحين — نعلمك هنا أول ما يصير شي جديد')+'</div>';
  var groups=[],cur=null;
  list.forEach(function(n){ var g=_nfDay(n.created_at); if(!cur||cur.k!==g){cur={k:g,items:[]};groups.push(cur);} cur.items.push(n); });
  groups.forEach(function(g){
    h+='<div style="font-size:12.5px;font-weight:900;color:var(--muted,#5b6b85);margin:14px 6px 8px">'+g.k+'</div><div style="background:var(--card,#fff);border:1px solid var(--border,#e1e9f6);border-radius:18px;overflow:hidden">';
    g.items.forEach(function(n,i){
      var k=_nfKind(n.type);
      h+='<div role="button" tabindex="0" id="nf-'+(parseInt(n.id)||0)+'" onclick="'+openFn+'('+(parseInt(n.id)||0)+')" style="display:flex;align-items:flex-start;gap:12px;padding:13px 14px;cursor:pointer;'+(i?'border-top:1px solid var(--border,#eef2f8);':'')+(n.is_read?'':'background:rgba(29,78,216,.05);')+'">'
        +'<span style="width:38px;height:38px;border-radius:11px;background:'+k.b+';color:'+k.c+';display:flex;align-items:center;justify-content:center;flex-shrink:0"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+_NF_I[k.i]+'</svg></span>'
        +'<span style="flex:1;min-width:0"><b style="display:block;font-size:14px;font-weight:'+(n.is_read?'700':'900')+';color:var(--text,#14223d);line-height:1.5">'+E(n.title||'')+'</b>'
        +(n.body?'<span style="display:block;font-size:12.5px;font-weight:600;color:var(--muted,#5b6b85);line-height:1.7;margin-top:2px">'+E(n.body)+'</span>':'')
        +'<span style="display:block;font-size:11.5px;font-weight:700;color:#94a3b8;margin-top:4px">'+_nfTime(n.created_at)+'</span></span>'
        +(n.is_read?'':'<span aria-label="غير مقروء" style="width:9px;height:9px;border-radius:9px;background:#1d4ed8;flex-shrink:0;margin-top:6px"></span>')
        +'</div>';
    });
    h+='</div>';
  });
  return h;
}

var _NF_FILTERS_P=[['all','الكل'],['projects','مشاريع'],['offers','عروضي'],['messages','الرسائل'],['system','تنبيهات']];
function _nfSet(k){ _nfFilter=k; _nfPaintP(); }
function _nfPaintP(){
  var pg=_el('page-notifs'); if(!pg)return;
  var unseen=_nfList.filter(function(n){return !n.is_read;}).length;
  var head='<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap"><div class="pg-t" style="margin:0">الإشعارات</div>'+(unseen?'<span style="background:#dbeafe;color:#1e40af;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:900">'+unseen+' جديدة</span>':'')
    +'<span style="margin-right:auto;display:flex;gap:8px">'+(unseen?'<button class="mark-all-btn" onclick="_markRead()">تعليم الكل كمقروء</button>':'')+(_nfList.length?'<button class="mark-all-btn" onclick="_deleteAllNotifs()" style="color:var(--red)">حذف الكل</button>':'')+'</span></div>';
  pg.innerHTML=head+_nfHTML(_NF_FILTERS_P,'_nfOpenP');
}
async function loadNotifs(){
  var pg=_el('page-notifs');if(!pg)return;
  var cached=_cacheGet('notifs'); if(cached&&Array.isArray(cached)){ _nfList=cached; _nfPaintP(); } else pg.innerHTML=_skList(5);
  try{var fresh=await _api('/api/notifications')||[]; _nfList=Array.isArray(fresh)?fresh:[]; _cacheSet('notifs',_nfList);}catch(e){}
  _nfPaintP(); _lb.done();
}
function _nfOpenP(id){
  var n=_nfList.find(function(x){return String(x.id)===String(id);}); if(!n)return;
  if(!n.is_read){ n.is_read=true; _api('/api/notifications/'+id+'/read',{method:'PUT'}); _cacheSet('notifs',_nfList); _nfPaintP(); try{_loadNotifCount();}catch(e){} }
  var t=n.type, k=_nfKind(t).g;
  if(t==='message'||t==='admin_message'){ gotoPage('chat'); return; }
  if(t==='saai'){ gotoPage('saai'); return; }
  if(t==='review'||t==='review_reply'){ gotoPage('reviews'); return; }
  if(k==='offers'||t==='accept_ask'){ gotoPage('works'); return; }
  if(n.ref_id&&(t==='new_request'||t==='request'||t==='new_question'||t==='question_answered')&&typeof _viewProj==='function'){ _viewProj(n.ref_id); return; }
}
