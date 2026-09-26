/* مناقصة — اختيار المدينة بالبحث (يكتب أول حروفها) أو بالتصفّح حسب المنطقة.
   يشتغل تلقائياً على أي قائمة مدن في أي صفحة، والقائمة الأصلية <select> تبقى هي المصدر
   (نغيّر قيمتها ونطلق change) — فما يتغيّر شي في الحفظ أو باقي الكود. */
(function(){
  if (window.__mqCityPick) return; window.__mqCityPick = true;
  var REG = {"الرياض":["الرياض","الخرج","الدوادمي","المجمعة","الزلفي","شقراء","القويعية","وادي الدواسر","الأفلاج","حوطة بني تميم","عفيف","الغاط","ثادق","حريملاء","ضرماء","المزاحمية","رماح","الدرعية","الدلم","الحريق","السليل","مرات","ضرما"],"القصيم":["بريدة","عنيزة","الرس","المذنب","البكيرية","البدائع","رياض الخبراء","عيون الجواء","الأسياح","النبهانية","الشماسية","ضرية","عقلة الصقور","الخبراء"],"مكة المكرمة":["مكة المكرمة","جدة","الطائف","رابغ","القنفذة","الليث","خليص","الجموم","الكامل","تربة","رنية","أضم","بحرة","المويه","الخرمة"],"المدينة المنورة":["المدينة المنورة","ينبع","العلا","بدر","مهد الذهب","خيبر","الحناكية","العيص","المهد"],"الشرقية":["الدمام","الخبر","الظهران","الأحساء","الجبيل","القطيف","حفر الباطن","الخفجي","رأس تنورة","بقيق","النعيرية","قرية العليا","صفوى","سيهات","العوامية"],"عسير":["أبها","خميس مشيط","بيشة","محايل عسير","النماص","تثليث","سراة عبيدة","رجال ألمع","ظهران الجنوب","تنومة","بلقرن","أحد رفيدة","المجاردة","الحرجة","قيال"],"تبوك":["تبوك","ضباء","الوجه","تيماء","حقل","أملج","البدع"],"حائل":["حائل","بقعاء","الغزالة","الشنان","السليمي","موقق","الشملي"],"الحدود الشمالية":["عرعر","رفحاء","طريف","العويقيلة"],"جازان":["جازان","صبيا","أبو عريش","صامطة","أحد المسارحة","بيش","فيفاء","ضمد","الدرب","العارضة","الريث","الحرث"],"نجران":["نجران","شرورة","حبونا","بدر الجنوب","يدمة","ثار"],"الباحة":["الباحة","بلجرشي","المندق","المخواة","قلوة","العقيق","القرى","غامد الزناد"],"الجوف":["سكاكا","دومة الجندل","القريات","طبرجل","صوير"]};
  var TOP = ['الرياض','جدة','الدمام','مكة المكرمة','المدينة المنورة','الخبر','الطائف','بريدة'];
  var C2R = {}; Object.keys(REG).forEach(function(r){ REG[r].forEach(function(c){ C2R[c]=r; }); });
  function norm(t){ return String(t||'').replace(/[ً-ْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\s+/g,' ').trim().toLowerCase(); }
  function bare(t){ return norm(t).replace(/^ال/,''); }
  function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function isCitySelect(s){
    if (!s || s.multiple || s.dataset.cpNo) return false;
    // قوائم المدن بالاسم (فلاتر فيها مدن قليلة، أو تنعبّى لاحقاً) — لازم فيها مدينة وحدة على الأقل
    if (/(^|[-_])city$|city[-_]|Cit$/i.test(s.id||'') && s.options.length >= 2) return true;
    if (s.options.length < 20) return false;
    var t = {}; for (var i=0;i<s.options.length;i++) t[s.options[i].text.trim()] = 1;
    return !!(t['الرياض'] && t['جدة'] && (t['الدمام'] || t['الخبر']));
  }
  // ── الواجهة ──
  var cur = null, st;
  function css(){
    if (st) return; st = document.createElement('style');
    st.textContent = '#cyp-ov{position:fixed;inset:0;z-index:100001;display:none;direction:rtl;font-family:Tajawal,system-ui,sans-serif}'
      + '#cyp-ov.m{background:rgba(15,23,42,.45);align-items:flex-end;justify-content:center}'
      + '#cyp-bx{background:#fff;color:#14223d;display:flex;flex-direction:column;box-shadow:0 18px 50px rgba(15,23,42,.28);overflow:hidden}'
      + '#cyp-ov.m #cyp-bx{width:100%;max-width:560px;max-height:84vh;border-radius:22px 22px 0 0}'
      + '#cyp-ov.d #cyp-bx{position:fixed;border-radius:14px;border:1px solid #dbe5f5;max-height:420px}'
      + '#cyp-q{width:100%;box-sizing:border-box;border:1.5px solid #dbe5f5;border-radius:12px;padding:11px 13px;font-family:inherit;font-size:15px;outline:none;background:#fff;color:#14223d}'
      + '#cyp-q:focus{border-color:#1d4ed8;box-shadow:0 0 0 3px rgba(29,78,216,.12)}'
      + '#cyp-l{overflow:auto;padding:0 14px 16px;-webkit-overflow-scrolling:touch}'
      + '.cyp-h{font-size:11.5px;font-weight:900;color:#5b6b85;margin:12px 2px 4px}'
      + '.cyp-i{display:flex;align-items:center;width:100%;text-align:right;background:none;border:0;border-bottom:1px solid #eef2f8;padding:12px 6px;font-family:inherit;font-size:14.5px;font-weight:700;color:#14223d;cursor:pointer;min-height:44px}'
      + '.cyp-i:hover,.cyp-i.k{background:#f1f5fd}.cyp-i.on{color:#1d4ed8;font-weight:900}.cyp-i small{margin-right:auto;font-size:11.5px;color:#94a3b8;font-weight:700}'
      + '.cyp-c{border:1.5px solid #dbe5f5;background:#fff;color:#1e3a8a;border-radius:999px;padding:8px 13px;font-family:inherit;font-size:13.5px;font-weight:800;cursor:pointer;min-height:38px}.cyp-c.on{border-color:#1d4ed8;background:#eef3ff}'
      + '.cyp-e{padding:22px 6px;text-align:center;color:#5b6b85;font-size:13.5px;font-weight:700}';
    document.head.appendChild(st);
  }
  var ov;
  function build(){
    css(); if (ov) return;
    ov = document.createElement('div'); ov.id = 'cyp-ov';
    ov.innerHTML = '<div id="cyp-bx" role="dialog" aria-label="اختر المدينة"><div style="padding:10px 14px 8px"><div id="cyp-grab" style="width:44px;height:5px;border-radius:5px;background:#dbe5f5;margin:0 auto 10px"></div>'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:9px"><b style="font-size:15.5px;flex:1">اختر المدينة</b><button type="button" id="cyp-x" aria-label="إغلاق" style="border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;font-size:15px;cursor:pointer">✕</button></div>'
      + '<input id="cyp-q" type="search" autocomplete="off" placeholder="اكتب أول حروف المدينة… مثل: خف، الاحسا، الشرقية"></div><div id="cyp-l"></div></div>';
    document.body.appendChild(ov);
    ov.addEventListener('mousedown', function(e){ if (e.target === ov) close(); });
    ov.querySelector('#cyp-x').addEventListener('click', close);
    var q = ov.querySelector('#cyp-q');
    q.addEventListener('input', function(){ kIdx = -1; fill(); });
    q.addEventListener('keydown', function(e){
      var items = ov.querySelectorAll('.cyp-i');
      if (e.key === 'Escape'){ close(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); if(!items.length) return; kIdx = Math.max(0, Math.min(items.length-1, kIdx + (e.key==='ArrowDown'?1:-1))); items.forEach(function(x,i){ x.classList.toggle('k', i===kIdx); }); items[kIdx].scrollIntoView({block:'nearest'}); }
      else if (e.key === 'Enter'){ e.preventDefault(); var t = items[kIdx>=0?kIdx:0]; if (t) pick(t.getAttribute('data-v')); }
    });
    ov.querySelector('#cyp-l').addEventListener('click', function(e){ var b = e.target.closest('[data-v]'); if (b) pick(b.getAttribute('data-v')); });
    window.addEventListener('resize', function(){ if (ov.style.display !== 'none' && cur) place(); });
  }
  var kIdx = -1;
  function opts(s){ var out = []; for (var i=0;i<s.options.length;i++){ var o = s.options[i]; out.push({ v:o.value, t:o.text.trim(), g:(o.parentNode && o.parentNode.tagName==='OPTGROUP') ? o.parentNode.label : '' }); } return out; }
  function fill(){
    if (!cur) return;
    var list = opts(cur), q = norm(ov.querySelector('#cyp-q').value), qb = q.replace(/^ال/,''), v = cur.value, h = '';
    var blank = list.filter(function(o){ return o.v === ''; })[0];
    var items = list.filter(function(o){ return o.v !== '' && o.t; });
    function row(o, sub){ return '<button type="button" class="cyp-i'+(o.v===v?' on':'')+'" data-v="'+esc(o.v)+'"><span>'+esc(o.t)+'</span>'+(sub?'<small>'+esc(sub)+'</small>':'')+(o.v===v?'<span style="margin-right:'+(sub?'10px':'auto')+'">✓</span>':'')+'</button>'; }
    if (q){
      var starts = [], has = [], regHit = [];
      items.forEach(function(o){
        var n = norm(o.t), b = n.replace(/^ال/,''), r = C2R[o.t] || o.g || '';
        if (n.indexOf(q)===0 || b.indexOf(qb)===0) starts.push(o);
        else if (n.indexOf(q)>=0 || (qb.length>=2 && b.indexOf(qb)>=0)) has.push(o);
        else if (r && qb.length>=2 && bare(r).indexOf(qb)>=0) regHit.push(o);
      });
      var res = starts.concat(has);
      if (res.length) h += res.map(function(o){ return row(o, C2R[o.t] || o.g); }).join('');
      if (regHit.length) h += '<div class="cyp-h">مدن المنطقة</div>' + regHit.map(function(o){ return row(o, C2R[o.t] || o.g); }).join('');
      if (!res.length && !regHit.length) h += '<div class="cyp-e">ما لقينا «'+esc(ov.querySelector('#cyp-q').value)+'» — جرّب اسم ثاني أو تصفّح القائمة</div>';
    } else {
      if (blank && !/اختر|—\s*$/.test(blank.t)) h += row(blank);
      var have = {}; items.forEach(function(o){ have[o.t] = o; });
      var top = TOP.filter(function(c){ return have[c]; });
      if (top.length) h += '<div class="cyp-h">الأكثر اختياراً</div><div style="display:flex;flex-wrap:wrap;gap:7px;padding:2px 0 6px">' + top.map(function(c){ var o=have[c]; return '<button type="button" class="cyp-c'+(o.v===v?' on':'')+'" data-v="'+esc(o.v)+'">'+esc(c)+'</button>'; }).join('') + '</div>';
      // حسب المنطقة: من optgroup إن وُجد، وإلا من خريطتنا
      var groups = {}, order = [];
      items.forEach(function(o){ var g = o.g || C2R[o.t] || 'مدن أخرى'; if (!groups[g]){ groups[g]=[]; order.push(g); } groups[g].push(o); });
      if (order.length === 1 && order[0] === 'مدن أخرى') h += '<div class="cyp-h">كل المدن</div>' + groups[order[0]].map(function(o){ return row(o); }).join('');
      else order.forEach(function(g){ h += '<div class="cyp-h">'+esc(/^(منطقة|المنطقة)/.test(g)||g==='مدن أخرى'?g:'منطقة '+g)+'</div>' + groups[g].map(function(o){ return row(o); }).join(''); });
    }
    ov.querySelector('#cyp-l').innerHTML = h;
  }
  function mobile(){ return window.innerWidth < 700; }
  function place(){
    var bx = ov.querySelector('#cyp-bx'), g = ov.querySelector('#cyp-grab');
    if (mobile()){ ov.className = 'm'; ov.style.display = 'flex'; bx.style.cssText = ''; g.style.display = ''; return; }
    ov.className = 'd'; ov.style.display = 'block'; g.style.display = 'none';
    var r = cur.getBoundingClientRect(), w = Math.max(r.width, 320), H = 420;
    var left = Math.min(Math.max(8, r.right - w), window.innerWidth - w - 8);
    var below = window.innerHeight - r.bottom - 12, top = below >= Math.min(H, 300) ? r.bottom + 6 : Math.max(8, r.top - Math.min(H, r.top - 14) - 6);
    bx.style.cssText = 'left:'+left+'px;top:'+top+'px;width:'+w+'px;max-height:'+Math.min(H, below >= 300 ? below : r.top - 14)+'px';
  }
  function open(s){
    if (s.disabled) return;
    build(); cur = s; kIdx = -1;
    ov.querySelector('#cyp-q').value = ''; fill(); place();
    var cb = ov.querySelector('.cyp-i.on'); if (cb) try{ cb.scrollIntoView({block:'center'}); }catch(e){}
    if (!mobile()) setTimeout(function(){ try{ ov.querySelector('#cyp-q').focus(); }catch(e){} }, 30);
  }
  function close(){ if (ov) ov.style.display = 'none'; var s = cur; cur = null; if (s && !mobile()) try{ s.focus({preventScroll:true}); }catch(e){} }
  function pick(val){
    var s = cur; if (!s) return;
    if (s.value !== val){ s.value = val; s.dispatchEvent(new Event('input', {bubbles:true})); s.dispatchEvent(new Event('change', {bubbles:true})); }
    close();
  }
  // ── ربط القوائم: زر شفاف فوق القائمة (نفس مكانها ومقاسها) ──
  function enhance(s){
    s.dataset.cpOn = '1';
    s.addEventListener('keydown', function(e){ if (e.key==='Enter' || e.key===' ' || e.key==='ArrowDown' || (e.altKey && e.key==='ArrowDown')){ e.preventDefault(); open(s); } });
    s.addEventListener('mousedown', function(e){ e.preventDefault(); open(s); });
    // لمس بدون زر شفاف (احتياط): نفتح لما يرفع إصبعه بدون سحب
    var ty = null;
    s.addEventListener('touchstart', function(e){ ty = e.touches && e.touches[0] ? e.touches[0].clientY : null; }, {passive:true});
    s.addEventListener('touchend', function(e){ if (s._cpBtn) return; var y = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : null; if (ty != null && y != null && Math.abs(y - ty) > 10) return; e.preventDefault(); open(s); });
    // الزر الشفاف لازم يكون داخل نفس حاوية القائمة (يتحرك ويتقصّ معها لو الصفحة/النافذة تمررت)
    var par = s.parentNode, cs = getComputedStyle(par);
    if (cs.position === 'static'){
      var clash = [].some.call(par.children, function(c){ return c !== s && getComputedStyle(c).position === 'absolute'; });
      if (clash) { sync(s); return; }
      par.style.position = 'relative';
    }
    var b = document.createElement('button'); b.type = 'button'; b.tabIndex = -1; b.setAttribute('aria-hidden','true');
    b.style.cssText = 'position:absolute;margin:0;padding:0;border:0;background:transparent;cursor:pointer;z-index:1;opacity:0';
    par.insertBefore(b, s.nextSibling); s._cpBtn = b;
    b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation(); open(s); });
    sync(s);
  }
  function sync(s){
    var b = s._cpBtn; if (!b) return;
    if (!b.isConnected || b.parentNode !== s.parentNode){ try{ s.parentNode.insertBefore(b, s.nextSibling); }catch(e){ return; } }
    var vis = s.offsetParent !== null && s.offsetWidth > 0 && s.style.display !== 'none';
    if (!vis || s.disabled){ b.style.display = 'none'; return; }
    b.style.display = 'block';
    if (s.offsetParent !== b.offsetParent || b.offsetParent !== s.parentNode){ b.style.display = 'none'; return; }
    b.style.left = s.offsetLeft + 'px'; b.style.top = s.offsetTop + 'px'; b.style.width = s.offsetWidth + 'px'; b.style.height = s.offsetHeight + 'px';
  }
  function scan(){
    var all = document.getElementsByTagName('select');
    for (var i=0;i<all.length;i++){ var s = all[i]; if (s.dataset.cpOn) sync(s); else if (isCitySelect(s)) enhance(s); }
  }
  function start(){ scan(); setInterval(scan, 800); window.addEventListener('resize', scan); document.addEventListener('click', function(){ setTimeout(scan, 60); }, true); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
