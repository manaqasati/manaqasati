const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'client',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS requests (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES users(id),
        title VARCHAR(500) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        city VARCHAR(100),
        budget_min INTEGER,
        budget_max INTEGER,
        status VARCHAR(50) DEFAULT 'review',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS bids (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES requests(id),
        provider_id INTEGER REFERENCES users(id),
        price INTEGER NOT NULL,
        days INTEGER,
        note TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES requests(id),
        client_id INTEGER REFERENCES users(id),
        provider_id INTEGER REFERENCES users(id),
        rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(request_id, client_id)
      );
    `);
    console.log('✅ الجداول جاهزة');
  } catch(e) { console.log('خطأ:', e.message); }
}

app.get('/', (req, res) => res.json({ message: '🚀 مناقصة API تعمل!', status: 'online' }));

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'يرجى تعبئة جميع الحقول' });
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'البريد مسجل مسبقاً' });
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name,email,phone,password_hash,role) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role',
      [name, email, phone || '', hash, role || 'client']
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'manaqasa2026secret', { expiresIn: '30d' });
    res.json({ token, user });
  } catch (err) { res.status(500).json({ message: 'حدث خطأ' }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'يرجى إدخال البريد وكلمة المرور' });
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (result.rows.length === 0) return res.status(400).json({ message: 'البريد أو كلمة المرور غير صحيحة' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ message: 'البريد أو كلمة المرور غير صحيحة' });
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'manaqasa2026secret', { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { res.status(500).json({ message: 'حدث خطأ' }); }
});

app.get('/api/requests', async (req, res) => {
  try {
    const result = await pool.query('SELECT r.*, u.name as client_name FROM requests r JOIN users u ON r.client_id=u.id ORDER BY r.created_at DESC');
    res.json(result.rows);
  } catch (err) { res.json([]); }
});

app.post('/api/requests', async (req, res) => {
  try {
    const { title, description, category, city, budget_min, budget_max, client_id } = req.body;
    const result = await pool.query(
      'INSERT INTO requests (client_id,title,description,category,city,budget_min,budget_max) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [client_id, title, description, category, city, budget_min || 0, budget_max || 0]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'حدث خطأ' }); }
});

app.put('/api/requests/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query('UPDATE requests SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'حدث خطأ' }); }
});

app.get('/api/bids', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bids ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.json([]); }
});

app.post('/api/bids', async (req, res) => {
  try {
    const { request_id, provider_id, price, days, note } = req.body;
    const result = await pool.query(
      'INSERT INTO bids (request_id,provider_id,price,days,note) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [request_id, provider_id, price, days || 1, note || '']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'حدث خطأ' }); }
});

app.put('/api/bids/:id/accept', async (req, res) => {
  try {
    const bid = await pool.query('UPDATE bids SET status=$1 WHERE id=$2 RETURNING *', ['accepted', req.params.id]);
    await pool.query('UPDATE requests SET status=$1 WHERE id=$2', ['open', bid.rows[0].request_id]);
    res.json(bid.rows[0]);
  } catch (err) { res.status(500).json({ message: 'حدث خطأ' }); }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { request_id, client_id, provider_id, rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'التقييم يجب أن يكون بين 1 و 5' });
    const exists = await pool.query('SELECT id FROM reviews WHERE request_id=$1 AND client_id=$2', [request_id, client_id]);
    if (exists.rows.length > 0) return res.status(400).json({ message: 'لقد قيّمت هذا الطلب مسبقاً' });
    await pool.query('UPDATE requests SET status=$1 WHERE id=$2', ['done', request_id]);
    const result = await pool.query(
      'INSERT INTO reviews (request_id,client_id,provider_id,rating,comment) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [request_id, client_id, provider_id, rating, comment || '']
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: 'حدث خطأ' }); }
});

app.get('/api/reviews/provider/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as client_name, req.title as request_title
       FROM reviews r
       JOIN users u ON r.client_id=u.id
       JOIN requests req ON r.request_id=req.id
       WHERE r.provider_id=$1
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    const avg = result.rows.length > 0
      ? (result.rows.reduce((s, r) => s + r.rating, 0) / result.rows.length).toFixed(1)
      : 0;
    res.json({ reviews: result.rows, average: avg, count: result.rows.length });
  } catch (err) { res.json({ reviews: [], average: 0, count: 0 }); }
});

app.get('/api/admin/stats', async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const requests = await pool.query('SELECT COUNT(*) FROM requests');
    const bids = await pool.query('SELECT COUNT(*) FROM bids');
    const providers = await pool.query("SELECT COUNT(*) FROM users WHERE role='provider'");
    const reviews = await pool.query('SELECT COUNT(*) FROM reviews');
    res.json({ users: users.rows[0].count, requests: requests.rows[0].count, bids: bids.rows[0].count, providers: providers.rows[0].count, reviews: reviews.rows[0].count });
  } catch (err) { res.json({ users:0, requests:0, bids:0, providers:0, reviews:0 }); }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id,name,email,phone,role,created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.json([]); }
});

createTables().then(() => {
  app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
});
