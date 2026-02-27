<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>مناقصة – منصة خدمات المنازل</title>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<style>
:root{--p:#7c3aed;--p2:#6d28d9;--p3:#5b21b6;--p-light:#ede9fe;--p-mid:#ddd6fe;--gold:#f59e0b;--gold2:#d97706;--text:#0f0a1e;--muted:#64748b;--border:#e2e8f0;--bg:#faf9ff;--white:#fff;--red:#ef4444;--green:#16a34a;--green-l:#dcfce7}
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html{scroll-behavior:smooth}
body{font-family:'Tajawal',sans-serif;background:var(--bg);color:var(--text);overflow-x:hidden}
.nav{position:fixed;top:0;left:0;right:0;z-index:200;padding:0 20px;height:60px;display:flex;align-items:center;justify-content:space-between;transition:.3s}
.nav.scrolled{background:rgba(255,255,255,0.95);backdrop-filter:blur(20px);box-shadow:0 1px 20px rgba(124,58,237,0.1)}
.nav-logo{font-size:22px;font-weight:900;color:#fff;text-decoration:none;transition:.3s}
.nav.scrolled .nav-logo{color:var(--p)}
.nav-logo span{color:var(--gold)}
.nav-btns{display:flex;gap:8px;align-items:center}
.nav-login{padding:7px 16px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;border:1.5px solid rgba(255,255,255,0.5);background:transparent;color:#fff;font-family:'Tajawal',sans-serif;transition:.2s;text-decoration:none}
.nav.scrolled .nav-login{border-color:var(--p);color:var(--p)}
.nav-reg{padding:7px 16px;border-radius:8px;font-size:13px;font-weight:800;cursor:pointer;border:none;background:var(--gold);color:#fff;font-family:'Tajawal',sans-serif;transition:.2s;text-decoration:none}
.nav-reg:hover{background:var(--gold2)}
.hero{min-height:100vh;background:linear-gradient(160deg,#1e0545 0%,#4c1d95 40%,#7c3aed 70%,#a855f7 100%);position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 20px 60px;overflow:hidden;text-align:center}
.hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
.hero-orb{position:absolute;border-radius:50%;filter:blur(80px);pointer-events:none}
.hero-orb-1{width:400px;height:400px;background:rgba(168,85,247,0.3);top:-100px;right:-100px}
.hero-orb-2{width:300px;height:300px;background:rgba(245,158,11,0.15);bottom:-50px;left:-50px}
.hero-badge{background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:50px;padding:6px 16px;font-size:12px;font-weight:700;color:rgba(255,255,255,0.9);margin-bottom:20px;display:inline-flex;align-items:center;gap:6px;backdrop-filter:blur(10px)}
.hero h1{font-size:clamp(26px,6vw,50px);font-weight:900;color:#fff;line-height:1.2;margin-bottom:16px}
.hero h1 span{color:var(--gold)}
.hero p{font-size:clamp(13px,2.5vw,17px);color:rgba(255,255,255,0.75);max-width:480px;line-height:1.7;margin-bottom:32px}
.hero-actions{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:48px}
.btn-hero-p{padding:13px 28px;background:var(--gold);color:#fff;border:none;border-radius:12px;font-family:'Tajawal',sans-serif;font-size:15px;font-weight:800;cursor:pointer;transition:.2s;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
.btn-hero-p:hover{background:var(--gold2);transform:translateY(-2px);box-shadow:0 8px 25px rgba(245,158,11,0.4)}
.btn-hero-s{padding:13px 28px;background:rgba(255,255,255,0.12);color:#fff;border:1.5px solid rgba(255,255,255,0.3);border-radius:12px;font-family:'Tajawal',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:.2s;text-decoration:none;backdrop-filter:blur(10px)}
.btn-hero-s:hover{background:rgba(255,255,255,0.2)}
.hero-stats{display:flex;gap:40px;justify-content:center;flex-wrap:wrap}
.hs{text-align:center}
.hs-n{font-size:30px;font-weight:900;color:#fff}
.hs-t{font-size:11px;color:rgba(255,255,255,0.55);font-weight:600;margin-top:2px}
.hero-scroll{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.3);font-size:20px;animation:bounce 2s infinite}
@keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(7px)}}
.cats-section{padding:28px 20px;background:var(--white);border-bottom:1px solid var(--border)}
.cats-title{font-size:12px;font-weight:800;color:var(--muted);margin-bottom:12px;text-align:center;letter-spacing:.5px;text-transform:uppercase}
.cats-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;justify-content:center;flex-wrap:wrap}
.cats-scroll::-webkit-scrollbar{display:none}
.cat-chip{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 12px;border-radius:13px;border:1.5px solid var(--border);background:var(--white);cursor:pointer;transition:.2s;min-width:68px;font-family:'Tajawal',sans-serif;flex-shrink:0}
.cat-chip:hover{border-color:var(--p);background:var(--p-light);transform:translateY(-2px)}
.cat-chip:hover .cat-ic-wrap{background:var(--p-mid)}
.cat-chip:hover .cat-ic-wrap svg{stroke:var(--p)}
.cat-chip.on{border-color:var(--p);background:var(--p-light)}
.cat-chip.on .cat-ic-wrap{background:var(--p)}
.cat-chip.on .cat-ic-wrap svg{stroke:#fff}
.cat-chip.on .cat-name{color:var(--p)}
.cat-ic-wrap{width:46px;height:46px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;transition:.2s}
.cat-ic-wrap svg{width:22px;height:22px;stroke:#64748b;transition:.2s}
.cat-name{font-size:10px;font-weight:700;color:var(--text);white-space:nowrap}
.main-section{padding:28px 20px 80px;max-width:900px;margin:0 auto}
.section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px}
.section-head h2{font-size:18px;font-weight:900}
.section-head h2 span{color:var(--p)}
.live-dot{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:var(--green);background:var(--green-l);padding:4px 10px;border-radius:20px}
.live-dot::before{content:'';width:6px;height:6px;background:var(--green);border-radius:50%;animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
.search-bar{background:var(--white);border:1.5px solid var(--border);border-radius:13px;padding:4px 4px 4px 14px;display:flex;align-items:center;gap:8px;margin-bottom:12px;box-shadow:0 2px 10px rgba(0,0,0,0.04)}
.search-bar input{flex:1;border:none;outline:none;font-family:'Tajawal',sans-serif;font-size:14px;background:transparent;color:var(--text)}
.search-bar input::placeholder{color:var(--muted)}
.search-btn{background:var(--p);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-family:'Tajawal',sans-serif;font-size:13px;font-weight:700;cursor:pointer}
.filter-row{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap}
.f-sel{padding:7px 12px;border:1.5px solid var(--border);border-radius:9px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:700;background:var(--white);color:var(--text);outline:none;cursor:pointer}
.f-sel:focus{border-color:var(--p)}
.reqs-grid{display:flex;flex-direction:column;gap:12px}
.rcard{background:var(--white);border:1.5px solid var(--border);border-radius:16px;overflow:hidden;transition:.2s;cursor:pointer;position:relative;display:flex;flex-direction:column}
.rcard:hover{border-color:var(--p-mid);box-shadow:0 4px 20px rgba(124,58,237,0.08);transform:translateY(-2px)}
.rcard-emoji{width:100%;height:140px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--p-light),var(--p-mid));flex-shrink:0}
.rcard-emoji svg{width:56px;height:56px;stroke:var(--p)}
.rcard-body{padding:14px}
.rcard-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:7px;gap:8px}
.rcard-title{font-size:15px;font-weight:800;flex:1;line-height:1.3}
.rcard-meta{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px}
.rm{font-size:11px;color:var(--muted);display:flex;align-items:center;gap:3px;background:var(--bg);padding:3px 8px;border-radius:20px}
.rcard-desc{font-size:12px;color:#64748b;line-height:1.6;margin-bottom:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rcard-foot{display:flex;align-items:center;justify-content:space-between;gap:8px}
.rcard-budget{font-size:17px;font-weight:900;color:var(--p)}
.rcard-budget span{font-size:11px;font-weight:600;color:var(--muted)}
.bid-cta{padding:8px 16px;background:var(--p);color:#fff;border:none;border-radius:9px;font-family:'Tajawal',sans-serif;font-size:12px;font-weight:800;cursor:pointer;transition:.15s;text-decoration:none;display:inline-block}
.bid-cta:hover{background:var(--p2)}
.tag{padding:3px 9px;border-radius:20px;font-size:10px;font-weight:700;display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
.t-open{background:var(--green-l);color:var(--green)}
.new-badge{position:absolute;top:10px;right:10px;background:var(--gold);color:#fff;font-size:10px;font-weight:800;padding:3px 9px;border-radius:20px;z-index:2}
.providers-section{background:linear-gradient(160deg,#1e0545,#4c1d95);padding:40px 20px}
.prov-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;max-width:900px;margin:20px auto 0}
.prov-card{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:16px;text-align:center;transition:.2s;cursor:pointer}
.prov-card:hover{background:rgba(255,255,255,0.15);transform:translateY(-3px)}
.prov-av{width:48px;height:48px;border-radius:13px;background:linear-gradient(135deg,var(--gold),var(--p));color:#fff;font-size:19px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 10px}
.prov-name{font-size:13px;font-weight:800;color:#fff;margin-bottom:3px}
.prov-spec{font-size:10px;color:rgba(255,255,255,0.55);margin-bottom:7px;line-height:1.4}
.prov-stars{color:var(--gold);font-size:12px;letter-spacing:1px;margin-bottom:3px}
.prov-city{font-size:10px;color:rgba(255,255,255,0.4)}
.prov-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:800;margin-top:6px}
.pb-gold{background:rgba(245,158,11,0.2);color:var(--gold);border:1px solid rgba(245,158,11,0.3)}
.pb-blue{background:rgba(99,102,241,0.2);color:#a5b4fc;border:1px solid rgba(99,102,241,0.3)}
.pb-green{background:rgba(34,197,94,0.2);color:#4ade80;border:1px solid rgba(34,197,94,0.3)}
.how-section{padding:48px 20px;background:var(--white);text-align:center}
.how-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:20px;max-width:750px;margin:24px auto 0}
.how-step{padding:20px 14px}
.how-num{width:42px;height:42px;border-radius:12px;background:var(--p);color:#fff;font-size:17px;font-weight:900;display:flex;align-items:center;justify-content:center;margin:0 auto 12px}
.how-title{font-size:14px;font-weight:800;margin-bottom:7px}
.how-desc{font-size:12px;color:var(--muted);line-height:1.7}
.cta-banner{background:linear-gradient(135deg,var(--p),var(--p2));padding:48px 24px;text-align:center}
.cta-banner h2{font-size:22px;font-weight:900;color:#fff;margin-bottom:8px}
.cta-banner p{font-size:13px;color:rgba(255,255,255,0.7);margin-bottom:24px}
.cta-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
.btn-cta-w{padding:12px 24px;background:#fff;color:var(--p);border:none;border-radius:11px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:800;cursor:pointer;text-decoration:none;transition:.15s}
.btn-cta-w:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.15)}
.btn-cta-o{padding:12px 24px;background:transparent;color:#fff;border:1.5px solid rgba(255,255,255,0.4);border-radius:11px;font-family:'Tajawal',sans-serif;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;transition:.15s}
.btn-cta-o:hover{background:rgba(255,255,255,0.1)}
footer{background:#0f0a1e;padding:28px 20px;text-align:center;color:rgba(255,255,255,0.35);font-size:12px}
footer strong{color:var(--gold)}
.overlay{display:none;position:fixed;inset:0;background:rgba(10,5,30,0.7);z-index:400;align-items:flex-end;justify-content:center;backdrop-filter:blur(8px)}
.overlay.show{display:flex}
.modal{background:var(--white);border-radius:22px 22px 0 0;width:100%;max-width:520px;max-height:92vh;overflow-y:auto}
.modal-drag{width:34px;height:4px;background:#d1d5db;border-radius:2px;margin:12px auto 0}
.modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid var(--border)}
.modal-head h3{font-size:15px;font-weight:900}
.modal-x{width:28px;height:28px;border-radius:8px;background:var(--bg);border:none;cursor:pointer;font-size:18px;color:var(--muted)}
.modal-body{padding:16px 18px 24px}
.m-emoji{width:100%;height:140px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--p-light),var(--p-mid));border-radius:12px;margin-bottom:14px}
.m-emoji svg{width:60px;height:60px;stroke:var(--p)}
.detail-meta{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.detail-desc{font-size:13px;color:#475569;line-height:1.7;margin-bottom:14px}
.detail-client{background:var(--bg);border-radius:11px;padding:12px;margin-bottom:14px;display:flex;align-items:center;gap:10px}
.dc-av{width:36px;height:36px;border-radius:10px;background:var(--p);color:#fff;font-size:14px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.dc-name{font-size:13px;font-weight:800}
.dc-meta{font-size:11px;color:var(--muted)}
.login-prompt{background:var(--p-light);border:1.5px solid var(--p-mid);border-radius:13px;padding:16px;text-align:center}
.login-prompt p{font-size:13px;color:var(--text);margin-bottom:12px;line-height:1.6}
.login-prompt-btns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
.lp-btn{padding:10px 20px;border-radius:10px;font-family:'Tajawal',sans-serif;font-size:13px;font-weight:800;cursor:pointer;text-decoration:none;transition:.15s}
.lp-p{background:var(--p);color:#fff;border:none}
.lp-p:hover{background:var(--p2)}
.lp-s{background:var(--white);color:var(--p);border:1.5px solid var(--p)}
.empty{text-align:center;padding:48px 16px;color:var(--muted)}
.empty-ic{font-size:48px;margin-bottom:12px}
.empty h4{font-size:15px;font-weight:800;color:var(--text);margin-bottom:4px}
.loading{text-align:center;padding:48px;color:var(--muted)}
.loading-spin{width:34px;height:34px;border:3px solid var(--p-mid);border-top-color:var(--p);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px}
@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:600px){
  .hero h1{font-size:24px}
  .hero-stats{gap:24px}
  .hs-n{font-size:24px}
  .prov-grid{grid-template-columns:repeat(2,1fr)}
  .how-grid{grid-template-columns:1fr}
  .cats-scroll{justify-content:flex-start}
}
</style>
</head>
<body>

<nav class="nav" id="navbar">
  <a href="#" class="nav-logo">مناقصة<span>.</span></a>
  <div class="nav-btns">
    <a href="auth.html" class="nav-login">دخول</a>
    <a href="auth.html?tab=register" class="nav-reg">سجّل الآن</a>
  </div>
</nav>

<section class="hero">
  <div class="hero-orb hero-orb-1"></div>
  <div class="hero-orb hero-orb-2"></div>
  <div class="hero-badge">✦ المنصة الأولى لخدمات المنازل في السعودية</div>
  <h1>اطلب الخدمة<br><span>واحصل على أفضل العروض</span></h1>
  <p>انشر طلبك مجاناً واستقبل عروض من أفضل المزودين في مدينتك خلال دقائق</p>
  <div class="hero-actions">
    <a href="auth.html?tab=register" class="btn-hero-p">🚀 انشر طلبك مجاناً</a>
    <a href="#requests" class="btn-hero-s">تصفح الطلبات</a>
  </div>
  <div class="hero-stats">
    <div class="hs"><div class="hs-n" id="h-reqs">0</div><div class="hs-t">طلب نشط</div></div>
    <div class="hs"><div class="hs-n" id="h-provs">0</div><div class="hs-t">مزود موثوق</div></div>
    <div class="hs"><div class="hs-n" id="h-users">0</div><div class="hs-t">مستخدم مسجل</div></div>
  </div>
  <div class="hero-scroll">↓</div>
</section>

<div class="cats-section">
  <div class="cats-title">تصفح حسب التصنيف</div>
  <div class="cats-scroll" id="cats-row"></div>
</div>

<section class="main-section" id="requests">
  <div class="section-head">
    <h2>الطلبات <span>المتاحة</span></h2>
    <div class="live-dot">مباشر</div>
  </div>
  <div class="search-bar">
    <svg width="16" height="16" fill="none" stroke="#94a3b8" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    <input type="text" id="search-inp" placeholder="ابحث عن خدمة..." oninput="filterReqs()">
    <button class="search-btn" onclick="filterReqs()">بحث</button>
  </div>
  <div class="filter-row">
    <select class="f-sel" id="f-city" onchange="filterReqs()"><option value="">كل المدن</option></select>
    <select class="f-sel" id="f-cat" onchange="filterReqs()"><option value="">كل التصنيفات</option></select>
    <select class="f-sel" id="f-budget" onchange="filterReqs()">
      <option value="">كل الميزانيات</option>
      <option value="500">أقل من 500 ر.س</option>
      <option value="1000">أقل من 1000 ر.س</option>
      <option value="5000">أقل من 5000 ر.س</option>
    </select>
  </div>
  <div id="reqs-list"><div class="loading"><div class="loading-spin"></div>جاري التحميل...</div></div>
  <div style="text-align:center;margin-top:20px">
    <button id="load-more" style="display:none;padding:10px 24px;background:var(--p-light);color:var(--p);border:1.5px solid var(--p-mid);border-radius:10px;font-family:'Tajawal',sans-serif;font-size:13px;font-weight:800;cursor:pointer" onclick="loadMore()">عرض المزيد ↓</button>
  </div>
</section>

<section class="providers-section">
  <div style="text-align:center;max-width:900px;margin:0 auto">
    <div style="font-size:11px;font-weight:800;color:rgba(255,255,255,0.35);letter-spacing:1px;margin-bottom:8px">المزودون المتميزون</div>
    <h2 style="font-size:21px;font-weight:900;color:#fff;margin-bottom:4px">أفضل <span style="color:var(--gold)">مزودي الخدمات</span></h2>
    <p style="font-size:12px;color:rgba(255,255,255,0.45)">مزودون موثوقون وذوو تقييمات عالية</p>
    <div class="prov-grid" id="provs-grid">
      <div style="color:rgba(255,255,255,0.3);text-align:center;grid-column:1/-1;padding:24px">
        <div class="loading-spin" style="border-color:rgba(255,255,255,0.1);border-top-color:var(--gold)"></div>
      </div>
    </div>
  </div>
</section>

<section class="how-section">
  <div style="font-size:11px;font-weight:800;color:var(--p);letter-spacing:1px;margin-bottom:8px">كيف تعمل المنصة؟</div>
  <h2 style="font-size:21px;font-weight:900">3 خطوات بسيطة</h2>
  <div class="how-grid">
    <div class="how-step"><div class="how-num">١</div><div class="how-title">انشر طلبك</div><div class="how-desc">صف ما تحتاجه بالتفصيل مع الصور والميزانية والموقع</div></div>
    <div class="how-step"><div class="how-num">٢</div><div class="how-title">استقبل العروض</div><div class="how-desc">يصلك عروض من مزودين متخصصين في مدينتك</div></div>
    <div class="how-step"><div class="how-num">٣</div><div class="how-title">اختر الأنسب</div><div class="how-desc">قارن العروض وتواصل واختر المزود المناسب</div></div>
  </div>
</section>

<section class="cta-banner">
  <h2>مزود خدمة؟ ابدأ الآن 🚀</h2>
  <p>سجّل كمزود خدمة مجاناً وابدأ استقبال الطلبات من عملاء في مدينتك</p>
  <div class="cta-btns">
    <a href="auth.html?tab=register&role=provider" class="btn-cta-w">سجل كمزود خدمة</a>
    <a href="auth.html?tab=register" class="btn-cta-o">سجل كعميل</a>
  </div>
</section>

<footer>
  <div style="font-size:17px;font-weight:900;color:#fff;margin-bottom:6px">مناقصة<strong>.</strong></div>
  <div>منصة خدمات المنازل الأولى في السعودية</div>
  <div style="margin-top:6px">© 2025 مناقصة — جميع الحقوق محفوظة</div>
</footer>

<div class="overlay" id="detailOverlay">
  <div class="modal">
    <div class="modal-drag"></div>
    <div class="modal-head"><h3 id="m-title">تفاصيل الطلب</h3><button class="modal-x" onclick="closeModal()">×</button></div>
    <div class="modal-body" id="m-body"></div>
  </div>
</div>

<script>
var API='https://manaqasati-production.up.railway.app';
var allReqs=[],filtered=[],shown=0,PAGE=8,selCat='all';

var CATS=[
  {name:'الكل',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>'},
  {name:'تبريد وتكييف',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5l-5 5-5-5"/><path d="M17 19l-5-5-5 5"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M5 7l5 5-5 5"/><path d="M19 7l-5 5 5 5"/></svg>'},
  {name:'كهرباء',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'},
  {name:'سباكة',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>'},
  {name:'نجارة',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>'},
  {name:'تنظيف',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l18 18M8.93 8.93A10 10 0 0021 21H3V3"/></svg>'},
  {name:'نقل عفش',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>'},
  {name:'حدادة',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M6.34 17.66l-1.41 1.41M20 12h2M2 12h2M17.66 17.66l1.41 1.41M4.93 4.93l1.41 1.41M12 20v2M12 2v2"/></svg>'},
  {name:'ألمنيوم',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/><line x1="3" y1="12" x2="21" y2="12"/></svg>'},
  {name:'مسابح (تنفيذ وصيانة)',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12h20M2 16c2 2 4 2 6 0s4-2 6 0 4 2 6 0M2 20c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/><circle cx="12" cy="7" r="2"/></svg>'},
  {name:'كاميرات مراقبة وأمن',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>'},
  {name:'شبكات وإنترنت',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M10.54 17.1a6 6 0 012.92 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/></svg>'},
  {name:'مظلات وسواتر',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l9-7 9 7"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="9" x2="12" y2="22"/><line x1="21" y1="9" x2="12" y2="22"/></svg>'},
  {name:'عزل حراري وأسطح',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/><line x1="12" y1="17" x2="12" y2="20"/></svg>'},
  {name:'أبواب',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 21h18"/><rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="16" cy="12" r="1" fill="currentColor"/></svg>'},
  {name:'أعمال جبس وطباشير',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>'},
  {name:'مكافحة حشرات',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22a7 7 0 007-7v-4H5v4a7 7 0 007 7z"/><path d="M9 11V6a3 3 0 016 0v5"/><line x1="5" y1="11" x2="2" y2="9"/><line x1="19" y1="11" x2="22" y2="9"/></svg>'},
  {name:'أخرى',svg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>'}
];

var catSVG={};
CATS.forEach(function(c){catSVG[c.name]=c.svg;});

var cr=document.getElementById('cats-row');
CATS.forEach(function(c){
  var d=document.createElement('div');
  d.className='cat-chip'+(c.name==='الكل'?' on':'');
  d.innerHTML='<div class="cat-ic-wrap">'+c.svg+'</div><div class="cat-name">'+c.name+'</div>';
  d.onclick=function(){
    document.querySelectorAll('.cat-chip').forEach(function(x){x.className='cat-chip';});
    this.className='cat-chip on';
    selCat=c.name==='الكل'?'all':c.name;
    filterReqs();
  };
  cr.appendChild(d);
});

window.addEventListener('scroll',function(){
  document.getElementById('navbar').className=window.scrollY>50?'nav scrolled':'nav';
});

fetch(API+'/api/admin/stats').then(function(r){return r.json();}).then(function(s){
  animCount('h-reqs',s.requests||0);
  animCount('h-provs',s.providers||0);
  animCount('h-users',s.users||0);
}).catch(function(){});

function animCount(id,target){
  var el=document.getElementById(id);if(!el||!target)return;
  var start=0;var step=Math.max(1,Math.ceil(target/40));
  var t=setInterval(function(){start+=step;if(start>=target){el.textContent=target;clearInterval(t);}else{el.textContent=start;}},35);
}

fetch(API+'/api/requests').then(function(r){return r.json();}).then(function(reqs){
  allReqs=reqs;
  var cities=[],cats=[];
  reqs.forEach(function(r){
    if(r.city&&cities.indexOf(r.city)<0)cities.push(r.city);
    if(r.category&&cats.indexOf(r.category)<0)cats.push(r.category);
  });
  var cf=document.getElementById('f-city');
  cities.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;cf.appendChild(o);});
  var catf=document.getElementById('f-cat');
  cats.forEach(function(c){var o=document.createElement('option');o.value=c;o.textContent=c;catf.appendChild(o);});
  filterReqs();
}).catch(function(){
  document.getElementById('reqs-list').innerHTML='<div class="empty"><div class="empty-ic">😕</div><h4>تعذر تحميل الطلبات</h4></div>';
});

fetch(API+'/api/admin/users').then(function(r){return r.json();}).then(function(users){
  var provs=users.filter(function(u){return u.role==='provider';}).slice(0,8);
  if(!provs.length){document.getElementById('provs-grid').innerHTML='<div style="color:rgba(255,255,255,0.3);text-align:center;grid-column:1/-1;padding:20px;font-size:13px">لا يوجد مزودون بعد</div>';return;}
  var badges=[['pb-gold','موثّق ✓'],['pb-blue','متميز ⭐'],['pb-green','نشط 🔥']];
  document.getElementById('provs-grid').innerHTML=provs.map(function(p,i){
    var specs=p.specialties&&p.specialties.length?p.specialties[0]:'مزود خدمات';
    var b=badges[i%3];
    return '<div class="prov-card"><div class="prov-av">'+p.name.charAt(0)+'</div><div class="prov-name">'+p.name+'</div><div class="prov-spec">'+specs+'</div><div class="prov-stars">★★★★★</div><div class="prov-city">'+(p.city||'السعودية')+'</div><span class="prov-badge '+b[0]+'">'+b[1]+'</span></div>';
  }).join('');
}).catch(function(){});

function filterReqs(){
  var q=document.getElementById('search-inp').value.toLowerCase();
  var city=document.getElementById('f-city').value;
  var cat=document.getElementById('f-cat').value;
  var budget=parseInt(document.getElementById('f-budget').value)||0;
  filtered=allReqs.filter(function(r){
    if(q&&!(r.title||'').toLowerCase().includes(q)&&!(r.description||'').toLowerCase().includes(q))return false;
    if(city&&r.city!==city)return false;
    if(cat&&r.category!==cat)return false;
    if(selCat!=='all'&&r.category!==selCat)return false;
    if(budget&&r.budget_max&&r.budget_max>budget)return false;
    return true;
  });
  shown=0;renderReqs();
}

function renderReqs(){
  var list=filtered.slice(0,shown+PAGE);shown=list.length;
  if(!list.length){document.getElementById('reqs-list').innerHTML='<div class="empty"><div class="empty-ic">🔍</div><h4>لا يوجد طلبات</h4><p>جرب فلتراً آخر</p></div>';document.getElementById('load-more').style.display='none';return;}
  document.getElementById('reqs-list').innerHTML='<div class="reqs-grid">'+list.map(reqCard).join('')+'</div>';
  document.getElementById('load-more').style.display=shown<filtered.length?'inline-block':'none';
}

function loadMore(){shown+=PAGE;renderReqs();}

function timeAgo(d){var diff=(new Date()-new Date(d))/1000;if(diff<3600)return Math.floor(diff/60)+' د';if(diff<86400)return Math.floor(diff/3600)+' س';return Math.floor(diff/86400)+' يوم';}

function reqCard(r){
  var svg=catSVG[r.category]||catSVG['أخرى'];
  var isNew=(new Date()-new Date(r.created_at))/3600000<24;
  var bids=parseInt(r.bid_count)||0;
  return '<div class="rcard" onclick="openDetail('+r.id+')">'+
    (isNew?'<div class="new-badge">جديد</div>':'')+
    '<div class="rcard-emoji">'+svg.replace('stroke="currentColor"','stroke="var(--p)"').replace('viewBox','width="56" height="56" viewBox')+'</div>'+
    '<div class="rcard-body">'+
    '<div class="rcard-top"><div class="rcard-title">'+r.title+'</div><span class="tag t-open">نشط</span></div>'+
    '<div class="rcard-meta">'+
    (r.city?'<span class="rm">📍 '+r.city+'</span>':'')+
    (r.category?'<span class="rm">'+r.category+'</span>':'')+
    '<span class="rm">💼 '+bids+' عروض</span>'+
    '<span class="rm">🕐 '+timeAgo(r.created_at)+'</span>'+
    '</div>'+
    (r.description?'<div class="rcard-desc">'+r.description+'</div>':'')+
    '<div class="rcard-foot">'+
    (r.budget_max?'<div class="rcard-budget">'+r.budget_max.toLocaleString()+' <span>ر.س</span></div>':'<div></div>')+
    '<a href="auth.html" class="bid-cta" onclick="event.stopPropagation()">قدّم عرضاً</a>'+
    '</div></div></div>';
}

function openDetail(id){
  var r=allReqs.find(function(x){return x.id===id;});if(!r)return;
  var svg=catSVG[r.category]||catSVG['أخرى'];
  document.getElementById('m-title').textContent=r.title;
  document.getElementById('m-body').innerHTML=
    '<div class="m-emoji">'+svg.replace('stroke="currentColor"','stroke="var(--p)"').replace('viewBox','width="60" height="60" viewBox')+'</div>'+
    '<div class="detail-meta">'+
    (r.city?'<span class="tag" style="background:#f1f5f9;color:#475569">📍 '+r.city+'</span>':'')+
    (r.address?'<span class="tag" style="background:#f1f5f9;color:#475569">'+r.address+'</span>':'')+
    (r.category?'<span class="tag" style="background:var(--p-light);color:var(--p)">'+r.category+'</span>':'')+
    (r.budget_max?'<span class="tag" style="background:#f0fdf4;color:#16a34a">'+r.budget_max.toLocaleString()+' ر.س</span>':'')+
    (r.deadline?'<span class="tag" style="background:#fef3c7;color:#d97706">📅 '+r.deadline+'</span>':'')+
    '<span class="tag" style="background:#f1f5f9;color:#475569">💼 '+(r.bid_count||0)+' عروض</span>'+
    '</div>'+
    (r.description?'<div class="detail-desc">'+r.description+'</div>':'')+
    '<div class="detail-client"><div class="dc-av">'+(r.client_name||'ع').charAt(0)+'</div><div><div class="dc-name">'+(r.client_name||'عميل')+'</div><div class="dc-meta">طالب الخدمة</div></div></div>'+
    '<div class="login-prompt"><p>سجّل دخولك لتقديم عرض على هذا الطلب والتواصل مع العميل مباشرة</p>'+
    '<div class="login-prompt-btns">'+
    '<a href="auth.html?tab=register&role=provider" class="lp-btn lp-p">سجّل كمزود</a>'+
    '<a href="auth.html" class="lp-btn lp-s">دخول</a>'+
    '</div></div>';
  document.getElementById('detailOverlay').className='overlay show';
}

function closeModal(){document.getElementById('detailOverlay').className='overlay';}
document.getElementById('detailOverlay').addEventListener('click',function(e){if(e.target===this)closeModal();});
</script>
</body>
</html>
