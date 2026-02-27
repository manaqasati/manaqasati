const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const JWT_SECRET = process.env.JWT_SECRET || 'manaqasa_secret_2024';

const CATEGORIES = [
  'تبريد وتكييف','كهرباء','سباكة','نجارة','تنظيف','نقل عفش',
  'حدادة','ألمنيوم','مسابح (تنفيذ وصيانة)','كاميرات مراقبة وأمن',
  'شبكات وإنترنت','مظلات وسواتر','عزل حراري وأسطح','أبواب',
  'أعمال جبس وطباشير','مكافحة حشرات','أخرى'
];

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
      created_at TIMESTAMP DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      city VARCHAR(100),
      address TEXT,
      budget_max INTEGER,
      deadline DATE,
      status VARCHAR(20) DEFAULT 'open',
      client_id INTEGER REFERENCES users(id),
      accepted_bid_id INTEGER,
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
      type VARCHAR(10),
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
    ALTER TABLE requests ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE requests ADD COLUMN IF NOT EXISTS deadline DATE;
    ALTER TABLE requests ADD COLUMN IF NOT EXISTS accepted_bid_id INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS specialties TEXT[];
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR(100);
  `);
  console.log('✅ DB ready');
}

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ message: 'جلسة منتهية' }); }
}

function notify(userId, title, body, type, refId) {
  pool.query('INSERT INTO notifications(user_id,title,body,type,ref_id) VALUES($1,$2,$3,$4,$5)',
    [userId, title, body, type, refId]).catch(console.error);
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
      'INSERT INTO users(name,email,password,password_hash,phone,role,specialties,bio,city) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,name,email,role,specialties,bio,city',
      [name, email, hash, hash, phone, role||'client', specs, bio, city]
    );
    const user = r.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ user, token });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const r = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (!r.rows.length) return res.status(400).json({ message: 'البريد أو كلمة المرور غير صحيحة' });
    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password || user.password_hash);
    if (!ok) return res.status(400).json({ message: 'البريد أو كلمة المرور غير صحيحة' });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    delete user.password;
    delete user.password_hash;
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
      SELECT r.*, u.name as client_name, u.phone as client_phone, u.city as client_city
      FROM requests r JOIN users u ON r.client_id=u.id WHERE r.id=$1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/requests', auth, async (req, res) => {
  try {
    const { title, description, category, city, address, budget_max, deadline } = req.body;
    if (!title || !description) return res.status(400).json({ message: 'العنوان والتفاصيل مطلوبة' });
    const r = await pool.query(
      'INSERT INTO requests(title,description,category,city,address,budget_max,deadline,client_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [title, description, category, city, address, budget_max, deadline, req.user.id]
    );
    res.json(r.rows[0]);
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
      u.specialties as provider_specialties,
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
    const existing = await pool.query('SELECT id FROM bids WHERE request_id=$1 AND provider_id=$2',
      [req.params.id, req.user.id]);
    if (existing.rows.length) return res.status(400).json({ message: 'قدمت عرضاً على هذا الطلب مسبقاً' });
    const req2 = await pool.query('SELECT client_id, title FROM requests WHERE id=$1', [req.params.id]);
    if (!req2.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    const r = await pool.query(
      'INSERT INTO bids(request_id,provider_id,price,days,note) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, req.user.id, price, days, note]
    );
    notify(req2.rows[0].client_id, '💼 عرض جديد', `وصلك عرض جديد على طلب: ${req2.rows[0].title}`, 'bid', req.params.id);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/bids/:id/accept', auth, async (req, res) => {
  try {
    const bid = await pool.query('SELECT b.*, r.client_id, r.title FROM bids b JOIN requests r ON b.request_id=r.id WHERE b.id=$1', [req.params.id]);
    if (!bid.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    const b = bid.rows[0];
    if (b.client_id !== req.user.id) return res.status(403).json({ message: 'غير مصرح' });
    await pool.query('UPDATE bids SET status=$1 WHERE id=$2', ['accepted', req.params.id]);
    await pool.query('UPDATE bids SET status=$1 WHERE request_id=$2 AND id!=$3', ['rejected', b.request_id, req.params.id]);
    await pool.query('UPDATE requests SET status=$1, accepted_bid_id=$2 WHERE id=$3', ['in_progress', req.params.id, b.request_id]);
    notify(b.provider_id, '✅ تم قبول عرضك', `تم قبول عرضك على: ${b.title}`, 'accepted', b.request_id);
    res.json({ message: 'تم قبول العرض' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/bids/:id/reject', auth, async (req, res) => {
  try {
    const bid = await pool.query('SELECT b.*, r.client_id, r.title FROM bids b JOIN requests r ON b.request_id=r.id WHERE b.id=$1', [req.params.id]);
    if (!bid.rows.length) return res.status(404).json({ message: 'العرض غير موجود' });
    if (bid.rows[0].client_id !== req.user.id) return res.status(403).json({ message: 'غير مصرح' });
    await pool.query('UPDATE bids SET status=$1 WHERE id=$2', ['rejected', req.params.id]);
    notify(bid.rows[0].provider_id, '❌ تم رفض عرضك', `للأسف تم رفض عرضك على: ${bid.rows[0].title}`, 'rejected', bid.rows[0].request_id);
    res.json({ message: 'تم رفض العرض' });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/bids/my', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT b.*, r.title as request_title, r.city, r.category, r.status as request_status, r.client_id
      FROM bids b JOIN requests r ON b.request_id=r.id
      WHERE b.provider_id=$1 ORDER BY b.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── MESSAGES ───
app.get('/api/messages/:requestId', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT m.*, u.name as sender_name FROM messages m
      JOIN users u ON m.sender_id=u.id
      WHERE m.request_id=$1 AND (m.sender_id=$2 OR m.receiver_id=$2)
      ORDER BY m.created_at ASC`, [req.params.requestId, req.user.id]);
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
    notify(receiver_id, '💬 رسالة جديدة', `${sender.rows[0].name}: ${content.substring(0,50)}`, 'message', request_id);
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
    notify(reviewed_id, '⭐ تقييم جديد', `${reviewer.rows[0].name} قيّمك بـ ${rating} نجوم`, 'review', request_id);
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
    const r = await pool.query('SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30', [req.user.id]);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/notifications/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── PROFILE ───
app.get('/api/profile', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id,name,email,phone,role,specialties,bio,city FROM users WHERE id=$1', [req.user.id]);
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/profile', auth, async (req, res) => {
  try {
    const { name, phone, specialties, bio, city } = req.body;
    const r = await pool.query(
      'UPDATE users SET name=$1,phone=$2,specialties=$3,bio=$4,city=$5 WHERE id=$6 RETURNING id,name,email,phone,role,specialties,bio,city',
      [name, phone, specialties, bio, city, req.user.id]
    );
    res.json(r.rows[0]);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ─── ADMIN ───
app.get('/api/admin/stats', auth, async (req, res) => {
  try {
    const [u,r,b,p] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM requests'),
      pool.query('SELECT COUNT(*) FROM bids'),
      pool.query("SELECT COUNT(*) FROM users WHERE role='provider'")
    ]);
    res.json({ users:+u.rows[0].count, requests:+r.rows[0].count, bids:+b.rows[0].count, providers:+p.rows[0].count });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/users', auth, async (req, res) => {
  try {
    const r = await pool.query('SELECT id,name,email,phone,role,specialties,city,created_at FROM users ORDER BY created_at DESC');
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/admin/requests', auth, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT r.*, u.name as client_name,
      (SELECT COUNT(*) FROM bids WHERE request_id=r.id) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id ORDER BY r.created_at DESC`);
    res.json(r.rows);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

initDB().then(() => app.listen(process.env.PORT||3000, () => console.log('🚀 Server running')));
