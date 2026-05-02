const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const webpush = require('web-push');

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
  .catch(err => console.error('❌ Database error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'manaqasa-secret-2024';
const SITE_URL   = process.env.SITE_URL   || 'https://manaqasati-production.up.railway.app';
const RESEND_KEY = process.env.RESEND_KEY || process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'cs@manaqasa.com';
const FROM_NAME  = process.env.FROM_NAME  || 'مناقصة';

// ═══════════════════════════════════════════════════════════════
// 🔔 WEB PUSH NOTIFICATIONS (VAPID)
// ═══════════════════════════════════════════════════════════════
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT     || 'mailto:cs@manaqasa.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log('✅ Web Push (VAPID) configured');
  } catch (e) {
    console.error('❌ VAPID setup error:', e.message);
  }
} else {
  console.warn('⚠️  VAPID keys not set — push notifications disabled');
}

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.static('.'));
app.use((req, res, next) => { console.log(`${req.method} ${req.path}`); next(); });

// ═══════════════════════════════════════════════════════════════
// HTML ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/',                       (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/dashboard-admin.html',   (req, res) => res.sendFile(__dirname + '/dashboard-admin.html'));
app.get('/dashboard-client.html',  (req, res) => res.sendFile(__dirname + '/dashboard-client.html'));
app.get('/dashboard-provider.html',(req, res) => res.sendFile(__dirname + '/dashboard-provider.html'));
app.get('/auth.html',              (req, res) => res.sendFile(__dirname + '/auth.html'));
app.get('/app.html',               (req, res) => res.sendFile(__dirname + '/app.html'));

// ═══════════════════════════════════════════════════════════════
// EMAIL (Resend)
// ═══════════════════════════════════════════════════════════════
async function sendEmail(to, subject, html) {
  if (!RESEND_KEY) { console.warn('⚠️  RESEND_KEY not set — skipping email to', to); return false; }
  if (!to) return false;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `${FROM_NAME} <${FROM_EMAIL}>`, to: [to], subject, html })
    });
    if (!r.ok) { console.error('❌ Resend error:', await r.text()); return false; }
    console.log(`📧 Email sent → ${to} — "${subject}"`);
    return true;
  } catch(e) { console.error('❌ sendEmail:', e.message); return false; }
}

function emailTpl(title, body, btnText, btnUrl) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Tahoma,Arial,sans-serif;direction:rtl">
  <div style="max-width:580px;margin:0 auto;padding:24px 16px">
    <div style="background:#16213E;border-radius:16px 16px 0 0;padding:32px 28px 24px;text-align:center">
      <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:8px">
        <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#C9920A;vertical-align:middle;margin-left:6px"></span>
        مناقصة
      </div>
      <div style="height:3px;background:#C9920A;margin-top:12px"></div>
    </div>
    <div style="background:#fff;padding:32px 28px 24px;border:1px solid #E6E2D9;border-top:none">
      <div style="font-size:17px;font-weight:700;color:#0F172A;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #E6E2D9">${title}</div>
      <div style="font-size:14px;color:#374151;line-height:2">${body}</div>
      ${btnText && btnUrl ? `<div style="text-align:center;margin:28px 0 8px"><a href="${btnUrl}" style="display:inline-block;background:#C9920A;color:#fff;padding:14px 40px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">${btnText}</a></div>` : ''}
    </div>
    <div style="background:#f4f7fb;border-radius:0 0 16px 16px;padding:18px 28px;text-align:center;border:1px solid #E6E2D9;border-top:none">
      <div style="font-size:11px;color:#94a3b8">© ${new Date().getFullYear()} منصة مناقصة — manaqasa.com</div>
    </div>
  </div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

// 🔔 Send Push Notification (Web + Native iOS/Android via Expo)
async function sendPush(userId, title, body, url, refType, refId) {
  try {
    // Get ALL push tokens for the user (web + ios + android)
    const r = await pool.query(
      `SELECT token, platform FROM push_tokens WHERE user_id=$1`,
      [userId]
    );
    if (!r.rows.length) return;

    // 🆕 Calculate smart badge: count unread notifications + unread messages
    let badgeCount = 1;
    try {
      const badgeRes = await pool.query(`
        SELECT
          (SELECT COUNT(*)::int FROM notifications WHERE user_id=$1 AND is_read=false) +
          (SELECT COUNT(*)::int FROM messages
           WHERE receiver_id=$1 AND (is_read=false OR is_read IS NULL))
          AS total
      `, [userId]);
      const total = badgeRes.rows[0]?.total;
      if (typeof total === 'number' && total > 0) {
        badgeCount = total;
      }
    } catch(e) {
      console.error('badge count error:', e.message);
    }

    const webPayload = JSON.stringify({
      title: title || 'مناقصة',
      body: body || '',
      url: url || '/',
      type: refType || 'general',
      ref_id: refId || null,
      tag: `${refType || 'general'}-${refId || Date.now()}`,
      badge: badgeCount
    });

    // Collect Expo (native) tokens for batch send
    const expoMessages = [];

    for (const row of r.rows) {
      const platform = row.platform || 'web';

      // ─── Web Push (browsers) ──────────────────────────
      if (platform === 'web') {
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) continue;
        let subscription;
        try { subscription = JSON.parse(row.token); }
        catch (e) { continue; }

        try {
          await webpush.sendNotification(subscription, webPayload);
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            try {
              await pool.query(
                'DELETE FROM push_tokens WHERE user_id=$1 AND token=$2',
                [userId, row.token]
              );
            } catch(e) {}
          } else {
            console.error('❌ sendPush web error:', err.statusCode, err.message);
          }
        }
      }
      // ─── Native Push (iOS/Android via Expo) ───────────
      else if (platform === 'ios' || platform === 'android' || platform === 'expo') {
        // Expo Push tokens look like: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
        if (row.token && row.token.startsWith('ExponentPushToken')) {
          expoMessages.push({
            to: row.token,
            sound: 'default',
            title: title || 'مناقصة',
            body: body || '',
            data: {
              url: url || '/',
              type: refType || 'general',
              ref_id: refId || null
            },
            badge: badgeCount,
            priority: 'high',
            channelId: 'default'
          });
        }
      }
    }

    // ─── Send all native pushes to Expo Push API in one batch ───
    if (expoMessages.length > 0) {
      try {
        const expoResp = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expoMessages)
        });
        const expoResult = await expoResp.json();

        // Handle errors per ticket — remove invalid tokens
        if (expoResult && expoResult.data && Array.isArray(expoResult.data)) {
          for (let i = 0; i < expoResult.data.length; i++) {
            const ticket = expoResult.data[i];
            if (ticket.status === 'error') {
              const errCode = ticket.details && ticket.details.error;
              // DeviceNotRegistered = token invalid → remove from DB
              if (errCode === 'DeviceNotRegistered') {
                const badToken = expoMessages[i].to;
                try {
                  await pool.query(
                    'DELETE FROM push_tokens WHERE user_id=$1 AND token=$2',
                    [userId, badToken]
                  );
                  console.log(`🗑️  Removed invalid Expo token for user ${userId}`);
                } catch(e) {}
              } else {
                console.error('❌ Expo push error:', errCode, ticket.message);
              }
            }
          }
        }
      } catch (expoErr) {
        console.error('❌ Expo push API error:', expoErr.message);
      }
    }
  } catch (e) {
    console.error('❌ sendPush helper error:', e.message);
  }
}

async function notify(userId, title, body, type, refId) {
  try {
    await pool.query(
      'INSERT INTO notifications(user_id,title,body,type,ref_id) VALUES($1,$2,$3,$4,$5)',
      [userId, title, body, type, refId]
    );
    // 🔔 Also send push notification (silent, async)
    const url = (() => {
      if (!type) return '/';
      if (type === 'message') return '/dashboard-client.html#messages';
      if (type === 'bid' || type === 'bid_accepted' || type === 'bid_rejected') return '/dashboard-provider.html#bids';
      if (type === 'new_request') return '/dashboard-provider.html';
      if (type === 'request' || type === 'request_published') return '/dashboard-client.html';
      if (type === 'review') return '/';
      return '/';
    })();
    sendPush(userId, title, body, url, type, refId).catch(() => {});
  } catch (e) { console.error('Notification error:', e); }
}

// 🆕 Notify with email - sends both in-app notification AND email
async function notifyWithEmail(userId, title, body, type, refId, emailSubject, emailBody, btnText, btnUrl) {
  // In-app notification
  await notify(userId, title, body, type, refId);

  // Email notification
  try {
    const u = await pool.query('SELECT email, name FROM users WHERE id=$1', [userId]);
    if (u.rows.length && u.rows[0].email) {
      const email = u.rows[0].email;
      const userName = u.rows[0].name || '';
      const personalizedBody = emailBody.replace(/\{name\}/g, userName);
      sendEmail(
        email,
        emailSubject || title,
        emailTpl(title, personalizedBody, btnText, btnUrl || SITE_URL)
      ).catch(() => {});
    }
  } catch (e) { console.error('❌ notifyWithEmail email part:', e.message); }
}

function normalizeStatus(s) { return s === 'review' ? 'pending_review' : s; }

function generateProjectNumber() {
  const d = new Date();
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dy = String(d.getDate()).padStart(2,'0');
  const rand = Math.floor(Math.random()*9999).toString().padStart(4,'0');
  return `MNQ-${y}${m}${dy}-${rand}`;
}

// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
function auth(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'جلسة منتهية' }); }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'للمدير فقط' });
  next();
}
function clientOnly(req, res, next) {
  if (req.user.role !== 'client') return res.status(403).json({ message: 'للعملاء فقط' });
  next();
}
function providerOnly(req, res, next) {
  if (req.user.role !== 'provider') return res.status(403).json({ message: 'لمزودي الخدمة فقط' });
  next();
}

// ═══════════════════════════════════════════════════════════════
// DATABASE SETUP
// ═══════════════════════════════════════════════════════════════
async function setupDatabase() {
  console.log('🔄 Setting up database...');
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255), password_hash VARCHAR(255),
      phone VARCHAR(20),
      role VARCHAR(20) NOT NULL CHECK (role IN ('client','provider','admin')),
      specialties TEXT[], notify_categories TEXT[],
      bio TEXT, city VARCHAR(100),
      badge VARCHAR(50) DEFAULT 'none',
      is_active BOOLEAN DEFAULT TRUE,
      experience_years INTEGER,
      portfolio_images TEXT[], profile_image TEXT,
      report_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES users(id),
      title VARCHAR(255) NOT NULL, description TEXT NOT NULL,
      category VARCHAR(100), city VARCHAR(100), address TEXT,
      budget_max DECIMAL(10,2), deadline DATE,
      image_url TEXT, images TEXT[], attachments JSONB,
      main_image_index INTEGER DEFAULT 0,
      project_number VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending_review',
      assigned_provider_id INTEGER REFERENCES users(id),
      assigned_at TIMESTAMP, completed_at TIMESTAMP,
      admin_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES users(id),
      price INTEGER NOT NULL, days INTEGER NOT NULL, note TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(request_id, provider_id)
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id),
      receiver_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES requests(id),
      reviewer_id INTEGER REFERENCES users(id),
      reviewed_id INTEGER REFERENCES users(id),
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      comment TEXT, type VARCHAR(30),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(request_id, reviewer_id)
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255), body TEXT, type VARCHAR(50), ref_id INTEGER,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      reporter_id INTEGER REFERENCES users(id),
      reported_id INTEGER REFERENCES users(id),
      request_id INTEGER REFERENCES requests(id),
      type VARCHAR(50) NOT NULL, reason VARCHAR(255) NOT NULL, details TEXT,
      status VARCHAR(20) DEFAULT 'pending', admin_note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, provider_id)
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS push_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL, platform VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, token)
    )`);
    try { await pool.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS social_whatsapp VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS social_snap VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS social_tiktok VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS social_instagram VARCHAR(100)'); } catch(e){}
    try { await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS social_twitter VARCHAR(100)'); } catch(e){}
    try {
      await pool.query(`DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'bids_request_id_provider_id_key'
          ) THEN
            ALTER TABLE bids ADD CONSTRAINT bids_request_id_provider_id_key UNIQUE (request_id, provider_id);
          END IF;
        END$$;`);
    } catch(e){ console.error('⚠️  bids unique constraint:', e.message); }
    try {
      await pool.query(`DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'reviews_request_id_reviewer_id_key'
          ) THEN
            ALTER TABLE reviews ADD CONSTRAINT reviews_request_id_reviewer_id_key UNIQUE (request_id, reviewer_id);
          END IF;
        END$$;`);
    } catch(e){ console.error('⚠️  reviews unique constraint:', e.message); }
    console.log('✅ Database setup complete');
  } catch (error) { console.error('❌ Database setup error:', error); }
}
setupDatabase();

// ═══════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════

app.post('/api/auth/login', async (req, res) => {
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
    delete user.password; delete user.password_hash;
    res.json({ user, token });
  } catch (e) { console.error('❌ Login:', e); res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, specialties, city, bio } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ message: 'البيانات ناقصة' });
    if (!['client', 'provider'].includes(role)) return res.status(400).json({ message: 'نوع المستخدم غير صحيح' });
    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(400).json({ message: 'الإيميل مستخدم مسبقاً' });
    const hash = await bcrypt.hash(password, 10);
    const specs = role === 'provider'
      ? (Array.isArray(specialties) ? specialties : (specialties ? [specialties] : null)) : null;
    const result = await pool.query(`
      INSERT INTO users (name, email, phone, password, password_hash, role, specialties, city, bio, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
      RETURNING id, name, email, role, city, badge
    `, [name, email, phone || null, hash, hash, role, specs, city || null, bio || null]);
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    // 🆕 Welcome email + in-app notification
    try {
      const isProvider = role === 'provider';
      const welcomeTitle = `🎉 أهلاً بك في منصة مناقصة، ${name}!`;
      const welcomeBody = isProvider
        ? `<p>عزيزي <strong>${name}</strong>،</p>
           <p>أهلاً وسهلاً بك في منصة <strong>مناقصة</strong> — منصة المشاريع والخدمات الأولى في المملكة العربية السعودية.</p>
           <p>نحن سعداء بانضمامك كمزود خدمة. الآن يمكنك:</p>
           <ul style="line-height:2.2;color:#374151">
             <li>📋 تصفح المشاريع المتاحة في تخصصاتك</li>
             <li>💼 تقديم عروضك للعملاء</li>
             <li>💬 التواصل المباشر مع العملاء</li>
             <li>⭐ بناء سمعتك من خلال التقييمات</li>
             <li>📸 إضافة معرض أعمالك لجذب المزيد من العملاء</li>
           </ul>
           <p>💡 <strong>نصيحة:</strong> أكمل ملفك الشخصي وأضف صور أعمالك لتزيد فرص قبول عروضك.</p>
           <p>إذا احتجت أي مساعدة، تواصل معنا على: <a href="mailto:cs@manaqasa.com" style="color:#C9920A">cs@manaqasa.com</a></p>`
        : `<p>عزيزي <strong>${name}</strong>،</p>
           <p>أهلاً وسهلاً بك في منصة <strong>مناقصة</strong> — منصة المشاريع والخدمات الأولى في المملكة العربية السعودية.</p>
           <p>نحن سعداء بانضمامك. الآن يمكنك:</p>
           <ul style="line-height:2.2;color:#374151">
             <li>📝 نشر مشاريعك واحتياجاتك</li>
             <li>💰 استقبال عروض من أفضل المزودين</li>
             <li>⭐ اختيار المزود المناسب من تقييمات حقيقية</li>
             <li>💬 التواصل المباشر مع المزودين</li>
             <li>🛡️ حماية كاملة لبياناتك</li>
           </ul>
           <p>💡 <strong>نصيحة:</strong> اكتب تفاصيل واضحة في طلباتك للحصول على أفضل العروض.</p>
           <p>إذا احتجت أي مساعدة، تواصل معنا على: <a href="mailto:cs@manaqasa.com" style="color:#C9920A">cs@manaqasa.com</a></p>`;

      await notify(user.id, '🎉 أهلاً بك في مناقصة', `مرحباً ${name}! نحن سعداء بانضمامك إلينا.`, 'welcome', null);

      if (email) {
        sendEmail(
          email,
          welcomeTitle,
          emailTpl(welcomeTitle, welcomeBody,
            isProvider ? 'استكشف المشاريع المتاحة' : 'انشر طلبك الأول',
            SITE_URL + (isProvider ? '/dashboard-provider.html' : '/dashboard-client.html'))
        ).catch(() => {});
      }
    } catch (we) { console.error('⚠️ welcome notification:', we.message); }

    res.json({ user, token });
  } catch (e) { console.error('❌ Register:', e); res.status(500).json({ message: e.message }); }
});

app.get('/api/direct-admin', async (req, res) => {
  try {
    const { secret, email, password } = req.query;
    if (secret !== 'manaqasa2024') return res.status(403).json({ message: 'كلمة سر خاطئة' });
    if (!email || !password)        return res.status(400).json({ message: 'الإيميل وكلمة المرور مطلوبة' });
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(`
      INSERT INTO users (name, email, password, password_hash, role, is_active, created_at)
      VALUES ('المدير', $1, $2, $3, 'admin', true, NOW())
      ON CONFLICT (email) DO UPDATE SET password=$2, password_hash=$3, role='admin', is_active=true
      RETURNING id, name, email, role
    `, [email, hash, hash]);
    res.json({ ok: true, user: result.rows[0] });
  } catch (e) { res.status(500).json({ message: e.message }); }
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

    // 🆕 Send password change notification
    try {
      const u = r.rows[0];
      if (u.email) {
        const title = '🔐 تم تغيير كلمة المرور';
        const body = `<p>عزيزي <strong>${u.name}</strong>،</p>
                      <p>تم تغيير كلمة المرور الخاصة بحسابك في منصة مناقصة بنجاح.</p>
                      <p>إذا لم تقم بهذا الإجراء، يرجى التواصل معنا فوراً على:
                         <a href="mailto:cs@manaqasa.com" style="color:#C9920A">cs@manaqasa.com</a></p>
                      <p>وقت التغيير: ${new Date().toLocaleString('ar-SA')}</p>`;
        sendEmail(u.email, title, emailTpl(title, body, null, null)).catch(() => {});
      }
    } catch(e) {}

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// 🆕 ACCOUNT DELETION (Apple Guideline 5.1.1(v))
// ═══════════════════════════════════════════════════════════════

app.get('/api/account/deletion-preview', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const stats = {};

    if (role === 'client') {
      const r1 = await pool.query('SELECT COUNT(*)::int as c FROM requests WHERE client_id=$1', [userId]);
      stats.projects = r1.rows[0].c;
    }
    if (role === 'provider') {
      const r2 = await pool.query('SELECT COUNT(*)::int as c FROM bids WHERE provider_id=$1', [userId]);
      stats.bids = r2.rows[0].c;
      const r3 = await pool.query(
        `SELECT COUNT(*)::int as c FROM requests WHERE assigned_provider_id=$1 AND status='in_progress'`,
        [userId]
      );
      stats.active_projects = r3.rows[0].c;
    }
    const r4 = await pool.query('SELECT COUNT(*)::int as c FROM messages WHERE sender_id=$1 OR receiver_id=$1', [userId]);
    stats.messages = r4.rows[0].c;
    const r5 = await pool.query('SELECT COUNT(*)::int as c FROM reviews WHERE reviewer_id=$1 OR reviewed_id=$1', [userId]);
    stats.reviews = r5.rows[0].c;
    const r6 = await pool.query('SELECT COUNT(*)::int as c FROM notifications WHERE user_id=$1', [userId]);
    stats.notifications = r6.rows[0].c;

    res.json({ ok: true, stats, warning: 'سيتم حذف جميع بياناتك نهائياً ولا يمكن استعادتها.' });
  } catch (e) {
    console.error('❌ deletion-preview:', e);
    res.status(500).json({ message: e.message });
  }
});

app.delete('/api/account/delete', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { confirmation } = req.body;

    if (confirmation !== 'حذف' && confirmation !== 'DELETE') {
      return res.status(400).json({
        message: 'يجب كتابة "حذف" أو "DELETE" للتأكيد',
        code: 'CONFIRMATION_REQUIRED'
      });
    }

    if (role === 'admin') {
      return res.status(403).json({ message: 'لا يمكن حذف حسابات الإدارة من التطبيق' });
    }

    if (role === 'provider') {
      const active = await pool.query(
        `SELECT COUNT(*)::int as c FROM requests WHERE assigned_provider_id=$1 AND status='in_progress'`,
        [userId]
      );
      if (active.rows[0].c > 0) {
        return res.status(400).json({
          message: `لديك ${active.rows[0].c} مشروع قيد التنفيذ. يجب إكمالها أو إلغاء التعيين أولاً.`,
          code: 'ACTIVE_PROJECTS'
        });
      }
    }

    const userInfo = await pool.query('SELECT id, name, email FROM users WHERE id=$1', [userId]);
    if (!userInfo.rows.length) return res.status(404).json({ message: 'الحساب غير موجود' });
    const userName = userInfo.rows[0].name;
    const userEmail = userInfo.rows[0].email;

    await pool.query('BEGIN');
    try {
      if (role === 'provider') {
        await pool.query('DELETE FROM bids WHERE provider_id=$1', [userId]);
      }
      await pool.query('DELETE FROM reviews WHERE reviewer_id=$1 OR reviewed_id=$1', [userId]);
      await pool.query('DELETE FROM notifications WHERE user_id=$1', [userId]);
      await pool.query('DELETE FROM messages WHERE sender_id=$1 OR receiver_id=$1', [userId]);
      await pool.query('DELETE FROM reports WHERE reporter_id=$1 OR reported_id=$1', [userId]);
      try { await pool.query('DELETE FROM favorites WHERE user_id=$1 OR provider_id=$1', [userId]); } catch(e){}
      try { await pool.query('DELETE FROM push_tokens WHERE user_id=$1', [userId]); } catch(e){}

      if (role === 'client') {
        const projs = await pool.query('SELECT id FROM requests WHERE client_id=$1', [userId]);
        for (const p of projs.rows) {
          await pool.query('DELETE FROM bids WHERE request_id=$1', [p.id]);
        }
        await pool.query('DELETE FROM requests WHERE client_id=$1', [userId]);
      }
      if (role === 'provider') {
        await pool.query('UPDATE requests SET assigned_provider_id=NULL WHERE assigned_provider_id=$1', [userId]);
      }

      const del = await pool.query('DELETE FROM users WHERE id=$1', [userId]);
      if (del.rowCount === 0) throw new Error('فشل حذف الحساب');

      await pool.query('COMMIT');

      console.log(`🗑️  Account deleted: ${userName} (${userEmail}) [id=${userId}, role=${role}]`);

      if (userEmail && RESEND_KEY) {
        const html = emailTpl(
          'تم حذف حسابك',
          `<p>عزيزي ${userName}،</p>
           <p>تم حذف حسابك من منصة مناقصة بنجاح بناءً على طلبك.</p>
           <p>تم حذف جميع بياناتك ومشاريعك ورسائلك نهائياً.</p>
           <p>إذا كنت لم تقم بهذا الإجراء، يرجى التواصل مع الدعم فوراً عبر:
              <a href="mailto:cs@manaqasa.com">cs@manaqasa.com</a></p>
           <p>شكراً لاستخدامك منصة مناقصة، ونتمنى لك التوفيق.</p>`,
          null, null
        );
        sendEmail(userEmail, 'تم حذف حسابك من منصة مناقصة', html).catch(() => {});
      }

      res.json({ ok: true, message: 'تم حذف حسابك بنجاح. شكراً لاستخدامك منصة مناقصة.' });
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error('❌ account delete transaction:', e);
      throw e;
    }
  } catch (e) {
    console.error('❌ DELETE /api/account/delete:', e);
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROFILES
// ═══════════════════════════════════════════════════════════════

app.get('/api/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id,name,email,phone,role,specialties,notify_categories,bio,city,badge,is_active,
       experience_years,portfolio_images,profile_image,created_at FROM users WHERE id=$1`,
      [req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/profile', auth, async (req, res) => {
  try {
    const allowed = {
      name: 'name', phone: 'phone', city: 'city', bio: 'bio',
      specialties: 'specialties', notify_categories: 'notify_categories',
      experience_years: 'experience_years', profile_image: 'profile_image'
    };
    const sets = [];
    const params = [];
    let idx = 1;
    for (const key in allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        const col = allowed[key];
        let val = req.body[key];
        if (key === 'name') {
          if (val && String(val).trim()) {
            sets.push(`${col}=$${idx}`);
            params.push(String(val).trim());
            idx++;
          }
          continue;
        }
        if (key === 'experience_years') {
          val = (val === '' || val === null || val === undefined) ? null : parseInt(val);
          if (isNaN(val)) val = null;
        }
        if (val === '') val = null;
        sets.push(`${col}=$${idx}`);
        params.push(val);
        idx++;
      }
    }
    if (!sets.length) {
      const cur = await pool.query(
        `SELECT id,name,email,phone,role,specialties,notify_categories,bio,city,badge,experience_years,profile_image FROM users WHERE id=$1`,
        [req.user.id]
      );
      return res.json(cur.rows[0] || {});
    }
    params.push(req.user.id);
    const q = `UPDATE users SET ${sets.join(', ')} WHERE id=$${idx}
      RETURNING id,name,email,phone,role,specialties,notify_categories,bio,city,badge,experience_years,profile_image`;
    const r = await pool.query(q, params);
    res.json(r.rows[0]);
  } catch (e) { console.error('❌ /profile PUT:', e); res.status(500).json({ message: e.message }); }
});

app.get('/api/client/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id,name,email,phone,city,bio,badge,profile_image,created_at,
       (SELECT COUNT(*) FROM requests WHERE client_id=users.id) as total_requests,
       (SELECT COUNT(*) FROM requests WHERE client_id=users.id AND status='completed') as completed_requests,
       (SELECT COUNT(*) FROM requests WHERE client_id=users.id AND status='in_progress') as active_requests
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/client/profile', auth, async (req, res) => {
  try {
    // 🆕 Email change with uniqueness check
    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      const newEmail = String(req.body.email || '').trim().toLowerCase();
      if (!newEmail || !newEmail.includes('@') || !newEmail.includes('.')) {
        return res.status(400).json({ message: 'بريد إلكتروني غير صحيح' });
      }
      // Check if email is taken by ANOTHER user
      const dup = await pool.query(
        'SELECT id FROM users WHERE LOWER(email)=$1 AND id<>$2',
        [newEmail, req.user.id]
      );
      if (dup.rows.length) {
        return res.status(400).json({ message: 'هذا البريد الإلكتروني مستخدم لحساب آخر' });
      }
    }
    const allowed = {
      name: 'name', phone: 'phone', email: 'email', city: 'city', bio: 'bio', profile_image: 'profile_image'
    };
    const sets = [];
    const params = [];
    let idx = 1;
    for (const key in allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        const col = allowed[key];
        let val = req.body[key];
        if (key === 'name') {
          if (val && String(val).trim()) {
            sets.push(`${col}=$${idx}`);
            params.push(String(val).trim());
            idx++;
          }
          continue;
        }
        if (key === 'email') {
          val = String(val || '').trim().toLowerCase();
        }
        if (val === '') val = null;
        sets.push(`${col}=$${idx}`);
        params.push(val);
        idx++;
      }
    }
    if (!sets.length) {
      const cur = await pool.query(
        `SELECT id,name,email,phone,city,bio,profile_image FROM users WHERE id=$1`,
        [req.user.id]
      );
      return res.json(cur.rows[0] || {});
    }
    params.push(req.user.id);
    const q = `UPDATE users SET ${sets.join(', ')} WHERE id=$${idx}
      RETURNING id,name,email,phone,city,bio,profile_image`;
    const r = await pool.query(q, params);
    res.json(r.rows[0]);
  } catch (e) {
    console.error('❌ client/profile PUT:', e);
    if (e.code === '23505') return res.status(400).json({ message: 'هذا البريد الإلكتروني مستخدم لحساب آخر' });
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/provider/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id,name,email,phone,city,bio,badge,specialties,notify_categories,
       experience_years,portfolio_images,profile_image,business_name,
       social_whatsapp,social_snap,social_tiktok,social_instagram,social_twitter,created_at,
       COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
       COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
       (SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as total_bids,
       (SELECT COUNT(*) FROM bids WHERE provider_id=users.id AND status='accepted') as accepted_bids,
       (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
       FROM users WHERE id=$1`,
      [req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/provider/:id/profile', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(
      `SELECT id,name,phone,city,bio,badge,specialties,
       experience_years,portfolio_images,profile_image,business_name,
       social_whatsapp,social_snap,social_tiktok,social_instagram,social_twitter,created_at,
       COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
       COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
       (SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as total_bids,
       (SELECT COUNT(*) FROM bids WHERE provider_id=users.id AND status='accepted') as accepted_bids,
       (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
       FROM users WHERE id=$1 AND role='provider'`,
      [id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'المزود غير موجود' });
    res.json(r.rows[0]);
  } catch (e) { console.error('❌ /api/provider/:id/profile:', e); res.status(500).json({ message: e.message }); }
});

app.get('/api/ratings/provider/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const agg = await pool.query(
      `SELECT COALESCE(AVG(rating),0)::float as average, COUNT(*)::int as count
       FROM reviews WHERE reviewed_id=$1`,
      [id]
    );
    const rv = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at,
              u.name as reviewer_name, u.profile_image as reviewer_image,
              rq.title as request_title
       FROM reviews r
       JOIN users u ON u.id=r.reviewer_id
       LEFT JOIN requests rq ON rq.id=r.request_id
       WHERE r.reviewed_id=$1
       ORDER BY r.created_at DESC LIMIT 20`,
      [id]
    );
    res.json({
      average: parseFloat(agg.rows[0].average) || 0,
      count: agg.rows[0].count || 0,
      reviews: rv.rows
    });
  } catch (e) { console.error('❌ /api/ratings/provider/:id:', e); res.json({ average: 0, count: 0, reviews: [] }); }
});

app.put('/api/provider/profile', auth, async (req, res) => {
  try {
    // 🆕 Email change with uniqueness check
    if (Object.prototype.hasOwnProperty.call(req.body, 'email')) {
      const newEmail = String(req.body.email || '').trim().toLowerCase();
      if (!newEmail || !newEmail.includes('@') || !newEmail.includes('.')) {
        return res.status(400).json({ message: 'بريد إلكتروني غير صحيح' });
      }
      const dup = await pool.query(
        'SELECT id FROM users WHERE LOWER(email)=$1 AND id<>$2',
        [newEmail, req.user.id]
      );
      if (dup.rows.length) {
        return res.status(400).json({ message: 'هذا البريد الإلكتروني مستخدم لحساب آخر' });
      }
    }
    const allowed = {
      name: 'name', phone: 'phone', email: 'email', city: 'city', bio: 'bio',
      specialties: 'specialties', notify_categories: 'notify_categories',
      experience_years: 'experience_years', portfolio_images: 'portfolio_images',
      profile_image: 'profile_image', business_name: 'business_name',
      social_whatsapp: 'social_whatsapp', social_snap: 'social_snap',
      social_tiktok: 'social_tiktok', social_instagram: 'social_instagram',
      social_twitter: 'social_twitter'
    };
    const sets = [];
    const params = [];
    let idx = 1;
    for (const key in allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        const col = allowed[key];
        let val = req.body[key];
        if (key === 'name') {
          if (val && String(val).trim()) {
            sets.push(`${col}=$${idx}`);
            params.push(String(val).trim());
            idx++;
          }
          continue;
        }
        if (key === 'email') {
          val = String(val || '').trim().toLowerCase();
        }
        if (key === 'experience_years') {
          val = (val === '' || val === null || val === undefined) ? null : parseInt(val);
          if (isNaN(val)) val = null;
        }
        if (val === '') val = null;
        sets.push(`${col}=$${idx}`);
        params.push(val);
        idx++;
      }
    }
    if (!sets.length) {
      const cur = await pool.query(
        `SELECT id,name,email,phone,city,bio,specialties,notify_categories,experience_years,portfolio_images,profile_image,business_name,social_whatsapp,social_snap,social_tiktok,social_instagram,social_twitter FROM users WHERE id=$1`,
        [req.user.id]
      );
      return res.json(cur.rows[0] || {});
    }
    params.push(req.user.id);
    const q = `UPDATE users SET ${sets.join(', ')} WHERE id=$${idx}
      RETURNING id,name,email,phone,city,bio,specialties,notify_categories,experience_years,portfolio_images,profile_image,business_name,social_whatsapp,social_snap,social_tiktok,social_instagram,social_twitter`;
    const r = await pool.query(q, params);
    res.json(r.rows[0]);
  } catch (e) {
    console.error('❌ provider/profile PUT:', e);
    if (e.code === '23505') return res.status(400).json({ message: 'هذا البريد الإلكتروني مستخدم لحساب آخر' });
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PROVIDER-SPECIFIC ENDPOINTS
// ═══════════════════════════════════════════════════════════════

app.get('/api/provider/bids', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT b.id, b.request_id, b.price, b.days, b.note, b.status, b.created_at,
        r.title as request_title, r.category, r.city, r.client_id,
        u.name as client_name, u.phone as client_phone
      FROM bids b
      JOIN requests r ON b.request_id = r.id
      JOIN users u ON r.client_id = u.id
      WHERE b.provider_id = $1
      ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json(r.rows);
  } catch (e) { console.error('❌ /provider/bids:', e); res.json([]); }
});

app.get('/api/provider/projects', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.id, r.title, r.description, r.category, r.city, r.budget_max,
        r.image_url, r.images, r.project_number, r.status, r.assigned_at,
        r.completed_at, r.client_id,
        u.name as client_name, u.phone as client_phone,
        b.price, b.days
      FROM requests r
      JOIN users u ON r.client_id = u.id
      LEFT JOIN bids b ON b.request_id = r.id AND b.provider_id = $1 AND b.status = 'accepted'
      WHERE r.assigned_provider_id = $1
        AND r.status IN ('in_progress','completed')
      ORDER BY r.assigned_at DESC NULLS LAST
    `, [req.user.id]);
    res.json(r.rows);
  } catch (e) { console.error('❌ /provider/projects:', e); res.json([]); }
});

app.get('/api/provider/reviews', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.id, rv.rating, rv.comment, rv.created_at, rv.reviewer_id, rv.request_id,
        u.name as reviewer_name, u.profile_image as reviewer_image
      FROM reviews rv
      JOIN users u ON rv.reviewer_id = u.id
      WHERE rv.reviewed_id = $1
      ORDER BY rv.created_at DESC
    `, [req.user.id]);
    res.json(r.rows);
  } catch (e) { console.error('❌ /provider/reviews:', e); res.json([]); }
});

app.get('/api/provider/conversations', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      WITH conv AS (
        SELECT DISTINCT
          request_id,
          CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END as client_id
        FROM messages
        WHERE sender_id = $1 OR receiver_id = $1
      )
      SELECT
        c.request_id,
        c.client_id,
        r.title as request_title,
        u.name as client_name,
        u.profile_image as client_image,
        (SELECT content FROM messages WHERE request_id = c.request_id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT MAX(created_at) FROM messages WHERE request_id = c.request_id) as last_time,
        (SELECT COUNT(*) FROM messages WHERE request_id = c.request_id AND receiver_id = $1 AND is_read = FALSE) as unread
      FROM conv c
      JOIN requests r ON r.id = c.request_id
      JOIN users u ON u.id = c.client_id
      ORDER BY last_time DESC NULLS LAST
    `, [req.user.id]);
    res.json(r.rows);
  } catch (e) { console.error('❌ /provider/conversations:', e); res.json([]); }
});

app.get('/api/client/conversations', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      WITH conv AS (
        SELECT DISTINCT
          m.request_id,
          CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as provider_id
        FROM messages m
        JOIN requests r ON r.id = m.request_id
        WHERE (m.sender_id = $1 OR m.receiver_id = $1) AND r.client_id = $1
      )
      SELECT
        c.request_id,
        c.provider_id,
        r.title as request_title,
        u.name as provider_name,
        u.profile_image as provider_image,
        u.phone as provider_phone,
        (SELECT content FROM messages WHERE request_id = c.request_id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT MAX(created_at) FROM messages WHERE request_id = c.request_id) as last_time,
        (SELECT COUNT(*) FROM messages WHERE request_id = c.request_id AND receiver_id = $1 AND is_read = FALSE) as unread
      FROM conv c
      JOIN requests r ON r.id = c.request_id
      JOIN users u ON u.id = c.provider_id
      ORDER BY last_time DESC NULLS LAST
    `, [req.user.id]);
    res.json(r.rows);
  } catch (e) { console.error('❌ /client/conversations:', e); res.json([]); }
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
  } catch (e) { console.error('❌ portfolio POST:', e); res.status(500).json({ message: e.message }); }
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
  } catch (e) { console.error('❌ portfolio DELETE:', e); res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// REQUESTS
// ═══════════════════════════════════════════════════════════════

app.get('/api/requests', async (req, res) => {
  try {
    const { category, city } = req.query;
    let query = `
      SELECT r.id,r.project_number,r.title,r.description,r.category,r.city,
      r.budget_max,r.deadline,r.image_url,r.images,r.main_image_index,r.status,
      r.client_id,r.created_at,u.name as client_name,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id WHERE r.status='open'
    `;
    const params = [];
    if (category) { params.push(category); query += ` AND r.category=$${params.length}`; }
    if (city)     { params.push(`%${city}%`); query += ` AND r.city ILIKE $${params.length}`; }
    query += ' ORDER BY r.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (e) { console.error('❌ /requests:', e); res.json([]); }
});

app.get('/api/requests/my', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*, u.name as client_name, p.name as provider_name,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r
      JOIN users u ON r.client_id=u.id
      LEFT JOIN users p ON r.assigned_provider_id=p.id
      WHERE r.client_id=$1
      ORDER BY r.created_at DESC
    `, [req.user.id]);
    res.json(r.rows.map(x => ({ ...x, status: normalizeStatus(x.status) })));
  } catch (e) { console.error('❌ /requests/my:', e); res.status(500).json({ message: e.message }); }
});

app.get('/api/requests/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`
      SELECT r.*, u.name as client_name, u.phone as client_phone, u.profile_image as client_image,
      p.name as provider_name, p.phone as provider_phone,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id
      LEFT JOIN users p ON r.assigned_provider_id=p.id WHERE r.id=$1
    `, [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json({ ...r.rows[0], status: normalizeStatus(r.rows[0].status) });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/requests', auth, clientOnly, async (req, res) => {
  try {
    const { title, description, category, city, address, budget_max, deadline, images, attachments } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'العنوان والوصف مطلوبان' });
    const pn = generateProjectNumber();
    const r = await pool.query(`
      INSERT INTO requests (client_id, title, description, category, city, address, budget_max, deadline,
        images, attachments, project_number, status, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'open',NOW())
      RETURNING *
    `, [req.user.id, title, description, category||null, city||null, address||null,
        budget_max||null, deadline||null, images || null,
        attachments ? JSON.stringify(attachments) : null, pn]);
    const newReq = r.rows[0];

    // 🆕 Confirmation email to client about their new project
    try {
      const clientInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [req.user.id]);
      if (clientInfo.rows.length && clientInfo.rows[0].email) {
        const cName = clientInfo.rows[0].name;
        const cEmail = clientInfo.rows[0].email;
        const ctitle = '✅ تم نشر مشروعك بنجاح';
        const cBody = `
          <p>عزيزي <strong>${cName}</strong>،</p>
          <p>تم نشر مشروعك بنجاح على منصة مناقصة. سيتمكن المزودون المتخصصون من تقديم عروضهم قريباً.</p>
          <div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px 16px;margin:16px 0">
            <div style="font-size:15px;font-weight:800;color:#16213E;margin-bottom:8px">${newReq.title}</div>
            <div style="font-size:13px;color:#475569;line-height:1.9">
              <div><strong>رقم المشروع:</strong> ${pn}</div>
              ${newReq.category ? `<div><strong>التصنيف:</strong> ${newReq.category}</div>` : ''}
              ${newReq.city ? `<div><strong>المدينة:</strong> ${newReq.city}</div>` : ''}
              ${newReq.budget_max ? `<div><strong>الميزانية:</strong> ${Number(newReq.budget_max).toLocaleString('en-US')} ر.س</div>` : ''}
            </div>
          </div>
          <p style="font-size:13px;color:#6b7280">سنقوم بإشعارك فوراً عند وصول أول عرض.</p>
        `;
        sendEmail(cEmail, ctitle, emailTpl(ctitle, cBody, 'متابعة المشروع', SITE_URL + '/dashboard-client.html')).catch(() => {});
        await notify(req.user.id, ctitle, `تم نشر "${newReq.title}" بنجاح`, 'request_published', newReq.id);
      }
    } catch(e) { console.error('⚠️ client confirmation email:', e.message); }

    if (newReq.category) {
      try {
        const cat = String(newReq.category).trim();
        const provs = await pool.query(`
          SELECT id, name, email, specialties, notify_categories FROM users
          WHERE role='provider' AND is_active=TRUE
            AND (
              (specialties IS NOT NULL AND TRIM($1::text) = ANY(ARRAY(SELECT TRIM(UNNEST(specialties)))))
              OR (notify_categories IS NOT NULL AND TRIM($1::text) = ANY(ARRAY(SELECT TRIM(UNNEST(notify_categories)))))
            )
        `, [cat]);
        const cityHint = newReq.city ? ` في ${newReq.city}` : '';
        const title = '🆕 مشروع جديد في تخصصك';
        const bodyText = `${newReq.title}${cityHint} — اطّلع وقدّم عرضك`;

        const emailBody = `
          <p>وصلنا طلب مشروع جديد ضمن تخصصاتك على منصة مناقصة.</p>
          <div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px 16px;margin:16px 0">
            <div style="font-size:15px;font-weight:800;color:#16213E;margin-bottom:8px">${newReq.title}</div>
            <div style="font-size:13px;color:#475569;line-height:1.9">
              <div><strong>التصنيف:</strong> ${cat}</div>
              ${newReq.city ? `<div><strong>المدينة:</strong> ${newReq.city}</div>` : ''}
              ${newReq.budget_max ? `<div><strong>الميزانية:</strong> ${Number(newReq.budget_max).toLocaleString('en-US')} ر.س</div>` : ''}
              ${newReq.deadline ? `<div><strong>الموعد النهائي:</strong> ${String(newReq.deadline).slice(0,10)}</div>` : ''}
            </div>
          </div>
          <p style="font-size:13px;color:#6b7280">ادخل المنصة وقدّم عرضك قبل أن يختار العميل مزوداً آخر.</p>
        `;

        for (const p of provs.rows) {
          await notify(p.id, title, bodyText, 'new_request', newReq.id);
          if (p.email) {
            sendEmail(
              p.email,
              title,
              emailTpl(title, emailBody, 'فتح المشروع الآن', SITE_URL + '/dashboard-provider.html')
            ).catch(() => {});
          }
        }
        console.log(`📢 Request #${newReq.id} category="${cat}" → notified ${provs.rows.length} providers (in-app + email)`);
        if (provs.rows.length === 0) {
          const all = await pool.query(`SELECT id, name, specialties, notify_categories FROM users WHERE role='provider' AND is_active=TRUE`);
          console.log(`⚠️  No match for "${cat}". Active providers:`,
            all.rows.map(r => ({ id: r.id, name: r.name, specialties: r.specialties, notify_categories: r.notify_categories })));
        }
      } catch (nerr) {
        console.error('❌ notify providers:', nerr);
      }
    } else {
      console.log(`⚠️  Request #${newReq.id} has no category — no provider notifications sent`);
    }

    res.json(newReq);
  } catch (e) { console.error('❌ create request:', e); res.status(500).json({ message: e.message }); }
});

app.put('/api/requests/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT client_id FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'ليست طلبك' });
    const { title, description, category, city, address, budget_max, deadline } = req.body;
    const r = await pool.query(`
      UPDATE requests SET title=COALESCE(NULLIF($1,''),title),
        description=COALESCE(NULLIF($2,''),description),
        category=$3, city=$4, address=$5, budget_max=$6, deadline=$7
      WHERE id=$8 RETURNING *
    `, [title||'', description||'', category||null, city||null, address||null, budget_max||null, deadline||null, id]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/requests/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT client_id FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'ليست طلبك' });
    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM bids WHERE request_id=$1', [id]);
      await pool.query('DELETE FROM messages WHERE request_id=$1', [id]);
      await pool.query('DELETE FROM reviews WHERE request_id=$1', [id]);
      await pool.query('DELETE FROM requests WHERE id=$1', [id]);
      await pool.query('COMMIT');
      res.json({ ok: true });
    } catch (e) { await pool.query('ROLLBACK'); throw e; }
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/requests/:id/images', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'لا توجد صورة' });
    const own = await pool.query('SELECT client_id, images FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'ليست طلبك' });
    const current = own.rows[0].images || [];
    current.push(image);
    await pool.query('UPDATE requests SET images=$1 WHERE id=$2', [current, id]);
    res.json({ ok: true, count: current.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/requests/:id/attachments', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, type, data } = req.body;
    if (!data) return res.status(400).json({ message: 'لا توجد بيانات' });
    const own = await pool.query('SELECT client_id, attachments FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'ليست طلبك' });
    const current = own.rows[0].attachments || [];
    current.push({ name, type, data, uploaded_at: new Date().toISOString() });
    await pool.query('UPDATE requests SET attachments=$1 WHERE id=$2', [JSON.stringify(current), id]);
    res.json({ ok: true, count: current.length });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/requests/:id/complete', auth, clientOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(
      `UPDATE requests SET status='completed', completed_at=NOW()
       WHERE id=$1 AND client_id=$2 RETURNING id, assigned_provider_id, title`,
      [id, req.user.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود أو ليس طلبك' });

    // 🆕 Notify provider with email about project completion
    if (r.rows[0].assigned_provider_id) {
      const provInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [r.rows[0].assigned_provider_id]);
      const projTitle = r.rows[0].title;

      await notify(r.rows[0].assigned_provider_id, '🎉 مشروع مكتمل',
        `العميل أنهى مشروع "${projTitle}". لا تنسَ الحصول على تقييم!`, 'request', id);

      if (provInfo.rows.length && provInfo.rows[0].email) {
        const pName = provInfo.rows[0].name;
        const subject = '🎉 مشروع مكتمل - استلم تقييمك!';
        const body = `
          <p>عزيزي <strong>${pName}</strong>،</p>
          <p>قام العميل بإنهاء المشروع التالي:</p>
          <div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px 16px;margin:16px 0">
            <div style="font-size:15px;font-weight:800;color:#16213E">${projTitle}</div>
          </div>
          <p>تهانينا على إنجاز هذا المشروع! 🎊</p>
          <p>قد يقوم العميل بتقييمك قريباً، وهذا التقييم سيساعدك في الحصول على المزيد من المشاريع.</p>
          <p style="font-size:13px;color:#6b7280">💡 <strong>نصيحة:</strong> تأكد من إكمال جميع المتطلبات للحصول على تقييم 5 نجوم.</p>
        `;
        sendEmail(provInfo.rows[0].email, subject, emailTpl(subject, body, 'فتح المشروع', SITE_URL + '/dashboard-provider.html')).catch(() => {});
      }
    }

    // 🆕 Email to client confirming completion
    try {
      const clientInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [req.user.id]);
      if (clientInfo.rows.length && clientInfo.rows[0].email) {
        const cName = clientInfo.rows[0].name;
        const subject = '✅ تم إنهاء مشروعك';
        const body = `
          <p>عزيزي <strong>${cName}</strong>،</p>
          <p>تم تحديد مشروعك "<strong>${r.rows[0].title}</strong>" كمكتمل بنجاح.</p>
          <p>نتمنى أن تكون قد حصلت على الخدمة المناسبة.</p>
          <p>💡 <strong>تذكير:</strong> لا تنسَ تقييم المزود لمساعدة العملاء الآخرين على اتخاذ قرارات أفضل.</p>
          <p>شكراً لاستخدامك منصة مناقصة!</p>
        `;
        sendEmail(clientInfo.rows[0].email, subject, emailTpl(subject, body, 'تقييم المزود', SITE_URL + '/dashboard-client.html')).catch(() => {});
      }
    } catch(e) {}

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// BIDS
// ═══════════════════════════════════════════════════════════════

app.get('/api/bids/my', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT b.*, r.title as request_title, r.project_number, r.status as request_status,
      u.name as client_name
      FROM bids b JOIN requests r ON b.request_id=r.id JOIN users u ON r.client_id=u.id
      WHERE b.provider_id=$1 ORDER BY b.created_at DESC
    `, [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/requests/:id/bids', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT client_id FROM requests WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].client_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'ليست طلبك' });
    const r = await pool.query(`
      SELECT b.*,
        u.name as provider_name,
        u.phone as provider_phone,
        u.city as provider_city,
        u.badge as provider_badge,
        u.profile_image as provider_image,
        u.social_whatsapp as provider_whatsapp,
        COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=u.id),0) as provider_rating,
        COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=u.id),0) as provider_reviews
      FROM bids b JOIN users u ON b.provider_id=u.id
      WHERE b.request_id=$1
      ORDER BY (b.status='accepted') DESC, b.created_at DESC
    `, [id]);
    res.json(r.rows);
  } catch (e) {
    console.error('❌ GET /api/requests/:id/bids:', e.message);
    res.status(500).json({ message: e.message });
  }
});

app.post('/api/requests/:id/bids', auth, providerOnly, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    let { price, days, note } = req.body;

    price = parseInt(Math.round(parseFloat(price)));
    days  = parseInt(days);

    if (!Number.isFinite(price) || price <= 0) return res.status(400).json({ message: 'السعر غير صحيح' });
    if (!Number.isFinite(days)  || days  <= 0) return res.status(400).json({ message: 'المدة غير صحيحة' });

    const reqRow = await pool.query('SELECT client_id, title, status FROM requests WHERE id=$1', [requestId]);
    if (!reqRow.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (reqRow.rows[0].status !== 'open') return res.status(400).json({ message: 'الطلب غير مفتوح للعروض' });

    const existing = await pool.query(
      'SELECT id, status FROM bids WHERE request_id=$1 AND provider_id=$2',
      [requestId, req.user.id]
    );

    let row;
    let isUpdate = false;
    if (existing.rows.length) {
      if (existing.rows[0].status === 'accepted') {
        return res.status(400).json({ message: 'عرضك مقبول مسبقاً ولا يمكن تعديله' });
      }
      const upd = await pool.query(
        `UPDATE bids SET price=$1, days=$2, note=$3, created_at=NOW()
         WHERE request_id=$4 AND provider_id=$5 RETURNING *`,
        [price, days, note || null, requestId, req.user.id]
      );
      row = upd.rows[0];
      isUpdate = true;
    } else {
      const ins = await pool.query(
        `INSERT INTO bids (request_id, provider_id, price, days, note, status, created_at)
         VALUES ($1,$2,$3,$4,$5,'pending',NOW()) RETURNING *`,
        [requestId, req.user.id, price, days, note || null]
      );
      row = ins.rows[0];
    }

    // 🆕 Notify client with email about new bid
    const provInfo = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const clientInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [reqRow.rows[0].client_id]);
    const projTitle = reqRow.rows[0].title;
    const provName = provInfo.rows[0]?.name || 'مزود';

    const inAppTitle = isUpdate ? '✏️ تم تحديث عرض' : '💼 عرض جديد';
    const inAppBody = isUpdate
      ? `قام ${provName} بتحديث عرضه على مشروع "${projTitle}"`
      : `تلقيت عرضاً جديداً من ${provName} على مشروع "${projTitle}"`;

    await notify(reqRow.rows[0].client_id, inAppTitle, inAppBody, 'bid', requestId);

    // Email to client about new bid
    if (clientInfo.rows.length && clientInfo.rows[0].email && !isUpdate) {
      const cName = clientInfo.rows[0].name;
      const cEmail = clientInfo.rows[0].email;
      const subject = `💼 عرض جديد على مشروع "${projTitle}"`;
      const body = `
        <p>عزيزي <strong>${cName}</strong>،</p>
        <p>تلقيت عرضاً جديداً على مشروعك:</p>
        <div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px 16px;margin:16px 0">
          <div style="font-size:15px;font-weight:800;color:#16213E;margin-bottom:8px">${projTitle}</div>
          <div style="font-size:13px;color:#475569;line-height:1.9">
            <div><strong>المزود:</strong> ${provName}</div>
            <div><strong>السعر:</strong> ${Number(price).toLocaleString('en-US')} ر.س</div>
            <div><strong>المدة:</strong> ${days} يوم</div>
            ${note ? `<div><strong>ملاحظة:</strong> ${note.replace(/\n/g,'<br>')}</div>` : ''}
          </div>
        </div>
        <p style="font-size:13px;color:#6b7280">يمكنك مراجعة العرض ومقارنته بالعروض الأخرى من خلال لوحة التحكم.</p>
      `;
      sendEmail(cEmail, subject, emailTpl(subject, body, 'مراجعة العرض', SITE_URL + '/dashboard-client.html')).catch(() => {});
    }

    res.json(row);
  } catch (e) {
    console.error('❌ POST /api/requests/:id/bids:', e.message, '| body:', JSON.stringify(req.body), '| user:', req.user && req.user.id);
    res.status(500).json({ message: e.message, code: e.code });
  }
});

app.put('/api/bids/:id', auth, providerOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const own = await pool.query('SELECT provider_id, status FROM bids WHERE id=$1', [id]);
    if (!own.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (own.rows[0].provider_id !== req.user.id) return res.status(403).json({ message: 'ليس عرضك' });
    if (own.rows[0].status === 'accepted') return res.status(400).json({ message: 'العرض مقبول ولا يمكن تعديله' });
    const { price, days, note } = req.body;
    const r = await pool.query(
      'UPDATE bids SET price=COALESCE($1,price), days=COALESCE($2,days), note=$3 WHERE id=$4 RETURNING *',
      [price || null, days || null, note || null, id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
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
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/bids/:id/accept', auth, clientOnly, async (req, res) => {
  try {
    const bidId = parseInt(req.params.id);
    const bid = await pool.query(`
      SELECT b.*, r.client_id, r.title FROM bids b
      JOIN requests r ON b.request_id=r.id WHERE b.id=$1
    `, [bidId]);
    if (!bid.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (bid.rows[0].client_id !== req.user.id) return res.status(403).json({ message: 'ليس طلبك' });

    const acceptedBid = bid.rows[0];

    await pool.query('BEGIN');
    try {
      await pool.query(`UPDATE bids SET status='accepted' WHERE id=$1`, [bidId]);
      await pool.query(`UPDATE bids SET status='rejected' WHERE request_id=$1 AND id!=$2`,
        [acceptedBid.request_id, bidId]);
      await pool.query(`
        UPDATE requests SET status='in_progress', assigned_provider_id=$1, assigned_at=NOW()
        WHERE id=$2
      `, [acceptedBid.provider_id, acceptedBid.request_id]);
      await pool.query('COMMIT');

      // 🆕 Notify ACCEPTED provider with email
      const acceptedProv = await pool.query('SELECT name, email FROM users WHERE id=$1', [acceptedBid.provider_id]);
      const clientInfo = await pool.query('SELECT name, phone FROM users WHERE id=$1', [req.user.id]);
      const cName = clientInfo.rows[0]?.name || 'العميل';
      const cPhone = clientInfo.rows[0]?.phone || '';

      await notify(acceptedBid.provider_id, '🎉 تم قبول عرضك!',
        `تهانينا! تم قبول عرضك على مشروع "${acceptedBid.title}". تواصل مع العميل لبدء التنفيذ.`, 'bid_accepted', acceptedBid.request_id);

      if (acceptedProv.rows.length && acceptedProv.rows[0].email) {
        const subject = `🎉 تم قبول عرضك على "${acceptedBid.title}"`;
        const body = `
          <p>تهانينا <strong>${acceptedProv.rows[0].name}</strong>! 🎊</p>
          <p>تم قبول عرضك على المشروع التالي:</p>
          <div style="background:#fff8e6;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin:16px 0">
            <div style="font-size:15px;font-weight:800;color:#16213E;margin-bottom:8px">${acceptedBid.title}</div>
            <div style="font-size:13px;color:#475569;line-height:1.9">
              <div><strong>العميل:</strong> ${cName}</div>
              ${cPhone ? `<div><strong>الجوال:</strong> ${cPhone}</div>` : ''}
              <div><strong>السعر المتفق عليه:</strong> ${Number(acceptedBid.price).toLocaleString('en-US')} ر.س</div>
              <div><strong>المدة:</strong> ${acceptedBid.days} يوم</div>
            </div>
          </div>
          <p>🚀 <strong>الخطوات التالية:</strong></p>
          <ul style="line-height:2.2;color:#374151">
            <li>تواصل مع العميل عبر المنصة لتنسيق التفاصيل</li>
            <li>التزم بالتسليم في الموعد المحدد</li>
            <li>قدّم خدمة احترافية للحصول على تقييم 5 نجوم</li>
          </ul>
          <p style="font-size:13px;color:#6b7280">⚠️ <strong>تذكير:</strong> رسوم المنصة 1% من قيمة العقد، تُسدد خلال 10 أيام من اكتمال المشروع.</p>
        `;
        sendEmail(acceptedProv.rows[0].email, subject, emailTpl(subject, body, 'فتح المشروع', SITE_URL + '/dashboard-provider.html')).catch(() => {});
      }

      // 🆕 Notify REJECTED providers with email (those who had pending bids)
      const rejected = await pool.query(`
        SELECT b.provider_id, u.name, u.email FROM bids b
        JOIN users u ON b.provider_id = u.id
        WHERE b.request_id=$1 AND b.id!=$2 AND b.status='rejected'
      `, [acceptedBid.request_id, bidId]);

      for (const rej of rejected.rows) {
        await notify(rej.provider_id, '😔 لم يُقبل عرضك',
          `للأسف، اختار العميل عرضاً آخر على مشروع "${acceptedBid.title}". لا تستسلم، هناك مشاريع أخرى متاحة!`, 'bid_rejected', acceptedBid.request_id);

        if (rej.email) {
          const subject = `📋 لم يُقبل عرضك على "${acceptedBid.title}"`;
          const body = `
            <p>عزيزي <strong>${rej.name}</strong>،</p>
            <p>للأسف، اختار العميل عرضاً آخر على المشروع التالي:</p>
            <div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px 16px;margin:16px 0">
              <div style="font-size:15px;font-weight:800;color:#16213E">${acceptedBid.title}</div>
            </div>
            <p>لا تيأس! هناك مشاريع أخرى متاحة في تخصصك.</p>
            <p>💡 <strong>نصائح لزيادة فرص قبول عروضك:</strong></p>
            <ul style="line-height:2.2;color:#374151">
              <li>قدّم سعراً تنافسياً يناسب جودة العمل</li>
              <li>اكتب ملاحظة واضحة تشرح خبرتك</li>
              <li>أكمل ملفك الشخصي وأضف صور أعمالك</li>
              <li>كن سريعاً في تقديم العروض</li>
            </ul>
          `;
          sendEmail(rej.email, subject, emailTpl(subject, body, 'تصفح المشاريع المتاحة', SITE_URL + '/dashboard-provider.html')).catch(() => {});
        }
      }

      res.json({ ok: true });
    } catch (e) { await pool.query('ROLLBACK'); throw e; }
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/bids/:id/reject', auth, clientOnly, async (req, res) => {
  try {
    const bidId = parseInt(req.params.id);
    const bid = await pool.query(`
      SELECT b.*, r.client_id, r.title FROM bids b
      JOIN requests r ON b.request_id=r.id WHERE b.id=$1
    `, [bidId]);
    if (!bid.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (bid.rows[0].client_id !== req.user.id) return res.status(403).json({ message: 'ليس طلبك' });
    await pool.query(`UPDATE bids SET status='rejected' WHERE id=$1`, [bidId]);

    // 🆕 Notify rejected provider with email
    const provInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [bid.rows[0].provider_id]);
    await notify(bid.rows[0].provider_id, '❌ تم رفض عرضك',
      `تم رفض عرضك على مشروع "${bid.rows[0].title}"`, 'bid_rejected', bid.rows[0].request_id);

    if (provInfo.rows.length && provInfo.rows[0].email) {
      const subject = `📋 تم رفض عرضك على "${bid.rows[0].title}"`;
      const body = `
        <p>عزيزي <strong>${provInfo.rows[0].name}</strong>،</p>
        <p>تم رفض عرضك على المشروع التالي:</p>
        <div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px 16px;margin:16px 0">
          <div style="font-size:15px;font-weight:800;color:#16213E">${bid.rows[0].title}</div>
        </div>
        <p>لا تيأس! هناك مشاريع أخرى متاحة في تخصصك.</p>
      `;
      sendEmail(provInfo.rows[0].email, subject, emailTpl(subject, body, 'تصفح المشاريع', SITE_URL + '/dashboard-provider.html')).catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// MESSAGES
// ═══════════════════════════════════════════════════════════════

app.get('/api/messages/:requestId', auth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.requestId);
    const r = await pool.query(`
      SELECT m.*, u.name as sender_name, u.profile_image as sender_image
      FROM messages m JOIN users u ON m.sender_id=u.id
      WHERE m.request_id=$1 AND (m.sender_id=$2 OR m.receiver_id=$2)
      ORDER BY m.created_at ASC
    `, [requestId, req.user.id]);
    await pool.query(
      'UPDATE messages SET is_read=TRUE WHERE request_id=$1 AND receiver_id=$2 AND is_read=FALSE',
      [requestId, req.user.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// 🆕 Smart message email throttling - only email if no message in last 18 min
const _msgEmailCache = {}; // { "userId-requestId": timestamp }

app.post('/api/messages', auth, async (req, res) => {
  try {
    const { request_id, receiver_id, content } = req.body;
    if (!request_id || !receiver_id || !content) return res.status(400).json({ message: 'البيانات ناقصة' });
    const r = await pool.query(
      `INSERT INTO messages (request_id, sender_id, receiver_id, content, created_at)
       VALUES ($1,$2,$3,$4,NOW()) RETURNING *`,
      [request_id, req.user.id, receiver_id, content]
    );
    const sender = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const senderName = sender.rows[0].name;

    await notify(receiver_id, '💬 رسالة جديدة',
      `${senderName}: ${content.slice(0, 50)}${content.length > 50 ? '...' : ''}`,
      'message', request_id);

    // 🆕 Email throttled - only send if no email in last 18 minutes
    const cacheKey = `${receiver_id}-${request_id}`;
    const now = Date.now();
    const lastEmailTime = _msgEmailCache[cacheKey] || 0;
    const EIGHTEEN_MIN = 18 * 60 * 1000;

    if (now - lastEmailTime > EIGHTEEN_MIN) {
      _msgEmailCache[cacheKey] = now;
      try {
        const recvInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [receiver_id]);
        const reqInfo = await pool.query('SELECT title FROM requests WHERE id=$1', [request_id]);
        if (recvInfo.rows.length && recvInfo.rows[0].email) {
          const subject = `💬 رسالة جديدة من ${senderName}`;
          const body = `
            <p>عزيزي <strong>${recvInfo.rows[0].name}</strong>،</p>
            <p>وصلتك رسالة جديدة من <strong>${senderName}</strong> بخصوص:</p>
            <div style="background:#f8f8f4;border:1px solid #E6E2D9;border-radius:10px;padding:14px 16px;margin:16px 0">
              <div style="font-size:14px;font-weight:700;color:#16213E;margin-bottom:8px">${reqInfo.rows[0]?.title || 'مشروع'}</div>
              <div style="background:#fff;border-right:3px solid #C9920A;padding:10px 14px;border-radius:6px;font-size:13px;color:#374151;line-height:1.8">
                "${content.slice(0, 200).replace(/</g,'&lt;')}${content.length > 200 ? '...' : ''}"
              </div>
            </div>
            <p style="font-size:12px;color:#6b7280">للرد على الرسالة، ادخل إلى المنصة.</p>
          `;
          sendEmail(recvInfo.rows[0].email, subject, emailTpl(subject, body, 'الرد على الرسالة', SITE_URL)).catch(() => {});
        }
      } catch(e) { console.error('⚠️ message email:', e.message); }
    }

    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/messages/unread-count', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT COUNT(*) FROM messages WHERE receiver_id=$1 AND is_read=FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(r.rows[0].count) || 0 });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// REVIEWS
// ═══════════════════════════════════════════════════════════════

app.get('/api/reviews/user/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`
      SELECT rv.*, u.name as reviewer_name, u.profile_image as reviewer_image, rq.title as request_title
      FROM reviews rv JOIN users u ON rv.reviewer_id=u.id
      LEFT JOIN requests rq ON rv.request_id=rq.id
      WHERE rv.reviewed_id=$1 ORDER BY rv.created_at DESC
    `, [id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { request_id, reviewed_id, rating, comment } = req.body;
    if (!request_id || !reviewed_id || !rating)
      return res.status(400).json({ message: 'البيانات ناقصة' });
    if (rating < 1 || rating > 5)
      return res.status(400).json({ message: 'التقييم من 1 إلى 5' });

    const reqRow = await pool.query('SELECT status, title FROM requests WHERE id=$1', [request_id]);
    if (!reqRow.rows.length)
      return res.status(404).json({ message: 'الطلب غير موجود' });
    if (reqRow.rows[0].status !== 'completed')
      return res.status(400).json({ message: 'يجب أن يكون المشروع مكتملاً' });

    const existing = await pool.query(
      'SELECT id FROM reviews WHERE request_id=$1 AND reviewer_id=$2',
      [request_id, req.user.id]
    );

    let row;
    if (existing.rows.length) {
      const upd = await pool.query(
        `UPDATE reviews SET rating=$1, comment=$2, created_at=NOW()
         WHERE request_id=$3 AND reviewer_id=$4 RETURNING *`,
        [rating, comment || null, request_id, req.user.id]
      );
      row = upd.rows[0];
    } else {
      const ins = await pool.query(
        `INSERT INTO reviews (request_id, reviewer_id, reviewed_id, rating, comment, created_at)
         VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
        [request_id, req.user.id, reviewed_id, rating, comment || null]
      );
      row = ins.rows[0];
    }

    // 🆕 Notify reviewed user with email
    const reviewerInfo = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    const reviewedInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [reviewed_id]);
    const stars = '⭐'.repeat(rating);

    await notify(reviewed_id, '⭐ تقييم جديد', `حصلت على ${rating} ${rating === 5 ? '⭐⭐⭐⭐⭐' : 'نجوم'} من ${reviewerInfo.rows[0]?.name || 'العميل'}`, 'review', request_id);

    if (reviewedInfo.rows.length && reviewedInfo.rows[0].email) {
      const subject = `⭐ تقييم جديد ${rating === 5 ? '5 نجوم!' : `${rating} نجوم`}`;
      const body = `
        <p>عزيزي <strong>${reviewedInfo.rows[0].name}</strong>،</p>
        <p>حصلت على تقييم جديد من <strong>${reviewerInfo.rows[0]?.name || 'العميل'}</strong>:</p>
        <div style="background:#fff8e6;border:1px solid #fde68a;border-radius:10px;padding:18px;margin:16px 0;text-align:center">
          <div style="font-size:32px;letter-spacing:6px;margin-bottom:8px">${stars}</div>
          <div style="font-size:14px;font-weight:700;color:#92400e">${rating} من 5 نجوم</div>
          <div style="font-size:12px;color:#6b7280;margin-top:6px">على مشروع: ${reqRow.rows[0].title}</div>
          ${comment ? `<div style="margin-top:14px;padding:12px;background:#fff;border-radius:8px;font-size:13px;color:#374151;line-height:1.8;text-align:right">"${comment.replace(/</g,'&lt;')}"</div>` : ''}
        </div>
        <p>${rating >= 4 ? '🎉 رائع! استمر في تقديم خدمات متميزة لتحصل على المزيد من المشاريع.' : '💡 نأمل أن تستفيد من هذا التقييم لتطوير خدماتك.'}</p>
      `;
      sendEmail(reviewedInfo.rows[0].email, subject, emailTpl(subject, body, 'مشاهدة الملف الشخصي', SITE_URL)).catch(() => {});
    }

    res.json(row);
  } catch (e) {
    console.error('❌ POST /api/reviews:', e.message);
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// REPORTS, FAVORITES, PROVIDERS (public browse)
// ═══════════════════════════════════════════════════════════════

app.post('/api/reports', auth, async (req, res) => {
  try {
    const { reported_id, request_id, type, reason, details } = req.body;
    if (!reason) return res.status(400).json({ message: 'السبب مطلوب' });
    const r = await pool.query(`
      INSERT INTO reports (reporter_id, reported_id, request_id, type, reason, details, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *
    `, [req.user.id, reported_id || null, request_id || null, type || 'other', reason, details || null]);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/favorites', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT u.id, u.name, u.city, u.badge, u.specialties, u.profile_image,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=u.id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=u.id),0) as review_count
      FROM favorites f JOIN users u ON f.provider_id=u.id
      WHERE f.user_id=$1 ORDER BY f.created_at DESC
    `, [req.user.id]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/favorites/:providerId', auth, async (req, res) => {
  try {
    const pid = parseInt(req.params.providerId);
    await pool.query(
      `INSERT INTO favorites (user_id, provider_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.user.id, pid]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/favorites/:providerId', auth, async (req, res) => {
  try {
    const pid = parseInt(req.params.providerId);
    await pool.query('DELETE FROM favorites WHERE user_id=$1 AND provider_id=$2', [req.user.id, pid]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/providers', async (req, res) => {
  try {
    const { category, city } = req.query;
    let q = `
      SELECT id,name,city,specialties,badge,bio,profile_image,experience_years,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
      (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
      FROM users WHERE role='provider' AND is_active=TRUE
    `;
    const params = [];
    if (category) { params.push(category); q += ` AND $${params.length}=ANY(specialties)`; }
    if (city)     { params.push(`%${city}%`); q += ` AND city ILIKE $${params.length}`; }
    q += ' ORDER BY avg_rating DESC, review_count DESC';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.json([]); }
});

app.get('/api/providers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(`
      SELECT id,name,city,specialties,notify_categories,badge,bio,profile_image,
      experience_years,portfolio_images,created_at,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
      (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
      FROM users WHERE id=$1 AND role='provider'
    `, [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════

app.get('/api/notifications', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id, title, body, type, ref_id, is_read, created_at
       FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/notifications/unread-count', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(r.rows[0].count) || 0 });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2',
      [parseInt(req.params.id), req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/notifications/:id', auth, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM notifications WHERE id=$1 AND user_id=$2',
      [parseInt(req.params.id), req.user.id]
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/notifications', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const [users, requests, bids, providers, pending, inProgress, completed] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM requests'),
      pool.query('SELECT COUNT(*) FROM bids'),
      pool.query(`SELECT COUNT(*) FROM users WHERE role='provider'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status IN ('pending_review','review')`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='in_progress'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='completed'`),
    ]);
    res.json({
      total_users:+users.rows[0].count, requests:+requests.rows[0].count,
      total_bids:+bids.rows[0].count, providers:+providers.rows[0].count,
      pending_review:+pending.rows[0].count, in_progress:+inProgress.rows[0].count,
      completed:+completed.rows[0].count
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.query;
    const VALID = ['client','provider','admin'];
    let q = `SELECT u.id,u.name,u.email,u.phone,u.role,u.specialties,u.notify_categories,
      u.city,u.bio,u.badge,u.is_active,u.experience_years,u.profile_image,u.created_at,
      (SELECT COUNT(*) FROM requests WHERE client_id=u.id) as request_count,
      (SELECT COUNT(*) FROM requests WHERE client_id=u.id AND status='completed') as completed_requests,
      (SELECT COUNT(*) FROM bids WHERE provider_id=u.id) as bid_count,
      (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=u.id AND status='completed') as completed_projects,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=u.id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=u.id),0) as review_count
      FROM users u`;
    const params = [];
    if (role && VALID.includes(role)) { params.push(role); q += ' WHERE u.role=$1'; }
    q += ' ORDER BY u.created_at DESC';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/users/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const uid = parseInt(req.params.id);
    if (uid === req.user.id) return res.status(400).json({ message: 'لا يمكن تعديل حسابك' });
    const r = await pool.query(
      `UPDATE users SET is_active=NOT is_active WHERE id=$1 AND role!='admin' RETURNING id, name, is_active`,
      [uid]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/users/:id/badge', auth, adminOnly, async (req, res) => {
  try {
    const uid = parseInt(req.params.id);
    const { badge } = req.body;
    const r = await pool.query(
      `UPDATE users SET badge=$1 WHERE id=$2 AND role!='admin' RETURNING id,name,badge`,
      [badge, uid]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    if (badge && badge !== 'none') await notify(uid, '🏆 وسام جديد', `حصلت على وسام: ${badge}`, 'badge', null);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const uid = parseInt(req.params.id);
  try {
    if (!uid) return res.status(400).json({ message: 'معرف غير صحيح' });
    if (uid === req.user.id) return res.status(400).json({ message: 'لا يمكن حذف حسابك' });
    const chk = await pool.query('SELECT id, name, email, role FROM users WHERE id=$1', [uid]);
    if (!chk.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const target = chk.rows[0];
    if (target.role === 'admin') return res.status(403).json({ message: 'لا يمكن حذف المديرين' });

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
      if (target.role === 'provider') {
        await pool.query('UPDATE requests SET assigned_provider_id=NULL WHERE assigned_provider_id=$1', [uid]);
      }
      const del = await pool.query('DELETE FROM users WHERE id=$1', [uid]);
      if (del.rowCount === 0) throw new Error('فشل الحذف');
      await pool.query('COMMIT');
      res.json({ ok: true, deleted_user: target });
    } catch (e) { await pool.query('ROLLBACK'); throw e; }
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/providers', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id,name,email,phone,city,specialties,notify_categories,badge,is_active,bio,profile_image,created_at,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
      (SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as bid_count,
      (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
      FROM users WHERE role='provider' ORDER BY avg_rating DESC
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/requests', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    let q = `SELECT r.*, u.name as client_name, p.name as provider_name,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id LEFT JOIN users p ON r.assigned_provider_id=p.id`;
    const params = [];
    if (status) {
      if (status === 'pending_review') q += ` WHERE r.status IN ('pending_review','review')`;
      else { params.push(status); q += ' WHERE r.status=$1'; }
    }
    q += ' ORDER BY r.created_at DESC';
    const r = await pool.query(q, params);
    res.json(r.rows.map(x => ({ ...x, status: normalizeStatus(x.status) })));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/requests/:id/review', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { action, reason } = req.body;
    if (!['approve','reject'].includes(action)) return res.status(400).json({ message: 'إجراء غير صحيح' });
    const newStatus = action === 'approve' ? 'open' : 'rejected';
    const r = await pool.query(
      `UPDATE requests SET status=$1, admin_notes=COALESCE($2, admin_notes)
       WHERE id=$3 RETURNING id, client_id, title, category, city, status`,
      [newStatus, reason || null, id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const row = r.rows[0];

    // 🆕 Notify client with email about admin review action
    const clientInfo = await pool.query('SELECT name, email FROM users WHERE id=$1', [row.client_id]);
    const inAppTitle = action === 'approve' ? '✅ تمت الموافقة على مشروعك' : '❌ تم رفض مشروعك';
    const inAppBody = action === 'approve'
      ? `مشروعك "${row.title}" متاح للعروض الآن`
      : `مشروعك "${row.title}" تم رفضه${reason ? ': ' + reason : ''}`;

    await notify(row.client_id, inAppTitle, inAppBody, 'request', id);

    if (clientInfo.rows.length && clientInfo.rows[0].email) {
      const subject = inAppTitle;
      const body = action === 'approve' ? `
        <p>عزيزي <strong>${clientInfo.rows[0].name}</strong>،</p>
        <p>تمت الموافقة على مشروعك ونشره على المنصة:</p>
        <div style="background:#dcfce7;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;margin:16px 0">
          <div style="font-size:15px;font-weight:800;color:#15803d">${row.title}</div>
        </div>
        <p>سيتمكن المزودون من تقديم عروضهم الآن، وسنشعرك فوراً عند وصول أي عرض.</p>
      ` : `
        <p>عزيزي <strong>${clientInfo.rows[0].name}</strong>،</p>
        <p>للأسف، تم رفض مشروعك:</p>
        <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:14px 16px;margin:16px 0">
          <div style="font-size:15px;font-weight:800;color:#dc2626;margin-bottom:8px">${row.title}</div>
          ${reason ? `<div style="font-size:13px;color:#7f1d1d"><strong>السبب:</strong> ${reason}</div>` : ''}
        </div>
        <p>يمكنك تعديل المشروع وإعادة نشره. للاستفسار: <a href="mailto:cs@manaqasa.com" style="color:#C9920A">cs@manaqasa.com</a></p>
      `;
      sendEmail(clientInfo.rows[0].email, subject, emailTpl(subject, body, 'فتح المنصة', SITE_URL + '/dashboard-client.html')).catch(() => {});
    }

    res.json(row);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/requests/:id/complete', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const r = await pool.query(
      `UPDATE requests SET status='completed', completed_at=NOW()
       WHERE id=$1 RETURNING id, client_id, assigned_provider_id, title`,
      [id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const row = r.rows[0];
    await notify(row.client_id, '🎉 مشروع مكتمل', `مشروعك "${row.title}" تم إنهاؤه`, 'request', id);
    if (row.assigned_provider_id) {
      await notify(row.assigned_provider_id, '🎉 مشروع مكتمل', `المشروع "${row.title}" تم إنهاؤه`, 'request', id);
    }
    res.json(row);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/requests/:id', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, category, city, budget_max, deadline, admin_notes } = req.body;
    const r = await pool.query(
      `UPDATE requests SET title=COALESCE(NULLIF($1,''),title),
        description=COALESCE(NULLIF($2,''),description),
        category=$3, city=$4, budget_max=$5, deadline=$6, admin_notes=$7
       WHERE id=$8 RETURNING *`,
      [title||'', description||'', category||null, city||null, budget_max||null, deadline||null, admin_notes||null, id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/requests/:id', auth, adminOnly, async (req, res) => {
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
      if (del.rowCount === 0) { await pool.query('ROLLBACK'); return res.status(404).json({ message: 'غير موجود' }); }
      await pool.query('COMMIT');
      res.json({ ok: true });
    } catch (e) { await pool.query('ROLLBACK'); throw e; }
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/notify', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, user_ids, role, title, body, type, specialty, channel } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'العنوان والمحتوى مطلوبان' });
    const ch = (channel === 'email' || channel === 'both' || channel === 'app') ? channel : 'app';
    const VALID = ['client','provider','admin'];
    let target = [];
    if (Array.isArray(user_ids) && user_ids.length) {
      const ids = user_ids.map(Number).filter(Boolean);
      if (ids.length) {
        const u = await pool.query(
          'SELECT id, name, email FROM users WHERE id = ANY($1::int[]) AND is_active=TRUE',
          [ids]
        );
        target = u.rows;
      }
    } else if (user_id) {
      const u = await pool.query('SELECT id, name, email FROM users WHERE id=$1', [user_id]);
      target = u.rows;
    } else {
      let q = 'SELECT id, name, email FROM users WHERE is_active=TRUE';
      const p = [];
      if (role && VALID.includes(role)) { p.push(role); q += ` AND role=$${p.length}`; }
      if (specialty && specialty !== 'الكل') {
        if (!role) q += ` AND role='provider'`;
        p.push(specialty);
        q += ` AND ((specialties IS NOT NULL AND $${p.length}::text=ANY(specialties))
               OR (notify_categories IS NOT NULL AND $${p.length}::text=ANY(notify_categories)))`;
      }
      target = (await pool.query(q, p)).rows;
    }

    const htmlBody = `
      <div style="font-size:14px;line-height:2;color:#374151">${body.replace(/\n/g,'<br>')}</div>
      <div style="background:#f4f7fb;border-right:3px solid #16213E;border-radius:8px;padding:12px 16px;margin-top:18px">
        <p style="font-size:12px;color:#6b85a8;margin:0">رسالة رسمية من إدارة منصة مناقصة.</p>
      </div>
    `;
    const emailHtml = emailTpl(title, htmlBody, 'فتح المنصة', SITE_URL);

    let appCount = 0, emailCount = 0;
    for (const u of target) {
      if (ch === 'app' || ch === 'both') {
        await notify(u.id, title, body, type || 'admin', null);
        appCount++;
      }
      if ((ch === 'email' || ch === 'both') && u.email) {
        const ok = await sendEmail(u.email, title, emailHtml);
        if (ok) emailCount++;
      }
    }

    res.json({
      ok: true,
      sent_count: target.length,
      app_count: appCount,
      email_count: emailCount,
      channel: ch
    });
  } catch (e) { console.error('❌ admin/notify:', e); res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/users/search', auth, adminOnly, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const role = req.query.role;
    const VALID = ['client','provider','admin'];
    let sql = `SELECT id, name, email, phone, role, city, profile_image, is_active
               FROM users WHERE is_active=TRUE`;
    const params = [];
    if (role && VALID.includes(role)) { params.push(role); sql += ` AND role=$${params.length}`; }
    if (q) {
      params.push('%' + q + '%');
      sql += ` AND (name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`;
    }
    sql += ' ORDER BY name ASC LIMIT 50';
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) { console.error('❌ /admin/users/search:', e); res.json([]); }
});

app.get('/api/admin/email-status', auth, adminOnly, async (req, res) => {
  const providersWithEmail = await pool.query(
    `SELECT COUNT(*)::int as cnt FROM users WHERE role='provider' AND is_active=TRUE AND email IS NOT NULL AND email != ''`
  );
  const providersTotal = await pool.query(
    `SELECT COUNT(*)::int as cnt FROM users WHERE role='provider' AND is_active=TRUE`
  );
  res.json({
    resend_key_set: !!RESEND_KEY,
    resend_key_preview: RESEND_KEY ? (RESEND_KEY.slice(0,6) + '…' + RESEND_KEY.slice(-4)) : null,
    from_email: FROM_EMAIL,
    from_name: FROM_NAME,
    site_url: SITE_URL,
    providers_active: providersTotal.rows[0].cnt,
    providers_with_email: providersWithEmail.rows[0].cnt
  });
});

app.post('/api/admin/email-test', auth, adminOnly, async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ ok: false, error: 'البريد الإلكتروني مطلوب' });
  if (!RESEND_KEY) {
    return res.json({
      ok: false,
      stage: 'config',
      error: 'RESEND_KEY غير موجود في متغيرات البيئة',
      hint: 'أضف RESEND_KEY في Railway → Variables'
    });
  }
  try {
    const payload = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject: '🧪 اختبار الإيميل — مناقصة',
      html: emailTpl(
        'اختبار الإيميل يعمل ✓',
        '<p>هذا إيميل تجريبي من منصة مناقصة للتأكد من ربط الإيميل بشكل صحيح.</p><p>إذا وصلك هذا الإيميل، فإن نظام الإشعارات بالإيميل يعمل بنجاح.</p>',
        'فتح المنصة',
        SITE_URL
      )
    };
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await r.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (e) {}
    if (r.ok) {
      return res.json({
        ok: true,
        stage: 'sent',
        message: `تم إرسال الإيميل التجريبي بنجاح إلى ${to}`,
        resend_id: parsed && parsed.id,
        from_used: payload.from
      });
    }
    return res.json({
      ok: false,
      stage: 'resend_api',
      error: (parsed && (parsed.message || parsed.name)) || text || 'Unknown Resend error',
      status_code: r.status,
      raw: parsed || text,
      from_used: payload.from,
      hint: r.status === 403
        ? 'الدومين غير موثّق (verified) في Resend. اذهب لـ resend.com/domains وأضف manaqasa.com مع DNS records، أو استخدم from_email بدومين @resend.dev مؤقتاً.'
        : r.status === 422
        ? 'مشكلة في صيغة البريد أو في الدومين. تحقق من FROM_EMAIL.'
        : r.status === 429
        ? 'تجاوزت الحد الأقصى للإرسال (rate limit). انتظر قليلاً.'
        : null
    });
  } catch (e) {
    return res.json({ ok: false, stage: 'network', error: e.message });
  }
});

app.get('/api/admin/reviews', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.*, u1.name as reviewer_name, u2.name as reviewed_name, rq.title as request_title
      FROM reviews rv JOIN users u1 ON rv.reviewer_id=u1.id JOIN users u2 ON rv.reviewed_id=u2.id
      LEFT JOIN requests rq ON rv.request_id=rq.id ORDER BY rv.created_at DESC
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/reviews/:id', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM reviews WHERE id=$1', [parseInt(req.params.id)]);
    if (r.rowCount === 0) return res.status(404).json({ message: 'غير موجود' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/reports', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*, COALESCE(u1.name,'محذوف') as reporter_name, COALESCE(u2.name,'محذوف') as reported_name,
      COALESCE(u2.role,'unknown') as reported_role, rq.title as request_title
      FROM reports r
      LEFT JOIN users u1 ON r.reporter_id=u1.id
      LEFT JOIN users u2 ON r.reported_id=u2.id
      LEFT JOIN requests rq ON r.request_id=rq.id
      ORDER BY r.created_at DESC
    `);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/reports/:id', auth, adminOnly, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { action, admin_note } = req.body;
    const map = { warn: 'warned', ban: 'resolved', ignore: 'ignored', resolve: 'resolved' };
    const newStatus = map[action];
    if (!newStatus) return res.status(400).json({ message: 'إجراء غير صحيح' });
    const r = await pool.query('SELECT reported_id FROM reports WHERE id=$1', [id]);
    if (!r.rows.length) return res.status(404).json({ message: 'غير موجود' });
    const reportedId = r.rows[0].reported_id;
    await pool.query('UPDATE reports SET status=$1, admin_note=$2 WHERE id=$3', [newStatus, admin_note || null, id]);
    if (reportedId) {
      if (action === 'ban') {
        await pool.query("UPDATE users SET is_active=FALSE WHERE id=$1 AND role!='admin'", [reportedId]);
        await notify(reportedId, '⚠️ تم إيقاف حسابك', `تم إيقاف حسابك${admin_note?': '+admin_note:''}`, 'system', null);
      } else if (action === 'warn') {
        await notify(reportedId, '⚠️ تحذير', `تلقيت تحذيراً${admin_note?': '+admin_note:''}`, 'system', null);
      }
    }
    res.json({ ok: true, status: newStatus });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/search', auth, adminOnly, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ requests: [], users: [] });
    const p = `%${q}%`;
    const [reqs, users] = await Promise.all([
      pool.query(`SELECT r.id, r.title, r.status, u.name as client_name
                  FROM requests r LEFT JOIN users u ON r.client_id=u.id
                  WHERE r.title ILIKE $1 OR r.description ILIKE $1 OR r.project_number ILIKE $1
                  ORDER BY r.created_at DESC LIMIT 20`, [p]),
      pool.query(`SELECT id, name, email, role FROM users
                  WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
                  ORDER BY created_at DESC LIMIT 20`, [p])
    ]);
    res.json({
      requests: reqs.rows.map(r => ({ ...r, status: normalizeStatus(r.status) })),
      users: users.rows
    });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC
// ═══════════════════════════════════════════════════════════════

app.get('/api/categories', (req, res) => {
  res.json([
    'برمجة وتطوير','تصميم','كتابة وترجمة','تسويق رقمي','أعمال',
    'هندسة وعمارة','صوتيات ومرئيات','استشارات','تدريب','أخرى'
  ]);
});

app.get('/api/cities', (req, res) => {
  res.json([
    'الرياض','جدة','مكة المكرمة','المدينة المنورة','الدمام','الخبر','الطائف','أبها','تبوك','حائل',
    'بريدة','الأحساء','خميس مشيط','جازان','نجران','الباحة','عرعر','سكاكا','ينبع','القطيف','الجبيل'
  ]);
});

app.get('/api/stats', async (req, res) => {
  try {
    const s = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM requests WHERE status='completed'"),
      pool.query("SELECT COUNT(*) as count FROM users    WHERE role='provider' AND is_active=true"),
      pool.query("SELECT COUNT(*) as count FROM users    WHERE role='client'   AND is_active=true"),
      pool.query("SELECT COUNT(*) as count FROM requests WHERE status='open'")
    ]);
    res.json({
      completed_projects: +s[0].rows[0].count || 0, active_providers: +s[1].rows[0].count || 0,
      active_clients: +s[2].rows[0].count || 0, open_requests: +s[3].rows[0].count || 0
    });
  } catch (e) { res.json({ completed_projects:0, active_providers:0, active_clients:0, open_requests:0 }); }
});

// ═══════════════════════════════════════════════════════════════
// PUSH TOKENS
// ═══════════════════════════════════════════════════════════════
app.post('/api/push-token', auth, async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ message: 'token مطلوب' });
    await pool.query(
      `INSERT INTO push_tokens(user_id, token, platform) VALUES($1,$2,$3)
       ON CONFLICT(user_id, token) DO UPDATE SET platform=$3, created_at=NOW()`,
      [req.user.id, token, platform || 'expo']);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/push-token', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM push_tokens WHERE user_id=$1 AND token=$2', [req.user.id, req.body.token]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// ═══════════════════════════════════════════════════════════════
// 🔔 WEB PUSH NOTIFICATIONS API
// ═══════════════════════════════════════════════════════════════

// Get VAPID public key (for client to subscribe)
app.get('/api/push/vapid-public-key', (req, res) => {
  if (!VAPID_PUBLIC_KEY) return res.status(503).json({ message: 'Push غير مفعّل' });
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe a device to push notifications
app.post('/api/push/subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: 'بيانات الاشتراك غير صحيحة' });
    }
    const tokenStr = JSON.stringify(subscription);
    await pool.query(
      `INSERT INTO push_tokens(user_id, token, platform) VALUES($1,$2,'web')
       ON CONFLICT(user_id, token) DO UPDATE SET created_at=NOW()`,
      [req.user.id, tokenStr]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ /api/push/subscribe:', e);
    res.status(500).json({ message: e.message });
  }
});

// Unsubscribe a device from push notifications
app.post('/api/push/unsubscribe', auth, async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      // Find by endpoint match
      const r = await pool.query(
        `SELECT id, token FROM push_tokens WHERE user_id=$1 AND platform='web'`,
        [req.user.id]
      );
      for (const row of r.rows) {
        try {
          const sub = JSON.parse(row.token);
          if (sub.endpoint === endpoint) {
            await pool.query('DELETE FROM push_tokens WHERE id=$1', [row.id]);
          }
        } catch(e) {}
      }
    } else {
      // Remove all web push subscriptions for this user
      await pool.query(
        `DELETE FROM push_tokens WHERE user_id=$1 AND platform='web'`,
        [req.user.id]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ /api/push/unsubscribe:', e);
    res.status(500).json({ message: e.message });
  }
});

// 🔔 Register Native Push Token (iOS/Android via Expo)
app.post('/api/push/register-native', auth, async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ message: 'token مطلوب' });
    if (!String(token).startsWith('ExponentPushToken')) {
      return res.status(400).json({ message: 'صيغة token غير صحيحة' });
    }
    const plat = (platform === 'ios' || platform === 'android') ? platform : 'expo';

    // Remove old tokens of same platform for this user (only one device per platform)
    // This prevents notification duplication if user reinstalls
    await pool.query(
      `INSERT INTO push_tokens(user_id, token, platform) VALUES($1,$2,$3)
       ON CONFLICT(user_id, token) DO UPDATE SET platform=$3, created_at=NOW()`,
      [req.user.id, token, plat]
    );
    console.log(`📱 Native push registered: user=${req.user.id}, platform=${plat}`);
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ /api/push/register-native:', e);
    res.status(500).json({ message: e.message });
  }
});

// Check if user has active push subscriptions (for UI state)
app.get('/api/push/status', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT COUNT(*)::int as cnt FROM push_tokens WHERE user_id=$1 AND platform='web'`,
      [req.user.id]
    );
    res.json({ subscribed: r.rows[0].cnt > 0, count: r.rows[0].cnt });
  } catch (e) {
    res.json({ subscribed: false, count: 0 });
  }
});

// 🆕 Get current badge count (unread messages + notifications)
app.get('/api/push/badge', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM notifications WHERE user_id=$1 AND is_read=false) +
        (SELECT COUNT(*)::int FROM messages
         WHERE receiver_id=$1 AND (is_read=false OR is_read IS NULL))
        AS total
    `, [req.user.id]);
    res.json({ badge: r.rows[0]?.total || 0 });
  } catch (e) {
    res.json({ badge: 0 });
  }
});

// Test push notification (admin only)
app.post('/api/admin/push-test', auth, adminOnly, async (req, res) => {
  try {
    const { user_id } = req.body;
    const targetId = user_id || req.user.id;
    await sendPush(
      targetId,
      '🧪 اختبار الإشعارات',
      'هذا إشعار تجريبي من منصة مناقصة. إذا وصلك فالإشعارات تشتغل بنجاح! 🎉',
      '/',
      'test',
      null
    );
    res.json({ ok: true, message: 'تم إرسال الإشعار التجريبي' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log('🚀 Endpoints ready: auth, profiles, requests, bids, messages, reviews, reports, favorites, providers, notifications, push, admin, account-deletion');
  console.log('📧 Full email notifications: welcome, project published, new bid, bid accepted/rejected, message, review, project completed, password change, admin actions');
  console.log('🔔 Web Push: ' + (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY ? 'ENABLED ✅' : 'DISABLED (set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY)'));
  console.log('📱 Native Push (iOS/Android via Expo): ENABLED ✅');
});

process.on('uncaughtException',  (e) => console.error('Uncaught:', e));
process.on('unhandledRejection', (r) => console.error('Unhandled:', r));
