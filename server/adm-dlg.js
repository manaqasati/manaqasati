// الإدارة: «المفوّضين» — قائمة كل المفوّضين + بطاقة المفوّض في ملف المزوّد مع السجل
(function(){
  var W = window, D = document;
  function e(s){ return W.esc ? W.esc(s) : String(s == null ? '' : s); }
  function req(p, o){ return fetch(W.API + p, Object.assign({}, W.hdr(), o || {})).then(function(r){ return r.json().catch(function(){ return {}; }); }); }
  function css(){
    if (D.getElementById('adlg-css')) return; var st = D.createElement('style'); st.id = 'adlg-css';
    st.textContent = '.adl-k{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}@media(max-width:700px){.adl-k{grid-template-columns:repeat(2,1fr)}}.adl-k div{background:var(--card,#fff);border:1px solid var(--border);border-radius:12px;padding:12px}.adl-k span{font-size:12px;color:var(--muted);font-weight:700}.adl-k b{display:block;font-size:22px;font-weight:900}'
      + '.adl-t{width:100%;border-collapse:collapse;font-size:13px}.adl-t th{text-align:right;padding:10px;background:var(--bg);color:var(--muted);font-weight:800;border-bottom:1px solid var(--border)}.adl-t td{padding:10px;border-bottom:1px solid var(--border);vertical-align:middle}'
      + '.adl-tg{display:inline-block;font-size:11px;font-weight:800;border-radius:99px;padding:3px 9px;white-space:nowrap}.adl-ok{background:#dcfce7;color:#15803d}.adl-wt{background:#fef3c7;color:#92400e}.adl-ps{background:#fee2e2;color:#b91c1c}'
      + '.adl-b{border:1px solid var(--border);background:var(--card,#fff);color:var(--text);border-radius:9px;padding:6px 11px;font:inherit;font-size:12px;font-weight:800;cursor:pointer;margin-inline-start:4px}.adl-d{color:#dc2626;border-color:#fecaca}'
      + '.adl-c{border:1px solid var(--border);border-radius:12px;padding:12px;margin-top:12px}.adl-lg{font-size:12.5px;padding:7px 0;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:space-between}.adl-lg small{color:var(--muted);white-space:nowrap}'
      + '.adl-wrap{overflow-x:auto;background:var(--card,#fff);border:1px solid var(--border);border-radius:12px}';
    D.head.appendChild(st);
  }
  function st(d){ return d.paused ? '<span class="adl-tg adl-ps">موقوف' + (d.paused_by === 'admin' ? ' (الإدارة)' : '') + '</span>' : d.status === 'active' ? '<span class="adl-tg adl-ok">فعّال</span>' : '<span class="adl-tg adl-wt">بانتظار التفعيل</span>'; }
  function dt(s){ if (!s) return '—'; try { var d = new Date(s); return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear(); } catch(x) { return '—'; } }
  var L = {};
  function load(){
    var b = D.getElementById('dash-dlgs'); if (!b) return; css();
    if (!b.innerHTML) b.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    req('/api/admin/delegates').then(function(d){
      if (!d || !d.items) { b.innerHTML = '<div class="ad-card">تعذّر التحميل</div>'; return; }
      L = d.labels || {}; var k = d.kpi || {};
      var h = '<div class="adl-k"><div><span>الكل</span><b>' + (k.all || 0) + '</b></div><div><span>فعّال</span><b>' + (k.active || 0) + '</b></div><div><span>بانتظار التفعيل</span><b>' + (k.invited || 0) + '</b></div><div><span>موقوف</span><b>' + (k.paused || 0) + '</b></div></div>';
      if (!d.items.length) h += '<div class="ad-card" style="text-align:center;color:var(--muted)">ما فيه مفوّضين للحين</div>';
      else h += '<div class="adl-wrap"><table class="adl-t"><tr><th>المؤسسة</th><th>المفوّض</th><th>الإيميل</th><th>الصلاحيات</th><th>الحالة</th><th>آخر دخول</th><th>عروض الشهر</th><th></th></tr>'
        + d.items.map(function(x){ var oid = parseInt(x.owner_id) || 0; return '<tr><td><a href="#" onclick="ADLG.more(' + oid + ');return false" style="font-weight:800;color:inherit">' + e(x.owner_name) + '</a></td><td>' + e(x.name) + '</td><td dir="ltr" style="text-align:right">' + e(x.email) + '</td><td style="font-size:12px">' + (x.perms || []).map(function(p){ return e(L[p] || p); }).join('، ') + '</td><td>' + st(x) + '</td><td>' + dt(x.last_login) + '</td><td>' + (x.bids_month || 0) + '</td>'
          + '<td style="white-space:nowrap"><button class="adl-b" onclick="ADLG.more(' + oid + ')">السجل</button><button class="adl-b" onclick="ADLG.pause(' + x.id + ',' + (!x.paused) + ')">' + (x.paused ? 'تشغيل' : 'إيقاف') + '</button><button class="adl-b adl-d" onclick="ADLG.del(' + x.id + ')">إزالة</button></td></tr>'
            + '<tr id="adl-r' + oid + '" style="display:none"><td colspan="8" style="background:var(--bg)"><div id="adl-x' + oid + '"></div></td></tr>'; }).join('') + '</table></div>';
      h += '<div class="ad-card" style="margin-top:14px;font-size:13px"><b>⚙️ الإعدادات</b><div style="display:flex;justify-content:space-between;margin-top:8px"><span>عدد المفوّضين لكل مزوّد</span><b>' + (d.max || 1) + '</b></div><div style="display:flex;justify-content:space-between;margin-top:4px;color:var(--muted)"><span>أكثر من مفوّض بالاشتراك</span><span>لاحقاً</span></div></div>';
      b.innerHTML = h;
    }).catch(function(){ b.innerHTML = '<div class="ad-card">تعذّر التحميل</div>'; });
  }
  function after(uid){ load(); if (uid) userCard(uid); }
  function pause(id, p, uid){
    if (p && !confirm('توقف هالمفوّض؟ يطلع من الحساب على طول ويوصل صاحب الحساب إشعار.')) return;
    req('/api/admin/delegates/' + id + '/pause', { method: 'POST', body: JSON.stringify({ paused: !!p }) }).then(function(r){ if (!r || !r.ok) return W.toast((r && r.message) || 'تعذّر', 'error'); W.toast(p ? 'تم الإيقاف' : 'تم التشغيل', 'success'); after(uid); });
  }
  function del(id, uid){
    if (!confirm('تشيل هالمفوّض نهائياً؟')) return;
    req('/api/admin/delegates/' + id, { method: 'DELETE' }).then(function(r){ if (!r || !r.ok) return W.toast((r && r.message) || 'تعذّر', 'error'); W.toast('تمت الإزالة', 'success'); after(uid); });
  }
  // بطاقة المفوّض داخل «عرض بيانات المستخدم»
  function more(uid){ var r = D.getElementById('adl-r' + uid); if (!r) return; var on = r.style.display === 'none'; r.style.display = on ? '' : 'none'; if (on) userCard(uid, 'adl-x' + uid); }
  function userCard(uid, elId){
    var b = D.getElementById(elId || 'um-dlg'); if (!b) return; css();
    req('/api/admin/delegates/by-owner/' + (parseInt(uid) || 0)).then(function(r){
      if (!r || (!r.delegate && !(r.log || []).length)) { b.innerHTML = ''; return; }
      var d = r.delegate, Lb = r.labels || {}, h = '<div class="adl-c"><div style="display:flex;justify-content:space-between;align-items:center"><b>👥 المفوّض</b>' + (d ? st(d) : '<span class="adl-tg" style="background:var(--bg)">ما عنده الحين</span>') + '</div>';
      if (d) h += '<div style="font-size:13px;margin-top:8px;line-height:1.9"><b>' + e(d.name) + '</b> · <span dir="ltr">' + e(d.email) + '</span><br>آخر دخول: ' + dt(d.last_login) + ' · أُضيف: ' + dt(d.created_at) + '<br>الصلاحيات: ' + (d.perms || []).map(function(p){ return e(Lb[p] || p); }).join('، ') + '</div>'
        + '<div style="margin-top:8px"><button class="adl-b" style="margin:0" onclick="ADLG.pause(' + d.id + ',' + (!d.paused) + ',' + uid + ')">' + (d.paused ? '▶ تشغيل' : '⏸ إيقاف') + '</button><button class="adl-b adl-d" onclick="ADLG.del(' + d.id + ',' + uid + ')">إزالة المفوّض</button></div>';
      if ((r.log || []).length) h += '<div style="margin-top:10px;font-weight:800;font-size:13px">سجل النشاط</div>' + r.log.slice(0, 15).map(function(x){ var who = x.actor === 'owner' ? 'صاحب الحساب' : x.actor === 'admin' ? 'الإدارة' : (x.name || 'المفوّض') + ' (مفوّض)'; return '<div class="adl-lg"><span><b>' + e(who) + ':</b> ' + e(x.action) + (x.detail ? ' — ' + e(x.detail) : '') + '</span><small>' + dt(x.created_at) + '</small></div>'; }).join('');
      b.innerHTML = h + '</div>';
    }).catch(function(){ b.innerHTML = ''; });
  }
  W.ADLG = { load: load, pause: pause, del: del, userCard: userCard, more: more };
})();
