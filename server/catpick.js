/* مناقصة — تحديد التخصص تلقائياً من عنوان المشروع (رئيسي + إضافي حتى 2)
   المصدر الوحيد للتخصص الرئيسي هو <select id="n-cat"> — هذا الملف يعرض واجهة فوقه فقط.
   يحتاج في الصفحة: #n-title و #n-cat و #n-catbox (و _CAT_SYN/_catNorm إن وُجدت) */
(function(){
  if (window.__mqCatPick) return; window.__mqCatPick = true;
  var MAX_EXTRA = 2;
  function norm(t){ return String(t||'').replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').toLowerCase(); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  // كلمات تحتمل أكثر من تخصص (أول واحد = الأرجح)
  var MULTI = [
    ['حمام',['ترميم مبانٍ','سباكة','بلاط ورخام']],['دورات مياه',['ترميم مبانٍ','سباكة','بلاط ورخام']],
    ['ملحق',['بناء','ترميم مبانٍ','تشطيبات ومقاولات عامة']],['تشطيب',['تشطيبات ومقاولات عامة','جبس','دهانات وديكور']],
    ['سطح',['عوازل مائية','عزل حراري']],['عزل',['عزل حراري','عوازل مائية']],['تسريب',['كشف تسربات المياه','سباكة']],['تسرب',['كشف تسربات المياه','سباكة']],
    ['شباك',['ألمنيوم','زجاج ومرايا']],['نوافذ',['ألمنيوم','زجاج ومرايا']],['واجهه',['كلادينج وواجهات','ألمنيوم','زجاج ومرايا']],
    ['درابزين',['حدادة','ألمنيوم','زجاج ومرايا']],['باب',['أبواب وبوابات أوتوماتيكية','نجارة','حدادة']],['ابواب',['أبواب وبوابات أوتوماتيكية','نجارة','حدادة']],
    ['مطبخ',['تركيب مطابخ','نجارة']],
['مستودع',['إنشاءات معدنية وهناجر','بناء']],['خزان',['تنظيف خزانات','عوازل مائية','سباكة']],
    ['مسبح',['مسابح','بلاط ورخام']],['حديقه',['تنسيق حدائق','مظلات وسواتر']],['اضاءه',['كهرباء']],['انارة',['كهرباء']],['افياش',['كهرباء']],['لمبات',['كهرباء']]
  ];
  // تخصصات تُقترح كإضافية مع الرئيسي
  var RELATED = {
    'تبريد وتكييف':['كهرباء','جبس','عزل حراري'],'ترميم مبانٍ':['سباكة','كهرباء','بلاط ورخام','دهانات وديكور'],'بناء':['كهرباء','سباكة','عوازل مائية'],
    'تركيب مطابخ':['سباكة','كهرباء','نجارة'],'مسابح':['سباكة','بلاط ورخام','كهرباء'],'دهانات وديكور':['جبس','ترميم مبانٍ'],'جبس':['دهانات وديكور','كهرباء'],
    'بلاط ورخام':['ترميم مبانٍ','سباكة'],'سباكة':['كشف تسربات المياه','بلاط ورخام'],'كهرباء':['كاميرات مراقبة','شبكات وإنترنت'],'ألمنيوم':['زجاج ومرايا','حدادة'],
    'حدادة':['ألمنيوم','مظلات وسواتر'],'مظلات وسواتر':['حدادة','تنسيق حدائق'],'تنسيق حدائق':['سباكة','كهرباء','مظلات وسواتر'],'كاميرات مراقبة':['شبكات وإنترنت','كهرباء'],
    'عزل حراري':['عوازل مائية'],'عوازل مائية':['عزل حراري','كشف تسربات المياه'],'تشطيبات ومقاولات عامة':['كهرباء','سباكة','جبس'],'أنظمة شمسية':['كهرباء'],
    'تركيب وصيانة مصاعد':['كهرباء','بناء'],'كلادينج وواجهات':['ألمنيوم','زجاج ومرايا'],'زجاج ومرايا':['ألمنيوم'],'نجارة':['تركيب أثاث','دهانات وديكور'],
    'كشف تسربات المياه':['سباكة','عوازل مائية'],'تنظيف خزانات':['عوازل مائية','سباكة'],'حفر آبار ومضخات':['كهرباء','سباكة'],'صرف صحي وبيارات':['سباكة'],
    'شبكات وإنترنت':['كاميرات مراقبة','كهرباء'],'تصاميم داخلي وخارجي':['مكاتب هندسية','دهانات وديكور'],'مكاتب هندسية':['تصاميم داخلي وخارجي','بناء']
  };
  var STOP = {'تركيب':1,'صيانه':1,'وصيانه':1,'اعمال':1,'انظمه':1,'عامه':1,'مقاولات':1,'ومقاولات':1,'السلامه':1,'والسلامه':1,'المروريه':1,'معالجه':1,'ومعالجه':1,'مياه':1,'المياه':1,'المباني':1,'داخلي':1,'وخارجي':1,'تنظيف':0};
  var st = { manual:false, extras:[], cands:[], amb:false, lastSel:null, lastTitle:null, pickSet:null };
  window._cpState = st;
  function $(id){ return document.getElementById(id); }
  function allCats(){ var s=$('n-cat'), out=[]; if(!s) return out; [].forEach.call(s.options,function(o){ var v=o.value||o.text; if(v && o.value!=='' && v!=='أخرى') out.push(v); }); return out; }
  function detect(text){
    var t = norm(text); if (t.replace(/\s/g,'').length < 3) return [];
    var have = {}; allCats().forEach(function(c){ have[c]=1; });
    var sc = {}, ord = {}, n = 0;
    function add(c,w){ if(!have[c]) return; if(!(c in sc)){ sc[c]=0; ord[c]=n++; } sc[c]+=w; }
    MULTI.forEach(function(p){ if (t.indexOf(norm(p[0]))>=0) p[1].forEach(function(c,i){ add(c, i===0?2.2:2); }); });
    (window._CAT_SYN||[]).forEach(function(p){ if (t.indexOf(norm(p[0]))>=0) add(p[1], 3); });
    Object.keys(have).forEach(function(c){ norm(c).split(/\s+/).forEach(function(w){ w=w.replace(/^و/,''); var ww=w.replace(/^ال/,''); if (ww.length>=4 && !STOP[w] && !STOP['و'+w] && t.indexOf(ww)>=0) add(c, 2.5); }); });
    return Object.keys(sc).sort(function(a,b){ return (sc[b]-sc[a]) || (ord[a]-ord[b]); }).map(function(c){ return {c:c, s:sc[c]}; });
  }
  function setPrimary(c, manual){
    var s=$('n-cat'); if(!s) return;
    if (manual) st.manual = true;
    st.extras = st.extras.filter(function(x){ return x!==c; });
    if (c==='أخرى') st.extras = [];
    if (s.value !== c){ s.value = c; st.lastSel = c; s.dispatchEvent(new Event('change')); }
    render();
  }
  function toggleExtra(c){
    var i = st.extras.indexOf(c);
    if (i>=0) st.extras.splice(i,1);
    else { if (st.extras.length>=MAX_EXTRA){ note('الحد تخصصين إضافيين'); return; } st.extras.push(c); }
    render();
  }
  function note(m){ try{ (typeof showToast==='function'?showToast:(typeof toast==='function'?toast:function(){}))(m,'error'); }catch(e){} }
  // الاختيار المتعدد عند الغموض: أول واحد = الرئيسي
  function pickToggle(c){
    st.manual = true;
    var set = st.pickSet || [];
    var i = set.indexOf(c);
    if (i>=0) set.splice(i,1); else { if (set.length>=1+MAX_EXTRA){ note('تقدر تختار حتى 3'); return; } set.push(c); }
    st.pickSet = set;
    var s=$('n-cat');
    st.extras = set.slice(1);
    var p = set[0] || '';
    if (s && s.value !== p){ s.value = p; st.lastSel = p; s.dispatchEvent(new Event('change')); }
    render();
  }
  function onTitle(){
    var ti=$('n-title'); if(!ti) return;
    var v = ti.value; if (v === st.lastTitle) return; st.lastTitle = v;
    var s=$('n-cat');
    if (!v.trim() && s && !s.value){ st.manual=false; st.extras=[]; st.pickSet=null; }
    st.cands = detect(v);
    if (!st.manual){
      var tops = st.cands.filter(function(x,i){ return i<3 && x.s >= st.cands[0].s - 0.6; });
      st.amb = tops.length > 1;
      if (st.amb){ st.pickSet = [tops[0].c]; st.extras = []; st.ambList = tops.map(function(x){return x.c;}); }
      else { st.pickSet = null; st.ambList = null; }
      var want = st.cands.length ? st.cands[0].c : '';
      if (s && want && s.value !== want){ s.value = want; st.lastSel = want; st.autoSet = want; s.dispatchEvent(new Event('change')); }
      else if (s && want) st.autoSet = want;
      // ما عاد فيه تطابق: نفرّغ فقط اللي حطّيناه تلقائياً (مو اختيار العميل)
      if (s && !want && s.value && s.value === st.autoSet){ s.value = ''; st.lastSel = ''; st.autoSet = null; s.dispatchEvent(new Event('change')); }
    }
    render();
  }
  var BTN = 'font-family:inherit;cursor:pointer;';
  function chip(label, on, act, extra){ return '<button type="button" data-cp="'+act+'" data-c="'+esc(label)+'" style="'+BTN+'border:1.5px solid '+(on?'#1d4ed8':'#dbe5f5')+';background:'+(on?'#eef3ff':'#fff')+';color:'+(on?'#1e3a8a':'#334766')+';border-radius:999px;padding:8px 13px;font-size:13px;font-weight:800;min-height:38px'+(extra||'')+'">'+(on?'✓ ':'+ ')+esc(label)+'</button>'; }
  function render(){
    var box=$('n-catbox'), s=$('n-cat'); if(!box||!s) return;
    st.lastSel = s.value;
    var p = s.value, h = '';
    var ti=$('n-title'), hasT = ti && ti.value.trim().length>=3;
    if (st.amb && st.ambList && !(!st.manual && !hasT)){
      var set = st.pickSet||[];
      h += '<div style="background:#fff;border:1.5px solid #dbe5f5;border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:9px">'
        + '<div style="display:flex;align-items:center"><b style="font-size:14px;flex:1">وش يشمل طلبك؟</b><span style="font-size:11.5px;font-weight:900;color:#1d4ed8;background:#eef3ff;border-radius:999px;padding:3px 10px">'+set.length+' من 3</span></div>'
        + '<div style="font-size:12px;font-weight:700;color:#5b6b85;margin-top:-4px">تقدر تختار أكثر من واحد — أول اختيار يصير الرئيسي</div>';
      var list = st.ambList.slice(); set.forEach(function(c){ if(list.indexOf(c)<0) list.push(c); });
      list.forEach(function(c){
        var i = set.indexOf(c), on = i>=0;
        h += '<button type="button" data-cp="pk" data-c="'+esc(c)+'" style="'+BTN+'display:flex;align-items:center;gap:10px;text-align:right;border:1.5px solid '+(i===0?'#1d4ed8':(on?'#93c5fd':'#dbe5f5'))+';background:'+(i===0?'#eef3ff':(on?'#f5f9ff':'#fff'))+';border-radius:14px;padding:12px 13px;font-size:14px;font-weight:800;color:#14223d">'
          + '<span style="flex:1">'+esc(c)+(i===0?' <span style="font-size:10.5px;font-weight:900;color:#fff;background:#1d4ed8;border-radius:6px;padding:1px 7px">رئيسي</span>':(on?' <span style="font-size:10.5px;font-weight:900;color:#1e3a8a;background:#dbeafe;border-radius:6px;padding:1px 7px">إضافي</span>':''))+'</span>'
          + '<span style="width:22px;height:22px;border-radius:7px;flex-shrink:0;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:13px;'+(on?'background:#1d4ed8;color:#fff':'border:2px solid #cbd5e1')+'">'+(on?'✓':'')+'</span></button>';
      });
      h += '<button type="button" data-cp="sheet" style="'+BTN+'background:none;border:0;color:#1d4ed8;font-size:12.5px;font-weight:800;padding:4px">ولا واحد منها؟ اختر من كل التخصصات</button>';
      if (set.length) h += '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:9px 11px;font-size:12.5px;font-weight:800;color:#166534">يوصل مشروعك لمزوّدين: '+set.map(esc).join(' + ')+'</div>';
      h += '</div>';
    } else if (p){
      var auto = !st.manual && st.cands.length && st.cands[0].c===p;
      h += '<div style="display:flex;align-items:center;gap:10px;background:'+(p==='أخرى'?'#fff7ed':'#f0fdf4')+';border:1.5px solid '+(p==='أخرى'?'#fed7aa':'#86efac')+';border-radius:14px;padding:11px 13px">'
        + '<div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:800;color:'+(p==='أخرى'?'#c2410c':'#15803d')+'">'+(auto?'✓ فهمنا طلبك — التخصص الرئيسي:':'التخصص الرئيسي:')+'</div><div style="font-size:15.5px;font-weight:900;color:#14223d">'+esc(p)+'</div></div>'
        + '<button type="button" data-cp="sheet" style="'+BTN+'background:#fff;border:1.5px solid #cbd5e1;color:#1e3a8a;border-radius:10px;padding:8px 13px;font-size:12.5px;font-weight:800">تغيير</button></div>';
      if (p !== 'أخرى'){
        var sug = []; st.extras.forEach(function(c){ sug.push(c); });
        st.cands.forEach(function(x){ if (x.c!==p && x.s>=2 && sug.indexOf(x.c)<0 && sug.length<4) sug.push(x.c); });
        (RELATED[p]||[]).forEach(function(c){ if (c!==p && sug.indexOf(c)<0 && sug.length<5 && allCats().indexOf(c)>=0) sug.push(c); });
        h += '<div style="margin-top:9px;background:#fff;border:1.5px dashed #b6c7e6;border-radius:14px;padding:11px 13px;display:flex;flex-direction:column;gap:9px">'
          + '<div style="display:flex;align-items:center;gap:8px"><b style="font-size:13.5px;flex:1">يحتاج شغل من تخصص ثاني؟</b><span style="font-size:11.5px;font-weight:800;color:#5b6b85">اختياري · حتى 2</span></div>'
          + '<div style="display:flex;flex-wrap:wrap;gap:7px">' + sug.map(function(c){ return chip(c, st.extras.indexOf(c)>=0, 'ex'); }).join('')
          + '<button type="button" data-cp="sheetx" style="'+BTN+'border:1.5px solid #dbe5f5;background:#fff;color:#1d4ed8;border-radius:999px;padding:8px 13px;font-size:13px;font-weight:800;min-height:38px">كل التخصصات…</button></div>'
          + (st.extras.length?'<div style="font-size:12px;font-weight:800;color:#166534">يوصل مشروعك لمزوّدين: '+[p].concat(st.extras).map(esc).join(' + ')+'</div>':'<div style="font-size:11.5px;font-weight:700;color:#5b6b85">لو طلبك يشمل أكثر من شغلة، أضف تخصصها عشان يوصل لمختصّيها بعد</div>')
          + '</div>';
      }
    } else if (hasT){
      h += '<div style="display:flex;align-items:center;gap:10px;background:#fff;border:1.5px solid #dbe5f5;border-radius:14px;padding:11px 13px"><div style="flex:1;font-size:13px;font-weight:800;color:#5b6b85">ما قدرنا نحدد التخصص من العنوان</div><button type="button" data-cp="sheet" style="'+BTN+'background:#1d4ed8;border:0;color:#fff;border-radius:10px;padding:9px 14px;font-size:13px;font-weight:800">اختر التخصص</button></div>';
    } else {
      h += '<div style="font-size:12px;font-weight:700;color:#5b6b85">اكتب بكلامك وبنحدد التخصص تلقائياً — مثل «تركيب مكيفات» أو «ترميم حمام» · <button type="button" data-cp="sheet" style="'+BTN+'background:none;border:0;color:#1d4ed8;font-weight:800;font-size:12px;padding:0;text-decoration:underline">أو اختر بنفسك</button></div>';
    }
    box.innerHTML = h;
  }
  // ── قائمة الاختيار (تغيير / كل التخصصات) ──
  var sheetMode = 'p';
  function openSheet(mode){
    sheetMode = mode;
    var ov = $('cp-sheet');
    if (!ov){
      ov = document.createElement('div'); ov.id='cp-sheet';
      ov.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.45);display:flex;align-items:flex-end;justify-content:center;direction:rtl;font-family:Tajawal,system-ui,sans-serif';
      ov.innerHTML='<div style="background:#fff;width:100%;max-width:560px;max-height:82vh;border-radius:22px 22px 0 0;display:flex;flex-direction:column;box-shadow:0 -12px 40px rgba(15,23,42,.25)">'
        +'<div style="padding:10px 18px 8px"><div style="width:44px;height:5px;border-radius:5px;background:#dbe5f5;margin:0 auto 10px"></div><div style="display:flex;align-items:center"><b id="cp-sh-t" style="font-size:16px;flex:1;color:#14223d"></b><button type="button" id="cp-sh-x" aria-label="إغلاق" style="border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;font-size:16px;cursor:pointer">✕</button></div>'
        +'<input id="cp-sh-q" placeholder="ابحث: مكيف، مظلة، خزان…" style="margin-top:10px;width:100%;box-sizing:border-box;border:1.5px solid #dbe5f5;border-radius:12px;padding:11px 13px;font-family:inherit;font-size:14px"></div>'
        +'<div id="cp-sh-l" style="overflow:auto;padding:0 18px 22px"></div></div>';
      document.body.appendChild(ov);
      ov.addEventListener('click', function(e){ if (e.target===ov || e.target.id==='cp-sh-x') closeSheet(); });
      $('cp-sh-q').addEventListener('input', fillSheet);
      $('cp-sh-l').addEventListener('click', function(e){
        var b = e.target.closest('[data-sc]'); if(!b) return; var c = b.getAttribute('data-sc');
        if (sheetMode==='x'){ if (c===$('n-cat').value) return; toggleExtra(c); fillSheet(); return; }
        if (st.amb) st.extras=[]; st.amb=false; st.ambList=null; st.pickSet=null; setPrimary(c, true); closeSheet();
        if (c==='أخرى'){ var o=$('n-cat-other'); if(o) setTimeout(function(){ try{o.focus();}catch(e){} },80); }
      });
    }
    $('cp-sh-t').textContent = mode==='x' ? 'أضف تخصص إضافي (حتى 2)' : 'اختر التخصص الرئيسي';
    $('cp-sh-q').value=''; fillSheet(); ov.style.display='flex';
  }
  function closeSheet(){ var ov=$('cp-sheet'); if(ov) ov.style.display='none'; }
  function fillSheet(){
    var q = norm(($('cp-sh-q')||{}).value||'').trim(), p = ($('n-cat')||{}).value||'';
    var cats = allCats(), top = [], rest = [];
    var hit = q ? detect(q).map(function(x){return x.c;}) : [];
    cats.forEach(function(c){ if (q && norm(c).indexOf(q)<0 && hit.indexOf(c)<0) return; rest.push(c); });
    if (!q) st.cands.slice(0,5).forEach(function(x){ top.push(x.c); });
    else hit.forEach(function(c){ if(top.indexOf(c)<0) top.push(c); });
    rest = rest.filter(function(c){ return top.indexOf(c)<0; });
    function row(c){
      var on = sheetMode==='x' ? st.extras.indexOf(c)>=0 : c===p, dis = sheetMode==='x' && c===p;
      return '<button type="button" data-sc="'+esc(c)+'" '+(dis?'disabled ':'')+'style="display:flex;align-items:center;gap:10px;width:100%;text-align:right;background:none;border:0;border-bottom:1px solid #eef2f8;padding:13px 4px;font-family:inherit;font-size:14.5px;font-weight:700;color:'+(dis?'#94a3b8':'#14223d')+';cursor:'+(dis?'default':'pointer')+'"><span style="flex:1">'+esc(c)+(dis?' <small style="font-size:11px">(الرئيسي)</small>':'')+'</span>'+(on?'<span style="color:#1d4ed8;font-weight:900">✓</span>':'')+'</button>';
    }
    var h = '';
    if (top.length) h += '<div style="font-size:11.5px;font-weight:900;color:#5b6b85;margin:10px 0 2px">'+(q?'نتائج البحث':'الأقرب لطلبك')+'</div>' + top.map(row).join('');
    if (rest.length) h += '<div style="font-size:11.5px;font-weight:900;color:#5b6b85;margin:14px 0 2px">كل التخصصات</div>' + rest.map(row).join('');
    if (sheetMode==='p') h += '<button type="button" data-sc="أخرى" style="display:flex;width:100%;text-align:right;background:none;border:0;padding:14px 4px;font-family:inherit;font-size:14.5px;font-weight:800;color:#c2410c;cursor:pointer">＋ أخرى — اكتب الخدمة بنفسك</button>';
    if (sheetMode==='x') h += '<button type="button" onclick="document.getElementById(\'cp-sheet\').style.display=\'none\'" style="margin-top:12px;width:100%;border:0;background:#1d4ed8;color:#fff;border-radius:12px;padding:13px;font-family:inherit;font-size:14.5px;font-weight:800;cursor:pointer">تم</button>';
    $('cp-sh-l').innerHTML = h;
  }
  // ── ربط ──
  var tmr;
  function init(){
    var ti=$('n-title'), s=$('n-cat'), box=$('n-catbox'); if(!ti||!s||!box) return false;
    var wrap = $('n-cat-wrap'); if (wrap) wrap.style.display='none';
    ti.addEventListener('input', function(){ clearTimeout(tmr); tmr=setTimeout(onTitle, 350); });
    box.addEventListener('click', function(e){
      var b = e.target.closest('[data-cp]'); if(!b) return; var a=b.getAttribute('data-cp'), c=b.getAttribute('data-c');
      if (a==='sheet') openSheet('p'); else if (a==='sheetx') openSheet('x'); else if (a==='ex') toggleExtra(c); else if (a==='pk') pickToggle(c);
    });
    // أي تغيير على التصنيف من خارج هذا الملف (مسودة، قالب، إعادة تعيين) — نزامن الواجهة
    setInterval(function(){ var v=s.value; if (v!==st.lastSel){ if (!v){ st.extras=[]; st.manual=false; st.amb=false; st.ambList=null; st.pickSet=null; } else if (!st.amb) { st.manual = st.manual || !(st.cands.length && st.cands[0].c===v); } render(); } if (ti.value!==st.lastTitle && document.activeElement!==ti) onTitle(); }, 700);
    onTitle(); render();
    return true;
  }
  window._cpExtras = function(){ var p=($('n-cat')||{}).value||''; return p && p!=='أخرى' ? st.extras.filter(function(c){ return c!==p; }).slice(0,MAX_EXTRA) : []; };
  window._cpReset = function(){ st.extras=[]; st.manual=false; st.amb=false; st.ambList=null; st.pickSet=null; st.cands=[]; st.lastTitle=null; render(); };
  if (!init()) document.addEventListener('DOMContentLoaded', init);
})();
