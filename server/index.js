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

function emailTpl(title, body, btnText, btnUrl) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>
    body{font-family:Tahoma,Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px}
    .box{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .head{background:#1B3A6B;padding:24px;text-align:center}
    .head h1{color:#fff;margin:0;font-size:20px}
    .head p{color:rgba(255,255,255,.7);margin:6px 0 0;font-size:13px}
    .body{padding:28px 32px}.body p{color:#374151;font-size:14px;line-height:1.9;margin:0 0 14px}
    .btn{display:inline-block;background:#2C5282;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;margin:8px 0}
    .hl{background:#E6EEF8;border-right:3px solid #2C5282;padding:12px 16px;border-radius:8px;margin:12px 0;font-size:13px;color:#1B2B4B}
    .ok{background:#E1F5EE;border-right:3px solid #1D9E75;padding:12px 16px;border-radius:8px;margin:12px 0;font-size:13px;color:#085041}
    .ng{background:#FCEBEB;border-right:3px solid #E24B4A;padding:12px 16px;border-radius:8px;margin:12px 0;font-size:13px;color:#7f1d1d}
    .foot{background:#f9fafb;padding:14px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb}
  </style></head><body><div class="box">
    <div class="head"><h1>🏆 مناقصة</h1><p>منصة مناقصة للخدمات</p></div>
    <div class="body"><p><strong>${title}</strong></p>${body}
      ${btnText&&btnUrl?`<p style="text-align:center;margin-top:20px"><a href="${btnUrl}" class="btn">${btnText}</a></p>`:''}
    </div>
    <div class="foot">© 2025 منصة مناقصة — manaqasa.com</div>
  </div></body></html>`;
}

function genProjectNum(id, date) {
  const d = new Date(date);
  return `MNQ-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(id).padStart(4,'0')}`;
}

// ── DB INIT ──
async function initDB() {
  // إنشاء الجداول
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255),
      phone VARCHAR(20),
      role VARCHAR(20) DEFAULT 'client',
      specialties TEXT[],
      notify_categories TEXT[],
      bio TEXT,
      city VARCHAR(100),
      badge VARCHAR(50) DEFAULT 'none',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      project_number VARCHAR(50),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      city VARCHAR(100),
      address TEXT,
      budget_max INTEGER,
      deadline DATE,
      image_url TEXT,
      images TEXT[],
      main_image_index INTEGER DEFAULT 0,
      status VARCHAR(30) DEFAULT 'pending_review',
      client_id INTEGER REFERENCES users(id),
      accepted_bid_id INTEGER,
      assigned_provider_id INTEGER REFERENCES users(id),
      assigned_at TIMESTAMP,
      completed_at TIMESTAMP,
      admin_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES users(id),
      price INTEGER NOT NULL,
      days INTEGER NOT NULL,
      note TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(request_id, provider_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
      sender_id INTEGER REFERENCES users(id),
      receiver_id INTEGER REFERENCES users(id),
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES requests(id),
      reviewer_id INTEGER REFERENCES users(id),
      reviewed_id INTEGER REFERENCES users(id),
      rating INTEGER CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      type VARCHAR(30),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(request_id, reviewer_id)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      title VARCHAR(255),
      body TEXT,
      type VARCHAR(50),
      ref_id INTEGER,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // ترحيل: إعادة تسمية password_hash → password
  try {
    await pool.query(`ALTER TABLE users RENAME COLUMN password_hash TO password`);
    console.log('✅ تم تسمية password_hash → password');
  } catch(e) {
    if (!e.message.includes('does not exist') && !e.message.includes('already exists')) {
      console.log('rename note:', e.message);
    }
  }

  // إزالة NOT NULL عن password
  try {
    await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`);
  } catch(e) {}

  // إضافة أعمدة مفقودة
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
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS project_number VARCHAR(50)`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS address TEXT`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS deadline DATE`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS image_url TEXT`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS images TEXT[]`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS main_image_index INTEGER DEFAULT 0`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS accepted_bid_id INTEGER`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS assigned_provider_id INTEGER`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS admin_notes TEXT`,
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_id INTEGER REFERENCES users(id)`,
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewed_id INTEGER REFERENCES users(id)`,
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS type VARCHAR(30)`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(50)`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ref_id INTEGER`,
  ];
  for (const sql of alters) await pool.query(sql).catch(()=>{});

  // توليد أرقام المشاريع المفقودة
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

// ────────────────────────────────────────────
// ── WEBSOCKET SERVER ──
// ────────────────────────────────────────────

const wss = new WebSocketServer({ server });

// Map: userId => Set<ws>
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

      if (data.type === 'typing') {
        const { receiver_id, request_id, is_typing } = data;
        if (!receiver_id) return;
        broadcast([receiver_id], { type: 'typing', from: ws.userId, request_id, is_typing });
      }

      if (data.type === 'read') {
        const { request_id, sender_id } = data;
        await pool.query(
          'UPDATE messages SET is_read=TRUE WHERE request_id=$1 AND receiver_id=$2 AND sender_id=$3',
          [request_id, ws.userId, sender_id]);
        broadcast([sender_id], { type: 'read', request_id, reader_id: ws.userId });
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
    const provs = await pool.query(
      `SELECT id,name,email FROM users WHERE role='provider' AND is_active=TRUE
       AND notify_categories IS NOT NULL AND $1=ANY(notify_categories)`,
      [category]
    );
    for (const p of provs.rows) {
      await notify(p.id, '🔔 مناقصة جديدة في تخصصك', `نُشرت: "${title}" في ${category}`, 'bid', reqId);
      if (p.email) {
        await sendEmail(p.email, `🔔 مناقصة جديدة: ${title}`,
          emailTpl('مناقصة جديدة تهمك! 🔔',
            `<p>مرحباً <strong>${p.name}</strong>،</p>
             <p>نُشرت مناقصة جديدة في مجال <strong>${category}</strong>:</p>
             <div class="hl"><strong>${title}</strong></div>`,
            '💼 تقديم عرض', `${SITE_URL}/dashboard-provider.html`
          )
        );
      }
    }
  } catch(e) { console.error('notifyProviders:', e.message); }
}

// ────────────────────────────────────────────
// ── SETUP / FIX ENDPOINTS ──
// ────────────────────────────────────────────

// إصلاح قاعدة البيانات مباشرة
// /api/fix-db?secret=manaqasa2024
app.get('/api/fix-db', async (req, res) => {
  try {
    if (req.query.secret !== 'manaqasa2024') return res.status(403).json({ message: 'رمز خاطئ' });
    const results = [];
    try { await pool.query(`ALTER TABLE users RENAME COLUMN password_hash TO password`); results.push('✅ تم تسمية العمود'); } catch(e) { results.push('ℹ️ ' + e.message.substring(0,80)); }
    try { await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`); results.push('✅ تم إزالة NOT NULL'); } catch(e) { results.push('ℹ️ ' + e.message.substring(0,80)); }
    const cols = await pool.query(`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`);
    res.json({ ok: true, steps: results, columns: cols.rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// تعيين المدير مباشرة + إعادة تعيين كلمة المرور
// /api/direct-admin?secret=manaqasa2024&email=EMAIL&password=PASS
app.get('/api/direct-admin', async (req, res) => {
  try {
    if (req.query.secret !== 'manaqasa2024') return res.status(403).json({ message: 'رمز خاطئ' });
    const { email, password } = req.query;
    if (!email || !password) return res.json({ usage: '/api/direct-admin?secret=manaqasa2024&email=EMAIL&password=PASS' });

    // إصلاح العمود أولاً
    try { await pool.query(`ALTER TABLE users RENAME COLUMN password_hash TO password`); } catch(e) {}
    try { await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`); } catch(e) {}

    const hash = await bcrypt.hash(password, 10);
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);

    if (exists.rows.length) {
      await pool.query(`UPDATE users SET password=$1, role='admin', is_active=TRUE WHERE email=$2`, [hash, email]);
      res.json({ ok: true, message: '✅ تم تحديث كلمة المرور ودور المدير بنجاح', email });
    } else {
      await pool.query(`INSERT INTO users(name,email,password,role) VALUES('المدير',$1,$2,'admin')`, [email, hash]);
      res.json({ ok: true, message: '✅ تم إنشاء حساب المدير', email });
    }
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// إنشاء حساب المدير
// /api/setup-admin?secret=manaqasa2024&email=EMAIL&password=PASS&name=الاسم
app.get('/api/setup-admin', async (req, res) => {
  try {
    if (req.query.secret !== 'manaqasa2024') return res.status(403).json({ message: 'رابط غير صحيح' });
    const { email, password, name } = req.query;
    if (!email || !password || !name) return res.json({
      usage: '?secret=manaqasa2024&email=EMAIL&password=PASS&name=الاسم',
      example: `${req.protocol}://${req.get('host')}/api/setup-admin?secret=manaqasa2024&email=admin@manaqasa.com&password=Admin@123&name=المدير`
    });
    try { await pool.query(`ALTER TABLE users RENAME COLUMN password_hash TO password`); } catch(e) {}
    try { await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL`); } catch(e) {}
    const hash = await bcrypt.hash(password, 10);
    const exists = await pool.query('SELECT id,role FROM users WHERE email=$1', [email]);
    if (exists.rows.length) {
      await pool.query(`UPDATE users SET password=$1, role='admin', is_active=TRUE WHERE email=$2`, [hash, email]);
      return res.json({ ok: true, message: `✅ تم ترقية الحساب ${email} لمدير وتحديث كلمة المرور` });
    }
    const r = await pool.query(
      `INSERT INTO users(name,email,password,role) VALUES($1,$2,$3,'admin') RETURNING id,name,email,role`,
      [name, email, hash]
    );
    res.json({ ok: true, message: '✅ تم إنشاء حساب المدير بنجاح', user: r.rows[0] });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// التحقق من الحساب
app.get('/api/debug/bids/:id', async (req, res) => {
  try {
    const reqId = parseInt(req.params.id);
    const t1 = await pool.query('SELECT id, client_id, status FROM requests WHERE id=$1', [reqId]);
    if (!t1.rows.length) return res.json({ error: 'الطلب غير موجود', reqId });
    const t2 = await pool.query(`
      SELECT b.id, b.provider_id, b.price, b.status, b.days, b.note, b.created_at,
             u.name, u.city, u.badge
      FROM bids b 
      LEFT JOIN users u ON u.id = b.provider_id
      WHERE b.request_id=$1`, [reqId]);
    res.json({ request: t1.rows[0], bids: t2.rows, count: t2.rows.length });
  } catch(e) { 
    res.status(500).json({ error: e.message, stack: e.stack }); 
  }
});

// ────────────────────────────────────────────
// ── AUTH ──
// ────────────────────────────────────────────

app.get('/api/categories', (req, res) => res.json(CATEGORIES));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, specialties, bio, city } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'البيانات ناقصة' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(400).json({ message: 'البريد مسجل مسبقاً' });
    const hash = await bcrypt.hash(password, 10);
    const specs = role === 'provider' ? (specialties || []) : null;
    const r = await pool.query(
      'INSERT INTO users(name,email,password,phone,role,specialties,bio,city) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,name,email,role,specialties,bio,city,badge',
      [name, email, hash, phone||null, role||'client', specs, bio||null, city||null]
    );
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
    // يدعم كلا العمودين: password و password_hash
    const storedHash = user.password || user.password_hash || '';
    if (!storedHash) return res.status(400).json({ message: 'كلمة المرور غير مضبوطة — استخدم رابط إعادة التعيين' });
    const ok = await bcrypt.compare(password, storedHash);
    if (!ok) return res.status(400).json({ message: 'البيانات غير صحيحة' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    delete user.password;
    delete user.password_hash;
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
        `<p>اضغط الزر لإعادة تعيين كلمة المرور خلال ساعة.</p>`,
        '🔑 إعادة تعيين كلمة المرور', resetUrl));
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

// ────────────────────────────────────────────
// ── REQUESTS ──
// ────────────────────────────────────────────

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
    const { title, description, category, city, address, budget_max, deadline, image_url, images, main_image_index } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'العنوان والتفاصيل مطلوبة' });
    const mainIdx = parseInt(main_image_index) || 0;
    const mainImg = image_url || (images && images[mainIdx]) || null;
    // ── النشر مباشرة بحالة open ──
    const r = await pool.query(
      `INSERT INTO requests(title,description,category,city,address,budget_max,deadline,image_url,images,main_image_index,client_id,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'open') RETURNING *`,
      [title, description, category||null, city||null, address||null, budget_max||null, deadline||null, mainImg, images||null, mainIdx, req.user.id]
    );
    const req2 = r.rows[0];
    const num = genProjectNum(req2.id, req2.created_at);
    await pool.query('UPDATE requests SET project_number=$1 WHERE id=$2', [num, req2.id]);
    req2.project_number = num;
    // إشعار الأدمن
    const admins = await pool.query(`SELECT id FROM users WHERE role='admin'`);
    for (const a of admins.rows) await notify(a.id, '📋 طلب جديد', `${title} — نُشر تلقائياً`, 'new_request', req2.id);
    // إشعار المزودين المهتمين بهذا التصنيف
    notifyInterestedProviders(req2.id, req2.title, req2.category).catch(()=>{});
    res.json(req2);
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
      const prov = await pool.query('SELECT name,email FROM users WHERE id=$1', [req2.assigned_provider_id]);
      await notify(req2.assigned_provider_id, '🎉 اكتمل المشروع', `مشروع "${req2.title}" اكتمل`, 'completed', req2.id);
      if (prov.rows[0]?.email) {
        await sendEmail(prov.rows[0].email, `🎉 اكتمل المشروع: ${req2.title}`,
          emailTpl('مبروك! اكتمل المشروع 🎉',
            `<p>أكد العميل اكتمال مشروع <strong>"${req2.title}"</strong>.</p>`,
            '⭐ ملفي الشخصي', `${SITE_URL}/dashboard-provider.html`));
      }
    }
    const client = await pool.query('SELECT name,email FROM users WHERE id=$1', [req.user.id]);
    if (client.rows[0]?.email) {
      setTimeout(async () => {
        await sendEmail(client.rows[0].email, `⭐ قيّم تجربتك: ${req2.title}`,
          emailTpl('قيّم المزود الآن ⭐',
            `<p>اكتمل مشروعك <strong>"${req2.title}"</strong>! رأيك يساعد العملاء الآخرين.</p>`,
            '⭐ تقييم المزود', `${SITE_URL}/dashboard-client.html`)
        ).catch(()=>{});
      }, 3600000);
    }
    res.json(req2);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ────────────────────────────────────────────
// ── BIDS ──
// ────────────────────────────────────────────

app.get('/api/requests/:id/bids', async (req, res) => {
  try {
    const reqId = parseInt(req.params.id);
    if (isNaN(reqId)) return res.status(400).json({ message: 'معرف غير صحيح' });

    // جلب العروض مع معلومات المزود
    const bidsRes = await pool.query(
      `SELECT b.id, b.request_id, b.provider_id, b.price, b.days,
              b.note, b.status, b.created_at,
              u.name AS provider_name,
              u.city AS provider_city,
              u.badge AS provider_badge,
              u.specialties AS provider_specialties
       FROM bids b
       LEFT JOIN users u ON u.id = b.provider_id
       WHERE b.request_id = $1
       ORDER BY b.created_at ASC`,
      [reqId]
    );

    const bids = bidsRes.rows;

    // تقييمات المزودين
    for (let i = 0; i < bids.length; i++) {
      const b = bids[i];
      try {
        const rv = await pool.query(
          'SELECT COALESCE(AVG(rating),0) as avg, COUNT(*) as cnt FROM reviews WHERE reviewed_id=$1',
          [b.provider_id]
        );
        b.avg_rating = parseFloat(rv.rows[0].avg) || 0;
        b.review_count = parseInt(rv.rows[0].cnt) || 0;
      } catch(e2) {
        b.avg_rating = 0;
        b.review_count = 0;
      }
    }

    // ترتيب العروض
    const order = { accepted: 0, pending: 1, rejected: 2 };
    bids.sort(function(a, b) {
      const oa = order[a.status] !== undefined ? order[a.status] : 1;
      const ob = order[b.status] !== undefined ? order[b.status] : 1;
      return oa - ob;
    });

    res.json(bids);
  } catch(e) {
    console.error('GET /bids error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

async function handleSubmitBid(req, res, requestId) {
  try {
    const { price, days, note } = req.body;
    if (!price || !days) return res.status(400).json({ message: 'السعر والمدة مطلوبان' });
    const reqData = await pool.query('SELECT * FROM requests WHERE id=$1', [requestId]);
    if (!reqData.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (!['open','pending_review'].includes(reqData.rows[0].status)) return res.status(400).json({ message: 'الطلب غير متاح للعروض' });
    const existing = await pool.query('SELECT id FROM bids WHERE request_id=$1 AND provider_id=$2', [requestId, req.user.id]);
    if (existing.rows.length) return res.status(400).json({ message: 'قدمت عرضاً على هذا الطلب مسبقاً' });
    const r = await pool.query(
      'INSERT INTO bids(request_id,provider_id,price,days,note) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [requestId, req.user.id, price, days, note||null]
    );
    await notify(reqData.rows[0].client_id, '💼 عرض جديد', `وصلك عرض جديد على: ${reqData.rows[0].title}`, 'bid', requestId);
    // إشعار WebSocket فوري للعميل
    const providerInfo = await pool.query('SELECT name,city,specialties,badge FROM users WHERE id=$1', [req.user.id]);
    const pInfo = providerInfo.rows[0] || {};
    const avgR = await pool.query('SELECT COALESCE(AVG(rating),0) as avg, COUNT(*) as cnt FROM reviews WHERE reviewed_id=$1', [req.user.id]);
    broadcast([reqData.rows[0].client_id], {
      type: 'new_bid',
      bid: {
        ...r.rows[0],
        provider_name: pInfo.name,
        provider_city: pInfo.city,
        provider_specialties: pInfo.specialties,
        provider_badge: pInfo.badge,
        avg_rating: parseFloat(avgR.rows[0].avg) || 0,
        review_count: parseInt(avgR.rows[0].cnt) || 0
      },
      request_id: requestId
    });
    const provider = await pool.query('SELECT name,email FROM users WHERE id=$1', [req.user.id]);
    const client = await pool.query('SELECT name,email FROM users WHERE id=$1', [reqData.rows[0].client_id]);
    if (client.rows[0]?.email) {
      await sendEmail(client.rows[0].email, `💼 عرض جديد: ${reqData.rows[0].title}`,
        emailTpl('وصلك عرض جديد! 💼',
          `<p>قدّم <strong>${provider.rows[0].name}</strong> عرضاً على طلبك <strong>"${reqData.rows[0].title}"</strong>:</p>
           <div class="hl">السعر: <strong>${Number(price).toLocaleString('en-US')} ر.س</strong> | المدة: <strong>${days} يوم</strong></div>`,
          '👀 مراجعة العروض', `${SITE_URL}/dashboard-client.html`));
    }
    if (provider.rows[0]?.email) {
      await sendEmail(provider.rows[0].email, `✅ تم تقديم عرضك: ${reqData.rows[0].title}`,
        emailTpl('تم تقديم عرضك ✅',
          `<div class="ok">السعر: ${Number(price).toLocaleString('en-US')} ر.س | المدة: ${days} يوم</div>
           <p>سنُخطرك فور رد العميل.</p>`,
          '📋 عروضي', `${SITE_URL}/dashboard-provider.html`));
    }
    res.json(r.rows[0]);
  } catch(e) { console.error('submitBid:', e.message); res.status(500).json({ message: e.message }); }
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
    if (b.client_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'غير مصرح' });
    await pool.query('UPDATE bids SET status=$1 WHERE id=$2', ['accepted', req.params.id]);
    await pool.query('UPDATE bids SET status=$1 WHERE request_id=$2 AND id!=$3', ['rejected', b.request_id, req.params.id]);
    await pool.query('UPDATE requests SET status=$1,accepted_bid_id=$2,assigned_provider_id=$3,assigned_at=NOW() WHERE id=$4',
      ['in_progress', req.params.id, b.provider_id, b.request_id]);
    await notify(b.provider_id, '✅ تم قبول عرضك', `تم قبول عرضك على: ${b.title}`, 'accepted', b.request_id);
    const prov = await pool.query('SELECT name,email FROM users WHERE id=$1', [b.provider_id]);
    const client = await pool.query('SELECT name,email FROM users WHERE id=$1', [b.client_id]);
    if (prov.rows[0]?.email) {
      await sendEmail(prov.rows[0].email, `✅ تم قبول عرضك: ${b.title}`,
        emailTpl(`مبروك ${prov.rows[0].name}! 🎉`,
          `<div class="ok">المشروع: <strong>${b.title}</strong> | القيمة: <strong>${Number(b.price).toLocaleString('en-US')} ر.س</strong></div>`,
          '💬 تواصل مع العميل', `${SITE_URL}/dashboard-provider.html`));
    }
    if (client.rows[0]?.email) {
      await sendEmail(client.rows[0].email, `🎉 تم إسناد مشروعك: ${b.title}`,
        emailTpl('تم إسناد مشروعك 🎉',
          `<div class="hl">المزود: <strong>${prov.rows[0].name}</strong> | القيمة: <strong>${Number(b.price).toLocaleString('en-US')} ر.س</strong></div>`,
          '💬 تواصل مع المزود', `${SITE_URL}/dashboard-client.html`));
    }
    const rejected = await pool.query(
      'SELECT b.provider_id,u.email FROM bids b JOIN users u ON b.provider_id=u.id WHERE b.request_id=$1 AND b.id!=$2',
      [b.request_id, req.params.id]);
    for (const rb of rejected.rows) {
      await notify(rb.provider_id, '❌ تم رفض عرضك', `للأسف تم اختيار مزود آخر لـ: ${b.title}`, 'rejected', b.request_id);
      if (rb.email) {
        await sendEmail(rb.email, `❌ تم رفض عرضك: ${b.title}`,
          emailTpl('نأسف لإخبارك',
            `<div class="ng">المشروع: <strong>${b.title}</strong></div><p>هناك مناقصات أخرى تنتظرك!</p>`,
            '🔍 تصفح المناقصات', `${SITE_URL}/dashboard-provider.html`));
      }
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
    if (b.client_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'غير مصرح' });
    await pool.query('UPDATE bids SET status=$1 WHERE id=$2', ['rejected', req.params.id]);
    await notify(b.provider_id, '❌ تم رفض عرضك', `تم رفض عرضك على: ${b.title}`, 'rejected', b.req_id);
    res.json({ message: 'تم رفض العرض' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/bids/:id/revise', auth, async (req, res) => {
  try {
    const { price, days, revision_note } = req.body;
    if (!price || !days || !revision_note?.trim()) return res.status(400).json({ message: 'السعر والمدة وسبب التعديل مطلوبة' });
    const bid = await pool.query(
      'SELECT b.*,r.client_id,r.title,r.id as req_id FROM bids b JOIN requests r ON b.request_id=r.id WHERE b.id=$1 AND b.provider_id=$2',
      [req.params.id, req.user.id]);
    if (!bid.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    const b = bid.rows[0];
    if (b.status !== 'accepted') return res.status(400).json({ message: 'يمكن التعديل فقط على العروض المقبولة' });
    const note = `تعديل: السعر ${b.price}→${price} ر.س، المدة ${b.days}→${days} يوم. السبب: ${revision_note}`;
    await pool.query('UPDATE bids SET price=$1,days=$2,note=$3 WHERE id=$4', [price, days, note, req.params.id]);
    await notify(b.client_id, '✏️ تعديل على العرض', note, 'bid', b.req_id);
    const admins = await pool.query(`SELECT id FROM users WHERE role='admin'`);
    for (const a of admins.rows) await notify(a.id, '✏️ تعديل عرض', `${b.title}: ${note}`, 'bid', b.req_id);
    const client = await pool.query('SELECT email FROM users WHERE id=$1', [b.client_id]);
    if (client.rows[0]?.email) {
      await sendEmail(client.rows[0].email, `✏️ تعديل على عرض: ${b.title}`,
        emailTpl('تعديل على عرض مقبول ✏️',
          `<div class="hl">السعر: ${b.price}→${price} ر.س | المدة: ${b.days}→${days} يوم | السبب: ${revision_note}</div>`,
          '📋 مراجعة', `${SITE_URL}/dashboard-client.html`));
    }
    res.json({ message: 'تم تعديل العرض', price, days });
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
      r.client_id,r.project_number,r.image_url,r.client_id,
      u.name as client_name
      FROM bids b
      JOIN requests r ON b.request_id=r.id
      JOIN users u ON r.client_id=u.id
      WHERE b.provider_id=$1 ORDER BY b.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ────────────────────────────────────────────
// ── MESSAGES ──
// ────────────────────────────────────────────

// جلب كل المحادثات للمستخدم (مرتبطة بالعروض)
app.get('/api/conversations', auth, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'client') {
      // العميل: جلب كل العروض على طلباته مع آخر رسالة
      const r = await pool.query(`
        SELECT DISTINCT ON (b.provider_id, b.request_id)
          b.id as bid_id, b.provider_id, b.request_id, b.status as bid_status,
          b.price, b.days,
          u.name as other_name, u.city as other_city,
          rq.title as request_title, rq.project_number, rq.status as request_status,
          (SELECT content FROM messages WHERE request_id=b.request_id
           AND (sender_id=b.provider_id OR receiver_id=b.provider_id) ORDER BY created_at DESC LIMIT 1) as last_msg,
          (SELECT created_at FROM messages WHERE request_id=b.request_id
           AND (sender_id=b.provider_id OR receiver_id=b.provider_id) ORDER BY created_at DESC LIMIT 1) as last_msg_at,
          (SELECT COUNT(*) FROM messages WHERE request_id=b.request_id
           AND receiver_id=$1 AND is_read=FALSE) as unread_count
        FROM bids b
        JOIN users u ON b.provider_id=u.id
        JOIN requests rq ON b.request_id=rq.id
        WHERE rq.client_id=$1
        ORDER BY b.provider_id, b.request_id, last_msg_at DESC NULLS LAST`,
        [req.user.id]);
      rows = r.rows;
    } else {
      // المزود: جلب كل عروضه مع آخر رسالة
      const r = await pool.query(`
        SELECT b.id as bid_id, b.provider_id, b.request_id, b.status as bid_status,
          b.price, b.days,
          u.name as other_name, u.city as other_city,
          rq.title as request_title, rq.project_number, rq.status as request_status,
          rq.client_id as other_id,
          (SELECT content FROM messages WHERE request_id=b.request_id ORDER BY created_at DESC LIMIT 1) as last_msg,
          (SELECT created_at FROM messages WHERE request_id=b.request_id ORDER BY created_at DESC LIMIT 1) as last_msg_at,
          (SELECT COUNT(*) FROM messages WHERE request_id=b.request_id
           AND receiver_id=$1 AND is_read=FALSE) as unread_count
        FROM bids b
        JOIN requests rq ON b.request_id=rq.id
        JOIN users u ON rq.client_id=u.id
        WHERE b.provider_id=$1
        ORDER BY last_msg_at DESC NULLS LAST`,
        [req.user.id]);
      rows = r.rows;
    }
    res.json(rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

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
    const receiver = await pool.query('SELECT name,email,role FROM users WHERE id=$1', [receiver_id]);
    if (receiver.rows[0]?.email) {
      await sendEmail(receiver.rows[0].email, `💬 رسالة من ${sender.rows[0].name}`,
        emailTpl('رسالة جديدة 💬',
          `<p>أرسل لك <strong>${sender.rows[0].name}</strong>:</p>
           <div class="hl">${content.substring(0,200)}</div>`,
          '💬 الرد', `${SITE_URL}/dashboard-${receiver.rows[0].role==='provider'?'provider':'client'}.html`));
    }
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ────────────────────────────────────────────
// ── REVIEWS ──
// ────────────────────────────────────────────

app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { request_id, reviewed_id, rating, comment, type } = req.body;
    if (!request_id || !reviewed_id || !rating) {
      return res.status(400).json({ message: 'البيانات غير مكتملة' });
    }
    // تحقق هل قيّم مسبقاً - آمن في حالة reviewer_id غير موجود
    try {
      const exists = await pool.query(
        'SELECT id FROM reviews WHERE request_id=$1 AND reviewer_id=$2',
        [request_id, req.user.id]
      );
      if (exists.rows.length) {
        return res.status(400).json({ message: 'قيّمت هذا الطلب مسبقاً' });
      }
    } catch(checkErr) { /* reviewer_id column might not exist yet in old DB */ }
    const r = await pool.query(
      'INSERT INTO reviews(request_id,reviewer_id,reviewed_id,rating,comment,type) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [request_id, req.user.id, reviewed_id, rating, comment||null, type||'client_to_provider']
    );
    try {
      const rv = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
      const rname = rv.rows.length ? rv.rows[0].name : 'مستخدم';
      await notify(reviewed_id, 'تقييم جديد (' + rating + '/5)', rname + ' قيّمك');
    } catch(ne) {}
    res.json(r.rows[0]);
  } catch(e) {
    console.error('POST /reviews error:', e.message);
    res.status(500).json({ message: e.message });
  }
});

app.get('/api/reviews/provider/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.*,u.name as reviewer_name,rq.title as request_title
      FROM reviews rv JOIN users u ON rv.reviewer_id=u.id JOIN requests rq ON rv.request_id=rq.id
      WHERE rv.reviewed_id=$1 ORDER BY rv.created_at DESC`, [req.params.id]);
    const avg = r.rows.length ? (r.rows.reduce((s,x)=>s+x.rating,0)/r.rows.length).toFixed(1) : 0;
    res.json({ reviews: r.rows, average: parseFloat(avg), count: r.rows.length });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ────────────────────────────────────────────
// ── NOTIFICATIONS ──
// ────────────────────────────────────────────

app.get('/api/notifications', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ────────────────────────────────────────────
// ── PROFILE ──
// ────────────────────────────────────────────

app.get('/api/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id,name,email,phone,role,specialties,notify_categories,bio,city,badge FROM users WHERE id=$1',
      [req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/profile', auth, async (req, res) => {
  try {
    const { name, phone, specialties, bio, city } = req.body;
    const r = await pool.query(
      'UPDATE users SET name=$1,phone=$2,specialties=$3,bio=$4,city=$5 WHERE id=$6 RETURNING id,name,email,phone,role,specialties,notify_categories,bio,city,badge',
      [name, phone||null, specialties||null, bio||null, city||null, req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/provider/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id,name,email,phone,city,specialties,notify_categories,bio,badge,
             experience_years,portfolio_images,created_at,
             COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
             COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
             (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects,
             (SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as total_bids
      FROM users WHERE id=$1`, [req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/provider/profile', auth, async (req, res) => {
  try {
    const { name, phone, city, bio, specialties, experience_years, portfolio_images } = req.body;
    const r = await pool.query(
      `UPDATE users SET name=$1,phone=$2,city=$3,bio=$4,specialties=$5,
       experience_years=$6,portfolio_images=$7
       WHERE id=$8 RETURNING id,name,email,phone,city,bio,specialties,notify_categories,badge,experience_years,portfolio_images`,
      [name, phone||null, city||null, bio||null, specialties||null,
       experience_years||null, portfolio_images||null, req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/provider/notify-prefs', auth, async (req, res) => {
  try {
    const { notify_categories } = req.body;
    await pool.query('UPDATE users SET notify_categories=$1 WHERE id=$2', [notify_categories||[], req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── ملف المزود العام (يراه العميل) ──
app.get('/api/provider/:id/profile', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id,name,city,specialties,bio,badge,experience_years,portfolio_images,created_at,
             COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
             COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
             (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
      FROM users WHERE id=$1 AND role='provider'`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'المزود غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── التحقق من إمكانية التقييم ──
app.get('/api/reviews/can-rate/:requestId', auth, async (req, res) => {
  try {
    const req2 = await pool.query('SELECT status,client_id,assigned_provider_id FROM requests WHERE id=$1', [req.params.requestId]);
    if (!req2.rows.length) return res.json({ can: false });
    const r = req2.rows[0];
    const isClient = Number(r.client_id) === Number(req.user.id);
    const isProv = Number(r.assigned_provider_id) === Number(req.user.id);
    if (!isClient && !isProv) return res.json({ can: false });
    const done = ['in_progress','completed'].includes(r.status);
    const already = await pool.query('SELECT id FROM reviews WHERE request_id=$1 AND reviewer_id=$2', [req.params.requestId, req.user.id]);
    res.json({ can: done && !already.rows.length, already: already.rows.length > 0, status: r.status });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/client/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT id,name,email,phone,city,created_at,
      (SELECT COUNT(*) FROM requests WHERE client_id=users.id) as total_projects,
      (SELECT COUNT(*) FROM requests WHERE client_id=users.id AND status='completed') as completed_projects
      FROM users WHERE id=$1`, [req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/client/profile', auth, async (req, res) => {
  try {
    const { name, phone, city } = req.body;
    const r = await pool.query(
      'UPDATE users SET name=$1,phone=$2,city=$3 WHERE id=$4 RETURNING id,name,email,phone,city',
      [name, phone||null, city||null, req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ────────────────────────────────────────────
// ── ADMIN ──
// ────────────────────────────────────────────

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
      total_users:+u.rows[0].count, requests:+r.rows[0].count, total_bids:+b.rows[0].count,
      providers:+p.rows[0].count, pending_review:+pending.rows[0].count,
      in_progress:+inprog.rows[0].count, completed:+done.rows[0].count
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/requests', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    const VALID_STATUSES = ['pending_review','open','in_progress','completed','rejected'];
    let q = `SELECT r.*,u.name as client_name,p.name as provider_name,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id
      LEFT JOIN users p ON r.assigned_provider_id=p.id`;
    const params = [];
    if (status && VALID_STATUSES.includes(status)) {
      params.push(status);
      q += ` WHERE r.status=$1`;
    }
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
    const client = await pool.query('SELECT name,email FROM users WHERE id=$1', [req2.client_id]);
    if (newStatus === 'open') {
      await notify(req2.client_id, '✅ تمت الموافقة على طلبك', `طلبك "${req2.title}" نُشر الآن`, 'approved', req2.id);
      if (client.rows[0]?.email) {
        await sendEmail(client.rows[0].email, `✅ تمت الموافقة: ${req2.title}`,
          emailTpl(`مرحباً ${client.rows[0].name}،`,
            `<div class="ok">✅ طلبك <strong>"${req2.title}"</strong> نُشر ومتاح للعروض الآن.</div>`,
            '📋 متابعة طلبي', `${SITE_URL}/dashboard-client.html`));
      }
      notifyInterestedProviders(req2.id, req2.title, req2.category).catch(()=>{});
    } else {
      await notify(req2.client_id, '❌ تم رفض طلبك', `طلبك "${req2.title}". السبب: ${reason||'غير محدد'}`, 'rejected', req2.id);
      if (client.rows[0]?.email) {
        await sendEmail(client.rows[0].email, `❌ تم رفض طلبك: ${req2.title}`,
          emailTpl(`مرحباً ${client.rows[0].name}،`,
            `<div class="ng">تم رفض طلبك <strong>"${req2.title}"</strong>. السبب: ${reason||'غير محدد'}</div>`,
            '✏️ تعديل الطلب', `${SITE_URL}/dashboard-client.html`));
      }
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
    if (req2.client_id) await notify(req2.client_id, '🎉 اكتمل المشروع', `مشروعك "${req2.title}" اكتمل`, 'completed', req2.id);
    if (req2.assigned_provider_id) await notify(req2.assigned_provider_id, '🎉 اكتمل المشروع', `مشروع "${req2.title}" اكتمل`, 'completed', req2.id);
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

app.get('/api/admin/reviews', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.*,u1.name as reviewer_name,u2.name as reviewed_name,rq.title as request_title,rq.project_number
      FROM reviews rv JOIN users u1 ON rv.reviewer_id=u1.id JOIN users u2 ON rv.reviewed_id=u2.id
      JOIN requests rq ON rv.request_id=rq.id ORDER BY rv.created_at DESC`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/reviews/:id', auth, adminOnly, async (req, res) => {
  try { await pool.query('DELETE FROM reviews WHERE id=$1', [req.params.id]); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/notify', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, role, title, body, type } = req.body;
    const VALID_ROLES = ['client','provider','admin'];
    if (user_id) {
      await notify(user_id, title, body, type||'admin', null);
    } else {
      let q = 'SELECT id FROM users WHERE is_active=TRUE';
      const params = [];
      if (role && VALID_ROLES.includes(role)) { params.push(role); q += ` AND role=$1`; }
      const users = await pool.query(q, params);
      for (const u of users.rows) await notify(u.id, title, body, type||'admin', null);
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});


// ── ADMIN CHARTS ──
app.get('/api/admin/charts', auth, adminOnly, async (req, res) => {
  try {
    const [byStatus, byCategory, byMonth, topProviders, recentActivity] = await Promise.all([
      pool.query(`SELECT status, COUNT(*) as count FROM requests GROUP BY status ORDER BY count DESC`),
      pool.query(`SELECT category, COUNT(*) as count FROM requests WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 8`),
      pool.query(`SELECT TO_CHAR(created_at,'YYYY-MM') as month, COUNT(*) as count FROM requests WHERE created_at >= NOW() - INTERVAL '6 months' GROUP BY month ORDER BY month ASC`),
      pool.query(`SELECT u.name, u.city, u.badge, COALESCE(ROUND(AVG(rv.rating)::numeric,1),0) as avg_rating, COUNT(DISTINCT rv.id) as review_count, COUNT(DISTINCT r.id) as completed FROM users u LEFT JOIN reviews rv ON rv.reviewed_id=u.id LEFT JOIN requests r ON r.assigned_provider_id=u.id AND r.status='completed' WHERE u.role='provider' AND u.is_active=TRUE GROUP BY u.id,u.name,u.city,u.badge ORDER BY avg_rating DESC, completed DESC LIMIT 5`),
      pool.query(`(SELECT 'طلب جديد' as type, title as label, created_at FROM requests ORDER BY created_at DESC LIMIT 5) UNION ALL (SELECT 'مستخدم جديد' as type, name as label, created_at FROM users ORDER BY created_at DESC LIMIT 5) ORDER BY created_at DESC LIMIT 8`)
    ]);
    res.json({ by_status: byStatus.rows, by_category: byCategory.rows, by_month: byMonth.rows, top_providers: topProviders.rows, recent_activity: recentActivity.rows });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── ADMIN SEARCH ──
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

// ── ADMIN EXPORT CSV ──
app.get('/api/admin/export/requests', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`SELECT r.project_number,r.title,r.category,r.city,r.status,r.budget_max,r.created_at,r.completed_at,u.name as client_name,p.name as provider_name,COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count FROM requests r JOIN users u ON r.client_id=u.id LEFT JOIN users p ON r.assigned_provider_id=p.id ORDER BY r.created_at DESC`);
    const headers = ['رقم المشروع','العنوان','الفئة','المدينة','الحالة','الميزانية','العميل','المزود','عدد العروض','تاريخ الإنشاء','تاريخ الإكمال'];
    const csv = [headers.join(','), ...r.rows.map(x => [x.project_number||'','"'+(x.title||'').replace(/"/g,'""')+'"',x.category||'',x.city||'',x.status||'',x.budget_max||'','"'+(x.client_name||'')+'"','"'+(x.provider_name||'')+'"',x.bid_count||0,x.created_at?new Date(x.created_at).toLocaleDateString('ar-SA'):'',x.completed_at?new Date(x.completed_at).toLocaleDateString('ar-SA'):''].join(','))].join('\n');
    res.setHeader('Content-Type','text/csv; charset=utf-8');
    res.setHeader('Content-Disposition','attachment; filename="requests.csv"');
    res.send('\uFEFF'+csv);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ────────────────────────────────────────────
initDB().then(() =>
  server.listen(process.env.PORT||3000, () =>
    console.log('🚀 Server running on port', process.env.PORT||3000)
  )
);
