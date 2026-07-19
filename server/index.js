const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const webpush = require('web-push');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

// Cloudflare R2 Setup
let r2Client = null;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || '';
const R2_BUCKET = process.env.R2_BUCKET || 'manaqasa-images';
if (process.env.R2_ACCESS_KEY && process.env.R2_SECRET_KEY && process.env.R2_ENDPOINT) {
  r2Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY,
      secretAccessKey: process.env.R2_SECRET_KEY
    }
  });
  console.log('✅ R2 storage connected');
} else {
  console.warn(' R2 keys not set — image upload will use base64 fallback');
}

// رفع صورة base64 إلى R2، يرجع رابط عام
async function uploadToR2(base64Data, folder) {
  if (!r2Client || !base64Data) return base64Data; // fallback
  if (!base64Data.startsWith('data:')) return base64Data; // already a URL
  try {
    const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) return base64Data;
    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const ext = contentType.split('/')[1] || 'jpg';
    const key = (folder || 'img') + '/' + crypto.randomBytes(16).toString('hex') + '.' + ext;
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType
    }));
    return R2_PUBLIC_URL + '/' + key;
  } catch (e) {
    console.error('R2 upload failed:', e.message);
    return base64Data; // fallback to base64
  }
}

const app = express();
const port = process.env.PORT || 3000;

// ═══════════════════════════════════════════════════════════════
// DATABASE
// ═══════════════════════════════════════════════════════════════
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/manaqasa',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.connect()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('Database error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'manaqasa-secret-2024';
if (!process.env.JWT_SECRET) {
  console.error('🔴 تحذير أمني: JWT_SECRET غير معيّن! عيّنه في Railway env vars فوراً');
}
const SITE_URL   = process.env.SITE_URL   || 'https://manaqasati-production.up.railway.app';
const RESEND_KEY = process.env.RESEND_KEY || process.env.RESEND_API_KEY || '';
const SERVER_START = Date.now();
const FROM_EMAIL = process.env.FROM_EMAIL || 'cs@manaqasa.com';
const FROM_NAME  = process.env.FROM_NAME  || 'مناقصة';

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT     || 'mailto:cs@manaqasa.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('✅ Web Push (VAPID) configured');
  } catch (e) {
    console.error('VAPID setup error:', e.message);
  }
} else {
  console.warn(' VAPID keys not set — push notifications disabled');
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('.'));

// Rate Limiting بسيط (in-memory) — حماية من brute force
const _rateLimit = new Map();
function rateLimiter(maxReq, windowMs){
  return (req, res, next) => {
    const key = (req.ip || req.headers['x-forwarded-for'] || 'unknown') + ':' + req.path;
    const now = Date.now();
    const rec = _rateLimit.get(key) || { count: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.count = 0; rec.reset = now + windowMs; }
    rec.count++;
    _rateLimit.set(key, rec);
    if (rec.count > maxReq) {
      return res.status(429).json({ message: 'محاولات كثيرة، حاول بعد قليل' });
    }
    next();
  };
}
// تنظيف الذاكرة كل 10 دقائق
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of _rateLimit) { if (now > v.reset) _rateLimit.delete(k); }
}, 600000);

// نشر الطلبات قيد المراجعة تلقائياً بعد انتهاء مدة المراجعة (قابلة للتعديل من لوحة الأدمن)
async function notifyMatchingProviders(request){
  try{
    if(!request || !request.id) return;
    if((await getSetting('match_notify_on','1'))==='0') return;
    const cat = request.category || null;
    const city = request.city || null;
    // مزوّد يطابق الفئة (ضمن تخصصاته أو فئات إشعاره) ونفس المدينة إن توفّرت
    const r = await pool.query(
      `SELECT DISTINCT id FROM users
        WHERE role='provider' AND is_active=TRUE
          AND ($1::text IS NULL OR $1 = ANY(COALESCE(notify_categories, specialties, ARRAY[]::text[])) OR $1 = ANY(COALESCE(specialties, ARRAY[]::text[])))
          AND ($2::text IS NULL OR city IS NULL OR city = $2)`,
      [cat, city]);
    let sent=0;
    for(const p of r.rows){
      try{
        await notify(p.id, '🆕 مشروع جديد يناسبك', `"${request.title}"${city?(' · '+city):''} — بادر بتقديم عرضك`, 'request', request.id);
        sent++;
      }catch(e){}
    }
    if(sent) console.log(`[match] أُشعر ${sent} مزوّد بمشروع ${request.id}`);
  }catch(e){ console.error('notifyMatchingProviders:', e.message); }
}
setInterval(async () => {
  try {
    const mins = Math.max(0, parseInt(await getSetting('review_minutes', '5')) || 0);
    const r = await pool.query(
      `UPDATE requests SET status='open' WHERE status IN ('pending_review','review') AND created_at <= NOW() - ($1 || ' minutes')::interval RETURNING id, client_id, title, category, city`,
      [String(mins)]
    );
    for (const row of r.rows) {
      try { await notify(row.client_id, 'تم نشر مشروعك', `مشروعك "${row.title}" تمت مراجعته ونُشر للعروض الآن`, 'request', row.id); } catch(e) {}
      try { await notifyMatchingProviders(row); } catch(e) {}
    }
    if (r.rows.length) console.log(`[auto-publish] نُشر ${r.rows.length} مشروع تلقائياً`);
  } catch(e) { console.error('auto-publish:', e.message); }
}, 60000);

// منع الكاش على ملفات HTML
app.use(function(req, res, next){
  if(req.path.endsWith('.html') || req.path === '/'){
    res.setHeader('Cache-Control','no-cache, no-store, must-revalidate');
    res.setHeader('Pragma','no-cache');
    res.setHeader('Expires','0');
  }
  next();
});

app.use((req, res, next) => { console.log(`${req.method} ${req.path}`); next(); });

app.get('/',                       (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/favicon.ico', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#16213E"/><circle cx="16" cy="16" r="5" fill="#C9920A"/></svg>');
});
app.get('/google0ed958111c5d0ae7.html', (req, res) => res.send('google-site-verification: google0ed958111c5d0ae7.html'));
app.get('/dashboard-admin.html',   (req, res) => res.sendFile(__dirname + '/dashboard-admin.html'));
app.get('/dashboard-client.html',  (req, res) => res.sendFile(__dirname + '/dashboard-client.html'));
app.get('/dashboard-provider.html',(req, res) => res.sendFile(__dirname + '/dashboard-provider.html'));
app.get('/auth.html',              (req, res) => res.sendFile(__dirname + '/auth.html'));
app.get('/app.html',               (req, res) => res.sendFile(__dirname + '/app.html'));
app.get('/project.html',           (req, res) => res.sendFile(__dirname + '/project.html'));
app.get('/pro.html',               (req, res) => res.sendFile(__dirname + '/pro.html'));
app.get('/card.html',              (req, res) => res.sendFile(__dirname + '/card.html'));
app.get('/terms.html',             (req, res) => res.sendFile(__dirname + '/terms.html'));

app.get(/^\/project\/(.+)$/, async (req, res) => {
  try {
    const raw = req.path.replace(/^\/project\//, '');
    const slug = decodeURIComponent(raw);
    const match = slug.match(/(\d+)$/);
    if (!match) return res.sendFile(__dirname + '/project.html');
    const id = parseInt(match[1]);
    const r = await pool.query(`
      SELECT r.id, r.title, r.description, r.category, r.city,
        r.budget_max as budget, r.deadline, r.status, r.created_at,
        u.name as client_name, u.city as client_city,
        (SELECT COUNT(*) FROM bids WHERE request_id=r.id) as bid_count
      FROM requests r JOIN users u ON u.id=r.client_id WHERE r.id=$1
    `, [id]);
    if (!r.rows.length) return res.sendFile(__dirname + '/project.html');
    const p = r.rows[0];
    const fs = require('fs');
    let html = fs.readFileSync(__dirname + '/project.html', 'utf8');
    const pageUrl = SITE_URL + '/project/' + raw;
    const pgT = p.title + (p.category ? ' — ' + p.category : '') + (p.city ? ' في ' + p.city : '') + ' | مناقصة';
    const pgD = p.title + ' في ' + (p.city||'السعودية') + (p.category ? ' — ' + p.category : '') + '. قدّم عرضك على منصة مناقصة.';
    html = html
      .replace('<title>مشروع — مناقصة</title>', '<title>' + pgT + '</title>')
      .replace('<meta name="description" content="مشروع على منصة مناقصة السعودية">', '<meta name="description" content="' + pgD + '">')
      .replace('</head>', '<meta property="og:title" content="' + pgT + '"><meta property="og:description" content="' + pgD + '"><meta property="og:url" content="' + pageUrl + '"><link rel="canonical" href="' + pageUrl + '"></head>');
    res.send(html);
  } catch(e) { console.error('/project SSR:', e.message); res.sendFile(__dirname + '/project.html'); }
});

app.get('/api/requests/public/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`
      SELECT r.id, r.title, r.description, r.category, r.city,
        r.budget_max as budget, r.budget_min, r.deadline, r.status, r.created_at,
        COALESCE((SELECT json_agg(img) FROM unnest(r.images) img WHERE img LIKE 'http%'),'[]'::json) as images,
        json_build_object('id', u.id, 'name', split_part(u.name,' ',1), 'city', u.city,
          'badge', u.badge,
          'completed_count', (SELECT COUNT(*) FROM requests WHERE client_id=u.id AND status='completed'),
          'is_premium', (u.badge='premium' OR (SELECT COUNT(*) FROM requests WHERE client_id=u.id AND status='completed')>=3)
        ) as client
      FROM requests r LEFT JOIN users u ON u.id=r.client_id WHERE r.id=$1
    `, [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/bids/public/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`
      SELECT b.id, b.price, b.note as proposal, b.days, b.status, b.created_at,
        u.id as provider_id,
        u.name as provider_name,
        u.city as provider_city,
        u.phone as provider_phone,
        u.business_name as provider_business_name,
        CASE WHEN u.profile_image IS NOT NULL AND length(u.profile_image) > 0
          THEN u.profile_image ELSE NULL END as provider_image,
        COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=u.id),0)::float as avg_rating,
        COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=u.id),0)::int as review_count
      FROM bids b JOIN users u ON u.id=b.provider_id WHERE b.request_id=$1 ORDER BY b.created_at ASC
    `, [id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json([]); }
});

app.get(/^\/pro\/(.+)$/, async (req, res) => {
  try {
    const raw = req.path.replace(/^\/pro\//, '');
    const slug = decodeURIComponent(raw);
    // يقبل ID في النهاية (وليد-49) أو البداية (49-وليد) أو ?id=
    const params = new URLSearchParams(req.query);
    let id = null;
    if (params.get('id') && /^\d+$/.test(params.get('id'))) {
      id = parseInt(params.get('id'));
    } else {
      const m = slug.match(/(\d+)$/) || slug.match(/^(\d+)-/);
      if (m) id = parseInt(m[1]);
    }
    if (!id) return res.sendFile(__dirname + '/pro.html');
    const r = await pool.query(`
      SELECT id, name, phone, city, bio, specialties, profile_image, business_name, experience_years,
        COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0)::float as avg_rating,
        COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0)::int as review_count,
        (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed')::int as completed_projects
      FROM users WHERE id=$1 AND role='provider'
    `, [id]);
    if (!r.rows.length) return res.sendFile(__dirname + '/pro.html');
    const p = r.rows[0];
    const pName = p.business_name || p.name || 'مزود خدمة';
    const pCity = p.city || 'السعودية';
    const specs = (p.specialties || []).join('، ');
    const avg = parseFloat(p.avg_rating) || 0;
    const cnt = parseInt(p.review_count) || 0;
    // canonical دائماً بالاسم الكامل (SEO قوي) مهما كان رابط الدخول
    const seoSlug = encodeURIComponent(pName.replace(/\s+/g, '-')) + '-' + p.id;
    const pageUrl = `${SITE_URL}/pro/${seoSlug}`;
    const title = `${pName}${specs ? ' — ' + specs : ''}${pCity !== 'السعودية' ? ' في ' + pCity : ''} | مناقصة`;
    const desc = `${pName} مزود خدمة في ${pCity}${specs ? '، متخصص في ' + specs : ''}${avg > 0 ? '، تقييم ' + avg.toFixed(1) + ' من 5' : ''}. تواصل معه على منصة مناقصة.`;
    const keywords = [pName, pCity, ...(p.specialties||[]), ...(p.specialties||[]).map(s => s+' '+pCity), 'مزود خدمة', 'مناقصة'].join(', ');
    const fs = require('fs');
    let html = fs.readFileSync(__dirname + '/pro.html', 'utf8');
    html = html
      .replace('<title>ملف المزود — مناقصة</title>', `<title>${title}</title>`)
      .replace('<meta name="description" content="مزود خدمة على منصة مناقصة السعودية">', `<meta name="description" content="${desc}">`)
      .replace('<script type="application/ld+json" id="ld"></script>', `
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"LocalBusiness","name":"${pName}","description":"${desc.replace(/"/g,'\\"')}","url":"${pageUrl}","telephone":"${p.phone||''}","address":{"@type":"PostalAddress","addressLocality":"${pCity}","addressCountry":"SA"}${avg>0?`,"aggregateRating":{"@type":"AggregateRating","ratingValue":"${avg.toFixed(1)}","reviewCount":"${cnt}","bestRating":"5"}`:''}}</script>
<script type="application/ld+json" id="ld"></script>`)
      .replace('</head>', `
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${SITE_URL}/og/pro/${id}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:image" content="${SITE_URL}/og/pro/${id}">
  <meta property="og:type" content="profile">
  <meta property="og:site_name" content="مناقصة">
  <meta property="og:locale" content="ar_SA">
  <meta name="keywords" content="${keywords}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc}">
  <link rel="canonical" href="${pageUrl}">
</head>`);
    res.send(html);
  } catch(e) { console.error('/pro/:slug SSR:', e.message); res.sendFile(__dirname + '/pro.html'); }
});

// ═══ الكرت الرقمي للمستهدف (leads) — عام، غير مفهرس (noindex) ═══
function genCardToken(){ return crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g,'').slice(0,12); }

// صفحة الكرت — لو تحوّل المستهدف لمزوّد مسجّل، حوّل لصفحته الرسمية؛ وإلا اعرض الكرت (مع وسوم معاينة)
let _cardTpl = null;
app.get('/card/:token', async (req, res) => {
  try{
    const r = await pool.query('SELECT converted_user_id, name, category, city, rating, card_published FROM leads WHERE card_token=$1 LIMIT 1', [req.params.token]);
    const lead = r.rows[0];
    if(lead && lead.converted_user_id){
      const u = await pool.query("SELECT id, COALESCE(business_name,name) AS nm FROM users WHERE id=$1 AND role='provider'", [lead.converted_user_id]);
      if(u.rows[0]){
        const seoSlug = encodeURIComponent(String(u.rows[0].nm||'مزود').replace(/\s+/g,'-')) + '-' + u.rows[0].id;
        return res.redirect(302, '/pro/' + seoSlug);
      }
    }
    if(_cardTpl === null){ try{ _cardTpl = require('fs').readFileSync(__dirname + '/card.html','utf8'); }catch(e){ _cardTpl = ''; } }
    if(!_cardTpl || !lead || lead.card_published === false) return res.sendFile(__dirname + '/card.html');
    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    const nm = esc(lead.name||'بطاقة رقمية');
    const desc = esc([lead.category, lead.city].filter(Boolean).join(' · ') + (lead.rating?` · ⭐ ${(+lead.rating).toFixed(1)}`:''));
    const url = `${SITE_URL}/card/${req.params.token}`;
    const img = `${SITE_URL}/og/card/${req.params.token}`;
    const og = `\n<meta property="og:type" content="profile">\n<meta property="og:title" content="${nm} — بطاقة رقمية | مناقصة">\n<meta property="og:description" content="${desc}">\n<meta property="og:url" content="${url}">\n<meta property="og:image" content="${img}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="${nm} — بطاقة رقمية">\n<meta name="twitter:description" content="${desc}">\n<meta name="twitter:image" content="${img}">\n`;
    res.header('Content-Type','text/html; charset=utf-8');
    res.send(_cardTpl.replace('</head>', og + '</head>'));
  }catch(e){ res.sendFile(__dirname + '/card.html'); }
});

// صورة معاينة الكرت (OG) — بهوية مناقصة الزرقاء
app.get('/og/card/:token', async (req, res) => {
  try{
    const r = await pool.query('SELECT name, category, city, rating FROM leads WHERE card_token=$1 LIMIT 1', [req.params.token]);
    if(!r.rows.length) return res.status(404).send('Not found');
    const p = r.rows[0];
    const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const name = esc(p.name||'بطاقة رقمية');
    const specs = esc([p.category, p.city].filter(Boolean).join('  ·  ') || 'مزوّد خدمة');
    const avg = parseFloat(p.rating)||0;
    const initial = esc((String(p.name||'?').trim()[0])||'م');
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1e3a8a"/><stop offset="100%" stop-color="#2563eb"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><rect x="0" y="620" width="1200" height="10" fill="#0ea5e9"/><text x="600" y="110" font-family="Arial" font-size="30" fill="rgba(255,255,255,0.55)" text-anchor="middle">بطاقة رقمية · مناقصة</text><circle cx="600" cy="235" r="72" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" stroke-width="4"/><text x="600" y="235" font-family="Arial" font-size="70" font-weight="bold" fill="#fff" text-anchor="middle" dominant-baseline="central">${initial}</text><text x="600" y="380" font-family="Arial" font-size="64" font-weight="bold" fill="#fff" text-anchor="middle">${name}</text><text x="600" y="450" font-family="Arial" font-size="34" fill="rgba(255,255,255,0.85)" text-anchor="middle">${specs}</text>${avg>0?`<text x="600" y="520" font-family="Arial" font-size="34" fill="#7dd3fc" text-anchor="middle">★ ${avg.toFixed(1)}</text>`:''}<text x="600" y="585" font-family="Arial" font-size="22" fill="rgba(255,255,255,0.4)" text-anchor="middle">manaqasa.com</text></svg>`;
    res.header('Content-Type','image/svg+xml'); res.header('Cache-Control','public, max-age=3600'); res.send(svg);
  }catch(e){ res.status(500).send('error'); }
});

// بيانات الكرت العامة (حقول آمنة فقط)
app.get('/api/card/:token', async (req, res) => {
  try{
    const r = await pool.query(
      `SELECT name, phone, phone_norm, category, city, rating, reviews_count, website,
              card_bio, card_logo, card_links, card_published
       FROM leads WHERE card_token=$1 LIMIT 1`, [req.params.token]);
    if(!r.rows.length) return res.status(404).json({ message:'الكرت غير موجود' });
    const l = r.rows[0];
    if(l.card_published === false) return res.status(410).json({ unpublished:true, message:'الكرت غير متاح' });
    let views = 0;
    try{ const uv = await pool.query('UPDATE leads SET card_views=COALESCE(card_views,0)+1 WHERE card_token=$1 RETURNING card_views', [req.params.token]); views = (uv.rows[0] && uv.rows[0].card_views) || 0; }catch(e){}
    res.json({
      name: l.name, phone: l.phone, phone_norm: l.phone_norm, category: l.category, city: l.city,
      rating: l.rating, reviews_count: l.reviews_count, website: l.website,
      bio: l.card_bio || '', logo: l.card_logo || '', links: l.card_links || {}, views: views
    });
  }catch(e){ res.status(500).json({ message:'تعذّر' }); }
});

// تعديل ذاتي بالرمز (من عنده الرابط يملكه) — نبذة/روابط/إخفاء
app.post('/api/card/:token', async (req, res) => {
  try{
    const token = req.params.token;
    const chk = await pool.query('SELECT id FROM leads WHERE card_token=$1 LIMIT 1', [token]);
    if(!chk.rows.length) return res.status(404).json({ message:'الكرت غير موجود' });
    const bio = typeof req.body.bio === 'string' ? req.body.bio.slice(0,600) : null;
    const inLinks = (req.body.links && typeof req.body.links === 'object') ? req.body.links : {};
    const allow = ['instagram','snapchat','tiktok','twitter','whatsapp','maps','website'];
    const links = {};
    allow.forEach(k => { if(typeof inLinks[k]==='string' && inLinks[k].trim()) links[k] = inLinks[k].trim().slice(0,300); });
    const sets = ['card_updated_at=NOW()'], v = [];
    if(bio !== null){ v.push(bio); sets.push(`card_bio=$${v.length}`); }
    if(typeof req.body.logo === 'string'){
      let logo = req.body.logo.trim();
      if(logo.startsWith('data:')) logo = await uploadToR2(logo, 'manaqasa/cards');
      v.push(logo || null); sets.push(`card_logo=$${v.length}`);
    }
    v.push(JSON.stringify(links)); sets.push(`card_links=$${v.length}`);
    if(req.body.unpublish === true) sets.push('card_published=false');
    if(req.body.unpublish === false) sets.push('card_published=true');
    v.push(token);
    await pool.query(`UPDATE leads SET ${sets.join(',')} WHERE card_token=$${v.length}`, v);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ message:'تعذّر الحفظ' }); }
});

// (أدمن) إنشاء/جلب رابط الكرت لمستهدف
app.post('/api/admin/leads/:id/card', requirePermission('outreach.manage'), async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const r = await pool.query('SELECT card_token, card_views, card_published FROM leads WHERE id=$1', [id]);
    if(!r.rows.length) return res.status(404).json({ message:'غير موجود' });
    let token = r.rows[0].card_token;
    if(!token){
      for(let i=0;i<5 && !token;i++){
        const t = genCardToken();
        try{
          const up = await pool.query('UPDATE leads SET card_token=$1 WHERE id=$2 AND card_token IS NULL RETURNING card_token', [t, id]);
          if(up.rows.length) token = up.rows[0].card_token;
        }catch(e){}
      }
    }
    if(!token) return res.status(500).json({ message:'تعذّر توليد الرمز' });
    res.json({ token, url: `${SITE_URL}/card/${token}`, views: r.rows[0].card_views || 0, published: r.rows[0].card_published !== false });
  }catch(e){ res.status(500).json({ message:'تعذّر' }); }
});

// ═══ EMAIL ═══
async function sendEmail(to, subject, html) {
  if (!RESEND_KEY) { console.warn(' RESEND_KEY not set — skipping email to', to); return false; }
  if (!to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject, html })
    });
    if (!r.ok) { console.error('Resend error:', await r.text()); return false; }
    console.log(`📧 Email sent → ${to} — "${subject}"`);
    return true;
  } catch(e) { console.error('sendEmail:', e.message); return false; }
}

function emailTpl(title, body, btnText, btnUrl) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Tahoma,Arial,sans-serif;direction:rtl;-webkit-font-smoothing:antialiased">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${title} — منصة مناقصة</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f7;padding:28px 14px">
    <tr><td align="center">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(22,33,62,.10)">
        <!-- Header -->
        <tr><td style="background:#16213E;background:linear-gradient(135deg,#0D1829 0%,#16213E 55%,#1B3A6B 100%);padding:0;position:relative">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:34px 28px 28px;text-align:center">
            <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:.5px">
              <span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#C9920A;vertical-align:middle;margin-left:8px;box-shadow:0 0 0 4px rgba(201,146,10,.25)"></span>مناقصة
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,.55);margin-top:7px;font-weight:600">سوق المشاريع والخدمات</div>
          </td></tr></table>
          <div style="height:4px;background:linear-gradient(90deg,#A87000,#C9920A,#F0A500,#C9920A,#A87000)"></div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:34px 30px 26px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td>
            <div style="font-size:19px;font-weight:800;color:#0F172A;margin-bottom:6px">${title}</div>
            <div style="width:46px;height:3px;background:#C9920A;border-radius:2px;margin-bottom:20px"></div>
            <div style="font-size:14.5px;color:#374151;line-height:1.95">${body}</div>
            ${btnText && btnUrl ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px auto 6px"><tr><td style="border-radius:11px;background:linear-gradient(135deg,#C9920A,#A87000)"><a href="${btnUrl}" style="display:inline-block;color:#fff;padding:15px 46px;border-radius:11px;text-decoration:none;font-size:15px;font-weight:800;letter-spacing:.3px">${btnText}</a></td></tr></table>` : ''}
          </td></tr></table>
        </td></tr>
        <!-- Divider -->
        <tr><td style="padding:0 30px"><div style="height:1px;background:#E8EAED"></div></td></tr>
        <!-- Footer -->
        <tr><td style="padding:22px 30px 26px;text-align:center">
          <div style="font-size:13px;font-weight:800;color:#16213E;margin-bottom:6px">منصة مناقصة</div>
          <div style="font-size:11.5px;color:#94a3b8;line-height:1.8">تربط أصحاب المشاريع بأفضل المزودين<br>
            <a href="https://manaqasa.com" style="color:#C9920A;text-decoration:none;font-weight:700">manaqasa.com</a>
          </div>
          <div style="margin-top:14px;font-size:10.5px;color:#b8c0cc">© ${year} منصة مناقصة — جميع الحقوق محفوظة</div>
        </td></tr>
      </table>
      <div style="font-size:10.5px;color:#a0aab8;margin-top:16px;line-height:1.7">وصلتك هذه الرسالة لأنك مسجّل في منصة مناقصة</div>
    </td></tr>
  </table>
</body></html>`;
}

// ═══ PUSH ═══
async function sendPush(userId, title, body, url, refType, refId) {
  try {
    const r = await pool.query(`SELECT token, platform FROM push_tokens WHERE user_id=$1`, [userId]);
    if (!r.rows.length) return;
    let badgeCount = 1;
    try {
      const badgeRes = await pool.query(`
        SELECT (SELECT COUNT(*)::int FROM notifications WHERE user_id=$1 AND is_read=false) +
               (SELECT COUNT(*)::int FROM messages WHERE receiver_id=$1 AND (is_read=false OR is_read IS NULL)) AS total
      `, [userId]);
      const total = badgeRes.rows[0]?.total;
      if (typeof total === 'number' && total > 0) badgeCount = total;
    } catch(e) { console.error('badge count error:', e.message); }
    const webPayload = JSON.stringify({ title: title||'مناقصة', body: body||'', url: url||'/', type: refType||'general', ref_id: refId||null, tag: `${refType||'general'}-${refId||Date.now()}`, badge: badgeCount });
    const expoMessages = [];
    for (const row of r.rows) {
      const platform = row.platform || 'web';
      if (platform === 'web') {
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) continue;
        let subscription;
        try { subscription = JSON.parse(row.token); } catch(e) { continue; }
        try {
          await webpush.sendNotification(subscription, webPayload);
        } catch(err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            try { await pool.query('DELETE FROM push_tokens WHERE user_id=$1 AND token=$2', [userId, row.token]); } catch(e) {}
          } else { console.error('sendPush web error:', err.statusCode, err.message); }
        }
      } else if (platform === 'ios' || platform === 'android' || platform === 'expo') {
        if (row.token && row.token.startsWith('ExponentPushToken')) {
          expoMessages.push({ to: row.token, sound: 'default', title: title||'مناقصة', body: body||'', data: { url: url||'/', type: refType||'general', ref_id: refId||null }, badge: badgeCount, priority: 'high', channelId: 'default', _displayInForeground: true, ttl: 0, mutableContent: true, interruptionLevel: 'time-sensitive' });
        }
      }
    }
    if (expoMessages.length > 0) {
      try {
        const expoResp = await fetch('https://exp.host/--/api/v2/push/send', { method: 'POST', headers: { 'Accept': 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' }, body: JSON.stringify(expoMessages) });
        const expoResult = await expoResp.json();
        if (expoResult && expoResult.data && Array.isArray(expoResult.data)) {
          for (let i = 0; i < expoResult.data.length; i++) {
            const ticket = expoResult.data[i];
            if (ticket.status === 'error') {
              const errCode = ticket.details && ticket.details.error;
              if (errCode === 'DeviceNotRegistered') {
                try { await pool.query('DELETE FROM push_tokens WHERE user_id=$1 AND token=$2', [userId, expoMessages[i].to]); console.log(`🗑️  Removed invalid Expo token for user ${userId}`); } catch(e) {}
              } else { console.error('Expo push error:', errCode, ticket.message); }
            }
          }
        }
      } catch(expoErr) { console.error('Expo push API error:', expoErr.message); }
    }
  } catch(e) { console.error('sendPush helper error:', e.message); }
}

async function logAdmin(req, action, targetType, targetId, details) {
  try {
    await pool.query(
      'INSERT INTO admin_logs (admin_id, admin_name, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5,$6)',
      [req.user?.id||null, req.user?.name||'أدمن', action, targetType||null, targetId||null, details||null]
    );
  } catch(e) { console.error('logAdmin:', e.message); }
}

async function getSetting(key, def) {
  try { const r = await pool.query('SELECT value FROM platform_settings WHERE key=$1', [key]); return r.rows.length ? r.rows[0].value : def; }
  catch(e) { return def; }
}
async function setSetting(key, value) {
  await pool.query(`INSERT INTO platform_settings (key, value, updated_at) VALUES ($1,$2,NOW()) ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`, [key, String(value)]);
}

// ═══════════ نظام الصلاحيات (RBAC) ═══════════
const OWNER_EMAIL = 'wled-111@hotmail.com';
const ALL_PERMISSIONS = ['dashboard.view','analytics.view','users.view','users.edit','users.delete','users.badge','users.role','requests.view','requests.edit','requests.delete','requests.review','bids.view','bids.edit','bids.delete','reviews.view','reviews.delete','questions.view','questions.answer','questions.delete','reports.view','reports.resolve','logs.view','broadcast.send','settings.manage','admins.manage','outreach.manage'];
const PERM_LABELS = {'dashboard.view':'عرض لوحة المعلومات','analytics.view':'عرض التحليلات','users.view':'عرض المستخدمين','users.edit':'تعديل المستخدمين','users.delete':'حذف المستخدمين','users.badge':'منح الألقاب','users.role':'تغيير الأدوار','requests.view':'عرض المشاريع','requests.edit':'تعديل المشاريع','requests.delete':'حذف المشاريع','requests.review':'مراجعة المشاريع','bids.view':'عرض العروض','bids.edit':'تعديل العروض','bids.delete':'حذف العروض','reviews.view':'عرض التقييمات','reviews.delete':'حذف التقييمات','questions.view':'عرض الأسئلة','questions.answer':'الرد على الأسئلة','questions.delete':'حذف الأسئلة','reports.view':'عرض البلاغات','reports.resolve':'معالجة البلاغات','logs.view':'عرض السجل','broadcast.send':'الرسائل الجماعية','settings.manage':'إدارة الإعدادات','admins.manage':'إدارة المشرفين','outreach.manage':'إدارة الاستقطاب (الصيد)'};
const ROLE_LABELS = {super_admin:'أدمن كامل',content_manager:'مدير محتوى',support:'مشرف دعم',analyst:'محلّل',outreach_specialist:'مختص استقطاب'};
const ROLE_BASE_LEVEL = {super_admin:90,content_manager:50,support:30,analyst:20,outreach_specialist:25};
const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  content_manager: ['dashboard.view','analytics.view','users.view','users.edit','users.badge','users.role','users.delete','requests.view','requests.edit','requests.delete','requests.review','bids.view','bids.edit','bids.delete','reviews.view','reviews.delete','questions.view','questions.answer','questions.delete','reports.view','reports.resolve','logs.view','broadcast.send'],
  support: ['dashboard.view','users.view','requests.view','questions.view','questions.answer','reports.view','reports.resolve'],
  analyst: ['dashboard.view','analytics.view','users.view','requests.view','bids.view'],
  outreach_specialist: ['dashboard.view','outreach.manage']
};
function effectivePermissions(row){
  if(!row || row.role!=='admin') return [];
  if(Array.isArray(row.permissions) && row.permissions.length) return row.permissions;
  if(row.admin_role && ROLE_PERMISSIONS[row.admin_role]) return ROLE_PERMISSIONS[row.admin_role];
  return ['*'];
}
function hasPerm(perms, perm){ return perms.includes('*') || perms.includes(perm); }
async function loadAdmin(req, res, next){
  try{
    const r = await pool.query('SELECT id,name,email,role,admin_role,admin_level,permissions,is_active FROM users WHERE id=$1',[req.user.id]);
    if(!r.rows.length || r.rows[0].role!=='admin') return res.status(403).json({ message:'للمدير فقط' });
    if(r.rows[0].is_active===false) return res.status(403).json({ message:'الحساب معطّل' });
    req.adminUser = r.rows[0];
    req.adminPerms = effectivePermissions(r.rows[0]);
    next();
  }catch(e){ res.status(500).json({ message:'حدث خطأ، حاول مرة أخرى' }); }
}
// ═══ محرّك الاستقطاب: أدوات ═══
// توحيد صيغة الجوال السعودي → 9665XXXXXXXX
function normPhone(p){
  if(!p) return null;
  let d = String(p).replace(/[^\d]/g, '');
  if(d.startsWith('00966')) d = d.slice(2);
  else if(d.startsWith('966')) { /* كما هو */ }
  else if(d.startsWith('05')) d = '966' + d.slice(1);
  else if(d.startsWith('5') && d.length === 9) d = '966' + d;
  else if(d.startsWith('0')) d = '966' + d.slice(1);
  if(!d.startsWith('966')) return null;
  const rest = d.slice(3);
  if(rest.length !== 9 || !rest.startsWith('5')) return null;
  return d;
}
// توحيد اسم المنشأة للمطابقة: يوحّد الحروف، يشيل التشكيل و«ال» والكلمات العامة (مؤسسة/شركة/محل...)
function normName(s){
  if(!s) return '';
  let t = String(s)
    .replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
    .replace(/[\u064B-\u0652\u0640]/g,'')               // تشكيل + تطويل
    .replace(/[^\u0621-\u064A0-9a-zA-Z ]/g,' ')         // رموز/علامات
    .toLowerCase();
  const stop = { 'موسسه':1,'شركه':1,'مكتب':1,'محل':1,'مصنع':1,'مركز':1,'معرض':1,'ورشه':1,'مجموعه':1,'مؤسسه':1,
    'للتجاره':1,'التجاريه':1,'للمقاولات':1,'للخدمات':1,'الخدمات':1,'and':1,'co':1,'est':1,'company':1,'trading':1 };
  const toks = t.split(/\s+/).map(w => w.replace(/^ال/,'')).filter(w => w && !stop[w]);
  return toks.join(' ');
}
// تشابه اسمين — متحفّظ لتقليل الإنذارات الكاذبة (يُستخدم فقط كإشارة مراجعة يدوية)
function nameSimilar(a, b){
  a = normName(a); b = normName(b);
  if(!a || !b) return false;
  if(a === b) return true;
  const A = a.split(' '), B = b.split(' ');
  const setB = {}; B.forEach(w => { setB[w] = 1; });
  const common = A.filter(w => setB[w] && w.length >= 2).length;
  if(common >= 2) return true;                          // كلمتان مميزتان مشتركتان
  // اسم من كلمة واحدة مميزة (≥4 حروف) موجودة في الآخر
  if(A.length === 1 && A[0].length >= 4 && b.indexOf(A[0]) >= 0) return true;
  if(B.length === 1 && B[0].length >= 4 && a.indexOf(B[0]) >= 0) return true;
  return false;
}

// نقل بيانات الكرت (نبذة/شعار/روابط) إلى ملف المزود — ملء الفارغ فقط
async function transferCardToUser(userId, lead){
  if(!userId || !lead) return;
  const lk = lead.card_links || {};
  const hasAny = lead.card_bio || lead.card_logo || (lk && Object.keys(lk).length);
  if(!hasAny) return;
  try{
    await pool.query(
      `UPDATE users SET
         bio           = COALESCE(NULLIF(bio,''), $2),
         profile_image = COALESCE(profile_image, $3),
         instagram     = COALESCE(NULLIF(instagram,''), $4),
         snapchat      = COALESCE(NULLIF(snapchat,''), $5),
         tiktok        = COALESCE(NULLIF(tiktok,''), $6),
         twitter       = COALESCE(NULLIF(twitter,''), $7),
         website       = COALESCE(NULLIF(website,''), $8),
         location_url  = COALESCE(NULLIF(location_url,''), $9)
       WHERE id=$1`,
      [userId, lead.card_bio||null, lead.card_logo||null, lk.instagram||null, lk.snapchat||null,
       lk.tiktok||null, lk.twitter||null, lk.website||null, lk.maps||null]
    );
  }catch(e){ console.error('card→profile transfer:', e.message); }
}

// نقاط الأولوية: تقييم عالٍ + مراجعات كثيرة + بلا موقع = صيد ثمين
function scoreLead(l){
  let s = 0;
  const r = parseFloat(l.rating) || 0;
  const rc = parseInt(l.reviews_count) || 0;
  if(r >= 4.5) s += 35; else if(r >= 4.0) s += 25; else if(r >= 3.5) s += 12;
  if(rc >= 50) s += 30; else if(rc >= 20) s += 22; else if(rc >= 5) s += 12; else if(rc > 0) s += 5;
  if(!l.website) s += 20;           // بلا موقع → يحتاج قناة عملاء
  if(l.phone_norm) s += 15;         // رقم صالح
  return Math.min(100, s);
}

function requirePermission(perm){
  return [auth, adminOnly, loadAdmin, function(req,res,next){
    if(!hasPerm(req.adminPerms, perm)) return res.status(403).json({ message:'ليس لديك صلاحية لهذا الإجراء' });
    next();
  }];
}
// يمنع التصرّف على من هو أعلى أو مساوٍ في الرتبة (إلا المالك)
function canActOn(actor, targetLevel){
  if(actor.email===OWNER_EMAIL) return true;
  return (actor.admin_level||0) > (targetLevel||0);
}
async function guardUserTarget(req, targetId){
  const t = await pool.query('SELECT email, role, admin_level FROM users WHERE id=$1', [targetId]);
  if(!t.rows.length) return { code:404, message:'غير موجود' };
  const tg = t.rows[0];
  if(tg.email===OWNER_EMAIL && req.adminUser.email!==OWNER_EMAIL) return { code:403, message:'لا يمكن المساس بالمالك' };
  if(tg.role==='admin' && !canActOn(req.adminUser, tg.admin_level)) return { code:403, message:'لا يمكنك التصرّف على مشرف برتبتك أو أعلى' };
  return null;
}

async function notify(userId, title, body, type, refId) {
  try {
    await pool.query('INSERT INTO notifications(user_id,title,body,type,ref_id) VALUES($1,$2,$3,$4,$5)', [userId, title, body, type, refId]);
    const url = (() => {
      if (!type) return '/';
      if (type === 'message') return '/dashboard-client.html#messages';
      if (type === 'bid' || type === 'bid_accepted' || type === 'bid_rejected') return '/dashboard-provider.html#bids';
      if (type === 'new_request') return '/dashboard-provider.html';
      if (type === 'request' || type === 'request_published') return '/dashboard-client.html';
      if (type === 'review') return '/';
      if (type === 'new_question') return '/dashboard-client.html';
      if (type === 'question_answered') return '/';
      return '/';
    })();
    sendPush(userId, title, body, url, type, refId).catch(() => {});
    wsBroadcast(userId, { type: 'notification', notif: { title, body, ntype: type, ref_id: refId, url, created_at: new Date().toISOString() } });
  } catch(e) { console.error('Notification error:', e); }
}

async function notifyWithEmail(userId, title, body, type, refId, emailSubject, emailBody, btnText, btnUrl) {
  await notify(userId, title, body, type, refId);
  try {
    const u = await pool.query('SELECT email, name FROM users WHERE id=$1', [userId]);
    if (u.rows.length && u.rows[0].email) {
      sendEmail(u.rows[0].email, emailSubject||title, emailTpl(title, emailBody.replace(/\{name\}/g, u.rows[0].name||''), btnText, btnUrl||SITE_URL)).catch(() => {});
    }
  } catch(e) { console.error('notifyWithEmail email part:', e.message); }
}

/* ═══════════ محرّك التذكيرات المجدولة (Push + Email، مرّة واحدة لكل حالة) ═══════════ */
async function _remindOnce(userId, kind, refId, title, body, emailSubject, emailBody, btnText, btnUrl){
  try{
    const ins = await pool.query(
      `INSERT INTO reminders_log(user_id, kind, ref_id) VALUES($1,$2,$3) ON CONFLICT (user_id, kind, ref_id) DO NOTHING RETURNING id`,
      [userId, kind, refId||0]
    );
    if(!ins.rows.length) return false; // أُرسل سابقاً
    await notifyWithEmail(userId, title, body, 'reminder', refId, emailSubject, emailBody, btnText, btnUrl);
    return true;
  }catch(e){ console.error('_remindOnce '+kind+':', e.message); return false; }
}
async function runReminders(){
  try{
    const dOffers = Math.max(0, parseInt(await getSetting('rem_offers_days','2'))||2);
    const dDeal   = Math.max(0, parseInt(await getSetting('rem_deal_days','5'))||5);
    const dReview = Math.max(0, parseInt(await getSetting('rem_review_days','1'))||1);
    const dProfile= Math.max(0, parseInt(await getSetting('rem_profile_days','1'))||1);
    const on = async (k)=> (await getSetting('rem_'+k+'_on','1'))!=='0';
    // 1) عميل عنده عروض ولم يختر
    if(await on('offers')){
    const r1 = await pool.query(
      `SELECT r.id, r.client_id, r.title, COUNT(b.id) AS bids
       FROM requests r JOIN bids b ON b.request_id=r.id
       WHERE r.status='open' AND r.assigned_provider_id IS NULL
         AND r.created_at <= NOW() - ($1 || ' days')::interval
       GROUP BY r.id, r.client_id, r.title HAVING COUNT(b.id) > 0`, [String(dOffers)]);
    for(const x of r1.rows){
      await _remindOnce(x.client_id, 'offers_waiting', x.id,
        'عندك عروض بانتظارك 🎯', `وصلك ${x.bids} عرض على "${x.title}" — قارن واختر الأنسب`,
        'عروض بانتظار اختيارك', `<p>وصلك <strong>${x.bids}</strong> عرض على مشروعك "<strong>${x.title}</strong>".</p><p>ادخل الآن، قارن العروض، واختر الأنسب لك.</p>`,
        'استعراض العروض', SITE_URL+'/dashboard-client.html');
    }}
    // 2) اختار مزوّداً ولم تُتمّ الصفقة
    if(await on('deal')){
    const r2 = await pool.query(
      `SELECT id, client_id, title FROM requests
       WHERE assigned_provider_id IS NOT NULL AND completed_at IS NULL
         AND assigned_at <= NOW() - ($1 || ' days')::interval AND status NOT IN ('completed','cancelled')`, [String(dDeal)]);
    for(const x of r2.rows){
      await _remindOnce(x.client_id, 'complete_deal', x.id,
        'أتمم صفقتك ✅', `مشروعك "${x.title}" ما زال قيد التنفيذ — تابع مع المزوّد لإتمامه`,
        'أتمم صفقتك', `<p>مشروعك "<strong>${x.title}</strong>" ما زال مفتوحاً.</p><p>تابع مع المزوّد، أكمل الصفقة، ثم قيّمه ليستفيد غيرك.</p>`,
        'متابعة المشروع', SITE_URL+'/dashboard-client.html');
    }}
    // 3) صفقة تمّت ولم يقيّم العميل
    if(await on('review')){
    const r3 = await pool.query(
      `SELECT r.id, r.client_id, r.title FROM requests r
       WHERE r.completed_at IS NOT NULL AND r.completed_at <= NOW() - ($1 || ' days')::interval
         AND NOT EXISTS (SELECT 1 FROM reviews rv WHERE rv.request_id=r.id AND rv.reviewer_id=r.client_id)`, [String(dReview)]);
    for(const x of r3.rows){
      await _remindOnce(x.client_id, 'review_reminder', x.id,
        'قيّم المزوّد ⭐', `كيف كانت تجربتك في "${x.title}"؟ أضف تقييمك الآن`,
        'رأيك يهمّنا', `<p>أنهيت مشروع "<strong>${x.title}</strong>".</p><p>قيّم المزوّد ليساعد غيرك على الاختيار الصحيح — دقيقة واحدة تكفي.</p>`,
        'أضف تقييمك', SITE_URL+'/dashboard-client.html');
    }}
    // 4) مزوّد ملفه ناقص
    if(await on('profile')){
    const r4 = await pool.query(
      `SELECT id FROM users WHERE role='provider' AND created_at <= NOW() - ($1 || ' days')::interval
        AND (bio IS NULL OR bio='' OR profile_image IS NULL
             OR specialties IS NULL OR array_length(specialties,1) IS NULL
             OR portfolio_images IS NULL OR array_length(portfolio_images,1) IS NULL)`, [String(dProfile)]);
    for(const x of r4.rows){
      await _remindOnce(x.id, 'complete_profile', 0,
        'أكمل ملفك التعريفي 🚀', 'الملف المكتمل يجذب فرصاً أكثر — أضف نبذتك وأعمالك وتخصصاتك',
        'أكمل ملفك لتحصل على فرص أكثر', `<p>المزوّدون بملفات مكتملة يحصلون على <strong>عروض وفرص أكثر بكثير</strong>.</p><p>أضف صورتك، نبذتك، تخصصاتك، ومعرض أعمالك الآن لتبرز أمام العملاء.</p>`,
        'أكمل ملفي', SITE_URL+'/dashboard-provider.html');
    }}

    /* ═══ دورة حياة المشروع (أتمتة) ═══ */
    // أ) مشروع بعروض ولم يُختر: تنبيه قبل الإغلاق ثم إغلاق تلقائي
    if((await getSetting('lc_close_on','1'))!=='0'){
      const closeDays = Math.max(1, parseInt(await getSetting('lc_close_days','20'))||20);
      const warnBefore = Math.max(0, parseInt(await getSetting('lc_close_warn','2'))||2);
      // تنبيه قبل الإغلاق
      if(warnBefore>0){
        const w = await pool.query(
          `SELECT id, client_id, title FROM requests
           WHERE status='open' AND assigned_provider_id IS NULL
             AND created_at <= NOW() - (($1-$2) || ' days')::interval
             AND created_at >  NOW() - ($1 || ' days')::interval`, [String(closeDays), String(warnBefore)]);
        for(const x of w.rows){
          await _remindOnce(x.client_id, 'close_warn', x.id,
            'مشروعك على وشك الإغلاق ⏰', `سيُغلق "${x.title}" تلقائياً بعد ${warnBefore} يوم — بادر باختيار عرض`,
            'بادر قبل إغلاق مشروعك', `<p>مشروعك "<strong>${x.title}</strong>" سيُغلق تلقائياً خلال <strong>${warnBefore} يوم</strong> لعدم اختيار عرض.</p><p>ادخل الآن واختر الأنسب قبل فوات الفرصة.</p>`,
            'اختر عرضاً الآن', SITE_URL+'/dashboard-client.html');
        }
      }
      // الإغلاق الفعلي
      const cl = await pool.query(
        `UPDATE requests SET status='closed_auto'
         WHERE status='open' AND assigned_provider_id IS NULL
           AND created_at <= NOW() - ($1 || ' days')::interval
         RETURNING id, client_id, title`, [String(closeDays)]);
      for(const x of cl.rows){
        try{ await notify(x.client_id, 'أُغلق مشروعك', `أُغلق "${x.title}" تلقائياً لعدم اختيار عرض خلال المدة`, 'request', x.id); }catch(e){}
      }
      if(cl.rows.length) console.log(`[lifecycle] أُغلق ${cl.rows.length} مشروع تلقائياً`);
    }

    // ب) مشروع اختير مزوّده ولم يُتمّ: طلب تأكيد (موافقة ضمنية)
    if((await getSetting('lc_confirm_on','1'))!=='0'){
      const confirmDays = Math.max(1, parseInt(await getSetting('lc_confirm_days','20'))||20);
      const graceDays   = Math.max(1, parseInt(await getSetting('lc_confirm_grace','3'))||3);
      // 1) اطلب التأكيد (مرّة)، وسجّل وقت الطلب
      const ask = await pool.query(
        `SELECT id, client_id, title FROM requests
         WHERE assigned_provider_id IS NOT NULL AND completed_at IS NULL
           AND status NOT IN ('completed','cancelled','closed_auto','archived_auto')
           AND (confirm_requested_at IS NULL)
           AND assigned_at <= NOW() - ($1 || ' days')::interval`, [String(confirmDays)]);
      for(const x of ask.rows){
        try{
          await pool.query(`UPDATE requests SET confirm_requested_at=NOW() WHERE id=$1`, [x.id]);
          await notifyWithEmail(x.client_id, 'هل تمّ تنفيذ مشروعك؟', `أكّد إن كان "${x.title}" قد نُفّذ`, 'request', x.id,
            'أكّد إتمام مشروعك ✅', `<p>مشروعك "<strong>${x.title}</strong>" مع المزوّد المختار.</p><p>هل تمّ التنفيذ؟ ادخل وأكّد — وإن لم ترد خلال ${graceDays} أيام سنعتبره منتهياً تلقائياً.</p>`,
            'تأكيد الإتمام', SITE_URL+'/dashboard-client.html');
        }catch(e){}
      }
      // 2) بعد مهلة السماح بلا رد → منتهٍ بموافقة ضمنية
      const done = await pool.query(
        `UPDATE requests SET status='completed', completed_at=NOW(), auto_completed=TRUE
         WHERE assigned_provider_id IS NOT NULL AND completed_at IS NULL
           AND confirm_requested_at IS NOT NULL
           AND confirm_requested_at <= NOW() - ($1 || ' days')::interval
           AND status NOT IN ('completed','cancelled','closed_auto','archived_auto')
         RETURNING id, client_id, assigned_provider_id, title`, [String(graceDays)]);
      for(const x of done.rows){
        try{ await notify(x.client_id, 'اكتمل مشروعك', `اعتُبر "${x.title}" منتهياً — لا تنسَ تقييم المزوّد`, 'request', x.id); }catch(e){}
        try{ if(x.assigned_provider_id){ await notify(x.assigned_provider_id, 'اكتمل المشروع', `اكتمل "${x.title}"`, 'request', x.id); await recomputeProviderTier(x.assigned_provider_id); } }catch(e){}
      }
      if(done.rows.length) console.log(`[lifecycle] اكتمل ${done.rows.length} مشروع بموافقة ضمنية`);
    }

    /* ═══ المرحلة ٢: تنشيط المزوّد الخامل ═══ */
    // ج) مزوّد لم يدخل منذ مدة (اعتماداً على آخر ظهور)
    if((await getSetting('react_inactive_on','1'))!=='0'){
      const inDays = Math.max(1, parseInt(await getSetting('react_inactive_days','30'))||30);
      const col = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('last_seen_at','last_login_at','updated_at')`);
      const names = col.rows.map(r=>r.column_name);
      const seenCol = names.includes('last_seen_at')?'last_seen_at':(names.includes('last_login_at')?'last_login_at':(names.includes('updated_at')?'updated_at':null));
      if(seenCol){
        const inactive = await pool.query(
          `SELECT id FROM users WHERE role='provider'
             AND ${seenCol} IS NOT NULL AND ${seenCol} <= NOW() - ($1 || ' days')::interval
             AND ${seenCol} > NOW() - (($1::int + 14) || ' days')::interval`, [String(inDays)]);
        for(const x of inactive.rows){
          await _remindOnce(x.id, 'react_inactive_'+Math.floor(Date.now()/(14*86400000)), x.id,
            'اشتقنا لك 👋', 'فيه فرص ومشاريع جديدة تناسب تخصصك — ادخل وقدّم عروضك',
            'فرص جديدة بانتظارك', `<p>مضى وقت منذ آخر زيارة لك.</p><p>ظهرت مشاريع جديدة تناسب تخصصك — ادخل الآن وقدّم عروضك قبل أن تفوتك.</p>`,
            'تصفّح المشاريع', SITE_URL+'/dashboard-provider.html');
        }
      }
    }
    // د) مزوّد لم يقدّم أي عرض منذ مدة رغم وجود فرص
    if((await getSetting('react_nobids_on','1'))!=='0'){
      const nbDays = Math.max(1, parseInt(await getSetting('react_nobids_days','21'))||21);
      const nobids = await pool.query(
        `SELECT u.id FROM users u
         WHERE u.role='provider' AND u.created_at <= NOW() - ($1 || ' days')::interval
           AND NOT EXISTS (SELECT 1 FROM bids b WHERE b.provider_id=u.id AND b.created_at > NOW() - ($1 || ' days')::interval)
           AND EXISTS (SELECT 1 FROM requests r WHERE r.status='open' AND r.created_at > NOW() - INTERVAL '14 days')`, [String(nbDays)]);
      for(const x of nobids.rows){
        await _remindOnce(x.id, 'react_nobids_'+Math.floor(Date.now()/(21*86400000)), x.id,
          'لا تفوّت الفرص 🎯', 'مشاريع مفتوحة تنتظر عروضك — كل عرض فرصة لعميل جديد',
          'مشاريع تنتظر عروضك', `<p>يوجد مشاريع مفتوحة تناسب مجالك ولم تقدّم عليها عروضاً.</p><p>كلّما قدّمت أكثر، زادت فرصك في الفوز بعملاء جدد.</p>`,
          'قدّم عرضك الآن', SITE_URL+'/dashboard-provider.html');
      }
    }

    /* ═══ المرحلة ٣: جودة وثقة ═══ */
    // هـ) طلب لم يصله أي عرض بعد مدة → نصيحة تحسين الوصف للعميل
    if((await getSetting('q_nooffers_on','1'))!=='0'){
      const noDays = Math.max(1, parseInt(await getSetting('q_nooffers_days','3'))||3);
      const noOffers = await pool.query(
        `SELECT r.id, r.client_id, r.title FROM requests r
         WHERE r.status='open' AND r.assigned_provider_id IS NULL
           AND r.created_at <= NOW() - ($1 || ' days')::interval
           AND NOT EXISTS (SELECT 1 FROM bids b WHERE b.request_id=r.id)`, [String(noDays)]);
      for(const x of noOffers.rows){
        await _remindOnce(x.client_id, 'no_offers', x.id,
          'لم تصلك عروض بعد 💡', `حسّن وصف "${x.title}" (تفاصيل، ميزانية، صور) لجذب عروض أفضل`,
          'اجعل طلبك يجذب العروض', `<p>مشروعك "<strong>${x.title}</strong>" لم تصله عروض حتى الآن.</p><p>أضف تفاصيل أوضح، ميزانية تقديرية، وصوراً — الطلبات الواضحة تحصل على عروض أسرع وأفضل.</p>`,
          'تحسين الطلب', SITE_URL+'/dashboard-client.html');
      }
    }
    // و) مزوّد تقييمه منخفض → تنبيه لطيف لتحسين الخدمة
    if((await getSetting('q_lowrating_on','1'))!=='0'){
      const thr = parseFloat(await getSetting('q_lowrating_threshold','3.0'))||3.0;
      const minR = Math.max(1, parseInt(await getSetting('q_lowrating_min','3'))||3);
      const low = await pool.query(
        `SELECT u.id FROM users u
         WHERE u.role='provider' AND COALESCE(u.review_count,0) >= $2
           AND COALESCE(u.avg_rating,0) > 0 AND COALESCE(u.avg_rating,0) < $1`, [String(thr), minR]);
      for(const x of low.rows){
        await _remindOnce(x.id, 'low_rating_'+Math.floor(Date.now()/(30*86400000)), x.id,
          'لنرتقِ بخدمتك ⭐', 'تقييمك الحالي أقل من المتوسط — تحسين التواصل والالتزام يرفع تقييمك وفرصك',
          'نصائح لرفع تقييمك', `<p>تقييمك الحالي أقل من المتوسط. لا تقلق — يمكن تحسينه بسرعة:</p><p>التزم بالمواعيد، تواصل بوضوح، واحرص على جودة التنفيذ. تقييم أعلى = عملاء أكثر.</p>`,
          'تحسين ملفي', SITE_URL+'/dashboard-provider.html');
      }
    }

    // ط) ملخّص أسبوعي للمزوّد (فرص مطابقة + عروضه)
    if((await getSetting('provider_weekly_on','1'))!=='0'){
      const weekKey = Math.floor(Date.now()/(7*86400000));
      const provs = await pool.query(
        `SELECT id, COALESCE(notify_categories, specialties) AS cats, city FROM users WHERE role='provider' AND is_active=TRUE`);
      for(const p of provs.rows){
        try{
          const cats = Array.isArray(p.cats)?p.cats:[];
          const opp = await pool.query(
            `SELECT COUNT(*) c FROM requests r
             WHERE r.status='open' AND r.assigned_provider_id IS NULL
               AND r.created_at > NOW() - INTERVAL '7 days'
               AND ($1::text[] IS NULL OR array_length($1::text[],1) IS NULL OR r.category = ANY($1::text[]))
               AND ($2::text IS NULL OR r.city IS NULL OR r.city = $2)`,
            [cats.length?cats:null, p.city||null]);
          const cnt = parseInt(opp.rows[0].c)||0;
          if(cnt<=0) continue;
          await _remindOnce(p.id, 'weekly_'+weekKey, p.id,
            '📊 ملخّصك الأسبوعي', `${cnt} مشروع جديد يناسب تخصصك هذا الأسبوع — بادر بتقديم عروضك`,
            'فرص هذا الأسبوع تناسبك', `<p>هذا الأسبوع ظهر <strong>${cnt}</strong> مشروع جديد يناسب تخصصك${p.city?(' في '+p.city):''}.</p><p>سارع بتقديم عروضك — المبادرة المبكرة ترفع فرص الفوز.</p>`,
            'تصفّح المشاريع', SITE_URL+'/dashboard-provider.html');
        }catch(e){}
      }
    }

    /* ═══ تذكيرات إضافية ═══ */
    // ي) تذكير العميل بالرد على أسئلة المزودين
    if((await getSetting('qa_answer_on','1'))!=='0'){
      const qDays = Math.max(1, parseInt(await getSetting('qa_answer_days','2'))||2);
      const qs = await pool.query(
        `SELECT DISTINCT r.client_id, r.id AS rid, r.title, COUNT(q.id) AS cnt
         FROM request_questions q JOIN requests r ON r.id=q.request_id
         WHERE q.answer IS NULL AND q.created_at <= NOW() - ($1 || ' days')::interval
           AND r.status NOT IN ('completed','cancelled','closed_auto')
         GROUP BY r.client_id, r.id, r.title`, [String(qDays)]);
      for(const x of qs.rows){
        await _remindOnce(x.client_id, 'answer_q', x.rid,
          'لديك أسئلة بانتظار ردّك ❓', `${x.cnt} سؤال على "${x.title}" — ردّك يساعدك تحصل على عروض أدق`,
          'أسئلة بانتظار ردّك', `<p>وصلك <strong>${x.cnt}</strong> سؤال من المزوّدين على مشروعك "<strong>${x.title}</strong>".</p><p>الرد السريع يوضّح طلبك ويجذب عروضاً أفضل.</p>`,
          'الرد على الأسئلة', SITE_URL+'/dashboard-client.html');
      }
    }
    // ك) تذكير المزوّد بعرضه المعلّق منذ مدة (متابعة)
    if((await getSetting('bid_followup_on','1'))!=='0'){
      const bDays = Math.max(1, parseInt(await getSetting('bid_followup_days','7'))||7);
      const pend = await pool.query(
        `SELECT b.id AS bid_id, b.provider_id, r.title
         FROM bids b JOIN requests r ON r.id=b.request_id
         WHERE b.status='pending' AND r.status='open' AND r.assigned_provider_id IS NULL
           AND b.created_at <= NOW() - ($1 || ' days')::interval`, [String(bDays)]);
      for(const x of pend.rows){
        await _remindOnce(x.provider_id, 'bid_followup', x.bid_id,
          'تابع عرضك 💬', `عرضك على "${x.title}" لا يزال قيد المراجعة — تواصل مع العميل لتحسين فرصك`,
          'تابع عرضك المعلّق', `<p>عرضك على "<strong>${x.title}</strong>" لم يُبتّ فيه بعد.</p><p>بادر بالتواصل مع العميل عبر المحادثة أو حسّن عرضك — المتابعة ترفع فرص القبول.</p>`,
          'فتح المحادثة', SITE_URL+'/dashboard-provider.html');
      }
    }

    /* ═══ المرحلة ٤: ملخّص الأدمن + تنبيهات الشذوذ ═══ */
    // ز) ملخّص يومي للأدمن (مرّة كل يوم)
    if((await getSetting('admin_summary_on','1'))!=='0'){
      const dayKey = String(Math.floor(Date.now()/86400000));
      if(await getSetting('admin_summary_lastday','') !== dayKey){
        await setSetting('admin_summary_lastday', dayKey);
        const q=(s)=>pool.query(s);
        const [np, nc, npr, nb, nComp, cAuto] = await Promise.all([
          q(`SELECT COUNT(*) c FROM requests WHERE created_at > NOW() - INTERVAL '1 day'`),
          q(`SELECT COUNT(*) c FROM users WHERE role='client' AND created_at > NOW() - INTERVAL '1 day'`),
          q(`SELECT COUNT(*) c FROM users WHERE role='provider' AND created_at > NOW() - INTERVAL '1 day'`),
          q(`SELECT COUNT(*) c FROM bids WHERE created_at > NOW() - INTERVAL '1 day'`),
          q(`SELECT COUNT(*) c FROM requests WHERE completed_at > NOW() - INTERVAL '1 day'`),
          q(`SELECT COUNT(*) c FROM requests WHERE status='closed_auto' AND created_at > NOW() - INTERVAL '2 days'`)
        ]);
        const n=r=>parseInt(r.rows[0].c)||0;
        const html = emailTpl('ملخّص مناقصة اليومي',
          `<p>ملخّص آخر ٢٤ ساعة:</p>
           <ul style="line-height:2;font-size:15px">
             <li>مشاريع جديدة: <strong>${n(np)}</strong></li>
             <li>تسجيل عملاء: <strong>${n(nc)}</strong></li>
             <li>تسجيل مزوّدين: <strong>${n(npr)}</strong></li>
             <li>عروض مقدّمة: <strong>${n(nb)}</strong></li>
             <li>مشاريع مكتملة: <strong>${n(nComp)}</strong></li>
             <li>مشاريع أُغلقت تلقائياً: <strong>${n(cAuto)}</strong></li>
           </ul>`, 'فتح لوحة الأدمن', SITE_URL+'/dashboard-admin.html');
        const admins = await pool.query(`SELECT email FROM users WHERE role='admin' AND email IS NOT NULL`);
        for(const a of admins.rows){ if(a.email) sendEmail(a.email, '📊 ملخّص مناقصة اليومي', html).catch(()=>{}); }
      }
    }
    // ح) كشف شذوذ: طفرة تسجيلات في ساعة (احتمال حسابات وهمية)
    if((await getSetting('admin_anomaly_on','1'))!=='0'){
      const thr = Math.max(3, parseInt(await getSetting('admin_anomaly_threshold','15'))||15);
      const spike = await pool.query(`SELECT COUNT(*) c FROM users WHERE created_at > NOW() - INTERVAL '1 hour'`);
      const cnt = parseInt(spike.rows[0].c)||0;
      if(cnt >= thr){
        const hourKey = String(Math.floor(Date.now()/3600000));
        if(await getSetting('admin_anomaly_lasthour','') !== hourKey){
          await setSetting('admin_anomaly_lasthour', hourKey);
          const admins = await pool.query(`SELECT id, email FROM users WHERE role='admin'`);
          for(const a of admins.rows){
            try{ await notify(a.id, '⚠️ تنبيه: طفرة تسجيلات', `تم تسجيل ${cnt} حساب خلال ساعة — يُنصح بالمراجعة`, 'system', 0); }catch(e){}
            if(a.email) sendEmail(a.email, '⚠️ تنبيه شذوذ في التسجيلات', emailTpl('طفرة تسجيلات غير معتادة', `<p>تم تسجيل <strong>${cnt}</strong> حساب خلال الساعة الماضية.</p><p>قد تكون حسابات وهمية — يُنصح بمراجعة المستخدمين الجدد.</p>`, 'مراجعة المستخدمين', SITE_URL+'/dashboard-admin.html')).catch(()=>{});
          }
        }
      }
    }
  }catch(e){ console.error('runReminders:', e.message); }
}
setInterval(runReminders, 6*60*60*1000); // كل 6 ساعات
setTimeout(runReminders, 60000);          // مرّة بعد دقيقة من الإقلاع


function normalizeStatus(s) { return s === 'review' ? 'pending_review' : s; }

// ═══ مستوى المزود (tier) — مستنتج من الصفقات المكتملة، منفصل عن badge اليدوي ═══
function tierFromCompleted(n){ n=parseInt(n)||0; if(n>=25) return 'expert'; if(n>=10) return 'distinguished'; if(n>=3) return 'active'; return 'new'; }
const TIER_LABELS = { new:'مزود جديد', active:'مزود نشط', distinguished:'مزود مميّز', expert:'خبير معتمد' };
const TIER_RANK = { new:0, active:1, distinguished:2, expert:3 };
async function recomputeProviderTier(providerId){
  try{
    if(!providerId) return;
    const cur = await pool.query("SELECT tier, tier_locked FROM users WHERE id=$1 AND role='provider'", [providerId]);
    if(!cur.rows.length) return;
    if(cur.rows[0].tier_locked) return; // مستوى مثبّت يدوياً — لا يُعاد حسابه
    const oldTier = cur.rows[0].tier || 'new';
    const c = await pool.query("SELECT COUNT(*)::int AS n FROM requests WHERE assigned_provider_id=$1 AND status='completed'", [providerId]);
    const newTier = tierFromCompleted(c.rows[0] && c.rows[0].n);
    if(newTier === oldTier) return;
    await pool.query("UPDATE users SET tier=$1 WHERE id=$2 AND role='provider'", [newTier, providerId]);
    // إشعار ترقية فقط عند ارتقاء فعلي لأعلى
    if((TIER_RANK[newTier]||0) > (TIER_RANK[oldTier]||0)){
      try{ await notify(providerId, 'مبروك! ارتقيت لمستوى جديد', 'وصلت إلى مستوى «'+(TIER_LABELS[newTier]||newTier)+'» — يظهر الآن للعملاء على عروضك ويرفع ترتيبك.', 'tier_up', null); }catch(e){}
    }
  }catch(e){ console.error('recomputeProviderTier:', e.message); }
}

function generateProjectNumber() {
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dy = String(d.getDate()).padStart(2,'0');
  return `MNQ-${y}${m}${dy}-${Math.floor(Math.random()*9999).toString().padStart(4,'0')}`;
}

// ═══ AUTH MIDDLEWARE ═══
function auth(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'جلسة منتهية' }); }
}
// مصادقة اختيارية: تقرأ المستخدم إن وُجد التوكن، بدون رفض الطلب
function optionalAuth(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (token) { try { req.user = jwt.verify(token, JWT_SECRET); } catch(e) {} }
  next();
}
function adminOnly(req, res, next) { if (req.user.role !== 'admin') return res.status(403).json({ message: 'للمدير فقط' }); next(); }
function clientOnly(req, res, next) { if (req.user.role !== 'client') return res.status(403).json({ message: 'للعملاء فقط' }); next(); }
function providerOnly(req, res, next) { if (req.user.role !== 'provider') return res.status(403).json({ message: 'لمزودي الخدمة فقط' }); next(); }

// ═══ DATABASE SETUP ═══
async function setupDatabase() {
  console.log('🔄 Setting up database...');
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255), password_hash VARCHAR(255), phone VARCHAR(20), role VARCHAR(20) NOT NULL CHECK (role IN ('client','provider','admin')), specialties TEXT[], notify_categories TEXT[], bio TEXT, city VARCHAR(100), badge VARCHAR(50) DEFAULT 'none', is_active BOOLEAN DEFAULT TRUE, experience_years INTEGER, portfolio_images TEXT[], profile_image TEXT, report_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS requests (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES users(id), title VARCHAR(255) NOT NULL, description TEXT NOT NULL, category VARCHAR(100), city VARCHAR(100), address TEXT, budget_max DECIMAL(10,2), deadline DATE, image_url TEXT, images TEXT[], attachments JSONB, main_image_index INTEGER DEFAULT 0, project_number VARCHAR(50), status VARCHAR(20) DEFAULT 'pending_review', assigned_provider_id INTEGER REFERENCES users(id), assigned_at TIMESTAMP, completed_at TIMESTAMP, admin_notes TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS bids (id SERIAL PRIMARY KEY, request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE, provider_id INTEGER REFERENCES users(id), price INTEGER NOT NULL, days INTEGER NOT NULL, note TEXT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW(), UNIQUE(request_id, provider_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE, sender_id INTEGER REFERENCES users(id), receiver_id INTEGER REFERENCES users(id), content TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS reviews (id SERIAL PRIMARY KEY, request_id INTEGER REFERENCES requests(id), reviewer_id INTEGER REFERENCES users(id), reviewed_id INTEGER REFERENCES users(id), rating INTEGER CHECK (rating BETWEEN 1 AND 5), comment TEXT, type VARCHAR(30), created_at TIMESTAMP DEFAULT NOW(), UNIQUE(request_id, reviewer_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, title VARCHAR(255), body TEXT, type VARCHAR(50), ref_id INTEGER, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS admin_logs (id SERIAL PRIMARY KEY, admin_id INTEGER, admin_name VARCHAR(120), action VARCHAR(60), target_type VARCHAR(40), target_id INTEGER, details TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS platform_settings (key VARCHAR(60) PRIMARY KEY, value TEXT, updated_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`INSERT INTO platform_settings (key, value) VALUES ('review_minutes','5') ON CONFLICT (key) DO NOTHING`);
    await pool.query(`CREATE TABLE IF NOT EXISTS reports (id SERIAL PRIMARY KEY, reporter_id INTEGER REFERENCES users(id), reported_id INTEGER REFERENCES users(id), request_id INTEGER REFERENCES requests(id), type VARCHAR(50) NOT NULL, reason VARCHAR(255) NOT NULL, details TEXT, status VARCHAR(20) DEFAULT 'pending', admin_note TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS favorites (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id, provider_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS push_tokens (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, token TEXT NOT NULL, platform VARCHAR(20), created_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id, token))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS reminders_log (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, kind VARCHAR(40), ref_id INTEGER DEFAULT 0, sent_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id, kind, ref_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS request_questions (id SERIAL PRIMARY KEY, request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE, asker_id INTEGER REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, answer TEXT, answered_at TIMESTAMP, created_at TIMESTAMP DEFAULT NOW())`);
    try { await pool.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS images TEXT[]'); } catch(e){}
    try { await pool.query('ALTER TABLE requests ADD COLUMN IF NOT EXISTS confirm_requested_at TIMESTAMP'); } catch(e){}
    try { await pool.query('ALTER TABLE requests ADD COLUMN IF NOT EXISTS auto_completed BOOLEAN DEFAULT FALSE'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by VARCHAR(40)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_count INTEGER DEFAULT 0'); } catch(e){}

    // ═══ محرّك الاستقطاب: جدول المستهدفين ═══
    try {
      await pool.query(`CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        lead_type VARCHAR(20) NOT NULL DEFAULT 'provider',
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(30),
        phone_norm VARCHAR(20),
        category VARCHAR(100),
        city VARCHAR(80),
        address TEXT,
        rating NUMERIC(2,1),
        reviews_count INTEGER DEFAULT 0,
        website VARCHAR(300),
        place_id VARCHAR(200) UNIQUE,
        score INTEGER DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        notes TEXT,
        matched_request_id INTEGER,
        contacted_at TIMESTAMP,
        replied_at TIMESTAMP,
        converted_user_id INTEGER,
        converted_at TIMESTAMP,
        followup_at TIMESTAMP,
        contact_count INTEGER DEFAULT 0,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`);
      await pool.query('CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_leads_phone_norm ON leads(phone_norm)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_leads_type_city ON leads(lead_type, city)');
      try { await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS tag VARCHAR(20)"); } catch(e){}
      try { await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS maybe_user_id INTEGER"); } catch(e){}
      try { await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS maybe_at TIMESTAMP"); } catch(e){}
      try { await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS card_token VARCHAR(24) UNIQUE"); } catch(e){}
      try { await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS card_bio TEXT"); } catch(e){}
      try { await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS card_logo TEXT"); } catch(e){}
      try { await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS card_links JSONB"); } catch(e){}
      try { await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS card_published BOOLEAN DEFAULT true"); } catch(e){}
      try { await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS card_views INTEGER DEFAULT 0"); } catch(e){}
      try { await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS card_updated_at TIMESTAMP"); } catch(e){}
      try { await pool.query("CREATE INDEX IF NOT EXISTS idx_leads_card_token ON leads(card_token)"); } catch(e){}
    } catch(e){ console.error('leads table:', e.message); }
    try { await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE'); } catch(e){}
    try { await pool.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS receiver_id INTEGER'); } catch(e){}
    try { await pool.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS provider_reply TEXT'); } catch(e){}
    try { await pool.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reply_at TIMESTAMP'); } catch(e){}
    try { await pool.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_level INTEGER DEFAULT 0'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_role VARCHAR(40)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB'); } catch(e){}
    try {
      // توافق رجعي: أي أدمن حالي بدون دور => أدمن كامل بصلاحيات كاملة
      await pool.query(`UPDATE users SET admin_role=COALESCE(admin_role,'super_admin'), admin_level=COALESCE(NULLIF(admin_level,0),90), permissions=COALESCE(permissions,'["*"]'::jsonb) WHERE role='admin'`);
      // المالك المحمي — أعلى رتبة لا تُمَس
      await pool.query(`UPDATE users SET role='admin', admin_role='super_admin', admin_level=100, permissions='["*"]'::jsonb WHERE email=$1`, ['wled-111@hotmail.com']);
    } catch(e){ console.error('seed owner:', e.message); }
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_bumped_at TIMESTAMP'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP'); } catch(e){}
    try { await pool.query(`CREATE TABLE IF NOT EXISTS request_timeline (id SERIAL PRIMARY KEY, request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE, event VARCHAR(100) NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT NOW())`); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS website VARCHAR(255)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS location_url VARCHAR(500)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS twitter VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS snapchat VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tiktok VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS youtube VARCHAR(255)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)'); } catch(e){}
    try { await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'new'"); } catch(e){}
    try { await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS tier_locked BOOLEAN DEFAULT FALSE"); } catch(e){}
    // حشو/تحديث مستوى كل المزودين تلقائياً من عدد الصفقات المكتملة (مرة عند الإقلاع)
    try { await pool.query(`UPDATE users SET tier = CASE
        WHEN (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') >= 25 THEN 'expert'
        WHEN (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') >= 10 THEN 'distinguished'
        WHEN (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') >= 3 THEN 'active'
        ELSE 'new' END
      WHERE role='provider' AND COALESCE(tier_locked,FALSE)=FALSE`); } catch(e){ console.error('tier backfill:', e.message); }
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS social_whatsapp VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS social_snap VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS social_tiktok VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS social_twitter VARCHAR(100)'); } catch(e){}
    try { await pool.query(`DO $$BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='bids_request_id_provider_id_key') THEN ALTER TABLE bids ADD CONSTRAINT bids_request_id_provider_id_key UNIQUE (request_id, provider_id); END IF;END$$;`); } catch(e){ console.error(' bids unique constraint:', e.message); }
    try { await pool.query(`DO $$BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reviews_request_id_reviewer_id_key') THEN ALTER TABLE reviews ADD CONSTRAINT reviews_request_id_reviewer_id_key UNIQUE (request_id, reviewer_id); END IF;END$$;`); } catch(e){ console.error(' reviews unique constraint:', e.message); }
    console.log('✅ Database setup complete');
  } catch(error) { console.error('Database setup error:', error); }
}
setupDatabase();

// ═══ AUTH ═══
app.post('/api/auth/login', rateLimiter(10, 300000), async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    if ((!email && !phone) || !password) return res.status(400).json({ message: 'البيانات ناقصة' });
    const query = phone ? 'SELECT * FROM users WHERE phone=$1' : 'SELECT * FROM users WHERE email=$1';
    const result = await pool.query(query, [email || phone]);
    if (!result.rows.length) return res.status(400).json({ message: 'البيانات غير صحيحة' });
    const user = result.rows[0];
    if (!user.is_active) return res.status(403).json({ message: 'الحساب موقوف' });
    const storedHash = user.password || user.password_hash || '';
    if (!storedHash) return res.status(400).json({ message: 'كلمة المرور غير مضبوطة' });
    const ok = await bcrypt.compare(password, storedHash);
    if (!ok) return res.status(400).json({ message: 'البيانات غير صحيحة' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    pool.query('UPDATE users SET last_active=NOW() WHERE id=$1', [user.id]).catch(()=>{});
    delete user.password; delete user.password_hash;
    res.json({ user, token });
  } catch(e) { console.error('Login:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/auth/register', rateLimiter(5, 600000), async (req, res) => {
  try {
    const { name, email, phone, password, role, specialties, city, bio } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: 'البيانات ناقصة' });
    if (!['client', 'provider'].includes(role)) return res.status(400).json({ message: 'نوع المستخدم غير صحيح' });
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(400).json({ message: 'الإيميل مستخدم مسبقاً' });
    const hash = await bcrypt.hash(password, 10);
    const specs = role === 'provider' ? (Array.isArray(specialties) ? specialties : (specialties ? [specialties] : null)) : null;
    const notifyCats = role === 'provider' ? (Array.isArray(req.body.notify_categories) ? req.body.notify_categories : specs) : null;
    const isProv = role === 'provider';
    const result = await pool.query(`INSERT INTO users (name, email, phone, password, password_hash, role, specialties, notify_categories, city, bio, business_name, experience_years, website, location_url, instagram, tiktok, snapchat, twitter, youtube, profile_image, portfolio_images, referred_by, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,true,NOW()) RETURNING id, name, email, role, city, badge`, [name, email, phone||null, hash, hash, role, specs, notifyCats, city||null, bio||null, isProv?(req.body.business_name||null):null, isProv?(req.body.experience_years||null):null, isProv?(req.body.website||null):null, isProv?(req.body.location_url||null):null, isProv?(req.body.instagram||null):null, isProv?(req.body.tiktok||null):null, isProv?(req.body.snapchat||null):null, isProv?(req.body.twitter||null):null, isProv?(req.body.youtube||null):null, req.body.profile_image||null, isProv&&Array.isArray(req.body.portfolio_images)?req.body.portfolio_images:null, (typeof req.body.ref==='string'?req.body.ref.slice(0,40):null)]);
    // احتساب الإحالة لصاحب صفحة المزوّد
    try{
      const ref = typeof req.body.ref==='string'?req.body.ref:'';
      const m = ref.match(/^pro(\d+)$/);
      if(m){ await pool.query('UPDATE users SET referral_count = COALESCE(referral_count,0)+1 WHERE id=$1', [parseInt(m[1])]); }
    }catch(e){}
    // محرّك الاستقطاب: رصد التحويل تلقائياً (مطابقة الجوال) + إشارة اسم للمراجعة
    try{
      const uid = result.rows[0].id;
      // ربط مباشر عبر رمز الكرت (مضمون حتى لو سجّل بجوال مختلف)
      const cardToken = typeof req.body.card_token==='string' ? req.body.card_token.trim() : '';
      if(cardToken){
        try{
          const ct = await pool.query(
            `UPDATE leads SET status='converted', converted_user_id=$1, converted_at=NOW(),
               maybe_user_id=NULL, maybe_at=NULL, updated_at=NOW()
             WHERE card_token=$2 AND status<>'converted'
             RETURNING card_bio, card_logo, card_links`, [uid, cardToken]);
          if(ct.rows[0]) await transferCardToUser(uid, ct.rows[0]);
        }catch(e){ console.error('card_token link:', e.message); }
      }
      const pn = normPhone(phone);
      let convertedByPhone = 0;
      if(pn){
        const up = await pool.query(
          `UPDATE leads SET status='converted', converted_user_id=$1, converted_at=NOW(), updated_at=NOW()
           WHERE phone_norm=$2 AND status <> 'converted'`,
          [uid, pn]
        );
        convertedByPhone = up.rowCount || 0;
        // نقل بيانات الكرت إلى ملف المزود الجديد (ملء الفارغ فقط)
        if(convertedByPhone > 0){
          try{
            const cl = await pool.query(
              `SELECT card_bio, card_logo, card_links FROM leads
               WHERE phone_norm=$1 AND converted_user_id=$2
                 AND (card_bio IS NOT NULL OR card_logo IS NOT NULL OR card_links IS NOT NULL)
               ORDER BY card_updated_at DESC NULLS LAST LIMIT 1`, [pn, uid]);
            if(cl.rows[0]) await transferCardToUser(uid, cl.rows[0]);
          }catch(e){ console.error('card transfer (register):', e.message); }
        }
      }
      // إذا ما تحوّل شيء بالجوال، جرّب مطابقة الاسم (إشارة يدوية فقط — لا تحويل تلقائي)
      if(convertedByPhone === 0){
        const regName = (req.body.business_name || name || '').trim();
        if(regName){
          const cityLike = city ? '%' + city.trim() + '%' : null;
          const cand = await pool.query(
            `SELECT id, name FROM leads
             WHERE lead_type='provider' AND status NOT IN ('converted','rejected') AND maybe_user_id IS NULL
               AND ($1::text IS NULL OR city ILIKE $1)
             ORDER BY updated_at DESC LIMIT 500`,
            [cityLike]
          );
          const hits = cand.rows.filter(r => nameSimilar(regName, r.name)).map(r => r.id);
          if(hits.length){
            await pool.query(
              `UPDATE leads SET maybe_user_id=$1, maybe_at=NOW(), updated_at=NOW() WHERE id = ANY($2)`,
              [uid, hits]
            );
          }
        }
      }
    }catch(e){ console.error('lead match:', e.message); }
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    try {
      const isProvider = role === 'provider';
      const welcomeTitle = `🎉 أهلاً بك في منصة مناقصة، ${name}!`;
      const welcomeBody = isProvider
        ? `<p>عزيزي <strong>${name}</strong>،</p><p>أهلاً وسهلاً بك في منصة <strong>مناقصة</strong>.</p><ul style="line-height:2.2;color:#374151"><li>تصفح المشاريع المتاحة</li><li>تقديم عروضك للعملاء</li><li>التواصل المباشر مع العملاء</li></ul><p>أكمل ملفك للحصول على شارة موثّق.</p><p>تواصل: <a href="mailto:cs@manaqasa.com" style="color:#C9920A">cs@manaqasa.com</a></p>`
        : `<p>عزيزي <strong>${name}</strong>،</p><p>أهلاً وسهلاً بك في منصة <strong>مناقصة</strong>.</p><ul style="line-height:2.2;color:#374151"><li>نشر مشاريعك</li><li>استقبال عروض من المزودين</li><li>التواصل المباشر مع المزودين</li></ul><p>تواصل: <a href="mailto:cs@manaqasa.com" style="color:#C9920A">cs@manaqasa.com</a></p>`;
      await notify(user.id, '🎉 أهلاً بك في مناقصة', `مرحباً ${name}! نحن سعداء بانضمامك إلينا.`, 'welcome', null);
      if (email) sendEmail(email, welcomeTitle, emailTpl(welcomeTitle, welcomeBody, isProvider?'استكشف المشاريع':'انشر طلبك الأول', SITE_URL+(isProvider?'/dashboard-provider.html':'/dashboard-client.html'))).catch(()=>{});
    } catch(we) { console.error('welcome notification:', we.message); }
    res.json({ user, token });
  } catch(e) { console.error('Register:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/direct-admin', async (req, res) => {
  try {
    const { secret, email, password } = req.query;
    if (secret !== (process.env.ADMIN_SECRET || 'manaqasa2024')) return res.status(403).json({ message: 'كلمة سر خاطئة' });
    if (!email || !password) return res.status(400).json({ message: 'الإيميل وكلمة المرور مطلوبة' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(`INSERT INTO users (name, email, password, password_hash, role, is_active, created_at) VALUES ('المدير',$1,$2,$3,'admin',true,NOW()) ON CONFLICT (email) DO UPDATE SET password=$2, password_hash=$3, role='admin', is_active=true RETURNING id, name, email, role`, [email, hash, hash]);
    res.json({ ok: true, user: result.rows[0] });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) return res.status(400).json({ message: 'البيانات ناقصة' });
    const r = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const storedHash = r.rows[0].password || r.rows[0].password_hash || '';
    const ok = await bcrypt.compare(old_password, storedHash);
    if (!ok) return res.status(400).json({ message: 'كلمة المرور الحالية غير صحيحة' });
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1, password_hash=$2 WHERE id=$3', [hash, hash, req.user.id]);
    try {
      const u = r.rows[0];
      if (u.email) {
        const title = '🔐 تم تغيير كلمة المرور';
        const body = `<p>عزيزي <strong>${u.name}</strong>،</p><p>تم تغيير كلمة المرور بنجاح.</p><p>إذا لم تقم بهذا الإجراء، تواصل معنا فوراً: <a href="mailto:cs@manaqasa.com" style="color:#C9920A">cs@manaqasa.com</a></p>`;
        sendEmail(u.email, title, emailTpl(title, body, null, null)).catch(()=>{});
      }
    } catch(e) {}
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ ACCOUNT DELETION ═══
app.get('/api/account/deletion-preview', auth, async (req, res) => {
  try {
    const userId = req.user.id; const role = req.user.role; const stats = {};
    if (role === 'client') { const r1 = await pool.query("SELECT COUNT(*)::int as c FROM requests WHERE client_id=$1 AND (category IS DISTINCT FROM 'direct')", [userId]); stats.projects = r1.rows[0].c; }
    if (role === 'provider') {
      const r2 = await pool.query('SELECT COUNT(*)::int as c FROM bids WHERE provider_id=$1', [userId]); stats.bids = r2.rows[0].c;
      const r3 = await pool.query(`SELECT COUNT(*)::int as c FROM requests WHERE assigned_provider_id=$1 AND status='in_progress' AND (category IS DISTINCT FROM 'direct')`, [userId]); stats.active_projects = r3.rows[0].c;
    }
    const r4 = await pool.query('SELECT COUNT(*)::int as c FROM messages WHERE sender_id=$1 OR receiver_id=$1', [userId]); stats.messages = r4.rows[0].c;
    const r5 = await pool.query('SELECT COUNT(*)::int as c FROM reviews WHERE reviewer_id=$1 OR reviewed_id=$1', [userId]); stats.reviews = r5.rows[0].c;
    const r6 = await pool.query('SELECT COUNT(*)::int as c FROM notifications WHERE user_id=$1', [userId]); stats.notifications = r6.rows[0].c;
    res.json({ ok: true, stats, warning: 'سيتم حذف جميع بياناتك نهائياً ولا يمكن استعادتها.' });
  } catch(e) { console.error('deletion-preview:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/account/delete', auth, async (req, res) => {
  try {
    const userId = req.user.id; const role = req.user.role; const { confirmation } = req.body;
    if (confirmation !== 'حذف' && confirmation !== 'DELETE') return res.status(400).json({ message: 'يجب كتابة "حذف" أو "DELETE" للتأكيد', code: 'CONFIRMATION_REQUIRED' });
    if (role === 'admin') return res.status(403).json({ message: 'لا يمكن حذف حسابات الإدارة من التطبيق' });
    if (role === 'provider') {
      const active = await pool.query(`SELECT COUNT(*)::int as c FROM requests WHERE assigned_provider_id=$1 AND status='in_progress' AND (category IS DISTINCT FROM 'direct')`, [userId]);
      if (active.rows[0].c > 0) return res.status(400).json({ message: `لديك ${active.rows[0].c} مشروع قيد التنفيذ. يجب إكمالها أولاً.`, code: 'ACTIVE_PROJECTS' });
    }
    const userInfo = await pool.query('SELECT id, name, email FROM users WHERE id=$1', [userId]);
    if (!userInfo.rows.length) return res.status(404).json({ message: 'الحساب غير موجود' });
    const userName = userInfo.rows[0].name; const userEmail = userInfo.rows[0].email;
    await pool.query('BEGIN');
    try {
      if (role === 'provider') await pool.query('DELETE FROM bids WHERE provider_id=$1', [userId]);
      await pool.query('DELETE FROM reviews WHERE reviewer_id=$1 OR reviewed_id=$1', [userId]);
      await logAdmin(req, 'delete_user', 'user', userId, 'حذف مستخدم');
      await pool.query('DELETE FROM notifications WHERE user_id=$1', [userId]);
      await pool.query('DELETE FROM messages WHERE sender_id=$1 OR receiver_id=$1', [userId]);
      await pool.query('DELETE FROM reports WHERE reporter_id=$1 OR reported_id=$1', [userId]);
      try { await pool.query('DELETE FROM favorites WHERE user_id=$1 OR provider_id=$1', [userId]); } catch(e){}
      try { await pool.query('DELETE FROM push_tokens WHERE user_id=$1', [userId]); } catch(e){}
      if (role === 'client') { const projs = await pool.query('SELECT id FROM requests WHERE client_id=$1', [userId]); for (const p of projs.rows) await pool.query('DELETE FROM bids WHERE request_id=$1', [p.id]); await pool.query('DELETE FROM requests WHERE client_id=$1', [userId]); }
      if (role === 'provider') await pool.query('UPDATE requests SET assigned_provider_id=NULL WHERE assigned_provider_id=$1', [userId]);
      const del = await pool.query('DELETE FROM users WHERE id=$1', [userId]);
      if (del.rowCount === 0) throw new Error('فشل حذف الحساب');
      await pool.query('COMMIT');
      console.log(`🗑️  Account deleted: ${userName} (${userEmail}) [id=${userId}, role=${role}]`);
      if (userEmail && RESEND_KEY) sendEmail(userEmail, 'تم حذف حسابك من منصة مناقصة', emailTpl('تم حذف حسابك', `<p>عزيزي ${userName}،</p><p>تم حذف حسابك من منصة مناقصة بنجاح.</p>`, null, null)).catch(()=>{});
      res.json({ ok: true, message: 'تم حذف حسابك بنجاح. شكراً لاستخدامك منصة مناقصة.' });
    } catch(e) { await pool.query('ROLLBACK'); console.error('account delete transaction:', e); throw e; }
  } catch(e) { console.error('DELETE /api/account/delete:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ PROFILES ═══
app.get('/api/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT id,name,email,phone,role,specialties,notify_categories,bio,city,badge,is_active,experience_years,portfolio_images,profile_image,created_at FROM users WHERE id=$1`, [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/profile', auth, async (req, res) => {
  try {
    if (req.body.profile_image && req.body.profile_image.startsWith('data:')) req.body.profile_image = await uploadToCloud(req.body.profile_image, 'manaqasa/profiles');
    const allowed = { name:'name', phone:'phone', city:'city', bio:'bio', specialties:'specialties', notify_categories:'notify_categories', experience_years:'experience_years', profile_image:'profile_image' };
    const sets=[]; const params=[]; let idx=1;
    for (const key in allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        let val = req.body[key];
        if (key==='name') { if (val&&String(val).trim()) { sets.push(`${allowed[key]}=$${idx}`); params.push(String(val).trim()); idx++; } continue; }
        if (key==='experience_years') { val=(val===''||val===null||val===undefined)?null:parseInt(val); if(isNaN(val))val=null; }
        if (val==='') val=null;
        sets.push(`${allowed[key]}=$${idx}`); params.push(val); idx++;
      }
    }
    if (!sets.length) { const cur=await pool.query(`SELECT id,name,email,phone,role,specialties,notify_categories,bio,city,badge,experience_years,profile_image FROM users WHERE id=$1`,[req.user.id]); return res.json(cur.rows[0]||{}); }
    params.push(req.user.id);
    const r=await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id=$${idx} RETURNING id,name,email,phone,role,specialties,notify_categories,bio,city,badge,experience_years,profile_image`, params);
    res.json(r.rows[0]);
  } catch(e) { console.error('/profile PUT:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/client/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT id,name,email,phone,city,bio,badge,profile_image,created_at,(SELECT COUNT(*) FROM requests WHERE client_id=users.id) as total_requests,(SELECT COUNT(*) FROM requests WHERE client_id=users.id AND status='completed') as completed_requests,(SELECT COUNT(*) FROM requests WHERE client_id=users.id AND status='in_progress') as active_requests FROM users WHERE id=$1`, [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/client/profile', auth, async (req, res) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      const newEmail = String(req.body.email||'').trim().toLowerCase();
      if (!newEmail||!newEmail.includes('@')||!newEmail.includes('.')) return res.status(400).json({ message: 'بريد إلكتروني غير صحيح' });
      const dup = await pool.query('SELECT id FROM users WHERE LOWER(email)=$1 AND id<>$2', [newEmail, req.user.id]);
      if (dup.rows.length) return res.status(400).json({ message: 'هذا البريد الإلكتروني مستخدم لحساب آخر' });
    }
    if (req.body.profile_image && req.body.profile_image.startsWith('data:')) req.body.profile_image = await uploadToCloud(req.body.profile_image, 'manaqasa/profiles');
    const allowed = { name:'name', phone:'phone', email:'email', city:'city', bio:'bio', profile_image:'profile_image', business_name:'business_name', experience_years:'experience_years', specialties:'specialties', notify_categories:'notify_categories', portfolio_images:'portfolio_images', website:'website', location_url:'location_url', instagram:'instagram', twitter:'twitter', snapchat:'snapchat', tiktok:'tiktok', youtube:'youtube' };
    const sets=[]; const params=[]; let idx=1;
    for (const key in allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        let val = req.body[key];
        if (key==='name') { if (val&&String(val).trim()) { sets.push(`${allowed[key]}=$${idx}`); params.push(String(val).trim()); idx++; } continue; }
        if (key==='email') val=String(val||'').trim().toLowerCase();
        if (val==='') val=null;
        sets.push(`${allowed[key]}=$${idx}`); params.push(val); idx++;
      }
    }
    if (!sets.length) { const cur=await pool.query(`SELECT id,name,email,phone,city,bio,profile_image FROM users WHERE id=$1`,[req.user.id]); return res.json(cur.rows[0]||{}); }
    params.push(req.user.id);
    const r=await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id=$${idx} RETURNING id,name,email,phone,city,bio,profile_image`, params);
    res.json(r.rows[0]);
  } catch(e) { console.error('client/profile PUT:', e); if(e.code==='23505') return res.status(400).json({ message: 'هذا البريد الإلكتروني مستخدم لحساب آخر' }); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/provider/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT id,name,email,phone,city,bio,badge,specialties,notify_categories,experience_years,portfolio_images,profile_image,business_name,last_bumped_at,COALESCE(website,'') as website,COALESCE(location_url,'') as location_url,COALESCE(instagram,'') as instagram,COALESCE(twitter,'') as twitter,COALESCE(snapchat,'') as snapchat,COALESCE(tiktok,'') as tiktok,COALESCE(youtube,'') as youtube,created_at,tier,COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,(SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as total_bids,(SELECT COUNT(*) FROM bids WHERE provider_id=users.id AND status='accepted') as accepted_bids,(SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects FROM users WHERE id=$1`, [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/provider/:id/profile', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`SELECT id,name,phone,city,bio,badge,specialties,experience_years,portfolio_images,profile_image,business_name,COALESCE(website,'') as website,COALESCE(location_url,'') as location_url,COALESCE(instagram,'') as instagram,COALESCE(twitter,'') as twitter,COALESCE(snapchat,'') as snapchat,COALESCE(tiktok,'') as tiktok,COALESCE(youtube,'') as youtube,created_at,tier,COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,(SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as total_bids,(SELECT COUNT(*) FROM bids WHERE provider_id=users.id AND status='accepted') as accepted_bids,(SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects FROM users WHERE id=$1 AND role='provider'`, [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'المزود غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { console.error('/api/provider/:id/profile:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/ratings/provider/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const agg = await pool.query(`SELECT COALESCE(AVG(rating),0)::float as average, COUNT(*)::int as count FROM reviews WHERE reviewed_id=$1`, [id]);
    const rv = await pool.query(`SELECT r.id, r.rating, r.comment, r.images, r.provider_reply, r.reply_at, r.created_at, u.name as reviewer_name, u.profile_image as reviewer_image, rq.title as request_title FROM reviews r JOIN users u ON u.id=r.reviewer_id LEFT JOIN requests rq ON rq.id=r.request_id WHERE r.reviewed_id=$1 ORDER BY r.created_at DESC LIMIT 20`, [id]);
    res.json({ average: parseFloat(agg.rows[0].average)||0, count: agg.rows[0].count||0, reviews: rv.rows });
  } catch(e) { console.error('/api/ratings/provider/:id:', e); res.json({ average:0, count:0, reviews:[] }); }
});

app.put('/api/provider/profile', auth, async (req, res) => {
  try {
    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      const newEmail = String(req.body.email||'').trim().toLowerCase();
      if (!newEmail||!newEmail.includes('@')||!newEmail.includes('.')) return res.status(400).json({ message: 'بريد إلكتروني غير صحيح' });
      const dup = await pool.query('SELECT id FROM users WHERE LOWER(email)=$1 AND id<>$2', [newEmail, req.user.id]);
      if (dup.rows.length) return res.status(400).json({ message: 'هذا البريد الإلكتروني مستخدم لحساب آخر' });
    }
    if (req.body.profile_image && req.body.profile_image.startsWith('data:')) req.body.profile_image = await uploadToCloud(req.body.profile_image, 'manaqasa/profiles');
    if (req.body.portfolio_images && Array.isArray(req.body.portfolio_images)) {
      const uploaded = [];
      for (const img of req.body.portfolio_images) { if (img && img.startsWith('data:')) uploaded.push(await uploadToCloud(img, 'manaqasa/portfolio')); else if (img) uploaded.push(img); }
      req.body.portfolio_images = uploaded;
    }
    const allowed = { name:'name', phone:'phone', email:'email', city:'city', bio:'bio', specialties:'specialties', notify_categories:'notify_categories', experience_years:'experience_years', portfolio_images:'portfolio_images', profile_image:'profile_image', business_name:'business_name', website:'website', location_url:'location_url', instagram:'instagram', twitter:'twitter', snapchat:'snapchat', tiktok:'tiktok', youtube:'youtube' };
    const sets=[]; const params=[]; let idx=1;
    for (const key in allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        let val = req.body[key];
        if (key==='name') { if (val&&String(val).trim()) { sets.push(`${allowed[key]}=$${idx}`); params.push(String(val).trim()); idx++; } continue; }
        if (key==='email') val=String(val||'').trim().toLowerCase();
        if (key==='experience_years') { val=(val===''||val===null||val===undefined)?null:parseInt(val); if(isNaN(val))val=null; }
        if (val==='') val=null;
        sets.push(`${allowed[key]}=$${idx}`); params.push(val); idx++;
      }
    }
    if (!sets.length) { const cur=await pool.query(`SELECT id,name,email,phone,city,bio,specialties,notify_categories,experience_years,portfolio_images,profile_image,business_name,website,instagram,twitter,snapchat,tiktok,youtube FROM users WHERE id=$1`,[req.user.id]); return res.json(cur.rows[0]||{}); }
    params.push(req.user.id);
    const r=await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id=$${idx} RETURNING id,name,email,phone,city,bio,specialties,notify_categories,experience_years,portfolio_images,profile_image,business_name,website,location_url,instagram,twitter,snapchat,tiktok,youtube`, params);
    res.json(r.rows[0]);
  } catch(e) { console.error('provider/profile PUT:', e); if(e.code==='23505') return res.status(400).json({ message: 'هذا البريد الإلكتروني مستخدم لحساب آخر' }); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ PROVIDER ENDPOINTS ═══
app.get('/api/provider/bids', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT b.id, b.request_id, b.price, b.days, b.note, b.status, b.created_at, r.title as request_title, r.category, r.city, r.client_id, u.name as client_name, CASE WHEN b.status='accepted' THEN u.phone ELSE NULL END as client_phone FROM bids b JOIN requests r ON b.request_id=r.id JOIN users u ON r.client_id=u.id WHERE b.provider_id=$1 ORDER BY b.created_at DESC LIMIT 200`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { console.error('/provider/bids:', e); res.json([]); }
});

app.get('/api/provider/projects', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT r.id, r.title, r.description, r.category, r.city, r.budget_max, r.image_url, r.images, r.project_number, r.status, r.assigned_at, r.completed_at, r.client_id, u.name as client_name, u.phone as client_phone, b.price, b.days FROM requests r JOIN users u ON r.client_id=u.id LEFT JOIN bids b ON b.request_id=r.id AND b.provider_id=$1 AND b.status='accepted' WHERE r.assigned_provider_id=$1 AND r.status IN ('in_progress','completed') AND (r.category IS DISTINCT FROM 'direct') ORDER BY r.assigned_at DESC NULLS LAST`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { console.error('/provider/projects:', e); res.json([]); }
});

app.get('/api/provider/reviews', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT rv.id, rv.rating, rv.comment, rv.images, rv.provider_reply, rv.reply_at, rv.created_at, rv.reviewer_id, rv.request_id, u.name as reviewer_name, u.profile_image as reviewer_image, rq.title as request_title FROM reviews rv JOIN users u ON rv.reviewer_id=u.id LEFT JOIN requests rq ON rv.request_id=rq.id WHERE rv.reviewed_id=$1 ORDER BY rv.created_at DESC LIMIT 100`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { console.error('/provider/reviews:', e); res.json([]); }
});

app.get('/api/provider/conversations', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT DISTINCT ON (r.id)
        r.id as request_id, r.client_id, r.title as request_title,
        u.name as client_name, u.profile_image as client_image,
        (SELECT content FROM messages WHERE request_id=r.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE request_id=r.id ORDER BY created_at DESC LIMIT 1) as last_time,
        (SELECT COUNT(*) FROM messages WHERE request_id=r.id AND receiver_id=$1 AND is_read=FALSE) as unread
      FROM requests r JOIN users u ON u.id=r.client_id
      WHERE (r.assigned_provider_id=$1 OR EXISTS(SELECT 1 FROM messages m2 WHERE m2.request_id=r.id AND m2.sender_id=$1))
        AND EXISTS(SELECT 1 FROM messages WHERE request_id=r.id)
      ORDER BY r.id, last_time DESC NULLS LAST
    `, [req.user.id]);
    res.json(r.rows);
  } catch(e) { console.error('/provider/conversations:', e); res.json([]); }
});

// إصلاح المشكلة: رسائل المزود لا تظهر عند العميل
// السبب: الكود القديم كان يشترط r.assigned_provider_id IS NOT NULL
// مما يمنع ظهور المحادثات عندما يرسل المزود قبل قبول عرضه
app.get('/api/client/conversations', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      WITH conv AS (
        SELECT DISTINCT
          m.request_id,
          CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as provider_id
        FROM messages m
        WHERE (m.sender_id = $1 OR m.receiver_id = $1)
      )
      SELECT
        c.request_id,
        c.provider_id,
        COALESCE(r.title, 'محادثة مباشرة') as request_title,
        u.name as provider_name,
        u.profile_image as provider_image,
        u.phone as provider_phone,
        (SELECT content FROM messages WHERE request_id = c.request_id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT MAX(created_at) FROM messages WHERE request_id = c.request_id) as last_time,
        (SELECT COUNT(*) FROM messages WHERE request_id = c.request_id AND receiver_id = $1 AND is_read = FALSE) as unread
      FROM conv c
      LEFT JOIN requests r ON r.id = c.request_id
      LEFT JOIN users u ON u.id = c.provider_id
      WHERE c.provider_id IS NOT NULL
      ORDER BY last_time DESC NULLS LAST
    `, [req.user.id]);
    res.json(r.rows);
  } catch(e) { console.error('/client/conversations:', e); res.json([]); }
});

app.post('/api/provider/profile/portfolio', auth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'image required' });
    const cur = await pool.query('SELECT portfolio_images FROM users WHERE id=$1', [req.user.id]);
    const imgs = cur.rows[0]?.portfolio_images || [];
    if (imgs.length >= 6) return res.status(400).json({ message: 'الحد الأقصى 6 صور' });
    imgs.push(image);
    await pool.query('UPDATE users SET portfolio_images=$1 WHERE id=$2', [imgs, req.user.id]);
    res.json({ ok: true, count: imgs.length });
  } catch(e) { console.error('portfolio POST:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/provider/profile/portfolio/:i', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.i);
    const cur = await pool.query('SELECT portfolio_images FROM users WHERE id=$1', [req.user.id]);
    const imgs = cur.rows[0]?.portfolio_images || [];
    if (idx < 0 || idx >= imgs.length) return res.status(400).json({ message: 'index out of range' });
    imgs.splice(idx, 1);
    await pool.query('UPDATE users SET portfolio_images=$1 WHERE id=$2', [imgs, req.user.id]);
    res.json({ ok: true, count: imgs.length });
  } catch(e) { console.error('portfolio DELETE:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/provider/bump', auth, providerOnly, async (req, res) => {
  try {
    const check = await pool.query('SELECT last_bumped_at FROM users WHERE id=$1', [req.user.id]);
    const lastBump = check.rows[0]?.last_bumped_at;
    if (lastBump) {
      const hoursSince = (Date.now() - new Date(lastBump)) / 3600000;
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        return res.status(429).json({ ok: false, message: `يمكنك التحديث بعد ${hoursLeft} ساعة`, hours_left: hoursLeft });
      }
    }
    await pool.query('UPDATE users SET last_bumped_at = NOW() WHERE id=$1', [req.user.id]);
    res.json({ ok: true, message: 'تم تحديث موقعك — أنت الآن في الأعلى!' });
  } catch(e) { console.error('PUT /api/provider/bump:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ REQUESTS ═══
app.get('/api/requests', async (req, res) => {
  try {
    const { category, city, status } = req.query;
    // يرجع كل المشاريع — مفتوح ومغلق وتم الترسية
    let query = `SELECT r.id,r.project_number,r.title,r.description,r.category,r.city,r.budget_max,r.deadline,r.status,r.client_id,r.created_at,u.name as client_name,u.badge as client_badge,(u.badge='premium' OR (SELECT COUNT(*) FROM requests WHERE client_id=u.id AND status='completed')>=3) as client_premium,COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count,(SELECT img FROM unnest(COALESCE(r.images,ARRAY[]::text[])) img WHERE img LIKE 'http%' LIMIT 1) as thumbnail FROM requests r JOIN users u ON r.client_id=u.id WHERE (r.category IS DISTINCT FROM 'direct')`;
    const params = [];
    if (status && status !== 'all') {
      if (status === 'open') { query += ` AND r.status='open'`; }
      else if (status === 'done') { query += ` AND r.status IN ('completed','in_progress','done')`; }
    }
    if (category) { params.push(category); query += ` AND r.category=$${params.length}`; }
    if (city)     { params.push(`%${city}%`); query += ` AND r.city ILIKE $${params.length}`; }
    query += ' ORDER BY r.created_at DESC LIMIT 100';
    const result = await pool.query(query, params);
    res.json(result.rows.map(x => ({ ...x, status: normalizeStatus(x.status) })));
  } catch(e) { console.error('/requests:', e); res.json([]); }
});

app.get('/api/requests/my', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT r.id,r.project_number,r.title,r.description,r.category,r.city,r.budget_max,r.deadline,r.status,r.created_at,r.assigned_provider_id,u.name as client_name, p.name as provider_name,COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count,(SELECT img FROM unnest(COALESCE(r.images,ARRAY[]::text[])) img WHERE img LIKE 'http%' LIMIT 1) as thumbnail FROM requests r JOIN users u ON r.client_id=u.id LEFT JOIN users p ON r.assigned_provider_id=p.id WHERE r.client_id=$1 AND (r.category IS DISTINCT FROM 'direct') ORDER BY r.created_at DESC`, [req.user.id]);
    res.json(r.rows.map(x => ({ ...x, status: normalizeStatus(x.status) })));
  } catch(e) { console.error('/requests/my:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/requests/:id', optionalAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`SELECT r.*, u.name as client_name, u.phone as client_phone, u.profile_image as client_image, p.name as provider_name, p.phone as provider_phone, COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count FROM requests r JOIN users u ON r.client_id=u.id LEFT JOIN users p ON r.assigned_provider_id=p.id WHERE r.id=$1`, [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const row = r.rows[0];
    // خصوصية العميل: جواله يظهر فقط لصاحب المشروع، أو المزوّد المُرسى عليه، أو الأدمن
    const uid = req.user && req.user.id, role = req.user && req.user.role;
    const isOwner = uid && uid === row.client_id;
    const isAssigned = uid && row.assigned_provider_id && uid === row.assigned_provider_id;
    const isAdmin = role === 'admin';
    if (!(isOwner || isAssigned || isAdmin)) {
      row.client_phone = null;
      if (row.client_name) row.client_name = String(row.client_name).trim().split(/\s+/)[0]; // الاسم الأول فقط
      row.provider_phone = null;
    }
    res.json({ ...row, status: normalizeStatus(row.status) });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/requests', auth, clientOnly, async (req, res) => {
  try {
    const { title, description, category, city, address, budget_max, deadline, attachments } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'العنوان والوصف مطلوبان' });
    const rawImages = req.body.images || [];
    const images_arr = Array.isArray(rawImages) ? rawImages : [];
    const uploadedImages = [];
    for (const img of images_arr) {
      if (img && img.startsWith('data:')) uploadedImages.push(await uploadToCloud(img, 'manaqasa/projects'));
      else if (img && img.startsWith('http')) uploadedImages.push(img);
    }
    const pn = generateProjectNumber();
    const r = await pool.query(`INSERT INTO requests (client_id, title, description, category, city, address, budget_max, deadline, images, attachments, project_number, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending_review',NOW()) RETURNING *`, [req.user.id, title, description, category||null, city||null, address||null, budget_max||null, deadline||null, uploadedImages.length?uploadedImages:null, attachments?JSON.stringify(attachments):null, pn]);
    const newReq = r.rows[0];
    try {
      const clientInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [req.user.id]);
      if (clientInfo.rows.length && clientInfo.rows[0].email) {
        const ctitle = '✅ تم نشر مشروعك بنجاح';
        const cBody = `<p>عزيزي <strong>${clientInfo.rows[0].name}</strong>،</p><p>تم نشر مشروعك "<strong>${newReq.title}</strong>" بنجاح. رقم المشروع: ${pn}</p>`;
        sendEmail(clientInfo.rows[0].email, ctitle, emailTpl(ctitle, cBody, 'متابعة المشروع', SITE_URL+'/dashboard-client.html')).catch(()=>{});
        await notify(req.user.id, ctitle, `تم نشر "${newReq.title}" بنجاح`, 'request_published', newReq.id);
      }
    } catch(e) { console.error('client confirmation email:', e.message); }
    if (newReq.category) {
      try {
        const cat = String(newReq.category).trim();
        const directProvId = req.body.direct_provider_id;
        if (directProvId) {
          const dp = await pool.query('SELECT id,name,email FROM users WHERE id=$1 AND role=$2', [directProvId, 'provider']);
          if (dp.rows.length) {
            const cName2 = (await pool.query('SELECT name FROM users WHERE id=$1',[req.user.id])).rows[0]?.name||'عميل';
            await notify(dp.rows[0].id, '💬 استفسار مباشر جديد', `${cName2} يريد التواصل معك مباشرة`, 'new_request', newReq.id);
            if(dp.rows[0].email) sendEmail(dp.rows[0].email,'💬 استفسار مباشر',emailTpl('استفسار مباشر',`<p>يريد <strong>${cName2}</strong> التواصل معك.</p>`,'فتح المحادثة',SITE_URL+'/dashboard-provider.html')).catch(()=>{});
          }
          return res.json(newReq);
        }
        const provs = await pool.query(`SELECT id, name, email FROM users WHERE role='provider' AND is_active=TRUE AND ((specialties IS NOT NULL AND TRIM($1::text)=ANY(ARRAY(SELECT TRIM(UNNEST(specialties))))) OR (notify_categories IS NOT NULL AND TRIM($1::text)=ANY(ARRAY(SELECT TRIM(UNNEST(notify_categories))))))`, [cat]);
        const cityHint = newReq.city ? ` في ${newReq.city}` : '';
        const nTitle = '🆕 مشروع جديد في تخصصك';
        const nBody = `${newReq.title}${cityHint} — اطّلع وقدّم عرضك`;
        const emailBody = `<p>وصلنا طلب مشروع جديد ضمن تخصصاتك.</p><div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px;margin:16px 0"><div style="font-size:15px;font-weight:800;color:#16213E">${newReq.title}</div><div style="font-size:13px;color:#475569;margin-top:8px">${cat}${newReq.city?` · ${newReq.city}`:''}${newReq.budget_max?` · ${Number(newReq.budget_max).toLocaleString('en-US')} ر.س`:''}</div></div>`;
        for (const p of provs.rows) {
          await notify(p.id, nTitle, nBody, 'new_request', newReq.id);
          if (p.email) sendEmail(p.email, nTitle, emailTpl(nTitle, emailBody, 'فتح المشروع الآن', SITE_URL+'/dashboard-provider.html')).catch(()=>{});
        }
        console.log(`📢 Request #${newReq.id} category="${cat}" → notified ${provs.rows.length} providers`);
      } catch(nerr) { console.error('notify providers:', nerr); }
    }
    await addTimeline(newReq.id, 'published', 'تم نشر المشروع');
    res.json(newReq);
  } catch(e) { console.error('create request:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/requests/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT client_id FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'ليست طلبك' });
    const { title, description, category, city, address, budget_max, deadline } = req.body;
    const r = await pool.query(`UPDATE requests SET title=COALESCE(NULLIF($1,''),title), description=COALESCE(NULLIF($2,''),description), category=$3, city=$4, address=$5, budget_max=$6, deadline=$7 WHERE id=$8 RETURNING *`, [title||'', description||'', category||null, city||null, address||null, budget_max||null, deadline||null, id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/requests/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT client_id FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'ليست طلبك' });
    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM bids WHERE request_id=$1', [id]);
      await pool.query('DELETE FROM messages WHERE request_id=$1', [id]);
      await pool.query('DELETE FROM reviews WHERE request_id=$1', [id]);
      await pool.query('DELETE FROM requests WHERE id=$1', [id]);
      await pool.query('COMMIT'); res.json({ ok: true });
    } catch(e) { await pool.query('ROLLBACK'); throw e; }
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/requests/:id/images', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id); const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'لا توجد صورة' });
    const own = await pool.query('SELECT client_id, images FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const current = own.rows[0].images || [];
    current.push(image);
    await pool.query('UPDATE requests SET images=$1 WHERE id=$2', [current, id]);
    res.json({ ok: true, count: current.length });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/requests/:id/attachments', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id); const { name, type, data } = req.body;
    if (!data) return res.status(400).json({ message: 'لا توجد بيانات' });
    const own = await pool.query('SELECT client_id, attachments FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const current = own.rows[0].attachments || [];
    current.push({ name, type, data, uploaded_at: new Date().toISOString() });
    await pool.query('UPDATE requests SET attachments=$1 WHERE id=$2', [JSON.stringify(current), id]);
    res.json({ ok: true, count: current.length });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/requests/:id/complete', auth, clientOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`UPDATE requests SET status='completed', completed_at=NOW() WHERE id=$1 AND client_id=$2 RETURNING id, assigned_provider_id, title`, [id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود أو ليس طلبك' });
    if (r.rows[0].assigned_provider_id) { recomputeProviderTier(r.rows[0].assigned_provider_id); }
    if (r.rows[0].assigned_provider_id) {
      const provInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [r.rows[0].assigned_provider_id]);
      const projTitle = r.rows[0].title;
      await notify(r.rows[0].assigned_provider_id, '🎉 مشروع مكتمل', `العميل أنهى مشروع "${projTitle}".`, 'request', id);
      if (provInfo.rows.length && provInfo.rows[0].email) sendEmail(provInfo.rows[0].email, 'مشروع مكتمل', emailTpl('مشروع مكتمل', `<p>تهانينا! أُنهي المشروع: <strong>${projTitle}</strong></p>`, 'فتح المشروع', SITE_URL+'/dashboard-provider.html')).catch(()=>{});
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// Alias
app.put('/api/requests/:id/done', auth, clientOnly, async (req, res) => { res.redirect(307, req.path.replace('/done','/complete')); });

// إعادة نشر مشروع مُغلق (بطلب العميل)
app.put('/api/requests/:id/repost', auth, clientOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(
      `UPDATE requests SET status='open', created_at=NOW(), confirm_requested_at=NULL, assigned_provider_id=NULL
       WHERE id=$1 AND client_id=$2 AND status IN ('closed_auto','cancelled','expired')
       RETURNING id, title, category, city, client_id`, [id, req.user.id]);
    if(!r.rows.length) return res.status(404).json({ message:'غير موجود أو لا يمكن إعادة نشره' });
    try{ await pool.query(`DELETE FROM reminders_log WHERE ref_id=$1 AND kind IN ('offers_waiting','close_warn')`, [id]); }catch(e){}
    try{ await notifyMatchingProviders(r.rows[0]); }catch(e){}
    res.json({ ok:true });
  } catch(e){ res.status(500).json({ message:'حدث خطأ' }); }
});

// «لم يتم بعد» — يوقف التأكيد التلقائي ويعيد ضبط المؤقّت
app.put('/api/requests/:id/not-done', auth, clientOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(
      `UPDATE requests SET confirm_requested_at=NULL, assigned_at=NOW()
       WHERE id=$1 AND client_id=$2 AND completed_at IS NULL
       RETURNING id`, [id, req.user.id]);
    if(!r.rows.length) return res.status(404).json({ message:'غير موجود أو ليس طلبك' });
    // امسح سجل التذكير حتى يُعاد لاحقاً
    try{ await pool.query(`DELETE FROM reminders_log WHERE ref_id=$1 AND kind IN ('complete_deal')`, [id]); }catch(e){}
    res.json({ ok:true });
  } catch(e){ res.status(500).json({ message:'حدث خطأ' }); }
});

// ═══ BIDS ═══
app.get('/api/bids/my', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT b.*, r.title as request_title, r.project_number, r.status as request_status, u.name as client_name FROM bids b JOIN requests r ON b.request_id=r.id JOIN users u ON r.client_id=u.id WHERE b.provider_id=$1 ORDER BY b.created_at DESC LIMIT 200`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/requests/:id/bids', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT client_id FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'ليست طلبك' });
    const r = await pool.query(`
      SELECT b.id, b.request_id, b.provider_id, b.price, b.days, b.note,
             b.status, b.created_at,
        u.name as provider_name, u.phone as provider_phone,
        u.city as provider_city, u.badge as provider_badge, u.tier as provider_tier,
        u.business_name as provider_business_name,
        u.specialties as provider_specialties,
        u.bio as provider_bio,
        CASE WHEN u.profile_image IS NOT NULL AND length(u.profile_image) > 0
             THEN u.profile_image ELSE NULL END as provider_image,
        COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews WHERE reviewed_id=u.id),0) as provider_rating,
        COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=u.id),0) as provider_reviews
      FROM bids b JOIN users u ON b.provider_id=u.id
      WHERE b.request_id=$1
      ORDER BY (b.status='accepted') DESC, CASE u.tier WHEN 'expert' THEN 0 WHEN 'distinguished' THEN 1 WHEN 'active' THEN 2 ELSE 3 END ASC, b.created_at DESC
    `, [id]);
    res.json(r.rows);
  } catch(e) { console.error('GET /api/requests/:id/bids:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/requests/:id/bids', auth, providerOnly, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    let { price, days, note } = req.body;
    price = parseInt(Math.round(parseFloat(price))); days = parseInt(days);
    if (!Number.isFinite(price)||price<=0) return res.status(400).json({ message: 'السعر غير صحيح' });
    if (!Number.isFinite(days)||days<=0) return res.status(400).json({ message: 'المدة غير صحيحة' });
    const reqRow = await pool.query('SELECT client_id, title, status FROM requests WHERE id=$1', [requestId]);
    if (!reqRow.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (reqRow.rows[0].status !== 'open') return res.status(400).json({ message: 'الطلب غير مفتوح للعروض' });
    const existing = await pool.query('SELECT id, status FROM bids WHERE request_id=$1 AND provider_id=$2', [requestId, req.user.id]);
    let row; let isUpdate = false;
    if (existing.rows.length) {
      if (existing.rows[0].status === 'accepted') return res.status(400).json({ message: 'عرضك مقبول مسبقاً' });
      const upd = await pool.query(`UPDATE bids SET price=$1, days=$2, note=$3, created_at=NOW() WHERE request_id=$4 AND provider_id=$5 RETURNING *`, [price, days, note||null, requestId, req.user.id]);
      row = upd.rows[0]; isUpdate = true;
    } else {
      const ins = await pool.query(`INSERT INTO bids (request_id, provider_id, price, days, note, status, created_at) VALUES ($1,$2,$3,$4,$5,'pending',NOW()) RETURNING *`, [requestId, req.user.id, price, days, note||null]);
      row = ins.rows[0];
    }
    const provInfo = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const clientInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [reqRow.rows[0].client_id]);
    const projTitle = reqRow.rows[0].title; const provName = provInfo.rows[0]?.name||'مزود';
    let isFirst = false;
    if (!isUpdate) { try{ const cnt = await pool.query('SELECT COUNT(*) c FROM bids WHERE request_id=$1', [requestId]); isFirst = (parseInt(cnt.rows[0].c)||0) === 1; }catch(e){} }
    const inAppTitle = isUpdate ? '✏️ تم تحديث عرض' : (isFirst ? '🎉 وصلك أول عرض!' : '💼 عرض جديد');
    const inAppBody = isUpdate ? `قام ${provName} بتحديث عرضه على "${projTitle}"` : (isFirst ? `وصلك أول عرض من ${provName} على "${projTitle}" — بداية موفقة! قارن العروض القادمة واختر الأنسب` : `تلقيت عرضاً من ${provName} على "${projTitle}"`);
    await notify(reqRow.rows[0].client_id, inAppTitle, inAppBody, 'bid', requestId);
    if (clientInfo.rows.length && clientInfo.rows[0].email && !isUpdate) {
      const subject = `💼 عرض جديد على مشروع "${projTitle}"`;
      const body = `<p>عزيزي <strong>${clientInfo.rows[0].name}</strong>،</p><p>تلقيت عرضاً جديداً من <strong>${provName}</strong>:</p><div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px;margin:16px 0"><div style="font-size:13px;color:#475569;line-height:1.9"><div><strong>السعر:</strong> ${Number(price).toLocaleString('en-US')} ر.س</div><div><strong>المدة:</strong> ${days} يوم</div>${note?`<div><strong>ملاحظة:</strong> ${note.replace(/\n/g,'<br>')}</div>`:''}</div></div>`;
      sendEmail(clientInfo.rows[0].email, subject, emailTpl(subject, body, 'مراجعة العرض', SITE_URL+'/dashboard-client.html')).catch(()=>{});
    }
    res.json(row);
  } catch(e) { console.error('POST /api/requests/:id/bids:', e.message); res.status(500).json({ message: e.message, code: e.code }); }
});

app.put('/api/bids/:id', auth, providerOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT provider_id, status FROM bids WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].provider_id !== req.user.id) return res.status(403).json({ message: 'ليس عرضك' });
    if (own.rows[0].status === 'accepted') return res.status(400).json({ message: 'العرض مقبول ولا يمكن تعديله' });
    const { price, days, note } = req.body;
    const r = await pool.query('UPDATE bids SET price=COALESCE($1,price), days=COALESCE($2,days), note=$3 WHERE id=$4 RETURNING *', [price||null, days||null, note||null, id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/bids/:id', auth, providerOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT provider_id, status FROM bids WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].provider_id !== req.user.id) return res.status(403).json({ message: 'ليس عرضك' });
    if (own.rows[0].status === 'accepted') return res.status(400).json({ message: 'لا يمكن حذف عرض مقبول' });
    await pool.query('DELETE FROM bids WHERE id=$1', [id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/bids/:id/accept', auth, clientOnly, async (req, res) => {
  try {
    const bidId = parseInt(req.params.id);
    const bid = await pool.query(`SELECT b.*, r.client_id, r.title FROM bids b JOIN requests r ON b.request_id=r.id WHERE b.id=$1`, [bidId]);
    if (!bid.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (bid.rows[0].client_id !== req.user.id) return res.status(403).json({ message: 'ليس طلبك' });
    const acceptedBid = bid.rows[0];
    await pool.query('BEGIN');
    try {
      await pool.query(`UPDATE bids SET status='accepted' WHERE id=$1`, [bidId]);
      await pool.query(`UPDATE bids SET status='rejected' WHERE request_id=$1 AND id!=$2`, [acceptedBid.request_id, bidId]);
      await pool.query(`UPDATE requests SET status='in_progress', assigned_provider_id=$1, assigned_at=NOW() WHERE id=$2`, [acceptedBid.provider_id, acceptedBid.request_id]);
      await pool.query('COMMIT');
      const acceptedProv = await pool.query('SELECT name, email FROM users WHERE id=$1', [acceptedBid.provider_id]);
      const clientInfo = await pool.query('SELECT name, phone FROM users WHERE id=$1', [req.user.id]);
      const cName = clientInfo.rows[0]?.name||'العميل'; const cPhone = clientInfo.rows[0]?.phone||'';
      await notify(acceptedBid.provider_id, 'تم قبول عرضك!', `تهانينا! تم قبول عرضك على "${acceptedBid.title}".`, 'bid_accepted', acceptedBid.request_id);
      if (acceptedProv.rows.length && acceptedProv.rows[0].email) {
        const subject = `تم قبول عرضك على "${acceptedBid.title}"`;
        const body = `<p>تهانينا <strong>${acceptedProv.rows[0].name}</strong>! تم قبول عرضك.</p><div style="background:#fff8e6;border:1px solid #fde68a;border-radius:10px;padding:14px;margin:16px 0"><div style="font-size:13px;color:#475569;line-height:1.9"><div><strong>العميل:</strong> ${cName}</div>${cPhone?`<div><strong>الجوال:</strong> ${cPhone}</div>`:''}<div><strong>السعر:</strong> ${Number(acceptedBid.price).toLocaleString('en-US')} ر.س</div><div><strong>المدة:</strong> ${acceptedBid.days} يوم</div></div></div>`;
        sendEmail(acceptedProv.rows[0].email, subject, emailTpl(subject, body, 'فتح المشروع', SITE_URL+'/dashboard-provider.html')).catch(()=>{});
      }
      const rejected = await pool.query(`SELECT b.provider_id, u.name, u.email FROM bids b JOIN users u ON b.provider_id=u.id WHERE b.request_id=$1 AND b.id!=$2 AND b.status='rejected'`, [acceptedBid.request_id, bidId]);
      for (const rej of rejected.rows) {
        await notify(rej.provider_id, '😔 لم يُقبل عرضك', `اختار العميل عرضاً آخر على "${acceptedBid.title}".`, 'bid_rejected', acceptedBid.request_id);
        if (rej.email) sendEmail(rej.email, `📋 لم يُقبل عرضك على "${acceptedBid.title}"`, emailTpl('لم يُقبل عرضك', `<p>عزيزي <strong>${rej.name}</strong>،</p><p>اختار العميل عرضاً آخر. لا تيأس!</p>`, 'تصفح المشاريع', SITE_URL+'/dashboard-provider.html')).catch(()=>{});
      }
      await addTimeline(acceptedBid.request_id, 'bid_accepted', 'تم قبول عرض المزود');
      res.json({ ok: true });
    } catch(e) { await pool.query('ROLLBACK'); throw e; }
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/bids/:id/reject', auth, clientOnly, async (req, res) => {
  try {
    const bidId = parseInt(req.params.id);
    const bid = await pool.query(`SELECT b.*, r.client_id, r.title FROM bids b JOIN requests r ON b.request_id=r.id WHERE b.id=$1`, [bidId]);
    if (!bid.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (bid.rows[0].client_id !== req.user.id) return res.status(403).json({ message: 'ليس طلبك' });
    await pool.query(`UPDATE bids SET status='rejected' WHERE id=$1`, [bidId]);
    const provInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [bid.rows[0].provider_id]);
    await notify(bid.rows[0].provider_id, 'تم رفض عرضك', `تم رفض عرضك على "${bid.rows[0].title}"`, 'bid_rejected', bid.rows[0].request_id);
    if (provInfo.rows.length && provInfo.rows[0].email) sendEmail(provInfo.rows[0].email, `📋 تم رفض عرضك على "${bid.rows[0].title}"`, emailTpl('تم رفض العرض', `<p>عزيزي <strong>${provInfo.rows[0].name}</strong>،</p><p>تم رفض عرضك على "${bid.rows[0].title}".</p>`, 'تصفح المشاريع', SITE_URL+'/dashboard-provider.html')).catch(()=>{});
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ DIRECT MESSAGE ═══
app.post('/api/direct-message', auth, async (req, res) => {
  try {
    const { provider_id, message } = req.body;
    if (!provider_id) return res.status(400).json({ message: 'provider_id مطلوب' });
    const senderId = req.user.id; const senderRole = req.user.role;
    let clientId, providerId;
    if (senderRole === 'client' || senderRole === 'admin') { clientId = senderId; providerId = parseInt(provider_id); }
    else if (senderRole === 'provider') {
      // مزود يراسل طرف آخر — يُعامل المرسل كعميل في هذه المحادثة
      providerId = senderId; clientId = parseInt(provider_id);
    }
    else return res.status(403).json({ message: 'غير مصرح بالمراسلة' });
    // منع مراسلة النفس
    if (clientId === providerId) return res.status(400).json({ message: 'لا يمكنك مراسلة نفسك' });
    let reqRow = await pool.query(`SELECT id FROM requests WHERE client_id=$1 AND assigned_provider_id=$2 AND category='direct' ORDER BY created_at DESC LIMIT 1`, [clientId, providerId]);
    let requestId;
    if (reqRow.rows.length) { requestId = reqRow.rows[0].id; }
    else {
      const prov = await pool.query('SELECT name FROM users WHERE id=$1', [providerId]);
      const provName = prov.rows[0]?.name || 'مزود';
      const newReq = await pool.query(`INSERT INTO requests (client_id, title, description, category, status, assigned_provider_id, created_at) VALUES ($1,$2,'محادثة مباشرة','direct','in_progress',$3,NOW()) RETURNING id`, [clientId, 'محادثة مع '+provName, providerId]);
      requestId = newReq.rows[0].id;
    }
    const msgText = (message && message.trim()) ? message.trim() : 'السلام عليكم';
    const receiverId = senderRole === 'client' ? providerId : clientId;
    const existing = await pool.query('SELECT id FROM messages WHERE request_id=$1 LIMIT 1', [requestId]);
    if (!existing.rows.length || (message && message.trim())) {
      await pool.query(`INSERT INTO messages (request_id, sender_id, receiver_id, content, created_at) VALUES ($1,$2,$3,$4,NOW())`, [requestId, senderId, receiverId, msgText]);
    }
    res.json({ request_id: requestId, success: true });
  } catch(e) { console.error('direct-message:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/users/search', auth, async (req, res) => {
  try {
    const q = (req.query.q||'').trim();
    if (!q) return res.json([]);
    const role = req.user.role === 'client' ? 'provider' : 'client';
    const r = await pool.query(`SELECT id, name, business_name, phone, city, profile_image, role FROM users WHERE role=$1 AND (name ILIKE $2 OR business_name ILIKE $2 OR phone LIKE $3) LIMIT 10`, [role, '%'+q+'%', '%'+q+'%']);
    res.json(r.rows);
  } catch(e) { res.json([]); }
});

app.get('/api/requests/:id/timeline', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query('SELECT * FROM request_timeline WHERE request_id=$1 ORDER BY created_at ASC', [id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json([]); }
});

async function addTimeline(requestId, event, description) {
  try { await pool.query('INSERT INTO request_timeline (request_id, event, description) VALUES ($1,$2,$3)', [requestId, event, description]); } catch(e) {}
}

app.post('/api/favorites/provider/:id', auth, async (req, res) => {
  try {
    const pid = parseInt(req.params.id);
    const existing = await pool.query('SELECT id FROM favorites WHERE user_id=$1 AND provider_id=$2', [req.user.id, pid]);
    if (existing.rows.length) { await pool.query('DELETE FROM favorites WHERE user_id=$1 AND provider_id=$2', [req.user.id, pid]); res.json({ saved: false }); }
    else { await pool.query('INSERT INTO favorites (user_id, provider_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, pid]); res.json({ saved: true }); }
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/favorites', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT u.id, u.name, u.business_name, u.city, u.profile_image, u.specialties, COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=u.id),0)::float as avg_rating FROM favorites f JOIN users u ON u.id=f.provider_id WHERE f.user_id=$1`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json([]); }
});

app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q||'').trim(); const city = req.query.city||''; const type = req.query.type||'all';
    if (!q && !city) return res.json({ projects:[], providers:[] });
    const results = { projects: [], providers: [] };
    if (type !== 'providers') {
      const pr = await pool.query(`SELECT id, title, category, city, budget_max, status, created_at, (SELECT COUNT(*) FROM bids WHERE request_id=requests.id) as bid_count FROM requests WHERE status='open' AND ($1='' OR title ILIKE $2 OR description ILIKE $2 OR category ILIKE $2) AND ($3='' OR city ILIKE $4) ORDER BY created_at DESC LIMIT 20`, [q, '%'+q+'%', city, '%'+city+'%']);
      results.projects = pr.rows;
    }
    if (type !== 'projects') {
      const pv = await pool.query(`SELECT id, name, business_name, city, specialties, profile_image, COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0)::float as avg_rating FROM users WHERE role='provider' AND ($1='' OR name ILIKE $2 OR business_name ILIKE $2 OR bio ILIKE $2 OR specialties::text ILIKE $2) AND ($3='' OR city ILIKE $4) ORDER BY avg_rating DESC LIMIT 20`, [q, '%'+q+'%', city, '%'+city+'%']);
      results.providers = pv.rows;
    }
    res.json(results);
  } catch(e) { res.status(500).json({ projects:[], providers:[] }); }
});

// ═══ MESSAGES ═══
const _msgEmailCache = {};

app.get('/api/messages/:requestId', auth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const withUser = parseInt(req.query.with) || null;
    let r;
    if (withUser) {
      r = await pool.query(`SELECT m.*, u.name as sender_name, u.profile_image as sender_image FROM messages m JOIN users u ON m.sender_id=u.id WHERE m.request_id=$1 AND ((m.sender_id=$2 AND (m.receiver_id=$3 OR m.receiver_id IS NULL)) OR (m.sender_id=$3 AND (m.receiver_id=$2 OR m.receiver_id IS NULL)) OR (m.sender_id IS NULL)) ORDER BY m.created_at ASC`, [requestId, req.user.id, withUser]);
      await pool.query('UPDATE messages SET is_read=TRUE WHERE request_id=$1 AND receiver_id=$2 AND sender_id=$3 AND is_read=FALSE', [requestId, req.user.id, withUser]);
    } else {
      r = await pool.query(`SELECT m.*, u.name as sender_name, u.profile_image as sender_image FROM messages m JOIN users u ON m.sender_id=u.id WHERE m.request_id=$1 AND (m.sender_id=$2 OR m.receiver_id=$2) ORDER BY m.created_at ASC`, [requestId, req.user.id]);
      await pool.query('UPDATE messages SET is_read=TRUE WHERE request_id=$1 AND receiver_id=$2 AND is_read=FALSE', [requestId, req.user.id]);
    }
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/messages', auth, async (req, res) => {
  try {
    const { request_id, receiver_id, content } = req.body;
    if (!request_id || !receiver_id || !content) return res.status(400).json({ message: 'البيانات ناقصة' });
    const r = await pool.query(`INSERT INTO messages (request_id, sender_id, receiver_id, content, created_at) VALUES ($1,$2,$3,$4,NOW()) RETURNING *`, [request_id, req.user.id, receiver_id, content]);
    const sender = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const senderName = sender.rows[0].name;
    await notify(receiver_id, 'رسالة جديدة', `${senderName}: ${content.slice(0,50)}${content.length>50?'...':''}`, 'message', request_id);
    const cacheKey = `${receiver_id}-${request_id}`;
    const now = Date.now(); const lastEmailTime = _msgEmailCache[cacheKey] || 0;
    if (now - lastEmailTime > 18*60*1000) {
      _msgEmailCache[cacheKey] = now;
      try {
        const recvInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [receiver_id]);
        const reqInfo = await pool.query('SELECT title FROM requests WHERE id=$1', [request_id]);
        if (recvInfo.rows.length && recvInfo.rows[0].email) {
          const subject = `رسالة جديدة من ${senderName}`;
          const body = `<p>عزيزي <strong>${recvInfo.rows[0].name}</strong>،</p><p>وصلتك رسالة من <strong>${senderName}</strong>:</p><div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px;margin:16px 0"><div style="font-size:14px;font-weight:700;color:#16213E">${reqInfo.rows[0]?.title||'مشروع'}</div><div style="background:#fff;border-right:3px solid #C9920A;padding:10px 14px;border-radius:6px;font-size:13px;color:#374151;margin-top:8px">"${content.slice(0,200).replace(/</g,'&lt;')}${content.length>200?'...':''}"</div></div>`;
          sendEmail(recvInfo.rows[0].email, subject, emailTpl(subject, body, 'الرد على الرسالة', SITE_URL)).catch(()=>{});
        }
      } catch(e) { console.error('message email:', e.message); }
    }
    res.json(r.rows[0]);
    const newMsg = r.rows[0];
    wsBroadcast(receiver_id, { type:'new_message', message:{...newMsg,sender_name:senderName}, request_id, sender_id:req.user.id, sender_name:senderName });
    wsBroadcast(req.user.id, { type:'message_sent', message:{...newMsg,sender_name:senderName}, request_id });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/messages/unread-count', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT COUNT(*) FROM messages WHERE receiver_id=$1 AND is_read=FALSE', [req.user.id]);
    res.json({ count: parseInt(r.rows[0].count)||0 });
  } catch(e) { console.error('/messages/unread-count:', e); res.json({ count: 0 }); }
});

// ═══ REVIEWS ═══
app.get('/api/reviews/user/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`SELECT rv.*, u.name as reviewer_name, u.profile_image as reviewer_image, rq.title as request_title FROM reviews rv JOIN users u ON rv.reviewer_id=u.id LEFT JOIN requests rq ON rv.request_id=rq.id WHERE rv.reviewed_id=$1 ORDER BY rv.created_at DESC LIMIT 50`, [id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// هل قيّم المستخدم هذا الطلب؟
app.get('/api/requests/:id/my-review', auth, async (req, res) => {
  try {
    const rid = parseInt(req.params.id);
    const r = await pool.query('SELECT id, rating, comment FROM reviews WHERE request_id=$1 AND reviewer_id=$2 LIMIT 1', [rid, req.user.id]);
    res.json(r.rows[0] || null);
  } catch(e) { res.json(null); }
});

app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { request_id, reviewed_id, rating, comment, images } = req.body;
    if (!request_id||!reviewed_id||!rating) return res.status(400).json({ message: 'البيانات ناقصة' });
    if (rating<1||rating>5) return res.status(400).json({ message: 'التقييم من 1 إلى 5' });
    const reqRow = await pool.query('SELECT status, title FROM requests WHERE id=$1', [request_id]);
    if (!reqRow.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (reqRow.rows[0].status !== 'completed') return res.status(400).json({ message: 'يجب أن يكون المشروع مكتملاً' });
    const existing = await pool.query('SELECT id FROM reviews WHERE request_id=$1 AND reviewer_id=$2', [request_id, req.user.id]);
    let row;
    if (existing.rows.length) {
      const upd = await pool.query(`UPDATE reviews SET rating=$1, comment=$2, images=$3, created_at=NOW() WHERE request_id=$4 AND reviewer_id=$5 RETURNING *`, [rating, comment||null, (Array.isArray(images)&&images.length)?images:null, request_id, req.user.id]);
      row = upd.rows[0];
    } else {
      const ins = await pool.query(`INSERT INTO reviews (request_id, reviewer_id, reviewed_id, rating, comment, images, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`, [request_id, req.user.id, reviewed_id, rating, comment||null, (Array.isArray(images)&&images.length)?images:null]);
      row = ins.rows[0];
    }
    const reviewerInfo = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const reviewedInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [reviewed_id]);
    const stars = '⭐'.repeat(rating);
    await notify(reviewed_id, '⭐ تقييم جديد', `حصلت على ${rating} نجوم من ${reviewerInfo.rows[0]?.name||'العميل'}`, 'review', request_id);
    if (reviewedInfo.rows.length && reviewedInfo.rows[0].email) {
      const subject = `⭐ تقييم جديد ${rating===5?'5 نجوم!':`${rating} نجوم`}`;
      const body = `<p>عزيزي <strong>${reviewedInfo.rows[0].name}</strong>،</p><div style="background:#fff8e6;border:1px solid #fde68a;border-radius:10px;padding:18px;margin:16px 0;text-align:center"><div style="font-size:32px;letter-spacing:6px">${stars}</div><div style="font-size:14px;font-weight:700;color:#92400e">${rating} من 5 نجوم</div>${comment?`<div style="margin-top:12px;font-size:13px;color:#374151;text-align:right">"${comment.replace(/</g,'&lt;')}"</div>`:''}</div>`;
      sendEmail(reviewedInfo.rows[0].email, subject, emailTpl(subject, body, 'مشاهدة الملف الشخصي', SITE_URL)).catch(()=>{});
    }
    res.json(row);
  } catch(e) { console.error('POST /api/reviews:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ رد المزود على تقييم ═══
app.post('/api/reviews/:id/reply', auth, providerOnly, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const { reply } = req.body;
    if (!reply || !reply.trim()) return res.status(400).json({ message: 'الرد فارغ' });
    // تأكد أن التقييم موجّه لهذا المزود
    const rv = await pool.query('SELECT reviewed_id, reviewer_id FROM reviews WHERE id=$1', [reviewId]);
    if (!rv.rows.length) return res.status(404).json({ message: 'التقييم غير موجود' });
    if (rv.rows[0].reviewed_id !== req.user.id) return res.status(403).json({ message: 'لا يمكنك الرد على هذا التقييم' });
    const upd = await pool.query('UPDATE reviews SET provider_reply=$1, reply_at=NOW() WHERE id=$2 RETURNING *', [reply.trim(), reviewId]);
    // أشعر العميل بالرد
    try { await notify(rv.rows[0].reviewer_id, 'رد على تقييمك', 'ردّ المزود على تقييمك.', 'review_reply', null); } catch(e){}
    res.json(upd.rows[0]);
  } catch(e) { console.error('review reply:', e.message); res.status(500).json({ message: 'حدث خطأ' }); }
});

// ═══ QUESTIONS & CLARIFICATIONS (الأسئلة والتوضيحات) ═══
// GET: قائمة أسئلة مشروع (عامة، بدون تسجيل دخول)
app.get('/api/requests/:id/questions', async (req, res) => {
  try {
    const r = await pool.query(`SELECT q.id, q.request_id, q.body, q.answer, q.answered_at, q.created_at, q.asker_id, u.name as asker_name, u.role as asker_role, u.profile_image as asker_image FROM request_questions q JOIN users u ON q.asker_id=u.id WHERE q.request_id=$1 ORDER BY q.created_at ASC`, [parseInt(req.params.id)]);
    res.json(r.rows);
  } catch(e) { console.error('GET /questions:', e.message); res.json([]); }
});

// POST: طرح سؤال (أي مستخدم مسجّل — عادةً مزود)
app.post('/api/requests/:id/questions', auth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const body = (req.body.body || req.body.question || '').trim();
    if (!body) return res.status(400).json({ message: 'نص السؤال مطلوب' });
    const reqRow = await pool.query('SELECT client_id, title FROM requests WHERE id=$1', [requestId]);
    if (!reqRow.rows.length) return res.status(404).json({ message: 'المشروع غير موجود' });
    const ins = await pool.query(`INSERT INTO request_questions (request_id, asker_id, body, created_at) VALUES ($1,$2,$3,NOW()) RETURNING *`, [requestId, req.user.id, body]);
    const ownerId = reqRow.rows[0].client_id;
    if (ownerId && String(ownerId) !== String(req.user.id)) {
      const askerInfo = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
      const askerName = askerInfo.rows[0]?.name || 'مزود';
      await notify(ownerId, '❓ سؤال جديد على مشروعك', `${askerName} يسأل عن "${reqRow.rows[0].title}".`, 'new_question', requestId);
    }
    res.json(ins.rows[0]);
  } catch(e) { console.error('POST /questions:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// POST: رد صاحب الطلب على سؤال (المالك فقط)
app.post('/api/requests/:id/questions/:qid/answer', auth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const qid = parseInt(req.params.qid);
    const answer = (req.body.answer || req.body.body || '').trim();
    if (!answer) return res.status(400).json({ message: 'نص الرد مطلوب' });
    const reqRow = await pool.query('SELECT client_id, title FROM requests WHERE id=$1', [requestId]);
    if (!reqRow.rows.length) return res.status(404).json({ message: 'المشروع غير موجود' });
    if (String(reqRow.rows[0].client_id) !== String(req.user.id)) return res.status(403).json({ message: 'صاحب الطلب فقط يمكنه الرد' });
    const upd = await pool.query(`UPDATE request_questions SET answer=$1, answered_at=NOW() WHERE id=$2 AND request_id=$3 RETURNING *`, [answer, qid, requestId]);
    if (!upd.rows.length) return res.status(404).json({ message: 'السؤال غير موجود' });
    const askerId = upd.rows[0].asker_id;
    if (askerId && String(askerId) !== String(req.user.id)) {
      await notify(askerId, '💬 تم الرد على سؤالك', `ردّ صاحب الطلب على سؤالك في "${reqRow.rows[0].title}".`, 'question_answered', requestId);
    }
    res.json(upd.rows[0]);
  } catch(e) { console.error('POST /answer:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ REPORTS, FAVORITES, PROVIDERS ═══
app.post('/api/reports', auth, async (req, res) => {
  try {
    const { reported_id, request_id, type, reason, details } = req.body;
    if (!reason) return res.status(400).json({ message: 'السبب مطلوب' });
    const r = await pool.query(`INSERT INTO reports (reporter_id, reported_id, request_id, type, reason, details, created_at) VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`, [req.user.id, reported_id||null, request_id||null, type||'other', reason, details||null]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/favorites/:providerId', auth, async (req, res) => {
  try { await pool.query(`INSERT INTO favorites (user_id, provider_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [req.user.id, parseInt(req.params.providerId)]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/favorites/:providerId', auth, async (req, res) => {
  try { await pool.query('DELETE FROM favorites WHERE user_id=$1 AND provider_id=$2', [req.user.id, parseInt(req.params.providerId)]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/providers', async (req, res) => {
  try {
    const { category, city, specialty } = req.query;
    let q = `SELECT id, name, city, specialties, badge, tier, bio, profile_image, experience_years, last_bumped_at, created_at, COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0)::float as avg_rating, COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0)::int as review_count, (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed')::int as completed_projects FROM users WHERE role='provider' AND is_active=TRUE`;
    const params = [];
    if (category) { params.push(category); q += ` AND $${params.length}=ANY(specialties)`; }
    if (specialty){ params.push(specialty); q += ` AND $${params.length}=ANY(COALESCE(specialties,'{}'))`; }
    if (city)     { params.push(`%${city}%`); q += ` AND city ILIKE $${params.length}`; }
    q += ` ORDER BY CASE WHEN profile_image IS NOT NULL AND bio IS NOT NULL AND specialties IS NOT NULL AND array_length(specialties,1) > 0 THEN 0 ELSE 1 END ASC, CASE tier WHEN 'expert' THEN 0 WHEN 'distinguished' THEN 1 WHEN 'active' THEN 2 ELSE 3 END ASC, COALESCE(last_bumped_at, created_at) DESC LIMIT 100`;
    const r = await pool.query(q, params);
    res.json(r.rows.map(p => ({ ...p, avg_rating: parseFloat(p.avg_rating)||0, review_count: parseInt(p.review_count)||0, completed_projects: parseInt(p.completed_projects)||0, is_verified: !!(p.profile_image&&p.bio&&(p.specialties||[]).length>0&&(parseFloat(p.avg_rating)||0)>0) })));
  } catch(e) { console.error('GET /api/providers:', e); res.json([]); }
});

app.get('/api/providers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`SELECT id,name,phone,city,specialties,notify_categories,badge,tier,bio,profile_image,experience_years,portfolio_images,business_name,last_active,last_bumped_at,created_at,website,location_url,instagram,twitter,snapchat,tiktok,youtube,COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,(SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as total_bids,(SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects FROM users WHERE id=$1 AND role='provider'`, [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const prov = r.rows[0];
    // اعرض كل الصور (base64 أو http)
    if (Array.isArray(prov.portfolio_images)) {
      prov.portfolio_images = prov.portfolio_images.filter(img => img && img.length > 0);
    }
    res.json(prov);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ NOTIFICATIONS ═══
app.get('/api/notifications', auth, async (req, res) => {
  try { const r=await pool.query(`SELECT id, title, body, type, ref_id, is_read, created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,[req.user.id]); res.json(r.rows); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});
app.get('/api/notifications/count', auth, async (req, res) => {
  try { const r=await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id=$1 AND is_read=FALSE',[req.user.id]); res.json({ count: parseInt(r.rows[0].count) }); } catch(e) { res.json({ count: 0 }); }
});
app.get('/api/notifications/unread-count', auth, async (req, res) => {
  try { const r=await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE',[req.user.id]); res.json({ count: parseInt(r.rows[0].count)||0 }); } catch(e) { console.error('/notifications/unread-count:', e); res.json({ count: 0 }); }
});
app.put('/api/notifications/read', auth, async (req, res) => {
  try { await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE',[req.user.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});
app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try { await pool.query('UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2',[parseInt(req.params.id),req.user.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});
app.delete('/api/notifications/:id', auth, async (req, res) => {
  try { await pool.query('DELETE FROM notifications WHERE id=$1 AND user_id=$2',[parseInt(req.params.id),req.user.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});
app.delete('/api/notifications', auth, async (req, res) => {
  try { await pool.query('DELETE FROM notifications WHERE user_id=$1',[req.user.id]); res.json({ ok: true }); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ PUSH ═══
app.get('/api/push/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) return res.status(503).json({ message: 'Push غير مفعّل' });
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});
app.post('/api/push/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription||!subscription.endpoint||!subscription.keys) return res.status(400).json({ message: 'بيانات الاشتراك غير صحيحة' });
    await pool.query(`INSERT INTO push_tokens(user_id, token, platform) VALUES($1,$2,'web') ON CONFLICT(user_id, token) DO UPDATE SET created_at=NOW()`, [req.user.id, JSON.stringify(subscription)]);
    res.json({ ok: true });
  } catch(e) { console.error('/api/push/subscribe:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});
app.post('/api/push/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      const r=await pool.query(`SELECT id, token FROM push_tokens WHERE user_id=$1 AND platform='web'`,[req.user.id]);
      for (const row of r.rows) { try { const sub=JSON.parse(row.token); if(sub.endpoint===endpoint) await pool.query('DELETE FROM push_tokens WHERE id=$1',[row.id]); } catch(e){} }
    } else { await pool.query(`DELETE FROM push_tokens WHERE user_id=$1 AND platform='web'`,[req.user.id]); }
    res.json({ ok: true });
  } catch(e) { console.error('/api/push/unsubscribe:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});
app.post('/api/push/register-native', auth, async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ message: 'token مطلوب' });
    if (!String(token).startsWith('ExponentPushToken')) return res.status(400).json({ message: 'صيغة token غير صحيحة' });
    const plat = (platform==='ios'||platform==='android') ? platform : 'expo';
    await pool.query(`INSERT INTO push_tokens(user_id, token, platform) VALUES($1,$2,$3) ON CONFLICT(user_id, token) DO UPDATE SET platform=$3, created_at=NOW()`, [req.user.id, token, plat]);
    console.log(`📱 Native push registered: user=${req.user.id}, platform=${plat}`);
    res.json({ ok: true });
  } catch(e) { console.error('/api/push/register-native:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});
app.get('/api/push/status', auth, async (req, res) => {
  try { const r=await pool.query(`SELECT COUNT(*)::int as cnt FROM push_tokens WHERE user_id=$1 AND platform='web'`,[req.user.id]); res.json({ subscribed: r.rows[0].cnt>0, count: r.rows[0].cnt }); } catch(e) { res.json({ subscribed:false, count:0 }); }
});
app.get('/api/push/badge', auth, async (req, res) => {
  try { const r=await pool.query(`SELECT (SELECT COUNT(*)::int FROM notifications WHERE user_id=$1 AND is_read=false)+(SELECT COUNT(*)::int FROM messages WHERE receiver_id=$1 AND (is_read=false OR is_read IS NULL)) AS total`,[req.user.id]); res.json({ badge: r.rows[0]?.total||0 }); } catch(e) { res.json({ badge:0 }); }
});
app.post('/api/push-token', auth, async (req, res) => {
  try { const { token, platform } = req.body; if (!token) return res.status(400).json({ message: 'token مطلوب' }); await pool.query(`INSERT INTO push_tokens(user_id, token, platform) VALUES($1,$2,$3) ON CONFLICT(user_id, token) DO UPDATE SET platform=$3, created_at=NOW()`, [req.user.id, token, platform||'expo']); res.json({ ok: true }); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});
app.delete('/api/push-token', auth, async (req, res) => {
  try { await pool.query('DELETE FROM push_tokens WHERE user_id=$1 AND token=$2',[req.user.id, req.body.token]); res.json({ ok: true }); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ PUBLIC ═══
app.get('/api/categories', (req, res) => { res.json(['برمجة وتطوير','تصميم','كتابة وترجمة','تسويق رقمي','أعمال','هندسة وعمارة','صوتيات ومرئيات','استشارات','تدريب','أخرى']); });
app.get('/api/cities', (req, res) => { res.json(['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الطائف','أبها','تبوك','حائل','بريدة','الأحساء','خميس مشيط','جازان','نجران','الباحة','عرعر','سكاكا','ينبع','القطيف','الجبيل']); });
app.get('/api/stats', async (req, res) => {
  try {
    const s = await Promise.all([pool.query("SELECT COUNT(*) as count FROM requests WHERE status='completed' AND (category IS DISTINCT FROM 'direct')"),pool.query("SELECT COUNT(*) as count FROM users WHERE role='provider' AND is_active=true"),pool.query("SELECT COUNT(*) as count FROM users WHERE role='client' AND is_active=true"),pool.query("SELECT COUNT(*) as count FROM requests WHERE status='open' AND (category IS DISTINCT FROM 'direct')")]);
    res.json({ completed_projects:+s[0].rows[0].count||0, active_providers:+s[1].rows[0].count||0, active_clients:+s[2].rows[0].count||0, open_requests:+s[3].rows[0].count||0 });
  } catch(e) { res.json({ completed_projects:0, active_providers:0, active_clients:0, open_requests:0 }); }
});

// عام: تسجيل مشاهدة صفحة مزوّد (لا يحسب صاحبها)
app.post('/api/pro/:id/view', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if(!id) return res.json({ ok:false });
    await pool.query('UPDATE users SET profile_views = COALESCE(profile_views,0)+1 WHERE id=$1 AND role=$2', [id, 'provider']);
    res.json({ ok:true });
  } catch(e){ res.json({ ok:false }); }
});
// للمزوّد: إحصائيات التسويق الخاصة به (مشاهدات + إحالات)
app.get('/api/me/marketing', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT COALESCE(profile_views,0)::int views, COALESCE(referral_count,0)::int refs FROM users WHERE id=$1', [req.user.id]);
    const row = r.rows[0]||{views:0,refs:0};
    res.json({ views: row.views, referrals: row.refs, shareUrl: SITE_URL+'/pro/'+req.user.id });
  } catch(e){ res.status(500).json({ message:'حدث خطأ' }); }
});

// عام: أحدث المشاريع المنجزة (دليل اجتماعي — بيانات مجهّلة)
// ═══════════ محرّك الاستقطاب (Outreach Engine) ═══════════

// بحث Google Places → نتائج مرشّحة (لا يحفظ)
app.post('/api/admin/leads/search', requirePermission('outreach.manage'), async (req, res) => {
  try {
    const key = process.env.GOOGLE_PLACES_KEY;
    if(!key) return res.status(400).json({ message:'مفتاح Google Places غير مضبوط (GOOGLE_PLACES_KEY)' });
    const q = (req.body.query||'').trim();
    if(!q) return res.status(400).json({ message:'اكتب عبارة البحث' });
    // عدد الصفحات (كل صفحة حتى 20 نتيجة) — بحث مفرد حتى 3، الكنس عادةً 2
    const maxPages = Math.min(Math.max(parseInt(req.body.pages)||1, 1), 3);

    // ملاحظة: لازم nextPageToken في FieldMask وإلا ما يرجع رمز الصفحة التالية
    const fieldMask = 'nextPageToken,places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.primaryTypeDisplayName';
    let raw = [], token = null, pages = 0;
    do {
      const body = { textQuery: q, languageCode:'ar', regionCode:'SA', maxResultCount: 20 };
      if(token) body.pageToken = token;
      const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': fieldMask },
        body: JSON.stringify(body)
      });
      const data = await r.json();
      if(data.error){
        // لو فشلت صفحة تالية، نرجّع اللي جمعناه بدل ما نفشل كلياً
        if(pages === 0) return res.status(400).json({ message: data.error.message || 'فشل البحث' });
        break;
      }
      raw = raw.concat(data.places || []);
      token = data.nextPageToken || null;
      pages++;
      // رمز الصفحة يحتاج لحظة ليصبح صالحاً
      if(token && pages < maxPages) await new Promise(r => setTimeout(r, 700));
    } while(token && pages < maxPages);

    const places = raw.map(p => ({
      place_id: p.id,
      name: (p.displayName && p.displayName.text) || '—',
      phone: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
      phone_norm: normPhone(p.nationalPhoneNumber || p.internationalPhoneNumber),
      address: p.formattedAddress || null,
      rating: p.rating || null,
      reviews_count: p.userRatingCount || 0,
      website: p.websiteUri || null,
      type: (p.primaryTypeDisplayName && p.primaryTypeDisplayName.text) || null
    }));
    // تعليم الموجود مسبقاً
    const ids = places.map(p=>p.place_id).filter(Boolean);
    let existing = [];
    if(ids.length){
      const ex = await pool.query('SELECT place_id FROM leads WHERE place_id = ANY($1)', [ids]);
      existing = ex.rows.map(x=>x.place_id);
    }
    places.forEach(p => { p.exists = existing.includes(p.place_id); p.score = scoreLead(p); });
    res.json({ results: places, count: places.length });
  } catch(e){ console.error('leads/search:', e); res.status(500).json({ message:'تعذّر البحث' }); }
});

// حفظ مستهدفين (دفعة) — يتجاهل المكرّر
app.post('/api/admin/leads', requirePermission('outreach.manage'), async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [req.body];
    const type = req.body.lead_type === 'client' ? 'client' : 'provider';
    let added = 0, skipped = 0;
    for(const it of items){
      const pn = normPhone(it.phone);
      const row = { ...it, phone_norm: pn };
      const sc = scoreLead(row);
      try {
        const r = await pool.query(
          `INSERT INTO leads (lead_type,name,phone,phone_norm,category,city,address,rating,reviews_count,website,place_id,score,created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (place_id) DO NOTHING RETURNING id`,
          [it.lead_type||type, it.name, it.phone||null, pn, it.category||null, it.city||null, it.address||null,
           it.rating||null, it.reviews_count||0, it.website||null, it.place_id||null, sc, req.user.id]
        );
        if(r.rows.length) added++; else skipped++;
      } catch(e){ skipped++; }
    }
    res.json({ added, skipped });
  } catch(e){ console.error('leads add:', e); res.status(500).json({ message:'تعذّر الحفظ' }); }
});

// بنّاء فلاتر المستهدفين (مشترك بين القائمة والتصدير)
// يدعم: الحالة، النوع، المدينة، التخصص، الوسم/التصنيف، بحث نصّي، وشريحة الأولوية
function buildLeadFilter(qp){
  const { status, type, city, category, q, tag, prio } = qp || {};
  const w = [], v = [];
  if(status){ v.push(status); w.push(`status=$${v.length}`); }
  if(type){ v.push(type); w.push(`lead_type=$${v.length}`); }
  if(city){ v.push(city); w.push(`city=$${v.length}`); }
  if(category){ v.push(category); w.push(`category=$${v.length}`); }
  if(tag){ v.push(tag); w.push(`tag=$${v.length}`); }
  if(q){ v.push('%'+q+'%'); w.push(`(name ILIKE $${v.length} OR phone ILIKE $${v.length})`); }
  // شريحة الأولوية — نفس عتبات ألوان الجدول (70 / 45)
  if(prio==='high'){ w.push('score>=70'); }
  else if(prio==='mid'){ w.push('score>=45 AND score<70'); }
  else if(prio==='low'){ w.push('(score<45 OR score IS NULL)'); }
  // «محتمل سجّل» فقط
  if(qp && (qp.maybe==='1' || qp.maybe==='true')){ w.push("maybe_user_id IS NOT NULL AND status<>'converted'"); }
  const where = w.length ? 'WHERE '+w.join(' AND ') : '';
  return { where, v };
}

// قائمة المستهدفين (فلترة)
app.get('/api/admin/leads', requirePermission('outreach.manage'), async (req, res) => {
  try {
    const { where, v } = buildLeadFilter(req.query);
    const r = await pool.query(`SELECT * FROM leads ${where} ORDER BY score DESC, created_at DESC LIMIT 300`, v);
    res.json({ leads: r.rows });
  } catch(e){ console.error('leads list:', e); res.status(500).json({ message:'تعذّر الجلب' }); }
});

// طابور الصيد: التالي (غير متواصل معه) + مطابقة طلب حقيقي
app.get('/api/admin/leads/queue', requirePermission('outreach.manage'), async (req, res) => {
  try {
    const type = req.query.type === 'client' ? 'client' : 'provider';
    const r = await pool.query(
      `SELECT * FROM leads WHERE lead_type=$1 AND status IN ('new','followup')
       AND phone_norm IS NOT NULL
       AND (followup_at IS NULL OR followup_at <= NOW())
       ORDER BY score DESC, created_at ASC LIMIT 25`, [type]);
    const leads = r.rows;
    // مطابقة كل مزوّد بأقرب طلب مفتوح في تخصصه/مدينته
    if(type === 'provider' && leads.length){
      for(const l of leads){
        try {
          const m = await pool.query(
            `SELECT id, title, category, city, budget_max FROM requests
             WHERE status='open' AND ($1::text IS NULL OR city=$1) AND ($2::text IS NULL OR category=$2)
             ORDER BY created_at DESC LIMIT 1`, [l.city||null, l.category||null]);
          l.matched_request = m.rows[0] || null;
        } catch(e){ l.matched_request = null; }
      }
    }
    res.json({ leads, count: leads.length });
  } catch(e){ console.error('leads queue:', e); res.status(500).json({ message:'تعذّر الجلب' }); }
});

// تحديث حالة مستهدف
app.put('/api/admin/leads/:id', requirePermission('outreach.manage'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes, followup_days, category, city, name, phone } = req.body;
    const sets = [], v = [];
    if(name){ v.push(name); sets.push(`name=$${v.length}`); }
    if(phone !== undefined){
      const ph = (phone||'').trim();
      const pn = normPhone(ph);
      if(ph && !pn) return res.status(400).json({ message:'رقم جوال غير صالح' });
      // منع التكرار: نفس الرقم عند مستهدف آخر
      if(pn){
        const dup = await pool.query('SELECT id FROM leads WHERE phone_norm=$1 AND id<>$2 LIMIT 1', [pn, id]);
        if(dup.rows.length) return res.status(400).json({ message:'هذا الجوال مسجّل عند مستهدف آخر' });
      }
      v.push(ph||null); sets.push(`phone=$${v.length}`);
      v.push(pn); sets.push(`phone_norm=$${v.length}`);
    }
    if(status){
      v.push(status); sets.push(`status=$${v.length}`);
      if(status==='contacted'){ sets.push('contacted_at=NOW()'); sets.push('contact_count=COALESCE(contact_count,0)+1'); }
      if(status==='replied'||status==='interested'){ sets.push('replied_at=NOW()'); }
    }
    if(notes !== undefined){ v.push(notes); sets.push(`notes=$${v.length}`); }
    if(category !== undefined){ v.push(category); sets.push(`category=$${v.length}`); }
    if(city !== undefined){ v.push(city); sets.push(`city=$${v.length}`); }
    if(followup_days){ v.push(parseInt(followup_days)); sets.push(`followup_at=NOW() + ($${v.length} || ' days')::interval`); }
    sets.push('updated_at=NOW()');
    if(!sets.length) return res.json({ ok:true });
    v.push(id);
    const r = await pool.query(`UPDATE leads SET ${sets.join(',')} WHERE id=$${v.length} RETURNING *`, v);
    res.json({ lead: r.rows[0] });
  } catch(e){ console.error('leads update:', e); res.status(500).json({ message:'تعذّر التحديث' }); }
});

// حذف مستهدف
app.delete('/api/admin/leads/:id', requirePermission('outreach.manage'), async (req, res) => {
  try { await pool.query('DELETE FROM leads WHERE id=$1', [parseInt(req.params.id)]); res.json({ ok:true }); }
  catch(e){ res.status(500).json({ message:'تعذّر الحذف' }); }
});

// إحصائيات الاستقطاب
// إضافة يدوية/دفعة بكشف التكرار (بالرقم)
app.post('/api/admin/leads/manual', requirePermission('outreach.manage'), async (req, res) => {
  try{
    var items = Array.isArray(req.body.items) ? req.body.items : [req.body];
    var type = req.body.lead_type==='client'?'client':'provider';
    var added=0, dup=0, invalid=0;
    for(const it of items){
      var pn = normPhone(it.phone);
      if(!it.name || !pn){ invalid++; continue; }
      // كشف التكرار بالرقم
      var ex = await pool.query('SELECT id FROM leads WHERE phone_norm=$1 LIMIT 1', [pn]);
      if(ex.rows.length){ dup++; continue; }
      var row = { rating:it.rating||null, reviews_count:it.reviews_count||0, website:it.website||null, phone_norm:pn };
      var sc = scoreLead(row);
      await pool.query(
        `INSERT INTO leads (lead_type,name,phone,phone_norm,category,city,rating,reviews_count,website,score,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [it.lead_type||type, it.name, it.phone, pn, it.category||null, it.city||null, it.rating||null, it.reviews_count||0, it.website||null, sc, req.user.id]
      );
      added++;
    }
    res.json({ added, dup, invalid });
  }catch(e){ console.error('leads/manual:', e); res.status(500).json({ message:'تعذّر الإضافة' }); }
});

// عدّاد الرسائل المُرسلة اليوم (حماية من الحظر)
app.get('/api/admin/leads/sent-today', requirePermission('outreach.manage'), async (req, res) => {
  try{
    var r = await pool.query(`SELECT COUNT(*)::int n FROM leads WHERE contacted_at >= CURRENT_DATE`);
    res.json({ count: r.rows[0].n, limit: 50 });
  }catch(e){ res.json({ count:0, limit:50 }); }
});

// وسم مستهدف (جاد/مهتم/محتمل)
app.put('/api/admin/leads/:id/tag', requirePermission('outreach.manage'), async (req, res) => {
  try{
    var tag = req.body.tag || null;
    await pool.query('UPDATE leads SET tag=$1, updated_at=NOW() WHERE id=$2', [tag, parseInt(req.params.id)]);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ message:'تعذّر' }); }
});

// تأكيد «محتمل سجّل» ← تحويل مؤكّد
app.post('/api/admin/leads/:id/confirm-match', requirePermission('outreach.manage'), async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const r = await pool.query(
      `UPDATE leads SET status='converted', converted_user_id=maybe_user_id, converted_at=NOW(),
        maybe_user_id=NULL, maybe_at=NULL, updated_at=NOW()
       WHERE id=$1 RETURNING *`, [id]);
    const lead = r.rows[0];
    if(lead && lead.converted_user_id) await transferCardToUser(lead.converted_user_id, lead);
    res.json({ lead });
  }catch(e){ res.status(500).json({ message:'تعذّر التأكيد' }); }
});

// رفض «محتمل سجّل» ← إزالة الإشارة فقط
app.post('/api/admin/leads/:id/dismiss-match', requirePermission('outreach.manage'), async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    await pool.query('UPDATE leads SET maybe_user_id=NULL, maybe_at=NULL, updated_at=NOW() WHERE id=$1', [id]);
    res.json({ ok:true });
  }catch(e){ res.status(500).json({ message:'تعذّر' }); }
});

// تصدير المستهدفين (JSON للتحويل إلى CSV بالواجهة)
app.get('/api/admin/leads/export', requirePermission('outreach.manage'), async (req, res) => {
  try{
    const { where, v } = buildLeadFilter(req.query);
    var r = await pool.query(`SELECT name,phone,category,city,rating,reviews_count,status,tag,score,notes,created_at FROM leads ${where} ORDER BY created_at DESC`, v);
    res.json({ leads: r.rows });
  }catch(e){ res.status(500).json({ message:'تعذّر التصدير' }); }
});

// متابعات اليوم (مستحقة)
app.get('/api/admin/leads/due-today', requirePermission('outreach.manage'), async (req, res) => {
  try{
    var r = await pool.query(
      `SELECT * FROM leads WHERE followup_at IS NOT NULL AND followup_at <= NOW()
       AND status NOT IN ('converted','rejected') ORDER BY followup_at ASC LIMIT 50`);
    res.json({ leads: r.rows });
  }catch(e){ res.status(500).json({ message:'تعذّر' }); }
});

app.get('/api/admin/leads/stats', requirePermission('outreach.manage'), async (req, res) => {
  try {
    const s = await pool.query(`SELECT status, lead_type, COUNT(*)::int n FROM leads GROUP BY status, lead_type`);
    const tot = await pool.query(`SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE status='contacted')::int contacted,
      COUNT(*) FILTER (WHERE status IN ('replied','interested'))::int replied,
      COUNT(*) FILTER (WHERE status='converted')::int converted,
      COUNT(*) FILTER (WHERE status='rejected')::int rejected,
      COUNT(*) FILTER (WHERE followup_at IS NOT NULL AND followup_at <= NOW() AND status NOT IN ('converted','rejected'))::int due
      FROM leads`);
    const t = tot.rows[0];
    const sent = (t.contacted||0) + (t.replied||0) + (t.converted||0) + (t.rejected||0);
    // مقاييس الطلب — الرقم اللي يهم فعلاً
    let dem = { req_today:0, req_week:0, req_month:0, req_open:0 };
    try{
      const rq = await pool.query(`SELECT
        COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int req_today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int req_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int req_month,
        COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled','rejected'))::int req_open
        FROM requests`);
      dem = rq.rows[0] || dem;
    }catch(e){}
    res.json({
      ...t,
      sent,
      reply_rate: sent ? Math.round(((t.replied+t.converted)/sent)*100) : 0,
      convert_rate: sent ? Math.round((t.converted/sent)*100) : 0,
      ...dem,
      breakdown: s.rows
    });
  } catch(e){ console.error('leads stats:', e); res.status(500).json({ message:'تعذّر الجلب' }); }
});

// خريطة الفجوات: طلبات مفتوحة بلا تغطية مزودين كافية
// ═══ محرّك الاستقطاب: ذكاء Claude ═══
async function callClaude(system, user, maxTokens){
  const key = process.env.ANTHROPIC_API_KEY;
  if(!key) return null;
  try{
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens: maxTokens||400,
        system: system,
        messages:[{ role:'user', content:user }]
      })
    });
    const data = await r.json();
    if(data && data.content && data.content[0] && data.content[0].text) return data.content[0].text.trim();
    return null;
  }catch(e){ console.error('claude:', e.message); return null; }
}

// توليد رسالة أولى مخصّصة
app.post('/api/admin/leads/:id/gen-message', requirePermission('outreach.manage'), async (req, res) => {
  try{
    const r = await pool.query('SELECT * FROM leads WHERE id=$1', [parseInt(req.params.id)]);
    const l = r.rows[0];
    if(!l) return res.status(404).json({ message:'غير موجود' });
    let matched = null;
    if(l.lead_type==='provider'){
      const m = await pool.query(`SELECT title,category,city,budget_max FROM requests WHERE status='open' AND ($1::text IS NULL OR city=$1) AND ($2::text IS NULL OR category=$2) ORDER BY created_at DESC LIMIT 1`, [l.city||null, l.category||null]);
      matched = m.rows[0] || null;
    }
    const sys = 'أنت خبير تسويق سعودي لمنصة «مناقصة» (منصة تربط العملاء بمزودي الخدمات). اكتب رسالة واتساب قصيرة (٣-٤ أسطر) بلهجة سعودية مهذبة واحترافية لدعوة منشأة للانضمام. الرسالة تعطي قيمة قبل الطلب، شخصية، وتنتهي بسؤال بسيط. لا تكتب أي شيء غير الرسالة نفسها. ضمّن الرابط https://www.manaqasa.com';
    let usr = 'نوع المستهدف: '+(l.lead_type==='client'?'عميل محتمل (شركة تحتاج خدمات)':'مزوّد خدمة')+'\nالاسم: '+l.name+'\nالتخصص: '+(l.category||'غير محدد')+'\nالمدينة: '+(l.city||'غير محدد')+'\nالتقييم: '+(l.rating||'—');
    if(matched) usr += '\n\nيوجد طلب حقيقي مطابق يمكن ذكره كطُعم: «'+matched.title+'»'+(matched.budget_max?' بميزانية '+matched.budget_max+' ريال':'')+' في '+(matched.city||'')+'. اذكره لجذبه.';
    const msg = await callClaude(sys, usr, 300);
    if(!msg) return res.json({ message:null, fallback:true });
    res.json({ message: msg });
  }catch(e){ console.error('gen-message:', e); res.status(500).json({ message:'تعذّر التوليد' }); }
});

// تحليل رد المزوّد + صياغة الرد المناسب
app.post('/api/admin/leads/:id/analyze-reply', requirePermission('outreach.manage'), async (req, res) => {
  try{
    const reply = (req.body.reply||'').trim();
    if(!reply) return res.status(400).json({ message:'الصق رد المزوّد' });
    const r = await pool.query('SELECT * FROM leads WHERE id=$1', [parseInt(req.params.id)]);
    const l = r.rows[0] || {};
    const sys = 'أنت مساعد مبيعات لمنصة «مناقصة» السعودية. حلّل رد المستهدف وصنّفه، ثم اكتب رداً مقترحاً بلهجة سعودية مهذبة. أجب حصراً بصيغة JSON صالحة بدون أي نص إضافي، بهذا الشكل: {"intent":"interested|price_question|hesitant|rejected|later|unclear","summary":"ملخص قصير","suggested_reply":"الرد المقترح للإرسال","followup_days":عدد}. القيم الممكنة لـ intent: interested (مهتم)، price_question (يسأل عن السعر/العمولة)، hesitant (متردد)، rejected (رفض)، later (لاحقاً)، unclear (غير واضح). followup_days: عدد أيام المتابعة المقترح (0 لو لا حاجة).';
    const usr = 'المستهدف: '+(l.name||'')+' ('+(l.category||'')+' - '+(l.city||'')+')\n\nرده على رسالتنا:\n"'+reply+'"';
    const raw = await callClaude(sys, usr, 500);
    if(!raw) return res.json({ fallback:true });
    let parsed = null;
    try{ parsed = JSON.parse(raw.replace(/```json|```/g,'').trim()); }catch(e){ parsed = { intent:'unclear', summary:raw.slice(0,120), suggested_reply:'', followup_days:3 }; }
    // حدّث حالة المستهدف حسب التصنيف
    const map = { interested:'interested', price_question:'interested', hesitant:'replied', rejected:'rejected', later:'followup', unclear:'replied' };
    const newStatus = map[parsed.intent] || 'replied';
    try{
      const fd = parseInt(parsed.followup_days)||0;
      await pool.query(`UPDATE leads SET status=$1, replied_at=NOW(), updated_at=NOW(), notes=COALESCE(notes,'')||$2 ${fd>0?", followup_at=NOW() + ($3 || ' days')::interval":''} WHERE id=$4`,
        fd>0 ? [newStatus, '\n[رد]: '+(parsed.summary||''), fd, l.id] : [newStatus, '\n[رد]: '+(parsed.summary||''), l.id]);
    }catch(e){}
    res.json({ analysis: parsed });
  }catch(e){ console.error('analyze-reply:', e); res.status(500).json({ message:'تعذّر التحليل' }); }
});

app.get('/api/admin/coverage-gaps', requirePermission('outreach.manage'), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.id, r.title, r.category, r.city, r.budget_max, r.created_at,
        (SELECT COUNT(*)::int FROM users u WHERE u.role='provider' AND u.is_active=true
          AND (u.city = r.city) AND (u.specialties IS NULL OR r.category = ANY(u.specialties))) AS providers,
        (SELECT COUNT(*)::int FROM bids b WHERE b.request_id = r.id) AS bids
      FROM requests r
      WHERE r.status='open'
      ORDER BY providers ASC, r.created_at DESC
      LIMIT 30`);
    const gaps = r.rows.filter(x => (x.providers||0) < 3);
    res.json({ gaps, all: r.rows });
  } catch(e){ console.error('coverage-gaps:', e); res.status(500).json({ message:'تعذّر الجلب' }); }
});

app.get('/api/showcase', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT r.title, r.category, r.city, r.completed_at,
              (SELECT COUNT(*) FROM bids b WHERE b.request_id=r.id)::int AS offers
       FROM requests r
       WHERE r.status='completed' AND r.completed_at IS NOT NULL
         AND (r.category IS DISTINCT FROM 'direct')
       ORDER BY r.completed_at DESC LIMIT 8`);
    res.set('Cache-Control','public, max-age=300');
    res.json(r.rows.map(x=>({ title:x.title, category:x.category||'', city:x.city||'', offers:x.offers||0 })));
  } catch(e){ res.json([]); }
});

// ═══ ADMIN ═══
app.get('/api/admin/logs', requirePermission('logs.view'), async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT 200');
    res.json(r.rows);
  } catch(e) { console.error('admin logs:', e.message); res.status(500).json({ message: 'حدث خطأ' }); }
});

app.get('/api/admin/stats', requirePermission('dashboard.view'), async (req, res) => {
  try {
    const q = (sql) => pool.query(sql).then(r => +r.rows[0].count);
    const [
      users, requests, bids, providers, clients, pending, inProgress, completed,
      todayUsers, todayProviders, todayClients, todayRequests, todayBids,
      weekUsers, weekRequests, monthUsers, monthRequests, verified, activeProviders
    ] = await Promise.all([
      q('SELECT COUNT(*) FROM users'),
      q('SELECT COUNT(*) FROM requests'),
      q('SELECT COUNT(*) FROM bids'),
      q(`SELECT COUNT(*) FROM users WHERE role='provider'`),
      q(`SELECT COUNT(*) FROM users WHERE role='client'`),
      q(`SELECT COUNT(*) FROM requests WHERE status IN ('pending_review','review')`),
      q(`SELECT COUNT(*) FROM requests WHERE status='in_progress'`),
      q(`SELECT COUNT(*) FROM requests WHERE status='completed'`),
      q(`SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE`),
      q(`SELECT COUNT(*) FROM users WHERE role='provider' AND created_at::date = CURRENT_DATE`),
      q(`SELECT COUNT(*) FROM users WHERE role='client' AND created_at::date = CURRENT_DATE`),
      q(`SELECT COUNT(*) FROM requests WHERE created_at::date = CURRENT_DATE`),
      q(`SELECT COUNT(*) FROM bids WHERE created_at::date = CURRENT_DATE`),
      q(`SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`),
      q(`SELECT COUNT(*) FROM requests WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`),
      q(`SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`),
      q(`SELECT COUNT(*) FROM requests WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`),
      q(`SELECT COUNT(*) FROM users WHERE badge='verified'`),
      q(`SELECT COUNT(DISTINCT provider_id) FROM bids`)
    ]);
    // آخر 7 أيام (تسجيلات يومية)
    const daily = await pool.query(`
      SELECT created_at::date as day, COUNT(*)::int as n
      FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY created_at::date ORDER BY day`);
    // ═══ سلاسل زمنية: شهري (12 شهر) + سنوي (5 سنوات) ═══
    let monthly={rows:[]}, yearly={rows:[]}, dailyReq={rows:[]};
    try {
      monthly = await pool.query(`
        SELECT to_char(date_trunc('month', created_at),'YYYY-MM') as period,
               COUNT(*)::int as users,
               COUNT(*) FILTER (WHERE role='provider')::int as providers
        FROM users WHERE created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'
        GROUP BY period ORDER BY period`);
    } catch(e){ console.error('monthly:', e.message); }
    try {
      yearly = await pool.query(`
        SELECT to_char(date_trunc('year', created_at),'YYYY') as period,
               COUNT(*)::int as users
        FROM users WHERE created_at >= date_trunc('year', CURRENT_DATE) - INTERVAL '4 years'
        GROUP BY period ORDER BY period`);
    } catch(e){ console.error('yearly:', e.message); }
    try {
      dailyReq = await pool.query(`
        SELECT created_at::date as day, COUNT(*)::int as n
        FROM requests WHERE created_at >= CURRENT_DATE - INTERVAL '6 days'
        GROUP BY created_at::date ORDER BY day`);
    } catch(e){ console.error('dailyReq:', e.message); }
    // أكثر التخصصات (محمي — لو فشل لا يكسر باقي الإحصائيات)
    let topSpecs={rows:[]}, topCities={rows:[]};
    try {
      topSpecs = await pool.query(`
        SELECT unnest(specialties) as spec, COUNT(*)::int as n
        FROM users WHERE role='provider' AND specialties IS NOT NULL
        GROUP BY spec ORDER BY n DESC LIMIT 5`);
    } catch(e) { console.error('topSpecs:', e.message); }
    try {
      topCities = await pool.query(`
        SELECT city, COUNT(*)::int as n FROM users WHERE city IS NOT NULL AND city<>''
        GROUP BY city ORDER BY n DESC LIMIT 5`);
    } catch(e) { console.error('topCities:', e.message); }
    res.json({
      total_users:users, requests, total_bids:bids, providers, clients,
      pending_review:pending, in_progress:inProgress, completed, verified, active_providers:activeProviders,
      today:{ users:todayUsers, providers:todayProviders, clients:todayClients, requests:todayRequests, bids:todayBids },
      week:{ users:weekUsers, requests:weekRequests },
      month:{ users:monthUsers, requests:monthRequests },
      daily_signups: daily.rows,
      daily_requests: dailyReq.rows,
      monthly_signups: monthly.rows,
      yearly_signups: yearly.rows,
      top_specialties: topSpecs.rows,
      top_cities: topCities.rows
    });
  } catch(e) { console.error('stats:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ كل العروض (للأدمن) مع فلترة ═══
app.get('/api/admin/bids', requirePermission('bids.view'), async (req, res) => {
  try {
    const { status, provider_id, request_id } = req.query;
    const conds = []; const params = []; let i = 1;
    if (status) { params.push(status); conds.push(`b.status=$${i}`); i++; }
    if (provider_id) { params.push(parseInt(provider_id)); conds.push(`b.provider_id=$${i}`); i++; }
    if (request_id) { params.push(parseInt(request_id)); conds.push(`b.request_id=$${i}`); i++; }
    const where = conds.length ? 'WHERE '+conds.join(' AND ') : '';
    const r = await pool.query(`
      SELECT b.id, b.request_id, b.provider_id, b.price, b.days, b.note, b.status, b.created_at,
        u.name as provider_name, u.business_name as provider_business, u.city as provider_city,
        rq.title as request_title, rq.client_id,
        cu.name as client_name
      FROM bids b
      JOIN users u ON b.provider_id=u.id
      JOIN requests rq ON b.request_id=rq.id
      LEFT JOIN users cu ON rq.client_id=cu.id
      ${where} ORDER BY b.created_at DESC LIMIT 200`, params);
    res.json(r.rows);
  } catch(e) { console.error('admin bids:', e.message); res.status(500).json({ message: 'حدث خطأ' }); }
});

// ═══ تعديل عرض (أدمن) ═══
app.put('/api/admin/bids/:id', requirePermission('bids.edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { price, days, note, status } = req.body;
    const sets = []; const params = []; let i = 1;
    if (price !== undefined) { params.push(Number(price)); sets.push(`price=$${i}`); i++; }
    if (days !== undefined) { params.push(parseInt(days)); sets.push(`days=$${i}`); i++; }
    if (note !== undefined) { params.push(note); sets.push(`note=$${i}`); i++; }
    if (status !== undefined) { params.push(status); sets.push(`status=$${i}`); i++; }
    if (!sets.length) return res.status(400).json({ message: 'لا يوجد تعديل' });
    params.push(id);
    const r = await pool.query(`UPDATE bids SET ${sets.join(',')} WHERE id=$${i} RETURNING *`, params);
    if (!r.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    await logAdmin(req, 'edit_bid', 'bid', id, 'تعديل عرض');
    res.json(r.rows[0]);
  } catch(e) { console.error('edit bid:', e.message); res.status(500).json({ message: 'حدث خطأ' }); }
});

// ═══ حذف عرض (أدمن) ═══
app.delete('/api/admin/bids/:id', requirePermission('bids.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query('DELETE FROM bids WHERE id=$1 RETURNING id', [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    await logAdmin(req, 'delete_bid', 'bid', id, 'حذف عرض');
    res.json({ ok: true });
  } catch(e) { console.error('del bid:', e.message); res.status(500).json({ message: 'حدث خطأ' }); }
});

app.get('/api/admin/users', requirePermission('users.view'), async (req, res) => {
  try {
    const { role } = req.query; const VALID = ['client','provider','admin'];
    let q = `SELECT u.id,u.name,u.email,u.phone,u.role,u.specialties,u.notify_categories,u.city,u.bio,u.badge,u.tier,u.tier_locked,u.is_active,u.experience_years,u.profile_image,u.created_at,(SELECT COUNT(*) FROM requests WHERE client_id=u.id) as request_count,(SELECT COUNT(*) FROM requests WHERE client_id=u.id AND status='completed') as completed_requests,(SELECT COUNT(*) FROM bids WHERE provider_id=u.id) as bid_count,(SELECT COUNT(*) FROM requests WHERE assigned_provider_id=u.id AND status='completed') as completed_projects,COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=u.id),0) as avg_rating,COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=u.id),0) as review_count FROM users u`;
    const params = [];
    if (role && VALID.includes(role)) { params.push(role); q += ' WHERE u.role=$1'; }
    q += ' ORDER BY u.created_at DESC';
    const r = await pool.query(q, params); res.json(r.rows);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/admin/users/:id', requirePermission('users.edit'), async (req, res) => {
  try {
    const uid = parseInt(req.params.id);
    { const g = await guardUserTarget(req, uid); if (g) return res.status(g.code).json({ message: g.message }); }
    const { name, email, phone, city, bio, business_name } = req.body || {};
    if (email) { const dup = await pool.query('SELECT id FROM users WHERE email=$1 AND id<>$2', [email, uid]); if (dup.rows.length) return res.status(409).json({ message: 'الإيميل مستخدم لحساب آخر' }); }
    const r = await pool.query(`UPDATE users SET name=COALESCE(NULLIF($1,''),name), email=COALESCE(NULLIF($2,''),email), phone=$3, city=$4, bio=$5, business_name=$6 WHERE id=$7 RETURNING id, name, email`, [name||'', email||'', phone||null, city||null, bio||null, business_name||null, uid]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    await logAdmin(req, 'edit_user', 'user', uid, 'تعديل بيانات: ' + (r.rows[0].name||''));
    res.json(r.rows[0]);
  } catch(e) { console.error('edit user:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/admin/users/:id/toggle', requirePermission('users.edit'), async (req, res) => {
  try {
    const uid = parseInt(req.params.id);
    if (uid===req.user.id) return res.status(400).json({ message: 'لا يمكن تعديل حسابك' });
    { const g = await guardUserTarget(req, uid); if (g) return res.status(g.code).json({ message: g.message }); }
    const r = await pool.query(`UPDATE users SET is_active=NOT is_active WHERE id=$1 AND role!='admin' RETURNING id, name, is_active`, [uid]);
    if(r.rows.length) await logAdmin(req, r.rows[0].is_active?'activate_user':'ban_user', 'user', uid, r.rows[0].is_active?'تفعيل حساب':'إيقاف حساب');
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/admin/users/:id/role', requirePermission('users.role'), async (req, res) => {
  try {
    const uid = parseInt(req.params.id);
    const { role } = req.body;
    { const g = await guardUserTarget(req, uid); if (g) return res.status(g.code).json({ message: g.message }); }
    if (!['client','provider'].includes(role)) return res.status(400).json({ message: 'دور غير صالح' });
    if (uid === req.user.id) return res.status(400).json({ message: 'لا يمكن تغيير دورك' });
    // عند التحويل لمزود، ألغِ إسناده كمزود في مشاريع (تنظيف)
    const r = await pool.query(`UPDATE users SET role=$1 WHERE id=$2 AND role!='admin' RETURNING id, name, role`, [role, uid]);
    if (!r.rows.length) return res.status(404).json({ message: 'المستخدم غير موجود' });
    await logAdmin(req, 'change_role', 'user', uid, 'تغيير الدور إلى '+role);
    res.json(r.rows[0]);
  } catch(e) { console.error('change role:', e.message); res.status(500).json({ message: 'حدث خطأ' }); }
});

app.put('/api/admin/users/:id/badge', requirePermission('users.badge'), async (req, res) => {
  try {
    const uid = parseInt(req.params.id); const { badge } = req.body;
    { const g = await guardUserTarget(req, uid); if (g) return res.status(g.code).json({ message: g.message }); }
    const r = await pool.query(`UPDATE users SET badge=$1 WHERE id=$2 AND role!='admin' RETURNING id,name,badge`, [badge, uid]);
    await logAdmin(req, 'set_badge', 'user', uid, 'تغيير التوثيق إلى '+(badge||'بدون'));
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (badge && badge !== 'none') await notify(uid, '🏆 وسام جديد', `حصلت على وسام: ${badge}`, 'badge', null);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/admin/users/:id/tier', requirePermission('users.badge'), async (req, res) => {
  try {
    const uid = parseInt(req.params.id); let { tier, locked, lock_only, auto } = req.body;
    { const g = await guardUserTarget(req, uid); if (g) return res.status(g.code).json({ message: g.message }); }
    const cur = await pool.query("SELECT tier, tier_locked FROM users WHERE id=$1 AND role='provider'", [uid]);
    if (!cur.rows.length) return res.status(404).json({ message: 'المزود غير موجود' });
    const oldTier = cur.rows[0].tier || 'new';

    // فكّ التثبيت → رجوع تلقائي فوري حسب الصفقات
    if (auto === true) {
      const c = await pool.query("SELECT COUNT(*)::int AS n FROM requests WHERE assigned_provider_id=$1 AND status='completed'", [uid]);
      const autoTier = tierFromCompleted(c.rows[0] && c.rows[0].n);
      const r = await pool.query(`UPDATE users SET tier=$1, tier_locked=FALSE WHERE id=$2 AND role='provider' RETURNING id,name,tier,tier_locked`, [autoTier, uid]);
      await logAdmin(req, 'set_tier', 'user', uid, 'إلغاء تثبيت المستوى (تلقائي: '+(TIER_LABELS[autoTier]||autoTier)+')');
      return res.json(r.rows[0]);
    }
    // تثبيت المستوى الحالي فقط دون تغييره
    if (lock_only === true) {
      const r = await pool.query(`UPDATE users SET tier_locked=TRUE WHERE id=$2 AND role='provider' RETURNING id,name,tier,tier_locked`, [null, uid]);
      await logAdmin(req, 'set_tier', 'user', uid, 'تثبيت المستوى الحالي ('+(TIER_LABELS[oldTier]||oldTier)+')');
      return res.json(r.rows[0]);
    }

    const VALID = ['new','active','distinguished','expert'];
    if (!VALID.includes(tier)) return res.status(400).json({ message: 'مستوى غير صالح' });
    // ضبط يدوي للمستوى = يثبّته افتراضياً (إلا لو طُلب غير ذلك)
    const willLock = (locked === false) ? false : true;
    const r = await pool.query(`UPDATE users SET tier=$1, tier_locked=$2 WHERE id=$3 AND role='provider' RETURNING id,name,tier,tier_locked`, [tier, willLock, uid]);
    await logAdmin(req, 'set_tier', 'user', uid, 'ضبط المستوى إلى '+(TIER_LABELS[tier]||tier)+(willLock?' (مثبّت)':''));
    if ((TIER_RANK[tier]||0) > (TIER_RANK[oldTier]||0)) {
      try { await notify(uid, 'تم ترقيتك لمستوى جديد', 'تمت ترقيتك إلى مستوى «'+(TIER_LABELS[tier]||tier)+'» — يظهر الآن للعملاء على عروضك.', 'tier_up', null); } catch(e){}
    }
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/admin/users/:id', requirePermission('users.delete'), async (req, res) => {
  const uid = parseInt(req.params.id);
  try {
    if (!uid) return res.status(400).json({ message: 'معرف غير صحيح' });
    if (uid===req.user.id) return res.status(400).json({ message: 'لا يمكنك حذف حسابك' });
    { const g = await guardUserTarget(req, uid); if (g) return res.status(g.code).json({ message: g.message }); }
    if (uid===req.user.id) return res.status(400).json({ message: 'لا يمكن حذف حسابك' });
    const chk = await pool.query('SELECT id, name, email, role FROM users WHERE id=$1', [uid]);
    if (!chk.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (chk.rows[0].role==='admin') return res.status(403).json({ message: 'لا يمكن حذف المديرين' });
    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM bids WHERE provider_id=$1', [uid]);
      await pool.query('DELETE FROM reviews WHERE reviewer_id=$1 OR reviewed_id=$1', [uid]);
      await pool.query('DELETE FROM notifications WHERE user_id=$1', [uid]);
      await pool.query('DELETE FROM messages WHERE sender_id=$1 OR receiver_id=$1', [uid]);
      await pool.query('DELETE FROM reports WHERE reporter_id=$1 OR reported_id=$1', [uid]);
      try { await pool.query('DELETE FROM favorites WHERE user_id=$1 OR provider_id=$1', [uid]); } catch(e){}
      try { await pool.query('DELETE FROM push_tokens WHERE user_id=$1', [uid]); } catch(e){}
      const urs = await pool.query('SELECT id FROM requests WHERE client_id=$1', [uid]);
      for (const r of urs.rows) await pool.query('DELETE FROM bids WHERE request_id=$1', [r.id]);
      await pool.query('DELETE FROM requests WHERE client_id=$1', [uid]);
      if (chk.rows[0].role==='provider') await pool.query('UPDATE requests SET assigned_provider_id=NULL WHERE assigned_provider_id=$1', [uid]);
      const del = await pool.query('DELETE FROM users WHERE id=$1', [uid]);
      if (del.rowCount===0) throw new Error('فشل الحذف');
      await pool.query('COMMIT'); res.json({ ok: true, deleted_user: chk.rows[0] });
    } catch(e) { await pool.query('ROLLBACK'); throw e; }
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/admin/providers', requirePermission('users.view'), async (req, res) => {
  try {
    const r = await pool.query(`SELECT id,name,email,phone,city,specialties,notify_categories,badge,is_active,bio,profile_image,created_at,COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,(SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as bid_count,(SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects FROM users WHERE role='provider' ORDER BY avg_rating DESC`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/admin/requests', requirePermission('requests.view'), async (req, res) => {
  try {
    const { status } = req.query;
    let q = `SELECT r.*, u.name as client_name, p.name as provider_name, COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count FROM requests r JOIN users u ON r.client_id=u.id LEFT JOIN users p ON r.assigned_provider_id=p.id WHERE (r.category IS DISTINCT FROM 'direct')`;
    const params = [];
    if (status) { if (status==='pending_review') q+=` AND r.status IN ('pending_review','review')`; else { params.push(status); q+=' AND r.status=$1'; } }
    q += ' ORDER BY r.created_at DESC';
    const r = await pool.query(q, params); res.json(r.rows.map(x=>({...x,status:normalizeStatus(x.status)})));
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/admin/requests/:id/review', requirePermission('requests.review'), async (req, res) => {
  try {
    const id = parseInt(req.params.id); const { action, reason } = req.body;
    if (!['approve','reject'].includes(action)) return res.status(400).json({ message: 'إجراء غير صحيح' });
    const newStatus = action==='approve' ? 'open' : 'rejected';
    const r = await pool.query(`UPDATE requests SET status=$1, admin_notes=COALESCE($2, admin_notes) WHERE id=$3 RETURNING id, client_id, title, category, city, status`, [newStatus, reason||null, id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const row = r.rows[0];
    const clientInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [row.client_id]);
    const inAppTitle = action==='approve' ? '✅ تمت الموافقة على مشروعك' : '❌ تم رفض مشروعك';
    const inAppBody = action==='approve' ? `مشروعك "${row.title}" متاح للعروض الآن` : `مشروعك "${row.title}" تم رفضه${reason?': '+reason:''}`;
    await logAdmin(req, 'review_request', 'request', id, action==='approve'?'الموافقة على مشروع':'رفض مشروع');
    await notify(row.client_id, inAppTitle, inAppBody, 'request', id);
    if (clientInfo.rows.length && clientInfo.rows[0].email) {
      const body = action==='approve' ? `<p>تمت الموافقة على مشروعك "<strong>${row.title}</strong>" ونشره على المنصة.</p>` : `<p>للأسف، تم رفض مشروعك "<strong>${row.title}</strong>"${reason?`<br><strong>السبب:</strong> ${reason}`:''}.</p>`;
      sendEmail(clientInfo.rows[0].email, inAppTitle, emailTpl(inAppTitle, body, 'فتح المنصة', SITE_URL+'/dashboard-client.html')).catch(()=>{});
    }
    res.json(row);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/admin/requests/:id/complete', requirePermission('requests.edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`UPDATE requests SET status='completed', completed_at=NOW() WHERE id=$1 RETURNING id, client_id, assigned_provider_id, title`, [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const row = r.rows[0];
    await logAdmin(req, 'complete_request', 'request', id, 'إنهاء مشروع: ' + (row.title||''));
    await notify(row.client_id, 'مشروع مكتمل', `مشروعك "${row.title}" تم إنهاؤه`, 'request', id);
    if (row.assigned_provider_id) await notify(row.assigned_provider_id, 'مشروع مكتمل', `المشروع "${row.title}" تم إنهاؤه`, 'request', id);
    res.json(row);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/admin/requests/:id', requirePermission('requests.edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id); const { title, description, category, city, budget_max, deadline, admin_notes } = req.body;
    const r = await pool.query(`UPDATE requests SET title=COALESCE(NULLIF($1,''),title),description=COALESCE(NULLIF($2,''),description),category=$3,city=$4,budget_max=$5,deadline=$6,admin_notes=$7 WHERE id=$8 RETURNING *`, [title||'', description||'', category||null, city||null, budget_max||null, deadline||null, admin_notes||null, id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    await logAdmin(req, 'edit_request', 'request', id, 'تعديل مشروع: ' + (r.rows[0].title||''));
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/admin/requests/:id', requirePermission('requests.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'معرف غير صحيح' });
    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM bids WHERE request_id=$1', [id]);
      await pool.query('DELETE FROM messages WHERE request_id=$1', [id]);
      await pool.query('DELETE FROM reviews WHERE request_id=$1', [id]);
      await pool.query('UPDATE reports SET request_id=NULL WHERE request_id=$1', [id]);
      await pool.query(`DELETE FROM notifications WHERE ref_id=$1 AND type='request'`, [id]);
      const del = await pool.query('DELETE FROM requests WHERE id=$1', [id]);
      await logAdmin(req, 'delete_request', 'request', id, 'حذف مشروع');
      if (del.rowCount===0) { await pool.query('ROLLBACK'); return res.status(404).json({ message: 'غير موجود' }); }
      await pool.query('COMMIT'); res.json({ ok: true });
    } catch(e) { await pool.query('ROLLBACK'); throw e; }
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/admin/notify', requirePermission('broadcast.send'), async (req, res) => {
  try {
    const { user_id, user_ids, role, title, body, type, specialty, channel } = req.body;
    if (!title||!body) return res.status(400).json({ message: 'العنوان والمحتوى مطلوبان' });
    const ch = (channel==='email'||channel==='both'||channel==='app') ? channel : 'app';
    const VALID = ['client','provider','admin']; let target = [];
    if (Array.isArray(user_ids) && user_ids.length) { const ids=user_ids.map(Number).filter(Boolean); if(ids.length){const u=await pool.query('SELECT id, name, email FROM users WHERE id = ANY($1::int[]) AND is_active=TRUE',[ids]);target=u.rows;} }
    else if (user_id) { const u=await pool.query('SELECT id, name, email FROM users WHERE id=$1',[user_id]);target=u.rows; }
    else {
      let q='SELECT id, name, email FROM users WHERE is_active=TRUE'; const p=[];
      if (role&&VALID.includes(role)) { p.push(role); q+=` AND role=$${p.length}`; }
      if (specialty&&specialty!=='الكل') { if(!role) q+=` AND role='provider'`; p.push(specialty); q+=` AND ((specialties IS NOT NULL AND $${p.length}::text=ANY(specialties)) OR (notify_categories IS NOT NULL AND $${p.length}::text=ANY(notify_categories)))`; }
      target=(await pool.query(q,p)).rows;
    }
    const emailHtml = emailTpl(title, `<div style="font-size:14px;line-height:2;color:#374151">${body.replace(/\n/g,'<br>')}</div>`, 'فتح المنصة', SITE_URL);
    let appCount=0, emailCount=0;
    for (const u of target) {
      if (ch==='app'||ch==='both') { await notify(u.id, title, body, type||'admin', null); appCount++; }
      if ((ch==='email'||ch==='both') && u.email) { const ok=await sendEmail(u.email, title, emailHtml); if(ok) emailCount++; }
    }
    res.json({ ok:true, sent_count:target.length, app_count:appCount, email_count:emailCount, channel:ch });
  } catch(e) { console.error('admin/notify:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/admin/users/search', requirePermission('users.view'), async (req, res) => {
  try {
    const q=(req.query.q||'').trim(); const role=req.query.role; const VALID=['client','provider','admin'];
    let sql=`SELECT id, name, email, phone, role, city, profile_image, is_active FROM users WHERE is_active=TRUE`; const params=[];
    if (role&&VALID.includes(role)) { params.push(role); sql+=` AND role=$${params.length}`; }
    if (q) { params.push('%'+q+'%'); sql+=` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`; }
    sql+=' ORDER BY name ASC LIMIT 50';
    const r=await pool.query(sql, params); res.json(r.rows);
  } catch(e) { console.error('/admin/users/search:', e); res.json([]); }
});

// صحة النظام (فحص شامل للأدمن)
app.get('/api/admin/health', requirePermission('settings.manage'), async (req, res) => {
  const out = { db:{}, email:{}, push:{}, server:{}, data:{} };
  // قاعدة البيانات + زمن الاستجابة
  try { const t=Date.now(); await pool.query('SELECT 1'); out.db={ ok:true, latencyMs: Date.now()-t }; }
  catch(e){ out.db={ ok:false, error:'تعذّر الاتصال بقاعدة البيانات' }; }
  // الإيميل
  out.email = { ok: !!RESEND_KEY, configured: !!RESEND_KEY, from: FROM_EMAIL||null };
  // الإشعارات
  try { const pt=await pool.query('SELECT COUNT(*)::int c, COUNT(DISTINCT user_id)::int u FROM push_tokens'); out.push={ ok: pt.rows[0].c>0, tokens: pt.rows[0].c, users: pt.rows[0].u }; }
  catch(e){ out.push={ ok:false, tokens:0, users:0 }; }
  // الخادم
  const upMs = Date.now()-SERVER_START; const mem=process.memoryUsage();
  out.server = { ok:true, uptimeSec: Math.floor(upMs/1000), node: process.version, memMB: Math.round(mem.rss/1048576) };
  // بيانات سريعة
  try {
    const d=await Promise.all([
      pool.query("SELECT COUNT(*)::int c FROM users"),
      pool.query("SELECT COUNT(*)::int c FROM users WHERE role='provider'"),
      pool.query("SELECT COUNT(*)::int c FROM requests"),
      pool.query("SELECT COUNT(*)::int c FROM requests WHERE status='open'"),
      pool.query("SELECT COUNT(*)::int c FROM reports WHERE status='pending'").catch(()=>({rows:[{c:0}]}))
    ]);
    out.data = { users:d[0].rows[0].c, providers:d[1].rows[0].c, requests:d[2].rows[0].c, openRequests:d[3].rows[0].c, pendingReports:d[4].rows[0].c };
  } catch(e){ out.data={}; }
  out.allOk = out.db.ok && out.email.ok && out.server.ok;
  res.json(out);
});

// صحة النظام (فحص شامل للأدمن) — نهاية
app.get('/api/admin/email-status', requirePermission('settings.manage'), async (req, res) => {
  const providersWithEmail=await pool.query(`SELECT COUNT(*)::int as cnt FROM users WHERE role='provider' AND is_active=TRUE AND email IS NOT NULL AND email!=''`);
  const providersTotal=await pool.query(`SELECT COUNT(*)::int as cnt FROM users WHERE role='provider' AND is_active=TRUE`);
  res.json({ resend_key_set:!!RESEND_KEY, resend_key_preview:RESEND_KEY?(RESEND_KEY.slice(0,6)+'…'+RESEND_KEY.slice(-4)):null, from_email:FROM_EMAIL, from_name:FROM_NAME, site_url:SITE_URL, providers_active:providersTotal.rows[0].cnt, providers_with_email:providersWithEmail.rows[0].cnt });
});

app.post('/api/admin/email-test', requirePermission('settings.manage'), async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ ok:false, error: 'البريد الإلكتروني مطلوب' });
  if (!RESEND_KEY) return res.json({ ok:false, stage:'config', error:'RESEND_KEY غير موجود في متغيرات البيئة' });
  try {
    const r=await fetch('https://api.resend.com/emails', { method:'POST', headers:{ 'Authorization':`Bearer ${RESEND_KEY}`, 'Content-Type':'application/json' }, body:JSON.stringify({ from:`${FROM_NAME} <${FROM_EMAIL}>`, to:[to], subject:'اختبار الإيميل — مناقصة', html:emailTpl('اختبار الإيميل يعمل','<p>هذا إيميل تجريبي.</p>','فتح المنصة',SITE_URL) }) });
    const text=await r.text(); let parsed=null; try { parsed=JSON.parse(text); } catch(e){}
    if (r.ok) return res.json({ ok:true, stage:'sent', message:`تم الإرسال إلى ${to}`, resend_id:parsed&&parsed.id });
    return res.json({ ok:false, stage:'resend_api', error:(parsed&&(parsed.message||parsed.name))||text||'Unknown error', status_code:r.status });
  } catch(e) { return res.json({ ok:false, stage:'network', error:e.message }); }
});

app.get('/api/admin/reviews', requirePermission('reviews.view'), async (req, res) => {
  try { const r=await pool.query(`SELECT rv.*, u1.name as reviewer_name, u2.name as reviewed_name, rq.title as request_title FROM reviews rv JOIN users u1 ON rv.reviewer_id=u1.id JOIN users u2 ON rv.reviewed_id=u2.id LEFT JOIN requests rq ON rv.request_id=rq.id ORDER BY rv.created_at DESC LIMIT 200`); res.json(r.rows); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/admin/reviews/:id', requirePermission('reviews.delete'), async (req, res) => {
  try { const rid=parseInt(req.params.id); const r=await pool.query('DELETE FROM reviews WHERE id=$1',[rid]); if(r.rowCount===0) return res.status(404).json({ message:'غير موجود' }); await logAdmin(req,'delete_review','review',rid,'حذف تقييم'); res.json({ ok:true }); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/admin/questions', requirePermission('questions.view'), async (req, res) => {
  try { const r=await pool.query(`SELECT q.id, q.request_id, q.body, q.answer, q.answered_at, q.created_at, q.asker_id, u.name as asker_name, u.role as asker_role, rq.title as request_title FROM request_questions q LEFT JOIN users u ON q.asker_id=u.id LEFT JOIN requests rq ON q.request_id=rq.id ORDER BY q.created_at DESC LIMIT 300`); res.json(r.rows); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/admin/questions/:id', requirePermission('questions.delete'), async (req, res) => {
  try { const qid=parseInt(req.params.id); const r=await pool.query('DELETE FROM request_questions WHERE id=$1',[qid]); if(r.rowCount===0) return res.status(404).json({ message:'غير موجود' }); await logAdmin(req,'delete_question','question',qid,'حذف سؤال'); res.json({ ok:true }); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══════════ هوية الأدمن الحالي + إدارة المشرفين ═══════════
app.get('/api/admin/me', auth, adminOnly, loadAdmin, async (req, res) => {
  res.json({
    id: req.adminUser.id, name: req.adminUser.name, email: req.adminUser.email,
    admin_role: req.adminUser.admin_role || 'super_admin',
    admin_level: req.adminUser.admin_level || 0,
    is_owner: req.adminUser.email === OWNER_EMAIL,
    permissions: req.adminPerms
  });
});

app.get('/api/admin/permissions-catalog', requirePermission('admins.manage'), async (req, res) => {
  res.json({ all: ALL_PERMISSIONS, labels: PERM_LABELS, roles: ROLE_PERMISSIONS, role_labels: ROLE_LABELS, role_levels: ROLE_BASE_LEVEL });
});

app.get('/api/admin/admins', requirePermission('admins.manage'), async (req, res) => {
  try {
    const r = await pool.query(`SELECT id, name, email, admin_role, admin_level, permissions, is_active, created_at FROM users WHERE role='admin' ORDER BY admin_level DESC, created_at ASC`);
    res.json(r.rows.map(function(u){ return Object.assign(u, { is_owner: u.email===OWNER_EMAIL, role_label: ROLE_LABELS[u.admin_role]||u.admin_role||'أدمن', perms: effectivePermissions(Object.assign({role:'admin'},u)) }); }));
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/admin/admins', requirePermission('admins.manage'), async (req, res) => {
  try {
    const { mode, name, email, password, user_id, admin_role } = req.body || {};
    const role = ROLE_PERMISSIONS[admin_role] ? admin_role : 'support';
    let perms = Array.isArray(req.body.permissions) ? req.body.permissions.filter(function(x){ return ALL_PERMISSIONS.indexOf(x)>=0; }) : ROLE_PERMISSIONS[role];
    if (role==='super_admin') perms = ['*'];
    // مستوى العضو الجديد أقل من الفاعل دائماً (إلا المالك)
    let lvl = ROLE_BASE_LEVEL[role] || 20;
    const actorLvl = req.adminUser.admin_level || 0;
    if (req.adminUser.email !== OWNER_EMAIL && lvl >= actorLvl) lvl = Math.max(1, actorLvl - 1);

    if (mode === 'promote') {
      let uid = parseInt(user_id) || 0;
      if (!uid && email) { const f = await pool.query('SELECT id FROM users WHERE email=$1', [email]); if (f.rows.length) uid = f.rows[0].id; }
      const ex = await pool.query('SELECT id, email, role FROM users WHERE id=$1', [uid]);
      if (!ex.rows.length) return res.status(404).json({ message: 'المستخدم غير موجود (تأكد من الإيميل)' });
      if (ex.rows[0].email === OWNER_EMAIL) return res.status(403).json({ message: 'هذا المالك بالفعل' });
      await pool.query(`UPDATE users SET role='admin', admin_role=$1, admin_level=$2, permissions=$3::jsonb WHERE id=$4`, [role, lvl, JSON.stringify(perms), uid]);
      await logAdmin(req, 'add_admin', 'user', uid, 'ترقية مستخدم إلى ' + (ROLE_LABELS[role]||role));
      return res.json({ ok: true, id: uid });
    }
    // إنشاء حساب إدارة جديد
    if (!name || !email || !password) return res.status(400).json({ message: 'الاسم والإيميل وكلمة المرور مطلوبة' });
    if (String(password).length < 6) return res.status(400).json({ message: 'كلمة المرور قصيرة (6 أحرف على الأقل)' });
    const dup = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (dup.rows.length) return res.status(409).json({ message: 'الإيميل مستخدم مسبقاً' });
    const hash = await bcrypt.hash(password, 10);
    const ins = await pool.query(`INSERT INTO users (name, email, password, password_hash, role, admin_role, admin_level, permissions, is_active, created_at) VALUES ($1,$2,$3,$3,'admin',$4,$5,$6::jsonb,true,NOW()) RETURNING id`, [name, email, hash, role, lvl, JSON.stringify(perms)]);
    await logAdmin(req, 'add_admin', 'user', ins.rows[0].id, 'إنشاء مشرف ' + (ROLE_LABELS[role]||role) + ' (' + email + ')');
    res.json({ ok: true, id: ins.rows[0].id });
  } catch(e) { console.error('add admin:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/admin/admins/:id', requirePermission('admins.manage'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const t = await pool.query('SELECT id, email, admin_level FROM users WHERE id=$1', [id]);
    if (!t.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const target = t.rows[0];
    if (target.email === OWNER_EMAIL) return res.status(403).json({ message: 'لا يمكن تعديل المالك' });
    if (!canActOn(req.adminUser, target.admin_level)) return res.status(403).json({ message: 'لا يمكنك تعديل من هو برتبتك أو أعلى' });
    const { admin_role } = req.body || {};
    const role = ROLE_PERMISSIONS[admin_role] ? admin_role : null;
    let perms = Array.isArray(req.body.permissions) ? req.body.permissions.filter(function(x){ return ALL_PERMISSIONS.indexOf(x)>=0; }) : null;
    if (role === 'super_admin') perms = ['*'];
    let lvl = role ? (ROLE_BASE_LEVEL[role] || 20) : target.admin_level;
    const actorLvl = req.adminUser.admin_level || 0;
    if (req.adminUser.email !== OWNER_EMAIL && lvl >= actorLvl) lvl = Math.max(1, actorLvl - 1);
    const sets = [], vals = []; let i = 1;
    if (role) { sets.push('admin_role=$'+i); vals.push(role); i++; sets.push('admin_level=$'+i); vals.push(lvl); i++; }
    if (perms) { sets.push('permissions=$'+i+'::jsonb'); vals.push(JSON.stringify(perms)); i++; }
    if (!sets.length) return res.json({ ok: true });
    vals.push(id);
    await pool.query('UPDATE users SET '+sets.join(', ')+' WHERE id=$'+i, vals);
    await logAdmin(req, 'edit_admin', 'user', id, 'تعديل صلاحيات مشرف' + (role?(' إلى '+(ROLE_LABELS[role]||role)):''));
    res.json({ ok: true });
  } catch(e) { console.error('edit admin:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/admin/admins/:id', requirePermission('admins.manage'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (id === req.adminUser.id) return res.status(400).json({ message: 'لا يمكنك إزالة نفسك' });
    const t = await pool.query('SELECT id, email, admin_level FROM users WHERE id=$1', [id]);
    if (!t.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const target = t.rows[0];
    if (target.email === OWNER_EMAIL) return res.status(403).json({ message: 'لا يمكن إزالة المالك' });
    if (!canActOn(req.adminUser, target.admin_level)) return res.status(403).json({ message: 'لا يمكنك إزالة من هو برتبتك أو أعلى' });
    // إزالة من الإدارة: تحويل إلى عميل عادي (الحساب يبقى)
    await pool.query(`UPDATE users SET role='client', admin_role=NULL, admin_level=0, permissions=NULL WHERE id=$1`, [id]);
    await logAdmin(req, 'remove_admin', 'user', id, 'إزالة مشرف من الإدارة');
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/admin/settings', requirePermission('settings.manage'), async (req, res) => {
  try { const r = await pool.query('SELECT key, value FROM platform_settings'); const o={}; r.rows.forEach(function(x){ o[x.key]=x.value; }); res.json(o); }
  catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

/* ═══════════ التسويق والبكسلات ═══════════ */
const PIXEL_DEFAULTS = { metaPixelId:'', tiktokPixelId:'', snapPixelId:'', googleId:'', metaOn:true, tiktokOn:true, snapOn:true, googleOn:true };
async function getPixels(){
  try { const raw = await getSetting('pixels', null); const p = raw ? JSON.parse(raw) : {}; return Object.assign({}, PIXEL_DEFAULTS, p); }
  catch(e){ return Object.assign({}, PIXEL_DEFAULTS); }
}

// قراءة إعداد البكسلات (أدمن)
app.get('/api/admin/pixels', requirePermission('settings.manage'), async (req, res) => {
  try { res.json(await getPixels()); }
  catch(e){ res.status(500).json({ message:'حدث خطأ' }); }
});

// حفظ إعداد البكسلات (أدمن)
app.put('/api/admin/pixels', requirePermission('settings.manage'), async (req, res) => {
  try {
    const b = req.body || {};
    const clean = {
      metaPixelId: String(b.metaPixelId||'').trim().slice(0,64),
      tiktokPixelId: String(b.tiktokPixelId||'').trim().slice(0,64),
      snapPixelId: String(b.snapPixelId||'').trim().slice(0,64),
      googleId: String(b.googleId||'').trim().slice(0,64),
      metaOn: b.metaOn!==false, tiktokOn: b.tiktokOn!==false,
      snapOn: b.snapOn!==false, googleOn: b.googleOn!==false
    };
    await setSetting('pixels', JSON.stringify(clean));
    await logAdmin(req, 'update_pixels', 'settings', null, 'تحديث بكسلات التتبّع');
    res.json({ ok:true, pixels:clean });
  } catch(e){ res.status(500).json({ message:'حدث خطأ' }); }
});

// عام: يقرأه track.js (المُعرّفات المفعّلة فقط)
app.get('/api/pixels/public', async (req, res) => {
  try {
    const p = await getPixels();
    res.set('Cache-Control','public, max-age=120');
    res.json({
      metaPixelId: p.metaOn ? p.metaPixelId : '',
      tiktokPixelId: p.tiktokOn ? p.tiktokPixelId : '',
      snapPixelId: p.snapOn ? p.snapPixelId : '',
      googleId: p.googleOn ? p.googleId : ''
    });
  } catch(e){ res.json({ metaPixelId:'', tiktokPixelId:'', snapPixelId:'', googleId:'' }); }
});

// إعدادات التذكيرات والبطاقة (أدمن) — قراءة
const REMINDER_DEFAULTS = { offersDays:2, dealDays:5, reviewDays:1, profileDays:1,
  offersOn:true, dealOn:true, reviewOn:true, profileOn:true,
  nudgeDelaySec:20, nudgeSnoozeDays:3 };
async function getReminderCfg(){
  const g = async (k,d)=> { const v = await getSetting(k, null); return v==null? d : v; };
  return {
    offersDays: parseInt(await g('rem_offers_days','2'))||2,
    dealDays: parseInt(await g('rem_deal_days','5'))||5,
    reviewDays: parseInt(await g('rem_review_days','1'))||1,
    profileDays: parseInt(await g('rem_profile_days','1'))||1,
    offersOn: (await g('rem_offers_on','1'))!=='0',
    dealOn: (await g('rem_deal_on','1'))!=='0',
    reviewOn: (await g('rem_review_on','1'))!=='0',
    profileOn: (await g('rem_profile_on','1'))!=='0',
    nudgeDelaySec: parseInt(await g('nudge_delay_sec','20'))||20,
    nudgeSnoozeDays: parseInt(await g('nudge_snooze_days','3'))||3,
    lcCloseOn: (await g('lc_close_on','1'))!=='0',
    lcCloseDays: parseInt(await g('lc_close_days','20'))||20,
    lcCloseWarn: parseInt(await g('lc_close_warn','2'))||2,
    lcConfirmOn: (await g('lc_confirm_on','1'))!=='0',
    lcConfirmDays: parseInt(await g('lc_confirm_days','20'))||20,
    lcConfirmGrace: parseInt(await g('lc_confirm_grace','3'))||3,
    reactInactiveOn: (await g('react_inactive_on','1'))!=='0',
    reactInactiveDays: parseInt(await g('react_inactive_days','30'))||30,
    reactNobidsOn: (await g('react_nobids_on','1'))!=='0',
    reactNobidsDays: parseInt(await g('react_nobids_days','21'))||21,
    qNooffersOn: (await g('q_nooffers_on','1'))!=='0',
    qNooffersDays: parseInt(await g('q_nooffers_days','3'))||3,
    qLowRatingOn: (await g('q_lowrating_on','1'))!=='0',
    qLowRatingThreshold: parseFloat(await g('q_lowrating_threshold','3.0'))||3.0,
    qLowRatingMin: parseInt(await g('q_lowrating_min','3'))||3,
    adminSummaryOn: (await g('admin_summary_on','1'))!=='0',
    adminAnomalyOn: (await g('admin_anomaly_on','1'))!=='0',
    adminAnomalyThreshold: parseInt(await g('admin_anomaly_threshold','15'))||15,
    matchNotifyOn: (await g('match_notify_on','1'))!=='0',
    qaAnswerOn: (await g('qa_answer_on','1'))!=='0',
    qaAnswerDays: parseInt(await g('qa_answer_days','2'))||2,
    bidFollowupOn: (await g('bid_followup_on','1'))!=='0',
    bidFollowupDays: parseInt(await g('bid_followup_days','7'))||7
  };
}
app.get('/api/admin/reminders', requirePermission('settings.manage'), async (req,res)=>{
  try { res.json(await getReminderCfg()); } catch(e){ res.status(500).json({message:'حدث خطأ'}); }
});
app.put('/api/admin/reminders', requirePermission('settings.manage'), async (req,res)=>{
  try {
    const b = req.body||{};
    const num=(v,d)=>{ v=parseInt(v); return isNaN(v)||v<0? d : Math.min(v,3650); };
    await setSetting('rem_offers_days', String(num(b.offersDays,2)));
    await setSetting('rem_deal_days', String(num(b.dealDays,5)));
    await setSetting('rem_review_days', String(num(b.reviewDays,1)));
    await setSetting('rem_profile_days', String(num(b.profileDays,1)));
    await setSetting('rem_offers_on', b.offersOn===false?'0':'1');
    await setSetting('rem_deal_on', b.dealOn===false?'0':'1');
    await setSetting('rem_review_on', b.reviewOn===false?'0':'1');
    await setSetting('rem_profile_on', b.profileOn===false?'0':'1');
    await setSetting('nudge_delay_sec', String(num(b.nudgeDelaySec,20)));
    await setSetting('nudge_snooze_days', String(num(b.nudgeSnoozeDays,3)));
    await setSetting('lc_close_on', b.lcCloseOn===false?'0':'1');
    await setSetting('lc_close_days', String(num(b.lcCloseDays,20)));
    await setSetting('lc_close_warn', String(num(b.lcCloseWarn,2)));
    await setSetting('lc_confirm_on', b.lcConfirmOn===false?'0':'1');
    await setSetting('lc_confirm_days', String(num(b.lcConfirmDays,20)));
    await setSetting('lc_confirm_grace', String(num(b.lcConfirmGrace,3)));
    await setSetting('react_inactive_on', b.reactInactiveOn===false?'0':'1');
    await setSetting('react_inactive_days', String(num(b.reactInactiveDays,30)));
    await setSetting('react_nobids_on', b.reactNobidsOn===false?'0':'1');
    await setSetting('react_nobids_days', String(num(b.reactNobidsDays,21)));
    await setSetting('q_nooffers_on', b.qNooffersOn===false?'0':'1');
    await setSetting('q_nooffers_days', String(num(b.qNooffersDays,3)));
    await setSetting('q_lowrating_on', b.qLowRatingOn===false?'0':'1');
    { let t=parseFloat(b.qLowRatingThreshold); if(isNaN(t)||t<0)t=3.0; if(t>5)t=5; await setSetting('q_lowrating_threshold', String(t)); }
    await setSetting('q_lowrating_min', String(num(b.qLowRatingMin,3)));
    await setSetting('admin_summary_on', b.adminSummaryOn===false?'0':'1');
    await setSetting('admin_anomaly_on', b.adminAnomalyOn===false?'0':'1');
    await setSetting('admin_anomaly_threshold', String(num(b.adminAnomalyThreshold,15)));
    await setSetting('match_notify_on', b.matchNotifyOn===false?'0':'1');
    await setSetting('qa_answer_on', b.qaAnswerOn===false?'0':'1');
    await setSetting('qa_answer_days', String(num(b.qaAnswerDays,2)));
    await setSetting('bid_followup_on', b.bidFollowupOn===false?'0':'1');
    await setSetting('bid_followup_days', String(num(b.bidFollowupDays,7)));
    await logAdmin(req, 'update_reminders', 'settings', null, 'تحديث إعدادات التذكيرات');
    res.json({ ok:true });
  } catch(e){ res.status(500).json({message:'حدث خطأ'}); }
});
// عام: تقرأه لوحة المزوّد لإعداد البطاقة العائمة
app.get('/api/nudge-config', async (req,res)=>{
  try {
    res.set('Cache-Control','public, max-age=120');
    res.json({
      delaySec: parseInt(await getSetting('nudge_delay_sec','20'))||20,
      snoozeDays: parseInt(await getSetting('nudge_snooze_days','3'))||3
    });
  } catch(e){ res.json({ delaySec:20, snoozeDays:3 }); }
});

// إحصائيات بفلاتر زمنية (يوم/أسبوع/شهر/سنة/الكل)
app.get('/api/admin/stats-range', requirePermission('analytics.view'), async (req, res) => {
  try {
    const map = { day:'1 day', week:'7 days', month:'30 days', year:'365 days' };
    const period = String(req.query.period||'week');
    const intv = map[period]; // undefined => all
    const cond = intv ? ` AND created_at > NOW() - INTERVAL '${intv}'` : '';
    const q = (sql)=>pool.query(sql);
    const [projects, providers, clients, bids] = await Promise.all([
      q(`SELECT COUNT(*) c FROM requests WHERE 1=1${cond}`),
      q(`SELECT COUNT(*) c FROM users WHERE role='provider'${cond}`),
      q(`SELECT COUNT(*) c FROM users WHERE role='client'${cond}`),
      q(`SELECT COUNT(*) c FROM bids WHERE 1=1${cond}`)
    ]);
    const n = r => parseInt(r.rows[0].c)||0;
    res.json({ period, projects:n(projects), providers:n(providers), clients:n(clients), bids:n(bids) });
  } catch(e){ console.error('/stats-range:', e.message); res.status(500).json({ message:'حدث خطأ' }); }
});

// سلاسل زمنية للأدمن (نمو يومي عبر مدة)
app.get('/api/admin/analytics-series', requirePermission('analytics.view'), async (req, res) => {
  try {
    let days = parseInt(req.query.days) || 30;
    days = Math.min(Math.max(days, 7), 90);
    const series = async (table, where) => {
      const r = await pool.query(
        `SELECT to_char(d::date,'YYYY-MM-DD') AS day,
                COALESCE(cnt,0)::int AS c
         FROM generate_series(NOW()::date - ($1::int - 1), NOW()::date, '1 day') d
         LEFT JOIN (
           SELECT created_at::date AS cd, COUNT(*) cnt FROM ${table}
           WHERE created_at > NOW()::date - $1::int ${where||''}
           GROUP BY created_at::date
         ) t ON t.cd = d::date
         ORDER BY d`, [days]);
      return r.rows;
    };
    const [projects, clients, providers, bids, completed] = await Promise.all([
      series('requests', "AND (category IS DISTINCT FROM 'direct')"),
      series('users', "AND role='client'"),
      series('users', "AND role='provider'"),
      series('bids', ''),
      pool.query(
        `SELECT to_char(d::date,'YYYY-MM-DD') AS day, COALESCE(cnt,0)::int AS c
         FROM generate_series(NOW()::date - ($1::int - 1), NOW()::date, '1 day') d
         LEFT JOIN (SELECT completed_at::date cd, COUNT(*) cnt FROM requests WHERE completed_at > NOW()::date - $1::int GROUP BY completed_at::date) t ON t.cd=d::date
         ORDER BY d`, [days]).then(r=>r.rows)
    ]);
    res.json({ days, labels: projects.map(x=>x.day),
      projects: projects.map(x=>x.c), clients: clients.map(x=>x.c),
      providers: providers.map(x=>x.c), bids: bids.map(x=>x.c), completed: completed.map(x=>x.c) });
  } catch(e){ console.error('/analytics-series:', e.message); res.status(500).json({ message:'حدث خطأ' }); }
});

// إحصائيات تسويقية داخلية (من قاعدة البيانات — دقيقة)
app.get('/api/admin/marketing-stats', requirePermission('analytics.view'), async (req, res) => {
  try {
    const q = (sql)=>pool.query(sql);
    const [regTotal, regClient, regProvider, reg7Client, reg7Provider, reg1, projTotal, proj7, bidsTotal, cities] = await Promise.all([
      q(`SELECT COUNT(*) c FROM users WHERE role IN ('client','provider')`),
      q(`SELECT COUNT(*) c FROM users WHERE role='client'`),
      q(`SELECT COUNT(*) c FROM users WHERE role='provider'`),
      q(`SELECT COUNT(*) c FROM users WHERE role='client' AND created_at > NOW() - INTERVAL '7 days'`),
      q(`SELECT COUNT(*) c FROM users WHERE role='provider' AND created_at > NOW() - INTERVAL '7 days'`),
      q(`SELECT COUNT(*) c FROM users WHERE role IN ('client','provider') AND created_at > NOW() - INTERVAL '1 day'`),
      q(`SELECT COUNT(*) c FROM requests`),
      q(`SELECT COUNT(*) c FROM requests WHERE created_at > NOW() - INTERVAL '7 days'`),
      q(`SELECT COUNT(*) c FROM bids`),
      q(`SELECT city, COUNT(*) c FROM users WHERE city IS NOT NULL AND city<>'' GROUP BY city ORDER BY c DESC LIMIT 6`)
    ]);
    const n = r => parseInt(r.rows[0].c)||0;
    const clients = n(regClient), providers = n(regProvider), projects = n(projTotal), bids = n(bidsTotal);
    res.json({
      registrations:{ total:n(regTotal), clients, providers, last24h:n(reg1), last7Clients:n(reg7Client), last7Providers:n(reg7Provider) },
      projects:{ total:projects, last7:n(proj7) },
      bids:{ total:bids },
      conversion:{ projectsPerClient: clients? +(projects/clients).toFixed(2):0, bidsPerProject: projects? +(bids/projects).toFixed(2):0 },
      topCities: cities.rows.map(x=>({ city:x.city, count:parseInt(x.c)||0 }))
    });
  } catch(e){ console.error('/marketing-stats:', e); res.status(500).json({ message:'حدث خطأ' }); }
});

app.put('/api/admin/settings', requirePermission('settings.manage'), async (req, res) => {
  try {
    const allowed = ['review_minutes'];
    const updates = req.body || {};
    const done = [];
    for (const k of Object.keys(updates)) {
      if (!allowed.includes(k)) continue;
      let v = updates[k];
      if (k === 'review_minutes') v = String(Math.max(0, Math.min(1440, parseInt(v) || 0)));
      await setSetting(k, v); done.push(k + '=' + v);
    }
    if (done.length) await logAdmin(req, 'update_settings', 'settings', null, 'تعديل الإعدادات: ' + done.join(', '));
    res.json({ ok: true, updated: done });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/admin/analytics', requirePermission('analytics.view'), async (req, res) => {
  try {
    const q = (sql) => pool.query(sql).then(r => +r.rows[0].count).catch(() => 0);
    const one = (sql, def) => pool.query(sql).then(r => r.rows[0] || def).catch(() => def);
    const many = (sql) => pool.query(sql).then(r => r.rows).catch(() => []);

    const [totalReq, totalBids, completedDeals, acceptedBids, needReview, needReports, needVerify, needQ] = await Promise.all([
      q('SELECT COUNT(*) FROM requests'),
      q('SELECT COUNT(*) FROM bids'),
      q(`SELECT COUNT(*) FROM requests WHERE status='completed'`),
      q(`SELECT COUNT(*) FROM bids WHERE status='accepted'`),
      q(`SELECT COUNT(*) FROM requests WHERE status IN ('pending_review','review')`),
      q(`SELECT COUNT(*) FROM reports WHERE status='pending' OR status IS NULL`),
      q(`SELECT COUNT(*) FROM users WHERE role='provider' AND (badge IS NULL OR badge NOT IN ('verified','موثق'))`),
      q(`SELECT COUNT(*) FROM request_questions WHERE answer IS NULL OR answer=''`)
    ]);

    const rev = await one(`SELECT COALESCE(SUM(price),0)::float as total, COALESCE(AVG(price),0)::float as avg, COUNT(*)::int as deals FROM bids WHERE status='accepted'`, { total: 0, avg: 0, deals: 0 });
    const thisMonth = await one(`SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= date_trunc('month',CURRENT_DATE))::int as users,
        (SELECT COUNT(*) FROM requests WHERE created_at >= date_trunc('month',CURRENT_DATE))::int as requests,
        (SELECT COUNT(*) FROM bids WHERE created_at >= date_trunc('month',CURRENT_DATE))::int as bids,
        (SELECT COALESCE(SUM(price),0)::float FROM bids WHERE status='accepted' AND created_at >= date_trunc('month',CURRENT_DATE)) as revenue`, {});
    const lastMonth = await one(`SELECT
        (SELECT COUNT(*) FROM users WHERE created_at >= date_trunc('month',CURRENT_DATE)-INTERVAL '1 month' AND created_at < date_trunc('month',CURRENT_DATE))::int as users,
        (SELECT COUNT(*) FROM requests WHERE created_at >= date_trunc('month',CURRENT_DATE)-INTERVAL '1 month' AND created_at < date_trunc('month',CURRENT_DATE))::int as requests,
        (SELECT COUNT(*) FROM bids WHERE created_at >= date_trunc('month',CURRENT_DATE)-INTERVAL '1 month' AND created_at < date_trunc('month',CURRENT_DATE))::int as bids,
        (SELECT COALESCE(SUM(price),0)::float FROM bids WHERE status='accepted' AND created_at >= date_trunc('month',CURRENT_DATE)-INTERVAL '1 month' AND created_at < date_trunc('month',CURRENT_DATE)) as revenue`, {});

    const topEarners = await many(`SELECT u.id, u.name, COALESCE(SUM(b.price),0)::float as earnings, COUNT(b.id)::int as deals
      FROM users u JOIN bids b ON b.provider_id=u.id AND b.status='accepted'
      WHERE u.role='provider' GROUP BY u.id, u.name ORDER BY earnings DESC LIMIT 6`);
    const topActive = await many(`SELECT u.id, u.name, COUNT(b.id)::int as bids
      FROM users u JOIN bids b ON b.provider_id=u.id WHERE u.role='provider'
      GROUP BY u.id, u.name ORDER BY bids DESC LIMIT 6`);
    const byCity = await many(`SELECT COALESCE(NULLIF(city,''),'غير محدد') as city, COUNT(*)::int as n FROM requests GROUP BY city ORDER BY n DESC LIMIT 8`);
    const byCat = await many(`SELECT COALESCE(NULLIF(category,''),'غير محدد') as category, COUNT(*)::int as n FROM requests GROUP BY category ORDER BY n DESC LIMIT 8`);
    const revMonthly = await many(`SELECT to_char(date_trunc('month',created_at),'YYYY-MM') as period, COALESCE(SUM(price),0)::float as revenue, COUNT(*)::int as deals
      FROM bids WHERE status='accepted' AND created_at >= date_trunc('month',CURRENT_DATE)-INTERVAL '5 months'
      GROUP BY period ORDER BY period`);
    const tierRows = await many(`SELECT COALESCE(NULLIF(tier,''),'new') as tier, COUNT(*)::int as n FROM users WHERE role='provider' GROUP BY tier`);
    const tierMap = { new:0, active:0, distinguished:0, expert:0 };
    tierRows.forEach(function(r){ if(tierMap[r.tier]!=null) tierMap[r.tier]=r.n; });
    const byTier = [
      { key:'new', label:'مزود جديد', n:tierMap.new },
      { key:'active', label:'مزود نشط', n:tierMap.active },
      { key:'distinguished', label:'مزود مميّز', n:tierMap.distinguished },
      { key:'expert', label:'خبير معتمد', n:tierMap.expert }
    ];

    res.json({
      revenue: { total: rev.total, avg: rev.avg, deals: rev.deals },
      funnel: { requests: totalReq, bids: totalBids, accepted: acceptedBids, completed: completedDeals },
      this_month: thisMonth, last_month: lastMonth,
      top_earners: topEarners, top_active: topActive,
      by_city: byCity, by_category: byCat,
      by_tier: byTier,
      revenue_monthly: revMonthly,
      needs_action: { review: needReview, reports: needReports, verify: needVerify, questions: needQ }
    });
  } catch(e) { console.error('analytics:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/admin/reports', requirePermission('reports.view'), async (req, res) => {
  try { const r=await pool.query(`SELECT r.*, COALESCE(u1.name,'محذوف') as reporter_name, COALESCE(u2.name,'محذوف') as reported_name, COALESCE(u2.role,'unknown') as reported_role, rq.title as request_title FROM reports r LEFT JOIN users u1 ON r.reporter_id=u1.id LEFT JOIN users u2 ON r.reported_id=u2.id LEFT JOIN requests rq ON r.request_id=rq.id ORDER BY r.created_at DESC LIMIT 200`); res.json(r.rows); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/admin/reports/:id', requirePermission('reports.resolve'), async (req, res) => {
  try {
    const id=parseInt(req.params.id); const { action, admin_note } = req.body;
    const map = { warn:'warned', ban:'resolved', ignore:'ignored', resolve:'resolved' };
    const newStatus = map[action]; if (!newStatus) return res.status(400).json({ message:'إجراء غير صحيح' });
    const r=await pool.query('SELECT reported_id FROM reports WHERE id=$1',[id]); if (!r.rows.length) return res.status(404).json({ message:'غير موجود' });
    const reportedId=r.rows[0].reported_id;
    await pool.query('UPDATE reports SET status=$1, admin_note=$2 WHERE id=$3',[newStatus, admin_note||null, id]);
    if (reportedId) {
      if (action==='ban') { await pool.query(`UPDATE users SET is_active=FALSE WHERE id=$1 AND role!='admin'`,[reportedId]); await notify(reportedId,'تم إيقاف حسابك',`تم إيقاف حسابك${admin_note?': '+admin_note:''}`, 'system', null); }
      else if (action==='warn') await notify(reportedId,'تحذير',`تلقيت تحذيراً${admin_note?': '+admin_note:''}`, 'system', null);
    }
    await logAdmin(req, 'resolve_report', 'report', id, 'معالجة بلاغ: ' + action);
    res.json({ ok:true, status:newStatus });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/admin/search', requirePermission('users.view'), async (req, res) => {
  try {
    const { q } = req.query; if (!q||q.length<2) return res.json({ requests:[], users:[] });
    const p='%'+q+'%';
    const [reqs,users]=await Promise.all([pool.query(`SELECT r.id, r.title, r.status, u.name as client_name FROM requests r LEFT JOIN users u ON r.client_id=u.id WHERE r.title ILIKE $1 OR r.description ILIKE $1 OR r.project_number ILIKE $1 ORDER BY r.created_at DESC LIMIT 20`,[p]),pool.query(`SELECT id, name, email, role FROM users WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 ORDER BY created_at DESC LIMIT 20`,[p])]);
    res.json({ requests:reqs.rows.map(r=>({...r,status:normalizeStatus(r.status)})), users:users.rows });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/admin/push-test', requirePermission('settings.manage'), async (req, res) => {
  try { const targetId=req.body.user_id||req.user.id; await sendPush(targetId,'اختبار الإشعارات','هذا إشعار تجريبي من منصة مناقصة!','/', 'test', null); res.json({ ok:true, message:'تم إرسال الإشعار التجريبي' }); } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ بناء استعلام الفلاتر للرسائل الجماعية ═══
function buildBroadcastQuery(filters) {
  const conds = ['is_active = TRUE'];
  const params = [];
  let i = 1;
  // الفئة: client / provider / all
  if (filters.target === 'client') conds.push(`role = 'client'`);
  else if (filters.target === 'provider') conds.push(`role = 'provider'`);
  else conds.push(`role IN ('client','provider')`);
  // التخصص (للمزودين)
  if (filters.specialty) {
    params.push(filters.specialty);
    conds.push(`$${i} = ANY(specialties)`); i++;
  }
  // المدينة
  if (filters.city) {
    params.push(filters.city);
    conds.push(`city = $${i}`); i++;
  }
  // الموثّقون فقط
  if (filters.verifiedOnly) conds.push(`badge = 'verified'`);
  return { where: conds.join(' AND '), params };
}

// ═══ معاينة عدد المستلمين ═══
app.post('/api/admin/broadcast/count', requirePermission('broadcast.send'), async (req, res) => {
  try {
    const { where, params } = buildBroadcastQuery(req.body || {});
    const r = await pool.query(`SELECT COUNT(*)::int as n FROM users WHERE ${where}`, params);
    res.json({ count: r.rows[0].n });
  } catch(e) { console.error('broadcast count:', e.message); res.status(500).json({ message: 'حدث خطأ' }); }
});

// ═══ إرسال رسالة جماعية مع فلاتر (تخصص + مدينة + موثّق) ═══
app.post('/api/admin/broadcast', requirePermission('broadcast.send'), async (req, res) => {
  try {
    const { title, message, channels } = req.body;
    if (!title || !message) return res.status(400).json({ message: 'العنوان والرسالة مطلوبان' });
    const { where, params } = buildBroadcastQuery(req.body || {});
    const users = await pool.query(`SELECT id, email, name FROM users WHERE ${where}`, params);
    const ch = channels || { app: true, email: false };
    let sent = 0;
    for (const u of users.rows) {
      try {
        if (ch.app) await notify(u.id, title, message, 'admin', null);
        if (ch.email && u.email) {
          await sendEmail(u.email, title, emailTpl(title, '<p>'+message.replace(/\n/g,'<br>')+'</p>', 'فتح التطبيق', 'https://manaqasa.com'));
        }
        sent++;
      } catch(e) {}
    }
    await logAdmin(req, 'broadcast', null, null, 'رسالة جماعية: '+(title||'')+' ('+sent+' مستلم)');
    res.json({ ok: true, total: sent });
  } catch(e) { console.error('broadcast:', e.message); res.status(500).json({ message: 'حدث خطأ' }); }
});

// ═══ OG / SITEMAP / ROBOTS ═══
app.get('/og/pro/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`SELECT name, business_name, city, specialties, avg_rating, review_count FROM users LEFT JOIN LATERAL (SELECT COALESCE(AVG(rating),0)::float as avg_rating, COUNT(*)::int as review_count FROM reviews WHERE reviewed_id=users.id) rv ON true WHERE id=$1 AND role='provider'`, [id]);
    if (!r.rows.length) return res.status(404).send('Not found');
    const p=r.rows[0]; const name=p.business_name||p.name||'مزود'; const city=p.city||'السعودية';
    const specs=(p.specialties||[]).slice(0,2).join(' · '); const avg=parseFloat(p.avg_rating)||0;
    const stars='★';
    const svg=`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0D1829"/><stop offset="100%" style="stop-color:#16213E"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><rect x="0" y="620" width="1200" height="10" fill="#C9920A"/><text x="600" y="120" font-family="Arial" font-size="32" fill="rgba(255,255,255,0.4)" text-anchor="middle">مناقصة — منصة المشاريع والخدمات</text><text x="600" y="280" font-family="Arial" font-size="72" font-weight="bold" fill="white" text-anchor="middle">${name}</text><text x="600" y="360" font-family="Arial" font-size="36" fill="#C9920A" text-anchor="middle">${specs||'مزود خدمة'}</text><text x="600" y="430" font-family="Arial" font-size="28" fill="rgba(255,255,255,0.6)" text-anchor="middle">${city}</text>${avg>0?`<text x="600" y="500" font-family="Arial" font-size="32" fill="#C9920A" text-anchor="middle">${stars} ${avg.toFixed(1)}</text>`:''}<text x="600" y="580" font-family="Arial" font-size="22" fill="rgba(255,255,255,0.3)" text-anchor="middle">manaqasa.com</text></svg>`;
    res.header('Content-Type','image/svg+xml'); res.header('Cache-Control','public, max-age=3600'); res.send(svg);
  } catch(e) { res.status(500).send('error'); }
});

app.get('/sitemap.xml', async (req, res) => {
  try {
    const providers=await pool.query(`SELECT id, name, business_name, created_at FROM users WHERE role='provider' AND is_active=TRUE ORDER BY created_at DESC`);
    const now=new Date().toISOString().split('T')[0];
    let xml=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc><changefreq>daily</changefreq><priority>1.0</priority><lastmod>${now}</lastmod></url>\n  <url><loc>${SITE_URL}/auth.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>`;
    for (const p of providers.rows) {
      const slug=encodeURIComponent((p.business_name||p.name||'مزود').replace(/\s+/g,'-'))+'-'+p.id;
      const lastmod=p.created_at?p.created_at.toISOString().split('T')[0]:now;
      xml+=`\n  <url><loc>${SITE_URL}/pro/${slug}</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${lastmod}</lastmod></url>`;
    }
    const requests=await pool.query(`SELECT r.id, r.title, r.updated_at FROM requests r WHERE r.status='open' ORDER BY r.created_at DESC LIMIT 500`);
    for (const r of requests.rows) {
      const slug=encodeURIComponent((r.title||'مشروع').replace(/\s+/g,'-').substring(0,40))+'-'+r.id;
      const lastmod=r.updated_at?r.updated_at.toISOString().split('T')[0]:now;
      xml+=`\n  <url><loc>${SITE_URL}/project/${slug}</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${lastmod}</lastmod></url>`;
    }
    xml+='\n</urlset>';
    res.header('Content-Type','application/xml'); res.send(xml);
  } catch(e) { console.error('sitemap:', e.message); res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'); }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nAllow: /pro/\nDisallow: /dashboard-admin.html\nDisallow: /dashboard-client.html\nDisallow: /dashboard-provider.html\nSitemap: ${SITE_URL}/sitemap.xml`);
});

// ═══ WEBSOCKET + CLOUDINARY ═══
const http = require('http');
const WebSocket = require('ws');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadToCloud(base64Data, folder='manaqasa') {
  if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
  // جرّب R2 أولاً
  if (r2Client) {
    const url = await uploadToR2(base64Data, folder.replace('manaqasa/','').replace('manaqasa','img'));
    if (url && url.startsWith('http')) { console.log('✅ R2 upload:', url); return url; }
  }
  // fallback: Cloudinary
  try {
    const result = await cloudinary.uploader.upload(base64Data, { folder, transformation: [{ quality: 'auto', fetch_format: 'auto' }], resource_type: 'image' });
    console.log('✅ Cloudinary upload:', result.secure_url);
    return result.secure_url;
  } catch(e) { console.error('upload error:', e.message); return base64Data; }
}

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const _wsClients = new Map();

function wsBroadcast(userId, data) {
  const conns = _wsClients.get(String(userId));
  if (!conns) return;
  const msg = JSON.stringify(data);
  conns.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}

wss.on('connection', (ws, req) => {
  let userId = null;
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'auth' && msg.token) {
        const decoded = jwt.verify(msg.token, JWT_SECRET);
        userId = String(decoded.id);
        if (!_wsClients.has(userId)) _wsClients.set(userId, new Set());
        _wsClients.get(userId).add(ws);
        ws.send(JSON.stringify({ type: 'connected', userId }));
      }
    } catch(e) {}
  });
  ws.on('close', () => {
    if (userId && _wsClients.has(userId)) {
      _wsClients.get(userId).delete(ws);
      if (_wsClients.get(userId).size === 0) _wsClients.delete(userId);
    }
  });
  ws.on('error', () => {});
});

// ═══ START ═══
// ═══ catch-all 404 ═══
app.get('/404.html', (req, res) => res.sendFile(__dirname + '/404.html'));
app.use((req, res) => {
  // طلبات API ترجع JSON، الصفحات ترجع 404.html
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'المسار غير موجود' });
  }
  res.status(404).sendFile(__dirname + '/404.html');
});

server.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log('🚀 Endpoints ready: auth, profiles, requests, bids, messages, reviews, questions, reports, favorites, providers, notifications, push, admin, account-deletion');
  console.log('📧 Full email notifications enabled');
  console.log('🔔 Web Push: ' + (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY ? 'ENABLED ✅' : 'DISABLED'));
  console.log('📱 Native Push (iOS/Android via Expo): ENABLED ✅');
  console.log('⬆️  Bump system: ENABLED ✅');
  console.log('❓ Questions & Clarifications: ENABLED ✅');
  console.log('✅ FIX: /api/client/conversations — messages from provider now visible to client');
});

process.on('uncaughtException',  (e) => console.error('Uncaught:', e));
process.on('unhandledRejection', (r) => console.error('Unhandled:', r));
