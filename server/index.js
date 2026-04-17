const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

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

// ═══════════════════════════════════════════════════════════════
// CONSTANTS & MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET || 'manaqasa-secret-2024';
const SITE_URL   = process.env.SITE_URL   || 'https://manaqasati-production.up.railway.app';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

app.use((req, res, next) => { console.log(`${req.method} ${req.path}`); next(); });

// ═══════════════════════════════════════════════════════════════
// HTML ROUTES
// ═══════════════════════════════════════════════════════════════
app.get('/',                      (req, res) => res.sendFile(__dirname + '/index.html'));
app.get('/dashboard-admin.html',  (req, res) => res.sendFile(__dirname + '/dashboard-admin.html'));
app.get('/dashboard-client.html', (req, res) => res.sendFile(__dirname + '/dashboard-client.html'));
app.get('/dashboard-provider.html', (req, res) => res.sendFile(__dirname + '/dashboard-provider.html'));
app.get('/auth.html',             (req, res) => res.sendFile(__dirname + '/auth.html'));
app.get('/app.html',              (req, res) => res.sendFile(__dirname + '/app.html'));

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
async function notify(userId, title, body, type, refId) {
  try {
    await pool.query(
      'INSERT INTO notifications(user_id,title,body,type,ref_id) VALUES($1,$2,$3,$4,$5)',
      [userId, title, body, type, refId]
    );
  } catch (e) {
    console.error('Notification error:', e);
  }
}

// توحيد حالة الطلب — نقبل 'review' و 'pending_review' كمرادفين
function normalizeStatus(s) {
  if (s === 'review') return 'pending_review';
  return s;
}

// ═══════════════════════════════════════════════════════════════
// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════════════════════
function auth(req, res, next) {
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'جلسة منتهية' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'للمدير فقط' });
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
      password VARCHAR(255),
      password_hash VARCHAR(255),
      phone VARCHAR(20),
      role VARCHAR(20) NOT NULL CHECK (role IN ('client','provider','admin')),
      specialties TEXT[],
      notify_categories TEXT[],
      bio TEXT,
      city VARCHAR(100),
      badge VARCHAR(50) DEFAULT 'none',
      is_active BOOLEAN DEFAULT TRUE,
      experience_years INTEGER,
      portfolio_images TEXT[],
      profile_image TEXT,
      report_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS requests (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES users(id),
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(100),
      city VARCHAR(100),
      address TEXT,
      budget_max DECIMAL(10,2),
      deadline DATE,
      image_url TEXT,
      images TEXT[],
      attachments JSONB,
      main_image_index INTEGER DEFAULT 0,
      project_number VARCHAR(50),
      status VARCHAR(20) DEFAULT 'open',
      assigned_provider_id INTEGER REFERENCES users(id),
      assigned_at TIMESTAMP,
      completed_at TIMESTAMP,
      admin_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS bids (
      id SERIAL PRIMARY KEY,
      request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
      provider_id INTEGER REFERENCES users(id),
      price INTEGER NOT NULL,
      days INTEGER NOT NULL,
      note TEXT,
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
      comment TEXT,
      type VARCHAR(30),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(request_id, reviewer_id)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      title VARCHAR(255),
      body TEXT,
      type VARCHAR(50),
      ref_id INTEGER,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      reporter_id INTEGER REFERENCES users(id),
      reported_id INTEGER REFERENCES users(id),
      request_id INTEGER REFERENCES requests(id),
      type VARCHAR(50) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      details TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      admin_note TEXT,
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
      token TEXT NOT NULL,
      platform VARCHAR(20),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, token)
    )`);

    // ⚠️ إصلاح: إزالة قيد NOT NULL عن password_hash إذا كان موجود في DB قديم
    try {
      await pool.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL');
      console.log('✅ password_hash NOT NULL constraint removed (if existed)');
    } catch (e) {
      // تجاهل — العمود قد لا يكون NOT NULL أصلاً
    }

    console.log('✅ Database setup complete');
  } catch (error) {
    console.error('❌ Database setup error:', error);
  }
}
setupDatabase();

// ═══════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// تسجيل الدخول
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    console.log('🔐 Login attempt:', email || phone);

    if ((!email && !phone) || !password) {
      return res.status(400).json({ message: 'البيانات ناقصة' });
    }

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

    console.log('✅ Login successful:', user.email, user.role);
    res.json({ user, token });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// التسجيل — ✅ مصلح: يكتب في password و password_hash
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, specialties, city, bio } = req.body;
    console.log('📝 Register attempt:', email, role);

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'البيانات ناقصة' });
    }
    if (!['client', 'provider'].includes(role)) {
      return res.status(400).json({ message: 'نوع المستخدم غير صحيح' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existing.rows.length) return res.status(400).json({ message: 'الإيميل مستخدم مسبقاً' });

    const hash = await bcrypt.hash(password, 10);

    // معالجة التخصصات — تقبل array أو string
    const specs = role === 'provider'
      ? (Array.isArray(specialties) ? specialties : (specialties ? [specialties] : null))
      : null;

    // ✅ نكتب الهاش في العمودين password و password_hash ($4 مكرر)
    const result = await pool.query(`
      INSERT INTO users (name, email, phone, password, password_hash, role, specialties, city, bio, is_active, created_at)
      VALUES ($1, $2, $3, $4, $4, $5, $6, $7, $8, true, NOW())
      RETURNING id, name, email, role, city, badge
    `, [name, email, phone || null, hash, role, specs, city || null, bio || null]);

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    console.log('✅ Registration successful:', user.email);
    res.json({ user, token });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// إنشاء أدمن مباشر — ✅ مصلح
app.get('/api/direct-admin', async (req, res) => {
  try {
    const { secret, email, password } = req.query;
    if (secret !== 'manaqasa2024') return res.status(403).json({ message: 'كلمة سر خاطئة' });
    if (!email || !password)        return res.status(400).json({ message: 'الإيميل وكلمة المرور مطلوبة' });

    const hash = await bcrypt.hash(password, 10);

    // ✅ نكتب في العمودين
    const result = await pool.query(`
      INSERT INTO users (name, email, password, password_hash, role, is_active, created_at)
      VALUES ('المدير', $1, $2, $2, 'admin', true, NOW())
      ON CONFLICT (email)
      DO UPDATE SET password = $2, password_hash = $2, role = 'admin', is_active = true
      RETURNING id, name, email, role
    `, [email, hash]);

    console.log('✅ Admin created:', result.rows[0]);
    res.json({ ok: true, message: 'تم إنشاء حساب الأدمن بنجاح', user: result.rows[0] });
  } catch (error) {
    console.error('❌ Admin creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — STATS, USERS, PROVIDERS
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
      total_users:   +users.rows[0].count,
      requests:      +requests.rows[0].count,
      total_bids:    +bids.rows[0].count,
      providers:     +providers.rows[0].count,
      pending_review:+pending.rows[0].count,
      in_progress:   +inProgress.rows[0].count,
      completed:     +completed.rows[0].count
    });
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.query;
    const VALID_ROLES = ['client', 'provider', 'admin'];
    let query = `SELECT u.id,u.name,u.email,u.phone,u.role,u.specialties,u.city,u.badge,u.is_active,u.created_at,
      (SELECT COUNT(*) FROM requests WHERE client_id=u.id) as request_count
      FROM users u`;
    const params = [];
    if (role && VALID_ROLES.includes(role)) { params.push(role); query += ' WHERE u.role=$1'; }
    query += ' ORDER BY u.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Users list error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/admin/users/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return res.status(400).json({ message: 'لا يمكن تعديل حسابك' });

    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active WHERE id = $1 AND role != 'admin' RETURNING id, name, is_active`,
      [userId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'المستخدم غير موجود' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Toggle error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.put('/api/admin/users/:id/badge', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { badge } = req.body;

    const result = await pool.query(
      `UPDATE users SET badge=$1 WHERE id=$2 AND role != 'admin' RETURNING id,name,badge`,
      [badge, userId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'المستخدم غير موجود' });

    if (badge && badge !== 'none') {
      await notify(userId, '🏆 وسام جديد', `تهانينا! حصلت على وسام: ${badge}`, 'badge', null);
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Badge error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🗑️ حذف مستخدم — معاملة آمنة
app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  try {
    if (!userId || isNaN(userId)) return res.status(400).json({ message: 'معرف المستخدم غير صحيح' });
    if (userId === req.user.id)   return res.status(400).json({ message: 'لا يمكن حذف حسابك الخاص' });

    const userCheck = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
    if (!userCheck.rows.length) return res.status(404).json({ message: 'المستخدم غير موجود' });

    const target = userCheck.rows[0];
    if (target.role === 'admin') return res.status(403).json({ message: 'لا يمكن حذف المديرين' });

    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM bids WHERE provider_id = $1', [userId]);
      await pool.query('DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', [userId]);
      await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
      await pool.query('DELETE FROM reports WHERE reporter_id = $1 OR reported_id = $1', [userId]);
      try { await pool.query('DELETE FROM favorites WHERE user_id = $1 OR provider_id = $1', [userId]); } catch(e){}
      try { await pool.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]); } catch(e){}

      const userRequests = await pool.query('SELECT id FROM requests WHERE client_id = $1', [userId]);
      for (const r of userRequests.rows) {
        await pool.query('DELETE FROM bids WHERE request_id = $1', [r.id]);
      }
      await pool.query('DELETE FROM requests WHERE client_id = $1', [userId]);

      if (target.role === 'provider') {
        await pool.query('UPDATE requests SET assigned_provider_id = NULL WHERE assigned_provider_id = $1', [userId]);
      }

      const del = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      if (del.rowCount === 0) throw new Error('فشل في حذف المستخدم');

      await pool.query('COMMIT');
      res.json({ ok: true, message: 'تم حذف المستخدم بنجاح', deleted_user: target });
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (error) {
    console.error('❌ Delete user error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/providers', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id,name,email,phone,city,specialties,notify_categories,badge,is_active,bio,profile_image,created_at,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
      (SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as bid_count,
      (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
      FROM users WHERE role='provider' ORDER BY avg_rating DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Providers error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — REQUESTS (CRUD + REVIEW + COMPLETE) ✨ جديد
// ═══════════════════════════════════════════════════════════════

app.get('/api/admin/requests', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT r.*, u.name as client_name, p.name as provider_name,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r
      JOIN users u ON r.client_id=u.id
      LEFT JOIN users p ON r.assigned_provider_id=p.id
    `;
    const params = [];
    if (status) {
      if (status === 'pending_review') {
        query += ` WHERE r.status IN ('pending_review','review')`;
      } else {
        params.push(status);
        query += ` WHERE r.status=$1`;
      }
    }
    query += ' ORDER BY r.created_at DESC';
    const result = await pool.query(query, params);
    // نُرجع الحالة موحّدة
    const rows = result.rows.map(r => ({ ...r, status: normalizeStatus(r.status) }));
    res.json(rows);
  } catch (error) {
    console.error('❌ Admin requests error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✨ مراجعة طلب: موافقة/رفض
app.put('/api/admin/requests/:id/review', auth, adminOnly, async (req, res) => {
  try {
    const reqId = parseInt(req.params.id);
    const { action, reason } = req.body;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'الإجراء غير صحيح' });
    }
    const newStatus = action === 'approve' ? 'open' : 'rejected';

    const result = await pool.query(
      `UPDATE requests SET status=$1, admin_notes=COALESCE($2, admin_notes) 
       WHERE id=$3 RETURNING id, client_id, title, status, admin_notes`,
      [newStatus, reason || null, reqId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });

    const r = result.rows[0];
    const title = action === 'approve' ? '✅ تمت الموافقة على مشروعك' : '❌ تم رفض مشروعك';
    const body  = action === 'approve'
      ? `مشروعك "${r.title}" تم قبوله وأصبح متاحاً للعروض`
      : `مشروعك "${r.title}" تم رفضه${reason ? ': ' + reason : ''}`;
    await notify(r.client_id, title, body, 'request', reqId);

    console.log(`✅ Request ${reqId} ${action}ed`);
    res.json(r);
  } catch (error) {
    console.error('❌ Review request error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✨ إنهاء مشروع
app.put('/api/admin/requests/:id/complete', auth, adminOnly, async (req, res) => {
  try {
    const reqId = parseInt(req.params.id);
    const result = await pool.query(
      `UPDATE requests SET status='completed', completed_at=NOW() 
       WHERE id=$1 RETURNING id, client_id, assigned_provider_id, title, status`,
      [reqId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    const r = result.rows[0];

    await notify(r.client_id, '🎉 مشروع مكتمل', `مشروعك "${r.title}" تم إنهاؤه`, 'request', reqId);
    if (r.assigned_provider_id) {
      await notify(r.assigned_provider_id, '🎉 مشروع مكتمل', `المشروع "${r.title}" تم إنهاؤه`, 'request', reqId);
    }

    res.json(r);
  } catch (error) {
    console.error('❌ Complete request error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✨ تعديل طلب (الأدمن)
app.put('/api/admin/requests/:id', auth, adminOnly, async (req, res) => {
  try {
    const reqId = parseInt(req.params.id);
    const { title, description, category, city, budget_max, deadline, admin_notes } = req.body;

    const result = await pool.query(
      `UPDATE requests SET
        title        = COALESCE(NULLIF($1,''), title),
        description  = COALESCE(NULLIF($2,''), description),
        category     = $3,
        city         = $4,
        budget_max   = $5,
        deadline     = $6,
        admin_notes  = $7
       WHERE id=$8
       RETURNING *`,
      [title || '', description || '', category || null, city || null, budget_max || null, deadline || null, admin_notes || null, reqId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'الطلب غير موجود' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Edit request error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✨ حذف طلب — معاملة آمنة
app.delete('/api/admin/requests/:id', auth, adminOnly, async (req, res) => {
  try {
    const reqId = parseInt(req.params.id);
    if (!reqId || isNaN(reqId)) return res.status(400).json({ message: 'معرف الطلب غير صحيح' });

    await pool.query('BEGIN');
    try {
      await pool.query('DELETE FROM bids WHERE request_id=$1', [reqId]);
      await pool.query('DELETE FROM messages WHERE request_id=$1', [reqId]);
      await pool.query('DELETE FROM reviews WHERE request_id=$1', [reqId]);
      await pool.query('UPDATE reports SET request_id=NULL WHERE request_id=$1', [reqId]);
      await pool.query('DELETE FROM notifications WHERE ref_id=$1 AND type=\'request\'', [reqId]);

      const del = await pool.query('DELETE FROM requests WHERE id=$1', [reqId]);
      if (del.rowCount === 0) {
        await pool.query('ROLLBACK');
        return res.status(404).json({ message: 'الطلب غير موجود' });
      }
      await pool.query('COMMIT');
      console.log(`✅ Request ${reqId} deleted`);
      res.json({ ok: true, deleted: true });
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  } catch (error) {
    console.error('❌ Delete request error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN — NOTIFICATIONS, REVIEWS, REPORTS, SEARCH
// ═══════════════════════════════════════════════════════════════

app.post('/api/admin/notify', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, role, title, body, type, specialty } = req.body;
    if (!title || !body) return res.status(400).json({ message: 'العنوان والمحتوى مطلوبان' });

    const VALID_ROLES = ['client', 'provider', 'admin'];
    let targetUsers = [];

    if (user_id) {
      const u = await pool.query('SELECT id,name FROM users WHERE id=$1', [user_id]);
      targetUsers = u.rows;
    } else {
      let query = 'SELECT id,name FROM users WHERE is_active=TRUE';
      const params = [];
      if (role && VALID_ROLES.includes(role)) { params.push(role); query += ` AND role=$${params.length}`; }
      if (specialty && typeof specialty === 'string' && specialty !== 'الكل') {
        if (!role) query += ` AND role='provider'`;
        params.push(specialty);
        query += ` AND (
          (specialties IS NOT NULL AND $${params.length}::text = ANY(specialties))
          OR
          (notify_categories IS NOT NULL AND $${params.length}::text = ANY(notify_categories))
        )`;
      }
      const u = await pool.query(query, params);
      targetUsers = u.rows;
    }

    for (const u of targetUsers) await notify(u.id, title, body, type || 'admin', null);

    console.log(`✅ Sent notifications to ${targetUsers.length} users`);
    res.json({ ok: true, message: `تم إرسال الإشعار لـ ${targetUsers.length} مستخدم`, sent_count: targetUsers.length });
  } catch (error) {
    console.error('❌ Notification error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/reviews', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rv.*, u1.name as reviewer_name, u2.name as reviewed_name, rq.title as request_title
      FROM reviews rv
      JOIN users u1 ON rv.reviewer_id=u1.id
      JOIN users u2 ON rv.reviewed_id=u2.id
      LEFT JOIN requests rq ON rv.request_id=rq.id
      ORDER BY rv.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Reviews error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/admin/reviews/:id', auth, adminOnly, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    const result = await pool.query('DELETE FROM reviews WHERE id=$1', [reviewId]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'التقييم غير موجود' });
    res.json({ ok: true });
  } catch (error) {
    console.error('❌ Delete review error:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get('/api/admin/reports', auth, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*,
        COALESCE(u1.name,'مستخدم محذوف') as reporter_name,
        COALESCE(u2.name,'مستخدم محذوف') as reported_name,
        COALESCE(u2.role,'unknown') as reported_role,
        rq.title as request_title
      FROM reports r
      LEFT JOIN users u1 ON r.reporter_id=u1.id
      LEFT JOIN users u2 ON r.reported_id=u2.id
      LEFT JOIN requests rq ON r.request_id=rq.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Reports error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✨ معالجة بلاغ: warn / ban / ignore / resolve
app.put('/api/admin/reports/:id', auth, adminOnly, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id);
    const { action, admin_note } = req.body;

    const statusMap = { warn: 'warned', ban: 'resolved', ignore: 'ignored', resolve: 'resolved' };
    const newStatus = statusMap[action];
    if (!newStatus) return res.status(400).json({ message: 'الإجراء غير صحيح' });

    const r = await pool.query('SELECT reported_id FROM reports WHERE id=$1', [reportId]);
    if (!r.rows.length) return res.status(404).json({ message: 'البلاغ غير موجود' });

    const reportedId = r.rows[0].reported_id;

    await pool.query(
      'UPDATE reports SET status=$1, admin_note=$2 WHERE id=$3',
      [newStatus, admin_note || null, reportId]
    );

    if (reportedId) {
      if (action === 'ban') {
        await pool.query("UPDATE users SET is_active=FALSE WHERE id=$1 AND role != 'admin'", [reportedId]);
        await notify(reportedId, '⚠️ تم إيقاف حسابك',
          `تم إيقاف حسابك من قبل الإدارة${admin_note ? ': ' + admin_note : ''}`, 'system', null);
      } else if (action === 'warn') {
        await notify(reportedId, '⚠️ تحذير من الإدارة',
          `تلقيت تحذيراً بخصوص نشاطك على المنصة${admin_note ? ': ' + admin_note : ''}`, 'system', null);
      }
    }

    console.log(`✅ Report ${reportId} → ${newStatus}`);
    res.json({ ok: true, status: newStatus });
  } catch (error) {
    console.error('❌ Handle report error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✨ بحث سريع
app.get('/api/admin/search', auth, adminOnly, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ requests: [], users: [] });

    const pattern = `%${q}%`;
    const [requests, users] = await Promise.all([
      pool.query(
        `SELECT r.id, r.title, r.status, u.name as client_name
         FROM requests r LEFT JOIN users u ON r.client_id=u.id
         WHERE r.title ILIKE $1 OR r.description ILIKE $1 OR r.project_number ILIKE $1
         ORDER BY r.created_at DESC LIMIT 20`,
        [pattern]
      ),
      pool.query(
        `SELECT id, name, email, role
         FROM users
         WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
         ORDER BY created_at DESC LIMIT 20`,
        [pattern]
      )
    ]);
    res.json({
      requests: requests.rows.map(r => ({ ...r, status: normalizeStatus(r.status) })),
      users: users.rows
    });
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
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
  } catch (error) {
    console.error('❌ Public requests error:', error);
    res.json([]);
  }
});

app.get('/api/categories', (req, res) => {
  res.json([
    'برمجة وتطوير','تصميم','كتابة وترجمة','تسويق رقمي','أعمال',
    'هندسة وعمارة','صوتيات ومرئيات','استشارات','تدريب','أخرى'
  ]);
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM requests WHERE status = 'completed'"),
      pool.query("SELECT COUNT(*) as count FROM users    WHERE role = 'provider' AND is_active = true"),
      pool.query("SELECT COUNT(*) as count FROM users    WHERE role = 'client'   AND is_active = true"),
      pool.query("SELECT COUNT(*) as count FROM requests WHERE status = 'open'")
    ]);
    res.json({
      completed_projects: parseInt(stats[0].rows[0].count) || 0,
      active_providers:   parseInt(stats[1].rows[0].count) || 0,
      active_clients:     parseInt(stats[2].rows[0].count) || 0,
      open_requests:      parseInt(stats[3].rows[0].count) || 0
    });
  } catch (error) {
    console.error('❌ Public stats error:', error);
    res.json({ completed_projects: 0, active_providers: 0, active_clients: 0, open_requests: 0 });
  }
});

// ═══════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log('✅ All admin endpoints functional:');
  console.log('   • stats, users, providers, requests (CRUD+review+complete)');
  console.log('   • notify, reviews, reports (with actions), search');
  console.log('✅ password_hash bug fixed in register & direct-admin');
  console.log('🚀 System operational');
});

process.on('uncaughtException',  (error) => console.error('Uncaught Exception:', error));
process.on('unhandledRejection', (reason) => console.error('Unhandled Rejection:', reason));
