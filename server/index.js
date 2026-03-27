const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ تقديم ملفات HTML من مجلد public
app.use(express.static(__dirname));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ✅ Resend Email Service
const RESEND_KEY = process.env.RESEND_KEY || 're_bfjMBMPj_67sGJEwKehKqnqz5B4pVqvTD';
const FROM_EMAIL = 'cs@manaqasa.com';
const SITE_URL = 'https://manaqasati-production.up.railway.app';

async function sendEmail(to, subject, html) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `مناقصة <${FROM_EMAIL}>`, to: [to], subject, html })
    });
    const d = await r.json();
    if (!r.ok) console.error('Resend error:', d);
    return r.ok;
  } catch(e) { console.error('Email error:', e.message); return false; }
}

function emailTemplate(title, body, btnText, btnUrl) {
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><style>
    body{font-family:Tahoma,Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px}
    .box{max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)}
    .head{background:#4f46e5;padding:24px;text-align:center}
    .head h1{color:#fff;margin:0;font-size:20px}
    .body{padding:28px 32px}
    .body p{color:#374151;font-size:14px;line-height:1.8;margin:0 0 16px}
    .btn{display:inline-block;background:#4f46e5;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:700;margin:8px 0}
    .foot{background:#f9fafb;padding:14px;text-align:center;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb}
  </style></head><body>
    <div class="box">
      <div class="head"><h1>🏆 مناقصة</h1></div>
      <div class="body">
        <p><strong>${title}</strong></p>
        ${body}
        ${btnText && btnUrl ? `<p><a href="${btnUrl}" class="btn">${btnText}</a></p>` : ''}
      </div>
      <div class="foot">© 2025 منصة مناقصة — manaqasa.com</div>
    </div>
  </body></html>`;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const JWT_SECRET = process.env.JWT_SECRET || 'manaqasa_secret_2024';

const CATEGORIES = [
  'تبريد وتكييف','كهرباء','سباكة','نجارة','تنظيف','نقل عفش',
  'حدادة','ألمنيوم','مسابح (تنفيذ وصيانة)','كاميرات مراقبة وأمن',
  'شبكات وإنترنت','مظلات وسواتر','عزل حراري وأسطح','أبواب',
  'أعمال جبس وطباشير','مكافحة حشرات','أخرى'
];

function generateProjectNumber(id, date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `MNQ-${y}${m}${day}-${String(id).padStart(4,'0')}`;
}

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255),
      password_hash VARCHAR(255),
      phone VARCHAR(20),
      role VARCHAR(20) DEFAULT 'client',
      specialties TEXT[],
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
    CREATE TABLE IF NOT EXISTS saved_requests (
      id SERIAL PRIMARY KEY,
      provider_id INTEGER REFERENCES users(id),
      request_id INTEGER REFERENCES requests(id),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(provider_id, request_id)
    );
  `);

  const alters = [
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS project_number VARCHAR(50)`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS address TEXT`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS deadline DATE`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS image_url TEXT`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS accepted_bid_id INTEGER`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS assigned_provider_id INTEGER`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP`,
    `ALTER TABLE requests ADD COLUMN IF NOT EXISTS admin_notes TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS specialties TEXT[]`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100)`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS badge VARCHAR(50) DEFAULT 'none'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`,
  ];
  for (const sql of alters) { await pool.query(sql).catch(()=>{}); }

  const rows = await pool.query(`SELECT id, created_at FROM requests WHERE project_number IS NULL`);
  for (const row of rows.rows) {
    const num = generateProjectNumber(row.id, row.created_at);
    await pool.query(`UPDATE requests SET project_number=$1 WHERE id=$2`, [num, row.id]);
  }

  console.log('✅ DB ready');
}

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
  ).catch(console.error);
}

// ─── AUTH ───
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, specialties, bio, city } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'البيانات ناقصة' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(400).json({ message: 'البريد مسجل مسبقاً' });
    const hash = await bcrypt.hash(password, 10);
    const specs = role === 'provider' ? (specialties || []) : null;
    const r = await pool.query(
      'INSERT INTO users(name,email,password,password_hash,phone,role,specialties,bio,city) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,name,email,role,specialties,bio,city,badge',
      [name, email, hash, hash, phone, role||'client', specs, bio, city]
    );
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, token });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    let r;
    if(phone){
      r = await pool.query('SELECT * FROM users WHERE phone=$1', [phone]);
    } else {
      r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    }
    if (!r.rows.length) return res.status(400).json({ message: 'البيانات غير صحيحة' });
    const user = r.rows[0];
    if (!user.is_active) return res.status(403).json({ message: 'الحساب موقوف، تواصل مع المدير' });
    const ok = await bcrypt.compare(password, user.password || user.password_hash);
    if (!ok) return res.status(400).json({ message: 'البيانات غير صحيحة' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    delete user.password; delete user.password_hash;
    res.json({ user, token });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── CATEGORIES ───
app.get('/api/categories', (req, res) => res.json(CATEGORIES));

// ─── REQUESTS ───
app.get('/api/requests', async (req, res) => {
  try {
    const { category, city, status } = req.query;
    let q = `SELECT r.*, u.name as client_name,
      (SELECT COUNT(*) FROM bids WHERE request_id=r.id) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id WHERE 1=1`;
    const params = [];
    if (category) { params.push(category); q += ` AND r.category=$${params.length}`; }
    if (city) { params.push(`%${city}%`); q += ` AND r.city ILIKE $${params.length}`; }
    if (status) { params.push(status); q += ` AND r.status=$${params.length}`; }
    else q += ` AND r.status='open'`;
    q += ' ORDER BY r.created_at DESC';
    const r = await pool.query(q, params);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/requests/my', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*, u.name as client_name,
      (SELECT COUNT(*) FROM bids WHERE request_id=r.id) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id
      WHERE r.client_id=$1 ORDER BY r.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/requests/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*, u.name as client_name, u.phone as client_phone, u.city as client_city,
      p.name as provider_name, p.phone as provider_phone
      FROM requests r 
      JOIN users u ON r.client_id=u.id
      LEFT JOIN users p ON r.assigned_provider_id=p.id
      WHERE r.id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/requests', auth, async (req, res) => {
  try {
    const { title, description, category, city, address, budget_max, deadline, image_url } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'العنوان والتفاصيل مطلوبة' });
    const r = await pool.query(
      `INSERT INTO requests(title,description,category,city,address,budget_max,deadline,image_url,client_id,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_review') RETURNING *`,
      [title, description, category, city, address, budget_max, deadline, image_url||null, req.user.id]
    );
    const req2 = r.rows[0];
    const num = generateProjectNumber(req2.id, req2.created_at);
    await pool.query('UPDATE requests SET project_number=$1 WHERE id=$2', [num, req2.id]);
    req2.project_number = num;
    const admins = await pool.query(`SELECT id FROM users WHERE role='admin'`);
    for (const a of admins.rows) {
      await notify(a.id, '📋 طلب جديد للمراجعة', `طلب جديد: ${title} — بانتظار الموافقة`, 'new_request', req2.id);
    }
    res.json(req2);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/requests/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const r = await pool.query('UPDATE requests SET status=$1 WHERE id=$2 AND client_id=$3 RETURNING *',
      [status, req.params.id, req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── BIDS ───
app.get('/api/requests/:id/bids', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT b.*, u.name as provider_name, u.city as provider_city, u.bio as provider_bio,
      u.phone as provider_phone, u.specialties as provider_specialties, u.badge as provider_badge,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=b.provider_id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=b.provider_id),0) as review_count
      FROM bids b JOIN users u ON b.provider_id=u.id
      WHERE b.request_id=$1 ORDER BY b.created_at ASC`, [req.params.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/requests/:id/bids', auth, async (req, res) => {
  try {
    const { price, days, note } = req.body;
    if (!price || !days) return res.status(400).json({ message: 'السعر والمدة مطلوبان' });
    const reqData = await pool.query('SELECT * FROM requests WHERE id=$1', [req.params.id]);
    if (!reqData.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    if (reqData.rows[0].status !== 'open') return res.status(400).json({ message: 'الطلب غير مفتوح للعروض' });
    const existing = await pool.query('SELECT id FROM bids WHERE request_id=$1 AND provider_id=$2',
      [req.params.id, req.user.id]);
    if (existing.rows.length) return res.status(400).json({ message: 'قدمت عرضاً على هذا الطلب مسبقاً' });
    const r = await pool.query(
      'INSERT INTO bids(request_id,provider_id,price,days,note) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, req.user.id, price, days, note]
    );
    await notify(reqData.rows[0].client_id, '💼 عرض جديد',
      `وصلك عرض جديد على طلب: ${reqData.rows[0].title}`, 'bid', req.params.id);
    const admins = await pool.query(`SELECT id FROM users WHERE role='admin'`);
    for (const a of admins.rows) {
      await notify(a.id, '💼 عرض جديد', `عرض جديد على: ${reqData.rows[0].title}`, 'bid', req.params.id);
    }
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/bids/:id', auth, async (req, res) => {
  try {
    const { price, days, note } = req.body;
    const bid = await pool.query('SELECT * FROM bids WHERE id=$1 AND provider_id=$2', [req.params.id, req.user.id]);
    if (!bid.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    if (bid.rows[0].status !== 'pending') return res.status(400).json({ message: 'لا يمكن تعديل عرض مقبول أو مرفوض' });
    const r = await pool.query(
      'UPDATE bids SET price=$1, days=$2, note=$3 WHERE id=$4 RETURNING *',
      [price||bid.rows[0].price, days||bid.rows[0].days, note||bid.rows[0].note, req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/bids/:id/accept', auth, async (req, res) => {
  try {
    const bid = await pool.query(
      'SELECT b.*, r.client_id, r.title, r.id as req_id FROM bids b JOIN requests r ON b.request_id=r.id WHERE b.id=$1',
      [req.params.id]);
    if (!bid.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    const b = bid.rows[0];
    if (b.client_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'غير مصرح' });
    await pool.query('UPDATE bids SET status=$1 WHERE id=$2', ['accepted', req.params.id]);
    await pool.query('UPDATE bids SET status=$1 WHERE request_id=$2 AND id!=$3', ['rejected', b.request_id, req.params.id]);
    await pool.query(
      'UPDATE requests SET status=$1, accepted_bid_id=$2, assigned_provider_id=$3, assigned_at=NOW() WHERE id=$4',
      ['in_progress', req.params.id, b.provider_id, b.request_id]
    );
    await notify(b.provider_id, '✅ تم قبول عرضك', `تم قبول عرضك على: ${b.title}`, 'accepted', b.request_id);
    await notify(b.client_id, '🎉 تم الإسناد', `تم إسناد مشروعك: ${b.title}`, 'assigned', b.request_id);
    // إيميل للمزود
    const provider = await pool.query('SELECT name,email FROM users WHERE id=$1', [b.provider_id]);
    if (provider.rows[0]?.email) {
      await sendEmail(provider.rows[0].email, `✅ تم قبول عرضك على: ${b.title}`,
        emailTemplate(`مبروك ${provider.rows[0].name}! 🎉`,
          `<p>تم قبول عرضك على المشروع: <strong>${b.title}</strong></p>
           <p>تواصل مع صاحب الطلب للبدء بالتنفيذ.</p>`,
          '📋 عرض تفاصيل المشروع', `${SITE_URL}/dashboard-provider.html`
        )
      );
    }
    res.json({ message: 'تم قبول العرض وإسناد المشروع' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/bids/:id/reject', auth, async (req, res) => {
  try {
    const bid = await pool.query(
      'SELECT b.*, r.client_id, r.title FROM bids b JOIN requests r ON b.request_id=r.id WHERE b.id=$1',
      [req.params.id]);
    if (!bid.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    if (bid.rows[0].client_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ message: 'غير مصرح' });
    await pool.query('UPDATE bids SET status=$1 WHERE id=$2', ['rejected', req.params.id]);
    await notify(bid.rows[0].provider_id, '❌ تم رفض عرضك',
      `للأسف تم رفض عرضك على: ${bid.rows[0].title}`, 'rejected', bid.rows[0].request_id);
    res.json({ message: 'تم رفض العرض' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/bids/my', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT b.*, r.title as request_title, r.city, r.category,
      r.status as request_status, r.client_id, r.project_number
      FROM bids b JOIN requests r ON b.request_id=r.id
      WHERE b.provider_id=$1 ORDER BY b.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── SAVED ───
app.get('/api/saved', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*, u.name as client_name,
      (SELECT COUNT(*) FROM bids WHERE request_id=r.id) as bid_count
      FROM saved_requests s
      JOIN requests r ON s.request_id=r.id
      JOIN users u ON r.client_id=u.id
      WHERE s.provider_id=$1 ORDER BY s.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/saved/:requestId', auth, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO saved_requests(provider_id,request_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.requestId]
    );
    res.json({ saved: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/saved/:requestId', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM saved_requests WHERE provider_id=$1 AND request_id=$2',
      [req.user.id, req.params.requestId]);
    res.json({ saved: false });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── MESSAGES ───
app.get('/api/messages/:requestId', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT m.*, u.name as sender_name, u.role as sender_role FROM messages m
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
      [request_id, req.user.id, receiver_id, content]
    );
    const sender = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    await notify(receiver_id, '💬 رسالة جديدة',
      `${sender.rows[0].name}: ${content.substring(0,50)}`, 'message', request_id);
    // إيميل للمستقبل
    const receiver = await pool.query('SELECT name,email FROM users WHERE id=$1', [receiver_id]);
    if (receiver.rows[0]?.email) {
      await sendEmail(receiver.rows[0].email, `💬 رسالة جديدة من ${sender.rows[0].name}`,
        emailTemplate(`لديك رسالة جديدة`,
          `<p>أرسل لك <strong>${sender.rows[0].name}</strong> رسالة:</p>
           <p style="background:#f3f4f6;padding:12px;border-radius:8px;border-right:3px solid #4f46e5">${content.substring(0,200)}${content.length>200?'...':''}</p>`,
          '💬 الرد على الرسالة', `${SITE_URL}/dashboard-${receiver.rows[0].role==='provider'?'provider':'client'}.html`
        )
      );
    }
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── REVIEWS ───
app.post('/api/reviews', auth, async (req, res) => {
  try {
    const { request_id, reviewed_id, rating, comment, type } = req.body;
    const exists = await pool.query('SELECT id FROM reviews WHERE request_id=$1 AND reviewer_id=$2',
      [request_id, req.user.id]);
    if (exists.rows.length) return res.status(400).json({ message: 'قيّمت هذا الطلب مسبقاً' });
    const r = await pool.query(
      'INSERT INTO reviews(request_id,reviewer_id,reviewed_id,rating,comment,type) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [request_id, req.user.id, reviewed_id, rating, comment, type||'client_to_provider']
    );
    const reviewer = await pool.query('SELECT name FROM users WHERE id=$1', [req.user.id]);
    await notify(reviewed_id, '⭐ تقييم جديد',
      `${reviewer.rows[0].name} قيّمك بـ ${rating} نجوم`, 'review', request_id);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/reviews/provider/:id', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.*, u.name as reviewer_name, rq.title as request_title
      FROM reviews rv JOIN users u ON rv.reviewer_id=u.id JOIN requests rq ON rv.request_id=rq.id
      WHERE rv.reviewed_id=$1 ORDER BY rv.created_at DESC`, [req.params.id]);
    const avg = r.rows.length ? (r.rows.reduce((s,x)=>s+x.rating,0)/r.rows.length).toFixed(1) : 0;
    res.json({ reviews: r.rows, average: parseFloat(avg), count: r.rows.length });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── NOTIFICATIONS ───
app.get('/api/notifications', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/notifications/read-all', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── PROFILE ───
app.get('/api/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(
      'SELECT id,name,email,phone,role,specialties,bio,city,badge FROM users WHERE id=$1',
      [req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/profile', auth, async (req, res) => {
  try {
    const { name, phone, specialties, bio, city } = req.body;
    const r = await pool.query(
      'UPDATE users SET name=$1,phone=$2,specialties=$3,bio=$4,city=$5 WHERE id=$6 RETURNING id,name,email,phone,role,specialties,bio,city,badge',
      [name, phone, specialties, bio, city, req.user.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── ADMIN ───
app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    const [u,r,b,p,pending,inprog,done,disp] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM requests'),
      pool.query('SELECT COUNT(*) FROM bids'),
      pool.query(`SELECT COUNT(*) FROM users WHERE role='provider'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='pending_review'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='in_progress'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='completed'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='rejected'`),
    ]);
    res.json({
      total_users: +u.rows[0].count,
      requests: +r.rows[0].count,
      total_bids: +b.rows[0].count,
      providers: +p.rows[0].count,
      pending_review: +pending.rows[0].count,
      in_progress: +inprog.rows[0].count,
      completed: +done.rows[0].count,
      rejected: +disp.rows[0].count,
      disputes: 0,
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.query;
    let q = 'SELECT id,name,email,phone,role,specialties,city,badge,is_active,created_at FROM users';
    if (role) q += ` WHERE role='${role}'`;
    q += ' ORDER BY created_at DESC';
    const r = await pool.query(q);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id,name,email,phone,role,specialties,bio,city,badge,is_active,created_at,
       COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
       (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
       FROM users WHERE id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'المستخدم غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, phone, role, specialties, bio, city } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'البيانات ناقصة' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(400).json({ message: 'البريد مسجل مسبقاً' });
    const hash = await bcrypt.hash(password, 10);
    const specs = role === 'provider' ? (specialties || []) : null;
    const r = await pool.query(
      'INSERT INTO users(name,email,password,password_hash,phone,role,specialties,bio,city) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,name,email,role,city,badge',
      [name, email, hash, hash, phone, role||'client', specs, bio, city]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, phone, role, badge, is_active, city, specialties, bio } = req.body;
    const r = await pool.query(
      'UPDATE users SET name=$1,phone=$2,role=$3,badge=$4,is_active=$5,city=$6,specialties=$7,bio=$8 WHERE id=$9 RETURNING id,name,email,phone,role,badge,is_active,city,specialties',
      [name, phone, role, badge||'none', is_active!==undefined?is_active:true, city, specialties, bio, req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/users/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(
      'UPDATE users SET is_active=NOT is_active WHERE id=$1 RETURNING id,name,is_active',
      [req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/users/:id/badge', auth, adminOnly, async (req, res) => {
  try {
    const { badge } = req.body;
    const r = await pool.query('UPDATE users SET badge=$1 WHERE id=$2 RETURNING id,name,badge',
      [badge, req.params.id]);
    await notify(parseInt(req.params.id), '🏆 وسام جديد', `تهانينا! حصلت على وسام: ${badge}`, 'badge', null);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/users/:id/permissions', auth, adminOnly, async (req, res) => {
  try {
    const fields = req.body;
    const keys = Object.keys(fields).filter(k=>['can_bid','can_view'].includes(k));
    if(!keys.length) return res.json({ok:true});
    const sets = keys.map((k,i)=>`${k}=$${i+1}`).join(',');
    const vals = keys.map(k=>fields[k]);
    vals.push(req.params.id);
    await pool.query(`UPDATE users SET ${sets} WHERE id=$${vals.length}`, vals).catch(()=>{});
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/requests', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    let q = `SELECT r.*, u.name as client_name, p.name as provider_name,
      (SELECT COUNT(*) FROM bids WHERE request_id=r.id) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id
      LEFT JOIN users p ON r.assigned_provider_id=p.id`;
    if (status) q += ` WHERE r.status='${status}'`;
    q += ' ORDER BY r.created_at DESC';
    const r = await pool.query(q);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/requests/:id/review', auth, adminOnly, async (req, res) => {
  try {
    const { action, reason } = req.body;
    const newStatus = action === 'approve' ? 'open' : 'rejected';
    const r = await pool.query(
      'UPDATE requests SET status=$1, admin_notes=$2 WHERE id=$3 RETURNING *',
      [newStatus, reason||null, req.params.id]
    );
    const req2 = r.rows[0];
    const client = await pool.query('SELECT name,email FROM users WHERE id=$1', [req2.client_id]);
    if (newStatus === 'open') {
      await notify(req2.client_id, '✅ تمت الموافقة على طلبك',
        `طلبك "${req2.title}" تمت مراجعته ونُشر الآن`, 'approved', req2.id);
      if (client.rows[0]?.email) {
        await sendEmail(client.rows[0].email, `✅ تمت الموافقة على طلبك — ${req2.title}`,
          emailTemplate(`مرحباً ${client.rows[0].name}،`,
            `<p>تمت مراجعة طلبك <strong>"${req2.title}"</strong> والموافقة عليه.</p>
             <p>طلبك الآن منشور ومتاح لمزودي الخدمة لتقديم عروضهم.</p>`,
            '📋 عرض طلبك', `${SITE_URL}/dashboard-client.html`
          )
        );
      }
    } else {
      await notify(req2.client_id, '❌ تم رفض طلبك',
        `طلبك "${req2.title}" تم رفضه. السبب: ${reason||'غير محدد'}`, 'rejected', req2.id);
      if (client.rows[0]?.email) {
        await sendEmail(client.rows[0].email, `❌ تم رفض طلبك — ${req2.title}`,
          emailTemplate(`مرحباً ${client.rows[0].name}،`,
            `<p>للأسف، تم رفض طلبك <strong>"${req2.title}"</strong>.</p>
             <p>السبب: ${reason||'غير محدد'}</p>
             <p>يمكنك تعديل الطلب وإعادة تقديمه.</p>`,
            '✏️ تعديل الطلب', `${SITE_URL}/dashboard-client.html`
          )
        );
      }
    }
    res.json(req2);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/requests/:id', auth, adminOnly, async (req, res) => {
  try {
    const { title, description, category, city, address, budget_max, deadline, admin_notes } = req.body;
    const r = await pool.query(
      `UPDATE requests SET title=$1,description=$2,category=$3,city=$4,address=$5,
       budget_max=$6,deadline=$7,admin_notes=$8 WHERE id=$9 RETURNING *`,
      [title, description, category, city, address, budget_max, deadline, admin_notes, req.params.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/requests/:id/complete', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE requests SET status='completed', completed_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.id]
    );
    const req2 = r.rows[0];
    await notify(req2.client_id, '🎉 اكتمل المشروع', `مشروعك "${req2.title}" اكتمل بنجاح`, 'completed', req2.id);
    if (req2.assigned_provider_id) {
      await notify(req2.assigned_provider_id, '🎉 اكتمل المشروع',
        `تم إنجاز مشروع "${req2.title}" بنجاح`, 'completed', req2.id);
    }
    res.json(req2);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/requests/:id/assign', auth, adminOnly, async (req, res) => {
  try {
    const { provider_id, price } = req.body;
    const r = await pool.query(
      `UPDATE requests SET status='in_progress', assigned_provider_id=$1, assigned_at=NOW() WHERE id=$2 RETURNING *`,
      [provider_id, req.params.id]
    );
    const req2 = r.rows[0];
    await notify(provider_id, '📋 تم إسناد مشروع لك', `تم إسناد مشروع "${req2.title}" لك`, 'assigned', req2.id);
    res.json(req2);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/requests/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM requests WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/admin/notify', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, role, title, body, type } = req.body;
    if (user_id) {
      await notify(user_id, title, body, type||'admin', null);
    } else {
      let q = 'SELECT id FROM users WHERE is_active=TRUE';
      if (role) q += ` AND role='${role}'`;
      const users = await pool.query(q);
      for (const u of users.rows) {
        await notify(u.id, title, body, type||'admin', null);
      }
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/providers', auth, adminOnly, async (req, res) => {
  try {
    const { category } = req.query;
    let q = `SELECT id,name,email,phone,city,specialties,badge,is_active,bio,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
      (SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as bid_count,
      (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
      FROM users WHERE role='provider'`;
    if (category) q += ` AND $1=ANY(specialties)`;
    q += ' ORDER BY avg_rating DESC';
    const r = category ? await pool.query(q, [category]) : await pool.query(q);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/reviews', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.*, 
        u1.name as reviewer_name, u2.name as reviewed_name,
        rq.title as request_title, rq.project_number
      FROM reviews rv
      JOIN users u1 ON rv.reviewer_id=u1.id
      JOIN users u2 ON rv.reviewed_id=u2.id
      JOIN requests rq ON rv.request_id=rq.id
      ORDER BY rv.created_at DESC`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/reviews/:id/reply', auth, adminOnly, async (req, res) => {
  try {
    const { reply } = req.body;
    await pool.query('UPDATE reviews SET admin_reply=$1 WHERE id=$2', [reply, req.params.id]).catch(()=>{});
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/reviews/:id/hide', auth, adminOnly, async (req, res) => {
  try {
    const { hidden } = req.body;
    await pool.query('UPDATE reviews SET hidden=$1 WHERE id=$2', [hidden, req.params.id]).catch(()=>{});
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/reviews/:id/resolve', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('UPDATE reviews SET reported=FALSE WHERE id=$1', [req.params.id]).catch(()=>{});
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/admin/reviews/:id', auth, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/disputes', auth, adminOnly, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.id, r.title, r.description as description, r.status,
        r.client_id, u1.name as client_name,
        r.assigned_provider_id as provider_id, u2.name as provider_name,
        r.project_number, r.id as request_id, r.admin_notes as resolution,
        r.created_at
      FROM requests r
      JOIN users u1 ON r.client_id=u1.id
      LEFT JOIN users u2 ON r.assigned_provider_id=u2.id
      WHERE r.status='disputed'
      ORDER BY r.created_at DESC`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/disputes', auth, async (req, res) => {
  try {
    const { request_id, title, description } = req.body;
    await pool.query(
      `UPDATE requests SET status='disputed', admin_notes=$1 WHERE id=$2`,
      [`نزاع: ${title} — ${description}`, request_id]
    );
    const admins = await pool.query(`SELECT id FROM users WHERE role='admin'`);
    for (const a of admins.rows) {
      await notify(a.id, '⚠️ نزاع جديد', `نزاع على المشروع #${request_id}: ${title}`, 'dispute', request_id);
    }
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/admin/disputes/:id/resolve', auth, adminOnly, async (req, res) => {
  try {
    const { resolution, decision } = req.body;
    await pool.query(
      `UPDATE requests SET status='completed', admin_notes=$1 WHERE id=$2`,
      [resolution, req.params.id]
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── CLIENT endpoints ───
app.get('/api/client/requests', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*, u.name as client_name,
      (SELECT COUNT(*) FROM bids WHERE request_id=r.id) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id
      WHERE r.client_id=$1 ORDER BY r.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/client/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id,name,email,phone,city,created_at,
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
      [name, phone, city, req.user.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/client/disputes', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.id, r.title, r.admin_notes as description, r.status,
        r.assigned_provider_id as provider_id, u.name as provider_name, r.created_at
      FROM requests r
      LEFT JOIN users u ON r.assigned_provider_id=u.id
      WHERE r.client_id=$1 AND r.status='disputed'
      ORDER BY r.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/client/reviews', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT rv.*, u.name as reviewed_name
      FROM reviews rv JOIN users u ON rv.reviewed_id=u.id
      WHERE rv.reviewer_id=$1 ORDER BY rv.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/requests/:id/complete', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE requests SET status='completed', completed_at=NOW() WHERE id=$1 AND client_id=$2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (!r.rows.length) return res.status(403).json({ message: 'غير مصرح' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── AUTH change password ───
app.put('/api/auth/change-password', auth, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;
    const r = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = r.rows[0];
    const ok = await bcrypt.compare(old_password, user.password || user.password_hash);
    if (!ok) return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1, password_hash=$2 WHERE id=$3', [hash, hash, req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── نسيت كلمة السر ───
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'البريد مطلوب' });
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!r.rows.length) return res.json({ ok: true }); // لا نكشف إذا كان البريد موجود
    const user = r.rows[0];
    const resetToken = jwt.sign({ id: user.id, type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
    const resetUrl = `${SITE_URL}/auth.html?reset=${resetToken}`;
    await sendEmail(email, 'استعادة كلمة المرور — مناقصة',
      emailTemplate(
        `مرحباً ${user.name}،`,
        `<p>تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في منصة <strong>مناقصة</strong>.</p>
         <p>اضغط على الزر أدناه لإعادة تعيين كلمة المرور. الرابط صالح لمدة ساعة واحدة.</p>
         <p style="color:#6b7280;font-size:12px">إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>`,
        '🔑 إعادة تعيين كلمة المرور', resetUrl
      )
    );
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) return res.status(400).json({ message: 'البيانات ناقصة' });
    let decoded;
    try { decoded = jwt.verify(token, JWT_SECRET); } catch { return res.status(400).json({ message: 'رابط منتهي الصلاحية' }); }
    if (decoded.type !== 'reset') return res.status(400).json({ message: 'رابط غير صحيح' });
    const hash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1, password_hash=$2 WHERE id=$3', [hash, hash, decoded.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── PROVIDER endpoints ───
app.get('/api/provider/profile', auth, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT id,name,email,phone,city,specialties,bio,badge,created_at,
       COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
       (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
       FROM users WHERE id=$1`, [req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/provider/bids', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT b.*, r.title as request_title, r.city, r.category,
      r.status as request_status, r.client_id, r.project_number, r.image_url
      FROM bids b JOIN requests r ON b.request_id=r.id
      WHERE b.provider_id=$1 ORDER BY b.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

initDB().then(() => app.listen(process.env.PORT||3000, () => console.log('🚀 Server running on port', process.env.PORT||3000)));
