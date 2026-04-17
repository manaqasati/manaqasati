const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { WebSocketServer } = require('ws');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

const RESEND_KEY = process.env.RESEND_KEY || 're_bfjMBMPj_67sGJEwKehKqnqz5B4pVqvTD';
const FROM_EMAIL = 'cs@manaqasa.com';
const SITE_URL = 'https://manaqasati-production.up.railway.app';
const JWT_SECRET = process.env.JWT_SECRET || 'manaqasa_secret_2024';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const CATEGORIES = [
  'تبريد وتكييف','كهرباء','سباكة','نجارة','تنظيف','نقل عفش',
  'حدادة','ألمنيوم','مسابح (تنفيذ وصيانة)','كاميرات مراقبة وأمن',
  'شبكات وإنترنت','مظلات وسواتر','عزل حراري وأسطح','أبواب',
  'أعمال جبس وطباشير','مكافحة حشرات','أخرى'
];

// ── EMAIL ──
async function sendEmail(to, subject, html) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `مناقصة <${FROM_EMAIL}>`, to: [to], subject, html })
    });
    if (!r.ok) console.error('Resend:', await r.text());
    return r.ok;
  } catch(e) { console.error('Email error:', e.message); return false; }
}

// ── PUSH NOTIFICATIONS ──
async function sendPush(userIds, title, body, data = {}) {
  if (!userIds || !userIds.length) return;
  try {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    const rows = await pool.query(`SELECT token FROM push_tokens WHERE user_id = ANY($1)`, [ids]);
    if (!rows.rows.length) return;
    const messages = rows.rows.map(r => ({
      to: r.token, sound: 'default', title, body, data,
      priority: 'high', channelId: 'default',
    }));
    for (let i = 0; i < messages.length; i += 100) {
      const chunk = messages.slice(i, i + 100);
      const r = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(chunk)
      });
      const result = await r.json();
      if (result.errors) console.error('Push errors:', result.errors);
    }
  } catch(e) { console.error('sendPush error:', e.message); }
}

function emailTpl(title, body, btnText, btnUrl) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><title>مناقصة</title></head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Tahoma,Arial,sans-serif;direction:rtl">
  <div style="max-width:580px;margin:0 auto;padding:24px 16px">
    <div style="background:#1B3A6B;border-radius:16px 16px 0 0;padding:32px 28px 24px;text-align:center">
      <div style="font-size:24px;font-weight:900;color:#fff;margin-bottom:8px">● مناقصة</div>
      <div style="height:3px;background:#F0A500;margin-top:12px"></div>
    </div>
    <div style="background:#fff;padding:32px 28px 24px;border:1px solid #dce5f0;border-top:none">
      <div style="font-size:17px;font-weight:700;color:#0d1f3c;margin-bottom:20px;padding-bottom:14px;border-bottom:1px solid #e8eef7">${title}</div>
      <div style="font-size:14px;color:#374151;line-height:2">${body}</div>
      ${btnText && btnUrl ? `<div style="text-align:center;margin:28px 0 8px"><a href="${btnUrl}" style="display:inline-block;background:#F0A500;color:#fff;padding:14px 40px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">${btnText}</a></div>` : ''}
    </div>
    <div style="background:#f4f7fb;border-radius:0 0 16px 16px;padding:18px 28px;text-align:center;border:1px solid #dce5f0;border-top:none">
      <div style="font-size:11px;color:#94a3b8">© ${new Date().getFullYear()} منصة مناقصة — manaqasa.com</div>
    </div>
  </div>
</body></html>`;
}

function genProjectNum(id, date) {
  const d = new Date(date);
  return `MNQ-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(id).padStart(4,'0')}`;
}

// ── DB INIT ──
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL, password VARCHAR(255),
      phone VARCHAR(20), role VARCHAR(20) DEFAULT 'client',
      specialties TEXT[], notify_categories TEXT[], bio TEXT,
      city VARCHAR(100), badge VARCHAR(50) DEFAULT 'none',
      is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY, project_number VARCHAR(50),
      title VARCHAR(255) NOT NULL, description TEXT,
      category VARCHAR(100), city VARCHAR(100), address TEXT,
      budget_max INTEGER, deadline DATE, image_url TEXT,
      images TEXT[], main_image_index INTEGER DEFAULT 0,
      status VARCHAR(30) DEFAULT 'pending_review',
      client_id INTEGER REFERENCES users(id),
      accepted_bid_id INTEGER, assigned_provider_id INTEGER REFERENCES users(id),
      assigned_at TIMESTAMP, completed_at TIMESTAMP,
      admin_notes TEXT, created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES users(id),
      price INTEGER NOT NULL, days INTEGER NOT NULL, note TEXT,
      status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(request_id, provider_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id),
      receiver_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL, is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES requests(id),
      reviewer_id INTEGER REFERENCES users(id),
      reviewed_id INTEGER REFERENCES users(id),
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      comment TEXT, type VARCHAR(30), created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(request_id, reviewer_id)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id),
      title VARCHAR(255), body TEXT, type VARCHAR(50), ref_id INTEGER,
      is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS push_tokens (
      id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL, platform VARCHAR(20), created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, token)
    );
    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id, provider_id)
    );
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      reporter_id INTEGER REFERENCES users(id),
      reported_id INTEGER REFERENCES users(id),
      request_id INTEGER REFERENCES requests(id),
      type VARCHAR(50) NOT NULL, reason VARCHAR(255) NOT NULL,
      details TEXT, status VARCHAR(20) DEFAULT 'pending',
      admin_note TEXT, created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  try { await pool.query(`ALTER TABLE users RENAME COLUMN password_hash TO password`); } catch(e) {}
  try { await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`); } catch(e) {}

  const alters = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS specialties TEXT[]`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_categories TEXT[]`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS badge VARCHAR(50) DEFAULT 'none'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_years INTEGER`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_images TEXT[]`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS report_count INTEGER DEFAULT 0`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS project_number VARCHAR(50)`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS address TEXT`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS deadline DATE`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS image_url TEXT`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS images TEXT[]`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS attachments JSONB`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS main_image_index INTEGER DEFAULT 0`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS accepted_bid_id INTEGER`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS assigned_provider_id INTEGER`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS admin_notes TEXT`,
  ];
  for (const sql of alters) await pool.query(sql).catch(()=>{});

  const rows = await pool.query(`SELECT id,created_at FROM requests WHERE project_number IS NULL`);
  for (const row of rows.rows) {
    await pool.query(`UPDATE requests SET project_number=$1 WHERE id=$2`,
      [genProjectNum(row.id, row.created_at), row.id]);
  }
  console.log('✅ DB جاهزة');
}

// ── MIDDLEWARE ──
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'جلسة منتهية' }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'للمدير فقط' });
  next();
}

async function notify(userId, title, body, type, refId) {
  await pool.query(
    'INSERT INTO notifications(user_id,title,body,type,ref_id) VALUES($1,$2,$3,$4,$5)',
    [userId, title, body, type, refId]
  ).catch(()=>{});
}

// ── WEBSOCKET ──
const wss = new WebSocketServer({ server });
const clients = new Map();

function wsAuth(token) {
  try { return jwt.verify(token, JWT_SECRET); } catch { return null; }
}

function broadcast(userIds, payload) {
  const msg = JSON.stringify(payload);
  for (const uid of userIds) {
    const conns = clients.get(String(uid));
    if (conns) conns.forEach(ws => { try { if(ws.readyState===1) ws.send(msg); } catch {} });
  }
}

wss.on('connection', (ws, req) => {
  const params = new URLSearchParams(req.url.replace(/^.*\?/, ''));
  const user = wsAuth(params.get('token') || '');
  if (!user) { ws.close(4001, 'غير مصرح'); return; }

  const uid = String(user.id);
  if (!clients.has(uid)) clients.set(uid, new Set());
  clients.get(uid).add(ws);
  ws.userId = user.id;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw);
      if (data.type === 'message') {
        const { request_id, receiver_id, content } = data;
        if (!content?.trim() || !receiver_id || !request_id) return;
        const r = await pool.query(
          'INSERT INTO messages(request_id,sender_id,receiver_id,content) VALUES($1,$2,$3,$4) RETURNING *',
          [request_id, ws.userId, receiver_id, content.trim()]);
        const msg = r.rows[0];
        const senderInfo = await pool.query('SELECT name,role FROM users WHERE id=$1', [ws.userId]);
        msg.sender_name = senderInfo.rows[0]?.name || '';
        msg.sender_role = senderInfo.rows[0]?.role || '';
        broadcast([ws.userId, receiver_id], { type: 'message', message: msg });
        await notify(receiver_id, '💬 رسالة جديدة',
          `${msg.sender_name}: ${content.substring(0,50)}`, 'message', request_id);
      }
    } catch (e) { console.error('ws error:', e.message); }
  });

  ws.on('close', () => {
    const conns = clients.get(uid);
    if (conns) { conns.delete(ws); if (!conns.size) clients.delete(uid); }
  });

  ws.send(JSON.stringify({ type: 'connected', userId: user.id }));
});

setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) { ws.terminate(); return; }
    ws.isAlive = false; ws.ping();
  });
}, 30000);

async function notifyInterestedProviders(reqId, title, category) {
  if (!category) return;
  try {
    const reqData = await pool.query(
      `SELECT r.*,u.name as client_name FROM requests r JOIN users u ON r.client_id=u.id WHERE r.id=$1`, [reqId]);
    const req = reqData.rows[0] || {};
    const reqCity = req.city || null;
    const allProvs = await pool.query(
      `SELECT id,name,email,city FROM users WHERE role='provider'
       AND (specialties IS NOT NULL AND $1=ANY(specialties)
            OR notify_categories IS NOT NULL AND $1=ANY(notify_categories))`,
      [category]);
    const sorted = reqCity
      ? [...allProvs.rows.filter(p=>p.city===reqCity), ...allProvs.rows.filter(p=>p.city!==reqCity)]
      : allProvs.rows;
    for (const p of sorted) {
      await notify(p.id, '🔔 مناقصة جديدة في تخصصك',
        `نُشرت: "${title}" — ${req.city||category}`, 'new_request', reqId);
      await sendPush([p.id], '🔔 مناقصة جديدة في تخصصك', `"${title}"`,
        { type: 'new_request', reqId });
      if (p.email) {
        await sendEmail(p.email, `🔔 مناقصة جديدة: ${title}`,
          emailTpl(`مرحباً ${p.name}،`,
            `<p>وصلك مشروع جديد يناسب تخصصك في <strong>${category}</strong>.</p>
             <div style="background:#f4f7fb;border:1px solid #dce5f0;border-radius:10px;padding:16px;margin:14px 0">
               <strong>${title}</strong><br>
               <span style="color:#6b85a8">📍 ${req.city||'—'} | 💰 ${req.budget_max?Number(req.budget_max).toLocaleString()+' ر.س':'غير محدد'}</span>
             </div>`,
            'تقديم عرضي الآن ←', `${SITE_URL}/dashboard-provider.html`));
      }
    }
  } catch(e) { console.error('notifyProviders:', e.message); }
}

// ── SETUP ENDPOINTS ──
app.get('/api/fix-db', async (req, res) => {
  try {
    if (req.query.secret !== 'manaqasa2024') return res.status(403).json({ message: 'رمز خاطئ' });
    const results = [];
    try { await pool.query(`ALTER TABLE users RENAME COLUMN password_hash TO password`); results.push('✅ تم'); } catch(e) { results.push('ℹ️ ' + e.message.substring(0,80)); }
    try { await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`); results.push('✅ تم'); } catch(e) { results.push('ℹ️ ' + e.message.substring(0,80)); }
    res.json({ ok: true, steps: results });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/direct-admin', async (req, res) => {
  try {
    if (req.query.secret !== 'manaqasa2024') return res.status(403).json({ message: 'رمز خاطئ' });
    const { email, password } = req.query;
    if (!email || !password) return res.json({ usage: '/api/direct-admin?secret=manaqasa2024&email=EMAIL&password=PASS' });
    const hash = await bcrypt.hash(password, 10);
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) {
      await pool.query(`UPDATE users SET password=$1, role='admin', is_active=TRUE WHERE email=$2`, [hash, email]);
      res.json({ ok: true, message: '✅ تم تحديث المدير', email });
    } else {
      await pool.query(`INSERT INTO users(name,email,password,role) VALUES('المدير',$1,$2,'admin')`, [email, hash]);
      res.json({ ok: true, message: '✅ تم إنشاء حساب المدير', email });
    }
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/categories', (req, res) => res.json(CATEGORIES));

// ── PUSH TOKEN ──
app.post('/api/push-token', auth, async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) return res.status(400).json({ message: 'token مطلوب' });
    await pool.query(
      `INSERT INTO push_tokens(user_id, token, platform) VALUES($1,$2,$3)
       ON CONFLICT(user_id, token) DO UPDATE SET platform=$3, created_at=NOW()`,
      [req.user.id, token, platform || 'expo']);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/push-token', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM push_tokens WHERE user_id=$1 AND token=$2', [req.user.id, req.body.token]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── AUTH ──
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, specialties, bio, city } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'البيانات ناقصة' });
    if (!city) return res.status(400).json({ message: 'المدينة مطلوبة' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(400).json({ message: 'البريد مسجل مسبقاً' });
    const hash = await bcrypt.hash(password, 10);
    const specs = role === 'provider' ? (specialties || []) : null;
    const r = await pool.query(
      'INSERT INTO users(name,email,password,phone,role,specialties,bio,city) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,email,role,specialties,bio,city,badge',
      [name, email, hash, phone||null, role||'client', specs, bio||null, city||null]);
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, token });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const r = phone
      ? await pool.query('SELECT * FROM users WHERE phone=$1', [phone])
      : await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!r.rows.length) return res.status(400).json({ message: 'البيانات غير صحيحة' });
    const user = r.rows[0];
    if (!user.is_active) return res.status(403).json({ message: 'الحساب موقوف' });
    const storedHash = user.password || user.password_hash || '';
    if (!storedHash) return res.status(400).json({ message: 'كلمة المرور غير مضبوطة' });
    const ok = await bcrypt.compare(password, storedHash);
    if (!ok) return res.status(400).json({ message: 'البيانات غير صحيحة' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    delete user.password; delete user.password_hash;
    res.json({ user, token });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!r.rows.length) return res.json({ ok: true });
    const user = r.rows[0];
    const resetToken = jwt.sign({ id: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    const resetUrl = `${SITE_URL}/auth.html?reset=${resetToken}`;
    await sendEmail(email, 'استعادة كلمة المرور — مناقصة',
      emailTpl(`مرحباً ${user.name}،`,
        `<p>وصلنا طلب إعادة تعيين كلمة المرور.</p>
         <p style="color:#92400e">⏰ الرابط صالح لمدة ساعة واحدة فقط</p>`,
        'إعادة تعيين كلمة المرور ←', resetUrl));
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(400).json({ message: 'رابط منتهي الصلاحية' }); }
    if (decoded.type !== 'reset') return res.status(400).json({ message: 'رابط غير صحيح' });
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, decoded.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const r = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const storedHash = r.rows[0].password || r.rows[0].password_hash || '';
    const ok = await bcrypt.compare(old_password, storedHash);
    if (!ok) return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── REQUESTS ──
app.get('/api/requests', async (req, res) => {
  try {
    const { category, city } = req.query;
    let q = `SELECT r.id,r.project_number,r.title,r.description,r.category,r.city,
      r.budget_max,r.deadline,r.image_url,r.images,r.main_image_index,r.status,
      r.client_id,r.created_at,u.name as client_name,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id WHERE r.status='open'`;
    const params = [];
    if (category) { params.push(category); q += ` AND r.category=$${params.length}`; }
    if (city) { params.push(`%${city}%`); q += ` AND r.city ILIKE $${params.length}`; }
    q += ' ORDER BY r.created_at DESC';
    res.json((await pool.query(q, params)).rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/requests/my', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*,u.name as client_name,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id
      WHERE r.client_id=$1 ORDER BY r.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/requests/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*,u.name as client_name,u.phone as client_phone,
      p.name as provider_name,p.phone as provider_phone
      FROM requests r JOIN users u ON r.client_id=u.id
      LEFT JOIN users p ON r.assigned_provider_id=p.id
      WHERE r.id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/requests', auth, async (req, res) => {
  try {
    const { title, description, category, city, address, budget_max, deadline, image_url, images, main_image_index, attachments } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'العنوان والتفاصيل مطلوبة' });
    const mainIdx = parseInt(main_image_index) || 0;
    const mainImg = image_url || (images && images[mainIdx]) || null;
    const r = await pool.query(
      `INSERT INTO requests(title,description,category,city,address,budget_max,deadline,image_url,images,main_image_index,attachments,client_id,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'open') RETURNING *`,
      [title, description, category||null, city||null, address||null, budget_max||null, deadline||null, mainImg, images||null, mainIdx, attachments?JSON.stringify(attachments):null, req.user.id]);
    const req2 = r.rows[0];
    const num = genProjectNum(req2.id, req2.created_at);
    await pool.query('UPDATE requests SET project_number=$1 WHERE id=$2', [num, req2.id]);
    req2.project_number = num;
    const admins = await pool.query(`SELECT id FROM users WHERE role='admin'`);
    for (const a of admins.rows) await notify(a.id, '📋 طلب جديد', `${title}`, 'new_request', req2.id);
    notifyInterestedProviders(req2.id, req2.title, req2.category).catch(()=>{});
    res.json(req2);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/requests/:id/images', auth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'الصورة مطلوبة' });
    const r = await pool.query('SELECT images,client_id FROM requests WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (Number(r.rows[0].client_id) !== Number(req.user.id)) return res.status(403).json({ message: 'غير مصرح' });
    const imgs = r.rows[0].images || [];
    if (imgs.length >= 3) return res.status(400).json({ message: 'الحد الأقصى 3 صور' });
    imgs.push(image);
    await pool.query('UPDATE requests SET images=$1,image_url=$2 WHERE id=$3', [imgs, imgs[0], req.params.id]);
    res.json({ ok: true, count: imgs.length });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/requests/:id/images/:idx', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT images,client_id FROM requests WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (Number(r.rows[0].client_id) !== Number(req.user.id)) return res.status(403).json({ message: 'غير مصرح' });
    const imgs = r.rows[0].images || [];
    const idx = parseInt(req.params.idx);
    imgs.splice(idx, 1);
    await pool.query('UPDATE requests SET images=$1,image_url=$2 WHERE id=$3', [imgs, imgs[0]||null, req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/requests/:id/attachments', auth, async (req, res) => {
  try {
    const { name, type, data } = req.body;
    if (!data) return res.status(400).json({ message: 'الملف مطلوب' });
    const r = await pool.query('SELECT attachments,client_id FROM requests WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (Number(r.rows[0].client_id) !== Number(req.user.id)) return res.status(403).json({ message: 'غير مصرح' });
    const atts = r.rows[0].attachments ? JSON.parse(r.rows[0].attachments) : [];
    atts.push({ name: name||'ملف', type: type||'application/octet-stream', data });
    await pool.query('UPDATE requests SET attachments=$1 WHERE id=$2', [JSON.stringify(atts), req.params.id]);
    res.json({ ok: true, count: atts.length });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/requests/:id/attachments/:idx', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT attachments,client_id FROM requests WHERE id=$1', [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (Number(r.rows[0].client_id) !== Number(req.user.id)) return res.status(403).json({ message: 'غير مصرح' });
    const atts = r.rows[0].attachments ? JSON.parse(r.rows[0].attachments) : [];
    const idx = parseInt(req.params.idx);
    atts.splice(idx, 1);
    await pool.query('UPDATE requests SET attachments=$1 WHERE id=$2', [JSON.stringify(atts), req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/requests/:id', auth, async (req, res) => {
  try {
    const { title, description, budget_max, deadline } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'العنوان والتفاصيل مطلوبة' });
    const r = await pool.query(
      `UPDATE requests SET title=$1,description=$2,budget_max=$3,deadline=$4
       WHERE id=$5 AND client_id=$6 AND status IN ('open','review') RETURNING *`,
      [title, description, budget_max||null, deadline||null, req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(403).json({ message: 'لا يمكن تعديل هذا الطلب' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/requests/:id', auth, async (req, res) => {
  try {
    const r = await pool.query(`SELECT status FROM requests WHERE id=$1 AND client_id=$2`, [req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (!['open','review'].includes(r.rows[0].status))
      return res.status(400).json({ message: 'لا يمكن حذف طلب قيد التنفيذ' });
    await pool.query('DELETE FROM requests WHERE id=$1 AND client_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true, message: 'تم الحذف' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/requests/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const r = await pool.query(
      `UPDATE requests SET status=$1 WHERE id=$2 AND client_id=$3 RETURNING *`,
      [status, req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(403).json({ message: 'غير مصرح' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/requests/:id/complete', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE requests SET status='completed',completed_at=NOW() WHERE id=$1 AND client_id=$2 RETURNING *`,
      [req.params.id, req.user.id]);
    if (!r.rows.length) return res.status(403).json({ message: 'غير مصرح' });
    const req2 = r.rows[0];
    if (req2.assigned_provider_id) {
      await notify(req2.assigned_provider_id, '🎉 اكتمل المشروع', `مشروع "${req2.title}" اكتمل`, 'completed', req2.id);
      await sendPush([req2.assigned_provider_id], '🎉 اكتمل المشروع', `"${req2.title}" اكتمل بنجاح!`, { type: 'completed', requestId: req2.id });
    }
    res.json(req2);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── BIDS ──
app.get('/api/requests/:id/bids', async (req, res) => {
  try {
    const reqId = parseInt(req.params.id);
    if (isNaN(reqId)) return res.status(400).json({ message: 'معرف غير صحيح' });
    const bidsRes = await pool.query(`
      SELECT b.id, b.request_id, b.provider_id, b.price, b.days,
             b.note, b.status, b.created_at,
             u.name AS provider_name, u.city AS provider_city,
             u.badge AS provider_badge, u.specialties AS provider_specialties,
             u.phone AS provider_phone, u.profile_image AS provider_image
      FROM bids b LEFT JOIN users u ON u.id = b.provider_id
      WHERE b.request_id = $1 ORDER BY b.created_at ASC`, [reqId]);
    const bids = bidsRes.rows;
    for (let i = 0; i < bids.length; i++) {
      const b = bids[i];
      try {
        const rv = await pool.query(
          'SELECT COALESCE(AVG(rating),0) as avg, COUNT(*) as cnt FROM reviews WHERE reviewed_id=$1',
          [b.provider_id]);
        b.avg_rating = parseFloat(rv.rows[0].avg) || 0;
        b.review_count = parseInt(rv.rows[0].cnt) || 0;
      } catch(e2) { b.avg_rating = 0; b.review_count = 0; }
    }
    const order = { accepted: 0, pending: 1, rejected: 2 };
    bids.sort((a, b) => (order[a.status]??1) - (order[b.status]??1));
    res.json(bids);
  } catch(e) { console.error('GET /bids error:', e.message); res.status(500).json({ message: e.message }); }
});

async function handleSubmitBid(req, res, requestId) {
  try {
    const { price, note } = req.body;
    const days = req.body.days || req.body.delivery_days;
    if (!price || !days) return res.status(400).json({ message: 'السعر والمدة مطلوبان' });
    const reqData = await pool.query('SELECT * FROM requests WHERE id=$1', [requestId]);
    if (!reqData.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (!['open','pending_review'].includes(reqData.rows[0].status))
      return res.status(400).json({ message: 'الطلب غير متاح للعروض' });
    const existing = await pool.query('SELECT id FROM bids WHERE request_id=$1 AND provider_id=$2', [requestId, req.user.id]);
    if (existing.rows.length) return res.status(400).json({ message: 'قدمت عرضاً على هذا الطلب مسبقاً' });
    const r = await pool.query(
      'INSERT INTO bids(request_id,provider_id,price,days,note) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [requestId, req.user.id, price, days, note||null]);
    await notify(reqData.rows[0].client_id, '💼 عرض جديد', `وصلك عرض جديد على: ${reqData.rows[0].title}`, 'bid', requestId);
    await sendPush([reqData.rows[0].client_id], '💼 عرض جديد', `وصلك عرض جديد على: ${reqData.rows[0].title}`, { type: 'bid', requestId });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
}

app.post('/api/requests/:id/bids', auth, (req, res) => handleSubmitBid(req, res, req.params.id));
app.post('/api/bids', auth, (req, res) => {
  const requestId = req.body.request_id;
  if (!requestId) return res.status(400).json({ message: 'request_id مطلوب' });
  handleSubmitBid(req, res, requestId);
});

app.put('/api/bids/:id/accept', auth, async (req, res) => {
  try {
    const bid = await pool.query(
      'SELECT b.*,r.client_id,r.title,r.id as req_id FROM bids b JOIN requests r ON b.request_id=r.id WHERE b.id=$1',
      [req.params.id]);
    if (!bid.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    const b = bid.rows[0];
    if (b.client_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'غير مصرح' });
    await pool.query('UPDATE bids SET status=$1 WHERE id=$2', ['accepted', req.params.id]);
    await pool.query('UPDATE bids SET status=$1 WHERE request_id=$2 AND id!=$3', ['rejected', b.request_id, req.params.id]);
    await pool.query('UPDATE requests SET status=$1,accepted_bid_id=$2,assigned_provider_id=$3,assigned_at=NOW() WHERE id=$4',
      ['in_progress', req.params.id, b.provider_id, b.request_id]);
    await notify(b.provider_id, '✅ تم قبول عرضك', `تم قبول عرضك على: ${b.title}`, 'accepted', b.request_id);
    await sendPush([b.provider_id], '✅ تم قبول عرضك!', `مبروك! تم قبول عرضك على: ${b.title}`, { type: 'accepted', requestId: b.request_id });
    const rejected = await pool.query(
      'SELECT b.provider_id FROM bids b WHERE b.request_id=$1 AND b.id!=$2', [b.request_id, req.params.id]);
    for (const rb of rejected.rows) {
      await notify(rb.provider_id, '❌ تم رفض عرضك', `تم اختيار مزود آخر لـ: ${b.title}`, 'rejected', b.request_id);
    }
    res.json({ message: 'تم قبول العرض' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/bids/:id/reject', auth, async (req, res) => {
  try {
    const bid = await pool.query(
      'SELECT b.*,r.client_id,r.title,r.id as req_id FROM bids b JOIN requests r ON b.request_id=r.id WHERE b.id=$1',
      [req.params.id]);
    if (!bid.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    const b = bid.rows[0];
    if (b.client_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'غير مصرح' });
    await pool.query('UPDATE bids SET status=$1 WHERE id=$2', ['rejected', req.params.id]);
    await notify(b.provider_id, '❌ تم رفض عرضك', `تم رفض عرضك على: ${b.title}`, 'rejected', b.req_id);
    res.json({ message: 'تم رفض العرض' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/bids/my', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT b.*,r.title as request_title,r.city,r.category,r.status as request_status,
      r.client_id,r.project_number,r.image_url
      FROM bids b JOIN requests r ON b.request_id=r.id
      WHERE b.provider_id=$1 ORDER BY b.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/provider/bids', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT b.*,r.title as request_title,r.city,r.category,r.status as request_status,
      r.client_id,r.project_number,r.image_url,u.name as client_name
      FROM bids b JOIN requests r ON b.request_id=r.id JOIN users u ON r.client_id=u.id
      WHERE b.provider_id=$1 ORDER BY b.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/bids/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM bids WHERE id=$1 AND provider_id=$2', [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── MESSAGES ──
app.get('/api/messages/:requestId', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT m.*,u.name as sender_name,u.role as sender_role FROM messages m
      JOIN users u ON m.sender_id=u.id
      WHERE m.request_id=$1 AND (m.sender_id=$2 OR m.receiver_id=$2 OR $3='admin')
      ORDER BY m.created_at ASC`,
      [req.params.requestId, req.user.id, req.user.role]);
    await pool.query('UPDATE messages SET is_read=TRUE WHERE request_id=$1 AND receiver_id=$2',
      [req.params.requestId, req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/messages', auth, async (req, res) => {
  try {
    const { request_id, receiver_id, content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: 'الرسالة فارغة' });
    const r = await pool.query(
      'INSERT INTO messages(request_id,sender_id,receiver_id,content) VALUES($1,$2,$3,$4) RETURNING *',
      [request_id, req.user.id, receiver_id, content]);
    const sender = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    await notify(receiver_id, '💬 رسالة جديدة', `${sender.rows[0].name}: ${content.substring(0,50)}`, 'message', request_id);
    await sendPush([receiver_id], `💬 ${sender.rows[0].name}`, content.substring(0,80), { type: 'message', requestId: request_id });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/provider/conversations', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT DISTINCT ON (r.id)
        r.id as request_id, r.title as request_title, r.client_id,
        u.name as client_name, u.profile_image as client_image,
        m.content as last_message, m.created_at as last_time,
        (SELECT COUNT(*) FROM messages WHERE request_id=r.id AND receiver_id=$1 AND is_read=FALSE) as unread
      FROM messages m
      JOIN requests r ON m.request_id=r.id
      JOIN users u ON r.client_id=u.id
      WHERE (m.sender_id=$1 OR m.receiver_id=$1)
      ORDER BY r.id, m.created_at DESC`,
      [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── REVIEWS ──
app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { request_id, reviewed_id, rating, comment, type } = req.body;
    const exists = await pool.query('SELECT id FROM reviews WHERE request_id=$1 AND reviewer_id=$2', [request_id, req.user.id]);
    if (exists.rows.length) return res.status(400).json({ message: 'قيّمت هذا الطلب مسبقاً' });
    const r = await pool.query(
      'INSERT INTO reviews(request_id,reviewer_id,reviewed_id,rating,comment,type) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [request_id, req.user.id, reviewed_id, rating, comment||null, type||'client_to_provider']);
    const reviewer = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    await notify(reviewed_id, `⭐ تقييم جديد (${rating}/5)`, `${reviewer.rows[0].name} قيّمك بـ ${rating} نجوم`, 'review', request_id);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/reviews/provider/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.*,u.name as reviewer_name,rq.title as request_title
      FROM reviews rv JOIN users u ON rv.reviewer_id=u.id JOIN requests rq ON rv.request_id=rq.id
      WHERE rv.reviewed_id=$1 ORDER BY rv.created_at DESC`, [req.params.id]);
    const avg = r.rows.length ? (r.rows.reduce((s,x)=>s+Number(x.rating),0)/r.rows.length).toFixed(1) : 0;
    const dist = [5,4,3,2,1].map(star => ({
      star, count: r.rows.filter(x=>Math.round(x.rating)===star).length
    }));
    res.json({ reviews: r.rows, average: parseFloat(avg), count: r.rows.length, distribution: dist });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/ratings/provider/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.*, u.name as reviewer_name, rq.title as request_title
      FROM reviews rv JOIN users u ON rv.reviewer_id=u.id JOIN requests rq ON rv.request_id=rq.id
      WHERE rv.reviewed_id=$1 AND rv.type='client_to_provider'
      ORDER BY rv.created_at DESC`, [req.params.id]);
    const avg = r.rows.length ? (r.rows.reduce((s,x)=>s+Number(x.rating),0)/r.rows.length).toFixed(1) : 0;
    const dist = [5,4,3,2,1].map(star => ({
      star, count: r.rows.filter(x=>Math.round(x.rating)===star).length
    }));
    res.json({ reviews: r.rows, average: parseFloat(avg), count: r.rows.length, distribution: dist });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── NOTIFICATIONS ──
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/provider/notifications', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/provider/notifications/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── PROFILE ──
app.get('/api/provider/:id/profile', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id,name,city,phone,specialties,bio,badge,experience_years,
             portfolio_images,profile_image,created_at,
             COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
             COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
             (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
      FROM users WHERE id=$1 AND role='provider'`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'المزود غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/provider/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id,name,email,phone,city,specialties,notify_categories,bio,badge,
             experience_years,portfolio_images,profile_image,created_at,
             COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
             COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
             (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects,
             (SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as total_bids
      FROM users WHERE id=$1`, [req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ✅ FIX: Added email to provider profile update
app.put('/api/provider/profile', auth, async (req, res) => {
  try {
    const { name, phone, email, city, bio, specialties, experience_years, portfolio_images, profile_image, notify_categories } = req.body;
    const fields = []; const vals = []; let idx = 1;
    if (name !== undefined) { fields.push(`name=$${idx++}`); vals.push(name); }
    if (phone !== undefined) { fields.push(`phone=$${idx++}`); vals.push(phone||null); }
    if (email !== undefined) { fields.push(`email=$${idx++}`); vals.push(email||null); }
    if (city !== undefined) { fields.push(`city=$${idx++}`); vals.push(city||null); }
    if (bio !== undefined) { fields.push(`bio=$${idx++}`); vals.push(bio||null); }
    if (specialties !== undefined) { fields.push(`specialties=$${idx++}`); vals.push(specialties||null); }
    if (experience_years !== undefined) { fields.push(`experience_years=$${idx++}`); vals.push(experience_years||null); }
    if (portfolio_images !== undefined) { fields.push(`portfolio_images=$${idx++}`); vals.push(portfolio_images||null); }
    if (profile_image !== undefined) { fields.push(`profile_image=$${idx++}`); vals.push(profile_image); }
    if (specialties !== undefined && notify_categories === undefined) {
      const nc = specialties && specialties.length ? specialties.slice(0,3) : null;
      fields.push(`notify_categories=$${idx++}`); vals.push(nc);
    } else if (notify_categories !== undefined) {
      const nc = notify_categories && notify_categories.length ? notify_categories.slice(0,3) : null;
      fields.push(`notify_categories=$${idx++}`); vals.push(nc);
    }
    if (!fields.length) return res.status(400).json({ message: 'لا يوجد بيانات للتحديث' });
    vals.push(req.user.id);
    const r = await pool.query(
      `UPDATE users SET ${fields.join(',')} WHERE id=$${idx} RETURNING id,name,email,phone,city,bio,specialties,notify_categories,badge,experience_years,portfolio_images,profile_image`,
      vals);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/provider/profile/portfolio', auth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'الصورة مطلوبة' });
    const r = await pool.query('SELECT portfolio_images FROM users WHERE id=$1', [req.user.id]);
    const imgs = r.rows[0]?.portfolio_images || [];
    if (imgs.length >= 6) return res.status(400).json({ message: 'الحد الأقصى 6 صور' });
    imgs.push(image);
    await pool.query('UPDATE users SET portfolio_images=$1 WHERE id=$2', [imgs, req.user.id]);
    res.json({ ok: true, count: imgs.length });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/provider/profile/portfolio/:index', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.index);
    const r = await pool.query('SELECT portfolio_images FROM users WHERE id=$1', [req.user.id]);
    const imgs = r.rows[0]?.portfolio_images || [];
    imgs.splice(idx, 1);
    await pool.query('UPDATE users SET portfolio_images=$1 WHERE id=$2', [imgs, req.user.id]);
    res.json({ ok: true, count: imgs.length });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/provider/projects', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*,u.name as client_name,
        (SELECT b.price FROM bids b WHERE b.id=r.accepted_bid_id LIMIT 1) as price
      FROM requests r JOIN users u ON r.client_id=u.id
      WHERE r.assigned_provider_id=$1 ORDER BY r.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/provider/reviews', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.*,u.name as reviewer_name,rq.title as request_title
      FROM reviews rv JOIN users u ON rv.reviewer_id=u.id JOIN requests rq ON rv.request_id=rq.id
      WHERE rv.reviewed_id=$1 ORDER BY rv.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── CLIENT PROFILE ──
app.get('/api/client/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id,name,email,phone,city,profile_image,created_at,
      (SELECT COUNT(*) FROM requests WHERE client_id=users.id) as total_projects,
      (SELECT COUNT(*) FROM requests WHERE client_id=users.id AND status='completed') as completed_projects
      FROM users WHERE id=$1`, [req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/client/profile', auth, async (req, res) => {
  try {
    const { name, phone, email, city, profile_image } = req.body;
    const fields = []; const vals = []; let idx = 1;
    if (name !== undefined) { fields.push(`name=$${idx++}`); vals.push(name); }
    if (phone !== undefined) { fields.push(`phone=$${idx++}`); vals.push(phone||null); }
    if (email !== undefined) { fields.push(`email=$${idx++}`); vals.push(email||null); }
    if (city !== undefined) { fields.push(`city=$${idx++}`); vals.push(city||null); }
    if (profile_image !== undefined) { fields.push(`profile_image=$${idx++}`); vals.push(profile_image); }
    if (!fields.length) return res.status(400).json({ message: 'لا يوجد بيانات' });
    vals.push(req.user.id);
    const r = await pool.query(
      `UPDATE users SET ${fields.join(',')} WHERE id=$${idx} RETURNING id,name,email,phone,city,profile_image`,
      vals);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── FAVORITES ──
app.get('/api/favorites', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT f.id, f.provider_id, f.created_at,
        u.name, u.city, u.specialties, u.badge,
        COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=u.id),0) as avg_rating
      FROM favorites f JOIN users u ON f.provider_id=u.id
      WHERE f.user_id=$1 ORDER BY f.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/favorites/:providerId', auth, async (req, res) => {
  try {
    const { providerId } = req.params;
    const exists = await pool.query('SELECT id FROM favorites WHERE user_id=$1 AND provider_id=$2', [req.user.id, providerId]);
    if (exists.rows.length) {
      await pool.query('DELETE FROM favorites WHERE user_id=$1 AND provider_id=$2', [req.user.id, providerId]);
      return res.json({ saved: false });
    }
    await pool.query('INSERT INTO favorites(user_id,provider_id) VALUES($1,$2)', [req.user.id, providerId]);
    res.json({ saved: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── REPORTS ──
app.post('/api/reports', auth, async (req, res) => {
  try {
    const { reported_id, request_id, type, reason, details } = req.body;
    if (!reported_id || !reason) return res.status(400).json({ message: 'البيانات ناقصة' });
    if (Number(reported_id) === Number(req.user.id)) return res.status(400).json({ message: 'لا يمكن الإبلاغ عن نفسك' });
    if (request_id) {
      const dup = await pool.query(
        'SELECT id FROM reports WHERE reporter_id=$1 AND reported_id=$2 AND request_id=$3',
        [req.user.id, reported_id, request_id]);
      if (dup.rows.length) return res.status(400).json({ message: 'أرسلت بلاغاً مسبقاً على هذا الشخص في هذا الطلب' });
    }
    const r = await pool.query(
      'INSERT INTO reports(reporter_id,reported_id,request_id,type,reason,details) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [req.user.id, reported_id, request_id||null, type||'user', reason, details||null]);
    const admins = await pool.query("SELECT id FROM users WHERE role='admin'");
    const reporter = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    for (const a of admins.rows) {
      await notify(a.id, 'بلاغ جديد بانتظار المراجعة',
        `${reporter.rows[0]?.name||'مستخدم'} أبلغ عن مستخدم — السبب: ${reason}`, 'report', r.rows[0].id);
    }
    res.json({ ok: true, message: 'تم إرسال البلاغ وسيتم مراجعته خلال 24 ساعة' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── ADMIN ──
app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const [u,r,b,p,pending,inprog,done] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM requests'),
      pool.query('SELECT COUNT(*) FROM bids'),
      pool.query(`SELECT COUNT(*) FROM users WHERE role='provider'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='pending_review'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='in_progress'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='completed'`),
    ]);
    res.json({
      total_users:+u.rows[0].count, requests:+r.rows[0].count,
      total_bids:+b.rows[0].count, providers:+p.rows[0].count,
      pending_review:+pending.rows[0].count, in_progress:+inprog.rows[0].count,
      completed:+done.rows[0].count
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/requests', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const VALID = ['pending_review','open','in_progress','completed','rejected'];
    let q = `SELECT r.*,u.name as client_name,p.name as provider_name,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id LEFT JOIN users p ON r.assigned_provider_id=p.id`;
    const params = [];
    if (status && VALID.includes(status)) { params.push(status); q += ` WHERE r.status=$1`; }
    q += ' ORDER BY r.created_at DESC';
    res.json((await pool.query(q, params)).rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/requests/:id/review', auth, adminOnly, async (req, res) => {
  try {
    const { action, reason } = req.body;
    const newStatus = action === 'approve' ? 'open' : 'rejected';
    const r = await pool.query(
      'UPDATE requests SET status=$1,admin_notes=$2 WHERE id=$3 RETURNING *',
      [newStatus, reason||null, req.params.id]);
    const req2 = r.rows[0];
    if (newStatus === 'open') {
      await notify(req2.client_id, '✅ تمت الموافقة', `طلبك "${req2.title}" نُشر الآن`, 'approved', req2.id);
      notifyInterestedProviders(req2.id, req2.title, req2.category).catch(()=>{});
    } else {
      await notify(req2.client_id, '❌ تم رفض طلبك', `طلبك "${req2.title}". السبب: ${reason||'غير محدد'}`, 'rejected', req2.id);
    }
    res.json(req2);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/requests/:id', auth, adminOnly, async (req, res) => {
  try {
    const { title, description, category, city, address, budget_max, deadline, admin_notes } = req.body;
    const r = await pool.query(
      `UPDATE requests SET title=$1,description=$2,category=$3,city=$4,address=$5,budget_max=$6,deadline=$7,admin_notes=$8 WHERE id=$9 RETURNING *`,
      [title, description, category||null, city||null, address||null, budget_max||null, deadline||null, admin_notes||null, req.params.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/requests/:id/complete', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`UPDATE requests SET status='completed',completed_at=NOW() WHERE id=$1 RETURNING *`, [req.params.id]);
    const req2 = r.rows[0];
    if (req2.client_id) await notify(req2.client_id, '🎉 اكتمل المشروع', `"${req2.title}" اكتمل`, 'completed', req2.id);
    if (req2.assigned_provider_id) await notify(req2.assigned_provider_id, '🎉 اكتمل المشروع', `"${req2.title}" اكتمل`, 'completed', req2.id);
    res.json(req2);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/requests/:id', auth, adminOnly, async (req, res) => {
  try { await pool.query('DELETE FROM requests WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.query;
    const VALID_ROLES = ['client','provider','admin'];
    let q = 'SELECT id,name,email,phone,role,specialties,city,badge,is_active,created_at FROM users';
    const params = [];
    if (role && VALID_ROLES.includes(role)) { params.push(role); q += ` WHERE role=$1`; }
    q += ' ORDER BY created_at DESC';
    res.json((await pool.query(q, params)).rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/users/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query('UPDATE users SET is_active=NOT is_active WHERE id=$1 RETURNING id,name,is_active', [req.params.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/users/:id/badge', auth, adminOnly, async (req, res) => {
  try {
    const { badge } = req.body;
    const r = await pool.query('UPDATE users SET badge=$1 WHERE id=$2 RETURNING id,name,badge', [badge, req.params.id]);
    await notify(parseInt(req.params.id), '🏆 وسام جديد', `تهانينا! حصلت على وسام: ${badge}`, 'badge', null);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try { await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/providers', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id,name,email,phone,city,specialties,notify_categories,badge,is_active,bio,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
      (SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as bid_count,
      (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
      FROM users WHERE role='provider' ORDER BY avg_rating DESC`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/notify', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, role, title, body, type, channel, specialty } = req.body;
    const ch = channel || 'both';
    const VALID_ROLES = ['client','provider','admin'];
    let targetUsers = [];
    if (user_id) {
      const r = await pool.query('SELECT id,email,name FROM users WHERE id=$1', [user_id]);
      targetUsers = r.rows;
    } else {
      let q = 'SELECT id,email,name FROM users WHERE is_active=TRUE';
      const params = [];
      if (role && VALID_ROLES.includes(role)) { params.push(role); q += ` AND role=$${params.length}`; }
      if (specialty && typeof specialty === 'string' && specialty !== 'الكل') {
        if (!role) q += ` AND role='provider'`;
        params.push(specialty);
        const pn = params.length;
        q += ` AND ((specialties IS NOT NULL AND $${pn}::text = ANY(specialties)) OR (notify_categories IS NOT NULL AND $${pn}::text = ANY(notify_categories)))`;
      }
      const r = await pool.query(q, params);
      targetUsers = r.rows;
    }
    for (const u of targetUsers) {
      await notify(u.id, title, body, type||'admin', null);
      if (ch === 'both' || ch === 'push') await sendPush([u.id], title, body, { type: type||'admin' });
      if ((ch === 'both' || ch === 'email') && u.email) {
        await sendEmail(u.email, title, emailTpl(title,
          `<p>${body.replace(/\n/g,'<br>')}</p>
           <div style="background:#f4f7fb;border-right:3px solid #1B3A6B;border-radius:8px;padding:12px 16px;margin-top:14px">
             <p style="font-size:12px;color:#6b85a8;margin:0">هذه رسالة رسمية من إدارة منصة مناقصة.</p>
           </div>`, null, null));
      }
    }
    res.json({ ok: true, sent: targetUsers.length });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/reviews', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.*,u1.name as reviewer_name,u2.name as reviewed_name,rq.title as request_title
      FROM reviews rv JOIN users u1 ON rv.reviewer_id=u1.id JOIN users u2 ON rv.reviewed_id=u2.id
      JOIN requests rq ON rv.request_id=rq.id ORDER BY rv.created_at DESC`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/reviews/:id', auth, adminOnly, async (req, res) => {
  try { await pool.query('DELETE FROM reviews WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/reports', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*,
        COALESCE(u1.name,'مستخدم محذوف') as reporter_name,
        COALESCE(u2.name,'مستخدم محذوف') as reported_name,
        COALESCE(u2.role,'unknown') as reported_role,
        rq.title as request_title
      FROM reports r
      LEFT JOIN users u1 ON r.reporter_id=u1.id
      LEFT JOIN users u2 ON r.reported_id=u2.id
      LEFT JOIN requests rq ON r.request_id=rq.id
      ORDER BY r.created_at DESC`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/reports/:id', auth, adminOnly, async (req, res) => {
  try {
    const { action, admin_note } = req.body;
    const report = await pool.query('SELECT * FROM reports WHERE id=$1', [req.params.id]);
    if (!report.rows.length) return res.status(404).json({ message: 'البلاغ غير موجود' });
    const b = report.rows[0];
    const newStatus = action === 'ignore' ? 'ignored' : action === 'warn' ? 'warned' : 'resolved';
    await pool.query('ALTER TABLE reports ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP').catch(()=>{});
    await pool.query('UPDATE reports SET status=$1, admin_note=$2, reviewed_at=NOW() WHERE id=$3',
      [newStatus, admin_note||null, req.params.id]);
    const reportedUser = await pool.query('SELECT name, email FROM users WHERE id=$1', [b.reported_id]);
    const reporterUser = await pool.query('SELECT name, email FROM users WHERE id=$1', [b.reporter_id]);
    const rUser = reportedUser.rows[0] || {};
    const repUser = reporterUser.rows[0] || {};
    if (action === 'warn') {
      await pool.query('UPDATE users SET report_count=COALESCE(report_count,0)+1 WHERE id=$1', [b.reported_id]);
      const warnMsg = admin_note || 'تلقيت تحذيراً من إدارة منصة مناقصة بسبب بلاغ مقدم ضدك.';
      await notify(b.reported_id, 'تحذير من الإدارة', warnMsg, 'warning', null);
      if (rUser.email) {
        await sendEmail(rUser.email, 'تحذير من إدارة مناقصة',
          emailTpl('تحذير رسمي من الإدارة',
            `<div style="background:#fef2f2;border-right:4px solid #dc2626;border-radius:0 10px 10px 0;padding:14px 16px;margin-bottom:14px">
              <div style="font-size:14px;font-weight:800;color:#991b1b;margin-bottom:6px">تحذير رسمي</div>
              <p style="font-size:13px;color:#7f1d1d;line-height:1.8;margin:0">${warnMsg}</p>
            </div>`, null, null));
      }
    }
    if (action === 'ban') {
      await pool.query('UPDATE users SET is_active=FALSE WHERE id=$1', [b.reported_id]);
      const banMsg = admin_note || 'تم إيقاف حسابك بسبب مخالفة شروط الاستخدام.';
      await notify(b.reported_id, 'تم إيقاف حسابك', banMsg, 'ban', null);
      if (rUser.email) {
        await sendEmail(rUser.email, 'إيقاف حساب مناقصة',
          emailTpl('تم إيقاف حسابك',
            `<div style="background:#fef2f2;border-right:4px solid #dc2626;border-radius:0 10px 10px 0;padding:14px 16px;margin-bottom:14px">
              <p style="font-size:13px;color:#7f1d1d;line-height:1.8;margin:0">${banMsg}</p>
            </div>`, null, null));
      }
    }
    await notify(b.reporter_id, 'تمت مراجعة بلاغك', 'شكراً، تمت مراجعة بلاغك واتخاذ الإجراء المناسب.', 'report_resolved', null);
    if (repUser.email) {
      await sendEmail(repUser.email, 'تمت مراجعة بلاغك',
        emailTpl('تمت مراجعة بلاغك',
          `<p>شكراً على إبلاغك — تمت مراجعة البلاغ واتخاذ الإجراء المناسب.</p>`, null, null));
    }
    res.json({ ok: true, message: 'تم تنفيذ الاجراء: ' + action });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/charts', auth, adminOnly, async (req, res) => {
  try {
    const [byStatus, byCategory, byMonth] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM requests GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT category, COUNT(*) as count FROM requests WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 8`),
      pool.query(`SELECT TO_CHAR(created_at,'YYYY-MM') as month, COUNT(*) as count FROM requests WHERE created_at >= NOW() - INTERVAL '6 months' GROUP BY month ORDER BY month ASC`),
    ]);
    res.json({ by_status: byStatus.rows, by_category: byCategory.rows, by_month: byMonth.rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/search', auth, adminOnly, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return res.json({ requests: [], users: [] });
    const term = '%' + q.trim() + '%';
    const [reqs, users] = await Promise.all([
      pool.query(`SELECT r.id,r.title,r.status,r.project_number,u.name as client_name FROM requests r JOIN users u ON r.client_id=u.id WHERE r.title ILIKE $1 OR r.project_number ILIKE $1 LIMIT 5`, [term]),
      pool.query(`SELECT id,name,email,role,is_active FROM users WHERE name ILIKE $1 OR email ILIKE $1 LIMIT 5`, [term])
    ]);
    res.json({ requests: reqs.rows, users: users.rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ────────────────────────────────────────────
initDB().then(() =>
  server.listen(process.env.PORT||3000, () =>
    console.log('🚀 Server running on port', process.env.PORT||3000)
  )
);
