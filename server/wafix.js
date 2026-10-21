// ═══ واتساب ويب (الكمبيوتر) يخرّب الإيموجي في الرسالة الجاهزة ويطلع بدالها «�» ═══
// على الكمبيوتر بس: نشيل الإيموجي من نص الرسالة قبل ما ينفتح واتساب (الجوال يعرضها صح فنخليها)
(function(){
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')) return;
  var RX; try { RX = new RegExp('[\\p{Extended_Pictographic}\\uFE0F\\u200D\\u20E3]', 'gu'); } catch(e) { return; }
  function fix(u){
    try {
      if (typeof u !== 'string' || !/(wa\.me|whatsapp\.com|whatsapp:)/i.test(u)) return u;
      var m = u.match(/([?&]text=)([^&#]*)/); if (!m) return u;
      var t = decodeURIComponent(m[2].replace(/\+/g, ' '));
      var c = t.replace(RX, '').replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/^[ \t]+/, '').replace(/[ \t]{2,}/g, ' ');
      return c === t ? u : u.replace(m[0], m[1] + encodeURIComponent(c));
    } catch(e) { return u; }
  }
  window._waFix = fix;
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest && e.target.closest('a[href]'); if (!a) return;
    var h = a.getAttribute('href'), n = fix(h); if (n !== h) a.setAttribute('href', n);
  }, true);
  var wo = window.open;
  window.open = function(u){ var a = [].slice.call(arguments); if (typeof u === 'string') a[0] = fix(u); return wo.apply(window, a); };
})();
