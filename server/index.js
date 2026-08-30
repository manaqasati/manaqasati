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
// أنواع الملفات المسموحة فقط — يمنع رفع HTML/SVG قابل للتنفيذ (XSS مخزّن)
const UPLOAD_TYPES = {
  'image/jpeg':'jpg', 'image/jpg':'jpg', 'image/png':'png', 'image/webp':'webp',
  'image/gif':'gif', 'image/heic':'heic', 'application/pdf':'pdf',
  'audio/webm':'webm', 'audio/ogg':'ogg', 'audio/mp4':'m4a', 'audio/mpeg':'mp3', 'audio/wav':'wav', 'audio/x-m4a':'m4a', 'audio/aac':'aac'
};
// ملفات فنية/مكتبية تُحمَّل فقط (غير قابلة للتنفيذ في المتصفح) — تُقبل بالامتداد
const UPLOAD_EXT_TYPES = { dwg:1, dxf:1, xlsx:1, xls:1, docx:1, doc:1, zip:1, csv:1, rvt:1, pptx:1, ppt:1 };
const UPLOAD_MAX_BYTES = 30 * 1024 * 1024; // 30MB

async function uploadToR2(base64Data, folder, filename) {
  if (!r2Client || !base64Data) return base64Data; // fallback
  if (!base64Data.startsWith('data:')) return base64Data; // already a URL
  try {
    const matches = base64Data.match(/^data:([^;,]*);base64,(.+)$/);
    if (!matches) return base64Data;
    const contentType = String(matches[1]).toLowerCase().trim();
    let ext = UPLOAD_TYPES[contentType];
    let forceDownload = false;
    if (!ext) {
      const fe = String(filename || '').toLowerCase().match(/\.([a-z0-9]+)$/);
      if (fe && UPLOAD_EXT_TYPES[fe[1]]) { ext = fe[1]; forceDownload = true; }
    }
    if (!ext) { console.warn('رفض رفع نوع غير مسموح:', contentType, filename||''); return null; }
    const buffer = Buffer.from(matches[2], 'base64');
    if (!buffer.length || buffer.length > UPLOAD_MAX_BYTES) { console.warn('رفض رفع لحجم غير صالح:', buffer.length); return null; }
    const key = (folder || 'img').replace(/[^a-zA-Z0-9/_-]/g,'') + '/' + crypto.randomBytes(16).toString('hex') + '.' + ext;
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: forceDownload ? 'application/octet-stream' : contentType,
      ContentDisposition: forceDownload ? 'attachment' : (contentType === 'application/pdf' ? 'inline' : undefined)
    }));
    return R2_PUBLIC_URL + '/' + key;
  } catch (e) {
    console.error('R2 upload failed:', e.message);
    return null;
  }
}

const app = express();
const port = process.env.PORT || 3000;

// ── ضغط الاستجابات (gzip) — يقلّل حجم الصفحات ~75% ويسرّع التحميل كثيراً ──
// آمن: لو الحزمة غير مثبّتة يتخطّاها بلا كسر الخادم
try {
  const compression = require('compression');
  app.use(compression({ threshold: 1024 }));
  console.log('✓ compression enabled');
} catch (e) {
  console.warn('compression not installed — run: npm i compression (يسرّع الموقع كثيراً)');
}

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

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');
if (!process.env.JWT_SECRET) {
  console.error('🔴 تحذير أمني: JWT_SECRET غير معيّن — تم توليد مفتاح عشوائي مؤقّت.');
  console.error('   النتيجة: تُلغى جلسات المستخدمين عند كل إعادة تشغيل (يحتاجون تسجيل دخول جديد).');
  console.error('   الحل: عيّن JWT_SECRET في Railway → Variables بقيمة عشوائية طويلة وثابتة.');
}
const SITE_URL   = process.env.SITE_URL   || 'https://manaqasa.com';
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
// ترويسات أمان أساسية
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // يمنع تسريب الروابط السرية (رموز الكرت/الكراسة) للمواقع الخارجية عبر ترويسة الإحالة
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});
app.use(express.json({ limit: '45mb' }));
// كاش ذكي للملفات الثابتة: الصور/الأيقونات تُحفظ طويلاً، وصفحات HTML لا تُخزَّن أبداً
app.use(express.static('.', {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (/\.(png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // أسبوع للصور والخطوط
    } else if (/\.html$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache'); // HTML يُتحقَّق منه دائماً (تصل التحديثات فوراً)
    }
  }
}));

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

// نشر المشاريع قيد المراجعة تلقائياً بعد انتهاء مدة المراجعة (قابلة للتعديل من لوحة الأدمن)
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
          AND (COALESCE(serves_all_cities,FALSE) OR $2::text IS NULL OR (city IS NULL AND (service_cities IS NULL OR cardinality(service_cities)=0)) OR city = $2 OR $2 = ANY(COALESCE(service_cities,ARRAY[]::text[])))`,
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
// رابط الدخول القصير: /m/الرمز → صفحة الدخول السحري
app.get('/m/:token',               (req, res) => res.redirect(302, '/auth.html?magic=' + encodeURIComponent(req.params.token)));
app.get('/app.html',               (req, res) => res.sendFile(__dirname + '/app.html'));
app.get('/project.html',           (req, res) => res.sendFile(__dirname + '/project.html'));
app.get('/chat',                   (req, res) => res.sendFile(__dirname + '/chat.html'));
app.get('/chat.html',              (req, res) => res.sendFile(__dirname + '/chat.html'));
app.get('/pro.html',               (req, res) => res.sendFile(__dirname + '/pro.html'));
app.get('/card.html',              (req, res) => res.sendFile(__dirname + '/card.html'));
app.get('/brief.html',             (req, res) => res.sendFile(__dirname + '/brief.html'));
app.get('/b2b',                    (req, res) => res.sendFile(__dirname + '/b2b.html'));
app.get('/b2b.html',               (req, res) => res.sendFile(__dirname + '/b2b.html'));
app.get('/post',                   (req, res) => res.sendFile(__dirname + '/post.html'));
app.get('/post.html',              (req, res) => res.sendFile(__dirname + '/post.html'));
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
    const ogImg = SITE_URL + '/og/project/' + id;
    html = html
      .replace('<title>مشروع — مناقصة</title>', '<title>' + pgT + '</title>')
      .replace('<meta name="description" content="مشروع على منصة مناقصة السعودية">', '<meta name="description" content="' + pgD + '">')
      .replace('</head>', '<meta property="og:title" content="' + pgT + '"><meta property="og:description" content="' + pgD + '"><meta property="og:url" content="' + pageUrl + '"><meta property="og:image" content="' + ogImg + '"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:type" content="article"><meta property="og:site_name" content="مناقصة"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="' + pgT + '"><meta name="twitter:description" content="' + pgD + '"><meta name="twitter:image" content="' + ogImg + '"><link rel="canonical" href="' + pageUrl + '"></head>');
    res.send(html);
  } catch(e) { console.error('/project SSR:', e.message); res.sendFile(__dirname + '/project.html'); }
});

app.get('/api/requests/public/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`
      SELECT r.id, r.title, r.description, r.category, r.city, r.district, r.client_id,
        r.budget_max, r.geo_lat, r.geo_lng,
        r.budget_max as budget, r.budget_min, r.deadline, r.status, r.created_at, r.close_at, r.attachments,
        COALESCE((SELECT json_agg(img) FROM unnest(r.images) img WHERE img LIKE 'http%'),'[]'::json) as images,
        json_build_object('id', u.id, 'name', split_part(u.name,' ',1), 'city', u.city,
          'badge', u.badge,
          'completed_count', (SELECT COUNT(*) FROM requests WHERE client_id=u.id AND status='completed'),
          'is_premium', (u.badge='premium' OR (SELECT COUNT(*) FROM requests WHERE client_id=u.id AND status='completed')>=3)
        ) as client
      FROM requests r LEFT JOIN users u ON u.id=r.client_id WHERE r.id=$1
    `, [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const row = r.rows[0];
    // خصوصية الموقع: الإحداثيات الدقيقة تظهر للمالك، المزوّد المعتمد، الأدمن، وأي مزوّد مسجّل (لتقييم الوصول قبل المزايدة) — تبقى محجوبة عن الزائر غير المسجّل
    try {
      let viewer = null;
      const ah = req.headers.authorization || '';
      const tk = ah.startsWith('Bearer ') ? ah.slice(7) : null;
      if (tk) { try { viewer = jwt.verify(tk, JWT_SECRET); } catch(e) { viewer = null; } }
      const assigned = (await pool.query('SELECT assigned_provider_id FROM requests WHERE id=$1',[id])).rows[0] || {};
      const ok = viewer && (String(viewer.id)===String(row.client_id) || String(viewer.id)===String(assigned.assigned_provider_id) || viewer.role==='admin' || viewer.role==='provider');
      if (!ok) { row.geo_lat = null; row.geo_lng = null; }
    } catch(e) { row.geo_lat = null; row.geo_lng = null; }
    try{ const uv = await pool.query('UPDATE requests SET brief_views=COALESCE(brief_views,0)+1 WHERE id=$1 RETURNING brief_views', [id]); row.brief_views = (uv.rows[0] && uv.rows[0].brief_views) || 0; }catch(e){ row.brief_views = 0; }
    res.json(row);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/bids/public/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // تحقّق اختياري: أرقام المزوّدين تُكشف للمستخدمين المسجّلين فقط (يشجّع التسجيل ويحمي البيانات)
    let isLoggedIn = false, viewerId = null, viewerRole = null;
    try {
      const hdr = req.headers.authorization || '';
      const tok = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
      if (tok) { const v = jwt.verify(tok, JWT_SECRET); isLoggedIn = true; viewerId = v.id; viewerRole = v.role; }
    } catch(e) { isLoggedIn = false; }
    // صاحب المشروع (أو المخصّص له أو الأدمن) يشوف الملف الرسمي دائماً — لأنه يحوي السعر
    let isPrivileged = false;
    try {
      const rq = (await pool.query('SELECT client_id, assigned_provider_id FROM requests WHERE id=$1', [id])).rows[0] || {};
      isPrivileged = viewerId != null && (String(viewerId) === String(rq.client_id) || String(viewerId) === String(rq.assigned_provider_id) || viewerRole === 'admin');
    } catch(e) {}
    const r = await pool.query(`
      SELECT b.id, b.days, b.status, b.created_at,
        CASE WHEN $2::boolean THEN u.phone ELSE NULL END as provider_phone,
        CASE WHEN COALESCE(b.price_visibility,'client')='public' OR $3::boolean THEN b.price ELSE NULL END as price,
        COALESCE(b.price_visibility,'client') as price_visibility,
        COALESCE(b.price_unit,'total') as price_unit,
        CASE WHEN COALESCE(b.price_visibility,'client')='public' OR $3::boolean THEN b.attachment_url ELSE NULL END as attachment_url,
        b.price as _p,
        b.note as proposal,
        u.id as provider_id,
        u.name as provider_name,
        u.city as provider_city,
        u.business_name as provider_business_name,
        CASE WHEN u.profile_image IS NOT NULL AND length(u.profile_image) > 0
          THEN u.profile_image ELSE NULL END as provider_image,
        COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=u.id),0)::float as avg_rating,
        COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=u.id),0)::int as review_count
      FROM bids b JOIN users u ON u.id=b.provider_id WHERE b.request_id=$1 ORDER BY b.created_at ASC
    `, [id, isLoggedIn, isPrivileged]);
    // نطاق مبهم للزوّار: نكشف أدنى سعر فقط بلا ربطه بمزوّد محدّد
    const prices = r.rows.map(x => parseFloat(x._p)).filter(v => v > 0);
    const range = prices.length ? { min: Math.min(...prices), count: prices.length } : null;
    const rows = r.rows.map(x => {
      const { _p, ...rest } = x;
      // تمويه نص العرض للزائر/المنافس إن كان السعر مخفياً — حماية السعر من التسريب داخل النص
      const locked = (String(rest.price_visibility) === 'client') && !isPrivileged;
      if (locked && rest.proposal) {
        const full = String(rest.proposal);
        rest.proposal = full.length > 70 ? full.slice(0, 70) : full;
        rest.note_truncated = full.length > 70;
        rest.note_locked = true;
      } else {
        rest.note_locked = false;
      }
      return rest;
    });
    res.json({ bids: rows, range });
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

// ═══════════════════════════════════════════════════════════════
// صفحات SEO — دليل الخدمات حسب التخصص والمدينة (مرسومة من الخادم)
// ═══════════════════════════════════════════════════════════════
const SEO_CATS = ['تبريد وتكييف','كهرباء','سباكة','نجارة','تنظيف','نقل عفش','حدادة','ألمنيوم','كلادينج وواجهات','مسابح','كاميرات مراقبة','شبكات وإنترنت','مظلات وسواتر','عزل حراري','مكافحة حشرات','بناء','جبس','كشف تسربات المياه','تنظيف خزانات','دهانات وديكور','تركيب مطابخ','تنسيق حدائق','زجاج ومرايا','بلاط ورخام','تركيب أثاث','أرضيات خشبية وباركيه','تنظيف سجاد وكنب','صيانة مصاعد','أبواب وبوابات أوتوماتيكية','ترميم مبانٍ','تنظيف واجهات المباني','حفر آبار ومضخات','أنظمة الحريق والسلامة','تخطيط المواقف والسلامة المرورية','معدات ثقيلة','عوازل مائية','أنظمة شمسية','صيانة عامة','إنشاءات معدنية وهناجر','أعمال الطرق والأسفلت','صرف صحي وبيارات','أرضيات إيبوكسي','تحلية ومعالجة مياه','تشطيبات ومقاولات عامة','مكاتب هندسية'];
const SEO_CITIES = ['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الظهران','بريدة','عنيزة','الرس','حائل','تبوك','أبها','خميس مشيط','نجران','جازان','الطائف','ينبع','الأحساء','القطيف','الجبيل','عرعر','سكاكا','الباحة','القريات','رفحاء','حفر الباطن','الخرج','المجمعة','الزلفي','شقراء','الدوادمي','القويعية','وادي الدواسر','بيشة','محايل عسير','صبيا','أبو عريش','الليث','القنفذة','رابغ','ضباء','الوجه','تيماء','دومة الجندل','طريف'];
function seoSlug(s){ return encodeURIComponent(String(s).trim().replace(/\s+/g,'-')); }
function seoUnslug(s){ try{ return decodeURIComponent(String(s)).replace(/-/g,' ').trim(); }catch(e){ return String(s).replace(/-/g,' ').trim(); } }
function seoEsc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function seoStars(n){ n=Math.round(n||0); let h=''; for(let i=1;i<=5;i++) h+= (i<=n?'★':'☆'); return h; }

// دليل رئيسي (هَب للربط الداخلي)
// ═══════════════ صفحات نية البحث (Intent Landing Pages) ═══════════════
const INTENT_PAGES = {
  'طرح-مشروع-للمقاولين': {
    kw: 'طرح مشروع للمقاولين',
    h1: 'اطرح مشروعك واحصل على عروض من المقاولين',
    title: 'طرح مشروع للمقاولين | اطرح مشروعك واحصل على عروض',
    meta: 'لديك مشروع؟ اطرحه للمقاولين واستقبل عروض الأسعار من المقاولين المهتمين، ثم قارن بينها واختر الأنسب.',
    heroSub: 'أضف تفاصيل مشروعك مرة واحدة، ويصلك عدة عروض من مقاولين مهتمين — قارن واختر الأنسب.',
    intro: 'لديك مشروع وتبحث عن المقاول المناسب؟ مع منصة مناقصة يمكنك طرح تفاصيل مشروعك بسهولة، واستقبال عروض المقاولين المهتمين، ثم مقارنة العروض واختيار الأنسب لمشروعك — بدلاً من الاتصال على كل مقاول على حدة والمساومة معه.',
    faq: [
      { q: 'كيف أطرح مشروعي للمقاولين؟', a: 'أضف تفاصيل مشروعك (الوصف، الموقع، المواصفات) على منصة مناقصة، وسيطّلع عليه المقاولون المهتمون ويقدّمون عروضهم مباشرة.' },
      { q: 'هل طرح المشروع يكلّفني شيئاً؟', a: 'طرح مشروعك واستقبال العروض ومقارنتها لا يتطلب أي رسوم — تضيف مشروعك وتستقبل العروض وتختار الأنسب لك.' },
      { q: 'كم عرضاً سأستقبل؟', a: 'يعتمد على نوع المشروع وموقعه ووضوح تفاصيله. كلما كانت التفاصيل والمواصفات أوضح، زادت جودة العروض وعددها.' }
    ]
  },
  'ابحث-عن-مقاول': {
    kw: 'أبحث عن مقاول',
    h1: 'تبحث عن مقاول؟ اطرح مشروعك',
    title: 'أبحث عن مقاول | احصل على عروض لمشروعك',
    meta: 'تبحث عن مقاول لمشروعك؟ أضف تفاصيل المشروع واستقبل عروضاً من المقاولين المناسبين وقارن بينها.',
    heroSub: 'بدلاً من البحث عن المقاول بنفسك، اطرح مشروعك ودع المقاولين المناسبين يصلونك بعروضهم.',
    intro: 'تبحث عن مقاول موثوق لمشروعك؟ بدل الاتصال على كل مقاول والسؤال عن السعر، اطرح مشروعك على منصة مناقصة مرة واحدة، ويصلك عدة عروض من مقاولين مهتمين، فتقارن الأسعار والخبرة والمدة وتختار الأنسب.',
    faq: [
      { q: 'كيف أجد المقاول المناسب لمشروعي؟', a: 'اطرح مشروعك على مناقصة، واستقبل عروضاً من عدة مقاولين، ثم قارن بين تقييماتهم وأعمالهم السابقة وأسعارهم لاختيار الأنسب.' },
      { q: 'كيف أتأكد أن المقاول مناسب؟', a: 'راجع تقييمات المقاول وأعماله السابقة على المنصة، والتزامه بالمواعيد، ووضوح عرضه، قبل اتخاذ القرار.' },
      { q: 'هل أستطيع مقارنة أكثر من مقاول؟', a: 'نعم، تستقبل عدة عروض على مشروعك وتقارن بينها جنباً إلى جنب لاختيار الأنسب سعراً وجودة.' }
    ]
  },
  'منصة-مقاولات': {
    kw: 'منصة مقاولات',
    h1: 'منصة مقاولات تربط أصحاب المشاريع بالمقاولين',
    title: 'منصة مقاولات في السعودية | اطرح مشروعك واحصل على عروض',
    meta: 'منصة مقاولات سعودية تربط أصحاب المشاريع بالمقاولين. اطرح مشروعك واستقبل عروض الأسعار وقارن بين المقاولين.',
    heroSub: 'منصة سعودية تربط أصحاب المشاريع بالمقاولين — اطرح مشروعك واستقبل عروضاً وقارن واختر.',
    intro: 'منصة مناقصة هي منصة مقاولات سعودية تربط أصحاب المشاريع بالمقاولين ومقدّمي الخدمات. تتيح لك طرح مشروعك واستقبال عروض المقاولين المهتمين ومقارنة الأسعار والخبرات، لتختار المقاول الأنسب لتنفيذ أعمالك بكل سهولة.',
    faq: [
      { q: 'ما هي منصة مناقصة؟', a: 'منصة سعودية تربط أصحاب المشاريع بالمقاولين ومقدّمي الخدمات، تتيح طرح المشاريع واستقبال العروض ومقارنتها واختيار الأنسب.' },
      { q: 'ما أنواع المشاريع التي تدعمها المنصة؟', a: 'مشاريع المقاولات العامة، البنية التحتية، الطرق، المياه والصرف الصحي، الكهرباء، المباني، التشطيبات، والمشاريع التجارية والصناعية.' },
      { q: 'كيف أبدأ باستخدام المنصة؟', a: 'اطرح مشروعك بإضافة تفاصيله، وستصلك عروض المقاولين المهتمين لتقارن وتختار.' }
    ]
  },
  'طلب-عروض-اسعار-مقاولات': {
    kw: 'طلب عروض أسعار مقاولات',
    h1: 'اطلب عروض أسعار من المقاولين',
    title: 'طلب عروض أسعار مقاولات | احصل على أفضل عروض التنفيذ',
    meta: 'اطلب عروض أسعار لمشروعك من المقاولين المهتمين وقارن بين الأسعار والخبرات والمدة قبل اختيار المقاول.',
    heroSub: 'اطلب عروض أسعار لمشروعك من عدة مقاولين — وقارن الأسعار والمدة والخبرة قبل الاختيار.',
    intro: 'تريد معرفة أسعار تنفيذ مشروعك؟ اطلب عروض أسعار من المقاولين عبر منصة مناقصة. أضف تفاصيل مشروعك، ويقدّم لك المقاولون المهتمون عروض أسعارهم، فتقارن بينها من حيث السعر والخبرة والمدة وتختار الأنسب — بدل الاتصال على كل مقاول ومساومته.',
    faq: [
      { q: 'كيف أطلب عرض سعر من مقاول؟', a: 'أضف تفاصيل مشروعك على مناقصة، وسيقدّم المقاولون المهتمون عروض أسعارهم لتقارن بينها وتختار.' },
      { q: 'لماذا تختلف أسعار المقاولين لنفس المشروع؟', a: 'تختلف الأسعار حسب الخبرة والمواد المستخدمة وحجم العمل ومدة التنفيذ. مقارنة عدة عروض تساعدك على معرفة السعر العادل.' },
      { q: 'كم تكلفة الحصول على عروض الأسعار؟', a: 'تضيف مشروعك وتستقبل عروض الأسعار وتقارن بينها لاختيار الأنسب لك.' }
    ]
  },
  'مقاولين-السعودية': {
    kw: 'مقاولين السعودية',
    h1: 'مقاولين في السعودية لتنفيذ مشروعك',
    title: 'مقاولين السعودية | ابحث عن مقاول لمشروعك',
    meta: 'ابحث عن مقاولين في السعودية لتنفيذ مشاريعك، اطرح مشروعك واستقبل عروض المقاولين وقارن بينها.',
    heroSub: 'مقاولون في مختلف مناطق السعودية — اطرح مشروعك وتصلك عروضهم لتختار الأنسب.',
    intro: 'تبحث عن مقاولين في السعودية لتنفيذ مشروعك؟ منصة مناقصة تجمع مقاولين ومقدّمي خدمات في مختلف المناطق. اطرح مشروعك مرة واحدة، ويصلك عدة عروض من مقاولين مناسبين، فتقارن الأسعار والتقييمات وتختار الأنسب لتنفيذ أعمالك.',
    faq: [
      { q: 'كيف أجد مقاولين في السعودية؟', a: 'اطرح مشروعك على مناقصة، وسيصلك عروض من مقاولين في منطقتك، فتقارن بينها وتختار المناسب.' },
      { q: 'هل تغطي المنصة كل مناطق السعودية؟', a: 'المنصة تخدم أصحاب المشاريع في مختلف مناطق المملكة، ويتزايد عدد المقاولين المسجّلين باستمرار.' },
      { q: 'كيف أختار مقاولاً موثوقاً؟', a: 'راجع تقييمات المقاول وأعماله السابقة والتزامه بالمواعيد ووضوح عرضه قبل اتخاذ قرارك.' }
    ]
  }
};
const INTENT_CITIES = ['سكاكا','الجوف','حائل','عرعر','بريدة','عنيزة','القريات','دومة الجندل'];
function renderIntentPage(slug) {
  const c = INTENT_PAGES[slug];
  if (!c) return null;
  const canonical = `${SITE_URL}/${encodeURIComponent(slug)}`;
  const others = Object.keys(INTENT_PAGES).filter(k => k !== slug).map(k =>
    `<a href="/${encodeURIComponent(k)}" style="display:inline-block;margin:3px;padding:6px 13px;background:#eef4ff;border:1px solid #cdddf9;border-radius:16px;color:#1e40af;text-decoration:none;font-size:13px">${seoEsc(INTENT_PAGES[k].h1.length>34?INTENT_PAGES[k].kw:INTENT_PAGES[k].kw)}</a>`).join('');
  const cityLinks = INTENT_CITIES.map(city =>
    `<a href="/dalil/${seoSlug('تشطيبات ومقاولات عامة')}/${seoSlug(city)}" style="display:inline-block;margin:3px;padding:6px 13px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;color:#15803d;text-decoration:none;font-size:13px">مقاولين ${seoEsc(city)}</a>`).join('');
  const faqHtml = c.faq.map(f =>
    `<div style="background:#fff;border:1px solid #e6eefb;border-radius:12px;padding:15px 17px;margin-bottom:10px"><div style="font-weight:800;color:#1e3a8a;margin-bottom:6px">${seoEsc(f.q)}</div><div style="color:#334155;font-size:14.5px">${seoEsc(f.a)}</div></div>`).join('');
  const schema = [
    { '@context':'https://schema.org','@type':'Service', name:c.kw, provider:{'@type':'Organization',name:'مناقصة',url:SITE_URL}, areaServed:{'@type':'Country',name:'المملكة العربية السعودية'}, description:c.meta },
    { '@context':'https://schema.org','@type':'FAQPage', mainEntity:c.faq.map(f=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}})) },
    { '@context':'https://schema.org','@type':'BreadcrumbList', itemListElement:[{'@type':'ListItem',position:1,name:'مناقصة',item:SITE_URL},{'@type':'ListItem',position:2,name:c.kw,item:canonical}] }
  ];
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${seoEsc(c.title)}</title><meta name="description" content="${seoEsc(c.meta)}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${seoEsc(c.title)}"><meta property="og:description" content="${seoEsc(c.meta)}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="website"><meta property="og:image" content="${SITE_URL}/og-default.png"><script type="application/ld+json">${JSON.stringify(schema)}</script><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{font-family:Tajawal,system-ui,sans-serif;background:#f0f5ff;color:#1e293b;margin:0;line-height:1.85;-webkit-font-smoothing:antialiased}.wrap{max-width:760px;margin:0 auto;padding:20px 16px 50px}.hero{background:linear-gradient(135deg,#172554,#1e3a8a 55%,#2563eb);color:#fff;border-radius:18px;padding:30px 24px;margin-bottom:22px}.hero h1{margin:0 0 10px;font-size:25px;line-height:1.35}.hero p{margin:0;opacity:.93;font-size:15px}.cta{display:inline-block;margin-top:18px;background:#fff;color:#1e3a8a;padding:14px 32px;border-radius:12px;font-weight:900;text-decoration:none;font-size:15.5px}.cta2{display:inline-block;margin-top:18px;margin-right:8px;background:rgba(255,255,255,.15);color:#fff;border:1px solid rgba(255,255,255,.35);padding:14px 26px;border-radius:12px;font-weight:800;text-decoration:none;font-size:14.5px}h2{color:#1e3a8a;font-size:19px;margin:28px 0 13px}a{color:#1e40af}.nav{background:#172554;padding:13px 16px;display:flex;justify-content:space-between;align-items:center}.nav a{color:#fff;text-decoration:none;font-weight:800}.steps{display:grid;gap:11px}.step{background:#fff;border:1px solid #e6eefb;border-radius:12px;padding:15px 17px}.step b{color:#1e3a8a}.li{background:#fff;border:1px solid #e6eefb;border-radius:10px;padding:11px 15px;margin-bottom:8px;font-size:14.5px}.foot{text-align:center;color:#64748b;font-size:12px;padding:22px 0}</style></head><body><div class="nav"><a href="/">مناقصة</a><a href="/post" style="background:#0ea5e9;padding:8px 18px;border-radius:9px;font-size:13px">اطرح مشروعك</a></div><div class="wrap"><div class="hero"><h1>${seoEsc(c.h1)}</h1><p>${seoEsc(c.heroSub)}</p><a class="cta" href="/post">📝 اطرح مشروعك الآن</a><a class="cta2" href="/dalil">أبحث عن مقاول</a></div><p style="font-size:15.5px">${seoEsc(c.intro)}</p><h2>كيف تعمل منصة مناقصة؟</h2><div class="steps"><div class="step"><b>1. أضف مشروعك</b> — أدخل تفاصيل المشروع والموقع والمواصفات المطلوبة.</div><div class="step"><b>2. استقبل عروض المقاولين</b> — يطّلع المقاولون المهتمون على مشروعك ويقدّمون عروضهم.</div><div class="step"><b>3. قارن العروض</b> — قارن بين الأسعار والخبرة والمدة والتفاصيل المقدّمة.</div><div class="step"><b>4. اختر المقاول المناسب</b> — اختر العرض الأنسب لتنفيذ مشروعك مباشرة.</div></div><h2>ما المشاريع التي يمكن طرحها؟</h2><div class="li">المقاولات العامة والمباني</div><div class="li">البنية التحتية والطرق</div><div class="li">المياه والصرف الصحي</div><div class="li">الأعمال الكهربائية والسباكة</div><div class="li">التشطيبات والديكور</div><div class="li">المشاريع التجارية والصناعية</div><div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:16px;padding:24px;text-align:center;color:#fff;margin:26px 0"><div style="font-size:18px;font-weight:900;margin-bottom:8px">لديك مشروع؟</div><div style="font-size:14px;opacity:.92;margin-bottom:16px">اطرح مشروعك على مناقصة واستقبل عروض المقاولين — قارن واختر الأنسب.</div><a href="/post" style="background:#fff;color:#1e3a8a;padding:13px 30px;border-radius:11px;font-weight:900;text-decoration:none">اطرح مشروعك الآن</a></div><h2>لماذا تطرح مشروعك في مناقصة؟</h2><div class="li">الوصول إلى عدد أكبر من المقاولين</div><div class="li">استقبال عروض متعددة ومقارنة الأسعار</div><div class="li">توفير الوقت والوصول لمقاولين متخصصين</div><div class="li">تسهيل عملية الاختيار باطمئنان</div><h2>أسئلة شائعة</h2>${faqHtml}<h2>خدمات ذات صلة</h2><div>${others}</div><h2>مقاولين حسب المدينة</h2><div>${cityLinks}</div><p class="foot">مناقصة — لديك مشروع؟ اطرحه واستقبل عروض المقاولين · <a href="/dalil">كل الخدمات والمدن</a></p></div></body></html>`;
}
app.get('*', (req, res, next) => {
  // صفحات نية البحث: نفك ترميز المسار العربي ثم نطابق (Express يمرّر المسار مُرمّزاً)
  let slug;
  try { slug = decodeURIComponent((req.path||'').replace(/^\//, '').replace(/\/$/, '')); } catch(e){ return next(); }
  if (!Object.prototype.hasOwnProperty.call(INTENT_PAGES, slug)) return next();
  const html = renderIntentPage(slug);
  if (!html) return next();
  res.set('Content-Type','text/html; charset=utf-8').send(html);
});

app.get('/dalil', (req, res) => {
  const cards = SEO_CATS.map(cat => {
    const links = SEO_CITIES.slice(0,8).map(city => `<a href="/dalil/${seoSlug(cat)}/${seoSlug(city)}" style="display:inline-block;margin:3px;padding:5px 11px;background:#eef4ff;border:1px solid #cdddf9;border-radius:16px;color:#1e40af;text-decoration:none;font-size:12.5px">${seoEsc(city)}</a>`).join('');
    return `<div style="background:#fff;border:1px solid #e6eefb;border-radius:14px;padding:16px;margin-bottom:12px"><h2 style="font-size:16px;color:#1e3a8a;margin:0 0 9px">${seoEsc(cat)}</h2><div>${links}</div></div>`;
  }).join('');
  res.set('Content-Type','text/html; charset=utf-8').send(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>دليل الخدمات في السعودية — كل التخصصات والمدن | مناقصة</title><meta name="description" content="دليل مزوّدي الخدمات في السعودية: تكييف، سباكة، كهرباء، نجارة والمزيد — في الرياض وجدة والدمام وكل المدن. انشر مشروعك واستقبل عروضاً مجاناً."><link rel="canonical" href="${SITE_URL}/dalil"><style>body{font-family:Tajawal,system-ui,sans-serif;background:#f0f5ff;color:#1e293b;max-width:760px;margin:0 auto;padding:22px 16px;line-height:1.7}a{color:#1e40af}h1{color:#1e3a8a;font-size:24px}</style></head><body><h1>دليل الخدمات في السعودية</h1><p>اختر التخصص والمدينة لتصفّح المزوّدين، أو <a href="/">انشر مشروعك مجاناً</a> واستقبل عروضاً من عدة مزوّدين.</p>${cards}<p style="margin-top:20px"><a href="/">← مناقصة — الصفحة الرئيسية</a></p></body></html>`);
});

// مولّدات محتوى غني لصفحات SEO — يجعل كل صفحة قيّمة لقوقل حتى بلا مزوّدين
function seoRichIntro(cat, city){
  return `تُعدّ خدمات ${cat} في ${city} من أكثر الخدمات مشروعاً، نظراً لحاجة المنازل والمنشآت إليها بشكل متكرر. سواء كنت تبحث عن تنفيذ جديد أو صيانة أو إصلاح عاجل، فإن اختيار مزوّد ${cat} المناسب في ${city} يوفّر عليك الوقت والتكلفة ويضمن جودة العمل. عبر منصة مناقصة، تنشر مشروعك مرة واحدة ويصلك عدة عروض من مزوّدين في ${city} تقارن بينها وتختار الأنسب سعراً وجودة، بدلاً من الاتصال على كل مزوّد على حدة والمساومة معه.`;
}
function seoRichFaq(cat, city){
  const faqs = [
    { q: `كم تكلفة ${cat} في ${city}؟`, a: `تختلف تكلفة ${cat} في ${city} حسب حجم العمل ونوعه والمواد المستخدمة. أفضل طريقة لمعرفة السعر المناسب هي نشر مشروعك على مناقصة واستقبال عدة عروض أسعار من مزوّدين مختلفين، ثم المقارنة بينها لاختيار الأنسب.` },
    { q: `كيف أختار أفضل مزوّد ${cat} في ${city}؟`, a: `ابحث عن مزوّد لديه تقييمات جيدة وأعمال سابقة موثّقة، والتزام بالمواعيد، وشفافية في التسعير. عبر مناقصة يمكنك رؤية تقييمات المزوّدين ومقارنة عروضهم قبل اتخاذ القرار.` },
    { q: `كم يستغرق تنفيذ خدمة ${cat}؟`, a: `تعتمد المدة على طبيعة العمل وحجمه. عند نشر مشروعك، حدّد التفاصيل بدقة ليقدّم لك المزوّدون تقديراً واقعياً للمدة والتكلفة.` },
    { q: `هل النشر على مناقصة مجاني؟`, a: `نعم، نشر المشروع وتصفّح العروض مجاني تماماً. تُطبّق رسوم خدمة (3% من قيمة العقد) على مزوّد الخدمة فقط عند اتفاقه مع مزوّد واختيار عرضه.` }
  ];
  let h = '<div style="background:#fff;border:1px solid #e6eefb;border-radius:14px;padding:20px;margin-bottom:14px">';
  faqs.forEach(f => {
    h += `<div style="margin-bottom:15px"><div style="font-weight:800;color:#1e3a8a;font-size:14px;margin-bottom:5px">${seoEsc(f.q)}</div><div style="font-size:13px;color:#3a4c6b;line-height:1.9">${seoEsc(f.a)}</div></div>`;
  });
  h += '</div>';
  return { html: h, data: faqs };
}
function seoRichTips(cat){
  const tips = [
    'حدّد احتياجك بوضوح واكتب تفاصيل دقيقة عند نشر المشروع.',
    'قارن بين عدة عروض ولا تعتمد على عرض واحد فقط.',
    'اطّلع على تقييمات المزوّد وأعماله السابقة قبل الاتفاق.',
    'اتفق على التفاصيل والسعر والمدة كتابياً قبل بدء العمل.'
  ];
  let h = '<ul style="background:#fff;border:1px solid #e6eefb;border-radius:14px;padding:20px 20px 20px 0;margin:0 0 14px;list-style:none">';
  tips.forEach(t => { h += `<li style="font-size:13px;color:#3a4c6b;line-height:1.9;padding-right:24px;position:relative;margin-bottom:8px">✓ ${seoEsc(t)}</li>`; });
  h += '</ul>';
  return h;
}

// تخزين مؤقت لصفحات SEO (10 دقائق) — يخفّف ضغط قاعدة البيانات عند زحف قوقل للـ414 صفحة ويسرّعها للزوار
const _dalilCache = new Map();
const _DALIL_TTL = 10 * 60 * 1000;
setInterval(() => { const now = Date.now(); for (const [k,v] of _dalilCache) { if (now > v.exp) _dalilCache.delete(k); } }, 5*60*1000);

app.get('/dalil/:cat/:city', async (req, res) => {
  try {
    const _ck = req.params.cat + '|' + req.params.city;
    const _hit = _dalilCache.get(_ck);
    if (_hit && Date.now() < _hit.exp) { return res.set('Content-Type','text/html; charset=utf-8').send(_hit.html); }
    const cat = seoUnslug(req.params.cat);
    const city = seoUnslug(req.params.city);
    if (!SEO_CATS.includes(cat) || !SEO_CITIES.includes(city)) return res.redirect(302, '/dalil');
    let providers = [];
    try {
      const r = await pool.query(
        `SELECT id, name, business_name, city, bio, profile_image, tier, badge,
           COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0)::float as avg_rating,
           COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0)::int as review_count
         FROM users WHERE role='provider' AND is_active=TRUE
           AND $1=ANY(COALESCE(specialties,'{}')) AND city ILIKE $2
         ORDER BY CASE WHEN profile_image IS NOT NULL AND bio IS NOT NULL THEN 0 ELSE 1 END,
           COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) DESC LIMIT 30`,
        [cat, '%'+city+'%']);
      providers = r.rows;
    } catch(e){ providers = []; }

    const title = `${cat} في ${city} — أفضل المزوّدين وعروض الأسعار | مناقصة`;
    const desc = `تبحث عن ${cat} في ${city}؟ تصفّح مزوّدين موثوقين، أو انشر مشروعك مجاناً على مناقصة واستقبل عروض أسعار من عدة مزوّدين واختر الأنسب.`;
    const canonical = `${SITE_URL}/dalil/${seoSlug(cat)}/${seoSlug(city)}`;

    const provCards = providers.length ? providers.map(p => {
      const nm = seoEsc(p.business_name || p.name || 'مزوّد');
      const av = p.avg_rating ? `<span style="color:#F0A500">${seoStars(p.avg_rating)}</span> <span style="color:#64748b;font-size:12px">${(+p.avg_rating).toFixed(1)} (${p.review_count})</span>` : '<span style="color:#94a3b8;font-size:12px">جديد</span>';
      const slug = seoSlug(p.business_name || p.name || 'مزود') + '-' + p.id;
      const bio = p.bio ? `<p style="font-size:13px;color:#3a4c6b;margin:6px 0 0;line-height:1.7">${seoEsc(String(p.bio).slice(0,120))}</p>` : '';
      return `<div style="background:#fff;border:1px solid #e6eefb;border-radius:14px;padding:15px;margin-bottom:11px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><h3 style="margin:0;font-size:15px;color:#1e3a8a"><a href="/pro/${slug}" style="color:#1e3a8a;text-decoration:none">${nm}</a></h3><div>${av}</div></div><div style="font-size:12px;color:#64748b;margin-top:3px">📍 ${seoEsc(p.city||city)} · ${seoEsc(cat)}</div>${bio}<a href="/pro/${slug}" style="display:inline-block;margin-top:10px;font-size:12.5px;font-weight:700;color:#1e40af;text-decoration:none">عرض الملف ←</a></div>`;
    }).join('') : `<p style="background:#fff;border:1px solid #e6eefb;border-radius:14px;padding:18px;color:#64748b">لا يوجد مزوّدون مسجّلون بعد في ${seoEsc(cat)} بـ${seoEsc(city)}. <strong>كن أول من يستفيد:</strong> انشر مشروعك وسنوصّلك بمزوّدين مناسبين.</p>`;

    const otherCities = SEO_CITIES.filter(c=>c!==city).slice(0,10).map(c=>`<a href="/dalil/${seoSlug(cat)}/${seoSlug(c)}" style="display:inline-block;margin:3px;padding:5px 11px;background:#eef4ff;border:1px solid #cdddf9;border-radius:16px;color:#1e40af;text-decoration:none;font-size:12.5px">${seoEsc(cat)} ${seoEsc(c)}</a>`).join('');
    const otherCats = SEO_CATS.filter(c=>c!==cat).slice(0,10).map(c=>`<a href="/dalil/${seoSlug(c)}/${seoSlug(city)}" style="display:inline-block;margin:3px;padding:5px 11px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;color:#15803d;text-decoration:none;font-size:12.5px">${seoEsc(c)} ${seoEsc(city)}</a>`).join('');

    const _intro = seoRichIntro(cat, city);
    const _faq = seoRichFaq(cat, city);
    const _tips = seoRichTips(cat);

    const schema = {
      "@context":"https://schema.org","@graph":[
      {
      "@type":"CollectionPage",
      "name":title,"description":desc,"url":canonical,
      "about":{"@type":"Service","serviceType":cat,"areaServed":{"@type":"City","name":city}},
      "mainEntity":{"@type":"ItemList","numberOfItems":providers.length,
        "itemListElement":providers.slice(0,10).map((p,i)=>({"@type":"ListItem","position":i+1,"name":(p.business_name||p.name||'مزوّد'),"url":`${SITE_URL}/pro/${seoSlug(p.business_name||p.name||'مزود')}-${p.id}`}))}
      },
      {
      "@type":"FAQPage",
      "mainEntity": _faq.data.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))
      }]
    };

    const _pageHtml = `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${seoEsc(title)}</title><meta name="description" content="${seoEsc(desc)}"><link rel="canonical" href="${canonical}"><meta property="og:title" content="${seoEsc(title)}"><meta property="og:description" content="${seoEsc(desc)}"><meta property="og:url" content="${canonical}"><meta property="og:type" content="website"><script type="application/ld+json">${JSON.stringify(schema)}</script><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet"><style>*{box-sizing:border-box}body{font-family:Tajawal,system-ui,sans-serif;background:#f0f5ff;color:#1e293b;margin:0;line-height:1.8}.wrap{max-width:760px;margin:0 auto;padding:20px 16px 50px}.hero{background:linear-gradient(135deg,#172554,#1e3a8a 55%,#2563eb);color:#fff;border-radius:18px;padding:26px 22px;margin-bottom:20px}.hero h1{margin:0 0 8px;font-size:23px}.hero p{margin:0;opacity:.92;font-size:14px}.cta{display:inline-block;margin-top:16px;background:#fff;color:#1e3a8a;padding:13px 30px;border-radius:12px;font-weight:800;text-decoration:none;font-size:15px}h2{color:#1e3a8a;font-size:18px;margin:26px 0 12px}a{color:#1e40af}.nav{background:#172554;padding:12px 16px;display:flex;justify-content:space-between;align-items:center}.nav a{color:#fff;text-decoration:none;font-weight:800}.foot{text-align:center;color:#64748b;font-size:12px;padding:20px 0}</style></head><body><div class="nav"><a href="/">مناقصة</a><a href="/" style="background:#0ea5e9;padding:7px 16px;border-radius:9px;font-size:13px">انشر مشروعك</a></div><div class="wrap"><div class="hero"><h1>${seoEsc(cat)} في ${seoEsc(city)}</h1><p>تصفّح أفضل مزوّدي ${seoEsc(cat)} في ${seoEsc(city)}، أو انشر مشروعك مجاناً واستقبل عروض أسعار من عدة مزوّدين واختر الأنسب لك.</p><a class="cta" href="/">📝 انشر مشروعك مجاناً</a></div><p>هل تبحث عن <strong>${seoEsc(cat)}</strong> موثوق في <strong>${seoEsc(city)}</strong>؟ في مناقصة تنشر مشروعك مرة واحدة، ويصلك عدة عروض تختار منها الأنسب سعراً وجودة — بدل الاتصال على كل مزوّد وحده.</p><h2>مزوّدو ${seoEsc(cat)} في ${seoEsc(city)}</h2>${provCards}<div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:16px;padding:22px;text-align:center;color:#fff;margin:24px 0"><div style="font-size:17px;font-weight:800;margin-bottom:8px">ما لقيت اللي يناسبك؟</div><div style="font-size:13px;opacity:.9;margin-bottom:15px">انشر مشروعك وخلّ المزوّدين يتنافسون على تقديم أفضل عرض لك — مجاناً.</div><a href="/" style="background:#fff;color:#1e3a8a;padding:12px 28px;border-radius:11px;font-weight:800;text-decoration:none">انشر مشروعك الآن</a></div><h2>عن خدمات ${seoEsc(cat)} في ${seoEsc(city)}</h2><p>${seoEsc(_intro)}</p><h2>نصائح قبل اختيار مزوّد ${seoEsc(cat)}</h2>${_tips}<h2>أسئلة شائعة عن ${seoEsc(cat)} في ${seoEsc(city)}</h2>${_faq.html}<h2>${seoEsc(cat)} في مدن أخرى</h2><div>${otherCities}</div><h2>خدمات أخرى في ${seoEsc(city)}</h2><div>${otherCats}</div><p class="foot">مناقصة — منصة الخدمات السعودية · <a href="/dalil">كل الخدمات والمدن</a></p></div></body></html>`;
    _dalilCache.set(_ck, { html: _pageHtml, exp: Date.now() + _DALIL_TTL });
    res.set('Content-Type','text/html; charset=utf-8').send(_pageHtml);
  } catch(e){ console.error('/dalil SSR:', e.message); res.redirect(302,'/dalil'); }
});

// خريطة الموقع (Sitemap) — يساعد قوقل يكتشف صفحات SEO
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
app.post('/api/card/:token', rateLimiter(20, 600000), async (req, res) => {
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

// ═══ كراسة المشروع (Brief) — توليد المشروع ═══
// (أدمن) اقتراح مزودين مطابقين لمشروع من قائمة الاستقطاب
app.get('/api/admin/requests/:id/match-leads', requirePermission('outreach.manage'), async (req, res) => {
  try{
    const id = parseInt(req.params.id);
    const rq = await pool.query('SELECT id, title, category, city, budget_max FROM requests WHERE id=$1', [id]);
    if(!rq.rows.length) return res.status(404).json({ message:'المشروع غير موجود' });
    const p = rq.rows[0];
    // تحكّم يدوي: يتجاوز مطابقة المشروع الافتراضية عند تمريره
    const qCity = (req.query.city != null) ? String(req.query.city).trim() : (p.city || '');
    const qCat  = (req.query.cat  != null) ? String(req.query.cat).trim()  : (p.category || '');
    const minScore = parseInt(req.query.min_score) || 0;
    const cityLike = qCity ? '%'+qCity+'%' : null;
    const catLike  = qCat  ? '%'+qCat+'%'  : null;
    const r = await pool.query(
      `SELECT id, name, phone, phone_norm, category, city, score, status, card_token
       FROM leads
       WHERE lead_type='provider' AND phone_norm IS NOT NULL AND status NOT IN ('converted','rejected')
         AND ($1::text IS NULL OR city ILIKE $1)
         AND ($2::text IS NULL OR category ILIKE $2)
         AND (COALESCE(score,0) >= $3)
       ORDER BY score DESC NULLS LAST, updated_at DESC LIMIT 80`, [cityLike, catLike, minScore]);
    let leads = r.rows;
    // fallback: لو ما فيه مطابقة بالتخصص+المدينة، جرّب المدينة فقط (فقط عند عدم وجود تحكّم يدوي بالتخصص)
    if(!leads.length && cityLike && req.query.cat == null){
      const r2 = await pool.query(
        `SELECT id, name, phone, phone_norm, category, city, score, status, card_token
         FROM leads WHERE lead_type='provider' AND phone_norm IS NOT NULL AND status NOT IN ('converted','rejected')
           AND city ILIKE $1 AND (COALESCE(score,0) >= $2) ORDER BY score DESC NULLS LAST LIMIT 80`, [cityLike, minScore]);
      leads = r2.rows;
    }
    res.json({
      project: { id:p.id, title:p.title, category:p.category, city:p.city, budget_max:p.budget_max },
      brief_url:`${SITE_URL}/brief/${p.id}`,
      filters: { city:qCity, cat:qCat, min_score:minScore },
      leads
    });
  }catch(e){ console.error('match-leads:', e.message); res.status(500).json({ message:'تعذّر' }); }
});

// صفحة الكراسة العامة (noindex) — لا تكشف بيانات العميل
app.get('/brief/:id', (req, res) => res.sendFile(__dirname + '/brief.html'));

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

// تهريب HTML لمنع حقن روابط/وسوم في الإيميلات (ناقل تصيّد)
function eEsc(v){ return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

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
  // المالك يملك كل الصلاحيات دائماً — يمنع حجب نفسه عن اللوحة بأي إعداد خاطئ
  if(row.email && row.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) return ['*'];
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
        'عندك عروض بانتظارك 🎯', `وصلك ${x.bids} عرض على "${eEsc(x.title)}" — قارن واختر الأنسب`,
        'عروض بانتظار اختيارك', `<p>وصلك <strong>${x.bids}</strong> عرض على مشروعك "<strong>${eEsc(x.title)}</strong>".</p><p>ادخل الآن، قارن العروض، واختر الأنسب لك.</p>`,
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
        'أتمم صفقتك ✅', `مشروعك "${eEsc(x.title)}" ما زال قيد التنفيذ — تابع مع المزوّد لإتمامه`,
        'أتمم صفقتك', `<p>مشروعك "<strong>${eEsc(x.title)}</strong>" ما زال مفتوحاً.</p><p>تابع مع المزوّد، أكمل الصفقة، ثم قيّمه ليستفيد غيرك.</p>`,
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
        'قيّم المزوّد ⭐', `كيف كانت تجربتك في "${eEsc(x.title)}"؟ أضف تقييمك الآن`,
        'رأيك يهمّنا', `<p>أنهيت مشروع "<strong>${eEsc(x.title)}</strong>".</p><p>قيّم المزوّد ليساعد غيرك على الاختيار الصحيح — دقيقة واحدة تكفي.</p>`,
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
        // نحسب الفرق في JS (طرح المعاملات النصية داخل SQL يسبب: operator is not unique)
        const warnFrom = Number(closeDays) - Number(warnBefore);
        const w = await pool.query(
          `SELECT id, client_id, title FROM requests
           WHERE status='open' AND assigned_provider_id IS NULL
             AND created_at <= NOW() - ($1 || ' days')::interval
             AND created_at >  NOW() - ($2 || ' days')::interval`, [String(warnFrom), String(closeDays)]);
        for(const x of w.rows){
          await _remindOnce(x.client_id, 'close_warn', x.id,
            'مشروعك على وشك الإغلاق ⏰', `سيُغلق "${eEsc(x.title)}" تلقائياً بعد ${warnBefore} يوم — بادر باختيار عرض`,
            'بادر قبل إغلاق مشروعك', `<p>مشروعك "<strong>${eEsc(x.title)}</strong>" سيُغلق تلقائياً خلال <strong>${warnBefore} يوم</strong> لعدم اختيار عرض.</p><p>ادخل الآن واختر الأنسب قبل فوات الفرصة.</p>`,
            'اختر عرضاً الآن', SITE_URL+'/dashboard-client.html');
        }
      }
      // الإغلاق الفعلي
      const cl = await pool.query(
        `UPDATE requests SET status='closed_auto'
         WHERE status='open' AND assigned_provider_id IS NULL AND close_at IS NULL
           AND created_at <= NOW() - ($1 || ' days')::interval
         RETURNING id, client_id, title`, [String(closeDays)]);
      for(const x of cl.rows){
        try{ await notify(x.client_id, 'أُغلق مشروعك', `أُغلق "${eEsc(x.title)}" تلقائياً لعدم اختيار عرض خلال المدة`, 'request', x.id); }catch(e){}
      }
      if(cl.rows.length) console.log(`[lifecycle] أُغلق ${cl.rows.length} مشروع تلقائياً`);
    }
    // ب) مشاريع لها تاريخ إغلاق خاص حدّده صاحبها (close_at) — مستقلة عن الإعداد العام
    {
      const clC = await pool.query(
        `UPDATE requests SET status='closed_auto'
         WHERE status='open' AND assigned_provider_id IS NULL
           AND close_at IS NOT NULL AND close_at <= NOW()
         RETURNING id, client_id, title`);
      for(const x of clC.rows){
        try{ await notify(x.client_id, 'أُغلق مشروعك', `أُغلق "${eEsc(x.title)}" تلقائياً عند انتهاء المدة التي حددتها`, 'request', x.id); }catch(e){}
      }
      if(clC.rows.length) console.log(`[lifecycle] أُغلق ${clC.rows.length} مشروع (تاريخ خاص)`);
    }

    // ب) مشروع اختير مزوّده ولم يُتمّ: مشروع تأكيد (موافقة ضمنية)
    if((await getSetting('lc_confirm_on','1'))!=='0'){
      const confirmDays = Math.max(1, parseInt(await getSetting('lc_confirm_days','20'))||20);
      const graceDays   = Math.max(1, parseInt(await getSetting('lc_confirm_grace','3'))||3);
      // 1) اطلب التأكيد (مرّة)، وسجّل وقت المشروع
      const ask = await pool.query(
        `SELECT id, client_id, title FROM requests
         WHERE assigned_provider_id IS NOT NULL AND completed_at IS NULL
           AND status NOT IN ('completed','cancelled','closed_auto','archived_auto')
           AND (confirm_requested_at IS NULL)
           AND assigned_at <= NOW() - ($1 || ' days')::interval`, [String(confirmDays)]);
      for(const x of ask.rows){
        try{
          await pool.query(`UPDATE requests SET confirm_requested_at=NOW() WHERE id=$1`, [x.id]);
          await notifyWithEmail(x.client_id, 'هل تمّ تنفيذ مشروعك؟', `أكّد إن كان "${eEsc(x.title)}" قد نُفّذ`, 'request', x.id,
            'أكّد إتمام مشروعك ✅', `<p>مشروعك "<strong>${eEsc(x.title)}</strong>" مع المزوّد المختار.</p><p>هل تمّ التنفيذ؟ ادخل وأكّد — وإن لم ترد خلال ${graceDays} أيام سنعتبره منتهياً تلقائياً.</p>`,
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
        try{ await notify(x.client_id, 'اكتمل مشروعك', `اعتُبر "${eEsc(x.title)}" منتهياً — لا تنسَ تقييم المزوّد`, 'request', x.id); }catch(e){}
    const _wb = await pool.query("SELECT price FROM bids WHERE request_id=$1 AND status='accepted' LIMIT 1", [id]);
    const _cfee = _wb.rows.length ? Math.round((parseFloat(_wb.rows[0].price)||0) * 0.03) : 0;
    await notify(row.assigned_provider_id, 'اكتمل المشروع ✅', 'تم تأكيد إتمام «'+eEsc(row.title)+'» — لا تنسَ تقييم العميل.'+(_cfee>0?' 💰 سعي المنصة '+_cfee.toLocaleString('en-US')+' ر.س (3%) — سدّدها خلال 10 أيام — من صفحة الدفع.':''), 'completed', id);
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
    // هـ) مشروع لم يصله أي عرض بعد مدة → نصيحة تحسين الوصف للعميل
    if((await getSetting('q_nooffers_on','1'))!=='0'){
      const noDays = Math.max(1, parseInt(await getSetting('q_nooffers_days','3'))||3);
      const noOffers = await pool.query(
        `SELECT r.id, r.client_id, r.title FROM requests r
         WHERE r.status='open' AND r.assigned_provider_id IS NULL
           AND r.created_at <= NOW() - ($1 || ' days')::interval
           AND NOT EXISTS (SELECT 1 FROM bids b WHERE b.request_id=r.id)`, [String(noDays)]);
      for(const x of noOffers.rows){
        await _remindOnce(x.client_id, 'no_offers', x.id,
          'لم تصلك عروض بعد 💡', `حسّن وصف "${eEsc(x.title)}" (تفاصيل، ميزانية، صور) لجذب عروض أفضل`,
          'اجعل مشروعك يجذب العروض', `<p>مشروعك "<strong>${eEsc(x.title)}</strong>" لم تصله عروض حتى الآن.</p><p>أضف تفاصيل أوضح، ميزانية تقديرية، وصوراً — المشاريع الواضحة تحصل على عروض أسرع وأفضل.</p>`,
          'تحسين المشروع', SITE_URL+'/dashboard-client.html');
      }
    }
    // و) مزوّد تقييمه منخفض → تنبيه لطيف لتحسين الخدمة
    if((await getSetting('q_lowrating_on','1'))!=='0'){
      const thr = parseFloat(await getSetting('q_lowrating_threshold','3.0'))||3.0;
      const minR = Math.max(1, parseInt(await getSetting('q_lowrating_min','3'))||3);
      const low = await pool.query(
        `SELECT u.id FROM users u
         WHERE u.role='provider'
           AND (SELECT COUNT(*) FROM reviews WHERE reviewed_id=u.id) >= $2
           AND COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=u.id),0) > 0
           AND COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=u.id),0) < $1`, [thr, minR]);
      for(const x of low.rows){
        await _remindOnce(x.id, 'low_rating_'+Math.floor(Date.now()/(30*86400000)), x.id,
          'لنرتقِ بخدمتك ⭐', 'تقييمك الحالي أقل من المتوسط — تحسين التواصل والالتزام يرفع تقييمك وفرصك',
          'نصائح لرفع تقييمك', `<p>تقييمك الحالي أقل من المتوسط. لا تقلق — يمكن تحسينه بسرعة:</p><p>التزم بالمواعيد، تواصل بوضوح، واحرص على جودة التنفيذ. تقييم أعلى = عملاء أكثر.</p>`,
          'تحسين ملفي', SITE_URL+'/dashboard-provider.html');
      }
    }

    // ط) إيميل مطابقة مُجمّع للمزوّد — يجمع المشاريع الجديدة المطابقة منذ آخر إيميل (بدل الأسبوعي)
    if((await getSetting('provider_weekly_on','1'))!=='0'){
      const provs = await pool.query(
        `SELECT id, email, COALESCE(notify_categories, specialties) AS cats, city, COALESCE(serves_all_cities,FALSE) AS allcities, service_cities, last_match_email_at
           FROM users WHERE role='provider' AND is_active=TRUE`);
      for(const p of provs.rows){
        try{
          if(!p.email || /@manaqasa\.local$/i.test(p.email)) continue; // بريد حقيقي فقط
          const cats = Array.isArray(p.cats)?p.cats:[];
          if(!cats.length) continue;
          const opp = await pool.query(
            `SELECT r.id, r.title, r.city FROM requests r
             WHERE r.status='open' AND r.assigned_provider_id IS NULL
               AND r.created_at > COALESCE($3::timestamp, NOW() - INTERVAL '24 hours')
               AND r.category = ANY($1::text[])
               AND ($4::boolean OR r.city IS NULL OR ($2::text IS NULL AND ($5::text[] IS NULL OR cardinality($5::text[])=0)) OR r.city = $2 OR r.city = ANY(COALESCE($5::text[],ARRAY[]::text[])))
             ORDER BY r.created_at DESC LIMIT 12`,
            [cats, p.city||null, p.last_match_email_at||null, p.allcities, p.service_cities||null]);
          const rows = opp.rows||[];
          if(!rows.length) continue;
          const items = rows.map(r=>`<li style="margin-bottom:6px"><strong>${eEsc(r.title||'')}</strong>${r.city?(' — '+eEsc(r.city)):''}</li>`).join('');
          const title = `🔔 ${rows.length} مشروع جديد يناسب تخصصك`;
          const body = `<p>ظهرت مشاريع جديدة تطابق تخصصك${p.city&&!p.allcities?(' في '+eEsc(p.city)):''}:</p><ul style="padding-inline-start:18px;margin:10px 0">${items}</ul><p>سارع بتقديم عروضك — المبادرة المبكرة ترفع فرص الفوز.</p>`;
          sendEmail(p.email, title, emailTpl(title, body, 'تصفّح المشاريع', SITE_URL+'/dashboard-provider.html')).catch(()=>{});
          await pool.query('UPDATE users SET last_match_email_at=NOW() WHERE id=$1', [p.id]);
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
          'لديك أسئلة بانتظار ردّك ❓', `${x.cnt} سؤال على "${eEsc(x.title)}" — ردّك يساعدك تحصل على عروض أدق`,
          'أسئلة بانتظار ردّك', `<p>وصلك <strong>${x.cnt}</strong> سؤال من المزوّدين على مشروعك "<strong>${eEsc(x.title)}</strong>".</p><p>الرد السريع يوضّح مشروعك ويجذب عروضاً أفضل.</p>`,
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
          'تابع عرضك 💬', `عرضك على "${eEsc(x.title)}" لا يزال قيد المراجعة — تواصل مع العميل لتحسين فرصك`,
          'تابع عرضك المعلّق', `<p>عرضك على "<strong>${eEsc(x.title)}</strong>" لم يُبتّ فيه بعد.</p><p>بادر بالتواصل مع العميل عبر المحادثة أو حسّن عرضك — المتابعة ترفع فرص القبول.</p>`,
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
// ذاكرة مؤقتة لحالة الحساب (60 ثانية) — يجعل الحظر/الحذف ساري المفعول فوراً تقريباً بلا إثقال القاعدة
const _userState = new Map();
setInterval(() => { const now = Date.now(); for (const [k,v] of _userState) { if (now > v.exp) _userState.delete(k); } }, 120000);
async function isUserUsable(id){
  const hit = _userState.get(id);
  if (hit && Date.now() < hit.exp) return hit.ok;
  try {
    const r = await pool.query('SELECT is_active FROM users WHERE id=$1', [id]);
    const ok = !!(r.rows.length && r.rows[0].is_active !== false);
    _userState.set(id, { ok, exp: Date.now() + 60000 });
    return ok;
  } catch(e) { return true; } // لا نمنع الخدمة عند عطل قاعدة البيانات
}
function auth(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  let payload;
  try { payload = jwt.verify(token, JWT_SECRET); }
  catch { return res.status(401).json({ message: 'جلسة منتهية' }); }
  req.user = payload;
  isUserUsable(payload.id).then(ok => {
    if (!ok) return res.status(403).json({ message: 'الحساب موقوف أو غير موجود' });
    next();
  }).catch(() => next());
}
// مصادقة اختيارية: تقرأ المستخدم إن وُجد التوكن، بدون رفض المشروع
function optionalAuth(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (token) { try { req.user = jwt.verify(token, JWT_SECRET); } catch(e) {} }
  next();
}
function adminOnly(req, res, next) { if (req.user.role !== 'admin') return res.status(403).json({ message: 'للمدير فقط' }); next(); }
async function clientOnly(req, res, next) {
  if (req.user.role === 'client' || req.user.role === 'admin') return next();
  try { const r = await pool.query('SELECT can_request FROM users WHERE id=$1', [req.user.id]); if (r.rows[0] && r.rows[0].can_request) return next(); } catch(e){}
  return res.status(403).json({ message: 'للعملاء فقط' });
}
async function providerOnly(req, res, next) {
  if (req.user.role === 'provider' || req.user.role === 'admin') return next();
  try { const r = await pool.query('SELECT can_provide FROM users WHERE id=$1', [req.user.id]); if (r.rows[0] && r.rows[0].can_provide) return next(); } catch(e){}
  return res.status(403).json({ message: 'لمزودي الخدمة فقط' });
}

// ═══ DATABASE SETUP ═══
async function setupDatabase() {
  console.log('🔄 Setting up database...');
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255), password_hash VARCHAR(255), phone VARCHAR(20), role VARCHAR(20) NOT NULL CHECK (role IN ('client','provider','admin')), specialties TEXT[], notify_categories TEXT[], bio TEXT, city VARCHAR(100), badge VARCHAR(50) DEFAULT 'none', is_active BOOLEAN DEFAULT TRUE, experience_years INTEGER, portfolio_images TEXT[], profile_image TEXT, report_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS requests (id SERIAL PRIMARY KEY, client_id INTEGER REFERENCES users(id), title VARCHAR(255) NOT NULL, description TEXT NOT NULL, category VARCHAR(100), city VARCHAR(100), address TEXT, budget_max DECIMAL(10,2), deadline DATE, image_url TEXT, images TEXT[], attachments JSONB, main_image_index INTEGER DEFAULT 0, project_number VARCHAR(50), status VARCHAR(20) DEFAULT 'pending_review', assigned_provider_id INTEGER REFERENCES users(id), assigned_at TIMESTAMP, completed_at TIMESTAMP, admin_notes TEXT, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS bids (id SERIAL PRIMARY KEY, request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE, provider_id INTEGER REFERENCES users(id), price INTEGER NOT NULL, days INTEGER NOT NULL, note TEXT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW(), UNIQUE(request_id, provider_id))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE, sender_id INTEGER REFERENCES users(id), receiver_id INTEGER REFERENCES users(id), content TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW())`);
    // حظر بين المستخدمين: blocker يحظر blocked فلا تصله رسائله
    await pool.query(`CREATE TABLE IF NOT EXISTS user_blocks (id SERIAL PRIMARY KEY, blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE, blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(blocker_id, blocked_id))`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_blocks_pair ON user_blocks(blocker_id, blocked_id)`);
    // إثراء المحادثة: مرفقات · الرد على رسالة · حذف ناعم
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP`);
    // خصوصية السعر: 'client' = لصاحب المشروع فقط (الافتراضي) · 'public' = للجميع
    await pool.query(`ALTER TABLE bids ADD COLUMN IF NOT EXISTS price_visibility TEXT DEFAULT 'client'`);
    // ملف عرض السعر الرسمي (صورة/PDF) — يتبع رؤية السعر: يشوفه صاحب المشروع فقط إن كان السعر خاصاً
    await pool.query(`ALTER TABLE bids ADD COLUMN IF NOT EXISTS attachment_url TEXT`);
    // أساس التسعير: total=إجمالي · meter=للمتر · unit=للوحدة/القطعة
    await pool.query(`ALTER TABLE bids ADD COLUMN IF NOT EXISTS price_unit TEXT DEFAULT 'total'`);
    // #٦ المندوب: اسم + نسبة% على المشروع — يُحتسب مستحقّه من قيمة العرض المعتمد
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS agent_name TEXT`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS agent_pct NUMERIC`);
    // إشعار العميل تلقائياً بتقرير العروض عند بلوغ حدّ معيّن (يخزّن عدد العروض وقت الإشعار)
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS offers_report_notified INTEGER DEFAULT 0`);
    // ═══ سجل المناديب الخفيف (بلا حساب) — مندوب واحد ← عدة مشاريع، يتابع عبر رابط سحري ═══
    await pool.query(`CREATE TABLE IF NOT EXISTS agents (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      token TEXT UNIQUE,
      default_pct NUMERIC DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS agent_id INTEGER`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS agent_phone TEXT`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS agent_paid_at TIMESTAMP`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_requests_agent ON requests(agent_id)`);
    // المزوّد: خدمة كل المدن + وقت آخر إيميل مطابقة (للإيميل المُجمّع)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS serves_all_cities BOOLEAN DEFAULT FALSE`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS service_cities TEXT[]`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_match_email_at TIMESTAMP`);
    // ترحيل التخصصات القديمة إلى الأسماء الموحّدة (يُشغّل مرة — بعدها لا يطابق شيئاً)
    try {
      await pool.query("UPDATE users SET specialties=array_replace(specialties,'أبواب','أبواب وبوابات أوتوماتيكية') WHERE 'أبواب'=ANY(specialties)");
      await pool.query("UPDATE users SET specialties=array_replace(specialties,'جبس وطباشير','جبس') WHERE 'جبس وطباشير'=ANY(specialties)");
      await pool.query("UPDATE users SET notify_categories=array_replace(notify_categories,'أبواب','أبواب وبوابات أوتوماتيكية') WHERE 'أبواب'=ANY(notify_categories)");
      await pool.query("UPDATE users SET notify_categories=array_replace(notify_categories,'جبس وطباشير','جبس') WHERE 'جبس وطباشير'=ANY(notify_categories)");
      await pool.query("UPDATE requests SET category='أبواب وبوابات أوتوماتيكية' WHERE category='أبواب'");
      await pool.query("UPDATE requests SET category='جبس' WHERE category='جبس وطباشير'");
    } catch(e) { console.error('category migration:', e.message); }
    // إعادة تعيين كلمة المرور: رمز مؤقّت + تاريخ انتهائه
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP`);
    // رابط الدخول السحري القصير: رمز مخزّن + انتهاؤه (للعميل المنشور بالوكالة وغيره)
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS magic_token TEXT`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS magic_expires TIMESTAMP`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_magic ON users(magic_token)`);
    // موقع المشروع: الحي (عام) + الإحداثيات (للمزوّد المقبول فقط — حماية خصوصية العميل)
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS district TEXT`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS geo_lat DOUBLE PRECISION`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS close_at TIMESTAMP`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMP`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS reminder_stage VARCHAR(20)`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS followup_stage VARCHAR(20)`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS close_reason VARCHAR(60)`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS close_reason_note TEXT`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP`);
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS geo_lng DOUBLE PRECISION`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type TEXT`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_name TEXT`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS waveform TEXT`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to INTEGER`);
    await pool.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_req ON messages(request_id, created_at)`);
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
      try { await pool.query("ALTER TABLE requests ADD COLUMN IF NOT EXISTS brief_views INTEGER DEFAULT 0"); } catch(e){}
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
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS can_provide BOOLEAN DEFAULT FALSE'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS can_request BOOLEAN DEFAULT FALSE'); } catch(e){}
    try { await pool.query("UPDATE users SET can_provide=TRUE WHERE role='provider' AND can_provide IS NOT TRUE"); } catch(e){}
    try { await pool.query("UPDATE users SET can_request=TRUE WHERE role='client' AND can_request IS NOT TRUE"); } catch(e){}
    // توحيد التخصصات الإنجليزية القديمة إلى العربية (مرة واحدة، آمن عبر array_replace)
    try {
      const _specMap = {
        'Aluminum':'ألمنيوم','Cooling and air conditioning':'تبريد وتكييف','Air conditioning':'تبريد وتكييف',
        'Electricity':'كهرباء','Electrical':'كهرباء','Plumbing':'سباكة','Carpentry':'نجارة','Cleaning':'تنظيف',
        'Furniture moving':'نقل عفش','Blacksmithing':'حدادة','Metalwork':'حدادة','Aluminium':'ألمنيوم',
        'Swimming pools':'مسابح','Surveillance cameras':'كاميرات مراقبة','Cameras':'كاميرات مراقبة',
        'Networks and internet':'شبكات وإنترنت','Networks':'شبكات وإنترنت','Umbrellas and barriers':'مظلات وسواتر',
        'Thermal insulation':'عزل حراري','Insulation':'عزل حراري','Pest control':'مكافحة حشرات',
        'Building':'بناء','Construction':'بناء','Gypsum':'جبس','Water leak detection':'كشف تسربات المياه',
        'Tank cleaning':'تنظيف خزانات','Painting and decoration':'دهانات وديكور','Painting':'دهانات وديكور',
        'Kitchen installation':'تركيب مطابخ','Landscaping':'تنسيق حدائق','Glass and mirrors':'زجاج ومرايا',
        'Tiles and marble':'بلاط ورخام','Tiling':'بلاط ورخام','Furniture installation':'تركيب أثاث',
        'Furniture assembly':'تركيب أثاث','Parquet':'أرضيات خشبية وباركيه','Wooden floors':'أرضيات خشبية وباركيه',
        'Carpet cleaning':'تنظيف سجاد وكنب','Elevator maintenance':'صيانة مصاعد',
        'Automatic doors and gates':'أبواب وبوابات أوتوماتيكية','Doors and gates':'أبواب وبوابات أوتوماتيكية',
        'Building facades cleaning':'تنظيف واجهات المباني','Facade cleaning':'تنظيف واجهات المباني',
        'Restoration of buildings':'ترميم مبانٍ','Restoration':'ترميم مبانٍ','Well drilling':'حفر آبار ومضخات',
        'Cladding':'كلادينج وواجهات','Cladding and facades':'كلادينج وواجهات','Solar systems':'أنظمة شمسية',
        'Waterproofing':'عوازل مائية','Heavy equipment':'معدات ثقيلة','General maintenance':'صيانة عامة'
      };
      for (const en of Object.keys(_specMap)) {
        await pool.query("UPDATE users SET specialties = array_replace(specialties, $1, $2) WHERE $1 = ANY(specialties)", [en, _specMap[en]]);
      }
    } catch(e){ console.error('spec migration:', e.message); }
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
    // ═══ فهارس الأداء — تمنع مسح الجداول كاملة مع نمو البيانات ═══
    const _idx = [
      'CREATE INDEX IF NOT EXISTS idx_requests_client ON requests(client_id)',
      'CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status)',
      'CREATE INDEX IF NOT EXISTS idx_requests_provider ON requests(assigned_provider_id)',
      'CREATE INDEX IF NOT EXISTS idx_requests_created ON requests(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_requests_cat_city ON requests(category, city)',
      'CREATE INDEX IF NOT EXISTS idx_bids_request ON bids(request_id)',
      'CREATE INDEX IF NOT EXISTS idx_bids_provider ON bids(provider_id)',
      'CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status)',
      'CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, is_read)',
      'CREATE INDEX IF NOT EXISTS idx_messages_request ON messages(request_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_reviewed ON reviews(reviewed_id)',
      'CREATE INDEX IF NOT EXISTS idx_reviews_request ON reviews(request_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)',
      'CREATE INDEX IF NOT EXISTS idx_users_city ON users(city)',
      'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)',
      'CREATE INDEX IF NOT EXISTS idx_questions_request ON request_questions(request_id)',
      'CREATE INDEX IF NOT EXISTS idx_push_user ON push_tokens(user_id)'
    ];
    for (const q of _idx) { try { await pool.query(q); } catch(e) {} }
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
    if (String(password).length < 6) return res.status(400).json({ message: 'كلمة المرور قصيرة (6 أحرف على الأقل)' });
    if (!['client', 'provider'].includes(role)) return res.status(400).json({ message: 'نوع المستخدم غير صحيح' });
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(400).json({ message: 'الإيميل مستخدم مسبقاً' });
    // منع تكرار الجوال (يقارن الصيغة الخام والموحّدة) — يمنع حرمان صاحب الرقم من الدخول واختطاف ربط المستهدفين
    if (phone && String(phone).trim()) {
      const raw = String(phone).trim();
      const norm = normPhone(raw);
      const dupPhone = await pool.query(
        `SELECT id FROM users WHERE phone IS NOT NULL AND (phone=$1 OR regexp_replace(phone,'[^0-9]','','g') = $2) LIMIT 1`,
        [raw, norm ? norm : raw.replace(/[^0-9]/g,'')]
      );
      if (dupPhone.rows.length) return res.status(400).json({ message: 'رقم الجوال مستخدم لحساب آخر' });
    }
    const hash = await bcrypt.hash(password, 10);
    const specs = role === 'provider' ? (Array.isArray(specialties) ? specialties : (specialties ? [specialties] : null)) : null;
    const notifyCats = role === 'provider' ? (Array.isArray(req.body.notify_categories) ? req.body.notify_categories : specs) : null;
    const servesAll = role === 'provider' ? (req.body.serves_all_cities === true || req.body.serves_all_cities === 'true') : false;
    const serviceCities = (role === 'provider' && Array.isArray(req.body.service_cities)) ? req.body.service_cities.map(function(x){return String(x).trim();}).filter(Boolean).slice(0,20) : null;
    const isProv = role === 'provider';
    const result = await pool.query(`INSERT INTO users (name, email, phone, password, password_hash, role, specialties, notify_categories, city, bio, business_name, experience_years, website, location_url, instagram, tiktok, snapchat, twitter, youtube, profile_image, portfolio_images, referred_by, serves_all_cities, service_cities, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,true,NOW()) RETURNING id, name, email, role, city, badge`, [name, email, phone||null, hash, hash, role, specs, notifyCats, city||null, bio||null, isProv?(req.body.business_name||null):null, isProv?(req.body.experience_years||null):null, isProv?(req.body.website||null):null, isProv?(req.body.location_url||null):null, isProv?(req.body.instagram||null):null, isProv?(req.body.tiktok||null):null, isProv?(req.body.snapchat||null):null, isProv?(req.body.twitter||null):null, isProv?(req.body.youtube||null):null, req.body.profile_image||null, isProv&&Array.isArray(req.body.portfolio_images)?req.body.portfolio_images:null, (typeof req.body.ref==='string'?req.body.ref.slice(0,40):null), servesAll, serviceCities]);
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
      if (email) sendEmail(email, welcomeTitle, emailTpl(welcomeTitle, welcomeBody, isProvider?'استكشف المشاريع':'انشر مشروعك الأول', SITE_URL+(isProvider?'/dashboard-provider.html':'/dashboard-client.html'))).catch(()=>{});
    } catch(we) { console.error('welcome notification:', we.message); }
    res.json({ user, token });
  } catch(e) { console.error('Register:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// [أُزيلت] /api/direct-admin — كانت باباً خلفياً يسمح بإنشاء/اختطاف حساب أدمن عبر رابط GET
// بكلمة سر افتراضية مكتوبة في الكود. تُدار حسابات المشرفين الآن من لوحة الأدمن (admins.manage) فقط.


app.put('/api/auth/change-password', rateLimiter(10, 600000), auth, async (req, res) => {
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

// ═══ نسيت كلمة المرور: يرسل رابط إعادة تعيين للبريد (إن وُجد بريد حقيقي) ═══
// نرجّع دائماً رسالة نجاح عامّة حتى لا نكشف إن كان الحساب موجوداً أم لا (منع الاستعلام العشوائي)
app.post('/api/auth/forgot-password', rateLimiter(5, 600000), async (req, res) => {
  const generic = { ok: true, message: 'إذا كان الحساب موجوداً فستصلك رسالة بخطوات إعادة التعيين' };
  try {
    const raw = (req.body.email || req.body.phone || '').toString().trim();
    if (!raw) return res.status(400).json({ message: 'أدخل البريد أو رقم الجوال' });
    const phoneNorm = raw.replace(/\D/g, '').replace(/^0/, '966');
    // ابحث بالبريد أو بالجوال (بصيغته المُطبّعة)
    const r = await pool.query(
      "SELECT id, name, email FROM users WHERE email=$1 OR (phone IS NOT NULL AND regexp_replace(phone,'[^0-9]','','g')=$2) LIMIT 1",
      [raw, phoneNorm]);
    if (!r.rows.length) return res.json(generic);
    const u = r.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query("UPDATE users SET reset_token=$1, reset_expires=NOW()+INTERVAL '1 hour' WHERE id=$2", [token, u.id]);
    // نرسل الرابط فقط لبريد حقيقي (حسابات الوكالة تحمل بريداً وهمياً @manaqasa.local — لا يُرسل لها)
    const realEmail = u.email && !/@manaqasa\.local$/i.test(u.email);
    if (realEmail) {
      const link = SITE_URL + '/auth.html?reset=' + token;
      const title = '🔐 إعادة تعيين كلمة المرور';
      const body = `<p>عزيزي <strong>${eEsc(u.name || '')}</strong>،</p><p>وصلنا مشروع لإعادة تعيين كلمة المرور لحسابك في مناقصة. اضغط الزر أدناه خلال ساعة واحدة:</p><p style="color:#64748b;font-size:12.5px">إذا لم تطلب ذلك، تجاهل هذه الرسالة — كلمة مرورك تبقى كما هي.</p>`;
      sendEmail(u.email, title, emailTpl(title, body, 'إعادة تعيين كلمة المرور', link)).catch(()=>{});
    }
    return res.json(generic);
  } catch(e) { console.error('forgot-password:', e.message); return res.json(generic); }
});

// ═══ تعيين كلمة مرور جديدة عبر الرمز المؤقّت ═══
app.post('/api/auth/reset-password', rateLimiter(10, 600000), async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) return res.status(400).json({ message: 'البيانات ناقصة' });
    if (String(new_password).length < 6) return res.status(400).json({ message: 'كلمة المرور 6 أحرف على الأقل' });
    const r = await pool.query('SELECT id, email, name FROM users WHERE reset_token=$1 AND reset_expires > NOW() LIMIT 1', [token]);
    if (!r.rows.length) return res.status(400).json({ message: 'الرابط منتهي أو غير صالح — اطلب رابطاً جديداً' });
    const u = r.rows[0];
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1, password_hash=$2, reset_token=NULL, reset_expires=NULL WHERE id=$3', [hash, hash, u.id]);
    try {
      if (u.email && !/@manaqasa\.local$/i.test(u.email)) {
        const title = '✅ تم تغيير كلمة المرور';
        const body = `<p>عزيزي <strong>${eEsc(u.name || '')}</strong>،</p><p>تم تعيين كلمة مرور جديدة لحسابك بنجاح.</p><p>إذا لم تقم بهذا، تواصل معنا فوراً: <a href="mailto:cs@manaqasa.com" style="color:#C9920A">cs@manaqasa.com</a></p>`;
        sendEmail(u.email, title, emailTpl(title, body, null, null)).catch(()=>{});
      }
    } catch(e) {}
    return res.json({ ok: true, message: 'تم تعيين كلمة المرور' });
  } catch(e) { console.error('reset-password:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ الدخول السحري: رابط قصير يُرسل للعميل عبر واتساب فيدخله مباشرة بلا كلمة مرور ═══
// يُنشئ رمزاً قصيراً ويعيد استعماله ما دام صالحاً (فتبقى الروابط المُرسلة سابقاً تعمل)
async function getMagicToken(clientId) {
  const cur = await pool.query('SELECT magic_token, magic_expires FROM users WHERE id=$1', [clientId]);
  if (!cur.rows.length) return null;
  let tok = cur.rows[0].magic_token;
  const exp = cur.rows[0].magic_expires;
  const stillValid = tok && exp && new Date(exp) > new Date();
  if (!stillValid) tok = crypto.randomBytes(8).toString('hex'); // 16 حرفاً
  await pool.query("UPDATE users SET magic_token=$1, magic_expires=NOW()+INTERVAL '60 days' WHERE id=$2", [tok, clientId]);
  return tok;
}

app.post('/api/auth/magic-login', rateLimiter(10, 300000), async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'الرابط غير صالح' });
    let userId = null;
    // 1) الرمز القصير المخزّن
    const dbr = await pool.query('SELECT id FROM users WHERE magic_token=$1 AND magic_expires > NOW() LIMIT 1', [token]);
    if (dbr.rows.length) userId = dbr.rows[0].id;
    // 2) احتياط: رمز JWT قديم (روابط أُرسلت قبل هذا التحديث)
    if (!userId) { try { const p = jwt.verify(token, JWT_SECRET); if (p && p.purpose === 'magic' && p.id) userId = p.id; } catch(e) {} }
    if (!userId) return res.status(400).json({ message: 'الرابط منتهي أو غير صالح — اطلب رابطاً جديداً من الإدارة' });
    const r = await pool.query('SELECT * FROM users WHERE id=$1', [userId]);
    if (!r.rows.length) return res.status(404).json({ message: 'الحساب غير موجود' });
    const user = r.rows[0];
    if (!user.is_active) return res.status(403).json({ message: 'الحساب موقوف' });
    const sessionToken = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    pool.query('UPDATE users SET last_active=NOW() WHERE id=$1', [user.id]).catch(()=>{});
    delete user.password; delete user.password_hash; delete user.reset_token; delete user.reset_expires; delete user.magic_token; delete user.magic_expires;
    res.json({ user, token: sessionToken });
  } catch(e) { console.error('magic-login:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
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
    // معاملة حقيقية على اتصال مخصّص — يضمن التراجع الكامل عند أي فشل
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (role === 'provider') await client.query('DELETE FROM bids WHERE provider_id=$1', [userId]);
      await client.query('DELETE FROM reviews WHERE reviewer_id=$1 OR reviewed_id=$1', [userId]);
      await client.query('DELETE FROM notifications WHERE user_id=$1', [userId]);
      await client.query('DELETE FROM messages WHERE sender_id=$1 OR receiver_id=$1', [userId]);
      await client.query('DELETE FROM reports WHERE reporter_id=$1 OR reported_id=$1', [userId]);
      await client.query('DELETE FROM favorites WHERE user_id=$1 OR provider_id=$1', [userId]);
      await client.query('DELETE FROM push_tokens WHERE user_id=$1', [userId]);
      if (role === 'client') {
        const projs = await client.query('SELECT id FROM requests WHERE client_id=$1', [userId]);
        for (const p of projs.rows) await client.query('DELETE FROM bids WHERE request_id=$1', [p.id]);
        await client.query('DELETE FROM requests WHERE client_id=$1', [userId]);
      }
      if (role === 'provider') await client.query('UPDATE requests SET assigned_provider_id=NULL WHERE assigned_provider_id=$1', [userId]);
      const del = await client.query('DELETE FROM users WHERE id=$1', [userId]);
      if (del.rowCount === 0) throw new Error('فشل حذف الحساب');
      await client.query('COMMIT');
      _userState.delete(userId);
      console.log(`🗑️  Account deleted: ${userName} (${userEmail}) [id=${userId}, role=${role}]`);
      if (userEmail && RESEND_KEY) sendEmail(userEmail, 'تم حذف حسابك من منصة مناقصة', emailTpl('تم حذف حسابك', `<p>عزيزي ${eEsc(userName)}،</p><p>تم حذف حسابك من منصة مناقصة بنجاح.</p>`, null, null)).catch(()=>{});
      res.json({ ok: true, message: 'تم حذف حسابك بنجاح. شكراً لاستخدامك منصة مناقصة.' });
    } catch(e) { try { await client.query('ROLLBACK'); } catch(_){} console.error('account delete transaction:', e); throw e; }
    finally { client.release(); }
  } catch(e) { console.error('DELETE /api/account/delete:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ PROFILES ═══
app.get('/api/admin/followups', requirePermission('requests.edit'), async (req, res) => {
  try {
    const base = `SELECT r.id, r.title, r.status, r.created_at, r.assigned_at, r.completed_at, r.close_at,
        r.reminder_at, r.reminder_stage, r.client_id,
        COALESCE(u.name,'عميل') AS client_name, u.phone AS client_phone,
        (SELECT COUNT(*) FROM bids WHERE request_id=r.id)::int AS bid_count
      FROM requests r JOIN users u ON u.id=r.client_id`;
    const run = async (label, sql) => { try { return (await pool.query(sql)).rows; } catch(e){ console.error('[followups '+label+']', e.message); return []; } };
    // كل بطاقة تظهر في مرحلتها اليدوية إن وُجدت، وإلا في المرحلة المحسوبة تلقائياً
    const few = await run('few', base + ` WHERE r.status='open' AND (
        (r.followup_stage='few') OR
        (r.followup_stage IS NULL AND (SELECT COUNT(*) FROM bids WHERE request_id=r.id)<=2)
      ) ORDER BY r.created_at DESC LIMIT 200`);
    const offers = await run('offers', base + ` WHERE r.status='open' AND (
        (r.followup_stage='offers') OR
        (r.followup_stage IS NULL AND (SELECT COUNT(*) FROM bids WHERE request_id=r.id)>=3 AND r.created_at > NOW() - INTERVAL '5 days')
      ) ORDER BY r.created_at DESC LIMIT 200`);
    const delayed = await run('delayed', base + ` WHERE r.status='open' AND (
        (r.followup_stage='delayed') OR
        (r.followup_stage IS NULL AND (SELECT COUNT(*) FROM bids WHERE request_id=r.id)>=3 AND r.created_at <= NOW() - INTERVAL '5 days')
      ) ORDER BY r.created_at ASC LIMIT 200`);
    const executing = await run('executing', base + ` WHERE r.status IN ('in_progress','accepted') AND r.assigned_at IS NOT NULL AND r.assigned_at <= NOW() - INTERVAL '7 days' ORDER BY r.assigned_at ASC LIMIT 200`);
    const review = await run('review', base + ` WHERE r.status='completed' AND NOT EXISTS(SELECT 1 FROM reviews rv WHERE rv.request_id=r.id AND rv.reviewer_id=r.client_id) ORDER BY r.created_at DESC LIMIT 200`);
    const tag = (rows, stage) => rows.map(x => ({ ...x, stage }));
    res.json({
      few: tag(few, 'few'),
      offers: tag(offers, 'offers'),
      delayed: tag(delayed, 'delayed'),
      executing: tag(executing, 'executing'),
      review: tag(review, 'review'),
      counts: { few: few.length, offers: offers.length, delayed: delayed.length, executing: executing.length, review: review.length }
    });
  } catch(e){ console.error('followups:', e.message); res.status(500).json({ message: 'تعذّر الجلب' }); }
});
app.post('/api/admin/requests/:id/mark-reminded', requirePermission('requests.edit'), async (req, res) => {
  try {
    const stage = String(req.body.stage||'').slice(0,20);
    await pool.query('UPDATE requests SET reminder_at=NOW(), reminder_stage=$1 WHERE id=$2', [stage, parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch(e){ res.status(500).json({ message: 'تعذّر التسجيل' }); }
});
app.post('/api/me/enable-provider', auth, async (req, res) => {
  try {
    const specs = Array.isArray(req.body.specialties) ? req.body.specialties.map(function(x){return String(x).trim();}).filter(Boolean).slice(0,5) : [];
    const city = String(req.body.city||'').trim().slice(0,100);
    const bio = String(req.body.bio||'').trim().slice(0,1000);
    if (!specs.length) return res.status(400).json({ message: 'اختر تخصصاً واحداً على الأقل' });
    if (!city) return res.status(400).json({ message: 'أدخل مدينتك' });
    await pool.query(
      "UPDATE users SET can_provide=TRUE, specialties=$1, city=COALESCE(NULLIF($2,''),city), bio=COALESCE(NULLIF($3,''),bio), notify_categories=COALESCE(notify_categories,$1) WHERE id=$4",
      [specs, city, bio, req.user.id]
    );
    res.json({ ok: true, message: 'تم تفعيل تقديم العروض' });
  } catch(e){ console.error('enable-provider:', e.message); res.status(500).json({ message: 'تعذّر التفعيل' }); }
});
app.post('/api/me/enable-request', auth, async (req, res) => {
  try { await pool.query('UPDATE users SET can_request=TRUE WHERE id=$1', [req.user.id]); res.json({ ok: true }); }
  catch(e){ res.status(500).json({ message: 'تعذّر التفعيل' }); }
});
app.get('/api/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT id,name,email,phone,role,specialties,notify_categories,bio,city,badge,is_active,experience_years,portfolio_images,profile_image,COALESCE(serves_all_cities,FALSE) as serves_all_cities,service_cities,COALESCE(can_provide,FALSE) as can_provide,COALESCE(can_request,FALSE) as can_request,created_at FROM users WHERE id=$1`, [req.user.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    // خصوصية الموقع: الإحداثيات الدقيقة وجوال العميل للمالك أو المزوّد المعتمد فقط
    const row = r.rows[0];
    let viewer = null;
    try {
      const hdr = req.headers.authorization || '';
      const tok = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
      if (tok) viewer = jwt.verify(tok, JWT_SECRET);
    } catch(e) { viewer = null; }
    const isOwner = viewer && String(viewer.id) === String(row.client_id);
    const isAssigned = viewer && row.assigned_provider_id && String(viewer.id) === String(row.assigned_provider_id);
    const isAdmin = viewer && viewer.role === 'admin';
    if (!(isOwner || isAssigned || isAdmin)) {
      row.geo_lat = null; row.geo_lng = null;   // الحي يبقى ظاهراً، الموقع الدقيق لا
      row.client_phone = null;
      row.address = null;
    }
    res.json(row);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/profile', auth, async (req, res) => {
  try {
    if (req.body.profile_image && req.body.profile_image.startsWith('data:')) req.body.profile_image = await uploadToCloud(req.body.profile_image, 'manaqasa/profiles');
    const allowed = { name:'name', phone:'phone', city:'city', bio:'bio', specialties:'specialties', notify_categories:'notify_categories', experience_years:'experience_years', profile_image:'profile_image', serves_all_cities:'serves_all_cities', service_cities:'service_cities' };
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
    if (!sets.length) { const cur=await pool.query(`SELECT id,name,email,phone,role,specialties,notify_categories,bio,city,badge,experience_years,profile_image,COALESCE(serves_all_cities,FALSE) as serves_all_cities,service_cities FROM users WHERE id=$1`,[req.user.id]); return res.json(cur.rows[0]||{}); }
    params.push(req.user.id);
    const r=await pool.query(`UPDATE users SET ${sets.join(', ')} WHERE id=$${idx} RETURNING id,name,email,phone,role,specialties,notify_categories,bio,city,badge,experience_years,profile_image`, params);
    res.json(r.rows[0]);
  } catch(e) { console.error('/profile PUT:', e); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.get('/api/client/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT id,name,email,phone,city,bio,badge,profile_image,role,COALESCE(can_provide,FALSE) as can_provide,created_at,(SELECT COUNT(*) FROM requests WHERE client_id=users.id) as total_requests,(SELECT COUNT(*) FROM requests WHERE client_id=users.id AND status='completed') as completed_requests,(SELECT COUNT(*) FROM requests WHERE client_id=users.id AND status='in_progress') as active_requests FROM users WHERE id=$1`, [req.user.id]);
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
    const r = await pool.query(`SELECT id,name,email,phone,city,bio,badge,specialties,notify_categories,experience_years,portfolio_images,profile_image,business_name,last_bumped_at,COALESCE(website,'') as website,COALESCE(location_url,'') as location_url,COALESCE(instagram,'') as instagram,COALESCE(twitter,'') as twitter,COALESCE(snapchat,'') as snapchat,COALESCE(tiktok,'') as tiktok,COALESCE(youtube,'') as youtube,COALESCE(can_request,FALSE) as can_request,COALESCE(can_provide,FALSE) as can_provide,created_at,tier,COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,(SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as total_bids,(SELECT COUNT(*) FROM bids WHERE provider_id=users.id AND status='accepted') as accepted_bids,(SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects FROM users WHERE id=$1`, [req.user.id]);
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
      for (const img of req.body.portfolio_images) { if (img && img.startsWith('data:')) { const u = await uploadToCloud(img, 'manaqasa/portfolio'); if (u) uploaded.push(u); } else if (img) uploaded.push(img); }
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
      SELECT DISTINCT ON (r.client_id)
        r.id as request_id, r.client_id, r.title as request_title,
        u.name as client_name, u.profile_image as client_image,
        (SELECT content FROM messages WHERE ((sender_id=$1 AND receiver_id=r.client_id) OR (sender_id=r.client_id AND receiver_id=$1)) ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE ((sender_id=$1 AND receiver_id=r.client_id) OR (sender_id=r.client_id AND receiver_id=$1)) ORDER BY created_at DESC LIMIT 1) as last_time,
        (SELECT COUNT(*) FROM messages WHERE receiver_id=$1 AND sender_id=r.client_id AND is_read=FALSE) as unread
      FROM requests r JOIN users u ON u.id=r.client_id
      WHERE EXISTS(SELECT 1 FROM messages m2 WHERE (m2.sender_id=$1 AND m2.receiver_id=r.client_id) OR (m2.sender_id=r.client_id AND m2.receiver_id=$1))
      ORDER BY r.client_id, last_time DESC NULLS LAST
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
      SELECT DISTINCT ON (c.provider_id)
        c.request_id,
        c.provider_id,
        COALESCE(r.title, 'محادثة مباشرة') as request_title,
        CASE WHEN u.role='admin' THEN 'إدارة مناقصة' ELSE u.name END as provider_name,
        u.profile_image as provider_image,
        u.phone as provider_phone,
        (u.role='admin') as is_admin,
        (SELECT content FROM messages WHERE ((sender_id=$1 AND receiver_id=c.provider_id) OR (sender_id=c.provider_id AND receiver_id=$1)) ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT MAX(created_at) FROM messages WHERE ((sender_id=$1 AND receiver_id=c.provider_id) OR (sender_id=c.provider_id AND receiver_id=$1))) as last_time,
        (SELECT COUNT(*) FROM messages WHERE receiver_id=$1 AND sender_id=c.provider_id AND is_read=FALSE) as unread
      FROM conv c
      LEFT JOIN requests r ON r.id = c.request_id
      LEFT JOIN users u ON u.id = c.provider_id
      WHERE c.provider_id IS NOT NULL
      ORDER BY c.provider_id, (SELECT MAX(created_at) FROM messages WHERE ((sender_id=$1 AND receiver_id=c.provider_id) OR (sender_id=c.provider_id AND receiver_id=$1))) DESC NULLS LAST
    `, [req.user.id]);
    // رتّب النتيجة النهائية بالأحدث
    r.rows.sort(function(a,b){ return new Date(b.last_time||0) - new Date(a.last_time||0); });
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
    const _gateGeo=1;
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
    // المندوب ونسبته للأدمن فقط — لا يظهران للعميل ولا للمزوّد
    if (!isAdmin) { delete row.agent_name; delete row.agent_pct; delete row.offers_report_notified; }
    res.json({ ...row, status: normalizeStatus(row.status) });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});


// ═══ النشر بالوكالة: الإدارة تنشر مشروعاً نيابة عن عميل (بتوكيله) ═══
// يحلّ مشكلة المشروع: نتواصل مع إدارات الأملاك، نأخذ تفاصيل مشروعهم، وننشره لهم.
app.post('/api/admin/proxy-request', requirePermission('requests.edit'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { client_name, client_phone, client_email, title, description, category, city, budget_max, deadline } = req.body;
    const pxDistrict = (req.body.district||'').toString().trim().slice(0,80) || null;
    // رفع صور ومرفقات المشروع (نفس آلية نشر العميل)
    const pxImages = [];
    for (const img of (Array.isArray(req.body.images) ? req.body.images.slice(0,5) : [])) {
      if (img && img.startsWith('data:')) { const u = await uploadToCloud(img, 'manaqasa/projects'); if (u) pxImages.push(u); }
      else if (img && img.startsWith('http')) pxImages.push(img);
    }
    const pxAtts = [];
    for (const att of (Array.isArray(req.body.attachments) ? req.body.attachments.slice(0,3) : [])) {
      if (att && att.data) { const u = await uploadToCloud(att.data, 'manaqasa/attachments', att.name); if (u) pxAtts.push({ name: (att.name||'ملف').slice(0,80), url: u }); }
    }
    const pxLat = req.body.geo_lat ? parseFloat(req.body.geo_lat) : null;
    const _pxCd = parseInt(req.body.close_days)||0;
    const pxCloseAt = _pxCd>0 ? new Date(Date.now()+_pxCd*86400000) : null;
    const pxLng = req.body.geo_lng ? parseFloat(req.body.geo_lng) : null;
    if (!client_name || !client_phone || !title || !category || !city)
      return res.status(400).json({ message: 'الاسم والجوال والعنوان والتصنيف والمدينة مطلوبة' });
    const phoneNorm = String(client_phone).replace(/\D/g,'').replace(/^0/,'966');
    if (phoneNorm.length < 12) return res.status(400).json({ message: 'رقم جوال غير صحيح' });

    await client.query('BEGIN');
    // 1) هل للعميل حساب بهذا الجوال؟ وإلا ننشئ حساباً مبدئياً (يفعّله لاحقاً)
    let u = await client.query(
      "SELECT id, name FROM users WHERE phone IS NOT NULL AND (phone=$1 OR regexp_replace(phone,'[^0-9]','','g') = $2) LIMIT 1",
      [client_phone, phoneNorm]);
    let clientId, isNew = false;
    if (u.rows.length) {
      clientId = u.rows[0].id;
    } else {
      const tempPass = await bcrypt.hash(crypto.randomBytes(12).toString('hex'), 10);
      const email = client_email || `proxy_${phoneNorm}@manaqasa.local`;
      const nu = await client.query(
        `INSERT INTO users (name, email, password, password_hash, phone, city, role, is_active, created_at) VALUES ($1,$2,$3,$4,$5,$6,'client',TRUE,NOW()) RETURNING id`,
        [client_name, email, tempPass, tempPass, client_phone, city]);
      clientId = nu.rows[0].id; isNew = true;
    }
    // 2) أنشئ المشروع باسمه
    const r = await client.query(
      `INSERT INTO requests (client_id, title, description, category, city, budget_max, deadline, district, geo_lat, geo_lng, images, attachments, close_at, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'open',NOW()) RETURNING id, title`,
      [clientId, title, description || '', category, city, budget_max || null, deadline || null, pxDistrict, pxLat, pxLng,
       pxImages.length ? pxImages : null, pxAtts.length ? JSON.stringify(pxAtts) : null, pxCloseAt]);
    await client.query('COMMIT');

    // 3) رابط دخول سحري قصير: يُرسل للعميل بالواتساب فيدخل مباشرة ويشوف مشروعه وعروضه بلا كلمة مرور
    const magicTok = await getMagicToken(clientId);
    const magicLink = SITE_URL + '/m/' + magicTok;
    // 4) سجّل العملية للمساءلة
    res.json({ ok: true, request_id: r.rows[0].id, client_id: clientId, is_new_client: isNew, phone_norm: phoneNorm, magic_link: magicLink });
  } catch(e) {
    try { await client.query('ROLLBACK'); } catch(_) {}
    // تشخيص مفصّل في السجل (يظهر في Railway Logs)
    console.error('❌ proxy-request FAILED:', {
      message: e.message,
      code: e.code,          // كود خطأ PostgreSQL (42703 = عمود غير موجود، 23502 = حقل إلزامي فارغ...)
      detail: e.detail,
      column: e.column,
      table: e.table,
      constraint: e.constraint
    });
    res.status(500).json({
      message: 'تعذّر النشر: ' + (e.detail || e.message),
      code: e.code || null,
      column: e.column || null
    });
  } finally { client.release(); }
});

app.post('/api/requests', auth, clientOnly, async (req, res) => {
  try {
    const { title, description, category, city, address, budget_max, deadline, attachments } = req.body;
    const district = (req.body.district||'').toString().trim().slice(0,80) || null;
    const gLat = req.body.geo_lat ? parseFloat(req.body.geo_lat) : null;
    const gLng = req.body.geo_lng ? parseFloat(req.body.geo_lng) : null;
    const _cd = parseInt(req.body.close_days)||0;
    const closeAt = _cd>0 ? new Date(Date.now()+_cd*86400000) : null;
    if (!title || !description) return res.status(400).json({ message: 'العنوان والوصف مطلوبان' });
    const rawImages = req.body.images || [];
    const images_arr = Array.isArray(rawImages) ? rawImages : [];
    const uploadedImages = [];
    for (const img of images_arr) {
      if (img && img.startsWith('data:')) { const u = await uploadToCloud(img, 'manaqasa/projects'); if (u) uploadedImages.push(u); }
      else if (img && img.startsWith('http')) uploadedImages.push(img);
    }
    // معالجة المرفقات (PDF/مخططات هندسية) — رفعها لـR2 مثل الصور
    let processedAttachments = null;
    if (Array.isArray(attachments) && attachments.length) {
      processedAttachments = [];
      for (const att of attachments.slice(0,3)) {
        if (att && att.data && String(att.data).startsWith('data:')) {
          const url = await uploadToCloud(att.data, 'manaqasa/attachments', att.name);
          if (url) processedAttachments.push({ name: String(att.name||'ملف').slice(0,120), url });
        } else if (att && att.url) {
          processedAttachments.push({ name: String(att.name||'ملف').slice(0,120), url: att.url });
        }
      }
      if (!processedAttachments.length) processedAttachments = null;
    }
    const pn = generateProjectNumber();
    const r = await pool.query(`INSERT INTO requests (client_id, title, description, category, city, address, budget_max, deadline, images, attachments, project_number, district, geo_lat, geo_lng, close_at, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending_review',NOW()) RETURNING *`, [req.user.id, title, description, category||null, city||null, address||null, budget_max||null, deadline||null, uploadedImages.length?uploadedImages:null, processedAttachments?JSON.stringify(processedAttachments):null, pn, district, gLat, gLng, closeAt]);
    const newReq = r.rows[0];
    try {
      const clientInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [req.user.id]);
      if (clientInfo.rows.length && clientInfo.rows[0].email) {
        const ctitle = '✅ تم نشر مشروعك بنجاح';
        const cBody = `<p>عزيزي <strong>${eEsc(clientInfo.rows[0].name)}</strong>،</p><p>تم نشر مشروعك "<strong>${eEsc(newReq.title)}</strong>" بنجاح. رقم المشروع: ${pn}</p>`;
        sendEmail(clientInfo.rows[0].email, ctitle, emailTpl(ctitle, cBody, 'متابعة المشروع', SITE_URL+'/dashboard-client.html')).catch(()=>{});
        await notify(req.user.id, ctitle, `تم نشر "${eEsc(newReq.title)}" بنجاح`, 'request_published', newReq.id);
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
        const nBody = `${eEsc(newReq.title)}${cityHint} — اطّلع وقدّم عرضك`;
        const emailBody = `<p>وصلنا مشروع مشروع جديد ضمن تخصصاتك.</p><div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px;margin:16px 0"><div style="font-size:15px;font-weight:800;color:#16213E">${eEsc(newReq.title)}</div><div style="font-size:13px;color:#475569;margin-top:8px">${cat}${newReq.city?` · ${newReq.city}`:''}${newReq.budget_max?` · ${Number(newReq.budget_max).toLocaleString('en-US')} ر.س`:''}</div></div>`;
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
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'ليس مشروعك' });
    const { title, description, category, city, address, budget_max, deadline, geo_lat, geo_lng, attachments } = req.body;
    const sets = ['title=COALESCE(NULLIF($1,\'\'),title)', 'description=COALESCE(NULLIF($2,\'\'),description)', 'category=$3', 'city=$4', 'address=$5', 'budget_max=$6', 'deadline=$7'];
    const params = [title||'', description||'', category||null, city||null, address||null, budget_max||null, deadline||null];
    let i = 8;
    const gLat = (geo_lat != null && geo_lat !== '') ? parseFloat(geo_lat) : null;
    const gLng = (geo_lng != null && geo_lng !== '') ? parseFloat(geo_lng) : null;
    if (Number.isFinite(gLat) && Number.isFinite(gLng)) { sets.push('geo_lat=$'+i); params.push(gLat); i++; sets.push('geo_lng=$'+i); params.push(gLng); i++; }
    if (req.body.close_days !== undefined) {
      const _cd = parseInt(req.body.close_days)||0;
      if (_cd>0) {
        sets.push("close_at = created_at + ($"+i+" || ' days')::interval"); params.push(String(_cd)); i++;
        // تمديد المدة يعيد فتح مشروع أُغلق تلقائياً (طالما لم يُعتمد مزوّد)
        const _st = await pool.query("SELECT status, assigned_provider_id FROM requests WHERE id=$1", [id]);
        if (_st.rows.length && ['closed_auto','expired'].includes(_st.rows[0].status) && !_st.rows[0].assigned_provider_id) { sets.push("status='open'"); }
      }
      else { sets.push('close_at = NULL'); }
    }
    if (Array.isArray(attachments)) {
      const atts = []; const _attDbg = [];
      for (const a of attachments.slice(0, 3)) {
        if (a && a.url) atts.push({ name: String(a.name||'ملف').slice(0,80), url: a.url });
        else if (a && a.data) {
          let u = null;
          try { u = await uploadToCloud(a.data, 'manaqasa/attachments', a.name); } catch(e) { _attDbg.push({ name: a.name, error: e.message }); }
          if (u) atts.push({ name: String(a.name||'ملف').slice(0,80), url: u });
          else _attDbg.push({ name: a.name, dropped: true, prefix: String(a.data||'').slice(0,30), b64len: String(a.data||'').length });
        }
      }
      sets.push('attachments=$'+i); params.push(JSON.stringify(atts)); i++;
      req._attDbg = _attDbg;
    }
    params.push(id);
    const r = await pool.query(`UPDATE requests SET ${sets.join(', ')} WHERE id=$${i} RETURNING *`, params);
    res.json(Object.assign({}, r.rows[0], req._attDbg && req._attDbg.length ? { _attDebug: req._attDbg } : {}));
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/requests/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT client_id FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    // حذف المشروع: الإدارة فقط. صاحب المشروع لا يحذف — له الإغلاق (رجعي) بدلاً من الحذف النهائي.
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'حذف المشروع متاح للإدارة فقط. تقدر تُغلق مشروعك بدلاً من ذلك.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM bids WHERE request_id=$1', [id]);
      await client.query('DELETE FROM messages WHERE request_id=$1', [id]);
      await client.query('DELETE FROM reviews WHERE request_id=$1', [id]);
      await client.query('DELETE FROM requests WHERE id=$1', [id]);
      await client.query('COMMIT'); res.json({ ok: true });
    } catch(e) { try { await client.query('ROLLBACK'); } catch(_){} throw e; }
    finally { client.release(); }
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/requests/:id/images', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id); const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'لا توجد صورة' });
    const own = await pool.query('SELECT client_id, images FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'ليس مشروعك' });
    const current = own.rows[0].images || [];
    if (current.length >= 10) return res.status(400).json({ message: 'الحد الأقصى 10 صور' });
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
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'ليس مشروعك' });
    const current = own.rows[0].attachments || [];
    if (current.length >= 3) return res.status(400).json({ message: 'الحد الأقصى 3 ملفات' });
    if (typeof data === 'string' && data.length > 14000000) return res.status(400).json({ message: 'حجم الملف كبير (الحد 10MB)' });
    let stored = data;
    if (typeof stored === 'string' && stored.startsWith('data:')) stored = await uploadToCloud(stored, 'manaqasa/attachments');
    if (!stored) return res.status(400).json({ message: 'نوع الملف غير مسموح (PDF أو صورة فقط)' });
    current.push({ name: String(name||'ملف').slice(0,120), type: type||null, url: stored, uploaded_at: new Date().toISOString() });
    await pool.query('UPDATE requests SET attachments=$1 WHERE id=$2', [JSON.stringify(current), id]);
    res.json({ ok: true, count: current.length });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/requests/:id/complete', auth, clientOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`UPDATE requests SET status='completed', completed_at=NOW() WHERE id=$1 AND client_id=$2 AND assigned_provider_id IS NOT NULL AND status NOT IN ('completed','cancelled') RETURNING id, assigned_provider_id, title`, [id, req.user.id]);
    if (!r.rows.length) return res.status(400).json({ message: 'لا يمكن إنهاء المشروع (تأكد أنه قيد التنفيذ ومُسنَد لمزوّد)' });
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
    if(!r.rows.length) return res.status(404).json({ message:'غير موجود أو ليس مشروعك' });
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
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'ليس مشروعك' });
    const r = await pool.query(`
      SELECT b.id, b.request_id, b.provider_id, b.price, b.days, b.note,
             b.status, b.created_at, COALESCE(b.price_unit,'total') as price_unit, b.attachment_url,
        u.name as provider_name, u.phone as provider_phone,
        u.last_seen_at as provider_last_seen,
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
    const priceVis = (req.body.price_visibility === 'public') ? 'public' : 'client'; // الافتراضي: لصاحب المشروع فقط
    const priceUnit = (['total','meter','unit'].indexOf(req.body.price_unit) >= 0) ? req.body.price_unit : 'total';
    // ملف عرض السعر (اختياري): صورة أو PDF بصيغة data-URL → يُرفع إلى التخزين ويُحفظ رابطه
    let attUrl = null;
    if (req.body.attachment && typeof req.body.attachment === 'string' && req.body.attachment.startsWith('data:')) {
      attUrl = await uploadToCloud(req.body.attachment, 'manaqasa/bids');
      if (attUrl === null) return res.status(400).json({ message: 'تعذّر رفع الملف — تأكد أنه صورة أو PDF وأصغر من 10MB' });
    }
    price = parseInt(Math.round(parseFloat(price))); days = parseInt(days);
    if (!Number.isFinite(price)||price<=0) return res.status(400).json({ message: 'السعر غير صحيح' });
    if (!Number.isFinite(days)||days<=0) return res.status(400).json({ message: 'المدة غير صحيحة' });
    const reqRow = await pool.query('SELECT client_id, title, status FROM requests WHERE id=$1', [requestId]);
    if (!reqRow.rows.length) return res.status(404).json({ message: 'المشروع غير موجود' });
    if (reqRow.rows[0].client_id === req.user.id) return res.status(403).json({ message: 'لا يمكنك تقديم عرض على مشروعك' });
    if (reqRow.rows[0].status !== 'open') return res.status(400).json({ message: 'المشروع غير مفتوح للعروض' });
    const existing = await pool.query('SELECT id, status FROM bids WHERE request_id=$1 AND provider_id=$2', [requestId, req.user.id]);
    let row; let isUpdate = false;
    if (existing.rows.length) {
      if (existing.rows[0].status === 'accepted') return res.status(400).json({ message: 'عرضك مقبول مسبقاً' });
      // COALESCE: لو ما رفع ملفاً جديداً نُبقي القديم
      const upd = await pool.query(`UPDATE bids SET price=$1, days=$2, note=$3, price_visibility=$4, price_unit=$5, attachment_url=COALESCE($6,attachment_url), created_at=NOW() WHERE request_id=$7 AND provider_id=$8 RETURNING *`, [price, days, note||null, priceVis, priceUnit, attUrl, requestId, req.user.id]);
      row = upd.rows[0]; isUpdate = true;
    } else {
      const ins = await pool.query(`INSERT INTO bids (request_id, provider_id, price, days, note, status, price_visibility, price_unit, attachment_url, created_at) VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,NOW()) RETURNING *`, [requestId, req.user.id, price, days, note||null, priceVis, priceUnit, attUrl]);
      row = ins.rows[0];
    }
    const provInfo = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const clientInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [reqRow.rows[0].client_id]);
    const projTitle = reqRow.rows[0].title; const provName = provInfo.rows[0]?.name||'مزود';
    let isFirst = false;
    if (!isUpdate) { try{ const cnt = await pool.query('SELECT COUNT(*) c FROM bids WHERE request_id=$1', [requestId]); isFirst = (parseInt(cnt.rows[0].c)||0) === 1; }catch(e){} }
    const inAppTitle = isUpdate ? '✏️ تم تحديث عرض' : (isFirst ? '🎉 وصلك أول عرض!' : '💼 عرض جديد');
    const inAppBody = isUpdate ? `قام ${eEsc(provName)} بتحديث عرضه على "${projTitle}"` : (isFirst ? `وصلك أول عرض من ${eEsc(provName)} على "${projTitle}" — بداية موفقة! قارن العروض القادمة واختر الأنسب` : `تلقيت عرضاً من ${eEsc(provName)} على "${projTitle}"`);
    await notify(reqRow.rows[0].client_id, inAppTitle, inAppBody, 'bid', requestId);
    if (clientInfo.rows.length && clientInfo.rows[0].email && !isUpdate) {
      const subject = `💼 عرض جديد على مشروع "${projTitle}"`;
      const body = `<p>عزيزي <strong>${eEsc(clientInfo.rows[0].name)}</strong>،</p><p>تلقيت عرضاً جديداً من <strong>${eEsc(provName)}</strong>:</p><div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px;margin:16px 0"><div style="font-size:13px;color:#475569;line-height:1.9"><div><strong>السعر:</strong> ${Number(price).toLocaleString('en-US')} ر.س</div><div><strong>المدة:</strong> ${days} يوم</div>${note?`<div><strong>ملاحظة:</strong> ${eEsc(note).replace(/\n/g,'<br>')}</div>`:''}</div></div>`;
      sendEmail(clientInfo.rows[0].email, subject, emailTpl(subject, body, 'مراجعة العرض', SITE_URL+'/dashboard-client.html')).catch(()=>{});
    }
    // إشعار العميل تلقائياً بتقرير العروض عند بلوغ الحد (مرة واحدة) — غير حاجب لتقديم العرض
    if (!isUpdate) { (async () => {
      try {
        const THRESH = 3; // أرسل التقرير أول ما توصل العروض لهذا الحد
        const cnt = parseInt((await pool.query('SELECT COUNT(*)::int c FROM bids WHERE request_id=$1', [requestId])).rows[0].c) || 0;
        if (cnt < THRESH) return;
        const pr = (await pool.query('SELECT offers_report_notified, title FROM requests WHERE id=$1', [requestId])).rows[0];
        if (!pr || pr.offers_report_notified) return;
        const cem = clientInfo.rows[0] && clientInfo.rows[0].email;
        await pool.query('UPDATE requests SET offers_report_notified=$1 WHERE id=$2', [cnt, requestId]);
        if (!cem || /@manaqasa\.local$/i.test(cem)) return;
        const tok = jwt.sign({ rid: requestId, purpose: 'report' }, JWT_SECRET, { expiresIn: '60d' });
        const link = SITE_URL + '/report/offers/' + requestId + '?t=' + tok;
        const rt = '📋 وصلتك عروض على مشروعك';
        const rb = `<p>وصلك ${cnt} عروض على مشروعك «${eEsc(pr.title||'')}». اضغط لعرض تقرير العروض كاملاً:</p>`;
        sendEmail(cem, rt, emailTpl(rt, rb, 'عرض تقرير العروض', link)).catch(()=>{});
      } catch(e) { console.error('auto report email:', e.message); }
    })(); }
    res.json(row);
  } catch(e) { console.error('POST /api/requests/:id/bids:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/bids/:id', auth, providerOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT provider_id, status FROM bids WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].provider_id !== req.user.id) return res.status(403).json({ message: 'ليس عرضك' });
    if (own.rows[0].status === 'accepted') return res.status(400).json({ message: 'العرض مقبول ولا يمكن تعديله' });
    const { price, days, note } = req.body;
    const priceVis = (req.body.price_visibility==='public') ? 'public' : 'client';   // الافتراضي: لصاحب المشروع فقط
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
    if (bid.rows[0].client_id !== req.user.id) return res.status(403).json({ message: 'ليس مشروعك' });
    const acceptedBid = bid.rows[0];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // منع الترسية المزدوجة وسباق التزامن: لا نُرسي إلا إذا لم يُسنَد المشروع بعد
      const lock = await client.query(
        `UPDATE requests SET status='in_progress', assigned_provider_id=$1, assigned_at=NOW()
         WHERE id=$2 AND assigned_provider_id IS NULL
           AND status NOT IN ('completed','cancelled','closed_auto')
         RETURNING id`, [acceptedBid.provider_id, acceptedBid.request_id]);
      if (!lock.rows.length) { await client.query('ROLLBACK'); client.release(); return res.status(400).json({ message: 'تمت ترسية هذا المشروع مسبقاً' }); }
      await client.query(`UPDATE bids SET status='accepted' WHERE id=$1`, [bidId]);
      await client.query(`UPDATE bids SET status='rejected' WHERE request_id=$1 AND id!=$2`, [acceptedBid.request_id, bidId]);
      await client.query('COMMIT');
      client.release();
      const acceptedProv = await pool.query('SELECT name, email FROM users WHERE id=$1', [acceptedBid.provider_id]);
      const clientInfo = await pool.query('SELECT name, phone FROM users WHERE id=$1', [req.user.id]);
      const cName = clientInfo.rows[0]?.name||'العميل'; const cPhone = clientInfo.rows[0]?.phone||'';
    const _fee = Math.round((parseFloat(bid.price)||0) * 0.03);
    await notify(bid.provider_id, 'تم قبول عرضك! 🎉', 'العميل قبل عرضك على «'+eEsc(bid.title)+'» — تواصل معه لإتمام العمل.'+(_fee>0?' سعي المنصة '+_fee.toLocaleString('en-US')+' ر.س (3%) تُسدَّد خلال 10 أيام من الاتفاق أو بدء التنفيذ.':''), 'bid_accepted', bid.request_id);
      if (acceptedProv.rows.length && acceptedProv.rows[0].email) {
        const subject = `تم قبول عرضك على "${eEsc(acceptedBid.title)}"`;
        const body = `<p>تهانينا <strong>${eEsc(acceptedProv.rows[0].name)}</strong>! تم قبول عرضك.</p><div style="background:#fff8e6;border:1px solid #fde68a;border-radius:10px;padding:14px;margin:16px 0"><div style="font-size:13px;color:#475569;line-height:1.9"><div><strong>العميل:</strong> ${eEsc(cName)}</div>${cPhone?`<div><strong>الجوال:</strong> ${cPhone}</div>`:''}<div><strong>السعر:</strong> ${Number(acceptedBid.price).toLocaleString('en-US')} ر.س</div><div><strong>المدة:</strong> ${acceptedBid.days} يوم</div></div></div>`;
        sendEmail(acceptedProv.rows[0].email, subject, emailTpl(subject, body, 'فتح المشروع', SITE_URL+'/dashboard-provider.html')).catch(()=>{});
      }
      const rejected = await pool.query(`SELECT b.provider_id, u.name, u.email FROM bids b JOIN users u ON b.provider_id=u.id WHERE b.request_id=$1 AND b.id!=$2 AND b.status='rejected'`, [acceptedBid.request_id, bidId]);
      for (const rej of rejected.rows) {
        await notify(rej.provider_id, 'رست على مزوّد آخر هالمرة', `اختار العميل عرضاً آخر على «${eEsc(acceptedBid.title)}». نصيحة للمرّة الجاية: قدّم سعراً منافساً مع إبراز جودتك وخبرتك، وردّ بسرعة — فرص جديدة تنتظرك.`, 'bid_rejected', acceptedBid.request_id);
        if (rej.email) sendEmail(rej.email, `تحديث عرضك على «${eEsc(acceptedBid.title)}»`, emailTpl('رست على مزوّد آخر هالمرة', `<p>عزيزي <strong>${eEsc(rej.name)}</strong>،</p><p>اختار العميل عرضاً آخر على «${eEsc(acceptedBid.title)}» — لا بأس، فرص كثيرة قادمة.</p><div style="background:#f0f6ff;border:1px solid #cdddf9;border-radius:10px;padding:14px;margin:16px 0"><div style="font-weight:800;color:#1e40af;margin-bottom:8px">لتزيد فرص قبولك المرّة الجاية:</div><ul style="margin:0;padding-right:18px;color:#334155;line-height:2;font-size:14px"><li>قدّم <strong>سعراً منافساً</strong> يوازن بين القيمة والجودة</li><li>أبرز <strong>خبرتك وأعمالك السابقة</strong> في وصف العرض</li><li><strong>بادر بسرعة</strong> — العروض المبكرة تلفت انتباه العميل</li><li>أضف <strong>تفاصيل واضحة</strong> عن المدة وما يشمله العرض</li></ul></div>`, 'تصفّح المشاريع', SITE_URL+'/dashboard-provider.html')).catch(()=>{});
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
    if (bid.rows[0].client_id !== req.user.id) return res.status(403).json({ message: 'ليس مشروعك' });
    await pool.query(`UPDATE bids SET status='rejected' WHERE id=$1`, [bidId]);
    const provInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [bid.rows[0].provider_id]);
    await notify(bid.rows[0].provider_id, 'تم رفض عرضك', `تم رفض عرضك على "${eEsc(bid.rows[0].title)}"`, 'bid_rejected', bid.rows[0].request_id);
    if (provInfo.rows.length && provInfo.rows[0].email) sendEmail(provInfo.rows[0].email, `📋 تم رفض عرضك على "${eEsc(bid.rows[0].title)}"`, emailTpl('تم رفض العرض', `<p>عزيزي <strong>${eEsc(provInfo.rows[0].name)}</strong>،</p><p>تم رفض عرضك على "${eEsc(bid.rows[0].title)}".</p>`, 'تصفح المشاريع', SITE_URL+'/dashboard-provider.html')).catch(()=>{});
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ DIRECT MESSAGE ═══
app.post('/api/direct-message', rateLimiter(30, 600000), auth, async (req, res) => {
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
    // 1) ابحث عن محادثة قائمة بينهما على أي مشروع (يمنع فقدان الرسائل السابقة)
    let reqRow = await pool.query(
      `SELECT request_id AS id FROM messages
       WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1)
       ORDER BY created_at DESC LIMIT 1`, [clientId, providerId]);
    // 2) وإلا: محادثة مباشرة سابقة
    if (!reqRow.rows.length) {
      reqRow = await pool.query(`SELECT id FROM requests WHERE client_id=$1 AND assigned_provider_id=$2 AND category='direct' ORDER BY created_at DESC LIMIT 1`, [clientId, providerId]);
    }
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

// الأدمن يراسل عميلاً — رسالة عامة أو مرتبطة بمشروع + إشعار + إيميل (باسم "إدارة مناقصة")
app.post('/api/admin/message-client', auth, adminOnly, async (req, res) => {
  try {
    const clientId = parseInt(req.body.client_id);
    const content = (req.body.content||'').trim();
    const reqId = req.body.request_id ? parseInt(req.body.request_id) : null;
    const doEmail = req.body.email !== false;
    if (!clientId || !content) return res.status(400).json({ message: 'اختر العميل واكتب الرسالة' });
    const cli = await pool.query("SELECT id, name, email FROM users WHERE id=$1 AND role='client'", [clientId]);
    if (!cli.rows.length) return res.status(404).json({ message: 'العميل غير موجود' });
    if (reqId) {
      const rq = await pool.query('SELECT id FROM requests WHERE id=$1 AND client_id=$2', [reqId, clientId]);
      if (!rq.rows.length) return res.status(400).json({ message: 'المشروع غير مرتبط بهذا العميل' });
    }
    await pool.query(`INSERT INTO messages (request_id, sender_id, receiver_id, content, created_at) VALUES ($1,$2,$3,$4,NOW())`, [reqId, req.user.id, clientId, content]);
    const c = cli.rows[0];
    await notify(clientId, 'رسالة من إدارة مناقصة', content.slice(0,120), 'admin_message', reqId);
    if (doEmail && c.email) sendEmail(c.email, 'رسالة من إدارة منصة مناقصة', emailTpl('رسالة من إدارة مناقصة', `<p>عزيزي <strong>${eEsc(c.name||'')}</strong>،</p><p>${eEsc(content)}</p>`, 'فتح المحادثات', SITE_URL+'/chat.html')).catch(()=>{});
    res.json({ ok: true });
  } catch(e) { console.error('admin-message-client:', e.message); res.status(500).json({ message: 'تعذّر الإرسال' }); }
});

// مشاريع عميل (لقائمة الربط عند مراسلته)
app.get('/api/admin/client-projects', auth, adminOnly, async (req, res) => {
  try {
    const uid = parseInt(req.query.uid);
    if (!uid) return res.json([]);
    const r = await pool.query("SELECT id, title FROM requests WHERE client_id=$1 ORDER BY created_at DESC LIMIT 50", [uid]);
    res.json(r.rows);
  } catch(e) { res.json([]); }
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
// تنظيف دوري: يمنع نمو الذاكرة بلا حد (كل ساعة، يحذف ما مضى عليه أكثر من ساعة)
setInterval(() => {
  const cutoff = Date.now() - 3600000;
  for (const k in _msgEmailCache) { if (_msgEmailCache[k] < cutoff) delete _msgEmailCache[k]; }
}, 3600000);

app.get('/api/messages/unread-count', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT COUNT(*) FROM messages WHERE receiver_id=$1 AND is_read=FALSE', [req.user.id]);
    res.json({ count: parseInt(r.rows[0].count)||0 });
  } catch(e) { console.error('/messages/unread-count:', e); res.json({ count: 0 }); }
});

// ═══ الحظر بين المستخدمين ═══
// حظر مستخدم (لا تصلك رسائله ولا تصله رسائلك)
app.post('/api/blocks/:userId', auth, async (req, res) => {
  try {
    const target = parseInt(req.params.userId);
    if (!target || target === req.user.id) return res.status(400).json({ message: 'مشروع غير صالح' });
    await pool.query('INSERT INTO user_blocks (blocker_id, blocked_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, target]);
    res.json({ ok: true, blocked: true });
  } catch(e) { console.error('block:', e.message); res.status(500).json({ message: 'تعذّر الحظر' }); }
});
// فك الحظر
app.delete('/api/blocks/:userId', auth, async (req, res) => {
  try {
    const target = parseInt(req.params.userId);
    await pool.query('DELETE FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2', [req.user.id, target]);
    res.json({ ok: true, blocked: false });
  } catch(e) { console.error('unblock:', e.message); res.status(500).json({ message: 'تعذّر فك الحظر' }); }
});
// قائمة من حظرتهم + فحص حالة مستخدم معيّن
app.get('/api/blocks', auth, async (req, res) => {
  try {
    if (req.query.check) {
      const t = parseInt(req.query.check);
      const r = await pool.query('SELECT 1 FROM user_blocks WHERE blocker_id=$1 AND blocked_id=$2 LIMIT 1', [req.user.id, t]);
      return res.json({ blocked: r.rows.length > 0 });
    }
    const r = await pool.query(
      'SELECT b.blocked_id, u.name, u.profile_image, b.created_at FROM user_blocks b JOIN users u ON u.id=b.blocked_id WHERE b.blocker_id=$1 ORDER BY b.created_at DESC',
      [req.user.id]
    );
    res.json(r.rows);
  } catch(e) { console.error('blocks list:', e.message); res.json([]); }
});

// حذف رسالة (حذف ناعم — للمرسل فقط، خلال ساعة)
app.delete('/api/messages/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const m = await pool.query('SELECT sender_id, created_at FROM messages WHERE id=$1', [id]);
    if (!m.rows.length) return res.status(404).json({ message: 'الرسالة غير موجودة' });
    if (String(m.rows[0].sender_id) !== String(req.user.id)) return res.status(403).json({ message: 'ليست رسالتك' });
    const ageMin = (Date.now() - new Date(m.rows[0].created_at).getTime()) / 60000;
    if (ageMin > 60) return res.status(400).json({ message: 'لا يمكن حذف رسالة مضى عليها أكثر من ساعة' });
    await pool.query("UPDATE messages SET deleted_at=NOW(), content='', attachment_url=NULL WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch(e) { console.error('del msg:', e.message); res.status(500).json({ message: 'تعذّر الحذف' }); }
});

// ═══ التفاوض على العرض ═══
// إشعار المزوّد أن العميل يريد التفاوض (يحفّزه للرد/التعديل)
app.post('/api/bids/:id/negotiate', auth, clientOnly, async (req, res) => {
  try {
    const bidId = parseInt(req.params.id);
    const b = await pool.query(
      `SELECT b.id, b.provider_id, b.price, b.request_id, r.client_id, r.title
       FROM bids b JOIN requests r ON r.id=b.request_id WHERE b.id=$1`, [bidId]);
    if (!b.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    const row = b.rows[0];
    if (String(row.client_id) !== String(req.user.id)) return res.status(403).json({ message: 'ليس مشروعك' });
    const counter = req.body.counter_price ? parseFloat(req.body.counter_price) : null;
    const note = String(req.body.note || '').trim().slice(0, 300);
    let title = 'العميل يريد التفاوض';
    let body = `على عرضك في «${eEsc(row.title)}» — تواصل معه أو عدّل عرضك`;
    if (counter && counter > 0) {
      title = 'عرض مضاد من العميل';
      body = `${counter.toLocaleString('en-US')} ر.س بدل ${Number(row.price).toLocaleString('en-US')} — في «${eEsc(row.title)}». ردّ عليه أو عدّل عرضك`;
      // نسجّل العرض المضاد كرسالة موثّقة في المحادثة
      await pool.query(
        `INSERT INTO messages (request_id, sender_id, receiver_id, content, created_at) VALUES ($1,$2,$3,$4,NOW())`,
        [row.request_id, req.user.id, row.provider_id,
         `💰 عرض مضاد: ${counter.toLocaleString('en-US')} ر.س` + (note ? `\n📝 ${note}` : '')]
      );
    }
    await notify(row.provider_id, title, body, 'negotiate', row.request_id);
    res.json({ ok: true, counter: counter || null });
  } catch(e) { console.error('negotiate:', e.message); res.status(500).json({ message: 'تعذّر الإرسال' }); }
});

// تحديث آخر ظهور (يُستدعى دورياً من الواجهة)
app.post('/api/me/ping', auth, async (req, res) => {
  try { await pool.query('UPDATE users SET last_seen_at=NOW() WHERE id=$1', [req.user.id]); res.json({ ok: true }); }
  catch(e) { res.json({ ok: false }); }
});

app.get('/api/messages/:requestId', auth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const withUser = parseInt(req.query.with) || null;
    let r;
    if (withUser) {
      // كل الرسائل المتبادلة مع هذا الشخص (عبر كل المشاريع) — تمنع تشتّت المحادثة
      const allProjects = req.query.all !== '0';
      if (allProjects) {
        r = await pool.query(
          `SELECT m.*, u.name as sender_name, u.profile_image as sender_image, rm.content as reply_content, ru.name as reply_sender,
                  COALESCE(rq.title,'محادثة مباشرة') as project_title
           FROM messages m JOIN users u ON m.sender_id=u.id
           LEFT JOIN requests rq ON rq.id=m.request_id
           LEFT JOIN messages rm ON rm.id=m.reply_to LEFT JOIN users ru ON ru.id=rm.sender_id
           WHERE ((m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1))
           ORDER BY m.created_at ASC`,
          [req.user.id, withUser]);
      } else {
        r = await pool.query(
          `SELECT m.*, u.name as sender_name, u.profile_image as sender_image, rm.content as reply_content, ru.name as reply_sender,
                  COALESCE(rq.title,'محادثة مباشرة') as project_title
           FROM messages m JOIN users u ON m.sender_id=u.id
           LEFT JOIN requests rq ON rq.id=m.request_id
           LEFT JOIN messages rm ON rm.id=m.reply_to LEFT JOIN users ru ON ru.id=rm.sender_id
           WHERE m.request_id=$1 AND ((m.sender_id=$2 AND (m.receiver_id=$3 OR m.receiver_id IS NULL)) OR (m.sender_id=$3 AND (m.receiver_id=$2 OR m.receiver_id IS NULL)) OR (m.sender_id IS NULL))
           ORDER BY m.created_at ASC`,
          [requestId, req.user.id, withUser]);
      }
      // علّم رسائل هذا الشخص مقروءة
      await pool.query('UPDATE messages SET is_read=TRUE WHERE receiver_id=$1 AND sender_id=$2 AND is_read=FALSE', [req.user.id, withUser]);
    } else {
      r = await pool.query(`SELECT m.*, u.name as sender_name, u.profile_image as sender_image, rm.content as reply_content, ru.name as reply_sender FROM messages m JOIN users u ON m.sender_id=u.id LEFT JOIN messages rm ON rm.id=m.reply_to LEFT JOIN users ru ON ru.id=rm.sender_id WHERE m.request_id=$1 AND (m.sender_id=$2 OR m.receiver_id=$2) ORDER BY m.created_at ASC`, [requestId, req.user.id]);
      await pool.query('UPDATE messages SET is_read=TRUE WHERE request_id=$1 AND receiver_id=$2 AND is_read=FALSE', [requestId, req.user.id]);
    }
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.post('/api/messages', rateLimiter(60, 300000), auth, async (req, res) => {
  try {
    const { request_id, receiver_id, content, attachment_url, attachment_type, attachment_name, reply_to, waveform } = req.body;
    if (!request_id || !receiver_id) return res.status(400).json({ message: 'البيانات ناقصة' });
    const msgText = String(content || '').trim();
    // يُسمح برسالة بلا نص إن كان فيها مرفق
    if (!msgText && !attachment_url) return res.status(400).json({ message: 'الرسالة فارغة' });
    if (msgText.length > 2000) return res.status(400).json({ message: 'الرسالة طويلة جداً (الحد 2000 حرف)' });
    // احترام الحظر: لا تُرسل إن كان أحد الطرفين حاظراً للآخر
    const blk = await pool.query(
      'SELECT 1 FROM user_blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1) LIMIT 1',
      [req.user.id, receiver_id]
    );
    if (blk.rows.length) return res.status(403).json({ message: 'لا يمكن إرسال الرسالة (الحساب محظور)' });
    let attUrl = attachment_url || null;
    if (attUrl && String(attUrl).startsWith('data:')) {
      try { const up = await uploadToCloud(attUrl, 'manaqasa/chat', attachment_name || (String(attachment_type||'').indexOf('audio')===0?'voice.webm':'file')); if (up) attUrl = up; } catch(e){}
    }
    const r = await pool.query(
      `INSERT INTO messages (request_id, sender_id, receiver_id, content, attachment_url, attachment_type, attachment_name, reply_to, waveform, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) RETURNING *`,
      [request_id, req.user.id, receiver_id, msgText, attUrl, attachment_type || null, attachment_name || null, reply_to || null, (typeof waveform==='string'?waveform.slice(0,300):null)]
    );
    const sender = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const senderName = sender.rows[0].name;
    await notify(receiver_id, 'رسالة جديدة', `${eEsc(senderName)}: ${msgText.slice(0,50)}${msgText.length>50?'...':''}`, 'message', request_id);
    const cacheKey = `${receiver_id}-${request_id}`;
    const now = Date.now(); const lastEmailTime = _msgEmailCache[cacheKey] || 0;
    if (now - lastEmailTime > 18*60*1000) {
      _msgEmailCache[cacheKey] = now;
      try {
        const recvInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [receiver_id]);
        const reqInfo = await pool.query('SELECT title FROM requests WHERE id=$1', [request_id]);
        if (recvInfo.rows.length && recvInfo.rows[0].email) {
          const subject = `رسالة جديدة من ${eEsc(senderName)}`;
          const body = `<p>عزيزي <strong>${eEsc(recvInfo.rows[0].name)}</strong>،</p><p>وصلتك رسالة من <strong>${eEsc(senderName)}</strong>:</p><div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px;margin:16px 0"><div style="font-size:14px;font-weight:700;color:#16213E">${eEsc(reqInfo.rows[0]?.title||'مشروع')}</div><div style="background:#fff;border-right:3px solid #C9920A;padding:10px 14px;border-radius:6px;font-size:13px;color:#374151;margin-top:8px">"${msgText.slice(0,200).replace(/</g,'&lt;')}${msgText.length>200?'...':''}"</div></div>`;
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

// ═══ REVIEWS ═══
app.get('/api/reviews/user/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`SELECT rv.*, u.name as reviewer_name, u.profile_image as reviewer_image, rq.title as request_title FROM reviews rv JOIN users u ON rv.reviewer_id=u.id LEFT JOIN requests rq ON rv.request_id=rq.id WHERE rv.reviewed_id=$1 ORDER BY rv.created_at DESC LIMIT 50`, [id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// هل قيّم المستخدم هذا المشروع؟
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
    const reqRow = await pool.query('SELECT status, title, client_id, assigned_provider_id FROM requests WHERE id=$1', [request_id]);
    if (!reqRow.rows.length) return res.status(404).json({ message: 'المشروع غير موجود' });
    if (reqRow.rows[0].status !== 'completed') return res.status(400).json({ message: 'يجب أن يكون المشروع مكتملاً' });
    // منع التقييمات الوهمية: المُقيِّم لازم يكون طرفاً في المشروع، والمُقيَّم هو الطرف الآخر
    {
      const rq = reqRow.rows[0];
      const isClient = rq.client_id === req.user.id;
      const isProvider = rq.assigned_provider_id && rq.assigned_provider_id === req.user.id;
      if (!isClient && !isProvider) return res.status(403).json({ message: 'لا يمكنك تقييم مشروع لست طرفاً فيه' });
      const counterparty = isClient ? rq.assigned_provider_id : rq.client_id;
      if (!counterparty || parseInt(reviewed_id) !== parseInt(counterparty)) return res.status(400).json({ message: 'الطرف المُقيَّم غير صحيح' });
    }
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
      const body = `<p>عزيزي <strong>${eEsc(reviewedInfo.rows[0].name)}</strong>،</p><div style="background:#fff8e6;border:1px solid #fde68a;border-radius:10px;padding:18px;margin:16px 0;text-align:center"><div style="font-size:32px;letter-spacing:6px">${stars}</div><div style="font-size:14px;font-weight:700;color:#92400e">${rating} من 5 نجوم</div>${comment?`<div style="margin-top:12px;font-size:13px;color:#374151;text-align:right">"${eEsc(comment)}"</div>`:''}</div>`;
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
app.post('/api/requests/:id/questions', rateLimiter(20, 600000), auth, async (req, res) => {
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

// POST: رد صاحب المشروع على سؤال (المالك فقط)
app.post('/api/requests/:id/questions/:qid/answer', auth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const qid = parseInt(req.params.qid);
    const answer = (req.body.answer || req.body.body || '').trim();
    if (!answer) return res.status(400).json({ message: 'نص الرد مطلوب' });
    const reqRow = await pool.query('SELECT client_id, title FROM requests WHERE id=$1', [requestId]);
    if (!reqRow.rows.length) return res.status(404).json({ message: 'المشروع غير موجود' });
    if (String(reqRow.rows[0].client_id) !== String(req.user.id)) return res.status(403).json({ message: 'صاحب المشروع فقط يمكنه الرد' });
    const upd = await pool.query(`UPDATE request_questions SET answer=$1, answered_at=NOW() WHERE id=$2 AND request_id=$3 RETURNING *`, [answer, qid, requestId]);
    if (!upd.rows.length) return res.status(404).json({ message: 'السؤال غير موجود' });
    const askerId = upd.rows[0].asker_id;
    if (askerId && String(askerId) !== String(req.user.id)) {
      await notify(askerId, '💬 تم الرد على سؤالك', `ردّ صاحب المشروع على سؤالك في "${reqRow.rows[0].title}".`, 'question_answered', requestId);
    }
    res.json(upd.rows[0]);
  } catch(e) { console.error('POST /answer:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ REPORTS, FAVORITES, PROVIDERS ═══
app.post('/api/reports', rateLimiter(10, 600000), auth, async (req, res) => {
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
    const { category, city, specialty, q: searchQ } = req.query;
    let base = `FROM users WHERE role='provider' AND is_active=TRUE`;
    const params = [];
    if (searchQ) {
      params.push(`%${String(searchQ).trim()}%`);
      base += ` AND (name ILIKE $${params.length} OR COALESCE(business_name,'') ILIKE $${params.length} OR array_to_string(COALESCE(specialties,'{}'),' ') ILIKE $${params.length})`;
    }
    if (category) { params.push(category); base += ` AND $${params.length}=ANY(specialties)`; }
    if (specialty){ params.push(specialty); base += ` AND $${params.length}=ANY(COALESCE(specialties,'{}'))`; }
    if (city)     { params.push(`%${city}%`); base += ` AND city ILIKE $${params.length}`; }
    const countR = await pool.query(`SELECT COUNT(*)::int c ${base}`, params);
    const total = countR.rows[0] ? countR.rows[0].c : 0;
    const q = `SELECT id, name, city, specialties, badge, tier, bio, profile_image, experience_years, last_bumped_at, created_at, COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0)::float as avg_rating, COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0)::int as review_count, (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed')::int as completed_projects ${base} ORDER BY CASE WHEN profile_image IS NOT NULL AND bio IS NOT NULL AND specialties IS NOT NULL AND array_length(specialties,1) > 0 THEN 0 ELSE 1 END ASC, CASE tier WHEN 'expert' THEN 0 WHEN 'distinguished' THEN 1 WHEN 'active' THEN 2 ELSE 3 END ASC, COALESCE(last_bumped_at, created_at) DESC LIMIT 200`;
    const r = await pool.query(q, params);
    res.set('X-Total-Count', String(total));
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

// حذف تلقائي للإشعارات المقروءة الأقدم من 30 يوم (يمنع التراكم اللانهائي)
setInterval(async () => {
  try { await pool.query("DELETE FROM notifications WHERE is_read=TRUE AND created_at < NOW() - INTERVAL '30 days'"); }
  catch(e){ console.error('notif cleanup:', e.message); }
}, 6 * 60 * 60 * 1000); // كل 6 ساعات

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
app.get('/api/cities', (req, res) => { res.json(['الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الطائف','أبها','تبوك','حائل','بريدة','الأحساء','خميس مشيط','جازان','نجران','الباحة','عرعر','سكاكا','ينبع','القطيف','الجبيل']); });
// ═══ مصدر موحّد للتخصصات — كل الصفحات تقرأ منه (تسجيل/نشر/أدمن/رئيسية) ═══
const CATEGORIES = ['تبريد وتكييف','كهرباء','سباكة','نجارة','تنظيف','نقل عفش','حدادة','ألمنيوم','كلادينج وواجهات','مسابح','كاميرات مراقبة','شبكات وإنترنت','مظلات وسواتر','عزل حراري','مكافحة حشرات','بناء','جبس','كشف تسربات المياه','تنظيف خزانات','دهانات وديكور','تركيب مطابخ','تنسيق حدائق','زجاج ومرايا','بلاط ورخام','تركيب أثاث','أرضيات خشبية وباركيه','تنظيف سجاد وكنب','صيانة مصاعد','أبواب وبوابات أوتوماتيكية','ترميم مبانٍ','تنظيف واجهات المباني','حفر آبار ومضخات','أنظمة الحريق والسلامة','تخطيط المواقف والسلامة المرورية','معدات ثقيلة','عوازل مائية','أنظمة شمسية','صيانة عامة','إنشاءات معدنية وهناجر','أعمال الطرق والأسفلت','صرف صحي وبيارات','أرضيات إيبوكسي','تحلية ومعالجة مياه','تشطيبات ومقاولات عامة','مكاتب هندسية','أخرى'];
app.get('/api/support-contact', async (req, res) => {
  try { const num = await getSetting('support_whatsapp', '0594011313'); res.set('Cache-Control','public, max-age=120'); res.json({ whatsapp: String(num||'').trim() }); }
  catch(e){ res.json({ whatsapp: '0594011313' }); }
});
app.get('/api/version', (req, res) => { res.json({ version: 'edit-geo-atts-30mb-v3', features: ['edit_geo','edit_attachments','dwg_30mb','provider_location','categories_fixed'], ts: '2026-08-14' }); });
app.get('/api/categories', (req, res) => { res.set('Cache-Control','public, max-age=300'); res.json({ categories: CATEGORIES }); });

app.get('/api/stats', async (req, res) => {
  try {
    const s = await Promise.all([pool.query("SELECT COUNT(*) as count FROM requests WHERE status='completed' AND (category IS DISTINCT FROM 'direct')"),pool.query("SELECT COUNT(*) as count FROM users WHERE role='provider' AND is_active=true"),pool.query("SELECT COUNT(*) as count FROM users WHERE role='client' AND is_active=true"),pool.query("SELECT COUNT(*) as count FROM requests WHERE status='open' AND (category IS DISTINCT FROM 'direct')")]);
    res.json({ completed_projects:+s[0].rows[0].count||0, active_providers:+s[1].rows[0].count||0, active_clients:+s[2].rows[0].count||0, open_requests:+s[3].rows[0].count||0 });
  } catch(e) { res.json({ completed_projects:0, active_providers:0, active_clients:0, open_requests:0 }); }
});

// عام: تسجيل مشاهدة صفحة مزوّد (لا يحسب صاحبها)
app.post('/api/pro/:id/view', rateLimiter(60, 600000), async (req, res) => {
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
  if(q){ v.push('%'+q+'%'); w.push(`(name ILIKE $${v.length} OR phone ILIKE $${v.length} OR category ILIKE $${v.length})`); }
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
    let lim = parseInt(req.query.limit);
    if (isNaN(lim) || lim <= 0) lim = 300;
    if (lim > 10000) lim = 10000;
    v.push(lim);
    const r = await pool.query(`SELECT * FROM leads ${where} ORDER BY score DESC, created_at DESC LIMIT $${v.length}`, v);
    const total = await pool.query(`SELECT COUNT(*)::int AS n FROM leads ${where}`, v.slice(0, v.length-1));
    res.json({ leads: r.rows, total: total.rows[0].n });
  } catch(e){ console.error('leads list:', e); res.status(500).json({ message:'تعذّر الجلب' }); }
});

// طابور الصيد: التالي (غير متواصل معه) + مطابقة مشروع حقيقي
app.get('/api/admin/leads/queue', requirePermission('outreach.manage'), async (req, res) => {
  try {
    const type = req.query.type === 'client' ? 'client' : 'provider';
    const r = await pool.query(
      `SELECT * FROM leads WHERE lead_type=$1 AND status IN ('new','followup')
       AND phone_norm IS NOT NULL
       AND (followup_at IS NULL OR followup_at <= NOW())
       ORDER BY score DESC, created_at ASC LIMIT 25`, [type]);
    const leads = r.rows;
    // مطابقة كل مزوّد بأقرب مشروع مفتوح في تخصصه/مدينته
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

// حذف جماعي بطلب واحد — سريع وموثوق (بدل مئات المشاريع المتتالية)
app.post('/api/admin/leads/delete-by-filter', requirePermission('outreach.manage'), async (req, res) => {
  try {
    const { where, v } = buildLeadFilter(req.body || {});
    if (!where) return res.status(400).json({ message: 'يجب تحديد فلتر واحد على الأقل (حماية من حذف الكل)' });
    const r = await pool.query(`DELETE FROM leads ${where}`, v);
    res.json({ ok: true, deleted: r.rowCount });
  } catch(e){ console.error('delete-by-filter leads:', e.message); res.status(500).json({ message:'تعذّر الحذف' }); }
});

app.post('/api/admin/leads/bulk-delete', requirePermission('outreach.manage'), async (req, res) => {
  try {
    var ids = Array.isArray(req.body.ids) ? req.body.ids.map(function(x){return parseInt(x);}).filter(function(n){return !isNaN(n);}) : [];
    if (!ids.length) return res.status(400).json({ message: 'لا توجد عناصر محددة' });
    if (ids.length > 5000) ids = ids.slice(0, 5000);
    const r = await pool.query('DELETE FROM leads WHERE id = ANY($1::int[])', [ids]);
    res.json({ ok: true, deleted: r.rowCount });
  } catch(e){ console.error('bulk-delete leads:', e.message); res.status(500).json({ message:'تعذّر الحذف الجماعي' }); }
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
    var r = await pool.query(`SELECT name,phone,phone_norm,category,city,rating,reviews_count,status,tag,score,notes,created_at FROM leads ${where} ORDER BY created_at DESC`, v);
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
    // مقاييس المشروع — الرقم اللي يهم فعلاً
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

// خريطة الفجوات: مشاريع مفتوحة بلا تغطية مزودين كافية
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
    const sys = 'أنت خبير تسويق سعودي لمنصة «مناقصة» (منصة تربط العملاء بمزودي الخدمات). اكتب رسالة واتساب قصيرة (٣-٤ أسطر) بلهجة سعودية مهذبة واحترافية لدعوة منشأة للانضمام. الرسالة تعطي قيمة قبل المشروع، شخصية، وتنتهي بسؤال بسيط. لا تكتب أي شيء غير الرسالة نفسها. ضمّن الرابط https://www.manaqasa.com';
    let usr = 'نوع المستهدف: '+(l.lead_type==='client'?'عميل محتمل (شركة تحتاج خدمات)':'مزوّد خدمة')+'\nالاسم: '+l.name+'\nالتخصص: '+(l.category||'غير محدد')+'\nالمدينة: '+(l.city||'غير محدد')+'\nالتقييم: '+(l.rating||'—');
    if(matched) usr += '\n\nيوجد مشروع حقيقي مطابق يمكن ذكره كطُعم: «'+matched.title+'»'+(matched.budget_max?' بميزانية '+matched.budget_max+' ريال':'')+' في '+(matched.city||'')+'. اذكره لجذبه.';
    const msg = await callClaude(sys, usr, 300);
    if(!msg) return res.json({ message:null, fallback:true });
    res.json({ message: msg });
  }catch(e){ console.error('gen-message:', e); res.status(500).json({ message:'تعذّر التوليد' }); }
});

// تحليل رد المزوّد + صياغة الرد المناسب
app.post('/api/admin/leads/:id/analyze-reply', requirePermission('outreach.manage'), async (req, res) => {
  try{
    const reply = String(req.body.reply||'').trim().slice(0,4000);
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

app.post('/api/admin/requests/:id/followup-stage', requirePermission('requests.edit'), async (req, res) => {
  try {
    const allowed = ['few','offers','delayed',''];
    let st = String(req.body.stage||'').trim();
    if (!allowed.includes(st)) return res.status(400).json({ message: 'مرحلة غير صحيحة' });
    await pool.query('UPDATE requests SET followup_stage=$1 WHERE id=$2', [st||null, parseInt(req.params.id)]);
    res.json({ ok: true });
  } catch(e){ console.error('followup-stage:', e.message); res.status(500).json({ message: 'تعذّر النقل' }); }
});
app.get('/api/admin/daily-report', requirePermission('dashboard.view'), async (req, res) => {
  try {
    const q = (sql) => pool.query(sql).then(r => parseInt((r.rows[0]&&(r.rows[0].count||r.rows[0].c))||0)).catch(()=>0);
    const [projToday, bidsToday, provToday, cliToday, pendReview, openProj, inProg, fuFew, fuDelayed, fuReview] = await Promise.all([
      q("SELECT COUNT(*) FROM requests WHERE created_at::date = CURRENT_DATE"),
      q("SELECT COUNT(*) FROM bids WHERE created_at::date = CURRENT_DATE"),
      q("SELECT COUNT(*) FROM users WHERE role='provider' AND created_at::date = CURRENT_DATE"),
      q("SELECT COUNT(*) FROM users WHERE role='client' AND created_at::date = CURRENT_DATE"),
      q("SELECT COUNT(*) FROM requests WHERE status IN ('pending_review','review')"),
      q("SELECT COUNT(*) FROM requests WHERE status='open'"),
      q("SELECT COUNT(*) FROM requests WHERE status='in_progress'"),
      q("SELECT COUNT(*) FROM requests r WHERE r.status='open' AND (SELECT COUNT(*) FROM bids WHERE request_id=r.id)<=2"),
      q("SELECT COUNT(*) FROM requests r WHERE r.status='open' AND (SELECT COUNT(*) FROM bids WHERE request_id=r.id)>=3 AND r.created_at <= NOW() - INTERVAL '5 days'"),
      q("SELECT COUNT(*) FROM requests r WHERE r.status='completed' AND NOT EXISTS(SELECT 1 FROM reviews rv WHERE rv.request_id=r.id AND rv.reviewer_id=r.client_id)")
    ]);
    // قوائم التفاصيل (مين/وش بالضبط) — تظهر عند النقر
    const rows = (sql) => pool.query(sql).then(r => r.rows).catch(()=>[]);
    const [projList, provList, cliList, bidList, chatList] = await Promise.all([
      rows("SELECT r.id, r.title, COALESCE(u.name,'عميل') AS owner, r.created_at FROM requests r JOIN users u ON u.id=r.client_id WHERE r.created_at::date=CURRENT_DATE ORDER BY r.created_at DESC LIMIT 20"),
      rows("SELECT id, name, phone, created_at FROM users WHERE role='provider' AND created_at::date=CURRENT_DATE ORDER BY created_at DESC LIMIT 20"),
      rows("SELECT id, name, phone, created_at FROM users WHERE role='client' AND created_at::date=CURRENT_DATE ORDER BY created_at DESC LIMIT 20"),
      rows("SELECT b.id, COALESCE(u.name,'مزود') AS provider, r.title AS project, b.created_at FROM bids b JOIN users u ON u.id=b.provider_id JOIN requests r ON r.id=b.request_id WHERE b.created_at::date=CURRENT_DATE ORDER BY b.created_at DESC LIMIT 20"),
      // محادثات اليوم: مين راسل مين + المشروع — بدون محتوى الرسالة (احترام الخصوصية)
      rows(`SELECT MIN(m.id) AS id, COALESCE(s.name,'—') AS sender, COALESCE(rc.name,'—') AS receiver, COALESCE(r.title,'—') AS project, MAX(m.created_at) AS created_at, COUNT(*)::int AS msgs
            FROM messages m
            LEFT JOIN users s ON s.id=m.sender_id
            LEFT JOIN users rc ON rc.id=m.receiver_id
            LEFT JOIN requests r ON r.id=m.request_id
            WHERE m.created_at::date=CURRENT_DATE
            GROUP BY LEAST(m.sender_id,m.receiver_id), GREATEST(m.sender_id,m.receiver_id), m.request_id, s.name, rc.name, r.title
            ORDER BY MAX(m.created_at) DESC LIMIT 20`)
    ]);
    res.json({
      today: { projects: projToday, bids: bidsToday, providers: provToday, clients: cliToday, chats: chatList.length },
      pending: { review: pendReview, open: openProj, in_progress: inProg },
      followup: { few: fuFew, delayed: fuDelayed, review: fuReview, total: fuFew+fuDelayed+fuReview },
      lists: { projects: projList, providers: provList, clients: cliList, bids: bidList, chats: chatList }
    });
  } catch(e){ console.error('daily-report:', e.message); res.status(500).json({ message: 'تعذّر الجلب' }); }
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
    const { price, days, note, status, price_unit, price_visibility } = req.body;
    const sets = []; const params = []; let i = 1;
    if (price !== undefined) { params.push(Number(price)); sets.push(`price=$${i}`); i++; }
    if (days !== undefined) { params.push(parseInt(days)); sets.push(`days=$${i}`); i++; }
    if (note !== undefined) { params.push(note); sets.push(`note=$${i}`); i++; }
    if (status !== undefined) { params.push(status); sets.push(`status=$${i}`); i++; }
    if (price_unit !== undefined && ['total','meter','unit'].indexOf(price_unit) >= 0) { params.push(price_unit); sets.push(`price_unit=$${i}`); i++; }
    if (price_visibility !== undefined) { params.push(price_visibility === 'public' ? 'public' : 'client'); sets.push(`price_visibility=$${i}`); i++; }
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

app.get('/api/admin/duplicates', requirePermission('users.view'), async (req, res) => {
  try {
    const memberJson = `json_agg(json_build_object('id',id,'name',name,'email',email,'phone',phone,'role',role,'created_at',created_at,'is_active',is_active,'requests',(SELECT COUNT(*) FROM requests WHERE client_id=u.id),'bids',(SELECT COUNT(*) FROM bids WHERE provider_id=u.id)) ORDER BY created_at ASC)`;
    const byEmail = await pool.query(
      `SELECT LOWER(TRIM(email)) AS key, ${memberJson} AS members, COUNT(*)::int AS c
       FROM users u WHERE email IS NOT NULL AND TRIM(email)<>'' AND role<>'admin' AND email NOT LIKE 'proxy_%@manaqasa.local'
       GROUP BY LOWER(TRIM(email)) HAVING COUNT(*)>1 ORDER BY COUNT(*) DESC LIMIT 200`);
    const byPhone = await pool.query(
      `SELECT RIGHT(regexp_replace(phone,'[^0-9]','','g'),9) AS key, ${memberJson} AS members, COUNT(*)::int AS c
       FROM users u WHERE phone IS NOT NULL AND LENGTH(regexp_replace(phone,'[^0-9]','','g'))>=9 AND role<>'admin'
       GROUP BY RIGHT(regexp_replace(phone,'[^0-9]','','g'),9) HAVING COUNT(*)>1 ORDER BY COUNT(*) DESC LIMIT 200`);
    res.json({ byEmail: byEmail.rows, byPhone: byPhone.rows, counts:{ email: byEmail.rows.length, phone: byPhone.rows.length } });
  } catch(e){ console.error('duplicates:', e.message); res.status(500).json({ message: 'تعذّر الفحص' }); }
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
    const { name, email, phone, city, bio, business_name, role } = req.body || {};
    if (email) { const dup = await pool.query('SELECT id FROM users WHERE email=$1 AND id<>$2', [email, uid]); if (dup.rows.length) return res.status(409).json({ message: 'الإيميل مستخدم لحساب آخر' }); }
    // تغيير الدور مسموح فقط بين عميل/مزوّد (أمان: لا يُرفَّع أحد إلى admin، ولا يُغيَّر دور admin)
    let roleVal = (role === 'client' || role === 'provider') ? role : null;
    const r = await pool.query(`UPDATE users SET name=COALESCE(NULLIF($1,''),name), email=COALESCE(NULLIF($2,''),email), phone=$3, city=$4, bio=$5, business_name=$6, role=CASE WHEN $7::text IS NOT NULL AND role<>'admin' THEN $7::text ELSE role END WHERE id=$8 RETURNING id, name, email, role`, [name||'', email||'', phone||null, city||null, bio||null, business_name||null, roleVal, uid]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    await logAdmin(req, 'edit_user', 'user', uid, 'تعديل بيانات: ' + (r.rows[0].name||''));
    res.json(r.rows[0]);
  } catch(e) { console.error('edit user:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// الأدمن: قائمة المناديب مع مشاريعهم (لحساب الإجماليات والدفع)
app.get('/api/admin/agents', requirePermission('requests.view'), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT a.id, a.name, a.phone, a.token,
        COALESCE(json_agg(json_build_object(
          'id', r.id, 'title', r.title, 'status', r.status, 'pct', r.agent_pct,
          'accepted_price', (SELECT price FROM bids WHERE request_id=r.id AND status='accepted' LIMIT 1),
          'paid_at', r.agent_paid_at
        ) ORDER BY r.created_at DESC) FILTER (WHERE r.id IS NOT NULL), '[]') as projects
      FROM agents a LEFT JOIN requests r ON r.agent_id=a.id
      GROUP BY a.id ORDER BY a.created_at DESC`);
    res.json(r.rows.map(a => ({ ...a, link: SITE_URL + '/agent/' + a.token })));
  } catch(e) { console.error('admin agents:', e.message); res.status(500).json({ message: 'حدث خطأ' }); }
});

// الأدمن: تعليم عمولة مشروع كمدفوعة/غير مدفوعة
app.put('/api/admin/requests/:id/agent-paid', requirePermission('requests.edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const paid = req.body.paid !== false;
    await pool.query('UPDATE requests SET agent_paid_at=$1 WHERE id=$2', [paid ? new Date() : null, id]);
    res.json({ ok: true, paid });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ' }); }
});

// ═══ بوابة المندوب: رابط سحري يتابع فيه مشاريعه وعمولته (بلا تسجيل) ═══
app.get('/agent/:token', async (req, res) => {
  try {
    const ag = (await pool.query('SELECT * FROM agents WHERE token=$1', [req.params.token])).rows[0];
    if (!ag) return res.status(404).set('Content-Type','text/html; charset=utf-8').send('<html dir="rtl"><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:60px;color:#64748b">الرابط غير صالح</body></html>');
    const rows = (await pool.query(`SELECT r.id, r.title, r.status, r.agent_pct, r.agent_paid_at, (SELECT price FROM bids WHERE request_id=r.id AND status='accepted' LIMIT 1) as accepted_price FROM requests r WHERE r.agent_id=$1 ORDER BY r.created_at DESC`, [ag.id])).rows;
    const e2 = (x) => String(x==null?'':x).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    let totDue=0, totPaid=0, nPending=0;
    const items = rows.map(r=>{
      const pct = Number(r.agent_pct)||0;
      const ap = Number(r.accepted_price)||0;
      const done = (r.status==='in_progress'||r.status==='completed'||r.status==='done') && ap>0;
      const due = done ? Math.round(ap*pct/100) : 0;
      let badge, col;
      if (r.agent_paid_at) { badge='مدفوعة'; col='#059669'; totPaid+=due; }
      else if (done) { badge='مستحقة'; col='#1e40af'; totDue+=due; }
      else { badge='قيد استقبال العروض'; col='#b45309'; nPending++; }
      return `<tr><td><div style="font-weight:800;color:#0f2a4f">${e2(r.title||'—')}</div><div style="font-size:11px;color:#64748b">مشروع #${r.id} · ${pct}٪</div></td><td style="text-align:center"><span style="background:${col}1a;color:${col};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800">${badge}</span></td><td style="text-align:left;font-weight:900;color:${r.agent_paid_at?'#059669':(due?'#1e40af':'#94a3b8')};white-space:nowrap">${due?due.toLocaleString('en-US')+' ر.س':'—'}</td></tr>`;
    }).join('');
    const html=`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>بوابة المندوب — مناقصة</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Cairo:wght@700;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Tajawal,sans-serif;color:#1e293b;background:#f1f5f9;padding:20px}.wrap{max-width:640px;margin:0 auto}.hd{background:linear-gradient(135deg,#172554,#1e3a8a);color:#fff;border-radius:16px;padding:22px;margin-bottom:16px}.brand{font-family:Cairo,sans-serif;font-size:22px;font-weight:900}.brand span{color:#93c5fd}.wel{font-size:14px;margin-top:8px;opacity:.9}.cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px}.c{background:#fff;border-radius:13px;padding:15px 12px;text-align:center;border:1px solid #e2e8f0}.c .n{font-size:20px;font-weight:900}.c .l{font-size:11px;color:#64748b;margin-top:3px}table{width:100%;border-collapse:collapse;background:#fff;border-radius:13px;overflow:hidden;border:1px solid #e2e8f0}th{background:#0f2a4f;color:#fff;font-size:11px;padding:10px;text-align:right;font-weight:700}td{border-bottom:1px solid #eef2f7;padding:12px 10px;font-size:12px;vertical-align:middle}.ft{text-align:center;font-size:11px;color:#94a3b8;margin-top:18px}</style></head><body><div class="wrap"><div class="hd"><div class="brand">مناقص<span>ة</span></div><div class="wel">أهلاً <strong>${e2(ag.name)}</strong> — هذي متابعة مشاريعك وعمولاتك</div></div><div class="cards"><div class="c"><div class="n" style="color:#b45309">${nPending}</div><div class="l">قيد الانتظار</div></div><div class="c"><div class="n" style="color:#1e40af">${totDue.toLocaleString('en-US')}</div><div class="l">مستحق (ر.س)</div></div><div class="c"><div class="n" style="color:#059669">${totPaid.toLocaleString('en-US')}</div><div class="l">مدفوع (ر.س)</div></div></div><table><thead><tr><th>المشروع</th><th style="text-align:center">الحالة</th><th style="text-align:left">العمولة</th></tr></thead><tbody>${items||'<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:26px">لا توجد مشاريع بعد</td></tr>'}</tbody></table><div class="ft">منصة مناقصة · manaqasa.com · العمولة تُستحق عند اعتماد عرض على المشروع</div></div></body></html>`;
    res.set('Content-Type','text/html; charset=utf-8').send(html);
  } catch(e) { console.error('agent portal:', e.message); res.status(500).send('خطأ'); }
});

// الأدمن: رابط بوابة المندوب المرتبط بمشروع (لإرساله له)
app.get('/api/admin/requests/:id/agent-link', requirePermission('requests.view'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rq = (await pool.query('SELECT agent_id, agent_phone, agent_name FROM requests WHERE id=$1', [id])).rows[0];
    if (!rq || !rq.agent_id) return res.status(404).json({ message: 'لا يوجد مندوب مرتبط بهذا المشروع' });
    const ag = (await pool.query('SELECT token FROM agents WHERE id=$1', [rq.agent_id])).rows[0];
    if (!ag) return res.status(404).json({ message: 'المندوب غير موجود' });
    const phoneNorm = String(rq.agent_phone||'').replace(/\D/g,'').replace(/^0/,'966');
    res.json({ ok: true, url: SITE_URL + '/agent/' + ag.token, phone_norm: phoneNorm, name: rq.agent_name });
  } catch(e) { res.status(500).json({ message: 'حدث خطأ' }); }
});

// ═══ تقرير العروض (سيرفر) — قالب واحد يستخدمه الأدمن والعميل عبر رابط برمز آمن ═══
function _renderOffersReportHTML(proj, bids) {
  const e2 = (x) => String(x==null?'':x).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const unit = (u) => u==='meter'?' / للمتر':u==='unit'?' / للوحدة':'';
  const rows = bids.map((b,i)=>{
    const nm=e2(b.provider_business_name||b.provider_name||'مزود');
    const rate=(Number(b.provider_rating)>0)?('★ '+b.provider_rating+' ('+(b.provider_reviews||0)+')'):'مزود جديد';
    const meta=[b.provider_city,rate].filter(Boolean).map(e2).join(' · ');
    const pr=(Number(b.price)>0)?(Number(b.price).toLocaleString('en-US')+' ر.س'+unit(b.price_unit)):'—';
    const acc=b.status==='accepted'?' <span style="background:#dcfce7;color:#166534;padding:1px 7px;border-radius:20px;font-size:10px;font-weight:800">مقبول</span>':'';
    return `<tr><td style="text-align:center;color:#94a3b8;font-weight:800">${i+1}</td><td><div style="font-weight:800;color:#0f2a4f">${nm}${acc}</div><div style="font-size:11px;color:#64748b">${meta}</div></td><td style="font-weight:900;color:#1e40af;white-space:nowrap">${pr}</td><td style="text-align:center;white-space:nowrap">${b.days?e2(b.days)+' يوم':'—'}</td><td style="font-size:11px;color:#475569;line-height:1.7">${e2(b.note||'')}${b.attachment_url?' <span style="color:#1e40af;font-weight:700">(مرفق ملف)</span>':''}</td></tr>`;
  }).join('');
  const today=new Date().toLocaleDateString('en-GB');
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>تقرير العروض — ${e2(proj.title||'')}</title><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&family=Cairo:wght@700;900&display=swap" rel="stylesheet"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Tajawal,sans-serif;color:#1e293b;padding:34px;background:#fff}.hd{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1e40af;padding-bottom:15px;margin-bottom:20px}.brand{font-family:Cairo,sans-serif;font-size:26px;font-weight:900;color:#0f2a4f}.brand span{color:#1e40af}.pbox{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:15px;margin-bottom:16px}.pbox h1{font-size:16px;color:#0f2a4f;margin-bottom:6px}.pmeta{font-size:12px;color:#64748b;line-height:1.9}.cnt{font-size:13px;font-weight:800;color:#1e40af;margin-bottom:10px}table{width:100%;border-collapse:collapse}th{background:#0f2a4f;color:#fff;font-size:11px;padding:9px;text-align:right;font-weight:700}td{border-bottom:1px solid #e2e8f0;padding:9px;font-size:12px;vertical-align:top}tr:nth-child(even) td{background:#fafbfc}.ft{margin-top:22px;padding-top:13px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}.pb{position:fixed;top:16px;left:16px;background:#1e40af;color:#fff;border:none;padding:11px 20px;border-radius:10px;font-family:Tajawal;font-size:14px;font-weight:800;cursor:pointer}@media print{.pb{display:none}body{padding:0}}</style></head><body><button class="pb" onclick="window.print()">حفظ PDF / طباعة</button><div class="hd"><div><div class="brand">مناقص<span>ة</span></div><div style="font-size:13px;color:#64748b;margin-top:2px">تقرير العروض المقدّمة على المشروع</div></div><div style="text-align:left;font-size:11px;color:#94a3b8">تاريخ التقرير<br>${today}</div></div><div class="pbox"><h1>${e2(proj.title||'—')}</h1><div class="pmeta">رقم المشروع: #${proj.id} · التصنيف: ${e2(proj.category||'—')} · المدينة: ${e2(proj.city||'—')}<br>العميل: ${e2(proj.client_name||'—')}</div></div><div class="cnt">عدد العروض المقدّمة: ${bids.length}</div><table><thead><tr><th style="width:28px">#</th><th>المزوّد</th><th>السعر</th><th style="text-align:center">المدة</th><th>ملاحظة العرض</th></tr></thead><tbody>${rows||'<tr><td colspan="5" style="text-align:center;color:#94a3b8;padding:22px">لا توجد عروض بعد</td></tr>'}</tbody></table><div class="ft"><span>منصة مناقصة · manaqasa.com</span><span>تقرير رسمي</span></div></body></html>`;
}

async function _fetchReportData(id) {
  const pr = (await pool.query(`SELECT r.id, r.title, r.category, r.city, u.name as client_name FROM requests r JOIN users u ON r.client_id=u.id WHERE r.id=$1`, [id])).rows[0];
  if (!pr) return null;
  const bids = (await pool.query(`SELECT b.price,b.days,b.note,b.status,COALESCE(b.price_unit,'total') as price_unit,b.attachment_url,u.name as provider_name,u.business_name as provider_business_name,u.city as provider_city,COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews WHERE reviewed_id=u.id),0) as provider_rating,COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=u.id),0) as provider_reviews FROM bids b JOIN users u ON b.provider_id=u.id WHERE b.request_id=$1 ORDER BY (b.price IS NULL), b.price ASC`, [id])).rows;
  return { pr, bids };
}

// رابط عام برمز موقّع — يفتحه العميل بلا تسجيل
app.get('/report/offers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let ok = false;
    try { const p = jwt.verify(String(req.query.t||''), JWT_SECRET); if (p && p.purpose==='report' && String(p.rid)===String(id)) ok = true; } catch(e) {}
    if (!ok) return res.status(403).set('Content-Type','text/html; charset=utf-8').send('<html dir="rtl"><head><meta charset="utf-8"></head><body style="font-family:sans-serif;text-align:center;padding:60px;color:#64748b">الرابط غير صالح أو منتهي</body></html>');
    const data = await _fetchReportData(id);
    if (!data) return res.status(404).send('المشروع غير موجود');
    res.set('Content-Type','text/html; charset=utf-8').send(_renderOffersReportHTML(data.pr, data.bids));
  } catch(e) { console.error('report render:', e.message); res.status(500).send('خطأ'); }
});

// الأدمن: يحصل على رابط التقرير (لفتحه/طباعته)
app.get('/api/admin/requests/:id/report-link', requirePermission('requests.view'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tok = jwt.sign({ rid: id, purpose: 'report' }, JWT_SECRET, { expiresIn: '60d' });
    res.json({ ok: true, url: SITE_URL + '/report/offers/' + id + '?t=' + tok });
  } catch(e) { res.status(500).json({ message: 'خطأ' }); }
});

// الأدمن: إرسال التقرير للعميل (إيميل) + إرجاع الرابط لإرساله واتساب
app.post('/api/admin/requests/:id/send-report', requirePermission('requests.edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pr = (await pool.query(`SELECT r.id,r.title,u.name as client_name,u.email as client_email,u.phone as client_phone FROM requests r JOIN users u ON r.client_id=u.id WHERE r.id=$1`, [id])).rows[0];
    if (!pr) return res.status(404).json({ message: 'المشروع غير موجود' });
    const tok = jwt.sign({ rid: id, purpose: 'report' }, JWT_SECRET, { expiresIn: '60d' });
    const link = SITE_URL + '/report/offers/' + id + '?t=' + tok;
    const phoneNorm = String(pr.client_phone||'').replace(/\D/g,'').replace(/^0/,'966');
    let emailed = false;
    if (pr.client_email && !/@manaqasa\.local$/i.test(pr.client_email)) {
      const title = '📋 عروض مشروعك جاهزة';
      const body = `<p>عزيزي <strong>${eEsc(pr.client_name||'')}</strong>،</p><p>وصلتك عروض على مشروعك «${eEsc(pr.title||'')}». اضغط لعرض تقرير العروض كاملاً:</p>`;
      sendEmail(pr.client_email, title, emailTpl(title, body, 'عرض تقرير العروض', link)).catch(()=>{});
      emailed = true;
    }
    res.json({ ok: true, link, phone_norm: phoneNorm, emailed, client_name: pr.client_name });
  } catch(e) { console.error('send-report:', e.message); res.status(500).json({ message: 'حدث خطأ' }); }
});

// ═══ #٥ تحكّم الأدمن: رابط دخول لأي مستخدم (يدخل الأدمن كحساب العميل — يُفتح في نافذة متخفية) ═══
app.get('/api/admin/users/:id/magic-link', requirePermission('users.edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const u = (await pool.query('SELECT id, name, phone FROM users WHERE id=$1', [id])).rows[0];
    if (!u) return res.status(404).json({ message: 'المستخدم غير موجود' });
    const tok = await getMagicToken(u.id);
    const phoneNorm = String(u.phone || '').replace(/\D/g, '').replace(/^0/, '966');
    res.json({ ok: true, magic_link: SITE_URL + '/m/' + tok, phone_norm: phoneNorm, name: u.name });
  } catch(e) { console.error('admin user magic-link:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.put('/api/admin/users/:id/toggle', requirePermission('users.edit'), async (req, res) => {
  try {
    const uid = parseInt(req.params.id);
    if (uid===req.user.id) return res.status(400).json({ message: 'لا يمكن تعديل حسابك' });
    { const g = await guardUserTarget(req, uid); if (g) return res.status(g.code).json({ message: g.message }); }
    const r = await pool.query(`UPDATE users SET is_active=NOT is_active WHERE id=$1 AND role!='admin' RETURNING id, name, is_active`, [uid]);
    _userState.delete(uid);
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
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM bids WHERE provider_id=$1', [uid]);
      await client.query('DELETE FROM reviews WHERE reviewer_id=$1 OR reviewed_id=$1', [uid]);
      await client.query('DELETE FROM notifications WHERE user_id=$1', [uid]);
      await client.query('DELETE FROM messages WHERE sender_id=$1 OR receiver_id=$1', [uid]);
      await client.query('DELETE FROM reports WHERE reporter_id=$1 OR reported_id=$1', [uid]);
      await client.query('DELETE FROM favorites WHERE user_id=$1 OR provider_id=$1', [uid]);
      await client.query('DELETE FROM push_tokens WHERE user_id=$1', [uid]);
      const urs = await client.query('SELECT id FROM requests WHERE client_id=$1', [uid]);
      for (const r of urs.rows) await client.query('DELETE FROM bids WHERE request_id=$1', [r.id]);
      await client.query('DELETE FROM requests WHERE client_id=$1', [uid]);
      if (chk.rows[0].role==='provider') await client.query('UPDATE requests SET assigned_provider_id=NULL WHERE assigned_provider_id=$1', [uid]);
      const del = await client.query('DELETE FROM users WHERE id=$1', [uid]);
      if (del.rowCount===0) throw new Error('فشل الحذف');
      await client.query('COMMIT');
      _userState.delete(uid);
      res.json({ ok: true, deleted_user: chk.rows[0] });
    } catch(e) { try { await client.query('ROLLBACK'); } catch(_){} throw e; }
    finally { client.release(); }
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
    let q = `SELECT r.*, u.name as client_name, p.name as provider_name, COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count, (SELECT price FROM bids WHERE request_id=r.id AND status='accepted' LIMIT 1) as accepted_price FROM requests r JOIN users u ON r.client_id=u.id LEFT JOIN users p ON r.assigned_provider_id=p.id WHERE (r.category IS DISTINCT FROM 'direct')`;
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

app.post('/api/requests/:id/close-by-owner', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const reason = String(req.body.reason||'').slice(0,60);
    const note = String(req.body.note||'').slice(0,500);
    const REASONS = ['chose_outside','price_high','postponed','no_suitable_offers','other'];
    if (!REASONS.includes(reason)) return res.status(400).json({ message: 'سبب غير صحيح' });
    const r = await pool.query('SELECT client_id, status, title FROM requests WHERE id=$1', [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'المشروع غير موجود' });
    if (r.rows[0].client_id !== req.user.id) return res.status(403).json({ message: 'ليست لك صلاحية' });
    if (['completed','in_progress','assigned'].includes(r.rows[0].status)) return res.status(400).json({ message: 'لا يمكن إغلاق مشروع تمت ترسيته أو اكتمل' });
    const _wasOpen = (r.rows[0].status === 'open');
    const _projTitle = r.rows[0].title || 'مشروع';
    await pool.query("UPDATE requests SET status='closed_auto', close_reason=$1, close_reason_note=$2, closed_at=NOW() WHERE id=$3", [reason, note||null, id]);
    // إشعار المزوّدين الذين قدّموا عروضاً — رسالة محايدة بلا كشف السبب، مرّة واحدة فقط عند الإغلاق من حالة "مفتوح"
    if (_wasOpen) {
      try {
        const bidders = await pool.query(`SELECT DISTINCT b.provider_id, u.name, u.email FROM bids b JOIN users u ON b.provider_id=u.id WHERE b.request_id=$1`, [id]);
        for (const bp of bidders.rows) {
          await notify(bp.provider_id, 'أُغلق المشروع', `أُغلق مشروع «${eEsc(_projTitle)}» ولم يعد يستقبل عروضاً. نشكر لك وقتك وعرضك.`, 'request_closed', id);
          if (bp.email) sendEmail(bp.email, `أُغلق مشروع «${eEsc(_projTitle)}»`, emailTpl('أُغلق المشروع', `<p>عزيزي <strong>${eEsc(bp.name||'')}</strong>،</p><p>أُغلق مشروع «${eEsc(_projTitle)}» ولم يعد يستقبل عروضاً. نشكر لك وقتك وعرضك — وتجد مشاريع جديدة بانتظارك.</p>`, 'تصفّح المشاريع', SITE_URL+'/dashboard-provider.html')).catch(()=>{});
        }
      } catch(e){ console.error('close-notify:', e.message); }
    }
    res.json({ ok: true });
  } catch(e){ console.error('close-by-owner:', e.message); res.status(500).json({ message: 'تعذّر الإغلاق' }); }
});
app.get('/api/admin/close-reasons', requirePermission('requests.view'), async (req, res) => {
  try {
    const agg = await pool.query(`SELECT reason AS close_reason, COUNT(*)::int AS c FROM (
        SELECT COALESCE(close_reason,'auto_expired') AS reason FROM requests
        WHERE close_reason IS NOT NULL OR status IN ('closed_auto','expired','cancelled')
      ) t GROUP BY reason ORDER BY c DESC`);
    const list = await pool.query(`SELECT r.id, r.title, COALESCE(r.close_reason,'auto_expired') AS close_reason, r.close_reason_note, r.closed_at, COALESCE(u.name,'عميل') AS client_name,
        (SELECT COUNT(*) FROM bids WHERE request_id=r.id)::int AS bid_count
      FROM requests r JOIN users u ON u.id=r.client_id WHERE r.close_reason IS NOT NULL OR r.status IN ('closed_auto','expired','cancelled') ORDER BY r.closed_at DESC NULLS LAST LIMIT 300`);
    res.json({ summary: agg.rows, list: list.rows });
  } catch(e){ console.error('close-reasons:', e.message); res.status(500).json({ message: 'تعذّر الجلب' }); }
});
app.post('/api/admin/requests/:id/close', requirePermission('requests.edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query("SELECT status FROM requests WHERE id=$1", [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'المشروع غير موجود' });
    const st = r.rows[0].status;
    if (['completed','in_progress','assigned'].includes(st)) return res.status(400).json({ message: 'لا يمكن إغلاق مشروع تمت ترسيته أو اكتمل' });
    await pool.query("UPDATE requests SET status='closed_auto', close_reason='admin_closed', closed_at=NOW() WHERE id=$1", [id]);
    res.json({ ok: true });
  } catch(e){ console.error('close req:', e.message); res.status(500).json({ message: 'تعذّر الإغلاق' }); }
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
    const id = parseInt(req.params.id); const { title, description, category, city, budget_max, deadline, admin_notes, agent_name, agent_phone, agent_pct } = req.body;
    const agentName = (agent_name && String(agent_name).trim()) ? String(agent_name).trim() : null;
    const agentPhone = (agent_phone && String(agent_phone).trim()) ? String(agent_phone).replace(/\D/g,'').replace(/^0/,'966') : null;
    let agentPct = (agent_pct === '' || agent_pct == null) ? null : parseFloat(agent_pct);
    if (agentPct != null && (!Number.isFinite(agentPct) || agentPct < 0 || agentPct > 100)) agentPct = null;
    // ربط/إنشاء سجل مندوب خفيف
    let agentId = null;
    if (agentName) {
      if (agentPct == null) agentPct = 1; // الافتراضي 1٪ من قيمة المشروع
      let ag = null;
      if (agentPhone) ag = (await pool.query('SELECT id FROM agents WHERE phone=$1 LIMIT 1', [agentPhone])).rows[0];
      if (!ag) ag = (await pool.query('SELECT id FROM agents WHERE name=$1 AND (phone IS NULL OR phone=$2) LIMIT 1', [agentName, agentPhone])).rows[0];
      if (ag) {
        agentId = ag.id;
        await pool.query('UPDATE agents SET name=$1, phone=COALESCE($2,phone), default_pct=$3 WHERE id=$4', [agentName, agentPhone, agentPct, agentId]);
      } else {
        const tok = crypto.randomBytes(8).toString('hex');
        agentId = (await pool.query('INSERT INTO agents (name, phone, token, default_pct) VALUES ($1,$2,$3,$4) RETURNING id', [agentName, agentPhone, tok, agentPct])).rows[0].id;
      }
    }
    let _closeClause='';
    const _cd=parseInt(req.body.close_days);
    if (req.body.close_days!==undefined && !isNaN(_cd)) {
      if (_cd>0) {
        _closeClause = ", close_at = created_at + '"+_cd+" days'::interval";
        const _st = await pool.query("SELECT status, assigned_provider_id FROM requests WHERE id=$1", [id]);
        if (_st.rows.length && ['closed_auto','expired'].includes(_st.rows[0].status) && !_st.rows[0].assigned_provider_id) { _closeClause += ", status='open'"; }
      } else { _closeClause = ', close_at = NULL'; }
    }
    const r = await pool.query(`UPDATE requests SET title=COALESCE(NULLIF($1,''),title),description=COALESCE(NULLIF($2,''),description),category=$3,city=$4,budget_max=$5,deadline=$6,admin_notes=$7,agent_name=$8,agent_pct=$9,agent_phone=$10,agent_id=$11${_closeClause} WHERE id=$12 RETURNING *`, [title||'', description||'', category||null, city||null, budget_max||null, deadline||null, admin_notes||null, agentName, agentPct, agentPhone, agentId, id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    await logAdmin(req, 'edit_request', 'request', id, 'تعديل مشروع: ' + (r.rows[0].title||''));
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

// ═══ رابط دخول العميل (سحري) لأي مشروع — يُرسل للعميل ليدخل بدون كلمة مرور (يشمل المشاريع القديمة) ═══
app.get('/api/admin/requests/:id/magic-link', requirePermission('requests.edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query('SELECT r.title, r.client_id, u.name AS client_name, u.phone AS client_phone FROM requests r JOIN users u ON r.client_id=u.id WHERE r.id=$1', [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'المشروع غير موجود' });
    const row = r.rows[0];
    const phoneNorm = String(row.client_phone || '').replace(/\D/g, '').replace(/^0/, '966');
    const magicTok = await getMagicToken(row.client_id);
    res.json({ ok: true, magic_link: SITE_URL + '/m/' + magicTok, phone_norm: phoneNorm, client_name: row.client_name, title: row.title });
  } catch(e) { console.error('admin magic-link:', e.message); res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' }); }
});

app.delete('/api/admin/requests/:id', requirePermission('requests.delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (!id) return res.status(400).json({ message: 'معرف غير صحيح' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM bids WHERE request_id=$1', [id]);
      await client.query('DELETE FROM messages WHERE request_id=$1', [id]);
      await client.query('DELETE FROM reviews WHERE request_id=$1', [id]);
      await client.query('UPDATE reports SET request_id=NULL WHERE request_id=$1', [id]);
      await client.query(`DELETE FROM notifications WHERE ref_id=$1 AND type='request'`, [id]);
      const del = await client.query('DELETE FROM requests WHERE id=$1', [id]);
      if (del.rowCount===0) { await client.query('ROLLBACK'); client.release(); return res.status(404).json({ message: 'غير موجود' }); }
      await client.query('COMMIT');
      client.release();
      await logAdmin(req, 'delete_request', 'request', id, 'حذف مشروع');
      res.json({ ok: true });
    } catch(e) { try { await client.query('ROLLBACK'); client.release(); } catch(_){} throw e; }
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
      pool.query("SELECT COUNT(*)::int c FROM reports WHERE status='pending'").catch(()=>({rows:[{c:0}]})),
      pool.query("SELECT COUNT(*)::int c FROM requests WHERE status='completed'").catch(()=>({rows:[{c:0}]})),
      pool.query("SELECT COUNT(*)::int c FROM bids").catch(()=>({rows:[{c:0}]})),
      pool.query("SELECT COUNT(*)::int c FROM leads").catch(()=>({rows:[{c:0}]})),
      pool.query("SELECT COUNT(*)::int c FROM messages").catch(()=>({rows:[{c:0}]}))
    ]);
    out.data = { users:d[0].rows[0].c, providers:d[1].rows[0].c, requests:d[2].rows[0].c, openRequests:d[3].rows[0].c, pendingReports:d[4].rows[0].c, completedRequests:d[5].rows[0].c, bids:d[6].rows[0].c, leads:d[7].rows[0].c, messages:d[8].rows[0].c };
  } catch(e){ out.data={}; }
  // التخزين والحجم
  try {
    const dbs = await pool.query("SELECT pg_database_size(current_database())::bigint b");
    const att = await pool.query("SELECT COUNT(*)::int c FROM requests WHERE attachments IS NOT NULL AND attachments::text NOT IN ('[]','null','')").catch(()=>({rows:[{c:0}]}));
    const img = await pool.query("SELECT COALESCE(SUM(COALESCE(array_length(images,1),0)),0)::int c FROM requests").catch(()=>({rows:[{c:0}]}));
    const r2b = await pool.query("SELECT value FROM platform_settings WHERE key='r2_bytes'").catch(()=>({rows:[]}));
    const dbMB = Math.round(Number(dbs.rows[0].b)/1048576*10)/10;
    const r2Bytes = r2b.rows.length ? (Number(r2b.rows[0].value)||0) : 0;
    const R2_CAP_MB = 10*1024, DB_CAP_MB = 1024; // مراجع قابلة للتعديل (R2 المجاني 10GB · حسب خطة Postgres)
    out.storage = {
      dbSizeMB: dbMB, dbCapMB: DB_CAP_MB, dbPct: Math.min(100, Math.round(dbMB/DB_CAP_MB*1000)/10),
      r2UsedMB: Math.round(r2Bytes/1048576*10)/10, r2CapMB: R2_CAP_MB, r2Pct: Math.min(100, Math.round(r2Bytes/(R2_CAP_MB*1048576)*1000)/10),
      projectsWithFiles: att.rows[0].c, imagesCount: img.rows[0].c, r2Configured: !!r2Client
    };
  } catch(e){ out.storage={}; }
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
// إحصائيات خصوصية السعر — تساعد على قرار: هل نجعل الإظهار العام هو الافتراضي؟

// ═══ المزوّدون بملفات ناقصة — تذكيرهم يرفع جودة المنصة ويزيد فرصهم ═══
app.get('/api/admin/incomplete-providers', requirePermission('users.view'), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id, name, phone, city, business_name, bio, specialties, profile_image,
             experience_years, created_at, last_seen_at,
             (SELECT COUNT(*) FROM bids WHERE provider_id=users.id)::int AS bids_count,
             (
               (CASE WHEN COALESCE(specialties,'{}')='{}' OR array_length(specialties,1) IS NULL THEN 0 ELSE 1 END) +
               (CASE WHEN COALESCE(bio,'')='' THEN 0 ELSE 1 END) +
               (CASE WHEN COALESCE(profile_image,'')='' THEN 0 ELSE 1 END) +
               (CASE WHEN COALESCE(business_name,'')='' THEN 0 ELSE 1 END) +
               (CASE WHEN COALESCE(city,'')='' THEN 0 ELSE 1 END)
             ) AS filled
      FROM users
      WHERE role='provider' AND is_active=TRUE
      ORDER BY filled ASC, created_at DESC
      LIMIT 200`);
    const rows = r.rows.map(u => {
      const missing = [];
      if (!u.specialties || !u.specialties.length) missing.push('التخصصات');
      if (!u.bio) missing.push('نبذة عن خبرتك');
      if (!u.profile_image) missing.push('صورة الملف');
      if (!u.business_name) missing.push('اسم النشاط');
      if (!u.city) missing.push('المدينة');
      return { ...u, missing, pct: Math.round((u.filled / 5) * 100) };
    }).filter(u => u.missing.length > 0);
    res.json({ total: rows.length, providers: rows });
  } catch(e) { console.error('incomplete-providers:', e.message); res.json({ total: 0, providers: [] }); }
});

// إرسال تذكير لمزوّد (إشعار داخل المنصة)
app.post('/api/admin/remind-provider/:id', requirePermission('users.edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const u = await pool.query("SELECT name, role FROM users WHERE id=$1 AND role='provider'", [id]);
    if (!u.rows.length) return res.status(404).json({ message: 'المزوّد غير موجود' });
    const missing = Array.isArray(req.body.missing) ? req.body.missing.slice(0,6).join('، ') : '';
    await notify(id, 'أكمل ملفك ليصلك عملاء 🎯',
      'ملفك الحالي ناقص' + (missing ? ` (${eEsc(missing)})` : '') +
      ' — المزوّدون بملف مكتمل يحصلون على عروض أكثر بكثير. أكمله الآن من «ملفي الشخصي».',
      'profile_incomplete', null);
    res.json({ ok: true });
  } catch(e) { console.error('remind-provider:', e.message); res.status(500).json({ message: 'تعذّر الإرسال' }); }
});

app.get('/api/admin/price-visibility', requirePermission('analytics.view'), async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT COALESCE(price_visibility,'client') AS vis,
             COUNT(*)::int AS n,
             COUNT(*) FILTER (WHERE status='accepted')::int AS accepted,
             ROUND(AVG(price)::numeric,0)::float AS avg_price
      FROM bids
      GROUP BY 1`);
    const rows = r.rows;
    const total = rows.reduce((a,x)=>a+x.n,0);
    const pub = rows.find(x=>x.vis==='public') || { n:0, accepted:0, avg_price:0 };
    const cli = rows.find(x=>x.vis==='client') || { n:0, accepted:0, avg_price:0 };
    // آخر 30 يوماً (لرصد تغيّر السلوك)
    const recent = await pool.query(`
      SELECT COALESCE(price_visibility,'client') AS vis, COUNT(*)::int AS n
      FROM bids WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY 1`);
    res.json({
      total,
      public: { count: pub.n, accepted: pub.accepted, avg_price: pub.avg_price, pct: total? Math.round(pub.n*100/total):0,
                win_rate: pub.n? Math.round(pub.accepted*100/pub.n):0 },
      client: { count: cli.n, accepted: cli.accepted, avg_price: cli.avg_price, pct: total? Math.round(cli.n*100/total):0,
                win_rate: cli.n? Math.round(cli.accepted*100/cli.n):0 },
      last30: recent.rows
    });
  } catch(e) { console.error('price-visibility:', e.message); res.json({ total:0 }); }
});

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
    const allowed = ['review_minutes','support_whatsapp'];
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
      if (action==='ban') { await pool.query(`UPDATE users SET is_active=FALSE WHERE id=$1 AND role!='admin'`,[reportedId]); _userState.delete(reportedId); await notify(reportedId,'تم إيقاف حسابك',`تم إيقاف حسابك${admin_note?': '+admin_note:''}`, 'system', null); }
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
app.get('/og/project/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query("SELECT title, category, city FROM requests WHERE id=$1", [id]);
    if (!r.rows.length) return res.status(404).end();
    const p = r.rows[0];
    const esc = s => String(s==null?'':s).replace(/[<>&]/g, c=>({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]));
    const words = String(p.title||'مشروع').slice(0,80).split(/\s+/);
    let l1='', l2='';
    words.forEach(function(w){ if(!l2 && (l1+' '+w).trim().length<=32) l1=(l1+' '+w).trim(); else l2=(l2+' '+w).trim(); });
    l2 = l2.slice(0,38);
    const cat = esc(p.category||'مشروع');
    const city = esc(p.city||'السعودية');
    const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#0D1829"/><stop offset="100%" style="stop-color:#16213E"/></linearGradient></defs><rect width="1200" height="630" fill="url(#bg)"/><rect x="0" y="620" width="1200" height="10" fill="#C9920A"/><text x="600" y="110" font-family="Arial" font-size="30" fill="rgba(255,255,255,0.4)" text-anchor="middle">مناقصة — منصة المشاريع والخدمات</text><rect x="410" y="150" width="380" height="56" rx="28" fill="rgba(201,146,10,0.18)" stroke="#C9920A" stroke-width="1.5"/><text x="600" y="188" font-family="Arial" font-size="30" fill="#C9920A" text-anchor="middle">${cat}</text><text x="600" y="315" font-family="Arial" font-size="58" font-weight="bold" fill="#ffffff" text-anchor="middle">${esc(l1)}</text>${l2?`<text x="600" y="388" font-family="Arial" font-size="58" font-weight="bold" fill="#ffffff" text-anchor="middle">${esc(l2)}</text>`:''}<text x="600" y="478" font-family="Arial" font-size="34" fill="rgba(255,255,255,0.7)" text-anchor="middle">${city}</text><text x="600" y="558" font-family="Arial" font-size="32" font-weight="bold" fill="#7dd3fc" text-anchor="middle">قدّم عرضك الآن</text><text x="600" y="598" font-family="Arial" font-size="20" fill="rgba(255,255,255,0.3)" text-anchor="middle">manaqasa.com</text></svg>`;
    res.header('Content-Type','image/svg+xml'); res.header('Cache-Control','public, max-age=3600'); res.send(svg);
  } catch(e) { res.status(500).end(); }
});

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
    xml+=`\n  <url><loc>${SITE_URL}/dalil</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    Object.keys(INTENT_PAGES).forEach(sl=>{ xml+=`\n  <url><loc>${SITE_URL}/${encodeURIComponent(sl)}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`; });
    SEO_CATS.forEach(cat=>SEO_CITIES.forEach(city=>{ xml+=`\n  <url><loc>${SITE_URL}/dalil/${seoSlug(cat)}/${seoSlug(city)}</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>`; }));
    for (const p of providers.rows) {
      const slug=encodeURIComponent((p.business_name||p.name||'مزود').replace(/\s+/g,'-'))+'-'+p.id;
      const lastmod=p.created_at?p.created_at.toISOString().split('T')[0]:now;
      xml+=`\n  <url><loc>${SITE_URL}/pro/${slug}</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${lastmod}</lastmod></url>`;
    }
    const requests=await pool.query(`SELECT r.id, r.title, r.created_at FROM requests r WHERE r.status='open' ORDER BY r.created_at DESC LIMIT 500`);
    for (const r of requests.rows) {
      const slug=encodeURIComponent((r.title||'مشروع').replace(/\s+/g,'-').substring(0,40))+'-'+r.id;
      const lastmod=r.created_at?r.created_at.toISOString().split('T')[0]:now;
      xml+=`\n  <url><loc>${SITE_URL}/project/${slug}</loc><changefreq>daily</changefreq><priority>0.8</priority><lastmod>${lastmod}</lastmod></url>`;
    }
    xml+='\n</urlset>';
    res.header('Content-Type','application/xml'); res.send(xml);
  } catch(e) { console.error('sitemap:', e.message); res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>'); }
});

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nAllow: /pro/\nAllow: /dalil\nDisallow: /dashboard-admin.html\nDisallow: /dashboard-client.html\nDisallow: /dashboard-provider.html\nSitemap: ${SITE_URL}/sitemap.xml`);
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

async function uploadToCloud(base64Data, folder='manaqasa', filename='') {
  if (!base64Data || !base64Data.startsWith('data:')) return base64Data;
  // تحقّق مركزي من النوع والحجم قبل أي رفع (يمنع الالتفاف عبر المسار البديل)
  const m = base64Data.match(/^data:([^;,]*);base64,(.+)$/);
  if (!m) return null;
  const ctype = String(m[1]).toLowerCase().trim();
  // مسموح: صورة/PDF عبر MIME، أو ملف فني/مكتبي عبر امتداد الاسم (تحميل فقط)
  const fe = String(filename||'').toLowerCase().match(/\.([a-z0-9]+)$/);
  const extAllowed = !!(fe && UPLOAD_EXT_TYPES[fe[1]]);
  if (!UPLOAD_TYPES[ctype] && !extAllowed) { console.warn('رفض رفع نوع غير مسموح:', ctype, filename||''); return null; }
  if (Buffer.byteLength(m[2], 'base64') > UPLOAD_MAX_BYTES) { console.warn('رفض رفع لحجم كبير'); return null; }
  // جرّب R2 أولاً (نمرّر الاسم ليحدّد الامتداد الصحيح للملفات الفنية)
  if (r2Client) {
    const url = await uploadToR2(base64Data, folder.replace('manaqasa/','').replace('manaqasa','img'), filename);
    if (url && url.startsWith('http')) {
      const _sz = Buffer.byteLength(m[2], 'base64');
      pool.query(`INSERT INTO platform_settings (key,value,updated_at) VALUES ('r2_bytes',$1::text,NOW()) ON CONFLICT (key) DO UPDATE SET value=(COALESCE(platform_settings.value,'0')::bigint + $1::bigint)::text, updated_at=NOW()`, [_sz]).catch(()=>{});
      console.log('✅ R2 upload:', url);
      return url;
    }
  }
  // fallback: Cloudinary (صور فقط) — لا ينطبق على PDF أو الملفات الفنية
  if (ctype === 'application/pdf' || extAllowed) return null;
  try {
    const result = await cloudinary.uploader.upload(base64Data, { folder, transformation: [{ quality: 'auto', fetch_format: 'auto' }], resource_type: 'image' });
    console.log('✅ Cloudinary upload:', result.secure_url);
    return result.secure_url;
  } catch(e) { console.error('upload error:', e.message); return null; }
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
  // مشاريع API ترجع JSON، الصفحات ترجع 404.html
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
