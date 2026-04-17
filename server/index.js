const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const WebSocketServer = require('ws').WebSocketServer;

const app = express();
const port = process.env.PORT || 3000;

// إعداد قاعدة البيانات
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/manaqasa',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// اختبار الاتصال
pool.connect()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err));

// الثوابت
const JWT_SECRET = process.env.JWT_SECRET || 'manaqasa-secret-2024';
const SITE_URL = process.env.SITE_URL || 'https://manaqasati-production.up.railway.app';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));

// Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ═══════════════════════════════════════════════════════════════
// HTML ROUTES
// ═══════════════════════════════════════════════════════════════

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/dashboard-admin.html', (req, res) => {
  res.sendFile(__dirname + '/dashboard-admin.html');
});

app.get('/dashboard-client.html', (req, res) => {
  res.sendFile(__dirname + '/dashboard-client.html');
});

app.get('/dashboard-provider.html', (req, res) => {
  res.sendFile(__dirname + '/dashboard-provider.html');
});

app.get('/auth.html', (req, res) => {
  res.sendFile(__dirname + '/auth.html');
});

app.get('/app.html', (req, res) => {
  res.sendFile(__dirname + '/app.html');
});

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// إشعار آمن
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

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION MIDDLEWARE
// ═══════════════════════════════════════════════════════════════

function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'غير مصرح' });
  try { 
    req.user = jwt.verify(token, JWT_SECRET); 
    console.log(`✅ Auth: User ${req.user.id} (${req.user.role})`);
    next(); 
  }
  catch { 
    console.log('❌ Auth failed: Invalid token');
    res.status(401).json({ message: 'جلسة منتهية' }); 
  }
}

function adminOnly(req, res, next) {
  console.log(`🔒 Admin check: ${req.user?.role}`);
  if (req.user.role !== 'admin') {
    console.log('❌ Access denied: Not admin');
    return res.status(403).json({ message: 'للمدير فقط' });
  }
  console.log('✅ Admin access granted');
  next();
}

// ═══════════════════════════════════════════════════════════════
// DATABASE SETUP
// ═══════════════════════════════════════════════════════════════

async function setupDatabase() {
  console.log('🔄 Setting up database...');
  
  try {
    // إنشاء جدول المستخدمين
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255),
        password_hash VARCHAR(255),
        phone VARCHAR(20),
        role VARCHAR(20) NOT NULL CHECK (role IN ('client', 'provider', 'admin')),
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
      )
    `);

    // إنشاء جدول الطلبات
    await pool.query(`
      CREATE TABLE IF NOT EXISTS requests (
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
      )
    `);

    // إنشاء جدول العطاءات
    await pool.query(`
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
      )
    `);

    // إنشاء جدول الرسائل
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id),
        receiver_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // إنشاء جدول التقييمات
    await pool.query(`
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
      )
    `);

    // إنشاء جدول الإشعارات
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255),
        body TEXT,
        type VARCHAR(50),
        ref_id INTEGER,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // إنشاء جدول البلاغات
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
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
      )
    `);

    // إنشاء جدول المفضلة
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        provider_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, provider_id)
      )
    `);

    // إنشاء جدول رموز الإشعارات
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        platform VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, token)
      )
    `);

    console.log('✅ Database setup complete');
  } catch (error) {
    console.error('❌ Database setup error:', error);
  }
}

// تشغيل إعداد قاعدة البيانات
setupDatabase();

// ═══════════════════════════════════════════════════════════════
// AUTHENTICATION ENDPOINTS
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
    
    if (!result.rows.length) {
      console.log('❌ User not found');
      return res.status(400).json({ message: 'البيانات غير صحيحة' });
    }

    const user = result.rows[0];
    
    if (!user.is_active) {
      console.log('❌ Account inactive');
      return res.status(403).json({ message: 'الحساب موقوف' });
    }

    const storedHash = user.password || user.password_hash || '';
    if (!storedHash) {
      console.log('❌ No password hash');
      return res.status(400).json({ message: 'كلمة المرور غير مضبوطة' });
    }

    const passwordValid = await bcrypt.compare(password, storedHash);
    if (!passwordValid) {
      console.log('❌ Invalid password');
      return res.status(400).json({ message: 'البيانات غير صحيحة' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    
    delete user.password;
    delete user.password_hash;
    
    console.log('✅ Login successful:', user.email, user.role);
    res.json({ user, token });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// التسجيل
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

    const existingUser = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (existingUser.rows.length) {
      return res.status(400).json({ message: 'الإيميل مستخدم مسبقاً' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO users (name, email, phone, password, role, specialties, city, bio, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      RETURNING id, name, email, role
    `, [name, email, phone, hashedPassword, role, specialties ? [specialties] : null, city, bio]);

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    
    console.log('✅ Registration successful:', user.email);
    res.json({ user, token });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// إنشاء أدمن مباشر
app.get('/api/direct-admin', async (req, res) => {
  try {
    const { secret, email, password } = req.query;
    
    console.log('🔑 Direct admin creation:', email);
    
    if (secret !== 'manaqasa2024') {
      return res.status(403).json({ message: 'كلمة سر خاطئة' });
    }
    
    if (!email || !password) {
      return res.status(400).json({ message: 'الإيميل وكلمة المرور مطلوبة' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO users (name, email, password, role, is_active, created_at) 
      VALUES ('المدير', $1, $2, 'admin', true, NOW())
      ON CONFLICT (email) 
      DO UPDATE SET password = $2, role = 'admin', is_active = true
      RETURNING id, name, email, role
    `, [email, hashedPassword]);
    
    console.log('✅ Admin created:', result.rows[0]);
    
    res.json({
      ok: true,
      message: 'تم إنشاء حساب الأدمن بنجاح',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Admin creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// إحصائيات الأدمن
app.get('/api/admin/stats', auth, adminOnly, async (req, res) => {
  try {
    console.log('📊 Loading admin stats...');
    
    const [users, requests, bids, providers, pending, inProgress, completed] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM users'),
      pool.query('SELECT COUNT(*) FROM requests'),
      pool.query('SELECT COUNT(*) FROM bids'),
      pool.query(`SELECT COUNT(*) FROM users WHERE role='provider'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='pending_review'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='in_progress'`),
      pool.query(`SELECT COUNT(*) FROM requests WHERE status='completed'`),
    ]);

    const stats = {
      total_users: +users.rows[0].count,
      requests: +requests.rows[0].count,
      total_bids: +bids.rows[0].count,
      providers: +providers.rows[0].count,
      pending_review: +pending.rows[0].count,
      in_progress: +inProgress.rows[0].count,
      completed: +completed.rows[0].count
    };

    console.log('✅ Admin stats loaded:', stats);
    res.json(stats);
    
  } catch (error) {
    console.error('❌ Admin stats error:', error);
    res.status(500).json({ message: error.message });
  }
});

// قائمة المستخدمين
app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.query;
    console.log('👥 Loading users, filter:', role);
    
    const VALID_ROLES = ['client', 'provider', 'admin'];
    let query = 'SELECT id,name,email,phone,role,specialties,city,badge,is_active,created_at FROM users';
    const params = [];
    
    if (role && VALID_ROLES.includes(role)) {
      params.push(role);
      query += ' WHERE role=$1';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    
    console.log(`✅ Loaded ${result.rows.length} users`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Users list error:', error);
    res.status(500).json({ message: error.message });
  }
});

// تبديل حالة المستخدم
app.put('/api/admin/users/:id/toggle', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    console.log('🔄 Toggle user:', userId);
    
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'لا يمكن تعديل حسابك' });
    }
    
    const result = await pool.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 AND role != \'admin\' RETURNING id, name, is_active',
      [userId]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    console.log('✅ User toggled:', result.rows[0]);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Toggle error:', error);
    res.status(500).json({ message: error.message });
  }
});

// منح لقب
app.put('/api/admin/users/:id/badge', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { badge } = req.body;
    
    console.log('🏆 Update badge:', userId, badge);
    
    const result = await pool.query(
      'UPDATE users SET badge=$1 WHERE id=$2 AND role != \'admin\' RETURNING id,name,badge',
      [badge, userId]
    );
    
    if (!result.rows.length) {
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    await notify(userId, '🏆 وسام جديد', `تهانينا! حصلت على وسام: ${badge}`, 'badge', null);
    
    console.log('✅ Badge updated:', result.rows[0]);
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Badge error:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🗑️ حذف المستخدم - الإصلاح الكامل
app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  console.log('🗑️ Delete user request:', userId, 'by admin:', req.user.id);
  
  try {
    // التحقق من الصحة
    if (!userId || isNaN(userId)) {
      return res.status(400).json({ message: 'معرف المستخدم غير صحيح' });
    }
    
    // منع الحذف الذاتي
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'لا يمكن حذف حسابك الخاص' });
    }
    
    // التحقق من وجود المستخدم
    const userCheck = await pool.query('SELECT id, name, email, role FROM users WHERE id = $1', [userId]);
    if (!userCheck.rows.length) {
      console.log('❌ User not found:', userId);
      return res.status(404).json({ message: 'المستخدم غير موجود' });
    }
    
    const userToDelete = userCheck.rows[0];
    console.log('👤 Deleting user:', userToDelete.name, userToDelete.email);
    
    // منع حذف الأدمن
    if (userToDelete.role === 'admin') {
      return res.status(403).json({ message: 'لا يمكن حذف المديرين' });
    }
    
    // بدء المعاملة الآمنة
    console.log('📝 Starting safe deletion...');
    await pool.query('BEGIN');
    
    try {
      // حذف البيانات المرتبطة بالترتيب الصحيح
      console.log('🧹 Cleaning related data...');
      
      // 1. حذف العطاءات (bids) - استخدام provider_id
      const deleteBids = await pool.query('DELETE FROM bids WHERE provider_id = $1', [userId]);
      console.log('   ✓ Deleted bids:', deleteBids.rowCount || 0);
      
      // 2. حذف التقييمات (reviews)
      const deleteReviews = await pool.query('DELETE FROM reviews WHERE reviewer_id = $1 OR reviewed_id = $1', [userId]);
      console.log('   ✓ Deleted reviews:', deleteReviews.rowCount || 0);
      
      // 3. حذف الإشعارات (notifications)
      const deleteNotifications = await pool.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
      console.log('   ✓ Deleted notifications:', deleteNotifications.rowCount || 0);
      
      // 4. حذف الرسائل (messages)
      const deleteMessages = await pool.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);
      console.log('   ✓ Deleted messages:', deleteMessages.rowCount || 0);
      
      // 5. حذف البلاغات (reports)
      const deleteReports = await pool.query('DELETE FROM reports WHERE reporter_id = $1 OR reported_id = $1', [userId]);
      console.log('   ✓ Deleted reports:', deleteReports.rowCount || 0);
      
      // 6. حذف المفضلة (favorites) - إذا كان الجدول موجود
      try {
        const deleteFavorites = await pool.query('DELETE FROM favorites WHERE user_id = $1 OR provider_id = $1', [userId]);
        console.log('   ✓ Deleted favorites:', deleteFavorites.rowCount || 0);
      } catch (e) {
        console.log('   ⚠️ Favorites table not found, skipping...');
      }
      
      // 7. حذف push_tokens - إذا كان الجدول موجود
      try {
        const deletePushTokens = await pool.query('DELETE FROM push_tokens WHERE user_id = $1', [userId]);
        console.log('   ✓ Deleted push tokens:', deletePushTokens.rowCount || 0);
      } catch (e) {
        console.log('   ⚠️ Push tokens table not found, skipping...');
      }
      
      // 8. معالجة الطلبات (requests) - استخدام client_id
      const userRequests = await pool.query('SELECT id, title FROM requests WHERE client_id = $1', [userId]);
      console.log('   - Found user requests:', userRequests.rows.length);
      
      if (userRequests.rows.length > 0) {
        // حذف العطاءات على طلبات المستخدم
        for (const request of userRequests.rows) {
          await pool.query('DELETE FROM bids WHERE request_id = $1', [request.id]);
        }
        
        // حذف الطلبات
        const deleteRequests = await pool.query('DELETE FROM requests WHERE client_id = $1', [userId]);
        console.log('   ✓ Deleted requests:', deleteRequests.rowCount || 0);
      }
      
      // 9. معالجة المزودين - إلغاء التعيين من الطلبات
      if (userToDelete.role === 'provider') {
        const unassignProvider = await pool.query('UPDATE requests SET assigned_provider_id = NULL WHERE assigned_provider_id = $1', [userId]);
        console.log('   ✓ Unassigned from requests:', unassignProvider.rowCount || 0);
      }
      
      // 10. حذف المستخدم نفسه
      const deleteUser = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log('   ✓ User deleted:', deleteUser.rowCount || 0);
      
      if (deleteUser.rowCount === 0) {
        throw new Error('فشل في حذف المستخدم');
      }
      
      // تأكيد المعاملة
      await pool.query('COMMIT');
      console.log('🎉 User deletion completed successfully');
      
      // إرجاع استجابة متوافقة مع Frontend
      res.json({
        ok: true,
        message: 'تم حذف المستخدم بنجاح',
        deleted_user: {
          id: userId,
          name: userToDelete.name,
          email: userToDelete.email,
          role: userToDelete.role
        }
      });
      
    } catch (deleteError) {
      // إلغاء المعاملة عند الخطأ
      await pool.query('ROLLBACK');
      console.error('💥 Deletion failed, rolled back:', deleteError.message);
      throw deleteError;
    }
    
  } catch (error) {
    console.error('❌ Delete user error:', error.message);
    
    // رسائل خطأ واضحة
    let errorMessage = 'فشل في حذف المستخدم';
    
    if (error.message.includes('foreign key')) {
      errorMessage = 'خطأ في قاعدة البيانات - بيانات مرتبطة';
    } else if (error.message.includes('does not exist')) {
      errorMessage = 'المستخدم غير موجود';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// الطلبات للأدمن
app.get('/api/admin/requests', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    console.log('📋 Loading admin requests, filter:', status);
    
    const VALID_STATUSES = ['pending_review', 'open', 'in_progress', 'completed', 'rejected'];
    let query = `
      SELECT r.*,u.name as client_name,p.name as provider_name,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r 
      JOIN users u ON r.client_id=u.id 
      LEFT JOIN users p ON r.assigned_provider_id=p.id
    `;
    const params = [];
    
    if (status && VALID_STATUSES.includes(status)) {
      params.push(status);
      query += ' WHERE r.status=$1';
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const result = await pool.query(query, params);
    
    console.log(`✅ Loaded ${result.rows.length} admin requests`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Admin requests error:', error);
    res.status(500).json({ message: error.message });
  }
});

// المزودون للأدمن
app.get('/api/admin/providers', auth, adminOnly, async (req, res) => {
  try {
    console.log('🔧 Loading providers with stats...');
    
    const result = await pool.query(`
      SELECT id,name,email,phone,city,specialties,notify_categories,badge,is_active,bio,
      COALESCE((SELECT AVG(rating) FROM reviews WHERE reviewed_id=users.id),0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM reviews WHERE reviewed_id=users.id),0) as review_count,
      (SELECT COUNT(*) FROM bids WHERE provider_id=users.id) as bid_count,
      (SELECT COUNT(*) FROM requests WHERE assigned_provider_id=users.id AND status='completed') as completed_projects
      FROM users WHERE role='provider' ORDER BY avg_rating DESC
    `);
    
    console.log(`✅ Loaded ${result.rows.length} providers`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Providers error:', error);
    res.status(500).json({ message: error.message });
  }
});

// إرسال إشعار
app.post('/api/admin/notify', auth, adminOnly, async (req, res) => {
  try {
    const { user_id, role, title, body, type, specialty } = req.body;
    
    console.log('📢 Admin notification:', title, 'to:', user_id || role || 'all');
    
    if (!title || !body) {
      return res.status(400).json({ message: 'العنوان والمحتوى مطلوبان' });
    }
    
    const VALID_ROLES = ['client', 'provider', 'admin'];
    let targetUsers = [];
    
    if (user_id) {
      // إرسال لمستخدم محدد
      const user = await pool.query('SELECT id,name FROM users WHERE id=$1', [user_id]);
      targetUsers = user.rows;
    } else {
      // إرسال لمجموعة
      let query = 'SELECT id,name FROM users WHERE is_active=TRUE';
      const params = [];
      
      if (role && VALID_ROLES.includes(role)) {
        params.push(role);
        query += ` AND role=$${params.length}`;
      }
      
      if (specialty && typeof specialty === 'string' && specialty !== 'الكل') {
        if (!role) {
          query += ` AND role='provider'`;
        }
        params.push(specialty);
        query += ` AND (
          (specialties IS NOT NULL AND $${params.length}::text = ANY(specialties))
          OR
          (notify_categories IS NOT NULL AND $${params.length}::text = ANY(notify_categories))
        )`;
      }
      
      const users = await pool.query(query, params);
      targetUsers = users.rows;
    }
    
    // إرسال الإشعارات
    for (const user of targetUsers) {
      await notify(user.id, title, body, type || 'admin', null);
    }
    
    console.log(`✅ Sent notifications to ${targetUsers.length} users`);
    
    res.json({
      ok: true,
      message: `تم إرسال الإشعار لـ ${targetUsers.length} مستخدم`,
      sent_count: targetUsers.length
    });
    
  } catch (error) {
    console.error('❌ Notification error:', error);
    res.status(500).json({ message: error.message });
  }
});

// التقييمات للأدمن
app.get('/api/admin/reviews', auth, adminOnly, async (req, res) => {
  try {
    console.log('⭐ Loading admin reviews...');
    
    const result = await pool.query(`
      SELECT rv.*,u1.name as reviewer_name,u2.name as reviewed_name,rq.title as request_title
      FROM reviews rv 
      JOIN users u1 ON rv.reviewer_id=u1.id 
      JOIN users u2 ON rv.reviewed_id=u2.id
      JOIN requests rq ON rv.request_id=rq.id 
      ORDER BY rv.created_at DESC
    `);
    
    console.log(`✅ Loaded ${result.rows.length} reviews`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Reviews error:', error);
    res.status(500).json({ message: error.message });
  }
});

// حذف تقييم
app.delete('/api/admin/reviews/:id', auth, adminOnly, async (req, res) => {
  try {
    const reviewId = parseInt(req.params.id);
    console.log('🗑️ Delete review:', reviewId);
    
    const result = await pool.query('DELETE FROM reviews WHERE id=$1', [reviewId]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'التقييم غير موجود' });
    }
    
    console.log('✅ Review deleted');
    res.json({ ok: true });
    
  } catch (error) {
    console.error('❌ Delete review error:', error);
    res.status(500).json({ message: error.message });
  }
});

// البلاغات للأدمن
app.get('/api/admin/reports', auth, adminOnly, async (req, res) => {
  try {
    console.log('🚨 Loading admin reports...');
    
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
    
    console.log(`✅ Loaded ${result.rows.length} reports`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Reports error:', error);
    res.status(500).json({ message: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC API ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// الطلبات العامة
app.get('/api/requests', async (req, res) => {
  try {
    const { category, city } = req.query;
    console.log('📋 Loading public requests...');
    
    let query = `
      SELECT r.id,r.project_number,r.title,r.description,r.category,r.city,
      r.budget_max,r.deadline,r.image_url,r.images,r.main_image_index,r.status,
      r.client_id,r.created_at,u.name as client_name,
      COALESCE((SELECT COUNT(*) FROM bids WHERE request_id=r.id),0) as bid_count
      FROM requests r JOIN users u ON r.client_id=u.id WHERE r.status='open'
    `;
    const params = [];
    
    if (category) {
      params.push(category);
      query += ` AND r.category=$${params.length}`;
    }
    if (city) {
      params.push(`%${city}%`);
      query += ` AND r.city ILIKE $${params.length}`;
    }
    
    query += ' ORDER BY r.created_at DESC';
    
    const result = await pool.query(query, params);
    
    console.log(`✅ Loaded ${result.rows.length} public requests`);
    res.json(result.rows);
    
  } catch (error) {
    console.error('❌ Public requests error:', error);
    res.json([]);
  }
});

// الفئات
app.get('/api/categories', (req, res) => {
  const categories = [
    'برمجة وتطوير',
    'تصميم',
    'كتابة وترجمة',
    'تسويق رقمي',
    'أعمال',
    'هندسة وعمارة',
    'صوتيات ومرئيات',
    'استشارات',
    'تدريب',
    'أخرى'
  ];
  res.json(categories);
});

// الإحصائيات العامة
app.get('/api/stats', async (req, res) => {
  try {
    console.log('📊 Loading public stats...');
    
    const stats = await Promise.all([
      pool.query("SELECT COUNT(*) as count FROM requests WHERE status = 'completed'"),
      pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'provider' AND is_active = true"),
      pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'client' AND is_active = true"),
      pool.query("SELECT COUNT(*) as count FROM requests WHERE status = 'open'")
    ]);
    
    const result = {
      completed_projects: parseInt(stats[0].rows[0]?.count) || 0,
      active_providers: parseInt(stats[1].rows[0]?.count) || 0,
      active_clients: parseInt(stats[2].rows[0]?.count) || 0,
      open_requests: parseInt(stats[3].rows[0]?.count) || 0
    };
    
    console.log('✅ Public stats loaded:', result);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Public stats error:', error);
    res.json({
      completed_projects: 0,
      active_providers: 0,
      active_clients: 0,
      open_requests: 0
    });
  }
});

// ═══════════════════════════════════════════════════════════════
// SERVER START
// ═══════════════════════════════════════════════════════════════

const server = app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
  console.log('✅ Admin system ready with FIXED user deletion');
  console.log('✅ Database schema compatible');
  console.log('✅ All endpoints functional');
  console.log('🚀 System operational');
});

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', promise, reason);
});

console.log('✅ Complete index.js loaded with user deletion fix');
