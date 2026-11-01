/* ═══ نافذة «اكتب كلمة المرور الحالية» — لتغيير البريد (حماية الحساب لو أحد مسك جلسة مفتوحة) ═══
   mnqAskPw(msg) → Promise<string|null> */
(function(){
  'use strict';
  var W = window, D = document;
  if (W.mnqAskPw) return;
  function css(){
    if (D.getElementById('apw-css')) return;
    var s = D.createElement('style'); s.id = 'apw-css';
    s.textContent = '.apw-ov{position:fixed;inset:0;z-index:9600;background:rgba(15,29,58,.5);display:flex;align-items:flex-end;justify-content:center;font-family:Tajawal,sans-serif;direction:rtl}'
      + '@media(min-width:700px){.apw-ov{align-items:center}.apw-sh{border-radius:22px!important}}'
      + '.apw-sh{background:#fff;color:#0f1d3a;width:100%;max-width:420px;border-radius:24px 24px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:11px;box-sizing:border-box}'
      + '.apw-t{font-size:17px;font-weight:900}.apw-s{font-size:13px;color:#5b6b82;font-weight:700;line-height:1.7}'
      + '.apw-in{border:1.5px solid #dbe3ef;border-radius:13px;padding:13px;font-family:inherit;font-size:16px;width:100%;box-sizing:border-box;background:#fff;color:#0f1d3a}'
      + '.apw-in.bad{border-color:#dc2626}.apw-e{display:none;color:#b91c1c;font-size:12.5px;font-weight:800}'
      + '.apw-row{display:flex;gap:8px}.apw-b{flex:1;border:0;border-radius:13px;padding:13px;font-family:inherit;font-weight:900;font-size:15px;cursor:pointer}'
      + '.apw-ok{background:#2563eb;color:#fff}.apw-no{background:#fff;color:#1e3a8a;border:1.5px solid #dbe5f5}.apw-f{font-size:12.5px;color:#1d4ed8;font-weight:800;text-decoration:underline;background:none;border:0;cursor:pointer;font-family:inherit;padding:0;align-self:flex-start}'
      + '[data-theme="dark"] .apw-sh{background:#16233f;color:#e6edf8}[data-theme="dark"] .apw-in{background:#0b1529;border-color:#24365e;color:#e6edf8}[data-theme="dark"] .apw-s{color:#a9b6d3}[data-theme="dark"] .apw-no{background:transparent;color:#c7d2fe;border-color:#2b4377}';
    D.head.appendChild(s);
  }
  W.mnqAskPw = function(msg){
    css();
    return new Promise(function(res){
      var ov = D.createElement('div'); ov.className = 'apw-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
      ov.innerHTML = '<div class="apw-sh"><div class="apw-t">🔒 أكّد إنه أنت</div><div class="apw-s">' + (msg || 'عشان نغيّر بريدك، اكتب كلمة المرور الحالية') + '</div>'
        + '<input class="apw-in" type="password" autocomplete="current-password" placeholder="كلمة المرور الحالية" aria-label="كلمة المرور الحالية"><div class="apw-e" role="alert"></div>'
        + '<button type="button" class="apw-f" data-a="forgot">نسيت كلمة المرور؟</button>'
        + '<div class="apw-row"><button type="button" class="apw-b apw-ok" data-a="ok">تأكيد</button><button type="button" class="apw-b apw-no" data-a="no" aria-label="إلغاء">إلغاء</button></div></div>';
      D.body.appendChild(ov);
      var inp = ov.querySelector('.apw-in'), er = ov.querySelector('.apw-e');
      setTimeout(function(){ try { inp.focus(); } catch(e){} }, 60);
      var done = function(v){ if (ov.parentNode) ov.remove(); res(v); };
      var ok = function(){ var v = inp.value; if (!v) { inp.classList.add('bad'); er.textContent = 'اكتب كلمة المرور'; er.style.display = 'block'; return; } done(v); };
      inp.addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); ok(); } });
      ov.addEventListener('click', function(e){
        if (e.target === ov) return done(null);
        var b = e.target.closest('[data-a]'); if (!b) return;
        var a = b.getAttribute('data-a');
        if (a === 'ok') ok(); else if (a === 'no') done(null);
        else if (a === 'forgot') {
          var em = ''; try { em = (JSON.parse(localStorage.getItem('user') || '{}').email) || ''; } catch(_){}
          b.disabled = true;
          fetch(((typeof W.API === 'string' && W.API) || '') + '/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: em }) })
            .then(function(){ er.style.color = '#15803d'; er.textContent = 'أرسلنا رابط تعيين كلمة مرور جديدة لبريدك الحالي' + (em ? ' (' + em + ')' : ''); er.style.display = 'block'; })
            .catch(function(){ er.textContent = 'تعذّر الإرسال — حاول بعد شوي'; er.style.display = 'block'; b.disabled = false; });
        }
      });
    });
  };
})();
