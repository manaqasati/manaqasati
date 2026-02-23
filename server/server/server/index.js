const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - السماح لجميع الطلبات
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// إنشاء الجداول تلقائياً
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
    `);
    console.log('✅ الجداول جاهزة');
  } catch(e) {
    console.log('خطأ في إنشاء الجداول:', e.message);
  }
}

// اختبار
app.get('/', (req, res) => {
  res.json({ message: '🚀 مناقصة API تعمل بنجاح!', status: 'online' });
});

// تسجيل حساب جديد
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'يرجى تعبئة جميع الحقول' });

    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length > 0)
      return res.status(400).json({ message: 'البريد الإلكتروني مسجل مسبقاً' });

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (name,email,phone,password_hash,role) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role',
      [name, email, phone || '', hash, role || 'client']
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'manaqasa2026secret',
      { expiresIn: '30d' }
    );
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' });
  }
});

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'يرجى إدخال البريد وكلمة المرور' });

    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (result.rows.length === 0)
      return res.status(400).json({ message: 'البريد أو كلمة المرور غير صحيحة' });

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(400).json({ message: 'البريد أو كلمة المرور غير صحيحة' });

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET || 'manaqasa2026secret',
      { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'حدث خطأ، حاول مرة أخرى' });
  }
});

// الطلبات
app.get('/api/requests', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as client_name 
       FROM requests r 
       JOIN users u ON r.client_id=u.id 
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/requests', async (req, res) => {
  try {
    const { title, description, category, city, budget_min, budget_max, client_id } = req.body;
    const result = await pool.query(
      'INSERT INTO requests (client_id,title,description,category,city,budget_min,budget_max) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [client_id, title, description, category, city, budget_min || 0, budget_max || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
});

// العروض
app.post('/api/bids', async (req, res) => {
  try {
    const { request_id, provider_id, price, days, note } = req.body;
    const result = await pool.query(
      'INSERT INTO bids (request_id,provider_id,price,days,note) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [request_id, provider_id, price, days || 1, note || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'حدث خطأ' });
  }
});

// إحصائيات المدير
app.get('/api/admin/stats', async (req, res) => {
  try {
    const users = await pool.query('SELECT COUNT(*) FROM users');
    const requests = await pool.query('SELECT COUNT(*) FROM requests');
    const bids = await pool.query('SELECT COUNT(*) FROM bids');
    res.json({
      users: users.rows[0].count,
      requests: requests.rows[0].count,
      bids: bids.rows[0].count
    });
  } catch (err) {
    res.json({ users: 0, requests: 0, bids: 0 });
  }
});

// تشغيل السيرفر
createTables().then(() => {
  app.listen(PORT, () => console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`));
});
